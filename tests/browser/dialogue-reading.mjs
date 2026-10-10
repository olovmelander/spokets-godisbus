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
    const hud = createHud(document, 100);
    const line = () => document.getElementById('bubbleLine').textContent;
    hud.say('mamma', 'notYet'); hud.tick(0);
    hud.say('pappa', 'first1', false, true); hud.tick(0);
    const first = line(), guarded = !hud.advance();
    hud.say('pappa', 'first2', false, true);
    hud.say('pappa', 'first3', false, true);
    hud.say('pappa', 'first4', false, true);
    hud.say('elof', 'stomp', true);
    hud.hush(); hud.tick(120);
    const kept = line() === first && hud.reading();
    const lines = [line()];
    for (let i = 0; i < 3; i++) { hud.advance(); hud.tick(0); lines.push(line()); hud.tick(.3); }
    hud.advance(); hud.tick(0);
    const finished = !hud.reading() && document.getElementById('bubble').hidden;
    hud.say('elof', 'stolenBag', false, true); hud.tick(0); hud.tick(0);
    const pausedGuard = !hud.advance();
    hud.tick(.3);
    const scene = createSceneUi(document, () => { hud.advance(); scene.reading(hud.reading(), 'touch'); });
    scene.reading(true, 'touch');
    window.dialogue = { hud, scene };
    return { first, guarded, kept, lines, finished, pausedGuard };
  });
  assert.equal(result.first, 'Min allra första trägubbe …', 'essential line takes the floor immediately');
  assert.ok(result.guarded && result.pausedGuard, 'fresh/paused lines reject accidental input');
  assert.ok(result.kept, 'two minutes, a priority event and scene hush cannot discard unread words');
  assert.deepEqual(result.lines, ['Min allra första trägubbe …', 'Den täljde jag till dig', 'när du var liten, Elof.', 'Vi tappade den här uppe.']);
  assert.ok(result.finished, 'exactly four presses finish four lines');
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
  assert.deepEqual(errors, []);
  console.log('Dialogue reading: queue, input guard, touch, interruption and five large-text layouts passed.');
} finally {
  await browser?.close();
  await server.close();
}
