// Cuts the trailer: node scripts/trailer/compose.mjs [--stills 1.0,7.5,...] [--out name] [--size 1280x720] [--bitrate 5000000]
// Stills: review frames of the finished cut. Otherwise: the whole trailer as an MP4 (H.264 + AAC) and its sound as WAV.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { start, WORK } from './harness.mjs';
import { ACTS, FPS, HANDLE, timeline } from './cut.mjs';
import { writeMp4 } from './mp4.mjs';

const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const name = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'trailer';
const [VW, VH] = (args.includes('--size') ? args[args.indexOf('--size') + 1] : '1920x1080').split('x').map(Number);
const bitrate = Number(args.includes('--bitrate') ? args[args.indexOf('--bitrate') + 1] : 12e6);
const out = new URL('out/', WORK);
mkdirSync(out, { recursive: true });

const { shots, seconds } = timeline();
const plan = { shots, seconds, FPS, HANDLE, acts: ACTS.map(a => ({ id: a.id, tempo: a.tempo, arrangement: a.arrangement })) };
console.log(`cut: ${shots.length} shots, ${seconds.toFixed(2)} s`);
for (const s of shots) console.log(`  ${s.id.padEnd(3)} ${s.start.toFixed(2).padStart(6)} +${s.seconds.toFixed(2)} ${s.chapter ?? (s.card ? 'card' : 'end card')}`);

const h = await start({ width: 640, height: 360 });
try {
  const { page, errors } = await h.page({ w: 640, h: 360 });
  await page.route('**/trailer-frames/**', (route) => {
    const path = new URL(`frames/${new URL(route.request().url()).pathname.replace('/trailer-frames/', '')}`, WORK);
    if (!existsSync(path)) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: 'image/jpeg', body: readFileSync(path) });
  });
  const video = [], audio = [];
  let avcC = null, asc = null;
  await page.exposeFunction('trailerLog', (m) => console.log('  page:', m));
  await page.exposeFunction('trailerVideo', (i, key, data) => { video[i] = { key, data: Buffer.from(data, 'base64') }; });
  await page.exposeFunction('trailerAudio', (i, data) => { audio[i] = Buffer.from(data, 'base64'); });
  await page.exposeFunction('trailerVideoConfig', (d) => { avcC = Buffer.from(d, 'base64'); });
  await page.exposeFunction('trailerAudioConfig', (d) => { asc = Buffer.from(d, 'base64'); });
  await page.exposeFunction('trailerWav', (d) => {
    const pcm = Buffer.from(d, 'base64');
    const head = Buffer.alloc(44);
    head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVE', 8); head.write('fmt ', 12);
    head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(48000, 24);
    head.writeUInt32LE(48000 * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
    writeFileSync(new URL(`${name}.wav`, out), Buffer.concat([head, pcm]));
  });
  await page.addScriptTag({ type: 'module', content: `${readFileSync(new URL('./compose-page.js', import.meta.url), 'utf8').replaceAll(/^export /gm, '')}
    window.compose = { loadFonts, setPlan, still, encode };
    window.composeReady = true;` });
  await page.waitForFunction(() => window.composeReady === true);
  await page.evaluate(async (plan) => { await window.compose.loadFonts(); window.compose.setPlan(plan); }, plan);
  if (stills) {
    for (const t of stills) {
      const url = await page.evaluate((t) => window.compose.still(t), t);
      writeFileSync(new URL(`still-${t.toFixed(2)}.jpg`, out), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log(`${stills.length} stills in ${out.pathname}`);
  } else {
    const began = Date.now();
    const result = await page.evaluate((o) => window.compose.encode(o), { width: VW, height: VH, bitrate });
    console.log(`encoded ${result.frames} frames in ${((Date.now() - began) / 1000).toFixed(0)} s; reordered=${result.reordered}; ${video.length} video / ${audio.length} audio chunks`);
    if (result.reordered) throw new Error('The encoder reordered frames; the writer has no ctts.');
    const parts = writeMp4({
      video: { width: VW, height: VH, timescale: FPS * 1000, delta: 1000, avcC, samples: video.map(v => v.data), keys: video.map(v => v.key) },
      audio: { sampleRate: 48000, channels: 2, asc, samples: audio, bitrate: 192000 },
    });
    const file = new URL(`${name}.mp4`, out);
    writeFileSync(file, Buffer.concat(parts));
    console.log(`wrote ${file.pathname} (${(parts.reduce((n, p) => n + p.length, 0) / 1e6).toFixed(1)} MB)`);
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
} finally {
  await h.close();
}
