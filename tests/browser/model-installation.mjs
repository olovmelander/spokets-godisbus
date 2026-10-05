// Repeated family models must receive each view's grade and shadow setup, including arrivals while paused.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const assetsId = '\0model-installation-assets';
const fixtureId = '\0model-installation-fixture';
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{
    name: 'model-installation-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (id === './assets' && importer?.endsWith('/src/render/view.ts')) return assetsId;
      if (id === '/model-installation-assets.js') return assetsId;
      if (id === '/model-installation-fixture.js') return fixtureId;
    },
    load(id) {
      if (id === assetsId) return `import { Group, Mesh, BoxGeometry, MeshLambertMaterial } from 'three';
        const pending = []; let installed = 0;
        const model = (name) => { const group = new Group();
          const mesh = new Mesh(new BoxGeometry(.4,1,.4), new MeshLambertMaterial());
          mesh.name = name; group.add(mesh); return group; };
        export const waiting = () => pending.length;
        export const release = () => pending.shift()?.(model('installed-mamma-' + (++installed)));
        export function createAssets() { return {
          manifest: async () => ({ packs: { boot: { files: {} }, private: { files: { 'mamma.glb': 1 } } } }),
          model: async (pack) => pack === 'private' ? new Promise((resolve) => pending.push(resolve)) : model('candy'),
          restoreTextures: async () => {}, textureInfo: () => ({}),
        }; }
      `;
      if (id === fixtureId) return `import { Scene } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { myren } from ${JSON.stringify(join(root, 'src/content/chapters/myren.ts'))};
        export { waiting, release } from '/model-installation-assets.js';
        let scene; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function(...args) {
          if (this.getObjectByName('chase-ghost')) scene = this;
          before.apply(this,args);
        };
        export const installedModels = () => {
          const models = []; scene.traverse((node) => {
            if (!node.name.startsWith('installed-mamma-')) return;
            models.push({ name: node.name, graded: node.material.customProgramCacheKey().includes('place-grade-v1'),
              receiveShadow: node.receiveShadow, x: node.parent.parent.position.x });
          }); return models;
        };
      `;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  for (const tier of ['low', 'mid', 'high']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/model-installation-probe', (route) => route.fulfill({ contentType: 'text/html',
      body: '<body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/model-installation-probe`);
    await page.evaluate(async (tier) => {
      const fixture = await import('/spokets-godisbus/model-installation-fixture.js');
      const sim = new fixture.Sim(fixture.myren);
      const view = fixture.createView(document.getElementById('game'), fixture.myren, tier, false);
      await view.ready;
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false,
        collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips,
        flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries });
      draw(); draw();
      window.installationProbe = { fixture, sim, view, draw,
        state: () => ({ models: fixture.installedModels(), info: view.info(), player: { ...sim.curr }, flags: [...sim.flags] }) };
    }, tier);
    for (const i of [1, 2, 3]) {
      await page.waitForFunction(() => window.installationProbe.fixture.waiting() === 1);
      const result = await page.evaluate(async (i) => {
        const p = window.installationProbe, before = p.state();
        p.fixture.release();
        // Loading callbacks run between frames; the simulation and render clock stay paused.
        await new Promise((resolve) => setTimeout(resolve, 0));
        p.draw(); p.draw();
        const loaded = p.state();
        for (let j = 0; j < 8; j++) p.draw();
        const paused = p.state();
        return { before, loaded, paused, current: loaded.models.find((model) => model.name === `installed-mamma-${i}`) };
      }, i);
      check(`${tier}: delayed Mamma ${i} receives the place grade and shadow receiver setup`, result.current?.graded && result.current.receiveShadow);
      check(`${tier}: Mamma ${i} arrival keeps simulation state and the asset display unchanged`,
        JSON.stringify(result.loaded.player) === JSON.stringify(result.before.player) &&
        JSON.stringify(result.loaded.flags) === JSON.stringify(result.before.flags) &&
        result.loaded.info.models.filter((model) => model === 'private/mamma').length === 1);
      check(`${tier}: Mamma ${i} stays warmed during pause redraws`, result.paused.info.programs === result.loaded.info.programs &&
        result.paused.info.geometries === result.loaded.info.geometries && result.paused.info.textures === result.loaded.info.textures &&
        withinDraws(result.paused.info.drawCalls, result.paused.info.tier));
      if (i === 3) check(`${tier}: the third installation belongs to the cooperative bog bridge`, Math.abs(result.current.x - 169.2) < .01);
    }
    assert.deepEqual(errors, [], `${tier}: browser or shader errors`);
    await page.close();
  }
  console.log(`Model installation: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
