// Player-paced opening with real keyboard/touch choices and saved-progress recovery. Run after a build.
// PROLOGUE_SOURCE=1 serves current sources; PROLOGUE_SCENE=full follows the whole chapter in one visit.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
import { continueDialogue } from './dialogue.mjs';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const SHOTS = fileURLToPath(new URL('../../docs/shots/_work/prologue/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};
assert.ok(process.env.PROLOGUE_SOURCE || existsSync(join(DIST, 'index.html')), 'Run npm run build before the browser tests.');

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
const vite = process.env.PROLOGUE_SOURCE ? await (await import('vite')).createServer({
  root: fileURLToPath(new URL('../../', import.meta.url)), server: { host: '127.0.0.1', port: 0, watch: null },
}) : null;
if (vite) await vite.listen();
else await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${(vite?.httpServer ?? server).address().port}`;
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
  let value, reported = Date.now();
  do {
    value = await read();
    if (accepts(value)) return value;
    if (Date.now() - reported > 25000) {
      console.log(`  waiting ${name}: ${JSON.stringify({ x: value.x, y: value.y, held: value.held, reading: value.storyReading, scene: value.scene, tableau: value.prologue })}`);
      reported = Date.now();
    }
    if (value.storyReading && read.page) await continueDialogue(read.page);
    await sleep(35);
  } while (Date.now() < end);
  assert.fail(`${name}: timed out; last value ${JSON.stringify(value)}`);
}
async function walk(page, state, accepts, name, timeout = 120000) {
  let down = false;
  const moving = Object.assign(async () => {
    const value = await state();
    if (value.held || value.storyReading) {
      await page.keyboard.up('ArrowRight');
      down = false;
    } else if (!down) {
      await page.keyboard.down('ArrowRight');
      down = true;
    }
    // The hall has one low door sill. The player makes the jump, after coming up to it.
    if (value.x > 29.25 && value.x < 30.1 && value.grounded) await page.keyboard.press('Space');
    return value;
  }, { page });
  try { return await until(moving, accepts, name, timeout); }
  finally { await page.keyboard.up('ArrowRight'); }
}
async function readStop(page, state, id, words) {
  await until(state, s => s.storyReading && s.said.includes(id), `${id}: waits for the reader`, 120000);
  await page.waitForFunction(text => document.getElementById('bubbleLine').textContent === text, words);
  const before = await state();
  await frames(page, 5);
  check(`${id}: the settled moment waits for Fortsätt`, (await state()).steps === before.steps &&
    (await state()).scene?.seconds === before.scene?.seconds &&
    await page.locator('#bubbleLine').textContent() === words && await page.locator('#sceneNext').isVisible());
  return before;
}
async function capture(page, name) {
  await page.evaluate(() => { document.getElementById('debug').hidden = true; });
  await picture(page, join(SHOTS, `${name}.png`));
}
async function familyCaptures(page) {
  for (const [width, height] of [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await frames(page, 3);
    check(`${width}×${height}: the reassurance and continuation fit without covering each other`,
      await page.evaluate(() => {
        const bubble = document.getElementById('bubble'), button = document.getElementById('sceneNext');
        const b = bubble.getBoundingClientRect(), c = button.getBoundingClientRect();
        return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= c.top &&
          c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && !document.getElementById('sceneReading').hidden;
      }));
    check(`${width}×${height}: Elof stays visible above or beside the reading controls`, await page.evaluate(() => {
      const state = window.__godis.state(), center = state.playerScreen;
      const head = window.__godis.screen({ x: state.x, y: state.y + 1.1 });
      const foot = window.__godis.screen({ x: state.x, y: state.y });
      if (!center || !head || !foot) return false;
      const reading = document.getElementById('sceneReading').getBoundingClientRect();
      const halfWidth = Math.abs(foot.y - head.y) * .35;
      return head.y >= 0 && foot.y <= innerHeight && center.x >= halfWidth && center.x + halfWidth <= innerWidth &&
        (foot.y < reading.top || head.y > reading.bottom || center.x + halfWidth < reading.left || center.x - halfWidth > reading.right);
    }));
    await capture(page, `family-reassurance-${width}x${height}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
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
  if (!process.env.PROLOGUE_SCENE || ['morning', 'full'].includes(process.env.PROLOGUE_SCENE)) {
    const game = await open('morning', { hasTouch: true }, '?dev&debug&standin&course=prolog&tier=low');
    const { page, state, info, finish } = game;
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
    await readStop(page, state, 'vaknar:0', 'Titta! En lavskrika!');
    check('waking: Mamma names the landed bird before the ghost wakes', (await state()).scene.seconds >= 1.99 &&
      !(await state()).flags.includes('woke') && !(await state()).flags.includes('grab'));
    await capture(page, 'bird-discovery');
    check('waking: draw budget', withinDraws((await info()).drawCalls, (await info()).tier));
    await continueDialogue(page);
    await readStop(page, state, 'vaknar:1', 'Du blinkade! Kan du se mig?');
    check('waking: Elof and the painted ghost meet before the bag is taken', !(await state()).flags.includes('grab'));
    await continueDialogue(page);
    await readStop(page, state, 'vaknar:2', 'Två godisar lyser i påsen!');
    check('waking: the magic is shown after the bag is lifted and before escape',
      (await state()).flags.includes('grab') && !(await state()).flags.includes('blink'));
    await capture(page, 'bag-magic');
    await continueDialogue(page);
    await readStop(page, state, 'vaknar:3', 'Pappa! Spöket tog min godispåse!');
    await continueDialogue(page);
    await until(state, (s) => s.flags.includes('blink') && s.scene?.id !== 'vaknar', 'the ghost takes the bag and runs', 120000);
    const woke = await state();
    check('waking: the ghost has woken, taken the bag and run', ['woke', 'grab', 'blink', 'scene:vaknar'].every((flag) => woke.flags.includes(flag)));
    check('morning and waking: no shader is compiled while they play', (await info()).programs === programs);
    if (process.env.PROLOGUE_SCENE === 'full') await shrinking(game);
    await finish();
  }
  async function shrinking({ page, state, info }) {
    const programs = (await info()).programs;
    await walk(page, state, s => s.scene?.id === 'stjarnan', 'he discovers the fallen star');
    await readStop(page, state, 'stjarnan:0', 'Där! Stjärnan trillade ur spökets påse.');
    check('star: discovery identifies the same lost bag before any bite', !(await state()).flags.includes('star'));
    await continueDialogue(page);
    await readStop(page, state, 'stjarnan:1', 'En godisstjärna … den lyser!');
    await continueDialogue(page);
    await walk(page, state, s => !s.held && s.word === 'tasteStar', 'he can choose to taste the star');
    await frames(page, 10);
    check('star: standing beside it never eats it automatically', !(await state()).flags.includes('star') &&
      (await page.locator('#actBtn').textContent()).includes('Smaka på stjärnan'));
    await capture(page, 'star-choice');
    // Walking here used keys, so the visible action is the E / Smaka prompt.
    await page.keyboard.press('e');
    await until(state, (s) => s.scene?.id === 'poff', 'POFF', 120000);
    const held = await state();
    await page.keyboard.down('ArrowLeft');
    await sleep(400);
    await page.keyboard.up('ArrowLeft');
    check('shrinking: he is held while it happens', held.held && (await state()).x >= held.x - 0.05);
    await until(state, s => s.scene?.id === 'poff' && s.scene.seconds >= 5, 'the slow change of scale', 120000);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#pause:not([hidden])');
    const transforming = await state();
    await frames(page, 5);
    check('shrinking: pausing mid-transformation holds its authored clock',
      (await state()).scene.seconds === transforming.scene.seconds && transforming.scene.seconds < 6.5);
    await page.locator('#resumeBtn').click();
    await readStop(page, state, 'poff:0', 'Mamma? Var är du?');
    await capture(page, 'tiny-first-look');
    await continueDialogue(page);
    await readStop(page, state, 'poff:1', 'Jag är lika liten som spöket!');
    await continueDialogue(page);
    await until(state, (s) => s.scene?.id === 'familj', 'the family comes down to him', 120000);
    await readStop(page, state, 'familj:0', 'Lillebror?! Du är ju pytteliten!');
    await continueDialogue(page);
    await readStop(page, state, 'familj:1', 'Gör det ont?');
    await continueDialogue(page);
    await readStop(page, state, 'familj:2', 'Nej. Men allting är jättestort.');
    await continueDialogue(page);
    await readStop(page, state, 'familj:3', 'Jag är här. Du är inte ensam.');
    await capture(page, 'family-reassurance');
    await familyCaptures(page);
    await continueDialogue(page);
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
    await capture(page, 'pappas-hand');
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
    // Each promise stops the player and waits. A fresh move after reading resumes the walk.
    for (const [id, words] of [
      ['nearYou', 'Vi är nära dig hela tiden.'], ['mapForYou', 'Jag ritar en karta åt dig!'],
      ['heja', 'Heja lillebror!'], ['followTrail', 'Följ godisspåret, Elof.'],
    ]) {
      await walk(page, state, s => s.storyReading && s.said.includes(id), `${id}: the family's promise`);
      await readStop(page, state, id, words);
      await continueDialogue(page);
    }
    await walk(page, state, s => s.x > 51.4 && s.held, 'he stops at the edge');
    await until(state, (s) => s.scene?.id === 'titel', 'the title scene', 120000);
    const promised = await state();
    check('shrinking: all four promises were said before the title', ['nearYou', 'mapForYou', 'heja', 'followTrail'].every((id) => promised.said.includes(id)));
    await until(state, (s) => s.scene?.id === 'titel' && s.scene.seconds > 7.7, 'the title shows', 120000);
    check('shrinking: the game\'s title over the garden', await page.locator('#sceneTitle').textContent() === 'Elof och det stora godisäventyret'
      && Number(await page.locator('#sceneTitle').evaluate((node) => node.style.opacity)) > 0.5);
    await until(state, (s) => s.flags.includes('goal'), 'the prologue ends', 120000);
    await page.waitForSelector('#endCard:not([hidden])', { timeout: 120000 });
    check('shrinking: the chapter card follows', await page.locator('#endCard').isVisible());
    check('shrinking: no shader is compiled on the deck', (await info()).programs === programs);
  }
  if (!process.env.PROLOGUE_SCENE || process.env.PROLOGUE_SCENE === 'shrinking') {
    const game = await open('shrinking', { hasTouch: true },
      `?dev&debug&standin&course=prolog&tier=low&at=37,0.01&flags=${VERANDA}`);
    await shrinking(game);
    await game.finish();
  }
  if (process.env.PROLOGUE_SCENE === 'family-shot') {
    // A focused presentation review of the same live scene and UI, without repeating the already-tested bite.
    const { page, state, finish } = await open('family-reading', { hasTouch: true },
      `?dev&debug&standin&course=prolog&tier=low&at=40.5,-0.8&flags=${VERANDA},star,scene:poff`);
    await readStop(page, state, 'familj:3', 'Jag är här. Du är inte ensam.');
    await familyCaptures(page);
    await finish();
  }
  if (!process.env.PROLOGUE_SCENE || process.env.PROLOGUE_SCENE === 'restore') {
    // A real save still identifies the hall checkpoint, with the star accepted but its transformation unfinished.
    // The pending authored moment resumes safely on the deck without changing the persistent checkpoint.
    const { page, state, finish } = await open('star-restore', { hasTouch: true },
      '?dev&debug&standin&course=prolog&tier=low', () => {
        if (!localStorage.getItem('godisbus.v1.player.elof')) localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({
          v: 1, name: 'Elof', updated: 1, chapter: 'prolog', checkpoint: 1, candy: {}, placed: {}, playMs: 0,
          settings: { style: 'lugnt', sound: false, music: false }, flags: { prolog: [
            'scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar',
            'mamma:noticed', 'mamma:passed', 'bag:torn', 'scene:stjarnan', 'star',
          ] },
        }));
      });
    check('star restore: the accepted bite resumes on the deck while preserving its checkpoint identity',
      (await state()).flags.includes('star') && !(await state()).flags.includes('scene:poff') &&
      (await state()).checkpoint === 1 && (await state()).x >= 39.5);
    await walk(page, state, s => s.scene?.id === 'poff', 'the unfinished transformation replays at the deck');
    await until(state, s => s.scene?.id === 'poff' && s.scene.seconds >= 5, 'a saved mid-transformation moment', 120000);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#pause:not([hidden])');
    const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')).flags.prolog);
    check('star restore: saving mid-shrink keeps the bite but never claims the transformation completed',
      flags.includes('star') && !flags.includes('scene:poff'));
    await page.reload();
    await ready(page);
    await walk(page, state, s => s.scene?.id === 'poff', 'reload replays the unfinished transformation at the deck');
    check('star restore: replay begins before the bite animation and before the shrinking', (await state()).scene.seconds < 1);
    await readStop(page, state, 'poff:0', 'Mamma? Var är du?');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#pause:not([hidden])');
    const readingFlags = await page.evaluate(() => JSON.parse(localStorage.getItem('godisbus.v1.player.elof')).flags.prolog);
    check('star restore: the frightened call stays unread in the saved game until acknowledged',
      !readingFlags.includes('beat:poff:0') && !readingFlags.includes('scene:poff'));
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
      await walk(page, state, (s) => s.flags.includes('goal'), `${name}: title card`, 180000);
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
  if (vite) await vite.close();
  else await new Promise((resolve) => server.close(resolve));
}
