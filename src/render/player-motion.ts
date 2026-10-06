import { BoxGeometry, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { JUMP_SPEED, RUN_SPEED } from '../sim/constants';
import type { PlayerState } from '../sim/types';
import { blendPose, STANDING, type Pose } from './rig';

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** One pose language for the rounded public figure and the approved model's named bones. */
export function playerPose(player: Pick<PlayerState, 'mode' | 'grounded' | 'vy'>, phase: number, pace: number, landing: number, out: Pose): Pose {
  Object.assign(out, STANDING);
  if (player.mode === 'climb' || player.mode === 'slide' || player.mode === 'ledge') {
    out.armL = 2.65; out.armR = 2.35; out.elbowL = out.elbowR = 0.35;
    out.legL = 0.65; out.legR = 0.25; out.kneeL = 0.9; out.kneeR = 0.55;
  } else if (player.mode === 'swing') {
    out.armL = out.armR = 2.9; out.elbowL = out.elbowR = 0.15;
    out.legL = out.legR = 0.2; out.kneeL = out.kneeR = 0.45;
  } else if (player.mode === 'ride') {
    out.legL = out.legR = 1.25; out.kneeL = out.kneeR = 1.3;
    out.armL = out.armR = 0.3; out.elbowL = out.elbowR = 0.6;
  } else if (player.mode === 'down' || player.mode === 'bubble') {
    out.armL = out.armR = 0.45; out.elbowL = out.elbowR = 0.9;
    out.legL = out.legR = 0.4; out.kneeL = out.kneeR = 0.8;
  } else if (!player.grounded) {
    const rise = clamp(player.vy / JUMP_SPEED), fall = clamp(-player.vy / JUMP_SPEED);
    out.legL = 0.4 + 0.35 * rise - 0.25 * fall; out.legR = 0.15 - 0.4 * rise + 0.05 * fall;
    out.kneeL = 0.45 + 0.45 * rise - 0.3 * fall; out.kneeR = 0.3 + 0.2 * rise - 0.15 * fall;
    out.armL = 0.65 + 0.5 * rise + 0.15 * fall; out.armR = 0.8 + 0.5 * rise + 0.25 * fall;
    out.elbowL = out.elbowR = 0.25 + 0.35 * rise;
    out.lean = 0.08 * rise - 0.04 * fall;
  } else {
    const reach = 0.7 * pace, swing = Math.sin(phase) * reach;
    out.legL = swing + 0.45 * landing; out.legR = -swing + 0.45 * landing;
    out.kneeL = Math.max(0, Math.cos(phase)) * reach * 1.25 + 0.9 * landing;
    out.kneeR = Math.max(0, -Math.cos(phase)) * reach * 1.25 + 0.9 * landing;
    out.armL = -swing * 0.9; out.armR = swing * 0.9;
    out.elbowL = out.elbowR = 0.08 + 0.6 * pace;
    out.lean = 0.1 * pace + 0.2 * landing; out.nod = -0.05 * pace;
  }
  return out;
}

/** Only actual travel advances a stride: blocked movement, rides and a paused view never march. */
export function createPlayerMotion() {
  const target = { ...STANDING }, pose = { ...STANDING };
  let lastX: number | null = null, grounded = true, free = false, phase = 0, landing = 0;
  return {
    update(player: PlayerState, x: number, dt: number, scripted: Pose | null, wave = 0, calm = false): Pose {
      const distance = lastX === null ? 0 : Math.abs(x - lastX);
      lastX = x;
      if (scripted) {
        grounded = player.grounded; free = false; landing = 0;
        return Object.assign(pose, scripted);
      }
      if (dt <= 0) return pose;
      const walking = player.mode === 'free' && player.grounded;
      const continuous = distance <= RUN_SPEED * dt * 2 + 0.05;
      const pace = walking && free && continuous ? clamp(distance / (dt * RUN_SPEED)) : 0;
      if (pace > 0) phase += distance * 5.5;
      if (!continuous) { phase = 0; landing = 0; Object.assign(pose, STANDING); }
      if (walking && !grounded && continuous) landing = 1;
      else landing = Math.max(0, landing - dt * 5);
      grounded = player.grounded; free = walking;
      playerPose(player, phase, pace, landing, target);
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
  const hairTop = new Mesh(new SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairTop.position.set(-0.012, 0.43, 0);
  const fringe = new Mesh(new ConeGeometry(0.075, 0.18, 8), hair); fringe.position.set(0.13, 0.585, 0); fringe.rotation.z = -0.85;
  const backpack = new Mesh(new BoxGeometry(0.13, 0.24, 0.22), material('#6f6a40')); backpack.position.set(-0.19, 0.16, 0);
  const neck = new Group(); neck.position.y = 0.3;
  for (const part of [head, hairTop, fringe]) { part.position.y -= 0.3; neck.add(part); }
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
  for (const [i, side] of ['left', 'right'].entries()) {
    legs[i]!.hip.name = `player-hip-${side}`; legs[i]!.knee.name = `player-knee-${side}`;
    legs[i]!.knee.children[1]!.name = `player-boot-${side}`;
    arms[i]!.shoulder.name = `player-shoulder-${side}`; arms[i]!.elbow.name = `player-elbow-${side}`;
  }
  return {
    group,
    pose(p: Pose) {
      body.rotation.z = -p.lean;
      neck.rotation.z = -p.nod;
      neck.rotation.y = p.turn;
      let lowest = Infinity;
      for (const [i, hipAngle, kneeAngle, armAngle, elbowAngle] of [
        [0, p.legL, p.kneeL, p.armL, p.elbowL], [1, p.legR, p.kneeR, p.armR, p.elbowR],
      ] as const) {
        legs[i]!.hip.rotation.z = hipAngle; legs[i]!.knee.rotation.z = -kneeAngle;
        arms[i]!.shoulder.rotation.z = armAngle; arms[i]!.elbow.rotation.z = elbowAngle;
        arms[i]!.shoulder.rotation.x = (i === 0 ? 1 : -1) * p.spread;
        const angle = hipAngle - kneeAngle;
        // The full boot's four sole corners, not just its ankle; a turned toe never enters the floor.
        lowest = Math.min(lowest, 0.4 - 0.19 * Math.cos(hipAngle) + 0.035 * Math.sin(angle) - 0.165 * Math.cos(angle)
          - 0.1 * Math.abs(Math.sin(angle)) - 0.045 * Math.abs(Math.cos(angle)));
      }
      figure.position.y = (p.seat === null ? -lowest : p.seat / 5.2 - 0.4) + p.bounce / 5.2;
    },
  };
}
