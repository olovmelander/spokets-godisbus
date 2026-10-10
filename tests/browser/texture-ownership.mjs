// Actual KTX upload, release and versioned refetch through context loss; no private assets required.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
let fail = false;
let hold = false;
let pending = [];
const requests = [];
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  const reply = () => res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file));
  if (path.endsWith('/big-candy.glb')) {
    requests.push(req.url);
    if (fail) { res.writeHead(503).end(); return; }
    if (hold) { pending.push(reply); return; }
  }
  reply();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const check = (label, ok) => { assert.ok(ok, label); checks++; console.log(`  ok   ${label}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const info = (page) => page.evaluate(() => window.__godis.info());
const state = (page) => page.evaluate(() => window.__godis.state());
const progress = ({ x, y, steps, candy, flags, checkpoint }) => ({ x, y, steps, candy, flags, checkpoint });
const restored = (page) => page.waitForFunction(() => document.getElementById('messageButton').textContent === 'Spela vidare'
  && !document.getElementById('messageButton').disabled, null, { timeout: 60000 });
async function lose(page) {
  await page.evaluate(() => {
    window.__loss = document.getElementById('game').getContext('webgl2').getExtension('WEBGL_lose_context');
    window.__loss.loseContext();
  });
  await page.waitForFunction(() => window.__godis.state().contextLost);
}
const restore = (page) => page.evaluate(() => window.__loss.restoreContext());
async function open(workers = 'block') {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: workers });
  await context.addInitScript(() => {
    window.__uploads = [];
    const original = WebGL2RenderingContext.prototype.compressedTexSubImage2D;
    WebGL2RenderingContext.prototype.compressedTexSubImage2D = function (...args) {
      const result = original.apply(this, args);
      const data = args.findLast((value) => ArrayBuffer.isView(value));
      if (data) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        let hash = 2166136261;
        for (const value of bytes) hash = Math.imul(hash ^ value, 16777619) >>> 0;
        window.__uploads.push({ level: args[1], width: args[4], height: args[5], bytes: bytes.length, hash });
      }
      return result;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}${BASE}?debug&standin&tier=high&course=testbana`);
  await page.waitForFunction(() => window.__godis);
  return { context, page, errors };
}
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const { context, page, errors } = await open();
  await page.waitForFunction(() => window.__godis.state().bootReady);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__godis.state().paused);
  const first = await info(page);
  const baseline = progress(await state(page));
  const pixels = await page.evaluate(() => window.__uploads);
  check('real public KTX mip pixels reached GL', pixels.length > 0 && pixels.every((p) => p.bytes > 0 && p.hash > 0));
  check('uploaded immutable mip buffers are released', first.assetTextures.managed > 0
    && first.assetTextures.managed === first.assetTextures.released && first.assetTextures.cpuBytes === 0);
  const requestStart = requests.length;
  await lose(page);
  await restore(page);
  await restored(page);
  check('restore refetches the original content-versioned GLB', requests.length === requestStart + 1 && new Set(requests).size === 1 && requests[0].includes('?v='));
  const after = await page.evaluate(() => window.__uploads);
  assert.deepEqual(after.slice(pixels.length), pixels, 'restored KTX mip payload matches the actual initial upload');
  check('the same compressed mip pixels are uploaded again', true);
  check('restored immutable CPU data is released again', (await info(page)).assetTextures.cpuBytes === 0 && (await info(page)).assetTextures.restores === 1);
  assert.deepEqual(progress(await state(page)), baseline);
  check('asset restoration leaves progress and actor state untouched', true);
  await page.locator('#messageButton').click();

  fail = true;
  const failedAt = requests.length;
  await lose(page);
  await restore(page);
  await page.waitForFunction(() => document.getElementById('messageText').textContent === 'Något gick fel när spelet laddades.', null, { timeout: 60000 });
  check('failed refetch uses the bounded four-attempt retry budget', requests.length === failedAt + 4);
  await page.keyboard.press('Escape');
  assert.deepEqual(progress(await state(page)), baseline);
  check('failure keeps the game blocked with its progress intact', (await state(page)).paused && await page.getByRole('alertdialog').isVisible());
  fail = false;
  await page.locator('#messageButton').click();
  await restored(page);
  check('manual retry restores textures without a page reload', (await info(page)).assetTextures.restores === 2);
  await page.locator('#messageButton').click();

  hold = true;
  await lose(page);
  await restore(page);
  for (let attempt = 0; !pending.length && attempt < 100; attempt++) await sleep(30);
  check('resume stays unavailable while the texture body is pending', pending.length === 1 && await page.locator('#messageButton').isDisabled());
  await lose(page);
  hold = false;
  await restore(page);
  await restored(page);
  const beforeStale = (await info(page)).assetTextures.restores;
  const stale = pending;
  pending = [];
  stale.forEach((reply) => reply());
  await sleep(350);
  check('late completion from an earlier lost context cannot replace the newer restoration', (await info(page)).assetTextures.restores === beforeStale
    && await page.locator('#messageButton').textContent() === 'Spela vidare');
  assert.deepEqual(progress(await state(page)), baseline);
  assert.deepEqual(errors, []);
  await context.close();

  // A failure during initial boot still offers a real reload, not an endlessly rejected ready promise.
  fail = true;
  const boot = await open();
  await lose(boot.page);
  await restore(boot.page);
  await boot.page.waitForFunction(() => document.getElementById('messageText').textContent === 'Något gick fel när spelet laddades.', null, { timeout: 60000 });
  fail = false;
  await Promise.all([boot.page.waitForNavigation(), boot.page.locator('#messageButton').click()]);
  await boot.page.waitForFunction(() => window.__godis?.state().bootReady, null, { timeout: 60000 });
  check('initial readiness failure retains a working reload retry', (await info(boot.page)).assetTextures.released > 0);
  await boot.context.close();

  const offline = await open('allow');
  await offline.page.waitForFunction(() => window.__godis.state().bootReady && navigator.serviceWorker.controller, null, { timeout: 60000 });
  await offline.context.setOffline(true);
  await lose(offline.page);
  await restore(offline.page);
  await restored(offline.page);
  check('released KTX textures recover offline from the same cached build', (await info(offline.page)).assetTextures.restores === 1
    && (await info(offline.page)).assetTextures.cpuBytes === 0);
  assert.deepEqual(offline.errors, []);
  await offline.context.close();
  console.log(`Texture ownership browser checks: ${checks} passed.`);
} finally {
  pending.forEach((reply) => reply());
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
