import { BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Vector3, type Mesh } from 'three';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';
import { KIT } from '../dressing/kit';
import { setPlayer, sway } from '../wind';
import { bed, fern, floor, mushrooms } from './flora/floor';
import { Cards, PLANT, glowing, leafAtlas, leafy } from './flora/light';
import { SHAPES, STAND, grove, plant, type TreeKind } from './flora/trees';
import { whirl } from './flora/whirl';

/**
 * The visual upgrade's flora (docs/visual-upgrade.md): birch crowns with the low sun through their leaves, pines
 * and spruces with their crowns between the path and the far pictures, ferns, soft moss on stones, mushrooms that
 * glow in the dark, plants that bend as he goes through them, and leaves he kicks up as he runs.
 *
 * Everything is built here, as the view is made, so that its warm-up compiles it (gate 6). What is new is on the
 * rich layer, which Low does not draw, but for the boughs of the trunks that were there: one draw call on Low.
 * Every leaf is one program (`leafy`), and everything that sways sways by the one wind (../wind.ts).
 */

/** How much of what is counted down each tier keeps (plan §6.5). */
export const SHARE = { low: 0.3, mid: 0.6, high: 1 } as const;

/** One leaf material: the atlas, its cards' colours, and the sun through it. Each sways in its own way, by the one wind. */
function leafMaterial(blade: number, near: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ map: leafAtlas(), alphaTest: 0.42, side: DoubleSide, vertexColors: true, roughness: 0.82 });
  sway(material, blade, 0, 0, 1, near);
  return leafy(material);
}

/** A card the size of 1 for a leaf in the air: its middle at the origin. */
function single(): BufferGeometry {
  const cards = new Cards();
  cards.card([0, -0.5, 0], Math.PI / 2, 1, 0.7, 'leaf', new Color(1, 1, 1));
  return cards.build();
}

/** How many of its instances a mesh shows on a tier: they were laid in a random order, so any first share is spread. */
function counted(mesh: InstancedMesh, all: number, tier: ExtraFrame['tier']): void {
  mesh.count = Math.max(1, Math.round(all * SHARE[tier]));
}

export function flora(context: ExtraContext): ViewExtra | null {
  const { chapter, scene, sun, dressing } = context;
  if (!chapter.place) return null;
  // TEMP(flora): measuring what the flora costs. Removed before hand-off.
  if (import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('noflora')) return null;
  const group = new Group();
  group.name = 'flora';
  // The sun's direction does not change as the shadow's camera follows him.
  PLANT.leafSun.value.copy(sun.position).sub(sun.target.position).normalize();
  const crowns = leafMaterial(0.012, 0);
  const boughs = leafMaterial(0.008, 0);
  const fronds = leafMaterial(0.06, 1);
  const litter = leafMaterial(0, 0);

  // The trees: the boughs of the trunks that are there on every tier, the rest only on Mid and High.
  const trees = plant(chapter, dressing);
  const counts: { mesh: InstancedMesh; all: number }[] = [];
  for (const kind of Object.keys(trees) as TreeKind[]) {
    const list = trees[kind];
    const own = kind === 'birchBoughs' || kind === 'spruceBoughs';
    const mesh = grove(SHAPES[kind](), own ? boughs : crowns, own ? list : shuffle(list), `flora-${kind}`, own ? undefined : STAND[chapter.place]);
    if (!mesh) continue;
    if (!own) {
      mesh.userData.rich = true;
      counts.push({ mesh, all: list.length });
    }
    group.add(mesh);
  }

  // The floor: ferns, mushrooms, and moss on the mountain's stones.
  const ground = floor(chapter, dressing, [...trees.pine, ...trees.spruce]);
  const fernMesh = bed(fern(), fronds, shuffle(ground.ferns), 'flora-ferns');
  const caps = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#000000' });
  const mushMesh = bed(mushrooms(), glowing(caps), shuffle(ground.caps), 'flora-mushrooms');
  const mossMesh = bed(KIT.ball, KIT.moss, ground.moss, 'flora-moss', 0.42);
  for (const [mesh, all] of [[fernMesh, ground.ferns.length], [mushMesh, ground.caps.length], [mossMesh, 0]] as const) {
    if (!mesh) continue;
    mesh.userData.rich = true;
    if (all > 0) counts.push({ mesh, all });
    group.add(mesh);
  }
  // The moss sits on its stone's top, whatever shape the stone is: the kit's take the stand-ins' places later.
  const seat = mossMesh ? seating(mossMesh, ground.moss, dressing) : null;

  const air = whirl(chapter, single(), litter);
  if (air) group.add(air.mesh);
  scene.add(group);
  // TEMP(flora): for measuring, removed before hand-off.
  if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __flora?: Group }).__flora = group;

  // How dark it is for the mushrooms: the frame's night, the blue hour, and Äventyr 2's stormy night.
  const night = chapter.storm ? 0.85 : chapter.place === 'dusk' ? 0.45 : 0;
  let tier: ExtraFrame['tier'] | null = null;
  let since = 0;
  const sheen = new Color();
  return {
    update(frame) {
      const { dt, still } = frame;
      // He bends what grows round him (../wind.ts): not while he rides, climbs or flies.
      const afoot = !frame.riding && (frame.mode ?? 'free') !== 'climb' && frame.mode !== 'fly' && frame.mode !== 'bubble';
      setPlayer(frame.x, frame.y, frame.vx ?? 0, dt, still, afoot ? 1 : 0);
      // The sun through the leaves, the sheen on the moss, as the place's light is now.
      PLANT.leafLight.value.copy(sun.color).multiplyScalar(Math.min(1.1, sun.intensity * 0.24));
      const sky = context.hemisphere;
      PLANT.mossSheen.value.copy(sun.color).multiplyScalar(Math.min(0.4, sun.intensity * 0.08))
        .add(sheen.copy(sky.color).multiplyScalar(sky.intensity * 0.08));
      const dark = Math.max(frame.darkness ?? 0, night);
      PLANT.mushGlow.value = 2.4 * Math.min(1, Math.max(0, (dark - 0.15) / 0.6)) ** 1.5;
      if (!still) PLANT.mushTime.value += dt;
      // What is counted down by the tier, when the tier changes; and the dressing's tall grass every few seconds
      // too, since the forest's stretches are built again when its kit arrives.
      since += dt;
      if (frame.tier !== tier || since > 2) {
        since = 0;
        if (frame.tier !== tier) for (const { mesh, all } of counts) counted(mesh, all, frame.tier);
        tier = frame.tier;
        const share = SHARE[tier];
        dressing?.traverse((object) => {
          const tall = object.userData.tall as [number, number] | undefined;
          if (tall) (object as InstancedMesh).count = tall[0] + Math.round(tall[1] * share);
        });
      }
      seat?.();
      air?.update(frame);
    },
  };
}

/** A copy in a random order: what a tier counts down is then spread over the chapter, not cut at its end. */
function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  let s = out.length * 7919 + 17;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Seats the moss on the mountain's stones: on the highest point of each stone's shape near its middle. Done when
 * the view is made, and again when the mountain's kit has given the stones their own shapes.
 */
function seating(mesh: InstancedMesh, list: readonly { x: number; z: number; size: number; turn: number }[], dressing: Group | null | undefined) {
  let stones: Mesh | null = null;
  dressing?.traverse((object) => {
    if ((object.userData.mountain as { stones?: unknown } | undefined)?.stones) stones = object as Mesh;
  });
  let seated: BufferGeometry | null = null;
  const one = new Object3D();
  const at = new Vector3();
  const world = new Matrix4();
  return () => {
    const rock = stones as Mesh | null;
    if (!rock || rock.geometry === seated) return;
    seated = rock.geometry;
    const position = seated.getAttribute('position');
    rock.updateWorldMatrix(true, false);
    world.copy(rock.matrixWorld);
    const tops = list.map(() => -Infinity);
    for (let i = 0; i < position.count; i++) {
      at.fromBufferAttribute(position, i).applyMatrix4(world);
      for (const [k, cap] of list.entries()) {
        if (Math.abs(at.x - cap.x) < cap.size * 0.7 && Math.abs(at.z - cap.z) < cap.size * 0.7 && at.y > tops[k]!) tops[k] = at.y;
      }
    }
    for (const [k, cap] of list.entries()) {
      one.position.set(cap.x, Number.isFinite(tops[k]) ? tops[k]! - cap.size * 0.16 : -1e3, cap.z);
      one.rotation.set(0, cap.turn, 0);
      one.scale.set(cap.size, cap.size * 0.42, cap.size);
      one.updateMatrix();
      mesh.setMatrixAt(k, one.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
}

export function installFlora(): void {
  PACK.lifts.push(flora);
}
