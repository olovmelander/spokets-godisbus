import {
  BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group,
  HalfFloatType, LinearFilter, Mesh, MeshBasicMaterial, OrthographicCamera, RepeatWrapping, SRGBColorSpace, ShaderMaterial,
  Vector2, Vector3, Vector4, WebGLRenderTarget, type Camera, type Material, type Object3D, type PerspectiveCamera,
  type Texture, type WebGLRenderer,
} from 'three';
import type { ChapterData, PlaceId } from '../sim/types';
import type { Tier } from './quality';

/** A tiny generated flow field: mostly downstream, with gentle eddies. No downloaded texture. */
function flowField() {
  const data = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const angle = Math.sin(x * Math.PI / 8) * Math.cos(y * Math.PI / 8) * 0.7;
    data.set([Math.round(128 + Math.cos(angle) * 100), Math.round(128 + Math.sin(angle) * 100), 128, 255], (y * 32 + x) * 4);
  }
  const texture = new DataTexture(data, 32, 32);
  texture.name = 'water-flow';
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const CAUSTIC = `
  float causticPattern(vec2 p, float time) {
    vec2 q = p * 6.0 + vec2(time * 0.43, time * -0.3);
    float a = sin(q.x + sin(q.y * 0.73 + time * 0.2));
    float b = sin(q.y + sin(q.x * 0.82 - time * 0.3));
    return pow(max(0.0, 1.0 - abs(a + b) * 1.6), 4.0);
  }
`;

/**
 * How a place's water lies and looks (art bible §2.3). Its colour and opacity are the place's own
 * (`PlaceLook.water`); what it mirrors is the place's sky and far scenery. The rest is here.
 */
export interface WaterKind {
  /** Where the water is cut towards the camera, and where that cut meets the ground at a pool's two ends. */
  front: number;
  corner: number;
  /** How far behind the path it reaches, and from where it thins out into the haze. */
  back: number;
  thins: number;
  /** Where the water behind the whole chapter begins: the bog's ground is islands in it. */
  behind: number | null;
  /** A pool that goes on behind the ground has no banks there: its sides thin out over this many EL. */
  feather: number;
  /** How far down the cut face goes. */
  depth: number;
  /** Shallow water: how far under the surface its bed lies, and how far back its far shore reaches. */
  bed: number;
  shore: number;
  /** Its own colour, as a share of the place's: deep water gives little light back. */
  dim: number;
  /** The cut face, from the waterline down, over `ramp` EL; and how much of what is behind shows at the waterline. */
  faceTop: string;
  faceDeep: string;
  ramp: number;
  faceAlpha: number;
  /** And how solid the face is from 1.2 EL under the waterline down. */
  faceBelow: number;
  /** How fast it hides what is in it, per EL of water looked through, and the colour it gives that. */
  murk: number;
  through: string;
  /** How much it mirrors, the mirror's tint, and how big its ripples are. */
  mirror: number;
  tint: string;
  ripple: number;
  /** The bed of shallow water, and its wet shore. */
  bedColour: string;
  shoreColour: string;
  /** What it mirrors, where the far scenery is hidden: the flat things that stand at this z (the street's house fronts). */
  stands: number | null;
}

/** A clear pool, as the forest's brook has: the test course's too, and any place without a kind of its own. */
const POOL: WaterKind = {
  front: 0.65, corner: 0.65, back: -34, thins: -18, behind: null, feather: 3, depth: 6, bed: 0, shore: 0,
  dim: 0.72, faceTop: '#2c7278', faceDeep: '#0c2c30', ramp: 2.2, faceAlpha: 0.8, faceBelow: 0.94, murk: 0.07, through: '#9fd8cf',
  mirror: 0.65, tint: '#e6ecd8', ripple: 1.15, bedColour: '#000000', shoreColour: '#000000', stands: null,
};

const KINDS: Partial<Record<PlaceId, WaterKind>> = {
  forest: POOL,
  /** Peat water: nearly black, still, and a mirror. It lies in front of the tussocks and behind the whole bog. */
  bog: {
    front: 2.4, corner: 1.55, back: -60, thins: -26, behind: -5.5, feather: 0, depth: 12, bed: 0, shore: 0,
    dim: 0.6, faceTop: '#34423f', faceDeep: '#0e1a18', ramp: 1.6, faceAlpha: 0.93, faceBelow: 1, murk: 0.9, through: '#9fb09a',
    mirror: 0.5, tint: '#c8bd9e', ripple: 0.8, bedColour: '#000000', shoreColour: '#000000', stands: null,
  },
  /** Rain water in a dip of the street: a hand deep, asphalt under it, and a wet shore towards the houses. */
  village: {
    front: 0.65, corner: 0.65, back: -9, thins: -9, behind: null, feather: 0, depth: 6, bed: 0.5, shore: -13.4,
    dim: 0.7, faceTop: '#3d4954', faceDeep: '#2a323b', ramp: 0.6, faceAlpha: 1, faceBelow: 1, murk: 0.08, through: '#ffffff',
    mirror: 0.75, tint: '#d9dde4', ripple: 0.6, bedColour: '#23262b', shoreColour: '#3a3a3c', stands: -13,
  },
};

/** Greybox: a block of blue water a few EL deep, as before a place is dressed. */
const GREYBOX: WaterKind = { ...POOL, back: -3.95, thins: -3.95, feather: 0 };

export const waterKind = (place: PlaceId | undefined, dressed = true): WaterKind => (dressed ? (place && KINDS[place]) || POOL : GREYBOX);

/** What the water is made of: corners with their part (0 surface, 1 cut face, 2 shore), how much is there, and how deep. */
export interface WaterShape {
  position: number[];
  /** Per corner: its part, how much of the water is there (0 where it ends in nothing), how deep it is (0 at a shore), and its pool's level. */
  part: number[];
  index: number[];
}

/**
 * The water of a chapter as one mesh. A pool's surface lies where the simulation has it (`from`, `to`, `y`);
 * everything else is the picture's: how far it reaches towards and away from the camera, where it ends in
 * haze instead of an edge, and the face it is cut with in front.
 */
export function waterShape(pools: readonly { from: number; to: number; y: number }[], kind: WaterKind, span?: { from: number; to: number }, street?: (x: number) => number): WaterShape {
  const position: number[] = [];
  const part: number[] = [];
  const index: number[] = [];
  const corner = (x: number, y: number, z: number, which: number, there: number, deep: number, level: number) => {
    position.push(x, y, z);
    part.push(which, there, deep, level);
    return position.length / 3 - 1;
  };
  const quad = (a: number, b: number, c: number, d: number) => index.push(a, b, c, c, b, d);
  /** A piece of surface: columns along x, rows from the camera away, and what there is at each crossing. */
  const sheet = (y: number, columns: number[], rows: (column: number) => { z: number; y?: number; there?: number; deep?: number; which?: number }[]) => {
    const grid = columns.map((x, i) => rows(i).map((row) => corner(x, row.y ?? y, row.z, row.which ?? 0, row.there ?? 1, row.deep ?? 1, y)));
    for (let i = 0; i < grid.length - 1; i++) for (let j = 0; j < grid[i]!.length - 1; j++) quad(grid[i]![j]!, grid[i + 1]![j]!, grid[i]![j + 1]!, grid[i + 1]![j + 1]!);
  };
  if (!pools.length) return { position, part, index };
  const level = pools[0]!.y;
  const everywhere = kind.behind !== null && span !== undefined;
  // Far shores first, then the water behind everything, then each pool from its face to its surface: the
  // mesh is drawn in this order, and nothing of it is in front of what comes later.
  if (kind.bed > 0) for (const w of pools) {
    const up = street ? Math.max(street(w.from - 0.2), street(w.to + 0.2)) : w.y + 0.3;
    sheet(w.y, [w.from, w.to], () => [
      { z: kind.back + 0.4, which: 2 }, { z: kind.back - 0.5, y: up, which: 2 }, { z: kind.shore, y: up, which: 2 },
    ]);
  }
  if (everywhere) {
    const xs = [span.from - 60, span.to + 60];
    for (const w of pools) if (w.y === level) xs.push(...columnsOf(w, kind.corner < kind.front ? 1.2 : 0));
    const columns = [...new Set(xs)].sort((a, b) => a - b);
    sheet(level, columns, () => [{ z: kind.behind! }, { z: kind.thins }, { z: kind.back, there: 0 }]);
  }
  for (const w of pools) {
    const joined = everywhere && w.y === level;
    const inset = kind.corner < kind.front ? 1.2 : joined ? 0 : kind.bed > 0 ? 2 : kind.feather;
    const columns = columnsOf(w, inset);
    const front = columns.map((_, i) => (i === 0 || i === columns.length - 1 ? kind.corner : kind.front));
    const edge = (i: number) => i === 0 || i === columns.length - 1;
    // The cut face: straight down from the front of the surface.
    for (let i = 0; i < columns.length - 1; i++) {
      quad(
        corner(columns[i]!, w.y, front[i]!, 1, 1, 1, w.y), corner(columns[i + 1]!, w.y, front[i + 1]!, 1, 1, 1, w.y),
        corner(columns[i]!, w.y - kind.depth, front[i]!, 1, 1, 1, w.y), corner(columns[i + 1]!, w.y - kind.depth, front[i + 1]!, 1, 1, 1, w.y),
      );
    }
    if (joined) sheet(w.y, columns, (i) => [{ z: front[i]! }, { z: kind.behind! }]);
    else if (kind.bed > 0) {
      // A puddle: shallow at its shores, a hand deep in the middle.
      sheet(w.y, columns, (i) => [
        { z: front[i]!, deep: edge(i) ? 0 : 1 }, { z: kind.back + 2.5, deep: edge(i) ? 0 : 1 }, { z: kind.back, deep: 0 },
      ]);
    } else if (kind.feather > 0) {
      // Behind the ground's back edge no bank holds the pool: its sides and its far end thin out.
      sheet(w.y, columns, (i) => [
        { z: front[i]! }, { z: -15.5 }, { z: kind.thins - 2, there: edge(i) ? 0 : 1 }, { z: kind.back, there: 0 },
      ]);
    } else sheet(w.y, columns, (i) => [{ z: front[i]! }, { z: kind.back }]);
  }
  return { position, part, index };
}

/** A pool's columns: its two ends, and one a little inside each. */
function columnsOf(w: { from: number; to: number }, inset: number): number[] {
  const by = Math.min(inset, (w.to - w.from) / 3);
  return by > 0 ? [w.from, w.from + by, w.to - by, w.to] : [w.from, w.to];
}

/** What the view hands the water of a place, so that it mirrors the place it lies in. */
export interface WaterSetting {
  place?: PlaceId;
  /** The backdrop's colours: the mirrored sky is drawn from the same ones. */
  sky?: { top: string; middle: string; glow: string };
  /** The far layers' cards (`far-…` in backdrop.ts). Their pictures are mirrored, upside down, in the water. */
  far?: Object3D[];
  /** The chapter's ground at x: a shallow puddle's far shore lies at the street's height. */
  street?: (x: number) => number;
  /** The place's dressing. A street's puddle mirrors the house fronts that stand in it, behind the water. */
  dressing?: Object3D;
}

interface FarCard { card: Mesh; map: Texture; z: number; every: number; tall: number; eye: number }

/** Reads a far layer's card as backdrop.ts made it: how wide and tall its picture hangs, and which row is at his eyes. */
function farCard(object: Object3D): FarCard | null {
  const card = object as Mesh;
  const map = (card.material as MeshBasicMaterial | undefined)?.map;
  const at = card.geometry?.getAttribute('position');
  const uv = card.geometry?.getAttribute('uv');
  if (!map?.image || !at || !uv) return null;
  let every = 0;
  let tall = 0;
  for (let i = 1; i < at.count; i++) {
    if (!every && at.getX(i) !== at.getX(0) && uv.getX(i) !== uv.getX(0)) every = (at.getX(i) - at.getX(0)) / (uv.getX(i) - uv.getX(0));
    if (!tall && at.getY(i) !== at.getY(0) && uv.getY(i) !== uv.getY(0)) tall = (at.getY(i) - at.getY(0)) / (uv.getY(i) - uv.getY(0));
  }
  if (!(every > 0) || !(tall > 0)) return null;
  return { card, map, z: card.position.z, every, tall, eye: uv.getY(0) - at.getY(0) / tall };
}

/** The mirror strip's size, and how far it reaches over and under the height of his eyes, in EL. */
const STRIP = { wide: 512, high: 128, above: 24, below: 4 };
/** Where the camera stands, for the strip's sake: this far in front of the path, and this far under the far pictures' eye row. */
const SEEN_FROM = { z: 10.5, under: 0.55 };

/**
 * One picture of everything far away, as it stands on the nearest far layer's card: the farther layers are
 * drawn onto it at the size they have seen from the path. The water mirrors this one card about its own
 * surface, so the spruces across the bog stand on their heads in the pool below them. Built once, at load.
 */
function mirrorStrip(cards: Object3D[]): { map: CanvasTexture; frame: Vector4; anchor: FarCard } | null {
  const layers = cards.map(farCard).filter((layer): layer is FarCard => layer !== null).sort((a, b) => a.z - b.z);
  const anchor = layers[layers.length - 1];
  if (!anchor || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = STRIP.wide;
  canvas.height = STRIP.high;
  const c = canvas.getContext('2d')!;
  const row = (y: number) => ((STRIP.above - y) / (STRIP.above + STRIP.below)) * STRIP.high;
  for (const layer of layers) {
    const image = layer.map.image as HTMLCanvasElement;
    // A layer behind the nearest is smaller on its card by as much as it is farther off.
    const small = (SEEN_FROM.z - anchor.z) / (SEEN_FROM.z - layer.z);
    const times = Math.max(1, Math.round(anchor.every / (layer.every * small)));
    const top = row(((1 - layer.eye) * layer.tall + SEEN_FROM.under) * small - SEEN_FROM.under);
    const foot = row((-layer.eye * layer.tall + SEEN_FROM.under) * small - SEEN_FROM.under);
    for (let k = 0; k < times; k++) {
      const x = (k * STRIP.wide) / times;
      c.drawImage(image, x, top, STRIP.wide / times, foot - top);
      // A card repeats its picture's foot downwards: so does the strip.
      if (foot < STRIP.high) c.drawImage(image, 0, image.height - 1, image.width, 1, x, foot, STRIP.wide / times, STRIP.high - foot);
    }
  }
  const map = new CanvasTexture(canvas);
  map.name = 'water-mirror';
  map.colorSpace = SRGBColorSpace;
  map.wrapS = RepeatWrapping;
  map.wrapT = ClampToEdgeWrapping;
  map.premultiplyAlpha = true;
  return { map, frame: new Vector4(anchor.z, anchor.every, STRIP.above + STRIP.below, STRIP.below), anchor };
}

/**
 * The same for water that has houses behind it and not the far scenery: every flat thing that stands at `z`
 * and faces the camera, between `from` and `to`, drawn into one picture that stands still in the world.
 */
function standingStrip(root: Object3D, z: number, from: number, to: number, base: number): { map: CanvasTexture; frame: Vector4; slide: Vector3 } | null {
  if (typeof document === 'undefined') return null;
  root.updateWorldMatrix(true, true);
  const at = new Vector3();
  const fronts: { mesh: Mesh; x: number; y: number; z: number; wide: number; tall: number }[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    const size = (mesh.geometry as { parameters?: { width?: number; height?: number } } | undefined)?.parameters;
    if (!mesh.isMesh || mesh.geometry.type !== 'PlaneGeometry' || !size?.width || !size.height) return;
    if (!(mesh.material as MeshBasicMaterial).isMeshBasicMaterial || mesh.rotation.x !== 0 || mesh.rotation.y !== 0 || mesh.rotation.z !== 0) return;
    mesh.getWorldPosition(at);
    if (Math.abs(at.z - z) > 1 || at.x + size.width / 2 < from || at.x - size.width / 2 > to) return;
    fronts.push({ mesh, x: at.x, y: at.y, z: at.z, wide: size.width, tall: size.height });
  });
  if (!fronts.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = STRIP.wide;
  canvas.height = STRIP.high;
  const c = canvas.getContext('2d')!;
  const column = (x: number) => ((x - from) / (to - from)) * STRIP.wide;
  const row = (y: number) => ((STRIP.above - (y - base)) / (STRIP.above + STRIP.below)) * STRIP.high;
  for (const front of fronts.sort((a, b) => a.z - b.z)) {
    const material = front.mesh.material as MeshBasicMaterial;
    const left = column(front.x - front.wide / 2);
    const top = row(front.y + front.tall / 2);
    const wide = column(front.x + front.wide / 2) - left;
    const tall = row(front.y - front.tall / 2) - top;
    const image = material.map?.image as HTMLCanvasElement | undefined;
    c.save();
    c.beginPath();
    c.rect(left, top, wide, tall);
    c.clip();
    c.globalAlpha = material.opacity;
    if (image) {
      // A fence's picture repeats along it.
      const times = Math.max(1, material.map!.repeat.x);
      for (let k = 0; k < times; k++) c.drawImage(image, left + (k * wide) / times, top, wide / times, tall);
    } else {
      c.fillStyle = material.color.getStyle();
      c.fillRect(left, top, wide, tall);
    }
    c.restore();
  }
  const map = new CanvasTexture(canvas);
  map.name = 'water-mirror';
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = ClampToEdgeWrapping;
  map.premultiplyAlpha = true;
  return { map, frame: new Vector4(z, to - from, STRIP.above + STRIP.below, STRIP.below), slide: new Vector3(from, 0, base) };
}

/** A clear pixel: what the water mirrors of the far scenery where there is none. */
function nothingFar(): DataTexture {
  const texture = new DataTexture(new Uint8Array(4), 1, 1);
  texture.name = 'water-mirror';
  texture.needsUpdate = true;
  return texture;
}

/**
 * The water of a chapter: one mesh, one shader, the same on every tier. It mirrors the place's sky and the
 * far scenery standing on its head, darkens with depth where it is cut in front, and thins out into the haze
 * instead of ending in an edge. Mid adds the sun's glitter and caustics on what is under water; High also
 * shows what lies just under the surface, from a half-size copy of the picture behind it.
 */
export function createWater(chapter: ChapterData, look: { colour: string; opacity: number } | null, sun: readonly [number, number, number] = [-7, 5, -4], setting: WaterSetting = {}) {
  const group = new Group();
  const pools = chapter.water ?? [];
  const kind = waterKind(setting.place ?? chapter.place, look !== null);
  const details = { value: 0 }, time = { value: 0 };
  // A puddle between houses mirrors them: as far to each side as the camera can see them in it.
  const puddle = pools[0];
  const standing = puddle && kind.stands !== null && setting.dressing
    ? standingStrip(setting.dressing, kind.stands, puddle.from - 16, pools[pools.length - 1]!.to + 16, setting.street?.(puddle.from - 0.2) ?? puddle.y)
    : null;
  const mirror = pools.length && !standing ? mirrorStrip(setting.far ?? []) : null;
  const sky = setting.sky ?? { top: '#8fb6d8', middle: '#dfeaf0', glow: '#fff6dc' };
  const uniforms = {
    flowMap: { value: flowField() }, time, details,
    sunDirection: { value: new Vector3(...sun).normalize() },
    waterColour: { value: new Color(look?.colour ?? '#4f9fc4') }, opacity: { value: look?.opacity ?? 0.78 },
    refraction: { value: null as WebGLRenderTarget['texture'] | null }, refractOn: { value: 0 },
    resolution: { value: new Vector2(1, 1) }, cameraFar: { value: 140 },
    fogColor: { value: new Color() }, fogNear: { value: 1 }, fogFar: { value: 100 },
    mirrorMap: { value: (standing?.map ?? mirror?.map ?? nothingFar()) as Texture },
    // The mirrored card: its z, how wide its picture hangs, how high the strip reaches, and how far of that is under the eye.
    mirrorFrame: { value: standing?.frame ?? mirror?.frame ?? new Vector4(-40, 80, STRIP.above + STRIP.below, STRIP.below) },
    // Where that card is now: its x, how far its picture has slid, and the height of its eye row.
    mirrorSlide: { value: new Vector3() },
    skyTop: { value: new Color(sky.top) }, skyMiddle: { value: new Color(sky.middle) }, skyGlow: { value: new Color(sky.glow) },
    mirrorTint: { value: new Color(kind.tint) },
    faceTop: { value: new Color(kind.faceTop) }, faceDeep: { value: new Color(kind.faceDeep) },
    through: { value: new Color(kind.through) },
    bedColour: { value: new Color(kind.bedColour) }, shoreColour: { value: new Color(kind.shoreColour) },
    // Its murk per EL, the face's ramp, how much shows through the face at the waterline, and the bed's depth.
    body: { value: new Vector4(kind.murk, kind.ramp, kind.faceAlpha, kind.bed) },
    // How much it mirrors, how big its ripples are, how dark its own colour is, and how solid its face is further down.
    surface: { value: new Vector4(kind.mirror, kind.ripple, kind.dim, kind.faceBelow) },
  };
  const material = new ShaderMaterial({
    // It writes its depth, so that what drifts over it afterwards (mist, dust) is hidden where it dips under
    // the surface, and the depth blur treats the water as what it is and not as the pit behind it.
    uniforms, transparent: true, depthWrite: true, fog: true, side: DoubleSide,
    vertexShader: `
      attribute vec4 part;
      varying vec3 waterWorld; varying float waterDepth; varying vec4 waterPart;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        waterWorld = world.xyz;
        // Its part, how much of it is there, how deep it is, and the height of its pool's surface.
        waterPart = vec4(part.xyz, part.w + modelMatrix[3].y);
        vec4 mvPosition = viewMatrix * world;
        waterDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D flowMap, refraction, mirrorMap;
      uniform vec3 waterColour, sunDirection, skyTop, skyMiddle, skyGlow, mirrorTint, faceTop, faceDeep, through, bedColour, shoreColour;
      uniform float time, details, opacity, refractOn, cameraFar;
      uniform vec4 mirrorFrame, body, surface;
      uniform vec3 mirrorSlide;
      uniform vec2 resolution;
      varying vec3 waterWorld; varying float waterDepth; varying vec4 waterPart;
      #include <fog_pars_fragment>

      // Three trains of small waves that cross each other, so that no two rows are alike. A train finer than
      // the picture's pixels where it lies is left out: far water is still. Gives the slope, and where two
      // crests meet.
      vec3 ripples(vec2 p, float t, float pixel) {
        const vec2 a = vec2(0.26, 0.97), b = vec2(-0.5, 0.87), c = vec2(0.91, 0.42);
        float wa = dot(p, a) * 1.7 + t * 0.8 + 1.4 * sin(dot(p, c) * 0.45 - t * 0.15);
        float wb = dot(p, b) * 2.9 - t * 1.1 + 1.2 * sin(dot(p, a) * 0.7 + t * 0.2);
        float wc = dot(p, c) * 5.1 + t * 1.6 + 0.9 * sin(wa * 0.6);
        float fa = 1.0 - smoothstep(0.5, 1.4, pixel * 1.7);
        float fb = 1.0 - smoothstep(0.5, 1.4, pixel * 2.9);
        float fc = 1.0 - smoothstep(0.5, 1.4, pixel * 5.1);
        vec2 slope = a * cos(wa) * 0.55 * fa + b * cos(wb) * 0.3 * fb + c * cos(wc) * 0.15 * fc;
        return vec3(slope, cos(wb) * cos(wc) * fb * fc);
      }

      void main() {
        vec2 screen = gl_FragCoord.xy / resolution;
        float isTop = 1.0 - step(0.5, waterPart.x);
        vec3 ray = waterWorld - cameraPosition;
        vec3 view = -normalize(ray);
        vec2 flow = texture2D(flowMap, waterWorld.xz * 0.045).rg * 2.0 - 1.0;
        vec3 wave = ripples(waterWorld.xz - flow * time * 0.2, time, fwidth(waterWorld.z) + fwidth(waterWorld.x) * 0.3);
        vec2 slope = wave.xy * surface.y * 0.03;

        // The mirror. The camera looks level, so what the water shows at a point is what stands as high over
        // the water, as far behind it, as the eye is in front of it: the far card upside down, hinged where
        // it meets the water. A ripple tips the mirror, mostly up and down.
        float run = max(waterWorld.z - mirrorFrame.x, 0.0);
        float away = max(-ray.z, 0.05);
        float rise = max(-ray.y / away + slope.y * 1.6, 0.0);
        vec2 hit = vec2(waterWorld.x + ray.x / away * run + slope.x * (2.0 + rise * run), waterWorld.y + rise * run);
        vec4 far = texture2D(mirrorMap, vec2((hit.x - mirrorSlide.x) / mirrorFrame.y + mirrorSlide.y, (hit.y - mirrorSlide.z + mirrorFrame.w) / mirrorFrame.z));
        // The sky is the backdrop's own: its gradient by how high the mirrored ray goes, and its glow where the sun stands.
        float high = rise / 0.536;
        vec3 sky = mix(skyMiddle, skyTop, clamp((high - 0.08) / 0.42, 0.0, 1.0));
        float glow = clamp(1.0 - length(vec2(screen.x + slope.x * 2.0 - 0.273, high - 0.129)) / 0.664, 0.0, 1.0);
        sky = mix(sky, skyGlow, glow);
        vec3 mirrored = (sky * (1.0 - far.a) + far.rgb) * mirrorTint;
        // Dark things are darker in water than in the air, and the sky keeps its light.
        mirrored *= 0.55 + 0.75 * dot(mirrored, vec3(0.3, 0.6, 0.1));
        // Water mirrors most where it is looked along, and a ripple's near side is looked into.
        float facing = clamp(view.y - dot(view.xz, wave.xy) * surface.y * 0.035, 0.0, 1.0);
        float glance = pow(1.0 - facing, 3.0);
        float mirrors = surface.x * (0.15 + 0.85 * glance);

        // Its own colour: dark where it is deep, and its bed where it is shallow.
        // Little of what is behind it shows through its surface: a third of what the place's opacity leaves.
        vec3 own = waterColour * surface.z;
        float solid = 1.0 - (1.0 - opacity) * 0.3;
        if (body.w > 0.0) {
          float grit = fract(sin(dot(floor(waterWorld.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
          float water = 1.0 - exp(-body.x * body.w * waterPart.z / max(facing, 0.08));
          own = mix(bedColour * (0.88 + 0.24 * grit), own, water);
          solid = 1.0;
        }
        vec3 top = mix(own, mirrored, mirrors);
        if (details > 0.5) {
          // The low sun's glitter: where two crests meet, under the sky's glow.
          vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
          float glint = pow(max(dot(normal, normalize(view + sunDirection)), 0.0), 64.0) + pow(max(wave.z, 0.0), 10.0) * glow * glow * glow;
          top += skyGlow * mirrorTint * glint * 0.4;
        }

        // The cut face: the water's own body, darker with depth, and a pale line where the surface meets it.
        float under = max(waterPart.w - waterWorld.y, 0.0);
        vec3 face = mix(faceTop, faceDeep, smoothstep(0.0, body.y, under));
        float faceSolid = mix(body.z, surface.w, smoothstep(0.0, 1.2, under));

        if (refractOn > 0.5 && body.w <= 0.0) {
          vec2 bend = slope * 0.2 * isTop;
          vec4 behind = texture2D(refraction, clamp(screen + bend, 0.0, 1.0));
          // Do not bend a nearer character into the water from outside its silhouette.
          if (behind.a * cameraFar < waterDepth - 0.03) behind = texture2D(refraction, screen);
          // What is in the water shows as far as the water lets it: a hand's breadth clearly, three EL not at all.
          float see = exp(-max(behind.a * cameraFar - waterDepth, 0.0) * body.x);
          vec3 seen = behind.rgb * through;
          top = mix(top, seen, see * (1.0 - mirrors) * 0.85);
          face = mix(face, seen, see * 0.8);
          solid = faceSolid = 1.0;
        }
        face = mix(face, skyMiddle * mirrorTint, 0.22 * (1.0 - smoothstep(0.01, 0.035, under)));
        if (body.w > 0.0) {
          // Shallow water: under its bed the street is cut through, dark.
          float ground = smoothstep(body.w - 0.02, body.w + 0.03, under);
          face = mix(face, bedColour * mix(0.75, 0.35, smoothstep(body.w, body.w + 2.0, under)), ground);
          faceSolid = 1.0;
        }
        // A puddle's far shore: wet asphalt, with a little of the sky in it.
        vec3 shore = shoreColour + mirrored * 0.06;

        vec3 colour = waterPart.x < 0.5 ? top : waterPart.x < 1.5 ? face : shore;
        float there = waterPart.x < 0.5 ? solid : waterPart.x < 1.5 ? faceSolid : 1.0;
        // Where it has thinned out to nothing there is no water: nothing is drawn, and no depth written.
        if (there * waterPart.y < 0.02) discard;
        gl_FragColor = vec4(colour, there * waterPart.y);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const first = chapter.ground?.[0];
  const last = chapter.ground?.[chapter.ground.length - 1];
  const shape = waterShape(pools, kind, first && last ? { from: first.x, to: last.x } : undefined, setting.street);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(shape.position, 3));
  geometry.setAttribute('part', new Float32BufferAttribute(shape.part, 4));
  geometry.setIndex(shape.index);
  geometry.computeBoundingSphere();
  const body = new Mesh(geometry, material);
  body.name = 'water';
  // After everything that stands in the water, and before what drifts over it: mist, shafts of light, dust.
  body.renderOrder = 1.5;
  if (pools.length) group.add(body);
  let target: WebGLRenderTarget | null = null;
  const copyMaterial = new ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, nearFar: { value: new Vector2(0.1, 140) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform vec2 nearFar; varying vec2 vUv;
      void main() {
        float d = texture2D(tDepth, vUv).r;
        float linearDepth = nearFar.x / (nearFar.y - (nearFar.y - nearFar.x) * d);
        gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, linearDepth);
      }`,
    depthTest: false, depthWrite: false,
  });
  const triangleGeometry = new BufferGeometry();
  triangleGeometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  triangleGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(triangleGeometry, copyMaterial); triangle.frustumCulled = false;
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function capture(renderer: WebGLRenderer, source: WebGLRenderTarget, camera: PerspectiveCamera): void {
    if (!target) return;
    uniforms.cameraFar.value = camera.far;
    (copyMaterial.uniforms.nearFar!.value as Vector2).set(camera.near, camera.far);
    copyMaterial.uniforms.tDiffuse!.value = source.texture;
    copyMaterial.uniforms.tDepth!.value = source.depthTexture;
    renderer.setRenderTarget(target);
    renderer.render(triangle, screenCamera);
  }
  // The water is drawn in the scene's own pass, after what stands in it. Just before it, High copies the
  // picture so far at half size, to see through the surface: only while water is in the picture at all.
  body.onBeforeRender = (renderer: WebGLRenderer, _scene, camera: Camera) => {
    if (standing) uniforms.mirrorSlide.value.copy(standing.slide);
    else if (mirror) {
      const { card, map } = mirror.anchor;
      uniforms.mirrorSlide.value.set(card.position.x, map.offset.x, card.position.y);
    } else uniforms.mirrorSlide.value.set(0, 0, camera.position.y + SEEN_FROM.under);
    const source = renderer.getRenderTarget() as WebGLRenderTarget | null;
    if (!target || !source?.depthTexture) return;
    capture(renderer, source, camera as PerspectiveCamera);
    renderer.setRenderTarget(source);
  };
  const patched = new WeakSet<Material>();
  const causticPools = pools.slice(0, 8).map((w) => new Vector4(w.from, w.to, w.y, 0));
  while (causticPools.length < 8) causticPools.push(new Vector4(0, 0, -1e6, 0));
  let before = 0;
  return {
    group,
    get refracting() { return target !== null; },
    /** `still`: with reduced motion the water all but stands. */
    update(clock: number, still = false) {
      time.value += (clock - before) * (still ? 0.12 : 1);
      before = clock;
      body.position.y = Math.sin(time.value * 1.3) * 0.03;
    },
    setSize(width: number, height: number, tier: Tier) {
      details.value = tier === 'low' ? 0 : 1;
      uniforms.resolution.value.set(width, height);
      // Shallow water shows its own bed, not what is behind it: it needs no copy.
      if (tier !== 'high' || !pools.length || kind.bed > 0) { target?.dispose(); target = null; uniforms.refractOn.value = 0; uniforms.refraction.value = null; return; }
      const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
      target ??= new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
      target.texture.name = 'water-refraction';
      target.setSize(w, h);
      uniforms.refraction.value = target.texture;
      uniforms.refractOn.value = 1;
    },
    capture,
    /** Project a moving light pattern onto submerged terrain/props, with no extra geometry or draw. */
    applyCaustics(root: Object3D) {
      if (!pools.length) return;
      root.traverse((object) => {
        const material = (object as Mesh).material;
        for (const one of material ? (Array.isArray(material) ? material : [material]) : []) {
          if (patched.has(one) || one instanceof ShaderMaterial || one instanceof MeshBasicMaterial) continue;
          patched.add(one);
          const before = one.onBeforeCompile, key = one.customProgramCacheKey.bind(one);
          one.customProgramCacheKey = () => `${key()}:water-caustics-v1`;
          one.onBeforeCompile = (shader, renderer) => {
            before.call(one, shader, renderer);
            shader.uniforms.waterTime = time; shader.uniforms.waterDetails = details;
            shader.uniforms.waterPools = { value: causticPools };
            shader.vertexShader = 'varying vec3 causticWorld;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
              vec4 causticPosition = vec4(transformed, 1.0);
              #ifdef USE_INSTANCING
                causticPosition = instanceMatrix * causticPosition;
              #endif
              causticWorld = (modelMatrix * causticPosition).xyz;
              #include <project_vertex>`);
            shader.fragmentShader = `varying vec3 causticWorld; uniform float waterTime, waterDetails;
              uniform vec4 waterPools[8]; ${CAUSTIC}\n` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', `
              if (waterDetails > 0.5) {
                for (int i = 0; i < 8; i++) {
                  vec4 pool = waterPools[i];
                  float depth = pool.z - causticWorld.y;
                  if (causticWorld.x > pool.x && causticWorld.x < pool.y && causticWorld.z < ${(kind.front + 0.05).toFixed(2)} && causticWorld.z > ${Math.min(kind.back, -16).toFixed(1)} && depth > 0.05 && depth < 6.0) {
                    gl_FragColor.rgb += causticPattern(causticWorld.xz + depth * 0.16, waterTime) * vec3(0.06, 0.11, 0.10) * (1.0 - depth / 6.0);
                  }
                }
              }
              #include <tonemapping_fragment>`);
          };
          one.needsUpdate = true;
        }
      });
    },
  };
}
