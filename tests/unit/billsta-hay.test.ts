import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoubleSide, Group, type BufferGeometry } from 'three';
import { hayDust, loftHay, WALKED } from '../../src/content/aventyr2/barn-hay';
import { LOFT_BARN, barnLoft, loftHayPlace } from '../../src/content/aventyr2/barn-loft';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { UNDER_ROOF, underRoof } from '../../src/content/aventyr2/storm-rain';
import { hayMaterial } from '../../src/content/aventyr2/straw';
import { heightAt } from '../../src/render/dressing/kit';

/**
 * The hay in Billsta's barn (Olov, 14 November 2026: "Kan vi göra höet inne i ladan snyggare?"). It was bales of upright
 * slabs and a row of smooth lumps. Now it is stalks: bales bound with twine, loose hay heaped along the wall and into
 * the hatch, straws on the boards (src/content/aventyr2/barn-hay.ts). What he walks on stays where the simulation has it.
 */

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

const place = loftHayPlace();
const corners = (shape: BufferGeometry) => {
  const at = shape.getAttribute('position'), fibre = shape.getAttribute('fibre'), colour = shape.getAttribute('color');
  return Array.from({ length: at.count }, (_, i) => ({ x: at.getX(i), y: at.getY(i), z: at.getZ(i), mass: fibre.getX(i) > 0.5, r: colour.getX(i), g: colour.getY(i), b: colour.getZ(i) }));
};

describe('the hay in Billsta\'s loft', () => {
  const shape = loftHay(place);
  const all = corners(shape);
  const stalks = all.filter((c) => !c.mass);

  it('is made of stalks: thousands of them on the bales, in the heaps and on the boards, over a darker mass', () => {
    // Each stalk is at least eight corners: well over two thousand of them. The old hay had two dozen sticks.
    expect(stalks.length).toBeGreaterThan(20000);
    expect(all.length - stalks.length).toBeGreaterThan(3000);
    const light = (c: { r: number; g: number; b: number }) => (c.r + c.g + c.b) / 3;
    const mean = (list: typeof all) => list.reduce((sum, c) => sum + light(c), 0) / list.length;
    // The mass between the stalks is the darker: the depth between them.
    expect(mean(all.filter((c) => c.mass))).toBeLessThan(mean(stalks) * 0.92);
    // One draw's worth, and not a heavy one.
    expect(shape.index!.count / 3).toBeLessThan(60000);
  });

  it('leaves the ground he walks on where the simulation has it: nothing of the hay stands over it', () => {
    const ground = (x: number) => Math.max(heightAt(billsta, x - 0.14), heightAt(billsta, x), heightAt(billsta, x + 0.14));
    for (const c of all) {
      if (Math.abs(c.z) > 0.6 || c.x < LOFT_BARN.left || c.x > LOFT_BARN.right) continue;
      expect(c.y, `at ${c.x.toFixed(2)}, ${c.z.toFixed(2)}`).toBeLessThanOrEqual(ground(c.x) + 0.05);
    }
    // And each step's top is there, level, at the height he stands on: its bale's own top.
    const stoodOn = place.bales.filter((step) => !place.bales.some((other) => other !== step && other.low >= step.high - 0.05 && other.from < step.to && other.to > step.from));
    expect(stoodOn.length).toBe(3);
    for (const step of stoodOn) {
      const top = all.filter((c) => c.mass && Math.abs(c.z) < 0.5 && c.x > step.from + 0.25 && c.x < step.to - 0.25 && c.y > step.high - 0.2);
      expect(top.length, `the step at ${step.from}`).toBeGreaterThan(20);
      expect(Math.max(...top.map((c) => c.y))).toBeCloseTo(step.high, 2);
      // All along it, and across the strip he walks in: only the twines' grooves are lower, by less than a tenth.
      for (let x = step.from + 0.3; x < step.to - 0.3; x += 0.2) for (const z of [-0.4, 0, 0.4]) {
        const here = top.filter((c) => Math.abs(c.x - x) < 0.13 && Math.abs(c.z - z) < 0.13);
        expect(here.length, `at ${x.toFixed(1)}, ${z}`).toBeGreaterThan(0);
        expect(Math.max(...here.map((c) => c.y)), `at ${x.toFixed(1)}, ${z}`).toBeGreaterThan(step.high - 0.1);
      }
    }
    expect(WALKED).toBeGreaterThan(0.6);
  });

  it('stands inside the barn: back against the loft\'s wall, and never out through its front', () => {
    const box = shape.boundingBox!;
    expect(box.min.z).toBeLessThanOrEqual(LOFT_BARN.back + 0.1 + 1e-6);
    expect(box.max.z).toBeGreaterThan(1.4);
    // (The straws out on the planks lie outside it, where there is no wall.)
    const within = all.filter((c) => c.x > LOFT_BARN.left);
    expect(Math.max(...within.map((c) => c.z))).toBeLessThan(LOFT_BARN.front - 0.02);
    expect(box.max.x).toBeLessThan(LOFT_BARN.right);
    // Under the beams of the second way, which he has to see: no heap reaches up to them.
    const beams = billsta.ledges!.filter((ledge) => ledge.look === 'plank' && !ledge.needs);
    for (const beam of beams) {
      const under = all.filter((c) => Math.abs(c.x - beam.x) < beam.width / 2 + 0.3);
      expect(Math.max(...under.map((c) => c.y)), `the beam at ${beam.x}`).toBeLessThan(beam.y - 0.1);
    }
  });

  it('has loose hay heaped along the wall, hanging into the hatch, and straws lying about, some out on the planks', () => {
    // Heaped: well over the floor, behind where he walks.
    const heaped = all.filter((c) => c.z < -1.4 && c.x > place.bales[0]!.to + 0.5 && c.x < place.bales[1]!.from - 0.5);
    expect(Math.max(...heaped.map((c) => c.y))).toBeGreaterThan(place.floor + 0.8);
    // Into the hatch: stalks below the floor there, behind his jump and at its two edges.
    const hanging = stalks.filter((c) => c.x > place.hatch.from - 0.1 && c.x < place.hatch.to + 0.1 && c.y < place.floor - 0.25);
    expect(hanging.length).toBeGreaterThan(60);
    // On the boards: single straws lying flat, in front of the bales and between them.
    const lying = stalks.filter((c) => Math.abs(c.y - place.floor - 0.015) < 0.03 && c.z > 0.3 && c.x > LOFT_BARN.left);
    expect(lying.length).toBeGreaterThan(100);
    // And a few dragged out through the door, on the planks' slope.
    const outside = stalks.filter((c) => c.x < LOFT_BARN.left - 0.3);
    expect(outside.length).toBeGreaterThan(20);
    for (const c of outside) expect(c.y, `at ${c.x.toFixed(2)}`).toBeLessThanOrEqual(heightAt(billsta, c.x) + 0.06);
  });

  it('is bound with twine, bitten in over each bale\'s top and down its end', () => {
    // The twines are the darkest brown in it: dark, and redder than any hay.
    const twine = stalks.filter((c) => c.r < 0.25 && c.r > c.g * 1.35);
    // Two a bale, on five bales he walks on and the five behind them.
    expect(twine.length).toBeGreaterThan(10 * 2 * 60);
    const first = place.bales[0]!;
    const onFirst = twine.filter((c) => c.x > first.from && c.x < first.to && c.z > 1.2);
    // Down its near end, from its top to the floor.
    expect(Math.max(...onFirst.map((c) => c.y))).toBeGreaterThan(first.high - 0.2);
    expect(Math.min(...onFirst.map((c) => c.y))).toBeLessThan(place.floor + 0.1);
  });
});

describe('the lantern in the loft', () => {
  it('warms the hay: a material of its own, lit by mormor\'s lantern once the door is open', () => {
    const { material, light } = hayMaterial(place.lamps);
    expect(material.vertexColors).toBe(true);
    expect(material.side).toBe(DoubleSide);
    expect(light.lamps.value.length).toBe(2);
    // The first lamp is hers, at the door she stands in; both are in the loft.
    const door = billsta.movers!.find((m) => m.id === 'bi-door')!;
    expect(Math.abs(place.lamps[0]!.x - door.stops[0]!.x)).toBeLessThan(1.5);
    for (const lamp of place.lamps) {
      expect(lamp.x).toBeGreaterThan(LOFT_BARN.left);
      expect(lamp.x).toBeLessThan(LOFT_BARN.right);
      expect(lamp.y).toBeGreaterThan(place.floor + 1);
    }
    // Shut, the loft is dark; open, it is lit, and dust hangs in the light.
    const mover = door;
    const parent = new Group();
    parent.position.set(mover.stops[0]!.x, mover.stops[0]!.y, 0);
    const barn = barnLoft(mover, () => 50, () => true);
    parent.add(barn);
    barn.userData.tick(0);
    const dust = barn.getObjectByName('barn-dust')!;
    expect(dust.visible).toBe(false);
    parent.position.y = mover.stops.at(-1)!.y;
    barn.userData.tick(1);
    expect(dust.visible).toBe(true);
  });

  it('shows dust in its light: specks inside the loft, drifting, and still with less motion', () => {
    const dust = hayDust(place);
    dust.tick(0, 0, false);
    expect(dust.points.visible).toBe(false);
    dust.tick(3, 1, false);
    expect(dust.points.visible).toBe(true);
    const at = dust.points.geometry.getAttribute('position');
    const first = Array.from({ length: at.count }, (_, i) => [at.getX(i), at.getY(i), at.getZ(i)]);
    for (const [x, y, z] of first) {
      expect(x!).toBeGreaterThan(LOFT_BARN.left - 0.3);
      expect(x!).toBeLessThan(LOFT_BARN.right);
      expect(y!).toBeGreaterThan(place.floor - 0.4);
      expect(z!).toBeLessThan(LOFT_BARN.front);
    }
    dust.tick(9, 1, false);
    expect(Array.from({ length: at.count }, (_, i) => at.getX(i))).not.toEqual(first.map((p) => p[0]));
    const still = hayDust(place);
    still.tick(3, 1, true);
    const held = Array.from({ length: at.count }, (_, i) => still.points.geometry.getAttribute('position').getX(i));
    still.tick(9, 1, true);
    expect(Array.from({ length: at.count }, (_, i) => still.points.geometry.getAttribute('position').getX(i))).toEqual(held);
  });
});

describe('the storm stays out of the loft', () => {
  it('rains on the barn while he is outside it, and not under its roof while its front is away', () => {
    const mover = billsta.movers!.find((m) => m.id === 'bi-door')!;
    let x = 50;
    const parent = new Group();
    parent.position.set(mover.stops.at(-1)!.x, mover.stops.at(-1)!.y, 0);
    const barn = barnLoft(mover, () => x, () => false);
    parent.add(barn);
    const play = (from: number, seconds: number) => { for (let t = 0; t <= seconds; t += 1 / 30) barn.userData.tick(from + t); };
    play(0, 1);
    expect(underRoof(60)).toBe(false);
    // In through the door: within a second the loft is dry, from gable to gable, and the planks outside are not.
    x = 58;
    play(2, 1);
    expect(UNDER_ROOF.dry).toBe(1);
    expect(underRoof(60)).toBe(true);
    expect(underRoof(69)).toBe(true);
    expect(underRoof(53)).toBe(false);
    expect(underRoof(72)).toBe(false);
    // Out onto the roof: it rains on the barn again.
    x = 73;
    play(4, 1);
    expect(underRoof(60)).toBe(false);
  });
});
