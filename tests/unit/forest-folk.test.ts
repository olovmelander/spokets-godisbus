import { readFileSync } from 'node:fs';
import {
  Color, DirectionalLight, Group, HemisphereLight, InstancedMesh, Mesh, PerspectiveCamera, Scene, SkinnedMesh, Vector3, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import type { Assets } from '../../src/render/assets';
import type { CreatureClips } from '../../src/render/creature-clips';
import { PLACES, dress } from '../../src/render/dressing';
import type { ExtraFrame, ViewExtra } from '../../src/render/extensions';
import { createFauna } from '../../src/render/lift/fauna';
import { BEING, FOX_SIZE, HIDE, LEAP, STRIDE, TROT_STRIDE, WALK_STRIDE, installForestFolk } from '../../src/render/lift/fauna/folk';
import { faunaPlan, girth, type Plan } from '../../src/render/lift/fauna/plan';
import { RICH_LAYER } from '../../src/render/rich';
import type { ChapterData } from '../../src/sim/types';

/**
 * The forest folk modelled, rigged and animated in Blender (the creature overhaul, 13 November 2026): the fox
 * (art/blender/fox.py), the squirrel (art/blender/squirrel.py) and the little forest beings (art/blender/vatte.py), as the
 * near life plays them (src/render/lift/fauna/folk.ts).
 */

const CREATURES = {
  fox: { clips: ['trot', 'walk', 'sit', 'sniff', 'look', 'mouse-jump', 'scratch', 'yawn'],
    bones: ['hips', 'body', 'chest', 'neck', 'head', 'jaw', 'ear.L', 'ear.R', 'tail1', 'tail4', 'upperarm.L', 'forearm.R', 'hand.L', 'fpaw.R', 'thigh.L', 'shin.R', 'foot.L', 'hpaw.R'] },
  squirrel: { clips: ['run-up', 'run', 'sit-eat', 'tail-flick', 'freeze', 'leap'],
    bones: ['hips', 'chest', 'neck', 'head', 'jaw', 'ear.L', 'ear.R', 'tail1', 'tail5', 'arm.L', 'fore.R', 'thigh.L', 'shin.R', 'foot.L', 'cone'] },
  vatte: { clips: ['peek', 'hide', 'blink', 'wave'], bones: ['body', 'head', 'lid.L', 'lid.R', 'arm.L', 'hand.R', 'cap.leaf', 'cap.lichen'] },
} as const;
type Kind = keyof typeof CREATURES;

const file = (kind: Kind) => `art/baked/boot/${kind}.glb`;
/** The JSON of a GLB, as Blender wrote it. */
function glb(kind: Kind) {
  const buffer = readFileSync(file(kind));
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number; mesh?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[] }[];
  };
}
const models = new Map<Kind, Group>();
async function model(kind: Kind): Promise<Group> {
  if (!models.has(kind)) {
    const data = readFileSync(file(kind));
    const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
    gltf.scene.animations = gltf.animations;
    models.set(kind, gltf.scene);
  }
  return models.get(kind)!;
}
const assets = {
  manifest: async () => ({ version: 1, packs: { boot: { bytes: 1, files: { 'fox.glb': 1, 'squirrel.glb': 1, 'vatte.glb': 1 } } } }),
  model: async (_pack: string, name: string) => model(name as Kind),
} as unknown as Assets;

/** Red, pink and gold are the candy's and the hook's (tests/unit/lift-fauna.test.ts). */
function candyColoured(r: number, g: number, b: number): boolean {
  const most = Math.max(r, g, b);
  const chroma = most - Math.min(r, g, b);
  if (chroma <= 40) return false;
  if (chroma > 120) return true;
  const hue = 60 * (most === r ? ((g - b) / chroma + 6) % 6 : most === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4);
  return hue < 30 || hue > 270;
}

describe('the forest folk from Blender', () => {
  for (const kind of Object.keys(CREATURES) as Kind[]) {
    const { clips, bones } = CREATURES[kind];
    it(`${kind}: one skinned mesh, its bones by their names, and every clip, each moving every bone`, () => {
      const json = glb(kind);
      expect(json.skins).toHaveLength(1);
      expect(json.nodes.filter((node) => node.skin !== undefined)).toHaveLength(1);
      const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
      for (const bone of bones) expect(joints, bone).toContain(bone);
      // No control used while posing (an IK target) is left in it.
      expect(joints.some((name) => /_ik\.[LR]$/.test(name ?? ''))).toBe(false);
      expect(json.animations?.map((a) => a.name).sort()).toEqual(clips.map((clip) => `${kind}:${clip}`).sort());
      for (const animation of json.animations!) {
        const moved = new Set(animation.channels.map((channel) => channel.target.node));
        for (const joint of json.skins![0]!.joints) expect(moved.has(joint), `${animation.name} ${json.nodes[joint]!.name}`).toBe(true);
      }
    });

    it(`${kind}: no colour of the candy's red, pink or gold on any of its corners`, async () => {
      const c = new Color();
      let corners = 0;
      (await model(kind)).traverse((node) => {
        const colour = (node as Mesh).geometry?.getAttribute('color');
        for (let i = 0; colour && i < colour.count; i++, corners++) {
          c.setRGB(colour.getX(i), colour.getY(i), colour.getZ(i)).convertLinearToSRGB();
          expect(candyColoured(c.r * 255, c.g * 255, c.b * 255), `${kind} #${c.getHexString()}`).toBe(false);
        }
      });
      expect(corners).toBeGreaterThan(500);
    });
  }

  it('moves as far a stride as the game counts, and the game knows how far its clips take it', () => {
    const fox = readFileSync('art/blender/fox.py', 'utf8');
    expect(fox).toContain(`TROT_STRIDE = ${TROT_STRIDE}`);
    expect(fox).toContain(`WALK_STRIDE = ${WALK_STRIDE}`);
    expect(fox).toContain(`LEAP = ${LEAP.toFixed(1)}`);
    expect(readFileSync('art/blender/squirrel.py', 'utf8')).toContain(`RUN_STRIDE = ${STRIDE}`);
    expect(readFileSync('art/blender/vatte.py', 'utf8')).toContain(`HIDE = ${HIDE}`);
  });

  it('stands as big as the code-built ones, its feet at its origin, facing +x', async () => {
    const box = async (kind: Kind) => {
      const m = await model(kind);
      m.updateMatrixWorld(true);
      const lo = new Vector3(Infinity, Infinity, Infinity), hi = new Vector3(-Infinity, -Infinity, -Infinity), p = new Vector3();
      m.traverse((node) => {
        const mesh = node as SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        const position = mesh.geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
          lo.min(p);
          hi.max(p);
        }
      });
      return { lo, hi };
    };
    const fox = await box('fox');
    // The fox: about 1 tall at the withers, its ears higher; its nose ahead (+x), its tail tip behind.
    expect(fox.lo.y).toBeGreaterThan(-0.02);
    expect(fox.hi.y).toBeGreaterThan(1.2);
    expect(fox.hi.y).toBeLessThan(1.5);
    expect(fox.hi.x).toBeCloseTo(1.1, 1);
    expect(fox.lo.x).toBeLessThan(-1.4);
    const squirrel = await box('squirrel');
    expect(squirrel.lo.y).toBeGreaterThan(-0.02);
    expect(squirrel.hi.x).toBeGreaterThan(0.5);
    expect(squirrel.hi.y).toBeGreaterThan(0.9);
    const vatte = await box('vatte');
    expect(vatte.hi.y).toBeGreaterThan(0.5);
    expect(vatte.hi.y).toBeLessThan(0.65);
  });
});

// --- as the near life plays them ------------------------------------------------------------------------------------

const built = new Map<string, { scene: Scene; extra: ViewExtra; plan: Plan; group: Group }>();
const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);

beforeAll(async () => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  for (const id of ['granskog', 'berget', 'garden']) {
    const chapter = COURSES[id]!;
    const scene = new Scene();
    const dressing = dress(chapter, PLACES[chapter.place!]);
    scene.add(dressing.group);
    const extra = createFauna({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight(), place: PLACES[chapter.place!], dressing: dressing.group })!;
    expect(await installForestFolk(assets, scene)).toBe(true);
    // Once only.
    expect(await installForestFolk(assets, scene)).toBe(false);
    built.set(id, { scene, extra, plan: faunaPlan(chapter, dressing.group)!, group: scene.getObjectByName('fauna') as Group });
  }
}, 120000);
afterAll(() => vi.unstubAllGlobals());

function frame(chapter: ChapterData, x: number, clock: number, over: Partial<ExtraFrame> = {}): ExtraFrame {
  const ground = chapter.ground.find((p, i) => x >= p.x && x <= (chapter.ground[i + 1]?.x ?? Infinity))?.y ?? 0;
  camera.position.set(x, ground + 2, 11);
  camera.updateMatrixWorld();
  return { dt: 1 / 30, clock, flags: new Set(), x, y: ground, camera, still: false, tier: 'high', riding: false, darkness: 0, ...over };
}
const rigsOf = (id: string, kind: string) => (built.get(id)!.group.getObjectByName('fauna-rigged')?.children ?? []).filter((c) => c.name === `fauna-rigged:${kind}`);
const clipsOf = (root: Object3D) => (root as Object3D & { creatureClips: CreatureClips }).creatureClips;
const crowd = (id: string, name: string) => built.get(id)!.group.children.find((c) => c.name === name) as InstancedMesh;
const showing = (root: Object3D, clip: string) => clipsOf(root).showing().find((s) => s.name === clip)?.weight ?? 0;

describe('the forest folk in the near life (src/render/lift/fauna/folk.ts)', () => {
  it('has a rigged copy for each of its places, drawn only on Mid and High, in place of the shapes built in code', () => {
    expect(rigsOf('granskog', 'fox')).toHaveLength(1);
    expect(rigsOf('granskog', 'squirrel')).toHaveLength(built.get('granskog')!.plan.squirrels.length);
    expect(rigsOf('granskog', 'vatte')).toHaveLength(built.get('granskog')!.plan.beings.length);
    expect(rigsOf('berget', 'vatte')).toHaveLength(built.get('berget')!.plan.beings.length);
    expect(rigsOf('berget', 'fox')).toHaveLength(0);
    for (const root of built.get('granskog')!.group.getObjectByName('fauna-rigged')!.children) {
      root.traverse((part) => expect(part.layers.mask, part.name).toBe(1 << RICH_LAYER));
    }
  });

  it('puts the squirrels on their trunks, with the code-built shapes hidden, and sends one down to eat now and then', () => {
    const chapter = COURSES.granskog!;
    const { extra, plan } = built.get('granskog')!;
    const s = plan.squirrels[0]!;
    const root = rigsOf('granskog', 'squirrel')[0]!;
    const big = chapter.checkpoints ?? [];
    // He stands a little off its tree, for two minutes.
    const x = s.tree.x - 6;
    let clock = 0, onTrunk = 0, eating = 0;
    for (let k = 0; k < 120 * 30; k++) {
      extra.update(frame(chapter, x, (clock += 1 / 30)));
      expect(root.visible).toBe(true);
      expect(crowd('granskog', 'fauna-squirrels').visible).toBe(false);
      const at = root.position;
      // Never inside its trunk (a leap from the ground onto it may brush its bark).
      const out = Math.hypot(at.x - s.tree.x, at.z - s.tree.z);
      if (at.y - s.tree.y > 0.5) { onTrunk++; expect(out).toBeGreaterThan(girth(s.tree, at.y - s.tree.y) - 0.05); }
      if (showing(root, 'sit-eat') > 0.9) {
        eating++;
        // On the ground beside its tree, with no big candy in front of it.
        expect(at.y).toBeCloseTo(s.tree.y, 1);
        for (const c of big) if (c.y > s.tree.y - 3 && c.y < s.tree.y + 4) expect(Math.abs(c.x - at.x)).toBeGreaterThan(1.5);
      }
    }
    expect(onTrunk).toBeGreaterThan(30 * 30);
    expect(eating).toBeGreaterThan(30);
    // He comes to its tree: it is up the trunk, high.
    for (let k = 0; k < 8 * 30; k++) extra.update(frame(chapter, s.tree.x - 1, (clock += 1 / 30)));
    expect(root.position.y - s.tree.y).toBeGreaterThan(6);
  });

  it('brings the fox out now and then, which sniffs, sits and does its things, and never trots towards him', () => {
    const chapter = COURSES.granskog!;
    const { extra } = built.get('granskog')!;
    const root = rigsOf('granskog', 'fox')[0]!;
    let clock = 900, seen = 0, before: number | null = null;
    const did = new Set<string>();
    // He dawdles along the forest, a third of an EL a second, for five minutes.
    for (let k = 0; k < 300 * 30; k++) {
      const x = 2 + k / 90;
      extra.update(frame(chapter, x, (clock += 1 / 30)));
      if (!root.visible) { before = null; continue; }
      seen++;
      expect(crowd('granskog', 'fauna-fox').visible).toBe(false);
      expect(root.scale.x).toBeCloseTo(FOX_SIZE);
      expect(root.position.z).toBeLessThanOrEqual(-12);
      expect(root.position.z).toBeGreaterThanOrEqual(-30);
      for (const s of clipsOf(root).showing()) if (s.weight > 0.6) did.add(s.name);
      const at = root.position.x;
      if (before !== null && Math.abs(at - x) > 2 && Math.abs(at - before) > 0.02) expect(Math.sign(at - before) * Math.sign(x - at), `at ${x.toFixed(1)}`).toBeLessThanOrEqual(0);
      before = at;
    }
    expect(seen).toBeGreaterThan(300);
    expect([...did]).toContain('trot');
    // And some of its things: sniffing, looking, sitting, pouncing, scratching, yawning.
    expect([...did].filter((clip) => ['sniff', 'look', 'sit', 'mouse-jump', 'scratch', 'yawn'].includes(clip)).length).toBeGreaterThanOrEqual(2);
  });

  it('has the beings peek over their stones, duck as he comes, and wear the cap of their place', () => {
    for (const [id, leaf] of [['granskog', true], ['berget', false]] as const) {
      const chapter = COURSES[id]!;
      const { extra, plan } = built.get(id)!;
      const b = plan.beings[0]!;
      const root = rigsOf(id, 'vatte')[0]!;
      let clock = 0;
      for (let k = 0; k < 6 * 30; k++) extra.update(frame(chapter, b.at[0] - 6, (clock += 1 / 30)));
      expect(root.visible).toBe(true);
      expect(crowd(id, 'fauna-beings').visible).toBe(false);
      expect(showing(root, 'hide')).toBeLessThan(0.05);
      expect(clipsOf(root).bone('cap.leaf')!.scale.x).toBe(leaf ? 1 : 0);
      expect(clipsOf(root).bone('cap.lichen')!.scale.x).toBe(leaf ? 0 : 1);
      // A being on its stone's left is drawn mirrored, so that it waves with the hand on its open side.
      expect(Math.sign(root.scale.z)).toBe(b.side < 0 ? -1 : 1);
      expect(root.scale.x).toBeCloseTo(BEING);
      for (let k = 0; k < 2 * 30; k++) extra.update(frame(chapter, b.at[0] - 0.5, (clock += 1 / 30)));
      expect(showing(root, 'hide')).toBeGreaterThan(0.95);
    }
  });

  it('holds still with less motion, and Low draws none of it', () => {
    const chapter = COURSES.granskog!;
    const { extra, plan } = built.get('granskog')!;
    const root = rigsOf('granskog', 'squirrel')[0]!;
    const x = plan.squirrels[0]!.tree.x - 6;
    extra.update(frame(chapter, x, 1, { still: true }));
    const before = root.position.clone();
    for (let k = 0; k < 60; k++) extra.update(frame(chapter, x, 1 + k / 30, { still: true }));
    expect(root.position.distanceTo(before)).toBeLessThan(1e-6);
    // On Low the near life is not drawn (src/render/rich.ts): it is not even posed.
    const showingBefore = JSON.stringify(clipsOf(root).showing());
    for (let k = 0; k < 30; k++) extra.update(frame(chapter, x + k, 3 + k / 30, { tier: 'low' }));
    expect(JSON.stringify(clipsOf(root).showing())).toBe(showingBefore);
  });
});
