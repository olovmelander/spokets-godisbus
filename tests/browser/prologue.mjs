// Required story interactions: real keyboard, touch and gamepad choices. Run after a build.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
import { continueDialogue } from './dialogue.mjs';

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
    if (value.storyReading && read.page) await continueDialogue(read.page);
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

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // Scenes run on the game's own clock. Drawn in software, with other suites beside it, the game falls well
  // behind the wall clock (a fifth of its speed at times, with other suites beside it), so every wait for a scene is long.
  // The flags of a game that has come to the veranda: the morning and the waking told, the bag torn.
  const VERANDA = 'scene:morgon,eye,paint,woke,grab,blink,scene:vaknar,mamma:noticed,mamma:passed,bag:torn';
  if (!process.env.PROLOGUE_SCENE || process.env.PROLOGUE_SCENE === 'morning') {
    const { page, state, info, finish } = await open('morning', {}, '?dev&debug&standin&course=prolog&tier=low');
    const programs = (await info()).programs;
    await until(state, (s) => s.scene?.id === 'morgon' && s.scene.seconds > 1.2, 'the morning scene plays first', 120000);
    check('morning: he watches it, held, between dark bars', (await state()).held && await page.evaluate(() => document.body.classList.contains('scene-bars')));
    check('morning: the time of day is shown', await page.locator('#sceneCaption').textContent() === 'Lördagsmorgon');
    const x = (await state()).x;
    await page.keyboard.down('ArrowRight');
    await sleep(500);
    await page.keyboard.up('ArrowRight');
    check('morning: the keys do nothing while it tells', Math.abs((await state()).x - x) < 0.01);
    await sleep(700);
    check('morning: the keys\' hint steps aside', await page.locator('#hint').evaluate((node) => getComputedStyle(node).opacity) === '0');
    await page.keyboard.press('Escape');
    const paused = await state();
    await sleep(400);
    check('morning: a pause holds the scene\'s clock', (await state()).scene.seconds === paused.scene.seconds);
    await page.keyboard.press('Escape');
    check('morning: draw budget', withinDraws((await info()).drawCalls, (await info()).tier));
    await until(state, (s) => s.storyReading, 'Mamma waits for the reader', 120000);
    const reading = await state();
    const line = await page.locator('#bubbleLine').textContent();
    await sleep(1300);
    check('morning: words and story time never advance without Fortsätt',
      (await state()).scene.seconds === reading.scene.seconds && await page.locator('#bubbleLine').textContent() === line);
    await page.keyboard.press('Escape');
    await sleep(300);
    await page.keyboard.press('Escape');
    check('morning: the same unread line survives pause',
      (await state()).storyReading && await page.locator('#bubbleLine').textContent() === line);
    await page.keyboard.press('e');
    await until(state, (s) => s.said.includes('morgon:1'), 'Pappa holds out the brush', 120000);
    check('morning: Pappa asks him to paint the eyes', await page.locator('#bubbleLine').textContent() === 'Jag har täljt ett spöke. Måla ögonen!');
    await until(state, (s) => !s.held && s.scene === null, 'the morning ends', 120000);
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.word === 'paintGhost', 'the brush becomes reachable', 120000);
    await page.keyboard.up('ArrowRight');
    for (const eye of ['eye', 'paint']) {
      await page.keyboard.press('e');
      await page.waitForSelector('#storyPanel:not([hidden])');
      await page.locator('#strokeAssist').click();
      await until(state, (s) => s.flags.includes(eye), `the ${eye} is painted`, 120000);
    }
    // The waking takes the floor: the line the jay calls for comes first, not what was said before.
    await until(state, (s) => s.scene?.id === 'vaknar', 'the ghost wakes', 120000);
    await page.waitForFunction(() => !document.getElementById('bubble').hidden && document.getElementById('bubbleLine').textContent === 'Titta! En lavskrika!', null, { timeout: 120000 });
    check('waking: Mamma looks at the jay as it begins', (await state()).scene.seconds < 2.5);
    check('waking: draw budget', withinDraws((await info()).drawCalls, (await info()).tier));
    await until(state, (s) => s.flags.includes('blink') && s.scene?.id !== 'vaknar', 'the ghost takes the bag and runs', 120000);
    const woke = await state();
    check('waking: the ghost has woken, taken the bag and run', ['woke', 'grab', 'blink', 'scene:vaknar'].every((flag) => woke.flags.includes(flag)));
    check('morning and waking: no shader is compiled while they play', (await info()).programs === programs);
    await finish();
  }
  if (!process.env.PROLOGUE_SCENE || process.env.PROLOGUE_SCENE === 'shrinking') {
    const { page, state, info, finish } = await open('shrinking', { hasTouch: true },
      `?dev&debug&standin&course=prolog&tier=low&at=37,0.01&flags=${VERANDA}`);
    const programs = (await info()).programs;
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.flags.includes('star'), 'he runs into the star', 120000);
    await page.keyboard.up('ArrowRight');
    await until(state, (s) => s.scene?.id === 'poff', 'POFF', 120000);
    const held = await state();
    await page.keyboard.down('ArrowLeft');
    await sleep(400);
    await page.keyboard.up('ArrowLeft');
    check('shrinking: he is held while it happens', held.held && (await state()).x >= held.x - 0.05);
    await until(state, (s) => s.scene?.id === 'familj', 'the family comes down to him', 120000);
    check('shrinking: draw budget with the whole family kneeling', withinDraws((await info()).drawCalls, (await info()).tier));
    await until(state, (s) => !s.held && s.word === 'climbOn', 'Pappa\'s hand is offered', 120000);
    check('shrinking: stepping onto the hand is his choice', await page.locator('#actBtn').textContent() === 'Kliv upp' && !(await state()).flags.includes('hand'));
    await page.keyboard.press('e');
    await until(state, (s) => s.scene?.id === 'handen', 'he is lifted', 120000);
    await page.waitForFunction(() => document.getElementById('bubbleLine').textContent === 'Spökets magi hamnade i godispåsen.', null, { timeout: 120000 });
    await page.keyboard.press('Escape');
    const lifted = await state();
    await sleep(350);
    check('shrinking: a pause holds the lift', (await state()).scene.seconds === lifted.scene.seconds);
    await page.locator('#pause').evaluate((node) => { node.style.visibility = 'hidden'; });
    await picture(page, '/tmp/prologue-hand.png');
    await page.locator('#pause').evaluate((node) => { node.style.visibility = ''; });
    await page.keyboard.press('Escape');
    await until(state, (s) => s.said.includes('handen:2'), 'Pappa explains the golden candy', 120000);
    check('shrinking: Pappa reads the hope in Moa\'s drawing', await page.locator('#bubble').getAttribute('data-who') === 'pappa');
    // Set down again, he has his feet back: Pappa notices the ghost as he sets off towards it.
    await until(state, (s) => s.flags.includes('scene:handen') && !s.held, 'he is set down', 120000);
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.prologue?.kind === 'pappa', 'Pappa notices the ghost', 120000);
    await page.keyboard.up('ArrowRight');
    await until(state, (s) => s.flags.includes('pappa:done'), 'Pappa\'s freeze joke', 120000);
    check('shrinking: the walk to the edge is still his', !(await state()).flags.includes('goal'));
    await page.keyboard.down('ArrowRight');
    // He stops at the edge and listens to the promises before the title.
    await until(state, (s) => s.x > 51.4 && s.held, 'he stops at the edge', 120000);
    await page.keyboard.up('ArrowRight');
    await until(state, (s) => s.scene?.id === 'titel', 'the title scene', 120000);
    const promised = await state();
    check('shrinking: all four promises were said before the title', ['nearYou', 'mapForYou', 'heja', 'followTrail'].every((id) => promised.said.includes(id)));
    await until(state, (s) => s.scene?.id === 'titel' && s.scene.seconds > 5.5, 'the title shows', 120000);
    check('shrinking: the game\'s title over the garden', await page.locator('#sceneTitle').textContent() === 'Elof och det stora godisäventyret'
      && Number(await page.locator('#sceneTitle').evaluate((node) => node.style.opacity)) > 0.5);
    await until(state, (s) => s.flags.includes('goal'), 'the prologue ends', 120000);
    await page.waitForSelector('#endCard:not([hidden])', { timeout: 120000 });
    check('shrinking: the chapter card follows', await page.locator('#endCard').isVisible());
    check('shrinking: no shader is compiled on the deck', (await info()).programs === programs);
    await finish();
  }
  for (const [name, viewport, tier, kind] of [
    ['mamma-landscape-low', { width: 844, height: 390 }, 'low', 'mamma'],
    ['mamma-portrait-high', { width: 390, height: 844 }, 'high', 'mamma'],
    ['pappa-landscape-high', { width: 844, height: 390 }, 'high', 'pappa'],
    ['pappa-portrait-low', { width: 390, height: 844 }, 'low', 'pappa'],
  ]) {
    if (process.env.PROLOGUE_SCENE && !name.startsWith(process.env.PROLOGUE_SCENE)) continue;
    const pappa = kind === 'pappa';
    const flags = pappa ? `${VERANDA},star,scene:poff,scene:familj,hand,scene:handen` : 'scene:morgon,eye,paint,woke,grab,blink,scene:vaknar';
    const at = pappa ? '41.6,-0.79' : '5.5,0.01';
    const { page, state, info, finish } = await open(name, { viewport, hasTouch: true },
      `?dev&debug&standin&course=prolog&tier=${tier}&at=${at}&flags=${flags}`);
    await until(state, (s) => s.prologue?.kind === kind && s.prologue.seconds >= (pappa ? 1.45 : 0.85), `${name}: tableau`, 90000);
    await page.keyboard.press('Escape');
    const paused = await state();
    check(`${name}: pause opens during tableau`, paused.paused && paused.prologue?.kind === kind);
    await sleep(350);
    check(`${name}: all staging holds its simulation time while paused`, (await state()).prologue.seconds === paused.prologue.seconds);
    await page.locator('#pause').evaluate((node) => { node.style.visibility = 'hidden'; });
    await picture(page, `/tmp/${name}.png`);
    await page.locator('#pause').evaluate((node) => { node.style.visibility = ''; });
    const before = await info();
    check(`${name}: draw budget`, withinDraws(before.drawCalls, before.tier));
    await page.keyboard.press('Escape');
    await until(state, (s) => s.flags.includes(pappa ? 'pappa:done' : 'mamma:passed'), `${name}: completed`, 90000);
    check(`${name}: no shaders compile during the scene`, (await info()).programs === before.programs);
    if (pappa) {
      check(`${name}: safe walk is still required`, !(await state()).flags.includes('goal'));
      await page.keyboard.down('ArrowRight');
      // The promises, the edge and the title scene, on the game's own clock: slow in software, on High.
      await until(state, (s) => s.flags.includes('goal'), `${name}: title card`, 180000);
      await page.keyboard.up('ArrowRight');
      await page.waitForSelector('#endCard:not([hidden])', { timeout: 60000 });
      check(`${name}: scene continues to chapter card`, await page.locator('#endCard').isVisible());
    } else {
      await page.keyboard.down('ArrowRight');
      await until(state, (s) => s.flags.includes('bag:torn') && s.candy > 0, `${name}: torn bag trail`, 60000);
      await page.keyboard.up('ArrowRight');
      check(`${name}: chase resumes and candy can be collected`, (await state()).x > 8);
    }
    await finish();
  }
  console.log(`prologue: ${checked} checks passed`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
