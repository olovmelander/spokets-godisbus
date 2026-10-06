// Authored story stops, actual WebGL, paused picture time and bounded generated textures.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/ghost-thoughts'); mkdirSync(shots, { recursive: true });
const virtual = '\0ghost-thought-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'ghost-thought-fixture',
    resolveId(id) { if (id === '/ghost-thought-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Scene, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { createGhostThought } from ${JSON.stringify(join(root, 'src/render/ghost-thought.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { COURSES } from ${JSON.stringify(join(root, 'src/content/chapters/index.ts'))};
        let scene, camera; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
        export const renderedScene = () => scene;
        export function corners(mesh) { return [[-0.5,-0.5],[0.5,0.5]].map(([x,y]) => mesh.localToWorld(new Vector3(x * mesh.geometry.parameters.width, y * mesh.geometry.parameters.height, 0)).project(camera).toArray()); }
      `;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [course, x, y, gate, expected] of [
    ['granskog', 194, -8, 'placed:rescue', 'mountain'],
    ['myren', 183, 0, 'home', 'pine-crack'],
    ['berget', 141.8, 26.4, null, 'lonely-figure'],
  ]) for (const [width, height, tier] of [[844, 390, 'low'], [390, 844, 'high']]) {
    const name = `${course}-${width}x${height}-${tier}`;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/thought-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/thought-probe`);
    const early = await page.evaluate(async ({ course, x, y, tier, gate }) => {
      const f = await import('/spokets-godisbus/ghost-thought-fixture.js');
      const chapter = { ...f.COURSES[course], spawn: { x, y } };
      const sim = new f.Sim(chapter);
      // The cliff's picture is immediately available. Hold it in a hop for the warmup test.
      if (!gate) sim.ghost.t = 0.7;
      const view = f.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt,
        atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
        drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries });
      await view.ready;
      for (let i = 0; i < 4; i++) draw(0.25);
      const scene = f.renderedScene(), card = scene.getObjectByName('ghost-thought');
      const snapshot = () => ({ ...view.info(), opacity: card.material.opacity, at: card.position.toArray(),
        corners: f.corners(card), scale: card.scale.x, version: card.material.map.version,
        sim: JSON.stringify({ curr: sim.curr, flags: [...sim.flags], ghost: sim.ghost }) });
      const pixels = card.material.map.image.getContext('2d').getImageData(0, 0, 256, 192).data;
      const colours = { green: 0, grey: 0, smile: 0 };
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 95 && pixels[i+1] === 109 && pixels[i+2] === 87) colours.green++;
        if (pixels[i] === 170 && pixels[i+1] === 169 && pixels[i+2] === 159) colours.grey++;
        if (pixels[i] === 93 && pixels[i+1] === 90 && pixels[i+2] === 83) colours.smile++;
      }
      window.probe = { f, chapter, sim, view, draw, scene, card, snapshot };
      return { ...snapshot(), colours, canvas: [card.material.map.image.width, card.material.map.image.height] };
    }, { course, x, y, tier, gate });
    check(`${name}: early or travelling ghost reveals no picture`, early.opacity === 0 && early.scale === 0);
    check(`${name}: one bounded pre-drawn atlas shows only its authored symbols`,
      early.canvas[0] === (course === 'granskog' ? 512 : 256) && early.canvas[1] === 192 &&
      (expected === 'mountain' ? early.colours.green === 0 && early.colours.grey === 0 && early.colours.smile === 0 :
        expected === 'pine-crack' ? early.colours.green > 100 && early.colours.grey > 50 && early.colours.smile === 0 : early.colours.green > 100 && early.colours.smile > 5));
    const shown = await page.evaluate((gate) => {
      const p = window.probe;
      if (gate) p.sim.flags.add(gate); else p.sim.ghost.t = 1;
      for (let i = 0; i < 10; i++) p.draw(0.1);
      return p.snapshot();
    }, gate);
    check(`${name}: story progress reveals a legible picture inside the viewport`, shown.opacity > 0.9 && shown.scale === 1 && shown.corners.every((point) => Math.abs(point[0]) <= 0.99 && Math.abs(point[1]) <= 0.99));
    check(`${name}: thought shader was warmed and draw calls remain bounded`, shown.programs === early.programs && withinDraws(shown.drawCalls, shown.tier));
    await picture(page, join(shots, `${name}.png`));
    const paused = await page.evaluate(() => { const p = window.probe; for (let i = 0; i < 20; i++) p.draw(0); return p.snapshot(); });
    check(`${name}: pause freezes placement and opacity without changing the simulation`, JSON.stringify(paused.at) === JSON.stringify(shown.at) && paused.opacity === shown.opacity && paused.sim === shown.sim);
    const calm = await page.evaluate(() => { const p = window.probe; document.documentElement.dataset.motion = 'reduce'; p.draw(0.2); const a = p.snapshot(); for (let i = 0; i < 40; i++) p.draw(0.1); return { a, b: p.snapshot() }; });
    check(`${name}: calm motion keeps the picture still without new textures or shaders`, JSON.stringify(calm.a.at) === JSON.stringify(calm.b.at) && calm.b.textures === shown.textures && calm.b.geometries === shown.geometries && calm.b.programs === shown.programs && calm.b.version === shown.version);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const os = await page.evaluate(() => { const p = window.probe; delete document.documentElement.dataset.motion; p.draw(0.2); const a = p.snapshot(); p.draw(1); return { a, b: p.snapshot() }; });
    check(`${name}: OS reduced motion uses the same static picture`, JSON.stringify(os.a.at) === JSON.stringify(os.b.at) && JSON.stringify(os.a.at) === JSON.stringify(calm.a.at));
    const departed = await page.evaluate((course) => { const p = window.probe; if (course === 'berget') p.sim.flags.add('lift'); else p.sim.ghost.gone = true; p.draw(0); return p.snapshot(); }, course);
    check(`${name}: leaving or helping at Lift immediately clears the picture`, departed.opacity === 0 && departed.scale === 0);
    const disposed = await page.evaluate(() => {
      const p = window.probe, thought = p.f.createGhostThought(p.chapter);
      let n = 0; for (const resource of [thought.mesh.geometry, thought.mesh.material, thought.mesh.material.map]) resource.addEventListener('dispose', () => n++);
      p.scene.add(thought.mesh); thought.dispose();
      return n === 3 && thought.mesh.parent === null && p.f.createGhostThought(p.f.COURSES.garden) === null;
    });
    check(`${name}: card releases all three resources and adds nothing to the garden`, disposed);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(`  draws ${name}: ${shown.drawCalls}`);
    await page.close();
  }
  console.log(`Ghost thought pictures: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
