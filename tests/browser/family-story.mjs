// Actual input and story UI: an offered ride waits, and help is explained after the visible action.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { continueDialogue } from './dialogue.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/family-story'); mkdirSync(shots, { recursive: true });
const server = await createServer({ root, cacheDir: join(root, '.vite/family-story'),
  server: { host: '127.0.0.1', port: 0, watch: null, hmr: false,
    fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
function check(name, okay) { assert.ok(okay, name); console.log(`  ok   ${name}`); checks++; }
async function open(chapter, at, viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${origin}/spokets-godisbus/?dev&debug&standin&course=${chapter}&tier=low&at=${at}`);
  await page.waitForFunction(() => window.__godis?.state().bootReady &&
    document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await page.waitForFunction(() => window.__godis.state().steps > 30);
  await page.addStyleTag({ content: '#debug { display: none !important; }' });
  return { page, errors };
}
const state = page => page.evaluate(() => window.__godis.state());
const wait = (page, predicate) => page.waitForFunction(predicate, null, { timeout: 60000 });
try {
  const { page, errors } = await open('granskog', '154.6,-8', { width: 844, height: 390 });
  await wait(page, () => window.__godis.state().word === 'callBertil');
  await page.keyboard.press('KeyE');
  await wait(page, () => window.__godis.state().storyReading && document.getElementById('bubbleLine').textContent.includes('Kliv i när du vill'));
  const offered = await state(page);
  check('Bertil prepares the cap and explains the choice while Elof stays ashore', offered.flags.includes('cap:ready') &&
    offered.flags.includes('family:cap-ready') && !offered.flags.includes('cap') && offered.mode === 'free');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  const held = await state(page);
  check('reading the offer does not time out or move Elof towards the water', held.storyReading && held.steps === offered.steps && held.x === offered.x);
  await picture(page, join(shots, 'bertil-offer-844x390.png'));
  await continueDialogue(page);
  await wait(page, () => !window.__godis.state().storyReading);
  await page.keyboard.down('ArrowRight');
  await wait(page, () => window.__godis.state().word === 'capBoard');
  await page.keyboard.up('ArrowRight');
  check('the persistent portrait names Bertil and tells Elof how to board',
    await page.locator('#storyPurpose').getAttribute('data-guide') === 'bertil' &&
    await page.locator('#storyPurposeText').textContent() === 'Kliv i Bertils kepsbåt.');
  await page.waitForTimeout(800);
  check('the prepared boat still waits for a separate action', (await state(page)).mode === 'free' && !(await state(page)).flags.includes('cap'));
  await picture(page, join(shots, 'bertil-boarding-844x390.png'));
  await page.keyboard.press('KeyE');
  await wait(page, () => window.__godis.state().mode === 'ride');
  check('boarding starts the existing cap ride only after the explicit action', (await state(page)).flags.includes('cap'));
  assert.deepEqual(errors, [], 'Bertil browser errors'); await page.close();

  const mamma = await open('myren', '84.8,0', { width: 390, height: 844 });
  await wait(mamma.page, () => window.__godis.state().word === 'callMamma');
  await mamma.page.keyboard.press('KeyE');
  await wait(mamma.page, () => window.__godis.state().storyReading && document.getElementById('bubbleLine').textContent.includes('Följ stocken över'));
  const built = await state(mamma.page);
  check('Mamma finishes placing the stock before saying the bridge is ready', built.flags.includes('mamma') &&
    built.flags.includes('placed:pine') && built.flags.includes('beat:family:bridge-ready'));
  await picture(mamma.page, join(shots, 'mamma-bridge-ready-390x844.png'));
  await continueDialogue(mamma.page);
  await wait(mamma.page, () => !window.__godis.state().storyReading);
  await mamma.page.evaluate(() => document.body.classList.add('big-text'));
  check('Mamma’s completed bridge keeps its named next-action reminder',
    await mamma.page.locator('#storyPurpose').getAttribute('data-guide') === 'mamma' &&
    await mamma.page.locator('#storyPurpose').getAttribute('data-purpose') === 'bridgeCross');
  check('the helper portrait and larger text fit the portrait screen', await mamma.page.locator('#storyPurpose').evaluate(node => {
    const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom < innerHeight && node.scrollWidth <= node.clientWidth;
  }));
  await picture(mamma.page, join(shots, 'mamma-bridge-purpose-390x844.png'));
  assert.deepEqual(mamma.errors, [], 'Mamma browser errors'); await mamma.page.close();
  console.log(`Family story: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
