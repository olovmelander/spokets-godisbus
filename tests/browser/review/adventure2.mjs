// Focused visual acceptance for Olov's 9 November list. Run after npm run assets.
// A renderer fixture samples the actual chapter definitions; it does not pretend to be a playthrough.
// REVIEW_PRIVATE=1 uses the local family exports. All captures stay under ignored scratch/.
// REVIEW_ROOT=/other/worktree REVIEW_CASES=hedge,breakfast REVIEW_SIZES=390x844,844x390
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';

const ownRoot = fileURLToPath(new URL('../../../', import.meta.url));
const root = resolve(process.env.REVIEW_ROOT ?? ownRoot);
const assetRoot = resolve(process.env.REVIEW_ASSETS ?? root);
const privateModels = process.env.REVIEW_PRIVATE === '1';
const sizes = (process.env.REVIEW_SIZES ?? '390x844,844x390,1440x900').split(',').map(size => size.split('x').map(Number));
const tier = process.env.REVIEW_TIER ?? 'low';
const out = resolve(process.env.REVIEW_OUT ?? join(root, 'scratch/adventure2-review'));
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync(join(assetRoot, 'public/packs/manifest.json'), 'utf8'));
if (privateModels) assert.ok(manifest.packs.private?.files['elof.glb'], 'Build assets with art/private before the private review.');
const cases = [
  { name:'hedge', items:[1], chapter:'stormgard', at:[177,0], scene:'haecken', time:2.4, flags:[], watch:['little-trägubbe'], visual:'Follow the lit little carving up and over the hedge; keep it recognizable on a portrait phone.' },
  { name:'forest-bridge', items:[2], chapter:'stormskog', at:[131,0], scene:'ss:ljuset', time:2, flags:['ss:beam','ss:frozen'], watch:['chase-ghost'], visual:'Lamp is already on Elof; bridge and words must describe what Pappa can see.' },
  { name:'street', items:[3,4], chapter:'stormbyn', at:[26,0], time:2.2, watch:['passerby'], visual:'Rounded walking legs with bent knees and planted feet; no car drives by (Olov, 12 November 2026).' },
  { name:'umbrella', items:[5], chapter:'stormbyn', at:[99.6,5], time:1, watch:['role:moa','paraply'], visual:'Moa holds the umbrella by its crook, its canopy over her head, before Elof calls her.' },
  { name:'cap', items:[6], chapter:'stormbyn', at:[138.8,0], scene:'mossan', time:1.6, flags:['cap','sb:cap-picked'], watch:['elof'], visual:'Elof stops, picks up the cap, and holds it visibly before his reading lines.' },
  { name:'olympia-up', items:[7], chapter:'olympia', at:[5,0], watch:['landmark:stairs'], visual:'Path rises towards the hall; ascending stone steps match his soles.' },
  { name:'puddle', items:[8], chapter:'olympia', at:[74,0], watch:['mover:ol-ball'], visual:'Puddle is an irregular shallow wet hollow, with contact where the ball lands.' },
  { name:'north', items:[9], chapter:'olympia', at:[172.8,1.4], scene:'norrut', time:3, flags:[], watch:['little-trägubbe'], visual:'Little carving remains recognizable while lifted north; shot has time to follow.' },
  { name:'sunboard', items:[10], chapter:'flarken', at:[72,0], watch:['building:sunboard'], visual:'The big sun board visibly says Flärken.' },
  { name:'lookout', items:[11], chapter:'flarken', at:[155.6,3.3], scene:'sjon:utkik', time:2, flags:['sjon:seen'], watch:['sighting'], visual:'The little carving on its stone at the outlet is identifiable, not hidden in the lake.' },
  { name:'stone', items:[12], chapter:'flarken', at:[170,0], scene:'sjon:plopp', time:1.1, flags:['placed:sjon-stone'], watch:['mover:sjon-stone','bark-holder'], visual:'Fieldstone falls and splashes; bark is wood and forms the floating next step.' },
  { name:'outlet', items:[13], chapter:'flarken', at:[184,0.6], scene:'sjon:strommen', time:2.1, flags:[], watch:['building:outlet','little-trägubbe'], visual:'A running river leaves the lake with two banks, bed stones, reeds and foam.' },
  { name:'river-start', items:[14], chapter:'alven', at:[12,0], watch:['water'], visual:'No exposed rectangular cut edge under the first water.' },
  { name:'logs', items:[15], chapter:'alven', at:[58.9,0.4], watch:['mover:al-log-1','river-log'], visual:'Elof’s soles contact the top of the visible bobbing log.' },
  { name:'river-far', items:[16], chapter:'alven', at:[166,0.4], watch:['water'], visual:'Far shore water continues naturally; no hanging sheet edge.' },
  { name:'scarf', items:[17], chapter:'alven', at:[88.6,0], scene:'bron', time:1.4, flags:['al:pappa','al:scarf'], watch:['scarf'], visual:'Wide knitted scarf hangs from Pappa’s hands to Elof, visibly fabric rather than a line.' },
  { name:'beaver', items:[18], chapter:'alven', at:[112,0], time:1.8, watch:['model:baver'], visual:'Blender beaver is visible beside the lodge, gnaws, looks, slaps tail and leaves.' },
  { name:'owl', items:[19], chapter:'alven', at:[136.2,0], watch:['spot:al:owl-call'], visual:'Owl swoops low over the candy; robot ride collects it using down input.' },
  { name:'river-family', items:[20,21], chapter:'alven', at:[181.6,0.4], scene:'al:kids', time:1.2, watch:['role:moa','role:bertil','building:car'], visual:'Children approach continuously from the silver hatchback; no badge or plate.' },
  { name:'billsta-car', items:[21], chapter:'billsta', at:[1,0], watch:['building:car'], visual:'Same modeled silver hatchback as Älven.' },
  { name:'grandmother', items:[22], chapter:'billsta', at:[45,0], watch:['figure:mormor'], visual:'Mormor is clear of the foreground stump when called.' },
  { name:'barn', items:[23], chapter:'billsta', at:[47.4,0], scene:'bi:ladan', time:4, flags:['bi:mormor','bi:mormor-goes'], watch:['figure:mormor','barn-door-slide'], visual:'Mormor walks up the planks, takes the sliding door by its handle, and pushes it aside along its rail.' },
  { name:'strait', items:[24], chapter:'billsta', at:[193.2,8], scene:'bi:sundet', time:2.2, flags:['beat:bi:there','bi:landed'], watch:['little-trägubbe','old-trägubbe'], visual:'Both carvings can be distinguished on the stone in the strait.' },
  { name:'sweet', items:[25], chapter:'stormoga', at:[46.4,0.6], scene:'stor', time:0.8, flags:['eye','scene:oga','scene:rockav','scene:motet','gift:out','gift','taste'], watch:['gold-sweet'], visual:'Gold-wrapped geléhallon is visible in Elof’s hand and at his mouth.' },
  { name:'taste', items:[25], chapter:'stormoga', at:[46.4,0.6], scene:'stor', time:2.15, flags:['eye','scene:oga','scene:rockav','scene:motet','gift:out','gift','taste'], watch:['gold-sweet'], visual:'Gold sweet reaches his lips before he grows.' },
  { name:'reunion', items:[26,28], chapter:'stormoga', at:[46.4,0.6], scene:'stor', time:11.2, flags:['eye','scene:oga','scene:rockav','scene:motet','gift:out','gift','taste'], talk:'bertil', watch:['role:bertil'], visual:'Bertil dreams of Thailand. Family shifts, looks and breathes while the line waits.' },
  { name:'home', items:[27], chapter:'stormoga', at:[54,0.6], scene:'hem', time:5, walk:true, flags:['eye','scene:oga','scene:rockav','scene:motet','gift:out','gift','taste','scene:stor','home'], watch:['elof'], visual:'Big Elof walks through shallows and onto shore, feet following the ground.' },
  { name:'breakfast', items:[28,29], chapter:'morgonen', at:[1,0], scene:'frukost', time:10.2, talk:'mormor', watch:['figure:mormor','role:mamma'], visual:'Mormor, cups and thermos clearly visible; listeners remain subtly alive.' },
  { name:'latch', items:[30], chapter:'morgonen', at:[10,0], scene:'haken', time:1.8, flags:['scene:frukost','shelf:old','shelf:small','scene:fonster','latch'], watch:['elof'], visual:'Metal window hook swings up and drops into its eye under the shelf.' },
  { name:'evening-shelf', items:[31], chapter:'stormkvall', at:[6,0], scene:'kvall', time:8, watch:['family-room'], visual:'Reference: shelf and window position on the storm evening.' },
  { name:'morning-shelf', items:[31], chapter:'morgonen', at:[6,0], flags:['scene:frukost','shelf:old','shelf:small'], watch:['family-room'], visual:'Shelf occupies the same window position as Stormkvällen.' },
  { name:'ending', items:[32], chapter:'morgonen', at:[27,0], scene:'slut', time:6, flags:['scene:frukost','shelf:old','shelf:small','latch','cocoa','beat:moAll'], watch:['little-trägubbe','old-trägubbe'], visual:'Final scene shows both carvings home; built endings suite checks card → map and retained completion.' },
];
const provenance={ revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), sourceDiffSha256:createHash('sha256').update(execFileSync('git',['diff','HEAD','--','src'],{cwd:root})).digest('hex'), manifestSha256:createHash('sha256').update(readFileSync(join(assetRoot,'public/packs/manifest.json'))).digest('hex') };
const chosen = process.env.REVIEW_CASES ? cases.filter(c => process.env.REVIEW_CASES.split(',').includes(c.name)) : cases;
assert.ok(chosen.length, 'No selected acceptance cases');
const virtual = '\0adventure2-review-fixture';
const server = await createServer({ root, publicDir:join(assetRoot,'public'), logLevel:'error', server:{ host:'127.0.0.1', port:0, hmr:false, watch:null,
  fs:{ allow:[root, realpathSync(join(root,'node_modules'))] } }, plugins:[{
  name:'adventure2-review-fixture', resolveId(id) { if (id==='/adventure2-review-fixture.js') return virtual; },
  load(id) { if(id!==virtual)return; return `
    import { Scene, Box3, Vector3 } from 'three';
    export { createView } from ${JSON.stringify(join(root,'src/render/view.ts'))};
    export { Sim } from ${JSON.stringify(join(root,'src/sim/sim.ts'))};
    export { COURSES, loadAdventure2 } from ${JSON.stringify(join(root,'src/content/chapters/index.ts'))};
    export { sv } from ${JSON.stringify(join(root,'src/content/sv.ts'))};
    let scene, camera; const before = Scene.prototype.onBeforeRender;
    Scene.prototype.onBeforeRender = function (...args) { if(this.getObjectByName('chase-ghost')) { scene=this; camera=args[2]; } before.apply(this,args); };
    const visible = node => { for(let n=node;n;n=n.parent)if(!n.visible)return false;return true; };
    export function snapshot(selectors) {
      const found=[]; scene.updateMatrixWorld(true);
      scene.traverse(node=>{
        const tags=[node.name, 'model:'+node.userData.model, 'role:'+node.userData.familyRole];
        if(!selectors.some(w=>tags.includes(w)))return;
        const box=new Box3().setFromObject(node), points=[];
        if(box.isEmpty())return;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new Vector3(x,y,z).project(camera));
        const rect={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.max(...points.map(p=>p.y)),bottom:Math.min(...points.map(p=>p.y))};
        const onScreen=visible(node)&&rect.left<1&&rect.right>-1&&rect.top>-1&&rect.bottom<1&&points.some(p=>p.z>=-1&&p.z<=1);
        found.push({name:node.name,model:node.userData.model,role:node.userData.familyRole,visible:visible(node),onScreen,rect,bounds:[box.min.toArray(),box.max.toArray()],at:node.getWorldPosition(new Vector3()).toArray()});
      });
      return found;
    }
    export function body() {
      const out=[]; scene.traverse(node=>{if(node.isBone||node.name==='face-parts'){
        const a=node.geometry?.attributes?.position?.array;let sum=0;if(a)for(let i=0;i<a.length;i++)sum+=a[i]*(i%17+1);
        out.push([node.name,...node.matrix.toArray(),sum]);
      }});return out;
    }
  `; }
}] });
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const results=[];
try {
 for(const item of chosen) {
  const page=await browser.newPage({viewport:{width:sizes[0][0],height:sizes[0][1]},deviceScaleFactor:1});
  console.log('start',item.name);
  const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
  page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
  await page.route('**/adventure2-review-probe',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>'}));
  await page.goto(`${origin}/spokets-godisbus/adventure2-review-probe`);
  await page.evaluate(async ({item,tier,privateModels})=>{
    const f=await import('/spokets-godisbus/adventure2-review-fixture.js'); await f.loadAdventure2();
    const chapter={...f.COURSES[item.chapter],spawn:{x:item.at[0],y:item.at[1]}};
    const sim=new f.Sim(chapter),view=f.createView(document.getElementById('game'),chapter,tier,!privateModels);
    const words={who:null,text:item.talk==='bertil'?'Nästa äventyr får bli i Thailand.': 'God morgon. Här finns varm choklad.',seconds:0,reading:false};
    let scene=null;
    const draw=(dt=.1)=>{words.seconds+=dt;view.render({prev:sim.prev,curr:sim.curr,alpha:1,dt,atGoal:false,collected:sim.collected,checkpoint:sim.checkpoint,movers:sim.movers,drips:sim.drips,flags:sim.flags,ghost:sim.ghost,rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries,scene,talk:words});};
    await view.ready;
    if(privateModels){const end=performance.now()+60000;while(!view.info().models.includes('private/elof')&&performance.now()<end)await new Promise(r=>setTimeout(r,50));if(!view.info().models.includes('private/elof'))throw new Error('Private Elof did not load');}
    console.log('models ready',item.name);for(let i=0;i<4;i++)draw(.4);
    for(const flag of item.flags??[])sim.flags.add(flag);
    const def=chapter.scenes?.find(s=>s.id===item.scene);
    // Follow scene cues too: a flight may deliberately start after the camera reaches its framing.
    const total=item.time??.8;
    for(let t=0;t<=total+.001;t+=.3){
      scene=item.scene?{id:item.scene,seconds:Math.min(t,total)}:null;
      for(const cue of def?.cues??[])if(cue.at<=t&&cue.flag)sim.flags.add(cue.flag);
      for(let pass=0;pass<4;pass++)for(const beat of chapter.beats??[])if(beat.on&&sim.flags.has(beat.on)&&(!beat.needs||sim.flags.has(beat.needs)))sim.flags.add('beat:'+beat.id);
      if(item.walk){const ride=chapter.rides.find(r=>r.id==='home'),k=Math.min(1,t/ride.time),ease=k*k*(3-2*k);const x=ride.from.x+(ride.to.x-ride.from.x)*ease;const right=ride.ground.findIndex(point=>point.x>=x),a=ride.ground[Math.max(0,right-1)],b=ride.ground[Math.max(0,right)];const y=a.y+(b.y-a.y)*Math.min(1,Math.max(0,(x-a.x)/Math.max(.001,b.x-a.x)));Object.assign(sim.prev,sim.curr);Object.assign(sim.curr,{x,y,mode:'ride',grounded:true,vx:(x-sim.prev.x)/.3,vy:0,groundY:y,standY:y});}
      draw(.3);
    }
    scene=item.scene?{id:item.scene,seconds:total}:null;
    words.who=item.talk??null;words.reading=!!item.talk;words.seconds=0;
    window.review={f,sim,view,draw,words,scene,chapter,item};
  },{item,tier,privateModels});
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    const measured=await page.evaluate(()=>{
      const p=window.review;p.view.resize();for(let i=0;i<3;i++)p.draw(0);
      return {info:p.view.info(),targets:p.f.snapshot(p.item.watch),scene:p.scene,flags:[...p.sim.flags]};
    });
    const filename=`${item.name}-${width}x${height}.png`;
    await page.screenshot({path:join(out,filename),timeout:120000});
    const result={...item,width,height,tier,privateModels,filename,...measured,errors:[...errors]};
    results.push(result);
    console.log(`${item.name} ${width}x${height}: ${measured.targets.filter(t=>t.onScreen).length}/${measured.targets.length} selected objects in view; ${errors.length} errors`);
  }
  if(item.talk){
    const movement=await page.evaluate(()=>{
      const p=window.review,before=p.f.body(),state=JSON.stringify(p.sim.curr),scene=JSON.stringify(p.scene);
      for(let i=0;i<16;i++)p.draw(.1);
      const after=p.f.body();for(let i=0;i<6;i++)p.draw(0);const paused=p.f.body();
      return {bodyMoves:JSON.stringify(before)!==JSON.stringify(after),pauseHolds:JSON.stringify(after)===JSON.stringify(paused),storyHeld:state===JSON.stringify(p.sim.curr)&&scene===JSON.stringify(p.scene)};
    });
    results.push({name:item.name+'-speaking',...movement});
    console.log(' speech',item.name,JSON.stringify(movement));
  }
  if(['hedge','north','outlet','scarf','barn'].includes(item.name)) {
    const held=await page.evaluate(()=>{
      const p=window.review;
      const positions=()=>p.f.snapshot(p.item.watch).filter(n=>n.visible).map(n=>({name:n.name,at:n.at}));
      p.words.who='elof';p.words.text='Jag ser dig. Vänta så kommer jag.';p.words.seconds=0;p.words.reading=true;
      p.draw(0);const before=positions();for(let i=0;i<8;i++)p.draw(.2);const after=positions();
      return {eventHeld:JSON.stringify(before)===JSON.stringify(after),selected:before.length};
    });
    results.push({name:item.name+'-reading-event',...held});console.log(' reading event',item.name,JSON.stringify(held));
  }
  await page.close();
  writeFileSync(join(out,'results.json'),JSON.stringify({provenance,privateModels,tier,sizes,results},null,2)+'\n');
 }
 assert.ok(results.every(r=>!r.errors?.length),'Page errors: inspect results.json');
 assert.ok(results.filter(r=>r.name.endsWith('-reading-event')).every(r=>r.selected>0&&r.eventHeld),'A staged event moved during a reading stop: inspect results.json');
 assert.ok(results.filter(r=>r.name.endsWith('-speaking')).every(r=>r.bodyMoves&&r.pauseHolds&&r.storyHeld),'Speaking body/Pause/story regression: inspect results.json');
 console.log(`Acceptance evidence in ${out}. Visual cases require inspection; projection alone does not prove an unobscured picture.`);
} finally {await browser.close();await server.close();}
