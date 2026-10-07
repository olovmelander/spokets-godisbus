import { AdditiveBlending, Color, Matrix4, Vector3, type InstancedMesh, type MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { byn } from '../../src/content/chapters/byn';
import { garden } from '../../src/content/chapters/garden';
import { DROP, SPLASH, createRain, dropShape, hanging } from '../../src/render/rain';
import { DROP_FALL, DROP_FROM, DROP_WARNING } from '../../src/sim/constants';
import type { ChapterData } from '../../src/sim/types';

/** The drips of a chapter as the simulation hands them over: no drop in the air, no shadow yet. */
const still = (chapter: ChapterData) => chapter.drips!.map((drip) => ({ x: drip.at.x, y: drip.at.y, shadow: 0, height: -1 }));

/** Where an instance of a mesh is, and how big. */
function pose(mesh: InstancedMesh, i: number) {
  const matrix = new Matrix4();
  mesh.getMatrixAt(i, matrix);
  return { at: new Vector3().setFromMatrixPosition(matrix), size: new Vector3().setFromMatrixScale(matrix) };
}

describe('a drop', () => {
  it('is drawn as a drop: round below, drawn up to a point, with its foot under its middle', () => {
    const shape = dropShape();
    shape.computeBoundingBox();
    const box = shape.boundingBox!;
    expect(box.min.y).toBeCloseTo(-DROP.foot, 3);
    expect(box.max.y).toBeCloseTo(DROP.top, 3);
    // As wide as its round foot: the widest of its faceted sides.
    expect(Math.max(box.max.x, box.max.z)).toBeCloseTo(DROP.foot, 3);
    // Its faces look out.
    shape.computeVertexNormals();
    const position = shape.getAttribute('position');
    const normal = shape.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      const out = new Vector3(position.getX(i), 0, position.getZ(i));
      if (out.length() > 0.05) expect(out.dot(new Vector3(normal.getX(i), 0, normal.getZ(i)))).toBeGreaterThan(0);
    }
  });

  it('hangs under an awning in Byn, and nowhere in the garden, where the dew falls from the birch', () => {
    expect(hanging(byn).every((tip) => tip !== null)).toBe(true);
    expect(hanging(garden).every((tip) => tip === null)).toBe(true);
  });

  it('hangs from its tip by its point and swells, then falls from there without a jump', () => {
    const rain = createRain(byn);
    const tip = hanging(byn)[0]!;
    const drips = still(byn);
    const letGo = 1 - DROP_FALL / DROP_WARNING;
    // Nothing is seen before its shadow begins.
    rain.update(drips, 0);
    expect(rain.drops.visible).toBe(false);
    let size = 0;
    for (const shadow of [0.1, 0.25, letGo - 1e-3]) {
      drips[0] = { ...drips[0]!, shadow };
      rain.update(drips, 1 / 60);
      const { at, size: grown } = pose(rain.drops, 0);
      expect(rain.drops.visible).toBe(true);
      expect(grown.y).toBeGreaterThan(size);
      size = grown.y;
      // It hangs by its point from the tip.
      expect(at.y + DROP.top * grown.y).toBeCloseTo(tip, 5);
    }
    const hanging_ = pose(rain.drops, 0).at.y;
    drips[0] = { ...drips[0]!, shadow: letGo, height: DROP_FROM };
    rain.update(drips, 1 / 60);
    expect(pose(rain.drops, 0).at.y).toBeCloseTo(hanging_, 2);
    // And it lands where the simulation says.
    drips[0] = { ...drips[0]!, shadow: 1, height: 0 };
    rain.update(drips, 1 / 60);
    expect(pose(rain.drops, 0).at.y).toBeCloseTo(byn.drips![0]!.at.y + DROP.foot, 5);
  });

  it('in the garden is seen only as it falls, from the height the simulation says', () => {
    const rain = createRain(garden);
    const drips = still(garden);
    drips[0] = { ...drips[0]!, shadow: 0.3 };
    rain.update(drips, 1 / 60);
    expect(rain.drops.visible).toBe(false);
    drips[0] = { ...drips[0]!, shadow: 0.5, height: DROP_FROM };
    rain.update(drips, 1 / 60);
    expect(rain.drops.visible).toBe(true);
    expect(pose(rain.drops, 0).at.y).toBeCloseTo(garden.drips![0]!.at.y + DROP_FROM + DROP.foot, 5);
  });
});

describe('a splash', () => {
  it('widens and fades as a ring where a drop lands, throws beads up, and is gone', () => {
    const rain = createRain(byn);
    const drips = still(byn);
    const ring = () => {
      const colour = new Color();
      rain.rings.getColorAt(0, colour);
      return { ...pose(rain.rings, 0), glint: colour.r };
    };
    drips[0] = { ...drips[0]!, shadow: 1, height: 0 };
    rain.update(drips, 1 / 60);
    expect(rain.rings.visible).toBe(false);
    drips[0] = { ...drips[0]!, shadow: 0, height: -1 };
    rain.update(drips, 1 / 60);
    expect(rain.rings.visible).toBe(true);
    expect(rain.beads.visible).toBe(true);
    const first = ring();
    expect(first.at.x).toBeCloseTo(byn.drips![0]!.at.x);
    expect(first.size.x).toBeGreaterThan(0);
    expect(first.glint).toBeGreaterThan(0);
    rain.update(drips, 0.2);
    const later = ring();
    expect(later.size.x).toBeGreaterThan(first.size.x);
    expect(later.size.x).toBeLessThanOrEqual(SPLASH.ring + 1e-6);
    expect(later.glint).toBeLessThan(first.glint);
    // The beads are in the air over where it landed.
    const bead = pose(rain.beads, 0);
    expect(bead.at.y).toBeGreaterThan(byn.drips![0]!.at.y);
    rain.update(drips, SPLASH.time);
    expect(rain.rings.visible).toBe(false);
    expect(rain.beads.visible).toBe(false);
  });

  it('stands still while the game is paused', () => {
    const rain = createRain(byn);
    const drips = still(byn);
    drips[0] = { ...drips[0]!, height: 0.2 };
    rain.update(drips, 1 / 60);
    drips[0] = { ...drips[0]!, height: -1 };
    rain.update(drips, 1 / 60);
    const before = pose(rain.rings, 0).size.x;
    for (let i = 0; i < 10; i++) rain.update(drips, 0);
    expect(pose(rain.rings, 0).size.x).toBe(before);
    expect(rain.rings.visible).toBe(true);
  });

  it('is a glint added to the ground, and each part of the rain is one draw', () => {
    const rain = createRain(byn);
    expect((rain.rings.material as MeshBasicMaterial).blending).toBe(AdditiveBlending);
    expect(rain.group.children).toHaveLength(4);
    expect(rain.beads.count).toBe(byn.drips!.length * SPLASH.beads);
    // The beads are water, the same as the drops: no other shader.
    expect(rain.beads.material).toBe(rain.drops.material);
  });
});
