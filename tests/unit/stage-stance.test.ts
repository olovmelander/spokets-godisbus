import { stubCanvas } from './canvas-stub';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { kneeling, sitting } from '../../src/render/acting';
import { SITTING_ON } from '../../src/render/gait';
import { heightOf, STANDING, type Pose, type Role } from '../../src/render/rig';
import { createStage, type Stage } from '../../src/render/stage';

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

function watch(who: Role, chapter = prolog) {
  const stage = createStage(chapter, () => 0), rig = stage.actors.get(who)!.rig;
  let pose: Pose;
  const original = rig.pose;
  rig.pose = next => { pose = { ...next }; original(next); };
  return { stage, rig, pose: () => pose };
}
/** Seated as the stage seats them: on a kitchen chair's height (1.31 EL), their feet flat on the floor. */
const seatedOn = (who: Role, rig: { legs: Parameters<typeof sitting>[1] }) => sitting({ ...STANDING }, rig.legs, 1.31 / heightOf(who) + SITTING_ON);
function show(stage: Stage, id: string, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  const scenes = prolog.scenes!, before = scenes.findIndex(scene => scene.id === id);
  const flags = new Set(scenes.slice(0, before).map(scene => scene.by?.done ?? `scene:${scene.id}`));
  stage.update({ id, seconds }, flags, { x: 40.9, y: -.8 }, clock, dt, calm);
}

describe('authored changes of stance', () => {
  it.each([false, true])('lets Moa stand up from her chair instead of retaining the seat (calm=%s)', calm => {
    const { stage, pose } = watch('moa');
    show(stage, 'vaknar', 2.0, calm);
    expect(pose().seat).toBeNull();
    // Standing, as anyone stands: the weight on one leg, the other knee easy (the motion pass of 8 November 2026).
    for (const joint of ['legL', 'legR'] as const) expect(Math.abs(pose()[joint])).toBeLessThan(.15);
    for (const joint of ['kneeL', 'kneeR'] as const) expect(pose()[joint]).toBeLessThan(.4);
  });

  it('raises Pappa out of his chair during his stand key before he turns to the window', () => {
    const { stage, rig, pose } = watch('pappa');
    show(stage, 'vaknar', .2);
    const seated = rig.mouth(new Vector3());
    // Up off the chair over his feet, the chair pushed back (art/blender/motion.py STAND_UP, half a second), just before
    // the look that turns him.
    show(stage, 'vaknar', .69);
    expect(pose().legL).toBeLessThan(.15);
    expect(pose().kneeR).toBeLessThan(.3);
    expect(rig.mouth(new Vector3()).y).toBeGreaterThan(seated.y + .8);
    // Clear of the chair, he stands for the jay call before walking to the window.
    show(stage, 'vaknar', 2.0);
    expect(pose().seat).toBeNull();
    expect(Math.abs(pose().legL)).toBeLessThan(.15);
  });

  it.each([['vaknar', 1.35, 'moa'], ['vaknar', .2, 'pappa']] as const)('clears the floor throughout %s’s rise and replays it backwards', (id, at, who) => {
    const { stage, rig } = watch(who), mesh = rig.group.children[0] as InstancedMesh, matrix = new Matrix4();
    for (const frames of [Array.from({ length: 28 }, (_, i) => i), Array.from({ length: 28 }, (_, i) => 27 - i)]) {
      for (const frame of frames) {
        show(stage, id, at + frame / 60);
        for (const index of [13, 16]) {
          mesh.getMatrixAt(index, matrix);
          for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
            expect(new Vector3(x, y, z).applyMatrix4(matrix).y, `${who} frame ${frame}`).toBeGreaterThan(-1e-6);
          }
        }
      }
    }
  });

  it.each([['handen', 7.8], ['titel', 4]] as const)('lets Bertil rise out of his crouch to cheer in %s', (id, seconds) => {
    const { stage, pose } = watch('bertil');
    show(stage, id, seconds);
    expect(pose().seat).toBeNull();
    for (const joint of ['legL', 'legR', 'kneeL', 'kneeR'] as const) expect(pose()[joint]).toBe(0);
    expect(pose().armR).toBeGreaterThan(2);
  });

  it('keeps rising continuous as Moa stands to show her drawing', () => {
    const { stage, rig } = watch('moa');
    show(stage, 'handen', 1.8 - 1e-6);
    const crouched = rig.mouth(new Vector3());
    let previous = crouched.clone();
    for (let frame = 0; frame <= 23; frame++) {
      show(stage, 'handen', 1.8 + frame / 60);
      const now = rig.mouth(new Vector3());
      expect(now.distanceTo(previous)).toBeLessThan(.12);
      previous.copy(now);
    }
    expect(previous.y).toBeGreaterThan(crouched.y + 1);
  });

  it('retains sitting and kneeling underneath looking and reaching', () => {
    const moa = watch('moa', morgonen);
    // Breakfast explicitly goes from drawing seated to looking at Bertil, with no new sit key.
    moa.stage.update({ id: 'frukost', seconds: 4.6 }, new Set(), morgonen.spawn, 4.6, 1 / 60, false);
    const seated = seatedOn('moa', moa.rig);
    expect(moa.pose().seat).toBeCloseTo(seated.seat!, 9);
    expect(moa.pose().legL).toBeCloseTo(seated.legL, 9);
    // Kneeling as the kneel ends, on their own legs (art/blender/motion.py CLIPS.kneel; since 9 November 2026 the legs
    // reach the floor from where the clip keys the hips and feet, so the angles are each body's own).
    for (const who of ['mamma', 'pappa'] as const) {
      const { stage, rig, pose } = watch(who);
      show(stage, 'familj', 5.5);
      const knelt = kneeling({ ...STANDING }, rig.legs, who);
      expect(pose().seat).toBeNull();
      for (const joint of ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR'] as const) expect(pose()[joint]).toBeCloseTo(knelt[joint], 9);
      expect(pose().kneeL).toBeGreaterThan(1.3);
    }
  });

  it.each([false, true])('preserves unfinished actions when the next authored key interrupts them (calm=%s)', calm => {
    for (const [id, at, who] of [['vaknar', .6, 'pappa'], ['handen', 2.2, 'moa'],
      ['prologue:pappa', .4, 'pappa'], ['prologue:pappa', .8, 'pappa'], ['prologue:pappa', .95, 'pappa']] as const) {
      const { stage, rig } = watch(who);
      show(stage, id, at - 1e-6, calm);
      const head = rig.mouth(new Vector3()), hands = [rig.hand(0, new Vector3()), rig.hand(1, new Vector3())];
      show(stage, id, at, calm);
      expect(rig.mouth(new Vector3()).distanceTo(head), `${id} ${at} head`).toBeLessThan(1e-4);
      // Calmer mode presents newly held paper immediately; that contact has its own regression coverage.
      if (!calm || id !== 'handen') for (const side of [0, 1] as const) {
        expect(rig.hand(side, new Vector3()).distanceTo(hands[side]!), `${id} ${at} hand ${side}`).toBeLessThan(1e-4);
      }
    }
  });

  it('reconstructs interrupted rising after seeks and restoration, and freezes it during pause', () => {
    const { stage, rig, pose } = watch('pappa');
    const snapshot = () => ({ pose: pose(), mouth: rig.mouth(new Vector3()).toArray(), hand: rig.hand(1, new Vector3()).toArray() });
    show(stage, 'prologue:pappa', .99);
    const held = snapshot();
    for (const seconds of [1.5, .6, .99]) show(stage, 'prologue:pappa', seconds);
    expect(snapshot()).toEqual(held);
    show(stage, 'prologue:pappa', .99, false, 0, 900);
    expect(snapshot()).toEqual(held);
    const restored = watch('pappa');
    show(restored.stage, 'prologue:pappa', .99);
    expect(restored.pose()).toEqual(held.pose);
    expect(restored.rig.mouth(new Vector3()).toArray()).toEqual(held.mouth);
  });

  it('turns Moa’s head smoothly between the jay and the bag while she stands by the window', () => {
    const { stage, rig, pose } = watch('moa');
    for (const at of [23.1, 25.1]) {
      show(stage, 'vaknar', at - 1e-6);
      let previous = rig.mouth(new Vector3());
      const initial = previous.clone();
      show(stage, 'vaknar', at);
      expect(rig.mouth(new Vector3()).distanceTo(previous)).toBeLessThan(1e-5);
      for (let frame = 1; frame <= 60; frame++) {
        show(stage, 'vaknar', at + frame / 60);
        const now = rig.mouth(new Vector3());
        expect(now.distanceTo(previous)).toBeLessThan(.1);
        previous.copy(now);
        expect(pose().seat).toBeNull();
      }
      expect(previous.distanceTo(initial)).toBeGreaterThan(.25);
    }
    show(stage, 'vaknar', 23.25);
    const halfway = rig.mouth(new Vector3()).toArray();
    show(stage, 'vaknar', 25.4);
    show(stage, 'vaknar', 23.25);
    expect(rig.mouth(new Vector3()).toArray()).toEqual(halfway);
    show(stage, 'vaknar', 23.25, false, 0, 900);
    expect(rig.mouth(new Vector3()).toArray()).toEqual(halfway);
  });
});
