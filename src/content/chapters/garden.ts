import type { Candy, ChapterData } from '../../sim/types';

/**
 * Kapitel 1: Gården (plan §3.4), in greybox. Units: EL. Elof is tiny, the deck is a cliff, and the garden
 * is a country. The places, from the left:
 *
 * 1. **The deck** (P1): steps like cliffs, and the gap where Pappa has lifted a board.
 * 2. **The deck's edge** (P2): a ladybird on its back. Turned over, it flies to the hose, and shows the way
 *    down.
 * 3. **Under the deck** (P3): the candy lace on a nail. One swing over flat ground, where a miss costs
 *    nothing; then one over the drain gully.
 *    - **The swing chain** (C1), for whoever looks up: two more nails high under the boards. From the first
 *      swing he can let go on the way up and throw again in the air, and again: three swings in a row, and
 *      at the top of the last one hangs a hidden candy. From there the crossing's own hook is in reach, and
 *      takes him over the gully. Missing costs nothing: he lands on the ground below, or the glitter bubble
 *      carries him back from the gully.
 * 4. **The dandelion:** the ghost stumbles, and can nearly be caught.
 * 5. **The lawn:** the birch's roots, and a boulder.
 * 6. **Under the birch** (E1): the dew rain.
 * 7. **Pappa's shavings** (P4): a curl pulled down as a step, and a second pushed across the gap at the top.
 *    There lies the first memory.
 * 8. **Moa** (S1): she throws her paper plane, and Elof flies to the forest's edge.
 *
 *    - **Hittegods** (O2): a marble, a hair clip, a toy brick and a coin lie on the foundation stones. A
 *      jump takes each.
 *
 * 5b. **Daggklockspelet** (O1): on the lawn between the roots, four drops of dew ring when he hops up to them.
 *
 * Not built yet: the ghost at the forest's edge. What is here is the ground, the candy and the rules; what it looks like comes later.
 */

/** A row of candy along flat ground, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45 });
  return out;
}

/** Where the plane is at `t` of its way, `offset` EL above the middle of its path: as the simulation flies it. */
const PLANE = { from: { x: 166, y: 0 }, to: { x: 206, y: 0 }, rise: 8, time: 7 };
function inFlight(t: number, offset: number): Candy {
  const k = t * t * (3 - 2 * t);
  const x = PLANE.from.x + (PLANE.to.x - PLANE.from.x) * k;
  const y = Math.sin(Math.PI * t) * (PLANE.rise + offset) + 0.5;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export const garden: ChapterData = {
  id: 'garden',
  place: 'garden',
  // A clue to the ghost's secret, once at the gully on every help setting (§3.4, §4.6).
  // It looks at the second hook and double-knocks; Använd is not pulsed until he asks for more help.
  helper: { kind: 'ghost', visit: { id: 'gully', from: 59, to: 62, at: { x: 63.5, y: 3.3 } } },
  // The deck and its steps; the dry earth under the lower deck; the boulder; Pappa's shavings; the hedge.
  surfaces: [
    { from: -19, to: 46, kind: 'wood' },
    { from: 46, to: 66.4, kind: 'earth' },
    { from: 101, to: 105, kind: 'stone' },
    { from: 134, to: 154.5, kind: 'shavings' },
    { from: 178, to: 181, kind: 'hedge' },
  ],
  // The deck goes on overhead, level with where he stood: its joists are where the chain's nails sit.
  roofs: [{ from: 46.6, to: 66.4, y: 5.95 }],
  // Off the trail: behind him at the start, at the end of the swing chain, over the boulder, and before Moa.
  hidden: [
    { x: -1.8, y: 6.5, kind: 'gelehallon' },
    { x: 61.85, y: 3.65, kind: 'gummibjorn', route: true },
    { x: 103, y: 3.2, kind: 'skumbanan' },
    { x: 160.5, y: 1.9, kind: 'skumsvamp' },
  ],
  house: { from: -40, to: 72, windows: [4, 24, 40, 58] },
  spawn: { x: 1, y: 6.01 },
  goalX: 210,
  ground: [
    { x: -3, y: 16 },
    { x: -3, y: 6 },
    // 1. the deck: a step for a hop, a step for a held jump, the lifted board, and the highest step
    { x: 8, y: 6 },
    { x: 8, y: 6.6 },
    { x: 12, y: 6.6 },
    { x: 12, y: 7.6 },
    { x: 17, y: 7.6 },
    { x: 17, y: 0 },
    { x: 18.6, y: 0 },
    { x: 18.6, y: 7.6 },
    { x: 23, y: 7.6 },
    { x: 23, y: 6.9 },
    { x: 27, y: 6.9 },
    { x: 27, y: 7.95 },
    { x: 31, y: 7.95 },
    { x: 31, y: 7.2 },
    { x: 33, y: 7.2 },
    { x: 33, y: 6.4 },
    { x: 35, y: 6.4 },
    { x: 35, y: 6 },
    // 2. the deck's edge
    { x: 46, y: 6 },
    { x: 46, y: 0 },
    // 3. under the deck: the drain gully
    { x: 62, y: 0 },
    { x: 62, y: -6 },
    { x: 66.4, y: -6 },
    { x: 66.4, y: 0 },
    // 5. the lawn: two roots and a boulder
    { x: 80, y: 0 },
    { x: 83, y: 1.4 },
    { x: 86, y: 1.4 },
    { x: 89, y: 0 },
    { x: 93, y: 0 },
    { x: 95, y: 1.1 },
    { x: 97, y: 0 },
    { x: 101, y: 0 },
    { x: 101, y: 1.3 },
    { x: 105, y: 1.3 },
    { x: 105, y: 0 },
    // 7. the shavings: a wall, and the gap at the top
    { x: 134, y: 0 },
    { x: 134, y: 3.3 },
    { x: 140, y: 3.3 },
    { x: 140, y: -2 },
    { x: 142.8, y: -2 },
    { x: 142.8, y: 3.3 },
    { x: 150, y: 3.3 },
    { x: 154.5, y: 0 },
    // 8. the hedge the plane flies over, and the forest's edge
    { x: 178, y: 0 },
    { x: 178, y: 4.5 },
    { x: 181, y: 4.5 },
    { x: 181, y: 0 },
    { x: 214, y: 0 },
    { x: 214, y: 12 },
  ],
  checkpoints: [
    { x: 4.5, y: 6 },
    { x: 21, y: 7.6 },
    { x: 37, y: 6 },
    { x: 49, y: 0 },
    { x: 60, y: 0 },
    { x: 69, y: 0 },
    { x: 108, y: 0 },
    { x: 118.2, y: 0 },
    { x: 130, y: 0 },
    { x: 144.6, y: 3.3 },
    { x: 160, y: 0 },
  ],
  // The hose hangs over the deck's edge. The ladybird, turned over, flies to it: until then he doesn't see it.
  climbs: [{ x: 46.3, bottom: 0, top: 6, exit: -1, needs: 'ladybird' }],
  spots: [
    { id: 'ladybird', look: 'ladybird', at: { x: 41, y: 6 }, verb: 'turn' },
    // Hittegods (O2): four small things lost between the boards, each on a foundation stone under the deck.
    // He takes one by jumping up to it; walking past leaves it.
    { id: 'lost:marble', look: 'marble', at: { x: 48.4, y: 1.7 }, verb: 'take', touch: true },
    { id: 'lost:clip', look: 'clip', at: { x: 50.4, y: 1.7 }, verb: 'take', touch: true },
    { id: 'lost:brick', look: 'brick', at: { x: 57.9, y: 1.7 }, verb: 'take', touch: true },
    { id: 'lost:coin', look: 'coin', at: { x: 59.9, y: 1.7 }, verb: 'take', touch: true },
    // Daggklockspelet (O1): four drops of dew on bent blades of grass over the lawn. A hop rings one, each a
    // note of the polska's opening D–F–A–D. They can always be played again.
    ...[89.6, 91, 92.4, 97.9].map((x, i) => ({ id: `note:dew${i + 1}`, look: 'dew' as const, at: { x, y: 1.6 }, verb: 'take' as const, touch: true, note: [74, 77, 81, 86][i]! })),
    // Memory 1, on top of Pappa's shavings: the night he carved his first figure.
    { id: 'memory', look: 'memory', at: { x: 147, y: 3.3 }, verb: 'take', touch: true },
    { id: 'moa', look: 'sign', at: { x: 166, y: 0 }, verb: 'call', word: 'callMoa', ride: 'plane' },
  ],
  song: { flag: 'dewsong', notes: ['note:dew1', 'note:dew2', 'note:dew3', 'note:dew4'] },
  hooks: [
    // The first swing is over flat ground: a miss costs nothing.
    { x: 54, y: 3.4, length: 2.6, land: { x: 57.4, y: 0 } },
    // The second crosses the gully.
    { x: 63.5, y: 3.3, length: 2.7, land: { x: 67.8, y: 0 } },
    // The swing chain (C1): two nails high under the boards, out of reach from the ground.
    // The last one is short, so its swing goes high: the candy hangs where only that swing reaches.
    { x: 57.4, y: 4.9, length: 2.8, extra: true },
    { x: 60.6, y: 4.9, length: 2, extra: true },
  ],
  movers: [
    // A curl of shaving on the wall's top, with a red ring: pulled down, it is the step up.
    { id: 'curl', look: 'curl', width: 1.2, height: 1.5, verb: 'pull', ring: { x: -0.5, y: 0.3 }, stops: [{ x: 134.7, y: 3.3 }, { x: 133.3, y: 0 }] },
    // A second curl on the top: two pushes lay it across the gap.
    { id: 'bridge', look: 'curl', width: 3.1, height: 0.4, verb: 'push', stops: [{ x: 137.6, y: 3.3 }, { x: 139.4, y: 3.3 }, { x: 141.4, y: 2.9 }] },
  ],
  drips: [
    { at: { x: 111, y: 0 }, every: 1.8, first: 0.2 },
    { at: { x: 113.2, y: 0 }, every: 2.2, first: 1.1 },
    { at: { x: 115.4, y: 0 }, every: 1.6, first: 0.7 },
    { at: { x: 121, y: 0 }, every: 2, first: 0.4 },
    { at: { x: 123.2, y: 0 }, every: 1.5, first: 1.2 },
    { at: { x: 125.2, y: 0 }, every: 2.4, first: 0.9 },
  ],
  rides: [{ id: 'plane', ...PLANE }],
  jumps: [
    { at: { x: 7.8, y: 6 }, dir: 1, land: { x: 8.7, y: 6.6 } },
    { at: { x: 11.8, y: 6.6 }, dir: 1, land: { x: 12.7, y: 7.6 } },
    { at: { x: 16.8, y: 7.6 }, dir: 1, land: { x: 19.3, y: 7.6 } },
    { at: { x: 26.8, y: 6.9 }, dir: 1, land: { x: 27.7, y: 7.95 } },
    { at: { x: 100.8, y: 0 }, dir: 1, land: { x: 101.7, y: 1.3 } },
    { at: { x: 132.4, y: 0 }, dir: 1, land: { x: 133.3, y: 1.5 }, needs: 'curl' },
    { at: { x: 133.5, y: 1.5 }, dir: 1, land: { x: 134.6, y: 3.3 }, needs: 'curl' },
  ],
  ghost: [
    { at: { x: 5.6, y: 6 } },
    { at: { x: 10, y: 6.6 } },
    { at: { x: 14.6, y: 7.6 } },
    // on the far side of the lifted board
    { at: { x: 20.8, y: 7.6 } },
    { at: { x: 25, y: 6.9 } },
    { at: { x: 29.4, y: 7.95 } },
    { at: { x: 37.8, y: 6 } },
    // down from the deck
    { at: { x: 44.4, y: 6 }, near: 3 },
    { at: { x: 50.5, y: 0 } },
    { at: { x: 58.6, y: 0 } },
    { at: { x: 68.6, y: 0 } },
    // the dandelion
    { at: { x: 74, y: 0 }, catch: 'dandelion' },
    { at: { x: 78.4, y: 0 } },
    { at: { x: 84.5, y: 1.4 } },
    { at: { x: 91, y: 0 } },
    { at: { x: 99, y: 0 } },
    { at: { x: 103, y: 1.3 } },
    { at: { x: 108.6, y: 0 } },
    { at: { x: 118.6, y: 0 } },
    { at: { x: 129, y: 0 } },
    { at: { x: 136.8, y: 3.7 } },
    { at: { x: 145, y: 3.3 } },
    // on the birch root, juggling a candy
    { at: { x: 158.4, y: 0 }, near: 2.2 },
    // the root hole Moa's fingers can't enter: there it is gone
    { at: { x: 163.4, y: 0 }, near: 2.2 },
  ],
  beats: [
    // Pappa's two lines come as the chapter opens: they are his last in the prologue.
    { id: 'follow1', at: 0.9, who: 'pappa', line: 'follow1' },
    { id: 'follow2', at: 3.2, who: 'pappa', line: 'follow2' },
    { id: 'stomp', at: 155.6, who: 'elof', line: 'stomp' },
    { id: 'moa1', at: 161.5, who: 'moa', line: 'tiny' },
  ],
  cameras: [
    { from: 46, to: 59, zoom: 1.25, lift: 0.4 },
    // Portrait includes the hook and its landing during the helper's demonstration.
    { from: 59, to: 70, zoom: 1.8, lift: 0.4, lead: 3.6 },
    { from: 108, to: 128, zoom: 1.25, lead: 3.2 },
    { from: 130, to: 152, zoom: 1.2 },
    { from: 164, to: 208, zoom: 1.5, lift: 0.5 },
  ],
  candy: [
    // 1. the deck
    ...row(2.6, 6.6, 6),
    { x: 7.4, y: 6.75 },
    { x: 8, y: 7.2 },
    { x: 8.7, y: 7.1 },
    { x: 10.4, y: 7.05 },
    // a high arc: hold Hoppa
    { x: 11.2, y: 7.5 },
    { x: 11.7, y: 8.1 },
    { x: 12.4, y: 8.2 },
    ...row(14, 15.6, 7.6, 1.6),
    // the lifted board
    { x: 16.8, y: 8.35 },
    { x: 17.8, y: 8.8 },
    { x: 18.8, y: 8.35 },
    { x: 20.2, y: 8.05 },
    { x: 22.3, y: 8.05 },
    ...row(23.8, 25.8, 6.9),
    { x: 26.3, y: 7.8 },
    { x: 26.8, y: 8.4 },
    { x: 27.5, y: 8.55 },
    { x: 29.2, y: 8.4 },
    { x: 31.8, y: 7.65 },
    { x: 33.8, y: 6.85 },
    // 2. the deck's edge
    ...row(36, 44, 6),
    { x: 46.3, y: 5 },
    { x: 46.3, y: 3.5 },
    { x: 46.3, y: 2 },
    // 3. under the deck
    ...row(47.6, 51.6, 0),
    // along the first swing, and the flight from it
    { x: 53, y: 0.95 },
    { x: 54, y: 0.8 },
    { x: 55, y: 0.95 },
    { x: 56.4, y: 1.5 },
    { x: 57.4, y: 0.9 },
    { x: 59, y: 0.45 },
    { x: 61, y: 0.45 },
    // along the second, and the ramp of candy out of the gully
    { x: 62.5, y: 0.8 },
    { x: 63.5, y: 0.6 },
    { x: 64.5, y: 0.8 },
    { x: 66, y: 1.75 },
    { x: 66.8, y: 1.6 },
    { x: 67.6, y: 0.8 },
    // 4. the dandelion
    ...row(70.4, 72.4, 0),
    { x: 74.8, y: 0.6, after: 'dandelion' },
    { x: 75.2, y: 0.8, after: 'dandelion' },
    { x: 75.6, y: 0.9, after: 'dandelion' },
    { x: 76, y: 0.8, after: 'dandelion' },
    { x: 76.4, y: 0.6, after: 'dandelion' },
    { x: 77, y: 0.45 },
    // 5. the lawn
    { x: 79, y: 0.45 },
    { x: 81.5, y: 1.15 },
    { x: 84.5, y: 1.85 },
    { x: 87.5, y: 1.15 },
    ...row(90, 92, 0),
    { x: 95, y: 1.55 },
    ...row(97.6, 99.6, 0),
    { x: 100.6, y: 1.1 },
    { x: 101.5, y: 1.9 },
    { x: 103.4, y: 1.75 },
    { x: 105.8, y: 0.6 },
    { x: 107, y: 0.45 },
    // 6. under the birch
    { x: 109.6, y: 0.45 },
    { x: 112.1, y: 0.45 },
    { x: 114.3, y: 0.45 },
    { x: 116.5, y: 0.45 },
    { x: 119.6, y: 0.45 },
    { x: 122.1, y: 0.45 },
    { x: 124.2, y: 0.45 },
    { x: 126.4, y: 0.45 },
    // 7. the shavings
    ...row(128, 131.4, 0, 1.7),
    { x: 133.2, y: 2 },
    { x: 134.2, y: 3.8 },
    { x: 135.6, y: 3.75 },
    { x: 141.4, y: 3.75 },
    { x: 143.6, y: 3.75 },
    ...row(146, 149, 3.3, 1.5),
    { x: 151.5, y: 2.65 },
    { x: 153.5, y: 1.2 },
    // 8. Moa, and the flight
    ...row(155.5, 164.5, 0, 1.8),
    inFlight(0.05, 0),
    inFlight(0.1, 0),
    inFlight(0.16, 0),
    inFlight(0.24, 0.8),
    inFlight(0.31, 1.3),
    inFlight(0.38, 0.6),
    inFlight(0.45, -0.6),
    inFlight(0.52, -1.3),
    inFlight(0.59, -0.6),
    inFlight(0.66, 0.6),
    inFlight(0.73, 1.2),
    inFlight(0.8, 0.4),
    inFlight(0.87, 0),
    inFlight(0.93, 0),
    ...row(207, 209, 0),
  ],
};
