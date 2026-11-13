import { Euler, Group, Matrix4, Quaternion, Vector3 } from 'three';
import { smallMaterial, swarm } from './lift/fauna/small-kit';

/**
 * The wood ants that carry him up the anthill in Granskogen (the creature overhaul, 13 November 2026; they were ten
 * black balls that tipped like a bird in flight). A raft of ants, modelled in Blender (art/blender/small-life.py), with
 * him standing on the backs of the middle row: each walks on six legs in a tripod, its steps as long as the way they
 * have come, so that no foot slides; its feelers work, and it bobs a little with each step. The raft leans with the
 * slope it climbs, as ants on the hill's side do, and never nods.
 *
 * One mesh, one draw call. Its origin is under his feet, along +x, as every ride's is. The view calls its `walk`
 * (`userData.walk`) each frame, after it has put the raft where he is.
 */

/** Where each ant walks under him: along, across (+ towards the camera), its own turn, and where in its step it is. */
const SEATS: readonly (readonly [number, number, number, number])[] = [
  [-0.28, 0, 0.04, 0], [0.06, -0.02, -0.05, 2.1], [0.4, 0.01, 0.06, 4.3],
  [-0.12, 0.2, -0.12, 1.2], [0.24, 0.22, 0.1, 3.4],
  [-0.1, -0.22, 0.12, 5.1], [0.25, -0.2, -0.08, 0.6], [0.58, -0.08, 0.15, 2.9],
];
/** How far an ant comes in one whole step, in EL. */
const STEP = 0.2;
/** How far under his feet their feet are: he stands on their backs. */
const DOWN = 0.13;

export function antRide(): Group {
  const group = new Group();
  group.name = 'ant-ride';
  const ants = swarm('ant', SEATS.length, smallMaterial());
  ants.name = 'ant-ride-ants';
  group.add(ants);
  const act = ants.geometry.getAttribute('act');
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const one = new Vector3(1, 1, 1);
  const last = new Vector3(NaN, 0, 0);
  let stride = 0, lean = 0, going = 0;
  const pose = (clock: number, still: boolean) => {
    for (const [i, [x, z, turn, phase]] of SEATS.entries()) {
      const step = stride + phase;
      // A little bob with each step, the body's weight going from one tripod to the other.
      p.set(x, -DOWN + going * 0.006 * Math.abs(Math.sin(step)), z);
      e.set(0, turn + going * 0.04 * Math.sin(step * 0.5), going * 0.03 * Math.sin(step), 'YZX');
      ants.setMatrixAt(i, m.compose(p, q.setFromEuler(e), one));
      act.setXYZW(i, step, going, 0, still ? 0 : 0.6 * Math.sin(clock * 7 + i * 1.3));
    }
    ants.instanceMatrix.needsUpdate = true;
    act.needsUpdate = true;
  };
  pose(0, true);
  group.userData.walk = (clock: number, dt: number, still: boolean) => {
    const at = group.position;
    const dx = at.x - last.x, dy = at.y - last.y;
    const moved = Number.isNaN(last.x) || Math.hypot(dx, dy) > 0.6 ? 0 : Math.hypot(dx, dy);
    last.copy(at);
    if (!still && dt > 0) {
      stride += (moved / STEP) * Math.PI * 2;
      // They are walking while they carry him, and stop when he is set down.
      going += ((moved / dt > 0.15 ? 1 : 0) - going) * Math.min(1, dt * 8);
      // Leaning with the slope they climb, smoothly, and never more than the hill's side.
      const slope = moved > 1e-4 ? Math.max(-0.75, Math.min(0.75, Math.atan2(dy, Math.abs(dx)))) : lean;
      lean += (slope - lean) * Math.min(1, dt * 6);
    }
    group.rotation.z = still ? 0 : lean;
    pose(clock, still);
  };
  return group;
}
