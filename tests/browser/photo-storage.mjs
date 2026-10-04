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
    const { createPhotoStore } = await import('/src/save/photos.ts');
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
    return checks;
  });
  assert.deepEqual(errors, [], 'No browser errors');
  for (const name of checks) console.log(`  ok   ${name}`);
  console.log(`Photo storage browser tests: ${checks.length} checks passed.`);
} finally {
  await browser?.close();
  await server.close();
}
