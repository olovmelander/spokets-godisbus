// Real WebGL: painted eyes, an identifiable stolen bag and a shared family scale-change shot.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/opening-story');
mkdirSync(shots, { recursive: true });
const virtual = '\0opening-story-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, watch: null, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
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
        // The trail is a group of instanced meshes, one for each kind of sweet. Each says which candies it draws.
        export function candyScales(trail) {
          const m = new Matrix4(), s = new Vector3(), scales = [];
          for (const mesh of trail.children) mesh.userData.candies.forEach((index, slot) => {
            mesh.getMatrixAt(slot, m); scales[index] = s.setFromMatrixScale(m).x;
          });
          return scales;
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
    if (process.env.OPENING_CASE && process.env.OPENING_CASE !== name) continue;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/opening-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/opening-probe`);
    const opening = await page.evaluate(async ({ tier }) => {
      const f = await import('/spokets-godisbus/opening-story-fixture.js');
      const sim = new f.Sim(f.prolog), view = f.createView(document.getElementById('game'), f.prolog, tier, true);
      // A moment of one of the prologue's scenes, as the simulation would give it, or none.
      let frame = null;
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt,
        atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
        drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries, prologue: sim.prologue?.frame, scene: frame });
      await view.ready;
      // The morning at the table, near its end: the whole family in the wide picture.
      frame = { id: 'morgon', seconds: 9.6 };
      for (let i = 0; i < 40; i++) draw(.1);
      const scene = f.renderedScene();
      const relatives = ['mamma', 'pappa', 'moa', 'bertil'].map((who) => scene.getObjectByName(`stage-${who}`));
      const ghost = scene.getObjectByName('chase-ghost'), bag = scene.getObjectByName('stolen-saturday-bag');
      const snapshot = () => ({ ...view.info(), eyes: [0, 1].map((i) => ghost.getObjectByName(`ghost-eye-${i}`).visible),
        bag: bag.visible, tear: bag.getObjectByName('saturday-bag-tear').visible,
        star: scene.getObjectByName('spot:star').visible, family: relatives.map((actor) => ({ visible: actor.visible, at: actor.position.toArray(), corners: f.bounds(actor) })),
        scale: scene.getObjectByName('elof').scale.y, sweet: { visible: scene.getObjectByName('elof-star').visible,
          scale: scene.getObjectByName('elof-star').scale.x, at: scene.getObjectByName('elof-star').position.toArray() }, candy: f.candyScales(scene.getObjectByName('trail-candy')) });
      window.probe = { f, sim, view, draw, scene, snapshot, at: (next) => { frame = next; } };
      const opening = snapshot();
      frame = null;
      return opening;
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
      for (const flag of ['scene:morgon', 'woke', 'grab', 'scene:vaknar', 'mamma:noticed']) p.sim.flags.add(flag);
      for (const state of [p.sim.prev, p.sim.curr]) { state.x = 40.5; state.y = -.79; state.grounded = true; state.vx = state.vy = 0; }
      p.sim.ghost.x = 44.4; p.sim.ghost.y = -.8;
      for (let i = 0; i < 10; i++) p.draw(.1);
      return p.snapshot();
    });
    check(`${name}: the spilled star lies ahead of him, and the family has followed him out`, before.star
      && before.family.every((actor) => actor.visible && actor.at[0] < 40.5 && actor.at[0] > 30));
    await picture(page, join(shots, `${name}-before.png`));
    const taste = await page.evaluate(() => {
      const p = window.probe; p.sim.flags.add('star');
      p.at({ id: 'poff', seconds: 1 }); p.draw(.1); const show = p.snapshot();
      p.at({ id: 'poff', seconds: 2.9 }); p.draw(.1); const mouth = p.snapshot();
      p.at({ id: 'poff', seconds: 3.65 }); p.draw(.1); return { show, mouth, swallowed: p.snapshot() };
    });
    check(`${name}: the chosen star is shown, raised and swallowed while Elof stays his original size`,
      taste.show.sweet.visible && taste.mouth.sweet.visible && !taste.swallowed.sweet.visible &&
      taste.mouth.sweet.at[1] > taste.show.sweet.at[1] &&
      [taste.show, taste.mouth, taste.swallowed].every(moment => Math.abs(moment.scale - 3) < .01 && !moment.star));
    await page.evaluate(() => { window.probe.at({ id: 'poff', seconds: 2.9 }); window.probe.draw(0); });
    await picture(page, join(shots, `${name}-taste.png`));
    const change = await page.evaluate(() => {
      const p = window.probe;
      p.at({ id: 'poff', seconds: 5.25 }); p.draw(.1); const midway = p.snapshot();
      for (let i = 0; i < 12; i++) p.draw(0); const paused = p.snapshot();
      p.at({ id: 'poff', seconds: 6.5 }); p.draw(.1); return { midway, paused, after: p.snapshot() };
    });
    check(`${name}: shrinking follows the story clock and pauses at its intermediate size`,
      Math.abs(change.midway.scale - 2) < .01 && change.paused.scale === change.midway.scale);
    check(`${name}: Elof becomes one third as tall while the same family remains beside him`, Math.abs(change.after.scale - 1) < .01 && change.after.family.every((actor, i) => actor.visible && JSON.stringify(actor.at) === JSON.stringify(before.family[i].at)) && !change.after.star);
    check(`${name}: story staging stays inside the draw budget with warmed shaders`, withinDraws(change.after.drawCalls, change.after.tier) && change.after.programs === before.programs);
    const kneeling = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.add('scene:poff');
      p.at({ id: 'familj', seconds: 5.6 });
      for (let i = 0; i < 30; i++) p.draw(.1);
      return p.snapshot();
    });
    check(`${name}: the whole family kneels round him in one picture`, kneeling.family.every((actor) => actor.visible
      && Math.abs(actor.at[0] - 41) < 3.5 && actor.corners.every(([x, y]) => Math.abs(x) < 1.02 && y > -1.02)));
    check(`${name}: the family's scene fits the draw budget with warmed shaders`, withinDraws(kneeling.drawCalls, kneeling.tier) && kneeling.programs === before.programs);
    await picture(page, join(shots, `${name}-after.png`));
    const restored = await page.evaluate(async ({ tier }) => {
      // The transformation is complete; even if the unfinished family scene resumes, Elof already starts small.
      const p = window.probe, chapter = { ...p.f.prolog, spawn: { x: 45, y: -0.79 } };
      const oldCanvas = document.getElementById('game'), canvas = document.createElement('canvas');
      canvas.id = 'game'; canvas.style.cssText = oldCanvas.style.cssText; oldCanvas.replaceWith(canvas);
      p.sim = new p.f.Sim(chapter, {}, { flags: ['eye', 'paint', 'blink', 'mamma:passed', 'bag:torn', 'star', 'scene:poff'] });
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
