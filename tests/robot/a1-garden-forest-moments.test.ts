import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { sv } from '../../src/content/sv';
import { createBertilAnswer } from '../../src/render/cap-thanks';
import { bowAt, ghostThanks, GHOST_THANKS } from '../../src/render/ghost-thanks';
import { STANDING } from '../../src/render/rig';
import { walkedOff, walkOffOf } from '../../src/sim/walk-off';
import type { ChapterData } from '../../src/sim/types';
import { decide } from './robot';

/** The robot from a big candy until `done`, pressing what is offered: a step a frame at 60 Hz. */
function playUntil(game: Game, chapter: ChapterData, done: () => boolean, seconds: number, each: () => void = () => {}): void {
  let wasAhead = false, wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !done(); frame++) {
    const d = decide(game, chapter);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
    each();
  }
}

describe('Gården ends with Elof walking through the arch into the forest (Olov, 13 November 2026, point 6)', () => {
  it('holds him at the goal while he walks in, and the last page waits until he has gone in', () => {
    const game = new Game(garden, {}, { checkpoint: 9, flags: ['scene:card', 'ladybird', 'dandelion', 'placed:curl', 'placed:bridge', 'memory'], placed: ['curl', 'bridge'] });
    const walkOff = walkOffOf(garden)!;
    expect(walkOff.id).toBe('skogen');
    playUntil(game, garden, () => game.sim.flags.has('goal'), 120);
    expect(game.sim.flags.has('goal')).toBe(true);
    const goalAt = game.sim.curr.x;
    let seconds = 0, gone = -1, played = false, strayed = 0;
    // A child who goes on pushing right: the walk holds him at the goal, and the picture walks him in. (The page has
    // turned before the scene is over; here nothing turns it.)
    for (let frame = 0; frame < 60 * 9; frame++) {
      game.frame(1 / 60, { x: 1, y: 0, hopHeld: false }, { hop: false, act: false, helper: false });
      seconds += 1 / 60;
      if (game.sim.sceneFrame?.id === 'skogen') {
        played = true;
        expect(game.sim.held).toBe(true);
        strayed = Math.max(strayed, Math.abs(game.sim.curr.x - goalAt));
      }
      if (gone < 0 && walkedOff(walkOff, game.sim.flags, game.sim.sceneFrame)) gone = seconds;
    }
    expect(played).toBe(true);
    expect(strayed).toBeLessThan(0.8);
    // Longer than the plain coda's 4.6 s, so that he is seen going in, and not much longer.
    expect(gone).toBeGreaterThan(6.5);
    expect(gone).toBeLessThan(8);
    // A save that has seen it does not wait for it again.
    expect(walkedOff(walkOff, new Set(['scene:skogen']), null)).toBe(true);
    expect(walkedOff(undefined, new Set(), null)).toBe(true);
  });

  it('walks him onto the trodden path and in through the arch, behind the hedge, and only for the picture', () => {
    const elof = garden.scenes!.find((scene) => scene.id === 'skogen')!.stage!.elof!;
    // Into the depth, through the arch (its hedge stands from 4 to 6.6 EL behind the path) and on among the spruces.
    expect(elof.at(-1)!.to!.z).toBeLessThan(-12);
    // Inside the opening (210.6 to 213.3) where he passes through the hedge.
    for (const key of elof) expect(key.to!.x).toBeGreaterThan(211.2), expect(key.to!.x).toBeLessThan(212.9);
    expect(elof.every((key) => key.act === undefined || key.act === 'walk')).toBe(true);
  });
});

describe('Granskogen: the thanks after the cap and after the eddy (Olov, 13 November 2026, points 7 and 8)', () => {
  const start = { checkpoint: 9, flags: ['scene:card', 'berry', 'jay', 'placed:twig', 'antlift', 'seesaw', 'placed:cone', 'launch', 'log', 'memory', 'scene:tack-pappa'], placed: ['twig', 'cone'] };

  it('Elof thanks Bertil standing on the far bank, once the cap has set him down, and before the eddy', () => {
    const game = new Game(granskog, {}, start);
    let thanksAt: number | null = null, rescueAt: number | null = null;
    playUntil(game, granskog, () => game.sim.flags.has('placed:rescue'), 120, () => {
      if (thanksAt === null && game.sim.said.includes('tack-bertil:0')) thanksAt = game.sim.curr.x;
      if (rescueAt === null && game.sim.flags.has('placed:rescue')) rescueAt = game.sim.curr.x;
    });
    expect(thanksAt).not.toBeNull();
    expect(thanksAt!).toBeGreaterThan(176);
    expect(thanksAt!).toBeLessThan(179);
    expect(sv.lines.forestThanksBertil.length).toBeLessThanOrEqual(40);
    const scene = granskog.scenes!.find((one) => one.id === 'tack-bertil')!;
    expect(scene.hold).toBe(true);
    // The picture takes in Bertil by his sign and Elof where the cap sets him down.
    const wide = scene.stage!.shots!.at(-1)!;
    expect(wide.x - wide.width! / 2).toBeLessThan(154.6 - 1);
    expect(wide.x + wide.width! / 2).toBeGreaterThan(177.4 + 1);
  });

  it('the ghost waits on its leaf by the stone and thanks him before he says so, and then goes on ahead', () => {
    const game = new Game(granskog, {}, { ...start, flags: [...start.flags, 'cap', 'scene:tack-bertil'], checkpoint: 10 });
    playUntil(game, granskog, () => game.sim.flags.has('placed:rescue'), 60);
    expect(game.sim.flags.has('placed:rescue')).toBe(true);
    let saidAt = -1, seconds = 0, ghostLeft = -1;
    const ghostAt = { x: game.sim.ghost!.x, y: game.sim.ghost!.y };
    for (let frame = 0; frame < 60 * 10; frame++) {
      game.frame(1 / 60, { x: 0, y: 0, hopHeld: false }, { hop: false, act: false, helper: false });
      seconds += 1 / 60;
      if (saidAt < 0 && game.sim.said.includes('thanked')) saidAt = seconds;
      if (ghostLeft < 0 && Math.abs(game.sim.ghost!.x - ghostAt.x) > 0.5) ghostLeft = seconds;
      // While it thanks him it stays where it was pulled up to, on the leaf level with the stone.
      if (game.sim.sceneFrame?.id === 'tackar') expect(game.sim.ghost!.x).toBeCloseTo(186.8, 1);
    }
    // He says it after the bow and the hops, not as the leaf arrives.
    expect(saidAt).toBeGreaterThan(GHOST_THANKS.bow + GHOST_THANKS.down + GHOST_THANKS.hold + GHOST_THANKS.up);
    expect(game.sim.flags.has('scene:tackar')).toBe(true);
    expect(ghostLeft).toBeGreaterThan(saidAt);
    // The words are the scene's now: one line, its old id kept.
    expect(granskog.beats!.some((beat) => beat.id === 'thanked')).toBe(false);
    expect(granskog.scenes!.find((one) => one.id === 'tackar')!.lines!.map((line) => line.id)).toEqual(['thanked']);
  });

  it('the bow tips it forward and back upright before the hops, and is the same picture at the same moment', () => {
    expect(bowAt(0)).toBe(0);
    expect(bowAt(GHOST_THANKS.bow + GHOST_THANKS.down + GHOST_THANKS.hold / 2)).toBeCloseTo(1, 5);
    expect(bowAt(GHOST_THANKS.hops)).toBe(0);
    expect(ghostThanks(null, false)).toBeNull();
    expect(ghostThanks({ id: 'tack-bertil', seconds: 1 }, false)).toBeNull();
    const deepest = ghostThanks({ id: 'tackar', seconds: 1 }, false)!;
    expect(deepest.pitch).toBeGreaterThan(0.5);
    expect(ghostThanks({ id: 'tackar', seconds: 1 }, false)).toEqual(deepest);
    // With reduced motion it bows, and does not hop.
    expect(ghostThanks({ id: 'tackar', seconds: GHOST_THANKS.hops + GHOST_THANKS.hop / 2 }, true)!.bob).toBe(0);
    expect(ghostThanks({ id: 'tackar', seconds: GHOST_THANKS.hops + GHOST_THANKS.hop / 2 }, false)!.bob).toBeGreaterThan(0.1);
  });

  it('Bertil cheers when he hears the thanks, and comes back to standing when his answer is over', () => {
    const answer = createBertilAnswer();
    const words = { who: 'elof' as const, text: sv.lines.forestThanksBertil, seconds: 0, reading: true };
    const pose = { ...STANDING };
    answer.update(words, 1 / 60, false, undefined, pose);
    expect(pose.armL).toBeCloseTo(STANDING.armL, 5);
    let highest = 0;
    for (let t = 0; t < 7; t += 1 / 60) {
      const posed = { ...STANDING };
      words.seconds = t;
      answer.update(t < 5.5 ? words : null, 1 / 60, false, undefined, posed);
      highest = Math.max(highest, posed.armL, posed.armR);
    }
    // Both arms flung up in a V.
    expect(highest).toBeGreaterThan(2.3);
    const after = { ...STANDING };
    answer.update(null, 1 / 60, false, undefined, after);
    expect(after).toEqual(STANDING);
    // Nobody else's words, and none of Elof's others, make him cheer.
    const other = createBertilAnswer(), still = { ...STANDING };
    other.update({ who: 'elof', text: sv.lines.forestThanksPappa, seconds: 2, reading: true }, 1 / 60, false, undefined, still);
    expect(still).toEqual(STANDING);
  });
});
