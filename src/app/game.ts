import { FixedLoop } from '../core/loop';
import { NO_EDGES, PressQueue, type Edges } from '../input/press-queue';
import { MAX_STEPS_PER_FRAME, STEP } from '../sim/constants';
import { Sim } from '../sim/sim';
import type { ChapterData } from '../sim/types';

/** Held input, read once per frame. */
export interface Held {
  x: number;
  hopHeld: boolean;
}

/**
 * The game without a screen: the simulation, the fixed-step loop and the press queue.
 * The page drives it from requestAnimationFrame, and the tests drive it with a fake clock.
 */
export class Game {
  readonly sim: Sim;
  /** Steps run by the last frame. */
  lastSteps = 0;

  private readonly loop = new FixedLoop(STEP, MAX_STEPS_PER_FRAME);
  private readonly queue = new PressQueue();

  constructor(chapter: ChapterData) {
    this.sim = new Sim(chapter);
  }

  /** One frame: dt seconds have passed. Presses go to the first step that runs. */
  frame(dt: number, held: Held, edges: Readonly<Edges>): number {
    this.queue.push(edges);
    this.lastSteps = this.loop.advance(dt, (first) => {
      const e = first ? this.queue.take() : NO_EDGES;
      // Hoppa's held state is read each frame. A tap that begins and ends inside one frame therefore
      // arrives as a press with hopHeld false, which is a hop.
      this.sim.step({ x: held.x, hopHeld: held.hopHeld, hop: e.hop, act: e.act });
    });
    return this.lastSteps;
  }

  get alpha(): number {
    return this.loop.alpha;
  }

  /** After a pause or a hidden tab: forget the time away and any press made before it. */
  resume(): void {
    this.loop.reset();
    this.queue.clear();
  }
}
