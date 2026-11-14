import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, Mesh } from 'three';
import { billsta, NUT } from '../../src/content/aventyr2/chapters/billsta';
import { foundNut } from '../../src/content/aventyr2/hazel';
import { HAZELNUT, hazelnutShape } from '../../src/render/hazelnut';
import { createStage } from '../../src/render/stage';
import { createRehearsalRig } from '../../src/render/rig';

/**
 * The hazelnut Elof finds on Billaberget (Olov, 14 November 2026: "På berget vid hasselnötsbuskarna ska Elof hitta en
 * hasselnöt och säga något om fyndet"): it lies on the first boulder, he picks it up, it is in his hands while he looks
 * at it and says what it is, and he lays it down again.
 */

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

const scene = billsta.scenes!.find((s) => s.id === 'bi:nut')!;
const held = scene.stage!.held!;

describe('the hazelnut on the first boulder', () => {
  it('is a hazelnut as big as his head: brown, its foot a pale scar', () => {
    const shape = hazelnutShape();
    shape.computeBoundingBox();
    const box = shape.boundingBox!;
    expect(box.max.y - box.min.y).toBeCloseTo(HAZELNUT.long, 2);
    // About a quarter of him (1 EL) long: his head's size.
    expect(HAZELNUT.long).toBeGreaterThan(0.2);
    expect(HAZELNUT.long).toBeLessThan(0.32);
    const at = shape.getAttribute('position'), colour = shape.getAttribute('color');
    let foot = 0, footN = 0, body = 0, bodyN = 0;
    for (let i = 0; i < at.count; i++) {
      const light = colour.getX(i) + colour.getY(i) + colour.getZ(i);
      if (at.getY(i) < HAZELNUT.long * 0.1) { foot += light; footN++; } else if (at.getY(i) > HAZELNUT.long * 0.35 && at.getY(i) < HAZELNUT.long * 0.7) { body += light; bodyN++; }
    }
    expect(foot / footN).toBeGreaterThan((body / bodyN) * 1.4);
    // Brown: redder than it is green, greener than blue.
    expect(colour.getX(at.count >> 1)).toBeGreaterThan(colour.getY(at.count >> 1));
  });

  it('lies on the rock until his hands have it, is gone from it while he holds it, and lies there again after', () => {
    const nut = foundNut(billsta);
    const frame = (seconds: number | null, x = NUT.at) => nut.update({ dt: 0.05, x, still: false, scene: seconds === null ? null : { id: 'bi:nut', seconds } });
    frame(null);
    expect(nut.group.visible).toBe(true);
    const lying = new Box3().setFromObject(nut.group);
    // On the boulder's top, not in it, in front of the path.
    expect(lying.min.y).toBeGreaterThan(NUT.y - 0.03);
    expect(lying.min.y).toBeLessThan(NUT.y + 0.02);
    expect(lying.min.z).toBeGreaterThan(0.1);
    for (let t = 0; t < held.from; t += 0.05) frame(t);
    expect(nut.group.visible).toBe(true);
    frame(held.from + 0.05);
    expect(nut.group.visible).toBe(false);
    frame(held.until - 0.05);
    expect(nut.group.visible).toBe(false);
    frame(held.until + 0.05);
    expect(nut.group.visible).toBe(true);
    frame(null);
    expect(nut.group.visible).toBe(true);
  });

  it('rolls in a gust to where his hands go for it, if he has stopped short of it or beyond', () => {
    const nut = foundNut(billsta);
    for (let t = 0; t < 1; t += 0.05) nut.update({ dt: 0.05, x: NUT.at + 0.7, still: false, scene: { id: 'bi:nut', seconds: Math.min(t, held.from - 0.01) } });
    expect(nut.group.position.x).toBeCloseTo(NUT.at + 0.7 + NUT.reach.x, 3);
  });

  it('is in his two hands while the moment says, between them, as big as he is drawn', () => {
    const stage = createStage(billsta, () => 0);
    // A posable body for his hands: any of the family's will do here.
    const rig = createRehearsalRig('moa');
    const holding = stage.group.getObjectByName('held-hazelnut') as Mesh;
    expect(holding).toBeDefined();
    const told = new Set(['scene:card', 'scene:bi:kids-run', 'scene:bi:tack-morfar', 'scene:bi:ladan', 'scene:bi:tack-mormor']);
    for (const [t, inHands] of [[0.2, false], [held.from + 0.1, true], [2, true], [held.until + 0.1, false]] as const) {
      const directions = stage.update({ id: 'bi:nut', seconds: t }, told, { x: NUT.at, y: NUT.y }, 100 + t, 1 / 60, false);
      stage.updateElof(rig, directions.elof, 1, false);
      expect(holding.visible, `at ${t} s`).toBe(inHands);
    }
    const directions = stage.update(null, told, { x: NUT.at + 3, y: NUT.y }, 110, 1 / 60, false);
    stage.updateElof(rig, directions.elof, 1, false);
    expect(holding.visible).toBe(false);
  });
});
