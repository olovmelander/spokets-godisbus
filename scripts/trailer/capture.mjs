// Captures every game shot of the cut, frame by frame on the game's own clock: drawn at 4K on the GPU, cropped by a
// virtual camera operator that leans towards Elof, and scaled down to 1080p JPEG frames.
// node scripts/trailer/capture.mjs [A1,B2,...]   (PARALLEL=n pages at a time; VIEW=1280x720 CSS pixels, DSF=3)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { start, WORK } from './harness.mjs';
import { FPS, HANDLE, timeline } from './cut.mjs';

const only = process.argv[2]?.split(',');
// 1280x720 CSS pixels: the game frames Elof as on a laptop (about 140 px tall), drawn three times as dense.
const [RW, RH] = (process.env.VIEW ?? '1280x720').split('x').map(Number);
const DSF = Number(process.env.DSF ?? 3);
const parallel = Number(process.env.PARALLEL ?? 5);
const shots = timeline().shots.filter(s => s.chapter && (!only || only.includes(s.id)));
const h = await start({ width: RW, height: RH });
const began = Date.now();
try {
  const queue = [...shots];
  await Promise.all(Array.from({ length: parallel }, async () => {
    while (queue.length) {
      const shot = queue.shift();
      const dir = new URL(`frames/${shot.id}/`, WORK);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const { page, errors } = await h.page({ w: RW, h: RH, dsf: DSF });
      await page.exposeFunction('saveFrame', (index, b64) => writeFileSync(new URL(`${String(index).padStart(4, '0')}.jpg`, dir), Buffer.from(b64, 'base64')));
      const t0 = Date.now();
      const result = await page.evaluate(async ({ shot, FPS, HANDLE }) => {
        const f = window.f;
        if (!f.COURSES[shot.chapter]) await f.loadAdventure2();
        const chapter = f.COURSES[shot.chapter];
        const game = new f.Game(chapter, {}, { flags: shot.flags ?? [] });
        const canvas = document.getElementById('game');
        const view = f.createView(canvas, chapter, 'high', false);
        await view.ready;
        const models = await window.settle(view, game);
        const dt = 1 / FPS;
        const W = canvas.width, H = canvas.height, OW = 1920, OH = 1080;
        const out = new OffscreenCanvas(OW, OH);
        const g = out.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        const first = shot.t - HANDLE, last = shot.t + shot.seconds + HANDLE, warm = first - 2.5;
        const count = Math.round((last - first) * FPS);
        let ahead = false, offered = false, frame = 0, saved = 0, cx = W / 2, cy = H / 2, aimed = false;
        const pending = [];
        while (saved < count) {
          const d = f.decide(game, chapter);
          game.frame(dt, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !ahead, act: d.offered && !offered, helper: false });
          ahead = d.ahead; offered = d.offered; frame++;
          const now = frame * dt;
          if (now < warm) continue;
          window.draw(view, game, dt);
          // The operator: aim between the frame's middle and Elof, and follow smoothly.
          const p = game.sim.curr;
          const g0 = game.sim.ghost;
          const s = shot.aim === 'ghost' && g0 ? view.worldScreen({ x: g0.x, y: g0.y + 0.5 }) : view.worldScreen({ x: p.x, y: p.y + 0.55 });
          const scale = W / canvas.getBoundingClientRect().width;
          const tx = s ? W / 2 + (s.x * scale - W / 2) * shot.follow : W / 2;
          const ty = s ? H / 2 + (s.y * scale - H / 2) * shot.follow : H / 2;
          if (!aimed) { cx = tx; cy = ty; aimed = true; }
          const k = 1 - Math.exp(-dt / 0.7);
          cx += (tx - cx) * k; cy += (ty - cy) * k;
          if (now < first - 1e-6) continue;
          const u = (now - first) / (last - first);
          const ease = u * u * (3 - 2 * u);
          const z = shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * ease;
          const cw = W / z, ch = H / z;
          const x = Math.min(W - cw, Math.max(0, cx - cw / 2)), y = Math.min(H - ch, Math.max(0, cy - ch / 2));
          // Copied now: the drawing buffer is gone once the browser has shown it.
          g.drawImage(canvas, x, y, cw, ch, 0, 0, OW, OH);
          const blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          pending.push(window.saveFrame(saved++, btoa(bin)));
          if (pending.length > 8) await pending.shift();
        }
        await Promise.all(pending);
        return { saved, models, info: { tier: view.info().tier, drawCalls: view.info().drawCalls, width: W, height: H } };
      }, { shot, FPS, HANDLE }).catch(e => ({ error: String(e) }));
      console.log(shot.id, shot.chapter, result.error ?? `${result.saved} frames ${result.info.width}x${result.info.height} ${result.info.drawCalls} draws, ${((Date.now() - t0) / 1000).toFixed(1)} s`,
        result.models?.filter(m => m.startsWith('private/')).join(' ') ?? '', errors.length ? errors.slice(0, 3) : '');
      await page.close();
    }
  }));
} finally {
  await h.close();
}
console.log(`done in ${((Date.now() - began) / 1000).toFixed(0)} s`);
