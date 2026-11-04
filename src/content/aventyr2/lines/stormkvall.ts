import type { ChapterWords } from './words';

/** What is said in Stormkvällen, the second adventure's beginning (docs/aventyr-2.md). */
export const words: ChapterWords = {
  lines: {
    skPower: 'Strömmen gick! Jag tänder ljusen.',
    skLamp: 'Var är ficklampan? Jag ser ingenting!',
    skLampThanks: 'Tack, Elof! Nu ser vi något i mörkret.',
    skShip: 'Huset knakar som ett skepp!',
    skWind: 'Jag säger godnatt till trägubbarna.',
    skGoodnightLine: 'Godnatt, båda två. Sov gott!',
    skWindow: 'Fönstret! Det blåste upp!',
    skTaken: 'Lillgubben! Vinden tog honom!',
    skLeapt: 'Och gamla trägubben hoppade efter!',
    skEmpty: 'Två platser på hyllan är tomma …',
    skSearch: 'Då letar vi efter dem, allihop!',
    skKlonk: 'Klonk!',
    skOneStar: 'Du har en stjärna kvar i påsen!',
    skSmall: 'Liten igen! Nu kan jag hitta dem.',
    skMoaSmall: 'Små kan hitta små, lillebror!',
    skTogether: 'Regnrockar på! Vi går ut med lampor.',
    skPappaLamp: 'Jag lyser för dig hela vägen.',
    skBoots: 'Jag tar mina största stövlar!',
    skUmbrella: 'Och jag tar mitt paraply!',
    skOut: 'Vi kommer, lillgubben! Håll ut!',
    skTrail: 'Ett godis på golvet! Ett spår!',
    skKlonkHop: 'Klonk, klonk!',
    skRainLine: 'Brr! Dropparna är stora som bollar.',
  },
  verbs: { skGoodnight: 'Säg godnatt', skTakeLamp: 'Ta ficklampan' },
  purposes: {
    skEvening: { purpose: 'Lyssna på stormen.', recap: 'Det är lördagskväll, och stormen viner runt huset.' },
    skFetchLamp: { purpose: 'Hämta ficklampan åt Pappa.', recap: 'Strömmen gick. Pappa letar efter ficklampan i mörkret.' },
    skGiveLamp: { purpose: 'Ge ficklampan till Pappa.', recap: 'Ficklampan låg på bordet. Pappa står vid fönstret.' },
    skGoodnightPurpose: { purpose: 'Säg godnatt till trägubbarna på hyllan.', recap: 'Strömmen gick. Mamma har tänt ljus, och det blåser.' },
    skStar: { purpose: 'Smaka på Klonks stjärna.', recap: 'Stormen tog lillgubben ut genom fönstret, och gamla trägubben hoppade efter.' },
    skShrinking: { purpose: 'Stjärnan gör mig liten.', recap: 'Klonk gav mig sin sista stjärna. Små kan hitta små.' },
    skFollowTrail: { purpose: 'Följ godisspåret ut i stormen.', recap: 'Gamla trägubben lämnar godis åt mig. Han följer efter lillgubben.' },
  },
  helpers: {
    skFamilyHome: 'Hela familjen är här hemma, i skenet från ljusen.',
    skFamilyLamps: 'Familjen går ut med lampor och letar på den stora vägen.',
  },
  moments: {
    kvall: 'Stormkvällen', fonstret: 'Fönstret slår upp', klonkstar: 'Klonks stjärna', krymper: 'Stjärnans magi',
    tillsammans: 'Vi letar tillsammans', stormtitel: 'Äventyret börjar',
  },
};
