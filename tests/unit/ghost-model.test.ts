import { BoxGeometry, Euler, Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MODEL_TURN, blinkEyes, createGhostMotion, eyeNodes, type GhostMotionFrame } from '../../src/render/ghost-model';

/** A ghost as the pack delivers it: three's loader drops the dot from eye.L, and the quantized eye is 0.0378 tall. */
function packedGhost(): Group {
  const ghost = new Group();
  const body = new Object3D();
  body.name = 'body';
  for (const side of ['L', 'R']) {
    const eye = new Object3D();
    eye.name = `eye${side}`;
    eye.scale.setScalar(0.0378);
    body.add(eye);
  }
  ghost.add(body);
  return ghost;
}

describe('the ghost modelled in Blender', () => {
  it('is turned to face along the course, as the stand-in does: its front (+z) then points along +x', () => {
    const front = new Vector3(0, 0, 1).applyEuler(new Euler(0, MODEL_TURN, 0));
    expect([front.x, front.y, front.z].map((v) => Math.round(v * 1e6) / 1e6 + 0)).toEqual([1, 0, 0]);
  });
});

function ghostFeet(rolled = false) {
  const model = packedGhost(), body = model.getObjectByName('body')!;
  const feet = ['L', 'R'].map((side, i) => {
    const foot = new Mesh(new BoxGeometry(5, 4, 12).translate(0, -3, 2), new MeshBasicMaterial());
    foot.name = `foot${side}`; foot.position.set(i === 0 ? .08 : -.08, .19, -.04);
    foot.scale.setScalar(.0378);
    if (rolled) foot.rotation.set(-.11, .2, .07);
    body.add(foot);
    return foot;
  });
  return { model, body, feet };
}

const footFrame = (more: Partial<GhostMotionFrame> = {}): GhostMotionFrame => ({ dt: 1 / 60, clock: 0,
  hop: null, calm: false, awake: true, staged: false, ...more });

describe('the carved ghost’s separate feet', () => {
  it('trails both shoes on takeoff and reaches forward before landing, without deforming the body', () => {
    const { model, body, feet } = ghostFeet();
    const motion = createGhostMotion(model), bodyBefore = body.matrix.clone();
    motion.update(footFrame({ hop: .25 }));
    for (const foot of feet) expect(foot.rotation.x).toBeGreaterThan(.2);
    expect(feet[0]!.rotation.x).not.toBeCloseTo(feet[1]!.rotation.x, 3);
    motion.update(footFrame({ hop: .85 }));
    for (const foot of feet) expect(foot.rotation.x).toBeLessThan(-.1);
    motion.update(footFrame({ hop: 1 }));
    for (const foot of feet) expect(Math.abs(foot.rotation.x)).toBeLessThan(1e-8);
    body.updateMatrix(); expect(body.matrix.equals(bodyBefore)).toBe(true);
    expect(eyeNodes(model).every((eye) => eye.scale.y === .0378)).toBe(true);
  });

  it('preserves quantized scales and original rolled transforms across repeated hops and scripted holds', () => {
    const { model, feet } = ghostFeet(true), motion = createGhostMotion(model);
    const rest = feet.map((foot) => ({ position: foot.position.clone(), rotation: foot.quaternion.clone(), scale: foot.scale.clone() }));
    for (let cycle = 0; cycle < 12; cycle++) {
      for (let phase = 0; phase <= 1; phase += .1) motion.update(footFrame({ hop: phase }));
      motion.update(footFrame({ staged: true }));
      feet.forEach((foot, i) => {
        expect(foot.position.equals(rest[i]!.position)).toBe(true);
        expect(foot.quaternion.angleTo(rest[i]!.rotation)).toBeLessThan(1e-7);
        expect(foot.scale.equals(rest[i]!.scale)).toBe(true);
      });
    }
  });

  it('stays still between occasional toe taps and keeps the tapping heel on its original floor', () => {
    const { model, feet } = ghostFeet(), motion = createGhostMotion(model);
    model.position.set(3, 4, 5); model.rotation.y = .6; model.scale.setScalar(2.4);
    const point = new Vector3();
    const low = (foot: Mesh) => {
      let y = Infinity;
      const positions = foot.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i); foot.localToWorld(point); y = Math.min(y, point.y);
      }
      return y;
    };
    const floor = feet.map(low);
    for (const clock of [0, 1, 2, 4.5]) {
      motion.update(footFrame({ clock }));
      for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 8);
    }
    motion.update(footFrame({ clock: 4.95 }));
    expect(feet[0]!.rotation.x).toBeCloseTo(-.18, 6);
    expect(feet[1]!.rotation.x).toBeCloseTo(0, 8);
    feet.forEach((foot, i) => expect(low(foot)).toBeCloseTo(floor[i]!, 7));
    motion.update(footFrame({ clock: 11.35 }));
    expect(feet[0]!.rotation.x).toBeCloseTo(0, 8);
    expect(feet[1]!.rotation.x).toBeCloseTo(-.18, 6);
    feet.forEach((foot, i) => expect(low(foot)).toBeCloseTo(floor[i]!, 7));
  });

  it('freezes on pause, gives held scenes ownership immediately, and quiets reduced motion', () => {
    const { model, feet } = ghostFeet(), motion = createGhostMotion(model);
    motion.update(footFrame({ hop: .25 }));
    const normal = feet[0]!.rotation.x;
    const paused = feet.map((foot) => foot.quaternion.clone());
    motion.update(footFrame({ dt: 0, clock: 4.95, hop: .8 }));
    feet.forEach((foot, i) => expect(foot.quaternion.equals(paused[i]!)).toBe(true));
    motion.update(footFrame({ dt: 0, staged: true }));
    for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 8);
    motion.update(footFrame({ clock: 4.95, calm: true }));
    for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 8);
    motion.update(footFrame({ hop: .25, calm: true }));
    expect(feet[0]!.rotation.x).toBeCloseTo(normal * .4, 7);
    motion.update(footFrame({ awake: false, hop: .25 }));
    for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 8);
  });

  it('supports a public figure facing +X and models with missing feet', () => {
    const { model, feet } = ghostFeet();
    createGhostMotion(model, true).update(footFrame({ hop: .25 }));
    for (const foot of feet) {
      expect(foot.rotation.z).toBeLessThan(-.2);
      expect(foot.rotation.x).toBeCloseTo(0, 8);
    }
    expect(() => createGhostMotion(new Group()).update(footFrame({ hop: .5 }))).not.toThrow();
  });

  it('lands into a quiet planted pose even when the global idle clock is at a tap peak', () => {
    const { model, feet } = ghostFeet(), motion = createGhostMotion(model);
    motion.update(footFrame({ clock: 4.95 - 1 / 60, hop: .99 }));
    const before = feet.map(foot => foot.quaternion.clone());
    // This is the view's actual transition: a completed hop becomes null, rather than an explicit phase 1.
    motion.update(footFrame({ clock: 4.95, hop: null }));
    feet.forEach((foot, i) => expect(foot.quaternion.angleTo(before[i]!)).toBeLessThan(.025));
    for (const clock of [5, 5.1, 5.2]) {
      motion.update(footFrame({ clock }));
      for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 8);
    }
    motion.update(footFrame({ clock: 11.35 }));
    expect(feet[1]!.rotation.x).toBeCloseTo(-.18, 6);
  });

  it('carries a lifted toe smoothly into takeoff instead of snapping it back to its rest transform', () => {
    const { model, feet } = ghostFeet(), motion = createGhostMotion(model);
    motion.update(footFrame({ clock: 4.95 }));
    const rotation = feet[0]!.quaternion.clone(), position = feet[0]!.position.clone();
    motion.update(footFrame({ clock: 4.95 + 1 / 60, hop: 0 }));
    expect(feet[0]!.quaternion.angleTo(rotation)).toBeLessThan(1e-7);
    expect(feet[0]!.position.distanceTo(position)).toBeLessThan(1e-8);
    motion.update(footFrame({ clock: 5.2, hop: .25 }));
    expect(feet[0]!.rotation.x).toBeGreaterThan(.2);
    expect(feet[0]!.position.y).toBeCloseTo(.19, 8);
  });

  it('articulates story walks, runs and hops from authored time, including a seek while paused', () => {
    const { model, feet } = ghostFeet(true), motion = createGhostMotion(model);
    const rest = feet.map(foot => foot.quaternion.clone());
    for (const act of ['waddle', 'run', 'hop', 'wake'] as const) {
      const actT = act === 'wake' ? 1.7 : .12;
      motion.update(footFrame({ staged: true, performance: { act, actT }, awake: false }));
      feet.forEach((foot, i) => expect(foot.quaternion.angleTo(rest[i]!)).toBeGreaterThan(.05));
      const sought = feet.map(foot => foot.quaternion.clone());
      motion.update(footFrame({ staged: true, performance: { act: 'freeze', actT: 10 } }));
      motion.update(footFrame({ staged: true, performance: { act, actT }, clock: 100, dt: 0 }));
      feet.forEach((foot, i) => {
        expect(foot.quaternion.angleTo(sought[i]!)).toBeLessThan(1e-7);
        expect(foot.scale.toArray()).toEqual([.0378, .0378, .0378]);
      });
      motion.update(footFrame({ staged: true, performance: { act, actT }, calm: true }));
      feet.forEach((foot, i) => expect(foot.quaternion.angleTo(rest[i]!)).toBeLessThan(1e-7));
    }
  });

  it('puts story shoes flat at each body bounce contact and when the carving freezes', () => {
    const { model, feet } = ghostFeet(), motion = createGhostMotion(model);
    for (const [act, actT] of [['waddle', Math.PI / 11], ['run', Math.PI / 18], ['hop', Math.PI / 6], ['wake', 2.2], ['freeze', .2]] as const) {
      motion.update(footFrame({ staged: true, performance: { act, actT } }));
      for (const foot of feet) expect(foot.rotation.x).toBeCloseTo(0, 7);
    }
  });
});

describe("the ghost's painted eyes", () => {
  it('finds both eyes of the packed model, in the strokes\' order', () => {
    expect(eyeNodes(packedGhost()).map((eye) => eye.name)).toEqual(['eyeL', 'eyeR']);
  });

  it('keeps a packed eye its own height when open: it never stretches it to 1', () => {
    const eyes = eyeNodes(packedGhost());
    blinkEyes(eyes, 1);
    for (const eye of eyes) expect(eye.scale.y).toBeCloseTo(0.0378, 6);
  });

  it('squeezes it from that height in a blink, and opens it again', () => {
    const eyes = eyeNodes(packedGhost());
    blinkEyes(eyes, 0.1);
    for (const eye of eyes) expect(eye.scale.y).toBeCloseTo(0.00378, 6);
    blinkEyes(eyes, 1);
    for (const eye of eyes) expect([eye.scale.x, eye.scale.y, eye.scale.z].map((v) => +v.toFixed(6))).toEqual([0.0378, 0.0378, 0.0378]);
  });

  it('remembers the height it was found with, if it is looked for again mid-blink', () => {
    const ghost = packedGhost();
    blinkEyes(eyeNodes(ghost), 0.1);
    blinkEyes(eyeNodes(ghost), 1);
    for (const eye of eyeNodes(ghost)) expect(eye.scale.y).toBeCloseTo(0.0378, 6);
  });

  it("finds the stand-in's two eyes, and the two eyes under one named part", () => {
    const standIn = new Group();
    for (const i of [0, 1]) {
      const eye = new Object3D();
      eye.name = `ghost-eye-${i}`;
      standIn.add(eye);
    }
    expect(eyeNodes(standIn).map((eye) => eye.name)).toEqual(['ghost-eye-0', 'ghost-eye-1']);
    const pair = new Group();
    pair.name = 'eyes';
    pair.add(new Object3D(), new Object3D());
    const carved = new Group();
    carved.add(pair);
    expect(eyeNodes(carved)).toEqual([...pair.children]);
  });
});
