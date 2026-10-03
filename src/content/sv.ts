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
  keysHint: '← → springa · Mellanslag hoppa · håll in för att hoppa högre · ↑ ↓ klättra · E använd · Shift gå',
  padHint: 'Spaken springa och klättra · A hoppa · håll in för att hoppa högre · X använd',

  // What Använd says when there is something to use: one word for each thing Elof can do.
  verbs: {
    slide: 'Åk ner',
  },

  // The candy bag in the corner. Screen readers hear the name and then the number.
  bag: 'Godispåsen',

  // Stage 0a's test course.
  goal: 'Framme!',

  // Sköldhästen's wording.
  noWebGL: 'Den här webbläsaren kan tyvärr inte visa spelet.',
  retry: 'Försök igen',
} as const;
