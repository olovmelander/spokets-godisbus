/** One-shot presses. They wait here until a simulation step takes them (plan §4.1). */
export interface Edges {
  hop: boolean;
  act: boolean;
  helper: boolean;
}

export const NO_EDGES: Readonly<Edges> = Object.freeze({ hop: false, act: false, helper: false });

/**
 * A frame can run no simulation step at all (a 144 Hz screen) or several (a slow frame).
 * Presses wait here until a step takes them, so none is lost and none is used twice.
 */
export class PressQueue {
  private waiting: Edges = { ...NO_EDGES };

  push(edges: Readonly<Edges>): void {
    this.waiting.hop ||= edges.hop;
    this.waiting.act ||= edges.act;
    this.waiting.helper ||= edges.helper;
  }

  take(): Edges {
    const out = this.waiting;
    this.waiting = { ...NO_EDGES };
    return out;
  }

  clear(): void {
    this.waiting = { ...NO_EDGES };
  }
}
