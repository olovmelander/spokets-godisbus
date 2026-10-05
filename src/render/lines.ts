import { CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import type { ChapterData, Line, Vec } from '../sim/types';

/**
 * What holds a ring (docs/level-design.md). A ring off the main way hangs in the open air over the path, and
 * nothing floats: it hangs on a cord from something above it, or from a line strung between two poles, a
 * clothes line or a rope between two dead pines. All of it is thin rods, and one instanced mesh: a chapter's
 * cords, lines and poles cost one draw call together.
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

/** The cords, lines and poles of a chapter as one mesh, or nothing where a chapter has none. */
export function buildLines(chapter: Pick<ChapterData, 'hooks' | 'lines'>): InstancedMesh | null {
  const all = rods(chapter);
  if (all.length === 0) return null;
  const mesh = new InstancedMesh(new CylinderGeometry(1, 1, 1, 6), new MeshStandardMaterial({ color: '#5f564c', roughness: 0.9 }), all.length);
  mesh.name = 'lines';
  // They hang all along a chapter: as a whole they are never outside the picture.
  mesh.frustumCulled = false;
  const place = new Object3D();
  for (const [i, rod] of all.entries()) {
    const dx = rod.to.x - rod.from.x;
    const dy = rod.to.y - rod.from.y;
    place.position.set((rod.from.x + rod.to.x) / 2, (rod.from.y + rod.to.y) / 2, Z);
    place.rotation.set(0, 0, -Math.atan2(dx, dy));
    place.scale.set(rod.thick, Math.hypot(dx, dy), rod.thick);
    place.updateMatrix();
    mesh.setMatrixAt(i, place.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
