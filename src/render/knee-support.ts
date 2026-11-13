import { Bone, Object3D, Ray, SkinnedMesh, Triangle, Vector3 } from 'three';
import { jointOf } from './sleeves';

/** A palm rests on the visible knee, not the joint inside it. Cache only nearby leg triangles when the rig is installed. */
export function kneeSupport(model: Object3D, knee: Object3D, side: 'l' | 'r', height: number): (out: Vector3) => Vector3 {
  const patches: { mesh: SkinnedMesh; bones: Bone[]; triangles: number[]; vertices: { index: number; at: Vector3 }[] }[] = [];
  // The knee's own half bone (./joints.ts) was bound in just before this, which leaves each mesh's attached bind inverse
  // as the mesh was exported, not as it now stands, scaled to its height: skinned now, every corner came out in the wrong
  // place, the knee's cap was never cached, and the hand went to the shin under it, through the knee (Olov, 13 November
  // 2026). Bring every matrix up to date first, as each frame below does.
  model.updateMatrixWorld(true);
  const center = knee.getWorldPosition(new Vector3()), at = new Vector3();
  // The knee's cap is weighted to that half bone, which bends the knee; a twist bone is its limb's too (./sleeves.ts).
  const names = new RegExp(`^(thigh|calf)_${side}$`), radius = height * .1;
  model.traverse(node => {
    if (!(node instanceof SkinnedMesh)) return;
    const skin = node.geometry.getAttribute('skinIndex'), weights = node.geometry.getAttribute('skinWeight');
    if (!skin || !weights) return;
    const rest = new Map<number, Vector3>(), triangle = new Triangle();
    for (let i = 0; i < skin.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (names.test(jointOf(node.skeleton.bones[skin.getComponent(i, j)]?.name ?? ''))) weight += weights.getComponent(i, j);
      if (weight < .8) continue;
      rest.set(i, node.getVertexPosition(i, new Vector3()).applyMatrix4(node.matrixWorld));
    }
    const index = node.geometry.index, triangles: number[] = [];
    for (let i = 0; i < (index?.count ?? skin.count); i += 3) {
      const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
      const p = rest.get(a), q = rest.get(b), r = rest.get(c);
      if (p && q && r && triangle.set(p, q, r).closestPointToPoint(center, at).distanceTo(center) < radius) triangles.push(a, b, c);
    }
    if (triangles.length) {
      const unique = [...new Set(triangles)], slots = new Map(unique.map((index, i) => [index, i]));
      const bones = new Set<Bone>();
      for (const index of unique) for (let j = 0; j < 4; j++) {
        if (weights.getComponent(index, j) > 0) {
          const bone = node.skeleton.bones[skin.getComponent(index, j)];
          if (bone) bones.add(bone);
        }
      }
      patches.push({ mesh: node, bones: [...bones], triangles: triangles.map(index => slots.get(index)!), vertices: unique.map(index => ({ index, at: new Vector3() })) });
    }
  });
  const ray = new Ray(new Vector3(), new Vector3(0, -1, 0)), hit = new Vector3(), nearby = new Vector3(), wanted = new Vector3(), triangle = new Triangle();
  return out => {
    knee.getWorldPosition(center);
    ray.origin.copy(center); ray.origin.y += height * .12;
    let highest = -Infinity, closest = Infinity;
    wanted.copy(center); wanted.y += height * .025;
    for (const { mesh, bones, triangles, vertices } of patches) {
      // Stage solves contacts before the renderer runs. Refresh every influencing joint and the mesh's attached
      // bind inverse here; getVertexPosition reads these current bone matrices directly, not skeleton.boneMatrices.
      for (const bone of bones) bone.updateWorldMatrix(true, false);
      mesh.updateWorldMatrix(true, false);
      mesh.updateMatrixWorld(true);
      for (const vertex of vertices) mesh.getVertexPosition(vertex.index, vertex.at).applyMatrix4(mesh.matrixWorld);
      for (let i = 0; i < triangles.length; i += 3) {
        const a = vertices[triangles[i]!]!.at, b = vertices[triangles[i + 1]!]!.at, c = vertices[triangles[i + 2]!]!.at;
        if (ray.intersectTriangle(a, b, c, false, hit) && hit.y > highest) highest = hit.y;
        triangle.set(a, b, c).closestPointToPoint(wanted, hit);
        const distance = hit.distanceToSquared(wanted);
        if (distance < closest) { closest = distance; nearby.copy(hit); }
      }
    }
    if (Number.isFinite(highest)) { out.copy(center); out.y = highest; return out; }
    // A splayed/rounded knee may put the joint just outside its visible cap. Use that nearby surface, not empty air.
    return out.copy(Number.isFinite(closest) ? nearby : wanted);
  };
}
