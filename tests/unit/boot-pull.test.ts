import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { NO_EDGES } from '../../src/input/press-queue';
import { createBootPull } from '../../src/render/boot-pull';
import { createFamilyMotion } from '../../src/render/family-motion';
import { createRehearsalRig } from '../../src/render/rig';

describe('Bertil releases his boot', () => {
  it.each([30, 60, 120])('lets the straight working arm fold smoothly at the actual readiness event at %i Hz', hz => {
    const dt = 1 / hz;
    const game = new Game({ ...stormgard, spawn: { x: 104.175, y: .01 } }, {}, { flags: ['scene:card', 'beat:sg:bertil-here'] });
    const rig = createRehearsalRig('bertil'), motion = createFamilyMotion('bertil', 104.6, 'sg:bertil'), pull = createBootPull();
    rig.group.position.set(104.6, 0, -.9);
    const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3(), target = new Vector3();
    let clock = 0, joy = 0, called = false, readyFrames = 0, largestAngle = 0, largestStep = 0;
    let previousDirection: Vector3 | null = null, previousHand: Vector3 | null = null;
    for (let f = 0; f < hz * 3; f++) {
      game.frame(dt, { x: 0, hopHeld: false, talking: false }, f === Math.round(hz * .5) ? { ...NO_EDGES, act: true } : NO_EDGES);
      const now = game.sim.flags.has('sg:bertil'), ready = game.sim.flags.has('sg:boot-ready');
      if (now && !called) joy = 1.8;
      called = now; joy = Math.max(0, joy - dt); clock += dt;
      const pose = motion.update(dt, clock, joy, 0, null, false, { ahead: .425 * 5.2 / rig.height, up: .8 * 5.2 / rig.height }, undefined, rig.legs);
      const weight = pull(now && !ready, dt, false), tug = Math.sin(clock * 9) * .08;
      for (const [joint, value] of [['lean', .55 + tug], ['legR', .95], ['kneeR', 1.35 + tug], ['kneeL', Math.max(pose.kneeL, .25)]] as const) {
        pose[joint] += (value - pose[joint]) * weight;
      }
      rig.pose(pose);
      target.set(-.33, 1.05, .55).multiplyScalar(rig.height / 5.2).applyMatrix4(rig.group.matrixWorld);
      if (weight > .001) { rig.reach(0, target, weight); rig.reach(1, target, weight); }
      rig.arm!(1, shoulder, elbow, wrist);
      const direction = wrist.clone().sub(elbow).normalize();
      if (ready && previousDirection && previousHand) {
        readyFrames++;
        largestAngle = Math.max(largestAngle, direction.angleTo(previousDirection));
        largestStep = Math.max(largestStep, wrist.distanceTo(previousHand));
      }
      previousDirection = direction; previousHand = wrist.clone();
    }
    expect(called).toBe(true); expect(readyFrames).toBeGreaterThan(hz / 2);
    // Frame-rate-scaled bounds catch the original first-release fold while allowing its continuous return.
    expect(largestAngle).toBeLessThan(.24 * 60 / hz);
    expect(largestStep).toBeLessThan(.13 * 60 / hz);
  });

  it('holds the exact contact while event time is held, and uses completed poses with reduced motion', () => {
    const pull = createBootPull();
    for (let i = 0; i < 60; i++) pull(true, 1 / 60, false);
    expect(pull(true, 0, false)).toBe(1);
    const releasing = pull(false, 1 / 60, false);
    for (let i = 0; i < 120; i++) expect(pull(false, 0, false)).toBe(releasing);
    expect(pull(false, 1 / 60, false)).toBeLessThan(releasing);
    expect(pull(true, 0, true)).toBe(1);
    expect(pull(false, 0, true)).toBe(0);
  });
});
