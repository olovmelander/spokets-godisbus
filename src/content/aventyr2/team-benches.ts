import { BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Quaternion, Shape, ShapeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ExtraContext, ViewExtra } from '../../render/extensions';
import { paint } from './buildings';
import { TEAM_BENCHES } from './chapters/olympia';

/**
 * Olympia's two team benches by the touchline (Olov's playthrough pass, 12 November 2026): "Spring förbi bänkarna mellan
 * dropparna" said where nothing stood, and the drops fell out of the sky. Each is the kind every Swedish club ground
 * has: a row of plain blue seats under a curved clear shell on a dark steel frame, open towards the pitch. They stand on
 * the touchline just behind the path; the shell's front lip reaches over it, and the drops that pour off the lip are the
 * chapter's drips (`TEAM_BENCHES` and `DRIPS` in ./chapters/olympia.ts). Ribs cross the shell where its joints are, one
 * over each drip, so the water runs down a joint and off the lip there. No mark, name or crest on any of it.
 *
 * Picture only: the simulation has the drips, as before. Two draws for both benches: the steel and the seats in one
 * mesh, the clear shell in the other.
 */

/** The shell's profile across the bench, in EL: its back wall, and the hood that curves over to its lip. */
export const SHELL = { back: -3.3, wall: 5, lip: { z: 0.3, y: 5.85 }, peak: 7.4 };
/** The end panels and their posts stop here, behind the path, so that he never walks through a pane. */
const SIDE = -1.4;
const STEEL = '#3b4148';
const SEAT = '#2f5b8c';

/** A point on the hood, from the top of the back wall (0) to the lip (1): a cubic curve through the peak. */
export function hood(t: number): { z: number; y: number } {
  const p0 = { z: SHELL.back, y: SHELL.wall };
  const p1 = { z: SHELL.back, y: SHELL.peak };
  const p2 = { z: -0.9, y: SHELL.peak + 0.2 };
  const p3 = SHELL.lip;
  const u = 1 - t;
  const [a, b, c, d] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return { z: a * p0.z + b * p1.z + c * p2.z + d * p3.z, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** The whole profile, from the back wall's foot over the hood to the lip. */
function profile(steps = 14): { z: number; y: number }[] {
  return [{ z: SHELL.back, y: 0.05 }, ...Array.from({ length: steps + 1 }, (_, i) => hood(i / steps))];
}

/** The hood's height over a place across the bench, for the end panels and their posts. */
function hoodAt(z: number): number {
  let best = hood(0);
  for (let i = 0; i <= 64; i++) {
    const p = hood(i / 64);
    if (Math.abs(p.z - z) < Math.abs(best.z - z)) best = p;
  }
  return best.y;
}

/** A round rod from one point to another, painted. */
function rod(a: Vector3, b: Vector3, r: number, colour: string): BufferGeometry {
  const along = b.clone().sub(a);
  const g = new CylinderGeometry(r, r, along.length(), 6).applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), along.clone().normalize()));
  return paint(g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), colour);
}

/** The clear shell over one bench: the back wall and the hood as one sheet along x, and an end panel at each end. */
function shell(from: number, to: number): BufferGeometry[] {
  const line = profile();
  const position: number[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [p, q] = [line[i]!, line[i + 1]!];
    position.push(from, p.y, p.z, to, p.y, p.z, to, q.y, q.z, from, p.y, p.z, to, q.y, q.z, from, q.y, q.z);
  }
  const sheet = new BufferGeometry();
  sheet.setAttribute('position', new Float32BufferAttribute(position, 3));
  sheet.computeVertexNormals();
  // An end panel, from the back wall to the post at `SIDE`, under the hood.
  const outline = new Shape();
  outline.moveTo(SHELL.back, 0.05);
  outline.lineTo(SIDE, 0.05);
  for (let i = 64; i >= 0; i--) {
    const p = hood(i / 64);
    if (p.z <= SIDE) outline.lineTo(p.z, p.y);
  }
  const ends = [from, to].map((x) => {
    const g = new ShapeGeometry(outline).rotateY(-Math.PI / 2).translate(x, 0, 0);
    g.deleteAttribute('uv');
    return g.toNonIndexed();
  });
  return [sheet, ...ends];
}

/** The steel frame and the seats of one bench, with a rib over each drip: one geometry in vertex colours. */
function frame(from: number, to: number, ribs: readonly number[]): BufferGeometry[] {
  const at = (x: number, y: number, z: number) => new Vector3(x, y, z);
  const parts: BufferGeometry[] = [];
  const arch = (x: number, r: number) => {
    const line = profile(10);
    for (let i = 1; i < line.length - 1; i++) parts.push(rod(at(x, line[i]!.y, line[i]!.z), at(x, line[i + 1]!.y, line[i + 1]!.z), r, STEEL));
  };
  // Each end: the back post, the arch over to the lip, and a post at the front of the end panel.
  for (const x of [from, to]) {
    parts.push(rod(at(x, 0, SHELL.back), at(x, SHELL.wall, SHELL.back), 0.11, STEEL));
    arch(x, 0.09);
    parts.push(rod(at(x, 0, SIDE), at(x, hoodAt(SIDE), SIDE), 0.1, STEEL));
  }
  // The joints in the shell, where the water runs down to the lip.
  for (const x of ribs) arch(x, 0.05);
  // Along the lip, along the top of the back wall, and along the foot.
  parts.push(rod(at(from, SHELL.lip.y, SHELL.lip.z), at(to, SHELL.lip.y, SHELL.lip.z), 0.08, STEEL));
  parts.push(rod(at(from, SHELL.wall, SHELL.back), at(to, SHELL.wall, SHELL.back), 0.07, STEEL));
  parts.push(rod(at(from, 0.08, SHELL.back), at(to, 0.08, SHELL.back), 0.07, STEEL));
  // A row of plain blue seats on a steel beam, with their backs to the back wall.
  const beam = { y: 1.3, z: -2.55 };
  parts.push(paint(new BoxGeometry(to - from - 0.8, 0.18, 0.22).translate((from + to) / 2, beam.y, beam.z), STEEL));
  for (const x of [from + 0.7, (from + to) / 2, to - 0.7]) parts.push(paint(new BoxGeometry(0.16, beam.y, 0.16).translate(x, beam.y / 2, beam.z), STEEL));
  const seats = Math.floor((to - from - 0.6) / 1.15);
  const first = (from + to) / 2 - ((seats - 1) * 1.15) / 2;
  for (let i = 0; i < seats; i++) {
    const x = first + i * 1.15;
    parts.push(paint(new BoxGeometry(0.9, 0.14, 0.82).translate(x, beam.y + 0.17, beam.z + 0.08), SEAT));
    parts.push(paint(new BoxGeometry(0.9, 0.86, 0.12).rotateX(-0.12).translate(x, beam.y + 0.68, beam.z - 0.38), SEAT));
  }
  return parts;
}

/** Olympia's team benches (registered by ./render.ts). Other chapters get nothing. */
export function teamBenchesExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (chapter.id !== 'olympia') return null;
  const benches = new Group();
  benches.name = 'team-benches';
  const drips = (chapter.drips ?? []).map((drip) => drip.at.x);
  const ribs = (from: number, to: number) => drips.filter((x) => x > from && x < to);
  const steel = mergeGeometries(TEAM_BENCHES.flatMap(({ from, to }) => frame(from, to, ribs(from, to))));
  const clear = mergeGeometries(TEAM_BENCHES.flatMap(({ from, to }) => shell(from, to)));
  if (!steel || !clear) return null;
  benches.add(new Mesh(steel, new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 })));
  // Clear polycarbonate, wet: faintly blue, catching the light along its curve.
  const pane = new Mesh(clear, new MeshStandardMaterial({
    color: '#cfe4ee', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false, side: DoubleSide,
    emissive: '#1d2c34', emissiveIntensity: 0.6,
  }));
  pane.renderOrder = 2;
  benches.add(pane);
  scene.add(benches);
  return { update() {} };
}
