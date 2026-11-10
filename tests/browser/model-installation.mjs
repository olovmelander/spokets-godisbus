// Delayed family models must receive each view's grade and shadow setup, including arrivals while paused.
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
        const pending = []; let installed = 0, privateFiles = ['mamma'];
        const model = (name) => { const group = new Group();
          const mesh = new Mesh(new BoxGeometry(.4,1,.4), new MeshLambertMaterial());
          mesh.name = name; group.add(mesh); return group; };
        export const waiting = () => pending.length;
        export const privateModels = (names) => { privateFiles = names; };
        export const release = () => { const next = pending.shift();
          next?.resolve(model('installed-' + next.name + '-' + (++installed))); };
        export const fail = () => pending.shift()?.reject(new Error('deliberately unavailable actor'));
        export function createAssets() { return {
          manifest: async () => ({ packs: { boot: { files: {} }, private: { files: Object.fromEntries(privateFiles.map(name => [name + '.glb', 1])) } } }),
          model: async (pack, name) => pack === 'private' ? new Promise((resolve, reject) => pending.push({ name, resolve, reject })) : model('candy'),
          restoreTextures: async () => {}, textureInfo: () => ({}),
        }; }
      `;
      if (id === fixtureId) return `import { Scene, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { myren } from ${JSON.stringify(join(root, 'src/content/chapters/myren.ts'))};
        export { prolog } from ${JSON.stringify(join(root, 'src/content/chapters/ends.ts'))};
        export { garden } from ${JSON.stringify(join(root, 'src/content/chapters/garden.ts'))};
        export { waiting, release, fail, privateModels } from '/model-installation-assets.js';
        let scene; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function(...args) {
          if (this.getObjectByName('chase-ghost')) scene = this;
          before.apply(this,args);
        };
        export const installedModels = () => {
          const models = []; scene.traverse((node) => {
            if (!node.name.startsWith('installed-')) return;
            models.push({ name: node.name, graded: node.material.customProgramCacheKey().includes('place-grade-v2'),
              rim: node.material.customProgramCacheKey().includes('place-rim-v1'),
              receiveShadow: node.receiveShadow, x: node.getWorldPosition(new Vector3()).x });
          }); return models;
        };
        export const watchRehearsals = () => {
          const disposed = { instances: 0, materials: 0, geometry: 0 };
          scene.traverse(node => {
            if (!node.name.startsWith('family-rehearsal-body:')) return;
            node.addEventListener('dispose', () => disposed.instances++);
            node.material.addEventListener('dispose', () => disposed.materials++);
            node.geometry.addEventListener('dispose', () => disposed.geometry++);
          }); return () => ({ ...disposed });
        };
        export const watchBodies = () => {
          const resources = new Set(), disposed = new Set();
          for (const root of [scene.getObjectByName('elof'), scene.getObjectByName('chase-ghost').children[0],
            scene.getObjectByName('helper-actor').children[0]]) root.traverse(node => {
              if (!node.isMesh) return;
              resources.add(node.geometry); resources.add(node.material);
            });
          for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
          return () => ({ total: resources.size, disposed: disposed.size });
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
      const disposed = fixture.watchRehearsals();
      window.installationProbe = { fixture, sim, view, draw,
        state: () => ({ models: fixture.installedModels(), waiting: fixture.waiting(), info: view.info(), player: { ...sim.curr }, flags: [...sim.flags], disposed: disposed() }) };
    }, tier);
    {
      await page.waitForFunction(() => window.installationProbe.fixture.waiting() === 1);
      const result = await page.evaluate(async () => {
        const p = window.installationProbe, before = p.state();
        p.fixture.release();
        // Loading callbacks run between frames; the simulation and render clock stay paused.
        await new Promise((resolve) => setTimeout(resolve, 0));
        p.draw(); p.draw();
        const loaded = p.state();
        for (let j = 0; j < 8; j++) p.draw();
        const paused = p.state();
        return { before, loaded, paused, current: loaded.models.find((model) => model.name === 'installed-mamma-1') };
      });
      check(`${tier}: delayed Mamma receives the place grade, rim and shadow receiver setup`, result.current?.graded && result.current.rim && result.current.receiveShadow);
      check(`${tier}: Mamma arrival keeps simulation state and the asset display unchanged`,
        JSON.stringify(result.loaded.player) === JSON.stringify(result.before.player) &&
        JSON.stringify(result.loaded.flags) === JSON.stringify(result.before.flags) &&
        result.loaded.info.models.filter((model) => model === 'private/mamma').length === 1);
      check(`${tier}: Mamma stays warmed during pause redraws`, result.paused.info.programs === result.loaded.info.programs &&
        result.paused.info.geometries === result.loaded.info.geometries && result.paused.info.textures === result.loaded.info.textures &&
        withinDraws(result.paused.info.drawCalls, result.paused.info.tier));
      check(`${tier}: replaced Mamma releases instance buffers and material while retaining the shared box`,
        result.loaded.disposed.instances === 1 && result.loaded.disposed.materials === 1 && result.loaded.disposed.geometry === 0);
      check(`${tier}: one continuous Mamma starts by the pine, without duplicate actors queued at later calls`,
        result.loaded.models.length === 1 && result.paused.waiting === 0 && Math.abs(result.current.x - 85.2) < .01);
    }
    assert.deepEqual(errors, [], `${tier}: browser or shader errors`);
    await page.close();
  }
  for (const chapter of ['myren', 'prolog', 'garden']) {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/model-installation-probe', route => route.fulfill({ contentType: 'text/html',
      body: '<body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/model-installation-probe`);
    await page.evaluate(async chapter => {
      const fixture = await import('/spokets-godisbus/model-installation-fixture.js');
      fixture.privateModels(chapter === 'garden' ? ['elof', 'ghost'] : chapter === 'myren' ? ['mamma'] : ['mamma', 'moa']);
      const data = fixture[chapter], sim = new fixture.Sim(data);
      const view = fixture.createView(document.getElementById('game'), data, 'low', false);
      await view.ready;
      const draw = () => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt: 0, atGoal: false,
        collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips,
        flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries });
      draw(); draw();
      window.installationProbe = { fixture, view, draw, disposed: chapter === 'garden' ? fixture.watchBodies() : fixture.watchRehearsals() };
    }, chapter);
    if (chapter === 'garden') {
      await page.waitForFunction(() => window.installationProbe.fixture.waiting() === 2);
      const result = await page.evaluate(async () => {
        const p = window.installationProbe, before = p.view.info();
        p.fixture.release(); p.fixture.release();
        await new Promise(resolve => setTimeout(resolve, 0));
        p.draw(); p.draw();
        return { before, after: p.view.info(), disposed: p.disposed(), models: p.fixture.installedModels() };
      });
      check('garden: Elof and both ghost stand-ins release all their owned fallback resources',
        result.disposed.total > 30 && result.disposed.disposed === result.disposed.total);
      check('garden: replacing warmed bodies releases GPU geometries without losing the installed actors',
        result.after.geometries < result.before.geometries - 10 && result.models.length === 3 &&
        result.models.every(model => model.graded && model.rim && model.receiveShadow));
      assert.deepEqual(errors, [], 'garden: browser errors after fallback disposal');
      await page.close();
      continue;
    }
    await page.waitForFunction(() => window.installationProbe.fixture.waiting() === 1);
    await page.evaluate(async () => {
      window.installationProbe.fixture.fail();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    if (chapter === 'myren') {
      const result = await page.evaluate(() => {
        const p = window.installationProbe, before = p.view.info();
        for (let i = 0; i < 8; i++) p.draw();
        return { before, after: p.view.info(), models: p.fixture.installedModels(), waiting: p.fixture.waiting(), disposed: p.disposed() };
      });
      check('myren: an unavailable Mamma leaves the single rehearsal helper intact without duplicate loads',
        result.waiting === 0 && result.models.length === 0 &&
        result.disposed.instances === 0 && result.disposed.materials === 0 && result.disposed.geometry === 0);
      check('myren: the retained helper stays warmed and drawable after its optional model fails',
        result.after.programs === result.before.programs && result.after.geometries === result.before.geometries &&
        result.after.textures === result.before.textures && withinDraws(result.after.drawCalls, result.after.tier));
      assert.deepEqual(errors, [], 'myren: browser errors after optional actor failure');
      await page.close();
      continue;
    }
    check(`${chapter}: one unavailable family model does not block the next actor`,
      await page.evaluate(() => window.installationProbe.fixture.waiting() === 1));
    const result = await page.evaluate(async () => {
      const p = window.installationProbe;
      p.fixture.release();
      await new Promise(resolve => setTimeout(resolve, 0));
      p.draw(); p.draw();
      return { models: p.fixture.installedModels(), info: p.view.info(), disposed: p.disposed() };
    });
    check(`${chapter}: the healthy actor arriving after a failure still receives the warmed rendering setup`,
      result.models.length === 1 && result.models[0].graded && result.models[0].rim && result.models[0].receiveShadow &&
      result.info.models.filter(model => model.startsWith('private/')).length === 1);
    check(`${chapter}: only the successful replacement releases its rehearsal actor`,
      result.disposed.instances === 1 && result.disposed.materials === 1 && result.disposed.geometry === 0);
    assert.deepEqual(errors, [], `${chapter}: browser errors after optional actor failure`);
    await page.close();
  }
  console.log(`Model installation: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
