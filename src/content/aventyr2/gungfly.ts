import {
  AdditiveBlending, BufferGeometry, CircleGeometry, Color, DynamicDrawUsage, DoubleSide, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, RingGeometry, SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../render/extensions';
import { groundDetail } from '../../render/ground-detail';
import { drawnWhile } from '../../render/idle';
import { openWaterAt } from '../../render/water';
import { ELOF_HALF_WIDTH, GRAVITY, SINK_DEPTH } from '../../sim/constants';
import type { Tussock } from '../../sim/types';

/**
 * Flärken's gungfly (Olov, 14 November 2026: "Kan vi förbättra designen och texturerna på gungflyet som sjunker när Elof
 * står stilla på det?"): the floating mats between the shore and the jetty, which sink while he stands on one. They
 * were plain dark green mounds with a few blades on them.
 *
 * Each is a raft of bog now, as a quaking bog's edge is: a cushion of sphagnum on top, in greens, straw and rust, low
 * hummocks at its back and level where he stands; under it the mat itself, pale dead moss darkening down into wet
 * black peat, undercut at the waterline with roots hanging from it. Sedge stands in tufts at its ends and back with
 * cotton grass among it, cranberries lie on their threads on the moss in front, and bog rosemary stands in small
 * sprigs. (The rust is brown, never red: the bog's red moss read as blood here, HANDOVER #202.)
 *
 * It floats: it rocks a little on the water, and tips towards him when he stands on it. As it sinks, the water wells
 * up through the moss round his boots and rings spread from it over the lake; when he leaves it, it comes up again
 * dripping. The sinking itself is the simulation's and is not changed: each mat is drawn where the view has its own
 * (src/render/view.ts, buildTussocks, which this takes the place of), its top where his feet are.
 */

/** A mat's measures, in EL: how far it reaches behind and in front of the play plane, and how far down its sides go. */
const MAT = { back: -1.9, front: 0.75, down: -1.6 } as const;

const hash = (a: number, b = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
/** Smooth noise from 0 to 1 over a plane. */
function noise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z), fx = smooth(x - xi), fz = smooth(z - zi);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
const tone = (hex: string): [number, number, number] => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => {
  const k = Math.min(1, Math.max(0, t));
  return [a[0]! + (b[0]! - a[0]!) * k, a[1]! + (b[1]! - a[1]!) * k, a[2]! + (b[2]! - a[2]!) * k];
};

// The moss: two greens, straw where it has bleached, rust-brown and an ochre; the dead moss under it; the peat.
const GREEN = tone('#7c9a44'), GREEN_DEEP = tone('#566f34'), STRAW = tone('#c2b06a'), RUST = tone('#9a5e34'), OCHRE = tone('#b08a3c');
const DEAD = tone('#a89a66'), PEAT = tone('#3c2a1c'), PEAT_WET = tone('#17110c');
const SEDGE = tone('#a89a4c'), SEDGE_TIP = tone('#e2d08c'), COTTON = tone('#f2efe2'), BERRY = tone('#8e1a20'), BERRY_PALE = tone('#b83a3e');
const HUMMOCK = tone('#8fa64e'), HUMMOCK_RUST = tone('#a8703c');
const ROSEMARY = tone('#5f7f6a'), ROSEMARY_PALE = tone('#b9c8bc');

/** The sphagnum's colour at a place on a mat: patches of each, no two mats alike. */
function mossAt(x: number, z: number, seed: number): [number, number, number] {
  const patch = noise(x * 1.5 + seed * 3.1, z * 1.5 + seed), fine = noise(x * 5.2 + seed, z * 5.2 - seed * 2.3);
  let colour = mix(GREEN_DEEP, GREEN, patch * 1.4 - 0.1);
  const warm = noise(x * 1.1 - seed * 1.7, z * 1.3 + seed * 4.2);
  if (warm > 0.58) colour = mix(colour, RUST, (warm - 0.58) * 4.5);
  const dry = noise(x * 1.9 + seed * 5.3, z * 1.7 - seed);
  if (dry > 0.62) colour = mix(colour, dry > 0.8 ? OCHRE : STRAW, (dry - 0.62) * 3.2);
  const k = 0.74 + 0.5 * fine;
  return [colour[0] * k, colour[1] * k, colour[2] * k];
}

/** The parts of one mat while it is built: corners with their colours and which way each faces. */
interface Parts { at: number[]; colour: number[]; normal: number[] }
const corner = (p: Parts, x: number, y: number, z: number, c: readonly number[], nx = 0, ny = 1, nz = 0) => {
  p.at.push(x, y, z); p.colour.push(c[0]!, c[1]!, c[2]!); p.normal.push(nx, ny, nz);
};
/** A thin blade from its foot to its tip, seen from both sides. */
function blade(p: Parts, x: number, y: number, z: number, tx: number, ty: number, tz: number, wide: number, foot: readonly number[], tip: readonly number[]): void {
  const ax = -(tz - z), az = tx - x, long = Math.hypot(ax, az) || 1;
  const sx = (ax / long) * wide || wide, sz = (az / long) * wide;
  // A bend half way up, so that it arches.
  const mx = x + (tx - x) * 0.55, my = y + (ty - y) * 0.72, mz = z + (tz - z) * 0.55;
  const half = mix(foot, tip, 0.5);
  for (const [a, b, c] of [[[x - sx, y, z - sz, foot], [x + sx, y, z + sz, foot], [mx, my, mz, half]], [[mx - sx * 0.5, my, mz - sz * 0.5, half], [mx + sx * 0.5, my, mz + sz * 0.5, half], [tx, ty, tz, tip]]] as const) {
    // Wound to face the camera: its light is then its own (a blade seen from its back takes its light from below).
    const facing = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (const v of facing >= 0 ? [a, b, c] : [a, c, b]) corner(p, v[0], v[1], v[2], v[3], 0, 0.85, 0.53);
  }
}
/** A small round thing: a berry, a head of cotton grass. */
function bead(p: Parts, x: number, y: number, z: number, radius: number, low: readonly number[], high: readonly number[], squash = 1): void {
  const shape = new SphereGeometry(radius, 6, 4).toNonIndexed();
  const at = shape.getAttribute('position'), n = shape.getAttribute('normal');
  for (let i = 0; i < at.count; i++) corner(p, x + at.getX(i), y + at.getY(i) * squash, z + at.getZ(i), mix(low, high, at.getY(i) / radius * 0.5 + 0.5), n.getX(i), n.getY(i), n.getZ(i));
  shape.dispose();
}

/**
 * One mat, `width` across where he stands: its top at y = 0 and level along the play plane, its sides down to under the
 * water, with all that grows on it, in one shape. `water` is how far under its top the lake lies when it floats at rest.
 */
export function gungflyMat(width: number, seed: number, water: number): BufferGeometry {
  const AROUND = 52, RINGS = 11;
  // A little wider than his footing on it, so that he stands on moss to its very end.
  const half = width / 2 + 0.24, middle = (MAT.back + MAT.front) / 2, deep = (MAT.front - MAT.back) / 2;
  // Its outline: nearer a rounded oblong than an oval, so that its top is level to the very ends of his footing, which
  // lies along its front half; and uneven, in lobes.
  const BOXY = 3.2;
  const lobes = (a: number) => (1 + 0.06 * Math.sin(3 * a + seed) + 0.045 * Math.sin(5 * a + seed * 2.3) + 0.025 * Math.sin(9 * a - seed))
    * (Math.abs(Math.cos(a)) ** BOXY + Math.abs(Math.sin(a)) ** BOXY) ** (-1 / BOXY);
  /** The mat's top at a place: level along his way, falling away to its rim, with low hummocks behind him. */
  const topAt = (x: number, z: number, out: number): number => {
    const away = smooth((Math.abs(z) - 0.32) / 0.5);
    const hummock = z < 0 ? 0.16 * smooth((-z - 0.5) / 0.9) * noise(x * 1.3 + seed * 7, z * 1.3 + seed) : 0;
    // Level to the ends of his footing and out to its shoulder, which rounds off down to its rim.
    return -0.22 * smooth(Math.max((Math.abs(x) - width / 2 - 0.03) / 0.2, (out - 0.86) / 0.14)) ** 1.5 + away * (0.09 * (noise(x * 3.4 + seed, z * 3.4) - 0.5) + 0.04 * (noise(x * 8 + seed, z * 8 + 3) - 0.5) + hummock);
  };
  // Its top: rings from its middle out to its rim.
  const at: number[] = [], colour: number[] = [], index: number[] = [];
  const put = (x: number, y: number, z: number, c: readonly number[]) => { at.push(x, y, z); colour.push(c[0]!, c[1]!, c[2]!); return at.length / 3 - 1; };
  const rings: number[][] = [];
  for (let r = 0; r <= RINGS; r++) {
    const out = r / RINGS;
    const ring: number[] = [];
    for (let i = 0; i < AROUND; i++) {
      const a = (i / AROUND) * Math.PI * 2;
      const x = half * out * Math.cos(a) * (0.5 + 0.5 * lobes(a)), z = middle + deep * out * Math.sin(a) * lobes(a);
      ring.push(r === 0 && i > 0 ? ring[0]! : put(x, topAt(x, z, out), z, mossAt(x, z, seed)));
    }
    rings.push(ring);
  }
  // Its side: the cushion's overhang, the pale dead moss under it, and the peat, undercut at the waterline and dark
  // and wet from there down. (How far out, and how far under its top, each ring is.)
  const side: [number, number][] = [[1.035, -0.3], [1.05, -0.4], [1.0, water + 0.16], [0.93, water + 0.03], [0.9, water - 0.12], [0.84, MAT.down]];
  for (const [k, [out, y]] of side.entries()) {
    const ring: number[] = [];
    for (let i = 0; i < AROUND; i++) {
      const a = (i / AROUND) * Math.PI * 2;
      const jag = 1 + 0.035 * (hash(i, k + seed) - 0.5) * (k > 1 ? 2 : 1);
      const x = half * out * jag * Math.cos(a) * (0.5 + 0.5 * lobes(a)), z = middle + deep * out * jag * Math.sin(a) * lobes(a);
      const depth = y - water;
      const body = k === 0 ? mix(mossAt(x, z, seed), STRAW, 0.3) : k === 1 ? mix(DEAD, STRAW, hash(i, seed)) : depth > 0.1 ? mix(PEAT, DEAD, 0.35 + 0.3 * hash(i, 3)) : depth > -0.05 ? PEAT_WET : mix(PEAT_WET, PEAT, 0.3);
      ring.push(put(x, y + 0.03 * (hash(i * 3, k) - 0.5), z, body));
    }
    rings.push(ring);
  }
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < AROUND; i++) {
    const j = (i + 1) % AROUND;
    const [a, b, c, d] = [rings[r]![i]!, rings[r]![j]!, rings[r + 1]![j]!, rings[r + 1]![i]!];
    if (r > 0) index.push(a, b, c);
    index.push(a, c, d);
  }
  const mound = new BufferGeometry();
  mound.setAttribute('position', new Float32BufferAttribute(at, 3));
  mound.setAttribute('color', new Float32BufferAttribute(colour, 3));
  mound.setIndex(index);
  mound.computeVertexNormals();
  const body = mound.toNonIndexed();
  mound.dispose();

  // What grows on it. Nothing stands where he does: along the play plane the moss is bare, with the berries in front.
  const grown: Parts = { at: [], colour: [], normal: [] };
  const groundAt = (x: number, z: number) => topAt(x, z, Math.min(1, (Math.abs(x / half) ** BOXY + Math.abs((z - middle) / deep) ** BOXY) ** (1 / BOXY)));
  // Sedge in tufts: at each end behind his way, and along its back.
  const tufts: [number, number, number][] = [[-half * 0.72, -0.7, 15], [half * 0.7, -0.85, 13], [-half * 0.2, -1.45, 16], [half * 0.32, -1.35, 12], [-half * 0.82, 0.42, 7], [half * 0.84, 0.36, 6]];
  for (const [t, [tx, tz, blades]] of tufts.entries()) {
    for (let i = 0; i < blades; i++) {
      const a = hash(i, t + seed) * Math.PI * 2, r = 0.05 + 0.1 * hash(i * 3, t), tall = (tz > 0 ? 0.26 : 0.5) + 0.42 * hash(i * 7, t + 1) * (tz > 0 ? 0.5 : 1), lean = 0.18 + 0.35 * hash(i * 5, t + 2);
      const x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r, y = groundAt(x, z) - 0.02;
      blade(grown, x, y, z, x + Math.cos(a) * lean * tall, y + tall, z + Math.sin(a) * lean * tall * 0.7, 0.034, mix(SEDGE, GREEN_DEEP, hash(i, 9) * 0.35), SEDGE_TIP);
    }
  }
  // Cotton grass among the sedge at the back: thin stalks, each with a worn white head nodding at its top.
  for (let i = 0; i < 7; i++) {
    const x = (hash(i, seed + 11) - 0.5) * half * 1.5, z = -0.75 - 0.85 * hash(i, seed + 12), y = groundAt(x, z);
    const tall = 0.62 + 0.3 * hash(i, seed + 13), nod = (hash(i, seed + 14) - 0.3) * 0.22;
    blade(grown, x, y, z, x + nod, y + tall, z + 0.04, 0.012, SEDGE, SEDGE_TIP);
    bead(grown, x + nod * 1.05, y + tall + 0.02, z + 0.04, 0.07, mix(COTTON, SEDGE_TIP, 0.5), COTTON, 0.8);
    bead(grown, x + nod * 1.05 + 0.04, y + tall - 0.02, z + 0.07, 0.045, mix(COTTON, SEDGE_TIP, 0.5), COTTON, 0.9);
  }
  // Cushions of moss, each a low hummock of its own: at its back and its ends, never where he stands.
  for (let i = 0; i < 7; i++) {
    const back = i < 4;
    const x = back ? (hash(i, seed + 41) - 0.5) * half * 1.5 : (i % 2 ? 1 : -1) * half * (0.7 + 0.12 * hash(i, seed + 42));
    const z = back ? -0.85 - 0.7 * hash(i, seed + 43) : -0.95 + 0.4 * hash(i, seed + 44);
    const r = back ? 0.2 + 0.14 * hash(i, seed + 45) : 0.16 + 0.1 * hash(i, seed + 45);
    bead(grown, x, groundAt(x, z) + r * 0.12, z, r, mix(GREEN_DEEP, HUMMOCK, 0.4), hash(i, seed + 46) < 0.35 ? HUMMOCK_RUST : HUMMOCK, 0.5);
  }
  // Cranberries on the moss in front of where he stands: small and dark red, a few together.
  for (let i = 0; i < 7; i++) {
    const front = i < 5;
    const x = (hash(i, seed + 21) - 0.5) * half * (front ? 1.5 : 1.7), z = front ? 0.3 + 0.32 * hash(i, seed + 22) : -0.42 - 0.2 * hash(i, seed + 22);
    bead(grown, x, groundAt(x, z) + 0.025, z, 0.036, BERRY, BERRY_PALE);
  }
  // Bog rosemary: a few small upright sprigs, each with narrow grey-green leaves, pale beneath.
  for (let i = 0; i < 4; i++) {
    const x = (hash(i, seed + 31) - 0.5) * half * 1.4, z = (i % 2 ? 0.42 : -0.5) - 0.12 * hash(i, seed + 32), y = groundAt(x, z);
    const tall = 0.2 + 0.1 * hash(i, seed + 33);
    blade(grown, x, y, z, x + 0.02, y + tall, z, 0.008, PEAT, ROSEMARY);
    for (let leaf = 0; leaf < 6; leaf++) {
      const a = leaf * 2.4 + i, up = y + tall * (0.3 + 0.12 * leaf);
      blade(grown, x, up, z, x + Math.cos(a) * 0.09, up + 0.04, z + Math.sin(a) * 0.09, 0.012, ROSEMARY, leaf % 2 ? ROSEMARY_PALE : ROSEMARY);
    }
  }
  // Roots and threads of peat hanging from its undercut edge into the water, all round.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + hash(i, seed) * 0.2;
    const x = half * 0.94 * Math.cos(a) * (0.5 + 0.5 * lobes(a)), z = middle + deep * 0.94 * Math.sin(a) * lobes(a);
    blade(grown, x, water + 0.08, z, x + 0.03 * (hash(i, 2) - 0.5), water - 0.12 - 0.12 * hash(i, 5), z + 0.03, 0.02, PEAT, PEAT_WET);
  }
  const growth = new BufferGeometry();
  growth.setAttribute('position', new Float32BufferAttribute(grown.at, 3));
  growth.setAttribute('color', new Float32BufferAttribute(grown.colour, 3));
  growth.setAttribute('normal', new Float32BufferAttribute(grown.normal, 3));
  const whole = mergeGeometries([body, growth])!;
  body.dispose();
  growth.dispose();
  return whole;
}

/** How much of a mat's rocking, tipping and dripping is drawn: its state from frame to frame. */
interface Mat { def: Tussock; mesh: Mesh; rest: number; was: number; tip: number; tipSpeed: number; dripped: number }

/** Flärken's gungfly (registered by ./render.ts). Other chapters keep the view's own tussocks. */
export function gungflyExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (chapter.id !== 'flarken' || !chapter.tussocks?.length) return null;
  const group = new Group();
  group.name = 'gungfly';
  // Wet moss: a little sheen. Seen from both sides, for its blades; and seen close it has the ground's own grain, damp
  // hollows and paler tufts a hand's breadth across (../../render/ground-detail.ts), so that it is not one smooth paint.
  const moss = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: DoubleSide });
  groundDetail(moss, 'soft');
  const mats: Mat[] = chapter.tussocks.map((def, i) => {
    const level = openWaterAt(chapter, def.x) ?? def.y - 0.6;
    const mesh = new Mesh(gungflyMat(def.width, i * 1.7 + def.x * 0.13, level - def.y), moss);
    mesh.name = 'gungfly-mat';
    mesh.position.set(def.x, def.y, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return { def, mesh, rest: def.y, was: def.y, tip: 0, tipSpeed: 0, dripped: 0 };
  });
  // The water that wells up through the moss round his boots as a mat sinks under him: dark, and it shines.
  const welling = new Mesh(new CircleGeometry(1, 22).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({ color: '#3a5876', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0, depthWrite: false, emissive: '#22344a', emissiveIntensity: 0.6 }));
  welling.name = 'gungfly-welling';
  welling.renderOrder = 2;
  drawnWhile(welling, false);
  // Rings spreading over the lake from a mat that sinks or comes up, and the drops off one coming up: a draw each.
  const RINGS = 3, DROPS = 4;
  const rings = new InstancedMesh(new RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }), mats.length * RINGS);
  rings.name = 'gungfly-rings';
  rings.instanceMatrix.setUsage(DynamicDrawUsage);
  rings.instanceColor = new InstancedBufferAttribute(new Float32Array(mats.length * RINGS * 3), 3);
  rings.instanceColor.setUsage(DynamicDrawUsage);
  rings.frustumCulled = false;
  rings.renderOrder = 3;
  const drops = new InstancedMesh(new SphereGeometry(0.035, 6, 4), new MeshBasicMaterial({ color: '#cfe0ee', transparent: true, opacity: 0.85, depthWrite: false }), mats.length * DROPS);
  drops.name = 'gungfly-drops';
  drops.instanceMatrix.setUsage(DynamicDrawUsage);
  drops.frustumCulled = false;
  group.add(welling, rings, drops);
  scene.add(group);

  let own: Object3D[] | null = null;
  const place = new Object3D(), light = new Color();
  return {
    update({ clock, dt, x, y, still }: ExtraFrame) {
      // The view's own mounds, which these take the place of: put away, and read each frame for where each mat is.
      if (!own) {
        own = scene.children.filter((child) => child.name === 'tussock');
        for (const mound of own) drawnWhile(mound, false);
      }
      let stoodOn: Mat | null = null, anyRing = false, anyDrop = false;
      for (const [i, mat] of mats.entries()) {
        const now = own[i]?.position.y ?? mat.rest;
        const sunk = Math.min(1, Math.max(0, (mat.rest - now) / SINK_DEPTH));
        const going = dt > 0 ? (now - mat.was) / dt : 0;
        mat.was = now;
        const level = openWaterAt(chapter, mat.def.x) ?? mat.rest - 0.6;
        const on = Math.abs(x - mat.def.x) <= mat.def.width / 2 + ELOF_HALF_WIDTH && Math.abs(y - now) < 0.2;
        if (on) stoodOn = mat;
        // It floats: it tips towards where he stands, as a spring would have it, and rocks a little by itself.
        const lean = on ? -0.085 * Math.max(-1, Math.min(1, (x - mat.def.x) / (mat.def.width / 2))) * (0.6 + 0.4 * sunk) : 0;
        if (still) { mat.tip = lean; mat.tipSpeed = 0; }
        else if (dt > 0) {
          const step = Math.min(dt, 1 / 30);
          mat.tipSpeed += ((lean - mat.tip) * 70 - mat.tipSpeed * 5.5) * step;
          mat.tip += mat.tipSpeed * step;
        }
        const rock = still ? 0 : 0.012 * Math.sin(clock * 1.1 + i * 1.9) + 0.006 * Math.sin(clock * 2.3 + i);
        const tilt = mat.tip + rock;
        // Tipped about where he stands, so that its top stays under his boots.
        const pivot = on ? x - mat.def.x : 0;
        mat.mesh.rotation.z = tilt;
        mat.mesh.position.set(mat.def.x, now - tilt * pivot + (still || on ? 0 : 0.012 * Math.sin(clock * 0.9 + i * 2.6)), 0);
        // Rings over the lake while it goes down or comes up, the faster the brighter.
        const moving = still ? 0 : Math.min(1, Math.abs(going) / 0.3);
        for (let k = 0; k < RINGS; k++) {
          const phase = (clock * 0.55 + k / RINGS + i * 0.37) % 1;
          place.position.set(mat.def.x, level + 0.02, -0.55);
          place.rotation.set(0, 0, 0);
          place.scale.set((mat.def.width / 2 + 0.2) * (1 + 1.5 * phase), 1, 1.5 * (1 + 1.2 * phase));
          place.updateMatrix();
          rings.setMatrixAt(i * RINGS + k, place.matrix);
          const bright = moving * 0.5 * (1 - phase) * Math.min(1, phase * 5);
          rings.setColorAt(i * RINGS + k, light.setRGB(bright * 0.8, bright * 0.9, bright));
          anyRing ||= bright > 0.004;
        }
        // Coming up again it drips: drops off its wet peat edge into the lake, while it rises and a moment after.
        if (going > 0.02) mat.dripped = clock;
        const dripping = !still && clock - mat.dripped < 0.6;
        for (let k = 0; k < DROPS; k++) {
          const a = (k / DROPS) * Math.PI + 0.35 + i, every = 0.42 + 0.1 * k;
          const fall = ((clock + k * 0.17 + i * 0.31) % every) / every;
          // (From under its rim, which is over the water even when it has sunk all the way.)
          const from = now - 0.1, drop = 0.5 * GRAVITY * 0.35 * (fall * every) ** 2;
          place.position.set(mat.def.x + Math.cos(a) * (mat.def.width / 2 + 0.05), Math.max(level, from - drop), 0.35 + 0.3 * Math.sin(a));
          place.scale.setScalar(dripping && going >= -0.01 && from - drop > level ? 1 : 0);
          place.updateMatrix();
          drops.setMatrixAt(i * DROPS + k, place.matrix);
          anyDrop ||= dripping && going >= -0.01;
        }
      }
      rings.instanceMatrix.needsUpdate = true;
      rings.instanceColor!.needsUpdate = true;
      drops.instanceMatrix.needsUpdate = true;
      drawnWhile(rings, anyRing);
      drawnWhile(drops, anyDrop);
      // The water welling up round his boots: wider and plainer the further it has sunk.
      const sunk = stoodOn ? Math.min(1, Math.max(0, (stoodOn.rest - stoodOn.was) / SINK_DEPTH)) : 0;
      drawnWhile(welling, sunk > 0.02);
      if (stoodOn && sunk > 0.02) {
        const grown = smooth(sunk * 1.3);
        welling.position.set(x, stoodOn.was + 0.014, 0.06);
        welling.scale.set(0.2 + 0.55 * grown, 1, 0.16 + 0.34 * grown);
        welling.rotation.z = stoodOn.mesh.rotation.z;
        (welling.material as MeshStandardMaterial).opacity = 0.82 * smooth(sunk * 2.2);
      }
    },
  };
}
