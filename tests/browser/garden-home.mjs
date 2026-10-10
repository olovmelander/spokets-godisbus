// The home grounds in the actual chapter renderer, including a real paper-plane flight.
// Run after npm run assets. GARDEN_HOME_CASE filters names; GARDEN_HOME_SHOTS selects review storage.
// GARDEN_HOME_PRIVATE=1 reviews the private architecture while withholding every private character.
// Captures can contain the private home model. They stay outside git and are never published by this test.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { withinDraws } from './budget.mjs';
import { picture } from './picture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const privateHome = process.env.GARDEN_HOME_PRIVATE === '1';
const review = process.env.GARDEN_HOME_REVIEW === '1';
const shots = process.env.GARDEN_HOME_SHOTS ?? join(tmpdir(), 'spokjakt-garden-home-review');
mkdirSync(shots, { recursive: true });
const virtual = '\0garden-home-fixture';
const server = await createServer({ root, cacheDir: join(root, '.vite/garden-home'),
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'garden-home-fixture', resolveId(id) { if (id === '/garden-home-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Box3, Scene, Raycaster, Vector2, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
        export { garden } from ${JSON.stringify(join(root, 'src/content/chapters/garden.ts'))};
        let scene, camera; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) {
          if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; }
          before.apply(this, args);
        };
        const shown = object => { for (let node=object; node; node=node.parent) if (!node.visible) return false; return true; };
        const belongs = (object,target) => { for (let node=object; node; node=node.parent) if (node===target) return true; return false; };
        export function landmark(name) {
          const target = scene.getObjectByName(name); if (!target) return null;
          const world = new Box3().setFromObject(target), corners = [];
          for (const x of [world.min.x,world.max.x]) for (const y of [world.min.y,world.max.y]) for (const z of [world.min.z,world.max.z]) corners.push(new Vector3(x,y,z).project(camera));
          const left = Math.min(...corners.map(p=>p.x)), right = Math.max(...corners.map(p=>p.x));
          const bottom = Math.min(...corners.map(p=>p.y)), top = Math.max(...corners.map(p=>p.y));
          const meshes = [];
          scene.traverse(object => { if (object.isMesh && shown(object)) meshes.push(object); });
          const ray = new Raycaster(), point = new Vector2(), blockers = {}, obstruction = {}; ray.layers.mask = camera.layers.mask;
          let tested=0, visible=0, lowerVisible=0, count=0;
          // Screen-space bounds alone cannot prove that a house is visible through grass or a deck wall.
          // Ignore transparent atmosphere, then require real first-hit samples on the building itself.
          for (let row=0; row<9; row++) for (let col=0; col<11; col++) {
            point.set(left+(right-left)*(col+.5)/11,bottom+(top-bottom)*(row+.5)/9);
            if (Math.abs(point.x)>.99 || Math.abs(point.y)>.99) continue;
            tested++; ray.setFromCamera(point,camera);
            const first = ray.intersectObjects(meshes,false).find(hit => {
              const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
              return material?.visible!==false && material?.colorWrite!==false && !material?.transparent && (material?.opacity ?? 1)>.6;
            });
            if (first && belongs(first.object,target)) { visible++; if (row<4) lowerVisible++; }
            else if (first) {
              const name = first.object.name || first.object.parent?.name || first.object.type;
              blockers[name] = (blockers[name] ?? 0)+1;
              const key = first.object.id;
              if (!obstruction[key]) {
                const box = new Box3().setFromObject(first.object), chain=[];
                for (let node=first.object; node; node=node.parent) chain.push(node.name || node.type);
                obstruction[key] = { chain,geometry:first.object.geometry.type,bounds:[box.min.toArray(),box.max.toArray()] };
              }
            }
          }
          scene.traverse(object => { if (object.name===name) count++; });
          return { count,shown:shown(target),bounds:[left,bottom,right,top],tested,visible,lowerVisible,blockers,obstruction,
            world:[world.min.toArray(),world.max.toArray()],transform:target.matrixWorld.toArray() };
        }
      `;
    } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const measurements = [];
const failures = [];
const check = (name, ok) => {
  if (!ok && review) { failures.push(name); console.log(`  FAIL ${name}`); return; }
  assert.ok(ok, name); checks++; console.log(`  ok   ${name}`);
};
const cases = [
  ...[
    ['deck-start',4.5,6,'house'], ['deck-centre',22,7.6,'house'], ['deck-edge',37,6,'house'], ['lawn-entry',74,0],
    ['playhouse',95,1.1,'playhouse'], ['kota-approach',118,0], ['kota',120,0,'kota'], ['shavings',133,0], ['departure',166,0], ['flight',186,0],
  ].map(([place,x,y,landmark]) => ({ width:844,height:390,tier:'high',place,x,y,landmark })),
  ...[[390,844], [780,360], [1180,820], [1440,900]].map(([width,height]) => ({ width,height,tier:'high',place:'playhouse',x:95,y:1.1,landmark:'playhouse' })),
  { width:390,height:844,tier:'low',place:'kota',x:120,y:0,landmark:'kota' },
  { width:844,height:390,tier:'low',place:'deck-start',x:4.5,y:6,landmark:'house' },
  ...['missing','failed'].map(fallback => ({ width:844,height:390,tier:'low',place:`fallback-${fallback}`,x:95,y:1.1,landmark:'playhouse',fallback })),
];
try {
  for (const one of cases) {
    const { width,height,tier,place,x,y,landmark,fallback } = one;
    const name = `${width}x${height}-${tier}-${place}`;
    if (process.env.GARDEN_HOME_CASE && !process.env.GARDEN_HOME_CASE.split(',').some(filter => name.includes(filter))) continue;
    const page = await browser.newPage({ viewport:{ width,height },deviceScaleFactor:1 });
    const errors = [], requests = [], diagnostics = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
      if (message.type() !== 'error' && message.type() !== 'warning') return;
      diagnostics.push(message.text());
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', request => { if (request.url().includes('/packs/')) requests.push(request.url()); });
    if (fallback || privateHome) {
      await page.route('**/packs/manifest.json?*', async route => {
        const response = await route.fetch(), manifest = await response.json();
        // Review the architecture without loading any private figure, including on a private build.
        delete manifest.packs.private;
        manifest.packs.garden ??= { bytes:0,files:{} };
        if (fallback === 'missing') delete manifest.packs.garden.files['home-landmarks.glb'];
        else if (fallback === 'failed') manifest.packs.garden.files['home-landmarks.glb'] = 24;
        await route.fulfill({ response,json:manifest });
      });
      if (fallback === 'failed') await page.route('**/packs/garden/home-landmarks.glb*', route => route.fulfill({
        contentType:'model/gltf-binary',body:'Deliberately invalid GLB',
      }));
    }
    await page.route('**/garden-home-probe?*', route => route.fulfill({ contentType:'text/html',body:'<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/garden-home-probe?debug`);
    const initial = await page.evaluate(async ({ x,y,tier,place,privateHome,fallback }) => {
      const f = await import('/spokets-godisbus/garden-home-fixture.js');
      const flying = place === 'flight';
      const chapter = { ...f.garden,spawn:{ x:flying ? 167.2 : x,y:(flying ? 0 : y)+.01 } };
      const game = new f.Game(chapter, {}, { placed:['curl','bridge'],flags:['placed:curl','placed:bridge','moa','ladybird'] });
      const step = (act=false) => game.frame(1/60,{ x:0,hopHeld:false },{ act,hop:false,helper:false });
      for (let i=0;i<30;i++) step();
      if (flying) {
        // A restored Moa save still waits for her preparation beat before boarding accepts input.
        for (let i=0;i<600 && game.sim.held;i++) step();
        if (game.sim.held) throw new Error('The departure preparation did not finish');
        step(true);
        for (let i=0;i<600 && game.sim.curr.x<x;i++) step();
        if (game.sim.curr.mode !== 'ride' || Math.abs(game.sim.curr.x-x)>.3) throw new Error('Could not reach the real paper-plane flight: '+JSON.stringify(game.sim.curr));
      }
      const sim = game.sim, view = f.createView(document.getElementById('game'),chapter,tier,!privateHome && !fallback);
      const draw = (dt=0) => view.render({ prev:sim.prev,curr:sim.curr,alpha:1,dt,atGoal:false,
        collected:sim.collected,checkpoint:sim.checkpoint,movers:sim.movers,drips:sim.drips,flags:sim.flags,
        ghost:sim.ghost,rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries });
      await view.ready;
      // Let camera easing reach the actual chapter zone, including the raised flight framing.
      // Two warm frames plus one ordinary frame are sufficient; extra full-size software frames are costly.
      draw(4); draw(0); draw(0);
      const state = () => JSON.stringify({ curr:sim.curr,checkpoint:sim.checkpoint,collected:[...sim.collected],flags:[...sim.flags],placed:sim.placed,
        ground:chapter.ground,hooks:chapter.hooks,candy:chapter.candy });
      const snapshot = () => ({ ...view.info(),state:state(),player:{ x:sim.curr.x,y:sim.curr.y,mode:sim.curr.mode },
        feet:view.playerScreen(0),head:view.playerScreen(1),
        landmarks:Object.fromEntries(['house','playhouse','kota'].map(kind => [kind,f.landmark('home-'+kind)])) });
      window.probe = { game,view,draw,snapshot };
      return snapshot();
    }, { x,y,tier,place,privateHome,fallback });
    measurements.push({ name,...initial });
    writeFileSync(join(shots,'measurements.json'),JSON.stringify(measurements,null,2));
    await picture(page,join(shots,`${name}.png`));
    const installed = initial.models.filter(model => model === 'garden/home-landmarks' || model === 'boot/garden-fallback');
    check(`${name}: one home asset installation fits the drawing budget (${initial.drawCalls})`, installed.length === 1 && withinDraws(initial.drawCalls,tier));
    check(`${name}: the requested architecture is installed`, installed[0] === (privateHome && !fallback ? 'garden/home-landmarks' : 'boot/garden-fallback'));
    check(`${name}: each home landmark has one scene instance`, Object.values(initial.landmarks).every(model => model?.count === 1 && model.shown));
    check(`${name}: compressed model transforms retain architectural scale`,
      Object.entries(initial.landmarks).every(([kind,model]) => model.world[1][1]-model.world[0][1] >= (kind === 'house' ? 12 : 6)));
    check(`${name}: review images use public stand-in figures`, !requests.some(url => url.includes('/packs/private/')));
    const playerHeight = initial.feet.y-initial.head.y;
    check(`${name}: Elof remains legible above the controls`, playerHeight >= 14 && initial.head.x > width*.04 && initial.head.x < width*.96 && initial.head.y > height*.03 && initial.feet.y < height*.91);
    if (landmark) {
      const model = initial.landmarks[landmark], [left,bottom,right,top] = model.bounds;
      const pixelWidth = (Math.min(1,right)-Math.max(-1,left))*width/2;
      const pixelHeight = (Math.min(1,top)-Math.max(-1,bottom))*height/2;
      check(`${name}: ${landmark} has a readable silhouette (${Math.round(pixelWidth)}×${Math.round(pixelHeight)}px; ${model.visible}/${model.tested} clear rays)`,
        pixelWidth >= (landmark === 'house' ? 64 : 26) && pixelHeight >= 40 && model.visible >= 4 && model.visible/model.tested >= .1);
      check(`${name}: ${landmark} reveals its lower facade rather than only a roof (${model.lowerVisible} clear rays)`, model.lowerVisible >= 3);
    }
    if (place === 'flight') check(`${name}: boarding reaches the real flight without changing its route`,
      initial.player.mode === 'ride' && Math.abs(initial.player.x-186)<.3 && initial.player.y > 6);
    if (fallback) {
      check(`${name}: the public model replaces unavailable private architecture`, installed[0] === 'boot/garden-fallback');
      check(`${name}: fallback follows the manifest and tries the private model only when advertised`,
        requests.some(url => url.includes('/garden/home-landmarks.glb')) === (fallback === 'failed'));
      if (fallback === 'failed') check(`${name}: the handled private failure is reported`,
        diagnostics.some(message => message.includes('The garden buildings could not be loaded; trying the fallback.')));
    }
    if (place === 'playhouse' && (width === 844 || width === 1440)) {
      const moved = await page.evaluate(() => { const p=window.probe; p.draw(1); return p.snapshot(); });
      check(`${name}: scenery animation allocates no geometry, texture or shader`,
        moved.geometries === initial.geometries && moved.textures === initial.textures && moved.programs === initial.programs && withinDraws(moved.drawCalls,tier));
      check(`${name}: rendering leaves saved rewards, route and simulation unchanged`, moved.state === initial.state);
      const paused = await page.evaluate(() => { const p=window.probe; p.draw(0); return p.snapshot(); });
      check(`${name}: pause keeps the home grounded in the same place`, JSON.stringify(paused.landmarks) === JSON.stringify(moved.landmarks));
      await page.emulateMedia({ reducedMotion:'reduce' });
      const calm = await page.evaluate(() => { const p=window.probe; p.draw(.5); return p.snapshot(); });
      check(`${name}: reduced motion retains readable, stable architecture`, calm.landmarks.playhouse.visible >= 4 && calm.state === initial.state &&
        ['house','playhouse','kota'].every(kind => JSON.stringify(calm.landmarks[kind].transform) === JSON.stringify(initial.landmarks[kind].transform)));
      if (width === 844) {
        await page.evaluate(() => new Promise(resolve => {
          const canvas = document.getElementById('game');
          window.__homeLoss = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
          if (!window.__homeLoss) throw Error('Context-loss extension missing');
          canvas.addEventListener('webglcontextlost', () => resolve(), { once:true });
          window.__homeLoss.loseContext();
        }));
        const restored = await page.evaluate(() => new Promise((resolve,reject) => {
          const canvas = document.getElementById('game');
          canvas.addEventListener('webglcontextrestored', async () => {
            try {
              await window.probe.view.restore();
              // restore() warms GL resources, then the next render() starts its normal model warmup.
              // Measure a settled frame, not the deliberately unculled whole-chapter warm draw.
              for (let frame=0;frame<8;frame++) {
                window.probe.draw();
                if (!window.probe.view.warming) break;
              }
              if (window.probe.view.warming) throw Error('Restored renderer did not finish warming within eight frames');
              resolve(window.probe.snapshot());
            } catch (error) { reject(error); }
          }, { once:true });
          window.__homeLoss.restoreContext();
        }));
        check(`${name}: context restoration keeps all three landmarks and progress`, restored.state === initial.state &&
          JSON.stringify(restored.models) === JSON.stringify(initial.models) && Object.values(restored.landmarks).every(model => model.count === 1) && restored.landmarks.playhouse.visible >= 4);
        measurements[measurements.length-1].restored = { geometries:restored.geometries,textures:restored.textures,programs:restored.programs,drawCalls:restored.drawCalls,gpu:restored.gpu };
        measurements[measurements.length-1].beforeRestore = { geometries:calm.geometries,textures:calm.textures,programs:calm.programs,drawCalls:calm.drawCalls,gpu:calm.gpu };
        writeFileSync(join(shots,'measurements.json'),JSON.stringify(measurements,null,2));
        check(`${name}: restored drawing and memory counts return to the reduced-motion baseline (geometry ${calm.geometries}→${restored.geometries}; textures ${calm.textures}→${restored.textures}; draws ${calm.drawCalls}→${restored.drawCalls})`,
          restored.geometries === calm.geometries && restored.textures === calm.textures && withinDraws(restored.drawCalls,tier));
      }
    }
    // The intentionally corrupt private file produces a handled warning; errors remain regressions.
    assert.deepEqual(errors,[],`${name}: browser errors (${diagnostics.join('\n')})`);
    await page.close();
  }
  assert.deepEqual(failures,[], 'Review captures completed; these visual gates still need attention');
  console.log(`garden home: ${checks} checks passed; review captures in ${shots}`);
} finally { await browser.close(); await server.close(); }
