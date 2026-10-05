import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D } from 'three';
import type { PrologueLayout } from '../sim/prologue';

/**
 * The prologue's set pieces: the open doorway with the hinge that tears the bag, the tear's mark on it, and the
 * deck's railing along its far side, that Pappa puts the frozen ghost on. Plain shapes: the house is Olov's to model (HANDOVER.md).
 * The family who act in front of them are the stage's (./stage.ts).
 */
export function createPrologueStage(layout: PrologueLayout | undefined, ground: (x: number) => number = () => 0) {
  const group = new Group();
  group.name = 'prologue-set';
  if (!layout) return { group, update(_flags: ReadonlySet<string>) {} };
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
  const wood = '#d2b98c';
  const weathered = '#b39a74';
  const deck = ground(layout.railing.x);
  const post = layout.railing.y - deck;
  const parts: Box[] = [
    // An open doorway and its visible hinge.
    [layout.doorway.x, 2.8, -1.1, 0.22, 5.6, 0.25, wood],
    [layout.doorway.x, 5.6, 0, 0.22, 0.2, 2.45, wood],
    [layout.doorway.x, 1.5, -0.08, 0.25, 0.38, 0.27, '#7b745d'],
  ];
  const rail = layout.rail;
  if (rail) {
    // The deck's railing along its far side, at a grown-up's waist: posts, a top rail and a lower one, with the
    // garden beyond it. Its top is where Pappa puts the frozen ghost.
    const long = rail.to - rail.from;
    const posts = Math.max(2, Math.round(long / 2.2) + 1);
    for (let i = 0; i < posts; i++) parts.push([rail.from + (long * i) / (posts - 1), deck + post / 2, rail.z, 0.2, post, 0.2, weathered]);
    parts.push([(rail.from + rail.to) / 2, layout.railing.y - 0.08, rail.z, long + 0.3, 0.16, 0.34, wood]);
    parts.push([(rail.from + rail.to) / 2, deck + post * 0.45, rail.z, long, 0.1, 0.12, weathered]);
  } else {
    // The older railing: a short one behind the planks he walks on, with a post at each end.
    parts.push(
      [layout.railing.x, layout.railing.y - 0.1, -0.15, 6.2, 0.2, 0.45, wood],
      [layout.railing.x - 2.8, deck + post / 2, -0.25, 0.18, post, 0.22, wood],
      [layout.railing.x + 2.8, deck + post / 2, -0.25, 0.18, post, 0.22, wood],
    );
  }
  group.add(boxes(parts));
  const seam = boxes([[0, 0, 0, 0.06, 0.3, 0.15, '#6e3d29']]);
  seam.position.set(layout.doorway.x + 0.08, layout.doorway.y + 1.48, 0.05);
  group.add(seam);
  return {
    group,
    update(flags: ReadonlySet<string>) {
      seam.visible = flags.has('bag:torn');
    },
  };
}
