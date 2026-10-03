import { BoxShape, ChainShape, Settings, Vec2, World, type Body, type Contact } from 'planck';
import {
  CANDY_MAGNET, COYOTE_TIME, ELOF_HALF_WIDTH, ELOF_HEIGHT, GRAVITY, HOP_GRAVITY_SCALE, JUMP_BUFFER, JUMP_SPEED, MAX_FALL_SPEED,
  RUN_AFTER, RUN_DEFLECTION, RUN_SPEED, STEP, STOP_WITHIN, WALK_DEFLECTION, WALK_SPEED,
} from './constants';
import type { ChapterData, PlayerState, StepInput } from './types';

// 1 EL is the length unit. This scales Box2D's tolerances to a hero who is one unit tall (plan §6.4).
Settings.lengthUnitsPerMeter = 0.2;

const FOOT = 'foot';
/**
 * Box2D keeps a thin skin between shapes, so a body rests this far above the ground.
 * Elof's reported y has it taken off: y is 0 when he stands on ground at height 0.
 */
const SKIN = 2 * Settings.polygonRadius - Settings.linearSlop * Settings.lengthUnitsPerMeter;

/**
 * The pure simulation: no three, no DOM, no clock. One call to step() is 1/120 s.
 * It holds the ground, a greybox Elof who walks, runs and jumps, and the trail candy he collects.
 */
export class Sim {
  readonly world: World;
  readonly flags = new Set<string>();
  steps = 0;
  /** Trail candy in the bag, by its place in chapter.candy. Nothing ever leaves the bag (plan §4.3). */
  readonly collected: boolean[];
  candyCount = 0;
  prev: PlayerState;
  curr: PlayerState;

  private readonly body: Body;
  private footContacts = 0;
  private coyote = 0;
  private buffer = 0;
  private rising = false;
  private cut = false;
  private facing: 1 | -1 = 1;

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
    this.body.createFixture({
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
    this.curr = this.read(false);
    this.prev = this.curr;
  }

  step(input: StepInput): void {
    this.prev = this.curr;
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
    this.collect();
    if (this.curr.x >= this.chapter.goalX) this.flags.add('goal');
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
    return { x: p.x, y, vx: v.x, vy: v.y, facing: this.facing, grounded, groundY: this.groundBelow(p.x, y) };
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
