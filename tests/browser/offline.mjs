// Real service-worker lifecycle checks against the production build. No mocks of CacheStorage or offline.
// A synthetic second deployment changes the built worker/page version and one same-name pack response.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.png': 'image/png' };
const sha = (value) => createHash('sha256').update(value).digest('hex');
const fixture = ['chapter-pack-first', 'chapter-pack-second'];
const versionB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
let versionA = '';
let deploy = 0;
let requests = 0;
let online = true;
const server = createServer((req, res) => {
  // Browser update checks can bypass Playwright's page offline emulation. Shut the server off too.
  if (!online) { req.socket.destroy(); return; }
  requests++;
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  if (path === `${BASE}packs/garden/offline-test.webp`) {
    res.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'no-store' }).end(fixture[deploy]);
    return;
  }
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  let body = readFileSync(file);
  if (deploy && extname(file) === '.js') body = Buffer.from(body.toString().replaceAll(versionA, versionB));
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}${BASE}?dev&course=garden&debug&standin&tier=low&title`;
let browser;
let checked = 0;
const failures = [];
const external = [];
const check = (name, value) => { assert.ok(value, name); checked++; console.log(`  ok   ${name}`); };
async function ready(page) {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await page.waitForFunction(() => window.__godis.state().bootReady, null, { timeout: 30000 });
}
async function waiting(page) {
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, null, { timeout: 30000 });
}
async function update(page) {
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
}
async function generation(page) {
  return page.evaluate(async () => (await caches.keys()).filter((name) => name.endsWith(':shell')));
}
function observe(page) {
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !request.url().startsWith(`blob:${origin}`) && !request.url().startsWith('data:')) external.push(request.url());
  });
}
const fetchPack = (page, version) => page.evaluate(async (address) => {
  try { const response = await fetch(address); return response.ok ? await response.text() : `status:${response.status}`; }
  catch { return 'unavailable'; }
}, `${origin}${BASE}packs/garden/offline-test.webp?v=${sha(fixture[version])}`);

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  let delayedVotes = 0;
  await context.exposeBinding('noteDelayedVote', () => { delayedVotes++; });
  await context.addInitScript(() => {
    // Only delay a real page's response; CacheStorage, workers and activation remain untouched.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type !== 'PREPARE_UPDATE' || !event.ports[0]) return;
      const port = event.ports[0];
      const send = port.postMessage.bind(port);
      port.postMessage = (answer) => {
        if (window.__blockUpdateVote) send({ ready: false });
        else if (window.__delayUpdateVote && answer.ready) {
          window.__delayUpdateVote = false;
          void window.noteDelayedVote();
          setTimeout(() => send(answer), 1800);
        } else send(answer);
      };
    });
  });
  const page = await context.newPage();
  observe(page);
  await page.goto(url);
  await ready(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  const first = await generation(page);
  versionA = first[0].match(/:([a-f0-9]{24}):shell$/)[1];
  check('first visit installs and controls without reloading the title', (await page.evaluate(() => window.__godis.state())).title);
  const precached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((name) => name.endsWith(':shell'));
    return (await (await caches.open(name)).keys()).map((key) => key.url);
  });
  check('shell, decoder WASM, manifest, the boot models and Home Screen icons are precached',
    ['index.html', 'basis_transcoder-', 'packs/manifest.json?v=', 'packs/boot/big-candy.glb?v=', 'packs/boot/candy.glb?v=', 'packs/boot/jay.glb?v=', 'icons/ghost-180.png'].every((name) => precached.some((address) => address.includes(name))));
  check('visited runtime chapter pack loads online', await fetchPack(page, 0) === fixture[0]);
  await page.waitForFunction(async () => (await caches.keys()).some((name) => name.endsWith(':packs')));
  await context.setOffline(true);
  online = false;
  const beforeOffline = requests;
  await page.reload();
  await ready(page);
  check('a real offline reload restores WebGL and compressed boot models', (await page.evaluate(() => window.__godis.info())).compressedTextures > 0);
  check('runtime chapter pack works after offline reload', await fetchPack(page, 0) === fixture[0]);
  check('offline load reached no server', requests === beforeOffline);
  await page.locator('#startBtn').click();
  if (await page.locator('#firstAventyr').isVisible()) await page.locator('#firstAventyr').click();
  await page.waitForFunction(() => !window.__godis.state().title);
  const x = (await page.evaluate(() => window.__godis.state())).x;
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction((before) => window.__godis.state().x > before + 0.3, x, { timeout: 30000 });
  await page.keyboard.up('ArrowRight');
  check('the game is playable offline', (await page.evaluate(() => window.__godis.state())).x > x);
  await context.setOffline(false);
  online = true;

  // Two tabs: one active chapter, one title. Either tab alone must not interrupt the active chapter.
  const title = await context.newPage();
  observe(title);
  await title.goto(url);
  await ready(title);
  await page.evaluate(() => { window.__offlineSentinel = 'same chapter'; });
  deploy = 1;
  await update(page);
  await waiting(page);
  await title.bringToFront();
  await title.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.postMessage({ type: 'TRY_UPDATE' }));
  await title.waitForFunction(() => !document.getElementById('title').inert);
  // A complete vote takes up to 1.5 seconds for suspended tabs.
  await new Promise((resolve) => setTimeout(resolve, 1800));
  check('an update stays waiting while any tab is playing', await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting));
  check('the playing chapter is neither reloaded nor returned to title', await page.evaluate(() => window.__offlineSentinel === 'same chapter' && !window.__godis.state().title));
  check('old runtime cache remains usable while the next worker waits', await fetchPack(page, 0) === fixture[0]);
  check('the old worker does not delete the waiting worker\'s shell', (await generation(page)).some((name) => name.includes(versionB)));

  // Return the playing page to its title. Every tab can now agree to activate and reload safely.
  await title.evaluate(() => { window.__beforeUpdate = true; window.__blockUpdateVote = true; });
  await page.reload();
  await ready(page);
  await title.bringToFront();
  // Let startup/visibility votes abort, then simulate one temporarily suspended title response.
  await new Promise((resolve) => setTimeout(resolve, 1800));
  await title.waitForFunction(() => !document.getElementById('title').inert);
  await title.evaluate(async () => {
    window.__blockUpdateVote = false;
    window.__delayUpdateVote = true;
    (await navigator.serviceWorker.getRegistration()).waiting?.postMessage({ type: 'TRY_UPDATE' });
  });
  // It may already have reloaded while the other software-rendered page was warming its models.
  await title.waitForFunction(() => window.__godis && !window.__beforeUpdate, null, { timeout: 60000 });
  await ready(title);
  await ready(page);
  await title.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration()).waiting);
  check('the update activates and reloads at the title', (await title.evaluate(() => window.__godis.state())).title);
  check('one transient vote timeout retries safely without another user action', delayedVotes === 1);
  // Trigger cleanup after both reloaded clients have announced the new build.
  await title.evaluate(() => navigator.serviceWorker.controller.postMessage({ type: 'CLIENT_READY', urls: [] }));
  await title.waitForFunction(async (old) => !(await caches.keys()).some((name) => name.includes(old)), versionA, { timeout: 15000 });
  check('obsolete shell and runtime generations are removed only after clients update', !(await generation(title)).some((name) => name.includes(versionA)));
  check('same-name chapter asset fetches its new content revision', await fetchPack(title, 1) === fixture[1]);
  check('an uncached old revision cannot silently load the new same-name asset', await fetchPack(title, 0) === 'unavailable');
  await context.setOffline(true);
  online = false;
  await title.reload();
  await ready(title);
  check('the updated game also reloads offline', (await title.evaluate(() => window.__godis.state())).title);
  check('new runtime revision persists offline', await fetchPack(title, 1) === fixture[1]);
  check('Home Screen help is included in settings', await title.locator('#homeScreenHelp').count() === 1);
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'));
  check('manifest uses the Pages scope, Swedish name and standalone display', manifest.scope === BASE && manifest.start_url === BASE && manifest.lang === 'sv' && manifest.display === 'standalone');
  check('no external requests', external.length === 0);
  assert.deepEqual(failures, [], 'no page exceptions during install/offline/update');
  await context.close();
  console.log(`Offline browser checks: ${checked} passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
