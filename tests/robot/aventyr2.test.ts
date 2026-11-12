import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2, FIRST_LINES } from '../../src/content/aventyr2/aventyr2';
import { CHAPTER_WORDS } from '../../src/content/aventyr2/sv';
import { ADVENTURE2, ADVENTURE2_IDS, COURSES, courseAvailable, courseFor, nextAfter, nextAvailable } from '../../src/content/chapters';
import { CHAPTER_IDS } from '../../src/content/world';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { chapterFor, codeFor } from '../../src/save/codes';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, JUMP_APEX } from '../../src/sim/constants';
import type { ChapterData } from '../../src/sim/types';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Stormnatten (docs/aventyr-2.md): the rules every one of its chapters keeps, the same that the first
 * adventure's chapter tests hold each of its own to. Each chapter's own puzzles have a test file of their own.
 */

/** A candy is on a ride's way, or on a swing's, where the trail's spacing does not hold. */
const onRide = (chapter: ChapterData, x: number) => (chapter.rides ?? []).some((ride) => x > Math.min(ride.from.x, ride.to.x) - 0.5 && x < Math.max(ride.from.x, ride.to.x) + 2);
const nearHook = (chapter: ChapterData, c: { x: number; y: number }) => (chapter.hooks ?? []).some((h) => Math.hypot(h.x - c.x, h.y - c.y) < h.length + 0.9);
const onMover = (chapter: ChapterData, x: number) => (chapter.movers ?? []).some((m) => m.stops.some((stop) => Math.abs(stop.x - x) < m.width / 2 + 0.9));
const onLedge = (chapter: ChapterData, c: { x: number; y: number }) => (chapter.ledges ?? []).some((l) => Math.abs(l.x - c.x) <= l.width / 2 + 0.6 && c.y > l.y && c.y - l.y < JUMP_APEX + CANDY_MAGNET + 0.5);
const onClimb = (chapter: ChapterData, c: { x: number; y: number }) => (chapter.climbs ?? []).some((climb) => Math.abs(climb.x - c.x) < 1.2 && c.y >= climb.bottom - 0.2 && c.y <= climb.top + 1.2);
const onTussock = (chapter: ChapterData, c: { x: number; y: number }) => (chapter.tussocks ?? []).some((t) => Math.abs(t.x - c.x) < t.width / 2 + 1.2);

describe('Äventyr 2: the pack', () => {
  it('puts its ten chapters into the game, in order, after Byn', () => {
    expect(AVENTYR2.map((chapter) => chapter.id)).toEqual([...ADVENTURE2_IDS]);
    expect(ADVENTURE2).toEqual(AVENTYR2);
    for (const chapter of AVENTYR2) expect(COURSES[chapter.id]).toBe(chapter);
    expect(nextAfter('byn')?.id).toBe('stormkvall');
    for (let i = 0; i < AVENTYR2.length - 1; i++) expect(nextAfter(AVENTYR2[i]!.id)).toBe(AVENTYR2[i + 1]);
    expect(nextAfter('morgonen')).toBeNull();
    // Its ids are the plan's stable chapter ids, after the first adventure's.
    expect(CHAPTER_IDS.slice(CHAPTER_IDS.indexOf('epilog') + 1)).toEqual([...ADVENTURE2_IDS]);
  });

  it('opens where the first adventure ends, and keeps the release boundary', () => {
    const dev = new URLSearchParams('dev');
    expect(nextAvailable('byn', dev)?.id).toBe('stormkvall');
    // Released, Byn lies between the two adventures.
    expect(nextAvailable('epilog', new URLSearchParams(), 'morgonen')?.id).toBe('byn');
    expect(nextAvailable('byn', new URLSearchParams(), 'morgonen')?.id).toBe('stormkvall');
    expect(nextAvailable('byn', new URLSearchParams(), 'epilog')).toBeNull();
    for (const id of ADVENTURE2_IDS) {
      expect(courseAvailable(new URLSearchParams(), id, null), id).toBe(false);
      expect(courseAvailable(new URLSearchParams(), id, 'epilog'), id).toBe(false);
      expect(courseFor(new URLSearchParams(`dev&course=${id}`)).id).toBe(id);
      // A code opens each, the beginning too.
      expect(chapterFor(codeFor(id)!)).toBe(id);
    }
    expect(courseAvailable(new URLSearchParams(), 'stormgard', 'stormgard')).toBe(true);
    expect(courseAvailable(new URLSearchParams(), 'stormskog', 'stormgard')).toBe(false);
  });

  it('says where Klonk stands in each scene that stages it, from its first moment', () => {
    // A scene's ghost starts from nowhere in particular (src/render/stage.ts): without a place, it is drawn at
    // the room's far end, as it was in Stormkvällen, off the shelf and away from Elof's shrinking.
    for (const chapter of AVENTYR2) {
      for (const scene of chapter.scenes ?? []) {
        const first = scene.stage?.actors?.ghost?.[0];
        if (!first) continue;
        expect([first.x, first.y, first.z].every((v) => v !== undefined), `${chapter.id}: ${scene.id}`).toBe(true);
      }
    }
  });

  it('has a name, a card, a kicker and a picture for every chapter', () => {
    for (const chapter of AVENTYR2) {
      expect(sv.explore.chapters[chapter.id], chapter.id).toBeTruthy();
      expect(sv.end.kickers[chapter.id], chapter.id).toMatch(/^Äventyr 2 · /);
      const card = chapter.scenes?.find((scene) => scene.id === 'card');
      if (chapter.id !== 'stormkvall' && chapter.id !== 'morgonen') {
        expect(card, chapter.id).toBeDefined();
        // He can set off at once, except in Billsta, where the card is the arrival by the car as well: Moa's two
        // lines are said while he stands there (./billsta.test.ts).
        expect(card!.hold === true, chapter.id).toBe(chapter.id === 'billsta');
        expect(card!.at, chapter.id).toBeLessThan(chapter.spawn.x);
      }
      for (const scene of chapter.scenes ?? []) {
        for (const word of scene.stage?.words ?? []) expect((sv.scene as Record<string, string>)[word.text], `${chapter.id}: ${word.text}`).toBeTruthy();
      }
    }
    expect(sv.end.closing.morgonen).toBeTruthy();
  });

  it('adds only new words: no key of the first adventure is said over', () => {
    const keys = Object.values(CHAPTER_WORDS).flatMap((words) => Object.keys(words.lines));
    expect(new Set(keys).size, 'a key in two chapters').toBe(keys.length);
    for (const key of keys) expect(FIRST_LINES, key).not.toContain(key);
    for (const [chapter, words] of Object.entries(CHAPTER_WORDS)) {
      for (const [key, text] of Object.entries(words.lines)) {
        expect(text.length, `${chapter}: ${key}`).toBeLessThanOrEqual(42);
        // No number, no surname: plain words a child reads.
        expect(text, `${chapter}: ${key}`).not.toMatch(/\d/);
      }
    }
  });
});

for (const chapter of AVENTYR2) {
  describe(`Äventyr 2: ${chapter.id}`, () => {
    it('is played by the robot from its start to its end at 60 Hz, reaching every big candy', () => {
      const result = playThrough(60, chapter, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)} (flags ${result.flags.filter((f) => !f.startsWith('beat:')).join(' ')})`).toBe(true);
      expect(result.checkpoint).toBe((chapter.checkpoints?.length ?? 0) - 1);
    });

    for (const fps of [30, 144]) {
      it(`is played the same way at ${fps} Hz`, () => {
        const result = playThrough(fps, chapter, {}, 400);
        expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      });
    }

    it('on Lugnt it is played by running and Använd, with Hoppa only on the lace', () => {
      const game = new Game(chapter, simOptions(settingsFor('lugnt')));
      let wasOffered = false;
      let wasSwinging = false;
      for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
        const swinging = game.sim.curr.hook !== null;
        const { x, y, offered } = decide(game, chapter);
        game.frame(1 / 60, { x: swinging ? 0 : x, y, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
        wasOffered = offered;
        wasSwinging = swinging;
      }
      expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    });

    it('has a candy trail that is never lost, in order along the way', () => {
      const candy = chapter.candy;
      expect(candy.length).toBeGreaterThanOrEqual(chapter.goalX > 100 ? 60 : 10);
      for (let i = 1; i < candy.length; i++) {
        const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
        const wide = onRide(chapter, candy[i]!.x) || nearHook(chapter, candy[i]!) || onClimb(chapter, candy[i]!) || candy[i]!.after !== undefined || candy[i - 1]!.after !== undefined;
        expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}, ${candy[i - 1]!.y}) to ${i} (${candy[i]!.x}, ${candy[i]!.y})`).toBeLessThanOrEqual(wide ? 6.5 : 3.4);
        expect(candy[i]!.x, `candy ${i}`).toBeGreaterThanOrEqual(candy[i - 1]!.x - 0.05);
      }
    });

    it('has no candy in the ground, and none out of reach', () => {
      for (const [i, c] of chapter.candy.entries()) {
        if (onRide(chapter, c.x) || nearHook(chapter, c) || onMover(chapter, c.x) || onLedge(chapter, c) || onClimb(chapter, c) || onTussock(chapter, c)) continue;
        const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(chapter, c.x + dx)).filter(Number.isFinite);
        expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(heightAt(chapter, c.x) + 0.15);
        expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET);
      }
    });

    it('has a big candy at least every 40 EL, in order, each on the ground', () => {
      const at = [chapter.spawn.x, ...(chapter.checkpoints ?? []).map((c) => c.x), chapter.goalX];
      for (let i = 1; i < at.length; i++) {
        expect(at[i]!, `big candy ${i}`).toBeGreaterThan(at[i - 1]!);
        expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
      }
      for (const c of chapter.checkpoints ?? []) expect(heightAt(chapter, c.x), `the big candy at ${c.x}`).toBeCloseTo(c.y, 4);
    });

    it('says only words the game has, each short enough for a bubble, and every button has its word', () => {
      const lines: Record<string, string> = sv.lines;
      const verbs: Record<string, string> = sv.verbs;
      for (const beat of chapter.beats ?? []) {
        expect(lines[beat.line], `${chapter.id}: ${beat.line}`).toBeDefined();
        expect(lines[beat.line]!.length).toBeLessThanOrEqual(42);
      }
      for (const scene of chapter.scenes ?? []) {
        for (const line of scene.lines ?? []) expect(lines[line.line], `${chapter.id}: ${scene.id} ${line.line}`).toBeTruthy();
        if (scene.hold) {
          const stops = [0, ...(scene.lines ?? []).map((line) => line.at), scene.seconds];
          for (let i = 1; i < stops.length; i++) expect(stops[i]! - stops[i - 1]!, `${chapter.id}: ${scene.id}`).toBeLessThanOrEqual(11);
        }
        for (const moment of [...(scene.cues ?? []), ...(scene.lines ?? []), ...(scene.sounds ?? [])]) expect(moment.at).toBeLessThanOrEqual(scene.seconds);
      }
      for (const spot of chapter.spots ?? []) if (spot.word) expect(verbs[spot.word], `${chapter.id}: ${spot.word}`).toBeTruthy();
    });

    it('keeps Klonk ahead of him on firm ground, never in reach while he plays', () => {
      const perches = chapter.ghost ?? [];
      for (const [i, perch] of perches.entries()) {
        if (perch.z !== undefined || chapter.ghostMeet) continue;
        expect(heightAt(chapter, perch.at.x), `the place at ${perch.at.x}`).toBeCloseTo(perch.at.y, 3);
        if (i > 0) expect(perch.at.x, `perch ${i}`).toBeGreaterThan(perches[i - 1]!.at.x);
      }
      if (!chapter.ghostMeet) for (const perch of perches) expect(perch.catch, `${chapter.id}: Klonk is a friend now`).toBeUndefined();
    });

    it('has a reminder of what he is doing, all the way', () => {
      const game = new Game(chapter, {});
      expect(storyContext(chapter.id, game.sim.flags, game.sim.curr)?.purpose, chapter.id).toBeTruthy();
      const end = playThrough(60, chapter, {}, 400);
      expect(storyContext(chapter.id, new Set(end.flags), end.end)?.purpose, chapter.id).toBeTruthy();
    });
  });
}
