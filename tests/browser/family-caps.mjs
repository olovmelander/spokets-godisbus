// Optional local check of the real, revised private caps; never part of the public CI suites.
// Requires art/private/baked/private/{bertil,pappa}.glb. Run: node tests/browser/family-caps.mjs
// FAMILY_CAP_MODELS may point to a private candidate export directory before installation.
// FAMILY_CAP_SHOTS=1 saves private previews only under ignored scratch/family-caps/.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const roles = ['bertil', 'pappa'];
const models = process.env.FAMILY_CAP_MODELS ?? join(root, 'art/private/baked/private');
const exports = Object.fromEntries(roles.map(role => [role, join(models, `${role}.glb`)]));
for (const role of roles) assert.ok(existsSync(exports[role]),
  `${role}: this optional check requires a raw private export; use art/private/baked/private/ or FAMILY_CAP_MODELS.`);
const shots = process.env.FAMILY_CAP_SHOTS === '1' ? join(root, 'scratch/family-caps') : null;
if (shots) mkdirSync(shots, { recursive: true });
const fixtureId = '\0family-caps-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, watch: null, hmr: false,
    fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'family-caps-fixture',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const role = /^\/(?:spokets-godisbus\/)?family-caps-models\/(bertil|pappa)\.glb$/.exec(request.url?.split('?')[0] ?? '')?.[1];
        if (!role) return next();
        response.setHeader('Content-Type', 'model/gltf-binary');
        response.end(readFileSync(exports[role]));
      });
    },
    resolveId(id) { if (id === '/family-caps-fixture.js') return fixtureId; },
    load(id) {
      if (id !== fixtureId) return;
      return `import { Box3, DirectionalLight, HemisphereLight, OrthographicCamera, Scene,
          Vector3, WebGLRenderer, WebGLRenderTarget } from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { createModelRig, heightOf, STANDING } from ${JSON.stringify(join(root, 'src/render/rig.ts'))};
        export async function createProbe(canvas, role) {
          const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
          renderer.setSize(640, 640); renderer.setClearColor(0, 0);
          const scene = new Scene(), camera = new OrthographicCamera();
          scene.add(new HemisphereLight(0xddeeff, 0x665044, 2.1));
          const light = new DirectionalLight(0xfff2dc, 3); light.position.set(3, 5, 6); scene.add(light);
          const model = (await new GLTFLoader().loadAsync('/spokets-godisbus/family-caps-models/' + role + '.glb')).scene;
          model.scale.setScalar(3);
          const rig = createModelRig(model, heightOf(role)); scene.add(rig.group);
          const head = model.getObjectByName('Head'), meshes = [], caps = [];
          model.traverse(node => {
            if (!node.isMesh) return;
            meshes.push(node);
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            if (materials.some(material => material.userData.familyCap === true)) caps.push(node);
          });
          if (!head?.isBone) throw new Error(role + ': missing Head bone');
          if (caps.length !== 1 || !caps[0].isSkinnedMesh) throw new Error(role + ': expected one revised skinned cap with material extras.familyCap=true');
          const cap = caps[0], count = cap.geometry.getAttribute('position').count;
          const skinIndex = cap.geometry.getAttribute('skinIndex'), skinWeight = cap.geometry.getAttribute('skinWeight');
          if (!skinIndex || !skinWeight || count < 100) throw new Error(role + ': incomplete cap geometry/skin');
          for (let i = 0; i < count; i++) {
            let sum = 0, headWeight = 0;
            for (let k = 0; k < 4; k++) {
              const weight = skinWeight.getComponent(i, k); sum += weight;
              if (cap.skeleton.bones[skinIndex.getComponent(i, k)] === head) headWeight += weight;
            }
            if (Math.abs(sum - 1) > 1e-6 || Math.abs(headWeight - 1) > 1e-6)
              throw new Error(role + ': cap vertex ' + i + ' is not rigidly attached to Head');
          }
          const bind = () => JSON.stringify(meshes.filter(mesh => mesh.isSkinnedMesh).map(mesh => ({
            bones: mesh.skeleton.bones.map(bone => bone.uuid),
            inverses: mesh.skeleton.boneInverses.map(matrix => matrix.elements),
            matrix: mesh.bindMatrix.elements,
          })));
          const initialBind = bind(), point = new Vector3(), bodyBox = new Box3(), capBox = new Box3();
          rig.pose({ ...STANDING }); scene.updateMatrixWorld(true);
          const rest = Array.from({ length: count }, (_, i) => {
            cap.getVertexPosition(i, point); cap.localToWorld(point); return head.worldToLocal(point).clone();
          });
          const target = head.getWorldPosition(new Vector3()).add(new Vector3(0, .15, 0));
          const half = new Box3().setFromObject(model).getSize(new Vector3()).y * .28;
          camera.left = camera.bottom = -half; camera.right = camera.top = half;
          camera.near = .01; camera.far = 30; camera.position.set(0, target.y, 8);
          camera.lookAt(target); camera.updateProjectionMatrix();
          const renderTarget = new WebGLRenderTarget(640, 640), pixels = new Uint8Array(640 * 640 * 4);
          const drawnPixels = () => {
            renderer.setRenderTarget(renderTarget); renderer.render(scene, camera);
            renderer.readRenderTargetPixels(renderTarget, 0, 0, 640, 640, pixels);
            let drawn = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) drawn++;
            return drawn;
          };
          return {
            draw(yaw, nod, turn = 0) {
              rig.group.rotation.y = yaw;
              rig.pose({ ...STANDING, nod, turn });
              rig.breeze(4, 1 / 60, false); scene.updateMatrixWorld(true);
              let error = 0, finite = true;
              bodyBox.makeEmpty(); capBox.makeEmpty();
              for (const mesh of meshes) for (let i = 0; i < mesh.geometry.getAttribute('position').count; i++) {
                mesh.getVertexPosition(i, point); mesh.localToWorld(point);
                finite &&= point.toArray().every(Number.isFinite); bodyBox.expandByPoint(point);
                if (mesh === cap) {
                  capBox.expandByPoint(point); head.worldToLocal(point);
                  error = Math.max(error, point.distanceTo(rest[i]));
                }
              }
              const fullPixels = drawnPixels(), visible = meshes.map(mesh => mesh.visible);
              meshes.forEach(mesh => { mesh.visible = mesh === cap; });
              const capPixels = drawnPixels();
              meshes.forEach((mesh, i) => { mesh.visible = visible[i]; });
              renderer.setRenderTarget(null); renderer.render(scene, camera);
              return { error, finite, sameBind: bind() === initialBind, capPixels, fullPixels,
                capSize: capBox.getSize(new Vector3()).toArray(), bodySize: bodyBox.getSize(new Vector3()).toArray(),
                calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, vertices: count };
            },
            dispose() {
              const geometries = new Set(), materials = new Set();
              meshes.forEach(mesh => { geometries.add(mesh.geometry);
                (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material)); });
              geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
              renderTarget.dispose(); renderer.dispose();
            },
          };
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
  for (const role of roles) {
    const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
    const errors = [], missing = [], requests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
    page.on('request', request => requests.push(request.url()));
    await page.route('**/family-caps-probe', route => route.fulfill({ contentType: 'text/html', body:
      '<link rel="icon" href="data:,"><body style="margin:0;background:#ded9ce"><canvas id="game"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/family-caps-probe`);
    await page.evaluate(async role => {
      const fixture = await import('/spokets-godisbus/family-caps-fixture.js');
      window.capProbe = await fixture.createProbe(document.getElementById('game'), role);
    }, role);
    for (const [view, yaw] of [['front', 0], ['three-quarter', Math.PI / 4], ['left-profile', Math.PI / 2], ['right-profile', -Math.PI / 2]]) {
      for (const nod of [0, .24, .8]) {
        const name = `${role}/${view}/nod-${nod}`;
        const result = await page.evaluate(({ yaw, nod }) => window.capProbe.draw(yaw, nod), { yaw, nod });
        check(`${name}: cap follows Head without changing the skeleton bind`, result.error < 1e-6 && result.sameBind);
        check(`${name}: all posed vertices and bounds stay finite`, result.finite &&
          [...result.capSize, ...result.bodySize].every(value => Number.isFinite(value) && value > 0));
        check(`${name}: the actual cap renders from this angle`, result.capPixels > 100 && result.fullPixels > result.capPixels &&
          result.calls > 0 && result.triangles > 100);
        if (shots) await page.screenshot({ path: join(shots, `${role}-${view}-nod-${nod}.png`) });
      }
    }
    const turned = await page.evaluate(() => window.capProbe.draw(.4, .24, -.5));
    const reset = await page.evaluate(() => window.capProbe.draw(0, 0));
    check(`${role}: turning and returning to rest retain the exact cap attachment`,
      turned.error < 1e-6 && reset.error < 1e-6 && turned.sameBind && reset.sameBind);
    assert.deepEqual(errors, [], `${role}: browser or shader errors`);
    assert.deepEqual(missing, [], `${role}: missing resources`);
    check(`${role}: private models never request an external resource`, requests.every(url =>
      url.startsWith(origin + '/') || url.startsWith('blob:' + origin + '/') || url.startsWith('data:')));
    await page.evaluate(() => window.capProbe.dispose());
    await page.close();
  }
  console.log(`Private family caps: ${checks} browser checks passed. No previews saved unless FAMILY_CAP_SHOTS=1.`);
} finally { await browser.close(); await server.close(); }
