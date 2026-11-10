import { CircleGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry, Vector3 } from 'three';
import { BARK_UP, barkDetail, barky } from './bark-detail';
import { KIT } from './dressing/kit';

function wood(tint = '#bba183') {
  // The forest's base bark remains visible on Low too. Keep our own material so its tint and shader
  // cannot change the surrounding trees; the chapter owns the shared texture.
  const material = new MeshStandardMaterial({ map: KIT?.bark.map ?? null, color: tint, roughness: .95 });
  barkDetail(material);
  return material;
}

function barkCylinder(top: number, bottom: number, height: number, sides: number, rows = 1): CylinderGeometry {
  const geometry = new CylinderGeometry(top, bottom, height, sides, rows);
  const uv = geometry.getAttribute('uv');
  // Match the forest's grain size: one tile spans about 2.1 EL around a trunk and 6 EL upwards.
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * (top + bottom) / 2.1, uv.getY(i) * height / 6);
  return geometry;
}

function branch(from: Vector3, to: Vector3, radius: number, material: MeshStandardMaterial): Mesh {
  const delta = to.clone().sub(from);
  // UV grain follows the branch even while Elof pulls it out of the hollow.
  const mesh = new Mesh(barkCylinder(radius * .7, radius, delta.length(), 10), material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

/** A forked storm branch spans the entrance; its cut ends and red loop read against the dark hollow. */
export function owlTwig(): Group {
  const group = new Group(), bark = wood('#d3b28c'); group.name = 'owl-blocking-branch';
  group.add(branch(new Vector3(-.9, .12, .22), new Vector3(.9, .38, .22), .105, bark));
  group.add(branch(new Vector3(.25, .28, .22), new Vector3(.65, .5, .23), .055, bark));
  group.add(branch(new Vector3(-.35, .2, .22), new Vector3(-.1, .02, .25), .045, bark));
  const end = new Mesh(new CircleGeometry(.1, 12), new MeshStandardMaterial({ color: '#d6bd86', roughness: .9 }));
  end.position.set(-.89, .12, .29); group.add(end);
  for (const part of group.children) part.position.z += .78;
  return group;
}

/** A real hollow behind the owl: the branch visibly bars its only opening. */
export function owlHollow(): Group {
  const group = new Group(); group.name = 'owl-nest-hollow'; group.position.set(72.6, 0, 0);
  const bark = wood();
  const trunk = new Mesh(barky(barkCylinder(1.08, 1.4, 8, 16, 16), BARK_UP), bark); trunk.position.set(0, 4, -1.35);
  const dark = new Mesh(new CircleGeometry(1.02, 28), new MeshStandardMaterial({ color: '#201c17', roughness: 1 }));
  dark.scale.y = 1.55; dark.position.set(0, 4.15, .08);
  const rimShape = barky(new TorusGeometry(1.03, .13, 8, 28), BARK_UP);
  const rimPositions = rimShape.getAttribute('position'), rimUV = rimShape.getAttribute('uv');
  // Bark grows upwards around the opening, instead of wrapping its grain around the torus.
  for (let i = 0; i < rimUV.count; i++) rimUV.setXY(i, rimPositions.getX(i) / 2.1, (rimPositions.getY(i) * 1.55 + 4.15) / 6);
  const rim = new Mesh(rimShape, bark); rim.scale.y = 1.55; rim.position.copy(dark.position); rim.position.z += .02;
  const positions = trunk.geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const ripple = 1 + .045 * Math.sin(y * 1.7 + Math.atan2(z, x) * 3);
    positions.setXYZ(i, x * ripple, y, z * ripple);
  }
  trunk.geometry.computeVertexNormals();
  group.add(trunk, dark, rim);
  group.add(branch(new Vector3(-.7, 6.2, -.8), new Vector3(-1.65, 6.8, -.6), .2, bark));
  group.add(branch(new Vector3(.8, 6.9, -.9), new Vector3(1.6, 7.5, -.6), .18, bark));
  return group;
}
