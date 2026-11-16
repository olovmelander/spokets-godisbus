// Production TV entry/return, native RAF and real controls. Run after npm run build.
// HOME_CONSOLE_DIST may point at an immutable production build used by a parallel review.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = '/spokets-godisbus/';
const DIST = process.env.HOME_CONSOLE_DIST ? resolve(process.env.HOME_CONSOLE_DIST) : fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
assert.ok(existsSync(join(DIST, 'index.html')), 'Bygg spelet före webbläsartestet.');
const kartFiles = readdirSync(join(DIST, 'assets')).filter(file => file.endsWith('.js') && readFileSync(join(DIST, 'assets', file), 'utf8').includes('kart-intro'));
assert.equal(kartFiles.length, 1, 'TV-spelet ska ha en separat, igenkännbar modul.');
const kartPath = `${BASE}assets/${kartFiles[0]}`;
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = join(DIST, normalize(path.slice(BASE.length) || 'index.html'));
  if (!path.startsWith(BASE) || !file.startsWith(DIST) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const cases = new Set((process.env.HOME_CONSOLE_CASES ?? 'homes,race,save,loading,page').split(','));
let browser, checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const FLAGS = {
  prolog: ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar', 'mamma:passed'],
  epilog: ['scene:card', 'dots', 'scene:first-carving'],
  // After the power cut the TV is dark and its game is not offered (Olov, 12 November 2026: "Man ska inte kunna spela
  // på TV:n när strömmen gått."): checked below, at the TV, that it never opens.
  stormkvall: ['scene:kvall', 'candles', 'lamp:take', 'lamp:give', 'goodnight', 'scene:fonstret', 'scene:klonkstar', 'star', 'scene:krymper', 'scene:upptackt', 'scene:tillsammans'],
  morgonen: ['scene:frukost'],
};
const SAVED_FLAGS = ['scene:card', 'partied', 'scene:klonk-table', 'beat:klonk', 'beat:named', 'knife', 'beat:away',
  ...['mamma', 'pappa', 'moa', 'bertil', 'spoket'].flatMap(who => [`party:${who}`, `beat:partyThanks:${who}`])];
const world = state => Object.fromEntries(['x', 'y', 'vx', 'vy', 'facing', 'grounded', 'mode', 'steps', 'flags', 'candy', 'checkpoint', 'said', 'pendingDialogue', 'scene', 'prologue', 'ghost'].map(key => [key, state[key]]));
const frames = (page, count = 4) => page.evaluate(left => new Promise(done => {
  const frame = () => { if (--left <= 0) done(); else requestAnimationFrame(frame); }; requestAnimationFrame(frame);
}), count);
async function until(read, accept, label, timeout = 60000) {
  const deadline = Date.now() + timeout; let value;
  do { value = await read(); if (accept(value)) return value; await new Promise(done => setTimeout(done, 50)); } while (Date.now() < deadline);
  assert.fail(`${label}: ${JSON.stringify(value)}`);
}
function installProbe() {
  window.__testPad = { connected: true, mapping: 'standard', index: 0, id: 'TV-test', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__testPad] });
  window.__consoleVisits = [];
  document.addEventListener('DOMContentLoaded', () => new MutationObserver(records => {
    for (const record of records) for (const node of record.removedNodes) {
      if (node instanceof HTMLElement && node.id === 'homeConsole') window.__consoleVisits.push({ state: window.__godis.state(), save: localStorage.getItem('godisbus.v1.player.elof') });
    }
  }).observe(document.body, { childList: true }));
}
async function open(chapter = 'epilog', options = {}, setup = async () => {}, saved = false, offered = true) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 844, height: 391 }, ...options });
  await context.addInitScript(installProbe);
  if (saved) await context.addInitScript(flags => {
    localStorage.setItem('godisbus.v1.index', JSON.stringify({ v: 1, current: 'elof', players: [{ id: 'elof', name: 'Elof' }] }));
    localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', updated: 1, chapter: 'epilog', checkpoint: 2,
      checkpoints: { epilog: 2 }, settings: { style: 'aventyr', sound: false, music: false }, candy: { garden: [0, 1], epilog: Array.from({ length: 100 }, (_, i) => i) },
      side: { garden: [1] }, placed: { garden: ['cone'] }, flags: { garden: ['goal', 'lost:coin'], epilog: flags }, playMs: 12345 }));
  }, SAVED_FLAGS);
  const page = await context.newPage(), errors = [], external = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    const url = request.url(); requests.push(url);
    if (!url.startsWith(origin) && !url.startsWith(`blob:${origin}`) && !url.startsWith('data:')) external.push(url);
  });
  await setup(page);
  const query = new URLSearchParams({ dev: '', debug: '', standin: '', tier: 'low', course: chapter });
  if (!saved) { query.set('at', chapter === 'prolog' || chapter === 'stormkvall' ? '31.8,.01' : '30.8,.01'); query.set('flags', FLAGS[chapter].join(',')); }
  await page.goto(`${origin}${BASE}?${query}`);
  const state = () => page.evaluate(() => window.__godis?.state());
  await until(state, s => s?.bootReady && (!offered || s.homeConsole.available), `${chapter}: TV:n går att använda`);
  await frames(page);
  return { page, context, state, requests, async finish() { assert.deepEqual(errors, [], `${chapter}: körfel`); assert.deepEqual(external, [], `${chapter}: externa anrop`); await context.close(); } };
}
async function pad(page, index, pressed) {
  await page.evaluate(({ index, pressed }) => { window.__testPad.buttons[index] = { pressed, value: pressed ? 1 : 0 }; }, { index, pressed });
  await frames(page, 3);
}
async function enter(game, method = 'keys') {
  if (method === 'pad') { await pad(game.page, 2, true); await pad(game.page, 2, false); }
  else if (method === 'touch') await game.page.locator('#actBtn').tap();
  else if (method === 'choice') await game.page.locator('#homeConsolePlay').click();
  else await game.page.keyboard.press('KeyE');
  return until(game.state, s => s.homeConsole.open && !s.homeConsole.loading && s.homeConsole.mode === 'intro', 'TV-spelets startsida');
}
async function closeAndCheck(game, frozen, label, method = 'keys') {
  if (method === 'pad') {
    for (let tries = 0; tries < 12 && !await game.page.evaluate(() => document.activeElement?.matches('[data-action="exit"]')); tries++) {
      await pad(game.page, 13, true); await pad(game.page, 13, false);
    }
    check(`${label}: handkontrollen når Tillbaka till huset`, await game.page.evaluate(() => document.activeElement?.matches('[data-action="exit"]')));
    await pad(game.page, 0, true); await pad(game.page, 0, false);
  } else await game.page.keyboard.press('Escape');
  await until(game.state, s => !s.homeConsole.open, `${label}: tillbaka i huset`);
  const returned = await game.page.evaluate(() => window.__consoleVisits.at(-1).state);
  assert.deepEqual(world(returned), world(frozen), `${label}: exakt samma berättelsetillstånd vid återgång`); checks++;
  check(`${label}: TV-vyn och dess duk tas bort`, await game.page.locator('#homeConsole,.kart-canvas').count() === 0);
}
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  if (cases.has('homes')) for (const [chapter, viewport, touch, method] of [
    ['prolog', { width: 1180, height: 820 }, false, 'keys'],
    ['epilog', { width: 391, height: 844 }, true, 'touch'],
    ['morgonen', { width: 391, height: 844 }, false, 'pad'],
  ]) {
    const game = await open(chapter, { viewport, hasTouch: touch });
    check(`${chapter}: tävlingsmodulen hämtas först när TV:n används`, !game.requests.some(url => new URL(url).pathname === kartPath));
    const frozen = await enter(game, method);
    check(`${chapter}: en enda synlig startknapp i skärmens format`, await game.page.locator('[data-action="start"]:visible').count() === 1);
    await game.page.keyboard.down('ArrowRight'); await frames(game.page, 8); await game.page.keyboard.up('ArrowRight');
    assert.deepEqual(world(await game.state()), world(frozen), `${chapter}: huset, dialogen och insamlingen står stilla bakom TV:n`); checks++;
    check(`${chapter}: endast en TV-vy och en tävlingsduk`, await game.page.locator('#homeConsole').count() === 1 && await game.page.locator('.kart-canvas').count() === 1);
    check(`${chapter}: husets ljud väntar medan TV-spelet äger ljudet`, await game.page.evaluate(() => window.__godis.info().audioMode) === 'off');
    await closeAndCheck(game, frozen, chapter);
    const x = (await game.state()).x;
    await game.page.keyboard.down('ArrowRight');
    await until(game.state, s => s.x > x + .3, `${chapter}: nya rörelseknappar fungerar efter TV-spelet`);
    await game.page.keyboard.up('ArrowRight'); await game.finish();
  }

  if (cases.has('homes')) {
    // The evening of the storm, at the TV after the power cut: no game offered, and a press does not open one.
    const dark = await open('stormkvall', { viewport: { width: 844, height: 391 } }, async () => {}, false, false);
    await frames(dark.page, 20);
    check('stormkvall: inget TV-spel när strömmen har gått', !(await dark.state()).homeConsole.available && await dark.page.locator('#homeConsolePlay').isHidden());
    await dark.page.keyboard.press('KeyE'); await pad(dark.page, 2, true); await pad(dark.page, 2, false); await frames(dark.page, 6);
    check('stormkvall: varken tangent eller handkontroll öppnar TV:n', !(await dark.state()).homeConsole.open && await dark.page.locator('#homeConsole').count() === 0);
    await dark.finish();
  }

  if (cases.has('race')) {
  const race = await open('epilog', { viewport: { width: 391, height: 844 }, hasTouch: true });
  const frozen = await enter(race, 'touch');
  await race.page.locator('[data-action="start"]:visible').first().tap();
  await until(race.state, s => s.homeConsole.mode === 'race' && s.homeConsole.frames > 8, 'Tävlingen börjar');
  // The arcade race: eight karts on the grid with the player last, and the item slot, sweets and place on screen.
  const grid = (await race.state()).homeConsole;
  check('Åtta kartar står på startlinjen, spelaren sist', grid.karts.length === 8 && grid.position === 8 && grid.karts.every(kart => kart.distance < 0));
  check('Godispåsen, godisräknaren och platsen syns under loppet', await race.page.locator('.kart-slot:visible, .kart-candies:visible, .kart-position:visible').count() === 3);
  await until(race.state, s => s.homeConsole.phase === 'racing' && s.homeConsole.distance > grid.distance + 3, 'Karten kör i väg med automatisk gas', 120000);
  check('Rivalerna kör i väg från start', (await race.state()).homeConsole.karts.slice(1).every((kart, i) => kart.distance > grid.karts[i + 1].distance));
  await race.page.locator('[data-action="pause"]').tap();
  const paused = await until(race.state, s => s.homeConsole.mode === 'paused', 'Pausa tävlingen');
  await frames(race.page, 8);
  const still = await race.state();
  for (const key of ['elapsed', 'countdown', 'distance', 'lane', 'speed']) assert.equal(still.homeConsole[key], paused.homeConsole[key], `Paus: ${key}`);
  checks++;
  for (const size of [{ width: 844, height: 391 }, { width: 391, height: 844 }]) {
    await race.page.setViewportSize(size); await frames(race.page);
    for (const button of await race.page.locator('.kart-paused button').all()) {
      await button.scrollIntoViewIfNeeded();
      check(`${size.width}×${size.height}: pausknappen ${await button.textContent()} går att nå`, await button.evaluate(button => { const r = button.getBoundingClientRect(); return r.width >= 64 && r.height >= 64 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
    }
  }
  await race.page.locator('[data-action="resume"]').tap(); await frames(race.page, 4);
  check('Porträttlägets körknappar har stora tryckytor inom skärmen', await race.page.locator('.kart-touch').evaluate(panel => [...panel.querySelectorAll('button')].filter(button => !button.hidden).every(button => { const r = button.getBoundingClientRect(); return r.width >= 64 && r.height >= 64 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })));
  // Exercise the real visibility listener without replacing the native animation clock.
  await race.page.evaluate(() => { window.__consoleHidden = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__consoleHidden }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await race.state(); await frames(race.page, 6);
  check('En dold sida håller båda spelen och lämnar tävlingen pausad', hidden.homeConsole.suspended && hidden.homeConsole.mode === 'paused' && (await race.state()).homeConsole.elapsed === hidden.homeConsole.elapsed);
  await race.page.evaluate(() => { window.__consoleHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await frames(race.page, 4);
  check('Tillbaka från dold sida kräver en medveten fortsättning', !(await race.state()).homeConsole.suspended && (await race.state()).homeConsole.mode === 'paused');
  await race.page.locator('.kart-paused [data-action="exit"]').click();
  await until(race.state, s => !s.homeConsole.open, 'Lämna en pausad tävling');
  assert.deepEqual(world(await race.page.evaluate(() => window.__consoleVisits.at(-1).state)), world(frozen)); checks++;
  const second = await enter(race);
  await race.page.keyboard.down('KeyE'); await pad(race.page, 2, true);
  await closeAndCheck(race, second, 'Upprepad spelomgång');
  await frames(race.page, 8);
  check('Hållna E/X-knappar öppnar inte TV:n igen efter återgång', !(await race.state()).homeConsole.open);
  await race.page.keyboard.up('KeyE'); await pad(race.page, 2, false);
  const third = await enter(race, 'pad'); await closeAndCheck(race, third, 'En ny X-tryckning', 'pad');
  await race.finish();
  }

  if (cases.has('save')) {
  const saved = await open('epilog', {}, async () => {}, true);
  // Pappa walks over and kneels beside him first (`knife:pappa`, 4.5 s of play), then the carving is offered.
  await until(saved.state, s => s.word === 'carve', 'Berättelsens täljning erbjuds när pappa är framme', 120000);
  check('Berättelsens täljning behåller den vanliga användknappen', (await saved.state()).word === 'carve' && await saved.page.locator('#homeConsolePlay').isVisible());
  const beforeSave = await saved.page.evaluate(() => localStorage.getItem('godisbus.v1.player.elof'));
  const savedFrozen = await enter(saved, 'choice'); await frames(saved.page, 6); await closeAndCheck(saved, savedFrozen, 'Sparad berättelse');
  check('TV-spel ändrar varken kapitel, checkpoint, samling eller befintlig sparfil', await saved.page.evaluate(() => window.__consoleVisits.at(-1).save) === beforeSave);
  await saved.finish();
  }

  if (cases.has('loading')) {
  let releaseChunk, requested = false;
  const chunkGate = new Promise(done => { releaseChunk = done; });
  const cancelled = await open('epilog', {}, async page => page.route(url => url.pathname === kartPath, async route => { requested = true; await chunkGate; await route.continue(); }));
  await cancelled.page.keyboard.press('KeyE');
  await until(cancelled.state, s => requested && s.homeConsole.loading, 'Avbryt medan TV-spelet hämtas');
  const loading = await cancelled.state(); await closeAndCheck(cancelled, loading, 'Avbruten hämtning');
  releaseChunk(); await frames(cancelled.page, 20);
  check('En sent hämtad modul öppnar inte TV:n igen', !(await cancelled.state()).homeConsole.open && await cancelled.page.locator('.kart-canvas').count() === 0);
  await cancelled.finish();

  const failed = await open('epilog', {}, async page => page.route(url => url.pathname === kartPath, route => route.abort('failed')));
  await failed.page.keyboard.press('KeyE');
  await until(failed.state, s => !s.homeConsole.open && failed.requests.some(url => new URL(url).pathname === kartPath), 'Misslyckad TV-hämtning återgår till berättelsen');
  check('Ett nedladdningsfel förklaras på svenska utan att öppna en annan sida', (await failed.page.locator('#noticeText').textContent()).includes('Spelet kunde inte starta') && new URL(failed.page.url()).searchParams.get('course') === 'epilog');
  const start = (await failed.state()).x;
  await failed.page.keyboard.down('ArrowRight'); await until(failed.state, s => s.x > start + .3, 'Rörelse fungerar efter nedladdningsfel'); await failed.page.keyboard.up('ArrowRight');
  await failed.finish();
  }
  if (cases.has('page')) {
    // Godisracet on a page of its own (godisracet.html): the same game without the house, and the way to the adventure.
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 844, height: 391 } });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => { const url = request.url(); if (!url.startsWith(origin) && !url.startsWith(`blob:${origin}`) && !url.startsWith('data:')) external.push(url); });
    await page.goto(`${origin}${BASE}godisracet.html?debug&tier=low`);
    await page.waitForFunction(() => window.__kart?.debug().mode === 'intro', null, { timeout: 120000 });
    check('Godisracets egen sida: startsidan med en enda synlig startknapp och en duk', await page.locator('[data-action="start"]:visible').count() === 1 && await page.locator('.kart-canvas').count() === 1);
    check('Godisracets egen sida: cupen och de fyra banorna går att välja', await page.locator('[data-track]').count() === 5);
    await page.locator('[data-action="start"]:visible').first().click();
    await page.waitForFunction(() => window.__kart.debug().mode === 'race' && window.__kart.debug().frames > 8, null, { timeout: 120000 });
    check('Godisracets egen sida: loppet startar med åtta kartar', await page.evaluate(() => window.__kart.debug().karts.length) === 8);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__kart.debug().mode === 'paused', null, { timeout: 60000 });
    await page.evaluate(installProbe);
    for (const button of [0, 1, 9]) {
      await page.evaluate(button => {
        if (button === 9) { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }
        else window.dispatchEvent(new Event('blur'));
      }, button);
      const before = await page.evaluate(() => ({ elapsed: window.__kart.debug().elapsed, action: document.activeElement.dataset.action }));
      await pad(page, 13, true); await pad(page, 13, false);
      await pad(page, button, true);
      check(`Ofokuserad kartmeny: knapp ${button} återupptar inte loppet eller flyttar fokus`, await page.evaluate(expected =>
        window.__kart.debug().mode === 'paused' && window.__kart.debug().elapsed === expected.elapsed && document.activeElement.dataset.action === expected.action, before));
      await page.evaluate(button => {
        if (button === 9) { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }
        else window.dispatchEvent(new Event('focus'));
      }, button); await frames(page);
      check(`Återkomst: hållen knapp ${button} kräver ett nytt tryck`, await page.evaluate(() => window.__kart.debug().mode) === 'paused');
      await pad(page, button, false); await pad(page, button, true); await pad(page, button, false);
      check(`Nytt tryck på ${button} återupptar loppet`, await page.evaluate(() => window.__kart.debug().mode) === 'race');
      await page.keyboard.press('Escape');
    }
    await page.locator('.kart-paused [data-action="exit"]').click();
    await page.waitForURL(url => url.pathname === BASE, { timeout: 120000 });
    check('Godisracets egen sida: Tillbaka till huset leder till äventyret', new URL(page.url()).pathname === BASE);
    assert.deepEqual(errors, [], 'Godisracets egen sida: körfel'); assert.deepEqual(external, [], 'Godisracets egen sida: externa anrop');
    await context.close();
    // The race screen on phones held upright and on a small one held sideways (Olov, 16 November 2026: the panel
    // "Ladda sladden" hid the words that come with a candy bag): the notice clear of every panel and button, and on a
    // phone held upright the speed and the spark meter beside the item slot, at its left.
    for (const [name, viewport] of [['upprätt', { width: 412, height: 696 }], ['liten upprätt', { width: 360, height: 640 }], ['liten på tvären', { width: 667, height: 375 }], ['surfplatta på tvären', { width: 1180, height: 820 }]]) {
      const phone = await browser.newContext({ serviceWorkers: 'block', viewport, hasTouch: true, isMobile: true });
      const race = await phone.newPage(), raceErrors = [];
      race.on('pageerror', error => raceErrors.push(String(error)));
      await race.goto(`${origin}${BASE}godisracet.html?debug&tier=low`);
      await race.waitForFunction(() => window.__kart?.debug().mode === 'intro', null, { timeout: 120000 });
      await race.locator('[data-action="start"]:visible').first().click();
      await race.waitForFunction(() => window.__kart.debug().mode === 'race' && window.__kart.debug().frames > 8, null, { timeout: 120000 });
      await race.evaluate(() => window.__kart.poke({ item: 'cones3', itemCount: 3 }));
      await race.waitForTimeout(600);
      // Where everything rests, measured in one go with the notice's words put up here: the game's own notices come and
      // go on its clock, and a notice, the place or the candy count arrives with a pop that scales it for a quarter of a
      // second (on PR #283's first run the tablet's notice was caught in the middle of one, its box over the map; the
      // words themselves stayed clear of it).
      const boxes = await race.evaluate(() => {
        for (const popping of document.querySelectorAll('.kart-pop')) popping.classList.remove('kart-pop');
        document.querySelector('.kart-notice').textContent = 'Tre kast rakt fram.';
        return Object.fromEntries(['.kart-notice', '.kart-dashboard', '.kart-slot', '.kart-map', '.kart-position', '.kart-laps', '.kart-candies', '.kart-pause', '.kart-ranks', '.kart-steering', '.kart-pedals']
          .map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { left: r.left, top: r.top, right: r.right, bottom: r.bottom }]; }));
      });
      const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      const under = Object.keys(boxes).filter(selector => selector !== '.kart-notice' && !apart(boxes['.kart-notice'], boxes[selector]));
      check(`Godisracet, ${name}: meddelandet syns fritt från alla rutor och knappar${under.length ? ` (inte från ${under.join(', ')})` : ''}`, under.length === 0);
      if (viewport.width < viewport.height) check(`Godisracet, ${name}: farten och sladdmätaren till vänster om godisrutan, i dess rad`,
        boxes['.kart-dashboard'].right < boxes['.kart-slot'].left && Math.abs(boxes['.kart-dashboard'].top - boxes['.kart-slot'].top) < 2);
      assert.deepEqual(raceErrors, [], `Godisracet, ${name}: körfel`);
      await phone.close();
    }
  }
  console.log(`TV-konsolen: ${checks} webbläsarkontroller godkända.`);
} finally { if (browser) await browser.close(); await new Promise(done => server.close(done)); }
