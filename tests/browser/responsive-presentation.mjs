// Real DOM presentation, independent of WebGL/camera staging. Runtime movement, speech receipts and
// modal navigation stay covered by walk-and-talk, dialogue-reading, settings and photo-focus.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const started = performance.now();
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null } });
const sizes = [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900], [320, 568], [568, 320]];
const cases = [
  { name: 'ordinary reply', who: 'pappa', keys: ['skTinyTogether'], text: 'Då hjälps vi åt. Ropa när du behöver oss.' },
  { name: 'protected reply', who: 'pappa', keys: ['skTinyTogether'], text: 'Då hjälps vi åt. Ropa när du behöver oss.', held: true },
  { name: 'complete joined sentence', who: 'pappa', keys: ['first2', 'first3'], text: 'Den täljde jag till dig när du var liten, Elof.', held: true },
  { name: 'shout', who: 'elof', keys: ['stolenBag'], tone: 'call' },
  { name: 'worry', who: 'elof', keys: ['sameSize'], tone: 'worry' },
  { name: 'thought', who: 'elof', keys: ['fetch'], tone: 'think' },
  { name: 'quiet voice', who: 'pappa', keys: ['first1'], tone: 'soft', held: true },
  { name: 'longer speaker name', who: 'mormor', keys: ['moMormor'], held: true },
];
let browser, checks = 0;
const errors = [], failures = [], samples = [];
const check = (name, ok, detail) => {
  checks++;
  if (!ok) failures.push({ name, ...(detail === undefined ? {} : { detail }) });
};
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/responsive-test.html', route => route.fulfill({ contentType: 'text/html', body:
    '<!doctype html><html lang="sv"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><body><canvas id="game" tabindex="0" aria-label="Äventyret"></canvas></body></html>' }));
  await page.goto(`${server.resolvedUrls.local[0]}responsive-test.html`);
  await page.evaluate(async () => {
    await import('/src/ui/ui.css');
    const { mountShell } = await import('/src/ui/shell.ts');
    const { createHud, readingTime } = await import('/src/ui/hud.ts');
    const { createSceneUi } = await import('/src/ui/scene.ts');
    const { createStoryContext } = await import('/src/ui/story-context.ts');
    const { storyContext } = await import('/src/content/story-context.ts');
    const { createInput } = await import('/src/input/input.ts');
    const { setVoiceSettings } = await import('/src/audio/voice-player.ts');
    const { sv } = await import('/src/content/sv.ts');
    // The production second adventure installs its chapter words when its lazy content module loads.
    await import('/src/content/aventyr2/aventyr2.ts');
    mountShell(document.body); setVoiceSettings(false, 0);
    const byId = id => document.getElementById(id), world = byId('game');
    const completed = [];
    let device = 'touch', paused = false;
    const hud = createHud(document, 100, () => false, () => document.body.classList.contains('big-text') ? 1.2 : 1,
      () => {}, () => {}, id => completed.push(id));
    const sync = () => scene.reading(!paused && hud.reading(), device, 'Vi letar tillsammans');
    const advance = () => { if (hud.advance()) { input.release(); world.focus(); } sync(); };
    const scene = createSceneUi(document, advance);
    const pad = { connected: true, mapping: 'standard', index: 0, id: 'presentation-test', axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    const setDevice = value => {
      device = value; document.body.dataset.device = value;
      byId('controls').hidden = value !== 'touch'; sync();
    };
    const input = createInput({ world, stickZone: byId('stickZone'), stickBase: byId('stickBase'), stickKnob: byId('stickKnob'), hopBtn: byId('hopBtn'), actBtn: byId('actBtn') },
      { onDevice: setDevice }, { win: window, doc: document, gamepads: () => [pad], now: () => performance.now() });
    const purpose = createStoryContext(document);
    purpose.show(storyContext('granskog', new Set(['seesaw:trial']), { x: 0, y: 0 }), true);
    hud.candy(12); hud.verb('take', 'take');
    window.presentation = {
      hud, scene, input, completed, pad, sync, setDevice,
      setPaused(on) { paused = on; hud.paused(on); sync(); },
      show(spec, big, using = 'touch') {
        paused = false; hud.paused(false); hud.clear(); hud.hush();
        document.body.classList.toggle('big-text', big);
        setDevice(using);
        const texts = spec.keys.map(key => { if (!sv.lines[key]) throw Error(`Missing authored line ${key}`); return sv.lines[key]; });
        for (const [i, key] of spec.keys.entries()) {
          if (i) hud.tick(readingTime(texts[i - 1]) * (big ? 1.2 : 1) + .01);
          hud.say(spec.who, key, !!spec.held, `layout:${key}`); hud.tick(0);
        }
        hud.tick(.3); sync();
        return { text: texts.join(' '), who: sv.who[spec.who] };
      },
      poll() { const edges = input.consume(); if (hud.reading() && edges.act) advance(); sync(); return edges; },
    };
    await document.fonts.ready;
  });
  const cdp = await page.context().newCDPSession(page);
  const emptyInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const phone = Math.min(width, height) <= 480;
    const profiles = phone ? [emptyInsets, width < height ? { top: 47, right: 0, bottom: 34, left: 0 } : { top: 0, right: 47, bottom: 21, left: 47 }] : [emptyInsets];
    for (const insets of profiles) {
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
      // Prove that the browser really applied nonzero env() values; a zero-inset false positive is not a notch test.
      const applied = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.cssText = 'position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden';
        document.body.append(probe); const css = getComputedStyle(probe);
        const values = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map(key => parseFloat(css[key])); probe.remove(); return values;
      });
      check(`${width}×${height}: real safe-area values`, JSON.stringify(applied) === JSON.stringify([insets.top, insets.right, insets.bottom, insets.left]), { insets, applied });
      const variants = [false, true].flatMap(big => cases.map(spec => ({ spec, big, lefty: false })));
      // Mirrored controls can meet the other edge of the dialogue. Check the real setting at the
      // two smallest phone shapes without multiplying every tone and desktop combination.
      if (width === 320 || width === 568) variants.push(...[false, true].flatMap(big => cases.slice(0, 2).map(spec => ({ spec, big, lefty: true }))));
      for (const { spec, big, lefty } of variants) {
        const expected = await page.evaluate(({ spec, big, lefty }) => {
          document.body.classList.toggle('lefty', lefty);
          return window.presentation.show(spec, big);
        }, { spec, big, lefty });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        });
        const value = await page.evaluate(({ insets }) => {
          const byId = id => document.getElementById(id);
          const seen = node => {
            if (!node || node.closest('[hidden],.sr-only')) return false;
            for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
              const css = getComputedStyle(ancestor);
              if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return false;
            }
            const box = node.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
          };
          const rect = node => node.getBoundingClientRect().toJSON();
          const inside = (a, b, slack = 1.1) => a.left >= b.left - slack && a.right <= b.right + slack && a.top >= b.top - slack && a.bottom <= b.bottom + slack;
          const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const bubble = byId('bubble'), reading = byId('sceneReading'), line = byId('bubbleLine');
          const safe = { left: insets.left, right: innerWidth - insets.right, top: insets.top, bottom: innerHeight - insets.bottom };
          const panels = [byId('dialogue'), bubble, reading].filter(seen).map(rect);
          const union = { left: Math.min(...panels.map(r => r.left)), right: Math.max(...panels.map(r => r.right)), top: Math.min(...panels.map(r => r.top)), bottom: Math.max(...panels.map(r => r.bottom)) };
          const controls = ['pauseBtn', 'helpBtn', 'bag', 'hopBtn', 'actBtn', 'stickBase'].map(byId).filter(seen).map(node => ({ id: node.id, ...rect(node) }));
          const clipped = [];
          for (const element of [byId('bubbleWho'), line, ...(seen(reading) ? [reading] : [])]) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              if (!text.textContent.trim() || !seen(text.parentElement)) continue;
              const range = document.createRange(); range.selectNodeContents(text);
              for (const glyphs of range.getClientRects()) {
                // Font ascent/descent can exceed an inner line box without being clipped. The outer
                // paper, not the transparent bubble's content box, is the visual containment boundary.
                const container = text.parentElement.closest('#sceneNext') ?? byId('dialogue') ?? bubble;
                if (!inside(glyphs, safe) || !inside(glyphs, rect(container))) clipped.push(text.textContent);
                for (let ancestor = text.parentElement; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                  const css = getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
                  if ((['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowX) && (glyphs.left < box.left - 1 || glyphs.right > box.right + 1)) ||
                    (['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowY) && (glyphs.top < box.top - 1 || glyphs.bottom > box.bottom + 1))) clipped.push(text.textContent);
                }
              }
            }
          }
          const decorations = [...bubble.querySelectorAll('.tone-edge path,.think-rings circle')].filter(seen).map(rect);
          return { text: line.textContent, who: byId('bubbleWho').textContent, tone: bubble.dataset.tone,
            font: parseFloat(getComputedStyle(line).fontSize), bubble: rect(bubble), panels, union, controls,
            area: (union.right - union.left) * (union.bottom - union.top) / (innerWidth * innerHeight),
            clipped: [...new Set(clipped)], safePanels: panels.every(r => inside(r, safe)),
            clear: controls.every(control => panels.every(panel => !overlaps(panel, control))),
            controlsSafe: controls.every(control => inside(control, safe) && control.width >= 63.5 && control.height >= 63.5),
            decorationsSafe: decorations.every(r => inside(r, safe)), decorations,
            noClamp: [line, ...line.children].every(node => !['ellipsis'].includes(getComputedStyle(node).textOverflow) && ['none', '0', ''].includes(getComputedStyle(node).webkitLineClamp)),
            reading: seen(reading), button: rect(byId('sceneNext')), pause: seen(byId('pauseBtn')),
            noPageScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight && scrollX === 0 && scrollY === 0,
            status: bubble.getAttribute('role'), describedBy: byId('sceneNext').getAttribute('aria-describedby') };
        }, { insets });
        const label = `${width}×${height}${big ? ' Big Text' : ''}${lefty ? ' left-handed' : ''}${insets.top || insets.left ? ' safe-area' : ''} ${spec.name}`;
        // The short 320px portrait is an explicit accessibility exception: full 25px words plus
        // a 64px action need more of its small screen. It must still leave at least 62% for the world.
        const budget = height <= 480 ? spec.held ? .38 : .26 : spec.held ? width <= 320 ? .38 : .28 : .18;
        check(`${label}: complete authored words and speaker`, value.text === (spec.text ?? expected.text) && value.who === expected.who, { got: value.text, expected, who: value.who });
        check(`${label}: all text stays legible, unclipped and inside the safe area`, value.font >= (big ? 25 : 20) - .1 && value.clipped.length === 0 && value.safePanels && value.noClamp, { font: value.font, clipped: value.clipped, safePanels: value.safePanels, noClamp: value.noClamp, panels: value.panels });
        check(`${label}: dialogue and its action leave the world visible`, value.area <= budget + .001, { area: value.area, budget, union: value.union });
        check(`${label}: utility and active touch targets remain clear and within safe areas`, value.pause && value.clear && value.controlsSafe, { panels: value.panels, controls: value.controls });
        check(`${label}: decorations and root layout stay bounded`, value.decorationsSafe && value.noPageScroll && (!spec.tone || value.tone === spec.tone), { decorations: value.decorations, noPageScroll: value.noPageScroll });
        check(`${label}: only protected speech has its accessible 64px action`, value.reading === !!spec.held && (!spec.held || value.button.height >= 63.5 && value.button.width >= 63.5 && value.describedBy === 'bubbleWho bubbleLine') && value.status === 'status', value.button);
        samples.push({ label, area: value.area, budget, height: value.union.bottom - value.union.top });
      }
    }
    console.log(`  checked ${width}×${height}: authored text, normal/Big Text, speech/action bounds, controls and safe areas`);
  }

  // Native keyboard focus and the real input adapter's controller X edge, without a synthetic click.
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: emptyInsets });
  await page.evaluate(() => document.body.classList.remove('lefty'));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(spec => { window.presentation.show(spec, true, 'keys'); document.getElementById('game').focus(); }, cases[1]);
  for (let tries = 0; tries < 12 && !await page.locator('#sceneNext').evaluate(node => document.activeElement === node); tries++) await page.keyboard.press('Tab');
  check('keyboard reaches the visible reading action with a visible focus indicator', await page.locator('#sceneNext').evaluate(node => document.activeElement === node && node.matches(':focus-visible') && parseFloat(getComputedStyle(node).outlineWidth) >= 2));
  const beforeKeys = await page.evaluate(() => window.presentation.completed.length);
  await page.keyboard.press('Enter');
  check('native Enter advances exactly one line and returns focus to play', await page.evaluate(before => window.presentation.completed.length === before + 1 && !window.presentation.hud.reading() && document.activeElement?.id === 'game', beforeKeys));
  await page.evaluate(spec => { window.presentation.show(spec, false, 'pad'); document.getElementById('game').focus(); window.presentation.poll(); }, cases[1]);
  const beforePad = await page.evaluate(() => window.presentation.completed.length);
  check('controller prompt names the actual optional-advance button without stealing focus', await page.evaluate(() => document.getElementById('sceneNextKey').textContent === 'X' && document.activeElement?.id === 'game'));
  await page.evaluate(async () => {
    window.presentation.pad.buttons[2] = { pressed: true, value: 1 };
    // Production coalesces pad polls within 4ms. A pair of native frames represents a later
    // controller sample; two fast protocol calls in the same frame are not two input updates.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.presentation.poll();
  });
  await page.evaluate(() => window.presentation.poll());
  check('the real controller X edge advances once and leaves focus on play', await page.evaluate(before => window.presentation.completed.length === before + 1 && !window.presentation.hud.reading() && document.activeElement?.id === 'game', beforePad));
  await page.evaluate(() => { window.presentation.pad.buttons[2] = { pressed: false, value: 0 }; window.presentation.poll(); });
  await page.evaluate(spec => window.presentation.show(spec, false), cases[1]);
  const beforeTouch = await page.evaluate(() => window.presentation.completed.length);
  await page.tap('#sceneNext');
  check('touch uses the same full-size action and acknowledges once', await page.evaluate(before => window.presentation.completed.length === before + 1 && !window.presentation.hud.reading(), beforeTouch));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(spec => { window.presentation.show(spec, true, 'keys'); document.getElementById('sceneNext').focus(); }, cases[2]);
  const beforeRotate = await page.evaluate(() => ({ text: document.getElementById('bubbleLine').textContent, receipts: window.presentation.completed.length }));
  await page.setViewportSize({ width: 844, height: 390 });
  check('rotation retains the full joined sentence and its focused action without page scrolling', await page.evaluate(before => {
    const next = document.getElementById('sceneNext'), rect = next.getBoundingClientRect();
    return document.getElementById('bubbleLine').textContent === before.text && window.presentation.completed.length === before.receipts
      && document.activeElement === next && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth && scrollX === 0 && scrollY === 0;
  }, beforeRotate));

  // Presentation must not change docks during the short completion linger, or when Pause hides
  // the action. The hidden action still reserves its place but must not receive pointer/Tab input.
  for (const [width, height] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(spec => window.presentation.show(spec, true, 'keys'), cases[1]);
    await page.evaluate(async () => Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    const dock = await page.evaluate(() => {
      const { hud, setPaused } = window.presentation;
      const box = () => {
        const { x, y, width, height } = document.getElementById('dialogue').getBoundingClientRect();
        return { x, y, width, height };
      };
      const before = box(), next = document.getElementById('sceneNext').getBoundingClientRect();
      setPaused(true); hud.tick(120);
      const controlsHidden = ['controls', 'bag', 'helpBtn'].every(id => {
        const node = document.getElementById(id), css = getComputedStyle(node);
        return node.hidden || css.visibility === 'hidden' || css.display === 'none';
      });
      return { before, paused: box(), controlsHidden, point: { x: next.x + next.width / 2, y: next.y + next.height / 2 }, receipts: window.presentation.completed.length };
    });
    check(`${width}×${height}: Pause preserves the protected card's exact dock and keeps other controls suppressed`, JSON.stringify(dock.before) === JSON.stringify(dock.paused) && dock.controlsHidden, dock);
    check(`${width}×${height}: the reserved paused action is absent from visible accessibility controls`, await page.getByRole('button', { name: /Fortsätt/ }).count() === 0);
    await page.mouse.click(dock.point.x, dock.point.y);
    await page.evaluate(() => document.getElementById('game').focus());
    let hiddenActionFocused = false;
    for (let n = 0; n < 12; n++) {
      await page.keyboard.press('Tab');
      hiddenActionFocused ||= await page.locator('#sceneNext').evaluate(node => document.activeElement === node);
    }
    check(`${width}×${height}: hidden Continue neither receives Tab nor completes a line on pointer input`, !hiddenActionFocused && await page.evaluate(before => window.presentation.completed.length === before, dock.receipts));
    const finish = await page.evaluate(() => {
      const { hud, sync, setPaused } = window.presentation;
      const box = () => {
        const { x, y, width, height } = document.getElementById('dialogue').getBoundingClientRect();
        return { x, y, width, height };
      };
      setPaused(false);
      const resumed = box();
      // Natural completion has the continuation linger; optional Continue intentionally dismisses
      // the bubble immediately and is already checked separately above.
      for (let i = 0; i < 1000 && hud.reading(); i++) hud.tick(.01);
      sync();
      const finished = box(); hud.tick(.15); sync();
      const linger = box(), reservedHidden = document.getElementById('sceneReading').hidden && getComputedStyle(document.getElementById('sceneNext')).visibility === 'hidden';
      const controlsHidden = ['controls', 'bag', 'helpBtn'].every(id => {
        const node = document.getElementById(id), css = getComputedStyle(node);
        return node.hidden || css.visibility === 'hidden' || css.display === 'none';
      });
      hud.tick(.2); sync();
      const gone = document.getElementById('bubble').hidden && document.getElementById('dialogue').getBoundingClientRect().height === 0;
      return { resumed, finished, linger, reservedHidden, controlsHidden, gone };
    });
    check(`${width}×${height}: completion and linger keep the same dock and suppressed controls before the whole card leaves`, [finish.resumed, finish.finished, finish.linger].every(rect => JSON.stringify(rect) === JSON.stringify(dock.before)) && finish.reservedHidden && finish.controlsHidden && finish.gone, { before: dock.before, ...finish });
    await page.evaluate(spec => window.presentation.show(spec, true, 'keys'), cases[0]);
    check(`${width}×${height}: a new ordinary line releases the protected presentation`, await page.evaluate(() => document.getElementById('bubble').dataset.protected === 'false' && document.getElementById('dialogue').getBoundingClientRect().top < innerHeight / 2));
  }

  // A short-lived find must not expire unseen under a full line; Pause must not consume its saved lifetime.
  const notice = await page.evaluate(spec => {
    const { hud, scene, show } = window.presentation;
    const seen = id => { const node = document.getElementById(id), css = getComputedStyle(node); return !node.hidden && css.visibility !== 'hidden' && css.display !== 'none'; };
    show(spec, false); hud.notice('Ny sort: Geléhallon!', 3); hud.tick(.1);
    const speech = document.getElementById('bubbleLine').textContent, deferred = !seen('notice');
    hud.tick(2); hud.paused(true); hud.tick(120);
    const paused = !seen('notice') && document.getElementById('bubbleLine').textContent === speech;
    hud.paused(false);
    for (let i = 0; i < 200 && hud.speaking(); i++) hud.tick(.1);
    for (let i = 0; i < 50 && seen('bubble'); i++) hud.tick(.01);
    scene.reading(false, 'touch'); hud.tick(0);
    const returned = seen('notice') && document.getElementById('noticeText').textContent === 'Ny sort: Geléhallon!';
    const purposeDuringNotice = getComputedStyle(document.getElementById('storyPurpose')).visibility === 'hidden';
    hud.tick(.4); hud.paused(true); hud.tick(120); const shownPause = seen('notice'); hud.paused(false);
    hud.tick(2.4); const remains = seen('notice'); hud.tick(.3); const expired = !seen('notice');
    return { deferred, paused, returned, remains, expired, purposeDuringNotice, shownPause };
  }, cases[0]);
  check('speech keeps notice lifetime for later; Pause is exact and the full notice is then readable', Object.values(notice).every(Boolean), notice);
  assert.deepEqual(errors, [], 'DOM presentation has no browser errors');
  const seconds = (performance.now() - started) / 1000;
  if (process.env.PRESENTATION_REPORT) writeFileSync(process.env.PRESENTATION_REPORT, JSON.stringify({ checks, seconds, failures, samples, errors }, null, 2));
  assert.deepEqual(failures, [], 'responsive presentation contracts');
  console.log(`Responsive presentation: ${checks} checks passed across ${samples.length} authored-line layouts in ${seconds.toFixed(1)}s; no WebGL or camera claim.`);
} finally {
  await browser?.close();
  await server.close();
}
