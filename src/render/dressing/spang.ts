import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { BOARD, boards } from './ground';
import { hash, heightAt } from './kit';

/** A plank's width across the path and its thickness; where each of the three lies across it. He walks on the middle one. */
const WIDE = 0.76;
const THICK = 0.22;
const ROWS = [-0.8, 0, 0.8];
/** How long a plank is, how far along each row's joints lie from the first row's, and the gap at a joint. */
const LONG = 8;
const STAGGER = [0, 2.7, 5.3];
const JOINT = 0.04;
/** A sleeper's radius, its length across the path, and how far apart the sleepers lie. */
const ROUND = 0.2;
const ACROSS = 2.9;
const APART = 4;
/** Weathered wood: silver, each plank a little different; grey-green lichen; a sleeper and its sawn end. */
const SILVER = ['#aca79c', '#b9b4a8', '#c6c1b5', '#d3cec2'].map((hex) => new Color(hex));
const LICHEN = new Color('#8f9a7a');
const SLEEPER = new Color('#8a857a');
const SAWN = new Color('#6b665c');
/** The boards' picture, two boards to a tile as the decks have it (./ground.ts): a plank is one board across. */
const TILE = 1 / (BOARD * 2);

/** Gives a shape its colour at each corner by `colourAt`, and the boards' picture, its grain along `grain`. */
function paint(shape: BufferGeometry, colourAt: (i: number) => Color, grain: (x: number, y: number, z: number, i: number) => [number, number]): BufferGeometry {
  const at = shape.getAttribute('position');
  const colour = new Float32Array(at.count * 3);
  const uv = new Float32Array(at.count * 2);
  for (let i = 0; i < at.count; i++) {
    const c = colourAt(i);
    colour.set([c.r, c.g, c.b], i * 3);
    uv.set(grain(at.getX(i), at.getY(i), at.getZ(i), i), i * 2);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colour, 3));
  shape.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return shape;
}

/**
 * The walk of planks over the bog, where the chapter marks its ground as wood (visual audit, myren row 7; Mamma:
 * "På myren går vi på spången"). Three planks along the path, their tops on the line he walks on, in lengths of 8
 * with their joints staggered and a joint wherever the line bends; silver with weather, and some with lichen at an
 * end. Round sleepers lie across under them every 4, their ends showing in front, and on a slope battens lie across
 * them for the feet. Under it all is the bog's own peat (`ridge` in ./ground.ts). One mesh, its colours on its
 * corners, with the boards' picture for the grain.
 */
export function spang(chapter: ChapterData): Mesh | null {
  const walks = (chapter.surfaces ?? []).filter((surface) => surface.kind === 'wood');
  if (walks.length === 0) return null;
  const parts: BufferGeometry[] = [];
  const tone = new Color();
  for (const walk of walks) {
    // The line he walks on, from end to end: its two ends, and its corners between them.
    const corners = chapter.ground.filter((p) => p.x > walk.from + 0.01 && p.x < walk.to - 0.01).map((p) => p.x);
    const lineAt = (x: number) => heightAt(chapter, Math.min(walk.to - 0.01, Math.max(walk.from + 0.01, x)));
    for (const [r, z] of ROWS.entries()) {
      const joints = [walk.from, walk.to, ...corners];
      for (let x = walk.from + STAGGER[r]!; x < walk.to; x += LONG) if (x > walk.from) joints.push(x);
      joints.sort((a, b) => a - b);
      for (let j = 0; j < joints.length - 1; j++) {
        const [xa, xb] = [joints[j]!, joints[j + 1]!];
        if (xb - xa < 0.3) continue;
        const [ya, yb] = [lineAt(xa), lineAt(xb)];
        const turn = Math.atan2(yb - ya, xb - xa);
        const long = Math.hypot(xb - xa, yb - ya) - JOINT;
        // Its top on the line: its middle half a plank under it, square to the slope.
        const [mx, my] = [(xa + xb) / 2 + (Math.sin(turn) * THICK) / 2, (ya + yb) / 2 - (Math.cos(turn) * THICK) / 2];
        const which = Math.floor(hash(Math.floor(xa * 3) + r * 101, 5) * SILVER.length);
        const lichen = hash(Math.floor(xa * 7) + r * 37, 9) < 0.3 ? (hash(Math.floor(xa * 5) + r, 11) < 0.5 ? xa : xb) : null;
        const plank = new BoxGeometry(long, THICK, WIDE).rotateZ(turn).translate(mx, my, z);
        const normal = plank.getAttribute('normal');
        parts.push(paint(plank, (i) => {
          const x = plank.getAttribute('position').getX(i);
          tone.copy(SILVER[which]!).multiplyScalar(0.92 + 0.16 * hash(Math.floor(x * 4) + i, r + 17));
          return lichen === null ? tone : tone.lerp(LICHEN, 0.55 * Math.max(0, 1 - Math.abs(x - lichen) / 1.6));
        }, (x, y, zz, i) => {
          // Across the plank the picture spans one board, between two gaps; on its front and back, its thickness.
          const across = Math.abs(normal.getZ(i)) > 0.5 ? (y - (lineAt(x) - THICK)) / THICK : (zz - z + WIDE / 2) / WIDE;
          return [0.0125 + 0.475 * Math.min(1, Math.max(0, across)), x * TILE];
        }));
      }
    }
    // The sleepers, square across the path, under the planks.
    for (let x = walk.from + APART / 2; x < walk.to - 1; x += APART) {
      const log = new CylinderGeometry(ROUND, ROUND, ACROSS, 8).rotateX(Math.PI / 2).translate(x, lineAt(x) - THICK - ROUND * 0.9, 0);
      // Its side first, then its two sawn ends.
      parts.push(paint(log, (i) => (i < 18 ? tone.copy(SLEEPER).multiplyScalar(0.9 + 0.2 * hash(i, 23)) : SAWN), (_x, y, zz) => [0.25 + y * 0.1, zz * TILE]));
    }
    // On a slope, battens across the planks for the feet.
    for (let i = 0; i < corners.length + 1; i++) {
      const [xa, xb] = [[walk.from, ...corners][i]!, [...corners, walk.to][i]!];
      const [ya, yb] = [lineAt(xa), lineAt(xb)];
      if (Math.abs(yb - ya) < 0.1 * (xb - xa)) continue;
      const turn = Math.atan2(yb - ya, xb - xa);
      const long = Math.hypot(xb - xa, yb - ya);
      for (let d = 0.6; d < long - 0.3; d += 1.2) {
        const [px, py] = [xa + Math.cos(turn) * d, ya + Math.sin(turn) * d];
        const batten = new BoxGeometry(0.12, 0.08, WIDE * 3).rotateZ(turn).translate(px - Math.sin(turn) * 0.04, py + Math.cos(turn) * 0.04, 0);
        parts.push(paint(batten, () => SILVER[1]!, (x, _y, zz) => [0.0125 + 0.475 * ((zz + 1.2) / 2.4), x * TILE]));
      }
    }
  }
  const shape = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const mesh = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, map: boards(), roughness: 0.9 }));
  mesh.name = 'spang';
  return mesh;
}
