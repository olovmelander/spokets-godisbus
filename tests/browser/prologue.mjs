// Required story interactions: real keyboard, touch and gamepad choices. Run after a build.
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
  for (const [name, viewport, tier, kind] of [
    ['mamma-landscape-low', { width: 844, height: 390 }, 'low', 'mamma'],
    ['mamma-portrait-high', { width: 390, height: 844 }, 'high', 'mamma'],
    ['pappa-landscape-high', { width: 844, height: 390 }, 'high', 'pappa'],
    ['pappa-portrait-low', { width: 390, height: 844 }, 'low', 'pappa'],
  ]) {
    const pappa = kind === 'pappa';
    const flags = pappa ? 'eye,paint,blink,mamma:passed,bag:torn,star' : 'eye,paint,blink';
    const at = pappa ? '45,2.41' : '5.5,0.01';
    const { page, state, info, finish } = await open(name, { viewport, hasTouch: true },
      `?dev&debug&standin&course=prolog&tier=${tier}&at=${at}&flags=${flags}`);
    await until(state, (s) => s.prologue?.kind === kind && s.prologue.seconds >= (pappa ? 1.45 : 0.85), `${name}: tableau`, 30000);
    await page.keyboard.press('Escape');
    const paused = await state();
    check(`${name}: pause opens during tableau`, paused.paused && paused.prologue?.kind === kind);
    await sleep(350);
    check(`${name}: all staging holds its simulation time while paused`, (await state()).prologue.seconds === paused.prologue.seconds);
    await page.locator('#pause').evaluate((node) => { node.style.visibility = 'hidden'; });
    await page.screenshot({ path: `/tmp/${name}.png` });
    await page.locator('#pause').evaluate((node) => { node.style.visibility = ''; });
    const before = await info();
    check(`${name}: draw budget`, before.drawCalls <= 120);
    await page.keyboard.press('Escape');
    await until(state, (s) => s.flags.includes(pappa ? 'pappa:done' : 'mamma:passed'), `${name}: completed`, 30000);
    check(`${name}: no shaders compile during the scene`, (await info()).programs === before.programs);
    if (pappa) {
      check(`${name}: safe walk is still required`, !(await state()).flags.includes('goal'));
      await page.keyboard.down('ArrowRight');
      await until(state, (s) => s.flags.includes('goal'), `${name}: title card`, 15000);
      await page.keyboard.up('ArrowRight');
      check(`${name}: scene continues to chapter card`, await page.locator('#endCard').isVisible());
    } else {
      await page.keyboard.down('ArrowRight');
      await until(state, (s) => s.flags.includes('bag:torn') && s.candy > 0, `${name}: torn bag trail`, 15000);
      await page.keyboard.up('ArrowRight');
      check(`${name}: chase resumes and candy can be collected`, (await state()).x > 8);
    }
    await finish();
  }
  console.log(`prologue: ${checked} checks passed`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
