// Real WebGL capture, IndexedDB persistence, profile isolation and album navigation.
// Run after npm run build, using Playwright 1.56.1 like the other browser checks.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};
assert.ok(existsSync(join(DIST, 'index.html')), 'Run npm run build before the browser tests.');

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checked = 0;
function check(name, condition) {
  assert.ok(condition, name);
  checked++;
  console.log(`  ok   ${name}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, accepts, name, timeout = 12000) {
  const end = Date.now() + timeout;
  let value;
  do {
    value = await read();
    if (accepts(value)) return value;
    await sleep(35);
  } while (Date.now() < end);
  assert.fail(`${name}: timed out; last value ${JSON.stringify(value)}`);
}
async function frames(page, count = 3) {
  await page.evaluate((left) => new Promise((resolve) => {
    function frame() {
      if (--left <= 0) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }), count);
}
async function ready(page) {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await frames(page);
}
async function open(name, options = {}, query = '?debug&standin&tier=low', init) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, ...options });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith(`blob:${origin}`) && !url.startsWith('data:')) external.push(url);
  });
  await page.goto(`${origin}${BASE}${query}`);
  await ready(page);
  return {
    page, context,
    state: () => page.evaluate(() => window.__godis.state()),
    info: () => page.evaluate(() => window.__godis.info()),
    async finish() {
      assert.deepEqual(errors, [], `${name}: browser errors`);
      assert.deepEqual(external, [], `${name}: external requests`);
      await context.close();
    },
  };
}

async function savedFrames(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('godisbus.v1.photos', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('frames')) { db.close(); resolve([]); return; }
      const tx = db.transaction('frames');
      const read = tx.objectStore('frames').getAll();
      read.onsuccess = () => resolve(read.result.map(({ player, moment, blob }) => ({ player, moment, type: blob.type, bytes: blob.size })));
      tx.oncomplete = () => db.close();
    };
  }));
}

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  console.log('photos: game renders, storage isolation and paused album');
  {
    const { page, state, finish } = await open('capture and album', {}, '?dev&debug&standin&tier=low&course=berget');
    const frames = await until(() => savedFrames(page), (rows) => rows.length === 1, 'authored crane photo saved', 30000);
    check('the crane moment produces a bounded WebP frame for the current player', frames[0].moment === 'crane' && frames[0].player === 'elof' && frames[0].type === 'image/webp' && frames[0].bytes > 500 && frames[0].bytes <= 100000);
    check('capture does not enable preserveDrawingBuffer', await page.evaluate(() => !document.querySelector('#game').getContext('webgl2').getContextAttributes().preserveDrawingBuffer));
    const pixels = await page.evaluate(() => new Promise((resolve) => {
      const request = indexedDB.open('godisbus.v1.photos', 1);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('frames').objectStore('frames').get(['elof', 'crane']);
        read.onsuccess = async () => {
          const bitmap = await createImageBitmap(read.result.blob);
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const colours = new Set();
          for (let i = 0; i < data.length; i += 64) colours.add(`${data[i]},${data[i+1]},${data[i+2]}`);
          resolve({ width: bitmap.width, height: bitmap.height, colours: colours.size });
          bitmap.close(); db.close();
        };
      };
    }));
    check('the saved frame contains actual rendered pixels at thumbnail dimensions', pixels.width <= 640 && pixels.height <= 360 && pixels.colours > 100);
    // G opens the candy bag's own page in Pause, where the album is (docs/ux-audit/menus.md row 1).
    await page.keyboard.press('g');
    check('G opens the candy bag’s page with its photos', await page.locator('#pauseBagPage').isVisible() && await page.locator('.photo-thumb').isVisible() && (await state()).paused);
    await page.locator('.photo-thumb').click();
    const before = await state();
    check('thumbnail opens its named image while the game remains paused', await page.locator('#photoCaption').textContent() === 'På tranans rygg' && before.paused && await page.locator('#pause').isHidden());
    if (process.env.PHOTO_SCREENSHOT) await picture(page, process.env.PHOTO_SCREENSHOT);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    check('photo navigation leaves simulation stopped', (await state()).steps === before.steps);
    await page.keyboard.press('Escape');
    check('Escape returns to the paused album and restores thumbnail focus', await page.locator('#pause').isVisible() && await page.locator('#pauseBagPage').isVisible() && await page.evaluate(() => document.activeElement.classList.contains('photo-thumb')) && (await state()).paused);
    await page.keyboard.press('Escape');
    check('a second Escape goes straight back to play, as the bag was opened from play', !(await state()).paused);
    await page.reload(); await ready(page);
    check('the same photo survives a reload', (await savedFrames(page)).length === 1);
    await sleep(2600);
    check('replaying the moment keeps one first frame', (await savedFrames(page)).length === 1);

    // A second player has a separate record. Resetting Elof must not touch it.
    await page.evaluate(() => new Promise((resolve) => {
      const request = indexedDB.open('godisbus.v1.photos', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('frames', 'readwrite');
        const store = tx.objectStore('frames');
        const read = store.get(['elof', 'crane']);
        read.onsuccess = () => store.put({ ...read.result, player: 'second-player' });
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    }));
    await page.goto(`${origin}${BASE}?dev&debug&standin&tier=low&course=berget&title`); await ready(page);
    // Börja om från början is on the players' page (docs/ux-audit/first-minutes.md row 7).
    await page.click('#playersBtn');
    await page.click('#startOverBtn');
    await Promise.all([page.waitForEvent('framenavigated'), page.click('#playerConfirmYes')]);
    await ready(page);
    const left = await until(() => savedFrames(page), (rows) => rows.length === 1 && rows[0].player === 'second-player', 'reset clears only active player');
    check('reset removes all of this player’s photos and preserves another player’s photos', left[0].player === 'second-player');
    check('another player’s photo is not shown in Elof’s album', await page.locator('.photo-thumb').count() === 0);
    await finish();
  }

  for (const failure of ['denied', 'full']) {
    const { page, state, finish } = await open(`storage ${failure}`, {}, '?dev&debug&standin&tier=low&course=berget', failure === 'denied'
      ? () => { Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Denied', 'SecurityError'); } }); }
      : () => { IDBObjectStore.prototype.put = function () { throw new DOMException('Full', 'QuotaExceededError'); }; });
    await until(state, (s) => s.x > 4, 'crane keeps flying when photo storage fails', 30000);
    await page.keyboard.press('g');
    check(`${failure} storage silently leaves a usable album without photos`, (await state()).paused && await page.locator('#pauseAlbum').isVisible() && await page.locator('.photo-thumb').count() === 0 && await page.locator('#message').isHidden());
    await page.keyboard.press('Escape');
    check(`${failure} storage still allows play to resume`, !(await state()).paused);
    await finish();
  }

  {
    const { page, state, finish } = await open('epilogue credits', { viewport: { width: 390, height: 844 } }, '?dev&debug&standin&tier=low&course=epilog&at=52.8,3&flags=dots');
    await page.keyboard.down('ArrowRight');
    await page.waitForSelector('#photoAlbum:not([hidden])', { timeout: 30000 });
    await page.keyboard.up('ArrowRight');
    check('the epilogue opens credits even when no photos are stored', await page.locator('#photoCredits').isVisible() && (await state()).paused);
    check('credits name the family creators', (await page.locator('#photoCredits').textContent()).includes('Pappa Emil') && (await page.locator('#photoCredits').textContent()).includes('morbror Olov'));
    await page.click('#photoNext');
    await page.waitForSelector('#endingShot:not([hidden])');
    await page.click('#endingContinue');
    check('finishing the credits and window shot reveals the chapter-end choices', await page.locator('#photoAlbum').isHidden() && await page.locator('#endCard').isVisible() && await page.locator('#endPhotos').isVisible());
    await page.click('#endPhotos');
    await page.keyboard.press('Escape');
    check('credits can be reopened and escaped without restarting gameplay', await page.locator('#endCard').isVisible() && (await state()).paused);
    await finish();
  }
  console.log(`\nPhotos browser tests: ${checked} checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
