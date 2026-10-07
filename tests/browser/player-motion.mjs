// Public Elof's actual view: articulated motion, pause/restore and story-pose precedence.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { withinDraws } from './budget.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const virtual = '\0player-motion-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'player-motion-fixture', resolveId(id) { if (id === '/player-motion-fixture.js') return virtual; },
    load(id) { if (id !== virtual) return; return `import { Scene, Box3, Vector3, Line3 } from 'three';
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
      export { garden } from ${JSON.stringify(join(root, 'src/content/chapters/garden.ts'))};
      let scene, camera; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
      export function player() {
        const actor = scene.getObjectByName('elof'), parts = {};
        actor.traverse(node => { if (node.name.startsWith('player-')) parts[node.name] = { rotation: node.rotation.toArray().slice(0,3), matrix: node.matrix.toArray() }; });
        const bounds = new Box3().setFromObject(actor), corners = [];
        for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) corners.push(new Vector3(x,y,z).project(camera).toArray());
        const lace=scene.getObjectByName('player-lace'), ends=[-.5,.5].map(y=>lace.localToWorld(new Vector3(0,y,0)));
        const hands=['left','right'].map(side=>actor.getObjectByName('player-elbow-'+side).localToWorld(new Vector3(0,-.145,0)));
        const line=new Line3(...ends), grip=hands.map(hand=>line.closestPointToPoint(hand,true,new Vector3()).distanceTo(hand));
        const head=actor.getObjectByName('player-head').getWorldPosition(new Vector3());
        const clearance=line.closestPointToPoint(head,true,new Vector3()).distanceTo(head)-.19*actor.scale.y;
        return { parts, at:actor.position.toArray(), scale:actor.scale.toArray(), turn:actor.rotation.y, bounds:[bounds.min.toArray(),bounds.max.toArray()], corners,
          pointing:{elbow:actor.getObjectByName('player-elbow-right').getWorldPosition(new Vector3()).toArray(),hand:hands[1].toArray()},
          lace:{ends:ends.map(p=>p.toArray()),grip,clearance,length:lace.scale.y} };
      }
    `; } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const moved = (a, b, prefix) => Object.keys(a.parts).some(name => name.startsWith(prefix) && JSON.stringify(a.parts[name].matrix) !== JSON.stringify(b.parts[name]?.matrix));
try {
  for (const [width, height, tier] of [[844, 390, 'low'], [390, 844, 'high']]) {
    const name = `${width}x${height} ${tier}`;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/player-motion-probe', route => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/player-motion-probe`);
    const idle = await page.evaluate(async tier => {
      const f = await import('/spokets-godisbus/player-motion-fixture.js');
      const chapter = { ...f.garden, spawn: { x:114, y:0 }, scenes:[
        { id:'motion-pose', seconds:4, hold:true, stage:{ elof:[{ at:0, act:'cheer', face:.25 }] } },
        { id:'motion-point', seconds:4, hold:true, stage:{ elof:[{ at:0, act:'point', aim:{x:123,y:2.7,z:-5} }] } },
      ] };
      const sim = new f.Sim(chapter), view = f.createView(document.getElementById('game'), chapter, tier, true);
      let scene = null;
      const draw = (dt = 1/60) => view.render({ prev:sim.prev, curr:sim.curr, alpha:1, dt, atGoal:false,
        collected:sim.collected, checkpoint:sim.checkpoint, movers:sim.movers, drips:sim.drips,
        flags:sim.flags, ghost:sim.ghost, rollers:sim.rollers, tussocks:sim.tussocks, gusts:sim.gusts,
        help:sim.help, berries:sim.berries, scene });
      const snapshot = () => ({ ...f.player(), info:view.info(), state:{...sim.curr} });
      const step = (values, frames = 1, dt = 1/60) => {
        for(let i=0;i<frames;i++) { Object.assign(sim.prev,sim.curr); Object.assign(sim.curr,values); sim.curr.x += sim.curr.vx*dt; draw(dt); }
        return snapshot();
      };
      await view.ready;
      Object.assign(sim.curr,{y:0,vx:0,vy:0,grounded:true,groundY:0,standY:0}); Object.assign(sim.prev,sim.curr);
      for(let i=0;i<12;i++)draw(1/60);
      window.motionProbe = { step, snapshot, draw, view, sim, story: value => { scene=value; } };
      return snapshot();
    }, tier);
    check(`${name}: public player has separate knees and elbows`, ['player-knee-left','player-knee-right','player-elbow-left','player-elbow-right'].every(part => idle.parts[part]));
    const run = await page.evaluate(() => {
      const p=window.motionProbe, frames=[];
      for(let i=0;i<4;i++)frames.push(p.step({vx:3.5,facing:1},8));
      return frames;
    });
    check(`${name}: run bends hips, knees and opposite arms`, moved(run[0],run[2],'player-hip-') && moved(run[0],run[2],'player-knee-') && moved(run[0],run[2],'player-shoulder-'));
    check(`${name}: moving figure stays finite and above its ground`, run.every(s => s.bounds.flat().every(Number.isFinite) && s.bounds[0][1]>=-.04));
    const frozen = await page.evaluate(() => {
      const p=window.motionProbe, before=p.snapshot(), state=JSON.stringify(p.sim.curr);
      for(let i=0;i<8;i++)p.draw(0);
      return {before,after:p.snapshot(),stateUnchanged:state===JSON.stringify(p.sim.curr)};
    });
    assert.deepEqual(frozen.after.parts,frozen.before.parts,`${name}: paused limb transforms`);
    assert.deepEqual(frozen.after.at,frozen.before.at,`${name}: paused root transform`);
    check(`${name}: paused render preserves pose and simulation`, frozen.stateUnchanged);
    const air = await page.evaluate(() => {
      const p=window.motionProbe;
      return { rise:p.step({y:.6,vy:3,grounded:false},8), fall:p.step({y:.6,vy:-3,grounded:false},12), land:p.step({y:0,vy:0,grounded:true},1) };
    });
    check(`${name}: rise and fall use visibly different limb poses`, moved(air.rise,air.fall,'player-hip-') || moved(air.rise,air.fall,'player-knee-'));
    check(`${name}: airborne figure clears ground and landing keeps feet above it`, air.rise.bounds[0][1]>.45 && air.fall.bounds[0][1]>.45 && air.land.bounds[0][1]>=-.04);
    check(`${name}: actual play camera keeps jump visible`, [air.rise,air.fall].every(s => s.corners.every(([x,y,z]) => Math.abs(x)<1 && Math.abs(y)<1 && Math.abs(z)<1)));
    const settled = await page.evaluate(() => window.motionProbe.step({vx:0,vy:0,y:0,grounded:true},48));
    check(`${name}: landing recovers standing height`, settled.bounds[1][1]-settled.bounds[0][1]>.9 && Math.abs(settled.scale[1]-1)<.01);
    const reversal = await page.evaluate(() => {
      const p=window.motionProbe, before=p.step({facing:1,vx:0},60), after=p.step({facing:-1,vx:-1.2},1);
      return {before,after};
    });
    check(`${name}: direction change turns the short way towards the camera`, reversal.after.turn < reversal.before.turn && reversal.after.turn > reversal.before.turn-.7);
    const climbExit = await page.evaluate(() => {
      const p=window.motionProbe;
      const climb=p.step({mode:'climb',grounded:false,vx:0,vy:1,y:.5},12);
      const stand=p.step({mode:'free',grounded:true,vy:0,y:0},1);
      return {climb,stand};
    });
    check(`${name}: climbing and stepping off a hose preserve body proportions`, climbExit.climb.scale.every(v=>Math.abs(v-1)<1e-8) && climbExit.stand.scale.every(v=>Math.abs(v-1)<1e-8));
    const swing = await page.evaluate(() => {
      const p=window.motionProbe, poses=[], hook={x:114,y:4};
      for(const angle of [-1.1,-.5,0,.5,1.1]) {
        const held=p.step({mode:'swing',grounded:false,vx:0,vy:0,facing:1,hook,
          x:hook.x+2.6*Math.sin(angle),y:hook.y-2.6*Math.cos(angle)-.5},45);
        for(let frame=0;frame<8;frame++)p.draw(0);
        poses.push({held,paused:p.snapshot()});
      }
      const released=p.step({mode:'free',hook:null,grounded:false,vy:-3},1);
      return {poses,released};
    });
    check(`${name}: both hands hold the lace through the full swing arc`, swing.poses.every(({held})=>held.lace.grip.every(gap=>gap<1e-5)));
    check(`${name}: the lace reaches its actual hook in three dimensions`, swing.poses.every(({held})=>held.lace.ends[1].every((v,i)=>Math.abs(v-[114,4,0][i])<1e-6)));
    check(`${name}: the rope clears Elof's head through the full swing arc`, swing.poses.every(({held})=>held.lace.clearance>.022));
    for(const {held,paused} of swing.poses) {
      assert.deepEqual(paused.parts,held.parts,`${name}: paused swinging limbs`);
      assert.deepEqual(paused.lace,held.lace,`${name}: paused rope grip`);
    }
    check(`${name}: letting go removes the lace while preserving body proportions`, swing.released.lace.length===0 && swing.released.scale[1]!==0);
    await page.evaluate(() => window.motionProbe.step({mode:'free',hook:null,grounded:true,vy:0,y:0},30));
    const story = await page.evaluate(() => {
      const p=window.motionProbe;p.story({id:'motion-pose',seconds:.8});
      const first=p.step({vx:3.5},1),later=p.step({vx:3.5},12);p.story(null);
      return {first,later};
    });
    assert.deepEqual(story.later.parts,story.first.parts,`${name}: authored cheer ignores locomotion phase`);
    check(`${name}: story pose overrides a moving player's arms`, moved(settled,story.first,'player-shoulder-'));
    check(`${name}: story posing preserves body proportions`, story.first.scale.every(v=>Math.abs(v-1)<1e-8));
    const point = await page.evaluate(() => {
      const p=window.motionProbe;p.story({id:'motion-point',seconds:.65});
      const aimed=p.step({x:114,y:0,vx:0,facing:1},45);
      for(let i=0;i<8;i++)p.draw(0);
      const paused=p.snapshot();p.story(null);
      return {aimed,paused};
    });
    const {elbow,hand}=point.aimed.pointing, aim=[123,2.7,-5].map((v,i)=>v-elbow[i]), arm=hand.map((v,i)=>v-elbow[i]);
    const alignment=arm.reduce((n,v,i)=>n+v*aim[i],0)/(Math.hypot(...arm)*Math.hypot(...aim));
    check(`${name}: scripted pointing follows the target's actual depth`, alignment>1-1e-8);
    assert.deepEqual(point.paused.parts,point.aimed.parts,`${name}: paused three-dimensional point`);
    const restored = await page.evaluate(async () => {
      const p=window.motionProbe;p.step({vx:0},36);
      const before=p.snapshot();await p.view.restore();
      // Restoration also re-enters per-model warmup on the next render: sample a play frame afterwards.
      for(let i=0;i<4;i++)p.draw(0);
      return {before,after:p.snapshot()};
    });
    assert.deepEqual(restored.after.parts,restored.before.parts,`${name}: resource restore preserves joints`);
    check(`${name}: motion reuses warmed shaders and geometry`, restored.after.info.programs===idle.info.programs && restored.after.info.geometries===idle.info.geometries && restored.after.info.textures===idle.info.textures);
    check(`${name}: all motion phases stay within draw budget`, [...run,air.rise,air.fall,air.land,settled,story.first,restored.after].every(s=>withinDraws(s.info.drawCalls,s.info.tier)));
    assert.deepEqual(errors,[],`${name}: browser errors`);
    await page.close();
  }
  console.log(`Player motion: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
