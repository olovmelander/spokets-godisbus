// The browser suites, in the order they run, each with how many seconds it took on GitHub on 7 October 2026
// (the browser jobs of pull request #180: 111 minutes in all, where the game is drawn in software). The
// seconds are only weights: they say how to share the suites out when they run side by side. When one part
// runs much longer than the others, take new seconds from the "Browser suites:" line at the end of each
// job's log. A new suite goes in this list, or the unit test tests/unit/browser-suites.test.ts fails.
export const SUITES = [
  ['smoke', 380],
  ['settings', 79],
  ['profiles', 55],
  ['photos', 57],
  ['photo-storage', 1],
  ['offline', 158],
  ['challenges', 360],
  ['adaptive-rendering', 78],
  ['audio-levels', 30],
  ['lifecycle', 27],
  ['texture-ownership', 28],
  ['story', 247],
  ['journey', 33],
  ['album', 65],
  ['helper', 119],
  ['toys', 39],
  ['pointing', 174],
  ['release-routing', 40],
  ['prologue', 435],
  ['device', 20],
  ['photo-focus', 1],
  ['colour-pipeline', 65],
  ['nightfall', 72],
  ['village', 395],
  ['bredbyn', 320],
  ['gpu-memory', 639],
  ['water-light', 74],
  ['epilogue', 34],
  ['character-shadows', 375],
  ['forest-shadows', 28],
  ['rim-light', 2],
  ['stone-courses', 1],
  ['memory-presentation', 11],
  ['dialogue-reading', 5],
  ['ghost-thoughts', 197],
  ['story-context', 229],
  ['opening-story', 261],
  ['endings', 177],
  ['forest-puzzles', 134],
  ['garden-loop', 685],
  ['garden-home', 320],
  ['mountain-loop', 251],
  ['player-motion', 79],
  ['family-help', 192],
  ['family-story', 100],
  ['myren-loop', 169],
  ['finale-stage', 147],
  ['model-installation', 25],
];

/** The files in tests/browser that are not suites: what the suites share, and this list's own two files. */
export const NOT_SUITES = ['budget', 'dialogue', 'pause', 'picture', 'run', 'suites'];

/**
 * The suites shared out over a number of parts, as evenly as their seconds allow: the heaviest suite goes to
 * the part that is lightest so far, and so on down. Inside a part they keep the order of the list. The same
 * number of parts always gives the same parts.
 */
export function parts(count) {
  const shared = Array.from({ length: count }, () => ({ suites: [], seconds: 0 }));
  const byWeight = SUITES.map(([name, seconds], at) => ({ name, seconds, at })).sort((a, b) => b.seconds - a.seconds || a.at - b.at);
  for (const suite of byWeight) {
    const lightest = shared.reduce((best, part) => (part.seconds < best.seconds ? part : best));
    lightest.suites.push(suite);
    lightest.seconds += suite.seconds;
  }
  return shared.map((part) => ({ suites: part.suites.sort((a, b) => a.at - b.at).map((suite) => suite.name), seconds: part.seconds }));
}
