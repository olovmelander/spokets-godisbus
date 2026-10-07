import { Matrix4, Mesh, Quaternion, Vector3, type Object3D } from 'three';

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
}

/** The carved body stays rigid; its two separate shoes can trail a hop, prepare to land, or tap a toe. */
export function createGhostMotion(model: Object3D, facesX = false): { update(frame: GhostMotionFrame): void } {
  model.updateWorldMatrix(true, true);
  const orientation = model.getWorldQuaternion(new Quaternion());
  const rotation = new Quaternion(), point = new Vector3(), transform = new Matrix4();
  const feet: { node: Object3D; position: Vector3; rest: Quaternion; axis: Vector3; up: Vector3; contacts: Vector3[]; sole: number }[] = [];
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
      sole: contacts.length ? Math.min(...contacts.map((contact) => contact.dot(up))) : 0 });
  });
  function pose(index: number, angle: number, planted: boolean): void {
    const foot = feet[index]!;
    foot.node.position.copy(foot.position);
    rotation.setFromAxisAngle(foot.axis, angle);
    foot.node.quaternion.copy(rotation).multiply(foot.rest);
    if (!planted || angle === 0 || foot.contacts.length === 0) return;
    let low = Infinity;
    for (const contact of foot.contacts) low = Math.min(low, point.copy(contact).applyQuaternion(rotation).dot(foot.up));
    foot.node.position.addScaledVector(foot.up, foot.sole - low);
  }
  return {
    update({ dt, clock, hop, calm, awake, staged }) {
      if (staged || !awake) {
        for (let i = 0; i < feet.length; i++) pose(i, 0, false);
        return;
      }
      if (dt <= 0) return;
      const phase = hop === null ? null : Math.max(0, Math.min(1, hop));
      const cycle = Math.floor(clock / 6.4), tapTime = (clock - cycle * 6.4 - 4.6) / .7;
      const tap = !calm && phase === null && tapTime > 0 && tapTime < 1 ? -.18 * Math.sin(Math.PI * tapTime) ** 2 : 0;
      for (let i = 0; i < feet.length; i++) {
        if (phase === null) pose(i, i === cycle % Math.max(1, feet.length) ? tap : 0, true);
        else {
          // Both shoes trail on takeoff, then reach forward before landing; neither moves the carved body.
          const arch = Math.sin(Math.PI * phase);
          const trailing = .72 * (1 - phase) - .52 * phase;
          const offset = (i % 2 ? -1 : 1) * .065 * Math.sin(Math.PI * 2 * phase);
          pose(i, arch * (trailing + offset) * (calm ? .4 : 1), false);
        }
      }
    },
  };
}
