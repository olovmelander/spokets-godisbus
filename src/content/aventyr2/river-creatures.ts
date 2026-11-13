import { Group, Quaternion, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { Assets } from '../../render/assets';
import { creatureClips, type CreatureClips } from '../../render/creature-clips';

/**
 * Älven's beaver and otter, modelled, rigged and animated in Blender (art/blender/beaver.py, art/blender/otter.py;
 * aventyr2/beaver.glb and aventyr2/otter.glb), in the places their lives (./beaver.ts, ./otter.ts) move them.
 *
 * Each life puts an empty holder into the group it moves (`riggedHolder`); once the creature's GLB has come, a copy of it
 * with its own bones and clips goes into the holder (`installRiverCreatures`, one of the pack's model loaders), and the
 * life plays its clips from then on. Until then, and in a build without the file, the kit's old unrigged model (or the
 * otter built in code) stands where it always did, moved as it always was.
 *
 * Blender made them facing +x; a quarter turn in the holder faces them towards the camera (+z), as the old ones stood,
 * so that the lives turn them as they turned those. Their origins and sizes are the old ones' (`fit` as the kit's otter).
 */
export type RiverCreature = 'beaver' | 'otter';

/** How warm their fur glows of its own: the night's light comes from behind them, and dark fur would go black there. */
const WARMTH: Record<RiverCreature, readonly [colour: string, intensity: number]> = {
  beaver: ['#4a3020', 0.55],
  otter: ['#3c2818', 0.45],
};

/** An empty holder for the rigged creature in `parent`, which the shared models' install keeps (`keep`). */
export function riggedHolder(parent: Object3D, creature: RiverCreature, fit = 1): Group {
  const holder = new Group();
  holder.name = `${creature}-rig`;
  holder.userData.rigged = creature;
  holder.userData.keep = 0;
  holder.userData.rigFit = fit;
  parent.add(holder);
  return holder;
}

/** The rigged creature in a holder, once it has come. */
export function rigOf(holder: Object3D): CreatureClips | null {
  return (holder.userData.clips as CreatureClips | undefined) ?? null;
}

/** Puts a copy of the rigged creature from `model` into its holder. False if the model has no clips of it. */
export function attachRig(holder: Object3D, model: Object3D): boolean {
  const creature = holder.userData.rigged as RiverCreature;
  const clips = creatureClips(model, creature, { fade: 0.3 });
  if (!clips) return false;
  const turn = new Group();
  turn.name = `${creature}-turn`;
  turn.rotation.y = -Math.PI / 2;
  turn.scale.setScalar((holder.userData.rigFit as number | undefined) ?? 1);
  turn.add(clips.root);
  const [colour, intensity] = WARMTH[creature];
  clips.root.traverse((node) => {
    const mesh = node as Mesh;
    const material = mesh.material as MeshStandardMaterial | undefined;
    if (!mesh.isMesh || !material?.isMeshStandardMaterial) return;
    mesh.material = material.clone();
    (mesh.material as MeshStandardMaterial).emissive.set(colour);
    (mesh.material as MeshStandardMaterial).emissiveIntensity = intensity;
  });
  holder.add(turn);
  holder.userData.clips = clips;
  return true;
}

/** One of the pack's model loaders (../../render/extensions.ts `models`): the rigged ones into every holder waiting. */
export async function installRiverCreatures(assets: Assets, scene: Object3D): Promise<boolean> {
  const waiting: Object3D[] = [];
  scene.traverse((node) => { if (typeof node.userData.rigged === 'string' && !node.userData.clips) waiting.push(node); });
  if (waiting.length === 0) return false;
  const manifest = await assets.manifest();
  const files = new Map<string, Promise<Object3D | null>>();
  let arrived = false;
  for (const holder of waiting) {
    const file = holder.userData.rigged as RiverCreature;
    if (!manifest.packs.aventyr2?.files[`${file}.glb`]) continue;
    if (!files.has(file)) {
      files.set(file, assets.model('aventyr2', file).catch((error) => {
        console.warn(`The rigged ${file} could not be loaded; the old one stays.`, error);
        return null;
      }));
    }
    const model = await files.get(file)!;
    if (model && attachRig(holder, model)) arrived = true;
  }
  return arrived;
}

/** While the rigged one is there, only it is drawn in `group`: the old model and the stand-in wait hidden. */
export function showRigOnly(group: Object3D, holder: Object3D): void {
  for (const child of group.children) child.visible = child === holder;
}

const spin = new Quaternion();
const parentTurn = new Quaternion();
const UP = new Vector3(0, 1, 0);

/**
 * Turns a bone about the world's up by `angle`, on top of the pose its clips gave it this frame (call it after
 * `update`): a head turned to look at him. The mixer sets the bone again next frame.
 */
export function turnBone(bone: Object3D | undefined, angle: number): void {
  if (!bone?.parent || angle === 0) return;
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(parentTurn);
  spin.setFromAxisAngle(UP, angle);
  // In the parent's own frame: parent⁻¹ · turn · parent, before the bone's own turn.
  spin.premultiply(parentTurn.clone().invert()).multiply(parentTurn);
  bone.quaternion.premultiply(spin);
}

/** Nods a bone about its own sideways axis (x) by `angle`: a sniff, a look up. */
export function nodBone(bone: Object3D | undefined, angle: number): void {
  if (!bone || angle === 0) return;
  spin.setFromAxisAngle(new Vector3(1, 0, 0), angle);
  bone.quaternion.multiply(spin);
}

/** A look shared between the neck and the head: the head turns most. */
export function lookWith(clips: CreatureClips, angle: number): void {
  turnBone(clips.bone('neck'), angle * 0.4);
  turnBone(clips.bone('head'), angle * 0.6);
}
