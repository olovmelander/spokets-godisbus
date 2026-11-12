import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Mover } from '../../sim/types';
import { paintedWood } from '../../render/painted-wood';
import { box, paint } from './buildings';
import { LOFT_GROUND } from './chapters/billsta';

/**
 * Billsta's barn, where mormor opens the door for him (Olov, 12 November 2026: "kan vi göra dörren som mormor öppnar
 * till ladan mycket bättre designad, hela den delen måste bli bättre designad"). It was a white door frame standing
 * alone at the top of the planks, a piece of red wall in the very plane he walks in (he went through it), a door that
 * swung in through mormor, and behind it a loft out under the open sky.
 *
 * Now it is a barn. Its long side faces the yard: a foot of grey field stones, Falu red upright boards with battens, white
 * corner boards, two small stable windows under the loft, the eaves and the dark roof over them. The planks come up to
 * the loft's door at its left end: a big sliding door of red boards in a white frame with a white cross on it, hung by
 * two iron hangers from a rail over the doorway. Mormor gives it a push by its handle and it rolls aside along the rail,
 * and the lantern-lit loft is seen through the doorway. As he goes in, the barn's front is taken away (it fades), as the
 * house's is at home, and he is inside: the loft's back wall of old grey boards, its posts and beams, hay heaped along the
 * wall, the bales he climbs, and at its far end the hatch in the gable he goes out through onto the long roof. When he is
 * out again, the barn's front is back.
 *
 * To the simulation the door is a block that lifts out of his way (`DOOR`, ./chapters/billsta.ts); the picture keeps
 * everything where it stands and slides the door aside as the block goes up. It is all drawn in the world's own measures
 * here, about the mover's place. Four draws: the front, the door, the inside, and the iron.
 */

/** The barn, in EL: from its left end to its right, its front's face and its back wall inside, its eaves and ridge. */
export const LOFT_BARN = {
  left: 55.3, right: 70.9, front: 1.45, back: -3.1, thick: 0.22, eaves: 11.3, ridge: 14.6, ridgeZ: -0.8,
  /** The loft's doorway in the front, and how far the door slides to clear it. */
  door: { from: 55.55, to: 58.6, bottom: 4.82, top: 8.9, slide: 3.2 },
  /** The passage through the left gable, where the planks come in, and the hatch in the right one, onto the roof. */
  passage: { near: 1.25, far: -1.15, top: 8.9 },
  hatch: { near: 1.25, far: -1.25, top: 9.8 },
  /** The stable's windows under the loft: their middles. */
  windows: [62.4, 67],
} as const;

/** While he is inside, between the gables, the front is taken away. */
export function insideBarn(x: number): boolean {
  return x > LOFT_BARN.door.from + 0.2 && x < LOFT_BARN.right - 0.15;
}

const RED = ['#8a2f25', '#7c2a21', '#93342a', '#842c23', '#8e3127'];
const BATTEN = '#6a231c';
const WHITE = '#e6e1d4';
const IRON = '#1f2023';
const INSIDE = ['#5a4b3c', '#53463a', '#615140', '#4c4034'];
const TIMBER = '#43362a';
const STRAW = ['#c8a75c', '#bf9d52', '#d2b46a'];

/** Upright boards with battens over their joints, over a stretch of a wall facing the camera, between two heights. */
function boards(parts: BufferGeometry[], from: number, to: number, low: number, high: number, z: number, colours: readonly string[], batten?: string): void {
  if (high - low < 0.02 || to - from < 0.02) return;
  const count = Math.max(1, Math.round((to - from) / 0.46));
  const wide = (to - from) / count;
  for (let i = 0; i < count; i++) {
    const x = from + (i + 0.5) * wide;
    parts.push(box(wide - 0.02, high - low, LOFT_BARN.thick, x, (low + high) / 2, z, colours[(i * 7 + Math.round(from * 3)) % colours.length]!));
    if (batten && i > 0) parts.push(box(0.09, high - low, 0.05, from + i * wide, (low + high) / 2, z + LOFT_BARN.thick / 2 + 0.02, batten));
  }
}

/** A triangle of a gable standing across the barn (in the y-z plane) at `x`, from its back to its eaves' front, up to the ridge. */
function gableEnd(x: number, colour: string): BufferGeometry {
  const { back, front, eaves, ridge, ridgeZ, thick } = LOFT_BARN;
  const shape = new Shape();
  shape.moveTo(back, eaves);
  shape.lineTo(front + 0.3, eaves);
  shape.lineTo(ridgeZ, ridge);
  shape.closePath();
  // Extruded along its own z, which turned a quarter about y is the barn's length.
  return paint(new ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x + thick / 2, 0, 0), colour);
}

/**
 * A hay bale, its top where he stands: pressed straw in flakes, each a little out of line with the next and its own
 * shade, with two twines round it. As one box it read as a cardboard carton.
 */
function bale(parts: BufferGeometry[], from: number, to: number, low: number, high: number): void {
  const z0 = -1.75, z1 = 1.43, flakes = Math.max(3, Math.round((to - from) / 0.42));
  const wide = (to - from + 0.04) / flakes;
  for (let i = 0; i < flakes; i++) {
    const wobble = ((i * 37 + Math.round(from * 10)) % 7) / 7 - 0.5;
    const top = i === 0 || i === flakes - 1 ? high - 0.03 : high + 0.01;
    parts.push(box(wide - 0.015, top - low, z1 - z0 - 0.06 + wobble * 0.05, from - 0.02 + (i + 0.5) * wide, (low + top) / 2, (z0 + z1) / 2 + wobble * 0.04,
      STRAW[(i + Math.round(from)) % STRAW.length]!));
  }
  // The twines, round it near each end.
  for (const k of [0.27, 0.73]) parts.push(box(0.05, high - low + 0.03, z1 - z0 + 0.03, from + (to - from) * k, (low + high) / 2 + 0.01, (z0 + z1) / 2, '#6f5634'));
}

/** The barn's front: stone foot, boards and battens, white corners and frame, the eaves, the roof over them. */
function front(): BufferGeometry {
  const { left, right, front: z, thick, eaves, door, windows, ridge, ridgeZ } = LOFT_BARN;
  const wall = z - thick / 2;
  const parts: BufferGeometry[] = [];
  // A foot of grey field stones, two uneven courses.
  let seed = 9;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [low, high] of [[-0.6, 0.25], [0.25, 0.95]] as const) {
    for (let x = left - 0.1; x < right + 0.1;) {
      const long = 0.55 + next() * 0.7, tone = 0.85 + next() * 0.3;
      const grey = Math.round(112 * tone).toString(16).padStart(2, '0');
      parts.push(box(Math.min(long, right + 0.1 - x) - 0.06, high - low - 0.05, thick + 0.18, x + long / 2, (low + high) / 2, wall + 0.05, `#${grey}${grey}${Math.round(104 * tone).toString(16).padStart(2, '0')}`));
      x += long;
    }
  }
  // The boards: under the loft's door and the stable's windows, beside them, and over them up to the eaves.
  const sill = 0.95;
  const [w1, w2] = windows;
  const pane = { low: 2.05, high: 3.05, half: 0.6 };
  boards(parts, left, door.to + 0.15, sill, door.bottom - 0.12, wall, RED, BATTEN);
  boards(parts, door.to + 0.15, w1! - pane.half, sill, door.bottom - 0.12, wall, RED, BATTEN);
  for (const [i, w] of [w1!, w2!].entries()) {
    boards(parts, w - pane.half, w + pane.half, sill, pane.low, wall, RED, BATTEN);
    boards(parts, w - pane.half, w + pane.half, pane.high, door.bottom - 0.12, wall, RED, BATTEN);
    boards(parts, w + pane.half, i === 0 ? w2! - pane.half : right, sill, door.bottom - 0.12, wall, RED, BATTEN);
    // White frames, a glazing bar, and dark glass: the stable is dark.
    parts.push(box(pane.half * 2 + 0.2, pane.high - pane.low + 0.2, 0.06, w, (pane.low + pane.high) / 2, z + 0.03, WHITE));
    parts.push(box(pane.half * 2 - 0.1, pane.high - pane.low - 0.1, 0.07, w, (pane.low + pane.high) / 2, z + 0.04, '#1c2229'));
    parts.push(box(0.06, pane.high - pane.low - 0.1, 0.08, w, (pane.low + pane.high) / 2, z + 0.05, WHITE));
  }
  // A beam along the foot of the loft, under its door, the door's threshold over it.
  parts.push(box(right - left, 0.24, thick + 0.06, (left + right) / 2, door.bottom - 0.06, wall + 0.03, '#6e251d'));
  // Beside and over the doorway, up to the eaves.
  boards(parts, left, door.from - 0.18, door.bottom, eaves, wall, RED, BATTEN);
  boards(parts, door.to + 0.18, right, door.bottom, eaves, wall, RED, BATTEN);
  boards(parts, door.from - 0.18, door.to + 0.18, door.top + 0.22, eaves, wall, RED, BATTEN);
  // White corner boards, the doorway's white casing and its threshold.
  for (const x of [left + 0.12, right - 0.12]) parts.push(box(0.28, eaves + 0.1 - sill, thick + 0.1, x, (eaves + sill) / 2, wall + 0.02, WHITE));
  for (const x of [door.from - 0.1, door.to + 0.1]) parts.push(box(0.2, door.top - door.bottom + 0.2, thick + 0.12, x, (door.top + door.bottom) / 2 + 0.05, wall + 0.03, WHITE));
  parts.push(box(door.to - door.from + 0.4, 0.22, thick + 0.12, (door.from + door.to) / 2, door.top + 0.11, wall + 0.03, WHITE));
  parts.push(box(door.to - door.from + 0.2, 0.12, thick + 0.3, (door.from + door.to) / 2, door.bottom - 0.04, wall + 0.1, '#7d6a52'));
  // The eaves: a white fascia, and the roof's dark tarred boards up to the ridge.
  parts.push(box(right - left + 0.6, 0.26, 0.08, (left + right) / 2, eaves - 0.05, z + 0.62, WHITE));
  const run = z + 0.6 - ridgeZ, rise = ridge - eaves, slope = Math.hypot(run, rise);
  parts.push(paint(new BoxGeometry(right - left + 0.6, 0.22, slope).rotateX(Math.atan2(rise, run)).translate((left + right) / 2, eaves + rise / 2 + 0.05, (z + 0.6 + ridgeZ) / 2), '#2e2a29'));
  return mergeGeometries(parts);
}

/** The sliding door: red boards in a white rim with a white cross, two iron hangers on top, a handle by its left edge. */
function doorLeaf(): { wood: BufferGeometry; iron: BufferGeometry } {
  const { door } = LOFT_BARN;
  const wide = door.to - door.from + 0.16, tall = door.top - door.bottom + 0.08, thick = 0.14;
  const wood: BufferGeometry[] = [];
  const planks = 7;
  for (let i = 0; i < planks; i++) wood.push(box(wide / planks - 0.03, tall, thick, -wide / 2 + (i + 0.5) * (wide / planks), tall / 2, 0, RED[i % RED.length]!));
  const face = thick / 2 + 0.03;
  for (const y of [0.13, tall - 0.13]) wood.push(box(wide, 0.26, 0.06, 0, y, face, WHITE));
  for (const x of [-wide / 2 + 0.13, wide / 2 - 0.13]) wood.push(box(0.26, tall, 0.06, x, tall / 2, face, WHITE));
  // The cross, corner to corner inside the rim.
  const run = wide - 0.5, rise = tall - 0.5, long = Math.hypot(run, rise), angle = Math.atan2(rise, run);
  for (const side of [-1, 1]) wood.push(paint(new BoxGeometry(long, 0.2, 0.05).rotateZ(side * angle).translate(0, tall / 2, face + 0.005 * side), WHITE));
  const iron: BufferGeometry[] = [];
  for (const x of [-wide / 2 + 0.45, wide / 2 - 0.45]) {
    // A strap down the door's face, up to the wheel that runs on the rail.
    iron.push(box(0.12, 0.7, 0.04, x, tall - 0.2, face + 0.04, IRON));
    iron.push(box(0.08, 0.45, 0.06, x, tall + 0.2, thick / 2 + 0.08, IRON));
    iron.push(paint(new TorusGeometry(0.09, 0.035, 6, 12).translate(x, tall + 0.42, thick / 2 + 0.12), IRON));
  }
  // The handle, an iron bar on two feet, by the left edge where mormor takes it.
  iron.push(box(0.06, 0.9, 0.06, -wide / 2 + 0.32, tall * 0.5, face + 0.13, IRON));
  for (const y of [tall * 0.5 - 0.42, tall * 0.5 + 0.42]) iron.push(box(0.06, 0.06, 0.12, -wide / 2 + 0.32, y, face + 0.07, IRON));
  return { wood: mergeGeometries(wood), iron: mergeGeometries(iron) };
}

/** Inside: the back wall's old grey boards, its posts and beams, hay along the wall, the bales, the gables' inner faces. */
function inside(): BufferGeometry {
  const { left, right, back, front: z, eaves, passage, hatch, thick } = LOFT_BARN;
  const { floor, bale: b, hay } = LOFT_GROUND;
  const parts: BufferGeometry[] = [];
  boards(parts, left, right, floor, eaves, back, INSIDE);
  // A nailer across the wall, and the posts with a tie beam along their tops and beams across the barn from them.
  parts.push(box(right - left, 0.16, 0.14, (left + right) / 2, floor + 2.6, back + 0.16, TIMBER));
  for (const x of [left + 0.45, 60.8, 66, right - 0.45]) {
    parts.push(box(0.34, eaves - floor, 0.34, x, (floor + eaves) / 2, back + 0.3, TIMBER));
    parts.push(box(0.3, 0.32, z - back - 0.3, x, eaves - 0.5, (back + z) / 2 - 0.1, TIMBER));
  }
  parts.push(box(right - left, 0.3, 0.3, (left + right) / 2, eaves - 0.2, back + 0.3, TIMBER));
  // Hay heaped against the back wall between the bale and the hatch's far side, in soft lumps.
  let seed = 3;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = 61.6; x < 67.4; x += 0.55) {
    const r = 0.55 + next() * 0.35;
    parts.push(paint(new SphereGeometry(r, 7, 5).scale(1.3, 0.75 + next() * 0.3, 0.9).translate(x, floor + r * 0.45, back + 0.85 + next() * 0.3), STRAW[Math.floor(next() * STRAW.length)]!));
  }
  // The bales he climbs: one in the loft, and the stack up to the hatch, each top where he stands.
  bale(parts, b.from, b.to, floor, b.y);
  bale(parts, hay[0]!.x, hay[1]!.x, floor, hay[0]!.y);
  bale(parts, hay[1]!.x, right - thick / 2, floor, hay[0]!.y);
  bale(parts, hay[1]!.x, right - thick / 2, hay[0]!.y, hay[1]!.y);
  // The gables, seen from inside: the left one round the passage he came in by, the right one round the hatch.
  const across = (x: number, far: number, near: number, low: number, high: number, colour: string) => {
    if (near - far > 0.02 && high - low > 0.02) parts.push(box(thick, high - low, near - far, x, (low + high) / 2, (far + near) / 2, colour));
  };
  across(left, back, passage.far, floor, eaves, INSIDE[1]!);
  across(left, passage.far, z, passage.top, eaves, INSIDE[1]!);
  across(left, passage.near, z, floor, passage.top, INSIDE[1]!);
  across(right, back, hatch.far, floor, eaves, INSIDE[2]!);
  across(right, hatch.far, z, hatch.top, eaves, INSIDE[2]!);
  across(right, hatch.near, z, floor, hatch.top, INSIDE[2]!);
  across(right, hatch.far, hatch.near, floor, hay[1]!.y, INSIDE[2]!);
  // The gables' red triangles over the eaves, at both ends.
  parts.push(gableEnd(left, RED[0]!), gableEnd(right, RED[2]!));
  return mergeGeometries(parts);
}

/** The iron: the rail over the doorway that the door hangs from, its brackets, and the stop at its end. */
function rail(): BufferGeometry {
  const { door, front: z } = LOFT_BARN;
  const parts: BufferGeometry[] = [];
  const from = door.from - 0.2, to = door.to + door.slide + 0.25, y = door.top + 0.62;
  parts.push(box(to - from, 0.1, 0.06, (from + to) / 2, y, z + 0.2, IRON));
  for (const x of [from + 0.15, (from + to) / 2, to - 0.15]) parts.push(box(0.1, 0.24, 0.2, x, y + 0.02, z + 0.1, IRON));
  parts.push(box(0.14, 0.24, 0.16, to - 0.05, y - 0.08, z + 0.24, IRON));
  return mergeGeometries(parts);
}

/**
 * The barn and its door for the door's mover (`look: 'barn-door'`). `x` says where he is now: while he is inside, the
 * barn's front fades away. `still`: less motion, and the front comes and goes at once.
 */
export function barnLoft(mover: Mover, x: () => number, still: () => boolean): Group {
  const closed = mover.stops[0]!.y;
  const travel = Math.max(1e-3, mover.stops[mover.stops.length - 1]!.y - closed);
  const fading = (material: MeshStandardMaterial) => { material.transparent = true; return material; };
  const frontMaterial = fading(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  paintedWood(frontMaterial);
  const frontMesh = new Mesh(front(), frontMaterial);
  frontMesh.name = 'barn-door-frame';
  frontMesh.castShadow = true;
  const leafParts = doorLeaf();
  const leafMaterial = fading(new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  paintedWood(leafMaterial);
  const leaf = new Mesh(leafParts.wood, leafMaterial);
  leaf.name = 'barn-door-leaf';
  leaf.castShadow = true;
  const ironMaterial = fading(new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 }));
  const hangers = new Mesh(leafParts.iron, ironMaterial);
  const slide = new Group();
  slide.name = 'barn-door-slide';
  const { door } = LOFT_BARN;
  slide.position.set((door.from + door.to) / 2, door.bottom - 0.04, LOFT_BARN.front + 0.12);
  slide.add(leaf, hangers);
  const railMesh = new Mesh(rail(), ironMaterial);
  const insideMesh = new Mesh(inside(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  insideMesh.name = 'barn-loft';
  insideMesh.receiveShadow = true;
  // Everything is drawn where it stands in the world: the held group undoes the mover's place, and its lift.
  const held = new Group();
  held.add(frontMesh, slide, railMesh, insideMesh);
  const group = new Group();
  group.add(held);
  let gone = 0, last = -1, rolled = 0;
  const fadeables = [frontMaterial, leafMaterial, ironMaterial];
  group.userData.tick = (clock?: number) => {
    const dt = last < 0 || clock === undefined ? 0 : Math.max(0, Math.min(0.1, clock - last));
    if (clock !== undefined) last = clock;
    const lift = (group.parent?.position.y ?? closed) - closed;
    held.position.set(-(group.parent?.position.x ?? mover.stops[0]!.x), -closed - lift, -(group.parent?.position.z ?? 0));
    if (group.parent) { group.parent.rotation.z = 0; group.parent.scale.set(1, 1, 1); }
    // The door rolls aside as the block goes up, and on a little after, easing to a stop at the rail's end.
    const open = Math.min(1, Math.max(0, lift / travel));
    rolled = still() || dt === 0 && open >= 1 ? open : rolled + (open - rolled) * Math.min(1, dt * 3.2);
    if (open === 0) rolled = 0;
    slide.position.x = (door.from + door.to) / 2 + door.slide * rolled * rolled * (3 - 2 * rolled);
    // While he is inside, the front fades away; out again, it comes back.
    const want = insideBarn(x()) ? 1 : 0;
    gone = still() ? want : gone + Math.sign(want - gone) * Math.min(Math.abs(want - gone), dt / 0.4);
    for (const material of fadeables) {
      material.opacity = 1 - gone;
      material.depthWrite = gone < 0.02;
    }
    frontMesh.visible = slide.visible = railMesh.visible = gone < 0.99;
  };
  group.userData.tick();
  return group;
}
