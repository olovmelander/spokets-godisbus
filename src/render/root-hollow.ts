import {
  CatmullRomCurve3, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry,
  TubeGeometry, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../sim/types';
import { glowTexture } from './glow';

/**
 * Stormskogen's dark hollow under the roots, where Klonk shows the old one's memory (`ss:minnet`; Elof: "En mörk håla.
 * Vad tänker du på, Klonk?"). It is what a storm leaves where it fells a spruce ("Stormen fällde granar som
 * tändstickor!"): the tree's root plate, torn up and standing on its edge behind the pit it came out of, and the stem
 * lying away from it into the forest.
 *
 * Olov, 14 November 2026: "Rotvältan som man kommer till efter att Elof har använt Klonk som en bro behöver modelleras
 * bättre och få snyggare design och texturer." It was a smooth brown disc with a few grey stones and thin streaks, made
 * here in code. Now it is modelled in Blender (the nature kit's `rotvalta`, art/blender/a2-nature.py): thick roots out
 * from the stem's foot like spokes, snapped pale where they tore; thinner roots forking off them; fine roots hanging
 * like hair; rust-brown earth with stones held in it, and the moss of the forest floor peeled up over its rim; loose
 * earth fallen at its foot; and behind it the stem, with its boughs still green. Its bark, earth, stones and moss are
 * drawn on it seen close, and it is wet in the rain (./old-wood.ts).
 *
 * It stands turned a little towards where he comes from, so that he sees its roots as he comes down off the fallen
 * trunk, and its stem lies away to the right behind the path. All of it is behind the plane he moves in: nothing covers
 * him, Klonk, the candy or the thought. Until the kit has come, and where it is not, a plain plate of earth with a few
 * roots stands there. Sizes in EL: the plate is about five of him across.
 */
export const ROOT_HOLLOW = {
  /** Where the plate's middle is from the hollow's, how far behind the play plane, and how it is turned (its roots a little to the left). */
  x: 0.9,
  z: -3.5,
  turn: -0.72,
  /** The plate: how wide across (its radius), and how high its middle is over the hollow's floor (the kit's `PLATE_MIDDLE`). */
  radius: 2.5,
  middle: 1.9,
};

/** Numbers from 0 to 1, the same each time it is built. */
const draw = (i: number, k: number) => {
  const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** A root along `points`, `thick` at its first point and thinning to a fifth of that at its tip. */
function root(points: Vector3[], thick: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points);
  const segments = 8, sides = 5;
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

/**
 * What stands there until the kit's root plate has come: a plate of dark earth on its edge, its roots out round it like
 * spokes. In its own space, as the kit's: its foot on the hollow's floor, its roots towards the camera.
 */
function standIn(): Mesh {
  const { radius, middle } = ROOT_HOLLOW;
  const plate = new SphereGeometry(1, 20, 10);
  const at = plate.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), round = Math.atan2(y, x);
    const rag = 1 + 0.08 * Math.sin(round * 5 + 0.7) + 0.05 * Math.sin(round * 11 + 2.1);
    at.setXYZ(i, x * radius * rag, y * radius * 0.92 * rag, at.getZ(i) * 0.36);
  }
  plate.computeVertexNormals();
  plate.translate(0, middle, 0);
  const roots: BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const round = (i / 10) * Math.PI * 2 + 0.3 * draw(i, 1);
    const out = new Vector3(Math.cos(round), Math.sin(round), 0);
    const from = new Vector3(0, middle, 0.34).addScaledVector(out, 0.2);
    const mid = new Vector3(0, middle, 0.3).addScaledVector(out, radius * 0.6).add(new Vector3(0, 0.2 * (draw(i, 2) - 0.5), 0));
    const tip = new Vector3(0, middle, 0.1).addScaledVector(out, radius * (1.05 + 0.4 * draw(i, 3)));
    roots.push(root([from, mid, tip], 0.2));
  }
  const parts = [painted(plate, '#6a4a30'), ...roots.map((part) => painted(part, '#8a6a4c'))].map((part) => (part.index ? part.toNonIndexed() : part));
  const mesh = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  parts.forEach((part) => part.dispose());
  return mesh;
}

/** The hollow under the roots, at the spot `ss:hollow` of the chapter; null where there is none. */
export function rootHollow(chapter: ChapterData): Group | null {
  const spot = chapter.spots?.find((one) => one.id === 'ss:hollow');
  if (!spot) return null;
  const group = new Group();
  group.name = 'root-hollow';
  group.position.set(spot.at.x + ROOT_HOLLOW.x, spot.at.y, ROOT_HOLLOW.z);
  // The kit's root plate takes the stand-in's place when it has come (./shared-models.ts), turned as the stand-in is.
  const plate = new Group();
  plate.name = 'root-plate';
  plate.userData.model = 'rotvalta';
  plate.userData.turn = ROOT_HOLLOW.turn;
  plate.userData.disposeFallback = true;
  const waiting = standIn();
  waiting.rotation.y = ROOT_HOLLOW.turn;
  plate.add(waiting);
  // Its shadow on the floor of the hollow, under the plate where it leans out over the pit.
  const shadow = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({
    color: '#000000', map: glowTexture(32), transparent: true, opacity: 0.5, depthWrite: false,
  }));
  shadow.name = 'root-plate-shadow';
  shadow.scale.set(ROOT_HOLLOW.radius * 2.6, 1, 3.4);
  shadow.position.set(-0.3, 0.03, 1.5);
  shadow.renderOrder = 1;
  group.add(plate, shadow);
  return group;
}
