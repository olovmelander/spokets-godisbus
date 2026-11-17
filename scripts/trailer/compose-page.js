// Runs in the page: mixes the trailer's sound offline, draws every frame of the cut with its titles, and encodes
// both with WebCodecs. The tune is the game's own (src/audio/music.ts): the same polska and the same plucked string.
const { music } = window.f;
const W = 1920, H = 1080, RATE = 48000;
const CREAM = '#fbf4e4';

export async function loadFonts() {
  const faces = [
    new FontFace('Playpen Sans', 'url(/spokets-godisbus/fonts/playpen-sans-700-sv.woff2)', { weight: '700' }),
    new FontFace('Andika', 'url(/spokets-godisbus/fonts/andika-latin-700-normal.woff2)', { weight: '700' }),
  ];
  for (const face of faces) document.fonts.add(await face.load());
}

// ---------------------------------------------------------------- sound

function noiseBuffer(ctx, seconds, seed = 1) {
  const b = ctx.createBuffer(1, Math.round(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = seed;
  for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
  return b;
}

export async function mix(plan) {
  const { shots, seconds, acts } = plan;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 3; comp.knee.value = 8; comp.attack.value = 0.004; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  const musicBus = ctx.createGain(); musicBus.connect(master);
  const voBus = ctx.createGain(); voBus.gain.value = 1.5; voBus.connect(master);
  const airBus = ctx.createGain(); airBus.connect(master);
  const noise = noiseBuffer(ctx, 4, 7);
  const strings = new Map();
  const stringOf = (midi, bright) => {
    const key = `${midi}:${bright}`;
    if (!strings.has(key)) {
      const data = music.pluck(music.frequencyOf(midi), music.RING, RATE, bright);
      const b = ctx.createBuffer(1, data.length, RATE); b.getChannelData(0).set(data); strings.set(key, b);
    }
    return strings.get(key);
  };
  const pan = (node, p) => { const s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s); return s; };
  function tone(bus, at, wave, from, to, len, level) {
    const o = ctx.createOscillator(); o.type = wave;
    o.frequency.setValueAtTime(from, at); if (to !== from) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(level, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(bus); o.start(at); o.stop(at + len + 0.02);
  }
  function puff(bus, at, kind, from, to, len, level, q = 1, attack = 0.01) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = kind; f.Q.value = q;
    f.frequency.setValueAtTime(from, at); if (to !== from) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(level, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(f).connect(g).connect(bus); s.start(at, (at * 0.37) % 2); s.stop(at + len + 0.05);
  }
  function play(list, at, bright, gain = 1, p = 0) {
    for (const s of list) {
      const from = at + s.at;
      if (s.voice === 'knock') {
        tone(musicBus, from, 'sine', music.frequencyOf(s.midi) * 2, music.frequencyOf(s.midi) * 1.4, s.seconds + 0.04, s.level * 0.9 * gain);
        puff(musicBus, from, 'bandpass', 1500, 900, 0.05, s.level * 0.6 * gain, 6, 0.003);
      } else if (s.voice === 'scrape') {
        puff(musicBus, from, 'bandpass', 2600, 1400, s.seconds, s.level * gain, 3);
      } else {
        const src = ctx.createBufferSource(); src.buffer = stringOf(s.midi, bright);
        const g = ctx.createGain();
        g.gain.setValueAtTime(s.level * gain, from); g.gain.setValueAtTime(s.level * gain, from + s.seconds - 0.06); g.gain.linearRampToValueAtTime(0, from + s.seconds);
        src.connect(g); pan(g, p).connect(musicBus); src.start(from); src.stop(from + s.seconds + 0.02);
      }
    }
  }
  const knock = (at, pitch, level) => { tone(musicBus, at, 'sine', pitch, pitch * 0.72, 0.06, level); puff(musicBus, at, 'bandpass', 1800, 1100, 0.035, level * 0.5, 6, 0.003); };

  // The tune, act by act. Each act starts the polska again from its first bar, with no rest between rounds.
  for (const act of acts) {
    const base = { ...music.ARRANGEMENTS[act.arrangement] ?? music.ARRANGEMENTS.dusk, tempo: act.tempo, rest: 0 };
    const bar = 180 / act.tempo;
    const actShots = shots.filter(s => s.act === act.id);
    const start = actShots[0].start, end = actShots.at(-1).start + actShots.at(-1).seconds;
    const bars = Math.round((end - start) / bar);
    for (let i = 0; i < bars; i++) {
      const at = start + i * bar;
      if (act.id === 'A') {
        // A solo string at breakfast; the bass comes in when the ghost wakes.
        play(music.barOf({ ...base, bass: i >= 3 }, i), at, 0.6, 0.9);
      } else if (act.id === 'B') {
        play(music.barOf({ ...base, bass: true, rhythm: 'knock' }, i), at, 0.85, 1);
        // Halfway through, the tune doubles an octave up: the adventure takes off.
        if (i >= 8) play(music.barOf({ ...base, bass: false, rhythm: 'none', transpose: 12 }, i).filter(s => s.voice === 'pluck'), at, 0.9, 0.38, 0.35);
      } else if (act.id === 'C') {
        if (i === 0) { play([{ voice: 'pluck', at: 0, midi: 50, seconds: 2.2, level: 0.6 }, { voice: 'pluck', at: 0.02, midi: 74, seconds: 2.2, level: 0.35 }], at, 0.4); continue; }
        if (i >= bars - 3) {
          // The title: the tune's close, slower, and its D held.
          if (i === bars - 3) play(music.cadenceOf({ ...base, bass: true }), at, 0.45, 0.95);
          continue;
        }
        play(music.barOf({ ...base, bass: true, rhythm: 'none' }, i - 1), at, 0.4, 0.95);
      } else if (act.id === 'D') {
        if (i >= bars - 3) { if (i === bars - 3) play(music.cadenceOf({ ...base, bass: true, rhythm: 'none' }), at, 0.6, 1); continue; }
        // The storm: the wood knocks under all of it; the strings come in after the first flash.
        const tuned = { ...base, bass: true, rhythm: 'knock' };
        const sounds = music.barOf(tuned, i);
        play(i < 2 ? sounds.filter(s => s.voice === 'knock' || s.midi < 55) : sounds, at, 0.7, 1);
        if (i >= 6) play(music.barOf({ ...tuned, transpose: -12, bass: false, rhythm: 'none' }, i).filter(s => s.voice === 'pluck'), at, 0.5, 0.45, -0.3);
      }
    }
  }

  // Air: birds in the summer acts, wind at night, rain and thunder in the storm.
  const actSpan = (id) => { const a = shots.filter(s => s.act === id); return [a[0].start, a.at(-1).start + a.at(-1).seconds]; };
  {
    const [b0, b1] = actSpan('B');
    let t = b0 + 0.7, k = 1;
    while (t < b1 - 0.5) {
      const f0 = 3000 + (k * 397) % 900;
      for (let j = 0; j < 3; j++) tone(airBus, t + j * 0.11, 'sine', f0 + j * 100, f0 + 1000 + j * 100, 0.07, 0.035);
      k++; t += 2.2 + (k * 1.7) % 2.5;
    }
  }
  function bed(t0, t1, kind, freq, q, level) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(level, t0 + 0.25); g.gain.setValueAtTime(level, t1 - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    s.connect(f).connect(g).connect(airBus); s.start(t0); s.stop(t1 + 0.05);
  }
  { const [c0, c1] = actSpan('C'); bed(c0, c1, 'lowpass', 260, 0.7, 0.05); }
  const [d0, d1] = actSpan('D');
  bed(d0, d1 - 1.5, 'bandpass', 3800, 0.6, 0.075);
  bed(d0, d1 - 1.5, 'lowpass', 380, 0.7, 0.06);
  function thunder(at, size = 1) {
    puff(airBus, at, 'bandpass', 2400, 600, 0.25, 0.5 * size, 0.8, 0.002);
    puff(airBus, at + 0.02, 'lowpass', 900, 70, 3.2, 0.9 * size, 0.7, 0.03);
    puff(airBus, at + 0.4, 'lowpass', 300, 60, 2.6, 0.7 * size, 0.7, 0.2);
  }

  // Effects, voices and their ducking.
  const ducks = [];
  const voices = [];
  for (const s of shots) {
    for (const [kind, off] of s.sfx ?? []) {
      const at = s.start + off;
      if (kind === 'thunder') thunder(at, off === 0 ? 1.2 : 0.8);
      if (kind === 'shimmer') {
        [86, 89, 93, 98, 101].forEach((m, j) => play([{ voice: 'pluck', at: j * 0.07, midi: m, seconds: 1.6, level: 0.32 }], at, 0.95, 1, j % 2 ? 0.4 : -0.4));
        puff(airBus, at, 'bandpass', 3000, 9000, 1.1, 0.06, 1.5, 0.3);
      }
    }
    if (s.card) { knock(s.start + 0.35, 430, 0.22); knock(s.start + 0.62, 520, 0.16); }
    if (s.endCard) { knock(s.start + s.seconds - 2.2, 430, 0.2); knock(s.start + s.seconds - 1.95, 520, 0.14); }
    for (const [key, off] of s.vo ?? []) {
      const res = await fetch(`/spokets-godisbus/audio/voices/${key}.mp3`);
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const at = s.start + off;
      const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(voBus); src.start(at);
      ducks.push([at, at + buffer.duration]);
      voices.push({ key, at: +at.toFixed(2), seconds: +buffer.duration.toFixed(2), shot: s.id, shotEnds: +(s.start + s.seconds).toFixed(2) });
    }
  }
  const lift = 0.62;
  musicBus.gain.setValueAtTime(lift, 0);
  for (const [a, b] of ducks) {
    musicBus.gain.setValueAtTime(lift, Math.max(0, a - 0.2));
    musicBus.gain.linearRampToValueAtTime(lift * 0.42, a);
    musicBus.gain.setValueAtTime(lift * 0.42, b);
    musicBus.gain.linearRampToValueAtTime(lift, b + 0.35);
  }
  // In and out.
  master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(1, 0.8);
  master.gain.setValueAtTime(1, seconds - 1.2); master.gain.linearRampToValueAtTime(0, seconds);

  const rendered = await ctx.startRendering();
  // Peak to -1 dBFS.
  let peak = 0;
  for (let c = 0; c < 2; c++) for (const v of rendered.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  const scale = 0.891 / (peak || 1);
  for (let c = 0; c < 2; c++) { const d = rendered.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= scale; }
  return { buffer: rendered, voices, peak };
}

// ---------------------------------------------------------------- picture

const bitmaps = new Map();
async function frameOf(shot, u) {
  const n = Math.round((shot.seconds + 2 * plan.HANDLE) * plan.FPS);
  const i = Math.max(0, Math.min(n - 1, Math.round((plan.HANDLE + u) * plan.FPS)));
  const key = `${shot.id}/${i}`;
  if (!bitmaps.has(key)) {
    const res = await fetch(`/trailer-frames/${shot.id}/${String(i).padStart(4, '0')}.jpg`);
    bitmaps.set(key, await createImageBitmap(await res.blob()));
  }
  return bitmaps.get(key);
}
function forget(before) {
  for (const [key, bmp] of bitmaps) {
    const [id] = key.split('/');
    const shot = plan.shots.find(s => s.id === id);
    if (shot.start + shot.seconds + 1 < before) { bmp.close(); bitmaps.delete(key); }
  }
}

let plan;
const canvas = new OffscreenCanvas(W, H);
const g = canvas.getContext('2d', { alpha: false });
const ease = (x) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };

function text(str, x, y, size, { font = 'Playpen Sans', alpha = 1, glow = 'rgba(255,186,96,.55)', color = CREAM, scale = 1 } = {}) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y); g.scale(scale, scale);
  g.font = `700 ${size}px "${font}"`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(10,6,20,.75)'; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.05;
  g.fillStyle = color; g.fillText(str, 0, 0);
  g.shadowColor = glow; g.shadowBlur = size * 0.55; g.shadowOffsetY = 0;
  g.fillText(str, 0, 0);
  g.restore();
}

/** The candy stripe under the title: the game's red-and-white sweets. */
function stripe(x, y, w, h, alpha) {
  g.save(); g.globalAlpha = alpha;
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.clip();
  g.fillStyle = '#fff6ea'; g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle = '#c4352b';
  for (let i = -h; i < w + h; i += h * 1.6) { g.beginPath(); g.moveTo(x - w / 2 + i, y + h / 2); g.lineTo(x - w / 2 + i + h * 0.8, y + h / 2); g.lineTo(x - w / 2 + i + h * 1.6, y - h / 2); g.lineTo(x - w / 2 + i + h * 0.8, y - h / 2); g.fill(); }
  g.restore();
}

function title(alpha, scale, y = H * 0.44) {
  text('Elof och det stora', W / 2, y - 92, 86, { alpha, scale });
  text('godisäventyret', W / 2, y + 30, 150, { alpha, scale });
  stripe(W / 2, y + 128, 420 * scale, 16 * scale, alpha * 0.95);
}

const XFADE = { A: 0.3, B: 0, C: 0.6, D: 0 };

export async function drawAt(T) {
  const shots = plan.shots;
  const i = shots.findIndex(s => T >= s.start && T < s.start + s.seconds);
  const shot = shots[Math.max(0, i === -1 ? shots.length - 1 : i)];
  const u = T - shot.start;
  g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const drawShot = async (s, at, alpha) => {
    if (!s.chapter) return;
    g.globalAlpha = alpha; g.drawImage(await frameOf(s, at), 0, 0, W, H); g.globalAlpha = 1;
  };
  if (shot.chapter) {
    await drawShot(shot, u, 1);
    // A dissolve, half before and half after the cut, within one act.
    const next = shots[shots.indexOf(shot) + 1], prev = shots[shots.indexOf(shot) - 1];
    const x = XFADE[shot.act];
    if (x && prev && prev.chapter && prev.act === shot.act && u < x / 2) await drawShot(prev, T - prev.start, 1 - ease(0.5 + u / x));
    if (x && next && next.chapter && next.act === shot.act && shot.start + shot.seconds - T < x / 2) await drawShot(next, T - next.start, ease(0.5 - (shot.start + shot.seconds - T) / x));
  }
  if (shot.fadeIn && u < shot.fadeIn) { g.fillStyle = `rgba(0,0,0,${1 - ease(u / shot.fadeIn)})`; g.fillRect(0, 0, W, H); }
  if (shot.id === 'D0') {
    // The flash that opens the storm: white, then the night.
    if (u < 0.5) { g.fillStyle = `rgba(235,242,255,${0.95 * (1 - ease(u / 0.5))})`; g.fillRect(0, 0, W, H); }
    const a = ease((u - 0.55) / 0.5) * (1 - ease((u - 2.9) / 0.5));
    if (a > 0) {
      g.fillStyle = `rgba(4,10,20,${0.35 * a})`; g.fillRect(0, 0, W, H);
      text('ÄVENTYR 2', W / 2, H * 0.40, 46, { font: 'Andika', alpha: a, glow: 'rgba(140,190,255,.5)' });
      text('Stormnatten', W / 2, H * 0.52, 140, { alpha: a, glow: 'rgba(140,190,255,.6)' });
    }
  }
  if (shot.card) {
    const a = ease(u / 0.45) * (1 - ease((u - shot.seconds + 0.45) / 0.45));
    text(shot.card, W / 2, H / 2, 74, { alpha: a, glow: 'rgba(255,200,120,.35)' });
  }
  if (shot.title !== undefined && u > shot.title) {
    const a = ease((u - shot.title) / 0.9);
    const shade = g.createLinearGradient(0, H * 0.45, 0, H);
    shade.addColorStop(0, 'rgba(4,8,24,0)'); shade.addColorStop(1, `rgba(4,8,24,${0.55 * a})`);
    g.fillStyle = shade; g.fillRect(0, 0, W, H);
    title(a, 0.95 + 0.05 * ease((u - shot.title) / 2.5), H * 0.76);
  }
  // Out of the heart act and the end card, to black.
  if (shot.id === 'C3' && shot.seconds - u < 0.9) { g.fillStyle = `rgba(0,0,0,${ease(1 - (shot.seconds - u) / 0.9)})`; g.fillRect(0, 0, W, H); }
  if (shot.id === 'D6' && shot.seconds - u < 0.6) { g.fillStyle = `rgba(0,0,0,${ease(1 - (shot.seconds - u) / 0.6)})`; g.fillRect(0, 0, W, H); }
  if (shot.endCard) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0b1626'); sky.addColorStop(1, '#1c3346');
    const a = ease(u / 0.7);
    g.globalAlpha = a; g.fillStyle = sky; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    title(a, 0.82, H * 0.42);
    text('Äventyr 1  ·  Äventyr 2: Stormnatten', W / 2, H * 0.70, 44, { font: 'Andika', alpha: ease((u - 0.8) / 0.7), glow: 'rgba(140,190,255,.35)' });
    if (shot.seconds - u < 1.2) { g.fillStyle = `rgba(0,0,0,${ease(1 - (shot.seconds - u) / 1.2)})`; g.fillRect(0, 0, W, H); }
  }
  forget(T);
  return canvas;
}

export function setPlan(p) { plan = p; }

/** A still of the cut at second T, as a JPEG data URL, for review. */
export async function still(T) {
  await drawAt(T);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
}

const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

export async function encode({ bitrate = 12e6, audioBitrate = 192000, width = W, height = H } = {}) {
  const small = width !== W ? new OffscreenCanvas(width, height) : null;
  const sg = small?.getContext('2d', { alpha: false });
  if (sg) sg.imageSmoothingQuality = 'high';
  const frames = Math.round(plan.seconds * plan.FPS);
  // Sound first, so that it can be checked and saved beside the picture.
  const { buffer, voices, peak } = await mix(plan);
  window.trailerLog(JSON.stringify({ voices, peak }));
  const wav = new Int16Array(buffer.length * 2);
  const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  for (let i = 0; i < buffer.length; i++) { wav[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; wav[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  await window.trailerWav(b64(new Uint8Array(wav.buffer)));

  let audioCfg = null;
  const audioOut = [];
  const aenc = new AudioEncoder({
    output: (chunk, meta) => { if (meta?.decoderConfig?.description && !audioCfg) audioCfg = new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); audioOut.push(d); },
    error: (e) => window.trailerLog('audio error ' + e),
  });
  aenc.configure({ codec: 'mp4a.40.2', sampleRate: RATE, numberOfChannels: 2, bitrate: audioBitrate });
  for (let at = 0; at < buffer.length; at += 1024) {
    const n = Math.min(1024, buffer.length - at);
    const data = new Float32Array(n * 2);
    data.set(L.subarray(at, at + n), 0); data.set(R.subarray(at, at + n), n);
    aenc.encode(new AudioData({ format: 'f32-planar', sampleRate: RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(at / RATE * 1e6), data }));
  }
  await aenc.flush();
  for (const [i, d] of audioOut.entries()) await window.trailerAudio(i, b64(d));
  await window.trailerAudioConfig(b64(audioCfg));

  let videoCfg = null, lastTs = -1, reordered = false, seq = 0;
  const pending = [];
  const venc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !videoCfg) videoCfg = new Uint8Array(meta.decoderConfig.description);
      if (chunk.timestamp < lastTs) reordered = true;
      lastTs = chunk.timestamp;
      const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
      pending.push(window.trailerVideo(seq++, chunk.type === 'key', b64(d)));
    },
    error: (e) => window.trailerLog('video error ' + e),
  });
  venc.configure({ codec: width > 1280 ? 'avc1.640028' : 'avc1.64001f', width, height, bitrate, bitrateMode: 'variable', framerate: plan.FPS, avc: { format: 'avc' }, latencyMode: 'quality' });
  for (let n = 0; n < frames; n++) {
    await drawAt(n / plan.FPS);
    if (sg) sg.drawImage(canvas, 0, 0, width, height);
    const frame = new VideoFrame(small ?? canvas, { timestamp: Math.round(n * 1e6 / plan.FPS), duration: Math.round(1e6 / plan.FPS) });
    venc.encode(frame, { keyFrame: n % (plan.FPS * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
    if (n % 150 === 0) window.trailerLog(`frame ${n}/${frames}`);
  }
  await venc.flush();
  await Promise.all(pending);
  await window.trailerVideoConfig(b64(videoCfg));
  return { frames, reordered, audioChunks: audioOut.length };
}
