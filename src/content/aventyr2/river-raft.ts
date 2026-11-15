import {
  AdditiveBlending, BufferGeometry, Color, DataTexture, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, LinearFilter, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3,
} from 'three';
import { sequence } from '../../render/dressing/kit';
import type { Afoot, FloatFrame, Floats } from '../../render/floating-ride';
import { glowTexture } from '../../render/glow';
import type { ChapterData } from '../../sim/types';

/**
 * The raft that carries him down Älven's first current. Olov, 14 November 2026: "Det ser ut som om flotten i början
 * svävar ovanför vattnet i stället för att flyta på det." It was drawn under his feet all along the ride's arc, which
 * rose 0.44 over the bank: its logs hung a quarter of an EL over the river, and at each end it lay up on the bank.
 *
 * Now it floats. Six logs lashed under two cross poles, half under the water: wet and dark from the waterline down,
 * dry and paler on top, their sawn ends pale. It lies moored at the bank he comes to, in the water, a line from its
 * stern to a stake on the bank; he walks down onto it and it dips under him and rocks; the line slips, and the current
 * takes it, bobbing and tilting, foam at its bow, lapping along its side and streaming behind it; at the far bank it
 * stops against the gravel, and he walks off its bow and up. It stays there, afloat. The simulation's ride keeps his
 * feet at its deck all the way over the water (../chapters/alven.ts, `RAFT`): `RAFT_SIZE.freeboard` is shared.
 */
export const RAFT_SIZE = {
  long: 3.2,
  wide: 1.84,
  /** How far its deck, the tops of its logs, is over the water with him on it; and how much higher it rides without him. */
  freeboard: 0.2,
  light: 0.04,
  /** How far from a bank's edge it lies when it is against it. */
  gap: 0.12,
} as const;

const BARK = new Color('#43342a'), BARK_LIGHT = new Color('#65513f'), FURROW = new Color('#211913');
const WET = new Color('#1c2219'), DRY = new Color('#7d6d59');
const POLE = new Color('#b9a57c'), ROPE = new Color('#b39c69'), STAKE = new Color('#6a5644');
const YEARS: readonly [number, string][] = [[0, '#6a4f36'], [0.34, '#a8875c'], [0.62, '#cdb388'], [0.86, '#d6be94'], [0.9, '#4e3a2a'], [1, '#33281f']];

const smoothstep = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

/**
 * The raft, in its own frame: its deck (the tops of its logs) at y 0, its middle at the origin, its logs along x. The
 * waterline is `freeboard` under the deck: its colours are wet below that.
 */
export function raftShape(): BufferGeometry {
  const next = sequence(4711);
  const position: number[] = [];
  const colour: number[] = [];
  const index: number[] = [];
  const c = new Color();
  const put = (x: number, y: number, z: number, tone: Color) => { position.push(x, y, z); colour.push(tone.r, tone.g, tone.b); return position.length / 3 - 1; };
  const waterline = -RAFT_SIZE.freeboard;
  /** Dark and wet where the water has it, damp a hand over that where it laps, drier and paler on top. */
  const wetted = (tone: Color, y: number, along: number) => {
    const laps = waterline + 0.04 + 0.018 * Math.sin(along * 5.3);
    const wet = 1 - smoothstep(laps - 0.015, laps + 0.045, y);
    tone.lerp(WET, 0.82 * wet);
    tone.multiplyScalar(1 - 0.22 * (1 - smoothstep(laps + 0.03, -0.04, y)) * (1 - wet));
    return tone.lerp(DRY, 0.5 * smoothstep(-0.075, -0.005, y) * (1 - wet));
  };
  const AROUND = 12;
  const ALONG = 8;
  const LOGS = 6;
  const spacing = (RAFT_SIZE.wide - 0.36) / (LOGS - 1);
  const logs: { z: number; r: number }[] = [];
  for (let i = 0; i < LOGS; i++) {
    const r = 0.168 + next() * 0.03;
    const z = -RAFT_SIZE.wide / 2 + 0.18 + i * spacing;
    const long = RAFT_SIZE.long * (0.93 + next() * 0.07);
    const shift = (next() - 0.5) * (RAFT_SIZE.long - long);
    const own = 0.82 + next() * 0.34;
    const phase = next() * 6.28;
    const plates = 6 + Math.floor(next() * 3);
    const thin = next() < 0.5 ? 1 : -1;
    logs.push({ z, r });
    const radiusAt = (s: number) => r * (1 - 0.06 * (thin > 0 ? s : 1 - s));
    const furrowAt = (s: number, a: number) => Math.pow(0.5 + 0.5 * Math.cos(a * plates + phase + 1.2 * Math.sin(s * 7 + a * 2)), 4);
    const rings: number[] = [];
    for (let k = 0; k <= ALONG; k++) {
      const s = k / ALONG;
      const big = radiusAt(s);
      rings.push(position.length / 3);
      for (let j = 0; j < AROUND; j++) {
        const a = (j / AROUND) * Math.PI * 2;
        const furrow = furrowAt(s, a);
        const radius = big * (1 - 0.06 * furrow);
        const y = -big + Math.sin(a) * radius;
        const plate = Math.sin(Math.floor((a * plates + phase) / (Math.PI * 2) + s * 3.1) * 12.9898 + i * 3.7) * 43758.5453;
        c.copy(BARK).lerp(BARK_LIGHT, 0.2 + 0.65 * (plate - Math.floor(plate))).multiplyScalar(own).lerp(FURROW, furrow * 0.8);
        put(shift + (s - 0.5) * long, y, z + Math.cos(a) * radius, wetted(c, y, s * long + i));
      }
    }
    for (let k = 0; k < ALONG; k++) for (let j = 0; j < AROUND; j++) {
      const a = rings[k]! + j, b = rings[k]! + ((j + 1) % AROUND), d = rings[k + 1]! + j, e = rings[k + 1]! + ((j + 1) % AROUND);
      index.push(a, d, b, b, d, e);
    }
    // Its sawn ends: the years' rings, pale, the bark round them; dark where the water has them.
    for (const [s, side] of [[0, -1], [1, 1]] as const) {
      const big = radiusAt(s);
      const x = shift + (s - 0.5) * long;
      const loops = YEARS.map(([share, hex]) => {
        const first = position.length / 3;
        for (let j = 0; j < AROUND; j++) {
          const a = (j / AROUND) * Math.PI * 2;
          const radius = big * (1 - 0.06 * furrowAt(s, a)) * share;
          const y = -big + Math.sin(a) * radius;
          put(x + side * 0.012 * (1 - share), y, z + Math.cos(a) * radius, wetted(c.set(hex).multiplyScalar(0.92 + 0.12 * own), y, i * 2.1));
        }
        return first;
      });
      for (let k = 0; k < loops.length - 1; k++) for (let j = 0; j < AROUND; j++) {
        const a = loops[k]! + j, b = loops[k]! + ((j + 1) % AROUND), d = loops[k + 1]! + j, e = loops[k + 1]! + ((j + 1) % AROUND);
        if (side > 0) index.push(a, b, d, b, e, d);
        else index.push(a, d, b, b, d, e);
      }
    }
  }
  // Two peeled poles across the logs, towards its ends, and the rope that lashes each log to them.
  const ROUND = 7;
  for (const x of [-RAFT_SIZE.long * 0.36, RAFT_SIZE.long * 0.36]) {
    const rings: number[] = [];
    const reach = RAFT_SIZE.wide / 2 + 0.1;
    const stops = [-reach, -reach * 0.4, reach * 0.4, reach];
    for (const [k, z] of stops.entries()) {
      rings.push(position.length / 3);
      for (let j = 0; j < ROUND; j++) {
        const a = (j / ROUND) * Math.PI * 2;
        const y = 0.04 + Math.sin(a) * 0.05;
        put(x + Math.cos(a) * 0.05 + 0.02 * Math.sin(k * 2.1 + x), y, z, c.copy(POLE).multiplyScalar(0.8 + 0.2 * Math.sin(a) + 0.1 * Math.sin(k * 3.3 + x)));
      }
    }
    for (let k = 0; k < stops.length - 1; k++) for (let j = 0; j < ROUND; j++) {
      const a = rings[k]! + j, b = rings[k]! + ((j + 1) % ROUND), d = rings[k + 1]! + j, e = rings[k + 1]! + ((j + 1) % ROUND);
      index.push(a, b, d, b, e, d);
    }
    for (const [ring, z, turn] of [[rings[0]!, -reach, -1], [rings[stops.length - 1]!, reach, 1]] as const) {
      const middle = put(x, 0.04, z + turn * 0.004, c.set('#d8c49a'));
      for (let j = 0; j < ROUND; j++) {
        const a = ring + j, b = ring + ((j + 1) % ROUND);
        if (turn > 0) index.push(a, b, middle); else index.push(b, a, middle);
      }
    }
    // The lashings: a band of rope round each log on both sides of the pole.
    for (const log of logs) for (const beside of [-0.085, 0.085]) {
      const first = position.length / 3;
      for (const at of [-0.024, 0.024]) for (let j = 0; j < AROUND; j++) {
        const a = (j / AROUND) * Math.PI * 2;
        const y = -log.r + Math.sin(a) * (log.r + 0.014);
        put(x + beside + at, y, log.z + Math.cos(a) * (log.r + 0.014), wetted(c.copy(ROPE).multiplyScalar(0.85 + 0.2 * Math.sin(j * 2.4 + log.z * 9)), y, x));
      }
      for (let j = 0; j < AROUND; j++) {
        const a = first + j, b = first + ((j + 1) % AROUND), d = first + AROUND + j, e = first + AROUND + ((j + 1) % AROUND);
        index.push(a, d, b, b, d, e);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** A soft dark patch, for the raft's shade on the water: full under it, and gone a little way out from it. */
function shadeTexture(size = 32): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [u, v] = [Math.abs((x + 0.5) / size - 0.5) * 2, Math.abs((y + 0.5) / size - 0.5) * 2];
    const out = Math.pow(u ** 4 + v ** 4, 0.25);
    data.set([0, 0, 0, Math.round(255 * smoothstep(1, 0.58, out))], (y * size + x) * 4);
  }
  const texture = new DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The mooring: a stake on the bank and a line from it, ten points long, in one shape whose line is moved each frame. */
const LINE = { points: 10, round: 4, thick: 0.02 };
function mooringShape(): { geometry: BufferGeometry; lineFrom: number } {
  const position: number[] = [];
  const colour: number[] = [];
  const index: number[] = [];
  const c = new Color();
  // The stake: a short peeled post, standing at the origin, cut at a slant on top.
  const ROUND = 6;
  for (const [k, y] of [0, 0.5, 0.78].entries()) for (let j = 0; j < ROUND; j++) {
    const a = (j / ROUND) * Math.PI * 2;
    const r = k === 2 ? 0.075 : 0.085;
    position.push(Math.cos(a) * r, y + (k === 2 ? 0.05 * Math.cos(a) : 0), Math.sin(a) * r);
    c.copy(STAKE).multiplyScalar(k === 0 ? 0.6 : 0.9 + 0.15 * Math.sin(j * 1.7));
    colour.push(c.r, c.g, c.b);
  }
  for (let k = 0; k < 2; k++) for (let j = 0; j < ROUND; j++) {
    const a = k * ROUND + j, b = k * ROUND + ((j + 1) % ROUND), d = a + ROUND, e = b + ROUND;
    index.push(a, d, b, b, d, e);
  }
  const top = position.length / 3;
  position.push(0, 0.8, 0);
  colour.push(0.72, 0.62, 0.45);
  for (let j = 0; j < ROUND; j++) index.push(2 * ROUND + j, top, 2 * ROUND + ((j + 1) % ROUND));
  const lineFrom = position.length / 3;
  for (let k = 0; k < LINE.points; k++) for (let j = 0; j < LINE.round; j++) {
    position.push(0, 0.6, 0);
    c.copy(ROPE).multiplyScalar(0.8 + 0.25 * ((k + j) % 2));
    colour.push(c.r, c.g, c.b);
  }
  for (let k = 0; k < LINE.points - 1; k++) for (let j = 0; j < LINE.round; j++) {
    const a = lineFrom + k * LINE.round + j, b = lineFrom + k * LINE.round + ((j + 1) % LINE.round), d = a + LINE.round, e = b + LINE.round;
    index.push(a, d, b, b, d, e);
  }
  const geometry = new BufferGeometry();
  const at = new Float32BufferAttribute(position, 3);
  at.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', at);
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, lineFrom };
}

/** How many soft white patches its foam is made of: lapping along its side, its bow's wave, and what streams behind it. */
const FOAM = { lap: 9, bow: 4, wake: 12 };
/** How far over the water's level its foam and its shade lie: over the river's swell, which lifts the surface a little. */
const FOAM_OVER = 0.05;
const FOAM_TIP = 0.5;
/** How fast the current carries it at most, in EL a second: the foam and its rocking are as strong as its share of this. */
const FULL_SPEED = 4.5;

/**
 * The raft for a ride over water (`userData.floats`, `userData.afoot`: ../../render/floating-ride.ts). `course` gives
 * the chapter it is in, once the picture is built: the water it floats on is the stretch under the ride's middle.
 */
export function riverRaft(course: () => ChapterData | null): Group {
  const group = new Group();
  group.name = 'river-raft';
  const half = RAFT_SIZE.long / 2;
  const hull = new Mesh(raftShape(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, name: 'river-raft' }));
  hull.name = 'river-raft-logs';
  const shade = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: shadeTexture(), transparent: true, opacity: 0.62, depthWrite: false }));
  shade.name = 'river-raft-shade';
  shade.scale.set(RAFT_SIZE.long + 1.1, 1, RAFT_SIZE.wide + 1.1);
  // Each patch of foam lies on the water tipped up towards the camera, which looks along the river from low over it:
  // flat, it was a hair's breadth.
  const foam = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2 + FOAM_TIP), new MeshBasicMaterial({
    color: '#ffffff', map: glowTexture(32), transparent: true, depthWrite: false, blending: AdditiveBlending,
  }), FOAM.lap + FOAM.bow + FOAM.wake);
  foam.name = 'river-raft-foam';
  foam.frustumCulled = false;
  const tint = new Color();
  for (let i = 0; i < foam.count; i++) foam.setColorAt(i, tint.setRGB(0, 0, 0));
  const mooring = mooringShape();
  const line = new Mesh(mooring.geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  line.name = 'river-raft-mooring';
  line.frustumCulled = false;
  group.add(hull, shade, foam, line);

  /** The stretch of water it floats on, the two banks' edges, and where it lies at each: known once it is asked for. */
  let lane: { from: number; to: number; y: number; rest: number; land: number } | null = null;
  const laneOf = (frame: Pick<FloatFrame, 'ride'>) => {
    if (lane) return lane;
    const middle = (frame.ride.from.x + frame.ride.to.x) / 2;
    const pool = (course()?.water ?? []).find((w) => middle > w.from && middle < w.to) ?? { from: frame.ride.from.x + 0.6, to: frame.ride.to.x - 1, y: frame.ride.skim?.y ?? 0 };
    return (lane = { from: pool.from, to: pool.to, y: pool.y, rest: pool.from + RAFT_SIZE.gap + half, land: pool.to - RAFT_SIZE.gap - half });
  };
  const afoot: Afoot = (x) => !!lane && (x < lane.rest || x > lane.land);

  // What it remembers from frame to frame: where it is, how fast it goes, how deep his weight has it, and the line.
  const state = { x: NaN, speed: 0, weight: 0, dip: 0, dipSpeed: 0, tilt: 0, slipped: 0, landed: false, wasBoarded: false };
  const place = new Object3D();
  const cleat = new Vector3();
  const from = new Vector3();
  const to = new Vector3();
  const p = new Vector3();

  const floats: Floats = (frame) => {
    const at = laneOf(frame);
    const { clock, calm } = frame;
    const dt = Math.min(0.1, frame.dt);
    const wantX = !frame.boarded ? at.rest : frame.ridden ? Math.min(at.land, Math.max(at.rest, frame.x)) : at.land;
    const fresh = Number.isNaN(state.x) || frame.boarded !== state.wasBoarded && !frame.ridden;
    if (fresh) { state.x = wantX; state.speed = 0; state.landed = frame.boarded; state.slipped = frame.boarded ? 1 : 0; state.dip = 0; state.dipSpeed = 0; state.weight = 0; }
    state.wasBoarded = frame.boarded;
    const speed = dt > 0 ? (wantX - state.x) / dt : 0;
    state.speed += (speed - state.speed) * Math.min(1, dt * 8);
    state.x = wantX;
    const going = calm ? 0 : Math.min(1, Math.abs(state.speed) / FULL_SPEED);
    const surface = frame.surface(state.x) ?? at.y;
    // His weight on it, where on it he stands, and how it gives under him: down a little, more as he steps on, and
    // tipped towards the end he is at.
    const on = frame.ridden && frame.x > state.x - half - 0.1 && frame.x < state.x + half + 0.1 ? 1 : 0;
    const stands = on ? Math.max(-1, Math.min(1, (frame.x - state.x) / half)) : 0;
    if (calm || dt <= 0) { state.weight = on; state.dip = 0; state.dipSpeed = 0; state.tilt = 0; }
    else {
      const was = state.weight;
      state.weight += (on - state.weight) * Math.min(1, dt * 9);
      // A spring: a step onto it sends it down past where it settles, and it rocks to rest.
      state.dipSpeed += (state.weight - was) * -0.45 + (-state.dip * 70 - state.dipSpeed * 5.5) * dt;
      state.dip += state.dipSpeed * dt;
      state.tilt += (-0.04 * stands * state.weight - state.tilt) * Math.min(1, dt * 5);
      if (on && was < 0.5 && state.weight >= 0.5) for (const end of [-0.7, 0.75]) frame.ripple(state.x + end * half, 0.25, 0.9);
      if (frame.boarded && !state.landed && state.x >= at.land - 1e-3) { state.landed = true; frame.ripple(at.land + half, 0.2, 1); state.dipSpeed -= 0.25; }
    }
    // It rides a little higher without him. Under his feet its deck is where the ride has his feet, and only breathes.
    const rocks = calm ? 0 : 1;
    const loose = 1 - state.weight;
    const bob = rocks * ((0.012 + 0.02 * loose + 0.012 * going) * Math.sin(clock * 2.3 + 0.7) + 0.008 * loose * Math.sin(clock * 3.7));
    const deck = frame.ride.skim?.y ?? surface + RAFT_SIZE.freeboard;
    hull.position.set(state.x, deck + RAFT_SIZE.light * loose + state.dip + bob, 0);
    hull.rotation.set(
      rocks * (0.03 + 0.03 * going) * Math.sin(clock * 1.7 + 0.3),
      rocks * (0.03 * Math.sin(clock * 0.6) + (frame.boarded ? 0 : 0.035)),
      state.tilt + rocks * ((0.016 + 0.03 * going) * Math.sin(clock * 1.9 + 1.4) + 0.045 * going * Math.sign(state.speed || 1)),
    );
    shade.position.set(state.x, surface + FOAM_OVER * 0.6, 0);
    shade.layers.set(0);
    foam.layers.set(0);

    // The foam: lapping along its near side and its ends, a wave at its bow, and a wake streaming from its stern.
    const way = state.speed >= 0 ? 1 : -1;
    let n = 0;
    const patch = (x: number, z: number, size: number, light: number, long = 1) => {
      place.position.set(x, surface + FOAM_OVER, z);
      place.scale.set(size * long, 1, size);
      place.updateMatrix();
      foam.setMatrixAt(n, place.matrix);
      foam.setColorAt(n++, tint.setRGB(light * 0.9, light * 0.95, light));
    };
    const edge = RAFT_SIZE.wide / 2;
    for (let i = 0; i < FOAM.lap; i++) {
      const s = (i + 0.5) / FOAM.lap;
      // Round it: along its near side, and its two ends.
      const [x, z] = i < 5 ? [state.x + (s * 1.8 - 0.5) * RAFT_SIZE.long, edge + 0.04] : i < 7 ? [state.x - half - 0.03, (i - 5.5) * 0.9] : [state.x + half + 0.03, (i - 7.5) * 0.9];
      const laps = 0.5 + 0.5 * Math.sin(clock * 2.3 + i * 1.9);
      patch(x, z, 0.3 + 0.1 * laps, calm ? 0.07 : 0.04 + 0.07 * laps + 0.1 * going + 0.22 * Math.min(1, Math.abs(state.dipSpeed) * 3), 2.3);
    }
    for (let i = 0; i < FOAM.bow; i++) {
      const across = (i / (FOAM.bow - 1) - 0.5) * RAFT_SIZE.wide * 1.05;
      patch(state.x + way * (half + 0.14 + 0.06 * Math.sin(clock * 5 + i)), across, 0.45 + 0.25 * going, Math.min(0.26, 0.4 * going) * (0.7 + 0.3 * Math.sin(clock * 6.1 + i * 2.2)), 1.5);
    }
    for (let i = 0; i < FOAM.wake; i++) {
      // Two lines opening behind it, each patch carried back and fading as it goes.
      const side = i % 2 ? 1 : -1;
      const back = (((i >> 1) + (calm ? 0.5 : (clock * 1.6) % 1)) / (FOAM.wake / 2)) * 3.4;
      patch(state.x - way * (half + back), side * (edge * 0.75 + back * 0.22), 0.4 + back * 0.3, Math.min(0.28, 0.4 * going) * (1 - back / 3.4), 1.9);
    }
    foam.count = n;
    foam.instanceMatrix.needsUpdate = true;
    if (foam.instanceColor) foam.instanceColor.needsUpdate = true;

    // The mooring: taut from the stake to its stern while it waits; slipped, it lies down the bank from the stake.
    state.slipped = calm || dt <= 0 ? (frame.boarded ? 1 : 0) : Math.max(0, Math.min(1, state.slipped + (frame.boarded ? dt / 0.7 : -dt / 0.4)));
    const bank = frame.ride.from.y;
    line.position.set(at.from - 0.32, bank - 0.12, -0.98);
    hull.updateMatrix();
    cleat.set(-half + 0.14, 0.04, -RAFT_SIZE.wide / 2 + 0.2).applyMatrix4(hull.matrix).sub(line.position);
    from.set(0.02, 0.6, 0.02);
    const let_go = smoothstep(0, 1, state.slipped);
    to.set(cleat.x + (-0.3 - cleat.x) * let_go, cleat.y + (0.15 - cleat.y) * let_go, cleat.z + (0.45 - cleat.z) * let_go);
    const sag = 0.1 + 0.1 * let_go;
    const points = mooring.geometry.getAttribute('position') as Float32BufferAttribute;
    for (let k = 0; k < LINE.points; k++) {
      const t = k / (LINE.points - 1);
      p.copy(from).lerp(to, t);
      p.y -= sag * 4 * t * (1 - t);
      for (let j = 0; j < LINE.round; j++) {
        const a = (j / LINE.round) * Math.PI * 2;
        points.setXYZ(mooring.lineFrom + k * LINE.round + j, p.x, p.y + Math.sin(a) * LINE.thick, p.z + Math.cos(a) * LINE.thick);
      }
    }
    points.needsUpdate = true;
    mooring.geometry.computeVertexNormals();
  };

  group.userData.floats = floats;
  group.userData.afoot = afoot;
  return group;
}
