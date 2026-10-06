// The real five-shelf cairn route, its earned return lace, pause and a legacy Lugnt restore. Build first.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { settingsPage } from './pause.mjs';

const BASE = '/spokets-godisbus/';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), DIST = join(ROOT, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.wasm': 'application/wasm' };
assert.ok(existsSync(join(DIST, 'index.html')), 'Run npm run build before the browser tests.');
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const shots = join(ROOT, 'docs/shots/_work/mountain-loop'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, accepts, name, timeout = 15000) {
  const end = Date.now() + timeout;
  let value;
  do { value = await read(); if (accepts(value)) return value; await sleep(20); } while (Date.now() < end);
  assert.fail(`${name}: timed out; last ${JSON.stringify(value)}`);
}
async function ready(page) {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
}
async function open(name, width, height, tier, start = { checkpoint: 4, flags: ['lift', 'memory'], style: 'aventyr' }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  // Start through the legacy save path. Debug spawn overrides intentionally never write a save.
  await context.addInitScript((start) => {
    if (!localStorage.getItem('godisbus.v1.player.elof')) localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({
      v: 1, name: 'Elof', updated: 1, chapter: 'berget', checkpoint: start.checkpoint,
      settings: { style: start.style }, candy: {}, placed: {}, flags: { berget: start.flags }, playMs: 0,
    }));
  }, start);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}${BASE}?dev&debug&standin&course=berget&tier=${tier}`); await ready(page);
  await page.addStyleTag({ content: '#debug { display: none; }' });
  if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
  if (await page.locator('#startAventyr').isVisible()) await page.locator('#startAventyr').click();
  const state = () => page.evaluate(() => window.__godis.state());
  const info = () => page.evaluate(() => window.__godis.info());
  await until(state, (s) => s.grounded && !s.paused && s.steps > 60, `${name}: ready`);
  return { page, context, state, info, async finish() { assert.deepEqual(errors, [], `${name}: browser errors`); await context.close(); } };
}
async function walk(page, state, x, name) {
  const start = await state(), direction = Math.sign(x - start.x), key = direction > 0 ? 'ArrowRight' : 'ArrowLeft';
  if (Math.abs(x - start.x) < 0.12) return;
  await page.keyboard.down('Shift'); await page.keyboard.down(key);
  await until(state, (s) => direction * (x - s.x) < 0.04, `${name}: walk to ${x}`, 10000);
  await page.keyboard.up(key); await page.keyboard.up('Shift');
  await until(state, (s) => s.grounded && Math.abs(s.vx) < 0.05, `${name}: settle at ${x}`);
}
async function slide(page, state, name) {
  await until(state, (s) => s.verb === 'slide', `${name}: slide offered`);
  check(`${name}: existing contextual control says Åk ner`, (await page.locator('#actBtn').innerText()).includes('Åk ner'));
  await page.keyboard.press('e');
  await until(state, (s) => s.mode === 'slide', `${name}: slide begins`);
  return until(state, (s) => s.mode === 'free' && s.grounded && Math.abs(s.y - 31.4) < 0.1, `${name}: return to pine`);
}

try {
  for (const [name, width, height, tier] of [['landscape', 844, 390, 'low'], ['portrait', 390, 844, 'high']]) {
    if (process.env.MOUNTAIN_CASE && process.env.MOUNTAIN_CASE !== name) continue;
    const { page, state, info, finish } = await open(name, width, height, tier);
    const initial = await info();
    check(`${name}: unearned return rope grants no prize on main path`, !(await state()).flags.includes('found:chokladpralin'));
    const shelves = [{ x: 152.3, y: 33.3, width: 1.6 }, { x: 149.5, y: 35.2, width: 1.6 }, { x: 152.3, y: 37.1, width: 1.6 }, { x: 149.5, y: 39, width: 1.6 }, { x: 146.9, y: 40.9, width: 1.9 }];
    for (const [i, target] of shelves.entries()) {
      const p = await state(), direction = Math.sign(target.x - p.x), previous = shelves[i - 1];
      const takeoff = previous ? previous.x + direction * (previous.width / 2 - 0.35) : target.x - direction * (target.width / 2 + 0.8);
      const key = direction > 0 ? 'ArrowRight' : 'ArrowLeft';
      await page.keyboard.down(key);
      await until(state, (s) => direction * (takeoff - s.x) <= 0, `${name}: takeoff ${i + 1}`);
      await page.keyboard.down('Space');
      await until(state, (s) => s.mode === 'ledge' || (s.grounded && Math.abs(s.y - target.y) < 0.1), `${name}: catch shelf ${i + 1}`);
      await page.keyboard.up('Space'); await page.keyboard.up(key);
      const landed = await until(state, (s) => s.grounded && Math.abs(s.y - target.y) < 0.1, `${name}: land shelf ${i + 1}`);
      check(`${name}: shelf ${i + 1} is reached by real held jump and ledge grab`, landed.bubbles === 0 && !landed.flags.includes('goal'));
      check(`${name}: shelf ${i + 1} frames Elof`, landed.playerScreen && landed.playerScreen.x > 20 && landed.playerScreen.x < width - 20 && landed.playerScreen.y > 20 && landed.playerScreen.y < height - 20);
      await walk(page, state, target.x, name);
    }
    const summit = await until(state, (s) => s.flags.includes('found:chokladpralin'), `${name}: summit reward`);
    check(`${name}: reward opens return without another Use flag`, summit.said.includes('cairn-loop') && summit.checkpoint === 4 && !summit.flags.includes('goal'));
    await until(() => page.locator('#bubbleLine').innerText(), (line) => line === 'Snöret runt röset. En väg ner!', `${name}: visible return objective`);
    check(`${name}: optional return objective is visible beside the earned route`, await page.locator('#bubble').isVisible());
    await picture(page, join(shots, `${name}-summit.png`));
    await page.keyboard.press('Escape');
    const paused = await state(); await sleep(350); const still = await state();
    check(`${name}: pause freezes earned route, player and story flags`, paused.paused && paused.steps === still.steps && paused.x === still.x && paused.y === still.y && JSON.stringify(paused.flags) === JSON.stringify(still.flags));
    await page.keyboard.press('Escape');
    // Choose the anchor beside the cairn. Its normal three-quarter-EL Use reach is intentionally spatial.
    await walk(page, state, 147.3, name);
    const returned = await slide(page, state, name);
    check(`${name}: short slide and one-EL landing are safe and retain the reward`, returned.bubbles === 0 && returned.flags.includes('found:chokladpralin') && Math.abs(returned.x - 147.6) < 0.1 && !returned.flags.includes('goal'));
    await picture(page, join(shots, `${name}-returned.png`));
    // The end hangs above ordinary walking height: a deliberate jump chooses the optional shortcut again.
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('Space');
    await until(state, (s) => s.mode === 'climb', `${name}: reuse hanging lace`);
    await page.keyboard.up('Space');
    const again = await until(state, (s) => s.grounded && Math.abs(s.y - 40.9) < 0.1, `${name}: climb back`, 60000);
    await page.keyboard.up('ArrowUp');
    check(`${name}: earned lace can be reused while keeping the prize and its one-time feedback`, again.flags.includes('lift') && again.flags.includes('found:chokladpralin') && again.said.filter((id) => id === 'cairn-loop').length === 1 && again.bubbles === 0);
    await slide(page, state, name);
    const finalInfo = await info();
    check(`${name}: shaders/textures stay warmed and draw calls remain bounded`, finalInfo.programs === initial.programs && finalInfo.textures === initial.textures && finalInfo.drawCalls <= 125);
    // Normal save and page reload resume at the existing pine checkpoint, with the earned route retained.
    await page.reload(); await ready(page);
    await page.addStyleTag({ content: '#debug { display: none; }' });
    if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
    const restored = await until(state, (s) => !s.paused && s.grounded && s.steps > 60, `${name}: restore`);
    check(`${name}: saved restore keeps the prize and original checkpoint`, restored.flags.includes('found:chokladpralin') && restored.checkpoint === 4 && Math.abs(restored.y - 31.4) < 0.1 && !restored.flags.includes('goal'));
    await finish();
  }

  if (!process.env.MOUNTAIN_CASE || process.env.MOUNTAIN_CASE === 'lugnt') {
    const { page, state, info, finish } = await open('Lugnt', 844, 390, 'low', { checkpoint: 3, flags: ['flight'], style: 'lugnt' });
    await page.keyboard.press('Escape'); await settingsPage(page); await page.locator('#styleLugnt').click(); await page.locator('#pauseClose').click();
    check('Lugnt: original lower-cliff restore still offers the existing lift', (await state()).style === 'lugnt');
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.word === 'lift', 'Lugnt: lift offered');
    await page.keyboard.up('ArrowRight'); await page.keyboard.press('e');
    await until(state, (s) => s.flags.includes('lift'), 'Lugnt: helps the actual ghost');
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.y > 31.3 && s.grounded, 'Lugnt: existing lace climb', 20000);
    await page.keyboard.up('ArrowRight');
    const lifted = await state();
    check('Lugnt: main cooperation needs no Hoppa and never grants optional prize', lifted.bubbles === 0 && lifted.blown === 0 && !lifted.flags.includes('found:chokladpralin'));
    await picture(page, join(shots, 'lugnt-main-lift.png'));
    check('Lugnt: main scene draw bound', (await info()).drawCalls <= 125);
    await finish();
  }
  console.log(`Mountain loop: ${checks} browser checks passed.`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
