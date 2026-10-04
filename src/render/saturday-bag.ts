import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D } from 'three';

/** Elof's striped Saturday bag, visibly distinct from the ghost's small carved pocket. */
export function saturdayBag(): Group {
  const group = new Group();
  group.name = 'saturday-bag';
  const parts: [number, number, number, number, number, number, string][] = [
    [0, .28, 0, .42, .56, .3, '#efdfbd'],
    [0, .59, 0, .45, .08, .32, '#bd986e'],
  ];
  for (const z of [-.155, .155]) for (const y of [.14, .29, .44]) {
    parts.push([0, y, z, .425, .055, .016, '#5379a3']);
  }
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshLambertMaterial();
  const matrix = new Matrix4(), shape = new Object3D();
  const boxes = (rows: typeof parts) => {
    const mesh = new InstancedMesh(geometry, material, rows.length);
    for (const [i, [x, y, z, sx, sy, sz, colour]] of rows.entries()) {
      shape.position.set(x, y, z); shape.scale.set(sx, sy, sz); shape.updateMatrix();
      mesh.setMatrixAt(i, matrix.copy(shape.matrix)); mesh.setColorAt(i, new Color(colour));
    }
    mesh.computeBoundingSphere();
    return mesh;
  };
  group.add(boxes(parts));
  const tear = boxes([[.11, .21, .167, .11, .085, .02, '#725441']]);
  tear.name = 'saturday-bag-tear';
  tear.visible = false;
  group.add(tear);
  return group;
}
