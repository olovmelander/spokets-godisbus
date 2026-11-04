import type { ChapterWords } from './words';

/** What is said in Byn i stormen (docs/aventyr-2.md): at most about 40 characters a line, Swedish, no names but the family's. */
export const words: ChapterWords = {
  lines: {
    // The street, dark: the power is out in the whole village.
    sbDark: 'Hela byn är mörk. Strömmen är borta!',
    sbKlonkHere: 'Klonk!',
    sbAwning: 'Markisen fladdrar som en studsmatta!',
    sbCandle: 'Någon har tänt ett ljus i fönstret.',
    // Rännstensforsen, and the grate.
    sbRiver: 'Rännstenen har blivit en fors!',
    sbGrate: 'Gallret! Jag hoppar från järn till järn.',
    // The high wall, and Moa's umbrella. She calls him lillebror.
    sbWall: 'Uppför trappan, upp på muren!',
    sbMoaHere: 'Lillebror! Jag står här nere med lampan.',
    sbMoaHold: 'Håll i mitt paraply. Jag håller i dig!',
    sbFloat: 'Jag svävar som ett maskrosfrö!',
    sbMoaLanded: 'Snyggt landat, lillebror!',
    // The swinging sign, and the little one's cap in the gutter.
    sbSign: 'Skylten gungar i blåsten!',
    sbCap: 'Lillgubbens mössa!',
    sbToLake: 'Rännstenen rinner ner till sjön!',
    sbKlonkCap: 'Klonk, klonk!',
    // The awnings pour, and the steps go down to the shore.
    sbDrops: 'Stora droppar! Jag tittar på skuggorna.',
    sbSteps: 'Trappan ner mot sjön!',
    sbShore: 'Vänta på oss, lillgubben! Vi kommer!',
  },
  verbs: { sbUmbrella: 'Håll i paraplyet' },
  purposes: {
    sbStreet: { purpose: 'Följ godisspåret genom den mörka byn.', recap: 'Strömmen har gått i hela byn. Gamla trägubben lämnar godis åt mig.' },
    sbRiver: { purpose: 'Åk björklövet nerför rännstenen.', recap: 'Regnet har gjort rännstenen till en fors.' },
    sbGrate: { purpose: 'Hoppa över gallret till muren.', recap: 'Björklövet bar mig nerför forsen. Klonk hoppar före.' },
    sbCallMoa: { purpose: 'Gå upp på muren och ropa på Moa.', recap: 'Korsningen är översvämmad. Moa har sitt paraply med sig.' },
    sbBoard: { purpose: 'Håll i Moas paraply och sväva över.', recap: 'Moa håller ut sitt paraply åt mig över korsningen.' },
    sbGutter: { purpose: 'Följ godisspåret längs rännstenen.', recap: 'Moas paraply bar mig över den översvämmade korsningen.' },
    sbLake: { purpose: 'Gå nerför trappan till sjön.', recap: 'Lillgubbens mössa låg i rännstenen. Vattnet rinner ner till sjön.' },
  },
  helpers: {
    sbFamily: 'Familjen letar på gatan med sina lampor.',
    sbMoa: 'Moa står vid korsningen med sitt paraply.',
  },
};
