// Real DOM only: an asynchronous capture refresh must not lose keyboard focus when the album closes.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await createServer({ configFile: false, root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/photo-focus.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.goto(`${origin}photo-focus.html`);
  await page.evaluate(async () => {
    const { createPhotoAlbum, photoAlbumHtml } = await import('/src/ui/photos.ts');
    document.body.innerHTML = '<div id="pause"><button id="resume">Spela vidare</button><div id="albumPhotos"></div></div><div id="endCard" hidden><button id="endPhotos">Foton</button></div>' + photoAlbumHtml;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp'));
    window.framesForAlbum = ['swing', 'crane'].map((moment) => ({ moment, player: 'elof', blob }));
    window.testAlbum = createPhotoAlbum(document, { list: async () => window.framesForAlbum }, 'elof');
    await window.testAlbum.refresh();
  });
  const active = () => page.evaluate(() => ({ id: document.activeElement.id, moment: document.activeElement.dataset.photoMoment, visible: !!document.activeElement.getClientRects().length && !document.activeElement.closest('[hidden]') }));
  await page.locator('[data-photo-moment="crane"]').click();
  await page.evaluate(() => window.testAlbum.refresh());
  await page.locator('#photoClose').click();
  assert.deepEqual(await active(), { id: '', moment: 'crane', visible: true });
  console.log('  ok   refreshed album returns focus to the same moment’s replacement thumbnail');
  await page.locator('[data-photo-moment="crane"]').click();
  await page.evaluate(async () => { window.framesForAlbum = []; await window.testAlbum.refresh(); });
  await page.locator('#photoClose').click();
  assert.deepEqual(await active(), { id: 'resume', moment: undefined, visible: true });
  console.log('  ok   removed moment returns focus to a visible source control');
  await page.evaluate(() => { document.getElementById('pause').hidden = true; document.getElementById('endCard').hidden = false; window.testAlbum.credits(); });
  await page.evaluate(() => window.testAlbum.refresh());
  await page.locator('#photoClose').click();
  assert.deepEqual(await active(), { id: 'endPhotos', moment: undefined, visible: true });
  console.log('  ok   credits still return focus to the ending’s photo button');
  // The credits are the book's last pages: two photos to a spread, no count, and Klart only on the last page
  // (docs/ux-audit/story-presentation.md row 15).
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp'));
    window.framesForAlbum = ['shrinking', 'swing', 'crane'].map((moment) => ({ moment, player: 'elof', blob }));
    await window.testAlbum.refresh();
    document.getElementById('pause').hidden = true; document.getElementById('endCard').hidden = false; window.testAlbum.credits();
  });
  const spread = await page.evaluate(() => ({
    book: document.querySelector('.photo-panel').classList.contains('book'),
    prints: [...document.querySelectorAll('.photo-print')].filter((print) => !print.hidden).length,
    next: document.getElementById('photoNext').textContent,
  }));
  assert.deepEqual(spread, { book: true, prints: 2, next: '' });
  await page.locator('#photoNext').click();
  await page.locator('#photoNext').click();
  const last = await page.evaluate(() => ({ credits: !document.getElementById('photoCredits').hidden, next: document.getElementById('photoNext').textContent }));
  assert.deepEqual(last, { credits: true, next: 'Klart' });
  await page.locator('#photoClose').click();
  console.log('  ok   the credits are the book\'s last pages: two photos a spread, and Klart only on the last');
  console.log('4 photo-focus browser checks passed.');
} finally {
  await browser?.close();
  await server.close();
}
