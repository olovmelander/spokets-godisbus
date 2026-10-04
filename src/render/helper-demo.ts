import type { ChapterData, HelpState, Vec } from '../sim/types';
import { ELOF_HALF_WIDTH } from '../sim/constants';

/** Authored, sampled motion only: these poses never feed inputs, physics, flags or candy collection. */
export interface DemoPose extends Vec {
  t: number;
  lean: number;
  reach: number;
  stride: number;
  rope: Vec | null;
}
export const DEMO_SECONDS = 4.5;

export function demoFloor(chapter: ChapterData, x: number): number {
  for (let i = 0; i < chapter.ground.length - 1; i++) {
    const a = chapter.ground[i]!, b = chapter.ground[i + 1]!;
    if (b.x > a.x && x >= a.x && x < b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
  }
  return chapter.spawn.y;
}

/** A few key poses around the real target, including the hook's actual length and authored landing. */
export function demoFor(chapter: ChapterData, help: Pick<HelpState, 'at' | 'verb'>, standY: number): DemoPose[] {
  const at = help.at ?? { x: 0, y: standY };
  const pose = (t: number, x: number, y: number, reach = 0, lean = 0, stride = 0, rope: Vec | null = null): DemoPose => ({ t, x, y, reach, lean, stride, rope });
  const hook = help.verb === 'lace' ? chapter.hooks?.find((h) => h.x === at.x && h.y === at.y) : null;
  if (hook) {
    const startX = hook.x - Math.sin(0.65) * hook.length;
    const keys = [pose(0, startX - 0.5, standY), pose(0.12, startX, standY, 1)];
    // A short pump back, then forwards; the lace stays attached until the demonstrated release.
    for (const [t, angle] of [[0.2, -0.65], [0.32, 0.1], [0.44, -0.75], [0.66, 0.85]]) {
      keys.push(pose(t, hook.x + Math.sin(angle!) * hook.length, hook.y - Math.cos(angle!) * hook.length - 0.5, 1, -angle! * 0.4, 0, hook));
    }
    const last = keys[keys.length - 1]!;
    const land = hook.land ?? { x: hook.x + hook.length, y: standY };
    keys.push(pose(0.8, (last.x + land.x) / 2, Math.max(last.y, land.y) + 0.7, 0.45, -0.18, 0.3));
    keys.push(pose(0.94, land.x, land.y, 0.1, 0.2), pose(1, land.x, land.y));
    return keys;
  }
  const from = at.x - 1.4;
  const floor = Math.min(at.y, demoFloor(chapter, from));
  if (help.verb === 'push' || help.verb === 'pull') {
    const pull = help.verb === 'pull';
    // The optional light cone is deliberately pushed left. Read its authored stop instead of showing the wrong side.
    const left = !pull && chapter.counterweight && chapter.movers?.some((mover) => mover.optional && mover.stops.some((stop, i) =>
      Math.abs(stop.x - at.x) < 0.05 && Math.abs(stop.y + mover.height - at.y) < 0.05 && mover.stops[i + 1] !== undefined && mover.stops[i + 1]!.x < stop.x));
    const side = left ? -1 : 1;
    const end = at.x - side * 0.6 + (pull ? -0.7 : 0.7) * side;
    return [pose(0, at.x - side * 1.4, floor), pose(0.22, at.x - side * 0.6, floor, 1, -0.15, 0.3, pull ? at : null),
      pose(0.7, end, floor, 1, pull ? 0.25 : -0.3, -0.3, pull ? at : null), pose(1, end, floor)];
  }
  if (help.verb === null) {
    const root = chapter.returnClue?.root;
    if (root && Math.abs(at.x - root.x) < 0.05 && Math.abs(at.y - root.top) < 0.05) {
      return [pose(0, root.x + 0.65, root.bottom), pose(0.18, root.x, root.bottom, 1),
        pose(0.78, root.x, root.top, 1), pose(1, root.x - 0.6, root.top)];
    }
    const heavy = chapter.counterweight ? chapter.movers?.find((m) => m.id === chapter.counterweight!.heavy) : null;
    if (heavy && heavy.stops.some((stop) => Math.abs(at.x - (stop.x - heavy.width / 2 - ELOF_HALF_WIDTH - 0.12)) < 0.05
      && Math.abs(at.y - stop.y) < 0.05)) {
      const centre = at.x + heavy.width / 2 + ELOF_HALF_WIDTH + 0.12;
      const left = at.x;
      // Show the return over the unmovable side of the cone, then approach its left push side.
      return [pose(0, centre + 1.2, demoFloor(chapter, centre + 1.2)),
        pose(0.24, centre + 0.8, demoFloor(chapter, centre + 0.8), 0.2, -0.1, 0.4),
        pose(0.55, centre, at.y + heavy.height + 0.65, 0.4, 0.1, -0.4),
        pose(0.9, left, demoFloor(chapter, left)), pose(1, left, demoFloor(chapter, left))];
    }
    // Walking/hopping along the trail, with the landing taken from the chapter instead of guessed input.
    const land = demoFloor(chapter, at.x);
    return [pose(0, from, floor), pose(0.24, from + 0.4, floor, 0, -0.1, 0.4),
      pose(0.55, at.x - 0.4, Math.max(floor, land) + 0.65, 0.4, -0.15, -0.4), pose(0.86, at.x, land), pose(1, at.x, land)];
  }
  // Turn/take/give/call: approach, reach down or lift the hands to the partner, then stand back.
  const down = help.verb === 'turn' || help.verb === 'take';
  return [pose(0, from, floor), pose(0.25, at.x - 0.65, floor, 0.3, -0.1, 0.4),
    pose(0.52, at.x - 0.55, floor, down ? 0.25 : 0.85, down ? -0.55 : -0.1),
    pose(0.76, at.x - 0.55, floor, 1, 0.12), pose(1, at.x - 0.9, floor)];
}

/** Frame-rate-independent interpolation of the authored trajectory, held at its end rather than looped. */
export function sampleDemo(keys: readonly DemoPose[], seconds: number): DemoPose {
  const t = Math.max(0, Math.min(1, seconds / DEMO_SECONDS));
  const next = keys.findIndex((pose) => pose.t > t);
  if (next < 0) return { ...keys[keys.length - 1]! };
  const a = keys[Math.max(0, next - 1)]!, b = keys[next]!;
  const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t)));
  const smooth = k * k * (3 - 2 * k);
  const mix = (from: number, to: number) => from + (to - from) * smooth;
  return { t, x: mix(a.x, b.x), y: mix(a.y, b.y), lean: mix(a.lean, b.lean), reach: mix(a.reach, b.reach), stride: mix(a.stride, b.stride), rope: a.rope && b.rope ? a.rope : null };
}
