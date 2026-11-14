/** The seven wooden rivals. They drive the player's own kart model through the same controls: a racing line,
 * a look-ahead wheel, hop-drifts through the bends for real sparks, item boxes, boost strips and tricks.
 * The racing line's optimiser is adapted from olovmelander/pekkas-pokal (776236004403fb18423cc078ba4a82a6324bde14,
 * src/games/kart/ai.js); the driving is written for this kart model. A seeded stream keeps races repeatable.
 */
import { DRIFT_RATE, TOP_SPEED, turnRate, type ItemId, type Kart, type KartControls, type RacerId } from './kart';
import { LAP, trackGap, type Track } from './track';

export interface RivalProfile { id: Exclude<RacerId, 'player'>; color: number; pace: number; skill: number; bold: number }
/** Original toy animals; their names are in sv.ts. */
export const RIVALS: readonly RivalProfile[] = [
  { id: 'fox', color: 0xe9793a, pace: 1, skill: .95, bold: .8 },
  { id: 'hare', color: 0xb49be0, pace: .985, skill: .82, bold: .7 },
  { id: 'owl', color: 0x5f9fe0, pace: .97, skill: .9, bold: .35 },
  { id: 'squirrel', color: 0x4dbb86, pace: .95, skill: .74, bold: .6 },
  { id: 'hedgehog', color: 0xe0566c, pace: .93, skill: .68, bold: .3 },
  { id: 'moose', color: 0x35aaa6, pace: .91, skill: .6, bold: .5 },
  { id: 'bear', color: 0xf08db4, pace: .89, skill: .5, bold: .5 },
];

/** Small deterministic PRNG (mulberry32). */
export function seededRandom(seed = 2012): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RacingLine {
  laneAt(distance: number): number;
  /** Signed bend of the driven path. */
  curvatureAt(distance: number): number;
  /** The speed a tidy drifting driver carries here. */
  speedAt(distance: number): number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SPACING = 2;

/** Outside, apex, outside: projected gradient descent with momentum on the path's squared curvature, with a small
 * pull towards the inside so a hairpin is not circled on its outside. Then the speed each bend allows, and a
 * backward pass so the kart lifts in time. */
export function buildRacingLine(track: Track, { iterations = 2600, shortcut = .012, margin = 1.5 } = {}): RacingLine {
  const count = Math.round(LAP / SPACING), ds = LAP / count;
  const kappa = new Float64Array(count), left = new Float64Array(count), right = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let j = 0; j < 4; j++) sum += track.curvature((i + (j - 1.5) / 4) * ds);
    kappa[i] = sum / 4; left[i] = track.roadLeft(i * ds) - margin; right[i] = track.roadRight(i * ds) - margin;
  }
  const lane = new Float64Array(count), velocity = new Float64Array(count), error = new Float64Array(count);
  const inv = 1 / (ds * ds), rate = .8 * ds ** 4 / 16;
  const at = (array: Float64Array, i: number) => array[(i + count) % count]!;
  const pathCurvature = () => {
    for (let i = 0; i < count; i++) error[i] = kappa[i]! / Math.max(.35, 1 - kappa[i]! * lane[i]!) + (at(lane, i + 1) - 2 * lane[i]! + at(lane, i - 1)) * inv;
  };
  for (let iteration = 0; iteration < iterations; iteration++) {
    pathCurvature();
    for (let i = 0; i < count; i++) {
      const tight = kappa[i]! / Math.max(.35, 1 - kappa[i]! * lane[i]!);
      const gradient = error[i]! * tight * tight + (at(error, i + 1) - 2 * error[i]! + at(error, i - 1)) * inv - shortcut * kappa[i]!;
      velocity[i] = velocity[i]! * .94 - rate * gradient;
      const next = clamp(lane[i]! + velocity[i]!, -right[i]!, left[i]!);
      if (next !== lane[i]! + velocity[i]!) velocity[i] = 0;
      lane[i] = next;
    }
  }
  // Exact signed curvature of the driven path in the world.
  const xs = new Float64Array(count), zs = new Float64Array(count), point = track.point(0);
  for (let i = 0; i < count; i++) { track.point(i * ds, lane[i]!, point); xs[i] = point.x; zs[i] = point.z; }
  const bend = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i + count - 1) % count, b = (i + 1) % count;
    const turn = Math.atan2(xs[b]! - xs[i]!, zs[b]! - zs[i]!) - Math.atan2(xs[i]! - xs[a]!, zs[i]! - zs[a]!);
    bend[i] = Math.atan2(Math.sin(turn), Math.cos(turn)) / Math.max(.2, (Math.hypot(xs[b]! - xs[i]!, zs[b]! - zs[i]!) + Math.hypot(xs[i]! - xs[a]!, zs[i]! - zs[a]!)) / 2);
  }
  const curvature = new Float64Array(count), speeds = new Float64Array(count);
  const grip = (DRIFT_RATE.turn + DRIFT_RATE.range) * TOP_SPEED * .88;
  for (let i = 0; i < count; i++) {
    curvature[i] = (at(bend, i - 1) + 2 * bend[i]! + at(bend, i + 1)) / 4;
    speeds[i] = Math.min(TOP_SPEED * 1.5, Math.sqrt(grip / Math.max(1e-4, Math.abs(curvature[i]!))));
  }
  for (let pass = 0; pass < 2; pass++) for (let i = count - 1; i >= 0; i--) speeds[i] = Math.min(speeds[i]!, Math.sqrt(at(speeds, i + 1) ** 2 + 2 * 16 * ds));
  const sample = (table: Float64Array, distance: number) => {
    const x = (((distance / ds) % count) + count) % count, i = Math.floor(x), f = x - i;
    return table[i]! * (1 - f) + table[(i + 1) % count]! * f;
  };
  return { laneAt: d => sample(lane, d), curvatureAt: d => sample(curvature, d), speedAt: d => sample(speeds, d) };
}

export interface Brain {
  profile: RivalProfile;
  random(): number;
  phase: number;
  /** The lane it is steering for, eased so it never twitches. */
  lane: number;
  drifting: boolean;
  /** This bend is taken on the wheel alone: decided once as the bend begins. */
  plainBend: boolean;
  side: number;
  driftClock: number;
  outClock: number;
  /** Seconds until it uses what it holds. */
  itemClock: number;
  held: ItemId | null;
  tricked: boolean;
  rocket: boolean;
}

export function createBrain(profile: RivalProfile, seed: number): Brain {
  const random = seededRandom(seed);
  return { profile, random, phase: random() * 100, lane: 0, drifting: false, plainBend: false, side: 0, driftClock: 0, outClock: 0, itemClock: 0, held: null, tricked: false, rocket: random() < profile.skill * .6 };
}

/** Invisible elastic: rivals far ahead of the player ease off a little (`wait`), rivals far behind find a little more (`chase`). */
export function elastic(rivalDistance: number, playerDistance: number, wait = 1, chase = 1): number {
  const gap = rivalDistance - playerDistance;
  return 1 - clamp((gap - 20) / 130, 0, 1) * .09 * wait + clamp((-gap - 25) / 160, 0, 1) * .05 * chase;
}

export interface RivalWorld {
  track: Track;
  line: RacingLine;
  karts: readonly Kart[];
  /** Sticky gum lying on the road. */
  gums: readonly { distance: number; lane: number }[];
  /** Item boxes that can be taken now. */
  boxes: readonly { at: number; lane: number; active: boolean }[];
  dt: number;
}

const NEUTRAL: KartControls = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };

/** One rival's controls for this step. */
export function rivalControls(kart: Kart, brain: Brain, world: RivalWorld): KartControls {
  const { track, line, dt } = world, v = Math.max(0, kart.speed), s = kart.distance;
  if (kart.held) return { ...NEUTRAL, throttle: 1, drift: brain.rocket };
  const done = kart.finishTime !== null;
  const look = 6 + v * .34;
  let lane = line.laneAt(s + look) + Math.sin(s * .021 + brain.phase) * (1 - brain.profile.skill) * 1.3;
  if (!done) {
    // Reach for an item box when empty-handed, and for a boost strip that lies near the line.
    if (!kart.item && !kart.roulette) {
      let best = Infinity, want = lane;
      for (const box of world.boxes) {
        const gap = trackGap(s, box.at);
        if (!box.active || gap < 6 || gap > 46) continue;
        const cost = gap * .1 + Math.abs(box.lane - lane);
        if (cost < best) { best = cost; want = box.lane; }
      }
      lane = want;
    }
    for (const pad of track.pads) {
      const gap = trackGap(s, pad.from);
      if (gap > 2 && gap < 34 && Math.abs(pad.lane - lane) < 3.4) lane = pad.lane;
    }
    // Round the puddles, the gum and the kart ahead, on the side with more room.
    const dodge = (at: number, where: number, reach: number, room: number) => {
      const gap = trackGap(s, at);
      if (gap < 1 || gap > reach || Math.abs(where - lane) > room) return;
      const side = Math.abs(where) > .6 ? -Math.sign(where) : lane >= where ? 1 : -1;
      lane = where + side * (room + .5);
    };
    if (brain.profile.skill > .55) for (const puddle of track.mud) dodge(puddle.at, puddle.lane, 26, puddle.wide + .9);
    for (const gum of world.gums) dodge(gum.distance, gum.lane, 14 + brain.profile.skill * 16, 1.7);
    for (const other of world.karts) {
      if (other === kart || other.finishTime !== null) continue;
      const gap = trackGap(s, other.distance);
      if (gap > 1 && gap < 11 && v > other.speed + .4) dodge(other.distance, other.lane, 11, 2);
      else if (Math.abs(gap) <= 2.6 && Math.abs(other.lane - kart.lane) < 2.4) lane = other.lane > kart.lane ? Math.min(lane, other.lane - 2.1) : Math.max(lane, other.lane + 2.1);
    }
  } else lane = lane * .5;
  lane = clamp(lane, 1.2 - track.roadRight(s + look), track.roadLeft(s + look) - 1.2);
  brain.lane += (lane - brain.lane) * (1 - Math.exp(-5 * dt));

  // The wheel: the road's own bend, plus a pursuit of the wanted lane.
  const bend = track.curvature(s + look * .4);
  const wanted = Math.atan2(brain.lane - kart.lane, look);
  const need = bend / Math.max(.3, 1 - bend * kart.lane) + 2 * Math.sin(wanted - kart.heading) / look;
  const omega = Math.max(v, 4) * need;
  const plain = omega / Math.max(.05, turnRate(v, kart.assist));
  let steer = clamp(plain, -1, 1), drift = false;
  if (!done && kart.spin <= 0) {
    if (!brain.drifting) {
      // A bend that asks for more than the wheel has, and goes on: hop into a drift.
      const ahead = line.curvatureAt(s + v * .45), coming = line.curvatureAt(s + v * .9);
      const lasting = ahead * omega > 0 && Math.abs(ahead) > .03 && coming * omega > 0;
      if (Math.abs(plain) < .4) brain.plainBend = false;
      else if (Math.abs(plain) > .78 && lasting && v > .55 * TOP_SPEED * kart.cc && !kart.airborne && !brain.plainBend) {
        if (brain.random() < .3 + brain.profile.skill) { brain.drifting = true; brain.side = Math.sign(omega); brain.driftClock = 0; brain.outClock = 0; }
        else brain.plainBend = true;
      }
    }
    if (brain.drifting) {
      brain.driftClock += dt;
      const inward = (omega * brain.side * Math.max(v, .6 * TOP_SPEED) / TOP_SPEED - DRIFT_RATE.turn) / DRIFT_RATE.range;
      steer = brain.side * clamp(inward, -1, 1); drift = true;
      // Before the drift has caught, the wheel must be turned into the bend.
      if (!kart.drift) steer = brain.side * Math.max(.5, Math.abs(steer));
      brain.outClock = inward < -1.05 ? brain.outClock + dt : 0;
      if (brain.outClock > .1 || brain.driftClock > 5 || (brain.driftClock > .35 && !kart.drift)) brain.drifting = false;
    }
  } else brain.drifting = false;
  // A trick at the top of a ramp, for those who know how.
  if (track.onRamp(s, kart.lane)) {
    if (!brain.tricked && !brain.drifting && trackGap(s, track.ramps.find(ramp => trackGap(ramp.from, s) >= 0 && trackGap(s, ramp.to) >= 0)?.to ?? s) < 2.5) {
      brain.tricked = true; drift = brain.random() < brain.profile.skill * .85;
    }
  } else if (!kart.airborne) brain.tricked = false;

  const target = line.speedAt(s + v * .25) * (done ? .6 : 1);
  // Without a drift the wheel has less to give: lift when it runs out, and brake when it is far short.
  const short = !drift && v > 12 && Math.abs(plain) > 1.08;
  const throttle = v < target && !short ? 1 : 0, brake = v > target + 5 || (short && Math.abs(plain) > 1.5) ? .5 : 0;

  // What it holds: boosts on a straight, a cone at a kart in its sights, gum for a kart on its tail.
  let item = false;
  if (kart.item !== brain.held) { brain.held = kart.item; brain.itemClock = kart.item ? .7 + brain.random() * 2.6 : 0; }
  if (kart.item && !done && kart.spin <= 0) {
    brain.itemClock -= dt;
    if (brain.itemClock <= 0) {
      const straight = Math.abs(line.curvatureAt(s + 8)) < .018 && Math.abs(line.curvatureAt(s + 24)) < .03;
      const near = (from: number, to: number, room: number) => world.karts.some(other => {
        const gap = trackGap(s, other.distance);
        return other !== kart && other.finishTime === null && gap > from && gap < to && Math.abs(other.lane - kart.lane) < room;
      });
      const patience = brain.itemClock < -7;
      if (kart.item === 'sweet' || kart.item === 'sweets3') item = straight && kart.boostTime <= 0 && !kart.drift;
      else if (kart.item === 'cone') item = (near(4, 30, 1.6) && Math.abs(kart.heading) < .2) || patience;
      else if (kart.item === 'gum') item = near(-16, -3, 3) || patience;
      else if (kart.item === 'bee' || kart.item === 'cloud') item = kart.place > 1 || patience;
      else item = true;
      if (item) brain.itemClock = .5 + brain.random() * .8;
    }
  }
  return { steer, throttle, brake, drift, item };
}
