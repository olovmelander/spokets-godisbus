// Required story interactions: real keyboard, touch and gamepad choices. Run after a build.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { continueDialogue } from './dialogue.mjs';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};
assert.ok(existsSync(join(DIST, 'index.html')), 'Run npm run build before the browser tests.');
const filter = process.env.STORY_FILTER;
assert.ok(!filter || ['sharing', 'painting', 'carving', 'party'].includes(filter), 'STORY_FILTER must name a story case.');

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
    if (value.storyReading && read.page) await continueDialogue(read.page);
    await sleep(35);
  } while (Date.now() < end);
  assert.fail(`${name}: timed out; last value ${JSON.stringify(value)}`);
}
/** Wait for an authored scene while it advances, with a separate guard against a stuck scene. */
async function untilScene(read, accepts, name) {
  const started = Date.now(), absoluteLimit = 180000, inactivityLimit = 20000;
  let value, previous, advanced = started;
  do {
    value = await read();
    if (accepts(value)) return value;
    // Body motion and ordinary simulation steps do not count: the scene clock or its dialogue must advance.
    const progress = JSON.stringify([value.scene?.id, value.scene?.seconds, value.said, value.storyReading]);
    if (progress !== previous) { previous = progress; advanced = Date.now(); }
    assert.ok(Date.now() - advanced < inactivityLimit, `${name}: no scene/dialogue progress for 20 s; last value ${JSON.stringify(value)}`);
    if (value.storyReading && read.page) await continueDialogue(read.page);
    await sleep(35);
  } while (Date.now() - started < absoluteLimit);
  assert.fail(`${name}: exceeded the 180 s scene limit; last value ${JSON.stringify(value)}`);
}
/**
 * Runs him right until Använd offers `word`. Watching in the page's own RAF catches the first offered frame,
 * with room to release the key and stop. Holding Shift for the whole trip instead made long walks time out on
 * software-rendered CI: the fixed loop caps simulation steps per frame, so wall time is not walking time.
 */
async function reach(page, word, name, { key = 'ArrowRight', timeout = 40000 } = {}) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction((want) => window.__godis.state().word === want, word, { polling: 'raf', timeout });
  } catch {
    assert.fail(`${name}: timed out; last value ${JSON.stringify(await page.evaluate(() => window.__godis.state()))}`);
  } finally {
    await page.keyboard.up(key);
  }
  await frames(page);
  assert.equal(await page.evaluate(() => window.__godis.state().word), word, `${name}: still offered after stopping`);
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
  const state = Object.assign(() => page.evaluate(() => window.__godis.state()), { page });
  return {
    page, context,
    state,
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
async function padFocus(page, selector) {
  for (let n = 0; n < 35; n++) {
    if (await page.evaluate((target) => document.activeElement?.matches(target), selector)) return;
    await padPress(page, 13); // D-pad down
  }
  assert.fail(`Gamepad could not reach ${selector}.`);
}

async function drawStroke(page, points, touch = false) {
  const coords = await page.evaluate((path) => {
    const svg = document.getElementById('strokePicture'), matrix = svg.getScreenCTM();
    return path.map((point) => { const p = svg.createSVGPoint(); p.x = point.x; p.y = point.y; const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, points);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...coords[0], id: 1 }] });
    for (const point of coords.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(coords[0].x, coords[0].y); await page.mouse.down();
    for (const point of coords.slice(1)) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
}

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  if (!filter || filter === 'sharing') {
    console.log('story: sharing food and choosing a friend');
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
    await padFocus(page, '[data-sweet="skumbanan"]');
    await padPress(page, 0);
    check('gamepad A selects the candy under focus', await page.locator('[data-sweet="skumbanan"]').getAttribute('aria-pressed') === 'true');
    await padFocus(page, '[data-friend="spoket"]');
    await padPress(page, 0);
    await until(state, (s) => s.flags.includes('shared'), 'all friends have their chosen food');
    check('all three choices unlock the golden candy', (await state()).flags.includes('gift:spoket:skumbanan'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('food choices are saved with the player', saved.flags.norrsken.includes('gift:tragubbe:karamell') && saved.flags.norrsken.includes('gift:jay:lingon') && saved.flags.norrsken.includes('gift:spoket:skumbanan'));
    await page.keyboard.down('ArrowRight');
    // A walk of a few EL: in software rendering on a busy runner it has run past 12 s twice tonight (7 November).
    await until(state, (s) => s.word === 'taste', 'golden candy becomes reachable', 30000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('e');
    await until(state, (s) => s.flags.includes('taste'), 'the finale continues after the choice');
    check('the normal finale continues after sharing', (await state()).flags.includes('taste'));
    await finish();
  }
  if (!filter || filter === 'painting') {
    console.log('story: painting starts the prologue');
    const { page, state, finish } = await open('painting', {}, '?dev&debug&standin&tier=low&course=prolog', () => {
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1, settings: { style: 'aventyr' }, chapter: 'prolog', checkpoint: 0, candy: {}, placed: {}, flags: {}, playMs: 0 }));
    });
    // This resumed checkpoint is before the morning's trigger. Walk into the real scene before
    // reading it; the title's fresh-start staging does not run in this development fixture.
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.scene?.id === 'morgon' && s.held, 'walk into the morning scene', 40000);
    await page.keyboard.up('ArrowRight');
    await until(state, (s) => s.flags.includes('scene:morgon'), 'read the morning before walking', 120000);
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.word === 'paintGhost', 'the brush becomes reachable', 120000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('e');
    await page.waitForSelector('#storyPanel:not([hidden])');
    check('the brush waits for a gesture', !(await state()).flags.includes('eye'));
    const coords = await page.evaluate(() => {
      const svg = document.getElementById('strokePicture'), matrix = svg.getScreenCTM();
      return [{ x: 116, y: 64 }, { x: 123, y: 65 }].map((point) => { const p = svg.createSVGPoint(); p.x = point.x; p.y = point.y; const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
    });
    await page.mouse.move(coords[0].x, coords[0].y); await page.mouse.down();
    await page.mouse.move(coords[1].x, coords[1].y, { steps: 3 });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 450));
    check('focus loss discards an unfinished pointer stroke', !(await state()).flags.includes('eye'));
    await page.evaluate(() => { document.getElementById('strokeAssist').click(); window.dispatchEvent(new Event('blur')); });
    await new Promise((resolve) => setTimeout(resolve, 450));
    check('focus loss cancels a pending guided stroke completion', !(await state()).flags.includes('eye') && await page.locator('#storyPanel').isVisible());
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
    // The wake-up scene ends at 18 authored seconds; slow CI can still be making progress after 90 wall seconds.
    await untilScene(state, (s) => s.flags.includes('blink'), 'the ghost blinks');
    check('gamepad painting releases the prologue chase', (await state()).flags.includes('blink'));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('finished eyes persist with this player', saved.flags.prolog.includes('eye') && saved.flags.prolog.includes('paint'));
    await finish();
  }
  if (!filter || filter === 'carving') {
    console.log('story: carving safely with Pappa');
    const { page, state, finish } = await open('carving', { hasTouch: true }, '?dev&debug&standin&tier=low&course=epilog', () => {
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1, settings: { style: 'aventyr' }, chapter: 'epilog', checkpoint: 1, candy: {}, placed: {}, flags: { epilog: ['party:mamma', 'party:pappa', 'party:moa', 'party:bertil', 'party:spoket', 'partied', 'knife', 'knife:pappa', 'beat:partyThanks:mamma', 'beat:partyThanks:pappa', 'beat:partyThanks:moa', 'beat:partyThanks:bertil', 'beat:partyThanks:spoket', 'beat:klonk', 'beat:named', 'beat:away'] }, playMs: 0 }));
    });
    await reach(page, 'carve', 'the wood becomes reachable');
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    const outward = Array.from({ length: 13 }, (_, i) => ({ x: 100 + 144 * i / 12, y: 150 - 80 * i / 12 }));
    await drawStroke(page, [...outward].reverse(), true);
    check('a touch stroke towards the body does not start or award a cut', !(await state()).flags.includes('cut1') && await page.locator('#storyPanel').isVisible());
    await drawStroke(page, outward.slice(0, 4), true);
    check('a short stroke stays at the same carving step', !(await state()).flags.includes('cut1'));
    await picture(page, '/tmp/godisbus-carving.png');
    await drawStroke(page, outward, true);
    await until(state, (s) => s.flags.includes('cut1'), 'safe touch stroke cuts outwards');
    check('an outward touch stroke finishes the first cut', !(await state()).flags.includes('cut2'));
    // The next cut follows at once in the same panel, and a notch is cut for each one done (story-presentation.md row 18).
    check('the next cut follows in the same panel, with a notch for the first', await page.locator('#storyPanel').isVisible()
      && await page.locator('#carveNotch1.done').count() === 1 && await page.locator('#carveNotch2.done').count() === 0);
    await page.keyboard.press('Enter');
    await until(state, (s) => s.flags.includes('cut2'), 'keyboard guided carving');
    check('keyboard can take the next stroke with Pappa', !(await state()).flags.includes('cut3'));
    await page.evaluate(installPad); await padPress(page, 0);
    await until(state, (s) => s.flags.includes('cut3'), 'gamepad guided carving');
    check('gamepad completes the third safe stroke', (await state()).flags.includes('cut3'));
    await page.waitForFunction(() => document.getElementById('paintingPicture').getAttribute('visibility') === 'visible');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('strokeGuide').getAttribute('cx') === '204');
    check('the new figure needs both painted eyes', !(await state()).flags.includes('dots'));
    await page.keyboard.press('Enter'); await until(state, (s) => s.flags.includes('dots'), 'the new figure gets both eyes');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('three cuts and both eyes are saved', ['cut1', 'cut2', 'cut3', 'dots'].every((flag) => saved.flags.epilog.includes(flag)));
    await until(state, (s) => s.flags.includes('scene:first-carving'), 'Pappa admires the completed Lillgubben', 30000);
    // His carving goes up on Pappa's shelf, back along the room, before his teeth (Olov, 12 November 2026).
    await reach(page, 'putOnShelf', 'the shelf is reachable', { key: 'ArrowLeft', timeout: 90000 });
    await page.keyboard.press('e');
    await untilScene(state, (s) => s.flags.includes('scene:hyllan'), 'he puts his carving up on the shelf from the stool');
    check('his carving stands on the shelf before his teeth', (await state()).flags.includes('shelf:placed') && !(await state()).flags.includes('teeth'));
    await reach(page, 'brush', 'bathroom door is reachable', { timeout: 90000 });
    await page.keyboard.press('e');
    // Walking in, brushing and walking out take 11.6 authored seconds even when software frames are slow.
    await untilScene(state, (s) => s.flags.includes('goal'), 'the epilogue reaches bedtime after brushing');
    const finished = await state();
    check('the epilogue finishes only after brushing', finished.flags.includes('teeth') && finished.flags.includes('bedtime'));
    await finish();
  }
  if (!filter || filter === 'party') {
    console.log('story: family candy choices');
    const { page, state, finish } = await open('party', { hasTouch: true, viewport: { width: 390, height: 844 } }, '?dev&debug&standin&tier=low&course=epilog', () => {
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1, settings: { style: 'aventyr' }, chapter: 'epilog', checkpoint: 0, candy: {}, placed: {}, flags: { berget: ['note:1'] }, playMs: 0 }));
    });
    const readLine = async (id, words, ordinary = false, standing = false) => {
      await page.waitForFunction(({ id, words }) => window.__godis.state().said.includes(id) &&
        !document.getElementById('bubble').hidden && document.getElementById('bubbleLine').textContent === words,
      { id, words }, { timeout: 60000 });
      if (ordinary) check(`${id}: the complete line appears without mandatory Continue`,
        !(await state()).storyReading && await page.locator('#sceneNext').isHidden());
      // A thanks is said while he stands with the one he gave to (`tack:<friend>`, docs/dialogue.md): Continue is offered,
      // never needed, and the line finishes by itself below.
      if (standing) check(`${id}: said while he stands with the guest`, (await state()).held === true);
      // Do not attach read.page: this receipt must arrive automatically, without the general helper pressing Continue.
      await until(() => state(), s => s.said.includes(id) && !s.pendingDialogue.includes(id),
        `${id}: the visible line finishes`, 60000);
      // And then he is free to give the next sweet.
      if (standing) await until(state, (s) => !s.held, `${id}: free again after the thanks`, 10000);
    };
    const thankYou = {
      mamma: 'Tack, Elof! Vad gott med en godis.', pappa: 'Tack, Elof. Vad fint att du delar.',
      moa: 'Tack, lillebror! Den här tycker jag om.', bertil: 'Tack! Nu är det ett riktigt godiskalas.',
      spoket: 'Klonk, klonk!',
    };
    const thanks = friend => readLine(`partyThanks:${friend}`, thankYou[friend], false, true);
    await reach(page, 'giveMamma', 'first guest is reachable');
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    check('the family party offers three candies and five guests', await page.locator('[data-sweet]:visible').count() === 3 && await page.locator('[data-friend]:visible').count() === 5);
    await page.locator('[data-sweet="karamell"]').tap();
    check('every guest likes the selected candy', await page.locator('[data-friend]:visible:enabled').count() === 5);
    await picture(page, '/tmp/godisbus-party.png');
    await page.locator('[data-friend="bertil"]').tap(); await until(state, (s) => s.flags.includes('party:bertil'), 'touch choice for Bertil');
    check('a guest can be chosen before the nearby guest', !(await state()).flags.includes('party:mamma') && (await state()).flags.includes('party-gift:bertil:karamell'));
    await thanks('bertil');
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    await page.focus('[data-sweet="gelehallon"]'); await page.keyboard.press('Enter');
    await page.focus('[data-friend="mamma"]'); await page.keyboard.press('Enter'); await until(state, (s) => s.flags.includes('party:mamma'), 'keyboard choice for Mamma');
    await thanks('mamma');
    await reach(page, 'givePappa', 'next guest is reachable');
    await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
    await page.evaluate(installPad); await padFocus(page, '[data-sweet="skumbanan"]'); await padPress(page, 0);
    await padFocus(page, '[data-friend="moa"]'); await padPress(page, 0); await until(state, (s) => s.flags.includes('party:moa'), 'gamepad choice for Moa');
    check('the controller chooses a different candy for Moa', (await state()).flags.includes('party-gift:moa:skumbanan'));
    await thanks('moa');
    for (const [friend, sweet] of [['spoket', 'karamell'], ['pappa', 'gelehallon']]) {
      await page.keyboard.press('e'); await page.waitForSelector('#storyPanel:not([hidden])');
      await page.locator(`[data-sweet="${sweet}"]`).tap(); await page.locator(`[data-friend="${friend}"]`).tap();
      await until(state, (s) => s.flags.includes(`party:${friend}`), `choice for ${friend}`);
      await thanks(friend);
    }
    // Queueing is not completion. Observe each full line and bound its automatic receipt separately,
    // so the protected table scene's explanation and naming finish before Pappa's knife becomes the next action.
    for (const [id, words] of [
      ['cobbles1', 'Varför var stenarna på berget så runda?'],
      ['cobbles2', 'Havets vågor slipade dem på en strand.'],
      ['cobbles3', 'En gammal strand, så högt uppe!'],
      ['klonk', 'Klonk, klonk!'], ['named', 'Du ska heta Klonk!'],
    ]) {
      await readLine(id, words);
    }
    const afterParty = await state();
    check('Pappa remembers the saved musical cobbles at the party', ['cobbles1', 'cobbles2', 'cobbles3'].every((id) => afterParty.said.includes(id)));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')));
    check('the family candy choices persist', ['party-gift:bertil:karamell', 'party-gift:mamma:gelehallon', 'party-gift:moa:skumbanan', 'party-gift:spoket:karamell', 'party-gift:pappa:gelehallon'].every((flag) => saved.flags.epilog.includes(flag)));
    await reach(page, 'takeKnife', 'Pappa offers the knife after the naming');
    await page.keyboard.press('e');
    await until(state, (s) => s.flags.includes('knife'), 'take the knife after the naming');
    check('the party continues into Pappa’s carving lesson', (await state()).flags.includes('knife'));
    await finish();
  }
  console.log(`Story browser tests: ${checked} checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
