import { BoxGeometry, Color, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CandyKit } from '../../src/render/candy';
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

describe('the sweets given to the three friends, once the kit from Blender has come', () => {
  const kit = (...names: string[]): CandyKit => {
    const shapes = new Map(names.map((name) => [name, new BoxGeometry(1, 1, 1)]));
    return { shape: (name) => shapes.get(name), material: new MeshStandardMaterial() };
  };
  it('shows the sweet he chose as its own shape beside its recipient, and hides the ball', () => {
    const { group, mesh, install, update } = createSharedSweets();
    expect(install(kit('gelehallon', 'karamell', 'skumbanan'))).toBe(true);
    update(new Set(['share:spoket', 'gift:spoket:skumbanan', 'share:jay']), { x: 50, y: 4 });
    const shown = group.children.filter((child) => child !== mesh && child.visible).map((child) => child.name);
    expect(shown).toEqual(['shared:spoket:skumbanan']);
    expect(group.getObjectByName('shared:spoket:skumbanan')!.position.x).toBeCloseTo(50.26);
    const scale = new Vector3(), matrix = new Matrix4();
    mesh.getMatrixAt(1, matrix); expect(scale.setFromMatrixScale(matrix).x).toBe(0);
    // The jay's lingonberry is a berry, not a sweet: it stays a ball.
    mesh.getMatrixAt(2, matrix); expect(scale.setFromMatrixScale(matrix).x).toBeGreaterThan(0);
  });
  it('makes every sweet once, so that giving one later builds nothing', () => {
    const { group, install, update } = createSharedSweets();
    install(kit('gelehallon', 'karamell', 'skumbanan'));
    const made = group.children.length;
    expect(install(kit('gelehallon', 'karamell', 'skumbanan'))).toBe(false);
    for (const kind of ['gelehallon', 'karamell', 'skumbanan']) update(new Set(['share:tragubbe', `gift:tragubbe:${kind}`]), null);
    expect(group.children).toHaveLength(made);
  });
  it('keeps the balls when the kit lacks a sweet', () => {
    const { group, install } = createSharedSweets();
    expect(install(kit('gelehallon'))).toBe(false);
    expect(group.children).toHaveLength(1);
  });
});
