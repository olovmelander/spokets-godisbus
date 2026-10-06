// Actual shadow-map coverage, off-screen trunks, and forest tier/re-stocking warmup.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const virtual = '\0forest-shadow-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'forest-shadow-fixture',
    resolveId(id) { if (id === '/forest-shadow-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `export * as THREE from 'three';
        import { Scene } from 'three';
        export { createCharacterShadows } from ${JSON.stringify(join(root, 'src/render/character-shadows.ts'))};
        export { KIT, makeKit } from ${JSON.stringify(join(root, 'src/render/dressing/kit.ts'))};
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { granskog } from ${JSON.stringify(join(root, 'src/content/chapters/granskog.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        let scene;
        const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) {
          if (this.getObjectByName('elof')) scene = this;
          before.apply(this, args);
        };
        export const renderedScene = () => scene;
      `;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`  ok   ${name}`); };
const errors = [];
async function pageFor(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/forest-shadow-probe', (route) => route.fulfill({ contentType: 'text/html',
    body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/forest-shadow-probe`);
  return page;
}

try {
  const page = await pageFor(256, 256);
  const coverage = await page.evaluate(async () => {
    const f = await import('/spokets-godisbus/forest-shadow-fixture.js');
    const T = f.THREE;
    f.makeKit();
    const renderer = new T.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
    renderer.setSize(256, 256, false);
    const scene = new T.Scene();
    const sun = new T.DirectionalLight(0xffffff, 3); sun.position.set(-7, 5, -4);
    scene.add(sun, new T.HemisphereLight(0xffffff, 0x667788, .7));
    const floor = new T.Mesh(new T.PlaneGeometry(16, 18).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x888888, roughness: 1 }));
    scene.add(floor);
    // A real 60-EL trunk can stand entirely out of view and still cast across the path.
    // At z=-22 the ray to (0,0,0) crosses the trunk 52.18 EL towards the sun; to z=5 it is 64.04 EL.
    const trunks = new T.InstancedMesh(f.KIT.trunk, f.KIT.bark, 1);
    trunks.userData.casts = true;
    scene.add(trunks);
    const shadows = f.createCharacterShadows(renderer, scene, sun);
    shadows.setTier('high'); shadows.prepareReceivers();
    const camera = new T.PerspectiveCamera(35, 1, .1, 150);
    const gl = renderer.getContext();
    const pixel = (point) => {
      const at = point.clone().project(camera), x = Math.round((at.x + 1) * 128), y = Math.round((at.y + 1) * 128);
      const data = new Uint8Array(5 * 5 * 4); gl.readPixels(x - 2, y - 2, 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let total = 0; for (let i = 0; i < data.length; i += 4) total += (data[i] + data[i + 1] + data[i + 2]) / 3;
      return total / 25;
    };
    const samples = [];
    for (const z of [0, 5]) {
      const target = new T.Vector3(0, 0, z), clear = new T.Vector3(4, 0, z);
      trunks.setMatrixAt(0, new T.Matrix4().makeTranslation(-1.75 * (22 + z), 0, -22));
      trunks.instanceMatrix.needsUpdate = true; trunks.computeBoundingSphere();
      camera.position.set(0, 9, z + 12); camera.lookAt(target); camera.updateMatrixWorld();
      const draw = (cast, focus = 0) => {
        trunks.castShadow = cast; shadows.update(focus, 0, 10); renderer.render(scene, camera);
        return [pixel(target), pixel(clear)];
      };
      const lit = draw(false), shaded = draw(true), shifted = draw(true, .25);
      samples.push({ z, lit, shaded, shifted });
    }
    shadows.setTier('mid'); renderer.render(scene, camera);
    const released = shadows.info().mapSize === 0 && !renderer.shadowMap.enabled;
    shadows.setTier('high'); shadows.prepareReceivers(); shadows.update(0, 0, 10); renderer.render(scene, camera);
    const restored = shadows.info().mapSize === 1024 && trunks.castShadow;
    return { samples, released, restored };
  });
  for (const { z, lit, shaded, shifted } of coverage.samples) {
    check(`off-screen trunk reaches receiver z=${z} beyond the old light near plane`, lit[0] - shaded[0] > 8);
    check(`receiver z=${z} has a local band, with nearby sunlit floor retained`, Math.abs(lit[1] - shaded[1]) < 3);
    check(`receiver z=${z} keeps its band when the camera focus moves`, Math.abs(shifted[0] - shaded[0]) < 3);
  }
  check('leaving High releases the map and returning restores the explicit caster', coverage.released && coverage.restored);
  await page.close();

  for (const [width, height, x, y] of [[844, 390, 63, 10.01], [390, 844, 80, -2.34]]) {
    const page = await pageFor(width, height);
    const results = await page.evaluate(async ({ x, y }) => {
      const f = await import('/spokets-godisbus/forest-shadow-fixture.js');
      const chapter = { ...f.granskog, spawn: { x, y } };
      const sim = new f.Sim(chapter);
      const view = f.createView(document.getElementById('game'), chapter, 'low', true);
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false,
        collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips, flags: sim.flags,
        ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks, gusts: sim.gusts, help: sim.help, berries: sim.berries });
      await view.ready;
      for (let i = 0; i < 4; i++) draw();
      const scene = f.renderedScene(), states = [];
      for (const tier of ['low', 'mid', 'high', 'mid', 'high', 'low']) {
        view.setTier(tier); for (let i = 0; i < 4; i++) draw();
        const programs = view.info().programs;
        for (let i = 0; i < 3; i++) draw(1 / 60);
        let trunks = 0, banks = 0, changed = 0, matching = true, unmarkedCaster = false;
        scene.traverse((object) => {
          if (object.userData.casts === true && object.castShadow) trunks += object.count ?? 1;
          if (object.isMesh && object.castShadow && !object.userData.casts && object.name !== 'character-shadow-casters') unmarkedCaster = true;
          const bake = object.userData.shadowBake;
          if (!bake) return;
          banks++;
          const colours = object.geometry.getAttribute('color').array;
          const expected = tier === 'high' ? bake.original : bake.shaded;
          matching &&= bake.active === (tier !== 'high') && colours.every((value, i) => value === expected[i]);
          changed += bake.shaded.reduce((count, value, i) => count + (value < bake.original[i] - .0001 ? 1 : 0), 0);
        });
        states.push({ ...view.info(), stable: programs === view.info().programs, trunks, banks, changed, matching, unmarkedCaster });
      }
      return states;
    }, { x, y });
    const name = `forest ${width}×${height} at x=${x}`;
    check(`${name}: restocked kit retains explicit trunk casters only`, results.every((state) => state.models.includes('boot/forest-kit') && state.trunks > 0 && !state.unmarkedCaster));
    check(`${name}: Low/Mid bank shade and unbaked High restore exactly across repeated switches`, results.every((state) => state.banks > 0 && state.changed > 0 && state.matching));
    check(`${name}: only High retains the fixed shadow map`, results.every((state) => state.shadows.mapSize === (state.tier === 'high' ? 1024 : 0)));
    check(`${name}: all frames stay within tier draw budgets`, results.every((state) => withinDraws(state.drawCalls, state.tier)));
    check(`${name}: no play-time shaders compile after settings warmup`, results.every((state) => state.stable));
    console.log(`       draws ${results.map((state) => `${state.tier}:${state.drawCalls}`).join(' ')}`);
    await page.close();
  }
  check('no WebGL, shader or page errors', errors.length === 0);
  console.log(`${checks} forest-shadow browser checks passed.`);
} finally {
  await browser.close();
  await server.close();
}
