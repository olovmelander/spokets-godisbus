import type { ChapterWords } from './lines/words';
import { words as stormkvall } from './lines/stormkvall';
import { words as stormgard } from './lines/stormgard';
import { words as stormskog } from './lines/stormskog';
import { words as stormbyn } from './lines/stormbyn';
import { words as olympia } from './lines/olympia';
import { words as flarken } from './lines/flarken';
import { words as alven } from './lines/alven';
import { words as billsta } from './lines/billsta';
import { words as stormoga } from './lines/stormoga';
import { words as morgonen } from './lines/morgonen';

/**
 * Äventyr 2's words (docs/aventyr-2.md): everything the player reads in it, in Swedish. The pack merges them into
 * `sv` when it loads (./aventyr2.ts), so the rest of the game finds them where it finds the first adventure's.
 */

export const CHAPTER_WORDS: Record<string, ChapterWords> = { stormkvall, stormgard, stormskog, stormbyn, olympia, flarken, alven, billsta, stormoga, morgonen };

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
    olympia: 'Olympia · halv elva',
    flarken: 'Flärken · klockan elva',
    alven: 'Älven · halv tolv',
    billsta: 'Billsta · nästan midnatt',
    stormoga: 'Stormens öga · vid midnatt',
    morgonen: 'Morgonen efter · söndag',
    a2title: 'Stormnatten',
  } as Record<string, string>,
  explore: {
    stormkvall: 'Stormkvällen', stormgard: 'Stormgården', stormskog: 'Stormskogen', stormbyn: 'Byn i stormen',
    olympia: 'Olympia', flarken: 'Flärken', alven: 'Älven', billsta: 'Billsta', stormoga: 'Stormens öga', morgonen: 'Morgonen efter',
  } as Record<string, string>,
  end: {
    kickers: {
      stormkvall: 'Äventyr 2 · Början', stormgard: 'Äventyr 2 · Kapitel 1', stormskog: 'Äventyr 2 · Kapitel 2',
      stormbyn: 'Äventyr 2 · Kapitel 3', olympia: 'Äventyr 2 · Kapitel 4', flarken: 'Äventyr 2 · Kapitel 5',
      alven: 'Äventyr 2 · Kapitel 6', billsta: 'Äventyr 2 · Kapitel 7', stormoga: 'Äventyr 2 · Finalen', morgonen: 'Äventyr 2 · Slutet',
    } as Record<string, string>,
    headings: { morgonen: 'Slut' } as Record<string, string>,
    closing: {
      morgonen: 'Ingen ska behöva vara ensam i mörkret.',
    } as Record<string, string>,
  },
  /** A bridge to the next place, inside the chapter's last card. */
  handoffs: {
    stormkvall: { title: 'Ut i stormen', text: 'Gamla trägubben lämnar godis åt mig. Jag följer spåret, och familjen letar med sina lampor.' },
    stormgard: { title: 'Vidare till skogen', text: 'I blixtens sken flög lillgubben över häcken. Klonk och jag följer efter in i skogen.' },
    stormskog: { title: 'Ner mot byn', text: 'Gamla trägubben väntar inte på någon. Han vet hur det är att vara ensam i mörkret.' },
    stormbyn: { title: 'Mot Olympia', text: 'Vinden tog lillgubben över taken mot fotbollsplanen. Gamla trägubben är redan på väg.' },
    flarken: { title: 'Nerför ån', text: 'Trä flyter. Ån bär lillgubben söderut, och gamla trägubben följer efter på en stock.' },
    olympia: { title: 'Upp till Flärken', text: 'Den starkaste stormbyn tog lillgubben norrut, upp mot sjön vid Flärken.' },
    alven: { title: 'Till Billsta', text: 'Älven bär trägubbarna mot Billsta. Vi kör de tre milen dit, till mormor och morfar.' },
    billsta: { title: 'Ner till sundet', text: 'Från Billaberget syns de: båda trägubbarna på en sten nere i sundet.' },
    stormoga: { title: 'Hem igen', text: 'Alla är hittade. Mormor och morfar följer med hem till frukost.' },
  } as Record<string, { title: string; text: string }>,
};
