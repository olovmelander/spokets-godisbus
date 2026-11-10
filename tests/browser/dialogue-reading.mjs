// The real speech queue and reading controls, without waiting for a rendered chapter.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.route('**/dialogue-test.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body></body>' }));
  await page.goto(`${server.resolvedUrls.local[0]}dialogue-test.html`);
  const result = await page.evaluate(async () => {
    await import('/src/ui/ui.css');
    const { mountShell } = await import('/src/ui/shell.ts');
    const { createHud } = await import('/src/ui/hud.ts');
    const { createSceneUi } = await import('/src/ui/scene.ts');
    mountShell(document.body);
    const voiced = [];
    const hud = createHud(document, 100, () => false, () => 1, () => {}, (who) => voiced.push(who));
    const line = () => document.getElementById('bubbleLine').textContent;
    const bubble = document.getElementById('bubble');
    // A passing remark is on the page when a story line is said. The remark is read to its end (5.47 s) while the game
    // waits, Fortsätt does not skip it, and then the story line takes the floor (Olov, 9 November 2026).
    hud.say('mamma', 'notYet'); hud.tick(0);
    hud.say('pappa', 'first1', true); hud.tick(0);
    const waits = hud.reading() && !hud.advance();
    for (let i = 0; i < 53; i++) hud.tick(0.1);
    const remark = line();
    hud.tick(0.3);
    const first = line(), guarded = !hud.advance();
    hud.say('pappa', 'first2', true);
    hud.say('pappa', 'first3', true);
    hud.say('pappa', 'first4', true);
    hud.say('elof', 'stomp');
    hud.hush(); hud.tick(120);
    const kept = line() === first && hud.reading();
    const lines = [line()];
    for (let i = 0; i < 3; i++) { hud.advance(); hud.tick(0); lines.push(line()); hud.tick(.3); }
    hud.advance(); hud.tick(0);
    // The shout said after them waits its turn too, and then has its own time.
    const shout = line(), shoutRead = !hud.reading() && hud.speaking();
    hud.tick(5); hud.tick(0.4);
    const finished = !hud.reading() && !hud.speaking() && bubble.hidden;
    hud.say('elof', 'stolenBag', true); hud.tick(0); hud.tick(0);
    const pausedGuard = !hud.advance();
    hud.tick(.3); hud.advance(); hud.tick(0);
    // A scene that begins takes nothing from a line being said: it keeps its whole time.
    hud.say('mamma', 'notYet'); hud.tick(0); hud.tick(2); hud.hush(); hud.tick(3);
    const hushed = line() === remark && hud.speaking();
    hud.tick(1);
    // A line that goes on from the one before, said once that one has had its time (the simulation waits for it), is
    // still added under it.
    hud.clear();
    hud.say('pappa', 'first2'); hud.tick(0); hud.tick(5);
    const lingers = !bubble.hidden && !hud.speaking();
    hud.say('pappa', 'first3'); hud.tick(0);
    const together = [...document.querySelectorAll('#bubbleLine .said')].map((said) => said.textContent);
    hud.tick(5); hud.tick(0.4);
    const ended = bubble.hidden;
    const scene = createSceneUi(document, () => { hud.advance(); scene.reading(hud.reading(), 'touch'); });
    scene.reading(true, 'touch');
    window.dialogue = { hud, scene };
    return { waits, remark, first, guarded, kept, lines, shout, shoutRead, finished, pausedGuard, hushed, lingers, together, ended, voiced };
  });
  assert.equal(result.remark, 'Bertil! Godiset öppnar vi ikväll.', 'a passing remark keeps its whole reading time when a story line is said after it');
  assert.ok(result.waits, 'the story line waits its turn, with the game, and Fortsätt does not skip the remark');
  assert.equal(result.first, 'Min allra första trägubbe …', 'then the story line takes the floor');
  assert.ok(result.guarded && result.pausedGuard, 'fresh/paused lines reject accidental input');
  assert.ok(result.kept, 'two minutes and a scene hush cannot discard unread words');
  assert.deepEqual(result.lines, ['Min allra första trägubbe …', 'Den täljde jag till dig', 'när du var liten, Elof.', 'Vi tappade den här uppe.']);
  assert.ok(result.shout === 'Ge tillbaka mitt godis!' && result.shoutRead, 'a shout said after them waits its turn, and is timed');
  assert.ok(result.finished, 'exactly four presses finish four lines, and the shout its time');
  assert.ok(result.hushed, 'a scene beginning does not shorten the line being said');
  assert.ok(result.lingers, 'a line whose time is up stays a moment for one that goes on from it');
  assert.deepEqual(result.together, ['Den täljde jag till dig', 'när du var liten, Elof.'], 'the line that goes on is added under it');
  assert.ok(result.ended, 'and the bubble goes when nothing goes on from it');
  assert.deepEqual(result.voiced, ['mamma', 'pappa', 'pappa', 'pappa', 'pappa', 'elof', 'elof', 'mamma', 'pappa', 'pappa'], 'each speaker sounds as their bubble shows');
  await page.tap('#sceneNext');
  assert.ok(await page.locator('#sceneReading').isHidden(), 'touch continues the actual reading control');
  for (const [width, height] of [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      document.body.classList.add('big-text');
      window.dialogue.scene.reading(true, 'keys', 'Stjärnan från påsen');
      const button = document.getElementById('sceneNext'), rect = button.getBoundingClientRect();
      const panel = document.getElementById('sceneReading').getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && rect.height >= 44 && button.scrollWidth <= button.clientWidth
        && panel.left >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight
        && document.getElementById('sceneMoment').textContent === 'Stjärnan från påsen';
    });
    assert.ok(layout, `${width}×${height}: large reading control stays in view`);
  }
  const cleared = await page.evaluate(() => {
    const { hud } = window.dialogue;
    hud.say('pappa', 'first1', false, true); hud.tick(0); hud.clear();
    return !hud.reading() && !hud.speaking() && document.getElementById('bubble').hidden;
  });
  assert.ok(cleared, 'checkpoint restart clears an interrupted reading');
  // Story beats are queued together in one simulation step. A later reading line must not silently
  // replace the clue or answer immediately before it, even though both appear in the robot's transcript.
  const adventure = await page.evaluate(async () => {
    const { AVENTYR2 } = await import('/src/content/aventyr2/aventyr2.ts');
    const { sv } = await import('/src/content/sv.ts');
    const { hud } = window.dialogue;
    const exchanges = [
      ['stormbyn', ['sbCap', 'sbToLake']],
      ['billsta', ['bi:open', 'bi:lookout', 'bi:way', 'bi:onward']],
      ['alven', ['al:billsta', 'al:car', 'al:window']],
      ['stormoga', ['soGold', 'soLast', 'soShare', 'soMagic']],
      ['morgonen', ['moCup', 'moKnew', 'moAnswer']],
    ];
    return exchanges.map(([id, ids]) => {
      const chapter = AVENTYR2.find((chapter) => chapter.id === id);
      const beats = ids.map((id) => chapter.beats.find((beat) => beat.id === id));
      hud.clear();
      for (const beat of beats) hud.say(beat.who, beat.line, !!beat.read);
      hud.tick(0);
      const shown = [];
      for (let i = 0; i < beats.length + 1 && hud.reading(); i++) {
        shown.push(document.getElementById('bubbleLine').textContent);
        hud.tick(.3); hud.advance(); hud.tick(0);
      }
      return { id, shown, expected: beats.map((beat) => sv.lines[beat.line]), finished: !hud.speaking() };
    });
  });
  for (const exchange of adventure) {
    assert.deepEqual(exchange.shown, exchange.expected, `${exchange.id}: every line in the exchange reaches the reader in order`);
    assert.ok(exchange.finished, `${exchange.id}: the exchange finishes after one press per line`);
  }
  assert.deepEqual(errors, []);
  console.log('Dialogue reading: lines in turn and in full, input guard, touch, interruption, five large-text layouts and five Adventure 2 exchanges passed.');
} finally {
  await browser?.close();
  await server.close();
}
