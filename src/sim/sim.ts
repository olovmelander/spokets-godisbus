import { BoxShape, ChainShape, Settings, Vec2, World, type Body, type Contact, type Fixture } from 'planck';
import {
  BUBBLE_LIFT, BUBBLE_TIME, CANDY_MAGNET, CLIMB_EXIT, CLIMB_GRAB, CLIMB_SPEED, COYOTE_TIME, EDGE_REACH, ELOF_HALF_WIDTH, ELOF_HEIGHT,
  FALL_LIMIT, GRAVITY, HOP_GRAVITY_SCALE, JUMP_BUFFER, JUMP_SPEED, LEDGE_REACH, LEDGE_TIME, MAX_FALL_SPEED, REGRAB_AFTER,
  RUN_AFTER, RUN_DEFLECTION, RUN_SPEED, SAFE_AFTER, SAFE_REACH, SLIDE_REACH, SLIDE_TIME, STEEP_SLIDE_SPEED, STEP,
  STEP_HEIGHT, STOP_WITHIN, WALK_DEFLECTION, WALK_SPEED,
} from './constants';
import { CHECKPOINT_REACH, EASY_JUMP_REACH, EASY_JUMP_STEER, MOVE_TIME, MOVER_RESET, PUSH_REACH } from './constants';
import { DOWN_TIME, DROP_FALL, DROP_FROM, DROP_RADIUS, DROP_WARNING } from './constants';
import { GHOST_CATCH, GHOST_NEAR, GHOST_SLIP, GHOST_SPEED, RIDE_CORRIDOR, RIDE_STEER, SPOT_REACH } from './constants';
import { RISE_TIME, ROLLER_REACH, SINK_DEPTH, SINK_TIME, TOUCH_REACH, WATER_REACH } from './constants';
import { GUST_SHELTER, GUST_SLOW, GUST_SPEED, GUST_WARNING } from './constants';
import {
  LACE_REACH, LACE_REEL, SWING_DAMP, SWING_FLIGHT, SWING_HOLD_MAX, SWING_MAX, SWING_MIN_LENGTH, SWING_PUMP, SWING_PUMP_HELP,
} from './constants';
import type {
  ChapterData, Climb, GhostPerch, Hook, Jump, Mode, Mover, PlayerState, Ride, SimOptions, SimStart, Spot, StepInput, Vec, Verb,
} from './types';

// 1 EL is the length unit. This scales Box2D's tolerances to a hero who is one unit tall (plan §6.4).
Settings.lengthUnitsPerMeter = 0.2;

const FOOT = 'foot';
/**
 * Box2D keeps a thin skin between shapes, so a body rests this far above the ground.
 * Elof's reported y has it taken off: y is 0 when he stands on ground at height 0.
 */
const SKIN = 2 * Settings.polygonRadius - Settings.linearSlop * Settings.lengthUnitsPerMeter;
/** Safe ground is where he stood this many steps on the ground ago. */
const SAFE_STEPS = Math.round(SAFE_AFTER / STEP);
/** Ground this steep or flatter is walked on: 45° (plan §4.2). The rest is slid down. */
const WALKABLE = Math.cos(Math.PI / 4) - 0.01;
/** A face this upright is a wall or the riser of a step, not a slope. */
const UPRIGHT = 0.8;

/** What a ray found: where, and the surface's normal there. */
interface Hit {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

/** What Elof is doing. In every state but `free` he is carried along a path and the physics leaves him alone. */
type State =
  | { kind: 'free' }
  | { kind: 'bubble'; fromX: number; fromY: number; t: number }
  | { kind: 'ledge'; fromX: number; fromY: number; toX: number; toY: number; t: number }
  | { kind: 'climb'; climb: Climb }
  | { kind: 'slide'; climb: Climb; fromX: number; t: number }
  /** `angle` is from straight down, positive to the right; `speed` is its rate; `letGo` counts from Hoppa, or is -1. */
  | { kind: 'swing'; hook: Hook; length: number; to: number; angle: number; speed: number; letGo: number }
  | { kind: 'fly'; fromX: number; fromY: number; vx: number; vy: number; toX: number; toY: number; time: number; t: number }
  | { kind: 'down'; x: number; y: number; t: number }
  /** `offset` is how far the stick has moved him from the middle of the ride's path. */
  | { kind: 'ride'; ride: Ride; offset: number; t: number };

/** A thing on its rail: where it is, which stop it is at or going to, and how far it has come. */
export interface MoverState {
  readonly def: Mover;
  /** The middle of its bottom. */
  x: number;
  y: number;
  /** The stop it is at, or on its way to. */
  stop: number;
  /** The stop it came from, and how far it has come from there: 1 when it rests. */
  from: number;
  t: number;
}

/** The ghost: where it is, which of its places it is at or hopping to, and whether it has gone for good. */
export interface GhostState {
  x: number;
  y: number;
  /** The place it is at, or on its way to. */
  perch: number;
  /** How far the hop has come: 1 when it stands. */
  t: number;
  /** True once it has left its last place: out of the chapter. */
  gone: boolean;
}

/** A rolling cone: where it is, and whether one is on its way at all. */
export interface RollerState {
  x: number;
  y: number;
  on: boolean;
  radius: number;
  /** The step at which it was set rolling, or -1 while it waits for its flag. */
  since: number;
}

/** A soft tussock: where its top is now, and how far it has sunk, from 0 to 1. */
export interface TussockState {
  x: number;
  y: number;
  width: number;
  sunk: number;
}

/** A stretch with gusts: what the next gust is doing. */
export interface GustState {
  /** 0 while it is calm; while a gust blows, how far through it is, up to 1. */
  blow: number;
  /** In the second before a gust: how near it is, from 0 to 1. */
  warn: number;
  /** Seconds until the next gust begins; 0 while one blows. */
  until: number;
}

/** A drip and its next drop. */
export interface DripState {
  x: number;
  y: number;
  /** How far the next drop's shadow has grown, from 0 (none yet) to 1 (it lands). */
  shadow: number;
  /** How high above the ground the drop is, or -1 while none is in the air. */
  height: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The pure simulation: no three, no DOM, no clock. One call to step() is 1/120 s.
 * It holds the ground and a greybox Elof with the moves of plan §4.2: he walks, runs and jumps, walks over
 * low steps and up slopes, pulls himself up ledges, climbs hoses and slides down them, throws the lace to
 * a hook and swings, collects the trail candy, and is carried back by the glitter bubble when he falls too
 * far.
 */
export class Sim {
  readonly world: World;
  readonly flags = new Set<string>();
  steps = 0;
  /** Trail candy in the bag, by its place in chapter.candy. Nothing ever leaves the bag (plan §4.3). */
  readonly collected: boolean[];
  candyCount = 0;
  /** How many times the glitter bubble has carried him back. It costs him nothing (plan §4.2). */
  bubbles = 0;
  /** The last big candy he reached, by its place in chapter.checkpoints, or -1 before the first. */
  checkpoint = -1;
  /** The settings that change the rules. They may be changed while the game is played. */
  options: SimOptions;
  /** The things on rails, in the chapter's order. */
  readonly movers: MoverState[];
  /** The drips and their next drops, in the chapter's order. */
  readonly drips: DripState[];
  /** How many times a drop has knocked him over. It costs him a second and nothing else. */
  knocks = 0;
  /** The rolling cones, in the chapter's order. */
  readonly rollers: RollerState[];
  /** How many times a cone has bowled him over. */
  bowled = 0;
  /** The stretches with gusts, in the chapter's order. */
  readonly gusts: GustState[];
  /** How many times a gust has caught him in the open. */
  blown = 0;
  /** Whether a gust has hold of him now, and which gust caught him last: each is counted once. */
  private windy = false;
  private caughtBy = -1;
  /** The soft tussocks, in the chapter's order. */
  readonly tussocks: TussockState[];
  /** How many times a tussock has sunk under him. */
  sinks = 0;
  /** The ghost, or null in a chapter without it. */
  readonly ghost: GhostState | null;
  /** The beats that have come, by id, in the order they came: what the page shows as bubbles. */
  readonly said: string[] = [];
  prev: PlayerState;
  curr: PlayerState;

  private readonly body: Body;
  /** His body. While he is carried it is a sensor, so he passes through the ground. */
  private readonly shape: Fixture;
  private readonly climbs: Climb[];
  private readonly hooks: Hook[];
  private readonly checkpoints: Vec[];
  private readonly jumps: Jump[];
  private readonly moverBodies: Body[];
  private readonly tussockBodies: Body[];
  private readonly spots: Spot[];
  private readonly perches: GhostPerch[];
  /** The ghost's hop: where from, how long, how high. */
  private hop = { fromX: 0, fromY: 0, time: 1, lift: 0 };
  private state: State = { kind: 'free' };
  /** True in the air after a swing: he keeps the speed it gave him, where a jump's speed follows the stick. */
  private thrown = false;
  private footContacts = 0;
  private coyote = 0;
  private buffer = 0;
  private rising = false;
  private cut = false;
  /** True from a take-off until his feet have left the ground: he is not standing, though they still touch. */
  private leaving = false;
  private facing: 1 | -1 = 1;
  private atEdge = false;
  private verb: Verb | null = null;
  private word: string | null = null;
  /** Time left before he may take hold of a hose again, after jumping or sliding off one. */
  private regrab = 0;
  /** The height of the ground he last stood on. */
  private standY: number;
  /** The highest he has been since he last stood: a fall is measured from here. */
  private fallTop: number;
  /** Where he stood at each of the last SAFE_STEPS steps on solid ground, as a ring. */
  private readonly stood: Vec[];
  private stoodAt = 0;
  /** Steps on solid ground since the last bubble. Time in the air is not counted, and does not reset it. */
  private stoodFor = 0;
  /** Where he last stood with ground under both his sides. */
  private readonly last: Vec;
  /** Where the bubble is taking him. */
  private readonly safe: Vec;

  constructor(readonly chapter: ChapterData, options: SimOptions = {}, start: SimStart = {}) {
    this.options = options;
    this.checkpoints = chapter.checkpoints ?? [];
    this.jumps = chapter.jumps ?? [];
    // A saved game starts at its big candy. One the chapter doesn't know means the chapter's start.
    const saved = start.checkpoint !== undefined ? this.checkpoints[start.checkpoint] : undefined;
    const spawn = saved ?? chapter.spawn;
    if (saved) this.checkpoint = start.checkpoint!;
    this.world = new World({ gravity: new Vec2(0, -GRAVITY), allowSleep: false });

    const ground = this.world.createBody();
    ground.createFixture({
      shape: new ChainShape(chapter.ground.map((p) => new Vec2(p.x, p.y)), false),
      friction: 0,
    });

    this.body = this.world.createBody({
      type: 'dynamic',
      position: new Vec2(spawn.x, spawn.y + SKIN),
      fixedRotation: true,
      allowSleep: false,
    });
    // The body's origin is the middle of Elof's feet. No friction: the controller owns his speed.
    this.shape = this.body.createFixture({
      shape: new BoxShape(ELOF_HALF_WIDTH, ELOF_HEIGHT / 2, new Vec2(0, ELOF_HEIGHT / 2)),
      density: 1,
      friction: 0,
    });
    // Narrower than the body, so a wall beside him never counts as ground.
    this.body.createFixture({
      shape: new BoxShape(ELOF_HALF_WIDTH * 0.85, 0.05, new Vec2(0, -0.02)),
      isSensor: true,
      userData: FOOT,
    });

    // Things on rails are moved by the game, never by the physics: nothing can knock them off.
    this.movers = (chapter.movers ?? []).map((def) => {
      const stop = start.placed?.includes(def.id) ? def.stops.length - 1 : 0;
      const at = def.stops[stop]!;
      return { def, x: at.x, y: at.y, stop, from: stop, t: 1 };
    });
    this.moverBodies = this.movers.map((mover) => {
      const body = this.world.createBody({ type: 'kinematic', position: new Vec2(mover.x, mover.y) });
      body.createFixture({
        shape: new BoxShape(mover.def.width / 2, mover.def.height / 2, new Vec2(0, mover.def.height / 2)),
        friction: 0,
      });
      return body;
    });

    this.drips = (chapter.drips ?? []).map((drip) => ({ x: drip.at.x, y: drip.at.y, shadow: 0, height: -1 }));
    this.rollers = (chapter.rollers ?? []).map((r) => ({ x: r.from.x, y: r.from.y, on: false, radius: r.radius, since: r.needs === undefined ? 0 : -1 }));
    this.gusts = (chapter.gusts ?? []).map(() => ({ blow: 0, warn: 0, until: 0 }));
    this.tussocks = (chapter.tussocks ?? []).map((t) => ({ x: t.x, y: t.y, width: t.width, sunk: 0 }));
    this.tussockBodies = this.tussocks.map((t) => {
      const body = this.world.createBody({ type: 'kinematic', position: new Vec2(t.x, t.y - 1) });
      body.createFixture({ shape: new BoxShape(t.width / 2, 0.5, new Vec2(0, 0.5)), friction: 0 });
      return body;
    });
    for (const flag of start.flags ?? []) this.flags.add(flag);
    // A ride he had not finished when the game was saved begins again: he starts before it.
    for (const spot of chapter.spots ?? []) {
      const ride = (chapter.rides ?? []).find((r) => r.id === spot.ride);
      if (ride && ride.to.x > spawn.x + 0.5) this.flags.delete(spot.id);
    }
    for (const mover of this.movers) if (mover.stop === mover.def.stops.length - 1) this.flags.add(`placed:${mover.def.id}`);
    // What was said before the place he starts at is not said again.
    for (const beat of chapter.beats ?? []) if (beat.at !== undefined && beat.at < spawn.x - 0.5) this.flags.add(`beat:${beat.id}`);
    this.spots = chapter.spots ?? [];
    this.perches = chapter.ghost ?? [];
    // The ghost starts at its first place that is still ahead of him.
    const ahead = this.perches.findIndex((perch) => perch.at.x > spawn.x + 1);
    const first = this.perches[ahead];
    this.ghost = first ? { x: first.at.x, y: first.at.y, perch: ahead, t: 1, gone: false } : null;

    this.world.on('begin-contact', (c) => this.countFoot(c, 1));
    this.world.on('end-contact', (c) => this.countFoot(c, -1));

    this.climbs = chapter.climbs ?? [];
    this.hooks = chapter.hooks ?? [];
    this.collected = chapter.candy.map(() => false);
    for (const i of start.collected ?? []) {
      if (this.collected[i] === false) {
        this.collected[i] = true;
        this.candyCount++;
      }
    }
    this.standY = spawn.y;
    this.fallTop = spawn.y;
    this.safe = { x: spawn.x, y: spawn.y };
    this.last = { x: spawn.x, y: spawn.y };
    this.stood = Array.from({ length: SAFE_STEPS }, () => ({ x: spawn.x, y: spawn.y }));
    this.curr = this.read(false);
    this.prev = this.curr;
  }

  step(input: StepInput): void {
    this.prev = this.curr;
    // Free, he may take hold of something this step: a hose, a ledge, or the hose below him.
    if (this.state.kind === 'free') this.reach(input);

    const state = this.state;
    if (state.kind === 'free') this.walk(input);
    else if (state.kind === 'bubble') this.float(state);
    else if (state.kind === 'ledge') this.haul(state);
    else if (state.kind === 'climb') this.climb(state, input);
    else if (state.kind === 'slide') this.slide(state);
    else if (state.kind === 'swing') this.swing(state, input);
    else if (state.kind === 'fly') this.fly(state);
    else if (state.kind === 'down') this.lie(state);
    else this.ride(state, input);
    this.moveMovers();
    this.rain();
    this.roll();
    this.blow();
    this.sink();
    this.haunt();
    this.tell();

    this.world.step(STEP);
    this.steps++;

    if (this.state.kind === 'free') {
      this.curr = this.read(this.standing());
      this.remember();
      this.wade();
    } else {
      this.curr = this.read(false);
    }
    // The bubble only carries. Everywhere else, candy he comes near is his: up a hose too.
    if (this.state.kind !== 'bubble') this.collect();
    if (this.curr.x >= this.chapter.goalX) this.flags.add('goal');
  }

  /**
   * One step for the rolling cones. They keep time by the step count, like the drops. One that reaches his
   * legs bowls him into the glitter bubble, which takes him to the last big candy; on *Lugnt* it misses him
   * while he moves.
   */
  private roll(): void {
    for (const [i, def] of (this.chapter.rollers ?? []).entries()) {
      const state = this.rollers[i]!;
      state.on = false;
      // Cones that wait for a nudge keep time from the nudge, and none is on its way before its turn.
      if (state.since < 0 && this.flags.has(def.needs!)) state.since = this.steps;
      if (state.since < 0) continue;
      const every = Math.max(1, Math.round(def.every / STEP));
      const since = this.steps - state.since - Math.round(def.first / STEP);
      if (def.needs !== undefined && since < 0) continue;
      const gone = ((((since % every) + every) % every) * STEP * def.speed) / Math.hypot(def.to.x - def.from.x, def.to.y - def.from.y);
      state.on = gone <= 1;
      if (!state.on) continue;
      state.x = mix(def.from.x, def.to.x, gone);
      state.y = mix(def.from.y, def.to.y, gone);
      if (this.state.kind !== 'free') continue;
      const p = this.curr;
      const near = Math.hypot(p.x - state.x, p.y + 0.3 - (state.y + def.radius)) <= def.radius + ROLLER_REACH;
      if (!near || (this.options.gentle && Math.abs(p.vx) > 0.5)) continue;
      this.bowled++;
      this.toCheckpoint();
    }
  }

  /**
   * One step for the gusts. They keep time by the step count. One that finds him in the open, away from
   * every boulder, has hold of him until it has passed or he is back in a boulder's lee.
   */
  private blow(): void {
    this.windy = false;
    for (const [i, def] of (this.chapter.gusts ?? []).entries()) {
      const gust = this.gusts[i]!;
      const every = Math.max(1, Math.round(def.every / STEP));
      const length = Math.round(def.length / STEP);
      const since = this.steps - Math.round(def.first / STEP);
      const at = ((since % every) + every) % every;
      gust.blow = at < length ? (at + 1) / length : 0;
      gust.until = at < length ? 0 : (every - at) * STEP;
      gust.warn = gust.until > 0 && gust.until <= GUST_WARNING ? 1 - gust.until / GUST_WARNING : 0;
      const p = this.curr;
      if (gust.blow === 0 || this.state.kind !== 'free' || p.x <= def.from || p.x >= def.to) continue;
      if (def.shelters.some((s) => Math.abs(p.x - s) <= GUST_SHELTER)) continue;
      this.windy = true;
      const which = i * 1e6 + Math.floor(since / every);
      if (which !== this.caughtBy) this.blown++;
      this.caughtBy = which;
    }
  }

  /** Whether he stands on this soft tussock. */
  private isOn(t: TussockState): boolean {
    const p = this.curr;
    return Math.abs(p.x - t.x) <= t.width / 2 + ELOF_HALF_WIDTH && Math.abs(p.y - t.y) < 0.15;
  }

  /**
   * One step for the soft tussocks: one sinks while he stands on it and rises when he has left. When it has
   * sunk, the glitter bubble lifts him off, before the water reaches his boots. On *Lugnt* it sinks only
   * while he stands still.
   */
  private sink(): void {
    for (const [i, t] of this.tussocks.entries()) {
      const rest = this.chapter.tussocks![i]!.y;
      const on = this.state.kind === 'free' && this.isOn(t);
      const sinking = on && !(this.options.gentle && Math.abs(this.curr.vx) > 0.5);
      t.sunk = sinking ? Math.min(1, t.sunk + STEP / SINK_TIME) : Math.max(0, t.sunk - STEP / RISE_TIME);
      t.y = rest - t.sunk * SINK_DEPTH;
      this.tussockBodies[i]!.setTransform(new Vec2(t.x, t.y - 1), 0);
      // He goes down with it, his boots on its top, unless he is on his way up in a jump.
      if (sinking && this.curr.vy <= 0.5) this.body.setTransform(new Vec2(this.body.getPosition().x, t.y + SKIN), 0);
      if (!on || t.sunk < 1) continue;
      this.sinks++;
      this.startBubble();
    }
  }

  /** Water: the glitter bubble catches him just above it. */
  private wade(): void {
    if (this.state.kind !== 'free') return;
    const p = this.curr;
    const wet = (this.chapter.water ?? []).some((w) => p.x >= w.from && p.x <= w.to && p.y < w.y + WATER_REACH);
    if (wet) this.startBubble();
  }

  /** The beats whose moment has come: each is told once, and remembered as a flag. */
  private tell(): void {
    for (const beat of this.chapter.beats ?? []) {
      const flag = `beat:${beat.id}`;
      if (this.flags.has(flag)) continue;
      const passed = beat.at !== undefined && this.curr.x >= beat.at;
      const happened = beat.on !== undefined && this.flags.has(beat.on);
      if (!passed && !happened) continue;
      this.flags.add(flag);
      this.said.push(beat.id);
    }
  }

  /**
   * One step of a ride. It follows its arc whatever he does; up and down on the stick move him inside its
   * corridor, towards the candy. At its end he stands where it lands.
   */
  private ride(state: { ride: Ride; offset: number; t: number }, input: StepInput): void {
    const ride = state.ride;
    state.t = Math.min(1, state.t + STEP / ride.time);
    const want = Math.max(-1, Math.min(1, input.y)) * (ride.corridor ?? RIDE_CORRIDOR);
    const change = RIDE_STEER * STEP;
    state.offset = state.offset < want ? Math.min(want, state.offset + change) : Math.max(want, state.offset - change);
    // The corridor narrows to nothing at both ends, so that it always lands where it should.
    const open = Math.sin(Math.PI * state.t);
    const k = smooth(state.t);
    this.facing = ride.to.x >= ride.from.x ? 1 : -1;
    this.place(mix(ride.from.x, ride.to.x, k), mix(ride.from.y, ride.to.y, k) + open * (ride.rise + state.offset));
    if (state.t >= 1) this.release(ride.to.y);
  }

  /**
   * One step for the ghost. It stands at a place until Elof comes near, and then hops to the next: always a
   * little ahead. At a near-catch it lets him come close; grabbed or not, it gets away.
   */
  private haunt(): void {
    const ghost = this.ghost;
    if (!ghost || ghost.gone) return;
    const perch = this.perches[ghost.perch]!;
    if (ghost.t < 1) {
      ghost.t = Math.min(1, ghost.t + STEP / this.hop.time);
      const k = smooth(ghost.t);
      ghost.x = mix(this.hop.fromX, perch.at.x, k);
      ghost.y = mix(this.hop.fromY, perch.at.y, k) + Math.sin(Math.PI * ghost.t) * this.hop.lift;
      return;
    }
    if (perch.until && !this.flags.has(perch.until)) return;
    const p = this.curr;
    const away = Math.hypot(p.x - ghost.x, p.y - ghost.y);
    const waiting = perch.catch !== undefined && !this.flags.has(perch.catch);
    const leaves = waiting ? away < GHOST_SLIP : away < (perch.near ?? GHOST_NEAR);
    if (!leaves) return;
    const next = this.perches[ghost.perch + 1];
    if (!next) {
      ghost.gone = true;
      return;
    }
    const far = Math.hypot(next.at.x - ghost.x, next.at.y - ghost.y);
    this.hop = { fromX: ghost.x, fromY: ghost.y, time: Math.min(1.4, Math.max(0.35, far / GHOST_SPEED)), lift: Math.min(1.3, 0.35 + far * 0.12) };
    ghost.perch++;
    ghost.t = 0;
  }

  /** The flag a grab would set, when the ghost stands within reach at a near-catch. */
  private ghostInReach(): string | null {
    const ghost = this.ghost;
    if (!ghost || ghost.gone || ghost.t < 1) return null;
    const perch = this.perches[ghost.perch]!;
    if (perch.catch === undefined || this.flags.has(perch.catch)) return null;
    return Math.hypot(this.curr.x - ghost.x, this.curr.y - ghost.y) <= GHOST_CATCH ? perch.catch : null;
  }

  /** The thing to use that he stands at, if any. */
  private spotInReach(): Spot | null {
    const p = this.curr;
    if (!p.grounded) return null;
    return (
      this.spots.find(
        (spot) =>
          !spot.touch && !this.flags.has(spot.id) && (spot.needs === undefined || this.flags.has(spot.needs)) &&
          Math.abs(spot.at.x - p.x) <= SPOT_REACH && Math.abs(spot.at.y - p.y) < 1,
      ) ?? null
    );
  }

  /**
   * One step for the falling drops. They keep time by the step count, so the rhythm is the same on every
   * device. A drop that lands on Elof knocks him over; on *Lugnt* it misses him while he moves.
   */
  private rain(): void {
    const drips = this.chapter.drips ?? [];
    for (const [i, drip] of drips.entries()) {
      const every = Math.max(1, Math.round(drip.every / STEP));
      const since = this.steps - Math.round(drip.first / STEP);
      // Steps left until the next drop lands: 0 means now.
      const left = (every - (((since % every) + every) % every)) % every;
      const until = left * STEP;
      const state = this.drips[i]!;
      state.shadow = until <= DROP_WARNING ? 1 - until / DROP_WARNING : 0;
      state.height = until <= DROP_FALL ? DROP_FROM * (until / DROP_FALL) ** 1.6 : -1;
      if (left !== 0 || this.state.kind !== 'free') continue;
      const p = this.curr;
      const under = Math.abs(p.x - drip.at.x) <= DROP_RADIUS && p.y > drip.at.y - 0.3 && p.y < drip.at.y + 1.5;
      if (!under || (this.options.gentle && Math.abs(p.vx) > 0.5)) continue;
      this.knocks++;
      this.carry(true);
      this.verb = null;
      this.state = { kind: 'down', x: p.x, y: p.y, t: 0 };
    }
  }

  /** One step of lying where the drop knocked him over. Then he is up again, with everything he had. */
  private lie(state: { x: number; y: number; t: number }): void {
    state.t = Math.min(1, state.t + STEP / DOWN_TIME);
    this.place(state.x, state.y);
    if (state.t >= 1) this.release(state.y);
  }

  /** The ids of the things on rails that are where they belong: what a save keeps of the puzzles. */
  get placed(): string[] {
    return this.movers.filter((m) => m.stop === m.def.stops.length - 1 && m.t >= 1).map((m) => m.def.id);
  }

  /** One step for the things on rails: they slide to their stops, and the unfinished ones go home when he leaves. */
  private moveMovers(): void {
    for (const [i, mover] of this.movers.entries()) {
      const last = mover.def.stops.length - 1;
      // A helper's hands: it goes to where it belongs as soon as its flag is set.
      if (mover.def.on !== undefined && mover.t >= 1 && mover.stop < last && this.flags.has(mover.def.on)) {
        mover.from = mover.stop;
        mover.stop = last;
        mover.t = 0;
      }
      // Local reset (plan §4.5): not yet where it belongs, at rest, and Elof far away.
      if (mover.t >= 1 && mover.stop > 0 && mover.stop < last && Math.abs(this.curr.x - mover.x) > MOVER_RESET) {
        mover.from = mover.stop;
        mover.stop = 0;
        mover.t = 0;
      }
      if (mover.t >= 1) continue;
      mover.t = Math.min(1, mover.t + STEP / MOVE_TIME);
      // In place for good: the chapter can build on it.
      if (mover.t >= 1 && mover.stop === last) this.flags.add(`placed:${mover.def.id}`);
      const a = mover.def.stops[mover.from]!;
      const b = mover.def.stops[mover.stop]!;
      // It starts with a will and settles softly: a little past its stop, and back.
      const k = mover.t;
      const eased = 1 - (1 - k) ** 3 + Math.sin(Math.PI * k) * 0.06 * k;
      mover.x = mix(a.x, b.x, eased);
      mover.y = mix(a.y, b.y, eased);
      this.moverBodies[i]!.setTransform(new Vec2(mover.x, mover.y), 0);
    }
  }

  /** The thing on a rail that Använd would move now, by pushing or by the lace. */
  private moverFor(verb: 'push' | 'pull'): MoverState | null {
    const p = this.curr;
    for (const mover of this.movers) {
      const def = mover.def;
      if (def.verb !== verb || def.on !== undefined || mover.t < 1 || mover.stop >= def.stops.length - 1) continue;
      if (def.needs !== undefined && !this.flags.has(def.needs)) continue;
      const next = def.stops[mover.stop + 1]!;
      const way = Math.sign(next.x - mover.x) || 1;
      if (verb === 'pull') {
        // The ring is in reach of the lace, and the pull brings the thing towards him.
        const ring = def.ring ?? { x: 0, y: def.height };
        const near = Math.hypot(mover.x + ring.x - p.x, mover.y + ring.y - (p.y + ELOF_HEIGHT / 2)) <= LACE_REACH;
        // A thing that only rises or sinks can be pulled from either side.
        if (near && (next.x === mover.x || (p.x - mover.x) * way > 0)) return mover;
      } else if (p.grounded && Math.abs(p.y - mover.y) < 0.3) {
        // He stands beside it, on the side it is pushed from.
        const gap = (mover.x - p.x) * way - def.width / 2 - ELOF_HALF_WIDTH;
        if (gap > -0.05 && gap <= PUSH_REACH) return mover;
      }
    }
    return null;
  }

  /**
   * "Jag har fastnat": the glitter carries him back to the last big candy, or to the chapter's start.
   * Nothing he has found or done is undone (plan §4.5).
   */
  toCheckpoint(): void {
    if (this.state.kind === 'bubble') return;
    const to = this.checkpoints[this.checkpoint] ?? this.chapter.spawn;
    this.safe.x = to.x;
    this.safe.y = to.y;
    this.carry(true);
    this.state = { kind: 'bubble', fromX: this.curr.x, fromY: this.curr.y, t: 0 };
    this.curr = { ...this.curr, mode: 'bubble', bubble: Number.MIN_VALUE, verb: null, hook: null };
  }

  // --- taking hold --------------------------------------------------------------------------------------

  /** What he takes hold of this step, if anything, and what Använd would do. */
  private reach(input: StepInput): void {
    const p = this.curr;
    this.regrab = Math.max(0, this.regrab - STEP);
    const dir = Math.sign(input.x);

    // Använd near a hook: the lace flies to it and hooks on by itself, with no aiming (plan §4.2).
    const hook = this.hookInReach();
    // A thing to touch is used by coming close. One with a ride carries him off from the ground.
    for (const spot of this.spots) {
      if (!spot.touch || this.flags.has(spot.id) || (spot.needs !== undefined && !this.flags.has(spot.needs))) continue;
      if (Math.hypot(spot.at.x - p.x, spot.at.y - p.y) > TOUCH_REACH + 0.5) continue;
      const ride = spot.ride === undefined ? undefined : (this.chapter.rides ?? []).find((r) => r.id === spot.ride);
      if (ride && !p.grounded) continue;
      this.flags.add(spot.id);
      if (!ride) continue;
      this.carry(true);
      this.state = { kind: 'ride', ride, offset: 0, t: 0 };
      this.verb = null;
      this.word = null;
      return;
    }
    // Använd at the top of a hose: he slides down it.
    const usable = (c: Climb) => c.needs === undefined || this.flags.has(c.needs);
    const below = p.grounded ? this.climbs.find((c) => usable(c) && Math.abs(c.x - p.x) <= SLIDE_REACH && Math.abs(c.top - p.y) <= 0.25) : undefined;
    // Använd at a thing on a rail: Dra with the lace by its ring, or Knuffa from beside it.
    const pulled = hook ? null : this.moverFor('pull');
    const pushed = hook || pulled ? null : this.moverFor('push');
    const moved = pulled ?? pushed;
    // Använd at the ghost when it lets him come close (Ta!), and at a thing to turn, take or call.
    const grab = hook ? null : this.ghostInReach();
    const spot = hook || grab || moved ? null : this.spotInReach();
    this.verb = hook ? 'lace' : grab ? 'grab' : pulled ? 'pull' : pushed ? 'push' : spot ? spot.verb : below ? 'slide' : null;
    this.word = this.verb === spot?.verb ? (spot?.word ?? null) : null;
    if (hook && input.act) {
      this.throwLace(hook);
      return;
    }
    if ((grab || spot) && input.act) {
      this.flags.add(grab ?? spot!.id);
      this.verb = null;
      this.word = null;
      const ride = spot?.ride === undefined ? undefined : (this.chapter.rides ?? []).find((r) => r.id === spot.ride);
      if (ride) {
        this.carry(true);
        this.state = { kind: 'ride', ride, offset: 0, t: 0 };
      }
      return;
    }
    if (moved && input.act) {
      moved.from = moved.stop;
      moved.stop++;
      moved.t = 0;
      this.verb = null;
      return;
    }
    if (below && input.act) {
      this.carry(true);
      this.state = { kind: 'slide', climb: below, fromX: p.x, t: 0 };
      this.verb = null;
      return;
    }

    // Lätta hopp: at a marked edge the jump is made for him, and steered to where it lands.
    if (this.options.easyJumps && p.grounded && dir !== 0) {
      const reach = input.hop ? EASY_JUMP_STEER : EASY_JUMP_REACH;
      const jump = this.jumps.find((j) => j.dir === dir && Math.abs(j.at.y - p.y) < 0.3 && (j.at.x - p.x) * dir >= -0.05 && (j.at.x - p.x) * dir <= reach);
      const ready = jump && (jump.needs === undefined || this.placed.includes(jump.needs));
      if (jump && ready && (input.hop || Math.abs(p.vx) > WALK_SPEED * 0.5)) {
        this.flyTo(jump.land, Math.min(0.8, Math.max(0.45, Math.hypot(jump.land.x - p.x, jump.land.y - p.y) / 4.5)));
        return;
      }
    }

    // A hose: he takes hold when he walks into it, from either side, or pushes up where it hangs.
    if (this.regrab === 0 && (dir !== 0 || input.y > 0.5)) {
      const hose = this.climbs.find((c) => usable(c) && Math.abs(c.x - p.x) <= CLIMB_GRAB && p.y >= c.bottom - 0.05 && p.y <= c.top - 0.3);
      if (hose) {
        this.carry(true);
        this.state = { kind: 'climb', climb: hose };
        this.verb = null;
        return;
      }
    }

    // A ledge within reach of his hands: he pulls himself up.
    if (dir !== 0) {
      const ledge = this.ledgeAhead(dir);
      if (ledge) {
        this.carry(true);
        this.state = { kind: 'ledge', fromX: p.x, fromY: p.y, toX: ledge.x, toY: ledge.y, t: 0 };
        this.verb = null;
      }
    }
  }

  /** The nearest hook above him that the lace reaches in a straight line. */
  private hookInReach(): Hook | null {
    const x = this.curr.x;
    const y = this.curr.y + ELOF_HEIGHT / 2;
    let nearest: Hook | null = null;
    let reach = LACE_REACH;
    for (const hook of this.hooks) {
      const distance = Math.hypot(hook.x - x, hook.y - y);
      if (hook.y < y + 0.4 || distance > reach || this.cast(x, y, hook.x, hook.y)) continue;
      nearest = hook;
      reach = distance;
    }
    return nearest;
  }

  /** The lace hooks on, and he hangs from it: what he was doing along the swing's arc, he keeps doing. */
  private throwLace(hook: Hook): void {
    const p = this.curr;
    const dx = p.x - hook.x;
    const dy = hook.y - (p.y + ELOF_HEIGHT / 2);
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dx, dy);
    const speed = (p.vx * Math.cos(angle) + p.vy * Math.sin(angle)) / length;
    this.carry(true);
    this.verb = null;
    this.state = { kind: 'swing', hook, length, to: Math.max(SWING_MIN_LENGTH, Math.min(length, hook.length)), angle, speed, letGo: -1 };
  }

  /**
   * The top of a ledge he can pull himself onto: a floor ahead whose top is more than a step and at most
   * LEDGE_REACH above his feet, with an upright side right in front of him and room to stand on it.
   */
  private ledgeAhead(dir: number): Vec | null {
    const p = this.curr;
    const x = p.x + dir * (ELOF_HALF_WIDTH + 0.14);
    const top = this.cast(x, p.y + LEDGE_REACH + 0.02, x, p.y + STEP_HEIGHT + 0.01);
    if (!top || top.ny < 0.7) return null;
    // A slope rises ahead of him too, but its side is not upright: that is walked, not climbed.
    const side = this.cast(p.x, top.y - 0.05, x, top.y - 0.05);
    if (!side || Math.abs(side.nx) < UPRIGHT) return null;
    if (this.cast(x, top.y + 0.05, x, top.y + ELOF_HEIGHT)) return null;
    return { x: side.x + dir * (ELOF_HALF_WIDTH + 0.04), y: top.y };
  }

  // --- on his own feet ----------------------------------------------------------------------------------

  private walk(input: StepInput): void {
    const v = this.body.getLinearVelocity();
    if (this.leaving && (this.footContacts === 0 || v.y <= 0.05)) this.leaving = false;
    const floor = this.footContacts > 0 && !this.leaving ? this.footing() : null;
    const grounded = floor !== null && floor.ny >= WALKABLE;
    // Along the ground he stands on; level in the air.
    const tx = grounded ? floor.ny : 1;
    const ty = grounded ? -floor.nx : 0;
    let speed = grounded ? v.x * tx + v.y * ty : v.x;
    let vy = v.y;

    this.coyote = grounded ? COYOTE_TIME : Math.max(0, this.coyote - STEP);
    this.buffer = input.hop ? JUMP_BUFFER : Math.max(0, this.buffer - STEP);

    // Walk and run. Speeding up takes RUN_AFTER; slowing down and turning take STOP_WITHIN.
    const want = Math.max(-1, Math.min(1, input.x));
    const push = Math.abs(want);
    const dir = Math.sign(want);
    let target = 0;
    if (push >= RUN_DEFLECTION) target = dir * RUN_SPEED;
    else if (push > 0) target = dir * WALK_SPEED * Math.min(1, push / WALK_DEFLECTION);
    const speedingUp = target !== 0 && (speed === 0 || Math.sign(speed) === dir) && Math.abs(target) > Math.abs(speed);
    const change = (speedingUp ? RUN_SPEED / RUN_AFTER : RUN_SPEED / STOP_WITHIN) * STEP;
    // Thrown by a swing, he keeps its speed in the air unless he pushes against it.
    if (this.thrown && grounded) this.thrown = false;
    const carried = this.thrown && dir !== -Math.sign(speed);
    if (!carried) speed = speed < target ? Math.min(target, speed + change) : Math.max(target, speed - change);
    if (dir !== 0) this.facing = dir as 1 | -1;
    // A gust in the open takes him back the way he came, whatever the stick says. On *Lugnt* it only slows him.
    if (this.windy) speed = this.options.gentle ? Math.min(speed, RUN_SPEED * GUST_SLOW) : -GUST_SPEED;

    // Walking, he never steps over an edge with a longer drop than he can land: he stops there and looks
    // down. At a run he goes over, so a running jump needs no special care (plan §4.2).
    this.atEdge = false;
    if (grounded && dir !== 0 && (this.options.stopAtEdges || Math.abs(speed) <= WALK_SPEED + 1e-6)) {
      const ahead = this.curr.x + dir * (ELOF_HALF_WIDTH + EDGE_REACH);
      if (this.curr.y - this.groundBelow(ahead, this.curr.y) > FALL_LIMIT) {
        this.atEdge = true;
        if (speed * dir > 0) speed = 0;
      }
    }

    let jump = 0;
    // Hoppa: a press is remembered for JUMP_BUFFER, and the ground for COYOTE_TIME.
    if (this.buffer > 0 && this.coyote > 0) {
      jump = JUMP_SPEED;
      this.rising = true;
      this.cut = false;
      this.buffer = 0;
      this.coyote = 0;
    } else if (grounded && dir !== 0) {
      // A step of up to STEP_HEIGHT is walked over: a small lift takes him onto it.
      const lift = this.stepAhead(dir);
      if (lift > 0) jump = Math.sqrt(2 * GRAVITY * (lift + 0.05));
    }
    if (this.rising && vy <= 0 && jump === 0) this.rising = false;
    // Letting go on the way up makes him heavier, so a tap is a hop. Pressing again doesn't undo it.
    if (this.rising && !input.hopHeld) this.cut = true;
    this.body.setGravityScale(this.rising && this.cut ? HOP_GRAVITY_SCALE : 1);

    if (jump > 0) {
      this.leaving = true;
      this.body.setLinearVelocity(new Vec2(speed * tx, jump));
    } else if (grounded) {
      // Along the slope, with this step's pull down the slope taken off, so that he stands still on it.
      const along = speed + GRAVITY * STEP * ty;
      this.body.setLinearVelocity(new Vec2(along * tx, along * ty));
    } else {
      // Ground too steep to stand on is slid down, gently.
      if (floor !== null) vy = Math.max(vy, -STEEP_SLIDE_SPEED);
      this.body.setLinearVelocity(new Vec2(speed, Math.max(vy, -MAX_FALL_SPEED)));
    }
  }

  /** How high the step right in front of him is, or 0 when there is none he can walk over. */
  private stepAhead(dir: number): number {
    const p = this.curr;
    const riser = this.cast(p.x, p.y + 0.04, p.x + dir * (ELOF_HALF_WIDTH + 0.07), p.y + 0.04);
    if (!riser || Math.abs(riser.nx) < UPRIGHT) return 0;
    const x = riser.x + dir * 0.04;
    const top = this.cast(x, p.y + STEP_HEIGHT + 0.01, x, p.y + 0.01);
    return top && top.ny >= 0.7 ? top.y - p.y : 0;
  }

  /** Whether he stands, after a step: feet on ground he can stand on, and not just taking off from it. */
  private standing(): boolean {
    if (this.footContacts === 0 || this.leaving) return false;
    return this.footing().ny >= WALKABLE;
  }

  /** The normal of the ground under him: the most floor-like thing his body rests on. */
  private footing(): { nx: number; ny: number } {
    let nx = 0;
    let ny = -1;
    for (let edge = this.body.getContactList(); edge; edge = edge.next) {
      const contact = edge.contact;
      if (!contact.isTouching()) continue;
      const a = contact.getFixtureA();
      const b = contact.getFixtureB();
      if (a !== this.shape && b !== this.shape) continue;
      const manifold = contact.getWorldManifold(null);
      if (!manifold) continue;
      // The manifold's normal points from A to B. The one wanted points from the ground to him.
      const sign = b === this.shape ? 1 : -1;
      if (manifold.normal.y * sign > ny) {
        nx = manifold.normal.x * sign;
        ny = manifold.normal.y * sign;
      }
    }
    if (ny > 0) return { nx, ny };
    // His feet are within reach of the ground but his body isn't resting on it yet.
    const p = this.body.getPosition();
    const hit = this.cast(p.x, p.y + 0.3, p.x, p.y - 0.3);
    return hit ? { nx: hit.nx, ny: hit.ny } : { nx: 0, ny: 1 };
  }

  // --- carried ------------------------------------------------------------------------------------------

  /** Hands him over to a path, or back to the physics. */
  private carry(on: boolean): void {
    this.shape.setSensor(on);
    this.body.setGravityScale(on ? 0 : 1);
    this.body.setLinearVelocity(new Vec2(0, 0));
    this.rising = false;
    this.cut = false;
    this.leaving = false;
    this.thrown = false;
    this.buffer = 0;
    this.coyote = 0;
    this.atEdge = false;
  }

  private place(x: number, y: number): void {
    this.body.setTransform(new Vec2(x, y + SKIN), 0);
    this.body.setLinearVelocity(new Vec2(0, 0));
  }

  /** Back on his own feet at a place where he can stand. */
  private release(y: number): void {
    this.carry(false);
    this.state = { kind: 'free' };
    this.standY = y;
    this.fallTop = y;
  }

  /** The glitter gathers round him in the air, before he lands (plan §4.2). */
  private startBubble(): void {
    this.chooseSafe();
    this.carry(true);
    this.state = { kind: 'bubble', fromX: this.curr.x, fromY: this.curr.y, t: 0 };
    this.bubbles++;
    // The state says so from this very step, though the bubble has not moved him yet.
    this.curr = { ...this.curr, mode: 'bubble', bubble: Number.MIN_VALUE };
  }

  /** One step inside the bubble: it floats him to the safe ground in a soft arc, and the stick does nothing. */
  private float(bubble: { fromX: number; fromY: number; t: number }): void {
    bubble.t = Math.min(1, bubble.t + STEP / BUBBLE_TIME);
    const k = smooth(bubble.t);
    this.place(mix(bubble.fromX, this.safe.x, k), mix(bubble.fromY, this.safe.y, k) + Math.sin(Math.PI * k) * BUBBLE_LIFT);
    if (bubble.t < 1) return;
    this.release(this.safe.y);
    // What the ring holds lies beyond the place he fell from. It starts again from here.
    this.stoodFor = 0;
    this.last.x = this.safe.x;
    this.last.y = this.safe.y;
  }

  /** One step of pulling himself up a ledge: first up to its top, then onto it (plan §4.2: 0.4 s). */
  private haul(ledge: { fromX: number; fromY: number; toX: number; toY: number; t: number }): void {
    ledge.t = Math.min(1, ledge.t + STEP / LEDGE_TIME);
    const up = smooth(Math.min(1, ledge.t / 0.6));
    const over = smooth(Math.max(0, (ledge.t - 0.45) / 0.55));
    this.place(mix(ledge.fromX, ledge.toX, over), mix(ledge.fromY, ledge.toY, up));
    if (ledge.t >= 1) this.release(ledge.toY);
  }

  /**
   * One step on a hose. Any push except down climbs up, because children hold "forward"; Hoppa jumps off.
   * At the top he steps onto the ledge, if the hose has one there.
   */
  private climb(state: { climb: Climb }, input: StepInput): void {
    const c = state.climb;
    const p = this.body.getPosition();
    let y = p.y - SKIN;
    const dir = Math.sign(input.x);
    if (dir !== 0) this.facing = dir as 1 | -1;

    if (input.hop) {
      // Off the hose, the way he pushes: a jump he can still hold or cut short.
      this.release(y);
      this.regrab = REGRAB_AFTER;
      this.rising = true;
      this.leaving = true;
      this.fallTop = y;
      this.body.setLinearVelocity(new Vec2(dir * RUN_SPEED * 0.7, JUMP_SPEED * 0.85));
      return;
    }

    const down = input.y < -0.5;
    const up = !down && (Math.abs(input.x) > 0.3 || input.y > 0.3);
    if (up) y = Math.min(c.top, y + CLIMB_SPEED * STEP);
    if (down) y = Math.max(c.bottom, y - CLIMB_SPEED * STEP);
    this.place(c.x, y);

    if (down && y <= c.bottom) {
      // Down on the ground again: he lets go.
      this.release(c.bottom);
      this.regrab = REGRAB_AFTER;
    } else if (up && y >= c.top && c.exit) {
      this.state = { kind: 'ledge', fromX: c.x, fromY: c.top, toX: c.x + c.exit * CLIMB_EXIT, toY: c.top, t: 0.45 };
    }
  }

  /** One step of sliding down a hose from its top, which takes SLIDE_TIME whatever its length (plan §4.2). */
  private slide(state: { climb: Climb; fromX: number; t: number }): void {
    const c = state.climb;
    state.t = Math.min(1, state.t + STEP / SLIDE_TIME);
    // He steps over to the hose first, and then goes down it.
    const over = smooth(Math.min(1, state.t / 0.2));
    const down = smooth(Math.max(0, (state.t - 0.15) / 0.85));
    this.place(mix(state.fromX, c.x, over), mix(c.top, c.bottom, down));
    if (state.t < 1) return;
    this.release(c.bottom);
    this.regrab = REGRAB_AFTER;
  }

  /**
   * One step on the lace: a pendulum under the hook.
   * - On *Äventyr* he pumps it: pushing the way he swings adds to the swing, as on a playground swing, up
   *   to full height. Hoppa lets go, and he flies on along the arc.
   * - With *Hjälp med svingen* it pumps itself, and Hoppa is held until the next forward top of the swing;
   *   the flight from there is steered to the hook's landing.
   * - Up and down climb the lace.
   */
  private swing(s: { hook: Hook; length: number; to: number; angle: number; speed: number; letGo: number }, input: StepInput): void {
    const hook = s.hook;
    const help = this.options.swingHelp === true;
    const forward = hook.land ? Math.sign(hook.land.x - hook.x) || 1 : this.facing;

    if (input.y > 0.5) s.to = Math.max(SWING_MIN_LENGTH, s.to - CLIMB_SPEED * STEP);
    if (input.y < -0.5) s.to = Math.min(hook.length, s.to + CLIMB_SPEED * STEP);
    s.length = s.length > s.to ? Math.max(s.to, s.length - LACE_REEL * STEP) : s.to;

    const moving = Math.abs(s.speed) > 0.05 ? Math.sign(s.speed) : 0;
    const push = help ? moving || forward : Math.sign(input.x);
    if (!help && push !== 0) this.facing = push as 1 | -1;
    const energy = 0.5 * (s.length * s.speed) ** 2 + GRAVITY * s.length * (1 - Math.cos(s.angle));
    const full = GRAVITY * s.length * (1 - Math.cos(SWING_MAX));
    let turn = -(GRAVITY / s.length) * Math.sin(s.angle);
    if (push !== 0 && energy < full && (moving === 0 || moving === push)) turn += (push * (help ? SWING_PUMP_HELP : SWING_PUMP)) / s.length;
    s.speed = (s.speed + turn * STEP) * (1 - SWING_DAMP * STEP);

    // Where the swing would take his middle. Something in the way sends him back the other way, softly.
    const from = this.body.getPosition();
    const angle = s.angle + s.speed * STEP;
    let x = hook.x + s.length * Math.sin(angle);
    let y = hook.y - s.length * Math.cos(angle) - ELOF_HEIGHT / 2;
    if (this.cast(from.x, from.y - SKIN + ELOF_HEIGHT / 2, x, y + ELOF_HEIGHT / 2)) {
      s.speed *= -0.3;
      x = hook.x + s.length * Math.sin(s.angle);
      y = hook.y - s.length * Math.cos(s.angle) - ELOF_HEIGHT / 2;
    } else {
      s.angle = angle;
    }
    this.place(x, y);

    if (input.hop && s.letGo < 0) s.letGo = 0;
    else if (s.letGo >= 0) s.letGo += STEP;
    if (s.letGo < 0) return;

    if (help && hook.land) {
      // Held until he is at the top of the swing on the landing's side, about to swing back.
      const atTop = s.angle * forward > 0.25 && s.speed * forward <= 0;
      if (!atTop && s.letGo < SWING_HOLD_MAX) return;
      this.facing = forward as 1 | -1;
      this.flyTo(hook.land, SWING_FLIGHT);
      return;
    }
    // He lets go, and flies on the way the swing was taking him.
    const along = s.length * s.speed;
    this.release(y);
    this.thrown = true;
    this.body.setLinearVelocity(new Vec2(along * Math.cos(s.angle), along * Math.sin(s.angle)));
  }

  /** Starts a steered flight from where he is to a landing: the arc of a throw that ends there after `time`. */
  private flyTo(land: Vec, time: number): void {
    const from = this.body.getPosition();
    const x = from.x;
    const y = from.y - SKIN;
    this.carry(true);
    this.verb = null;
    this.state = {
      kind: 'fly', fromX: x, fromY: y, toX: land.x, toY: land.y, time, t: 0,
      vx: (land.x - x) / time,
      vy: (land.y - y) / time + 0.5 * GRAVITY * time,
    };
  }

  /** One step of a steered flight, from a swing or from a marked edge with *Lätta hopp*. */
  private fly(state: { fromX: number; fromY: number; vx: number; vy: number; toX: number; toY: number; time: number; t: number }): void {
    state.t = Math.min(1, state.t + STEP / state.time);
    const time = state.t * state.time;
    if (state.t < 1) {
      this.place(state.fromX + state.vx * time, state.fromY + state.vy * time - 0.5 * GRAVITY * time * time);
      return;
    }
    this.place(state.toX, state.toY);
    this.release(state.toY);
  }

  // --- what follows from where he is --------------------------------------------------------------------

  /** Remembers where he stands on solid ground, and measures the fall while he doesn't stand. */
  private remember(): void {
    const p = this.curr;
    if (!p.grounded) {
      this.fallTop = Math.max(this.fallTop, p.y);
      if (this.fallTop - p.y > FALL_LIMIT) this.startBubble();
      return;
    }
    this.standY = p.y;
    this.fallTop = p.y;
    // A soft tussock is no place to be put back on: the bubble takes him to the last firm ground.
    if (this.tussocks.some((t) => this.isOn(t))) return;
    // Solid ground has to be under both his sides. A corner he only clips on the way down is not a place
    // to be put back on.
    const solid = (x: number) => Math.abs(this.groundBelow(x, p.y) - p.y) < 0.25;
    if (!solid(p.x - ELOF_HALF_WIDTH) || !solid(p.x + ELOF_HALF_WIDTH)) return;
    this.last.x = p.x;
    this.last.y = p.y;
    const slot = this.stood[this.stoodAt]!;
    slot.x = p.x;
    slot.y = p.y;
    this.stoodAt = (this.stoodAt + 1) % SAFE_STEPS;
    this.stoodFor++;
  }

  /**
   * Where the bubble takes him. The plan's rule is "the last spot where he stood for 0.5 s": here, where he
   * stood half a second of ground time ago, which gives a runner room for a new run-up. A child who hops
   * along is hardly ever on the ground, so that spot can lie far back or down in a ditch; then he goes to
   * where he last stood instead.
   */
  private chooseSafe(): void {
    // Once the ring has gone round, the slot about to be written is the oldest: SAFE_STEPS steps ago.
    const back = this.stoodFor >= SAFE_STEPS ? this.stood[this.stoodAt]! : this.last;
    const near = Math.abs(back.x - this.last.x) <= SAFE_REACH && Math.abs(back.y - this.last.y) <= 0.3;
    const to = near ? back : this.last;
    this.safe.x = to.x;
    this.safe.y = to.y;
  }

  /** Puts every trail candy within reach of Elof's middle in the bag. */
  private collect(): void {
    const x = this.curr.x;
    const y = this.curr.y + ELOF_HEIGHT / 2;
    const candy = this.chapter.candy;
    for (let i = 0; i < candy.length; i++) {
      if (this.collected[i]) continue;
      const c = candy[i]!;
      // A candy the ghost has yet to drop isn't there.
      if (c.after !== undefined && !this.flags.has(c.after)) continue;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 > CANDY_MAGNET ** 2) continue;
      this.collected[i] = true;
      this.candyCount++;
    }
    // A big candy further on than the last one becomes the place he comes back to.
    for (let i = this.checkpoint + 1; i < this.checkpoints.length; i++) {
      const c = this.checkpoints[i]!;
      if ((c.x - x) ** 2 + (c.y + ELOF_HEIGHT / 2 - y) ** 2 <= CHECKPOINT_REACH ** 2) this.checkpoint = i;
    }
  }

  private countFoot(contact: Contact, change: 1 | -1): void {
    const a = contact.getFixtureA();
    const b = contact.getFixtureB();
    const foot = a.getUserData() === FOOT ? a : b.getUserData() === FOOT ? b : null;
    if (!foot) return;
    const other = foot === a ? b : a;
    if (other.isSensor() || other.getBody() === this.body) return;
    this.footContacts += change;
  }

  private read(grounded: boolean): PlayerState {
    const p = this.body.getPosition();
    const y = p.y - SKIN;
    const state = this.state;
    // On the lace the body is carried, so its speed is the swing's own.
    const along = state.kind === 'swing' ? state.length * state.speed : 0;
    const v = state.kind === 'swing' ? { x: along * Math.cos(state.angle), y: along * Math.sin(state.angle) } : this.body.getLinearVelocity();
    const mode: Mode = state.kind;
    const t = state.kind === 'free' || state.kind === 'climb' || state.kind === 'swing' ? 0 : state.t;
    return {
      x: p.x, y, vx: v.x, vy: v.y, facing: this.facing, grounded, groundY: this.groundBelow(p.x, y),
      standY: this.standY, atEdge: this.atEdge, bubble: state.kind === 'bubble' ? Math.max(t, Number.MIN_VALUE) : 0,
      mode, t, verb: mode === 'free' ? this.verb : null,
      hook: state.kind === 'swing' ? { x: state.hook.x, y: state.hook.y } : null,
      word: mode === 'free' ? this.word : null,
    };
  }

  /** The nearest thing a ray from one point to another meets, leaving out sensors and Elof himself. */
  private cast(x1: number, y1: number, x2: number, y2: number): Hit | null {
    let hit: Hit | null = null;
    this.world.rayCast(new Vec2(x1, y1), new Vec2(x2, y2), (fixture, point, normal, fraction) => {
      if (fixture.isSensor() || fixture.getBody() === this.body) return -1;
      hit = { x: point.x, y: point.y, nx: normal.x, ny: normal.y };
      return fraction;
    });
    return hit;
  }

  /** The ground's height straight below a point, or far below it when there is none. */
  private groundBelow(x: number, y: number): number {
    const hit = this.cast(x, y + 0.5, x, y - 20);
    return hit ? hit.y : y - 20;
  }
}
