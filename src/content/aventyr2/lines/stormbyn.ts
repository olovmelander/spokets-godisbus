import type { ChapterWords } from './words';

/** What is said in Byn i stormen (docs/aventyr-2.md): at most about 40 characters a line, Swedish, no names but the family's. */
export const words: ChapterWords = {
  lines: {
    // The street, dark: the storm has cut the power in the whole village, as at home. The only light behind the glass is a
    // candle someone has lit.
    sbDark: 'Strömmen har gått här också!',
    sbKlonkHere: 'Klonk!',
    sbAwning: 'Markisen studsar som en studsmatta!',
    sbCandle: 'Någon hörde mig! Tack för ljuset.',
    sbCandleTwo: 'Skomakaren tände ett ljus. Tack!',
    sbCandleThree: 'Bagaren tände ett ljus. Där är trappan!',
    // Rännstensforsen, and the grate.
    sbRiver: 'Rännstenen har blivit en fors!',
    // The high wall, and Moa's umbrella. She calls him lillebror.
    sbMoaHere: 'Lillebror! Ropa, så får du mitt paraply!',
    sbMoaHold: 'Håll i paraplyet, så svävar du!',
    sbFloat: 'Jag svävar som ett maskrosfrö!',
    sbMoaLanded: 'Där landade mitt lilla maskrosfrö!',
    // The swinging sign, and the little one's cap in the gutter.
    sbCap: 'Lillgubbens mössa! Jag tar med den.',
    sbToLake: 'Godisspåret går mot fotbollsplanen!',
    sbKlonkCap: 'Klonk, klonk!',
    // The awnings pour, and the steps go up towards Olympia.
    sbShore: 'Vi är på väg, lillgubben!',
  },
  verbs: { sbUmbrella: 'Håll i paraplyet', sbRing: 'Dra i klocksnöret' },
  purposes: {
    sbStreet: { purpose: 'Följ godisspåret genom den mörka byn.', recap: 'Strömmen har gått i hela byn. Gamla trägubben lämnar godis åt mig.' },
    sbRiver: { purpose: 'Åk på björklövet nerför rännstenen.', recap: 'Regnet har gjort rännstenen till en fors.' },
    sbGrate: { purpose: 'Hoppa över gallret till muren.', recap: 'Björklövet bar mig nerför forsen. Klonk hoppar före.' },
    sbCallMoa: { purpose: 'Gå upp på muren och ropa på Moa.', recap: 'Korsningen är översvämmad. Moa står på muren med sitt paraply.' },
    sbBoard: { purpose: 'Håll i Moas paraply och sväva över.', recap: 'Moa håller fram paraplyet åt mig vid murens kant.' },
    sbGutter: { purpose: 'Följ godisspåret längs rännstenen.', recap: 'Moas paraply bar mig över den översvämmade korsningen.' },
    sbFindCap: { purpose: 'Hämta mössan vid skomakaren.', recap: 'Lillgubbens mössa ligger vid skomakaren. Jag tar med den till honom.' },
    sbLake: { purpose: 'Gå uppför trappan mot Olympia.', recap: 'Jag har lillgubbens mössa. Gamla trägubbens godisspår fortsätter mot fotbollsplanen.' },
  },
  helpers: {
    sbFamily: 'Familjen letar på gatan med sina lampor.',
    sbMoa: 'Moa väntar på muren med sitt paraply.',
  },
};
