import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heard, shown, stillSaid } from '../../src/audio/recorded';

/**
 * The recorded voices (public/audio/voices, Olov, 5 November 2026) stay as they are until the new voices are made.
 * A line may be rewritten before then (Olov, 7 November 2026): its recording stays, but the game does not play it
 * over the new words (src/audio/recorded.ts, read by vite.config.ts). Punctuation is not heard, so it may change.
 */
const VOICES = new URL('../../public/audio/voices/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', VOICES), 'utf8')) as Record<string, { text: string }>;
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
});
