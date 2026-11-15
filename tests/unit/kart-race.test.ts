import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CLASS_SPEED, createRace, COUNTDOWN_SECONDS, LEVELS, RACE_STEP, racingLine, ROULETTE_SECONDS, rollItem, type KartControls, type KartEvent, type KartRace, type RaceOptions } from '../../src/kart/sim/race';
import { BOOSTS, DRIFT_TIERS, giveBoost, hitKart, MAX_CANDIES, newKart, stepKart, TOP_SPEED, turnRate, type Kart } from '../../src/kart/sim/kart';
import { buildRacingLine, createBrain, elastic, rivalControls, RIVALS, seededRandom, type RivalProfile } from '../../src/kart/sim/ai';
import { getTrack, LAP, LAPS, PLACES, TRACK_IDS, trackGap, type Surface, type Track } from '../../src/kart/sim/track';
import { createCup, CUP_POINTS, cupTable, cupTrack, nextRace, scoreRace } from '../../src/kart/sim/cup';
import { TRACK_PLAN } from '../../src/kart/sim/trace';

const idle: KartControls = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };
const gas: KartControls = { ...idle, throttle: 1 };
function run(race: KartRace, seconds: number, input: Partial<KartControls> = {}, rate = 120): void {
  for (let i = 0; i < Math.round(seconds * rate); i++) race.tick({ ...idle, ...input }, 1 / rate);
}
function started(options: RaceOptions = { seed: 7 }): KartRace { const race = createRace(options); run(race, COUNTDOWN_SECONDS); race.takeEvents(); return race; }
/** Puts the player on the road at speed, and the rivals out of the way unless they are wanted. */
function pose(race: KartRace, distance: number, speed = TOP_SPEED, lane = 0, alone = true): Kart {
  if (alone) race.state.karts.slice(1).forEach((kart, i) => Object.assign(kart, { distance: distance + 300 + i * 12, lane: 0, speed: 0, held: true }));
  return Object.assign(race.state.player, { distance, lane, speed, heading: 0, slide: 0, steer: 0, y: 0, airborne: false });
}
const finite = (kart: Kart) => ['distance', 'lane', 'heading', 'speed', 'slide', 'steer', 'y'].every(key => Number.isFinite(kart[key as keyof Kart]));
const count = (events: readonly KartEvent[], type: KartEvent['type'], kart = 0) => events.filter(e => e.type === type && (!('kart' in e) || e.kart === kart)).length;

/** A straight strip of road for handling on its own: bends, edges and ramps are added where a test wants them. */
function strip(extra: Partial<Track> & { rough?: (lane: number) => Surface } = {}): Track {
  const road: Track = { ...getTrack(), curvature: () => 0, height: () => 0, roadLeft: () => 6, roadRight: () => 6, wallLeft: () => 9, wallRight: () => 9, zone: () => 0,
    surface: (d, lane) => extra.rough ? extra.rough(lane) : lane > road.roadLeft(d) || -lane > road.roadRight(d) ? 'rough' : 'road', bump: () => 0, onRamp: () => false, pad: () => false, ...extra };
  return road;
}
/** The same, with no edge anywhere near: room to turn circles. */
const open = () => strip({ wallLeft: () => 5000, wallRight: () => 5000, roadLeft: () => 5000, roadRight: () => 5000 });
function drive(kart: Kart, track: Track, seconds: number, controls: Partial<KartControls> | ((kart: Kart, t: number) => Partial<KartControls>) = {}, events: KartEvent[] = []): KartEvent[] {
  for (let i = 0; i < Math.round(seconds / RACE_STEP); i++) stepKart(kart, { ...gas, ...(typeof controls === 'function' ? controls(kart, i * RACE_STEP) : controls) }, track, RACE_STEP, events);
  return events;
}
const fresh = (speed = TOP_SPEED): Kart => Object.assign(newKart(0, 'player', 0, 0, 0), { held: false, speed });
/** Degrees the lap turns in all: 360 to the left, −360 to the right. */
const turning = (track: Track) => { let total = 0; for (let d = 0; d < LAP; d += .5) total += track.curvature(d) * .5; return total * 180 / Math.PI; };

describe.each(TRACK_IDS)('the course %s', id => {
  const track = getTrack(id);
  it('closes one 960 m lap, with positive lanes on the driver\'s left', () => {
    expect(track.id).toBe(id); expect(track.length).toBe(960);
    const start = track.point(0), end = track.point(LAP - .001);
    expect(Math.hypot(start.x - end.x, start.z - end.z)).toBeLessThan(.01);
    expect(Math.abs(Math.abs(turning(track)) - 360)).toBeLessThan(3);
    const centre = track.point(505, 0), left = track.point(505, 3), ahead = track.point(506, 0);
    const cross = (ahead.x - centre.x) * (left.z - centre.z) - (ahead.z - centre.z) * (left.x - centre.x);
    expect(cross).toBeLessThan(0);                        // +lane is to the left of the direction of travel (y up)
    expect(Math.hypot(left.x - centre.x, left.z - centre.z)).toBeCloseTo(3, 5);
    for (let d = 0; d < LAP; d += 2) expect(Math.abs(track.height(d + 1) - track.height(d))).toBeLessThan(.2);   // no slope steeper than one in five
  });
  it('keeps every barrier on its own side of a bend\'s centre, and clear of every other part of the course', () => {
    const centres = Array.from({ length: LAP / 4 }, (_, i) => track.point(i * 4));
    for (let i = 0; i < centres.length; i++) {
      const d = i * 4, k = track.curvature(d);
      expect(track.roadLeft(d)).toBeGreaterThan(3.6); expect(track.roadRight(d)).toBeGreaterThan(3.6);
      expect(track.wallLeft(d)).toBeGreaterThan(track.roadLeft(d)); expect(track.wallRight(d)).toBeGreaterThan(track.roadRight(d));
      if (k > .02) expect(track.wallLeft(d) * k).toBeLessThan(.66);
      if (k < -.02) expect(track.wallRight(d) * -k).toBeLessThan(.66);
      for (let j = i + 1; j < centres.length; j++) {
        if (Math.abs(trackGap(d, j * 4)) < 70) continue;
        const apart = Math.hypot(centres[i]!.x - centres[j]!.x, centres[i]!.z - centres[j]!.z);
        const reach = Math.max(track.wallLeft(d), track.wallRight(d)) + Math.max(track.wallLeft(j * 4), track.wallRight(j * 4));
        expect(apart, `${d} against ${j * 4}`).toBeGreaterThan(reach + .5);
      }
    }
  });
  it('passes through its places in order, each with its own road and rough, and its caves on the mountain', () => {
    expect(track.zones.length).toBeGreaterThan(0);
    for (const [i, zone] of track.zones.entries()) {
      expect(zone.to).toBe(track.zones[(i + 1) % track.zones.length]!.from);
      const length = ((zone.to - zone.from) % LAP + LAP) % LAP || LAP, middle = zone.from + length / 2, place = PLACES[zone.kind]!;
      expect(length).toBeGreaterThan(100);
      expect(track.zone(middle)).toBe(zone.kind);
      expect(track.mix(middle)[zone.kind]).toBe(1);
      expect(track.surface(middle, track.roadLeft(middle) + .3)).toBe(place.rough);
      expect(track.surface(middle, -track.roadRight(middle) - .3)).toBe(place.rough);
      // Across a border the two places share the road, and the shares always add up to one.
      const border = track.mix(zone.to), next = track.zones[(i + 1) % track.zones.length]!;
      if (next.kind !== zone.kind) { expect(border[zone.kind]).toBeCloseTo(.5, 1); expect(border[next.kind]).toBeCloseTo(.5, 1); }
      for (let d = zone.from; d < zone.from + length; d += 7) expect(track.mix(d).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
    for (const cave of track.caves) {
      expect(track.zone(cave.from)).toBe(3); expect(track.zone(cave.to)).toBe(3);
      expect(track.inCave((cave.from + cave.to) / 2)).toBe(true); expect(track.inCave(cave.from - 5)).toBe(false); expect(track.inCave(cave.from - 5, 6)).toBe(true);
    }
  });
  it('puts every strip, ramp, puddle, bag and sweet on the road, and every ramp on a straight run clear of the rest', () => {
    const onRoad = (d: number, lane: number, room = 0) => expect(lane + room < track.roadLeft(d) && -lane + room < track.roadRight(d), `${d} ${lane}`).toBe(true);
    expect(track.pads.length).toBeGreaterThanOrEqual(5);
    for (const pad of track.pads) { onRoad(pad.from, pad.lane, pad.half); onRoad(pad.to, pad.lane, pad.half); expect(track.pad((pad.from + pad.to) / 2, pad.lane)).toBe(true); expect(track.pad(pad.from - 1, pad.lane)).toBe(false); }
    expect(track.ramps.length).toBeGreaterThanOrEqual(1);
    for (const ramp of track.ramps) {
      onRoad(ramp.from, ramp.lane, ramp.half); onRoad(ramp.to, ramp.lane, ramp.half);
      for (let d = ramp.from - 14; d < ramp.to + 30; d += 4) expect(Math.abs(track.curvature(d)), `${d}`).toBeLessThan(.03);
      expect(track.bump(ramp.from, ramp.lane)).toBe(0); expect(track.bump(ramp.to, ramp.lane)).toBeCloseTo(ramp.height, 5);
      expect(track.bump(ramp.to + .1, ramp.lane)).toBe(0); expect(track.bump(ramp.to - 1, ramp.lane + ramp.half + .2)).toBe(0);
      // Nothing stands on a ramp or where a kart comes down from it, and no cave roof hangs over the jump.
      for (const pad of track.pads) expect(pad.to < ramp.from - 4 || pad.from > ramp.to + 26, `strip at ${pad.from}`).toBe(true);
      for (const box of track.boxes) expect(box.at < ramp.from - 4 || box.at > ramp.to + 26, `bags at ${box.at}`).toBe(true);
      for (const puddle of track.mud) expect(puddle.at < ramp.from - 6 || puddle.at > ramp.to + 26, `puddle at ${puddle.at}`).toBe(true);
      expect(track.inCave(ramp.to + 12, 4)).toBe(false);
    }
    for (const puddle of track.mud) { onRoad(puddle.at, puddle.lane, puddle.wide); expect(track.surface(puddle.at, puddle.lane)).toBe('mud'); expect(track.zone(puddle.at)).toBe(2); }
    expect(track.boxes).toHaveLength(30);
    for (const box of track.boxes) { onRoad(box.at, box.lane, .9); expect(track.pad(box.at, box.lane)).toBe(false); }
    expect(track.candies.length).toBeGreaterThan(50);
    for (const candy of track.candies) { onRoad(candy.at, candy.lane, .5); expect(candy.lift).toBeGreaterThanOrEqual(0); expect(candy.lift > 1 ? track.ramps.some(ramp => candy.at > ramp.to && candy.at < ramp.to + 40) : true, `sweet in the air at ${candy.at}`).toBe(true); }
    expect(track.grid).toHaveLength(8);
    for (const slot of track.grid) { onRoad(slot.distance, slot.lane, 1); expect(slot.distance).toBeLessThan(0); }
    for (let d = -30; d < 12; d += 3) expect(Math.abs(track.curvature(d)), `grid at ${d}`).toBeLessThan(.03);
    for (const mark of track.landmarks) expect(Number.isFinite(mark.at)).toBe(true);
  });
  it('finds a world point\'s place on the course again', () => {
    for (const [d, lane] of [[12, 2], [310, -3], [505, 4], [700, -1.5], [955, 0]] as const) {
      const p = track.point(d, lane), found = track.nearest(p.x, p.z);
      expect(Math.abs(trackGap(found.distance, d))).toBeLessThan(.6); expect(found.lane).toBeCloseTo(lane, 0);
    }
  });
  it('has a racing line on the road that a rival laps cleanly at full speed', () => {
    const line = racingLine(id);
    for (let d = 0; d < LAP; d += 3) {
      const lane = line.laneAt(d);
      expect(lane).toBeLessThan(track.roadLeft(d) - 1); expect(-lane).toBeLessThan(track.roadRight(d) - 1);
      expect(line.speedAt(d)).toBeGreaterThan(15);
    }
    const kart = Object.assign(newKart(1, 'fox', 0, -3, 2.4), { held: false }), brain = createBrain({ id: 'fox', color: 0, pace: 1, skill: 1, bold: .5 }, 5), events: KartEvent[] = [];
    let steps = 0, rough = 0, walls = 0;
    while (kart.distance < LAP * 2 && steps++ < 120 / RACE_STEP) {
      stepKart(kart, rivalControls(kart, brain, { track, line, karts: [kart], gums: [], boxes: [], dt: RACE_STEP }), track, RACE_STEP, events);
      if (kart.distance > LAP && kart.surface !== 'road' && kart.surface !== 'planks' && kart.surface !== 'mud') rough++;
    }
    for (const event of events) if (event.type === 'wall') walls++;
    const lap = steps * RACE_STEP / 2;
    expect(kart.distance).toBeGreaterThanOrEqual(LAP * 2); expect(finite(kart)).toBe(true);
    expect(lap).toBeGreaterThan(22); expect(lap).toBeLessThan(36);
    expect(rough * RACE_STEP).toBeLessThan(1.5); expect(walls).toBeLessThanOrEqual(2);
    expect(events.some(event => event.type === 'jump')).toBe(true);
  });
});

describe('the four courses', () => {
  it('are four different laps: three to the right and one to the left, each with its own shape and places', () => {
    expect(TRACK_IDS).toEqual(['garden', 'bog', 'mountain', 'varggropen']);
    const tracks = TRACK_IDS.map(id => getTrack(id));
    expect(tracks.map(track => Math.sign(turning(track)))).toEqual([-1, -1, 1, -1]);
    const tightest = (track: Track) => { let k = 0; for (let d = 0; d < LAP; d += 1) k = Math.max(k, Math.abs(track.curvature(d))); return 1 / k; };
    // A hairpin: one bend that turns the kart at least 160 degrees.
    const hairpins = (track: Track) => {
      let n = 0, turn = 0, sign = 0;
      for (let d = 400; d < LAP + 400; d += .5) {
        const k = track.curvature(d), s = Math.abs(k) > .012 ? Math.sign(k) : 0;
        if (s !== sign) { if (Math.abs(turn) > 160) n++; turn = 0; sign = s; }
        turn += k * .5 * 180 / Math.PI;
      }
      return n;
    };
    expect(tightest(tracks[0]!)).toBeGreaterThan(20);                 // Gårdsvarvet has no hairpin at all
    expect(tracks.map(hairpins)).toEqual([0, 3, 2, 3]);
    const climb = (track: Track) => { let lo = Infinity, hi = -Infinity; for (let d = 0; d < LAP; d += 2) { lo = Math.min(lo, track.height(d)); hi = Math.max(hi, track.height(d)); } return hi - lo; };
    expect(climb(tracks[1]!)).toBeLessThan(4.5);                      // Myrspången lies low over the water
    expect(climb(tracks[2]!)).toBeGreaterThan(16);                    // Kristallberget climbs a mountain
    expect(tracks.map(track => [...new Set(track.zones.map(zone => PLACES[zone.kind]!.id))].sort())).toEqual([['forest', 'garden'], ['bog', 'forest'], ['forest', 'mountain'], ['bog', 'candy', 'forest', 'garden', 'mountain']]);
    expect(tracks.map(track => track.caves.length)).toEqual([0, 0, 1, 1]);
    expect(tracks.map(track => track.mud.length > 0)).toEqual([false, true, false, true]);
    expect(new Set(tracks.map(track => `${Math.round(track.bounds.maxX - track.bounds.minX)}x${Math.round(track.bounds.maxZ - track.bounds.minZ)}`)).size).toBe(4);
    expect(getTrack('bog')).toBe(tracks[1]); expect(getTrack()).toBe(tracks[3]);
  });
  it('keep Varggropen\'s 77 source coordinates and its three hairpins', () => {
    // Digest of the trace in Pekkas Pokal 7762360: the outline is that circuit's, not a new one.
    expect(TRACK_PLAN).toHaveLength(77);
    expect(createHash('sha256').update(JSON.stringify(TRACK_PLAN)).digest('hex')).toBe('3cdf8efddc9f24e64d4842ec2b7f91fb8d0804a59c200ff306b2289258c0a209');
    const track = getTrack('varggropen'), start = track.point(0);
    expect(start.x / start.z).toBeCloseTo((440 - 470) / (294 - 364), 3);
    const ratio = (track.bounds.maxX - track.bounds.minX) / (track.bounds.maxZ - track.bounds.minZ);
    expect(ratio).toBeGreaterThan(1.4); expect(ratio).toBeLessThan(1.6);
    expect(track.curvature(310)).toBeLessThan(-.08);      // right-hand hairpin into the bog
    expect(track.curvature(505)).toBeGreaterThan(.06);    // left-hand hairpin up the mountain
    expect(track.curvature(604)).toBeLessThan(-.06);      // right-hand hairpin through the cave
    expect(track.zones.map(zone => PLACES[zone.kind]!.id)).toEqual(['forest', 'bog', 'mountain', 'candy', 'garden']);
    expect(track.surface(400, 0)).toBe('planks');
  });
});

describe('the cup', () => {
  it('runs the four courses in order and gives ten points down to one', () => {
    const cup = createCup(), ids = ['player', ...RIVALS.map(rival => rival.id)] as const;
    expect(CUP_POINTS).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
    const driven: string[] = [];
    for (let round = 0; round < 4; round++) {
      driven.push(cupTrack(cup));
      // The player wins the first and comes last in the rest; the fox is second every time.
      const order = round === 0 ? ids.map(id => ({ id })) : [...ids.slice(1), ids[0]].map(id => ({ id }));
      scoreRace(cup, order);
      expect(cup.over).toBe(round === 3); expect(nextRace(cup)).toBe(round < 3);
    }
    expect(driven).toEqual(TRACK_IDS); expect(cup.index).toBe(3);
    expect(cup.points.player).toBe(10 + 1 + 1 + 1); expect(cup.points.fox).toBe(8 + 10 + 10 + 10);
    const table = cupTable(cup);
    expect(table).toHaveLength(8); expect(table[0]).toEqual({ id: 'fox', points: 38 });
    expect(table.map(entry => entry.points)).toEqual([...table.map(entry => entry.points)].sort((a, b) => b - a));
    expect(table.reduce((sum, entry) => sum + entry.points, 0)).toBe(4 * 39);
    scoreRace(cup, ids.map(id => ({ id }))); expect(cup.points.player).toBe(13);     // a finished cup takes no more races
  });
  it('puts the better place in the last race ahead when two are level on points', () => {
    const cup = createCup();
    scoreRace(cup, [{ id: 'player' }, { id: 'fox' }]); nextRace(cup); scoreRace(cup, [{ id: 'fox' }, { id: 'player' }]);
    expect(cup.points.player).toBe(18); expect(cup.points.fox).toBe(18);
    expect(cupTable(cup).map(entry => entry.id)).toEqual(['fox', 'player']);
  });
});

describe('arcade handling', () => {
  it('pulls away briskly, settles at top speed, coasts down and backs up when asked', () => {
    const kart = fresh(0), road = strip();
    drive(kart, road, 1.2); expect(kart.speed).toBeGreaterThan(.55 * TOP_SPEED);
    drive(kart, road, 3.5); expect(kart.speed).toBeGreaterThan(.97 * TOP_SPEED); expect(kart.speed).toBeLessThanOrEqual(TOP_SPEED);
    drive(kart, road, 1, { throttle: 0 }); expect(kart.speed).toBeLessThan(.85 * TOP_SPEED); expect(kart.speed).toBeGreaterThan(.6 * TOP_SPEED);
    drive(kart, road, 1.2, { throttle: 0, brake: 1 }); expect(kart.speed).toBeLessThan(0);
    drive(kart, road, 3, { throttle: 0, brake: 1 }); expect(kart.speed).toBeGreaterThan(-8);
    drive(kart, road, 1); expect(kart.speed).toBeGreaterThan(5); expect(finite(kart)).toBe(true);
  });
  // Olov, 15 November 2026: "man sladdar lite för mycket när man använder sladdknappen". A held drift with the wheel
  // straight turned more than the wheel alone at full lock, and twice as much with the wheel turned in.
  it('turns a wide arc on the wheel at full speed, a tighter one when slower, and tighter in a drift, but not wildly', () => {
    expect(TOP_SPEED / turnRate(TOP_SPEED)).toBeGreaterThan(20); expect(TOP_SPEED / turnRate(TOP_SPEED)).toBeLessThan(25);
    expect(15 / turnRate(15)).toBeLessThan(8); expect(turnRate(0)).toBe(0);
    expect(turnRate(TOP_SPEED, true)).toBeGreaterThan(turnRate(TOP_SPEED) * 1.3);
    const plain = fresh(), drifting = fresh(), road = open();
    drive(plain, road, 1, { steer: 1 }); drive(drifting, road, 1, { steer: 1, drift: true });
    expect(plain.heading).toBeGreaterThan(1); expect(plain.heading).toBeLessThan(1.45);
    expect(drifting.drift).toBe(1); expect(drifting.heading).toBeGreaterThan(plain.heading * 1.3);
    expect(drifting.heading).toBeLessThan(plain.heading * 1.5);
    expect(Math.abs(drifting.slip)).toBeGreaterThan(.4); expect(Math.abs(drifting.slip)).toBeLessThan(.5); expect(Math.abs(plain.slip)).toBeLessThan(.15);
    // Into a drift, then held a second with the wheel straight: less of a turn than the wheel alone at full lock.
    const straight = fresh();
    drive(straight, road, .15, { steer: 1, drift: true });
    const before = straight.heading;
    drive(straight, road, 1, { steer: 0, drift: true });
    expect(straight.drift).toBe(1); expect(straight.heading - before).toBeLessThan(plain.heading * .9);
  });
  it('hops on a press, locks a drift to the side it was begun on, and charges blue, gold and pink sparks', () => {
    const kart = fresh(), road = open(), events: KartEvent[] = [];
    drive(kart, road, .3, { drift: true }, events);
    expect(count(events, 'hop')).toBe(1); expect(kart.drift).toBe(0); expect(count(events, 'driftStart')).toBe(0);   // no bend, no drift
    drive(kart, road, .2, { drift: true, steer: -1 }, events); expect(kart.drift).toBe(-1);
    drive(kart, road, .4, { drift: true, steer: 1 }, events); expect(kart.drift).toBe(-1);   // steering out widens it, never swaps it
    const tiers: number[] = [];
    for (let t = 0; t < 4 && kart.driftTier < 3; t += RACE_STEP) { const before = kart.driftTier; drive(kart, road, RACE_STEP, { drift: true, steer: -1 }, events); if (kart.driftTier > before) tiers.push(kart.driftCharge); }
    expect(tiers).toHaveLength(3); tiers.forEach((charge, i) => expect(charge).toBeCloseTo(DRIFT_TIERS[i]!, 1));
    expect(events.filter(e => e.type === 'tier').map(e => e.type === 'tier' && e.tier)).toEqual([1, 2, 3]);
    expect(count(events, 'boost')).toBe(0);
    drive(kart, road, RACE_STEP, { steer: -1 }, events);
    expect(kart.drift).toBe(0); expect(kart.boostKind).toBe('turbo3'); expect(kart.boostTime).toBeCloseTo(BOOSTS.turbo3.time, 1);
    drive(kart, road, .5, {}, events); expect(kart.speed).toBeGreaterThan(TOP_SPEED * 1.25);
    drive(kart, road, 3, {}, events); expect(kart.boostKind).toBe(null); expect(kart.speed).toBeLessThanOrEqual(TOP_SPEED + .5);
    expect(events.filter(e => e.type === 'boost')).toHaveLength(1);
  });
  it.each([[.35, 0], [.8, 1], [1.5, 2], [2.4, 3]] as const)('a drift held hard for %s s is worth tier %s on release', (seconds, tier) => {
    const kart = fresh(), road = open();
    const events = drive(kart, road, seconds, { drift: true, steer: 1 });
    expect(kart.driftTier).toBe(tier);
    drive(kart, road, RACE_STEP, { steer: 1 }, events);
    expect(events.filter(e => e.type === 'boost').map(e => e.type === 'boost' && e.kind)).toEqual(tier ? [`turbo${tier}`] : []);
  });
  it('does not drift when slow, braking or in the air, and loses the drift to the brake', () => {
    const road = open(), slow = fresh(8), braking = fresh(), flying = Object.assign(fresh(), { airborne: true, y: 2, vy: 3 });
    drive(slow, road, .2, { drift: true, steer: 1, throttle: 0 }); expect(slow.drift).toBe(0);
    drive(braking, road, .2, { drift: true, steer: 1, brake: 1 }); expect(braking.drift).toBe(0);
    drive(flying, road, .1, { drift: true, steer: 1 }); expect(flying.drift).toBe(0);
    const kart = fresh(); drive(kart, road, .6, { drift: true, steer: 1 }); expect(kart.drift).toBe(1); expect(kart.driftCharge).toBeGreaterThan(.3);
    const events = drive(kart, road, .1, { drift: true, steer: 1, brake: 1, throttle: 0 }); expect(kart.drift).toBe(0); expect(count(events, 'boost')).toBe(0);
  });
  it('is slowed by grass, mud, snow and water, unless a boost or the rainbow lollipop carries it over', () => {
    const speeds = (['road', 'planks', 'mud', 'rough', 'snow', 'water'] as const).map(surface => { const kart = fresh(); drive(kart, strip({ rough: () => surface }), 3); return kart.speed / TOP_SPEED; });
    expect(speeds[0]).toBeGreaterThan(.98); expect(speeds[1]).toBeGreaterThan(.98);
    expect(speeds[2]).toBeCloseTo(.7, 1); expect(speeds[3]).toBeCloseTo(.6, 1); expect(speeds[4]).toBeCloseTo(.6, 1); expect(speeds[5]).toBeCloseTo(.5, 1);
    const boosted = fresh(), star = Object.assign(fresh(), { star: 5 }), grass = strip({ rough: () => 'rough' }), events: KartEvent[] = [];
    giveBoost(boosted, 'sweet', events); drive(boosted, grass, .8); expect(boosted.speed).toBeGreaterThan(TOP_SPEED * 1.25);
    drive(star, grass, 2); expect(star.speed).toBeGreaterThan(TOP_SPEED * 1.1);
  });
  it('refreshes a boost rather than piling boosts up', () => {
    const kart = fresh(), events: KartEvent[] = [];
    giveBoost(kart, 'sweet', events); giveBoost(kart, 'turbo1', events); giveBoost(kart, 'pad', events);
    expect(kart.boostPower).toBe(BOOSTS.sweet.power); expect(kart.boostTime).toBe(BOOSTS.sweet.time); expect(events).toHaveLength(3);
    drive(kart, strip(), 1.2); expect(kart.speed).toBeLessThan(TOP_SPEED * 1.4);
  });
  it('fires a boost strip once as the kart crosses it', () => {
    const kart = fresh(), events = drive(kart, strip({ pad: (d: number) => d > 5 && d < 11 }), 1.5);
    expect(events.filter(e => e.type === 'boost')).toEqual([{ type: 'boost', kart: 0, kind: 'pad' }]);
    expect(kart.speed).toBeGreaterThan(TOP_SPEED * 1.2);
  });
  it('grazes a barrier cheaply, pays for a square hit, and always stays inside', () => {
    const road = strip({ roadLeft: () => 8.9 }), graze = Object.assign(fresh(), { lane: 7.6, heading: .08 }), square = Object.assign(fresh(), { lane: 6, heading: 1.1 });
    const soft = drive(graze, road, .6), hard = drive(square, road, .6);
    expect(graze.speed).toBeGreaterThan(.85 * TOP_SPEED); expect(count(soft, 'wall')).toBe(0);
    expect(count(hard, 'wall')).toBe(1); expect(hard.find(e => e.type === 'wall')).toMatchObject({ force: 1 });
    for (const kart of [graze, square]) { expect(Math.abs(kart.lane)).toBeLessThanOrEqual(9 - .95 + 1e-9); expect(Math.abs(kart.heading)).toBeLessThan(.5); }
    const drifting = Object.assign(fresh(), { lane: 6, heading: 1.1, drift: 1, driftCharge: 2, driftTier: 2 });
    drive(drifting, road, .4, { drift: true, steer: 1 }); expect(drifting.driftCharge).toBeLessThan(.5);
  });
  it('flies off a ramp, lands again, and is boosted only for a trick', () => {
    const ramp = { from: 10, to: 17, height: 1.5 };
    const road = strip({ bump: (d: number, lane: number) => d >= ramp.from && d <= ramp.to && Math.abs(lane) < 3 ? ramp.height * (d - ramp.from) / 7 : 0, onRamp: (d: number, lane: number) => d >= ramp.from && d <= ramp.to && Math.abs(lane) < 3 });
    const plain = fresh(), events = drive(plain, road, 2);
    const land = events.find(e => e.type === 'land');
    expect(count(events, 'jump')).toBe(1); expect(land && land.type === 'land' && land.air).toBeGreaterThan(.45); expect(land && land.type === 'land' && land.air).toBeLessThan(1.1);
    expect(count(events, 'boost')).toBe(0); expect(plain.y).toBe(0); expect(plain.airborne).toBe(false);
    const tricky = fresh(), trick = drive(tricky, road, 2, kart => ({ drift: kart.distance > 14 && kart.distance < 17 }));
    expect(count(trick, 'trick')).toBe(1); expect(trick.filter(e => e.type === 'boost')).toEqual([{ type: 'boost', kart: 0, kind: 'trick' }]);
    expect(trick.findIndex(e => e.type === 'boost')).toBeGreaterThan(trick.findIndex(e => e.type === 'land'));
    const late = fresh(), tooLate = drive(late, road, 2, kart => ({ drift: kart.airborne && kart.airTime > .35 })); expect(count(tooLate, 'trick')).toBe(0);
    const crawling = Object.assign(fresh(6), { distance: 9 }), none = drive(crawling, road, 3, { throttle: .05 }); expect(crawling.distance).toBeGreaterThan(18); expect(count(none, 'jump')).toBe(0);
    const beside = Object.assign(fresh(), { lane: 5 }); expect(count(drive(beside, road, 2), 'jump')).toBe(0);
  });
  it('a longer way down makes a longer jump', () => {
    const bump = (d: number) => d >= 10 && d <= 17 ? 1.5 * (d - 10) / 7 : 0;
    const air = (slope: number) => { const land = drive(fresh(), strip({ bump, height: (d: number) => d > 17 ? (d - 17) * slope : 0 }), 3).find(e => e.type === 'land'); return land && land.type === 'land' ? land.air : 0; };
    expect(air(-.2)).toBeGreaterThan(air(0) * 1.2); expect(air(.06)).toBeLessThan(air(0));
  });
  it('tumbles when hit, drops three sweets, and is then left alone for a moment', () => {
    const kart = Object.assign(fresh(), { candies: 5, drift: 1, driftCharge: 2, driftTier: 2, boostTime: 1, boostPower: .3 }), events: KartEvent[] = [];
    expect(hitKart(kart, 'cone', 3, events)).toBe(true);
    expect(kart).toMatchObject({ candies: 2, drift: 0, driftCharge: 0, boostTime: 0 }); expect(kart.spin).toBeGreaterThan(1);
    expect(events).toEqual([{ type: 'hit', kart: 0, kind: 'cone', by: 3 }, { type: 'candyLost', kart: 0, count: 3 }]);
    expect(hitKart(kart, 'bee', 3, events)).toBe(false);                       // not while it is already tumbling
    drive(kart, strip(), .6, { steer: 1 }, events); expect(kart.speed).toBeLessThan(.4 * TOP_SPEED); expect(Math.abs(kart.heading)).toBeLessThan(.01);
    drive(kart, strip(), 1, {}, events); expect(kart.spin).toBe(0); expect(count(events, 'recover')).toBe(1); expect(kart.guard).toBeGreaterThan(0);
    expect(hitKart(kart, 'gum', 3, events)).toBe(false);
    drive(kart, strip(), 1.6, {}, events); expect(hitKart(kart, 'gum', 3, events)).toBe(true);
  });
  it('lets the candy floss take one hit and the rainbow lollipop take them all', () => {
    const shielded = Object.assign(fresh(), { shield: 5, candies: 4 }), starred = Object.assign(fresh(), { star: 3, candies: 4 }), events: KartEvent[] = [];
    expect(hitKart(shielded, 'cone', 1, events)).toBe(false); expect(shielded).toMatchObject({ shield: 0, spin: 0, candies: 4 });
    expect(events).toEqual([{ type: 'shieldPop', kart: 0 }]);
    expect(hitKart(starred, 'bee', 1, events)).toBe(false); expect(starred.spin).toBe(0);
  });
  it('turns a kart round again when it faces the wrong way', () => {
    const kart = Object.assign(fresh(12), { heading: 2.9 });
    drive(kart, strip(), 4); expect(Math.abs(kart.heading)).toBeLessThan(.6); expect(kart.distance).toBeGreaterThan(5);
  });
  it('Lugnt steers a kart away from the edge it is drifting towards', () => {
    const helped = Object.assign(fresh(), { assist: true, heading: .12 }), alone = Object.assign(fresh(), { heading: .12 }), road = strip();
    drive(helped, road, 2.5); drive(alone, road, 2.5);
    expect(helped.surface).toBe('road'); expect(Math.abs(helped.lane)).toBeLessThan(6); expect(alone.lane).toBeGreaterThan(6);
  });
});

describe('items', () => {
  it('gives the leader things to defend with and the last kart things to catch up with', () => {
    const tally = (behind: number, gentle = false) => { const random = seededRandom(5), seen: Record<string, number> = {}; for (let i = 0; i < 4000; i++) { const item = rollItem(behind, random, gentle); seen[item] = (seen[item] ?? 0) + 1; } return seen; };
    const first = tally(0), last = tally(1), middle = tally(.5);
    for (const item of ['rainbow', 'cloud', 'sweets3', 'cones3', 'rocket']) expect(first[item]).toBeUndefined();
    expect(first.gum!).toBeGreaterThan(last.gum! * 4); expect(first.floss!).toBeGreaterThan(last.floss! * 2);
    expect(last.rainbow!).toBeGreaterThan(middle.rainbow! * 2); expect(last.sweets3!).toBeGreaterThan(middle.sweets3!);
    expect(Object.keys(middle)).toHaveLength(14);
    expect(last.rocket!).toBeGreaterThan(middle.rocket! * 3); expect(first.horn!).toBeGreaterThan(last.horn! * 2); expect(first.magnet!).toBeGreaterThan(last.magnet! * 3);
    const thrown = (seen: Record<string, number>) => seen.cone! + seen.cones3! + seen.bee! + seen.cracker! + seen.cloud!;
    const calm = tally(.5, true); expect(thrown(calm)).toBeLessThan(thrown(middle) * .6);
    expect(tally(.5)).toEqual(middle);
  });
  it('takes a bag where the kart really crosses it, spins the roulette, and uses the item on a new press only', () => {
    const race = started(), box = race.state.boxes[2]!, player = pose(race, box.at - 1, 20, box.lane);
    run(race, .2, gas);
    const events = race.takeEvents();
    expect(events.filter(e => e.type === 'box')).toEqual([{ type: 'box', kart: 0, box: 2 }]);
    expect(box.active).toBe(false); expect(player.item).toBe(null); expect(player.roulette).toBeGreaterThan(1.2);
    run(race, ROULETTE_SECONDS, { ...gas, item: true });            // held since before the roulette: it is not a press
    expect(player.item).not.toBe(null); expect(count(race.takeEvents(), 'item')).toBe(1);
    const item = player.item;
    run(race, .5, { ...gas, item: true }); expect(player.item).toBe(item);
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    expect(count(race.takeEvents(), 'use')).toBe(1);
    run(race, 4, gas); expect(box.active).toBe(true);
  });
  it('stops the roulette early on a press, and passes a bag by while one item is held', () => {
    const race = started(), [first, second] = [race.state.boxes[2]!, race.state.boxes[7]!], player = pose(race, first.at - 1, 20, first.lane);
    run(race, .6, gas); expect(player.roulette).toBeGreaterThan(.9);
    race.tick({ ...gas, item: true }, RACE_STEP); expect(player.roulette).toBe(0); expect(player.item).not.toBe(null);
    const item = player.item; pose(race, second.at - 1, 20, second.lane); run(race, .2, gas);
    expect(second.active).toBe(false); expect(player.item).toBe(item); expect(player.roulette).toBe(0);
  });
  it('gives three boosts for three golden sweets', () => {
    const race = started(), player = Object.assign(pose(race, 250), { item: 'sweets3' as const, itemCount: 3 });
    for (let use = 0; use < 3; use++) { race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP); expect(player.itemCount).toBe(use < 2 ? 2 - use : 0); }
    expect(player.item).toBe(null); expect(race.takeEvents().filter(e => e.type === 'boost' && e.kind === 'sweet')).toHaveLength(3);
  });
  it('throws a pine cone straight ahead: it bounces off the barriers and tumbles the kart it reaches', () => {
    const race = started(), player = Object.assign(pose(race, 250, 20), { item: 'cone' as const, itemCount: 1 }), fox = race.state.karts[1]!;
    Object.assign(fox, { distance: 275, lane: 0, speed: 0, held: true, candies: 4 });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    expect(race.state.shots).toHaveLength(1); expect(player.spin).toBe(0);
    run(race, 1, gas);
    const events = race.takeEvents();
    expect(events.find(e => e.type === 'hit')).toEqual({ type: 'hit', kart: 1, kind: 'cone', by: 0 });
    expect(fox.spin).toBeGreaterThan(0); expect(fox.candies).toBe(1); expect(race.state.shots).toHaveLength(0);
    // Thrown across the road it comes back off the barrier.
    Object.assign(pose(race, 250, 20), { heading: .45, item: 'cone' as const, itemCount: 1 });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    const cone = race.state.shots[0]!, lanes: number[] = [];
    for (let i = 0; i < 90 && race.state.shots.includes(cone); i++) { race.tick(idle, RACE_STEP); lanes.push(cone.lane); }
    expect(Math.max(...lanes)).toBeGreaterThan(5); expect(lanes.at(-1)!).toBeLessThan(Math.max(...lanes) - 2); expect(cone.bounces).toBeLessThan(5);
  });
  it('sends a bumblebee round the bend after the kart ahead, and nobody else', () => {
    const race = started(), player = Object.assign(pose(race, 280, 15), { item: 'bee' as const, itemCount: 1, place: 3 }), [fox, hare] = [race.state.karts[1]!, race.state.karts[2]!];
    Object.assign(hare, { distance: 300, lane: 2, speed: 14, held: false, place: 2 }); Object.assign(fox, { distance: 345, lane: -2, speed: 14, held: false, place: 1 });
    race.state.karts.forEach(kart => { if (kart.index > 2) kart.place = kart.index + 1; });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    expect(race.state.shots[0]).toMatchObject({ kind: 'bee', target: 2 });
    run(race, 2.5, gas);
    const hits = race.takeEvents().filter(e => e.type === 'hit');
    expect(hits).toEqual([{ type: 'hit', kart: 2, kind: 'bee', by: 0 }]); expect(fox.spin).toBe(0); expect(player.spin).toBe(0);
  });
  it('lays gum behind the kart for whoever comes next, and lets a jumping kart pass over it', () => {
    const race = started(), player = Object.assign(pose(race, 260, 20), { item: 'gum' as const, itemCount: 1 }), fox = race.state.karts[1]!;
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    const gum = race.state.shots[0]!; expect(gum.kind).toBe('gum'); expect(gum.distance).toBeLessThan(player.distance - 2);
    run(race, .5, gas); expect(player.spin).toBe(0);
    Object.assign(fox, { distance: gum.distance - 6, lane: gum.lane, speed: 20, held: false, airborne: true, y: 2, vy: 4 });
    run(race, .3, gas); expect(fox.spin).toBe(0); expect(race.state.shots).toContain(gum);
    Object.assign(fox, { distance: gum.distance - 6, lane: gum.lane, speed: 20, airborne: false, y: 0 });
    run(race, .5, gas); expect(fox.spin).toBeGreaterThan(0); expect(fox.spinKind).toBe('gum'); expect(race.state.shots).toHaveLength(0);
  });
  it('rains on everyone ahead and nobody behind; candy floss and the rainbow keep a kart dry', () => {
    const race = started(), karts = race.state.karts, player = Object.assign(pose(race, 250, 20, 0, false), { item: 'cloud' as const, itemCount: 1 });
    karts.forEach((kart, i) => { if (i) Object.assign(kart, { distance: 250 + (i < 5 ? 30 * i : -30 * i), lane: 0, held: true }); });
    run(race, RACE_STEP * 2, gas);                                   // one step, so the places are known
    Object.assign(karts[1]!, { shield: 5 }); Object.assign(karts[2]!, { star: 5 });
    race.tick({ ...gas, item: true }, RACE_STEP);
    expect(karts.map(kart => kart.cloud > 0)).toEqual([false, false, false, true, true, false, false, false]);
    expect(karts[1]!.shield).toBe(0); expect(player.item).toBe(null);
    const wet = Object.assign(fresh(), { cloud: 3 }); drive(wet, strip(), 2); expect(wet.speed).toBeLessThan(.65 * TOP_SPEED);
  });
  it('makes the rainbow kart untouchable, quick, and a knock for anyone it bumps', () => {
    const race = started(), player = Object.assign(pose(race, 250, 25), { item: 'rainbow' as const, itemCount: 1 }), fox = race.state.karts[1]!;
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP); expect(player.star).toBeGreaterThan(6);
    Object.assign(fox, { distance: player.distance + 4, lane: player.lane, speed: 10, held: false });
    run(race, .6, gas);
    expect(race.takeEvents().find(e => e.type === 'hit')).toEqual({ type: 'hit', kart: 1, kind: 'star', by: 0 }); expect(player.spin).toBe(0);
    run(race, 8, gas); expect(player.star).toBe(0);
  });
  it('collects sweets up to ten, each a little more top speed, and they grow back', () => {
    const race = started(), candy = race.state.candies[0]!, player = pose(race, candy.at - 1, 20, candy.lane);
    run(race, .2, gas); expect(player.candies).toBe(1); expect(candy.active).toBe(false); expect(count(race.takeEvents(), 'candy')).toBe(1);
    run(race, 10.5, idle); expect(candy.active).toBe(true);
    Object.assign(pose(race, candy.at - 1, 20, candy.lane), { candies: MAX_CANDIES }); run(race, .2, gas); expect(player.candies).toBe(MAX_CANDIES);
    const rich = Object.assign(fresh(), { candies: MAX_CANDIES }), poor = fresh(); drive(rich, strip(), 3); drive(poor, strip(), 3);
    expect(rich.speed / poor.speed).toBeGreaterThan(1.05); expect(rich.speed / poor.speed).toBeLessThan(1.1);
    const high = race.state.candies.find(spot => spot.lift > 1.6)!; pose(race, high.at - 1, 20, high.lane); run(race, .2, gas); expect(high.active).toBe(true);   // out of reach from the ground
  });
  it('throws three pine cones, one for each press', () => {
    const race = started(), player = Object.assign(pose(race, 250, 20), { item: 'cones3' as const, itemCount: 3 });
    for (let thrown = 1; thrown <= 3; thrown++) {
      race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
      expect(race.state.shots.filter(shot => shot.kind === 'cone')).toHaveLength(thrown); expect(player.itemCount).toBe(thrown < 3 ? 3 - thrown : 0);
    }
    expect(player.item).toBe(null); expect(count(race.takeEvents(), 'use')).toBe(3);
  });
  it('lobs a cracker over the karts in its way, and tumbles everyone where it comes down', () => {
    const race = started({ track: 'garden', seed: 7 }), player = Object.assign(pose(race, 60, 20), { item: 'cracker' as const, itemCount: 1 }), [fox, hare, owl] = race.state.karts.slice(1);
    Object.assign(fox!, { distance: 72, lane: 0, held: true }); Object.assign(hare!, { distance: 101, lane: 1.5, held: true }); Object.assign(owl!, { distance: 112, lane: 0, held: true });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    const cracker = race.state.shots[0]!; expect(cracker.kind).toBe('cracker');
    run(race, .6, gas); expect(race.state.shots).toContain(cracker); expect(fox!.spin).toBe(0);            // still in the air, and past the fox
    run(race, .5, gas);
    const events = race.takeEvents();
    expect(events.filter(e => e.type === 'burst')).toHaveLength(1); expect(race.state.shots).toHaveLength(0);
    expect(events.filter(e => e.type === 'hit')).toEqual([{ type: 'hit', kart: 2, kind: 'cracker', by: 0 }]);
    expect(fox!.spin).toBe(0); expect(owl!.spin).toBe(0); expect(player.spin).toBe(0);
    const burst = events.find(e => e.type === 'burst'); expect(burst && burst.type === 'burst' && Math.abs(burst.distance - 101)).toBeLessThan(4);
  });
  it('blows a birch-bark horn that tumbles everyone close by and clears what has been thrown near the kart', () => {
    const race = started(), karts = race.state.karts, player = Object.assign(pose(race, 250, 20), { item: 'horn' as const, itemCount: 1 });
    Object.assign(karts[1]!, { distance: 255, lane: 2, held: true }); Object.assign(karts[2]!, { distance: 244.5, lane: -2, held: true }); Object.assign(karts[3]!, { distance: 262, lane: 0, held: true });
    const shot = (kind: 'gum' | 'cone', distance: number) => ({ id: 90 + race.state.shots.length, kind, owner: 4, distance, lane: 0, angle: 0, speed: 0, life: 20, bounces: 3, target: -1, safe: 0 });
    race.state.shots.push(shot('gum', 257), shot('cone', 244), shot('gum', 275));
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    const events = race.takeEvents();
    expect(events.filter(e => e.type === 'hit').map(e => e.type === 'hit' && [e.kart, e.kind, e.by])).toEqual([[1, 'horn', 0], [2, 'horn', 0]]);
    expect(karts[3]!.spin).toBe(0); expect(player.spin).toBe(0); expect(count(events, 'horn')).toBe(1);
    expect(race.state.shots.map(left => left.distance)).toEqual([275]);
  });
  it('bounces high on a mushroom: over the gum on the road, and down with a trick\'s boost', () => {
    const race = started(), player = Object.assign(pose(race, 250, 24), { item: 'spring' as const, itemCount: 1 });
    race.state.shots.push({ id: 99, kind: 'gum', owner: 3, distance: 262, lane: 0, angle: 0, speed: 0, life: 20, bounces: 0, target: -1, safe: 0 });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP);
    expect(player.airborne).toBe(true); expect(player.item).toBe(null);
    let top = 0; for (let i = 0; i < 150 && player.airborne; i++) { race.tick(gas, RACE_STEP); top = Math.max(top, player.y); }
    const events = race.takeEvents();
    expect(top).toBeGreaterThan(1.8); expect(player.spin).toBe(0); expect(race.state.shots).toHaveLength(1); expect(player.distance).toBeGreaterThan(264);
    expect(count(events, 'jump')).toBe(1); expect(count(events, 'trick')).toBe(1); expect(events.filter(e => e.type === 'boost')).toEqual([{ type: 'boost', kart: 0, kind: 'trick' }]);
    // In the air there is nothing to bounce on: the mushroom is kept.
    Object.assign(pose(race, 250, 24), { item: 'spring' as const, itemCount: 1, airborne: true, y: 2, vy: 2 });
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP); expect(player.item).toBe('spring');
  });
  it('rides a fizzy rocket that drives itself round a hairpin, cannot be stopped, and knocks over what it meets', () => {
    const race = started(), player = Object.assign(pose(race, 272, 24), { item: 'rocket' as const, itemCount: 1 }), fox = race.state.karts[1]!;
    race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP); race.takeEvents();
    expect(player.rocket).toBeGreaterThan(3);
    let fastest = 0, offRoad = 0;
    for (let i = 0; i < 2.6 / RACE_STEP; i++) {
      race.tick({ ...idle, steer: 1, brake: 1, drift: true }, RACE_STEP);          // whatever the driver does
      fastest = Math.max(fastest, player.speed); if (player.surface !== 'road' && player.surface !== 'planks') offRoad++;
    }
    const events = race.takeEvents();
    expect(fastest).toBeGreaterThan(TOP_SPEED * 1.3); expect(player.distance).toBeGreaterThan(272 + 85);      // through the hairpin at 287–334
    expect(offRoad).toBe(0); expect(count(events, 'wall')).toBe(0); expect(player.drift).toBe(0);
    expect(hitKart(player, 'cone', 2, [])).toBe(false);
    Object.assign(fox, { distance: player.distance + 5, lane: player.lane, speed: 8, held: false });
    run(race, .4, gas); expect(race.takeEvents().find(e => e.type === 'hit')).toEqual({ type: 'hit', kart: 1, kind: 'rocket', by: 0 }); expect(player.spin).toBe(0);
    run(race, 1, gas); expect(player.rocket).toBe(0);
    run(race, 1.5, gas); expect(player.speed).toBeLessThan(TOP_SPEED * 1.12);
  });
  it('pulls sweets and bags in with a magnet, from the side and out of the air', () => {
    const race = started(), track = getTrack(), player = Object.assign(pose(race, 232, 20, 3.2), { item: 'magnet' as const, itemCount: 1 });
    const air = race.state.candies.filter(candy => candy.at > 234 && candy.at < 258);                      // the trail over the forest jump, at lane 0
    expect(air.length).toBeGreaterThanOrEqual(4); expect(air.some(candy => candy.lift > 1.6)).toBe(true);
    run(race, .5, { throttle: 0 }); expect(player.candies).toBe(0);                                         // beside them and under them: none taken
    pose(race, 232, 20, 3.2); race.tick(gas, RACE_STEP); race.tick({ ...gas, item: true }, RACE_STEP); expect(player.magnet).toBeGreaterThan(7);
    run(race, 1.2, { throttle: .4 }); expect(player.candies).toBeGreaterThanOrEqual(4); expect(air.every(candy => !candy.active)).toBe(true);
    Object.assign(player, { candies: MAX_CANDIES }); const next = race.state.candies.find(candy => candy.active && candy.at > 290)!;
    pose(race, next.at - 2, 20, next.lane + 3); run(race, .3, gas); expect(next.active).toBe(true);        // full: the sweets are left for others
    const box = race.state.boxes.find(spot => spot.at === 350 && spot.lane === 0)!, edge = Math.min(3.4, track.roadLeft(350) - 1);
    Object.assign(pose(race, 348, 20, edge), { magnet: 5, item: null, roulette: 0 }); run(race, .3, gas); expect(box.active).toBe(false); expect(player.roulette).toBeGreaterThan(0);
  });
  it('the rivals get, and use, every kind of thing over a few races', () => {
    const used = new Set<string>(), got = new Set<string>();
    for (const seed of [11, 12, 13]) {
      const race = started({ seed }); Object.assign(race.state.player, { distance: -400 });
      for (let i = 0; i < 100 / RACE_STEP; i++) {
        race.tick(idle, RACE_STEP);
        for (const event of race.takeEvents()) { if (event.type === 'use') used.add(event.item); if (event.type === 'item') got.add(event.item); }
      }
      expect(race.state.karts.every(finite)).toBe(true);
    }
    expect([...got].sort()).toEqual(['bee', 'cloud', 'cone', 'cones3', 'cracker', 'floss', 'gum', 'horn', 'magnet', 'rainbow', 'rocket', 'spring', 'sweet', 'sweets3']);
    expect([...used].sort()).toEqual([...got].sort());
  });
});

describe('race rules', () => {
  it('holds every kart through the countdown, and starts the player last in Äventyr and mid-field in Lugnt', () => {
    const race = createRace({ seed: 3 }), positions = race.state.karts.map(kart => kart.distance);
    expect(race.state.karts).toHaveLength(8); expect(Math.min(...positions)).toBe(race.state.player.distance); expect(race.state.position).toBe(8);
    expect(createRace({ difficulty: 'easy' }).state.position).toBe(4);
    run(race, COUNTDOWN_SECONDS - RACE_STEP, { throttle: 1, steer: 1, item: true });
    expect(race.state.phase).toBe('countdown'); expect(race.state.elapsed).toBe(0); expect(race.state.karts.map(kart => kart.distance)).toEqual(positions);
    race.tick(gas, RACE_STEP); expect(race.state.phase).toBe('racing'); expect(race.takeEvents()[0]).toEqual({ type: 'go' });
    run(race, .5, gas); expect(race.state.karts.every(kart => !kart.held && kart.distance > positions[kart.index]!)).toBe(true);
  });
  it.each([[.6, true], [.95, true], [1.6, false], [3, false]] as const)('the drift button pressed %s s before the start is a rocket start: %s', (before, rocket) => {
    const race = createRace({ seed: 3 });
    run(race, COUNTDOWN_SECONDS - before, gas); run(race, before, { ...gas, drift: true });
    expect(race.state.phase).toBe('racing'); expect(race.state.player.boostKind === 'start').toBe(rocket);
  });
  it('gives no rocket start to a button let go before the start', () => {
    const race = createRace({ seed: 3 });
    run(race, COUNTDOWN_SECONDS - .8, gas); run(race, .5, { ...gas, drift: true }); run(race, .3, gas);
    expect(race.state.player.boostKind).toBe(null);
  });
  it('has the same outcome at 30, 60 and 144 pictures a second', () => {
    const snapshots = [30, 60, 144].map(rate => {
      const race = createRace({ seed: 3 }); run(race, 9, { throttle: 1, steer: .12, drift: true }, rate);
      return { elapsed: race.state.elapsed, karts: race.state.karts.map(kart => [kart.distance, kart.lane, kart.heading, kart.speed, kart.item]) };
    });
    expect(snapshots[1]).toEqual(snapshots[0]); expect(snapshots[2]).toEqual(snapshots[0]);
  });
  it('is frozen at dt=0 and never catches up a hidden minute on return', () => {
    const race = started(); run(race, 1, gas);
    const before = JSON.stringify(race.state);
    for (let i = 0; i < 120; i++) race.tick({ ...gas, item: true, drift: true }, 0);
    expect(JSON.stringify(race.state)).toBe(before);
    const elapsed = race.state.elapsed; race.tick(idle, 60);
    expect(race.state.elapsed - elapsed).toBeCloseTo(.05, 9);
    race.tick(idle, Number.NaN); race.tick({ ...gas, steer: Number.NaN, throttle: Infinity }, RACE_STEP); expect(race.state.karts.every(finite)).toBe(true);
  });
  it('counts each forward lap once, never the start line at the off or a lap driven backwards', () => {
    const race = started(), player = race.state.player;
    pose(race, -.1, 20); run(race, .1, gas); expect(player.completedLaps).toBe(0);
    pose(race, LAP - .2, 20); run(race, .1, gas);
    expect(player.completedLaps).toBe(1); expect(player.lap).toBe(2); expect(player.lapTimes).toHaveLength(1);
    expect(race.takeEvents().filter(e => e.type === 'lap')).toEqual([{ type: 'lap', kart: 0, lap: 2 }]);
    pose(race, LAP + .2, -5); run(race, .2, { brake: 1 }); pose(race, LAP - .2, 20); run(race, .1, gas);
    expect(player.completedLaps).toBe(1); expect(count(race.takeEvents(), 'lap')).toBe(0);
  });
  it('hands each event over once, and never keeps more than a short queue', () => {
    const race = started(); run(race, 30, gas);
    expect(race.state.events.length).toBeGreaterThan(0); expect(race.state.events.length).toBeLessThanOrEqual(256);
    const taken = race.takeEvents(); expect(taken.length).toBeGreaterThan(0); expect(race.takeEvents()).toEqual([]);
  });
  it('restarts the same objects as a new race', () => {
    const race = started(), state = race.state, player = state.player;
    run(race, 6, { throttle: 1, steer: -.2, drift: true, item: true });
    race.restart(); expect(race.state).toBe(state); expect(race.state.player).toBe(player);
    const again = createRace({ seed: 7 }); expect(race.state).toEqual(again.state);
    run(race, 6, gas); run(again, 6, gas); expect(race.state).toEqual(again.state);
  });
  it('keeps the invisible elastic small', () => {
    for (const wait of [1, 1.8]) for (const gap of [-100000, -200, 0, 200, 100000]) {
      const factor = elastic(gap, 0, wait); expect(factor).toBeGreaterThanOrEqual(.83); expect(factor).toBeLessThanOrEqual(1.05);
    }
    expect(elastic(0, 0)).toBe(1); expect(elastic(200, 0)).toBeLessThan(1); expect(elastic(-200, 0)).toBeGreaterThan(1);
    expect(elastic(-200, 0, 1.8, 0)).toBe(1);                        // Lugnt: nobody behind the player is hurried on
  });
  it('bumps karts apart without stopping them, and tows a kart that sits behind another', () => {
    const race = started(), player = pose(race, 250, 28, 0), fox = race.state.karts[1]!;
    Object.assign(fox, { distance: 251.5, lane: .6, speed: 22, held: false });
    run(race, .2, gas);
    expect(Math.hypot(trackGap(player.distance, fox.distance), fox.lane - player.lane)).toBeGreaterThan(2);
    expect(count(race.takeEvents(), 'bump')).toBe(1); expect(player.speed).toBeGreaterThan(15); expect(fox.lane).toBeGreaterThan(player.lane);
    Object.assign(pose(race, 700, 28, 0), { boostTime: 0 }); Object.assign(fox, { distance: 709, lane: 0, speed: 29, held: false, pace: 1 });
    for (let i = 0; i < 300; i++) { fox.distance = player.distance + 9; fox.lane = player.lane; race.tick(gas, RACE_STEP); }
    expect(race.takeEvents().some(e => e.type === 'draft' && e.kart === 0)).toBe(true);
  });
  it('the rivals drive a whole race like players: on the road, drifting for turbos, taking and using items', () => {
    const race = started({ seed: 11 }), seen = new Map<string, number>();
    Object.assign(race.state.player, { distance: -400 });           // out of their way
    let steps = 0, offRoad = 0, samples = 0;
    while (race.state.karts.slice(1).some(kart => kart.finishTime === null) && steps++ < 200 / RACE_STEP) {
      race.tick(idle, RACE_STEP);
      for (const event of race.takeEvents()) if ('kart' in event && event.kart > 0) seen.set(event.type === 'boost' ? `boost:${event.kind}` : event.type, (seen.get(event.type === 'boost' ? `boost:${event.kind}` : event.type) ?? 0) + 1);
      if (steps % 30 === 0) for (const kart of race.state.karts.slice(1)) { samples++; if (kart.surface !== 'road' && kart.surface !== 'planks') offRoad++; expect(finite(kart)).toBe(true); }
    }
    const rivals = race.state.karts.slice(1);
    expect(rivals.every(kart => kart.finishTime !== null && kart.completedLaps === LAPS)).toBe(true);
    for (const kart of rivals) { expect(kart.finishTime!).toBeGreaterThan(75); expect(kart.finishTime!).toBeLessThan(130); kart.lapTimes.forEach(time => expect(time).toBeGreaterThan(24)); }
    expect(offRoad / samples).toBeLessThan(.06);
    for (const kind of ['driftStart', 'boost:turbo1', 'boost:turbo2', 'boost:pad', 'boost:trick', 'box', 'item', 'use', 'candy', 'jump', 'hit']) expect(seen.get(kind) ?? 0, kind).toBeGreaterThan(0);
    expect(seen.get('boost:turbo1')! + seen.get('boost:turbo2')!).toBeGreaterThan(40);
    expect(seen.get('hit')!).toBeLessThan(60);
  });
  it.each([false, true])('a tidy driver finishes three laps with a full result (Lugnt: %s)', (easy) => {
    const race = started({ difficulty: easy ? 'easy' : 'normal', seed: 7 }), track = getTrack();
    const profile: RivalProfile = { id: 'fox', color: 0, pace: 1, skill: 1, bold: .5 }, coach = createBrain(profile, 99);
    for (let i = 0; i < 200 / RACE_STEP && race.state.phase !== 'finished'; i++) {
      race.tick(rivalControls(race.state.player, coach, { track, line: race.line, karts: race.state.karts, gums: race.state.shots.filter(shot => shot.kind === 'gum'), boxes: race.state.boxes, dt: RACE_STEP }), RACE_STEP);
    }
    const result = race.state.result!;
    expect(race.state.phase).toBe('finished'); expect(race.state.player.completedLaps).toBe(3);
    expect(result.lapTimes).toHaveLength(3); result.lapTimes.forEach(time => { expect(time).toBeGreaterThan(24); expect(time).toBeLessThan(45); });
    expect(result.elapsed).toBeCloseTo(result.lapTimes.reduce((a, b) => a + b, 0), 8); expect(result.bestLap).toBe(Math.min(...result.lapTimes));
    expect(result.order).toHaveLength(8); expect(new Set(result.order.map(entry => entry.id)).size).toBe(8);
    expect(result.order[result.place - 1]).toEqual({ id: 'player', time: result.elapsed, finished: true });
    // Those still driving are given the time they were heading for, in the order they are in on the road.
    result.order.forEach((entry, i) => { expect(entry.finished).toBe(i < result.place); if (i) expect(entry.time).toBeGreaterThan(result.order[i - 1]!.time); expect(entry.time).toBeLessThan(result.elapsed + 90); });
    if (easy) expect(result.place).toBe(1); else expect(result.place).toBeLessThanOrEqual(5);
    const frozen = JSON.stringify(race.state); run(race, 1, { throttle: 1, item: true }); expect(JSON.stringify(race.state)).toBe(frozen);
  });
  it('gives seven rivals seven places on the grid ahead of the player, fastest first', () => {
    const race = createRace(), grid = getTrack().grid;
    expect(race.state.karts.map(kart => kart.id)).toEqual(['player', ...RIVALS.map(rival => rival.id)]);
    expect(race.state.karts.slice(1).map(kart => kart.distance)).toEqual(grid.slice(0, 7).map(slot => slot.distance));
    expect(race.state.player.distance).toBe(grid[7]!.distance);
    expect(RIVALS.map(rival => rival.pace)).toEqual([...RIVALS.map(rival => rival.pace)].sort((a, b) => b - a));
    expect(new Set(RIVALS.map(rival => rival.color)).size).toBe(7);
  });
  it('builds a racing line that uses the width of the road and takes the inside of each hairpin', () => {
    const line = buildRacingLine(getTrack());
    let widest = 0;
    for (let d = 0; d < LAP; d += 3) widest = Math.max(widest, Math.abs(line.laneAt(d)));
    expect(widest).toBeGreaterThan(2.5);
    expect(line.laneAt(310)).toBeLessThan(-1.5); expect(line.laneAt(505)).toBeGreaterThan(1.5);
    expect(racingLine('varggropen')).toBe(racingLine('varggropen'));
  });
  it('races on the course, in the speed class and at the difficulty it is asked for', () => {
    expect(createRace({ track: 'bog' }).track).toBe(getTrack('bog')); expect(createRace().track.id).toBe('varggropen');
    expect(CLASS_SPEED).toEqual({ 50: .78, 100: .9, 150: 1 });
    for (const cc of [50, 100, 150] as const) {
      const race = started({ track: 'garden', cc, seed: 4 });
      expect(race.state.karts.every(kart => kart.cc === CLASS_SPEED[cc])).toBe(true);
      const slow = Object.assign(fresh(0), { cc: CLASS_SPEED[cc] }); drive(slow, strip(), 4);
      expect(slow.speed / TOP_SPEED).toBeGreaterThan(CLASS_SPEED[cc] * .97); expect(slow.speed / TOP_SPEED).toBeLessThanOrEqual(CLASS_SPEED[cc]);
      // A boost is a share on top of the class's own speed, never the full-speed kart's boost.
      const kart = Object.assign(fresh(TOP_SPEED * CLASS_SPEED[cc]), { cc: CLASS_SPEED[cc] }); giveBoost(kart, 'sweet', []); drive(kart, strip(), .8);
      expect(kart.speed / (TOP_SPEED * CLASS_SPEED[cc])).toBeGreaterThan(1.25); expect(kart.speed / (TOP_SPEED * CLASS_SPEED[cc])).toBeLessThan(1.4);
    }
    expect(LEVELS.easy.pace).toBeLessThan(LEVELS.normal.pace); expect(LEVELS.normal.pace).toBeLessThan(LEVELS.hard.pace); expect(LEVELS.hard.pace).toBe(1);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const race = started({ difficulty: level, seed: 4 }); run(race, 1, gas);
      expect(race.state.player.assist).toBe(level === 'easy'); expect(race.state.player.pace).toBe(1);
      // Side by side with the player, a rival's pace is its own share of the level's.
      const fox = race.state.karts[1]!; fox.distance = race.state.player.distance; race.tick(gas, RACE_STEP);
      expect(fox.pace).toBeCloseTo(RIVALS[0]!.pace * LEVELS[level].pace, 9);
    }
    expect(createRace({ difficulty: 'hard' }).state.position).toBe(8);
  });
});
