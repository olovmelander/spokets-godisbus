import type { Verb } from '../sim/types';
import type { IconId } from './sprite';

/**
 * Använd's picture for each thing he can do (docs/ux-audit/in-play.md row 6): the word's own where it has one, else
 * the verb's. The open hand is only for when there is nothing to do.
 */
export const VERB_ICON: Record<string, IconId> = {
  // By the verb.
  slide: 'slide', lace: 'lace', push: 'push', pull: 'push', turn: 'push', take: 'take', call: 'call', give: 'give', grab: 'take',
  // By the word, where it says more than its verb.
  callMoa: 'call', callPappa: 'call', callBertil: 'call', callMamma: 'call',
  gardenBoard: 'climb', capBoard: 'climb', climbOn: 'climb', board: 'climb', rideAnts: 'climb', standOn: 'climb',
  gardenGiveDrawing: 'give', giveTragubbe: 'give', giveGhost: 'give', giveJay: 'give', giveMamma: 'give', givePappa: 'give',
  giveMoa: 'give', giveBertil: 'give', leaveBerry: 'give',
  takeLight: 'take', takeBag: 'take', takeKnife: 'take', pick: 'take',
  lift: 'push', lowerLace: 'lace',
  paintEyes: 'brush', paintGhost: 'brush', carve: 'knife', brush: 'toothbrush', taste: 'taste', tasteStar: 'taste', goHome: 'house',
};

/** The picture for what Använd does now. */
export function verbIcon(verb: Verb | null, word?: string | null): IconId {
  if (!verb) return 'hand';
  return VERB_ICON[word ?? verb] ?? VERB_ICON[verb] ?? 'hand';
}
