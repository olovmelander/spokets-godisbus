// Replayable sensory toys: real movement, loaded discoveries, shader stability and local-only requests.
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
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('request', (request) => {
  assert.ok(request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()), 'Only local requests');
});
const state = () => page.evaluate(() => window.__godis.state());
async function open(query) {
  await page.goto(`${origin}${base}?dev&debug&standin&tier=low&${query}`);
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await page.waitForFunction(() => window.__godis.info().models.includes('boot/jay') && window.__godis.info().models.includes('boot/big-candy'));
  const warmed = (await state()).steps;
  await page.waitForFunction((step) => window.__godis.state().steps > step + 8, warmed);
  await page.waitForFunction(() => window.__godis.state().grounded);
}
async function hop() {
  const before = (await state()).steps;
  await page.keyboard.down('Space');
  await page.waitForFunction((step) => window.__godis.state().steps > step + 80, before);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__godis.state().grounded);
}
try {
  await open('course=garden&at=89.6,0.01&flags=note:dew1');
  const programs = await page.evaluate(() => window.__godis.info().programs);
  assert.equal((await state()).noteHits.length, 0, 'Loading a discovered drop does not replay audio');
  await hop();
  const first = (await state()).noteHits;
  assert.ok(first.length > 0 && first.every((hit) => hit.midi === 74), 'A discovered drop rings its own pitch');
  await hop();
  assert.ok((await state()).noteHits.at(-1).serial > first.at(-1).serial, 'The same dew drop can be played again');
  assert.equal(await page.evaluate(() => window.__godis.info().programs), programs, 'Ringing does not compile a shader');
  await open('course=garden&at=92.4,0.01&flags=dewsong');
  assert.ok((await state()).flags.includes('dewsong'), 'The saved lawn sparkle reward remains unlocked');
  if (process.env.TOY_SHOT) await page.screenshot({ path: process.env.TOY_SHOT });
  await open('course=berget&at=98,26.41&flags=note:1');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__godis.state().x > 101.5);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => window.__godis.state().x < 98);
  await page.keyboard.up('ArrowLeft');
  const strikes = (await state()).noteHits.filter((hit) => hit.id === 'note:1');
  assert.ok(strikes.length >= 2 && strikes.every((hit) => hit.midi === 67), 'The saved shore cobble can be played again at the same pitch');
  await open('course=granskog&at=64.4,10.01&flags=vittra:berry');
  assert.equal((await state()).word, 'leaveBerry', 'The door offers the berry gift');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__godis.state().flags.includes('vittra:gift'));
  assert.ok(!(await state()).flags.includes('keepsake:vittra'), 'Giving is not an immediate sticker pickup');
  await open('course=granskog&at=64.4,10.01&flags=vittra:gift,vittra:gift:away');
  await page.waitForFunction(() => window.__godis.state().flags.includes('keepsake:vittra'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-keepsake="vittra"]').count(), 1, 'The return gift appears in the album as a keepsake');
  assert.deepEqual(errors, [], 'No browser errors');
  console.log('Replayable toys: garden, mountain and vittra browser checks passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
