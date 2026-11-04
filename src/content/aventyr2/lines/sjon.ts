import type { ChapterWords } from './words';

/**
 * What is said in Sjön (docs/aventyr-2.md, Kapitel 4): at most about 40 characters a line, Swedish, no names but
 * the family's. Three lines are one thought, told in three places: Klonk need not mind the sinking reed mats
 * because wood floats, so bark floats too, and so do two trägubbar out on a stone.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the beach stones and the reeds
    sjArrive: 'Sjön! Vågorna är höga som hus.',
    sjStones: 'Blöta stenar. Jag hoppar som en groda!',
    sjReeds: 'Vassen är stark. Jag klättrar upp!',
    // 2. the reed mats
    sjMats: 'Gungfly! Det sjunker om jag står still.',
    sjKlonkWood: 'Lätt för dig, Klonk. Trä flyter ju!',
    sjFlash: 'Lillgubben! Den blåser ut över sjön!',
    // 3. the jetty in the waves
    sjJetty: 'Bryggan! Vågorna sköljer över den.',
    sjPosts: 'Jag gömmer mig bakom stolparna.',
    sjOldOne: 'Gamla trägubben! Vänta på oss!',
    // 4. Mamma's boat
    sjBroken: 'Bryggan är av! Det är för långt.',
    sjMamma: 'Ropa på mig. Jag har roddbåten.',
    sjBoatReady: 'Jag håller båten still. Gå på kanten.',
    sjSteady: 'Lugnt och fint. Jag släpper inte.',
    sjThanks: 'Tack, Mamma! Du är bäst.',
    sjNear: 'Jag ror bredvid dig hela vägen.',
    // 5. the bark raft
    sjGap: 'Plankorna är borta. Vad gör jag nu?',
    sjBarkIdea: 'Bark flyter, precis som Klonk!',
    sjRaft: 'En barkflotte! Nu kan jag hoppa.',
    sjKlonkRaft: 'Klonk-klonk!',
    // 6. the jetty's end, and the flash
    sjThere: 'Där! På stenen ute i sjön!',
    sjFloated: 'Trä flyter. Därför klarade de sig!',
    sjMammaSees: 'Jag ser dem också. Vi hämtar dem.',
    sjKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  purposes: {
    sjonShore: { purpose: 'Följ godisspåret längs stranden.', recap: 'Rännstenen rann ner till sjön. Någonstans här är lillgubben.' },
    sjonReeds: { purpose: 'Klättra uppför vassen.', recap: 'Stenen är för hög att hoppa upp på. Vassen håller mig.' },
    sjonMats: { purpose: 'Spring över gungflyet.', recap: 'Vassmattorna sjunker om jag står still. Klonk visar vägen.' },
    sjonJetty: { purpose: 'Göm dig bakom stolparna när vågen kommer.', recap: 'Stormen slår vågor över bryggan. Bakom stolparna är det lä.' },
    sjonMamma: { purpose: 'Ropa på Mamma vid bryggan.', recap: 'Bryggan har gått av. Mamma har roddbåten alldeles nära.' },
    sjonBoat: { purpose: 'Gå på båtkanten över vattnet.', recap: 'Mamma håller båten tätt intill bryggan. Hon släpper inte.' },
    sjonOut: { purpose: 'Följ godiset ut på bryggan.', recap: 'Mamma ror bredvid mig. Gamla trägubben lämnar godis hela vägen ut.' },
    sjonBark: { purpose: 'Knuffa ut barken i vattnet.', recap: 'Plankorna är borta. Bark flyter, precis som Klonk.' },
    sjonRaft: { purpose: 'Hoppa över på barkflotten.', recap: 'Barken flyter i luckan. Den håller för mig.' },
    sjonEnd: { purpose: 'Gå ut till bryggans ände.', recap: 'Barkflotten bar mig. Snart är jag längst ut på bryggan.' },
    sjonFound: { purpose: 'Där ute! Båda trägubbarna på en sten.', recap: 'Blixten lyste upp sjön. Trä flyter, så de klarade sig.' },
  },
  helpers: {
    sjonFamily: 'Familjen letar längs stranden med sina lampor.',
    sjonMamma: 'Mamma ror bredvid mig och håller båten still.',
  },
};
