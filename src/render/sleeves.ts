import { Bone, Object3D, Quaternion, Skeleton, Vector3, type BufferAttribute, type InterleavedBufferAttribute, type SkinnedMesh } from 'three';

/**
 * Sleeves that go with the arm (Olov, 9 November 2026: "make sure they have not wings between the arms and the belly
 * when they move their arms").
 *
 * Since 7 November every sleeve or bare arm of the family's models from Blender is a tube of its own, set in at the
 * shoulder (the private repository's family/separate_sleeves.py), and so is each sleeve of their raincoats
 * (family/wardrobe.py). But each kept the weights of a sleeve sculpted whole with its trunk: from a little above the
 * shoulder joint to a third of the way down the arm it went partly with the chest, a tenth of its weight at the joint's
 * height and still a fifth an arm's thickness below it. An arm raised or held out turned the lower half of a short
 * sleeve with it and left the upper half behind: the sleeve flared out at the shoulder like a wing, with the arm coming
 * up out of it, and its inside, which lies against the side at rest, was dragged out as a web between the arm and the
 * body.
 *
 * A tube of its own needs no such blend. Its top is nearly a ball round the shoulder joint, set in under the trunk's
 * shoulder, and a ball turned about its centre keeps its shape: so the arm's own part goes with the arm, all of it, the
 * top of its round too (a seam that kept that with the chest would only tear it, measured on every export). The trunk
 * itself, and every part that is all trunk or all arm, is left as it is: so is a body whose sleeves are one surface with
 * its trunk, where taking the side with the arm would only make the web worse.
 */

type Attribute = BufferAttribute | InterleavedBufferAttribute;

/** Each corner's part: the corners joined by triangles, and those that lie on the same point (a seam in the export). */
export function partsOf(position: Attribute, index: ArrayLike<number> | null, count: number): Int32Array {
  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;
  const find = (a: number) => {
    while (parent[a] !== a) { parent[a] = parent[parent[a]!]!; a = parent[a]!; }
    return a;
  };
  const join = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const at = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const key = `${position.getX(i)},${position.getY(i)},${position.getZ(i)}`;
    const same = at.get(key);
    if (same === undefined) at.set(key, i);
    else join(i, same);
  }
  const corners = index ? index.length : count;
  for (let t = 0; t + 2 < corners; t += 3) {
    const a = index ? index[t]! : t, b = index ? index[t + 1]! : t + 1, c = index ? index[t + 2]! : t + 2;
    join(a, b); join(b, c);
  }
  for (let i = 0; i < count; i++) parent[i] = find(i);
  return parent;
}

/** A corner's four weights, rewritten: `put` lists the bones and weights it has now (others are dropped). */
export function writeWeights(mesh: SkinnedMesh, i: number, put: [number, number][]): void {
  const skinIndex = mesh.geometry.getAttribute('skinIndex'), skinWeight = mesh.geometry.getAttribute('skinWeight');
  const top = put.filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const total = top.reduce((sum, [, w]) => sum + w, 0) || 1;
  let stored = 0;
  for (let k = 0; k < 4; k++) {
    const [bone, weight] = top[k] ?? [0, 0];
    skinIndex.setComponent(i, k, bone);
    if (k > 0) { skinWeight.setComponent(i, k, weight / total); stored += skinWeight.getComponent(i, k); }
  }
  skinWeight.setComponent(i, 0, Math.max(0, 1 - stored));     // a packed weight is rounded: the first takes the rest
}

/** Each corner's bones and weights. */
export function weightsOf(mesh: SkinnedMesh, i: number): [number, number][] {
  const skinIndex = mesh.geometry.getAttribute('skinIndex'), skinWeight = mesh.geometry.getAttribute('skinWeight');
  const out: [number, number][] = [];
  for (let k = 0; k < 4; k++) { const w = skinWeight.getComponent(i, k); if (w > 0) out.push([skinIndex.getComponent(i, k), w]); }
  return out;
}

/**
 * Lets each sleeve (or bare arm) of a skinned body go with its arm, as above: returns how many corners changed. A
 * geometry is mended once, whichever model it is shared by.
 */
export function sleevesWithArms(mesh: SkinnedMesh): number {
  const g = mesh.geometry;
  if (g.userData.sleevesWithArms !== undefined) return 0;
  g.userData.sleevesWithArms = 0;
  const position = g.getAttribute('position'), skinIndex = g.getAttribute('skinIndex'), skinWeight = g.getAttribute('skinWeight');
  const bones = mesh.skeleton?.bones;
  if (!position || !skinIndex || !skinWeight || !bones) return 0;
  const named = (name: string) => bones.findIndex((bone) => bone.name === name);
  const count = position.count;
  let parts: Int32Array | null = null;
  let changed = 0;
  for (const tag of ['l', 'r']) {
    const upper = named(`upperarm_${tag}`);
    if (upper < 0) continue;
    // The arm's own bones: its upper arm and all that hangs from it.
    const own = bones.map((bone) => { for (let node: Object3D | null = bone; node; node = node.parent) if (node === bones[upper]) return true; return false; });
    // How much of each corner the arm moves, and the trunk.
    const arm = new Float32Array(count), rest = new Float32Array(count);
    let moved = false;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 4; k++) {
        const w = skinWeight.getComponent(i, k);
        if (w <= 0) continue;
        if (own[skinIndex.getComponent(i, k)]) arm[i] += w;
        else rest[i] += w;
      }
      if (arm[i]! > 0) moved = true;
    }
    if (!moved) continue;
    // Only within a part that is the arm's own, one that the arm moves more than anything else does: every corner of it
    // that the trunk moves, also the top of its round that only the trunk moved.
    parts ??= partsOf(position, g.index ? g.index.array : null, count);
    const share = new Map<number, number>();
    for (let i = 0; i < count; i++) if (arm[i]! > 0 || rest[i]! > 0) share.set(parts[i]!, (share.get(parts[i]!) ?? 0) + arm[i]! - rest[i]!);
    for (let i = 0; i < count; i++) {
      if (rest[i]! <= 0 || (share.get(parts[i]!) ?? 0) <= 0) continue;
      // What the chest moved of it, the upper arm moves now.
      const bone = [0, 1, 2, 3].map((k) => skinIndex.getComponent(i, k));
      const weight = [0, 1, 2, 3].map((k) => skinWeight.getComponent(i, k));
      for (let k = 0; k < 4; k++) if (!own[bone[k]!]) weight[k] = 0;
      // The upper arm's own slot, or (with none) one that is free now.
      let slot = bone.findIndex((b, k) => b === upper && weight[k]! > 0);
      if (slot < 0) slot = bone.indexOf(upper);
      if (slot < 0) slot = weight.findIndex((w) => w <= 1e-6);
      if (slot < 0) continue;
      bone[slot] = upper;
      let others = 0;
      for (let k = 0; k < 4; k++) {
        if (k === slot) continue;
        skinWeight.setComponent(i, k, weight[k]!);
        others += skinWeight.getComponent(i, k);     // as stored: a packed weight is rounded
      }
      skinIndex.setComponent(i, slot, upper);
      skinWeight.setComponent(i, slot, Math.max(0, 1 - others));
      changed++;
    }
  }
  if (changed > 0) { skinWeight.needsUpdate = true; skinIndex.needsUpdate = true; }
  g.userData.sleevesWithArms = changed;
  return changed;
}

// === Bones added to a model as it is put on its rig, between two of its own (./joints.ts, ./skirts.ts) ===============

/** The joint a bone stands for: an added bone for the bone it rests on (`thigh_l_push` is `thigh_l`). */
export const jointOf = (name: string) => name.replace(/_(half|push)$/, '');

const rests = new WeakMap<Object3D, Quaternion>();

/** A bone resting where `like` rests, beside it under the same parent, made once per model and found by its name. */
function besideOf(like: Object3D, name: string): { bone: Bone; rest: Quaternion } {
  const parent = like.parent!;
  let bone = parent.children.find((node) => node.name === name) as Bone | undefined;
  if (!bone) {
    bone = new Bone();
    bone.name = name;
    bone.position.copy(like.position);
    bone.quaternion.copy(like.quaternion);
    bone.scale.copy(like.scale);
    rests.set(bone, like.quaternion.clone());
    parent.add(bone);
  }
  const rest = rests.get(bone) ?? bone.quaternion.clone();
  rests.set(bone, rest);
  return { bone, rest };
}

/** The half bone at `child`'s joint: it turns half as far from its rest as `child` does. One per joint and model. */
export function halfOf(child: Object3D): Bone {
  const { bone, rest } = besideOf(child, child.name + '_half');
  // Set as its matrix is made, every frame, from wherever the pose, a reach or a grip has left the bone below.
  bone.updateMatrix = function updateMatrix(this: Bone) {
    this.quaternion.slerpQuaternions(rest, child.quaternion, 0.5);
    Object3D.prototype.updateMatrix.call(this);
  };
  bone.updateMatrix();
  return bone;
}

/** How far a thigh swings forward before it lifts a skirt hanging in front of it (radians): little, since a kneel brings
 * the thigh up level and the skirt must stay over it, where a stride that lifts it a little looks as a skirt does. */
export const REACHES_SKIRT = 0.15;

/** A bone at a hip that a thigh pushes forward once it reaches the skirt, and never back: a skirt lies on a thigh that
 * comes up, and hangs from the hips as it goes back. The thigh swings forward about its own x (src/render/rig.ts). */
export function pushOf(thigh: Object3D): Bone {
  const { bone, rest } = besideOf(thigh, thigh.name + '_push');
  const inverse = rest.clone().invert(), turn = new Quaternion(), X = new Vector3(1, 0, 0);
  bone.updateMatrix = function updateMatrix(this: Bone) {
    turn.copy(inverse).multiply(thigh.quaternion);
    const swing = 2 * Math.atan2(turn.x, turn.w);
    const forward = Math.max(0, Math.atan2(Math.sin(swing), Math.cos(swing)) - REACHES_SKIRT);
    this.quaternion.copy(rest).multiply(turn.setFromAxisAngle(X, forward));
    Object3D.prototype.updateMatrix.call(this);
  };
  bone.updateMatrix();
  return bone;
}

/** The mesh's skeleton with `added` in it, at its end where it is not, bound as the bone `like` (an index) it rests on. */
export function withBone(mesh: SkinnedMesh, added: Bone, like: number): number {
  const at = mesh.skeleton.bones.indexOf(added);
  if (at >= 0) return at;
  const bones = [...mesh.skeleton.bones, added];
  const inverses = [...mesh.skeleton.boneInverses.map((m) => m.clone()), mesh.skeleton.boneInverses[like]!.clone()];
  mesh.bind(new Skeleton(bones, inverses), mesh.bindMatrix);
  return bones.length - 1;
}
