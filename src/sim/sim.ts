import { BoxShape, ChainShape, Settings, Vec2, World, type Body, type Contact, type Fixture } from 'planck';
import {
  BUBBLE_LIFT, BUBBLE_TIME, CANDY_MAGNET, COYOTE_TIME, EDGE_REACH, ELOF_HALF_WIDTH, ELOF_HEIGHT, FALL_LIMIT, GRAVITY,
  HOP_GRAVITY_SCALE, JUMP_BUFFER, JUMP_SPEED, MAX_FALL_SPEED, RUN_AFTER, RUN_DEFLECTION, RUN_SPEED, SAFE_AFTER, SAFE_REACH, STEP,
  STOP_WITHIN, WALK_DEFLECTION, WALK_SPEED,
} from './constants';
import type { ChapterData, PlayerState, StepInput, Vec } from './types';

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

/**
 * The pure simulation: no three, no DOM, no clock. One call to step() is 1/120 s.
 * It holds the ground, a greybox Elof who walks, runs and jumps, the trail candy he collects, and the
 * glitter bubble that carries him back when he falls too far.
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
  /** His body. While the bubble carries him it is a sensor, so he passes through the ground. */
  private readonly shape: Fixture;
  private footContacts = 0;
  private coyote = 0;
  private buffer = 0;
  private rising = false;
  private cut = false;
  private facing: 1 | -1 = 1;
  private atEdge = false;
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
  private bubble: { fromX: number; fromY: number; t: number } | null = null;

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
    if (this.bubble) {
      this.float(this.bubble);
      return;
    }
    const v = this.body.getLinearVelocity();
    let vx = v.x;
    let vy = v.y;
    const grounded = this.footContacts > 0 && vy <= 0.05;

    this.coyote = grounded ? COYOTE_TIME : Math.max(0, this.coyote - STEP);
    this.buffer = input.hop ? JUMP_BUFFER : Math.max(0, this.buffer - STEP);

    // Walk and run. Speeding up takes RUN_AFTER; slowing down and turning take STOP_WITHIN.
    const want = Math.max(-1, Math.min(1, input.x));
    const push = Math.abs(want);
    const dir = Math.sign(want);
    let target = 0;
    if (push >= RUN_DEFLECTION) target = dir * RUN_SPEED;
    else if (push > 0) target = dir * WALK_SPEED * Math.min(1, push / WALK_DEFLECTION);
    const speedingUp = target !== 0 && (vx === 0 || Math.sign(vx) === dir) && Math.abs(target) > Math.abs(vx);
    const change = (speedingUp ? RUN_SPEED / RUN_AFTER : RUN_SPEED / STOP_WITHIN) * STEP;
    vx = vx < target ? Math.min(target, vx + change) : Math.max(target, vx - change);
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Walking, he never steps over an edge with a longer drop than he can land: he stops there and looks
    // down. At a run he goes over, so a running jump needs no special care (plan §4.2).
    this.atEdge = false;
    if (grounded && dir !== 0 && Math.abs(vx) <= WALK_SPEED + 1e-6) {
      const ahead = this.curr.x + dir * (ELOF_HALF_WIDTH + EDGE_REACH);
      if (this.curr.y - this.groundBelow(ahead, this.curr.y) > FALL_LIMIT) {
        this.atEdge = true;
        if (vx * dir > 0) vx = 0;
      }
    }

    // Hoppa: a press is remembered for JUMP_BUFFER, and the ground for COYOTE_TIME.
    if (this.buffer > 0 && this.coyote > 0) {
      vy = JUMP_SPEED;
      this.rising = true;
      this.cut = false;
      this.buffer = 0;
      this.coyote = 0;
    }
    if (this.rising && vy <= 0) this.rising = false;
    // Letting go on the way up makes him heavier, so a tap is a hop. Pressing again doesn't undo it.
    if (this.rising && !input.hopHeld) this.cut = true;
    this.body.setGravityScale(this.rising && this.cut ? HOP_GRAVITY_SCALE : 1);

    this.body.setLinearVelocity(new Vec2(vx, Math.max(vy, -MAX_FALL_SPEED)));
    this.world.step(STEP);
    this.steps++;

    this.curr = this.read(this.footContacts > 0 && this.body.getLinearVelocity().y <= 0.05);
    this.remember();
    this.collect();
    if (this.curr.x >= this.chapter.goalX) this.flags.add('goal');
  }

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

  /** The glitter gathers round him in the air, before he lands (plan §4.2). */
  private startBubble(): void {
    this.chooseSafe();
    this.bubble = { fromX: this.curr.x, fromY: this.curr.y, t: 0 };
    this.bubbles++;
    // The state says so from this very step, though the bubble has not moved him yet.
    this.curr = { ...this.curr, bubble: Number.MIN_VALUE };
    this.shape.setSensor(true);
    this.body.setGravityScale(0);
    this.body.setLinearVelocity(new Vec2(0, 0));
    this.rising = false;
    this.cut = false;
    this.buffer = 0;
    this.coyote = 0;
  }

  /** One step inside the bubble: it floats him to the safe ground in a soft arc, and the stick does nothing. */
  private float(bubble: { fromX: number; fromY: number; t: number }): void {
    bubble.t = Math.min(1, bubble.t + STEP / BUBBLE_TIME);
    const k = bubble.t * bubble.t * (3 - 2 * bubble.t);
    const x = bubble.fromX + (this.safe.x - bubble.fromX) * k;
    const y = bubble.fromY + (this.safe.y - bubble.fromY) * k + Math.sin(Math.PI * k) * BUBBLE_LIFT;
    this.body.setTransform(new Vec2(x, y + SKIN), 0);
    this.body.setLinearVelocity(new Vec2(0, 0));
    this.world.step(STEP);
    this.steps++;
    if (bubble.t >= 1) {
      this.bubble = null;
      this.shape.setSensor(false);
      this.body.setGravityScale(1);
      this.standY = this.safe.y;
      this.fallTop = this.safe.y;
      // What the ring holds lies beyond the place he fell from. It starts again from here.
      this.stoodFor = 0;
      this.last.x = this.safe.x;
      this.last.y = this.safe.y;
    }
    this.curr = this.read(false, bubble.t);
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

  private read(grounded: boolean, bubble = 0): PlayerState {
    const p = this.body.getPosition();
    const v = this.body.getLinearVelocity();
    const y = p.y - SKIN;
    return {
      x: p.x, y, vx: v.x, vy: v.y, facing: this.facing, grounded, groundY: this.groundBelow(p.x, y),
      standY: this.standY, atEdge: this.atEdge, bubble,
    };
  }

  /** The ground's height straight below a point, or far below it when there is none. */
  private groundBelow(x: number, y: number): number {
    let hit = y - 20;
    this.world.rayCast(new Vec2(x, y + 0.5), new Vec2(x, y - 20), (fixture, point, _normal, fraction) => {
      if (fixture.isSensor() || fixture.getBody() === this.body) return -1;
      hit = point.y;
      return fraction;
    });
    return hit;
  }
}
