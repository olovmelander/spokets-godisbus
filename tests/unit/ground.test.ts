import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes, forwardAt, tileOf } from '../../src/render/dressing/ground';
import { heightAt, landscape } from '../../src/render/dressing/kit';

/** Each corner of each triangle from the path forward: how long its picture is against how long it is itself. */
function* edges(course: string) {
  const chapter = COURSES[course]!;
  for (const { kind, shape } of bankShapes(chapter, groundOf(chapter.place!))) {
    const at = shape.getAttribute('position');
    const uv = shape.getAttribute('uv');
    const index = shape.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      const corners = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      // Behind the path the moss rolls between its points, and nobody sees it but edge on.
      if (corners.some((c) => at.getZ(c) < -0.35)) continue;
      // Where a floor's front draws back to a wall its rows close like a fan, and the picture with them.
      if (corners.some((c) => forwardAt(chapter, at.getX(c) - 0.01) < 1 || forwardAt(chapter, at.getX(c) + 0.01) < 1)) continue;
      // A triangle of no area shows none of the picture: where two rows stand in one place, so that a colour
      // changes at an edge, the triangles between them are such.
      const [p0, p1, p2] = corners.map((c) => [at.getX(c), at.getY(c), at.getZ(c)] as const);
      const [ux, uy, uz, vx, vy, vz] = [p1![0] - p0![0], p1![1] - p0![1], p1![2] - p0![2], p2![0] - p0![0], p2![1] - p0![1], p2![2] - p0![2]];
      if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-7) continue;
      for (let k = 0; k < 3; k++) {
        const a = corners[k]!;
        const b = corners[(k + 1) % 3]!;
        const long = Math.hypot(at.getX(b) - at.getX(a), at.getY(b) - at.getY(a), at.getZ(b) - at.getZ(a));
        if (long < 0.02) continue;
        yield { kind, x: at.getX(a), z: at.getZ(a), pull: Math.hypot(uv.getX(b) - uv.getX(a), uv.getY(b) - uv.getY(a)) / tileOf(kind) / long };
      }
    }
  }
}

describe("the ground's picture", () => {
  const dressed = Object.values(COURSES).filter((chapter) => chapter.place !== undefined).map((chapter) => chapter.id);

  it('lies as true on the front and on a wall as on the top: nowhere pulled long, nowhere squeezed', () => {
    for (const course of dressed) {
      let seen = 0;
      for (const edge of edges(course)) {
        seen += 1;
        if (edge.pull > 0.6 && edge.pull < 1.6) continue;
        expect.fail(`${course}: ${edge.kind} at x ${edge.x.toFixed(2)}, z ${edge.z.toFixed(2)}: the picture is pulled ${edge.pull.toFixed(2)} times`);
      }
      expect(seen, course).toBeGreaterThan(500);
    }
  });

  it('has no empty stretch, and each has bounds, so that one out of sight is not drawn', () => {
    for (const course of dressed) {
      const chapter = COURSES[course]!;
      for (const { kind, shape } of bankShapes(chapter, groundOf(chapter.place!))) {
        expect(shape.getIndex()!.count, course + ': ' + kind).toBeGreaterThan(0);
        shape.computeBoundingSphere();
        expect(shape.boundingSphere!.radius, course + ': ' + kind).toBeGreaterThan(0.4);
      }
    }
  });
});

describe('the land under forest landmarks', () => {
  const chapter = COURSES['granskog']!;

  it('removes only the named raised blocks and leaves collision ground and adjoining cliffs intact', () => {
    const before = JSON.stringify(chapter);
    const land = landscape(chapter);
    for (const mark of chapter.landmarks!) {
      for (const x of [mark.from + 0.01, (mark.from + mark.to) / 2, mark.to - 0.01]) {
        expect(heightAt(land, x), mark.look).toBe(mark.base);
        expect(heightAt(chapter, x), mark.look).toBeGreaterThan(mark.base);
      }
      for (const x of [mark.from - 0.01, mark.to + 0.01]) expect(heightAt(land, x)).toBeCloseTo(heightAt(chapter, x));
    }
    expect(heightAt(land, 65.99)).toBe(4);
    expect(heightAt(land, 66.01)).toBe(0);
    expect(heightAt(land, 185.39)).toBe(-8);
    expect(heightAt(land, 185.41)).toBe(-13);
    expect(JSON.stringify(chapter)).toBe(before);
    expect(landscape(land)).toBe(land);
    for (const other of Object.values(COURSES).filter((course) => !course.landmarks?.length)) expect(landscape(other)).toBe(other);
  });

  it('draws the floor at the base behind and under each model, without its old raised wall', () => {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const meshes = bankShapes(chapter, 'moss').map(({ shape }) => new Mesh(shape, material));
    const ray = new Raycaster();
    for (const mark of chapter.landmarks!) {
      for (const x of [mark.from + 0.2, (mark.from + mark.to) / 2, mark.to - 0.2]) {
        for (const z of [0, -5]) {
          ray.set(new Vector3(x, 40, z), new Vector3(0, -1, 0));
          const hit = ray.intersectObjects(meshes)[0];
          expect(hit, `${mark.look} at ${x},${z}`).toBeDefined();
          expect(Math.abs(hit!.point.y - mark.base), `${mark.look} at ${x},${z}`).toBeLessThan(z === 0 ? 0.001 : 0.3);
        }
      }
    }
    for (const mesh of meshes) mesh.geometry.dispose();
    material.dispose();
  });
});
