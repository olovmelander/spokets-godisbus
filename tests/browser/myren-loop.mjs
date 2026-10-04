// Myren's optional cooperation loop in the real Game and WebGL view; no simulated DOM pickups.
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shots = join(root, 'docs/shots/_work/myren-loop'); mkdirSync(shots, { recursive: true });
const virtual = '\0myren-loop-fixture';
const server = await createServer({ root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
  plugins: [{ name: 'myren-loop-fixture', resolveId(id) { if (id === '/myren-loop-fixture.js') return virtual; },
    load(id) {
      if (id !== virtual) return;
      return `import { Scene } from 'three';
        export { Vector3 } from 'three';
        export { createView } from ${JSON.stringify(join(root, 'src/render/view.ts'))};
        export { Game } from ${JSON.stringify(join(root, 'src/app/game.ts'))};
        export { myren } from ${JSON.stringify(join(root, 'src/content/chapters/myren.ts'))};
        export { settingsFor, simOptions } from ${JSON.stringify(join(root, 'src/save/settings.ts'))};
        let scene; const before = Scene.prototype.onBeforeRender;
        Scene.prototype.onBeforeRender = function (...args) { if (this.getObjectByName('chase-ghost')) scene = this; before.apply(this, args); };
        export const renderedScene = () => scene;
      `;
    },
  }],
});
let browser, checks = 0;
const check = (name, value, detail) => { assert.ok(value, detail ? `${name}: ${JSON.stringify(detail)}` : name); checks++; console.log(`  ok   ${name}`); };
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [width, height] of [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]]) {
    const name = `${width}x${height}`, page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => assert.ok(request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()), 'Only local requests'));
    await page.route('**/bog-probe', (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" src="/spokets-godisbus/@vite/client"></script><body style="margin:0"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/bog-probe`);
    const result = await page.evaluate(async () => {
      const f = await import('/spokets-godisbus/myren-loop-fixture.js');
      const chapter = { ...f.myren, spawn: { x: 169.2, y: 0.01 } };
      const game = new f.Game(chapter, f.simOptions(f.settingsFor('lugnt')), { flags: ['light', 'chick'] });
      const sim = game.sim, view = f.createView(document.getElementById('game'), chapter, 'low', true);
      const none = { hop: false, act: false, helper: false };
      let flights = 0;
      const frame = (x = 0, act = false) => { game.frame(1 / 60, { x, hopHeld: false }, { ...none, act }); if (sim.curr.mode === 'fly') flights++; };
      const draw = (dt = 0) => view.render({ prev: sim.prev, curr: sim.curr, alpha: 1, dt,
        atGoal: false, collected: sim.collected, checkpoint: sim.checkpoint, movers: sim.movers,
        drips: sim.drips, flags: sim.flags, ghost: sim.ghost, rollers: sim.rollers, tussocks: sim.tussocks,
        gusts: sim.gusts, help: sim.help, berries: sim.berries });
      const settle = () => { for (let i = 0; i < 60; i++) frame(); for (let i = 0; i < 5; i++) draw(0.2); };
      const walk = (x) => { for (let i = 0; i < 1800 && Math.abs(sim.curr.x - x) > 0.1; i++) frame(Math.sign(x - sim.curr.x)); settle(); return Math.abs(sim.curr.x - x) < 0.5; };
      await view.ready; settle();
      const mover = sim.movers.find((m) => m.def.id === 'bog-boardwalk');
      frame(0, true); settle();
      const locked = !sim.flags.has('bog:return-bridge') && mover.y === -2.5;
      walk(176.5); const reunion = sim.flags.has('home');
      walk(169.2); const offered = sim.curr.word === 'callMamma';
      frame(0, true); settle();
      const ready = sim.flags.has('placed:bog-boardwalk');
      const scene = f.renderedScene(); let board;
      scene.traverse((object) => { if (object.geometry?.parameters?.width === 20 && object.geometry.parameters.height === 0.35) board = object; });
      const boardY = () => board.getWorldPosition(new f.Vector3()).y;
      const top = view.worldScreen({ x: 168.2, y: 0.65 });
      const visible = !!board && Math.abs(boardY() - 0.475) < 0.001 && top && top.x > 0 && top.x < innerWidth && top.y > 0 && top.y < innerHeight;
      const drawn = [];
      for (const tier of ['low', 'high']) {
        view.setTier(tier); draw(); const programs = view.info().programs;
        for (let i = 0; i < 5; i++) draw(0.1);
        drawn.push({ ...view.info(), stable: programs === view.info().programs });
      }
      const before = JSON.stringify({ y: boardY(), curr: sim.curr, flags: [...sim.flags] });
      for (let i = 0; i < 10; i++) draw(0);
      const frozen = before === JSON.stringify({ y: boardY(), curr: sim.curr, flags: [...sim.flags] });
      window.probe = { f, game, sim, view, draw, walk, settle, flights: () => flights };
      return { locked, reunion, offered, ready, visible, drawn, frozen };
    });
    check(`${name}: family reunion unlocks the optional call, and an early press cannot do it`, result.locked && result.reunion && result.offered);
    check(`${name}: Mamma's raised boardwalk meets the visible landing`, result.ready && result.visible);
    check(`${name}: Low and High remain below 120 draws with warmed shaders`, result.drawn.every((info) => info.drawCalls <= 120 && info.stable));
    check(`${name}: pause freezes boardwalk and simulation`, result.frozen);
    await page.screenshot({ path: join(shots, `${name}-reunion-high.png`) });
    const loop = await page.evaluate(() => {
      const p = window.probe;
      const west = p.walk(142), returned = p.sim.flags.has('bog:lantern-return');
      const landmark = p.f.renderedScene().children.find((object) => object.position.x === 141.3 && object.position.y === 0);
      const lantern = p.view.worldScreen({ x: 141.3, y: 0.5 });
      const lit = p.sim.flags.has('light') && landmark?.visible && lantern && lantern.x > 0 && lantern.x < innerWidth && lantern.y > 0 && lantern.y < innerHeight;
      let maxDraws = p.view.info().drawCalls;
      const inspect = (x) => { const reached = p.walk(x); maxDraws = Math.max(maxDraws, p.view.info().drawCalls); return reached; };
      const east = inspect(158) && inspect(180), twice = inspect(142) && inspect(158) && inspect(180);
      return { west, returned, lit, east, twice, maxDraws, flights: p.flights(), at: { x: p.sim.curr.x, y: p.sim.curr.y, mode: p.sim.curr.mode }, bubbles: p.sim.bubbles,
        once: p.sim.said.filter((id) => id === 'bog:light-return').length === 1,
        noDeparture: !p.sim.flags.has('crane') && !p.sim.flags.has('goal') };
    });
    check(`${name}: the lantern return is real, readable and reusable without jumping`, loop.west && loop.returned && loop.lit && loop.east && loop.twice && loop.flights === 0 && loop.bubbles === 0 && loop.once && loop.noDeparture && loop.maxDraws <= 120, loop);
    const restored = await page.evaluate(() => {
      const p = window.probe;
      const game = new p.f.Game(p.f.myren, p.f.simOptions(p.f.settingsFor('lugnt')), { checkpoint: 8, flags: [...p.sim.flags], collected: p.sim.collected.flatMap((value, i) => value ? [i] : []), placed: p.sim.placed });
      for (let i = 0; i < 60; i++) game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
      return game.sim.flags.has('placed:bog-boardwalk') && game.sim.flags.has('bog:lantern-return') && Math.abs(game.sim.movers.find((m) => m.def.id === 'bog-boardwalk').y - 0.3) < 0.001;
    });
    check(`${name}: flags restore the optional route from the old firm checkpoint`, restored);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    console.log(`       draws ${result.drawn.map((info) => `${info.tier}:${info.drawCalls}`).join(' ')}`);
    await page.close();
  }
  console.log(`Myren cooperation loop: ${checks} browser checks passed.`);
} finally { if (browser) await browser.close(); await server.close(); }
