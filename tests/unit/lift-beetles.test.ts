import { Color, DirectionalLight, HemisphereLight, InstancedMesh, Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import type { ExtraFrame } from '../../src/render/extensions';
import { createBeetles } from '../../src/render/lift/beetles';
import type { ChapterData } from '../../src/sim/types';

/** Dor beetles on the forest floor (the graphics pass of 6 November 2026): they walk, and hurry out of his way. */

const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);
function make(chapter: ChapterData) {
  const scene = new Scene();
  const extra = createBeetles({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() });
  return { scene, extra };
}
function frame(x: number, y: number, clock: number, over: Partial<ExtraFrame> = {}): ExtraFrame {
  camera.position.set(x, y + 2, 11);
  return { dt: 1 / 30, clock, flags: new Set(), x, y, camera, still: false, tier: 'high', riding: false, ...over };
}
const bodies = (scene: Scene) => scene.getObjectByName('beetles')!.children[0] as InstancedMesh;
function positionOf(mesh: InstancedMesh, i: number): Vector3 {
  const m = new Matrix4();
  mesh.getMatrixAt(i, m);
  return new Vector3().setFromMatrixPosition(m);
}

describe('the beetles', () => {
  const forest = COURSES.granskog!;

  it('live in the forest, and not in the village street', () => {
    expect(make(forest).extra).not.toBeNull();
    expect(make(COURSES['look-street']!).extra).toBeNull();
  });

  it('walk about, and hurry away from him when he comes close', () => {
    const { scene, extra } = make(forest);
    // Far off, so that the first beetle is in the picture but he is not near it.
    let clock = 0;
    const first = () => positionOf(bodies(scene), 0);
    const start = forest.ground[0]!.x;
    for (let f = 0; f < 60; f++, clock += 1 / 30) extra!.update(frame(start + 30, 0, clock));
    const before = first();
    expect(before.x).not.toBe(0);
    // He stands just to its left: it goes off to the right.
    for (let f = 0; f < 45; f++, clock += 1 / 30) extra!.update(frame(before.x - 0.8, before.y, clock));
    expect(first().x).toBeGreaterThan(before.x + 0.2);
  });

  it('stand still with less motion', () => {
    const { scene, extra } = make(forest);
    const start = forest.ground[0]!.x;
    extra!.update(frame(start + 30, 0, 0, { still: true }));
    const was = positionOf(bodies(scene), 0);
    for (let f = 1; f < 60; f++) extra!.update(frame(start + 30, 0, f / 30, { still: true }));
    expect(positionOf(bodies(scene), 0).distanceTo(was)).toBeLessThan(1e-9);
  });
});
