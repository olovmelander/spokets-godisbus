import {
  BufferGeometry, Color, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sequence } from '../../render/dressing/kit';
import { glowTexture } from '../../render/glow';

/**
 * A field stone (gråsten): the stone under Klonk's seesaw in Billsta (Olov, 14 November 2026: "Kan vi förbättra
 * designen och texturen på stenen vid gungbrädan?"), and the stone out in the narrow that the two figures are seen on.
 * It was a low grey lump of flat facets with a green blob on it.
 *
 * Now it is a stone the ice left: rounded, with a few flats worn into it and soft edges between them, a little lopsided,
 * heavy, sunk a finger into the ground. Its skin is granite: grey going to pink, speckled with dark mica and pale
 * quartz, a white vein across it and a hairline crack; crust lichen in grey-green patches with crinkled edges and a
 * few orange ones on its sunny side; moss, thick and soft, over its weather side and into its hollows, standing a
 * little proud of the rock; and a dark, damp foot where it meets the ground. It is wet from the rain: the bare rock
 * shines, the lichen and the moss do not.
 *
 * One draw, and a soft shade under it. Everything is drawn in the stone's own measures (its foot's middle is the
 * origin), so the skin goes with it when it is pushed.
 */

export interface FieldBoulder {
  /** How wide it is along the course, how high its top is where he is, and how deep it lies across the path. */
  width: number;
  height: number;
  depth: number;
  /** How far behind the play plane its middle lies. */
  back?: number;
  /** A trough across its top for something that lies on it (the seesaw's trunk): how far behind the plane, how deep, how wide. */
  saddle?: { z: number; deep: number; wide: number };
  /** Standing in water: wet all over, dark and bare to this height over its foot, with no moss below it. */
  awash?: number;
  /** How much moss grows on it, 0 to 1. Left out: 1. A stone in the current has little: the water keeps it bare. */
  moss?: number;
  seed?: number;
}

/** Smooth noise in space, 0 to 1. */
function noise(x: number, y: number, z: number): number {
  const hash = (i: number, j: number, k: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const u = x - i, v = y - j, w = z - k;
  const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), c = w * w * (3 - 2 * w);
  const mix = (p: number, q: number, t: number) => p + (q - p) * t;
  return mix(
    mix(mix(hash(i, j, k), hash(i + 1, j, k), a), mix(hash(i, j + 1, k), hash(i + 1, j + 1, k), a), b),
    mix(mix(hash(i, j, k + 1), hash(i + 1, j, k + 1), a), mix(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), a), b),
    c,
  );
}
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Which way the weather comes from: the side its moss grows on (up, and from behind on the left). */
const WEATHER = new Vector3(-0.45, 0.62, -0.64).normalize();

/**
 * The stone's shape, with how much moss grows at each corner (`moss`, 0 to 1). Its foot is at 0 (it goes on a little
 * under the ground), its top at `height` where he is.
 */
export function boulderShape(def: FieldBoulder): BufferGeometry {
  const { width, height, depth } = def;
  const seed = def.seed ?? 1;
  const random = sequence(seed * 9973 + 5);
  const back = def.back ?? 0;
  // An egg of the ice: a ball drawn out to its measures, its middle a little under half its height, so that it is
  // widest low down and stands in the ground.
  const sunk = Math.max(0.06, height * 0.1);
  const middle = height * 0.36;
  const radius = new Vector3(width * 0.55, height - middle + 0.02, depth * 0.52);
  const ball = mergeVertices(new IcosahedronGeometry(1, 9).deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  const at = ball.getAttribute('position');
  // The flats the ice and the frost have worn into it: each a plane a little inside its skin.
  const flats = Array.from({ length: 9 }, (_, i) => {
    // (None faces down: the stone is not undercut.)
    const n = new Vector3(random() * 2 - 1, i < 2 ? 0.9 + random() * 0.3 : Math.max(0.03, random() * 1.15 - 0.1), random() * 2 - 1).normalize();
    // How far out the egg reaches that way, and how much of it the flat takes off.
    const reach = Math.hypot(n.x * radius.x, n.y * radius.y, n.z * radius.z);
    return { n, far: reach * (i < 2 ? 0.93 : 0.76 + random() * 0.14) };
  });
  const soft = 0.045 * Math.min(width, depth);
  const p = new Vector3(), moss: number[] = [];
  for (let i = 0; i < at.count; i++) {
    p.fromBufferAttribute(at, i);
    const dir = p.clone();
    // Lopsided: broader at one end, and a shoulder on one side.
    const lump = 0.86 + 0.2 * noise(dir.x * 1.3 + seed, dir.y * 1.3, dir.z * 1.3) + 0.08 * noise(dir.x * 2.9, dir.y * 2.9 + seed, dir.z * 2.9);
    // Below its widest it goes straight down into the ground, as a stone that has lain there since the ice: never undercut.
    if (p.y < 0) {
      const across = 1 / Math.max(0.05, Math.hypot(p.x, p.z));
      p.x *= across;
      p.z *= across;
    }
    p.multiply(radius).multiplyScalar(lump);
    for (const flat of flats) {
      // Past a flat, a corner is brought back to it; just short of it, eased, so that the edge between two flats is round.
      const over = p.dot(flat.n) - flat.far;
      if (over > -soft) p.addScaledVector(flat.n, -(over > soft ? over : ((over + soft) * (over + soft)) / (4 * soft)));
    }
    p.y += middle;
    p.z += back;
    // Level where he may stand on it, and no higher anywhere.
    if (p.y > height) p.y = height;
    // The trough the trunk lies in.
    if (def.saddle) {
      const off = (p.z - def.saddle.z) / def.saddle.wide;
      const most = height - def.saddle.deep * Math.max(0, 1 - off * off);
      if (p.y > most) p.y = most;
    }
    // Its foot: straight down into the ground from where it is widest, never undercut.
    if (p.y < -sunk) p.y = -sunk;
    // Moss: on its weather side and its top, thickest in its hollows; none where it stands in water.
    const out = dir.normalize();
    const facing = out.dot(WEATHER);
    let grown = smooth((facing - 0.05) / 0.55) * (0.55 + 0.75 * noise(p.x * 2.6 + seed * 3, p.y * 2.6, p.z * 2.6));
    grown *= smooth((p.y - height * 0.12) / (height * 0.3));
    if (def.awash !== undefined) grown *= smooth((p.y - def.awash - 0.1) / 0.25);
    grown *= def.moss ?? 1;
    moss.push(Math.min(1, grown));
    at.setXYZ(i, p.x, p.y, p.z);
  }
  ball.computeVertexNormals();
  // The moss stands proud of the rock, in soft cushions.
  const normal = ball.getAttribute('normal');
  for (let i = 0; i < at.count; i++) {
    const m = moss[i]!;
    if (m <= 0.3 || (def.saddle && Math.abs(at.getZ(i) - def.saddle.z) < def.saddle.wide)) continue;
    const proud = 0.05 * Math.min(1, height / 0.6) * smooth((m - 0.3) / 0.4) * (0.6 + 0.8 * noise(at.getX(i) * 9, at.getY(i) * 9, at.getZ(i) * 9));
    const y = at.getY(i) + normal.getY(i) * proud;
    at.setXYZ(i, at.getX(i) + normal.getX(i) * proud, Math.min(y, Math.max(at.getY(i), height)), at.getZ(i) + normal.getZ(i) * proud);
  }
  ball.computeVertexNormals();
  ball.setAttribute('moss', new Float32BufferAttribute(moss, 1));
  ball.computeBoundingBox();
  ball.computeBoundingSphere();
  return ball;
}

const SKIN = /* glsl */ `
  float stoneHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float stoneNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(stoneHash(i), stoneHash(i + vec3(1.0, 0.0, 0.0)), u.x), mix(stoneHash(i + vec3(0.0, 1.0, 0.0)), stoneHash(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(mix(stoneHash(i + vec3(0.0, 0.0, 1.0)), stoneHash(i + vec3(1.0, 0.0, 1.0)), u.x), mix(stoneHash(i + vec3(0.0, 1.0, 1.0)), stoneHash(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
      u.z);
  }
  // The stone's colour at a place on it (xyz in its own measures), and how rough it is there (a).
  vec4 stoneSkin(vec3 p, vec3 n, float grown, vec3 size) {
    float big = stoneNoise(p * 2.1 + 11.0), mid = stoneNoise(p * 6.5), fine = stoneNoise(p * 24.0);
    // How big a grain is on the screen: what is finer than a pixel or two is left out.
    float near = 1.0 - smoothstep(0.02, 0.06, length(fwidth(p)));
    // Granite: grey, mottled, going to pink where the feldspar is; dark mica flecks, pale quartz grains.
    vec3 rock = mix(stoneGrey, stonePale, 0.5 * mid + 0.35 * big);
    rock = mix(rock, stonePink, 0.5 * smoothstep(0.5, 0.78, stoneNoise(p * 3.6 + 3.7)));
    // (Round grains from fine noise: grains cut from a grid of cells were little squares.)
    float grain = stoneNoise(p * 34.0 + 9.0), grit = stoneNoise(p * 41.0 + 31.0);
    // Worn by the water, the grains hardly show: its skin is smooth.
    float speck = near * (1.0 - 0.7 * stoneWorn);
    rock = mix(rock, stoneMica, 0.75 * smoothstep(0.7, 0.78, grain) * speck);
    rock = mix(rock, stoneQuartz, 0.6 * smoothstep(0.72, 0.8, grit) * speck);
    rock *= 0.9 + 0.2 * fine;
    // A quartz vein across it, and a hairline crack.
    float vein = 1.0 - smoothstep(0.0, 0.02, abs(dot(p, vec3(0.5, 0.78, 0.37)) - 0.27 * size.y / 0.6 + 0.05 * stoneNoise(p * 5.0)));
    rock = mix(rock, stoneQuartz, 0.6 * vein);
    float crack = 1.0 - smoothstep(0.0, 0.009, abs(dot(p, vec3(-0.62, 0.3, 0.72)) + 0.1 + 0.09 * stoneNoise(p * 3.1)));
    rock *= 1.0 - 0.55 * crack;
    float rough = 0.36 + 0.14 * mid;
    // Crust lichen: grey-green patches with crinkled edges, more on its top; a few orange ones, and pale dots.
    float lichen = smoothstep(0.55, 0.6, stoneNoise(p * 3.1 + 5.0) + 0.1 * (fine - 0.5) + 0.07 * n.y) * stoneDry;
    rock = mix(rock, stoneLichen * (0.82 + 0.36 * fine), 0.86 * lichen);
    float orange = smoothstep(0.765, 0.795, stoneNoise(p * 8.4 + 21.0) + 0.07 * (fine - 0.5)) * smoothstep(-0.15, 0.3, n.y) * stoneDry;
    rock = mix(rock, stoneOrange * (0.8 + 0.4 * fine), 0.85 * orange);
    float crust = smoothstep(0.78, 0.81, stoneNoise(p * 11.0 + 40.0)) * stoneDry;
    rock = mix(rock, stoneCrust, 0.65 * crust);
    rough = mix(rough, 0.86, max(lichen, max(orange, crust)));
    // Moss, with a ragged edge: deep green in its hollows, lighter on its tips.
    float moss = smoothstep(0.4, 0.56, grown + 0.2 * (mid - 0.5) + 0.14 * (fine - 0.5));
    vec3 green = mix(stoneMossDeep, stoneMossLight, clamp(0.35 * fine + 0.65 * stoneNoise(p * 55.0) * near + 0.3 * (grown - 0.5), 0.0, 1.0));
    rock = mix(rock, green, moss);
    rough = mix(rough, 0.97, moss);
    // Its damp foot, and the dark of the water it stands in.
    float foot = 1.0 - smoothstep(0.0, 0.2 * size.y / 0.6 + stoneAwash, p.y + 0.04 * (mid - 0.5));
    rock *= 1.0 - 0.52 * foot;
    rough = mix(rough, 0.24, foot * (1.0 - moss));
    // Water-worn, it is wet all over from the spray, darker, and glossy.
    rock *= 1.0 - 0.28 * stoneWorn;
    rough = mix(rough, 0.2, 0.7 * stoneWorn * (1.0 - moss));
    return vec4(rock, rough);
  }
`;

/** The stone's material: its skin drawn where it is on the stone, so that it goes with the stone. */
export function boulderMaterial(def: FieldBoulder): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0 });
  const colours = {
    stoneGrey: '#7f8384', stonePale: '#a3a5a2', stonePink: '#a98f86', stoneMica: '#2c2d30', stoneQuartz: '#dcdad2',
    stoneLichen: '#9aa78c', stoneOrange: '#bd8a34', stoneCrust: '#c9cbbd', stoneMossDeep: '#33491c', stoneMossLight: '#7a9636',
  };
  const size = new Vector3(def.width, def.height, def.depth);
  material.customProgramCacheKey = () => 'field-boulder-v5';
  material.onBeforeCompile = (shader) => {
    for (const [name, hex] of Object.entries(colours)) shader.uniforms[name] = { value: new Color(hex) };
    shader.uniforms.stoneSize = { value: size };
    // In water there is no lichen low down, and the foot's dark reaches up to the water; the water has worn it smooth.
    shader.uniforms.stoneDry = { value: def.awash === undefined ? 1 : 0.55 };
    shader.uniforms.stoneAwash = { value: def.awash ?? 0 };
    shader.uniforms.stoneWorn = { value: def.awash === undefined ? 0 : 1 };
    shader.vertexShader = 'attribute float moss;\nvarying vec3 stoneAt;\nvarying vec3 stoneOut;\nvarying float stoneGrown;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  stoneAt = position;\n  stoneOut = normal;\n  stoneGrown = moss;');
    shader.fragmentShader = `varying vec3 stoneAt;\nvarying vec3 stoneOut;\nvarying float stoneGrown;\nuniform vec3 stoneSize;\nuniform float stoneDry;\nuniform float stoneAwash;\nuniform float stoneWorn;\n${Object.keys(colours).map((name) => `uniform vec3 ${name};`).join('\n')}\n${SKIN}\n` + shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  vec4 stoneSeen = stoneSkin(stoneAt, normalize(stoneOut), stoneGrown, stoneSize);\n  diffuseColor.rgb *= stoneSeen.rgb;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = stoneSeen.a;');
  };
  return material;
}

/** A field stone, standing on the ground at its foot's middle, with the soft shade it throws on the ground round it. */
export function fieldBoulder(def: FieldBoulder): Group {
  const group = new Group();
  const stone = new Mesh(boulderShape(def), boulderMaterial(def));
  stone.name = 'field-boulder';
  stone.castShadow = true;
  stone.receiveShadow = true;
  group.add(stone);
  if (def.awash === undefined) {
    // It lies heavy: the ground round its foot is dark with its shade and the damp.
    const shade = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#000000', map: glowTexture(32), transparent: true, opacity: 0.55, depthWrite: false }));
    shade.name = 'field-boulder-shade';
    shade.scale.set(def.width * 1.9, 1, def.depth * 1.75);
    shade.position.set(0, 0.02, def.back ?? 0);
    shade.renderOrder = -1;
    group.add(shade);
  }
  return group;
}
