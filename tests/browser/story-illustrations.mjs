// Shared authored vectors must remain the same picture in a canvas thought and an SVG memory page.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = join(root, 'scratch/story-illustrations'); mkdirSync(out, { recursive: true });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, watch: null } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/art-review', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/spokets-godisbus/art-review`);
  await page.evaluate(async () => {
    const art = await import('/spokets-godisbus/src/ui/story-illustrations.ts');
    const { MEMORIES } = await import('/spokets-godisbus/src/ui/memory-art.ts');
    const { strokeHtml } = await import('/spokets-godisbus/src/ui/story-stroke.ts');
    window.art = art;
    window.keys = ['mountain', 'pine-crack', 'vittror', 'small-figure', 'old-stone', 'old-window', 'lonely-hollow', 'northbound', 'wind-posts', 'raft', 'outlet-pair', 'safe-harbour', 'family-lamps', 'family-breakfast', 'moa-drawing'];
    document.head.innerHTML = '<style>body{margin:0;background:#ede4d0;color:#413b3a;font:16px sans-serif;padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0}svg{display:block;width:100%;height:auto;border-radius:12px}figcaption{padding:7px}</style>';
    document.body.innerHTML = window.keys.map(key => `<figure>${art.storyIllustration(key)}<figcaption>${key}</figcaption></figure>`).join('')
      + Object.entries(MEMORIES).flatMap(([chapter, pages]) => pages.map((svg, n) => `<figure>${svg}<figcaption>${chapter} ${n+1}</figcaption></figure>`)).join('');
    const holder = document.createElement('figure'); holder.innerHTML = strokeHtml; holder.querySelector('#strokeBody').hidden = false;
    holder.querySelector('#paintGhost').remove(); holder.querySelector('#strokeAssist').remove(); document.body.append(holder);
    const carving = holder.cloneNode(true); carving.querySelector('#paintingPicture').remove(); carving.querySelector('#carvingPicture').removeAttribute('visibility'); document.body.append(carving);
  });
  const comparison = await page.evaluate(async () => {
    const { art, keys } = window, results = [];
    for (const key of keys) {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 400;
      const context = canvas.getContext('2d'); context.scale(2, 2); art.paintStoryIllustration(context, key);
      const reference = document.createElement('canvas'); reference.width = 640; reference.height = 400;
      const img = new Image();
      const svg = art.storyIllustration(key).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode(); reference.getContext('2d').drawImage(img, 0, 0, 640, 400);
      const a = context.getImageData(0,0,640,400).data, b = reference.getContext('2d').getImageData(0,0,640,400).data;
      let changed = 0, opaque = 0;
      // Exclude the SVG-only decorative paper edge; compare interior paint including all transforms and gradients.
      for (let y=16;y<384;y++) for(let x=16;x<624;x++) { const i=(y*640+x)*4; if(a[i+3]>250) opaque++; if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))>32) changed++; }
      results.push({ key, different: changed/(608*368), opaque: opaque/(608*368) });
    }
    return results;
  });
  for (const result of comparison) { assert.ok(result.opaque > .99, `${result.key}: no missing paint`); assert.ok(result.different < .03, `${result.key}: canvas/SVG mismatch ${JSON.stringify(result)}`); console.log('PASS', result); }
  await page.screenshot({ path: join(out, 'contact-sheet.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: 'body{grid-template-columns:1fr;padding:12px;gap:12px}' });
  await page.screenshot({ path: join(out, 'phone.png'), fullPage: true });
  assert.deepEqual(errors, []);
} finally { await browser.close(); await server.close(); }
