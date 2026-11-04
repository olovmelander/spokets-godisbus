import type { PurposeIcon, StoryContext } from '../story-context';
import type { Speaker, Vec } from '../../sim/types';
import { A2 } from './sv';

/**
 * The reminder of what Elof is doing now, for Äventyr 2's chapters (src/content/story-context.ts): the line under
 * "Just nu", what has happened so far, and who in the family is helping. Each chapter says which purpose holds.
 */
export type Chooser = (has: (flag: string) => boolean, player: Vec) => readonly [purpose: string, helper: string, icon?: PurposeIcon, guide?: Speaker];

export function contextFor(choose: Chooser) {
  return (flags: ReadonlySet<string>, player: Vec): StoryContext | null => {
    const [id, helper, icon = 'trail', guide] = choose((flag) => flags.has(flag), player);
    const copy = A2.purposes[id];
    if (!copy) return null;
    return {
      id: id as StoryContext['id'], icon, purpose: copy.purpose, reveal: null, recap: copy.recap,
      family: A2.helpers[helper] ?? '', ...(guide ? { guide } : {}),
    };
  };
}
