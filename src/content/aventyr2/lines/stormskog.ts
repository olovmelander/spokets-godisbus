import type { ChapterWords } from './words';

/**
 * What is said in Stormskogen, the second adventure's Kapitel 2 (docs/aventyr-2.md): at most about 40 characters
 * a line, Swedish, no names but the family's. Klonk has no mouth: it says only *klonk*.
 */
export const CONE_REACTIONS = ['ssConeOuch', 'ssConeHey', 'ssConeBonk', 'ssConeDuck'] as const;

export const words: ChapterWords = {
  lines: {
    // 1. the forest's edge
    ssDark: 'Hu, vad mörkt det är i skogen!',
    ssKlonk: 'Klonk!',
    ssFlash: 'Blixten! Där blåste lillgubben förbi!',
    // 2. the cone rain
    ssConeOuch: 'Aj!',
    ssConeHey: 'Oj, en kotte!',
    ssConeBonk: 'Aj då!',
    ssConeDuck: 'Hoppsan!',
    ssCones: 'Kottar faller! Titta på skuggorna.',
    // 3. the boughs
    // 4. the owl
    ssOwlStuck: 'En uggla! En pinne har stängt in den.',
    ssOwlFree: 'Så! Nu kommer du ut, lilla uggla.',
    // 5. the windthrow
    ssWindthrow: 'Stormen fällde granar som tändstickor!',
    ssOwlWaits: 'Du väntar på oss! Får jag åka med?',
    ssOwlFly: 'Hu-hu! Vad mjukt det är att flyga!',
    // 6. Pappa's flashlight. Something tiny moves in Pappa's light: is it him? Called, he knows, and sees him at the
    // edge. To him Klonk is a toy that fell over: only Elof knows that a grown-up's look makes Klonk stiff, and he
    // only thinks it.
    ssTooWide: 'För brett att hoppa. Hur kommer vi över?',
    ssPappaHere: 'Något rör sig i ljuset. Är det du, Elof?',
    ssBeam: 'Där är du ju! Akta dig för kanten!',
    ssFell: 'Oj! Klonk föll rakt över klyftan.',
    ssStiff: 'Han blir stel när Pappa tittar. En bro!',
    ssTiptoe: 'Förlåt, Klonk! Jag går lätt, lätt.',
    ssPappaAway: 'Bra, Elof! Nu lyser jag på stigen.',
    ssAwake: 'Klonk!',
    ssThanks: 'Tack, Klonk! Du är världens bästa bro.',
    // 7. the old one's memory
    ssHollowSeen: 'En mörk håla. Vad tänker du på, Klonk?',
    ssHollowKlonk: 'Klonk …',
    ssAlone: 'Gamla trägubben låg ensam i flera år.',
    ssWhy: 'Därför skyndar han. Lillgubben är ensam!',
    ssBoth: 'Kom, Klonk. Vi ska hitta dem båda!',
    // 8. the jay
    ssJaySeen: 'Lavskrikan! Den gömmer sig för regnet.',
    ssJayGlad: 'Ett lingon åt dig. Visa vägen, kompis!',
    // 9. the hill
    ssSeeOld: 'Där vandrar gamla trägubben ner!',
    ssVillage: 'Byn är alldeles mörk. Inte ett ljus.',
    ssOnward: 'Klonk, klonk!',
  },
  verbs: {
    ssFlyOwl: 'Hoppa upp på ugglan',
  },
  purposes: {
    ssForest: { purpose: 'Följ godisspåret in i skogen.', recap: 'Lillgubben blåste in i skogen. Gamla trägubben lämnar godis åt mig.' },
    ssCones: { purpose: 'Titta på skuggorna. Kottarna faller!', recap: 'Stormen skakar granarna, och kottarna ramlar ner.' },
    ssBoughs: { purpose: 'Följ spåret genom ravinen.', recap: 'Grenarna gungar i vinden. Där uppe kan jag hoppa, om jag vågar.' },
    ssOwl: { purpose: 'Dra bort pinnen från ugglans hål.', recap: 'Stormen har blåst en pinne framför ugglans hål. Ugglan kommer inte ut.' },
    ssWindthrow: { purpose: 'Följ spåret över vindfällen.', recap: 'Ugglan är fri. Den flög före mig in bland de fallna granarna.' },
    ssOwlBoard: { purpose: 'Flyg på ugglan över de fallna granarna.', recap: 'Här är det för brett att hoppa. Ugglan väntar på mig.' },
    ssOwlRide: { purpose: 'Flyg på ugglan.', recap: 'Ugglan bär mig högt över vindfällen.' },
    ssPappa: { purpose: 'Ropa på Pappa vid klyftan.', recap: 'Här är för brett att hoppa, och så mörkt. Pappa letar med ficklampan.' },
    ssPlank: { purpose: 'Gå över bron. Det är Klonk!', recap: 'Pappas lampa lyste på Klonk. När en vuxen ser honom blir han alldeles stel.' },
    ssFollow: { purpose: 'Följ Klonk vidare in i skogen.', recap: 'Pappa tittade bort, och då vaknade Klonk igen.' },
    ssMemory: { purpose: 'Följ spåret efter gamla trägubben.', recap: 'Gamla trägubben vet hur det är att vara ensam i mörkret. Därför skyndar han efter lillgubben.' },
    ssJay: { purpose: 'Plocka ett lingon och ge det till lavskrikan.', recap: 'Lavskrikan från förra äventyret gömmer sig för stormen.' },
    ssLichen: { purpose: 'Klättra upp längs laven.', recap: 'Lavskrikan fick ett lingon. Den visade mig vägen upp längs laven.' },
    ssDown: { purpose: 'Följ spåret ner mot byn.', recap: 'Gamla trägubben skyndar mot byn. Där är alla fönster mörka.' },
  },
  moments: { 'ss:ljuset': 'Pappas ficklampa', 'ss:vaknar': 'Klonk vaknar' },
  helpers: {
    ssLamps: 'Familjen letar med sina lampor. Klonk är med mig.',
    ssOwl: 'Ugglan är fri. Den hjälper mig över vindfällen.',
    ssPappa: 'Pappa lyser med ficklampan. Klonk och jag hjälps åt.',
    ssJay: 'Lavskrikan är min vän sedan förra äventyret.',
  },
};
