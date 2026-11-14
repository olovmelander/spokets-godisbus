/** One kart's arcade handling, made for Godisracet: a hop into a held drift that charges three spark tiers,
 * boosts that ignore rough ground, jumps off ramps, and tumbles that cost a moment rather than a race.
 * It replaces the rental-kart tyre model the console first carried over; this one is meant to be thrown around.
 * Track frame throughout (see track.ts): `heading` is the direction of travel relative to the road.
 */
import type { Surface, Track } from './track';

export type RacerId = 'player' | 'fox' | 'owl' | 'hare' | 'squirrel' | 'hedgehog' | 'moose' | 'bear';
export type ItemId = 'sweet' | 'sweets3' | 'cone' | 'cones3' | 'bee' | 'gum' | 'cracker' | 'horn' | 'floss' | 'spring' | 'magnet' | 'rainbow' | 'rocket' | 'cloud';
export type BoostKind = 'start' | 'turbo1' | 'turbo2' | 'turbo3' | 'pad' | 'sweet' | 'trick' | 'draft';
export type HitKind = 'cone' | 'bee' | 'gum' | 'star' | 'cracker' | 'horn' | 'rocket';
export interface KartControls {
  /** +1 left, −1 right. */
  steer: number;
  throttle: number;
  brake: number;
  /** Held: a press hops, and held through a bend it drifts. */
  drift: boolean;
  /** A press. */
  item: boolean;
}
export type KartEvent =
  | { type: 'go' }
  | { type: 'hop' | 'driftStart' | 'trick' | 'jump' | 'recover' | 'shieldPop' | 'draft'; kart: number }
  | { type: 'tier'; kart: number; tier: number }
  | { type: 'boost'; kart: number; kind: BoostKind }
  | { type: 'land'; kart: number; air: number }
  | { type: 'wall'; kart: number; force: number }
  | { type: 'bump'; kart: number; other: number }
  | { type: 'box'; kart: number; box: number }
  | { type: 'item'; kart: number; item: ItemId }
  | { type: 'use'; kart: number; item: ItemId }
  | { type: 'hit'; kart: number; kind: HitKind; by: number }
  | { type: 'cloud'; kart: number; by: number }
  | { type: 'candy'; kart: number; candy: number }
  | { type: 'candyLost'; kart: number; count: number }
  | { type: 'shotEnd'; id: number; kind: 'cone' | 'bee' | 'gum' | 'cracker'; distance: number; lane: number }
  | { type: 'burst'; distance: number; lane: number; by: number }
  | { type: 'horn'; kart: number }
  | { type: 'lap'; kart: number; lap: number }
  | { type: 'finish'; kart: number; place: number };

export interface Kart {
  index: number;
  id: RacerId;
  color: number;
  distance: number;
  lane: number;
  heading: number;
  /** Forward speed; negative while backing up. */
  speed: number;
  /** Sideways shove from a bump or a barrier, fading out. */
  slide: number;
  steer: number;
  /** Height over the road, and the vertical speed that carries a jump. */
  y: number;
  vy: number;
  climb: number;
  airborne: boolean;
  airTime: number;
  trick: boolean;
  hop: number;
  /** −1 right, +1 left while a drift is held; its charge and the tier of sparks it has reached. */
  drift: number;
  driftCharge: number;
  driftTier: number;
  driftHeld: boolean;
  /** How far the body is turned out of its direction of travel. */
  slip: number;
  boostTime: number;
  boostPower: number;
  boostKind: BoostKind | null;
  spin: number;
  spinTotal: number;
  spinKind: HitKind | null;
  /** Seconds of being untouchable after a tumble. */
  guard: number;
  shield: number;
  star: number;
  cloud: number;
  /** Seconds left of a fizzy rocket that drives the kart by itself, and of a magnet that pulls sweets in. */
  rocket: number;
  magnet: number;
  candies: number;
  item: ItemId | null;
  itemCount: number;
  /** A roulette still spinning, and what it will stop on. */
  roulette: number;
  rolling: ItemId | null;
  surface: Surface;
  atWall: boolean;
  wallHit: number;
  /** A moment after a bump, so one touch is one knock. */
  bumped: number;
  /** A moment after a boost strip, so one strip is one boost. */
  padded: number;
  draft: number;
  wrongWay: number;
  held: boolean;
  /** Personal top-speed factor: rivals differ, and the difficulty sets how close to the player's they are. */
  pace: number;
  /** The speed class everyone in the race shares: 50, 100 or 150 cc as a share of full speed. */
  cc: number;
  /** Lugnt's helping hand: quicker steering, and a nudge away from the barriers. */
  assist: boolean;
  topSpeed: number;
  lap: number;
  completedLaps: number;
  lapTimes: number[];
  finishTime: number | null;
  place: number;
}

export const TOP_SPEED = 30;
export const KART_HALF_WIDTH = .95;
export const KART_RADIUS = 1.05;
/** Charge needed for blue, gold and pink sparks. */
export const DRIFT_TIERS = [.55, 1.3, 2.3] as const;
export const MAX_CANDIES = 10;
export const BOOSTS: Readonly<Record<BoostKind, { time: number; power: number }>> = {
  start: { time: 1.3, power: .3 }, turbo1: { time: .6, power: .2 }, turbo2: { time: 1.1, power: .27 }, turbo3: { time: 1.8, power: .34 },
  pad: { time: 1.1, power: .32 }, sweet: { time: 1.7, power: .36 }, trick: { time: .8, power: .25 }, draft: { time: 1.2, power: .15 },
};
const ACCEL = 17, COAST = 6, BRAKE = 30, REVERSE_TOP = 7, GRAVITY = 24;
const DRIFT_TURN = 1.3, DRIFT_RANGE = 1.1, DRIFT_MIN_SPEED = .45 * TOP_SPEED;
const HOP_TIME = .24, CANDY_SPEED = .007, GUARD = 1.5;
const SPIN_TIME: Readonly<Record<HitKind, number>> = { cone: 1.2, bee: 1.2, gum: .95, star: 1.3, cracker: 1.25, horn: 1, rocket: 1.3 };
/** How fast a fizzy rocket can turn its kart: enough for any hairpin at its speed. */
export const ROCKET_TURN = 7;
const ROCKET_SPEED = 1.38;
const ROUGH: Readonly<Record<Surface, number>> = { road: 1, planks: 1, mud: .7, rough: .6, snow: .6, water: .5 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export function newKart(index: number, id: RacerId, color: number, distance: number, lane: number): Kart {
  return {
    index, id, color, distance, lane, heading: 0, speed: 0, slide: 0, steer: 0, y: 0, vy: 0, climb: 0, airborne: false, airTime: 0,
    trick: false, hop: 0, drift: 0, driftCharge: 0, driftTier: 0, driftHeld: false, slip: 0, boostTime: 0, boostPower: 0,
    boostKind: null, spin: 0, spinTotal: 0, spinKind: null, guard: 0, shield: 0, star: 0, cloud: 0, rocket: 0, magnet: 0, candies: 0, item: null,
    itemCount: 0, roulette: 0, rolling: null, surface: 'road', atWall: false, wallHit: 0, bumped: 0, padded: 0, draft: 0, wrongWay: 0, held: true,
    pace: 1, cc: 1, assist: false, topSpeed: TOP_SPEED, lap: 1, completedLaps: 0, lapTimes: [], finishTime: null, place: index + 1,
  };
}

/** How fast the kart can turn without drifting: tight when slow, a wide arc at full speed. */
export function turnRate(speed: number, assist = false): number {
  return Math.min(2.6, (assist ? 56 : 40) / Math.max(speed, 1)) * clamp(speed / 3, 0, 1);
}
/** A drift's turn rate for a steering input into (+1) or out of (−1) the bend. */
export function driftRate(speed: number, inward: number): number {
  return (DRIFT_TURN + DRIFT_RANGE * clamp(inward, -1, 1)) * TOP_SPEED / Math.max(speed, .6 * TOP_SPEED);
}
export const DRIFT_RATE = { turn: DRIFT_TURN, range: DRIFT_RANGE } as const;

/** A refresh, never a pile: the stronger boost wins and the longer time stays. */
export function giveBoost(kart: Kart, kind: BoostKind, events: KartEvent[]): void {
  const boost = BOOSTS[kind];
  if (boost.power >= kart.boostPower || kart.boostTime < .2) { kart.boostPower = boost.power; kart.boostKind = kind; }
  kart.boostTime = Math.max(kart.boostTime, boost.time);
  events.push({ type: 'boost', kart: kart.index, kind });
}

/** A hit: the candy floss takes one, the rainbow lollipop shrugs it off, otherwise the kart tumbles and drops sweets. */
export function hitKart(kart: Kart, kind: HitKind, by: number, events: KartEvent[]): boolean {
  if (kart.star > 0 || kart.rocket > 0 || kart.guard > 0 || kart.spin > 0 || kart.finishTime !== null) return false;
  if (kart.shield > 0) { kart.shield = 0; kart.guard = .6; events.push({ type: 'shieldPop', kart: kart.index }); return false; }
  kart.spin = kart.spinTotal = SPIN_TIME[kind]; kart.spinKind = kind;
  kart.drift = 0; kart.driftCharge = 0; kart.driftTier = 0; kart.boostTime = 0; kart.boostPower = 0; kart.boostKind = null; kart.draft = 0;
  const lost = Math.min(3, kart.candies);
  kart.candies -= lost;
  events.push({ type: 'hit', kart: kart.index, kind, by });
  if (lost) events.push({ type: 'candyLost', kart: kart.index, count: lost });
  return true;
}

export function stepKart(kart: Kart, controls: Readonly<KartControls>, track: Track, dt: number, events: KartEvent[]): void {
  const k = kart;
  for (const timer of ['boostTime', 'guard', 'shield', 'star', 'cloud', 'rocket', 'magnet', 'hop', 'wallHit', 'bumped', 'padded'] as const) k[timer] = Math.max(0, k[timer] - dt);
  if (!k.boostTime) { k.boostPower = 0; k.boostKind = null; }
  if (k.spin > 0) {
    k.spin = Math.max(0, k.spin - dt);
    if (!k.spin) { k.guard = GUARD; k.spinKind = null; events.push({ type: 'recover', kart: k.index }); }
  }
  const spinning = k.spin > 0;
  const steerIn = spinning ? 0 : clamp(Number.isFinite(controls.steer) ? controls.steer : 0, -1, 1);
  const throttle = spinning ? 0 : clamp(Number.isFinite(controls.throttle) ? controls.throttle : 0, 0, 1);
  const brake = spinning ? 0 : clamp(Number.isFinite(controls.brake) ? controls.brake : 0, 0, 1);
  k.steer += (steerIn - k.steer) * ease(k.airborne ? 8 : 20, dt);
  if (k.held) { k.driftHeld = controls.drift; return; }

  // A press of the drift button hops; on a ramp, or just off it, the hop is a trick that lands with a boost.
  const pressed = controls.drift && !k.driftHeld;
  k.driftHeld = controls.drift;
  if (pressed && !spinning) {
    if (!k.trick && (k.airborne ? k.airTime < .3 : track.onRamp(k.distance, k.lane))) { k.trick = true; events.push({ type: 'trick', kart: k.index }); }
    else if (!k.airborne) { k.hop = HOP_TIME; events.push({ type: 'hop', kart: k.index }); }
  }

  // What the ground allows.
  if (!k.airborne) k.surface = track.surface(k.distance, k.lane);
  // The class and the kart's own pace scale everything, boosts included: a slower kart's turbo is a slower turbo.
  const rocket = k.rocket > 0, boosted = k.boostTime > 0 || rocket, free = boosted || k.star > 0, top = TOP_SPEED * k.cc * k.pace;
  let limit = top * (1 + CANDY_SPEED * k.candies);
  if (k.star > 0) limit *= 1.15;
  if (!free) limit *= ROUGH[k.surface];
  if (boosted) limit = Math.max(limit, top * (rocket ? ROCKET_SPEED : 1 + k.boostPower));
  if (k.cloud > 0) limit *= .62;
  k.topSpeed = limit;

  let v = k.speed;
  if (spinning) v += (Math.min(v, 4) - v) * ease(3, dt);
  else if (k.airborne) v -= v * .05 * dt;
  else if (brake > 0) v = v > .3 ? Math.max(0, v - BRAKE * brake * dt) : Math.max(-REVERSE_TOP, v - 12 * brake * dt);
  else if (v < 0) v = Math.min(0, v + (throttle > 0 ? BRAKE : COAST) * dt);
  else {
    const drive = clamp((limit - v) / (.3 * limit), -1.3, 1);
    v += (drive > 0 ? ACCEL * drive * throttle * (boosted ? 2.6 : 1) - (throttle > 0 ? 0 : COAST) : ACCEL * drive) * dt;
    v = Math.max(0, v);
  }
  k.speed = v;
  // A boost strip fires once as the kart crosses it.
  if (!k.airborne && !spinning && v > 3 && k.padded <= 0 && track.pad(k.distance, k.lane)) { k.padded = .6; giveBoost(k, 'pad', events); }

  // Drift: held with a turn of the wheel it locks to that side, charges sparks, and is spent on release.
  const grounded = !k.airborne;
  if (k.drift && (!controls.drift || spinning)) {
    if (!spinning && k.driftTier > 0) giveBoost(k, (['turbo1', 'turbo2', 'turbo3'] as const)[k.driftTier - 1]!, events);
    k.drift = 0; k.driftCharge = 0; k.driftTier = 0;
  }
  if (k.drift && (v < DRIFT_MIN_SPEED * k.cc * .8 || brake > 0)) { k.drift = 0; k.driftCharge = 0; k.driftTier = 0; }
  if (!k.drift && controls.drift && grounded && !spinning && !rocket && brake === 0 && v > DRIFT_MIN_SPEED * k.cc && Math.abs(k.steer) > .25) {
    k.drift = Math.sign(k.steer); k.driftCharge = 0; k.driftTier = 0;
    events.push({ type: 'driftStart', kart: k.index });
  }
  let omega: number;
  if (k.drift) {
    const inward = k.steer * k.drift;
    omega = k.drift * driftRate(v, inward);
    if (grounded && k.surface !== 'water') k.driftCharge += dt * (.3 + .9 * (.5 + .5 * inward) ** 1.5);
    const tier = DRIFT_TIERS.filter(need => k.driftCharge >= need).length;
    if (tier > k.driftTier) { k.driftTier = tier; events.push({ type: 'tier', kart: k.index, tier }); }
    k.slip += (k.drift * (.44 + .2 * inward) - k.slip) * ease(9, dt);
  } else if (rocket) {
    // The rocket steers for itself (the race hands it the wheel), and turns as hard as the road asks.
    omega = steerIn * ROCKET_TURN;
    k.slip += (0 - k.slip) * ease(7, dt);
  } else {
    omega = k.steer * turnRate(Math.abs(v), k.assist) * (v >= 0 ? 1 : -1);
    k.slip += (k.steer * .1 * clamp(v / TOP_SPEED, 0, 1) - k.slip) * ease(7, dt);
  }
  if (k.airborne) omega *= .35;
  // Lugnt: the kart leans away from a barrier it is heading for, as a hand on the wheel would.
  if (k.assist && grounded && !spinning && v > 6) {
    const room = k.lane > 0 ? track.roadLeft(k.distance) - k.lane : track.roadRight(k.distance) + k.lane, side = Math.sign(k.lane);
    if (room < 1.6 && k.heading * side > -.12) omega -= side * (1.6 - Math.max(0, room)) * 1.1;
  }
  // Facing the wrong way for a while, the kart is turned round again.
  k.wrongWay = Math.abs(k.heading) > 1.75 ? k.wrongWay + dt : 0;
  if (k.wrongWay > 1.4) omega = -Math.sign(k.heading) * 2.6;

  // Along the road and across it.
  const kappa = track.curvature(k.distance);
  const along = v * Math.cos(k.heading), across = v * Math.sin(k.heading) + k.slide;
  const ds = along / Math.max(.3, 1 - kappa * k.lane);
  k.distance += ds * dt; k.lane += across * dt;
  k.heading += (omega - kappa * ds) * dt;
  if (k.heading > Math.PI) k.heading -= Math.PI * 2; else if (k.heading < -Math.PI) k.heading += Math.PI * 2;
  k.slide *= Math.exp(-4 * dt);

  // Barriers: a graze costs little, a square hit costs speed and the drift.
  const left = track.wallLeft(k.distance) - KART_HALF_WIDTH, right = track.wallRight(k.distance) - KART_HALF_WIDTH;
  k.atWall = k.lane > left || k.lane < -right;
  if (k.atWall) {
    const side = k.lane > left ? 1 : -1, out = across * side;
    k.lane = side > 0 ? left : -right;
    if (out > 0) {
      const force = clamp(out / 14, 0, 1);
      k.speed *= 1 - .5 * force;
      if (k.heading * side > 0) k.heading = k.heading * .25 - side * .04;
      k.slide = -side * out * .3;
      if (out > 5 && k.wallHit <= 0) {
        k.wallHit = .35; events.push({ type: 'wall', kart: k.index, force });
        if (force > .45) { k.drift = 0; k.driftCharge = 0; k.driftTier = 0; }
      }
    }
  }

  // Up and down: the kart follows the road and its ramps, and flies when the ground falls away under it.
  const ground = track.bump(k.distance, k.lane), slope = (track.height(k.distance + .5) - track.height(k.distance - .5)) * ds;
  if (!k.airborne) {
    if (k.y - ground > .25 && Math.abs(k.speed) > 8) {
      // Off the end of a ramp (or its side) with the speed it was climbing at, and with the rise of the road
      // it was still on a moment ago (kept in vy while the kart is on the ground).
      k.airborne = true; k.airTime = 0; k.vy += k.climb;
      events.push({ type: 'jump', kart: k.index });
    } else { k.climb = clamp((ground - k.y) / dt, 0, 10); k.y = ground; k.vy = slope; }
  }
  if (k.airborne) {
    // Height is kept over the road, so a road that drops away under a jump makes it longer.
    k.vy -= GRAVITY * dt; k.y += (k.vy - slope) * dt; k.airTime += dt;
    if (k.y <= ground) {
      k.y = ground; k.airborne = false; k.climb = 0;
      events.push({ type: 'land', kart: k.index, air: k.airTime });
      if (k.trick) giveBoost(k, 'trick', events);
      k.trick = false;
    }
  }
}
