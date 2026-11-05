import { Box3, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, type Object3D } from 'three';
import type { ChapterData } from '../sim/types';
import { heightAt, landscape } from './dressing/kit';
import { granite } from './dressing/ground';

/** Authored scenery, shared with Stormnatten's model library. None of these objects is a platform or a clue. */
interface Planting {
  model: string;
  x: number;
  z: number;
  size: number;
  turn?: number;
  /** The land behind a pool, or below a distant tree, does not follow its playable pit. */
  y?: number;
}

const at = (model: string, x: number, z: number, size = 1, turn = 0, y?: number): Planting => ({ model, x, z, size, turn, y });

/**
 * Broad silhouettes establish each place, with smaller things beside its route. Trees are behind the existing
 * garden buildings' view gaps; reeds stay behind the bog's stepping stones, and the summit stays open around
 * the old pine and the rescue. Placement is deliberately sparse: each loaded shape is shared by its copies.
 */
export const OUTDOOR_MODELS: Readonly<Record<string, readonly Planting[]>> = {
  garden: [
    at('bjork-a', 73, -23, 0.78, 0.4), at('bjork-b', 153, -21, 0.7, -0.7),
    at('bjork-a', 184, -29, 0.82, 1.1), at('gran-b', 194, -19, 0.64, -0.4), at('gran-c', 208, -25, 0.92, 0.9),
    at('tunna', 72, -4.8), at('kanna', 77, -3.8, 1.25, -0.25), at('kruka', 114, -3.8, 0.85, 0.3),
    at('stubbe-sagad', 157, -4.5, 1.15, -0.3), at('gren-b', 196, -3.9, 0.75, 0.1), at('block-d', 201, -5.1, 0.9, 0.7),
    at('snigel', 70, -2.8, 0.65, -0.2), at('igelkott', 159, -3.5, 0.65, -0.2),
  ],
  granskog: [
    // The modelled crowns belong to the distant stand: the old close trunks keep their clear light shafts.
    at('gran-a', 8, -42, 0.65, 0.3), at('gran-b', 53, -52, 0.64, -0.6),
    at('gran-c', 99, -43, 0.68, 0.8), at('gran-a', 146, -46, 0.66, -0.8), at('bjork-b', 201, -42, 0.58, -0.2),
    at('lag-mossig', 30, -5.6, 0.5, -0.15), at('block-b', 42, -5.5, 0.7, 0.4),
    at('gren-a', 71, -4.2, 0.65, 0.2), at('lag-mossig', 116, -5.3, 0.62, -0.1),
    at('block-d', 151, -4.5, 0.85, 0.6), at('vass-a', 160, -5.2, 0.5, 0.4, -8.6),
    at('vass-b', 174, -5.8, 0.45, -0.5, -8.6), at('lag-mossig', 193, -6.2, 0.6, 0.25),
  ],
  myren: [
    // Their roots disappear below the floodwater, beyond the playable islands.
    at('bjork-b', 4, -27, 0.55, 0.7, -1.6), at('tall-a', 86, -29, 0.56, -0.4, -1.6),
    at('tall-a', 127, -32, 0.48, 0.8, -1.6), at('gran-c', 194, -29, 0.65, 0.2, -1.6),
    at('vass-a', 17, -5.8, 0.5, 0.3, -0.6), at('vass-b', 43, -6.1, 0.52, -0.6, -0.6),
    at('vass-a', 58, -6.4, 0.6, 0.8, -0.6), at('vass-b', 76, -6.3, 0.5, 1.2, -0.6),
    at('vass-a', 108, -5.7, 0.55, 0.4, -0.6), at('vass-b', 135, -7.2, 0.5, -0.7, -0.6),
    at('vass-a', 154, -6.2, 0.52, 0.8, -0.6), at('vass-b', 166, -7.5, 0.55, -0.2, -0.6),
    at('block-b', 65, -6.4, 0.65, 0.4, -0.2), at('lag-mossig', 105, -6.9, 0.65, -0.2, -0.25),
    at('block-d', 142, -7.1, 0.65, 0.5), at('lag-mossig', 190, -7.4, 0.58, 0.15, 0),
    at('groda', 137, -3.3, 0.75, -0.3), at('and', 45, -5.1, 0.8, 0.3, -0.6), at('and-hona', 47.3, -6, 0.8, -0.1, -0.6),
  ],
  berget: [
    // The tree line stays below the crane's flight and below the mountain shoulder.
    at('gran-b', 40, -35, 0.56, 0.4, -16), at('tall-a', 57, -30, 0.48, -0.8, -14),
    at('block-a', 74, -6.2, 0.72, 0.5), at('block-d', 83, -4.3, 0.65, -0.7),
    at('block-c', 95, -8.3, 0.7, 0.6), at('block-b', 141, -8, 0.88, -0.4),
    at('gren-b', 143, -4.6, 0.75, 0.2),
  ],
  norrsken: [
    // Nothing tall stands between the northern lights, the old pine and the family.
    at('block-d', 2.5, -5.5, 0.55, -0.7), at('block-a', 30, -8, 0.65, 0.6),
    at('lag-mossig', 51, -7.2, 0.58, 0.2), at('tall-a', 65, -26, 0.46, -0.5),
  ],
  byn: [
    // The yard is on the far side of the street; the shop windows and bicycle remain unobstructed.
    at('bjork-a', 44, -25, 0.72, 0.6, 1), at('bjork-b', 58, -29, 0.62, -0.7, 1),
    at('kruka', 7.5, -4.5, 0.82, 0.2, 2), at('kruka', 116, -4.9, 1.05, -0.3, 3.3),
  ],
};

/** A restrained fallback while the library loads, or when a removable pack is unavailable. */
function standIn(name: string): Group {
  const group = new Group();
  const wood = new MeshStandardMaterial({ color: '#695444', roughness: 0.96 });
  const stone = new MeshStandardMaterial({ color: '#939589', roughness: 1, flatShading: true });
  const tree = /^(gran|bjork|tall)-/.test(name);
  if (/^(snigel|igelkott|groda|and|and-hona)$/.test(name)) {
    // The detailed creature replaces this small, rounded silhouette. Its eyes are turned towards the path.
    const body = new Mesh(new SphereGeometry(0.55, 10, 7), new MeshStandardMaterial({ color: name === 'groda' ? '#71844c' : '#8a7454', roughness: 0.9 }));
    body.scale.set(1.5, 0.65, 0.9);
    body.position.y = 0.36;
    group.add(body);
    const head = new Mesh(new SphereGeometry(0.26, 8, 6), wood);
    head.position.set(0.65, name.startsWith('and') ? 0.85 : 0.32, 0);
    group.add(head);
    if (name === 'snigel') {
      const shell = new Mesh(new SphereGeometry(0.48, 10, 7), new MeshStandardMaterial({ color: '#ad865b', roughness: 0.85 }));
      shell.scale.set(0.8, 1, 0.6);
      shell.position.set(-0.12, 0.6, 0);
      group.add(shell);
    }
  } else if (tree) {
    const birch = name.startsWith('bjork');
    if (birch) wood.color.set('#d8d2bf');
    const trunk = new Mesh(new CylinderGeometry(0.32, 0.95, 60, 7), wood);
    trunk.position.y = 29.5;
    group.add(trunk);
    const foliage = new MeshStandardMaterial({ color: birch ? '#a6a44f' : '#3b5540', roughness: 1, flatShading: true });
    for (const [y, size] of [[26, 9], [39, 7], [49, 4.5]] as const) {
      const crown = new Mesh(birch ? new SphereGeometry(size, 7, 5) : new ConeGeometry(size, 21, 8), foliage);
      crown.position.set(birch ? Math.sin(y) * 2 : 0, y, 0);
      group.add(crown);
    }
  } else if (name.startsWith('vass')) {
    const reed = new MeshStandardMaterial({ color: '#9d9e5b', roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const stem = new Mesh(new CylinderGeometry(0.04, 0.08, 5 + i * 0.25, 5), reed);
      stem.position.set((i - 1.5) * 0.32, 2.5 + i * 0.125, Math.sin(i) * 0.4);
      stem.rotation.z = (i - 1.5) * 0.06;
      group.add(stem);
    }
  } else if (name.startsWith('block')) {
    const rock = new Mesh(new SphereGeometry(1, 8, 5), stone);
    rock.scale.set(name === 'block-d' ? 1 : 2.2, name === 'block-d' ? 0.9 : 1.6, name === 'block-d' ? 0.65 : 1.5);
    rock.position.y = rock.scale.y * 0.68;
    group.add(rock);
  } else {
    const long = name === 'lag-mossig' ? 14 : name.startsWith('gren') ? 5 : 1.3;
    const radius = name === 'lag-mossig' ? 0.7 : name.startsWith('gren') ? 0.2 : 0.65;
    const log = new Mesh(new CylinderGeometry(radius * 0.8, radius, long, 9), wood);
    if (long > 2) log.rotation.z = Math.PI / 2;
    log.position.y = long > 2 ? radius : long / 2;
    group.add(log);
  }
  return group;
}

/** Model names are resolved by the renderer's shared installer, never by loading Äventyr 2's chapter pack. */
export function outdoorModels(chapter: ChapterData): Group {
  const group = new Group();
  group.name = 'outdoor-models';
  const land = landscape(chapter);
  for (const item of OUTDOOR_MODELS[chapter.id] ?? []) {
    const holder = standIn(item.model);
    holder.name = `outdoor:${item.model}:${item.x}`;
    holder.userData.model = item.model;
    holder.userData.disposeFallback = true;
    holder.position.set(item.x, item.y ?? heightAt(land, item.x), item.z);
    holder.rotation.y = item.turn ?? 0;
    holder.scale.setScalar(item.size);
    if (/^(snigel|igelkott|groda|and|and-hona)$/.test(item.model)) holder.userData.outdoorLife = { y: holder.position.y, size: item.size, phase: item.x * 1.7, water: item.model.startsWith('and') };
    group.add(holder);
  }
  return group;
}

/** Small breaths and ripples, with no wandering across the trail; reduced motion always restores the resting pose. */
export function updateOutdoorModels(group: Group, clock: number, still: boolean): void {
  for (const holder of group.children) {
    const life = holder.userData.outdoorLife as { y: number; size: number; phase: number; water: boolean } | undefined;
    if (!life) continue;
    const breath = still ? 0 : Math.sin(clock * (life.water ? 1.5 : 1.8) + life.phase);
    holder.position.y = life.y + (life.water ? breath * 0.035 : 0);
    holder.scale.y = life.size * (1 + (life.water ? 0 : breath * 0.025));
  }
}

/** One weathered stone surface joins the exact boot line to irregular shoulders buried in the lawn. */
function walkingStone(width: number, high: number): Mesh {
  const shape = new BufferGeometry();
  const points: number[] = [];
  const colours: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const tint = new Color();
  const stone = new Color('#969b95');
  const lichen = new Color('#a2a76b');
  // Only the narrow central walking line is level. Beyond it the same mesh rolls down both faces,
  // with uneven shoulders instead of a separate horizontal rim or a dark joint above the core.
  const rows = [
    [-3.3, -0.12], [-3.1, 0.3], [-2.5, 0.9], [-1.7, 1.23], [-0.95, 1.4],
    [-0.44, 1.34], [-0.2, 1.3], [0.2, 1.3], [0.57, 1.23], [1.05, 0.87],
    [1.18, 0.37], [0.82, -0.12],
  ];
  // The ends bulge at mid-height, then curl in at the ground instead of flaring like a ramp.
  const columns = [[-0.3, 0], [-0.67, 0.48], [-0.43, 0.84],
    ...Array.from({ length: 17 }, (_, i) => [width * i / 16, 1]),
    [width + 0.4, 0.82], [width + 0.65, 0.48], [width + 0.26, 0]];
  const distance = columns.map(() => 0);
  for (let r = 0; r < rows.length; r++) {
    const [depth, elevation] = rows[r]!;
    const walking = r === 6 || r === 7;
    const buried = r === 0 || r === rows.length - 1;
    for (let c = 0; c < columns.length; c++) {
      const [x, flank] = columns[c]!;
      const end = flank === 0;
      const worn = Math.sin(x! * 1.85 + r * 0.53) * 0.095 + Math.sin(x! * 3.8 - r * 0.6) * 0.045;
      const y = buried || end ? -0.12 : (elevation! / 1.3 * high - (walking ? 0 : worn)) * flank!;
      const bulge = Math.sin(Math.max(0, Math.min(1, x! / width)) * Math.PI) * 0.38;
      const z = depth! + (walking ? 0 : Math.sin(x! * 1.65 + r * 0.31) * 0.24 + Math.sin(x! * 3.3 + r) * 0.08 + (r > 7 ? bulge : -bulge * 0.25));
      const px = x! + (flank! < 1 ? Math.sin(r * 0.7 + c) * 0.12 : 0);
      if (r > 0) {
        const previous = ((r - 1) * columns.length + c) * 3;
        distance[c]! += Math.hypot(y - points[previous + 1]!, z - points[previous + 2]!);
      }
      points.push(px, y, z);
      // Unwrap by distance over the curved face, so the same mineral grain continues over each shoulder.
      uv.push(px * 0.65, distance[c]! * 0.65);
      const patch = Math.max(0, Math.sin(x! * 2.8 + z * 1.2) * Math.sin(x! * 0.9 - z * 2.1));
      tint.copy(stone).lerp(lichen, patch * (y > high * 0.65 ? 0.27 : 0.1));
      tint.multiplyScalar(0.94 + (worn + 0.08) * 0.6);
      colours.push(tint.r, tint.g, tint.b);
      if (r < rows.length - 1 && c < columns.length - 1) {
        const a = r * columns.length + c;
        const b = a + columns.length;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  shape.setAttribute('position', new Float32BufferAttribute(points, 3));
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  shape.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  const shelf = new Mesh(shape, new MeshStandardMaterial({ map: granite(), vertexColors: true, roughness: 1, flatShading: true }));
  shelf.name = 'garden-stone-skin';
  // The shared installer retains this owned surface when it replaces the inset stone core.
  shelf.userData.keep = 0;
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  return shelf;
}

/** Garden's playable boulder is a separate stone, rather than a rectangular extrusion of the lawn. */
export function fitOutdoorLandmarks(chapter: ChapterData, group: Object3D): void {
  if (chapter.id !== 'garden') return;
  for (const holder of group.getObjectsByProperty('name', 'landmark:stone')) {
    const mark = chapter.landmarks?.find((item) => item.look === 'stone' && item.from === holder.position.x);
    if (!mark) continue;
    const width = mark.to - mark.from;
    const high = heightAt(chapter, (mark.from + mark.to) / 2) - mark.base;
    delete holder.userData.forest;
    holder.userData.model = 'block-a';
    holder.userData.disposeFallback = true;
    // The continuous skin also supplies the fallback silhouette while the native core loads.
    for (const child of holder.children) child.visible = false;
    // The native rounded mass sits inside the continuous outer stone, with its base on the lawn.
    const coreHeight = high * 0.8;
    holder.userData.block = { width: width * 0.97, height: coreHeight, depth: 2.9, x: width / 2, y: coreHeight / 2, z: -1.15 };
    holder.userData.onModelInstalled = (model: Group) => {
      // This boulder has an asymmetric origin and extends below zero. Align its actual bounds, rather than
      // assuming the export's origin is at its foot; otherwise the rounded body hangs below its stone shoulder.
      model.updateWorldMatrix(true, true);
      const bounds = new Box3().setFromObject(model);
      const min = holder.worldToLocal(bounds.min.clone());
      const max = holder.worldToLocal(bounds.max.clone());
      model.position.add(new Vector3(width / 2 - (min.x + max.x) / 2, coreHeight - max.y, -1.15 - (min.z + max.z) / 2));
    };
    holder.add(walkingStone(width, high));
  }
}
