// Real WebGL water/bloom checks. node tests/browser/water-light.mjs
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/water-light');
mkdirSync(shots, { recursive: true });
const virtual = '\0water-light-fixture';
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } }, plugins: [{
  name: 'water-light-fixture', resolveId(id) { if (id === '/water-light-fixture.js') return virtual; },
  load(id) { if (id !== virtual) return; return `
    export * as THREE from 'three';
    export { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
    export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
    export { createGradePass, createMaterialGrade, GARDEN_MORNING } from ${JSON.stringify(join(root, 'src/render/grade.ts'))};
    export { createBloom } from ${JSON.stringify(join(root, 'src/render/bloom.ts'))};
    export { createWater } from ${JSON.stringify(join(root, 'src/render/water.ts'))};
    export { createDepthBlur } from ${JSON.stringify(join(root, 'src/render/depth-blur.ts'))};
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
  const probe = await pageFor(192, 192);
  const numerical = await probe.evaluate(async () => {
    const f = await import('/spokets-godisbus/water-light-fixture.js');
    const T = f.THREE;
    const canvas = document.getElementById('game');
    const renderer = new T.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(192, 192, false); renderer.toneMapping = T.NeutralToneMapping;
    const gl = renderer.getContext();
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 140); camera.position.set(0, 3.5, 6); camera.lookAt(0, -0.5, -1);
    scene.add(new T.HemisphereLight(0xffffff, 0x9a7654, 2));
    const floor = new T.Mesh(new T.BoxGeometry(8, 0.4, 8), new T.MeshStandardMaterial({ color: 0x755329 }));
    floor.position.set(0, -1.2, -2); scene.add(floor);
    const pebble = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), new T.MeshStandardMaterial({ color: 0xc6a471 }));
    pebble.position.set(0, -0.65, -1); scene.add(pebble);
    const water = f.createWater({ water: [{ from: -3, to: 3, y: 0 }] }, { colour: '#4f9fc4', opacity: 0.78 });
    water.applyCaustics(scene);
    const waterScene = new T.Scene(); waterScene.add(water.group);
    const hdr = new T.WebGLRenderTarget(192, 192, { type: T.HalfFloatType, depthTexture: new T.DepthTexture(192, 192, T.UnsignedIntType) });
    const graded = new T.WebGLRenderTarget(192, 192, { type: T.HalfFloatType, depthBuffer: false });
    const pass = f.createGradePass({ ...f.GARDEN_MORNING, vignette: 0, grain: 0 });
    const output = new f.OutputPass(); output.renderToScreen = true;
    const read = () => { const data = new Uint8Array(192 * 192 * 4); gl.readPixels(0, 0, 192, 192, gl.RGBA, gl.UNSIGNED_BYTE, data); return data; };
    const draw = (tier, time = 0, surface = true) => {
      water.setSize(192, 192, tier); water.update(time);
      renderer.autoClear = true; renderer.setRenderTarget(hdr); renderer.render(scene, camera);
      if (water.refracting) water.capture(renderer, hdr, camera);
      renderer.setRenderTarget(hdr); renderer.autoClear = false;
      if (surface) renderer.render(waterScene, camera);
      renderer.autoClear = true; pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false);
      return read();
    };
    const difference = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);
    const low = draw('low'), mid = draw('mid'), high = draw('high'), pause = draw('high');
    const changed = draw('high', 1.5);
    const plainFloor = draw('low', 0, false), causticFloor = draw('mid', 0, false);
    const refractionOff = !water.refracting;
    // An HDR light patch blooms into dark neighbouring pixels, not across the whole frame.
    scene.clear(); camera.position.set(0, 0, 8); camera.lookAt(0, 0, 0);
    scene.add(new T.Mesh(new T.PlaneGeometry(0.22, 0.22), new T.MeshBasicMaterial({ color: new T.Color(4, 3, 2) })));
    renderer.setRenderTarget(hdr); renderer.render(scene, camera);
    const bloom = f.createBloom(); bloom.setSize(192, 192, true); bloom.render(renderer, hdr);
    pass.setBloom(bloom.texture); pass.setGlow(0);
    pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false); const dark = read();
    pass.setGlow(0.6); pass.render(renderer, graded, hdr); output.render(renderer, graded, graded, 0, false); const glow = read();
    const near = (96 * 192 + 103) * 4, far = (96 * 192 + 150) * 4;
    const bloomSize = [bloom.texture.image.width, bloom.texture.image.height];
    bloom.setSize(192, 192, false);
    return {
      flow: difference(high, changed), midDetail: difference(low, mid), refract: difference(mid, high),
      paused: difference(high, pause), caustics: difference(plainFloor, causticFloor), refractionOff,
      bloomNear: glow[near] > dark[near], bloomFar: glow[far] === dark[far], bloomSize, bloomOff: bloom.texture === null,
    };
  });
  console.log('       water/light', numerical);
  check('Mid adds visible water detail and world-projected caustics', numerical.midDetail > 1000 && numerical.caustics > 1000);
  check('High refracts the existing scene behind the water', numerical.refract > 1000);
  check('water flows with picture time and freezes exactly when paused', numerical.flow > 1000 && numerical.paused === 0);
  check('High bloom spreads only near HDR highlights at half resolution', numerical.bloomNear && numerical.bloomFar && String(numerical.bloomSize) === '96,96');
  check('unused water and bloom targets are released on lower tiers', numerical.refractionOff && numerical.bloomOff);
  await probe.close();
  for (const course of ['granskog', 'myren']) for (const [width, height] of [[844, 390], [390, 844]]) {
    const page = await pageFor(width, height);
    const result = await page.evaluate(async ({ course }) => {
      const f = await import('/spokets-godisbus/water-light-fixture.js');
      const original = f.COURSES[course];
      const pool = original.water[0];
      const chapter = { ...original, spawn: { x: pool.from - 2, y: pool.y + 0.5 } };
      const sim = new f.Sim(chapter);
      const view = f.createView(document.getElementById('game'), chapter, 'low', true);
      const frame = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks, gusts: sim.gusts, help: sim.help, berries: sim.berries });
      await view.ready;
      const results = [];
      for (const tier of ['low', 'mid', 'high', 'low', 'high']) {
        view.setTier(tier); for (let i = 0; i < 3; i++) frame();
        const programs = view.info().programs;
        for (let i = 0; i < 3; i++) frame(1 / 60);
        results.push({ ...view.info(), stable: programs === view.info().programs });
      }
      return results;
    }, { course });
    const name = `${course}-${width}x${height}`;
    check(`${name}: water and glow stay below 120 draws`, result.every((r) => r.drawCalls <= 120));
    check(`${name}: tier switches warm all water/light shaders before play`, result.every((r) => r.stable));
    await picture(page, join(shots, `${name}-high.png`));
    console.log(`       draws ${result.map((s) => `${s.tier}:${s.drawCalls}`).join(' ')}`);
    await page.close();
  }
  if (errors.length) console.log(errors);
  check('no WebGL feedback, shader or page errors', errors.length === 0);
  console.log(`${checks} water/light checks passed.`);
} finally { await browser.close(); await server.close(); }
