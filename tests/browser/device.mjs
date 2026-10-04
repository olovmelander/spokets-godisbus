// Volume controls through the actual UI and Web Audio bus gains. This verifies routing, not the mix by ear.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const frames = (page, count = 4) => page.evaluate((count) => new Promise((resolve) => {
  const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next);
  requestAnimationFrame(next);
}), count);
const ready = (page) => page.waitForFunction(() => window.__godis?.state().bootReady && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
function deviceProbe() {
  const probe = window.__device = { wakeRequests: 0, released: 0, vibrations: [], fullscreenRequests: 0, fullscreen: null, refuseFullscreen: false, hidden: false };
  Object.defineProperty(document, 'hidden', { get: () => probe.hidden });
  Object.defineProperty(document, 'fullscreenEnabled', { get: () => true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => probe.fullscreen });
  Element.prototype.requestFullscreen = async () => {
    probe.fullscreenRequests++;
    if (probe.refuseFullscreen) throw Error('refused');
    probe.fullscreen = document.documentElement;
    document.dispatchEvent(new Event('fullscreenchange'));
  };
  document.exitFullscreen = async () => { probe.fullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); };
  Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => {
    probe.wakeRequests++;
    const held = new EventTarget();
    held.released = false;
    held.release = async () => {
      if (held.released) return;
      held.released = true; probe.released++; held.dispatchEvent(new Event('release'));
    };
    return held;
  } } });
  Object.defineProperty(navigator, 'vibrate', { value: (ms) => { probe.vibrations.push(ms); return true; } });
}
const read = (page) => page.evaluate(() => ({ ...window.__device, fullscreen: !!window.__device.fullscreen, state: window.__godis.state() }));
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 844, height: 390 }, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36' });
  await context.addInitScript(deviceProbe);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const url = `${origin}${BASE}?debug&standin&tier=low`;
  await page.goto(url);
  await ready(page); await frames(page);
  let value = await read(page);
  check('active visible play requests one screen lock without entering fullscreen', value.wakeRequests === 1 && value.released === 0 && value.fullscreenRequests === 0);
  check('vibration starts off for a new player', value.state.settings.vibration === false && value.vibrations.length === 0);
  await page.tap('#pauseBtn'); await frames(page);
  value = await read(page);
  check('pausing releases the lock', value.released === 1 && value.state.paused);
  check('Android offers an explicit fullscreen button and vibration setting', await page.isVisible('#fullscreenBtn') && await page.isVisible('#setVibration'));
  await page.tap('#fullscreenBtn');
  value = await read(page);
  check('the fullscreen button requests it while keeping play paused', value.fullscreenRequests === 1 && value.fullscreen && value.state.paused);
  check('fullscreen state updates the Swedish button label', await page.locator('#fullscreenBtn').textContent() === 'Lämna helskärm');
  await page.tap('#fullscreenBtn');
  check('the same button exits fullscreen', !(await read(page)).fullscreen);
  await page.evaluate(() => { window.__device.refuseFullscreen = true; });
  await page.tap('#fullscreenBtn');
  check('a refused fullscreen request leaves the game usable with a visible explanation', await page.isVisible('#fullscreenFailed') && (await read(page)).state.paused);
  await page.check('#setVibration');
  await page.tap('#styleLugnt');
  check('switching style preserves the deliberate vibration choice', (await read(page)).state.settings.vibration === true);
  await page.tap('#resumeBtn'); await frames(page);
  check('resuming requests a fresh screen lock', (await read(page)).wakeRequests === 2);
  await page.keyboard.down('ArrowRight'); await frames(page, 6);
  const beforeResize = (await read(page)).state;
  await page.setViewportSize({ width: 390, height: 844 }); await frames(page);
  value = await read(page);
  check('rotation pauses and releases the screen lock without changing saved progress', value.state.paused && value.released === 2 && value.state.checkpoint === beforeResize.checkpoint && JSON.stringify(value.state.flags) === JSON.stringify(beforeResize.flags));
  const pausedSteps = value.state.steps;
  await frames(page);
  check('simulation stays stopped after resizing', (await read(page)).state.steps === pausedSteps);
  await page.tap('#resumeBtn'); await frames(page, 8);
  value = await read(page);
  check('held movement was released, so resuming does not keep walking', Math.abs(value.state.vx) < 0.01 && value.wakeRequests === 3);
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => { window.__device.hidden = true; document.dispatchEvent(new Event('visibilitychange')); }); await frames(page);
  value = await read(page);
  check('a hidden page releases the active lock', value.released === 3);
  const hiddenSteps = value.state.steps;
  await frames(page);
  check('a hidden page does not simulate', (await read(page)).state.steps === hiddenSteps);
  await page.evaluate(() => { window.__device.hidden = false; document.dispatchEvent(new Event('visibilitychange')); }); await frames(page);
  check('returning visible reacquires one lock for active play', (await read(page)).wakeRequests === 4);
  await page.tap('#pauseBtn'); await frames(page);
  await page.evaluate(() => { window.__device.hidden = true; document.dispatchEvent(new Event('visibilitychange')); window.__device.hidden = false; document.dispatchEvent(new Event('visibilitychange')); }); await frames(page);
  check('visibility does not acquire a lock while paused', (await read(page)).wakeRequests === 4);
  await page.tap('#titleBtn'); await frames(page);
  check('the title keeps the lock released', (await read(page)).state.title && (await read(page)).wakeRequests === 4);
  await page.goto(`${url}&at=0,4`); await ready(page);
  await page.waitForFunction(() => window.__godis.state().grounded, null, { timeout: 20000 }); await frames(page);
  value = await read(page);
  check('the vibration choice survives reload and a high landing gives one tiny bump', value.state.settings.vibration === true && JSON.stringify(value.vibrations) === '[10]');
  assert.deepEqual(errors, [], 'no browser exceptions during device transitions');
  await context.close();

  for (const userAgent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.4 Safari/605.1.15']) {
    const apple = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 844, height: 390 }, hasTouch: true, userAgent });
    await apple.addInitScript(deviceProbe);
    const tab = await apple.newPage();
    await tab.goto(url); await ready(tab);
    await tab.tap('#pauseBtn'); await frames(tab);
    check('iPhone/iPad-style browsers hide fullscreen and vibration even when the APIs exist', !await tab.isVisible('#fullscreenBtn') && !await tab.isVisible('#setVibration'));
    await apple.close();
  }
  console.log(`Device browser checks: ${checks} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
