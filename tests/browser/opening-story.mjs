// Real WebGL: painted eyes, an identifiable stolen bag and a shared family scale-change shot.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/opening-story');
mkdirSync(shots, { recursive: true });
const virtual = '\0opening-story-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'opening-story-fixture',
    resolveId(id) { if (id === '/opening-story-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Scene, Box3, Vector3, Matrix4 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { prolog } from ${JSON.stringify(join(root, 'src/content/chapters/ends.ts'))};
        let scene, camera; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) {
          if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; }
          before.apply(this, args);
        };
        export const renderedScene = () => scene;
        export function bounds(object) {
          const box = new Box3().setFromObject(object), corners = [];
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z).project(camera).toArray());
          return corners;
        }
        export function candyScales(mesh) {
          const m = new Matrix4(), s = new Vector3();
          return Array.from({length: mesh.count}, (_, i) => { mesh.getMatrixAt(i, m); s.setFromMatrixScale(m); return s.x; });
        }
      `;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [width, height, tier] of [[390, 844, 'low'], [844, 390, 'low'], [780, 360, 'low'], [1180, 820, 'high'], [1440, 900, 'high']]) {
    const name = `${width}x${height}-${tier}`;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/opening-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/opening-probe`);
    const opening = await page.evaluate(async ({ tier }) => {
      const f = await import('/spokets-godisbus/opening-story-fixture.js');
      const sim = new f.Sim(f.prolog), view = f.createView(document.getElementById('game'), f.prolog, tier, true);
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt,
        atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
        drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries, prologue: sim.prologue?.frame });
      await view.ready;
      for (let i = 0; i < 5; i++) draw(.1);
      const scene = f.renderedScene();
      const relatives = ['mamma', 'pappa', 'moa', 'bertil'].map((who) => scene.getObjectByName(`prologue-${who}`));
      const ghost = scene.getObjectByName('chase-ghost'), bag = scene.getObjectByName('stolen-saturday-bag');
      const snapshot = () => ({ ...view.info(), eyes: [0, 1].map((i) => ghost.getObjectByName(`ghost-eye-${i}`).visible),
        bag: bag.visible, tear: bag.getObjectByName('saturday-bag-tear').visible,
        star: scene.getObjectByName('spot:star').visible, family: relatives.map((actor) => ({ visible: actor.visible, at: actor.position.toArray(), corners: f.bounds(actor) })),
        scale: scene.getObjectByName('elof').scale.y, candy: f.candyScales(scene.getObjectByName('trail-candy')) });
      window.probe = { f, sim, view, draw, scene, snapshot };
      return snapshot();
    }, { tier });
    check(`${name}: opening frames all four relatives beside normal-size Elof`, opening.family.every((actor) => actor.visible && actor.corners.every(([x, y]) => Math.abs(x) < 1 && Math.abs(y) < 1)) && Math.abs(opening.scale - 3) < .01);
    check(`${name}: new carving has no eyes, stolen bag, star or candy trail`, opening.eyes.every((eye) => !eye) && !opening.bag && !opening.star && opening.candy.every((size) => size === 0));
    const strokes = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.add('eye'); p.draw(.1); const first = p.snapshot();
      p.sim.flags.add('paint'); p.draw(.1); return { first, second: p.snapshot() };
    });
    check(`${name}: each completed brush stroke paints exactly one eye`, strokes.first.eyes[0] && !strokes.first.eyes[1] && strokes.second.eyes.every(Boolean));
    const stolen = await page.evaluate(() => {
      const p = window.probe; p.sim.flags.add('blink'); p.sim.ghost.x = 14; p.draw(.3); return p.snapshot();
    });
    check(`${name}: awakening transfers the striped family bag onto the ghost`, stolen.bag && !stolen.tear && !stolen.star);
    const torn = await page.evaluate(() => {
      const p = window.probe; p.sim.flags.add('mamma:passed'); p.sim.flags.add('bag:torn'); p.draw(.3); return p.snapshot();
    });
    check(`${name}: torn bag releases candy behind the ghost and reserves the star for the family scene`, torn.tear && !torn.star && torn.candy.some((size) => size > .9) && torn.candy.at(-1) === 0);
    const before = await page.evaluate(() => {
      const p = window.probe;
      for (const state of [p.sim.prev, p.sim.curr]) { state.x = 41; state.y = -.79; state.grounded = true; state.vx = state.vy = 0; }
      p.sim.ghost.x = 48; p.sim.ghost.y = 2.4;
      for (let i = 0; i < 10; i++) p.draw(.1);
      return p.snapshot();
    });
    check(`${name}: the spilled star and whole family share the composition before shrinking`, before.star && before.family.every((actor) => actor.visible && actor.corners.every(([x, y]) => Math.abs(x) < 1 && Math.abs(y) < 1)));
    await page.screenshot({ path: join(shots, `${name}-before.png`) });
    const change = await page.evaluate(() => {
      const p = window.probe; p.sim.flags.add('star'); p.draw(.4); const midway = p.snapshot();
      for (let i = 0; i < 12; i++) p.draw(0); const paused = p.snapshot();
      for (let i = 0; i < 10; i++) p.draw(.1); return { midway, paused, after: p.snapshot() };
    });
    check(`${name}: shrinking is visible and pauses at its intermediate size`, change.midway.scale > 1 && change.midway.scale < 3 && change.paused.scale === change.midway.scale);
    check(`${name}: Elof becomes one third as tall while the same family remains beside him`, Math.abs(change.after.scale - 1) < .01 && change.after.family.every((actor, i) => actor.visible && JSON.stringify(actor.at) === JSON.stringify(before.family[i].at)) && !change.after.star);
    check(`${name}: story staging stays inside the draw budget with warmed shaders`, change.after.drawCalls <= 120 && change.after.programs === before.programs);
    await page.screenshot({ path: join(shots, `${name}-after.png`) });
    const restored = await page.evaluate(async ({ tier }) => {
      // The saved checkpoint is beyond the completed ride; a save before it deliberately replays it.
      const p = window.probe, chapter = { ...p.f.prolog, spawn: { x: 45, y: 2.41 } };
      const oldCanvas = document.getElementById('game'), canvas = document.createElement('canvas');
      canvas.id = 'game'; canvas.style.cssText = oldCanvas.style.cssText; oldCanvas.replaceWith(canvas);
      p.sim = new p.f.Sim(chapter, {}, { flags: ['eye', 'paint', 'blink', 'mamma:passed', 'bag:torn', 'star'] });
      p.view = p.f.createView(canvas, chapter, tier, true);
      await p.view.ready;
      // draw closes over the original view/sim, so render the restored pair directly.
      p.view.render({ prev: p.sim.prev, curr: p.sim.curr, alpha: 1, dt: 0, atGoal: false,
        collected: p.sim.collected, checkpoint: p.sim.checkpoint, movers: p.sim.movers,
        drips: p.sim.drips, flags: p.sim.flags, ghost: p.sim.ghost, rollers: p.sim.rollers,
        tussocks: p.sim.tussocks, gusts: p.sim.gusts, help: p.sim.help, berries: p.sim.berries });
      return p.f.renderedScene().getObjectByName('elof').scale.y;
    }, { tier });
    check(`${name}: restored progress starts small without replaying the transformation`, Math.abs(restored - 1) < .01);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await page.close();
  }
  console.log(`Opening story: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
