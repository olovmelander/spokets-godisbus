import {
  AdditiveBlending, Color, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RingGeometry, Shape, ShapeGeometry,
} from 'three';
import type { ChapterData } from '../sim/types';

type Pools = NonNullable<ChapterData['water']>;

/**
 * What floats on a puddle in the street (docs/visual-audit/byn.md row 8): birch leaves fallen from the yard
 * across it, each turning a little where it lies and rising and falling with the water, and a ring that
 * widens from each now and then as the water lifts it. They lie behind the line he sails along, so none is
 * taken for the leaf he rides, and in front of the far shore. One draw for the leaves and one for the rings.
 */
export const AFLOAT = {
  leaves: 6,
  /** How long a leaf is, and where on the water they lie: never nearer the path than `near`. */
  long: [0.5, 0.75] as const,
  near: -1.8,
  far: -7.6,
  colours: ['#d9b23c', '#c99a2e', '#e2c35a', '#b98a2c'] as const,
  /** How often a leaf's ring comes, how long it widens, and how far. */
  every: [2.8, 4.6] as const,
  ring: 1.7,
  reach: 1.1,
} as const;

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The leaves on each puddle: where each lies, how long it is, how it is turned, its colour and its rings' rhythm. */
export function afloat(puddles: Pools): { x: number; y: number; z: number; long: number; turn: number; colour: string; every: number; first: number }[] {
  return puddles.flatMap((pool, p) => Array.from({ length: AFLOAT.leaves }, (_, i) => {
    const k = p * 17 + i;
    // Spread along the puddle in even steps, each moved a little, so that no two lie together.
    const x = pool.from + 2 + ((pool.to - pool.from - 4) * (i + 0.2 + 0.6 * hash(k))) / AFLOAT.leaves;
    return {
      x, y: pool.y, z: AFLOAT.near + (AFLOAT.far - AFLOAT.near) * hash(k + 5.3),
      long: AFLOAT.long[0] + (AFLOAT.long[1] - AFLOAT.long[0]) * hash(k + 2.9),
      turn: hash(k + 7.7) * Math.PI * 2,
      colour: AFLOAT.colours[i % AFLOAT.colours.length]!,
      every: AFLOAT.every[0] + (AFLOAT.every[1] - AFLOAT.every[0]) * hash(k + 4.1),
      first: hash(k + 9.2) * AFLOAT.every[1],
    };
  }));
}

/** A birch leaf a unit long, flat, its tip along +x: a pointed oval, broadest nearer its foot. */
export function leafShape(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(-0.5, 0);
  shape.quadraticCurveTo(-0.46, 0.34, -0.06, 0.3);
  shape.quadraticCurveTo(0.26, 0.24, 0.5, 0);
  shape.quadraticCurveTo(0.26, -0.24, -0.06, -0.3);
  shape.quadraticCurveTo(-0.46, -0.34, -0.5, 0);
  return new ShapeGeometry(shape, 5).rotateX(-Math.PI / 2) as ShapeGeometry;
}

/** The leaves and their rings on the puddles given: none where the water is not a puddle in the street. */
export function createAfloat(puddles: Pools) {
  const lying = afloat(puddles);
  const size = Math.max(1, lying.length);
  const group = new Group();
  group.name = 'afloat';
  const leaves = new InstancedMesh(leafShape(), new MeshStandardMaterial({ roughness: 0.6, side: DoubleSide }), size);
  const rings = new InstancedMesh(
    new RingGeometry(0.86, 1, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending }),
    size,
  );
  leaves.name = 'afloat-leaves';
  rings.name = 'afloat-rings';
  leaves.count = rings.count = lying.length;
  for (const mesh of [leaves, rings]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  const tint = new Color();
  for (const [i, leaf] of lying.entries()) leaves.setColorAt(i, tint.set(leaf.colour));
  for (let i = 0; i < size; i++) rings.setColorAt(i, tint.setRGB(0, 0, 0));
  rings.instanceColor!.setUsage(DynamicDrawUsage);
  // Over the water, which is drawn before what is see-through and over it.
  rings.renderOrder = -1.4;
  if (lying.length) group.add(leaves, rings);
  const place = new Object3D();
  const sky = new Color('#c9d6e2');

  /** `level`: how high the water is now, against its pool's own height. `still`: with reduced motion nothing moves. */
  function update(clock: number, level: number, still = false): void {
    for (const [i, leaf] of lying.entries()) {
      const t = still ? 0 : clock;
      // It drifts a hand's breadth to and fro and turns a little, as the water under it moves.
      place.position.set(leaf.x + 0.12 * Math.sin(t * 0.21 + i * 1.9), leaf.y + level + 0.006, leaf.z + 0.08 * Math.sin(t * 0.17 + i));
      place.rotation.set(0, leaf.turn + 0.22 * Math.sin(t * 0.13 + i * 2.3), 0.05 * Math.sin(t * 1.3 + i));
      place.scale.setScalar(leaf.long);
      place.updateMatrix();
      leaves.setMatrixAt(i, place.matrix);
      // Its ring: widening from under it and fading, now and then.
      const age = still ? AFLOAT.ring : ((clock + leaf.first) % leaf.every);
      const grown = Math.min(1, age / AFLOAT.ring);
      place.position.y = leaf.y + level + 0.004;
      place.rotation.set(0, 0, 0);
      place.scale.set(leaf.long * 0.45 + AFLOAT.reach * grown, 1, (leaf.long * 0.45 + AFLOAT.reach * grown) * 0.9);
      place.updateMatrix();
      rings.setMatrixAt(i, place.matrix);
      rings.setColorAt(i, tint.copy(sky).multiplyScalar(0.5 * (1 - grown)));
    }
    leaves.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    rings.instanceColor!.needsUpdate = true;
  }
  return { group, update };
}
