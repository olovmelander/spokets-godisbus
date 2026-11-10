import { timeCard } from './cards';
import { NORRSKEN_SCENES } from './norrsken-scenes';
import type { Candy, ChapterData } from '../../sim/types';

/**
 * Final: Norrsken (plan §3.4), in greybox. Units: EL. It is played on the summit, by the old pine, and every
 * step is something Elof does with Använd. Nothing here can go wrong.
 *
 * 1. **The crack** (P16): *Sänk snöret*, and then *Dra*, twice: the ghost climbs down, and together they
 *    pull the first trägubbe out.
 * 2. **New eyes:** *Plocka* a crowberry from the heather, and *Måla ögon* on the old figure.
 * 3. **The bag comes back:** the ghost holds it out. *Ta påsen*.
 * 4. **Dela godiset** (P17): choose a candy and a friend; the jay gets a lingonberry from his pocket.
 * 5. **The golden geléhallon:** *Smaka*. The northern lights flare. The family runs up the path, asks
 *    how he is, and recognises the first carving; Elof tells them how the ghost helped him rescue it.
 * 6. **Home:** *Gå hem*. The walk down on Pappa's shoulders can't fail.
 *
 * Not built yet: the trägubbe's blink, the ghost setting the figure by the pine with a jelly in its lap, the
 * headlamps, Moa's jacket and Bertil's cap. The reunion, lowered lace, heavy lift/drag and supported
 * shoulder ride with both carvings are authored in norrsken-scenes.ts and the carrying picture code.
 */

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45 });
  return out;
}

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
    { x: 30.4, y: 0 },
  ],
  spots: [
    { id: 'lower', at: { x: 10.9, y: 0 }, verb: 'take', word: 'lowerLace' },
    { id: 'crowberry', look: 'crowberry', at: { x: 15.6, y: 0 }, verb: 'take', word: 'pick', needs: 'placed:tragubbe' },
    { id: 'eyes', at: { x: FIGURE + 1, y: 0 }, verb: 'give', word: 'paintEyes', needs: 'crowberry' },
    // The same torn Saturday bag returns; sharing now becomes Elof's own choice.
    { id: 'bag', look: 'bag', at: { x: GHOST - 0.6, y: 0 }, verb: 'take', word: 'takeBag', needs: 'eyes' },
    // Sharing: he decides himself who gets theirs first.
    { id: 'share:tragubbe', at: { x: FIGURE + 1, y: 0 }, verb: 'give', word: 'giveTragubbe', needs: 'bag', story: 'share' },
    { id: 'share:spoket', at: { x: GHOST - 0.6, y: 0 }, verb: 'give', word: 'giveGhost', needs: 'bag', story: 'share' },
    { id: 'share:jay', look: 'jay', at: { x: JAY, y: 0 }, verb: 'give', word: 'giveJay', needs: 'bag', story: 'share' },
    { id: 'taste', look: 'gold', at: { x: 26.6, y: 0 }, verb: 'take', word: 'taste', needs: 'shared' },
    { id: 'home', look: 'sign', at: { x: 33, y: 0 }, verb: 'take', word: 'goHome', needs: 'scene:aterfunna', ride: 'home' },
  ],
  // After their authored arrival and conversation, the same family stands at the scene's final marks.
  decor: [
    // The crack, marked: its lips weathered pale, and crowberry at its back.
    { look: 'crack', at: { x: FIGURE, y: 0 }, z: 0 },
    { look: 'sign', at: { x: 32.1, y: 0 }, z: -.3, word: 'callBertil', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 30.9, y: 0 }, z: -.9, word: 'callMoa', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 25.3, y: 0 }, z: -.9, word: 'callMamma', after: 'scene:aterfunna' },
    { look: 'sign', at: { x: 29.4, y: 0 }, z: -.8, word: 'callPappa', after: 'scene:aterfunna' },
  ],
  sets: [{ flag: 'shared', when: ['share:tragubbe', 'share:spoket', 'share:jay'] }],
  movers: [
    // The first trägubbe, deep in the crack: two pulls on the lace, and it stands on the rock.
    { id: 'tragubbe', look: 'figure', width: 0.3, height: 0.28, verb: 'pull', needs: 'nr:rope-ready', ring: { x: 0, y: 0.5 }, stops: [{ x: FIGURE, y: -2.6 }, { x: FIGURE, y: -1.3 }, { x: FIGURE, y: 0 }] },
  ],
  rides: [{ id: 'home', look: 'none', ...HOME }],
  night: { after: 'taste' },
  ghostMeet: true,
  ghost: [
    // It is his partner now: it stays where each thing is done.
    { at: { x: 9.2, y: 0 }, until: 'placed:tragubbe' },
    { at: { x: GHOST, y: 0 }, until: 'shared' },
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
    ...row(3, 31, 0),
    along(0.15),
    along(0.25),
    along(0.35),
    along(0.45),
    along(0.55),
    along(0.65),
    along(0.75),
    along(0.85),
  ],
};
