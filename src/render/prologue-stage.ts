import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D, Vector3 } from 'three';
import { prologuePose, type PrologueFrame, type PrologueLayout } from '../sim/prologue';

/** Simple rehearsal shapes, never substitutes for the family's approved Blender models. */
export function createPrologueStage(layout: PrologueLayout | undefined) {
  const group = new Group();
  if (!layout) return { group, update(_frame: PrologueFrame | null | undefined, _flags: ReadonlySet<string>) {} };
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
  const wood = '#d2b98c', skin = '#e7bd96', shirt = '#3e4445', trousers = '#77816a';
  function person(cap: boolean) {
    const root = new Group();
    root.add(boxes([
      [0, 3.45, 0, 1.3, 1.8, 0.7, shirt], [0, 4.75, 0, 0.8, 0.85, 0.75, skin],
      [-0.38, 1.3, 0, 0.48, 2.45, 0.58, trousers], [0.38, 1.3, 0, 0.48, 2.45, 0.58, trousers],
      [0.35, 0.13, 0.12, 0.58, 0.26, 0.95, '#62503d'], [-0.35, 0.13, 0.12, 0.58, 0.26, 0.95, '#62503d'],
      ...(cap ? [[0, 5.23, 0.14, 0.94, 0.18, 1, shirt] as Box] : [[0.42, 4.33, 0, 0.2, 1.5, 0.3, '#6a4634'] as Box]),
    ]));
    return root;
  }
  const mamma = person(false), pappa = person(true);
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
    group.add(mamma, pappa, hand, arm, seam);
  }
  return {
    group,
    update(frame: PrologueFrame | null | undefined, flags: ReadonlySet<string>) {
      if (!layout) return;
      mamma.visible = frame?.kind === 'mamma';
      pappa.visible = flags.has('star');
      hand.visible = arm.visible = frame?.kind === 'pappa';
      seam.visible = flags.has('bag:torn');
      seam.position.set(layout.doorway.x + 0.08, layout.doorway.y + 1.48, 0.05);
      if (frame?.kind === 'mamma') {
        mamma.position.set(layout.doorway.x - 1.4 + frame.seconds * 1.15, layout.doorway.y, -1.15);
        mamma.rotation.y = -0.5;
      }
      pappa.position.set(layout.railing.x + 1.9, layout.railing.y - 2.2, -1.35);
      const t = frame?.kind === 'pappa' ? frame.seconds : 3;
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
      }
    },
  };
}
