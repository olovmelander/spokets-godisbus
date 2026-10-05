// Required story interactions: real keyboard, touch and gamepad choices. Run after a build.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

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
  if (!process.env.PROLOGUE_SCENE) {
    const { page, state, finish } = await open('shrinking-reassurance', { hasTouch: true },
      '?dev&debug&standin&course=prolog&tier=low&at=40,-0.79&flags=eye,paint,blink,mamma:passed,bag:torn');
    await until(state, (s) => s.verb === 'take', 'the spilled star is offered');
    await page.keyboard.press('e');
    await until(state, (s) => s.flags.includes('star'), 'Elof takes the star');
    await page.waitForFunction(() => document.getElementById('bubbleLine').textContent === 'Stjärnan gör dig liten. Vi hjälper dig!');
    check('shrinking: Pappa immediately explains the cause and reassures Elof ahead of stale dialogue',
      await page.locator('#bubble').getAttribute('data-who') === 'pappa');
    await page.keyboard.press('Escape');
    const line = await page.locator('#bubbleLine').textContent();
    await sleep(250);
    check('shrinking: pausing keeps the explanation available', await page.locator('#bubbleLine').textContent() === line);
    await page.keyboard.press('Escape');
    await page.keyboard.down('ArrowRight');
    // The walk takes about 14 s of the game's own time. On GitHub's software renderer a frame of the room's
    // floor takes long enough for the game to fall a little behind the clock, and 15 s were too few in two
    // runs of five once the floor filled the lower third of the picture (#141): he was still walking, at x 50.
    await until(state, (s) => s.flags.includes('goal'), 'fast shrinking flow reaches its handoff', 40000);
    await page.keyboard.up('ArrowRight');
    check('shrinking: the safe ride and family tableau still complete', (await state()).flags.includes('pappa:done'));
    await finish();
  }
  for (const [name, viewport, tier, kind] of [
    ['mamma-landscape-low', { width: 844, height: 390 }, 'low', 'mamma'],
    ['mamma-portrait-high', { width: 390, height: 844 }, 'high', 'mamma'],
    ['pappa-landscape-high', { width: 844, height: 390 }, 'high', 'pappa'],
    ['pappa-portrait-low', { width: 390, height: 844 }, 'low', 'pappa'],
  ]) {
    if (process.env.PROLOGUE_SCENE && !name.startsWith(process.env.PROLOGUE_SCENE)) continue;
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
    await picture(page, `/tmp/${name}.png`);
    await page.locator('#pause').evaluate((node) => { node.style.visibility = ''; });
    const before = await info();
    check(`${name}: draw budget`, withinDraws(before.drawCalls, before.tier));
    await page.keyboard.press('Escape');
    await until(state, (s) => s.flags.includes(pappa ? 'pappa:done' : 'mamma:passed'), `${name}: completed`, 30000);
    check(`${name}: no shaders compile during the scene`, (await info()).programs === before.programs);
    if (pappa) {
      check(`${name}: safe walk is still required`, !(await state()).flags.includes('goal'));
      await page.keyboard.down('ArrowRight');
      await until(state, (s) => s.flags.includes('goal'), `${name}: title card`, 15000);
      await page.keyboard.up('ArrowRight');
      await page.waitForSelector('#endCard:not([hidden])', { timeout: 15000 });
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
