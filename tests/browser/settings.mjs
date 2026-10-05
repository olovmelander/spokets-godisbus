// Player controls/settings integration checks. Run against a build, with the same Playwright as smoke.mjs.
// These exercise real DOM events, gamepad polling and touch capture; unit tests cover the input maths.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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
const progress = ({ x, y, steps, flags, candy, checkpoint, course }) => ({ x, y, steps, flags, candy, checkpoint, course });

// Each pulse spans rendered frames, so software rendering cannot miss a press between polls.
function installPad() {
  window.__testPad = {
    connected: true, mapping: 'standard', index: 0, id: 'browser test controller',
    axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
}
async function padPress(page, index) {
  await page.evaluate((i) => {
    window.__testPad.buttons[i] = { pressed: true, touched: true, value: 1 };
  }, index);
  await frames(page, 2);
  await page.evaluate((i) => {
    window.__testPad.buttons[i] = { pressed: false, touched: false, value: 0 };
  }, index);
  await frames(page, 2);
}
async function padFocus(page, id) {
  for (let n = 0; n < 35; n++) {
    if (await page.evaluate((target) => document.activeElement?.id === target, id)) return;
    await padPress(page, 13); // D-pad down
  }
  assert.fail(`Gamepad could not reach #${id}.`);
}

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  console.log('settings: saved graphics, live tier changes and keyboard menus');
  {
    const { page, state, info, finish } = await open('graphics', {}, '?debug&standin&tier=low');
    await until(info, (i) => i.models.includes('boot/big-candy'), 'checkpoint model loaded', 30000);
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.x > 2.5 && s.candy > 0, 'collect candy before changing graphics');
    await page.keyboard.up('ArrowRight');
    await until(state, (s) => s.vx === 0 && s.grounded, 'stop before opening settings');
    await page.keyboard.press('Escape');
    const before = progress(await state());
    await page.evaluate(() => { window.__settingsPageIdentity = 'same game'; });
    await page.check('#setFollowFinger');
    check('an unrelated checkbox does not save a temporary ?tier override', (await state()).settings.graphics === 'auto' && (new URL(page.url())).searchParams.get('tier') === 'low');
    await page.click('#graphicsLow');
    await until(info, (i) => i.tier === 'low', 'manual Low becomes active');
    await frames(page);
    assert.deepEqual(progress(await state()), before, 'Low preserves paused position, candy, flags and simulation');
    check('explicitly choosing the current tier saves it and removes ?tier', (await state()).settings.graphics === 'low' && !(new URL(page.url())).searchParams.has('tier'));
    await page.click('#graphicsHigh');
    await until(info, (i) => i.tier === 'high', 'manual High becomes active');
    await frames(page);
    assert.deepEqual(progress(await state()), before, 'High preserves the same game');
    check('Low ↔ High keeps the current game without reloading', await page.evaluate(() => window.__settingsPageIdentity === 'same game'));
    const programs = (await info()).programs;
    await page.click('#graphicsLow');
    await frames(page);
    await page.click('#graphicsHigh');
    await frames(page);
    check('repeated Low ↔ High changes compile no additional shaders', (await info()).programs === programs);
    await page.click('#styleLugnt');
    const chosen = await state();
    check('changing play style preserves Follow finger and graphics', chosen.settings.followFinger && chosen.settings.graphics === 'high');
    await page.focus('#setFollowFinger');
    await page.keyboard.press('Escape');
    check('Escape closes settings when a checkbox has focus', (await page.locator('#pause').isHidden()) && !(await state()).paused);
    await page.keyboard.press('g');
    check('G opens the pause panel on the test course', (await state()).paused && await page.locator('#pause').isVisible());
    await page.click('#graphicsAuto');
    check('Auto can be selected from settings', (await state()).settings.graphics === 'auto');
    await page.click('#graphicsLow');
    await page.reload();
    await ready(page);
    const restored = await state();
    check('graphics, Follow finger and collected candy survive reload', restored.settings.graphics === 'low' && restored.settings.followFinger && restored.candy === before.candy && (await info()).tier === 'low');
    // The album belongs to the story, so it is deliberately absent from the grey test course.
    await page.goto(`${origin}${BASE}?dev&debug&course=garden&standin&tier=low`);
    await ready(page);
    await page.keyboard.press('g');
    check('G opens and focuses the story album', (await state()).paused && await page.evaluate(() => document.activeElement?.id === 'pauseAlbum'));
    await page.keyboard.press('Escape');
    await page.click('#bag');
    check('the corner bag opens the same story album', (await state()).paused && await page.evaluate(() => document.activeElement?.id === 'pauseAlbum'));
    await finish();
  }

  console.log('settings: Follow finger on a phone, landscape and portrait');
  {
    const { page, context, state, finish } = await open('follow', { hasTouch: true, isMobile: true });
    await page.tap('#pauseBtn');
    await page.check('#setFollowFinger');
    await page.tap('#resumeBtn');
    const cdp = await context.newCDPSession(page);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    for (const portrait of [false, true]) {
      if (portrait) {
        await page.setViewportSize({ width: 390, height: 844 });
        await frames(page);
        check('rotation opens pause before changing handedness', (await state()).paused);
        await page.check('#setLefty');
        await page.tap('#resumeBtn');
      }
      const layout = portrait ? 'portrait, left-handed' : 'landscape';
      // Framing follows facing. After relayout it settles only once play resumes; choose a target
      // on the roomy side instead of clamping a rightward target onto Elof at the viewport edge.
      await frames(page, 30);
      const before = await state();
      const viewport = page.viewportSize();
      // Above the action buttons, on the actual game surface.
      const followDirection = before.playerScreen.x > viewport.width * 0.6 ? -1 : 1;
      const finger = { x: Math.max(28, Math.min(viewport.width - 28, before.playerScreen.x + followDirection * 115)), y: Math.max(100, before.playerScreen.y - 70), id: 1 };
      await touch('touchStart', [finger]);
      const walking = await until(state, (s) => (s.x - before.x) * followDirection > 0.45 && s.vx * followDirection > 0, `${layout}: follows held finger`);
      check(`${layout}: a held finger walks towards its position`, Math.abs(walking.vx) <= 1.3);
      const hop = await page.locator('#hopBtn').boundingBox();
      const jumping = { x: hop.x + hop.width / 2, y: hop.y + hop.height / 2, id: 2 };
      await touch('touchStart', [finger, jumping]);
      await until(state, (s) => !s.grounded && s.y > walking.y + 0.2, `${layout}: second finger jumps`);
      await touch('touchEnd', []);
      const stopped = await until(state, (s) => s.grounded && s.vx === 0, `${layout}: releasing fingers stops movement`);
      check(`${layout}: Hoppa works with a second finger and release stops movement`, stopped.device === 'touch');
      // A cancelled pointer must not keep moving after the operating system takes the gesture.
      const direction = stopped.playerScreen.x < 110 ? 1 : -1;
      const cancel = { x: Math.max(25, Math.min(viewport.width - 25, stopped.playerScreen.x + direction * 100)), y: Math.max(100, stopped.playerScreen.y - 70), id: 3 };
      await touch('touchStart', [cancel]);
      await until(state, (s) => s.vx * direction > 0.2, `${layout}: follow before cancel`);
      await touch('touchCancel', []);
      await until(state, (s) => s.vx === 0, `${layout}: cancel releases movement`);
      check(`${layout}: pointer cancellation releases Follow finger`, true);
      await page.tap('#bag');
      check(`${layout}: the bag remains tappable above the touch surface`, (await state()).paused && await page.locator('#pause').isVisible());
      await page.tap('#resumeBtn');
    }
    await finish();
  }

  console.log('settings: gamepad title, pause, reference and back');
  {
    const { page, state, finish } = await open('gamepad', {}, '?debug&standin&title&tier=low', installPad);
    await padPress(page, 0); // A: Börja
    check('gamepad A opens the first-start play styles', await page.locator('#firstAventyr').isVisible());
    await padPress(page, 15); // D-pad right: Lugnt
    check('gamepad D-pad changes menu focus', await page.evaluate(() => document.activeElement?.id === 'firstLugnt'));
    await padPress(page, 0);
    check('gamepad A starts the chosen style', !(await state()).paused && (await state()).style === 'lugnt');
    await padPress(page, 9); // Start
    check('gamepad Start pauses the game', (await state()).paused && await page.locator('#pause').isVisible());
    const still = progress(await state());
    await padFocus(page, 'setFollowFinger');
    await padPress(page, 0);
    check('gamepad A toggles a setting', (await state()).settings.followFinger);
    await padFocus(page, 'controlsReferenceBtn');
    await padPress(page, 0);
    check('gamepad opens the controls reference', await page.locator('#controlsReference').isVisible());
    for (const [key, expected] of [['Tab', 'pauseClose'], ['Tab', 'controlsBack'], ['Shift+Tab', 'pauseClose'], ['Shift+Tab', 'controlsBack']]) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => document.activeElement?.id), expected, `${key} stays in the visible controls reference`);
    }
    check('Tab and Shift+Tab stay inside the visible reference', true);
    await padPress(page, 1); // B: back one panel
    check('gamepad B returns to settings and remains paused', (await state()).paused && await page.locator('#controlsReference').isHidden());
    assert.deepEqual(progress(await state()), still, 'Menu navigation never advances the simulation');
    await padPress(page, 1);
    check('a second B resumes the game', !(await state()).paused && await page.locator('#pause').isHidden());
    await padPress(page, 8); // View: bag
    check('gamepad View opens the bag/pause panel', (await state()).paused && await page.locator('#pause').isVisible());
    await finish();
  }

  console.log('settings: chapter-end menus freeze play and save once');
  {
    const { page, state, finish } = await open('end', {}, '?debug&standin&tier=low', () => {
      const key = 'godisbus.v1.player.elof';
      // Start at an authored checkpoint on the flat final stretch, through the real save loader.
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        v: 1, name: 'Elof', updated: 1, chapter: 'testbana', checkpoint: 6,
        settings: { style: 'lugnt', graphics: 'low' }, candy: {}, placed: {}, flags: {}, playMs: 0,
      }));
      window.__saveWrites = 0;
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('godisbus.v1.player.')) window.__saveWrites++;
        return write.call(this, key, value);
      };
    });
    await page.evaluate(installPad);
    await page.keyboard.down('ArrowRight');
    // The chapter's coda plays before its last page.
    await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
    await page.keyboard.up('ArrowRight');
    const arrived = progress(await state());
    const writes = await page.evaluate(() => window.__saveWrites);
    await page.keyboard.down('ArrowLeft');
    await frames(page, 8);
    await page.keyboard.up('ArrowLeft');
    assert.deepEqual(progress(await state()), arrived, 'End card freezes simulation and ignores movement input');
    check('the end card stops gameplay and does not repeatedly save', (await state()).paused && writes > 0 && (await page.evaluate(() => window.__saveWrites)) === writes);
    await padPress(page, 1);
    check('B cannot resume underneath an end card', (await state()).paused && await page.locator('#endCard').isVisible());
    // A activates the focused Spela igen button; the page then restores the course's start.
    await page.evaluate(() => { window.__testPad.buttons[0] = { pressed: true, touched: true, value: 1 }; });
    await page.waitForFunction(() => window.__godis?.state().x < 2 && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
    check('gamepad A activates the end-card action', await page.locator('#endCard').isHidden());
    await finish();
  }

  console.log(`\nSettings browser tests: ${checked} checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
