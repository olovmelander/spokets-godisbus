import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOME_LAYOUT } from '../content/home-layout';
import { frontDoor } from './front-door';
import { paint } from './home-room';
import { LOOK as RAIN_GEAR } from './rain-gear';

/**
 * The family's home is one home in every chapter that is set there (Olov, 15 November 2026: "Kapitlet Godiskalaset i
 * äventyr 1 och första kapitlet i äventyr 1 måste ha samma design på hemmet som i det allra sista kapitlet i äventyr 2.
 * Bord, golv, inredning och allt måste se likadant ut som hemmet i äventyr 2"). What Äventyr 2's room had and Äventyr 1's
 * did not, built here for both: the low toy shelf beside the sofa, and the hall past the bathroom, with the family's
 * raincoats on a rail, their boots under them, and the green front door (./front-door.ts).
 */

/** Where the toy shelf stands: its middle along the room, and how far behind the play plane (its model's own). */
export const TOY_SHELF = { x: HOME_LAYOUT.toyShelf.x, z: -2 } as const;

/** The hall's wall, where the coats hang a little off it; the rail they hang from; the coats and the boots. */
export const HALL = {
  wall: -8.5,
  rail: { x: 39.45, y: 5.6, wide: 4.8 },
  coats: (['pappa', 'mamma', 'moa', 'bertil'] as const).map((who, i) => ({ who, x: [37.6, 38.7, 39.8, 40.7][i]!, tall: [2.7, 2.5, 1.9, 1.5][i]! })),
  boots: (['pappa', 'mamma', 'moa', 'bertil'] as const).map((who, i) => ({ who, x: [37.5, 38.6, 39.7, 40.7][i]! })),
} as const;

/**
 * The hall's coats and boots as one merged mesh, and the front door: two draws and the door's pane. `extra` adds what a
 * chapter hangs there besides (Äventyr 2's morning: the doll's raincoat Elof wore when he was small).
 */
export function hallThings(extra: BufferGeometry[] = []): { group: Group; coats: readonly { x: number; tall: number }[] } {
  const group = new Group();
  group.name = 'home-hall';
  const WALL = HALL.wall;
  const parts: BufferGeometry[] = [];
  parts.push(paint(new BoxGeometry(HALL.rail.wide, 0.16, 0.16).translate(HALL.rail.x, HALL.rail.y, WALL - 0.24), '#6a4a2c'));
  for (const coat of HALL.coats) {
    const colour = RAIN_GEAR[coat.who].coat;
    const mid = 5.45 - coat.tall / 2;
    parts.push(paint(new CylinderGeometry(0.3, 0.56, coat.tall, 10).scale(1, 1, 0.36).translate(coat.x, mid, WALL), colour));
    parts.push(paint(new SphereGeometry(0.27, 10, 8).scale(1, 0.85, 0.6).translate(coat.x, 5.5, WALL), colour));
  }
  for (const boot of HALL.boots) {
    const colour = RAIN_GEAR[boot.who].boots;
    for (const side of [-0.2, 0.2]) {
      parts.push(paint(new BoxGeometry(0.3, 0.74, 0.26).translate(boot.x + side, 0.37, WALL + 1), colour));
      parts.push(paint(new BoxGeometry(0.34, 0.16, 0.46).translate(boot.x + side, 0.08, WALL + 1.1), colour));
    }
  }
  parts.push(...extra);
  group.add(new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.42 })));
  group.add(frontDoor(HOME_LAYOUT.hall.door));
  return { group, coats: HALL.coats };
}
