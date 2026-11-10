// Deterministic real-renderer checks for the finale. Uses the authored chapter and simulation states,
// with stand-ins; nightfall holds simulation still, then the reunion advances its authored scene. Run: node tests/browser/nightfall.mjs.
// Iteration captures stay in ignored docs/shots/_work/; these are not checkpoint contact sheets.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/nightfall');
mkdirSync(shots, { recursive: true });
const fixture = '\0nightfall-fixture';
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{
    name: 'nightfall-test-fixture',
    resolveId(id) { if (id === '/nightfall-fixture.js') return fixture; },
    load(id) {
      if (id !== fixture) return;
      return `
        import { Scene, WebGLRenderer, OrthographicCamera } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { COURSES } from ${JSON.stringify(join(root, 'src/content/chapters/index.ts'))};
        let scene, renderer, camera;
        const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) {
          if (this.getObjectByName('chase-ghost')) { scene = this; renderer = args[0]; camera = args[2]; }
          before.apply(this, args);
        };
        export const renderedScene = () => scene;
        // A small, separate framebuffer isolates the actual aurora shader from moving faces, stars and
        // post effects. It shares the production mesh/material and camera; this renderer is test-only.
        let auroraRenderer, auroraScene, auroraCopy;
        export function auroraPixels() {
          const aurora = scene.getObjectByName('aurora');
          if (!auroraRenderer) {
            auroraRenderer = new WebGLRenderer({ antialias: false });
            auroraRenderer.setSize(Math.round(192 * Math.min(1, camera.aspect)), Math.round(192 / Math.max(1, camera.aspect)), false);
            auroraRenderer.setClearColor(0x000000, 1);
            auroraScene = new Scene();
            auroraCopy = aurora.clone();
            auroraCopy.onBeforeRender = aurora.onBeforeRender;
            auroraScene.add(auroraCopy);
          }
          auroraCopy.visible = aurora.visible;
          auroraRenderer.render(auroraScene, camera);
          const gl = auroraRenderer.getContext();
          const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          return pixels;
        }
        export function auroraFlow(before, after) {
          let aa = 0, ab = 0, energy = 0, residual = 0, changed = 0;
          const luminance = (pixels, i) => .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
          for (let i = 0; i < before.length; i += 4) {
            const a = luminance(before, i), b = luminance(after, i);
            aa += a * a; ab += a * b; energy += b;
            if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) changed++;
          }
          // Remove the best-fitting whole-image brightness multiplier. A pulsing still picture has
          // almost no residual; a flowing curtain changes where its light falls.
          const gain = aa > 0 ? ab / aa : 1;
          for (let i = 0; i < before.length; i += 4) residual += Math.abs(luminance(after, i) - gain * luminance(before, i));
          return { changed, energy, spatialChange: residual / Math.max(1, energy), draws: auroraRenderer.info.render.calls };
        }
        // Read the actual uploaded material uniform, without adding a production debug API.
        export function rimStrength() {
          let strength = null;
          scene.getObjectByName('elof').traverse((node) => {
            for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) {
              const uniform = renderer.properties.get(material).uniforms?.placeRimStrength;
              if (uniform) strength = uniform.value;
            }
          });
          return strength;
        }
        export function measureStars(points, width, height, ratio) {
          const canvas = document.createElement('canvas');
          const renderer = new WebGLRenderer({ canvas, antialias: false });
          renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
          const testScene = new Scene();
          const copy = points.clone();
          copy.onBeforeRender = points.onBeforeRender;
          testScene.add(copy);
          renderer.render(testScene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
          const gl = renderer.getContext();
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const positions = points.geometry.getAttribute('position');
          const bounds = [];
          for (let i = 0; i < positions.count; i++) {
            const x = (positions.getX(i) + 1) * canvas.width / 2;
            const y = (positions.getY(i) + 1) * canvas.height / 2;
            if (x < 8 || y < 8 || x > canvas.width - 8 || y > canvas.height - 8) continue;
            let isolated = true;
            for (let j = 0; j < positions.count; j++) if (j !== i) {
              const dx = (positions.getX(j) - positions.getX(i)) * canvas.width / 2;
              const dy = (positions.getY(j) - positions.getY(i)) * canvas.height / 2;
              if (Math.hypot(dx, dy) < 16) isolated = false;
            }
            if (!isolated) continue;
            let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
            for (let py = Math.floor(y) - 7; py <= Math.ceil(y) + 7; py++) {
              for (let px = Math.floor(x) - 7; px <= Math.ceil(x) + 7; px++) {
                if (pixels[(py * canvas.width + px) * 4] < 24) continue;
                left = Math.min(left, px); right = Math.max(right, px);
                bottom = Math.min(bottom, py); top = Math.max(top, py);
              }
            }
            if (Number.isFinite(left)) bounds.push({ width: right - left + 1, height: top - bottom + 1 });
          }
          renderer.dispose();
          return bounds;
        }
      `;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); console.log(`  ok   ${name}`); checks++; };
try {
  for (const [width, height] of [[844, 390], [390, 844]]) for (const tier of ['low', 'high']) {
    const name = `${width}x${height}-${tier}`;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/nightfall-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/nightfall-probe`);
    const early = await page.evaluate(async ({ tier }) => {
      const fixture = await import('/spokets-godisbus/nightfall-fixture.js');
      const chapter = { ...fixture.COURSES.norrsken, spawn: { x: 25, y: 0.01 } };
      const sim = new fixture.Sim(chapter, {}, { flags: ['lower', 'eyes', 'bag', 'shared', 'share:tragubbe', 'share:spoket', 'share:jay'] });
      const view = fixture.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0, eventDt = dt, talk = null) => view.render({
        prev: sim.prev, curr: sim.curr, alpha: 1, dt, eventDt, talk, atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint,
        movers: sim.movers, drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers,
        tussocks: sim.tussocks, gusts: sim.gusts, help: sim.help, berries: sim.berries, scene: sim.sceneFrame,
      });
      // Shared scenery adds model names too. The production loading barrier, not a count of arrivals,
      // ensures every kit has arrived before the shader baseline is warmed and measured.
      await view.ready;
      for (let i = 0; i < 4; i++) draw();
      const scene = fixture.renderedScene();
      const far = [];
      scene.traverse((object) => { if (object.name.startsWith('far-dusk-')) far.push(object); });
      const shownFamily = () => {
        const shown=[];
        scene.traverse(object=>{if(!object.userData.familyRole)return;
          for(let node=object;node;node=node.parent)if(!node.visible)return;
          shown.push({who:object.userData.familyRole,x:object.getWorldPosition(object.position.clone()).x});
        });
        return shown;
      };
      const aurora = scene.getObjectByName('aurora');
      const snapshot = () => ({
        ...view.info(), background: scene.backgroundIntensity,
        sky: scene.getObjectByName('place-sky').material.color.r, rim: fixture.rimStrength(),
        far: far.map((card) => card.material.color.r),
        fog: scene.fog.color.toArray(), state: JSON.stringify(sim.curr),
        family: shownFamily(), familyShown: shownFamily().length, scene: sim.sceneFrame,
        aurora: { time: aurora.material.uniforms.time.value, strength: aurora.material.uniforms.strength.value },
      });
      window.probe = { fixture, sim, view, draw, scene, snapshot };
      return snapshot();
    }, { tier });
    check(`${name}: real finale assets loaded`, ['boot/big-candy', 'boot/jay', 'boot/candy', 'boot/mountain-kit', 'aventyr2/nature']
      .every(model => early.models.includes(model)));
    check(`${name}: blue-hour sky and five far layers start at full brightness`, early.background === 1 && early.sky === 1 && early.far.length === 5 && early.far.every((v) => v === 1));
    check(`${name}: precompiled family stays hidden until the golden sweet`, early.familyShown === 0);
    await picture(page, join(shots, `${name}-early.png`));
    const transition = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.add('taste');
      const frames = [];
      let beforePause, paused, beforeReading, reading;
      for (let i = 0; i < 7; i++) {
        p.draw(0.5); frames.push(p.snapshot());
        if (i === 2) {
          beforePause = p.snapshot(); p.draw(0); paused = p.snapshot();
          beforeReading = p.snapshot();
          p.draw(.5, 0, { who: 'elof', text: 'Titta, norrskenet dansar!', seconds: .5, reading: true });
          reading = p.snapshot();
        }
      }
      return { frames, paused, beforePause, beforeReading, reading };
    });
    check(`${name}: sky and hills darken together`, transition.frames.every((s) => s.sky === s.background && s.far.every((v) => Math.abs(v - s.background) < 1e-9)) && transition.frames.at(-1).background < 0.35);
    check(`${name}: night haze changes with the sky`, transition.frames.at(-1).fog.every((v, i) => v < early.fog[i]));
    check(`${name}: Elof's actual rim fades with nightfall and is gone at night`, early.rim > 0 &&
      transition.frames.every((s, i, all) => s.rim >= 0 && s.rim <= (all[i - 1] ?? early).rim) &&
      transition.frames.at(-1).rim === 0 && transition.paused.rim === transition.beforePause.rim);
    check(`${name}: tasting waits for the reunion instead of teleporting the family`, transition.frames.every(s=>s.familyShown === 0));
    check(`${name}: no shader compiles or simulation changes during nightfall`, transition.frames.every((s) => s.programs === early.programs && s.state === early.state));
    console.log(`  draws ${name}: ${early.drawCalls} → ${transition.frames.map((s) => s.drawCalls).join(', ')}`);
    // Before the reunion starts, only uniforms change. The glitter leaves when he has grown back.
    check(`${name}: nightfall draw calls never rise, within budget`, transition.frames.every((s, i, all) => s.drawCalls <= (all[i - 1] ?? s).drawCalls && withinDraws(s.drawCalls, s.tier)));
    check(`${name}: pause holds nightfall still`, transition.paused.background === transition.beforePause.background);
    check(`${name}: reading does not finish the story's nightfall transition early`,
      transition.beforeReading.background > transition.frames.at(-1).background &&
      transition.reading.background === transition.beforeReading.background &&
      transition.reading.aurora.strength === transition.beforeReading.aurora.strength &&
      Math.abs(transition.reading.aurora.time - transition.beforeReading.aurora.time - .5) < 1e-8);
    await picture(page, join(shots, `${name}-night.png`));
    const round = await page.evaluate(({ width, height }) => {
      const p = window.probe;
      return p.fixture.measureStars(p.scene.getObjectByName('dusk-stars'), width, height, p.view.info().pixelRatio);
    }, { width, height });
    check(`${name}: stars stay round in framebuffer pixels`, round.length > 50 && round.every((b) => Math.abs(b.width - b.height) <= 1));
    const reading = await page.evaluate(() => {
      const p = window.probe;
      const held = { who: 'elof', text: 'Titta, norrskenet dansar!', seconds: .5, reading: true };
      const before = p.snapshot(), pixels = p.fixture.auroraPixels();
      // Timed keyframes, not a frame-rate benchmark: keep the software-rendered CI workload small.
      for (let i = 0; i < 8; i++) p.draw(.25, 0, held);
      const after = p.snapshot(), moved = p.fixture.auroraPixels();
      const flow = p.fixture.auroraFlow(pixels, moved);
      for (let i = 0; i < 4; i++) p.draw(0, 0, held);
      const paused = p.snapshot(), pause = p.fixture.auroraFlow(moved, p.fixture.auroraPixels());
      return { before, after, paused, flow, pause };
    });
    check(`${name}: reading holds the story and nightfall while the aurora clock continues`,
      reading.before.state === reading.after.state && JSON.stringify(reading.before.scene) === JSON.stringify(reading.after.scene) &&
      reading.before.background === reading.after.background && Math.abs(reading.after.aurora.time - reading.before.aurora.time - 2) < 1e-8);
    check(`${name}: the rendered aurora flows instead of merely pulsing brighter`,
      reading.flow.energy > 0 && reading.flow.spatialChange > .02 && reading.before.aurora.strength === reading.after.aurora.strength);
    check(`${name}: aurora movement stays one draw without new production shaders or allocations`,
      reading.flow.draws === 1 && reading.after.programs === reading.before.programs &&
      reading.after.geometries === reading.before.geometries && reading.after.textures === reading.before.textures);
    check(`${name}: Pause holds the aurora clock and every rendered aurora pixel exactly`,
      reading.paused.aurora.time === reading.after.aurora.time && reading.pause.changed === 0);
    console.log(`  aurora flow ${name}: residual ${reading.flow.spatialChange.toFixed(3)}, ${reading.flow.changed} changed pixels`);
    for (const source of ['setting', 'device']) {
      if (source === 'device') await page.emulateMedia({ reducedMotion: 'reduce' });
      else await page.evaluate(() => { document.documentElement.dataset.motion = 'reduce'; });
      const calm = await page.evaluate(() => {
        const p = window.probe, before = p.snapshot(), pixels = p.fixture.auroraPixels();
        // Let story time run too: reduced motion must hold the lights even outside a reading stop.
        for (let i = 0; i < 4; i++) p.draw(.25);
        return { before, after: p.snapshot(), flow: p.fixture.auroraFlow(pixels, p.fixture.auroraPixels()) };
      });
      check(`${name}: ${source} reduced motion holds the aurora exactly`,
        calm.before.aurora.time === calm.after.aurora.time && calm.flow.changed === 0);
      if (source === 'device') await page.emulateMedia({ reducedMotion: 'no-preference' });
      else await page.evaluate(() => { delete document.documentElement.dataset.motion; });
      const resumed = await page.evaluate(() => {
        const p = window.probe, before = p.snapshot(), pixels = p.fixture.auroraPixels();
        p.draw(0);
        const sameFrame = p.fixture.auroraFlow(pixels, p.fixture.auroraPixels());
        p.draw(1 / 30);
        return { before, after: p.snapshot(), sameFrame };
      });
      check(`${name}: ${source} motion resumes from the held curtain without a clock jump`,
        resumed.sameFrame.changed === 0 && Math.abs(resumed.after.aurora.time - resumed.before.aurora.time - 1 / 30) < 1e-8);
    }
    const returned = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.delete('taste');
      for (let i = 0; i < 7; i++) p.draw(0.5);
      return p.snapshot();
    });
    check(`${name}: reversing nightfall restores sky, hills and haze without drift`, returned.background === early.background && returned.sky === early.sky && returned.far.every((v) => v === 1) && returned.fog.every((v, i) => Math.abs(v - early.fog[i]) < 1e-9));
    check(`${name}: reversing nightfall restores the original rim`, returned.rim === early.rim);
    const reunion = await page.evaluate(() => {
      const p=window.probe, idle={x:0,y:0,hop:false,hopHeld:false,act:false}, frames=[];
      p.sim.flags.add('taste');
      let elapsed=0;
      for(const until of [.4,1.6,3.2,11.5]) {
        for(;elapsed<until;elapsed+=1/120)p.sim.step(idle);
        p.draw(.1);frames.push(p.snapshot());
      }
      return {frames,done:p.sim.flags.has('scene:aterfunna')};
    });
    check(`${name}: the actual reunion keeps exactly the four family members visible`, reunion.frames.every(s=>
      s.familyShown===4 && s.family.map(actor=>actor.who).sort().join(',')==='bertil,mamma,moa,pappa'));
    check(`${name}: the family enters from the right before taking its waiting places`,
      reunion.frames[0].scene?.id==='aterfunna' && reunion.frames[0].family.every(actor=>actor.x>40) &&
      reunion.frames[2].family.every(actor=>actor.x<33) && reunion.done);
    check(`${name}: entering and settling the reunion uses already warmed shaders`, reunion.frames.every(s=>s.programs===early.programs));
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await page.close();
  }
  console.log(`nightfall: ${checks} checks passed; captures in docs/shots/_work/nightfall/`);
} finally {
  await browser.close();
  await server.close();
}
