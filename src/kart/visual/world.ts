/** The ground Godisracet is driven on: terrain that follows the road over its hills, five road surfaces for the
 * five places of the lap, the bog's water, kerbs, boost strips, ramps, puddles and the fences along the way.
 * All of it is built once from the course in sim/track.ts; nothing here decides how a kart drives.
 */
import * as THREE from 'three';
import { LAP, type Track } from '../sim/track';
import { canvasTexture, createBatch, randomFrom, ribbon } from './kit';

/** The colours of each place: garden, forest, bog, mountain, candy meadow. */
export const ZONE_LOOK = [
  { ground: 0x7ecb4f, patch: 0x62b043, rough: 0x6dbb49, rail: 0xfaf3e3, post: 0xd9534a },
  { ground: 0x4c8f3d, patch: 0x6f7a3a, rough: 0x5c7f38, rail: 0x9a6b43, post: 0x6f4a2e },
  { ground: 0x5f7f4b, patch: 0x45684f, rough: 0x3c5a4c, rail: 0xb58a57, post: 0x7a5a3a },
  { ground: 0x8b91a3, patch: 0x767c90, rough: 0xf1f5fb, rail: 0xa6adbd, post: 0x7b8296 },
  { ground: 0xffd5e6, patch: 0xc6f1dc, rough: 0xfff4f8, rail: 0xff8fb8, post: 0xfdfdfd },
] as const;
/** The bog's water lies a little under its lowest planks. */
export const WATER_LEVEL = -1.95;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const zoneWeights = (track: Track, distance: number, out: number[]) => track.mix(distance, out);

export interface World {
  group: THREE.Group;
  /** Height of the terrain at a spot off the road. */
  groundAt(x: number, z: number): number;
  /** Visible ground height beside the road, matching the verge ribbon across the shoulder before blending into terrain. */
  surfaceAt(x: number, z: number, distance: number, out: number): number;
  /** Share of each place at a spot off the road. */
  zonesAt(x: number, z: number, out: number[]): number[];
  /** Metres from the nearest part of the road's centreline. */
  roadDistance(x: number, z: number): number;
  update(time: number, skyTint?: THREE.Color): void;
  dispose(): void;
}

const ROAD_GLSL = `
float kHash(vec2 p) { p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float kNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(kHash(i), kHash(i + vec2(1., 0.)), f.x), mix(kHash(i + vec2(0., 1.)), kHash(i + 1.), f.x), f.y); }
vec3 kRoad(vec3 t, vec3 za, vec2 zb, out float gloss) {
  float d = t.x, lane = t.y, edge = t.z; vec2 p = vec2(lane, d);
  float line = smoothstep(.26, .32, edge) * smoothstep(.56, .5, edge);
  // Home: warm tarmac, a cream edge line and a dashed middle.
  vec3 tarmac = vec3(.52, .51, .53) * (.9 + .2 * kNoise(p * 2.6)) + step(.94, kHash(floor(p * 16.))) * .07;
  tarmac = mix(tarmac, vec3(.97, .93, .8), max(line, step(abs(lane), .1) * step(fract(d / 6.), .5)));
  // Granskogen: a packed earth road with two worn ruts and moss creeping in from the sides.
  vec3 earth = mix(vec3(.74, .54, .34), vec3(.6, .42, .26), kNoise(p * .55));
  earth *= 1. - .16 * exp(-pow(abs(lane) - 1.7, 2.) / .35) + step(.965, kHash(floor(p * 6.))) * .1;
  earth = mix(earth, vec3(.43, .56, .28), smoothstep(1.3, 0., edge) * (.5 + .5 * kNoise(p * 1.7)));
  // Myren: a boardwalk of planks laid across, each its own brown, with dark gaps.
  float board = floor(d / .7), along = fract(d / .7);
  vec3 planks = mix(vec3(.83, .63, .4), vec3(.66, .47, .28), kHash(vec2(board, 3.))) * (.9 + .16 * kNoise(vec2(lane * 7., board * 3.1)));
  planks *= smoothstep(0., .07, along) * .45 + .55;
  planks *= .82 + .18 * smoothstep(.12, .34, edge);
  // Berget: flagstones in staggered rows, with snow blown in from the edges.
  vec2 cell = vec2(lane / 1.4 + mod(floor(d / 1.1), 2.) * .5, d / 1.1), cf = fract(cell);
  vec3 stone = mix(vec3(.63, .66, .74), vec3(.47, .5, .6), kHash(floor(cell)));
  stone = mix(vec3(.3, .32, .4), stone, smoothstep(0., .07, min(min(cf.x, 1. - cf.x), min(cf.y, 1. - cf.y))));
  stone = mix(stone, vec3(.95, .97, 1.), smoothstep(1.5, .2, edge) * (.55 + .45 * kNoise(p * 1.3)));
  // Godisängen: pink fondant with pale swirls, sprinkles and a rainbow along each edge.
  vec3 candy = mix(vec3(.99, .58, .76), vec3(1., .8, .9), .5 + .5 * sin(lane * 1.25 + d * .85 + sin(d * .21) * 2.));
  vec2 grid = p * 2.2, id = floor(grid), gf = fract(grid) - .5; float pick = kHash(id);
  float turn = pick * 6.283; vec2 rot = vec2(gf.x * cos(turn) - gf.y * sin(turn), gf.x * sin(turn) + gf.y * cos(turn));
  float sprinkle = step(.62, pick) * (1. - smoothstep(.2, .26, abs(rot.x))) * (1. - smoothstep(.05, .08, abs(rot.y)));
  vec3 hue = .55 + .45 * cos(6.283 * (pick * 7. + vec3(0., .33, .67)));
  candy = mix(candy, hue, sprinkle);
  candy = mix(candy, .58 + .42 * cos(6.283 * (floor(d / 1.5) / 6. + vec3(0., .33, .67))), line);
  gloss = zb.y * .5 + za.z * .1;
  return tarmac * za.x + earth * za.y + planks * za.z + stone * zb.x + candy * zb.y;
}`;

export function createWorld(track: Track, { low, anisotropy }: { low: boolean; anisotropy: number }): World {
  const group = new THREE.Group(); group.name = 'godisracet-course';
  const point = track.point(0), tint = new THREE.Color(), other = new THREE.Color(), shade = new THREE.Color(), mixed = new THREE.Color(), weights = [0, 0, 0, 0, 0];
  const random = randomFrom(20261114);

  /* ---------------------------------------------------------------- terrain */
  // Road samples every 2 m: the terrain is a soft average of the road heights near it, so it meets every part
  // of the road at that part's own height, and slopes or cliffs form between parts at different heights.
  const samples = LAP / 2, sx = new Float32Array(samples), sz = new Float32Array(samples), sh = new Float32Array(samples), sw = new Float32Array(samples * 5);
  for (let i = 0; i < samples; i++) {
    track.point(i * 2, 0, point); sx[i] = point.x; sz[i] = point.z; sh[i] = point.y;
    zoneWeights(track, i * 2, weights).forEach((w, k) => { sw[i * 5 + k] = w; });
  }
  const cell = low ? 4.5 : 3, margin = 84, { minX, maxX, minZ, maxZ } = track.bounds;
  const x0 = minX - margin, z0 = minZ - margin, nx = Math.ceil((maxX - minX + margin * 2) / cell) + 1, nz = Math.ceil((maxZ - minZ + margin * 2) / cell) + 1;
  const heights = new Float32Array(nx * nz), zones = new Float32Array(nx * nz * 5), away = new Float32Array(nx * nz), reach = new Float32Array(samples);
  const noise = (x: number, z: number) => Math.sin(x * .061 + 1.3) * Math.cos(z * .053 - .4) + .5 * Math.sin(x * .127 - z * .113 + 2.1);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, z = z0 + j * cell, at = j * nx + i;
    let total = 0, h = 0, nearest = Infinity;
    for (let s = 0; s < samples; s++) {
      const square = (sx[s]! - x) ** 2 + (sz[s]! - z) ** 2, w = 1 / ((square + 4) * (square + 4));
      total += w; h += w * sh[s]!; reach[s] = square; if (square < nearest) nearest = square;
    }
    const dist = Math.sqrt(nearest), off = Math.max(0, dist - 7.5), far = smooth(2, 34, off), n = noise(x, z);
    // A spot belongs to the place whose road is nearest, shared only with roads that are almost as near:
    // far from the course the ground is still one place's, never a grey mix of all five.
    let share = 0;
    for (let k = 0; k < 5; k++) weights[k] = 0;
    for (let s = 0; s < samples; s++) {
      const w = Math.exp((dist - Math.sqrt(reach[s]!)) / 9);
      if (w < .002) continue;
      share += w;
      for (let k = 0; k < 5; k++) weights[k]! += w * sw[s * 5 + k]!;
    }
    for (let k = 0; k < 5; k++) zones[at * 5 + k] = weights[k]! / share;
    const [garden, forest, bog, mountain, candy] = [0, 1, 2, 3, 4].map(k => zones[at * 5 + k]!) as [number, number, number, number, number];
    const relief = garden * (1.3 * n * far + off * .02)
      + forest * (2.6 * n * far + off * .07)
      + bog * (-1.9 * smooth(0, 7, off) + 1.2 * (n + .6) * smooth(16, 44, off) + Math.max(0, off - 26) * .09)
      + mountain * (Math.min(30, off * 1.05) * smooth(0, 9, off) + 2.4 * n * smooth(0, 6, off))
      + candy * (2.8 * n * far + 1.2 * Math.sin(x * .19) * Math.cos(z * .17) * far + off * .03);
    // Under the road and its verges the terrain is tucked away; the verge ribbons below carry the surface there.
    heights[at] = h / total + relief - .5 * (1 - smooth(9, 15, dist));
    away[at] = dist;
  }
  const grid = (table: Float32Array, x: number, z: number, stride = 1, offset = 0) => {
    const fx = Math.max(0, Math.min(nx - 1.001, (x - x0) / cell)), fz = Math.max(0, Math.min(nz - 1.001, (z - z0) / cell));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = (j * nx + i) * stride + offset, b = a + nx * stride;
    return (table[a]! * (1 - u) + table[a + stride]! * u) * (1 - v) + (table[b]! * (1 - u) + table[b + stride]! * u) * v;
  };
  const groundAt = (x: number, z: number) => grid(heights, x, z);
  const zonesAt = (x: number, z: number, out: number[]) => { for (let k = 0; k < 5; k++) out[k] = grid(zones, x, z, 5, k); return out; };
  const roadDistance = (x: number, z: number) => grid(away, x, z);
  /** The colour of the ground at a spot: each place's two greens (or pinks) in drifts, rock on steep faces, snow up high. */
  const groundColor = (x: number, z: number, out: THREE.Color) => {
    zonesAt(x, z, weights);
    const n = .5 + .5 * Math.sin(x * .11 + Math.sin(z * .07) * 2) * Math.cos(z * .09 - x * .03);
    out.setRGB(0, 0, 0);
    for (let k = 0; k < 5; k++) {
      // `mixed` and `shade` are this function's own: the caller's colour is only ever `out`.
      mixed.set(ZONE_LOOK[k]!.ground).lerp(shade.set(ZONE_LOOK[k]!.patch), smooth(.35, .7, n));
      out.r += mixed.r * weights[k]!; out.g += mixed.g * weights[k]!; out.b += mixed.b * weights[k]!;
    }
    const height = groundAt(x, z), slope = Math.hypot(groundAt(x + 2, z) - groundAt(x - 2, z), groundAt(x, z + 2) - groundAt(x, z - 2)) / 4;
    if (weights[3]! > .02) {
      out.lerp(shade.set(0x6f7486), weights[3]! * smooth(.5, 1.1, slope) * .8);
      out.lerp(shade.set(0xf6f9ff), weights[3]! * smooth(7, 13, height + n * 3) * (1 - smooth(.9, 1.6, slope) * .6));
    }
    if (weights[2]! > .02) out.lerp(shade.set(0x3d5f4a), weights[2]! * smooth(WATER_LEVEL + .5, WATER_LEVEL - .6, height) * .7);
    return out;
  };
  const terrainGeometry = new THREE.PlaneGeometry((nx - 1) * cell, (nz - 1) * cell, nx - 1, nz - 1).rotateX(-Math.PI / 2);
  terrainGeometry.translate(x0 + (nx - 1) * cell / 2, 0, z0 + (nz - 1) * cell / 2);
  const tp = terrainGeometry.getAttribute('position'), tc = new Float32Array(tp.count * 3);
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    tp.setY(i, groundAt(x, z)); groundColor(x, z, tint);
    tc[i * 3] = tint.r; tc[i * 3 + 1] = tint.g; tc[i * 3 + 2] = tint.b;
    terrainGeometry.getAttribute('uv').setXY(i, x / 7, z / 7);
  }
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(tc, 3)); terrainGeometry.computeVertexNormals();
  // A soft mottled tile keeps large flat-coloured ground from looking like plastic.
  const mottle = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#e9e9e9'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = random() * w, y = random() * h, r = 2 + random() * 9;
      c.fillStyle = i % 3 ? 'rgba(255,255,255,.1)' : 'rgba(110,110,110,.1)';
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r * .6, random() * 3, 0, Math.PI * 2); c.fill(); }
    }
  }, { anisotropy });
  mottle.wrapS = mottle.wrapT = THREE.RepeatWrapping;
  const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: mottle, roughness: 1, metalness: 0 });
  const terrain = new THREE.Mesh(terrainGeometry, groundMaterial); terrain.name = 'terrain'; terrain.receiveShadow = true; group.add(terrain);

  /* ---------------------------------------------------------------- road and verges */
  const roadLanes = (d: number) => { const l = track.roadLeft(d), r = track.roadRight(d); return Array.from({ length: 9 }, (_, i) => -r + (l + r) * i / 8); };
  const roadGeometry = ribbon(track, { lanes: roadLanes, lift: .05, track: (d, lane) => Math.min(track.roadLeft(d) - lane, track.roadRight(d) + lane) });
  const data = roadGeometry.getAttribute('aTrack'), za = new Float32Array(data.count * 3), zb = new Float32Array(data.count * 2);
  for (let i = 0; i < data.count; i++) {
    zoneWeights(track, data.getX(i), weights);
    za.set([weights[0]!, weights[1]!, weights[2]!], i * 3); zb.set([weights[3]!, weights[4]!], i * 2);
  }
  roadGeometry.setAttribute('aZoneA', new THREE.BufferAttribute(za, 3)); roadGeometry.setAttribute('aZoneB', new THREE.BufferAttribute(zb, 2));
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .86, metalness: 0 });
  roadMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aTrack; attribute vec3 aZoneA; attribute vec2 aZoneB; varying vec3 vTrack; varying vec3 vZoneA; varying vec2 vZoneB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTrack = aTrack; vZoneA = aZoneA; vZoneB = aZoneB;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTrack; varying vec3 vZoneA; varying vec2 vZoneB; float kGloss = 0.;${ROAD_GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = kRoad(vTrack, vZoneA, vZoneB, kGloss);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - kGloss, .3, 1.);');
  };
  roadMaterial.customProgramCacheKey = () => 'godisracet-road-v1';
  const road = new THREE.Mesh(roadGeometry, roadMaterial); road.name = 'road'; road.receiveShadow = true; group.add(road);

  // Each verge runs from the road's edge past the barrier and down (or up) to the terrain, so the two always meet.
  const vergeColor = (side: number) => (d: number, lane: number, column: number, out: THREE.Color) => {
    track.point(d, lane, point);
    if (column >= 3) { groundColor(point.x, point.z, out); return; }
    zoneWeights(track, d, weights); out.setRGB(0, 0, 0);
    for (let k = 0; k < 5; k++) { other.set(ZONE_LOOK[k]!.rough); out.r += other.r * weights[k]!; out.g += other.g * weights[k]!; out.b += other.b * weights[k]!; }
    const stripe = .94 + .06 * Math.sign(Math.sin(d * .8 + side));
    out.multiplyScalar(column === 2 ? .93 : stripe);
    if (column === 2) out.lerp(groundColor(point.x, point.z, other), .5);
  };
  // Shared shoulder height curve so both the verge mesh and beside-road props land on the exact rendered surface.
  const surfaceAt = (x: number, z: number, d: number, out: number): number => {
    const g = groundAt(x, z);
    if (out >= 7.5) return g;
    const roadY = track.height(d), bog = zoneWeights(track, d, weights)[2]!;
    if (out <= -.01) return roadY + .03 - bog * .25;
    const shelf = roadY + .03 - bog * Math.max(.7, roadY - WATER_LEVEL + .4);
    if (out <= 0) return shelf;
    if (out <= 1) return shelf + (g - shelf) * .2 * out;
    if (out <= 3.5) return shelf + (g - shelf) * (.2 + .5 * (out - 1) / 2.5);
    const col3 = shelf + (g - shelf) * .7;
    return col3 + (g - col3) * (out - 3.5) / 4;
  };
  for (const side of [1, -1]) {
    const edge = (d: number) => side > 0 ? track.roadLeft(d) : track.roadRight(d), wall = (d: number) => side > 0 ? track.wallLeft(d) : track.wallRight(d);
    const offs = [-.05, 0, 1, 3.5, 7.5];
    const geometry = ribbon(track, {
      lanes: d => [side * (edge(d) - .05), side * wall(d), side * (wall(d) + 1), side * (wall(d) + 3.5), side * (wall(d) + 7.5)],
      color: vergeColor(side),
      height: (x, z, d, _lane, column) => surfaceAt(x, z, d, offs[column]!) - (column === 4 ? .12 : 0),
    });
    const verge = new THREE.Mesh(geometry, groundMaterial); verge.name = `verge:${side}`; verge.receiveShadow = true; group.add(verge);
  }

  /* ---------------------------------------------------------------- water */
  const water = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { clock: { value: 0 }, deep: { value: new THREE.Color(0x153e49) }, sky: { value: new THREE.Color(0x7ea5ad) } }]),
    vertexShader: `varying vec3 vWorld; varying vec3 vView;
      #include <fog_pars_vertex>
      void main() { vec4 world = modelMatrix * vec4(position, 1.); vWorld = world.xyz; vec4 mvPosition = viewMatrix * world; vView = cameraPosition - world.xyz; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float clock; uniform vec3 deep; uniform vec3 sky; varying vec3 vWorld; varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWorld.xz;
        float wave = sin(p.x * .9 + clock * 1.1) * sin(p.y * .8 - clock * .9) + .5 * sin(p.x * 2.3 - p.y * 1.9 + clock * 1.7);
        float glance = pow(1. - clamp(normalize(vView).y, 0., 1.), 3.);
        vec3 color = mix(deep, sky, clamp(glance * .68 + wave * .05, 0., 1.));
        color += smoothstep(1.25, 1.45, wave) * .22;
        gl_FragColor = vec4(color, .88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  // The pond covers the bog and a little more; everywhere else the terrain lies above it. No bog, no pond.
  let wx0 = Infinity, wx1 = -Infinity, wz0 = Infinity, wz1 = -Infinity;
  for (const span of track.zones) {
    if (span.kind !== 2) continue;
    const length = ((span.to - span.from) % LAP + LAP) % LAP || LAP;
    for (let d = -40; d < length + 40; d += 4) { track.point(span.from + d, 0, point); wx0 = Math.min(wx0, point.x); wx1 = Math.max(wx1, point.x); wz0 = Math.min(wz0, point.z); wz1 = Math.max(wz1, point.z); }
  }
  if (wx1 > wx0) {
    const pond = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0 + 110, wz1 - wz0 + 110).rotateX(-Math.PI / 2), water);
    pond.position.set((wx0 + wx1) / 2, WATER_LEVEL, (wz0 + wz1) / 2); pond.name = 'bog-water'; pond.renderOrder = 1; group.add(pond);
  }

  /* ---------------------------------------------------------------- paint, kerbs, strips, ramps, puddles */
  const flat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72 });
  const paint = createBatch(), identity = new THREE.Matrix4();
  const patch = (from: number, to: number, a: number, b: number, color: number, lift = .065, step = .5) =>
    paint.addMatrix(ribbon(track, { lanes: () => [a, b], from, to, step, lift }), flat, identity, color, Math.floor(((from % LAP) + LAP) % LAP / 120));
  // The start line: chequers, and a box for each kart on the grid.
  const width = track.roadLeft(0);
  for (let row = 0; row < 4; row++) for (let i = 0; i < Math.round(width * 2 / .75); i++) patch(-1.5 + row * .75, -.75 + row * .75, -width + i * .75, -width + (i + 1) * .75, (row + i) % 2 ? 0x22252b : 0xfdf7e6);
  for (const slot of track.grid) {
    patch(slot.distance + 1.5, slot.distance + 1.65, slot.lane - 1.15, slot.lane + 1.15, 0xfdf7e6);
    for (const side of [-1, 1]) patch(slot.distance - .4, slot.distance + 1.65, slot.lane + side * 1.15 - .07, slot.lane + side * 1.15 + .07, 0xfdf7e6);
  }
  // Kerbs like striped rock candy on the inside of every real bend, and where a kart runs wide on the way out.
  for (const side of [1, -1]) {
    let start: number | null = null;
    for (let d = 0; d <= LAP + 2; d += 2) {
      const k = track.curvature(d) * side, bend = d <= LAP && (k > .028 || track.curvature(d - 14) * side < -.04) && track.zone(d) !== 2 && !track.inCave(d);
      if (bend && start === null) start = d;
      if (!bend && start !== null) {
        for (let at = start; at < d; at += 2) {
          const edge = (x: number) => side > 0 ? track.roadLeft(x) : track.roadRight(x), candy = track.zone(at) === 4;
          paint.addMatrix(ribbon(track, { lanes: x => [side * (edge(x) - .1), side * (edge(x) + .35), side * (edge(x) + .8)], from: at, to: at + 2, step: 1, lift: (_d, _l, column) => column === 1 ? .13 : .06 }),
            solid, identity, (at / 2) % 2 ? 0xfdf7ee : candy ? 0xff6fa5 : 0xe5484d, Math.floor(at / 120));
        }
        start = null;
      }
    }
  }
  for (const puddle of track.mud) {
    const shape = ribbon(track, {
      from: puddle.at - puddle.long, to: puddle.at + puddle.long, step: .5, lift: .07,
      lanes: d => { const t = (d - puddle.at) / puddle.long, half = puddle.wide * Math.sqrt(Math.max(0, 1 - t * t)) * (1 + .12 * Math.sin(d * 3)); return [puddle.lane - half, puddle.lane, puddle.lane + half]; },
      color: (_d, _lane, column, out) => { out.set(column === 1 ? 0x3d2f25 : 0x574333); },
    });
    const mud = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .22, metalness: .05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mud.name = 'mud'; mud.receiveShadow = true; group.add(mud);
  }
  paint.build(group, { castShadow: false, name: 'paint' });

  // Boost strips: chevrons that run forward along the strip.
  const strip = new THREE.ShaderMaterial({
    fog: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { clock: { value: 0 } }]),
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() { vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float clock; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        float run = fract(vUv.y * 3. - clock * 2.4 + abs(vUv.x - .5) * 1.5);
        float chevron = smoothstep(0., .1, run) * smoothstep(.6, .5, run);
        vec3 color = mix(vec3(1., .36, .08), vec3(1., .95, .35), chevron);
        float rim = step(.06, vUv.x) * step(vUv.x, .94);
        gl_FragColor = vec4(mix(vec3(1.), color, rim) * 1.25, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  for (const pad of track.pads) {
    const geometry = ribbon(track, { lanes: () => [pad.lane - pad.half, pad.lane + pad.half], from: pad.from, to: pad.to, step: .5, lift: .075 });
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, i % 2, Math.floor(i / 2) / (uv.count / 2 - 1));
    const mesh = new THREE.Mesh(geometry, strip); mesh.name = 'boost-strip'; group.add(mesh);
  }
  // Ramps: a wooden wedge with bright stripes, open underneath at the top end.
  const wood = createBatch();
  for (const ramp of track.ramps) {
    const icy = track.zone(ramp.from) === 3, rows = Math.round((ramp.to - ramp.from) * 2), positions: number[] = [], colors: number[] = [], indices: number[] = [];
    const push = (d: number, lane: number, lift: number, color: number) => { track.point(d, lane, point); positions.push(point.x, point.y + .05 + lift, point.z); tint.set(color); colors.push(tint.r, tint.g, tint.b); return positions.length / 3 - 1; };
    for (let i = 0; i < rows; i++) {
      const d0 = ramp.from + (ramp.to - ramp.from) * i / rows, d1 = ramp.from + (ramp.to - ramp.from) * (i + 1) / rows;
      const h0 = ramp.height * i / rows, h1 = ramp.height * (i + 1) / rows;
      const top = i % 2 ? (icy ? 0xdff2ff : 0xf7c948) : icy ? 0x9fd0f2 : 0xd98a4a, side = icy ? 0x7fa9cf : 0x9a6238;
      const a = push(d0, ramp.lane + ramp.half, h0, top), b = push(d0, ramp.lane - ramp.half, h0, top), c = push(d1, ramp.lane + ramp.half, h1, top), e = push(d1, ramp.lane - ramp.half, h1, top);
      indices.push(a, b, c, b, e, c);
      for (const lane of [ramp.lane + ramp.half, ramp.lane - ramp.half]) {
        const p = push(d0, lane, h0, side), q = push(d1, lane, h1, side), r = push(d0, lane, -.05, side), s = push(d1, lane, -.05, side);
        if (lane > ramp.lane) indices.push(p, q, r, q, s, r); else indices.push(p, r, q, q, r, s);
      }
    }
    const backColor = icy ? 0x5c82aa : 0x7a4e2d;
    const back = [push(ramp.to, ramp.lane + ramp.half, ramp.height, backColor), push(ramp.to, ramp.lane - ramp.half, ramp.height, backColor), push(ramp.to, ramp.lane + ramp.half, -.05, backColor), push(ramp.to, ramp.lane - ramp.half, -.05, backColor)];
    indices.push(back[0]!, back[1]!, back[2]!, back[1]!, back[3]!, back[2]!);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    wood.addMatrix(geometry, solid, identity, null, `ramp${ramp.from}`); geometry.dispose();
  }

  /* ---------------------------------------------------------------- fences */
  // Posts every few metres along both barriers, with rails between them, in each place's own wood or candy.
  const box = new THREE.BoxGeometry(1, 1, 1), round = new THREE.CylinderGeometry(.5, .5, 1, 8), ball = new THREE.SphereGeometry(.5, 10, 8);
  const previous = new THREE.Vector3(), here = new THREE.Vector3(), middle = new THREE.Vector3();
  for (const side of [1, -1]) {
    let first = true;
    for (let d = 0; d <= LAP; d += 2.4) {
      const lane = side * ((side > 0 ? track.wallLeft(d) : track.wallRight(d)) + .22), zone = track.zone(d), look = ZONE_LOOK[zone]!, key = `${Math.floor(d / 80) % 12}`;
      track.point(d, lane, point); here.set(point.x, point.y + (zone === 2 ? -.3 : 0), point.z);
      const inCave = track.inCave(d, 1);
      if (!inCave) {
        const tall = zone === 4 ? 1.25 : zone === 2 ? 1.2 : .95, post = Math.round(d / 2.4);
        if (zone === 4) for (let i = 0; i < 5; i++) wood.add(round, solid, [here.x, here.y + .125 + i * .25, here.z], [0, 0, 0], [.22, .25, .22], (i + post) % 2 ? 0xfdfdfd : 0xff5d8f, null, key);
        else wood.add(zone === 0 ? box : round, solid, [here.x, here.y + tall / 2, here.z], [0, point.angle, 0], [.17, tall, .17], look.post, null, key);
        if (zone === 4) wood.add(ball, solid, [here.x, here.y + 1.4, here.z], [0, 0, 0], .42, [0x7ad7f0, 0xffd166, 0xa0e77d, 0xc8a2ff][post % 4]!, null, key);
        if (!first && !track.inCave(d - 2.4, 1)) {
          middle.copy(previous).add(here).multiplyScalar(.5);
          const length = previous.distanceTo(here), yaw = Math.atan2(here.x - previous.x, here.z - previous.z), pitch = -Math.asin((here.y - previous.y) / length);
          for (const [height, thick] of zone === 0 ? [[.78, .1], [.42, .1]] : zone === 1 ? [[.7, .2]] : zone === 2 ? [[.95, .07]] : zone === 3 ? [[.55, .34]] : [[.95, .14]]) {
            wood.add(zone === 1 || zone === 2 ? round : box, solid, [middle.x, middle.y + height!, middle.z], [pitch + (zone === 1 || zone === 2 ? Math.PI / 2 : 0), yaw, 0],
              zone === 1 || zone === 2 ? [thick!, length + .1, thick!] : [zone === 3 ? .5 : .08, thick!, length + .05], zone === 3 ? (post % 2 ? 0xa3aabb : 0x8b93a6) : look.rail, null, key);
          }
        }
      }
      previous.copy(here); first = false;
    }
  }
  wood.build(group, { name: 'woodwork' });
  box.dispose(); round.dispose(); ball.dispose();

  return {
    group, groundAt, surfaceAt, zonesAt, roadDistance,
    update(time, skyTint) {
      water.uniforms.clock!.value = time;
      strip.uniforms.clock!.value = time;
      if (skyTint) (water.uniforms.sky!.value as THREE.Color).setHex(0x7ea5ad).lerp(skyTint, .55);
    },
    /** Materials that no mesh may be using on a course without water or strips still belong to this world. */
    dispose() { water.dispose(); strip.dispose(); },
  };
}
