import {
  Box3, BufferGeometry, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3, type Bone, type Object3D,
} from 'three';
import type { ChapterData } from '../sim/types';
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
}

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

/** What one of the family wears now, in this chapter, with these flags: null is their own clothes. */
/**
 * When each puts their gear on in Stormkvällen's scene `tillsammans`, in seconds: as each speaks of getting ready,
 * Bertil as he stamps into his boots.
 */
const GETS_READY: Record<GearRole, number> = { mamma: 1.0, pappa: 3.0, bertil: 4.8, moa: 7.0 };

export function rainGearFor(chapter: Pick<ChapterData, 'id' | 'storm'>, who: string, flags: ReadonlySet<string>, scene?: { id: string; seconds: number } | null): RainGear | null {
  if (!(who in LOOK) || !chapter.storm || (chapter.storm.rain ?? 0) <= 0) return null;
  // Indoors in Stormkvällen they are in their own clothes until they get ready to go out together, one by one.
  if (chapter.id === 'stormkvall' && !flags.has('scene:tillsammans')
    && !(scene?.id === 'tillsammans' && scene.seconds >= GETS_READY[who as GearRole])) return null;
  const look = LOOK[who as GearRole];
  // Bertil's right boot is on the water once he has been called to it.
  const bootOff = who === 'bertil' && chapter.id === 'stormgard' && flags.has('sg:bertil') ? 1 : null;
  return { coat: look.coat, boots: look.boots, bootOff };
}

/** The bones a coat covers, and those a boot does, by side. */
const COAT = new Set(['spine_01', 'spine_02', 'pelvis', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r']);
const BOOT = [new Set(['calf_l', 'foot_l', 'ball_l']), new Set(['calf_r', 'foot_r', 'ball_r'])] as const;
const THIGH = new Set(['thigh_l', 'thigh_r']);

interface Shells { coat: SkinnedMesh; boots: [SkinnedMesh, SkinnedMesh]; socks: [SkinnedMesh, SkinnedMesh] }

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

  function shell(keep: (i: number) => boolean, out: number, colour: string, glossy: number): SkinnedMesh {
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
    return mesh;
  }
  return {
    // A raincoat is shiny and stands a little off the body; a rubber boot is shinier and stands further out.
    coat: shell(inCoat, 0.05, '#ffffff', 0.38),
    boots: [shell(inBoot(0), 0.07, '#ffffff', 0.3), shell(inBoot(1), 0.07, '#ffffff', 0.3)],
    socks: [shell(inBoot(0), 0.015, SOCK, 0.95), shell(inBoot(1), 0.015, SOCK, 0.95)],
  };
}

/** Shows the gear on a model's shells (or takes it off, with null). */
export function wearShells(shells: Shells, gear: RainGear | null): void {
  shells.coat.visible = gear !== null;
  if (gear) (shells.coat.material as MeshStandardMaterial).color.set(gear.coat);
  for (const side of [0, 1] as const) {
    const off = gear?.bootOff === side;
    shells.boots[side].visible = gear !== null && !off;
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
  const uniform = { value: new Vector3() };
  const material = body.material as MeshStandardMaterial;
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.wardrobeWorn = uniform;
    shader.vertexShader = 'attribute vec3 wardrobeCover;\nvarying vec3 vWardrobeCover;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWardrobeCover = wardrobeCover;');
    shader.fragmentShader = 'uniform vec3 wardrobeWorn;\nvarying vec3 vWardrobeCover;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n  if (dot(vWardrobeCover, wardrobeWorn) > 0.5) discard;');
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:wardrobe-cover`;
  material.needsUpdate = true;
  return uniform;
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
  const out: Wardrobe = { coat: null, boots: [null, null], socks: [null, null], hair: null, cover: null, capped: null };
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
  const cap = capOf(model);
  out.capped = out.hair && cap ? hairUnderCap(out.hair, cap) : null;
  return out;
}

/** Shows the wardrobe's rain gear as `gear` says (or takes it off, with null). */
export function wearWardrobe(wardrobe: Wardrobe, gear: RainGear | null): void {
  if (wardrobe.coat) wardrobe.coat.visible = gear !== null;
  for (const side of [0, 1] as const) {
    const off = gear?.bootOff === side;
    if (wardrobe.boots[side]) wardrobe.boots[side]!.visible = gear !== null && !off;
    if (wardrobe.socks[side]) wardrobe.socks[side]!.visible = gear !== null && off;
  }
  wardrobe.cover?.value.set(gear && wardrobe.coat ? 1 : 0, gear && wardrobe.boots[0] && gear.bootOff !== 0 ? 1 : 0, gear && wardrobe.boots[1] && gear.bootOff !== 1 ? 1 : 0);
}
