// Reference-led Bredbyn scenery in the actual renderer, with public stand-ins only.
// Run after npm run assets: node tests/browser/bredbyn.mjs.
// BREDBYN_CASE filters case names for iteration; captures are ignored review evidence.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/bredbyn');
mkdirSync(shots, { recursive: true });
const virtual = '\0bredbyn-fixture';
const server = await createServer({ root, cacheDir: join(root, '.vite/bredbyn'),
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'bredbyn-fixture', resolveId(id) { if (id === '/bredbyn-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Box3, Scene, Raycaster, Vector2, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
        export { byn } from ${JSON.stringify(join(root, 'src/content/chapters/byn.ts'))};
        export { lookStreet } from ${JSON.stringify(join(root, 'src/content/chapters/look.ts'))};
        let scene, camera; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
        export const renderedScene = () => scene;
        const shown = (object) => { for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
        const belongs = (object, target) => { for (let node = object; node; node = node.parent) if (node === target) return true; return false; };
        export function landmark(name) {
          const target = scene.getObjectByName(name); if (!target) return null;
          const world = new Box3().setFromObject(target), corners = [];
          let peak = -Infinity; const vertex = new Vector3();
          target.traverse(object => { const positions = object.geometry?.getAttribute('position'); if (!positions) return;
            for (let i=0;i<positions.count;i++) {
              vertex.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
              if (vertex.y >= world.max.y-.03) peak = Math.max(peak,vertex.project(camera).y);
            }
          });
          for (const x of [world.min.x, world.max.x]) for (const y of [world.min.y, world.max.y]) for (const z of [world.min.z, world.max.z]) corners.push(new Vector3(x,y,z).project(camera));
          const left = Math.min(...corners.map(p => p.x)), right = Math.max(...corners.map(p => p.x));
          const bottom = Math.min(...corners.map(p => p.y)), top = Math.max(...corners.map(p => p.y));
          const meshes = [];
          scene.traverse(object => { if (object.isMesh && shown(object)) meshes.push(object); });
          const ray = new Raycaster(), point = new Vector2(); ray.layers.mask = camera.layers.mask; let tested = 0, visible = 0;
          // Opaque ray hits detect real wall/fence occlusion; transparent haze and light cards do not mask a landmark.
          for (let row = 0; row < 9; row++) for (let col = 0; col < 11; col++) {
            point.set(left + (right-left)*(col+.5)/11, bottom + (top-bottom)*(row+.5)/9);
            if (Math.abs(point.x) > .99 || Math.abs(point.y) > .99) continue;
            tested++; ray.setFromCamera(point, camera);
            const first = ray.intersectObjects(meshes, false).find(hit => {
              const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
              return material?.visible !== false && !material?.transparent && (material?.opacity ?? 1) > .6;
            });
            if (first && belongs(first.object, target)) visible++;
          }
          let count = 0; scene.traverse(object => { if (object.name === name) count++; });
          return { count, shown: shown(target), bounds: [left, bottom, right, top], peak, tested, visible,
            world: [world.min.toArray(), world.max.toArray()], transform: target.matrixWorld.toArray() };
        }
      `;
    } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const measurements = [];
const check = (name, ok) => { assert.ok(ok, name); checks++; console.log(`  ok   ${name}`); };
const cases = [
  ...[[390,844], [844,390], [780,360], [1180,820], [1440,900]].map(([width,height]) => ({ width,height,tier:'high',place:'puddle',x:48 })),
  ...[[390,844], [844,390]].map(([width,height]) => ({ width,height,tier:'low',place:'puddle',x:48 })),
  ...[['street',25], ['bakery',82]].map(([place,x]) => ({ width:844,height:390,tier:'high',place,x })),
  ...[['shore-entry',41.9], ['shore-exit',62.8], ['look-street',12]].map(([place,x]) => ({ width:844,height:390,tier:'low',place,x })),
];
try {
  for (const { width, height, tier, place, x } of cases) {
    const name = `${width}x${height}-${tier}-${place}`;
    if (process.env.BREDBYN_CASE && !process.env.BREDBYN_CASE.split(',').some(filter => name.includes(filter))) continue;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/bredbyn-probe', route => route.fulfill({ contentType:'text/html',body:'<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/bredbyn-probe`);
    const initial = await page.evaluate(async ({ x, tier, place }) => {
      const f = await import('/spokets-godisbus/bredbyn-fixture.js');
      const rideView = place === 'puddle' || place.startsWith('shore-');
      const chapter = { ...(place === 'look-street' ? f.lookStreet : f.byn), spawn: { x:rideView ? 40.6 : x, y: .01 } };
      const game = new f.Game(chapter, {}, { placed:['box'],flags:['placed:box'] });
      if (rideView) {
        const step = (act = false) => game.frame(1/60,{ x:0,hopHeld:false },{ act,hop:false,helper:false });
        for (let i=0;i<30;i++) step();
        step(true);
        for (let i=0;i<600 && game.sim.curr.x<x;i++) step();
        if (game.sim.curr.mode !== 'ride' || Math.abs(game.sim.curr.x-x) > .15) throw new Error('Could not reach the real leaf ride: '+JSON.stringify(game.sim.curr));
      }
      const sim = game.sim, view = f.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0) => view.render({ prev:sim.prev,curr:sim.curr,alpha:1,dt,atGoal:false,
        collected:sim.collected,checkpoint:sim.checkpoint,movers:sim.movers,drips:sim.drips,flags:sim.flags,
        ghost:sim.ghost,rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries });
      await view.ready; for (let i = 0; i < 4; i++) draw();
      // Settle the real ride camera, which looks lower than a free-standing preview spawn.
      if (rideView) draw(4);
      const scene = f.renderedScene();
      const state = () => JSON.stringify({ curr:sim.curr,checkpoint:sim.checkpoint,collected:[...sim.collected],flags:[...sim.flags],placed:sim.placed,ground:chapter.ground });
      const snapshot = () => ({ ...view.info(),state:state(),player:{ x:sim.curr.x,y:sim.curr.y,mode:sim.curr.mode },
        church:f.landmark('anundsjo-church'),belfry:f.landmark('anundsjo-bell-tower') });
      window.probe = { f,game,view,draw,scene,snapshot };
      return { ...snapshot(),feet:view.playerScreen(0),head:view.playerScreen(1),streets:{ west:f.landmark('street-west'),east:f.landmark('street-east') } };
    }, { x, tier, place });
    measurements.push({ name,...initial });
    writeFileSync(join(shots,'measurements.json'),JSON.stringify(measurements,null,2));
    await picture(page,join(shots,`${name}.png`));
    check(`${name}: actual village assets fit the rendering budget`, initial.models.includes('boot/village') && withinDraws(initial.drawCalls,tier));
    check(`${name}: one church and one separate belfry stand in the scene`, initial.church?.count === 1 && initial.belfry?.count === 1);
    if (place.startsWith('shore-')) check(`${name}: real leaf and rider remain framed at the camera-zone boundary`,
      initial.player.mode === 'ride' && initial.feet?.y < height*.9 && initial.head?.y > height*.08 && initial.head?.x > width*.08 && initial.head?.x < width*.92);
    if (place === 'puddle') {
      check(`${name}: Elof is actually sailing across the puddle`, initial.player.mode === 'ride' && Math.abs(initial.player.x-x) < .15);
      if (width === 844 && tier === 'high') check(`${name}: a village facade is visible beside the landmarks`,
        Object.values(initial.streets).some(bank => bank && bank.visible >= 3));
      for (const kind of ['church','belfry']) {
        const one = initial[kind], [left,bottom,right,top] = one.bounds;
        const pixelWidth = (Math.min(1,right)-Math.max(-1,left))*width/2;
        const pixelHeight = (Math.min(1,top)-Math.max(-1,bottom))*height/2;
        check(`${name}: ${kind} silhouette is in frame and clears opaque street scenery (${one.visible}/${one.tested} rays)`,
          one.shown && pixelWidth >= 8 && pixelHeight >= 12 && one.visible >= 3 && one.visible / one.tested >= .08);
        check(`${name}: ${kind} roof ornament has space below the top edge`, one.peak < .98);
      }
    }
    // Two complementary phone cases cover the live renderer clock and both quality pipelines.
    if (place === 'puddle' && (width === 844 && tier === 'high' || width === 390 && tier === 'low')) {
      const moved = await page.evaluate(() => { const p=window.probe; p.draw(.5); p.draw(.5); return p.snapshot(); });
      check(`${name}: scenery motion creates no geometry, texture or shader churn`,
        moved.geometries === initial.geometries && moved.textures === initial.textures && moved.programs === initial.programs && withinDraws(moved.drawCalls,tier));
      check(`${name}: renderer cannot change ground, checkpoint or saved progression`, moved.state === initial.state);
      const paused = await page.evaluate(() => { const p=window.probe; p.draw(0); return p.snapshot(); });
      check(`${name}: pause preserves both landmark transforms and projection`, ['church','belfry'].every(kind =>
        JSON.stringify(paused[kind]) === JSON.stringify(moved[kind])) && paused.state === moved.state);
      await page.emulateMedia({ reducedMotion:'reduce' });
      const calm = await page.evaluate(() => { const p=window.probe; p.draw(.5); return p.snapshot(); });
      check(`${name}: reduced motion keeps the landmarks fixed and readable without extra allocations`, ['church','belfry'].every(kind =>
        JSON.stringify(calm[kind].transform) === JSON.stringify(initial[kind].transform) && calm[kind].visible >= 3) &&
        calm.geometries === initial.geometries && calm.textures === initial.textures && calm.programs === initial.programs && calm.state === initial.state);
    }
    assert.deepEqual(errors,[],`${name}: browser errors`);
    console.log(`  draws ${name}: ${initial.drawCalls}`);
    await page.close();
  }
  console.log(`bredbyn: ${checks} checks passed; captures in docs/shots/_work/bredbyn/`);
} finally { await browser.close(); await server.close(); }
