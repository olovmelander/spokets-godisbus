// Browser IndexedDB semantics, without a WebGL game. Vite serves the actual TypeScript storage module.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0 }, appType: 'custom' });
server.middlewares.use('/photo-storage-test', (_req, res) => res.end('<!doctype html><title>Photo storage test</title>'));
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${origin}/photo-storage-test`);
  const checks = await page.evaluate(async () => {
    const { createPhotoStore, PHOTO_MAX_BYTES } = await import('/src/save/photos.ts');
    const checks = [];
    const check = (name, result) => { if (!result) throw new Error(name); checks.push(name); };
    const frame = (player, moment, text = 'frame') => ({ player, moment, blob: new Blob([text], { type: 'image/webp' }) });
    const all = () => new Promise((resolve) => {
      const request = indexedDB.open('godisbus.v1.photos', 1);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('frames').objectStore('frames').getAll();
        read.onsuccess = () => resolve(read.result);
        read.transaction.oncomplete = () => db.close();
      };
    });
    const store = createPhotoStore(indexedDB, localStorage);
    await store.put(frame('elof', 'crane'));
    await store.put(frame('other', 'cap'));
    await store.put(frame('mixed', 'cap'));
    await store.put(frame('mixed', 'raft'));
    const mixed = await store.list('mixed');
    check('both adventures share one ordered photo album', mixed.map(photo => photo.moment).join(',') === 'cap,raft');
    check('second-adventure photos keep the first captured frame', !await store.put(frame('mixed', 'raft', 'replacement')));
    await store.clear('mixed');
    const oldTab = createPhotoStore(indexedDB, localStorage);
    await oldTab.list('elof'); // Bind the old player's generation before a delayed encoder finishes.

    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
      if (mode === 'readwrite') throw new DOMException('Writes denied', 'SecurityError');
      return transaction.call(this, names, mode, ...rest);
    };
    check('durable tombstone permits reset while IndexedDB writes are denied', await store.clear('elof'));
    check('blocked physical deletion leaves the old records for the retry', (await all()).length === 2);
    check('the old photos are immediately hidden', (await store.list('elof')).length === 0);
    const reopened = createPhotoStore(indexedDB, localStorage);
    check('a reopened game cannot resurrect hidden photos', (await reopened.list('elof')).length === 0);
    check('another player retains their album', (await reopened.list('other')).length === 1);
    check('an old tab cannot relabel a late capture into the new generation', !await oldTab.put(frame('elof', 'swing')));

    IDBDatabase.prototype.transaction = transaction;
    check('read after recovery retries pending deletion', (await reopened.list('elof')).length === 0 && (await all()).length === 1);
    const mark = JSON.parse(localStorage.getItem('godisbus.v1.photos.reset.elof'));
    check('cleanup keeps the generation and clears only the pending flag', !!mark.generation && mark.pending === false);
    check('a new adventure can capture the same authored moment again', await reopened.put(frame('elof', 'crane', 'new frame')));
    const fresh = await reopened.list('elof');
    check('only the new frame is exposed', fresh.length === 1 && fresh[0].blob.size === 9);
    check('old tabs stay blocked after physical cleanup', !await oldTab.put(frame('elof', 'plane')));

    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('godisbus.v1.photos.reset.')) throw new DOMException('Full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
    check('refused durable marking leaves photos intact even if IndexedDB still works', !await reopened.clear('elof') && (await reopened.list('elof')).length === 1);
    IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
      if (mode === 'readwrite') throw new DOMException('Writes denied', 'SecurityError');
      return transaction.call(this, names, mode, ...rest);
    };
    check('reset reports failure if neither marking nor deletion can persist', !await reopened.clear('elof'));
    Storage.prototype.setItem = setItem;
    IDBDatabase.prototype.transaction = transaction;
    check('failed reset leaves the current album intact', (await reopened.list('elof')).length === 1);
    check('an entirely unavailable IndexedDB still supports a durable reset', await createPhotoStore(null, localStorage).clear('elof'));
    check('recovery after unavailable IndexedDB still cannot resurrect the album', (await createPhotoStore(indexedDB, localStorage).list('elof')).length === 0);

    // A malformed record must not permanently reserve an otherwise empty album moment.
    const brokenBlobs = ['not a Blob', new Blob([], { type: 'image/webp' }),
      new Blob([new Uint8Array(PHOTO_MAX_BYTES + 1)], { type: 'image/webp' }), new Blob(['wrong type'], { type: 'image/png' })];
    for (const [i, blob] of brokenBlobs.entries()) {
      const player = `repair-${i}`;
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('godisbus.v1.photos', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('frames', 'readwrite');
          tx.objectStore('frames').put({ player, moment: 'crane', blob });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
      check(`corrupt frame ${i} is hidden`, (await store.list(player)).length === 0);
      check(`corrupt frame ${i} can be recaptured`, await store.put(frame(player, 'crane', 'recovered frame')));
      check(`the first valid replacement ${i} stays protected`, !await store.put(frame(player, 'crane', 'later frame'))
        && (await (await store.list(player))[0].blob.text()) === 'recovered frame');
    }

    // A tab can finish opening its database after another tab has already reset and played again.
    // Delay only the open success event; the transactions and storage generations are real.
    function holdDatabaseOpen() {
      let release, opened;
      const held = new Promise(resolve => { opened = resolve; });
      const factory = {
        open(name, version) {
          const request = indexedDB.open(name, version);
          const delayed = { get result() { return request.result; } };
          request.onsuccess = event => { release = () => delayed.onsuccess(event); opened(); };
          for (const event of ['onerror', 'onblocked', 'onupgradeneeded']) request[event] = value => delayed[event]?.(value);
          return delayed;
        },
      };
      return { factory, held, release: () => release() };
    }
    const delayedReset = holdDatabaseOpen();
    await store.put(frame('reset-race', 'cap', 'old adventure'));
    const lateReset = createPhotoStore(delayedReset.factory, localStorage).clear('reset-race');
    await delayedReset.held;
    const newerTab = createPhotoStore(indexedDB, localStorage);
    check('a newer tab can finish its reset while another open is delayed', await newerTab.clear('reset-race'));
    check('the newer adventure can capture a fresh moment', await newerTab.put(frame('reset-race', 'crane', 'new adventure')));
    delayedReset.release();
    check('the superseded reset finishes safely', await lateReset);
    const latest = await newerTab.list('reset-race');
    check('a delayed old reset never deletes the newer adventure photo', latest.length === 1
      && latest[0].moment === 'crane' && await latest[0].blob.text() === 'new adventure');

    await store.put(frame('cleanup-race', 'cap', 'old adventure'));
    await createPhotoStore(null, localStorage).clear('cleanup-race');
    const delayedCleanup = holdDatabaseOpen();
    const lateList = createPhotoStore(delayedCleanup.factory, localStorage).list('cleanup-race');
    await delayedCleanup.held;
    await newerTab.clear('cleanup-race');
    check('a new adventure can capture while an old pending cleanup is delayed', await newerTab.put(frame('cleanup-race', 'swing', 'fresh frame')));
    delayedCleanup.release();
    check('the superseded album reader stays empty', (await lateList).length === 0);
    const cleaned = await newerTab.list('cleanup-race');
    check('a delayed pending cleanup never deletes the newer adventure photo', cleaned.length === 1
      && cleaned[0].moment === 'swing' && await cleaned[0].blob.text() === 'fresh frame');
    return checks;
  });
  assert.deepEqual(errors, [], 'No browser errors');
  for (const name of checks) console.log(`  ok   ${name}`);
  console.log(`Photo storage browser tests: ${checks.length} checks passed.`);
} finally {
  await browser?.close();
  await server.close();
}
