import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { actPose } from '../../src/render/acting';
import { capArms, capHands, capHandoff } from '../../src/render/cap-handoff';
import { createRehearsalRig, JOINTS, STANDING, type Pose } from '../../src/render/rig';

const TIME = 2.4;
function fixture() {
  const rig = createRehearsalRig('bertil'), cap = new Group(), from = new Vector3();
  rig.group.position.set(155, -8, -.8); rig.group.rotation.y = -.4;
  rig.group.updateMatrixWorld(true);
  from.set(0, rig.height * .98, rig.height * .13).applyMatrix4(rig.group.matrixWorld);
  const destination = new Vector3(154.6, -8.05, 0), kneel = { ...STANDING };
  const frame = (since: number) => {
    const p: Pose = { ...STANDING };
    capArms(p, since, TIME);
    const { lower, crouch } = capHandoff(since, TIME);
    actPose('kneel', { t: 3, aim: null, stride: 0, pace: 0, calm: false, role: 'bertil', legs: rig.legs }, kneel);
    for (const joint of JOINTS) if (joint !== 'turn' && joint !== 'nod' && !joint.startsWith('arm') && !joint.startsWith('elbow')) p[joint] += (kneel[joint] - p[joint]) * crouch;
    p.lean = Math.max(p.lean, .85 * crouch);
    rig.pose(p);
    cap.position.copy(destination).lerp(from, 1 - lower); cap.position.y += Math.sin(Math.PI * lower) * .25;
    capHands(rig, since, TIME, cap.position);
    return { hands: [rig.hand(0, new Vector3()), rig.hand(1, new Vector3())], cap: cap.position.clone(), p };
  };
  return { rig, frame, destination };
}

describe('Bertil lowers his cap without switching arm contacts', () => {
  it('keeps both hands continuous at the action flag and when the cap reaches the water', () => {
    const { frame } = fixture();
    for (const edge of [0, TIME * .12, TIME * .82, TIME]) {
      const before = frame(edge - 1e-5), after = frame(edge + 1e-5);
      for (const side of [0, 1]) expect(after.hands[side]!.distanceTo(before.hands[side]!), `hand ${side} at ${edge}`).toBeLessThan(.001);
    }
    let previous = frame(-1 / 60);
    for (let i = 0; i <= 144; i++) {
      const now = frame(i / 60);
      for (const side of [0, 1]) expect(now.hands[side]!.distanceTo(previous.hands[side]!), `hand ${side} frame ${i}`).toBeLessThan(.22);
      previous = now;
    }
  });

  it('maintains full contact throughout the lowering and only withdraws after the boat is on the water', () => {
    const { frame, destination } = fixture();
    for (let i = 12; i <= 82; i++) expect(capHandoff(TIME * i / 100, TIME).hold).toBeCloseTo(1, 12);
    for (const share of [.82, .86, .94, 1]) {
      const now = frame(TIME * share);
      expect(now.cap.distanceTo(destination)).toBeLessThan(1e-8);
    }
    expect(capHandoff(TIME * .9, TIME).hold).toBeGreaterThan(0);
    expect(capHandoff(TIME, TIME).hold).toBe(0);
  });

  it('holds the exact event-time pose through Pause and restores the completed reduced-motion handoff', () => {
    const { frame, destination } = fixture();
    for (const at of [.08, .7, TIME * .86]) {
      const held = frame(at);
      for (let i = 0; i < 20; i++) {
        const again = frame(at);
        expect(again.p).toEqual(held.p);
        expect(again.cap.toArray()).toEqual(held.cap.toArray());
        for (const side of [0, 1]) expect(again.hands[side]!.distanceTo(held.hands[side]!)).toBeLessThan(1e-10);
      }
    }
    // The view maps Mindre rörelse or an already-ready save directly to TIME.
    const calm = frame(TIME), restored = frame(TIME);
    expect(calm.cap.distanceTo(destination)).toBeLessThan(1e-8);
    expect(capHandoff(TIME, TIME)).toMatchObject({ hold: 0, release: 1, lower: 1, crouch: 0 });
    expect(restored.hands.map(h => h.toArray())).toEqual(calm.hands.map(h => h.toArray()));
  });
});
