import {
  AdditiveBlending, CanvasTexture, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type BufferGeometry, type Texture,
} from 'three';
import type { ChapterData, Gust } from '../sim/types';
import type { ExtraContext, ExtraFrame, ViewExtra } from './extensions';
import { drawnWhile } from './idle';

/**
 * The waves over Flärken's jetty (Olov, 12 November 2026: "Elof säger, vågor, jag gömmer mig bakom stolparna, men man
 * ser bara vind"). The jetty's hazard is a gust to the simulation (`Gust`, `storm.shelters: 'posts'`): while one blows
 * he is taken back unless he stands in a post's lee. Its picture was the wind's pale streaks alone. Here it is the lake:
 *
 * - In the second before (`warn`), a swell rises out of the dark water behind the jetty and comes in towards it.
 * - As the gust begins, it piles up against the jetty's back edge, higher than the planks, white along its top, and
 *   spray flies up along it, highest up each post.
 * - Then it comes over: a knee-deep rush of white water runs across the planks towards the camera and pours off their
 *   front edge, for as long as the gust blows. In front of each post, in its lee, the planks stay dry: that is where
 *   Elof stands safe, as he says.
 * - When it has passed, the water drains off the planks.
 *
 * The simulation is untouched: this reads the gusts' state each frame (`ExtraFrame.gusts`). With less motion asked
 * for, the water is over the planks while a gust blows and gone after, with no swell and no spray. On Low, no spray.
 */

/** The jetty's planks, behind the path and in front of it, as the ground draws them (./dressing/ground.ts, a lake's jetty). */
export const DECK = { back: -1.62, front: 0.62 };
/** Where the posts stand behind the path, and how thick they are (../content/aventyr2/render.ts, `jettyPost`). */
const POST = { z: -1.1, radius: 0.48 };
/**
 * A post's lee, along the jetty from its middle: dry within `dry`, wet beyond `wet`. The simulation shelters him within
 * 0.8 of a post (GUST_SHELTER); the dry patch is drawn a little narrower, so he is never shown dry and taken back.
 */
export const LEE = { dry: 0.55, wet: 0.8 };
/** The water over the planks: how deep the rush is as it comes over, and as it runs on; how long to cross them. */
export const RUSH = { deep: 0.5, runs: 0.22, crosses: 0.42 };
/** How long the planks take to drain once the gust has passed. */
const DRAIN = 0.8;
/** The swell behind the jetty: how far back it rises, and how high over the lake it stands as it reaches the jetty. */
const SWELL = { far: -9.5, high: 1.45 };
/** How high the water piles against the jetty's back edge, over the lake, as it breaks (the planks are 1.2 over it). */
const PILE = 2.05;
/** And how high it stands there, over the lake, while it runs over the planks. */
const SETTLED = 1.24;
/** Spray: drops in the air at once, by quality; how hard they fall. */
const SPRAY = { low: 0, mid: 110, high: 170 } as const;
const FALL = 13;
/** The water's cross-section, from out on the lake behind the jetty to its front edge: points behind, on, and its face. */
const BEHIND = 8, ON = 11, FACE = 2;
const ROWS = BEHIND + ON + FACE;

const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Which of the chapter's gusts are a jetty's, with posts for their shelters. */
export function jettyGusts(chapter: ChapterData): number[] {
  const shelters = chapter.storm?.shelters;
  return (chapter.gusts ?? []).flatMap((_, i) => ((Array.isArray(shelters) ? shelters[i] : shelters) === 'posts' ? [i] : []));
}

/** How dry the planks are at `x`, `z` in a post's lee: 1 dry, 0 wet. Only in front of the post's back, which the wave hits. */
export function leeAt(gust: Pick<Gust, 'shelters'>, x: number, z: number): number {
  const behind = smooth((z - (POST.z - POST.radius)) / POST.radius);
  if (behind <= 0) return 0;
  let nearest = Infinity;
  for (const post of gust.shelters) nearest = Math.min(nearest, Math.abs(x - post));
  return behind * (1 - smooth((nearest - LEE.dry) / (LEE.wet - LEE.dry)));
}

/**
 * The water over the planks at `blown` seconds into a gust (or `drained` seconds after one), as heights over the planks:
 * how high it stands against their back edge (`back`, over the lake), where its front is, how deep it runs there.
 */
export function rushAt(blown: number, drained: number, still: boolean): { back: number; front: number; deep: number; wet: number } {
  if (still) return { back: SETTLED, front: DECK.front, deep: RUSH.runs, wet: drained > 0 ? 0 : 1 };
  const wet = 1 - smooth(drained / DRAIN);
  const reach = drained > 0 ? 1 : smooth((blown - 0.06) / RUSH.crosses);
  // It piles high as it breaks, and then stands just over the back edge while it runs over, behind the posts too, where
  // above the planks it would close the gap of their lee.
  const back = drained > 0 ? mix(SETTLED, 0.9, smooth(drained / 0.5)) : blown < 0.12 ? mix(SWELL.high, PILE, smooth(blown / 0.12)) : mix(PILE, SETTLED, smooth((blown - 0.12) / 0.4));
  const deep = (drained > 0 ? RUSH.runs : mix(RUSH.deep, RUSH.runs, smooth((blown - 0.25) / 0.6))) * wet;
  return { back, front: DECK.back + (DECK.front - DECK.back) * reach, deep, wet };
}

/**
 * White water: long streaks of foam along the jetty, the way the wind drives it, broken, with flecks between. Seen
 * from the side, streaks across the planks were foreshortened to round blobs, and read as gravel. Tiles both ways.
 */
function foam(): Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g || typeof g.ellipse !== 'function') return null;
  g.fillStyle = 'rgb(118,134,146)';
  g.fillRect(0, 0, size, size);
  let seed = 11;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = next() * size, y = next() * size, long = 14 + next() * 50, wide = 1.5 + next() * 3.5;
    g.fillStyle = `rgba(245,250,252,${(0.3 + 0.6 * next()).toFixed(2)})`;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.beginPath();
      g.ellipse(x + dx, y + dy, long / 2, wide, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  return map;
}

/** A drop of spray: bright in its middle and soft at its edge, drawn stretched along the way it flies. */
function drop(): Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g || typeof g.createRadialGradient !== 'function') return null;
  const glow = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

/** A grid of `cols` by `rows` corners, with room for a colour and an alpha at each. */
function grid(width: number, depth: number, cols: number, rows: number, flat: boolean): BufferGeometry {
  const shape = new PlaneGeometry(width, depth, cols, rows);
  if (flat) shape.rotateX(-Math.PI / 2);
  const colour = new Float32BufferAttribute(new Float32Array(shape.getAttribute('position').count * 4), 4);
  colour.setUsage(DynamicDrawUsage);
  shape.setAttribute('color', colour);
  (shape.getAttribute('position') as Float32BufferAttribute).setUsage(DynamicDrawUsage);
  return shape;
}

interface Drop { x: number; z: number; vx: number; vy: number; vz: number; delay: number; life: number; size: number; mist: boolean }

interface Stretch {
  gust: Gust;
  index: number;
  lake: number;
  columns: number;
  swell: Mesh<BufferGeometry, MeshStandardMaterial>;
  water: Mesh<BufferGeometry, MeshBasicMaterial>;
  curtain: Mesh<BufferGeometry, MeshBasicMaterial>;
  spray: InstancedMesh | null;
  drops: Drop[];
  /** Seconds since the last gust ended, while the planks drain; and how long that gust had blown. */
  drained: number;
  lasted: number;
}

const SWELL_DEEP = new Color('#0f2232'), SWELL_LIGHT = new Color('#2c5262'), FOAM = new Color('#cfdde4');
const BODY = new Color('#2f5566'), WHITE = new Color('#e4eef2');
const tint = new Color();

export function createJettyWaves(chapter: ChapterData): { group: Group; update(frame: ExtraFrame): void } | null {
  const which = jettyGusts(chapter);
  if (which.length === 0) return null;
  const group = new Group();
  group.name = 'jetty-waves';
  const foamMap = foam(), dropMap = drop();
  let seed = 23;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stretches: Stretch[] = which.map((index) => {
    const gust = chapter.gusts![index]!;
    const span = gust.to - gust.from, middle = (gust.from + gust.to) / 2;
    // The lake's level here: the water nearest the jetty, or a little more than a plank's height under it.
    const lake = (chapter.water ?? []).filter((pool) => pool.to > gust.from - 20 && pool.from < gust.to + 20)
      .reduce((high, pool) => Math.max(high, pool.y), -Infinity);
    const level = Number.isFinite(lake) ? lake : gust.y - 1.2;
    // The swell, out on the lake behind the jetty: it lies just under the lake's own surface until it rises.
    const swell = new Mesh(grid(span + 8, DECK.back - SWELL.far, Math.round(span * 2.4), 18, true),
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.25 }));
    swell.position.set(middle, level - 0.06, (DECK.back + SWELL.far) / 2);
    swell.name = 'jetty-swell';
    // The water that comes over: one surface from the lake behind the jetty, up its back edge, over the planks and down
    // its face at the front of the rush, drawn anew each frame (`shapeWater`).
    const columns = Math.round(span * 4);
    const water = new Mesh(grid(span, 1, columns, ROWS - 1, false),
      new MeshBasicMaterial({ vertexColors: true, map: foamMap, transparent: true, depthWrite: false, side: DoubleSide, fog: true }));
    if (water.material.map) water.material.map.repeat.set(span / 2.5, 2.2);
    water.frustumCulled = false;
    water.name = 'jetty-water';
    water.renderOrder = 3;
    // The white water pouring off the planks' front edge.
    const fall = gust.y - level;
    const curtain = new Mesh(grid(span, fall, columns, 1, false),
      new MeshBasicMaterial({ vertexColors: true, map: foamMap?.clone() ?? null, transparent: true, depthWrite: false, color: '#b9c9d2', side: DoubleSide, fog: true }));
    if (curtain.material.map) { curtain.material.map.needsUpdate = true; curtain.material.map.repeat.set(span / 3, 0.6); }
    curtain.position.set(middle, gust.y - fall / 2, DECK.front + 0.04);
    curtain.name = 'jetty-pour';
    curtain.renderOrder = 3;
    // The spray: drops flung up along the back edge as the wave breaks there, a higher sheet of them up each post, and
    // a few soft puffs of mist among them.
    const drops: Drop[] = [];
    for (let i = 0; i < SPRAY.high; i++) {
      const atPost = i % 3 === 0, mist = i % 10 === 4;
      const post = gust.shelters[Math.floor(next() * gust.shelters.length)]!;
      drops.push(atPost
        ? { x: post + (next() - 0.6) * 0.8, z: POST.z - POST.radius - 0.05, vx: -0.6 - next() * 1.2, vy: 5 + next() * 4, vz: 0.3 + next() * 0.9, delay: next() * 0.25, life: 0.8 + next() * 0.5, size: mist ? 0.7 : 0.08 + next() * 0.07, mist }
        : { x: gust.from - 0.5 + next() * (span + 1), z: DECK.back - 0.05 - next() * 0.3, vx: -1 - next() * 1.6, vy: 3 + next() * 3, vz: 0.5 + next() * 1.6, delay: next() * 0.3, life: 0.7 + next() * 0.5, size: mist ? 0.6 : 0.07 + next() * 0.06, mist });
    }
    let spray: InstancedMesh | null = null;
    if (dropMap) {
      spray = new InstancedMesh(new PlaneGeometry(1, 1),
        new MeshBasicMaterial({ map: dropMap, color: '#a3b8c4', transparent: true, depthWrite: false, blending: AdditiveBlending, fog: true }), SPRAY.high);
      spray.instanceMatrix.setUsage(DynamicDrawUsage);
      spray.frustumCulled = false;
      spray.renderOrder = 4;
      spray.name = 'jetty-spray';
      group.add(spray);
      drawnWhile(spray, false);
    }
    group.add(swell, water, curtain);
    for (const one of [swell, water, curtain]) drawnWhile(one, false);
    return { gust, index, lake: level, columns, swell, water, curtain, spray, drops, drained: DRAIN, lasted: 0 };
  });

  const place = new Object3D(), turn = new Object3D();
  let flow = 0;
  return {
    group,
    update({ gusts, clock, dt, still, tier, camera }) {
      if (dt > 0 && !still) flow += dt;
      for (const s of stretches) {
        const state = gusts?.[s.index];
        const blow = state?.blow ?? 0, warn = state?.warn ?? 0;
        const near = Math.abs(camera.position.x - (s.gust.from + s.gust.to) / 2) < (s.gust.to - s.gust.from) / 2 + 30;
        // How long it has blown, and how long since it passed.
        const blown = blow * s.gust.length;
        if (blow > 0) { s.drained = 0; s.lasted = blown; } else if (dt > 0 && s.lasted > 0) s.drained = Math.min(DRAIN, s.drained + dt);
        const passing = blow > 0 || (s.lasted > 0 && s.drained < DRAIN);
        const rush = rushAt(blown, blow > 0 ? 0 : s.drained, still);
        const shown = near && passing && rush.wet > 0.001 && (!still || blow > 0);
        drawnWhile(s.water, shown);
        drawnWhile(s.curtain, shown && rush.front > DECK.front - 0.1);
        if (shown) {
          // It runs towards the camera and a little with the wind; off the edge it pours down.
          s.water.material.map?.offset.set(flow * 0.9, -flow * 1.1);
          s.curtain.material.map?.offset.set(flow * 0.6, flow * 1.8);
          shapeWater(s, rush, clock);
          paintCurtain(s, rush.wet * smooth((rush.front - (DECK.front - 0.1)) / 0.1));
        }
        // The swell: rising behind the jetty in the second before, until it breaks against it as the gust begins.
        const swelling = !still && near && warn > 0;
        drawnWhile(s.swell, swelling);
        if (swelling) shapeSwell(s, warn, clock);
        const spray = s.spray;
        if (!spray) continue;
        const count = still ? 0 : SPRAY[tier];
        const since = blow > 0 ? blown - 0.04 : s.lasted - 0.04 + s.drained;
        const flying = near && count > 0 && passing && since < 1.6;
        drawnWhile(spray, flying);
        if (!flying) continue;
        for (let i = 0; i < spray.count; i++) {
          const d = s.drops[i]!, t = since - d.delay;
          if (i >= count || t < 0 || t > d.life) { place.scale.setScalar(0); place.position.set(0, -99, 0); place.quaternion.identity(); }
          else {
            const k = t / d.life, vy = d.vy - FALL * t;
            place.position.set(d.x + d.vx * t, s.gust.y - 0.1 + d.vy * t - (FALL / 2) * t * t, d.z + d.vz * t);
            // Facing the camera, each drop drawn long along the way it flies; the mist round and growing.
            turn.quaternion.copy(camera.quaternion);
            turn.rotateZ(d.mist ? 0 : Math.atan2(vy, d.vx) - Math.PI / 2);
            place.quaternion.copy(turn.quaternion);
            const fade = Math.sin(Math.PI * Math.min(1, k * 1.1 + 0.04));
            if (d.mist) place.scale.setScalar(d.size * (0.5 + 0.8 * k) * fade * 0.6);
            else place.scale.set(d.size * fade, d.size * fade * (1.6 + Math.min(3, Math.hypot(vy, d.vx) * 0.35)), 1);
          }
          place.updateMatrix();
          spray.setMatrixAt(i, place.matrix);
        }
        spray.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

/**
 * The water's surface along one column: out on the lake behind the jetty it rises in a hump to the planks' back edge
 * (`rush.back` over the lake), runs over the planks `rush.deep` deep to its front, and falls down its face to them.
 * In front of a post, in its lee, there is none over the planks.
 */
function shapeWater(s: Stretch, rush: ReturnType<typeof rushAt>, clock: number): void {
  const at = s.water.geometry.getAttribute('position'), colour = s.water.geometry.getAttribute('color');
  const deck = s.gust.y, lake = s.lake, cols = s.columns + 1;
  const from = s.gust.from, span = s.gust.to - s.gust.from;
  const lifted = Math.max(0, rush.back - (deck - lake));
  for (let c = 0; c < cols; c++) {
    const x = from + (span * c) / s.columns;
    const ends = smooth((x - from + 0.5) / 1) * smooth((s.gust.to + 0.5 - x) / 1);
    const ripple = 0.85 + 0.15 * Math.sin(x * 1.3 + clock * 4.1) * Math.sin(x * 0.53 - clock * 2.3);
    for (let r = 0; r < ROWS; r++) {
      let z: number, y: number, a: number, white: number;
      if (r < BEHIND) {
        // Behind the jetty: from under the lake's face up to its back edge.
        const k = r / (BEHIND - 1);
        z = DECK.back - 2.6 * (1 - k);
        y = lake - 0.08 + (rush.back * ripple + 0.08) * Math.exp(-(((z - DECK.back) / 1.1) ** 2)) * ends;
        a = smooth(k * 1.6) * 0.85;
        white = smooth(((y - deck) + 0.1) / 0.4);
      } else if (r < BEHIND + ON) {
        // Over the planks, to the front of the rush.
        const k = (r - BEHIND) / (ON - 1);
        z = DECK.back + (rush.front - DECK.back) * k;
        const dry = 1 - leeAt(s.gust, x, z);
        const depth = mix(lifted, rush.deep, Math.pow(k, 0.6)) * ripple * dry * ends;
        y = deck + 0.02 + depth;
        a = 0.9 * smooth(depth / 0.06);
        white = 0.55 + 0.45 * smooth((k - 0.7) / 0.3);
      } else {
        // Its face at the front of the rush, down onto the planks.
        const k = r - (BEHIND + ON) + 1;
        z = rush.front + 0.09 * k;
        const dry = 1 - leeAt(s.gust, x, rush.front);
        const depth = rush.deep * ripple * dry * ends * (k === 1 ? 0.55 : 0);
        y = deck + 0.02 + depth;
        a = 0.95 * smooth(rush.deep * dry * ends / 0.06) * (k === 1 ? 1 : 0.4);
        white = 1;
      }
      const i = r * cols + c;
      at.setXYZ(i, x, y, z);
      tint.copy(BODY).lerp(WHITE, white);
      colour.setXYZW(i, tint.r, tint.g, tint.b, a * rush.wet);
    }
  }
  at.needsUpdate = true;
  colour.needsUpdate = true;
}

/** The water pouring off the planks' front edge, except where a post's lee keeps them dry. */
function paintCurtain(s: Stretch, amount: number): void {
  const at = s.curtain.geometry.getAttribute('position'), colour = s.curtain.geometry.getAttribute('color');
  const x0 = s.curtain.position.x;
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i) + x0, low = at.getY(i) < 0;
    const ends = smooth((x - s.gust.from + 0.5) / 1) * smooth((s.gust.to + 0.5 - x) / 1);
    // Thick where it leaves the planks, thinning as it falls into the lake.
    const alpha = amount * ends * (1 - leeAt(s.gust, x, DECK.front)) * (low ? 0.2 : 0.75);
    colour.setXYZW(i, 1, 1, 1, alpha);
  }
  colour.needsUpdate = true;
}

/**
 * The swell's shape: a long hump on the lake behind the jetty, steeper on its face towards the jetty, coming in over the
 * second before the gust (`warn`, 0 to 1) to stand at its back edge as high as the water then piles there.
 */
function shapeSwell(s: Stretch, warn: number, clock: number): void {
  const at = s.swell.geometry.getAttribute('position'), colour = s.swell.geometry.getAttribute('color');
  const x0 = s.swell.position.x, z0 = s.swell.position.z;
  const coming = smooth(warn);
  const crest = SWELL.far + 1.5 + (DECK.back - 0.35 - SWELL.far - 1.5) * coming;
  const high = (0.25 + 0.75 * coming) * SWELL.high;
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i) + x0, z = at.getZ(i) + z0;
    const ends = smooth((x - s.gust.from + 3.5) / 3) * smooth((s.gust.to + 3.5 - x) / 3);
    const d = z - crest;
    const shape = Math.exp(-((d / (d > 0 ? 0.9 : 2.4)) ** 2));
    const ripple = 0.85 + 0.15 * Math.sin(x * 0.9 + clock * 1.7) * Math.sin(x * 0.37 - clock * 0.8);
    const y = high * shape * ends * ripple;
    at.setY(i, y);
    const top = y / SWELL.high;
    tint.copy(SWELL_DEEP).lerp(SWELL_LIGHT, Math.min(1, top * 1.2));
    // White along its crest once it stands high, as it begins to break.
    tint.lerp(FOAM, smooth((top - 0.7) / 0.25) * (d > -0.8 ? 1 : 0.4));
    colour.setXYZW(i, tint.r, tint.g, tint.b, 1);
  }
  at.needsUpdate = true;
  colour.needsUpdate = true;
  s.swell.geometry.computeVertexNormals();
}

/** Äventyr 2's chapters with a jetty in the waves get the waves (../content/aventyr2/render.ts registers this). */
export function jettyWavesExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  const waves = createJettyWaves(chapter);
  if (!waves) return null;
  scene.add(waves.group);
  let softened = false;
  return {
    update(frame) {
      // The wind's streaks over the jetty (../render/view.ts, `buildWind`, one a gust in order) are faint here: the
      // waves are what he hides from. They are in the scene by the first frame.
      if (!softened) {
        softened = true;
        const streaks = scene.getObjectsByProperty('name', 'gust-streaks');
        for (const i of jettyGusts(chapter)) {
          const material = (streaks[i] as Mesh | undefined)?.material as MeshBasicMaterial | undefined;
          material?.color.multiplyScalar(WIND_HERE);
        }
      }
      waves.update(frame);
    },
  };
}

/** How bright the wind's streaks are over a jetty in the waves, of what they are elsewhere. */
const WIND_HERE = 0.35;
