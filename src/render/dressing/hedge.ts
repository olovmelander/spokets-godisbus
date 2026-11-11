import {
  Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { Cards, leafAtlas, leafy } from '../lift/flora/light';
import { sway } from '../wind';
import { heightAt, noise, sequence } from './kit';

interface Hedge {
  from: number;
  to: number;
  base: number;
  low: number;
  top: number;
  terminal: boolean;
}

/** The planted hedge and its clipped, walkable edge are already described by the collision outline. */
function hedges(chapter: ChapterData): Hedge[] {
  return (chapter.surfaces ?? []).filter(surface => surface.kind === 'hedge').map(({ from, to }) => {
    const outline = chapter.ground.filter(point => point.x >= from && point.x <= to);
    const base = Math.min(heightAt(chapter, from - .01), ...outline.map(point => point.y));
    const low = heightAt(chapter, (from + to) / 2);
    const top = Math.max(low, ...outline.map(point => point.y));
    return { from, to, base, low, top, terminal: chapter.ground.at(-1)!.x === to && top > low + 1 };
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
    return [low,
      // The rising figure stays in front of this tall row until it is above its crown. The low lip remains
      // readable and walkable in front; no tall leaves stand between the camera and the flight.
      { from: plant.from + .15, to: plant.to + 1.2, bottom: plant.base - .2, top: plant.top,
        front: -8.25, back: -13.5 },
      // Wrap the tall end and continue the hedge out of frame, instead of exposing the old square soil wall.
      { from: plant.to + .05, to: plant.to + 12, bottom: plant.base - .25, top: plant.top,
        front: .36, back: -10 },
    ];
  });

  const group = new Group();
  group.name = 'garden-hedge';
  const cores = [];
  const leaves: { at: Vector3; normal: Vector3; size: number; turn: number; tint: Color; top: number }[] = [];
  const next = sequence(873);
  const tint = new Color();

  for (const volume of volumes) {
    const wide = volume.to - volume.from, high = volume.top - volume.bottom, deep = volume.front - volume.back;
    const centre = new Vector3((volume.from + volume.to) / 2, (volume.bottom + volume.top) / 2, (volume.back + volume.front) / 2);
    const half = new Vector3(wide / 2, high / 2, deep / 2);
    const radius = Math.min(.55, wide * .22, high * .25);
    const geometry = new RoundedBoxGeometry(wide, high, deep, 4, radius);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colours = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) + centre.x, y = positions.getY(i) + centre.y, z = positions.getZ(i) + centre.z;
      // Small uneven growth softens a clipped shape; it does not turn the hedge into a row of round balls.
      const out = (noise(x * 2.1 + y * .7, z * 1.6 - y * .4) - .5) * .14;
      positions.setXYZ(i, x + normals.getX(i) * out, Math.min(volume.top, y + normals.getY(i) * out), z + normals.getZ(i) * out);
      const shade = Math.min(2.99, .55 + (y - volume.bottom) / high * 1.25 + noise(x * 1.4, y * 1.2 + z) * .8 + Math.max(0, normals.getY(i)) * .45);
      const tone = Math.floor(shade);
      tint.copy(GREEN[tone]!).lerp(GREEN[tone + 1]!, shade - tone);
      colours.set([tint.r, tint.g, tint.b], i * 3);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    const smooth = mergeVertices(geometry);
    smooth.computeVertexNormals();
    cores.push(smooth);
    geometry.dispose();

    /** A spray on one rounded face. The front, sides and crown are dense; the unseen back needs no overdraw. */
    const face = (axis: 0 | 1 | 2, side: -1 | 1, u: 0 | 1 | 2, v: 0 | 1 | 2) => {
      const nu = Math.ceil(half.getComponent(u) * 2 / .48), nv = Math.ceil(half.getComponent(v) * 2 / .48);
      for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
        const point = new Vector3();
        point.setComponent(axis, side * half.getComponent(axis));
        point.setComponent(u, ((a + .2 + next() * .6) / nu * 2 - 1) * half.getComponent(u));
        point.setComponent(v, ((b + .2 + next() * .6) / nv * 2 - 1) * half.getComponent(v));
        const inside = point.clone().clamp(half.clone().multiplyScalar(-1).addScalar(radius), half.clone().addScalar(-radius));
        const normal = point.clone().sub(inside).normalize();
        point.copy(inside).addScaledVector(normal, radius + .055).add(centre);
        // Keep the top of the playable strip bare at boot height. The foliage behind it can crest gently.
        if (axis === 1 && point.z > -.7 && plantWalksHere(point.x, plants)) continue;
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

function plantWalksHere(x: number, plants: readonly Hedge[]): boolean {
  return plants.some(plant => x >= plant.from && x <= plant.to);
}
