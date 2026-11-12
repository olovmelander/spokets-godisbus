import type { ChapterWords } from './words';

/**
 * What is said in Billsta (docs/aventyr-2.md, Kapitel 7): at most about 40 characters a line, Swedish, no names but
 * the family's. Mormor and morfar are only "mormor" and "morfar": glad, warm and a little amazed at how small he
 * is, each with one thing of their own to help with (morfar's ladder, mormor's lantern), and nothing more about them.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the road, by the car
    biKlonk: 'Klonk!',
    biWindow: 'Titta! Det lyser hos mormor och morfar.',
    biKlonkKlonk: 'Klonk, klonk!',
    biNewTrail: 'Följ vårt godis! Vi springer före.',
    // 2. Morfar and his ladder
    biDitch: 'Diket är fullt av vatten. För brett!',
    biMorfarHere: 'Elof! Så liten du har blivit!',
    biLadderLay: 'Vänta, jag lägger stegen över diket.',
    biLadderOn: 'Så där. Gå på stegen, lilla vän.',
    biThanksMorfar: 'Tack, morfar! Vilken lång stege!',
    biToMormor: 'Mormor väntar vid ladan med lyktan.',
    // 3. the yard, and Mormor and her lantern
    biYard: 'Er gräsmatta har blivit en djungel!',
    biMormorHere: 'Lilla Elof! Är det verkligen du?',
    biLantern: 'Jag lyser med lyktan och öppnar ladan.',
    biOpen: 'Ladudörren är öppen! Tack, mormor!',
    biLookout: 'Från Billaberget ser vi hela sundet.',
    biWay: 'Genom ladan kommer du till berget.',
    biOnward: 'Då klättrar jag upp och spanar!',
    // 4. the hay loft, the roof, and down behind the house
    biLoft: 'Höloftet! Det luktar sommar här.',
    biRoof: 'Upp på taket! Här blåser det hårt.',
    // 5. the brook, Klonk's seesaw, Billaberget's boulders, the hazel and the gusts
    biSeesaw: 'En gungbräda! Vem tar andra änden?',
    biJumpOn: 'Klonk, hoppa på andra änden!',
    biTooLight: 'Du är lite för lätt. Vi får klura!',
    biMiddle: 'Pappa sitter nära mitten när vi gungar.',
    biTheStone: 'Stenen ligger i mitten. Kan den flyttas?',
    biNearMiddle: 'Så! Nu har Klonk den långa änden.',
    biFly: 'Jag flyger över bäcken!',
    biThanksKlonk: 'Tack, Klonk! Du är min bästa vän.',
    // What is seen there: shelves of rock up Billaberget's face, with sweets on them (there is no hazel bush to see).
    biHazel: 'Hyllor i berget! Där uppe finns godis.',
    biWind: 'Blåsten! Jag gömmer mig bakom stenarna.',
    // 6. the brow: the flash, and the owl far off
    biThere: 'Där nere! På en sten i sundet!',
    biHolds: 'Gamla trägubben håller i lillgubben!',
    biNotAlone: 'De är tillsammans! Vi kommer!',
    biOwl: 'Hu-hu … Hör du? Det är ugglan!',
    biToNarrow: 'Kom, vi går ner till sundet.',
    biKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  verbs: {
    biCallMorfar: 'Ropa på morfar',
    biCallMormor: 'Ropa på mormor',
    biCallKlonk: 'Ropa på Klonk',
  },
  purposes: {
    billstaRoad: { purpose: 'Gå längs vägen mot det tända fönstret.', recap: 'Vi åkte till Billsta för att leta vidare. Nu lägger Moa och Bertil ett godisspår åt mig.' },
    billstaMorfar: { purpose: 'Ropa på morfar vid diket.', recap: 'Diket är fullt av vatten. Morfar står där med sin långa stege.' },
    billstaLadder: { purpose: 'Gå över diket på morfars stege.', recap: 'Morfar har lagt sin stege över diket åt mig.' },
    billstaYard: { purpose: 'Följ Moas och Bertils spår över gården.', recap: 'Morfar hjälpte mig över diket. Mormor väntar vid ladan.' },
    billstaMormor: { purpose: 'Ropa på mormor vid ladan.', recap: 'Ladan är stängd. Mormor har sin lykta med sig.' },
    billstaOpens: { purpose: 'Titta! Mormor öppnar ladan.', recap: 'Mormor går upp och öppnar ladan åt mig.' },
    billstaBarn: { purpose: 'Gå genom ladan mot Billaberget.', recap: 'Mormor har öppnat dörren. Från berget kan vi spana efter trägubbarna nere i sundet.' },
    billstaLoft: { purpose: 'Ta dig genom höloftet upp på taket.', recap: 'Mormors lykta visar vägen genom ladan till berget där vi ska spana.' },
    billstaRoof: { purpose: 'Gå över taket. Göm dig när det blåser.', recap: 'På andra sidan ladan fortsätter vägen upp till utsikten på Billaberget.' },
    billstaBrook: { purpose: 'Hoppa över bäcken på stenarna.', recap: 'Bakom huset börjar skogen. Där rinner en bäck.' },
    billstaSeesaw: { purpose: 'Ropa på Klonk vid gungbrädan.', recap: 'Bäcken är för bred. En torr gran ligger som en gungbräda.' },
    billstaKlonkOn: { purpose: 'Stå kvar. Klonk hoppar på!', recap: 'Jag står på den låga änden. Klonk hoppar på den höga.' },
    billstaPush: { purpose: 'Knuffa stenen från andra sidan.', recap: 'Klonk är för lätt. Om stenen kommer närmare min ände, lyfter Klonk mig.' },
    billstaLever: { purpose: 'Klonk är för lätt. Hur lyfter han mig?', recap: 'Klonk hoppade på, men gungbrädan rörde sig knappt. Kanske går stenen under den att flytta?' },
    billstaShortEnd: { purpose: 'Ställ dig på den korta änden!', recap: 'Jag flyttade stenen. Nu har Klonk den långa änden.' },
    billstaFly: { purpose: 'Flyg över bäcken!', recap: 'Klonk hoppade på gungbrädan, och jag flög över bäcken.' },
    billstaBoulders: { purpose: 'Följ Moas och Bertils godis uppåt.', recap: 'Vi letar efter en plats att spana från. Moa och Bertil visar vägen över Billabergets stenar.' },
    billstaWind: { purpose: 'Göm dig bakom stenarna när det blåser.', recap: 'Stormen blåser över backen. Bakom stenarna är det lä.' },
    billstaBrow: { purpose: 'Gå upp på toppen av Billaberget.', recap: 'Härifrån ser man långt, ända ner till sundet.' },
    billstaLook: { purpose: 'Titta ner mot stenen i sundet.', recap: 'Blixten lyser upp vattnet nedanför berget.' },
    billstaFound: { purpose: 'Följ mormor ner till sundet.', recap: 'Gamla trägubben har fått tag i lillgubben på stenen. Nu vet vi var de är!' },
  },
  helpers: {
    billstaFamily: 'Familjen letar med sina lampor.',
    billstaMorfar: 'Morfar står vid diket med sin långa stege.',
    billstaMormor: 'Mormor lyser åt mig med sin lykta.',
    billstaBoth: 'Mormor och morfar hjälper mig.',
    billstaForest: 'Mormor kommer efter med sin lykta.',
    billstaKlonk: 'Klonk hjälper mig över bäcken.',
  },
};
