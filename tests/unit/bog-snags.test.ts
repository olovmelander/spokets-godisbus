import { Box3, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { bog } from '../../src/render/dressing/bog';
import { KIT, makeKit } from '../../src/render/dressing/kit';

beforeAll(() => {
  // The kit draws bark on a canvas: there is none here, and none is needed.
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  makeKit();
});
afterAll(() => vi.unstubAllGlobals());

describe("the bog's dead pines", () => {
  it('are snags: about nine tall, broken at the top, with the stubs of their branches and colours on their corners', () => {
    const box = new Box3().setFromBufferAttribute(KIT.snag.getAttribute('position') as never);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeGreaterThan(8.7);
    expect(box.max.y).toBeLessThan(9.6);
    // The stubs stand out further than the trunk is wide above its foot.
    const at = KIT.snag.getAttribute('position');
    let reach = 0;
    for (let i = 0; i < at.count; i++) if (at.getY(i) > 3) reach = Math.max(reach, Math.hypot(at.getX(i), at.getZ(i)));
    expect(reach).toBeGreaterThan(0.7);
    expect(KIT.snag.getAttribute('color').count).toBe(at.count);
    expect(KIT.deadwood.vertexColors).toBe(true);
  });

  it('stand in the bog no taller than the picture is from where the camera stands', () => {
    const myren = COURSES.myren!;
    let seen = 0;
    for (let from = 0; from < 200; from += 18) {
      const group = bog(myren, from, from + 18, from * 7 + 3);
      const dead = group.children.find((child) => child instanceof InstancedMesh && child.geometry === KIT.snag) as InstancedMesh;
      const m = new Matrix4(), at = new Vector3(), size = new Vector3();
      for (let i = 0; i < dead.count; i++) {
        dead.getMatrixAt(i, m);
        m.decompose(at, new Quaternion(), size);
        // The top of the picture at that depth, seen level from 0.8 over the path (0.5 over its foot), 10.5 in front.
        const top = at.y + 0.5 + 0.8 + Math.tan(Math.PI / 12) * (10.5 - at.z);
        expect(at.y + 9.6 * size.y, `${from}: ${i}`).toBeLessThan(top);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(3);
  });
});
