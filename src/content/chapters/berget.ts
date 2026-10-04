import type { Candy, ChapterData, Hook, Ledge } from '../../sim/types';

/**
 * Kapitel 4: Berget (plan §3.4), in greybox. Units: EL. The places, from the left:
 *
 * 1. **Tranflygningen** (S5): the chapter begins on the crane's back. It carries him over the valley and up
 *    to the mountain's shoulder; up and down steer through the candy, and nothing can end the ride.
 * 2. **The shoulder:** granite slabs to pull himself up. From the first slab the rock shelves rise: a second
 *    way, over the mountain's first ring, to the far side of the cobbles.
 * 3. **Strandstenarna** (O8): five round cobbles, each ringing a note as he passes.
 * 4. **Vindbyarna** (E4): open granite with boulders. A gust is announced a second ahead; one that catches
 *    him in the open takes him back to the last boulder. Nothing falls. Shelves on the boulders and a ring
 *    between every two are a second way over it, from lee to lee.
 * 5. **The ghost is stuck** below the last cliff. Använd says *Lyft*: he boosts it up, and it lowers the
 *    lace to him (P15).
 * 6. **The old pine:** "Spöket vill hämta hem min trägubbe!"
 *    **Toppröset** (C4) is above it: five narrow granite shelves, reached with held jumps and ledge grabs.
 *    The summit's candy is optional; the ordinary path stays below. Finding it leaves the familiar lace
 *    anchored to the cairn: choose a quick slide back to the pine, or retrace the shelves. A deliberate
 *    jump can catch its hanging end for another visit, and the ghost's lower lace still leads to the lee.
 *
 * Not built yet: what lies below the flight (the forest, the brook, the bog, the bell tower, the red house,
 * the four headlamps), memory 4, the ghost shown lifted.
 */

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45 });
  return out;
}

const FLIGHT = { from: { x: 1, y: 0 }, to: { x: 72, y: 24 }, rise: 6, time: 14, corridor: 1.6 };
/** The candy of the flight: on the crane's way, a little above it and a little below it in turn. */
function inFlight(): Candy[] {
  const out: Candy[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = 0.1 + i * 0.05;
    const k = t * t * (3 - 2 * t);
    out.push({
      x: Math.round((FLIGHT.from.x + (FLIGHT.to.x - FLIGHT.from.x) * k) * 10) / 10,
      y: Math.round((FLIGHT.from.y + (FLIGHT.to.y - FLIGHT.from.y) * k + Math.sin(Math.PI * t) * FLIGHT.rise + 0.5 + 0.8 * Math.sin(i * 1.3)) * 10) / 10,
    });
  }
  return out;
}

/** The open granite, and its boulders. */
const BOULDERS = [110, 115.2, 120.4, 125.6, 130.8, 136];

/** A heart over a shelf, where he takes it by standing there. */
const over = (shelf: { x: number; y: number }): Candy => ({ x: shelf.x, y: Math.round((shelf.y + 0.55) * 100) / 100 });
/** A place on a ring's swing: where his middle is, this many radians round from straight down. */
const onArc = (ring: Hook, angle: number): Candy => ({
  x: Math.round((ring.x + ring.length * Math.sin(angle)) * 10) / 10,
  y: Math.round((ring.y - ring.length * Math.cos(angle)) * 10) / 10,
});

/**
 * The rock shelves (docs/level-design.md): a second way from the first slab to the open granite, over the
 * cobbles. Four shelves rise along the rock, each a held jump above the last, to 2.4 EL over the second slab,
 * and two more run level there with a gap to jump before each. From the last of them the mountain's first
 * ring swings him over the cobbles to a far shelf, and off its far end he drops to the granite before the
 * gusts. Nothing leads up to the far shelf from below, and what lies on it is out of a jump's reach from the
 * granite: it is reached by the ring only. A miss anywhere lands on the slab below, unhurt.
 */
const SHELVES: Ledge[] = [
  { x: 86, y: 26.1, width: 1.4, look: 'stone' },
  { x: 88, y: 27, width: 1.4, look: 'stone' },
  { x: 90.2, y: 27.9, width: 1.4, look: 'stone' },
  { x: 92.5, y: 28.8, width: 1.6, look: 'stone' },
  { x: 95.4, y: 28.8, width: 2, look: 'stone' },
  { x: 98.2, y: 28.8, width: 1.6, look: 'stone' },
  // the far side of the ring
  { x: 104.8, y: 28.4, width: 2.4, look: 'stone' },
];
// Out of the lace's reach for someone standing on the granite, so the trail is never offered it: it is thrown
// from the last level shelf. Low enough that letting go at the top of the swing is a fall he can land, even
// with the lace climbed short.
const SHELF_RING: Hook = { x: 101.5, y: 31.2, length: 2.8, extra: true };

/**
 * The lee shelves: a second way over the open granite. Each boulder but the last has a low shelf, a held jump
 * up from the granite, and a high one at its top; both are narrower than the lee, so no gust takes him on
 * them. Between two boulders hangs a ring, out of the lace's reach for someone standing on the granite.
 * On the lace no gust has hold of him. In the air after he lets go one does, unless he is already in the
 * next lee: it sets him down on the granite by the boulder he came from, whose low shelf is the way up again.
 * The last boulder has its high shelf only, so that one is reached by the ring.
 */
const LEE = { low: 27.3, high: 28.2, width: 1.2 };
const LEE_SHELVES: Ledge[] = BOULDERS.flatMap((x, i) => [
  ...(i < BOULDERS.length - 1 ? [{ x, y: LEE.low, width: LEE.width, look: 'stone' as const }] : []),
  { x, y: LEE.high, width: LEE.width, look: 'stone' as const },
]);
// A row of rings at the first ring's height, one boulder apart: the swing has the same beat as the dash below.
const LEE_RINGS: Hook[] = BOULDERS.slice(1).map((x, i) => ({ x: Math.round((BOULDERS[i]! + x) * 5) / 10, y: SHELF_RING.y, length: 2.6, extra: true }));

/**
 * Toppröset: these are the shelves' tops. The first is too high to grab from the ordinary path without
 * jumping. The rightmost edge leaves 3.9 EL before the exit, so a miss lands or bubbles before reaching it.
 * The 1.9 EL rises combine a held jump with the ledge grab already taught on the shoulder.
 */
const CAIRN = [
  { x: 152.3, y: 33.3, width: 1.6 },
  { x: 149.5, y: 35.2, width: 1.6 },
  { x: 152.3, y: 37.1, width: 1.6 },
  { x: 149.5, y: 39, width: 1.6 },
  { x: 146.9, y: 40.9, width: 1.9 },
];
// The hanging end is above walking height, so earning this route never catches the main trail's feet.
// The same lace skill learned at the cliff, now anchored beside the summit cairn.
const CAIRN_LACE = { x: 147.6, bottom: 32.4, top: 40.9, exit: -1 as const, needs: 'found:chokladpralin', look: 'lace' as const };

export const berget: ChapterData = {
  id: 'berget',
  place: 'mountain',
  // Off the trail: over the shoulder, on the far shelf of the ring over the cobbles, on the last boulder's
  // top, and at the summit cairn. The two on shelves are for the brave: in sight from the trail below. The
  // first lies towards the far shelf's end, where he walks through it on his way down.
  hidden: [
    { x: 78, y: 25.9, kind: 'polkagris' },
    { x: 105.4, y: 29, kind: 'graddkola', way: 'over the ring above the cobbles' },
    { x: 136, y: 28.85, kind: 'salmiakruta', way: 'from lee to lee above the boulders' },
    { x: 146.9, y: 41.35, kind: 'chokladpralin', route: true },
  ],
  decor: [{ look: 'cairn', at: { x: 146.9, y: 40.9 } }],
  challenges: [{
    id: 'cairn', from: 145, to: 154, above: 32.9, reward: 'chokladpralin',
    steps: CAIRN.map(({ x, y }) => ({ x, y })), return: { x: 150.6, y: 31.4 }, backtrack: true,
  }],
  spawn: { x: 1, y: 0.01 },
  goalX: 157,
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the hill the crane takes off from, and the valley far below the flight
    { x: 6, y: 0 },
    { x: 6, y: -14 },
    { x: 64, y: -14 },
    // 2. the mountain's shoulder, and its slabs
    { x: 64, y: 24 },
    { x: 84, y: 24 },
    { x: 84, y: 25.2 },
    { x: 90, y: 25.2 },
    { x: 90, y: 26.4 },
    // 3. the cobbles, 4. the open granite, 5. the last cliff
    { x: 146, y: 26.4 },
    { x: 146, y: 31.4 },
    // 6. the old pine
    { x: 164, y: 31.4 },
    { x: 164, y: 45 },
  ],
  checkpoints: [
    { x: 74, y: 24 },
    { x: 95, y: 26.4 },
    { x: 108.4, y: 26.4 },
    { x: 138.4, y: 26.4 },
    { x: 149, y: 31.4 },
  ],
  climbs: [
    // The lace, lowered by the ghost from the top of the cliff.
    { x: 145.7, bottom: 26.4, top: 31.4, exit: 1, needs: 'lift', look: 'lace' },
    // The optional cairn loop reuses the same climbing/sliding skill, with no new Use step or reward flag.
    CAIRN_LACE,
  ],
  ledges: [...SHELVES, ...LEE_SHELVES],
  hooks: [SHELF_RING, ...LEE_RINGS],
  movers: CAIRN.map((shelf, i) => ({
    id: `cairn:${i + 1}`, look: 'stone', extra: true, width: shelf.width, height: 0.4, verb: 'push',
    // One stop is fixed ground, so there is no push or pull interaction on these shelves.
    stops: [{ x: shelf.x, y: shelf.y - 0.4 }],
  })),
  spots: [
    // He starts on the crane's back: it takes off at once.
    { id: 'flight', at: { x: 1, y: 0 }, verb: 'take', touch: true, ride: 'flight' },
    // The cobbles from the old shore: each always rings its own note, on every new visit.
    ...[98, 100, 102, 104, 106].map((x, i) => ({ id: `note:${i + 1}`, look: 'cobble' as const, at: { x, y: 26.4 }, verb: 'take' as const, touch: true, note: [67, 69, 71, 74, 76][i]! })),
    { id: 'lift', at: { x: 143.8, y: 26.4 }, verb: 'take', word: 'lift' },
    // Memory 4, at the old pine: the gust, the crack, and the last raspberry jelly.
    { id: 'memory', look: 'memory', at: { x: 153, y: 31.4 }, verb: 'take', touch: true },
  ],
  rides: [{ id: 'flight', look: 'crane', ...FLIGHT }],
  gusts: [{ from: BOULDERS[0]!, to: BOULDERS[BOULDERS.length - 1]!, y: 26.4, every: 4, length: 1.4, first: 0.5, shelters: BOULDERS }],
  ghost: [
    { at: { x: 76.5, y: 24 } },
    { at: { x: 87, y: 25.2 } },
    { at: { x: 93, y: 26.4 } },
    { at: { x: 109.6, y: 26.4 } },
    // from boulder to boulder
    { at: { x: 120.4, y: 26.4 } },
    { at: { x: 130.8, y: 26.4 } },
    { at: { x: 140, y: 26.4 } },
    // stuck below the cliff, with the bag too heavy: it doesn't run
    { at: { x: 145, y: 26.4 }, until: 'lift', thought: { picture: 'lonely-figure', until: 'lift' } },
    // up, it waits by the pine
    { at: { x: 151, y: 31.4 }, near: 1.6 },
    { at: { x: 159, y: 31.4 }, near: 1.6 },
  ],
  // He understands when he has seen it.
  beats: [
    { id: 'fetch', on: 'memory', who: 'elof', line: 'fetch' },
    { id: 'cairn-loop', on: 'found:chokladpralin', who: 'elof', line: 'mountainLoop' },
  ],
  cameras: [
    // Above the pine, frame the next shelf and the way back in both orientations.
    { from: 145, to: 154, above: 32.9, zoom: 1.6, lift: 1.3, lead: 0 },
    // On the rock shelves, show the ring above him and the cobbles below. The lee shelves need no zone of
    // their own: the open granite's picture is wide enough for the rings and the ground.
    { from: 89, to: 108, above: 27.6, zoom: 1.4, lift: -0.5 },
    { from: -3, to: 70, zoom: 1.7, lift: 0.5 },
    { from: 108, to: 138, zoom: 1.35 },
    { from: 140, to: 150, zoom: 1.3, lift: 0.5 },
    { from: 150, to: 164, zoom: 1.4, lift: 0.3 },
  ],
  candy: [
    // 1. the flight
    ...inFlight(),
    // 2. the shoulder and its slabs
    ...row(74, 82, 24),
    { x: 83.4, y: 25.3 },
    ...row(85, 89, 25.2),
    // 3. past the cobbles
    ...row(91, 109, 26.4),
    // 4. across the open granite
    ...row(111.5, 135.5, 26.4),
    // 5. to the cliff, and up the lace
    ...row(137.5, 143.5, 26.4),
    { x: 145.7, y: 28 },
    { x: 145.7, y: 29.8 },
    // 6. to the old pine
    ...row(147.5, 155.5, 31.4),
  ],
  // Hearts and lollipops, off the trail: add new ones at the end.
  side: [
    // The rock shelves: one over each on the way up, and three along the ring's arc. The lowest of those is
    // within a held jump of the cobbles, the tell of the ring; the other two are well out of a jump's reach,
    // and the last hangs where the far shelf begins. The far shelf itself has the sweet.
    ...SHELVES.slice(0, 6).map(over),
    ...[-0.75, 0, 0.75].map((angle) => onArc(SHELF_RING, angle)),
    // The lee shelves: one over each low shelf and one over each high shelf before the last. And one high on
    // each swing, where it comes into the next lee: letting go there, no gust takes him.
    ...BOULDERS.slice(0, -1).flatMap((x) => [over({ x, y: LEE.low }), over({ x, y: LEE.high })]),
    ...LEE_RINGS.map((ring) => onArc(ring, 0.8)),
  ],
};
