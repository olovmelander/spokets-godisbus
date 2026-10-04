import type { HeldInput } from '../input/input';
import type { Edges } from '../input/press-queue';
import type { PlayerState } from '../sim/types';

export type Lesson = 'move' | 'hop' | 'act';
/** Only idle moments in the prologue. This model never writes an input or a story flag. */
export class Tutorial {
  private moved = false;
  private hopped = false;
  private waiting: Lesson | null = null;
  private seconds = 0;
  private origin: number | null = null;
  shown: Lesson | null = null;
  constructor(private readonly chapter: string) {}

  update(dt: number, p: PlayerState, flags: ReadonlySet<string>, held: HeldInput, edges: Edges): Lesson | null {
    this.origin ??= p.x;
    this.moved ||= p.x > 10 || Math.abs(held.x) > 0.12 || Math.abs(p.x - this.origin) > 0.2;
    this.hopped ||= edges.hop || p.x > 31.2;
    let next: Lesson | null = null;
    if (this.chapter === 'prolog' && !flags.has('star') && p.mode === 'free' && p.grounded) {
      const still = Math.abs(p.vx) < 0.1;
      if (flags.has('blink') && p.verb === 'take' && Math.abs(p.x - 41) < 1.4 && still) next = 'act';
      else if (!this.hopped && p.x >= 28.3 && p.x <= 30.05 && p.y < 0.15 && still) next = 'hop';
      else if (!this.moved && still) next = 'move';
    }
    if (next !== this.waiting) { this.waiting = next; this.seconds = 0; }
    if (next) this.seconds += dt;
    this.shown = next && this.seconds >= (next === 'move' ? 4 : 3) ? next : null;
    return this.shown;
  }
}
