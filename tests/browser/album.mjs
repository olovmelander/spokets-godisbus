// The album uses real pickups, saved discoveries and DOM controls.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const base = '/spokets-godisbus/';
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(dist, normalize(path.slice(base.length) || 'index.html'));
  if (!path.startsWith(base) || !file.startsWith(dist) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('request', (request) => assert.ok(request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()), 'Only local requests'));
const state = () => page.evaluate(() => window.__godis.state());
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
const frames = (count = 2) => page.evaluate((n) => new Promise((resolve) => {
  function frame() { if (--n <= 0) resolve(); else requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}), count);
async function pad(index) {
  await page.evaluate((i) => { window.__testPad.buttons[i] = { pressed: true, value: 1 }; }, index);
  await frames(1);
  await page.evaluate((i) => { window.__testPad.buttons[i] = { pressed: false, value: 0 }; }, index);
  await frames();
}
async function ready() {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
}
try {
  await page.addInitScript(() => {
    window.__testPad = { connected: true, mapping: 'standard', index: 0, id: 'test controller', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
    if (localStorage.getItem('album-test')) return;
    localStorage.setItem('album-test', 'yes');
    const flags = {
      garden: ['found:gummibjorn', 'found:skumbanan', 'found:skumsvamp', 'memory'],
      granskog: ['found:sockerbit', 'found:gummiorm', 'found:chokladkola', 'found:colaflaska'],
      myren: ['found:chokladpeng', 'found:stektagg', 'found:surnapp', 'found:lakritskonfekt'],
      berget: ['found:polkagris', 'found:graddkola', 'found:salmiakruta', 'found:chokladpralin', 'memory'],
    };
    localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', chapter: 'garden', checkpoint: -1, settings: { style: 'aventyr' }, updated: 1, playMs: 0, candy: {}, placed: {}, flags }));
  });
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&course=garden`);
  await ready();
  await page.keyboard.press('KeyG');
  assert.equal(await page.locator('[data-reward="golden"]').count(), 0, 'Fifteen discoveries do not award the final piece');
  await page.keyboard.press('Escape');
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => window.__godis.state().flags.includes('found:gelehallon'));
  await page.keyboard.up('ArrowLeft');
  assert.equal(await page.locator('#notice').textContent(), 'Alla sorter! Ett geléhallon i guld.');
  await page.keyboard.press('KeyG');
  await page.locator('[data-reward="golden"]').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-reward="golden"]').count(), 1, 'The last real pickup awards one golden sticker');
  assert.equal(await page.locator('.album-count').textContent(), '16 av 16 sorter');
  assert.ok((await saved()).flags.garden.includes('found:gelehallon'));
  if (process.env.ALBUM_SHOT) await page.screenshot({ path: process.env.ALBUM_SHOT });
  await page.reload();
  await ready();
  await page.keyboard.press('KeyG');
  assert.equal(await page.locator('[data-reward="golden"]').count(), 1, 'The reward survives save and reload');
  assert.notEqual(await page.locator('#notice').textContent(), 'Alla sorter! Ett geléhallon i guld.', 'Loading does not replay the reward notice');
  assert.ok((await page.locator('#pauseMap').textContent()).includes('Spöket'), 'His name is not revealed early');
  assert.equal(await page.locator('[data-memory]').count(), 2, 'Only found memories can be replayed');
  assert.equal(await page.locator('.memory-missing').count(), 2);
  const progress = await state();
  const saveBeforeMemory = await saved();
  await page.locator('[data-memory="garden"]').tap();
  assert.ok(await page.locator('#memory').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'memoryNext');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'memoryClose', 'Memory owns the keyboard focus scope over pause');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'memoryNext');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#memoryProgress').textContent(), '2 / 3', 'Enter advances a frame');
  if (process.env.MEMORY_SHOT) {
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#memoryCard svg')).opacity) > 0.99
      && document.getElementById('memory').dataset.phase === 'pictures');
    await page.screenshot({ path: process.env.MEMORY_SHOT });
  }
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#memory').isHidden());
  assert.ok(await page.locator('#pause').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-memory')), 'garden');
  assert.equal((await state()).steps, progress.steps, 'Replay leaves the game paused');
  assert.deepEqual(await saved(), saveBeforeMemory, 'Watching a memory changes no saved progress');
  // Visibility and renderer interruptions keep the current picture, including its remaining time.
  await page.locator('[data-memory="garden"]').tap();
  await page.evaluate(() => {
    window.__memoryHidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__memoryHidden });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenPicture = await page.locator('#memoryProgress').textContent();
  await new Promise((resolve) => setTimeout(resolve, 2700));
  assert.equal(await page.locator('#memoryProgress').textContent(), hiddenPicture, 'Hidden pages hold the memory picture');
  await page.evaluate(() => { window.__memoryHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction((before) => document.getElementById('memoryProgress').textContent !== before, hiddenPicture);
  await page.locator('#memoryClose').tap();
  await page.locator('[data-memory="garden"]').tap();
  await page.evaluate(() => {
    window.__memoryLoss = document.getElementById('game').getContext('webgl2').getExtension('WEBGL_lose_context');
    window.__memoryLoss.loseContext();
  });
  await page.waitForFunction(() => window.__godis.state().contextLost);
  const lostPicture = await page.locator('#memoryProgress').textContent();
  await new Promise((resolve) => setTimeout(resolve, 2700));
  assert.equal(await page.locator('#memoryProgress').textContent(), lostPicture, 'Context loss holds the memory picture');
  await page.evaluate(() => window.__memoryLoss.restoreContext());
  await page.waitForFunction(() => !window.__godis.state().contextLost);
  await new Promise((resolve) => setTimeout(resolve, 2700));
  assert.equal(await page.locator('#memoryProgress').textContent(), lostPicture, 'Recovery confirmation keeps the memory paused');
  await page.locator('#messageButton').click();
  await page.waitForFunction((before) => document.getElementById('memoryProgress').textContent !== before, lostPicture);
  assert.equal((await state()).steps, progress.steps, 'Memory recovery returns to paused play');
  await page.locator('#memoryClose').tap();
  await page.locator('[data-memory="berget"]').tap();
  await pad(1);
  assert.ok(await page.locator('#memory').isHidden(), 'Controller B closes the memory');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-memory')), 'berget');
  await pad(0);
  assert.ok(await page.locator('#memory').isVisible(), 'Controller A reopens a found memory');
  await pad(0);
  assert.equal(await page.locator('#memoryProgress').textContent(), '2 / 4', 'Controller A advances a frame');
  await page.locator('#memoryClose').tap();
  await page.locator('[data-memory="garden"]').tap();
  await page.waitForSelector('#memory[hidden]', { state: 'attached', timeout: 15000 });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-memory')), 'garden', 'Automatic completion returns to the same album button');
  assert.equal((await state()).steps, progress.steps);
  // The first encounter still plays automatically, then returns to the world with no held movement.
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&course=granskog&at=144,-7.99`);
  await ready();
  await page.waitForSelector('#memory:not([hidden])');
  const stopped = await state();
  assert.ok(stopped.flags.includes('memory'));
  await page.keyboard.press('Escape');
  await page.waitForFunction((before) => window.__godis.state().steps > before, stopped.steps);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'game', 'Automatic memory returns to the world');
  await page.keyboard.press('KeyG');
  assert.ok(await page.locator('[data-memory="granskog"]').count(), 'The new discovery can now be replayed');
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&course=epilog&at=22.4,0.01&flags=party:mamma,party:pappa,party:moa,party:bertil`);
  await ready();
  await page.waitForFunction(() => window.__godis.state().word === 'giveGhost');
  assert.equal(await page.locator('#actBtn').getAttribute('aria-label'), 'Ge spöket');
  await page.keyboard.press('KeyE');
  await page.locator('[data-sweet="gelehallon"]').tap();
  await page.locator('[data-friend="spoket"]').tap();
  await page.waitForFunction(() => window.__godis.state().flags.includes('beat:named'));
  await page.keyboard.press('Escape');
  assert.ok((await page.locator('#pauseMap').textContent()).includes('Klonk'), 'The real naming action changes the map immediately');
  assert.deepEqual(errors, []);
  console.log('Album: golden reward/reload, found-memory replay, interruption recovery and naming action passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
