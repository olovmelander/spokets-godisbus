import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORY, BONUS } from '../../src/content/chapters';
import { DRIP_REACTIONS, sv } from '../../src/content/sv';
import { sceneBeats } from '../../src/sim/scene';
import { heard } from '../../src/audio/recorded';
import type { Speaker } from '../../src/sim/types';

/** Future recording metadata only. Parse the array as source data: never import/execute the generator, which
 * loads credentials. WRITE_A1_VOICES=1 updates this literal catalog, never audio, configuration, or a manifest. */
const FILE = new URL('../../scripts/generate-voices.mjs', import.meta.url);
interface VoiceLine { key: string; speaker: Speaker | 'storyteller'; situation: string; tag: string; text: string }
const TAGS: Record<VoiceLine['speaker'], string> = {
  elof: '[curious, kind little boy]', moa: '[warm, lively big sister]', bertil: '[cheerful, supportive older brother]',
  mamma: '[warm, reassuring mother]', pappa: '[warm, steady father]', spoket: '[playful wooden voice]',
  mormor: '[warm, kind grandmother]', morfar: '[warm, cheerful grandfather]', storyteller: '[warm storyteller, gentle pace]',
};
const SPEAKERS: VoiceLine['speaker'][] = ['elof', 'moa', 'bertil', 'mamma', 'pappa', 'spoket', 'storyteller'];

function catalog(source: string): { lines: VoiceLine[]; start: number; end: number } {
  const match = /export const VOICE_LINES = (\[[\s\S]*?\n\]);/.exec(source);
  if (!match) throw new Error('VOICE_LINES must remain a literal metadata array');
  const block = match[1]!, start = match.index + match[0].indexOf('[');
  const fields = ['key', 'speaker', 'situation', 'tag', 'text'];
  const literal = "('(?:[^'\\\\]|\\\\.)*')";
  const record = new RegExp('^\\s*\\{\\s*' + fields.map(field => `${field}:\\s*${literal}`).join(',\\s*') + '\\s*\\},?\\s*$');
  const unquote = (value: string) => value.slice(1, -1).replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, escape: string) => {
    if (escape.startsWith('u') || escape.startsWith('x')) return String.fromCharCode(parseInt(escape.slice(1), 16));
    const special: Record<string, string> = { "'": "'", '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t' };
    if (!(escape in special)) throw new Error(`Unsupported string escape: ${escape}`);
    return special[escape]!;
  });
  const lines = block.split('\n').slice(1, -1).filter(line => line.trim() && !line.trim().startsWith('//')).map(line => {
    const values = record.exec(line);
    if (!values) throw new Error('Voice metadata rows must contain only the five literal string fields');
    return Object.fromEntries(fields.map((field,i) => [field, unquote(values[i+1]!)])) as unknown as VoiceLine;
  });
  return { lines, start, end: start + block.length };
}

function expected(): VoiceLine[] {
  const out = new Map<string, VoiceLine>();
  const add = (key: string, speaker: VoiceLine['speaker'], text: string, situation: string) => {
    if (!text) throw new Error(`No displayed words for ${key}`);
    const previous = out.get(key);
    if (previous && (previous.speaker !== speaker || previous.text !== text)) throw new Error(`Conflicting recording ${key}`);
    if (!previous) out.set(key, { key, speaker, situation, tag: TAGS[speaker], text });
  };
  const chapters = [...STORY, ...BONUS];
  for (const chapter of chapters) {
    for (const beat of [...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)]) add(beat.line, beat.who, (sv.lines as Record<string, string>)[beat.line]!, `Äventyr 1, ${chapter.id}`);
    for (const word of chapter.scenes?.flatMap(scene => scene.stage?.words ?? []) ?? []) {
      add(`scene_${word.text}`, 'storyteller', sv.scene[word.text]!.replace(' · ', '. '), `Äventyr 1, ${chapter.id} card`);
    }
    const memory = sv.memories.chapters[chapter.id];
    memory?.captions.forEach((text, i) => add(`memory_${chapter.id}_${i+1}`, 'storyteller', text, `Äventyr 1, ${chapter.id} memory ${i+1}`));
    const closing = sv.end.closing[chapter.id];
    if (closing) add(`end_${chapter.id}`, 'storyteller', closing, `Äventyr 1, ${chapter.id} closing card`);
  }
  add('end_window', 'storyteller', sv.end.window, 'Final moonlight description');
  // Said in turn when a drop of water knocks him over, in Gården and Byn too (src/main.ts), not by a beat.
  for (const key of DRIP_REACTIONS) add(key, 'elof', sv.lines[key], 'Äventyr 1, a drop of water knocks him over');
  return [...out.values()];
}
const words = (lines: VoiceLine[]) => lines.map(({ key, speaker, text }) => [key, speaker, text]).sort((a,b) => a[0]!.localeCompare(b[0]!));
const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function update(source: string, parsed: ReturnType<typeof catalog>, want: VoiceLine[]): string {
  const before = new Map(parsed.lines.map(line => [line.key, line]));
  const merged = want.map(line => {
    const old = before.get(line.key);
    return old && old.speaker === line.speaker && heard(old.text) === heard(line.text)
      ? { ...line, situation: old.situation, tag: old.tag } : line;
  });
  // Keep the familiar speaker grouping and stable old row order; new scene lines follow their story order.
  const rank = new Map(parsed.lines.map((line,i) => [line.key,i]));
  const groups = SPEAKERS.map(speaker => {
    const entries = merged.filter(line => line.speaker === speaker).sort((a,b) => (rank.get(a.key) ?? 10000) - (rank.get(b.key) ?? 10000));
    return `  // ${speaker.toUpperCase()}\n` + entries.map(line => `  { key: ${quote(line.key)}, speaker: ${quote(line.speaker)}, situation: ${quote(line.situation)}, tag: ${quote(line.tag)}, text: ${quote(line.text)} },`).join('\n');
  });
  return source.slice(0, parsed.start) + '[\n' + groups.join('\n\n') + '\n]' + source.slice(parsed.end);
}

describe('future first-adventure voice catalog', () => {
  it('contains every authored line, narrator card, memory and ending with the current speaker and exact words', () => {
    const source = readFileSync(FILE, 'utf8'), parsed = catalog(source), want = expected();
    if (process.env.WRITE_A1_VOICES === '1') {
      const updated = update(source, parsed, want);
      writeFileSync(FILE, updated);
      const same = want.filter(line => parsed.lines.some(old => old.key === line.key && old.speaker === line.speaker && heard(old.text) === heard(line.text)));
      const added = want.filter(line => !parsed.lines.some(old => old.key === line.key));
      const rewritten = want.filter(line => parsed.lines.some(old => old.key === line.key) && !same.includes(line));
      const removed = parsed.lines.filter(line => !want.some(next => next.key === line.key));
      console.log(JSON.stringify({ total: want.length, preserved: same.length, added, rewritten, removed }, null, 2));
      expect(words(catalog(updated).lines)).toEqual(words(want));
    } else expect(words(parsed.lines)).toEqual(words(want));
    const final = catalog(readFileSync(FILE, 'utf8')).lines;
    expect(new Set(final.map(line => line.key)).size).toBe(final.length);
    for (const line of final) { expect(SPEAKERS).toContain(line.speaker); expect(line.tag, line.key).toMatch(/^\[[^\]]+\]$/); }
  });
});
