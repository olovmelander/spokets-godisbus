// Untimed goals, accessible recap and real saved-game/lifecycle integration in the source app.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/story-context');
mkdirSync(shots, { recursive: true });
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const base = `${origin}/spokets-godisbus/`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const frames = (page, count = 3) => page.evaluate((left) => new Promise((resolve) => {
  const tick = () => --left ? requestAnimationFrame(tick) : resolve(); requestAnimationFrame(tick);
}), count);
async function open(viewport = { width: 844, height: 390 }, save) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390 || viewport.width === 1180,
    reducedMotion: 'reduce', serviceWorkers: 'block' });
  if (save) await context.addInitScript((value) => localStorage.setItem('godisbus.v1.player.elof', JSON.stringify(value)), save);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return { page, context, finish: async () => { assert.deepEqual(errors, [], 'browser errors'); await context.close(); } };
}
async function ready(page) {
  await page.waitForFunction(() => window.__godis && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
  await frames(page);
}
const saved = (chapter, checkpoint, flags) => ({ v: 1, name: 'Elof', updated: 1,
  settings: { style: 'aventyr', sound: false, music: false, calm: true }, chapter, checkpoint,
  candy: {}, placed: {}, flags, playMs: 0 });
const state = (page) => page.evaluate(() => window.__godis.state());
const purpose = (page) => page.locator('#storyPurpose').getAttribute('data-purpose');

try {
  for (const [width, height, chapter, flags, expected] of [
    [390, 844, 'granskog', 'seesaw:trial', 'coneRetry'],
    [780, 360, 'norrsken', 'placed:tragubbe,eyes,bag', 'share'],
    [1180, 820, 'epilog', 'partied,knife', 'carve'],
    [1440, 900, 'garden', 'moa,plane:board', 'plane'],
  ]) {
    const { page, finish } = await open({ width, height });
    await page.goto(`${base}dev/menus.html?show=touch,purpose&chapter=${chapter}&flags=${flags}`);
    await page.waitForSelector('#storyPurpose:not([hidden])');
    await page.evaluate(() => document.body.classList.add('big-text'));
    check(`${width}×${height}: current purpose is the real story stage`, await purpose(page) === expected);
    const layout = await page.evaluate(() => {
      const node = document.getElementById('storyPurpose'), rect = node.getBoundingClientRect();
      const help = document.getElementById('helpBtn').getBoundingClientRect();
      const bag = document.getElementById('bag').getBoundingClientRect();
      return { inside: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        readable: node.scrollWidth <= node.clientWidth, clear: rect.right <= help.left && rect.top >= bag.bottom,
        animated: node.getAnimations({ subtree: true }).length, live: node.getAttribute('aria-live') };
    });
    check(`${width}×${height}: big text fits below the bag and beside the helper`, layout.inside && layout.readable && layout.clear);
    check(`${width}×${height}: reminder is untimed and politely announced`, layout.animated === 0 && layout.live === 'polite');
    await page.screenshot({ path: join(shots, `purpose-${width}x${height}.png`) });
    await page.evaluate(() => { document.getElementById('bubble').hidden = false; });
    check(`${width}×${height}: temporary dialogue can be read without overlap`, await page.locator('#storyPurpose').evaluate((node) => getComputedStyle(node).visibility === 'hidden'));
    await page.evaluate(() => { document.getElementById('bubble').hidden = true; });
    check(`${width}×${height}: purpose returns without a timer or progress change`, await purpose(page) === expected && await page.locator('#storyPurpose').isVisible());
    await finish();
  }

  // The same production reminder and pause recap at the loops' authored local positions.
  const loops = await open({ width: 390, height: 844 });
  for (const [name, chapter, flags, x, y, expected, wording] of [
    ['called-plane', 'garden', 'moa', 166, 0, 'planeBoard', 'Kliv på Moas pappersplan.'],
    ['optional-drawing', 'garden', 'moa,placed:bridge,garden:pocket-open', 141.8, 3.3, 'gardenPocket', 'Jag kan hämta Moas lövteckning.'],
    ['drawing-climb', 'garden', 'moa,placed:bridge,garden:pocket-open,garden:paper', 141.1, -2, 'gardenClimb', 'Klättra upp längs slangen.'],
    ['drawing-return', 'garden', 'moa,placed:bridge,garden:pocket-open,garden:paper', 164.1, 0, 'gardenReturnDrawing', 'Jag kan visa Moa lövteckningen.'],
    ['skip-drawing', 'garden', 'moa,placed:bridge,garden:pocket-open,garden:paper,plane:board', 172, 4, 'plane', 'Flyg med Moas pappersplan.'],
    ['lantern-loop', 'myren', 'home,bog:return-bridge,placed:bog-boardwalk', 160, 0.3, 'bogLantern', 'Jag kan gå tillbaka till gläntan.'],
    ['lantern-return', 'myren', 'home,bog:return-bridge,placed:bog-boardwalk,bog:lantern-return', 155, 0.3, 'bogReturn', 'Gå tillbaka till tranan när jag vill.'],
    ['main-crane-route', 'myren', 'home,bog:return-bridge,placed:bog-boardwalk,bog:lantern-return,crane', 176, 8, 'crane', 'Flyg med tranan till berget.'],
    ['high-cairn-return', 'berget', 'lift,found:chokladpralin', 150, 40.9, 'mountainReturn', 'Välj snöret eller hyllorna ner.'],
    ['cairn-plot-resumes', 'berget', 'lift,found:chokladpralin,memory', 150, 31.4, 'figure', 'Hämta hem min första trägubbe.'],
  ]) {
    const { page } = loops;
    await page.goto(`${base}dev/menus.html?show=touch,purpose&chapter=${chapter}&flags=${flags}&x=${x}&y=${y}`);
    await page.waitForSelector('#storyPurpose:not([hidden])');
    check(`${name}: normal play shows the applicable local action and the same pause purpose`,
      await purpose(page) === expected && await page.locator('#storyPurposeText').textContent() === wording &&
      await page.locator('#pauseStoryPurpose').textContent() === wording && await page.locator('#storyPurpose').isVisible());
    await page.evaluate(() => document.body.classList.add('big-text'));
    check(`${name}: the optional reminder stays readable in larger phone text`, await page.locator('#storyPurpose').evaluate((node) => {
      const rect = node.getBoundingClientRect(); return node.scrollWidth <= node.clientWidth && rect.left >= 0 && rect.right <= innerWidth;
    }));
  }
  await loops.finish();

  const resumed = await open({ width: 844, height: 390 }, saved('granskog', 7, { granskog: ['seesaw'] }));
  await resumed.page.goto(`${base}?dev&debug&standin&course=granskog&tier=low&title`);
  await ready(resumed.page);
  check('restored checkpoint gets its next action on the title card', await resumed.page.locator('#titleStoryPurpose').textContent() === 'Rulla kotten till gungbrädan.' && await purpose(resumed.page) === 'cone');
  check('title context keeps the existing start-button focus', await resumed.page.locator('#startBtn').evaluate((node) => document.activeElement === node));
  await resumed.page.click('#startBtn');
  await resumed.page.waitForFunction(() => !window.__godis.state().title);
  await resumed.page.keyboard.press('Escape');
  await resumed.page.waitForSelector('#pause:not([hidden])');
  await frames(resumed.page);
  check('pause recap explains the purpose and Pappa’s practical help', await resumed.page.locator('#pauseStoryPurpose').textContent() === 'Rulla kotten till gungbrädan.' && (await resumed.page.locator('#pauseStoryFamily').textContent()).includes('Pappa bygger gungbrädan'));
  check('pause recap is the first section after resume with a named region', await resumed.page.locator('#pauseStory').evaluate((node) => node.previousElementSibling.id === 'resumeBtn' && node.getAttribute('aria-labelledby') === 'pauseStoryTitle'));
  check('pause keeps the existing resume-button focus and hides the field goal', await resumed.page.locator('#resumeBtn').evaluate((node) => document.activeElement === node) && await resumed.page.locator('#storyPurpose').isHidden());
  const before = await state(resumed.page), recap = await resumed.page.locator('#pauseStory').textContent();
  await frames(resumed.page, 20);
  check('reading the untimed pause recap leaves simulation and context frozen', (await state(resumed.page)).steps === before.steps && await resumed.page.locator('#pauseStory').textContent() === recap);
  check('the candy counter identifies recovered sweets while the ghost has the original bag', (await resumed.page.locator('#bag').getAttribute('aria-label')).startsWith('Upphittat godis:') && await resumed.page.locator('#bag').getAttribute('title') === 'Upphittat godis');
  await resumed.page.screenshot({ path: join(shots, 'pause-resumed.png') });
  await resumed.page.click('#resumeBtn');
  await resumed.page.evaluate(() => {
    window.__contextLoss = document.getElementById('game').getContext('webgl2').getExtension('WEBGL_lose_context');
    window.__contextLoss.loseContext();
  });
  await resumed.page.waitForFunction(() => window.__godis.state().contextLost);
  await frames(resumed.page);
  const lost = await state(resumed.page);
  check('context loss hides the reminder and leaves recovery focus intact', await resumed.page.locator('#storyPurpose').isHidden() && await resumed.page.locator('#messageButton').evaluate((node) => document.activeElement === node));
  await frames(resumed.page, 20);
  check('context loss cannot advance the next purpose or chapter progress', (await state(resumed.page)).steps === lost.steps && await purpose(resumed.page) === 'cone');
  await resumed.page.evaluate(() => window.__contextLoss.restoreContext());
  await resumed.page.waitForFunction(() => !window.__godis.state().contextLost && !document.getElementById('messageButton').disabled, null, { timeout: 60000 });
  await resumed.page.click('#messageButton');
  await frames(resumed.page);
  check('restoring the picture restores the same current-purpose reminder', await purpose(resumed.page) === 'cone' && !(await resumed.page.locator('#storyPurpose').isHidden()));
  await resumed.finish();

  const genericMotive = 'Spöket tog godiset för att välkomna trägubben hem!';
  const unknown = await open({ width: 390, height: 844 });
  await unknown.page.goto(`${base}?dev&debug&standin&course=norrsken&tier=low&at=2.4,0`);
  await ready(unknown.page);
  check('a direct early summit start has no identity or candy-motive spoiler', await purpose(unknown.page) === 'crack' && !/första|välkommen|tog godiset för/.test(await unknown.page.locator('#pauseStory').textContent()));
  check('the normal-play motive remains absent before the actual rescue prerequisites', await unknown.page.locator('#storyPurposeReveal').isHidden() && await unknown.page.locator('#storyPurposeReveal').textContent() === '');
  await unknown.page.goto(`${base}?dev&debug&standin&course=norrsken&tier=low&at=18.8,0&flags=placed:tragubbe,eyes`);
  await ready(unknown.page);
  await unknown.page.evaluate(() => { document.getElementById('debug').hidden = true; });
  check('the rescued figure without its returned bag still does not reveal the motive',
    await purpose(unknown.page) === 'bag' && await unknown.page.locator('#storyPurposeReveal').isHidden());
  await unknown.page.keyboard.press('e');
  await unknown.page.waitForFunction(() => window.__godis.state().flags.includes('bag'));
  await unknown.page.locator('#storyPurposeReveal').waitFor({ state: 'visible' });
  check('actually taking the bag reveals the motive without requiring the optional mountain memory',
    await purpose(unknown.page) === 'share' && await unknown.page.locator('#storyPurposeReveal').textContent() === genericMotive &&
    !(await state(unknown.page)).paused && await unknown.page.locator('[role=dialog]:visible').count() === 0);
  check('the fallback explains the welcome without inventing the old figure’s identity',
    (await unknown.page.locator('#pauseStoryRecap').textContent()).includes(genericMotive) &&
    !/min gamla|min första/.test(await unknown.page.locator('#storyPurpose, #pauseStory').allTextContents().then((texts) => texts.join(' '))));
  await unknown.page.evaluate(() => document.body.classList.add('big-text'));
  check('the fallback is untimed and readable in larger phone text during play', await unknown.page.locator('#storyPurpose').evaluate((node) => {
    const rect = node.getBoundingClientRect(), help = document.getElementById('helpBtn').getBoundingClientRect();
    return node.scrollWidth <= node.clientWidth && rect.left >= 0 && rect.right <= help.left && rect.bottom < innerHeight / 2 &&
      node.getAnimations({ subtree: true }).length === 0;
  }));
  await frames(unknown.page, 20);
  check('missing the memory cannot make the normal-play explanation expire',
    await unknown.page.locator('#storyPurposeReveal').isVisible() && await unknown.page.locator('#storyPurposeReveal').textContent() === genericMotive);
  await unknown.page.screenshot({ path: join(shots, 'finale-motive-without-memory.png') });
  for (const [sweet, friend] of [['karamell', 'tragubbe'], ['lingon', 'jay'], ['skumbanan', 'spoket']]) {
    await unknown.page.keyboard.press('e');
    await unknown.page.waitForSelector('#storyPanel:not([hidden])');
    await unknown.page.locator(`[data-sweet="${sweet}"]`).click();
    await unknown.page.locator(`[data-friend="${friend}"]`).click();
    await unknown.page.waitForSelector('#storyPanel', { state: 'hidden' });
  }
  await unknown.page.waitForFunction(() => window.__godis.state().flags.includes('shared'));
  await unknown.page.locator('#storyPurposeReveal').waitFor({ state: 'visible' });
  check('actually sharing keeps the generic motive in normal play and the later recap',
    await purpose(unknown.page) === 'gold' && await unknown.page.locator('#storyPurposeReveal').textContent() === genericMotive &&
    (await unknown.page.locator('#pauseStoryRecap').textContent()).includes(genericMotive) && !(await state(unknown.page)).paused);
  await unknown.finish();

  const home = await open({ width: 390, height: 844 }, saved('epilog', 0, { norrsken: ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste', 'home'] }));
  await home.page.goto(`${base}?dev&debug&standin&course=epilog&tier=low&title`);
  await ready(home.page);
  check('resuming at home retains the generic motive from saved summit receipts on the title card',
    (await home.page.locator('#titleStoryRecap').textContent()).includes(genericMotive) &&
    !/min gamla|min första/.test(await home.page.locator('#titleStoryRecap').textContent()));
  await home.page.click('#startBtn');
  await home.page.waitForFunction(() => !window.__godis.state().title);
  await home.page.keyboard.press('Escape');
  await home.page.waitForSelector('#pause:not([hidden])');
  await frames(home.page);
  check('the epilogue pause recap keeps that saved motive without granting the missed identity',
    (await home.page.locator('#pauseStoryRecap').textContent()).includes(genericMotive) &&
    !/min gamla|min första/.test(await home.page.locator('#pauseStoryRecap').textContent()));
  await home.page.screenshot({ path: join(shots, 'epilogue-motive-without-memory.png') });
  await home.finish();

  const unfinished = await open({ width: 390, height: 844 }, saved('epilog', 0, { norrsken: ['placed:tragubbe', 'eyes'] }));
  await unfinished.page.goto(`${base}?dev&debug&standin&course=epilog&tier=low&title`);
  await ready(unfinished.page);
  check('a resumed epilogue cannot invent the motive if the saved bag-return receipt is absent',
    !(await unfinished.page.locator('#titleStoryRecap').textContent()).includes(genericMotive) &&
    !/min gamla|min första/.test(await unfinished.page.locator('#titleStoryRecap').textContent()));
  await unfinished.finish();

  const known = await open({ width: 390, height: 844 }, saved('norrsken', 1, { berget: ['memory'] }));
  await known.page.goto(`${base}?dev&debug&standin&course=norrsken&tier=low&at=18.8,0&flags=placed:tragubbe,eyes`);
  await ready(known.page);
  // Inspect the player-facing HUD; the opt-in debug inspector otherwise covers this corner.
  await known.page.evaluate(() => { document.getElementById('debug').hidden = true; });
  check('even a remembered rescue keeps the motive hidden until the bag is returned', await purpose(known.page) === 'bag' && await known.page.locator('#storyPurposeReveal').isHidden());
  await known.page.keyboard.press('e');
  await known.page.waitForFunction(() => window.__godis.state().flags.includes('bag'));
  check('the rescue and actual mountain memory reveal the welcome-home purpose', await purpose(known.page) === 'welcome' && (await known.page.locator('#pauseStoryRecap').textContent()).includes('Spöket tog godiset för att'));
  await known.page.locator('#storyPurposeReveal').waitFor({ state: 'visible' });
  check('normal play explicitly explains why the ghost took the candy without a pause or dialog',
    (await known.page.locator('#storyPurposeReveal').textContent()).includes('Spöket tog godiset för att välkomna min gamla trägubbe hem') &&
    !(await state(known.page)).paused && await known.page.locator('[role=dialog]:visible').count() === 0);
  await known.page.evaluate(() => document.body.classList.add('big-text'));
  check('the untimed motive is readable on the phone with larger text', await known.page.locator('#storyPurpose').evaluate((node) => {
    const rect = node.getBoundingClientRect(), help = document.getElementById('helpBtn').getBoundingClientRect();
    return node.scrollWidth <= node.clientWidth && rect.left >= 0 && rect.right <= help.left && rect.bottom < innerHeight / 2;
  }));
  const learned = await known.page.locator('#storyPurposeReveal').textContent();
  await frames(known.page, 20);
  check('the normal-play explanation persists while the game continues', await known.page.locator('#storyPurposeReveal').isVisible() && await known.page.locator('#storyPurposeReveal').textContent() === learned);
  await known.page.screenshot({ path: join(shots, 'finale-motive-playing.png') });
  for (const [sweet, friend] of [['karamell', 'tragubbe'], ['lingon', 'jay'], ['skumbanan', 'spoket']]) {
    await known.page.keyboard.press('e');
    await known.page.waitForSelector('#storyPanel:not([hidden])');
    await known.page.locator(`[data-sweet="${sweet}"]`).click();
    await known.page.locator(`[data-friend="${friend}"]`).click();
    await known.page.waitForSelector('#storyPanel', { state: 'hidden' });
  }
  await known.page.waitForFunction(() => window.__godis.state().flags.includes('shared'));
  await known.page.locator('#storyPurposeReveal').waitFor({ state: 'visible' });
  check('actually sharing the candy keeps the learned motive in normal play and the later recap',
    await purpose(known.page) === 'gold' && await known.page.locator('#storyPurposeReveal').textContent() === learned &&
    (await known.page.locator('#pauseStoryRecap').textContent()).includes('välkommen-hem-kalas') &&
    !(await state(known.page)).paused);
  await known.page.keyboard.press('Escape');
  await known.page.waitForSelector('#pause:not([hidden])');
  await known.page.screenshot({ path: join(shots, 'finale-understanding.png') });
  await known.finish();

  const ending = await open();
  await ending.page.goto(`${base}?dev&debug&standin&course=granskog&tier=low&at=204.6,-8&flags=placed:rescue`);
  await ready(ending.page);
  await ending.page.waitForSelector('#endCard:not([hidden])', { timeout: 15000 });
  check('the existing chapter card explains why the next place follows', await ending.page.locator('#endStoryTitle').textContent() === 'Spöket väntar på mig' && (await ending.page.locator('#endStoryText').textContent()).includes('Jag hjälpte det ur vattnet'));
  check('transition context preserves onward focus without opening another dialog', await ending.page.locator('#endOnward').evaluate((node) => document.activeElement === node) && await ending.page.locator('[role=dialog]:visible').count() === 1);
  check('the transition explanation stays visible beside the focused next action', await ending.page.locator('#endStory').evaluate((node) => {
    const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight;
  }));
  await ending.page.screenshot({ path: join(shots, 'forest-handoff.png') });
  await ending.finish();
  console.log(`Story context: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
