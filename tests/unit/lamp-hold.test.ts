import { Group, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actPose } from '../../src/render/acting';
import { holdFlashlight } from '../../src/render/lamp-hold';
import { createRehearsalRig, STANDING, type Role } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });
const v = () => new Vector3();

describe('a flashlight carried in front of a posed body', () => {
  it.each(['pappa', 'mamma', 'moa', 'bertil'] as Role[])('%s keeps the carrying elbow outside the torso and below its shoulder in every stance', who => {
    const rig = createRehearsalRig(who), lamp = new Group();
    rig.group.position.set(6, 1, -2); rig.group.rotation.y = -1.1;
    const shoulder = v(), elbow = v(), wrist = v();
    for (const stance of ['stand', 'kneel', 'crouch'] as const) for (const side of [0, 1] as const) {
      rig.pose(actPose(stance, { t: 3, aim: null, stride: 0, pace: 0, calm: false, role: who, legs: rig.legs }, { ...STANDING }));
      const free = rig.hand(side === 0 ? 1 : 0, v());
      rig.arm!(side, shoulder, elbow, wrist);
      const lengths = [shoulder.distanceTo(elbow), elbow.distanceTo(wrist)];
      const aim = rig.group.localToWorld(v().set(0, .4, 4));
      holdFlashlight(rig, lamp, side, aim, Math.max(.7, rig.height / 5.2));
      rig.arm!(side, shoulder, elbow, wrist);
      expect(rig.hand(side === 0 ? 1 : 0, v()).distanceTo(free)).toBeLessThan(1e-8);
      expect(shoulder.distanceTo(elbow)).toBeCloseTo(lengths[0]!, 6);
      expect(elbow.distanceTo(wrist)).toBeCloseTo(lengths[1]!, 6);
      expect(wrist.distanceTo(shoulder)).toBeLessThan((lengths[0]! + lengths[1]!) * .93);
      const s = rig.group.worldToLocal(shoulder.clone()), e = rig.group.worldToLocal(elbow.clone());
      const hand = rig.group.worldToLocal(lamp.position.clone());
      expect(e.y).toBeLessThan(s.y - .1);
      expect(e.x * (side === 0 ? 1 : -1)).toBeGreaterThan(Math.abs(s.x) * .85);
      expect(hand.z).toBeGreaterThan(s.z + .3);
      expect(hand.y).toBeLessThan(s.y - .2);
      expect(lamp.position.distanceTo(rig.hand(side, v()))).toBeLessThan(1e-8);
    }
  });

  it('attaches the lamp to the returned power-grip socket, including an offset palm, and aims the same beam axis', () => {
    const rig = createRehearsalRig('pappa'), lamp = new Group(), returned = v(), actualAxis = v();
    // A private hand's socket is not its wrist: a reachable target may move slightly when the grip rotates.
    rig.grasp = (_side, grip, target, axis, out, _weight, axisOut) => {
      expect(grip.kind).toBe('power');
      returned.copy(target).add(new Vector3(.03, -.02, .01));
      actualAxis.copy(axis).applyAxisAngle(new Vector3(0, 1, 0), .08);
      axisOut!.copy(actualAxis); return out.copy(returned);
    };
    rig.pose({ ...STANDING });
    holdFlashlight(rig, lamp, 0, new Vector3(-1, .6, 4), 1);
    expect(lamp.position.clone().addScaledVector(actualAxis, .06).distanceTo(returned)).toBeLessThan(1e-8);
    expect(new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion).distanceTo(actualAxis)).toBeLessThan(1e-8);
  });

  it('keeps the raincoat handoff at its authored hand rather than pulling that hand back to a carry target', () => {
    const rig = createRehearsalRig('pappa'), lamp = new Group();
    rig.pose({ ...STANDING, armR: 1.8, elbowR: 1.1 });
    const before = rig.hand(1, v());
    holdFlashlight(rig, lamp, 1, null, 1, false);
    expect(rig.hand(1, v()).distanceTo(before)).toBeLessThan(1e-8);
    expect(lamp.position.distanceTo(before)).toBeLessThan(1e-8);
  });

  it('keeps Pappa’s held torch below the shoulder through the tiny reveal, a long reading stop and getting up', () => {
    const stage = createStage(stormkvall, () => 0), rig = stage.actors.get('pappa')!.rig;
    const index = stormkvall.scenes!.findIndex(s => s.id === 'upptackt');
    const flags = new Set(stormkvall.scenes!.slice(0, index).map(s => `scene:${s.id}`));
    flags.add('lamp:give'); flags.add('star');
    const lamp = stage.group.getObjectByName('stage-thing:lamp-pappa')!;
    const shoulder = v(), elbow = v(), wrist = v();
    let clock = 0;
    const frame = (id: string, seconds: number, held = false, dt = 1 / 60) => {
      clock += dt;
      talk.hear(held ? { who: 'pappa', text: 'Då hjälps vi åt. Ropa när du behöver oss.', seconds: clock, reading: true } : null, dt);
      talk.place('elof', 6.4, .7, 0);
      stage.update({ id, seconds }, flags, { x: 6.4, y: 0 }, clock, dt, false);
      rig.arm!(0, shoulder, elbow, wrist);
      expect(lamp.visible).toBe(true);
      expect(lamp.position.y).toBeLessThan(shoulder.y - .2);
      expect(elbow.y).toBeLessThan(shoulder.y - .1);
    };
    for (let i = 0; i <= 432; i++) frame('upptackt', i / 60);
    for (let i = 0; i < 360; i++) frame('upptackt', 7.2, true);
    const paused = lamp.position.clone(), turn = lamp.quaternion.clone();
    for (let i = 0; i < 5; i++) frame('upptackt', 7.2, true, 0);
    expect(lamp.position.distanceTo(paused)).toBeLessThan(1e-8);
    expect(lamp.quaternion.angleTo(turn)).toBeLessThan(1e-7);
    flags.add('scene:upptackt');
    for (let i = 0; i <= 180; i++) frame('tillsammans', i / 60);
  });

  it('takes Bertil’s newly lit torch continuously, keeps its contact, and freezes acquisition with the scene clock', () => {
    const stage = createStage(stormoga, () => 0), rig = stage.actors.get('bertil')!.rig;
    const index = stormoga.scenes!.findIndex(s => s.id === 'lampa:bertil');
    const flags = new Set(stormoga.scenes!.slice(0, index).map(s => `scene:${s.id}`));
    for (const who of ['jetty', 'mamma', 'pappa', 'moa', 'bertil']) flags.add(`so:${who}`);
    const lamp = stage.group.getObjectByName('stage-thing:lamp-bertil')!;
    let previous: Vector3 | undefined, maxStep = 0;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      stage.update({ id: 'lampa:bertil', seconds: t }, flags, { x: 9.4, y: 0 }, t, 1 / 120, false);
      const hand = rig.hand(1, v());
      if (previous) maxStep = Math.max(maxStep, hand.distanceTo(previous));
      if (t >= .4) expect(lamp.position.distanceTo(hand)).toBeLessThan(1e-8);
      previous = hand;
    }
    // The old full-weight IK jumped by nearly an EL at the 0.4-second key.
    expect(maxStep).toBeLessThan(.12);
    stage.update({ id: 'lampa:bertil', seconds: .5 }, flags, { x: 9.4, y: 0 }, 1, 0, false);
    const paused = rig.hand(1, v()), heldLamp = lamp.position.clone();
    for (let i = 0; i < 120; i++) {
      stage.update({ id: 'lampa:bertil', seconds: .5 }, flags, { x: 9.4, y: 0 }, 1, 0, false);
      expect(rig.hand(1, v()).distanceTo(paused)).toBeLessThan(1e-8);
      expect(lamp.position.distanceTo(heldLamp)).toBeLessThan(1e-8);
    }
    // Reduced motion completes the acquisition immediately and is stable on repeated paused draws.
    stage.update({ id: 'lampa:bertil', seconds: .4 }, flags, { x: 9.4, y: 0 }, 1, 0, true);
    const reduced = rig.hand(1, v());
    expect(Number.isFinite(reduced.length())).toBe(true);
    for (let i = 0; i < 20; i++) {
      stage.update({ id: 'lampa:bertil', seconds: .4 }, flags, { x: 9.4, y: 0 }, 1, 0, true);
      expect(rig.hand(1, v()).distanceTo(reduced)).toBeLessThan(1e-8);
      expect(lamp.position.distanceTo(reduced)).toBeLessThan(1e-8);
    }
  });

});
