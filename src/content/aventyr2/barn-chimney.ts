import { BoxGeometry, CanvasTexture, Group, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type BufferGeometry, type Texture } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paint } from './buildings';

/**
 * The chimneys on the long roof against Billsta's barn, the lee from its gusts (Olov, 12 November 2026: "där det
 * blåser på ladugårdstaket så kan skorstenarna göras snyggare"). They were little red boxes with a dark band and a
 * grey pyramid on top. An old cow house's roof has a row of ventilation chimneys along it, of brick: these are those.
 *
 * Each is a stack of old red brick in its courses, as wide as the lee it gives (the simulation shelters him within 0.8
 * of its middle), standing on the roof in a collar of dark sheet metal. Its top steps out in two corbelled courses,
 * and a black sheet-metal cap stands on four short legs over the opening, which the sky shows through. The rain has
 * darkened its top. They differ a little from one another in height and cap, as old chimneys do. Two draws each.
 */

/** A chimney's measures, in EL: its stack, and how much the corbel and the cap stand out over it. */
export const CHIMNEY = { wide: 1.15, deep: 0.95, tall: 2.05, corbel: 0.1, cap: 0.18, legs: 0.3 } as const;

let bricks: Texture | null | undefined;

/** Old red brick in running bond, each brick its own shade, with pale lime mortar between. Tiles both ways. */
function brickTexture(): Texture | null {
  if (bricks !== undefined) return bricks;
  if (typeof document === 'undefined') return (bricks = null);
  const size = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return (bricks = null);
  g.fillStyle = '#b9ab98';
  g.fillRect(0, 0, size, size);
  const courses = 8, high = size / courses, long = size / 4;
  let seed = 5;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < courses; row++) {
    const shift = row % 2 ? long / 2 : 0;
    for (let k = -1; k < 5; k++) {
      const x = k * long + shift;
      const tone = 0.78 + 0.32 * next();
      const r = Math.round(150 * tone), gr = Math.round(70 * tone), b = Math.round(54 * tone);
      g.fillStyle = `rgb(${r},${gr},${b})`;
      g.fillRect(x + 2, row * high + 2, long - 3, high - 3);
      // A little wear on some: a darker corner, a paler face.
      if (next() < 0.3) {
        g.fillStyle = 'rgba(40,20,16,0.25)';
        g.fillRect(x + 2, row * high + high * 0.55, long * (0.3 + 0.4 * next()), high * 0.4);
      }
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  return (bricks = map);
}

/** The texture's size in EL: four bricks along, eight courses up. */
const TILE = { along: 1.4, up: 1.2 };

/** A box whose faces show the bricks at their own size, whatever the face's size. */
function bricked(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  const box = new BoxGeometry(w, h, d);
  const uv = box.getAttribute('uv');
  // BoxGeometry's faces in order: +x, -x, +y, -y, +z, -z, four corners each. Scale each face's uv by its own size.
  const faces: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (const [face, [across, up]] of faces.entries()) {
    for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * across / TILE.along, uv.getY(i) * up / TILE.up);
  }
  return box.translate(x, y, z);
}

/**
 * One chimney standing on the roof at `x`, its foot at `y`, behind the path. `which` varies it a little: its height,
 * and its cap, flat on legs or a little pitched hood.
 */
export function barnChimney(x: number, y: number, which = 0): Group {
  const group = new Group();
  group.name = 'barn-chimney';
  const { wide, deep, corbel, cap, legs } = CHIMNEY;
  const tall = CHIMNEY.tall + [0, 0.18, -0.1, 0.12][which % 4]!;
  const map = brickTexture();
  const brick = new MeshStandardMaterial({ color: map ? '#ffffff' : '#8e4a3a', map, roughness: 0.92 });
  // The stack and its two corbelled courses at the top, the upper a little wider.
  const body = mergeGeometries([
    bricked(wide, tall, deep, 0, tall / 2, 0),
    bricked(wide + corbel, 0.15, deep + corbel, 0, tall + 0.075, 0),
    bricked(wide + 2 * corbel, 0.15, deep + 2 * corbel, 0, tall + 0.225, 0),
  ]);
  const stack = new Mesh(body, brick);
  stack.castShadow = true;
  stack.receiveShadow = true;
  // The collar of sheet metal where it goes through the roof; the soot and the wet darkening its top; its cap.
  const top = tall + 0.3;
  const iron = '#26282c', soot = '#2c1c18';
  const metal: BufferGeometry[] = [
    paint(new BoxGeometry(wide + 0.22, 0.14, deep + 0.22).translate(0, 0.07, 0), '#3e4146'),
    paint(new BoxGeometry(wide + 2 * corbel + 0.01, 0.06, deep + 2 * corbel + 0.01).translate(0, top - 0.02, 0), soot),
  ];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    metal.push(paint(new BoxGeometry(0.06, legs, 0.06).translate(sx * (wide / 2 - 0.02), top + legs / 2, sz * (deep / 2 - 0.02)), iron));
  }
  if (which % 2 === 0) {
    // A flat cap, its edge turned down.
    metal.push(paint(new BoxGeometry(wide + 2 * cap, 0.07, deep + 2 * cap).translate(0, top + legs + 0.035, 0), iron));
    metal.push(paint(new BoxGeometry(wide + 2 * cap, 0.08, 0.04).translate(0, top + legs - 0.03, deep / 2 + cap - 0.02), iron));
    metal.push(paint(new BoxGeometry(wide + 2 * cap, 0.08, 0.04).translate(0, top + legs - 0.03, -(deep / 2 + cap - 0.02)), iron));
  } else {
    // A little hood pitched along the roof, its two sides meeting in a ridge.
    const half = (wide + 2 * cap) / 2, rise = 0.28, slope = Math.hypot(half, rise), angle = Math.atan2(rise, half);
    for (const side of [-1, 1]) {
      metal.push(paint(new BoxGeometry(slope, 0.06, deep + 2 * cap).rotateZ(side * -angle).translate(side * half / 2, top + legs + rise / 2, 0), iron));
    }
  }
  const parts = new Mesh(mergeGeometries(metal), new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35 }));
  parts.castShadow = true;
  group.add(stack, parts);
  group.position.set(x, y, -1.2);
  return group;
}
