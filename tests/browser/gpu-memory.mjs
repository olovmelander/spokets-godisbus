// Logical GL storage, not renderer.info's object counts. Run after the production build.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
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
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const check = (label, value) => { assert.ok(value, label); checks++; console.log(`  ok   ${label}`); };
const info = (page) => page.evaluate(() => window.__godis.info());
const frames = (page, count = 2) => page.evaluate((count) => new Promise((resolve) => {
  const step = () => { if (--count <= 0) resolve(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), count);
const ready = (page) => page.waitForFunction(() => window.__godis?.state().bootReady
  && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
const limits = { low: 100e6, mid: 150e6, high: 220e6 };
function gate(label, data) {
  const gpu = data.gpu;
  assert.ok(gpu && gpu.glBytes > 0, `${label}: allocations observed`);
  assert.deepEqual(gpu.unknownFormats, [], `${label}: every format counted`);
  assert.equal(gpu.glBytes, gpu.bufferBytes + gpu.textureBytes + gpu.renderbufferBytes);
  assert.equal(gpu.totalBytes, gpu.assetBytes + gpu.targetBytes + gpu.canvasBytes);
  assert.ok(gpu.maxTextureSize <= 2048, `${label}: largest asset texture ${gpu.maxTextureSize}`);
  assert.ok(gpu.totalBytes <= limits[data.tier], `${label}: ${gpu.totalBytes} > ${limits[data.tier]}`);
  assert.ok(gpu.peakBytes <= limits[data.tier], `${label}: transient peak ${gpu.peakBytes} > ${limits[data.tier]}`);
  if (data.tier === 'high') assert.ok(gpu.targetPeakBytes <= 80e6, `${label}: High target peak ${gpu.targetPeakBytes} > 80 MB`);
  check(`${label}: ${(gpu.totalBytes / 1e6).toFixed(2)} MB total, ${(gpu.targetBytes / 1e6).toFixed(2)} MB targets`, true);
}
const footprint = ({ gpu, geometries, textures }) => ({ bytes: gpu.glBytes, buffers: gpu.buffers,
  glTextures: gpu.textures, renderbuffers: gpu.renderbuffers, geometries, textures });

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGL|shader|GL_INVALID/.test(message.text())) errors.push(message.text());
  });
  // Stand-ins are the public build. Family assets need the same ?bench gate on Olov's devices.
  for (const course of ['prolog', 'garden', 'granskog', 'myren', 'berget', 'norrsken', 'epilog', 'byn']) {
    await page.goto(`${origin}${BASE}?dev&debug&standin&course=${course}&tier=low`);
    await ready(page);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__godis.state().paused);
    await frames(page);
    const low = await info(page);
    gate(`${course} Low tablet`, low);
    for (const tier of ['mid', 'high']) {
      await page.locator(`#graphics${tier[0].toUpperCase()}${tier.slice(1)}`).click();
      await frames(page);
      gate(`${course} ${tier} tablet`, await info(page));
    }
    await page.locator('#graphicsLow').click();
    await frames(page);
    const lowAgain = await info(page);
    check(`${course}: changing High back to Low releases HDR targets`, lowAgain.gpu.targetBytes === low.gpu.targetBytes);
    gate(`${course} Low after HDR`, lowAgain);
  }

  // Exercise repeated allocation/deletion at maximum High pixels, then context loss and recreation.
  // The first HDR frame also uploads its reusable full-screen geometry: compare warmed baselines.
  const warmedLow = await info(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.locator('#graphicsHigh').click();
    await frames(page);
    await page.locator('#graphicsLow').click();
    await frames(page);
    assert.deepEqual(footprint(await info(page)), footprint(warmedLow), `quality cycle ${cycle + 1}: warmed Low storage returns to baseline`);
  }
  check('repeated quality changes retain no abandoned GPU resources', true);
  await page.locator('#graphicsHigh').click();
  await frames(page);
  const high = await info(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.setViewportSize({ width: 390, height: 844 });
    await frames(page);
    gate(`portrait resize ${cycle + 1}`, await info(page));
    await page.setViewportSize({ width: 1180, height: 820 });
    await frames(page);
    assert.deepEqual(footprint(await info(page)), footprint(high), `resize ${cycle + 1}: tablet storage returns to baseline`);
  }
  check('repeated viewport changes retain no abandoned render targets', true);
  for (let cycle = 0; cycle < 10; cycle++) {
    await page.keyboard.press('Escape');
    await frames(page, 2);
    await page.keyboard.press('Escape');
    await frames(page, 2);
  }
  assert.deepEqual(footprint(await info(page)), footprint(high), 'ten pause/resume cycles return to baseline');
  check('ten pause/resume cycles keep geometry, texture and GL byte counts stable', true);
  await page.evaluate(() => {
    const gl = document.getElementById('game').getContext('webgl2');
    window.__loss = gl.getExtension('WEBGL_lose_context');
    if (!window.__loss) throw Error('Context-loss extension missing');
    window.__loss.loseContext();
  });
  await page.waitForFunction(() => window.__godis.info().gpu.lost);
  check('context loss drops all accounted GPU allocations', (await info(page)).gpu.totalBytes === 0);
  await page.evaluate(() => window.__loss.restoreContext());
  await page.waitForFunction(() => !window.__godis.state().contextLost, null, { timeout: 30000 });
  await page.locator('#messageButton').click();
  await frames(page);
  await page.keyboard.press('Escape');
  await frames(page);
  const restored = await info(page);
  gate('restored High tablet', restored);
  assert.deepEqual(footprint(restored), footprint(high), 'restored storage returns to the same baseline');
  check('restoration accounts for the rebuilt renderer and assets', true);
  assert.deepEqual(errors, [], 'GPU observation must not cause page exceptions');
  await context.close();
  console.log(`GPU memory browser checks: ${checks} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
