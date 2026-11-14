import { BufferGeometry, Float32BufferAttribute, Matrix3, Vector3, type InstancedMesh, type Mesh, type Object3D } from 'three';
import type { Assets } from '../../assets';

/**
 * Pappa's hidden carvings as they are whittled in Blender (art/blender/carvings.py, `boot/carvings`; Olov, 14 November
 * 2026: "den lilla kaninen ... behöver modelleras och designas bättre"): the hare, the bird and the nisse, each one
 * piece of pale wood cut into a few hundred flat facets, with its grain, its darker cuts and what the burning iron left
 * (eyes, a nose, the hollow of an ear) painted on its corners, standing on a plinth of the same wood.
 *
 * Each is first drawn with the shape built in code (./shapes.ts `CARVINGS`), in the same instanced mesh; the kit's shape
 * takes its place when it arrives, before the view's first frames (`installCarvings`). A figure is still one draw call,
 * and costs nothing where it is not in the picture.
 */

/** The figures the kit may hold, by the name each mesh carries (`carving`). */
export const CARVING_KINDS = ['bird', 'hare', 'nisse'] as const;
export type CarvingKind = (typeof CARVING_KINDS)[number];

/**
 * Reads the kit from its loaded model: one mesh a figure, which says on itself which it is. The pack step stores a
 * model's corners as small whole numbers with the scale on its node, so each is taken out as it stands in the kit's
 * space: its feet on the origin, facing +x.
 */
export function carvingKit(model: Object3D): Map<CarvingKind, BufferGeometry> {
  model.updateMatrixWorld(true);
  const kit = new Map<CarvingKind, BufferGeometry>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    const kind = mesh.userData?.carving as CarvingKind | undefined;
    if (!mesh.isMesh || !kind || !CARVING_KINDS.includes(kind) || kit.has(kind)) return;
    const from = mesh.geometry;
    const position = from.getAttribute('position');
    const normal = from.getAttribute('normal');
    const colour = from.getAttribute('color');
    if (!position || !normal || !colour) return;
    const count = position.count;
    const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
    const at = new Vector3();
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      at.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
      at.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, i * 3);
      colours.set([colour.getX(i), colour.getY(i), colour.getZ(i)], i * 3);
    }
    const made = new BufferGeometry();
    made.setAttribute('position', new Float32BufferAttribute(positions, 3));
    made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    made.setAttribute('color', new Float32BufferAttribute(colours, 3));
    made.setIndex(from.index ? Array.from(from.index.array) : Array.from({ length: count }, (_, i) => i));
    kit.set(kind, made);
  });
  return kit;
}

/**
 * Puts the kit's figures in the place of the ones built in code, in every carving in the scene (a mesh that says which
 * it is, `userData.carvingKit`), before the first frames. Without the file, or if it fails, they keep theirs.
 */
export async function installCarvings(assets: Assets, scene: Object3D): Promise<boolean> {
  const wanting: InstancedMesh[] = [];
  scene.traverse((object) => {
    if ((object as InstancedMesh).isInstancedMesh && typeof object.userData.carvingKit === 'string' && !object.userData.carvingKitted) wanting.push(object as InstancedMesh);
  });
  if (wanting.length === 0) return false;
  const manifest = await assets.manifest();
  if (!manifest.packs.boot?.files['carvings.glb']) return false;
  const model = await assets.model('boot', 'carvings').catch((error) => {
    console.warn('The carvings could not be loaded; their shapes built in code stay.', error);
    return null;
  });
  if (!model) return false;
  const kit = carvingKit(model);
  let arrived = false;
  for (const mesh of wanting) {
    const shape = kit.get(mesh.userData.carvingKit as CarvingKind);
    if (!shape) continue;
    // Each mesh its own copy of the shape: a view that is thrown away disposes its own.
    const before = mesh.geometry;
    mesh.geometry = shape.clone();
    before.dispose();
    mesh.userData.carvingKitted = true;
    arrived = true;
  }
  return arrived;
}
