import { InstancedMesh, Matrix4, Mesh, Vector3, type BufferAttribute, type Object3D } from 'three';

interface BakedShade {
  original: Float32Array;
  shaded: Float32Array;
  active: boolean;
}

/** Changes only the existing colour buffer: no extra draw, material variant or retained GPU buffer. */
export function setBakedShade(object: Object3D, enabled: boolean): void {
  const bake = object.userData.shadowBake as BakedShade | undefined;
  if (!(object instanceof Mesh) || !bake || bake.active === enabled) return;
  const colour = object.geometry.getAttribute('color') as BufferAttribute;
  colour.array.set(enabled ? bake.shaded : bake.original);
  colour.needsUpdate = true;
  bake.active = enabled;
}

/**
 * Low and Mid's soft trunk shadows, sampled once on the actual bank, including its slopes and cut faces.
 * The same instance transforms cast into High's map. Reading them after scatter avoids a second random
 * sequence; restocking the forest kit keeps these trunk transforms, including the vittra door's spruce.
 */
export function bakeForestShadows(ground: Object3D, standing: Object3D, sun: readonly [number, number, number]): void {
  const sources: { inverse: Matrix4; direction: Vector3; profile: [number, number][] }[] = [];
  const matrix = new Matrix4();
  const light = new Vector3(...sun).normalize();
  standing.updateWorldMatrix(true, true);
  standing.traverse((mesh) => {
    if (!(mesh instanceof InstancedMesh) || mesh.userData.casts !== true) return;
    // The lathed trunk's own taper and roots, so the bake does not invent a wider second tree.
    const radii = new Map<number, number>();
    const at = mesh.geometry.getAttribute('position');
    for (let i = 0; i < at.count; i++) {
      const y = at.getY(i);
      radii.set(y, Math.max(radii.get(y) ?? 0, Math.hypot(at.getX(i), at.getZ(i))));
    }
    const profile = [...radii].sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const inverse = matrix.clone().premultiply(mesh.matrixWorld).invert();
      sources.push({ inverse, direction: light.clone().transformDirection(inverse), profile });
    }
  });
  if (!sources.length) return;

  const world = new Vector3(), local = new Vector3();
  ground.updateWorldMatrix(true, true);
  ground.traverse((mesh) => {
    if (!(mesh instanceof Mesh)) return;
    const colour = mesh.geometry.getAttribute('color') as BufferAttribute | undefined;
    if (!colour) return;
    const at = mesh.geometry.getAttribute('position');
    const original = new Float32Array(colour.array);
    const shaded = original.slice();
    for (let i = 0; i < at.count; i++) {
      world.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
      let shade = 0;
      for (const { inverse, direction: d, profile } of sources) {
        local.copy(world).applyMatrix4(inverse);
        if (d.y <= 0) continue;
        const near = Math.max(0, (profile[0]![0] - local.y) / d.y);
        const far = (profile.at(-1)![0] - local.y) / d.y;
        if (far < near) continue;
        // Closest approach to the tilted trunk's axis, bounded by its foot and top and the ray's origin.
        const t = Math.max(near, Math.min(far, -(local.x * d.x + local.z * d.z) / (d.x * d.x + d.z * d.z)));
        const y = local.y + t * d.y;
        let row = 1;
        while (row < profile.length - 1 && profile[row]![0] < y) row++;
        const [bottom, r0] = profile[row - 1]!, [top, r1] = profile[row]!;
        const radius = r0 + (r1 - r0) * (y - bottom) / (top - bottom);
        const distance = Math.hypot(local.x + t * d.x, local.z + t * d.z);
        const soft = .3 + t * .01;
        const edge = Math.max(0, Math.min(1, (distance - radius + soft) / (soft * 2)));
        // Overlapping trees share one shade instead of multiplying darkness. High removes direct sun
        // only, so this gentle bake leaves most of the sky/fill contribution in the painted ground.
        shade = Math.max(shade, 1 - edge * edge * (3 - 2 * edge));
      }
      for (let c = 0; c < 3; c++) shaded[i * 3 + c] *= 1 - .3 * shade;
    }
    mesh.userData.shadowBake = { original, shaded, active: false } satisfies BakedShade;
  });
}
