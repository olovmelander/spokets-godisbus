import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { BONUS, STORY } from '../../src/content/chapters';
import { ASIDE_REACH, RUN_SPEED } from '../../src/sim/constants';
import { listenThrough } from './listener';

/**
 * Every chapter of both adventures, played by the robot with the game's own bubbles listening (./listener.ts), as a
 * reader who lets every line finish automatically (Olov, 9 November 2026: "när någon säger något kan bli avbrutet,
 * så då måste det den säger få talas klart innan nästa event spelas upp eller pratas upp").
 *
 * No line is taken off the page before it has been up as long as it takes to read, and none is said and never shown.
 * And because nothing is cut, what waits behind a line has to be chosen (Olov, 12 November 2026: "vissa kommentarer
 * kan komma lite sent nu när vi alltid ger plats för en kommentar så den inte avbryts"; docs/dialogue.md). The robot is
 * the hardest reader there is: it runs flat out and presses every button the moment it is offered. Played so:
 *
 * - a passing remark is said within reach of its moment, or not at all;
 * - an answer comes straight after the line it answers;
 * - the story's own lines are on time: one said at a place within `AT_PLACE` seconds of his passing it, and one that
 *   answers something he did within `AFTER_ACTION` seconds, which is the line he was in the middle of reading;
 * - none of the story's lines is lost, except a hint for something he has already done;
 * - and he never stands waiting for words longer than one line takes to read (`STANDS`).
 *
 * Where a chapter is meant otherwise, it says so below.
 */
const AT_PLACE = 3;
const AFTER_ACTION = 6.5;
const STANDS = 7;

/**
 * The family's words along the deck on the evening of the storm: each kneels where he passes and says one thing, and
 * he stands at the deck's edge and listens until the last of them has spoken. They are a farewell said in turn, not
 * remarks about places he has left. In the prologue the same promises are read standing in its last scene, at the
 * edge, after the ghost has leapt (prolog-scenes.ts, `titel`; Olov, 13 November 2026).
 */
const IN_TURN: Record<string, { lines: readonly string[]; stands: number }> = {
  stormkvall: { lines: ['skFollow'], stands: 8.5 },
};

describe('every line is let finish, and none comes late', () => {
  for (const chapter of [...STORY, ...BONUS, ...AVENTYR2]) {
    it(`${chapter.id}: read to the end, every line in full, at its moment`, () => {
      const result = listenThrough(chapter, {}, 60, 900);
      const beats = new Map((chapter.beats ?? []).map((beat) => [beat.id, beat]));
      const allowed = IN_TURN[chapter.id];
      expect(result.goal, `${chapter.id} got to its goal`).toBe(true);
      const cut = result.cut.map((one) => `${one.id} ${(one.gone! - one.shown!).toFixed(1)} of ${one.needs.toFixed(1)} s`);
      expect(cut, 'cut short').toEqual([]);
      expect(result.lost.map((one) => one.id), 'said and never shown').toEqual([]);
      expect(result.heard.length).toBeGreaterThan(0);
      // Each is shown the moment the simulation says it.
      expect(result.lag).toBeLessThan(0.05);

      const shown = result.heard.filter((one) => one.shown !== null);
      // A remark begins within reach of where its moment came: a frame's run past it at the most.
      const far = shown.filter((one) => one.aside).filter((one) => {
        const reach = beats.get(one.id)!.aside === true ? ASIDE_REACH : beats.get(one.id)!.aside as number;
        return Math.abs(one.shownX - one.dueX) > reach + RUN_SPEED / 20;
      });
      expect(far.map((one) => `${one.id} ${(one.shownX - one.dueX).toFixed(1)} EL on`), 'remarks said out of reach').toEqual([]);

      // An answer follows what it answers, or another answer to the same line.
      const stray = shown.filter((one, i) => {
        const on = beats.get(one.id)?.on;
        if (!on?.startsWith('beat:') || result.heard.every((other) => `beat:${other.id}` !== on)) return false;
        const before = shown[i - 1];
        return !before || (`beat:${before.id}` !== on && beats.get(before.id)?.on !== on);
      });
      expect(stray.map((one) => one.id), 'answers that did not follow their line').toEqual([]);

      // The story's lines, outside the scenes he stands and watches: on time.
      const late = shown.filter((one) => !one.aside && !one.read && !allowed?.lines.includes(one.id)).filter((one) => {
        const beat = beats.get(one.id);
        const answersAction = beat?.at === undefined;
        return one.shown! - one.due > (answersAction ? AFTER_ACTION : AT_PLACE);
      });
      expect(late.map((one) => `${one.id} ${(one.shown! - one.due).toFixed(1)} s`), 'story lines that came late').toEqual([]);

      // None of them lost: what waited and was never said is a remark, or a hint for what he has done already.
      const lostStory = result.passed.filter((id) => {
        const beat = beats.get(id);
        return beat && !beat.aside && beat.until === undefined && beat.within === undefined;
      });
      expect(lostStory, 'story lines never said').toEqual([]);

      // And he does not stand waiting for words for longer than a line.
      const longest = Math.max(0, ...result.stops.map((stop) => stop.seconds));
      expect(longest, `stood for ${longest.toFixed(1)} s`).toBeLessThanOrEqual(allowed?.stands ?? STANDS);
    });
  }
});
