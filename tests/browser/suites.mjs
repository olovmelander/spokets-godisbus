// The browser suites, in the order they run, each with how many seconds it took on GitHub: the mean of the two runs of
// 8 November 2026 (pull requests #241 and #243, 151 minutes in all, where the game is drawn in software). The seconds are
// only weights: they say how to share the suites out when they run side by side. When one part runs much longer than
// the others, take new seconds from the "Browser suites:" line at the end of each job's log. A third number splits a
// long suite into that many runs, each with its share of the suite's own cases (shareOf, below). A new suite goes in
// this list, or the unit test tests/unit/browser-suites.test.ts fails.
export const SUITES = [
  ['smoke', 401],
  ['settings', 73],
  ['profiles', 59],
  ['photos', 59],
  ['photo-storage', 1],
  ['offline', 166],
  ['challenges', 483],
  ['adaptive-rendering', 96],
  ['audio-levels', 31],
  ['lifecycle', 33],
  ['texture-ownership', 31],
  ['story', 270],
  ['journey', 30],
  ['album', 54],
  ['helper', 138],
  ['toys', 57],
  ['pointing', 195],
  ['release-routing', 63],
  ['prologue', 713],
  ['device', 16],
  ['photo-focus', 1],
  ['colour-pipeline', 83],
  ['nightfall', 79],
  ['village', 272],
  ['bredbyn', 75],
  ['gpu-memory', 884, 2],
  ['water-light', 104],
  ['epilogue', 39],
  ['character-shadows', 501],
  ['forest-shadows', 40],
  ['canopy-light', 2],
  ['rim-light', 2],
  ['stone-courses', 2],
  ['memory-presentation', 20],
  ['dialogue-reading', 2],
  ['ghost-thoughts', 339],
  ['story-context', 248],
  ['opening-story', 309],
  ['endings', 195],
  ['forest-puzzles', 276],
  ['garden-loop', 1075, 2],
  ['garden-home', 126],
  ['mountain-loop', 301],
  ['player-motion', 349],
  ['family-help', 270],
  ['family-story', 54],
  ['myren-loop', 170],
  ['finale-stage', 186],
  ['model-installation', 43],
  ['shared-home', 46],
  ['aventyr2', 95],
];

/** The files in tests/browser that are not suites: what the suites share, and this list's own two files. */
// family-caps is an opt-in local check: public CI has no private family exports.
export const NOT_SUITES = ['budget', 'dialogue', 'family-caps', 'pause', 'picture', 'run', 'suites', 'visual-overhaul'];

/**
 * What runs: each suite, or each share of a split one (`garden-loop 2/2`), with the file it runs, the share it
 * passes as SHARD, and its part of the seconds.
 */
export function units() {
  return SUITES.flatMap(([name, seconds, shares = 1]) => Array.from({ length: shares }, (_, i) => ({
    name: shares > 1 ? `${name} ${i + 1}/${shares}` : name, file: name, shard: shares > 1 ? `${i + 1}/${shares}` : undefined,
    seconds: seconds / shares,
  })));
}

/**
 * This run's share of a split suite's cases: SHARD=2/3 takes every third case from the second, and is not the last
 * share. Without SHARD it is every case, and the last share: a suite run on its own runs whole.
 */
export function shareOf(cases, shard = process.env.SHARD) {
  const [which, of] = (shard ?? '1/1').split('/').map(Number);
  return { cases: cases.filter((_, i) => i % of === which - 1), last: which === of };
}

/**
 * The runs shared out over a number of parts, as evenly as their seconds allow: the heaviest goes to the part that is
 * lightest so far, and so on down. Inside a part they keep the order of the list. The same number of parts always
 * gives the same parts.
 */
export function parts(count) {
  const shared = Array.from({ length: count }, () => ({ suites: [], seconds: 0 }));
  const byWeight = units().map((unit, at) => ({ ...unit, at })).sort((a, b) => b.seconds - a.seconds || a.at - b.at);
  for (const unit of byWeight) {
    const lightest = shared.reduce((best, part) => (part.seconds < best.seconds ? part : best));
    lightest.suites.push(unit);
    lightest.seconds += unit.seconds;
  }
  return shared.map((part) => ({ suites: part.suites.sort((a, b) => a.at - b.at).map((unit) => unit.name), seconds: part.seconds }));
}
