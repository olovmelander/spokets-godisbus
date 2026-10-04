// Deterministic real-renderer checks for the finale. Uses the authored chapter and simulation states,
// with stand-ins, and advances only the picture's clock. Run: node tests/browser/nightfall.mjs.
// Iteration captures stay in ignored docs/shots/_work/; these are not checkpoint contact sheets.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

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
        let scene;
        const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) { scene = this; before.apply(this, args); };
        export const renderedScene = () => scene;
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
    await page.route('**/nightfall-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/nightfall-probe`);
    const early = await page.evaluate(async ({ tier }) => {
      const fixture = await import('/spokets-godisbus/nightfall-fixture.js');
      const chapter = { ...fixture.COURSES.norrsken, spawn: { x: 25, y: 0.01 } };
      const sim = new fixture.Sim(chapter, {}, { flags: ['lower', 'eyes', 'bag', 'shared', 'share:tragubbe', 'share:spoket', 'share:jay'] });
      const view = fixture.createView(document.getElementById('game'), chapter, tier, true);
      const draw = (dt = 0) => view.render({
        prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint,
        movers: sim.movers, drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers,
        tussocks: sim.tussocks, gusts: sim.gusts, help: sim.help, berries: sim.berries,
      });
      const until = performance.now() + 15000;
      while (view.info().models.length < 2 && performance.now() < until) await new Promise((r) => setTimeout(r, 25));
      for (let i = 0; i < 4; i++) draw();
      const scene = fixture.renderedScene();
      const far = [];
      scene.traverse((object) => { if (object.name.startsWith('far-dusk-')) far.push(object); });
      const snapshot = () => ({
        ...view.info(), background: scene.backgroundIntensity, far: far.map((card) => card.material.color.r),
        fog: scene.fog.color.toArray(), state: JSON.stringify(sim.curr),
      });
      window.probe = { fixture, sim, view, draw, scene, snapshot };
      return snapshot();
    }, { tier });
    check(`${name}: real finale assets loaded`, early.models.length >= 2);
    check(`${name}: blue-hour sky and five far layers start at full brightness`, early.background === 1 && early.far.length === 5 && early.far.every((v) => v === 1));
    await page.screenshot({ path: join(shots, `${name}-early.png`) });
    const transition = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.add('taste');
      const frames = [];
      let beforePause, paused;
      for (let i = 0; i < 7; i++) {
        p.draw(0.5); frames.push(p.snapshot());
        if (i === 2) { beforePause = p.snapshot(); p.draw(0); paused = p.snapshot(); }
      }
      return { frames, paused, beforePause };
    });
    check(`${name}: sky and hills darken together`, transition.frames.every((s) => s.far.every((v) => Math.abs(v - s.background) < 1e-9)) && transition.frames.at(-1).background < 0.35);
    check(`${name}: night haze changes with the sky`, transition.frames.at(-1).fog.every((v, i) => v < early.fog[i]));
    check(`${name}: no shader compiles or simulation changes during nightfall`, transition.frames.every((s) => s.programs === early.programs && s.state === early.state));
    console.log(`  draws ${name}: ${early.drawCalls} → ${transition.frames.map((s) => s.drawCalls).join(', ')}`);
    // Tasting also reveals the existing family signs. From that first frame on, only uniforms change.
    check(`${name}: nightfall draw calls stay fixed within budget`, transition.frames.every((s) => s.drawCalls === transition.frames[0].drawCalls && s.drawCalls <= 120));
    check(`${name}: pause holds nightfall still`, transition.paused.background === transition.beforePause.background);
    await page.screenshot({ path: join(shots, `${name}-night.png`) });
    const round = await page.evaluate(({ width, height }) => {
      const p = window.probe;
      return p.fixture.measureStars(p.scene.getObjectByName('dusk-stars'), width, height, p.view.info().pixelRatio);
    }, { width, height });
    check(`${name}: stars stay round in framebuffer pixels`, round.length > 50 && round.every((b) => Math.abs(b.width - b.height) <= 1));
    const returned = await page.evaluate(() => {
      const p = window.probe;
      p.sim.flags.delete('taste');
      for (let i = 0; i < 7; i++) p.draw(0.5);
      return p.snapshot();
    });
    check(`${name}: reversing nightfall restores sky, hills and haze without drift`, returned.background === early.background && returned.far.every((v) => v === 1) && returned.fog.every((v, i) => Math.abs(v - early.fog[i]) < 1e-9));
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await page.close();
  }
  console.log(`nightfall: ${checks} checks passed; captures in docs/shots/_work/nightfall/`);
} finally {
  await browser.close();
  await server.close();
}
