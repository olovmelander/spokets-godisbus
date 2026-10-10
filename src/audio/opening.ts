import type { SceneDef, SceneFrame } from '../sim/scene';
import { MAX_STEPS_PER_FRAME, STEP } from '../sim/constants';
import type { Cue } from './cues';

/** Only crossings sound: a held line, menu or frozen frame never repeats its cue. A newly entered or
 * restarted scene takes up its score where it is, without a burst of everything before that moment. */
export function openingCues(before: SceneFrame | null, now: SceneFrame | null, scenes: readonly SceneDef[]): Cue[] {
  if (!now) return [];
  const from = before?.id === now.id && before.seconds <= now.seconds
    ? before.seconds : Math.max(-1e-6, now.seconds - STEP * MAX_STEPS_PER_FRAME);
  return (scenes.find(scene => scene.id === now.id)?.sounds ?? [])
    .filter(sound => sound.at > from && sound.at <= now.seconds)
    .map(sound => ({ kind: 'story', sound: sound.sound }));
}

/** Leave space for the star's anticipation and Elof's first breath afterward. */
export function openingQuiet(now: SceneFrame | null, scenes: readonly SceneDef[]): boolean {
  const quiet = now && scenes.find(scene => scene.id === now.id)?.soundQuiet;
  return !!quiet && now!.seconds >= quiet[0] && now!.seconds < quiet[1];
}
