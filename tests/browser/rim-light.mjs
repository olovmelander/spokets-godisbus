// The authored sun must catch the actual camera's silhouette, including Lambert and existing candy hooks.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = '\0rim-light-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'rim-light-fixture',
    resolveId(id) { if (id === '/rim-light-fixture.js') return fixture; },
    load(id) {
      if (id !== fixture) return;
      return `export * as THREE from 'three';
        export { createRimLight } from ${JSON.stringify(join(root, 'src/render/rim-light.ts'))};
        export { createMaterialGrade } from ${JSON.stringify(join(root, 'src/render/grade.ts'))};
        export { candyMaterial } from ${JSON.stringify(join(root, 'src/render/candy.ts'))};`;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/rim-light-probe', (route) => route.fulfill({ contentType: 'text/html',
    body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/rim-light-probe`);
  const result = await page.evaluate(async () => {
    const f = await import('/spokets-godisbus/rim-light-fixture.js');
    const T = f.THREE;
    const renderer = new T.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
    renderer.setSize(256, 256, false);
    renderer.toneMapping = T.NeutralToneMapping;
    const gl = renderer.getContext();
    const camera = new T.PerspectiveCamera(35, 1, .1, 100);
    const sun = new T.DirectionalLight('#ffe1ae', 2.4);
    sun.position.set(-1, .2, -1);
    const scene = new T.Scene();
    // This isolates the added rim: direct sun is deliberately absent from the test scene.
    scene.add(new T.AmbientLight(0xffffff, .3));
    const shape = new T.SphereGeometry(1, 96, 64);
    shape.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(shape.attributes.position.count * 3).fill(1), 3));
    const mesh = new T.Mesh(shape); scene.add(mesh);
    const atCamera = (side) => { camera.position.set(side ? 5 : 0, 0, side ? 0 : 5); camera.lookAt(0, 0, 0); };
    const draw = () => {
      renderer.render(scene, camera);
      const data = new Uint8Array(256 * 256 * 4);
      gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    };
    const difference = (a, b) => {
      let maximum = 0, total = 0, left = 0, right = 0, centre = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(a[i + c] - b[i + c]);
          maximum = Math.max(maximum, d); total += d;
          if (x < 112) left += d;
          if (x > 143) right += d;
          if (Math.abs(x - 128) < 16 && Math.abs(y - 128) < 16) centre = Math.max(centre, d);
        }
      }
      return { maximum, total, left, right, centre };
    };
    const grade = { tint: [1.02, 1, .96], exposure: 1.04, contrast: 1.03, saturation: 1.04, vignette: 0, grain: 0 };
    const cases = [];
    for (const kind of ['standard', 'lambert', 'candy']) {
      const material = kind === 'lambert' ? new T.MeshLambertMaterial({ color: '#6fa67f' })
        : kind === 'candy' ? f.candyMaterial(.3, { color: '#6fa67f', roughness: 1 })
          : new T.MeshStandardMaterial({ color: '#6fa67f', roughness: 1 });
      mesh.material = material;
      atCamera(false);
      const unpatched = draw();
      const rim = f.createRimLight(sun); rim.apply(scene); rim.setStrength(0);
      const zero = draw();
      rim.setStrength(1); const full = draw();
      rim.setStrength(.5); const half = draw();
      rim.setStrength(0); const restored = draw();
      atCamera(true); const rotatedZero = draw();
      rim.setStrength(1); const rotatedFull = draw();
      const programs = renderer.info.programs.length;
      for (const daylight of [.75, .25, 0, 1, 0, 1]) {
        rim.setStrength(daylight); atCamera(daylight > .5); draw();
      }
      const stable = renderer.info.programs.length === programs;
      // The existing colour pipeline wraps the rim and candy patches, just as createView does.
      const materialGrade = f.createMaterialGrade(grade);
      materialGrade.apply(scene); materialGrade.setEnabled(true);
      rim.setStrength(0); const gradedZero = draw();
      rim.setStrength(1); const gradedFull = draw();
      const gradedPrograms = renderer.info.programs.length;
      rim.setStrength(0); const gradedRestored = draw();
      cases.push({ kind, zero: difference(unpatched, zero), full: difference(zero, full), half: difference(zero, half),
        restored: difference(zero, restored), rotated: difference(rotatedZero, rotatedFull), stable,
        graded: difference(gradedZero, gradedFull), gradedRestored: difference(gradedZero, gradedRestored),
        gradedStable: renderer.info.programs.length === gradedPrograms,
        candyKept: kind !== 'candy' || material.customProgramCacheKey().includes('candy-v1') });
      material.dispose();
    }
    const black = new T.MeshStandardMaterial({ color: '#000000', roughness: 1 });
    mesh.material = black; atCamera(false);
    const darkRim = f.createRimLight(sun); darkRim.apply(scene); darkRim.setStrength(0); const dark = draw();
    darkRim.setStrength(1); const darkLit = draw();
    const blackDelta = difference(dark, darkLit);
    black.dispose();
    const transparent = new T.MeshStandardMaterial({ color: '#6fa67f', transparent: true, opacity: .35, depthWrite: false });
    mesh.material = transparent;
    const transparentBefore = draw();
    const noRim = f.createRimLight(sun); noRim.apply(scene); noRim.setStrength(1);
    const transparentAfter = draw();
    const transparentDelta = difference(transparentBefore, transparentAfter);
    transparent.dispose(); shape.dispose(); renderer.dispose();
    return { cases, blackDelta, transparentDelta };
  });
  for (const sample of result.cases) {
    const name = sample.kind;
    check(`${name}: zero strength retains the original pixels and material hook`, sample.zero.maximum === 0 && sample.candyKept);
    check(`${name}: warm light catches the sun-facing edge while the face remains clear`, sample.full.left > 1000 && sample.full.left > sample.full.right * 8 && sample.full.centre <= 1);
    check(`${name}: the actual rotated camera moves the lit edge to the other side`, sample.rotated.right > 1000 && sample.rotated.right > sample.rotated.left * 8);
    check(`${name}: nightfall fades the rim and restores the original pixels exactly`, sample.half.total > 0 && sample.half.total < sample.full.total && sample.restored.maximum === 0);
    check(`${name}: camera and daylight changes compile no playtime programs`, sample.stable);
    check(`${name}: the grade composes with the rim and reverses without drift or recompilation`, sample.graded.total > 1000 && sample.gradedRestored.maximum === 0 && sample.gradedStable);
  }
  check('black eyes and boots never acquire a luminous outline', result.blackDelta.maximum === 0);
  check('transparent helper figures retain their authored pixels', result.transparentDelta.maximum === 0);
  assert.deepEqual(errors, [], 'rim light browser and shader errors');
  console.log(`Rim light: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
