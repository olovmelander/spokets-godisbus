import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { GOES_ON, TONES } from '../../src/content/tones';
import { sceneBeats } from '../../src/sim/scene';

// What is said, in each chapter's order: its beats, then its scenes' lines.
const said = [...STORY, ...BONUS].flatMap((chapter) =>
  [...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)].map((beat) => ({ chapter: chapter.id, ...beat })));

// How a line is said (docs/ux-audit/story-presentation.md row 22).
describe('how lines are said', () => {
  it('marks only lines the game has, and gives none new words', () => {
    for (const line of [...Object.keys(TONES), ...GOES_ON]) expect(Object.keys(sv.lines), line).toContain(line);
  });

  it('lets only Elof think', () => {
    const thought = said.filter((beat) => TONES[beat.line] === 'think');
    expect(thought.length).toBeGreaterThan(0);
    for (const beat of thought) expect(beat.who, beat.line).toBe('elof');
  });

  it('goes on only from the same speaker\'s line just before it', () => {
    for (const line of GOES_ON) {
      const at = said.findIndex((beat) => beat.line === line);
      expect(at, line).toBeGreaterThan(0);
      expect(said[at - 1]!.who, line).toBe(said[at]!.who);
      expect(said[at - 1]!.chapter, line).toBe(said[at]!.chapter);
    }
  });
});
