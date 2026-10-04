// Real WebGL colour/depth checks. node tests/browser/colour-pipeline.mjs
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/colour-pipeline');
mkdirSync(shots, { recursive: true });
const virtual = '\0colour-pipeline-fixture';
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } }, plugins: [{
  name: 'colour-pipeline-fixture', resolveId(id) { if (id === '/colour-pipeline-fixture.js') return virtual; },
  load(id) { if (id !== virtual) return; return `
    export * as THREE from 'three';
    export { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
    export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
    export { createGradePass, createMaterialGrade, GARDEN_MORNING } from ${JSON.stringify(join(root, 'src/render/grade.ts'))};
    export { createDepthBlur } from ${JSON.stringify(join(root, 'src/render/depth-blur.ts'))};
    export { PLACES } from ${JSON.stringify(join(root, 'src/render/dressing.ts'))};
    export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
    export { COURSES } from ${JSON.stringify(join(root, 'src/content/chapters/index.ts'))};
  `; },
}] });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); console.log(`  ok   ${name}`); checks++; };
const errors = [];
async function pageFor(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/colour-probe', (r) => r.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/colour-probe`);
  return page;
}
try {
  const probe = await pageFor(256, 256);
  const numerical = await probe.evaluate(async () => {
    const f = await import('/spokets-godisbus/colour-pipeline-fixture.js');
    const T = f.THREE;
    const canvas = document.getElementById('game');
    const renderer = new T.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(256, 256, false); renderer.toneMapping = T.NeutralToneMapping;
    const gl = renderer.getContext();
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 140); camera.position.z = 10;
    const material = new T.MeshBasicMaterial({ color: new T.Color(0.2, 0.5, 0.8) });
    scene.add(new T.Mesh(new T.PlaneGeometry(12, 12), material));
    const grade = { ...f.PLACES.garden.grade, vignette: 0, grain: 0 };
    const low = f.createMaterialGrade(grade); low.apply(scene);
    const pass = f.createGradePass(grade);
    const hdr = new T.WebGLRenderTarget(256, 256, { type: T.HalfFloatType, depthTexture: new T.DepthTexture(256, 256, T.UnsignedIntType) });
    const graded = new T.WebGLRenderTarget(256, 256, { type: T.HalfFloatType, depthBuffer: false });
    const output = new f.OutputPass(); output.renderToScreen = true;
    const read = () => { const data = new Uint8Array(256 * 256 * 4); gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, data); return data; };
    const draw = (lowTier) => {
      low.setEnabled(lowTier); renderer.setRenderTarget(lowTier ? null : hdr); renderer.render(scene, camera);
      if (!lowTier) { pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false); }
      return read();
    };
    const deltas = [];
    for (const rgb of [[0, 0, 0], [0.018, 0.018, 0.018], [0.18, 0.18, 0.18], [0.2, 0.5, 0.8], [1, 1, 1], [5, 2, 0.1], [32, 8, 3]]) {
      material.color.setRGB(...rgb);
      const a = draw(true), b = draw(false), index = (128 * 256 + 128) * 4;
      deltas.push(Math.max(...[0, 1, 2].map((c) => Math.abs(a[index + c] - b[index + c]))));
    }
    // Rear grid at z=-6, foreground grid at z=0. One half-res bilateral pass may soften only the rear.
    scene.clear();
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4, v = (x + y) % 2 ? 240 : 20;
      pixels.set([v, v, v, 255], i);
    }
    const map = new T.DataTexture(pixels, 64, 64); map.needsUpdate = true;
    const rear = new T.Mesh(new T.PlaneGeometry(16, 16), new T.MeshBasicMaterial({ map })); rear.position.z = -6; scene.add(rear);
    const front = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map })); scene.add(front);
    low.apply(scene);
    const sharp = draw(false);
    const blur = f.createDepthBlur(); blur.setSize(256, 256, true);
    renderer.setRenderTarget(hdr); renderer.render(scene, camera); blur.render(renderer, hdr, camera);
    pass.setDepthBlur(blur.texture, hdr.depthTexture, camera.near, camera.far, camera.position.z);
    pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false);
    const soft = read();
    let frontDelta = 0, backDelta = 0;
    for (let y = 110; y < 146; y++) for (let x = 110; x < 146; x++) frontDelta = Math.max(frontDelta, Math.abs(sharp[(y * 256 + x) * 4] - soft[(y * 256 + x) * 4]));
    for (let y = 20; y < 70; y++) for (let x = 20; x < 70; x++) backDelta += Math.abs(sharp[(y * 256 + x) * 4] - soft[(y * 256 + x) * 4]);
    const half = [blur.texture.image.width, blur.texture.image.height];
    blur.setSize(257, 255, true);
    const oddHalf = [blur.texture.image.width, blur.texture.image.height];
    blur.setSize(257, 255, false);
    return { deltas, frontDelta, backDelta, half, oddHalf, released: blur.texture === null };
  });
  console.log('       numerical', numerical);
  check('Low material grade and HDR LUT agree through one Neutral/sRGB conversion, from black to 32x HDR', numerical.deltas.every((n) => n <= 2));
  check('depth blur keeps the play plane pixel-identical', numerical.frontDelta === 0);
  check('depth blur visibly softens the rear grid', numerical.backDelta > 2000);
  check('High target is half resolution, including odd drawing-buffer sizes', String(numerical.half) === '128,128' && String(numerical.oddHalf) === '129,128');
  check('leaving High releases the half-resolution target', numerical.released);
  await probe.close();
  for (const course of ['garden', 'norrsken']) for (const [width, height] of [[844, 390], [390, 844]]) {
    const page = await pageFor(width, height);
    const state = await page.evaluate(async ({ course }) => {
      const f = await import('/spokets-godisbus/colour-pipeline-fixture.js');
      const chapter = f.COURSES[course];
      const sim = new f.Sim(chapter);
      const view = f.createView(document.getElementById('game'), chapter, 'low', true);
      const frame = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks, gusts: sim.gusts, help: sim.help, berries: sim.berries });
      await view.ready;
      window.test = { view, frame, sim };
      const results = [];
      for (const tier of ['low', 'mid', 'high', 'low', 'high']) {
        view.setTier(tier); for (let i = 0; i < 4; i++) frame();
        const programs = view.info().programs;
        for (let i = 0; i < 3; i++) frame(1 / 60);
        results.push({ ...view.info(), stable: programs === view.info().programs });
      }
      return results;
    }, { course });
    const name = `${course}-${width}x${height}`;
    check(`${name}: all tier switches render within 120 draws`, state.every((s) => s.drawCalls <= 120));
    check(`${name}: no shader compiles after the loading/settings warm-up`, state.every((s) => s.stable));
    await page.screenshot({ path: join(shots, `${name}-high.png`) });
    console.log(`       draws ${state.map((s) => `${s.tier}:${s.drawCalls}`).join(' ')}`);
    await page.close();
  }
  check('no WebGL, shader or page errors', errors.length === 0);
  console.log(`${checks} colour pipeline checks passed.`);
} finally { await browser.close(); await server.close(); }
