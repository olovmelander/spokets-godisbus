import { BoxGeometry, Color, Group, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';

export type FamilyRole = 'mamma' | 'pappa' | 'moa' | 'bertil';

// Geometry can be shared across chapters. Materials belong to each actor: a view patches them with
// its own place-grade uniforms, so sharing a material across views would patch its shader twice.
const geometry = new BoxGeometry(1, 1, 1);

const roles: Record<FamilyRole, { top: string; cap: boolean; scale: number }> = {
  mamma: { top: '#829887', cap: false, scale: 1 },
  pappa: { top: '#3e4445', cap: true, scale: 1 },
  moa: { top: '#758dab', cap: false, scale: .77 },
  bertil: { top: '#baa061', cap: true, scale: .6 },
};
type Part = [x: number, y: number, z: number, width: number, height: number, depth: number, colour: string];

/**
 * Readable rehearsal figure, never a likeness or a substitute for an approved character model.
 * Feet are at the group's origin (y=0), the face points along +z, and role size is baked into its
 * instances so a caller can freely pose or replace the root. Heights are about 5.2 EL for adults,
 * 4 EL for Moa and 3.1 EL for Bertil. One mesh and one draw call per figure, with shared geometry.
 */
export function createFamilyRehearsal(who: FamilyRole): Group {
  const role = roles[who];
  const skin = '#e7bd96', trousers = '#77816a', shoe = '#62503d', hair = '#6a4634';
  const parts: Part[] = [
    [0, 3.45, 0, 1.3, 1.8, .7, role.top],
    [0, 4.75, 0, .8, .85, .75, skin],
    [-.38, 1.3, 0, .48, 2.45, .58, trousers],
    [.38, 1.3, 0, .48, 2.45, .58, trousers],
    [-.35, .13, .12, .58, .26, .95, shoe],
    [.35, .13, .12, .58, .26, .95, shoe],
    // A simple silhouette and two front-facing marks make the call's speaker readable at a distance.
    [-.79, 3.3, 0, .27, 1.65, .38, role.top],
    [.79, 3.3, 0, .27, 1.65, .38, role.top],
    [-.79, 2.4, .02, .25, .28, .36, skin],
    [.79, 2.4, .02, .25, .28, .36, skin],
    [-.15, 4.84, .384, .055, .07, .03, '#3e3831'],
    [.15, 4.84, .384, .055, .07, .03, '#3e3831'],
    ...(role.cap
      ? [[0, 5.23, .14, .94, .18, 1, '#3e4445'] as Part]
      : [[.42, 4.33, 0, .2, 1.5, .3, hair] as Part]),
  ];
  const mesh = new InstancedMesh(geometry, new MeshLambertMaterial(), parts.length);
  mesh.name = `family-rehearsal-body:${who}`;
  const shape = new Object3D();
  const colour = new Color();
  for (const [index, [x, y, z, width, height, depth, hex]] of parts.entries()) {
    shape.position.set(x * role.scale, y * role.scale, z * role.scale);
    shape.scale.set(width * role.scale, height * role.scale, depth * role.scale);
    shape.updateMatrix();
    mesh.setMatrixAt(index, shape.matrix);
    mesh.setColorAt(index, colour.set(hex));
  }
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  const group = new Group();
  group.name = `family-rehearsal:${who}`;
  group.userData.familyRole = who;
  group.userData.rehearsal = true;
  group.add(mesh);
  return group;
}
