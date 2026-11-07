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
    // 2. the picnic table and the volleyball net
    // 3. the changing rooms
    sjDoor: 'Pang! Dörren vill visst också vara med.',
    // 4. the beach stones, the reeds and the reed mats
    sjMats: 'Gungfly! Det sjunker om jag står still.',
    sjKlonkWood: 'Lätt för dig, Klonk. Trä flyter ju!',
    sjFlash: 'Lillgubben! Han blåser ut över sjön!',
    // 5. the jetty in the waves
    sjJetty: 'Bryggan! Vågorna sköljer över den.',
    sjPosts: 'Jag gömmer mig bakom stolparna.',
    sjOldOne: 'Spring, gamla trägubben! Vi kommer!',
    // 6. Mamma's paddle board
    sjBroken: 'Bryggan är trasig! Det är för långt.',
    sjMamma: 'Elof! Jag paddlar dit på SUP:en!',
    sjBoatReady: 'Jag håller brädan stilla. Kliv på!',
    sjSteady: 'Lugnt och fint. Jag släpper inte.',
    sjThanks: 'Tack! Din SUP blev ju en bro!',
    // 7. the diving tower
    sjTower: 'Hopptornet! Där uppe ser man allt.',
    sjNear: 'Jag väntar här. Ropa om du behöver mig.',
    sjLookout: 'Där är lillgubben, där ån börjar!',
    // 8. the bark raft
    sjGap: 'Plankorna är borta. Vad gör jag nu?',
    sjStoneIdea: 'En sten! Den kan fylla luckan.',
    sjPlop: 'Plopp. Bra sten. Dålig båt.',
    sjPlopKlonk: 'Klonk!',
    sjBarkIdea: 'Klonk flyter. Bark är ju trä!',
    sjRaft: 'En barkflotte! Nu kan jag hoppa.',
    sjKlonkRaft: 'Klonk, klonk!',
    // 9. the jetty's end: the outlet takes them
    sjOutlet: 'Åh nej! Ån tar med sig lillgubben!',
    sjLog: 'Gamla trägubben hoppar på en stock!',
    sjFloated: 'Trä flyter! Ån bär dem båda.',
    sjCar: 'Vi kör längs ån. Vi är nära dig.',
    sjFollow: 'Klonk och jag följer godiset längs ån!',
    sjKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  purposes: {
    sjonPark: { purpose: 'Följ godisspåret ner mot sjön.', recap: 'Vi tog bilen upp till Flärken. Hit blåste stormen lillgubben.' },
    sjonSwings: { purpose: 'Kasta snöret till gungorna.', recap: 'Pölen under gungan är för bred att hoppa över. Gungan bär mig.' },
    sjonSlide: { purpose: 'Klättra upp och åk nerför rutschkanan.', recap: 'Rutschkanan är vägen ner till stranden.' },
    sjonShore: { purpose: 'Följ godisspåret längs stranden.', recap: 'Badplatsen är tom i stormen. Gamla trägubben lämnar godis åt mig.' },
    sjonReeds: { purpose: 'Klättra uppför vassen.', recap: 'Stenen är för hög att hoppa upp på. Vassen håller mig.' },
    sjonMats: { purpose: 'Spring över gungflyet.', recap: 'Vassmattorna sjunker om jag står still. Klonk visar vägen.' },
    sjonJetty: { purpose: 'Göm dig bakom stolparna när vågen kommer.', recap: 'Stormen slår vågor över bryggan. Bakom stolparna är det lä.' },
    sjonMamma: { purpose: 'Ropa på Mamma vid bryggan.', recap: 'Bryggan har gått av. Mamma paddlar på SUP:en alldeles nära.' },
    sjonBoat: { purpose: 'Gå över på Mammas SUP-bräda.', recap: 'Mamma håller brädan tätt intill bryggan. Hon släpper inte.' },
    sjonOut: { purpose: 'Följ godiset ut till hopptornet.', recap: 'Mamma väntar vid bryggan. Gamla trägubben lämnar godis hela vägen ut.' },
    sjonTower: { purpose: 'Klättra uppför hopptornets stege.', recap: 'Lillgubben blåste ut över sjön. Från tornet kan jag se vart han tog vägen.' },
    sjonDive: { purpose: 'Spring och hoppa ner på bryggan.', recap: 'Blixten visade lillgubben långt ute, där ån börjar.' },
    sjonGap: { purpose: 'Hitta något som fyller luckan.', recap: 'Plankorna är borta, och luckan är för bred att hoppa över.' },
    sjonBark: { purpose: 'Stenen sjönk. Vad flyter?', recap: 'Plankorna är borta. Stenen sjönk i luckan.' },
    sjonRaft: { purpose: 'Hoppa över på barkflotten.', recap: 'Barken flyter i luckan. Den håller för mig.' },
    sjonEnd: { purpose: 'Gå längst ut på bryggan.', recap: 'Barkflotten bar mig. Snart är jag längst ut på bryggan.' },
    sjonRiver: { purpose: 'Följ godisspåret längs ån.', recap: 'Ån bär trägubbarna söderut. Familjen kör längs ån medan Klonk och jag följer spåret.' },
  },
  helpers: {
    sjonFamily: 'Familjen letar längs stranden med sina lampor.',
    sjonMamma: 'Mamma väntar på SUP:en vid bryggan.',
    sjonRoad: 'Familjen följer ån med bilen och håller sig nära.',
  },
};
