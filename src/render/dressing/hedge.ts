import {
  Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Vector3, type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { Cards, leafAtlas, leafy } from '../lift/flora/light';
import { sway } from '../wind';
import { archShape, gateOf, type Gate } from './hedge-gate';
import { heightAt, noise, sequence } from './kit';

interface Hedge {
  from: number;
  to: number;
  base: number;
  low: number;
  top: number;
  terminal: boolean;
  /** Its tall end has an arch where the path goes on into the forest (./hedge-gate.ts), in place of the tall row behind. */
  gate: boolean;
}

/** The planted hedge and its clipped, walkable edge are already described by the collision outline. */
function hedges(chapter: ChapterData): Hedge[] {
  return (chapter.surfaces ?? []).filter(surface => surface.kind === 'hedge').map(({ from, to, gate }) => {
    const outline = chapter.ground.filter(point => point.x >= from && point.x <= to);
    const base = Math.min(heightAt(chapter, from - .01), ...outline.map(point => point.y));
    const low = heightAt(chapter, (from + to) / 2);
    const top = Math.max(low, ...outline.map(point => point.y));
    return { from, to, base, low, top, terminal: chapter.ground.at(-1)!.x === to && top > low + 1, gate: !!gate };
  });
}

/**
 * A hedge is a bush above the lawn, not a sheer block of earth. Flatten its render-only bank before the
 * usual ground builder computes normals, bounds and the foreground slope. The collision chapter is untouched.
 * At the storm garden's boundary this also lowers the artificial plateau beyond the last collision point;
 * otherwise its brown cliff and grass would protrude through the hedge as the camera follows the flight up.
 */
export function hedgeGround(chapter: ChapterData): ChapterData {
  const plants = hedges(chapter);
  if (!plants.length) return chapter;
  const ground = chapter.ground.map(point => {
    const hedge = plants.find(one => point.x >= one.from && point.x <= one.to);
    return hedge ? { x: point.x, y: hedge.base } : point;
  }).filter((point, i, line) => i === 0 || point.x !== line[i - 1]!.x || point.y !== line[i - 1]!.y);
  return { ...chapter, ground };
}

interface Volume {
  from: number;
  to: number;
  bottom: number;
  top: number;
  front: number;
  back: number;
}

/** Two greens in the shade, fresh green on the face and brighter leaves on the clipped crown. */
const GREEN = ['#24551c', '#367225', '#4a8b2d', '#68a13c'].map(hex => new Color(hex));
const WHITE = new Color('#ffffff');
const LEAF_NORMAL = new Vector3(0, 0, 1);

/** An actual leafy volume on every quality tier: one opaque core and one batch of cutout leaf sprays. */
export function hedge(chapter: ChapterData): Group | null {
  const plants = hedges(chapter);
  if (!plants.length) return null;
  const volumes: Volume[] = plants.flatMap(plant => {
    const low: Volume = { from: plant.from - .12, to: plant.to + .12, bottom: plant.base - .25,
      top: plant.low, front: plant.terminal ? .36 : 1.1, back: -8.8 };
    if (!plant.terminal) return [low];
    // Gården's end stands straight on the lawn: no walkable lip in front of it, only the tall hedge.
    return [...plant.low - plant.base > .3 ? [low] : [],
      // The rising figure stays in front of this tall row until it is above its crown. The low lip remains
      // readable and walkable in front; no tall leaves stand between the camera and the flight.
      // Where the hedge has its arch into the forest, the arch's own hedge stands nearer instead (below).
      ...plant.gate ? [] : [{ from: plant.from + .15, to: plant.to + 1.2, bottom: plant.base - .2, top: plant.top,
        front: -8.25, back: -13.5 }],
      // Wrap the tall end and continue the hedge out of frame, instead of exposing the old square soil wall.
      { from: plant.to + .05, to: plant.to + 12, bottom: plant.base - .25, top: plant.top,
        front: .36, back: -10 },
    ];
  });

  const group = new Group();
  group.name = 'garden-hedge';
  const cores = [];
  const leaves: Leaf[] = [];
  const next = sequence(873);

  for (const volume of volumes) {
    const wide = volume.to - volume.from, high = volume.top - volume.bottom, deep = volume.front - volume.back;
    const centre = new Vector3((volume.from + volume.to) / 2, (volume.bottom + volume.top) / 2, (volume.back + volume.front) / 2);
    const half = new Vector3(wide / 2, high / 2, deep / 2);
    const radius = Math.min(.55, wide * .22, high * .25);
    cores.push(grow(new RoundedBoxGeometry(wide, high, deep, 4, radius), centre, volume.bottom, volume.top));

    /** A spray on one rounded face. The front, sides and crown are dense; the unseen back needs no overdraw. */
    const face = (axis: 0 | 1 | 2, side: -1 | 1, u: 0 | 1 | 2, v: 0 | 1 | 2) => {
      const spacing = axis === 1 ? .36 : .48;
      const nu = Math.ceil(half.getComponent(u) * 2 / spacing), nv = Math.ceil(half.getComponent(v) * 2 / spacing);
      for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
        const point = new Vector3();
        point.setComponent(axis, side * half.getComponent(axis));
        point.setComponent(u, ((a + next()) / nu * 2 - 1) * half.getComponent(u));
        point.setComponent(v, ((b + next()) / nv * 2 - 1) * half.getComponent(v));
        const inside = point.clone().clamp(half.clone().multiplyScalar(-1).addScalar(radius), half.clone().addScalar(-radius));
        const normal = point.clone().sub(inside).normalize();
        point.copy(inside).addScaledVector(normal, radius + .055).add(centre);
        // Keep the top of the playable strip bare at boot height. The foliage behind it can crest gently.
        if (axis === 1 && point.z > -.7 && plantWalksHere(point.x, plants)) continue;
        if (axis === 1) {
          // A clipped crown still has leaf tips at different heights and angles. Flat coplanar sprays
          // fight for depth and look like slats from the plane; gentle uneven growth keeps the leaf drawing.
          point.y -= .02 + next() * .06;
          normal.x += (next() - .5) * .16;
          normal.z += .08 + next() * .18;
          normal.normalize();
        }
        const shade = Math.min(2.99, .8 + (point.y - volume.bottom) / high * 1.1 + next() * .8 + Math.max(0, normal.y) * .3);
        const tone = Math.floor(shade);
        leaves.push({ at: point, normal, size: .75 + next() * .3, turn: (next() - .5) * Math.PI * 2,
          tint: GREEN[tone]!.clone().lerp(GREEN[tone + 1]!, shade - tone),
          top: volume.top + (point.z > -.7 && plantWalksHere(point.x, plants) ? .025 : .12) });
      }
    };
    face(2, 1, 0, 1);
    face(0, -1, 2, 1);
    face(0, 1, 2, 1);
    face(1, 1, 0, 2);
  }

  // Gården's tall end has its arch into the forest (./hedge-gate.ts): a clipped wall with a round-topped opening, its
  // leaves sown over all of it that the camera sees, and the inside of the arch in the hedge's own shade.
  const gate = gateOf(chapter);
  if (gate) {
    const shape = archShape(gate);
    sow(shape, gate, next, leaves);
    cores.push(grow(shape, new Vector3(), gate.bottom, gate.top, (x, y, z) => (inArch(gate, x, y, z) ? .7 : 0)));
  }

  const coreShape = mergeGeometries(cores);
  for (const geometry of cores) geometry.dispose();
  coreShape.computeBoundingBox();
  coreShape.computeBoundingSphere();
  const core = new Mesh(coreShape, new MeshStandardMaterial({ vertexColors: true, roughness: .94 }));
  core.name = 'hedge-core';
  core.receiveShadow = true;

  const cards = new Cards(new Vector3(0, 0, -.12), new Vector3(.5, .5, .3));
  cards.card([0, -.5, 0], Math.PI / 2, 1, 1, 'clump', WHITE);
  const shape = cards.build();
  const material = leafy(new MeshStandardMaterial({ map: leafAtlas(), alphaTest: .42, side: DoubleSide,
    vertexColors: true, roughness: .82 }));
  // The common wind clock already stops on Pause and with reduced motion. Only leaf tips flutter;
  // the solid hedge stays planted. The atlas is shared with the flora, never cloned, changed or disposed here.
  sway(material, .012, 0, 0, 1, 0);
  const foliage = new InstancedMesh(shape, material, leaves.length);
  foliage.name = 'hedge-leaves';
  const place = new Object3D();
  const corner = new Vector3();
  const corners = shape.getAttribute('position');
  for (const [i, leaf] of leaves.entries()) {
    place.position.copy(leaf.at);
    place.quaternion.setFromUnitVectors(LEAF_NORMAL, leaf.normal);
    place.rotateZ(leaf.turn);
    // A leaf's corners may turn upwards. Keep the entire spray under the authored flight clearance.
    let above = 0;
    for (let k = 0; k < corners.count; k++) above = Math.max(above, corner.fromBufferAttribute(corners, k).applyQuaternion(place.quaternion).y);
    const size = Math.min(leaf.size, above > 0 ? Math.max(.05, leaf.top - leaf.at.y) / above : leaf.size);
    place.scale.setScalar(size);
    place.updateMatrix();
    foliage.setMatrixAt(i, place.matrix);
    foliage.setColorAt(i, leaf.tint);
  }
  foliage.instanceMatrix.needsUpdate = true;
  foliage.instanceColor!.needsUpdate = true;
  foliage.computeBoundingBox();
  foliage.computeBoundingSphere();
  // Tiny wind motion must not disappear when the still bounds just leave the view.
  foliage.boundingSphere!.radius += .08;
  group.add(core, foliage);
  return group;
}

/**
 * A hedge's solid core: coloured darker low down and brighter on its crown, grown a little unevenly along its normals,
 * and smooth. `at` is where its own shape stands; `dim` shades a part of it. The shape is used up.
 */
function grow(geometry: BufferGeometry, at: Vector3, bottom: number, top: number, dim?: (x: number, y: number, z: number) => number): BufferGeometry {
  const high = top - bottom;
  const tint = new Color();
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const colours = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + at.x, y = positions.getY(i) + at.y, z = positions.getZ(i) + at.z;
    // Small uneven growth softens a clipped shape; it does not turn the hedge into a row of round balls.
    const out = (noise(x * 2.1 + y * .7, z * 1.6 - y * .4) - .5) * .14;
    positions.setXYZ(i, x + normals.getX(i) * out, Math.min(top, y + normals.getY(i) * out), z + normals.getZ(i) * out);
    const shade = Math.max(0, Math.min(2.99, .55 + (y - bottom) / high * 1.25 + noise(x * 1.4, y * 1.2 + z) * .8 + Math.max(0, normals.getY(i)) * .45 - (dim?.(x, y, z) ?? 0)));
    const tone = Math.floor(shade);
    tint.copy(GREEN[tone]!).lerp(GREEN[tone + 1]!, shade - tone);
    colours.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const smooth = mergeVertices(geometry);
  smooth.computeVertexNormals();
  geometry.dispose();
  return smooth;
}

/** Inside the arch's opening, under its round top and back from its face: in the hedge's shade. */
function inArch(gate: Gate, x: number, y: number, z: number): boolean {
  const { open } = gate;
  return x > open.from - .15 && x < open.to + .15 && y < open.spring + open.radius + .2 && z < gate.front - .12 && z > gate.back + .12;
}

type Leaf = { at: Vector3; normal: Vector3; size: number; turn: number; tint: Color; top: number };

/**
 * Leaf sprays over the arch's hedge, as thick as on the boxes' faces (one every 0.48 EL square on a side, every 0.36 on
 * the crown): on every face the camera can see, and smaller inside the arch, so that its opening stays clear. None on
 * its back, under the ground, or in the hedge's tall end, which its right side runs into.
 */
function sow(shape: BufferGeometry, gate: Gate, next: () => number, leaves: Leaf[]): void {
  const position = shape.getAttribute('position');
  const index = shape.index;
  const corner = (k: number) => new Vector3().fromBufferAttribute(position, index ? index.getX(k) : k);
  const end = gate.to - .6;
  for (let k = 0; k + 2 < (index ? index.count : position.count); k += 3) {
    const a = corner(k), ab = corner(k + 1).sub(a), ac = corner(k + 2).sub(a);
    const normal = new Vector3().crossVectors(ab, ac);
    const area = normal.length() / 2;
    if (area < 1e-5) continue;
    normal.normalize();
    const middle = a.clone().addScaledVector(ab, 1 / 3).addScaledVector(ac, 1 / 3);
    if (normal.z < -.5 || (normal.y < -.5 && middle.y < gate.base + .5) || middle.x > end + .05) continue;
    const crown = normal.y > .7;
    for (let more = area / (crown ? .36 : .48) ** 2; more > 0; more--) {
      if (more < 1 && next() > more) break;
      let u = next(), v = next();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const point = a.clone().addScaledVector(ab, u).addScaledVector(ac, v).addScaledVector(normal, .055);
      const facing = normal.clone();
      if (crown) {
        point.y -= .02 + next() * .06;
        facing.x += (next() - .5) * .16;
        facing.z += .08 + next() * .18;
        facing.normalize();
      }
      const inside = inArch(gate, point.x, point.y, point.z);
      const shade = Math.max(0, Math.min(2.99, .8 + (point.y - gate.bottom) / (gate.top - gate.bottom) * 1.1 + next() * .8 + Math.max(0, facing.y) * .3 - (inside ? .75 : 0)));
      const tone = Math.floor(shade);
      leaves.push({ at: point, normal: facing, size: (inside ? .5 : .75) + next() * .3, turn: (next() - .5) * Math.PI * 2,
        tint: GREEN[tone]!.clone().lerp(GREEN[tone + 1]!, shade - tone), top: gate.top + .12 });
    }
  }
}

function plantWalksHere(x: number, plants: readonly Hedge[]): boolean {
  // The first garden is crossed in Moa's plane; only the storm garden has a low lip to walk along.
  return plants.some(plant => plant.terminal && x >= plant.from && x <= plant.to);
}
