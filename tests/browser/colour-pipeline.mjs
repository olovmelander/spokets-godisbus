// Real WebGL colour/depth checks. node tests/browser/colour-pipeline.mjs
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';
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
    export { createSky } from ${JSON.stringify(join(root, 'src/render/dressing/sky.ts'))};
    export { PLACES } from ${JSON.stringify(join(root, 'src/render/dressing/index.ts'))};
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
    pass.setDepthBlur(null, null, camera.near, camera.far, camera.position.z);

    // An independent colour oracle catches two equally wrong pipelines agreeing with each other.
    // Fog is mixed in linear light, then the authored grade, Neutral, and one sRGB conversion follow.
    const display = (rgb) => {
      let colour = rgb.map((v, i) => v * grade.exposure * grade.tint[i]);
      const light = colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722;
      colour = colour.map((v) => Math.max(0, (light + (v - light) * grade.saturation - 0.18) * grade.contrast + 0.18));
      const darkest = Math.min(...colour);
      const offset = darkest < 0.08 ? darkest - 6.25 * darkest * darkest : 0.04;
      colour = colour.map((v) => v - offset);
      const peak = Math.max(...colour);
      if (peak >= 0.76) {
        const compressed = 1 - 0.24 * 0.24 / (peak + 0.24 - 0.76);
        const desaturate = 1 - 1 / (0.15 * (peak - compressed) + 1);
        colour = colour.map((v) => v * compressed / peak * (1 - desaturate) + compressed * desaturate);
      }
      return colour.map((v) => Math.round(Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : Math.pow(v, 0.41666) * 1.055 - 0.055)) * 255));
    };
    const difference = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const centre = () => Array.from(read().slice((128 * 256 + 128) * 4, (128 * 256 + 128) * 4 + 3));
    const fog = new T.Fog('#cfe2ea', 5, 15);
    const fogScene = new T.Scene(); fogScene.fog = fog;
    const pigment = [0.018, 0.032, 0.008];
    const hazedMaterial = new T.MeshBasicMaterial({ color: new T.Color(...pigment) });
    const clearMaterial = new T.MeshBasicMaterial({ color: new T.Color(...pigment), fog: false });
    const patch = new T.Mesh(new T.PlaneGeometry(12, 12), hazedMaterial); fogScene.add(patch);
    const fogGrade = f.createMaterialGrade(grade, fog); fogGrade.apply(fogScene);
    patch.material = clearMaterial; fogGrade.apply(fogScene);
    const drawScene = (targetScene, transform, lowTier) => {
      transform.setEnabled(lowTier);
      renderer.setRenderTarget(lowTier ? null : hdr); renderer.render(targetScene, camera);
      if (!lowTier) { pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false); }
      return centre();
    };
    // Warm both material fog settings and both output paths before checking uniform-only changes.
    for (const one of [clearMaterial, hazedMaterial]) {
      patch.material = one;
      for (const lowTier of [true, false]) drawScene(fogScene, fogGrade, lowTier);
    }
    const fogPrograms = renderer.info.programs.length;
    const fogSamples = [];
    for (const [near, far, colour] of [[5, 15, '#cfe2ea'], [9, 13, '#37224a'], [10, 20, '#ccb879'], [0, 5, '#496486']]) {
      fog.near = near; fog.far = far; fog.color.set(colour);
      const t = Math.min(1, Math.max(0, (10 - near) / (far - near)));
      const weight = t * t * (3 - 2 * t);
      const reference = display(pigment.map((v, i) => v * (1 - weight) + fog.color.toArray()[i] * weight));
      const lowPixel = drawScene(fogScene, fogGrade, true), hdrPixel = drawScene(fogScene, fogGrade, false);
      fogSamples.push({ lowPixel, hdrPixel, reference, parity: difference(lowPixel, hdrPixel), expected: Math.max(difference(lowPixel, reference), difference(hdrPixel, reference)) });
    }
    patch.material = clearMaterial;
    const clearExpected = display(pigment);
    const clearSamples = [true, false].map((lowTier) => drawScene(fogScene, fogGrade, lowTier));
    const fogStable = renderer.info.programs.length === fogPrograms;

    // The old native background bypassed Low's grade. Use a coloured sRGB texture, thick scene fog,
    // and the real sky helper so this also holds its fog exclusion and reversible nightfall dimming.
    const skyMap = new T.DataTexture(new Uint8Array([180, 160, 220, 255]), 1, 1);
    skyMap.colorSpace = T.SRGBColorSpace; skyMap.needsUpdate = true;
    const sky = f.createSky(skyMap, new T.Color('white'));
    const skyScene = new T.Scene(); skyScene.fog = fog; skyScene.add(sky);
    const skyGrade = f.createMaterialGrade(grade, fog); skyGrade.apply(skyScene);
    for (const lowTier of [true, false]) drawScene(skyScene, skyGrade, lowTier);
    const skyPrograms = renderer.info.programs.length;
    const skyLinear = new T.Color().setRGB(180 / 255, 160 / 255, 220 / 255, T.SRGBColorSpace).toArray();
    const skySamples = [];
    for (const brightness of [1, 0.23, 1]) {
      sky.material.color.setScalar(brightness);
      const reference = display(skyLinear.map((v) => v * brightness));
      const lowPixel = drawScene(skyScene, skyGrade, true), hdrPixel = drawScene(skyScene, skyGrade, false);
      skySamples.push({ lowPixel, hdrPixel, reference, parity: difference(lowPixel, hdrPixel), expected: Math.max(difference(lowPixel, reference), difference(hdrPixel, reference)) });
    }
    const skyStable = renderer.info.programs.length === skyPrograms;
    return {
      deltas, frontDelta, backDelta, half, oddHalf, released: blur.texture === null,
      fogSamples, clearSamples, clearExpected, fogStable, skySamples, skyStable,
    };
  });
  console.log('       numerical', numerical);
  check('Low material grade and HDR LUT agree through one Neutral/sRGB conversion, from black to 32x HDR', numerical.deltas.every((n) => n <= 2));
  check('depth blur keeps the play plane pixel-identical', numerical.frontDelta === 0);
  check('depth blur visibly softens the rear grid', numerical.backDelta > 2000);
  check('High target is half resolution, including odd drawing-buffer sizes', String(numerical.half) === '128,128' && String(numerical.oddHalf) === '129,128');
  check('leaving High releases the half-resolution target', numerical.released);
  check('fog mixes in linear light before grade/output on Low and HDR, including dynamic range and colour', numerical.fogSamples.every((s) => s.parity <= 2 && s.expected <= 2));
  check('materials with fog:false retain their authored colour in fully hazed scenes', numerical.clearSamples.every((s) => s.every((v, i) => Math.abs(v - numerical.clearExpected[i]) <= 2)));
  check('fog range/colour changes and repeated Low/HDR switches compile no new programs after warm-up', numerical.fogStable);
  check('textured sky is graded exactly once on Low/HDR and remains outside scene fog', numerical.skySamples.every((s) => s.parity <= 2 && s.expected <= 2));
  check('nightfall dims and restores the sky without colour drift', numerical.skySamples[1].lowPixel.every((v, i) => v < numerical.skySamples[0].lowPixel[i]) && String(numerical.skySamples[0].lowPixel) === String(numerical.skySamples[2].lowPixel) && String(numerical.skySamples[0].hdrPixel) === String(numerical.skySamples[2].hdrPixel));
  check('sky brightness changes compile no new programs after warm-up', numerical.skyStable);
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
    check(`${name}: all tier switches render within the draw budget`, state.every((s) => withinDraws(s.drawCalls, s.tier)));
    check(`${name}: no shader compiles after the loading/settings warm-up`, state.every((s) => s.stable));
    await picture(page, join(shots, `${name}-high.png`));
    console.log(`       draws ${state.map((s) => `${s.tier}:${s.drawCalls}`).join(' ')}`);
    await page.close();
  }
  check('no WebGL, shader or page errors', errors.length === 0);
  console.log(`${checks} colour pipeline checks passed.`);
} finally { await browser.close(); await server.close(); }
