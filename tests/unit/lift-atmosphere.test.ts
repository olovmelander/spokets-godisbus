import { BufferAttribute, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector2 } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADVENTURE2, BONUS, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';
import { AIR_COUNTS, GLOW, LIFE, effects, fallingCount, type AirMood } from '../../src/render/dressing/effects';
import { heightAt, landscape, makeKit } from '../../src/render/dressing/kit';
import { PACK, type ExtraFrame } from '../../src/render/extensions';
import { AIR, MOON, makeAir } from '../../src/render/lift/atmosphere';
import { AIR_KEY, sunOnScreen, type AirAsk } from '../../src/render/light-shafts';
import type { ChapterData } from '../../src/sim/types';

// The effects draw their one picture on a canvas: here a canvas that draws nothing will do.
const context = new Proxy({}, {
  get: (_, key) => (key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}),
  set: () => true,
});
const real = (globalThis as { document?: unknown }).document;
beforeAll(async () => {
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  makeKit();
  await loadAdventure2();
});
afterAll(() => { (globalThis as { document?: unknown }).document = real; });

const chapters = () => [...STORY, ...BONUS, ...ADVENTURE2].filter((chapter) => chapter.place);

/** A chapter's air as the view makes it: its cards in the dressing, and the system that tells them and the pass. */
function build(chapter: ChapterData) {
  const land = landscape(chapter);
  const from = chapter.ground[0]!.x, to = chapter.ground[chapter.ground.length - 1]!.x;
  const air = effects(land, from, to, chapter.place!);
  const dressing = new Group().add(air.group);
  const place = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
  const scene = new Scene();
  scene.fog = new Fog(new Color(place.haze.colour), 10, 60);
  const sun = new DirectionalLight();
  sun.position.set(...place.sun.from);
  const system = makeAir({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun, place, dressing })!;
  const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);
  const frame = (over: Partial<ExtraFrame> = {}): ExtraFrame => ({
    dt: 1 / 60, clock: 0, flags: new Set(), x: chapter.spawn.x, y: chapter.spawn.y, camera, still: false, tier: 'high', riding: false, darkness: 0, ...over,
  });
  const ask = () => scene.userData[AIR_KEY] as AirAsk;
  return { air, system, camera, frame, ask, mood: air.group.userData.mood as AirMood, land };
}

/** Every quad of the effects' batches: its middle, and the colour and opacity of its first corner. */
function quads(group: Group) {
  return group.children.flatMap((child) => {
    const mesh = child as Mesh;
    const at = mesh.geometry.getAttribute('position') as BufferAttribute, colour = mesh.geometry.getAttribute('color') as BufferAttribute;
    return Array.from({ length: at.count / 4 }, (_, i) => {
      const xs = [0, 1, 2, 3].map((k) => at.getX(i * 4 + k)), ys = [0, 1, 2, 3].map((k) => at.getY(i * 4 + k)), zs = [0, 1, 2, 3].map((k) => at.getZ(i * 4 + k));
      return {
        order: mesh.renderOrder, x: xs.reduce((a, b) => a + b) / 4, y: ys.reduce((a, b) => a + b) / 4, z: zs.reduce((a, b) => a + b) / 4,
        size: Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys), alpha: colour.getW(i * 4),
      };
    });
  });
}

/** Red, pink and gold are the candy's: a tint is pale or dark, and never of those hues (as tests/unit/life.test.ts checks). */
function candyColoured(ink: string): boolean {
  const hex = new Color(ink).getHex();
  const [r, g, b] = [hex >> 16 & 255, hex >> 8 & 255, hex & 255];
  const most = Math.max(r, g, b), chroma = most - Math.min(r, g, b);
  if (chroma <= 40) return false;
  if (chroma > 120) return true;
  const h = 60 * (most === r ? ((g - b) / chroma + 6) % 6 : most === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4);
  return h < 30 || h > 270;
}

describe('the air of every chapter (src/render/lift/atmosphere.ts, src/render/dressing/effects.ts)', () => {
  it('builds for every chapter of both adventures, and asks the pass for its light and haze', () => {
    expect(ADVENTURE2.length).toBe(10);
    for (const chapter of chapters()) {
      const { system, frame, ask, mood } = build(chapter);
      expect(system, chapter.id).toBeTruthy();
      expect(mood, chapter.id).toBeTruthy();
      for (let i = 0; i < 4; i++) system.update(frame({ clock: i / 60 }));
      const a = ask();
      expect(a.strength, chapter.id).toBeGreaterThanOrEqual(0);
      expect(a.hazeShape.y, chapter.id).toBeGreaterThan(a.hazeShape.x);
      expect(a.cut.y, chapter.id).toBeGreaterThan(a.cut.x);
    }
  });

  it('shines by day out of doors, and not at night, nor in a raging storm, nor in a room', () => {
    for (const chapter of chapters()) {
      const { system, frame, ask } = build(chapter);
      system.update(frame());
      const indoors = chapter.place === 'home' && (chapter.outdoors === undefined || chapter.spawn.x < chapter.outdoors - 2);
      if (chapter.storm || indoors) expect(ask().strength, chapter.id).toBe(0);
      else expect(ask().strength, chapter.id).toBeGreaterThan(0.1);
      system.update(frame({ darkness: 1 }));
      if (!chapter.storm?.calm) expect(ask().strength, `${chapter.id} at night`).toBe(0);
    }
  });

  it('opens the storm\'s eye to cool moonlight over three seconds, and at once with less motion', () => {
    const eye = ADVENTURE2.find((chapter) => chapter.storm?.calm)!;
    expect(eye.id).toBe('stormoga');
    const { system, frame, ask, mood } = build(eye);
    const flags = new Set([eye.storm!.calm!]);
    system.update(frame({ flags, dt: 1 }));
    expect(ask().strength).toBeGreaterThan(0);
    expect(ask().strength).toBeLessThan(MOON.shafts);
    for (let i = 0; i < 4; i++) system.update(frame({ flags, dt: 1 }));
    expect(ask().strength).toBeCloseTo(MOON.shafts, 5);
    expect(mood.storm).toBe(0);
    const still = build(eye);
    still.system.update(still.frame({ flags, still: true }));
    expect(still.ask().strength).toBeCloseTo(MOON.shafts, 5);
  });

  it('tells the cards the tier, and draws fewer of everything on Low', () => {
    const forest = STORY.find((chapter) => chapter.id === 'granskog')!;
    const shown = (tier: ExtraFrame['tier']) => {
      const { air, system, frame, land } = build(forest);
      system.update(frame({ tier }));
      for (let i = 1; i < 30; i++) air.update(60, heightAt(land, 60), 2 + i * 0.2);
      return quads(air.group).filter((q) => q.size > 0 && q.alpha > 0).length;
    };
    expect(shown('low')).toBeLessThan(shown('mid'));
    expect(shown('mid')).toBeLessThan(shown('high'));
  });

  it('keeps all of it behind the path, the mist farther still, and none of it falls or flies with less motion', () => {
    for (const chapter of chapters()) {
      const { air, system, frame, land } = build(chapter);
      system.update(frame());
      const ground = chapter.ground;
      for (const x of [ground[0]!.x + 10, (ground[0]!.x + ground[ground.length - 1]!.x) / 2]) {
        air.update(x, heightAt(land, x), 4.2);
        for (const q of quads(air.group)) {
          if (q.size === 0 || q.alpha === 0) continue;
          expect(q.z, `${chapter.id} at ${x}`).toBeLessThan(-0.8);
          if (q.order === 2) expect(q.z, `${chapter.id}: mist`).toBeLessThan(-2.4);
        }
      }
      // With reduced motion nothing moves by itself: two moments a second apart are the same picture.
      const x = ground[0]!.x + 12;
      air.update(x, heightAt(land, x), 10, true);
      const first = quads(air.group);
      air.update(x, heightAt(land, x), 11.5, true);
      expect(quads(air.group), chapter.id).toEqual(first);
      // ...and no leaf falls, nor any butterfly flies: what is left is the bee on its flower and the midges, which hang.
      const life = quads(air.group).filter((q) => q.order === -0.5);
      const hanging = life.length - fallingCount(chapter, chapter.place!) - (chapter.place === 'garden' ? 4 : 0);
      expect(life.filter((q) => q.alpha > 0 && q.size > 0).length, chapter.id).toBeLessThanOrEqual(hanging);
    }
  });

  it('blows more leaves across the picture in a storm, and puts the sun\'s shafts out', () => {
    const skog = ADVENTURE2.find((chapter) => chapter.id === 'stormskog')!;
    const { air, system, frame, land } = build(skog);
    system.update(frame());
    air.update(60, heightAt(land, 60), 3);
    const lit = quads(air.group).filter((q) => q.order === 3 && q.size > 0 && q.alpha > 0);
    expect(lit.length).toBe(0);
    // Torn off by the storm's wind (Olov's request for more life, 8 November 2026): more than fall on a still day.
    const leaves = quads(air.group).filter((q) => q.order === -0.5 && q.size > 0);
    expect(leaves.length).toBeGreaterThan(AIR_COUNTS.forest.falling);
    expect(leaves.length).toBeLessThanOrEqual(fallingCount(skog, 'forest'));
    // Behind the path, and some of them low over the ground.
    for (const leaf of leaves) expect(leaf.z).toBeLessThan(-0.8);
  });

  it('lights with pale colours only: nothing red, pink or gold, which are the candy\'s', () => {
    const inks = [...Object.values(GLOW), ...Object.values(AIR).map((air) => air.colour), MOON.colour];
    for (const ink of inks) expect(candyColoured(ink), ink).toBe(false);
    // What falls and flies is dull as well, as the soft cards are (tests/unit/soft-cards.test.ts).
    for (const ink of Object.values(LIFE)) {
      const hsl = new Color(ink).getHSL({ h: 0, s: 0, l: 0 });
      const strong = hsl.s * (1 - Math.abs(2 * hsl.l - 1));
      if (hsl.h * 360 < 25 || hsl.h * 360 > 315) expect(strong, ink).toBeLessThan(0.3);
      if (hsl.h * 360 >= 25 && hsl.h * 360 < 65) expect(strong, ink).toBeLessThan(0.45);
    }
  });

  it('lets the shafts fall from above, slanting no more than the cards do, from a sun behind the scene', () => {
    const camera = new PerspectiveCamera(30, 1180 / 820, 0.1, 140);
    camera.position.set(20, 3, 12);
    camera.lookAt(20, 3, 0);
    camera.updateMatrixWorld();
    for (const place of Object.values(PLACES)) {
      const from = new DirectionalLight().position.set(...place.sun.from);
      const at = sunOnScreen(camera, from, null, new Vector2());
      // Above the picture's middle by a picture's height or more, and to the left, where the sun stands.
      expect(at.y, place.id).toBeGreaterThanOrEqual(1.5 - 1e-6);
      expect(at.x, place.id).toBeLessThan(0.5);
      expect(Math.atan2(Math.abs(at.x - 0.5) * camera.aspect, at.y - 0.5), place.id).toBeLessThanOrEqual(0.56 + 1e-6);
    }
  });
});
