// Real renderer + game, with a deterministic visual clock; no production testing hooks.
// Run after npm run assets: node tests/browser/helper.mjs. Stand-in captures are ignored.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/helper');
mkdirSync(shots, { recursive: true });
const virtual = '\0helper-fixture';
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } }, plugins: [{
  name: 'helper-fixture', resolveId(id) { if (id === '/helper-fixture.js') return virtual; },
  load(id) {
    if (id !== virtual) return;
    return `import { Scene, Vector3 } from 'three';
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
      export { garden } from ${JSON.stringify(join(root, 'src/content/chapters/garden.ts'))};
      export { granskog } from ${JSON.stringify(join(root, 'src/content/chapters/granskog.ts'))};
      export { mountShell } from ${JSON.stringify(join(root, 'src/ui/shell.ts'))};
      let scene, camera; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
      export const renderedScene = () => scene;
      export const helperPoint = () => { const p = new Vector3(); scene.getObjectByName('helper-actor').getWorldPosition(p); p.y += 0.5; p.project(camera); const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left + (p.x+1)*r.width/2, y: r.top + (1-p.y)*r.height/2 }; };`;
  },
}] });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [width, height] of [[844, 390], [390, 844]]) for (const tier of ['low', 'high']) {
    const name = `${width}x${height}-${tier}`;
    if (process.env.HELPER_CASE && !name.includes(process.env.HELPER_CASE)) continue;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const errors = [], fetched = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('request', (request) => fetched.push(request.url()));
    await page.route('**/helper-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/helper-probe`);
    const visit = await page.evaluate(async ({ tier }) => {
      const f = await import('/spokets-godisbus/helper-fixture.js');
      const chapter = { ...f.garden, spawn: { x: 60, y: 0.01 } };
      const game = new f.Game(chapter, {}, { flags: ['ladybird'] });
      for (let i = 0; i < 24; i++) game.sim.step({ x: 0, y: 0, hopHeld: false, hop: false, act: false });
      const view = f.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0) => { const s = game.sim; view.render({ prev: s.prev, curr: s.curr, alpha: 1, dt,
        atGoal: s.flags.has('goal'), collected: s.collected, checkpoint: s.checkpoint, movers: s.movers,
        drips: s.drips, flags: s.flags, ghost: s.ghost, rollers: s.rollers, tussocks: s.tussocks, gusts: s.gusts,
        help: s.help, berries: s.berries }); };
      const until = performance.now() + 15000;
      while (!view.info().models.includes('boot/big-candy') && performance.now() < until) await new Promise((r) => setTimeout(r, 25));
      for (let i = 0; i < 4; i++) draw(0.25);
      const scene = f.renderedScene(), actor = scene.getObjectByName('helper-actor');
      const snapshot = () => ({ ...view.info(), actor: actor.position.toArray(), screen: view.helperScreen(),
        ghostCount: Number(scene.getObjectByName('chase-ghost').visible) + Number(actor.scale.x > 0),
        bird: !!actor.getObjectByName('bird'),
        figures: [0, 1, 2].map((i) => { const m = scene.getObjectByName(`helper-demo-${i}`); return { at: m.position.toArray(), opacity: m.material.opacity, matrix: Array.from(m.instanceMatrix.array) }; }),
        ropeOpacity: scene.getObjectByName('helper-demo-lace').material.opacity,
        state: JSON.stringify({ curr: game.sim.curr, flags: [...game.sim.flags], collected: game.sim.collected, movers: game.sim.movers.map((m) => [m.x, m.y, m.stop]) }),
        help: { ...game.sim.help } });
      const ask = () => game.sim.step({ x: 0, y: 0, hopHeld: false, hop: false, act: false, help: true });
      window.probe = { f, game, view, draw, snapshot, ask };
      return snapshot();
    }, { tier });
    check(`${name}: one ghost visits the actual gully without a jay download or Använd hint`, visit.ghostCount === 1 && !visit.bird && visit.help.step === 1 && visit.help.visit && visit.help.verb === null && visit.models.includes('boot/big-candy') && !visit.models.includes('boot/jay') && !fetched.some((url) => url.includes('/jay.glb')));
    check(`${name}: visitor is visible and within draw budget`, visit.screen && visit.screen.x > 0 && visit.screen.x < width && withinDraws(visit.drawCalls, visit.tier));
    await picture(page, join(shots, `${name}-visit.png`));
    const first = await page.evaluate(() => { const p = window.probe; p.ask(); p.ask(); p.draw(0); return p.snapshot(); });
    const middle = await page.evaluate(() => { const p = window.probe; for (let i = 0; i < 5; i++) p.draw(0.5); return p.snapshot(); });
    await picture(page, join(shots, `${name}-swing.png`));
    const end = await page.evaluate(() => { const p = window.probe; for (let i = 0; i < 5; i++) p.draw(0.5); return p.snapshot(); });
    check(`${name}: dotted Elof demonstrates the full swing without granting progress`, first.help.step === 3 && middle.figures[0].at[0] !== first.figures[0].at[0] && middle.ropeOpacity > 0 && Math.abs(end.figures[0].at[0] - 67.8) < 0.01 && end.ropeOpacity === 0 && end.state === first.state);
    // What was measured is in the check's name: when this fails on a slower computer, the log says which half.
    const shown = [visit, first, middle, end];
    check(`${name}: visit and demonstration compile no new shaders and fit the draw budget (programs ${shown.map((s) => s.programs).join(", ")}; draw calls ${shown.map((s) => s.drawCalls).join(", ")})`, first.programs === visit.programs && middle.programs === visit.programs && end.programs === visit.programs && withinDraws(Math.max(first.drawCalls, middle.drawCalls, end.drawCalls), first.tier));
    const paused = await page.evaluate(() => { const p = window.probe; p.draw(0); return p.snapshot(); });
    check(`${name}: pause holds the helper and demonstration`, JSON.stringify(paused.actor) === JSON.stringify(end.actor) && JSON.stringify(paused.figures) === JSON.stringify(end.figures));
    const repeated = await page.evaluate(() => { const p = window.probe; p.ask(); p.draw(0); return p.snapshot(); });
    check(`${name}: another request replays the short demonstration`, repeated.help.replay === first.help.replay + 1 && Math.abs(repeated.figures[0].at[0] - first.figures[0].at[0]) < 0.01);
    const calm = await page.evaluate(() => { document.body.classList.add('calm'); const p = window.probe; p.draw(0); return p.snapshot(); });
    const calmLater = await page.evaluate(() => { const p = window.probe; p.draw(2); return p.snapshot(); });
    check(`${name}: Mindre rörelse keeps a static three-pose explanation`, calm.figures.every((f) => f.opacity > 0) && JSON.stringify(calm.figures) === JSON.stringify(calmLater.figures) && JSON.stringify(calm.actor) === JSON.stringify(calmLater.actor) && calm.programs === visit.programs);
    await picture(page, join(shots, `${name}-calm.png`));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const os = await page.evaluate(() => { document.body.classList.remove('calm'); const p = window.probe; p.draw(1); return p.snapshot(); });
    check(`${name}: device reduced-motion preference selects the same still explanation`, JSON.stringify(os.figures) === JSON.stringify(calm.figures));
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(`  draws ${name}: ${visit.drawCalls}/${middle.drawCalls}/${calm.drawCalls}`);
    await page.close();
  }
  for (const [course, at, flags, ghost] of [['garden', '60,0.01', 'ladybird', true], ['granskog', '36,0.01', 'berry', false]]) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
    await page.goto(`${origin}/spokets-godisbus/?dev&debug&standin&tier=low&course=${course}&at=${at}&flags=${flags}`);
    await page.waitForFunction(() => window.__godis?.info().models.includes('boot/big-candy'));
    if (ghost) {
      // Let the entrance finish before measuring a touch point. Asset readiness can occur mid-hop.
      await page.waitForFunction(() => window.__godis.state().steps >= 120);
      await page.locator('#pauseBtn').click();
      const point = await page.evaluate(async () => {
        const f = await import('/spokets-godisbus/helper-fixture.js');
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return f.helperPoint();
      });
      const before = await page.evaluate(() => window.__godis.state());
      check('actual garden page: the story visit has no action pulse and the button depicts the ghost', before.help.visit && !(await page.locator('#actBtn').evaluate((e) => e.classList.contains('pulse'))) && await page.locator('#helpBtn circle').count() === 2);
      await page.locator('#resumeBtn').click();
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForFunction(() => window.__godis.state().help.step === 2).catch(async (error) => {
        console.log('touch diagnostic', point, await page.evaluate(() => window.__godis.state()));
        await picture(page, join(shots, 'touch-failure.png'));
        throw error;
      });
      check('actual garden page: tapping the world helper asks the next hint', await page.locator('#actBtn').evaluate((e) => e.classList.contains('pulse')));
    } else {
      await page.waitForFunction(() => window.__godis.info().models.includes('boot/jay'));
      await page.locator('#helpBtn').click();
      await page.waitForFunction(() => window.__godis.state().help.step === 1);
      check('actual forest page: the jay still loads and its portrait asks for help', await page.locator('#helpBtn circle').count() === 1);
    }
    await page.locator('#helpBtn').click();
    await page.waitForFunction(() => window.__godis.state().help.step >= 2);
    check(`actual ${course} page: further hints keep the player in place`, Math.abs((await page.evaluate(() => window.__godis.state())).x - Number(at.split(',')[0])) < 0.2);
    await page.close();
  }
  console.log(`helper: ${checks} checks passed; captures in docs/shots/_work/helper/`);
} finally { await browser.close(); await server.close(); }
