// The browser suites, in the order they run, each with how many seconds it took on GitHub: the mean of three runs on
// 8 November 2026 (pull requests #241, #243 and #244, where the game is drawn in software). The seconds are only
// weights: they say how to share the suites out when they run side by side. When one part runs much longer than the
// others, take new seconds from the "Browser suites:" line at the end of each job's log. A list of seconds splits a long
// suite into that many runs, each with its share of the suite's own cases (shareOf, below) and its own seconds, as its
// shares last on GitHub. A new suite goes in this list, or the unit test tests/unit/browser-suites.test.ts fails.
export const SUITES = [
  ['smoke', 397],
  ['settings', 82],
  ['profiles', 58],
  ['photos', 62],
  ['photo-storage', 1],
  ['offline', 175],
  ['challenges', 507],
  ['adaptive-rendering', 93],
  ['audio-levels', 28],
  ['lifecycle', 33],
  ['texture-ownership', 30],
  ['story', 260],
  ['journey', 30],
  ['album', 58],
  ['helper', 133],
  ['toys', 54],
  ['pointing', 176],
  ['release-routing', 57],
  ['prologue', 687],
  ['device', 20],
  ['photo-focus', 1],
  ['colour-pipeline', 74],
  ['nightfall', 88],
  ['village', 286],
  ['bredbyn', 78],
  // Its last share also cycles quality, size, Pause and the context at High: most of its time.
  ['gpu-memory', [156, 828]],
  ['water-light', 111],
  ['epilogue', 36],
  ['character-shadows', 435],
  ['forest-shadows', 44],
  ['canopy-light', 2],
  ['rim-light', 2],
  ['stone-courses', 2],
  ['memory-presentation', 20],
  ['dialogue-reading', 2],
  ['talk-life', 40],
  ['ghost-thoughts', 337],
  ['story-context', 260],
  ['opening-story', 323],
  ['endings', 208],
  ['forest-puzzles', 263],
  ['garden-loop', [427, 517]],
  ['garden-home', 122],
  ['mountain-loop', 298],
  ['player-motion', 306],
  ['family-help', 240],
  ['family-story', 53],
  ['myren-loop', 155],
  ['finale-stage', 196],
  ['model-installation', 39],
  ['shared-home', 43],
  ['aventyr2', 91],
];

/** The files in tests/browser that are not suites: what the suites share, and this list's own two files. */
// family-caps is an opt-in local check: public CI has no private family exports.
export const NOT_SUITES = ['budget', 'dialogue', 'family-caps', 'pause', 'picture', 'run', 'suites', 'visual-overhaul'];

/**
 * What runs: each suite, or each share of a split one (`garden-loop 2/2`), with the file it runs, the share it
 * passes as SHARD, and its part of the seconds.
 */
export function units() {
  return SUITES.flatMap(([name, seconds]) => {
    const each = Array.isArray(seconds) ? seconds : [seconds];
    const shares = each.length;
    return each.map((own, i) => ({
      name: shares > 1 ? `${name} ${i + 1}/${shares}` : name, file: name, shard: shares > 1 ? `${i + 1}/${shares}` : undefined,
      seconds: own,
    }));
  });
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
