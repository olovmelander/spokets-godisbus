import { Bone, BoxGeometry, BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { actPose } from '../../src/render/acting';
import { blendPose, createModelRig, createRehearsalRig, STANDING, type Pose } from '../../src/render/rig';

/** Where one of the figure's boxes is, in the figure's own space: it faces +z. */
function partAt(rig: ReturnType<typeof createRehearsalRig>, index: number): Vector3 {
  const mesh = rig.group.children[0] as unknown as { getMatrixAt(i: number, m: Matrix4): void };
  const m = new Matrix4();
  mesh.getMatrixAt(index, m);
  return new Vector3().setFromMatrixPosition(m);
}
const HEAD = 1;
const EYE = 2;
const sitting = () => actPose('sit', { t: 3, aim: null, stride: 0, pace: 0, calm: false }, { ...STANDING });

describe('seat transitions', () => {
  it('blends identically into either input and preserves exact endpoints', () => {
    for (const [a, b] of [[sitting(), { ...STANDING }], [{ ...STANDING }, sitting()]]) {
      for (const t of [0, .2, .5, .85, 1]) {
        const expected = blendPose(a!, b!, t, { ...STANDING }, true);
        const left = { ...a! }, right = { ...b! };
        expect(blendPose(left, b!, t, left, true)).toEqual(expected);
        expect(blendPose(a!, right, t, right, true)).toEqual(expected);
        if (t === 0) expect(expected).toEqual(a);
        if (t === 1) expect(expected).toEqual(b);
      }
    }
  });

  it('clears floor metadata for carried poses and reused authored poses', () => {
    const pose = blendPose(sitting(), { ...STANDING }, .5, { ...STANDING }, true);
    expect(pose.floor).toBe(.5);
    const carried = { ...STANDING, seat: 0, legL: 1.4, legR: 1.4 };
    for (const t of [0, .5, 1]) {
      pose.floor = .5;
      expect(blendPose({ ...STANDING }, carried, t, pose).floor).toBe(0);
    }
    pose.floor = .5;
    actPose('sit', { t: 0, aim: null, stride: 0, pace: 0, calm: false }, pose);
    expect(pose.floor).toBe(0);
    expect(pose.seat).toBe(1.5);
  });

  it('keeps rehearsal soles above the floor when rising and sitting', () => {
    const rig = createRehearsalRig('moa'), mesh = rig.group.children[0] as InstancedMesh;
    const matrix = new Matrix4();
    for (const [a, b] of [[sitting(), { ...STANDING }], [{ ...STANDING }, sitting()]]) {
      for (let frame = 0; frame <= 60; frame++) {
        rig.pose(blendPose(a!, b!, frame / 60, { ...STANDING }, true));
        for (const index of [13, 16]) {
          mesh.getMatrixAt(index, matrix);
          for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
            expect(new Vector3(x, y, z).applyMatrix4(matrix).y, `frame ${frame}`).toBeGreaterThan(-1e-6);
          }
        }
      }
    }
  });
});

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
function bootModel(skinned: boolean, hip = 2.55) {
  const model = new Group(), boots: Mesh[] = [], thighs: Bone[] = [];
  for (const [side, x] of [['l', .38], ['r', -.38]] as const) {
    const thigh = new Bone(), calf = new Bone(), foot = new Bone();
    thigh.name = `thigh_${side}`; calf.name = `calf_${side}`; foot.name = `foot_${side}`;
    thigh.position.set(x, hip, 0); thigh.rotation.z = Math.PI;
    calf.position.y = (hip - .25) * 1.25 / 2.3; foot.position.y = (hip - .25) * 1.05 / 2.3;
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

  it.each([false, true])('clears actual imported soles through both seat transition directions (skinned=%s)', skinned => {
    // The actual standing hips differ from the adult reference; a canonical clamp would float then drop.
    const { model, boots } = bootModel(skinned, 1.8), rig = createModelRig(model, 5.2);
    const point = new Vector3();
    for (const [a, b] of [[sitting(), { ...STANDING }], [{ ...STANDING }, sitting()]]) {
      let previous = 0;
      for (let frame = 0; frame <= 60; frame++) {
        rig.pose(blendPose(a!, b!, frame / 60, { ...STANDING }, true));
        rig.group.updateMatrixWorld(true);
        let low = Infinity;
        for (const boot of boots) for (let i = 0; i < boot.geometry.attributes.position!.count; i++) {
          boot.getVertexPosition(i, point); boot.localToWorld(point); rig.group.worldToLocal(point);
          low = Math.min(low, point.y);
        }
        expect(low, `frame ${frame}`).toBeGreaterThan(-1e-6);
        if (frame > 0) expect(Math.abs(model.position.y - previous)).toBeLessThan(.1);
        previous = model.position.y;
      }
      rig.pose(blendPose(a!, b!, 1 - 1e-7, { ...STANDING }, true));
      const nearEnd = model.position.y;
      rig.pose(blendPose(a!, b!, 1, { ...STANDING }, true));
      expect(Math.abs(model.position.y - nearEnd)).toBeLessThan(1e-5);
    }
  });

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

describe('rig palm grips', () => {
  it('resets imported hand rest rotations on the next pose and repeats deterministically', () => {
    const model = new Group(), upper = new Bone(), lower = new Bone(), hand = new Bone();
    upper.name = 'upperarm_r'; lower.name = 'lowerarm_r'; hand.name = 'hand_r';
    upper.position.set(-.7, 3.7, 0); upper.rotation.z = Math.PI;
    lower.position.y = .84; hand.position.y = .8; hand.rotation.set(.12, -.1, .05);
    model.add(upper); upper.add(lower); lower.add(hand);
    const rest = hand.quaternion.clone(), rig = createModelRig(model, 5.2);
    const pose = { ...STANDING, seat: 1.6, armR: .8, elbowR: 1.1 };
    const target = new Vector3(-.7, 1.8, 1), direction = new Vector3(0, -.25, 1), out = new Vector3();
    rig.pose(pose); const original = rig.hand(1, new Vector3());
    rig.grip(1, target, direction, out);
    expect(out.distanceTo(target)).toBeLessThan(1e-8);
    expect(hand.quaternion.angleTo(rest)).toBeGreaterThan(.1);
    const result = hand.quaternion.clone();
    rig.pose(pose);
    expect(hand.quaternion.angleTo(rest)).toBeLessThan(1e-8);
    expect(rig.hand(1, new Vector3()).distanceTo(original)).toBeLessThan(1e-8);
    rig.grip(1, target, direction, out);
    expect(hand.quaternion.angleTo(result)).toBeLessThan(1e-7);
  });

  it('turns the rehearsal hand box independently and restores its old hand attachment on pose', () => {
    const rig = createRehearsalRig('moa'), mesh = rig.group.children[0] as InstancedMesh;
    const pose = { ...STANDING, seat: 1.6, armR: .8, elbowR: 1.1 };
    rig.pose(pose);
    const original = rig.hand(1, new Vector3()), matrix = new Matrix4();
    mesh.getMatrixAt(10, matrix); const old = matrix.clone();
    const target = new Vector3(-.45, 1.8, 1), direction = new Vector3(0, -.25, 1).normalize(), out = new Vector3();
    rig.grip(1, target, direction, out);
    expect(out.distanceTo(target)).toBeLessThan(1e-8);
    mesh.getMatrixAt(10, matrix);
    expect(new Vector3(0, -1, 0).transformDirection(matrix).distanceTo(direction)).toBeLessThan(1e-7);
    // The pre-existing hand query retains its offset near the visible palm, now following its own rotation.
    expect(rig.hand(1, new Vector3()).distanceTo(out)).toBeLessThan(.06);
    rig.pose(pose);
    expect(rig.hand(1, new Vector3()).distanceTo(original)).toBeLessThan(1e-8);
    mesh.getMatrixAt(10, matrix); expect(matrix.elements).toEqual(old.elements);
  });
});

describe('mouth anchors', () => {
  it('follows an imported head with arbitrary rest roll, nod, turn and scene scale', () => {
    const model = new Group(), head = new Bone(); head.name = 'Head';
    head.position.set(0, 1.1, 0); head.rotation.set(.2, -.3, .15); model.add(head);
    model.rotation.y = .6; model.scale.setScalar(3);
    const rest = head.quaternion.clone(), rig = createModelRig(model, 4.2), parent = new Group();
    parent.add(rig.group); parent.position.set(3, -1, 2); parent.rotation.y = -.8; parent.scale.set(1.2, 1.5, .9);
    const lip = new Vector3(0, .055, .135).applyQuaternion(rest.clone().invert());
    const at = new Vector3();
    rig.pose({ ...STANDING }); const initial = rig.mouth(at).clone();
    for (const [nod, turn] of [[.5, 0], [0, .6], [-.2, -.4]]) {
      rig.pose({ ...STANDING, nod: nod!, turn: turn! });
      expect(rig.mouth(at).distanceTo(head.localToWorld(lip.clone()))).toBeLessThan(1e-8);
      expect(at.distanceTo(initial)).toBeGreaterThan(.01);
    }
    parent.scale.setScalar(.4);
    expect(rig.mouth(at).distanceTo(head.localToWorld(lip.clone()))).toBeLessThan(1e-8);
  });

  it('keeps the rehearsal mouth on the turned face and scales a missing-head fallback', () => {
    const rig = createRehearsalRig('moa');
    rig.pose({ ...STANDING, nod: .2 }); const front = rig.mouth(new Vector3());
    rig.pose({ ...STANDING, nod: .2, turn: .6 }); const turned = rig.mouth(new Vector3());
    expect(turned.x).toBeGreaterThan(front.x + .1);
    expect(turned.z).toBeLessThan(front.z);
    rig.group.scale.setScalar(2);
    expect(rig.mouth(new Vector3()).distanceTo(turned.multiplyScalar(2))).toBeLessThan(1e-8);
    const missing = createModelRig(new Group(), 4);
    missing.group.position.set(2, 3, -1); missing.group.scale.setScalar(.5);
    expect(missing.mouth(new Vector3()).toArray()).toEqual([2, 4.78, -.85]);
  });
});
