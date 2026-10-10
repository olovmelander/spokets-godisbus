import { timeCard } from './cards';
import type { Candy, ChapterData } from '../../sim/types';

/**
 * Kapitel 2: Granskogen (plan §3.4), in greybox. Units: EL. The places, from the left:
 *
 * 1. **The forest floor:** roots and a cone as big as a car.
 * 2. **Lavskrikan** (P6): Elof picks a lingonberry and gives it to the jay. It shows him the beard lichen
 *    that hangs down a high root, and he climbs it.
 * 3. **The ant road** (P5): a twig lies across it. Pulled away with the lace, and the ants carry him up
 *    their hill. From the top he sees the ghost leave a candy at the vittra door. A root leads down.
 * 4. **Kottlavinen** (E2): a needle slope. He nudges a loose cone at its top, and from then on cones roll
 *    past from behind. A jump clears one; one that reaches him bowls him into the glitter bubble and back to
 *    the last big candy. Two of them split the run, and there is a gap to jump on the way.
 * 5. **Pappas gungbräda** (P8): "Ropa på Pappa". The small cone near the ravine gives a playful low bounce;
 *    the big one further up the slope carries him across. Go back for it, push it to his hand, and stand
 *    on the low end. He can also choose the big cone first and skip the trial.
 * 6. **The fallen log:** the ghost spills sweets as it escapes out of reach.
 * 7. **Kepsbåten** (S3): "Ropa på Bertil", and his cap carries Elof across the forest pool.
 * 8. **Spöket i virveln** (P10): from a stone, the lace pulls the ghost ashore. It leaves one candy on the
 *    stone, and from now on it waits for him.
 *
 * Over the trail lie the first layers (docs/level-design.md), none of them needed: boughs over the forest
 * floor from the big cone to the lingonberry, with the forest's first ring; a root from the hilltop back down
 * to the ant road; and a nest up a trunk after the log, with two rings in a row to a bough before the pool.
 *
 * And one puzzle of three pieces, as optional as the layers: **the cone on the bough**, over the slope between
 * its first big candy and the gap. Hearts lie on a bough two steps over a long bough, with no step between. A
 * cone lies on the long bough. Pushed out to the bough's tip, its weight tips the near end up: the step.
 *
 * At the vittra door, a berry left for the neighbours receives a little picture on a real return visit.
 * Not built yet: tasting a lingonberry.
 * To the simulation the pool and the eddy are pits; the water in them is drawn only.
 */

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45 });
  return out;
}

/** The needle slope: from (70, 0) down to (104, -8). */
const slope = (x: number) => (-8 * (x - 70)) / 34;
/** A row of candy down the slope. */
function downhill(from: number, to: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: Math.round((slope(x) + 0.45) * 100) / 100 });
  return out;
}

/** A point on a ride's arc, as the simulation flies it. */
function along(ride: { from: { x: number; y: number }; to: { x: number; y: number }; rise: number }, t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: Math.round((ride.from.x + (ride.to.x - ride.from.x) * k) * 10) / 10,
    y: Math.round((ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * t) * ride.rise + 0.5) * 10) / 10,
  };
}

const ANT_LIFT = { from: { x: 58.6, y: 4 }, to: { x: 61.6, y: 10 }, rise: 0.4, time: 3, corridor: 0.2 };
const LAUNCH = { from: { x: 113.2, y: -8 }, to: { x: 128.4, y: -8 }, rise: 5, time: 1.8, corridor: 0.4 };
const TRIAL = { from: { x: 113.2, y: -8 }, to: { x: 116.5, y: -8 }, rise: 1.3, time: 1.5, corridor: 0.15 };
const CAP = { from: { x: 154.6, y: -8 }, to: { x: 177.4, y: -8 }, rise: 0.15, time: 8, corridor: 0.3 };

export const granskog: ChapterData = {
  id: 'granskog',
  place: 'forest',
  counterweight: { from: 100, to: 118, call: 'seesaw', heavy: 'cone', launch: 'launch', trial: 'seesaw:trial' },
  returnClue: { from: 60, to: 69.5, gift: 'vittra:gift', away: 'vittra:gift:away', clue: 'keepsake:vittra', root: { x: 66.3, bottom: 0, top: 10, exit: -1, look: 'root' }, door: { x: 64.4, y: 10 } },
  thoughtClues: [{ at: { x: 64.4, y: 10.5 }, picture: 'small-figure', after: 'keepsake:vittra' }],
  // Off the trail: behind him at the start, at the end of the far bough of the swing, on top of the anthill,
  // and in the nest up the trunk after the log. Two for the brave, in sight above a hard move; two for the
  // curious, behind a tell.
  hidden: [
    { x: -1.8, y: 0.5, kind: 'sockerbit' },
    { x: 31, y: 2.95, kind: 'gummiorm', way: 'over the ring between the trunks' },
    { x: 62, y: 14.45, kind: 'chokladkola', route: true },
    { x: 140.3, y: -3.85, kind: 'colaflaska', way: 'up the bark to the nest' },
  ],
  challenges: [{
    id: 'anthill', from: 46.5, to: 63.5, above: 5.4, reward: 'chokladkola',
    steps: [
      { x: 48, y: 5.9 }, { x: 50.3, y: 7.3 }, { x: 52.6, y: 8.7 },
      { x: 53.8, y: 9.8 }, { x: 54.9, y: 10.1 }, { x: 57.2, y: 11.5 },
      { x: 59.5, y: 12.9 }, { x: 62, y: 14 },
    ],
    return: { x: 63.1, y: 14 },
  }],
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (./cards.ts).
  scenes: [timeCard('granskog', 1)],
  goalX: 204,
  // For the picture only (content/life.ts): in one visit of three a moose crosses a bright gap far in among the
  // trunks, after the last big candy, where nothing is left to do but walk out of the forest.
  life: [{ kind: 'moose', from: 194.6, to: 200 }],
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the forest floor: a root, and a cone to pull himself onto
    { x: 9, y: 0 },
    { x: 12, y: 1.3 },
    { x: 15, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 1.2 },
    { x: 23.5, y: 1.2 },
    { x: 23.5, y: 0 },
    // 2. the high root with the beard lichen
    { x: 44, y: 0 },
    { x: 44, y: 4 },
    // 3. the anthill, and the root down
    { x: 60, y: 4 },
    { x: 60, y: 10 },
    { x: 66, y: 10 },
    { x: 66, y: 0 },
    // 4. the needle slope, with its gap
    { x: 70, y: 0 },
    { x: 88, y: slope(88) },
    { x: 88, y: -13 },
    { x: 89.4, y: -13 },
    { x: 89.4, y: slope(89.4) },
    { x: 104, y: -8 },
    // 5. the ravine
    { x: 118, y: -8 },
    { x: 118, y: -15 },
    { x: 126, y: -15 },
    { x: 126, y: -8 },
    // 6. the fallen log
    { x: 132, y: -8 },
    { x: 132, y: -7.2 },
    { x: 137, y: -7.2 },
    { x: 137, y: -8 },
    // 7. the forest pool
    { x: 156, y: -8 },
    { x: 156, y: -13 },
    { x: 176, y: -13 },
    { x: 176, y: -8 },
    // 8. the stone, the eddy, and the way to the bog
    { x: 183, y: -8 },
    { x: 183, y: -7.5 },
    { x: 185.4, y: -7.5 },
    { x: 185.4, y: -13 },
    { x: 188.2, y: -13 },
    { x: 188.2, y: -8 },
    { x: 208, y: -8 },
    { x: 208, y: 4 },
  ],
  // What four of the blocks above are, for the picture only: a model stands over each, with its top where the
  // outline has the block's. The simulation never reads this.
  landmarks: [
    { look: 'cone', from: 20, to: 23.5, base: 0 },
    { look: 'anthill', from: 60, to: 66, base: 4 },
    { look: 'log', from: 132, to: 137, base: -8 },
    { look: 'stone', from: 183, to: 185.4, base: -8 },
  ],
  checkpoints: [
    { x: 4, y: 0 },
    { x: 27, y: 0 },
    { x: 47, y: 4 },
    { x: 63, y: 10 },
    { x: 68.4, y: 0 },
    { x: 80, y: slope(80) },
    { x: 96, y: slope(96) },
    { x: 106.5, y: -8 },
    { x: 129.6, y: -8 },
    { x: 150, y: -8 },
    { x: 179, y: -8 },
    { x: 194.6, y: -8 },
  ],
  climbs: [
    // C2 has its own way down to the ordinary hilltop, without a long drop.
    { x: 63.1, bottom: 10, top: 14, exit: -1, needs: 'found:chokladkola', look: 'root' },
    // The beard lichen: the jay shows it once it is his friend.
    { x: 43.7, bottom: 0, top: 4, exit: 1, needs: 'jay', look: 'lichen' },
    // The root down from the anthill.
    { x: 66.3, bottom: 0, top: 10, exit: -1, look: 'root' },
    // A root down the hilltop's near side, back to the ant road. It is there once the ants have carried him
    // up, so that the anthill's own way up (C2) can still be gone back to, and never before: the twig and
    // the ants are the way up the first time.
    { x: 59.7, bottom: 4, top: 10, exit: 1, needs: 'antlift', look: 'root' },
  ],
  // Rings off the main way (docs/level-design.md). Each hangs 5.7 EL over the forest floor: out of the lace's
  // reach from the floor, even at the top of a jump, and within it from the bough or the nest beside it. The
  // lace is 3 EL long, so that a full swing tops out under 4 EL: letting go anywhere is a soft landing.
  // Each hangs on a string from a bough high in the canopy, out of the picture.
  hooks: [
    // The forest's first ring, between two trunks: from the high bough to the long bough on the far side.
    // A running jump off the big cone comes within its reach too: a shorter way, for quick hands.
    { x: 26.2, y: 5.7, length: 3, extra: true, hangs: 9 },
    // Two in a row from the nest, at one height and 4.4 EL apart: the second is thrown to in the air.
    { x: 143.6, y: -2.3, length: 3, extra: true, hangs: 9 },
    { x: 148, y: -2.3, length: 3, extra: true, hangs: 9 },
  ],
  // Ledges (docs/level-design.md). Up a trunk each is one held jump over the last, 0.9 at most, and beside
  // it: a standing leap with the stick held towards it lands on it from nearly anywhere on the one below, so
  // the climb has a rhythm.
  ledges: [
    // The boughs: a second level over the forest floor, from the big cone to the lingonberry. A plate of
    // bark over the cone, with a heart as its tell, and the high bough the ring is thrown from. A jump from
    // the high bough that misses is still a soft landing.
    { x: 21.6, y: 1.95, width: 1.2, look: 'bark' },
    { x: 22.9, y: 2.85, width: 1.8, look: 'branch' },
    // The far bough is lower and long, so that he lands on it wherever he lets go of the ring. Too far from
    // the high bough for a jump: the ring is the way over.
    { x: 29.65, y: 2.4, width: 3.9, look: 'branch' },
    // A step down. It is too high to jump onto from the floor, so the boughs are entered at the cone only.
    // From its end he drops to the forest floor at the lingonberry: the jay's puzzle is still ahead of him.
    { x: 31.7, y: 1.4, width: 1.6, look: 'branch' },
    // The nest: three plates of bark zig-zag up a trunk after the log, to a nest 3.6 EL over the floor. The
    // lowest plate, with its heart, is the tell. It is about as high as the log, so a leap from the log's end
    // lands on it too; the next one is out of that leap's reach.
    { x: 138.6, y: -7.1, width: 1.4, look: 'bark' },
    { x: 139.8, y: -6.2, width: 1.4, look: 'bark' },
    { x: 138.6, y: -5.3, width: 1.4, look: 'bark' },
    { x: 140.05, y: -4.4, width: 2.1, look: 'nest' },
    // The bough the two rings end on, high over the big candy. From its end he drops to the floor before
    // Bertil's sign.
    { x: 151.4, y: -5.6, width: 3.6, look: 'branch' },
    // The cone on the bough: a puzzle of three pieces over the slope, where the cones that chase him leave a
    // moment's peace between the first big candy and the gap. A plate of bark with a heart is the way in, and
    // a refuge: the cones roll by under it. From it he steps onto a long bough, and a cone lies out on it.
    { x: 82.2, y: -2, width: 1.2, look: 'bark' },
    { x: 84.55, y: -1.1, width: 4.5, look: 'branch' },
    // The twig over the long bough's near end: the missing step. It is there once the cone weighs on the
    // bough's tip, and the two steps up to the hearts are one jump each, straight up.
    { x: 82.55, y: -0.2, width: 1.1, look: 'branch', needs: 'placed:cone-bough' },
    // The hearts' bough: two steps over the long one, which is more than a jump, and its sweets hang out of
    // reach of the highest jump from the long bough and from the cone's top.
    { x: 81.9, y: 0.7, width: 1.8, look: 'branch' },
  ],
  spots: [
    { id: 'berry', look: 'berry', at: { x: 33, y: 0 }, verb: 'take', word: 'pick' },
    { id: 'jay', look: 'jay', at: { x: 38, y: 0 }, verb: 'give', needs: 'berry' },
    { id: 'antlift', look: 'ants', at: { x: 58.6, y: 4 }, verb: 'take', word: 'rideAnts', needs: 'placed:twig', ride: 'antlift' },
    // O3 is separate from the ghost's vittra story beat. This berry is for the neighbours, not the jay.
    { id: 'vittra:berry', look: 'berry', at: { x: 61, y: 10 }, verb: 'take', word: 'pick', needs: 'beat:vittra', extra: true },
    { id: 'vittra:gift', look: 'vittra-door', at: { x: 64.4, y: 10 }, verb: 'give', word: 'leaveBerry', needs: 'vittra:berry', returnGift: 'keepsake:vittra', extra: true },
    // The loose cone at the top of the slope: touching it sets the avalanche off.
    { id: 'avalanche', at: { x: 70.4, y: 0 }, verb: 'take', touch: true },
    { id: 'seesaw', look: 'sign', at: { x: 108.2, y: -8 }, verb: 'call', word: 'callPappa' },
    // The low end of the seesaw. Pappa drops the cone on the high end, and Elof flies.
    { id: 'launch', look: 'seesaw', at: { x: 113.2, y: -8 }, verb: 'take', word: 'standOn', needs: 'placed:cone', ride: 'launch' },
    // Memory 2, after the log: the autumn walk, and the Saturday sweets he shared.
    { id: 'memory', look: 'memory', at: { x: 144, y: -8 }, verb: 'take', touch: true },
    { id: 'cap', look: 'sign', at: { x: 154.6, y: -8 }, verb: 'call', word: 'callBertil', ride: 'cap' },
    // The same seesaw, with the lighter counterweight. The successful launch above takes priority once ready.
    { id: 'seesaw:trial', at: LAUNCH.from, verb: 'take', word: 'standOn', needs: 'placed:cone-small', ride: 'seesaw:trial', extra: true },
  ],
  decor: [
    { look: 'keepsake', at: { x: 64.4, y: 10.8 }, after: 'keepsake:vittra' },
    // A pale shaving beside the return root invites curiosity after the berry was left, without a text task.
    { look: 'shavings', at: { x: 66.3, y: 0.15 }, after: 'vittra:gift:away' },
  ],
  movers: [
    // C2: deliberately jump onto the first needle mat; the main ant road stays open underneath.
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `ant-column-${i}`, look: 'ants' as const, width: 1.4, height: 0.3,
      verb: 'push' as const, extra: true, cycle: { seconds: 4.8, phase: i * 0.6 },
      stops: [{ x: 48 + i * 2.3, y: 5.25 + i * 1.4 }, { x: 48 + i * 2.3, y: 5.95 + i * 1.4 }],
    })),
    // Firm needles halfway up give a missed jump a nearby place to return to.
    { id: 'anthill-rest', look: 'twig', width: 1.2, height: 0.3, verb: 'push', extra: true, stops: [{ x: 53.8, y: 9.5 }] },
    { id: 'anthill-top', look: 'twig', width: 2.1, height: 0.3, verb: 'push', extra: true, stops: [{ x: 62, y: 13.7 }] },
    // The twig across the ants' road: pulled back towards him, the road is clear. It settles into the moss,
    // low enough to walk over.
    { id: 'twig', look: 'twig', width: 2.4, height: 0.5, verb: 'pull', ring: { x: -1, y: 0.7 }, stops: [{ x: 57.2, y: 4 }, { x: 53.4, y: 3.75 }] },
    // The big cone: pushed to Pappa's hand at the seesaw, once he has been called.
    { id: 'cone', look: 'cone', width: 1.1, height: 1.5, verb: 'push', needs: 'seesaw', stops: [{ x: 103.4, y: slope(103.4) }, { x: 106.2, y: -8 }, { x: 110, y: -8 }, { x: 112.2, y: -8 }, { x: 114.6, y: -8 }] },
    // The ghost in the eddy, on a leaf: the lace pulls it up to the stone, and the leaf is the way across.
    { id: 'rescue', look: 'leaf', width: 2.9, height: 0.3, verb: 'pull', ring: { x: 0, y: 0.9 }, stops: [{ x: 186.8, y: -9.3 }, { x: 186.8, y: -7.8 }] },
    // A clearly smaller cone. He approaches its right side and pushes it left, onto Pappa's high end.
    { id: 'cone-small', look: 'cone', width: 0.55, height: 0.7, verb: 'push', needs: 'seesaw', optional: true, stops: [{ x: 116, y: -8 }, { x: 114.6, y: -8 }] },
    // The cone on the bough. What bowls him over on the slope below is his tool up here: pushed out to the
    // bough's tip, its weight tips the near end up. It lies on the long bough at both its places, higher over
    // the slope than the head of any jump from the trail, and more than three EL from the hearts: he can
    // climb onto it, and it is no step up to them.
    { id: 'cone-bough', look: 'cone', width: 0.7, height: 0.7, verb: 'push', optional: true, stops: [{ x: 85.75, y: -1.1 }, { x: 86.45, y: -1.1 }] },
  ],
  rides: [
    { id: 'antlift', look: 'ants', ...ANT_LIFT },
    { id: 'launch', look: 'none', ...LAUNCH },
    { id: 'cap', look: 'cap', ...CAP },
    { id: 'seesaw:trial', look: 'none', ...TRIAL },
  ],
  // Three cones on the slope at a time, one setting off every 1.8 s. The first is the one he nudged: it rolls
  // away ahead of him, and the rest come from behind.
  rollers: [0, 1.8, 3.6].map((first) => ({
    from: { x: 70.6, y: slope(70.6) }, to: { x: 103.4, y: slope(103.4) }, every: 5.4, first, speed: 7.5, radius: 0.28,
    needs: 'avalanche', until: 'seesaw',
  })),
  water: [
    { from: 156, to: 176, y: -8.3 },
    { from: 185.4, to: 188.2, y: -9.1 },
  ],
  jumps: [
    { at: { x: 19.8, y: 0 }, dir: 1, land: { x: 20.8, y: 1.2 } },
    { at: { x: 87.8, y: slope(87.8) }, dir: 1, land: { x: 90.4, y: slope(90.4) } },
    { at: { x: 131.8, y: -8 }, dir: 1, land: { x: 132.8, y: -7.2 } },
    { at: { x: 182.8, y: -8 }, dir: 1, land: { x: 183.8, y: -7.5 } },
    // Lugnt walks past the gated cone, and can return to its left push side without a precision jump.
    { at: { x: 102.25, y: slope(102.25) }, dir: 1, land: { x: 104.8, y: -8 }, until: 'seesaw' },
    { at: { x: 104.8, y: -8 }, dir: -1, land: { x: 101.9, y: slope(101.9) } },
    // Choosing the small cone and returning from its low bounce are accessible on Lugnt too.
    { at: { x: 115.1, y: -8 }, dir: 1, land: { x: 116.75, y: -8 }, until: 'placed:cone-small' },
    { at: { x: 115.4, y: -8 }, dir: -1, land: { x: 113.5, y: -8 } },
  ],
  ghost: [
    { at: { x: 6, y: 0 } },
    { at: { x: 12, y: 1.3 } },
    { at: { x: 17.6, y: 0 } },
    { at: { x: 25.4, y: 0 } },
    { at: { x: 31, y: 0 } },
    // up on the high root: it watches him with the jay
    { at: { x: 45.6, y: 4 } },
    { at: { x: 52, y: 4 } },
    // at the vittra door on the anthill
    { at: { x: 64, y: 10 }, near: 3 },
    { at: { x: 69, y: 0 } },
    // it squeals ahead of the cones
    { at: { x: 76, y: slope(76) } },
    { at: { x: 84, y: slope(84) } },
    { at: { x: 92, y: slope(92) } },
    { at: { x: 100, y: slope(100) } },
    { at: { x: 107, y: -8 } },
    { at: { x: 116.6, y: -8 } },
    // Across the ravine; the log makes it spill sweets while hopping away.
    { at: { x: 127.6, y: -8 } },
    { at: { x: 134.5, y: -7.2 }, catch: 'log' },
    { at: { x: 141, y: -8 } },
    { at: { x: 147.6, y: -8 } },
    { at: { x: 153, y: -8 }, near: 3 },
    // over the pool on a leaf, and into the eddy, where it stays until he pulls it out
    { at: { x: 180.5, y: -8 } },
    { at: { x: 186.8, y: -9 }, until: 'placed:rescue' },
    // It waits to show the way, still several Elof lengths ahead.
    { at: { x: 197, y: -8 }, thought: { picture: 'mountain', after: 'placed:rescue' } },
    { at: { x: 205.5, y: -8 }, thought: { picture: 'mountain', after: 'placed:rescue' } },
  ],
  beats: [
    { id: 'vittra', at: 61.8, who: 'elof', line: 'givesAway' },
    { id: 'vittra-gift', on: 'vittra:gift', who: 'elof', line: 'vittraBerry' },
    { id: 'heja', at: 166, who: 'bertil', line: 'heja' },
    { id: 'thanked', on: 'placed:rescue', who: 'elof', line: 'thanked' },
    { id: 'vittra-clue', on: 'keepsake:vittra', who: 'elof', line: 'forestVittraClue' },
    { id: 'seesaw-trial', on: 'seesaw:trial:landed', who: 'elof', line: 'forestTrial' },
  ],
  later: [{ flag: 'seesaw:trial:landed', after: 'seesaw:trial', seconds: TRIAL.time }],
  cameras: [
    // Up on the boughs and in the nest the picture is wider and looks down a little, so that the ring over
    // him and the trail under him are both in it: further down from the nest, which is higher. Each begins
    // higher than a jump from the trail reaches, and lower than the bottom of the swing: over the big cone
    // that takes two zones.
    { from: 21, to: 25.2, above: 2.35, zoom: 1.4, lift: -1 },
    { from: 25.2, to: 33, above: 2.12, zoom: 1.4, lift: -1 },
    { from: 137.7, to: 153.6, above: -5.9, zoom: 1.4, lift: -1.4 },
    { from: 46.5, to: 63.5, above: 5.4, zoom: 1.25, lift: 0.7, lead: 1 },
    { from: 40, to: 66, zoom: 1.25, lift: 0.3 },
    // On the slope the picture looks less far ahead, so that the cones coming from behind are seen.
    { from: 68, to: 105, zoom: 1.45, lead: 0.3 },
    { from: 108, to: 130, zoom: 1.4, lift: 0.6 },
    { from: 152, to: 178, zoom: 1.3 },
    { from: 180, to: 193, zoom: 1.2 },
  ],
  candy: [
    // 1. the forest floor
    ...row(2.6, 8.6, 0),
    { x: 10.5, y: 1.1 },
    { x: 12, y: 1.75 },
    { x: 13.5, y: 1.1 },
    ...row(15.8, 17.8, 0),
    { x: 19.5, y: 1 },
    { x: 20.5, y: 1.8 },
    { x: 22.3, y: 1.65 },
    { x: 24.4, y: 0.6 },
    ...row(26, 42, 0),
    // 2. up the beard lichen
    { x: 43.7, y: 1.5 },
    { x: 43.7, y: 3 },
    { x: 44.6, y: 4.5 },
    // 3. the ant road and the lift
    ...row(46.6, 50.6, 4),
    { x: 55.6, y: 4.45 },
    { x: 57.6, y: 4.45 },
    along(ANT_LIFT, 0.3),
    along(ANT_LIFT, 0.6),
    along(ANT_LIFT, 0.9),
    ...row(62.6, 64.6, 10),
    // down the root
    { x: 66.3, y: 8 },
    { x: 66.3, y: 5.5 },
    { x: 66.3, y: 3 },
    { x: 67.2, y: 0.45 },
    { x: 69.4, y: 0.45 },
    // 4. down the slope, with an arc over the gap
    ...downhill(71, 87, 2),
    { x: 88.7, y: slope(88.7) + 1.3 },
    ...downhill(90.6, 102.6, 2),
    // 5. to the seesaw, and the flight from it
    ...row(104.6, 108.6, -8),
    along(LAUNCH, 0.2),
    along(LAUNCH, 0.35),
    along(LAUNCH, 0.5),
    along(LAUNCH, 0.65),
    along(LAUNCH, 0.8),
    // 6. the log, where the ghost drops what it carries
    { x: 130.6, y: -7.55 },
    { x: 132.6, y: -6.75 },
    { x: 135.2, y: -6.6, after: 'log' },
    { x: 135.7, y: -6.4, after: 'log' },
    { x: 136.2, y: -6.3, after: 'log' },
    { x: 136.7, y: -6.6, after: 'log' },
    { x: 137.4, y: -7.4 },
    ...row(139, 153, -8),
    // 7. across the pool in the cap
    along(CAP, 0.15),
    along(CAP, 0.25),
    along(CAP, 0.33),
    along(CAP, 0.4),
    along(CAP, 0.47),
    along(CAP, 0.53),
    along(CAP, 0.6),
    along(CAP, 0.67),
    along(CAP, 0.75),
    along(CAP, 0.85),
    // 8. the stone, and the one candy the ghost leaves on it
    ...row(178.2, 182.2, -8),
    { x: 184.2, y: -7.05, after: 'placed:rescue' },
    { x: 186.8, y: -7.05 },
    { x: 188.9, y: -7.55 },
    ...row(191, 203, -8),
  ],
  // Side candy: hearts and lollipops, over every ledge and three along the arc of every swing. Every other
  // one is a heart, and the first of each way is one: its tell. New ones are added at the end.
  side: [
    // The boughs: up the bark, along the swing, on the far bough, and down.
    { x: 21.6, y: 2.5 },
    { x: 22.5, y: 3.4 },
    { x: 23.3, y: 3.4 },
    { x: 24.9, y: 3 },
    { x: 26.2, y: 2.7 },
    { x: 27.5, y: 3 },
    { x: 28.8, y: 2.95 },
    { x: 29.8, y: 2.95 },
    { x: 31.4, y: 1.95 },
    { x: 32.1, y: 1.95 },
    // The nest: up the bark, in the nest beside the colaflaska, along both swings, and on the last bough.
    { x: 138.6, y: -6.55 },
    { x: 139.8, y: -5.65 },
    { x: 138.5, y: -4.75 },
    { x: 139.6, y: -3.85 },
    { x: 142.3, y: -5 },
    { x: 143.6, y: -5.3 },
    { x: 144.9, y: -5 },
    { x: 146.7, y: -5 },
    { x: 148, y: -5.3 },
    { x: 149.3, y: -5 },
    { x: 151.3, y: -5.05 },
    { x: 152.6, y: -5.05 },
    // The cone on the bough: the heart over the plate of bark, and a lollipop on the long bough, towards the
    // cone. Then the prize, four on the hearts' bough: too high to jump for. The last is the heart on the
    // twig, which comes with it.
    { x: 82, y: -1.45 },
    { x: 83.9, y: -0.55 },
    { x: 82.2, y: 1.4 },
    { x: 81.85, y: 1.4 },
    { x: 81.5, y: 1.4 },
    { x: 81.15, y: 1.4 },
    { x: 82.9, y: 0.2, after: 'placed:cone-bough' },
  ],
};
