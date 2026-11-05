import type { ChapterWords } from './words';

/** What is said in Morgonen efter, the second adventure's epilogue (docs/aventyr-2.md). */
export const words: ChapterWords = {
  lines: {
    moMorning: 'God morgon, mina sjusovare!',
    moBranches: 'Min stövel är fortfarande en sjö!',
    moSleepy: 'Jag är trött som en uggla på dagen.',
    moShelf: 'Hyllan väntar på två små gubbar.',
    moMormor: 'Chokladen är klar. Vem vill ha?',
    moMorfar: 'Elof! Så stor du har blivit!',
    moOldHome: 'Först i raden. Där hör du hemma.',
    moSmallHome: 'Och du bredvid. Nu är ni två.',
    moLatchLine: 'En ny hake. Nu blåser ingen bort.',
    moFluffLine: 'Du flög som ett fjun i stormen.',
    moNameLine: 'Du ska heta Fjun!',
    moKlonkLine: 'Klonk, klonk!',
    moNiceLine: 'Fjun! Vilket fint namn.',
    moWelcomeLine: 'Välkommen hem, lilla Fjun.',
    moKnewLine: 'Det var du som tände min lampa, va?',
    moAnswerLine: 'Du lyste för mig. Jag lyste för dig.',
    moCupLine: 'Varm choklad efter stormen.',
    moAllLine: 'Alla är hemma. Det är bäst av allt.',
  },
  verbs: {
    moPutOld: 'Ställ upp trägubben',
    moPutSmall: 'Ställ upp lillgubben',
    moLatch: 'Vrid fönsterhaken',
    moCocoa: 'Ta en kopp choklad',
  },
  purposes: {
    moShelfPurpose: { purpose: 'Ställ tillbaka gamla trägubben på hyllan.', recap: 'Stormen är över. Alla kom hem i natt.' },
    moSmallPurpose: { purpose: 'Ställ lillgubben bredvid den gamla.', recap: 'Gamla trägubben står först i raden igen.' },
    moLatchPurpose: { purpose: 'Vrid den nya fönsterhaken.', recap: 'Båda trägubbarna står på hyllan. Pappa har satt en ny hake på fönstret.' },
    moNamePurpose: { purpose: 'Ge lillgubben ett namn.', recap: 'Nu är vårt fönster ordentligt stängt.' },
    moCocoaPurpose: { purpose: 'Ta en kopp varm choklad.', recap: 'Lillgubben heter Fjun, för att han flög som ett fjun i stormen.' },
    moSunday: { purpose: 'Ut i söndagsmorgonen.', recap: 'Ingen ska behöva vara ensam i mörkret.' },
  },
  helpers: {
    moFamily: 'Hela familjen äter frukost, och mormor och morfar är med.',
    moPappa: 'Pappa har lagat fönstret.',
  },
  moments: { frukost: 'Morgonen efter' },
};
