import {
  Color, DirectionalLight, HemisphereLight, InstancedMesh, Matrix4, PerspectiveCamera, Scene, Vector3, type BufferAttribute, type Group, type Material,
} from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, BONUS, COURSES, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES, dress } from '../../src/render/dressing';
import type { ExtraFrame, ViewExtra } from '../../src/render/extensions';
import { flora, SHARE } from '../../src/render/lift/flora';
import { MUSHROOM_INKS, clearOfCandy } from '../../src/render/lift/flora/floor';
import { MUSH_BREATH, PLANT } from '../../src/render/lift/flora/light';
import { SHAPES, TOP, pictureTop } from '../../src/render/lift/flora/trees';
import { WHIRL } from '../../src/render/lift/flora/whirl';
import { WIND, bendAt, setPlayer, setWind, windAt } from '../../src/render/wind';
import type { ChapterData } from '../../src/sim/types';

/** The flora of the visual upgrade (src/render/lift/flora.ts): crowns, ferns, moss, mushrooms, bending, whirling leaves. */

let chapters: ChapterData[] = [];
interface Built { scene: Scene; group: Group; dressing: Group | null; extra: ViewExtra | null }
const built = new Map<string, Built>();

beforeAll(async () => {
  // The dressing and the atlas draw on canvases: there are none here, and what they would hold is not needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
  chapters = [...STORY, ...BONUS, ...ADVENTURE2, COURSES['look-forest']!, COURSES['look-deck']!, COURSES['look-street']!];
  for (const chapter of chapters) {
    const scene = new Scene();
    const dressing = chapter.place ? dress(chapter, PLACES[chapter.place]) : null;
    if (dressing) scene.add(dressing.group);
    const extra = flora({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight(), place: chapter.place ? PLACES[chapter.place] : null, dressing: dressing?.group ?? null });
    built.set(chapter.id, { scene, group: scene.getObjectByName('flora') as Group, dressing: dressing?.group ?? null, extra });
  }
}, 180000);
afterAll(() => vi.unstubAllGlobals());

const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);
function frame(chapter: ChapterData, x: number, over: Partial<ExtraFrame> = {}): ExtraFrame {
  const y = chapter.ground.find((p, i) => x >= p.x && x <= (chapter.ground[i + 1]?.x ?? Infinity))?.y ?? 0;
  return { dt: 1 / 30, clock: 0, flags: new Set(), x, y, camera, still: false, tier: 'high', riding: false, darkness: 0, vx: 0, vy: 0, facing: 1, grounded: true, mode: 'free', ...over };
}
const meshes = (group: Group | undefined) => (group?.children ?? []).filter((c): c is InstancedMesh => (c as InstancedMesh).isInstancedMesh);
const matrix = new Matrix4();
const at = new Vector3();
const positions = (mesh: InstancedMesh, count = mesh.count) => Array.from({ length: count }, (_, i) => {
  mesh.getMatrixAt(i, matrix);
  return at.setFromMatrixPosition(matrix).clone();
});

/** Red, pink and gold are the candy's and the hook's (tests/unit/life.test.ts): never a plant's. */
function candyColoured(r: number, g: number, b: number): boolean {
  const most = Math.max(r, g, b);
  const chroma = most - Math.min(r, g, b);
  if (chroma <= 40) return false;
  if (chroma > 120) return true;
  const hue = 60 * (most === r ? ((g - b) / chroma + 6) % 6 : most === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4);
  return hue < 30 || hue > 270;
}
const srgb = (c: Color) => c.clone().convertLinearToSRGB().toArray().map((v) => Math.round(v * 255)) as [number, number, number];

describe('the flora', () => {
  it('builds for every chapter of both adventures, and walks through each without trouble', () => {
    expect(chapters.length).toBeGreaterThan(20);
    for (const chapter of chapters) {
      const { extra, group } = built.get(chapter.id)!;
      if (!chapter.place) continue;
      expect(extra, chapter.id).not.toBeNull();
      expect(group, chapter.id).toBeDefined();
      const from = chapter.ground[0]!.x;
      const to = chapter.ground[chapter.ground.length - 1]!.x;
      for (let x = from; x <= to; x += 0.5) extra!.update(frame(chapter, x, { vx: 3.5, clock: x }));
    }
  });

  it('gives every place out of doors its plants, and the garden-places and the village their birches', () => {
    for (const id of ['garden', 'stormgard', 'olympia', 'billsta', 'byn']) {
      const names = meshes(built.get(id)!.group).map((m) => m.name);
      expect(names, id).toContain('flora-birchBoughs');
    }
    for (const id of ['granskog', 'stormskog', 'alven']) {
      const names = meshes(built.get(id)!.group).map((m) => m.name);
      for (const kind of ['flora-spruceBoughs', 'flora-pine', 'flora-spruce', 'flora-ferns', 'flora-mushrooms']) expect(names, id).toContain(kind);
    }
    for (const id of ['garden', 'stormgard', 'billsta']) expect(meshes(built.get(id)!.group).map((m) => m.name), id).toContain('flora-birch');
    for (const id of ['myren', 'berget']) expect(meshes(built.get(id)!.group).map((m) => m.name), id).toContain('flora-pine');
    expect(meshes(built.get('berget')!.group).map((m) => m.name)).toContain('flora-moss');
    // Indoors nothing grows.
    for (const id of ['prolog', 'epilog', 'stormkvall', 'morgonen']) {
      expect(meshes(built.get(id)!.group), id).toEqual([]);
    }
  });

  it('puts nothing new in front of his path: all of it stands behind the play plane', () => {
    for (const chapter of chapters) {
      for (const mesh of meshes(built.get(chapter.id)?.group)) {
        if (mesh.name === 'flora-whirl') continue;
        for (const p of positions(mesh, mesh.instanceMatrix.count)) expect(p.z, `${chapter.id} ${mesh.name}`).toBeLessThan(-0.8);
      }
      // The dressing's tall grass, too.
      built.get(chapter.id)!.dressing?.traverse((object) => {
        const tall = object.userData.tall as [number, number] | undefined;
        if (!tall) return;
        const mesh = object as InstancedMesh;
        for (let i = tall[0]; i < tall[0] + tall[1]; i++) {
          mesh.getMatrixAt(i, matrix);
          expect(at.setFromMatrixPosition(matrix).z, `${chapter.id} tall grass`).toBeLessThan(-0.6);
        }
      });
    }
  });

  it('never grows a mushroom near a candy: 1.5 EL at the least', () => {
    let any = 0;
    for (const chapter of chapters) {
      const mesh = meshes(built.get(chapter.id)?.group).find((m) => m.name === 'flora-mushrooms');
      if (!mesh) continue;
      for (const p of positions(mesh, mesh.instanceMatrix.count)) {
        any++;
        for (const candy of [...chapter.candy, ...(chapter.side ?? [])]) {
          expect(Math.hypot(candy.x - p.x, candy.y - p.y), `${chapter.id} at ${p.x.toFixed(1)}`).toBeGreaterThanOrEqual(1.5);
        }
      }
      expect(clearOfCandy(chapter, chapter.candy[0]!.x, chapter.candy[0]!.y)).toBe(false);
    }
    expect(any).toBeGreaterThan(40);
  });

  it('has no colour of red, pink or gold in its leaves, needles, ferns, grass, moss or mushrooms', () => {
    const seen = new Set<string>();
    for (const ink of MUSHROOM_INKS) expect(candyColoured(...srgb(new Color(ink))), ink).toBe(false);
    const c = new Color();
    const tint = new Color();
    for (const chapter of chapters) {
      for (const mesh of meshes(built.get(chapter.id)?.group)) {
        const colour = mesh.geometry.getAttribute('color') as BufferAttribute | undefined;
        for (let i = 0; i < mesh.instanceMatrix.count; i++) {
          if (mesh.instanceColor) tint.fromBufferAttribute(mesh.instanceColor, i);
          else tint.setRGB(1, 1, 1);
          for (let v = 0; v < (colour?.count ?? 1); v += 7) {
            c.copy(tint);
            if (colour) c.multiply(new Color().fromBufferAttribute(colour, v));
            const ink = srgb(c);
            const key = ink.join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            expect(candyColoured(...ink), `${chapter.id} ${mesh.name} ${key}`).toBe(false);
          }
        }
      }
      built.get(chapter.id)!.dressing?.traverse((object) => {
        const tall = object.userData.tall as [number, number] | undefined;
        const mesh = object as InstancedMesh;
        for (let i = tall?.[0] ?? 0; tall && i < tall[0] + tall[1]; i++) expect(candyColoured(...srgb(tint.fromBufferAttribute(mesh.instanceColor!, i))), `${chapter.id} tall grass`).toBe(false);
      });
    }
    expect(seen.size).toBeGreaterThan(50);
  });

  it('makes every leaf one program, and the mushrooms one more', () => {
    const keys = new Set<string>();
    for (const chapter of chapters) {
      for (const mesh of meshes(built.get(chapter.id)?.group)) {
        const material = mesh.material as Material;
        if (mesh.name !== 'flora-mushrooms' && mesh.name !== 'flora-moss') keys.add(`${material.type}:${material.customProgramCacheKey()}:${material.side}:${(material as { alphaTest: number }).alphaTest > 0}`);
      }
    }
    expect([...keys]).toHaveLength(1);
    expect([...keys][0]).toContain('wind-v1');
    expect([...keys][0]).toContain('leaf-v1');
  });

  it('counts down with the tier: 60 % on Mid and all on High; Low draws only the boughs of the trunks that were there', () => {
    const chapter = COURSES['granskog']!;
    const { extra, group } = built.get(chapter.id)!;
    const ferns = meshes(group).find((m) => m.name === 'flora-ferns')!;
    const all = ferns.instanceMatrix.count;
    extra!.update(frame(chapter, 20, { tier: 'mid' }));
    expect(ferns.count).toBe(Math.round(all * SHARE.mid));
    extra!.update(frame(chapter, 20, { tier: 'high' }));
    expect(ferns.count).toBe(all);
    for (const mesh of meshes(group)) expect(mesh.userData.rich === true, mesh.name).toBe(mesh.name !== 'flora-spruceBoughs' && mesh.name !== 'flora-birchBoughs');
    // The dressing's tall grass too, which every tier draws, as it was.
    let tall = 0;
    built.get(chapter.id)!.dressing!.traverse((object) => {
      const t = object.userData.tall as [number, number] | undefined;
      if (!t || t[1] < 10) return;
      tall++;
      extra!.update(frame(chapter, 20, { tier: 'low' }));
      expect((object as InstancedMesh).count).toBe(t[0] + Math.round(t[1] * SHARE.low));
      extra!.update(frame(chapter, 20, { tier: 'high' }));
      expect((object as InstancedMesh).count).toBe(t[0] + t[1]);
    });
    expect(tall).toBeGreaterThan(3);
  });

  it('fills a birch to its middle: leaves all through its crown, not a ring of them round the sky', () => {
    const shape = SHAPES.birch();
    const position = shape.getAttribute('position');
    const index = shape.getIndex()!;
    // The middle third of a young birch's crown, in its shape's own units (1 high).
    const cells: [number, number][] = [];
    for (let i = -8; i <= 8; i++) {
      for (let j = -8; j <= 8; j++) if (Math.hypot(i, j) <= 8) cells.push([(i / 8) * 0.09, 0.68 + (j / 8) * 0.1]);
    }
    const hit = new Set<[number, number]>();
    for (let t = 0; t < index.count; t += 3) {
      const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      const [ax, ay, bx, by, cx, cy] = [position.getX(a), position.getY(a), position.getX(b), position.getY(b), position.getX(c), position.getY(c)];
      const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
      // A stem or a bough is thin, and a stem through the middle is not leaves.
      if (Math.abs(area) < 2e-3) continue;
      for (const cell of cells) {
        const u = ((cell[0] - ax) * (cy - ay) - (cx - ax) * (cell[1] - ay)) / area;
        const v = ((bx - ax) * (cell[1] - ay) - (cell[0] - ax) * (by - ay)) / area;
        if (u >= 0 && v >= 0 && u + v <= 1) hit.add(cell);
      }
    }
    expect(hit.size / cells.length).toBeGreaterThan(0.9);
  });

  it('hangs the boughs of the old trunks under the top of the picture, and gives them their crowns over it', () => {
    for (const id of ['granskog', 'stormskog', 'garden', 'byn']) {
      const chapter = COURSES[id]!;
      const top = pictureTop(chapter);
      const boughs = meshes(built.get(id)!.group).find((m) => m.name === 'flora-spruceBoughs' || m.name === 'flora-birchBoughs')!;
      for (const p of positions(boughs)) {
        expect(p.y, `${id} at ${p.x.toFixed(1)}`).toBeGreaterThan(top(p.x, p.z) - 3.2);
        expect(p.y, `${id} at ${p.x.toFixed(1)}`).toBeLessThan(top(p.x, p.z));
      }
    }
    expect(TOP(0)).toBeCloseTo(0.08 * 10.9 + 10.9 * Math.tan(Math.PI / 12), 5);
  });
});

describe('what he walks through', () => {
  it('bends away from him, and springs back after him as he runs on', () => {
    setWind(0, true, false, null);
    setPlayer(10, 0, 3.5, 1, false);
    expect(bendAt(10.3, 0, -0.4)).toBeGreaterThan(1);
    expect(bendAt(9.7, 0, -0.4)).toBeLessThan(-1);
    // Far behind the path, or far along it, nothing bends.
    expect(Math.abs(bendAt(10.3, 0, -3))).toBeLessThan(0.01);
    expect(Math.abs(bendAt(14, 0, -0.4))).toBeLessThan(0.01);
    // What he has passed swings back past upright, once he is a little way on.
    const behind = Array.from({ length: 30 }, (_, i) => bendAt(10 - 0.4 - i * 0.05, 0, -0.4));
    expect(Math.max(...behind)).toBeGreaterThan(0.2);
  });

  it('with reduced motion only leans, gently, and does not spring', () => {
    setPlayer(10, 0, 3.5, 1, false);
    const lively = bendAt(10.3, 0, -0.4);
    setPlayer(10, 0, 3.5, 1, true);
    expect(bendAt(10.3, 0, -0.4)).toBeGreaterThan(0);
    expect(bendAt(10.3, 0, -0.4)).toBeLessThan(lively);
    // Behind him it leans away from him only: it never swings back.
    for (let d = 0.05; d < 2; d += 0.05) expect(bendAt(10 - d, 0, -0.4)).toBeLessThanOrEqual(0);
    expect(WIND.windPlayer.value.z).toBe(0);
  });

  it('is the one wind: grass, crowns and the cards in front move by the same numbers', () => {
    setWind(12.5, false, true, null);
    const a = windAt(4);
    setWind(12.5, false, true, null);
    expect(windAt(4)).toBe(a);
    setWind(12.5, true, true, null);
    expect(windAt(4)).toBe(0);
  });
});

describe('with reduced motion', () => {
  it('kicks up no leaves, and the mushrooms do not breathe', () => {
    const chapter = COURSES['granskog']!;
    const { extra, group } = built.get(chapter.id)!;
    const whirl = meshes(group).find((m) => m.name === 'flora-whirl')!;
    const time = PLANT.mushTime.value;
    for (let i = 0; i < 90; i++) extra!.update(frame(chapter, 20 + i * 0.12, { still: true, vx: 3.5, facing: i % 20 < 10 ? 1 : -1, grounded: i % 15 !== 0 }));
    expect(whirl.count).toBe(0);
    expect(whirl.visible).toBe(false);
    expect(PLANT.mushTime.value).toBe(time);
  });

  it('but when he runs, a few leaves whirl up from the ground and settle, and none on Low', () => {
    const chapter = COURSES['granskog']!;
    const { extra, group } = built.get(chapter.id)!;
    const whirl = meshes(group).find((m) => m.name === 'flora-whirl')!;
    let most = 0;
    for (let i = 0; i < 60; i++) {
      extra!.update(frame(chapter, 20 + i * 0.12, { vx: 3.5 }));
      most = Math.max(most, whirl.count);
      for (const p of positions(whirl)) expect(p.z).toBeLessThan(0.2);
    }
    expect(most).toBeGreaterThan(3);
    expect(most).toBeLessThanOrEqual(WHIRL);
    for (let i = 0; i < 10; i++) extra!.update(frame(chapter, 30, { vx: 3.5, tier: 'low' }));
    expect(whirl.count).toBe(0);
  });
});

describe('the glowing mushrooms', () => {
  it('are plain by day, and glow in the dark, in the dusk and in the storm’s night, breathing slower than once a second', () => {
    const day = COURSES['granskog']!;
    built.get(day.id)!.extra!.update(frame(day, 20));
    expect(PLANT.mushGlow.value).toBe(0);
    built.get(day.id)!.extra!.update(frame(day, 20, { darkness: 1 }));
    expect(PLANT.mushGlow.value).toBeGreaterThan(1);
    const storm = COURSES['stormskog']!;
    built.get(storm.id)!.extra!.update(frame(storm, 20));
    expect(PLANT.mushGlow.value).toBeGreaterThan(0.5);
    expect(MUSH_BREATH).toBeLessThan(2 * Math.PI);
  });
});
