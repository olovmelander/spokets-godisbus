import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { actPose } from '../../src/render/acting';
import { createRehearsalRig, STANDING, type Pose } from '../../src/render/rig';

/** Where one of the figure's boxes is, in the figure's own space: it faces +z. */
function partAt(rig: ReturnType<typeof createRehearsalRig>, index: number): Vector3 {
  const mesh = rig.group.children[0] as unknown as { getMatrixAt(i: number, m: Matrix4): void };
  const m = new Matrix4();
  mesh.getMatrixAt(index, m);
  return new Vector3().setFromMatrixPosition(m);
}
const HEAD = 1;
const EYE = 2;

describe('the rehearsal figure', () => {
  it('leans forward, towards the way it faces, and nods its head down', () => {
    const rig = createRehearsalRig('pappa');
    rig.pose({ ...STANDING });
    const upright = partAt(rig, HEAD);
    const eye = partAt(rig, EYE);
    rig.pose({ ...STANDING, lean: 0.5 });
    expect(partAt(rig, HEAD).z).toBeGreaterThan(upright.z + 0.5);
    rig.pose({ ...STANDING, nod: 0.6 });
    const nodded = partAt(rig, EYE);
    expect(nodded.y).toBeLessThan(eye.y);
    expect(nodded.z).toBeGreaterThan(eye.z);
  });

  it('puts a reaching hand where it is aimed: standing before him and high, kneeling down to the floor', () => {
    for (const who of ['pappa', 'moa'] as const) {
      const rig = createRehearsalRig(who);
      const unit = 5.2 / rig.height;
      for (const [ahead, up, stance] of [[1.2, 3.6, 'stand'], [1.8, 2.4, 'stand'], [1.5, 3.0, 'stand'], [1.4, 0.6, 'kneel'], [1.7, 1.2, 'kneel']] as const) {
        const pose: Pose = { ...STANDING };
        actPose('reach', { t: 3, aim: { ahead, up }, stride: 0, pace: 0, calm: true }, pose, stance);
        rig.pose(pose);
        const hand = rig.hand(1, new Vector3());
        // The hand's middle lies a little past the wrist the reach aims: within a hand's length.
        expect(Math.hypot(hand.z * unit - ahead, hand.y * unit - up), `${who} reaching ${ahead}, ${up} (${stance})`).toBeLessThan(0.45);
      }
    }
  });
});
