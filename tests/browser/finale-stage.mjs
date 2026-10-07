// Actual finale actions must produce the same visible story after saving, pausing and riding home.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/finale-stage'); mkdirSync(shots, { recursive: true });
const virtual = '\0finale-stage-fixture';
const proofAssets = '\0finale-private-assets';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'finale-stage-fixture', enforce: 'pre', resolveId(id, importer) {
      if (id === '/finale-stage-fixture.js') return virtual;
      if (id === './assets' && importer?.endsWith('/src/render/view.ts')) return proofAssets;
    },
    load(id) {
      if (id === proofAssets) return `import { createAssets as actual } from ${JSON.stringify(join(root, 'src/render/assets.ts'))};
        import { Group, Mesh, BoxGeometry, MeshLambertMaterial, MeshPhysicalMaterial } from 'three';
        export function createAssets(renderer) {
          if (!window.privateFamilyProof) return actual(renderer);
          return { manifest:async()=>({packs:{boot:{files:{}},private:{files:{'pappa.glb':1}}}}),
            model:async(pack)=>{if(pack==='private')await new Promise(resolve=>setTimeout(resolve,0));
              const group=new Group();group.name=pack==='private'?'fixture-private-pappa':'candy';
              group.add(new Mesh(new BoxGeometry(.4,1,.4),pack==='private'
                ?new MeshPhysicalMaterial({clearcoat:.4}):new MeshLambertMaterial()));return group;},
            restoreTextures:async()=>{},textureInfo:()=>({}) };
        }
      `;
      if (id !== virtual) return; return `import { Scene, Box3, Vector3, Matrix4 } from 'three';
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
      export { norrsken } from ${JSON.stringify(join(root, 'src/content/chapters/norrsken.ts'))};
      export { mountShell } from ${JSON.stringify(join(root, 'src/ui/shell.ts'))};
      export { createHud } from ${JSON.stringify(join(root, 'src/ui/hud.ts'))};
      let scene, camera; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
      export const renderedScene = () => scene;
      export function corners(object) { const b = new Box3().setFromObject(object), points = [];
        for (const x of [b.min.x,b.max.x]) for (const y of [b.min.y,b.max.y]) for (const z of [b.min.z,b.max.z]) points.push(new Vector3(x,y,z).project(camera).toArray());
        return points; }
      export const at = (object) => object.getWorldPosition(new Vector3()).toArray();
      export function carrySupport(elof, pappa, toys) {
        const feet = ['left','right'].map((side,i)=>elof.getObjectByName('player-boot-'+side) ?? elof.getObjectByName(i===0?'foot_l':'foot_r'));
        const figure = elof.getObjectByName('player-figure');
        const head = elof.getObjectByName('Head') ?? elof.getObjectByName('head') ?? figure?.children[0]?.children[1]?.children[0];
        const body = pappa.children.find(child=>child.isInstancedMesh);
        if (!head || !body || feet.some(foot=>!foot)) return null;
        const matrix = new Matrix4(), hands = [], shoulders = [];
        const gaps = feet.map((foot, side)=>{
          body.getMatrixAt(side===0?7:10,matrix);
          // The palm lies at the hand box's centre, behind its small forward skin offset.
          const palm = new Vector3(0,0,-.02/.36).applyMatrix4(matrix).applyMatrix4(body.matrixWorld);
          hands.push(palm.toArray());
          body.getMatrixAt(side===0?5:8,matrix);
          shoulders.push(new Vector3(0,.5,0).applyMatrix4(matrix).applyMatrix4(body.matrixWorld).y);
          return palm.distanceTo(foot.getWorldPosition(new Vector3()));
        });
        return { gaps, hands, shoulders, headY:head.getWorldPosition(new Vector3()).y, tops:toys.map(toy=>new Box3().setFromObject(toy).max.y) };
      }
      export function shadows() { const blobs = scene.getObjectByName('character-blobs'), matrix = new Matrix4(), positions = [];
        for (let i=0; i<blobs.count; i++) { blobs.getMatrixAt(i,matrix); positions.push(new Vector3().setFromMatrixPosition(matrix).toArray()); }
        return positions; }
    `; } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [width, height, tier, reducedMotion] of [[390,844,'high','no-preference'],[844,390,'low','no-preference'],[780,360,'low','reduce'],[1180,820,'high','reduce'],[1440,900,'high','no-preference']]) {
    const name = `${width}x${height}-${tier}`;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/finale-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/finale-probe`);
    const before = await page.evaluate(async ({ tier }) => {
      const f = await import('/spokets-godisbus/finale-stage-fixture.js');
      const idle = { x:0,y:0,hopHeld:false,hop:false,act:false }, flags = ['lower','crowberry'];
      const chapter = { ...f.norrsken, spawn: { x:13.4,y:.01 } };
      let sim = new f.Sim(chapter, {}, { placed:['tragubbe'], flags });
      const view = f.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt=0) => view.render({ prev:sim.prev,curr:sim.curr,alpha:1,dt,atGoal:false,collected:sim.collected,
        checkpoint:sim.checkpoint,movers:sim.movers,drips:sim.drips,flags:sim.flags,ghost:sim.ghost,
        rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries });
      const advance = (seconds, input={}) => { for(let i=0;i<Math.round(seconds*120);i++) sim.step({...idle,...input}); };
      await view.ready; advance(.2); for(let i=0;i<12;i++)draw(.1);
      const scene=f.renderedScene(), ghost=scene.getObjectByName('chase-ghost'), carving=scene.getObjectByName('mover:tragubbe');
      const snapshot=()=> { const pappa=[]; scene.traverse(n=>{if(n.userData.familyRole==='pappa')pappa.push(n);});
        const elof=scene.getObjectByName('elof'), bag=scene.getObjectByName('spot:bag');
        const relatives=[]; scene.traverse(n=>{if(n.userData.familyRole)relatives.push({who:n.userData.familyRole,at:f.at(n)});});
        return {...view.info(), word:sim.curr.word, mode:sim.curr.mode, player:[sim.curr.x,sim.curr.y], groundY:sim.curr.groundY,
          eyes:scene.getObjectByName('first-carving-eyes').visible, bag:bag.visible, stolen:scene.getObjectByName('stolen-saturday-bag').visible,
          elof:f.at(elof), pappa:f.at(pappa[0]), ghost:f.at(ghost), carving:f.at(carving),
          support:f.carrySupport(elof,pappa[0],[ghost,carving]),
          pappaYaw:pappa[0].rotation.y, pappaPose:Array.from(pappa[0].children[0].instanceMatrix.array),
          corners:[elof,pappa[0],ghost,carving].map(f.corners), flags:[...sim.flags], relatives, shadows:f.shadows()}; };
      window.probe={f,draw,advance,snapshot,act:()=>sim.step({...idle,act:true}), restore:(x,flags)=>{
        sim=new f.Sim({...f.norrsken,spawn:{x,y:.01}}, {}, {placed:['tragubbe'],flags}); advance(.2); draw(.1);
      }}; return snapshot();
    }, { tier });
    check(`${name}: the rescued carving awaits eye painting and the ghost still holds the bag`, !before.eyes && !before.bag && before.stolen && before.word==='paintEyes');
    const painted=await page.evaluate(()=>{const p=window.probe;p.act();p.advance(.2);p.draw(.1);return p.snapshot();});
    check(`${name}: painting restores eyes and visibly offers the same striped bag`, painted.eyes && painted.bag && !painted.stolen && painted.flags.includes('eyes'));
    const saved=await page.evaluate(()=>{const p=window.probe;p.restore(13.4,['lower','crowberry','eyes','bag','share:tragubbe','gift:tragubbe:skumbanan','share:spoket','gift:spoket:karamell','share:jay','gift:jay:lingon','taste']);return p.snapshot();});
    check(`${name}: restored choices keep the repaired carving and returned bag state`, saved.eyes && !saved.bag && !saved.stolen);
    const ride=await page.evaluate(()=>{const p=window.probe;p.restore(33,['lower','crowberry','eyes','bag','share:tragubbe','gift:tragubbe:skumbanan','share:spoket','gift:spoket:karamell','share:jay','gift:jay:lingon','taste']);
      const beforeHome=p.snapshot(),word=beforeHome.word;p.act();p.advance(.6);for(let i=0;i<8;i++)p.draw(.1);return {beforeHome,word,...p.snapshot()};});
    check(`${name}: waiting relatives keep their shadows on the summit floor`, ride.beforeHome.relatives.every(({at})=>
      ride.beforeHome.shadows.some(([x,y,z])=>Math.abs(x-at[0])<.01 && Math.abs(z-at[2])<.01 && Math.abs(y-.018)<.01)));
    check(`${name}: Go home starts the actual simulation ride`, ride.flags.includes('home') && ride.mode==='ride');
    check(`${name}: Pappa carries grown Elof with both carvings beside him`, Math.abs(ride.pappa[0]-ride.player[0])<.01 && Math.abs(ride.pappa[1]-ride.player[1])<.01 && ride.elof[1]-ride.pappa[1]>4 && Math.abs(ride.ghost[0]-ride.elof[0])<1.1 && Math.abs(ride.carving[0]-ride.elof[0])<1.1);
    check(`${name}: both palms support Elof's ankles and the carvings stay below his face near his hands`, ride.support &&
      ride.support.gaps.every(gap=>gap<.15) && ride.support.tops.every(top=>top<ride.support.headY-.1) &&
      [ride.ghost,ride.carving].every(toy=>Math.abs(toy[2]-ride.elof[2])<.6));
    check(`${name}: the whole shoulder composition fits the screen`, ride.corners.every(points=>points.every(([x,y])=>Math.abs(x)<1 && Math.abs(y)<1)));
    const pause=await page.evaluate(()=>{const p=window.probe;for(let i=0;i<20;i++)p.draw(0);return p.snapshot();});
    check(`${name}: pausing holds the shoulder joints and GPU resources`, JSON.stringify(pause.elof)===JSON.stringify(ride.elof) && JSON.stringify(pause.pappa)===JSON.stringify(ride.pappa) && JSON.stringify(pause.pappaPose)===JSON.stringify(ride.pappaPose) && pause.pappaYaw===ride.pappaYaw && pause.geometries===ride.geometries && pause.textures===ride.textures);
    await picture(page, join(shots,`${name}-home.png`));
    const after=await page.evaluate(()=>{const p=window.probe;for(let i=0;i<12;i++){p.advance(.25);p.draw(.25);}return p.snapshot();});
    check(`${name}: the carried group follows the path with warmed shaders and bounded draws`, after.player[0]>ride.player[0]+3 && Math.abs(after.pappa[0]-after.player[0])<.01 && Math.abs(after.carving[0]-after.elof[0])<1.1 && after.programs===ride.programs && withinDraws(after.drawCalls, after.tier));
    check(`${name}: Pappa faces home and strides with actual ride travel`, after.pappaYaw>1 && after.pappaYaw<1.4 && JSON.stringify(after.pappaPose.slice(11*16))!==JSON.stringify(ride.pappaPose.slice(11*16)));
    check(`${name}: supporting palms stay at his ankles while Pappa walks`, after.support && after.support.gaps.every(gap=>gap<.15));
    const late=await page.evaluate(()=>{const p=window.probe;p.advance(4.4);for(let i=0;i<12;i++)p.draw(.1);return p.snapshot();});
    check(`${name}: eight seconds into home, ghost and Pappa shadows follow terrain support`, late.mode==='ride' && late.player[0]>60 && late.player[1]<-6 &&
      [late.ghost,late.pappa].every(at=>late.shadows.some(([x,y,z])=>Math.abs(x-at[0])<.01 && Math.abs(z-at[2])<.01 && Math.abs(y-(late.groundY+.018))<.01)));
    const landed=await page.evaluate(()=>{const p=window.probe;p.advance(3.5);for(let i=0;i<12;i++)p.draw(.1);return p.snapshot();});
    check(`${name}: after Elof dismounts Pappa settles both empty hands below his shoulders`, landed.mode!=='ride' && landed.support &&
      landed.support.hands.every((hand,i)=>hand[1]<landed.support.shoulders[i]-.55));
    const resting=await page.evaluate(()=>{const p=window.probe;for(let i=0;i<20;i++)p.draw(0);return p.snapshot();});
    check(`${name}: pausing after dismount retains the settled hands`, JSON.stringify(resting.pappaPose)===JSON.stringify(landed.pappaPose));
    assert.deepEqual(errors,[],`${name}: browser errors`);await page.close();
  }
  // The private-model replacement receives the same support callback as the rehearsal figure.
  const privatePage=await browser.newPage({viewport:{width:844,height:390}});
  await privatePage.route('**/private-family-probe',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>'}));
  await privatePage.goto(`${origin}/spokets-godisbus/private-family-probe`);
  const privateSupport=await privatePage.evaluate(async()=>{
    window.privateFamilyProof=true;const f=await import('/spokets-godisbus/finale-stage-fixture.js');
    const sim=new f.Sim({...f.norrsken,spawn:{x:33,y:.01}},{},{placed:['tragubbe'],flags:['lower','crowberry','eyes','bag','share:tragubbe','share:spoket','share:jay']});
    const idle={x:0,y:0,hopHeld:false,hop:false,act:false},view=f.createView(document.getElementById('game'),f.norrsken,'high',false);
    await view.ready;await new Promise(resolve=>setTimeout(resolve,0));
    const advance=seconds=>{for(let i=0;i<Math.round(seconds*120);i++)sim.step(idle);};
    const draw=()=>view.render({prev:sim.prev,curr:sim.curr,alpha:1,dt:.1,atGoal:false,collected:sim.collected,checkpoint:sim.checkpoint,
      movers:sim.movers,drips:sim.drips,flags:sim.flags,ghost:sim.ghost,rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries});
    advance(.2);for(let i=0;i<12;i++)draw();
    const scene=f.renderedScene(),pappa=scene.getObjectByName('fixture-private-pappa');
    const beforeReveal=view.info().programs;let hidden=false;
    for(let node=pappa;node;node=node.parent)if(!node.visible)hidden=true;
    sim.flags.add('taste');advance(.2);for(let i=0;i<12;i++)draw();
    const revealWarmed=beforeReveal===view.info().programs;
    const supported=at=>f.shadows().some(([x,y,z])=>Math.abs(x-at[0])<.01 && Math.abs(z-at[2])<.01 && Math.abs(y-(sim.curr.groundY+.018))<.01);
    const waiting=supported(f.at(pappa));sim.step({...idle,act:true});advance(8);for(let i=0;i<12;i++)draw();
    return{hidden,revealWarmed,waiting,pappa:supported(f.at(pappa)),ghost:supported(f.at(scene.getObjectByName('chase-ghost'))),
      x:sim.curr.x,y:sim.curr.y,mode:sim.curr.mode,models:view.info().models};
  });
  check('Private Pappa: hidden replacement reveals without compiling its distinct material variant',privateSupport.hidden && privateSupport.revealWarmed);
  check('Private Pappa: waiting shadow rests on the summit floor',privateSupport.waiting);
  check('Private Pappa: late home shadow follows the descending terrain',privateSupport.mode==='ride' && privateSupport.x>60 && privateSupport.y<-6 && privateSupport.pappa);
  check('Private Pappa: the carried ghost shares the same terrain support',privateSupport.ghost && privateSupport.models.includes('private/pappa'));
  await privatePage.close();
  // A discovery yields the same speech area without silently consuming a queued causal line.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${origin}/spokets-godisbus/`);
  const speech=await page.evaluate(async()=>{const f=await import('/spokets-godisbus/finale-stage-fixture.js');
    const host=document.createElement('div');document.body.replaceChildren(host);f.mountShell(host);const hud=f.createHud(document,100);
    const state=()=>({bubble:!document.getElementById('bubble').hidden,notice:!document.getElementById('notice').hidden,line:document.getElementById('bubbleLine').textContent});
    hud.say('pappa','tinyElof',true);hud.tick(0);const initial=state();hud.notice('Hittat!');hud.tick(1);const find=state();hud.tick(2.6);const resumed=state();hud.tick(1);const readable=state();
    hud.say('elof','stolenBag',true);hud.tick(0);const priority=state();
    // Pappa's sentence in two bubbles is read whole: the second half goes on under the first (story-presentation.md row 22).
    hud.say('pappa','first2',true);hud.tick(0);hud.say('pappa','first3');hud.tick(20);const bubble=document.getElementById('bubble');
    const more={shown:!bubble.hidden,lines:[...document.querySelectorAll('#bubbleLine .said')].map((said)=>said.textContent),tone:bubble.dataset.tone};
    hud.say('elof','stomp',true);hud.tick(0);const shout=bubble.dataset.tone;
    return{initial,find,resumed,readable,priority,more,shout};});
  // A find hangs from the bag now, so what is being said goes on beside it (docs/ux-audit/in-play.md row 18).
  check('Portrait: a find leaves speech where it is',speech.initial.bubble && speech.find.notice && speech.find.bubble && speech.find.line===speech.initial.line);
  check('Portrait: the causal line keeps its reading time after the find',speech.resumed.bubble && !speech.resumed.notice && speech.resumed.line===speech.initial.line && speech.readable.bubble);
  check('Portrait: a new causal priority line replaces stale dialogue',speech.priority.bubble && speech.priority.line!==speech.initial.line);
  check('Portrait: a line that goes on stands under the one before, said gently',speech.more.shown && speech.more.lines.join(' / ')==='Den täljde jag till dig / när du var liten, Elof.' && speech.more.tone==='soft');
  check('Portrait: a shout is drawn as one',speech.shout==='call');
  await page.close();console.log(`Finale staging: ${checks} browser checks passed.`);
} finally {await browser.close();await server.close();}
