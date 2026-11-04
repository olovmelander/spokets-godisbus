import {
  AdditiveBlending, Box3, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage,
  Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
  CatmullRomCurve3, Points, PointsMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, TubeGeometry, Vector2, Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Assets } from '../../render/assets';
import { PLACES } from '../../render/dressing';
import type { PlaceLook } from '../../render/dressing/kit';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../../render/extensions';
import { glowTexture } from '../../render/glow';
import { drawnWhile } from '../../render/idle';
import type { SpotProp } from '../../render/props';
import type { Mover, RideLook, Spot } from '../../sim/types';
import { box, building, PANE, rock } from './buildings';
import { createGrandparent, type Grandparent } from './grandparents';

/**
 * Äventyr 2's pictures (docs/aventyr-2.md), built in code like the first adventure's stand-ins: each is
 * recognisable, none is final art, and nothing here is a likeness of anyone. Registered into the renderer's
 * extension points (src/render/extensions.ts) when the pack loads.
 *
 * - **Night looks** for each chapter: the storm's blue dark, the lamplit village, the moonlit lake, the clear morning.
 * - **The storm:** rain in slanting streaks round the camera, soft flashes of lightning far behind (never a strobe,
 *   and none with less motion), figures blown across the sky in a flash, candlelight in windows, and when the storm's
 *   eye opens the stars and the moon.
 * - **The things of the story:** the two trägubbar, the pumpkin lantern, the owl, the rain barrel's tap, a candle,
 *   a flashlight, the little one's cap, the window latch and the reeds; Bertil's boot, Moa's umbrella and the owl
 *   to ride on; and the lid, the bark, the swinging sign and the jetty's planks.
 */

const solid = (color: string, roughness = 0.8, more: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) =>
  new MeshStandardMaterial({ color, roughness, ...more });
const ball = (radius: number, material: Material, x = 0, y = 0, z = 0, squash: readonly [number, number, number] = [1, 1, 1]): Mesh => {
  const mesh = new Mesh(new SphereGeometry(radius, 14, 10), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(...squash);
  return mesh;
};
const UP = new Vector3(0, 1, 0);
const tmp = new Vector3();
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
/** A fixed scatter: the same in every session and every screenshot. */
function scatter(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where Elof is, for those who look at him, and how far the story has come. */
const elof: { x: number; flags: ReadonlySet<string> | null } = { x: 0, flags: null };
/** The flag that puts the ladder's ledge over the ditch at Billsta. */
const LADDER_LAID = 'bi:ladder';

let glowMap: ReturnType<typeof glowTexture> | null = null;
/** A soft additive glow of a colour, as big as `size`. */
function glow(colour: string, size: number, opacity = 1): Mesh {
  glowMap ??= glowTexture(32);
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({
    color: colour, map: glowMap, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, fog: false,
  }));
  mesh.renderOrder = 3;
  return mesh;
}

// --- the night looks -------------------------------------------------------------------------------------------

/**
 * A night's grade. Its contrast stays near 1: it pivots on middle grey, so in a picture this dark more of it turns
 * the near shapes to pure black, where Elof is lost.
 */
const grade = (exposure: number, saturation: number, tint: readonly [number, number, number]) => ({ tint: [...tint] as [number, number, number], exposure, contrast: 1.02, saturation, vignette: 0.4, grain: 0.04 });

/**
 * The light from the camera's side, out of doors in the storm. The sun stands behind the scene, so this is what
 * falls on what faces him: strong enough that near shapes read, while the sky, which it doesn't light, stays dark.
 */
const STORM_FILL = 1.8;

/** Each chapter's light, in place of its place's (its `id` stays the place's, for the place's kits). */
const LOOKS: Record<string, PlaceLook> = {
  // At home on the storm evening: candlelight inside, and the dark storm beyond the deck.
  stormkvall: {
    ...PLACES.home,
    grade: { ...PLACES.home.grade, tint: [1.05, 0.98, 0.95], exposure: 0.86, vignette: 0.42 },
    haze: { colour: '#262e42', near: 8, far: 76 },
    sky: { top: '#0b1220', middle: '#25304a', bottom: '#1c2232', glow: '#8fa0c4' },
    hemisphere: { sky: '#ffd7a4', ground: '#5a4230', intensity: 1.15 },
    sun: { colour: '#ffc488', intensity: 2.3, from: [-7, 5, -3] },
    fill: { colour: '#c8c4e8', intensity: 0.6 },
  },
  stormgard: {
    ...PLACES.garden,
    grade: grade(0.8, 0.86, [0.86, 0.95, 1.12]),
    haze: { colour: '#2c3a54', near: 5, far: 58 },
    sky: { top: '#0b1324', middle: '#2b3a58', bottom: '#1e2a3e', glow: '#91a6cc' },
    hemisphere: { sky: '#8ea2d2', ground: '#34402e', intensity: 1.05 },
    sun: { colour: '#c4d2ff', intensity: 1.7, from: [-6, 6, -3] },
    fill: { colour: '#a8bce8', intensity: STORM_FILL },
    water: { colour: '#2b4260', opacity: 0.86 },
    tussock: '#55663f',
  },
  stormskog: {
    ...PLACES.forest,
    grade: grade(0.88, 0.84, [0.86, 0.97, 1.1]),
    haze: { colour: '#22333a', near: 4, far: 50 },
    sky: { top: '#081218', middle: '#203238', bottom: '#18262a', glow: '#8fb2b8' },
    hemisphere: { sky: '#86a6b8', ground: '#2c3a24', intensity: 1.05 },
    sun: { colour: '#c0d6ff', intensity: 1.6, from: [-7, 5, -4] },
    fill: { colour: '#a4c0e0', intensity: STORM_FILL },
    water: { colour: '#2a4a52', opacity: 0.86 },
    tussock: '#56663c',
  },
  stormbyn: {
    ...PLACES.village,
    grade: grade(0.82, 0.9, [0.95, 0.96, 1.08]),
    haze: { colour: '#2a3246', near: 7, far: 80 },
    sky: { top: '#0c1222', middle: '#2c3650', bottom: '#2a2c38', glow: '#b0a6c4' },
    hemisphere: { sky: '#98a6cc', ground: '#3c3a3c', intensity: 1.05 },
    sun: { colour: '#ffd8a4', intensity: 1.5, from: [-8, 3.4, -4] },
    fill: { colour: '#b4c2ec', intensity: STORM_FILL },
    water: { colour: '#283446', opacity: 0.88 },
    tussock: '#5a5a58',
  },
  flarken: {
    ...PLACES.bog,
    grade: grade(0.88, 0.86, [0.86, 0.96, 1.12]),
    haze: { colour: '#273a4c', near: 5, far: 64 },
    sky: { top: '#0a1424', middle: '#283c56', bottom: '#1c2c3c', glow: '#98b0cc' },
    hemisphere: { sky: '#90a8d0', ground: '#3a3a2e', intensity: 1.05 },
    sun: { colour: '#c8d6ff', intensity: 1.6, from: [-8, 4, -4] },
    fill: { colour: '#a8bce4', intensity: STORM_FILL },
    water: { colour: '#24384e', opacity: 0.9 },
    tussock: '#6a6c4c',
  },
  // The new worlds' first light, until their own is set: the football pitch, the river and Billsta at night.
  olympia: {
    ...PLACES.garden,
    // A clearing cut out of a forested hill: the forest stands right behind the stand, and no garden.
    far: 'forest',
    farBeyond: -70,
    grade: grade(0.82, 0.86, [0.88, 0.96, 1.1]),
    // Thin haze: the hall and the stand are what this place is, and they stand well back.
    haze: { colour: '#2a3650', near: 12, far: 130 },
    sky: { top: '#0a1222', middle: '#2a3856', bottom: '#1e283a', glow: '#94a8cc' },
    hemisphere: { sky: '#8ea2d2', ground: '#34402e', intensity: 1.05 },
    sun: { colour: '#c4d2ff', intensity: 1.7, from: [-6, 6, -3] },
    fill: { colour: '#a8bce8', intensity: STORM_FILL },
    water: { colour: '#2b4260', opacity: 0.86 },
    tussock: '#55663f',
  },
  alven: {
    ...PLACES.forest,
    grade: grade(0.88, 0.86, [0.88, 0.97, 1.1]),
    haze: { colour: '#24343e', near: 5, far: 60 },
    sky: { top: '#081218', middle: '#22343c', bottom: '#18262c', glow: '#90b0bc' },
    hemisphere: { sky: '#88a6bc', ground: '#2e3a28', intensity: 1.05 },
    sun: { colour: '#c4d6ff', intensity: 1.6, from: [-7, 5, -4] },
    fill: { colour: '#a4c0e0', intensity: STORM_FILL },
    water: { colour: '#264654', opacity: 0.88 },
    tussock: '#56663c',
  },
  billsta: {
    ...PLACES.garden,
    // By the road near the forest: spruce behind the house, and no other garden's house far off.
    far: 'forest',
    farBeyond: -70,
    grade: grade(0.84, 0.88, [0.9, 0.97, 1.1]),
    haze: { colour: '#283450', near: 16, far: 170 },
    sky: { top: '#0a1224', middle: '#2a3a5a', bottom: '#1e2a40', glow: '#a0b4d8' },
    hemisphere: { sky: '#90a4d4', ground: '#363f30', intensity: 1.08 },
    sun: { colour: '#c8d4ff', intensity: 1.75, from: [-6, 6, -3] },
    fill: { colour: '#aabce8', intensity: STORM_FILL },
    water: { colour: '#2a405e', opacity: 0.86 },
    tussock: '#56663f',
  },
  stormoga: {
    ...PLACES.bog,
    grade: grade(0.86, 0.9, [0.88, 0.96, 1.14]),
    haze: { colour: '#1e2c48', near: 6, far: 80 },
    sky: { top: '#060c1e', middle: '#1c2a4c', bottom: '#2a3454', glow: '#d8e2ff' },
    hemisphere: { sky: '#9cb0e6', ground: '#3a3c48', intensity: 1.1 },
    // The moon, low over the lake, behind the stone.
    sun: { colour: '#dfe6ff', intensity: 1.9, from: [-6, 4, -6] },
    fill: { colour: '#b4c4f0', intensity: 0.75 },
    water: { colour: '#1e3050', opacity: 0.9 },
    tussock: '#5c6050',
  },
  morgonen: {
    ...PLACES.home,
    // Sunday after the storm: the air washed clear, a cool bright light through the windows.
    grade: { ...PLACES.home.grade, tint: [1.02, 1.01, 0.98], exposure: 1.07, saturation: 1.08 },
    sun: { ...PLACES.home.sun, intensity: 3.3 },
  },
};
/** The night's tint on what no lamp lights: the painted far scenery, the soft foreground. `calm`: the storm's eye. */
const TINT: Record<string, readonly [number, number, number]> = {
  stormkvall: [0.42, 0.46, 0.62], stormgard: [0.46, 0.5, 0.66], stormskog: [0.42, 0.48, 0.58], stormbyn: [0.5, 0.52, 0.64],
  olympia: [0.46, 0.5, 0.66], flarken: [0.46, 0.51, 0.66], alven: [0.42, 0.48, 0.6], billsta: [0.48, 0.52, 0.68], stormoga: [0.42, 0.46, 0.64], calm: [0.58, 0.64, 0.88],
};
/** How much of the painted far scenery shows through the storm's dark: the backdrop is dimmed to night. */
const DIM: Record<string, number> = { stormkvall: 0.34, stormgard: 0.42, stormskog: 0.36, stormbyn: 0.46, olympia: 0.42, flarken: 0.4, alven: 0.38, billsta: 0.44, stormoga: 0.38 };

// --- the storm -------------------------------------------------------------------------------------------------

const RAIN_MAX = 420;
const RAIN_FOR = { low: 150, mid: 290, high: RAIN_MAX } as const;
/** The box of rain round the camera: how wide, how tall, and from how far behind the play plane to how near. */
const BOX = { x: 34, y: 22, back: -8, front: 4 };

/** The night sky in a window during the storm: dark cloud, and rain running down the glass. */
function stormPane(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, '#0e1628');
  sky.addColorStop(0.7, '#26324a');
  sky.addColorStop(1, '#1a2232');
  c.fillStyle = sky;
  c.fillRect(0, 0, 96, 64);
  const r = scatter(41);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(200,215,255,${0.08 + r() * 0.14})`;
    c.fillRect(r() * 96, r() * 64, 0.8, 4 + r() * 8);
  }
  // The far tree line, darker than the sky.
  c.fillStyle = '#0a101c';
  c.beginPath();
  c.moveTo(0, 64);
  for (let x = 0; x <= 96; x += 4) c.lineTo(x, 48 - 6 * Math.abs(Math.sin(x * 0.21)) - 3 * Math.sin(x * 0.7));
  c.lineTo(96, 64);
  c.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A jagged bolt, far behind: a ribbon of light that only shows in its own flash. */
function bolt(seed: number): Mesh {
  const r = scatter(seed);
  const positions: number[] = [];
  let x = 0;
  let y = 0;
  const width = 0.5;
  for (let i = 0; i < 9; i++) {
    const nx = x + (r() - 0.5) * 3.6;
    const ny = y - 2.4 - r() * 1.6;
    positions.push(x - width, y, 0, x + width, y, 0, nx - width, ny, 0, x + width, y, 0, nx + width, ny, 0, nx - width, ny, 0);
    x = nx;
    y = ny;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: '#e8eeff', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide }));
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * The storm round the camera. Its flashes are soft and seldom (Harding's rule: never more than three a second);
 * with less motion the rain hangs still and there are none.
 */
function stormExtra({ chapter, scene, hemisphere, sun }: ExtraContext): ViewExtra | null {
  const storm = chapter.storm;
  const dim = DIM[chapter.id];
  if (!storm && dim === undefined) return null;
  const group = new Group();
  group.name = 'storm';
  scene.add(group);
  const random = scatter(chapter.id.length * 977);

  // Rain: thin pale streaks, slanting with the wind from the left.
  const rain = storm?.rain ?? 0;
  const drops = new InstancedMesh(new PlaneGeometry(0.03, 0.85), new MeshBasicMaterial({ color: '#cfdcff', transparent: true, opacity: 0.3, depthWrite: false, fog: false }), RAIN_MAX);
  drops.instanceMatrix.setUsage(DynamicDrawUsage);
  drops.frustumCulled = false;
  drops.renderOrder = 4;
  const seeds = Array.from({ length: RAIN_MAX }, () => ({ x: random() * BOX.x, y: random() * BOX.y, z: BOX.back + random() * (BOX.front - BOX.back), speed: 13 + random() * 6 }));
  if (rain > 0) group.add(drops);
  const place = new Object3D();
  const SLANT = 0.32;
  place.rotation.z = -SLANT * 0.6;

  // Lightning: a bolt far behind, the sky and the lights brightening with it.
  const bolts = [bolt(3), bolt(11)];
  for (const b of bolts) group.add(b);
  const base = { hemisphere: hemisphere.intensity, sun: sun.intensity };
  let nextFlash = (storm?.lightning ?? 0) * 0.5;
  let flashAt = -99;
  let flashBolt = 0;
  const flashOf = (since: number) => since < 0 ? 0 : Math.exp(-since * 7) * smooth(since / 0.04) + 0.55 * Math.exp(-Math.max(0, since - 0.22) * 9) * smooth((since - 0.18) / 0.04);

  // Figures blown across the sky: lit by their own flash.
  const flybys = (storm?.flybys ?? []).map((def) => {
    const figure = (def.who === 'lillgubbe' ? littleFigure : oldFigure)(true);
    figure.scale.setScalar(1.2);
    // Floating down the water, the old one rides a log.
    if (def.who === 'tragubbe' && Math.max(def.from.y, def.to.y) < 1.5) {
      const log = new Mesh(new CylinderGeometry(0.22, 0.25, 2.2, 8), solid('#5a4632', 0.9));
      log.rotation.z = Math.PI / 2;
      log.position.y = -0.1;
      figure.add(log);
    }
    figure.visible = false;
    group.add(figure);
    return { def, figure, start: -1, seen: false };
  });

  // Candles and lamps in windows: warm, a little alive.
  const glows = (storm?.glows ?? []).map((def, i) => {
    const light = glow('#ffc66e', def.size ?? 1.2, 0.85);
    light.position.set(def.at.x, def.at.y, def.z ?? -6);
    group.add(light);
    return { def, light, phase: i * 1.7 };
  });

  // When the storm's eye opens: stars, and the moon over the water.
  const starGeometry = new BufferGeometry();
  const stars: number[] = [];
  for (let i = 0; i < 260; i++) stars.push((random() - 0.5) * 220, 6 + random() * 50, -95 - random() * 10);
  starGeometry.setAttribute('position', new Float32BufferAttribute(stars, 3));
  const starMaterial = new PointsMaterial({ color: '#f2f4ff', size: 0.55, transparent: true, opacity: 0, depthWrite: false, fog: false, sizeAttenuation: true });
  const starField = new Points(starGeometry, starMaterial);
  starField.frustumCulled = false;
  const moon = new Group();
  // Named: the light shafts of the visual upgrade find the moon by it (src/render/lift/atmosphere.ts).
  moon.name = 'moon';
  moon.add(new Mesh(new SphereGeometry(3.2, 24, 16), new MeshBasicMaterial({ color: '#f4f2e6', transparent: true, opacity: 0, fog: false })), glow('#c8d8ff', 26, 0));
  if (storm?.calm) group.add(starField, moon);
  let calm = 0;

  // The windows of a room in the storm show the storm, not the morning or the northern lights.
  const panes: MeshBasicMaterial[] = [];
  if (chapter.house && storm) {
    const pane = stormPane();
    scene.traverse((object) => {
      const material = (object as Mesh).material as MeshBasicMaterial | undefined;
      if (material?.name === 'window-glass' && !panes.includes(material)) {
        material.map = pane;
        material.needsUpdate = true;
        panes.push(material);
      }
    });
  }

  // The painted far scenery and the soft foreground are lit by no lamp: they are tinted to the night, the sun's
  // shafts all but put out, and they brighten with each flash. In a house only the far scenery beyond its windows.
  const night = new Color(...(TINT[chapter.id] ?? [1, 1, 1]));
  const eyeTint = new Color(...(TINT.calm ?? [1, 1, 1]));
  const unlit: { material: MeshBasicMaterial; base: Color; additive: boolean }[] = [];
  scene.getObjectByName('dressing')?.traverse((object) => {
    const material = (object as Mesh).material as MeshBasicMaterial | undefined;
    if (!material?.isMeshBasicMaterial || material.name === 'window-glass' || unlit.some((u) => u.material === material)) return;
    // In a house, only what lies out of doors: the far scenery, and the garden beyond the corner.
    if (chapter.house && !object.name.startsWith('far-') && !(chapter.outdoors !== undefined && new Box3().setFromObject(object).min.x >= chapter.outdoors - 1)) return;
    unlit.push({ material, base: material.color.clone(), additive: material.blending === AdditiveBlending });
  });
  const tint = new Color();

  // The big things standing behind the play plane: houses, a barn, goals, masts, a diving tower (./buildings.ts).
  const buildings = (storm?.buildings ?? []).map((def) => {
    const made = building(def);
    group.add(made.group);
    return made;
  });

  // The rain barrel under each tap: wooden staves and iron hoops, standing on the ground the tap's block stands on.
  for (const spot of chapter.spots ?? []) if (spot.look === 'tap') group.add(barrel(chapter.ground, spot.at.x, spot.at.y));

  // Cones shaken from the spruces fall where the chapter's drips are: brown and scaled, no splash.
  const coneDrops = storm?.drips === 'cone' ? scene.getObjectByName('rain-drops') as InstancedMesh | undefined : undefined;
  const splashes = ['rain-rings', 'rain-beads'].map((name) => scene.getObjectByName(name)).filter((o): o is Object3D => !!o);
  if (coneDrops) {
    const scales: Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      scales.push(new Vector2(Math.sin(Math.PI * t) * 0.17 * (1 - 0.35 * t) + 0.01, -0.34 + t * 0.7));
    }
    coneDrops.geometry = new LatheGeometry(scales, 9);
    coneDrops.material = solid('#6a4428', 0.9, { flatShading: true });
  }
  // Footballs bowled along by the wind, where the chapter's rollers are: round, and patched.
  const balls = storm?.rollers === 'football' ? scene.getObjectByName('rollers') as InstancedMesh | undefined : undefined;
  if (balls) {
    balls.geometry = footballGeometry().scale(1, 1, 1 / 1.9);
    balls.material = footballMaterial();
  }
  // The bouncers as what they are here: the garden's trampoline, or the striped flap of an awning.
  if (storm?.bouncers) {
    for (const holder of scene.children.filter((child) => child.name === 'bouncer')) {
      holder.clear();
      holder.add(storm.bouncers === 'trampoline' ? trampoline() : storm.bouncers === 'net' ? saggingNet() : awningFlap());
    }
  }

  // A figure seen far out in the lake stands on a stone of its own, dark and wet, the waves round it.
  for (const d of chapter.decor ?? []) {
    if ((d.look !== 'tragubbe' && d.look !== 'lillgubbe') || (d.z ?? 0) > -6) continue;
    const rock = new Mesh(new SphereGeometry(1.4, 12, 8), solid('#3c4048', 0.9, { flatShading: true }));
    rock.scale.set(1.3, 0.55, 1);
    rock.position.set(d.at.x, d.at.y - 0.45, d.z ?? 0);
    group.add(rock);
  }

  // The gusts' shelters as what they are here: upturned flower pots on the lawn, or the jetty's posts.
  // (The boulders they stand in for join the scene after this is built: they are put away on the first frame.)
  const shelterOf = (i: number) => (Array.isArray(storm?.shelters) ? storm.shelters[i] ?? 'stones' : storm?.shelters ?? 'stones');
  for (const [i, gust] of (chapter.gusts ?? []).entries()) {
    const kind = shelterOf(i);
    if (kind !== 'stones') for (const x of gust.shelters) group.add(kind === 'pots' ? flowerPot(x, gust.y) : kind === 'vents' ? roofVent(x, gust.y) : kind === 'rocks' ? boulder(x, gust.y) : jettyPost(x, gust.y));
  }

  // Boulders that are blocks of the ground (landmarks), where no kit of the place draws them: faceted granite in
  // place of the plain box that stands in for them. The forest's kit has its own stones and is left to them.
  if (chapter.place !== 'forest') {
    for (const holder of scene.getObjectsByProperty('name', 'landmark:stone')) {
      const box = holder.children.find((child): child is Mesh => child instanceof Mesh && child.geometry instanceof BoxGeometry);
      if (!box) continue;
      const { width, height } = (box.geometry as BoxGeometry).parameters;
      box.geometry.dispose();
      box.geometry = rock(Math.round(holder.position.x * 10), width / 2 * 1.08, height / 2 * 1.04, 1.8);
      box.material = solid('#8c9096', 0.95, { flatShading: true });
    }
  }

  // Open water past the path: dark, a little glossy, catching the flashes.
  for (const lake of storm?.lakes ?? []) {
    const near = lake.near ?? -4;
    const depth = 120;
    const sheet = new Mesh(new PlaneGeometry(lake.to - lake.from, depth), solid('#1a2a3c', 0.22, { metalness: 0.2 }));
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set((lake.from + lake.to) / 2, lake.y, near - depth / 2);
    sheet.name = 'lake';
    group.add(sheet);
  }

  // Klonk, frozen stiff in Pappa's beam, lying across the gap as a plank.
  const frozenLedge = storm?.frozen ? chapter.ledges?.find((ledge) => ledge.needs === storm.frozen) : undefined;
  let frozenKlonk: Object3D | null = null;
  let crossed = false;
  const planks: Object3D[] = [];
  if (frozenLedge) scene.traverse((object) => { if (object.name.startsWith('ledges:') && object.name.endsWith(':plank')) planks.push(object); });

  // A goal's crossbar as what it is: white, round-cornered steel, joined to the frame that runs back into the picture.
  if (storm?.bars === 'goal') {
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || !/^ledges:\d+$/.test(object.name) || object.userData.rods) return;
      const at = (object.userData.ledges as number[]).map((i) => chapter.ledges![i]!);
      object.geometry.dispose();
      object.geometry = mergeGeometries(at.map((ledge) => box(ledge.width, 0.3, 0.6, ledge.x, ledge.y - 0.15, -0.25, '#f4f4f0')));
      object.geometry.computeBoundingSphere();
    });
  }

  // A rope or Pappa's scarf from above down to his hands, while he rides on it.
  const ropes = (storm?.ropes ?? []).map((def) => {
    const ride = chapter.rides?.find((r) => r.id === def.ride);
    const mesh = new Mesh(new CylinderGeometry(0.09, 0.09, 1, 6).translate(0, 0.5, 0), solid(def.colour ?? '#c8372a', 0.9));
    mesh.visible = false;
    group.add(mesh);
    return { def, ride, mesh };
  });

  let first = true;
  return {
    update({ dt, clock, flags, x, y, camera, still, tier, riding }: ExtraFrame) {
      elof.x = x;
      elof.flags = flags;
      if (first) {
        // A flyby whose moment has passed already (a game taken up later) is not played again.
        for (const f of flybys) if (flags.has(f.def.on)) f.seen = true;
        // The boulders the gusts' shelters stand in for are put away, where something else is drawn: one mesh a gust.
        for (const [i, stone] of scene.getObjectsByProperty('name', 'shelters').entries()) if (shelterOf(i) !== 'stones') stone.visible = false;
        first = false;
      }
      const calmFlag = storm?.calm;
      calm = Math.min(1, Math.max(0, calm + ((calmFlag && flags.has(calmFlag)) ? dt : -dt) / 3));
      if (still && calmFlag && flags.has(calmFlag)) calm = 1;
      const cx = camera.position.x;
      const cy = camera.position.y;

      // The rain falls through its box and starts again at the top; the box goes with the camera.
      const count = rain > 0 ? Math.round(RAIN_FOR[tier] * rain * (1 - calm)) : 0;
      drops.count = count;
      drawnWhile(drops, count > 0);
      if (count > 0) {
        const t = still ? 0 : clock;
        for (let i = 0; i < count; i++) {
          const s = seeds[i]!;
          const fall = (s.y + t * s.speed) % BOX.y;
          const x = ((s.x + fall * SLANT - cx) % BOX.x + BOX.x) % BOX.x;
          place.position.set(cx - BOX.x / 2 + x, cy + BOX.y / 2 - fall, s.z);
          // No rain falls indoors: only out of doors, beyond the house's corner.
          place.scale.setScalar(chapter.outdoors !== undefined && place.position.x < chapter.outdoors ? 0 : 1);
          place.updateMatrix();
          drops.setMatrixAt(i, place.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
        (drops.material as MeshBasicMaterial).opacity = 0.32 * (1 - calm) * (0.6 + 0.4 * rain);
      }

      // Lightning, now and then; and one at every flyby's moment.
      for (const f of flybys) {
        if (!f.seen && flags.has(f.def.on)) {
          f.seen = true;
          f.start = clock;
          flashAt = clock;
          flashBolt = (flashBolt + 1) % bolts.length;
          bolts[flashBolt]!.position.set(cx + (random() - 0.5) * 30, cy + 22, -60);
        }
      }
      if (!still && storm?.lightning && calm === 0 && clock >= nextFlash) {
        flashAt = clock;
        flashBolt = (flashBolt + 1) % bolts.length;
        nextFlash = clock + storm.lightning * (0.6 + 0.8 * random());
        bolts[flashBolt]!.position.set(cx + (random() - 0.5) * 30, cy + 22, -60);
      }
      const flash = still ? 0 : flashOf(clock - flashAt) * (1 - calm);
      bolts.forEach((b, i) => { (b.material as MeshBasicMaterial).opacity = i === flashBolt ? flash * 0.9 : 0; drawnWhile(b, i === flashBolt && flash > 0.01); });
      const baseHemisphere = chapter.night ? hemisphere.intensity : base.hemisphere;
      const baseSun = chapter.night ? sun.intensity : base.sun;
      hemisphere.intensity = baseHemisphere * (1 + 1.1 * flash + 0.25 * calm);
      sun.intensity = baseSun * (1 + 0.8 * flash + 0.3 * calm);
      if (dim !== undefined) scene.backgroundIntensity = Math.min(1, dim + 0.14 * calm + 0.6 * flash);
      for (const pane of panes) pane.color.setScalar(1 + 1.6 * flash);
      tint.copy(night).lerp(eyeTint, storm?.calm ? calm : 0).multiplyScalar(1 + 1.3 * flash);
      for (const u of unlit) u.material.color.copy(u.base).multiply(tint).multiplyScalar(u.additive ? 0.25 : 1);

      for (const f of flybys) {
        const k = f.start < 0 ? 1 : (clock - f.start) / f.def.seconds;
        f.figure.visible = k < 1 && f.start >= 0;
        if (!f.figure.visible) continue;
        const e = smooth(k);
        // On the water a figure floats, bobbing along; in the air it tumbles across the sky.
        const floating = Math.max(f.def.from.y, f.def.to.y) < 1.5;
        const lift = floating ? 0.12 * Math.sin(clock * 3) : Math.sin(Math.PI * k) * 2.2;
        f.figure.position.set(f.def.from.x + (f.def.to.x - f.def.from.x) * e, f.def.from.y + (f.def.to.y - f.def.from.y) * e + lift, -4);
        f.figure.rotation.z = still ? (floating ? 0 : 0.4) : floating ? Math.sin(clock * 2.2) * 0.25 : -k * 9;
      }
      for (const g of glows) {
        const lit = g.def.after === undefined || flags.has(g.def.after);
        g.light.visible = lit;
        (g.light.material as MeshBasicMaterial).opacity = still ? 0.8 : 0.72 + 0.12 * Math.sin(clock * 9 + g.phase) * Math.sin(clock * 3.1 + g.phase);
      }
      if (coneDrops) for (const splash of splashes) splash.visible = false;
      if (frozenLedge && storm?.frozen) {
        // Once he is over, Pappa looks away and Klonk is himself again, on the far side.
        if (flags.has(storm.frozen) && x > frozenLedge.x + frozenLedge.width / 2 + 0.8) crossed = true;
        const lying = flags.has(storm.frozen) && !crossed;
        if (lying && !frozenKlonk) {
          const ghost = scene.getObjectByName('chase-ghost')?.children[0];
          if (ghost) {
            frozenKlonk = ghost.clone();
            const length = Math.max(1, frozenLedge.width / 1.15);
            frozenKlonk.scale.set(1, length, 1);
            frozenKlonk.rotation.set(0, 0, -Math.PI / 2);
            frozenKlonk.position.set(frozenLedge.x - frozenLedge.width / 2, frozenLedge.y + 0.02, 0.05);
            scene.add(frozenKlonk);
          }
        }
        if (frozenKlonk) {
          frozenKlonk.visible = lying;
          const ghostPlace = scene.getObjectByName('chase-ghost');
          if (ghostPlace && lying) ghostPlace.visible = false;
          // The plank the simulation stands him on is Klonk: its own picture is not drawn.
          for (const plank of planks) plank.visible = !lying && plank.visible;
        }
      }
      for (const b of buildings) {
        if (!b.panes) continue;
        const lit = b.def.lit !== undefined && (b.def.lit === '' || flags.has(b.def.lit));
        b.panes.color.copy(lit ? PANE.lit : PANE.dark);
        if (lit && !still) b.panes.color.multiplyScalar(0.92 + 0.08 * Math.sin(clock * 2.1 + b.def.x));
      }
      for (const rope of ropes) {
        const on = riding && !!rope.ride && x >= Math.min(rope.ride.from.x, rope.ride.to.x) - 0.3 && x <= Math.max(rope.ride.from.x, rope.ride.to.x) + 0.3;
        rope.mesh.visible = on;
        if (!on) continue;
        // From where it is held to his raised hands.
        const hx = x, hy = y + 1.05, hz = 0.1, fz = rope.def.z ?? -1;
        const dx = rope.def.from.x - hx, dy = rope.def.from.y - hy, dz = fz - hz;
        const length = Math.hypot(dx, dy, dz);
        rope.mesh.position.set(hx, hy, hz);
        rope.mesh.scale.set(1, length, 1);
        rope.mesh.quaternion.setFromUnitVectors(UP, tmp.set(dx, dy, dz).normalize());
      }
      starMaterial.opacity = calm;
      drawnWhile(starField, calm > 0);
      starField.position.x = cx * 0.85;
      moon.position.set(cx * 0.92 + 26, cy + 18, -110);
      (moon.children[0] as Mesh<SphereGeometry, MeshBasicMaterial>).material.opacity = calm;
      (moon.children[1] as Mesh<PlaneGeometry, MeshBasicMaterial>).material.opacity = calm * 0.5;
      drawnWhile(moon, calm > 0);
    },
  };
}

/**
 * A wooden rain barrel whose lid is the flat top of ground at `top` round `x`: as wide as that top, and down to the
 * lowest ground at its two sides.
 */
function barrel(ground: readonly { x: number; y: number }[], x: number, top: number): Group {
  const group = new Group();
  let from = x;
  let to = x;
  let base = top;
  for (let i = 0; i < ground.length - 1; i++) {
    const a = ground[i]!;
    const b = ground[i + 1]!;
    if (Math.abs(a.y - top) < 0.05 && Math.abs(b.y - top) < 0.05 && x >= Math.min(a.x, b.x) - 0.6 && x <= Math.max(a.x, b.x) + 0.6) {
      from = Math.min(a.x, b.x);
      to = Math.max(a.x, b.x);
      base = Math.min(ground[i - 1]?.y ?? top, ground[i + 2]?.y ?? top);
    }
  }
  const radius = Math.max(0.6, (to - from) / 2);
  const tall = Math.max(0.5, top - base);
  const staves = new Mesh(new CylinderGeometry(radius * 1.02, radius * 0.96, tall, 22, 1, true), solid('#7a5634', 0.85, { side: DoubleSide }));
  staves.position.set((from + to) / 2, base + tall / 2, -0.4);
  group.add(staves);
  for (const k of [0.12, 0.5, 0.88]) {
    const hoop = new Mesh(new TorusGeometry(radius * 1.04, 0.05, 6, 28), solid('#3a3a3c', 0.5, { metalness: 0.5 }));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set((from + to) / 2, base + tall * k, -0.4);
    group.add(hoop);
  }
  // Rain water to its brim, dark and moving.
  const water = new Mesh(new CylinderGeometry(radius * 0.95, radius * 0.95, 0.04, 22), solid('#2a3e58', 0.15));
  water.position.set((from + to) / 2, top - 0.06, -0.4);
  group.add(water);
  return group;
}

/** An upturned terracotta flower pot, a shelter from the wind as tall as two of him. */
function flowerPot(x: number, y: number): Group {
  const group = new Group();
  const clay = solid('#b65f3a', 0.8);
  const pot = new Mesh(new CylinderGeometry(0.62, 0.92, 1.7, 20), clay);
  pot.position.y = 0.85;
  const rim = new Mesh(new CylinderGeometry(1.0, 1.0, 0.28, 20), clay);
  rim.position.y = 0.14;
  group.add(pot, rim);
  group.position.set(x, y, -1.3);
  return group;
}

/** A boulder of the hillside, granite grey and faceted, as big as the lumps it stands in for. */
function boulder(x: number, y: number): Mesh {
  const stone = new Mesh(rock(Math.round(x * 10), 1.0, 1.2, 0.85), solid('#8c9096', 0.95, { flatShading: true }));
  stone.position.set(x, y + 0.7, -1.3);
  return stone;
}

/** A barn roof's ventilation hood: a little red-painted wooden box with its own pointed roof, standing on the ridge. */
function roofVent(x: number, y: number): Group {
  const group = new Group();
  const box = new Mesh(new BoxGeometry(1.1, 1.9, 1.1), solid('#8a2c22', 0.9));
  box.position.y = 0.95;
  const slats = new Mesh(new BoxGeometry(1.14, 0.7, 1.14), solid('#2a1c18', 0.9));
  slats.position.y = 1.35;
  const cap = new Mesh(new ConeGeometry(0.95, 0.7, 4), solid('#5a5c60', 0.6, { metalness: 0.3 }));
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 2.25;
  group.add(box, slats, cap);
  group.position.set(x, y, -1.2);
  return group;
}

/** A jetty's post, dark and wet, standing up out of the boards: a shelter from the waves' spray. */
function jettyPost(x: number, y: number): Group {
  const group = new Group();
  const post = new Mesh(new CylinderGeometry(0.42, 0.48, 3.2, 12), solid('#7a6450', 0.85));
  post.position.y = 1.2;
  const cap = new Mesh(new CylinderGeometry(0.46, 0.46, 0.12, 12), solid('#9a8670', 0.8));
  cap.position.y = 2.86;
  group.add(post, cap);
  group.position.set(x, y, -1.1);
  return group;
}

/** The garden's trampoline, as big as a table to him: a dark round mat on a green frame, its top at the bouncer's. */
function trampoline(): Group {
  const group = new Group();
  const mat = new Mesh(new CylinderGeometry(1.5, 1.5, 0.06, 28), solid('#1e2226', 0.7));
  mat.position.y = 0.5;
  const rim = new Mesh(new TorusGeometry(1.6, 0.12, 8, 30), solid('#3c7a52', 0.6));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.52;
  group.add(mat, rim);
  for (const a of [0.4, 2.0, 3.6, 5.2]) {
    const leg = new Mesh(new CylinderGeometry(0.05, 0.05, 1.4, 6), solid('#2c5a3c', 0.6));
    leg.position.set(Math.cos(a) * 1.55, -0.2, Math.sin(a) * 1.55 - 0.3);
    group.add(leg);
  }
  group.position.z = -0.3;
  return group;
}

/**
 * A volleyball net torn loose and sagging low between its two posts: a white top band dipping to the
 * bouncer's top in the middle, the mesh hanging under it. He lands in the dip.
 */
function saggingNet(): Group {
  const group = new Group();
  const white = solid('#f2f2ee', 0.7);
  const mesh = solid('#d4d6d2', 0.8);
  const sag = (x: number) => 0.5 + 1.6 * (x / 2.4) ** 2;
  const points = Array.from({ length: 13 }, (_, i) => new Vector3(-2.4 + (i / 12) * 4.8, sag(-2.4 + (i / 12) * 4.8), 0));
  const band = new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 24, 0.07, 6), white);
  group.add(band);
  for (let i = 0; i <= 12; i++) {
    const x = -2.1 + i * 0.35;
    const strand = new Mesh(new BoxGeometry(0.025, 0.42, 0.025), mesh);
    strand.position.set(x, sag(x) - 0.22, 0);
    group.add(strand);
  }
  for (const k of [1, 2]) {
    const lower = points.map((p) => new Vector3(p.x, p.y - k * 0.18, 0));
    group.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(lower), 24, 0.02, 4), mesh));
  }
  for (const x of [-2.5, 2.5]) {
    const post = new Mesh(new CylinderGeometry(0.06, 0.07, 2.4, 8), solid('#c8ccce', 0.5, { metalness: 0.4 }));
    post.position.set(x, 1.2, 0);
    group.add(post);
  }
  group.position.z = -0.2;
  return group;
}

/** An awning's loose flap: striped cloth, sagging, its top at the bouncer's. */
function awningFlap(): Group {
  const group = new Group();
  for (let i = 0; i < 6; i++) {
    const stripe = new Mesh(new BoxGeometry(0.3, 0.08, 1.4), solid(i % 2 ? '#f1ece2' : '#2f6a8a', 0.8));
    stripe.position.set(-0.75 + i * 0.3, 0.46 - Math.sin((i / 5) * Math.PI) * 0.06, 0);
    group.add(stripe);
  }
  return group;
}

// --- the figures ---------------------------------------------------------------------------------------------

/** Pappa's very first trägubbe: grey old wood, a pointed cap, a crooked smile and the crowberry eyes Elof gave it. */
function oldFigure(silhouette = false): Group {
  const group = new Group();
  const wood = silhouette ? solid('#3a3a40', 1, { emissive: '#30384c', emissiveIntensity: 0.6 }) : solid('#8f8c7e', 1);
  const dark = solid('#2a2622', 0.9);
  const body = new Mesh(new CylinderGeometry(0.13, 0.2, 0.48, 8), wood);
  body.position.set(0, 0.24, 0);
  body.rotation.z = -0.08;
  const cap = new Mesh(new ConeGeometry(0.17, 0.34, 7), wood);
  cap.position.set(0.02, 0.84, 0);
  cap.rotation.z = -0.1;
  const smile = new Mesh(new TorusGeometry(0.055, 0.009, 5, 12, Math.PI), dark);
  smile.position.set(0, 0.57, 0.146);
  smile.rotation.z = Math.PI;
  group.add(body, ball(0.16, wood, 0.015, 0.58), cap, smile, ball(0.06, solid('#6f8a45', 1), -0.13, 0.38, 0.08, [1, 0.5, 1]));
  // The crowberry eyes: dark, a little shiny.
  for (const x of [-0.06, 0.06]) group.add(ball(0.026, solid('#1a1530', 0.3), x, 0.62, 0.148));
  group.name = 'old-trägubbe';
  return group;
}

/** Elof's own first carving: pale linden, round and small, with the two eyes he painted. Its cap is lost in the storm. */
function littleFigure(silhouette = false): Group {
  const group = new Group();
  const wood = silhouette ? solid('#4a4640', 1, { emissive: '#3a4260', emissiveIntensity: 0.7 }) : solid('#e6cfa2', 0.9);
  const dark = solid('#2c2420', 0.6);
  const body = new Mesh(new CylinderGeometry(0.1, 0.14, 0.3, 9), wood);
  body.position.y = 0.15;
  group.add(body, ball(0.12, wood, 0, 0.4));
  for (const x of [-0.045, 0.045]) group.add(ball(0.02, dark, x, 0.42, 0.11));
  // The knife's marks: three facets, a little crooked, as a first carving's are.
  for (const [y, turn] of [[0.08, 0.3], [0.2, -0.4]] as const) {
    const cut = new Mesh(new BoxGeometry(0.2, 0.012, 0.012), solid('#c9b07e', 1));
    cut.position.set(0, y, 0.135);
    cut.rotation.z = turn;
    group.add(cut);
  }
  group.name = 'little-trägubbe';
  return group;
}

/** A thing that stands about: it shrinks away when its flag says it is gone, and may move a little while it is there. */
function standing(spot: Spot, group: Group, alive?: (clock: number) => void): SpotProp {
  const root = new Group();
  root.position.set(spot.at.x, spot.at.y, -0.6);
  root.add(group);
  let since = 0;
  return {
    group: root,
    update(used, clock, dt) {
      since = used ? since + dt : 0;
      const size = Math.max(0, 1 - since / 0.4);
      root.scale.setScalar(size);
      drawnWhile(root, size > 0);
      alive?.(clock);
    },
  };
}

// --- the things of the story -----------------------------------------------------------------------------------

/** A football's skin: white, with the dark patches where an icosahedron's corners are. Radius 1, at the origin. */
function footballGeometry(): BufferGeometry {
  const geometry = new SphereGeometry(1, 28, 18);
  const t = (1 + Math.sqrt(5)) / 2;
  const corners = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(([x, y, z]) => { const l = Math.hypot(x!, y!, z!); return [x! / l, y! / l, z! / l] as const; });
  const at = geometry.getAttribute('position');
  const colours: number[] = [];
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    const near = Math.max(...corners.map(([cx, cy, cz]) => x * cx + y * cy + z * cz));
    const dark = near > 0.94;
    colours.push(...(dark ? [0.08, 0.08, 0.09] : [0.95, 0.95, 0.93]));
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}
const footballMaterial = () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
function football(radius: number): Mesh {
  const ball = new Mesh(footballGeometry(), footballMaterial());
  ball.scale.setScalar(radius);
  ball.position.y = radius;
  return ball;
}

/** Which pack and file each model is in. What is mormor and morfar's own is in the private pack, and is only there on the site. */
const FILES: Record<string, readonly [pack: string, file: string]> = {
  'olympia-hall': ['aventyr2', 'olympia'],
  'olympia-stand': ['aventyr2', 'olympia'],
  'billsta-house': ['private', 'billsta-house'],
  'billsta-barn': ['private', 'billsta-house'],
};

/**
 * The buildings that are made in Blender: each takes the place of its stand-in once the pack has loaded, so that the
 * picture is never empty. A stand-in stays where the file is missing.
 */
async function installModels(assets: Assets, scene: Object3D): Promise<boolean> {
  const wanted: Object3D[] = [];
  scene.traverse((object) => { if (typeof object.userData.model === 'string') wanted.push(object); });
  if (wanted.length === 0) return false;
  const manifest = await assets.manifest();
  const files = new Map<string, Promise<Group>>();
  let arrived = false;
  for (const place of wanted) {
    const name = place.userData.model as string;
    const [pack, file] = FILES[name] ?? [];
    if (!pack || !file || !manifest.packs[pack]?.files[`${file}.glb`]) continue;
    if (!files.has(file)) files.set(file, assets.model(pack, file));
    const model = await files.get(file)!;
    const made = model.getObjectByName(name);
    if (!made) continue;
    arrived = true;
    place.clear();
    // Packed models keep their own scale and offset, so the placing stays on the group round it.
    place.add(made);
    // A name on a wall is kept white: it stands in the shade at night, and still has to be read.
    const sign = model.getObjectByName(`${name}-name`) as Mesh | undefined;
    if (sign) {
      sign.material = new MeshBasicMaterial({ color: '#e8ecec' });
      place.add(sign);
    }
    // Windows with the lamps on: warm and unlit, whatever the storm does.
    const lit = model.getObjectByName(`${name}-glow`) as Mesh | undefined;
    if (lit) {
      lit.material = new MeshBasicMaterial({ color: '#ffc870', fog: false });
      place.add(lit);
    }
  }
  return arrived;
}

/** Mormor's lantern, whose light falls where he walks: it hangs from its top, and its glow goes with it. */
function lantern(): { group: Group; light: Mesh } {
  const group = new Group();
  const body = new Mesh(new CylinderGeometry(0.2, 0.24, 0.52, 8), new MeshBasicMaterial({ color: '#ffd27a' }));
  body.position.y = -0.46;
  const roof = new Mesh(new CylinderGeometry(0.1, 0.3, 0.16, 8), solid('#2a2a2a', 0.5));
  roof.position.y = -0.14;
  const floor = new Mesh(new CylinderGeometry(0.27, 0.27, 0.06, 8), solid('#2a2a2a', 0.5));
  floor.position.y = -0.74;
  const light = glow('#ffc070', 6, 0.6);
  light.position.y = -0.46;
  group.add(body, roof, floor, light);
  return { group, light };
}

/** Mormor or Morfar in the picture: no longer a thing he uses up, so they stay when he calls. */
function figure(spot: Spot, who: Grandparent, lit = who === 'mormor'): SpotProp {
  const carried = lit ? lantern() : null;
  const made = createGrandparent(who, carried?.group ?? null, spot.id.startsWith('decor:'));
  made.group.position.set(spot.at.x, spot.at.y, -0.6);
  return {
    group: made.group,
    update(used, clock, dt) {
      made.update(used, clock, dt, elof.x, elof.flags?.has(LADDER_LAID));
      if (carried) (carried.light.material as MeshBasicMaterial).opacity = 0.55 + 0.08 * Math.sin(clock * 6.3);
    },
  };
}

/** A carved pumpkin lantern, as tall as two of him, its face lit from inside by a candle. */
function pumpkin(): { group: Group; light: Mesh; face: MeshBasicMaterial } {
  const group = new Group();
  const ribs: Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    ribs.push(new Vector2(Math.sin(a) * 1.4, 1.1 - Math.cos(a) * 1.1));
  }
  const skin = new LatheGeometry(ribs, 28);
  const at = skin.getAttribute('position');
  // Its ribs: the skin goes in and out round it.
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i);
    const z = at.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.07 * Math.abs(Math.cos(a * 5));
    at.setXYZ(i, x * k, at.getY(i), z * k);
  }
  skin.computeVertexNormals();
  group.add(new Mesh(skin, solid('#d8701e', 0.55)));
  const stem = new Mesh(new CylinderGeometry(0.09, 0.14, 0.4, 7), solid('#5a5a2a', 0.9));
  stem.position.y = 2.3;
  stem.rotation.z = 0.25;
  group.add(stem);
  // The face: two triangle eyes and a toothy grin, glowing.
  const face = new MeshBasicMaterial({ color: '#ffcf5a', fog: false });
  const triangle = (size: number) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([-size, -size * 0.6, 0, size, -size * 0.6, 0, 0, size * 0.8, 0], 3));
    return g;
  };
  for (const x of [-0.5, 0.5]) {
    const eye = new Mesh(triangle(0.22), face);
    eye.position.set(x, 1.35, 1.36);
    group.add(eye);
  }
  const grin = new Mesh(new PlaneGeometry(1.1, 0.22), face);
  grin.position.set(0, 0.8, 1.38);
  group.add(grin);
  for (const x of [-0.3, 0.1, 0.4]) {
    const tooth = new Mesh(new BoxGeometry(0.14, 0.12, 0.02), solid('#d8701e', 0.55));
    tooth.position.set(x, 0.86, 1.4);
    group.add(tooth);
  }
  const light = glow('#ffb04a', 5.5, 0.55);
  light.position.set(0, 1.1, 1.6);
  group.add(light);
  return { group, light, face };
}

/** The owl, tawny and round, with big dark eyes in a pale face. */
function owl(flying = false): Group {
  const group = new Group();
  const brown = solid('#7a5638', 0.9);
  const pale = solid('#c8a67a', 0.9);
  const dark = solid('#1a120c', 0.4);
  if (!flying) {
    group.add(ball(0.9, brown, 0, 1.1, 0, [1, 1.25, 0.9]));
    group.add(ball(0.62, brown, 0, 2.15, 0));
    group.add(ball(0.5, pale, 0, 2.15, 0.28, [1, 0.95, 0.6]));
    for (const x of [-0.22, 0.22]) group.add(ball(0.16, solid('#e0a040', 0.3), x, 2.22, 0.55), ball(0.1, dark, x, 2.22, 0.66));
    const beak = new Mesh(new ConeGeometry(0.07, 0.2, 6), solid('#c8b080', 0.6));
    beak.position.set(0, 2.0, 0.66);
    beak.rotation.x = Math.PI;
    group.add(beak);
    for (const side of [-1, 1]) group.add(ball(0.5, solid('#6a4a30', 0.9), side * 0.72, 1.2, -0.05, [0.4, 1.1, 0.8]));
    for (const x of [-0.25, 0.25]) group.add(ball(0.12, solid('#b8a070', 0.8), x, 0.12, 0.2, [1, 0.5, 1.2]));
    group.name = 'owl';
    return group;
  }
  // In flight, under him: the body level, the face forwards, the wings out to the sides.
  group.add(ball(0.75, brown, 0, -0.7, 0, [1.4, 0.75, 0.9]));
  group.add(ball(0.5, brown, 1.0, -0.55, 0));
  group.add(ball(0.4, pale, 1.25, -0.55, 0, [0.6, 0.95, 0.95]));
  for (const z of [-0.18, 0.18]) group.add(ball(0.12, solid('#e0a040', 0.3), 1.45, -0.48, z), ball(0.07, dark, 1.53, -0.48, z));
  for (const side of [-1, 1]) {
    const wing = new Mesh(new BoxGeometry(1.1, 0.06, 2.2), solid('#6a4a30', 0.9));
    wing.geometry.translate(0, 0, 1.1);
    wing.position.set(0, -0.55, side * 0.3);
    wing.scale.z = side;
    wing.name = side > 0 ? 'wingNear' : 'wingFar';
    group.add(wing);
  }
  return group;
}

/** Bertil's rubber boot, lying on the water as a boat: its toe the bow, its open leg where Elof sits. */
function boot(): Group {
  const group = new Group();
  const rubber = solid('#2f6b3a', 0.45);
  const sole = solid('#2a2420', 0.8);
  const foot = new Mesh(new CylinderGeometry(0.55, 0.6, 1.9, 16), rubber);
  foot.rotation.z = Math.PI / 2;
  foot.position.set(0.5, -0.2, 0);
  const toe = ball(0.58, rubber, 1.45, -0.22, 0, [0.9, 0.95, 1]);
  const leg = new Mesh(new CylinderGeometry(0.62, 0.6, 1.0, 18, 1, true), rubber);
  leg.position.set(-0.5, 0.05, 0);
  (leg.material as MeshStandardMaterial).side = DoubleSide;
  const keel = new Mesh(new BoxGeometry(2.8, 0.16, 0.9), sole);
  keel.position.set(0.35, -0.78, 0);
  const rim = new Mesh(new TorusGeometry(0.61, 0.05, 6, 22), solid('#e6c34a', 0.5));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-0.5, 0.55, 0);
  group.add(foot, toe, leg, keel, rim);
  group.position.y = -0.1;
  return group;
}

/** Moa's umbrella, open over him: denim blue with pale spots, its handle down to his hands. */
function umbrella(): Group {
  const group = new Group();
  const canopy = new Mesh(new SphereGeometry(1.5, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), solid('#5b7fb5', 0.6, { side: DoubleSide }));
  canopy.position.y = 2.1;
  canopy.scale.y = 0.7;
  group.add(canopy);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    group.add(ball(0.13, solid('#f1ece2', 0.6), Math.cos(a) * 0.95, 2.55, Math.sin(a) * 0.95, [1, 0.35, 1]));
  }
  const shaft = new Mesh(new CylinderGeometry(0.035, 0.035, 1.5, 6), solid('#3a3a3a', 0.4));
  shaft.position.y = 1.55;
  const hook = new Mesh(new TorusGeometry(0.14, 0.035, 6, 12, Math.PI), solid('#8a5a32', 0.6));
  hook.position.set(0.14, 0.82, 0);
  hook.rotation.z = Math.PI;
  group.add(shaft, hook);
  return group;
}

function spotLooks(): Record<string, (spot: Spot) => SpotProp | null> {
  return {
    tragubbe: (spot) => standing(spot, oldFigure()),
    lillgubbe: (spot) => {
      const figure = littleFigure();
      return standing(spot, figure, (clock) => { figure.rotation.z = Math.sin(clock * 5.3) * 0.03; });
    },
    pumpkin: (spot) => {
      const { group, light, face } = pumpkin();
      return standing(spot, group, (clock) => {
        const flicker = 0.85 + 0.15 * Math.sin(clock * 11) * Math.sin(clock * 4.3 + 1);
        (light.material as MeshBasicMaterial).opacity = 0.5 * flicker;
        face.color.setRGB(1, 0.78 * flicker + 0.1, 0.32 * flicker);
      });
    },
    owl: (spot) => {
      const bird = owl();
      return standing(spot, bird, (clock) => { bird.rotation.y = Math.sin(clock * 0.7) * 0.25; });
    },
    tap: (spot) => {
      // The rain barrel's brass tap, and the water that pours from it once it is turned.
      const group = new Group();
      const brass = solid('#b8902e', 0.35, { metalness: 0.6 });
      const pipe = new Mesh(new CylinderGeometry(0.09, 0.09, 0.7, 10), brass);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, 0.5, 0.25);
      const spout = new Mesh(new CylinderGeometry(0.07, 0.08, 0.35, 10), brass);
      spout.position.set(0, 0.3, 0.6);
      const handle = new Group();
      for (const turn of [0, Math.PI / 2]) {
        const bar = new Mesh(new BoxGeometry(0.5, 0.06, 0.06), brass);
        bar.rotation.y = turn;
        handle.add(bar);
      }
      handle.position.set(0, 0.68, 0.45);
      const water = new Mesh(new CylinderGeometry(0.05, 0.09, 1, 8, 1, true), new MeshBasicMaterial({ color: '#a8c8ff', transparent: true, opacity: 0.6, depthWrite: false }));
      water.position.set(0, -0.3, 0.6);
      water.visible = false;
      group.add(pipe, spout, handle, water);
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -0.6);
      root.add(group);
      let turned = 0;
      return {
        group: root,
        update(used, clock, dt) {
          turned = used ? Math.min(1, turned + dt * 2) : 0;
          handle.rotation.z = turned * Math.PI * 0.75;
          water.visible = turned > 0.6;
          water.scale.x = 1 + 0.15 * Math.sin(clock * 20);
        },
      };
    },
    candle: (spot) => {
      const group = new Group();
      const wax = new Mesh(new CylinderGeometry(0.09, 0.1, 0.42, 10), solid('#f4ecd8', 0.7));
      wax.position.y = 0.21;
      const flame = ball(0.05, new MeshBasicMaterial({ color: '#ffd27a' }), 0, 0.5, 0, [0.7, 1.4, 0.7]);
      const light = glow('#ffc070', 1.1, 0.7);
      light.position.y = 0.5;
      group.add(wax, flame, light);
      return standing(spot, group, (clock) => { flame.scale.y = 1.4 + 0.2 * Math.sin(clock * 13); });
    },
    flashlight: (spot) => {
      const group = new Group();
      const body = new Mesh(new CylinderGeometry(0.09, 0.09, 0.6, 10), solid('#c8372a', 0.5));
      body.rotation.z = Math.PI / 2;
      const head = new Mesh(new CylinderGeometry(0.15, 0.1, 0.18, 12), solid('#2a2a2a', 0.4));
      head.rotation.z = Math.PI / 2;
      head.position.x = 0.38;
      const beam = new Mesh(new ConeGeometry(1.2, 5, 18, 1, true), new MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }));
      beam.rotation.z = Math.PI / 2;
      beam.position.x = 2.9;
      const light = glow('#fff0c0', 1.2, 0.9);
      light.position.x = 0.48;
      group.add(body, head, beam, light);
      return standing(spot, group);
    },
    'tiny-cap': (spot) => {
      // Fjun's cap, lost in the gutter: a little knitted red cone with a white bobble.
      const group = new Group();
      const cap = new Mesh(new ConeGeometry(0.16, 0.3, 10), solid('#c23a2e', 0.9));
      cap.rotation.z = 1.2;
      cap.position.y = 0.1;
      group.add(cap, ball(0.06, solid('#f4efe4', 0.9), 0.17, 0.2, 0));
      return standing(spot, group, (clock) => { group.position.y = 0.04 * Math.sin(clock * 3); });
    },
    latch: (spot) => {
      const group = new Group();
      const brass = solid('#c8a040', 0.35, { metalness: 0.6 });
      const hook = new Mesh(new TorusGeometry(0.16, 0.03, 6, 14, Math.PI * 1.4), brass);
      const eye = new Mesh(new TorusGeometry(0.06, 0.02, 6, 10), brass);
      eye.position.set(0.3, 0, 0);
      group.add(hook, eye);
      return standing(spot, group);
    },
    football: (spot) => standing(spot, (() => { const g = new Group(); g.add(football(0.75)); return g; })()),
    target: (spot) => {
      // A biathlon target on its stand: a black disc on a white plate, white too once it is hit. It stays.
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -1.2);
      const stand = new Mesh(new BoxGeometry(0.16, 2.2, 0.16), solid('#5a5a5e', 0.7));
      stand.position.y = 1.1;
      const plate = new Mesh(new BoxGeometry(1.1, 1.1, 0.08), solid('#e8e8e2', 0.7));
      plate.position.y = 2.6;
      const disc = new Mesh(new CylinderGeometry(0.38, 0.38, 0.06, 20), solid('#141414', 0.6));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 2.6, 0.06);
      root.add(stand, plate, disc);
      const black = new Color('#141414');
      const white = new Color('#f2f2ee');
      return { group: root, update(used) { (disc.material as MeshStandardMaterial).color.copy(used ? white : black); } };
    },
    lifebuoy: (spot) => {
      // A life ring on its post: red and white, its rope coiled.
      const group = new Group();
      const pole = new Mesh(new CylinderGeometry(0.12, 0.12, 6, 8), solid('#e6e2d8', 0.7));
      pole.position.y = 3;
      const ring = new Group();
      for (let i = 0; i < 8; i++) {
        const piece = new Mesh(new TorusGeometry(1, 0.28, 8, 6, Math.PI / 4), solid(i % 2 ? '#f2f0ea' : '#d8352a', 0.5));
        piece.rotation.z = (i * Math.PI) / 4;
        ring.add(piece);
      }
      ring.position.set(0, 4.6, 0.3);
      group.add(pole, ring);
      return standing(spot, group, (clock) => { ring.rotation.z = Math.sin(clock * 1.7) * 0.12; });
    },
    flag: (spot) => {
      // A corner flag, snapping in the storm.
      const group = new Group();
      const pole = new Mesh(new CylinderGeometry(0.1, 0.1, 10, 6), solid('#f2e64a', 0.6));
      pole.position.y = 5;
      const cloth = new Mesh(new PlaneGeometry(3, 2, 6, 1), solid('#d83a2a', 0.8, { side: DoubleSide }));
      cloth.geometry.translate(1.5, 0, 0);
      cloth.position.y = 9;
      group.add(pole, cloth);
      const base = cloth.geometry.getAttribute('position').array.slice();
      return standing(spot, group, (clock) => {
        const at = cloth.geometry.getAttribute('position');
        for (let i = 0; i < at.count; i++) at.setZ(i, Math.sin(clock * 9 + base[i * 3]! * 2) * 0.35 * (base[i * 3]! / 3));
        at.needsUpdate = true;
      });
    },
    lantern: (spot) => {
      const group = new Group();
      group.add(new Mesh(new CylinderGeometry(0.35, 0.4, 0.9, 8), new MeshBasicMaterial({ color: '#ffd27a' })));
      const light = glow('#ffc070', 5, 0.7);
      group.add(light);
      group.position.y = 0.45;
      return standing(spot, group, (clock) => { (light.material as MeshBasicMaterial).opacity = 0.6 + 0.1 * Math.sin(clock * 7); });
    },
    mormor: (spot) => figure(spot, 'mormor'),
    morfar: (spot) => figure(spot, 'morfar'),
    // At home in the morning her lantern has been put out.
    mormorHome: (spot) => figure(spot, 'mormor', false),
    reed: (spot) => {
      // Reeds standing out of the shallows: tall stems with brown seed heads, bending in the wind.
      const group = new Group();
      const stems: Group[] = [];
      for (let i = 0; i < 4; i++) {
        const stem = new Group();
        const tall = 3 + (i % 3) * 0.6;
        const shaft = new Mesh(new CylinderGeometry(0.03, 0.05, tall, 5), solid('#7a8a48', 0.9));
        shaft.position.y = tall / 2;
        const head = new Mesh(new CylinderGeometry(0.09, 0.09, 0.5, 7), solid('#5a3a22', 1));
        head.position.y = tall + 0.1;
        stem.add(shaft, head);
        stem.position.set((i - 1.5) * 0.35, 0, (i % 2) * 0.3);
        stems.push(stem);
        group.add(stem);
      }
      return standing(spot, group, (clock) => { for (const [i, stem] of stems.entries()) stem.rotation.z = -0.12 + 0.08 * Math.sin(clock * 1.6 + i); });
    },
  };
}

function rideLooks(): Record<string, (look: RideLook) => Object3D | null> {
  return {
    boot: () => boot(), umbrella: () => umbrella(), owl: () => owl(true),
    // The ball Bertil kicks, under his feet as it flies.
    football: () => { const g = new Group(); const b = football(0.8); b.position.y = -1.55; g.add(b); return g; },
    raft: () => { const g = new Group(); g.add(raft(3.2, 0.5)); g.children[0]!.position.y = -0.5; return g; },
  };
}

/** A raft of logs lashed together, with its top at `h`, `w` long. */
function raft(w: number, h: number): Group {
  const group = new Group();
  const logs = Math.max(3, Math.round(1.6 / 0.32));
  for (let i = 0; i < logs; i++) {
    const log = new Mesh(new CylinderGeometry(h / 2, h / 2, w, 8), solid(i % 2 ? '#7a5a3c' : '#6a4c32', 0.9));
    log.rotation.z = Math.PI / 2;
    log.position.set(0, h / 2, -0.8 + i * (1.6 / (logs - 1)));
    group.add(log);
  }
  for (const x of [-w * 0.35, w * 0.35]) {
    const rope = new Mesh(new BoxGeometry(0.12, h + 0.05, 1.8), solid('#c8b080', 0.9));
    rope.position.set(x, h / 2, 0);
    group.add(rope);
  }
  return group;
}

function moverLooks(): Record<string, (mover: Mover) => Group | null> {
  return {
    lid: (mover) => {
      // The rain barrel's round wooden lid, floating: boards across it, and a handle.
      const group = new Group();
      const lid = new Mesh(new CylinderGeometry(mover.width / 2, mover.width / 2, mover.height, 24), solid('#8a6a44', 0.85));
      lid.position.y = mover.height / 2;
      group.add(lid);
      for (const x of [-0.25, 0.25]) {
        const seam = new Mesh(new BoxGeometry(0.03, mover.height * 1.02, mover.width * 0.9), solid('#5a4428', 0.9));
        seam.position.set(x * mover.width, mover.height / 2, 0);
        group.add(seam);
      }
      return group;
    },
    bark: (mover) => {
      const group = new Group();
      // Pine bark, grey-brown and furrowed: pale enough to be told in the storm's dark.
      const slab = new Mesh(new BoxGeometry(mover.width, mover.height, 1.2, 6, 2, 3), solid('#9a7656', 1, { flatShading: true, emissive: '#3a2614', emissiveIntensity: 0.5 }));
      const at = slab.geometry.getAttribute('position');
      const r = scatter(Math.round(mover.width * 100));
      // Rounded off along its top, as a thick piece of bark is, and uneven.
      for (let i = 0; i < at.count; i++) if (at.getY(i) > 0) {
        at.setY(i, at.getY(i) + (r() - 0.5) * 0.08);
        at.setX(i, at.getX(i) * 0.9);
        at.setZ(i, at.getZ(i) * 0.8);
      }
      slab.geometry.computeVertexNormals();
      slab.position.y = mover.height / 2;
      group.add(slab);
      // The cracks along its face, between the bark's plates, and its paler top where he will stand.
      for (const [k, y] of [0.3, 0.62, 0.95].entries()) {
        const crack = new Mesh(new BoxGeometry(mover.width * (0.7 - k * 0.12), 0.06, 0.04), solid('#4a3424', 1));
        crack.position.set((k - 1) * 0.3, mover.height * y, 0.6 - y * 0.12);
        crack.rotation.z = (k - 1) * 0.05;
        group.add(crack);
      }
      const top = new Mesh(new BoxGeometry(mover.width * 0.86, 0.06, 0.9), solid('#b8966e', 1));
      top.position.y = mover.height + 0.02;
      group.add(top);
      return group;
    },
    'swing-sign': (mover) => {
      // A shop's sign on two chains: a plain painted board with a border, and no letter on it.
      const group = new Group();
      const board = new Mesh(new BoxGeometry(mover.width, mover.height, 0.12), solid('#2f5a6a', 0.7));
      board.position.y = mover.height / 2;
      const border = new Mesh(new BoxGeometry(mover.width * 0.85, mover.height * 0.6, 0.13), solid('#e6c66a', 0.6));
      border.position.y = mover.height / 2;
      group.add(board, border);
      for (const x of [-0.4, 0.4]) {
        const chain = new Mesh(new CylinderGeometry(0.02, 0.02, 3, 4), solid('#3a3a3a', 0.5, { metalness: 0.5 }));
        chain.position.set(x * mover.width, mover.height + 1.5, 0);
        group.add(chain);
      }
      return group;
    },
    football: (mover) => { const g = new Group(); g.add(football(Math.min(mover.width, mover.height) / 2)); return g; },
    raft: (mover) => { const g = new Group(); g.add(raft(mover.width, mover.height)); return g; },
    buoy: (mover) => {
      // A swimming buoy: a white float with a red band, bobbing.
      const g = new Group();
      const float = new Mesh(new SphereGeometry(mover.width / 2, 14, 10), solid('#f2f0ea', 0.4));
      float.scale.y = mover.height / mover.width;
      float.position.y = mover.height / 2;
      const band = new Mesh(new TorusGeometry(mover.width / 2 * 0.98, 0.08, 6, 20), solid('#d8352a', 0.5));
      band.rotation.x = Math.PI / 2;
      band.position.y = mover.height / 2;
      g.add(float, band);
      return g;
    },
    'jetty-plank': (mover) => {
      const group = new Group();
      const plank = new Mesh(new BoxGeometry(mover.width, mover.height, 1.4), solid('#8c7a62', 0.9));
      plank.position.y = mover.height / 2;
      group.add(plank);
      return group;
    },
  };
}

/** Puts Äventyr 2's pictures into the renderer's extension points. */
export function installPictures(): void {
  for (const [id, look] of Object.entries(LOOKS)) PACK.looks.set(id, look);
  for (const [look, make] of Object.entries(spotLooks())) PACK.spots.set(look, make);
  for (const [look, make] of Object.entries(rideLooks())) PACK.rides.set(look, make);
  for (const [look, make] of Object.entries(moverLooks())) PACK.movers.set(look, make);
  if (!PACK.extras.includes(stormExtra)) PACK.extras.push(stormExtra);
  if (!PACK.models.includes(installModels)) PACK.models.push(installModels);
}

/** For the tests: the looks, and which chapters have a dimmed sky. */
export const NIGHT = { looks: LOOKS, dim: DIM, colourOf: (hex: string) => new Color(hex) };
