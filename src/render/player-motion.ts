import { BoxGeometry, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { CLIMB_SPEED, JUMP_SPEED, RUN_AFTER, RUN_SPEED } from '../sim/constants';
import type { PlayerState } from '../sim/types';
import { blendPose, createSway, plantFeet, STANDING, type Pose } from './rig';
import { createArmContact } from './arm-contact';

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
type MotionState = Pick<PlayerState, 'mode' | 'grounded' | 'vy'> & Partial<Pick<PlayerState, 't' | 'atEdge'>>;
/** 0 → 1 over `up` seconds from `at`, held for `hold`, and back to 0 over `down`. */
const pulse = (t: number, at: number, up: number, hold: number, down: number) => smooth((t - at) / up) * (1 - smooth((t - at - up - hold) / down));
/** A small seeded random (mulberry32): the idles' order is shuffled, the same in every run. */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** What he does while he waits, in its seconds. After a long wait he stretches. */
export const IDLES = { look: 4.4, rock: 3.6, scratch: 2.8, leaf: 3.8, tap: 3.2, stretch: 3.4 } as const;
export type IdleAct = keyof typeof IDLES;
/** The first idle begins this long after he stops, and a stretch only after this long a wait. */
const FIRST = 3.4, STRETCH = 18;
const JOINTS = ['lean', 'nod', 'turn', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'spread', 'twist', 'footL', 'footR'] as const;

/**
 * The thigh and knee that lift a heel by tipping the boot `tip` (< 0) about its toe, which stays where it stood: the
 * public figure's measures (thigh 0.19, toe 0.135 ahead of and 0.21 below the knee).
 */
function onToe(tip: number): { hip: number; knee: number } {
  const hip = Math.asin(Math.max(-1, Math.min(1, (0.135 * (1 - Math.cos(tip)) - 0.21 * Math.sin(tip)) / 0.19)));
  return { hip, knee: hip - tip };
}

/**
 * A short readable idle, added to the standing target at `u` seconds into it. Nothing moves a foot from its place: a
 * heel lifts about its toe, and the rest is spine, head and arms. `near` is +1 when his right arm is nearer the camera
 * (facing right), and `toward` turns the head towards the camera. Returns a hand in the hair, −1 to 1.
 */
function idlePose(act: IdleAct, u: number, near: 1 | -1, out: Pose): number {
  const d = IDLES[act];
  const arm = near > 0 ? 'armR' : 'armL', elbow = near > 0 ? 'elbowR' : 'elbowL';
  const toward = -near;
  const lift = (tip: number, legs: 'both' | 'near') => {
    const { hip, knee } = onToe(tip);
    if (legs === 'both' || near < 0) { out.legL += hip; out.kneeL += knee; }
    if (legs === 'both' || near > 0) { out.legR += hip; out.kneeR += knee; }
  };
  switch (act) {
    case 'look': {
      // Over his shoulder towards us, away into the place, then up.
      const first = pulse(u, .15, .5, .7, .45), second = pulse(u, 1.75, .5, .55, .45), up = pulse(u, 3, .45, .5, .45);
      out.turn += toward * (.6 * first - .45 * second) + .08 * up;
      out.nod += .04 * first - .36 * up;
      out.lean -= .025 * up;
      return 0;
    }
    case 'rock': {
      // Up on his toes and back, twice, with his hands behind his back.
      const e = pulse(u, 0, .45, d - .95, .5), wave = Math.sin(u * Math.PI * 2 / 1.65);
      const up = e * Math.max(0, wave), back = e * Math.max(0, -wave);
      lift(-.13 * up, 'both');
      out.lean += .05 * up - .045 * back; out.nod += .03 * back - .03 * up;
      out.armL += (-.42 - out.armL) * e; out.armR += (-.42 - out.armR) * e;
      out.elbowL += (.55 - out.elbowL) * e; out.elbowR += (.55 - out.elbowR) * e;
      return 0;
    }
    case 'scratch': {
      // The nearer hand up to the side of his head (or his cap's brim), a quick scratch, and down.
      const raise = pulse(u, .1, .5, 1.6, .55);
      const rub = Math.sin(u * 26) * smooth((u - .6) / .2) * (1 - smooth((u - 1.9) / .2));
      out[arm] += (2.55 - out[arm]) * raise; out[elbow] += (2.05 - out[elbow]) * raise + .13 * rub;
      out.nod += .12 * raise; out.turn += toward * .1 * raise; out.lean += .02 * raise;
      return rub;
    }
    case 'leaf': {
      // Up at a falling leaf, following it down as it drifts, and a hand opens for it.
      const watch = pulse(u, 0, .5, 2.8, .5), follow = smooth((u - .5) / 2.6), take = pulse(u, 2.2, .45, .5, .6);
      out.nod += watch * (-.5 + .62 * follow);
      out.turn += watch * .16 * Math.sin(u * 2.4) * (1 - .5 * follow);
      out.lean -= .03 * watch * (1 - follow);
      out[arm] += (.75 - out[arm]) * take; out[elbow] += (.7 - out[elbow]) * take;
      return 0;
    }
    case 'tap': {
      // Arms folded across his chest, and the nearer heel taps about its toe.
      const e = pulse(u, 0, .45, d - .95, .5), beat = Math.max(0, Math.sin((u - .5) * Math.PI * 2 * 2.1)) * smooth((u - .5) / .15) * (1 - smooth((u - d + .7) / .2));
      out.armL += (.5 - out.armL) * e; out.armR += (.55 - out.armR) * e;
      out.elbowL += (1.9 - out.elbowL) * e; out.elbowR += (1.85 - out.elbowR) * e;
      out.spread -= .25 * e;
      lift(-.12 * beat, 'near');
      out.nod += .035 * beat;
      return 0;
    }
    case 'stretch': {
      // Both arms up high, up on his toes a little, and down again through the sides.
      const up = pulse(u, .1, .7, 1.4, .9), toes = pulse(u, .5, .5, .8, .5);
      out.armL += (2.95 - out.armL) * up; out.armR += (2.95 - out.armR) * up;
      out.elbowL += (.12 - out.elbowL) * up; out.elbowR += (.12 - out.elbowR) * up;
      out.spread += .18 * up + .35 * pulse(u, 2.2, .3, .2, .5);
      out.lean -= .1 * up; out.nod -= .28 * up;
      lift(-.09 * toes, 'both');
      return 0;
    }
  }
}

/** One pose language for the rounded public figure and the approved model's named bones. */
export function playerPose(player: MotionState, phase: number, pace: number, landing: number, out: Pose): Pose {
  Object.assign(out, STANDING);
  if (player.mode === 'climb') {
    const step = Math.sin(phase);
    out.armL = 2.5 + step * 0.3; out.armR = 2.5 - step * 0.3;
    out.elbowL = 0.4 - step * 0.22; out.elbowR = 0.4 + step * 0.22;
    out.legL = 0.45 - step * 0.3; out.legR = 0.45 + step * 0.3;
    out.kneeL = 0.65 - step * 0.3; out.kneeR = 0.65 + step * 0.3;
    out.lean = -0.06; out.nod = -0.18;
  } else if (player.mode === 'slide') {
    out.armL = 2.45; out.armR = 2.25; out.elbowL = 0.55; out.elbowR = 0.65;
    out.legL = 0.7; out.legR = 0.45; out.kneeL = 0.85; out.kneeR = 0.7;
    out.lean = -0.16; out.nod = 0.15;
  } else if (player.mode === 'ledge') {
    // Reach, pull the chest over the rim, then plant a knee and stand up.
    const pull = smooth((player.t ?? 0) / 0.6), stand = smooth(((player.t ?? 0) - 0.55) / 0.45);
    out.armL = (2.8 - pull * 1.6) * (1 - stand); out.armR = (2.6 - pull * 1.4) * (1 - stand);
    out.elbowL = out.elbowR = (0.2 + 0.8 * pull) * (1 - stand);
    out.legL = (0.35 + pull * 0.85) * (1 - stand); out.legR = 0.2 * (1 - stand);
    out.kneeL = (0.55 + pull * 0.65) * (1 - stand); out.kneeR = 0.35 * (1 - stand);
    out.lean = 0.35 * pull * (1 - stand); out.nod = -0.2 * (1 - pull);
  } else if (player.mode === 'swing') {
    out.armL = out.armR = 2.9; out.elbowL = out.elbowR = 0.15;
    out.legL = out.legR = 0.2; out.kneeL = out.kneeR = 0.45;
    out.lean = -.08; out.nod = -.12;
  } else if (player.mode === 'ride') {
    out.legL = out.legR = 1.25; out.kneeL = out.kneeR = 1.3;
    out.armL = out.armR = 0.3; out.elbowL = out.elbowR = 0.6;
  } else if (player.mode === 'down' || player.mode === 'bubble') {
    out.armL = out.armR = 0.45; out.elbowL = out.elbowR = 0.9;
    out.legL = out.legR = 0.4; out.kneeL = out.kneeR = 0.8;
    out.spread = player.mode === 'bubble' ? 0.25 : 0;
  } else if (!player.grounded) {
    const rise = clamp(player.vy / JUMP_SPEED), fall = clamp(-player.vy / JUMP_SPEED);
    out.legL = 0.4 + 0.35 * rise - 0.25 * fall; out.legR = 0.15 - 0.4 * rise + 0.05 * fall;
    out.kneeL = 0.45 + 0.45 * rise - 0.3 * fall; out.kneeR = 0.3 + 0.2 * rise - 0.15 * fall;
    out.armL = 0.65 + 0.5 * rise + 0.15 * fall; out.armR = 0.8 + 0.5 * rise + 0.25 * fall;
    out.elbowL = out.elbowR = 0.25 + 0.35 * rise;
    out.lean = 0.08 * rise - 0.04 * fall;
    // Up off the toes with a turn of the shoulders, and the feet come up to meet the ground.
    out.twist = 0.16 * rise - 0.06 * fall;
    out.footL = -0.45 * rise + 0.25 * fall; out.footR = -0.55 * rise + 0.2 * fall;
  } else if (player.atEdge) {
    out.lean = -0.16; out.nod = 0.35; out.spread = 0.18;
    out.armL = 0.25; out.armR = 0.4; out.elbowL = out.elbowR = 0.3;
    out.legL = 0.1; out.legR = -0.12; out.kneeL = 0.1; out.kneeR = 0.18;
  } else {
    const effort = Math.sqrt(clamp(pace)), run = smooth((pace - 0.35) / 0.65);
    const reach = effort * (0.44 + 0.3 * run), swing = Math.sin(phase) * reach;
    const recovery = Math.cos(phase), fold = effort * (0.45 + 0.65 * run);
    out.legL = swing + 0.45 * landing; out.legR = -swing + 0.45 * landing;
    // The recovering foot folds behind the knee; the supporting leg extends on its way back.
    // Squaring the lift makes both ends of contact smooth instead of snapping the knee straight.
    out.kneeL = Math.max(0, recovery) ** 2 * fold + 0.9 * landing;
    out.kneeR = Math.max(0, -recovery) ** 2 * fold + 0.9 * landing;
    out.armL = -swing * 0.9; out.armR = swing * 0.9;
    // A run bends the arms and drives them, and each stride goes through the trunk: the shoulders turn against the hips.
    const bent = 0.08 + (0.5 + 0.45 * run) * effort;
    out.elbowL = bent - swing * 0.12; out.elbowR = bent + swing * 0.12;
    out.lean = (0.1 + 0.08 * run) * pace + 0.2 * landing; out.nod = -0.05 * pace - 0.12 * landing;
    out.twist = swing * (0.3 + 0.16 * run);
    plantFeet(out, phase);
    out.footL += 0.45 * landing; out.footR += 0.45 * landing;
  }
  return out;
}

/** Only actual travel advances a stride: blocked movement, rides and a paused view never march. */
export function createPlayerMotion() {
  const target = { ...STANDING }, pose = { ...STANDING };
  let lastX: number | null = null, lastY = 0, lastMode: PlayerState['mode'] = 'free';
  let grounded = true, free = false, phase = 0, landing = 0, impact = 0, idle = 0;
  let speed = 0, lead = 1;
  // The idles: a shuffled bag, so that no two rounds go the same way, and a quiet gap of its own before each.
  const random = seeded(7), bag: IdleAct[] = [];
  let act: IdleAct | null = null, actAt = 0, nextAt = FIRST, stretchedAt = -Infinity, last: IdleAct | null = null;
  let ruffle = 0, blown = 0;
  const acted = { ...STANDING };
  const draw = (): IdleAct => {
    if (bag.length === 0) {
      bag.push('look', 'rock', 'scratch', 'leaf', 'tap');
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!]; }
      if (bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1]!, bag[0]!];
    }
    return last = bag.pop()!;
  };
  return {
    /** The idle playing now, if any. */
    get idling(): IdleAct | null { return act; },
    /** A hand in his hair: −1 to 1 while he scratches his head. */
    get ruffle(): number { return ruffle; },
    /**
     * `wind` is the shared wind where he stands (`windAt`, ./wind.ts): standing in a strong one, he leans into it with
     * an arm up. It never moves the simulation, and with `calm` (reduced motion) he stands quite still.
     */
    update(player: PlayerState, x: number, dt: number, scripted: Pose | null, wave = 0, calm = false, wind = 0): Pose {
      const travel = lastX === null ? 0 : x - lastX, distance = Math.abs(travel), previousMode = lastMode;
      const climb = lastMode === 'climb' && player.mode === 'climb' ? player.y - lastY : 0;
      // Assisted arcs move a kinematic body: its reported velocity stays zero.
      const vy = player.mode === 'fly' && previousMode === 'fly' && dt > 0 ? (player.y - lastY) / dt : player.vy;
      const airborne = player.mode === 'free' || player.mode === 'fly';
      lastX = x; lastY = player.y; lastMode = player.mode;
      if (scripted) {
        grounded = player.grounded; free = false; landing = 0; impact = 0; idle = 0; speed = 0;
        return Object.assign(pose, scripted);
      }
      if (dt <= 0) return pose;
      const walking = player.mode === 'free' && player.grounded;
      const continuous = distance <= Math.max(RUN_SPEED * 2, Math.abs(player.vx) * 1.5) * dt + 0.05;
      const pace = walking && free && continuous ? clamp(distance / (dt * RUN_SPEED)) : 0;
      // Filter measured travel before taking acceleration, so interpolation does not shake the torso.
      const before = speed;
      speed = walking && free && continuous && !player.atEdge ? speed + (travel / dt - speed) * (1 - Math.exp(-16 * dt)) : 0;
      const acceleration = walking && free && continuous && !player.atEdge
        ? Math.max(-1, Math.min(1, (speed - before) * RUN_AFTER / (dt * RUN_SPEED))) : 0;
      const braking = Math.abs(speed) < Math.abs(before) ? Math.abs(acceleration) : 0;
      if (pace > 0) phase += distance * 5.5;
      if (Math.abs(climb) <= CLIMB_SPEED * dt * 3 + 0.05) phase += climb * 7;
      if (!continuous) { phase = 0; landing = 0; impact = 0; speed = 0; Object.assign(pose, STANDING); }
      // A running jump leads with the foot already ahead. Keep that choice through the whole flight.
      if (airborne && !player.grounded && grounded) lead = pose.legL >= pose.legR ? 1 : -1;
      // Stepping off a ride, a hose or the finished clamber is not a fall onto the ground.
      if (walking && !grounded && (previousMode === 'free' || previousMode === 'fly') && impact > 0 && continuous) landing = 0.2 + 0.8 * clamp(impact / JUMP_SPEED);
      else landing *= Math.exp(-12 * dt);
      impact = airborne && !player.grounded ? Math.max(impact, -vy) : 0;
      grounded = player.grounded; free = walking;
      playerPose(player.mode === 'fly' ? { ...player, vy } : player, phase, pace, landing, target);
      if (airborne && !player.grounded && lead < 0) {
        [target.legL, target.legR] = [target.legR, target.legL];
        [target.kneeL, target.kneeR] = [target.kneeR, target.kneeL];
        [target.armL, target.armR] = [target.armR, target.armL];
        [target.elbowL, target.elbowR] = [target.elbowR, target.elbowL];
      }
      if (walking && !player.atEdge) {
        // Lean into a start or a change of direction; plant and soften both knees while stopping.
        const weight = calm ? 0.45 : 1, drive = acceleration * player.facing;
        target.lean += drive * 0.18 * weight; target.nod -= drive * 0.08 * weight;
        target.legL += braking * 0.12; target.legR += braking * 0.12;
        target.kneeL += braking * 0.28; target.kneeR += braking * 0.28;
        target.armL += braking * 0.18 * weight; target.armR += braking * 0.18 * weight;
      }
      idle = walking && pace === 0 && !player.atEdge && wave <= 0 ? idle + dt : 0;
      ruffle = 0;
      if (idle === 0) { act = null; nextAt = FIRST + random() * 1.2; stretchedAt = -Infinity; }
      blown = calm ? 0 : blown + (wind - blown) * -Math.expm1(-dt / .35);
      if (!calm && idle > 0.4) {
        const breath = Math.sin(idle * 1.8) * smooth((idle - 0.4) / 0.8);
        target.lean += breath * 0.015; target.nod += breath * 0.025;
        target.turn = Math.sin(idle * 0.65) * smooth((idle - 2) / 2) * 0.06;
        // A strong wind where he stands: he leans into it, braced, with the nearer arm up before his face (or on his
        // hair, with the wind at his back). It pauses the little idles while it blows. A gust blows to the left, against
        // the way he goes (./wind.ts); the breaths that pass to the right lay the grass over, and it takes a storm's
        // for him to brace against one.
        const windy = smooth(blown < 0 ? (-blown - 1.7) / 1.1 : (blown - 3.4) / 1) * smooth((idle - .25) / .3);
        if (act && idle - actAt >= IDLES[act]) { act = null; nextAt = idle + 1.6 + random() * 2.6; }
        if (!act && idle >= nextAt && windy < .05) {
          act = idle >= STRETCH && idle - stretchedAt > 30 ? 'stretch' : draw();
          if (act === 'stretch') stretchedAt = idle;
          actAt = idle;
        }
        const near = player.facing > 0 ? 1 : -1;
        if (act) {
          const rub = idlePose(act, idle - actAt, near, Object.assign(acted, target)), k = 1 - windy;
          for (const joint of JOINTS) target[joint] += (acted[joint] - target[joint]) * k;
          ruffle = rub * k;
        }
        if (windy > 0) {
          const into = -Math.sign(blown) * player.facing > 0, arm = near > 0 ? 'armR' : 'armL', elbow = near > 0 ? 'elbowR' : 'elbowL';
          target.lean += (into ? .17 : -.07) * windy; target.nod += (into ? .14 : -.05) * windy;
          // The forearm folds ahead of the upper arm, so the hand comes up by his face rather than reaching out.
          target[arm] += ((into ? 2.25 : 2.6) - target[arm]) * windy; target[elbow] += ((into ? 1.9 : 2.05) - target[elbow]) * smooth(windy * 1.6);
          const { hip, knee } = onToe(-.07 * windy);
          target.legL += hip; target.legR += hip; target.kneeL += knee; target.kneeR += knee;
        }
      }
      if (wave > 0 && walking) {
        target.armR = 2; target.elbowR = 0.7 + (calm ? 0 : Math.sin(wave * 22) * 0.3);
      }
      blendPose(pose, target, 1 - Math.exp(-18 * dt), pose);
      // A story's explicit seat ends with its act; locomotion is supported by the actual posed soles.
      pose.seat = null;
      return pose;
    },
  };
}

/** Public rehearsal figure: the same face, hair, colours and backpack, with two joints in each limb. */
export function createPlayerStandIn() {
  const group = new Group(), figure = new Group(), body = new Group();
  figure.name = 'player-figure';
  body.position.y = 0.4;
  group.add(figure); figure.add(body);
  const material = (color: string) => new MeshStandardMaterial({ color, roughness: 0.9 });
  const shirt = material('#9db9e3'), jeans = material('#2f4b7c'), boot = material('#6b4a2e');
  const skin = material('#f2cba8'), hair = material('#ecc967');
  const leg = (z: number) => {
    const hip = new Group(), knee = new Group();
    hip.position.set(0, 0.4, z); knee.position.y = -0.19;
    const thigh = new Mesh(new BoxGeometry(0.12, 0.17, 0.12), jeans); thigh.position.y = -0.105;
    const shin = new Mesh(new BoxGeometry(0.12, 0.15, 0.12), jeans); shin.position.y = -0.085;
    const foot = new Mesh(new BoxGeometry(0.2, 0.09, 0.13), boot); foot.position.set(0.035, -0.165, 0);
    knee.add(shin, foot); hip.add(thigh, knee); figure.add(hip);
    return { hip, knee };
  };
  const legs = [leg(-0.075), leg(0.075)];
  const torso = new Mesh(new CapsuleGeometry(0.15, 0.16, 6, 14), shirt); torso.position.y = 0.14;
  const head = new Mesh(new SphereGeometry(0.19, 20, 14), skin); head.position.y = 0.41;
  head.name = 'player-head';
  const hairTop = new Mesh(new SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairTop.position.set(-0.012, 0.43, 0);
  const fringe = new Mesh(new ConeGeometry(0.075, 0.18, 8), hair); fringe.position.set(0.13, 0.585, 0); fringe.rotation.z = -0.85;
  const backpack = new Mesh(new BoxGeometry(0.13, 0.24, 0.22), material('#6f6a40')); backpack.position.set(-0.19, 0.16, 0);
  const neck = new Group(); neck.position.y = 0.3;
  for (const part of [head, hairTop, fringe]) { part.position.y -= 0.3; neck.add(part); }
  // The fringe bends about its root on the brow; the hair's crown turns a little with it.
  const sway = createSway(), root = new Vector3(0.13 - 0.09 * Math.sin(0.85), 0.285 - 0.09 * Math.cos(0.85), 0);
  body.add(torso, neck, backpack);
  const arm = (z: number) => {
    const shoulder = new Group(), elbow = new Group();
    shoulder.position.set(0.02, 0.245, z); elbow.position.y = -0.145;
    const upper = new Mesh(new CapsuleGeometry(0.045, 0.055, 4, 8), shirt); upper.position.y = -0.0725;
    const lower = new Mesh(new CapsuleGeometry(0.045, 0.055, 4, 8), shirt); lower.position.y = -0.0725;
    elbow.add(lower); shoulder.add(upper, elbow); body.add(shoulder);
    return { shoulder, elbow };
  };
  const arms = [arm(-0.19), arm(0.19)];
  const handTip = new Vector3(0, -.145, 0);
  const contacts = arms.map(arm => createArmContact(arm.shoulder, arm.elbow, handTip));
  for (const [i, side] of ['left', 'right'].entries()) {
    legs[i]!.hip.name = `player-hip-${side}`; legs[i]!.knee.name = `player-knee-${side}`;
    legs[i]!.knee.children[1]!.name = `player-boot-${side}`;
    arms[i]!.shoulder.name = `player-shoulder-${side}`; arms[i]!.elbow.name = `player-elbow-${side}`;
  }
  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      const materials = new Set<MeshStandardMaterial>();
      figure.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        materials.add(object.material as MeshStandardMaterial);
      });
      materials.forEach(material => material.dispose());
    },
    hand(side: 0 | 1, out: Vector3) { return arms[side]!.elbow.localToWorld(out.copy(handTip)); },
    mouth(out: Vector3) { return neck.localToWorld(out.set(.17, .1, 0)); },
    /** The wind in his hair (`windAt` where he stands), and a hand in it: secondary motion, never the simulation. */
    breeze(wind: number, dt: number, still: boolean, ruffle = 0) {
      // Paused (no time passing), the hair holds exactly as it is.
      if (dt <= 0) return;
      const angle = sway.step(wind, dt, still), e = neck.matrixWorld.elements;
      // His front is +x: a wind from behind lays the fringe forward, one in his face lifts it.
      const ahead = e[0]! / (Math.hypot(e[0]!, e[1]!, e[2]!) || 1), turn = still ? 0 : -ahead * angle * 1.3 + ruffle * .22;
      fringe.rotation.z = -0.85 + turn;
      fringe.position.set(root.x + 0.09 * Math.sin(0.85 - turn), root.y + 0.09 * Math.cos(0.85 - turn), 0);
      hairTop.rotation.z = still ? 0 : -ahead * angle * .35 + ruffle * .06;
    },
    reach(side: 0 | 1, target: Vector3, weight = 1) { contacts[side]!(target, weight); },
    pose(p: Pose) {
      body.rotation.z = -p.lean;
      neck.rotation.z = -p.nod;
      neck.rotation.y = p.turn;
      let lowest = Infinity;
      for (const [i, hipAngle, kneeAngle, armAngle, elbowAngle] of [
        [0, p.legL, p.kneeL, p.armL, p.elbowL], [1, p.legR, p.kneeR, p.armR, p.elbowR],
      ] as const) {
        legs[i]!.hip.rotation.z = hipAngle; legs[i]!.knee.rotation.z = -kneeAngle;
        arms[i]!.shoulder.rotation.set((i === 0 ? 1 : -1) * p.spread, 0, armAngle);
        arms[i]!.elbow.rotation.set(0, 0, elbowAngle);
        const angle = hipAngle - kneeAngle;
        // The full boot's four sole corners, not just its ankle; a turned toe never enters the floor.
        lowest = Math.min(lowest, 0.4 - 0.19 * Math.cos(hipAngle) + 0.035 * Math.sin(angle) - 0.165 * Math.cos(angle)
          - 0.1 * Math.abs(Math.sin(angle)) - 0.045 * Math.abs(Math.cos(angle)));
      }
      figure.position.y = (p.seat === null ? -lowest : p.seat / 5.2 - 0.4) + p.bounce / 5.2;
    },
  };
}
