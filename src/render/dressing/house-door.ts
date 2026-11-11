import {
  BoxGeometry, Color, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { drawn } from './kit';

/**
 * The way out of the house at home (the graphics pass of 6 November 2026; Olov: "det ska se mer ut som att man går
 * utomhus genom en dörr, nu ser det bara ut som att hela huset är öppet mellan inne och ute"). After the photograph
 * he gave of the house, which is in no repository: a red house of upright boards with white corner boards and white
 * window frames, and a glazed veranda with a door out to the deck.
 * - The veranda is glazed on its outside face; the rooms share one continuous rear wall inside.
 * - At the veranda's end the path goes out through a door frame, its door standing open against the outside wall.
 * - Out on the deck the house is a house again: its red front fades in over the cut-away rooms as the camera
 *   passes the door, and fades out again when he goes back in.
 * Nothing on it is lettered; the house number and anything personal in the photograph are not drawn.
 */
const RED = '#8f2c22';
const RED_DARK = '#6e2019';
const WHITE = '#f1ece2';
/** Where the facade starts, this far left of the door; nothing further left is in the picture out on the deck. */
const SPAN = 34;
/** The facade stands this far in front of the path, in front of everything in the rooms. */
const FRONT_Z = 1.4;
/** The door: its two posts' depths, and how high its head is over the floor. */
const DOOR = { back: -2.1, front: 1.2, high: 8.4 };

export interface HouseDoor {
  group: Group;
  /** Fades the house's front in as the camera goes out past the door, and out again as it comes back in. */
  update(cameraX: number): void;
}

/** The front of the house as a picture: x from the facade's left end, in lengths; y from the floor. */
function facadePicture(chapter: ChapterData, from: number, door: number, evening: boolean, veranda: number) {
  const PX = 48;
  const width = SPAN * PX, height = 20 * PX;
  const top = 16; // lengths above the floor at the picture's top edge
  const X = (x: number) => (x - from) * PX;
  const Y = (y: number) => (top - y) * PX;
  return drawn(width, height, (c) => {
    c.clearRect(0, 0, width, height);
    // Upright boards, falu red, each a touch different, with a dark line between.
    for (let x = 0, i = 0; x < width; x += 0.36 * PX, i++) {
      const shade = 0.92 + 0.12 * Math.abs(Math.sin(i * 12.9898) * 0.9);
      c.fillStyle = new Color(RED).multiplyScalar(shade).getStyle();
      c.fillRect(x, Y(13.6), 0.36 * PX, Y(-0.6) - Y(13.6));
      c.fillStyle = RED_DARK;
      c.fillRect(x, Y(13.6), 2, Y(-0.6) - Y(13.6));
    }
    // The plinth, grey, and the eaves: a white fascia and the dark roof's edge.
    c.fillStyle = '#7a7872';
    c.fillRect(0, Y(-0.6), width, Y(-1.8) - Y(-0.6));
    c.fillStyle = WHITE;
    c.fillRect(0, Y(14.1), X(veranda), Y(13.4) - Y(14.1));
    c.fillStyle = '#34373b';
    c.fillRect(0, 0, X(veranda), Y(14.1));
    // The windows of the rooms: white frames, a cross of glazing bars, and glass that is the sky or, at night,
    // the lamps inside.
    const glass = (x0: number, y0: number, w: number, h: number) => {
      const g = c.createLinearGradient(0, Y(y0 + h), 0, Y(y0));
      if (evening) {
        g.addColorStop(0, '#f6c77a');
        g.addColorStop(1, '#c98a46');
      } else {
        g.addColorStop(0, '#cfe0ea');
        g.addColorStop(0.55, '#8fa9b8');
        g.addColorStop(1, '#5b6f7c');
      }
      c.fillStyle = g;
      c.fillRect(X(x0), Y(y0 + h), w * PX, h * PX);
    };
    const window = (x: number, y0: number, w: number, h: number) => {
      c.fillStyle = WHITE;
      c.fillRect(X(x - w / 2 - 0.35), Y(y0 + h + 0.55), (w + 0.7) * PX, (h + 0.9) * PX);
      glass(x - w / 2, y0, w, h);
      c.fillStyle = WHITE;
      c.fillRect(X(x - 0.09), Y(y0 + h), 0.18 * PX, h * PX);
      c.fillRect(X(x - w / 2), Y(y0 + h * 0.62), w * PX, 0.16 * PX);
    };
    for (const x of chapter.house?.windows ?? []) if (x > from + 2 && x < veranda - 2) window(x, 3.2, 3.6, 4.4);
    // The corner board where the house meets its veranda, and at the door's end.
    c.fillStyle = WHITE;
    c.fillRect(X(veranda) - 0.45 * PX, Y(13.6), 0.45 * PX, Y(-0.6) - Y(13.6));
    // The veranda: red below the glass, then glass in white frames from its sill to its own roof.
    c.clearRect(X(veranda), 0, X(door) - X(veranda), Y(9.6));
    c.fillStyle = '#34373b';
    c.fillRect(X(veranda), Y(10.2), X(door) - X(veranda), Y(9.4) - Y(10.2));
    c.fillStyle = WHITE;
    c.fillRect(X(veranda), Y(9.4), X(door) - X(veranda), 0.45 * PX);
    const panes = Math.max(2, Math.round((door - veranda) / 1.9));
    const paneW = (door - veranda - 0.4) / panes;
    for (let i = 0; i < panes; i++) {
      const x0 = veranda + 0.2 + i * paneW;
      glass(x0 + 0.12, 2.6, paneW - 0.24, 6.3);
      c.fillStyle = WHITE;
      c.fillRect(X(x0), Y(8.95), 0.12 * PX, 6.35 * PX);
      c.fillRect(X(x0 + paneW - 0.12), Y(8.95), 0.12 * PX, 6.35 * PX);
      c.fillRect(X(x0), Y(5.9), paneW * PX, 0.12 * PX);
    }
    c.fillStyle = WHITE;
    c.fillRect(X(veranda), Y(2.6), X(door) - X(veranda), 0.22 * PX);
    c.fillRect(X(door) - 0.45 * PX, Y(9.4), 0.45 * PX, Y(-0.6) - Y(9.4));
  }, false);
}

/** The house's front, its glazed veranda and its door, for a chapter at home that goes out of doors. */
export function houseDoor(chapter: ChapterData, floor: number): HouseDoor | null {
  const door = chapter.outdoors;
  const house = chapter.house;
  if (door === undefined || !house) return null;
  const evening = chapter.night !== undefined;
  const group = new Group();
  group.name = 'house-door';
  // Where the veranda begins: the sill between the hall and it, or a third of a room before the door.
  const sill = chapter.ground.find((p, i, all) => i > 0 && p.x < door && p.y > all[i - 1]!.y && p.x > door - 12);
  const veranda = sill ? sill.x : door - 7;
  const dim = evening ? 0.62 : 1;
  const white = new MeshStandardMaterial({ color: new Color(WHITE).multiplyScalar(dim), roughness: 0.75 });

  // The shared rear wall (built.ts) owns the room's windows and bathroom opening. An older veranda
  // overlay used to put glass, rails and a red sill across that bathroom in only these two chapters.
  // Keep the glazing on the outside facade below, and the real glass exit door beside the path.
  const frames: BoxGeometry[] = [];

  // The door out: a frame across the path at the veranda's end, with the outside wall beside it.
  frames.push(new BoxGeometry(0.34, DOOR.high, 0.34).translate(door, floor + DOOR.high / 2, DOOR.back));
  frames.push(new BoxGeometry(0.34, DOOR.high, 0.34).translate(door, floor + DOOR.high / 2, DOOR.front));
  frames.push(new BoxGeometry(0.4, 0.45, DOOR.front - DOOR.back + 0.34).translate(door, floor + DOOR.high + 0.2, (DOOR.front + DOOR.back) / 2));
  frames.push(new BoxGeometry(0.5, 0.18, DOOR.front - DOOR.back + 0.5).translate(door, floor + 0.06, (DOOR.front + DOOR.back) / 2));
  group.add(new Mesh(mergeGeometries(frames), white));
  frames.forEach((f) => f.dispose());
  // The veranda's end wall behind the door, red outside and pale inside, up to the veranda's roof.
  const red = new MeshStandardMaterial({ color: new Color(RED).multiplyScalar(evening ? 0.5 : 0.85), roughness: 0.85 });
  const panel = new MeshStandardMaterial({ color: new Color('#eadcc0').multiplyScalar(evening ? 0.6 : 1), roughness: 0.85 });
  // Red on its outside (+x), the room's pale panelling on its inside.
  const endWall = new Mesh(new BoxGeometry(0.3, 10.4, DOOR.back + 8.9).translate(door, floor + 5.2, (DOOR.back - 8.9) / 2),
    [red, panel, red, red, red, red]);
  group.add(endWall);
  // Above the door, the wall up to the roof, so the doorway is a doorway and not a gap.
  const lintel = new Mesh(new BoxGeometry(0.3, 10.4 - DOOR.high - 0.45, DOOR.front - DOOR.back).translate(door, floor + (10.4 + DOOR.high + 0.45) / 2, (DOOR.front + DOOR.back) / 2),
    [red, panel, red, red, red, red]);
  group.add(lintel);
  // The door itself stands open, outwards, against the outside wall: a white frame round its glass.
  const leaf = new Group();
  const leafFrame = [
    new BoxGeometry(0.16, 7.8, 0.16).translate(0.08, 3.9, 0), new BoxGeometry(0.16, 7.8, 0.16).translate(1.62, 3.9, 0),
    new BoxGeometry(1.7, 0.16, 0.16).translate(0.85, 7.72, 0), new BoxGeometry(1.7, 0.5, 0.16).translate(0.85, 0.25, 0),
    new BoxGeometry(1.7, 0.12, 0.16).translate(0.85, 4.2, 0),
  ];
  leaf.add(new Mesh(mergeGeometries(leafFrame), white));
  leafFrame.forEach((f) => f.dispose());
  leaf.add(new Mesh(new PlaneGeometry(1.4, 7.0).translate(0.85, 4.1, 0),
    new MeshStandardMaterial({ color: evening ? '#2a3550' : '#cfe2ea', transparent: true, opacity: 0.4, roughness: 0.1, side: DoubleSide, depthWrite: false })));
  leaf.position.set(door + 0.12, floor + 0.05, DOOR.back - 0.2);
  group.add(leaf);

  // Out on the deck: the house's front, over the cut-away rooms.
  const from = door - SPAN;
  const picture = facadePicture(chapter, from, door, evening, veranda);
  const front = new MeshStandardMaterial({ map: picture, transparent: true, opacity: 0, roughness: 0.9, depthWrite: false, alphaTest: 0.02 });
  if (evening) front.color.setScalar(0.72);
  const facade = new Mesh(new PlaneGeometry(SPAN, 20).translate(from + SPAN / 2, floor + 6, FRONT_Z), front);
  facade.name = 'house-front';
  facade.renderOrder = 4;
  facade.visible = false;
  group.add(facade);
  // At night the windows glow a little into the dark, warm.
  return {
    group,
    update(cameraX: number) {
      const t = Math.min(1, Math.max(0, (cameraX - (door + 1.2)) / 3));
      const shown = t * t * (3 - 2 * t);
      front.opacity = shown;
      facade.visible = shown > 0.01;
    },
  };
}
