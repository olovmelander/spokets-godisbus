import { Bone, BufferGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, SphereGeometry, Uint16BufferAttribute } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { faceOf, measureFace } from '../../src/render/face';

/**
 * A head as the family's are made (the private repository's faces): a round head on a Head bone, its smile painted as a thin
 * strip of lip colour lying just over the skin, and two eyeballs, the fronts of spheres, in a mesh of their own. Not a likeness:
 * a ball with a line on it. The model faces +z, its left +x; the head's middle is at y 1.1 in the model, its bone at y 1.
 */
const HEAD = 0.15, MIDDLE = 1.1, LINE = -0.07, HALF = 0.035, EYE = { x: 0.05, y: 0.016, r: 0.03 };
const SKIN = [0.85, 0.55, 0.4], LIP = [0.3, 0.06, 0.05];

function skinned(geometry: BufferGeometry, colour: number[], bone: number): BufferGeometry {
  const made = geometry.index ? geometry.toNonIndexed() : geometry;
  made.deleteAttribute('uv');
  const count = made.getAttribute('position').count;
  made.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count }, () => [...colour, 1]).flat(), 4));
  made.setAttribute('skinIndex', new Uint16BufferAttribute(Array.from({ length: count * 4 }, (_, i) => (i % 4 === 0 ? bone : 0)), 4));
  made.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)), 4));
  return made;
}

/** The painted smile: a strip over the skin, curving up at its corners. */
function smile(): BufferGeometry {
  const points: number[] = [];
  const at = (x: number, y: number) => { const r = HEAD * 1.008, z = Math.sqrt(r * r - x * x - y * y); return [x, MIDDLE + y, z]; };
  for (let k = 0; k < 12; k++) {
    const x0 = -HALF + (2 * HALF * k) / 12, x1 = -HALF + (2 * HALF * (k + 1)) / 12;
    const y0 = LINE + 120 * x0 * x0 * HALF, y1 = LINE + 120 * x1 * x1 * HALF, t = 0.0025;
    const a = at(x0, y0 + t), b = at(x1, y1 + t), c = at(x0, y0 - t), d = at(x1, y1 - t);
    points.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function head(eyes = true) {
  const model = new Group();
  const root = new Bone(); root.name = 'pelvis';
  const bone = new Bone(); bone.name = 'Head'; bone.position.set(0, 1, 0);
  root.add(bone);
  model.add(root);
  model.updateMatrixWorld(true);
  const ball = new SphereGeometry(HEAD, 64, 48).translate(0, MIDDLE, 0);
  const painted = new SkinnedMesh(mergeGeometries([skinned(ball, SKIN, 1), skinned(smile(), LIP, 1)])!, new MeshStandardMaterial({ vertexColors: true }));
  painted.name = 'test_painted';
  model.add(painted);
  const skeleton = new Skeleton([root, bone]);
  painted.bind(skeleton);
  if (eyes) {
    const dome = (side: number) => {
      const front = Math.sqrt(HEAD * HEAD - EYE.x * EYE.x - EYE.y * EYE.y) + 0.006;
      return skinned(new SphereGeometry(EYE.r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2)
        .translate(side * EYE.x, MIDDLE + EYE.y, front - EYE.r), [0.9, 0.9, 0.9], 1);
    };
    const mesh = new SkinnedMesh(mergeGeometries([dome(1), dome(-1)])!, new MeshStandardMaterial({ vertexColors: true }));
    mesh.name = 'test_eyes';
    model.add(mesh);
    mesh.bind(skeleton);
  }
  model.updateMatrixWorld(true);
  return { model, painted };
}

/** The lowest and highest of a range of the face's corners, in the model. */
function span(mesh: SkinnedMesh, from: number, to: number): [number, number] {
  const position = mesh.geometry.getAttribute('position');
  let low = Infinity, high = -Infinity;
  for (let i = from; i < to; i++) { low = Math.min(low, position.getY(i)); high = Math.max(high, position.getY(i)); }
  return [low, high];
}

describe('a painted face', () => {
  it('is measured where it is painted: its eyes, and its mouth by its colour and its place', () => {
    const { model, painted } = head();
    const eyes = model.children.find((child) => child.name === 'test_eyes') as SkinnedMesh;
    const layout = measureFace(painted, eyes)!;
    expect(layout).not.toBeNull();
    expect(layout.spacing).toBeCloseTo(2 * EYE.x, 3);
    // Head space: from the Head bone, which stands at y 1.
    expect(layout.centre.y).toBeCloseTo(MIDDLE - 1 + EYE.y, 2);
    expect(layout.eyes.map((eye) => eye.radius)).toEqual([expect.closeTo(EYE.r, 2), expect.closeTo(EYE.r, 2)]);
    const mouth = layout.mouth!;
    expect(mouth).not.toBeNull();
    const n = mouth.line.length / 2, middle = mouth.line[Math.floor(n / 2) * 2 + 1]!;
    expect(middle).toBeCloseTo(LINE - EYE.y, 2);
    // Its corners, where the paint ends, and higher than its middle: a smile.
    expect(mouth.from).toBeCloseTo(-HALF, 2);
    expect(mouth.to).toBeCloseTo(HALF, 2);
    expect(mouth.line[1]!).toBeGreaterThan(middle + 0.003);
    expect(mouth.lip.r).toBeCloseTo(LIP[0]!, 1);
    expect(mouth.grin).toBeNull();
  });

  it('opens its mouth down from the painted line, lies hidden while shut, and closes its lids over the eyes', () => {
    const { model, painted } = head();
    const face = faceOf(model)!;
    expect(face).not.toBeNull();
    const mesh = face.mesh;
    // On the body's own skeleton, with a copy of its own material and its four colour channels: no new shader.
    expect(mesh.skeleton).toBe(painted.skeleton);
    expect(mesh.material).not.toBe(painted.material);
    expect((mesh.material as MeshStandardMaterial).type).toBe((painted.material as MeshStandardMaterial).type);
    expect(mesh.geometry.getAttribute('color').itemSize).toBe(4);
    expect(mesh.visible).toBe(false);
    expect(mesh.userData.idle).toBe(true);
    const mouthCorners = 16 * 17;
    face.set(0.3, 0, 0);
    expect(mesh.visible).toBe(true);
    const little = span(mesh, 0, mouthCorners);
    face.set(1, 0, 0);
    const wide = span(mesh, 0, mouthCorners);
    expect(wide[0]).toBeLessThan(little[0] - 0.01);
    // Wide open, as far under the line as a third of the eyes' spacing; its top stays at the painted line.
    expect(MIDDLE + LINE - wide[0]).toBeGreaterThan(0.25 * 2 * EYE.x);
    expect(wide[1]).toBeCloseTo(little[1], 2);
    face.set(0, 0, 0);
    expect(mesh.visible).toBe(false);
    // The lids: tucked over the eye open, down over it shut.
    const lids = [mouthCorners, mesh.geometry.getAttribute('position').count] as const;
    face.set(0, 0, 0);
    const open = span(mesh, ...lids);
    face.set(0, 0, 1);
    const shut = span(mesh, ...lids);
    // The eye's middle in the model (the Head bone stands at y 1), and the bottom of its opening in the face.
    const eye = face.layout.eyes[0]!, middle = eye.centre.y + 1;
    expect(open[0]).toBeGreaterThan(middle + eye.radius * Math.sin(eye.top));
    expect(shut[0]).toBeLessThan(middle - eye.radius * Math.sin(eye.bottom));
    expect(mesh.visible).toBe(true);
  });

  it('is made once for a model, and not for a body without eyes to measure it by', () => {
    const { model } = head();
    expect(faceOf(model)).toBe(faceOf(model));
    expect(model.children.filter((child) => child.name === 'face-parts')).toHaveLength(1);
    expect(faceOf(head(false).model)).toBeNull();
  });
});
