import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { A2 } from '../../src/content/aventyr2/sv';
import { sceneBeats } from '../../src/sim/scene';
import type { Speaker } from '../../src/sim/types';

/**
 * Äventyr 2's voices (docs/aventyr-2.md): `scripts/voices-aventyr2.json` lists every one of its bubbles, cards
 * and its closing line for `scripts/generate-voices.mjs`, with who says it. It is written from the pack with
 * `WRITE_VOICES=1 npx vitest run tests/unit/aventyr2-voices.test.ts`, keeping any tag already authored there.
 */
const FILE = new URL('../../scripts/voices-aventyr2.json', import.meta.url);
interface VoiceLine { key: string; speaker: Speaker | 'storyteller'; situation: string; tag: string; text: string }

const TAGS: Record<VoiceLine['speaker'], string> = {
  elof: '[cute 7-year-old boy, brave and curious, a stormy night]',
  moa: '[warm big sister, lively]',
  bertil: '[cheerful older brother, excited]',
  mamma: '[warm, calm mother]',
  pappa: '[warm, steady father]',
  spoket: '[playful wooden voice, wordless]',
  storyteller: '[warm storyteller, gentle pace]',
};

function expected(): VoiceLine[] {
  const out = new Map<string, VoiceLine>();
  for (const chapter of AVENTYR2) {
    const said = [...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)];
    for (const beat of said) {
      const text = A2.lines[beat.line];
      if (text === undefined || out.has(beat.line)) continue;
      out.set(beat.line, { key: beat.line, speaker: beat.who, situation: `Äventyr 2, ${chapter.id}`, tag: TAGS[beat.who], text });
    }
    const card = chapter.scenes?.flatMap((scene) => scene.stage?.words ?? []) ?? [];
    for (const word of card) {
      const text = A2.scene[word.text];
      if (text) out.set(`scene_${word.text}`, { key: `scene_${word.text}`, speaker: 'storyteller', situation: `Äventyr 2, ${chapter.id} card`, tag: TAGS.storyteller, text: text.replace(' · ', '. ') });
    }
  }
  for (const [id, text] of Object.entries(A2.end.closing)) out.set(`end_${id}`, { key: `end_${id}`, speaker: 'storyteller', situation: 'Äventyr 2 closing card', tag: TAGS.storyteller, text });
  return [...out.values()];
}

describe('Äventyr 2 voices', () => {
  it('lists every line of the adventure, with its speaker and its words', () => {
    const want = expected();
    const had: VoiceLine[] = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
    if (process.env.WRITE_VOICES) {
      const merged = want.map((line) => ({ ...line, tag: had.find((old) => old.key === line.key && old.text === line.text)?.tag ?? line.tag }));
      writeFileSync(FILE, `${JSON.stringify(merged, null, 2)}\n`);
      return;
    }
    expect(had.map((line) => [line.key, line.speaker, line.text])).toEqual(want.map((line) => [line.key, line.speaker, line.text]));
  });
});
