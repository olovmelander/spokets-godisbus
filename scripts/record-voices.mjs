// Records the game's voices with the cast Olov chose (12 November 2026) and with direction (regi), the way the
// Sköldhästen voices were made:
//   - each line is said as `say`: one short English direction tag in brackets before the words, never inside them,
//     and `say` without its tag is the line's own `text` (checked before anything is sent);
//   - Eleven v4, stability 0.35, no previous or next text;
//   - every take is heard back with speech-to-text: at least 85 % of the line's words, and no word of the tag, or it is
//     taken again (up to three takes; the best is kept and reported);
//   - the takes are levelled to one loudness afterwards (scripts/level-voices.py).
// Reads ELEVENLABS_API_KEY from .env. Writes public/audio/voices/<key>.mp3 and its manifest entry.
//
//   node scripts/record-voices.mjs --dry-run            the lines, their direction and the characters it would use
//   node scripts/record-voices.mjs --record [--only k1,k2] [--limit n]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VOICE_LINES } from './generate-voices.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'public', 'audio', 'voices');
const MANIFEST = join(OUT, 'manifest.json');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts', 'voices-config.json'), 'utf8'));
const REPORT = join(ROOT, 'scripts', 'voices-takes.json');

const env = Object.fromEntries(existsSync(join(ROOT, '.env'))
  ? readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
  : []);
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;

/** The words as they are heard: no punctuation, no capitals (src/audio/recorded.ts). */
const heard = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Each role's own direction when a line asks for nothing in particular, and the words in a line's old, longer
 * description that are direction (how it is said), not who says it.
 */
const DEFAULT_TAG = {
  elof: 'curious', moa: 'cheerful', bertil: 'confident', mamma: 'warm', pappa: 'warm', spoket: 'playful',
  mormor: 'warm', morfar: 'kind', storyteller: 'warm',
};
const MOODS = [
  'whispering', 'whisper', 'excited', 'happy', 'joyful', 'amazed', 'awed', 'curious', 'thoughtful', 'determined', 'proud',
  'relieved', 'gentle', 'warm', 'calm', 'soft', 'anxious', 'nervous', 'urgent', 'shouting', 'calling', 'surprised',
  'puzzled', 'playful', 'cheerful', 'tender', 'sad', 'quiet', 'grateful', 'breathless', 'brave', 'worried', 'scared',
  'laughing', 'teasing', 'sleepy', 'cozy', 'mysterious', 'comforting', 'reassuring', 'delighted', 'eager', 'triumphant',
  'frustrated', 'shivering', 'startled', 'hopeful', 'satisfied', 'affectionate', 'solemn', 'kind', 'confident',
  'encouraging', 'steady', 'bright', 'giggling', 'cautious', 'impressed', 'cheering', 'wondering', 'pleading',
];

/**
 * The line's direction: what the words themselves ask for first (a cry, a question, a thank-you, a whisper), then the
 * old description's mood, then the role's own. At most two words, never a word of the line.
 */
export function direction(line) {
  const t = line.text;
  const words = new Set(heard(t).split(' '));
  const picks = [];
  const add = (w) => { if (w && !picks.includes(w) && picks.length < 2 && !words.has(w)) picks.push(w); };
  if (/^(aj|usch|oj|hoppsan)\b/i.test(t)) add('startled');
  if (/^brr\b/i.test(t)) add('shivering');
  if (/^(sch|tyst)\b/i.test(t) || /viska/i.test(t)) add('whispering');
  if (/\btack\b/i.test(t)) add('grateful');
  if (/^(hjälp|akta)\b/i.test(t)) add('urgent');
  if (/^(ja+|hurra|yes|wow|jippi)\b/i.test(t)) add('delighted');
  if (/^(god ?natt|sov gott)/i.test(t)) add('sleepy');
  if (/^(titta|kolla)\b/i.test(t)) add('excited');
  if (/^(där|här)\b.*!/i.test(t)) add('excited');
  if (/^(puh|phew)\b/i.test(t)) add('relieved');
  if (/^(vänta|stopp|stanna)\b/i.test(t)) add('urgent');
  if (/^(förlåt)\b/i.test(t)) add('apologetic');
  if (/\b(lilla|lille|lilleman)\b/i.test(t)) add('gentle');
  if (/…|\.\.\./.test(t)) add('hesitant');
  if (/^(nu |jag ska|jag hämtar|vi måste|vi går|jag följer|jag klarar)/i.test(t)) add('determined');
  if (/^(du ska heta|hurra|vi klarade)/i.test(t)) add('joyful');
  if (/\b(blåsten|stormen|blixten)\b/i.test(t) && t.includes('!')) add('alarmed');
  if (line.speaker === 'elof' && /\bklonk\b/i.test(t) && /\b(du|dig|vi)\b/i.test(t)) add('affectionate');
  if (line.speaker === 'spoket') add('playful');
  // Äventyr 2's old descriptions are one per role ("brave and curious, a stormy night"): they say who, not how, so the
  // line's own words and marks direct it there.
  const generic = String(line.situation ?? '').startsWith('Äventyr 2');
  const old = generic ? '' : (line.tag ?? '').toLowerCase().replace(/[[\]]/g, '');
  for (const mood of MOODS) if (new RegExp(`\\b${mood}`).test(old)) add(mood === 'whisper' ? 'whispering' : mood);
  const end = t.trim();
  if (picks.length === 0) {
    if (end.endsWith('?')) add(/!/.test(end) ? 'surprised' : 'curious');
    else if (end.includes('!')) add(line.speaker === 'elof' ? 'excited' : 'bright');
  }
  if (picks.length === 0) add(line.speaker === 'elof' ? 'thoughtful' : (DEFAULT_TAG[line.speaker] ?? 'warm'));
  return `[${picks.join(', ')}]`;
}

/** What is sent: the tag, then the words exactly as written. */
export const say = (line) => `${direction(line)} ${line.text}`;

/** The words of `say` without its tag are the line's own (the method's check). */
export const untagged = (text) => text.replace(/\[[^\]]*\]\s*/g, '').trim();

async function api(path, init = {}) {
  if (!KEY) throw new Error('ELEVENLABS_API_KEY is missing (.env)');
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers ?? {}) } });
    if (res.ok) return res;
    const body = await res.text();
    // Too many at once or a passing fault: wait and try again, a few times.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`${path}: ${res.status} ${body.slice(0, 300)}`);
  }
}

async function speak(voiceId, text) {
  const res = await api(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: CONFIG.model_id, voice_settings: { stability: 0.35, similarity_boost: 0.75 } }),
  });
  return Buffer.from(await res.arrayBuffer());
}

async function listen(audio) {
  const form = new FormData();
  form.append('model_id', 'scribe_v1');
  form.append('language_code', 'swe');
  form.append('tag_audio_events', 'false');
  form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'take.mp3');
  const res = await api('/v1/speech-to-text', { method: 'POST', body: form });
  return (await res.json()).text ?? '';
}

/** Words the speech-to-text writes differently from the line (Klonk as "clank", ikväll as "i kväll", …). */
const SAME = { clank: 'klonk', klunk: 'klonk', clonk: 'klonk', ikväll: 'i kväll', sådär: 'så där', okej: 'ok' };
const normal = (text) => heard(text).split(' ').map((w) => SAME[w] ?? w).join(' ').split(' ').filter(Boolean);

/** How many of the line's words were heard, and whether a word of the tag was heard as speech. */
export function judge(line, tag, transcript) {
  const want = normal(line.text);
  const got = normal(transcript);
  const pool = [...got];
  let found = 0;
  for (const w of want) {
    const i = pool.findIndex((g) => g === w || (w.length > 3 && (g.startsWith(w.slice(0, -1)) || w.startsWith(g.slice(0, -1)))));
    if (i >= 0) { found++; pool.splice(i, 1); }
  }
  const tagWords = heard(tag).split(' ').filter((w) => w.length > 2);
  const tagHeard = tagWords.some((w) => got.includes(w) && !want.includes(w));
  return { share: want.length ? found / want.length : 1, tagHeard };
}

/** Which lines to record: every line of a role whose voice changed, and the narrator's lines that have no recording. */
function chosen(manifest) {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
  return VOICE_LINES.filter((line) => {
    if (only) return only.has(line.key);
    const id = CONFIG.voices[line.speaker];
    if (!id) return false;
    const had = manifest[line.key];
    const file = join(OUT, `${line.key}.mp3`);
    // Already said by this voice with these words.
    if (had && existsSync(file) && had.voiceId === id && heard(had.text) === heard(line.text)) return false;
    return true;
  });
}

async function record(line, manifest) {
  const voiceId = CONFIG.voices[line.speaker];
  const text = say(line);
  if (untagged(text) !== line.text.trim()) throw new Error(`${line.key}: say without its tag is not the line`);
  const tag = direction(line);
  let best = null;
  for (let take = 1; take <= 3; take++) {
    const audio = await speak(voiceId, text);
    const transcript = await listen(audio);
    const verdict = judge(line, tag, transcript);
    const score = verdict.share - (verdict.tagHeard ? 1 : 0);
    if (!best || score > best.score) best = { audio, transcript, take, score, ...verdict };
    if (verdict.share >= 0.85 && !verdict.tagHeard) break;
  }
  writeFileSync(join(OUT, `${line.key}.mp3`), best.audio);
  manifest[line.key] = {
    speaker: line.speaker, text: line.text, tag, voiceId, model: CONFIG.model_id, stability: 0.35,
    generatedAt: new Date().toISOString(),
  };
  return { key: line.key, speaker: line.speaker, text: line.text, tag, heard: best.transcript, share: Number(best.share.toFixed(2)),
    tagHeard: best.tagHeard, takes: best.take, ok: best.share >= 0.85 && !best.tagHeard };
}

async function main() {
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const lines = chosen(manifest);
  const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity;
  const todo = lines.slice(0, limit);
  const chars = todo.reduce((sum, line) => sum + say(line).length, 0);
  console.log(`${todo.length} lines, ${chars} characters (one take each)`);
  if (!process.argv.includes('--record')) {
    for (const line of todo.slice(0, 40)) console.log(`${line.speaker.padEnd(11)} ${say(line)}`);
    return;
  }
  const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, 'utf8')) : {};
  let next = 0;
  let done = 0;
  // A few at once: the account allows several requests at a time.
  const worker = async () => {
    while (next < todo.length) {
      const line = todo[next++];
      try {
        const result = await record(line, manifest);
        report[line.key] = result;
        done++;
        console.log(`${String(done).padStart(3)}/${todo.length} ${result.ok ? 'ok ' : 'LOW'} ${line.key} (${result.takes}) ${result.share} "${result.heard}"`);
      } catch (err) {
        console.error(`FAILED ${line.key}: ${err.message}`);
      }
      // Save as it goes, so a stop loses nothing.
      writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
      writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const low = Object.values(report).filter((r) => !r.ok);
  console.log(`done: ${done}; below the bar after three takes: ${low.length}`);
  for (const r of low) console.log(`  ${r.key}: ${r.share} "${r.heard}" (tag heard: ${r.tagHeard})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((err) => { console.error(err); process.exit(1); });
