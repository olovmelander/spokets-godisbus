import { ATLAS, LIFE, STRIPS, WALK, type Ink, type Role, type Smoke, type Strip } from '../content/life';
import type { LifeStage, PlaceId } from '../sim/types';

/**
 * What the far scenery's life does (content/life.ts says who there is). From where the camera looks, the
 * clock, and whether he is busy, it says which quads to draw: where, which cell of the atlas, which colour.
 * It knows nothing of three or of the page, so a test can let ten minutes pass in it.
 *
 * Three kinds, so that it stays a gift. What is always there is small, slow and pale: smoke, far windows.
 * What happens does so on a stage, a stretch the chapter names where the far view is open and the trail is
 * calm: one thing at a time, never in a chapter's first seconds, never while he is busy, and never soon
 * after the last. And it answers nothing: no button, call or jump changes what it does.
 */

/** At most this many quads, in one draw call. */
export const QUADS = 32;
/**
 * A quad's numbers: its left, its foot, its width and height, in EL from the middle of the picture and the
 * eye line; the picture's left and right and its foot and top in the atlas; its colour as light; and how
 * solid it is at its top and at its foot.
 */
export const STRIDE = 13;
/** Nothing happens in a chapter's first seconds, or sooner than this after the last thing left. */
export const FIRST = 8;
export const GAP = 25;
/** A flock that has not left the picture by now fades out. */
const LONGEST = 40;

export interface Watch {
  /** Where the camera looks, along the chapter. */
  x: number;
  /** The view's clock: a pause stops everything. */
  clock: number;
  /** How far the camera is from the play plane, and half the picture's width for each EL of distance. */
  eye: number;
  slope: number;
  /** He is in the air, on a ride, in the bubble, on a hose, in a family picture, in the mist or in a gust. */
  busy: boolean;
  /** Reduced motion: only what is always there, and the slow walkers. */
  calm: boolean;
  /** How far night has fallen, from 0 to 1. */
  night: number;
  /**
   * Its pictures have not arrived: nothing begins, not even a kind that was asked for by name. What is always
   * there is said all the same, and is drawn unseen with a clear picture, so that the place's draw calls are
   * the same before the pictures come as after.
   */
  wait?: boolean;
}

export interface LifePlan {
  readonly quads: Float32Array;
  /** Which of the place's slots this frame's quads hang in. */
  readonly slot: number;
  /** What is on stage, or null. */
  readonly on: string | null;
  /** Fills `quads` for this frame, and says how many there are. */
  step(watch: Watch): number;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => clamp(v) ** 2 * (3 - 2 * clamp(v));
const fract = (v: number) => v - Math.floor(v);
/** A colour with the place's haze in it, as light: the far pictures are painted the same way. */
const light = (ink: Ink, haze: Ink, much: number): Ink => [0, 1, 2].map((i) => ((ink[i]! + (haze[i]! - ink[i]!) * much) / 255) ** 2.2) as unknown as Ink;

/**
 * `seed` decides what comes in some visits only. `now` puts that kind on stage at once and again and again,
 * for pictures and tests. `chimneys` are the place's own, where the picture they stand on says where they are.
 */
export function lifePlan(place: PlaceId, stages: readonly LifeStage[] = [], seed = 0, now: string | null = null, chimneys?: Smoke['at']): LifePlan | null {
  const cast = LIFE[place];
  if (!cast) return null;
  const quads = new Float32Array(QUADS * STRIDE);
  const chance = (k: number) => fract(Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453);
  // A stage is played once a visit, and one that comes in some visits only is decided here.
  const waiting = stages.map((stage, i) => {
    const role = cast.roles[stage.kind];
    return !!role && chance(i) < (role.odds ?? 1);
  });
  const smokeInk = cast.smoke && light(cast.smoke.ink, cast.haze, cast.slots[0]!.haze);
  // What shines is not hazed, and is brighter than paint: a window, a car's lights, a falling star.
  const glow = cast.lights && [cast.lights.ink, cast.lights.road.ink, cast.lights.star.ink].map((ink) => light(ink, ink, 0).map((c) => c * 1.3) as unknown as Ink);
  /** How many birds fly in a flock's longer arm. */
  const arm = (role: Role) => Math.ceil((role.birds! - 1) * 0.6);
  let count = 0;
  let last = NaN;
  let rest = GAP;
  let lit = 0;
  let dark = NaN;
  let on: { kind: string; role: Role; ink: Ink; t: number; from: number; far: number; halt: number; speed: number } | null = null;

  function put(strip: Strip, cell: number, x: number, y: number, w: number, h: number, ink: Ink, top: number, foot = top, a = 0, b = 1, flip = false): void {
    if (count >= QUADS || top < 0.004) return;
    const u = (strip[0] + (cell % strip[5]) * strip[2]) / ATLAS[0];
    const v = (strip[1] + Math.floor(cell / strip[5]) * strip[3]) / ATLAS[1];
    const du = strip[2] / ATLAS[0];
    const dv = strip[3] / ATLAS[1];
    let i = count++ * STRIDE;
    quads[i++] = x;
    quads[i++] = y + a * h;
    quads[i++] = w;
    quads[i++] = (b - a) * h;
    quads[i++] = flip ? u + du : u;
    quads[i++] = flip ? u : u + du;
    quads[i++] = v + (1 - a) * dv;
    quads[i++] = v + (1 - b) * dv;
    quads[i++] = ink[0];
    quads[i++] = ink[1];
    quads[i++] = ink[2];
    quads[i++] = top;
    quads[i] = foot;
  }

  function enter(kind: string, role: Role, w: Watch): void {
    const here = cast!.slots[role.slot]!;
    const reach = (w.eye - here.z) * w.slope;
    const centre = w.x * here.hold;
    const walks = role.act === 'walk';
    // A hoof that stands goes back under the body as fast as the body goes on: the stride over the cycle.
    const speed = role.speed ?? (WALK.stride * role.size * WALK.fps) / 12;
    // A walker comes out of the mist ahead of him and goes off the other way. A flock crosses the whole sky.
    const far = walks ? Math.min(reach * 1.05, 27) : reach * 2 + role.size * (2 + arm(role) * 1.6);
    on = {
      kind, role, speed, far, t: 0,
      // A walker's cells are shaded: lit along the back, dark under the belly. On the whole they are its ink.
      ink: light(role.ink, cast!.haze, here.haze).map((c) => (walks ? c / WALK.shade : c)) as unknown as Ink,
      from: centre + (walks ? Math.min(reach * 0.62, 17) : reach + role.size),
      // It stops when it has shown the cell where its hooves are down, a third of the way: ahead of him still, and
      // to one side of the middle of the picture, where he and the things he uses are.
      halt: role.stops ? (Math.round(((far * 0.36) / speed - 0.6) / 1.2) * 12 + WALK.halt + 1) / WALK.fps : Infinity,
    };
  }

  function step(w: Watch): number {
    const dt = Math.min(0.1, Math.max(0, w.clock - last)) || 0;
    last = w.clock;
    count = 0;
    if (on && w.calm && !on.role.calm) on = null;
    if (!on) {
      rest += dt;
      const role = now ? cast!.roles[now] : undefined;
      if (w.wait) {
        // Nothing begins unseen: a stage is not used up before its pictures are there.
      } else if (role && rest > 2) enter(now!, role, w);
      else if (!now && w.clock >= FIRST && rest >= GAP && !w.busy) {
        const i = stages.findIndex((stage, k) => waiting[k] && w.x >= stage.from && w.x <= stage.to && (!w.calm || cast!.roles[stage.kind]!.calm));
        if (i >= 0) {
          waiting[i] = false;
          enter(stages[i]!.kind, cast!.roles[stages[i]!.kind]!, w);
        }
      }
    }
    const here = cast!.slots[on?.role.slot ?? 0]!;
    const reach = (w.eye - here.z) * w.slope;
    const centre = w.x * here.hold;

    // Smoke: puffs rise from each chimney in sight, lean with the wind, grow and thin out.
    const smoke = cast!.smoke;
    if (smoke && smokeInk && !on?.role.slot) for (const [p, y] of chimneys ?? smoke.at) {
      const x = p + Math.round((centre - p) / smoke.every) * smoke.every - centre;
      if (Math.abs(x) > reach + 3) continue;
      for (let i = 0; i < smoke.puffs; i++) {
        // With reduced motion it all but stands.
        const age = fract(w.clock / (w.calm ? 30 : 8) + i / smoke.puffs + p * 0.37);
        const size = 0.8 + 1.7 * age;
        put(STRIPS.puff, 0, x + 2.4 * age ** 1.6 + 0.15 * Math.sin(age * 9 + i * 2) - size / 2, y + 4 * age - size / 2, size, size, smokeInk, smoke.alpha * Math.min(1, age * 8) * (1 - age * age));
      }
    }

    // The valley's windows: a few shine in the blue hour, and the others come one by one with the night.
    const lights = cast!.lights;
    if (lights && glow) {
      lit = Math.min(w.night, lit + dt / 9);
      const later = lights.at.length - lights.lit;
      for (let i = 0; i < lights.at.length; i++) {
        const [p, y] = lights.at[i]!;
        const shines = i < lights.lit ? 1 : clamp((lit * (later + 1) - (i - lights.lit + 0.5)) * 2);
        // One in four wavers, as a lamp behind a moving branch does.
        const waver = i % 4 || w.calm ? 1 : 0.75 + 0.25 * Math.sin(w.clock * 2.3 + i);
        put(STRIPS.dot, 0, p - centre - lights.size / 2, y - lights.size / 2, lights.size, lights.size, glow[0]!, shines * waver);
      }
      // A car creeps along the road between them, and the forest hides it for a while here and there.
      const road = lights.road;
      const long = Math.abs(road.to[0] - road.from[0]);
      const gone = fract((w.clock + 30) / road.every) * road.every * road.speed;
      if (gone < long) {
        const k = gone / long;
        const x = road.from[0] + (road.to[0] - road.from[0]) * k;
        const y = road.from[1] + (road.to[1] - road.from[1]) * k + 0.2 * Math.sin(k * 5);
        let seen = clamp(Math.min(gone, long - gone) * 2);
        for (const [a, b] of road.gone) seen = Math.min(seen, clamp(Math.max(a - x, x - b) * 3));
        for (let i = 0; i < 2; i++) put(STRIPS.dot, 0, x - i * 0.5 - centre - 0.13, y - 0.13, 0.26, 0.26, glow[1]!, seen * 0.9);
      }
      // One shooting star, a while after night has fallen.
      if (w.night < 1) dark = NaN;
      else if (!(dark >= 0)) dark = w.clock + 20 + 20 * chance(9);
      const star = lights.star;
      const k = (now === 'star' ? w.clock % 1.6 : w.clock - dark) / star.seconds;
      if (!w.calm && k >= 0 && k <= 1) {
        put(STRIPS.streak, 0, reach * 0.3 - star.long * k, star.y - star.long * 0.5 * k, star.wide, star.wide / 2, glow[2]!, Math.sin(Math.PI * k) ** 0.6);
      }
    }

    if (!on) return count;
    const { role, ink, speed } = on;
    const t = (on.t += dt);
    if (role.act === 'walk') {
      const walked = t < on.halt ? t : Math.max(on.halt, t - WALK.stand);
      const gone = walked * speed;
      const s = t - on.halt;
      const stands = s >= 0 && s < WALK.stand;
      // Standing: as it stopped; the head comes up and turns this way through three cells; it looks, with one
      // flick of an ear; and the head goes down again the same way.
      const rise = Math.min(s - 0.5, WALK.stand - 0.42 - s) / 0.16;
      const cell = !stands ? Math.floor(walked * WALK.fps) % 12 : rise < 0 ? 0 : rise < 3 ? 1 + Math.floor(rise) : s > 2.3 && s < 2.5 ? 5 : 4;
      const wide = WALK.cell * role.size;
      const tall = wide * 0.8;
      const x = on.from - gone - centre - wide / 2;
      const y = role.y - WALK.foot * role.size;
      // It comes out of the haze and goes back into it.
      const solid = role.alpha * ease(Math.min(gone, on.far - gone) / 2.5);
      const strip = stands ? STRIPS.stand : STRIPS.walk;
      // Two quads: the legs fade towards the hooves, so they go into the mist and no hoof has to meet any ground.
      const knee = (WALK.foot + WALK.tall * WALK.mist) / (WALK.cell * 0.8);
      put(strip, cell, x, y, wide, tall, ink, solid, solid * WALK.hoof, 0, knee, true);
      put(strip, cell, x, y, wide, tall, ink, solid, solid, knee, 1, true);
      if (gone >= on.far) on = null;
    } else {
      const birds = role.birds!;
      const lead = on.from - t * speed - centre;
      const solid = role.alpha * clamp((LONGEST - t) / 2);
      // A leader and two arms behind it, one longer than the other, bending slowly.
      const upper = arm(role);
      for (let i = 0; i < birds; i++) {
        const rank = i > upper ? i - upper : i;
        const x = lead + rank * role.size * 1.6 - role.size / 2;
        if (Math.abs(x) > reach + role.size) continue;
        const y = role.y + rank * role.size * (i > upper ? -0.5 : 0.38) + 0.12 * role.size * rank * Math.sin(t * 0.5 + rank * 0.7);
        put(role.strip!, Math.floor(t * 5 + i * 1.37) % 4, x, y, role.size, role.size / 2, ink, solid, solid, 0, 1, true);
      }
      if (t * speed >= on.far || t >= LONGEST) on = null;
    }
    if (!on) rest = 0;
    return count;
  }

  return {
    quads,
    get slot() { return on?.role.slot ?? 0; },
    get on() { return on?.kind ?? null; },
    step,
  };
}
