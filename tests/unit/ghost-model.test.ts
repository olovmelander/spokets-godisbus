import { Euler, Group, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MODEL_TURN, blinkEyes, eyeNodes } from '../../src/render/ghost-model';

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
