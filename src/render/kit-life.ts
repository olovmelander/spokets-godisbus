import type { Object3D } from 'three';

/**
 * How the nature kit's small animals live where they sit (outdoor-models.ts, Äventyr 2's kit spots). Each is one
 * mesh from Blender, so each moves as a whole: but not by squashing its face. The hedgehog breathes and now and
 * then snuffles, nose down, turning a little; the frog breathes, and now and then hops on the spot; the snail
 * stretches and draws in as it creeps a little way and back. `base` is where it rests: its height, turn and size.
 */
export interface Rest { x: number; y: number; turn: number; size: number }

const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

export function kitLife(kind: string, thing: Object3D, base: Rest, clock: number, phase: number, still: boolean): boolean {
  if (kind !== 'igelkott' && kind !== 'groda' && kind !== 'snigel') return false;
  const t = clock + phase;
  thing.position.set(base.x, base.y, thing.position.z);
  thing.rotation.set(0, base.turn, 0);
  thing.scale.setScalar(base.size);
  if (still) return true;
  if (kind === 'igelkott') {
    thing.scale.y = base.size * (1 + 0.012 * Math.sin(t * 2.1));
    // A snuffle every few seconds: quick little nods of its snout, and a small turn to where it smells. With a head of
    // its own (the kit's 'kit-head') only the snout nods and turns; else the whole of it, a little.
    const sniff = Math.max(0, Math.sin(t * 0.9)) ** 10;
    const head = thing.getObjectByName('kit-head');
    if (head) {
      head.rotation.x = -0.18 * sniff * (0.5 + 0.5 * Math.sin(t * 18)) + 0.06 * Math.sin(t * 0.5);
      head.rotation.y = 0.35 * Math.sin(t * 0.37) * smooth(Math.sin(t * 0.9) + 0.4);
      return true;
    }
    thing.rotation.z = sniff * 0.05 * Math.sin(t * 18);
    thing.rotation.y = base.turn + 0.25 * Math.sin(t * 0.37) * smooth(Math.sin(t * 0.9) + 0.4);
  } else if (kind === 'groda') {
    thing.scale.y = base.size * (1 + 0.01 * Math.sin(t * 2.6));
    // Its head, where it has one of its own, tilts now and then to look up, and its throat swells and falls.
    const head = thing.getObjectByName('kit-head');
    if (head) {
      head.rotation.x = -0.18 * Math.max(0, Math.sin(t * 0.43)) ** 4;
      head.rotation.z = 0.12 * Math.sin(t * 0.29);
      head.scale.y = 1 + 0.04 * Math.max(0, Math.sin(t * 5.2)) * Math.max(0, Math.sin(t * 0.7));
    }
    // About every seven seconds a hop on the spot: a crouch, up, and down with a give.
    const k = ((t % 7) + 7) % 7;
    if (k < 0.14) thing.scale.y = base.size * (1 - 0.1 * Math.sin((k / 0.14) * Math.PI));
    else if (k < 0.52) thing.position.y = base.y + Math.sin(((k - 0.14) / 0.38) * Math.PI) * 0.16 * base.size;
    else if (k < 0.66) thing.scale.y = base.size * (1 - 0.08 * Math.sin(((k - 0.52) / 0.14) * Math.PI));
  } else {
    // The snail stretches as it goes and draws in as it pulls its shell after, a little way and back.
    const creep = Math.sin(t * 0.7);
    thing.scale.x = base.size * (1 + 0.05 * creep);
    thing.position.x = base.x + Math.sin(t * 0.04) * 0.12 * base.size;
  }
  return true;
}
