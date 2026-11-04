import {
  Color, DirectionalLight, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3, type BufferAttribute,
} from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, BONUS, COURSES, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES, dress } from '../../src/render/dressing';
import type { ExtraFrame, ViewExtra } from '../../src/render/extensions';
import { createFauna } from '../../src/render/lift/fauna';
import { faunaPlan, type Plan } from '../../src/render/lift/fauna/plan';
import type { ChapterData } from '../../src/sim/types';

/** The near life (src/render/lift/fauna.ts): squirrels, a fox, owls, small birds, fireflies, dragonflies, butterflies, beings, carvings. */

let chapters: ChapterData[] = [];
const built = new Map<string, { group: Group; plan: Plan | null; extra: ViewExtra | null; scene: Scene }>();

beforeAll(async () => {
  // The dressing draws on canvases: there are none here, and what they would hold is not needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
  chapters = [...STORY, ...BONUS, ...ADVENTURE2, COURSES['look-forest']!, COURSES['look-deck']!, COURSES['look-street']!];
  for (const chapter of chapters) {
    const scene = new Scene();
    const dressing = chapter.place ? dress(chapter, PLACES[chapter.place]) : null;
    if (dressing) scene.add(dressing.group);
    const extra = createFauna({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight(), place: chapter.place ? PLACES[chapter.place] : null, dressing: dressing?.group ?? null });
    built.set(chapter.id, { group: scene.getObjectByName('fauna') as Group, plan: faunaPlan(chapter, dressing?.group), extra, scene });
  }
}, 120000);
afterAll(() => vi.unstubAllGlobals());

const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);
/** A frame of the view's, with him at x and the camera following. */
function frame(chapter: ChapterData, x: number, clock: number, over: Partial<ExtraFrame> = {}): ExtraFrame {
  const ground = chapter.ground.find((p, i) => x >= p.x && x <= (chapter.ground[i + 1]?.x ?? Infinity))?.y ?? 0;
  camera.position.set(x, ground + 2, 11);
  camera.updateMatrixWorld();
  return { dt: 1 / 30, clock, flags: new Set(), x, y: ground, camera, still: false, tier: 'high', riding: false, darkness: 0, ...over };
}
/** Walks him through the whole chapter, at three EL a second. */
function walk(chapter: ChapterData, extra: ViewExtra, each?: () => void, over: Partial<ExtraFrame> = {}): void {
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  let clock = 0;
  for (let x = from; x <= to; x += 0.1, clock += 1 / 30) {
    extra.update(frame(chapter, x, clock, over));
    each?.();
  }
}
const meshes = (group: Group) => group.children.filter((c): c is InstancedMesh => (c as InstancedMesh).isInstancedMesh);
const at = new Vector3();

/** Red, pink and gold are the candy's and the hook's (tests/unit/life.test.ts). */
function candyColoured(r: number, g: number, b: number): boolean {
  const most = Math.max(r, g, b);
  const chroma = most - Math.min(r, g, b);
  if (chroma <= 40) return false;
  if (chroma > 120) return true;
  const hue = 60 * (most === r ? ((g - b) / chroma + 6) % 6 : most === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4);
  return hue < 30 || hue > 270;
}

describe('the near life', () => {
  it('is built for every chapter of both adventures, and walks through each without an error', () => {
    expect(chapters.length).toBe(21);
    for (const chapter of chapters) {
      const { extra } = built.get(chapter.id)!;
      if (extra) walk(chapter, extra);
    }
    // Where it is: the forest, the garden, the bog, the mountain, the dusk, the village, and Äventyr 2's storm.
    for (const id of ['garden', 'granskog', 'myren', 'berget', 'norrsken', 'byn', 'stormskog', 'alven', 'flarken', 'billsta', 'stormoga']) {
      expect(built.get(id)!.extra, id).not.toBeNull();
    }
    // Not at home.
    for (const id of ['prolog', 'epilog', 'stormkvall', 'morgonen']) expect(built.get(id)!.extra, id).toBeNull();
  });

  it('has what each place is to have', () => {
    const plan = (id: string) => built.get(id)!.plan!;
    expect(plan('granskog').squirrels.length).toBe(3);
    expect(plan('granskog').fox).toBe(true);
    expect(plan('granskog').flocks.length).toBeGreaterThan(2);
    expect(plan('granskog').beings.length).toBeGreaterThan(0);
    expect(plan('granskog').carvings.length).toBeGreaterThan(0);
    expect(plan('granskog').dragonflies.length).toBeGreaterThan(0);
    expect(plan('garden').butterflies.length).toBeGreaterThan(2);
    expect(plan('garden').flocks.length).toBeGreaterThan(2);
    expect(plan('myren').dragonflies.length).toBeGreaterThan(2);
    expect(plan('myren').butterflies.length).toBeGreaterThan(0);
    expect(plan('berget').beings.length).toBeGreaterThan(0);
    expect(plan('norrsken').owls.length).toBe(1);
    expect(plan('norrsken').fireflies).toBeGreaterThan(0);
    expect(plan('byn').flocks.every((f) => f.species === 'sparrow')).toBe(true);
    expect(plan('stormskog').owls.length).toBe(1);
    expect(plan('alven').owls.length).toBe(1);
    expect(plan('stormoga').fireflies).toBeGreaterThan(0);
  });

  it('hides in the storm: only birds sheltering on branches, and the owls', () => {
    for (const chapter of ADVENTURE2.filter((c) => c.storm?.rain)) {
      const plan = built.get(chapter.id)!.plan;
      if (!plan) continue;
      expect(plan.squirrels, chapter.id).toEqual([]);
      expect(plan.fox, chapter.id).toBe(false);
      expect(plan.butterflies, chapter.id).toEqual([]);
      expect(plan.dragonflies, chapter.id).toEqual([]);
      expect(plan.beings, chapter.id).toEqual([]);
      for (const flock of plan.flocks) expect(flock.shelter && flock.perch, chapter.id).toBe(true);
      // Fireflies only where the storm's eye opens.
      expect(plan.fireflies > 0, chapter.id).toBe(!!chapter.storm!.calm);
    }
  });

  it("never sits an owl where Äventyr 2's own owl is", () => {
    for (const chapter of ADVENTURE2) {
      const plan = built.get(chapter.id)!.plan;
      const story = [...(chapter.spots ?? []), ...(chapter.decor ?? [])].filter((s) => s.look === 'owl').map((s) => s.at.x)
        .concat((chapter.rides ?? []).filter((r) => r.look === 'owl').flatMap((r) => [r.from.x, r.to.x]));
      for (const owl of plan?.owls ?? []) for (const x of story) expect(Math.abs(owl.at[0] - x), chapter.id).toBeGreaterThan(15);
    }
  });

  it('rests nowhere near a candy, and nowhere in front of the path', () => {
    for (const chapter of chapters) {
      const plan = built.get(chapter.id)!.plan;
      if (!plan) continue;
      const sweets = [...chapter.candy, ...(chapter.side ?? []), ...(chapter.hidden ?? []), ...(chapter.checkpoints ?? [])];
      const away = (p: readonly number[], d: number, what: string) => {
        expect(p[2], `${chapter.id} ${what} behind`).toBeLessThan(-0.8);
        for (const c of sweets) expect(Math.hypot(c.x - p[0]!, c.y - p[1]!, p[2]!), `${chapter.id} ${what} at ${p[0]!.toFixed(1)}`).toBeGreaterThanOrEqual(d);
      };
      for (const o of plan.owls) away(o.at, 1.5, 'owl');
      for (const f of plan.flocks) for (const b of f.birds) away(b.at, 1.5, 'bird');
      for (const b of plan.butterflies) for (const f of b.flowers) away(f, 1.5, 'flower');
      for (const d of plan.dragonflies) away(d, 1.5, 'dragonfly');
      // The beings and the carvings keep further off: never near candy.
      for (const b of plan.beings) away([b.at[0], b.at[1] + 0.3, b.at[2]], 2.5, 'being');
      for (const c of plan.carvings) away([c.at[0], c.at[1] + 0.2, c.at[2]], 2.5, 'carving');
      for (const s of plan.squirrels) expect(s.tree.z).toBeLessThan(-2.5);
      for (const p of plan.props) expect(p[2][2], `${chapter.id} prop`).toBeLessThan(-0.8);
    }
  });

  it('keeps behind the path wherever it goes', () => {
    const m = new Matrix4();
    for (const chapter of chapters) {
      const { extra, group } = built.get(chapter.id)!;
      if (!extra) continue;
      walk(chapter, extra, () => {
        for (const mesh of meshes(group)) {
          if (!mesh.visible) continue;
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, m);
            if (m.determinant() === 0) continue;
            at.setFromMatrixPosition(m);
            expect(at.z, `${chapter.id} ${mesh.geometry.uuid}`).toBeLessThan(-0.8);
          }
        }
      });
    }
  });

  it('holds still with less motion, and its birds stay where they sit', () => {
    for (const id of ['garden', 'granskog', 'myren', 'norrsken', 'byn', 'stormskog', 'stormoga']) {
      const chapter = COURSES[id]!;
      const { extra, group } = built.get(id)!;
      // Every place that has some life, with the camera still over it while he walks by and back.
      const plan = built.get(id)!.plan!;
      const spots = [...plan.flocks.map((f) => f.x), ...plan.squirrels.map((s) => s.tree.x), ...plan.owls.map((o) => o.at[0]), ...plan.butterflies.map((b) => b.home[0])];
      for (const spot of spots) {
        let clock = 10;
        // A turn of nothing is a turn of nothing, whichever its sign.
        const snapshot = () => meshes(group).map((mesh) => [...mesh.instanceMatrix.array, ...((mesh.geometry.getAttribute('act') as BufferAttribute | undefined)?.array ?? [])].map((v) => v + 0));
        extra!.update({ ...frame(chapter, spot - 4, clock), still: true, flags: new Set(['eye']) });
        const before = snapshot();
        for (let k = 0; k < 90; k++) {
          clock += 1 / 30;
          const f = frame(chapter, spot - 4, clock);
          extra!.update({ ...f, x: spot - 4 + (k / 90) * 8, still: true, flags: new Set(['eye']) });
        }
        expect(snapshot(), `${id} at ${spot.toFixed(1)}`).toEqual(before);
      }
    }
  });

  it('lifts its birds as he comes, and they come back once he has gone by', () => {
    const chapter = COURSES.garden!;
    const { extra, plan } = built.get('garden')!;
    const flock = plan!.flocks.find((f) => !f.perch)!;
    let clock = 100;
    const step = (x: number, seconds: number) => {
      for (let k = 0; k < seconds * 30; k++) extra!.update(frame(chapter, x, (clock += 1 / 30)));
    };
    step(flock.x - 8, 2);
    // He walks up to them: they are up and away within two seconds.
    step(flock.x - 1, 2.5);
    // The birds of this flock: those near where each of them sits.
    const heights = () => meshes(built.get('garden')!.group).filter((m) => m.name.startsWith('fauna-birds')).flatMap((m) => Array.from({ length: m.count }, (_, i) => {
      const matrix = new Matrix4();
      m.getMatrixAt(i, matrix);
      return matrix.determinant() === 0 || !m.visible ? null : new Vector3().setFromMatrixPosition(matrix);
    })).filter((p): p is Vector3 => p !== null && flock.birds.some((b) => Math.abs(p.x - b.at[0]) < 1 && Math.abs(p.z - b.at[2]) < 0.6 && Math.abs(p.y - b.at[1]) < 0.3));
    expect(heights().length).toBe(0);
    // He goes on; after a while they land again, behind him.
    step(flock.x + 9, 10);
    step(flock.x + 3, 0.2);
    expect(heights().length).toBe(flock.birds.length);
  });

  it('is drawn on Mid and High only, one draw call a kind, with no colour of the candy', () => {
    for (const chapter of chapters) {
      const { group } = built.get(chapter.id)!;
      if (!group) continue;
      expect(group.userData.rich, chapter.id).toBe(true);
      expect(group.children.length, chapter.id).toBeLessThanOrEqual(14);
      const c = new Color();
      for (const child of group.children) {
        const mesh = child as Mesh;
        const colour = mesh.geometry.getAttribute('color');
        for (let i = 0; colour && i < colour.count; i++) {
          c.setRGB(colour.getX(i), colour.getY(i), colour.getZ(i)).convertLinearToSRGB();
          expect(candyColoured(c.r * 255, c.g * 255, c.b * 255), `${chapter.id} ${child.name} #${c.getHexString()}`).toBe(false);
        }
        const tint = (mesh as InstancedMesh).instanceColor;
        for (let i = 0; tint && i < tint.count; i++) {
          c.setRGB(tint.getX(i), tint.getY(i), tint.getZ(i)).convertLinearToSRGB();
          expect(candyColoured(c.r * 255, c.g * 255, c.b * 255), `${chapter.id} tint #${c.getHexString()}`).toBe(false);
        }
      }
    }
  });
});
