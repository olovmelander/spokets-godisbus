/**
 * A chapter's own words in Äventyr 2. Each key must be new: they are merged into `sv` with the first adventure's
 * (src/content/aventyr2/sv.ts), and a test checks that none is used twice.
 */
export interface ChapterWords {
  /** Bubbles: a key of `sv.lines`. At most about 40 characters each. */
  lines: Record<string, string>;
  /** Words on the Använd button, where the verb's own is too plain: keys of `sv.verbs`. */
  verbs?: Record<string, string>;
  /** "Just nu": what he is doing, and what has happened so far (src/content/aventyr2/context.ts). */
  purposes?: Record<string, { purpose: string; recap: string }>;
  /** Who is helping, in one sentence. */
  helpers?: Record<string, string>;
  /** What the reading card says while a scene with this id waits for Fortsätt. */
  moments?: Record<string, string>;
}
