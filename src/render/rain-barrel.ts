import {
  BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute,
  Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RepeatWrapping, Shape, SphereGeometry,
  SRGBColorSpace, TorusGeometry, BoxGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData, Mover, Spot } from '../sim/types';
import { levelUnder } from '../sim/water-level';
import { barkDetail, barky, PLANK } from './bark-detail';
import type { SpotProp } from './props';

/**
 * Stormgården's rain barrel (Olov, 12 November 2026: "När man vrider på kranen vid tunnan när diket är alldeles för
 * brett så måste vi göra det mer visuellt snyggt och att vattnet man vrider på hänger ihop med locket som kommer upp
 * visuellt"). Before, the ditch was full from the start, the lid lay hidden under its water, and turning the tap let a
 * little water fall on the barrel's own top while the lid jumped up in half a second, out of the picture.
 *
 * Now it is one thing happening, cause and effect:
 * - the ditch is only half full, and the lid lies awash on its water, low down, where it is seen from the barrel;
 * - he turns the tap's red wheel, and the barrel's water gushes from its spout in an arc down into the ditch behind the
 *   lid, where it splashes, foams and rings (the chapter's `kranen` holds him and takes in the barrel and the ditch);
 * - the ditch fills, and the lid rises on the water, rocking a little, until it lies level with the lawn on both banks;
 * - the barrel runs dry: the jet thins and its last water falls in as the lid comes to rest.
 * The water's height is the simulation's (`floats`, src/sim/water-level.ts): it stands under the lid as the lid rises.
 * When the water comes, and when the lid moves, are the chapter's (`sg:pour`, the lid's `wait` and `seconds`).
 */

/** How far behind the play plane the tap stands, on the barrel's back half: he turns it from in front. */
export const TAP_Z = -0.8;
/**
 * Which way the outlet runs from the tap, along the ground: towards the ditch, and away from the camera, so that the
 * water comes down in the ditch behind the lid, in open water, where it is seen over the ditch's near end (the near
 * shore in front of the path hides what is low in the ditch at the path itself).
 */
const OUT = { x: Math.cos(0.62), z: -Math.sin(0.62) };
/** How long the outlet is, from the tap to its mouth, out past the barrel's rim; and how high it runs over the top. */
const OUTLET = { long: 1.5, high: 0.34 };
/** The spout's mouth, from where the tap stands on the barrel's top. */
export const SPOUT = { x: OUTLET.long * OUT.x, y: OUTLET.high, z: OUTLET.long * OUT.z };
/** The water leaves the spout level at `speed`, and falls a little faster than a stone does: a jet with a will. */
export const JET = { speed: 5, fall: 12 };
/**
 * Where the ditch's near end is: in front of it the near shore (../dressing/ground.ts) stands at the ditch's full height,
 * and what of the lid is in front of it and lower than that is under the shore, and not drawn (`underShore`).
 */
const SHORE = { z: 0.55, y: -0.38 };
/**
 * The water from the spout, in seconds from when it came: up to full over a quarter of a second, full while the barrel
 * empties, and dwindling as it runs dry. The last of it falls in as the lid comes to lie on the banks.
 */
export const FLOW = { open: 0.25, dwindle: 1.85, dry: 2.45 };

const smooth = (k: number) => {
  const t = Math.min(1, Math.max(0, k));
  return t * t * (3 - 2 * t);
};

/** How much water leaves the spout `e` seconds after it came, from 0 to 1. */
export function flowAt(e: number): number {
  if (e < 0 || e >= FLOW.dry) return 0;
  if (e < FLOW.open) return smooth(e / FLOW.open);
  return 1 - smooth((e - FLOW.dwindle) / (FLOW.dry - FLOW.dwindle));
}

/** Where water that left the spout `t` seconds ago is, from the spout's mouth. */
export function jetAt(t: number): { x: number; y: number; z: number } {
  return { x: JET.speed * t * OUT.x, y: -0.5 * JET.fall * t * t, z: JET.speed * t * OUT.z };
}

/** How long water from the spout falls before it meets water `depth` under the spout's mouth. */
export function jetFall(depth: number): number {
  return Math.sqrt((2 * Math.max(0, depth)) / JET.fall);
}

/** The pool a floating thing rises on, the thing, and where the water comes from. */
function barrelOf(chapter: ChapterData) {
  const pool = (chapter.water ?? []).find((w) => w.floats !== undefined);
  const index = (chapter.movers ?? []).findIndex((m) => m.id === pool?.floats);
  const lid = chapter.movers?.[index];
  const tap = (chapter.spots ?? []).find((spot) => spot.look === 'tap');
  return pool && lid && tap ? { pool, index, lid, tap } : null;
}

/** Pale streaks along a jet of water, brighter at its edges where it catches the light, and broken here and there. */
function streaks(): CanvasTexture {
  const w = 64, h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  // Across the jet (x, once round it) and along it (y): a body that lets the dark through, lighter at its sides.
  for (let x = 0; x < w; x++) {
    const side = Math.abs(Math.sin((x / w) * Math.PI * 2));
    g.fillStyle = `rgba(214,232,246,${(0.32 + 0.38 * side).toFixed(3)})`;
    g.fillRect(x, 0, 1, h);
  }
  let seed = 11;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = next() * w, y = next() * h, long = 18 + next() * 60;
    g.fillStyle = `rgba(250,253,255,${(0.35 + 0.5 * next()).toFixed(3)})`;
    g.fillRect(x, y, 1 + next() * 2, long);
    g.fillRect(x, y - h, 1 + next() * 2, long);
  }
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  return map;
}

/** White water where the jet comes down: churned bubbles, thickest in the middle. */
function foam(): CanvasTexture {
  const size = 128, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const mid = size / 2;
  const body = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  body.addColorStop(0, 'rgba(245,250,255,0.85)');
  body.addColorStop(0.45, 'rgba(225,236,244,0.45)');
  body.addColorStop(1, 'rgba(225,236,244,0)');
  g.fillStyle = body;
  g.fillRect(0, 0, size, size);
  let seed = 5;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const r = mid * Math.sqrt(next()) * 0.92, a = next() * Math.PI * 2;
    g.strokeStyle = `rgba(255,255,255,${(0.3 + 0.5 * next()).toFixed(3)})`;
    g.lineWidth = 1 + next() * 1.5;
    g.beginPath();
    g.arc(mid + Math.cos(a) * r, mid + Math.sin(a) * r, 1.5 + next() * 4 * (1 - r / mid), 0, Math.PI * 2);
    g.stroke();
  }
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  return map;
}

/**
 * The rain barrel's tap: a brass standpipe on the barrel's back half with a red wheel on it, and its outlet running out
 * past the rim to a spout over the can, pointing at the ditch. Turned, the wheel goes round once and a quarter; the
 * water itself is the pour's (`createRainBarrel`).
 */
export function barrelTap(spot: Spot): SpotProp {
  const brass = new MeshStandardMaterial({ color: '#b8902e', roughness: 0.35, metalness: 0.6 });
  const red = new MeshStandardMaterial({ color: '#b8322a', roughness: 0.45, metalness: 0.2 });
  const group = new Group();
  const stand = new Mesh(new CylinderGeometry(0.07, 0.09, 0.4, 12), brass);
  stand.position.y = 0.2;
  const body = new Mesh(new SphereGeometry(0.12, 14, 10), brass);
  body.position.y = OUTLET.high;
  const stem = new Mesh(new CylinderGeometry(0.025, 0.025, 0.2, 8), brass);
  stem.position.y = OUTLET.high + 0.16;
  // The outlet, level, out past the rim towards the ditch, with a wider mouth; a clip holds it to the rim.
  const outlet = new Group();
  outlet.rotation.y = -Math.atan2(OUT.z, OUT.x);
  const run = OUTLET.long - 0.12;
  const pipe = new Mesh(new CylinderGeometry(0.055, 0.055, run, 10).rotateZ(Math.PI / 2), brass);
  pipe.position.set(run / 2 + 0.04, OUTLET.high, 0);
  const lip = new Mesh(new CylinderGeometry(0.075, 0.062, 0.14, 12).rotateZ(Math.PI / 2), brass);
  lip.position.set(OUTLET.long - 0.07, OUTLET.high, 0);
  const clip = new Mesh(new BoxGeometry(0.06, 0.38, 0.16), brass);
  clip.position.set(0.56, OUTLET.high - 0.17, 0);
  outlet.add(pipe, lip, clip);
  const wheel = new Group();
  wheel.add(new Mesh(new TorusGeometry(0.17, 0.032, 8, 22).rotateX(Math.PI / 2), red));
  for (const turn of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const spoke = new Mesh(new BoxGeometry(0.34, 0.03, 0.03), red);
    spoke.rotation.y = turn;
    wheel.add(spoke);
  }
  wheel.add(new Mesh(new CylinderGeometry(0.045, 0.045, 0.06, 10), red));
  wheel.position.y = OUTLET.high + 0.27;
  group.add(stand, body, stem, outlet, wheel);
  group.traverse((node) => { if ((node as Mesh).isMesh) node.castShadow = true; });
  const root = new Group();
  root.name = 'barrel-tap';
  root.position.set(spot.at.x, spot.at.y, TAP_Z);
  root.add(group);
  let turned = 0;
  return {
    group: root,
    update(used, _clock, dt) {
      turned = used ? Math.min(1, turned + dt / 0.8) : 0;
      wheel.rotation.y = -smooth(turned) * Math.PI * 2.5;
    },
  };
}

/**
 * What of the lid is under the ditch's near shore is not drawn: low in the ditch, its front reaches in under the shore,
 * whose ground falls away in front, and it showed there through the grass as a second, floating lid.
 */
function underShore(material: MeshStandardMaterial): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:under-shore-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 vShoreAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vShoreAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = 'varying vec3 vShoreAt;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', /* glsl */ `
      if (vShoreAt.z > ${SHORE.z.toFixed(2)} && vShoreAt.y < ${SHORE.y.toFixed(2)}) discard;
      #include <clipping_planes_fragment>`);
  };
}

/**
 * The lid in the ditch: round, of six boards along the way he walks, with gaps between them and an iron hoop round
 * them, and a ring to lift it by at its back. Afloat on the shallow water it rocks a little; rising on the water it
 * sways, and settles once it lies on the banks.
 */
export function barrelLid(mover: Mover): Group {
  const r = mover.width / 2, h = mover.height;
  const boards = 6, gap = 0.045;
  const parts: BufferGeometry[] = [];
  const tone = new Color();
  for (let i = 0; i < boards; i++) {
    const z0 = -r + (i * 2 * r) / boards + gap / 2, z1 = -r + ((i + 1) * 2 * r) / boards - gap / 2;
    // The board's outline in the plane (x along it, y for z): the circle's arc on each end, between z0 and z1.
    const shape = new Shape();
    const arc = (z: number) => Math.sqrt(Math.max(0, r * r - z * z));
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const z = z0 + ((z1 - z0) * k) / steps;
      if (k === 0) shape.moveTo(arc(z), z);
      else shape.lineTo(arc(z), z);
    }
    for (let k = steps; k >= 0; k--) {
      const z = z0 + ((z1 - z0) * k) / steps;
      shape.lineTo(-arc(z), z);
    }
    const board = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, curveSegments: 1 });
    // Its outline's y is the lid's z; extruded downwards, from its top (with the bevel's rounding) at h.
    board.rotateX(Math.PI / 2).translate(0, h - 0.025, 0);
    board.deleteAttribute('uv');
    // Weathered oak, each board a little its own tone, darker where it has lain wet.
    tone.set('#8f6c45').multiplyScalar(0.86 + 0.24 * (((i * 0.618) % 1)));
    const colours = new Float32Array(board.getAttribute('position').count * 3);
    for (let k = 0; k < colours.length; k += 3) colours.set([tone.r, tone.g, tone.b], k);
    board.setAttribute('color', new Float32BufferAttribute(colours, 3));
    parts.push(barky(board.index ? board.toNonIndexed() : board, PLANK));
  }
  const wood = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.62 });
  barkDetail(wood);
  underShore(wood);
  const lid = new Mesh(mergeGeometries(parts), wood);
  lid.name = 'lid-boards';
  lid.castShadow = true;
  lid.receiveShadow = true;
  const iron = new MeshStandardMaterial({ color: '#2b2a2a', roughness: 0.5, metalness: 0.5 });
  underShore(iron);
  const hoop = new Mesh(new CylinderGeometry(r + 0.03, r + 0.03, 0.13, 48, 1, true), iron);
  hoop.position.y = h * 0.55;
  const ring = new Mesh(new TorusGeometry(0.17, 0.028, 6, 18).rotateX(Math.PI / 2), iron);
  ring.position.set(0.3, h + 0.02, -r * 0.72);
  const staple = new Mesh(new BoxGeometry(0.1, 0.05, 0.08), iron);
  staple.position.set(0.3, h + 0.02, -r * 0.72 + 0.17);
  // Its middle lies a little behind the path: it still reaches over the whole ditch where he walks, and lies less on
  // the near shore in front of the ditch (`LID_BACK`).
  const body = new Group();
  body.position.z = -LID_BACK;
  body.add(lid, hoop, ring, staple);
  const group = new Group();
  group.add(body);
  const top = mover.stops[mover.stops.length - 1]!.y;
  let lastY = Number.NaN, lastClock = 0, sway = 0;
  group.userData.tick = (clock: number) => {
    const y = group.parent?.position.y ?? top;
    const dt = clock - lastClock;
    lastClock = clock;
    const rising = Number.isFinite(lastY) && dt > 0 ? Math.max(0, (y - lastY) / dt) : 0;
    if (dt > 0) lastY = y;
    // Resting on the banks it lies still; afloat it rocks a little, and more while the water lifts it.
    const afloat = y < top - 0.02;
    const want = afloat ? 0.25 + Math.min(1, rising * 1.2) : 0;
    sway += (want - sway) * Math.min(1, Math.max(0, dt) * 3);
    group.rotation.x = 0.02 * sway * Math.sin(clock * 2.1);
    group.rotation.z = 0.016 * sway * Math.sin(clock * 1.6 + 1.3);
    group.position.y = afloat ? 0.015 * sway * Math.sin(clock * 2.6 + 0.4) : 0;
  };
  return group;
}

/** How far behind the play plane the lid's middle lies. */
export const LID_BACK = 0.9;

/** The droplets thrown up where the jet comes down, at most. */
const DROPS = 28;
/** How many rings round the jet, and corners round each. */
const RINGS = 40;
const SIDES = 8;

export interface RainBarrel {
  readonly group: Group;
  /**
   * Pours, from the lid's place on its rail: the jet, its splash and foam, rings on the water, and the ditch's water at
   * the lid's waterline.
   */
  update(movers: readonly { x: number; y: number; t?: number; stop?: number }[], dt: number, still: boolean,
    water: { fillTo(x: number, y: number): void; ripple(x: number, z: number, strength: number): void }): void;
}

export function createRainBarrel(chapter: ChapterData): RainBarrel | null {
  const barrel = barrelOf(chapter);
  if (!barrel) return null;
  const { pool, index, lid, tap } = barrel;
  const group = new Group();
  group.name = 'rain-barrel';
  const mouth = { x: tap.at.x + SPOUT.x, y: tap.at.y + SPOUT.y, z: TAP_Z + SPOUT.z };
  const seconds = lid.seconds ?? 0.6;

  // The jet: a tube along the water's path, rebuilt each frame from what has left the spout and not yet come down.
  const jetShape = new BufferGeometry();
  const position = new Float32Array(RINGS * SIDES * 3);
  const uv = new Float32Array(RINGS * SIDES * 2);
  // Written in place each frame: a BufferAttribute keeps the very array (a Float32BufferAttribute would copy it).
  jetShape.setAttribute('position', new BufferAttribute(position, 3));
  jetShape.setAttribute('uv', new BufferAttribute(uv, 2));
  const order: number[] = [];
  for (let i = 0; i < RINGS - 1; i++) for (let k = 0; k < SIDES; k++) {
    const a = i * SIDES + k, b = i * SIDES + ((k + 1) % SIDES), c = a + SIDES, d = b + SIDES;
    order.push(a, c, b, b, c, d);
  }
  jetShape.setIndex(order);
  const jetMaterial = new MeshBasicMaterial({ map: streaks(), color: '#d4e6f4', transparent: true, depthWrite: false, side: DoubleSide });
  const jet = new Mesh(jetShape, jetMaterial);
  jet.name = 'barrel-jet';
  jet.frustumCulled = false;
  jet.visible = false;
  // After the water, which is drawn in the scene's own order: the jet goes into its surface.
  jet.renderOrder = 4;

  const foamMaterial = new MeshBasicMaterial({ map: foam(), color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 });
  const churn = new Mesh(new CircleGeometry(0.62, 28).rotateX(-Math.PI / 2), foamMaterial);
  churn.name = 'barrel-foam';
  churn.renderOrder = 5;
  churn.visible = false;

  const dropMaterial = new MeshBasicMaterial({ color: '#e2eef8', transparent: true, opacity: 0.85, depthWrite: false });
  const drops = new InstancedMesh(new SphereGeometry(1, 6, 4), dropMaterial, DROPS);
  drops.name = 'barrel-drops';
  drops.frustumCulled = false;
  drops.renderOrder = 5;
  const born = new Float32Array(DROPS).fill(-99);
  const from = new Float32Array(DROPS * 3);
  const speed = new Float32Array(DROPS * 3);
  const size = new Float32Array(DROPS);
  let next = 0, spawnDebt = 0;
  let seed = 3;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const place = new Object3D();
  group.add(jet, churn, drops);

  /** Seconds since the water came: from the lid's move while it rises, and counted on once it lies there. */
  let since = -1, clock = 0, rings = 0, wake = 0, wasAfloat = true;
  return {
    group,
    update(movers, dt, still, water) {
      const state = movers[index];
      if (!state) return;
      clock += dt;
      const last = lid.stops.length - 1;
      const moving = state.stop === last && (state.t ?? 1) < 1;
      if (moving) since = (state.t ?? 0) * seconds;
      else if (since >= 0) since += dt;
      // The ditch's water stands under the lid as the simulation has it (../sim/water-level.ts).
      const level = levelUnder(pool, lid, state.y);
      water.fillTo((pool.from + pool.to) / 2, level);
      const afloat = state.y < lid.stops[last]!.y - 0.005;
      // The lid comes to lie on the banks: the water rings out from both its ends.
      if (wasAfloat && !afloat && since >= 0 && !still) for (const end of [-1, 1]) water.ripple(state.x + end * (lid.width / 2 - 0.4), -LID_BACK, 1);
      wasAfloat = afloat;
      const pouring = since >= 0 && since < FLOW.dry + jetFall(mouth.y - level) + 0.1;
      if (!pouring) {
        jet.visible = churn.visible = false;
        drops.count = 0;
        return;
      }
      drops.count = DROPS;
      // What is in the air: water that left from `tail` to `head` seconds ago.
      const reach = jetFall(mouth.y - level);
      const head = Math.min(since, reach);
      const tail = Math.max(0, since - FLOW.dry);
      jet.visible = head - tail > 0.01;
      if (jet.visible) {
        for (let i = 0; i < RINGS; i++) {
          const t = tail + ((head - tail) * i) / (RINGS - 1);
          const e = since - t;
          const at = jetAt(t);
          // Across the water's way: up in the plane of its arc (n), and level across it (OUT turned a quarter).
          const along = Math.hypot(JET.speed, JET.fall * t);
          const n = { x: (JET.fall * t * OUT.x) / along, y: JET.speed / along, z: (JET.fall * t * OUT.z) / along };
          const side = { x: -OUT.z, z: OUT.x };
          const wobble = still ? 0 : 0.018 * Math.sin(e * 23 + t * 9);
          const radius = 0.075 * (0.8 + 0.6 * (t / Math.max(0.3, reach))) * Math.sqrt(flowAt(e));
          const cx = mouth.x + at.x + n.x * wobble, cy = mouth.y + at.y + n.y * wobble, cz = mouth.z + at.z + n.z * wobble;
          for (let k = 0; k < SIDES; k++) {
            const a = (k / SIDES) * Math.PI * 2;
            const o = (i * SIDES + k) * 3;
            const up = Math.cos(a) * radius, across = Math.sin(a) * radius;
            position[o] = cx + up * n.x + across * side.x;
            position[o + 1] = cy + up * n.y;
            position[o + 2] = cz + up * n.z + across * side.z;
            const q = (i * SIDES + k) * 2;
            uv[q] = k / SIDES;
            // Along the jet the streaks go with the water: each ring's water left the spout `e` seconds ago.
            uv[q + 1] = e * 2.4;
          }
        }
        jetShape.getAttribute('position').needsUpdate = true;
        jetShape.getAttribute('uv').needsUpdate = true;
      }
      // Where it comes down, and how much comes down there now.
      const landing = jetAt(reach);
      const hit = { x: mouth.x + landing.x, y: level, z: mouth.z + landing.z };
      const down = since >= reach ? flowAt(since - reach) : 0;
      churn.visible = down > 0.02;
      churn.position.set(hit.x, level + 0.02, hit.z);
      foamMaterial.opacity = 0.9 * Math.min(1, down * 1.4);
      churn.rotation.y = still ? 0 : clock * 1.3;
      churn.scale.setScalar((0.65 + 0.45 * down) * (still ? 1 : 1 + 0.08 * Math.sin(clock * 11)));
      if (!still && dt > 0) {
        // Rings on the water where it comes down, and now and then where the lid rises through it.
        rings -= dt;
        if (down > 0.15 && rings <= 0) {
          rings = 0.2;
          water.ripple(hit.x + (random() - 0.5) * 0.3, hit.z + (random() - 0.5) * 0.4, 0.55 + 0.4 * down);
        }
        wake -= dt;
        if (moving && afloat && wake <= 0) {
          wake = 0.55;
          water.ripple(state.x + (random() < 0.5 ? -1 : 1) * (lid.width / 2 - 0.5), -LID_BACK - 0.6 + random() * 1.2, 0.35);
        }
        // Droplets thrown up where it comes down, more the more comes down.
        spawnDebt += dt * 46 * down;
        for (; spawnDebt >= 1; spawnDebt--) {
          born[next] = clock;
          from.set([hit.x, level + 0.03, hit.z], next * 3);
          speed.set([(random() - 0.35) * 1.6, 1.3 + random() * 1.8, (random() - 0.5) * 1.4], next * 3);
          size[next] = 0.028 + random() * 0.03;
          next = (next + 1) % DROPS;
        }
      }
      for (let i = 0; i < DROPS; i++) {
        const age = clock - born[i]!;
        const life = 0.55;
        if (still || age < 0 || age > life) {
          place.scale.setScalar(0);
        } else {
          place.position.set(from[i * 3]! + speed[i * 3]! * age, from[i * 3 + 1]! + speed[i * 3 + 1]! * age - 0.5 * JET.fall * age * age, from[i * 3 + 2]! + speed[i * 3 + 2]! * age);
          place.scale.setScalar(size[i]! * (1 - 0.5 * (age / life)));
        }
        place.updateMatrix();
        drops.setMatrixAt(i, place.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    },
  };
}
