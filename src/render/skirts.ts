import { Matrix4, Vector3, type SkinnedMesh } from 'three';
import { partsOf, pushOf, weightsOf, withBone, writeWeights } from './sleeves';

/**
 * A skirt that lies over the thighs (Olov, 9 November 2026: the family's models "even better when they move").
 *
 * Moa's skirt is the lower part of her top, and like every top it went only with the pelvis: as she knelt, her thigh
 * came forward through the front of it, and in a stride her knee came through its hem. The raincoats' skirts go a
 * little with each leg (the private repository's family/wardrobe.py, `skirt`), but the half they give is not enough over
 * a thigh brought up level: the hem, a hand in front of the hip, must go nine tenths of the way with it to stay over it.
 * So every part of a top that hangs below the hip joints and has no leg in it goes with the thighs by as much as it
 * hangs below the hips (none at the hips, all of `SHARE` from a third of a thigh's length down), and only at the front,
 * where the cloth lies on the thighs as they come up; the middle goes with both, half each, so the front never splits
 * between the legs. And it goes with a thigh only as it comes forward: a bone at each hip swings forward with its thigh
 * and never back (`pushOf`), as a thigh pushes a skirt out and never pulls it in, so a leg swung back in a stride leaves
 * the front hanging instead of drawing it back between the legs. The back hangs from the hips. A top that ends at the
 * hips is all but unchanged.
 */

/** How much of the thighs a skirt's corner goes with, at most. */
export const SHARE = 0.9;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Lets the parts of a top that hang below the hips go a little with the thighs, as above: returns how many corners changed. */
export function skirtsOverThighs(mesh: SkinnedMesh): number {
  const g = mesh.geometry;
  if (g.userData.skirtsOverThighs !== undefined) return 0;
  g.userData.skirtsOverThighs = 0;
  const position = g.getAttribute('position'), skinIndex = g.getAttribute('skinIndex'), skinWeight = g.getAttribute('skinWeight');
  const bones = mesh.skeleton?.bones;
  if (!position || !skinIndex || !skinWeight || !bones) return 0;
  const named = (name: string) => bones.findIndex((bone) => bone.name === name);
  const pelvis = named('pelvis'), thighs = [named('thigh_l'), named('thigh_r')], calf = named('calf_l');
  if (pelvis < 0 || thighs.some((t) => t < 0) || calf < 0) return 0;
  // In the pelvis's frame at rest: the corners, the hip joints and a knee, and the body's up and forward there.
  const inverses = mesh.skeleton.boneInverses;
  const toPelvis = new Matrix4().multiplyMatrices(inverses[pelvis]!, mesh.bindMatrix);
  const joint = (bone: number) => new Vector3().setFromMatrixPosition(new Matrix4().multiplyMatrices(inverses[pelvis]!, inverses[bone]!.clone().invert()));
  const hips = thighs.map(joint), knee = joint(calf);
  const up = new Vector3(0, 1, 0).transformDirection(toPelvis), forward = new Vector3(0, 0, 1).transformDirection(toPelvis);
  const across = hips[0]!.clone().sub(hips[1]!), middle = hips[0]!.clone().add(hips[1]!).multiplyScalar(0.5);
  const width = across.length() / 2;
  across.normalize();
  const thigh = hips[0]!.distanceTo(knee);
  const count = position.count;
  // The trunk: the pelvis and the spine (not a leg, an arm or the head). The parts that are all trunk and hang below the hips.
  const trunk = bones.map((bone) => /^(pelvis|spine_0[12])$/.test(bone.name));
  const parts = partsOf(position, g.index ? g.index.array : null, count);
  const mixed = new Set<number>();
  const v = new Vector3(), off = new Vector3();
  const local = new Float32Array(count * 3);
  let below = false;
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) if (skinWeight.getComponent(i, k) > 0 && !trunk[skinIndex.getComponent(i, k)]) mixed.add(parts[i]!);
    v.fromBufferAttribute(position, i).applyMatrix4(toPelvis).toArray(local, i * 3);
    if (v.clone().sub(middle).dot(up) < 0) below = true;
  }
  if (!below) return 0;
  let changed = 0, pushes: number[] | null = null;
  for (let i = 0; i < count; i++) {
    if (mixed.has(parts[i]!)) continue;
    v.fromArray(local, i * 3);
    off.copy(v).sub(middle);
    const depth = -off.dot(up);
    if (depth <= 0) continue;
    const side = off.dot(across);
    off.addScaledVector(up, depth);                       // level with the hips: which way round the body it lies
    const front = off.lengthSq() > 1e-12 ? off.normalize().dot(forward) : 0;
    const share = SHARE * smooth(0, 0.35 * thigh, depth) * smooth(-0.2, 0.6, front);
    if (share < 0.005) continue;
    // The trunk's weights give up the share; the thigh on this side takes it, and across the middle both, half each.
    const left = smooth(-width, width, side);
    // Not the thighs themselves: the bones at the hips that go forward with them and never back (./sleeves.ts, pushOf).
    pushes ??= thighs.map((thigh) => withBone(mesh, pushOf(bones[thigh]!), thigh));
    const put = weightsOf(mesh, i).map(([bone, w]) => [bone, w * (1 - share)] as [number, number]);
    put.push([pushes[0]!, share * left], [pushes[1]!, share * (1 - left)]);
    writeWeights(mesh, i, put);
    changed++;
  }
  if (changed > 0) { skinIndex.needsUpdate = true; skinWeight.needsUpdate = true; }
  g.userData.skirtsOverThighs = changed;
  return changed;
}
