import type { Candy, ChapterData } from '../../sim/types';

/**
 * Final: Norrsken (plan §3.4), in greybox. Units: EL. It is played on the summit, by the old pine, and every
 * step is something Elof does with Använd. Nothing here can go wrong.
 *
 * 1. **The crack** (P16): *Sänk snöret*, and then *Dra*, twice: the ghost climbs down, and together they
 *    pull the first trägubbe out.
 * 2. **New eyes:** *Plocka* a crowberry from the heather, and *Måla ögon* on the old figure.
 * 3. **The bag comes back:** the ghost holds it out. *Ta påsen*.
 * 4. **Dela godiset** (P17): *Ge* to the trägubbe, to the ghost and to the jay, in the order he likes.
 * 5. **The golden geléhallon:** *Smaka*. The northern lights flare, and Pappa speaks.
 * 6. **Home:** *Gå hem*. The walk down on Pappa's shoulders can't fail.
 *
 * Not built yet: which candy each friend gets (the choice is only whom to give to, and in which order), Elof
 * growing back, the trägubbe's blink, the ghost setting the figure by the pine with a jelly in its lap, the
 * headlamps and the family, Moa's jacket and Bertil's cap, and the two carvings in his hands on the way home.
 */

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45 });
  return out;
}

const HOME = { from: { x: 33, y: 0 }, to: { x: 74, y: -10 }, rise: 0.6, time: 11, corridor: 0.3 };
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
  spawn: { x: 1, y: 0.01 },
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
    // The ghost gives the bag back: it was only borrowed.
    { id: 'bag', look: 'bag', at: { x: GHOST - 0.6, y: 0 }, verb: 'take', word: 'takeBag', needs: 'eyes' },
    // Sharing: he decides himself who gets theirs first.
    { id: 'share:tragubbe', at: { x: FIGURE + 1, y: 0 }, verb: 'give', word: 'giveTragubbe', needs: 'bag' },
    { id: 'share:spoket', at: { x: GHOST - 0.6, y: 0 }, verb: 'give', word: 'giveGhost', needs: 'bag' },
    { id: 'share:jay', look: 'jay', at: { x: JAY, y: 0 }, verb: 'give', word: 'giveJay', needs: 'bag' },
    { id: 'taste', look: 'gold', at: { x: 26.6, y: 0 }, verb: 'take', word: 'taste', needs: 'shared' },
    { id: 'home', look: 'sign', at: { x: 33, y: 0 }, verb: 'take', word: 'goHome', needs: 'taste', ride: 'home' },
  ],
  sets: [{ flag: 'shared', when: ['share:tragubbe', 'share:spoket', 'share:jay'] }],
  movers: [
    // The first trägubbe, deep in the crack: two pulls on the lace, and it stands on the rock.
    { id: 'tragubbe', look: 'figure', width: 0.3, height: 0.28, verb: 'pull', needs: 'lower', ring: { x: 0, y: 0.5 }, stops: [{ x: FIGURE, y: -2.6 }, { x: FIGURE, y: -1.3 }, { x: FIGURE, y: 0 }] },
  ],
  rides: [{ id: 'home', look: 'none', ...HOME }],
  night: { after: 'taste' },
  ghost: [
    // It is his partner now: it stays where each thing is done.
    { at: { x: 9.2, y: 0 }, until: 'placed:tragubbe' },
    { at: { x: GHOST, y: 0 }, until: 'shared' },
    { at: { x: 28, y: 0 }, until: 'taste' },
    { at: { x: 34.6, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'first1', on: 'taste', who: 'pappa', line: 'first1' },
    { id: 'first2', on: 'taste', who: 'pappa', line: 'first2' },
    { id: 'first3', on: 'taste', who: 'pappa', line: 'first3' },
    { id: 'first4', on: 'taste', who: 'pappa', line: 'first4' },
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
