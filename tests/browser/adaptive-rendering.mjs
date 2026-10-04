// Focused rendering controller checks: real draw/resize operations and intentionally injected CPU work.
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
let checked = 0;
const check = (name, value) => { assert.ok(value, name); console.log(`  ok   ${name}`); checked++; };
function instrumentation() {
  // A real CPU workload longer than 250 ms must still let Auto settle. Otherwise a slow device can
  // reset calibration forever. Restore the ordinary overload once the title has selected Low.
  window.__renderTest = { workMs: 275, allocations: 0, draws: 0, hidden: false, longFrames: 0 };
  let frame = 0;
  let charged = -1;
  let last = 0;
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => raf((time) => {
    if (last && time - last > 250) window.__renderTest.longFrames++;
    last = time;
    frame++;
    callback(time);
  });
  for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const original = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...args) {
      window.__renderTest.draws++;
      if (charged !== frame) {
        charged = frame;
        const until = performance.now() + window.__renderTest.workMs;
        while (performance.now() < until) { /* Controlled CPU workload, not a changed game clock. */ }
      }
      return original.apply(this, args);
    };
  }
  for (const name of ['texImage2D', 'texStorage2D', 'renderbufferStorage', 'renderbufferStorageMultisample']) {
    const original = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...args) {
      window.__renderTest.allocations++;
      return original.apply(this, args);
    };
  }
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__renderTest.hidden });
}
const frames = (page, count) => page.evaluate((count) => new Promise((resolve) => {
  const step = () => { if (--count <= 0) resolve(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), count);
const ready = (page) => page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done')
  && ['boot/jay', 'boot/big-candy'].every((model) => window.__godis.info().models.includes(model)), null, { timeout: 60000 });
const info = (page) => page.evaluate(() => window.__godis.info());

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await context.addInitScript(instrumentation);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}${BASE}?debug&standin&title`);
  await ready(page);
  await page.waitForFunction(() => window.__godis.info().autoSettled, null, { timeout: 60000 });
  const title = await info(page);
  check('sustained title CPU work selects Low before play', title.tier === 'low' && (await page.evaluate(() => window.__godis.state())).title);
  check('Auto settles despite sustained visible frames longer than 250 ms', await page.evaluate(() => window.__renderTest.longFrames >= 20));
  await page.evaluate(() => { window.__renderTest.workMs = 24; });
  check('selected Low stays within its pixel budget', title.width * title.height <= 1e6);
  await frames(page, 5);
  check('an idle title makes no dynamic resolution allocations', (await info(page)).resizes === title.resizes);
  await page.click('#startBtn');
  if (await page.locator('#firstAventyr').isVisible()) await page.click('#firstAventyr');
  await page.waitForFunction(() => window.__godis.info().resolutionSteps >= 1, null, { timeout: 60000 });
  const reduced = await info(page);
  check('overloaded play reduces resolution by exactly 0.1 without changing tier', reduced.tier === 'low' && Math.abs(reduced.maxPixelRatio - reduced.pixelRatio - reduced.resolutionSteps * 0.1) < 1e-8);
  check('playing after the Low warmup compiles no additional shaders', reduced.programs === title.programs);
  const allocationCount = await page.evaluate(() => window.__renderTest.allocations);
  await frames(page, 5);
  check('consecutive gameplay frames do not reallocate render storage', (await page.evaluate(() => window.__renderTest.allocations)) === allocationCount);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__godis.state().paused);
  const paused = await info(page);
  await frames(page, 10);
  check('pause does not change resolution under the same injected load', (await info(page)).resizes === paused.resizes);

  // Explicit settings/query choices are stable, and both HDR targets follow a viewport change once.
  await page.click('#graphicsHigh');
  await frames(page, 3);
  const high = await info(page);
  check('explicit High resets dynamic reduction and takes effect while paused', high.tier === 'high' && high.resolutionSteps === 0 && high.pixelRatio === high.maxPixelRatio);
  const allocationsBeforeResize = await page.evaluate(() => window.__renderTest.allocations);
  await page.setViewportSize({ width: 1180, height: 820 });
  await frames(page, 3);
  const resized = await info(page);
  check('viewport resize respects the High cap and resizes the drawing buffer once', resized.width * resized.height <= 2.6e6 && resized.resizes === high.resizes + 1);
  check('HDR storage is rebuilt on resize without compiling shaders', (await page.evaluate(() => window.__renderTest.allocations)) > allocationsBeforeResize && resized.programs === high.programs);
  const allocationsAfterResize = await page.evaluate(() => window.__renderTest.allocations);
  await frames(page, 5);
  check('stable HDR frames reuse their targets', (await page.evaluate(() => window.__renderTest.allocations)) === allocationsAfterResize);
  await page.click('#resumeBtn');
  await frames(page, 15);
  check('an explicit quality selection is not changed by adaptation', (await info(page)).resolutionSteps === 0 && (await info(page)).tier === 'high');

  // Drive the visibility handler and hidden-frame guard without relying on headless tab visibility.
  await page.evaluate(() => { window.__renderTest.hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenDraws = await page.evaluate(() => window.__renderTest.draws);
  await frames(page, 5);
  check('hidden callbacks submit no rendering work', (await page.evaluate(() => window.__renderTest.draws)) === hiddenDraws);
  await page.evaluate(() => { window.__renderTest.hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await frames(page, 3);
  check('visibility restoration resumes rendering', (await page.evaluate(() => window.__renderTest.draws)) > hiddenDraws);

  await page.goto(`${origin}${BASE}?debug&standin&tier=mid`);
  await ready(page);
  await frames(page, 15);
  check('a query tier override keeps its cap and bypasses Auto', (await info(page)).tier === 'mid' && (await info(page)).resolutionSteps === 0);
  await page.goto(`${origin}${BASE}?bench&standin&tier=low`);
  await ready(page);
  await frames(page, 15);
  check('bench stays at its requested reproducible resolution', (await info(page)).tier === 'low' && (await info(page)).resolutionSteps === 0);
  assert.deepEqual(errors, [], 'no page exceptions during quality changes');
  await context.close();
  console.log(`Adaptive rendering browser checks: ${checked} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
