import { Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { JUMP_SPEED, RUN_SPEED } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, PlayerState, StepInput } from '../../src/sim/types';
import { createFollower, createPlayerMotion, createPlayerStandIn, createTurning } from '../../src/render/player-motion';
import { JOINTS, STANDING, type Pose } from '../../src/render/rig';

const FLAT: ChapterData = { id: 'elof-jumps', spawn: { x: 0, y: 0.01 }, goalX: 100, candy: [],
  ground: [{ x: -20, y: 10 }, { x: -20, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 10 }] };
const still: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };

/** A real jump from the game's simulation, at 60 frames a second: his state, and the pose drawn, each frame. */
function play(script: (frame: number) => Partial<StepInput>, frames: number) {
  const sim = new Sim(FLAT), motion = createPlayerMotion(), out: { state: PlayerState; pose: Pose }[] = [];
  for (let frame = 0; frame < frames; frame++) {
    for (let step = 0; step < 2; step++) sim.step({ ...still, ...script(frame) });
    out.push({ state: { ...sim.curr }, pose: { ...motion.update(sim.curr, sim.curr.x, 1 / 60, null) } });
  }
  return out;
}
/** The hardest acceleration of any joint between two frames, in radians a second squared. */
const hardest = (poses: Pose[]) => {
  let most = 0;
  for (let i = 2; i < poses.length; i++) for (const joint of JOINTS) {
    most = Math.max(most, Math.abs(poses[i]![joint] - 2 * poses[i - 1]![joint] + poses[i - 2]![joint]) * 3600);
  }
  return most;
};

describe('Elof’s jumps and landings', () => {
  const jump = play((frame) => ({ hop: frame === 30, hopHeld: frame >= 30 && frame < 60 }), 140);
  const off = jump.findIndex((f) => !f.state.grounded), down = jump.findIndex((f, i) => i > off && f.state.grounded);

  it('dips and pushes off before he rises, the feet on the ground through the push', () => {
    expect(off).toBeGreaterThan(29);
    // Down into the knees in the first frames, drawn with his feet on the ground while the game has him rising.
    const dip = jump.slice(off, off + 5);
    expect(Math.max(...dip.map((f) => f.pose.kneeL))).toBeGreaterThan(0.3);
    expect(dip[0]!.pose.bounce).toBeLessThan(0);
    // Then up onto the toes: the feet point down as the legs straighten.
    const push = jump.slice(off + 4, off + 11);
    expect(Math.min(...push.map((f) => f.pose.footL))).toBeLessThan(-0.2);
    // And out of the push by the time it is over: the body goes up with the game's.
    expect(jump[off + 13]!.pose.bounce).toBeCloseTo(0, 9);
  });

  it('tucks at the top, opens to reach for the ground, and lands with the soles flat', () => {
    const top = jump.reduce((best, f, i) => (i > off && i < down && Math.abs(f.state.vy) < Math.abs(best.state.vy) ? f : best), jump[off + 1]!);
    expect(Math.max(top.pose.kneeL, top.pose.kneeR)).toBeGreaterThan(0.9);
    expect(top.pose.spread).toBeGreaterThan(0.3);
    const falling = jump[down - 1]!.pose;
    expect(falling.kneeL).toBeLessThan(top.pose.kneeL - 0.4);
    // A sole flat: the foot turned back by as much as the shin is tipped.
    expect(falling.footL).toBeCloseTo(falling.kneeL - falling.legL, 1);
  });

  it('gives through the knees first and the trunk a moment later, and never snaps from one to the next', () => {
    const after = jump.slice(down, down + 40);
    const knee = after.map((f) => f.pose.kneeL), lean = after.map((f) => f.pose.lean);
    const kneeAt = knee.indexOf(Math.max(...knee)), leanAt = lean.indexOf(Math.max(...lean));
    expect(Math.max(...knee)).toBeGreaterThan(0.6);
    expect(leanAt).toBeGreaterThan(kneeAt);
    // Before, take-off and landing switched pose at full speed: 1,200 rad/s² in one frame.
    expect(hardest(jump.map((f) => f.pose))).toBeLessThan(1000);
  });

  it('keeps his feet where they come down', () => {
    const body = createPlayerStandIn(), at = new Vector3();
    const soles = () => {
      body.group.updateWorldMatrix(true, true);
      return ['left', 'right'].map((side) => {
        const boot = body.group.getObjectByName(`player-boot-${side}`) as Mesh, corners = boot.geometry.getAttribute('position');
        let low = Infinity, x = 0;
        for (let i = 0; i < corners.count; i++) {
          at.fromBufferAttribute(corners, i); boot.localToWorld(at);
          if (at.y < low - 1e-6) { low = at.y; x = at.x; }
        }
        return x;
      });
    };
    body.pose(jump[down]!.pose);
    const landed = soles();
    let most = 0;
    for (const f of jump.slice(down, down + 30)) {
      body.pose(f.pose);
      const now = soles();
      most = Math.max(most, Math.abs(now[0]! - landed[0]!), Math.abs(now[1]! - landed[1]!));
    }
    expect(most).toBeLessThan(0.03);
  });

  it('lands a running jump on its leading foot, which goes on as the stride’s', () => {
    const run = play((frame) => ({ x: 1, hop: frame === 50, hopHeld: frame >= 50 && frame < 80 }), 130);
    const leave = run.findIndex((f) => !f.state.grounded), land = run.findIndex((f, i) => i > leave && f.state.grounded);
    const lead = run[leave]!.pose.legL >= run[leave]!.pose.legR ? 'legL' : 'legR', trail = lead === 'legL' ? 'legR' : 'legL';
    // Coming down the leading leg is ahead, and the stride carries it back under him from there.
    expect(run[land - 1]!.pose[lead]).toBeGreaterThan(run[land - 1]!.pose[trail]);
    expect(run[land + 6]!.pose[lead]).toBeLessThan(run[land]!.pose[lead]);
    expect(Math.abs(run[land]!.state.vx)).toBeCloseTo(RUN_SPEED, 0);
  });
});

describe('Elof turning about', () => {
  it('gathers speed and comes to rest facing the other way, the short way round', () => {
    const turning = createTurning(-0.35);
    const angles = [-0.35];
    for (let frame = 0; frame < 40; frame++) angles.push(turning.update(Math.PI + 0.35, 1 / 60));
    const speeds = angles.slice(1).map((a, i) => (a - angles[i]!) * 60);
    // It sets off from rest (it set off at 30 rad/s, 1,800 rad/s² in its first frame), turns the short way (through facing
    // the camera), and is round in about a quarter of a second.
    expect(Math.abs(speeds[0]!)).toBeLessThan(2);
    expect(Math.max(...speeds.map(Math.abs))).toBeLessThan(20);
    expect(Math.min(...angles)).toBeLessThan(-Math.PI / 2);
    expect(Math.abs(angles[18]! - (-Math.PI + 0.35))).toBeLessThan(0.1);
    const accelerations = speeds.slice(1).map((v, i) => Math.abs(v - speeds[i]!) * 60);
    expect(Math.max(...accelerations)).toBeLessThan(400);
  });

  it('plants and leans into the new way while still sliding the old way, and does not stride backwards', () => {
    const turn = play((frame) => ({ x: frame < 60 ? 1 : -1 }), 80);
    const skid = turn.findIndex((f, i) => i > 60 && f.state.facing < 0 && f.state.vx > 0.2);
    expect(skid).toBeGreaterThan(0);
    const sliding = turn.slice(skid, turn.findIndex((f, i) => i > skid && f.state.vx < 0));
    expect(Math.max(...sliding.map((f) => f.pose.lean))).toBeGreaterThan(0.2);
    // The knees bend to take the stop.
    expect(Math.max(...sliding.map((f) => Math.min(f.pose.kneeL, f.pose.kneeR)))).toBeGreaterThan(0.1);
  });
});

describe('the follower', () => {
  it('follows smooth motion exactly, and takes a jump up from where the body was at the speed it had', () => {
    const follower = createFollower(), out = { ...STANDING };
    for (let i = 0; i < 10; i++) follower.follow({ ...STANDING, armL: i * 0.05 }, 1 / 60, out);
    expect(out.armL).toBeCloseTo(0.45, 9);
    // A jump to 2.5: the arm goes on at its 3 rad/s that frame, and gets there with no step in its speed.
    follower.follow({ ...STANDING, armL: 2.5 }, 1 / 60, out, true);
    expect(out.armL).toBeCloseTo(0.5, 9);
    let last = 0.5, speed = 3;
    for (let i = 0; i < 60; i++) {
      follower.follow({ ...STANDING, armL: 2.5 }, 1 / 60, out);
      const now = (out.armL - last) * 60;
      expect(Math.abs(now - speed)).toBeLessThan(10);
      speed = now; last = out.armL;
    }
    expect(out.armL).toBeCloseTo(2.5, 4);
    expect(JUMP_SPEED).toBeGreaterThan(0);
  });
});
