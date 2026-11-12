import { BoxGeometry, BufferGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ExtraContext, ViewExtra } from '../../render/extensions';
import { paint } from './buildings';
import { TEAM_BENCHES } from './chapters/olympia';
import { crestMaterial } from './club-crest';

/**
 * Olympia's two team benches by the touchline (Olov's playthrough pass, 12 November 2026): "Spring förbi bänkarna mellan
 * dropparna" said where nothing stood, and the drops fell out of the sky. Each is a wooden dugout, as at many Swedish club
 * grounds (Olov, 12 November 2026: "Det ska vara röda säten i avbytarbåsen, sen kan man bygga dem i trä istället för
 * glas?"): a back wall and two end walls of upright stained boards, a roof of boards sloping down towards the pitch, on
 * wooden posts, and a row of red seats inside, open towards the pitch. They stand on the touchline just behind the path;
 * the roof's front edge reaches over it, and the drops that pour off that edge are the chapter's drips (`TEAM_BENCHES`
 * and `DRIPS` in ./chapters/olympia.ts). On each back wall hangs Anundsjö IF's crest, the one on Bertil's cap (Olov's
 * exception, 12 November 2026: ./club-crest.ts); no other mark, name or lettering.
 *
 * Picture only: the simulation has the drips, as before. Three draws for both benches: the wood in one mesh, the seats
 * and their steel beam in another, and the two crests in a third.
 */

/** The roof's line across the bench, in EL: the back wall's top, sloping down to the front edge (the lip) over the path. */
export const SHELL = { back: -3.3, wall: 7.1, lip: { z: 0.3, y: 5.85 } };
/** The end walls and their posts stop here, behind the path, so that he never walks through a wall. */
const SIDE = -1.4;
const WOOD = '#7a5636';
const WOOD_DARK = '#5a3e28';
const STEEL = '#3b4148';
const SEAT = '#b8312c';

/** A point on the roof's underside, from the top of the back wall (0) to the lip (1): a straight slope. */
export function hood(t: number): { z: number; y: number } {
  return { z: SHELL.back + (SHELL.lip.z - SHELL.back) * t, y: SHELL.wall + (SHELL.lip.y - SHELL.wall) * t };
}

/** The roof's height over a place across the bench, for the end walls and their posts. */
function hoodAt(z: number): number {
  return hood((z - SHELL.back) / (SHELL.lip.z - SHELL.back)).y;
}

/** A fixed number from 0 to 1 for a board, so each has its own shade and the benches are the same every time. */
function grain(n: number): number {
  const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
}

/** A wood colour a little lighter or darker, board by board. */
function board(n: number, base = WOOD): string {
  const k = 0.82 + 0.3 * grain(n);
  const c = parseInt(base.slice(1), 16);
  const ch = (shift: number) => Math.min(255, Math.round(((c >> shift) & 255) * k)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** A box from one corner to the other, painted. */
function box(a: Vector3, b: Vector3, colour: string): BufferGeometry {
  const size = b.clone().sub(a);
  return paint(new BoxGeometry(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), colour);
}

/** The wooden walls, posts and roof of one bench, in vertex colours. */
function wood(from: number, to: number, seed: number): BufferGeometry[] {
  const at = (x: number, y: number, z: number) => new Vector3(x, y, z);
  const parts: BufferGeometry[] = [];
  let n = seed;
  // The back wall: upright boards with a hair of a gap between them, and a dark sill along their foot.
  for (let x = from; x < to - 0.05; x += 0.5) {
    parts.push(box(at(x + 0.02, 0.05, SHELL.back - 0.12), at(Math.min(x + 0.48, to), SHELL.wall, SHELL.back), board(n++)));
  }
  parts.push(box(at(from, 0, SHELL.back - 0.16), at(to, 0.25, SHELL.back + 0.04), WOOD_DARK));
  // The end walls, from the back wall to the post behind the path, each board up to the roof.
  for (const x of [from, to - 0.12]) {
    for (let z = SHELL.back; z < SIDE - 0.05; z += 0.48) {
      const z1 = Math.min(z + 0.46, SIDE);
      parts.push(box(at(x, 0.05, z), at(x + 0.12, hoodAt(z1), z1), board(n++)));
    }
    // A post at the wall's front, and a beam under the roof from it to the back wall.
    parts.push(box(at(x - 0.04, 0, SIDE - 0.1), at(x + 0.16, hoodAt(SIDE), SIDE + 0.1), board(n++, WOOD_DARK)));
  }
  // The roof: boards running down the slope side by side, each a little proud of the lip, and a fascia board along the
  // front edge where the water runs off.
  const run = new Vector3(0, SHELL.lip.y - SHELL.wall, SHELL.lip.z - SHELL.back);
  const length = run.length() + 0.2;
  const slope = Math.atan2(-run.y, run.z);
  const mid = { y: (SHELL.wall + SHELL.lip.y) / 2 + 0.07, z: (SHELL.back + SHELL.lip.z) / 2 };
  for (let x = from - 0.15; x < to + 0.1; x += 0.56) {
    const w = Math.min(0.54, to + 0.15 - x);
    parts.push(paint(new BoxGeometry(w, 0.12, length).rotateX(slope).translate(x + w / 2, mid.y, mid.z), board(n++)));
  }
  parts.push(box(at(from - 0.15, SHELL.lip.y - 0.3, SHELL.lip.z - 0.02), at(to + 0.15, SHELL.lip.y + 0.12, SHELL.lip.z + 0.1), WOOD_DARK));
  // A beam along the top of the back wall, under the roof.
  parts.push(box(at(from, SHELL.wall - 0.3, SHELL.back), at(to, SHELL.wall, SHELL.back + 0.22), WOOD_DARK));
  return parts;
}

/** The row of red seats of one bench, on a steel beam, with their backs to the back wall. */
function seats(from: number, to: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  const beam = { y: 1.3, z: -2.55 };
  parts.push(paint(new BoxGeometry(to - from - 0.8, 0.18, 0.22).translate((from + to) / 2, beam.y, beam.z), STEEL));
  for (const x of [from + 0.7, (from + to) / 2, to - 0.7]) parts.push(paint(new BoxGeometry(0.16, beam.y, 0.16).translate(x, beam.y / 2, beam.z), STEEL));
  const count = Math.floor((to - from - 0.6) / 1.15);
  const first = (from + to) / 2 - ((count - 1) * 1.15) / 2;
  for (let i = 0; i < count; i++) {
    const x = first + i * 1.15;
    parts.push(paint(new BoxGeometry(0.9, 0.14, 0.82).translate(x, beam.y + 0.17, beam.z + 0.08), SEAT));
    parts.push(paint(new BoxGeometry(0.9, 0.86, 0.12).rotateX(-0.12).translate(x, beam.y + 0.68, beam.z - 0.38), SEAT));
  }
  return parts;
}

/**
 * Where Anundsjö IF's crest hangs in each bench (./club-crest.ts; Olov, 12 November 2026): in the middle of the back
 * wall, on the boards' face, over the seats' backs and under the roof, `size` across.
 */
export const CREST = { y: 4.4, z: SHELL.back + 0.02, size: 2 };
export function crestPlaces(): { x: number; y: number; z: number }[] {
  return TEAM_BENCHES.map(({ from, to }) => ({ x: (from + to) / 2, y: CREST.y, z: CREST.z }));
}

/** Olympia's team benches (registered by ./render.ts). Other chapters get nothing. */
export function teamBenchesExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (chapter.id !== 'olympia') return null;
  const benches = new Group();
  benches.name = 'team-benches';
  const timber = mergeGeometries(TEAM_BENCHES.flatMap(({ from, to }, i) => wood(from, to, i * 100)));
  const chairs = mergeGeometries(TEAM_BENCHES.flatMap(({ from, to }) => seats(from, to)));
  if (!timber || !chairs) return null;
  // Stained wood, wet in the storm: a little sheen.
  benches.add(new Mesh(timber, new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 })));
  // Red plastic seats and their steel beam.
  benches.add(new Mesh(chairs, new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1 })));
  // The club's crest on each back wall, both in one draw (none where there is nothing to draw it with).
  const crest = crestMaterial();
  const plates = mergeGeometries(crestPlaces().map(({ x, y, z }) => new PlaneGeometry(CREST.size, CREST.size).translate(x, y, z)));
  if (crest && plates) {
    const mesh = new Mesh(plates, crest);
    mesh.name = 'club-crest';
    benches.add(mesh);
  }
  scene.add(benches);
  return { update() {} };
}
