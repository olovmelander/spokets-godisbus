import type { ChapterWords } from './words';

/**
 * What is said in Billsta (docs/aventyr-2.md, Kapitel 7): at most about 40 characters a line, Swedish, no names but
 * the family's. Mormor and morfar are only "mormor" and "morfar": glad, warm and a little amazed at how small he
 * is, each with one thing of their own to help with (morfar's ladder, mormor's lantern), and nothing more about them.
 */
export const words: ChapterWords = {
  lines: {
    // 1. the narrow, the jetty and the reeds
    biArrive: 'Billsta! Här bor ju mormor och morfar.',
    biKlonk: 'Klonk!',
    biCurrent: 'Strömmen bär mig genom sundet!',
    biJetty: 'En brygga! Här går jag i land.',
    biReeds: 'Jag klättrar i vassen som en mus!',
    // 2. Billaberget's boulders, the hazel and the gusts
    biHill: 'Billaberget! Vilka stora stenar.',
    biHazel: 'Här växer hassel, full av nötter!',
    biWind: 'Blåsten! Jag gömmer mig bakom stenarna.',
    biWindow: 'Där! Mormor och morfars fönster lyser!',
    biKlonkKlonk: 'Klonk, klonk!',
    // 4. Morfar and his ladder
    biDitch: 'Diket är fullt av vatten. För brett!',
    biMorfarHere: 'Elof! Så liten du har blivit!',
    biLadderLay: 'Vänta, jag lägger stegen över diket.',
    biLadderOn: 'Så där. Gå på stegen, lilla vän.',
    biThanksMorfar: 'Tack, morfar! Du är stor som ett träd!',
    biToMormor: 'Mormor väntar vid ladan med lyktan.',
    // 3. the yard, and Mormor and her lantern
    biYard: 'Mormor och morfars gård! Nu är vi nära.',
    biMormorHere: 'Lilla Elof! Är det verkligen du?',
    biLantern: 'Jag lyser med lyktan och öppnar ladan.',
    biOpen: 'Ladudörren är öppen! Tack, mormor!',
    // 5. the hay loft and the roof
    biLoft: 'Höloftet! Det luktar sommar här.',
    biHatch: 'En lucka i golvet. Jag hoppar över!',
    biRoof: 'Upp på taket! Här blåser det hårt.',
    // 6. the flash, and the owl far off
    biThere: 'Där! På stenen ute i sundet!',
    biHolds: 'Gamla trägubben håller i lillgubben!',
    biOwl: 'Uhu … Hör du? Det är ugglan!',
    biDownToJetty: 'Kom, vi går ner till bryggan.',
    biKlonkCheer: 'Klonk! Klonk! Klonk!',
  },
  verbs: {
    biCallMorfar: 'Ropa på morfar',
    biCallMormor: 'Ropa på mormor',
  },
  purposes: {
    billstaNarrow: { purpose: 'Kliv på lövet och åk genom sundet.', recap: 'Älven bar mig ända till Billsta, där mormor och morfar bor.' },
    billstaReeds: { purpose: 'Gå längs bryggan och klättra uppför vassen.', recap: 'Strömmen bar mig genom sundet till en brygga i vassen.' },
    billstaBoulders: { purpose: 'Följ godisspåret över stenarna.', recap: 'Under Billaberget ligger jättestora stenar. Hasseln är full av nötter.' },
    billstaWind: { purpose: 'Göm dig bakom stenarna när det blåser.', recap: 'Stormen blåser över backen. Bakom stenarna är det lä.' },
    billstaWindow: { purpose: 'Gå ner mot det tända fönstret.', recap: 'Mormor och morfars fönster lyser. Snart är jag där.' },
    billstaMorfar: { purpose: 'Ropa på morfar vid diket.', recap: 'Diket är fullt av vatten. Morfar står där med sin långa stege.' },
    billstaLadder: { purpose: 'Gå över diket på morfars stege.', recap: 'Morfar har lagt sin stege över diket åt mig.' },
    billstaYard: { purpose: 'Följ godisspåret över gården.', recap: 'Morfar hjälpte mig över diket. Mormor väntar vid ladan.' },
    billstaMormor: { purpose: 'Ropa på mormor vid vedboden.', recap: 'Ladan är stängd. Mormor har sin lykta med sig.' },
    billstaBarn: { purpose: 'Gå uppför plankorna in i ladan.', recap: 'Mormor lyser med lyktan och har öppnat ladan åt mig.' },
    billstaLoft: { purpose: 'Ta dig genom höloftet upp på taket.', recap: 'Mormors lykta lyser i det mörka höloftet.' },
    billstaRoof: { purpose: 'Gå över taket. Göm dig när det blåser.', recap: 'Uppe på ladans tak blåser stormen hårt.' },
    billstaFound: { purpose: 'Där ute! Båda trägubbarna på en sten.', recap: 'Blixten lyste upp sundet. Ugglan hörs långt borta.' },
  },
  helpers: {
    billstaFamily: 'Familjen följer efter på vägen med sina lampor.',
    billstaMorfar: 'Morfar står vid diket med sin långa stege.',
    billstaMormor: 'Mormor lyser åt mig med sin lykta.',
    billstaBoth: 'Mormor och morfar är här. Familjen är på väg.',
  },
};
