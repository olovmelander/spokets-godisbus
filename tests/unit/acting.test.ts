import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Act } from '../../src/sim/scene';
import { actPose, drawingAt, sippingAt, type Stance } from '../../src/render/acting';
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
      'point', 'wave', 'cheer', 'offer', 'reach', 'lift', 'show', 'eat', 'blow', 'shrug', 'hug', 'nod', 'startle', 'stomp', 'hands', 'paint'];
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

  it('finishes reactions rather than repeating a stomp or holding a startled body forever', () => {
    for (const role of ['pappa', 'mamma', 'moa', 'bertil'] as const) {
      const at = (act: Act, t: number) => actPose(act, { ...context(t), role }, { ...STANDING });
      expect(at('stomp', .24).legR).toBeGreaterThan(.5);
      expect(at('stomp', 2).legR).toBe(0);
      expect(at('startle', .2).armR).toBeGreaterThan(at('startle', 2).armR + .6);
      expect(at('wave', .6).armR).toBeGreaterThan(at('wave', 3).armR + 1);
      for (const act of ['wave', 'startle', 'stomp', 'nod', 'hug'] as const) expect(at(act, 3), `${role} ${act}`).toEqual(at(act, 30));
    }
  });

  it('gives simultaneous family reactions different timing while keeping all curves continuous', () => {
    const reaction = (role: 'mamma' | 'bertil') => actPose('startle', { ...context(.12), role }, { ...STANDING });
    expect(reaction('bertil').armR).toBeGreaterThan(reaction('mamma').armR + .5);
    for (const role of ['pappa', 'mamma', 'moa', 'bertil'] as const) {
      for (const act of ['wave', 'gasp', 'cheer', 'startle', 'stomp', 'nod', 'hug', 'draw', 'sip', 'show', 'eat'] as const) {
        let previous = actPose(act, { ...context(0), role }, { ...STANDING });
        for (let frame = 1; frame <= 720; frame++) {
          const next = actPose(act, { ...context(frame / 120), role }, { ...STANDING });
          for (const joint of ['lean', 'nod', 'armL', 'armR', 'elbowL', 'elbowR', 'legR', 'kneeR', 'bounce'] as const) {
            expect(Number.isFinite(next[joint]), `${role} ${act} ${joint}`).toBe(true);
            expect(Math.abs(next[joint] - previous[joint]), `${role} ${act} ${joint} frame ${frame}`).toBeLessThan(.3);
          }
          previous = next;
        }
      }
    }
  });

  it('makes marks on the paper, lifts between them, and returns continuously from inspection', () => {
    const first = drawingAt(.3), end = drawingAt(.8), lifted = drawingAt(1.25), inspecting = drawingAt(3.9);
    expect(first.contact).toBe(true); expect(end.contact).toBe(true);
    expect(Math.hypot(first.across - end.across, first.ahead - end.ahead)).toBeGreaterThan(.18);
    expect(lifted.contact).toBe(false); expect(lifted.lift).toBeGreaterThan(.05);
    expect(inspecting.inspect).toBe(1); expect(inspecting.lift).toBeGreaterThan(.1);
    const before = drawingAt(4.8 - 1e-6), after = drawingAt(4.8);
    for (const value of ['across', 'ahead', 'lift', 'inspect'] as const) expect(Math.abs(before[value] - after[value])).toBeLessThan(1e-5);
  });

  it('holds the mug at the lips before lowering, with the body and prop sharing the clock', () => {
    expect(sippingAt(.7).raise).toBe(0);
    expect(sippingAt(1.3).raise).toBeGreaterThan(.4);
    for (const time of [1.8, 2.1, 2.6]) expect(sippingAt(time).raise).toBe(1);
    expect(sippingAt(2.2).tilt).toBe(1); expect(sippingAt(3.2).raise).toBeLessThan(.5);
    expect(sippingAt(3.8).raise).toBe(0);
    const before = sippingAt(6.8 - 1e-6), after = sippingAt(6.8);
    expect(before).toEqual(after);
    const rig = createRehearsalRig('mamma');
    const handAt = (t: number) => {
      rig.pose(actPose('sip', { ...context(t), role: 'mamma' }, { ...STANDING }, 'sit'));
      return rig.hand(0, new Vector3());
    };
    expect(handAt(2.2 / .86).distanceTo(handAt(2.4 / .86))).toBeLessThan(1e-8);
    expect(handAt(2.2 / .86).y).toBeGreaterThan(handAt(.3).y + .5);
  });

  it('seeks and pauses family clocks exactly and keeps reduced-motion contacts and gestures still', () => {
    for (const role of ['pappa', 'mamma', 'moa', 'bertil'] as const) {
      for (const act of ['wave', 'gasp', 'cheer', 'startle', 'stomp', 'nod', 'hug', 'draw', 'sip', 'show'] as const) {
        const fixed = actPose(act, { ...context(.71), role }, { ...STANDING });
        actPose(act, { ...context(20), role }, { ...STANDING });
        expect(actPose(act, { ...context(.71), role }, { ...STANDING })).toEqual(fixed);
        const calm = actPose(act, { ...context(0, 1.4, 3.55, true), role }, { ...STANDING });
        expect(actPose(act, { ...context(90, 1.4, 3.55, true), role }, { ...STANDING })).toEqual(calm);
        expect(calm.bounce).toBe(0);
      }
      expect(drawingAt(10, true, role)).toEqual(drawingAt(0, true, role));
      expect(sippingAt(10, true, role)).toEqual(sippingAt(0, true, role));
    }
  });

  it('looks sideways without pitching down as though the target were at the feet', () => {
    const side = actPose('look', { ...context(1, 0, 3.4), aim: { ahead: 0, side: 4, up: 3.4 } }, { ...STANDING });
    const near = actPose('look', context(1, 0, 3.4), { ...STANDING });
    expect(side.turn).toBe(.7); expect(side.nod).toBeLessThan(near.nod - .35);
    const other = actPose('look', { ...context(1), aim: { ahead: 0, side: -4, up: 3.4 } }, { ...STANDING });
    expect(other.turn).toBe(-.7);
    const begin = actPose('point', { ...context(.16), aim: { ahead: 1, side: 3, up: 3.4 } }, { ...STANDING });
    expect(begin.turn).toBe(.7);
  });
});
