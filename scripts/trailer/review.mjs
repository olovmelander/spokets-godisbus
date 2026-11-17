// Review sheets: four frames of each captured shot, one shot to a row.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { FPS, HANDLE, timeline } from './cut.mjs';
import { WORK } from './harness.mjs';

const only = process.argv[2]?.split(',');
const shots = timeline().shots.filter(s => s.chapter && (!only || only.includes(s.id)));
const rows = shots.map(s => {
  const n = Math.round((s.seconds + 2 * HANDLE) * FPS);
  return { label: `${s.id} ${s.chapter} t=${s.t}`, frames: [0.12, 0.4, 0.65, 0.9].map(u => {
    const i = Math.min(n - 1, Math.round(HANDLE * FPS + u * s.seconds * FPS));
    const path = new URL(`frames/${s.id}/${String(i).padStart(4, '0')}.jpg`, WORK);
    return existsSync(path) ? `data:image/jpeg;base64,${readFileSync(path).toString('base64')}` : null;
  }) };
});
const browser = await chromium.launch();
const page = await browser.newPage();
for (let sheet = 0; sheet * 7 < rows.length; sheet++) {
  const part = rows.slice(sheet * 7, sheet * 7 + 7);
  const url = await page.evaluate(async (part) => {
    const c = document.createElement('canvas');
    c.width = 1920; c.height = 270 * part.length;
    const g = c.getContext('2d');
    g.font = 'bold 22px sans-serif';
    for (const [r, row] of part.entries()) {
      for (const [i, src] of row.frames.entries()) {
        if (!src) continue;
        const img = new Image(); img.src = src; await img.decode();
        g.drawImage(img, i * 480, r * 270, 480, 270);
      }
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, r * 270, 300, 30);
      g.fillStyle = '#fff'; g.fillText(row.label, 6, r * 270 + 22);
    }
    return c.toDataURL('image/jpeg', 0.85);
  }, part);
  writeFileSync(new URL(`review-${sheet + 1}.jpg`, WORK), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
