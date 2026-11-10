import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three';

/** Elof's first linden figure: one silhouette and face in both adventures, before the private carving loads. */
export function littleCarving(silhouette = false): Group {
  const group = new Group();
  group.name = 'little-trägubbe';
  const wood = new MeshStandardMaterial({ color: silhouette ? '#4a4640' : '#e8d2a8', roughness: .95, flatShading: true,
    ...(silhouette ? { emissive: '#3a4260', emissiveIntensity: .7 } : {}) });
  const dark = new MeshStandardMaterial({ color: '#2c2420', roughness: .85 });
  const body = new Mesh(new CylinderGeometry(.102, .15, .27, 7), wood);
  body.position.y = .135;
  const head = new Mesh(new SphereGeometry(.13, 9, 7), wood);
  head.scale.set(1, 1, .94); head.position.y = .385;
  group.add(body, head);
  for (const side of [-1, 1]) {
    const arm = new Mesh(new SphereGeometry(1, 7, 5), wood);
    arm.scale.set(.05, .078, .048); arm.position.set(side * .135, .195, .03);
    group.add(arm);
    const eye = new Mesh(new SphereGeometry(.02, 8, 6), dark);
    eye.name = `little-eye:${side}`;
    eye.position.set(side * .051, side < 0 ? .405 : .412, .113);
    group.add(eye);
  }
  const mouth = new CatmullRomCurve3(Array.from({ length: 5 }, (_, i) => {
    const x = (i - 2) * .018;
    return new Vector3(x, .347 - .012 * (1 - ((i - 2) / 2) ** 2), .123);
  }));
  group.add(new Mesh(new TubeGeometry(mouth, 8, .0045, 4, false), dark));
  for (const [y, turn] of [[.08, .3], [.2, -.4]] as const) {
    const cut = new Mesh(new BoxGeometry(.15, .009, .009), new MeshStandardMaterial({ color: '#c9b07e', roughness: 1 }));
    cut.position.set(0, y, .132); cut.rotation.z = turn; group.add(cut);
  }
  if (!silhouette) {
    group.userData.model = 'lillgubbe';
    group.userData.disposeFallback = true;
  }
  return group;
}
