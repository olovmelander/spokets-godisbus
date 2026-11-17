// The trailer's harness: a Vite dev server that serves the game's own modules, and Chrome on the GPU.
import { realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

export const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
/** Frames, sheets and the finished files: scratch/ is ignored by git. They show the family's own models, so they never enter the repository. */
export const WORK = new URL('../../scratch/trailer/', import.meta.url);
const virtual = '\0trailer-fixture';

export async function start({ width = 1920, height = 1080 } = {}) {
  process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
  // vite.config.ts reads src/ and public/ relative to the working directory.
  process.chdir(root);
  const server = await createServer({ root, logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
    plugins: [{ name: 'trailer-fixture', enforce: 'pre',
      resolveId(id) { if (id === '/trailer-fixture.js') return virtual; },
      // The trailer is drawn offline, so High may use a whole 4K frame (the game caps it at 3.5 MP for the devices).
      transform(code, id) {
        if (id.replaceAll('\\', '/').endsWith('src/render/quality.ts')) return code.replace('high: 3.5e6', `high: ${process.env.PIXEL_CAP ?? '8.4e6'}`).replace(': 1, 2,', ': 1, 3,');
      },
      load(id) {
        if (id !== virtual) return;
        const at = (p) => JSON.stringify(join(root, p));
        return `export { createView } from ${at('src/render/view.ts')};
          export { Game } from ${at('src/app/game.ts')};
          export { COURSES, loadAdventure2 } from ${at('src/content/chapters/index.ts')};
          export { decide } from ${at('tests/robot/robot.ts')};
          export { STEP } from ${at('src/sim/constants.ts')};
          export * as music from ${at('src/audio/music.ts')};`;
      },
    }],
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });

  async function page({ w = width, h = height, dsf = 1 } = {}) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/websocket|vite/i.test(m.text())) errors.push(m.text()); });
    await page.route('**/trailer-probe', route => route.fulfill({ contentType: 'text/html', body:
      '<meta charset="utf-8"><script type="module" src="/spokets-godisbus/@vite/env"></script><body style="margin:0;background:#000"><canvas id="game" style="width:100vw;height:100vh;display:block"></canvas></body>' }));
    await page.goto(`${origin}/spokets-godisbus/trailer-probe`);
    await page.addScriptTag({ type: 'module', content: `
      import * as f from '/spokets-godisbus/trailer-fixture.js';
      window.f = f;
      // One frame of the game, as main.ts draws it.
      window.draw = (view, game, dt, extra = {}) => view.render({ prev: game.sim.prev, curr: game.sim.curr, alpha: game.alpha, dt, eventDt: dt,
        atGoal: game.sim.flags.has('goal'), collected: game.sim.collected, side: game.sim.collectedSide, checkpoint: game.sim.checkpoint,
        movers: game.sim.movers, drips: game.sim.drips, prologue: game.sim.prologue?.frame, scene: game.sim.sceneFrame,
        flags: game.sim.flags, ghost: game.sim.ghost, rollers: game.sim.rollers, tussocks: game.sim.tussocks, gusts: game.sim.gusts,
        help: game.sim.help, berries: game.sim.berries, noteHits: game.sim.noteHits, ...extra });
      // Lets the page fetch and install what it streams in (the family's own models), until nothing new has come for a while.
      window.settle = async (view, game, dt = 1 / 30) => {
        let last = -1, still = 0;
        for (let i = 0; i < 600 && still < 15; i++) {
          await new Promise(r => setTimeout(r, 50));
          window.draw(view, game, 0);
          const n = view.info().models.length;
          still = n === last && !view.warming ? still + 1 : 0;
          last = n;
        }
        return view.info().models;
      };
      window.fixtureReady = true;` });
    await page.waitForFunction(() => window.fixtureReady === true, null, { timeout: 120000 });
    return { page, errors };
  }

  async function close() {
    await browser.close();
    await server.close();
  }
  return { origin, browser, page, close };
}
