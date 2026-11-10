import { Color, DirectionalLight, HemisphereLight, InstancedMesh, Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import '../../src/content/aventyr2/render';
import { PACK } from '../../src/render/extensions';
import { RAIN_ANGLE, RAIN_SLANT, rainDropAt, rainLandingAt, rainStreakAlpha } from '../../src/content/aventyr2/storm-rain';

beforeAll(() => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : fake, apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
});
afterAll(() => vi.unstubAllGlobals());
const positions = (mesh: InstancedMesh) => Array.from({ length: mesh.count }, (_, i) => { const m = new Matrix4(); mesh.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m).toArray(); });

describe('rain stays in the world throughout the second adventure', () => {
  for (const chapter of AVENTYR2.filter(chapter => chapter.storm)) it(`${chapter.id}: moving the camera does not drag any active ground ring`, () => {
    const scene = new Scene(), camera = new PerspectiveCamera(); camera.position.set(Math.max(chapter.spawn.x + 12, (chapter.outdoors ?? 0) + 20), chapter.spawn.y + 3, 15);
    const effects = PACK.extras.map(make => make({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() })).filter(effect => effect !== null);
    const frame = { dt: .016, clock: 3.2, flags: new Set<string>(), x: camera.position.x, y: 0, camera, still: false, tier: 'high' as const, riding: false };
    effects.forEach(effect => effect.update(frame));
    const rings = scene.getObjectByName('storm-rain-landings') as InstancedMesh;
    expect(rings).toBeDefined(); expect(rings.count).toBe(36);
    const before = positions(rings);
    camera.position.x += 2.8; camera.position.y += 1.2;
    effects.forEach(effect => effect.update({ ...frame, dt: 0, x: camera.position.x }));
    expect(positions(rings)).toEqual(before);
    // The actual instanced streak's upward tail must oppose its down/right movement.
    const drops = scene.getObjectByName('storm-rain-drops') as InstancedMesh, matrix = new Matrix4(); drops.getMatrixAt(0, matrix);
    const up = new Vector3(0, 1, 0).transformDirection(matrix);
    expect(up.x).toBeLessThan(0); expect(up.y).toBeGreaterThan(0);
    expect(-up.x / up.y).toBeCloseTo(RAIN_SLANT, 5);
    scene.traverse(object => { const mesh = object as InstancedMesh; mesh.geometry?.dispose(); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose(); });
  });
  it('keeps the impact anchored while its ring grows, and chooses a fresh point only at a new impact', () => {
    const seed = { x: 2, z: -.4, phase: .1, every: 1 };
    const born = rainLandingAt(seed, 3, 0, 80);
    const older = rainLandingAt(seed, 3, .5, 84, born);
    expect(older.x).toBe(born.x); expect(older.z).toBe(born.z); expect(older.age).toBeGreaterThan(born.age);
    const next = rainLandingAt(seed, 3, 1.1, 84, older);
    expect(next.cycle).toBeGreaterThan(older.cycle); expect(next.x).not.toBe(older.x);
  });
  it('drops move downwind and down, independently of an in-bounds camera move, and have a fading upwind tail', () => {
    const seed = { x: 2, y: 5, speed: 15 };
    const a = rainDropAt(seed, 0, 0, 0), b = rainDropAt(seed, .1, 0, 0), moved = rainDropAt(seed, .1, 2, 1);
    expect(moved).toEqual(b); expect(b.y).toBeLessThan(a.y); expect(b.x).toBeGreaterThan(a.x);
    expect((b.x-a.x)/(a.y-b.y)).toBeCloseTo(Math.tan(RAIN_ANGLE), 8);
    expect(rainStreakAlpha(.15)).toBeGreaterThan(rainStreakAlpha(.85) * 5);
    expect(rainStreakAlpha(0)).toBe(0); expect(rainStreakAlpha(1)).toBe(0);
  });
});
