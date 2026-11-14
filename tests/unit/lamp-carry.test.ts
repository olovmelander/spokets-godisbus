import { Group, Vector3, type BufferGeometry, type Mesh } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actPose } from '../../src/render/acting';
import { FOREARM_UNDER, flashlightCarryTarget, flashlightHandover, holdFlashlight, lightAhead } from '../../src/render/lamp-hold';
import { LAMP_BARREL, LAMP_COLOURS, LAMP_GLASS, LAMP_HELD, LAMP_TAIL, flashlight, lampColour, litLamp } from '../../src/render/flashlight';
import { createRehearsalRig, STANDING, type Role } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

/**
 * Olov, 14 November 2026: "Kan vi förbättra hur karaktärerna håller i sina ficklampor så att det ser snyggare och mer
 * naturligt ut genom hela spelet?" and "Se till att det ser snyggt och naturligt ut när familjemedlemmarna håller i
 * sina ficklampor." How the arm carries it (src/render/lamp-hold.ts), the lamp itself (src/render/flashlight.ts), and
 * the two moments in Stormkvällen where Pappa's pointed the wrong way or was not what he held up.
 */

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.unstubAllGlobals(); talk.reset(); });
const v = () => new Vector3();
const ROLES: Role[] = ['pappa', 'mamma', 'moa', 'bertil'];
const DOWN = new Vector3(0, -1, 0);

/** The carrying arm after a hold, in the body's own frame (its front +z, its left +x), and the lamp's own line. */
function carried(who: Role, side: 0 | 1, aim: (rig: ReturnType<typeof createRehearsalRig>) => Vector3, pose = { ...STANDING }) {
  const rig = createRehearsalRig(who), lamp = new Group();
  rig.group.position.set(6, 1, -2); rig.group.rotation.y = -1.1;
  rig.pose(pose);
  const size = Math.max(.7, rig.height / 5.2);
  holdFlashlight(rig, lamp, side, aim(rig), size);
  const shoulder = v(), elbow = v(), wrist = v(), other = v();
  rig.arm!(side === 0 ? 1 : 0, other, v(), v());
  rig.arm!(side, shoulder, elbow, wrist);
  const local = (p: Vector3) => rig.group.worldToLocal(p.clone());
  const beam = new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
  return {
    rig, lamp, size, beam,
    shoulder: local(shoulder), elbow: local(elbow), wrist: local(wrist), other: local(other),
    upper: elbow.clone().sub(shoulder).normalize(), forearm: wrist.clone().sub(elbow).normalize(),
    /** A point of the lamp, so far along it from the hand, in the body's frame. */
    along: (z: number) => local(lamp.position.clone().addScaledVector(beam, (z - LAMP_HELD) * size)),
  };
}

describe('a flashlight carried by one of the family', () => {
  it.each(ROLES.flatMap((who) => [[who, 0], [who, 1]] as const))('%s carries it in a relaxed arm, the forearm under the beam (hand %s)', (who, side) => {
    // Level and far off, as over the water in Stormens öga: the forearm lies under the beam by what the grip asks.
    const level = carried(who, side, (rig) => rig.group.localToWorld(v().set(0, 0.5 * rig.height, 30)));
    // (Less than the grip alone would have it where the hand is held out to keep the lamp clear of the coat.)
    expect(level.forearm.angleTo(level.beam)).toBeGreaterThan(FOREARM_UNDER - 0.65);
    expect(level.forearm.angleTo(level.beam)).toBeLessThan(FOREARM_UNDER + 0.2);
    // Held as a handle is and pointed with the whole forearm, the forearm lay along the beam: now the upper arm hangs,
    // and the hand is below the elbow, before the body.
    expect(level.upper.angleTo(DOWN)).toBeLessThan(0.6);
    expect(level.elbow.y).toBeLessThan(level.shoulder.y - 0.1 * level.rig.height);
    expect(level.wrist.y).toBeLessThan(level.elbow.y);
    expect(level.wrist.z).toBeGreaterThan(level.shoulder.z + 0.02 * level.rig.height);
    // At Elof by their feet the arm hangs: the lamp is turned down to him by the wrist, beside their own hip.
    const feet = carried(who, side, (rig) => rig.group.localToWorld(v().set(side === 0 ? 0.25 : -0.25, 0.4, 0.2 * rig.height)));
    expect(feet.forearm.angleTo(DOWN)).toBeLessThan(0.8);
    expect(feet.upper.angleTo(DOWN)).toBeLessThan(0.45);
    expect(Math.abs(feet.wrist.x)).toBeGreaterThan(0.9 * Math.abs(feet.shoulder.x));
    // Shining exactly at what it lights, both times.
    expect(feet.beam.y).toBeLessThan(-0.8);
    expect(Math.abs(level.beam.y)).toBeLessThan(0.12);
  });

  it.each(ROLES)('%s keeps the lamp out of the coat when it shines across the body', (who) => {
    for (const side of [0, 1] as const) for (const [across, up, ahead] of [[3, 0.4, 1.2], [1.5, 0.4, 1], [4, 2.5, 1.5], [2, 0.3, 3]] as const) {
      const held = carried(who, side, (rig) => rig.group.localToWorld(v().set((side === 0 ? -1 : 1) * across, up, ahead)));
      const half = 0.5 * Math.abs(held.shoulder.x - held.other.x), middle = 0.5 * (held.shoulder.x + held.other.x);
      const wide = held.rig.trunk!.wide * half, deep = held.rig.trunk!.deep * half;
      // Its glass, its middle and its tail: none inside the trunk's round. From a hand hanging at the hip it went through
      // the coat and the legs to light him on the other side.
      for (const z of [LAMP_GLASS, 0.5 * (LAMP_GLASS + LAMP_TAIL), LAMP_TAIL]) {
        const point = held.along(z);
        expect(((point.x - middle) / wide) ** 2 + ((point.z - held.shoulder.z) / deep) ** 2, `${who} hand ${side}, aim ${across},${up},${ahead}, lamp at ${z}`).toBeGreaterThan(1);
      }
      // And the hand is still its own side's: not reached across the belly.
      expect(held.wrist.x * (side === 0 ? 1 : -1)).toBeGreaterThan(-0.05 * held.rig.height);
    }
  });

  it.each(ROLES)('%s lets it swing a little with the stride, and holds it still on a knee', (who) => {
    const rig = createRehearsalRig(who), lamp = new Group(), size = Math.max(.7, rig.height / 5.2);
    const shoulder = v(), aim = rig.group.localToWorld(v().set(0, 0.4, 4 * rig.height));
    const swing = (stance: 'walk' | 'kneel') => {
      const ahead: number[] = [], knees: number[] = [];
      for (let i = 0; i < 24; i++) {
        rig.pose(actPose(stance, { t: stance === 'walk' ? i / 12 : 3 + i / 12, aim: null, stride: i / 12, gait: 1.2, pace: stance === 'walk' ? 1 : 0, calm: false, role: who, legs: rig.legs }, { ...STANDING }));
        holdFlashlight(rig, lamp, 0, aim, size);
        rig.arm!(0, shoulder, v(), v());
        ahead.push(rig.group.worldToLocal(lamp.position.clone()).z - rig.group.worldToLocal(shoulder.clone()).z);
        knees.push(rig.group.worldToLocal(rig.knee!(0, v())).z - rig.group.worldToLocal(rig.knee!(1, v())).z);
      }
      const mean = ahead.reduce((a, b) => a + b, 0) / ahead.length;
      // How far it goes to and fro, and whether it goes with the other leg: back as its own side's knee comes forward.
      return { range: Math.max(...ahead) - Math.min(...ahead), with: ahead.reduce((sum, z, i) => sum + (z - mean) * knees[i]!, 0) };
    };
    const walking = swing('walk');
    // Locked to the shoulder it did not move at all with the legs.
    expect(walking.range).toBeGreaterThan(0.025 * rig.height);
    expect(walking.range).toBeLessThan(0.16 * rig.height);
    expect(walking.with).toBeLessThan(0);
    expect(swing('kneel').range).toBeLessThan(0.01 * rig.height);
  });

  it.each(ROLES)('%s passes it from hand to hand before the belly, where both hands reach', (who) => {
    const rig = createRehearsalRig(who);
    rig.group.position.set(-3, 0, 2); rig.group.rotation.y = 0.7;
    rig.pose({ ...STANDING });
    const aim = rig.group.localToWorld(v().set(-2, 0.4, 3));
    const local = (p: Vector3) => rig.group.worldToLocal(p.clone());
    const left = flashlightCarryTarget(rig, 0, v(), aim), right = flashlightCarryTarget(rig, 1, v(), aim);
    expect(flashlightHandover(rig, v(), 0, aim).distanceTo(left)).toBeLessThan(1e-9);
    expect(flashlightHandover(rig, v(), 1, aim).distanceTo(right)).toBeLessThan(1e-9);
    const meeting = flashlightHandover(rig, v(), 0.5, aim), at = local(meeting);
    for (const side of [0, 1] as const) {
      const shoulder = v(), elbow = v(), wrist = v();
      rig.arm!(side, shoulder, elbow, wrist);
      // Within reach with the elbow bent: straight across from hip to hip it was further off than the arm is long.
      expect(meeting.distanceTo(shoulder)).toBeLessThan(0.93 * (shoulder.distanceTo(elbow) + elbow.distanceTo(wrist)));
      expect(at.z).toBeGreaterThan(local(shoulder).z + rig.trunk!.deep * Math.abs(local(shoulder).x));
      expect(at.y).toBeLessThan(local(shoulder).y - 0.07 * rig.height);
    }
    // In the middle, between the hands.
    expect(Math.abs(at.x)).toBeLessThan(0.03 * rig.height);
    // And on the way there and back it never dips into the body.
    for (let t = 0; t <= 1; t += 0.1) expect(local(flashlightHandover(rig, v(), t, aim)).z).toBeGreaterThan(Math.min(local(left).z, local(right).z) - 1e-6);
  });

  it('lights the floor ahead of Elof the way he faces', () => {
    // Walking right he is turned a little towards the camera; walking left, the other way round.
    const right = lightAhead(v(), 10, 0, -0.35, 3), left = lightAhead(v(), 10, 0, Math.PI + 0.35, 3);
    expect(right.x).toBeGreaterThan(10 + 3);
    expect(left.x).toBeLessThan(10 - 3);
    // Not at the camera: it pointed there, a quarter turn off, for every way he faced.
    expect(Math.abs(right.z)).toBeLessThan(0.5 * (right.x - 10));
    expect(Math.abs(left.z)).toBeLessThan(0.5 * (10 - left.x));
    expect(right.z).toBeGreaterThan(0);
    expect(right.y).toBeLessThan(1);
  });
});

describe('the flashlight itself', () => {
  const span = (geometry: BufferGeometry, axis: 'x' | 'y' | 'z') => {
    geometry.computeBoundingBox();
    return [geometry.boundingBox!.min[axis], geometry.boundingBox!.max[axis]] as const;
  };

  it('is one lamp wherever it is drawn: a barrel the hand closes round, a head, its glass, and a switch on top', () => {
    const lamp = flashlight();
    // Two draws unlit: the body, all of a piece, and the glass.
    const meshes: Mesh[] = [];
    lamp.traverse((node) => { if ((node as Mesh).isMesh) meshes.push(node as Mesh); });
    expect(meshes.map((mesh) => mesh.name)).toEqual(['', 'lamp-glass']);
    expect(lamp.getObjectByName('lamp-beam')).toBeUndefined();
    const [tail, front] = span(lamp.geometry, 'z');
    expect(tail).toBeCloseTo(LAMP_TAIL, 5);
    expect(front).toBeGreaterThan(LAMP_GLASS - 0.02);
    // Where the hand holds it the barrel is as thick as the grip is told, a ring's rib more at most; its head flares.
    const position = lamp.geometry.getAttribute('position');
    let grip = 0, head = 0, top = 0, under = 0;
    for (let i = 0; i < position.count; i++) {
      const z = position.getZ(i), r = Math.hypot(position.getX(i), position.getY(i));
      if (Math.abs(z - LAMP_HELD) < 0.12 && Math.abs(position.getX(i)) > 0.03) grip = Math.max(grip, r);
      if (z > LAMP_GLASS - 0.06) head = Math.max(head, r);
      if (z > -0.25 && z < 0.18) { top = Math.max(top, position.getY(i)); under = Math.max(under, -position.getY(i)); }
    }
    expect(grip).toBeGreaterThan(LAMP_BARREL - 1e-6);
    expect(grip).toBeLessThan(LAMP_BARREL + 0.012);
    expect(head).toBeGreaterThan(1.6 * LAMP_BARREL);
    // The switch stands up from the barrel, on top, and nothing like it underneath.
    expect(top).toBeGreaterThan(LAMP_BARREL + 0.02);
    expect(under).toBeLessThan(LAMP_BARREL + 0.012);
    // The glass sits in the head, facing the way the lamp points.
    const [from, to] = span((lamp.getObjectByName('lamp-glass') as Mesh).geometry, 'z');
    expect(from).toBeCloseTo(LAMP_GLASS, 5);
    expect(to).toBeCloseTo(LAMP_GLASS, 5);
  });

  it('shines from its glass, as wide as the glass, when it is lit', () => {
    const lamp = litLamp(), beam = lamp.getObjectByName('lamp-beam') as Mesh, glass = lamp.getObjectByName('lamp-glass') as Mesh;
    expect(beam).toBeDefined();
    const position = beam.geometry.getAttribute('position');
    let start = Infinity, wide = 0;
    for (let i = 0; i < position.count; i++) start = Math.min(start, position.getZ(i));
    for (let i = 0; i < position.count; i++) if (position.getZ(i) < start + 1e-4) wide = Math.max(wide, Math.hypot(position.getX(i), position.getY(i)));
    // It started as a point a little behind the glass.
    expect(start).toBeCloseTo(LAMP_GLASS, 5);
    const glassWide = span(glass.geometry, 'x')[1];
    expect(wide).toBeGreaterThan(0.7 * glassWide);
    expect(wide).toBeLessThanOrEqual(glassWide);
    // Lit, the glass is brighter than anything it lights: it reads as a lamp that is on with the beam left out too.
    const colour = (glass.material as unknown as { color: { r: number; g: number; b: number } }).color;
    expect(Math.max(colour.r, colour.g, colour.b)).toBeGreaterThan(1.5);
  });

  it('is each one\'s own by its barrel\'s colour, Pappa\'s the one from the table', () => {
    const colours = (['pappa', 'mamma', 'moa', 'bertil'] as const).map((who) => lampColour(who));
    expect(new Set(colours).size).toBe(4);
    expect(lampColour('pappa')).toBe(LAMP_COLOURS.pappa);
    expect(lampColour(undefined)).toBe(LAMP_COLOURS.pappa);
    expect(lampColour('someone')).toBe(LAMP_COLOURS.pappa);
  });
});

describe('Pappa\'s flashlight in Stormkvällen', () => {
  const before = (id: string) => new Set(stormkvall.scenes!.slice(0, stormkvall.scenes!.findIndex((s) => s.id === id)).map((s) => `scene:${s.id}`));

  it('lights Elof, who gave it to him, not the lamp over the table that he was looking up at', () => {
    const stage = createStage(stormkvall, () => 0), lamp = stage.group.getObjectByName('stage-thing:lamp-pappa')!;
    const elof = { x: 11.6, y: 0 }, flags = new Set<string>();
    let clock = 0;
    const draw = (frame: { id: string; seconds: number } | null) => { clock += 1 / 30; stage.update(frame, flags, elof, clock, 1 / 30, false); };
    // The evening's first scene, to its end: the lamps have gone out, and he has looked up at the one over the table.
    for (let t = 0; t <= 11.9; t += 1 / 30) draw({ id: 'kvall', seconds: t });
    flags.add('scene:kvall'); flags.add('lamp:take'); flags.add('lamp:give');
    const beam = () => new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
    const toElof = () => new Vector3(elof.x, elof.y + .4, 0).sub(lamp.position).normalize();
    for (let i = 0; i < 60; i++) draw(null);
    expect(lamp.visible).toBe(true);
    // Down at him: it went up to the ceiling.
    expect(beam().y).toBeLessThan(-0.3);
    expect(beam().angleTo(toElof())).toBeLessThan(0.05);
    // And so on into the next scene, until that turns him to the shelf.
    flags.add('goodnight');
    for (let t = 0; t <= 3; t += 1 / 30) draw({ id: 'fonstret', seconds: t });
    expect(beam().y).toBeLessThan(-0.3);
    for (let t = 3; t <= 9.6; t += 1 / 30) draw({ id: 'fonstret', seconds: t });
    expect(beam().y).toBeGreaterThan(0);
  });

  it('is what he holds up when he shows it: the lamp, its light up past his face, and no empty hand beside it', () => {
    const stage = createStage(stormkvall, () => 0), rig = stage.actors.get('pappa')!.rig;
    const lamp = stage.group.getObjectByName('stage-thing:lamp-pappa')!;
    const flags = before('tillsammans');
    flags.add('lamp:give'); flags.add('star');
    const shoulder = v(), elbow = v(), wrist = v();
    let clock = 0;
    const at = (seconds: number) => {
      for (let t = Math.max(0, seconds - 1.2); t <= seconds; t += 1 / 30) { clock += 1 / 30; stage.update({ id: 'tillsammans', seconds: t }, flags, { x: 6.4, y: 0 }, clock, 1 / 30, false); }
      rig.arm!(1, shoulder, elbow, wrist);
      return { lamp: lamp.position.clone(), beam: new Vector3(0, 0, 1).applyQuaternion(lamp.quaternion), free: rig.hand(1, v()), shoulder: shoulder.clone() };
    };
    const standing = at(2.2), showing = at(3.5);
    // "Ropa på mig när du behöver ljus.": the lamp comes up before him and points up.
    expect(showing.lamp.y).toBeGreaterThan(standing.lamp.y + 0.5);
    expect(showing.beam.y).toBeGreaterThan(0.3);
    expect(standing.beam.y).toBeLessThan(0);
    // His other hand hangs: it went up to his face, empty, with the lamp left down at his hip.
    expect(showing.free.y).toBeLessThan(showing.shoulder.y - 0.8);
  });
});
