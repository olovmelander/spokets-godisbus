import type { ChapterWords } from './words';

/**
 * What is said in Olympia (docs/aventyr-2.md, Kapitel 4): Bredbyn's football ground at night in the storm. At most
 * about 40 characters a line, Swedish, no names but the family's and the public places'. Klonk speaks only in
 * *klonk*; Bertil calls Elof lillebror, and he is warm and a little cocky.
 */
export const words: ChapterWords = {
  lines: {
    // 1. down the steps, the dark floodlights, and over the fence
    olArrive: 'Olympia! Hela planen är mörk.',
    olKlonk: 'Klonk!',
    olKlonkKlonk: 'Klonk, klonk!',
    olLights: 'Inte ens strålkastarna lyser!',
    olTop: 'Blixten! Nu ser jag hela planen!',
    olLittle: 'Lillgubben! Han flyger över planen!',
    // 2. the balls the wind rolls across the pitch
    olWind: 'Vinden rullar bollar över planen!',
    olJump: 'De kommer bakifrån. Hoppa över!',
    olPhew: 'Puh! Ingen boll fick tag i mig!',
    // 3. Bollen i målet
    olPuddle: 'Målet står mitt i en stor pöl!',
    olIdea: 'Bollar flyter! Bollen kan bära mig.',
    olSplash: 'Plask! Bollen flyter. Nu hoppar jag!',
    olInGoal: 'Mål! Jag gjorde mål själv!',
    // 4. up the net to the crossbar
    olLookout: 'Uppe på ribban! Vilken utsikt!',
    // 5. the corner flag and the benches
    olCrowd: 'Stormen låter som en hel läktare!',
    // 6. Bertil's free kick over the flooded centre circle
    olOldOne: 'Gamla trägubben seglar över vattnet!',
    olBertilHere: 'Ropa på mig! Jag är bäst på frisparkar.',
    olBertilReady: 'Upp på bollen! Jag skjuter, du flyger!',
    olFly: 'Jag flyger över hela planen!',
    olGoal: 'Mål! Rakt in i nätet!',
    olBertilCheer: 'Snyggt flugit, lillebror! Bra skott, va?',
    olThanks: 'Tack, Bertil! Vilken spark!',
    // 7. the biathlon range
    olRange: 'Fem svarta måltavlor! Jag kastar kottar.',
    olAllWhite: 'Alla fem är vita! Fullträff!',
    // 8. the floodlit trail, and the strongest gust
    olGust: 'Där! Vinden tar lillgubben norrut!',
    olNorth: 'Upp mot sjön vid Flärken!',
    olFollow: 'Gamla trägubben flyger efter honom!',
    olCar: 'Hoppa in i bilen! Vi åker till Flärken.',
  },
  verbs: {
    olKick: 'Sparka',
    olRideBall: 'Hoppa upp på bollen',
    olThrow: 'Kasta kotte',
  },
  purposes: {
    olympiaArrive: { purpose: 'Följ godisspåret till fotbollsplanen.', recap: 'Vinden blåste lillgubben mot Olympia. Gamla trägubben lämnar godis åt mig.' },
    olympiaFence: { purpose: 'Klättra över staketet.', recap: 'Staketet runt planen är högt, men nätet går att klättra på.' },
    olympiaTrail: { purpose: 'Följ godisspåret över planen.', recap: 'Gamla trägubben lämnar godis åt mig, en bit i taget.' },
    olympiaBalls: { purpose: 'Hoppa över bollarna som rullar.', recap: 'Vinden rullar bollar över planen. De kommer bakifrån.' },
    olympiaKick: { purpose: 'Sparka ut bollen i vattnet.', recap: 'Målet står mitt i en stor pöl. Men bollar flyter!' },
    olympiaHop: { purpose: 'Hoppa över på bollen.', recap: 'Bollen flyter i pölen framför målet. Den bär mig.' },
    olympiaBenches: { purpose: 'Spring förbi bänkarna mellan dropparna.', recap: 'Det droppar från bänkarnas tak. Skuggorna visar var dropparna landar.' },
    olympiaCallBertil: { purpose: 'Ropa på Bertil vid mittcirkeln.', recap: 'Mittcirkeln är en hel sjö. Bertil är bäst på frisparkar.' },
    olympiaBoard: { purpose: 'Hoppa upp på bollen.', recap: 'Bertil har lagt bollen till rätta. Han skjuter, och jag flyger.' },
    olympiaFly: { purpose: 'Flyg över mittcirkeln på bollen.', recap: 'Bertil sköt en frispark, och jag åker med bollen.' },
    olympiaStadium: { purpose: 'Följ godisspåret till skidstadion.', recap: 'Mål! Bertils frispark bar mig över mittcirkeln.' },
    olympiaNorth: { purpose: 'Åk bil upp till Flärken.', recap: 'Den starkaste stormbyn tog lillgubben norrut. Gamla trägubben följer efter, och vi tar bilen.' },
  },
  helpers: {
    olympiaFamily: 'Familjen letar runt planen med sina lampor.',
    olympiaBertil: 'Bertil står vid mittcirkeln med en boll.',
  },
};
