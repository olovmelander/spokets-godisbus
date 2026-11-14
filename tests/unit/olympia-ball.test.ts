import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BALL, createBallPath, rollBalls, type BallPose } from '../../src/content/aventyr2/big-ball';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { idle } from '../sim/drive';

/**
 * Olympia's big football as it is drawn (src/content/aventyr2/big-ball.ts; Olov, 14 November 2026: "När Elof rullar och
 * sparkar på den stora bollen ska den rulla snyggt och naturligt."). The simulation is played for real: he kicks it
 * down from the kit table, on along the turf and into the flooded goalmouth, and the ball's drawn way is read each
 * step. It was drawn as the simulation moves it: not turning, down through the table's edge and through the turf's.
 */
describe("Olympia's big ball", () => {
  const def = olympia.movers!.find((mover) => mover.id === 'ol-ball')!;
  const radius = Math.min(def.width, def.height) / 2;
  const table = olympia.ledges!.find((ledge) => def.stops.some((stop) => Math.abs(stop.y - ledge.y) < 0.02 && Math.abs(stop.x - ledge.x) <= ledge.width / 2))!;
  const tableEnd = table.x + table.width / 2;
  const puddle = olympia.water![0]!;

  interface Frame { t: number; x: number; simY: number; pose: BallPose; moving: boolean }

  /** Plays the four kicks at a frame rate, with or without motion, and gives every frame of each. */
  function kicks(fps = 60, still = false): Frame[][] {
    // He starts up on the table, behind the ball.
    const sim = new Sim({ ...olympia, spawn: { x: table.x - 0.6, y: table.y + 0.01 } }, {}, { flags: ['scene:card', 'beat:ol:puddle'] });
    const mover = sim.movers.find((m) => m.def.id === 'ol-ball')!;
    const path = createBallPath(def, olympia);
    const every = Math.round(1 / fps / STEP);
    const dt = every * STEP;
    path.step(mover, 0, still);
    const out: Frame[][] = [];
    for (let kick = 0; kick < def.stops.length - 1; kick++) {
      // Up to it, until Sparka is offered; then one press, and time for it to come to rest.
      for (let i = 0; i < 20 / STEP && sim.curr.verb !== 'push'; i++) {
        sim.step({ ...idle, x: 0.6 });
        if (i % every === 0) path.step(mover, dt, still);
      }
      expect(sim.curr.verb, `kick ${kick + 1} is offered`).toBe('push');
      for (let i = 0; i < 40; i++) path.step(mover, dt, still);
      sim.step({ ...idle, act: true });
      const frames: Frame[] = [];
      let was = { x: mover.x, y: mover.y };
      for (let i = 0; i < Math.round(3 * fps); i++) {
        for (let k = 0; k < every; k++) sim.step(idle);
        const moving = Math.abs(mover.x - was.x) > 1e-7 || Math.abs(mover.y - was.y) > 1e-7;
        was = { x: mover.x, y: mover.y };
        frames.push({ t: (i + 1) * dt, x: mover.x, simY: mover.y, pose: { ...path.step(mover, dt, still) }, moving });
      }
      out.push(frames);
    }
    expect(sim.flags.has('placed:ol-ball')).toBe(true);
    return out;
  }

  it('turns by exactly the way it goes, on the table, in the air and on the turf, and comes to rest where the simulation has it', () => {
    for (const fps of [30, 60, 144]) {
      for (const [k, frames] of kicks(fps).entries()) {
        let before = { x: def.stops[k]!.x, angle: frames[0]!.pose.angle + (frames[0]!.x - def.stops[k]!.x) / radius, wet: false, grounded: true };
        let rolled = 0;
        for (const f of frames) {
          // Its angle is the distance over its radius, about the axis across its travel; to the right is clockwise. It
          // slid without turning at all.
          if (!f.pose.wet && !before.wet) {
            expect(f.pose.angle - before.angle, `kick ${k + 1} at ${fps} Hz, x ${f.x.toFixed(2)}`).toBeCloseTo(-(f.x - before.x) / radius, 6);
          }
          const grounded = !f.pose.airborne && !f.pose.wet;
          if (grounded && before.grounded) rolled += Math.abs(f.x - before.x);
          before = { x: f.x, angle: f.pose.angle, wet: f.pose.wet, grounded };
        }
        const end = frames[frames.length - 1]!;
        expect(end.pose.y, `kick ${k + 1} at ${fps} Hz ends where the simulation has it`).toBe(def.stops[k + 1]!.y);
        expect(end.x).toBeCloseTo(def.stops[k + 1]!.x, 6);
        // It rolls most of every push along the turf, and some of the way before and after a flight.
        const way = def.stops[k + 1]!.x - def.stops[k]!.x;
        if (def.stops[k + 1]!.y === def.stops[k]!.y) expect(rolled).toBeGreaterThan(way * 0.98);
        else expect(rolled).toBeGreaterThan(0.3);
      }
    }
  });

  it('turns all the time it goes on, and has turned as far as it has gone by the end of each kick', () => {
    for (const [k, frames] of kicks().entries()) {
      for (const [i, f] of frames.entries()) {
        if (i === 0 || f.x - frames[i - 1]!.x < 0.005) continue;
        expect(f.pose.angle, `kick ${k + 1} at x ${f.x.toFixed(2)}`).toBeLessThan(frames[i - 1]!.pose.angle);
      }
      const turned = def.stops[k]!.x / -radius - frames[frames.length - 1]!.pose.angle + def.stops[0]!.x / radius;
      const way = def.stops[k + 1]!.x - def.stops[k]!.x;
      // What rolling the whole way would be, and in the water a little more as it turns on: no sliding, no spinning on the spot.
      if (k < 3) expect(turned).toBeCloseTo(way / radius, 5);
      else {
        expect(turned).toBeGreaterThan(way / radius * 0.7);
        expect(turned).toBeLessThan(way / radius * 1.5);
      }
    }
  });

  it('is never drawn through the table or the turf, and lies on them until their edge', () => {
    for (const fps of [30, 60, 144]) {
      for (const [k, frames] of kicks(fps).entries()) {
        for (const f of frames) {
          if (f.pose.floor !== null) expect(f.pose.y, `kick ${k + 1} at ${fps} Hz, x ${f.x.toFixed(2)}`).toBeGreaterThanOrEqual(f.pose.floor - 1e-6);
          // Over the puddle it is at or under the turf's level only: nothing of it is in the turf beside the water.
          if (f.x < puddle.from) expect(f.pose.y).toBeGreaterThanOrEqual(-1e-6);
        }
      }
      // Down from the table: on the table (or over it) until its middle has passed the table's end.
      for (const f of kicks(fps)[0]!) if (f.x <= tableEnd) expect(f.pose.y).toBeGreaterThanOrEqual(table.y - 1e-6);
    }
  });

  it('kicked from the table it flies in an arc, comes down on the turf, bounces lower each time and rolls out', () => {
    const frames = kicks(120)[0]!;
    // Up off the table first: an arc, not a slide off its edge.
    const top = Math.max(...frames.map((f) => f.pose.y));
    expect(top).toBeGreaterThan(table.y + 0.08);
    expect(top).toBeLessThan(table.y + 0.6);
    // Each time it comes down on the turf: where, and how high it had been since the last.
    const landings: { x: number; high: number }[] = [];
    let high = 0, wasUp = false;
    for (const f of frames) {
      high = Math.max(high, f.pose.y);
      const up = f.pose.y > 1e-4;
      if (wasUp && !up) { landings.push({ x: f.x, high }); high = 0; }
      wasUp = up;
    }
    expect(landings.length).toBeGreaterThanOrEqual(2);
    expect(landings.length).toBeLessThanOrEqual(4);
    expect(landings[0]!.x).toBeGreaterThan(tableEnd + radius);
    for (let i = 1; i < landings.length; i++) expect(landings[i]!.high).toBeLessThan(landings[i - 1]!.high * 0.5);
    // It flattens a little as it lands, and is round again at rest.
    expect(Math.max(...frames.map((f) => f.pose.squash))).toBeGreaterThan(0.03);
    expect(Math.max(...frames.map((f) => f.pose.squash))).toBeLessThanOrEqual(BALL.squash);
    expect(frames[frames.length - 1]!.pose.squash).toBeLessThan(0.002);
    // Then it rolls: the last of the way is on the turf, turning.
    const rolling = frames.filter((f) => f.moving && !f.pose.airborne && f.x > landings[landings.length - 1]!.x);
    expect(rolling.length).toBeGreaterThan(5);
  });

  it('kicked into the puddle it rolls to the edge, drops in with a splash, goes under, bobs up and floats where he steps on it', () => {
    const frames = kicks(120)[3]!;
    const edge = frames.find((f) => f.x > puddle.from)!;
    // On the turf all the way to the edge.
    for (const f of frames) if (f.x <= puddle.from) expect(f.pose.y).toBe(0);
    expect(edge.pose.floor).toBeNull();
    const splash = frames.find((f) => f.pose.splash)!;
    expect(splash.pose.splash!.y).toBe(puddle.y);
    expect(splash.pose.splash!.x).toBeGreaterThan(puddle.from);
    // Under where it floats, and up over it again, before it lies still: at most its own height under the water.
    const rest = def.stops[def.stops.length - 1]!.y;
    const low = Math.min(...frames.map((f) => f.pose.y));
    expect(low).toBeLessThan(rest - 0.1);
    expect(low).toBeGreaterThan(rest - 0.9);
    const after = frames.slice(frames.findIndex((f) => f.pose.y === low));
    expect(Math.max(...after.map((f) => f.pose.y))).toBeGreaterThan(rest + 0.03);
    // Still within a second and a half of the kick: he is not yet at the edge.
    for (const f of frames.filter((one) => one.t > 1.5)) expect(Math.abs(f.pose.y - rest)).toBeLessThan(0.03);
    expect(frames[frames.length - 1]!.pose.y).toBe(rest);
    expect(frames[frames.length - 1]!.pose.wet).toBe(true);
  });

  it('with less motion it goes the same way without a hop or a bounce, still turning, and never through the table', () => {
    const all = kicks(60, true);
    for (const [k, frames] of all.entries()) {
      let before = frames[0]!;
      for (const f of frames.slice(1)) {
        expect(f.pose.angle - before.pose.angle).toBeCloseTo(-(f.x - before.x) / radius, 6);
        expect(f.pose.squash).toBe(0);
        before = f;
      }
      expect(frames[frames.length - 1]!.pose.y, `kick ${k + 1}`).toBe(def.stops[k + 1]!.y);
    }
    const down = all[0]!;
    expect(Math.max(...down.map((f) => f.pose.y))).toBeLessThanOrEqual(table.y + 1e-6);
    for (const f of down) if (f.x <= tableEnd) expect(f.pose.y).toBeGreaterThan(table.y - 0.02);
    // Down to the turf without going under it or up again.
    for (let i = 1; i < down.length; i++) expect(down[i]!.pose.y).toBeLessThanOrEqual(down[i - 1]!.pose.y + 1e-6);
  });

  it('a game taken up with the ball afloat finds it there, in the water, turned as far as it has come', () => {
    const path = createBallPath(def, olympia);
    const last = def.stops[def.stops.length - 1]!;
    const pose = path.step(last, 0);
    expect(pose.y).toBe(last.y);
    expect(pose.wet).toBe(true);
    expect(pose.splash).toBeNull();
    expect(pose.angle).toBeCloseTo(-(last.x - def.stops[0]!.x) / radius, 6);
    // And it stays there.
    for (let i = 0; i < 120; i++) expect(path.step(last, 1 / 60).y).toBe(last.y);
  });

  it('sent back to the table when he has gone away, it rolls back the way it came', () => {
    const path = createBallPath(def, olympia);
    const [home, turf] = def.stops;
    path.step(turf!, 0);
    let angle = path.step(turf!, 1 / 60).angle;
    for (let i = 1; i <= 60; i++) {
      const k = i / 60;
      const pose = path.step({ x: turf!.x + (home!.x - turf!.x) * k, y: turf!.y + (home!.y - turf!.y) * k }, 1 / 60);
      expect(pose.angle).toBeGreaterThan(angle);
      angle = pose.angle;
    }
    for (let i = 0; i < 30; i++) path.step(home!, 1 / 60);
    expect(path.step(home!, 1 / 60).y).toBe(home!.y);
  });

  it("the wind's small balls turn by the way they roll, each its angle its distance over its radius", () => {
    const roller = olympia.rollers![0]!;
    const balls = new InstancedMesh(new SphereGeometry(1, 6, 4), new MeshBasicMaterial(), 3);
    const place = new Matrix4();
    const facingOf = (i: number) => {
      const [at, facing, size] = [new Vector3(), new Quaternion(), new Vector3()];
      balls.getMatrixAt(i, place);
      place.decompose(at, facing, size);
      return { at, facing, size };
    };
    /** Where the view puts them: on the turf at x, as big as they are, turned as the view turns them. */
    const put = (xs: number[]) => {
      for (const [i, x] of xs.entries()) {
        const r = i === 2 ? 0 : roller.radius;
        balls.setMatrixAt(i, place.compose(new Vector3(x, roller.radius, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -7 - i), new Vector3(r, r, r * 1.9)));
      }
      rollBalls(balls);
    };
    put([20, 31, 40]);
    const before = [facingOf(0), facingOf(1)];
    const way = 0.4;
    put([20 + way, 31 + way, 40]);
    for (const [i, was] of before.entries()) {
      const now = facingOf(i);
      // Where it is and how big is the view's; only its turning is changed.
      expect(now.at.x).toBeCloseTo([20, 31][i]! + way, 5);
      expect(now.size.x).toBeCloseTo(roller.radius, 5);
      const turned = now.facing.clone().multiply(was.facing.clone().invert());
      const angle = 2 * Math.atan2(turned.z, turned.w);
      // To the right is clockwise, about the axis across its travel.
      expect(angle).toBeCloseTo(-way / roller.radius, 4);
      expect(Math.hypot(turned.x, turned.y)).toBeLessThan(1e-6);
    }
    // No two lie the same way round, and one that waits (no size) is left alone.
    expect(before[0]!.facing.angleTo(before[1]!.facing)).toBeGreaterThan(0.2);
    balls.getMatrixAt(2, place);
    expect(Math.hypot(place.elements[0]!, place.elements[1]!, place.elements[2]!)).toBe(0);
  });

  it('is a ball of the same size as the thing he pushes', () => {
    expect(createBallPath(def, olympia).radius).toBe(0.75);
    expect(def.look).toBe('football');
  });
});
