import type { ChapterWords } from './lines/words';
import { words as stormkvall } from './lines/stormkvall';
import { words as stormgard } from './lines/stormgard';
import { words as stormskog } from './lines/stormskog';
import { words as stormbyn } from './lines/stormbyn';
import { words as sjon } from './lines/sjon';
import { words as stormoga } from './lines/stormoga';
import { words as morgonen } from './lines/morgonen';

/**
 * Äventyr 2's words (docs/aventyr-2.md): everything the player reads in it, in Swedish. The pack merges them into
 * `sv` when it loads (./aventyr2.ts), so the rest of the game finds them where it finds the first adventure's.
 */

export const CHAPTER_WORDS: Record<string, ChapterWords> = { stormkvall, stormgard, stormskog, stormbyn, sjon, stormoga, morgonen };

const merged = <K extends keyof ChapterWords>(key: K) => Object.assign({}, ...Object.values(CHAPTER_WORDS).map((words) => words[key] ?? {})) as NonNullable<ChapterWords[K]>;

export const A2 = {
  /** The adventure's own name, on its first card and in Utforska vidare. */
  name: 'Äventyr 2: Stormnatten',
  lines: merged('lines'),
  verbs: merged('verbs'),
  purposes: merged('purposes'),
  helpers: merged('helpers'),
  moments: merged('moments'),
  // Each chapter's time card: where, and when (plan §4.9).
  scene: {
    stormkvall: 'Stormkvällen · lördag kväll',
    stormgard: 'Stormgården · klockan åtta',
    stormskog: 'Stormskogen · klockan nio',
    stormbyn: 'Byn i stormen · klockan tio',
    sjon: 'Sjön · klockan elva',
    stormoga: 'Stormens öga · vid midnatt',
    morgonen: 'Morgonen efter · söndag',
    a2title: 'Stormnatten',
  } as Record<string, string>,
  explore: {
    stormkvall: 'Stormkvällen', stormgard: 'Stormgården', stormskog: 'Stormskogen', stormbyn: 'Byn i stormen',
    sjon: 'Sjön', stormoga: 'Stormens öga', morgonen: 'Morgonen efter',
  } as Record<string, string>,
  end: {
    kickers: {
      stormkvall: 'Äventyr 2 · Början', stormgard: 'Äventyr 2 · Kapitel 1', stormskog: 'Äventyr 2 · Kapitel 2',
      stormbyn: 'Äventyr 2 · Kapitel 3', sjon: 'Äventyr 2 · Kapitel 4', stormoga: 'Äventyr 2 · Finalen', morgonen: 'Äventyr 2 · Slutet',
    } as Record<string, string>,
    headings: { morgonen: 'Slut' } as Record<string, string>,
    closing: {
      morgonen: 'Ingen ska behöva vara ensam i mörkret.',
    } as Record<string, string>,
  },
  /** A bridge to the next place, inside the chapter's last card. */
  handoffs: {
    stormkvall: { title: 'Ut i stormen', text: 'Gamla trägubben lämnar godis åt mig. Jag följer spåret, och familjen letar med sina lampor.' },
    stormgard: { title: 'Vidare till skogen', text: 'Blixten visade lillgubben över häcken. Klonk och jag följer efter in i skogen.' },
    stormskog: { title: 'Ner mot byn', text: 'Gamla trägubben väntar inte på någon. Den vet hur det är att vara ensam i mörkret.' },
    stormbyn: { title: 'Ner till sjön', text: 'Rännstenen rinner ner till sjön. Dit har vattnet tagit lillgubben.' },
    sjon: { title: 'Ut på sjön', text: 'Där ute, på en sten i vågorna: båda trägubbarna. Ugglan kommer tillbaka.' },
    stormoga: { title: 'Hem igen', text: 'Alla är hittade. Familjens lampor lyser hela vägen hem.' },
  } as Record<string, { title: string; text: string }>,
};
