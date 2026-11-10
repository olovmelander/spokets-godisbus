// Actual built game: 10 November items 50–61, with real UI actions and optional private exports.
// REVIEW_ROOT points at a built checkout. Captures remain in ignored scratch/; never publish family likenesses.
// The controlled RAF runs ordinary input, simulation, HUD and view at 20 Hz without setting scene state.
// Optional REVIEW_DRAW_EVERY samples intermediate GPU draws for software renderers; every capture draws a full frame.
// These sampled checkpoints verify authored poses/layout, not native-rate motion performance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=resolve(process.env.REVIEW_ROOT??fileURLToPath(new URL('../../../',import.meta.url)));
const dist=join(root,'dist'),out=resolve(process.env.REVIEW_OUT??join(root,'scratch/nov10-last-chapters'));mkdirSync(out,{recursive:true});
assert.ok(existsSync(join(dist,'index.html')),'Run npm run build first');
const BASE='/spokets-godisbus/',types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://local').pathname),file=resolve(dist,path.slice(BASE.length)||'index.html');if(!path.startsWith(BASE)||!file.startsWith(dist+'/')||!existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'}).end(readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const sizes=(process.env.REVIEW_SIZES??'390x844,844x390').split(',').map(s=>s.split('x').map(Number));
const selected=(process.env.REVIEW_CASES??'alven,billsta,stormoga').split(',');
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const results=[],errors=[];
const sampled=process.env.REVIEW_DRAW_EVERY?Number(process.env.REVIEW_DRAW_EVERY):1;
const provenance={drawEvery:sampled,distIndexSha256:createHash('sha256').update(readFileSync(join(dist,'index.html'))).digest('hex'),manifestSha256:createHash('sha256').update(readFileSync(join(dist,'packs/manifest.json'))).digest('hex')};
const state=p=>p.evaluate(()=>window.__godis.state());
async function advance(p,seconds){await p.evaluate(n=>{for(let i=0;i<n;i++)window.__frames.tick(.05);},Math.ceil((seconds-.001)/.05));}
async function read(p){await advance(p,.5);await p.evaluate(()=>document.getElementById('sceneNext').click());await advance(p,.05);}
async function until(p,test,label,max=1600){for(let i=0;i<max;i++){const s=await state(p);if(await test(s))return s;if(i%100===0)console.log('WAIT',label,s.x,s.scene?.id,s.scene?.seconds,s.storyReading);if(s.storyReading)await read(p);else await advance(p,.1);}throw new Error(`${label}: ${JSON.stringify(await state(p))}`);}
async function walk(p,x,stopScene){const dir=(await state(p)).x<x?'ArrowRight':'ArrowLeft';await p.keyboard.down(dir);try{for(let i=0;i<800;i++){const s=await state(p);if(stopScene?s.scene?.id===stopScene:(dir==='ArrowRight'?s.x>=x-.05:s.x<=x+.05))return s;if(s.storyReading){await p.keyboard.up(dir);await read(p);await p.keyboard.down(dir);}else await advance(p,.1);}throw new Error(`walk to ${x}: ${JSON.stringify(await state(p))}`);}finally{await p.keyboard.up(dir);}}
async function act(p,flag){for(let i=0;i<80;i++){const s=await state(p);if(s.flags.includes(flag))return;if(s.storyReading){await read(p);continue;}await p.evaluate(()=>document.getElementById('actBtn').click());await advance(p,.1);}throw new Error(`Action ${flag} failed: ${JSON.stringify(await state(p))}`);}
async function snap(p,name){await p.evaluate(()=>window.__frames.tick(0));const s=await state(p),bubble=await p.locator('#bubbleLine').textContent(),info=await p.evaluate(()=>window.__godis.info());const size=p.viewportSize();const filename=`${name}-${size.width}x${size.height}.png`;console.log('CAPTURE',new Date().toISOString(),name,size,s.scene,s.storyReading);const capture=await p.context().newCDPSession(p);try{const png=await Promise.race([capture.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false}),new Promise((_,reject)=>setTimeout(()=>reject(Error('capture deadline 45s')),45000))]);writeFileSync(join(out,filename),Buffer.from(png.data,'base64'));}finally{await p.evaluate(()=>window.__frames.present(false));await capture.detach();}const captured=await state(p);assert.equal(captured.steps,s.steps,'capture must not advance simulation');assert.deepEqual(captured.scene,s.scene,'capture must not advance story');const r={name,...size,state:s,bubble,bubbleVisible:await p.locator('#bubble').isVisible(),models:info.models,tier:info.tier,filename};results.push(r);writeFileSync(join(out,'results.json'),JSON.stringify({provenance,results,errors},null,2)+'\n');console.log('SHOT',name,size,s.scene,s.mode,s.x,s.y,bubble);return r;}
async function heldPair(p,name){const before=await snap(p,name);assert.ok(before.state.storyReading,'a real reading stop owns this frame');await advance(p,.55);const after=await state(p);assert.equal(after.steps,before.state.steps,'reading stops simulation');assert.deepEqual(after.scene,before.state.scene,'reading stops scene events');assert.equal(await p.locator('#bubbleLine').textContent(),before.bubble,'reading retains the whole line');}
async function open(width,height,course,at,flags){const p=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});p.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});await p.addInitScript(drawEvery=>{for(const kind of ['WebGLRenderingContext','WebGL2RenderingContext'])for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const proto=window[kind]?.prototype,fn=proto?.[name];if(fn)proto[name]=function(...args){if(window.__drawFrame!==false)return fn.apply(this,args);};}let drawn=0;const nativeRAF=window.requestAnimationFrame.bind(window);let next=1,now=performance.now(),pending=new Map(),presenting=false;const paint=()=>{if(!presenting)return;window.__frames.tick(0);nativeRAF(paint);};window.requestAnimationFrame=fn=>{const id=next++;pending.set(id,fn);return id;};window.cancelAnimationFrame=id=>pending.delete(id);window.__frames={tick(dt){window.__drawFrame=dt===0||++drawn<12||drawn%drawEvery===0;now+=dt*1000;const batch=[...pending.values()];pending.clear();for(const fn of batch)fn(now);window.__drawFrame=true;},present(on){if(on&&!presenting){presenting=true;nativeRAF(paint);}else if(!on)presenting=false;}};},sampled);const query=new URLSearchParams({dev:'',debug:'',course,at,tier:process.env.REVIEW_TIER??'low',flags:flags.join(',')});if(process.env.REVIEW_PRIVATE!=='1')query.set('standin','');await p.goto(`${origin}${BASE}?${query}`);for(let i=0;i<1200;i++){await advance(p,.05);if(await p.evaluate(()=>window.__godis?.state().bootReady&&document.getElementById('loading').classList.contains('done')))break;await p.waitForTimeout(25);}assert.ok((await state(p)).bootReady,'built game booted');if(process.env.REVIEW_PRIVATE==='1')await p.waitForFunction(()=>window.__godis.info().models.includes('private/elof'),null,{timeout:60000});await p.addStyleTag({content:'#debug{display:none!important}.bubble,.scene-caption{animation:none!important}'});console.log('OPEN',course,width,height,(await state(p)).scene);return p;}
try{for(const [w,h]of sizes){
 if(selected.includes('alven')){
  const p=await open(w,h,'alven','136.2,0.01',['scene:card','scene:bron','al:pappa','al:scarf','al:lift','al:owl-call','al:owl-ready']);
  await act(p,'al:owl');
  await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Långt fram på ån'),'Lillgubben line');
  assert.equal((await state(p)).scene?.id,'al:little');
  await heldPair(p,'alven-little');await p.close();
 }
 if(selected.includes('billsta')){
  let p=await open(w,h,'billsta','13.2,0.01',['scene:card']);
  await act(p,'bi:morfar');await until(p,s=>!s.storyReading,'Morfar finishes his line');
  await advance(p,.3);await snap(p,'billsta-ladder-hands');await advance(p,.5);await snap(p,'billsta-ladder-lowering');
  await until(p,s=>s.flags.includes('bi:ladder'),'ladder rests across ditch');await snap(p,'billsta-ladder-down');
  await walk(p,20);await until(p,async s=>s.said.includes('bi:thanks')&&(await p.locator('#bubbleLine').textContent()).includes('Tack, morfar!'),'Elof thanks Morfar');
  assert.ok((await p.locator('#bubbleLine').textContent()).includes('Tack, morfar!'));await snap(p,'billsta-thanks');await p.close();
  p=await open(w,h,'billsta','47.2,0.01',['scene:card','bi:morfar','bi:ladder']);
  await until(p,s=>!s.storyReading,'Mormor greeting');await snap(p,'billsta-door-closed');
  await act(p,'bi:mormor');await until(p,s=>s.scene?.id==='bi:ladan'&&s.scene.seconds>=3.9,'Mormor reaches door');await snap(p,'billsta-door-opening');
  await until(p,s=>s.flags.includes('placed:bi-door'),'door opens');await snap(p,'billsta-door-open');await p.close();
 }
 if(selected.includes('owl')){
  const p=await open(w,h,'stormoga','10.6,0.01',['scene:card','so:jetty','scene:bryggan','so:mamma','scene:lampa:mamma','so:pappa','scene:lampa:pappa','so:moa','scene:lampa:moa','so:bertil','scene:lampa:bertil','owl:call','owl:ready']);
  await act(p,'owl');await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Tack, ugglan!'),'Elof thanks owl over the water');
  const s=await state(p);assert.equal(s.mode,'ride');assert.ok(s.x<38&&s.y>1.5,`thanks is still in the air over the water: ${JSON.stringify(s)}`);await snap(p,'stormoga-owl-thanks');await p.close();
 }
 if(selected.includes('stormoga')){
  let p=await open(w,h,'stormoga','-0.8,0.01',['scene:card']);
  await advance(p,.4);await snap(p,'stormoga-jetty');await p.close();
  p=await open(w,h,'stormoga','9.4,0.01',['scene:card','so:jetty','scene:bryggan','so:mamma','scene:lampa:mamma','so:pappa','scene:lampa:pappa','so:moa','scene:lampa:moa']);
  await act(p,'so:bertil');await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Det var Elof'),'Bertil names Elof');await snap(p,'stormoga-bertil-elof');
  await read(p);await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Vi lyser'),'Bertil offers light');await snap(p,'stormoga-bertil-shine');
  await until(p,s=>s.flags.includes('scene:lampa:bertil'),'finish lamp');await walk(p,10.2);await act(p,'owl:call');await until(p,s=>s.flags.includes('owl:ready'),'owl arrives');await walk(p,10.6);await act(p,'owl');
  await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Tack, ugglan!'),'Elof thanks owl');await snap(p,'stormoga-owl-thanks');await p.close();
  p=await open(w,h,'stormoga','44.4,0.6',['scene:card','owl','eye','scene:oga','scene:rockav']);
  await until(p,s=>s.scene?.id==='motet'&&s.scene.seconds>=9.5,'walk up with cap');await snap(p,'stormoga-cap-walk');
  await until(p,async s=>s.storyReading&&(await p.locator('#bubbleLine').textContent()).includes('Här är din mössa'),'cap line');await heldPair(p,'stormoga-cap-give');
  await until(p,s=>s.flags.includes('so:cap-returned'),'cap handed back');await snap(p,'stormoga-cap-returned');await p.close();
  p=await open(w,h,'stormoga','46.4,0.6',['scene:card','eye','scene:oga','scene:rockav','scene:motet','gift:out','gift','beat:soMagic']);
  await act(p,'taste');await until(p,s=>s.scene?.id==='stor'&&s.scene.seconds>=5.5,'grown with figures');await snap(p,'stormoga-grown-grip');
  await until(p,s=>s.flags.includes('scene:stor'),'finish reunion');await walk(p,54);await act(p,'home');await until(p,s=>s.scene?.id==='hem'&&s.scene.seconds>=5,'walk through shallows');await snap(p,'stormoga-wade');
  await until(p,s=>s.mode!=='ride','reach shore');await snap(p,'stormoga-home');await p.close();
 }
}assert.deepEqual(errors,[],'No runtime page errors');console.log('Built-game review completed; inspect private images as well as assertions.');}finally{await browser.close();await new Promise(r=>server.close(r));}
