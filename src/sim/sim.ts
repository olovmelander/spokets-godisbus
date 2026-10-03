import { BoxShape, ChainShape, Settings, Vec2, World, type Body, type Contact, type Fixture } from 'planck';
import {
  BUBBLE_LIFT, BUBBLE_TIME, CANDY_MAGNET, CLIMB_EXIT, CLIMB_GRAB, CLIMB_SPEED, COYOTE_TIME, EDGE_REACH, ELOF_HALF_WIDTH, ELOF_HEIGHT,
  FALL_LIMIT, GRAVITY, HOP_GRAVITY_SCALE, JUMP_BUFFER, JUMP_SPEED, LEDGE_REACH, LEDGE_TIME, MAX_FALL_SPEED, REGRAB_AFTER,
  RUN_AFTER, RUN_DEFLECTION, RUN_SPEED, SAFE_AFTER, SAFE_REACH, SLIDE_REACH, SLIDE_TIME, STEEP_SLIDE_SPEED, STEP,
  STEP_HEIGHT, STOP_WITHIN, WALK_DEFLECTION, WALK_SPEED,
} from './constants';
import type { ChapterData, Climb, Mode, PlayerState, StepInput, Vec, Verb } from './types';

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
  | { kind: 'slide'; climb: Climb; fromX: number; t: number };

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The pure simulation: no three, no DOM, no clock. One call to step() is 1/120 s.
 * It holds the ground and a greybox Elof with the moves of plan §4.2: he walks, runs and jumps, walks over
 * low steps and up slopes, pulls himself up ledges, climbs hoses and slides down them, collects the trail
 * candy, and is carried back by the glitter bubble when he falls too far.
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
  prev: PlayerState;
  curr: PlayerState;

  private readonly body: Body;
  /** His body. While he is carried it is a sensor, so he passes through the ground. */
  private readonly shape: Fixture;
  private readonly climbs: Climb[];
  private state: State = { kind: 'free' };
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

  constructor(readonly chapter: ChapterData) {
    this.world = new World({ gravity: new Vec2(0, -GRAVITY), allowSleep: false });

    const ground = this.world.createBody();
    ground.createFixture({
      shape: new ChainShape(chapter.ground.map((p) => new Vec2(p.x, p.y)), false),
      friction: 0,
    });

    this.body = this.world.createBody({
      type: 'dynamic',
      position: new Vec2(chapter.spawn.x, chapter.spawn.y + SKIN),
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

    this.world.on('begin-contact', (c) => this.countFoot(c, 1));
    this.world.on('end-contact', (c) => this.countFoot(c, -1));

    this.climbs = chapter.climbs ?? [];
    this.collected = chapter.candy.map(() => false);
    this.standY = chapter.spawn.y;
    this.fallTop = chapter.spawn.y;
    this.safe = { x: chapter.spawn.x, y: chapter.spawn.y };
    this.last = { x: chapter.spawn.x, y: chapter.spawn.y };
    this.stood = Array.from({ length: SAFE_STEPS }, () => ({ x: chapter.spawn.x, y: chapter.spawn.y }));
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
    else this.slide(state);

    this.world.step(STEP);
    this.steps++;

    if (this.state.kind === 'free') {
      this.curr = this.read(this.standing());
      this.remember();
    } else {
      this.curr = this.read(false);
    }
    // The bubble only carries. Everywhere else, candy he comes near is his: up a hose too.
    if (this.state.kind !== 'bubble') this.collect();
    if (this.curr.x >= this.chapter.goalX) this.flags.add('goal');
  }

  // --- taking hold --------------------------------------------------------------------------------------

  /** What he takes hold of this step, if anything, and what Använd would do. */
  private reach(input: StepInput): void {
    const p = this.curr;
    this.regrab = Math.max(0, this.regrab - STEP);
    const dir = Math.sign(input.x);

    // Använd at the top of a hose: he slides down it (plan §4.2).
    const below = p.grounded ? this.climbs.find((c) => Math.abs(c.x - p.x) <= SLIDE_REACH && Math.abs(c.top - p.y) <= 0.25) : undefined;
    this.verb = below ? 'slide' : null;
    if (below && input.act) {
      this.carry(true);
      this.state = { kind: 'slide', climb: below, fromX: p.x, t: 0 };
      this.verb = null;
      return;
    }

    // A hose: he takes hold when he walks into it, from either side, or pushes up where it hangs.
    if (this.regrab === 0 && (dir !== 0 || input.y > 0.5)) {
      const hose = this.climbs.find((c) => Math.abs(c.x - p.x) <= CLIMB_GRAB && p.y >= c.bottom - 0.05 && p.y <= c.top - 0.3);
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
    speed = speed < target ? Math.min(target, speed + change) : Math.max(target, speed - change);
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Walking, he never steps over an edge with a longer drop than he can land: he stops there and looks
    // down. At a run he goes over, so a running jump needs no special care (plan §4.2).
    this.atEdge = false;
    if (grounded && dir !== 0 && Math.abs(speed) <= WALK_SPEED + 1e-6) {
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
      if ((c.x - x) ** 2 + (c.y - y) ** 2 > CANDY_MAGNET ** 2) continue;
      this.collected[i] = true;
      this.candyCount++;
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
    const v = this.body.getLinearVelocity();
    const y = p.y - SKIN;
    const state = this.state;
    const mode: Mode = state.kind;
    const t = state.kind === 'bubble' || state.kind === 'ledge' || state.kind === 'slide' ? state.t : 0;
    return {
      x: p.x, y, vx: v.x, vy: v.y, facing: this.facing, grounded, groundY: this.groundBelow(p.x, y),
      standY: this.standY, atEdge: this.atEdge, bubble: state.kind === 'bubble' ? Math.max(t, Number.MIN_VALUE) : 0,
      mode, t, verb: mode === 'free' ? this.verb : null,
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
