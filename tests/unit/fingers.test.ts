import { Bone, BufferAttribute, CylinderGeometry, Group, MeshBasicMaterial, Object3D, Quaternion, Skeleton, SkinnedMesh, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { createArmContact, createHandHold } from '../../src/render/arm-contact';
import { alongDigit, fingersOf, HOOK, mixShape, posedDigits, REST, type Hand } from '../../src/render/fingers';

/**
 * A left hand as the family's generator makes one (the private repository's family/shared.py), in its own units (K = 1):
 * a round palm, four fingers as tubes from their roots, a thumb out to its side; all of it on the hand bone, which lies a
 * little off the hand's own length as the generator sets it. Towards the palm is +x, towards the thumb +z.
 */
function hand() {
  const parts: BufferGeometry[] = [];
  // In the generator's frame: towards the palm (a), the thumb (w), and down the hand (y).
  const at = (a: number, w: number, y: number) => new Vector3(a, y, w);
  const ball = (p: Vector3, r: number, sx = 1, sy = 1, sz = 1) => parts.push(new SphereGeometry(r, 16, 12).scale(sx, sy, sz).translate(p.x, p.y, p.z));
  const tube = (from: Vector3, to: Vector3, r0: number, r1: number) => {
    const length = from.distanceTo(to);
    const g = new CylinderGeometry(r1, r0, length, 12, 6, true).translate(0, length / 2, 0);
    g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize())).translate(from.x, from.y, from.z);
    parts.push(g);
    ball(to, r1);
  };
  ball(at(-0.003, 0.004, 0.036), 1, 0.017, 0.036, 0.031);
  for (const [dy, length, r] of [[-0.024, 0.034, 0.0086], [-0.008, 0.041, 0.009], [0.008, 0.039, 0.0088], [0.023, 0.031, 0.0078]] as const) {
    const root = at(-0.003, 0.004 - dy, 0.064), mid = at(0.001, 0.004 - dy * 1.12, 0.064 + 0.55 * length), tip = at(0.011, 0.004 - dy * 1.18 + 0.006, 0.064 + length);
    ball(root, r);
    tube(root, mid, r, r * 0.95);
    tube(mid, tip, r * 0.95, r * 0.78);
  }
  const t0 = at(0.003, 0.03, 0.026), t1 = at(0.011, 0.048, 0.044), t2 = at(0.013, 0.054, 0.062);
  ball(t0, 0.0108);
  tube(t0, t1, 0.0108, 0.01);
  tube(t1, t2, 0.01, 0.0084);
  const geometry = mergeGeometries(parts.map((part) => part.toNonIndexed()))!;
  // The bone's tail lies a little forward and out of the hand's own length.
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0.057, 1, -0.057).normalize()));
  const count = geometry.getAttribute('position').count;
  const root = new Group();
  const forearm = new Bone(); forearm.name = 'lowerarm_l'; forearm.position.set(0, -0.25, 0);
  const bone = new Bone(); bone.name = 'hand_l'; bone.position.set(0, 0.25, 0);
  forearm.add(bone);
  root.add(forearm);
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(count * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(new Float32Array(count * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial());
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new Skeleton([forearm, bone]));
  const rest = Float32Array.from(geometry.getAttribute('position').array as ArrayLike<number>);
  return { root, mesh, bone, forearm, rest };
}

/** The hand's corners as skinned now, in the hand bone's own frame. */
function skinned(h: ReturnType<typeof hand>): Vector3[] {
  h.root.updateMatrixWorld(true);
  h.mesh.skeleton.update();
  const inverse = h.bone.matrixWorld.clone().invert(), out: Vector3[] = [];
  for (let i = 0; i < h.mesh.geometry.getAttribute('position').count; i++) out.push(h.mesh.getVertexPosition(i, new Vector3()).applyMatrix4(inverse));
  return out;
}

const restOf = (h: ReturnType<typeof hand>, i: number) => new Vector3().fromArray(h.rest, i * 3).sub(h.bone.getWorldPosition(new Vector3()));
const offLine = (p: Vector3, at: Vector3, axis: Vector3) => { const d = p.clone().sub(at); return d.addScaledVector(axis, -d.dot(axis)).length(); };

describe('fingers that hold', () => {
  it('finds the hand and gives each digit three bones and three half bones, the palm staying on the hand', () => {
    const h = hand();
    const [left, right] = fingersOf(h.root);
    expect(right).toBeNull();
    expect(left).not.toBeNull();
    const { layout } = left!;
    expect(layout.size).toBeCloseTo(1, 1);
    expect(layout.thumbward.z).toBeGreaterThan(0.95);
    expect(layout.palmward.x).toBeGreaterThan(0.95);
    expect(h.mesh.skeleton.bones.length).toBe(2 + 30);
    expect(fingersOf(h.root)).toBe(fingersOf(h.root));
    const position = h.mesh.geometry.getAttribute('position'), weight = h.mesh.geometry.getAttribute('skinWeight');
    let palm = 0, moved = 0;
    for (let i = 0; i < position.count; i++) {
      let total = 0;
      for (let k = 0; k < 4; k++) total += weight.getComponent(i, k);
      expect(total).toBeCloseTo(1, 5);
      const p = restOf(h, i);
      if (p.y < 0.04 && p.z < 0.012) { palm++; if (h.mesh.skeleton.bones[h.mesh.geometry.getAttribute('skinIndex').getComponent(i, 0)] !== h.bone) moved++; }
    }
    expect(palm).toBeGreaterThan(100);
    expect(moved).toBe(0);
  });

  it('curls each finger round a handle until it touches it, and the thumb onto it', () => {
    const h = hand();
    const left = fingersOf(h.root)[0] as Hand;
    for (const r of [0.0105, 0.017]) {
      const { shape, socket } = left.grip('power', r);
      const posed = posedDigits(left.layout, left.axes, shape);
      for (let f = 1; f < 5; f++) {
        const radius = left.layout.digits[f]!.radius;
        // Each finger comes round the handle: its knuckles and its pad at its surface, none of it far into it.
        for (const k of [1, 2]) expect(offLine(posed[f]![k]!, socket.at, socket.axis) / (r + radius), `finger ${f} joint ${k} at ${r}`).toBeGreaterThan(0.75);
        for (const k of [1, 2]) expect(offLine(posed[f]![k]!, socket.at, socket.axis) / (r + radius), `finger ${f} joint ${k} at ${r}`).toBeLessThan(1.35);
        const pad = posed[f]![2]!.clone().lerp(posed[f]![3]!, 0.7);
        expect(offLine(pad, socket.at, socket.axis) / (r + radius), `finger ${f} pad at ${r}`).toBeLessThan(1.35);
        // ... and it is curled in, not straight past it.
        expect(shape.fingers[f - 1]!.reduce((a, b) => a + b, 0)).toBeGreaterThan(REST.fingers[f - 1]!.reduce((a, b) => a + b, 0) + (r < 0.012 ? 0.3 : -0.1));
      }
      const thumbPad = posed[0]![2]!.clone().lerp(posed[0]![3]!, 0.45);
      expect(offLine(thumbPad, socket.at, socket.axis) / (r + left.layout.digits[0]!.radius)).toBeLessThan(1.4);
      expect(shape.thumb.across).toBeGreaterThan(REST.thumb.across);
    }
    // A thinner handle is closed round further.
    const thin = left.grip('power', 0.008).shape, thick = left.grip('power', 0.02).shape;
    const sum = (s: typeof thin) => s.fingers.flat().reduce((a, b) => a + b, 0);
    expect(sum(thin)).toBeGreaterThan(sum(thick));
  });

  it('closes the skinned fingers round the grip and opens them again when the hand lets go', () => {
    const h = hand();
    const left = fingersOf(h.root)[0] as Hand;
    left.set(REST);
    const open = skinned(h);
    const { shape, socket } = left.grip('power', 0.012);
    left.set(shape);
    const closed = skinned(h);
    // The fingertips' corners come in to the handle.
    let tips = 0, nearer = 0;
    open.forEach((p, i) => {
      if (restOf(h, i).y < 0.1) return;
      tips++;
      if (offLine(closed[i]!, socket.at, socket.axis) < offLine(p, socket.at, socket.axis) - 0.004) nearer++;
    });
    expect(tips).toBeGreaterThan(20);
    expect(nearer / tips).toBeGreaterThan(0.9);
    // Half way, the fingers are half closed; let go, they are as they rested, to the corner.
    left.set(mixShape(REST, shape, 0.5));
    const half = skinned(h);
    left.set(mixShape(shape, REST, 1));
    const again = skinned(h);
    let most = 0;
    open.forEach((p, i) => { most = Math.max(most, p.distanceTo(again[i]!)); });
    expect(most).toBeLessThan(1e-6);
    let between = 0;
    open.forEach((p, i) => { if (restOf(h, i).y > 0.1) between += Number(half[i]!.distanceTo(p) > 0.2 * closed[i]!.distanceTo(p) && half[i]!.distanceTo(p) < 0.8 * closed[i]!.distanceTo(p)); });
    expect(between / tips).toBeGreaterThan(0.8);
  });

  it('keeps each knuckle round as it bends: a corner near it keeps its distance from the joint', () => {
    const h = hand();
    const left = fingersOf(h.root)[0] as Hand;
    const middle = left.layout.digits[2]!;
    // A right angle at the middle knuckle of the long finger, the others as they rest.
    const bent = mixShape(REST, REST, 0);
    bent.fingers[1] = [0.1, Math.PI / 2, 0.2];
    left.set(bent);
    const now = skinned(h);
    const joint = posedDigits(left.layout, left.axes, bent)[2]![1]!;
    let least = Infinity, count = 0;
    for (let i = 0; i < now.length; i++) {
      const p = restOf(h, i);
      const { s, off } = alongDigit(middle, p);
      const at = middle.joints[1].distanceTo(middle.joints[0]);
      // Its own corners about the joint, on its back, the outside of the bend.
      if (Math.abs(s - at) > 0.5 * middle.radius || off < 0.8 * middle.radius || p.x > middle.joints[1].x) continue;
      if (Math.abs(p.z - middle.joints[1].z) > 0.4 * middle.radius) continue;
      count++;
      least = Math.min(least, now[i]!.distanceTo(joint) / p.distanceTo(middle.joints[1]));
    }
    expect(count).toBeGreaterThan(2);
    expect(least).toBeGreaterThan(0.85);
  });

  it('hooks round a bail and pinches a sheet, each with its socket in reach of the fingers', () => {
    const h = hand();
    const left = fingersOf(h.root)[0] as Hand;
    const hook = left.grip('hook', 0.004);
    expect(hook.shape).toBe(HOOK);
    const posed = posedDigits(left.layout, left.axes, HOOK);
    for (let f = 1; f < 5; f++) expect(offLine(posed[f]![1]!.clone().lerp(posed[f]![2]!, 0.4), hook.socket.at, hook.socket.axis)).toBeLessThan(0.004 + 1.6 * left.layout.digits[f]!.radius);
    const pinch = left.grip('pinch', 0.004);
    const pads = posedDigits(left.layout, left.axes, pinch.shape);
    expect(pads[0]![2]!.clone().lerp(pads[0]![3]!, 0.45).distanceTo(pinch.socket.at)).toBeLessThan(0.03);
    expect(pinch.shape.thumb.across).toBeGreaterThan(REST.thumb.across);
  });

  it('holds a thing with the arm: the socket comes to it, the hand turned along its axis', () => {
    const h = hand();
    const left = fingersOf(h.root)[0] as Hand;
    const upper = new Object3D(); h.root.add(upper); upper.position.set(0, 0.25, 0);
    upper.attach(h.forearm);
    h.root.updateMatrixWorld(true);
    const hold = createHandHold(h.forearm, h.bone, createArmContact(upper, h.forearm, h.bone));
    const { socket } = left.grip('power', 0.012);
    const target = new Vector3(0.12, -0.15, 0.18), axis = new Vector3(1, 0.3, 0.2).normalize();
    const out = new Vector3(), held = new Vector3();
    hold(socket.at, socket.axis, target, axis, out, 1, held);
    expect(out.distanceTo(target)).toBeLessThan(1e-5);
    expect(held.dot(axis)).toBeGreaterThan(1 - 1e-6);
    // Half way, the hand is between where it was and the thing.
    const h2 = hand();
    fingersOf(h2.root);
    const upper2 = new Object3D(); h2.root.add(upper2); upper2.position.set(0, 0.25, 0); upper2.attach(h2.forearm);
    h2.root.updateMatrixWorld(true);
    const before = h2.bone.localToWorld(socket.at.clone());
    const hold2 = createHandHold(h2.forearm, h2.bone, createArmContact(upper2, h2.forearm, h2.bone));
    hold2(socket.at, socket.axis, target, axis, out, 0.5);
    expect(out.distanceTo(before.clone().lerp(target, 0.5))).toBeLessThan(0.02);
  });
});
