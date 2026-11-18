// Real DOM and the game's own style sheet: on a big screen (a 1080p television, a large monitor) the sheets grow with
// it by CSS zoom (src/ui/ui.css), and a sheet's picture still answers the finger where it is touched
// (src/ui/story-stroke.ts). Up to 1799 px wide nothing changes. No WebGL, so it is quick.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let browser;
let checks = 0;
const check = (name, ok, detail = '') => { assert.ok(ok, detail ? `${name} (${JSON.stringify(detail)})` : name); checks++; console.log(`  ok   ${name}`); };
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  for (const [width, height, grows] of [[1440, 900, false], [1920, 1080, true], [2560, 1440, true]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route('**/big-screen.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="sv"><body></body></html>' }));
    await page.goto(`${origin}big-screen.html`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
      await import('/src/ui/ui.css');
      const { shellHtml } = await import('/src/ui/shell-html.ts');
      const { createStoryPanel } = await import('/src/ui/story.ts');
      document.body.innerHTML = shellHtml();
      document.getElementById('title').hidden = false;
      window.story = createStoryPanel(document, { answer: () => true, cancel: () => {} });
    });
    const title = await page.evaluate(() => {
      const box = document.querySelector('#title > .panel').getBoundingClientRect();
      return { width: box.width, inView: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight };
    });
    // The title's card is laid out 760 px wide on a wide screen; on a big one it is drawn larger, and stays in view.
    check(`${width}×${height}: the title's card ${grows ? 'grows with the screen' : 'keeps its size'} and stays in view`,
      (grows ? title.width >= 760 * 1.24 : Math.abs(title.width - 760) < 1) && title.inView, title);
    // The painting: the pointer at the eye's place on the screen starts the stroke on the eye.
    await page.evaluate(() => { document.getElementById('title').hidden = true; window.story.show({ kind: 'paint', spot: 'eye' }, new Set()); });
    // The sheet rises into place: measure where it rests.
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
    const at = await page.evaluate(() => {
      const svg = document.getElementById('strokePicture'), box = svg.getBoundingClientRect(), view = svg.viewBox.baseVal;
      const scale = Math.min(box.width / view.width, box.height / view.height);
      const left = box.left + (box.width - view.width * scale) / 2, top = box.top + (box.height - view.height * scale) / 2;
      return { x: left + (116 - view.x) * scale, y: top + (64 - view.y) * scale };
    });
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 6, at.y + 1);
    const start = await page.evaluate(() => document.getElementById('strokeLine').getAttribute('d')?.match(/^M([\d.]+) ([\d.]+)/)?.slice(1).map(Number));
    await page.mouse.up();
    check(`${width}×${height}: the painting's stroke starts where the finger touches`, !!start && Math.hypot(start[0] - 116, start[1] - 64) < 1.5, start);
    await page.close();
  }
  console.log(`${checks} big-screen browser checks passed.`);
} finally {
  await browser?.close();
  await server.close();
}
