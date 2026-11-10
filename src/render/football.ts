import { BufferGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, MeshStandardMaterial, Vector3 } from 'three';

// An inflated, truncated icosahedron: twelve dark pentagons and twenty pale hexagons.
// Each panel owns its vertices. Its colour therefore cannot blur across a neighbouring panel's triangles.
const PALE = new Color('#f2eee4');
const DARK = new Color('#20262a');
const SEAM = new Color('#555953');
const DIVISIONS = 3;
const GROOVE_RADIUS = 0.992;

interface Corner { position: Vector3; normal: Vector3; colour: Color }

/** The shared unit-radius skin; callers keep their existing size, centre, spin and collision shape. */
export function footballGeometry(): BufferGeometry {
  const ico = new IcosahedronGeometry(1, 0), points: Vector3[] = [], faces: number[][] = [];
  const source = ico.getAttribute('position');
  for (let i = 0; i < source.count; i += 3) {
    const face: number[] = [];
    for (let j = 0; j < 3; j++) {
      const point = new Vector3().fromBufferAttribute(source, i + j);
      let index = points.findIndex(old => old.distanceToSquared(point) < 1e-10);
      if (index === -1) { index = points.length; points.push(point); }
      face.push(index);
    }
    faces.push(face);
  }
  ico.dispose();
  const neighbours = points.map(() => new Set<number>());
  for (const face of faces) for (let i = 0; i < 3; i++) {
    const a = face[i]!, b = face[(i + 1) % 3]!;
    neighbours[a]!.add(b); neighbours[b]!.add(a);
  }
  // Cutting each old edge at one third gives the football's sixty actual panel corners.
  const cut = (a: number, b: number) => points[a]!.clone().multiplyScalar(2).add(points[b]!).normalize();
  const panels: { corners: Vector3[]; colour: Color }[] = points.map((centre, i) => {
    const across = new Vector3().crossVectors(centre, Math.abs(centre.y) < .9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
    const up = new Vector3().crossVectors(centre, across);
    const corners = [...neighbours[i]!].map(j => cut(i, j));
    corners.sort((a, b) => Math.atan2(a.dot(up), a.dot(across)) - Math.atan2(b.dot(up), b.dot(across)));
    return { corners, colour: DARK };
  });
  for (const [a, b, c] of faces as [number, number, number][]) {
    panels.push({ corners: [cut(a, b), cut(b, a), cut(b, c), cut(c, b), cut(c, a), cut(a, c)], colour: PALE });
  }

  const positions: number[] = [], normals: number[] = [], colours: number[] = [];
  const edge = new Vector3(), cross = new Vector3();
  function triangle(a: Corner, b: Corner, c: Corner): void {
    // Both face windings arrive here; the rounded skin must always face outwards.
    cross.crossVectors(edge.subVectors(b.position, a.position), new Vector3().subVectors(c.position, a.position));
    if (cross.dot(a.position) < 0) [b, c] = [c, b];
    for (const v of [a, b, c]) {
      positions.push(v.position.x, v.position.y, v.position.z);
      normals.push(v.normal.x, v.normal.y, v.normal.z);
      colours.push(v.colour.r, v.colour.g, v.colour.b);
    }
  }
  const skin = (position: Vector3, colour: Color, radius = 1): Corner => ({ position: position.clone().multiplyScalar(radius), normal: position, colour });
  const between = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t).normalize();
  const inset = (point: Vector3, centre: Vector3, angle: number) => {
    const inward = centre.clone().addScaledVector(point, -centre.dot(point)).normalize();
    return point.clone().multiplyScalar(Math.cos(angle)).addScaledVector(inward, Math.sin(angle));
  };

  for (const { corners, colour } of panels) {
    const centre = corners.reduce((sum, p) => sum.add(p), new Vector3()).normalize();
    const floor = corners.map(p => inset(p, centre, .004));
    const lip = corners.map(p => inset(p, centre, .012));
    for (let side = 0; side < corners.length; side++) {
      const next = (side + 1) % corners.length;
      // The channel is narrow and recessed. Its little rounded lip catches the floodlights without a glossy toy finish.
      for (let step = 0; step < DIVISIONS; step++) {
        const ends = [step / DIVISIONS, (step + 1) / DIVISIONS];
        const outer = ends.map(t => skin(between(corners[side]!, corners[next]!, t), SEAM, GROOVE_RADIUS));
        const inner = ends.map(t => {
          const p = between(floor[side]!, floor[next]!, t);
          const inward = centre.clone().addScaledVector(p, -centre.dot(p)).normalize();
          return { position: p.clone().multiplyScalar(GROOVE_RADIUS), normal: p.clone().addScaledVector(inward, -.45).normalize(), colour: SEAM };
        });
        const panel = ends.map(t => skin(between(lip[side]!, lip[next]!, t), colour));
        for (const [a, b] of [[outer, inner], [inner, panel]]) {
          triangle(a![0]!, a![1]!, b![1]!); triangle(a![0]!, b![1]!, b![0]!);
        }
      }
      // Tessellate on the sphere, with radial normals: the silhouette and lighting stay round even close to Elof.
      const rows: Corner[][] = [];
      for (let row = 0; row <= DIVISIONS; row++) {
        rows.push(Array.from({ length: row + 1 }, (_, column) => skin(centre.clone().multiplyScalar(1 - row / DIVISIONS)
          .addScaledVector(lip[side]!, (row - column) / DIVISIONS).addScaledVector(lip[next]!, column / DIVISIONS).normalize(), colour)));
      }
      for (let row = 0; row < DIVISIONS; row++) for (let column = 0; column <= row; column++) {
        triangle(rows[row]![column]!, rows[row + 1]![column]!, rows[row + 1]![column + 1]!);
        if (column < row) triangle(rows[row]![column]!, rows[row + 1]![column + 1]!, rows[row]![column + 1]!);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** One material and no downloaded texture for static, pushed, rolling and ridden footballs. */
export const footballMaterial = () => new MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: 0 });
