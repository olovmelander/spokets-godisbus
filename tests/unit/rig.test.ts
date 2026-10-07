import { Bone, BoxGeometry, BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { actPose } from '../../src/render/acting';
import { createModelRig, createRehearsalRig, STANDING, type Pose } from '../../src/render/rig';

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

/** A hanging Blender-style leg with an asymmetric boot whose ankle is well above its sole. */
function bootModel(skinned: boolean) {
  const model = new Group(), boots: Mesh[] = [], thighs: Bone[] = [];
  for (const [side, x] of [['l', .38], ['r', -.38]] as const) {
    const thigh = new Bone(), calf = new Bone(), foot = new Bone();
    thigh.name = `thigh_${side}`; calf.name = `calf_${side}`; foot.name = `foot_${side}`;
    thigh.position.set(x, 2.55, 0); thigh.rotation.z = Math.PI;
    calf.position.y = 1.25; foot.position.y = 1.05;
    // The foot bone follows a diagonal from ankle towards toe, as the actual Blender exports do.
    foot.rotation.x = .8;
    thigh.add(calf); calf.add(foot); model.add(thigh); thighs.push(thigh);
    model.updateMatrixWorld(true);
    const geometry = new BoxGeometry(.6, .5, 1).translate(x, .25, .22);
    let mesh: Mesh;
    if (skinned) {
      const indices = new Uint16Array(geometry.attributes.position!.count * 4);
      const weights = new Float32Array(indices.length);
      for (let i = 0; i < indices.length; i += 4) { indices[i + 2] = 2; weights[i + 2] = 1; }
      geometry.setAttribute('skinIndex', new BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new BufferAttribute(weights, 4));
      const skin = new SkinnedMesh(geometry, new MeshBasicMaterial());
      model.add(skin); skin.bind(new Skeleton([thigh, calf, foot])); mesh = skin;
    } else {
      geometry.applyMatrix4(foot.matrixWorld.clone().invert());
      mesh = new Mesh(geometry, new MeshBasicMaterial()); foot.add(mesh);
    }
    boots.push(mesh);
  }
  return { model, boots, thighs };
}

describe('imported Blender body contact', () => {
  for (const skinned of [false, true]) {
    it(`plants the actual heel or toe through a gait (${skinned ? 'skinned' : 'rigid'} boots)`, () => {
      const { model, boots } = bootModel(skinned);
      model.scale.setScalar(1.3); model.rotation.y = .8;
      const rig = createModelRig(model, 5.2 * 1.3), parent = new Group();
      parent.position.set(5, 3, -2); parent.rotation.y = -.7; parent.scale.set(2, 3, 2);
      parent.add(rig.group);
      const point = new Vector3();
      for (let frame = 0; frame < 40; frame++) {
        const phase = frame * Math.PI / 20;
        rig.pose({ ...STANDING, legL: Math.sin(phase) * .65, legR: -Math.sin(phase) * .65,
          kneeL: .12 + Math.max(0, Math.cos(phase)) * .7, kneeR: .12 + Math.max(0, -Math.cos(phase)) * .7 });
        parent.updateMatrixWorld(true);
        let low = Infinity;
        for (const boot of boots) {
          for (let i = 0; i < boot.geometry.attributes.position!.count; i++) {
            boot.getVertexPosition(i, point);
            boot.localToWorld(point); rig.group.worldToLocal(point);
            low = Math.min(low, point.y);
          }
        }
        expect(low, `phase ${phase}`).toBeCloseTo(0, 6);
      }
    });
  }

  it('places a seated model by its own hip height and keeps bounce in adult units', () => {
    const { model, thighs } = bootModel(true);
    model.scale.setScalar(.6); model.position.y = .3;
    // Shorten the actual body; the rehearsal body's fixed hip height no longer describes it.
    for (const thigh of thighs) thigh.position.y = 2.1;
    const rig = createModelRig(model, 3.12);
    rig.pose({ ...STANDING, seat: 1.4, bounce: .2, legL: 1.2, legR: 1.2 });
    for (const thigh of thighs) expect(thigh.getWorldPosition(new Vector3()).y).toBeCloseTo(1.6 * .6, 6);
  });

  it('keeps a fallback hand on its forearm when a scene later scales the rig', () => {
    const model = new Group(), upper = new Bone(), lower = new Bone();
    upper.name = 'upperarm_l'; lower.name = 'lowerarm_l';
    upper.position.set(.2, .65, 0); upper.rotation.z = Math.PI; lower.position.y = .15;
    upper.add(lower); model.add(upper); model.scale.setScalar(1.7);
    const rig = createModelRig(model, 1.7), parent = new Group(); parent.add(rig.group);
    parent.position.set(3, 4, 5); parent.rotation.y = .6; parent.scale.setScalar(2.4);
    rig.pose({ ...STANDING, armL: .7, elbowL: .4 });
    const expected = lower.localToWorld(new Vector3(0, .15, 0));
    expect(rig.hand(0, new Vector3()).distanceTo(expected)).toBeLessThan(1e-8);
    parent.scale.setScalar(.5);
    expect(rig.hand(0, new Vector3()).distanceTo(lower.localToWorld(new Vector3(0, .15, 0)))).toBeLessThan(1e-8);
  });

  it('scales the hand fallback with the body even when no arm bones are supplied', () => {
    const rig = createModelRig(new Group(), 1);
    rig.group.position.set(3, 4, 5); rig.group.scale.setScalar(2);
    expect(rig.hand(0, new Vector3()).toArray()).toEqual([3, 4.9, 5]);
  });
});
