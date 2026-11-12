import { readFileSync } from 'node:fs';
import { Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { byn } from '../../src/content/chapters/byn';
import { UNLIT, assemble, powerOut, villageKit } from '../../src/render/village';
import { WINDOW_CANDLE, windowCandle } from '../../src/render/window-candle';
import { UMBRELLA, carrying, createHoldingOut, createUmbrellaCarry, handsOn, heldUp, holdAt } from '../../src/render/umbrella-hold';
import type { ChapterData } from '../../src/sim/types';

/** A chapter's houses as the game puts them together from the village kit (art/baked/boot/village.glb), each by itself. */
async function street(chapter: ChapterData) {
  const file = readFileSync(new URL('../../art/baked/boot/village.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  const kit = villageKit(gltf.scene);
  const parts = chapter.street ?? [];
  return parts.flatMap((part, i) => (part.kind === 'house' ? [assemble(kit, chapter, parts, [i])] : []));
}

/** How much the corners of a street give off, all told: the lamps in its shop windows and behind its doors' glass. */
const glowOf = (geometries: { getAttribute(name: string): { count: number; getX(i: number): number } }[]) =>
  geometries.reduce((sum, geometry) => {
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) sum += uv.getX(i);
    return sum;
  }, 0);

describe('Byn i stormen: the power is out in the whole village', () => {
  // Olov, 12 November 2026: "hur kan det lysa i byn om strömmen gått, eller har bara strömmen gått på olika ställen?"
  it('is out in the storm, and on in Byn on a Saturday morning', () => {
    expect(powerOut(stormbyn)).toBe(true);
    expect(powerOut(byn)).toBe(false);
  });

  it('has no lamp lit in any shop window or behind any door: what the kit lights there is dark', async () => {
    const lit = glowOf(await street(byn));
    expect(lit).toBeGreaterThan(100);
    expect(glowOf(await street(stormbyn))).toBe(0);
    expect(UNLIT).toBeLessThan(0.5);
  });

  it('lights a candle in a window as a candle: wax in a holder under its flame, which flickers unless it is still', () => {
    const candle = windowCandle(1);
    candle.group.updateMatrixWorld(true);
    const box = { low: Infinity, high: -Infinity };
    candle.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
      box.low = Math.min(box.low, bounds.min.y);
      box.high = Math.max(box.high, bounds.max.y);
    });
    // From the holder's foot on the sill, under the flame's heart (its origin), to over it.
    const foot = -(WINDOW_CANDLE.wax.top + 1 + WINDOW_CANDLE.holder.tall);
    expect(box.low).toBeCloseTo(foot, 2);
    expect(box.high).toBeGreaterThan(0);
    const flame = candle.group.children.find((child) => child instanceof Group)!;
    candle.update(1, false);
    const alive = flame.scale.y;
    candle.update(1.13, false);
    expect(flame.scale.y).not.toBe(alive);
    candle.update(1, true);
    expect(flame.scale.y).toBe(1);
    expect(flame.rotation.z).toBe(0);
  });
});

describe("Moa's umbrella, held", () => {
  // Olov, 12 November 2026: "Det kan se lite snyggare ut när moa håller i paraplyt!"
  it('is held by its crook, wherever and however it is held', () => {
    const prop = new Group();
    const at = new Vector3(3, 4, -0.5), axis = new Vector3(-0.2, 1, 0).normalize();
    holdAt(prop, at, axis);
    prop.updateMatrixWorld(true);
    expect(UMBRELLA.grip.clone().applyMatrix4(prop.matrixWorld).distanceTo(at)).toBeLessThan(1e-6);
    // Its shaft goes up along the axis it is held by.
    const up = new Vector3(0, 1, 0).applyQuaternion(prop.quaternion);
    expect(up.distanceTo(axis)).toBeLessThan(1e-6);
    const lower = new Vector3(), upper = new Vector3();
    handsOn(prop, lower, upper);
    expect(lower.distanceTo(at)).toBeLessThan(1e-6);
    expect(upper.y).toBeGreaterThan(lower.y);
  });

  it('leans into the wind over her head, less held out low to him, and its top ahead as it carries him', () => {
    const axis = new Vector3();
    // The rain comes from the left (src/content/aventyr2/storm-rain.ts): its top leans that way.
    expect(heldUp(0, 1, true, axis).x).toBeLessThan(-0.1);
    expect(heldUp(0, 1, true, axis, 0.4).x).toBeGreaterThan(heldUp(0, 1, true, new Vector3()).x);
    expect(Math.abs(axis.length() - 1)).toBeLessThan(1e-9);
    expect(carrying(0, true, axis).x).toBeGreaterThan(0.1);
    // A gust rocks it, unless the picture is still.
    expect(heldUp(0.9, 1, false, new Vector3()).x).not.toBeCloseTo(heldUp(0.9, 1, true, new Vector3()).x, 6);
  });

  it('goes from her hand to his raised hands as the ride begins, and carries him by its crook', () => {
    const prop = new Group();
    const carry = createUmbrellaCarry();
    holdAt(prop, new Vector3(102.4, 6.6, -0.3), new Vector3(0, 1, 0));
    carry.held(prop);
    const hers = prop.position.clone();
    // The first frame of the ride: it has not jumped to him.
    carry.carry(prop, 102.7, 5, 1, 1, 0, 0, false);
    expect(prop.position.distanceTo(hers)).toBeLessThan(1e-6);
    // Halfway, between the two; after the handover, its crook is in his hands over his head.
    carry.carry(prop, 102.7, 5, 1, 1, 0, UMBRELLA.handover / 2, false);
    expect(prop.position.distanceTo(hers)).toBeGreaterThan(0.01);
    carry.carry(prop, 103, 4.9, 1, 1, 0, UMBRELLA.handover, false);
    prop.updateMatrixWorld(true);
    const crook = UMBRELLA.grip.clone().applyMatrix4(prop.matrixWorld);
    expect(crook.distanceTo(new Vector3(103, 4.9 + UMBRELLA.hang, 0))).toBeLessThan(1e-6);
    // As he lands it goes, about its crook, which stays in his hands.
    carry.carry(prop, 103, 4.9, 1, 0.5, 0, 0.1, false);
    prop.updateMatrixWorld(true);
    expect(prop.scale.x).toBeCloseTo(0.5);
    expect(UMBRELLA.grip.clone().applyMatrix4(prop.matrixWorld).distanceTo(new Vector3(103, 4.9 + UMBRELLA.hang, 0))).toBeLessThan(1e-6);
  });

  it('has Moa down at the edge from the first frame of a game taken up after the call, and down after a breath when called', () => {
    // Taken up after the call, early on the view's clock: she was standing for a second and then crouched.
    const resumed = createHoldingOut();
    for (let frame = 0; frame < 300; frame++) {
      const { down, stoop } = resumed.update(true, 0.02 + frame / 60, 1 / 60, frame === 0, false);
      expect(down, `frame ${frame}`).toBe(1);
      expect(stoop, `frame ${frame}`).toBe(1);
    }
    // Called while he watches: standing for a breath, then down, and up again once he has it.
    const called = createHoldingOut();
    expect(called.update(false, 0, 1 / 60, true, false).stoop).toBe(0);
    let clock = 0;
    const at = (seconds: number) => { let last = { down: 0, stoop: 0 }; for (; clock < seconds; clock += 1 / 60) last = called.update(true, 5 + clock, 1 / 60, false, false); return last; };
    expect(at(0.3).stoop).toBeLessThan(0.01);
    expect(at(2.5).stoop).toBeGreaterThan(0.99);
    expect(called.update(false, 8, 1 / 60, false, false).down).toBe(0);
    // Without motion, at once.
    expect(createHoldingOut().update(true, 5, 1 / 60, false, true).stoop).toBe(1);
  });
});
