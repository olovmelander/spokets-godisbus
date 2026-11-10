// The real view: a reading stop holds an event while the speaker lives, and Pause holds both.
// TALK_PRIVATE=1 repeats the same checks with the locally attached family pack. No captures are published.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const root = fileURLToPath(new URL('../../', import.meta.url));
const virtual = '\0talk-life-fixture';
const server = await createServer({ root, cacheDir: 'node_modules/.vite-talk-life',
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'talk-life-fixture', resolveId(id) { if (id === '/talk-life-fixture.js') return virtual; },
    load(id) { if (id !== virtual) return; return `import { Scene } from 'three';
      import ${JSON.stringify(join(root, 'src/content/aventyr2/aventyr2.ts'))};
      export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
      export { flightAt } from ${JSON.stringify(join(root, 'src/content/aventyr2/kit.ts'))};
      export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
      export { stormgard } from ${JSON.stringify(join(root, 'src/content/aventyr2/chapters/stormgard.ts'))};
      let scene; const before = Scene.prototype.onBeforeRender;
      Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) scene = this; before.apply(this, args); };
      export function snapshot() {
        const elof = scene.getObjectByName('elof');
        const head = elof.getObjectByName('Head') ?? elof.getObjectByName('player-head');
        const face = elof.getObjectByName('face-parts') ?? elof.getObjectByName('player-mouth');
        const flight = scene.getObjectByName('storm').getObjectByName('little-trägubbe').parent;
        const mouth = face.name === 'face-parts' ? Array.from(face.geometry.attributes.position.array).slice(0,16*17*3) : face.scale.toArray();
        return { root: elof.position.toArray(), head: head.matrixWorld.toArray(), mouth, flight: flight.position.toArray(), visible: flight.visible };
      }`; }
  }] });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, ok) => { assert.ok(ok, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const [width,height] of [[844,390],[390,844]]) {
    const name = `${width}x${height}`, page = await browser.newPage({ viewport: {width,height} });
    const errors=[];page.on('pageerror', error => errors.push(error.message));
    await page.route('**/talk-life-probe', route => route.fulfill({ contentType:'text/html', body:'<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/talk-life-probe`);
    await page.evaluate(async privateModels => {
      const f=await import('/spokets-godisbus/talk-life-fixture.js');
      const chapter={...f.stormgard,spawn:{x:177,y:0},scenes:[]};
      const sim=new f.Sim(chapter), view=f.createView(document.getElementById('game'),chapter,'low',!privateModels);
      let talk=null;
      const draw=(dt=1/30,eventDt=dt)=>view.render({prev:sim.prev,curr:sim.curr,alpha:1,dt,eventDt,atGoal:false,collected:sim.collected,checkpoint:sim.checkpoint,
        movers:sim.movers,drips:sim.drips,flags:sim.flags,ghost:sim.ghost,rollers:sim.rollers,tussocks:sim.tussocks,gusts:sim.gusts,help:sim.help,berries:sim.berries,talk});
      await view.ready;
      if(privateModels) {
        const until=performance.now()+60000;
        while(!view.info().models.includes('private/elof') && performance.now()<until) await new Promise(resolve=>setTimeout(resolve,50));
        if(!view.info().models.includes('private/elof'))throw Error('private Elof did not load');
      }
      for(let i=0;i<8;i++)draw();
      const flight=chapter.storm.flybys.find(flyby=>flyby.who==='lillgubbe');
      sim.flags.add(flight.on);
      for(let i=0;i<8;i++)draw();
      window.probe={f,sim,view,draw,flight,say(value){talk=value;},read(seconds){talk={who:'elof',text:'Mamma, pappa, jag ser min lilla gubbe!',seconds,reading:true};draw();return f.snapshot();}};
    },process.env.TALK_PRIVATE==='1');
    const held=await page.evaluate(()=>{
      const p=window.probe;
      const before=p.read(.1), state=JSON.stringify(p.sim.curr), frames=[];
      for(let i=0;i<45;i++)frames.push(p.read(.1+(i+1)/30));
      return {before,frames,stateHeld:state===JSON.stringify(p.sim.curr)};
    });
    check(`${name}: a visible flight stays at its event time throughout a reading stop`,held.before.visible && held.frames.every(s=>JSON.stringify(s.flight)===JSON.stringify(held.before.flight)));
    check(`${name}: the boy stays put and the simulation does not advance`,held.stateHeld && held.frames.every(s=>JSON.stringify(s.root)===JSON.stringify(held.before.root)));
    check(`${name}: the speaker moves his head and mouth while the story waits`,held.frames.some(s=>JSON.stringify(s.head)!==JSON.stringify(held.before.head)) && held.frames.some(s=>JSON.stringify(s.mouth)!==JSON.stringify(held.before.mouth)));
    const paused=await page.evaluate(()=>{const p=window.probe,before=p.f.snapshot();for(let i=0;i<4;i++)p.draw(0);return {before,after:p.f.snapshot()};});
    assert.deepEqual(paused.after,paused.before,`${name}: Pause holds the face, body and event exactly`); checks++;
    const resumed=await page.evaluate(()=>{
      const p=window.probe;p.say(null);
      // A slow frame advances only the simulation's budget, not its full wall time. The flight was already 7/30 s old.
      for(let i=0;i<4;i++)p.draw(.25,1/120);
      return {after:p.f.snapshot(),expected:p.f.flightAt(p.flight,(7/30+4/120)/p.flight.seconds)};
    });
    check(`${name}: continuing resumes the same flight`,resumed.after.visible && JSON.stringify(resumed.after.flight)!==JSON.stringify(held.before.flight));
    check(`${name}: a slow frame keeps the flight with the simulation's step budget`,Math.abs(resumed.after.flight[0]-resumed.expected.x)<1e-6);
    assert.deepEqual(errors,[],`${name}: browser errors`);
    await page.close();
  }
  console.log(`Talk life: ${checks} browser checks passed.`);
} finally {await browser.close();await server.close();}
