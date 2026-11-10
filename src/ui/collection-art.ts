import { isStormMemory, STORM_MEMORIES } from '../content/collections';
import { storyIllustration } from './story-illustrations';

/** Reuse the story's own pictures: the album is a record of discoveries, not a second visual retelling. */
export function stormMemoryPictures(id: string): string[] | undefined {
  return isStormMemory(id) ? STORM_MEMORIES[id].pictures.map(key => storyIllustration(key)) : undefined;
}
