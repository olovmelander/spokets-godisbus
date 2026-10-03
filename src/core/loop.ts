/**
 * A fixed simulation step driven by a variable frame time (plan §6.4).
 * At most maxSteps run per frame. What is left over after that is dropped, so a long pause can't snowball.
 */
export class FixedLoop {
  private acc = 0;

  constructor(readonly step: number, readonly maxSteps: number) {}

  /** Runs the steps that fit in dt seconds. `first` is true for the first step of this frame. */
  advance(dt: number, tick: (first: boolean) => void): number {
    this.acc += dt;
    let steps = 0;
    while (this.acc >= this.step - 1e-9 && steps < this.maxSteps) {
      tick(steps === 0);
      this.acc -= this.step;
      steps++;
    }
    if (steps >= this.maxSteps && this.acc >= this.step) this.acc = 0;
    return steps;
  }

  /** How far the picture is between the last two steps, 0 to 1. */
  get alpha(): number {
    return Math.min(1, Math.max(0, this.acc / this.step));
  }

  /** Call when the game resumes, so the time away isn't simulated. */
  reset(): void {
    this.acc = 0;
  }
}
