// Checks the finished file: Chrome plays it with picture and sound, frames at chosen seconds, and the sound's loudness
// (ITU-R BS.1770: K-weighting, 400 ms blocks, absolute and relative gates) from the WAV beside it.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { WORK } from './harness.mjs';

const name = process.argv[2] ?? 'trailer';
const at = (process.argv[3] ?? '3,12,30,45,62,70,74,94,99').split(',').map(Number);
const mp4 = readFileSync(new URL(`out/${name}.mp4`, WORK));

// Loudness.
const wav = readFileSync(new URL(`out/${name}.wav`, WORK));
const pcm = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);
const n = pcm.length / 2, rate = 48000;
const biquad = (x, [b0, b1, b2, a1, a2]) => { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
const SHELF = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
const HIGH = [1, -2, 1, -1.99004745483398, 0.99007225036621];
const chans = [0, 1].map(c => { const x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = pcm[2 * i + c] / 32768; return biquad(biquad(x, SHELF), HIGH); });
function loudness(from = 0, to = n / rate) {
  const block = 0.4 * rate, hop = 0.1 * rate, blocks = [];
  for (let s = Math.round(from * rate); s + block <= Math.min(n, to * rate); s += hop) {
    let z = 0; for (const ch of chans) { let sum = 0; for (let i = s; i < s + block; i++) sum += ch[i] * ch[i]; z += sum / block; }
    blocks.push(z);
  }
  const L = (z) => -0.691 + 10 * Math.log10(z);
  const abs = blocks.filter(z => L(z) > -70);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const rel = L(mean(abs)) - 10;
  return L(mean(abs.filter(z => L(z) > rel)));
}
let peak = 0; for (const v of pcm) peak = Math.max(peak, Math.abs(v));
console.log(`  integrated ${loudness().toFixed(1)} LUFS, peak ${(20 * Math.log10(peak / 32768)).toFixed(1)} dBFS`);
for (const [a, b, what] of [[0, 24.4, 'Act A'], [24.4, 52.3, 'Act B'], [52.3, 72.3, 'Act C'], [72.3, 101.2, 'Act D']]) console.log(`  ${what}: ${loudness(a, b).toFixed(1)} LUFS`);

// Playback.
// A local server with byte ranges, as a real host serves a video.
const server = createServer((req, res) => {
  if (!req.url.endsWith('.mp4')) { res.writeHead(200, { 'content-type': 'text/html' }).end('<body style="margin:0"><video id="v" muted playsinline></video></body>'); return; }
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '');
  if (!range) { res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': mp4.length, 'accept-ranges': 'bytes' }).end(mp4); return; }
  const a = Number(range[1]), b = range[2] ? Number(range[2]) : mp4.length - 1;
  res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': `bytes ${a}-${b}/${mp4.length}`, 'content-length': b - a + 1, 'accept-ranges': 'bytes' }).end(mp4.subarray(a, b + 1));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(origin + "/");
const info = await page.evaluate(async (times) => {
  const v = document.getElementById('v');
  v.src = '/trailer.mp4';
  await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = () => bad(new Error('video error ' + v.error?.code)); });
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  const g = c.getContext('2d');
  const sheet = document.createElement('canvas'); sheet.width = 480 * 3; sheet.height = 270 * Math.ceil(times.length / 3);
  const s = sheet.getContext('2d');
  for (const [i, t] of times.entries()) {
    v.currentTime = t;
    await new Promise(r => { v.onseeked = r; });
    s.drawImage(v, (i % 3) * 480, Math.floor(i / 3) * 270, 480, 270);
    s.fillStyle = '#000a'; s.fillRect((i % 3) * 480, Math.floor(i / 3) * 270, 70, 26); s.fillStyle = '#fff'; s.font = '18px sans-serif'; s.fillText(t + ' s', (i % 3) * 480 + 6, Math.floor(i / 3) * 270 + 19);
  }
  // A few seconds of real playback, to see that sound is decoded too.
  v.currentTime = 20; await new Promise(r => { v.onseeked = r; });
  await v.play(); await new Promise(r => setTimeout(r, 1500)); v.pause();
  return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, audioBytes: v.webkitAudioDecodedByteCount, videoBytes: v.webkitVideoDecodedByteCount,
    dropped: v.getVideoPlaybackQuality?.().droppedVideoFrames, sheet: sheet.toDataURL('image/jpeg', 0.8) };
}, at);
writeFileSync(new URL(`out/${name}-check.jpg`, WORK), Buffer.from(info.sheet.split(',')[1], 'base64'));
delete info.sheet;
console.log(JSON.stringify(info));
await browser.close();
server.close();
