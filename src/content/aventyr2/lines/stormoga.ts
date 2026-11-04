import type { ChapterWords } from './words';

/** What is said in Stormens öga, the second adventure's final (docs/aventyr-2.md). */
export const words: ChapterWords = {
  lines: {
    soFarLine: 'Stenen är för långt ut att hoppa.',
    soOwlCome: 'Ugglan! Du kom tillbaka!',
    soQuiet: 'Det blev alldeles tyst …',
    soStars: 'Stjärnorna! Vi är i stormens öga.',
    soFound: 'Där är ni! Jag har letat överallt.',
    soKlonk: 'Klonk …',
    soHeld: 'Du höll lillgubben hela natten.',
    soKnow: 'Du vet hur det är att vara ensam.',
    soGoldLine: 'Ett geléhallon i guldpapper!',
    soShareLine: 'Samma sort som jag delade med dig.',
    soMamma: 'Elof! Där är du ju!',
    soPappa: 'Och där är mina två trägubbar!',
    soMoa: 'Alla är hittade, lillebror!',
    soBertil: 'Bästa natten någonsin!',
    soHome: 'Nu går vi hem. Allihop.',
  },
  verbs: {
    soCallOwl: 'Ropa på ugglan',
    soBoardOwl: 'Kliv upp på ugglan',
    soTakeGold: 'Ta emot guldgodiset',
  },
  purposes: {
    soReach: { purpose: 'Ta dig ut till stenen i sjön.', recap: 'Båda trägubbarna sitter på en sten långt ute i vågorna.' },
    soRide: { purpose: 'Flyg med ugglan ut till stenen.', recap: 'Ugglan från skogen kom tillbaka för att hjälpa mig.' },
    soMeet: { purpose: 'Gå fram till trägubbarna.', recap: 'Stormen tystnade. Vi är i stormens öga, under stjärnorna.' },
    soTaste: { purpose: 'Smaka på guldgodiset.', recap: 'Gamla trägubben hade sparat ett geléhallon åt mig. Nu delar den med mig.' },
    soGrow: { purpose: 'Guldgodiset gör mig stor igen.', recap: 'Jag har båda trägubbarna i händerna.' },
    soGoHome: { purpose: 'Gå hem med familjen.', recap: 'Alla är hittade. Familjens lampor lyser på stranden.' },
  },
  helpers: {
    soFamilyLamps: 'Familjen lyser med sina lampor från stranden.',
    soFriends: 'Klonk och ugglan är här. Familjen är på väg.',
    soFamilyShore: 'Mamma, Pappa, Moa och Bertil väntar på stranden.',
  },
  moments: { oga: 'Stormens öga', motet: 'Där är ni!', stor: 'Guldgodiset' },
};
