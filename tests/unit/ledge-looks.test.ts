import { Matrix4, Vector3, type InstancedMesh, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { LEDGE_LOOKS, buildLedges, ledgePlaces } from '../../src/render/ledges';
import { rods, type Rod } from '../../src/render/lines';
import { LEDGE_REACH } from '../../src/sim/constants';
import type { Ledge } from '../../src/sim/types';

const size = (mesh: InstancedMesh, slot: number) => {
  const matrix = new Matrix4();
  mesh.getMatrixAt(slot, matrix);
  return new Vector3().setFromMatrixScale(matrix);
};
const box = (mesh: Mesh) => {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!;
};

describe('the ledges, as they are drawn', () => {
  it('a place is one mesh: its ledges of every look, as wide as they are, and the rods its rings hang from', () => {
    const ledges: Ledge[] = LEDGE_LOOKS.map((look, i) => ({ x: i * 3, y: 1, width: 2, look }));
    const rod: Rod = { from: { x: 4, y: 3 }, to: { x: 4, y: 6 }, thick: 0.02 };
    const built = buildLedges(ledges, [rod]);
    expect(built.group.children).toHaveLength(1);
    const mesh = built.group.children[0] as Mesh;
    expect((mesh as unknown as InstancedMesh).isInstancedMesh).toBeUndefined();
    expect(mesh.userData.ledges).toEqual(ledges.map((_, i) => i));
    expect(mesh.userData.rods).toBe(1);
    // From the first ledge's near edge, past the last one's middle, and up past the top of the rod: a bough's
    // stem goes on up out of every picture.
    expect(box(mesh).min.x).toBeLessThanOrEqual(-1);
    expect(box(mesh).min.x).toBeGreaterThan(-1.3);
    expect(box(mesh).max.x).toBeGreaterThanOrEqual((LEDGE_LOOKS.length - 1) * 3 + 1);
    expect(box(mesh).max.y).toBeGreaterThan(6);
    // Every corner has its colour: the looks are told apart by that, in one material.
    expect(mesh.geometry.getAttribute('color').count).toBe(mesh.geometry.getAttribute('position').count);
    // One ledge alone is as wide as it says.
    for (const look of LEDGE_LOOKS) {
      const one = buildLedges([{ x: 0, y: 0, width: 2, look }]).group.children[0] as Mesh;
      expect(box(one).max.x - box(one).min.x, look).toBeGreaterThan(1.9);
      expect(box(one).max.x - box(one).min.x, look).toBeLessThan(2.3);
    }
  });

  it('places far apart are meshes of their own, each drawn only while it is in sight', () => {
    const ledges: Ledge[] = [{ x: 0, y: 1, width: 2, look: 'plank' }, { x: 3, y: 2, width: 2, look: 'leaf' }, { x: 60, y: 2, width: 2, look: 'stone' }];
    const rod: Rod = { from: { x: 62, y: 3 }, to: { x: 66, y: 3 }, thick: 0.02 };
    expect(ledgePlaces(ledges, [rod])).toEqual([{ ledges: [0, 1], rods: [] }, { ledges: [2], rods: [rod] }]);
    const built = buildLedges(ledges, [rod]);
    expect(built.group.children).toHaveLength(2);
    for (const [n, mesh] of (built.group.children as Mesh[]).entries()) {
      expect(mesh.frustumCulled).toBe(true);
      const sphere = mesh.geometry.boundingSphere!;
      // What holds a ledge goes far down, and nothing of the other place is inside.
      expect(sphere.radius).toBeLessThan(12);
      expect(Math.abs(sphere.center.x - (n === 0 ? 1.5 : 63))).toBeLessThan(3);
    }
    // A rod with no ledge near it is a place too: a ring on a cord over the trail.
    expect(buildLedges([], [rod]).group.children).toHaveLength(1);
  });

  it('nothing floats: a stalk, a stem, a pillar or legs go down from a ledge into the ground, and a plank has its batten', () => {
    for (const look of LEDGE_LOOKS) {
      const shape = box(buildLedges([{ x: 0, y: 0, width: 1.5, look }]).group.children[0] as Mesh);
      // Its top is the ledge's top (a stem goes on above it), and what holds it reaches below the ledge.
      expect(shape.max.y, look).toBeGreaterThanOrEqual(-0.001);
      expect(shape.min.y, look).toBeLessThan(look === 'plank' ? -0.3 : -10);
      // Nothing of it stands in front of the plane he moves in.
      expect(shape.max.z, look).toBeLessThanOrEqual(0.001);
    }
  });

  it("what holds a ledge is drawn at its own size, not as wide as the ledge: a bough's stem is no board", () => {
    for (const look of ['branch', 'bark', 'leaf'] as const) {
      const narrow = box(buildLedges([{ x: 0, y: 0, width: 1, look }]).group.children[0] as Mesh);
      const wide = box(buildLedges([{ x: 0, y: 0, width: 4, look }]).group.children[0] as Mesh);
      // Under the ledge only the stem is there: it is as thin under a wide ledge as under a narrow one.
      const under = (width: number) => {
        const mesh = buildLedges([{ x: 0, y: 0, width, look }]).group.children[0] as Mesh;
        const at = mesh.geometry.getAttribute('position');
        let reach = 0;
        for (let i = 0; i < at.count; i++) if (at.getY(i) < -2) reach = Math.max(reach, Math.abs(at.getX(i)));
        return reach;
      };
      expect(under(4), look).toBeCloseTo(under(1), 6);
      expect(under(4), look).toBeLessThan(0.45);
      expect(wide.max.x - wide.min.x, look).toBeGreaterThan(narrow.max.x - narrow.min.x + 2.5);
    }
  });

  it("a bough is spruce in the forest, a dead pine's in the bog and a birch's in the garden", () => {
    const colours = (place: 'forest' | 'bog' | 'garden') => {
      const mesh = buildLedges([{ x: 0, y: 0, width: 3, look: 'branch' }], [], place).group.children[0] as Mesh;
      const colour = mesh.geometry.getAttribute('color');
      let green = 0;
      let yellow = 0;
      for (let i = 0; i < colour.count; i++) {
        const [r, g, b] = [colour.getX(i), colour.getY(i), colour.getZ(i)];
        if (g > r * 1.5 && g > b * 1.5) green++;
        if (r > 0.5 && g > 0.35 && b < 0.1) yellow++;
      }
      // How warm the bough itself is: brown bark against grey dead wood.
      return { green, yellow, warmth: colour.getX(0) - colour.getZ(0) };
    };
    expect(colours('forest').green).toBeGreaterThan(50);
    expect(colours('forest').yellow).toBe(0);
    expect(colours('bog').green).toBe(0);
    expect(colours('bog').warmth).toBeLessThan(colours('forest').warmth * 0.6);
    // The birch's leaves: green, and the first of them yellow.
    expect(colours('garden').green).toBeGreaterThan(20);
    expect(colours('garden').yellow).toBeGreaterThan(0);
  });

  it('what hangs from a bough or stands out from a stem is under the line where he stands, and behind him', () => {
    for (const place of ['forest', 'bog', 'garden'] as const) {
      for (const look of ['branch', 'bark'] as const) {
        const at = (buildLedges([{ x: 0, y: 0, width: 2.5, look }], [], place).group.children[0] as Mesh).geometry.getAttribute('position');
        for (let i = 0; i < at.count; i++) {
          // Only the stem goes on up, out of every picture.
          if (Math.abs(at.getX(i)) > 0.35) expect(at.getY(i), `${look} in the ${place}`).toBeLessThanOrEqual(0.001);
          expect(at.getZ(i), `${look} in the ${place}`).toBeLessThanOrEqual(0.001);
        }
      }
    }
  });

  it("the bark look is a bracket fungus with its bands on its corners: the spruce's red-belted, the birch's pale", () => {
    const fungus = (place: 'forest' | 'garden') => {
      const mesh = buildLedges([{ x: 0, y: 0, width: 1.4, look: 'bark' }], [], place).group.children[0] as Mesh;
      const at = mesh.geometry.getAttribute('position');
      const colour = mesh.geometry.getAttribute('color');
      let rust = 0;
      let cream = 0;
      // How far forward it comes out beside the stem, where a half round would be 0.27 behind its front edge.
      let out = -Infinity;
      for (let i = 0; i < colour.count; i++) {
        const [r, g, b] = [colour.getX(i), colour.getY(i), colour.getZ(i)];
        if (r > g * 2 && r > b * 3) rust++;
        if (r > 0.75 && g > 0.65 && b > 0.45) cream++;
        if (Math.abs(at.getX(i)) > 0.5) out = Math.max(out, at.getZ(i));
      }
      return { rust, cream, out };
    };
    expect(fungus('forest').rust).toBeGreaterThan(0);
    expect(fungus('forest').cream).toBeGreaterThan(0);
    expect(fungus('garden').rust).toBe(0);
    expect(fungus('garden').cream).toBeGreaterThan(0);
    expect(fungus('forest').out).toBeGreaterThan(-0.27);
  });

  it('a chapter without ledges draws nothing for them', () => {
    expect(buildLedges([]).group.children).toHaveLength(0);
  });

  it('a ledge that waits for a flag has no size until the flag is set, and then grows out', () => {
    const built = buildLedges([{ x: 0, y: 1, width: 2, look: 'plank', needs: 'laid' }, { x: 3, y: 1, width: 2, look: 'plank' }]);
    // The one that is always there is in the place's shape; the one that waits is an instance beside it.
    expect((built.group.getObjectByName('ledges:0') as Mesh).userData.ledges).toEqual([1]);
    const mesh = built.group.getObjectByName('ledges:0:plank') as InstancedMesh;
    expect(mesh.count).toBe(1);
    expect(size(mesh, 0).x).toBe(0);
    built.update(new Set(), 0.1);
    expect(size(mesh, 0).x).toBe(0);
    built.update(new Set(['laid']), 0.1);
    expect(size(mesh, 0).x).toBeGreaterThan(0);
    expect(size(mesh, 0).x).toBeLessThan(2);
    for (let i = 0; i < 10; i++) built.update(new Set(['laid']), 0.1);
    expect(size(mesh, 0).x).toBeCloseTo(2);
    // Grown, it is as large as its ledge for the picture's eye too.
    expect(mesh.boundingSphere!.radius).toBeGreaterThan(0.9);
  });

  it('in every chapter a side way costs the picture one mesh, and one more for each look that waits for a flag', () => {
    for (const chapter of [...STORY, ...BONUS]) {
      const ledges = chapter.ledges ?? [];
      const places = ledgePlaces(ledges, rods(chapter));
      const built = buildLedges(ledges, rods(chapter));
      const waiting = places.reduce((sum, place) => sum + new Set(place.ledges.filter((i) => ledges[i]!.needs !== undefined).map((i) => ledges[i]!.look)).size, 0);
      const always = places.filter((place) => place.rods.length > 0 || place.ledges.some((i) => ledges[i]!.needs === undefined)).length;
      expect(built.group.children, chapter.id).toHaveLength(always + waiting);
      // No place is so long that it is in sight from half the chapter away.
      for (const mesh of built.group.children as Mesh[]) {
        if (mesh.geometry.boundingSphere) expect(mesh.geometry.boundingSphere.radius, `${chapter.id}, ${mesh.name}`).toBeLessThan(32);
      }
    }
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
