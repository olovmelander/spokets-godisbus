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

// Software rendering, as in Sköldhästen's screenshot tool: it works without a GPU, in CI too.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync(SHOTS, { recursive: true });

async function open(name, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${origin}${BASE}?debug`);
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 30000 });
  await sleep(600);
  const state = () => page.evaluate(() => window.__godis.state());
  const info = () => page.evaluate(() => window.__godis.info());
  const finish = async () => {
    await page.screenshot({ path: join(SHOTS, `stage-0a-${name}.png`) });
    check(`${name}: no request leaves the site`, requests.every((url) => url.startsWith(origin)), `${requests.length} requests`);
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
  check('the on-screen controls are hidden on a computer', await page.locator('#controls').isHidden());
  check('the key hint shows', await page.locator('#hint').isVisible());

  const before = await state();
  check('Elof stands on the ground', before.grounded === true && Math.abs(before.y) < 0.05, `y ${before.y.toFixed(3)}`);
  await page.keyboard.down('ArrowRight');
  await sleep(1500);
  const running = await state();
  check('→ runs to the right', running.x - before.x > 2 && running.vx > 3, `x ${running.x.toFixed(2)}, vx ${running.vx.toFixed(2)}`);
  await page.keyboard.down('Space');
  let top = 0;
  for (let i = 0; i < 12; i++) {
    await sleep(40);
    top = Math.max(top, (await state()).y);
  }
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  check('holding Space jumps high', top > 0.8, `top ${top.toFixed(2)} EL`);
  await sleep(700);
  const after = await state();
  check('he stops when the keys are let go', after.vx === 0 && after.grounded === true, `vx ${after.vx}`);
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
  await sleep(1200);
  const running = await state();
  check('the stick runs to the right', running.x - before.x > 1.5, `x ${running.x.toFixed(2)}`);
  // A second thumb taps Hoppa while the first keeps running.
  const hx = hop.x + hop.width / 2;
  const hy = hop.y + hop.height / 2;
  await touch('touchStart', [{ x: 230, y: 250, id: 1 }, { x: hx, y: hy, id: 2 }]);
  let top = 0;
  for (let i = 0; i < 10; i++) {
    await sleep(40);
    top = Math.max(top, (await state()).y);
  }
  await touch('touchEnd', []);
  check('Hoppa jumps while the stick is held', top > 0.4, `top ${top.toFixed(2)} EL`);
  await sleep(600);
  const after = await state();
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
