import type { ChapterWords } from './words';

/**
 * What is said in Olympia (docs/aventyr-2.md, Kapitel 4): Bredbyn's football ground at night in the storm. At most
 * about 40 characters a line, Swedish, no names but the family's and the public places'. Klonk speaks only in
 * *klonk*; Bertil calls Elof lillebror, and he is warm and a little cocky.
 */
export const words: ChapterWords = {
  lines: {
    // 1. up the steps, the dark floodlights, and over the fence
    olArrive: 'Olympia! Hela planen är mörk.',
    olKlonk: 'Klonk!',
    olKlonkKlonk: 'Klonk, klonk!',
    olLights: 'Inte ens strålkastarna lyser!',
    olTop: 'Blixten! Där flyger lillgubben!',
    // 2. the balls the wind rolls across the pitch
    olWind: 'Vinden rullar bollar efter oss! Hoppa!',
    olPhew: 'Puh! Nu är jag förbi bollarna.',
    // 3. Bollen i målet
    olPuddle: 'Målet står mitt i en stor pöl!',
    olIdea: 'Den lilla bollen flyter ju!',
    olIdeaMore: 'Den stora bollen på bordet kan bära mig!',
    olSplash: 'Plask! Bollen flyter. Nu hoppar jag!',
    olInGoal: 'Mål! Fast det var jag som gick in!',
    // 4. up the net to the crossbar
    olLookout: 'Uppe på ribban! Vilken utsikt!',
    // 5. the corner flag and the benches
    olCrowd: 'Stormen låter som en hel läktare!',
    // 6. Bertil's free kick over the flooded centre circle
    olOldOne: 'Gamla trägubben seglar över vattnet!',
    olBertilHere: 'Lillebror! Behöver du en frispark?',
    olBertilReady: 'Upp på bollen! Jag skjuter, du flyger!',
    olFly: 'Jag flyger med bollen!',
    olBertilCheer: 'Snyggt, lillebror! Vi gjorde mål ihop!',
    olThanks: 'Tack! Du sköt, och jag flög!',
    // 7. the biathlon range
    olRange: 'Fem tavlor! Kan jag pricka alla?',
    olAllWhite: 'Alla fem är vita! Fullträff!',
    // 8. the floodlit trail, and the strongest gust
    olGust: 'Där! Vinden tar lillgubben norrut!',
    olNorth: 'Upp mot sjön vid Flärken!',
    olFollow: 'Gamla trägubben följer efter honom!',
    olCar: 'Kom! Vi åker bil till Flärken.',
  },
  verbs: {
    olKick: 'Sparka',
    olRideBall: 'Hoppa upp på bollen',
    olThrow: 'Kasta kotte',
  },
  purposes: {
    olympiaArrive: { purpose: 'Följ godisspåret upp till fotbollsplanen.', recap: 'Vinden blåste lillgubben mot Olympia. Gamla trägubben lämnar godis åt mig.' },
    olympiaFence: { purpose: 'Klättra över staketet.', recap: 'Staketet runt planen är högt, men nätet går att klättra på.' },
    olympiaTrail: { purpose: 'Följ godisspåret över planen.', recap: 'Gamla trägubben lämnar godis åt mig, en bit i taget.' },
    olympiaBalls: { purpose: 'Hoppa över bollarna som rullar.', recap: 'Vinden rullar bollar över planen. De kommer bakifrån.' },
    olympiaKick: { purpose: 'Hur tar jag mig över pölen?', recap: 'Målet står mitt i en stor pöl. Jag sprang under ett bord med en stor boll på.' },
    olympiaHop: { purpose: 'Hoppa över på bollen.', recap: 'Bollen flyter i pölen framför målet. Den bär mig.' },
    olympiaBenches: { purpose: 'Spring förbi bänkarna mellan dropparna.', recap: 'Det droppar från bänkarnas tak. Skuggorna visar var dropparna landar.' },
    olympiaCallBertil: { purpose: 'Ropa på Bertil vid mittcirkeln.', recap: 'Mittcirkeln är en hel sjö. Bertil kan skjuta mig över på sin boll.' },
    olympiaBoard: { purpose: 'Hoppa upp på bollen.', recap: 'Bertil har lagt bollen till rätta. Han skjuter, och jag flyger.' },
    olympiaFly: { purpose: 'Flyg över mittcirkeln på bollen.', recap: 'Bertil sköt en frispark, och jag åker med bollen.' },
    olympiaStadium: { purpose: 'Följ godisspåret till skidstadion.', recap: 'Mål! Bertils frispark bar mig över mittcirkeln.' },
    olympiaForest: { purpose: 'Följ godisspåret upp i skogen.', recap: 'Bertils frispark bar mig i mål. Nu går spåret upp i skogen.' },
    olympiaNorth: { purpose: 'Följ elljusspåret. Sedan åker vi bil till Flärken!', recap: 'Den starkaste stormbyn tog lillgubben norrut. Gamla trägubben följer efter, och vi åker bil.' },
  },
  helpers: {
    olympiaFamily: 'Familjen letar runt planen med sina lampor.',
    olympiaBertil: 'Bertil står vid mittcirkeln med en boll.',
  },
};
