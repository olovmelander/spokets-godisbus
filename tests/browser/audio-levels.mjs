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
  const full = await gains(page);
  assert.equal(full.length, 4, 'the gesture builds master, effects, music and ambience buses');
  const musicBase = full[2];
  await page.tap('#effectsVolumeDown');
  await page.tap('#effectsVolumeDown');
  let value = await levels(page);
  let bus = await gains(page);
  check('touch changes effects and ambience together, leaving music unchanged', value.effectsVolume === 0.8 && closeTo(bus[1], 0.8) && closeTo(bus[3], 0.8) && closeTo(bus[2], musicBase));
  await page.focus('#musicVolumeDown');
  await page.keyboard.press('Enter');
  value = await levels(page);
  bus = await gains(page);
  check('keyboard changes music independently', value.musicVolume === 0.9 && closeTo(bus[2], musicBase * 0.9) && closeTo(bus[1], 0.8));
  await page.uncheck('#setSound');
  await page.tap('#effectsVolumeDown');
  value = await levels(page);
  bus = await gains(page);
  check('changing a saved level while muted stays silent', !value.sound && value.effectsVolume === 0.7 && bus[1] === 0 && bus[3] === 0);
  await page.check('#setSound');
  bus = await gains(page);
  check('unmuting restores the chosen effects level', closeTo(bus[1], 0.7) && closeTo(bus[3], 0.7));
  await page.uncheck('#setMusic');
  await page.tap('#musicVolumeDown');
  check('music mute keeps its chosen level independently', !(await levels(page)).music && (await levels(page)).musicVolume === 0.8 && (await gains(page))[2] === 0);
  await page.check('#setMusic');
  check('unmuting music restores its own gain', closeTo((await gains(page))[2], musicBase * 0.8));
  await page.tap('#styleLugnt');
  value = await levels(page);
  check('switching play style preserves both levels and mute choices', value.style === 'lugnt' && value.effectsVolume === 0.7 && value.musicVolume === 0.8 && value.sound && value.music);

  // Real gamepad menu polling: find the effects control using D-pad, then activate with A.
  await page.focus('#setSound');
  await pad(page, 13);
  check('D-pad reaches the effects volume control', await page.evaluate(() => document.activeElement?.id === 'effectsVolumeDown'));
  await pad(page, 0);
  check('gamepad A changes the same persisted setting', (await levels(page)).effectsVolume === 0.6);
  for (let i = 0; i < 6; i++) await page.tap('#effectsVolumeDown');
  value = await levels(page);
  check('zero is silent without toggling mute and the lower boundary is disabled', value.effectsVolume === 0 && value.sound && (await gains(page))[1] === 0 && await page.isDisabled('#effectsVolumeDown'));
  await page.tap('#effectsVolumeUp');
  check('a level above zero restores sound without changing its switch', (await levels(page)).effectsVolume === 0.1 && (await levels(page)).sound && closeTo((await gains(page))[1], 0.1));
  await page.tap('#musicVolumeUp');
  await page.tap('#musicVolumeUp');
  check('the upper boundary is capped at full level', (await levels(page)).musicVolume === 1 && await page.isDisabled('#musicVolumeUp'));
  const output = await page.locator('#effectsVolumeValue').textContent();
  check('the visible percentage and accessible button names match', output === '10 %' && await page.getByRole('button', { name: 'Sänk ljudvolymen' }).count() === 1);
  const button = await page.locator('#effectsVolumeUp').boundingBox();
  check('the narrow phone layout keeps a full touch target', button.width >= 44 && button.height >= 44 && button.x + button.width <= 390);
  await page.reload();
  await ready(page);
  value = await levels(page);
  check('reload restores levels and style without starting audio automatically', value.effectsVolume === 0.1 && value.musicVolume === 1 && value.style === 'lugnt' && await page.evaluate(() => window.__audioContexts === 0));
  await page.tap('#pauseBtn');
  check('the first gesture builds buses with the restored levels', closeTo((await gains(page))[1], 0.1));
  assert.deepEqual(errors, [], 'no browser exceptions during volume changes');
  await context.close();
  console.log(`Audio level browser checks: ${checked} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
