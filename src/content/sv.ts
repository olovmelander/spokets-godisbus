/**
 * Every Swedish string the player can see (plan §3.7): du-tilltal, ” ” and –, plain child words.
 * Olov reads every line aloud before a release.
 */
export const sv = {
  title: 'Elof och det stora godisäventyret',

  // The two action buttons. Använd will show the specific verb once there is something to do.
  hop: 'Hoppa',
  act: 'Använd',
  // The button that calls the helper: no words in the game, a bird on the button.
  help: 'Hjälp',

  // Shown instead of the on-screen controls when a keyboard or a gamepad is in use.
  keysHint: '← → springa och gunga · Mellanslag hoppa och släppa · ↑ ↓ klättra · E använd · Shift gå',
  padHint: 'Spaken springa, klättra och gunga · A hoppa och släppa · X använd',

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

  // What is said, in bubbles: the game has no voices. At most about 40 characters each (plan §3.7).
  lines: {
    follow1: 'Följ godisspåret, Elof.',
    follow2: 'Vi är nära dig hela tiden.',
    stomp: 'Ge tillbaka mitt godis!',
    tiny: 'Lillebror?! Du är ju pytteliten!',
    givesAway: 'Spöket ger bort mitt godis!?',
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
  // The album in the pause panel: every kind, found or not.
  album: { title: 'Godisalbumet', count: '{found} av {total} sorter' },

  // The card at a chapter's end.
  end: {
    chapter: 'Kapitel {n} klart!',
    // A part of the story with a name of its own, by its id.
    named: { prolog: 'Lördagsmorgon', norrsken: 'Finalen klar!', epilog: 'Slut' } as Record<string, string>,
    // The last card of the story, in place of "Fortsättning följer!".
    closing: { epilog: 'Klonk kunde inte säga det med ord. Men Elof förstod.' } as Record<string, string>,
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

  // The title and the first start.
  start: {
    begin: 'Börja',
    resume: 'Fortsätt',
    over: 'Börja om från början',
    how: 'Hur vill du spela?',
    rotate: 'Vänd skärmen på bredden!',
  },

  // The pause panel. Every button has a picture beside its word, for a child who can't read yet.
  pause: {
    open: 'Paus',
    title: 'Paus',
    resume: 'Spela vidare',
    close: 'Stäng',
    style: 'Spelsätt',
    aventyr: 'Äventyr',
    aventyrHint: 'Du hoppar och gungar själv.',
    lugnt: 'Lugnt',
    lugntHint: 'Spelet hjälper dig med hopp och gungor.',
    swingHelp: 'Hjälp med svingen',
    easyJumps: 'Lätta hopp',
    slower: 'Lugnare tempo',
    sound: 'Ljud',
    music: 'Musik',
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

  // Saving (Sköldhästen's wording).
  saveOff: 'Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå.',
  saveUnreadable: 'Det sparade spelet gick inte att läsa.',
  startOver: 'Börja om från början',

  // Stage 0a's test course.
  goal: 'Framme!',

  // Sköldhästen's wording.
  noWebGL: 'Den här webbläsaren kan tyvärr inte visa spelet.',
  retry: 'Försök igen',
} as const;
