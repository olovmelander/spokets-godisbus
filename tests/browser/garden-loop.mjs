// Real saved adventures and keyboard/touch controls: Moa waits, the completed bridge has a return
// pocket, and giving back the drawing remains optional. Build first; screenshots are ignored.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = '/spokets-godisbus/';
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const shots = fileURLToPath(new URL('../../docs/shots/_work/garden-loop/', import.meta.url));
mkdirSync(shots, { recursive: true });
assert.ok(existsSync(join(dist, 'index.html')), 'Run npm run build before the browser tests.');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(dist, normalize(path.slice(base.length) || 'index.html'));
  if (!path.startsWith(base) || !file.startsWith(dist) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checked = 0;
function check(name, condition) { assert.ok(condition, name); checked++; console.log(`  ok   ${name}`); }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function open(name, viewport, tier, touch, oldCalled = false) {
  const context = await browser.newContext({ viewport, hasTouch: touch });
  await context.addInitScript(({ oldCalled }) => {
    // A legacy profile exercises migration and real saves; reload never overwrites the newly saved state.
    if (localStorage.getItem('garden-loop-fixture')) return;
    localStorage.setItem('garden-loop-fixture', 'yes');
    localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({
      v: 1, name: 'Elof', chapter: 'garden', checkpoint: 10, settings: { style: 'lugnt', sound: false, music: false },
      updated: 1, playMs: 0, candy: { garden: [0, 30, 60] }, placed: { garden: ['curl', 'bridge'] },
      flags: { garden: ['memory', 'lost:clip', ...(oldCalled ? ['moa'] : [])] },
    }));
  }, { oldCalled });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('request', request => {
    if (!request.url().startsWith(origin) && !/^(data:|blob:)/.test(request.url())) external.push(request.url());
  });
  const state = () => page.evaluate(() => window.__godis.state());
  const info = () => page.evaluate(() => window.__godis.info());
  const ready = async () => {
    await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
    if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
    await page.waitForFunction(() => window.__godis.state().steps > 30 && window.__godis.state().grounded);
  };
  await page.goto(`${origin}${base}?dev&debug&standin&course=garden&tier=${tier}`);
  await ready();
  const programs = (await info()).programs;
  let maximumDraws = 0;
  // Software WebGL can advance fewer than 60 simulation steps per wall-clock second.
  async function until(accepts, label, timeout = 60000) {
    const end = Date.now() + timeout;
    let last;
    do {
      last = await state();
      maximumDraws = Math.max(maximumDraws, (await info()).drawCalls);
      if (accepts(last)) return last;
      await sleep(40);
    } while (Date.now() < end);
    assert.fail(`${name}: ${label}: ${JSON.stringify(last)}`);
  }
  const cdp = touch ? await context.newCDPSession(page) : null;
  const stickY = viewport.height - 100;
  async function hold(dir) {
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: stickY, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + dir * 65, y: stickY, id: 1 }] });
    } else await page.keyboard.down(dir > 0 ? 'ArrowRight' : 'ArrowLeft');
  }
  async function release() {
    if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else { await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowLeft'); }
  }
  async function move(dir, accepts, label) {
    await hold(dir);
    const result = await until(accepts, label);
    await release();
    await sleep(100);
    return result;
  }
  async function act() { if (touch) await page.locator('#actBtn').tap(); else await page.keyboard.press('KeyE'); }
  return { context, page, state, info, ready, until, move, act, programs, async finish() {
    check(`${name}: no shaders compiled during play`, (await info()).programs === programs);
    check(`${name}: bounded real renderer draws (${maximumDraws})`, maximumDraws > 0 && maximumDraws <= 120);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    assert.deepEqual(external, [], `${name}: external requests`);
    await context.close();
  } };
}

try {
  const cases = [
    { viewport: { width: 844, height: 390 }, tier: 'low', touch: false },
    { viewport: { width: 390, height: 844 }, tier: 'high', touch: false },
    { viewport: { width: 390, height: 844 }, tier: 'low', touch: true },
    { viewport: { width: 844, height: 390 }, tier: 'high', touch: true },
  ];
  for (const { viewport, tier, touch } of cases.filter(c => !process.env.GARDEN_LOOP_CASE || `${c.tier}-${c.touch ? 'touch' : 'keyboard'}` === process.env.GARDEN_LOOP_CASE)) {
    const name = `${viewport.width}-${tier}-${touch ? 'touch' : 'keyboard'}`;
    console.log(`garden return: ${name}`);
    const run = await open(name, viewport, tier, touch);
    const { page, state, move, act, until } = run;
    await move(1, s => s.word === 'callMoa', 'Moa call');
    await act();
    await until(s => s.flags.includes('moa'), 'call commits');
    await sleep(350);
    check(`${name}: calling offers a choice and keeps Elof in the garden`, (await state()).mode === 'free' && !(await state()).flags.includes('plane:board'));
    check(`${name}: the completed bridge opens the optional hose`, (await state()).flags.includes('garden:pocket-open'));
    await page.screenshot({ path: join(shots, `${name}-hub.png`) });
    await move(-1, s => s.verb === 'slide' && s.x > 140 && s.x < 143, 'return to the curl hose');
    await act();
    await until(s => s.mode === 'free' && s.grounded && s.y < -1.8 && s.flags.includes('garden:paper'), 'dry pocket and drawing');
    const pocket = await state();
    check(`${name}: the real return reaches a framed dry pocket`, pocket.bubbles === 0 && pocket.playerScreen && pocket.playerScreen.x > 0 && pocket.playerScreen.x < viewport.width && pocket.playerScreen.y > 0 && pocket.playerScreen.y < viewport.height);
    await page.screenshot({ path: join(shots, `${name}-pocket.png`) });
    await sleep(400);
    await move(1, s => s.mode === 'free' && s.grounded && s.y > 3.2 && s.x > 142.7, 'climb back without Hoppa');
    check(`${name}: climbing rejoins the completed bridge without a fall`, (await state()).bubbles === 0);
    await move(1, s => s.word === 'gardenGiveDrawing', 'return drawing to Moa');
    await act();
    await until(s => s.flags.includes('garden:shared-paper'), 'drawing thanks');
    check(`${name}: the family reward is optional and precedes departure`, (await state()).said.includes('garden:thanks') && !(await state()).flags.includes('plane:board'));
    await page.locator('#pauseBtn').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check(`${name}: saving preserves candy indices, checkpoint and lost property`, [0, 30, 60].every(i => saved.candy.garden.includes(i)) && saved.checkpoint === 10 && saved.flags.garden.includes('lost:clip') && saved.flags.garden.includes('garden:shared-paper'));
    await page.reload(); await run.ready();
    check(`${name}: the optional reward survives reload at the existing checkpoint`, (await state()).flags.includes('garden:shared-paper') && !(await state()).said.includes('garden:thanks') && (await state()).checkpoint === 10);
    await move(1, s => s.word === 'gardenBoard', 'boarding choice after reload');
    await page.screenshot({ path: join(shots, `${name}-board.png`) });
    await act();
    await until(s => s.mode === 'ride' && s.flags.includes('plane:board'), 'chosen departure');
    await until(s => s.mode === 'free' && s.grounded && s.x > 205, 'unchanged plane arrival');
    check(`${name}: the chosen flight reaches the forest without Hoppa or lost rewards`, (await state()).bubbles === 0 && (await state()).flags.includes('garden:shared-paper'));
    check(`${name}: real ${touch ? 'touch' : 'keyboard'} input was used`, (await state()).device === (touch ? 'touch' : 'keys'));
    await run.finish();
  }
  const legacy = await open('legacy-moa', { width: 844, height: 390 }, 'low', false, true);
  await legacy.move(1, s => s.word === 'gardenBoard', 'old called-Moa save boards directly');
  await legacy.page.screenshot({ path: join(shots, 'legacy-moa-board.png') });
  await legacy.act();
  await legacy.until(s => s.mode === 'ride', 'legacy flight');
  check('older Moa saves still board without finding the drawing', !(await legacy.state()).flags.includes('garden:paper') && (await legacy.state()).flags.includes('plane:board'));
  await legacy.page.locator('#pauseBtn').click();
  await legacy.page.reload(); await legacy.ready();
  await legacy.move(1, s => s.word === 'gardenBoard', 'interrupted flight can board again');
  await legacy.act();
  await legacy.until(s => s.mode === 'ride', 'restarted saved flight');
  check('saving in mid-flight retains Moa but safely restarts the boarding choice', (await legacy.state()).flags.includes('moa') && !(await legacy.state()).flags.includes('garden:paper'));
  await legacy.finish();
  console.log(`Garden departure/return browser checks: ${checked} passed.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
