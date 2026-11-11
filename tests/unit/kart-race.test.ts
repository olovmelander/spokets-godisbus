import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createRace, COUNTDOWN_SECONDS, DRIFT_BLUE, DRIFT_GOLD, RACE_STEP, type KartInput, type KartRace } from '../../src/kart/race';
import { createRoute, TRACK_PLAN } from '../../src/kart/ported/route.js';
import { buildRacingLine, catchupFactor, createBrain, rivalInput, RIVAL_PROFILES, type RivalProfile } from '../../src/kart/ported/ai.js';
import { newDriver, stepDriver, stepField, WALL_LANE, type Driver } from '../../src/kart/ported/physics.js';

const idle: KartInput = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };
function run(race: KartRace, seconds: number, input: Partial<KartInput> = {}, rate = 120): void {
  for (let i = 0; i < Math.round(seconds * rate); i++) race.tick({ ...idle, ...input }, 1 / rate);
}
function started(): KartRace { const race = createRace({ seed: 7 }); run(race, COUNTDOWN_SECONDS); return race; }
function pose(race: KartRace, distance: number, speed = 11, lane = 0): void {
  Object.assign(race.state.player, { distance, lane, u: speed, speed, w: 0, heading: 0, yawRate: 0, steerAngle: 0, hit: 0, atWall: false });
}
const finite = (driver: Driver) => ['distance', 'lane', 'heading', 'yawRate', 'u', 'w', 'speed', 'steerAngle'].every(key => Number.isFinite(driver[key as keyof Driver]));

describe('the actual Varggropen port', () => {
  it('retains all 77 source coordinates, the 665 m length, seam and three-hairpin proportions', () => {
    // Digest of TRACK_PLAN in Pekkas Pokal 7762360, not a new oval that happens to have the same length.
    expect(TRACK_PLAN).toHaveLength(77);
    expect(createHash('sha256').update(JSON.stringify(TRACK_PLAN)).digest('hex')).toBe('3cdf8efddc9f24e64d4842ec2b7f91fb8d0804a59c200ff306b2289258c0a209');
    const route = createRoute();
    expect(route.length).toBeCloseTo(665, 6);
    expect(route.sample(0).position.distanceTo(route.sample(665).position)).toBeLessThan(.001);
    expect(route.sample(0).position.distanceTo(route.planToWorld(440, 294))).toBeLessThan(.001);
    const ratio = (route.bounds.max.x - route.bounds.min.x) / (route.bounds.max.z - route.bounds.min.z);
    expect(ratio).toBeGreaterThan(1.4); expect(ratio).toBeLessThan(1.6);
    expect(route.curvature(212)).toBeLessThan(-.1);
  });

  it('retains measured source tyre trajectories when arcade inputs are absent', () => {
    // Recorded directly from the unmodified source physics.js at 7762360, starting at 10 m/s for 2 s.
    const cases = [
      { curve: 0, input: { steer: 0, throttle: 1, brake: 0 }, result: [25.27009362767623, 0, 0, 0, 14.652439900267968, 0] },
      { curve: .02, input: { steer: .2, throttle: .7, brake: 0 }, result: [23.52749027434101, 1.841572562462256, .11492024019600879, .2827686542274797, 13.001278550875577, .04092560919542159] },
      { curve: -.04, input: { steer: -.3, throttle: 0, brake: .1 }, result: [16.756545173342467, -3.07549450115369, -.46140510049565103, -.6088033897584414, 6.768359771330588, -.2925572311803297] },
    ];
    for (const fixture of cases) {
      const driver = newDriver(); driver.u = driver.speed = 10;
      for (let i = 0; i < 240; i++) stepDriver(driver, fixture.input, fixture.curve, RACE_STEP);
      [driver.distance, driver.lane, driver.heading, driver.yawRate, driver.u, driver.w].forEach((value, i) => expect(value).toBeCloseTo(fixture.result[i], 9));
    }
  });

  it('keeps barrier recovery, reverse and physical kart contact', () => {
    const driver = newDriver(0, WALL_LANE); driver.heading = Math.PI / 2;
    for (let i = 0; i < 720; i++) stepDriver(driver, { throttle: 1, recover: true }, 0, RACE_STEP);
    expect(finite(driver)).toBe(true);
    expect(Math.abs(driver.heading)).toBeLessThan(.8);
    expect(driver.distance).toBeGreaterThan(1);
    const reverse = newDriver();
    for (let i = 0; i < 240; i++) stepDriver(reverse, { brake: 1 }, 0, RACE_STEP);
    expect(reverse.distance).toBeLessThan(-.3); expect(reverse.u).toBeGreaterThanOrEqual(-2.61);
    const back = newDriver(0), front = newDriver(3); back.u = back.speed = 15;
    let contacts = 0;
    for (let i = 0; i < 60; i++) contacts += stepField([back, front], [{ throttle: 1 }, {}], 0, RACE_STEP).filter(e => e.type === 'contact').length;
    expect(contacts).toBeGreaterThan(0); expect(front.distance).toBeGreaterThan(back.distance);
  });
});

describe('toy-console race rules', () => {
  it('holds every kart through the full countdown, with no penalty or head start for holding gas', () => {
    const race = createRace(); const positions = race.state.drivers.map(d => d.distance);
    run(race, COUNTDOWN_SECONDS - RACE_STEP, { throttle: 1, steer: 1, item: true, drift: true });
    expect(race.state.phase).toBe('countdown'); expect(race.state.elapsed).toBe(0);
    expect(race.state.drivers.map(d => d.distance)).toEqual(positions);
    race.tick(idle, RACE_STEP); expect(race.state.phase).toBe('racing');
    run(race, .5, { throttle: 1 });
    expect(race.state.player.distance).toBeGreaterThan(positions[0]);
    expect(race.state.player.launchPenalty).toBe(0);
    expect(race.state.drivers.every(d => !d.held)).toBe(true);
  });

  it('has the same fixed-step outcomes across 30, 60 and 144 Hz presentation', () => {
    const snapshots = [30, 60, 144].map(rate => {
      const race = createRace({ seed: 3 }); run(race, 8, { throttle: 1, steer: .08 }, rate);
      return { elapsed: race.state.elapsed, drivers: race.state.drivers.map(d => [d.distance, d.lane, d.heading, d.u, d.w]) };
    });
    expect(snapshots[1]).toEqual(snapshots[0]); expect(snapshots[2]).toEqual(snapshots[0]);
  });

  it('is exactly frozen at dt=0 and never catches up a hidden minute on resume', () => {
    const race = started(); run(race, 1, { throttle: 1 });
    const before = JSON.stringify(race.state);
    for (let i = 0; i < 120; i++) race.tick({ ...idle, throttle: 1, item: true, drift: true }, 0);
    expect(JSON.stringify(race.state)).toBe(before);
    const elapsed = race.state.elapsed; race.tick(idle, 60);
    expect(race.state.elapsed - elapsed).toBeCloseTo(.05, 9);
    race.tick(idle, Number.NaN); expect(race.state.drivers.every(finite)).toBe(true);
  });

  it.each([['blue', DRIFT_BLUE], ['gold', DRIFT_GOLD]] as const)('earns a %s boost by actually cornering, and spends it once on release', (tier, needed) => {
    // Enter the source bend wide at a sensible corner speed, then hold gas and steer throughout.
    const race = started(); pose(race, 80, 7, -1);
    let frames = 0;
    while (race.state.player.driftCharge < needed - 1e-9 && frames++ < 300) race.tick({ ...idle, throttle: 1, steer: -.5, drift: true }, RACE_STEP);
    expect(race.state.player.driftTier).toBe(tier);
    expect(Math.abs(race.state.player.yawRate)).toBeGreaterThan(.06);
    expect(race.state.events.boost).toBe(0);
    race.tick({ ...idle, throttle: 1, steer: -.5 }, RACE_STEP);
    expect(race.state.player.boostKind).toBe(tier); expect(race.state.player.boostTime).toBeGreaterThan(.7);
    expect(race.state.events.boost).toBe(1);
    run(race, 2, { throttle: 1 });
    expect(race.state.events.boost).toBe(1); expect(race.state.player.boostKind).toBe('none');
  });

  it('does not farm a drift while stopped, steering straight, on grass or against a barrier', () => {
    for (const kind of ['stopped', 'straight', 'grass', 'wall']) {
      const race = started(); pose(race, 30, kind === 'stopped' ? 0 : 11, kind === 'grass' ? 4.1 : kind === 'wall' ? WALL_LANE : 0);
      run(race, .5, { throttle: 0, steer: kind === 'straight' ? 0 : .5, drift: true });
      race.tick(idle, RACE_STEP);
      expect(race.state.events.boost, kind).toBe(0);
    }
  });

  it('the boost accelerates through tyres, remains bounded and still yields to the brake', () => {
    const normal = newDriver(), boosted = newDriver(), braking = newDriver();
    for (const driver of [normal, boosted, braking]) driver.u = driver.speed = 14;
    for (let i = 0; i < 120; i++) {
      stepDriver(normal, { throttle: 1 }, 0, RACE_STEP);
      stepDriver(boosted, { throttle: 1, boost: 1 }, 0, RACE_STEP);
      stepDriver(braking, { throttle: 1, brake: 1, boost: 1 }, 0, RACE_STEP);
    }
    expect(boosted.speed).toBeGreaterThan(normal.speed + 1);
    expect(boosted.speed).toBeLessThan(24); expect(braking.speed).toBeLessThan(10);
  });

  it('arcade launch is more responsive than the rental original, while drifting produces real tyre slip', () => {
    const original = newDriver(), arcade = newDriver();
    for (let i = 0; i < 120; i++) {
      stepDriver(original, { throttle: 1 }, 0, RACE_STEP);
      stepDriver(arcade, { throttle: 1, arcade: true }, 0, RACE_STEP);
    }
    expect(arcade.speed).toBeGreaterThan(original.speed * 1.3);
    const route = createRoute(), turning = newDriver(80); turning.u = turning.speed = 11;
    let slip = 0;
    for (let i = 0; i < 180; i++) {
      stepDriver(turning, { steer: -.5, throttle: 1, drift: true }, route, RACE_STEP);
      slip = Math.max(slip, turning.slip);
    }
    expect(slip).toBeGreaterThan(.2); expect(Math.abs(turning.heading)).toBeLessThan(.5);
    expect(Math.abs(turning.lane)).toBeLessThan(3.4);
  });

  it('cancels a charged drift and an active boost on a wall strike', () => {
    const race = started(); pose(race, 80, 11, WALL_LANE);
    Object.assign(race.state.player, { heading: .6, driftCharge: DRIFT_GOLD, driftTier: 'gold', boostTime: 1, boostKind: 'sweet' });
    run(race, .1, { throttle: 1, drift: true, steer: .7 });
    expect(race.state.player.driftCharge).toBe(0); expect(race.state.player.boostTime).toBe(0);
  });

  it('collects one sweet at its real crossing, retains a single slot and consumes only a new press', () => {
    const race = started(), pickup = race.state.pickups[0];
    pose(race, pickup.distance - .04, 10, pickup.lane);
    race.tick(idle, RACE_STEP);
    expect(race.state.item).toBe('gold-sweet'); expect(race.state.events.pickup).toBe(1);
    expect(pickup.active).toBe(false); expect(pickup.respawn).toBeGreaterThan(7);
    race.tick({ ...idle, item: true, throttle: 1 }, RACE_STEP);
    expect(race.state.item).toBe(null); expect(race.state.player.boostKind).toBe('sweet');
    expect(race.state.events.boost).toBe(1);
    const second = race.state.pickups[1]; pose(race, second.distance - .04, 10, second.lane);
    race.tick({ ...idle, item: true }, RACE_STEP); expect(race.state.item).toBe('gold-sweet');
    run(race, .3, { item: true }); expect(race.state.events.boost).toBe(1);
    race.tick(idle, RACE_STEP); race.tick({ ...idle, item: true }, RACE_STEP);
    expect(race.state.events.boost).toBe(2); expect(race.state.item).toBe(null);
  });

  it('counts each forward lap only once, never the initial start line or a reverse recrossing', () => {
    const race = started(), player = race.state.player;
    pose(race, -.04, 10); race.tick(idle, RACE_STEP);
    expect(player.completedLaps).toBe(0);
    pose(race, race.track.length - .04, 10); race.tick(idle, RACE_STEP);
    expect(player.completedLaps).toBe(1); expect(player.lapTimes).toHaveLength(1);
    pose(race, race.track.length + .04, -10); race.tick(idle, RACE_STEP);
    pose(race, race.track.length - .04, 10); race.tick(idle, RACE_STEP);
    expect(player.completedLaps).toBe(1); expect(stateCopy(race).events.lap).toBe(1);
  });

  it('restarts the same objects with clean timers, controls, results and pickup state', () => {
    const race = started(), state = race.state, player = state.player;
    run(race, 2, { throttle: 1, steer: -.2, drift: true, item: true });
    race.restart(); expect(race.state).toBe(state); expect(race.state.player).toBe(player);
    const fresh = createRace({ seed: 7 }); expect(race.state).toEqual(fresh.state);
    run(race, 4, { throttle: 1 }); run(fresh, 4, { throttle: 1 }); expect(race.state).toEqual(fresh.state);
  });

  it('keeps catch-up modest and never changes an opponent distance directly', () => {
    for (const strength of [1, 1.4]) for (const gap of [-100000, -200, 0, 200, 100000]) {
      const factor = catchupFactor(gap, 0, strength); expect(factor).toBeGreaterThanOrEqual(.937); expect(factor).toBeLessThanOrEqual(1.028);
    }
  });

  it('easy opponents drive the same physical course at a gentler pace', () => {
    // Compare clear laps, so a different overtaking interaction cannot masquerade as a pace change.
    const { track } = createRace(), line = buildRacingLine(track);
    const laps = (['normal', 'easy'] as const).map(difficulty => {
      const driver = newDriver(-2.2, 1.5), brain = createBrain(RIVAL_PROFILES[0], { line, difficulty, seed: 5 });
      brain.mistakeClock = Infinity;
      let steps = 0;
      while (driver.distance < track.length && steps++ < 90 / RACE_STEP) {
        stepDriver(driver, { ...rivalInput(driver, brain, { line, track, drivers: [driver], dt: RACE_STEP }), arcade: true, recover: true }, track, RACE_STEP);
      }
      expect(driver.distance).toBeGreaterThanOrEqual(track.length); expect(finite(driver)).toBe(true);
      return steps * RACE_STEP;
    });
    expect(laps[1]).toBeGreaterThan(laps[0] + 1);
    expect(laps[1] - laps[0]).toBeLessThan(10);
  });

  it.each([false, true])('completes all three laps with digital steering, traffic and valid results (easy=%s)', (easy) => {
    const race = createRace({ easy, seed: 7 }); run(race, COUNTDOWN_SECONDS);
    const line = buildRacingLine(race.track);
    const profile: RivalProfile = { name: 'test', full: 'test', color: 0, pace: 1, aggression: .3, consistency: .99, reaction: 0 };
    const coach = createBrain(profile, { line, difficulty: 'hard', seed: 99 }); coach.mistakeClock = Infinity;
    let carry = 0, steer = 0, throttle = 0, brake = 0;
    for (let i = 0; i < 240 * 60 && race.state.phase !== 'finished'; i++) {
      if (i % 6 === 0) {
        const input = rivalInput(race.state.player, coach, { line, track: race.track, drivers: race.state.drivers, dt: .1 });
        carry += input.steer ?? 0;
        steer = carry > .5 ? 1 : carry < -.5 ? -1 : 0; carry -= steer;
        brake = Number(input.brake) > .15 ? 1 : 0; throttle = !brake && Number(input.throttle) > .5 ? 1 : 0;
      }
      race.tick({ ...idle, steer, throttle, brake, item: race.state.item !== null }, 1 / 60);
    }
    expect(race.state.phase).toBe('finished');
    expect(race.state.player.completedLaps).toBe(3); expect(race.state.result?.lapTimes).toHaveLength(3);
    expect(race.state.result!.lapTimes.every(time => time > 25 && time < 100)).toBe(true);
    expect(race.state.result!.elapsed).toBeCloseTo(race.state.result!.lapTimes.reduce((a, b) => a + b, 0), 8);
    expect(race.state.drivers.every(finite)).toBe(true);
    expect(race.state.position).toBeGreaterThanOrEqual(1); expect(race.state.position).toBeLessThanOrEqual(4);
    const result = JSON.stringify(race.state); run(race, 1, { throttle: 1, item: true }); expect(JSON.stringify(race.state)).toBe(result);
  });
});

function stateCopy(race: KartRace) { return structuredClone(race.state); }
