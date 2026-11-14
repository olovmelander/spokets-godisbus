import { Group, Matrix4, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type InstancedMesh } from 'three';
import { footballGeometry, footballMaterial } from '../../render/football';
import type { ChapterData, Mover } from '../../sim/types';

/**
 * Olympia's big football, the one he kicks down from the kit table and on into the flooded goalmouth (Olov, 14 November
 * 2026: "När Elof rullar och sparkar på den stora bollen ska den rulla snyggt och naturligt."). The simulation takes it
 * from stop to stop along a straight line, in a moment: drawn so, it slid without turning, went down through the
 * table's edge, and sank through the turf's edge into the water. Here it is a ball:
 *
 * - **It rolls.** While it lies on something it turns by exactly the way it goes: its angle is the distance over its
 *   radius, about the axis across its travel, forwards and back, fast and slow, down to rest.
 * - **It is kicked.** Off the table it flies in a low arc, turning as fast as it goes, comes down on the turf, bounces once
 *   or twice with a little squash, and rolls out to where the simulation has it.
 * - **It stays on what is under it:** level on the table to its edge, on the turf to the puddle's edge, never through
 *   either; and a soft shadow lies under it where it meets them.
 * - **It floats.** Over the puddle's edge it drops in with a splash, goes under, bobs up and settles where the
 *   simulation floats it, its top level with the turf for him to step on, turning a little on the water.
 *
 * Picture only: it is drawn at the simulation's x always, and at rest exactly where the simulation has it, so that what
 * he pushes against and stands on is what is seen. With less motion it goes the same way without the hop, the bounce,
 * the squash and the splash's drops.
 */

/** How it moves, in EL and seconds. One EL is 15 cm, so the earth's pull is 65; a wet artificial turf gives little back. */
export const BALL = {
  gravity: 62,
  /** How much of its speed it keeps in a bounce, and how hard it has to land to bounce at all. */
  bounce: 0.48,
  bounceOver: 2.2,
  /** A kick off a height lifts it a little: how fast it leaves, and how long and how far down a kick has to go for that. */
  hop: 4.2,
  hopLong: 3,
  hopDown: 0.3,
  /**
   * In the water: how hard it is pushed back to where it floats, how the water slows it (little at first, so that it
   * goes under and bobs up; more after `settles` seconds, so that it lies still before he is there), and how fast its
   * spin dies.
   */
  float: 85,
  drag: 3.6,
  dragStill: 13,
  settles: 0.55,
  spinDrag: 2.6,
  /** How far it flattens on landing, at most. */
  squash: 0.11,
  /** With less motion, how fast it comes to the height it should have, a second. */
  calm: 22,
} as const;

/** The outline's height at x (src/render/dressing/kit.ts `heightAt`, without the dressing's kit). */
function groundAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!, b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** Where the ball is drawn, a frame. */
export interface BallPose {
  /** The height of its lowest point. */
  y: number;
  /** How far it has turned about the axis across its travel, in radians: less as it goes right. */
  angle: number;
  /** How much flatter than round it is now: 0 none. */
  squash: number;
  /** What it lies on or is over: that top's height, or null over water. */
  floor: number | null;
  /** In the air: over what is under it, and not in the water. */
  airborne: boolean;
  /** In the water. */
  wet: boolean;
  /** Where and how long ago it went into the water, or null. */
  splash: { x: number; y: number; since: number } | null;
}

/**
 * The ball's way, without a picture: given where the simulation has it each frame, where it is drawn. For the tests as
 * for the view.
 */
export function createBallPath(def: Mover, chapter: ChapterData) {
  const radius = Math.min(def.width, def.height) / 2;
  const stops = def.stops;
  const last = stops[stops.length - 1]!;
  // What it lies on at a stop, other than the ground: the kit table.
  const tables = (chapter.ledges ?? []).filter((ledge) => stops.some((stop) => Math.abs(stop.y - ledge.y) < 0.02 && Math.abs(stop.x - ledge.x) <= ledge.width / 2));
  const poolAt = (x: number) => (chapter.water ?? []).find((pool) => x >= pool.from && x <= pool.to && groundAt(chapter, x) < pool.y - 0.2);
  const solidAt = (x: number) => Math.max(groundAt(chapter, x), ...tables.filter((ledge) => Math.abs(x - ledge.x) <= ledge.width / 2).map((ledge) => ledge.y));
  /** Where it floats in a pool: where the simulation floats it, if that is here. */
  const floatIn = (pool: { from: number; to: number; y: number }) => (last.x >= pool.from && last.x <= pool.to ? last.y : pool.y - def.height * 0.7);
  const stopAt = (x: number, y: number) => stops.findIndex((stop) => Math.abs(stop.x - x) < 1e-4 && Math.abs(stop.y - y) < 1e-4);

  let started = false;
  let sim = { x: 0, y: 0 };
  let y = 0, vy = 0, angle = 0, spin = 0, squash = 0, squashV = 0;
  let wet = false, airborne = false, rested = -1, returning = false;
  let splash: { x: number; y: number; since: number } | null = null;

  function snap(at: { x: number; y: number }): void {
    const pool = poolAt(at.x);
    y = at.y;
    vy = spin = squash = squashV = 0;
    wet = !!pool && at.y < pool.y;
    airborne = returning = false;
    splash = null;
    // A game taken up with it on its way has it turned as far as it has come.
    angle = -(at.x - stops[0]!.x) / radius;
  }

  return {
    radius,
    step(at: { x: number; y: number }, dt: number, still = false): BallPose {
      // A jump of more than a few lengths is a restore, not a move (src/render/mover-motion.ts).
      if (!started || Math.hypot(at.x - sim.x, at.y - sim.y) > 3) {
        started = true;
        sim = { x: at.x, y: at.y };
        snap(at);
        rested = stopAt(at.x, at.y);
      }
      const dx = at.x - sim.x;
      const moving = Math.abs(dx) > 1e-7 || Math.abs(at.y - sim.y) > 1e-7;
      const pool = poolAt(at.x);
      const solid = solidAt(at.x);
      if (splash) splash.since += dt;
      // Sent back towards where it lay (he went away): it is carried there, uphill.
      if (rested >= 0 && moving) returning = dx < 0;
      if (dt > 0) {
        if (still || returning) {
          // Carried the simulation's way, on whatever is under it: no hop, no bounce.
          const want = pool ? Math.max(at.y, floatIn(pool)) : Math.max(at.y, solid);
          y += (want - y) * (1 - Math.exp(-BALL.calm * dt));
          if (!moving && Math.abs(want - y) < 0.004) y = want;
          vy = 0;
          squash = squashV = 0;
          const inWater = !!pool && y < pool.y;
          if (inWater && !wet) splash = { x: at.x, y: pool!.y, since: 0 };
          wet = inWater;
          airborne = !wet && y > solid + 0.02;
          angle -= dx / radius;
          spin = 0;
        } else {
          // A kick off a height lifts it: it leaves what it lay on at once.
          const from = rested >= 0 && moving ? stops[rested] : undefined;
          const to = from && dx > 0 ? stops[rested + 1] : undefined;
          if (from && to && to.x - from.x >= BALL.hopLong && from.y - to.y >= BALL.hopDown) {
            vy = BALL.hop;
            airborne = true;
          }
          // In small steps, so that a bounce is the same at every frame rate.
          const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
          const h = dt / steps;
          for (let i = 0; i < steps; i++) {
            if (pool && (wet || y < pool.y)) {
              if (!wet) {
                wet = true;
                splash = { x: at.x, y: pool.y, since: 0 };
              }
              airborne = false;
              const since = (splash?.since ?? 9) - dt + (i + 1) * h;
              const drag = BALL.drag + (BALL.dragStill - BALL.drag) * Math.min(1, Math.max(0, (since - BALL.settles) / 0.4));
              vy += (-BALL.float * (y - floatIn(pool)) - drag * vy) * h;
              y += vy * h;
            } else if (pool || y > solid + 1e-5 || vy > 0) {
              wet = false;
              airborne = true;
              vy -= BALL.gravity * h;
              y += vy * h;
              if (!pool && y <= solid) {
                const hit = -vy;
                y = solid;
                if (hit > BALL.bounceOver) {
                  vy = hit * BALL.bounce;
                  squashV += Math.min(3.4, hit * 0.3);
                } else {
                  vy = 0;
                  airborne = false;
                }
              }
            } else {
              wet = false;
              airborne = false;
              y = solid;
              vy = 0;
            }
            squashV += (-squash * 520 - squashV * 26) * h;
            squash += squashV * h;
          }
          // On something or in the air it turns by the way it goes; in the water it turns on a little, slower and slower.
          if (wet) {
            angle += spin * dt;
            spin *= Math.exp(-BALL.spinDrag * dt);
          } else {
            angle -= dx / radius;
            spin = -(dx / dt) / radius;
          }
          // At rest it is where the simulation has it, to the hair.
          if (!moving && !airborne && Math.abs(y - at.y) < 0.006 && Math.abs(vy) < 0.05) {
            y = at.y;
            vy = 0;
            if (Math.abs(spin) < 0.05) spin = 0;
          }
        }
      }
      if (!moving) {
        const here = stopAt(at.x, at.y);
        if (here >= 0) { rested = here; returning = false; }
      } else if (rested >= 0 && stopAt(at.x, at.y) !== rested) rested = -1;
      sim = { x: at.x, y: at.y };
      return {
        y, angle, squash: Math.max(0, Math.min(BALL.squash, squash)), floor: pool ? null : solid, airborne, wet,
        splash: splash && splash.since < 3 ? splash : null,
      };
    },
  };
}

/** A soft shadow where the ball meets what it lies on: as the figures' (src/render/character-shadows.ts), on every tier. */
function contactShade(): Mesh {
  const material = new ShaderMaterial({
    uniforms: { fade: { value: 1 }, contact: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */ `uniform float fade;uniform float contact;varying vec2 vUv;
      void main(){float r=length(vUv*2.0-1.0);if(r>=1.0)discard;
        float blob=.34*pow(1.0-r,1.5)*fade;
        float core=.34*exp(-14.0*r*r)*contact;
        gl_FragColor=vec4(vec3(.018),blob+core);}`,
    transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), material);
  mesh.name = 'ball-shade';
  mesh.renderOrder = 1;
  return mesh;
}

/** How the ball lies before it has rolled: a dark panel a little off its middle, so that its turning is seen at once. */
const LIES = new Quaternion().setFromAxisAngle(new Vector3(1, 0.35, 0).normalize(), 0.5);
const ACROSS = new Vector3(0, 0, 1);
const ROCK = new Vector3(1, 0, 0);
const turned = new Quaternion();
const rocked = new Quaternion();

/**
 * The big ball as a thing on a rail (src/render/extensions.ts, `PACK.movers`): its origin is the middle of its bottom,
 * where the simulation has it, and the ball is drawn from there. `world`: the chapter being played, whether the picture
 * keeps still, and a splash for when it goes into the water (./render.ts, `waterSplash`).
 */
export function bigBall(mover: Mover, world: {
  chapter: () => ChapterData | null;
  still: () => boolean;
  splash: { group: Group; update(since: number, still: boolean): void };
}): Group {
  const outer = new Group();
  const radius = Math.min(mover.width, mover.height) / 2;
  const holder = new Group();
  holder.name = 'big-ball';
  const ball = new Mesh(footballGeometry(), footballMaterial());
  ball.scale.setScalar(radius);
  ball.position.y = radius;
  ball.quaternion.copy(LIES);
  holder.add(ball);
  const shade = contactShade();
  shade.visible = false;
  outer.add(holder, shade, world.splash.group);
  let path: ReturnType<typeof createBallPath> | null = null;
  let before = -1;
  let rockFor = 0;
  outer.userData.tick = (clock: number) => {
    const mesh = outer.parent;
    const chapter = world.chapter();
    if (!mesh || !chapter) return;
    path ??= createBallPath(mover, chapter);
    const dt = before < 0 ? 0 : Math.min(0.05, Math.max(0, clock - before));
    before = clock;
    const still = world.still();
    const sx = mesh.position.x, sy = mesh.position.y;
    const pose = path.step({ x: sx, y: sy }, dt, still);
    // Its weight is its own here: not the lean and squash of a thing slid on a rail (src/render/mover-motion.ts).
    mesh.rotation.z = 0;
    mesh.scale.set(1, 1, 1);
    holder.position.set(0, pose.y - sy, 0);
    // Flattened about where it touches, and as much wider.
    holder.scale.set(1 + pose.squash * 0.5, 1 - pose.squash, 1 + pose.squash * 0.5);
    // Afloat and at rest, it turns a little to and fro on the water.
    rockFor = pose.wet && !still ? Math.min(1, rockFor + dt / 1.5) : 0;
    turned.setFromAxisAngle(ACROSS, pose.angle + rockFor * 0.05 * Math.sin(clock * 1.3));
    rocked.setFromAxisAngle(ROCK, rockFor * 0.04 * Math.sin(clock * 0.9 + 1));
    ball.quaternion.copy(rocked).multiply(turned).multiply(LIES);
    // Its shadow lies on what is under it, wider and fainter the higher the ball is over it; none on the water.
    const over = pose.floor === null ? Infinity : Math.max(0, pose.y - pose.floor);
    const fade = pose.floor === null ? 0 : Math.max(0, 1 - over / 2.4);
    shade.visible = fade > 0.01;
    if (shade.visible) {
      shade.position.set(0, pose.floor! + 0.085 - sy, 0);
      shade.scale.setScalar(radius * 2.5 * (1 + over * 0.3));
      const uniforms = (shade.material as ShaderMaterial).uniforms;
      uniforms.fade!.value = fade;
      uniforms.contact!.value = Math.max(0, 1 - over / 0.25);
    }
    world.splash.group.position.set((pose.splash?.x ?? sx) - sx, (pose.splash?.y ?? sy) - sy, 0.2);
    world.splash.update(pose.splash ? pose.splash.since : -1, still);
  };
  return outer;
}

const placed = new Matrix4();
const at = new Vector3();
const size = new Vector3();
const facing = new Quaternion();
const each = new Quaternion();

/**
 * The small balls the wind bowls across the pitch (the chapter's rollers, one instanced mesh the view places each
 * frame): each turned by the way it has come, its angle its distance over its radius, as the big ball's is. They turned
 * at one rate whatever their speed, a third too slow for it, so they slid as they rolled. Each lies its own way round.
 */
export function rollBalls(balls: InstancedMesh): void {
  for (let i = 0; i < balls.count; i++) {
    balls.getMatrixAt(i, placed);
    // One that waits has no size, and is left as it is (a matrix of no size cannot be taken apart).
    if (Math.hypot(placed.elements[0]!, placed.elements[1]!, placed.elements[2]!) < 1e-6) continue;
    placed.decompose(at, facing, size);
    facing.setFromAxisAngle(ACROSS, -at.x / size.x).multiply(each.setFromAxisAngle(ROCK, 0.6 + i * 1.7));
    balls.setMatrixAt(i, placed.compose(at, facing, size));
  }
  balls.instanceMatrix.needsUpdate = true;
}
