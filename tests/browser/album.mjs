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
async function ready() {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
}
try {
  await page.addInitScript(() => {
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
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&course=epilog&at=22.4,0.01&flags=party:mamma,party:pappa,party:moa,party:bertil`);
  await ready();
  await page.waitForFunction(() => window.__godis.state().word === 'giveGhost');
  assert.equal(await page.locator('#actBtn').getAttribute('aria-label'), 'Ge spöket');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__godis.state().flags.includes('beat:named'));
  await page.keyboard.press('Escape');
  assert.ok((await page.locator('#pauseMap').textContent()).includes('Klonk'), 'The real naming action changes the map immediately');
  assert.deepEqual(errors, []);
  console.log('Album: final pickup, golden reward/reload and real naming action passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
