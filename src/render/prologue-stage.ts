import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D, Vector3 } from 'three';
import { prologuePose, type PrologueFrame, type PrologueLayout } from '../sim/prologue';
import { createFamilyRehearsal } from './family-rehearsal';

/** Simple rehearsal shapes, never substitutes for the family's approved Blender models. */
export function createPrologueStage(layout: PrologueLayout | undefined) {
  const group = new Group();
  group.name = 'prologue-family';
  if (!layout) return { group, replace(_who: string, _model: Object3D) {}, update(_frame: PrologueFrame | null | undefined, _flags: ReadonlySet<string>, _player?: { x: number; y: number; tall: number }) {} };
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshLambertMaterial();
  const matrix = new Matrix4();
  const shape = new Object3D();
  type Box = [number, number, number, number, number, number, string];
  function boxes(parts: Box[]): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, parts.length);
    for (const [i, [x, y, z, sx, sy, sz, colour]] of parts.entries()) {
      shape.position.set(x, y, z); shape.scale.set(sx, sy, sz); shape.updateMatrix();
      mesh.setMatrixAt(i, matrix.copy(shape.matrix)); mesh.setColorAt(i, new Color(colour));
    }
    mesh.computeBoundingSphere();
    return mesh;
  }
  const wood = '#d2b98c', skin = '#e7bd96', shirt = '#3e4445';
  const mamma = createFamilyRehearsal('mamma'), pappa = createFamilyRehearsal('pappa');
  const moa = createFamilyRehearsal('moa'), bertil = createFamilyRehearsal('bertil');
  const relatives: Record<string, Group> = { mamma, pappa, moa, bertil };
  for (const [who, actor] of Object.entries(relatives)) actor.name = `prologue-${who}`;
  // These share the existing rehearsal body. Their approved models replace these shapes when available.
  const hand = boxes([[0, 0, 0, 0.85, 0.28, 0.55, skin]]);
  const arm = boxes([[0, 0, 0, 1, 1, 1, shirt]]);
  const seam = boxes([[0, 0, 0, 0.06, 0.3, 0.15, '#6e3d29']]);
  const shoulder = new Vector3(), target = new Vector3(), up = new Vector3(0, 1, 0);
  if (layout) {
    // An open doorway and its visible hinge; the trail's original indices and locations stay intact.
    group.add(boxes([
      [layout.doorway.x, 2.8, -1.1, 0.22, 5.6, 0.25, wood],
      [layout.doorway.x, 5.6, 0, 0.22, 0.2, 2.45, wood],
      [layout.doorway.x, 1.5, -0.08, 0.25, 0.38, 0.27, '#7b745d'],
      [layout.railing.x, layout.railing.y - 0.1, -0.15, 6.2, 0.2, 0.45, wood],
      [layout.railing.x - 2.8, 3.45, -0.25, 0.18, 2.1, 0.22, wood],
      [layout.railing.x + 2.8, 3.45, -0.25, 0.18, 2.1, 0.22, wood],
    ]));
    group.add(mamma, pappa, moa, bertil, hand, arm, seam);
  }
  return {
    group,
    replace(who: string, model: Object3D) {
      const actor = relatives[who];
      if (!actor) return;
      actor.clear();
      model.scale.setScalar(3);
      model.rotation.y = Math.PI / 2;
      actor.add(model);
    },
    update(frame: PrologueFrame | null | undefined, flags: ReadonlySet<string>, player = { x: 0, y: 0, tall: 3 }) {
      if (!layout) return;
      const opening = !flags.has('blink');
      const deck = player.x >= 36;
      mamma.visible = opening || deck || frame?.kind === 'mamma';
      pappa.visible = opening || deck;
      moa.visible = bertil.visible = opening || deck;
      hand.visible = arm.visible = frame?.kind === 'pappa' || (deck && flags.has('star') && !flags.has('pappa:done'));
      seam.visible = flags.has('bag:torn');
      seam.position.set(layout.doorway.x + 0.08, layout.doorway.y + 1.48, 0.05);
      mamma.position.set(deck ? 40.0 : -1.7, deck ? -.8 : 0, -1.25);
      pappa.position.set(deck ? 41.9 : 2.3, deck ? -.8 : 0, -1.1);
      moa.position.set(deck ? 38.5 : -3.0, deck ? -.8 : 0, -.75);
      bertil.position.set(deck ? 39.2 : -.45, deck ? -.8 : 0, -.55);
      mamma.rotation.y = deck ? -.3 : .25;
      moa.rotation.y = bertil.rotation.y = deck ? -.3 : .2;
      // The same adult remains beside him through the change of scale, then crouches towards him.
      pappa.scale.set(1, deck && flags.has('star') && frame?.kind !== 'pappa' ? .74 : 1, 1);
      if (frame?.kind === 'mamma') {
        mamma.position.set(layout.doorway.x - 1.4 + frame.seconds * 1.15, layout.doorway.y, -1.15);
        mamma.rotation.y = -0.5;
      }
      const t = frame?.kind === 'pappa' ? frame.seconds : 3;
      if (frame?.kind === 'pappa' || flags.has('pappa:done')) {
        const approach = Math.min(1, t / .45);
        pappa.position.set(41.9 + (layout.railing.x + 1.9 - 41.9) * approach,
          -.8 + (layout.railing.y - 1.4) * approach, -1.1);
      }
      // Watch the toy, turn towards Elof, then find the railing empty.
      pappa.rotation.y = t < 1.55 ? -0.65 : t < 2.7 ? -1.5 : -0.65;
      if (frame?.kind === 'pappa') {
        const pose = prologuePose(layout, frame);
        hand.position.set(pose.x + 0.1, pose.y - 0.1, 0.1);
        shoulder.set(pappa.position.x - 0.55, pappa.position.y + 3.7, pappa.position.z);
        target.copy(hand.position).sub(shoulder);
        arm.position.copy(shoulder).addScaledVector(target, 0.5);
        arm.scale.set(0.32, target.length(), 0.32);
        arm.quaternion.setFromUnitVectors(up, target.normalize());
        hand.visible = arm.visible = t < 1.65;
      } else if (hand.visible) {
        hand.position.set(player.x - .2, player.y + player.tall + .35, .12);
        shoulder.set(pappa.position.x - .55, pappa.position.y + 3.7 * .74, pappa.position.z);
        target.copy(hand.position).sub(shoulder);
        arm.position.copy(shoulder).addScaledVector(target, .5);
        arm.scale.set(.32, target.length(), .32);
        arm.quaternion.setFromUnitVectors(up, target.normalize());
      }
    },
  };
}
