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
    const { spriteHtml } = await import('/spokets-godisbus/src/ui/sprite.ts');
    const { strokeHtml } = await import('/spokets-godisbus/src/ui/story-stroke.ts');
    window.art = art;
    const descriptions = {
      mountain:'Granskogen: berget i fjärran', 'pine-crack':'Myren: den gamla tallen och sprickan', vittror:'Granskogen: bilden vid vittrans dörr',
      'small-figure':'Stormbyn: Lillgubben och hans mössa', 'old-stone':'Billsta: trägubben väntar på stenen', 'old-window':'Stormgården: den gamla vännen ensam inne',
      'window-escape':'Stormkvällen: fönstret blåser upp', 'lonely-hollow':'Berget: ensam nere i sprickan', 'forest-trail':'Stormskogen: följer Lillgubbens spår',
      northbound:'Olympia: vinden för dem norrut', 'wind-posts':'Flärken: Elof och Klonk i lä', raft:'Älven: Elof och Klonk på flotten',
      'outlet-pair':'Utloppet: trägubbarna driver tillsammans', 'safe-harbour':'Billsta: den gamla vännen håller Lillgubben',
      'cap-return':'Stormens öga: Lillgubben får sin mössa', 'family-lamps':'Stormens öga: familjens lampor',
      'family-breakfast':'Morgonen: frukost tillsammans', 'moa-drawing':'Moas teckning: liten av stjärnan, stor av godiset',
    };
    const names = {elof:'Elof',moa:'Moa',bertil:'Bertil',mamma:'Mamma Sofie',pappa:'Pappa Emil',mormor:'Mormor',morfar:'Morfar'};
    const chapterNames = {garden:'Gården',granskog:'Granskogen',myren:'Myren',berget:'Berget'};
    const { sv } = await import('/spokets-godisbus/src/content/sv.ts');
    window.keys = Object.keys(descriptions);
    document.head.innerHTML = '<style>body{margin:0;background:#ede4d0;color:#413b3a;font:16px sans-serif;padding:20px}h2{font-size:22px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0}figure>svg{display:block;width:100%;height:auto;border-radius:12px}figcaption{padding:7px;line-height:1.4}section{margin-bottom:24px}</style>';
    const section = (name,title,inside) => `<section data-section="${name}"><h2>${title}</h2><div class="grid">${inside}</div></section>`;
    document.body.innerHTML = spriteHtml() + section('family','Familjen i teckningarna',Object.entries(names).map(([who,name])=>`<figure><svg viewBox="0 0 320 200"><rect width="320" height="200" fill="#fff3d4"/>${art.storyPerson(who,145,190,172,{pack:true})}<svg x="232" y="17" width="68" height="64" viewBox="0 0 68 64">${art.storyPortrait(who)}</svg></svg><figcaption>${name}</figcaption></figure>`).join(''))
      + section('story','Bilder från äventyren',window.keys.map(key => `<figure>${art.storyIllustration(key)}<figcaption>${descriptions[key]}</figcaption></figure>`).join(''))
      + section('memories','När Elof var liten',Object.entries(MEMORIES).flatMap(([chapter,pages])=>pages.map((svg,n)=>`<figure>${svg}<figcaption>${chapterNames[chapter]} · ${n+1}<br>${sv.memories.chapters[chapter]?.captions?.[n] ?? ''}</figcaption></figure>`)).join(''));
    const holder = document.createElement('figure'); holder.innerHTML = strokeHtml; holder.querySelector('#strokeBody').hidden = false;
    holder.querySelector('#paintGhost').remove(); holder.querySelector('#strokeAssist').remove();
    const carving = holder.cloneNode(true); carving.querySelector('#paintingPicture').remove(); carving.querySelector('#carvingPicture').removeAttribute('visibility');
    holder.insertAdjacentHTML('beforeend','<figcaption>Epilogen: Elof målar ögonen</figcaption>');
    carving.insertAdjacentHTML('beforeend','<figcaption>Epilogen: Pappa hjälper Elof att tälja</figcaption>');
    const last = document.createElement('section');last.dataset.section='carving';last.innerHTML='<h2>Den nya lilla vännen</h2><div class="grid"></div>';
    last.lastChild.append(holder,carving);document.body.append(last);
  });
  assert.equal(await page.locator('#i-carving-hands').count(), 1, 'Carving review includes the real sleeve, helping hand and knife sprite');
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
  for (const name of ['family','story','memories','carving']) await page.locator(`[data-section=${name}]`).screenshot({path:join(out,`${name}.png`)});
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: 'body{padding:12px}.grid{grid-template-columns:1fr;gap:12px}' });
  await page.screenshot({ path: join(out, 'phone.png'), fullPage: true });
  assert.deepEqual(errors, []);
} finally { await browser.close(); await server.close(); }
