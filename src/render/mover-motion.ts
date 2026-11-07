import type { Object3D } from 'three';
import type { Mover } from '../sim/types';

/**
 * How the puzzles' things move (the graphics pass of 6 November 2026; Olov: "puzzel kan få snyggare animationer").
 * The simulation slides a thing along its rail; drawn as it was, it moved like a cut-out. Here each has weight:
 * - pushed or pulled, it leans into the way it goes, more the narrower it is, and comes upright again;
 * - stopping, it rocks on its foot and settles;
 * - landing after a drop, it squashes a little and springs back.
 * Nothing changes where it stands or what he stands on: only how it is drawn about its own foot.
 * With less motion asked for, it is drawn exactly where the simulation has it.
 */
interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lean: number;
  leanV: number;
  squash: number;
  squashV: number;
}

export function createMoverMotion(defs: readonly Mover[], meshes: readonly Object3D[]) {
  const states: (State | null)[] = defs.map(() => null);
  return {
    update(movers: readonly { x: number; y: number }[], dt: number, still: boolean): void {
      for (const [i, at] of movers.entries()) {
        const mesh = meshes[i];
        const def = defs[i];
        if (!mesh || !def) continue;
        mesh.position.set(at.x, at.y, 0);
        if (still || dt <= 0) {
          if (still) { mesh.rotation.z = 0; mesh.scale.set(1, 1, 1); }
          continue;
        }
        let s = states[i];
        if (!s) s = states[i] = { x: at.x, y: at.y, vx: 0, vy: 0, lean: 0, leanV: 0, squash: 0, squashV: 0 };
        const step = Math.min(dt, 1 / 30);
        // A jump of more than a few lengths is a restore, not a move.
        const jumped = Math.hypot(at.x - s.x, at.y - s.y) > 3;
        const vx = jumped ? 0 : (at.x - s.x) / dt;
        const vy = jumped ? 0 : (at.y - s.y) / dt;
        const ax = (vx - s.vx) / dt;
        // Landing: it was falling and now is not.
        if (s.vy < -2.5 && vy > -0.5) s.squashV -= Math.min(4, -s.vy * 0.5);
        s.x = at.x; s.y = at.y; s.vx = vx; s.vy = vy;
        // Narrow things lean more, wide ones (what he stands on) hardly at all.
        const tip = Math.min(1, 1.4 / Math.max(0.6, def.width));
        // Leaning into the way it goes: a spring pulled by its acceleration, damped so it settles in a rock or two.
        const pull = Math.max(-0.1, Math.min(0.1, -vx * 0.025 - ax * 0.004)) * tip;
        s.leanV += ((pull - s.lean) * 70 - s.leanV * 7.5) * step;
        s.lean += s.leanV * step;
        s.squashV += (-s.squash * 160 - s.squashV * 11) * step;
        s.squash += s.squashV * step;
        mesh.rotation.z = s.lean;
        const squash = Math.max(-0.08, Math.min(0.08, s.squash));
        mesh.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
      }
    },
  };
}
