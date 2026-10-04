/**
 * Every Swedish string the player can see (plan §3.7): du-tilltal, ” ” and –, plain child words.
 * Olov reads every line aloud before a release.
 */
export const sv = {
  title: 'Elof och det stora godisäventyret',
  homeScreen: {
    shortName: 'Elofs äventyr',
    title: 'Lägg till på hemskärmen',
    apple: 'På iPhone och iPad: öppna spelet i Safari, tryck på Dela och välj Lägg till på hemskärmen.',
    android: 'På Android: öppna webbläsarens meny och välj Installera app eller Lägg till på startskärmen.',
    offline: 'Öppna spelet med internet först. Delar som har laddats kan sedan spelas utan internet, så länge enheten har plats att spara dem.',
  },
  painting: {
    title: 'Måla ögonen', hint: 'Följ ringen med fingret eller musen.',
    assist: 'Måla med hjälp', picture: 'Spökets ögon. Följ den prickade ringen.',
    figurePicture: 'Min nya trägubbes ögon. Följ den prickade ringen.',
    tryAgain: 'Dra med penseln, så hjälper Pappa till.', painted: 'Ett öga till liv!',
  },
  carving: {
    title: 'Min första trägubbe', hint: 'Alltid bort från kroppen. Följ pilen.',
    assist: 'Tälj med Pappa', picture: 'Elof sitter till vänster. Dra från handen längs pilen, bort från kroppen.',
    tryAgain: 'Bort från kroppen. Pappa hjälper dig att prova igen.', carved: 'Ett tag med kniven!',
    step: 'Tag {step} av 3',
  },
  sharing: {
    title: 'Dela godiset', choose: 'Välj något gott.', friend: 'Välj en vän.', back: 'Tillbaka',
    bird: 'Lavskrikan får ett lingon ur fickan.', given: 'Har fått', nowFriend: '{sweet} – vem ska få den?',
    thanks: '{friend} fick {sweet}!',
    sweets: { gelehallon: 'Geléhallon', karamell: 'Karamell', skumbanan: 'Skumbanan', lingon: 'Lingon' },
    friends: { tragubbe: 'Trägubben', spoket: 'Spöket', jay: 'Lavskrikan' },
  },
  party: {
    title: 'Godiskalaset', thanks: '{friend} tackar glatt för {sweet}!',
    friends: { mamma: 'Mamma', pappa: 'Pappa', moa: 'Moa', bertil: 'Bertil', spoket: 'Spöket' },
  },

  // The two action buttons. Använd will show the specific verb once there is something to do.
  hop: 'Hoppa',
  act: 'Använd',
  // The button that calls the helper: a ghost portrait in Kapitel 1, a jay from Kapitel 2.
  help: 'Hjälp',

  // Shown instead of the on-screen controls when a keyboard or a gamepad is in use.
  keysHint: '← → springa och gunga · Mellanslag hoppa och släppa · ↑ ↓ klättra · E använd · Shift gå',
  padHint: 'Spaken springa, klättra och gunga · A hoppa och släppa · X använd',

  // The tutorial is wordless on screen; these labels also make its pictures available to a screen reader.
  tutorial: {
    keys: { move: '← →', hop: '␣', act: 'E' },
    pad: { move: '✚', hop: 'A', act: 'X' },
    touch: { move: 'För fingret åt sidan för att gå.', hop: 'Tryck på Hoppa.', act: 'Tryck på Använd för att ta stjärnan.' },
    // Spoken descriptions use the same controls as the key reference.
    keyboard: { move: 'Gå med vänster och höger piltangent.', hop: 'Hoppa med mellanslag.', act: 'Ta stjärnan med E.' },
    gamepad: { move: 'Gå med vänster spak eller styrkorset.', hop: 'Hoppa med A.', act: 'Ta stjärnan med X.' },
  },

  // What Använd says when there is something to use: one word for each thing Elof can do.
  verbs: {
    slide: 'Åk ner',
    lace: 'Kasta snöret',
    push: 'Knuffa',
    pull: 'Dra',
    turn: 'Vänd',
    take: 'Ta',
    call: 'Ropa',
    callMoa: 'Ropa på Moa',
    callPappa: 'Ropa på Pappa',
    callBertil: 'Ropa på Bertil',
    callMamma: 'Ropa på Mamma',
    takeLight: 'Ta lysklubban',
    climbOn: 'Kliv upp',
    board: 'Kliv på',
    lift: 'Lyft',
    lowerLace: 'Sänk snöret',
    paintEyes: 'Måla ögon',
    takeBag: 'Ta påsen',
    giveTragubbe: 'Ge trägubben',
    giveGhost: 'Ge spöket',
    giveJay: 'Ge lavskrikan',
    taste: 'Smaka',
    goHome: 'Gå hem',
    paintGhost: 'Måla ögonen!',
    giveMamma: 'Ge Mamma',
    givePappa: 'Ge Pappa',
    giveMoa: 'Ge Moa',
    giveBertil: 'Ge Bertil',
    takeKnife: 'Ta kniven',
    carve: 'Tälj',
    brush: 'Borsta tänderna',
    give: 'Ge',
    pick: 'Plocka',
    leaveBerry: 'Lämna ett lingon',
    rideAnts: 'Åk med myrorna',
    standOn: 'Ställ dig här',
    grab: 'Ta!',
  },

  // Who a bubble belongs to. The ghost is "spöket" until Elof names it in the epilogue.
  who: {
    mamma: 'Mamma',
    pappa: 'Pappa',
    moa: 'Moa',
    bertil: 'Bertil',
    elof: 'Elof',
    spoket: 'Spöket',
  },
  ghostName: 'Klonk',
  giveKlonk: 'Ge Klonk',
  memories: {
    title: 'Pappas minnen',
    watch: 'Se minnet igen',
    waiting: 'Ett minne att hitta',
    next: 'Nästa bild',
    back: 'Tillbaka',
  },

  // What is said, in bubbles: the game has no voices. At most about 40 characters each (plan §3.7).
  lines: {
    follow1: 'Följ godisspåret, Elof.',
    // The extra chapter, Byn: a Saturday later, on the way to the candy shop.
    // At the party, when what he found under the deck is given back (plan §4.8).
    clipBack: 'Mitt hårspänne! Tack, lillebror!',
    marbleBack: 'Kula! Min kula!',
    coinBack: 'En krona! Den får du behålla.',
    again: 'En stjärna till. Nu handlar vi!',
    lake: 'En sjö! Mitt på gatan.',
    shop: 'Framme! Det luktar godis.',
    shopInside: 'Godiset är större än jag!',
    shopBag: 'En påse att dela på!',
    follow2: 'Vi är nära dig hela tiden.',
    stomp: 'Ge tillbaka mitt godis!',
    tiny: 'Lillebror?! Du är ju pytteliten!',
    givesAway: 'Spöket ger bort mitt godis!?',
    vittraBerry: 'Ett lingon till er också.',
    heja: 'Heja lillebror!',
    thanked: 'Spöket tackade mig!',
    spangen: 'På myren går vi på spången.',
    fetch: 'Spöket vill hämta hem min trägubbe!',
    // Pappa on the summit: one thing said, in four bubbles.
    first1: 'Min allra första trägubbe …',
    first2: 'Den täljde jag till dig',
    first3: 'när du var liten, Elof.',
    first4: 'Vi tappade den här uppe.',
    // The prologue and the epilogue.
    tonight: 'Den får du öppna ikväll.',
    klonk: 'Klonk, klonk!',
    named: 'Du ska heta Klonk!',
    away: 'Alltid bort från kroppen.',
    carved: 'Jag kan tälja!',
  },

  // The sixteen kinds of hidden candy (plan §4.3): plain names of sorts, never a brand.
  kinds: {
    gelehallon: 'Geléhallon',
    gummibjorn: 'Gummibjörn',
    skumbanan: 'Skumbanan',
    skumsvamp: 'Skumsvamp',
    sockerbit: 'Sockerbit',
    gummiorm: 'Gummiorm',
    chokladkola: 'Chokladkola',
    colaflaska: 'Colaflaska',
    chokladpeng: 'Chokladpeng',
    stektagg: 'Stekt ägg',
    surnapp: 'Sur napp',
    lakritskonfekt: 'Lakritskonfekt',
    polkagris: 'Polkagris',
    graddkola: 'Gräddkola',
    salmiakruta: 'Salmiakruta',
    chokladpralin: 'Chokladpralin',
  } as Record<string, string>,
  // Said at the top of the screen when a new kind is found, and under the stickers on a chapter's card.
  found: 'Ny sort: {name}!',
  stickers: 'Gömt godis',
  // Hittegods (plan §4.8): the small things lost under the deck. Said at the top of the screen when he
  // finds one, and shown in the album. Plain things, and never a brand.
  lost: { marble: 'Bertils kula', clip: 'Moas hårspänne', brick: 'En leksakskloss', coin: 'En krona' } as Record<string, string>,
  lostFound: 'Du hittade något: {name}!',
  lostTitle: 'Hittegods',
  // Daggklockspelet (plan §4.8): said when the drops play the opening theme in order.
  dewSong: 'Hela gräsmattan glittrar!',
  keepsakes: 'Små minnen',
  vittraSticker: 'Vittrornas tack',
  vittraFound: 'Ett klistermärke! Tack för lingonet.',
  // The album in the pause panel: every kind, found or not.
  album: { title: 'Godisalbumet', count: '{found} av {total} sorter', golden: 'Det gyllene geléhallonet', goldenFound: 'Alla sorter! Ett geléhallon i guld.' },
  photos: {
    title: 'Foton', journey: 'Vårt äventyr', empty: 'Här samlas bilder från ditt äventyr.',
    open: 'Titta på {name}', previous: 'Förra', next: 'Nästa', back: 'Tillbaka', done: 'Klart',
    count: '{n} av {total}', thanks: 'Tack för äventyret!', again: 'Se äventyret igen',
    credits: 'Spöket är täljt av Pappa Emil. Spelet är gjort till Elof av morbror Olov – med hjälp av Claude och Codex.',
    moments: {
      shrinking: 'Liten som en godis', swing: 'Första svingen', plane: 'Moas flygplan', cap: 'Bertils kepsbåt',
      crane: 'På tranans rygg', aurora: 'Under norrskenet', carving: 'Min första trägubbe',
    },
  },
  explore: {
    title: 'Utforska vidare',
    hint: 'Välj en plats. Allt du har hittat finns kvar.',
    routeFound: 'Utmaningsgodiset hittat',
    routeWaiting: 'En utmaningsväg att utforska',
    chapters: { prolog: 'Lördagsmorgon', garden: 'Gården', granskog: 'Granskogen', myren: 'Myren', berget: 'Berget', norrsken: 'Norrskenet', epilog: 'Godiskalaset', byn: 'Byn' } as Record<string, string>,
    icons: { prolog: '☀', garden: '❀', granskog: '♧', myren: '≈', berget: '△', norrsken: '✧', epilog: '⌂', byn: '⌂' } as Record<string, string>,
  },

  // The card at a chapter's end.
  end: {
    chapter: 'Kapitel {n} klart!',
    // A part of the story with a name of its own, by its id.
    named: { prolog: 'Lördagsmorgon', norrsken: 'Finalen klar!', epilog: 'Slut', byn: 'Byn klar!' } as Record<string, string>,
    // The last card of the story, in place of "Fortsättning följer!".
    closing: {
      epilog: 'Klonk kunde inte säga det med ord. Men Elof förstod.',
      byn: 'Lördagsgodiset är köpt. Nu går vi hem.',
    } as Record<string, string>,
    // On the story's last card, the button to an extra chapter.
    bonus: 'Ett kapitel till',
    course: 'Framme!',
    next: 'Fortsättning följer!',
    onward: 'Nästa kapitel',
    again: 'Spela igen',
    candy: 'godisar i påsen',
  },

  // A memory has no words. This is what a screen reader says while its pictures are shown.
  memory: 'Ett minne',

  // Moas karta: a child's names for the places, as she would write them.
  map: {
    title: 'Moas karta',
    home: 'Hemma',
    forest: 'Granskogen',
    brook: 'Bäcken',
    bog: 'Myren',
    mountain: 'Berget',
    here: 'Här är du',
  },

  // The candy bag in the corner. Screen readers hear the name and then the number.
  bag: 'Godispåsen',

  // Chapter codes (plan §6.9): three plain words that open a chapter's start on another device. No names.
  codes: {
    garden: ['DAGG', 'SNÖRE', 'BRÄDA'],
    granskog: ['GRAN', 'KOTTE', 'MOSSA'],
    myren: ['TUVA', 'SPÅNG', 'TRANA'],
    berget: ['TALL', 'STEN', 'VIND'],
    norrsken: ['TOPP', 'KVÄLL', 'STJÄRNA'],
    epilog: ['KNIV', 'SPÅN', 'LÖRDAG'],
    byn: ['GATA', 'LÖV', 'CYKEL'],
  } as Record<string, readonly [string, string, string]>,
  code: {
    // On a chapter's card, over the next chapter's three words.
    next: 'Kod till nästa kapitel',
    // On the title.
    have: 'Jag har en kod',
    hint: 'Skriv de tre orden',
    open: 'Öppna',
    wrong: 'Den koden finns inte. Titta på kortet en gång till!',
  },

  // The title and the first start.
  start: {
    begin: 'Börja',
    resume: 'Fortsätt',
    over: 'Börja om från början',
    how: 'Hur vill du spela?',
    rotate: 'Vänd skärmen på bredden!',
  },

  players: {
    choose: 'Byt spelare', new: 'Ny spelare', name: 'Vad vill du heta?',
    local: 'Namnet stannar på den här enheten. Alla spelar som Elof.',
    next: 'Välj spelsätt', back: 'Tillbaka', settings: 'Inställningar',
    remove: 'Ta bort {name}', removeAsk: 'Ta bort {name} och allt som spelaren har sparat?',
    restartAsk: 'Börja om från början för {name}? Godis, bilder och framsteg tas bort.',
    yes: 'Ja', no: 'Nej, gå tillbaka', unreadable: 'Kan inte läsas',
    error: 'Det gick inte att spara ändringen. Försök igen.',
    indexUnreadable: 'Spelarlistan gick inte att läsa. Det sparade finns kvar. Prova att ladda om sidan.',
    preserved: 'Det sparade spelet gick inte att läsa. Det finns kvar. Välj en annan spelare eller börja om.',
  },

  // The pause panel. Every button has a picture beside its word, for a child who can't read yet.
  pause: {
    open: 'Paus',
    title: 'Paus',
    resume: 'Spela vidare',
    home: 'Till startsidan',
    close: 'Stäng',
    style: 'Spelsätt',
    aventyr: 'Äventyr',
    aventyrHint: 'Du hoppar och gungar själv.',
    lugnt: 'Lugnt',
    lugntHint: 'Spelet hjälper dig med hopp och gungor.',
    swingHelp: 'Hjälp med svingen',
    easyJumps: 'Lätta hopp',
    followFinger: 'Följ fingret',
    followHint: 'Håll fingret dit du vill gå. Släpp för att stanna.',
    graphics: 'Grafik',
    graphicsAuto: 'Auto',
    graphicsLow: 'Låg',
    graphicsMid: 'Mellan',
    graphicsHigh: 'Hög',
    graphicsHint: 'Auto väljer åt dig. Låg gör bilden enklare.',
    graphicsFallback: 'Den här enheten använder Låg.',
    slower: 'Lugnare tempo',
    sound: 'Ljud',
    music: 'Musik',
    effectsVolume: 'Ljudvolym',
    musicVolume: 'Musikvolym',
    effectsQuieter: 'Sänk ljudvolymen',
    effectsLouder: 'Höj ljudvolymen',
    musicQuieter: 'Sänk musikvolymen',
    musicLouder: 'Höj musikvolymen',
    loud: 'Ljud även i tyst läge',
    lefty: 'Vänsterhänt',
    bigText: 'Större text',
    calm: 'Mindre rörelse',
    // How much the helper does by itself (plan §4.6).
    help: 'Hjälp',
    helpAsk: 'Bara när jag frågar',
    helpRemind: 'Påminn mig',
    helpGuide: 'Guida mig',
    stuck: 'Jag har fastnat',
    stuckAsk: 'Tillbaka till den stora godisbiten?',
    stuckYes: 'Ja, tillbaka',
    stuckNo: 'Nej, spela vidare',
  },

  controls: {
    title: 'Tangenter och handkontroll',
    back: 'Tillbaka till paus',
    keyboard: 'Tangentbord',
    gamepad: 'Handkontroll',
    keyboardRows: [
      ['← → / A D', 'Springa och gunga'],
      ['Shift + ← → / A D', 'Gå långsamt'],
      ['Mellanslag / ↑ / W', 'Hoppa. Håll för högre hopp.'],
      ['↑ ↓ / W S', 'Klättra på slang och snöre'],
      ['Mellanslag', 'Släpp gungan'],
      ['E / Enter', 'Använd det som är nära'],
      ['H', 'Ropa på hjälparen'],
      ['G', 'Öppna godisalbumet'],
      ['Esc / P', 'Paus'],
      ['Tab / Enter / Esc', 'Välj / tryck / tillbaka i menyer'],
    ],
    gamepadRows: [
      ['Spaken / styrkorset', 'Springa, klättra och gunga'],
      ['A', 'Hoppa och släpp. Håll för högre hopp.'],
      ['X', 'Använd det som är nära'],
      ['Y', 'Ropa på hjälparen'],
      ['View', 'Öppna godisalbumet'],
      ['Start', 'Paus'],
      ['Spaken / styrkorset', 'Välj i menyer'],
      ['A / B', 'Tryck / tillbaka i menyer'],
    ],
  },

  // Saving (Sköldhästen's wording).
  saveOff: 'Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå.',
  saveUnreadable: 'Det sparade spelet gick inte att läsa.',
  startOver: 'Börja om från början',

  // Stage 0a's test course.
  goal: 'Framme!',

  // Sköldhästen's wording.
  noWebGL: 'Den här webbläsaren kan tyvärr inte visa spelet.',
  loadFailed: 'Något gick fel när spelet laddades.',
  contextLost: 'Bilden försvann en stund. Spelet är pausat och det du har gjort är sparat.',
  contextRestored: 'Bilden är tillbaka. Fortsätt när du är redo!',
  recoveryTitle: 'Spelet väntar',
  retry: 'Försök igen',
} as const;
