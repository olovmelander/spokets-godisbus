import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { holdCarving, type CarryingRig } from './carrying';
import type { Pose } from './rig';

const UP = new Vector3(0, 1, 0);
const smooth = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/** Dra upp (the scene `hissa`, norrsken-scenes.ts): the three heaves, from its cue to the lip. */
const HEAVE = { from: .4, each: .65, count: 3 };

/**
 * How hard he heaves at this moment of `hissa`, from 0 to 1: three heaves, while the mover brings the trägubbe up the
 * crack in one go. Calm (reduced motion): one steady pull.
 */
export function heaveAt(seconds: number, calm = false): number {
  const k = (seconds - HEAVE.from) / HEAVE.each;
  if (k <= 0 || k >= HEAVE.count) return 0;
  return calm ? .6 : Math.sin(Math.PI * (k % 1)) ** 2;
}

/** When the ghost has the lace's end in `hissa`, from 0 to 1: it waddles up behind him and takes it. */
export function ghostHoldAt(seconds: number): number {
  return smooth((seconds - .3) / .25);
}

/** The shoulder gives up the rope over the same interval as the real grip. */
export function rescueCarryPose(pose: Pose, weight: number): void {
  pose.lean -= .13 * weight; pose.twist -= .12 * weight;
  pose.armR += (.22 - pose.armR) * weight; pose.elbowR += (.8 - pose.elbowR) * weight;
}
/** Pieces of the lace's end, from his back hand to the ghost, while they heave together. */
const TAIL = 6;

/** Dra upp, for the picture: how hard he heaves, and where the ghost is and how far it has the lace's end. */
export interface Haul { heave: number; ghost: Vector3 | null; hold: number }

/** The lace has one continuous path: Elof's hands, over the lip, and down around the old carving.
 * Afterwards the same line draws taut behind him as he drags the heavy wooden body along the rock.
 * While they pull it up, its end goes back from his hands to the ghost, which heaves behind him.
 */
export function createNorrskenRescue() {
  const group = new Group(); group.name = 'rescue-lace';
  const material = new MeshStandardMaterial({ color: '#d65c45', roughness: .82 });
  const geometry = new CylinderGeometry(.026, .026, 1, 7);
  // Eight from his hands to the lip, one down to the trägubbe, nine round it, and six back to the ghost (`TAIL`).
  const pieces = Array.from({ length: 18 + TAIL }, () => { const mesh = new Mesh(geometry, material); group.add(mesh); return mesh; });
  const hand = new Vector3(), target = new Vector3(), tip = new Vector3(), lip = new Vector3(), last = new Vector3(), point = new Vector3(), along = new Vector3(), heldAxis = new Vector3();
  const rear = new Vector3(), end = new Vector3(), loose = new Vector3();
  const turn = new Quaternion();
  let lastX: number | null = null;
  let haul = 0;
  const releasedAt = new Vector3(), releasedAxis = new Vector3();
  let hadContact = false;
  const rod = (i: number, a: Vector3, b: Vector3) => {
    const made = pieces[i]!; along.subVectors(b, a);
    made.position.copy(a).add(b).multiplyScalar(.5);
    made.scale.y = Math.max(.0001, along.length());
    made.quaternion.copy(turn.setFromUnitVectors(UP, along.normalize()));
    made.visible = true;
  };
  return {
    group,
    /** How taut the line is now, from 0 (the trägubbe lies still behind him) to 1 (he drags it along). */
    get hauling() { return haul; },
    /** Scene time freezes with reading and Pause. A restored taste has no old grip to bring back. */
    weight(flags: ReadonlySet<string>, tasteSeconds?: number, calm = false): number {
      if (!flags.has('lower') || flags.has('home')) return 0;
      if (!flags.has('taste')) return 1;
      return hadContact && tasteSeconds !== undefined && !calm ? 1 - smooth(tasteSeconds / .45) : 0;
    },
    update(rig: CarryingRig, player: Group, carving: Group, flags: ReadonlySet<string>, lowering: number,
      pulling: boolean, clock: number, dt: number, calm: boolean, lifting = 0, feeding = false, releaseWeight = 0,
      up: Haul = { heave: 0, ghost: null, hold: 0 }) {
      const lowered = flags.has('lower'), rescued = flags.has('placed:tragubbe');
      group.visible = lowered && !flags.has('taste') && !flags.has('home');
      const grip = { kind: 'power' as const, size: .026 };
      if (!group.visible) {
        // Keep the last actual socket while the right hand opens. Recomputing the hauling target here would
        // jump it forward when the wood settles. Store it in his frame so growing does not stretch the releasing
        // arm back to a point beside his former tiny body. The scene owns the carving and rope visibility.
        if (flags.has('taste') && hadContact && releaseWeight > 0) {
          player.localToWorld(target.copy(releasedAt));
          along.copy(releasedAxis).transformDirection(player.matrixWorld);
          if (rig.grasp) rig.grasp(1, grip, target, along, hand, releaseWeight);
          else { rig.reach(1, target, releaseWeight); rig.hold?.(1, grip, releaseWeight); }
        } else hadContact = false;
        return;
      }
      for (const piece of pieces) piece.visible = false;
      // Where it lies is the simulation's (its mover is towed, Mover.tow): the spots for its eyes and its candy
      // go with it, and a game taken up again finds it at his heels.
      const distance = player.position.x - carving.position.x;
      const moved = lastX === null ? 0 : Math.abs(carving.position.x - lastX) / Math.max(dt, 1e-3);
      lastX = carving.position.x;
      // Taut while he walks it along; at rest, a step behind him, it lies still and upright.
      haul += ((rescued && flags.has('scene:uppdragen') && Math.abs(distance) > .95 && moved > .2 ? 1 : 0) - haul) * (calm ? 1 : -Math.expm1(-9 * dt));
      const hauling = haul > .5;
      if (rescued) {
        carving.position.set(carving.position.x, .015 + .045 * haul, .12);
        // The lower corner scrapes the rock. Its weight trails each step, instead of hovering at hand height.
        carving.rotation.z = -Math.sign(distance) * haul * (.3 + (calm ? 0 : .035 * Math.sin(clock * 9)));
      }
      // Elof's outer group faces +x (the imported model is turned inside it). In the crouch his
      // chest is lower too: a standing-height target would put the feeding hand over his head.
      target.set(hauling ? -.17 : .28, feeding ? .3 : hauling ? .46 : .53, .12);
      // Each heave draws both hands back towards his chest, the lace with them.
      if (!rescued) { target.x -= .15 * up.heave; target.y -= .03 * up.heave; }
      player.localToWorld(target);
      lip.set(rescued ? carving.position.x : 12.4, rescued ? .39 : .1, .16);
      along.subVectors(lip, target).normalize();
      if (lifting > 0) {
        target.set(.32, .49, .12); player.localToWorld(target);
        holdCarving(rig, 1, target, UP, .39, .13, point, heldAxis, lifting);
        carving.position.lerp(point, lifting);
        carving.rotation.z *= 1 - lifting;
        // A second hand braces the wood: he can just lift it, before its weight makes him set it down.
        target.copy(carving.position); target.z -= .16; target.y += .4;
        rig.reach(0, target, lifting); rig.hold?.(0, { kind: 'power', size: .13 }, lifting);
        rig.hand(1, hand);
      } else if (rig.grasp) rig.grasp(1, grip, target, along, hand, 1, heldAxis);
      else { rig.reach(1, target); rig.hand(1, hand); rig.hold?.(1, grip); heldAxis.copy(along); }
      if (lifting === 0) {
        player.worldToLocal(releasedAt.copy(hand));
        releasedAxis.copy(heldAxis).applyQuaternion(player.getWorldQuaternion(turn).invert());
        hadContact = true;
      }
      if (!rescued) {
        // The second hand feeds the line while lowering, then closes behind the first for each heave.
        target.copy(hand).addScaledVector(along, pulling ? -.17 : -.11); target.z -= .05;
        if (rig.grasp) rig.grasp(0, grip, target, along, point);
        else { rig.reach(0, target); rig.hand(0, point); rig.hold?.(0, grip); }
        rear.copy(point);
      }
      tip.copy(carving.position); tip.y += .38; tip.z += .1;
      if (rescued) lip.copy(tip);
      const k = Math.max(0, Math.min(1, lowering));
      tip.lerp(lip, 1 - k);
      last.copy(hand);
      // A little sag while the line is being fed; the heave pulls it straight.
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        point.copy(hand).lerp(lip, t);
        point.y -= Math.sin(Math.PI * t) * (pulling || hauling ? .025 : .11);
        rod(i - 1, last, point); last.copy(point);
      }
      if (!rescued) rod(8, lip, tip);
      // The visible loop encloses the wooden waist, never just its floating interaction ring.
      if (k > .98) for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, b = (i + 1) / 9 * Math.PI * 2;
        last.set(tip.x + Math.cos(a) * .19, tip.y, tip.z + Math.sin(a) * .14);
        point.set(tip.x + Math.cos(b) * .19, tip.y, tip.z + Math.sin(b) * .14);
        rod(i + 9, last, point);
      }
      // Dra upp: the lace's end, back from his hands to the ghost behind him. It picks it up from the rock where it
      // lay, and holds it to its front; the line goes taut with each heave.
      if (!rescued && up.ghost && up.hold > 0) {
        const side = Math.sign(rear.x - up.ghost.x) || 1;
        end.set(up.ghost.x + side * .26, up.ghost.y + .42, up.ghost.z + .08);
        loose.set(rear.x - side * .5, .02, rear.z).lerp(end, up.hold);
        last.copy(rear);
        for (let i = 1; i <= TAIL; i++) {
          const t = i / TAIL;
          point.copy(rear).lerp(loose, t);
          point.y -= Math.sin(Math.PI * t) * (.03 + .09 * (1 - up.heave)) * up.hold;
          rod(17 + i, last, point); last.copy(point);
        }
      }
    },
  };
}
