import { BufferGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { footballGeometry, footballMaterial } from '../../render/football';

/**
 * The ball bag at the foot of Olympia's fence, torn open by the wind (../chapters/olympia.ts): the small balls the wind
 * rolls across the pitch come out of it. It was drawn as one football as big as the one in the puzzle, a radius of 0.75,
 * which a child could take for something to kick; the rolling balls are smaller (0.45). Now it is a dark net sack lying
 * on its side, torn open towards the pitch, with three of the small balls still in it and one rolled out.
 * Two draws: the net, and the balls.
 */

/** The sack: how long it lies, how high and deep it is, and where it is torn open (towards +x, round its end). */
const SACK = { long: 1.35, high: 0.8, deep: 0.85, opening: 1 };
/** The small balls: their radius (the rollers' is 0.45, a little squashed in the picture), and where each lies. */
const BALL = 0.42;
const BALLS = [
  { x: -0.55, y: BALL, z: 0.12 },
  { x: 0.25, y: BALL, z: -0.22 },
  { x: -0.2, y: BALL * 2.4, z: -0.02 },
  { x: 2.15, y: BALL, z: 0.32 },
];

/** A thin cord from one point to another. */
function cord(a: Vector3, b: Vector3): BufferGeometry {
  const along = b.clone().sub(a);
  const g = new CylinderGeometry(0.022, 0.022, along.length(), 4, 1, true);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), along.clone().normalize()));
  g.deleteAttribute('uv');
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/** A point on the sack's skin: `around` the long axis, and `along` it from its closed end (-1) to its open one (1). */
function skin(along: number, around: number): Vector3 {
  // Rounded at both ends, lying on the turf, its top sagging a little under its own weight.
  const r = Math.sqrt(Math.max(0, 1 - along * along));
  const up = Math.sin(around);
  return new Vector3(along * SACK.long, SACK.high * (1 + r * up * (up > 0 ? 0.85 : 1)), r * SACK.deep * Math.cos(around));
}

export function ballBag(): Group {
  const group = new Group();
  const cords: BufferGeometry[] = [];
  // Lengthwise strands, and rings round it: a net in diamonds. Towards the open end the strands stop at a ragged edge.
  const edge = (around: number) => SACK.opening * (0.55 + 0.18 * Math.sin(around * 3.7 + 0.6));
  const rows = 9;
  for (let k = 0; k < 14; k++) {
    const around = (k / 14) * Math.PI * 2;
    for (let i = 0; i < rows; i++) {
      const [a, b] = [-0.98 + (1.96 * i) / rows, -0.98 + (1.96 * (i + 1)) / rows];
      if (b > edge(around)) break;
      cords.push(cord(skin(a, around), skin(b, around)));
    }
  }
  for (let ring = 1; ring < rows; ring++) {
    const along = -0.98 + (1.96 * ring) / rows;
    for (let k = 0; k < 28; k++) {
      const [a, b] = [(k / 28) * Math.PI * 2, ((k + 1) / 28) * Math.PI * 2];
      if (along > edge(a) || along > edge(b)) continue;
      cords.push(cord(skin(along, a), skin(along, b)));
    }
  }
  const net = mergeGeometries(cords);
  if (net) group.add(new Mesh(net, new MeshStandardMaterial({ color: '#1f2a3c', roughness: 0.8 })));
  const balls = mergeGeometries(BALLS.map((at, i) => footballGeometry().scale(BALL, BALL, BALL).rotateY(i * 1.3).rotateZ(i * 0.7).translate(at.x, at.y, at.z)));
  if (balls) group.add(new Mesh(balls, footballMaterial()));
  return group;
}
