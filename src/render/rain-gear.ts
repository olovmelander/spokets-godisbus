import {
  BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, SkinnedMesh, Uint16BufferAttribute, type Object3D,
} from 'three';
import type { ChapterData } from '../sim/types';

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
