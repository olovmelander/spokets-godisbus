import {
  Color, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderLib, ShaderMaterial,
  SphereGeometry, type InstancedMesh, type Vector4, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer,
} from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';
import { ADVENTURE2, BONUS, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES, dress } from '../../src/render/dressing';
import { PACK, type ExtraContext, type ExtraFrame } from '../../src/render/extensions';
import { DEW, createDew, dewPlaces } from '../../src/render/lift/materials/dew';
import { HOLDS, createPuddles, lampsOf } from '../../src/render/lift/materials/puddles';
import { CARVED, PALED, RIM, classify, createSurfaces, dewy, wetOf, woodColoured } from '../../src/render/lift/materials/surface';
import { createWater } from '../../src/render/water';
import type { ChapterData } from '../../src/sim/types';

beforeAll(async () => {
  // The dressing draws its pictures on canvases: there are none here, and none are needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
});
afterAll(() => vi.unstubAllGlobals());

const all = () => [...STORY, ...BONUS, ...ADVENTURE2];

function context(chapter: ChapterData): ExtraContext {
  const look = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
  const scene = new Scene();
  const sun = new DirectionalLight(look.sun.colour, look.sun.intensity);
  sun.position.set(...look.sun.from);
  const dressing = dress(chapter, look);
  scene.add(dressing.group);
  return { chapter, scene, sky: new Color(look.haze.colour), hemisphere: new HemisphereLight(), sun, place: look, dressing: dressing.group };
}

const frame = (over: Partial<ExtraFrame> = {}): ExtraFrame => ({
  dt: 0.5, clock: 1, flags: new Set(), x: 20, y: 0, camera: new PerspectiveCamera(), still: false, tier: 'high', riding: false, darkness: 0, ...over,
});

/** Runs a material's patches on three's own standard shader, as the renderer would when it compiles it. */
function compile(material: Material): WebGLProgramParametersWithUniforms {
  const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

const patched = (root: Group | Scene) => {
  const found = new Set<MeshStandardMaterial>();
  root.traverse((object) => {
    const material = (object as Mesh).material;
    for (const one of Array.isArray(material) ? material : material ? [material] : []) if (one.userData.liftSurface) found.add(one as MeshStandardMaterial);
  });
  return [...found];
};

/** Red, pink and gold are the candy's and the hook's (tests/unit/life.test.ts). */
function candyColoured([r, g, b]: number[]): boolean {
  const most = Math.max(r!, g!, b!);
  const chroma = most - Math.min(r!, g!, b!);
  if (chroma <= 40) return false;
  if (chroma > 120) return true;
  const hue = 60 * (most === r ? (((g! - b!) / chroma) + 6) % 6 : most === g ? (b! - r!) / chroma + 2 : (r! - g!) / chroma + 4);
  return hue < 30 || hue > 270;
}
const ink = (colour: Color) => { const c = colour.clone().convertLinearToSRGB(); return [c.r * 255, c.g * 255, c.b * 255]; };

describe('the visual upgrade: wood, moss and the wet', () => {
  it('patches the moss and the carved wood where a chapter has them, with one program key each', () => {
    for (const chapter of all()) {
      const ctx = context(chapter);
      const surfaces = createSurfaces(ctx);
      surfaces.apply(ctx.scene);
      // Again, as each warm-up does: nothing is patched twice.
      surfaces.apply(ctx.scene);
      const materials = patched(ctx.scene);
      // The places with moss on their stones and in their cushions always have some.
      if (['forest', 'bog', 'mountain'].includes(chapter.place ?? '')) expect(materials.length, chapter.id).toBeGreaterThan(0);
      if (materials.length === 0) continue;
      for (const material of materials) {
        const key = material.customProgramCacheKey();
        expect(key.split(':lift-surface-v1').length - 1, chapter.id).toBe(1);
      }
      // What it adds, it adds to three's own chunks, and leaves them in.
      const shader = compile(materials[0]!);
      expect(shader.vertexShader).toContain('liftWorld = ');
      expect(shader.vertexShader).toContain('#include <project_vertex>');
      expect(shader.fragmentShader).toContain('liftWetness');
      expect(shader.fragmentShader).toContain('#include <emissivemap_fragment>');
      expect(shader.fragmentShader).toContain('#include <opaque_fragment>');
      surfaces.update(frame());
    }
  });

  it('decides by the tier of its first frame, once: only a picture that starts on High is patched', () => {
    for (const tier of ['low', 'mid', 'high'] as const) {
      const ctx = context(STORY.find((c) => c.id === 'granskog')!);
      const surfaces = createSurfaces(ctx);
      surfaces.update(frame({ tier }));
      // A change of tier later changes nothing: no patch arrives in play, so nothing compiles (gate 6).
      surfaces.update(frame({ tier: tier === 'high' ? 'low' : 'high' }));
      surfaces.apply(ctx.scene);
      const materials = patched(ctx.scene);
      if (tier !== 'high') {
        expect(materials, tier).toEqual([]);
        continue;
      }
      expect(materials.length).toBeGreaterThan(0);
      // Both of its parts open with the High-only branch on the tier uniform, so a picture that falls to Low
      // after starting on High does less.
      for (const material of materials) expect((compile(material).fragmentShader.match(/if \(liftPlace\.x > 1\.5\) \{/g) ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('goes by the tier the picture started on: changing graphics lays no patch, on the way to Low or to High', () => {
    const patchedIn = (scene: Scene) => {
      let patched = 0;
      scene.traverse((object) => {
        const material = (object as Mesh).material as MeshStandardMaterial | undefined;
        if (material?.customProgramCacheKey?.().includes('lift-surface-v1')) patched++;
      });
      return patched;
    };
    const ctx = context(STORY.find((c) => c.id === 'granskog')!);
    const surfaces = createSurfaces(ctx);
    surfaces.update(frame({ tier: 'low' }));
    surfaces.apply(ctx.scene);
    // A change in the menu warms up before any frame has told the surfaces the new tier, and again after one has.
    surfaces.update(frame({ tier: 'high' }));
    surfaces.apply(ctx.scene);
    surfaces.update(frame({ tier: 'low' }));
    surfaces.apply(ctx.scene);
    expect(patchedIn(ctx.scene)).toBe(0);

    const high = context(STORY.find((c) => c.id === 'granskog')!);
    const started = createSurfaces(high);
    started.update(frame({ tier: 'high' }));
    started.apply(high.scene);
    const laid = patchedIn(high.scene);
    expect(laid).toBeGreaterThan(0);
    started.update(frame({ tier: 'low' }));
    started.apply(high.scene);
    expect(patchedIn(high.scene)).toBe(laid);
  });

  describe('puddles', () => {
    const wet = (scene: Scene) => {
      const found = new Set<MeshStandardMaterial>();
      scene.traverse((object) => {
        const material = (object as Mesh).material as MeshStandardMaterial | undefined;
        if (material?.customProgramCacheKey?.().includes('lift-puddles-v1')) found.add(material);
      });
      return [...found];
    };
    const billsta = () => ADVENTURE2.find((c) => c.id === 'billsta')!;

    it('lies only where it rains', () => {
      for (const chapter of STORY) if (!chapter.storm?.rain) expect(createPuddles(context(chapter)), chapter.id).toBeNull();
      expect(createPuddles(context(billsta()))).not.toBeNull();
    });

    it('lies on the hard ground, once, under one program key, and leaves the lawn and the moss dry', () => {
      const ctx = context(billsta());
      const puddles = createPuddles(ctx)!;
      puddles.update(frame());
      puddles.patch!(ctx.scene);
      puddles.patch!(ctx.scene);
      const materials = wet(ctx.scene);
      expect(materials.length).toBeGreaterThan(0);
      for (const material of materials) {
        expect(HOLDS[material.userData.ground as string], material.userData.ground as string).toBeGreaterThan(0);
        expect(material.customProgramCacheKey().split(':lift-puddles-v1').length - 1).toBe(1);
        const shader = compile(material);
        expect(shader.fragmentShader).toContain('wetFresnel');
        expect(shader.fragmentShader).toContain('#include <opaque_fragment>');
        expect(shader.vertexShader).toContain('wetWorld = ');
      }
    });

    it('goes by the tier the picture started on: a picture that starts on Low stays as it was, whatever the menu does', () => {
      const ctx = context(billsta());
      const puddles = createPuddles(ctx)!;
      puddles.update(frame({ tier: 'low' }));
      puddles.patch!(ctx.scene);
      puddles.update(frame({ tier: 'high' }));
      puddles.patch!(ctx.scene);
      expect(wet(ctx.scene)).toEqual([]);
    });

    it('knows the lit windows of a street and of a building, and only of a building that is lit', () => {
      const byn = ADVENTURE2.find((c) => c.id === 'stormbyn')!;
      expect(lampsOf(byn, new Scene()).length).toBeGreaterThan(0);
      const scene = new Scene();
      const lit = building({ kind: 'villa', x: 40, z: -30, lit: 'home' });
      const dark = building({ kind: 'villa', x: 90, z: -30 });
      scene.add(lit.group, dark.group);
      const lamps = lampsOf(billsta(), scene).filter((lamp) => lamp.on === 'home');
      expect(lamps.length).toBeGreaterThan(0);
      for (const lamp of lamps) expect(Math.abs(lamp.x - 40)).toBeLessThan(40);
      expect(dark.group.userData.lamps).toBeUndefined();
    });

    it('gives the four nearest lit windows their warmth, and none to a window that is dark', () => {
      const ctx = context(billsta());
      const near = { x: 22, z: -20, on: '' };
      const far = { x: 500, z: -20, on: '' };
      const off = { x: 21, z: -20, on: 'not-yet' };
      const holder = new Group();
      holder.userData.lamps = [far, off, near];
      ctx.scene.add(holder);
      const puddles = createPuddles(ctx)!;
      puddles.update(frame({ x: 20 }));
      puddles.patch!(ctx.scene);
      puddles.update(frame({ x: 20 }));
      const uniforms = compile(wet(ctx.scene)[0]!).uniforms as unknown as { wetLampX: { value: Vector4 }; wetLampOn: { value: Vector4 } };
      expect(uniforms.wetLampX.value.x).toBe(22);
      expect(uniforms.wetLampOn.value.x).toBeGreaterThan(0.9);
      expect(uniforms.wetLampOn.value.y).toBe(0);
    });

    it('brightens with the flash, as the sky it gives back does', () => {
      const ctx = context(billsta());
      const puddles = createPuddles(ctx)!;
      puddles.update(frame());
      puddles.patch!(ctx.scene);
      const uniforms = compile(wet(ctx.scene)[0]!).uniforms as unknown as { wetSky: { value: Color } };
      const before = uniforms.wetSky.value.r;
      ctx.hemisphere.intensity *= 2;
      puddles.update(frame());
      expect(uniforms.wetSky.value.r).toBeCloseTo(before * 2, 5);
    });
  });

  it('knows matte carved wood from the moss: the boards, the figures, the moss cushions, and leaves the banks', () => {
    const granskog = STORY.find((chapter) => chapter.id === 'granskog')!;
    const ctx = context(granskog);
    createSurfaces(ctx).apply(ctx.scene);
    // The moss is the kit's cushions; the banks of ground (most of the picture) keep their own light.
    const moss = patched(ctx.scene).filter((material) => (material.userData.liftSurface as { y: number } | undefined)?.y === 1);
    expect(moss.length).toBeGreaterThan(0);
    expect(patched(ctx.scene).filter((material) => material.userData.ground && material.userData.ground !== 'wood')).toEqual([]);
    // A figure carved of grey old wood and one of pale linden are carved; their dark eyes are not.
    const figure = new Group();
    figure.name = 'old-trägubbe';
    const body = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#8f8c7e' }));
    const eye = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#1a1530' }));
    figure.add(body, eye);
    expect(classify(body, body.material, ctx.dressing ?? null, granskog)).toBe(CARVED);
    expect(classify(eye, eye.material, ctx.dressing ?? null, granskog)).toBeNull();
    // A figure painted on its corners, as the forest's carved figures are (../src/render/lift/fauna.ts).
    const painted = new SphereGeometry();
    const pale = new Color('#d6bf98');
    painted.setAttribute('color', new Float32BufferAttribute(Array.from({ length: painted.getAttribute('position').count }, () => [pale.r, pale.g, pale.b]).flat(), 3));
    const carving = new Mesh(painted, new MeshStandardMaterial({ vertexColors: true, flatShading: true }));
    carving.name = 'fauna-carving:gubbe';
    new Group().add(carving).name = 'fauna';
    expect(classify(carving, carving.material, ctx.dressing ?? null, granskog)).toBe(CARVED);
    expect(woodColoured(new Color('#e6cfa2'))).toBe(true);
    expect(woodColoured(new Color('#6f8a45'))).toBe(false);
  });

  it('keeps its hands off him, his family, the candy and what gives off light', () => {
    const garden = STORY.find((chapter) => chapter.id === 'garden')!;
    const ctx = context(garden);
    const elof = new Group();
    elof.name = 'player-figure';
    const skin = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#e0b48a' }));
    elof.add(skin);
    ctx.dressing!.add(elof);
    expect(classify(skin, skin.material, ctx.dressing ?? null, garden)).toBeNull();
    const pappa = new Group();
    pappa.name = 'stage-pappa';
    const coat = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#5a7d4a' }));
    pappa.add(coat);
    expect(classify(coat, coat.material, ctx.dressing ?? null, garden)).toBeNull();
    const sweet = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#e8483f' }));
    sweet.material.userData.candy = {};
    ctx.dressing!.add(sweet);
    expect(classify(sweet, sweet.material, ctx.dressing ?? null, garden)).toBeNull();
    const lamp = new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffd9a0', emissiveIntensity: 0.8 }));
    ctx.dressing!.add(lamp);
    expect(classify(lamp, lamp.material, ctx.dressing ?? null, garden)).toBeNull();
  });

  it('wets everything out of doors in the storm, the street after rain, and nothing at home indoors', () => {
    const byId = (id: string) => all().find((chapter) => chapter.id === id)!;
    for (const id of ['stormgard', 'stormskog', 'stormbyn', 'flarken', 'alven', 'billsta']) expect(wetOf(byId(id), byId(id).place).x, id).toBeGreaterThanOrEqual(0.8);
    // At home only what is past the door gets wet.
    expect(wetOf(byId('stormkvall'), 'home').y).toBe(byId('stormkvall').outdoors);
    expect(wetOf(byId('morgonen'), 'home').x).toBe(0);
    expect(wetOf(byId('byn'), 'village').w).toBeGreaterThan(0.3);
    expect(wetOf(byId('berget'), 'mountain').toArray().filter((_, i) => i !== 1)).toEqual([0, 0, 0]);
  });

  it('holds its glints and the dew still with reduced motion', () => {
    const granskog = STORY.find((chapter) => chapter.id === 'granskog')!;
    const ctx = context(granskog);
    const surfaces = createSurfaces(ctx);
    surfaces.apply(ctx.scene);
    const shader = compile(patched(ctx.scene)[0]!);
    const time = (shader.uniforms as Record<string, { value: number }>).liftTime!;
    surfaces.update(frame({ still: true }));
    surfaces.update(frame({ still: true }));
    expect(time.value).toBe(0);
    surfaces.update(frame());
    expect(time.value).toBeGreaterThan(0);
    const dew = createDew(ctx)!;
    const mesh = ctx.scene.getObjectByName('lift-dew') as InstancedMesh;
    const dewTime = (compile(mesh.material as Material).uniforms as Record<string, { value: number }>).dewTime!;
    dew.update(frame({ still: true }));
    dew.update(frame({ still: true }));
    expect(dewTime.value).toBe(0);
  });

  it('puts dew only behind the path, of a morning out of doors, on the rich layer and fewer on Mid', () => {
    for (const chapter of all()) {
      const places = dewPlaces(context(chapter));
      if (!dewy(chapter) && chapter.id !== 'morgonen') { expect(places, chapter.id).toEqual([]); continue; }
      for (const dew of places) expect(dew.at.z, chapter.id).toBeLessThan(-0.8);
    }
    for (const id of ['garden', 'granskog', 'morgonen']) {
      const chapter = all().find((one) => one.id === id)!;
      const ctx = context(chapter);
      const dew = createDew(ctx)!;
      expect(dew, id).not.toBeNull();
      const mesh = ctx.scene.getObjectByName('lift-dew') as InstancedMesh;
      expect(mesh.userData.rich).toBe(true);
      const most = mesh.instanceMatrix.count;
      expect(most, id).toBeGreaterThan(10);
      dew.update(frame({ tier: 'low' }));
      expect(mesh.count).toBe(0);
      dew.update(frame({ tier: 'mid' }));
      expect(mesh.count).toBe(Math.round(most * 0.6));
      dew.update(frame({ tier: 'high' }));
      expect(mesh.count).toBe(most);
    }
  });

  it('adds no red, pink or gold: the dew, its sun, the glints and a carving\'s rim are pale', () => {
    expect(candyColoured(ink(new Color(DEW)))).toBe(false);
    expect(candyColoured(RIM.map((c) => c * 255))).toBe(false);
    for (const chapter of all()) {
      const look = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
      const sun = new Color(look.sun.colour);
      expect(candyColoured(ink(sun.clone().lerp(new Color(1, 1, 1), PALED))), chapter.id).toBe(false);
    }
  });
});

describe('the water that mirrors its banks', () => {
  it('mirrors each pool\'s ends, the trunks near it and, on High, the picture so far', () => {
    for (const chapter of all().filter((one) => (one.water ?? []).length > 0)) {
      const look = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
      const water = createWater(chapter, look.water, look.sun.from, { place: look.id, street: (x) => x * 0 });
      const material = (water.group.children[0] as Mesh).material as ShaderMaterial;
      expect(material.uniforms.banks!.value, chapter.id).toHaveLength(8);
      expect(material.fragmentShader).toContain('textureLod(refraction');
      // The bog's islands are mirrored on Mid from a row of their heights.
      expect(material.uniforms.islandFrame!.value.y > 0, chapter.id).toBe(look.id === 'bog');
    }
  });
});
