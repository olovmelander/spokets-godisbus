import { AdditiveBlending, BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, SphereGeometry } from 'three';
import { sweetSocket } from './candy';

type Box = [x: number, y: number, z: number, wide: number, high: number, deep: number, colour: string];

/** Plain boxes in their colours, as one instanced mesh with a shape and a material of its own. */
function boxes(rows: Box[]): InstancedMesh {
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), rows.length);
  const matrix = new Matrix4(), shape = new Object3D();
  for (const [i, [x, y, z, sx, sy, sz, colour]] of rows.entries()) {
    shape.position.set(x, y, z); shape.scale.set(sx, sy, sz); shape.updateMatrix();
    mesh.setMatrixAt(i, matrix.copy(shape.matrix)); mesh.setColorAt(i, new Color(colour));
  }
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Elof's striped Saturday bag, visibly distinct from the ghost's small carved pocket. The bag modelled in
 * Blender (art/blender/candy.py: striped paper, pinked at its top, with sweets looking out) takes the place
 * of the one built here from boxes, once the candy kit has arrived. Its tear is a part of its own, shown
 * when the story says so.
 */
export function saturdayBag(): Group {
  const group = new Group();
  group.name = 'saturday-bag';
  const parts: Box[] = [
    [0, .28, 0, .42, .56, .3, '#efdfbd'],
    [0, .59, 0, .45, .08, .32, '#bd986e'],
  ];
  for (const z of [-.155, .155]) for (const y of [.14, .29, .44]) {
    parts.push([0, y, z, .425, .055, .016, '#5379a3']);
  }
  group.add(sweetSocket(new Group().add(boxes(parts)), { shape: 'lordagspase', paper: true }));
  const tear = sweetSocket(new Group().add(boxes([[0, 0, 0, .11, .085, .02, '#725441']])), { shape: 'reva', paper: true });
  tear.position.set(.11, .21, .167);
  tear.name = 'saturday-bag-tear';
  tear.visible = false;
  group.add(tear);
  // The magic in the bag (plan §3.3 rule 3): when the ghost took it, two sweets began to glitter, and the gold
  // one glints at its mouth all through the chase. A soft glow, never a sweet of its own.
  const glow = new Mesh(new SphereGeometry(0.13, 12, 8), new MeshBasicMaterial({ color: '#ffd774', transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }));
  glow.name = 'saturday-bag-glow';
  glow.position.set(0, 0.6, 0);
  glow.visible = false;
  group.add(glow);
  return group;
}
