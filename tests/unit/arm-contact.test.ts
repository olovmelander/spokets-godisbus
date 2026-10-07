import { Bone, Euler, Group, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createArmContact, createHandGrip, solveArm } from '../../src/render/arm-contact';

describe('arm contact geometry', () => {
  it('reaches across the body in three dimensions while keeping both limb lengths', () => {
    const shoulder = new Vector3(.8, 3, 0), elbow = new Vector3(1, 2.2, .3), hand = new Vector3(.8, 2, 1);
    const target = new Vector3(-.1, 2.5, .8), nextElbow = new Vector3(), nextHand = new Vector3();
    const original = [shoulder, elbow, hand, target].map(v => v.toArray());
    solveArm(shoulder, elbow, hand, target, nextElbow, nextHand);
    expect(nextHand.distanceTo(target)).toBeLessThan(1e-10);
    expect(nextElbow.distanceTo(shoulder)).toBeCloseTo(elbow.distanceTo(shoulder), 10);
    expect(nextElbow.distanceTo(nextHand)).toBeCloseTo(elbow.distanceTo(hand), 10);
    expect([shoulder, elbow, hand, target].map(v => v.toArray())).toEqual(original);
  });

  it('clamps both unreachable distances and stays finite for a target at the shoulder', () => {
    const shoulder = new Vector3(), elbow = new Vector3(0, -1, 0), hand = new Vector3(0, -1.5, 0);
    const nextElbow = new Vector3(), nextHand = new Vector3();
    for (const target of [new Vector3(8, 0, 0), new Vector3(.1, 0, 0), new Vector3()]) {
      solveArm(shoulder, elbow, hand, target, nextElbow, nextHand);
      expect(nextElbow.toArray().every(Number.isFinite)).toBe(true);
      expect(nextHand.toArray().every(Number.isFinite)).toBe(true);
      expect(nextElbow.length()).toBeCloseTo(1, 9);
      expect(nextElbow.distanceTo(nextHand)).toBeCloseTo(.5, 9);
      expect(nextHand.length()).toBeCloseTo(Math.max(.5, Math.min(1.5, target.length())), 9);
    }
    hand.set(0, -2, 0);
    solveArm(shoulder, elbow, hand, shoulder, nextElbow, nextHand);
    expect(nextElbow.toArray().every(Number.isFinite)).toBe(true);
    expect(nextHand.distanceTo(shoulder)).toBeLessThan(1e-7);
    expect(nextElbow.distanceTo(nextHand)).toBeCloseTo(1, 7);
  });

  it('keeps the chosen elbow side through a line of near-straight reaches', () => {
    const shoulder = new Vector3(), elbow = new Vector3(0, -.4, .9), hand = new Vector3(0, 0, 1.8);
    const pole = new Vector3(0, -1, 0), nextElbow = new Vector3(), nextHand = new Vector3();
    for (const x of [-.01, -.001, 0, .001, .01]) {
      solveArm(shoulder, elbow, hand, new Vector3(x, 0, 1.95), nextElbow, nextHand, pole);
      expect(nextElbow.y).toBeLessThan(-.05);
      expect(nextHand.x).toBeCloseTo(x, 9);
    }
  });
});

function importedArm() {
  const parent = new Group(), body = new Group(), upper = new Bone(), lower = new Bone(), hand = new Bone();
  parent.add(body); body.add(upper); upper.add(lower); lower.add(hand);
  parent.position.set(5, 3, -2); parent.rotation.set(.2, -.7, .1); parent.scale.set(1.4, .8, 2.1);
  body.position.set(.2, .4, -.3); body.rotation.set(.1, .5, -.2); body.scale.setScalar(1.7);
  upper.position.set(.8, 3.1, .1); upper.quaternion.setFromEuler(new Euler(.12, .25, 2.9));
  lower.position.set(.07, .9, -.05); lower.quaternion.setFromEuler(new Euler(.3, .07, .05));
  hand.position.set(.02, .73, .04);
  const restUpper = upper.quaternion.clone(), restLower = lower.quaternion.clone();
  const contact = createArmContact(upper, lower, hand);
  const reset = () => { upper.quaternion.copy(restUpper); lower.quaternion.copy(restLower); };
  return { parent, body, upper, lower, hand, contact, reset };
}

describe('contact on posed arm joints', () => {
  it('reconstructs a straight-arm reach independently of previously bent poses', () => {
    const root = new Group(), upper = new Group(), lower = new Group(), hand = new Group();
    root.add(upper); upper.add(lower); lower.add(hand);
    upper.position.set(.5, 3, 0); lower.position.y = -1; hand.position.y = -1;
    const reach = createArmContact(upper, lower, hand), target = new Vector3(.5, 2, 1);
    const reset = () => { upper.quaternion.identity(); lower.quaternion.identity(); };
    reach(target);
    const elbow = lower.getWorldPosition(new Vector3());
    for (const bend of [.8, -.5, 1.2]) {
      reset(); lower.rotation.x = bend; reach(new Vector3(.8, 2.1, .8));
      reset(); reach(target);
      expect(hand.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(1e-8);
      expect(lower.getWorldPosition(new Vector3()).distanceTo(elbow)).toBeLessThan(1e-8);
    }
  });

  it('puts the imported wrist at a world target with arbitrary rest rolls and transformed parents', () => {
    const arm = importedArm(), { body, upper, lower, hand, contact } = arm;
    const positions = [upper, lower, hand].map(bone => bone.position.toArray());
    const target = body.localToWorld(new Vector3(-.2, 2.5, .65));
    contact(target);
    expect(hand.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(1e-8);
    expect([upper, lower, hand].map(bone => bone.position.toArray())).toEqual(positions);
    const reached = [upper.quaternion.clone(), lower.quaternion.clone()];
    arm.reset(); contact(target);
    expect(upper.quaternion.angleTo(reached[0]!)).toBeLessThan(1e-7);
    expect(lower.quaternion.angleTo(reached[1]!)).toBeLessThan(1e-7);
    // A subsequent authored pose owns the arm again; reaching did not alter any saved rest transform.
    arm.reset();
    expect(upper.quaternion.angleTo(reached[0]!)).toBeGreaterThan(.1);
  });

  it('blends the actual hand path and leaves zero-weight joints untouched', () => {
    const { body, upper, lower, hand, contact } = importedArm();
    const initial = hand.getWorldPosition(new Vector3()), target = body.localToWorld(new Vector3(.15, 2.3, .7));
    const rotations = [upper.quaternion.toArray(), lower.quaternion.toArray()];
    contact(target, 0);
    expect([upper.quaternion.toArray(), lower.quaternion.toArray()]).toEqual(rotations);
    contact(target, .35);
    expect(hand.getWorldPosition(new Vector3()).distanceTo(initial.lerp(target, .35))).toBeLessThan(1e-8);
  });

  it('blends toward the reachable end of a distant point instead of clamping most of its release', () => {
    const arm = importedArm(), target = arm.body.localToWorld(new Vector3(30, 3, 2));
    const initial = arm.hand.getWorldPosition(new Vector3());
    arm.contact(target);
    const reached = arm.hand.getWorldPosition(new Vector3());
    expect(reached.distanceTo(target)).toBeGreaterThan(10);
    for (const weight of [.05, .25, .5, .75, .95]) {
      arm.reset();
      arm.contact(target, weight);
      expect(arm.hand.getWorldPosition(new Vector3()).distanceTo(initial.clone().lerp(reached, weight))).toBeLessThan(1e-8);
    }
  });

  it('follows the current seated height and scale, without reusing world-space limb lengths', () => {
    const arm = importedArm();
    for (const scale of [.55, 2.1]) {
      arm.reset(); arm.body.scale.setScalar(scale); arm.body.position.y = -1.3;
      const target = arm.body.localToWorld(new Vector3(.1, 2.5, .7));
      arm.contact(target);
      expect(arm.hand.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(1e-8);
      expect(arm.body.position.y).toBe(-1.3);
    }
  });

  it('supports a rehearsal hand offset and a factory built before the joints are positioned', () => {
    const root = new Group(), upper = new Group(), lower = new Group(), tip = new Vector3(0, -.92, .05);
    root.add(upper); upper.add(lower);
    const contact = createArmContact(upper, lower, tip);
    root.rotation.y = .8; root.scale.setScalar(.77);
    upper.position.set(.79, 3.05, 0); upper.rotation.x = -.9;
    lower.position.set(0, -.84, 0); lower.rotation.x = -.75;
    const target = root.localToWorld(new Vector3(.1, 2.5, 1.1));
    contact(target);
    expect(lower.localToWorld(tip.clone()).distanceTo(target)).toBeLessThan(1e-8);
    expect(tip.toArray()).toEqual([0, -.92, .05]);
  });

  it('leaves a coincident or missing-length chain finite', () => {
    const upper = new Group(), lower = new Group(); upper.add(lower);
    const contact = createArmContact(upper, lower, new Vector3());
    contact(new Vector3(1, 2, 3));
    expect(upper.quaternion.toArray().every(Number.isFinite)).toBe(true);
    expect(lower.quaternion.angleTo(new Quaternion())).toBeLessThan(1e-8);
  });
});

describe('holding a tool in the palm', () => {
  it('aims the fingers and puts the actual palm centre on a world target', () => {
    const { parent, body, upper, lower, hand, contact } = importedArm();
    parent.scale.setScalar(1.6);
    hand.rotation.set(.1, -.2, .07);
    const grip = createHandGrip(lower, hand, contact), out = new Vector3();
    const target = body.localToWorld(new Vector3(.1, 2.3, .7)), direction = new Vector3(0, -.25, 1).normalize();
    const positions = [upper, lower, hand].map(bone => bone.position.toArray());
    const length = hand.worldToLocal(lower.getWorldPosition(new Vector3())).length() * .2;
    grip(target, direction, out);
    expect(out.distanceTo(target)).toBeLessThan(1e-8);
    expect(new Vector3(0, 1, 0).transformDirection(hand.matrixWorld).distanceTo(direction)).toBeLessThan(1e-8);
    expect(hand.localToWorld(new Vector3(0, length, 0)).distanceTo(out)).toBeLessThan(1e-8);
    expect([upper, lower, hand].map(bone => bone.position.toArray())).toEqual(positions);
  });

  it('blends the palm path, leaves zero weight untouched and returns the reachable position', () => {
    const { parent, body, upper, lower, hand, contact } = importedArm();
    parent.scale.setScalar(1.2);
    const grip = createHandGrip(lower, hand, contact), out = new Vector3();
    const target = body.localToWorld(new Vector3(.15, 2.3, .7)), direction = new Vector3(0, -.2, 1);
    const rotations = [upper, lower, hand].map(bone => bone.quaternion.toArray());
    const initial = grip(target, direction, out, 0).clone();
    expect([upper, lower, hand].map(bone => bone.quaternion.toArray())).toEqual(rotations);
    grip(target, direction, out, .35);
    expect(out.distanceTo(initial.lerp(target, .35))).toBeLessThan(1e-8);
    target.set(1000, 1000, 1000);
    grip(target, direction, out);
    expect(out.toArray().every(Number.isFinite)).toBe(true);
    expect(out.distanceTo(target)).toBeGreaterThan(100);
  });
});
