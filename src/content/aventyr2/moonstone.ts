import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import { granite } from '../../render/dressing/ground';

/** The meeting's wave-worn granite: one continuous skin, with a level strip for the exact walking surface. */
export function moonstone(width: number, top: number, water: number): Group {
  const group = new Group();
  group.name = 'moonstone';
  // Depth and height relative to the walking strip. Both ends disappear beneath the lake.
  const profile = [[-8, -1.8], [-6, -0.5], [-4, 1.0], [-2, 0.45], [-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0],
    [1.6, -0.1], [2.3, -0.3], [3.2, -0.65], [4.2, -1.2], [5.5, -1.9], [8, -2.7]] as const;
  const columns = Math.ceil(width * 3);
  const positions: number[] = [], colours: number[] = [], uv: number[] = [], indices: number[] = [];
  const rock = new Color('#929ba5'), pale = new Color('#c4c8c8'), wet = new Color('#293b49'), lichen = new Color('#8f9b81');
  const colour = new Color();
  for (const [z, dy] of profile) for (let i = 0; i <= columns; i++) {
    const x = -2 + (width + 4) * i / columns;
    const end = Math.max(0, -x, x - width) / 2;
    const offPath = Math.min(1, Math.max(0, Math.abs(z) - 1));
    const ripple = Math.sin(x * 0.47 + z * 0.36) * Math.sin(x * 0.19 - z * 0.54);
    // Broad, uneven shoulders break both the skyline and the wet edge. Relief stays clear of his feet.
    const relief = (Math.sin(x * 0.53 + z * 0.25) * 0.36 + Math.sin(x * 0.21 - z * 0.4) * 0.22 + ripple * 0.14) * offPath;
    const y = top + dy - 2.8 * end * end + relief;
    const depth = z + (Math.sin(x * 0.31) * 0.4 + Math.cos(x * 0.67) * 0.2) * offPath;
    positions.push(x, y, depth);
    uv.push(x * 0.55, depth * 0.55);
    colour.copy(rock).lerp(pale, 0.3 + 0.24 * Math.sin(x * 0.74 + z * 0.82));
    if (Math.abs(z) > 1.5) colour.lerp(lichen, Math.max(0, ripple - 0.1) * 0.7);
    colour.lerp(wet, Math.min(1, Math.max(0, (water + 0.28 - y) / 0.65)));
    colours.push(colour.r, colour.g, colour.b);
  }
  for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const stone = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, map: granite(), roughness: 0.9 }));
  stone.name = 'moonstone-surface';
  stone.receiveShadow = true;
  group.add(stone);

  // What lives on the rock, off the walking strip: grey-green lichen in rosettes, loose stones, and straw sedge in
  // its cracks, so that it reads as old rock and not as a smooth hill. Three draws.
  const heightAtRock = (x: number, z: number) => {
    let k = 0;
    while (k < profile.length - 2 && profile[k + 1]![0] < z) k++;
    const [z0, d0] = profile[k]!, [z1, d1] = profile[k + 1]!;
    const dy = d0 + (d1 - d0) * Math.min(1, Math.max(0, (z - z0) / (z1 - z0)));
    const end = Math.max(0, -x, x - width) / 2;
    const offPath = Math.min(1, Math.max(0, Math.abs(z) - 1));
    const ripple = Math.sin(x * 0.47 + z * 0.36) * Math.sin(x * 0.19 - z * 0.54);
    return top + dy - 2.8 * end * end + (Math.sin(x * 0.53 + z * 0.25) * 0.36 + Math.sin(x * 0.21 - z * 0.4) * 0.22 + ripple * 0.14) * offPath;
  };
  let seed = 7;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const spot = (front: number) => {
    const x = 0.6 + next() * (width - 1.2);
    const z = next() < front ? 1.4 + next() * 2.2 : -1.3 - next() ** 1.2 * 4.8;
    return { x, z, y: heightAtRock(x, z) };
  };
  const place = new Object3D(), tint = new Color();
  const lichens = new InstancedMesh(new SphereGeometry(1, 8, 3), new MeshStandardMaterial({ roughness: 1 }), Math.round(width * 7));
  const LICHEN = ['#8d9a7c', '#a9ad90', '#76846c', '#bdb89c', '#c9a85a'];
  for (let i = 0; i < lichens.count; i++) {
    const at = spot(0.3), wide = 0.08 + next() ** 1.8 * 0.3;
    if (at.y < water + 0.15) { place.scale.setScalar(0); place.updateMatrix(); lichens.setMatrixAt(i, place.matrix); continue; }
    place.position.set(at.x, at.y + 0.004, at.z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(wide * (0.8 + next() * 0.5), 0.014, wide * (0.8 + next() * 0.5));
    place.updateMatrix();
    lichens.setMatrixAt(i, place.matrix);
    lichens.setColorAt(i, tint.set(LICHEN[Math.floor(next() * LICHEN.length)]!).multiplyScalar(0.75 + next() * 0.35));
  }
  const loose = new InstancedMesh(new SphereGeometry(1, 7, 5), new MeshStandardMaterial({ roughness: 0.85, map: granite() }), Math.round(width * 1.4));
  for (let i = 0; i < loose.count; i++) {
    const at = spot(0.15), size = 0.07 + next() ** 2 * 0.22;
    place.position.set(at.x, at.y - size * 0.3, at.z);
    place.rotation.set(next() * 0.5, next() * 6.28, next() * 0.5);
    place.scale.set(size * (1 + next() * 0.6), size * (0.55 + next() * 0.3), size * (1 + next() * 0.4));
    place.updateMatrix();
    loose.setMatrixAt(i, place.matrix);
    loose.setColorAt(i, tint.set('#8e979f').multiplyScalar(0.75 + next() * 0.35));
  }
  const blades = new InstancedMesh(new ConeGeometry(0.5, 1, 3).translate(0, 0.5, 0), new MeshStandardMaterial({ roughness: 0.9 }), Math.round(width * 8));
  let b = 0;
  while (b < blades.count) {
    const at = spot(0.1);
    if (at.y < water + 0.2) continue;
    const tall = 0.25 + next() * 0.45;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && b < blades.count; k++, b++) {
      place.position.set(at.x + (next() - 0.5) * 0.16, at.y - 0.02, at.z + (next() - 0.5) * 0.14);
      place.rotation.set((next() - 0.5) * 0.8, next() * 6.28, (next() - 0.5) * 0.8);
      place.scale.set(0.03 + next() * 0.02, tall * (0.7 + next() * 0.5), 0.03);
      place.updateMatrix();
      blades.setMatrixAt(b, place.matrix);
      blades.setColorAt(b, tint.set(next() < 0.3 ? '#7f8a48' : '#c9b268').multiplyScalar(0.7 + next() * 0.35));
    }
  }
  for (const mesh of [lichens, loose, blades]) { mesh.computeBoundingSphere(); group.add(mesh); }
  // The lake lies in front of it and round it as everywhere in the narrow (../../render/water.ts, open water): it had
  // a dark plane of its own there, from when the river's water ended at the stone, which now showed through the lake.
  return group;
}
