import { Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCourse } from '../../dev/elof-course';
import { createPlayerMotion, playerPose } from '../../src/render/player-motion';
import { createModelRig, STANDING } from '../../src/render/rig';

/** A small generic imported skeleton with long boots. Measures are fixture geometry, not a private model. */
function bootedPlayer() {
  const model = new Group(), boots: { mesh: Mesh; heel: number; toe: number }[] = [];
  for (const [side, x] of [['l', .06], ['r', -.06]] as const) {
    const thigh = new Bone(), calf = new Bone(), foot = new Bone();
    thigh.name = `thigh_${side}`; calf.name = `calf_${side}`; foot.name = `foot_${side}`;
    thigh.position.set(x, .4, 0); thigh.rotation.z = Math.PI;
    calf.position.y = .16; foot.position.y = .14; foot.rotation.x = .8;
    thigh.add(calf); calf.add(foot); model.add(thigh); model.updateMatrixWorld(true);
    const geometry = new BoxGeometry(.13, .2, .26).translate(x, .1, .05);
    const p = geometry.getAttribute('position'), sole = Array.from({ length: p.count }, (_, i) => i).filter(i => p.getY(i) < .001);
    const heel = sole.reduce((a, b) => p.getZ(b) < p.getZ(a) ? b : a), toe = sole.reduce((a, b) => p.getZ(b) > p.getZ(a) ? b : a);
    geometry.applyMatrix4(foot.matrixWorld.clone().invert());
    const mesh = new Mesh(geometry, new MeshBasicMaterial()); foot.add(mesh); boots.push({ mesh, heel, toe });
  }
  model.rotation.y = Math.PI / 2;
  const rig = createModelRig(model, 1);
  const corners = () => {
    rig.group.updateMatrixWorld(true);
    return boots.map(({ mesh, heel, toe }) => [heel, toe].map(i => mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld)));
  };
  return { rig, corners };
}

describe('Elof’s recovering and landing soles', () => {
  it('clears the long toe during the middle of a walking recovery', () => {
    const { rig, corners } = bootedPlayer(), course = createCourse();
    const state = { ...course.sim.curr, grounded: true, atEdge: false };
    const leg = 2 * (rig.legs.thigh + rig.legs.shin);
    rig.pose(playerPose(state, 0, .35, 0, { ...STANDING }, leg));
    const feet = corners();
    expect(feet[0]![1]!.y).toBeGreaterThan(.003);
    expect(Math.min(...feet[1]!.map(p => p.y))).toBeCloseTo(0, 6);
  });

  it('resumes the leading-foot stride on a running landing without a joint snap or a long planted-toe slide', () => {
    const { rig, corners } = bootedPlayer(), course = createCourse(), motion = createPlayerMotion();
    let landing = -1, slip = 0, contacts = 0, fastest = 0, acceleration = 0;
    let before: ReturnType<typeof corners> | undefined, oldPose = { ...STANDING }, olderPose = { ...STANDING };
    let oldGrounded = true, oldY = 0;
    for (let frame = 0; frame < 1800; frame++) {
      course.step(1 / 60);
      const state = course.sim.curr, pose = { ...motion.update(state, state.x, 1 / 60, null, 0, false, 0, 1, rig.legs) };
      rig.pose(pose); rig.group.position.set(state.x, state.y, 0);
      const feet = corners();
      if (course.part === 'run-jump' && state.grounded && !oldGrounded) landing = frame;
      if (landing >= 0 && frame > landing && frame <= landing + 30 && before) {
        // Follow the SAME material sole corner only while it remains on the ground. Body travel and switching from
        // heel to toe are not counted as a slip, and a lifted recovery foot does not count as contact.
        for (const side of [0, 1]) for (const corner of [0, 1]) {
          const a = before[side]![corner]!, b = feet[side]![corner]!;
          if (a.y - oldY < .003 && b.y - state.y < .003) { slip += Math.abs(b.x - a.x); contacts++; }
        }
      }
      if (frame > 1) for (const joint of ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'armL', 'armR'] as const) {
        fastest = Math.max(fastest, Math.abs(pose[joint] - oldPose[joint]) * 60);
        acceleration = Math.max(acceleration, Math.abs(pose[joint] - 2 * oldPose[joint] + olderPose[joint]) * 3600);
      }
      before = feet; olderPose = oldPose; oldPose = pose; oldGrounded = state.grounded; oldY = state.y;
      if (landing >= 0 && frame === landing + 30) break;
    }
    expect(landing).toBeGreaterThan(0);
    expect(contacts).toBeGreaterThan(10);
    expect(slip).toBeLessThan(.95);
    expect(fastest).toBeLessThan(30);
    expect(acceleration).toBeLessThan(1000);
  });
});
