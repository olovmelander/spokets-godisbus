import { Box3, Group, Mesh, Vector3, type MeshStandardMaterial } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { LOFT_BARN, barnLoft, insideBarn } from '../../src/content/aventyr2/barn-loft';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { heightAt, landscape } from '../../src/render/dressing/kit';
import { PACK } from '../../src/render/extensions';

beforeAll(() => {
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
});
afterAll(() => vi.unstubAllGlobals());

/**
 * Billsta's barn and the door mormor opens (Olov, 12 November 2026: "kan vi göra dörren som mormor öppnar till ladan
 * mycket bättre designad, hela den delen måste bli bättre designad"). It was a door frame standing alone, with a piece
 * of wall in the plane he walks in, and a door that swung in through mormor (../../src/content/aventyr2/barn-loft.ts).
 */
describe('Billsta’s barn and its loft door', () => {
  const mover = billsta.movers!.find((one) => one.look === 'barn-door')!;
  const make = () => {
    const parent = new Group();
    parent.position.set(mover.stops[0]!.x, mover.stops[0]!.y, 0);
    const door = PACK.movers.get('barn-door')!(mover)!;
    parent.add(door);
    const at = (fraction: number, clock: number) => {
      parent.position.y = mover.stops[0]!.y + (mover.stops.at(-1)!.y - mover.stops[0]!.y) * fraction;
      door.userData.tick(clock);
      parent.updateWorldMatrix(true, true);
    };
    return { door, at, part: (name: string) => door.getObjectByName(name)! };
  };

  it('is a sliding door in the barn’s front, broad to the camera, and it rolls aside along its rail clear of the doorway', () => {
    const { at, part } = make();
    at(0, 0);
    const leaf = part('barn-door-leaf'), front = part('barn-door-frame');
    const shut = new Box3().setFromObject(leaf), size = shut.getSize(new Vector3());
    // Its broad face is to the camera, a little taller than mormor reaches, and it covers the doorway.
    expect(size.x).toBeGreaterThan(2.8);
    expect(size.z).toBeLessThan(0.6);
    expect(size.y).toBeGreaterThan(3.8);
    expect(shut.min.x).toBeLessThan(LOFT_BARN.door.from);
    expect(shut.max.x).toBeGreaterThan(LOFT_BARN.door.to);
    // In front of the path, where neither he nor mormor ever goes through it, and the front with it.
    expect(shut.min.z).toBeGreaterThan(1.2);
    // Its wall stands in front of the path all along, up to the eaves (the roof goes back over him from there).
    const points = (front as Mesh).geometry.getAttribute('position'), p = new Vector3();
    for (let i = 0; i < points.count; i++) {
      p.fromBufferAttribute(points, i).applyMatrix4(front.matrixWorld);
      if (p.y < LOFT_BARN.eaves - 0.2) expect(p.z, `at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`).toBeGreaterThan(1);
    }
    const wall = new Box3().setFromObject(front);
    const still = { wall: wall.clone(), y: shut.min.y, z: shut.min.z };
    // The simulation's block goes up; the picture rolls the door aside along its rail, and on to the rail's end.
    for (let i = 1; i <= 60; i++) at(Math.min(1, i / 20), i / 30);
    const open = new Box3().setFromObject(leaf);
    expect(open.min.x).toBeGreaterThan(LOFT_BARN.door.to - 0.25);
    expect(open.min.y).toBeCloseTo(still.y, 6);
    expect(open.min.z).toBeCloseTo(still.z, 6);
    // The barn stands where it stands.
    expect(new Box3().setFromObject(front).equals(still.wall)).toBe(true);
  });

  it('has its loft door at the top of the planks, and its bales where he climbs', () => {
    const ground = (x: number) => heightAt(billsta, x);
    // The doorway's sill is the loft's floor, a step past the planks' top, where the door's block stands.
    expect(LOFT_BARN.door.bottom).toBeCloseTo(ground(LOFT_BARN.door.from + 0.5), 1);
    expect(LOFT_BARN.door.from).toBeLessThan(mover.stops[0]!.x);
    expect(LOFT_BARN.door.to).toBeGreaterThan(mover.stops[0]!.x);
    // It is taller than he and mormor: its top over hers as she stands at it.
    expect(LOFT_BARN.door.top - LOFT_BARN.door.bottom).toBeGreaterThan(3.8);
    // The barn's right gable is where the roof's hatch is, past the hay he climbs up.
    expect(LOFT_BARN.right).toBeGreaterThan(70);
    expect(ground(LOFT_BARN.right + 0.5)).toBeCloseTo(7.2, 5);
    const { door } = make();
    const inside = door.getObjectByName('barn-loft') as Mesh;
    expect(inside).toBeDefined();
    expect(new Box3().setFromObject(inside).min.z).toBeLessThan(-2.8);
  });

  it('draws its bales itself: the picture’s floor runs on under them, and they stand round what holds them up', () => {
    // As steps of the ground each had a front of its own reaching out under it: a grey wedge (12 November 2026).
    const bales = billsta.landmarks!.filter((mark) => mark.look === 'bale');
    expect(bales.length).toBe(3);
    const land = landscape(billsta);
    for (const mark of bales) {
      for (let i = 0; i <= 10; i++) {
        const x = mark.from + 0.01 + ((mark.to - mark.from - 0.02) * i) / 10;
        expect(heightAt(land, x), `at ${x.toFixed(2)}`).toBeCloseTo(mark.base, 5);
      }
      // The simulation keeps its steps there.
      expect(heightAt(billsta, (mark.from + mark.to) / 2)).toBeGreaterThan(mark.base + 0.9);
    }
    // The roof outside the gable is where it was, to the simulation and to the picture.
    expect(heightAt(land, LOFT_BARN.right + 0.2)).toBeCloseTo(7.2, 5);
    const { door } = make();
    const hay = new Box3().setFromObject(door.getObjectByName('barn-hay')!);
    // Back against the loft's wall and out past the path, round the support each landmark stands on the floor.
    expect(hay.min.z).toBeLessThanOrEqual(-3.0 + 1e-6);
    expect(hay.max.z).toBeGreaterThan(1.4);
    for (const mark of bales) expect(hay.max.y).toBeGreaterThan(heightAt(billsta, (mark.from + mark.to) / 2));
  });

  it('takes the barn’s front away while he is inside, and gives it back when he is out', () => {
    expect(insideBarn(54.9)).toBe(false);
    expect(insideBarn(57)).toBe(true);
    expect(insideBarn(69.5)).toBe(true);
    expect(insideBarn(72)).toBe(false);
    let x = 54;
    const parent = new Group();
    parent.position.set(mover.stops.at(-1)!.x, mover.stops.at(-1)!.y, 0);
    const barn = barnLoft(mover, () => x, () => false);
    parent.add(barn);
    const front = (barn.getObjectByName('barn-door-frame') as Mesh);
    const material = front.material as MeshStandardMaterial;
    const play = (from: number, seconds: number) => { for (let t = 0; t <= seconds; t += 1 / 30) barn.userData.tick(from + t); };
    play(0, 1);
    expect(material.opacity).toBe(1);
    expect(front.visible).toBe(true);
    // In through the doorway: within half a second the front is gone, and he is seen inside.
    x = 57;
    play(2, 0.6);
    expect(material.opacity).toBeLessThan(0.02);
    expect(front.visible).toBe(false);
    // Out through the hatch onto the roof: it is back.
    x = 72;
    play(4, 0.6);
    expect(material.opacity).toBe(1);
  });
});
