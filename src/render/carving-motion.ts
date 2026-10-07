/** All carving movement shares the actor's clock: seeking or pausing needs no accumulated state. */
export const CARVING_PERIOD = 3.2;
export const CARVING_SHAVING_LIFETIME = 0.7;

export interface CarvingPoint {
  /** Forward from the feet, in the seated body's reference units. */
  ahead: number;
  up: number;
}

export interface CarvingMotion {
  phase: 'set' | 'cut' | 'recover' | 'inspect';
  stroke: 0 | 1 | 2;
  /** Pressure at the wood, zero when the blade is lifted away. */
  cut: number;
  /** Gap between the blade tip and the wood during recovery/inspection, in reference body units. */
  clearance: number;
  right: CarvingPoint;
  left: CarvingPoint;
  lean: number;
  nod: number;
  /** Unit vector pointing from the knife handle towards its blade, in the body's side view. */
  knifeDirection: CarvingPoint;
  /** A small cluster can share an emission. Origins remain at their birth positions as the wrist moves on. */
  shavings: readonly { id: number; born: number; age: number; right: CarvingPoint }[];
}

const READY = { ahead: 1.05, up: 2.45 };
const SUPPORT = { ahead: 1.2, up: 2.25 };
const STROKES = [
  { at: 0.12, seconds: 0.30, recover: 0.34, length: 0.29, depth: 0.14, pressure: 0.82 },
  { at: 0.90, seconds: 0.34, recover: 0.36, length: 0.35, depth: 0.18, pressure: 1.00 },
  { at: 1.72, seconds: 0.28, recover: 0.36, length: 0.25, depth: 0.12, pressure: 0.72 },
] as const;
const smooth = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const cutPoint = (stroke: typeof STROKES[number], progress: number): CarvingPoint => ({
  ahead: READY.ahead + stroke.length * smooth(progress),
  up: READY.up - stroke.depth * smooth(progress),
});

/** Three short cuts away from the body, then time to inspect the work and reset the grip. */
export function carvingAt(seconds: number, calm = false): CarvingMotion {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const cycle = Math.floor(time / CARVING_PERIOD), at = time - cycle * CARVING_PERIOD;
  let phase: CarvingMotion['phase'] = 'set', stroke: CarvingMotion['stroke'] = 0;
  let cut = 0, clearance = 0, follow = 0, inspect = 0, pitch = -0.45;
  let right = { ...READY };
  if (calm || at >= 2.36) {
    inspect = calm ? 1 : smooth((at - 2.36) / 0.18) * (1 - smooth((at - 2.86) / 0.22));
    phase = calm || at < 3.08 ? 'inspect' : 'set';
    stroke = 2;
    right = { ahead: READY.ahead - 0.08 * inspect, up: READY.up + 0.16 * inspect };
    pitch += 0.75 * inspect;
    clearance = 0.10 * inspect;
  } else {
    for (const [index, step] of STROKES.entries()) {
      stroke = index as CarvingMotion['stroke'];
      if (at < step.at) break;
      const progress = (at - step.at) / step.seconds;
      if (progress <= 1) {
        phase = 'cut';
        right = cutPoint(step, progress);
        cut = Math.sin(Math.PI * progress) ** 2 * step.pressure;
        pitch -= 0.05 * cut;
      } else if (at < step.at + step.seconds + step.recover) {
        phase = 'recover';
        const p = smooth((at - step.at - step.seconds) / step.recover), q = 1 - p;
        const end = cutPoint(step, 1);
        // Cubic return: first lift straight clear, travel back above the work, then lower into the next cut.
        right = {
          ahead: end.ahead + (READY.ahead - end.ahead) * smooth(p),
          up: q ** 3 * end.up + 3 * q * q * p * (end.up + 0.36)
            + 3 * q * p * p * (READY.up + 0.30) + p ** 3 * READY.up,
        };
        pitch += 0.95 * Math.sin(Math.PI * p) ** 2;
        clearance = 0.12 * Math.sin(Math.PI * p) ** 2;
      } else continue;
      // A little head follow-through trails the pressure, without rocking the supporting hand.
      follow = Math.sin(Math.PI * smooth((at - step.at - 0.035) / (step.seconds + 0.08))) ** 2 * step.pressure;
      break;
    }
  }

  const shavings: { id: number; born: number; age: number; right: CarvingPoint }[] = [];
  if (!calm) {
    for (let back = cycle > 0 ? 1 : 0; back >= 0; back--) {
      const from = cycle - back;
      for (const [index, step] of STROKES.entries()) {
        const born = from * CARVING_PERIOD + step.at + step.seconds * 0.62;
        const age = time - born;
        if (age >= 0 && age < CARVING_SHAVING_LIFETIME) {
          shavings.push({ id: from * STROKES.length + index, born, age, right: cutPoint(step, 0.62) });
        }
      }
    }
  }
  return {
    phase, stroke, cut, clearance, right, left: { ...SUPPORT },
    lean: 0.22 + 0.014 * cut - 0.03 * inspect,
    nod: 0.5 + 0.018 * follow - 0.08 * inspect,
    knifeDirection: { ahead: Math.cos(pitch), up: Math.sin(pitch) },
    shavings,
  };
}
