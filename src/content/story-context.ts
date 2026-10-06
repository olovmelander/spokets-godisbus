import { sv } from './sv';
import type { Vec } from '../sim/types';

/** The purpose line's pictures (src/ui/sprite.ts): what Elof is doing, drawn, not typed. */
export type PurposeIcon = 'trail' | 'heart' | 'sparkle' | 'brush' | 'knife' | 'mountain' | 'water' | 'house' | 'village';

export type StoryPurpose = keyof typeof sv.storyContext.purposes;
type Helper = keyof typeof sv.storyContext.helpers;
export interface StoryContext {
  id: StoryPurpose;
  icon: PurposeIcon;
  purpose: string;
  reveal: string | null;
  recap: string;
  family: string;
}
type History = Readonly<Record<string, readonly string[]>>;

/** A reminder of what Elof knows now. Reads existing progress; never unlocks or repeats a story beat. */
export function storyContext(chapter: string, flags: ReadonlySet<string>, player: Vec, history: History = {}): StoryContext | null {
  const has = (flag: string) => flags.has(flag);
  const at = player.x;
  const knownFigure = chapter === 'berget' ? has('memory') : !!history.berget?.includes('memory');
  const homeParty = ['placed:tragubbe', 'eyes', 'bag'].every((flag) =>
    chapter === 'norrsken' ? has(flag) : history.norrsken?.includes(flag));
  const context = (id: StoryPurpose, helper: Helper, icon: PurposeIcon = 'trail', addition?: string): StoryContext => {
    const copy = sv.storyContext.purposes[id];
    const story = addition ? `${copy.recap} ${addition}` : copy.recap;
    const recap = homeParty && id !== 'welcome' && (chapter === 'norrsken' || chapter === 'epilog')
      ? `${story} ${knownFigure ? sv.storyContext.welcomeMemory : sv.storyContext.welcomeFigure}` : story;
    const reveal = chapter === 'norrsken' && homeParty
      ? knownFigure ? sv.storyContext.purposes.welcome.recap : sv.storyContext.welcomeFigure : null;
    return { id, icon, purpose: copy.purpose, reveal, recap, family: sv.storyContext.helpers[helper] };
  };
  switch (chapter) {
    case 'prolog':
      if (has('pappa:done')) return context('handoff', 'trail');
      if (has('star') && has('scene:familj') && !has('hand') && !has('pappa:noticed')) return context('hand', 'home', 'heart');
      if (has('star')) return context(has('pappa:noticed') ? 'handoff' : 'tiny', 'trail', 'sparkle');
      if (has('bag:torn')) return context('starTrail', 'home', 'sparkle');
      if (has('blink')) return context('chase', 'home');
      if (has('paint')) return context('awakening', 'home', 'sparkle');
      return context(has('eye') ? 'paintSecond' : 'paint', 'home', 'brush');
    case 'garden':
      if (has('plane:board')) return context('plane', 'moa');
      if (has('moa')) {
        if (has('garden:pocket-open') && at >= 138 && at <= 146 && player.y < 3.1) {
          return context(has('garden:paper') ? 'gardenClimb' : 'gardenDrawing', 'moa');
        }
        if (has('garden:paper') && !has('garden:shared-paper') && at >= 138 && at <= 166.8) {
          return context('gardenReturnDrawing', 'moa');
        }
        if (has('garden:pocket-open') && !has('garden:paper') && at >= 138 && at <= 146) {
          return context('gardenPocket', 'moa');
        }
        if (at >= 159) return context('planeBoard', 'moa');
        return context(has('memory') ? 'gardenMemory' : 'garden', 'trail');
      }
      if (at >= 159) return context('moa', 'moa');
      return context(has('memory') ? 'gardenMemory' : 'garden', 'trail');
    case 'granskog':
      if (has('placed:rescue')) return context('waiting', 'forest', 'trail');
      if (at >= 179) return context('eddy', 'bertil', 'heart');
      if (has('cap')) return context('capRide', 'bertil', 'water');
      if (at >= 150) return context('cap', 'bertil', 'water');
      if (has('placed:cone') && !has('launch')) return context('launch', 'pappa');
      if (has('seesaw:trial') && !has('launch')) return context('coneRetry', 'pappa');
      if (has('placed:cone-small') && !has('launch')) return context('coneTrial', 'pappa');
      if (has('seesaw') && !has('launch')) return context('cone', 'pappa');
      if (at >= 103 && !has('seesaw')) return context('seesaw', 'pappa');
      if (at >= 31 && at < 46 && !has('jay')) return context('jay', 'forest', 'heart');
      return context(has('keepsake:vittra') ? 'vittraClue' : has('beat:vittra') ? 'forestDoor' : 'forest', 'forest');
    case 'myren':
      if (has('crane')) return context('crane', 'bog', 'mountain');
      if (has('home')) {
        if (has('placed:bog-boardwalk') && at >= 139 && at < 167.4 && player.y >= -1 && player.y < 1.7) {
          return context(has('bog:lantern-return') ? 'bogReturn' : 'bogLantern', 'bogLoop');
        }
        const clearing = at >= 167.4 && at <= 182;
        const addition = !clearing ? undefined : has('placed:bog-boardwalk')
          ? sv.storyContext.loopRecaps[has('bog:lantern-return') ? 'bogReturned' : 'bogReady']
          : has('bog:return-bridge') ? sv.storyContext.loopRecaps.bogBuilding : undefined;
        return context('pine', 'bog', 'mountain', addition);
      }
      if (has('chick')) return context('chick', 'bog', 'heart');
      if (has('light')) return context('mist', 'bog', 'sparkle');
      if (at >= 133) return context('light', 'bog', 'sparkle');
      if (at >= 98 && !has('braid')) return context('braid', 'bog');
      if (at >= 80 && !has('mamma')) return context('mamma', 'bog', 'water');
      return context('bog', 'bog');
    case 'berget':
      if (has('found:chokladpralin') && at >= 145 && at <= 154 && player.y >= 32.9) return context('mountainReturn', 'mountain');
      if (knownFigure) return context('figure', 'mountain', 'heart');
      if (has('lift')) return context('tall', 'mountain');
      if (at >= 139) return context('lift', 'mountain', 'heart');
      return context('mountain', 'mountain', 'mountain');
    case 'norrsken':
      if (has('home')) return context('home', 'reunion', 'house');
      if (has('taste')) return context('reunion', 'reunion', 'house');
      if (has('shared')) return context('gold', 'mountain', 'sparkle');
      if (!has('placed:tragubbe')) return context(has('lower') ? 'pull' : knownFigure ? 'figure' : 'crack', 'mountain', 'heart');
      if (!has('eyes')) return context('eyes', 'mountain', 'brush');
      if (!has('bag')) return context('bag', 'mountain');
      return context(knownFigure ? 'welcome' : 'share', 'mountain', 'heart');
    case 'epilog':
      if (has('teeth')) return context('bed', 'carving', 'house');
      if (has('dots')) return context('teeth', 'carving', 'house');
      if (has('cut3')) return context('paintOwn', 'carving', 'brush');
      if (has('knife')) return context('carve', 'carving', 'knife');
      if (has('partied')) return context('carveStart', 'carving', 'knife');
      return context('party', 'home', 'heart');
    case 'byn':
      return context(at >= 124 ? 'shopDone' : at >= 111 ? 'shop' : 'village', 'village', 'village');
    default: return null;
  }
}

/** A bridge to the next place, shown inside the existing chapter card without a second dialog. */
export function storyHandoff(chapter: string, flags: ReadonlySet<string>): { title: string; text: string } | null {
  const rescued = ['placed:tragubbe', 'eyes', 'bag'].every((flag) => flags.has(flag));
  const id = chapter === 'garden' && !flags.has('plane:board') ? 'gardenClue'
    : chapter === 'epilog' && !flags.has('partied') ? 'epilogClue'
    : chapter === 'berget' && !flags.has('memory') ? 'bergetClue'
    : chapter === 'granskog' && !flags.has('placed:rescue') ? 'granskogClue'
    : chapter === 'myren' && !flags.has('home') ? 'myrenClue'
    : chapter === 'norrsken' && !rescued ? 'norrskenClue'
    // Pappa tells the origin at Smaka, separately from the optional mountain memory.
    : chapter === 'norrsken' && flags.has('taste') ? 'norrskenOrigin' : chapter;
  const handoffs = sv.storyContext.handoffs;
  return Object.hasOwn(handoffs, id) ? handoffs[id as keyof typeof handoffs] : null;
}
