// Real context-loss/restore, audio pause and failed required-asset recovery against the production build.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { settingsPage } from './pause.mjs';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
let failures = 0;
let modelRequests = [];
let decoderFailures = 0;
let decoderRequests = [];
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  if (path.includes('/assets/basis_transcoder-') && path.endsWith('.wasm')) {
    decoderRequests.push(req.url);
    if (decoderFailures-- > 0) { res.writeHead(503, { 'cache-control': 'no-store' }).end(); return; }
  }
  if (path === `${BASE}packs/boot/big-candy.glb`) {
    modelRequests.push(req.url);
    if (failures-- > 0) { res.writeHead(503, { 'cache-control': 'no-store' }).end(); return; }
  }
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, accepts, name, timeout = 15000) {
  const end = Date.now() + timeout;
  let value;
  do { value = await read(); if (accepts(value)) return value; await sleep(40); } while (Date.now() < end);
  assert.fail(`${name}: ${JSON.stringify(value)}`);
}
const progress = ({ x, y, steps, candy, flags, checkpoint }) => ({ x, y, steps, candy, flags, checkpoint });
async function open(setup = async () => {}, query = '?debug&standin&tier=low') {
  // Keep the pack-failure assertions independent of a previously cached worker response.
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 844, height: 390 } });
  await context.addInitScript(() => {
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.__testAudio = this; }
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await setup(page);
  await page.goto(`${origin}${BASE}${query}`);
  await page.waitForFunction(() => window.__godis);
  return { page, context, errors, state: () => page.evaluate(() => window.__godis.state()), info: () => page.evaluate(() => window.__godis.info()) };
}
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  failures = 2;
  modelRequests = [];
  const recovered = await open();
  await until(recovered.state, (s) => s.bootReady && s.steps > 0, 'transient boot recovery', 60000);
  check('two transient failures recover automatically', modelRequests.length === 3);
  check('retries preserve the revision URL', new Set(modelRequests).size === 1 && modelRequests[0].includes('?v='));
  check('successful retry removes loading card', await recovered.page.locator('#loading').evaluate((e) => e.classList.contains('done')));
  assert.deepEqual(recovered.errors, []);
  await recovered.context.close();

  failures = 20;
  modelRequests = [];
  const failed = await open();
  await failed.page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 60000 });
  check('exhaustion stops at initial request plus three retries', modelRequests.length === 4);
  check('required boot failure has visible Swedish retry', await failed.page.locator('#messageText').textContent() === 'Något gick fel när spelet laddades.');
  check('retry has keyboard focus', await failed.page.locator('#messageButton').evaluate((e) => e === document.activeElement));
  const frozen = progress(await failed.state());
  await failed.page.keyboard.press('Escape');
  await failed.page.keyboard.press('Tab');
  await sleep(180);
  assert.deepEqual(progress(await failed.state()), frozen);
  check('failed boot cannot play a silent placeholder scene', frozen.steps === 0 && !(await failed.state()).bootReady);
  check('error dialog keeps focus', await failed.page.locator('#messageButton').evaluate((e) => e === document.activeElement));
  failures = 0;
  await failed.page.keyboard.press('Enter');
  await failed.page.waitForFunction(() => window.__godis?.state().bootReady, null, { timeout: 60000 });
  await until(failed.state, (s) => s.steps > 0, 'manual retry resumes boot');
  check('manual retry loads the required asset', (await failed.info()).models.includes('boot/big-candy'));
  assert.deepEqual(failed.errors, []);
  await failed.context.close();

  decoderFailures = 2;
  decoderRequests = [];
  const decoder = await open();
  await until(decoder.state, (s) => s.bootReady && s.steps > 0, 'decoder recovery', 60000);
  check('required decoder retries preserve the hashed asset URL', decoderRequests.length === 3 && new Set(decoderRequests).size === 1);
  check('retried decoder produces compressed textures', (await decoder.info()).compressedTextures > 0);
  assert.deepEqual(decoder.errors, []);
  await decoder.context.close();
  decoderFailures = 20;
  decoderRequests = [];
  const decoderFailed = await open();
  await decoderFailed.page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 60000 });
  check('decoder failure also exhausts three retries and stops boot', decoderRequests.length === 4 && !(await decoderFailed.state()).bootReady && (await decoderFailed.state()).steps === 0);
  assert.deepEqual(decoderFailed.errors, []);
  await decoderFailed.context.close();
  decoderFailures = 0;

  let releaseModel;
  const modelGate = new Promise((resolve) => { releaseModel = resolve; });
  const duringBoot = await open(async (page) => page.route('**/packs/boot/big-candy.glb*', async (route) => {
    await modelGate;
    await route.continue();
  }));
  await duringBoot.page.evaluate(() => {
    window.__loss = document.getElementById('game').getContext('webgl2').getExtension('WEBGL_lose_context');
    window.__loss.loseContext();
  });
  await until(duringBoot.state, (s) => s.contextLost, 'loss during boot');
  await duringBoot.page.evaluate(() => window.__loss.restoreContext());
  await until(duringBoot.state, (s) => !s.contextLost, 'restore before model arrives', 30000);
  check('loss and restore during boot cannot start play early', !(await duringBoot.state()).bootReady && (await duringBoot.state()).steps === 0);
  releaseModel();
  await until(duringBoot.state, (s) => s.bootReady, 'late boot asset ready', 60000);
  check('finishing boot after restore offers continuation', await duringBoot.page.locator('#messageButton').textContent() === 'Spela vidare');
  await duringBoot.page.locator('#messageButton').click();
  await until(duringBoot.state, (s) => !s.paused && s.steps > 0, 'continue after early restore');
  assert.deepEqual(duringBoot.errors, []);
  await duringBoot.context.close();

  // A start pressed while the models still load is kept, never dropped (docs/ux-audit/first-minutes.md row 1).
  let releaseLate;
  const lateGate = new Promise((resolve) => { releaseLate = resolve; });
  const early = await open(async (page) => page.route('**/packs/boot/big-candy.glb*', async (route) => {
    await lateGate;
    await route.continue();
  }), '?debug&standin&tier=low&title');
  await early.page.locator('#startAventyr').click();
  check('a start pressed while loading waits on its button with the ghost, under the title', (await early.state()).title && !(await early.state()).bootReady
    && await early.page.locator('#title.waiting #startAventyr.pressed .waiting-ghost').count() === 1);
  releaseLate();
  await until(early.state, (s) => s.bootReady && !s.title && !s.paused, 'the kept start begins once the models are in', 60000);
  check('the kept press starts the game on the style it chose', (await early.state()).style === 'aventyr');
  assert.deepEqual(early.errors, []);
  await early.context.close();

  const game = await open();
  await until(game.state, (s) => s.bootReady && s.steps > 0, 'boot ready', 60000);
  await game.page.keyboard.down('ArrowRight');
  await until(game.state, (s) => s.candy > 0, 'collect before loss');
  await game.page.keyboard.up('ArrowRight');
  await sleep(200);
  await until(game.info, (s) => s.sound, 'audio unlocked');
  for (let cycle = 0; cycle < 10; cycle++) {
    await game.page.keyboard.press('Escape');
    await until(game.state, (s) => s.paused, 'pause');
    await until(() => game.page.evaluate(() => window.__testAudio?.state), (state) => state === 'suspended', 'audio suspension');
    const before = await game.info();
    await game.page.keyboard.press('Tab');
    await sleep(80);
    check(`pause ${cycle + 1} silences music and effects`, !(await game.info()).sound && (await game.info()).soundsPlayed === before.soundsPlayed && (await game.info()).musicBars === before.musicBars);
    await game.page.keyboard.press('Escape');
    await until(game.state, (s) => !s.paused, 'resume');
    await until(game.info, (s) => s.sound, 'audio resumed');
  }
  // High owns HDR targets as well as meshes/textures; loss must restore those targets too.
  await game.page.keyboard.press('Escape');
  await settingsPage(game.page);
  await game.page.locator('#graphicsHigh').click();
  await until(game.info, (s) => s.tier === 'high', 'High before context loss');
  await game.page.locator('#pauseClose').click();
  await game.page.evaluate(() => {
    const gl = document.getElementById('game').getContext('webgl2');
    window.__loss = gl.getExtension('WEBGL_lose_context');
    if (!window.__loss) throw new Error('Context-loss extension unavailable');
    window.__loss.loseContext();
  });
  await game.page.getByRole('alertdialog').waitFor({ state: 'visible' });
  const lost = await game.state();
  const saved = await game.page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
  check('context loss pauses and saves collected candy', lost.paused && lost.contextLost && saved.candy[lost.course].length === lost.candy);
  check('context loss silences audio', !(await game.info()).sound);
  await game.page.keyboard.press('Escape');
  await sleep(180);
  assert.deepEqual(progress(await game.state()), progress(lost));
  check('context loss releases controls and freezes simulation', true);
  await game.page.evaluate(() => window.__loss.restoreContext());
  await until(game.state, (s) => !s.contextLost, 'GL restore', 30000);
  check('restored context waits for player confirmation', (await game.state()).paused && await game.page.getByRole('alertdialog').isVisible());
  assert.deepEqual(progress(await game.state()), progress(lost));
  await game.page.locator('#messageButton').click();
  await until(game.state, (s) => !s.paused && s.steps > lost.steps, 'same-game recovery');
  check('restoration keeps candy and checkpoint', (await game.state()).candy === lost.candy && (await game.state()).checkpoint === lost.checkpoint);
  check('restored GPU draws again', (await game.info()).drawCalls > 0);
  assert.deepEqual(game.errors, []);
  await game.context.close();
  console.log(`${checks} lifecycle browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
