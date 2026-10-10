// Real DOM animation/lifecycle checks, independent of the renderer and private family models.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { picture } from './picture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null } });
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
    const { spriteHtml } = await import('/src/ui/sprite.ts');
    const { applyMaterials } = await import('/src/ui/materials.ts');
    document.body.innerHTML = spriteHtml() + '<button id="source" style="position:absolute;left:70px;top:180px;width:60px;height:40px">▶</button>';
    applyMaterials(document);
    mountShell(document.body, 'ghost');
    // In the game the typeface has long arrived when a memory opens; here it must not arrive in the middle of one.
    await Promise.all([document.fonts.load('400 16px Andika'), document.fonts.load('700 16px Andika')]);
    window.memory = createMemory(document);
    window.finished = 0;
    window.playMemory = (options = {}) => {
      document.getElementById('source').focus();
      const rect = document.getElementById('source').getBoundingClientRect();
      window.memory.play(options.chapter ?? 'garden', () => { window.finished++; }, {
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
      transform: getComputedStyle(panel).transform, opacity: card.firstElementChild ? getComputedStyle(card.firstElementChild).opacity : null,
      picture: document.getElementById('memoryProgress').textContent,
      times: document.getAnimations().map((animation) => animation.currentTime) };
  });
  check('memory controls use installed icon artwork', await page.evaluate(() => [...document.querySelectorAll('#memory use')]
    .every((use) => document.querySelector(use.getAttribute('href')))));
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
  check('the painting grows to its full reading size', full.width > start.width * 10 && full.centre.x > 180, { start, full });
  check('the next button owns focus throughout opening', full.focus === 'memoryNext');
  const repeats = await page.evaluate(() => {
    const next = document.getElementById('memoryNext');
    return ['ArrowRight', 'ArrowLeft', 'Enter', ' '].every((key) => {
      const event = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
      next.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  check('held movement and activation keys cannot race through a newly opened memory', repeats && (await snapshot()).picture === '1 / 3');
  await page.locator('#memoryNext').tap();
  await sleep(80);
  await page.evaluate(() => window.memory.suspend(true));
  start = await snapshot();
  await sleep(420);
  held = await snapshot();
  check('interruption freezes a picture fade and all illustrated layers', held.opacity === start.opacity && held.picture === '2 / 3' && JSON.stringify(held.times) === JSON.stringify(start.times));
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
      if (mode === 'saved') document.documentElement.dataset.motion = 'reduce';
      else delete document.documentElement.dataset.motion;
      window.playMemory({ calm: mode === 'option' }); window.memory.suspend(true);
    }, mode);
    start = await snapshot();
    check(`${mode} reduced motion uses a fade in the reading layout without travel`, start.transform === 'none' && start.centre.x > 180 && start.width > 200);
    await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); delete document.documentElement.dataset.motion; });
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
  await sleep(3600);
  check('the final picture waits for the reader instead of returning automatically', (await snapshot()).open && (await snapshot()).picture === '3 / 3');
  await page.locator('#memoryPrevious').click();
  check('the previous button revisits a picture and its caption', (await snapshot()).picture === '2 / 3' && (await page.locator('#memoryCaption').textContent()).includes('ger trägubben'));
  await page.locator('#memoryCard').click();
  check('tapping the painting does not skip its story', (await snapshot()).picture === '2 / 3');
  await page.keyboard.press('ArrowLeft');
  check('left arrow revisits the opening and disables previous at the start', (await snapshot()).picture === '1 / 3' && await page.locator('#memoryPrevious').isDisabled());
  await sleep(3600);
  check('the opening picture also waits as long as the reader needs', (await snapshot()).picture === '1 / 3');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.locator('#memoryNext').click();
  await page.waitForFunction(() => !window.memory.open);
  check('the explicit last button returns focus to the source', (await snapshot()).focus === 'source');

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
    await picture(page, join(shots, `${width}x${height}.png`));
    await page.evaluate(() => { window.memory.close(); window.memory.suspend(false); });
  }
  for (const [width, height] of [[390, 844], [780, 360]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      document.body.classList.add('big-text');
      window.playMemory({ chapter: 'berget', calm: true });
      const next = document.getElementById('memoryNext'); next.click(); next.click(); next.click();
    });
    const fits = await page.evaluate(() => {
      const panel = document.querySelector('.memory-panel');
      return ['memoryClose', 'memoryCaption', 'memoryNext', 'memoryPrevious'].every((id) => {
        const rect = document.getElementById(id).getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
      }) && panel.scrollWidth <= panel.clientWidth;
    });
    check(`${width}×${height}: the final caption and full return button fit with large text`, fits);
    await picture(page, join(shots, `${width}x${height}-final-bigtext.png`));
    await page.evaluate(() => { window.memory.close(); document.body.classList.remove('big-text'); });
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  for (const chapter of ['garden', 'granskog', 'myren', 'berget']) {
    await page.evaluate((chapter) => window.playMemory({ chapter, calm: true }), chapter);
    const count = chapter === 'berget' ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const label = await page.locator('#memoryCard').getAttribute('aria-label');
      check(`${chapter} picture ${i + 1} has matching visible and accessible storytelling`, label === await page.locator('#memoryCaption').textContent() && label.length > 15);
      await picture(page, join(shots, `${chapter}-${i + 1}.png`));
      if (i < count - 1) await page.locator('#memoryNext').click();
    }
    await page.evaluate(() => window.memory.close());
  }
  check('presentation makes no browser errors', errors.length === 0);
  console.log(`${checks} memory-presentation browser checks passed.`);
} finally {
  await browser?.close();
  await server.close();
}
