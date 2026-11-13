import { Group, Matrix4, Vector3, type InstancedMesh, type Object3D } from 'three';
import type { Assets } from './assets';
import { creatureClips, creatureClipsOf, type CreatureClips } from './creature-clips';
import { drawnWhile } from './idle';
import { installSharedModels } from './shared-models';

/**
 * The tawny owl, modelled, rigged and animated in Blender (art/blender/owl.py, boot/owl.glb): the story's owl in Äventyr 2
 * (../content/aventyr2/owl-moments.ts plays its moments) and the owls that sit on branches at dusk in the near forest
 * (./lift/fauna.ts).
 *
 * Its clips (owl:<clip>): perch, trapped, freed, takeoff, fly, glide, land, carry. It faces +x in its own space with its
 * feet at its origin, OWL_TALL high sitting; flying, its bone `saddle` is the place on its back where he sits.
 *
 * Where the owl is drawn, the scene has a holder for it: a group whose `userData.owl` says what it is for ('perched':
 * the owl that sits and flies; 'flying': the one that carries him; 'spare': a shape that stood in for one of those in
 * flight, which the rigged owl does not need). `installOwls` puts a copy of the rigged owl in each holder, in the place
 * of what was built in code, and keeps it as `userData.owlRig`. Where the file is missing, the kit's older owl comes
 * instead (art/blender/a2-creatures.py: `userData.owlStatic` names its parts), and the code that moves the owl moves that.
 */

/** How tall it is, sitting, in EL. */
export const OWL_TALL = 2.45;
/** Its clips, by their own names. */
export const OWL_CLIPS = ['perch', 'trapped', 'freed', 'takeoff', 'fly', 'glide', 'land', 'carry'] as const;
export type OwlClip = (typeof OWL_CLIPS)[number];
/** The turn of its holder's model that faces it to the camera: its +x to +z. */
export const FACING_CAMERA = -Math.PI / 2;

export interface OwlRig {
  clips: CreatureClips;
  /** What turns, mirrors and moves the owl within its holder; the model hangs in it. */
  turn: Group;
}

/** A copy of the rigged owl, or null if the model has none with all its clips. */
export function rigOwl(model: Object3D): OwlRig | null {
  const clips = creatureClips(model, 'owl', { fade: 0.2 });
  if (!clips || !OWL_CLIPS.every((name) => clips.has(name))) return null;
  const turn = new Group();
  turn.name = 'owl-rig';
  turn.add(clips.root);
  return { clips, turn };
}

/** The rigged owl in a holder, once it has come. */
export function owlRigOf(holder: Object3D | null | undefined): OwlRig | undefined {
  return holder?.userData.owlRig as OwlRig | undefined;
}

const inverse = new Matrix4();

/** Where one of its bones is, in the space of the holder the rig is in, as it is posed now. */
export function owlBone(rig: OwlRig, name: string, out: Vector3): Vector3 {
  const bone = rig.clips.bone(name);
  const holder = rig.turn.parent;
  if (!bone || !holder) return out.set(0, 0, 0);
  holder.updateWorldMatrix(true, false);
  rig.turn.updateMatrixWorld(true);
  return out.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inverse.copy(holder.matrixWorld).invert());
}

const seat = new Vector3();

/** Moves the owl in its holder so that the place on its back where he sits is at `at`, in the holder's space. */
export function seatOwlAt(rig: OwlRig, at: Vector3): void {
  owlBone(rig, 'saddle', seat);
  rig.turn.position.add(at).sub(seat);
}

/**
 * Puts the rigged owl in every holder of the scene, and gives the near forest's owls theirs. Where its file is missing,
 * the holders get the kit's older owl. True if anything arrived.
 */
export async function installOwls(assets: Assets, scene: Object3D): Promise<boolean> {
  const holders: Object3D[] = [];
  const crowds: InstancedMesh[] = [];
  scene.traverse((node) => {
    if (typeof node.userData.owl === 'string' && !node.userData.owlTried) holders.push(node);
    if ((node as InstancedMesh).isInstancedMesh && node.name === 'fauna-owls' && !node.userData.owlRigs) crowds.push(node as InstancedMesh);
  });
  if (holders.length === 0 && crowds.length === 0) return false;
  const manifest = await assets.manifest();
  const model = manifest.packs.boot?.files['owl.glb']
    ? await assets.model('boot', 'owl').catch((error) => {
      console.warn('The owl could not be loaded; the older one stays.', error);
      return null;
    })
    : null;
  const rigged = model && creatureClipsOf(model, 'owl').length > 0 ? model : null;
  let arrived = false;
  for (const holder of holders) {
    holder.userData.owlTried = true;
    const rig = rigged && holder.userData.owl !== 'spare' ? rigOwl(rigged) : null;
    if (rigged) {
      // What was built in code goes; a spare stands empty, as the rigged owl flies itself.
      holder.clear();
      if (rig) {
        holder.add(rig.turn);
        holder.userData.owlRig = rig;
      }
      arrived = true;
      continue;
    }
    holder.traverse((node) => {
      if (typeof node.userData.owlStatic === 'string') node.userData.model = node.userData.owlStatic;
    });
    if (await installSharedModels(assets, holder)) arrived = true;
  }
  for (const mesh of crowds) {
    if (!rigged || !mesh.parent) continue;
    const rigs: OwlRig[] = [];
    for (let i = 0; i < mesh.count; i++) {
      const rig = rigOwl(rigged);
      if (!rig) break;
      drawnWhile(rig.turn, false);
      mesh.parent.add(rig.turn);
      rigs.push(rig);
    }
    if (rigs.length === mesh.count) {
      mesh.userData.owlRigs = rigs;
      arrived = true;
    } else for (const rig of rigs) rig.turn.removeFromParent();
  }
  return arrived;
}
