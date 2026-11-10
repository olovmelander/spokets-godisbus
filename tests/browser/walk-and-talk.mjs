// Actual production game, real keyboard/touch inputs and UI. No scene or simulation is replaced.
// A controlled 60 Hz RAF makes reading/Pause deadlines deterministic; intermediate GPU draws are sampled.
// This checks input, dialogue and staging contracts, not native frame-rate performance.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const base = '/spokets-godisbus/';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.webp':'image/webp', '.woff2':'font/woff2' };
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the game before running walk-and-talk.');
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = resolve(dist, path.slice(base.length) || 'index.html');
  if (!path.startsWith(base) || !file.startsWith(resolve(dist) + sep) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type':mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args:['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const layoutFailures = [];
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
const state = page => page.evaluate(() => window.__godis.state());
const text = page => page.locator('#bubbleLine').textContent();
const advance = (page, seconds) => page.evaluate(count => { for (let i = 0; i < count; i++) window.walkTalkClock.tick(1 / 60); }, Math.ceil(seconds * 60 - 1e-6));
async function until(page, accepts, label, seconds = 80) {
  for (let i = 0; i < seconds * 10; i++) {
    const current = await state(page);
    if (await accepts(current)) return current;
    await advance(page, .1);
  }
  assert.fail(`${label}: ${JSON.stringify(await state(page))}`);
}
async function open(width, height, course, at, flags = []) {
  const page = await browser.newPage({ viewport:{ width, height }, hasTouch:true, reducedMotion:'reduce', serviceWorkers:'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(course => {
    localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v:1, name:'Elof', chapter:course, checkpoint:-1,
      settings:{ style:'aventyr', sound:false, music:false, bigText:true, calm:true, followFinger:false },
      updated:1, playMs:0, candy:{}, placed:{}, flags:{} }));
    let now = performance.now(), sequence = 0, drawn = 0, elapsed = 0, queue = new Map(), last = '';
    const lines = [];
    for (const kind of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const proto = window[kind]?.prototype, draw = proto?.[name];
        if (draw) proto[name] = function (...args) { if (window.walkTalkDraw !== false) return draw.apply(this, args); };
      }
    }
    window.requestAnimationFrame = callback => { queue.set(++sequence, callback); return sequence; };
    window.cancelAnimationFrame = id => queue.delete(id);
    window.walkTalkClock = {
      tick(dt) {
        window.walkTalkDraw = dt === 0 || ++drawn < 12 || drawn % 12 === 0;
        now += dt * 1000;
        if (!window.__godis?.state().paused) elapsed += dt;
        const callbacks = [...queue.values()]; queue.clear();
        for (const callback of callbacks) callback(now);
        window.walkTalkDraw = true;
        const bubble = document.getElementById('bubble'), node = document.getElementById('bubbleLine');
        const value = bubble && !bubble.hidden ? node.textContent.trim() : '';
        if (value !== last) { if (value) lines.push({ text:value, at:elapsed }); last = value; }
      },
      lines,
      reset() { lines.length = 0; last = ''; elapsed = 0; },
    };
  }, course);
  const query = new URLSearchParams({ dev:'', debug:'', standin:'', tier:'low', course, at, flags:flags.join(',') });
  await page.goto(`${origin}${base}?${query}`);
  for (let i = 0; i < 1200; i++) {
    await advance(page, .05);
    if (await page.evaluate(() => window.__godis?.state().bootReady && document.getElementById('loading').classList.contains('done'))) break;
    await page.waitForTimeout(25);
  }
  check(`${width}x${height} ${course}: production game starts`, (await state(page)).bootReady);
  await page.evaluate(() => window.walkTalkClock.reset());
  return { page, errors };
}
async function touchControls(page) {
  const cdp = await page.context().newCDPSession(page);
  const zone = await page.locator('#stickZone').boundingBox(), hop = await page.locator('#hopBtn').boundingBox();
  assert.ok(zone && hop, 'touch controls are present');
  const origin = { x:zone.x + Math.min(60, zone.width / 3), y:zone.y + zone.height * .7 };
  const stick = { id:1, x:origin.x + 60, y:origin.y, radiusX:3, radiusY:3, force:1 };
  const jump = { id:2, x:hop.x + hop.width / 2, y:hop.y + hop.height / 2, radiusX:3, radiusY:3, force:1 };
  return {
    async right() {
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ ...stick, x:origin.x }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[stick] });
    },
    async hop(on) { await cdp.send('Input.dispatchTouchEvent', { type:on ? 'touchStart' : 'touchEnd', touchPoints:on ? [jump] : [] }); },
    async release() { await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); },
    async close() { await cdp.detach(); },
  };
}

try {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const label = `${width}x${height}`, touch = width === 390;
    const route = await open(width, height, 'olympia', '7.5,.01', ['scene:card']);
    const page = route.page, controls = touch ? await touchControls(page) : null;
    if (controls) await controls.right(); else await page.keyboard.down('ArrowRight');
    await until(page, async () => (await text(page)) === 'Olympia! Hela planen är mörk.', 'first ordinary line', 5);
    const first = await state(page), words = await text(page);
    await until(page, s => s.x >= 13.2, 'walk through queued route dialogue', 4);
    const queued = await state(page);
    // Later hints are due but stay in the simulation queue until this line's receipt.
    // Crossing their triggers continuously catches the old backlog movement hold.
    check(`${label}: held movement crosses all three hints without a backlog stop`, queued.steps > first.steps && queued.x >= 13.2 && queued.pendingDialogue.includes('ol:arrive') && await text(page) === words && !queued.held && !queued.storyReading);
    check(`${label}: ordinary dialogue does not cover play with a Continue control`, await page.locator('#sceneReading').isHidden());
    if (controls) await controls.release(); else await page.keyboard.up('ArrowRight');
    // Separate complete touch gestures: ending one contact in a CDP multi-touch
    // gesture can also cancel the captured joystick pointer in Chromium.
    if (controls) await controls.hop(true); else await page.keyboard.down('Space');
    await advance(page, .2);
    const jumped = await state(page);
    check(`${label}: ${touch ? 'touch' : 'keyboard'} jump works while the full line stays visible`, jumped.y > queued.y + .15 && await text(page) === words);
    if (controls) await controls.hop(false); else await page.keyboard.up('Space');
    const layout = await page.evaluate(() => {
      const rect = document.getElementById('bubble').getBoundingClientRect();
      const controls = ['stickBase', 'hopBtn', 'actBtn'].map(id => document.getElementById(id).getBoundingClientRect());
      return { bubble:rect.toJSON(), controls:controls.map(r => r.toJSON()), width:innerWidth,
        pageWidth:document.documentElement.scrollWidth, bigText:document.body.classList.contains('big-text'),
        clear:controls.every(r => rect.bottom <= r.top || rect.top >= r.bottom || rect.right <= r.left || rect.left >= r.right) };
    });
    const fits = layout.bubble.width > 0 && layout.bubble.height > 0 && layout.bubble.left >= 0 && layout.bubble.right <= layout.width
      && layout.pageWidth <= layout.width && layout.bigText && layout.clear;
    // Report every viewport before failing, so a layout regression does not hide the input/staging result.
    if (!fits) { layoutFailures.push({ viewport:label, ...layout }); console.error(`  layout failure ${label}: ${JSON.stringify(layout)}`); }
    else check(`${label}: the visible big-text line fits and leaves play controls clear`, fits);
    await page.locator('#pauseBtn').click({ force:true });
    await advance(page, .05);
    const paused = await state(page), pausedWords = await text(page);
    await advance(page, 20);
    const still = await state(page);
    check(`${label}: real Pause freezes movement, pending speech and the current complete line`, paused.paused && still.steps === paused.steps && still.x === paused.x && still.y === paused.y && JSON.stringify(still.pendingDialogue) === JSON.stringify(paused.pendingDialogue) && await text(page) === pausedWords);
    await page.locator('#resumeBtn').click({ force:true });
    await advance(page, .1);
    check(`${label}: resume keeps the unfinished line instead of expiring it during Pause`, await text(page) === words);
    await until(page, s => ['ol:arrive', 'ol:klonk', 'ol:lights'].every(id => s.said.includes(id) && !s.pendingDialogue.includes(id)), 'all route words complete automatically', 40);
    const lines = await page.evaluate(() => window.walkTalkClock.lines);
    assert.deepEqual(lines.map(line => line.text), ['Olympia! Hela planen är mörk.', 'Klonk!', 'Inte ens strålkastarna lyser!'], `${label}: every full line is shown once, in order, without a Continue click`); checks++;
    check(`${label}: queued replies keep their own readable display time`, lines[1].at - lines[0].at >= 3 && lines[2].at - lines[1].at >= 2.5);
    if (controls) await controls.right(); else await page.keyboard.down('ArrowRight');
    await until(page, s => s.x >= 21.6, 'reach the formerly mandatory wind remark', 5);
    if (controls) await controls.release(); else await page.keyboard.up('ArrowRight');
    await until(page, async () => (await text(page)) === 'Vinden rullar bollar efter oss!', 'the complete legacy read:true world line', 35);
    const wind = await state(page);
    if (controls) await controls.right(); else await page.keyboard.down('ArrowRight');
    await advance(page, .4);
    if (controls) await controls.release(); else await page.keyboard.up('ArrowRight');
    const walkingWind = await state(page);
    check(`${label}: a formerly mandatory world line now permits movement without Continue`, walkingWind.x > wind.x + .25
      && !walkingWind.held && !walkingWind.storyReading && await page.locator('#sceneReading').isHidden()
      && await text(page) === 'Vinden rullar bollar efter oss!');
    await controls?.close(); assert.deepEqual(route.errors, []); await page.close();

    const staged = await open(width, height, 'stormkvall', '2.6,.01');
    await until(staged.page, async s => s.scene?.id === 'kvall' && (await text(staged.page)) === 'Strömmen gick! Jag tänder ljusen.', 'protected opening line', 10);
    const held = await state(staged.page);
    await staged.page.keyboard.down('ArrowRight'); await staged.page.keyboard.down('Space');
    await advance(staged.page, .5);
    const protectedPose = await state(staged.page);
    check(`${label}: a real staged candle scene still holds the actor despite movement/jump input`, held.held && protectedPose.held && protectedPose.x === held.x && protectedPose.y === held.y && (await text(staged.page)) === 'Strömmen gick! Jag tänder ljusen.');
    await staged.page.keyboard.up('Space'); await staged.page.keyboard.up('ArrowRight');
    await until(staged.page, s => s.flags.includes('scene:kvall'), 'protected scene automatically finishes all lines', 80);
    const stagedLines = await staged.page.evaluate(() => window.walkTalkClock.lines.map(line => line.text));
    assert.deepEqual(stagedLines, ['Strömmen gick! Jag tänder ljusen.', 'Var är ficklampan? Jag ser ingenting!', 'Huset knakar som ett skepp!', 'Jag hämtar skeppets ficklampa!'], `${label}: staged speech completes in order without one press per line`); checks++;
    const released = await state(staged.page);
    await staged.page.keyboard.down('ArrowRight'); await advance(staged.page, .4); await staged.page.keyboard.up('ArrowRight');
    check(`${label}: movement returns after the protected scene, without an extra dismiss`, (await state(staged.page)).x > released.x + .3 && !(await state(staged.page)).held);
    assert.deepEqual(staged.errors, []); await staged.page.close();
  }
  assert.deepEqual(layoutFailures, [], 'visible big-text lines fit both viewports and leave play controls clear');
  console.log(`Walk and talk: ${checks} browser checks passed.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
