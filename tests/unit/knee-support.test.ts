import { Bone, BufferGeometry, Float32BufferAttribute, Group, MeshBasicMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubCanvas } from './canvas-stub';
import { garden } from '../../src/content/chapters/garden';
import { prolog } from '../../src/content/chapters/ends';
import { createStage } from '../../src/render/stage';
import type { Role } from '../../src/render/rig';
import { createArmContact, createHandGrip } from '../../src/render/arm-contact';
import { kneeSupport } from '../../src/render/knee-support';

const v = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);

describe('a palm supported on the knee', () => {
  it.each([-1, 1])('keeps the %s elbow outside, the actual palm down and fingers forward through acquisition/release and Pause', side => {
    for (const [upperLength, forearm] of [[.6, .53], [.52, .47], [.46, .4], [.47, .41]]) {
      const body = new Group(), upper = new Bone(), lower = new Bone(), hand = new Bone();
      body.add(upper); upper.add(lower); lower.add(hand);
      body.position.set(4, .2, -1); body.rotation.y = -.6;
      upper.position.set(side * .4, 1.7, 0); lower.position.y = -upperLength; hand.position.y = -forearm;
      const reset = () => { upper.rotation.set(.2, 0, side * .2); lower.rotation.set(.5, 0, 0); hand.quaternion.identity(); body.updateMatrixWorld(true); };
      reset();
      const support = { along: v(0, -1, 0), normal: v(0, 0, 1), at: v(0, -.12, .025) };
      const grip = createHandGrip(lower, hand, createArmContact(upper, lower, hand), undefined, undefined, support);
      const target = body.localToWorld(v(side * .4, 1.7 - upperLength - forearm * .55, .3));
      const forward = v(0, 0, 1).transformDirection(body.matrixWorld), down = v(0, -1, 0), outside = v(side, 0, 0).transformDirection(body.matrixWorld);
      let previous: Vector3 | null = null;
      for (const weight of [...Array.from({ length: 61 }, (_, i) => i / 60), ...Array.from({ length: 61 }, (_, i) => 1 - i / 60)]) {
        reset(); const out = grip(target, forward, v(), weight, down, outside);
        if (previous) expect(out.distanceTo(previous)).toBeLessThan(.035);
        previous = out.clone();
        if (weight === 1) {
          expect(out.distanceTo(target)).toBeLessThan(1e-8);
          expect(support.along.clone().transformDirection(hand.matrixWorld).dot(forward)).toBeGreaterThan(.999999);
          expect(support.normal.clone().transformDirection(hand.matrixWorld).dot(down)).toBeGreaterThan(.999999);
          const shoulder = upper.getWorldPosition(v()), elbow = lower.getWorldPosition(v());
          expect(elbow.sub(shoulder).dot(outside)).toBeGreaterThan(.08);
        }
        const held = [upper.quaternion.clone(), lower.quaternion.clone(), hand.quaternion.clone()];
        reset(); grip(target, forward, v(), weight, down, outside);
        for (const [i, joint] of [upper, lower, hand].entries()) expect(joint.quaternion.angleTo(held[i]!)).toBeLessThan(1e-7);
      }
    }
  });

  it('uses the visible skinned surface and caches only nearby triangles, including a coarse triangle spanning the knee', () => {
    const model = new Group(), knee = new Bone(); knee.name = 'calf_r'; model.add(knee);
    const geometry = new BufferGeometry();
    // The near face spans the knee even though all its vertices are farther away than the knee radius.
    geometry.setAttribute('position', new Float32BufferAttribute([-1, .1, -1, 1, .1, -1, 0, .1, 1, -1, 4, -1, 1, 4, -1, 0, 4, 1], 3));
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Array(24).fill(0), 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: 24 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
    const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial()); model.add(mesh);
    model.updateMatrixWorld(true); mesh.bind(new Skeleton([knee]));
    const support = kneeSupport(model, knee, 'r', 2);
    const reads = vi.spyOn(mesh, 'getVertexPosition');
    for (const y of [0, .3, .7]) {
      reads.mockClear(); knee.position.y = y; model.rotation.y = .6; model.position.x = y;
      // Deliberately no matrix/skeleton/renderer update: the Stage contact runs before the draw.
      const contact = support(v());
      expect(contact.y).toBeCloseTo(y + .1, 7);
      expect(contact.x).toBeCloseTo(y, 7); expect(contact.z).toBeCloseTo(0, 7);
      expect(reads).toHaveBeenCalledTimes(3); // no distant face or full-mesh scan while posing
    }
  });
});

// The scene owns the support weight; a held reading frame or Pause must not advance its acquisition.
beforeEach(stubCanvas);
afterEach(() => vi.unstubAllGlobals());

describe('authored knee support', () => {
  it('keeps Pappa’s already lowered support continuous when he kneels again and reaches for Elof', () => {
    const stage = createStage(prolog, () => 0), rig = stage.actors.get('pappa')!.rig;
    const before = prolog.scenes!.findIndex(scene => scene.id === 'prologue:pappa');
    const flags = new Set(prolog.scenes!.slice(0, before).map(scene => scene.by?.done ?? `scene:${scene.id}`));
    let share = 0;
    const grip = rig.grip.bind(rig);
    vi.spyOn(rig, 'grip').mockImplementation((side, target, direction, out, weight, normal, outside) => {
      if (side === 1 && normal) share = weight!;
      return grip(side, target, direction, out, weight, normal, outside);
    });
    for (const at of [.25, .7]) {
      const states = [at - 1e-7, at, at + 1e-7].map(seconds => {
        share = 0; stage.update({ id: 'prologue:pappa', seconds }, flags, { x: 44.4, y: -.38 }, seconds, 1 / 60, false);
        return { share, hand: rig.hand(1, v()) };
      });
      for (const next of states.slice(1)) {
        expect(Math.abs(next.share - states[0]!.share), `support at ${at}`).toBeLessThan(1e-5);
        expect(next.hand.distanceTo(states[0]!.hand), `hand at ${at}`).toBeLessThan(1e-4);
      }
    }
  });

  it.each(['pappa', 'mamma', 'moa', 'bertil'] as const)('acquires and releases %s’s supported hand continuously, and freezes in Pause', who => {
    const act = who === 'pappa' || who === 'mamma' ? 'kneel' : 'crouch';
    const stage = createStage({ ...garden, furniture: [], scenes: [{ id: 'support', seconds: 6, stage: { actors: {
      [who]: [{ at: 0, x: 0, y: 0, z: 0, face: .17, act: 'stand' }, { at: 1, act }, { at: 3, act: 'stand' }],
    } } }] }, () => 0);
    const rig = stage.actors.get(who)!.rig, weights: number[] = [], grip = rig.grip.bind(rig);
    vi.spyOn(rig, 'grip').mockImplementation((side, target, direction, out, weight, normal, outside) => {
      if (normal) { weights.push(weight!); expect(normal.y).toBe(-1); expect(outside!.length()).toBeCloseTo(1, 9); }
      return grip(side, target, direction, out, weight, normal, outside);
    });
    let previous: Vector3[] = [];
    for (let frame = 0; frame <= 300; frame++) {
      const seconds = frame / 60;
      stage.update({ id: 'support', seconds }, new Set(), { x: 2, y: 0 }, seconds, 1 / 60, false);
      const hands = [rig.hand(0, v()), rig.hand(1, v())];
      if (previous.length) for (const side of [0, 1]) expect(hands[side]!.distanceTo(previous[side]!), `${who} ${seconds} ${side}`).toBeLessThan(rig.height * .055);
      previous = hands;
      if (frame === 150) {
        for (let paused = 0; paused < 10; paused++) {
          stage.update({ id: 'support', seconds }, new Set(), { x: 2, y: 0 }, 100 + paused, 0, false);
          for (const side of [0, 1] as const) expect(rig.hand(side, v()).distanceTo(hands[side]!)).toBeLessThan(1e-9);
        }
      }
    }
    expect(Math.min(...weights)).toBeLessThan(.02); expect(Math.max(...weights)).toBe(1);
    // Reduced motion still presents the same real support and keeps Pause stable.
    stage.update({ id: 'support', seconds: 2.5 }, new Set(), { x: 2, y: 0 }, 2.5, 1 / 60, true);
    const held = rig.hand(1, v());
    stage.update({ id: 'support', seconds: 2.5 }, new Set(), { x: 2, y: 0 }, 300, 0, true);
    expect(rig.hand(1, v()).distanceTo(held)).toBeLessThan(1e-9);
  });

  it.each([0, 1] as const)('never sends a torch-owned hand %s towards a knee', side => {
    const who: Role = 'moa';
    const stage = createStage({ ...garden, furniture: [], scenes: [{ id: 'support', seconds: 4, stage: { actors: {
      [who]: [{ at: 0, x: 0, y: 0, z: 0, face: .17, act: 'crouch', [side === 0 ? 'holdsLeft' : 'holds']: 'lamp-moa' }],
    } } }] }, () => 0);
    const rig = stage.actors.get(who)!.rig, grip = vi.spyOn(rig, 'grip');
    stage.update({ id: 'support', seconds: 2 }, new Set(), { x: 2, y: 0 }, 2, 1 / 60, false);
    const supports = grip.mock.calls.filter(call => call[5]);
    expect(supports).toHaveLength(1); expect(supports[0]![0]).toBe(1 - side);
  });
});
