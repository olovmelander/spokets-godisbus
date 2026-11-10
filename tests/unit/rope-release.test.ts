import { Group, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { actPose } from '../../src/render/acting';
import type { CarryingRig } from '../../src/render/carrying';
import { createNorrskenRescue, rescueCarryPose } from '../../src/render/norrsken-rescue';
import { createPlayerStandIn } from '../../src/render/player-motion';
import { STANDING } from '../../src/render/rig';

const carrying = () => new Set(['lower', 'placed:tragubbe', 'scene:uppdragen']);

describe('giving the rope hand to the taste scene', () => {
  it.each([30, 60, 120])('releases the carrying shoulder and last real grip continuously at %s Hz', rate => {
    const rig = createPlayerStandIn(), body = new Group(), carving = new Group(), rescue = createNorrskenRescue();
    body.add(rig.group); body.position.set(26.84, 0, 0); body.rotation.y = -.35; carving.position.x = 25.7;
    const flags = carrying();
    const frame = (seconds: number, dt: number) => {
      const weight = rescue.weight(flags, seconds);
      const pose = seconds < 0 ? { ...STANDING } : actPose('hands', { t: seconds, aim: null, stride: 0, pace: 0, calm: false }, { ...STANDING });
      rescueCarryPose(pose, weight); rig.pose(pose);
      rescue.update(rig, body, carving, flags, 1, false, seconds, dt, false, 0, false, weight);
      return rig.hand(1, new Vector3());
    };
    for (let i = 0; i < rate; i++) frame(-1, 1 / rate);
    let previous = frame(-1, 0);
    flags.add('taste');
    // Its story placement may settle immediately; the releasing hand must retain its last socket and axis.
    carving.position.set(26.05, 0, .2); carving.rotation.z = 0;
    for (let i = 0; i <= rate; i++) {
      const time = i / rate, hand = frame(time, 1 / rate);
      expect(hand.distanceTo(previous)).toBeLessThan(1.5 / rate);
      expect(rescue.group.visible).toBe(false);
      expect(carving.position.toArray()).toEqual([26.05, 0, .2]);
      expect(carving.rotation.z).toBe(0);
      if (i === Math.round(rate / 5)) {
        for (let held = 0; held < 30; held++) expect(frame(time, 1 / rate).distanceTo(hand)).toBeLessThan(1e-8);
        for (let paused = 0; paused < 30; paused++) expect(frame(time, 0).distanceTo(hand)).toBeLessThan(1e-8);
      }
      previous = hand;
    }
    const free = actPose('hands', { t: 1, aim: null, stride: 0, pace: 0, calm: false }, { ...STANDING });
    rig.pose(free);
    expect(rig.hand(1, new Vector3()).distanceTo(previous)).toBeLessThan(1e-8);
    expect(rescue.weight(flags, .1)).toBe(0); // A completed/revisited scene never revives a discarded grip.
  });

  it('releases the actual clamped socket and its axis in the growing boy’s frame', () => {
    const body = new Group(), carving = new Group(), rescue = createNorrskenRescue(), flags = carrying();
    body.position.set(26.84, 0, 0); body.rotation.y = -.35; carving.position.x = 25.7;
    const actual = new Vector3(), actualAxis = new Vector3(0, -.2, 1).normalize();
    let taking = true, targetOnRelease = new Vector3(), axisOnRelease = new Vector3(), releasedWeight = 0;
    const rig: CarryingRig = {
      hand: (_side, out) => out.copy(actual), reach: () => {},
      grasp: (_side, _grip, target, axis, out, weight = 1, axisOut) => {
        if (taking) { actual.copy(target).add(new Vector3(.04, -.03, .02)); axisOut?.copy(actualAxis); }
        else { targetOnRelease.copy(target); axisOnRelease.copy(axis); releasedWeight = weight; }
        return out.copy(actual);
      },
    };
    rescue.update(rig, body, carving, flags, 1, false, 0, 1 / 60, false);
    const local = body.worldToLocal(actual.clone());
    const localAxis = actualAxis.clone().applyAxisAngle(new Vector3(0, 1, 0), .35);
    flags.add('taste'); taking = false; body.scale.setScalar(1.4); body.rotation.y = -.5;
    carving.position.set(26.05, 0, .2);
    const weight = rescue.weight(flags, .225);
    rescue.update(rig, body, carving, flags, 1, false, 1, 1 / 60, false, 0, false, weight);
    expect(releasedWeight).toBeCloseTo(.5, 8);
    expect(targetOnRelease.distanceTo(body.localToWorld(local))).toBeLessThan(1e-8);
    expect(axisOnRelease.distanceTo(localAxis.transformDirection(body.matrixWorld))).toBeLessThan(1e-8);
  });

  it('does not invent a prior rope grip on restore or retain it with reduced motion', () => {
    const rig = createPlayerStandIn(), body = new Group(), carving = new Group(), rescue = createNorrskenRescue();
    body.add(rig.group); body.position.x = 26.8; carving.position.x = 25.7;
    const flags = carrying(); flags.add('taste');
    expect(rescue.weight(flags, .1)).toBe(0);
    const reach = vi.spyOn(rig, 'reach');
    rescue.update(rig, body, carving, flags, 1, false, 0, 0, false, 0, false, rescue.weight(flags, .1));
    expect(reach).not.toHaveBeenCalled();
    flags.delete('taste'); rig.pose(STANDING);
    rescue.update(rig, body, carving, flags, 1, false, 0, 1 / 60, false);
    flags.add('taste');
    expect(rescue.weight(flags, .1, true)).toBe(0);
    flags.add('home'); expect(rescue.weight(flags, .1)).toBe(0);
  });
});
