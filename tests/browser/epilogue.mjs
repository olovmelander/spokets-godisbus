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

function installPad() {
  window.__testPad = {
    connected: true, mapping: 'standard', index: 0, id: 'browser test controller',
    axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
}
async function padPress(page, index) {
  await page.evaluate((i) => {
    window.__testPad.buttons[i] = { pressed: true, touched: true, value: 1 };
  }, index);
  await frames(page, 2);
  await page.evaluate((i) => {
    window.__testPad.buttons[i] = { pressed: false, touched: false, value: 0 };
  }, index);
  await frames(page, 2);
}
async function padFocus(page, selector) {
  for (let n = 0; n < 35; n++) {
    if (await page.evaluate((target) => document.activeElement?.matches(target), selector)) return;
    await padPress(page, 13); // D-pad down
  }
  assert.fail(`Gamepad could not reach ${selector}.`);
}

async function drawStroke(page, points, touch = false) {
  const coords = await page.evaluate((path) => {
    const svg = document.getElementById('strokePicture'), matrix = svg.getScreenCTM();
    return path.map((point) => { const p = svg.createSVGPoint(); p.x = point.x; p.y = point.y; const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, points);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...coords[0], id: 1 }] });
    for (const point of coords.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(coords[0].x, coords[0].y); await page.mouse.down();
    for (const point of coords.slice(1)) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
}

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, viewport, tier, touch] of [
    ['window-portrait-low', { width: 390, height: 844 }, 'low', true],
    ['window-landscape-high', { width: 844, height: 390 }, 'high', false],
  ]) {
    if (process.env.EPILOGUE_SCENE === 'shelf') continue;
    const { page, state, info, finish } = await open(name, { viewport, hasTouch: touch, reducedMotion: touch ? 'reduce' : 'no-preference' },
      `?dev&debug&standin&course=epilog&tier=${tier}&at=52.8,3&flags=dots`, touch ? () => {
        localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1,
          settings: { style: 'aventyr', sound: false, effectsVolume: 0, calm: true }, chapter: 'epilog', checkpoint: 2,
          candy: {}, placed: {}, flags: { epilog: ['dots'] }, playMs: 0 }));
      } : installPad);
    await page.keyboard.down('ArrowRight');
    await page.waitForSelector('#photoAlbum:not([hidden])', { timeout: 30000 });
    await page.keyboard.up('ArrowRight');
    const before = await info();
    if (touch) {
      const button = await page.locator('#photoNext').boundingBox();
      await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
    } else await page.click('#photoNext');
    await page.waitForSelector('#endingShot:not([hidden])');
    const began = await state();
    check(`${name}: completing credits focuses the window shot`, await page.locator('#endingContinue').evaluate(node => node === document.activeElement));
    await page.keyboard.down('ArrowRight');
    await until(state, s => s.ending.seconds >= 2.05, `${name}: blink finishes`, 30000);
    await page.keyboard.up('ArrowRight');
    const after = await info();
    check(`${name}: chapter simulation remains frozen`, (await state()).steps === began.steps);
    check(`${name}: ending draw budget`, after.drawCalls <= 120);
    check(`${name}: no new shaders for the window shot`, after.programs === before.programs);
    check(`${name}: the one bell respects effects mute`, after.soundsPlayed - before.soundsPlayed === (touch ? 0 : 1));
    await page.locator('#debug').evaluate(node => { node.style.visibility = 'hidden'; });
    await page.screenshot({ path: `/tmp/${name}.png` });
    if (!touch) {
      await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        window.__endingLoss = gl.getExtension('WEBGL_lose_context');
        window.__endingLoss.loseContext();
      });
      await until(state, s => s.contextLost, `${name}: lost`);
      const lost = (await state()).ending.seconds;
      await sleep(350);
      check(`${name}: recovery holds the ending clock`, (await state()).ending.seconds === lost);
      await page.evaluate(() => window.__endingLoss.restoreContext());
      await until(state, s => !s.contextLost, `${name}: restored`, 30000);
      await page.click('#messageButton');
      check(`${name}: recovery restores ending focus`, await page.locator('#endingContinue').evaluate(node => node === document.activeElement));
      await padPress(page, 1);
    } else {
      const button = await page.locator('#endingContinue').boundingBox();
      await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
    }
    await page.waitForSelector('#endCard:not([hidden])');
    check(`${name}: dismissal restores end and exploration controls`, await page.locator('#endingShot').isHidden() && await page.locator('#endExplore').isVisible());
    check(`${name}: end menu is silent again`, !(await info()).sound);
    await page.click('#endPhotos');
    await page.click('#photoNext');
    check(`${name}: repeated credits do not replay the last shot`, await page.locator('#endingShot').isHidden() && await page.locator('#endCard').isVisible());
    await finish();
  }
  {
    const { page, state, info, finish } = await open('shelf', { viewport: { width: 844, height: 390 } },
      '?dev&debug&standin&course=epilog&tier=low&at=33,0.01&flags=dots');
    await page.keyboard.press('Escape');
    check('shelf: the completed carving remains saved', (await state()).flags.includes('dots'));
    check('shelf: the two figures stay within the draw budget', (await info()).drawCalls <= 120);
    await page.locator('#pause').evaluate(node => { node.style.visibility = 'hidden'; });
    await page.locator('#debug').evaluate(node => { node.style.visibility = 'hidden'; });
    await page.screenshot({ path: '/tmp/epilogue-shelf.png' });
    await finish();
  }
  console.log(`epilogue: ${checked} checks passed`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
