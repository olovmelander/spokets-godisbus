import { sceneWaits, type SceneDef, type SceneFrame } from './scene';

/**
 * A walk staged after a chapter's goal: Gården's, on through the arch in the hedge and into the forest (Olov, 13 November
 * 2026; ../content/chapters/garden.ts `skogen`). It is the coda's picture, and the last page waits for it: until it is a
 * second from its end, so that the page's photo is of him going, and turns before the scene is over and puts him back
 * at the goal. One that a save has already seen is not waited for.
 */
export function walkOffOf(chapter: { scenes?: readonly SceneDef[] }): SceneDef | undefined {
  return chapter.scenes?.find((scene) => scene.on === 'goal' && scene.hold);
}

/** Whether the last page may turn as far as the walk-off is concerned: there is none, it has been seen, or he has gone. */
export function walkedOff(walkOff: SceneDef | undefined, flags: Pick<ReadonlySet<string>, 'has'>, frame: SceneFrame | null): boolean {
  return !walkOff || !sceneWaits(walkOff, flags) || (frame?.id === walkOff.id && frame.seconds >= walkOff.seconds - 1);
}
