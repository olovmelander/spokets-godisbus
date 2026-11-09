import { Matrix4, Object3D, Quaternion, Vector3, type Bone, type SkinnedMesh } from 'three';
import { skirtsOverThighs } from './skirts';
import { halfOf, partsOf, weightsOf, withBone, writeWeights as write } from './sleeves';

/**
 * Elbows and knees that keep their round as they bend, and a shoulder whose corner gives a little to a raised arm
 * (Olov, 9 November 2026: the family's models "even better when they move: the look, the smoothness, and that they feel
 * natural").
 *
 * A limb of the family's models bends at the elbow and the knee by blending, over a few centimetres, the bone above
 * the joint into the bone below it. Blended so, the outside of a bend is drawn in towards the joint, on the straight line
 * between where each bone alone would carry it: at a right angle a third of the limb's thickness is gone, the elbow of a
 * hug or a shrug and the knee of a kneel thin to a pinched kink, and on a raincoat's thick sleeve the cloth is drawn
 * out four times over across the bend.
 *
 * So each elbow and knee has a bone of its own between the two, at the joint, that turns half as far as the bone below
 * it (`halfOf`): the blend runs from the bone above to the half bone and on to the bone below, over about a limb's
 * thickness, and the bend is two half bends that keep the round (`halfJoints`). The shoulder's own half bone takes a
 * little of the trunk's corner over the joint, so a raised arm rounds it instead of leaving a square edge
 * (`softShoulders`); the side under the arm stays with the trunk, so no web comes back.
 */

/** The joints that bend through a half bone: each bone below its joint. */
const BENDS = ['lowerarm_l', 'lowerarm_r', 'calf_l', 'calf_r'];
/** How far the blend runs to each side of the joint, in the limb's thickness (its radius there). */
export const BLEND = 1.2;
/** How much of the trunk's corner over a shoulder joint its half bone moves, at most, and how near the joint, in the arm's radius there. */
export const SHOULDER = { share: 0.5, reach: 1.6 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Each corner as it lies at rest in a bone's own frame (a limb's bones lie along their +y). */
function restIn(mesh: SkinnedMesh, bone: number): Float32Array {
  const m = new Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[bone]!, mesh.bindMatrix);
  const position = mesh.geometry.getAttribute('position'), out = new Float32Array(position.count * 3), v = new Vector3();
  for (let i = 0; i < position.count; i++) { v.fromBufferAttribute(position, i).applyMatrix4(m); v.toArray(out, i * 3); }
  return out;
}

const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[s.length >> 1]! : 0; };

/**
 * Bends each elbow and knee of a skinned body through its half bone, as above: returns how many corners changed. Only the
 * parts that bend at the joint are touched (a sleeve, a bare arm, a trouser leg); a part that is all one bone's, a cuff or
 * a boot, is left as it is. A geometry is bent once.
 */
export function halfJoints(mesh: SkinnedMesh): number {
  const g = mesh.geometry;
  if (g.userData.halfJoints !== undefined) return 0;
  g.userData.halfJoints = 0;
  const position = g.getAttribute('position');
  if (!position || !g.getAttribute('skinIndex') || !g.getAttribute('skinWeight') || !mesh.skeleton) return 0;
  const count = position.count;
  let parts: Int32Array | null = null, changed = 0;
  for (const name of BENDS) {
    const bones = mesh.skeleton.bones;
    const child = bones.findIndex((bone) => bone.name === name);
    const parentBone = bones[child]?.parent;
    const parent = parentBone ? bones.indexOf(parentBone as Bone) : -1;
    if (child < 0 || parent < 0) continue;
    // The corners the joint blends now, between the bone above it and the bone below.
    const above = new Float32Array(count), below = new Float32Array(count), other = new Float32Array(count);
    const blended: number[] = [];
    for (let i = 0; i < count; i++) {
      for (const [bone, w] of weightsOf(mesh, i)) {
        if (bone === parent) above[i] += w; else if (bone === child) below[i] += w; else other[i] += w;
      }
      if (above[i]! > 1e-4 && below[i]! > 1e-4) blended.push(i);
    }
    if (blended.length === 0) continue;
    parts ??= partsOf(position, g.index ? g.index.array : null, count);
    const bending = new Set(blended.map((i) => parts![i]!));
    // Along the bone below the joint (+y) and how far from it, in its own frame at rest; the limb's radius at the joint.
    const local = restIn(mesh, child);
    const radius = median(blended.map((i) => Math.hypot(local[i * 3]!, local[i * 3 + 2]!)));
    const reach = BLEND * radius;
    const half = withBone(mesh, halfOf(bones[child]!), child);
    for (let i = 0; i < count; i++) {
      const limb = above[i]! + below[i]!;
      if (!bending.has(parts[i]!) || limb <= 0) continue;
      const y = local[i * 3 + 1]!;
      const near = other[i]! < 1e-3 && Math.abs(y) < reach;
      if (!near && !(above[i]! > 1e-4 && below[i]! > 1e-4)) continue;
      // From the bone above (0) through the half bone (½) to the bone below (1).
      const s = near ? smooth(-reach, reach, y) : below[i]! / limb;
      const put: [number, number][] = weightsOf(mesh, i).filter(([bone]) => bone !== parent && bone !== child);
      put.push([parent, limb * Math.max(0, 1 - 2 * s)], [half, limb * (1 - Math.abs(2 * s - 1))], [child, limb * Math.max(0, 2 * s - 1)]);
      write(mesh, i, put);
      changed++;
    }
  }
  if (changed > 0) { g.getAttribute('skinIndex').needsUpdate = true; g.getAttribute('skinWeight').needsUpdate = true; }
  g.userData.halfJoints = changed;
  return changed;
}

/**
 * Gives each shoulder's half bone a little of the trunk's corner over the joint, as above: the corners of a part that
 * only the trunk moves, near the joint and above it along the arm (none beside or under it). Returns how many changed.
 */
export function softShoulders(mesh: SkinnedMesh): number {
  const g = mesh.geometry;
  if (g.userData.softShoulders !== undefined) return 0;
  g.userData.softShoulders = 0;
  const position = g.getAttribute('position');
  if (!position || !g.getAttribute('skinIndex') || !g.getAttribute('skinWeight') || !mesh.skeleton) return 0;
  const count = position.count;
  let parts: Int32Array | null = null, changed = 0;
  for (const tag of ['l', 'r']) {
    const bones = mesh.skeleton.bones;
    const upper = bones.findIndex((bone) => bone.name === `upperarm_${tag}`);
    const chest = upper >= 0 && bones[upper]!.parent ? bones.indexOf(bones[upper]!.parent as Bone) : -1;
    if (upper < 0 || chest < 0) continue;
    const own = bones.map((bone) => { for (let node: Object3D | null = bone; node; node = node.parent) if (node === bones[upper]) return true; return false; });
    // The trunk: the chest and the bones it hangs from (not the head, the hair on it, an arm or a leg); and, in a fuller
    // skeleton (src/render/rig.ts, `FULLER`), both collarbones and the upper chest, which the upper arm hangs from now.
    const trunkBones = bones.map((bone) => {
      if (TRUNK.test(bone.name)) return true;
      for (let node: Object3D | null = bones[chest]!; node; node = node.parent) if (node === bone) return true;
      return false;
    });
    // In the upper arm's frame at rest: the joint at the origin, the arm down its +y. Its radius there, from its own corners.
    const local = restIn(mesh, upper);
    parts ??= partsOf(position, g.index ? g.index.array : null, count);
    const ring: number[] = [];
    const notTrunk = new Set<number>();
    for (let i = 0; i < count; i++) {
      const weights = weightsOf(mesh, i);
      const y = local[i * 3 + 1]!, r = Math.hypot(local[i * 3]!, local[i * 3 + 2]!);
      if (weights.every(([bone]) => own[bone])) { if (y > 0 && y < r) ring.push(Math.hypot(r, y)); }
      if (weights.some(([bone]) => !trunkBones[bone] && !/^thigh_/.test(bones[bone]!.name))) notTrunk.add(parts[i]!);
    }
    const trunk: number[] = [];
    for (let i = 0; i < count; i++) if (!notTrunk.has(parts[i]!) && weightsOf(mesh, i).every(([bone]) => trunkBones[bone])) trunk.push(i);
    if (ring.length < 8 || trunk.length === 0) continue;
    const reach = SHOULDER.reach * median(ring);
    let half = -1;
    for (const i of trunk) {
      const x = local[i * 3]!, y = local[i * 3 + 1]!, z = local[i * 3 + 2]!;
      const far = Math.hypot(x, y, z);
      // Over the joint only: from level with it upwards (y below 0 runs up, away from the elbow).
      const share = SHOULDER.share * (1 - smooth(0.45 * reach, reach, far)) * smooth(0.05 * reach, -0.35 * reach, y);
      if (share < 0.01) continue;
      if (half < 0) half = withBone(mesh, halfOf(bones[upper]!), upper);
      const put = weightsOf(mesh, i).map(([bone, w]) => [bone, w * (1 - share)] as [number, number]);
      put.push([half, share]);
      write(mesh, i, put);
      changed++;
    }
  }
  if (changed > 0) { g.getAttribute('skinIndex').needsUpdate = true; g.getAttribute('skinWeight').needsUpdate = true; }
  g.userData.softShoulders = changed;
  return changed;
}

/** The trunk's own bones in a fuller skeleton, whichever of them a trunk's corner goes with. */
const TRUNK = /^(pelvis|spine_0[1-3]|clavicle_[lr])$/;

/**
 * How much of a limb's twist its twist bone takes (the private repository's family/body_rig.py adds them): the forearm's,
 * by the wrist, turns with this share of the hand's turn about the forearm, so a hand turned to hold something turns the
 * forearm along its length instead of wringing it at the wrist. The upper arm's, by the shoulder, could give back a share
 * of the arm's turn about itself; but every turn the poses give an upper arm is a swing (forward, out, and out in its own
 * plane), and the twist a run of swings adds up to is no turn of the arm about itself: given back, it would wring the
 * sleeve between the shoulder and the elbow for nothing, most of all with an arm straight up, where it comes to half a
 * turn one way or the other. So it follows its arm, until a pose turns one.
 */
export const TWIST = { upper: 0, fore: 0.5 };

const Y = new Vector3(0, 1, 0);

/** A twist bone that turns about its own length by `share` of how far `of` has turned about its own, from rest. */
function twisting(bone: Object3D, of: Object3D, share: number): void {
  const rest = bone.quaternion.clone(), back = of.quaternion.clone().invert(), turn = new Quaternion();
  bone.updateMatrix = function updateMatrix(this: Object3D) {
    // Its turn from rest in its own frame, and the part of it about its length: a twist, whatever its swing.
    turn.copy(back).multiply(of.quaternion);
    if (turn.w < 0) turn.set(-turn.x, -turn.y, -turn.z, -turn.w);
    const twist = 2 * Math.atan2(turn.y, turn.w);
    this.quaternion.copy(rest).multiply(turn.setFromAxisAngle(Y, share * twist));
    Object3D.prototype.updateMatrix.call(this);
  };
}

/** A corrective bone at a joint that turns half as far as `of`, from the same rest (as `halfOf`, a bone of the model's own). */
function halfway(bone: Object3D, of: Object3D): void {
  const rest = bone.quaternion.clone();
  bone.updateMatrix = function updateMatrix(this: Object3D) {
    this.quaternion.slerpQuaternions(rest, of.quaternion, 0.5);
    Object3D.prototype.updateMatrix.call(this);
  };
}

/**
 * The twist and corrective bones of a fuller skeleton, where a model has them (the private repository's
 * family/body_rig.py): each set as its matrix is made, every frame, from wherever the pose, a reach or a grip has left
 * the limb it follows. Each upper arm's twist bone gives back half of the arm's twist, each forearm's takes half of the
 * hand's, and each hip's corrective bone turns half as far as its thigh, so the hip's crease and the seat bend through
 * it as an elbow does through its half bone. A model without them is as it was. Call it once, at rest; returns how many
 * it found.
 */
export function followLimbs(model: Object3D): number {
  if (model.userData.followLimbs !== undefined) return 0;
  let found = 0;
  for (const tag of ['l', 'r']) {
    const pairs: [string, string, (bone: Object3D, of: Object3D) => void][] = [
      [`upperarm_twist_01_${tag}`, `upperarm_${tag}`, (bone, of) => twisting(bone, of, -TWIST.upper)],
      [`lowerarm_twist_01_${tag}`, `hand_${tag}`, (bone, of) => twisting(bone, of, TWIST.fore)],
      [`thigh_correctiveRoot_${tag}`, `thigh_${tag}`, halfway],
    ];
    for (const [name, ofName, follow] of pairs) {
      const bone = model.getObjectByName(name), of = model.getObjectByName(ofName);
      if (bone && of) { follow(bone, of); found++; }
    }
  }
  model.userData.followLimbs = found;
  return found;
}

/** Every skinned mesh of a model (or a piece of a wardrobe): its elbows and knees, its shoulders' corners, and a skirt
 * over the thighs (./skirts.ts). Run once a model's sleeves go with its arms (./sleeves.ts). */
export function bendSoftly(model: Object3D): void {
  const meshes: SkinnedMesh[] = [];
  model.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh); });
  for (const mesh of meshes) {
    halfJoints(mesh);
    // The skirt first: it takes only a top that is all trunk, and the shoulders' blend gives the top a half bone.
    skirtsOverThighs(mesh);
    softShoulders(mesh);
  }
}
