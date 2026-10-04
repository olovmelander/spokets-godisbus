// Actual forest ground, player inputs and WebGL: a return clue and two physical counterweights.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { picture } from './picture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/forest-puzzles'); mkdirSync(shots, { recursive: true });
const virtual = '\0forest-puzzle-fixture';
const server = await createServer({ root, cacheDir: join(root, '.vite/forest-puzzles'),
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'forest-puzzle-fixture', resolveId(id) { if (id === '/forest-puzzle-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Scene, Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
        export { granskog } from ${JSON.stringify(join(root, 'src/content/chapters/granskog.ts'))};
        export { hintFor } from ${JSON.stringify(join(root, 'src/sim/help.ts'))};
        export { decide } from ${JSON.stringify(join(root, 'tests/robot/robot.ts'))};
        export { settingsFor, simOptions } from ${JSON.stringify(join(root, 'src/save/settings.ts'))};
        let scene, camera; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) { scene = this; camera = args[2]; } before.apply(this, args); };
        export const renderedScene = () => scene;
        export const projected = (x,y) => new Vector3(x,y,0).project(camera).toArray();
        export function corners(mesh) { return [[-0.5,-0.5],[0.5,0.5]].map(([x,y]) => mesh.localToWorld(new Vector3(x * mesh.geometry.parameters.width, y * mesh.geometry.parameters.height, 0)).project(camera).toArray()); }
      `;
    } }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let checks = 0;
const check = (name, value) => { assert.ok(value, name); checks++; console.log(`  ok   ${name}`); };

async function open(start, width, height, tier, gentle = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/forest-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
  await page.goto(`${origin}/spokets-godisbus/forest-probe`);
  const initial = await page.evaluate(async ({ start, tier, gentle }) => {
    const f = await import('/spokets-godisbus/forest-puzzle-fixture.js');
    const chapter = f.granskog;
    const game = new f.Game(chapter, gentle ? f.simOptions(f.settingsFor('lugnt')) : {}, start);
    const sim = game.sim, view = f.createView(document.getElementById('game'), chapter, tier, true);
    const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt,
      atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
      drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
      gusts: sim.gusts, help: sim.help, berries: sim.berries });
    const step = (input = {}, dt = 1 / 120) => {
      game.frame(dt, { x: input.x ?? 0, y: input.y ?? 0, hopHeld: input.hopHeld ?? false },
        { hop: input.hop ?? false, act: input.act ?? false, helper: input.help ?? false });
    };
    const run = (seconds, input = {}) => { for (let i = 0; i < Math.round(seconds * 120); i++) step(input); draw(seconds); };
    const walkTo = (x) => {
      let jumpedAt = -120;
      for (let i = 0; i < 3600; i++) {
        const p = sim.curr;
        if (Math.abs(x - p.x) < 0.07 && p.grounded && p.mode === 'free') { run(0.15); return; }
        const blocked = p.grounded && Math.abs(p.vx) < 0.05 && Math.abs(x - p.x) > 0.25;
        const hop = !gentle && blocked && i - jumpedAt > 72;
        if (hop) jumpedAt = i;
        step({ x: Math.sign(x - p.x) * 0.6, hop, hopHeld: !gentle && i - jumpedAt < 90 });
      }
      throw new Error('Blocked walking to ' + x + ': ' + JSON.stringify(sim.curr));
    };
    const finish = (fps) => {
      let wasAhead = false, wasOffered = false;
      for (let i = 0; i < fps * 90; i++) {
        if (sim.flags.has('launch') && sim.curr.mode === 'free' && sim.curr.x > 126) { draw(0.25); return; }
        const d = f.decide(game, chapter);
        step({ x: d.x, y: d.y, hopHeld: !gentle, hop: !gentle && d.ahead && !wasAhead, act: d.offered && !wasOffered }, 1 / fps);
        wasAhead = d.ahead; wasOffered = d.offered;
      }
      throw new Error('Blocked finishing launch: ' + JSON.stringify(sim.curr));
    };
    await view.ready;
    run(0.2); for (let i = 0; i < 4; i++) draw(0.25);
    const scene = f.renderedScene(), card = scene.getObjectByName('ghost-thought');
    const snapshot = () => ({ ...view.info(), curr: { ...sim.curr }, flags: [...sim.flags],
      ghost: { ...sim.ghost }, placed: sim.placed, bubbles: sim.bubbles, bowled: sim.bowled,
      opacity: card.material.opacity, at: card.position.toArray(), corners: f.corners(card), uv: card.material.map.offset.x,
      texturesVersion: card.material.map.version, hint: f.hintFor(sim, chapter),
      atlas: [card.material.map.image.width, card.material.map.image.height],
      heavy: f.projected(sim.movers.find((m) => m.def.id === 'cone').x, -7),
      ghosts: scene.children.filter((object) => object.name === 'chase-ghost').length,
      sim: JSON.stringify({ curr: sim.curr, flags: [...sim.flags], ghost: sim.ghost, placed: sim.placed }) });
    window.probe = { f, game, sim, chapter, view, draw, step, run, walkTo, finish, scene, card, snapshot };
    return snapshot();
  }, { start, tier, gentle });
  return { page, errors, initial };
}

try {
  const progress = { checkpoint: 7, flags: ['berry', 'jay', 'antlift'], placed: ['twig'] };
  for (const [smallFirst, width, height, tier, gentle, fps] of [
    [true, 844, 390, 'low', false, 30],
    [true, 390, 844, 'high', true, 60],
    [false, 390, 844, 'low', false, 144],
  ]) {
    const name = `${smallFirst ? 'trial' : 'heavy-first'}-${width}x${height}-${gentle ? 'lugnt' : tier}`;
    const { page, errors, initial } = await open(progress, width, height, tier, gentle);
    check(`${name}: large cone is visible before calling Pappa`, Math.abs(initial.heavy[0]) < 0.95 && Math.abs(initial.heavy[1]) < 1 && !initial.flags.includes('seesaw'));
    check(`${name}: skipping the optional berry loop never grants its picture`, initial.opacity === 0 && !initial.flags.includes('keepsake:vittra'));
    await picture(page, join(shots, `${name}-arrival.png`));
    const called = await page.evaluate(() => {
      const p = window.probe; p.walkTo(108.2); p.step({ act: true }); p.run(0.2);
      return { ...p.snapshot(), rolling: p.sim.rollers.some((cone) => cone.on) };
    });
    check(`${name}: call opens a safe return route and helper points behind to heavy weight`, called.flags.includes('seesaw') && !called.rolling && called.hint.verb === null && called.hint.at.x < 103);
    if (smallFirst) {
      const prepared = await page.evaluate(() => {
        const p = window.probe; p.walkTo(116.72); p.step({ act: true }); p.run(1.2); p.walkTo(113.2); p.draw(0.25);
        return p.snapshot();
      });
      check(`${name}: physical small cone moves left to the board, without placing heavy`, prepared.placed.includes('cone-small') && !prepared.placed.includes('cone') && prepared.curr.word === 'standOn');
      const tipped = await page.evaluate(() => { const p = window.probe; p.step({ act: true }); p.run(0.35); return p.snapshot(); });
      check(`${name}: trial is an actual low ride before the pit`, tipped.curr.mode === 'ride' && tipped.curr.x < 118 && tipped.curr.y > -8);
      await picture(page, join(shots, `${name}-bounce.png`));
      const landed = await page.evaluate(() => { const p = window.probe; p.run(1.6); return p.snapshot(); });
      check(`${name}: failed trial lands safely and unlocks an explicit larger-cone reaction`, landed.curr.grounded && Math.abs(landed.curr.x - 116.5) < 0.05 && Math.abs(landed.curr.y + 8) < 0.05 && landed.bubbles === 0 && !landed.flags.includes('launch') && landed.flags.includes('beat:seesaw-trial'));
      check(`${name}: helper returns to actual heavy push side rather than the completed small cone`, landed.hint.verb === null && landed.hint.at.x < 103);
      await picture(page, join(shots, `${name}-return.png`));
      const paused = await page.evaluate(() => { const p = window.probe; const before = p.snapshot(); for (let i = 0; i < 10; i++) p.draw(0); return { before, after: p.snapshot() }; });
      check(`${name}: pause cannot advance cone, trial, position or flags`, paused.before.sim === paused.after.sim);
    }
    const complete = await page.evaluate((fps) => { const p = window.probe; p.finish(fps); return p.snapshot(); }, fps);
    check(`${name}: player returns for heavy cone, pushes it and crosses successfully`, complete.flags.includes('launch') && complete.placed.includes('cone') && complete.curr.x > 126 && complete.curr.grounded && complete.bubbles === 0 && complete.bowled === 0);
    check(`${name}: choice is remembered and no gift is silently completed`, complete.flags.includes('seesaw:trial') === smallFirst && !complete.flags.includes('keepsake:vittra'));
    check(`${name}: puzzle adds no runtime shader/texture churn`, complete.programs === initial.programs && complete.textures === initial.textures && complete.texturesVersion === initial.texturesVersion && complete.drawCalls <= 125);
    await picture(page, join(shots, `${name}-crossed.png`));
    assert.deepEqual(errors, [], `${name}: browser errors`); await page.close();
  }

  for (const [width, height, tier] of [[390, 844, 'high'], [844, 390, 'low']]) {
    const name = `door-return-${width}x${height}-${tier}`;
    const { page, errors, initial } = await open({ checkpoint: 3, flags: ['berry', 'jay', 'antlift', 'vittra:berry'], placed: ['twig'] }, width, height, tier);
    check(`${name}: no clue before a real gift and revisit`, initial.opacity === 0 && initial.atlas[0] === 512 && initial.atlas[1] === 192);
    const below = await page.evaluate(() => {
      const p = window.probe; p.walkTo(64.4); p.step({ act: true }); p.run(1);
      p.walkTo(65.8); p.step({ act: true }); p.run(3); p.draw(0.25);
      return p.snapshot();
    });
    check(`${name}: descent leaves the gift but shows no picture below the doorway`, below.flags.includes('vittra:gift:away') && !below.flags.includes('keepsake:vittra') && below.opacity === 0 && below.curr.y < 0.1 && below.hint.at.y === 10);
    const arrival = await page.evaluate(() => {
      const p = window.probe;
      for (let i = 0; i < 1440; i++) {
        if (p.sim.curr.mode === 'free' && p.sim.curr.grounded && p.sim.curr.y > 9.9) break;
        p.step({ x: Math.max(-0.6, Math.min(0.6, 66.3 - p.sim.curr.x)), y: 1 });
      }
      p.walkTo(64.4);
      // Landscape can still be looking up from the root's bottom. Let the camera expose the source first.
      for (let i = 0; i < 30 && p.card.material.opacity === 0; i++) p.draw(0.04);
      const before = p.snapshot(); for (let i = 0; i < 10; i++) p.draw(0);
      const paused = p.snapshot();
      p.run(0.2); for (let i = 0; i < 10; i++) p.draw(0.1);
      const pixels = p.card.material.map.image.getContext('2d').getImageData(256, 0, 256, 192).data;
      const symbols = { paper: 0, figure: 0, eyes: 0, pine: 0 };
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 255 && pixels[i+1] === 246 && pixels[i+2] === 226) symbols.paper++;
        if (pixels[i] === 139 && pixels[i+1] === 129 && pixels[i+2] === 114) symbols.figure++;
        if (pixels[i] === 93 && pixels[i+1] === 90 && pixels[i+2] === 83) symbols.eyes++;
        if (pixels[i] === 95 && pixels[i+1] === 109 && pixels[i+2] === 87) symbols.pine++;
      }
      return { before, paused, returned: p.snapshot(), symbols };
    });
    const { returned } = arrival;
    check(`${name}: pausing a newly discovered picture freezes its entrance and clock`, arrival.before.opacity > 0 && arrival.before.opacity < 0.9 && arrival.before.opacity === arrival.paused.opacity && arrival.before.sim === arrival.paused.sim && JSON.stringify(arrival.before.at) === JSON.stringify(arrival.paused.at));
    check(`${name}: folded-paper clue contains only a small silhouette, without eyes or later mountain clues`, arrival.symbols.paper > 15000 && arrival.symbols.figure > 2500 && arrival.symbols.eyes === 0 && arrival.symbols.pine === 0);
    check(`${name}: actual climb back reveals the persisted vittra picture beside the keepsake`, returned.flags.includes('keepsake:vittra') && returned.flags.includes('beat:vittra-clue') && returned.opacity > 0.9 && returned.uv === 0.5);
    check(`${name}: actual ghost remains at its next lower perch, with one chase mesh`, returned.ghost.perch === 9 && Math.abs(returned.ghost.x - 76) < 0.1 && returned.ghost.y < 0.1 && returned.ghosts === 1);
    check(`${name}: card stays legible inside portrait/landscape framing`, returned.corners.every((point) => Math.abs(point[0]) <= 0.99 && Math.abs(point[1]) <= 0.99));
    check(`${name}: atlas/card stay bounded and all shaders were warmed early`, returned.programs === initial.programs && returned.textures === initial.textures && returned.texturesVersion === initial.texturesVersion && returned.drawCalls <= 125);
    await picture(page, join(shots, `${name}.png`));
    const paused = await page.evaluate(() => { const p = window.probe; for (let i = 0; i < 10; i++) p.draw(0); return p.snapshot(); });
    check(`${name}: pause freezes clue entrance, location and simulation`, returned.sim === paused.sim && returned.opacity === paused.opacity && JSON.stringify(returned.at) === JSON.stringify(paused.at));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const calm = await page.evaluate(() => { const p = window.probe; p.draw(0.2); const a = p.snapshot(); p.draw(1); return { a, b: p.snapshot() }; });
    check(`${name}: OS calm keeps the paper picture still`, JSON.stringify(calm.a.at) === JSON.stringify(calm.b.at));
    const left = await page.evaluate(() => { const p = window.probe; p.walkTo(65.8); p.step({ act: true }); p.run(3); return p.snapshot(); });
    check(`${name}: returning below clears the local picture while retaining the saved discovery`, left.opacity === 0 && left.flags.includes('keepsake:vittra'));
    assert.deepEqual(errors, [], `${name}: browser errors`); await page.close();
  }
  console.log(`Forest puzzles: ${checks} browser checks passed.`);
} finally { await browser.close(); await server.close(); }
