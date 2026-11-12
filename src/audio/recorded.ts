import { A2 } from '../content/aventyr2/sv';
import { sv } from '../content/sv';

/**
 * Which recordings still say their line (public/audio/voices). Read when the site is built (vite.config.ts) and
 * by tests/unit/voice-recordings.test.ts, never by the game itself. A line can be rewritten before it is recorded
 * again (Olov, 7 November 2026: "Du behöver bara skriva om och rätta replikerna, vi ska skapa nya röster vid ett
 * senare tillfälle"): its old recording then stays in its place, but is not played over the new words. The line is
 * shown, silent, until it is recorded again.
 */

/** The words as they are heard: no punctuation, no capitals, single spaces. */
export const heard = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * What the game shows where a recording plays (src/ui/hud.ts, scene.ts, memory.ts), in either adventure: Äventyr 2's
 * words join `sv` only when its pack is loaded, so they are read from it here (this file is never in the game itself).
 */
export function shown(key: string): string | undefined {
  const lines = { ...sv.lines, ...A2.lines } as Record<string, string>;
  if (lines[key] !== undefined) return lines[key];
  const card = key.match(/^scene_(.+)$/);
  if (card) return ({ ...sv.scene, ...A2.scene } as Record<string, string>)[card[1]!];
  const memory = key.match(/^memory_(.+)_(\d+)$/);
  if (memory) return (sv.memories.chapters as Record<string, { captions: string[] }>)[memory[1]!]?.captions[Number(memory[2]) - 1];
  const end = key.match(/^end_(.+)$/);
  if (end) return end[1] === 'window' ? sv.end.window : ({ ...sv.end.closing, ...A2.end.closing } as Record<string, string>)[end[1]!];
  return undefined;
}

/** Of the recordings, those whose words are still their line's words. */
export function stillSaid(keys: readonly string[], manifest: Readonly<Record<string, { text: string }>>): string[] {
  return keys.filter((key) => {
    const text = shown(key);
    const said = manifest[key]?.text;
    return text !== undefined && said !== undefined && heard(text) === heard(said);
  });
}
