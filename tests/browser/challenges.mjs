// Optional paths: browser framing, real controls, draw-call budget and stable shaders. Build first.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

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
const SHOTS = fileURLToPath(new URL('../../docs/shots/_work/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  if (!process.env.CHALLENGE || process.env.CHALLENGE === '2') for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    for (const tier of ['low', 'high']) {
      for (const stop of ['entry', 'prize']) {
        const at = stop === 'entry' ? '48,5.57' : '62,14.01';
        const name = `c2-${stop}-${viewport.width}-${tier}`;
        const { page, state, info, finish } = await open(name, { viewport }, `?dev&debug&standin&course=granskog&tier=${tier}&at=${at}`);
        if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
        const start = await until(state, s => s.steps > 90 && s.grounded, name);
        const drawn = await info();
        check(`${name}: draw-call budget`, drawn.drawCalls > 0 && withinDraws(drawn.drawCalls, drawn.tier));
        check(`${name}: player framed`, start.playerScreen && start.playerScreen.x > 30 && start.playerScreen.x < viewport.width - 30 && start.playerScreen.y > 35 && start.playerScreen.y < viewport.height - 30);
        for (const step of [1, 2, 3]) {
          await page.keyboard.press('h');
          await until(state, s => s.help.step === step, `${name}: hint ${step}`);
        }
        check(`${name}: all three hints`, (await state()).help.step === 3);
        await picture(page, join(SHOTS, `${name}.png`));
        if (stop === 'entry') {
          await page.keyboard.down('Space');
          await until(state, s => !s.grounded && s.vy > 0, `${name}: leaves moving platform`);
          await page.keyboard.up('Space');
          await until(state, s => s.grounded, `${name}: lands`);
          check(`${name}: a real jump returns safely`, (await state()).bubbles === 0);
        } else {
          check(`${name}: challenge candy commits`, (await state()).flags.includes('found:chokladkola'));
          await page.keyboard.down('ArrowRight');
          await until(state, s => s.verb === 'slide', `${name}: root offered`);
          await page.keyboard.up('ArrowRight');
          await page.keyboard.press('e');
          await until(state, s => s.mode === 'free' && s.y < 10.2, `${name}: root returns`);
          check(`${name}: safe return with reward`, (await state()).flags.includes('found:chokladkola') && (await state()).bubbles === 0);
        }
        check(`${name}: shaders stay warm`, (await info()).programs === drawn.programs);
        await finish();
      }
    }
  }
  if (!process.env.CHALLENGE || process.env.CHALLENGE === '3') for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    for (const tier of ['low', 'high']) {
      for (const stop of ['light', 'return'].filter(stop => !process.env.CHALLENGE_STOP || stop === process.env.CHALLENGE_STOP)) {
        const at = stop === 'light' ? '150,3.81' : '161.2,3.71';
        const flags = stop === 'light' ? 'light' : 'light,shy:1,shy:2,shy:3,found:lakritskonfekt';
        const name = `c3-${stop}-${viewport.width}-${tier}`;
        const { page, state, info, finish } = await open(name, { viewport }, `?dev&debug&standin&course=myren&tier=${tier}&at=${at}&flags=${flags}`);
        if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
        const start = await until(state, s => s.steps > 90 && s.grounded, name);
        const drawn = await info();
        check(`${name}: draw-call budget`, drawn.drawCalls > 0 && withinDraws(drawn.drawCalls, drawn.tier));
        check(`${name}: player framed`, start.playerScreen && start.playerScreen.x > 30 && start.playerScreen.x < viewport.width - 30 && start.playerScreen.y > 35 && start.playerScreen.y < viewport.height - 30);
        for (const step of [1, 2, 3]) {
          await page.keyboard.press('h');
          await until(state, s => s.help.step === step, `${name}: hint ${step}`);
        }
        check(`${name}: all three hints`, (await state()).help.step === 3);
        await picture(page, join(SHOTS, `${name}.png`));
        if (stop === 'light') {
          check(`${name}: only first light found`, start.flags.includes('shy:1') && !start.flags.includes('shy:2') && !start.flags.includes('found:lakritskonfekt'));
        } else {
          await page.keyboard.down('ArrowRight');
          await until(state, s => s.grounded && s.y < 0.2 && s.x > 163.4, `${name}: lower path reached`);
          await page.keyboard.up('ArrowRight');
          check(`${name}: safe return with reward and chick`, (await state()).flags.includes('found:lakritskonfekt') && (await state()).flags.includes('chick') && (await state()).bubbles === 0);
        }
        check(`${name}: shaders stay warm`, (await info()).programs === drawn.programs);
        await finish();
      }
    }
  }
  if (!process.env.CHALLENGE || process.env.CHALLENGE === '4') for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    for (const tier of ['low', 'high']) {
      for (const stop of ['entry', 'prize']) {
        const at = stop === 'entry' ? '152.3,33.31' : '146.9,40.91';
        const name = `c4-${stop}-${viewport.width}-${tier}`;
        const { page, state, info, finish } = await open(name, { viewport }, `?dev&debug&standin&course=berget&tier=${tier}&at=${at}&flags=lift,memory`);
        if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
        const start = await until(state, s => s.steps > 90 && s.grounded, name);
        const drawn = await info();
        check(`${name}: draw-call budget`, drawn.drawCalls > 0 && withinDraws(drawn.drawCalls, drawn.tier));
        check(`${name}: player framed`, start.playerScreen && start.playerScreen.x > 30 && start.playerScreen.x < viewport.width - 30 && start.playerScreen.y > 35 && start.playerScreen.y < viewport.height - 30);
        for (const step of [1, 2, 3]) {
          await page.keyboard.press('h');
          await until(state, s => s.help.step === step, `${name}: hint ${step}`);
        }
        check(`${name}: all three hints`, (await state()).help.step === 3);
        await picture(page, join(SHOTS, `${name}.png`));
        if (stop === 'entry') {
          await page.keyboard.down('ArrowLeft');
          await until(state, s => s.x < 151.86, `${name}: running takeoff`);
          await page.keyboard.down('Space');
          await until(state, s => s.grounded && s.y > 35.1, `${name}: next shelf reached`);
          await page.keyboard.up('Space');
          await page.keyboard.up('ArrowLeft');
          check(`${name}: jump and ledge grab work`, (await state()).bubbles === 0 && !(await state()).flags.includes('goal'));
        } else {
          check(`${name}: challenge candy commits`, start.flags.includes('found:chokladpralin'));
          check(`${name}: return hint uses the next lower shelf`, (await state()).help.at.x === 149.5 && (await state()).help.at.y === 39);
          await page.keyboard.down('ArrowRight');
          await until(state, s => s.grounded && Math.abs(s.y - 39) < 0.15, `${name}: first return shelf`);
          await page.keyboard.up('ArrowRight');
          check(`${name}: descending keeps prize and chapter open`, (await state()).flags.includes('found:chokladpralin') && !(await state()).flags.includes('goal') && (await state()).bubbles === 0);
        }
        check(`${name}: shaders stay warm`, (await info()).programs === drawn.programs);
        await finish();
      }
    }
  }
  console.log(`${checked} optional-path browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
