import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Act } from '../../src/sim/scene';
import { actPose, type Stance } from '../../src/render/acting';
import { createRehearsalRig, STANDING } from '../../src/render/rig';

const context = (t: number, ahead = 1.4, up = 3.55, calm = false) => ({ t, aim: { ahead, up }, stride: 0, pace: 0, calm });

describe('story interaction acting', () => {
  it('reaches the authored contact on time and keeps both hands steady afterwards', () => {
    const contacts: [Act, Stance, number, number, number][] = [
      ['offer', 'stand', 1.2, 3.6, .5], ['offer', 'sit', 1.4, 2.3, .5],
      ['reach', 'stand', 1.8, 2.4, .5], ['reach', 'kneel', 1.4, .6, .5],
      ['lift', 'stand', 1.4, 3.55, 1.1], ['lift', 'kneel', 1.2, 2.3, 1.1],
    ];
    for (const who of ['pappa', 'moa', 'bertil'] as const) {
      const rig = createRehearsalRig(who), unit = 5.2 / rig.height;
      for (const [act, stance, ahead, up, arrives] of contacts) {
        const pose = actPose(act, context(arrives, ahead, up), { ...STANDING }, stance);
        rig.pose(pose);
        const right = rig.hand(1, new Vector3()).multiplyScalar(unit);
        expect(Math.hypot(right.z - ahead, right.y - up), `${who} ${act} ${stance}`).toBeLessThan(.35);
        if (act !== 'offer') {
          const left = rig.hand(0, new Vector3()).multiplyScalar(unit);
          expect(Math.hypot(left.z - (ahead - .15), left.y - (up - .1)), `${who} supporting ${act} ${stance}`).toBeLessThan(.35);
        }
        expect(actPose(act, context(8, ahead, up), { ...STANDING }, stance)).toEqual(pose);
        expect(pose.bounce).toBe(0);
      }
    }
  });

  it('offers above the lap and lifts upward before extending, with continuous hand paths', () => {
    const rig = createRehearsalRig('pappa');
    for (const act of ['offer', 'reach', 'lift'] as const) {
      const seconds = act === 'lift' ? 1.1 : .5;
      const handAt = (t: number) => {
        rig.pose(actPose(act, context(t), { ...STANDING }));
        return rig.hand(1, new Vector3());
      };
      const from = handAt(0), to = handAt(seconds), middle = handAt(seconds / 2);
      if (act !== 'reach') expect(middle.y).toBeGreaterThan((from.y + to.y) / 2 + .15);
      let previous = from;
      for (let frame = 1; frame <= Math.round(seconds * 120); frame++) {
        const hand = handAt(frame / 120);
        expect(hand.distanceTo(previous), `${act} frame ${frame}`).toBeLessThan(.12);
        previous = hand;
      }
    }
  });

  it('bends the knees for a low standing reach and preserves authored sitting and kneeling contact', () => {
    const low = actPose('reach', context(.5, 1.8, 2.4), { ...STANDING });
    const high = actPose('reach', context(.5, 1.4, 3.55), { ...STANDING });
    expect(low.kneeL).toBeGreaterThan(high.kneeL + .15);
    expect(low.kneeL).toBe(low.kneeR);
    expect(low.seat).toBeNull(); expect(low.bounce).toBe(0);
    for (const stance of ['sit', 'kneel', 'crouch'] as const) {
      const base = actPose(stance, context(3), { ...STANDING });
      for (const act of ['offer', 'reach', 'lift'] as const) {
        const pose = actPose(act, context(3, 1.2, .8), { ...STANDING }, stance);
        for (const joint of ['seat', 'legL', 'legR', 'kneeL', 'kneeR'] as const) expect(pose[joint]).toBe(base[joint]);
      }
    }
  });

  it('holds readable actions in reduced motion, while walking still follows real travel without bobbing', () => {
    const acts: Act[] = ['stand', 'watch', 'look', 'sit', 'carve', 'draw', 'sip', 'sneak', 'kneel', 'crouch', 'gasp',
      'point', 'wave', 'cheer', 'offer', 'reach', 'lift', 'show', 'blow', 'shrug', 'hug', 'nod', 'startle', 'stomp', 'hands', 'paint'];
    for (const act of acts) {
      const held = actPose(act, context(0, 1.4, 3.55, true), { ...STANDING });
      for (const t of [.08, .25, .65, 2, 100]) expect(actPose(act, context(t, 1.4, 3.55, true), { ...STANDING }), act).toEqual(held);
      expect(held.bounce, act).toBe(0);
    }
    const walking = actPose('walk', { ...context(0, 1.4, 3.55, true), stride: .5, pace: 1 }, { ...STANDING });
    expect(Math.abs(walking.legL)).toBeGreaterThan(.2); expect(walking.bounce).toBe(0);
  });

  it('settles a cheer without dropping the body abruptly and keeps a shrug planted', () => {
    const last = actPose('cheer', context(1.6 - .0001), { ...STANDING });
    const settled = actPose('cheer', context(1.6), { ...STANDING });
    expect(Math.abs(last.bounce - settled.bounce)).toBeLessThan(1e-6);
    expect(settled.bounce).toBe(0);
    for (let frame = 0; frame <= 60; frame++) expect(actPose('shrug', context(frame / 60), { ...STANDING }).bounce).toBe(0);
    expect(actPose('shrug', context(.9), { ...STANDING })).toEqual(actPose('shrug', context(2), { ...STANDING }));
  });
});
