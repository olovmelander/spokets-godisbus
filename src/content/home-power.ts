import type { SceneFrame } from '../sim/scene';

/**
 * The power cut on the evening of the storm (Äventyr 2's Stormkvällen; Olov, 12 November 2026: "hur får vi det att se
 * ut som att strömmen faktiskt går i början och att mamma sen tänder det ljus som i början inte är tänt?"). The room is
 * lit by its lamps as the evening opens; a moment after the picture has come up from black they flicker and go out
 * (the scene `kvall`'s cue `POWER_OUT`), and the storm-dark room is lit only by the candle Mamma lights (`CANDLES_LIT`)
 * and the flashlight. The power stays out all evening: the TV is dark and its game is not offered (../app/home-console.ts).
 * Pure, with no three and no DOM: the chapter, the picture and the TV read it alike.
 */
export const POWER_CHAPTER = 'stormkvall';
/** The scene the power goes out in, and when its lamps flicker and go out, in its seconds. */
export const POWER_SCENE = 'kvall';
export const POWER_FLICKER = 2.5;
export const POWER_GOES = 3.1;
/** Set as the lamps go out. */
export const POWER_OUT = 'power:out';
/** Set as Mamma's candle catches. */
export const CANDLES_LIT = 'candles';

/** Whether the power has gone in this chapter now (only ever on the evening of the storm). */
export function powerGone(chapter: string, flags: ReadonlySet<string>): boolean {
  return chapter === POWER_CHAPTER && (flags.has(POWER_OUT) || flags.has(CANDLES_LIT) || flags.has(`scene:${POWER_SCENE}`));
}

/**
 * How much of the room's electric light is on now, 1 to 0: on until the flicker, a few uneven blinks, and out. A game
 * taken up later, or any chapter but the evening of the storm, has it as the story left it. With less motion there is
 * no flicker: the lamps go out at once.
 */
export function electricLight(chapter: string, flags: ReadonlySet<string>, scene: SceneFrame | null | undefined, still = false): number {
  if (chapter !== POWER_CHAPTER) return 1;
  if (powerGone(chapter, flags)) return 0;
  if (scene?.id !== POWER_SCENE) return 1;
  const t = scene.seconds;
  if (t < POWER_FLICKER) return 1;
  if (t >= POWER_GOES) return 0;
  if (still) return 1;
  // Out, on, out, a weak last glow, and gone: the way lamps go when a line comes down in the wind.
  const k = (t - POWER_FLICKER) / (POWER_GOES - POWER_FLICKER);
  return k < 0.12 ? 0.15 : k < 0.3 ? 1 : k < 0.48 ? 0.05 : k < 0.62 ? 0.8 : k < 0.8 ? 0.1 : 0.35 * (1 - (k - 0.8) / 0.2);
}
