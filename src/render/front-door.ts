import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box } from '../content/aventyr2/buildings';
import { HOME_LAYOUT } from '../content/home-layout';

/**
 * The house's front door, in the hall past the wet raincoats (Äventyr 2's Morgonen efter): where he turns to them all,
 * out into the washed-clean morning, and the story ends (../content/aventyr2/chapters/morgonen.ts, `DOOR`). The scene
 * said "the door", and he stood before a bare wall. A painted door in its white casing on the back wall, as tall as the
 * bathroom's, with a pane of bright morning in its top, a brass handle, a threshold and a doormat in front of it.
 * Plain shapes, no lettering. One merged mesh and the pane: two draws.
 */
export const FRONT_DOOR = { width: 3.4, height: 5.9 } as const;

export function frontDoor(x: number): Group {
  const group = new Group();
  group.name = 'front-door';
  const wall = HOME_LAYOUT.wall.z;
  const { width, height } = FRONT_DOOR;
  const leaf = wall + 0.16;
  const green = '#46705e';
  const panel = '#53806c';
  const white = '#f3ece0';
  const parts = [
    // The casing: two jambs and the head, standing a little off the wall.
    box(0.3, height + 0.3, 0.14, x - width / 2 - 0.15, (height + 0.3) / 2, wall + 0.1, white),
    box(0.3, height + 0.3, 0.14, x + width / 2 + 0.15, (height + 0.3) / 2, wall + 0.1, white),
    box(width + 0.9, 0.32, 0.16, x, height + 0.3, wall + 0.11, white),
    // The leaf, and two raised panels under its pane.
    box(width, height, 0.1, x, height / 2, leaf, green),
    box(width * 0.36, height * 0.36, 0.06, x - width * 0.22, height * 0.24, leaf + 0.07, panel),
    box(width * 0.36, height * 0.36, 0.06, x + width * 0.22, height * 0.24, leaf + 0.07, panel),
    // The pane's glazing bars.
    box(width * 0.62 + 0.16, 0.12, 0.05, x, height * 0.78 + height * 0.13, leaf + 0.08, white),
    box(width * 0.62 + 0.16, 0.12, 0.05, x, height * 0.78 - height * 0.13, leaf + 0.08, white),
    box(0.1, height * 0.26, 0.05, x, height * 0.78, leaf + 0.09, white),
    box(0.12, height * 0.26 + 0.12, 0.05, x - width * 0.31, height * 0.78, leaf + 0.08, white),
    box(0.12, height * 0.26 + 0.12, 0.05, x + width * 0.31, height * 0.78, leaf + 0.08, white),
    // The handle and its plate, on the side away from the hinges.
    box(0.14, 0.5, 0.04, x + width / 2 - 0.42, 2.9, leaf + 0.07, '#b08a3c'),
    box(0.36, 0.08, 0.12, x + width / 2 - 0.52, 2.98, leaf + 0.13, '#d2aa52'),
    // The threshold, and the doormat on the floor in front of it.
    box(width + 0.6, 0.08, 0.5, x, 0.04, wall + 0.3, '#9a7650'),
    box(2.6, 0.03, 1.3, x, 0.015, wall + 1.25, '#7d5f43'),
    box(2.3, 0.032, 1.0, x, 0.016, wall + 1.25, '#9c7b56'),
  ];
  const door = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  door.name = 'front-door-leaf';
  parts.forEach((part) => part.dispose());
  // The morning through the pane: bright, a little blue, needing no light of its own.
  const pane = new Mesh(new BoxGeometry(width * 0.62, height * 0.26, 0.02), new MeshBasicMaterial({ color: '#e8f2fb' }));
  pane.position.set(x, height * 0.78, leaf + 0.055);
  pane.name = 'front-door-pane';
  group.add(door, pane);
  return group;
}
