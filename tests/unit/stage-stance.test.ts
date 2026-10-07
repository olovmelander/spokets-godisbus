import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { createStage, type Stage } from '../../src/render/stage';
import type { Pose, Role } from '../../src/render/rig';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

function watch(who: Role) {
  const stage = createStage(prolog, () => 0), rig = stage.actors.get(who)!.rig;
  let pose: Pose;
  const original = rig.pose;
  rig.pose = next => { pose = { ...next }; original(next); };
  return { stage, rig, pose: () => pose };
}
function show(stage: Stage, id: string, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  const scenes = prolog.scenes!, before = scenes.findIndex(scene => scene.id === id);
  const flags = new Set(scenes.slice(0, before).map(scene => scene.by?.done ?? `scene:${scene.id}`));
  stage.update({ id, seconds }, flags, { x: 40.9, y: -.8 }, clock, dt, calm);
}

describe('authored changes of stance', () => {
  it.each([false, true])('lets Moa stand up from her chair instead of retaining the seat (calm=%s)', calm => {
    const { stage, pose } = watch('moa');
    show(stage, 'prologue:mamma', 2.1, calm);
    expect(pose().seat).toBeNull();
    for (const joint of ['legL', 'legR', 'kneeL', 'kneeR'] as const) expect(pose()[joint]).toBe(0);
  });

  it('raises Pappa out of his chair during his stand key before he turns to the window', () => {
    const { stage, rig, pose } = watch('pappa');
    show(stage, 'vaknar', .2);
    const seated = rig.mouth(new Vector3());
    show(stage, 'vaknar', .59);
    expect(pose().legL).toBeLessThan(.1);
    expect(pose().kneeR).toBeLessThan(.1);
    expect(rig.mouth(new Vector3()).y).toBeGreaterThan(seated.y + .8);
    show(stage, 'vaknar', 2);
    expect(pose().seat).toBeNull();
    expect(pose().legL).toBe(0);
  });

  it.each([['prologue:mamma', .3, 'moa'], ['vaknar', .2, 'pappa']] as const)('clears the floor throughout %s’s rise and replays it backwards', (id, at, who) => {
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
    const moa = watch('moa');
    show(moa.stage, 'vaknar', 4);
    expect(moa.pose().seat).toBe(1.5);
    expect(moa.pose().legL).toBe(1.5);
    for (const who of ['mamma', 'pappa'] as const) {
      const { stage, pose } = watch(who);
      show(stage, 'familj', 5.5);
      expect(pose().seat).toBeNull();
      expect(pose().legL).toBe(-.08);
      expect(pose().kneeR).toBe(1.32);
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

  it('turns Moa’s head smoothly between the jay and the bag without restarting her seated action', () => {
    const { stage, rig, pose } = watch('moa');
    for (const at of [5.3, 6.15]) {
      show(stage, 'vaknar', at - 1e-6);
      let previous = rig.mouth(new Vector3());
      const initial = previous.clone();
      show(stage, 'vaknar', at);
      expect(rig.mouth(new Vector3()).distanceTo(previous)).toBeLessThan(1e-5);
      for (let frame = 1; frame <= 18; frame++) {
        show(stage, 'vaknar', at + frame / 60);
        const now = rig.mouth(new Vector3());
        expect(now.distanceTo(previous)).toBeLessThan(.1);
        previous.copy(now);
        expect(pose().seat).toBe(1.5);
      }
      expect(previous.distanceTo(initial)).toBeGreaterThan(.25);
    }
    show(stage, 'vaknar', 5.45);
    const halfway = rig.mouth(new Vector3()).toArray();
    show(stage, 'vaknar', 6.5);
    show(stage, 'vaknar', 5.45);
    expect(rig.mouth(new Vector3()).toArray()).toEqual(halfway);
    show(stage, 'vaknar', 5.45, false, 0, 900);
    expect(rig.mouth(new Vector3()).toArray()).toEqual(halfway);
  });
});
