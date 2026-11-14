import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, DataTexture, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, LinearFilter,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3, type Material, type Scene,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../render/extensions';
import type { ChapterData } from '../../sim/types';
import { heightAt, sequence } from '../../render/dressing/kit';
import { BRINK, BROW, NARROW, STONE, STONE_OUT } from './chapters/billsta';
import { boulderMaterial, boulderShape, fieldBoulder } from './field-boulder';

/**
 * The view from Billaberget's brow down over the narrow (Olov, 14 November 2026: "Vi står på Billaberget och tittar ned
 * mot sundet, men nu känns det som att sundet ligger på samma höjd, och vattnet ser dessutom helt platt ut. Vi behöver
 * förbättra höjdkänslan och vattnets utseende så att det verkligen känns som att vi står på ett berg och tittar ned över
 * sundet. Kan vi även förbättra designen på stenen nere i sundet?").
 *
 * What makes a height read, built here for the picture alone (the simulation has none of it):
 * - the brink: a row of granite boulders at the back of the bare brow, which the ground behind the path ends at;
 * - the fall: Billaberget's steep end dropping away beyond the brink, a cliff of grey rock and under it a slope of dark
 *   forest, the spruces' tops far under the brow and seen from above;
 * - the narrow far below (`NARROW`), from the near shore at the hill's foot out to the far shore, its water alive: the
 *   current running through it in long lines, patches the wind ruffles, small waves, the dark shores mirrored along its
 *   edges and the night sky in its middle, glitter where the moon breaks through, and once the flash has shown the two
 *   figures, the warm light behind them on the water;
 * - the stone out in the current, a big water-worn boulder (./field-boulder.ts, awash), white water round it and a wake
 *   behind it;
 * - the far shore low across the water, its forest a dark band under the horizon, and a farther ridge in the haze;
 * - haze between all of it, more the farther off, and low mist on the water.
 * The camera looks down onto it from the brow (the chapter's camera zone, `eye`). Billaberget's far picture, the dome
 * seen from the house below, fades out as he comes up onto the brow: he is on it now.
 */

/** How far along the course the vista reaches either side, for a wide picture from the brow. */
const SPAN = { from: 70, to: 330 };
/** The cliff under the brink, below the ground's own height there: depth behind the path, and how far under it. */
const CLIFF: readonly (readonly [number, number])[] = [[-2.2, 0.04], [BRINK.z - 0.2, 0.12], [BRINK.z - 1.2, 1.8], [BRINK.z - 2.8, 7]];
/** And from its foot on, the slope down to the shore and under the water: depth, and height over the water. */
const SLOPE: readonly (readonly [number, number])[] = [
  [-8.5, 14], [-11, 10], [-15, 7.5], [-22, 5], [-30, 2.8], [-38, 1.2], [NARROW.near, -0.6], [NARROW.near - 6, -3],
];

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function noise(x: number, y: number): number {
  const hash = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v;
}
/** Along a profile of depths and values, eased between its points. */
function along(profile: readonly (readonly [number, number])[], z: number): number {
  let k = 0;
  while (k < profile.length - 2 && profile[k + 1]![0] > z) k++;
  const [z0, y0] = profile[k]!, [z1, y1] = profile[k + 1]!;
  return y0 + (y1 - y0) * smooth(Math.min(1, Math.max(0, (z - z0) / (z1 - z0))));
}

/**
 * The hill's height at a place behind the path: the brow's own ground (`top`) out to the brink, the cliff of
 * Billaberget's steep end under it, and its wooded slope down to the shore and under the water. Buttresses and gullies
 * down the cliff, knolls on the slope; none at the brink, where it meets the ground.
 */
export function hillAt(x: number, z: number, top: (x: number) => number): number {
  const ground = Math.min(top(x), BROW.y);
  const cliff = ground - along(CLIFF, z);
  const slope = NARROW.y + along(SLOPE, z);
  const foot = CLIFF[CLIFF.length - 1]![0];
  const y = z >= foot ? cliff : Math.max(slope, Math.min(cliff, ground - 7 - (foot - z) * 3.2));
  const beyond = Math.min(1, Math.max(0, (BRINK.z - 0.8 - z) / 3));
  return y + beyond * (3.2 * (noise(x * 0.09, z * 0.05) - 0.5) + 1.2 * (noise(x * 0.3 + 7, z * 0.2) - 0.5));
}

/**
 * Haze for what is drawn far off here: the place's own haze would swallow the narrow whole a little past the brink, so
 * these have their own, which thickens with the distance but never hides the far shore.
 */
const HAZE = { near: 20, reach: 260, most: 0.82 };
function hazed(material: Material, colour: Color, key: string, most = HAZE.most): Material {
  (material as MeshStandardMaterial).fog = false;
  const before = material.onBeforeCompile.bind(material);
  const was = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${was()}:vista-haze-${key}`;
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.uniforms.vistaHaze = { value: colour };
    shader.vertexShader = 'varying vec3 vistaAt;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vistaAt = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#ifdef USE_INSTANCING\n  vistaAt = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    shader.fragmentShader = `varying vec3 vistaAt;\nuniform vec3 vistaHaze;\n` + shader.fragmentShader.replace('#include <fog_fragment>', `#include <fog_fragment>
  {
    float far = max(0.0, length(vistaAt - cameraPosition) - ${HAZE.near.toFixed(1)});
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vistaHaze, ${most.toFixed(2)} * (1.0 - exp(-far / ${HAZE.reach.toFixed(1)})));
  }`);
  };
  material.needsUpdate = true;
  return material;
}

/** A sheet over x and depth, each corner's height and colour given. */
function sheet(xs: readonly number[], zs: readonly number[], at: (x: number, z: number) => { y: number; c: Color }): BufferGeometry {
  const position: number[] = [], colour: number[] = [], index: number[] = [];
  for (const z of zs) for (const x of xs) {
    const { y, c } = at(x, z);
    position.push(x, y, z);
    colour.push(c.r, c.g, c.b);
  }
  const w = xs.length;
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < w - 1; i++) {
    const a = j * w + i, b = a + w;
    // Facing up and towards us: rows go away from the camera.
    index.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
/** From one value to another, either way, about `step` apart. */
const range = (from: number, to: number, step: number) => {
  const n = Math.max(1, Math.round(Math.abs(to - from) / step));
  return Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
};

/** The hill's steep end and its wooded foot: grey rock where it is steep, dark forest floor where it is not. */
function hillside(top: (x: number) => number): BufferGeometry {
  const rock = new Color('#5d6168'), pale = new Color('#8b8f92'), floor = new Color('#1f2a23'), moss = new Color('#2f3d2a');
  const c = new Color();
  const zs = [...range(-2.2, -12, 0.45), ...range(-12.8, NARROW.near - 6, 2)];
  return sheet(range(SPAN.from, SPAN.to, 2), zs, (x, z) => {
    const y = hillAt(x, z, top);
    const steep = Math.min(1, Math.abs(hillAt(x, z - 0.6, top) - hillAt(x, z + 0.6, top)) / 1.6);
    c.copy(floor).lerp(moss, noise(x * 0.4, z * 0.4) * 0.6);
    c.lerp(rock, smooth((steep - 0.35) / 0.4));
    c.lerp(pale, smooth((steep - 0.35) / 0.4) * 0.45 * noise(x * 0.7 + 3, z * 0.5));
    return { y, c: c.clone() };
  });
}

/** The far shore: a low wooded ridge across the water, and a farther one in the haze. */
function farShore(): BufferGeometry {
  const near = new Color('#1b2622'), top = new Color('#24302c'), far = new Color('#3a4260');
  const c = new Color();
  const ridge = sheet(range(SPAN.from - 120, SPAN.to + 120, 4), range(NARROW.far + 4, NARROW.far - 90, 6), (x, z) => {
    const back = (NARROW.far - z) / 90;
    const y = NARROW.y - 1 + 4 * smooth(back * 3) + 9 * back * (0.6 + 0.6 * noise(x * 0.012, 1.7)) + 2 * noise(x * 0.06, z * 0.05);
    c.copy(near).lerp(top, back);
    return { y, c: c.clone() };
  });
  const beyond = sheet(range(SPAN.from - 400, SPAN.to + 400, 10), range(NARROW.far - 260, NARROW.far - 420, 40), (x, z) => {
    const back = (NARROW.far - 260 - z) / 160;
    const y = NARROW.y + 4 + 26 * back * (0.4 + 0.8 * noise(x * 0.004, 4.1));
    return { y, c: far };
  });
  return mergeGeometries([ridge, beyond])!;
}

/** A spruce, 1 tall from its foot: tiers of drooping boughs round a thin stem, darker within, the tips caught by the light. */
export function spruceShape(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const dark = new Color('#121c18'), tip = new Color('#2d4236');
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const wide = 0.27 * (1 - k * 0.85), tall = 0.24 * (1 - k * 0.35), y = 0.12 + k * 0.8;
    const cone = new ConeGeometry(wide, tall, 9, 1, true).translate(0, y + tall / 2, 0).toNonIndexed();
    cone.deleteAttribute('uv');
    const at = cone.getAttribute('position');
    const colours = new Float32Array(at.count * 3);
    const c = new Color();
    for (let v = 0; v < at.count; v++) {
      // The boughs' ends droop, and are lighter than the heart.
      const out = Math.hypot(at.getX(v), at.getZ(v)) / wide;
      if (out > 0.9) at.setY(v, at.getY(v) - tall * 0.18);
      c.copy(dark).lerp(tip, out * 0.85);
      colours.set([c.r, c.g, c.b], v * 3);
    }
    cone.setAttribute('color', new Float32BufferAttribute(colours, 3));
    parts.push(cone);
  }
  const stem = new CylinderGeometry(0.012, 0.025, 0.3, 5, 1, true).translate(0, 0.15, 0).toNonIndexed();
  stem.deleteAttribute('uv');
  stem.setAttribute('color', new Float32BufferAttribute(new Array(stem.getAttribute('position').count * 3).fill(0.05), 3));
  parts.push(stem);
  const shape = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  shape.computeVertexNormals();
  return shape;
}

/** Where the spruces stand: on the hill's slope under the cliff, and along the far shore. */
export function sprucesOf(top: (x: number) => number): { x: number; y: number; z: number; tall: number }[] {
  const random = sequence(4421);
  const out: { x: number; y: number; z: number; tall: number }[] = [];
  // At the cliff's foot, tall, their tops a little under the brow: seen from above, just beyond the brink.
  for (let x = SPAN.from; x < SPAN.to; x += 0.8 + random() * 1.4) {
    for (const back of [0, 1]) {
      const z = -13 - back * 8 - random() * 8;
      const y = hillAt(x, z, top);
      if (y > -6) continue;
      out.push({ x: x + back * 0.7, y: y - 0.3, z, tall: Math.max(6, BROW.y - 0.6 - back * 2.5 - random() * 3.5 - y) });
    }
  }
  for (let i = 0; i < 600 && out.length < 560; i++) {
    const x = SPAN.from + random() * (SPAN.to - SPAN.from), z = -12.5 + random() * (NARROW.near + 3 + 12.5);
    const y = hillAt(x, z, top);
    // Not on the cliff's face, not in the water.
    if (Math.abs(hillAt(x, z - 0.6, top) - hillAt(x, z + 0.6, top)) > 1.2 || y < NARROW.y + 0.8) continue;
    // Their tops under the brow: they grow from far below it.
    const tall = Math.min(BROW.y - 3 - y, 9 + random() * 8);
    if (tall < 6) continue;
    out.push({ x, y: y - 0.3, z, tall });
  }
  // Along the far shore, small with the distance.
  for (let x = SPAN.from - 110; x < SPAN.to + 110; x += 1.6 + random() * 2.2) {
    const z = NARROW.far - 6 - random() * 40;
    const back = (NARROW.far - z) / 90;
    const y = NARROW.y - 1 + 4 * smooth(back * 3) + 9 * back * (0.6 + 0.6 * noise(x * 0.012, 1.7)) + 2 * noise(x * 0.06, z * 0.05);
    out.push({ x, y: y - 0.4, z, tall: 7 + random() * 6 });
  }
  return out;
}

/** The brink: granite boulders along the back of the brow, where the ground ends and the hill falls away (`BRINK`). */
function brinkStones(top: (x: number) => number): BufferGeometry {
  const random = sequence(613);
  const parts: BufferGeometry[] = [];
  for (let x = BRINK.from; x < BRINK.to;) {
    const width = 1.6 + random() * 2.6, height = 0.35 + random() * 0.75, depth = 1.6 + random() * 1.6;
    const stone = boulderShape({ width, height, depth, seed: Math.round(x * 3) });
    stone.translate(x + width / 2, Math.min(top(x + width / 2), BROW.y) - 0.3 + (random() - 0.5) * 0.25, BRINK.z - 0.5 - random() * 1.1);
    parts.push(stone);
    x += width * (1.1 + random() * 1.6);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return merged;
}

/** The water's shader, on top of a dark, smooth surface: waves, current, wind, the shores mirrored, glitter, white water. */
const WATER = /* glsl */ `
  float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // The water's surface height at a place: the current carries small waves along the narrow, the wind ruffles patches of
  // it across. Finer waves fade out where they would be finer than a pixel.
  float wWaves(vec2 p, float t, float fine) {
    vec2 run = vec2(p.x - t * narrowFlow, p.y);
    float gust = smoothstep(0.35, 0.8, wNoise(p * 0.022 + vec2(t * 0.03, -t * 0.02)));
    float h = 0.55 * wNoise(run * vec2(0.18, 0.32));
    h += 0.3 * wNoise(run * vec2(0.5, 0.75) + vec2(0.0, t * 0.4));
    h += fine * (0.15 + 0.35 * gust) * wNoise(vec2(p.x * 1.6 - t * 1.1, p.y * 1.9 + t * 0.7));
    h += fine * (0.06 + 0.2 * gust) * wNoise(vec2(p.x * 3.4 + t * 0.6, p.y * 4.1 - t * 1.4));
    return h;
  }
`;

function waterMaterial(): { material: MeshStandardMaterial; uniforms: Record<string, { value: unknown }> } {
  // Smooth: the moon's light behind the narrow is a path on it, broken by the waves, and not a sheen over all of it.
  const material = new MeshStandardMaterial({ color: '#070d16', roughness: 0.07, metalness: 0 });
  const uniforms = {
    narrowTime: { value: 0 },
    narrowFlow: { value: 1.4 },
    narrowSkyLow: { value: new Color('#2a3150') },
    narrowSkyHigh: { value: new Color('#121828') },
    narrowShore: { value: new Vector3(NARROW.near, NARROW.far, 0) },
    narrowMoon: { value: new Vector3(0.1, 0.3, -1).normalize() },
    narrowMoonColour: { value: new Color('#c8d2f0') },
    narrowStone: { value: new Vector3(STONE_OUT.x, STONE_OUT.z, STONE.width * 0.5) },
    narrowLamp: { value: new Vector3(STONE_OUT.x + 0.4, STONE_OUT.y + 0.8, STONE_OUT.z - 1.2) },
    narrowLampOn: { value: 0 },
  };
  material.customProgramCacheKey = () => 'billsta-narrow-v1';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 narrowAt;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  narrowAt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 narrowAt;
uniform float narrowTime; uniform float narrowFlow; uniform vec3 narrowSkyLow; uniform vec3 narrowSkyHigh; uniform vec3 narrowShore;
uniform vec3 narrowMoon; uniform vec3 narrowMoonColour; uniform vec3 narrowStone; uniform vec3 narrowLamp; uniform float narrowLampOn;
${WATER}
` + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec2 wp = narrowAt.xz;
  float wFine = 1.0 - smoothstep(0.08, 0.5, length(fwidth(wp)));
  float e = 0.12;
  float h0 = wWaves(wp, narrowTime, wFine);
  vec3 wN = normalize(vec3(-(wWaves(wp + vec2(e, 0.0), narrowTime, wFine) - h0) / e * 0.42, 1.0, -(wWaves(wp + vec2(0.0, e), narrowTime, wFine) - h0) / e * 0.42));
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 V = normalize(cameraPosition - narrowAt);
    float facing = max(dot(wN, V), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
    // The dark shores mirrored along the water's edges, the night sky in its middle.
    float shores = smoothstep(0.0, 22.0, narrowShore.x - narrowAt.z) * smoothstep(0.0, 30.0, narrowAt.z - narrowShore.y);
    vec3 R = reflect(-V, wN);
    vec3 sky = mix(narrowSkyLow, narrowSkyHigh, clamp(R.y * 2.0, 0.0, 1.0));
    // Ruffled by the wind, a patch scatters more of the sky's light; calm, it is a dark mirror.
    float ruffled = smoothstep(0.3, 0.75, wNoise(wp * 0.03 + vec2(narrowTime * 0.02, -narrowTime * 0.015)));
    totalEmissiveRadiance += sky * fres * mix(0.12, 1.0, shores) * mix(0.35, 1.6, ruffled);
    // The waves' faces catch the sky as they turn: light on the slopes towards him, dark in their troughs.
    totalEmissiveRadiance += vec3(0.07, 0.085, 0.12) * smoothstep(0.86, 1.0, dot(wN, normalize(vec3(0.0, 1.0, 0.9)))) * shores * (0.4 + 0.6 * ruffled);
    // The current's lines: long, thin, a little paler, running with it.
    vec2 run = vec2((wp.x - narrowTime * narrowFlow) * 0.02, wp.y * 0.16);
    float line = smoothstep(0.05, 0.0, abs(wNoise(run) - 0.5)) * smoothstep(0.3, 0.7, wNoise(run * 0.5 + 3.0));
    // Seen close, out on the water by the stone, they are fine and faint; from the brow, long pale lines.
    float seenFrom = smoothstep(25.0, 110.0, length(cameraPosition - narrowAt));
    totalEmissiveRadiance += vec3(0.2, 0.24, 0.3) * line * shores * (0.15 + 0.85 * seenFrom);
    // Glitter where the moon breaks through, and the warm light behind the two figures once it is lit.
    // A path of it on the water towards him, broken into sparkles by the waves.
    float toward = max(dot(R, narrowMoon), 0.0);
    // Behind the storm's clouds it is a pale, broken path: brightest where the clouds let it through, now and then.
    float through = 0.45 + 0.55 * smoothstep(0.3, 0.8, wNoise(vec2(wp.x * 0.012 + narrowTime * 0.03, wp.y * 0.02)));
    float glint = pow(toward, 420.0) * (0.25 + 1.75 * step(0.62, wNoise(wp * 1.7 + vec2(narrowTime * 0.8, 0.0))));
    totalEmissiveRadiance += narrowMoonColour * (glint * 0.85 + pow(toward, 40.0) * 0.035) * through;
    vec3 toLamp = narrowLamp - narrowAt;
    float lamp = pow(max(dot(R, normalize(toLamp)), 0.0), 60.0) / (1.0 + dot(toLamp, toLamp) * 0.004);
    totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * lamp * narrowLampOn * 2.2;
    // White water round the stone and a wake behind it, downstream.
    vec2 off = wp - narrowStone.xy;
    float round_ = length(off * vec2(1.0, 1.35)) / narrowStone.z;
    // Broken white water where the current meets it, in lumps that come and go, most on its upstream side.
    float edge = 0.95 + 0.14 * wNoise(off * 1.3 + narrowTime * 0.4) + 0.08 * smoothstep(0.0, -2.0, off.x);
    float ring = smoothstep(edge + 0.2, edge, round_) * smoothstep(0.5, 0.78, wNoise(off * 4.2 + vec2(narrowTime * 1.8, 0.0)));
    float wake = smoothstep(0.0, 2.0, off.x) * smoothstep(narrowStone.z * 7.0, 0.0, off.x) * smoothstep(narrowStone.z * (0.55 + off.x * 0.06), 0.0, abs(off.y));
    float streaks = smoothstep(0.55, 0.85, wNoise(vec2((off.x - narrowTime * narrowFlow * 1.3) * 0.7, off.y * 2.6)));
    totalEmissiveRadiance += vec3(0.62, 0.68, 0.74) * (ring * 0.42 + wake * streaks * 0.3);
  }`);
  };
  return { material, uniforms };
}

/** A soft band of mist, opaque at its foot, gone at its top. */
function mistTexture(): DataTexture {
  const rows = 32;
  const data = new Uint8Array(rows * 4);
  for (let i = 0; i < rows; i++) data.set([255, 255, 255, Math.round(255 * (1 - i / (rows - 1)) ** 1.6)], i * 4);
  const texture = new DataTexture(data, 1, rows);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export interface Vista {
  group: Group;
  update(frame: Pick<ExtraFrame, 'dt' | 'clock' | 'flags' | 'camera' | 'still'>, scene: Scene): void;
}

/** The whole vista, for Billsta. */
export function vista(chapter: ChapterData, hazeColour: Color): Vista {
  const group = new Group();
  const top = (x: number) => heightAt(chapter, x);
  group.name = 'billsta-vista';
  const haze = hazeColour.clone();

  const brink = new Mesh(brinkStones(top), hazed(boulderMaterial({ width: 4, height: 1.8, depth: 3 }), haze, 'brink'));
  brink.name = 'vista-brink';
  brink.receiveShadow = true;

  const hill = new Mesh(hillside(top), hazed(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), haze, 'hill'));
  hill.name = 'vista-hill';

  const shore = new Mesh(farShore(), hazed(new MeshStandardMaterial({ vertexColors: true, roughness: 1 }), haze, 'shore'));
  shore.name = 'vista-shore';

  const stands = sprucesOf(top);
  const spruces = new InstancedMesh(spruceShape(), hazed(new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), haze, 'spruce'), stands.length);
  spruces.name = 'vista-spruces';
  const place = new Object3D();
  const random = sequence(77);
  for (const [i, s] of stands.entries()) {
    place.position.set(s.x, s.y, s.z);
    place.rotation.set((random() - 0.5) * 0.08, random() * 6.28, (random() - 0.5) * 0.08);
    place.scale.set(s.tall * (0.85 + random() * 0.3), s.tall, s.tall * (0.85 + random() * 0.3));
    place.updateMatrix();
    spruces.setMatrixAt(i, place.matrix);
  }
  spruces.computeBoundingSphere();

  const water = waterMaterial();
  const sheetOf = new PlaneGeometry(NARROW.to - NARROW.from, NARROW.near - NARROW.far).rotateX(-Math.PI / 2);
  const narrow = new Mesh(sheetOf, hazed(water.material, haze, 'water', 0.5));
  narrow.name = 'vista-water';
  narrow.position.set((NARROW.from + NARROW.to) / 2, NARROW.y, (NARROW.near + NARROW.far) / 2);

  // Low mist lying on the water: one band near, one by the far shore.
  const mistMap = mistTexture();
  const mistShape = mergeGeometries([
    new PlaneGeometry(NARROW.to - NARROW.from + 200, 16).translate((NARROW.from + NARROW.to) / 2, NARROW.y + 7.5, NARROW.far + 8),
  ])!;
  const mist = new Mesh(mistShape, new MeshBasicMaterial({ color: '#7c84a8', map: mistMap, transparent: true, opacity: 0.2, depthWrite: false, fog: false, side: DoubleSide }));
  mist.name = 'vista-mist';

  // The stone out in the current: a big water-worn boulder, its foot under the water, its top under their feet.
  const stone = fieldBoulder({ width: STONE.width, height: STONE.over + STONE.under, depth: STONE.depth, awash: STONE.under, moss: 0.25, seed: 11 });
  stone.name = 'vista-stone';
  stone.position.set(STONE_OUT.x, NARROW.y - STONE.under, STONE_OUT.z);
  const rock = stone.getObjectByName('field-boulder') as Mesh;
  rock.material = hazed(rock.material as Material, haze, 'stone');

  group.add(brink, hill, shore, spruces, narrow, mist, stone);
  const cards: Mesh[] = [];
  let first = true;
  return {
    group,
    update({ dt, clock, flags, camera, still }, scene) {
      if (first) {
        // The far picture of the dome, seen from below, and the plain stone under a far figure, which this vista's own
        // stone takes the place of.
        scene.traverse((node) => {
          if (node.name.startsWith('far-billaberget-')) cards.push(node as Mesh);
          if (node.name === 'figure-stone') node.visible = false;
        });
        first = false;
      }
      const at = camera.position;
      // Up on the brow, or out over the narrow in a picture of the stone.
      const shown = at.x > SPAN.from + 100 || at.z < -20;
      group.visible = shown;
      const gone = Math.max(smooth((at.x - 181) / 7), at.z < -20 ? 1 : 0);
      for (const card of cards) {
        const material = card.material as MeshBasicMaterial;
        material.opacity = 1 - gone;
        card.visible = gone < 0.99;
      }
      if (!shown) return;
      if (!still) water.uniforms.narrowTime!.value = (water.uniforms.narrowTime!.value as number) + dt;
      void clock;
      water.uniforms.narrowLampOn!.value = flags.has('beat:bi:there') ? 1 : 0;
    },
  };
}

/** Billsta's vista (registered by ./render.ts). Other chapters get nothing. */
export function vistaExtra({ chapter, scene, place }: ExtraContext): ViewExtra | null {
  if (chapter.id !== 'billsta') return null;
  const made = vista(chapter, new Color(place?.haze.colour ?? '#2a2e50'));
  scene.add(made.group);
  return { update: (frame) => made.update(frame, scene) };
}
