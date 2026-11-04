import type { ChapterWords } from './words';

/**
 * What is said in Flärken (docs/aventyr-2.md, Kapitel 5): at most about 40 characters a line, Swedish, no names but
 * the family's and the place's own. Three lines are one thought, told in three places: Klonk need not mind the
 * sinking reed mats because wood floats, so bark floats too, and so do two trägubbar in the river.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the parking and the playground
    sjArrive: 'Flärken! Badplatsen är alldeles tom.',
    sjSwings: 'Gungorna! Jag kastar snöret dit.',
    sjSlide: 'Uppför stegen och nerför rutschkanan!',
    // 2. the picnic table and the volleyball net
    sjDry: 'Under bordet är det torrt.',
    sjNet: 'Nätet gungar som en studsmatta!',
    // 3. the changing rooms
    sjDoor: 'Dörren smäller i vinden. Pang!',
    // 4. the beach stones, the reeds and the reed mats
    sjStones: 'Blöta stenar. Jag hoppar som en groda!',
    sjReeds: 'Vassen är stark. Jag klättrar upp!',
    sjMats: 'Gungfly! Det sjunker om jag står still.',
    sjKlonkWood: 'Lätt för dig, Klonk. Trä flyter ju!',
    sjFlash: 'Lillgubben! Han blåser ut över sjön!',
    // 5. the jetty in the waves
    sjJetty: 'Bryggan! Vågorna sköljer över den.',
    sjPosts: 'Jag gömmer mig bakom stolparna.',
    sjOldOne: 'Gamla trägubben! Vänta på oss!',
    // 6. Mamma's boat
    sjBroken: 'Bryggan är trasig! Det är för långt.',
    sjMamma: 'Ropa på mig. Jag har roddbåten.',
    sjBoatReady: 'Jag håller båten still. Gå på kanten.',
    sjSteady: 'Lugnt och fint. Jag släpper inte.',
    sjThanks: 'Tack, Mamma! Du är bäst.',
    // 7. the diving tower
    sjTower: 'Hopptornet! Där uppe ser man allt.',
    sjNear: 'Jag ror bredvid dig hela vägen.',
    sjLookout: 'Där är lillgubben! Där ån börjar!',
    sjDive: 'Nu hoppar jag ner på bryggan!',
    // 8. the bark raft
    sjGap: 'Plankorna är borta. Vad gör jag nu?',
    sjBarkIdea: 'Bark flyter, precis som Klonk!',
    sjRaft: 'En barkflotte! Nu kan jag hoppa.',
    sjKlonkRaft: 'Klonk-klonk!',
    // 9. the jetty's end: the outlet takes them
    sjOutlet: 'Åh nej! Ån tar med sig lillgubben!',
    sjLog: 'Gamla trägubben hoppar på en stock!',
    sjFloated: 'Trä flyter! Ån bär dem båda.',
    sjCar: 'Vi följer ån med bilen.',
    sjKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  purposes: {
    sjonPark: { purpose: 'Följ godisspåret ner mot sjön.', recap: 'Stormen blåste lillgubben norrut, ända hit till Flärken.' },
    sjonSwings: { purpose: 'Kasta snöret till gungorna.', recap: 'Pölen under gungan är för bred att hoppa över. Gungan bär mig.' },
    sjonSlide: { purpose: 'Klättra upp och åk nerför rutschkanan.', recap: 'Rutschkanan är vägen ner till stranden.' },
    sjonShore: { purpose: 'Följ godisspåret längs stranden.', recap: 'Badplatsen är tom i stormen. Gamla trägubben lämnar godis åt mig.' },
    sjonReeds: { purpose: 'Klättra uppför vassen.', recap: 'Stenen är för hög att hoppa upp på. Vassen håller mig.' },
    sjonMats: { purpose: 'Spring över gungflyet.', recap: 'Vassmattorna sjunker om jag står still. Klonk visar vägen.' },
    sjonJetty: { purpose: 'Göm dig bakom stolparna när vågen kommer.', recap: 'Stormen slår vågor över bryggan. Bakom stolparna är det lä.' },
    sjonMamma: { purpose: 'Ropa på Mamma vid bryggan.', recap: 'Bryggan har gått av. Mamma har roddbåten alldeles nära.' },
    sjonBoat: { purpose: 'Gå på båtkanten över vattnet.', recap: 'Mamma håller båten tätt intill bryggan. Hon släpper inte.' },
    sjonOut: { purpose: 'Följ godiset ut till hopptornet.', recap: 'Mamma ror bredvid mig. Gamla trägubben lämnar godis hela vägen ut.' },
    sjonTower: { purpose: 'Klättra uppför hopptornets stege.', recap: 'Från hopptornet ser jag ut över hela sjön.' },
    sjonDive: { purpose: 'Spring och hoppa ner på bryggan.', recap: 'Blixten visade lillgubben långt ute, där ån börjar.' },
    sjonBark: { purpose: 'Knuffa ut barken i vattnet.', recap: 'Plankorna är borta. Bark flyter, precis som Klonk.' },
    sjonRaft: { purpose: 'Hoppa över på barkflotten.', recap: 'Barken flyter i luckan. Den håller för mig.' },
    sjonEnd: { purpose: 'Gå ut till bryggans ände.', recap: 'Barkflotten bar mig. Snart är jag längst ut på bryggan.' },
    sjonRiver: { purpose: 'Följ ån! Familjen tar bilen.', recap: 'Ån bär lillgubben. Gamla trägubben följer efter på en stock.' },
  },
  helpers: {
    sjonFamily: 'Familjen letar längs stranden med sina lampor.',
    sjonMamma: 'Mamma ror bredvid mig och håller båten still.',
  },
};
