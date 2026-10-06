// Family helpers remain visible, correctly scaled and framed through the whole adventure.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/family-help'); mkdirSync(shots, { recursive: true });
const virtual = '\0family-help-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'family-help-fixture', resolveId(id) { if (id === '/family-help-fixture.js') return virtual; },
    load(id) { if (id !== virtual) return; return `import { Scene, Box3, Vector3 } from 'three';
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
      export { COURSES } from ${JSON.stringify(join(root, 'src/content/chapters/index.ts'))};
      let scene, camera; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
      export const renderedScene = () => scene;
      export function corners(object) { const b = new Box3().setFromObject(object), points = [];
        for (const x of [b.min.x,b.max.x]) for (const y of [b.min.y,b.max.y]) for (const z of [b.min.z,b.max.z]) points.push(new Vector3(x,y,z).project(camera).toArray());
        return points; }
    `; } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [course, x, y, who, flags] of [
    ['garden', 165, 0, 'moa', ['moa']],
    ['granskog', 108.2, -8, 'pappa', ['seesaw']],
    ['granskog', 154.6, -8, 'bertil', []],
    ['myren', 84.8, 0, 'mamma', ['mamma']],
    ['norrsken', 26.6, 0, 'bertil', ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste']],
    ['epilog', 7, 0, 'mamma', []],
  ]) for (const [width, height, tier] of [[844, 390, 'low'], [390, 844, 'high']]) {
    const name = `${course}-${who}-${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/family-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/family-probe`);
    const shown = await page.evaluate(async ({ course, x, y, who, flags, tier }) => {
      const f = await import('/spokets-godisbus/family-help-fixture.js');
      const chapter = { ...f.COURSES[course], spawn: { x, y: y + .01 } }, sim = new f.Sim(chapter);
      // Focus on an established help scene, independent of restart inference for unfinished rides.
      flags.forEach((flag) => sim.flags.add(flag));
      const view = f.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false,
        collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips,
        flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries });
      await view.ready; for (let i = 0; i < 12; i++) draw(.1);
      const scene = f.renderedScene(), actors = [];
      scene.traverse((node) => { if (node.userData.familyRole) actors.push(node); });
      const actor = actors.filter((a) => a.userData.familyRole === who).sort((a,b) => Math.abs(a.parent.position.x-x)-Math.abs(b.parent.position.x-x))[0];
      const visible = (a) => { for (let n=a; n; n=n.parent) if (!n.visible) return false; return true; };
      const snapshot = () => ({ ...view.info(), at: actor.position.toArray(), rotation: actor.rotation.toArray(),
        visible: visible(actor), corners: f.corners(actor), family: actors.map((a) => ({ who: a.userData.familyRole, visible: visible(a), corners: f.corners(a) })),
        meshes: actor.children.length, instances: actor.children[0].count, pose: Array.from(actor.children[0].instanceMatrix.array),
        foot: actor.children[0].boundingBox.min.y, player: { ...sim.curr } });
      window.probe = { draw, snapshot, sim }; return snapshot();
    }, { course, x, y, who, flags, tier });
    check(`${name}: the named relative has articulated arms and legs in one instanced draw`, shown.visible && shown.meshes === 1 && shown.instances === 17);
    check(`${name}: the helper's head and feet fit the shared composition`, shown.corners.every(([x,y]) => Math.abs(x) < 1 && Math.abs(y) < 1));
    if (course === 'norrsken') check(`${name}: all four relatives fit the reunion shot`, shown.family.length === 4 && shown.family.every((a) => a.visible && a.corners.every(([x,y]) => Math.abs(x)<1 && Math.abs(y)<1)));
    const paused = await page.evaluate(() => { const p=window.probe; for(let i=0;i<20;i++)p.draw(0); return p.snapshot(); });
    check(`${name}: pausing retains the actual joint pose and GPU resources`, JSON.stringify(paused.at) === JSON.stringify(shown.at) && JSON.stringify(paused.rotation) === JSON.stringify(shown.rotation) && JSON.stringify(paused.pose) === JSON.stringify(shown.pose) && paused.textures === shown.textures && paused.geometries === shown.geometries);
    const calm = await page.evaluate(() => { const p=window.probe; for(let i=0;i<20;i++)p.draw(.1); return p.snapshot(); });
    check(`${name}: reduced motion keeps the actor grounded and shaders/draws bounded`, calm.at[1] === 0 && Math.abs(calm.foot) < 1e-5 && calm.programs === shown.programs && withinDraws(calm.drawCalls, calm.tier));
    await picture(page, join(shots, `${name}.png`));
    if (course === 'garden' && tier === 'low') {
      const still = await page.evaluate(() => { const p=window.probe; for(let i=0;i<10;i++)p.draw(.1); return p.snapshot(); });
      check(`${name}: reduced motion removes idle joint loops`, JSON.stringify(still.pose) === JSON.stringify(calm.pose));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const movement = await page.evaluate(() => { const p=window.probe; p.sim.flags.delete('moa'); p.draw(.1);
        const a=p.snapshot();for(let i=0;i<8;i++)p.draw(.1);const b=p.snapshot();
        p.sim.flags.add('moa');for(let i=0;i<5;i++)p.draw(.1);return{a,b,hello:p.snapshot()}; });
      check(`${name}: normal idle and greeting articulate without moving the actor or simulation`,
        JSON.stringify(movement.a.pose)!==JSON.stringify(movement.b.pose) &&
        JSON.stringify(movement.b.pose)!==JSON.stringify(movement.hello.pose) &&
        JSON.stringify(movement.a.at)===JSON.stringify(movement.hello.at) &&
        JSON.stringify(movement.a.player)===JSON.stringify(movement.hello.player) && Math.abs(movement.hello.foot)<1e-5);
      check(`${name}: greeting reuses warmed shaders`, movement.hello.programs===shown.programs);
      await picture(page, join(shots, `${name}-greeting.png`));
    }
    if (course === 'norrsken') {
      const before = await page.evaluate(() => { const p=window.probe; p.sim.flags.delete('taste'); p.draw(0); return p.snapshot(); });
      check(`${name}: reunion relatives remain hidden before Elof grows back`, before.family.every((a) => !a.visible));
    }
    assert.deepEqual(errors, [], `${name}: browser errors`); await page.close();
  }
  console.log(`Family help: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
