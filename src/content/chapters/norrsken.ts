import { timeCard } from './cards';
import { NORRSKEN_SCENES } from './norrsken-scenes';
import type { Candy, ChapterData } from '../../sim/types';

/**
 * Final: Norrsken (plan §3.4), in greybox. Units: EL. It is played on the summit, by the old pine, and every
 * step is something Elof does with Använd. Nothing here can go wrong.
 *
 * 1. **The crack** (P16): *Sänk snöret* once: the lace goes down and its loop takes hold of the first trägubbe.
 *    Then *Dra upp* once: he heaves, the ghost takes the lace's end behind him and heaves too, and the figure comes
 *    up in one go (Olov, 13 November 2026: it was lowered, and pulled, twice). He lifts it out onto the rock.
 *    Then he drags it behind him on the lace, all the way to the golden geléhallon. It keeps its old painted eyes:
 *    the crowberry and *Måla ögon* are gone (Olov, 13 November 2026: "det känns som att det inte passar in").
 * 2. **The bag comes back:** the ghost has gone ahead with it, and holds it out as he comes. *Ta påsen*.
 * 3. **Dela godiset** (P17): choose a candy and a friend; the jay gets a lingonberry from his pocket.
 * 4. **The golden geléhallon:** *Smaka*. The northern lights flare. The family runs up the path, asks
 *    how he is, and recognises the first carving; Elof tells them how the ghost helped him rescue it.
 * 5. **Home:** *Gå hem*. The walk down on Pappa's shoulders can't fail.
 *
 * Not built yet: the trägubbe's blink, the
 * headlamps, Moa's jacket and Bertil's cap. The reunion, lowered lace, heavy lift/drag and supported
 * shoulder ride with both carvings are authored in norrsken-scenes.ts and the carrying picture code.
 */

/**
 * The summit's trail, one sweet every two EL from x 3 to 31, as it always was (a save keeps each one's index), with a few
 * moved off what stands there: the ghost waiting by the crack, the bag, and the jay, which held one in its beak. The last
 * three lie where the family stands to meet him: they come once the reunion is over, the trail on to the way home, and
 * not at their feet while they talk (`after`).
 */
const SUMMIT_TRAIL = [3, 5, 7, 8.4, 11, 13, 15, 17, 20.1, 21.6, 24, 25, 27, 29, 31];
const AFTER_REUNION = 'scene:aterfunna';

/**
 * The walk home on Pappa's shoulders. Its arc is also the trail he walks, a little behind the play plane
 * (src/render/home-trail.ts): its rise keeps it level with the summit until the summit's edge.
 */
const HOME = { from: { x: 33, y: 0 }, to: { x: 74, y: -10 }, rise: 1, time: 11, corridor: 0.3 };
/** A point on the way home, as the simulation walks it. */
function along(t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: Math.round((HOME.from.x + (HOME.to.x - HOME.from.x) * k) * 10) / 10,
    y: Math.round((HOME.from.y + (HOME.to.y - HOME.from.y) * k + Math.sin(Math.PI * t) * HOME.rise + 0.5) * 10) / 10,
  };
}

/** Where the trägubbe stands once it is out of the crack, and where the ghost and the jay are. */
const FIGURE = 12.4;
const GHOST = 19.4;
const JAY = 23;

export const norrsken: ChapterData = {
  id: 'norrsken',
  place: 'dusk',
  // The summit that Berget ends on, 31.4 EL up: the land lies under him from the first step.
  outlook: 30,
  // The old pine, seen from its other side: left of the crack, its crown swept out over it.
  pine: { x: 7.5, flip: true },
  // The golden geléhallon: POFF, and he grows back, with both carvings at his feet.
  size: { scale: 3, after: 'taste' },
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (./cards.ts).
  scenes: [timeCard('norrsken', 1), ...NORRSKEN_SCENES],
  goalX: 72,
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // The crack beside the pine: too narrow to fall into, and deep.
    { x: FIGURE - 0.18, y: 0 },
    { x: FIGURE - 0.18, y: -3 },
    { x: FIGURE + 0.18, y: -3 },
    { x: FIGURE + 0.18, y: 0 },
    // The summit ends in the mountainside: the only way down is on Pappa's shoulders. Walking, he stops at
    // the edge, and the glitter bubble brings back a runner.
    { x: 35, y: 0 },
    { x: 35, y: -10 },
    { x: 86, y: -10 },
    { x: 86, y: 2 },
  ],
  checkpoints: [
    { x: 2.4, y: 0 },
    { x: 17.8, y: 0 },
    // Among the family where they stand to meet him: it comes once they have talked, not between them while they do.
    { x: 30.4, y: 0, after: AFTER_REUNION },
  ],
  spots: [
    { id: 'lower', at: { x: 10.9, y: 0 }, verb: 'take', word: 'lowerLace' },
    // Once the loop has hold of it: one *Dra upp*, and the ghost and he heave it up in one go (the scene `hissa`).
    { id: 'haul', at: { x: 10.9, y: 0 }, verb: 'take', word: 'pullUp', needs: 'nr:rope-ready' },
    // The same torn Saturday bag returns once the trägubbe is out; sharing now becomes Elof's own choice. The ghost has
    // gone ahead with it, and holds it out as he comes (src/render/norrsken-bag.ts).
    { id: 'bag', look: 'bag', at: { x: GHOST - 0.6, y: 0 }, verb: 'take', word: 'takeBag', needs: 'scene:uppdragen' },
    // Sharing: he decides himself who gets theirs first. He drags the trägubbe behind him on the lace (the mover's
    // `tow`): its candy is given where it is, a step behind him, never back at the empty crack (Olov, 12 November 2026).
    { id: 'share:tragubbe', at: { x: FIGURE + 1, y: 0 }, follows: 'tragubbe', verb: 'give', word: 'giveTragubbe', needs: 'bag', story: 'share' },
    { id: 'share:spoket', at: { x: GHOST - 0.6, y: 0 }, verb: 'give', word: 'giveGhost', needs: 'bag', story: 'share' },
    { id: 'share:jay', look: 'jay', at: { x: JAY, y: 0 }, verb: 'give', word: 'giveJay', needs: 'bag', story: 'share' },
    { id: 'taste', look: 'gold', at: { x: 26.6, y: 0 }, verb: 'take', word: 'taste', needs: 'shared' },
    { id: 'home', look: 'sign', at: { x: 33, y: 0 }, verb: 'take', word: 'goHome', needs: 'scene:aterfunna', ride: 'home' },
  ],
  // After their authored arrival and conversation, the same family stands at the scene's final marks.
  decor: [
    // The crack, marked: its lips weathered pale, and crowberry at its back.
    { look: 'crack', at: { x: FIGURE, y: 0 }, z: 0 },
    { look: 'sign', at: { x: 32.1, y: 0 }, z: -1.1, word: 'callBertil', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 30.9, y: 0 }, z: -.9, word: 'callMoa', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 25.3, y: 0 }, z: -.9, word: 'callMamma', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 29.4, y: 0 }, z: -.8, word: 'callPappa', after: 'scene:aterfunna' },
  ],
  sets: [
    { flag: 'shared', when: ['share:tragubbe', 'share:spoket', 'share:jay'] },
    // A game saved after the old two pulls has it out already: *Dra upp* is done there too.
    { flag: 'haul', when: ['placed:tragubbe'] },
  ],
  movers: [
    // The first trägubbe, deep in the crack: one heave on the lace (`nr:heave`, from the scene `hissa`), and it comes
    // up all the way, in one go, with a moment's grip first. A save keeps only that it is out.
    // Out, he drags it behind him on the lace until he tastes the golden geléhallon, where it stands at his feet.
    { id: 'tragubbe', look: 'figure', width: 0.3, height: 0.28, verb: 'pull', on: 'nr:heave', seconds: 2.15, wait: 0.3, ring: { x: 0, y: 0.5 },
      stops: [{ x: FIGURE, y: -2.6 }, { x: FIGURE, y: 0 }],
      tow: { after: 'scene:uppdragen', until: 'taste' } },
  ],
  rides: [{ id: 'home', look: 'none', ...HOME }],
  night: { after: 'taste' },
  ghostMeet: true,
  ghost: [
    // It is his partner now: it stays where each thing is done.
    { at: { x: 9.2, y: 0 }, until: 'placed:tragubbe' },
    // A little behind the path: the trägubbe he drags past it on to the jay went through it.
    { at: { x: GHOST, y: 0 }, z: -0.6, until: 'shared' },
    { at: { x: 28, y: 0 }, until: 'taste' },
    { at: { x: 34.6, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'nrFoundYou', at: 9.7, until: 'placed:tragubbe', who: 'elof', line: 'nrFoundYou', read: true },
  ],
  cameras: [
    { from: -3, to: 34, zoom: 1.15 },
    { from: 34, to: 86, zoom: 1.4, lift: 0.3 },
  ],
  candy: [
    ...SUMMIT_TRAIL.map((x): Candy => ({ x, y: 0.45, ...(x > 26.6 ? { after: AFTER_REUNION } : {}) })),
    // On the way down, over the trail behind the summit's edge: before the reunion they led a child off the edge, on a
    // trail he cannot walk (HANDOVER, known bugs). They are there once Pappa can carry him down it.
    ...[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85].map((t): Candy => ({ ...along(t), after: AFTER_REUNION })),
  ],
};
