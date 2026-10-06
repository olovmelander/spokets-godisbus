import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector2 } from 'three';
import { bakeForestShadows, setBakedShade } from '../../src/render/forest-shadows';

const SUN = [-7, 5, -4] as const;
function fixture(overlap = false) {
  const material = new MeshStandardMaterial({ vertexColors: true });
  const standing = new Group();
  const tree = new InstancedMesh(new LatheGeometry([[1.9, 0], [1, 3], [.95, 60]].map(([r, y]) => new Vector2(r, y)), 22), material, 2);
  tree.userData.casts = true;
  tree.setMatrixAt(0, new Matrix4().makeTranslation(-7, 0, -4));
  tree.setMatrixAt(1, new Matrix4().makeTranslation(-7, 0, -4));
  tree.count = overlap ? 2 : 1;
  standing.add(tree);
  // The last point is one radius to the side of the ray, in the soft edge of the same shadow.
  const points = [0, 0, 0, 12, 0, 0, 0, 80, 0, 0, -8, 0, 8.75, -2, 5, -4 / Math.sqrt(65), 0, 7 / Math.sqrt(65)];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(points.map(() => .8), 3));
  const ground = new Mesh(geometry, material);
  bakeForestShadows(ground, standing, SUN);
  return { ground, standing, tree, colour: geometry.getAttribute('color') };
}

describe('the forest ground shade', () => {
  it('follows the trunk ray across a sloping foreground, with a soft edge and finite trunk height', () => {
    const { ground, colour } = fixture();
    setBakedShade(ground, true);
    expect(colour.getX(0)).toBeCloseTo(.8 * .7);
    expect(colour.getX(4)).toBeCloseTo(colour.getX(0));
    for (const point of [1, 2, 3]) expect(colour.getX(point)).toBeCloseTo(.8);
    expect(colour.getX(5)).toBeGreaterThan(colour.getX(0) + .05);
    expect(colour.getX(5)).toBeLessThan(.8 - .05);
  });

  it('restores the exact authored colours on High and never compounds shade or replaces the GPU attribute', () => {
    const { ground, colour } = fixture();
    const original = Array.from(colour.array);
    for (let repeat = 0; repeat < 3; repeat++) {
      setBakedShade(ground, true);
      setBakedShade(ground, true);
      expect(colour.getX(0)).toBeCloseTo(.8 * .7);
      setBakedShade(ground, false);
      expect(Array.from(colour.array)).toEqual(original);
      expect(ground.geometry.getAttribute('color')).toBe(colour);
    }
    const overlapping = fixture(true);
    setBakedShade(ground, true);
    setBakedShade(overlapping.ground, true);
    expect(overlapping.colour.array).toEqual(colour.array);
  });

  it('uses instance scale and tilt as well as the transforms of both parent groups', () => {
    const { ground, standing, tree, colour } = fixture();
    const parent = new Group();
    parent.position.set(20, 6, -3);
    parent.add(ground, standing);
    const place = new Object3D();
    place.position.set(-7, 0, -4);
    place.rotation.z = .15;
    place.scale.set(1.5, 1, 1.5);
    place.updateMatrix();
    tree.setMatrixAt(0, place.matrix);
    bakeForestShadows(ground, standing, SUN);
    setBakedShade(ground, true);
    expect(colour.getX(0)).toBeLessThan(.8 * .8);
    expect(colour.getX(1)).toBeCloseTo(.8);
  });
});
