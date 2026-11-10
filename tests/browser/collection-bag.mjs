// Built game: one saved bag in both adventures, phone layout, original sweet stickers and replayable storm discoveries.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const base='/spokets-godisbus/';
const dist=fileURLToPath(new URL('../../dist/',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.webp':'image/webp'};
const server=createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://test').pathname);
  const file=join(dist,normalize(path.slice(base.length)||'index.html'));
  if(!path.startsWith(base)||!file.startsWith(dist)||!existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try {
  await page.addInitScript(()=>{
    if(localStorage.getItem('collection-fixture')) return;
    localStorage.setItem('collection-fixture','yes');
    localStorage.setItem('godisbus.v1.player.elof',JSON.stringify({v:1,name:'Elof',chapter:'stormgard',checkpoint:-1,settings:{style:'aventyr',sound:false},updated:1,playMs:0,candy:{garden:[0,1]},placed:{},flags:{
      garden:['found:gelehallon','lost:marble','memory','keepsake:paperwing'],
      stormgard:['found:lingonhjarta','lost:paperboat','memory:storm:yard'],
      stormskog:['memory:storm:forest'],
    }}));
  });
  const open=async course=>{
    await page.goto(`${origin}${base}?dev&debug&standin&tier=low&course=${course}`);
    await page.waitForFunction(()=>window.__godis?.state().bootReady,null,{timeout:90000});
    await page.keyboard.press('KeyG');
    await page.waitForSelector('#pause:not([hidden])');
  };
  await open('stormgard');
  assert.equal(await page.locator('.album-count').textContent(),'2 av 24 sorter');
  assert.equal(await page.locator('.album-chapter').count(),12);
  assert.equal(await page.locator('[data-thing="marble"]').count(),1);
  assert.equal(await page.locator('[data-thing="paperboat"]').count(),1);
  assert.equal(await page.locator('[data-keepsake="paperwing"]').count(),1);
  assert.equal(await page.locator('[data-memory="garden"]').count(),1);
  assert.equal(await page.locator('[data-memory="storm:forest"]').count(),1);
  const sweet=page.locator('.album-chapter').filter({hasText:'Stormgården'}).locator('.kind');
  assert.ok((await sweet.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('data:image/svg+xml'), 'New sweet uses its original drawing, not an out-of-range sheet cell');
  const imageLoads=await sweet.evaluate(el=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=getComputedStyle(el).backgroundImage.slice(5,-2);}));
  assert.equal(imageLoads,true,'The inline sticker image decodes');
  await page.locator('[data-memory="storm:forest"]').tap();
  await page.waitForSelector('#memory:not([hidden])');
  assert.equal(await page.locator('#memoryTitle').textContent(),'Den gamla vännen minns');
  assert.equal(await page.locator('#memoryProgress').textContent(),'1 / 2');
  const steps=await page.evaluate(()=>window.__godis.state().steps);
  await page.locator('#memoryNext').tap();
  assert.equal(await page.locator('#memoryProgress').textContent(),'2 / 2');
  await page.locator('#memoryClose').tap();
  assert.equal(await page.evaluate(()=>window.__godis.state().steps),steps,'Reading a collected story keeps the game paused');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-memory')),'storm:forest');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Phone view has no horizontal overflow');
  await page.setViewportSize({width:844,height:390});
  await open('garden');
  assert.equal(await page.locator('[data-memory="storm:forest"]').count(),1,'Storm discoveries stay visible when returning to Äventyr 1');
  assert.equal(await page.locator('[data-thing="paperboat"]').count(),1);
  assert.equal(await page.locator('.album-count').textContent(),'2 av 24 sorter');

  // The review sheets used save IDs as captions. In the actual bag and HUD, every pictured sweet/find
  // must keep its Swedish name, including accents, whichever adventure is currently being played.
  const sweets = {
    stormgard:['lingonhjarta','Lingonhjärta'], stormskog:['blabarspastill','Blåbärspastill'],
    stormbyn:['citronstjarna','Citronstjärna'], olympia:['fotbollspralin','Fotbollspralin'],
    flarken:['apelsinklyfta','Apelsinklyfta'], alven:['mintfisk','Mintfisk'],
    billsta:['kolaknapp','Kolaknapp'], stormoga:['norrskensruta','Norrskensruta'],
  };
  const finds = {
    granskog:['redbutton','En röd knapp'], myren:['ribbon','Ett mjukt band'],
    berget:['bell','En liten bjällra'], byn:['pencil','En röd penna'],
    stormgard:['paperboat','En pappersbåt'], stormskog:['spool','En trådrulle'],
    stormbyn:['reflector','En stjärnreflex'], olympia:['whistle','En visselpipa'],
    flarken:['shell','En liten snäcka'], alven:['float','Ett flöte'],
    billsta:['peg','En klädnypa'], stormoga:['lanternstar','En pappersstjärna'],
  };
  await page.addInitScript(({sweets,finds})=>{
    const key='godisbus.v1.player.elof', save=JSON.parse(localStorage.getItem(key));
    for(const [catalogue,prefix] of [[sweets,'found'],[finds,'lost']]) {
      for(const [chapter,[id]] of Object.entries(catalogue)) {
        save.flags[chapter]=[...new Set([...(save.flags[chapter]??[]),`${prefix}:${id}`])];
      }
    }
    save.updated=Date.now(); localStorage.setItem(key,JSON.stringify(save));
  },{sweets,finds});
  for(const [course,width,height] of [['stormgard',390,844],['garden',844,390]]) {
    await page.setViewportSize({width,height}); await open(course);
    const labels=await page.locator('.album-chapter .got > span').allTextContents();
    const titles=await page.locator('#bagStickers .kind').evaluateAll(elements=>elements.map(el=>el.title));
    for(const [id,name] of Object.values(sweets)) {
      assert.ok(labels.includes(name),`${course}: album calls ${id} ${name}`);
      assert.ok(titles.includes(name),`${course}: bag sticker calls ${id} ${name}`);
    }
    for(const [id,name] of Object.values(finds)) {
      assert.equal(await page.locator(`[data-thing="${id}"] > span`).textContent(),name,`${course}: Swedish find name`);
    }
    assert.equal(await page.locator('.album-count').textContent(),'9 av 24 sorter');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Swedish names fit the phone view');
  }
  assert.deepEqual(errors,[]);
  console.log('Collection bag: both adventures, Swedish names for all new sweets/finds, persisted finds, original stickers, phone/landscape and story replay passed.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
