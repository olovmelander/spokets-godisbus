// The normal address opens the released story, including Byn, without a development flag.
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
  let page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done'), null, { timeout: 60000 });
  check('the bare public address opens the playable title', await page.locator('#title').isVisible());
  await page.close();

  page = await open(context, '');
  check('the normal public route starts the prologue', (await state(page)).course === 'prolog');
  await page.close();

  page = await open(context, 'course=prolog&title');
  await page.click('#codeBtn');
  await page.fill('#codeInput', 'GRAN KOTTE MOSSA');
  await Promise.all([page.waitForURL((url) => url.searchParams.get('course') === 'granskog'), page.locator('#codeInput').press('Enter')]);
  await ready(page);
  check('a chapter code opens Granskogen without dev', (await state(page)).course === 'granskog' && !new URL(page.url()).searchParams.has('dev'));
  await page.close();

  page = await open(context, 'course=byn');
  check('the bonus Byn opens directly without dev', (await state(page)).course === 'byn');
  await page.close();

  page = await open(context, 'course=garden&at=208.5,0.01&flags=dewsong');
  await page.keyboard.down('ArrowRight');
  await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
  await page.keyboard.up('ArrowRight');
  check('a public end card offers the next chapter', await page.locator('#endOnward').isVisible());
  await Promise.all([page.waitForURL((url) => url.searchParams.get('course') === 'granskog'), page.click('#endOnward')]);
  await ready(page);
  let url = new URL(page.url());
  check('onward replaces the explicit chapter rather than reloading its end card', (await state(page)).course === 'granskog');
  check('onward clears inspection seeds and stays public', !url.searchParams.has('at') && !url.searchParams.has('flags') && !url.searchParams.has('dev') && (await state(page)).x < 10);
  await page.close();

  page = await open(context, 'course=epilog&flags=goal');
  await page.waitForSelector('#photoAlbum:not([hidden]), #endCard:not([hidden])', { timeout: 60000 });
  if (await page.locator('#photoAlbum').isVisible()) await page.keyboard.press('Escape');
  await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
  check('the public epilogue offers Byn as the bonus', await page.locator('#endOnward').isVisible());
  await Promise.all([page.waitForURL((target) => target.searchParams.get('course') === 'byn'), page.click('#endOnward')]);
  await ready(page);
  check('the bonus transition stays on the normal route', (await state(page)).course === 'byn' && !new URL(page.url()).searchParams.has('dev'));
  await page.close();

  // Use a real store-created profile, then emulate progress saved before this release.
  page = await open(context, 'course=garden');
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
  check('a public save resumes its released chapter', (await state(page)).course === 'myren');
  await page.keyboard.press('Escape');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(`godisbus.v1.player.${window.__godis.state().playerId}`)));
  check('public autosave preserves the chapter and checkpoint', saved.chapter === 'myren' && saved.checkpoint === 3);
  check('all routing checks run without page errors', errors.length === 0);
  await context.close();
  console.log(`${checked} release-routing browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
