import {
  BufferAttribute, BufferGeometry, CylinderGeometry, DataTexture, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, LinearFilter,
  LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt } from '../../render/dressing/kit';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../render/extensions';
import { glowTexture } from '../../render/glow';
import { drawnWhile } from '../../render/idle';
import { windAt } from '../../render/wind';
import { GRAVITY } from '../../sim/constants';
import type { Bouncer } from '../../sim/types';
import { box, paint } from './buildings';

/**
 * Flärken's beach volleyball net (Olov, 14 November 2026: "Kan vi förbättra beachvolleynätets utseende och göra det
 * tydligare att man kan hoppa på det för att studsa?"). It was a thick white rope dipping between two posts with a
 * few strands under it, and nothing said it would throw him up.
 *
 * It is a net again: two steel posts, the left one guyed to pegs in the sand behind it and the right one to a peg by
 * the changing hut it stands in front of; a wide white tape along its top and a thin one along its foot; a knotted
 * mesh between them, seen face on; and its two antennas in red and white. The storm has slackened its top line, so the
 * whole net sags deep between its posts, to his knees in the middle, where its foot is folded forward into a pocket:
 * that is where he lands. It moves in the wind, and it is wet.
 *
 * That it is springy is shown before he gets to it: a volleyball and two pine cones lie caught in the pocket, and the
 * wind heaving the net tosses them, each landing with a dip in the mesh that springs back. When he comes down on it
 * (the simulation's bounce, src/sim/sim.ts) the net dips deep under him, springs up past where it hung and quivers;
 * the ball and the cones are thrown up with him, and the rain is shaken out of it.
 *
 * The picture's business only: where and how high he bounces is the chapter's bouncer. With less motion it hangs
 * still, the ball lying in it. (The changing hut's wall is 0.6 behind the play plane: the net has to hang in front of it.)
 */

/** Its measures, in EL, from the bouncer: the pocket's top is the bouncer's, where he lands. */
export const NET = {
  /** From its middle to each post, and how far behind the play plane the posts stand. */
  half: 2.5, back: -0.22,
  /** How far behind the play plane its foot and its top hang in the middle. */
  near: -0.08, far: -0.3,
  /** How high its foot and its top are fastened to the posts, how high its top hangs in the middle, and the posts. */
  low: 1.3, high: 2.2, top: 1.34, post: 2.5,
  /** The grid its mesh is drawn on: along it, and up it. */
  along: 32, across: 8,
} as const;

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 31.7) * 43758.5453; return s - Math.floor(s); };

/** The net's knotted mesh and its two tapes, as numbers (no canvas): one square along it, the whole net up it. */
function meshTexture(): DataTexture {
  const W = 32, H = 256, CELL = H / NET.across, THREAD = 4, FOOT_TAPE = 9, TOP_TAPE = 22;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tape = y < FOOT_TAPE || y >= H - TOP_TAPE;
    const u = x % W, v = y % CELL;
    const thread = Math.min(u, W - u) < THREAD / 2 || Math.min(v, CELL - v) < THREAD / 2;
    // A knot where two threads cross: a little thicker.
    const knot = Math.hypot(Math.min(u, W - u), Math.min(v, CELL - v)) < THREAD * 0.95;
    const shade = tape ? 238 : knot ? 232 : 214;
    data.set([shade, shade, tape ? shade : shade + 6, tape || thread || knot ? 255 : 0], (y * W + x) * 4);
  }
  const texture = new DataTexture(data, W, H);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** A beach volleyball: yellow and blue panels with white between. */
function volleyball(radius: number): Mesh {
  const shape = new SphereGeometry(radius, 20, 14);
  const at = shape.getAttribute('position');
  const colours: number[] = [];
  const tones = [[0.9, 0.62, 0.06], [0.05, 0.22, 0.55], [0.9, 0.9, 0.86]] as const;
  for (let i = 0; i < at.count; i++) {
    // Six panels swept round it, yellow and blue by turns, each edged with white.
    const x = at.getX(i) / radius, y = at.getY(i) / radius, z = at.getZ(i) / radius;
    const sweep = (Math.atan2(z, x) / (Math.PI * 2) + 0.5 + 0.16 * y) * 6;
    const band = ((sweep % 1) + 1) % 1, which = ((Math.floor(sweep) % 2) + 2) % 2;
    const tone = band < 0.14 || band > 0.86 ? tones[2] : tones[which]!;
    colours.push(tone[0], tone[1], tone[2]);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  const ball = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, emissive: '#30343c', emissiveIntensity: 0.3 }));
  ball.name = 'volley-ball';
  ball.castShadow = true;
  return ball;
}

/** A hop off the net: how high over it something is `t` seconds after it left it, for hops of these heights in turn. */
function hops(t: number, heights: readonly number[], g: number): { up: number; landed: number } {
  let from = 0;
  for (const [i, high] of heights.entries()) {
    const long = 2 * Math.sqrt((2 * high) / g);
    if (t < from + long) { const k = (t - from) / long; return { up: 4 * high * k * (1 - k), landed: i }; }
    from += long;
  }
  return { up: 0, landed: heights.length };
}
const hopsLast = (heights: readonly number[], g: number) => heights.reduce((sum, high) => sum + 2 * Math.sqrt((2 * high) / g), 0);

/**
 * What lies in the net and is tossed by it: where (along it from its middle, and up it from 0 at its foot to 1 at its
 * top), how high its middle lies over the mesh, how often the wind tosses it and how high, and what it has done so
 * far: the last toss it began, and how many times it has landed since he last threw it up.
 */
interface Tossed { mesh: Object3D; x: number; v: number; lift: number; every: number; phase: number; high: number; spin: number; round: number; thrown: number; landed: number }
/** How fast what is tossed falls back, in EL/s²: slower than he does, so that it is seen. */
const FALL = 16;
/** How high the ball goes when he lands on the net, and in its two bounces after; the cones go a little less high. */
const THROWN = [1.15, 0.42, 0.13] as const;

/** One net, at a bouncer. */
export function volleyNet(bouncer: Bouncer, ground: number) {
  const group = new Group();
  group.name = 'volley-net';
  group.position.set(bouncer.x, ground, 0);
  const dip = bouncer.y - ground;

  /** Where the net hangs at rest: `u` from -1 at the left post to 1 at the right, `v` from 0 at its foot to 1 at its top. */
  const rest = (u: number, v: number, out: Vector3): Vector3 => {
    const free = 1 - u * u;
    const foot = dip + (NET.low - dip) * u * u, top = NET.top + (NET.high - NET.top) * u * u;
    // The pocket along its foot, where it sags deepest: the mesh folds down behind the foot's tape and up again.
    const fold = 2.7 * v * (1 - v) ** 3 * free * free;
    return out.set(NET.half * u, foot + (top - foot) * v - fold, NET.back + ((NET.near - NET.back) * (1 - v) + (NET.far - NET.back) * v) * free);
  };

  // --- what stands: the posts, their guy lines and pegs, the winch, the antennas ---------------------------------
  const standing: BufferGeometry[] = [];
  const STEEL = '#aab2b6', DARK = '#3a4046', ROPE = '#d8d2bc', PEG = '#b8552e', SAND = '#b7a57e';
  const line = (a: Vector3, b: Vector3, radius: number, colour: string) => {
    const way = b.clone().sub(a), long = way.length();
    const tube = new CylinderGeometry(radius, radius, long, 5, 1, true);
    tube.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), way.normalize()));
    tube.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return paint(tube, colour);
  };
  // The left post's two guy lines go to pegs in the sand behind the net; the right one stands close in front of the
  // changing hut, and its one line comes down to a peg beside it, in front of the hut. (From the post: along, and back.)
  const GUYS: Record<number, readonly (readonly [number, number])[]> = { [-1]: [[-0.2, -1.3], [0.85, -1.2]], 1: [[0.78, 0.12]] };
  for (const side of [-1, 1]) {
    const x = side * (NET.half + 0.07);
    // The post, sunk in the sand, with a cap, a dark collar where each of the net's corners is made fast, and the sand
    // heaped at its foot.
    standing.push(paint(new CylinderGeometry(0.065, 0.075, NET.post + 0.3, 10).translate(x, (NET.post - 0.3) / 2, NET.back), STEEL));
    standing.push(paint(new CylinderGeometry(0.085, 0.085, 0.06, 10).translate(x, NET.post + 0.02, NET.back), DARK));
    for (const y of [NET.low, NET.high]) standing.push(paint(new CylinderGeometry(0.088, 0.088, 0.13, 10).translate(x, y, NET.back), DARK));
    standing.push(paint(new SphereGeometry(0.3, 10, 6).scale(1, 0.28, 0.7).translate(x, 0, NET.back), SAND));
    const top = new Vector3(x, NET.post - 0.12, NET.back);
    for (const [along, back] of GUYS[side]!) {
      const peg = new Vector3(x + along, 0.03, NET.back + back);
      standing.push(line(top, peg, 0.014, ROPE));
      // The peg, driven in aslant away from the post, its head just over the sand, and the sand it has pushed up.
      const lean = new Vector3(peg.x - x, 0, peg.z - NET.back).normalize().multiplyScalar(0.5).setY(-1).normalize();
      standing.push(line(peg.clone().addScaledVector(lean, -0.16), peg.clone().addScaledVector(lean, 0.14), 0.028, PEG));
      standing.push(paint(new SphereGeometry(0.11, 8, 5).scale(1, 0.3, 1).translate(peg.x, 0, peg.z), SAND));
    }
    // The net's antenna: a thin rod in red and white bands up its side, standing well over its top.
    const u = side * 0.86;
    const foot = rest(u, 0, new Vector3()), tip = rest(u, 1, new Vector3()).add(new Vector3(0, 0.85, 0));
    foot.z += 0.02; tip.z += 0.02;
    const BANDS = 8;
    for (let i = 0; i < BANDS; i++) standing.push(line(foot.clone().lerp(tip, i / BANDS), foot.clone().lerp(tip, (i + 1) / BANDS), 0.022, i % 2 ? '#f2f0e8' : '#cf3a2c'));
  }
  // The winch on the left post, which drew its top line tight in summer, and its crank.
  standing.push(box(0.16, 0.2, 0.1, -(NET.half + 0.07), NET.post - 0.5, NET.back + 0.1, DARK));
  standing.push(line(new Vector3(-(NET.half + 0.07), NET.post - 0.5, NET.back + 0.16), new Vector3(-(NET.half + 0.19), NET.post - 0.61, NET.back + 0.2), 0.014, STEEL));
  const frame = new Mesh(mergeGeometries(standing)!, new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 }));
  frame.name = 'volley-net-posts';
  frame.castShadow = true;
  standing.forEach((part) => part.dispose());

  // --- the net itself: a sheet of mesh, and its two tapes as round bands, all moved each frame --------------------
  const U = NET.along, V = NET.across;
  const sheetAt = new Float32Array((U + 1) * (V + 1) * 3);
  const sheetUv: number[] = [], sheetIndex: number[] = [];
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) sheetUv.push((i / U) * 44, j / V);
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
    const a = i * (V + 1) + j, b = a + V + 1;
    sheetIndex.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const sheetShape = new BufferGeometry();
  // (Not a copy of the numbers: they are written into each frame.)
  const sheetPositions = new BufferAttribute(sheetAt, 3);
  sheetPositions.setUsage(DynamicDrawUsage);
  sheetShape.setAttribute('position', sheetPositions);
  sheetShape.setAttribute('uv', new Float32BufferAttribute(sheetUv, 2));
  sheetShape.setIndex(sheetIndex);
  // Wet cord: a little sheen, and pale enough to be told in the storm's dark. Seen from both sides, and through its holes.
  const sheet = new Mesh(sheetShape, new MeshStandardMaterial({
    map: meshTexture(), transparent: true, alphaTest: 0.08, side: DoubleSide, roughness: 0.5, depthWrite: false, emissive: '#6a7a88', emissiveIntensity: 0.3,
  }));
  sheet.name = 'volley-net-mesh';
  sheet.frustumCulled = false;
  sheet.renderOrder = 2;

  const ROUND = 6;
  const tapes = [{ v: 0, radius: 0.036 }, { v: 1, radius: 0.055 }];
  const tapeAt = new Float32Array(tapes.length * (U + 1) * ROUND * 3);
  const tapeIndex: number[] = [];
  for (let t = 0; t < tapes.length; t++) for (let i = 0; i < U; i++) for (let k = 0; k < ROUND; k++) {
    const a = (t * (U + 1) + i) * ROUND + k, b = (t * (U + 1) + i) * ROUND + ((k + 1) % ROUND);
    tapeIndex.push(a, b, a + ROUND, b, b + ROUND, a + ROUND);
  }
  const tapeShape = new BufferGeometry();
  const tapePositions = new BufferAttribute(tapeAt, 3);
  tapePositions.setUsage(DynamicDrawUsage);
  tapeShape.setAttribute('position', tapePositions);
  tapeShape.setIndex(tapeIndex);
  const tape = new Mesh(tapeShape, new MeshStandardMaterial({ color: '#f1f1ea', roughness: 0.38, emissive: '#5a6a78', emissiveIntensity: 0.3 }));
  tape.name = 'volley-net-tapes';
  tape.frustumCulled = false;

  // Its shade on the sand under it.
  const shade = new Mesh(new PlaneGeometry(NET.half * 2.1, 1.1).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#000000', map: glowTexture(32), transparent: true, opacity: 0.4, depthWrite: false }));
  shade.position.set(0, 0.025, NET.back);
  shade.renderOrder = 1;

  // --- what lies in its pocket: a volleyball and two cones, which the heaving net tosses --------------------------
  const ball = volleyball(0.21);
  const coneShape = paint(new CylinderGeometry(0.03, 0.095, 0.27, 9, 3).rotateZ(Math.PI / 2), '#6a4428');
  const coneWood = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, emissive: '#2a1a0e', emissiveIntensity: 0.4 });
  const cones = [0, 1].map(() => { const cone = new Mesh(coneShape, coneWood); cone.name = 'volley-cone'; cone.castShadow = true; return cone; });
  const tossed: Tossed[] = [
    { mesh: ball, x: -0.86, v: 0.2, lift: 0.2, every: 2.3, phase: 0.4, high: 0.46, spin: 0, round: -1, thrown: -10, landed: 0 },
    { mesh: cones[0]!, x: -1.5, v: 0.2, lift: 0.08, every: 2.3, phase: 1.3, high: 0.28, spin: 0.4, round: -1, thrown: -10, landed: 0 },
    { mesh: cones[1]!, x: 0.72, v: 0.2, lift: 0.08, every: 2.3, phase: 1.75, high: 0.22, spin: 2.1, round: -1, thrown: -10, landed: 0 },
  ];
  // The rain shaken out of it when he lands: a few drops thrown up, in one draw.
  const DROPS = 10;
  const spray = new InstancedMesh(new SphereGeometry(0.03, 6, 4), new MeshBasicMaterial({ color: '#cfe0ee', transparent: true, opacity: 0.8, depthWrite: false }), DROPS);
  spray.instanceMatrix.setUsage(DynamicDrawUsage);
  spray.frustumCulled = false;
  drawnWhile(spray, false);
  group.add(shade, frame, sheet, tape, ball, ...cones, spray);

  /** What has struck the net: when, where, and how deep it dips (less than nothing: it billows up). */
  const kicks: { at: number; x: number; v: number; deep: number }[] = [];
  const kick = (at: number, x: number, v: number, deep: number) => { kicks.push({ at, x, v, deep }); if (kicks.length > 14) kicks.shift(); };
  /** A struck net: down fast, up past where it hung, and quivering to rest. */
  const sprung = (t: number) => (t <= 0 ? 0 : -smooth(t / 0.03) * Math.exp(-t / 0.34) * Math.cos(t * Math.PI * 2 * 2.7));
  let gust = 0, calm = false, now = 0;
  const point = new Vector3(), next = new Vector3(), side = new Vector3(), up = new Vector3(), place = new Object3D();
  /** Where the net is now at (u, v): where it hangs, blown about, and sprung by what has struck it. */
  const at = (u: number, v: number, out: Vector3): Vector3 => {
    rest(u, v, out);
    if (calm) return out;
    const free = 1 - u * u;
    let lift = (0.018 + 0.03 * gust) * free * Math.sin(1.9 * out.x - now * 4.3 + v * 1.4);
    for (const k of kicks) {
      const t = now - k.at;
      if (t <= 0 || t > 3) continue;
      const dx = (out.x - k.x) / 0.85, dv = (v - k.v) / 0.6;
      lift += k.deep * sprung(t) * Math.exp(-dx * dx) * (0.5 + 0.5 * Math.exp(-dv * dv)) * Math.min(1, free * 3);
    }
    out.y += lift;
    // The wind bellies it out towards the camera and lets it fall back, and runs along it in ripples.
    out.z += (0.07 * gust * Math.sin(Math.PI * v) + 0.03 * Math.sin(2.2 * out.x - now * 4.3 + v * 2)) * free;
    return out;
  };

  let bounced = -10, armed = -10, low = Infinity, lastY: number | null = null, sprayX = 0;
  /** He has come down on it at `x` (from its middle), at `clock`: it dips under him, and what lies in it is thrown up. */
  const bounce = (clock: number, x: number): void => {
    bounced = clock;
    sprayX = x;
    kick(clock, Math.max(-1.2, Math.min(1.2, x)), 0.05, 0.38);
  };
  /** How high over the mesh a tossed thing is now, and the net struck where it lands. */
  const tossedBy = (thing: Tossed, i: number, clock: number): number => {
    // Thrown up with him a moment after he lands, and down again in smaller and smaller bounces.
    const highs = THROWN.map((high) => high * (i === 0 ? 1 : 0.8 - 0.1 * i));
    const long = hopsLast(highs, FALL);
    const since = clock - bounced - 0.05;
    if (since >= 0 && since < long) {
      if (thing.thrown !== bounced) { thing.thrown = bounced; thing.landed = 0; }
      const hop = hops(since, highs, FALL);
      if (hop.landed > thing.landed) { thing.landed = hop.landed; kick(clock, thing.x, thing.v, 0.1 / hop.landed); }
      return hop.up;
    }
    // The wind's toss, every so often: the net billows under it, it hops, lands with a dip, and hops once more, lower.
    const round = Math.floor((clock + thing.phase) / thing.every), into = clock + thing.phase - round * thing.every, begun = clock - into;
    const heights = [thing.high * (0.75 + 0.5 * hash(round * 3 + i)), thing.high * 0.22];
    if (begun < bounced + long + 0.4) return 0;
    if (thing.round !== round) {
      thing.round = round;
      // What strikes the net is told ahead of time, so that the mesh never jumps: this toss's landing, and the billow
      // that begins the next.
      kick(begun + hopsLast([heights[0]!], FALL), thing.x, thing.v, 0.09);
      kick(begun + thing.every - 0.12, thing.x, thing.v, -0.08);
    }
    return hops(into, heights, FALL).up;
  };
  const update = ({ clock, dt, x, y, still }: ExtraFrame): void => {
    now = clock;
    calm = still;
    gust = still ? 0 : Math.min(1.5, Math.abs(windAt(bouncer.x)) / 2.4);
    // His bounce, read from how he moves: down onto it, and up from it at once, without having come down to the sand.
    if (dt > 0 && lastY !== null) {
      const vy = (y - lastY) / dt, over = Math.abs(x - bouncer.x) < 0.7;
      if (clock - armed > 0.2) low = Infinity;
      if (over && vy < -2 && y > bouncer.y - 0.25 && y < bouncer.y + 1.6) armed = clock;
      if (over && clock - armed <= 0.2) low = Math.min(low, y);
      if (over && clock - armed <= 0.2 && vy > 3.5 && low > bouncer.y - 0.25 && clock - bounced > 0.3) { bounce(clock, x - bouncer.x); armed = -10; }
    }
    lastY = y;
    for (const [i, thing] of tossed.entries()) {
      const upBy = still ? 0 : tossedBy(thing, i, clock);
      at(thing.x / NET.half, thing.v, point);
      thing.mesh.position.set(point.x, point.y + thing.lift + upBy, point.z + 0.03);
      // It lies as it fell, and turns as it flies.
      thing.mesh.rotation.set(thing.spin * 0.3, thing.spin, 0.25 + upBy * 2.4 * (i % 2 ? -1 : 1));
    }
    // The mesh, corner by corner.
    for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
      at((i / U) * 2 - 1, j / V, point);
      sheetAt.set([point.x, point.y, point.z], (i * (V + 1) + j) * 3);
    }
    sheetPositions.needsUpdate = true;
    sheetShape.computeVertexNormals();
    // Its two tapes: a ring of corners round each point of each edge.
    for (const [t, band] of tapes.entries()) for (let i = 0; i <= U; i++) {
      const u = (i / U) * 2 - 1;
      at(u, band.v, point);
      at(Math.min(1, u + 0.02), band.v, next).sub(at(Math.max(-1, u - 0.02), band.v, side)).normalize();
      side.set(0, 0, 1).cross(next).normalize();
      up.crossVectors(next, side).normalize();
      for (let k = 0; k < ROUND; k++) {
        const a = (k / ROUND) * Math.PI * 2, c = Math.cos(a) * band.radius, s = Math.sin(a) * band.radius;
        tapeAt.set([point.x + side.x * c + up.x * s, point.y + side.y * c + up.y * s, point.z + side.z * c + up.z * s], ((t * (U + 1) + i) * ROUND + k) * 3);
      }
    }
    tapePositions.needsUpdate = true;
    tapeShape.computeVertexNormals();
    // The rain shaken out of it.
    const wet = clock - bounced;
    const spraying = !still && wet >= 0 && wet < 0.7;
    drawnWhile(spray, spraying);
    if (spraying) {
      for (let i = 0; i < DROPS; i++) {
        const away = (hash(i * 7 + 1) - 0.5) * 2.2, speed = 3.2 + 2.4 * hash(i * 5 + 2);
        place.position.set(sprayX + away * (0.2 + wet * 0.9), dip + speed * wet - 0.5 * GRAVITY * 0.55 * wet * wet, NET.near + 0.06 - 0.2 * hash(i * 3));
        place.scale.setScalar(place.position.y > 0.05 ? 1 - 0.6 * (wet / 0.7) : 0);
        place.updateMatrix();
        spray.setMatrixAt(i, place.matrix);
      }
      spray.instanceMatrix.needsUpdate = true;
    }
  };
  // Hung, before the first frame is drawn.
  update({ clock: 0, dt: 0, x: -1e6, y: 0, still: true } as ExtraFrame);
  return {
    group,
    bounce,
    update,
    /** How far the net's foot is now from where it hangs, `x` from its middle: for the tests. */
    dipAt: (x: number): number => at(x / NET.half, 0, point).y - rest(x / NET.half, 0, next).y,
    /** Where the net's foot hangs at rest, `x` from its middle, in the net's own space: for the tests. */
    footAt: (x: number): Vector3 => rest(x / NET.half, 0, new Vector3()),
    /** Where the ball is now, in the net's own space: for the tests. */
    ball: ball.position,
  };
}

/** Flärken's net, where the chapter's bouncers are a volleyball net (registered by ./render.ts). */
export function volleyNetExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (chapter.storm?.bouncers !== 'net' || !chapter.bouncers?.length) return null;
  const nets = chapter.bouncers.map((bouncer) => volleyNet(bouncer, heightAt(chapter, bouncer.x)));
  for (const net of nets) scene.add(net.group);
  return { update(frame) { for (const net of nets) net.update(frame); } };
}
