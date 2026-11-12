// A review tool, not a suite (docs/dialogue.md): photographs of the moments where lines are told standing, and of
// the flashes, with their words up, at 844×390 and 390×844. For looking at: it checks nothing.
//
//   $env:SHOTS_OUT = "<a folder outside the repository>"; node tests/browser/review/dialogue-moments.mjs
//
// From the build in dist (`npm run build` first), or from a running `npx vite` with SHOTS_ORIGIN=http://localhost:5173.
// SHOTS_ONLY=stormskog-minnet,alven-slut takes only those. The stand-in figures are drawn unless SHOTS_STANDIN=0:
// pictures of the family's own models stay on the computer that made them, and are never committed.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = fileURLToPath(new URL('../../../dist/', import.meta.url));
const out = process.env.SHOTS_OUT;
assert.ok(out, 'Set SHOTS_OUT to a folder outside the repository.');
mkdirSync(out, { recursive: true });
const base = '/spokets-godisbus/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://test').pathname);
  const file = resolve(dist, path.slice(base.length) || 'index.html');
  if (!path.startsWith(base) || !file.startsWith(resolve(dist) + sep) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = process.env.SHOTS_ORIGIN ?? `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const only = process.env.SHOTS_ONLY?.split(',');
const standin = process.env.SHOTS_STANDIN !== '0';

/**
 * Each case: where he starts, what he has done already, and the lines to photograph as they show (a part of each is
 * enough). `act` presses Använd when something is offered and nobody speaks; `burst` takes that many pictures in a
 * row from the line's first moment, for something that flies past; `up` holds the stick up too, for a climb; `stand`
 * lets go of the stick when the line shows, as a child who stops to look.
 */
const cases = [
  { name: 'stormgard-moa', course: 'stormgard', at: '1,6.01', flags: [], lines: ['Se på skuggorna'] },
  { name: 'olympia-blixten', course: 'olympia', at: '14,0.01', flags: ['scene:card', 'beat:ol:arrive'], lines: ['Där flyger lillgubben'], burst: 9, up: true },
  { name: 'stormskog-blixten', course: 'stormskog', at: '33.4,0.01', flags: [], lines: ['blåste lillgubben'], burst: 9 },
  { name: 'stormskog-minnet', course: 'stormskog', at: '144,0.01', flags: ['placed:owl-twig', 'owl', 'ss:beam', 'ss:frozen', 'ss:woke', 'scene:ss:ljuset', 'scene:ss:vaknar'],
    lines: ['En mörk håla', 'Klonk …', 'låg ensam', 'Därför skyndar', 'hitta dem båda'] },
  { name: 'flarken-blixten', course: 'flarken', at: '98.2,0.01', flags: [], lines: ['blåser ut över sjön'], burst: 9 },
  { name: 'stormgard-lekstugan', course: 'stormgard', at: '129.8,0.01', flags: [], lines: ['Uppe på lekstugan'], burst: 9 },
  { name: 'olympia-gamla', course: 'olympia', at: '116,0.01', flags: ['scene:card', 'beat:ol:arrive'], lines: ['seglar över vattnet'], burst: 9 },
  { name: 'flarken-gamla', course: 'flarken', at: '123,0.61', flags: [], lines: ['Spring, gamla'], burst: 9 },
  { name: 'alven-flotten', course: 'alven', at: '9,0.01', flags: [], lines: ['guppar på ån'], burst: 9, act: true },
  { name: 'alven-gamla', course: 'alven', at: '49.8,0.01', flags: ['al:raft'], lines: ['på en stock'], burst: 9 },
  { name: 'alven-fore', course: 'alven', at: '170.8,0.41', stand: true, flags: ['al:raft', 'al:pappa', 'al:scarf', 'al:lift', 'al:owl-call', 'al:owl-ready', 'al:owl', 'al:little-seen', 'scene:al:little', 'scene:bron', 'beat:al:see-little'],
    lines: ['flyter före oss'], burst: 9 },
  { name: 'alven-forsen', course: 'alven', at: '78,0.61', flags: ['al:raft'], lines: ['alldeles för vild', 'uppe på bron', 'halsduk'], act: true },
  { name: 'alven-slut', course: 'alven', at: '177,0.41', flags: ['al:raft', 'al:pappa', 'al:scarf', 'al:lift', 'al:owl-call', 'al:owl-ready', 'al:owl', 'al:little-seen', 'scene:al:little', 'scene:bron', 'beat:al:see-little'],
    lines: ['En godisbit till', 'Vi letar tillsammans', 'godis i fickan', 'Hoppa in, Elof'] },
  { name: 'billsta-framme', course: 'billsta', at: '1,0.01', flags: [], lines: ['Det lyser hos', 'Följ vårt godis', 'Så liten du har blivit'] },
  { name: 'stormoga-gavan', course: 'stormoga', at: '44.6,0.61', flags: ['so:jetty', 'so:mamma', 'so:pappa', 'so:moa', 'so:bertil', 'scene:bryggan', 'scene:lampa:mamma', 'scene:lampa:pappa', 'scene:lampa:moa', 'scene:lampa:bertil', 'owl:call', 'owl:ready', 'owl', 'eye', 'scene:oga', 'scene:rockav', 'scene:motet', 'so:cap-returned', 'gift:out', 'beat:soFar'],
    lines: ['guldpapper', 'Förut delade jag', 'stor igen'], act: true },
  { name: 'morgonen-fjun', course: 'morgonen', at: '9,0.01', flags: ['scene:frukost', 'shelf:old', 'shelf:small', 'scene:fonster', 'beat:moOld', 'beat:moSmall'],
    lines: ['En ny hake', 'heta Fjun'], act: true },
];

for (const [width, height] of [[844, 390], [390, 844]]) {
  for (const one of cases) {
    if (only && !only.includes(one.name)) continue;
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.addInitScript((course) => {
      localStorage.setItem('godisbus.v1.player.elof', JSON.stringify({ v: 1, name: 'Elof', chapter: course, checkpoint: -1,
        settings: { style: 'aventyr', sound: false, music: false, followFinger: false }, updated: 1, playMs: 0, candy: {}, placed: {}, flags: {} }));
    }, one.course);
    const query = new URLSearchParams({ dev: '', debug: '', tier: 'low', course: one.course, at: one.at, flags: one.flags.join(','), ...(standin ? { standin: '' } : {}) });
    await page.goto(`${origin}${base}?${query}`);
    await page.waitForFunction(() => window.__godis?.state().bootReady && document.getElementById('loading').classList.contains('done'), null, { timeout: 120000 });
    // ?debug is what lets a test start anywhere; its numbers are not part of the picture.
    await page.addStyleTag({ content: '#debug { display: none !important; }' });
    await page.keyboard.down('ArrowRight');
    if (one.up) await page.keyboard.down('ArrowUp');
    const seen = [];
    let pressed = Date.now();
    let taken = 0;
    const started = Date.now();
    while (seen.length < one.lines.length && Date.now() - started < 150000) {
      const text = await page.evaluate(() => (document.getElementById('bubble').hidden ? '' : document.getElementById('bubbleLine').textContent));
      const want = one.lines[seen.length];
      if (text && text.includes(want) && one.burst) {
        if (one.stand) { await page.keyboard.up('ArrowRight'); pressed = Infinity; }
        for (let i = 0; i < one.burst; i++) {
          await page.screenshot({ path: `${out}/${one.name}-${width}x${height}-burst${i}.png` });
          await page.waitForTimeout(280);
        }
        seen.push(want);
      } else if (text && text.includes(want)) {
        await page.waitForTimeout(900);
        const state = await page.evaluate(() => { const s = window.__godis.state(); return { x: s.x, scene: s.scene?.id ?? null, held: s.held }; });
        await page.screenshot({ path: `${out}/${one.name}-${width}x${height}-${++taken}.png` });
        seen.push(`${want}: x ${state.x.toFixed(1)}, ${state.scene ?? 'no scene'}${state.held ? ', standing' : ''}`);
      } else if (one.act && !text) {
        const offered = await page.evaluate(() => !document.getElementById('actBtn').disabled);
        if (offered) { await page.keyboard.up('ArrowRight'); await page.keyboard.press('e'); await page.keyboard.down('ArrowRight'); }
      }
      // A staged moment lets go of the keys: press again, as a child does.
      if (Date.now() - pressed > 1500) { await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowRight'); pressed = Date.now(); }
      await page.waitForTimeout(120);
    }
    await page.keyboard.up('ArrowRight');
    if (one.up) await page.keyboard.up('ArrowUp');
    console.log(`${one.name} ${width}x${height}: ${seen.length} of ${one.lines.length}\n   ${seen.join('\n   ')}${errors.length ? `\n   ERRORS ${errors.join(' | ')}` : ''}`);
    await page.close();
  }
}
await browser.close();
server.close();
