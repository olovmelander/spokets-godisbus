/** Varggropen's source route, tyre model and opponents, adapted for the toy console.
 * The original port is identified in ported/*.js; this module owns only race rules and arcade rewards.
 */
import { createRoute, type Route } from './ported/route.js';
import { clamp, LAPS, newDriver, stepField, markFinish, raceStandings, type Driver } from './ported/physics.js';
import { buildRacingLine, createBrain, rivalInput, catchupFactor, RIVAL_PROFILES, type Brain } from './ported/ai.js';
import { surfaceAt } from './ported/surfaces.js';

export type RacerId = 'player' | 'fox' | 'owl' | 'hare';
export type DriftTier = 'none' | 'blue' | 'gold';
export type BoostKind = DriftTier | 'sweet';
export interface KartInput {
  /** Source convention: +1 left, −1 right. */
  steer: number;
  throttle: number;
  brake: number;
  drift: boolean;
  /** A press; holding it cannot consume a subsequently collected sweet. */
  item: boolean;
}
export interface KartDriver extends Driver {
  id: RacerId;
  color: number;
  lap: number;
  completedLaps: number;
  lapTimes: number[];
  drifting: boolean;
  driftCharge: number;
  driftTier: DriftTier;
  boostTime: number;
  boostKind: BoostKind;
}
export interface KartPickup { id: string; distance: number; lane: number; active: boolean; respawn: number }
export interface KartResult { place: number; elapsed: number; lapTimes: number[]; bestLap: number; order: RacerId[] }
export interface KartEvents { pickup: number; boost: number; lap: number; collision: number }
export interface KartState {
  phase: 'countdown' | 'racing' | 'finished';
  countdown: number;
  elapsed: number;
  player: KartDriver;
  drivers: KartDriver[];
  pickups: KartPickup[];
  item: 'gold-sweet' | null;
  position: number;
  laps: number;
  result: KartResult | null;
  /** Monotonic counters let presentation observe a cue exactly once without owning simulation. */
  events: KartEvents;
}
export interface KartRace {
  readonly state: KartState;
  readonly track: Route;
  tick(input: Readonly<KartInput>, dt: number): KartState;
  restart(): void;
}

export const RACE_STEP = 1 / 120;
export const COUNTDOWN_SECONDS = 3;
export const DRIFT_BLUE = .65;
export const DRIFT_GOLD = 1.4;
const BOOST_SECONDS = { blue: .8, gold: 1.45, sweet: 1.8 } as const;
const IDS: RacerId[] = ['player', 'fox', 'owl', 'hare'];
const COLORS = [0xf2be45, 0xd97842, 0x7598bc, 0xa69ac9];
const GRID = [{ distance: -12.4, lane: -1.5 }, { distance: -2.2, lane: 1.5 }, { distance: -5.6, lane: -1.5 }, { distance: -9, lane: 1.5 }];
const PICKUPS = [{ distance: 82, lane: 0 }, { distance: 324, lane: -1 }, { distance: 570, lane: 1 }];
const finite = (value: number, lo: number, hi: number): number => Number.isFinite(value) ? clamp(value, lo, hi) : 0;

export function createRace({ easy = false, seed = 2012 }: {easy?: boolean; seed?: number} = {}): KartRace {
  const track = createRoute();
  track.surfaceAt = surfaceAt;
  const line = buildRacingLine(track);
  const drivers = IDS.map((id, i): KartDriver => ({
    ...newDriver(GRID[i].distance, GRID[i].lane, { assist: i === 0 && easy ? 1.45 : 1.2 }),
    id, color: COLORS[i], lap: 1, completedLaps: 0, lapTimes: [],
    drifting: false, driftCharge: 0, driftTier: 'none', boostTime: 0, boostKind: 'none',
  }));
  const player = drivers[0];
  const state: KartState = {
    phase: 'countdown', countdown: COUNTDOWN_SECONDS, elapsed: 0, player, drivers,
    pickups: PICKUPS.map((p, i) => ({ ...p, id: `sweet-${i}`, active: true, respawn: 0 })),
    item: null, position: 4, laps: LAPS, result: null, events: { pickup: 0, boost: 0, lap: 0, collision: 0 },
  };
  let brains: Brain[] = [];
  const lapStarts = [0, 0, 0, 0];
  let accumulator = 0, itemHeld = false, itemPressed = false, driftHeld = false;

  function restart(): void {
    drivers.forEach((driver, i) => {
      for (const key of ['_mu', '_roll', '_rollSpeed', '_bump', '_alphaF', '_alphaR', '_locked']) Reflect.deleteProperty(driver, key);
      Object.assign(driver, newDriver(GRID[i].distance, GRID[i].lane, { assist: i === 0 && easy ? 1.45 : 1.2 }), {
        lap: 1, completedLaps: 0, held: true, drifting: false, driftCharge: 0, driftTier: 'none', boostTime: 0, boostKind: 'none',
      });
      driver.lapTimes.length = 0;
      lapStarts[i] = 0;
    });
    brains = RIVAL_PROFILES.map((profile, i) => createBrain(profile, { line, difficulty: easy ? 'easy' : 'normal', seed: (seed >>> 0) + i * 71 }));
    state.phase = 'countdown'; state.countdown = COUNTDOWN_SECONDS; state.elapsed = 0;
    state.item = null; state.position = 4; state.result = null;
    for (const pickup of state.pickups) { pickup.active = true; pickup.respawn = 0; }
    for (const key of ['pickup', 'boost', 'lap', 'collision'] as const) state.events[key] = 0;
    accumulator = 0; itemHeld = itemPressed = driftHeld = false;
  }

  function boost(kind: Exclude<BoostKind, 'none'>): void {
    // A second reward refreshes, never stacks an unbounded acceleration or duration.
    player.boostTime = Math.max(player.boostTime, BOOST_SECONDS[kind]);
    if (kind === 'sweet' || player.boostKind !== 'sweet') player.boostKind = kind;
    state.events.boost++;
  }

  function step(input: Readonly<KartInput>): void {
    if (state.phase === 'countdown') {
      state.countdown = Math.max(0, state.countdown - RACE_STEP);
      itemPressed = false; driftHeld = input.drift;
      if (state.countdown < 1e-9) {
        state.countdown = 0; state.phase = 'racing'; player.held = false;
      }
      return;
    }
    if (state.phase === 'finished') return;
    state.elapsed += RACE_STEP;
    const steer = finite(input.steer, -1, 1), throttle = finite(input.throttle, 0, 1), brake = finite(input.brake, 0, 1);
    player.boostTime = Math.max(0, player.boostTime - RACE_STEP);
    if (!player.boostTime) player.boostKind = 'none';
    const clean = player.speed > 5 && player.u > 3 && player.surface !== 'grass' && !player.atWall && player.hit <= 0 && Math.abs(player.heading) < .9;
    if (!input.drift && driftHeld && clean && player.driftTier !== 'none') boost(player.driftTier);
    if (!input.drift || !clean) player.driftCharge = 0;
    player.drifting = input.drift && clean && Math.abs(steer) > .12;
    if (player.drifting && Math.abs(player.steerAngle) > .025 && Math.abs(player.yawRate) > .06) {
      player.driftCharge = Math.min(DRIFT_GOLD, player.driftCharge + RACE_STEP);
    } else if (input.drift) player.driftCharge = Math.max(0, player.driftCharge - RACE_STEP * 2);
    player.driftTier = player.driftCharge >= DRIFT_GOLD - 1e-9 ? 'gold' : player.driftCharge >= DRIFT_BLUE - 1e-9 ? 'blue' : 'none';
    driftHeld = input.drift;
    if (itemPressed && state.item && player.u >= 0 && brake === 0) { state.item = null; boost('sweet'); }
    itemPressed = false;
    const controls = [{ steer, throttle, brake, arcade: true, recover: true, drift: player.drifting, boost: player.boostTime > 0 ? player.boostKind === 'blue' ? .7 : 1 : 0 },
      ...drivers.slice(1).map((driver, i) => {
        const brain = brains[i];
        brain.catchup = catchupFactor(driver.distance, player.distance, brain.level.catchup);
        driver.held = state.elapsed < brain.reaction;
        return { ...rivalInput(driver, brain, { line, track, drivers, dt: RACE_STEP, cooldown: driver.finishTime !== null }), arcade: true, recover: true };
      })];
    const before = drivers.map(d => d.distance);
    state.events.collision += stepField(drivers, controls, track, RACE_STEP).filter(event => event.type === 'barrier' ? event.driver === player : event.a === player || event.b === player).length;
    if (player.atWall || player.hit > 0 || player.surface === 'grass') {
      player.drifting = false; player.driftCharge = 0; player.driftTier = 'none';
      player.boostTime = 0; player.boostKind = 'none';
    }
    drivers.forEach((driver, i) => {
      const finishLine = (driver.completedLaps + 1) * track.length;
      if (driver.completedLaps < LAPS && before[i] < finishLine && driver.distance >= finishLine && driver.distance > before[i]) {
        const fraction = clamp((finishLine - before[i]) / (driver.distance - before[i]), 0, 1);
        const crossed = state.elapsed - RACE_STEP + fraction * RACE_STEP;
        driver.lapTimes.push(crossed - lapStarts[i]); lapStarts[i] = crossed;
        driver.completedLaps++; driver.lap = Math.min(LAPS, driver.completedLaps + 1);
        if (i === 0) state.events.lap++;
      }
      markFinish(driver, before[i], track.length * LAPS, state.elapsed, RACE_STEP);
    });
    for (const pickup of state.pickups) {
      pickup.respawn = Math.max(0, pickup.respawn - RACE_STEP);
      pickup.active = pickup.respawn === 0;
      if (state.item || !pickup.active || player.distance <= before[0] || Math.abs(player.lane - pickup.lane) > 1.15) continue;
      const lap = Math.floor((player.distance - pickup.distance) / track.length);
      const crossing = pickup.distance + lap * track.length;
      if (before[0] < crossing && player.distance >= crossing) {
        pickup.active = false; pickup.respawn = 8; state.item = 'gold-sweet'; state.events.pickup++;
      }
    }
    const standings = raceStandings(drivers);
    state.position = standings.indexOf(player) + 1;
    if (player.finishTime !== null) {
      state.phase = 'finished';
      state.result = { place: state.position, elapsed: player.finishTime, lapTimes: [...player.lapTimes], bestLap: Math.min(...player.lapTimes), order: standings.map(d => d.id) };
      player.drifting = false; player.driftCharge = 0; player.driftTier = 'none';
      player.boostTime = 0; player.boostKind = 'none';
    }
  }

  restart();
  return { state, track, restart, tick(input, dt) {
    if (!Number.isFinite(dt) || dt <= 0 || state.phase === 'finished') return state;
    if (input.item && !itemHeld) itemPressed = true;
    itemHeld = input.item;
    // Pause/hidden-page time is never replayed as a burst of driving on return.
    accumulator += Math.min(dt, .05);
    while (accumulator + 1e-10 >= RACE_STEP) { step(input); accumulator = Math.max(0, accumulator - RACE_STEP); }
    return state;
  } };
}
