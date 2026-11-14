/** Godisracet's race: eight karts, three laps, item boxes, sweets on the road and everything thrown between
 * the karts. Fixed steps, a seeded stream and no clock of its own, so a race is the same at any frame rate.
 * No three and no DOM: the view and the sound read `state` and the event queue.
 */
import { buildRacingLine, createBrain, elastic, rivalControls, RIVALS, seededRandom, type Brain, type RacingLine } from './ai';

export { TRACK_IDS, type TrackId } from './track';
import { giveBoost, hitKart, KART_RADIUS, MAX_CANDIES, newKart, stepKart, TOP_SPEED, type ItemId, type Kart, type KartControls, type KartEvent, type RacerId } from './kart';
import { getTrack, LAP, LAPS, trackGap, type Track, type TrackId } from './track';

export type { ItemId, Kart, KartControls, KartEvent, RacerId } from './kart';
export type ShotKind = 'cone' | 'bee' | 'gum';
/** Something loose on the course: a thrown pine cone, a bumblebee on its way, or gum on the road. */
export interface Shot { id: number; kind: ShotKind; owner: number; distance: number; lane: number; angle: number; speed: number; life: number; bounces: number; target: number; safe: number }
export interface BoxState { at: number; lane: number; active: boolean; respawn: number }
export interface CandyState { at: number; lane: number; lift: number; active: boolean; respawn: number }
/** `order` is the whole field. A rival still on the road when the player finishes gets the time it was heading for. */
export interface KartResult { place: number; elapsed: number; lapTimes: number[]; bestLap: number; order: { id: RacerId; time: number; finished: boolean }[] }
export interface KartState {
  phase: 'countdown' | 'racing' | 'finished';
  countdown: number;
  elapsed: number;
  laps: number;
  karts: Kart[];
  player: Kart;
  shots: Shot[];
  boxes: BoxState[];
  candies: CandyState[];
  position: number;
  result: KartResult | null;
  /** What happened since the view last took the queue: each cue is seen exactly once. */
  events: KartEvent[];
}
export interface KartRace {
  readonly state: KartState;
  readonly track: Track;
  readonly line: RacingLine;
  tick(input: Readonly<KartControls>, dt: number): KartState;
  /** Hands over the queued events and empties the queue. */
  takeEvents(): KartEvent[];
  restart(): void;
}

export const RACE_STEP = 1 / 120;
export const COUNTDOWN_SECONDS = 3;
/** The drift button, pressed inside the last second and held to the start, is a rocket start. */
export const ROCKET_WINDOW = 1;
export const ROULETTE_SECONDS = 1.6;
const BOX_RESPAWN = 3.5, CANDY_RESPAWN = 10, MAX_GUM = 14, MAX_EVENTS = 256;
const PLAYER_COLOR = 0xf6c343;
export type Difficulty = 'easy' | 'normal' | 'hard';
export type SpeedClass = 50 | 100 | 150;
/** Each class as a share of full speed: 50 cc is easy to keep on the road, 150 cc asks for drifts. */
export const CLASS_SPEED: Readonly<Record<SpeedClass, number>> = { 50: .78, 100: .9, 150: 1 };
/** What each difficulty means: the rivals' share of the player's top speed, how much rivals ahead wait and rivals
 * behind chase, whether they are given fewer things to throw, whether the player is helped at the wheel and
 * with luckier bags, and where on the grid the player starts. */
export const LEVELS: Readonly<Record<Difficulty, { pace: number; wait: number; chase: number; gentle: boolean; assist: boolean; lucky: number; slot: number }>> = {
  easy: { pace: .87, wait: 1.8, chase: 0, gentle: true, assist: true, lucky: .25, slot: 3 },
  normal: { pace: .93, wait: 1, chase: 1, gentle: false, assist: false, lucky: 0, slot: 7 },
  hard: { pace: 1, wait: .5, chase: 1.4, gentle: false, assist: false, lucky: 0, slot: 7 },
};
/** How likely each item is for the leader, the middle of the field and the last kart. */
const WEIGHTS: Readonly<Record<ItemId, readonly [number, number, number]>> = {
  sweet: [22, 20, 8], sweets3: [0, 12, 26], cone: [18, 20, 10], bee: [2, 16, 18],
  gum: [30, 10, 2], floss: [28, 12, 6], rainbow: [0, 4, 18], cloud: [0, 6, 12],
};
const ITEMS = Object.keys(WEIGHTS) as ItemId[];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The item a box gives a kart `behind` of the way down the field (0 leads, 1 is last). */
export function rollItem(behind: number, random: () => number, gentle = false): ItemId {
  const t = clamp(behind, 0, 1) * 2, i = t >= 1 ? 1 : 0, f = t - i;
  const weights = ITEMS.map(item => {
    const w = WEIGHTS[item], weight = w[i]! + (w[i + 1]! - w[i]!) * f;
    return gentle && (item === 'cone' || item === 'bee' || item === 'cloud') ? weight * .2 : weight;
  });
  let pick = random() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < ITEMS.length; k++) { pick -= weights[k]!; if (pick <= 0) return ITEMS[k]!; }
  return 'sweet';
}

export interface RaceOptions { track?: TrackId; difficulty?: Difficulty; cc?: SpeedClass; seed?: number }
const lines = new Map<TrackId, RacingLine>();
/** A course's racing line takes a moment to work out, and is the same every time: once is enough. */
export function racingLine(id: TrackId): RacingLine {
  let line = lines.get(id);
  if (!line) lines.set(id, line = buildRacingLine(getTrack(id)));
  return line;
}
export function createRace({ track: course = 'varggropen', difficulty = 'normal', cc = 150, seed = 2012 }: RaceOptions = {}): KartRace {
  const track = getTrack(course), line = racingLine(course), level = LEVELS[difficulty], speed = CLASS_SPEED[cc];
  // The rivals line up fastest first. The player starts last, or in the middle of the field in Lugnt.
  const playerSlot = level.slot;
  const karts: Kart[] = [];
  const slots = track.grid.map((_, i) => i).filter(i => i !== playerSlot);
  const place = (kart: Kart, slot: number) => { kart.distance = track.grid[slot]!.distance; kart.lane = track.grid[slot]!.lane; };
  karts.push(newKart(0, 'player', PLAYER_COLOR, 0, 0));
  RIVALS.forEach((rival, i) => karts.push(newKart(i + 1, rival.id, rival.color, 0, 0)));
  const player = karts[0]!;
  const state: KartState = {
    phase: 'countdown', countdown: COUNTDOWN_SECONDS, elapsed: 0, laps: LAPS, karts, player, shots: [],
    boxes: track.boxes.map(box => ({ ...box, active: true, respawn: 0 })),
    candies: track.candies.map(candy => ({ ...candy, active: true, respawn: 0 })),
    position: playerSlot + 1, result: null, events: [],
  };
  let brains: Brain[] = [], random = seededRandom(seed);
  const lapStarts = new Array<number>(karts.length).fill(0);
  let accumulator = 0, itemHeld = false, itemPressed = false, rocketAt: number | null = null, nextShot = 1, finished = 0;
  const controls: KartControls[] = karts.map(() => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false }));
  const before = new Array<number>(karts.length).fill(0);

  function restart(): void {
    karts.forEach((kart, i) => {
      const fresh = newKart(i, kart.id, kart.color, 0, 0);
      kart.lapTimes.length = 0; fresh.lapTimes = kart.lapTimes;
      Object.assign(kart, fresh);
      place(kart, i === 0 ? playerSlot : slots[i - 1]!);
      kart.assist = i === 0 && level.assist; kart.cc = speed; kart.place = (i === 0 ? playerSlot : slots[i - 1]!) + 1;
      lapStarts[i] = 0;
    });
    random = seededRandom(seed);
    brains = RIVALS.map((rival, i) => createBrain(rival, (seed >>> 0) + 71 * (i + 1)));
    state.phase = 'countdown'; state.countdown = COUNTDOWN_SECONDS; state.elapsed = 0; state.position = playerSlot + 1; state.result = null;
    state.shots.length = 0; state.events.length = 0;
    for (const box of state.boxes) { box.active = true; box.respawn = 0; }
    for (const candy of state.candies) { candy.active = true; candy.respawn = 0; }
    accumulator = 0; itemHeld = itemPressed = false; rocketAt = null; nextShot = 1; finished = 0;
  }

  const emit = (event: KartEvent) => { state.events.push(event); };
  /** Track coordinates are a little squeezed on the inside of a bend; this is the true length of a gap there. */
  const metric = (distance: number, lane: number) => Math.max(.3, 1 - track.curvature(distance) * lane);
  const crossed = (from: number, to: number, at: number) => { const a = trackGap(at, from), b = trackGap(at, to); return a < 0 && b >= 0 && b - a < 8; };
  const endShot = (shot: Shot) => {
    const index = state.shots.indexOf(shot);
    if (index < 0) return;
    state.shots.splice(index, 1); emit({ type: 'shotEnd', id: shot.id, kind: shot.kind, distance: shot.distance, lane: shot.lane });
  };

  function useItem(kart: Kart): void {
    const item = kart.item;
    if (!item) return;
    const shoot = (kind: ShotKind, values: Partial<Shot>) => state.shots.push({ id: nextShot++, kind, owner: kart.index, distance: kart.distance, lane: kart.lane, angle: 0, speed: 0, life: 8, bounces: 0, target: -1, safe: .5, ...values });
    if (item === 'sweet' || item === 'sweets3') giveBoost(kart, 'sweet', state.events);
    else if (item === 'cone') shoot('cone', { distance: kart.distance + 2.4, angle: clamp(kart.heading, -.5, .5), speed: Math.max(kart.speed + 16, 42), life: 7, bounces: 5 });
    else if (item === 'bee') {
      const ahead = karts.find(other => other.place === kart.place - 1 && other.finishTime === null);
      shoot('bee', { distance: kart.distance + 2.2, speed: 44, life: 12, target: ahead ? ahead.index : -1 });
    } else if (item === 'gum') {
      const gums = state.shots.filter(shot => shot.kind === 'gum');
      if (gums.length >= MAX_GUM) endShot(gums[0]!);
      shoot('gum', { distance: kart.distance - 2.6, life: 50, safe: .7 });
    } else if (item === 'floss') kart.shield = 12;
    else if (item === 'rainbow') { kart.star = 7; kart.cloud = 0; }
    else for (const other of karts) {
      // A rain cloud over everyone ahead: the candy floss soaks one up, the rainbow dries it at once.
      if (other === kart || other.place > kart.place || other.finishTime !== null || other.star > 0) continue;
      if (other.shield > 0) { other.shield = 0; emit({ type: 'shieldPop', kart: other.index }); continue; }
      other.cloud = 3.2; emit({ type: 'cloud', kart: other.index, by: kart.index });
    }
    emit({ type: 'use', kart: kart.index, item });
    if (item === 'sweets3' && --kart.itemCount > 0) return;
    kart.item = null; kart.itemCount = 0;
  }

  function stepShots(): void {
    for (const shot of [...state.shots]) {
      if (!state.shots.includes(shot)) continue; // a cone has already knocked this gum away
      shot.life -= RACE_STEP; shot.safe -= RACE_STEP;
      if (shot.kind === 'cone') {
        // A straight throw in the world, so it curls across the road in a bend, and bounces off the barriers.
        const kappa = track.curvature(shot.distance), ds = shot.speed * Math.cos(shot.angle) / metric(shot.distance, shot.lane);
        shot.distance += ds * RACE_STEP; shot.lane += shot.speed * Math.sin(shot.angle) * RACE_STEP; shot.angle -= kappa * ds * RACE_STEP;
        const left = track.wallLeft(shot.distance) - .4, right = track.wallRight(shot.distance) - .4;
        if (shot.lane > left || shot.lane < -right) { shot.lane = clamp(shot.lane, -right, left); shot.angle = -shot.angle; shot.bounces--; }
        const gum = state.shots.find(other => other.kind === 'gum' && Math.abs(trackGap(shot.distance, other.distance)) < 1.3 && Math.abs(other.lane - shot.lane) < 1.2);
        if (gum) { endShot(gum); shot.bounces = -1; }
      } else if (shot.kind === 'bee') {
        // The bee follows the road to the kart it was sent after, then swings across to it.
        const target = shot.target >= 0 ? karts[shot.target]! : null;
        const gap = target ? trackGap(shot.distance, target.distance) : 0;
        if (target && (target.finishTime !== null || gap < -4)) shot.target = -1;
        const aim = target && gap < 45 ? target.lane : line.laneAt(shot.distance + 6);
        shot.speed = Math.max(44, (target?.speed ?? 0) + 12);
        shot.distance += shot.speed * RACE_STEP / metric(shot.distance, shot.lane);
        shot.lane += clamp(aim - shot.lane, -10 * RACE_STEP, 10 * RACE_STEP);
      }
      if (shot.life <= 0 || shot.bounces < 0) { endShot(shot); continue; }
      for (const kart of karts) {
        if (kart.finishTime !== null || (kart.index === shot.owner && shot.safe > 0)) continue;
        if (shot.kind === 'bee' ? kart.index !== shot.target : kart.y > 1.3) continue;
        const gap = trackGap(shot.distance, kart.distance) * metric(kart.distance, kart.lane);
        if (Math.abs(gap) > 1.6 || Math.abs(kart.lane - shot.lane) > 1.35) continue;
        hitKart(kart, shot.kind, shot.owner, state.events);
        endShot(shot);
        break;
      }
    }
  }

  function contacts(): void {
    for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i]!, b = karts[j]!;
      if (a.finishTime !== null || b.finishTime !== null || Math.abs(a.y - b.y) > 1.2) continue;
      const scale = metric(a.distance, (a.lane + b.lane) / 2), along = trackGap(a.distance, b.distance) * scale, across = b.lane - a.lane;
      const apart = Math.hypot(along, across), overlap = KART_RADIUS * 2 - apart;
      if (overlap <= 0) continue;
      const nx = apart > 1e-6 ? along / apart : 0, nn = apart > 1e-6 ? across / apart : a.index < b.index ? 1 : -1;
      a.distance -= nx * overlap / 2 / scale; a.lane -= nn * overlap / 2; b.distance += nx * overlap / 2 / scale; b.lane += nn * overlap / 2;
      if (a.star > 0 !== b.star > 0) { hitKart(a.star > 0 ? b : a, 'star', a.star > 0 ? a.index : b.index, state.events); continue; }
      const closing = (a.speed * Math.cos(a.heading) - b.speed * Math.cos(b.heading)) * nx + (a.speed * Math.sin(a.heading) + a.slide - b.speed * Math.sin(b.heading) - b.slide) * nn;
      if (closing <= 0) continue;
      const knock = closing * .6;
      a.slide -= nn * knock * .8; b.slide += nn * knock * .8;
      a.speed = Math.max(0, a.speed - nx * knock * .5); b.speed = Math.max(0, b.speed + nx * knock * .5);
      if (closing > 2.5 && a.bumped <= 0 && b.bumped <= 0) { a.bumped = b.bumped = .4; emit({ type: 'bump', kart: a.index, other: b.index }); }
    }
  }

  function step(input: Readonly<KartControls>): void {
    if (state.phase === 'finished') return;
    if (state.phase === 'countdown') {
      state.countdown = Math.max(0, state.countdown - RACE_STEP);
      if (!input.drift) rocketAt = null; else if (rocketAt === null) rocketAt = state.countdown;
      itemPressed = false;
      karts.forEach((kart, i) => stepKart(kart, i === 0 ? input : rivalControls(kart, brains[i - 1]!, world), track, RACE_STEP, state.events));
      if (state.countdown < 1e-9) {
        state.countdown = 0; state.phase = 'racing';
        emit({ type: 'go' });
        karts.forEach((kart, i) => {
          kart.held = false;
          if (i === 0 ? rocketAt !== null && rocketAt <= ROCKET_WINDOW : brains[i - 1]!.rocket) giveBoost(kart, 'start', state.events);
        });
      }
      return;
    }
    state.elapsed += RACE_STEP;
    world.gums = state.shots.filter(shot => shot.kind === 'gum');
    karts.forEach((kart, i) => {
      before[i] = kart.distance;
      if (i === 0) { Object.assign(controls[0]!, input, { item: itemPressed }); return; }
      const brain = brains[i - 1]!;
      kart.pace = brain.profile.pace * level.pace * elastic(kart.distance, player.distance, level.wait, level.chase);
      Object.assign(controls[i]!, rivalControls(kart, brain, world));
    });
    itemPressed = false;
    karts.forEach((kart, i) => stepKart(kart, controls[i]!, track, RACE_STEP, state.events));
    contacts();
    for (const [i, kart] of karts.entries()) {
      if (kart.finishTime !== null) continue;
      // Tucked in behind another kart for a moment, the air pulls this one along.
      const towed = kart.speed > .7 * TOP_SPEED && !kart.airborne && kart.boostTime <= 0 && karts.some(other => {
        const gap = trackGap(kart.distance, other.distance);
        return other !== kart && gap > 3 && gap < 18 && Math.abs(other.lane - kart.lane) < 1.5;
      });
      kart.draft = towed ? kart.draft + RACE_STEP : Math.min(kart.draft + RACE_STEP, Math.max(0, kart.draft - RACE_STEP * 2));
      if (kart.draft > 1.2) { kart.draft = -2; giveBoost(kart, 'draft', state.events); emit({ type: 'draft', kart: kart.index }); }
      // The roulette, and the item button: a press stops the roulette early, the next one uses the item.
      if (kart.roulette > 0) {
        kart.roulette = Math.max(0, kart.roulette - RACE_STEP);
        if (controls[i]!.item && kart.roulette < ROULETTE_SECONDS - .4) kart.roulette = 0;
        if (!kart.roulette && kart.rolling) {
          kart.item = kart.rolling; kart.itemCount = kart.rolling === 'sweets3' ? 3 : 1; kart.rolling = null;
          emit({ type: 'item', kart: kart.index, item: kart.item });
        }
      } else if (controls[i]!.item && kart.item && kart.spin <= 0) useItem(kart);
      // Boxes and sweets are taken where the kart really crosses them.
      for (const [index, box] of state.boxes.entries()) {
        if (!box.active || Math.abs(kart.lane - box.lane) > 1.4 || kart.y > 1.6 || !crossed(before[i]!, kart.distance, box.at)) continue;
        box.active = false; box.respawn = BOX_RESPAWN;
        emit({ type: 'box', kart: kart.index, box: index });
        if (kart.item || kart.roulette > 0) continue;
        const behind = karts.length > 1 ? (kart.place - 1) / (karts.length - 1) : 0;
        kart.rolling = rollItem(i === 0 ? behind + level.lucky : behind, random, i > 0 && level.gentle);
        kart.roulette = i === 0 ? ROULETTE_SECONDS : 1.1;
      }
      for (const [index, candy] of state.candies.entries()) {
        if (!candy.active || Math.abs(kart.lane - candy.lane) > 1.3 || Math.abs(kart.y - candy.lift) > 1.5 || !crossed(before[i]!, kart.distance, candy.at)) continue;
        candy.active = false; candy.respawn = CANDY_RESPAWN;
        kart.candies = Math.min(MAX_CANDIES, kart.candies + 1);
        emit({ type: 'candy', kart: kart.index, candy: index });
      }
    }
    stepShots();
    for (const spot of [...state.boxes, ...state.candies]) if (!spot.active && (spot.respawn = Math.max(0, spot.respawn - RACE_STEP)) === 0) spot.active = true;
    karts.forEach((kart, i) => {
      const goal = (kart.completedLaps + 1) * LAP;
      if (kart.finishTime !== null || before[i]! >= goal || kart.distance < goal) return;
      const moved = kart.distance - before[i]!, time = state.elapsed - RACE_STEP + clamp((goal - before[i]!) / Math.max(1e-4, moved), 0, 1) * RACE_STEP;
      kart.lapTimes.push(time - lapStarts[i]!); lapStarts[i] = time; kart.completedLaps++;
      if (kart.completedLaps >= LAPS) { kart.finishTime = time; kart.lap = LAPS; emit({ type: 'finish', kart: kart.index, place: ++finished }); }
      else { kart.lap = kart.completedLaps + 1; emit({ type: 'lap', kart: kart.index, lap: kart.lap }); }
    });
    const standings = [...karts].sort((a, b) => a.finishTime !== null && b.finishTime !== null ? a.finishTime - b.finishTime
      : a.finishTime !== null ? -1 : b.finishTime !== null ? 1 : b.distance - a.distance);
    standings.forEach((kart, i) => { kart.place = i + 1; });
    state.position = player.place;
    if (player.finishTime !== null) {
      state.phase = 'finished';
      let last = player.finishTime;
      const order = standings.map(kart => {
        // Each later kart's time keeps the order it is in on the road.
        const time = kart.finishTime ?? Math.max(last + .1, state.elapsed + (LAPS * LAP - kart.distance) / (TOP_SPEED * .92));
        last = Math.max(last, time);
        return { id: kart.id, time, finished: kart.finishTime !== null };
      });
      state.result = { place: player.place, elapsed: player.finishTime, lapTimes: [...player.lapTimes], bestLap: Math.min(...player.lapTimes), order };
      Object.assign(player, { drift: 0, driftCharge: 0, driftTier: 0, boostTime: 0, boostPower: 0, boostKind: null });
    }
  }

  const world = { track, line, karts, gums: [] as Shot[], boxes: state.boxes, dt: RACE_STEP };
  restart();
  return {
    state, track, line, restart,
    takeEvents() { return state.events.splice(0); },
    tick(input, dt) {
      if (!Number.isFinite(dt) || dt <= 0 || state.phase === 'finished') return state;
      if (input.item && !itemHeld) itemPressed = true;
      itemHeld = input.item;
      // Pause and hidden-page time is never replayed as a burst of driving on return.
      accumulator += Math.min(dt, .05);
      while (accumulator + 1e-10 >= RACE_STEP) { step(input); accumulator = Math.max(0, accumulator - RACE_STEP); }
      // Nobody listening (a test, a paused view) must not let the queue grow without end.
      if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
      return state;
    },
  };
}
