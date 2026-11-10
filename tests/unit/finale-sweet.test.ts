import { stubCanvas } from './canvas-stub';
import { Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { actPose } from '../../src/render/acting';
import { createPlayerStandIn } from '../../src/render/player-motion';
import { STANDING } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

/**
 * The golden geléhallon in Stormens öga (Olov, 9 November 2026: "Geléhallonet i guld, som gör Elof stor igen, syns inte i
 * scenen"): it is in his hand as he holds it up, at his lips as he tastes it, and eaten before he grows.
 */
describe('the golden sweet that makes him big again', () => {
  const at = { x: 46.4, y: 0.6 };
  function staged() {
    const stage = createStage(stormoga, () => at.y), body = createPlayerStandIn();
    body.group.position.set(at.x, at.y, 0);
    const show = (seconds: number) => {
      const direction = stage.update({ id: 'stor', seconds }, new Set(['taste']), at, seconds, 0, false).elof!;
      body.pose(actPose(direction.act!, { t: direction.actT, calm: false, aim: null, stride: 0, pace: 0 }, { ...STANDING }));
      stage.updateElof(body, direction, direction.size ?? 1, false);
      return direction;
    };
    return { stage, body, show, sweet: stage.group.getObjectByName('gold-sweet')! };
  }

  it('is the sweet in the scene, not a star', () => {
    const { stage, sweet } = staged();
    expect(sweet).toBeDefined();
    expect(stage.group.getObjectByName('elof-star')).toBeUndefined();
    expect(stormoga.scenes!.find((scene) => scene.id === 'stor')!.stage!.star).toBe('gold');
  });

  it('is held up in his hand, then at his lips, and is gone before he grows', () => {
    const { body, show, sweet } = staged();
    show(0.8);
    expect(sweet.visible).toBe(true);
    // On his fingertips, a little over the hand that holds it.
    expect(sweet.position.distanceTo(body.hand(1, new Vector3()))).toBeLessThan(0.12);
    show(2.15);
    expect(sweet.visible).toBe(true);
    expect(sweet.position.distanceTo(body.mouth(new Vector3()))).toBeLessThan(0.2);
    const grows = show(3.0);
    expect(sweet.visible).toBe(false);
    expect(grows.size).toBeLessThan(1.05);
    expect(show(6).size).toBe(3);
    expect(sweet.visible).toBe(false);
  });

  it('puts the sweet at the lips when the gripping fingertips are offset from the wrist', () => {
    // The private fingers have a grip socket beyond the wrist. Reaching the wrist to the mouth put
    // the candy above his eyes, even though the socket-free stand-in looked close enough.
    const stage = createStage(stormoga, () => at.y), wrist = new Vector3(at.x, at.y + .7, 0);
    const socketOffset = new Vector3(.04, .12, .02), lips = new Vector3(at.x + .1, at.y + .9, 0);
    const body = {
      hand: (_side: 0 | 1, out: Vector3) => out.copy(wrist),
      mouth: (out: Vector3) => out.copy(lips),
      reach: (_side: 0 | 1, target: Vector3) => { wrist.copy(target); },
      socket: (_side: 0 | 1, _grip: unknown, out: Vector3, axis?: Vector3) => {
        axis?.set(0, 1, 0); return out.copy(wrist).add(socketOffset);
      },
      grasp: (_side: 0 | 1, _grip: unknown, target: Vector3, _axis: Vector3, out: Vector3) => {
        wrist.copy(target).sub(socketOffset); return out.copy(wrist).add(socketOffset);
      },
    };
    const direction = stage.update({ id: 'stor', seconds: 2.19 }, new Set(['taste']), at, 2.19, 0, false).elof!;
    stage.updateElof(body, direction, 1, false);
    const sweet = stage.group.getObjectByName('gold-sweet')!;
    expect(sweet.visible).toBe(true);
    expect(sweet.position.distanceTo(lips)).toBeLessThan(.03);
    // The sweet stays on the fingers while the grip, rather than the wrist, reaches the bite.
    expect(sweet.position.distanceTo(body.socket(1, null, new Vector3()).add(new Vector3(0, .07, 0)))).toBeLessThan(1e-6);
  });
});
