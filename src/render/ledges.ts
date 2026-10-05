import { BoxGeometry, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEDGE_THICK } from '../sim/constants';
import type { Ledge, LedgeLook } from '../sim/types';

/**
 * The ledges (docs/level-design.md): thin floors that he jumps up through and stands on. Each stands just
 * behind the plane he moves in, with its front edge on it, so that he passes in front of one that is higher
 * than his feet and stands on its edge once he is up.
 *
 * Nothing floats: a leaf has its stalk, a bough and a plate of bark their young stem, a shelf of rock its
 * pillar, a plank the batten that holds it to the wall. What holds a ledge is part of its shape and goes far
 * down, into the ground under it, so every look is one instanced mesh: a chapter's ledges cost one draw call
 * for each look it uses, however many there are.
 */
const DEPTH = 0.9;
/** How far down a stalk, a stem or a pillar goes: further than any ledge is above its ground. */
const DOWN = 14;

/** A shape one EL wide, its top at 0 and its front edge at the play plane; the ledge and what holds it. */
const together = (...parts: BufferGeometry[]): BufferGeometry => mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
/** An upright round thing from `DOWN` below the ledge to `rise` above it, behind the ledge's middle. */
const upright = (top: number, bottom: number, sides: number, rise: number, z: number): BufferGeometry =>
  new CylinderGeometry(top, bottom, DOWN + rise, sides).translate(0, (rise - DOWN) / 2 - LEDGE_THICK * 0.6, z);

const LOOKS: Record<LedgeLook, { colour: string; roughness: number; flat?: boolean; shape: () => BufferGeometry }> = {
  // A sawn board: the end of a deck plank, a sill, a shelf. A batten under its back edge holds it to the wall.
  plank: {
    colour: '#c9ae84', roughness: 0.75,
    shape: () => together(
      new BoxGeometry(1, LEDGE_THICK, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
      new BoxGeometry(0.86, 0.3, 0.12).translate(0, -LEDGE_THICK - 0.15, -DEPTH + 0.1),
    ),
  },
  // A broad leaf held out flat on its stalk: thick in the middle, thin at its rim.
  leaf: {
    colour: '#5f9140', roughness: 0.8,
    shape: () => together(
      new SphereGeometry(0.5, 14, 6).scale(1, 0.17, DEPTH).translate(0, -0.085, -DEPTH / 2),
      upright(0.035, 0.06, 6, 0, -DEPTH / 2),
    ),
  },
  // A bough: round, rough, lying along the path, on the young stem it grows from.
  branch: {
    colour: '#6e5238', roughness: 0.95,
    shape: () => together(
      new CylinderGeometry(0.085, 0.1, 1, 9).rotateZ(Math.PI / 2).scale(1, 1, 3.2).translate(0, -0.085, -0.32),
      upright(0.16, 0.26, 9, 2.6, -0.72),
    ),
  },
  // A plate of bark standing out from a stem.
  bark: {
    colour: '#8a735c', roughness: 0.95, flat: true,
    shape: () => together(
      new CylinderGeometry(0.5, 0.42, LEDGE_THICK, 6).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
      upright(0.17, 0.27, 9, 2.6, -0.78),
    ),
  },
  // A shelf of rock on the pillar it has weathered out of.
  stone: {
    colour: '#9a9da0', roughness: 1, flat: true,
    shape: () => together(
      // Its lower rim is the wider one: it is set back by that, so that nothing of it stands in front of him.
      new CylinderGeometry(0.5, 0.56, LEDGE_THICK * 1.3, 7).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK * 0.65, -0.56 * DEPTH),
      upright(0.3, 0.42, 7, 0, -0.56 * DEPTH - 0.08).scale(1, 1, 0.8),
    ),
  },
};

export const LEDGE_LOOKS = Object.keys(LOOKS) as LedgeLook[];
/** How long a ledge that waits for a flag takes to come into being. */
const GROW = 0.35;

export function buildLedges(ledges: readonly Ledge[]) {
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
      // Ledges lie all along a chapter: as a whole they are never outside the picture.
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.userData.ledges = at;
      group.add(mesh);
      return { mesh, at };
    });

  const write = (): void => {
    for (const { mesh, at } of batches) {
      for (const [slot, i] of at.entries()) {
        const ledge = ledges[i]!;
        const k = there[i]!;
        place.position.set(ledge.x, ledge.y, 0);
        place.scale.set(ledge.width * k, k, k);
        place.updateMatrix();
        mesh.setMatrixAt(slot, place.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
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
