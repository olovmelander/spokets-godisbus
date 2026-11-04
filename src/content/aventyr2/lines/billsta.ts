import type { ChapterWords } from './words';

/**
 * What is said in Billsta (docs/aventyr-2.md, Kapitel 7): at most about 40 characters a line, Swedish, no names but
 * the family's. Mormor and morfar are only "mormor" and "morfar": glad, warm and a little amazed at how small he
 * is, each with one thing of their own to help with (morfar's ladder, mormor's lantern), and nothing more about them.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the road, by the car
    biArrive: 'Tre mil med bilen! Nu är vi i Billsta.',
    biKlonk: 'Klonk!',
    biWindow: 'Titta! Det lyser hos mormor och morfar.',
    biKlonkKlonk: 'Klonk, klonk!',
    // 2. Morfar and his ladder
    biDitch: 'Diket är fullt av vatten. För brett!',
    biMorfarHere: 'Elof! Så liten du har blivit!',
    biLadderLay: 'Vänta, jag lägger stegen över diket.',
    biLadderOn: 'Så där. Gå på stegen, lilla vän.',
    biThanksMorfar: 'Tack, morfar! Du är stor som ett träd!',
    biToMormor: 'Mormor väntar vid ladan med lyktan.',
    // 3. the yard, and Mormor and her lantern
    biYard: 'Mormor och morfars gård! Så stor den är.',
    biMormorHere: 'Lilla Elof! Är det verkligen du?',
    biLantern: 'Jag lyser med lyktan och öppnar ladan.',
    biOpen: 'Ladudörren är öppen! Tack, mormor!',
    // 4. the hay loft, the roof, and down behind the house
    biLoft: 'Höloftet! Det luktar sommar här.',
    biHatch: 'En lucka i golvet. Jag hoppar över!',
    biRoof: 'Upp på taket! Här blåser det hårt.',
    biForest: 'Bakom huset börjar skogen!',
    // 5. the brook, the log, the roots, Billaberget's boulders, the hazel and the gusts
    biBrook: 'En bäck! Jag hoppar på stenarna.',
    biLogIdea: 'Om jag knuffar stocken blir den en bro!',
    biBridge: 'Nu ligger stocken över bäcken!',
    biRoots: 'Jag klättrar uppför granens rötter!',
    biHill: 'Billaberget! Vilka stora stenar.',
    biHazel: 'Här växer hassel, full av nötter!',
    biWind: 'Blåsten! Jag gömmer mig bakom stenarna.',
    biTop: 'Snart är jag uppe på toppen!',
    // 6. the brow: the flash, and the owl far off
    biThere: 'Där nere! På en sten i sundet!',
    biHolds: 'Gamla trägubben håller i lillgubben!',
    biOwl: 'Uhu … Hör du? Det är ugglan!',
    biToNarrow: 'Kom, vi går ner till sundet.',
    biKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  verbs: {
    biCallMorfar: 'Ropa på morfar',
    biCallMormor: 'Ropa på mormor',
  },
  purposes: {
    billstaRoad: { purpose: 'Gå längs vägen mot det tända fönstret.', recap: 'Vi åkte tre mil med bilen till Billsta, där mormor och morfar bor.' },
    billstaMorfar: { purpose: 'Ropa på morfar vid diket.', recap: 'Diket är fullt av vatten. Morfar står där med sin långa stege.' },
    billstaLadder: { purpose: 'Gå över diket på morfars stege.', recap: 'Morfar har lagt sin stege över diket åt mig.' },
    billstaYard: { purpose: 'Följ godisspåret över gården.', recap: 'Morfar hjälpte mig över diket. Mormor väntar vid ladan.' },
    billstaMormor: { purpose: 'Ropa på mormor vid vedboden.', recap: 'Ladan är stängd. Mormor har sin lykta med sig.' },
    billstaBarn: { purpose: 'Gå uppför plankorna in i ladan.', recap: 'Mormor lyser med lyktan och har öppnat ladan åt mig.' },
    billstaLoft: { purpose: 'Ta dig genom höloftet upp på taket.', recap: 'Mormors lykta lyser i det mörka höloftet.' },
    billstaRoof: { purpose: 'Gå över taket. Göm dig när det blåser.', recap: 'Uppe på ladans tak blåser stormen hårt.' },
    billstaBrook: { purpose: 'Hoppa över bäcken på stenarna.', recap: 'Bakom huset börjar skogen. Där rinner en bäck.' },
    billstaLog: { purpose: 'Knuffa stocken ut i bäcken.', recap: 'Här är bäcken för bred. Stormen har fällt en torr gran.' },
    billstaBridge: { purpose: 'Gå över bäcken på stocken.', recap: 'Stocken ligger över bäcken som en bro.' },
    billstaRoots: { purpose: 'Klättra uppför granens rötter.', recap: 'Här börjar Billaberget. Backen är brant.' },
    billstaBoulders: { purpose: 'Följ godisspåret över stenarna.', recap: 'På Billaberget ligger jättestora stenar. Hasseln är full av nötter.' },
    billstaWind: { purpose: 'Göm dig bakom stenarna när det blåser.', recap: 'Stormen blåser över backen. Bakom stenarna är det lä.' },
    billstaBrow: { purpose: 'Gå upp på toppen av Billaberget.', recap: 'Härifrån ser man långt, ända ner till sundet.' },
    billstaFound: { purpose: 'Där nere! Båda trägubbarna på en sten.', recap: 'Blixten lyste upp sundet. Ugglan hörs långt borta.' },
  },
  helpers: {
    billstaFamily: 'Familjen letar med sina lampor.',
    billstaMorfar: 'Morfar står vid diket med sin långa stege.',
    billstaMormor: 'Mormor lyser åt mig med sin lykta.',
    billstaBoth: 'Mormor och morfar hjälper mig.',
    billstaForest: 'Mormor kommer efter med sin lykta.',
  },
};
