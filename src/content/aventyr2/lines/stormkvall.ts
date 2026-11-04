import type { ChapterWords } from './words';

/** What is said in Stormkvällen, the second adventure's beginning (docs/aventyr-2.md). */
export const words: ChapterWords = {
  lines: {
    skPower: 'Strömmen gick! Jag tänder ljusen.',
    skLamp: 'Ficklampan ligger i lådan.',
    skShip: 'Huset knakar som ett skepp!',
    skWind: 'Jag säger godnatt till trägubbarna.',
    skGoodnightLine: 'Godnatt, båda två. Sov gott!',
    skWindow: 'Fönstret! Det blåste upp!',
    skTaken: 'Lillgubben! Vinden tog honom!',
    skLeapt: 'Och gamla trägubben hoppade efter!',
    skEmpty: 'Två platser på hyllan är tomma …',
    skSearch: 'Då letar vi. Allihop, tillsammans.',
    skKlonk: 'Klonk!',
    skOneStar: 'Du har en stjärna kvar i påsen!',
    skSmall: 'Liten igen! Nu kan jag hitta dem.',
    skMoaSmall: 'Små hittar små, lillebror!',
    skTogether: 'Regnrockar på! Vi går ut med lampor.',
    skPappaLamp: 'Jag lyser åt dig hela vägen.',
    skBoots: 'Jag tar mina största stövlar!',
    skUmbrella: 'Och jag tar mitt paraply!',
    skOut: 'Vi kommer, lillgubben! Håll ut!',
    skTrail: 'Ett godis på golvet! Ett spår!',
    skKlonkHop: 'Klonk, klonk!',
    skRainLine: 'Brr! Dropparna är stora som bollar.',
  },
  verbs: { skGoodnight: 'Säg godnatt' },
  purposes: {
    skEvening: { purpose: 'Lyssna på stormen.', recap: 'Det är lördagskväll, och stormen viner runt huset.' },
    skGoodnightPurpose: { purpose: 'Säg godnatt till trägubbarna på hyllan.', recap: 'Strömmen gick. Mamma har tänt ljus, och det blåser.' },
    skStar: { purpose: 'Smaka på Klonks stjärna.', recap: 'Stormen tog lillgubben ut genom fönstret, och gamla trägubben hoppade efter.' },
    skShrinking: { purpose: 'Stjärnan gör mig liten.', recap: 'Klonk gav mig sin sista stjärna. Små hittar små.' },
    skFollowTrail: { purpose: 'Följ godisspåret ut i stormen.', recap: 'Gamla trägubben lämnar godis åt mig. Den följer efter lillgubben.' },
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
