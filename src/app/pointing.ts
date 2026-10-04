import type { Sim } from '../sim/sim';
import type { Vec } from '../sim/types';
import type { HeldInput } from '../input/input';
import type { Edges } from '../input/press-queue';
import { STEP } from '../sim/constants';

export type Reaction = { kind: 'player' | 'ghost' | 'spot' | 'candy' | 'hidden'; index?: number };
export type Pointed = Reaction | { kind: 'use' } | { kind: 'helper' };
export interface Projection {
  world(at: Vec): Vec | null;
  player(): Vec | null;
  helper(): Vec | null;
}
/** These props stay after their interaction; the others shrink away in spotProp.update. */
const remains = new Set(['jay', 'sign', 'seesaw', 'cobble', 'dew', 'memory', 'shavings', 'cairn']);

/** Peka is optional. A near interaction uses exactly the button's current target; a far one never queues an action. */
export class Pointing {
  private walk: number | null = null;
  private walkUntil = 0;
  last: Pointed['kind'] | null = null;
  constructor(private readonly sim: Sim) {}

  tap(client: Vec, screen: Projection): Pointed | null {
    this.cancel();
    const sim = this.sim;
    // The visible helper has its own three-step conversation, even when it overlaps another prop.
    const helper = screen.helper();
    if (helper && Math.hypot(helper.x - client.x, helper.y - client.y) <= 32) {
      this.last = 'helper';
      return { kind: 'helper' };
    }
    const candidates: { what: Pointed; screen: Vec; distance: number }[] = [];
    const add = (what: Pointed, at: Vec | null) => {
      if (!at) return;
      const distance = Math.hypot(at.x - client.x, at.y - client.y);
      if (distance <= 32) candidates.push({ what, screen: at, distance });
    };
    const action = sim.actionAt;
    if (action) add({ kind: 'use' }, screen.world(action));
    add({ kind: 'player' }, screen.player());
    const ghost = sim.ghost;
    if (ghost && !ghost.gone) add({ kind: 'ghost' }, screen.world({ x: ghost.x, y: ghost.y + 0.6 }));
    for (const [index, spot] of (sim.chapter.spots ?? []).entries()) {
      if (!spot.look || (sim.flags.has(spot.id) && !remains.has(spot.look))) continue;
      // A prerequisite locks its action, not its harmless response. Only future shy lights are hidden.
      if (spot.look === 'wisp' && spot.needs && !sim.flags.has(spot.needs)) continue;
      add({ kind: 'spot', index }, screen.world({ x: spot.at.x, y: spot.at.y + 0.6 }));
    }
    for (const [index, candy] of sim.chapter.candy.entries()) {
      if (!sim.collected[index] && (!candy.after || sim.flags.has(candy.after))) add({ kind: 'candy', index }, screen.world(candy));
    }
    for (const [index, candy] of (sim.chapter.hidden ?? []).entries()) {
      if (!sim.flags.has(`found:${candy.kind}`) && (!candy.after || sim.flags.has(candy.after))) add({ kind: 'hidden', index }, screen.world(candy));
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const picked = candidates[0]?.what ?? null;
    this.last = picked?.kind ?? null;
    if (picked?.kind === 'candy') {
      const candy = sim.chapter.candy[picked.index!]!;
      if (Math.abs(candy.y - sim.curr.y - 0.45) < 0.4 && sim.canStrollTo(candy.x)) {
        this.walk = picked.index!;
        // Long rendered frames drop excess physics time. The stroll keeps the same 2.5-second
        // limit in simulation time, so a slow picture cannot expire it before he walks there.
        this.walkUntil = sim.steps + Math.ceil(2.5 / STEP);
      }
    }
    return picked;
  }

  /** Any deliberate control, edge, pause, wall or drop cancels the short stroll. Never jump or use something for him. */
  steer(held: HeldInput, edges: Edges): HeldInput {
    if (this.walk === null) return held;
    const sim = this.sim;
    const candy = sim.chapter.candy[this.walk]!;
    if (held.x !== 0 || held.y !== 0 || held.hopHeld || edges.hop || edges.act || edges.helper || sim.steps >= this.walkUntil ||
        sim.collected[this.walk] || Math.abs(candy.x - sim.curr.x) < 0.25 || !sim.canStrollTo(candy.x)) {
      this.cancel();
      return held;
    }
    return { ...held, x: Math.sign(candy.x - sim.curr.x) * 0.6 };
  }
  cancel(): void { this.walk = null; this.walkUntil = 0; }
  get walking(): boolean { return this.walk !== null; }
}
