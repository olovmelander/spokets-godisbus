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
    const { setVoiceSettings } = await import('/src/audio/voice-player.ts');
    setVoiceSettings(false, 0); // Synchronous fixture: real audio cannot finish inside this JS task.
    const voiced = [], completed = [];
    const hud = createHud(document, 100, () => false, () => 1, () => {}, (who) => voiced.push(who), id => completed.push(id));
    const line = () => document.getElementById('bubbleLine').textContent;
    const bubble = document.getElementById('bubble');
    hud.say('mamma', 'notYet', false, 'remark'); hud.tick(0);
    hud.say('pappa', 'first1', true, 'first1'); hud.tick(0);
    const waits = !hud.reading() && hud.speaking() && !hud.advance();
    for (let i = 0; i < 53; i++) hud.tick(.1);
    const remark = line();
    hud.tick(.3);
    const first = line(), guarded = !hud.advance();
    for (const id of ['first2', 'first3', 'first4']) hud.say('pappa', id, true, id);
    hud.say('elof', 'stomp', false, 'shout');
    hud.paused(true); hud.hush(); hud.tick(120);
    const kept = line() === first && hud.reading() && !hud.advance() && completed.join(',') === 'remark';
    hud.paused(false);
    const lines = [], keys = [];
    for (let i = 0; i < 600 && hud.speaking(); i++) {
      const saying = hud.saying();
      if (saying && keys.at(-1) !== saying.key) { keys.push(saying.key); lines.push(saying.text); }
      hud.tick(.1);
    }
    hud.tick(.4);
    const finished = !hud.reading() && !hud.speaking() && bubble.hidden;
    const receipts = completed.slice();
    hud.say('elof', 'stolenBag', true, 'optional'); hud.tick(0);
    const freshGuard = !hud.advance();
    hud.tick(.3); const optional = hud.advance(); hud.tick(0);
    const optionalReceipt = completed.filter(id => id === 'optional').length === 1;
    // Starting a scene never shortens the line already on the page.
    hud.say('mamma', 'notYet'); hud.tick(0); hud.tick(2); hud.hush(); hud.tick(3);
    const hushed = line() === remark && hud.speaking();
    hud.tick(1);
    hud.clear();
    hud.say('pappa', 'first2'); hud.tick(0); hud.tick(5);
    const lingers = !bubble.hidden && !hud.speaking();
    hud.say('pappa', 'first3'); hud.tick(0);
    const together = [...document.querySelectorAll('#bubbleLine .said')].map(said => said.textContent);
    hud.tick(5); hud.tick(.4);
    const ended = bubble.hidden;
    const scene = createSceneUi(document, () => { hud.advance(); scene.reading(hud.reading(), 'touch'); });
    hud.say('pappa', 'first1', true, 'touch'); hud.tick(0); hud.tick(.3);
    scene.reading(hud.reading(), 'touch');
    window.dialogue = { hud, scene, completed };
    return { waits, remark, first, guarded, kept, lines, finished, freshGuard, optional, optionalReceipt, receipts, hushed, lingers, together, ended, voiced };
  });
  assert.equal(result.remark, 'Bertil! Godiset öppnar vi ikväll.', 'an ordinary line keeps its whole time before a protected one');
  assert.ok(result.waits, 'queued protected dialogue does not itself impose a reading lock or let Continue skip ordinary speech');
  assert.equal(result.first, 'Min allra första trägubbe …', 'then the protected line takes the floor');
  assert.ok(result.guarded && result.freshGuard, 'fresh protected lines reject accidental input');
  assert.ok(result.kept, 'Pause preserves the unread line and its completion receipt even across two minutes');
  assert.deepEqual(result.lines, ['Min allra första trägubbe …', 'Den täljde jag till dig', 'när du var liten, Elof.', 'Vi tappade den här uppe.', 'Ge tillbaka mitt godis!']);
  assert.deepEqual(result.receipts, ['remark', 'first1', 'first2', 'first3', 'first4', 'shout'], 'automatic completion acknowledges each displayed line exactly once, in order');
  assert.ok(result.finished, 'all protected lines and the queued shout finish without one press per line');
  assert.ok(result.optional && result.optionalReceipt, 'optional Continue completes one protected line exactly once');
  assert.ok(result.hushed, 'a scene beginning does not shorten the line being said');
  assert.ok(result.lingers, 'a completed line stays briefly for its continuation');
  assert.deepEqual(result.together, ['Den täljde jag till dig', 'när du var liten, Elof.'], 'the line that goes on is added under it');
  assert.ok(result.ended, 'the bubble goes when nothing goes on from it');
  assert.deepEqual(result.voiced, ['mamma', 'pappa', 'pappa', 'pappa', 'pappa', 'elof', 'elof', 'mamma', 'pappa', 'pappa', 'pappa'], 'each speaker sounds when their line actually appears');
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
    hud.say('pappa', 'first1', true, 'cancelled'); hud.tick(0); hud.clear();
    return !hud.reading() && !hud.speaking() && document.getElementById('bubble').hidden && !window.dialogue.completed.includes('cancelled');
  });
  assert.ok(cleared, 'checkpoint restart clears an interrupted reading without claiming it completed');
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
      for (const beat of beats) hud.say(beat.who, beat.line, false, beat.id);
      hud.tick(0);
      const shown = [], keys = [];
      for (let i = 0; i < 1000 && hud.speaking(); i++) {
        const saying = hud.saying();
        if (saying && keys.at(-1) !== saying.key) { keys.push(saying.key); shown.push(saying.text); }
        if (hud.reading()) throw Error('ordinary world dialogue imposed a reading lock');
        hud.tick(.1);
      }
      return { id, shown, expected: beats.map(beat => sv.lines[beat.line]), finished: !hud.speaking() };
    });
  });
  for (const exchange of adventure) {
    assert.deepEqual(exchange.shown, exchange.expected, `${exchange.id}: every line in the exchange reaches the reader in order`);
    assert.ok(exchange.finished, `${exchange.id}: the exchange finishes automatically with no per-line press`);
  }
  assert.deepEqual(errors, []);
  console.log('Dialogue reading: automatic full lines, completion receipts, protected optional Continue, Pause, touch, five large-text layouts and five timed Adventure 2 exchanges passed.');
} finally {
  await browser?.close();
  await server.close();
}
