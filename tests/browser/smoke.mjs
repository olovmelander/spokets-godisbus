// The browser smoke test (plan §6.13): the built site starts, draws, makes no third-party request, and
// Elof moves with the keyboard and with touch. Run `npm run build` first.
// Screenshots go to docs/shots/_work/, which git ignores.
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const SHOTS = fileURLToPath(new URL('../../docs/shots/_work/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(404).end();
    return;
  }
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Waits until the game's state passes a test, and returns that state (or the last one, after the timeout).
 * CI renders in software and can be slow, so the checks wait for what should happen instead of for a time.
 */
async function until(state, test, timeout = 15000) {
  const end = Date.now() + timeout;
  let last = await state();
  while (!test(last) && Date.now() < end) {
    await sleep(40);
    last = await state();
  }
  return last;
}
/** Follows one jump: waits for Elof to leave the ground and land again. Returns how high his feet got. */
async function topOfJump(state, timeout = 15000) {
  const end = Date.now() + timeout;
  let top = 0;
  let left = false;
  while (Date.now() < end) {
    const s = await state();
    top = Math.max(top, s.y);
    if (!s.grounded) left = true;
    else if (left) break;
    await sleep(25);
  }
  return top;
}

// Software rendering, as in Sköldhästen's screenshot tool: it works without a GPU, in CI too.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync(SHOTS, { recursive: true });

async function open(name, options, query = '?debug') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${origin}${BASE}${query}`);
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await sleep(600);
  const state = () => page.evaluate(() => window.__godis.state());
  const info = () => page.evaluate(() => window.__godis.info());
  const finish = async () => {
    await page.screenshot({ path: join(SHOTS, `stage-0a-${name}.png`) });
    // The KTX2 transcoder runs in a worker made from a blob, which is still this page's own code.
    const own = (url) => url.startsWith(origin) || url.startsWith(`blob:${origin}`) || url.startsWith('data:');
    check(`${name}: no request leaves the site`, requests.every(own), `${requests.length} requests`);
    check(`${name}: no errors in the console`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await context.close();
  };
  return { page, context, state, info, finish };
}

// --- a computer: keyboard ---------------------------------------------------------------------------
{
  console.log('keyboard, 1440×900');
  const { page, state, info, finish } = await open('keyboard-1440x900', { viewport: { width: 1440, height: 900 } });
  const robots = await page.getAttribute('meta[name="robots"]', 'content');
  check('the page asks not to be indexed', /noindex/.test(robots ?? ''), robots ?? 'no robots meta');
  const drawn = await info();
  check('the scene is drawn', drawn.drawCalls > 0 && drawn.triangles > 0, `${drawn.drawCalls} draw calls, ${drawn.triangles} triangles`);
  check('Auto starts in the Mid tier, with the graded HDR picture', drawn.tier === 'mid', drawn.tier);
  // The asset chain (plan §7.3, Stage 0a): a model made in Blender, packed with KTX2 and meshopt, on the page.
  const loaded = await until(info, (i) => i.models.includes('boot/big-candy'), 30000);
  check('the big candy from Blender is loaded', loaded.models.includes('boot/big-candy'), loaded.models.join(', ') || 'no models');
  check('its texture arrived as KTX2 and stayed compressed', loaded.compressedTextures >= 1, `${loaded.compressedTextures} compressed`);
  check('its custom property from Blender arrived', loaded.roles.includes('checkpoint'), loaded.roles.join(', ') || 'no roles');
  // The ghost's pack is private: it is there on Olov's computer and absent in CI. Both are right.
  const manifest = await page.evaluate(() => fetch('packs/manifest.json').then((r) => r.json()));
  if (manifest.packs.private) {
    const withGhost = await until(info, (i) => i.models.includes('private/ghost'), 30000);
    check('the ghost from the private pack is loaded', withGhost.models.includes('private/ghost'), withGhost.models.join(', '));
    if (manifest.packs.private.files['elof.glb']) {
      const withElof = await until(info, (i) => i.models.includes('private/elof'), 30000);
      check('Elof from the private pack is loaded', withElof.models.includes('private/elof'), withElof.models.join(', '));
    }
  } else {
    console.log('  --   no private pack in this build: the course has no ghost');
  }
  check('the on-screen controls are hidden on a computer', await page.locator('#controls').isHidden());
  check('the key hint shows', await page.locator('#hint').isVisible());

  const before = await state();
  check('Elof stands on the ground', before.grounded === true && Math.abs(before.y) < 0.05, `y ${before.y.toFixed(3)}`);
  await page.keyboard.down('ArrowRight');
  const running = await until(state, (s) => s.x - before.x > 2 && s.vx > 3);
  check('→ runs to the right', running.x - before.x > 2 && running.vx > 3, `x ${running.x.toFixed(2)}, vx ${running.vx.toFixed(2)}`);
  await page.keyboard.down('Space');
  const top = await topOfJump(state);
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  check('holding Space jumps high', top > 0.8, `top ${top.toFixed(2)} EL`);
  const after = await until(state, (s) => s.vx === 0 && s.grounded === true);
  check('he stops when the keys are let go', after.vx === 0 && after.grounded === true, `vx ${after.vx}`);
  // Stage 1: the candy trail. The run above went through its first candies.
  const bag = await page.evaluate(() => ({ inBag: window.__godis.state().candy, shown: document.getElementById('bagCount').textContent }));
  check('the trail candy he ran through is in the bag', bag.inBag >= 1, `${bag.inBag} candies`);
  check('the bag in the corner shows the same number', bag.shown === String(bag.inBag), `it shows ${bag.shown}`);
  // Gate 6 (plan §6.12): no shader is compiled during play. Everything was compiled by the first frames.
  const programs = (await info()).programs;
  await sleep(500);
  check('no shader was compiled during play', (await info()).programs === programs, `${programs} programs`);

  // Sound (plan §6.8): it starts with the first key, and the run and the jump above made some.
  const heard = await info();
  check('sound runs after the first key, and effects were played', heard.sound === true && heard.soundsPlayed > 0, `${heard.soundsPlayed} effects`);

  // The pause panel and the play style (plan §4.1, §6.10). Esc opens it, the game stands still, and what is
  // chosen is still chosen after the page is loaded again.
  await page.keyboard.press('Escape');
  check('Esc opens the pause panel', await page.locator('#pause').isVisible());
  const still = await state();
  await page.keyboard.down('ArrowRight');
  await sleep(400);
  await page.keyboard.up('ArrowRight');
  const stillThere = await state();
  check('the game stands still while it is open', stillThere.paused === true && stillThere.x === still.x, `x ${stillThere.x.toFixed(2)}`);
  await page.click('#styleLugnt');
  check('Lugnt switches on its helps', (await page.isChecked('#setSwingHelp')) && (await page.isChecked('#setEasyJumps')));
  await page.click('#resumeBtn');
  const resumed = await state();
  check('Spela vidare closes it', (await page.locator('#pause').isHidden()) && resumed.paused === false && resumed.style === 'lugnt', resumed.style);
  await page.reload();
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  const again = await state();
  check('the style and the candy are saved', again.style === 'lugnt' && again.candy === bag.inBag, `${again.style}, ${again.candy} candies`);
  await finish();
}

// --- the other tiers --------------------------------------------------------------------------------
for (const tier of ['low', 'high']) {
  console.log(`tier ${tier}, 1180×820`);
  const { info, finish } = await open(`tier-${tier}-1180x820`, { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 }, `?debug&tier=${tier}`);
  const drawn = await until(info, (i) => i.models.includes('boot/big-candy'), 30000);
  check(`?tier=${tier} is honoured`, drawn.tier === tier, drawn.tier);
  check(`${tier}: the scene and the model are drawn`, drawn.drawCalls > 0 && drawn.models.includes('boot/big-candy'), `${drawn.drawCalls} draw calls`);
  const pixels = drawn.width * drawn.height;
  const cap = tier === 'low' ? 1.0e6 : 2.6e6;
  check(`${tier}: the canvas stays inside its pixel cap`, pixels <= cap * 1.01, `${drawn.width}×${drawn.height}`);
  await finish();
}

// --- the chapter in work: ?dev ------------------------------------------------------------------------
{
  console.log('?dev, 1180×820');
  const { page, state, info, finish } = await open('dev-1180x820', { viewport: { width: 1180, height: 820 } }, '?dev&debug');
  const drawn = await info();
  const first = await until(state, (s) => s.said.length >= 1);
  check('?dev plays Kapitel 1 in greybox', first.course === 'garden' && drawn.drawCalls > 0, first.course);
  check('a bubble says the first line', (await page.locator('#bubble').isVisible()) && first.said[0] === 'follow1', await page.locator('#bubbleLine').textContent());
  await finish();
}

// --- the title and the first start ------------------------------------------------------------------
{
  console.log('the title, 844×390');
  const { page, state, finish } = await open('title-844x390', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, '?dev&debug&title');
  const before = await state();
  check('the title shows, and the game waits behind it', (await page.locator('#title').isVisible()) && before.title === true && before.paused === true);
  check('with no saved game the button says Börja', (await page.locator('#startBtn .begin').isVisible()) && (await page.locator('#startOverBtn').isHidden()));
  await page.tap('#startBtn');
  check('Börja asks how to play, with two pictures', (await page.locator('#firstAventyr').isVisible()) && (await page.locator('#firstLugnt').isVisible()));
  await page.tap('#firstLugnt');
  const started = await until(state, (s) => s.said.length >= 1);
  check('choosing Lugnt starts the game on Lugnt', (await page.locator('#title').isHidden()) && started.style === 'lugnt' && started.paused === false, started.style);
  await page.reload();
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  check('with a saved game the button says Fortsätt', (await page.locator('#startBtn .resume').isVisible()) && (await page.locator('#startOverBtn').isVisible()));
  await page.tap('#startBtn');
  const resumed = await state();
  check('Fortsätt goes on with the same style', resumed.title === false && resumed.style === 'lugnt', resumed.style);
  await finish();
}

// --- a phone held sideways: touch -------------------------------------------------------------------
{
  console.log('touch, 844×390');
  const { page, context, state, finish } = await open('touch-844x390', {
    viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
  });
  check('the on-screen controls show on a phone', await page.locator('#controls').isVisible());
  const hop = await page.locator('#hopBtn').boundingBox();
  check('Hoppa is at least 96 px', hop.width >= 96 && hop.height >= 96, `${hop.width}×${hop.height}`);

  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const before = await state();
  // The thumb lands on the left half and pushes right: the stick appears there.
  await touch('touchStart', [{ x: 150, y: 250, id: 1 }]);
  await touch('touchMove', [{ x: 230, y: 250, id: 1 }]);
  const running = await until(state, (s) => s.x - before.x > 1.5);
  check('the stick runs to the right', running.x - before.x > 1.5, `x ${running.x.toFixed(2)}`);
  // A second thumb taps Hoppa while the first keeps running.
  const hx = hop.x + hop.width / 2;
  const hy = hop.y + hop.height / 2;
  await touch('touchStart', [{ x: 230, y: 250, id: 1 }, { x: hx, y: hy, id: 2 }]);
  const top = await topOfJump(state);
  await touch('touchEnd', []);
  check('Hoppa jumps while the stick is held', top > 0.4, `top ${top.toFixed(2)} EL`);
  const after = await until(state, (s) => s.vx === 0 && s.grounded === true);
  check('he stops when both thumbs lift', after.vx === 0, `vx ${after.vx}`);
  check('the device in use is touch', after.device === 'touch', String(after.device));
  await finish();
}

await browser.close();
server.close();
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nBrowser smoke test: ok');
