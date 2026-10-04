// Release boundaries and navigation through real title/end-card controls; no release constant is changed.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}${BASE}`;
let browser;
let checked = 0;
const check = (name, value) => { assert.ok(value, name); checked++; console.log(`  ok   ${name}`); };
const ready = (page) => page.waitForFunction(() => window.__godis?.state().bootReady && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
const state = (page) => page.evaluate(() => window.__godis.state());
async function open(context, query) {
  const page = await context.newPage();
  await page.goto(`${origin}?debug&standin&tier=low&${query}`);
  await ready(page);
  return page;
}
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' });
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(String(error))));
  let page = await open(context, 'course=epilog&title');
  check('debug and an unreleased explicit course still open the public test course', (await state(page)).course === 'testbana');
  await page.click('#codeBtn');
  await page.fill('#codeInput', 'GRAN KOTTE MOSSA');
  await page.locator('#codeInput').press('Enter');
  await page.waitForSelector('#codeWrong:not([hidden])');
  check('an unreleased chapter code is rejected visibly without navigation', (await state(page)).course === 'testbana' && new URL(page.url()).searchParams.get('course') === 'epilog');
  await page.close();

  page = await open(context, 'dev&course=garden&title&flags=dewsong');
  await page.click('#codeBtn');
  await page.fill('#codeInput', 'GRAN KOTTE MOSSA');
  await Promise.all([page.waitForURL((url) => url.searchParams.get('course') === 'granskog'), page.locator('#codeInput').press('Enter')]);
  await ready(page);
  let url = new URL(page.url());
  check('a development code replaces an explicit course', (await state(page)).course === 'granskog');
  check('a code removes old inspection flags and starts at the new beginning', !url.searchParams.has('flags') && (await state(page)).x < 10);
  await page.close();

  page = await open(context, 'dev&course=garden&at=208.5,0.01&flags=dewsong');
  await page.keyboard.down('ArrowRight');
  await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
  await page.keyboard.up('ArrowRight');
  check('a development end card offers the next chapter', await page.locator('#endOnward').isVisible());
  await Promise.all([page.waitForURL((url) => url.searchParams.get('course') === 'granskog'), page.click('#endOnward')]);
  await ready(page);
  url = new URL(page.url());
  check('onward replaces the explicit chapter rather than reloading its end card', (await state(page)).course === 'granskog');
  check('onward clears the old start coordinates and flags', !url.searchParams.has('at') && !url.searchParams.has('flags') && (await state(page)).x < 10);
  await page.close();

  // Use a real store-created profile, then emulate a save from a later development session.
  page = await open(context, 'dev&course=garden');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const key = `godisbus.v1.player.${window.__godis.state().playerId}`;
    const saved = JSON.parse(localStorage.getItem(key));
    saved.chapter = 'myren'; saved.checkpoint = 3;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  // Close fires pagehide, which would save this garden tab again; navigate with the test save set on load.
  await context.addInitScript(() => {
    const key = 'godisbus.v1.player.elof';
    const text = localStorage.getItem(key);
    if (!text) return;
    const saved = JSON.parse(text); saved.chapter = 'myren'; saved.checkpoint = 3;
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.goto(`${origin}?debug&standin&tier=low`);
  await ready(page);
  check('an unreleased saved chapter opens the public fallback', (await state(page)).course === 'testbana');
  await page.keyboard.press('Escape');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(`godisbus.v1.player.${window.__godis.state().playerId}`)));
  check('public fallback autosave preserves the later chapter and checkpoint', saved.chapter === 'myren' && saved.checkpoint === 3);
  check('all routing checks run without page errors', errors.length === 0);
  await context.close();
  console.log(`${checked} release-routing browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
