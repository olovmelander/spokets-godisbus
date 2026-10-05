// Post-story navigation uses the real title, pause, end card, storage and input controller.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
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
async function open(query = '') {
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&${query}`);
  await ready();
}
try {
  await page.addInitScript(() => {
    window.__testPad = { connected: true, mapping: 'standard', index: 0, id: 'test controller', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
    if (!localStorage.getItem('journey-test')) {
      localStorage.setItem('journey-test', 'yes');
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', chapter: 'epilog', checkpoint: 2, settings: { style: 'aventyr' }, updated: 1, playMs: 0, checkpoints: { garden: 1 }, candy: { garden: [0, 1, 4] }, placed: { garden: ['curl'] }, flags: { epilog: ['goal', 'beat:named'], garden: ['goal', 'found:gelehallon', 'memory'] } }));
    }
  });
  await open('course=epilog&title');
  await page.locator('#titleExplore').tap();
  assert.equal(await page.locator('#explore [data-chapter]').count(), 8);
  assert.ok((await page.locator('#explore .map').textContent()).includes('Klonk'), 'The saved name appears on the map');
  const paused = await state();
  await pad(13);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-chapter')), 'byn', 'Controller moves through chapter choices');
  await pad(1);
  assert.ok(await page.locator('#explore').isHidden(), 'Controller B returns to title');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'titleExplore');
  assert.equal((await state()).steps, paused.steps, 'Browsing the map keeps play paused');
  await page.keyboard.press('Enter');
  await page.locator('#explore [data-chapter="byn"]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.className), 'panel-close', 'Tab stays inside selector');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-chapter')), 'byn');
  await page.locator('#explore [data-chapter="garden"]').focus();
  await Promise.all([page.waitForURL(/course=garden/), page.keyboard.press('Enter')]);
  await ready();
  assert.equal((await state()).checkpoint, 1, 'Revisit resumes at remembered safe place');
  assert.ok((await state()).flags.includes('found:gelehallon'));
  assert.ok(!(await state()).flags.includes('goal'), 'The live chapter can be reached again');
  await page.keyboard.press('Escape');
  const after = await saved();
  assert.ok((await page.locator('#pauseMap').textContent()).includes('Klonk'), 'The name follows him into earlier chapters');
  for (const flag of ['goal', 'found:gelehallon', 'memory']) assert.ok(after.flags.garden.includes(flag));
  assert.ok(after.flags.epilog.includes('goal'), 'The ending stays unlocked');
  assert.deepEqual(after.placed.garden, ['curl']);
  for (const candy of [0, 1, 4]) assert.ok(after.candy.garden.includes(candy));
  await page.locator('#pauseExplore').tap();
  if (process.env.JOURNEY_SHOT) await picture(page, process.env.JOURNEY_SHOT);
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#pause').isVisible(), 'Escape returns to pause');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'pauseExplore');
  await page.locator('#pauseExplore').tap();
  await Promise.all([page.waitForURL(/course=byn/), page.locator('#explore [data-chapter="byn"]').tap()]);
  await ready();
  await page.keyboard.press('Escape');
  assert.equal((await saved()).checkpoints.garden, 1);
  assert.equal((await saved()).checkpoints.epilog, 2);
  // A new ending offers the selector too; no explicit course URL can trap the next chapter button.
  await open('course=epilog&flags=goal');
  // Automatic credits temporarily hide their source end card. Dismiss them before waiting for it.
  await page.waitForSelector('#photoAlbum:not([hidden]), #endCard:not([hidden])', { timeout: 60000 });
  if (await page.locator('#photoAlbum').isVisible()) await page.keyboard.press('Escape');
  await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
  assert.ok(await page.locator('#endExplore').isVisible());
  await page.locator('#endExplore').tap();
  await pad(1);
  assert.ok(await page.locator('#endCard').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'endExplore');
  assert.deepEqual(errors, []);
  console.log('Journey: title/pause/end selector, touch/keyboard/controller and preserved save passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
