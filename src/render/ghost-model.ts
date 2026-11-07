import { Matrix4, Mesh, Quaternion, Vector3, type Object3D } from 'three';
import type { Act } from '../sim/scene';
import { createSway, softParts } from './rig';

/**
 * The ghost modelled in Blender, where its private pack exists (HANDOVER.md): how it is turned, and its painted eyes.
 * The stand-in built in view.ts faces +x, as the stand-in Elof does, and every scene is staged for that.
 */

/** The model faces the camera (+z): a quarter turn this way faces it along the course (+x), as the stand-in does. */
export const MODEL_TURN = Math.PI / 2;

/**
 * The ghost's two painted eyes: the parts the prologue's two strokes show, one each, and that a scene's blink squeezes.
 * Named parts keep the marks tied to the strokes without editing a pack.
 */
export function eyeNodes(model: Object3D): Object3D[] {
  const nodes: Object3D[] = [];
  model.traverse((node) => {
    if (/^(ghost-eye-[01]|eye[._-]?[lr12]|eyes)$/i.test(node.name)) nodes.push(node);
  });
  // A named parent must stay visible when its first named child is painted.
  const leaves = nodes.filter((node) => !nodes.some((child) => {
    for (let parent = child.parent; parent; parent = parent.parent) if (parent === node) return true;
    return false;
  }));
  const eyes = leaves.length === 1 && leaves[0]!.children.length === 2 ? [...leaves[0]!.children] : leaves;
  // Each keeps the height it came with. A packed model's eye is not 1 tall: the pack stores its mesh in small whole
  // numbers and gives the part the scale that makes them metres again (KHR_mesh_quantization), 0.038 for the ghost's.
  for (const eye of eyes) eye.userData.height ??= eye.scale.y;
  return eyes;
}

/** Opens the eyes to `open` of their own height: 1 is wide open, 0.1 the middle of a blink. */
export function blinkEyes(eyes: readonly Object3D[], open: number): void {
  for (const eye of eyes) eye.scale.y = (eye.userData.height as number) * open;
}

export interface GhostMotionFrame {
  dt: number;
  clock: number;
  /** Progress along the current hop, from 0 to 1; null while perched. The scene owns the body's hop arc. */
  hop: number | null;
  calm: boolean;
  awake: boolean;
  staged: boolean;
  /** A scene owns the body arc and clock; its moving acts can still articulate the separate wooden shoes. */
  performance?: { act: Act; actT: number };
  /** How far Elof is along the course from it, in EL: near, it tilts its head at him. */
  elof?: number;
  /** The shared wind where it stands (`windAt`, ./wind.ts), for a cloth hem if the model has one. */
  wind?: number;
}

/**
 * The ghost's own idle while it stands awake, for the view to add to the whole toy: a little double bob, a look about,
 * and a curious tilt towards Elof when he is near. `pitch` tips it forward and `roll` cocks it to its side, each about
 * its own axes; `bob` lifts it, in EL. All are 0 in a hop, in a scene, asleep and with reduced motion.
 */
export interface GhostIdle { bob: number; look: number; pitch: number; roll: number }

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const pulse = (t: number, at: number, up: number, hold: number, down: number) => smooth((t - at) / up) * (1 - smooth((t - at - up - hold) / down));
const hopAngle = (phase: number, side: number) => Math.sin(Math.PI * phase) *
  (.72 * (1 - phase) - .52 * phase + (side % 2 ? -1 : 1) * .065 * Math.sin(Math.PI * 2 * phase));

/** Which of its idles a 6.4 s round of the ghost's plays between its taps: a bob, a look about, or neither. */
const roundOf = (cycle: number) => ((Math.imul(cycle + 11, 0x9e3779b1) >>> 7) % 5) as 0 | 1 | 2 | 3 | 4;

/** The carved body stays rigid; its two separate shoes can trail a hop, prepare to land, or tap a toe. */
export function createGhostMotion(model: Object3D, facesX = false): { update(frame: GhostMotionFrame): GhostIdle } {
  const idle: GhostIdle = { bob: 0, look: 0, pitch: 0, roll: 0 }, held: GhostIdle = { ...idle };
  // A cloth hem or a scarf, if the model has one: the carved wood itself never bends.
  const sway = createSway(), cloth = softParts(model, () => true);
  model.updateWorldMatrix(true, true);
  const orientation = model.getWorldQuaternion(new Quaternion());
  const rotation = new Quaternion(), point = new Vector3(), transform = new Matrix4();
  const feet: { node: Object3D; position: Vector3; rest: Quaternion; axis: Vector3; up: Vector3; contacts: Vector3[]; sole: number;
    angle: number; lift: number; takeoffAngle: number; takeoffLift: number }[] = [];
  let lastActivity = -Infinity, wasHopping = false;
  model.traverse((node) => {
    if (!/^foot[._-]?[lr12]$/i.test(node.name)) return;
    const parent = node.parent!;
    const inverse = parent.getWorldQuaternion(new Quaternion()).invert();
    const axis = (facesX ? new Vector3(0, 0, -1) : new Vector3(1, 0, 0)).applyQuaternion(orientation).applyQuaternion(inverse).normalize();
    const up = new Vector3(0, 1, 0).applyQuaternion(orientation).applyQuaternion(inverse).normalize();
    const points: Vector3[] = [];
    const fromWorld = parent.matrixWorld.clone().invert();
    node.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      const positions = part.geometry.getAttribute('position');
      if (!positions) return;
      transform.multiplyMatrices(fromWorld, part.matrixWorld);
      for (let i = 0; i < positions.count; i++) points.push(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform).sub(node.position));
    });
    // Only the small idle tap needs floor contact. Cache its supporting vertices once, including the heel.
    const support = new Set<Vector3>();
    for (let step = 0; step <= 12 && points.length > 0; step++) {
      rotation.setFromAxisAngle(axis, -.18 * step / 12);
      let low = Infinity, contact = points[0]!;
      for (const candidate of points) {
        const y = point.copy(candidate).applyQuaternion(rotation).dot(up);
        if (y < low) { low = y; contact = candidate; }
      }
      support.add(contact);
    }
    const contacts = [...support];
    feet.push({ node, position: node.position.clone(), rest: node.quaternion.clone(), axis, up, contacts,
      angle: 0, lift: 0, takeoffAngle: 0, takeoffLift: 0,
      sole: contacts.length ? Math.min(...contacts.map((contact) => contact.dot(up))) : 0 });
  });
  function pose(index: number, angle: number, planted: boolean, lift = 0): void {
    const foot = feet[index]!;
    foot.angle = angle;
    foot.lift = lift;
    rotation.setFromAxisAngle(foot.axis, angle);
    foot.node.quaternion.copy(rotation).multiply(foot.rest);
    if (planted && angle !== 0 && foot.contacts.length > 0) {
      let low = Infinity;
      for (const contact of foot.contacts) low = Math.min(low, point.copy(contact).applyQuaternion(rotation).dot(foot.up));
      foot.lift += foot.sole - low;
    }
    foot.node.position.copy(foot.position).addScaledVector(foot.up, foot.lift);
  }
  let cock = 1;
  return {
    update({ dt, clock, hop, calm, awake, staged, performance, elof, wind = 0 }) {
      idle.bob = idle.look = idle.pitch = idle.roll = 0;
      if (dt > 0 || calm) cloth(sway.step(wind, dt, calm));
      if (staged || !awake) {
        lastActivity = clock;
        wasHopping = false;
        for (let i = 0; i < feet.length; i++) {
          let angle = 0;
          // Authored time is authoritative even while paused or arriving partway through a scene.
          if (staged && performance && !calm) {
            const { act, actT } = performance, t = Math.max(0, actT);
            if (act === 'waddle' || act === 'run') angle = Math.sin(t * (act === 'run' ? 18 : 11)) * (i % 2 ? 1 : -1) * (act === 'run' ? .32 : .22);
            else if (act === 'hop') angle = hopAngle((t * 6 % Math.PI) / Math.PI, i);
            else if (act === 'wake' && t > 1.45 && t < 2.2) angle = hopAngle(smooth((t - 1.45) / .75), i);
          }
          pose(i, angle, false);
        }
        return idle;
      }
      if (dt <= 0) return held;
      const phase = hop === null ? null : Math.max(0, Math.min(1, hop));
      if (phase !== null) {
        if (!wasHopping) for (const foot of feet) { foot.takeoffAngle = foot.angle; foot.takeoffLift = foot.lift; }
        lastActivity = clock;
      } else if (calm) lastActivity = clock;
      wasHopping = phase !== null;
      const cycle = Math.floor(clock / 6.4), tapTime = (clock - cycle * 6.4 - 4.6) / .7;
      // A landing or the end of a held scene gets a quiet beat before idle acting resumes.
      const settled = smooth((clock - lastActivity - .45) / .35);
      const tap = !calm && phase === null && tapTime > 0 && tapTime < 1 ? -.18 * Math.sin(Math.PI * tapTime) ** 2 * settled : 0;
      // Between its taps a round may hold two small hops in place, or a look about; near Elof it watches him instead,
      // its head cocked. The order goes by the round, so no two rounds in a row need do the same.
      const at = clock - cycle * 6.4, round = roundOf(cycle), quiet = !calm && phase === null ? settled : 0;
      const near = quiet * smooth((5.5 - Math.abs(elof ?? Infinity)) / 2);
      const from = quiet > 0 && round < 2 ? at >= 2.3 && at < 2.62 ? 2.3 : at >= 2.7 && at < 3.02 ? 2.7 : null : null;
      const bounce = from === null ? null : (at - from) / .32;
      if (bounce !== null) idle.bob = .18 * bounce * (1 - bounce) * quiet;
      const glance = round === 2 || round === 3 ? (round === 2 ? 1 : -1) * (.5 * pulse(at, 1.4, .4, .5, .4) - .4 * pulse(at, 2.6, .4, .45, .4)) : 0;
      idle.look = glance * quiet * (1 - near);
      idle.pitch = .07 * near;
      // Turned to face him, a roll the way he stands from it brings its top over towards him too.
      // As he passes it, its head comes over to his side, not in one frame.
      const towards = elof !== undefined && elof < 0 ? -1 : 1;
      cock = calm ? towards : cock + (towards - cock) * (1 - Math.exp(-7 * dt));
      idle.roll = near * (.12 + .04 * Math.sin(clock * 1.1)) * cock;
      for (let i = 0; i < feet.length; i++) {
        if (phase === null && bounce !== null) pose(i, hopAngle(bounce, i) * .35 * quiet, false);
        else if (phase === null) pose(i, i === cycle % Math.max(1, feet.length) ? tap : 0, true);
        else {
          // Both shoes trail on takeoff, then reach forward before landing; neither moves the carved body.
          const foot = feet[i]!, release = 1 - smooth(phase / .18);
          pose(i, hopAngle(phase, i) * (calm ? .4 : 1) + foot.takeoffAngle * release, false, foot.takeoffLift * release);
        }
      }
      Object.assign(held, idle);
      return idle;
    },
  };
}
