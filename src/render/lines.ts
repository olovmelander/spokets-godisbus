import { CylinderGeometry, Object3D, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData, Line, PlaceId, Vec } from '../sim/types';

/**
 * What holds a ring (docs/level-design.md). A ring off the main way hangs in the open air over the path, and
 * nothing floats: it hangs on a cord from something above it, or from a line strung between two poles, a
 * clothes line or a rope between two dead pines. All of it is thin rods. They are drawn with the ledges of
 * the side way they belong to, as part of that place's one mesh (`ledges.ts`), so they cost no draw call
 * of their own.
 */
export interface Rod { from: Vec; to: Vec; thick: number }

/** Half the thickness of a string, and of a pole. */
const STRING = 0.016;
const POLE = 0.065;
/** A line is drawn as this many straight parts along its curve. */
const PARTS = 8;
/** How far down a pole goes: into the ground under it, wherever that is. */
const DOWN = 14;
/** A pole stands this far above the line it holds. */
const OVER = 0.14;
/** A cord ends at the top of its ring. */
const RING = 0.19;
/** Just behind the rings, and behind the plane he moves in: he passes in front of a pole. */
const Z = -0.12;
/** Weathered string and wood. */
export const ROD_COLOUR = '#5f564c';

/** How high a line is at an x between its ends: it hangs in a shallow curve, lowest in the middle. */
export function lineHeight(line: Line, x: number): number {
  const t = (x - line.from.x) / (line.to.x - line.from.x);
  return line.from.y + (line.to.y - line.from.y) * t - 4 * (line.sag ?? 0) * t * (1 - t);
}

/** The line a ring hangs from, if one is strung over it. */
export function lineOver(lines: readonly Line[], at: Vec): Line | null {
  return lines.find((line) => at.x > Math.min(line.from.x, line.to.x) && at.x < Math.max(line.from.x, line.to.x) && lineHeight(line, at.x) > at.y) ?? null;
}

/** Every rod of a chapter: its lines in parts, their poles, and the cord of each ring that has one. */
export function rods(chapter: Pick<ChapterData, 'hooks' | 'lines'>): Rod[] {
  const lines = chapter.lines ?? [];
  const all: Rod[] = [];
  for (const line of lines) {
    const at = (i: number): Vec => {
      const x = line.from.x + ((line.to.x - line.from.x) * i) / PARTS;
      return { x, y: lineHeight(line, x) };
    };
    for (let i = 0; i < PARTS; i++) all.push({ from: at(i), to: at(i + 1), thick: STRING });
    if (line.posts) for (const end of [line.from, line.to]) all.push({ from: { x: end.x, y: end.y - DOWN }, to: { x: end.x, y: end.y + OVER }, thick: POLE });
  }
  for (const hook of chapter.hooks ?? []) {
    const over = lineOver(lines, hook);
    const top = hook.hangs !== undefined ? hook.y + hook.hangs : over ? lineHeight(over, hook.x) : null;
    if (top !== null && top > hook.y + RING) all.push({ from: { x: hook.x, y: hook.y + RING }, to: { x: hook.x, y: top }, thick: STRING });
  }
  return all;
}

const place = new Object3D();

/** A rope's outdoor anchor: a weathered, tapering snag with broken twigs, tied at the original rope endpoint. */
function snag(rod: Rod): BufferGeometry {
  const height = rod.to.y - rod.from.y;
  const trunk = new CylinderGeometry(0.055, 0.16, height, 7, 7).toNonIndexed();
  const points = trunk.getAttribute('position');
  const phase = rod.to.x * 1.7;
  const bendAt = (t: number) => Math.sin(t * Math.PI) * (0.13 * Math.sin(phase) + 0.1 * Math.sin(t * 6));
  for (let i = 0; i < points.count; i++) {
    const t = (points.getY(i) + height / 2) / height;
    const bend = bendAt(t);
    points.setXYZ(i, points.getX(i) + bend, points.getY(i), points.getZ(i) - 0.2 * (1 - t));
  }
  trunk.translate(rod.to.x, (rod.from.y + rod.to.y) / 2, Z);
  const parts = [trunk];
  for (const [t, side] of [[0.82, -1], [0.94, 1]] as const) {
    const long = 0.35 + 0.12 * (1 + Math.sin(phase + t));
    const branch = new CylinderGeometry(0.012, 0.045, long, 5).toNonIndexed()
      .translate(0, long / 2, 0).rotateZ(side * 0.9)
      .translate(rod.to.x + bendAt(t), rod.from.y + height * t, Z - 0.2 * (1 - t));
    parts.push(branch);
  }
  const shape = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  shape.computeVertexNormals();
  return shape;
}

/** Rope stays fine and readable; in the wild its supports are dead stems, while garden clothesline posts stay planed. */
export function rodShape(rod: Rod, site?: PlaceId): BufferGeometry {
  if (rod.thick === POLE && (site === 'forest' || site === 'bog' || site === 'mountain' || site === 'dusk')) return snag(rod);
  const dx = rod.to.x - rod.from.x;
  const dy = rod.to.y - rod.from.y;
  place.position.set((rod.from.x + rod.to.x) / 2, (rod.from.y + rod.to.y) / 2, Z);
  place.rotation.set(0, 0, -Math.atan2(dx, dy));
  place.scale.set(rod.thick, Math.hypot(dx, dy), rod.thick);
  place.updateMatrix();
  return new CylinderGeometry(1, 1, 1, 6).toNonIndexed().applyMatrix4(place.matrix);
}
