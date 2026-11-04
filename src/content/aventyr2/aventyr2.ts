import type { ChapterData } from '../../sim/types';
import { addAdventure2 } from '../chapters';
import { PACK_CONTEXTS } from '../story-context';
import { sv } from '../sv';
import { CHAPTER_PICTURE, DRAWING, PICTURE } from '../../ui/map';
import { ARRANGEMENTS } from '../../audio/music';
import { contextFor, type Chooser } from './context';
import { installPictures } from './render';
import { A2 } from './sv';
import * as stormkvall from './chapters/stormkvall';
import * as stormgard from './chapters/stormgard';
import * as stormskog from './chapters/stormskog';
import * as stormbyn from './chapters/stormbyn';
import * as sjon from './chapters/sjon';
import * as stormoga from './chapters/stormoga';
import * as morgonen from './chapters/morgonen';

/**
 * Äventyr 2, Stormnatten (docs/aventyr-2.md): the pack's entry. Importing it puts the adventure into the game:
 * its chapters into COURSES, its words into `sv`, its reminders into the story context and its pictures into the
 * renderer's extension points. src/content/chapters/index.ts loads it only when it is needed.
 */

const MODULES: { chapter: ChapterData; context: Chooser }[] = [
  { chapter: stormkvall.stormkvall, context: stormkvall.context },
  { chapter: stormgard.stormgard, context: stormgard.context },
  { chapter: stormskog.stormskog, context: stormskog.context },
  { chapter: stormbyn.stormbyn, context: stormbyn.context },
  { chapter: sjon.sjon, context: sjon.context },
  { chapter: stormoga.stormoga, context: stormoga.context },
  { chapter: morgonen.morgonen, context: morgonen.context },
];

/** Äventyr 2's chapters, in the order they are played. In all of them the ghost is Klonk, named and a friend. */
export const AVENTYR2: ChapterData[] = MODULES.map((module) => Object.assign(module.chapter, { named: true }));

/** The first adventure's bubbles, as they were before this pack's were added: none of its keys is said over. */
export const FIRST_LINES: readonly string[] = Object.keys(sv.lines);

const into = (target: object, source: object) => Object.assign(target as Record<string, unknown>, source);
into(sv.lines, A2.lines);
into(sv.verbs, A2.verbs);
into(sv.scene, A2.scene);
into(sv.explore.chapters, A2.explore);
into(sv.end.kickers, A2.end.kickers);
into(sv.end.headings, A2.end.headings);
into(sv.end.closing, A2.end.closing);
into(sv.storyContext.handoffs, A2.handoffs);
into(sv.dialogue.moments, A2.moments);
into(CHAPTER_PICTURE, {
  stormkvall: DRAWING.star, stormgard: PICTURE.home, stormskog: PICTURE.forest, stormbyn: DRAWING.shop,
  sjon: PICTURE.brook, stormoga: PICTURE.bog, morgonen: DRAWING.party,
});
// The tune, played for a stormy night: lower and sparser in the storm, with the wind's air under it; the
// storm's eye slow and full under the stars, and the morning after bright again.
into(ARRANGEMENTS, {
  stormkvall: { tempo: 80, melody: 'sparse', bass: true, rhythm: 'none', transpose: -5, rest: 3, bright: 0.4, ambience: 'room' },
  stormgard: { tempo: 96, melody: 'full', bass: true, rhythm: 'none', transpose: -2, rest: 2, bright: 0.45, ambience: 'wind' },
  stormskog: { tempo: 84, melody: 'sparse', bass: true, rhythm: 'none', transpose: -12, rest: 3, bright: 0.3, ambience: 'wind' },
  stormbyn: { tempo: 100, melody: 'full', bass: true, rhythm: 'knock', transpose: -2, rest: 1, bright: 0.5, ambience: 'wind' },
  sjon: { tempo: 78, melody: 'sparse', bass: false, rhythm: 'none', transpose: -5, rest: 3, bright: 0.3, ambience: 'wind' },
  stormoga: { tempo: 72, melody: 'full', bass: true, rhythm: 'none', transpose: 0, rest: 2, bright: 0.5, ambience: 'night' },
  morgonen: { tempo: 100, melody: 'full', bass: true, rhythm: 'none', transpose: 0, rest: 1, bright: 0.75, ambience: 'birds' },
} satisfies typeof ARRANGEMENTS);
for (const { chapter, context } of MODULES) PACK_CONTEXTS.set(chapter.id, contextFor(context));
installPictures();
addAdventure2(AVENTYR2);
