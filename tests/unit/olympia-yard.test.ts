import { Box3, Mesh, Vector3, type BufferGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';
import { FEET, YARD, grassAt, landAt, yardAt, yardGround } from '../../src/content/aventyr2/olympia-yard';
import { landscape } from '../../src/render/dressing/kit';

// A canvas that draws nothing: the hedge's leaf atlas is a painted picture, and only its shape is tested.
const paint: object = new Proxy({}, { get: (_target, key) => key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => paint });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => paint }) });

/**
 * What Olympia's things stand on (Olov, 14 November 2026: "När man går till vänster i början av Olympia ser det ut som
 * om väggen, häcken eller vad det nu är som blockerar vägen svävar i luften utan kontakt med marken", and "Även
 * byggnaderna i bakgrunden ser ut att sväva i luften i stället för att stå på fast mark."). The place's ground is drawn
 * 30 EL back from the path: the store, the masts, the hall and the stand stood beyond it, over nothing. The wall at the
 * chapter's start was a block of earth whose front ended a length over the lane.
 */
describe("Olympia's yard, behind its pitch", () => {
  const buildings = olympia.storm!.buildings!;
  const pitch = buildings.find((b) => b.kind === 'pitch')!;
  /** How far behind the path the place's own ground is drawn (src/render/dressing/ground.ts, the lawn's profile). */
  const GROUND_BACK = -30;

  /** The yard's height at a place, read from its mesh: the highest triangle over (x, z), or null where there is none. */
  function meshHeight(geometry: BufferGeometry, x: number, z: number): number | null {
    const at = geometry.getAttribute('position');
    let best: number | null = null;
    const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
    for (let t = 0; t + 2 < at.count; t += 3) {
      a.fromBufferAttribute(at, t); b.fromBufferAttribute(at, t + 1); c.fromBufferAttribute(at, t + 2);
      if (Math.min(a.x, b.x, c.x) > x || Math.max(a.x, b.x, c.x) < x || Math.min(a.z, b.z, c.z) > z || Math.max(a.z, b.z, c.z) < z) continue;
      const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(d) < 1e-9) continue;
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
      const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const y = u * a.y + v * b.y + (1 - u - v) * c.y;
      best = best === null ? y : Math.max(best, y);
    }
    return best;
  }

  it('lies under every building behind the pitch: no foot of one is over nothing', () => {
    const geometry = yardGround(olympia);
    // Each thing's foot, across and back, as its model has it: the store, the hall, the stand, and the masts.
    const feet: { name: string; x0: number; x1: number; z0: number; z1: number }[] = [
      { name: 'the store', x0: FEET.store.x0, x1: FEET.store.x1, z0: FEET.store.back, z1: FEET.store.front },
      { name: 'the hall', x0: FEET.hall.x0, x1: FEET.hall.x1, z0: FEET.hall.back, z1: FEET.hall.ramp.front },
      { name: 'the stand', x0: FEET.stand.x0, x1: FEET.stand.x1, z0: FEET.stand.back, z1: FEET.stand.front },
      ...FEET.masts.map(([x, z], i) => ({ name: `mast ${i + 1}`, x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1 })),
    ];
    for (const foot of feet) {
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
        const [x, z] = [foot.x0 + ((foot.x1 - foot.x0) * i) / 6, foot.z0 + ((foot.z1 - foot.z0) * j) / 6];
        const y = meshHeight(geometry, x, z);
        // Behind where the place's own ground ends there was nothing at all.
        expect(y, `${foot.name} at ${x.toFixed(1)}, ${z.toFixed(1)}`).not.toBeNull();
        // The buildings stand at the hill's top (their feet at 0): the ground is there, to within a finger.
        expect(Math.abs(y!), `${foot.name} at ${x.toFixed(1)}, ${z.toFixed(1)}`).toBeLessThan(0.12);
      }
    }
  });

  it('knows the feet of the buildings the chapter has: each still stands where its foot is laid', () => {
    const store = buildings.find((b) => b.kind === 'store')!;
    const hall = buildings.find((b) => b.kind === 'clubhouse')!;
    const stand = buildings.find((b) => b.kind === 'stand')!;
    const masts = buildings.filter((b) => b.kind === 'floodlight');
    // The store is 22 across and 9 deep (art/blender/a2-buildings.py); the hall's block and the stand as art/blender/olympia.py has them.
    expect(FEET.store.x0).toBeCloseTo(store.x - 11, 5);
    expect(FEET.store.x1).toBeCloseTo(store.x + 11, 5);
    expect(FEET.store.front).toBeCloseTo(store.z + 4.5, 5);
    expect(FEET.hall.x0).toBeCloseTo(hall.x - 34, 5);
    expect(FEET.hall.x1).toBeCloseTo(hall.x + 29, 5);
    expect(FEET.hall.front).toBeCloseTo(hall.z + 6.8, 1);
    expect(FEET.stand.x0).toBeCloseTo(stand.x - 41, 5);
    expect(FEET.stand.front).toBeCloseTo(stand.z + 1.2, 5);
    expect(FEET.masts.map(([x, z]) => `${x},${z}`)).toEqual(masts.map((m) => `${m.x},${m.z}`));
    // The store, the hall and the masts stand wholly behind where the place's ground ends: this is why the yard is there.
    for (const front of [FEET.store.front, FEET.hall.ramp.front]) expect(front).toBeLessThanOrEqual(GROUND_BACK);
    for (const mast of masts) expect(mast.z).toBeLessThanOrEqual(GROUND_BACK);
    // No mast stands in the stand or in a building: each is clear of every foot by more than its own concrete.
    for (const mast of masts) {
      for (const foot of [FEET.store, FEET.hall, FEET.stand]) {
        const inside = mast.x > foot.x0 - 1.5 && mast.x < foot.x1 + 1.5 && mast.z > foot.back - 1.5 && mast.z < foot.front + 1.5;
        expect(inside, 'the mast at ' + mast.x + ', ' + mast.z).toBe(false);
      }
    }
  });

  it('begins under the pitch\'s far edge and over the ground, and goes on past everything a picture shows', () => {
    const geometry = yardGround(olympia);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const pitchBack = pitch.z - pitch.height!;
    // No gap between the turf and the yard, nor between the yard and the ground it lies on.
    expect(YARD.front).toBeGreaterThanOrEqual(pitchBack);
    expect(YARD.front).toBeGreaterThan(GROUND_BACK + 5);
    expect(box.max.z).toBeGreaterThanOrEqual(YARD.front);
    // The camera sees 140 EL: back to there, and far past both ends of the chapter.
    expect(box.min.z).toBeLessThan(-115);
    expect(box.min.x).toBeLessThan(olympia.ground[0]!.x - 40);
    expect(box.max.x).toBeGreaterThan(olympia.ground.at(-1)!.x + 20);
    // Its front edge stands over the ground's own gentle roll there, and has a face down to it.
    for (const x of [10, 40, 100, 160]) expect(yardAt(olympia, x, YARD.front)).toBeGreaterThan(0.2);
    expect(box.min.y).toBeLessThan(landAt(olympia, 0) - 0.5);
  });

  it('is whole over the flooded places, climbs the bank behind the lane, and follows the trail up into the forest', () => {
    const geometry = yardGround(olympia);
    // The pits are the pitch's puddles, not holes in the hill.
    for (const pool of olympia.water!) {
      const x = (pool.from + pool.to) / 2;
      expect(landAt(olympia, x)).toBe(0);
      expect(meshHeight(geometry, x, -40)).toBeCloseTo(0.03, 2);
    }
    // Behind the lane it is the lane's level at its foot and the hill's top by the store, rising all the way.
    const lane = olympia.spawn.y;
    expect(landAt(olympia, 0)).toBeCloseTo(lane, 1);
    let before = -Infinity;
    for (let z = YARD.front - 0.8; z >= -33; z -= 0.5) {
      const y = meshHeight(geometry, 0, z)!;
      expect(y).toBeGreaterThanOrEqual(before - 1e-6);
      before = y;
    }
    expect(meshHeight(geometry, 0, YARD.front - 0.8)!).toBeLessThan(lane + 0.6);
    expect(meshHeight(geometry, 0, -33)!).toBeCloseTo(0.03, 2);
    // Left of the lane too, under the hedge and beyond it.
    expect(meshHeight(geometry, -20, -40)!).toBeCloseTo(0.03, 2);
    // Up the trail it is the trail's height, and stays so to the end.
    const goal = olympia.goalX;
    const trail = landscape(olympia).ground.find((p) => p.x > 170 && p.y > 0)!.y;
    expect(meshHeight(geometry, goal + 1, -40)!).toBeCloseTo(trail + 0.03, 2);
    expect(meshHeight(geometry, olympia.ground.at(-1)!.x + 10, -40)!).toBeCloseTo(trail + 0.03, 2);
  });

  it('grows grass against the feet of the store, the hall, the stand and the masts, and on the bank', () => {
    const grass = grassAt(olympia);
    const near = (x0: number, x1: number, z: number) => grass.filter((g) => g.x >= x0 && g.x <= x1 && g.z > z && g.z < z + 0.8).length;
    expect(near(FEET.store.x0, FEET.store.x1, FEET.store.front)).toBeGreaterThan(8);
    expect(near(FEET.hall.x0, FEET.hall.ramp.x0, FEET.hall.front)).toBeGreaterThan(3);
    expect(near(FEET.stand.x0, FEET.stand.x1, FEET.stand.front)).toBeGreaterThan(15);
    for (const [x, z] of FEET.masts) expect(grass.filter((g) => Math.hypot(g.x - x, g.z - z) < 2.2).length).toBeGreaterThan(5);
    // None before the store's door, where the path comes.
    expect(near(FEET.store.door - 1, FEET.store.door + 1, FEET.store.front)).toBe(0);
    // Each stands on the yard.
    for (const g of grass) expect(g.y).toBeCloseTo(yardAt(olympia, g.x, g.z), 6);
    expect(grass.filter((g) => landAt(olympia, g.x) < -0.3).length).toBeGreaterThan(60);
  });
});

describe("Olympia's two ends (Olov, 14 November 2026)", () => {
  it('closes the way back with a tall hedge that stands on the ground, in place of a block of earth', async () => {
    const { hedge, hedgeGround } = await import('../../src/render/dressing/hedge');
    const start = olympia.ground[0]!;
    const lane = olympia.spawn.y - 0.01;
    // The outline begins with the wall he cannot pass, 17 EL high.
    expect(start.y - lane).toBeGreaterThan(15);
    expect(olympia.surfaces!.some((s) => s.kind === 'hedge' && s.to === start.x)).toBe(true);
    // The ground is drawn at the lane's level there, and on to the left of it: no block, no face ending in the air.
    const drawn = hedgeGround(landscape(olympia)).ground;
    expect(drawn[0]!.x).toBe(start.x);
    expect(drawn[0]!.y).toBeCloseTo(lane, 5);
    expect(Math.max(...drawn.filter((p) => p.x < 3).map((p) => p.y))).toBeCloseTo(lane, 5);
    // The hedge: from the wall on out of the picture to the left, from under the lane's level to where the wall's top was,
    // its face at the path and its end where he stands.
    const group = hedge(olympia)!;
    const box = new Box3();
    group.traverse((object) => { if ((object as Mesh).isMesh && object.name !== 'hedge-leaves') box.expandByObject(object); });
    expect(box.max.x).toBeLessThanOrEqual(start.x + 0.1);
    expect(box.max.x).toBeGreaterThan(start.x - 0.3);
    expect(box.min.x).toBeLessThan(start.x - 10);
    expect(box.min.y).toBeLessThan(lane);
    expect(box.max.y).toBeGreaterThan(start.y - 0.5);
    expect(box.max.z).toBeGreaterThan(0.2);
    expect(box.max.z).toBeLessThan(0.7);
    expect(box.min.z).toBeLessThan(-8);
    // Leaves all over it.
    const leaves = group.getObjectByName('hedge-leaves') as Mesh & { count: number };
    expect(leaves.count).toBeGreaterThan(1500);
  });

  it('has its far end out of every picture: the trail goes on level into the forest, well past where he runs at the goal', () => {
    const end = olympia.ground.at(-1)!;
    const before = olympia.ground.at(-2)!;
    // The wall is where the ground ends; the trail is level from its top to there.
    expect(before.x).toBe(end.x);
    const top = olympia.ground.find((p) => p.x > 170 && p.y > 1)!;
    for (const p of olympia.ground.filter((q) => q.x >= top.x && q !== end)) expect(p.y).toBe(top.y);
    // A child who runs on at the goal runs 3.5 EL a second while the last three lines are said and the tune closes (some
    // nine seconds), and the picture, drawn back, shows 15 EL ahead of him.
    expect(end.x - olympia.goalX).toBeGreaterThan(9 * 3.5 + 15);
    // The forest's floor, and so its trees, all that way; and the wide picture of the trail.
    expect(olympia.surfaces!.some((s) => s.kind === 'moss' && s.from <= top.x && s.to >= end.x + 12)).toBe(true);
    expect(olympia.cameras!.some((c) => c.from <= olympia.goalX && c.to >= end.x)).toBe(true);
  });
});
