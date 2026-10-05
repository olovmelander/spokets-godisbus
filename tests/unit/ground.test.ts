import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes, tileOf } from '../../src/render/dressing/ground';

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
        const where = `${course}: ${edge.kind} at x ${edge.x.toFixed(2)}, z ${edge.z.toFixed(2)}`;
        expect(edge.pull, where).toBeGreaterThan(0.6);
        expect(edge.pull, where).toBeLessThan(1.6);
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
