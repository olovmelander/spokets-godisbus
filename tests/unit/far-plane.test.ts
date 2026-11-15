import { Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, BONUS, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES, dress } from '../../src/render/dressing';
import { SIGHT, farPlane } from '../../src/render/far-plane';
import type { ChapterData } from '../../src/sim/types';

/**
 * Olov, 15 November 2026: in Lördagsmorgon's last picture "försvinner bakgrunden", as the stars had in Stormens öga, and
 * "Vi måste fixa det på alla ställen där kameran zoomar ut så bakgrunden inte försvinner". A shot backs the camera off to
 * fit its width; the far plane stayed at 140, and on a phone held upright the title over the garden saw 26 EL behind the
 * play plane, Flärken's card 18, Morgonen efter's last picture not even the plane itself.
 */
const FOV = 30;
/** A phone held upright and sideways, an iPad held upright and sideways. */
const ASPECTS = [390 / 844, 820 / 1180, 1180 / 820, 844 / 390];

let chapters: ChapterData[] = [];
const deepest = new Map<string, number>();
beforeAll(async () => {
  // The dressing draws on canvases: there are none here, and what they would hold is not needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 1 });
  await loadAdventure2();
  chapters = [...STORY, ...BONUS, ...ADVENTURE2];
  const at = new Vector3();
  for (const chapter of chapters) {
    let back = 0;
    if (chapter.place) {
      const dressing = dress(chapter, PLACES[chapter.place]);
      dressing.group.updateMatrixWorld(true);
      dressing.group.traverse((o) => { if (o.name.startsWith('far-')) back = Math.max(back, -o.getWorldPosition(at).z); });
    }
    deepest.set(chapter.id, back);
  }
}, 120000);
afterAll(() => vi.unstubAllGlobals());

describe('how far the camera sees (src/render/far-plane.ts)', () => {
  it('sees as far as it always did at the usual picture, and as far behind the play plane however far it backs off', () => {
    for (const eye of [0, 9, 15]) {
      expect(farPlane(eye)).toBe(140);
      expect(farPlane(eye, true)).toBe(640);
    }
    for (const eye of [15, 40, 114, 154, 300]) {
      expect(farPlane(eye) - eye).toBeGreaterThanOrEqual(SIGHT.far - SIGHT.eye);
      expect(farPlane(eye, true) - eye).toBeGreaterThanOrEqual(SIGHT.brink - SIGHT.eye);
    }
  });

  it("keeps every chapter's far layers in sight in every scene's shot, on a phone and an iPad held either way", () => {
    let wide = 0;
    for (const chapter of chapters) {
      const back = deepest.get(chapter.id)!;
      for (const scene of chapter.scenes ?? []) {
        for (const shot of scene.stage?.shots ?? []) {
          for (const aspect of ASPECTS) {
            // A shot without a width fits its height alone, as the stage takes it (src/render/stage.ts).
            const tall = Math.max(shot.height, (shot.width ?? 0) / aspect);
            const eye = (shot.z ?? 0) + tall / 2 / Math.tan((FOV * Math.PI) / 360);
            if (eye > SIGHT.eye + 30) wide++;
            // The play plane and everything drawn far behind it, with room to spare.
            expect(farPlane(eye, !!chapter.brink) - eye, `${chapter.id} ${scene.id} at ${shot.at}, ${aspect.toFixed(2)} wide`).toBeGreaterThan(back + 10);
          }
        }
      }
    }
    // There are such shots: the title over the garden, Flärken's card, Morgonen efter's last picture and others.
    expect(wide).toBeGreaterThan(10);
  });
});
