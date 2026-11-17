// Contact sheets: the robot plays each chapter, and the view draws a still at chosen seconds.
import { mkdirSync, writeFileSync } from 'node:fs';
import { start, WORK } from './harness.mjs';

const WANT = {
  prolog: [5, 9.5, 15, 25, 30, 33.9, 37, 45, 55, 60, 66, 70, 76, 80, 88, 96, 104, 110],
  garden: [8, 14, 17, 22, 34, 45, 52, 57, 60, 63, 66],
  granskog: [8, 12, 16, 25, 28, 43, 53.5, 60, 64, 68, 72, 80],
  myren: [10, 20, 25, 30, 34, 45, 50, 58, 62, 68],
  berget: [2, 8, 15, 25, 35, 42, 47, 52, 56, 59],
  norrsken: [2, 5, 8, 11, 15, 19, 24, 27, 32, 37],
  epilog: [2, 8, 14, 30, 44, 60],
  byn: [5, 13, 22, 30, 40, 46, 51],
  stormkvall: [5, 20, 38, 48, 56, 65, 83, 94, 98, 108],
  stormgard: [10, 25, 43, 58, 65, 75, 84],
  stormskog: [10, 25, 38, 43, 49, 64, 74],
  stormbyn: [8, 14, 25, 34, 38, 46, 55],
  olympia: [6, 20, 35, 54, 61, 63, 75],
  flarken: [4, 8, 20, 40, 54, 72, 79, 90, 100],
  alven: [6, 12, 19, 33, 37, 53, 56, 63, 67],
  billsta: [10, 20, 36, 60, 82, 87, 100, 118],
  stormoga: [8, 14, 25, 32, 38, 44, 55, 66, 75, 80, 90],
  morgonen: [7, 17, 26, 30, 35, 45, 60],
};
const only = process.argv[2]?.split(',');
const out = new URL('sheets/', WORK);
mkdirSync(out, { recursive: true });
const h = await start({ width: 960, height: 540 });
try {
  const ids = Object.keys(WANT).filter(id => !only || only.includes(id));
  // Six pages at a time: the GPU and the CPU are both kept busy.
  const queue = [...ids];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      const { page, errors } = await h.page({ w: 960, h: 540 });
      const sheet = await page.evaluate(async ({ id, times }) => {
        const f = window.f;
        if (!f.COURSES[id]) await f.loadAdventure2();
        const chapter = f.COURSES[id];
        const game = new f.Game(chapter, {}, {});
        const canvas = document.getElementById('game');
        const view = f.createView(canvas, chapter, 'high', false);
        await view.ready;
        await window.settle(view, game);
        const fps = 30, dt = 1 / fps, W = 640, H = 360, cols = 3;
        const rows = Math.ceil(times.length / cols);
        const sheet = document.createElement('canvas');
        sheet.width = W * cols; sheet.height = H * rows;
        const g = sheet.getContext('2d');
        g.font = 'bold 26px sans-serif';
        let ahead = false, offered = false, frame = 0;
        for (const [i, t] of times.entries()) {
          while (frame * dt < t) {
            const d = f.decide(game, chapter);
            game.frame(dt, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !ahead, act: d.offered && !offered, helper: false });
            ahead = d.ahead; offered = d.offered; frame++;
            if (t - frame * dt < 1.5) {
              window.draw(view, game, dt);
              // Copied before yielding: the drawing buffer is gone once the browser has shown it.
              if (frame * dt >= t) g.drawImage(canvas, (i % cols) * W, Math.floor(i / cols) * H, W, H);
              await new Promise(r => setTimeout(r, 0));
            }
          }
          const label = `${id} ${t}s  x=${game.sim.curr.x.toFixed(1)} ${game.sim.sceneFrame ? game.sim.sceneFrame.id + '@' + game.sim.sceneFrame.seconds.toFixed(1) : ''}`;
          g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect((i % cols) * W, Math.floor(i / cols) * H, W, 36);
          g.fillStyle = '#fff'; g.fillText(label, (i % cols) * W + 8, Math.floor(i / cols) * H + 27);
        }
        return sheet.toDataURL('image/jpeg', 0.85);
      }, { id, times: WANT[id] }).catch(e => { console.log(id, 'failed', String(e)); return null; });
      if (sheet) writeFileSync(new URL(`${id}.jpg`, out), Buffer.from(sheet.split(',')[1], 'base64'));
      console.log(id, errors.length ? errors.slice(0, 3) : 'ok');
      await page.close();
    }
  }));
} finally {
  await h.close();
}
