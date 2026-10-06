// Character-only shadow variants, actual shader warmup and release on tier changes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { settingsPage } from './pause.mjs';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
const BASE = '/spokets-godisbus/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const frames = (page, n = 6) => page.evaluate((n) => new Promise((resolve) => { function next() { if (--n === 0) resolve(); else requestAnimationFrame(next); } requestAnimationFrame(next); }), n);
const info = (page) => page.evaluate(() => window.__godis.info());
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [course, at] of [['garden', '4,6.01'], ['granskog', '36,0'], ['myren', '181,0'], ['epilog', '9,0']]) {
    if (process.env.SHADOW_COURSE && course !== process.env.SHADOW_COURSE) continue;
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${origin}${BASE}?dev&debug&standin&course=${course}&at=${at}&tier=low`);
    await page.waitForFunction(() => window.__godis?.state().bootReady && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
    await frames(page);
    await page.keyboard.press('Escape');
    for (const tier of (process.env.SHADOW_VISUAL ? ['low', 'mid', 'high'] : course === 'garden' ? ['low', 'mid', 'high', 'mid', 'high', 'low'] : ['low', 'mid', 'high', 'low'])) {
      await settingsPage(page);
      await page.click(`#graphics${tier[0].toUpperCase()}${tier.slice(1)}`);
      await frames(page);
      const drawn = await info(page);
      check(`${course} ${tier}: correct contact/map variant`, drawn.shadows.characters >= 1 && drawn.shadows.contact === (tier !== 'low') && drawn.shadows.mapSize === (tier === 'high' ? 1024 : 0));
      check(`${course} ${tier}: bounded draws`, withinDraws(drawn.drawCalls, drawn.tier));
      await page.click('#pauseClose');
      const programs = (await info(page)).programs;
      await frames(page);
      check(`${course} ${tier}: no shader compiled during play`, (await info(page)).programs === programs);
      if (course === 'garden' && tier === 'high' && process.env.SHADOW_SCREENSHOT) {
        await picture(page, process.env.SHADOW_SCREENSHOT);
      }
      await page.keyboard.press('Escape');
    }
    check(`${course}: no shader/page errors`, errors.length === 0);
    await context.close();
  }
  console.log(`${checks} character-shadow browser checks passed.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
