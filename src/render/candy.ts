import {
  BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Matrix3, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, Sphere, Vector2, Vector3, type Material, type MeshStandardMaterialParameters,
} from 'three';
import { drawnWhile } from './idle';

/**
 * The sweets modelled in Blender (art/blender/candy.py, plan §4.3): the trail's karameller, the sixteen kinds
 * of hidden candy and the magic candy. They arrive in one file, `boot/candy`. Until it has, and wherever it
 * is missing, each place draws the stand-in it builds in code.
 *
 * A sweet has no texture. Its colours are painted on its corners, and the first UV coordinate says how much of
 * the game's own colour a corner takes: that is how one karamell is red and the next yellow while the stripes
 * stay white. The game's colour is an instance's colour, so a sweet that takes one is drawn as an instance.
 */
export interface CandyKit {
  /** A sweet's shape by its name in the generator, with its middle at the origin. Shared: never change or dispose it. */
  shape(name: string): BufferGeometry | undefined;
  /** Lit by the place. One for the whole view, so every sweet shares a shader. */
  readonly material: MeshStandardMaterial;
  /** The same, for what is paper and not sugar: dull, and giving off less of its colour. */
  readonly paper: MeshStandardMaterial;
}

/** What a place in the scene asks the kit for: set as `userData.sweet` on a group that holds the stand-in. */
export interface SweetSocket {
  shape: string;
  /** How big it is drawn, and how far up from the group's own middle. */
  scale?: number;
  y?: number;
  /** Magic candy shines by itself (plan §3.3, rule 3): how much of its own colours it gives off. */
  glow?: number;
  /** Unlit and clear through the mist: the lollipop he carries as a lantern. */
  lantern?: boolean;
  /** Paper, not sugar: the Saturday bag. */
  paper?: boolean;
}

/** Marks a group as a place for one of the kit's sweets. What it holds now is its stand-in. */
export function sweetSocket<T extends Object3D>(holder: T, socket: SweetSocket): T {
  holder.userData.sweet = socket;
  return holder;
}

const TINT = /* glsl */ `
  vColor = vec4(color, 1.0);
  #ifdef USE_INSTANCING_COLOR
    vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, uv.x);
  #endif
`;
const SHINE = /* glsl */ `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += diffuseColor.rgb * candyLift
    + vec3(candySheen * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0));
`;
/** How much of its own colour a sweet gives off, so that it is never lost in the shade or at night (art bible §2.9). */
export const CANDY_LIFT = 0.3;
/** How bright its rim is: sugar is glossy, and catches the sky where it turns away. */
const CANDY_SHEEN = 0.1;

function shining(material: MeshStandardMaterial, lift: number, painted: boolean, sheen = CANDY_SHEEN): void {
  const uniforms = { candyLift: { value: lift }, candySheen: { value: sheen } };
  material.userData.candy = uniforms;
  // One shader for every painted sweet: what differs between them is only these two numbers.
  material.customProgramCacheKey = () => (painted ? 'candy-v1' : 'candy-shine-v1');
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (painted) shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', TINT);
    shader.fragmentShader = `uniform float candyLift;
uniform float candySheen;
${shader.fragmentShader.replace('#include <emissivemap_fragment>', SHINE)}`;
  };
}

/**
 * The sweets' material: painted corners, glossy, and an instance's colour only where the sweet takes it.
 * `lift` is how much of its own colours it gives off: a little for a sweet, much for magic candy.
 */
export function candyMaterial(lift = CANDY_LIFT, parameters: MeshStandardMaterialParameters = {}, sheen = CANDY_SHEEN): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, ...parameters });
  shining(material, lift, true, sheen);
  return material;
}

/** Paper painted like a sweet: the same shader, dull, with a little lift so that the bag is found in the dark. */
export const paperMaterial = (): MeshStandardMaterial => candyMaterial(0.14, { roughness: 0.9 }, 0.02);

/** The same lift and glossy rim for a sweet with a material of its own: the big candy, which has a texture. */
export function sweeten(model: Object3D): void {
  const done = new Set<Material>();
  model.traverse((node) => {
    const material = (node as Mesh).material as MeshStandardMaterial | undefined;
    if (!material || Array.isArray(material) || !material.isMeshStandardMaterial || done.has(material)) return;
    done.add(material);
    shining(material, CANDY_LIFT, false);
  });
}

/**
 * A shape as plain numbers in the kit's own space. The pack step stores a model's corners as small whole
 * numbers and puts the scale on its node, and an instance has no node.
 */
function plain(mesh: Mesh): BufferGeometry {
  const from = mesh.geometry;
  const position = from.getAttribute('position');
  const normal = from.getAttribute('normal');
  const colour = from.getAttribute('color');
  const uv = from.getAttribute('uv');
  const count = position.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const point = new Vector3();
  const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
    point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, i * 3);
    colours[i * 3] = colour.getX(i);
    colours[i * 3 + 1] = colour.getY(i);
    colours[i * 3 + 2] = colour.getZ(i);
    uvs[i * 2] = uv.getX(i);
    uvs[i * 2 + 1] = uv.getY(i);
  }
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  made.setIndex(from.index ? from.index.clone() : null);
  made.computeBoundingSphere();
  made.computeBoundingBox();
  return made;
}

/** Reads the kit from its loaded model. A model without sweets gives a kit without shapes. */
export function candyKit(model: Object3D): CandyKit {
  model.updateMatrixWorld(true);
  const shapes = new Map<string, BufferGeometry>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('color') || !mesh.geometry.getAttribute('uv') || !mesh.geometry.getAttribute('normal')) return;
    shapes.set(mesh.name, plain(mesh));
  });
  return { shape: (name) => shapes.get(name), material: candyMaterial(), paper: paperMaterial() };
}

function discard(stood: Object3D): void {
  stood.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  });
}

/**
 * Puts the kit's sweets where the scene asks for them, in place of their stand-ins. A place whose sweet the
 * kit lacks keeps its stand-in. The caller warms the new materials before play goes on.
 */
export function installSweets(root: Object3D, kit: CandyKit): number {
  const places: Object3D[] = [];
  root.traverse((node) => { if (node.userData.sweet) places.push(node); });
  let installed = 0;
  for (const holder of places) {
    const socket = holder.userData.sweet as SweetSocket;
    const shape = kit.shape(socket.shape);
    if (!shape) continue;
    delete holder.userData.sweet;
    installed++;
    const many = holder as InstancedMesh;
    if (many.isInstancedMesh) {
      // Many of one sweet, each in its own colour: the shape changes, the places and colours stay.
      many.geometry.dispose();
      (many.material as Material).dispose();
      many.geometry = socket.scale === undefined ? shape : shape.clone().scale(socket.scale, socket.scale, socket.scale);
      many.material = kit.material;
      continue;
    }
    for (const child of [...holder.children]) discard(child);
    holder.clear();
    const material = socket.lantern
      ? new MeshBasicMaterial({ vertexColors: true, fog: false })
      : socket.glow !== undefined ? candyMaterial(socket.glow, { roughness: 0.25 }) : socket.paper ? kit.paper : kit.material;
    const mesh = new Mesh(shape, material);
    mesh.scale.setScalar(socket.scale ?? 1);
    mesh.position.y = socket.y ?? 0;
    holder.add(mesh);
  }
  return installed;
}

// --- the trail -------------------------------------------------------------------------------------------------

/** The bright colours of the karameller on Olov's poster. */
const CANDY_COLOURS = ['#e8483f', '#f6c445', '#58b368', '#4a90d9', '#ef7fb0', '#f08a3c'];
const HEART = '#ef7fb0';
/** A collected candy flies into Elof in this long. */
const CANDY_FLIGHT = 0.22;

/** The candy's shapes, by their names in the kit. The last three are flat, and keep their faces to him. */
export const TRAIL_SHAPES = ['karamell', 'randig', 'polka', 'hjarta', 'klubba'] as const;
/**
 * Candy speaks in two voices (docs/level-design.md). **The trail is sweets in wrappers:** karameller, striped
 * ones and a swirl now and then, and it says "this is the way". **Side candy is hearts and lollipops:** it
 * lies off the trail, on an upper route or in a pocket, and says "this is extra". A child can tell route
 * from detour by the shape alone.
 * Thirteen in a row and then again: thirteen shares nothing with the six colours, so each sweet comes round
 * in every colour.
 */
const ORDER = [0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 1];
export type CandyVoice = 'trail' | 'side';
export const trailShape = (index: number, voice: CandyVoice = 'trail'): number => (voice === 'side' ? 3 + (index % 2) : ORDER[index % ORDER.length]!);
export const trailColour = (index: number, voice: CandyVoice = 'trail'): string =>
  (trailShape(index, voice) === 3 ? HEART : CANDY_COLOURS[index % CANDY_COLOURS.length]!);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface Batch { mesh: InstancedMesh; candies: number[]; flat: boolean }

/** Side candy lies in a few places far apart. Candy further than this from the next is in another place. */
const SIDE_APART = 10;
/** How far outside its place a side candy is still drawn: it sways, swells and flies into him. */
const SIDE_REACH = 3;

/**
 * The places a list of candy lies in, each as the candies' numbers in the list. The trail is one place: it
 * runs the length of the course. Side candy is one place for each side way.
 */
export function candyPlaces(candy: readonly { x: number }[], voice: CandyVoice): number[][] {
  const all = candy.map((_, i) => i);
  if (voice !== 'side') return all.length > 0 ? [all] : [];
  const places: number[][] = [];
  for (const i of [...all].sort((a, b) => candy[a]!.x - candy[b]!.x)) {
    const last = places.at(-1);
    if (last && candy[i]!.x - candy[last.at(-1)!]!.x < SIDE_APART) last.push(i);
    else places.push([i]);
  }
  return places.map((place) => place.sort((a, b) => a - b));
}

/**
 * The trail candy, or the side candy, floating and turning. Each kind of sweet is one instanced mesh, so a
 * whole trail is at most three draw calls however long it is. Side candy is two for each place it lies in,
 * and a place is drawn only while it is in sight: a side way far from him costs the picture nothing. A mesh
 * says which of the list's candies it holds in `userData.candies`.
 */
export function createTrail(candy: readonly { x: number; y: number; after?: string }[], voice: CandyVoice = 'trail') {
  const group = new Group();
  group.name = voice === 'side' ? 'side-candy' : 'trail-candy';
  const colour = new Color();
  const place = new Object3D();
  // Its roll round its own length comes first, then the sway and the tilt.
  place.rotation.order = 'ZYX';
  const batch = (geometry: BufferGeometry, material: Material, candies: number[], flat: boolean): Batch => {
    const mesh = new InstancedMesh(geometry, material, Math.max(1, candies.length));
    mesh.count = candies.length;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    if (voice === 'side' && candies.length > 0) {
      // A place of side candy is small: it is in the picture or it is not.
      const xs = candies.map((i) => candy[i]!.x);
      const ys = candies.map((i) => candy[i]!.y);
      const [left, right, low, high] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      mesh.boundingSphere = new Sphere(new Vector3((left + right) / 2, (low + high) / 2, 0), Math.hypot(right - left, high - low) / 2 + SIDE_REACH);
    } else {
      // The trail runs the length of the course, so it is never outside the picture as a whole.
      mesh.frustumCulled = false;
    }
    for (const [slot, index] of candies.entries()) mesh.setColorAt(slot, colour.set(trailColour(index, voice)));
    mesh.userData.candies = candies;
    group.add(mesh);
    return { mesh, candies, flat };
  };
  // The stand-in: a wrapped sweet in profile. A flared twist, a neck, the sweet itself, a neck and a twist.
  const profile = [[0.072, -0.19], [0.024, -0.115], [0.085, -0.064], [0.1, 0], [0.085, 0.064], [0.024, 0.115], [0.072, 0.19]];
  const standIn = new LatheGeometry(profile.map(([radius, along]) => new Vector2(radius, along)), 14);
  standIn.rotateZ(Math.PI / 2);
  // Both sides: the stand-in's twists are open at their ends.
  let batches = [batch(standIn, new MeshStandardMaterial({ roughness: 0.32, side: DoubleSide }), candy.map((_, i) => i), false)];

  /** How far each collected candy has flown, from 0 to 1; -1 while it still floats in its place. */
  const flown = candy.map(() => -1);
  /** How far each candy that waits for a flag has come out, from 0 to 1. */
  const out: number[] = candy.map((c) => (c.after === undefined ? 1 : 0));

  /** The kit's sweets take the stand-in's place. Without all five of them the stand-in stays. */
  function install(kit: CandyKit): boolean {
    const shapes = TRAIL_SHAPES.map((name) => kit.shape(name));
    if (shapes.some((shape) => !shape)) return false;
    for (const old of batches) {
      group.remove(old.mesh);
      old.mesh.geometry.dispose();
      (old.mesh.material as Material).dispose();
      old.mesh.dispose();
    }
    batches = candyPlaces(candy, voice).flatMap((here) => shapes
      .map((shape, kind) => ({ shape: shape!, kind, candies: here.filter((i) => trailShape(i, voice) === kind) }))
      .filter((one) => one.candies.length > 0)
      .map((one) => batch(one.shape, kit.material, one.candies, one.kind >= 2)));
    return true;
  }

  function update(collected: readonly boolean[], flags: ReadonlySet<string>, elofX: number, elofY: number, dt: number, clock: number, tapped?: number, response = 0, droppedThrough = Infinity): void {
    // What happens to a candy happens once a frame, whichever mesh draws it.
    for (let i = 0; i < candy.length; i++) {
      const c = candy[i]!;
      if (collected[i] && flown[i]! < 0) flown[i] = 0;
      // A candy the ghost drops pops out when it does.
      if (c.after !== undefined && flags.has(c.after) && c.x <= droppedThrough) out[i] = Math.min(1, out[i]! + dt * 5);
      if (flown[i]! >= 0) flown[i] = Math.min(1, flown[i]! + dt / CANDY_FLIGHT);
    }
    for (const { mesh, candies, flat } of batches) {
      let any = false;
      for (let slot = 0; slot < candies.length; slot++) {
        const i = candies[slot]!;
        const c = candy[i]!;
        let x = c.x;
        let y = c.y + Math.sin(clock * 2.2 + i * 1.7) * 0.045 + (i === tapped ? response * 0.12 : 0);
        let size = out[i]!;
        const t = flown[i]!;
        if (t >= 0) {
          // It swells for a moment, then shrinks into his chest.
          x = lerp(x, elofX, t * t);
          y = lerp(y, elofY + 0.55, t * t);
          size *= (1 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 2))) * (1 - t * t);
        }
        place.position.set(x, y, 0);
        // A sweet sways with its side to him, so that it always has a wrapped sweet's outline, or shows its
        // swirl or its heart. One in a wrapper also rolls slowly round its own length, and its stripes wind.
        place.rotation.set(flat ? 0.1 : clock * 1.1 + i * 0.9, Math.sin(clock * 1.7 + i * 0.9) * (flat ? 0.8 : 0.6), Math.sin(clock * 1.3 + i) * (flat ? 0.18 : 0.38));
        any ||= size > 0;
        place.scale.setScalar(size);
        place.updateMatrix();
        mesh.setMatrixAt(slot, place.matrix);
      }
      // One whose sweets are all in his bag, or all still wait for their flag, has nothing to draw (./idle.ts).
      drawnWhile(mesh, any);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  return { group, update, install };
}
