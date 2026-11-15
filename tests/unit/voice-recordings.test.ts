import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heard, shown, stillSaid } from '../../src/audio/recorded';

/**
 * The recorded voices (public/audio/voices, Olov, 5 November 2026) stay as they are until the new voices are made.
 * A line may be rewritten before then (Olov, 7 November 2026): its recording stays, but the game does not play it
 * over the new words (src/audio/recorded.ts, read by vite.config.ts). Punctuation is not heard, so it may change.
 */
const VOICES = new URL('../../public/audio/voices/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', VOICES), 'utf8')) as Record<string, { text: string; spoken?: string }>;
/** Lines the recorder sends spelled as they sound (scripts/record-voices.mjs). */
const SPOKEN = JSON.parse(readFileSync(new URL('../../scripts/voices-spoken.json', import.meta.url), 'utf8')) as Record<string, string>;
const recorded = readdirSync(VOICES).filter((file) => file.endsWith('.mp3')).map((file) => file.slice(0, -4));

describe('the recorded voices', () => {
  it('has a line on screen for every recording', () => {
    expect(recorded.length).toBeGreaterThan(90);
    for (const key of recorded) expect(shown(key), `${key}: nothing on screen plays it`).toBeDefined();
  });

  it('plays a recording only while it says its line\'s words', () => {
    const played = stillSaid(recorded, manifest);
    for (const key of recorded) {
      const same = heard(shown(key) ?? '') === heard(manifest[key]!.text);
      expect(played.includes(key), key).toBe(same);
    }
    // Olov's full-playthrough edits may rewrite any number of lines. Every file above is still checked:
    // a stale recording must remain silent until a matching replacement is explicitly commissioned.
  });

  // Olov, 14 November 2026: the narrator's "Stormkvällen", "Stormgården" and "Stormskogen" sounded wrong: "storm" was
  // said as "stor", with a long closed vowel. Sent as "Stårm…" it became a long å (Olov, 15 November 2026: "Det låter
  // konstigt"; measured: the vowel 140–200 ms, its first formant 350–400 Hz). With a double r the vowel is short and open,
  // as the narrator's own o in "klockan" (about 520 Hz). The line shown keeps its own spelling.
  it('records a line spelled by sound with the same words, and still plays it over the line as written', () => {
    expect(Object.keys(SPOKEN)).toEqual(expect.arrayContaining(['scene_stormkvall', 'scene_stormgard', 'scene_stormskog']));
    for (const [key, sound] of Object.entries(SPOKEN)) {
      const line = shown(key);
      expect(line, `${key}: no such line`).toBeDefined();
      expect(heard(sound).split(' ').length, key).toBe(heard(manifest[key]!.text).split(' ').length);
      expect(manifest[key]!.spoken, `${key}: recorded before its spelling by sound`).toBe(sound);
      expect(stillSaid([key], manifest), key).toEqual([key]);
    }
    for (const key of ['scene_stormkvall', 'scene_stormgard', 'scene_stormskog', 'scene_a2title', 'scene_stormoga']) expect(SPOKEN[key]).toMatch(/^St[oå]rrm/);
  });
});
