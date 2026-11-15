/**
 * Stormens öga: who gives Elof the golden geléhallon, and how he takes it (Olov, 14 November 2026: "Kan vi förtydliga
 * vem som ger Elof geléhallonet i guldpapper? Är det Klonk?"). It is the old trägubbe: his very last sweet of the
 * fistful his trail was laid with, saved for Elof (docs/aventyr-2.md). It appeared in the air beside him in a glitter,
 * as Klonk's star does over Klonk's bag, with Klonk standing by: nothing in the picture said whose it was.
 *
 * Now the old one gives it. When the cap is back on the little one he steps out from beside him towards Elof
 * (`GIFT_OFFERS`), turns to him and bows, and the sweet comes out on its gold paper in his hands (`gift:out`), held out
 * before him. *Ta emot*: Elof steps up to him and puts out his hand; the sweet is his when his hand is on it
 * (`GIFT_TAKEN`), and comes back with it; the paper is let go, and the old one steps back to the little one. Then Elof
 * thanks him by name.
 *
 * The numbers here are shared by what draws the old one (src/content/aventyr2/render.ts), the sweet in his hands
 * (./props.ts), Elof's hand (./view.ts) and the chapter's scenes (src/content/aventyr2/chapters/stormoga.ts).
 */

/** The flags: the old one steps forward; the sweet is in his hands; Elof's hand has it; and the scene's older flag for it. */
export const GIFT_OFFERS = 'so:offers';
export const GIFT_OUT = 'gift:out';
export const GIFT_TAKEN = 'so:gift-taken';
const GIFT_HELD = 'so:gift-held';
/** The spot where it is taken, and the scene in which his hand goes out for it. */
export const GIFT_SPOT = 'gift';
export const GIFT_SCENE = 'gavan';

/** How far the old one stands from the gift's spot, beside the little one, on the stone: along it, and behind the line Elof walks. */
export const OLD_STANDS = { x: 1, z: -0.5 } as const;
/**
 * His step out to hold it: towards Elof, and a little forward, not onto the line Elof walks: Elof may still walk by
 * him there before he takes it, and passes in front of him.
 */
export const OFFER_STEP = { x: -0.4, z: 0.1 } as const;
/** How he stands as he holds it out: turned to Elof (about the upright, from facing us), and bowed towards him. */
export const OFFER_TURN = -1.25;
export const OFFER_BOW = 0.22;
/** How long his step out takes, and his step back, in seconds. */
export const OFFER_SECONDS = { out: 0.7, back: 0.8 } as const;
/** Where the sweet is held, from his feet: held up before his chest in his two hands, at the height of Elof's hand. */
export const HOLDS = { ahead: 0.25, up: 0.56 } as const;

/**
 * Where the sweet is held out, from the gift's spot on the ground: in the old one's hands once he has stepped out.
 * (His place, his step, and what he holds before him, turned as he is.)
 */
export const HELD_OUT = {
  x: OLD_STANDS.x + OFFER_STEP.x + Math.sin(OFFER_TURN) * HOLDS.ahead,
  y: HOLDS.up,
  z: OLD_STANDS.z + OFFER_STEP.z + Math.cos(OFFER_TURN) * HOLDS.ahead,
} as const;

/**
 * Where Elof stands to take it, from the gift's spot: his short arm's reach from the sweet, along the stone and back
 * towards the old one, off the line he walks (`z`). He comes back to it with the sweet in his hand.
 */
export const TAKES_FROM = { x: HELD_OUT.x - 0.26, z: HELD_OUT.z + 0.1 } as const;

/**
 * The taking, in seconds into its scene: he steps up to the old one (`STEPS_UP`), his hand goes out to the sweet
 * (`REACHES`), it is his when his hand is on it (`TAKEN_AT`), and his hand comes back with it.
 */
export const STEPS_UP = 0.4;
export const REACHES = 0.3;
export const TAKEN_AT = 0.7;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** How far out to the sweet his hand is, so many seconds into the scene of the taking: out to it, and back with it. */
export const takeReach = (seconds: number): number => (seconds < TAKEN_AT
  ? smooth((seconds - REACHES) / (TAKEN_AT - 0.05 - REACHES))
  : 1 - smooth((seconds - TAKEN_AT - 0.05) / 0.5));

/** Whether the old one has begun to give it, and whether Elof's hand has it. */
export const giftOffered = (flags: Pick<ReadonlySet<string>, 'has'>): boolean => flags.has(GIFT_OFFERS) || flags.has(GIFT_OUT);
export const giftTaken = (flags: Pick<ReadonlySet<string>, 'has'>): boolean => flags.has(GIFT_SPOT) && (flags.has(GIFT_TAKEN) || flags.has(GIFT_HELD) || flags.has('taste'));

/** How far out the old one has stepped, 0 to 1, a moment later: out while he offers it, back once it is taken. */
export function offering(now: number, flags: Pick<ReadonlySet<string>, 'has'> | null, dt: number, still: boolean): number {
  const out = !!flags && giftOffered(flags) && !giftTaken(flags);
  if (still) return out ? 1 : 0;
  return Math.max(0, Math.min(1, now + (out ? dt / OFFER_SECONDS.out : -dt / OFFER_SECONDS.back)));
}

/** His small lift of it as he holds it out, at a moment: the sweet goes with his hands. */
export const offerBob = (clock: number): number => Math.sin(clock * 2.2) * 0.012;

/**
 * How the old one stands, `out` of the way out to hold it (0 to 1, from `offering`), at a moment: where he is from his
 * place beside the little one, with a little hop as he steps; his turn about the upright from where he looked before
 * (`was`); how far he bows; and how much of his rocking on the stone is left.
 */
export function offerPose(out: number, clock: number, was: number): { x: number; y: number; z: number; turn: number; bow: number; rock: number } {
  const e = smooth(out);
  return {
    x: OFFER_STEP.x * e,
    y: (out > 0 && out < 1 ? Math.sin(Math.PI * out) * 0.1 : 0) + offerBob(clock) * e,
    z: OFFER_STEP.z * e,
    turn: was + (OFFER_TURN - was) * e,
    bow: OFFER_BOW * e,
    rock: 1 - e,
  };
}
