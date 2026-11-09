import { Bone, BufferAttribute, CylinderGeometry, Group, MeshBasicMaterial, Quaternion, Skeleton, SkinnedMesh, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { halfJoints, softShoulders } from '../../src/render/joints';
import { skirtsOverThighs } from '../../src/render/skirts';
import { REACHES_SKIRT, pushOf } from '../../src/render/sleeves';

const X = new Vector3(1, 0, 0);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * A small body as the family's models are weighed (the private repository's family/shared.py): a pelvis and a chest;
 * a left arm hanging from the shoulder (0.17, 1.0) to the elbow (0.17, 0.8) and the wrist (0.17, 0.62), a tube of radius
 * 0.05 blended from the upper arm to the forearm over ±0.13 of the forearm about the elbow; a left leg from the hip
 * (0.08, 0.6) to the knee (0.08, 0.36), a tube of radius 0.07 blended over ±0.032 about the knee; a trunk from 0.6 to 1.1
 * on the chest; and, with `skirt`, a skirt hanging from the hips to 0.45 on the pelvis.
 */
function body({ skirt = false } = {}) {
  const root = new Group();
  // As exported, a limb hangs half a turn round z from the body: its +y runs down it, and a positive turn about its x
  // brings it forward (src/render/rig.ts, createModelRig).
  const named = (name: string, parent: Bone | Group, x: number, y: number, hangs = false) => {
    const b = new Bone(); b.name = name; b.position.set(x, y, 0); if (hangs) b.rotation.z = Math.PI; parent.add(b); return b;
  };
  const pelvis = named('pelvis', root, 0, 0.6), chest = named('spine_02', pelvis, 0, 0.3);
  const upper = named('upperarm_l', chest, 0.17, 0.1, true), lower = named('lowerarm_l', upper, 0, 0.2), hand = named('hand_l', lower, 0, 0.18);
  const thigh = named('thigh_l', pelvis, 0.08, 0, true), calf = named('calf_l', thigh, 0, 0.24), foot = named('foot_l', calf, 0, 0.3);
  const thighR = named('thigh_r', pelvis, -0.08, 0, true), calfR = named('calf_r', thighR, 0, 0.24);
  const bones = [pelvis, chest, upper, lower, hand, thigh, calf, foot, thighR, calfR];
  const at = (b: Bone) => bones.indexOf(b);
  const parts: { geometry: BufferGeometry; weigh: (p: Vector3) => [Bone, number][] }[] = [
    { geometry: new CylinderGeometry(0.15, 0.15, 0.5, 24, 10).translate(0, 0.85, 0), weigh: () => [[chest, 1]] },
    { geometry: new CylinderGeometry(0.05, 0.05, 0.38, 16, 24).translate(0.17, 0.81, 0),
      weigh: (p) => { const s = smooth(-0.13 * 0.18, 0.13 * 0.18, 0.8 - p.y); return [[upper, 1 - s], [lower, s]]; } },
    { geometry: new CylinderGeometry(0.07, 0.07, 0.5, 16, 30).translate(0.08, 0.35, 0),
      weigh: (p) => { const s = smooth(0.36 + 0.032, 0.36 - 0.032, p.y); return [[thigh, 1 - s], [calf, s]]; } },
  ];
  if (skirt) parts.push({ geometry: new CylinderGeometry(0.16, 0.2, 0.17, 24, 8, true).translate(0, 0.535, 0), weigh: () => [[pelvis, 1]] });
  const flat = parts.map((part) => part.geometry.toNonIndexed());
  const merged = mergeGeometries(flat)!;
  const count = merged.getAttribute('position').count;
  const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
  let i = 0;
  flat.forEach((geometry, k) => {
    const position = geometry.getAttribute('position');
    for (let j = 0; j < position.count; j++, i++) {
      parts[k]!.weigh(new Vector3().fromBufferAttribute(position, j)).forEach(([bone, w], slot) => { skinIndex[i * 4 + slot] = at(bone); skinWeight[i * 4 + slot] = w; });
    }
  });
  merged.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4));
  merged.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4));
  const mesh = new SkinnedMesh(merged, new MeshBasicMaterial());
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new Skeleton(bones));
  const rest = Float32Array.from(merged.getAttribute('position').array as ArrayLike<number>);
  const rests = new Map(bones.map((bone) => [bone, bone.quaternion.clone()]));
  /** Turns a bone from its rest by `angle` about its own `axis`, and updates the body. */
  const turn = (bone: Bone, angle: number, axis = X) => { bone.quaternion.copy(rests.get(bone)!).multiply(new Quaternion().setFromAxisAngle(axis, angle)); root.updateMatrixWorld(true); };
  return { root, mesh, rest, turn, rests, trunk: flat[0]!.getAttribute('position').count, pelvis, chest, upper, lower, thigh, calf, thighR };
}

/** The smallest share of its distance from a joint that a corner near the joint keeps as the joint bends (1: none lost). */
function kept(b: ReturnType<typeof body>, joint: Vector3, near: number, bent: Bone): number {
  const position = b.mesh.geometry.getAttribute('position');
  const now = bent.getWorldPosition(new Vector3());
  let least = Infinity;
  const p = new Vector3(), q = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromArray(b.rest, i * 3);
    if (Math.abs(p.y - joint.y) > near || Math.abs(p.x - joint.x) > 0.09) continue;
    b.mesh.getVertexPosition(i, q);
    least = Math.min(least, q.distanceTo(now) / p.distanceTo(joint));
  }
  return least;
}

const ELBOW = new Vector3(0.17, 0.8, 0), KNEE = new Vector3(0.08, 0.36, 0);

describe('elbows and knees that keep their round', () => {
  it('thins a bent elbow and knee as exported, and keeps them round through a half bone', () => {
    for (const [joint, bent, angle] of [[ELBOW, 'lower', 1.7], [KNEE, 'calf', -1.7]] as const) {
      const before = body();
      before.turn(before[bent], angle);
      const thin = kept(before, joint, 0.03, before[bent]);
      expect(thin).toBeLessThan(0.75);
      const after = body();
      expect(halfJoints(after.mesh)).toBeGreaterThan(0);
      after.turn(after[bent], angle);
      expect(kept(after, joint, 0.03, after[bent])).toBeGreaterThan(0.88);
    }
  });

  it('turns each half bone half as far as the bone below its joint, every frame, and adds it once', () => {
    const b = body();
    halfJoints(b.mesh);
    const half = b.upper.children.find((node) => node.name === 'lowerarm_l_half')!;
    expect(half).toBeDefined();
    b.turn(b.lower, 1.2);
    expect(half.quaternion.angleTo(b.lower.quaternion)).toBeCloseTo(0.6, 3);
    const bones = b.mesh.skeleton.bones.length;
    expect(halfJoints(b.mesh)).toBe(0);
    expect(b.mesh.skeleton.bones.length).toBe(bones);
  });
});

describe('a skirt over the thighs', () => {
  it('goes forward with a thigh that reaches it, and never back with one swung back', () => {
    const b = body();
    const push = pushOf(b.thigh);
    b.turn(b.thigh, 1.5);
    expect(push.quaternion.angleTo(b.thigh.quaternion)).toBeCloseTo(REACHES_SKIRT, 3);
    b.turn(b.thigh, -0.6);
    expect(push.quaternion.angleTo(b.rests.get(b.thigh)!)).toBeLessThan(1e-6);
  });

  it('keeps the thigh of a kneel under its front, and its back hanging from the hips', () => {
    const b = body({ skirt: true });
    expect(skirtsOverThighs(b.mesh)).toBeGreaterThan(0);
    const position = b.mesh.geometry.getAttribute('position');
    // The front of the hem over the left thigh, and the back of the hem.
    let front = -1, back = -1;
    for (let i = 0; i < position.count; i++) {
      const x = b.rest[i * 3]!, y = b.rest[i * 3 + 1]!, z = b.rest[i * 3 + 2]!;
      if (y > 0.455) continue;
      if (z > 0.15 && Math.abs(x - 0.08) < 0.05 && (front < 0 || z > b.rest[front * 3 + 2]!)) front = i;
      if (z < -0.15 && (back < 0 || z < b.rest[back * 3 + 2]!)) back = i;
    }
    b.turn(b.thigh, 1.5);
    const hem = b.mesh.getVertexPosition(front, new Vector3());
    // The thigh lies level now, forward along +z from the hip: the hem is above its top (its radius is 0.07).
    const hip = b.thigh.getWorldPosition(new Vector3());
    expect(hem.y - hip.y).toBeGreaterThan(0.07);
    // A leg swung back leaves the back hanging where it was.
    b.turn(b.thigh, -0.6);
    expect(b.mesh.getVertexPosition(back, new Vector3()).distanceTo(new Vector3().fromArray(b.rest, back * 3))).toBeLessThan(1e-4);
  });
});

describe('a shoulder that gives to its arm', () => {
  it('lets the trunk over the joint go a little with a raised arm, and nothing under it', () => {
    const b = body();
    halfJoints(b.mesh);
    expect(softShoulders(b.mesh)).toBeGreaterThan(0);
    b.turn(b.upper, 2.6);
    let over = 0, under = 0;
    const q = new Vector3();
    for (let i = 0; i < b.trunk; i++) {      // the trunk's corners come first
      const rest = new Vector3().fromArray(b.rest, i * 3);
      const moved = b.mesh.getVertexPosition(i, q).distanceTo(rest);
      if (rest.y > 1.0 && rest.x > 0.1) over = Math.max(over, moved);
      if (rest.y < 0.97) under = Math.max(under, moved);
    }
    expect(over).toBeGreaterThan(0.005);
    expect(under).toBeLessThan(1e-4);
  });
});
