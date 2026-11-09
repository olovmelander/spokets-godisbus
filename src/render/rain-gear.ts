import {
  Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3, type Bone, type Object3D,
} from 'three';
import type { Actor } from '../sim/scene';
import type { ChapterData } from '../sim/types';
import { sample, type Clip } from './gait';
import { CLIPS } from './motion-data';
import { sleevesWithArms } from './sleeves';

/**
 * Rain gear in Stormnatten (Olov, 6 November 2026: "alla karaktärer ska ta på sig regnjacka, stövlar och grejer, så
 * att det följer storien, och att Bertil tar av sin stövel på riktigt och ger till Elof"). In Stormkvällen the
 * family pull on their raincoats and boots before they go out (scene `tillsammans`); from then on, through every
 * chapter of the storm, each wears a raincoat in a colour of their own and rubber boots to below the knee. In
 * Stormgården Bertil takes off his right boot and lays it on the flooded lawn for Elof: from then on he stands in
 * one boot and a sock.
 *
 * On a model from Blender the coat and the boots are shells of the body itself: its own triangles where the
 * coat or a boot goes, a little outside the skin, skinned to the same bones, so they follow every movement and fit
 * every body. On the rehearsal figure built in code the same parts take the coat's and the boots' colours.
 */
export interface RainGear {
  coat: string;
  boots: string;
  /** The side whose boot is off, a sock showing: the body's left is 0. */
  bootOff: 0 | 1 | null;
  /** While it is being put on (`gearOnAt`), how far each piece is on. Left out: all of it. */
  on?: GearOn;
  /** The arm that goes into its sleeve first (`FIRST_SLEEVE`): the coat goes on in its order. Left out: the left. */
  first?: 0 | 1;
}

/** How far each piece is on, from 0 (not yet) to 1 (on): the coat, and each boot (the body's left is 0). */
export interface GearOn {
  coat: number;
  boots: readonly [number, number];
}
const ALL_ON: GearOn = { coat: 1, boots: [1, 1] };

/** Not Elof: the star has made him small before the family get ready to go out (Stormkvällen's `krymper` comes before
 * `tillsammans`), so no raincoat of theirs fits him; he goes out in his own clothes. */
export type GearRole = 'mamma' | 'pappa' | 'moa' | 'bertil';

/** Each one's raincoat and boots. Bertil's boots are the green of the boot Elof rides (../content/aventyr2/render.ts). */
export const LOOK: Record<GearRole, { coat: string; boots: string }> = {
  mamma: { coat: '#b8423a', boots: '#2c3a2c' },
  pappa: { coat: '#2e4a66', boots: '#1f2124' },
  moa: { coat: '#e2b23a', boots: '#c8423a' },
  bertil: { coat: '#e0782e', boots: '#2f6b3a' },
};
export const SOCK = '#d9d2c2';

/**
 * How each puts their raincoat and boots on (Olov, 9 November 2026: "we need to make sure the putting on of the raincoats
 * works"): a clip of their own, keyed in Blender (art/blender/motion.py CLIPS) and played as the act `dress`
 * (./acting.ts). Its channels `coat`, `bootL` and `bootR` key how far each piece is on, in step with the motion: the coat
 * in the order of `COAT_ORDER`, a boot from the sole up as the foot goes into it.
 */
export const DRESSING = { mamma: 'dressMamma', pappa: 'dressPappa', moa: 'dressMoa', bertil: 'dressBertil' } as const satisfies Record<GearRole, keyof typeof CLIPS>;
/** Which arm each puts into its sleeve first (the body's left is 0): the clip and the coat's order agree on it. */
export const FIRST_SLEEVE: Record<GearRole, 0 | 1> = { mamma: 0, pappa: 1, moa: 0, bertil: 1 };

/**
 * How far the gear is on, `t` seconds after `who` began to put it on: as their clip keys it, from nothing before it to
 * all of it after. In reduced motion it is all on at once, as they begin. Null before they begin.
 */
export function gearOnAt(who: GearRole, t: number, calm = false): GearOn | null {
  if (!(t >= 0)) return null;
  if (calm) return ALL_ON;
  const clip: Clip = CLIPS[DRESSING[who]];
  const at = (keys?: readonly number[]) => (keys && keys.length >= 3 ? Math.min(1, Math.max(0, sample(keys, t))) : 1);
  return { coat: at(clip.coat), boots: [at(clip.bootL), at(clip.bootR)] };
}

/** When `who` begins to put the gear on in a chapter's scene (its first `dress` act), in the scene's seconds: or null. */
export function dressingFrom(chapter: Pick<ChapterData, 'scenes'>, scene: string, who: string): number | null {
  const keys = chapter.scenes?.find((one) => one.id === scene)?.stage?.actors?.[who as Actor];
  return keys?.find((key) => key.act === 'dress')?.at ?? null;
}

/** They are in their own clothes in Stormkvällen until they have got ready to go out together. */
const READY = 'scene:tillsammans';

/**
 * What one of the family wears now, in this chapter, with these flags, in this moment of a scene: null is their own
 * clothes. `calm`: reduced motion.
 */
export function rainGearFor(chapter: Pick<ChapterData, 'id' | 'storm' | 'scenes'>, who: string, flags: ReadonlySet<string>,
  scene?: { id: string; seconds: number } | null, calm = false): RainGear | null {
  if (!(who in LOOK) || !chapter.storm || (chapter.storm.rain ?? 0) <= 0) return null;
  const look = LOOK[who as GearRole];
  // Indoors in Stormkvällen they are in their own clothes until they get ready to go out together: then each puts it on
  // in the scene, as far as they have come.
  if (chapter.id === 'stormkvall' && !flags.has(READY)) {
    const from = scene ? dressingFrom(chapter, scene.id, who) : null;
    const on = scene && from !== null ? gearOnAt(who as GearRole, scene.seconds - from, calm) : null;
    return on && (on.coat > 0 || on.boots[0] > 0 || on.boots[1] > 0)
      ? { coat: look.coat, boots: look.boots, bootOff: null, on, first: FIRST_SLEEVE[who as GearRole] } : null;
  }
  // Bertil's right boot is on the water once he has been called to it.
  const bootOff = who === 'bertil' && chapter.id === 'stormgard' && flags.has('sg:bertil') ? 1 : null;
  return { coat: look.coat, boots: look.boots, bootOff, first: FIRST_SLEEVE[who as GearRole] };
}

/** The bones a coat covers, and those a boot does, by side. */
const COAT = new Set(['spine_01', 'spine_02', 'pelvis', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']);
const BOOT = [new Set(['calf_l', 'foot_l', 'ball_l']), new Set(['calf_r', 'foot_r', 'ball_r'])] as const;
const THIGH = new Set(['thigh_l', 'thigh_r']);

// --- the order it goes on in ------------------------------------------------------------------------------------------

/**
 * The order the coat goes on in, as shares of the clip's `coat` channel (art/blender/motion.py keys the motion to the
 * same shares): the first sleeve from the cuff up to the shoulder as the arm goes into it, and that side's front as it
 * falls from the shoulder; across the back, from that side, as the coat is swung round behind; the other sleeve and its
 * front; and, after a shrug, the open front closed from the hem up to the collar as it is zipped.
 */
export const COAT_ORDER = {
  sleeve: [0, 0.22], front: [0.22, 0.32], back: [0.32, 0.52], otherSleeve: [0.52, 0.74], otherFront: [0.74, 0.84], zip: [0.88, 1],
} as const satisfies Record<string, readonly [number, number]>;
/** How far in from its side the coat's front is open until it is zipped, as a share of the way to its middle. */
const ZIP_EDGE = 0.85;
/** What is under a piece goes a little after the piece has come over it, so that there is never a hole between them. */
const UNDER_LAG = 0.03;
/** Under nothing: no share of the gear ever hides it. */
const UNCOVERED = 9;
/** The height of each of the coat's cross-sections, in metres. */
const BAND = 0.01;
const ARM_BONE = /^(upperarm|lowerarm|hand)_([lr])$/;
const armSide = (bone: string): 0 | 1 | null => {
  const match = ARM_BONE.exec(bone);
  return match ? (match[2] === 'l' ? 0 : 1) : null;
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** A skinned mesh as it lies at rest, in the pelvis's frame and in metres (`restOf`): its corners, and each corner's bone. */
interface AtRest {
  at: Float32Array;
  owner: string[];
  /** Where a bone's joint is, in the same frame. */
  joint(name: string): Vector3 | null;
}

function atRest(mesh: SkinnedMesh): AtRest {
  const at = restOf(mesh), g = mesh.geometry;
  const skinIndex = g.getAttribute('skinIndex'), skinWeight = g.getAttribute('skinWeight');
  const names = mesh.skeleton.bones.map((bone) => bone.name);
  const owner = new Array<string>(at.length / 3);
  for (let i = 0; i < owner.length; i++) {
    let best = 0, which = 0;
    for (let k = 0; k < 4; k++) { const w = skinWeight.getComponent(i, k); if (w > best) { best = w; which = skinIndex.getComponent(i, k); } }
    owner[i] = names[which] ?? '';
  }
  const pelvis = Math.max(0, names.indexOf('pelvis'));
  return {
    at, owner,
    joint(name) {
      const k = names.indexOf(name);
      if (k < 0) return null;
      // The inverse bind matrices carry the packer's box for the mesh's units; between two of them it cancels.
      const m = new Matrix4().copy(mesh.skeleton.boneInverses[k]!).invert().premultiply(mesh.skeleton.boneInverses[pelvis]!);
      return new Vector3().setFromMatrixPosition(m);
    },
  };
}

/** The coat's shape at rest, which its order is worked out on: what it covers of the body follows the same order. */
interface CoatShape {
  low: number;
  high: number;
  /** Its cross-section at each height (BAND), without its sleeves. */
  bands: ({ x0: number; x1: number; z0: number; z1: number } | undefined)[];
  /** Each arm from the shoulder to the wrist, the body's left first. */
  arms: [{ from: Vector3; to: Vector3 } | null, { from: Vector3; to: Vector3 } | null];
  /** The arm that goes in first, and which way is ahead along z (the toes are ahead of the ankles). */
  first: 0 | 1;
  ahead: 1 | -1;
}

/** Which way is ahead in a body's frame at rest: the way its toes point from its ankles. */
function aheadOf(body: AtRest): 1 | -1 {
  let sum = 0;
  for (const side of ['l', 'r']) {
    const ankle = body.joint('foot_' + side);
    if (!ankle) continue;
    for (let i = 0; i < body.owner.length; i++) if (body.owner[i] === 'foot_' + side || body.owner[i] === 'ball_' + side) sum += body.at[i * 3 + 2]! - ankle.z;
  }
  return sum < 0 ? -1 : 1;
}

/** The coat's shape, from the corners of a coat (or of a body where a coat lies over it: `keep`). */
function coatShape(rest: AtRest, first: 0 | 1, ahead: 1 | -1, keep: (i: number) => boolean = () => true): CoatShape | null {
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < rest.owner.length; i++) {
    if (!keep(i) || armSide(rest.owner[i]!) !== null) continue;
    low = Math.min(low, rest.at[i * 3 + 1]!); high = Math.max(high, rest.at[i * 3 + 1]!);
  }
  if (!(high > low)) return null;
  const bands: CoatShape['bands'] = [];
  for (let i = 0; i < rest.owner.length; i++) {
    if (!keep(i) || armSide(rest.owner[i]!) !== null) continue;
    const x = rest.at[i * 3]!, y = rest.at[i * 3 + 1]!, z = rest.at[i * 3 + 2]!;
    const band = (bands[Math.floor((y - low) / BAND)] ??= { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
    band.x0 = Math.min(band.x0, x); band.x1 = Math.max(band.x1, x);
    band.z0 = Math.min(band.z0, z); band.z1 = Math.max(band.z1, z);
  }
  const arm = (side: 'l' | 'r') => {
    const from = rest.joint('upperarm_' + side), elbow = rest.joint('lowerarm_' + side);
    const to = rest.joint('hand_' + side) ?? (from && elbow ? elbow.clone().multiplyScalar(2).sub(from) : null);
    return from && to ? { from, to } : null;
  };
  return { low, high, bands, arms: [arm('l'), arm('r')], first, ahead };
}

const along = new Vector3(), from = new Vector3();
/** How far into putting the coat on a point of it (or under it) is covered: its share of the `coat` channel. */
function coatOrderAt(shape: CoatShape, x: number, y: number, z: number, bone: string): number {
  const span = (range: readonly [number, number], k: number) => range[0] + (range[1] - range[0]) * clamp01(k);
  const side = armSide(bone);
  if (side !== null) {
    // A sleeve, from its cuff up to the shoulder: the arm goes in from the cuff's end.
    const arm = shape.arms[side];
    let up = 0;
    if (arm) {
      along.subVectors(arm.to, arm.from);
      up = 1 - from.set(x, y, z).sub(arm.from).dot(along) / Math.max(1e-6, along.lengthSq());
    }
    return span(side === shape.first ? COAT_ORDER.sleeve : COAT_ORDER.otherSleeve, up);
  }
  const index = Math.min(shape.bands.length - 1, Math.max(0, Math.floor((y - shape.low) / BAND)));
  let band = shape.bands[index];
  for (let k = 1; !band && k < shape.bands.length; k++) band = shape.bands[index - k] ?? shape.bands[index + k];
  if (!band) return COAT_ORDER.back[0];
  const up = clamp01((y - shape.low) / (shape.high - shape.low));
  const middle = (band.x0 + band.x1) / 2, half = Math.max(1e-4, (band.x1 - band.x0) / 2);
  const firstX = shape.arms[shape.first]?.from.x ?? middle + (shape.first === 0 ? half : -half);
  const otherX = shape.arms[1 - shape.first]?.from.x ?? middle - (firstX - middle);
  if ((z - (band.z0 + band.z1) / 2) * shape.ahead >= 0) {
    // The front: each side falls from its shoulder once its arm is in, and the middle closes from the hem up.
    if (1 - Math.abs(x - middle) / half >= ZIP_EDGE) return span(COAT_ORDER.zip, up);
    const onFirst = (x - middle) * (firstX - middle) >= 0;
    return span(onFirst ? COAT_ORDER.front : COAT_ORDER.otherFront, 1 - up);
  }
  // The back, swept across from the first arm's side, a little ahead at the collar.
  const across = (x - firstX) / (Math.abs(otherX - firstX) > 1e-4 ? otherX - firstX : 1);
  return span(COAT_ORDER.back, 0.85 * clamp01(across) + 0.15 * (1 - up));
}

/** A boot's height at rest, which it goes on over from the sole up. */
function bootSpan(rest: AtRest, keep: (i: number) => boolean = () => true): [number, number] | null {
  let low = Infinity, high = -Infinity;
  for (let i = 0; i < rest.owner.length; i++) if (keep(i)) { low = Math.min(low, rest.at[i * 3 + 1]!); high = Math.max(high, rest.at[i * 3 + 1]!); }
  return high > low ? [low, high] : null;
}
const bootOrderAt = (span: [number, number], y: number) => clamp01((y - span[0]) / (span[1] - span[0]));

/**
 * A piece of the gear drawn as far as it is on: its corners with their order (`gearOrder`), and its material's uniform
 * `gearOn`, how far it is on (above 1, all of it). Every piece of every one of the family shares the one program, made
 * in the warm-up with the rest of the chapter (they are in the scene, hidden, from when they are made).
 */
function revealed(mesh: SkinnedMesh, order: Float32Array): { value: number } {
  mesh.geometry.setAttribute('gearOrder', new BufferAttribute(order, 1));
  const on = { value: 2 };
  const material = mesh.material as MeshStandardMaterial;
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.gearOn = on;
    shader.vertexShader = 'attribute float gearOrder;\nvarying float vGearOrder;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGearOrder = gearOrder;');
    shader.fragmentShader = 'uniform float gearOn;\nvarying float vGearOrder;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n  if (vGearOrder > gearOn) discard;');
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:gear-on`;
  material.needsUpdate = true;
  return on;
}

/** A share of a piece as its uniform has it: all of it from 1, so that no rounding leaves a corner out. */
const shown = (on: number) => (on >= 1 ? 2 : on);

interface Shells {
  coat: SkinnedMesh;
  boots: [SkinnedMesh, SkinnedMesh];
  socks: [SkinnedMesh, SkinnedMesh];
  /** How far each is on, as its material reads it (`revealed`). */
  on: { coat: { value: number }; boots: [{ value: number }, { value: number }] };
  /** The arm the coat's order is worked out for, and working it out again for the other. */
  first: 0 | 1;
  reorder(first: 0 | 1): void;
}

/**
 * The coat's and the boots' shells for one skinned body, built once, hidden. `height` is the body's height in EL,
 * which says how far out of the skin a shell lies.
 */
export function buildShells(body: SkinnedMesh, height: number): Shells | null {
  const g = body.geometry;
  const position = g.getAttribute('position');
  const normal = g.getAttribute('normal');
  const skinIndex = g.getAttribute('skinIndex');
  const skinWeight = g.getAttribute('skinWeight');
  if (!position || !normal || !skinIndex || !skinWeight) return null;
  const bones = body.skeleton.bones.map((bone) => bone.name);
  const count = position.count;
  // Which bone each corner belongs to most.
  const owner: string[] = new Array(count);
  for (let i = 0; i < count; i++) {
    let best = 0, which = 0;
    for (let k = 0; k < 4; k++) {
      const w = skinWeight.getComponent(i, k);
      if (w > best) { best = w; which = skinIndex.getComponent(i, k); }
    }
    owner[i] = bones[which] ?? '';
  }
  // How tall the body is in its own units, and the height range of its thighs' and calves' corners.
  let low = Infinity, high = -Infinity;
  const range = new Map<string, [number, number]>();
  for (let i = 0; i < count; i++) {
    const y = position.getY(i);
    low = Math.min(low, y); high = Math.max(high, y);
    const r = range.get(owner[i]!) ?? [Infinity, -Infinity];
    r[0] = Math.min(r[0], y); r[1] = Math.max(r[1], y);
    range.set(owner[i]!, r);
  }
  const unit = (high - low) / height;
  const index = g.index;
  const triangles = index ? index.count / 3 : count / 3;
  const corner = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  // The coat goes down over the upper part of the thighs; a boot up to a little under the knee.
  const thighCut = (name: string) => { const r = range.get(name)!; return r[0] + (r[1] - r[0]) * 0.55; };
  const calfCut = (name: string) => { const r = range.get(name)!; return r[0] + (r[1] - r[0]) * 0.82; };
  const inCoat = (i: number) => COAT.has(owner[i]!) || (THIGH.has(owner[i]!) && position.getY(i) > thighCut(owner[i]!));
  const inBoot = (side: 0 | 1) => (i: number) => BOOT[side].has(owner[i]!) && (!owner[i]!.startsWith('calf') || position.getY(i) < calfCut(owner[i]!));

  function shell(keep: (i: number) => boolean, out: number, colour: string, glossy: number): { mesh: SkinnedMesh; picked: number[] } {
    const picked: number[] = [];
    for (let t = 0; t < triangles; t++) {
      const a = corner(t, 0), b = corner(t, 1), c = corner(t, 2);
      // A triangle is in it when most of its corners are.
      if ((keep(a) ? 1 : 0) + (keep(b) ? 1 : 0) + (keep(c) ? 1 : 0) >= 2) picked.push(a, b, c);
    }
    const n = picked.length;
    const positions = new Float32Array(n * 3), normals = new Float32Array(n * 3), indices = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
    for (const [j, i] of picked.entries()) {
      const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
      const len = Math.hypot(nx, ny, nz) || 1;
      positions.set([position.getX(i) + (nx / len) * out * unit, position.getY(i) + (ny / len) * out * unit, position.getZ(i) + (nz / len) * out * unit], j * 3);
      normals.set([nx / len, ny / len, nz / len], j * 3);
      for (let k = 0; k < 4; k++) { indices[j * 4 + k] = skinIndex.getComponent(i, k); weights[j * 4 + k] = skinWeight.getComponent(i, k); }
    }
    const made = new BufferGeometry();
    made.setAttribute('position', new Float32BufferAttribute(positions, 3));
    made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    made.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4));
    made.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
    const mesh = new SkinnedMesh(made, new MeshStandardMaterial({ color: colour, roughness: glossy }));
    mesh.bind(body.skeleton, body.bindMatrix);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.scale.copy(body.scale);
    mesh.frustumCulled = false;
    // The body's shadow is its capsule's (./character-shadows.ts), and so is the gear's.
    mesh.castShadow = false;
    mesh.visible = false;
    mesh.name = 'rain-gear';
    body.parent?.add(mesh);
    return { mesh, picked };
  }
  // A raincoat is shiny and stands a little off the body; a rubber boot is shinier and stands further out.
  const coat = shell(inCoat, 0.05, '#ffffff', 0.38);
  const boots = [shell(inBoot(0), 0.07, '#ffffff', 0.3), shell(inBoot(1), 0.07, '#ffffff', 0.3)] as const;
  // They go on in the order of the body's own corners at rest: the coat as `COAT_ORDER`, a boot from the sole up.
  const rest = atRest(body), ahead = aheadOf(rest);
  const coatOrder = new Float32Array(coat.picked.length);
  const bootOn = ([0, 1] as const).map((side) => {
    const span = bootSpan(rest, inBoot(side));
    return revealed(boots[side].mesh, Float32Array.from(boots[side].picked, (i) => (span ? bootOrderAt(span, rest.at[i * 3 + 1]!) : 0)));
  });
  const made: Shells = {
    coat: coat.mesh,
    boots: [boots[0].mesh, boots[1].mesh],
    socks: [shell(inBoot(0), 0.015, SOCK, 0.95).mesh, shell(inBoot(1), 0.015, SOCK, 0.95).mesh],
    on: { coat: revealed(coat.mesh, coatOrder), boots: [bootOn[0]!, bootOn[1]!] },
    first: 0,
    reorder(first) {
      const shape = coatShape(rest, first, ahead, inCoat);
      coat.picked.forEach((i, j) => { coatOrder[j] = shape ? coatOrderAt(shape, rest.at[i * 3]!, rest.at[i * 3 + 1]!, rest.at[i * 3 + 2]!, rest.owner[i]!) : 0; });
      coat.mesh.geometry.getAttribute('gearOrder').needsUpdate = true;
      made.first = first;
    },
  };
  made.reorder(0);
  return made;
}

/** Shows the gear on a model's shells (or takes it off, with null). */
export function wearShells(shells: Shells, gear: RainGear | null): void {
  const on = gear?.on ?? ALL_ON;
  if (gear && (gear.first ?? 0) !== shells.first) shells.reorder(gear.first ?? 0);
  shells.coat.visible = gear !== null && on.coat > 0;
  shells.on.coat.value = shown(on.coat);
  if (gear) (shells.coat.material as MeshStandardMaterial).color.set(gear.coat);
  for (const side of [0, 1] as const) {
    const off = gear?.bootOff === side;
    shells.boots[side].visible = gear !== null && !off && on.boots[side] > 0;
    shells.on.boots[side].value = shown(on.boots[side]);
    shells.socks[side].visible = gear !== null && off;
    if (gear) (shells.boots[side].material as MeshStandardMaterial).color.set(gear.boots);
  }
}

/** The body mesh of a model: its largest skinned mesh. */
export function bodyOf(model: Object3D): SkinnedMesh | null {
  let best: SkinnedMesh | null = null;
  model.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh || mesh.name === 'rain-gear') return;
    if (!best || mesh.geometry.getAttribute('position').count > best.geometry.getAttribute('position').count) best = mesh;
  });
  return best;
}

/**
 * A wardrobe made in Blender for one of the family (the private repository's family/wardrobe.py, exported as
 * `<who>-wardrobe.glb`): a raincoat with its hood, collar, zip, pocket flaps and cuffs; rubber boots to below the knee,
 * each its own piece; the socks under them; and, for Bertil, his own hair for when he has lent his cap. Every piece is
 * skinned to the same skeleton as the approved model, so it is bound here to the model's own bones, by name, and worn
 * over it. Each takes a copy of the body's own material (its gloss changed), so that no new shader is made for it.
 */
export interface Wardrobe {
  coat: SkinnedMesh | null;
  boots: [SkinnedMesh | null, SkinnedMesh | null];
  socks: [SkinnedMesh | null, SkinnedMesh | null];
  hair: SkinnedMesh | null;
  /** What of the body is under the coat and each boot is not drawn while they are worn: x coat, y left boot, z right. */
  cover: { value: Vector3 } | null;
  /** 1 while the cap is on: then the hair is drawn only below its brim, at the sides, the back and the nape. */
  capped: { value: number } | null;
  /** How far the coat and each boot are on, as their materials read it (`revealed`). */
  on: { coat: { value: number } | null; boots: [{ value: number } | null, { value: number } | null] };
  /** The arm the coat's order is worked out for (`FIRST_SLEEVE`), and working it out again for the other. */
  first: 0 | 1;
  reorder(first: 0 | 1): void;
}

const COVERED_BY_COAT = new Set(['pelvis', 'spine_01', 'spine_02', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'thigh_l', 'thigh_r']);

/**
 * Marks each corner of the body by what covers it, from where it lies at rest and which bone moves it most, and has
 * the body's material leave out what is covered while it is worn. A shirt under a raincoat moves a little otherwise
 * than the coat (its sleeve is one with its side, the coat's is set in), and would show through it as an arm goes
 * up; what is not drawn cannot. Where a boot is off its side is drawn again, and the sock goes over the shoe.
 */
function hideUnder(body: SkinnedMesh, coat: SkinnedMesh | null, boots: [SkinnedMesh | null, SkinnedMesh | null]): { value: Vector3 } | null {
  const g = body.geometry;
  const position = g.getAttribute('position'), skinIndex = g.getAttribute('skinIndex'), skinWeight = g.getAttribute('skinWeight');
  if (!position || !skinIndex || !skinWeight) return null;
  const names = body.skeleton.bones.map((bone) => bone.name);
  // The packer quantizes each mesh in a box of its own and moves that into the skin's inverse bind matrices, so the
  // body's and each piece's positions are in different units. The pelvis's frame at rest is shared and in metres.
  const atRest = (mesh: SkinnedMesh) => {
    const k = Math.max(0, mesh.skeleton.bones.findIndex((bone) => bone.name === 'pelvis'));
    return new Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[k], mesh.bindMatrix);
  };
  const v = new Vector3();
  const rested = (mesh: SkinnedMesh) => {
    const p = mesh.geometry.getAttribute('position'), m = atRest(mesh), out = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    return out;
  };
  const box = (mesh: SkinnedMesh | null) => {
    if (!mesh) return null;
    const p = rested(mesh), b = new Box3();
    for (let i = 0; i < p.length; i += 3) b.expandByPoint(v.set(p[i], p[i + 1], p[i + 2]));
    return b;
  };
  const coatBox = box(coat), bootBoxes = boots.map(box);
  // The coat's cross-section at each height, without its sleeves: what of the trunk lies inside it is under it, and
  // what lies outside (Mamma's braid over her front) is not.
  const BAND = 0.01;
  const bands: { x0: number; x1: number; z0: number; z1: number }[] = [];
  if (coat && coatBox) {
    const p = rested(coat), si = coat.geometry.getAttribute('skinIndex'), sw = coat.geometry.getAttribute('skinWeight');
    const own = coat.skeleton.bones.map((bone) => bone.name);
    for (let i = 0; i < p.length / 3; i++) {
      let best = 0, which = 0;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > best) { best = w; which = si.getComponent(i, k); } }
      if (/arm/.test(own[which] ?? '')) continue;
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      const band = (bands[Math.floor((y - coatBox.min.y) / BAND)] ??= { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
      band.x0 = Math.min(band.x0, x); band.x1 = Math.max(band.x1, x);
      band.z0 = Math.min(band.z0, z); band.z1 = Math.max(band.z1, z);
    }
  }
  const insideCoat = (x: number, y: number, z: number) => {
    const band = coatBox ? bands[Math.floor((y - coatBox.min.y) / BAND)] : undefined;
    if (!band || !Number.isFinite(band.x0)) return false;
    const rx = (band.x1 - band.x0) / 2 * 0.97, rz = (band.z1 - band.z0) / 2 * 0.97;
    const dx = (x - (band.x0 + band.x1) / 2) / rx, dz = (z - (band.z0 + band.z1) / 2) / rz;
    return dx * dx + dz * dz < 1;
  };
  const rest = rested(body);
  const cover = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    let best = 0, which = 0;
    for (let k = 0; k < 4; k++) { const w = skinWeight.getComponent(i, k); if (w > best) { best = w; which = skinIndex.getComponent(i, k); } }
    const bone = names[which] ?? '', x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    // Under the coat: between its hem and a little under the top of its collar, on the trunk, the arms to the wrist
    // and the thighs; under a boot: the foot and the calf, below the boot's top.
    if (coatBox && COVERED_BY_COAT.has(bone) && y > coatBox.min.y + 0.004 && y < coatBox.max.y - 0.02
      && (/arm/.test(bone) || insideCoat(x, y, z))) cover[i * 3] = 1;
    for (const side of [0, 1] as const) {
      const tag = side === 0 ? '_l' : '_r', b = bootBoxes[side];
      if (b && (bone === 'foot' + tag || bone === 'calf' + tag) && y < b.max.y - 0.012) cover[i * 3 + 1 + side] = 1;
    }
  }
  g.setAttribute('wardrobeCover', new Float32BufferAttribute(cover, 3));
  // Each corner is drawn until what covers it has come over it (`inOrder`): −1, nothing is worn.
  const uniform = { value: new Vector3(-1, -1, -1) };
  const material = body.material as MeshStandardMaterial;
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.wardrobeWorn = uniform;
    shader.vertexShader = 'attribute vec3 wardrobeCover;\nvarying vec3 vWardrobeCover;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWardrobeCover = wardrobeCover;');
    shader.fragmentShader = 'uniform vec3 wardrobeWorn;\nvarying vec3 vWardrobeCover;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n  if (any(lessThanEqual(vWardrobeCover, wardrobeWorn))) discard;');
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:wardrobe-cover`;
  material.needsUpdate = true;
  return uniform;
}

/**
 * What the coat and the boots cover of the body (`hideUnder`) goes in their order as they are put on: a covered corner
 * holds the share of the piece over it at which it is covered, a little after the piece's own, and one that is not
 * covered never goes (`UNCOVERED`). Returns what works the coat's out again, for the arm that goes in first.
 */
function inOrder(body: SkinnedMesh, boots: [SkinnedMesh | null, SkinnedMesh | null]): (shape: CoatShape | null) => void {
  const attribute = body.geometry.getAttribute('wardrobeCover') as Float32BufferAttribute;
  const cover = attribute.array as Float32Array, rest = atRest(body);
  const spans = boots.map((boot) => (boot ? bootSpan(atRest(boot)) : null));
  const underCoat: number[] = [];
  for (let i = 0; i < cover.length / 3; i++) {
    if (cover[i * 3]! > 0.5) underCoat.push(i);
    cover[i * 3] = UNCOVERED;
    for (const side of [0, 1] as const) {
      const span = spans[side];
      cover[i * 3 + 1 + side] = cover[i * 3 + 1 + side]! > 0.5 && span ? bootOrderAt(span, rest.at[i * 3 + 1]!) + UNDER_LAG : UNCOVERED;
    }
  }
  attribute.needsUpdate = true;
  return (shape) => {
    for (const i of underCoat) cover[i * 3] = (shape ? coatOrderAt(shape, rest.at[i * 3]!, rest.at[i * 3 + 1]!, rest.at[i * 3 + 2]!, rest.owner[i]!) : 0) + UNDER_LAG;
    attribute.needsUpdate = true;
  };
}

/** The model's cap, where it has one: its own part, painted with its own material ("... cap"). */
function capOf(model: Object3D): SkinnedMesh | null {
  let cap: SkinnedMesh | null = null;
  model.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (mesh.isSkinnedMesh && !Array.isArray(mesh.material) && /\bcap$/.test((mesh.material as MeshStandardMaterial).name)) cap = mesh;
  });
  return cap;
}

/** A skinned mesh's corners where they lie at rest, in the pelvis's frame and in metres (see `hideUnder`). */
function restOf(mesh: SkinnedMesh): Float32Array {
  const k = Math.max(0, mesh.skeleton.bones.findIndex((bone) => bone.name === 'pelvis'));
  const m = new Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[k], mesh.bindMatrix);
  const p = mesh.geometry.getAttribute('position'), out = new Float32Array(p.count * 3), v = new Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
  return out;
}

/**
 * Bertil's own hair under his cap (Olov: "Bertil har hår på huvudet under kepsen nu va?"): the hair is drawn while the
 * cap is on too, but only below the cap's brim all round, so that it shows at the sides, the back and the nape and
 * nothing of it comes through the cap. The brim is found sector by sector round the head, at rest.
 */
function hairUnderCap(hair: SkinnedMesh, cap: SkinnedMesh): { value: number } {
  const c = restOf(cap), h = restOf(hair);
  let cx = 0, cz = 0;
  for (let i = 0; i < c.length; i += 3) { cx += c[i]!; cz += c[i + 2]!; }
  cx /= c.length / 3; cz /= c.length / 3;
  const SECTORS = 24;
  const brim = new Array<number>(SECTORS).fill(Infinity);
  const sector = (x: number, z: number) => ((Math.floor(((Math.atan2(z - cz, x - cx) / (Math.PI * 2)) + 1) * SECTORS)) % SECTORS);
  for (let i = 0; i < c.length; i += 3) { const k = sector(c[i]!, c[i + 2]!); brim[k] = Math.min(brim[k]!, c[i + 1]!); }
  // A sector the cap does not reach takes its neighbours' brim.
  for (let k = 0; k < SECTORS; k++) if (!Number.isFinite(brim[k])) brim[k] = Math.min(brim[(k + 1) % SECTORS]!, brim[(k + SECTORS - 1) % SECTORS]!);
  const under = new Float32Array(h.length / 3);
  for (let i = 0; i < under.length; i++) {
    const y = h[i * 3 + 1]!, at = brim[sector(h[i * 3]!, h[i * 3 + 2]!)]!;
    under[i] = y > at - 0.004 ? 1 : 0;
  }
  hair.geometry.setAttribute('underCap', new Float32BufferAttribute(under, 1));
  const uniform = { value: 1 };
  const material = hair.material as MeshStandardMaterial;
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.hairCapped = uniform;
    shader.vertexShader = 'attribute float underCap;\nvarying float vUnderCap;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vUnderCap = underCap;');
    shader.fragmentShader = 'uniform float hairCapped;\nvarying float vUnderCap;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n  if (hairCapped > 0.5 && vUnderCap > 0.5) discard;');
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:hair-under-cap`;
  material.needsUpdate = true;
  return uniform;
}

const GLOSS: [RegExp, number][] = [[/raincoat$/, 0.4], [/boot_[lr]$/, 0.28], [/sock_[lr]$/, 0.95]];

export function fitWardrobe(model: Object3D, made: Object3D): Wardrobe | null {
  const body = bodyOf(model);
  if (!body) return null;
  const bones = new Map(body.skeleton.bones.map((bone) => [bone.name, bone]));
  const pieces: SkinnedMesh[] = [];
  made.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) pieces.push(node as SkinnedMesh); });
  const out: Wardrobe = {
    coat: null, boots: [null, null], socks: [null, null], hair: null, cover: null, capped: null, on: { coat: null, boots: [null, null] },
    first: 0, reorder: () => {},
  };
  for (const piece of pieces) {
    const own = piece.skeleton.bones.map((bone) => bones.get(bone.name));
    if (own.some((bone) => !bone)) continue;
    const material = (body.material as MeshStandardMaterial).clone();
    material.roughness = GLOSS.find(([name]) => name.test(piece.name))?.[1] ?? material.roughness;
    const mesh = new SkinnedMesh(piece.geometry, material);
    mesh.name = 'rain-gear';
    mesh.userData.wardrobe = piece.name;
    mesh.bind(new Skeleton(own as Bone[], piece.skeleton.boneInverses), body.bindMatrix);
    // The coat's sleeves go with the arms, as the body's own do (./sleeves.ts).
    sleevesWithArms(mesh);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.scale.copy(body.scale);
    mesh.frustumCulled = false;
    mesh.visible = false;
    body.parent?.add(mesh);
    const side = piece.name.endsWith('_l') ? 0 : 1;
    if (/raincoat$/.test(piece.name)) out.coat = mesh;
    else if (/boot_[lr]$/.test(piece.name)) out.boots[side] = mesh;
    else if (/sock_[lr]$/.test(piece.name)) out.socks[side] = mesh;
    else if (/hair$/.test(piece.name)) out.hair = mesh;
  }
  out.cover = hideUnder(body, out.coat, out.boots);
  // They go on in order (`COAT_ORDER`, a boot from the sole up), and what they cover goes with them.
  const ahead = aheadOf(atRest(body));
  const coatRest = out.coat ? atRest(out.coat) : null, coatOrder = new Float32Array(coatRest?.owner.length ?? 0);
  if (out.coat) out.on.coat = revealed(out.coat, coatOrder);
  for (const side of [0, 1] as const) {
    const boot = out.boots[side];
    if (!boot) continue;
    const rest = atRest(boot), span = bootSpan(rest);
    out.on.boots[side] = revealed(boot, Float32Array.from(rest.owner, (_, i) => (span ? bootOrderAt(span, rest.at[i * 3 + 1]!) : 0)));
  }
  const under = out.cover ? inOrder(body, out.boots) : null;
  out.reorder = (first) => {
    const shape = coatRest ? coatShape(coatRest, first, ahead) : null;
    if (out.coat && coatRest && shape) {
      for (let i = 0; i < coatOrder.length; i++) coatOrder[i] = coatOrderAt(shape, coatRest.at[i * 3]!, coatRest.at[i * 3 + 1]!, coatRest.at[i * 3 + 2]!, coatRest.owner[i]!);
      out.coat.geometry.getAttribute('gearOrder').needsUpdate = true;
    }
    under?.(shape);
    out.first = first;
  };
  out.reorder(0);
  const cap = capOf(model);
  out.capped = out.hair && cap ? hairUnderCap(out.hair, cap) : null;
  return out;
}

/** Shows the wardrobe's rain gear as `gear` says (or takes it off, with null), as far as it is on. */
export function wearWardrobe(wardrobe: Wardrobe, gear: RainGear | null): void {
  const on = gear?.on ?? ALL_ON;
  if (gear && (gear.first ?? 0) !== wardrobe.first) wardrobe.reorder(gear.first ?? 0);
  if (wardrobe.coat) wardrobe.coat.visible = gear !== null && on.coat > 0;
  if (wardrobe.on.coat) wardrobe.on.coat.value = shown(on.coat);
  for (const side of [0, 1] as const) {
    const off = gear?.bootOff === side;
    if (wardrobe.boots[side]) wardrobe.boots[side]!.visible = gear !== null && !off && on.boots[side] > 0;
    if (wardrobe.on.boots[side]) wardrobe.on.boots[side]!.value = shown(on.boots[side]);
    if (wardrobe.socks[side]) wardrobe.socks[side]!.visible = gear !== null && off;
  }
  // What is under a piece goes as far as the piece has come over it (−1: none of it).
  const under = (piece: SkinnedMesh | null, share: number, off = false) => (gear && piece && !off && share > 0 ? shown(share) : -1);
  wardrobe.cover?.value.set(under(wardrobe.coat, on.coat), under(wardrobe.boots[0], on.boots[0], gear?.bootOff === 0),
    under(wardrobe.boots[1], on.boots[1], gear?.bootOff === 1));
}
