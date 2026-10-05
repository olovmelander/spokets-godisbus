import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, type CanvasTexture } from 'three';
import type { ChapterData, SurfaceKind } from '../../sim/types';
import { MOSS, drawn, hash, noise, sequence, surfaceAt } from './kit';

// --- L3: the ground ---------------------------------------------------------------------------------------

const SOIL = new Color('#3d2f20');

/** Fine speckles, to be multiplied with the moss's colour: the grain of a moss carpet seen close. */
function speckles(): CanvasTexture {
  const next = sequence(5);
  return drawn(256, 256, (c) => {
    c.fillStyle = '#c9c9c9';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) {
      const light = next() > 0.5;
      const v = light ? 215 + next() * 40 : 120 + next() * 70;
      c.fillStyle = `rgba(${v},${v},${v},${0.35 + next() * 0.4})`;
      const r = 0.6 + next() * 1.9;
      c.beginPath();
      c.arc(next() * 256, next() * 256, r, 0, Math.PI * 2);
      c.fill();
    }
  }, true);
}

/**
 * The ground as a bank of moss: level behind the play plane, and rounding off towards the camera into the
 * dark, instead of ending in a cut face. Across the play plane itself it is as level as the simulation's
 * ground, so that feet stand on it.
 */
const PROFILE = [
  { z: -16, drop: -0.6, shade: 0.62, bump: 0.5 },
  { z: -10, drop: -0.25, shade: 0.72, bump: 0.4 },
  { z: -5.5, drop: 0, shade: 0.84, bump: 0.26 },
  { z: -2.6, drop: 0, shade: 0.94, bump: 0.14 },
  { z: -0.9, drop: 0, shade: 1, bump: 0.05 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: 0.45, drop: 0, shade: 1, bump: 0 },
  { z: 0.95, drop: 0.07, shade: 0.95, bump: 0.05 },
  { z: 1.5, drop: 0.4, shade: 0.8, bump: 0.12 },
  { z: 2.1, drop: 1.2, shade: 0.62, bump: 0.12 },
  { z: 2.6, drop: 3, shade: 0.44, bump: 0.05 },
  { z: 2.9, drop: 16, shade: 0.26, bump: 0 },
];
/** The shade is cool: what the sun doesn't reach is lit by the sky. */
const SHADE = new Color('#27413f');

/** The edge of a deck: level to its front, then the board's end, and the dark under it. */
const PROFILE_BOARD = [
  { z: -16, drop: 0, shade: 0.7, bump: 0 },
  { z: -10, drop: 0, shade: 0.8, bump: 0 },
  { z: -5.5, drop: 0, shade: 0.9, bump: 0 },
  { z: -2.6, drop: 0, shade: 0.96, bump: 0 },
  { z: -0.9, drop: 0, shade: 1, bump: 0 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: 0.45, drop: 0, shade: 1, bump: 0 },
  { z: 1.1, drop: 0, shade: 1, bump: 0 },
  { z: 1.1, drop: 0.22, shade: 0.8, bump: 0 },
  { z: 0.85, drop: 0.24, shade: 0.3, bump: 0 },
  { z: 0.85, drop: 1.4, shade: 0.14, bump: 0 },
  { z: 0.85, drop: 16, shade: 0.06, bump: 0 },
];

/** The bog's ground: as the bank in front, and sinking under the water behind the path. */
const PROFILE_ISLAND = PROFILE.map((row, i) => (i < 3 ? { ...row, drop: [3.2, 1.7, 0.3][i]!, bump: row.bump * 0.6 } : row));

/** What the ground is made of: a place's own, or what a chapter marks a stretch as. */
export type Ground = 'moss' | 'lawn' | 'sphagnum' | 'granite' | SurfaceKind;
interface GroundLook {
  /** Four tones, from deep to bright. */
  colours: Color[];
  /** A wall's face, and what the shade goes towards. */
  wall: Color;
  shade: Color;
  /** How much it rolls: 1 as moss does, 0 for something built. */
  bump: number;
  /** Boards: a straight front edge, a tone for each board, and the boards' drawing. */
  boards: boolean;
  /** It goes down into the water behind the path: the bog's ground is islands. */
  sinks?: boolean;
}
const tones = (...hex: string[]) => hex.map((h) => new Color(h));
const GROUNDS: Record<Ground, GroundLook> = {
  moss: { colours: MOSS, wall: SOIL, shade: SHADE, bump: 1, boards: false },
  lawn: { colours: tones('#3f6a22', '#5c962b', '#7fb238', '#aecb52'), wall: new Color('#4a3826'), shade: new Color('#2a4a3a'), bump: 0.8, boards: false },
  sphagnum: { colours: tones('#6e3226', '#8f4d2b', '#7d8a36', '#bca94c'), wall: new Color('#2e241c'), shade: new Color('#2a3438'), bump: 1, boards: false, sinks: true },
  granite: { colours: tones('#8a8d94', '#a0a3a8', '#b6b7b8', '#cfccc8'), wall: new Color('#6a6c72'), shade: new Color('#3a3848'), bump: 0.25, boards: false },
  wood: { colours: tones('#a48a69', '#b49a78', '#c2a988', '#ccb696'), wall: new Color('#a38866'), shade: new Color('#1d1712'), bump: 0, boards: true },
  earth: { colours: tones('#57432e', '#695037', '#7a5e41', '#8a6c4b'), wall: new Color('#4a3826'), shade: new Color('#1f1a16'), bump: 0.5, boards: false },
  stone: { colours: tones('#767879', '#8a8c8a', '#9b9c97', '#adaca4'), wall: new Color('#6f7172'), shade: new Color('#2c3438'), bump: 0.3, boards: false },
  shavings: { colours: tones('#d6bb8a', '#e3cb9b', '#eedab0', '#f5e6c4'), wall: new Color('#cbb07d'), shade: new Color('#6a5a40'), bump: 0.6, boards: false },
  hedge: { colours: tones('#1f4a1c', '#2f6424', '#3f7a2a', '#588c34'), wall: new Color('#254a1e'), shade: new Color('#16301c'), bump: 1.3, boards: false },
  // The village street: pale slabs, dark asphalt with a little grit, and the grate's iron.
  paving: { colours: tones('#9c9a94', '#aeaca5', '#bdbbb3', '#cbc8be'), wall: new Color('#8e8c88'), shade: new Color('#3a3c44'), bump: 0, boards: false },
  asphalt: { colours: tones('#4c4f56', '#575a61', '#62656b', '#70727a'), wall: new Color('#45484e'), shade: new Color('#24262c'), bump: 0.12, boards: false },
  iron: { colours: tones('#2e3136', '#383b41', '#44474d', '#52555b'), wall: new Color('#26282c'), shade: new Color('#14161a'), bump: 0, boards: false },
};
/** How wide a deck board is: 12 cm. */
export const BOARD = 0.8;

export function toneAt(kind: Ground, x: number, z: number, out: Color): Color {
  const look = GROUNDS[kind];
  const n = look.boards ? hash(Math.floor(x / BOARD), 3) : noise(x * 0.42 + 3, z * 0.6 + 11) * 0.65 + noise(x * 1.9, z * 2.3) * 0.35;
  const at = Math.min(2.999, Math.max(0, n * 3.4 - 0.2));
  const i = Math.floor(at);
  return out.copy(look.colours[i]!).lerp(look.colours[i + 1]!, at - i);
}

/** Deck boards, two to a tile: the grain runs along each, and a dark gap lies between them. */
export function boards(): CanvasTexture {
  const next = sequence(43);
  return drawn(128, 128, (c) => {
    c.fillStyle = '#d6d2cc';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) {
      const x = next() * 128;
      const v = next() < 0.5 ? 150 + next() * 50 : 225 + next() * 30;
      c.strokeStyle = `rgba(${v},${v},${v},${0.25 + next() * 0.3})`;
      c.lineWidth = 0.6 + next() * 1.6;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (next() - 0.5) * 3, 40, x + (next() - 0.5) * 3, 90, x, 128);
      c.stroke();
    }
    c.fillStyle = 'rgba(30,22,16,0.9)';
    for (const x of [0, 62, 126]) c.fillRect(x, 0, 2.5, 128);
  }, true);
}

interface BankPoint {
  x: number;
  y: number;
  wall: boolean;
  kind: Ground;
}

/** The ground of a chapter, as one mesh for each stretch of one kind of ground. */
export function bank(chapter: ChapterData, own: Ground): Group {
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const outline = [{ x: first.x - 16, y: first.y }, ...line, { x: last.x + 16, y: last.y }];
  // Points along the outline, close enough together for the moss to roll. A wall keeps its two corners.
  const points: BankPoint[] = [];
  let before = false;
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!;
    const b = outline[i + 1]!;
    const dx = b.x - a.x;
    const steep = Math.abs(b.y - a.y) > Math.abs(dx) * 1.3;
    const pieces = Math.max(1, Math.ceil(Math.abs(dx) / 0.45));
    for (let k = 0; k < pieces; k++) {
      const x = a.x + (dx * k) / pieces;
      // The corner at a wall's top or foot is a wall's too.
      points.push({ x, y: a.y + ((b.y - a.y) * k) / pieces, wall: steep || before, kind: surfaceAt(chapter, x) ?? own });
      before = steep;
    }
  }
  points.push({ x: last.x + 16, y: last.y, wall: false, kind: own });

  const maps = { speckles: speckles(), boards: boards() };
  const group = new Group();
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i < points.length && points[i]!.kind === points[start]!.kind) continue;
    // A stretch takes the next one's first point too, so that the two meet.
    group.add(stretchOfGround(points.slice(start, Math.min(points.length, i + 1)), points[start]!.kind, maps));
    start = i;
  }
  return group;
}

function stretchOfGround(points: BankPoint[], kind: Ground, maps: { speckles: CanvasTexture; boards: CanvasTexture }): Mesh {
  const look = GROUNDS[kind];
  const profile = look.boards ? PROFILE_BOARD : look.sinks ? PROFILE_ISLAND : PROFILE;
  const position: number[] = [];
  const colour: number[] = [];
  const uv: number[] = [];
  const c = new Color();
  const tile = look.boards ? 1 / (BOARD * 2) : 0.55;
  for (const p of points) {
    for (const row of profile) {
      const swell = p.wall ? 0 : row.bump * look.bump * (noise(p.x * 1.15, row.z * 1.4 + 7) - 0.5) * 2;
      position.push(p.x, p.y - row.drop + swell, row.z);
      toneAt(kind, p.x, row.z, c);
      if (p.wall) c.lerp(look.wall, 0.82);
      c.lerp(look.shade, (1 - row.shade) * 0.9);
      colour.push(c.r, c.g, c.b);
      uv.push(p.x * tile, (row.z - row.drop - (p.wall ? p.y : 0)) * tile);
    }
  }
  const index: number[] = [];
  const rows = profile.length;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, map: look.boards ? maps.boards : maps.speckles, roughness: look.boards ? 0.8 : 1 }));
  mesh.frustumCulled = false;
  return mesh;
}
