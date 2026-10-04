// Byn's street life and shop: real chapter/simulation/renderer, with stand-ins and deterministic clocks.
// Run after npm run assets: node tests/browser/village.mjs. Captures are ignored iteration evidence.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/village');
mkdirSync(shots, { recursive: true });
const virtual = '\0village-fixture';
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } }, plugins: [{
  name: 'village-test-fixture',
  resolveId(id) { if (id === '/village-fixture.js') return virtual; },
  load(id) {
    if (id !== virtual) return;
    return `
      import { Scene } from 'three';
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
      export { byn } from ${JSON.stringify(join(root, 'src/content/chapters/byn.ts'))};
      let scene; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { scene = this; before.apply(this, args); };
      export const renderedScene = () => scene;
    `;
  },
}] });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, ok) => { assert.ok(ok, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [width, height] of [[844, 390], [390, 844]]) for (const tier of ['low', 'high']) {
    for (const [place, x, y] of [['shoes', 6, 2.01], ['car', 65, 0.01], ['door', 122, 3.31], ['shop', 136, 3.31], ['bag', 156, 3.31]]) {
      const name = `${width}x${height}-${tier}-${place}`;
      if (process.env.VILLAGE_CASE && !name.includes(process.env.VILLAGE_CASE)) continue;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.route('**/village-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
      await page.goto(`${origin}/spokets-godisbus/village-probe`);
      const early = await page.evaluate(async ({ x, y, tier }) => {
        const f = await import('/spokets-godisbus/village-fixture.js');
        const chapter = { ...f.byn, spawn: { x, y } };
        const game = new f.Game(chapter, {}, { placed: ['box'], flags: ['leaf', 'placed:box'] });
        const view = f.createView(document.getElementById('game'), chapter, tier, true);
        const draw = (dt = 0) => { const s = game.sim; view.render({
          prev: s.prev, curr: s.curr, alpha: 1, dt, atGoal: s.flags.has('goal'), collected: s.collected,
          checkpoint: s.checkpoint, movers: s.movers, drips: s.drips, flags: s.flags, ghost: s.ghost,
          rollers: s.rollers, tussocks: s.tussocks, gusts: s.gusts, help: s.help, berries: s.berries,
        }); };
        const until = performance.now() + 15000;
        while (view.info().models.length < 2 && performance.now() < until) await new Promise((r) => setTimeout(r, 25));
        for (let i = 0; i < 4; i++) draw();
        const scene = f.renderedScene();
        const shoes = scene.getObjectByName('passing-shoes'), car = scene.getObjectByName('passing-car');
        const snapshot = () => ({ ...view.info(), shoes: shoes.position.toArray(), car: car.position.toArray(),
          feet: shoes.children.filter((c) => c.isGroup).map((c) => c.position.toArray()), state: JSON.stringify(game.sim.curr) });
        window.probe = { f, game, view, draw, scene, snapshot };
        return { ...snapshot(), interior: scene.getObjectByName('candy-shop-interior').children.length };
      }, { x, y, tier });
      await page.screenshot({ path: join(shots, `${name}.png`) });
      check(`${name}: scene and assets render within budget (${early.models.length} models, ${early.drawCalls} calls)`, early.models.length >= 2 && early.interior > 10 && early.drawCalls > 20 && early.drawCalls <= 120);
      const moved = await page.evaluate(() => { const p = window.probe; for (let i = 0; i < 6; i++) p.draw(0.5); return p.snapshot(); });
      check(`${name}: street life moves safely behind the play plane without shaders or simulation changes`, moved.shoes[0] > early.shoes[0] && moved.car[0] > early.car[0] && moved.shoes[2] < -10 && moved.car[2] < -10 && moved.programs === early.programs && moved.state === early.state && moved.drawCalls <= 120);
      const paused = await page.evaluate(() => { const p = window.probe; p.draw(0); return p.snapshot(); });
      check(`${name}: pause freezes street life`, JSON.stringify(paused.shoes) === JSON.stringify(moved.shoes) && JSON.stringify(paused.car) === JSON.stringify(moved.car) && JSON.stringify(paused.feet) === JSON.stringify(moved.feet));
      if (place === 'door') {
        const walk = await page.evaluate(() => {
          const p = window.probe, programs = p.view.info().programs; let stable = true, maxCalls = 0;
          for (let i = 0; i < 1200 && !p.game.sim.flags.has('goal'); i++) {
            p.game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
            if (i % 30 === 0) { p.draw(0.5); stable &&= p.view.info().programs === programs; maxCalls = Math.max(maxCalls, p.view.info().drawCalls); }
          }
          p.draw(0);
          return { goal: p.game.sim.flags.has('goal'), x: p.game.sim.curr.x, checkpoint: p.game.sim.checkpoint,
            bubbles: p.game.sim.bubbles, knocks: p.game.sim.knocks, stable, maxCalls };
        });
        check(`${name}: walking through the room reaches its new ending and checkpoints`, walk.goal && walk.x >= 158 && walk.checkpoint === 9 && walk.bubbles === 0 && walk.knocks === 0 && walk.stable && walk.maxCalls <= 120);
      }
      assert.deepEqual(errors, [], `${name}: browser errors`);
      console.log(`  draws ${name}: ${early.drawCalls}`);
      await page.close();
    }
  }
  console.log(`village: ${checks} checks passed; captures in docs/shots/_work/village/`);
} finally { await browser.close(); await server.close(); }
