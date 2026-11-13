import type { Object3D, Vector3 } from 'three';

/** The flag the bag waits for (norrsken.ts, the spot `bag`): the trägubbe is out of the crack and on the rock. */
const OUT = 'scene:uppdragen';
/** How near he comes to the ghost before it holds the bag out to him, in EL. Further than he can take it from. */
const NEAR = 4;
/** How long it takes to hold it out and set it down before him, in seconds. */
const SECONDS = .9;

const smooth = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/**
 * Norrskenet: the ghost gives the bag back (Olov, 13 November 2026: no eyes to paint first any more). It has carried the
 * torn Saturday bag all the way; once the trägubbe is out, it waits ahead with it, and as Elof comes it holds the bag out
 * and sets it down before him, where *Ta påsen* takes it. Picture only: the simulation offers the bag on its flag alone.
 */
export function createBagReturn() {
  /** 0: in its hands; 1: on the rock before it. */
  let given = 0;
  let seen = false;
  return {
    /** How far it has come, from 0 (carried) to 1 (set down). A game taken up there finds it set down. */
    update(flags: ReadonlySet<string>, elofX: number, ghost: { x: number; t: number } | null, dt: number, calm: boolean): number {
      const first = !seen;
      seen = true;
      if (!flags.has(OUT)) return given = 0;
      if (flags.has('bag')) return given = 1;
      const near = !!ghost && ghost.t >= 1 && Math.abs(ghost.x - elofX) <= NEAR;
      if (given === 0 && !near) return 0;
      given = first || calm ? 1 : Math.min(1, given + dt / SECONDS);
      return given;
    },
    /**
     * The carried bag on its way from the ghost's hands to the rock: from where it carries it (its place in the ghost's
     * group, already set) to `down`, where the bag to take stands, with a little lift as it is held out.
     */
    hand(bag: Object3D, holder: Object3D, down: Vector3, given: number): void {
      if (given <= 0 || given >= 1) return;
      const k = smooth(given);
      const scale = holder.scale.x || 1;
      const x = (down.x - holder.position.x) / scale, y = (down.y - holder.position.y) / scale, z = (down.z - holder.position.z) / scale;
      bag.position.set(bag.position.x + (x - bag.position.x) * k, bag.position.y + (y - bag.position.y) * k + Math.sin(Math.PI * k) * .3,
        bag.position.z + (z - bag.position.z) * k);
      bag.rotation.y *= 1 - k;
    },
  };
}
