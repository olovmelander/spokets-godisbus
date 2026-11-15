import { Color, type Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { RAFT_SIZE, raftShape, riverRaft } from '../../src/content/aventyr2/river-raft';
import type { Afoot, FloatFrame, Floats } from '../../src/render/floating-ride';
import { cameraIntent } from '../../src/sim/camera-intent';
import { rideX, rideY } from '../../src/sim/ride-path';
import type { PlayerState } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

/**
 * Älven's raft. Olov, 14 November 2026: "Det ser ut som om flotten i början svävar ovanför vattnet i stället för att
 * flyta på det." The ride's arc rose 0.44 over the bank, and the raft was drawn under his feet all along it: its logs'
 * undersides were a quarter of an EL over the river in the middle, and at both ends it lay up on the bank.
 */
describe('Älven\'s raft', () => {
  const ride = alven.rides!.find((r) => r.id === 'al:raft')!;
  const pool = alven.water!.find((w) => (ride.from.x + ride.to.x) / 2 > w.from && (ride.from.x + ride.to.x) / 2 < w.to)!;
  const half = RAFT_SIZE.long / 2;
  const rest = pool.from + RAFT_SIZE.gap + half;
  const land = pool.to - RAFT_SIZE.gap - half;

  /** The raft as the view has it, and a frame of it with him at `t` of the ride (or not on it). */
  function raft() {
    const group = riverRaft(() => alven);
    const floats = group.userData.floats as Floats;
    const afoot = group.userData.afoot as Afoot;
    const hull = group.getObjectByName('river-raft-logs') as Mesh;
    let clock = 0;
    const rings: number[] = [];
    const frame = (more: Partial<FloatFrame>, dt = 1 / 60): void => {
      clock += dt;
      floats({ ride, ridden: false, boarded: false, x: 5, y: 0, clock, dt, calm: false, surface: (x) => (x > pool.from && x < pool.to ? pool.y : null),
        ripple: (x) => { rings.push(x); }, ...more });
    };
    /** Its lowest and highest points now, and its two ends, in the chapter's own x and y. */
    const box = () => {
      hull.updateMatrixWorld(true);
      const at = hull.geometry.getAttribute('position');
      const p = new Vector3();
      let [low, high, left, right] = [Infinity, -Infinity, Infinity, -Infinity];
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(hull.matrixWorld);
        low = Math.min(low, p.y); high = Math.max(high, p.y); left = Math.min(left, p.x); right = Math.max(right, p.x);
      }
      return { low, high, left, right, deck: hull.position.y, x: hull.position.x };
    };
    return { group, frame, box, afoot, rings, hull };
  }

  it('keeps his feet at its deck, a hand over the river, all the way over the water: never in the air over it', () => {
    expect(ride.skim!.y).toBeCloseTo(pool.y + RAFT_SIZE.freeboard, 5);
    let over = 0;
    for (let t = 0; t <= 1.0001; t += 0.005) {
      const [x, y] = [rideX(ride, t), rideY(ride, t)];
      // Never under the deck, nor in the water.
      expect(y, `at ${x.toFixed(2)}`).toBeGreaterThanOrEqual(ride.skim!.y - 1e-6);
      if (x < rest || x > land) continue;
      over++;
      expect(y, `at ${x.toFixed(2)}`).toBeCloseTo(ride.skim!.y, 2);
    }
    expect(over).toBeGreaterThan(80);
    // And at its two ends he is on the banks' own ground.
    expect(rideY(ride, 0)).toBeCloseTo(heightAt(alven, ride.from.x), 5);
    expect(rideY(ride, 1)).toBeCloseTo(heightAt(alven, ride.to.x), 5);
    // He steps down onto it only past the first bank's edge, and is up at the gravel bank's height by its edge.
    for (let t = 0; t <= 1; t += 0.002) {
      const [x, y] = [rideX(ride, t), rideY(ride, t)];
      if (x <= pool.from) expect(y, `on the bank at ${x.toFixed(2)}`).toBeGreaterThan(heightAt(alven, x) - 0.04);
      if (x >= pool.to) expect(y, `on the gravel at ${x.toFixed(2)}`).toBeGreaterThan(heightAt(alven, x) - 0.04);
    }
  });

  it('lies in the water at the bank before he comes: its logs half under, none of it over the bank', () => {
    const r = raft();
    for (let i = 0; i < 120; i++) {
      r.frame({});
      const b = r.box();
      expect(b.low).toBeLessThan(pool.y - 0.1);
      expect(b.high).toBeGreaterThan(pool.y + 0.12);
      expect(b.left).toBeGreaterThan(pool.from);
      expect(b.right).toBeLessThan(pool.from + RAFT_SIZE.long + 0.6);
    }
    // The waterline is part-way up its logs: between a quarter and two thirds of them is under, as it bobs.
    const b = r.box();
    const logs = 0.4;
    expect((pool.y - (b.deck - logs)) / logs).toBeGreaterThan(0.25);
    expect((pool.y - (b.deck - logs)) / logs).toBeLessThan(0.67);
  });

  it('bobs and tilts on the water as it lies there, and lies still when the picture keeps still', () => {
    const r = raft();
    const heights: number[] = [];
    const tilts: number[] = [];
    for (let i = 0; i < 240; i++) { r.frame({}); heights.push(r.hull.position.y); tilts.push(r.hull.rotation.z); }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.03);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.12);
    expect(Math.max(...tilts) - Math.min(...tilts)).toBeGreaterThan(0.015);
    const still: number[] = [];
    for (let i = 0; i < 60; i++) { r.frame({ calm: true }); still.push(r.hull.position.y); }
    expect(Math.max(...still) - Math.min(...still)).toBeLessThan(1e-9);
  });

  it('dips under him as he steps on, with rings on the water, and carries him with its deck under his feet', () => {
    const r = raft();
    for (let i = 0; i < 60; i++) r.frame({});
    const light = r.box().deck;
    let lowest = Infinity;
    let afoot = 0;
    for (let t = 0; t <= 1; t += 1 / (ride.time * 60)) {
      const [x, y] = [rideX(ride, t), rideY(ride, t)];
      r.frame({ ridden: true, boarded: true, x, y });
      const b = r.box();
      // Always in the water, between the two banks.
      expect(b.left, `at ${x.toFixed(2)}`).toBeGreaterThan(pool.from);
      expect(b.right, `at ${x.toFixed(2)}`).toBeLessThan(pool.to);
      expect(b.low, `at ${x.toFixed(2)}`).toBeLessThan(pool.y - 0.08);
      if (r.afoot(x)) { afoot++; continue; }
      // It carries him: under him, its deck at his feet.
      expect(Math.abs(b.x - x), `at ${x.toFixed(2)}`).toBeLessThan(0.02);
      expect(Math.abs(b.deck - y), `at ${x.toFixed(2)}`).toBeLessThan(0.07);
      lowest = Math.min(lowest, b.deck);
    }
    // He goes on his own feet onto it and off it, a second or so each.
    expect(afoot).toBeGreaterThan(60);
    expect(afoot).toBeLessThan(ride.time * 60 * 0.6);
    // It lies lower with him on it than it did without.
    expect(lowest).toBeLessThan(light - 0.02);
    expect(r.rings.length).toBeGreaterThanOrEqual(2);
    expect(r.rings.some((x) => x < pool.from + RAFT_SIZE.long + 1)).toBe(true);
  });

  it('stays afloat at the gravel bank when he has landed, and lies at the first bank again if he is put back before it', () => {
    const r = raft();
    for (let t = 0; t <= 1; t += 1 / (ride.time * 60)) r.frame({ ridden: true, boarded: true, x: rideX(ride, t), y: rideY(ride, t) });
    for (let i = 0; i < 90; i++) r.frame({ boarded: true, x: ride.to.x + 3, y: ride.to.y });
    const b = r.box();
    expect(b.right).toBeLessThan(pool.to);
    expect(b.right).toBeGreaterThan(pool.to - 0.4);
    expect(b.low).toBeLessThan(pool.y - 0.1);
    // A game taken up past the raft has it there at once.
    const later = raft();
    later.frame({ boarded: true, x: 60, y: 0 });
    expect(later.box().x).toBeCloseTo(b.x, 5);
    // Back before it (the glitter bubble puts him at the outlet): it is at the outlet's bank.
    r.frame({ boarded: false, x: 4, y: 0 });
    expect(r.box().x).toBeCloseTo(rest, 5);
  });

  it('is wet and dark from the waterline down, and drier on top', () => {
    const shape = raftShape();
    const at = shape.getAttribute('position');
    const colour = shape.getAttribute('color');
    const c = new Color();
    let [wet, wetN, dry, dryN] = [0, 0, 0, 0];
    for (let i = 0; i < at.count; i++) {
      c.fromBufferAttribute(colour, i);
      const y = at.getY(i);
      // Its logs' bark only: not its pale sawn ends, poles and rope.
      if (c.r > 0.5) continue;
      if (y < -RAFT_SIZE.freeboard - 0.03) { wet += c.r + c.g + c.b; wetN++; }
      if (y > -0.05) { dry += c.r + c.g + c.b; dryN++; }
    }
    expect(wetN).toBeGreaterThan(100);
    expect(dryN).toBeGreaterThan(100);
    expect(wet / wetN).toBeLessThan((dry / dryN) * 0.6);
  });

  it('keeps the picture\'s eye over the water as he rides it', () => {
    const player = (x: number, y: number) => ({ x, y, facing: 1, mode: 'ride', groundY: y, standY: y, hook: null, vy: 0 } as unknown as PlayerState);
    for (let t = 0.1; t <= 0.9; t += 0.1) {
      const look = cameraIntent(player(rideX(ride, t), rideY(ride, t)), alven.cameras);
      // A ride's picture is two EL under him; as it was with the raft in the air, a little over 1.3 under the river.
      expect(look.y, `at ${rideX(ride, t).toFixed(1)}`).toBeGreaterThan(pool.y - 1.3);
    }
  });
});
