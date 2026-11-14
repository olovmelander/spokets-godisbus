// createBatch and canvasTexture are ported from olovmelander/pekkas-pokal (776236004403fb18423cc078ba4a82a6324bde14,
// src/games/kart/kit.js). The ribbon and the scatter helpers are written for Godisracet's own course.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAP, type Track } from '../sim/track';

type XYZ = readonly [number, number, number] | number[];
export interface Batch {
  /** Adds a copy of `geometry` at position/rotation(YXZ)/scale, tinted `color`, into the chunk called `key`. */
  add(geometry: THREE.BufferGeometry, material: THREE.Material, at?: XYZ, rotation?: XYZ, size?: XYZ | number, color?: THREE.ColorRepresentation | null, parent?: THREE.Matrix4 | null, key?: string | number): Batch;
  addMatrix(geometry: THREE.BufferGeometry, material: THREE.Material, matrix: THREE.Matrix4, color?: THREE.ColorRepresentation | null, key?: string | number): Batch;
  build(parent: THREE.Object3D, options?: { castShadow?: boolean; receiveShadow?: boolean; name?: string }): THREE.Mesh[];
}

/** Collects static pieces and merges them into one mesh per material and chunk, so a whole kind of trackside
 * furniture costs one draw call where it is in view, and none where it is not. */
export function createBatch(): Batch {
  const buckets = new Map<THREE.Material, Map<string | number, THREE.BufferGeometry[]>>();
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const position = new THREE.Vector3(), scale = new THREE.Vector3(), tint = new THREE.Color();
  const batch: Batch = {
    add(geometry, material, at = [0, 0, 0], rotation = [0, 0, 0], size = [1, 1, 1], color = null, parent = null, key = 0) {
      position.fromArray(at as number[]); euler.set(rotation[0]!, rotation[1]!, rotation[2]!, 'YXZ'); quaternion.setFromEuler(euler);
      if (typeof size === 'number') scale.setScalar(size); else scale.fromArray(size as number[]);
      matrix.compose(position, quaternion, scale);
      if (parent) matrix.premultiply(parent);
      return batch.addMatrix(geometry, material, matrix, color, key);
    },
    addMatrix(geometry, material, m, color = null, key = 0) {
      const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
      g.applyMatrix4(m);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
      if ((material as THREE.MeshStandardMaterial).vertexColors) {
        if (!g.attributes.color || color !== null) {
          tint.set(color ?? 0xffffff);
          const n = g.attributes.position!.count, data = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { data[i * 3] = tint.r; data[i * 3 + 1] = tint.g; data[i * 3 + 2] = tint.b; }
          g.setAttribute('color', new THREE.Float32BufferAttribute(data, 3));
        }
      } else if (g.attributes.color) g.deleteAttribute('color');
      g.morphAttributes = {};
      let chunks = buckets.get(material);
      if (!chunks) buckets.set(material, chunks = new Map());
      let list = chunks.get(key);
      if (!list) chunks.set(key, list = []);
      list.push(g);
      return batch;
    },
    build(parent, { castShadow = true, receiveShadow = true, name = 'batch' } = {}) {
      const meshes: THREE.Mesh[] = [];
      for (const [material, chunks] of buckets) for (const [key, geometries] of chunks) {
        const merged = mergeGeometries(geometries);
        geometries.forEach(g => g.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, material);
        mesh.name = `${name}:${key}`; mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
        mesh.matrixAutoUpdate = false;
        parent.add(mesh); meshes.push(mesh);
      }
      buckets.clear();
      return meshes;
    },
  };
  return batch;
}

export function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D, width: number, height: number) => void, { anisotropy = 4, srgb = true } = {}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** A repeatable stream for scenery: the same forest every time. */
export const randomFrom = (seed: number) => () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };

export interface RibbonOptions {
  /** Lane of each column at a distance; columns run from the first to the last lane. */
  lanes(distance: number): readonly number[];
  from?: number;
  to?: number;
  step?: number;
  /** Height over the road's own height at (distance, lane, column). */
  lift?: number | ((distance: number, lane: number, column: number) => number);
  color?(distance: number, lane: number, column: number, out: THREE.Color): void;
  /** Extra per-vertex numbers for a shader: [distance, lane, value]. */
  track?(distance: number, lane: number): number;
  /** Absolute height instead of road height plus lift. */
  height?(x: number, z: number, distance: number, lane: number, column: number): number;
}

/** A strip laid along the course. Lanes may be listed left to right or right to left; faces always look up. */
export function ribbon(track: Track, options: RibbonOptions): THREE.BufferGeometry {
  const { from = 0, to = LAP, step = 1 } = options, rows = Math.max(1, Math.ceil((to - from) / step));
  const positions: number[] = [], colors: number[] = [], data: number[] = [], uv: number[] = [], indices: number[] = [];
  const point = track.point(0), tint = new THREE.Color(1, 1, 1);
  const lift = typeof options.lift === 'function' ? options.lift : () => (options.lift as number | undefined) ?? 0;
  let columns = 0, leftward = false;
  for (let i = 0; i <= rows; i++) {
    const distance = from + (to - from) * i / rows, lanes = options.lanes(distance);
    columns = lanes.length; leftward = lanes[0]! < lanes[columns - 1]!;
    lanes.forEach((lane, column) => {
      track.point(distance, lane, point);
      const y = options.height ? options.height(point.x, point.z, distance, lane, column) : point.y + lift(distance, lane, column);
      positions.push(point.x, y, point.z); uv.push(lane / 4, distance / 4);
      tint.setRGB(1, 1, 1); options.color?.(distance, lane, column, tint); colors.push(tint.r, tint.g, tint.b);
      if (options.track) data.push(distance, lane, options.track(distance, lane));
    });
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns - 1; j++) {
    const a = i * columns + j, b = a + columns;
    // Positive lanes lie to the left, so columns that run leftward wind this way to face up.
    if (leftward) indices.push(a, b, a + 1, a + 1, b, b + 1); else indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (options.track) geometry.setAttribute('aTrack', new THREE.Float32BufferAttribute(data, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
