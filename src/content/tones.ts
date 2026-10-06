/**
 * How a line is said, drawn on its bubble (docs/ux-audit/story-presentation.md row 22). The game has no voices
 * (plan §3.7), so a shout, a worry, a gentle word and a thought each get their own scrap of paper (src/ui/tones.ts):
 * - `call`: shouted. A burst round it, the words bigger and bold, and a quick pop as it lands.
 * - `worry`: anxious. A wavering edge.
 * - `soft`: said gently. Smaller, lying flat on the picture.
 * - `think`: Elof thinking it. A cloud, with three small rings down towards him.
 * A line without one is said as anything else is. No line gets new words.
 */
export type Tone = 'call' | 'worry' | 'soft' | 'think';

/** By the line's key in `sv.lines`. */
export const TONES: Readonly<Record<string, Tone>> = {
  // Shouted.
  stomp: 'call', tiny: 'call', stolenBag: 'call', snuck: 'call', jayWindow: 'call', fallenStar: 'call', heja: 'call',
  marbleBack: 'call', named: 'call', carved: 'call',
  // Anxious.
  hurt: 'worry', sameSize: 'worry', rootFingers: 'worry', gardenPocket: 'worry',
  // Gently: Pappa on the summit, Mamma's promise, the way home.
  first1: 'soft', first2: 'soft', first3: 'soft', first4: 'soft', nearYou: 'soft', goldHope: 'soft', followTrail: 'soft',
  bogChickLight: 'soft',
  // Elof working something out.
  givesAway: 'think', thanked: 'think', fetch: 'think', forestVittraClue: 'think', mountainLoop: 'think',
};

/**
 * Lines that go on from the line before, the same speaker's: added under it in the same bubble, two lines at most,
 * so that a sentence said in two bubbles is read whole ("Den täljde jag till dig / när du var liten, Elof.").
 */
export const GOES_ON: ReadonlySet<string> = new Set(['first3', 'cobbles2', 'cobbles3']);
