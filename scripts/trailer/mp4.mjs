// A small MP4 writer for one H.264 track and one AAC track, as WebCodecs hands them over: the moov first
// (fast start), then every sample in one mdat. Each sample is its own chunk, so stsc has one entry.

const u8 = (n) => Buffer.from([n & 0xff]);
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const i32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const str = (s) => Buffer.from(s, 'latin1');
const zeros = (n) => Buffer.alloc(n);
function box(type, ...parts) {
  const body = Buffer.concat(parts.flat());
  return Buffer.concat([u32(body.length + 8), str(type), body]);
}
const full = (type, version, flags, ...parts) => box(type, u8(version), u8(flags >> 16), u16(flags & 0xffff), ...parts);
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32);

function descriptor(tag, body) {
  // Sizes are written in the four-byte form that every reader accepts.
  const n = body.length;
  return Buffer.concat([u8(tag), u8(0x80 | ((n >> 21) & 0x7f)), u8(0x80 | ((n >> 14) & 0x7f)), u8(0x80 | ((n >> 7) & 0x7f)), u8(n & 0x7f), body]);
}

function tables(samples, delta, offsets, keys) {
  const stts = full('stts', 0, 0, u32(1), u32(samples.length), u32(delta));
  const stsc = full('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1));
  const stsz = full('stsz', 0, 0, u32(0), u32(samples.length), samples.map((s) => u32(s.length)));
  const stco = full('stco', 0, 0, u32(offsets.length), offsets.map(u32));
  const stss = keys ? full('stss', 0, 0, u32(keys.length), keys.map(u32)) : Buffer.alloc(0);
  return [stts, stss, stsc, stsz, stco];
}

/**
 * video: { width, height, timescale, delta, avcC: Buffer, samples: Buffer[], keys: boolean[] }
 * audio: { sampleRate, channels, asc: Buffer, samples: Buffer[], bitrate }
 */
export function writeMp4({ video, audio }) {
  const ftyp = box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));
  const videoSeconds = (video.samples.length * video.delta) / video.timescale;
  const audioSeconds = (audio.samples.length * 1024) / audio.sampleRate;
  const movieMs = Math.round(Math.max(videoSeconds, audioSeconds) * 1000);

  const build = (videoOffsets, audioOffsets) => {
    const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movieMs), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(3));
    const vTkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(Math.round(videoSeconds * 1000)), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX,
      u32(video.width << 16), u32(video.height << 16));
    const avc1 = box('avc1', zeros(6), u16(1), zeros(16), u16(video.width), u16(video.height), u32(0x00480000), u32(0x00480000), u32(0), u16(1),
      zeros(32), u16(0x18), i32(-1).subarray(2), box('avcC', video.avcC));
    const vStbl = box('stbl', full('stsd', 0, 0, u32(1), avc1), ...tables(video.samples, video.delta, videoOffsets,
      video.keys.flatMap((k, i) => (k ? [i + 1] : []))));
    const dinf = box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1)));
    const vTrak = box('trak', vTkhd, box('mdia',
      full('mdhd', 0, 0, u32(0), u32(0), u32(video.timescale), u32(video.samples.length * video.delta), u16(0x55c4), u16(0)),
      full('hdlr', 0, 0, u32(0), str('vide'), zeros(12), str('VideoHandler\0')),
      box('minf', full('vmhd', 0, 1, zeros(8)), dinf, vStbl)));

    const esds = full('esds', 0, 0, descriptor(3, Buffer.concat([u16(2), u8(0),
      descriptor(4, Buffer.concat([u8(0x40), u8(0x15), u8(0), u16(0), u32(audio.bitrate), u32(audio.bitrate), descriptor(5, audio.asc)])),
      descriptor(6, u8(2))])));
    const mp4a = box('mp4a', zeros(6), u16(1), zeros(8), u16(audio.channels), u16(16), u16(0), u16(0), u32(audio.sampleRate << 16), esds);
    const aStbl = box('stbl', full('stsd', 0, 0, u32(1), mp4a), ...tables(audio.samples, 1024, audioOffsets, null));
    const aTkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(2), u32(0), u32(Math.round(audioSeconds * 1000)), zeros(8), u16(0), u16(1), u16(0x0100), u16(0), MATRIX, u32(0), u32(0));
    const aTrak = box('trak', aTkhd, box('mdia',
      full('mdhd', 0, 0, u32(0), u32(0), u32(audio.sampleRate), u32(audio.samples.length * 1024), u16(0x55c4), u16(0)),
      full('hdlr', 0, 0, u32(0), str('soun'), zeros(12), str('SoundHandler\0')),
      box('minf', full('smhd', 0, 0, zeros(4)), dinf, aStbl)));
    return box('moov', mvhd, vTrak, aTrak);
  };

  // The moov's size does not depend on the offsets' values, so build it once to measure, then with real offsets.
  const measure = build(video.samples.map(() => 0), audio.samples.map(() => 0));
  let at = ftyp.length + measure.length + 8;
  // Interleave by time, about half a second at a time, so that a player streaming the file never starves.
  const order = [];
  let vi = 0, ai = 0;
  while (vi < video.samples.length || ai < audio.samples.length) {
    const vt = vi < video.samples.length ? (vi * video.delta) / video.timescale : Infinity;
    const atime = ai < audio.samples.length ? (ai * 1024) / audio.sampleRate : Infinity;
    if (vt <= atime) order.push(['v', vi++]); else order.push(['a', ai++]);
  }
  const videoOffsets = new Array(video.samples.length), audioOffsets = new Array(audio.samples.length);
  for (const [kind, i] of order) {
    if (kind === 'v') { videoOffsets[i] = at; at += video.samples[i].length; }
    else { audioOffsets[i] = at; at += audio.samples[i].length; }
  }
  const moov = build(videoOffsets, audioOffsets);
  if (moov.length !== measure.length) throw new Error('moov changed size');
  const payload = order.map(([kind, i]) => (kind === 'v' ? video.samples[i] : audio.samples[i]));
  const mdatSize = payload.reduce((n, b) => n + b.length, 0) + 8;
  return [ftyp, moov, u32(mdatSize), str('mdat'), ...payload];
}
