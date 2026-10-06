import { timeCard } from './cards';
import { BERRY_HEIGHT } from '../../sim/constants';
import type { Candy, ChapterData, Hook, Jump, Ledge, Tussock, Vec } from '../../sim/types';

/**
 * Kapitel 3: Myren (plan §3.4), in greybox. Units: EL. The places, from the left:
 *
 * 1. **The edge of the bog,** and **the tussocks** (P11): they are the path, and open water lies between
 *    them. He never touches it: the glitter bubble catches him just above.
 * 2. **Sjunkande tuvor** (E3): further out, the pale tussocks sink while he stands on them. One that sinks
 *    under him sends him back to the last firm ground in the glitter bubble. A firm island with a big candy
 *    splits the stretch.
 * 3. **Mamma** (P12): at the wide pool, "Ropa på Mamma", and her hands lift a dead pine across it. At the
 *    boardwalk she lets her braid down, and he climbs it. At the top: "På myren går vi på spången."
 * 4. **Lysklubban** (P13): the trail ends at a lollipop the ghost has left for him. He takes it, the mist
 *    rolls in, and in its light the trail shows again.
 *    **Lyktgubbarnas lek** (C3) branches onto the high tussocks: three shy lights appear one after another,
 *    each further out in the mist. The last leaves the hidden candy, and the lower trail is the way back.
 * 5. **Tranungen** (P14): a crane chick alone on a tussock. It follows his light to its family. Once it is
 *    home, he can return to Mamma's sign at the clearing's edge. She lays a firm spång across the mist:
 *    an optional, reusable way back to the lantern, and from there to the reunited cranes.
 * 6. **The ghost waits,** and lets him come close.
 * 7. **Tranornas dans** (S4): a crane kneels, he climbs on, and it carries him up towards the mountain.
 *
 * And, as a toy: **two cranberries** at the edge of the bog (O7). Coming down on one bounces him twice as
 * high as he jumps, and at a run from the first he comes down on the second.
 *
 * Over the path lie the first layers (docs/level-design.md), each with side candy and each letting out
 * forward onto the trail: **a leaf over the first cranberry**, which only its bounce reaches; **leaves over
 * the firm tussocks**; and **three rings between the dead pines** over the boardwalk.
 *
 * And one puzzle, off the trail: **the toss.** Hearts and lollipops hang in an arch over the second run of
 * soft tussocks, up to a bough of a dead pine, and something glints in the moss under the foot of the arch.
 * Standing still there, on a tussock that sinks, is how he is thrown up to them.
 *
 * Not built yet: the tussocks' dip under his feet, Mamma's mug and her lamp behind
 * him, the rings of the cranes' calls as a thing to follow, memory 3,
 * the cranes' dance, the jay.
 */

/** Open water is a pit this deep to the simulation, and its surface is here. */
const DEEP = -6;
const WATER = -0.6;

/** A place to stand: firm ground or a tussock, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/** The firm tussocks of the first stretch, with a wide one to rest on, and the firm ground before the soft ones. */
const FIRM: Stone[] = [
  { from: 11.4, to: 14, y: 0.2 },
  { from: 15.4, to: 17.8, y: 0 },
  { from: 19.2, to: 22, y: 0.3 },
  { from: 23.5, to: 26, y: 0.1 },
  { from: 27.4, to: 30.4, y: 0.35 },
  { from: 31.8, to: 36, y: 0 },
  { from: 37.5, to: 40, y: 0.4 },
  { from: 41.5, to: 44, y: 0.8 },
  { from: 45.4, to: 47.6, y: 0.3 },
  { from: 49, to: 52, y: 0 },
];
/** The soft ones, in two runs, with a firm island between them and the pool's shore after them. */
const SOFT_A: Stone[] = [
  { from: 53.3, to: 55.3, y: 0 },
  { from: 56.6, to: 58.6, y: 0.15 },
  { from: 59.9, to: 61.9, y: 0 },
];
const ISLAND: Stone = { from: 63.2, to: 67, y: 0 };
const SOFT_B: Stone[] = [
  { from: 68.3, to: 70.3, y: 0.15 },
  { from: 71.6, to: 73.6, y: 0.3 },
  { from: 74.9, to: 76.9, y: 0.15 },
  { from: 78.2, to: 80.2, y: 0 },
];
const SHORE: Stone = { from: 81.5, to: 86, y: 0 };
/** The tussocks in the mist, between the lollipop and the cranes. */
const MIST: Stone[] = [
  { from: 151.4, to: 154, y: 0.2 },
  { from: 155.4, to: 158, y: 0 },
  { from: 159.4, to: 162, y: 0.3 },
  { from: 163.4, to: 166, y: 0.1 },
];

/**
 * The optional high tussocks, above the ordinary mist trail. The first needs an intentional jump, before
 * the ordinary water crossing begins. All later tops leave enough room for its jumps underneath them.
 * Heights are their tops; the small shelves reuse the solid support and ledge-grab rules.
 */
const SHY = [
  { x: 147.2, y: 1.9, width: 1.6 },
  { x: 150, y: 3.8, width: 1.6 },
  { x: 152.8, y: 4.5, width: 1.4 },
  { x: 155.6, y: 4.9, width: 1.4 },
  { x: 158.4, y: 4.3, width: 1.4 },
  { x: 161.2, y: 3.7, width: 1.8 },
];

/**
 * A leaf over the first cranberry, higher than he jumps and lower than the berry bounces him: jumping for
 * the heart over it, he comes down on the berry and is put on the leaf. It ends well before a running bounce
 * comes down again, so the run from the first berry to the second passes over it. It clears the big candy
 * that stands under its far end.
 */
const BERRY_LEAF: Ledge = { x: 3, y: 1.9, width: 2.4, look: 'leaf' };

/**
 * Leaves over the firm tussocks: a second level from the third tussock to the wide one with the big candy.
 * - The first is a held jump above the third tussock's far end, clear of where the ghost waits on its
 *   middle. A hop along the trail from that end is still rising when it has passed the leaf, so it goes on
 *   under the others, which are higher than any hop from a tussock rises.
 * - The second is a step up over the first: a held jump straight up again.
 * - From the second to the third, and from the third to the fourth, he jumps over open water. A jump he
 *   gives up on there is the glitter bubble, which puts him back on the leaf he left; a run off the end with
 *   no jump lands on the next tussock. The picture follows the ground under him, so over water it stays
 *   level, where over a tussock it would dip.
 * - He runs off the fourth onto the fifth, which is lower, and walks off the fifth onto the wide tussock.
 */
const LEAVES: Ledge[] = [
  { x: 21.7, y: 1.15, width: 1.4, look: 'leaf' },
  { x: 22.1, y: 1.95, width: 1.4, look: 'leaf' },
  { x: 24.75, y: 2.75, width: 2.5, look: 'leaf' },
  { x: 28.2, y: 2.75, width: 2, look: 'leaf' },
  { x: 31.1, y: 2.2, width: 2.2, look: 'leaf' },
];

/**
 * The dead pines over the boardwalk.
 * - Two branches of the first pine, one over the other, are the steps up from the boards: a held jump
 *   straight up to each.
 * - Three rings hang between the pines, at one height and one spacing: too high for the lace from the
 *   boards, in reach from the upper branch, and each in reach from where the one before lets him go.
 * - A branch of the second pine is where the third swing sets him down. It is too high to jump to from the
 *   boards, so the rings are the way to it, and he leaves it by walking off its end.
 * Nothing here is more than a safe drop over the boards.
 */
const STEPS: Ledge[] = [
  { x: 111.2, y: 5.35, width: 1.4, look: 'branch' },
  { x: 111.2, y: 6.2, width: 2, look: 'branch' },
];
const RINGS: Hook[] = [114.1, 117.5, 120.9].map((x) => ({ x, y: 9.1, length: 2.4, extra: true }));
const LANDING: Ledge = { x: 123.7, y: 6.2, width: 3, look: 'branch' };

/** A side candy over the middle of a ledge: he takes it standing there, and not from the ground under it. */
const above = (ledge: Ledge, lift: number): Candy => ({ x: ledge.x, y: round(ledge.y + lift) });

/** The two ways over water, each from firm ground to firm ground. */
const OUT: Stone[] = [{ from: -3, to: 10, y: 0 }, ...FIRM, ...SOFT_A, ISLAND, ...SOFT_B, SHORE];
const HOME: Stone[] = [{ from: 136, to: 150, y: 0 }, ...MIST, { from: 167.4, to: 190, y: 0 }];

/** A firm tussock in the ground's outline: up out of the water, across, and down again. */
const island = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];
const soft = (s: Stone): Tussock => ({ x: (s.from + s.to) / 2, y: s.y, width: s.to - s.from });
const round = (n: number) => Math.round(n * 100) / 100;

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[]): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.9), y: next.y } };
  });
}

/** The trail over water: one candy on each place to stand, and one in an arc over each hop. */
function over(way: Stone[], after?: string): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push({ x: round((here.to + next.from) / 2), y: round(Math.max(here.y, next.y) + 1.15), ...(after ? { after } : {}) });
    // The last place is firm ground with its own row.
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2), y: round(next.y + 0.45), ...(after ? { after } : {}) });
  }
  return out;
}

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2, after?: string): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: round(x), y: ground + 0.45, ...(after ? { after } : {}) });
  return out;
}

/** The ramp down from the boardwalk: from (128, 4.5) to (136, 0). */
const ramp = (x: number) => 4.5 - (4.5 * (x - 128)) / 8;

const CRANE = { from: { x: 182, y: 0 }, to: { x: 198, y: 8 }, rise: 5, time: 4.5, corridor: 0.5 };
/** A point on the crane's way, as the simulation flies it. */
function along(t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: round(CRANE.from.x + (CRANE.to.x - CRANE.from.x) * k),
    y: round(CRANE.from.y + (CRANE.to.y - CRANE.from.y) * k + Math.sin(Math.PI * t) * CRANE.rise + 0.5),
    after: 'light',
  };
}

/**
 * The toss: the one puzzle of the bog (docs/level-design.md, §1 point 8). Its rule is the soft tussocks', the
 * other way round: what has hurried him is here a lift.
 * - **What he sees,** from the island: an arch of hearts and lollipops over the second run of soft tussocks,
 *   far above any jump, up to a bough of a dead pine that stands in the water. Nothing leads up to it. In
 *   the moss at the far end of the first soft tussock, under the foot of the arch, something glints.
 * - **What he has to do** is the one thing the bog has taught him not to: stand still on a soft tussock.
 *   What glints lies deep under the moss, out of his reach from the top of it. Standing over it he sinks
 *   towards it, and when he has come near enough the tussock springs back and throws him along the arch,
 *   up onto the bough. He presses nothing, and he is thrown well before the tussock would have sunk.
 * - **Everywhere else it is a soft tussock like the others:** hurried over it does nothing, and on its near
 *   half it sinks under him and the glitter bubble takes him back.
 * The bough is too high to jump to, and he leaves it by walking off either end, down onto a soft tussock.
 * It throws him once. Like every ride it is there again in a game taken up before it, and after "Jag har
 * fastnat" has put him back before it; the candy stays in the bag.
 */
const SPRING: Stone = SOFT_B[0]!;
/**
 * Where it glints: this far from the middle of the tussock, towards its far end and the hearts. Someone who
 * stops where a hop sets him down, on its near half, is out of its reach however deep he sinks.
 */
const GLINT_ALONG = 0.7;
/**
 * How far under the top of the tussock the thing lies. He touches a thing from 1.2 EL, feet to thing
 * (TOUCH_REACH + 0.5 in the simulation), and a tussock sinks 0.45 in 1.8 s. So from the top of it he is
 * 0.3 short; standing over it, two thirds of the way down brings him there, after 1.2 s; and to its sides
 * it takes a little longer. Someone who crosses the tussock and hops on has not sunk a third of that. It is
 * drawn as its glint only, which floats 1.5 over a thing: in the moss at the top of the tussock.
 */
const GLINT_DEEP = 1.5;
const GLINT: Vec = { x: round((SPRING.from + SPRING.to) / 2 + GLINT_ALONG), y: round(SPRING.y - GLINT_DEEP) };
/**
 * The bough he is thrown onto, of a dead pine that stands in the water between the next two soft tussocks:
 * higher than a jump from either rises, and an end over each, so that walking off it he lands on one.
 */
const PERCH: Ledge = { x: 74.25, y: 2, width: 1.8, look: 'branch' };
/**
 * The throw: from where he has sunk to over the glint, over the next soft tussock, and down onto the bough
 * beside the stem. Nothing is drawn under him and nothing steers it, so every candy along it is his.
 */
const TOSS = { from: { x: GLINT.x, y: round(SPRING.y - (GLINT_DEEP - 1.2)) }, to: { x: 74, y: PERCH.y }, rise: 1.6, time: 1.2, corridor: 0 };
/** Where his middle is on the throw, as the simulation carries him. */
function tossed(t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: round(TOSS.from.x + (TOSS.to.x - TOSS.from.x) * k),
    y: round(TOSS.from.y + (TOSS.to.y - TOSS.from.y) * k + Math.sin(Math.PI * t) * TOSS.rise + 0.5),
  };
}

export const myren: ChapterData = {
  id: 'myren',
  place: 'bog',
  // Off the trail: behind him at the start; at the near end of the leaf the first cranberry bounces him up
  // to, out of the way of a bounce at a run; over the branch where the rings end, higher than a jump from the
  // boards reaches; and with the last shy light.
  hidden: [
    { x: -1.8, y: 0.5, kind: 'chokladpeng' },
    { x: 2.1, y: 2.45, kind: 'stektagg', way: 'bounced up from the cranberry' },
    { x: 124.2, y: 7.1, kind: 'surnapp', way: 'along the rings between the dead pines' },
    { x: 161.2, y: 4.15, kind: 'lakritskonfekt', route: true, after: 'shy:3' },
  ],
  // A lasting landmark for the lantern's clearing after he carries the light away.
  decor: [{ look: 'cairn', at: { x: 141.3, y: 0 }, after: 'light' }],
  challenges: [{
    id: 'shy', from: 145.8, to: 163, above: 1.55, reward: 'lakritskonfekt', needs: 'light',
    steps: SHY.map(({ x, y }) => ({ x, y })), return: { x: 164.7, y: 0.1 },
    pending: ['shy:1', 'shy:2', 'shy:3'],
  }],
  // Two cranberries on the firm ground at the start: a run from the first carries him to the second.
  bouncers: [
    { x: 2.9, y: BERRY_HEIGHT, lift: 2.2 },
    { x: 6, y: BERRY_HEIGHT, lift: 2.2 },
  ],
  // The boardwalk and its ramp are planks.
  surfaces: [{ from: 104, to: 136, kind: 'wood' }],
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (./cards.ts).
  scenes: [timeCard('myren', 1)],
  goalX: 197,
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the edge of the bog, and the tussocks
    { x: 10, y: 0 },
    { x: 10, y: DEEP },
    ...FIRM.flatMap(island),
    // 2. the soft tussocks float over the water; only the island between them is ground
    ...island(ISLAND),
    // 3. the pool's shore, the pool, and the boardwalk with its ramp down
    ...island(SHORE),
    { x: 94, y: DEEP },
    { x: 94, y: 0 },
    { x: 104, y: 0 },
    { x: 104, y: 4.5 },
    { x: 128, y: 4.5 },
    // 4. where the lollipop stands
    { x: 136, y: 0 },
    { x: 150, y: 0 },
    { x: 150, y: DEEP },
    // 5. the tussocks in the mist
    ...MIST.flatMap(island),
    // 6. and 7. the cranes' ground, and the hill the crane carries him onto
    { x: 167.4, y: DEEP },
    { x: 167.4, y: 0 },
    { x: 190, y: 0 },
    { x: 190, y: 8 },
    { x: 206, y: 8 },
    { x: 206, y: 20 },
  ],
  water: [
    { from: 10, to: 94, y: WATER },
    { from: 150, to: 167.4, y: WATER },
  ],
  tussocks: [...SOFT_A, ...SOFT_B].map(soft),
  // The second level: the leaf over the cranberry, the leaves over the tussocks, and the dead pines' branches.
  // And the bough the toss sets him down on.
  ledges: [BERRY_LEAF, ...LEAVES, ...STEPS, LANDING, PERCH],
  // The rings between the dead pines. They are off the way on: the boardwalk under them is the trail.
  hooks: RINGS,
  // What the rings hang from: a rope from the top of one dead pine to the top of the other.
  lines: [{ from: { x: STEPS[1]!.x, y: 10.3 }, to: { x: LANDING.x, y: 10.3 }, sag: 0.35, posts: true }],
  // Side candy, off the trail. None is taken by walking under it, or by a hop along the trail. It is drawn as
  // a heart and a lollipop by turns, in the order of this list, so the first of each way is a heart: its tell.
  side: [
    // Over the first cranberry, where its bounce carries him through the leaf, and over the leaf's far end.
    { x: 2.9, y: 2.4 },
    { x: 3.7, y: 2.4 },
    // Over the leaves: one over each, and two over the wide third one. The first hangs over its leaf's near
    // end, out of the way of the hop along the trail that sets off under the leaf.
    { x: 21.3, y: 1.8 },
    above(LEAVES[1]!, 0.6),
    { x: 24.3, y: 3.35 },
    { x: 25.4, y: 3.35 },
    above(LEAVES[3]!, 0.6),
    above(LEAVES[4]!, 0.6),
    // Over each step of the first pine.
    ...STEPS.map((step) => above(step, 0.55)),
    // Along the three swings: a heart where he hangs lowest under each ring, and a lollipop where it lets
    // him go to the next.
    ...RINGS.flatMap((ring) => [{ x: ring.x, y: 6.95 }, { x: round(ring.x + 1.7), y: 7.25 }]),
    // And where the third swing sets him down.
    { x: 123.2, y: 6.9 },
    // The toss: six along the throw, each where his middle passes, and all higher than a jump from the
    // tussocks under them reaches. By their places in this list a heart is the first of the arch, and a
    // heart is the last, over the bough.
    tossed(0.55),
    tossed(0.45),
    tossed(0.74),
    tossed(0.64),
    tossed(0.84),
    tossed(0.95),
  ],
  checkpoints: [
    { x: 4, y: 0 },
    { x: 34, y: 0 },
    { x: 50.4, y: 0 },
    { x: 65, y: 0 },
    { x: 83.4, y: 0 },
    { x: 96.5, y: 0 },
    { x: 106.2, y: 4.5 },
    { x: 139, y: 0 },
    { x: 169.5, y: 0 },
    { x: 180, y: 0 },
  ],
  climbs: [
    // Mamma's braid, let down from the boardwalk.
    { x: 103.7, bottom: 0, top: 4.5, exit: 1, needs: 'braid', look: 'braid' },
  ],
  spots: [
    { id: 'mamma', look: 'sign', at: { x: 84.8, y: 0 }, verb: 'call', word: 'callMamma' },
    { id: 'braid', look: 'sign', at: { x: 102.2, y: 0 }, verb: 'call', word: 'callMamma' },
    // The lollipop the ghost has stuck in the moss for him.
    { id: 'light', look: 'lollipop', at: { x: 142, y: 0 }, verb: 'take', word: 'takeLight' },
    // Only the next light is there; approaching it invites its friend further out to shine.
    { id: 'shy:1', look: 'wisp', at: { x: 150, y: 3.8 }, verb: 'take', touch: true, needs: 'light', extra: true },
    { id: 'shy:2', look: 'wisp', at: { x: 155.6, y: 4.9 }, verb: 'take', touch: true, needs: 'shy:1', extra: true },
    { id: 'shy:3', look: 'wisp', at: { x: 161.2, y: 3.7 }, verb: 'take', touch: true, needs: 'shy:2', extra: true },
    // Both routes meet at this tuft, so taking the upper path cannot miss the chick.
    // It follows his light, and comes home when he reaches its family.
    { id: 'chick', at: { x: 164.7, y: 0.1 }, verb: 'take', touch: true, needs: 'light' },
    { id: 'home', at: { x: 176, y: 0 }, verb: 'take', touch: true, needs: 'chick' },
    // The family reunion makes another way possible, without adding a job before the crane ride.
    // Its sign is beside the east landing, so the bridge's near end rises within the same picture.
    { id: 'bog:return-bridge', look: 'sign', at: { x: 169.2, y: 0 }, verb: 'call', word: 'callMamma', needs: 'home', extra: true },
    // The return is its own discovery, not another candy or an album reward to complete.
    { id: 'bog:lantern-return', at: { x: 142, y: 0 }, verb: 'take', touch: true, needs: 'placed:bog-boardwalk', extra: true },
    // Memory 3, where the ghost waits: the boardwalk, and the figure held up to see the way.
    { id: 'memory', look: 'memory', at: { x: 170.6, y: 0 }, verb: 'take', touch: true },
    { id: 'crane', look: 'crane', at: { x: 182, y: 0 }, verb: 'take', word: 'climbOn', needs: 'home', ride: 'crane' },
    // The toss: what glints under the first soft tussock after the island. He comes within its reach only
    // by sinking towards it, standing, and that throws him.
    { id: 'bog:toss', at: GLINT, verb: 'take', touch: true, extra: true, ride: 'toss' },
  ],
  movers: [
    // The dead pine in the pool: Mamma's hands lift it across as a bridge.
    { id: 'pine', look: 'log', width: 8.6, height: 0.4, verb: 'pull', on: 'mamma', stops: [{ x: 90, y: -1.5 }, { x: 90, y: -0.4 }] },
    // Only after helping the chick: Mamma lifts a plank over the lower mist trail. The old stepping
    // stones and upper lights remain. Its top clears all the old assisted-hop markers by more than
    // their reach in height, so stopping or turning on the new path never starts an old forward hop.
    // Both ends overlap firm ground and are automatically climbed without pressing Hoppa.
    { id: 'bog-boardwalk', look: 'plank', width: 20, height: 0.35, verb: 'pull', on: 'bog:return-bridge', extra: true,
      stops: [{ x: 158.5, y: -2.5 }, { x: 158.5, y: 0.3 }] },
    ...SHY.map((tuft, i) => ({
      id: `shy-tuft:${i + 1}`, look: 'tussock' as const, extra: true, width: tuft.width, height: 0.4, verb: 'push' as const,
      stops: [{ x: tuft.x, y: tuft.y - 0.4 }],
    })),
  ],
  rides: [{ id: 'crane', look: 'crane', ...CRANE }, { id: 'toss', look: 'none', ...TOSS }],
  jumps: [...hops(OUT), ...hops(HOME)],
  mist: { after: 'light' },
  // For the picture only (content/life.ts): what happens far off, where the trail is calm. A moose walks out of
  // the mist on the far shore while he crosses the wide firm tussocks after the second big candy: open water
  // before it, and nothing to use anywhere in the picture. Cranes cross the sky where he comes down from the
  // boardwalk to a big candy, before the lollipop brings the mist in: they are what will carry him later.
  life: [
    { kind: 'moose', from: 40.5, to: 45 },
    { kind: 'cranes', from: 136.5, to: 141 },
  ],
  follower: { at: { x: 164.7, y: 0.1 }, after: 'chick', until: 'home', home: { x: 177.4, y: 0 } },
  ghost: [
    { at: { x: 6, y: 0 } },
    { at: { x: 12.7, y: 0.2 } },
    { at: { x: 20.6, y: 0.3 } },
    { at: { x: 28.9, y: 0.35 } },
    { at: { x: 35, y: 0 } },
    { at: { x: 42.7, y: 0.8 } },
    { at: { x: 51.2, y: 0 } },
    { at: { x: 66, y: 0 } },
    { at: { x: 82.4, y: 0 } },
    // across the pool, and up on the boardwalk
    { at: { x: 98, y: 0 } },
    { at: { x: 109, y: 4.5 } },
    { at: { x: 118, y: 4.5 } },
    { at: { x: 126.5, y: 4.5 } },
    // it has left him the lollipop, and goes on into the mist
    { at: { x: 146.5, y: 0 } },
    { at: { x: 160.7, y: 0.3 } },
    // it waits on firm ground, and lets him come close
    { at: { x: 172.5, y: 0 }, near: 1.6, thought: { picture: 'pine-crack', after: 'home' } },
    { at: { x: 186.5, y: 0 }, near: 1.6, thought: { picture: 'pine-crack', after: 'home' } },
  ],
  beats: [
    { id: 'spangen', at: 105.4, who: 'mamma', line: 'spangen' },
    { id: 'bog:chick-light', on: 'chick', who: 'elof', line: 'bogChickLight' },
    { id: 'bog:family-home', on: 'home', who: 'mamma', line: 'bogFamilyHome' },
    { id: 'bog:bridge-ready', on: 'placed:bog-boardwalk', who: 'mamma', line: 'bogBridgeReady' },
    { id: 'bog:light-return', on: 'bog:lantern-return', who: 'elof', line: 'bogLightReturn' },
  ],
  cameras: [
    // The upper route needs its next landing and the lower way home in portrait as well as landscape.
    { from: 145.8, to: 163, above: 1.55, zoom: 1.45, lift: 0.6, lead: 0.8 },
    // On the leaves the picture is wider and lower, so the tussocks under him, and the one he will drop to,
    // are in it. A hop along the trail never rises this high.
    { from: 19, to: 33, above: 1.6, zoom: 1.4, lift: -0.8 },
    // Up among the rings it is wider and lower too: the next ring is in it, and so are the boards a fall
    // would land on. A jump on the boards never rises this high.
    { from: 109, to: 126, above: 5.75, zoom: 1.5, lift: -0.4 },
    // On the toss and on the bough it sets him down on the picture is wider, so that the hearts ahead of him
    // are in it, and from the bough the soft tussocks he will step down to. A hop along the trail never
    // rises this high.
    { from: 70.3, to: 75.7, above: 1.8, zoom: 1.5 },
    { from: 9, to: 50, zoom: 1.2 },
    { from: 50, to: 83, zoom: 1.3 },
    { from: 84, to: 97, zoom: 1.25 },
    { from: 99, to: 132, zoom: 1.3, lift: 0.4 },
    { from: 150, to: 168, zoom: 1.2 },
    { from: 179, to: 204, zoom: 1.5, lift: 0.8 },
  ],
  candy: [
    // 1. the edge of the bog, the tussocks, 2. the soft ones
    ...row(2.6, 8.6, 0),
    ...over(OUT),
    { x: 83, y: 0.45 },
    { x: 85.2, y: 0.45 },
    // 3. over the pool where the pine will lie, and to the boardwalk
    ...row(87.5, 93.5, 0),
    ...row(95.5, 101.5, 0),
    { x: 103.7, y: 1.6 },
    { x: 103.7, y: 3.2 },
    ...row(105, 127, 4.5),
    { x: 129.5, y: round(ramp(129.5) + 0.45) },
    { x: 131.5, y: round(ramp(131.5) + 0.45) },
    { x: 133.5, y: round(ramp(133.5) + 0.45) },
    { x: 135.5, y: round(ramp(135.5) + 0.45) },
    // 4. the trail ends at the lollipop
    ...row(137, 141, 0),
    // In its light the trail shows again: 5. the tussocks in the mist, 6. the cranes' ground
    ...row(143.5, 149.5, 0, 2, 'light'),
    ...over(HOME, 'light'),
    ...row(168.5, 180.5, 0, 2, 'light'),
    // 7. up on the crane
    along(0.2),
    along(0.35),
    along(0.5),
    along(0.65),
    along(0.8),
  ],
};
