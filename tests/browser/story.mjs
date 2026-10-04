// Required story interactions: real keyboard, touch and gamepad choices. Run after a build.
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
  console.log('story: sharing food and choosing a friend');
  {
    const { page, state, finish } = await open('sharing', { viewport: { width: 390, height: 844 }, hasTouch: true }, '?dev&debug&standin&tier=low&course=norrsken', () => {
      if (!localStorage.getItem('godisbus.v1.player.elof')) localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({
        v: 1, name: 'Elof', updated: 1, settings: { style: 'aventyr' }, chapter: 'norrsken', checkpoint: 1,
        candy: {}, placed: { norrsken: ['tragubbe'] }, flags: { norrsken: ['lower', 'crowberry', 'eyes', 'bag'] }, playMs: 0,
      }));
    });
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    const before = await state();
    check('Använd opens a choice without giving candy', !before.flags.some((flag) => flag.startsWith('share:')));
    await page.locator('[data-sweet="karamell"]').tap();
    check('candy can go to either carving but never the jay', await page.locator('[data-friend="jay"]').isDisabled() && await page.locator('[data-friend="tragubbe"]').isEnabled() && await page.locator('[data-friend="spoket"]').isEnabled());
    await page.locator('[data-friend="tragubbe"]').tap();
    await page.waitForSelector('#storyPanel', { state: 'hidden' });
    check('touch saves the selected sweet and its recipient without losing candy', (await state()).flags.includes('gift:tragubbe:karamell') && (await state()).candy === before.candy);
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    await page.focus('[data-sweet="lingon"]');
    await page.keyboard.press('Enter');
    check('the berry is offered only to the jay', await page.locator('[data-friend="spoket"]').isDisabled() && await page.locator('[data-friend="jay"]').isEnabled());
    await page.focus('[data-friend="jay"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#storyPanel', { state: 'hidden' });
    check('keyboard chooses the jay’s lingonberry', (await state()).flags.includes('gift:jay:lingon'));
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    await page.keyboard.press('Escape');
    check('backing out gives nothing and returns to the world', await page.locator('#storyPanel').isHidden() && !(await state()).flags.includes('share:spoket'));
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    await page.evaluate(installPad);
    await padPress(page, 15);
    await padPress(page, 15);
    await padPress(page, 0);
    check('gamepad A selects the candy under focus', await page.locator('[data-sweet="skumbanan"]').getAttribute('aria-pressed') === 'true');
    await padPress(page, 15);
    await padPress(page, 15);
    await padPress(page, 0);
    await until(state, (s) => s.flags.includes('shared'), 'all friends have their chosen food');
    check('all three choices unlock the golden candy', (await state()).flags.includes('gift:spoket:skumbanan'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('food choices are saved with the player', saved.flags.norrsken.includes('gift:tragubbe:karamell') && saved.flags.norrsken.includes('gift:jay:lingon') && saved.flags.norrsken.includes('gift:spoket:skumbanan'));
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.word === 'taste', 'golden candy becomes reachable');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('e');
    await until(state, (s) => s.flags.includes('taste'), 'the finale continues after the choice');
    check('the normal finale continues after sharing', (await state()).flags.includes('taste'));
    await finish();
  }
  console.log('story: painting starts the prologue');
  {
    const { page, state, finish } = await open('painting', {}, '?dev&debug&standin&tier=low&course=prolog', () => {
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1, settings: { style: 'aventyr' }, chapter: 'prolog', checkpoint: 0, candy: {}, placed: {}, flags: {}, playMs: 0 }));
    });
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.word === 'paintGhost', 'the brush becomes reachable');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    check('the brush waits for a gesture', !(await state()).flags.includes('eye'));
    const coords = await page.evaluate(() => {
      const svg = document.getElementById('strokePicture'), matrix = svg.getScreenCTM();
      return [{ x: 116, y: 64 }, { x: 123, y: 65 }].map((point) => { const p = svg.createSVGPoint(); p.x = point.x; p.y = point.y; const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
    });
    await page.mouse.move(coords[0].x, coords[0].y); await page.mouse.down(); await page.mouse.up();
    check('a tap alone has not painted an eye', !(await state()).flags.includes('eye'));
    await page.mouse.down(); await page.mouse.move(coords[1].x, coords[1].y, { steps: 3 }); await page.mouse.up();
    await until(state, (s) => s.flags.includes('eye'), 'Pappa finishes a short brush stroke');
    check('a short mouse stroke is finished with help', !(await state()).flags.includes('paint'));
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    await page.keyboard.press('Escape');
    check('back keeps the finished eye and leaves the other ready to paint', (await state()).flags.includes('eye') && !(await state()).flags.includes('paint'));
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    await page.evaluate(installPad);
    await padPress(page, 0);
    await until(state, (s) => s.flags.includes('paint'), 'gamepad paints with help');
    await until(state, (s) => s.flags.includes('blink'), 'the ghost blinks');
    check('gamepad painting releases the prologue chase', (await state()).flags.includes('blink'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('finished eyes persist with this player', saved.flags.prolog.includes('eye') && saved.flags.prolog.includes('paint'));
    await finish();
  }
  console.log(`Story browser tests: ${checked} checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
