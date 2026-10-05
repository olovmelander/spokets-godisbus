/** Every browser suite's name and its weight in seconds, in the order they run. */
export const SUITES: [name: string, seconds: number][];
/** The files in tests/browser that are not suites. */
export const NOT_SUITES: string[];
/** The suites shared out over a number of parts, as evenly as their seconds allow. */
export function parts(count: number): { suites: string[]; seconds: number }[];
