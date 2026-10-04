import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { LEDGE_LOOKS, buildLedges } from '../../src/render/ledges';
import { LEDGE_REACH } from '../../src/sim/constants';
import type { Ledge } from '../../src/sim/types';

const size = (mesh: InstancedMesh, slot: number) => {
  const matrix = new Matrix4();
  mesh.getMatrixAt(slot, matrix);
  return new Vector3().setFromMatrixScale(matrix);
};

describe('the ledges, as they are drawn', () => {
  it('every look builds something, and all ledges of one look are one mesh', () => {
    const ledges: Ledge[] = LEDGE_LOOKS.flatMap((look, i) => [{ x: i * 3, y: 1, width: 2, look }, { x: i * 3 + 1, y: 2, width: 1, look }]);
    const built = buildLedges(ledges);
    expect(built.group.children).toHaveLength(LEDGE_LOOKS.length);
    for (const mesh of built.group.children as InstancedMesh[]) {
      expect(mesh.count).toBe(2);
      expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(8);
      // As wide as the ledge it draws.
      expect(size(mesh, 0).x).toBeCloseTo(2);
      expect(size(mesh, 1).x).toBeCloseTo(1);
    }
  });

  it('nothing floats: a stalk, a stem or a pillar goes down from its ledge into the ground, and a plank has its batten', () => {
    const built = buildLedges(LEDGE_LOOKS.map((look, i) => ({ x: i * 3, y: 1, width: 1.5, look })));
    for (const look of LEDGE_LOOKS) {
      const shape = (built.group.getObjectByName(`ledges:${look}`) as InstancedMesh).geometry;
      shape.computeBoundingBox();
      // Its top is the ledge's top (a stem goes on above it), and what holds it reaches below the ledge.
      expect(shape.boundingBox!.max.y, look).toBeGreaterThanOrEqual(-0.001);
      expect(shape.boundingBox!.min.y, look).toBeLessThan(look === 'plank' ? -0.3 : -10);
      // Nothing of it stands in front of the plane he moves in.
      expect(shape.boundingBox!.max.z, look).toBeLessThanOrEqual(0.001);
    }
  });

  it('a chapter without ledges draws nothing for them', () => {
    expect(buildLedges([]).group.children).toHaveLength(0);
  });

  it('a ledge that waits for a flag has no size until the flag is set, and then grows out', () => {
    const built = buildLedges([{ x: 0, y: 1, width: 2, look: 'plank', needs: 'laid' }, { x: 3, y: 1, width: 2, look: 'plank' }]);
    const mesh = built.group.getObjectByName('ledges:plank') as InstancedMesh;
    expect(size(mesh, 0).x).toBe(0);
    expect(size(mesh, 1).x).toBeCloseTo(2);
    built.update(new Set(), 0.1);
    expect(size(mesh, 0).x).toBe(0);
    built.update(new Set(['laid']), 0.1);
    expect(size(mesh, 0).x).toBeGreaterThan(0);
    expect(size(mesh, 0).x).toBeLessThan(2);
    for (let i = 0; i < 10; i++) built.update(new Set(['laid']), 0.1);
    expect(size(mesh, 0).x).toBeCloseTo(2);
  });
});

describe('the ledges of the chapters', () => {
  const chapters = [...STORY, ...BONUS];

  it('each is wide enough to land on and to take a step on', () => {
    for (const chapter of chapters) {
      for (const ledge of chapter.ledges ?? []) {
        expect(ledge.width, `${chapter.id}: ledge at ${ledge.x},${ledge.y}`).toBeGreaterThanOrEqual(0.9);
      }
    }
  });

  it('no two of them lie on top of each other', () => {
    for (const chapter of chapters) {
      const ledges = chapter.ledges ?? [];
      for (const [i, a] of ledges.entries()) {
        for (const b of ledges.slice(i + 1)) {
          const apart = Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || Math.abs(a.y - b.y) >= 0.5;
          expect(apart, `${chapter.id}: ledges at ${a.x},${a.y} and ${b.x},${b.y}`).toBe(true);
        }
      }
    }
  });

  it('none is a low ceiling over a big candy: where the game puts him back, he has room', () => {
    for (const chapter of chapters) {
      for (const big of chapter.checkpoints ?? []) {
        for (const ledge of chapter.ledges ?? []) {
          const over = Math.abs(ledge.x - big.x) < ledge.width / 2 + 0.5 && ledge.y > big.y && ledge.y - big.y < LEDGE_REACH;
          // A ledge is no ceiling for him, but the big candy stands 1.6 EL tall and should not be drawn through one.
          expect(over && ledge.y - big.y < 1.7, `${chapter.id}: ledge at ${ledge.x},${ledge.y} over the big candy at ${big.x}`).toBe(false);
        }
      }
    }
  });
});
