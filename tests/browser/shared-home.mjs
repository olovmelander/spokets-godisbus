// Real public GLB exports, used in both adventures without fetching Stormnatten's story module.
// Run after npm run assets. SHARED_HOME_PRIVATE=1 additionally checks existing private exports locally.
// SHARED_HOME_PRIVATE_ONLY=1 limits a local rerun to that private epilogue case.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { withinDraws } from './budget.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifestPath = join(root, 'public/packs/manifest.json');
assert.ok(existsSync(manifestPath), 'Run npm run assets before shared-home.');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.ok(manifest.packs.aventyr2?.files['room.glb'], 'The public room export is required.');
const checkPrivate = process.env.SHARED_HOME_PRIVATE || process.env.SHARED_HOME_PRIVATE_ONLY;
if (checkPrivate) assert.ok(manifest.packs.private?.files['tragubbar.glb'], 'The optional private check needs the existing carving export.');
const fixtureId = '\0shared-home-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, watch: null, hmr: false, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'shared-home-fixture',
    resolveId(id) { if (id === '/shared-home-fixture.js') return fixtureId; },
    load(id) {
      if (id !== fixtureId) return;
      return `import { Box3, Scene, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { prolog, epilog } from ${JSON.stringify(join(root, 'src/content/chapters/ends.ts'))};
        let scene;
        const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) {
          if (this.getObjectByName('chase-ghost')) scene = this;
          before.apply(this, args);
        };
        export function snapshot() {
          const furniture = [];
          scene.traverse(node => {
            if (!node.name.startsWith('furniture:')) return;
            const name = node.userData.model, made = node.getObjectByName(name);
            const box = new Box3().setFromObject(node);
            furniture.push({ name, present: !!made, uuid: made?.uuid, size: box.getSize(new Vector3()).toArray(),
              bottom: box.min.y, floor: node.position.y });
          });
          const room = scene.getObjectByName('family-room');
          const pieces = room?.children.filter(node => typeof node.userData.model === 'string').map(node => ({
            name: node.userData.model, present: !!node.getObjectByName(node.userData.model) }));
          const figure = scene.getObjectByName('epilogue-lillgubbe');
          const carving = figure?.getObjectByName('lillgubbe');
          return { furniture, pieces, figure: figure ? { visible: figure.visible, installed: !!carving,
            children: figure.children.length } : null };
        }
        export function carvingGeometry() {
          const result = [];
          scene.getObjectByName('epilogue-lillgubbe')?.getObjectByName('lillgubbe')?.traverse(node => {
            if (!node.isMesh) return;
            const position = node.geometry.getAttribute('position'), colour = node.geometry.getAttribute('color');
            result.push({ uuid: node.uuid, points: Array.from({ length: position.count }, (_, i) =>
              [position.getX(i), position.getY(i), position.getZ(i), colour ? Math.max(colour.getX(i), colour.getY(i), colour.getZ(i)) : 1]) });
          });
          return result;
        }`;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };
try {
  const cases = process.env.SHARED_HOME_PRIVATE_ONLY ? [] : ['low', 'high'].flatMap(tier => [{ chapter: 'prolog', tier, standIns: true }, { chapter: 'epilog', tier, standIns: true }]);
  if (checkPrivate) cases.push({ chapter: 'epilog', tier: 'high', standIns: false });
  for (const item of cases) {
    const name = `${item.chapter}/${item.tier}/${item.standIns ? 'public' : 'private'}`;
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [], requests = [], missing = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => requests.push(request.url()));
    page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
    await page.route('**/shared-home-probe', route => route.fulfill({ contentType: 'text/html', body:
      '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/shared-home-probe`);
    const initial = await page.evaluate(async item => {
      const f = await import('/spokets-godisbus/shared-home-fixture.js');
      const chapter = f[item.chapter], sim = new f.Sim(chapter);
      const view = f.createView(document.getElementById('game'), chapter, item.tier, item.standIns);
      await view.ready;
      let ending = null;
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt, atGoal: false,
        collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers, drips: sim.drips,
        flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries, prologue: sim.prologue?.frame,
        scene: item.chapter === 'prolog' ? { id: 'morgon', seconds: 9.6 } : null, ending });
      for (let frame = 0; frame < 24; frame++) draw(.1);
      window.sharedHome = { f, sim, view, draw, ending: value => { ending = value; } };
      return { ...f.snapshot(), info: view.info() };
    }, item);
    check(`${name}: public room kit is installed`, initial.info.models.includes('aventyr2/room'));
    check(`${name}: sofa, lamp and plant use authored pieces`, initial.pieces?.length >= 3 && initial.pieces.every(piece => piece.present));
    check(`${name}: no Stormnatten story code is fetched`, !requests.some(url => url.includes('/src/content/aventyr2/')));
    check(`${name}: the room file is fetched once`, requests.filter(url => /\/aventyr2\/room\.glb(?:\?|$)/.test(url)).length === 1);
    if (item.chapter === 'prolog') {
      check(`${name}: every table and chair uses its own authored copy`, initial.furniture.length >= 3 &&
        initial.furniture.every(piece => piece.present) && new Set(initial.furniture.map(piece => piece.uuid)).size === initial.furniture.length);
      check(`${name}: furniture stays grounded and correctly scaled`, initial.furniture.every(piece =>
        Math.abs(piece.bottom - piece.floor) < .08 && piece.size.every(length => length > .2 && length < 8) &&
        piece.size[1] > 1.4 && piece.size[1] < 3));
    }
    if (item.standIns) check(`${name}: public capture never fetches private models`, !requests.some(url => url.includes('/packs/private/')));
    if (item.chapter === 'epilog') {
      check(`${name}: carving waits for Elof to paint its eyes`, initial.figure?.visible === false);
      check(`${name}: carving follows the requested public/private mode`, initial.figure?.installed === !item.standIns);
      const blink = await page.evaluate(() => {
        const p = window.sharedHome;
        const original = p.f.carvingGeometry();
        p.sim.flags.add('dots'); p.ending(1.36); p.draw(); const during = p.f.snapshot();
        const closed = p.f.carvingGeometry();
        p.ending(2.2); p.draw(); const after = p.f.snapshot();
        const reopened = p.f.carvingGeometry();
        let changed = 0, restored = true, onlyDarkEyes = true;
        const eyeSpans = [];
        for (const mesh of original) {
          const shut = closed.find(other => other.uuid === mesh.uuid), open = reopened.find(other => other.uuid === mesh.uuid);
          if (!shut || !open) { restored = false; continue; }
          const xs = mesh.points.map(point => point[0]), ys = mesh.points.map(point => point[1]), zs = mesh.points.map(point => point[2]);
          const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
          const upper = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * .7;
          const front = Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * .7;
          const sides = [[], []];
          mesh.points.forEach((point, i) => {
            const closedPoint = shut.points[i], openPoint = open.points[i];
            restored &&= point.every((value, j) => Math.abs(value - openPoint[j]) < .000001);
            if (Math.abs(point[1] - closedPoint[1]) < .000001) return;
            changed++;
            onlyDarkEyes &&= point[3] <= .06 && point[1] >= upper && point[2] >= front && point[0] === closedPoint[0] && point[2] === closedPoint[2];
            sides[point[0] < mid ? 0 : 1].push([point[1], closedPoint[1]]);
          });
          for (const side of sides) if (side.length) eyeSpans.push({
            open: Math.max(...side.map(point => point[0])) - Math.min(...side.map(point => point[0])),
            closed: Math.max(...side.map(point => point[1])) - Math.min(...side.map(point => point[1])),
          });
        }
        return { during: during.figure, after: after.figure, changed, restored, onlyDarkEyes, eyeSpans };
      });
      check(`${name}: finished carving remains visible through its answering blink`, blink.during?.visible && blink.after?.visible);
      if (!item.standIns) {
        check(`${name}: both painted eyes in the actual export close`, blink.changed > 0 && blink.onlyDarkEyes && blink.eyeSpans.length === 2 &&
          blink.eyeSpans.every(span => span.open > 0 && span.closed < span.open * .15));
        check(`${name}: the carved face returns exactly to its authored shape`, blink.restored);
      }
    }
    const warmed = await page.evaluate(() => {
      const p = window.sharedHome;
      for (let i = 0; i < 8; i++) p.draw();
      const before = p.view.info();
      const flags = [...p.sim.flags], state = { ...p.sim.curr };
      for (let i = 0; i < 16; i++) p.draw();
      return { before, after: p.view.info(), unchanged: JSON.stringify(flags) === JSON.stringify([...p.sim.flags]) && JSON.stringify(state) === JSON.stringify(p.sim.curr) };
    });
    check(`${name}: paused redraws keep shaders, geometry and textures warmed`,
      warmed.before.programs === warmed.after.programs && warmed.before.geometries === warmed.after.geometries && warmed.before.textures === warmed.after.textures);
    check(`${name}: model installation and redraws preserve simulation state`, warmed.unchanged);
    check(`${name}: draw budget is respected`, withinDraws(warmed.after.drawCalls, item.tier));
    assert.deepEqual(errors, [], `${name}: browser/shader errors`);
    assert.deepEqual(missing, [], `${name}: missing exports`);
    await page.close();
  }
  console.log(`Shared home: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
