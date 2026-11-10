import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { holdCarving, type CarryingRig } from './carrying';

const UP = new Vector3(0, 1, 0);
/** The lace has one continuous path: Elof's hands, over the lip, and down around the old carving.
 * Afterwards the same line draws taut behind him as he drags the heavy wooden body along the rock.
 */
export function createNorrskenRescue() {
  const group = new Group(); group.name = 'rescue-lace';
  const material = new MeshStandardMaterial({ color: '#d65c45', roughness: .82 });
  const geometry = new CylinderGeometry(.026, .026, 1, 7);
  const pieces = Array.from({ length: 18 }, () => { const mesh = new Mesh(geometry, material); group.add(mesh); return mesh; });
  const hand = new Vector3(), target = new Vector3(), tip = new Vector3(), lip = new Vector3(), last = new Vector3(), point = new Vector3(), along = new Vector3(), heldAxis = new Vector3();
  const turn = new Quaternion();
  let draggedX: number | null = null;
  const rod = (i: number, a: Vector3, b: Vector3) => {
    const made = pieces[i]!; along.subVectors(b, a);
    made.position.copy(a).add(b).multiplyScalar(.5);
    made.scale.y = Math.max(.0001, along.length());
    made.quaternion.copy(turn.setFromUnitVectors(UP, along.normalize()));
    made.visible = true;
  };
  return {
    group,
    update(rig: CarryingRig, player: Group, carving: Group, flags: ReadonlySet<string>, lowering: number,
      pulling: boolean, clock: number, dt: number, calm: boolean, lifting = 0, feeding = false) {
      const lowered = flags.has('lower'), rescued = flags.has('placed:tragubbe');
      group.visible = lowered && !flags.has('taste') && !flags.has('home');
      if (!group.visible) return;
      for (const piece of pieces) piece.visible = false;
      draggedX ??= carving.position.x;
      const distance = player.position.x - draggedX;
      const hauling = rescued && flags.has('scene:uppdragen') && Math.abs(distance) > .9;
      if (rescued) {
        // He walks back to paint the eyes after picking the berry. The wood stays where he left it
        // while the line slackens, then follows once he has walked past it and pulled the line taut.
        const want = hauling ? player.position.x - Math.sign(distance) * .85 : draggedX;
        draggedX += (want - draggedX) * (calm ? 1 : -Math.expm1(-7 * dt));
        carving.position.set(draggedX, hauling ? .06 : .015, .12);
        // The lower corner scrapes the rock. Its weight trails each step, instead of hovering at hand height.
        carving.rotation.z = hauling ? -Math.sign(distance) * (.3 + (calm ? 0 : .035 * Math.sin(clock * 9))) : 0;
      }
      const grip = { kind: 'power' as const, size: .026 };
      // Elof's outer group faces +x (the imported model is turned inside it). In the crouch his
      // chest is lower too: a standing-height target would put the feeding hand over his head.
      target.set(hauling ? -.17 : .28, feeding ? .3 : hauling ? .46 : .53, .12);
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
      } else if (rig.grasp) rig.grasp(1, grip, target, along, hand);
      else { rig.reach(1, target); rig.hand(1, hand); rig.hold?.(1, grip); }
      if (!rescued) {
        // The second hand feeds the line while lowering, then closes behind the first for each heave.
        target.copy(hand).addScaledVector(along, pulling ? -.17 : -.11); target.z -= .05;
        if (rig.grasp) rig.grasp(0, grip, target, along, point);
        else { rig.reach(0, target); rig.hand(0, point); rig.hold?.(0, grip); }
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
    },
  };
}
