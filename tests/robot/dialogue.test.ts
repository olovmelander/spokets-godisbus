import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { BONUS, STORY } from '../../src/content/chapters';
import { listenThrough } from './listener';

/**
 * Every chapter of both adventures, played by the robot with the game's own bubbles listening (./listener.ts), as a
 * reader who reads every line before pressing Fortsätt (Olov, 9 November 2026: "när någon säger något kan bli avbrutet,
 * så då måste det den säger få talas klart innan nästa event spelas upp eller pratas upp"). No line is taken off the page
 * before it has been up as long as it takes to read, none is said and never shown, they come in the order their moments
 * came, and each is shown as the simulation says it: the story waited for the words, not the words for the story.
 */
describe('every line is let finish', () => {
  for (const chapter of [...STORY, ...BONUS, ...AVENTYR2]) {
    it(`${chapter.id}: read to the end, every line in full and in turn`, () => {
      const result = listenThrough(chapter, {}, 60, 900);
      expect(result.goal, `${chapter.id} got to its goal`).toBe(true);
      const cut = result.cut.map((one) => `${one.id} ${(one.gone! - one.shown!).toFixed(1)} of ${one.needs.toFixed(1)} s`);
      expect(cut, 'cut short').toEqual([]);
      expect(result.lost.map((one) => one.id), 'said and never shown').toEqual([]);
      expect(result.heard.length).toBeGreaterThan(0);
      // In the order their moments came, each shown the moment it is said.
      const byMoment = [...result.heard].sort((a, b) => a.due - b.due).map((one) => one.id);
      expect(result.heard.map((one) => one.id)).toEqual(byMoment);
      expect(result.lag).toBeLessThan(0.05);
    });
  }
});
