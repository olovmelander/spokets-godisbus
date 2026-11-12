import { Quaternion, Vector3, type Object3D } from 'three';
import { crouchLegs } from './gait';
import type { Legs, Pose } from './rig';

/**
 * Moa's umbrella in Byn i stormen, held (Olov, 12 November 2026: "Det kan se lite snyggare ut när moa håller i
 * paraplyt!"). Before, her fist was on the shaft half a length above its crook, which hung loose behind her shoulder; the
 * shaft stood stiffly upright with the canopy down on her head; called, she set it down at the wall's edge, where it
 * waited standing on nothing; and it carried Elof sitting under it with his hands in his lap.
 *
 * Now a hand is always on its crook. Moa holds it in her left fist before her chest, its canopy clear over her head and
 * leaning into the wind, rocked a little by the gusts. Called, she goes to the wall's edge, bends and holds it out low
 * for him, until he takes it; then she lets go, and he hangs from its crook by both hands as it carries him over the
 * flood, leaning the way it floats and swaying (./view.ts). Measured in the prop's own frame (./props.ts `rideProp`,
 * the kit's 'paraply' lifted 0.72 as ../content/aventyr2/render.ts has it): its foot at the origin, the shaft up +y,
 * the crook curving round towards +x.
 */
export const UMBRELLA = {
  /** Where a fist closes round its crook: in its bend, just under where the shaft goes into it. */
  grip: new Vector3(0.01, 0.84, 0),
  /** Where his hands are over his feet, hanging from it: as from a scarf (./scarf.ts `grip`). */
  hang: 1.15,
  /** How far apart along the crook and the shaft his two hands close, the one over the other. */
  hands: 0.14,
  /** Held up in the storm: how far its top leans into the wind (towards −x, where the rain comes from), and how much a gust rocks it. */
  lean: 0.13,
  rock: 0.06,
  /** Carrying him: how far its top leans ahead, the way the wind takes it, and how much it sways. */
  ahead: 0.14,
  sway: 0.08,
  /** How long it takes to go from her hand to his, as the ride begins: it is the same umbrella. */
  handover: 0.3,
  /** Where Moa's fist is, holding it up, in her own frame as a share of her height: before her chest, on her left. */
  held: new Vector3(0.07, 0.6, 0.11),
  /** Holding it out low to him at the wall's edge: how far down she crouches (./gait.ts `crouchLegs`), and leans. */
  crouch: 0.85,
  bend: 0.45,
} as const;

const LEGS = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR'] as const;
const crouched = {} as Pose;

/** Moa down in a crouch at the wall's edge, `w` of the way (0 standing, 1 down), to hold the umbrella out low to him. */
export function holdingOut(pose: Pose, legs: Legs, w: number): void {
  Object.assign(crouched, pose);
  crouchLegs(crouched, legs, UMBRELLA.crouch);
  for (const joint of LEGS) pose[joint] += (crouched[joint] - pose[joint]) * w;
  pose.lean += (UMBRELLA.bend - pose.lean) * w;
}

const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

/**
 * How far down Moa is at the wall's edge, frame by frame: `down`, where she is going (0 standing, 1 down), and `stoop`,
 * where she is, which follows it softly. Called, she goes down after a breath. In a game taken up after the call, and
 * without motion, she is down from the first frame. (The view's first nine seconds read "called nine seconds ago" as
 * "not called yet": a game taken up showed her standing for a second, and then she crouched.)
 */
export function createHoldingOut() {
  let called: number | null = null;
  let stoop = 0;
  return {
    /** `asked`: she has been called, and he has not taken it yet. `first`: the view's first frame. */
    update(asked: boolean, clock: number, dt: number, first: boolean, still: boolean): { down: number; stoop: number } {
      if (!asked) called = null;
      else if (called === null) called = first ? clock - 9 : clock;
      const down = called === null ? 0 : still ? 1 : smooth((clock - called - 0.35) / 0.95);
      stoop = still || first ? down : stoop + (down - stoop) * (1 - Math.exp(-6 * dt));
      return { down, stoop };
    },
  };
}

const UP = new Vector3(0, 1, 0);
const grip = new Vector3();

/**
 * The shaft's way up while she holds it: into the wind, and rocked by its gusts. `wind` is how hard it blows there (0 to
 * 1), and `share` how much of the lean it has (held out low to him, less).
 */
export function heldUp(clock: number, wind: number, still: boolean, out: Vector3, share = 1): Vector3 {
  const rock = still ? 0 : UMBRELLA.rock * (0.4 + 0.6 * wind) * Math.sin(clock * 1.7) * (0.6 + 0.4 * Math.sin(clock * 0.53));
  const lean = (UMBRELLA.lean * (0.6 + 0.4 * wind) + rock) * share;
  return out.set(-Math.sin(lean), Math.cos(lean), 0);
}

/** The shaft's way while it carries him: its top a little ahead, the way the wind takes it (+x), and swaying as it goes. */
export function carrying(clock: number, still: boolean, out: Vector3): Vector3 {
  const lean = UMBRELLA.ahead + (still ? 0 : UMBRELLA.sway * Math.sin(clock * 2.1) * (0.7 + 0.3 * Math.sin(clock * 0.8)));
  return out.set(Math.sin(lean), Math.cos(lean), 0);
}

/** Sets the umbrella so that its crook is at `at`, its shaft along `axis` (a unit vector), at its own size. */
export function holdAt(prop: Object3D, at: Vector3, axis: Vector3): void {
  prop.quaternion.setFromUnitVectors(UP, axis);
  prop.scale.setScalar(1);
  prop.position.copy(at).sub(grip.copy(UMBRELLA.grip).applyQuaternion(prop.quaternion));
}

/** Where his two hands close on it while it carries him: on its crook, and the other just over it on the shaft. */
export function handsOn(prop: Object3D, lower: Vector3, upper: Vector3): void {
  prop.updateWorldMatrix(true, false);
  lower.copy(UMBRELLA.grip).applyMatrix4(prop.matrixWorld);
  upper.set(0, UMBRELLA.grip.y + UMBRELLA.hands, 0).applyMatrix4(prop.matrixWorld);
}

/**
 * The umbrella as it carries him, handed over from where her hand last held it: each frame `carry` puts its crook in
 * his raised hands, coming there from her hand over `UMBRELLA.handover` seconds as the ride begins. `held` is told
 * where it is each frame she holds it.
 */
export function createUmbrellaCarry() {
  const from = new Vector3(), turn = new Quaternion(), at = new Vector3(), axis = new Vector3();
  let had = false;
  let since = -1;
  return {
    /** She holds it, as it is now drawn. */
    held(prop: Object3D) {
      from.copy(prop.position);
      turn.copy(prop.quaternion);
      had = true;
      since = -1;
    },
    /**
     * It carries him: his feet at (x, y), `tall` his size. `size`: how big it is drawn, which goes as he lands (about
     * its crook, in his hands).
     */
    carry(prop: Object3D, x: number, y: number, tall: number, size: number, clock: number, dt: number, still: boolean) {
      since = since < 0 ? 0 : since + dt;
      at.set(x, y + UMBRELLA.hang * tall, 0);
      holdAt(prop, at, carrying(clock, still, axis));
      if (size < 1) {
        prop.scale.setScalar(Math.max(0, size));
        prop.position.copy(at).sub(grip.copy(UMBRELLA.grip).multiplyScalar(Math.max(0, size)).applyQuaternion(prop.quaternion));
      }
      if (!had || still || since >= UMBRELLA.handover) return;
      const k = since / UMBRELLA.handover, e = k * k * (3 - 2 * k);
      prop.position.lerpVectors(from, prop.position, e);
      prop.quaternion.slerpQuaternions(turn, prop.quaternion.clone(), e);
    },
    /** Off it: the next ride is handed over afresh. */
    reset() { had = false; since = -1; },
  };
}
