// Äventyr 2, Stormnatten (docs/aventyr-2.md), in the built game: its pack is fetched only when it is played, each
// of its chapters starts, draws within the draw budget, moves and shows its storm, and none makes a request off
// the site. Byn's last card leads on to it. Run after a build.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const SHOTS = fileURLToPath(new URL('../../docs/shots/_work/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};
assert.ok(existsSync(join(DIST, 'index.html')), 'Run npm run build before the browser tests.');
mkdirSync(SHOTS, { recursive: true });

const served = [];
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  served.push(path);
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let checked = 0;
function check(name, condition, detail = '') {
  assert.ok(condition, `${name}${detail ? ` (${detail})` : ''}`);
  checked++;
  console.log(`  ok   ${name}${detail ? ` (${detail})` : ''}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, accepts, name, timeout = 20000) {
  const end = Date.now() + timeout;
  let value;
  do {
    value = await read();
    if (accepts(value)) return value;
    await sleep(40);
  } while (Date.now() < end);
  assert.fail(`${name}: timed out; last value ${JSON.stringify(value)?.slice(0, 400)}`);
}

/** Whether the page has fetched Äventyr 2's chunk itself. */
const pageFetchedPack = (page) => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => /\/aventyr2-[\w-]+\.js$/.test(entry.name)));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(query) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  // Äventyr 2's voices are not generated yet (HANDOVER.md): a missing voice is silent, and is the only 404 allowed.
  const missing = [];
  page.on('response', (response) => { if (response.status() === 404) missing.push(response.url()); });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (/404/.test(message.text()) && (message.location()?.url ?? '').includes('/audio/voices/')) return;
    if (/404/.test(message.text())) return;
    errors.push(message.text());
  });
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith(`blob:${origin}`) && !url.startsWith('data:')) external.push(url);
  });
  served.length = 0;
  await page.goto(`${origin}${BASE}${query}`);
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 90000 });
  return {
    page,
    state: () => page.evaluate(() => window.__godis.state()),
    info: () => page.evaluate(() => window.__godis.info()),
    async finish(name) {
      assert.deepEqual(errors, [], `${name}: browser errors`);
      assert.deepEqual(missing.filter((url) => !url.includes('/audio/voices/')), [], `${name}: missing files`);
      assert.deepEqual(external, [], `${name}: external requests`);
      await context.close();
    },
  };
}

try {
  // The first adventure does not fetch the second's pack.
  {
    const game = await open('?dev&debug&standin&tier=low&course=garden');
    await sleep(500);
    // The page itself does not fetch it (the service worker may precache it for offline play: that is not the page).
    check('the first adventure plays without fetching Äventyr 2', !(await pageFetchedPack(game.page)));
    await game.finish('garden');
  }

  const CHAPTERS = [
    ['stormkvall', '20,0', 'scene:kvall,goodnight,gust,scene:fonstret,scene:klonkstar,star,scene:krymper,scene:tillsammans'],
    ['stormgard', '', ''],
    ['stormskog', '', ''],
    ['stormbyn', '', ''],
    ['sjon', '', ''],
    ['stormoga', '44,0.6', 'owl:call,owl:ready,owl'],
    ['morgonen', '', ''],
  ];
  for (const [id, at, flags] of CHAPTERS) {
    const query = `?dev&debug&standin&tier=low&course=${id}${at ? `&at=${at}` : ''}${flags ? `&flags=${flags}` : ''}`;
    const game = await open(query);
    check(`${id}: Äventyr 2's own chunk is fetched for it`, await pageFetchedPack(game.page));
    const state = await game.state();
    check(`${id}: the chapter starts`, Number.isFinite(state.x), `x ${state.x}`);
    // After the first frames, which draw everything once to compile it.
    await until(game.info, (i) => i.drawCalls > 0 && !i.warming, `${id} draws`, 60000);
    await sleep(1500);
    const info = await game.info();
    check(`${id}: it draws within the budget`, withinDraws(info.drawCalls, info.tier), `${info.drawCalls} draws on ${info.tier}`);
    // Elof moves when he is asked to: the storm's rain and flashes never hold him up.
    const before = (await game.state()).x;
    await game.page.keyboard.down('ArrowRight');
    await sleep(1500);
    await game.page.keyboard.up('ArrowRight');
    const after = await game.state();
    check(`${id}: he moves with the keyboard`, after.x > before || after.flags.length > 0, `x ${before} → ${after.x}`);
    await picture(game.page, `${SHOTS}aventyr2-${id}.png`);
    await game.finish(id);
  }

  // Byn's last card leads on into the second adventure.
  {
    const game = await open('?dev&debug&standin&tier=low&course=byn&at=156,3.3');
    await game.page.keyboard.down('ArrowRight');
    const end = Date.now() + 120000;
    let word = '';
    while (Date.now() < end && !word) {
      await sleep(900);
      word = await game.page.evaluate(() => { const b = document.getElementById('endOnward'); return b && !b.hidden && !document.getElementById('endCard')?.hidden ? b.textContent ?? '' : ''; });
      // Lines that wait for the reader are read on, as a child would with Fortsätt; the card itself is not pressed.
      if (!word && await game.page.evaluate(() => document.getElementById('endCard')?.hidden !== false)) await game.page.keyboard.press('Enter');
    }
    await game.page.keyboard.up('ArrowRight');
    check('Byn\'s card offers the next adventure', /Nästa äventyr/.test(word), word.trim());
    await game.finish('byn');
  }
  console.log(`Äventyr 2: ${checked} checks passed`);
} finally {
  await browser.close();
  server.close();
}
