export interface Vec {
  x: number;
  y: number;
}

/** What a chapter file gives the simulation and the renderer. Units: EL. */
export interface ChapterData {
  id: string;
  /** The ground as one open line, from left to right. Elof walks on its upper side. */
  ground: Vec[];
  spawn: Vec;
  /** Reaching this x sets the flag "goal". */
  goalX: number;
  /**
   * Trail candy, in the order the path meets it (plan §4.3). Each point is where the candy floats: about
   * half an EL over the ground on a walk, and along the arc of the jump over a gap or up a step.
   */
  candy: Vec[];
}

/** One simulation step's input. hop and act are presses; the rest is held state. */
export interface StepInput {
  /** -1 (left) to 1 (right). */
  x: number;
  hopHeld: boolean;
  hop: boolean;
  act: boolean;
}

export interface PlayerState {
  /** The middle of Elof's feet. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  /** Height of the ground straight below him, for his shadow and the camera. */
  groundY: number;
}
