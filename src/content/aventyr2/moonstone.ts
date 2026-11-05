import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
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

  // The river renderer joins narrow rocks only. This broad skerry also needs water in front of its footprint:
  // otherwise a tall phone looks underneath it at the dry lakebed and the bog's submerged vegetation.
  const lake = new Mesh(new PlaneGeometry(width, 96).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#1e3050', roughness: 0.24, metalness: 0.18 }));
  lake.name = 'moonstone-water';
  lake.position.set(width / 2, water - 0.015, 42.5);
  group.add(lake);
  return group;
}
