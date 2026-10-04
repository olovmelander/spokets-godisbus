// Real DOM animation/lifecycle checks, independent of the renderer and private family models.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let browser, checks = 0;
function check(name, value, detail) { assert.ok(value, detail ? `${name}: ${JSON.stringify(detail)}` : name); checks++; console.log(`  ok   ${name}`); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shots = join(root, 'docs/shots/_work/memory-presentation');
mkdirSync(shots, { recursive: true });
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.route('**/memory-test.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body></body>' }));
  await page.goto(`${origin}memory-test.html`);
  await page.evaluate(async () => {
    await import('/src/ui/ui.css');
    const { createMemory } = await import('/src/ui/memory.ts');
    const { mountShell } = await import('/src/ui/shell.ts');
    document.body.innerHTML = '<button id="source" style="position:absolute;left:70px;top:180px;width:60px;height:40px">▶</button>';
    mountShell(document.body, 'ghost');
    window.memory = createMemory(document);
    window.finished = 0;
    window.playMemory = (options = {}) => {
      document.getElementById('source').focus();
      const rect = document.getElementById('source').getBoundingClientRect();
      window.memory.play('garden', () => { window.finished++; }, {
        origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, ...options,
      });
    };
  });
  const snapshot = () => page.evaluate(() => {
    const card = document.getElementById('memoryCard'), panel = document.querySelector('.memory-panel');
    const rect = card.getBoundingClientRect();
    return { phase: document.getElementById('memory').dataset.phase, open: window.memory.open,
      finished: window.finished, focus: document.activeElement.id,
      centre: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, width: rect.width,
      transform: getComputedStyle(panel).transform, opacity: getComputedStyle(card.firstElementChild).opacity,
      picture: document.getElementById('memoryProgress').textContent,
      times: document.getAnimations().map((animation) => animation.currentTime) };
  });
  await page.evaluate(() => { window.playMemory(); window.memory.suspend(true); });
  await sleep(80);
  let start = await snapshot();
  check('the opening oval starts at its visible source', Math.abs(start.centre.x - 100) < 1 && Math.abs(start.centre.y - 200) < 1);
  check('the opening picture is readable by assistive technology', await page.locator('#memoryCard[role="img"][aria-label]').count());
  await sleep(420);
  let held = await snapshot();
  check('interruption freezes opening geometry and animation time', JSON.stringify(held.times) === JSON.stringify(start.times) && held.width === start.width && held.phase === 'opening');
  await page.locator('#memoryNext').tap();
  check('suspended input cannot skip a picture', (await snapshot()).picture === '1 / 3');
  await page.evaluate(() => window.memory.suspend(false));
  await page.waitForFunction(() => document.getElementById('memory').dataset.phase === 'pictures');
  let full = await snapshot();
  check('the oval grows to its full central size', full.width > start.width * 10 && full.centre.x > 300);
  check('the next button owns focus throughout opening', full.focus === 'memoryNext');
  await page.locator('#memoryNext').tap();
  await sleep(80);
  await page.evaluate(() => window.memory.suspend(true));
  start = await snapshot();
  await sleep(420);
  held = await snapshot();
  check('interruption freezes a picture fade and its playback timer', held.opacity === start.opacity && held.picture === '2 / 3' && JSON.stringify(held.times) === JSON.stringify(start.times));
  await page.evaluate(() => window.memory.close());
  let closed = await snapshot();
  check('cancellation is immediate, releases animations and calls done once', !closed.open && closed.finished === 1 && closed.times.length === 0);
  check('cancellation restores the originating control', closed.focus === 'source');
  await page.evaluate(() => { window.memory.suspend(false); window.playMemory(); window.memory.close(); window.playMemory(); });
  await sleep(450);
  check('canceled animation promises cannot close a newer playback', (await snapshot()).open && (await snapshot()).finished === 2);
  await page.evaluate(() => {
    // Move through all cards without waiting; the last tap returns the oval to its source.
    const next = document.getElementById('memoryNext'); next.click(); next.click(); next.click();
    window.memory.suspend(true);
  });
  start = await snapshot();
  check('the final picture starts a return while still owning the overlay', start.open && start.phase === 'returning' && start.finished === 2);
  await sleep(420);
  held = await snapshot();
  check('interruption also freezes the return and defers done', held.phase === 'returning' && held.finished === 2 && held.width === start.width && JSON.stringify(held.times) === JSON.stringify(start.times));
  await page.evaluate(() => window.memory.suspend(false));
  await page.waitForFunction(() => !window.memory.open);
  closed = await snapshot();
  check('return completes once and restores focus', closed.finished === 3 && closed.focus === 'source' && closed.times.length === 0);

  // All reduced-motion sources avoid travel/scale, including saved calm even without an option.
  for (const mode of ['option', 'saved', 'system']) {
    await page.emulateMedia({ reducedMotion: mode === 'system' ? 'reduce' : 'no-preference' });
    await page.evaluate((mode) => {
      document.body.classList.toggle('calm', mode === 'saved');
      window.playMemory({ calm: mode === 'option' }); window.memory.suspend(true);
    }, mode);
    start = await snapshot();
    check(`${mode} reduced motion uses a centred fade without travel`, start.transform === 'none' && start.centre.x > 300 && start.width > 200);
    await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); document.body.classList.remove('calm'); });
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const value of [null, { x: -10, y: 20 }, { x: NaN, y: 20 }]) {
    await page.evaluate((origin) => { window.playMemory({ origin }); window.memory.suspend(true); }, value);
    check('missing or invalid sources fall back to a centred fade', (await snapshot()).transform === 'none');
    await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); });
  }
  await page.evaluate(() => window.playMemory());
  await page.waitForFunction(() => document.getElementById('memory').dataset.phase === 'pictures');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const next = document.getElementById('memoryNext'); next.click(); next.click(); next.click();
    window.memory.suspend(true);
  });
  check('rotation uses a fade instead of returning to a stale world position', (await snapshot()).phase === 'returning' && (await snapshot()).transform === 'none');
  await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => { window.playMemory(); window.memory.suspend(true); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.memory.suspend(false));
  start = await snapshot();
  check('a rotated, suspended entrance resumes at the new centre', start.transform === 'none' && start.centre.x > 100 && start.centre.x < 290, start);
  await page.waitForFunction(() => document.getElementById('memory').dataset.phase === 'pictures');
  await page.evaluate(() => {
    const next = document.getElementById('memoryNext'); next.click(); next.click(); next.click();
    window.memory.suspend(true);
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.memory.suspend(true));
  check('a resized return remains centred and interrupted', (await snapshot()).transform === 'none' && (await snapshot()).open && (await snapshot()).phase === 'returning');
  await page.evaluate(() => window.memory.suspend(false));
  await page.waitForFunction(() => !window.memory.open);
  await page.evaluate(() => {
    window.memory.suspend(true); window.playMemory();
  });
  check('starting while suspended still shows the first picture safely', (await snapshot()).picture === '1 / 3');
  await page.evaluate(() => window.memory.suspend(false));
  await page.waitForFunction(() => document.getElementById('memory').dataset.phase === 'pictures');
  await page.evaluate(() => { document.getElementById('memoryNext').click(); document.getElementById('memoryNext').click(); });
  await page.waitForFunction(() => !window.memory.open, null, { timeout: 4000 });
  check('the final picture also returns automatically', (await snapshot()).focus === 'source');

  for (const [width, height] of [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.playMemory());
    await page.waitForFunction(() => document.getElementById('memory').dataset.phase === 'pictures');
    await page.evaluate(() => window.memory.suspend(true));
    const fits = await page.evaluate(() => {
      const card = document.getElementById('memoryCard').getBoundingClientRect();
      const panel = document.querySelector('.memory-panel').getBoundingClientRect();
      return card.left >= 0 && card.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight;
    });
    check(`${width}×${height}: the oval and controls fit`, fits);
    await page.screenshot({ path: join(shots, `${width}x${height}.png`) });
    await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); });
  }
  check('presentation makes no browser errors', errors.length === 0);
  console.log(`${checks} memory-presentation browser checks passed.`);
} finally {
  await browser?.close();
  await server.close();
}
