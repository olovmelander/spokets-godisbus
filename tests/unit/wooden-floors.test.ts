import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { BOARD, TILT, TILT_ENDS, bankShapes, forwardAt, tileOf } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';

/** Every corner of a chapter's ground of some kinds that a triangle is drawn with. */
function* corners(course: string, kinds: (kind: string) => boolean) {
  const chapter = COURSES[course]!;
  for (const { kind, shape } of bankShapes(chapter, groundOf(chapter.place!))) {
    if (!kinds(kind)) continue;
    const at = shape.getAttribute('position');
    const index = shape.getIndex()!;
    const drawn = new Set<number>();
    for (let i = 0; i < index.count; i++) drawn.add(index.getX(i));
    for (const i of drawn) yield { x: at.getX(i), y: at.getY(i), z: at.getZ(i) };
  }
}
const wood = (kind: string) => kind === 'wood';
/** How far under the path a built floor lies at a depth in front of it, on its plane. */
const tilted = (z: number) => TILT * (z - 0.45);
/** Open floor, away from any step: nothing draws back there and half a length to each side it has one height. */
const open = (course: string, x: number) => forwardAt(COURSES[course]!, x - 0.5) === 1 && forwardAt(COURSES[course]!, x + 0.5) === 1
  && Math.abs(heightAt(COURSES[course]!, x - 0.5) - heightAt(COURSES[course]!, x + 0.5)) < 0.01;

describe('no ground reaches the camera', () => {
  // The camera stands 9.3 lengths in front of the path on a phone held sideways, and 7.5 in the shortest
  // window anyone would play in. Ground that came that far would have the camera inside it wherever the
  // camera stands over a level higher than its eye: he at the foot of a step, the camera a little ahead of
  // him. A wooden floor that ran on level under the camera did exactly that, and the picture there was the
  // house wall seen through the floor.
  it('in any chapter, of any kind: it ends 6 lengths in front of the path at the most', () => {
    for (const chapter of Object.values(COURSES)) {
      if (chapter.place === undefined) continue;
      let front = -Infinity;
      for (const corner of corners(chapter.id, () => true)) front = Math.max(front, corner.z);
      expect(front, chapter.id).toBeGreaterThan(0.9);
      expect(front, chapter.id).toBeLessThan(6);
    }
  });
});

describe('a wooden floor', () => {
  // Home in the morning and in the evening, the deck, the sweet shop.
  const floors = ['prolog', 'epilog', 'garden', 'byn'];

  it('is level where he walks, and in front of the path one flat plane that tilts away towards the camera', () => {
    for (const course of floors) {
      let level = 0;
      let sloping = 0;
      for (const corner of corners(course, wood)) {
        if (!open(course, corner.x)) continue;
        const under = heightAt(COURSES[course]!, corner.x) - corner.y;
        if (corner.z >= -0.35 && corner.z <= 0.451) {
          level += 1;
          expect(under, `${course} at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeCloseTo(0, 5);
        } else if (corner.z >= 1.6 - 1e-4 && corner.z <= TILT_ENDS + 1e-4 && under < tilted(TILT_ENDS) + 0.01) {
          // Boards on a curve are a barrel: past the short curve at his feet every corner lies on the plane.
          sloping += 1;
          expect(under, `${course} at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeCloseTo(tilted(corner.z), 4);
        }
      }
      expect(level, course).toBeGreaterThan(40);
      expect(sloping, course).toBeGreaterThan(80);
    }
  });

  it("draws back to the path at the top of a step, so that he at its foot is in sight", () => {
    // The deck's step of 1 length, and the fall of 7.6 into the gap after it. The camera stands ahead of him:
    // at the step's foot it is over the upper floor, and a floor that came forward there stood in front of him.
    const garden = COURSES['garden']!;
    for (const [x, top] of [[12.05, 7.6], [16.95, 7.6]] as const) {
      expect(heightAt(garden, x), `the deck at x ${x}`).toBeCloseTo(top, 5);
      expect(forwardAt(garden, x), `the step's top at x ${x}`).toBeLessThan(0.02);
    }
    // In the mesh: at the step's top no corner of the deck stands out in front of the path, and three lengths
    // on the deck comes all the way forward again.
    let between = -Infinity;
    for (const corner of corners('garden', wood)) {
      if (Math.abs(corner.x - 12) < 0.02 && Math.abs(corner.y - 7.6) < 0.02) expect(corner.z, "the step's top").toBeLessThan(0.5);
      if (Math.abs(corner.x - 14.5) < 0.3) between = Math.max(between, corner.z);
    }
    expect(between).toBeGreaterThan(3);
  });

  it('keeps the boards planar beside rising and falling steps, with grain measured along their surface', () => {
    const chapter = {
      ...COURSES['garden']!,
      ground: [{ x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 0 }, { x: 16, y: 0 }],
      surfaces: [{ from: -24, to: 32, kind: 'wood' as const }],
    };
    const beside = [0, 0];
    let grain = 0;
    for (const { shape } of bankShapes(chapter, 'lawn')) {
      const at = shape.getAttribute('position');
      const normal = shape.getAttribute('normal');
      const uv = shape.getAttribute('uv');
      const columns = new Map<number, { y: number; z: number; v: number }[]>();
      for (let i = 0; i < at.count; i++) {
        const x = at.getX(i);
        const side = x > 0.05 && x < 2.4 ? 0 : x > 5.6 && x < 7.95 ? 1 : -1;
        const y = at.getY(i);
        const z = at.getZ(i);
        // The upper floor's upward-facing corners, beyond its short curve at his feet. The lower floor
        // continues under it; the vertical cut at its edge is not part of the plane.
        if (side < 0 || y <= 0 || z < 1.6 || normal.getY(i) < 0.8) continue;
        expect(y, `upper floor at x ${x.toFixed(2)}, z ${z.toFixed(2)}`).toBeCloseTo(1 - tilted(z), 5);
        beside[side]! += 1;
        const column = columns.get(x) ?? [];
        column.push({ y, z, v: uv.getY(i) });
        columns.set(x, column);
      }
      for (const column of columns.values()) {
        column.sort((a, b) => a.z - b.z);
        for (let i = 1; i < column.length; i++) {
          const a = column[i - 1]!;
          const b = column[i]!;
          if (b.z - a.z < 0.01) continue;
          expect(b.v - a.v).toBeCloseTo(Math.hypot(b.z - a.z, b.y - a.y) / (BOARD * 2), 5);
          grain++;
        }
      }
      shape.dispose();
    }
    expect(beside[0]).toBeGreaterThan(5);
    expect(beside[1]).toBeGreaterThan(5);
    expect(grain).toBeGreaterThan(5);
  });

  it('ends in a thin board over a recessed fascia, with grain along it and the deep closure retained', () => {
    const chapter = {
      ...COURSES['garden']!,
      ground: [{ x: -8, y: 2 }, { x: 16, y: 2 }],
      surfaces: [{ from: -24, to: 32, kind: 'wood' as const }],
    };
    const shape = bankShapes(chapter, 'lawn').find(({ kind }) => kind === 'wood')!.shape;
    const at = shape.getAttribute('position'), uv = shape.getAttribute('uv');
    const top = 2 - tilted(TILT_ENDS);
    const fascia = [0, 0];
    const ends = new Set<number>();
    let bottom = Infinity;
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
      bottom = Math.min(bottom, y);
      if (Math.abs(z - TILT_ENDS) < 1e-5) ends.add(Math.round(y * 1e5) / 1e5);
      // Across the fascia the texture spans one board; along it the grain follows the floor's edge.
      const edge = Math.abs(uv.getX(i) - 0.0125) < 1e-5 ? 0 : Math.abs(uv.getX(i) - 0.4875) < 1e-5 ? 1 : -1;
      if (edge < 0 || Math.abs(z - (TILT_ENDS - 0.05)) > 1e-5) continue;
      expect(y).toBeCloseTo(top - 0.25 - edge * 0.65, 5);
      expect(uv.getY(i)).toBeCloseTo(x / (BOARD * 2), 5);
      fascia[edge]!++;
    }
    expect([...ends].sort((a, b) => b - a)).toEqual([top, top - 0.2].map((y) => Math.round(y * 1e5) / 1e5));
    expect(fascia[0]).toBeGreaterThan(20);
    expect(fascia[1]).toEqual(fascia[0]);
    expect(bottom).toBeCloseTo(2 - 16, 5);
    shape.dispose();
  });

  it('turns the fascia towards the normal play camera along the pulled-back edge of a rising step', () => {
    const chapter = {
      ...COURSES['garden']!,
      ground: [{ x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 8, y: 1 }],
      surfaces: [{ from: -24, to: 32, kind: 'wood' as const }],
    };
    const shape = bankShapes(chapter, 'lawn').find(({ kind }) => kind === 'wood')!.shape;
    const at = shape.getAttribute('position'), normal = shape.getAttribute('normal'), uv = shape.getAttribute('uv');
    let facing = 0;
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i), z = at.getZ(i);
      if (x <= 0.05 || x >= 2.4 || at.getY(i) < -0.8 || Math.abs(uv.getX(i) - 0.0125) > 1e-5) continue;
      // Elof is at x -0.3, but the camera leads him by 2.5. The physical -X riser faces away from it;
      // this is the curved front edge that the camera actually sees, with a positive Z-facing normal.
      expect(normal.getZ(i)).toBeGreaterThan(0.1);
      expect(normal.getX(i) * (2.2 - x) + normal.getZ(i) * (9 - z)).toBeGreaterThan(0);
      expect(Math.abs(normal.getY(i))).toBeLessThan(1e-5);
      facing++;
    }
    expect(facing).toBeGreaterThan(3);
    shape.dispose();
  });

  it('is a walk of planks over the bog: narrow, with a front edge a step in front of the path', () => {
    let front = -Infinity;
    let under = 0;
    const bog = COURSES['myren']!;
    for (const corner of corners('myren', wood)) {
      front = Math.max(front, corner.z);
      if (Math.abs(heightAt(bog, corner.x - 0.5) - heightAt(bog, corner.x + 0.5)) < 0.01 && corner.z > 0.5) under = Math.max(under, heightAt(bog, corner.x) - corner.y);
    }
    expect(front).toBeGreaterThan(0.9);
    expect(front).toBeLessThan(1.3);
    // Under its edge it goes down: a rim, and the peat it lies on.
    expect(under).toBeGreaterThan(4);
  });
});

describe('a street', () => {
  const street = COURSES['byn']!;
  const built = (kind: string) => kind === 'asphalt' || kind === 'paving';

  it('keeps asphalt, paving and stone planar beside both directions of step, with unstretched surface coordinates', () => {
    for (const kind of ['asphalt', 'paving', 'stone'] as const) {
      const chapter = {
        ...street,
        ground: [{ x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 3.3 }, { x: 8, y: 3.3 }, { x: 8, y: 0 }, { x: 16, y: 0 }],
        surfaces: [{ from: -24, to: 32, kind }], water: [],
      };
      const beside = [0, 0];
      let mapped = 0;
      for (const { shape } of bankShapes(chapter, 'asphalt')) {
        const at = shape.getAttribute('position'), normal = shape.getAttribute('normal'), uv = shape.getAttribute('uv');
        const columns = new Map<number, { y: number; z: number; v: number }[]>();
        for (let i = 0; i < at.count; i++) {
          const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
          const side = x > 0.05 && x < 2.4 ? 0 : x > 5.6 && x < 7.95 ? 1 : -1;
          if (side < 0 || y <= 1.7 || z < 1.6 || normal.getY(i) < 0.8) continue;
          expect(y, `${kind}: x${x}, z${z}`).toBeCloseTo(3.3 - tilted(z), 5);
          beside[side]!++;
          const column = columns.get(x) ?? [];
          column.push({ y, z, v: uv.getY(i) });
          columns.set(x, column);
        }
        for (const column of columns.values()) {
          column.sort((a, b) => a.z - b.z);
          for (let i = 1; i < column.length; i++) {
            const a = column[i - 1]!, b = column[i]!;
            if (b.z - a.z < 0.01) continue;
            expect(b.v - a.v, kind).toBeCloseTo(Math.hypot(b.z - a.z, b.y - a.y) * tileOf(kind), 5);
            mapped++;
          }
        }
        shape.dispose();
      }
      expect(beside[0], kind).toBeGreaterThan(5);
      expect(beside[1], kind).toBeGreaterThan(5);
      expect(mapped, kind).toBeGreaterThan(5);
    }
  });

  it('has the same plane in asphalt and paving: level where he walks, tilting away in front', () => {
    let sloping = 0;
    for (const corner of corners('byn', built)) {
      const pool = (street.water ?? []).some((w) => corner.x >= w.from - 1 && corner.x <= w.to + 1);
      if (pool || !open('byn', corner.x)) continue;
      const under = heightAt(street, corner.x) - corner.y;
      if (corner.z >= -0.35 && corner.z <= 0.451) expect(under, `at x ${corner.x.toFixed(2)}`).toBeCloseTo(0, 5);
      else if (corner.z >= 1.6 - 1e-4 && corner.z <= TILT_ENDS + 1e-4 && under < tilted(TILT_ENDS) + 0.01) {
        sloping += 1;
        expect(under, `at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeCloseTo(tilted(corner.z), 4);
      }
    }
    expect(sloping).toBeGreaterThan(80);
  });

  it('closes its puddle with the street itself: in front of the water the ground is at street level', () => {
    const puddle = (street.water ?? [])[0]!;
    const level = Math.min(heightAt(street, puddle.from - 0.6), heightAt(street, puddle.to + 0.6));
    expect(level).toBeGreaterThan(puddle.y);
    let seen = 0;
    for (const corner of corners('byn', built)) {
      if (corner.x < puddle.from + 1 || corner.x > puddle.to - 1 || corner.z < 0.49 || corner.z > 0.95) continue;
      seen += 1;
      // A finger under the street's level at the most, where the slope begins: never under the water.
      expect(corner.y, `at x ${corner.x.toFixed(1)}, z ${corner.z.toFixed(2)}`).toBeGreaterThan(puddle.y);
      expect(corner.y).toBeGreaterThan(level - 0.06);
    }
    expect(seen).toBeGreaterThan(20);
  });
});
