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
 * 5. **Pappas gungbräda** (P8): "Ropa på Pappa", push the cone to his hand, stand on the low end, and fly
 *    across the ravine.
 * 6. **The fallen log:** the ghost can nearly be caught.
 * 7. **Kepsbåten** (S3): "Ropa på Bertil", and his cap carries Elof across the forest pool.
 * 8. **Spöket i virveln** (P10): from a stone, the lace pulls the ghost ashore. It leaves one candy on the
 *    stone, and from now on it waits for him.
 *
 * Not built yet: tasting a lingonberry, the ghost's picture bubbles.
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
const CAP = { from: { x: 154.6, y: -8 }, to: { x: 177.4, y: -8 }, rise: 0.15, time: 8, corridor: 0.3 };

export const granskog: ChapterData = {
  id: 'granskog',
  place: 'forest',
  // Off the trail: behind him at the start, over the big cone, on top of the anthill, and over the log.
  hidden: [
    { x: -1.8, y: 0.5, kind: 'sockerbit' },
    { x: 22, y: 3.1, kind: 'gummiorm' },
    { x: 62, y: 14.45, kind: 'chokladkola', route: true },
    { x: 134.5, y: -5.3, kind: 'colaflaska' },
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
  goalX: 204,
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
    { x: 63.1, bottom: 10, top: 14, exit: -1, needs: 'found:chokladkola' },
    // The beard lichen: the jay shows it once it is his friend.
    { x: 43.7, bottom: 0, top: 4, exit: 1, needs: 'jay' },
    // The root down from the anthill.
    { x: 66.3, bottom: 0, top: 10, exit: -1 },
  ],
  spots: [
    { id: 'berry', look: 'berry', at: { x: 33, y: 0 }, verb: 'take', word: 'pick' },
    { id: 'jay', look: 'jay', at: { x: 38, y: 0 }, verb: 'give', needs: 'berry' },
    { id: 'antlift', look: 'ants', at: { x: 58.6, y: 4 }, verb: 'take', word: 'rideAnts', needs: 'placed:twig', ride: 'antlift' },
    // O3 is separate from the ghost's vittra story beat. This berry is for the neighbours, not the jay.
    { id: 'vittra:berry', look: 'berry', at: { x: 61, y: 10 }, verb: 'take', word: 'pick', needs: 'beat:vittra' },
    { id: 'vittra:gift', look: 'vittra-door', at: { x: 64.4, y: 10 }, verb: 'give', word: 'leaveBerry', needs: 'vittra:berry', returnGift: 'keepsake:vittra' },
    // The loose cone at the top of the slope: touching it sets the avalanche off.
    { id: 'avalanche', at: { x: 70.4, y: 0 }, verb: 'take', touch: true },
    { id: 'seesaw', look: 'sign', at: { x: 108.2, y: -8 }, verb: 'call', word: 'callPappa' },
    // The low end of the seesaw. Pappa drops the cone on the high end, and Elof flies.
    { id: 'launch', look: 'seesaw', at: { x: 113.2, y: -8 }, verb: 'take', word: 'standOn', needs: 'placed:cone', ride: 'launch' },
    // Memory 2, after the log: the autumn walk, and the Saturday sweets he shared.
    { id: 'memory', look: 'memory', at: { x: 144, y: -8 }, verb: 'take', touch: true },
    { id: 'cap', look: 'sign', at: { x: 154.6, y: -8 }, verb: 'call', word: 'callBertil', ride: 'cap' },
  ],
  decor: [{ look: 'keepsake', at: { x: 64.4, y: 10.8 }, after: 'keepsake:vittra' }],
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
    { id: 'cone', look: 'cone', width: 1.1, height: 1.5, verb: 'push', needs: 'seesaw', stops: [{ x: 110, y: -8 }, { x: 112.2, y: -8 }, { x: 114.6, y: -8 }] },
    // The ghost in the eddy, on a leaf: the lace pulls it up to the stone, and the leaf is the way across.
    { id: 'rescue', look: 'leaf', width: 2.9, height: 0.3, verb: 'pull', ring: { x: 0, y: 0.9 }, stops: [{ x: 186.8, y: -9.3 }, { x: 186.8, y: -7.8 }] },
  ],
  rides: [
    { id: 'antlift', look: 'ants', ...ANT_LIFT },
    { id: 'launch', look: 'none', ...LAUNCH },
    { id: 'cap', look: 'cap', ...CAP },
  ],
  // Three cones on the slope at a time, one setting off every 1.8 s. The first is the one he nudged: it rolls
  // away ahead of him, and the rest come from behind.
  rollers: [0, 1.8, 3.6].map((first) => ({
    from: { x: 70.6, y: slope(70.6) }, to: { x: 103.4, y: slope(103.4) }, every: 5.4, first, speed: 7.5, radius: 0.28,
    needs: 'avalanche',
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
    // across the ravine, and the near-catch on the log
    { at: { x: 127.6, y: -8 } },
    { at: { x: 134.5, y: -7.2 }, catch: 'log' },
    { at: { x: 141, y: -8 } },
    { at: { x: 147.6, y: -8 } },
    { at: { x: 153, y: -8 }, near: 3 },
    // over the pool on a leaf, and into the eddy, where it stays until he pulls it out
    { at: { x: 180.5, y: -8 } },
    { at: { x: 186.8, y: -9 }, until: 'placed:rescue' },
    // from now on it waits for him
    { at: { x: 197, y: -8 }, near: 1.6 },
    { at: { x: 205.5, y: -8 }, near: 1.6 },
  ],
  beats: [
    { id: 'vittra', at: 61.8, who: 'elof', line: 'givesAway' },
    { id: 'vittra-gift', on: 'vittra:gift', who: 'elof', line: 'vittraBerry' },
    { id: 'heja', at: 166, who: 'bertil', line: 'heja' },
    { id: 'thanked', on: 'placed:rescue', who: 'elof', line: 'thanked' },
  ],
  cameras: [
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
};
