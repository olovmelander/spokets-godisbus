import { sv } from '../content/sv';
import { actPose } from './acting';
import { JOINTS, STANDING, type Legs, type Pose } from './rig';
import type { TalkFrame } from './talk';

/**
 * Byn i stormen: down on the far side of the flooded crossing, Elof turns and thanks Moa for her umbrella
 * (../content/aventyr2/chapters/stormbyn.ts, `tack-moa`; Olov, 14 November 2026: "Elof ska tacka Moa efter att han har
 * flugit med paraplyet."), and Moa answers from the wall's edge, where she let go of it, as she hears it: down into her
 * knees with her arm flung up and two hops (./acting.ts `cheer`), and then a big wave back. As Bertil answers for his
 * cap in Granskogen (./cap-thanks.ts).
 *
 * Her right hand has her lamp, which lights him across the water (./lamp-hold.ts keeps that arm still): she cheers and
 * waves with her left, the one that held the umbrella. Timed from when the words came up, on the picture's own clock
 * (the scene's stands still while they are read), and played to its end even if the words are let go early, so that her
 * arm never drops in one frame. With less motion each is held, her arm up.
 */
export const MOA_ANSWERS = { line: 'sbThanksMoa', cheer: 0.45, wave: 2.5, done: 5.6 } as const;

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
/** A gesture keyed for the right arm, done by the left. */
const MIRRORED = [['armL', 'armR'], ['elbowL', 'elbowR'], ['wristL', 'wristR'], ['splayL', 'splayR'], ['outL', 'outR']] as const;

export function createMoaAnswer() {
  const answer: Pose = { ...STANDING };
  /** Seconds since the words came up; below zero, not yet heard (or heard and answered). */
  let since = -1, heard = false;
  return {
    /**
     * Lays Moa's answer over her standing pose (`posed`, changed in place). `dt` is the life clock's step, which runs on
     * while the words are read and stops under Pause.
     */
    update(words: TalkFrame | null | undefined, dt: number, calm: boolean, legs: Legs | undefined, posed: Pose): void {
      const lines: Record<string, string> = sv.lines;
      const hearing = words?.who === 'elof' && words.text === lines[MOA_ANSWERS.line];
      if (hearing && !heard) { heard = true; since = words.seconds; } else if (since >= 0) since += dt;
      if (!hearing) heard = false;
      if (since < 0) return;
      if (since > MOA_ANSWERS.done) { since = -1; return; }
      const t = since - MOA_ANSWERS.cheer;
      if (t <= 0) return;
      const waving = since >= MOA_ANSWERS.wave;
      actPose(waving ? 'wave' : 'cheer', { t: waving ? since - MOA_ANSWERS.wave : t, aim: null, stride: 0, pace: 0, calm, role: 'moa', legs }, answer);
      // The wave is keyed for the right arm: hers is the left.
      if (waving) for (const [left, right] of MIRRORED) [answer[left], answer[right]] = [answer[right], answer[left]];
      // Into it over a moment from however she stood, and out of it at the end. Each act hands itself back to standing
      // when it is over (./acting.ts `ENDS`), so the cheer has come down before the wave goes up.
      const w = calm ? 1 : smooth(t / 0.2) * (1 - smooth((since - MOA_ANSWERS.done + 0.4) / 0.4));
      for (const joint of JOINTS) posed[joint] += (answer[joint] - posed[joint]) * w;
      posed.bounce += (answer.bounce - posed.bounce) * w;
    },
  };
}
