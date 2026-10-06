// Player controls/settings integration checks. Run against a build, with the same Playwright as smoke.mjs.
// These exercise real DOM events, gamepad polling and touch capture; unit tests cover the input maths.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const { page, state, finish } = await open('local players', {}, '?dev&debug&title&standin&tier=low&course=testbana');
  const read = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  async function reloadAction(selector, expected) {
    await Promise.all([page.waitForNavigation(), page.locator(selector).click()]);
    await ready(page);
    if (expected) assert.equal((await state()).playerId, expected);
  }
  async function home() {
    await page.locator('#pauseBtn').click();
    await page.locator('#titleBtn').click();
    assert.equal((await state()).paused, true);
  }
  await page.locator('#titleSettingsBtn').click();
  await page.locator('#setFollowFinger').check();
  await page.locator('#setLefty').check();
  await page.locator('#setMusic').uncheck();
  await page.keyboard.press('Escape');
  check('title settings return to title without starting play', await page.locator('#title').isVisible() && (await state()).paused);
  // A first start: its play styles are the start buttons.
  await page.locator('#startAventyr').click();
  await home();
  const first = JSON.parse((await read())['godisbus.v1.player.elof']);
  check('first start creates Elof with the chosen settings', first.name === 'Elof' && first.settings.followFinger && first.settings.lefty && !first.settings.music);
  await page.locator('#playersBtn').click();
  await page.locator('#newPlayerBtn').click();
  await page.locator('#playerName').fill('<b>Test</b>');
  await page.locator('#newPlayerForm button[type=submit]').click();
  await reloadAction('#firstLugnt');
  const newId = (await state()).playerId;
  check('new player has an opaque ID and starts their own story', newId !== 'elof' && !newId.includes('Test') && (await state()).course === 'prolog');
  check('new player has independent settings', (await state()).settings.style === 'lugnt' && !(await state()).settings.followFinger);
  check('player name is rendered as plain text', await page.locator('#currentPlayer').textContent() === '<b>Test</b>' && await page.locator('#currentPlayer b').count() === 0);
  let entries = await read();
  assert.deepEqual(JSON.parse(entries['godisbus.v1.player.elof']).settings, first.settings);
  check('creating a profile keeps the first player indexed', JSON.parse(entries['godisbus.v1.index']).players.length === 2);
  await page.locator('#playersBtn').click();
  await reloadAction('[data-player=elof]', 'elof');
  check('switching restores Elof settings and progress', (await state()).settings.followFinger && (await state()).settings.style === 'aventyr');
  const untouched = (await read())[`godisbus.v1.player.${newId}`];
  // Börja om från början is on the players' page.
  await page.locator('#playersBtn').click();
  await page.locator('#startOverBtn').click();
  await page.keyboard.press('Escape');
  check('Escape cancels reset without deleting progress', await page.locator('#titlePlayers').isVisible() && !!(await read())['godisbus.v1.player.elof']);
  await page.locator('#startOverBtn').click();
  await reloadAction('#playerConfirmYes', 'elof');
  check('confirmed reset retains name and removes only current progress', await page.locator('#startAventyr').isVisible() && await page.locator('#currentPlayer').textContent() === 'Elof' && (await read())[`godisbus.v1.player.${newId}`] === untouched);
  await page.evaluate(async (second) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
    canvas.getContext('2d').fillRect(0, 0, 8, 8);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp'));
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('godisbus.v1.photos', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('frames', 'readwrite');
      for (const player of ['elof', second]) tx.objectStore('frames').put({ player, moment: 'carving', blob });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    }); db.close();
  }, newId);
  await page.locator('#playersBtn').click();
  await page.locator(`[data-player="${newId}"]`).locator('..').locator('.player-remove').click();
  await page.locator('#playerConfirmNo').click();
  check('No cancels player removal', !!(await read())[`godisbus.v1.player.${newId}`]);
  await page.locator(`[data-player="${newId}"]`).locator('..').locator('.player-remove').click();
  await reloadAction('#playerConfirmYes', 'elof');
  entries = await read();
  check('removal deletes only the named player and its index entry', !entries[`godisbus.v1.player.${newId}`] && JSON.parse(entries['godisbus.v1.index']).players.length === 1);
  const photoPlayers = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('godisbus.v1.photos', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('frames', 'readonly');
      const rows = tx.objectStore('frames').getAll();
      rows.onsuccess = () => resolve(rows.result.map(row => row.player));
      tx.oncomplete = () => db.close();
    };
  }));
  check('removing another profile deletes its photos and preserves current-player photos', photoPlayers.includes('elof') && !photoPlayers.includes(newId));
  // A newer save is not silently replaced by the title, visibility or autosaving.
  await page.evaluate(() => localStorage.setItem('godisbus.v1.player.elof', '{"v":99,"name":"Elof"}'));
  await page.reload(); await ready(page);
  check('unreadable save has a safe title with start disabled', await page.locator('#playerUnreadable').isVisible() && await page.locator('#startBtn').isDisabled() && await page.locator('#startAventyr').isDisabled() && await page.locator('#startLugnt').isDisabled());
  await frames(page, 5);
  check('unreadable save remains untouched', (await read())['godisbus.v1.player.elof'] === '{"v":99,"name":"Elof"}');
  await page.locator('#playersBtn').click();
  await page.locator('#startOverBtn').click();
  await reloadAction('#playerConfirmYes', 'elof');
  check('explicit confirmation can reset an unreadable save', await page.locator('#startAventyr').isVisible());
  // A failed create stays in the form and must not claim success or change the current player.
  await page.locator('#startAventyr').click(); await home();
  await page.locator('#playersBtn').click(); await page.locator('#newPlayerBtn').click();
  await page.locator('#playerName').fill('Another');
  await page.locator('#newPlayerForm button[type=submit]').click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.locator('#firstAventyr').click();
  check('storage failure reports an error and keeps the current adventure', await page.locator('#playerError').isVisible() && (await state()).playerId === 'elof');
  await finish();
  console.log(`\nProfile browser tests: ${checked} checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
