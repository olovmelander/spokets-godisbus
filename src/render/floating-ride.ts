import type { Ride } from '../sim/types';

/**
 * A ride that floats: a raft on a river. The view places most of what carries him under his feet, grown from nothing
 * as he boards and gone as he lands (./view.ts). A thing afloat is in the water the whole time: moored where he boards
 * it, carrying him over, and left at the far bank. So it places itself, each frame, from this; and it says where on
 * the ride he goes on his own feet, across its deck onto it and off it again (`userData.afoot`), so that he is drawn
 * walking there and not carried.
 *
 * What carries him has `userData.floats` (a `Floats`) and `userData.afoot` (an `Afoot`): the view asks for no more.
 */
export interface FloatFrame {
  ride: Ride;
  /** Whether it carries him now, and whether he has boarded it: then it is on its way, or at the far bank. */
  ridden: boolean;
  boarded: boolean;
  /** Where he is: his feet. */
  x: number;
  y: number;
  clock: number;
  dt: number;
  /** The picture keeps still: a reading stop, or less motion asked for. */
  calm: boolean;
  /** The water's surface at x, or null where there is none (./water.ts). */
  surface(x: number): number | null;
  /** A ring on the water at (x, z), `strength` big (./water.ts). */
  ripple(x: number, z: number, strength: number): void;
}

export type Floats = (frame: FloatFrame) => void;
/** Whether he is on his own feet at x of the ride: before it carries him, and after it has come to the far bank. */
export type Afoot = (x: number) => boolean;
