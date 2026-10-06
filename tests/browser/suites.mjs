// The browser suites, in the order they run, each with how many seconds it took on GitHub on 5 October 2026
// (a run of 64 minutes in all, where the game is drawn in software). The seconds are only weights: they say
// how to share the suites out when they run side by side. A new suite goes in this list, or the unit test
// tests/unit/browser-suites.test.ts fails.
export const SUITES = [
  ['smoke', 194],
  ['settings', 35],
  ['profiles', 19],
  ['photos', 45],
  ['photo-storage', 2],
  ['offline', 82],
  ['challenges', 276],
  ['adaptive-rendering', 56],
  ['audio-levels', 10],
  ['lifecycle', 18],
  ['texture-ownership', 22],
  ['story', 69],
  ['journey', 22],
  ['album', 49],
  ['helper', 72],
  ['toys', 30],
  ['pointing', 82],
  ['release-routing', 23],
  ['prologue', 61],
  ['device', 12],
  ['photo-focus', 1],
  ['colour-pipeline', 50],
  ['nightfall', 49],
  ['village', 300],
  ['gpu-memory', 381],
  ['water-light', 63],
  ['epilogue', 22],
  ['character-shadows', 253],
  ['forest-shadows', 90],
  ['rim-light', 8],
  ['stone-courses', 8],
  ['memory-presentation', 12],
  ['ghost-thoughts', 177],
  ['story-context', 154],
  ['opening-story', 64],
  ['endings', 150],
  ['forest-puzzles', 103],
  ['garden-loop', 480],
  ['mountain-loop', 178],
  ['family-help', 145],
  ['myren-loop', 123],
  ['finale-stage', 119],
  ['model-installation', 8],
];

/** The files in tests/browser that are not suites: what the suites share, and this list's own two files. */
export const NOT_SUITES = ['budget', 'pause', 'picture', 'run', 'suites'];

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
