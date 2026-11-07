// The crowns' dappled sunlight on High (src/render/canopy.ts): the floor under them takes flecks of sun and shade,
// and it is off below High. Run after nothing: it serves the sources itself.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const virtual = '\0canopy-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'canopy-fixture',
    resolveId(id) { if (id === '/canopy-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `export * as THREE from 'three';
        export { createCharacterShadows } from ${JSON.stringify(join(root, 'src/render/character-shadows.ts'))};
        export { CANOPY } from ${JSON.stringify(join(root, 'src/render/canopy.ts'))};`;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.route('**/canopy-probe', (route) => route.fulfill({ contentType: 'text/html',
    body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" width="256" height="256"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/canopy-probe`);
  const result = await page.evaluate(async () => {
    const f = await import('/spokets-godisbus/canopy-fixture.js');
    const T = f.THREE;
    const renderer = new T.WebGLRenderer({ canvas: document.getElementById('game'), preserveDrawingBuffer: true });
    renderer.setSize(256, 256, false);
    const scene = new T.Scene();
    const sun = new T.DirectionalLight(0xffffff, 3); sun.position.set(-7, 5, -4);
    scene.add(sun, new T.HemisphereLight(0xffffff, 0x667788, .5));
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x888888, roughness: 1 }));
    scene.add(floor);
    const shadows = f.createCharacterShadows(renderer, scene, sun, { canopy: true });
    shadows.setTier('high'); shadows.prepareReceivers();
    const camera = new T.PerspectiveCamera(50, 1, .1, 150);
    camera.position.set(0, 14, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const gl = renderer.getContext();
    const floorLight = () => {
      shadows.update(0, 0, 14, 0, 0); renderer.render(scene, camera);
      const data = new Uint8Array(160 * 160 * 4); gl.readPixels(48, 48, 160, 160, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const values = []; for (let i = 0; i < data.length; i += 4) values.push((data[i] + data[i + 1] + data[i + 2]) / 3);
      values.sort((a, b) => a - b);
      return { low: values[Math.floor(values.length * 0.1)], high: values[Math.floor(values.length * 0.9)] };
    };
    const dappled = floorLight();
    // The ground's shader finds each layer's leaves where the shadow map has them: a point of each layer, put in
    // the world by the layer's own matrix, comes back to the same place on the sheet.
    const canopy = scene.getObjectByName('canopy');
    const layer = new T.Matrix4(), at = new T.Vector3();
    let worst = 0, heights = 0;
    for (let n = 0; n < canopy.count; n++) {
      canopy.getMatrixAt(n, layer);
      for (const [x, y] of [[1.3, -2.7], [-6.2, 4.4], [0, 0]]) {
        at.set(x, y, 0).applyMatrix4(layer);
        const sheet = new T.Vector3(at.x, at.z, 1).applyMatrix3(f.CANOPY.layers.value[n]);
        // The plane's own sheet coordinates are its local x and y, plus whole tiles.
        for (const off of [sheet.x - x, sheet.y - y]) worst = Math.max(worst, Math.abs(off - Math.round(off)));
      }
      heights = Math.max(heights, Math.abs(f.CANOPY.high.value[n] - new T.Vector3().setFromMatrixPosition(layer).y));
    }
    const ground = { on: f.CANOPY.on.value, sheet: f.CANOPY.sheet.value === canopy.material.map, worst, heights };
    shadows.setTier('mid');
    const plain = floorLight();
    return { dappled, plain, info: shadows.info(), ground };
  });
  console.log(JSON.stringify(result));
  check('on High the crowns dapple the floor: deep shade and bright sun side by side', result.dappled.high - result.dappled.low > 25);
  check('below High the floor is evenly lit', result.plain.high - result.plain.low < 10);
  check('the ground paints its flecks from the crowns\' own sheet', result.ground.sheet);
  check('the ground finds each layer\'s leaves where the shadow map has them', result.ground.worst < 1e-3 && result.ground.heights < 1e-3);
  check('no page errors', errors.length === 0);
  console.log(`${checks} canopy browser checks passed.`);
} finally {
  await browser.close();
  await server.close();
}
