import type { BufferAttribute, InterleavedBufferAttribute, Object3D, SkinnedMesh } from 'three';

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
function partsOf(position: Attribute, index: ArrayLike<number> | null, count: number): Int32Array {
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
