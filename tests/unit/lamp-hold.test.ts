import { Group, Matrix4, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actPose } from '../../src/render/acting';
import { familyLampSide, holdFlashlight, lampCarryWeight, quietLampArm } from '../../src/render/lamp-hold';
import { createFamilyMotion } from '../../src/render/family-motion';
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
  it.each([
    ['pappa', false], ['mamma', false], ['moa', false], ['moa', true], ['bertil', false],
  ] as const)('keeps %s’s lamp in one hand through a passing greeting (umbrella=%s)', (who, umbrella) => {
    const rig = createRehearsalRig(who), motion = createFamilyMotion(who, 0), lamp = new Group();
    const side = familyLampSide(who, umbrella), free = side === 0 ? 1 : 0;
    if (umbrella) expect(side).toBe(1); // The real umbrella is supported by Moa's left hand.
    let previous: Vector3 | null = null;
    for (let i = 0; i <= 120; i++) {
      const time = i / 60, x = -1 + i / 60;
      const pose = { ...motion.update(1 / 60, time, Math.max(0, 1.8 - time), 0, null, false) };
      rig.pose(pose); const greeting = rig.hand(free, v());
      quietLampArm(pose, side); rig.pose(pose);
      holdFlashlight(rig, lamp, side, new Vector3(x, .4, 0), Math.max(.7, rig.height / 5.2), true, 1, null, 1, time);
      expect(rig.hand(free, v()).distanceTo(greeting)).toBeLessThan(1e-8);
      expect(lamp.position.distanceTo(rig.hand(side, v()))).toBeLessThan(1e-8);
      if (previous) expect(lamp.position.distanceTo(previous)).toBeLessThan(.04);
      previous = lamp.position.clone();
    }
  });

  it('gives Bertil’s lamp hand to his boot continuously on both sides of the visibility gate', () => {
    const rig = createRehearsalRig('bertil'), lamp = new Group(), u = rig.height / 5.2;
    const target = new Vector3(1, .4, 0), boot = new Vector3(-.33 * u, 1.05 * u, .55 * u);
    const frame = (pull: number) => {
      const lit = pull < .5, weight = lampCarryWeight(pull);
      const pose = { ...STANDING, lean: .4, armL: 1.3, elbowL: .7 };
      if (lit) quietLampArm(pose, 0, weight);
      rig.pose(pose); rig.reach(0, boot, pull); rig.reach(1, boot, pull);
      if (lit) holdFlashlight(rig, lamp, 0, target, Math.max(.7, u), true, weight);
      return rig.hand(0, v());
    };
    for (const direction of [1, -1]) {
      let previous = frame(direction > 0 ? .45 : .55);
      for (let i = 1; i <= 100; i++) {
        const pull = direction > 0 ? .45 + i / 1000 : .55 - i / 1000, hand = frame(pull);
        expect(hand.distanceTo(previous)).toBeLessThan(.01);
        expect(frame(pull).distanceTo(hand)).toBeLessThan(1e-8);
        previous = hand;
      }
    }
  });

  it('carries the palm continuously as moving Elof passes directly under the hand, with stable Pause and seek', () => {
    const trace = (rate: number, timed = true) => {
      const rig = createRehearsalRig('pappa'), lamp = new Group(), socket = v(), ray = v(), fingers = v();
      rig.grasp = (_side, _grip, target, axis, out, _weight, axisOut, fingerDirection) => {
        socket.copy(target); ray.copy(axis); fingers.copy(fingerDirection!); axisOut!.copy(axis); return out.copy(target);
      };
      rig.pose({ ...STANDING }); holdFlashlight(rig, lamp, 1, null, 1);
      const origin = socket.clone(), matrix = new Matrix4(), side = v(), up = v();
      const frame = (x: number, time: number, reset = false) => {
        rig.pose({ ...STANDING });
        holdFlashlight(rig, lamp, 1, origin.clone().add(new Vector3(x, -2, 0)), 1, true, 1, null, 1, timed ? time : undefined, reset);
        expect(ray.dot(fingers)).toBeCloseTo(0, 8);
        up.copy(fingers).negate(); side.crossVectors(up, ray);
        return new Quaternion().setFromRotationMatrix(matrix.makeBasis(side, up, ray));
      };
      let previous = frame(1, 0, true);
      for (let i = 1; i <= 2 * rate; i++) {
        const current = frame(1 - i / rate, i / rate);
        expect(current.angleTo(previous)).toBeLessThan(3 / rate);
        previous = current;
        if (i === rate) for (let redraw = 0; redraw < 100; redraw++) expect(frame(0, 1).angleTo(current)).toBeLessThan(1e-7);
      }
      const completed = previous.clone(), rewound = frame(1, 0);
      expect(rewound.angleTo(frame(1, 4, true))).toBeLessThan(1e-7);
      return completed;
    };
    const at30 = trace(30), at60 = trace(60), at120 = trace(120);
    expect(at30.angleTo(at120)).toBeLessThan(.06);
    expect(at60.angleTo(at120)).toBeLessThan(.03);
    trace(60, false); // Reduced motion has no timed roll recovery, but the geometric transport stays continuous.
  });

  it.each([
    [0, -.3, 1], [1, .2, 0], [0, 0, -1], [0, 1, 0], [0, -1, 0],
  ])('turns the entire grip smoothly towards %s,%s,%s from a downward beam at Elof', (x, y, z) => {
    const rig = createRehearsalRig('pappa'), lamp = new Group(), socket = v(), ray = v(), fingers = v();
    rig.grasp = (_side, _grip, target, axis, out, _weight, axisOut, fingerDirection) => {
      socket.copy(target); ray.copy(axis); fingers.copy(fingerDirection!);
      axisOut!.copy(axis); return out.copy(target);
    };
    rig.pose({ ...STANDING }); holdFlashlight(rig, lamp, 1, null, 1);
    const from = socket.clone().add(new Vector3(-4, -3, .3)), aim = socket.clone().add(new Vector3(x, y, z).multiplyScalar(5));
    const matrix = new Matrix4(), side = v(), up = v();
    const pose = (weight: number) => {
      rig.pose({ ...STANDING }); holdFlashlight(rig, lamp, 1, aim, 1, true, 1, from, weight);
      expect(ray.dot(fingers)).toBeCloseTo(0, 8);
      expect(ray.length()).toBeCloseTo(1, 8); expect(fingers.length()).toBeCloseTo(1, 8);
      expect(lamp.position.clone().addScaledVector(ray, .06).distanceTo(socket)).toBeLessThan(1e-8);
      up.copy(fingers).negate(); side.crossVectors(up, ray);
      return new Quaternion().setFromRotationMatrix(matrix.makeBasis(side, up, ray));
    };
    let previous = pose(0);
    for (let i = 1; i <= 120; i++) {
      const current = pose(i / 120);
      expect(current.angleTo(previous)).toBeLessThan(.03);
      previous = current;
      if (i === 42) for (let paused = 0; paused < 30; paused++) expect(pose(i / 120).angleTo(current)).toBeLessThan(1e-7);
    }
    expect(ray.angleTo(new Vector3(x, y, z).normalize())).toBeLessThan(1e-7);
  });

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

  it.each([
    ['pappa', 5.6], // A new act and a new person to look at.
    ['mamma', 9.2], // A glance while continuing the existing act.
  ] as const)('turns %s’s held beam continuously at the real stor key at %s', (who, at) => {
    const stage = createStage(stormoga, () => 0), rig = stage.actors.get(who)!.rig;
    const index = stormoga.scenes!.findIndex(s => s.id === 'stor');
    const flags = new Set(stormoga.scenes!.slice(0, index).map(s => `scene:${s.id}`));
    flags.add('taste');
    for (const role of ['jetty', 'mamma', 'pappa', 'moa', 'bertil']) flags.add(`so:${role}`);
    const scene = stormoga.scenes![index]!, player = scene.resumeAt!;
    const lamp = stage.group.getObjectByName(`stage-thing:lamp-${who}`)!;
    let clock = 0;
    const frame = (t: number, dt = 1 / 120) => {
      clock += dt;
      stage.update({ id: 'stor', seconds: t }, flags, player, clock, dt, false);
      expect(lamp.visible).toBe(true);
      expect(lamp.position.distanceTo(rig.hand(1, v()))).toBeLessThan(1e-8);
      return new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
    };
    for (let i = 0; i < at * 120; i++) frame(i / 120);
    let previous = frame(at - 1e-6, 0);
    expect(frame(at, 0).angleTo(previous)).toBeLessThan(1e-4);
    for (let i = 1; i <= 72; i++) {
      const axis = frame(at + i / 120);
      expect(axis.angleTo(previous)).toBeLessThan(.12);
      previous = axis;
      if (i === 18) {
        const heldBeam = axis.clone();
        for (let reading = 0; reading < 120; reading++) {
          const beam = frame(at + i / 120, 1 / 60);
          // Breathing continues, but the turn to the next person waits with the story.
          expect(beam.angleTo(heldBeam)).toBeLessThan(.04);
        }
        previous = new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
        const position = lamp.position.clone(), turn = lamp.quaternion.clone();
        for (let redraw = 0; redraw < 60; redraw++) {
          frame(at + i / 120, 0);
          expect(lamp.position.distanceTo(position)).toBeLessThan(1e-8);
          expect(lamp.quaternion.angleTo(turn)).toBeLessThan(1e-7);
        }
      }
    }
    const aim = scene.stage!.actors![who]!.find(key => key.at === at)!.aim!;
    expect(previous.angleTo(new Vector3(aim.x, aim.y, aim.z ?? 0).sub(lamp.position).normalize())).toBeLessThan(1e-7);
  });

  it.each([0, 1] as const)('reserves only the torch-owned hand (%s) when both hands reach', (side) => {
    const chapter = { ...stormoga, scenes: [{ id: 'hands', seconds: 2, stage: { actors: { pappa: [
      { at: 0, x: 0, y: 0, z: 0, face: .25, act: 'reach' as const, aim: { x: 0, y: 2, z: 8 },
        holds: side === 1 ? 'lamp-pappa' as const : null, holdsLeft: side === 0 ? 'lamp-pappa' as const : null },
    ] } } }] };
    const stage = createStage(chapter, () => 0), rig = stage.actors.get('pappa')!.rig;
    const reach = vi.spyOn(rig, 'reach');
    stage.update({ id: 'hands', seconds: 1 }, new Set(), { x: 1, y: 0 }, 1, 1 / 60, false);
    // One contact for the carrying arm, one for the free hand's authored reach. Never solve the torch arm twice.
    expect(reach.mock.calls.filter(call => call[0] === side)).toHaveLength(1);
    expect(reach.mock.calls.filter(call => call[0] !== side)).toHaveLength(1);
    expect(rig.hand(side === 0 ? 1 : 0, v()).z).toBeGreaterThan(rig.hand(side, v()).z + .3);
  });

});
