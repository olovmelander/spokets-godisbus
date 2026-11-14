import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

/**
 * Stormgården's flower pots, the lee from its gusts (Olov, 14 November 2026: "Krukorna som syns när stormbyarna kommer
 * behöver modelleras bättre och få bättre texturer"). Each is a terracotta garden pot of the kit's, as tall as he is or
 * taller (art/blender/a2-props.py; its clay is drawn by ../../render/terracotta.ts), and no two alike: what stands out
 * on a lawn in an autumn storm. In the order he comes to them:
 * - one in its saucer, full of heather;
 * - one upturned for the winter;
 * - a wide bowl with only its soil in it, which Klonk is blown into ("Där ska ju blommorna bo!");
 * - one the wind has blown over, its soil spilt;
 * - a tall one, its grass laid flat by the wind;
 * - two upturned, one on the other.
 * They stand where the simulation has its shelters, just behind the path; none is wider than the lee it gives.
 *
 * `turn` is how each is turned where it stands: little for those with something growing in them, which leans with the
 * wind (the wind comes from the right). `upright`: its stand-in, until the model has come, is a pot standing on its
 * foot; the others' is one upturned.
 */
const POTS: readonly { model: string; turn: number; upright: boolean }[] = [
  { model: 'kruka-ljung', turn: 0.2, upright: true },
  { model: 'kruka', turn: 1.3, upright: false },
  { model: 'kruka-skal', turn: -0.25, upright: true },
  { model: 'kruka-valt', turn: 0.55, upright: false },
  { model: 'kruka-hog', turn: 0.1, upright: true },
  { model: 'kruka-stapel', turn: -0.7, upright: false },
];

/** Which of the kit's pots stands at the gust's `n`th shelter. */
export const potAt = (n: number): string => POTS[n % POTS.length]!.model;

/** How high the soil lies in the bowl that Klonk is blown into, over the lawn it stands on (the kit's `kruka-skal`). */
export const BOWL_SOIL = 1;

/** The pot at a gust's `n`th shelter, standing on the ground at x, y: a plain clay pot until the kit's has come. */
export function flowerPot(x: number, y: number, n = 1): Group {
  const { model, turn, upright } = POTS[n % POTS.length]!;
  const group = new Group();
  const clay = new MeshStandardMaterial({ color: '#b65f3a', roughness: 0.8 });
  const pot = new Mesh(new CylinderGeometry(upright ? 0.92 : 0.62, upright ? 0.62 : 0.92, 1.5, 20), clay);
  pot.position.y = 0.75;
  const rim = new Mesh(new CylinderGeometry(1.0, 1.0, 0.28, 20), clay);
  rim.position.y = upright ? 1.36 : 0.14;
  group.add(pot, rim);
  group.position.set(x, y, -1.3);
  group.userData.model = model;
  group.userData.turn = turn;
  group.userData.disposeFallback = true;
  return group;
}
