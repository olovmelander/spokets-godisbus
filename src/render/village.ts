import {
  BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, SRGBColorSpace, TorusGeometry,
} from 'three';
import type { ChapterData } from '../sim/types';

/**
 * The village street (the extra chapter Byn): the fronts of its houses behind the pavement, a lamp post now
 * and then, a bicycle leaning by a cellar window, and the birches' yellow leaves on the ground.
 *
 * Everything is drawn here, in code, in plain shapes. No shop is a real one: no name, no letters, no mark
 * and no house number (plan §0, §2.6). What a shop sells is told by a picture on its sign.
 */

/** A fixed sequence of numbers from 0 to 1: the same street in every session and every screenshot. */
function sequence(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawn(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** The ground's height at x, read from the chapter's outline. */
function heightAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** How wide a house front is, and how tall, in EL. Its picture is 160 by 128. */
const HOUSE = { wide: 24, tall: 19.2 };

interface Shop {
  wall: string;
  trim: string;
  awning: string;
  door: string;
  /** What lies in the window and hangs on the sign: plain shapes. */
  goods: 'candy' | 'bread' | 'boots' | 'yarn';
}

/** The houses of the street. The first is the candy shop: the one he is on his way to. */
const SHOPS: Shop[] = [
  { wall: '#e3b24c', trim: '#fbf6ea', awning: '#f0a23a', door: '#7a5632', goods: 'candy' },
  { wall: '#e9e3d6', trim: '#6f8f76', awning: '#5f8f6c', door: '#4f6a56', goods: 'bread' },
  { wall: '#9fb5a0', trim: '#fbf6ea', awning: '#e8d27a', door: '#5d4a36', goods: 'boots' },
  { wall: '#8ea4bc', trim: '#fbf6ea', awning: '#4f6f98', door: '#3d4f66', goods: 'yarn' },
];

/** One thing a shop sells, as a plain shape about `size` across, at (x, y). */
function ware(c: CanvasRenderingContext2D, goods: Shop['goods'], x: number, y: number, size: number, i: number): void {
  const tones = { candy: ['#e2384d', '#f2c230', '#4caf50', '#f08a2c', '#f4a6b8', '#4aa3d8'], bread: ['#c98c4a', '#b87a3a', '#d9a05c'], boots: ['#5a3f2c', '#2f3a4a', '#7a5a3a'], yarn: ['#d8c060', '#7fae8a', '#c8a6c8', '#e8e0d0'] }[goods];
  c.fillStyle = tones[i % tones.length]!;
  c.beginPath();
  if (goods === 'candy') {
    // A wrapped sweet: a round middle and two twisted ends.
    c.ellipse(x, y, size * 0.5, size * 0.36, 0, 0, Math.PI * 2);
    c.moveTo(x - size * 0.45, y);
    c.lineTo(x - size * 0.85, y - size * 0.3);
    c.lineTo(x - size * 0.85, y + size * 0.3);
    c.moveTo(x + size * 0.45, y);
    c.lineTo(x + size * 0.85, y - size * 0.3);
    c.lineTo(x + size * 0.85, y + size * 0.3);
  } else if (goods === 'bread') {
    c.ellipse(x, y, size * 0.75, size * 0.4, 0, 0, Math.PI * 2);
  } else if (goods === 'boots') {
    c.rect(x - size * 0.25, y - size * 0.6, size * 0.4, size * 0.9);
    c.rect(x - size * 0.25, y + size * 0.05, size * 0.8, size * 0.3);
  } else {
    c.arc(x, y, size * 0.48, 0, Math.PI * 2);
  }
  c.fill();
}

/** One house front, drawn small so that it is soft: the mid-ground is never as sharp as the path. */
function front(shop: Shop): CanvasTexture {
  return drawn(160, 128, (c) => {
    // The wall: boards, lit from the left, with corner boards and the shade under the eaves.
    c.fillStyle = shop.wall;
    c.fillRect(0, 0, 160, 128);
    for (let x = 0; x < 160; x += 8) {
      c.fillStyle = 'rgba(40,30,20,0.16)';
      c.fillRect(x + 6, 0, 1.5, 118);
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(x + 3, 0, 2, 118);
    }
    c.fillStyle = shop.trim;
    c.fillRect(0, 0, 4, 118);
    c.fillRect(156, 0, 4, 118);
    const eaves = c.createLinearGradient(0, 0, 0, 14);
    eaves.addColorStop(0, 'rgba(20,24,36,0.55)');
    eaves.addColorStop(1, 'rgba(20,24,36,0)');
    c.fillStyle = eaves;
    c.fillRect(0, 0, 160, 14);
    // The stone foot of the house.
    c.fillStyle = '#8f8c86';
    c.fillRect(0, 116, 160, 12);
    c.fillStyle = 'rgba(40,40,44,0.3)';
    for (let x = 10; x < 160; x += 22) c.fillRect(x, 116, 1.5, 12);
    c.fillRect(0, 116, 160, 1.5);

    // The rooms upstairs: two windows with curtains.
    for (const x of [22, 96]) {
      c.fillStyle = shop.trim;
      c.fillRect(x - 3, 9, 46, 30);
      c.fillStyle = '#5b6f86';
      c.fillRect(x, 12, 40, 24);
      c.fillStyle = 'rgba(255,250,235,0.75)';
      c.fillRect(x, 12, 9, 24);
      c.fillRect(x + 31, 12, 9, 24);
      c.fillStyle = shop.trim;
      c.fillRect(x + 19, 12, 2, 24);
    }

    // The shop window: warm inside, with what the shop sells on two shelves.
    c.fillStyle = shop.trim;
    c.fillRect(9, 57, 82, 54);
    const glow = c.createRadialGradient(50, 86, 4, 50, 86, 52);
    glow.addColorStop(0, '#ffe9b0');
    glow.addColorStop(0.6, '#d9a85c');
    glow.addColorStop(1, '#5a4a3c');
    c.fillStyle = glow;
    c.fillRect(13, 61, 74, 46);
    for (const [row, y] of [[0, 78], [1, 99]] as const) {
      c.fillStyle = 'rgba(70,48,28,0.8)';
      c.fillRect(13, y + 5, 74, 2);
      for (let i = 0; i < 6; i++) ware(c, shop.goods, 20 + i * 12, y - 1, 8, i + row * 2);
    }
    // The glass catches the sky.
    c.fillStyle = 'rgba(210,230,255,0.16)';
    c.beginPath();
    c.moveTo(13, 61);
    c.lineTo(50, 61);
    c.lineTo(24, 107);
    c.lineTo(13, 107);
    c.fill();

    // The awning over it: stripes, and its shade on the wall.
    for (let x = 6; x < 94; x += 8) {
      c.fillStyle = (x - 6) % 16 === 0 ? shop.awning : '#fbf6ea';
      c.beginPath();
      c.moveTo(x, 44);
      c.lineTo(x + 8, 44);
      c.lineTo(x + 9, 57);
      c.lineTo(x - 1, 57);
      c.fill();
    }
    c.fillStyle = 'rgba(20,24,36,0.22)';
    c.fillRect(6, 57, 88, 4);

    // The door, with a pane of glass, a handle and a stone step.
    c.fillStyle = shop.trim;
    c.fillRect(103, 50, 40, 68);
    c.fillStyle = shop.door;
    c.fillRect(107, 54, 32, 64);
    c.fillStyle = '#e8c88a';
    c.fillRect(112, 60, 22, 24);
    c.fillStyle = shop.trim;
    c.fillRect(122, 60, 2, 24);
    c.fillStyle = '#d8d0b8';
    c.fillRect(133, 92, 3, 6);
    c.fillStyle = '#a5a29c';
    c.fillRect(100, 118, 46, 10);

    // The sign over the door: a board with a picture of what the shop sells. No letters.
    c.fillStyle = '#fbf6ea';
    c.beginPath();
    c.ellipse(123, 38, 19, 9, 0, 0, Math.PI * 2);
    c.fill();
    ware(c, shop.goods, 123, 38, 12, shop.goods === 'candy' ? 0 : 1);
  });
}

/**
 * The fronts of the street's houses, side by side behind the pavement. The candy shop stands where the
 * chapter ends, so that its door is the one he reaches.
 */
export function fronts(chapter: ChapterData, from: number, to: number): Group {
  const group = new Group();
  const materials = SHOPS.map((shop) => new MeshBasicMaterial({ map: front(shop) }));
  const floor = heightAt(chapter, from + 20);
  // The candy shop's door is 123 of its picture's 160 across: put that at the goal.
  const last = chapter.goalX - (123 / 160 - 0.5) * HOUSE.wide;
  let style = 0;
  for (let x = last; x > from - 30; x -= HOUSE.wide + 1.5) {
    const house = new Mesh(new PlaneGeometry(HOUSE.wide, HOUSE.tall), materials[style % materials.length]!);
    house.position.set(x, Math.min(floor, 0) + HOUSE.tall / 2 - 0.6, -13);
    house.renderOrder = -2;
    group.add(house);
    style++;
  }
  // Between the houses, and beyond the last: the dark of a yard, so that no sky shows through at the foot.
  const yard = new Mesh(new PlaneGeometry(to - from + 80, HOUSE.tall), new MeshBasicMaterial({ color: '#4f5a52' }));
  yard.position.set((from + to) / 2, Math.min(floor, 0) + HOUSE.tall / 2 - 0.6, -13.4);
  yard.renderOrder = -3;
  // Under the street it is dark: the drain and the cellar window's well go down into it.
  const under = new Mesh(new PlaneGeometry(to - from + 80, 16), new MeshBasicMaterial({ color: '#1d2024', fog: false }));
  under.position.set((from + to) / 2, Math.min(floor, 0) - 8.4, -12.6);
  under.renderOrder = -1;
  group.add(yard, under, bicycle(chapter));
  return group;
}

/**
 * A bicycle leaning by the wall, at the chapter's first hook: its wheel is a great ring over him, and the
 * lace takes hold of its pedal. Plain, with no mark on it.
 */
function bicycle(chapter: ChapterData): Group {
  const group = new Group();
  const hook = chapter.hooks?.[0];
  if (!hook) return group;
  const rubber = new MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.9 });
  const steel = new MeshStandardMaterial({ color: '#c6c8cc', roughness: 0.35, metalness: 0.6 });
  const paint = new MeshStandardMaterial({ color: '#3f6f8f', roughness: 0.5 });
  const centre = { x: hook.x - 6.4, y: heightAt(chapter, hook.x - 6.4) + 5.2 };
  const tyre = new Mesh(new TorusGeometry(4.9, 0.3, 10, 48), rubber);
  tyre.position.set(centre.x, centre.y, -2.6);
  const rim = new Mesh(new TorusGeometry(4.5, 0.1, 6, 48), steel);
  rim.position.copy(tyre.position);
  const spokes = new InstancedMesh(new BoxGeometry(0.05, 8.9, 0.05), steel, 9);
  const place = new Object3D();
  for (let i = 0; i < spokes.count; i++) {
    place.position.copy(tyre.position);
    place.rotation.set(0, 0, (i / spokes.count) * Math.PI);
    place.updateMatrix();
    spokes.setMatrixAt(i, place.matrix);
  }
  spokes.computeBoundingSphere();
  // The frame: from the wheel's hub to the crank, and up towards the saddle, out of the picture.
  const tube = (ax: number, ay: number, bx: number, by: number, thick: number, material: MeshStandardMaterial, z = -2.3) => {
    const long = Math.hypot(bx - ax, by - ay);
    const mesh = new Mesh(new CylinderGeometry(thick, thick, long, 10), material);
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, z);
    mesh.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
    return mesh;
  };
  const crank = { x: hook.x - 0.9, y: hook.y + 2.4 };
  group.add(
    tyre, rim, spokes,
    tube(centre.x, centre.y, crank.x, crank.y, 0.22, paint),
    tube(crank.x, crank.y, crank.x - 2.2, crank.y + 9, 0.26, paint),
    tube(crank.x, crank.y, crank.x + 5.5, crank.y + 8, 0.26, paint),
    // The crank arm, and the pedal the lace hooks on to.
    tube(crank.x, crank.y, hook.x, hook.y + 0.25, 0.1, steel, -0.9),
  );
  const pedal = new Mesh(new BoxGeometry(0.9, 0.18, 0.8), rubber);
  pedal.position.set(hook.x, hook.y + 0.3, -0.5);
  group.add(pedal);
  return group;
}

const LEAVES = ['#e8b63a', '#d99a2b', '#f0cf5a', '#c9792a', '#b8943a'].map((hex) => new Color(hex));

/** One stretch of the street: the birches' leaves on the ground, and a lamp post in every second stretch. */
export function street(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  // A birch leaf: small, and nearly round, with a point.
  const leaves = new InstancedMesh(new CircleGeometry(0.2, 7).scale(1.3, 1, 1), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: DoubleSide }), 46);
  let count = 0;
  for (let i = 0; i < 46; i++) {
    const x = from + next() * (to - from);
    // Behind the path, or in front of it: never where he walks.
    const z = next() < 0.72 ? -0.6 - next() * 7 : 0.6 + next() * 1.6;
    const turn = next() * Math.PI * 2;
    const tilt = (next() - 0.5) * 0.5;
    const tone = LEAVES[Math.floor(next() * LEAVES.length)]!;
    const y = heightAt(chapter, x);
    // None over the drain, in the well or on the puddle's bottom.
    if (y < -2 || Math.abs(heightAt(chapter, x + 0.4) - y) > 0.2 || Math.abs(heightAt(chapter, x - 0.4) - y) > 0.2) continue;
    place.position.set(x, y + 0.03 + next() * 0.02, z);
    place.rotation.set(-Math.PI / 2 + tilt, 0, turn);
    place.scale.setScalar(0.7 + next() * 0.8);
    place.updateMatrix();
    leaves.setMatrixAt(count, place.matrix);
    leaves.setColorAt(count, tone);
    count++;
  }
  leaves.count = count;
  leaves.computeBoundingSphere();
  if (count > 0) group.add(leaves);

  // A lamp post: a dark green column on a foot, going up out of the picture.
  if (Math.round(from / 18) % 2 === 0) {
    const x = from + 4 + next() * 8;
    const y = heightAt(chapter, x);
    if (y > -2) {
      const iron = new MeshStandardMaterial({ color: '#2f4a3c', roughness: 0.6 });
      const post = new Mesh(new CylinderGeometry(0.42, 0.55, 40, 14), iron);
      post.position.set(x, y + 20, -8.2);
      const foot = new Mesh(new CylinderGeometry(0.95, 1.25, 2.2, 14), iron);
      foot.position.set(x, y + 1.1, -8.2);
      group.add(post, foot);
    }
  }
  return group;
}
