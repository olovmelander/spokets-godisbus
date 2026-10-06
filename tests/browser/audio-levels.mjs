// Volume controls through the actual UI and Web Audio bus gains. This verifies routing, not the mix by ear.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { settingsPage } from './pause.mjs';
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
const check = (name, value) => { assert.ok(value, name); checked++; console.log(`  ok   ${name}`); };
const closeTo = (a, b) => Math.abs(a - b) < 1e-6;
function audioProbe() {
  window.__audioGains = [];
  window.__audioContexts = 0;
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    constructor(...args) { super(...args); window.__audioContexts++; }
    createGain() { const gain = super.createGain(); window.__audioGains.push(gain); return gain; }
  };
  window.__pad = { connected: true, mapping: 'standard', index: 0, id: 'test controller', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
  Object.defineProperty(navigator, 'getGamepads', { value: () => {
    // Each test press is one sampled tap. Three slow software-rendered frames can exceed the
    // menu's 380 ms repeat delay, so retaining a held button would navigate more than once.
    const pad = window.__pad;
    const sample = { ...pad, buttons: pad.buttons.map((button) => ({ ...button })) };
    pad.buttons = pad.buttons.map(() => ({ pressed: false, touched: false, value: 0 }));
    return [sample];
  } });
}
const frames = (page, left = 3) => page.evaluate((left) => new Promise((resolve) => {
  const step = () => { if (--left <= 0) resolve(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), left);
const ready = (page) => page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
const levels = (page) => page.evaluate(() => window.__godis.state().settings);
const gains = (page) => page.evaluate(() => window.__audioGains.slice(0, 4).map((node) => node.gain.value));
async function pad(page, button) {
  await page.evaluate((button) => { window.__pad.buttons[button] = { pressed: true, touched: true, value: 1 }; }, button);
  await frames(page);
  await page.evaluate((button) => { window.__pad.buttons[button] = { pressed: false, touched: false, value: 0 }; }, button);
  await frames(page);
}
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.addInitScript(audioProbe);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}${BASE}?dev&debug&standin&tier=low`);
  await ready(page);
  check('loading settings creates no AudioContext and does not bypass autoplay', await page.evaluate(() => window.__audioContexts === 0));
  await page.tap('#pauseBtn');
  await settingsPage(page);
  // Under the paper the tune and the air go on, ducked; give them their fifth of a second to settle.
  await page.waitForTimeout(400);
  const full = await gains(page);
  assert.equal(full.length, 4, 'the gesture builds master, effects, music and ambience buses');
  const musicBase = full[2];
  // The air is 6 dB down under a menu, and comes back with play (docs/ux-audit/style-and-sound.md row 21).
  const AIR = 0.5;
  check('under Pause the world is still and the tune and the air go on, quieter', await page.evaluate(() => window.__godis.info().audioMode) === 'menu' && closeTo(full[3], full[1] * AIR));
  const previews = () => page.evaluate(() => window.__godis.info().soundPreviews);
  const pip = (bus, n) => page.locator(`#${bus}Volume i`).nth(n - 1);
  // One row per sound (docs/ux-audit/menus.md row 8): five candy pips are the level, in fifths.
  await pip('effects', 4).tap();
  let value = await levels(page);
  let bus = await gains(page);
  check('a tap on the fourth pip sets effects and ambience together, leaving music unchanged', value.effectsVolume === 0.8 && closeTo(bus[1], 0.8) && closeTo(bus[3], 0.8 * AIR) && closeTo(bus[2], musicBase));
  check('the new level is heard at once, as one note, though the game sleeps', await previews() === 1 && await page.evaluate(() => window.__godis.state().paused));
  check('the pips show and say their level', await page.locator('#effectsVolume i.on').count() === 4 && await page.getAttribute('#effectsVolume', 'aria-valuetext') === '4 av 5' && await page.getAttribute('#effectsVolume', 'role') === 'slider');
  await page.focus('#musicVolume');
  await page.keyboard.press('ArrowLeft');
  value = await levels(page);
  bus = await gains(page);
  check('the arrow keys change the music level independently', value.musicVolume === 0.8 && closeTo(bus[2], musicBase * 0.8) && closeTo(bus[1], 0.8) && await previews() === 2);
  // The picture beside the pips mutes the sound and keeps its level.
  await page.uncheck('#setSound');
  await pip('effects', 3).tap();
  value = await levels(page);
  bus = await gains(page);
  check('changing a saved level while muted stays silent, and plays no note', !value.sound && value.effectsVolume === 0.6 && bus[1] === 0 && bus[3] === 0 && await previews() === 2);
  check('a muted sound shows its slash', await page.locator('#effectsRow').evaluate((row) => row.classList.contains('muted') && getComputedStyle(row.querySelector('.slash')).display !== 'none'));
  await page.check('#setSound');
  bus = await gains(page);
  check('unmuting restores the chosen effects level, and sounds it', closeTo(bus[1], 0.6) && closeTo(bus[3], 0.6 * AIR) && await previews() === 3);
  await page.uncheck('#setMusic');
  await page.focus('#musicVolume');
  await page.keyboard.press('ArrowLeft');
  check('music mute keeps its chosen level independently', !(await levels(page)).music && (await levels(page)).musicVolume === 0.6 && (await gains(page))[2] === 0);
  await page.check('#setMusic');
  check('unmuting music restores its own gain', closeTo((await gains(page))[2], musicBase * 0.6));
  // Every press in a menu sounds: a choice is Moa's crayon, a switch two plucks, the way back wood and paper.
  const uiSounds = () => page.evaluate(() => window.__godis.info().uiSounds);
  const pressed = await uiSounds();
  await page.tap('#styleLugnt');
  value = await levels(page);
  check('switching play style preserves both levels and mute choices', value.style === 'lugnt' && value.effectsVolume === 0.6 && value.musicVolume === 0.6 && value.sound && value.music);
  check('a choice in a menu sounds', await uiSounds() === pressed + 1);
  await page.tap('#setLefty');
  check('a switch sounds once', await uiSounds() === pressed + 2);
  await page.tap('#setLefty');

  // Real gamepad menu polling: down from the picture reaches the pips; left and right change the level.
  await page.focus('#setSound');
  await pad(page, 13);
  check('D-pad down reaches the effects pips', await page.evaluate(() => document.activeElement?.id === 'effectsVolume'));
  await pad(page, 14);
  check('the pad\'s left lowers the same persisted setting', (await levels(page)).effectsVolume === 0.4 && await page.evaluate(() => document.activeElement?.id === 'effectsVolume'));
  await pad(page, 15);
  check('and its right raises it', (await levels(page)).effectsVolume === 0.6);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  value = await levels(page);
  check('one pip is the least: the picture is the way to silence', value.effectsVolume === 0.2 && value.sound && closeTo((await gains(page))[1], 0.2));
  await page.focus('#musicVolume');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  check('the upper boundary is capped at full level', (await levels(page)).musicVolume === 1 && await page.locator('#musicVolume i.on').count() === 5);
  const row = await page.locator('#effectsRow').boundingBox();
  const fifth = await pip('effects', 5).boundingBox();
  check('the narrow phone layout keeps the pips and the picture within the panel', row.x + row.width <= 390 && fifth.x + fifth.width <= row.x + row.width && fifth.width >= 30 && (await page.locator('#effectsRow .mute').boundingBox()).width >= 64);
  // With Ljud off the UI is silent too.
  await page.uncheck('#setSound');
  const muted = await uiSounds();
  // A switch turned and turned back: a press that leaves the saved settings as they were.
  await page.tap('#setLefty');
  await page.tap('#setLefty');
  check('with Ljud off a press makes no sound', await uiSounds() === muted && !(await levels(page)).lefty);
  await page.check('#setSound');
  // Back in play the tune comes out from under the paper.
  await page.tap('#pauseClose');
  await page.waitForTimeout(400);
  bus = await gains(page);
  check('closing Pause lets the air and the tune out again', await page.evaluate(() => window.__godis.info().audioMode) === 'play' && closeTo(bus[3], bus[1]));
  await page.reload();
  await ready(page);
  value = await levels(page);
  check('reload restores levels and style without starting audio automatically', value.effectsVolume === 0.2 && value.musicVolume === 1 && value.style === 'lugnt' && await page.evaluate(() => window.__audioContexts === 0));
  await page.tap('#pauseBtn');
  check('the first gesture builds buses with the restored levels', closeTo((await gains(page))[1], 0.2));
  assert.deepEqual(errors, [], 'no browser exceptions during volume changes');
  await context.close();
  console.log(`Audio level browser checks: ${checked} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
