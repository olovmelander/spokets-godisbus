// The centreline comes from olovmelander/pekkas-pokal, commit 776236004403fb18423cc078ba4a82a6324bde14,
// src/games/kart/route.js: the source game's authored trace of the circuit described by VKRC.
// Its 77 points are kept as they are. The game's course is built on them in track.ts.

/** Digitised centreline of VKRC's official aerial photograph (960 × 720 picture units).
 * No source photograph is bundled or used as a game texture. */
export const TRACK_SOURCE = 'https://vkrc.se/klubben/banan/';
export const TRACK_PLAN: readonly (readonly [number, number])[] = [
  [440, 294], [500, 287], [555, 268], [609, 230], [660, 182],
  [715, 142], [758, 122], [787, 129], [809, 151], [818, 182],
  [814, 216], [808, 260], [810, 310], [813, 363], [817, 418],
  [822, 477], [825, 538], [825, 563], [825, 576], [822.87, 586.72],
  [816.8, 595.8], [807.72, 601.87], [797, 604], [786.28, 601.87],
  [777.2, 595.8], [771.13, 586.72], [769, 576], [769, 546], [775, 513], [774, 475],
  [762, 434], [738, 401], [713, 378], [686, 370], [650, 375],
  [600, 376], [550, 374], [500, 373], [467, 377], [445, 395],
  [429, 421], [427, 443], [438, 463], [460, 474], [490, 474],
  [530, 465], [577, 452], [619, 442], [648, 441], [671, 454],
  [687, 476], [689, 496], [678, 518], [654, 532], [615, 542],
  [575, 553], [532, 561], [489, 565], [446, 558], [403, 542],
  [358, 520], [309, 504], [257, 493], [211, 481], [167, 462],
  [136, 440], [119, 414], [112, 390], [115, 367], [127, 343],
  [146, 325], [172, 315], [204, 310], [250, 309], [300, 307],
  [350, 304], [400, 299],
];
/** The picture's centre, which becomes the world's origin. */
export const PLAN_CENTRE: readonly [number, number] = [470, 364];

/** A closed centripetal Catmull–Rom spline through the plan, as a dense polyline in picture units.
 * The same curve the source game drew with three's CatmullRomCurve3('centripetal'). */
export function tracePolyline(perSegment = 48): { x: Float64Array; z: Float64Array } {
  const n = TRACK_PLAN.length, x = new Float64Array(n * perSegment), z = new Float64Array(n * perSegment);
  const at = (i: number) => TRACK_PLAN[((i % n) + n) % n]!;
  const knot = (a: readonly [number, number], b: readonly [number, number]) => Math.max(1e-4, Math.hypot(b[0] - a[0], b[1] - a[1]) ** .5);
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const t1 = knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    for (let j = 0; j < perSegment; j++) {
      const t = t1 + (t2 - t1) * j / perSegment;
      for (const axis of [0, 1] as const) {
        const a1 = (t1 - t) / t1 * p0[axis] + t / t1 * p1[axis];
        const a2 = (t2 - t) / (t2 - t1) * p1[axis] + (t - t1) / (t2 - t1) * p2[axis];
        const a3 = (t3 - t) / (t3 - t2) * p2[axis] + (t - t2) / (t3 - t2) * p3[axis];
        const b1 = (t2 - t) / t2 * a1 + t / t2 * a2;
        const b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3;
        (axis ? z : x)[i * perSegment + j] = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2;
      }
    }
  }
  return { x, z };
}
