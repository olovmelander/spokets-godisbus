import type { ChapterWords } from './words';

/**
 * What is said in Stormgården, Äventyr 2's first world (docs/aventyr-2.md, Kapitel 1): at most about 40
 * characters a line, Swedish, no names but the family's. Klonk speaks only in *klonk*.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the veranda, in the rain
    sgMoaLight: 'Jag lyser för dig från fönstret!',
    sgGutter: 'Takrännan svämmar över! Se på skuggorna.',
    // 2. the pumpkin lantern on the steps
    sgPumpkin: 'Gamla trägubben lämnar godis åt oss!',
    sgKlonk: 'Klonk!',
    sgKlonkKlonk: 'Klonk, klonk!',
    // 3. Stormbyarna
    sgPots: 'Stormbyar! Vi gömmer oss bakom krukorna.',
    sgFlowerpot: 'Klonk! Du blåste ner i blomkrukan!',
    sgCalm: 'Puh! Vi klarade stormbyarna!',
    // 4. Regntunnan
    sgDitch: 'Diket är alldeles för brett!',
    sgLid: 'Locket flyter upp! Det blev en bro!',
    // 5. Bertils stövelbåt
    sgBertilHere: 'För djupt, lillebror! Ropa på mig.',
    sgBertilBoot: 'Min stövel blir din båt. Kliv i!',
    sgBertilHeja: 'Heja! Stöveln seglar som en båt!',
    sgThanks: 'Tack, Bertil! Bästa båten i stormen!',
    // 6. the playhouse
    sgPlayhouse: 'Gamla trägubben! Uppe på lekstugan!',
    sgLonely: 'Han ser så ensam ut, gamla trägubben.',
    sgWhy: 'Varför väntar han aldrig på oss?',
    sgLookout: 'Jag ser hela trädgården härifrån!',
    // 7. the hedge
    sgFlash: 'Där! Lillgubben flyger över häcken!',
    sgForest: 'Han flög mot skogen. Kom, Klonk!',
  },
  verbs: {
    sgTurnTap: 'Vrid på kranen',
    sgBoardBoot: 'Kliv i stöveln',
  },
  purposes: {
    sgVeranda: { purpose: 'Följ godisspåret över verandan.', recap: 'Stormen tog lillgubben ut genom fönstret. Gamla trägubben hoppade efter.' },
    sgTrail: { purpose: 'Följ gamla trägubbens godisspår.', recap: 'Gamla trägubben lämnar godis åt oss, en bit i taget.' },
    sgWind: { purpose: 'Göm dig vid krukorna när det blåser.', recap: 'Stormbyarna sveper över gräsmattan. Bakom en kruka är det lä.' },
    sgTap: { purpose: 'Vrid på kranen på regntunnan.', recap: 'Diket är för brett att hoppa över. Regntunnan är full av vatten.' },
    sgLid: { purpose: 'Gå över locket i diket.', recap: 'Vattnet från tunnan lyfte locket. Nu är det en bro.' },
    sgBertilCall: { purpose: 'Ropa på Bertil vid vattnet.', recap: 'Regnet har gjort gräsmattan till en sjö.' },
    sgBoard: { purpose: 'Kliv i Bertils stövelbåt.', recap: 'Bertil har lagt sin stövel på vattnet. Jag väljer när vi åker.' },
    sgBoot: { purpose: 'Åk över i Bertils stövel.', recap: 'Bertils stövel bär mig över den översvämmade gräsmattan.' },
    sgPlayhouse: { purpose: 'Klättra upp på lekstugans tak.', recap: 'Gamla trägubben stod på lekstugan. Godisspåret går upp dit.' },
    sgLonely: { purpose: 'Följ spåret mot häcken.', recap: 'Gamla trägubben såg så ensam ut. Varför väntar han aldrig på oss?' },
    sgHedge: { purpose: 'Följ lillgubben mot skogen.', recap: 'I blixtens sken såg jag lillgubben. Han flög över häcken mot skogen.' },
  },
  helpers: {
    sgMoa: 'Moa lyser för mig från fönstret.',
    sgFamily: 'Hela familjen letar med lampor i stormen.',
    sgBertil: 'Bertil gör sin stövel till en båt åt mig.',
  },
};
