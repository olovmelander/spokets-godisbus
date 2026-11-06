import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sv } from '../../src/content/sv';

/**
 * The recorded voices (public/audio/voices, Olov, 5 November 2026) stay as they are until the conversations are
 * finished. A recording plays with its line, so its words must still be the line's words: a session that changes the
 * words of a recorded line must record it again or leave the line as it is. Punctuation is not heard, so it may change.
 */
const VOICES = new URL('../../public/audio/voices/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', VOICES), 'utf8')) as Record<string, { text: string }>;

/** The words as they are heard: no punctuation, no capitals, single spaces. */
const heard = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** What the game shows where a recording plays (src/ui/hud.ts, scene.ts, memory.ts). */
function shown(key: string): string | undefined {
  const lines = sv.lines as Record<string, string>;
  if (lines[key] !== undefined) return lines[key];
  const card = key.match(/^scene_(.+)$/);
  if (card) return (sv.scene as Record<string, string>)[card[1]!];
  const memory = key.match(/^memory_(.+)_(\d+)$/);
  if (memory) return (sv.memories.chapters as Record<string, { captions: string[] }>)[memory[1]!]?.captions[Number(memory[2]) - 1];
  const end = key.match(/^end_(.+)$/);
  if (end) return end[1] === 'window' ? sv.end.window : (sv.end.closing as Record<string, string>)[end[1]!];
  return undefined;
}

describe('the recorded voices', () => {
  const recorded = readdirSync(VOICES).filter((file) => file.endsWith('.mp3')).map((file) => file.slice(0, -4));

  it('has a line on screen for every recording, saying the same words', () => {
    expect(recorded.length).toBeGreaterThan(90);
    for (const key of recorded) {
      const text = shown(key);
      expect(text, `${key}: nothing on screen plays it`).toBeDefined();
      expect(heard(text!), key).toBe(heard(manifest[key]!.text));
    }
  });
});
