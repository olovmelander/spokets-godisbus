// Contextual taps and conditional prologue prompts through real mouse, touch and gamepad input. Build first.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
import { settingsPage } from './pause.mjs';

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

const query = (at, extra = '') => `?dev&debug&standin&course=prolog&tier=low&at=${at}${extra}`;
/** Shrunk, with the family kneeling: Pappa's hand is offered. */
const HAND = 'scene:morgon,eye,paint,woke,grab,blink,scene:vaknar,mamma:noticed,mamma:passed,bag:torn,star,scene:poff,scene:familj';
const screen = (page, x, y) => page.evaluate(at => window.__godis.screen(at), { x, y });
const shots = fileURLToPath(new URL('../../docs/shots/_work/', import.meta.url));
mkdirSync(shots, { recursive: true });
async function shown(page, lesson) {
  await page.waitForFunction(want => {
    const panel = document.getElementById('tutorial');
    return !panel.hidden && panel.dataset.lesson === want;
  }, lesson, { timeout: 10000 });
}
function installPad() {
  window.__testPad = { connected: true, mapping: 'standard', index: 0, id: 'tutorial controller', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
}
async function padPress(page, index) {
  await page.evaluate(i => { window.__testPad.buttons[i] = { pressed: true, touched: true, value: 1 }; }, index);
  await frames(page, 2);
  await page.evaluate(i => { window.__testPad.buttons[i] = { pressed: false, touched: false, value: 0 }; }, index);
  await frames(page, 2);
}

function slowFrames() {
  const request = window.requestAnimationFrame.bind(window);
  let delayedAt = -1;
  window.requestAnimationFrame = (callback) => request((time) => {
    if (time !== delayedAt) {
      delayedAt = time;
      const end = performance.now() + 150;
      while (performance.now() < end) {} // One work stall per frame, as on overloaded software rendering.
    }
    callback(time);
  });
}

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  console.log('pointing: reactions, nearby candy and bounded approaches');
  for (const [tier, slow] of [['low', false], ['high', false], ['high', true]]) {
    const name = `reactions-${tier}${slow ? '-slow' : ''}`;
    console.log(`  ${tier}${slow ? ' with 150 ms frame stalls' : ''}`);
    const { page, state, info, finish } = await open(name, {}, query('34.5,0.01', '&flags=blink').replace('tier=low', `tier=${tier}`), slow ? slowFrames : undefined);
    await until(state, s => s.grounded && s.steps > 50, 'still on the veranda');
    const before = await state();
    const programs = (await info()).programs;
    await page.mouse.click(before.playerScreen.x, before.playerScreen.y);
    await until(state, s => s.pointing.last === 'player', 'tap Elof');
    check('Elof reacts without changing progress', (await state()).x === before.x && !(await state()).flags.includes('star'));
    const candy = await screen(page, 36.4, 0.45);
    assert.ok(candy, 'near candy is framed');
    await page.mouse.click(candy.x, candy.y);
    await until(state, s => s.pointing.last === 'candy', 'tap candy');
    await until(state, s => s.candy > before.candy && !s.pointing.walking && s.vx === 0, 'ordinary walking collects the candy');
    check('near candy gives one short safe stroll and stops', (await state()).x < 36.5 && (await state()).bubbles === 0);
    const star = await screen(page, 41.7, -0.2);
    assert.ok(star, 'far star is framed');
    const where = (await state()).x;
    await page.mouse.click(star.x, star.y);
    await until(state, s => s.pointing.last === 'spot', 'far star only reacts');
    await frames(page, 10);
    check('a distant star never starts its action or approaches a drop', !(await state()).flags.includes('star') && (await state()).x === where && !(await state()).pointing.walking);
    check('reactions add no shaders and stay within the draw-call budget', (await info()).programs === programs && withinDraws((await info()).drawCalls, (await info()).tier));
    await finish();
  }

  console.log('pointing: actual touch actions in both orientations and follow-finger gesture safety');
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    const name = `tap-${viewport.width}`;
    // The star is taken by running into it; the action offered here is Pappa's open hand (*Kliv upp*).
    const { page, context, state, finish } = await open(name, { viewport, hasTouch: true, isMobile: true }, query('40.6,-0.79', `&flags=${HAND}`));
    await until(state, s => s.grounded && s.verb === 'take' && s.steps > 30, 'near the hand');
    await page.tap('#pauseBtn');
    await settingsPage(page);
    await page.check('#setFollowFinger');
    if (viewport.width === 390) await page.check('#setLefty');
    await page.tap('#pauseClose');
    const cdp = await context.newCDPSession(page);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    // Where the game offers the hand's action: over the hand, clear of Elof himself (Sim.actionAt).
    const hand = await screen(page, 40.9, 0.7);
    assert.ok(hand, `${name}: the hand is framed`);
    const finger = { ...hand, id: 1 };
    await touch('touchStart', [finger]);
    await touch('touchMove', [{ ...finger, x: finger.x + 24 }]);
    await touch('touchMove', [finger]);
    await touch('touchEnd', []);
    await frames(page, 3);
    check(`${name}: a drag out and back never becomes an action`, !(await state()).flags.includes('hand'));
    await touch('touchStart', [finger]);
    await touch('touchCancel', []);
    await frames(page, 3);
    check(`${name}: a cancelled finger never acts`, !(await state()).flags.includes('hand'));
    const at = await screen(page, 40.9, 0.7);
    await page.touchscreen.tap(at.x, at.y);
    await until(state, s => s.flags.includes('hand'), `${name}: near hand touch`);
    check(`${name}: a quick near-target tap uses the offered action`, (await state()).pointing.last === 'use' && (await state()).flags.includes('hand'));
    await finish();
  }

  console.log('tutorial: one idle prompt, discovered controls disappear, pause and reduced motion');
  {
    // After the morning's scene: nothing is taught while a scene holds him.
    const { page, state, finish } = await open('move lesson', { reducedMotion: 'reduce' }, query('1,0.01', '&flags=scene:morgon'));
    const initial = await state();
    check('movement prompt starts hidden', await page.locator('#tutorial').isHidden());
    await shown(page, 'move');
    check('the idle prompt never moves Elof or changes story flags', (await state()).x === initial.x && (await state()).flags.length === initial.flags.length);
    check('keyboard movement cue is the two arrow keys, drawn, and has accessible text', (await page.locator('#tutorialKey use').evaluateAll((uses) => uses.map((use) => use.getAttribute('href')).join(' '))) === '#i-key-left #i-key-right' && (await page.locator('#tutorial').getAttribute('aria-label')).length > 0);
    check('reduced motion stops the hand animation', await page.locator('.tutorial-hand').evaluate(el => getComputedStyle(el).animationName === 'none'));
    await picture(page, join(shots, 'tutorial-move-keys.png'));
    await page.keyboard.press('Escape');
    await frames(page);
    check('pause hides the prompt', await page.locator('#tutorial').isHidden());
    await page.keyboard.press('Escape');
    await shown(page, 'move');
    await page.keyboard.down('ArrowRight');
    await until(state, s => s.x > initial.x + 0.4, 'discover movement');
    await page.keyboard.up('ArrowRight');
    check('the movement cue disappears as soon as movement is discovered', await page.locator('#tutorial').isHidden());
    await finish();
  }
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    const name = `tutorial-touch-${viewport.width}`;
    // In the hall the chase is on, and Hoppa has come in (first-minutes.md row 8).
    const { page, state, finish } = await open(name, { viewport, hasTouch: true, isMobile: true }, query('29.4,0.01', '&flags=blink,bag:torn'));
    // A harmless surface tap selects touch without discovering either movement or jump.
    await page.touchscreen.tap(15, viewport.height / 2);
    await shown(page, 'hop');
    const hint = await page.locator('#tutorial').boundingBox();
    const button = await page.locator('#hopBtn').boundingBox();
    check(`${name}: the one hand points at Hoppa inside the viewport`, Math.abs(hint.x + hint.width / 2 - button.x - button.width / 2) < 2 && hint.y >= 0 && hint.y + hint.height <= viewport.height);
    check(`${name}: the tutorial stays wordless on touch`, await page.locator('#tutorialKey').evaluate(el => getComputedStyle(el).display === 'none'));
    await picture(page, join(shots, `${name}-hop.png`));
    await page.tap('#hopBtn');
    await until(state, s => s.y > 0.3 && !s.grounded, 'Hoppa responds normally');
    check(`${name}: jumping dismisses the learned cue`, await page.locator('#tutorial').isHidden());
    await page.goto(`${origin}${BASE}${query('40.6,-0.79', `&flags=${HAND}`)}`);
    await ready(page);
    await page.touchscreen.tap(15, viewport.height / 2);
    await shown(page, 'act');
    const useHint = await page.locator('#tutorial').boundingBox();
    const use = await page.locator('#actBtn').boundingBox();
    check(`${name}: the next idle cue points only at Använd`, Math.abs(useHint.x + useHint.width / 2 - use.x - use.width / 2) < 2 && !(await state()).flags.includes('hand'));
    await page.tap('#actBtn');
    await until(state, s => s.flags.includes('hand'), 'Använd responds normally');
    check(`${name}: the prompt never blocks the real button`, await page.locator('#tutorial').isHidden());
    await finish();
  }
  {
    const { page, state, finish } = await open('gamepad lesson', {}, query('29.4,0.01', '&flags=blink'), installPad);
    await padPress(page, 2); // X selects the pad, without moving or discovering Hoppa here.
    await shown(page, 'hop');
    check('gamepad cue shows A for Hoppa', (await state()).device === 'pad' && (await page.locator('#tutorialKey').innerText()) === 'A');
    await padPress(page, 0);
    await until(state, s => !s.grounded && s.y > 0.2, 'gamepad A jumps');
    check('gamepad input discovers and hides the same lesson', await page.locator('#tutorial').isHidden());
    await finish();
  }
  {
    const { page, state, finish } = await open('mirrored follow lesson', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, query('1,0.01'));
    await page.tap('#pauseBtn');
    await settingsPage(page);
    await page.check('#setFollowFinger');
    await page.check('#setLefty');
    await page.check('#setCalm');
    await page.tap('#pauseClose');
    await shown(page, 'move');
    const hint = await page.locator('#tutorial').boundingBox();
    check('mirrored Follow finger still teaches moving right into the story', hint.x + hint.width / 2 > (await state()).playerScreen.x && hint.x + hint.width <= 390);
    check('Lugna animationer stops the follow gesture cue', await page.locator('.tutorial-hand').evaluate(el => getComputedStyle(el).animationName === 'none'));
    await picture(page, join(shots, 'tutorial-follow-lefty.png'));
    await finish();
  }
  console.log(`pointing/tutorial: ${checked} checks passed`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
