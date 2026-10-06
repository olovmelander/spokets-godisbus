// A chapter's end and a chapter's beginning (docs/narrative-audit/threads.md §5.4): the coda before the last page,
// the page itself (the coda's picture, what comes next, Moa's way on, the tally), and the time card a chapter opens
// on. Run against a build.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';

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

async function open(name, options = {}, query = '?debug&standin&tier=low') {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, ...options });
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
    page,
    state: () => page.evaluate(() => window.__godis.state()),
    async finish() {
      assert.deepEqual(errors, [], `${name}: browser errors`);
      assert.deepEqual(external, [], `${name}: external requests`);
      await context.close();
    },
  };
}
/** Whether an element is wholly inside the window, as it is laid out now. */
const inView = (page, selector) => page.locator(selector).evaluate((node) => {
  const box = node.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
});

try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  console.log('endings: the coda and the last page of Gården');
  // A phone held either way, the iPad and a computer: the page is in view on each (story-presentation.md row 9).
  for (const [name, viewport] of [['garden-844x390', { width: 844, height: 390 }], ['garden-390x844', { width: 390, height: 844 }],
    ['garden-1180x820', { width: 1180, height: 820 }], ['garden-1440x900', { width: 1440, height: 900 }]]) {
    // No service worker: it would answer the next chapter's load itself, past the test's stand-in page.
    const { page, state, finish } = await open(name, { viewport, hasTouch: true, serviceWorkers: 'block' }, '?dev&debug&standin&course=garden&tier=low&at=207,0.01');
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.flags.includes('goal'), `${name}: the goal`, 90000);
    const reached = Date.now();
    await page.keyboard.up('ArrowRight');
    check(`${name}: no card at the goal itself: the coda plays first`, await page.locator('#endCard').isHidden());
    await page.waitForSelector('#endCard:not([hidden])', { timeout: 90000 });
    // The coda's seconds are counted in frame time, which never runs ahead of the clock.
    check(`${name}: the page comes after the coda`, Date.now() - reached >= 4000);
    check(`${name}: the coda's last picture is glued into the page`, await page.locator('#endPicture canvas').count() === 1
      && await page.locator('#endPicture').isVisible());
    check(`${name}: what comes next is the page's caption`, (await page.locator('#endStoryText').textContent()).length > 10
      && await page.locator('#endStory').isVisible());
    check(`${name}: Moa's map draws the way on`, await page.locator('#endMap path.way-on').count() === 1);
    check(`${name}: the page is headed by the chapter's name under its number, and gives the next one's code`, await page.locator('#endTitle').textContent() === 'Gården'
      && await page.locator('#endKicker').textContent() === 'Kapitel 1' && await page.locator('#endCodeWords').textContent() === 'GRAN KOTTE MOSSA');
    // The photo is a 3:2 print with Elof in it, not the whole screen's shape (row 6).
    check(`${name}: the photo is a 3:2 print`, await page.locator('#endPicture canvas').evaluate((c) => Math.abs(c.width / c.height - 1.5) < 0.02));
    check(`${name}: the story is the page's biggest reading`, await page.locator('#endStoryText').evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
      > await page.locator('#endCount').evaluate((node) => parseFloat(getComputedStyle(node).fontSize)));
    // Held sideways, nothing of the story is scrolled out of sight: the picture, the name and the way on.
    for (const selector of ['#endPicture', '#endTitle', '#endStory', '#endOnward']) {
      check(`${name}: ${selector} is in view`, await inView(page, selector));
    }
    await picture(page, `/tmp/endings-${name}.png`);
    if (name === 'garden-844x390') {
      // "Nästa kapitel" goes on into Granskogen: the page marks it, so the next load opens on its card, not the title.
      await page.route((url) => url.searchParams.get('course') === 'granskog', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>next</title>' }));
      const before = await page.evaluate(() => history.length);
      await page.locator('#endOnward').click();
      await page.waitForURL((url) => url.searchParams.get('course') === 'granskog', { timeout: 30000 });
      check(`${name}: Nästa kapitel marks Granskogen to open without the title`,
        await page.evaluate(() => sessionStorage.getItem('godisbus.v1.onward')) === 'granskog');
      // The chapter left behind is not a step back: Back must not reopen it and move the save back to it.
      check(`${name}: going on adds no step to Back`, await page.evaluate(() => history.length) === before);
    }
    await finish();
  }

  console.log('endings: a chapter opens on its time card');
  {
    const { page, state, finish } = await open('granskog-card', {}, '?dev&debug&standin&course=granskog&tier=low');
    await until(state, (s) => s.scene?.id === 'card' && s.scene.seconds > 0.9, 'the time card', 30000);
    check('granskog: the card says where and when', await page.locator('#sceneCaption').textContent() === 'Granskogen · halv tolv');
    check('granskog: the card does not hold him', !(await state()).held);
    const x = (await state()).x;
    await page.keyboard.down('ArrowRight');
    await until(state, (s) => s.x > x + 0.3, 'he sets off under the card', 30000);
    await page.keyboard.up('ArrowRight');
    check('granskog: he can set off at once', true);
    await finish();
  }
  {
    const { page, state, finish } = await open('garden-card', {}, '?dev&debug&standin&course=garden&tier=low');
    await until(state, (s) => s.scene?.id === 'card' && s.scene.seconds > 0.9, 'the time card', 30000);
    check('garden: Gården opens on its own card', await page.locator('#sceneCaption').textContent() === 'Gården · klockan tio');
    await until(state, (s) => s.flags.includes('scene:card'), 'the card ends', 30000);
    check('garden: nobody speaks from off screen as it opens', (await state()).said.length === 0);
    await finish();
  }
  console.log('endings: going on into a chapter opens it on its card, not the title');
  {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' });
    // As "Nästa kapitel" leaves it: this tab's session marks Granskogen, once.
    await context.addInitScript(() => {
      if (sessionStorage.getItem('test:seeded')) return;
      sessionStorage.setItem('test:seeded', '1');
      sessionStorage.setItem('godisbus.v1.onward', 'granskog');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    // Not a debug session: the public game, where every load used to open on the title.
    await page.goto(`${origin}${BASE}?dev&standin&course=granskog&tier=low`);
    await page.waitForFunction(() => document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('sceneCaption')?.textContent === 'Granskogen · halv tolv', null, { timeout: 30000 });
    check('onward: Granskogen opens on its card', true);
    check('onward: no title between the chapters', await page.locator('#title').isHidden());
    await page.reload();
    await page.waitForFunction(() => document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
    check('onward: opened again by hand, the game shows its title', await page.locator('#title').isVisible());
    assert.deepEqual(errors, [], 'onward: browser errors');
    await context.close();
  }
  console.log(`endings: ${checked} checks passed`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
