// The cut is painted on its actual world surface; the playable floor keeps its original pixels.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = '\0stone-courses-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'stone-courses-fixture',
    resolveId(id) { if (id === '/stone-courses-fixture.js') return fixture; },
    load(id) {
      if (id !== fixture) return;
      return `export * as THREE from 'three';
        export { stoneCourses } from ${JSON.stringify(join(root, 'src/render/stone-courses.ts'))};
        export { createRimLight } from ${JSON.stringify(join(root, 'src/render/rim-light.ts'))};
        export { createMaterialGrade } from ${JSON.stringify(join(root, 'src/render/grade.ts'))};`;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  const page = await browser.newPage({ viewport: { width: 384, height: 384 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/stone-courses-probe', (route) => route.fulfill({ contentType: 'text/html',
    body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/stone-courses-probe`);
  const result = await page.evaluate(async () => {
    const f = await import('/spokets-godisbus/stone-courses-fixture.js');
    const T = f.THREE;
    const size = 384;
    const renderer = new T.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
    renderer.setSize(size, size, false);
    renderer.toneMapping = T.NeutralToneMapping;
    const gl = renderer.getContext();
    const scene = new T.Scene();
    scene.background = new T.Color('#14202a');
    scene.fog = new T.Fog('#8095a4', 5, 30);
    scene.add(new T.AmbientLight(0xffffff, 1.5));
    const camera = new T.OrthographicCamera(-4, 4, 4, -4, .1, 100);
    const map = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    map.needsUpdate = true;
    const plain = new T.MeshStandardMaterial({ color: '#745943', map, roughness: 1 });
    const stone = plain.clone();
    const geometry = new T.PlaneGeometry(6.6, 3.3);
    const mesh = new T.Mesh(geometry, plain);
    scene.add(mesh);
    // Patch both comparators with the real existing pipeline. Only the stone material gets courses.
    f.stoneCourses(stone);
    const sun = new T.DirectionalLight('#ffe1ae', 2.4); sun.position.set(-7, 5, 4);
    const rim = f.createRimLight(sun);
    const grade = f.createMaterialGrade({ tint: [1.1, 1, .92], exposure: 1.04, contrast: 1.05, saturation: 1.04, vignette: 0, grain: 0 }, scene.fog);
    for (const material of [plain, stone]) { mesh.material = material; rim.apply(mesh); grade.apply(mesh); }
    grade.setEnabled(true);
    const wall = (rotated = false, depth = 1) => {
      mesh.rotation.set(0, 0, 0); mesh.position.set(3.3, 1.65, depth);
      camera.position.set(rotated ? 8 : 3.3, rotated ? 7 : 1.65, 10);
      camera.lookAt(3.3, 1.65, depth); camera.updateMatrixWorld();
    };
    const draw = (material) => {
      mesh.material = material; renderer.render(scene, camera);
      const pixels = new Uint8Array(size * size * 4);
      gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    const difference = (a, b) => {
      let maximum = 0, total = 0;
      for (let i = 0; i < a.length; i++) if (i % 4 !== 3) {
        const d = Math.abs(a[i] - b[i]); maximum = Math.max(maximum, d); total += d;
      }
      return { maximum, total };
    };
    // Read a small footprint at a fixed world location, independent of screen/camera orientation.
    const sample = (pixels, x, y, z = 1) => {
      const p = new T.Vector3(x, y, z).project(camera);
      const px = Math.floor((p.x + 1) * size / 2), py = Math.floor((p.y + 1) * size / 2);
      let total = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const i = ((py + dy) * size + px + dx) * 4;
        total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      return total / 9;
    };
    const courses = (pixels) => ({
      block: sample(pixels, 1, .8), bed: sample(pixels, 1, 1.65),
      lowerJoint: sample(pixels, 3.3, .8), upperBlock: sample(pixels, 3.3, 2.4),
      upperJoint: sample(pixels, 1.65, 2.4), lowerBlock: sample(pixels, 1.65, .8),
    });
    wall();
    const before = draw(plain);
    const plainCalls = renderer.info.render.calls, plainTextures = renderer.info.memory.textures;
    const after = draw(stone);
    const cost = { plainCalls, stoneCalls: renderer.info.render.calls, plainTextures, stoneTextures: renderer.info.memory.textures };
    const front = courses(after);
    wall(true); const rotated = courses(draw(stone));
    // A horizontal top remains untouched even when the view-space normal is steeply tilted.
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(3.3, 4, 1);
    camera.position.set(3.3, 10, 8); camera.lookAt(3.3, 4, 1); camera.updateMatrixWorld();
    const top = difference(draw(plain), draw(stone));
    wall(false, 0); const rear = difference(draw(plain), draw(stone));
    wall(true);
    rim.setStrength(0); const noRim = draw(stone);
    rim.setStrength(1); const fullRim = draw(stone);
    grade.setEnabled(false); const noGrade = draw(stone);
    grade.setEnabled(true); const restored = draw(stone);
    const programs = renderer.info.programs.length, version = stone.version, key = stone.customProgramCacheKey();
    f.stoneCourses(stone); rim.apply(mesh); grade.apply(mesh);
    for (const on of [false, true, false, true]) {
      wall(on); grade.setEnabled(on); rim.setStrength(on ? 1 : 0); draw(stone);
    }
    const stable = { programs: renderer.info.programs.length === programs, version: stone.version === version, key: stone.customProgramCacheKey() === key };
    wall(); grade.setEnabled(true); rim.setStrength(1);
    const brightGrain = sample(draw(stone), 1, .8);
    map.image.data.set([128, 128, 128, 255]); map.needsUpdate = true;
    const darkGrain = sample(draw(stone), 1, .8);
    const sameTexture = renderer.info.memory.textures === plainTextures;
    plain.dispose(); stone.dispose(); geometry.dispose(); map.dispose(); renderer.dispose();
    return { changed: difference(before, after), front, rotated, top, rear, cost, stable,
      rim: difference(noRim, fullRim), grade: difference(fullRim, noGrade), restored: difference(fullRim, restored), brightGrain, darkGrain, sameTexture };
  });
  const laid = (s) => s.block > s.bed + 10 && s.upperBlock > s.lowerJoint + 10 && s.lowerBlock > s.upperJoint + 10;
  check('the actual compiled front gains level beds and staggered upright joints', result.changed.total > 10000 && laid(result.front));
  check('courses stay at the same world positions when the camera turns and tilts', laid(result.rotated));
  check('the horizontal playable top keeps every original pixel', result.top.maximum === 0);
  check('the rear wall behind the path keeps every original pixel', result.rear.maximum === 0);
  check('existing rim light and linear haze/grade compose and restore exactly', result.rim.total > 100 && result.grade.total > 100 && result.restored.maximum === 0);
  check('reapplying and changing camera/daylight/grade compile no further programs', Object.values(result.stable).every(Boolean));
  check('the existing mapped stone grain is reused without another texture or draw', result.brightGrain > result.darkGrain + 10 && result.sameTexture
    && result.cost.plainCalls === result.cost.stoneCalls && result.cost.plainTextures === result.cost.stoneTextures);
  assert.deepEqual(errors, [], 'stone course browser and shader errors');
  console.log(`Stone courses: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
