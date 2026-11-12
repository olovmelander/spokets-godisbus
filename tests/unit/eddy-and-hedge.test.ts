import { Box3, Group, Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';

// A canvas that draws nothing: the foam and the leaf atlas are painted pictures, and only their shapes are tested.
const paint: object = new Proxy({}, { get: (_target, key) => key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => paint });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => paint }) });

describe("Granskogen's eddy (Olov, 12 November 2026: it looked like a dry pit to walk in)", () => {
  it('turns its water, only where a stretch is marked as an eddy', async () => {
    const { createEddy } = await import('../../src/render/eddy');
    expect(createEddy(garden)).toBeNull();
    const eddy = createEddy(granskog)!;
    const foam = eddy.group.getObjectByName('eddy-foam') as Mesh;
    const pool = granskog.water!.find((water) => water.eddy)!;
    expect(foam.position.x).toBeCloseTo((pool.from + pool.to) / 2);
    expect(foam.position.y).toBeGreaterThan(pool.y);
    const before = foam.rotation.z;
    const movers = granskog.movers!.map((def) => ({ x: def.stops[0]!.x, y: def.stops[0]!.y, stop: 0, t: 1 }));
    const meshes = granskog.movers!.map(() => new Group());
    eddy.update(movers, meshes, 2, false);
    expect(foam.rotation.z).not.toBe(before);
  });

  it('floats the leaf the ghost waits on in the surface, and lets it come straight as it is pulled out', async () => {
    const { createEddy } = await import('../../src/render/eddy');
    const eddy = createEddy(granskog)!;
    const seat = granskog.movers!.findIndex((def) => def.id === 'rescue');
    const movers = granskog.movers!.map((def) => ({ x: def.stops[0]!.x, y: def.stops[0]!.y, stop: 0, t: 1 }));
    const meshes = granskog.movers!.map((_, i) => { const mesh = new Group(); mesh.position.set(movers[i]!.x, movers[i]!.y, 0); return mesh; });
    const lift = eddy.update(movers, meshes, 1, false);
    expect(lift).toBeGreaterThan(0.04);
    expect(meshes[seat]!.position.y).toBeCloseTo(movers[seat]!.y + lift);
    // Only the leaf the ghost sits on: the other things on rails are drawn where the simulation has them.
    for (const [i, mesh] of meshes.entries()) if (i !== seat) expect(mesh.position.y).toBe(movers[i]!.y);
    // Pulled up, it rides no higher than the simulation has it.
    movers[seat] = { ...movers[seat]!, stop: 1, t: 0.4 };
    meshes[seat]!.position.y = movers[seat]!.y;
    expect(eddy.update(movers, meshes, 1.1, false)).toBe(0);
    expect(meshes[seat]!.position.y).toBe(movers[seat]!.y);
  });

  it('keeps the leaf awash under the water\'s reach, so a jump down to it is a fall into the water', async () => {
    const { WATER_REACH } = await import('../../src/sim/constants');
    const leaf = granskog.movers!.find((def) => def.id === 'rescue')!;
    const pool = granskog.water!.find((water) => water.eddy)!;
    const top = leaf.stops[0]!.y + leaf.height;
    expect(top).toBeGreaterThan(pool.y);
    expect(top + 0.016).toBeLessThan(pool.y + WATER_REACH);
  });
});

describe('the hedge at the end of both gardens (Olov, 12 November 2026)', () => {
  it('draws Gården\'s end as a tall leafy hedge, as Stormgården\'s, and no wall of earth', async () => {
    const { hedge, hedgeGround } = await import('../../src/render/dressing/hedge');
    for (const chapter of [garden, stormgard]) {
      const end = chapter.ground.at(-1)!;
      const group = hedge(chapter)!;
      const box = new Box3();
      group.traverse((object) => { if ((object as Mesh).isMesh && object.name !== 'hedge-leaves') box.expandByObject(object); });
      expect(box.max.x, chapter.id).toBeGreaterThan(end.x + 5);
      expect(box.max.y, chapter.id).toBeGreaterThan(end.y - 0.5);
      // The ground behind it is drawn at the hedge's foot: no cliff of soil shows through the leaves.
      expect(hedgeGround(chapter).ground.at(-1)!.y, chapter.id).toBeLessThan(end.y - 5);
    }
  });
});
