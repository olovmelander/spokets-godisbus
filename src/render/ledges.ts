import { BoxGeometry, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, type BufferGeometry } from 'three';
import { LEDGE_THICK } from '../sim/constants';
import type { Ledge, LedgeLook } from '../sim/types';

/**
 * The ledges (docs/level-design.md): thin floors that he jumps up through and stands on. Each stands just
 * behind the plane he moves in, with its front edge on it, so that he passes in front of one that is higher
 * than his feet and stands on its edge once he is up.
 *
 * Nothing floats: a leaf has its stalk, a bough and a plate of bark their young stem, a shelf of rock its
 * pillar, a plank the batten that holds it to the wall. Every look is one instanced mesh for the ledges and one
 * for what holds them, so a chapter's ledges cost two draw calls for each look it uses, however many there are.
 */
const DEPTH = 0.9;

interface Look {
  colour: string;
  roughness: number;
  flat?: boolean;
  /** The ledge as a shape one EL wide, its top at 0 and its front edge at the play plane. */
  shape: () => BufferGeometry;
  /**
   * What holds it up: a shape one EL high standing on 0, its colour, and how it is placed. `reach` is how far
   * it goes: down to the ground under the ledge, or a fixed length. `rise` is how far it goes on above the ledge.
   */
  support: { colour: string; shape: () => BufferGeometry; wide: (width: number) => number; z: number; reach: 'ground' | number; rise: number };
}

const LOOKS: Record<LedgeLook, Look> = {
  // A sawn board: the end of a deck plank, a sill, a shelf. A batten under its back edge holds it to the wall.
  plank: {
    colour: '#c9ae84', roughness: 0.75,
    shape: () => new BoxGeometry(1, LEDGE_THICK, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
    support: { colour: '#9a7c52', shape: () => new BoxGeometry(1, 1, 0.12).translate(0, 0.5, 0), wide: (width) => width * 0.86, z: -DEPTH + 0.04, reach: 0.34, rise: 0 },
  },
  // A broad leaf held out flat on its stalk: thick in the middle, thin at its rim.
  leaf: {
    colour: '#5f9140', roughness: 0.8,
    shape: () => new SphereGeometry(0.5, 14, 6).scale(1, 0.17, DEPTH).translate(0, -0.085, -DEPTH / 2),
    support: { colour: '#4d7a37', shape: () => new CylinderGeometry(0.5, 0.7, 1, 7).translate(0, 0.5, 0), wide: () => 0.09, z: -DEPTH / 2, reach: 'ground', rise: 0 },
  },
  // A bough: round, rough, lying along the path, on the young stem it grows from.
  branch: {
    colour: '#6e5238', roughness: 0.95,
    shape: () => new CylinderGeometry(0.085, 0.1, 1, 9).rotateZ(Math.PI / 2).scale(1, 1, 3.2).translate(0, -0.085, -0.32),
    support: { colour: '#5d4630', shape: () => new CylinderGeometry(0.36, 0.5, 1, 9).translate(0, 0.5, 0), wide: () => 0.62, z: -0.72, reach: 'ground', rise: 2.6 },
  },
  // A plate of bark standing out from a stem.
  bark: {
    colour: '#8a735c', roughness: 0.95, flat: true,
    shape: () => new CylinderGeometry(0.5, 0.42, LEDGE_THICK, 6).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
    support: { colour: '#6a5440', shape: () => new CylinderGeometry(0.36, 0.5, 1, 9).translate(0, 0.5, 0), wide: () => 0.7, z: -0.78, reach: 'ground', rise: 2.6 },
  },
  // A shelf of rock on the pillar it has weathered out of.
  stone: {
    colour: '#9a9da0', roughness: 1, flat: true,
    shape: () => new CylinderGeometry(0.5, 0.56, LEDGE_THICK * 1.3, 7).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK * 0.65, -DEPTH / 2),
    support: { colour: '#7d8083', shape: () => new CylinderGeometry(0.34, 0.5, 1, 7).translate(0, 0.5, 0), wide: (width) => width * 0.8, z: -DEPTH / 2 - 0.08, reach: 'ground', rise: 0 },
  },
};

export const LEDGE_LOOKS = Object.keys(LOOKS) as LedgeLook[];
/** How long a ledge that waits for a flag takes to come into being. */
const GROW = 0.35;

/**
 * @param groundAt The height of the ground under an x: where a stalk, a stem or a pillar stands. Left out:
 * 12 EL below the ledge.
 */
export function buildLedges(ledges: readonly Ledge[], groundAt: (x: number) => number = () => Number.NEGATIVE_INFINITY) {
  const group = new Group();
  group.name = 'ledges';
  const place = new Object3D();
  /** How far each ledge has come into being, from 0 to 1. */
  const there: number[] = ledges.map((ledge) => (ledge.needs === undefined ? 1 : 0));
  const batches = LEDGE_LOOKS.map((look) => ({ look, at: ledges.flatMap((ledge, i) => (ledge.look === look ? [i] : [])) }))
    .filter((batch) => batch.at.length > 0)
    .map(({ look, at }) => {
      const how = LOOKS[look];
      const mesh = new InstancedMesh(how.shape(), new MeshStandardMaterial({ color: how.colour, roughness: how.roughness, flatShading: how.flat === true }), at.length);
      mesh.name = `ledges:${look}`;
      const held = new InstancedMesh(how.support.shape(), new MeshStandardMaterial({ color: how.support.colour, roughness: 1, flatShading: how.flat === true }), at.length);
      held.name = `ledges:${look}:support`;
      for (const one of [mesh, held]) {
        // Ledges lie all along a chapter: as a whole they are never outside the picture.
        one.frustumCulled = false;
        one.instanceMatrix.setUsage(DynamicDrawUsage);
        one.userData.ledges = at;
        group.add(one);
      }
      return { mesh, held, at, how };
    });

  const write = (): void => {
    for (const { mesh, held, at, how } of batches) {
      for (const [slot, i] of at.entries()) {
        const ledge = ledges[i]!;
        const k = there[i]!;
        place.position.set(ledge.x, ledge.y, 0);
        place.scale.set(ledge.width * k, k, k);
        place.updateMatrix();
        mesh.setMatrixAt(slot, place.matrix);

        const support = how.support;
        const under = ledge.y - LEDGE_THICK * 0.6;
        const foot = support.reach === 'ground' ? Math.max(groundAt(ledge.x), ledge.y - 12) : under - support.reach;
        const wide = support.wide(ledge.width) * k;
        place.position.set(ledge.x, foot, support.z);
        place.scale.set(wide, Math.max(0.01, under + support.rise - foot) * k, support.reach === 'ground' ? wide : k);
        place.updateMatrix();
        held.setMatrixAt(slot, place.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      held.instanceMatrix.needsUpdate = true;
    }
  };
  write();

  /** A ledge that waits for a flag grows out once the flag is set. Nothing is written while nothing changes. */
  function update(flags: ReadonlySet<string>, dt: number): void {
    let changed = false;
    for (const [i, ledge] of ledges.entries()) {
      if (ledge.needs === undefined) continue;
      const want = flags.has(ledge.needs) ? 1 : 0;
      if (there[i] === want) continue;
      there[i] = want > there[i]! ? Math.min(1, there[i]! + dt / GROW) : Math.max(0, there[i]! - dt / GROW);
      changed = true;
    }
    if (changed) write();
  }
  return { group, update };
}
