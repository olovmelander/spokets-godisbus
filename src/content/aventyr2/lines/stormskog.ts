import type { ChapterWords } from './words';

/**
 * What is said in Stormskogen, the second adventure's Kapitel 2 (docs/aventyr-2.md): at most about 40 characters
 * a line, Swedish, no names but the family's. Klonk has no mouth: it says only *klonk*.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the forest's edge
    ssDark: 'Hu, vad mörkt det är i skogen!',
    ssKlonk: 'Klonk!',
    ssFlash: 'Blixten! Där blåste lillgubben förbi!',
    // 2. the cone rain
    ssCones: 'Kottar faller! Titta på skuggorna.',
    // 3. the boughs
    // 4. the owl
    ssOwlStuck: 'En uggla! En pinne stänger in den.',
    ssOwlFree: 'Fri! Ugglan blinkar som tack.',
    // 5. the windthrow
    ssWindthrow: 'Stormen fällde granar som tändstickor!',
    ssOwlWaits: 'Ugglan väntar! Den kan bära mig över.',
    ssOwlFly: 'Hu-hu! Vi flyger över vindfällen!',
    // 6. Pappa's flashlight
    ssPappaHere: 'Elof? Jag hör dig! Var är du?',
    ssTooWide: 'För brett att hoppa. Och så mörkt!',
    ssBeam: 'Jag lyser med ficklampan …',
    ssStiff: 'Klonk blev stel som en planka!',
    ssTiptoe: 'Förlåt, Klonk! Jag går lätt, lätt.',
    ssPappaAway: 'Nu lyser jag på stigen igen.',
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
    ssJayGlad: 'Ett lingon åt dig. Visa vägen, vän!',
    // 9. the hill
    ssSeeOld: 'Där! Gamla trägubben, nerför backen!',
    ssVillage: 'Byn är alldeles mörk. Inte ett ljus.',
    ssOnward: 'Klonk, klonk!',
  },
  verbs: {
    ssFlyOwl: 'Flyg med ugglan',
  },
  purposes: {
    ssForest: { purpose: 'Följ godisspåret in i skogen.', recap: 'Lillgubben blåste in i skogen. Gamla trägubben lämnar godis åt mig.' },
    ssCones: { purpose: 'Titta på skuggorna. Kottarna faller!', recap: 'Stormen skakar granarna, och kottarna ramlar ner.' },
    ssBoughs: { purpose: 'Följ spåret genom ravinen.', recap: 'Grenarna gungar i vinden. Där uppe kan jag hoppa, om jag vågar.' },
    ssOwl: { purpose: 'Dra bort pinnen från ugglans hål.', recap: 'Stormen har blåst en pinne framför ugglans hål. Den kommer inte ut.' },
    ssWindthrow: { purpose: 'Följ spåret över vindfällen.', recap: 'Ugglan är fri. Den flög före mig in bland de fallna granarna.' },
    ssOwlBoard: { purpose: 'Flyg med ugglan över klyftan.', recap: 'Klyftan är för bred att hoppa över. Ugglan väntar på mig.' },
    ssOwlRide: { purpose: 'Flyg med ugglan.', recap: 'Ugglan bär mig högt över vindfällen.' },
    ssPappa: { purpose: 'Ropa på Pappa vid klyftan.', recap: 'Här är för brett att hoppa, och så mörkt. Pappa har ficklampan.' },
    ssPlank: { purpose: 'Gå över bron. Det är Klonk!', recap: 'Pappa lyste på Klonk, och Klonk blev stel som en planka.' },
    ssFollow: { purpose: 'Följ Klonk vidare in i skogen.', recap: 'Pappa tittade bort, och då vaknade Klonk igen.' },
    ssMemory: { purpose: 'Följ spåret efter gamla trägubben.', recap: 'Gamla trägubben vet hur det är att vara ensam i mörkret. Därför skyndar han efter lillgubben.' },
    ssJay: { purpose: 'Ge lavskrikan ett lingon.', recap: 'Lavskrikan från förra äventyret gömmer sig för stormen.' },
    ssLichen: { purpose: 'Klättra upp längs laven.', recap: 'Lavskrikan fick ett lingon. Den visade mig laven upp på roten.' },
    ssDown: { purpose: 'Följ spåret ner mot byn.', recap: 'Gamla trägubben skyndar mot byn. Där är alla fönster mörka.' },
  },
  helpers: {
    ssLamps: 'Familjen letar med sina lampor. Klonk är med mig.',
    ssOwl: 'Ugglan är fri. Den hjälper mig över vindfällen.',
    ssPappa: 'Pappa lyser med ficklampan. Klonk och jag hjälps åt.',
    ssJay: 'Lavskrikan är min vän sedan förra äventyret.',
  },
};
