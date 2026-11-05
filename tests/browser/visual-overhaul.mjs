// Reproducible public-stand-in views for a visual review, not a substitute for device performance testing.
// VISUAL_ROOT can point to an immutable checkout; VISUAL_OUT defaults to the ignored working capture folder.
// VISUAL_SIZES=390x844,1440x900 VISUAL_CASES=home,garden VISUAL_TIER=high node tests/browser/visual-overhaul.mjs
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';
import { withinDraws } from './budget.mjs';

const root = resolve(process.env.VISUAL_ROOT ?? fileURLToPath(new URL('../../', import.meta.url)));
const output = resolve(process.env.VISUAL_OUT ?? join(root, 'docs/shots/_work/visual-overhaul'));
const sizes = (process.env.VISUAL_SIZES ?? '390x844,844x390,780x360,1180x820,1440x900').split(',').map(size => size.split('x').map(Number));
const tier = process.env.VISUAL_TIER ?? 'high';
// Static review can use fewer draws while preserving 2.4 seconds of exponential camera/pose settling.
const framesPerViewport = Number(process.env.VISUAL_FRAMES ?? '24');
if (!Number.isInteger(framesPerViewport) || framesPerViewport < 3 || framesPerViewport > 120) throw new Error('VISUAL_FRAMES must be an integer from 3 to 120');
const frameDt = 2.4 / framesPerViewport;
if (!['low', 'mid', 'high'].includes(tier)) throw new Error(`Unknown visual tier: ${tier}`);
if (sizes.some(size => size.length !== 2 || size.some(value => !Number.isInteger(value) || value < 100))) throw new Error('VISUAL_SIZES must contain WIDTHxHEIGHT pairs');
const cases = [
  { name: 'home', chapter: 'prolog', at: [3, 0], scene: { id: 'morgon', seconds: 9.6 } },
  { name: 'home-sofa', chapter: 'prolog', at: [24, 0] },
  { name: 'garden', chapter: 'garden', at: [76, 0] },
  { name: 'garden-boulder-left', chapter: 'garden', at: [101.2, 1.3] },
  { name: 'garden-boulder-middle', chapter: 'garden', at: [103, 1.3] },
  { name: 'garden-boulder-right', chapter: 'garden', at: [104.8, 1.3] },
  { name: 'forest', chapter: 'granskog', at: [30, 0] },
  { name: 'bog', chapter: 'myren', at: [96, 0] },
  { name: 'mountain', chapter: 'berget', at: [104, 26.4] },
  { name: 'finale', chapter: 'norrsken', at: [17.8, 0], flags: ['placed:tragubbe', 'eyes'] },
  { name: 'finale-reunion', chapter: 'norrsken', at: [30.4, 0], flags: ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste'] },
  { name: 'epilogue', chapter: 'epilog', at: [32, 0], flags: ['partied', 'knife', 'cut1', 'cut2', 'cut3', 'dots'] },
  { name: 'village', chapter: 'byn', at: [65, 0] },
  { name: 'village-shop', chapter: 'byn', at: [115, 3.3] },
  { name: 'storm-evening', chapter: 'stormkvall', at: [3, 0], scene: { id: 'kvall', seconds: 7.8 } },
  { name: 'storm-garden', chapter: 'stormgard', at: [94, 0] },
  { name: 'storm-forest', chapter: 'stormskog', at: [30, 0] },
  { name: 'storm-village', chapter: 'stormbyn', at: [97.8, 5] },
  { name: 'olympia', chapter: 'olympia', at: [54, 0] },
  { name: 'flarken', chapter: 'flarken', at: [108, 0] },
  { name: 'river', chapter: 'alven', at: [91.6, 0] },
  { name: 'billsta', chapter: 'billsta', at: [43, 3.6] },
  { name: 'storm-eye', chapter: 'stormoga', at: [46, .6], flags: ['eye', 'scene:motet'] },
  { name: 'next-morning', chapter: 'morgonen', at: [3, 0], scene: { id: 'frukost', seconds: 12.2 } },
];
const chosen = process.env.VISUAL_CASES ? process.env.VISUAL_CASES.split(',').map(name => {
  const item = cases.find(candidate => candidate.name === name);
  if (!item) throw new Error(`Unknown visual capture case: ${name}`);
  return item;
}) : cases;
if (!chosen.length) throw new Error('No visual capture cases selected');
mkdirSync(output, { recursive: true });
// Asset builds replace public/packs while they run. Keep the review's loaded models stable throughout.
const publicSnapshot = mkdtempSync(join(tmpdir(), 'visual-overhaul-public-'));
cpSync(join(root, 'public'), publicSnapshot, { recursive: true });
function sourceFingerprint() {
  const hash = createHash('sha256');
  let files = 0;
  function read(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) read(path);
      else if (entry.isFile()) { hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0'); files++; }
    }
  }
  read('src');
  return { sha256: hash.digest('hex'), files };
}
const context = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceChanges: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  publicStandins: true, rendererOnly: true, tier, sizes, cases: chosen,
  assetManifestSha256: createHash('sha256').update(readFileSync(join(publicSnapshot, 'packs/manifest.json'))).digest('hex'),
  source: sourceFingerprint(),
  captureScriptSha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  framesPerViewport, frameDt, deviceScaleFactor: 1, reuseViewPerCase: true,
};
writeFileSync(join(output, 'capture-context.json'), JSON.stringify(context, null, 2) + '\n');
const virtual = '\0visual-overhaul-fixture';
const server = await createServer({ root, publicDir: publicSnapshot,
  server: { host: '127.0.0.1', port: 0, watch: null, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'visual-overhaul-fixture',
    resolveId(id) { if (id === '/visual-overhaul-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Sim } from ${JSON.stringify(join(root, 'src/sim/sim.ts'))};
        export { COURSES, loadAdventure2 } from ${JSON.stringify(join(root, 'src/content/chapters/index.ts'))};`;
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
context.browser = await browser.version();
const results = [];
try {
  for (const item of chosen) {
    const page = await browser.newPage({ viewport: { width: sizes[0][0], height: sizes[0][1] }, deviceScaleFactor: 1 });
    const errors = [], consoleErrors = [], missing = [], privateRequests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('request', request => { if (/\/packs\/private(?:\/|[.\-])/.test(request.url())) privateRequests.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400) missing.push({ status: response.status(), url: response.url() }); });
    await page.route('**/visual-overhaul-probe', route => route.fulfill({ contentType: 'text/html', body:
      '<meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0;background:#171c25"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/visual-overhaul-probe`);
    await page.evaluate(async ({ item, tier, framesPerViewport, frameDt }) => {
      const f = await import('/spokets-godisbus/visual-overhaul-fixture.js');
      if (!f.COURSES[item.chapter]) await f.loadAdventure2();
      const chapter = { ...f.COURSES[item.chapter], spawn: { x: item.at[0], y: item.at[1] } };
      const sim = new f.Sim(chapter, {}, { flags: item.flags ?? [] });
      const view = f.createView(document.getElementById('game'), chapter, tier, true);
      await view.ready;
      window.visualCapture = () => {
        view.resize();
        for (let frame = 0; frame < framesPerViewport; frame++) view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt: frameDt,
          atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
          drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
          gusts: sim.gusts, help: sim.help, berries: sim.berries, prologue: sim.prologue?.frame,
          scene: item.scene ?? null });
        return { ...view.info(), warming: view.warming };
      };
    }, { item, tier, framesPerViewport, frameDt });
    for (const [index, [width, height]] of sizes.entries()) {
      await page.setViewportSize({ width, height });
      const info = await page.evaluate(() => window.visualCapture());
      const name = `${item.name}-${width}x${height}-${tier}`;
      const path = join(output, `${name}.png`);
      rmSync(path, { force: true });
      await picture(page, path);
      const result = { name, chapter: item.chapter, at: item.at, flags: item.flags ?? [], scene: item.scene ?? null,
        animationSeconds: (index + 1) * 2.4, withinDrawBudget: withinDraws(info.drawCalls, info.tier),
        captured: existsSync(path), info,
        errors: [...errors], consoleErrors: [...consoleErrors], missing: [...missing], privateRequests: [...privateRequests] };
      results.push(result);
      writeFileSync(join(output, 'capture-report.json'), JSON.stringify(results, null, 2) + '\n');
      console.log(`${name}: ${info.drawCalls} draws, ${info.triangles} triangles, ${errors.length} page errors, ${consoleErrors.length} console errors, ${missing.length} missing, ${privateRequests.length} private requests`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
  rmSync(publicSnapshot, { recursive: true, force: true });
  context.sourceAfter = sourceFingerprint();
  context.sourceChangedDuringCapture = context.source.sha256 !== context.sourceAfter.sha256;
  writeFileSync(join(output, 'capture-context.json'), JSON.stringify(context, null, 2) + '\n');
}
if (context.sourceChangedDuringCapture || results.some(result => !result.captured || !result.withinDrawBudget || result.info.warming || result.errors.length || result.consoleErrors.length
  || result.missing.length || result.privateRequests.length || result.info.models.some(model => model.startsWith('private/')))) process.exitCode = 1;
