import { Bone, BufferAttribute, BufferGeometry, CapsuleGeometry, CylinderGeometry, Group, MeshBasicMaterial, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { createModelRig } from '../../src/render/rig';
import { sleevesWithArms } from '../../src/render/sleeves';

/**
 * A body built as the family's models are (the private repository's family/shared.py, garment_apart): a trunk weighed
 * to the spine, and on each side a sleeve of its own, a tube with a round top set in at the shoulder, weighed as the
 * exports are: from the chest to the upper arm between 0.14 of the upper arm's length above the shoulder joint and 0.3
 * below it, and from the upper arm to the forearm about the elbow. In metres, a grown-up's size.
 */
const SHOULDER = new Vector3(0.17, 1.0, 0), ELBOW = new Vector3(0.22, 0.8, 0), WRIST = new Vector3(0.24, 0.63, 0);
const SLEEVE = 0.07;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const along = (p: Vector3, a: Vector3, b: Vector3) => p.clone().sub(a).dot(b.clone().sub(a)) / b.distanceToSquared(a);
const mirror = (p: Vector3, side: number) => new Vector3(p.x * side, p.y, p.z);

/** A capsule from a to b, of radius r. */
function tube(a: Vector3, b: Vector3, r: number): BufferGeometry {
  const g = new CapsuleGeometry(r, a.distanceTo(b), 6, 16, 12);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

interface Body {
  root: Group; mesh: SkinnedMesh; bones: Record<string, Bone>; trunk: number;
  /** Each part's first corner and its bone, if it were one bone's: the trunk, then each upper arm and forearm. */
  parts: [number, string][];
}

/** `whole`: the sleeves one surface with the trunk, as they were sculpted before 7 November. `packed`: the weights in
 * bytes, as the asset build packs them. */
function body({ whole = false, packed = false } = {}): Body {
  const named = (name: string, parent: Bone | Group, x: number, y: number) => {
    const bone = new Bone(); bone.name = name; bone.position.set(x, y, 0); parent.add(bone); return bone;
  };
  const root = new Group();
  const pelvis = named('pelvis', root, 0, 0.6), spine1 = named('spine_01', pelvis, 0, 0.15), spine2 = named('spine_02', spine1, 0, 0.15);
  const bones: Record<string, Bone> = { pelvis, spine_01: spine1, spine_02: spine2 };
  for (const [side, tag] of [[1, 'l'], [-1, 'r']] as const) {
    const s = mirror(SHOULDER, side), e = mirror(ELBOW, side), w = mirror(WRIST, side);
    bones[`upperarm_${tag}`] = named(`upperarm_${tag}`, spine2, s.x, s.y - 0.9);
    bones[`lowerarm_${tag}`] = named(`lowerarm_${tag}`, bones[`upperarm_${tag}`]!, e.x - s.x, e.y - s.y);
    bones[`hand_${tag}`] = named(`hand_${tag}`, bones[`lowerarm_${tag}`]!, w.x - e.x, w.y - e.y);
  }
  const list = Object.values(bones);
  const index = (name: string) => list.indexOf(bones[name]!);
  const trunk = new CylinderGeometry(0.18, 0.18, 0.5, 24, 8).translate(0, 0.85, 0);
  const parts = [trunk, tube(mirror(SHOULDER, 1), mirror(ELBOW, 1), SLEEVE), tube(mirror(ELBOW, 1), mirror(WRIST, 1), SLEEVE * 0.8),
    tube(mirror(SHOULDER, -1), mirror(ELBOW, -1), SLEEVE), tube(mirror(ELBOW, -1), mirror(WRIST, -1), SLEEVE * 0.8)];
  const flat = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const merged = mergeGeometries(flat)!;
  const count = merged.getAttribute('position').count;
  const trunkCorners = flat[0]!.getAttribute('position').count;
  const starts: [number, string][] = [];
  flat.reduce((at, part, i) => { starts.push([at, ['spine_02', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r'][i]!]); return at + part.getAttribute('position').count; }, 0);
  const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
  const p = new Vector3();
  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(merged.getAttribute('position'), i);
    const pairs: [string, number][] = [];
    if (i < trunkCorners) pairs.push(['spine_02', 1]);
    else {
      const tag = p.x > 0 ? 'l' : 'r', side = p.x > 0 ? 1 : -1;
      // As family/shared.py weighs a sleeve: the chest to the upper arm, then the upper arm to the forearm.
      const arm = smooth(-0.14, 0.3, along(p, mirror(SHOULDER, side), mirror(ELBOW, side)));
      const lower = smooth(-0.12, 0.14, along(p, mirror(ELBOW, side), mirror(WRIST, side)));
      pairs.push(['spine_02', 1 - arm], [`upperarm_${tag}`, arm * (1 - lower)], [`lowerarm_${tag}`, arm * lower]);
    }
    pairs.forEach(([name, weight], k) => { skinIndex[i * 4 + k] = index(name); skinWeight[i * 4 + k] = weight; });
  }
  merged.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4));
  if (packed) {
    const bytes = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Rounded down, and the rest given to the first weight, so that each corner's bytes sum to 255.
      const row = [0, 1, 2, 3].map((k) => Math.floor(skinWeight[i * 4 + k]! * 255));
      row[0]! += 255 - row.reduce((a, b) => a + b, 0);
      bytes.set(row, i * 4);
    }
    merged.setAttribute('skinWeight', new BufferAttribute(bytes, 4, true));
  } else merged.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4));
  if (whole) {
    // One surface: a strip of triangles joins each sleeve to the trunk's side.
    const position = merged.getAttribute('position') as BufferAttribute;
    const index: number[] = [];
    for (let i = 0; i < count; i++) index.push(i);
    const near = (from: number, to: number, x: number) => {
      let best = from;
      for (let i = from; i < to; i++) if (Math.abs(position.getX(i) - x) + Math.abs(position.getY(i) - 0.95) < Math.abs(position.getX(best) - x) + Math.abs(position.getY(best) - 0.95)) best = i;
      return best;
    };
    for (const side of [1, -1]) index.push(near(0, trunkCorners, side * 0.18), near(trunkCorners, count, side * 0.12), near(trunkCorners, count, side * 0.13));
    merged.setIndex(index);
  }
  const mesh = new SkinnedMesh(merged, new MeshBasicMaterial());
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new Skeleton(list));
  return { root, mesh, bones, trunk: trunkCorners, parts: starts };
}

const OUT = new Vector3(0, 0, 1), FORWARD = new Vector3(-1, 0, 0);
/** The left arm moved as a scene moves it: out and up beside the head about the body's forward axis (`OUT`), or
 * forward (+) and back (−) about its side axis (`FORWARD`). */
function raise(b: Body, angle: number, axis = OUT): void {
  b.bones.upperarm_l!.quaternion.setFromAxisAngle(axis, angle);
  b.root.updateMatrixWorld(true);
}

/** How far each sleeve corner along the left arm is from where the upper arm alone would carry it, at most (m). */
function lag(b: Body): number {
  const g = b.mesh.geometry, position = g.getAttribute('position');
  const upper = b.bones.upperarm_l!, toArm = upper.matrixWorld.clone().multiply(b.mesh.skeleton.boneInverses[b.mesh.skeleton.bones.indexOf(upper)]!);
  let most = 0;
  const p = new Vector3(), q = new Vector3();
  for (let i = b.trunk; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const up = along(p, SHOULDER, ELBOW);
    if (p.x < 0 || up < 0.05 || up > 0.85) continue;
    b.mesh.getVertexPosition(i, q);
    most = Math.max(most, q.distanceTo(p.clone().applyMatrix4(toArm)));
  }
  return most;
}

/** The largest growth of any left-sleeve triangle's area, posed against rest. */
function stretch(b: Body, rest: Float32Array): number {
  const position = b.mesh.geometry.getAttribute('position');
  const a = new Vector3(), c = new Vector3(), d = new Vector3();
  let most = 0;
  for (let t = b.trunk; t + 2 < position.count; t += 3) {
    if (position.getX(t) < 0) continue;
    b.mesh.getVertexPosition(t, a); b.mesh.getVertexPosition(t + 1, c); b.mesh.getVertexPosition(t + 2, d);
    const posed = c.clone().sub(a).cross(d.clone().sub(a)).length();
    const r0 = new Vector3().fromArray(rest, t * 3), r1 = new Vector3().fromArray(rest, t * 3 + 3), r2 = new Vector3().fromArray(rest, t * 3 + 6);
    const was = r1.sub(r0).cross(r2.sub(r0)).length();
    if (was > 1e-9) most = Math.max(most, posed / was);
  }
  return most;
}

const restOf = (b: Body) => Float32Array.from(b.mesh.geometry.getAttribute('position').array as ArrayLike<number>);
const weights = (b: Body) => Array.from(b.mesh.geometry.getAttribute('skinWeight').array as ArrayLike<number>);

describe('sleeves that go with the arm', () => {
  it('measures the web as exported: a raised arm leaves the top of its sleeve behind', () => {
    const b = body(), rest = restOf(b);
    raise(b, 2.8);
    // Several centimetres of sleeve hang between where the arm went and where the shoulder was, stretched.
    expect(lag(b)).toBeGreaterThan(0.5 * SLEEVE);
    expect(stretch(b, rest)).toBeGreaterThan(1.8);
  });

  it('lets every sleeve go with its arm, raised, held out, swung forward or back', () => {
    for (const [angle, axis] of [[2.8, OUT], [1.6, OUT], [0.8, OUT], [2.8, FORWARD], [1.5, FORWARD], [-0.8, FORWARD]] as const) {
      const b = body(), rest = restOf(b);
      expect(sleevesWithArms(b.mesh)).toBeGreaterThan(0);
      raise(b, angle, axis);
      expect(lag(b)).toBeLessThan(0.02 * SLEEVE);
      // Its round top turns in itself under the trunk's shoulder: no triangle of the sleeve is drawn out.
      expect(stretch(b, rest)).toBeLessThan(1.3);
    }
  });

  it('leaves the trunk, and bodies whose parts are each one bone\'s, as they are', () => {
    const b = body(), before = weights(b);
    sleevesWithArms(b.mesh);
    const after = weights(b);
    expect(after.slice(0, b.trunk * 4)).toEqual(before.slice(0, b.trunk * 4));
    // A body whose every part is one bone's (the grandparents' stand-ins in code) has nothing to mend.
    const rigid = body();
    const index = rigid.mesh.geometry.getAttribute('skinIndex'), weight = rigid.mesh.geometry.getAttribute('skinWeight');
    const bones = rigid.mesh.skeleton.bones;
    for (let i = 0; i < weight.count; i++) {
      const name = rigid.parts.filter(([from]) => from <= i).at(-1)![1];
      index.setXYZW(i, bones.indexOf(rigid.bones[name]!), 0, 0, 0);
      weight.setXYZW(i, 1, 0, 0, 0);
    }
    expect(sleevesWithArms(rigid.mesh)).toBe(0);
  });

  it('leaves sleeves that are one surface with their trunk alone, where the arm would drag the side further', () => {
    const b = body({ whole: true }), before = weights(b);
    expect(sleevesWithArms(b.mesh)).toBe(0);
    expect(weights(b)).toEqual(before);
  });

  it('mends a shared geometry once, and packed weights to a whole', () => {
    const b = body({ packed: true });
    const changed = sleevesWithArms(b.mesh);
    expect(changed).toBeGreaterThan(0);
    expect(sleevesWithArms(b.mesh)).toBe(0);
    const weight = b.mesh.geometry.getAttribute('skinWeight') as BufferAttribute;
    for (let i = 0; i < weight.count; i++) {
      const bytes = [0, 1, 2, 3].map((k) => (weight.array as Uint8Array)[i * 4 + k]!);
      expect(bytes.reduce((a, c) => a + c, 0)).toBe(255);
    }
    raise(b, 2.8);
    expect(lag(b)).toBeLessThan(0.03 * SLEEVE);
  });

  it('is done as a model is put on its rig', () => {
    const b = body();
    createModelRig(b.root, 5);
    expect(b.mesh.geometry.userData.sleevesWithArms).toBeGreaterThan(0);
  });
});
