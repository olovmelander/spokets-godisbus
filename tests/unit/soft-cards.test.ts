import { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { LIFE } from '../../src/render/dressing/effects';
import { CLEAR, INK, PALE, ceilingAt, tufts, walkLine, type Growth } from '../../src/render/dressing/foreground';
import { heightAt } from '../../src/render/dressing/kit';
import { createMaterialGrade, GARDEN_MORNING } from '../../src/render/grade';
import { quadBatch } from '../../src/render/quads';
import { BREATH, setWind, sway, windAt } from '../../src/render/wind';
import { cameraIntent } from '../../src/sim/camera-intent';
import type { ChapterData, PlayerState } from '../../src/sim/types';

/** The places with something soft in front of the path, and what grows there. */
const GROWN: [course: string, growth: Growth][] = [['garden', 'bright'], ['granskog', 'dark'], ['myren', 'straw'], ['byn', 'kerb']];

/** The screens the contact sheets are taken at, a small phone, and a large screen. */
const SCREENS = [[844, 390], [780, 360], [1180, 820], [1440, 900], [1920, 1080], [390, 844]] as const;

/** The camera as the view sets it up (src/render/view.ts): the lens, and where the ground lies in the picture. */
const FOV = 30;
const GROUND_FROM_BOTTOM = 0.35;
function lensOf(width: number, height: number) {
  const elofPx = Math.min(140, Math.max(75, height * 0.2));
  const viewHeight = Math.max(height / elofPx, 6 / (width / height));
  return { viewHeight, distance: viewHeight / 2 / Math.tan((FOV * Math.PI) / 360), aspect: width / height };
}

describe('a batch of quads', () => {
  it('puts each card where it is told, with its own part of the picture and its own colour', () => {
    const batch = quadBatch(3, new MeshBasicMaterial());
    batch.put(1, 10, 2, -3, 2, 0, 0, 1);
    batch.cell(1, 0.25, 0, 0.25, 1);
    batch.tint(1, 0.5, 0.25, 1, 0.3);
    const at = (name: string, i: number) => [...batch.mesh.geometry.getAttribute(name).array.slice(i * (name === 'uv' ? 8 : name === 'color' ? 16 : 12), (i + 1) * (name === 'uv' ? 8 : name === 'color' ? 16 : 12))];
    // Bottom left, bottom right, top left, top right.
    expect(at('position', 1)).toEqual([8, 1, -3, 12, 1, -3, 8, 3, -3, 12, 3, -3]);
    expect(at('uv', 1)).toEqual([0.25, 0, 0.5, 0, 0.25, 1, 0.5, 1]);
    expect(at('color', 1).slice(0, 4).map((v) => +v.toFixed(3))).toEqual([0.5, 0.25, 1, 0.3]);
    // One that has not been put anywhere has no size, and one that lies on the ground is laid along z.
    expect(at('position', 0).every((v) => v === 0)).toBe(true);
    batch.put(2, 0, 5, -8, 1, 0, 0, 0, -2);
    expect(at('position', 2)).toEqual([-1, 5, -6, 1, 5, -6, -1, 5, -10, 1, 5, -10]);
    // It is one mesh, drawn whole and never culled: a chapter's cards are one draw call.
    expect(batch.mesh.frustumCulled).toBe(false);
    expect(batch.mesh.geometry.getIndex()!.count).toBe(18);
  });
});

describe('the soft cards in front of the path', () => {
  it('stand in every place that has growth, and nowhere on boards, in a shop or in the middle of a pool', () => {
    for (const [course, growth] of GROWN) {
      const chapter = COURSES[course]!;
      const cards = tufts(chapter, growth);
      expect(cards.length, course).toBeGreaterThan(8);
      for (const card of cards) {
        expect(Number.isFinite(card.y), `${course} at ${card.x.toFixed(1)}`).toBe(true);
        expect(card.z, course).toBeGreaterThanOrEqual(2.6);
        expect(card.z, course).toBeLessThanOrEqual(5.6);
        const built = chapter.surfaces?.find((s) => card.x >= s.from && card.x <= s.to)?.kind;
        expect(built === undefined || (growth === 'kerb' && built === 'paving'), `${course} at ${card.x.toFixed(1)} on ${built}`).toBe(true);
        if (chapter.shop) expect(card.x, 'nothing grows indoors').toBeLessThan(chapter.shop.door);
      }
    }
  });

  it('never rise over the line he walks on, from wherever he stands and whichever way he looks, on any screen', () => {
    for (const [course, growth] of GROWN) {
      const chapter = COURSES[course]!;
      const walk = walkLine(chapter);
      const cards = tufts(chapter, growth);
      let seen = 0;
      let nearest = Infinity;
      let where = '';
      for (const [width, height] of SCREENS) {
        const { viewHeight, distance, aspect } = lensOf(width, height);
        for (let x = chapter.ground[0]!.x + 0.5; x < chapter.ground[chapter.ground.length - 1]!.x - 0.5; x += 0.25) {
          // Only where he can stand: on the ground, not in a pool and not down a drop the bubble takes him from.
          const y = heightAt(chapter, x);
          if (walk(x, true) !== y) continue;
          for (const facing of [-1, 1] as const) {
            const look = cameraIntent({ x, y, facing, mode: 'free', groundY: y, standY: y, hook: null } as unknown as PlayerState, chapter.cameras);
            const eye = { x: look.x, y: look.y + viewHeight * look.zoom * (0.5 - GROUND_FROM_BOTTOM), z: distance * look.zoom };
            for (const card of cards) {
              // The top of what is drawn on it, at its two corners and its middle, as the lens sees it on the path.
              const top = card.y + card.tall / 2 - card.tall * CLEAR;
              const scale = eye.z / (eye.z - card.z);
              for (const side of [-0.5, 0, 0.5]) {
                const over = eye.x + (card.x + side * card.wide - eye.x) * scale;
                if (Math.abs(over - eye.x) > (viewHeight * look.zoom * aspect) / 2) continue;
                const shown = eye.y + (top - eye.y) * scale;
                // Under the picture's lower edge it is not seen, and covers nothing.
                if (shown < eye.y - (viewHeight * look.zoom) / 2) continue;
                seen++;
                if (walk(over) - shown >= nearest) continue;
                nearest = walk(over) - shown;
                where = `${course} at ${width}x${height}: the card at ${card.x.toFixed(1)}, seen from ${x.toFixed(2)} facing ${facing}, lies over ${over.toFixed(1)}`;
              }
            }
          }
        }
      }
      // The highest any card comes is under the line (to a fiftieth of an EL, for the steps the rule is
      // counted in). And they are in the picture, and come close under it: the rule does not hide them all.
      expect(nearest, where).toBeGreaterThanOrEqual(-0.02);
      expect(seen, course).toBeGreaterThan(2000);
      expect(nearest, `${course}: how near the line the highest card comes`).toBeLessThan(0.5);
    }
  });

  it('are as high as their ground lets them on a level stretch and on an even slope, and lower beside a step or a gap', () => {
    const made = (ground: [number, number][]) => ({ id: 'made', ground: ground.map(([x, y]) => ({ x, y })), spawn: { x: 0, y: 0 }, goalX: 100, candy: [] }) as ChapterData;
    // Level ground: a card's top may be a little over its own ground, the more the nearer the lens it stands.
    const level = made([[-50, 0], [150, 0]]);
    expect(ceilingAt(level, walkLine(level), 50, 3)).toBeGreaterThan(0.1);
    expect(ceilingAt(level, walkLine(level), 50, 5.5)).toBeGreaterThan(ceilingAt(level, walkLine(level), 50, 3));
    expect(ceilingAt(level, walkLine(level), 50, 5.5)).toBeLessThan(0.45);
    // An even slope takes almost nothing away: only what the picture's looking ahead of him costs.
    const slope = made([[-50, -10], [150, 30]]);
    expect(ceilingAt(slope, walkLine(slope), 50, 3) - 10).toBeGreaterThan(ceilingAt(level, walkLine(level), 50, 3) - 0.25);
    // On top of a step, seen from the ground four EL below it, a card has to stay far down; under it, not.
    const step = made([[-50, 0], [50, 0], [50, 4], [150, 4]]);
    expect(ceilingAt(step, walkLine(step), 52, 4)).toBeLessThan(4 - 1);
    expect(ceilingAt(step, walkLine(step), 44, 4)).toBeGreaterThan(0.1);
    expect(ceilingAt(step, walkLine(step), 80, 4)).toBeGreaterThan(4.1);
    // Over a gap that the bubble takes him out of, it stays under him while he falls: lower than beside it.
    const gap = made([[-50, 0], [49, 0], [49, -20], [51, -20], [51, 0], [150, 0]]);
    expect(walkLine(gap)(50)).toBe(-4);
    expect(walkLine(gap)(50, true)).toBe(0);
    expect(ceilingAt(gap, walkLine(gap), 50, 4)).toBeLessThan(ceilingAt(level, walkLine(level), 50, 4) - 1);
  });

  it('are drawn in dull greens, straw and pale grey: nothing red, pink or gold, which are the candy\'s', () => {
    const inks = [...Object.values(INK).flat(), PALE, ...Object.values(LIFE)];
    expect(inks.length).toBeGreaterThan(10);
    for (const ink of inks) {
      const hsl = new Color(ink).getHSL({ h: 0, s: 0, l: 0 });
      const hue = hsl.h * 360;
      const strong = hsl.s * (1 - Math.abs(2 * hsl.l - 1));
      // Not red or pink at all, unless it is nearly grey or nearly black.
      if (hue < 25 || hue > 315) expect(strong, `${ink} is red`).toBeLessThan(0.3);
      // Yellow only as straw: never as bright as a sweet's wrapper.
      if (hue >= 25 && hue < 65) expect(strong, `${ink} is gold`).toBeLessThan(0.45);
    }
  });
});

describe('the wind', () => {
  it('moves nothing at all when reduced motion is asked for', () => {
    for (const clock of [0, 1.3, 7.7, 400]) {
      setWind(clock, true, true, { from: 0, to: 50, blow: 1 });
      for (let x = -20; x < 80; x += 3.7) expect(Math.abs(windAt(x))).toBe(0);
    }
  });

  it('sways gently in still air, and a breath passes every few seconds, to the right', () => {
    let most = 0;
    const leans: number[] = [];
    for (let clock = 0; clock < BREATH.every * 3; clock += 0.05) {
      setWind(clock, false, true, null);
      most = Math.max(most, Math.abs(windAt(12)));
      leans.push(windAt(12));
      // Without breaths it only sways: never further than its full swing either way.
      setWind(clock, false, false, null);
      expect(Math.abs(windAt(12))).toBeLessThanOrEqual(1);
    }
    // In a breath it leans well over, and three breaths pass in three periods.
    expect(most).toBeGreaterThan(2.5);
    expect(most).toBeLessThan(4.5);
    expect(leans.filter((lean, i) => lean > 2 && leans[i - 1]! <= 2).length).toBe(3);
    // The breath reaches a place nine EL on about a second later: it travels along the path.
    const comes = (x: number) => {
      for (let clock = 0; clock < BREATH.every * 2; clock += 0.01) {
        setWind(clock, false, true, null);
        const before = windAt(x, 0);
        setWind(clock + 0.01, false, true, null);
        if (before <= 1.2 && windAt(x, 0) > 1.2) return clock;
      }
      return NaN;
    };
    const later = (comes(BREATH.speed) - comes(0) + BREATH.every) % BREATH.every;
    expect(later).toBeGreaterThan(0.7);
    expect(later).toBeLessThan(1.3);
  });

  it('lays the grass over to the left in a gust, where the gust blows and nowhere else', () => {
    setWind(3, false, false, { from: 108, to: 136, blow: 1 });
    expect(windAt(120)).toBeLessThan(-2.5);
    expect(Math.abs(windAt(90))).toBeLessThanOrEqual(1);
    expect(Math.abs(windAt(160))).toBeLessThanOrEqual(1);
    // What only a gust moves (the lichen) stands still outside it, and moves in it.
    expect(windAt(90, 0)).toBe(0);
    expect(windAt(120, 0)).toBeLessThan(-2.5);
  });

  it('is one patch with one key, which leaves the grade and the caustics their places', () => {
    const blades = new MeshStandardMaterial();
    const stalk = new MeshStandardMaterial();
    const plain = new MeshStandardMaterial();
    sway(blades, 0.07);
    sway(stalk, 0, 0.045);
    // The place's grade is put on afterwards, by the view, as on every material.
    const grade = createMaterialGrade(GARDEN_MORNING);
    for (const material of [blades, stalk, plain]) grade.apply(new Mesh(undefined, material));
    // Every material that sways has the same key, and another than one that does not: so they share one
    // program, and no program is made when a new bend is given.
    expect(blades.customProgramCacheKey()).toBe(stalk.customProgramCacheKey());
    expect(blades.customProgramCacheKey()).not.toBe(plain.customProgramCacheKey());
    expect(blades.customProgramCacheKey()).toContain('wind-v1');
    expect(blades.customProgramCacheKey()).toContain('place-grade-v1');

    const compiled = (material: MeshStandardMaterial) => {
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: 'void main() {\n#include <begin_vertex>\n#include <project_vertex>\n}',
        fragmentShader: 'void main() {\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
      };
      material.onBeforeCompile(shader as unknown as WebGLProgramParametersWithUniforms, null as unknown as WebGLRenderer);
      return shader;
    };
    const [a, b] = [compiled(blades), compiled(stalk)];
    // The same text for both: they differ by their uniforms only.
    expect(a.vertexShader).toBe(b.vertexShader);
    expect(a.uniforms['windBend']!.value).not.toEqual(b.uniforms['windBend']!.value);
    expect(a.uniforms['windTime']).toBe(b.uniforms['windTime']);
    // It adds its push after three's own `begin_vertex` and takes neither that nor `project_vertex` away:
    // the water's caustics put their own lines in front of `project_vertex`, and read the pushed corner.
    expect(a.vertexShader.match(/#include <begin_vertex>/g)).toHaveLength(1);
    expect(a.vertexShader.match(/#include <project_vertex>/g)).toHaveLength(1);
    expect(a.vertexShader.indexOf('transformed +=')).toBeGreaterThan(a.vertexShader.indexOf('#include <begin_vertex>'));
    expect(a.vertexShader.indexOf('transformed +=')).toBeLessThan(a.vertexShader.indexOf('#include <project_vertex>'));
    // And the grade is still in the fragment stage.
    expect(a.fragmentShader).toContain('placeGradeEnabled');
    expect(compiled(plain).vertexShader).not.toContain('windTime');
  });
});
