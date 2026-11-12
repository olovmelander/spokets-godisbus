import {
  CatmullRomCurve3, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry,
  TubeGeometry, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../sim/types';
import { BARK_ALONG, barkDetail, barky, notBark } from './bark-detail';
import { glowTexture } from './glow';

/**
 * Stormskogen's dark hollow under the roots, where Klonk shows the old one's memory (`ss:minnet`; Elof: "En mörk håla.
 * Vad tänker du på, Klonk?"). It was a grassy dip like any other. Now it is what a storm leaves where it fells a spruce:
 * the tree's root plate, torn up and standing on its edge behind the pit it came out of, earth and stones caught in its
 * roots; roots arch out from it over the hollow on both sides, root hairs hang in front of its face, and the floor
 * under it lies in its shadow. Everything stands behind the plane he moves in, so nothing covers him, Klonk or the
 * candy. Sizes in EL: a felled spruce as thick as the logs across the path has a plate about four of him across.
 */
export const ROOT_HOLLOW = {
  /** The plate: how wide across (its radius), how far behind the play plane its face is, and how high its middle is over the floor. */
  radius: 2.3,
  z: -1.45,
  middle: 1.35,
  /** Where the arching roots come down on either side of the hollow, from its middle, and how far behind the play plane. */
  reach: 2.75,
  front: -0.6,
};

/** Numbers from 0 to 1, the same each time it is built. */
const draw = (i: number, k: number) => {
  const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** A root along `points`, `thick` at its first point and thinning to a fifth of that at its tip. */
function root(points: Vector3[], thick: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points);
  const segments = 14, sides = 6;
  const tube = new TubeGeometry(curve, segments, thick, sides, false);
  const at = tube.getAttribute('position');
  const centre = new Vector3(), p = new Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, centre);
    const keep = 1 - 0.8 * (i / segments);
    for (let j = 0; j <= sides; j++) {
      const n = i * (sides + 1) + j;
      p.fromBufferAttribute(at, n).sub(centre).multiplyScalar(keep).add(centre);
      at.setXYZ(n, p.x, p.y, p.z);
    }
  }
  tube.computeVertexNormals();
  return tube;
}

/** A shape painted one colour on every corner. */
function painted(shape: BufferGeometry, colour: string): BufferGeometry {
  const c = new Color(colour);
  const at = shape.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) colours.set([c.r, c.g, c.b], i * 3);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return shape;
}

const together = (parts: BufferGeometry[]): BufferGeometry => mergeGeometries(parts.map((part) => notBark(part.index ? part.toNonIndexed() : part)));

/** The hollow under the roots, at the spot `ss:hollow` of the chapter; null where there is none. */
export function rootHollow(chapter: ChapterData): Group | null {
  const spot = chapter.spots?.find((one) => one.id === 'ss:hollow');
  if (!spot) return null;
  const { radius, z, middle, reach, front } = ROOT_HOLLOW;
  const floor = spot.at.y;
  const group = new Group();
  group.name = 'root-hollow';
  group.position.set(spot.at.x, floor, 0);

  // The plate: a thick disc of earth on its edge, a little ragged at its rim, leaning back a little, its lower part
  // still in the ground. Its face is dark peat and soil, darkest low down where the hollow goes in under it.
  const plate = new SphereGeometry(1, 28, 14);
  const at = plate.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), zz = at.getZ(i);
    const round = Math.atan2(y, x);
    const rag = 1 + 0.08 * Math.sin(round * 5 + 0.7) + 0.05 * Math.sin(round * 11 + 2.1);
    at.setXYZ(i, x * radius * rag, y * radius * 0.92 * rag, zz * 0.32);
  }
  plate.computeVertexNormals();
  // Soil in patches, the forest floor's moss still on its upper rim, and darker low down where the hollow goes in.
  const soil = [new Color('#9a7550'), new Color('#86653f'), new Color('#ab875e')], moss = new Color('#6f9446'), deep = new Color('#4a3826');
  const tones = new Float32Array(at.count * 3);
  const c = new Color();
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i);
    const out = Math.hypot(x / radius, y / (radius * 0.92));
    const patch = Math.sin(x * 3.1 + y * 1.7) + Math.sin(x * 1.3 - y * 2.9);
    c.copy(soil[patch > 0.6 ? 2 : patch < -0.6 ? 1 : 0]!);
    if (y > 0.25 * radius && out > 0.8) c.lerp(moss, Math.min(1, (out - 0.8) / 0.12));
    if (y < -0.3) c.lerp(deep, Math.min(0.7, (-0.3 - y) / 1.4));
    tones.set([c.r, c.g, c.b], i * 3);
  }
  plate.setAttribute('color', new Float32BufferAttribute(tones, 3));
  plate.rotateX(-0.12).translate(0, middle, z - 0.32);

  // Stones caught in the roots, on the plate's face.
  const stones = [[-1.1, 0.5, 0.28], [0.9, 1.9, 0.22], [1.3, 0.2, 0.3], [-0.4, 2.3, 0.18], [-1.5, 2, 0.16]].map(([x, y, size]) =>
    painted(new SphereGeometry(size!, 8, 6).scale(1.2, 0.85, 0.7).translate(x!, middle - radius + 0.4 + y!, z + 0.02), '#a3a49c'));

  // Roots torn out round its rim, short and crooked, every way but down: some droop, some stand out stiff.
  const roots: BufferGeometry[] = [];
  const jitter = (i: number, k: number, size: number) => new Vector3((draw(i, k) - 0.5) * size, (draw(i, k + 1) - 0.5) * size, 0);
  for (let i = 0; i < 20; i++) {
    const round = -0.15 + (Math.PI + 0.3) * (i / 19) + (draw(i, 1) - 0.5) * 0.15;
    const out = new Vector3(Math.cos(round), Math.sin(round), 0);
    const from = new Vector3(out.x * radius * 0.9, middle + out.y * radius * 0.84, z - 0.1);
    const long = 0.35 + 0.65 * draw(i, 2);
    const droop = draw(i, 3) < 0.5 ? 0.3 * long : 0.05;
    const a = from.clone().addScaledVector(out, long * 0.4).add(jitter(i, 4, 0.18)).add(new Vector3(0, 0, 0.08));
    const tip = from.clone().addScaledVector(out, long).add(new Vector3(0, -droop, 0.18)).add(jitter(i, 6, 0.2));
    roots.push(root([from, a, tip], 0.035 + 0.05 * draw(i, 8)));
  }
  // Broken root ends standing out of its face, towards him.
  for (let i = 0; i < 14; i++) {
    const round = draw(i, 9) * Math.PI * 2, out = 0.25 + 0.6 * draw(i, 10);
    const from = new Vector3(Math.cos(round) * out * radius, middle + Math.sin(round) * out * radius * 0.8 + 0.3, z + 0.02);
    if (from.y < 0.5) continue;
    const tip = from.clone().add(new Vector3((draw(i, 11) - 0.5) * 0.3, -0.05 - 0.15 * draw(i, 12), 0.25 + 0.25 * draw(i, 13)));
    roots.push(root([from, from.clone().lerp(tip, 0.5).add(jitter(i, 14, 0.06)), tip], 0.03 + 0.03 * draw(i, 16)));
  }
  // A thick root on each side arches out over the hollow and down into the ground at its rim: under them it is a cave
  // mouth. Not the same on both sides, as roots are not. They come down behind the plane he moves in.
  for (const [side, high, thick] of [[-1, 0.15, 0.15], [1, -0.35, 0.12]] as const) {
    const from = new Vector3(side * 0.8, middle + radius * 0.7 + high, z + 0.05);
    const top = new Vector3(side * 1.8, middle + radius * 0.6 + high * 0.6, (z + front) / 2).add(jitter(side + 3, 17, 0.2));
    const down = new Vector3(side * reach, 0.85 + high * 0.3, front);
    roots.push(root([from, top, down], thick));
  }
  // Root hairs hanging over its face, short of the floor.
  for (let i = 0; i < 7; i++) {
    const x = -1.4 + 2.8 * (i / 6) + (draw(i, 5) - 0.5) * 0.3;
    const from = new Vector3(x, middle + 0.1 + 0.8 * draw(i, 6), z + 0.08);
    const tip = new Vector3(x + (draw(i, 7) - 0.5) * 0.3, 0.55 + 0.4 * draw(i, 8), z + 0.25);
    roots.push(root([from, from.clone().lerp(tip, 0.5).add(new Vector3(0.05, 0, 0.06)), tip], 0.022));
  }
  const rootShape = together(roots.map((part) => painted(barky(part, BARK_ALONG), '#b09676')));
  roots.forEach((part) => part.dispose());

  const solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  barkDetail(solid);
  const body = new Mesh(together([plate, ...stones]), solid);
  body.name = 'root-plate';
  const hanging = new Mesh(rootShape, solid);
  hanging.name = 'root-plate-roots';
  // Its shadow on the floor of the hollow, under the plate and the arching roots.
  const shadow = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({
    color: '#000000', map: glowTexture(32), transparent: true, opacity: 0.45, depthWrite: false,
  }));
  shadow.name = 'root-plate-shadow';
  shadow.scale.set(radius * 2.4, 1, 1.6);
  shadow.position.set(0, 0.02, z + 0.5);
  shadow.renderOrder = 1;
  group.add(body, hanging, shadow);
  return group;
}
