/**
 * Every Swedish string the player can see (plan §3.7): du-tilltal, ” ” and –, plain child words.
 * Olov reads every line aloud before a release.
 */
export const sv = {
  title: 'Elof och det stora godisäventyret',

  // The two action buttons. Använd will show the specific verb once there is something to do.
  hop: 'Hoppa',
  act: 'Använd',

  // Shown instead of the on-screen controls when a keyboard or a gamepad is in use.
  keysHint: '← → springa och gunga · Mellanslag hoppa och släppa · ↑ ↓ klättra · E använd · Shift gå',
  padHint: 'Spaken springa, klättra och gunga · A hoppa och släppa · X använd',

  // What Använd says when there is something to use: one word for each thing Elof can do.
  verbs: {
    slide: 'Åk ner',
    lace: 'Kasta snöret',
    push: 'Knuffa',
    pull: 'Dra',
  },

  // The candy bag in the corner. Screen readers hear the name and then the number.
  bag: 'Godispåsen',

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
