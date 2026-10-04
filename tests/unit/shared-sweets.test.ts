import { Color, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createSharedSweets } from '../../src/render/shared-sweets';

describe('the sweets given to the three friends', () => {
  const pose = (mesh: ReturnType<typeof createSharedSweets>['mesh'], i: number) => {
    const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix);
    return { at: new Vector3().setFromMatrixPosition(matrix), size: new Vector3().setFromMatrixScale(matrix) };
  };
  it('a choice is not shown until it has actually been given', () => {
    const { mesh, update } = createSharedSweets();
    update(new Set(['gift:spoket:karamell', 'share:tragubbe']), null);
    expect(pose(mesh, 0).size.x).toBeGreaterThan(0);
    expect(pose(mesh, 1).size.x).toBe(0);
    expect(pose(mesh, 2).size.x).toBe(0);
  });
  it('keeps the chosen colours and banana shape beside moving recipients', () => {
    const { mesh, update } = createSharedSweets();
    update(new Set(['share:tragubbe', 'gift:tragubbe:skumbanan', 'share:spoket', 'gift:spoket:karamell', 'share:jay', 'gift:jay:lingon']), { x: 50, y: 4 }, { x: 52, y: 4 });
    const colour = new Color();
    mesh.getColorAt(0, colour); expect(colour.getHexString()).toBe('eed382');
    mesh.getColorAt(1, colour); expect(colour.getHexString()).toBe('dfb65f');
    mesh.getColorAt(2, colour); expect(colour.getHexString()).toBe('b22e3b');
    expect(pose(mesh, 0).size.y).toBeLessThan(pose(mesh, 0).size.x);
    expect(pose(mesh, 0).at.x).toBeCloseTo(52.28);
    expect(pose(mesh, 1).at.x).toBeCloseTo(50.26);
    expect(pose(mesh, 1).at.y).toBeCloseTo(4.45);
    expect(pose(mesh, 2).size.x).toBeLessThan(pose(mesh, 1).size.x);
  });
  it('reuses one instanced draw and its resources through repeated frames', () => {
    const { mesh, update } = createSharedSweets(), geometry = mesh.geometry, material = mesh.material;
    for (let i = 0; i < 100; i++) update(new Set(['share:jay']), { x: i, y: 0 });
    expect(mesh.count).toBe(3);
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
  });
});
