import { BoxGeometry, Color, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';
import type { ChapterData } from '../sim/types';
import { createArmContact, createHandGrip } from './arm-contact';
import { SOCK, bodyOf, buildShells, wearShells, type RainGear } from './rain-gear';

/**
 * A body's pose, as a scene's acting asks for it (src/render/acting.ts). Angles are in radians. The body faces
 * forward along its own +z. Every joint swings in the body's own side view, forward and back: that is what a
 * side-view camera reads best, and what the models from Blender do too (their bones bend round their own x).
 */
export interface Pose {
  /** The spine leans forward (+) or back (−). */
  lean: number;
  /** The head nods down (+) or looks up (−). */
  nod: number;
  /** The head turns to the body's own left (+). */
  turn: number;
  /** Each arm swings forward and up from hanging: π/2 points straight ahead, π straight up. */
  armL: number;
  armR: number;
  /** Each elbow bends, bringing the hand up towards the shoulder. */
  elbowL: number;
  elbowR: number;
  /** Each thigh swings forward from hanging: π/2 is level, as in a chair. */
  legL: number;
  legR: number;
  /** Each knee bends, bringing the foot back. */
  kneeL: number;
  kneeR: number;
  /** Arms held out from the sides: 0 at the sides. */
  spread: number;
  /** Where the hips are, over the ground, in an adult's units: null stands the body on its lowest foot or knee. */
  seat: number | null;
  /** In a stage transition, the share of hip height supplied by the actual floor; seat holds the remainder. */
  floor?: number;
  /** A little hop of the whole body, in an adult's units. */
  bounce: number;
  /** The shoulders turn to the body's own left (+), and the hips a little the other way: a stride goes through the trunk. */
  twist: number;
  /** Each foot tips up at the toes (+) or points them down (−), about the ankle. */
  footL: number;
  footR: number;
}

export const STANDING: Readonly<Pose> = {
  lean: 0, nod: 0, turn: 0, armL: 0.02, armR: 0.02, elbowL: 0.1, elbowR: 0.1, legL: 0, legR: 0, kneeL: 0, kneeR: 0,
  spread: 0, seat: null, floor: 0, bounce: 0, twist: 0, footL: 0, footR: 0,
};

// The rehearsal body's measures, in an adult's units (an adult stands about 5.2 tall).
const ADULT = 5.2;
const HIP = 2.55;
const THIGH = 1.25;
const SHIN = 1.3;
const SHOULDER_Y = 1.55;
const SHOULDER_X = 0.79;
const UPPER = 0.84;
const FORE = 0.8;
const NECK = 1.8;
/** How thick a knee is: kneeling, the hips are this much higher than the thigh is long. */
const KNEE = 0.28;

/** The lowest point of a leg below its hip, the knee or the sole, for its two angles. */
function legLow(hip: number, knee: number): number {
  const kneeY = -Math.cos(hip) * THIGH;
  const angle = hip - knee;
  // The boot turns with the shin: its toe and heel matter as much as its ankle.
  const footY = kneeY + (-SHIN + 0.13) * Math.cos(angle) + 0.12 * Math.sin(angle)
    - 0.13 * Math.abs(Math.cos(angle)) - 0.475 * Math.abs(Math.sin(angle));
  return Math.min(kneeY - KNEE, footY);
}

/** Where the hips are when the body stands on its lowest foot or knee. */
export function groundedHips(p: Pose): number {
  return -Math.min(legLow(p.legL, p.kneeL), legLow(p.legR, p.kneeR));
}

/** A share of the way from one pose to another. */
/**
 * The feet of a stride. A stiff ankle tips the foot with the shin; through the stance the ankle gives, so the sole stays near the
 * ground from heel to toe, and lets go as the leg swings through. `phase` is the stride's: the left leg leads at a quarter turn.
 */
export function plantFeet(p: Pose, phase: number): void {
  const stance = (side: number) => {
    const t = Math.min(1, Math.max(0, 0.5 - side * Math.cos(phase) * 2));
    return t * t * (3 - 2 * t);
  };
  p.footL = -(p.legL - p.kneeL) * 0.55 * stance(1);
  p.footR = -(p.legR - p.kneeR) * 0.55 * stance(-1);
}

export function blendPose(a: Pose, b: Pose, t: number, out: Pose = { ...STANDING }, floor = false): Pose {
  if (t <= 0) return Object.assign(out, a, { floor: floor ? a.floor ?? 0 : 0 });
  if (t >= 1) return Object.assign(out, b, { floor: floor ? b.floor ?? 0 : 0 });
  // Capture endpoints before writing: the stage often blends into a or b themselves.
  const seatA = a.seat, seatB = b.seat, hipsA = seatA ?? groundedHips(a), hipsB = seatB ?? groundedHips(b);
  const groundA = seatA === null ? 1 : a.floor ?? 0, groundB = seatB === null ? 1 : b.floor ?? 0;
  const mix = (x: number, y: number) => x + (y - x) * t;
  for (const key in STANDING) if (key !== 'seat' && key !== 'floor') {
    const joint = key as Exclude<keyof Pose, 'seat' | 'floor'>;
    out[joint] = mix(a[joint], b[joint]);
  }
  // Sitting down and standing up: the hips go smoothly between where each pose would have them.
  out.seat = seatA === null && seatB === null ? null : floor ? mix(seatA ?? 0, seatB ?? 0) : mix(hipsA, hipsB);
  out.floor = floor && out.seat !== null ? mix(groundA, groundB) : 0;
  return out;
}

/** Who the figure is: their colours, a cap or a braid, and their size beside an adult. */
export type Role = 'mamma' | 'pappa' | 'moa' | 'bertil';
const ROLES: Record<Role, { top: string; cap: boolean; scale: number }> = {
  mamma: { top: '#829887', cap: false, scale: 1 },
  pappa: { top: '#3e4445', cap: true, scale: 1 },
  moa: { top: '#758dab', cap: false, scale: .77 },
  bertil: { top: '#baa061', cap: true, scale: .6 },
};

/** How tall each of the family stands, in EL, as the rehearsal figures are drawn. */
export const heightOf = (who: Role) => ADULT * ROLES[who].scale;

/** A posable body: the rehearsal figure built in code, or a model from Blender driven by its bones. */
export interface Rig {
  /** The group a scene places and turns. Its feet are at its origin, and it faces its own +z. */
  readonly group: Group;
  /** Release resources owned by a procedural stand-in when its model takes over. */
  dispose?(): void;
  /** Holds a pose. */
  pose(pose: Pose): void;
  /** Where a hand is in the world after the last pose: the body's left is 0. */
  hand(side: 0 | 1, out: Vector3): Vector3;
  /** The lips in world space, following the head's nod and turn. */
  mouth(out: Vector3): Vector3;
  /** Place a hand on a world-space contact after posing, without stretching the arm. */
  reach(side: 0 | 1, target: Vector3, weight?: number): void;
  /** Place and aim the palm around a held thing; returns its actual centre after clamping the reach. */
  grip(side: 0 | 1, target: Vector3, fingerDirection: Vector3, out: Vector3, weight?: number): Vector3;
  /**
   * The wind in the soft parts, after posing: `wind` is `windAt` at the body's own x (./wind.ts), and `ruffle` a
   * hand in the hair (−1 to 1). With `still` they are at rest at once.
   */
  breeze?(wind: number, dt: number, still: boolean, ruffle?: number): void;
  /** How tall the body stands, in EL. */
  readonly height: number;
  /** Rain gear on, or off with null (./rain-gear.ts). */
  dress?(gear: RainGear | null): void;
}

/**
 * Secondary motion in the one shared wind: a hair tip, a cap's brim, a scarf or a hem follows the wind with a little
 * lag and overshoot, as on a spring. Not a simulation: one damped angle, in radians, towards +x for a wind to the right.
 * It leans about 0.07 in still air, 0.2 in a breath and 0.3 in a gust. Paused (dt 0) it holds; `still` rests it at once.
 */
export function createSway(stiffness = 40, damping = 4.4) {
  let at = 0, speed = 0;
  return {
    step(wind: number, dt: number, still: boolean): number {
      if (still) return at = speed = 0;
      const target = Math.max(-.45, Math.min(.45, wind * .07));
      for (let left = Math.min(dt, .25); left > 1e-9; left -= 1 / 60) {
        const h = Math.min(left, 1 / 60);
        speed += (stiffness * (target - at) - damping * speed) * h;
        at += speed * h;
      }
      return at;
    },
  };
}

/** How much of the shared wind reaches the characters in a chapter: none indoors at home, more while the storm rains. */
export function galeOf(chapter: Pick<ChapterData, 'place' | 'storm'>, flags: ReadonlySet<string>): number {
  const storm = chapter.storm, raining = storm?.rain && !(storm.calm && flags.has(storm.calm)) ? storm.rain : 0;
  return chapter.place === 'home' ? 0 : 1 + .6 * raining;
}

const SOFT = /^(hair|fringe|bangs|braid|pony|lock|cap|brim|visor|scarf|hem|coat|skirt|cloth|cape)/i;

/**
 * The soft parts of a model from Blender, found by name (hair, braid, cap, brim, scarf, hem, coat, cloth, …): each bends
 * its tip downwind about its own root by the sway's angle, and a brim lifts. Parts bend along their own +y, as Blender's
 * bones lie. Called after posing, so the parents' matrices are this frame's or the last one's.
 */
export function softParts(root: Object3D, only: (node: Object3D) => boolean = (node) => (node as { isBone?: boolean }).isBone === true) {
  const parts: { node: Object3D; rest: Quaternion; brim: boolean; hair: boolean }[] = [];
  root.traverse((node) => {
    if (node !== root && node.parent && SOFT.test(node.name) && only(node)) {
      parts.push({ node, rest: node.quaternion.clone(), brim: /^(cap|brim|visor)/i.test(node.name), hair: /^(hair|fringe|bangs|braid|pony|lock)/i.test(node.name) });
    }
  });
  const along = new Vector3(), axis = new Vector3(), basis = new Matrix4(), frame = new Quaternion(), bend = new Quaternion();
  let resting = true;
  return (angle: number, ruffle = 0): void => {
    if (angle === 0 && ruffle === 0) {
      if (!resting) for (const part of parts) part.node.quaternion.copy(part.rest);
      resting = true;
      return;
    }
    resting = false;
    for (const { node, rest, brim, hair } of parts) {
      frame.setFromRotationMatrix(basis.extractRotation(node.parent!.matrixWorld)).multiply(rest);
      along.set(0, 1, 0).applyQuaternion(frame);
      // Turning about (along × x) brings the tip towards +x; a part lying along x, or a brim, lifts instead.
      let turn = angle + (hair ? ruffle * .12 : 0);
      axis.crossVectors(along, X);
      if (brim || axis.lengthSq() < .1) { axis.crossVectors(along, Y); turn = Math.min(.15, Math.abs(angle) * .5); }
      if (axis.lengthSq() < 1e-6) { node.quaternion.copy(rest); continue; }
      axis.normalize().applyQuaternion(frame.invert());
      node.quaternion.copy(rest).multiply(bend.setFromAxisAngle(axis, turn));
    }
  };
}

type JointName = 'root' | 'spine' | 'neck' | 'shoulderL' | 'elbowL' | 'handL' | 'shoulderR' | 'elbowR' | 'handR' | 'hipL' | 'kneeL' | 'hipR' | 'kneeR';
type Box = [x: number, y: number, z: number, width: number, height: number, depth: number, colour: string];

const geometry = new BoxGeometry(1, 1, 1);
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

/**
 * The rehearsal figure, posable: never a likeness or a substitute for an approved model (CLAUDE.md). Its parts
 * are the instances of one mesh, placed each frame from a small skeleton, so a figure is still one draw call.
 * Its group carries `userData.familyRole` and `userData.rehearsal`, as the plain one did.
 */
export function createRehearsalRig(who: Role): Rig {
  const role = ROLES[who];
  const s = role.scale;
  const skin = '#e7bd96', trousers = '#77816a', shoe = '#62503d', hair = '#6a4634';
  const parts: { joint: JointName; box: Box }[] = [
    { joint: 'spine', box: [0, 0.9, 0, 1.3, 1.8, 0.7, role.top] },
    { joint: 'neck', box: [0, 0.425, 0, 0.8, 0.85, 0.75, skin] },
    { joint: 'neck', box: [-0.15, 0.515, 0.384, 0.055, 0.07, 0.03, '#3e3831'] },
    { joint: 'neck', box: [0.15, 0.515, 0.384, 0.055, 0.07, 0.03, '#3e3831'] },
    role.cap
      ? { joint: 'neck', box: [0, 0.905, 0.14, 0.94, 0.18, 1, '#3e4445'] }
      : { joint: 'neck', box: [0.42, -0.02, -0.05, 0.2, 1.5, 0.3, hair] },
    // The body's own left is its +x: facing along the course, the right arm is the one nearer the camera.
    { joint: 'shoulderL', box: [0, -UPPER / 2, 0, 0.27, UPPER, 0.38, role.top] },
    { joint: 'elbowL', box: [0, -FORE / 2 + 0.04, 0, 0.25, FORE, 0.36, role.top] },
    { joint: 'handL', box: [0, -0.1, 0.02, 0.25, 0.28, 0.36, skin] },
    { joint: 'shoulderR', box: [0, -UPPER / 2, 0, 0.27, UPPER, 0.38, role.top] },
    { joint: 'elbowR', box: [0, -FORE / 2 + 0.04, 0, 0.25, FORE, 0.36, role.top] },
    { joint: 'handR', box: [0, -0.1, 0.02, 0.25, 0.28, 0.36, skin] },
    { joint: 'hipL', box: [0, -THIGH / 2, 0, 0.48, THIGH, 0.58, trousers] },
    { joint: 'kneeL', box: [0, -SHIN / 2 + 0.1, 0, 0.44, SHIN - 0.2, 0.52, trousers] },
    { joint: 'kneeL', box: [0, -SHIN + 0.13, 0.12, 0.58, 0.26, 0.95, shoe] },
    { joint: 'hipR', box: [0, -THIGH / 2, 0, 0.48, THIGH, 0.58, trousers] },
    { joint: 'kneeR', box: [0, -SHIN / 2 + 0.1, 0, 0.44, SHIN - 0.2, 0.52, trousers] },
    { joint: 'kneeR', box: [0, -SHIN + 0.13, 0.12, 0.58, 0.26, 0.95, shoe] },
  ];
  const mesh = new InstancedMesh(geometry, new MeshLambertMaterial(), parts.length);
  mesh.name = `family-rehearsal-body:${who}`;
  const colour = new Color();
  for (const [i, part] of parts.entries()) mesh.setColorAt(i, colour.set(part.box[6]));
  const group = new Group();
  group.name = `family-rehearsal:${who}`;
  group.userData.familyRole = who;
  group.userData.rehearsal = true;
  group.add(mesh);

  const joints = {} as Record<JointName, Matrix4>;
  for (const name of ['root', 'spine', 'neck', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'hipL', 'kneeL', 'hipR', 'kneeR'] as const) joints[name] = new Matrix4();
  const local = new Matrix4(), turn = new Quaternion(), more = new Quaternion();
  const place = new Vector3(), size = new Vector3(), one = new Vector3(1, 1, 1);
  const part = new Matrix4(), box = new Matrix4(), scaleAll = new Matrix4().makeScale(s, s, s), still = new Quaternion();
  /** A joint is its parent, moved to where it sits, and turned: a forward swing turns about −x. */
  function set(name: JointName, parent: JointName | null, x: number, y: number, z: number, swing: number, side = 0, twist = 0): void {
    turn.setFromAxisAngle(X, -swing);
    if (side !== 0) turn.premultiply(more.setFromAxisAngle(Z, side));
    if (twist !== 0) turn.premultiply(more.setFromAxisAngle(Y, twist));
    local.compose(place.set(x, y, z), turn, one);
    if (parent) joints[name].multiplyMatrices(joints[parent], local);
    else joints[name].copy(local);
  }
  const hands = [new Vector3(), new Vector3()];
  const contactRoot = new Group();
  contactRoot.scale.setScalar(s);
  group.add(contactRoot);
  const contacts = ([0, 1] as const).map(side => {
    const upper = new Object3D(), lower = new Object3D(), wrist = new Object3D(), tip = new Object3D();
    contactRoot.add(upper); upper.add(lower); lower.add(wrist); wrist.add(tip);
    wrist.position.set(0, -FORE, 0); tip.position.set(0, -.12, .05);
    return { upper, lower, wrist, solve: createArmContact(upper, lower, tip),
      grip: createHandGrip(lower, wrist, createArmContact(upper, lower, wrist), new Vector3(0, -1, 0), .125),
      shoulder: side === 0 ? 'shoulderL' as const : 'shoulderR' as const,
      elbow: side === 0 ? 'elbowL' as const : 'elbowR' as const,
      hand: side === 0 ? 'handL' as const : 'handR' as const };
  });
  // The fifth part is the soft one: the hair hangs from its top, and a cap's brim lifts about the cap's back edge.
  const sway = createSway(), bend = new Quaternion(), hinge = role.cap ? new Vector3(0, 0.815, -0.36) : new Vector3(0.42, 0.73, -0.05);
  const pivot = new Matrix4(), turned = new Euler();
  function writePart(i: number): void {
    const { joint, box: [x, y, z, w, h, d] } = parts[i]!;
    box.compose(place.set(x, y, z), still, size.set(w, h, d));
    if (i === 4 && bend.w < 1) {
      box.premultiply(pivot.makeTranslation(-hinge.x, -hinge.y, -hinge.z)).premultiply(pivot.makeRotationFromQuaternion(bend))
        .premultiply(pivot.makeTranslation(hinge.x, hinge.y, hinge.z));
    }
    part.multiplyMatrices(joints[joint], box).premultiply(scaleAll);
    mesh.setMatrixAt(i, part);
  }
  function writeParts(): void {
    for (let i = 0; i < parts.length; i++) writePart(i);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    hands[0].set(0, -0.12, 0.05).applyMatrix4(joints.handL).multiplyScalar(s);
    hands[1].set(0, -0.12, 0.05).applyMatrix4(joints.handR).multiplyScalar(s);
  }
  function pose(p: Pose): void {
    const floor = groundedHips(p);
    const hips = (p.seat === null ? floor : p.floor ? Math.max(floor, p.seat + p.floor * floor) : p.seat) + p.bounce;
    set('root', null, 0, hips, 0, 0);
    // The spine and the head stand up from their joints: a forward lean and a nod down turn them the other way
    // round x from a limb that hangs down.
    set('spine', 'root', 0, 0, 0, -p.lean);
    set('neck', 'spine', 0, NECK, 0, -p.nod, 0, p.turn);
    set('shoulderL', 'spine', SHOULDER_X, SHOULDER_Y, 0, p.armL, p.spread);
    set('elbowL', 'shoulderL', 0, -UPPER, 0, p.elbowL);
    set('handL', 'elbowL', 0, -FORE, 0, 0);
    set('shoulderR', 'spine', -SHOULDER_X, SHOULDER_Y, 0, p.armR, -p.spread);
    set('elbowR', 'shoulderR', 0, -UPPER, 0, p.elbowR);
    set('handR', 'elbowR', 0, -FORE, 0, 0);
    set('hipL', 'root', 0.38, 0, 0, p.legL);
    set('kneeL', 'hipL', 0, -THIGH, 0, -p.kneeL);
    set('hipR', 'root', -0.38, 0, 0, p.legR);
    set('kneeR', 'hipR', 0, -THIGH, 0, -p.kneeR);
    for (const arm of contacts) {
      joints[arm.shoulder].decompose(arm.upper.position, arm.upper.quaternion, arm.upper.scale);
      local.copy(joints[arm.shoulder]).invert().multiply(joints[arm.elbow]);
      local.decompose(arm.lower.position, arm.lower.quaternion, arm.lower.scale);
      arm.wrist.quaternion.identity();
    }
    writeParts();
  }
  function contactParts(side: 0 | 1): void {
    const arm = contacts[side];
    arm.upper.updateMatrix(); arm.lower.updateMatrix(); arm.wrist.updateMatrix();
    joints[arm.shoulder].copy(arm.upper.matrix);
    joints[arm.elbow].multiplyMatrices(arm.upper.matrix, arm.lower.matrix);
    joints[arm.hand].multiplyMatrices(joints[arm.elbow], arm.wrist.matrix);
    writeParts();
  }
  pose(STANDING);
  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.dispose();
      // The box geometry is shared by every rehearsal actor, including ones still on stage.
      mesh.material.dispose();
    },
    height: ADULT * s,
    pose,
    dress(gear) {
      // The coat over the body and arms; boots over the shins and shoes; a sock where a boot is off.
      const set = (i: number, hex: string) => mesh.setColorAt(i, colour.set(hex));
      for (const i of [0, 5, 6, 8, 9]) set(i, gear ? gear.coat : role.top);
      for (const [side, shin, foot] of [[0, 12, 13], [1, 15, 16]] as const) {
        const off = gear?.bootOff === side;
        set(shin, gear && !off ? gear.boots : trousers);
        set(foot, gear ? (off ? SOCK : gear.boots) : shoe);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    hand(side, out) {
      group.updateWorldMatrix(true, false);
      return out.copy(hands[side]).applyMatrix4(group.matrixWorld);
    },
    mouth(out) { return group.localToWorld(out.set(0, .25, .38).applyMatrix4(joints.neck).multiplyScalar(s)); },
    breeze(wind, dt, calm) {
      // Paused (no time passing), the hair and the brim hold exactly as they are.
      if (dt <= 0) return;
      const angle = sway.step(wind, dt, calm);
      if (angle === 0 && bend.w === 1) return;
      // Which way the wind goes through the figure, from its last matrix: its front is +z and its own left +x.
      const e = group.matrixWorld.elements;
      const ahead = e[8]! / (Math.hypot(e[8]!, e[9]!, e[10]!) || 1), left = e[0]! / (Math.hypot(e[0]!, e[1]!, e[2]!) || 1);
      if (angle === 0) bend.identity();
      // A headwind lifts the brim most; the hair's tip goes downwind.
      else if (role.cap) bend.setFromAxisAngle(X, -Math.min(.12, .3 * Math.abs(angle) + .4 * Math.max(0, -ahead * angle)));
      else bend.setFromEuler(turned.set(-ahead * angle, 0, left * angle));
      writePart(4);
      mesh.instanceMatrix.needsUpdate = true;
    },
    reach(side, target, weight = 1) {
      contacts[side].solve(target, weight);
      contactParts(side);
    },
    grip(side, target, direction, out, weight = 1) {
      contacts[side].grip(target, direction, out, weight);
      contactParts(side);
      return out;
    },
  };
}

/** One bone, the turn it rests in, and which way round its x it bends a joint forward. */
interface Bone { node: Object3D; rest: Quaternion; sign: 1 | -1 }

/** Cache a small support cloud in each boot's bone space; never skin or scan the mesh during a pose. */
function bootContacts(model: Object3D, foot: Object3D): Vector3[] {
  const points: Vector3[] = [], transform = new Matrix4();
  model.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const positions = node.geometry.getAttribute('position');
    if (!positions) return;
    if (node instanceof SkinnedMesh) {
      const index = node.skeleton.bones.findIndex((bone) => bone === foot);
      const indices = node.geometry.getAttribute('skinIndex'), weights = node.geometry.getAttribute('skinWeight');
      if (index < 0 || !indices || !weights) return;
      transform.multiplyMatrices(node.skeleton.boneInverses[index]!, node.bindMatrix);
      for (let i = 0; i < positions.count; i++) {
        // Shoes in the Blender models are rigidly weighted to their foot, including their soles and laces.
        for (let channel = 0; channel < 4; channel++) {
          if (indices.getComponent(i, channel) === index && weights.getComponent(i, channel) > .999) {
            points.push(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform));
            break;
          }
        }
      }
    } else {
      let parent: Object3D | null = node;
      while (parent && parent !== foot) parent = parent.parent;
      if (!parent) return;
      transform.copy(foot.matrixWorld).invert().multiply(node.matrixWorld);
      for (let i = 0; i < positions.count; i++) points.push(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform));
    }
  });
  if (points.length === 0) return points;
  // Rotating a boot changes which part supports it: heel, toe, sole and (when kneeling) the upper.
  // Side-tilted directions also retain the edges of boots whose bones splay out slightly in their rest pose.
  const support = new Set<Vector3>();
  const keep = (x: number, y: number, z: number) => {
    let lowest = Infinity, contact = points[0]!;
    for (const point of points) {
      const distance = point.x * x + point.y * y + point.z * z;
      if (distance < lowest) { lowest = distance; contact = point; }
    }
    support.add(contact);
  };
  for (let i = 0; i < 64; i++) {
    const angle = i * Math.PI / 32;
    for (const side of [-.5, -.08, 0, .08, .5]) keep(side, Math.cos(angle), Math.sin(angle));
  }
  keep(-1, 0, 0); keep(1, 0, 0);
  // Include the exact standing direction, even when a foot bone has an unusual rest roll.
  const rest = foot.matrixWorld.elements;
  keep(rest[1]!, rest[5]!, rest[9]!);
  return [...support];
}

/**
 * A model from Blender, posed on its bones. They carry the animation library's joint names (plan §5.6) and bend
 * round their own x. Exported limbs hang half a turn round z from the body, so their +y runs down the limb and
 * their +z still faces forward: a positive turn brings an arm or a thigh forward, bends an elbow, leans the spine
 * and nods the head; a negative one bends a knee. Where a bone is
 * missing, that joint stays as it rests. The body stands on its lowest foot, or is sat at its seat.
 * The model keeps its supplied scale, and is `height` EL tall as drawn.
 */
export function createModelRig(model: Object3D, height: number): Rig {
  const group = new Group();
  group.add(model);
  group.updateWorldMatrix(true, true);
  const bone = (name: string, sign: 1 | -1): Bone | null => {
    const node = model.getObjectByName(name);
    return node ? { node, rest: node.quaternion.clone(), sign } : null;
  };
  const bones = {
    spine: bone('spine_01', 1), chest: bone('spine_02', 1), pelvis: bone('pelvis', 1), head: bone('Head', 1) ?? bone('head', 1),
    footL: bone('foot_l', 1), footR: bone('foot_r', 1),
    armL: bone('upperarm_l', 1), armR: bone('upperarm_r', 1), elbowL: bone('lowerarm_l', 1), elbowR: bone('lowerarm_r', 1),
    legL: bone('thigh_l', 1), legR: bone('thigh_r', 1), kneeL: bone('calf_l', -1), kneeR: bone('calf_r', -1),
  };
  const feet = ['foot_l', 'foot_r'].map((name) => model.getObjectByName(name)).filter((n): n is Object3D => n !== undefined);
  const knees = [bones.kneeL?.node, bones.kneeR?.node].filter((n): n is Object3D => n !== undefined);
  // A hand is the far end of its forearm: the hand's own bone where the model has one.
  const handBones = [model.getObjectByName('hand_l') ?? null, model.getObjectByName('hand_r') ?? null];
  const handRest = handBones.map(hand => hand?.quaternion.clone());
  const turn = new Quaternion();
  const orientation = model.getWorldQuaternion(new Quaternion());
  // A head's up and an arm's outward axis belong to the body, not to a bone's arbitrary rest roll.
  const axis = (b: Bone | null, direction: Vector3) => b ? direction.clone().applyQuaternion(orientation)
    .applyQuaternion(b.node.getWorldQuaternion(new Quaternion()).invert()).normalize() : null;
  const headUp = axis(bones.head, Y), leftOut = axis(bones.armL, Z), rightOut = axis(bones.armR, Z);
  const chestUp = axis(bones.chest, Y), pelvisUp = axis(bones.pelvis, Y);
  // Lip centre relative to the neck in the exported heads' authoring units; cache through the rest roll.
  const mouth = new Vector3(0, .055, .135);
  if (bones.head) mouth.applyQuaternion(orientation).applyQuaternion(bones.head.node.getWorldQuaternion(new Quaternion()).invert());
  const bend = (b: Bone | null, angle: number, around: Vector3 | null = null, extra = 0) => {
    if (!b) return;
    b.node.quaternion.copy(b.rest);
    if (around && extra !== 0) b.node.quaternion.multiply(turn.setFromAxisAngle(around, extra));
    b.node.quaternion.multiply(turn.setFromAxisAngle(X, angle * b.sign));
  };
  const at = new Vector3();
  const rest = model.position.y;
  const unit = height / ADULT;
  group.updateWorldMatrix(true, true);
  const supports = feet.map((foot) => ({ foot, points: bootContacts(model, foot) }));
  const toGroup = new Matrix4(), inverseGroup = new Matrix4();
  // Models without boot geometry retain the ankle-height fallback.
  const sole = feet.length > 0 ? Math.min(...feet.map((foot) => group.worldToLocal(foot.getWorldPosition(at)).y)) : 0;
  const hips = [bones.legL, bones.legR].filter((b): b is Bone => b !== null);
  const restHip = hips.length > 0
    ? hips.reduce((sum, b) => sum + group.worldToLocal(b.node.getWorldPosition(at)).y, 0) / hips.length
    : HIP * unit;
  // Without a hand bone, approximate the forearm by the upper arm, measured in the lower bone's own units.
  // Keeping a world-space length here would shorten the reach if a scene later enlarged the whole figure.
  const fore = [bones.armL, bones.armR].map((upper, i) => {
    const lower = i === 0 ? bones.elbowL : bones.elbowR;
    return upper && lower ? lower.node.worldToLocal(upper.node.getWorldPosition(at)).length() : 0;
  });
  const contacts = [bones.armL, bones.armR].map((upper, i) => {
    const lower = i === 0 ? bones.elbowL : bones.elbowR;
    return upper && lower ? createArmContact(upper.node, lower.node, handBones[i] ?? new Vector3(0, fore[i]!, 0)) : null;
  });
  const grips = handBones.map((hand, i) => {
    const lower = i === 0 ? bones.elbowL : bones.elbowR;
    return hand && lower && contacts[i] ? createHandGrip(lower.node, hand, contacts[i]!) : null;
  });
  const sway = createSway(), soft = softParts(model);
  // The rain gear's shells, made the first time it is worn (./rain-gear.ts).
  let shells: ReturnType<typeof buildShells> | undefined;
  return {
    group,
    height,
    dress(gear) {
      if (shells === undefined) {
        if (!gear) return;
        const body = bodyOf(model);
        shells = body ? buildShells(body, height) : null;
      }
      if (shells) wearShells(shells, gear);
    },
    breeze(wind, dt, still, ruffle = 0) { if (dt > 0) soft(sway.step(wind, dt, still), still ? 0 : ruffle); },
    mouth(out) { return bones.head ? bones.head.node.localToWorld(out.copy(mouth)) : group.localToWorld(out.set(0, height * .89, height * .075)); },
    reach(side, target, weight = 1) { contacts[side]?.(target, weight); },
    grip(side, target, direction, out, weight = 1) {
      if (grips[side]) return grips[side]!(target, direction, out, weight);
      this.reach(side, target, weight);
      return this.hand(side, out);
    },
    pose(p) {
      handBones.forEach((hand, i) => { if (hand) hand.quaternion.copy(handRest[i]!); });
      // A model with a chest bends through two joints, and its stride turns the shoulders against the hips.
      bend(bones.spine, bones.chest ? p.lean * 0.55 : p.lean);
      bend(bones.chest, p.lean * 0.55, chestUp, p.twist);
      bend(bones.pelvis, 0, pelvisUp, -p.twist * 0.45);
      bend(bones.head, p.nod, headUp, p.turn - (bones.chest ? p.twist * 0.6 : 0));
      bend(bones.footL, p.footL);
      bend(bones.footR, p.footR);
      bend(bones.armL, p.armL, leftOut, p.spread);
      bend(bones.armR, p.armR, rightOut, -p.spread);
      bend(bones.elbowL, p.elbowL);
      bend(bones.elbowR, p.elbowR);
      bend(bones.legL, p.legL);
      bend(bones.legR, p.legR);
      bend(bones.kneeL, p.kneeL);
      bend(bones.kneeR, p.kneeR);
      model.position.y = rest;
      const seated = p.seat === null ? -Infinity : rest + (p.seat + p.bounce) * unit - restHip;
      if (p.seat !== null && !p.floor) {
        model.position.y = seated;
        return;
      }
      let low = (HIP - groundedHips(p)) * unit;
      if (feet.length > 0) {
        group.updateWorldMatrix(true, true);
        inverseGroup.copy(group.matrixWorld).invert();
        // The lowest of the soles, or of the knees for a body that kneels.
        low = Infinity;
        for (const { foot, points } of supports) {
          toGroup.multiplyMatrices(inverseGroup, foot.matrixWorld);
          if (points.length === 0) low = Math.min(low, at.setFromMatrixPosition(toGroup).y - sole);
          else for (const point of points) low = Math.min(low, at.copy(point).applyMatrix4(toGroup).y);
        }
        for (const knee of knees) low = Math.min(low, at.setFromMatrixPosition(knee.matrixWorld).applyMatrix4(inverseGroup).y - KNEE * unit);
      }
      const grounded = rest - low + p.bounce * unit;
      model.position.y = p.floor ? Math.max(grounded, seated + p.floor * (restHip - low)) : grounded;
    },
    hand(side, out) {
      const own = handBones[side];
      if (own) return own.getWorldPosition(out);
      const lower = side === 0 ? bones.elbowL : bones.elbowR;
      if (!lower) return group.localToWorld(out.set(0, height * 0.45, 0));
      // Blender's bones lie along their own +y: the hand is a forearm's length along it from the elbow.
      return lower.node.localToWorld(out.set(0, fore[side]!, 0));
    },
  };
}
