import type { ChapterWords } from './words';

/**
 * What is said in Älven (docs/aventyr-2.md, Kapitel 6): at most about 40 characters a line, Swedish, no names but
 * the family's and the real places'. The river carries the two figures south from Flärken past Bredbyn, through the
 * lake and down Moälven; then the family's car, to Billsta three mil off, where mormor and morfar live. Wood
 * floats: Klonk floats beside him too.
 */
export const words: ChapterWords = {
  lines: {
    // 0. the lake's outlet
    alArrive: 'Ån rinner ut ur sjön. Där åkte de!',
    alKlonkFloats: 'Klonk! Du simmar utan att sprattla!',
    alKlonk: 'Klonk!',
    alFlash: 'Blixten! Lillgubben guppar på ån!',
    // 1. the current: the raft, the gravel bank, the birch leaf
    alRaftSeen: 'En liten flotte! Den kan bära mig.',
    alCurrent: 'Strömmen tar oss! Håll i dig, Klonk!',
    alOldOne: 'Där! Gamla trägubben på en stock!',
    alLogsWait: 'Stockar i virveln! Jag väntar in dem.',
    alLeafSeen: 'Ett björklöv, som i rännstenen!',
    // 2. the stones, the bobbing logs and the eddy
    // 3. the bridge in Bredbyn, and Pappa's scarf
    alBredbyn: 'Bredbyn igen! Där borta är Olympia.',
    alRapids: 'Forsen är alldeles för vild!',
    alPappaHere: 'Elof! Jag står här uppe på bron!',
    alScarfDown: 'Jag sänker ner min halsduk.',
    alTakeHold: 'Ta tag i halsduken, Elof!',
    alUp: 'Nu åker halsdukshissen!',
    alOver: 'Där! Nu är du förbi forsen.',
    alThanks: 'Tack, Pappa! Världens mjukaste hiss.',
    alFollow: 'Vi kör efter dig längs ån.',
    // 4. the beaver's stumps and lodge, and an otter
    alLodge: 'En bäverhydda. Jag smyger över taket.',
    alOtter: 'En utter! Den simmar ut mot stenen.',
    // 5. the lake, and the owl from the forest
    alLake: 'Sjön! Den är alldeles för bred.',
    alOwlSeen: 'Ugglan från skogen! Den har följt oss!',
    alOwlHere: 'Lilla uggla, kan du ta mig över sjön?',
    alOwlFly: 'Hu-hu! Vi flyger över sjön!',
    alSeeLittle: 'Lillgubben! Långt fram på ån!',
    alOwlThanks: 'Tack, lilla uggla! Du är en riktig vän.',
    // 6. Moälven, and the family's car to Billsta
    alMoalven: 'Nu heter ån Moälven. Så stor den är!',
    alOldAhead: 'Gamla trägubben! Han flyter före oss.',
    alLast: 'En godisbit till. Men sedan … inget.',
    alGone: 'Spåret är slut. Jag ser dem inte längre.',
    alAfraid: 'Tänk om vi aldrig hittar dem …',
    alKlonkNear: 'Klonk …',
    alMoaNever: 'Vi letar tillsammans. Jag är här.',
    alBertilPocket: 'Vänta! Jag har godis i fickan!',
    alMoaTrail: 'Då lägger vi ett eget spår åt dig!',
    alBillsta: 'Älven rinner ända till Billsta.',
    alCar: 'Hoppa in, Elof! Vi kör dit med bilen.',
    alWindow: 'Mormor och morfar kan hjälpa oss leta!',
    alKlonkEnd: 'Klonk, klonk!',
  },
  verbs: {
    alScarf: 'Ta tag i halsduken',
    alCallOwl: 'Ropa på ugglan',
    alBoardOwl: 'Hoppa upp på ugglan',
  },
  purposes: {
    alvenOutlet: { purpose: 'Följ ån efter lillgubben.', recap: 'Lillgubben föll i sjön, och ån tog honom. Gamla trägubben följde efter på en stock.' },
    alvenRaft: { purpose: 'Kliv på flotten vid stranden.', recap: 'Ån är för bred att hoppa över. En liten flotte ligger vid stranden.' },
    alvenCurrent: { purpose: 'Åk med strömmen nerför ån.', recap: 'Strömmen bär mig. Klonk flyter bredvid, för trä flyter.' },
    alvenEddy: { purpose: 'Vänta in stockarna och hoppa.', recap: 'Vattnet snurrar stockarna fram och tillbaka i virveln.' },
    alvenLeaf: { purpose: 'Kliv på björklövet.', recap: 'Gamla trägubben flyter före på sin stock och lämnar godis åt mig.' },
    alvenStones: { purpose: 'Hoppa på stenarna och stockarna.', recap: 'Stockarna guppar i strömmen, men de håller mig.' },
    alvenPappa: { purpose: 'Ropa på Pappa vid bron.', recap: 'Forsen vid bron i Bredbyn är för vild. Pappa står uppe på bron.' },
    alvenScarf: { purpose: 'Ta tag i Pappas halsduk.', recap: 'Pappa har sänkt ner sin halsduk från bron. Han håller i den.' },
    alvenLifted: { purpose: 'Håll i halsduken. Pappa lyfter dig!', recap: 'Jag hänger i Pappas halsduk, högt över forsen.' },
    alvenLodge: { purpose: 'Klättra över bäverhyddan.', recap: 'Pappa lyfte mig över forsen. Här bor en bäver.' },
    alvenLake: { purpose: 'Ropa på ugglan vid sjön.', recap: 'Sjön är för bred. Ugglan från skogen har följt efter oss.' },
    alvenBoard: { purpose: 'Hoppa upp på ugglan.', recap: 'Ugglan har landat bredvid mig. Den kan ta mig över sjön.' },
    alvenFly: { purpose: 'Flyg på ugglan över sjön.', recap: 'Ugglan bär mig högt över den stora sjön.' },
    alvenMoalven: { purpose: 'Följ trägubbarna nerför älven.', recap: 'Nu heter ån Moälven. Lillgubben och gamla trägubben flyter före.' },
    alvenLost: { purpose: 'Spåret är slut. Vad gör vi nu?', recap: 'Här slutar godisspåret. Jag har tappat trägubbarna ur sikte.' },
    alvenBillsta: { purpose: 'Åk med familjen till Billsta.', recap: 'Godisspåret tog slut. Vi kör tre mil till Billsta och letar vidare med mormor och morfar.' },
  },
  helpers: {
    alvenFamily: 'Familjen kör längs vägen och lyser med lamporna.',
    alvenPappa: 'Pappa står på bron i Bredbyn med sin lampa.',
    alvenOwl: 'Ugglan från skogen hjälper mig igen.',
  },
};
