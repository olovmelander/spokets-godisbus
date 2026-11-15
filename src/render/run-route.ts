/**
 * A run that bends (`ActorKey.via`, ../sim/scene.ts): Moa and Bertil running up to mormor and morfar's house in Billsta
 * and round its end (Olov, 14 November 2026: "De måste springa mot huset och sedan runt det"). A scene's ordinary move
 * is a straight line eased from rest to rest, so a way of several legs was a row of stops, and their way of two legs
 * went straight through the house's corner. This is one smooth curve through the points given, run at an even pace:
 * quickly up to speed, and slowing only where it ends. No three, no DOM: the stage (./stage.ts) and the tests read it.
 */

/** A point on the ground: along the course, and towards the camera. */
export interface GroundPoint { x: number; z: number }

/** A way along the ground: the curve as short straight pieces, and how far along it each piece's start is. */
export interface Route {
  readonly points: readonly GroundPoint[];
  readonly along: readonly number[];
  readonly length: number;
}

/** How many pieces each stretch between two given points is drawn in. */
const PIECES = 14;
/** How long a runner takes to get up to speed, and to slow to a stop, in seconds; and the most of a move either may be. */
export const RUN_UP = 1.1, RUN_DOWN = 0.8, RAMP_MOST = 0.4;

/**
 * The curve through the points, in order (a centripetal Catmull-Rom spline: it goes through each point, and never
 * loops or overshoots between two of them as the uniform one does where the points are unevenly spaced).
 */
export function routeThrough(through: readonly GroundPoint[]): Route {
  const given = through.filter((p, i) => i === 0 || Math.hypot(p.x - through[i - 1]!.x, p.z - through[i - 1]!.z) > 1e-6);
  const points: GroundPoint[] = [{ x: given[0]!.x, z: given[0]!.z }];
  const knot = (a: GroundPoint, b: GroundPoint) => Math.sqrt(Math.hypot(b.x - a.x, b.z - a.z));
  for (let i = 0; i < given.length - 1; i++) {
    const p1 = given[i]!, p2 = given[i + 1]!;
    // Beyond the ends, a point mirrored through the end: the curve leaves and arrives along its first and last stretch.
    const p0 = given[i - 1] ?? { x: 2 * p1.x - p2.x, z: 2 * p1.z - p2.z };
    const p3 = given[i + 2] ?? { x: 2 * p2.x - p1.x, z: 2 * p2.z - p1.z };
    const t0 = 0, t1 = t0 + knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    for (let k = 1; k <= PIECES; k++) {
      const t = t1 + ((t2 - t1) * k) / PIECES;
      const mixed = (a: number, b: number, ta: number, tb: number) => (a * (tb - t) + b * (t - ta)) / (tb - ta);
      const at = (c: 'x' | 'z') => {
        const a1 = mixed(p0[c], p1[c], t0, t1), a2 = mixed(p1[c], p2[c], t1, t2), a3 = mixed(p2[c], p3[c], t2, t3);
        const b1 = mixed(a1, a2, t0, t2), b2 = mixed(a2, a3, t1, t3);
        return mixed(b1, b2, t1, t2);
      };
      points.push({ x: at('x'), z: at('z') });
    }
  }
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z));
  return { points, along, length: along[along.length - 1]! };
}

/**
 * Where on a route a runner is when `p` of it (0 to 1) is behind them, and which way they go there: `travel` in turns
 * about the vertical as the stage counts a walk's (`atan2(dx, dz)`), eased across each joint of two pieces.
 */
export function routeAt(route: Route, p: number): { x: number; z: number; travel: number } {
  const { points, along } = route;
  const far = Math.min(1, Math.max(0, p)) * route.length;
  let i = 1;
  while (i < points.length - 1 && along[i]! < far) i++;
  const a = points[i - 1]!, b = points[i]!;
  const piece = along[i]! - along[i - 1]!;
  const k = piece > 0 ? (far - along[i - 1]!) / piece : 0;
  const heading = (n: number) => {
    const from = points[Math.max(0, n - 1)]!, to = points[Math.min(points.length - 1, n)]!;
    return Math.atan2(to.x - from.x, to.z - from.z);
  };
  // The heading goes from the middle of one piece to the middle of the next, so that it never steps at a joint.
  const here = heading(i), other = heading(k < 0.5 ? Math.max(1, i - 1) : Math.min(points.length - 1, i + 1));
  let turn = other - here;
  turn -= Math.round(turn / (2 * Math.PI)) * 2 * Math.PI;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, travel: (here + turn * Math.abs(k - 0.5)) / (2 * Math.PI) };
}

const ramp = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** The area under `ramp` from 0 to `t`. */
const ramped = (t: number) => (t <= 0 ? 0 : t >= 1 ? t - 0.5 : t * t * t - (t * t * t * t) / 2);

/** How much of a run's time getting up to speed and slowing take: as fractions of a move `seconds` long. */
function ramps(seconds: number): { up: number; down: number; top: number } {
  const up = Math.min(RAMP_MOST, RUN_UP / Math.max(1e-3, seconds)), down = Math.min(RAMP_MOST, RUN_DOWN / Math.max(1e-3, seconds));
  return { up, down, top: 1 / (1 - (up + down) / 2) };
}

/** A run's speed at `u` of its time (0 to 1), as a multiple of its mean speed: up, even, and down at its end. */
export function runRate(u: number, seconds: number): number {
  const { up, down, top } = ramps(seconds);
  if (u <= 0 || u >= 1) return 0;
  return top * Math.min(ramp(u / up), ramp((1 - u) / down));
}

/** How much of a run's way is behind the runner at `u` of its time: the area under `runRate`. */
export function runProgress(u: number, seconds: number): number {
  const { up, down, top } = ramps(seconds);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < up) return top * up * ramped(u / up);
  if (u <= 1 - down) return top * (up / 2 + (u - up));
  return 1 - top * down * ramped((1 - u) / down);
}

/** A run's fastest, as a multiple of its mean speed. */
export const runTop = (seconds: number) => ramps(seconds).top;
