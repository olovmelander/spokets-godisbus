/** Every browser suite's name and its weight in seconds, in the order they run, and how many runs a long one is split into. */
export const SUITES: [name: string, seconds: number, shares?: number][];
/** The files in tests/browser that are not suites. */
export const NOT_SUITES: string[];
/** What runs: each suite, or each share of a split one, with its file, the SHARD it passes and its part of the seconds. */
export function units(): { name: string; file: string; shard: string | undefined; seconds: number }[];
/** This run's share of a split suite's cases, and whether it is the last share. */
export function shareOf<T>(cases: T[], shard?: string): { cases: T[]; last: boolean };
/** The runs shared out over a number of parts, as evenly as their seconds allow. */
export function parts(count: number): { suites: string[]; seconds: number }[];
