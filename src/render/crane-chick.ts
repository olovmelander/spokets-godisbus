import { Group, type Object3D } from 'three';
import { creatureClips, type CreatureClips } from './creature-clips';

/**
 * The crane chick of Myren, modelled, rigged and animated in Blender (art/blender/crane-chick.py, boot/crane-chick.glb),
 * as it follows him. Where its GLB is missing, the chick built in code (./crane.ts craneChick, stepChick) walks instead.
 *
 * Its clips (crane-chick:<clip>): idle (it peeps, looks up at him, flaps its little wings, pecks), walk and run, each one
 * stride of both feet. A stride is scrubbed by how far it has gone, so that its feet do not slide: WALK_STRIDE EL a
 * stride walking, RUN_STRIDE running, as the kit builds them. It turns towards where it goes through facing the camera.
 */
export const WALK_STRIDE = 0.48;
export const RUN_STRIDE = 0.8;

export interface ChickRig {
  clips: CreatureClips;
  /** What turns it to face the way it goes; the chick stands in it. */
  turn: Group;
  /** Its strides so far, its speed in EL a second (eased), and the way it faces. */
  phase: number;
  speed: number;
  facing: number;
}

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/** A copy of the rigged chick, or null if the model has none. */
export function rigChick(model: Object3D): ChickRig | null {
  const clips = creatureClips(model, 'crane-chick', { fade: 0.3 });
  if (!clips || !clips.has('idle') || !clips.has('walk') || !clips.has('run')) return null;
  const turn = new Group();
  turn.add(clips.root);
  return { clips, turn, phase: 0, speed: 0, facing: 0 };
}

/** Its pose for a frame in which it has gone `moved` EL along x (to the left if negative). */
export function stepRiggedChick(rig: ChickRig, moved: number, dt: number, clock: number): void {
  const speed = dt > 0 ? Math.abs(moved) / dt : 0;
  rig.speed += (speed - rig.speed) * (1 - Math.exp(-8 * dt));
  if (Math.abs(moved) > 0.002) rig.facing = moved > 0 ? 0 : -Math.PI;
  rig.turn.rotation.y += (rig.facing - rig.turn.rotation.y) * (1 - Math.exp(-12 * dt));
  // Walking, then running as it hurries; its strides counted at the length of the gait it is in.
  const run = smooth((rig.speed - 1.6) / 1.4);
  rig.phase += Math.abs(moved) / (WALK_STRIDE + (RUN_STRIDE - WALK_STRIDE) * run);
  const moving = smooth(rig.speed / 0.35);
  rig.clips.scrub('idle', clock / rig.clips.duration('idle'), 1 - moving);
  rig.clips.scrub('walk', rig.phase, moving * (1 - run));
  rig.clips.scrub('run', rig.phase, moving * run);
  rig.clips.update(dt);
}
