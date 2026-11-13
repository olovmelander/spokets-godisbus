import { sv } from '../content/sv';
import { actPose } from './acting';
import { JOINTS, STANDING, type Legs, type Pose } from './rig';
import type { TalkFrame } from './talk';

/**
 * Granskogen: over the pool and out of his cap, Elof turns and thanks Bertil (../content/chapters/granskog.ts,
 * `tack-bertil`), and Bertil answers from the far bank as he hears it: down into his knees with both arms flung up in a V
 * and two hops (./acting.ts `cheer`), and then a big wave back. Timed from when the words came up, as one who hears them
 * (the scene's own clock stands still while they are read), and played to its end even if the words are let go early,
 * so that he never drops his arms in one frame. With reduced motion each is held, arms up.
 */
export const BERTIL_ANSWERS = { line: 'forestThanksBertil', cheer: 0.45, wave: 2.5, done: 5.6 } as const;

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function createBertilAnswer() {
  const answer: Pose = { ...STANDING };
  /** Seconds since the words came up; below zero, not yet heard (or heard and answered). */
  let since = -1, heard = false;
  return {
    /** Lays Bertil's answer over his standing pose (`posed`, changed in place). `dt` is 0 while the game is paused. */
    update(words: TalkFrame | null | undefined, dt: number, calm: boolean, legs: Legs | undefined, posed: Pose): void {
      const hearing = words?.who === 'elof' && words.text === sv.lines[BERTIL_ANSWERS.line];
      if (hearing && !heard) { heard = true; since = words.seconds; } else if (since >= 0) since += dt;
      if (!hearing) heard = false;
      if (since < 0) return;
      if (since > BERTIL_ANSWERS.done) { since = -1; return; }
      const t = since - BERTIL_ANSWERS.cheer;
      if (t <= 0) return;
      const waving = since >= BERTIL_ANSWERS.wave;
      actPose(waving ? 'wave' : 'cheer', { t: waving ? since - BERTIL_ANSWERS.wave : t, aim: null, stride: 0, pace: 0, calm,
        role: 'bertil', legs }, answer);
      // Into it over a moment from however he stood, and out of it at the end. Each act hands itself back to standing when
      // it is over (acting.ts `ENDS`), so the cheer has come down before the wave goes up.
      const w = calm ? 1 : smooth(t / 0.2) * (1 - smooth((since - BERTIL_ANSWERS.done + 0.4) / 0.4));
      for (const joint of JOINTS) posed[joint] += (answer[joint] - posed[joint]) * w;
      posed.bounce += (answer.bounce - posed.bounce) * w;
    },
  };
}
