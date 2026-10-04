import {
  BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, RepeatWrapping, SphereGeometry, SRGBColorSpace, TorusGeometry,
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

/** How wide a house front is, and how tall, in EL. Its logical picture is 160 by 192, including 64 units above the wall for the roof. */
const HOUSE = { wide: 24, tall: 28.8 };
/** How wide the yard between two houses is. */
const YARD = 12;

/**
 * The village beyond the street, far off and soft: wooden houses with red tin roofs, birches in their
 * October yellow, spruces, and the low blue hills of the valley. It is one long picture far behind the
 * fronts, seen over the fences: as he walks, it slides past more slowly than the houses do.
 */
function skyline(from: number, to: number, foot: number): Mesh {
  const next = sequence(211);
  // Drawn at twice the size it is measured in, and a little out of focus: it is far away.
  const picture = drawn(1024, 256, (c) => {
    c.scale(2, 2);
    c.clearRect(0, 0, 512, 128);
    c.filter = 'blur(1.1px)';
    // Two ridges of hills, the far one paler.
    for (const [base, tall, colour] of [[78, 30, '#a9b9cc'], [92, 22, '#8fa3bd']] as const) {
      c.fillStyle = colour;
      c.beginPath();
      c.moveTo(0, 128);
      for (let px = 0; px <= 512; px += 8) c.lineTo(px, base - tall * (0.5 + 0.5 * Math.sin(px * 0.0123 + base) * Math.cos(px * 0.031 + tall)));
      c.lineTo(512, 128);
      c.fill();
    }
    // Spruces and birches between the houses.
    for (let i = 0; i < 34; i++) {
      const px = next() * 512;
      const birch = next() < 0.5;
      const tall = 16 + next() * 16;
      c.fillStyle = birch ? ['#d0b24a', '#bfa846', '#a9b060'][i % 3]! : '#3f5a48';
      c.beginPath();
      if (birch) c.ellipse(px, 104 - tall * 0.6, tall * 0.36, tall * 0.6, 0, 0, Math.PI * 2);
      else {
        c.moveTo(px, 104 - tall * 1.2);
        c.lineTo(px + tall * 0.3, 106);
        c.lineTo(px - tall * 0.3, 106);
      }
      c.fill();
    }
    // The houses: a wall, a broken roof of red tin, white gable boards, a chimney, a few windows.
    const walls = ['#e3b24c', '#e9e6dc', '#e3b24c', '#8f2d22', '#efe6c8', '#e3b24c'];
    for (let i = 0; i < 9; i++) {
      const px = 20 + i * 56 + (next() - 0.5) * 16;
      const wide = 30 + next() * 12;
      const top = 80 + next() * 6;
      c.fillStyle = walls[i % walls.length]!;
      c.fillRect(px - wide / 2, top, wide, 112 - top);
      c.fillStyle = '#b5443a';
      c.beginPath();
      c.moveTo(px - wide / 2 - 2, top);
      c.lineTo(px - wide * 0.34, top - 12);
      c.lineTo(px, top - 19);
      c.lineTo(px + wide * 0.34, top - 12);
      c.lineTo(px + wide / 2 + 2, top);
      c.fill();
      c.fillRect(px + wide * 0.12, top - 22, 4, 6);
      c.fillStyle = '#fbf6ea';
      c.fillRect(px - wide / 2 - 2, top - 1, wide + 4, 1.5);
      c.fillStyle = '#56687c';
      for (const wx of [-0.28, 0, 0.28]) c.fillRect(px + wx * wide - 2, top + 6, 4, 6);
    }
    // The haze of the valley lies over all of it, thickest at the foot.
    const haze = c.createLinearGradient(0, 40, 0, 128);
    haze.addColorStop(0, 'rgba(216,221,230,0.25)');
    haze.addColorStop(1, 'rgba(216,221,230,0.62)');
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = haze;
    c.fillRect(0, 0, 512, 128);
  });
  picture.wrapS = RepeatWrapping;
  const wide = to - from + 220;
  picture.repeat.set(wide / 96, 1);
  const plate = new Mesh(new PlaneGeometry(wide, 24), new MeshBasicMaterial({ map: picture, transparent: true, fog: false, depthWrite: false }));
  plate.position.set((from + to) / 2, foot + 12.6, -52);
  plate.renderOrder = -5;
  return plate;
}

interface Shop {
  wall: string;
  trim: string;
  awning: string;
  door: string;
  /** What lies in the window and hangs on the sign: plain shapes. */
  goods: 'candy' | 'bread' | 'boots' | 'yarn';
  roof: 'gable' | 'gambrel';
  roofColour: string;
  horizontal?: boolean;
}

/**
 * The houses of the street, in the colours of the village's own wooden houses: ochre yellow and white with
 * white trim, a Falu red one, and a pale plastered one. The first is the candy shop: the one he is on his
 * way to.
 */
const SHOPS: Shop[] = [
  { wall: '#e3c37a', trim: '#fbf6ea', awning: '#747b70', door: '#7a5632', goods: 'candy', roof: 'gambrel', roofColour: '#707a7e', horizontal: true },
  { wall: '#b5beaa', trim: '#fbf6ea', awning: '#8a8f96', door: '#4f5a60', goods: 'bread', roof: 'gable', roofColour: '#b75745' },
  { wall: '#983f32', trim: '#fbf6ea', awning: '#e8d9b0', door: '#5d4a36', goods: 'boots', roof: 'gambrel', roofColour: '#666f74' },
  { wall: '#e7e3d2', trim: '#f6f0e2', awning: '#7e8d76', door: '#6a4a3a', goods: 'yarn', roof: 'gable', roofColour: '#bc6450' },
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
  return drawn(640, 768, (c) => {
    c.scale(4, 4);
    c.translate(0, 64);
    // An original interpretation of Köpmangatan's timber fronts and roof silhouettes.
    c.fillStyle = shop.wall;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(80, -57); c.lineTo(160, 0); c.fill();
    const roof = [[-5, 1], [shop.roof === 'gambrel' ? 29 : 80, shop.roof === 'gambrel' ? -39 : -61],
      [67,-61],[93,-61],[shop.roof === 'gambrel' ? 131 : 80, shop.roof === 'gambrel' ? -39 : -61],[165,1]];
    c.lineJoin = 'round'; c.strokeStyle = shop.roofColour; c.lineWidth = 8;
    c.beginPath(); roof.forEach(([x,y],i)=>i ? c.lineTo(x!,y!) : c.moveTo(x!,y!)); c.stroke();
    c.strokeStyle = shop.trim; c.lineWidth = 2;
    c.beginPath(); roof.forEach(([x,y],i)=>i ? c.lineTo(x!,y!+3) : c.moveTo(x!,y!+3)); c.stroke();
    c.fillStyle = shop.roofColour; c.fillRect(110,-53,10,25); c.fillRect(108,-55,14,4);
    c.fillStyle = shop.trim; c.fillRect(68,-36,24,25);
    c.fillStyle = '#657c87'; c.fillRect(71,-33,18,19);
    c.fillStyle = shop.trim; c.fillRect(79,-33,2,19); c.fillRect(71,-25,18,2);
    // The wall: boards, lit from the left, with corner boards and the shade under the eaves.
    c.fillStyle = shop.wall;
    c.fillRect(0, 0, 160, 128);
    for (let n = 0; n < 160; n += 5) {
      c.fillStyle = 'rgba(35,42,35,0.13)';
      if (shop.horizontal) c.fillRect(0,n,160,.7); else c.fillRect(n,0,.7,118);
      c.fillStyle = 'rgba(255,255,245,0.17)';
      if (shop.horizontal) c.fillRect(0,n+1,160,.55); else c.fillRect(n+1,0,.6,118);
    }
    const light = c.createLinearGradient(0,0,160,128);
    light.addColorStop(0,'rgba(255,246,215,0.18)'); light.addColorStop(1,'rgba(34,48,50,0.2)');
    c.fillStyle = light; c.fillRect(0,0,160,128);
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
      c.fillRect(x, 23, 40, 1.5);
      c.fillStyle = 'rgba(25,35,39,0.28)'; c.fillRect(x-4,39,49,3);
      c.fillStyle = shop.trim; c.fillRect(x-4,36,49,3);
      c.fillStyle = shop.awning; c.fillRect(x-5,9,3,27); c.fillRect(x+42,9,3,27);
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
 * The fronts of the street's houses, side by side behind the pavement. The candy shop stays at its authored
 * door when the path continues into the room: extending the goal must not move every house along the street.
 */
export function fronts(chapter: ChapterData, from: number, to: number): Group {
  const group = new Group();
  const materials = SHOPS.map((shop) => new MeshBasicMaterial({ map: front(shop), transparent: true, alphaTest: .08 }));
  const floor = heightAt(chapter, from + 20);
  // The candy shop's door is 123 of its picture's 160 across: put that at the goal.
  const last = (chapter.shop?.door ?? chapter.goalX) - (123 / 160 - 0.5) * HOUSE.wide;
  const foot = Math.min(floor, 0) - 0.6;
  // A picket fence in Falu red closes each yard between two houses, and the village shows over it.
  const pickets = drawn(32, 32, (c) => {
    c.clearRect(0, 0, 32, 32);
    c.fillStyle = '#8f2d22';
    for (const x of [2, 18]) {
      c.beginPath();
      c.moveTo(x, 32);
      c.lineTo(x, 7);
      c.lineTo(x + 6, 1);
      c.lineTo(x + 12, 7);
      c.lineTo(x + 12, 32);
      c.fill();
    }
    c.fillRect(0, 12, 32, 3);
    c.fillRect(0, 24, 32, 3);
  });
  pickets.wrapS = RepeatWrapping;
  pickets.repeat.set(YARD / 2.4, 1);
  const fence = new MeshBasicMaterial({ map: pickets, transparent: true });
  let style = 0;
  let x = last;
  while (x > from - 30) {
    const house = new Mesh(new PlaneGeometry(HOUSE.wide, HOUSE.tall), materials[style % materials.length]!);
    house.position.set(x, foot + HOUSE.tall / 2, -13);
    house.name = `kopmangatan-front:${style}`;
    house.renderOrder = -2;
    group.add(house);
    style++;
    // After every second house, a yard as wide as half a house.
    const open = style % 2 === 0;
    if (open) {
      const rail = new Mesh(new PlaneGeometry(YARD, 3.4), fence);
      rail.position.set(x - HOUSE.wide / 2 - YARD / 2, foot + 1.7, -12.9);
      rail.renderOrder = -2;
      group.add(rail);
    }
    x -= HOUSE.wide + (open ? YARD : 0.6);
  }
  // Behind the fences: the yards' hedges, low, so that no sky shows at the foot and the far village shows above.
  const yard = new Mesh(new PlaneGeometry(to - from + 80, 5.2), new MeshBasicMaterial({ map: drawn(512,128,c=>{
    const next=sequence(418); c.fillStyle='#3c523d'; c.fillRect(0,0,512,128);
    for(let i=0;i<950;i++){c.fillStyle=['#556c46','#64764c','#809052','#455e40'][i%4]!;c.beginPath();c.ellipse(next()*512,next()*128,2+next()*7,2+next()*4,next()*3,0,Math.PI*2);c.fill();}
    const shade=c.createLinearGradient(0,0,0,128);shade.addColorStop(0,'rgba(203,201,140,.12)');shade.addColorStop(1,'rgba(16,33,27,.72)');c.fillStyle=shade;c.fillRect(0,0,512,128);
  }) }));
  yard.position.set((from + to) / 2, foot + 2.6, -13.6);
  yard.renderOrder = -3;
  group.add(skyline(from, to, foot));
  // Under the street it is dark: the drain and the cellar window's well go down into it.
  const under = new Mesh(new PlaneGeometry(to - from + 80, 16), new MeshBasicMaterial({ color: '#1d2024', fog: false }));
  under.position.set((from + to) / 2, Math.min(floor, 0) - 8.4, -12.6);
  under.renderOrder = -1;
  group.add(yard, under, bicycle(chapter), shopInterior(chapter));
  return group;
}

/** A cutaway room continuous with the outdoor step: huge jars, plain shelves and a bag to share. */
function shopInterior(chapter: ChapterData): Group {
  const group = new Group();
  group.name = 'candy-shop-interior';
  const shop = chapter.shop;
  if (!shop) return group;
  const { door, to, floor } = shop;
  const wood = new MeshStandardMaterial({ color: '#98663f', roughness: 0.85 });
  const cream = new MeshStandardMaterial({ color: '#f1dbb2', roughness: 0.9 });
  const brass = new MeshStandardMaterial({ color: '#c9a35e', roughness: 0.6 });
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, material = wood) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  const wallpaper = drawn(128, 128, (c) => {
    c.fillStyle = '#edddbd'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#e5d2ad';
    for (let x = 0; x < 128; x += 16) c.fillRect(x, 0, 5, 128);
    c.fillStyle = '#dac5a0';
    for (let x = 8; x < 128; x += 32) for (let y = 12; y < 128; y += 32) {
      c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill();
    }
  });
  wallpaper.wrapS = wallpaper.wrapT = RepeatWrapping;
  wallpaper.repeat.set((to - door) / 5, 4);
  const wall = new Mesh(new PlaneGeometry(to - door + 2, 28), new MeshBasicMaterial({ map: wallpaper, fog: false }));
  wall.position.set((door + to) / 2, floor + 14, -8.5);
  group.add(wall);
  // The door is open behind his path. Its jamb, warm sill and doormat mark the threshold without a wall
  // across the play plane. The interior wall hides cars beyond it; they never enter the room.
  block(door, floor + 10, -2.1, 0.5, 20, 0.6, cream);
  block(door + 3, floor + 19.7, -2.1, 6.5, 0.6, 0.6, cream);
  const openDoor = block(door - 1.1, floor + 6, -5, 2.6, 12, 0.25);
  openDoor.rotation.y = -0.75;
  // Close the cutaway's side below the threshold, where the rounded outdoor bank meets straight boards.
  // Both top surfaces remain at the authored floor height; no white slice of the backdrop shows through.
  block(door + 0.13, floor - 8, 1.84, 0.55, 16, 2.15, new MeshStandardMaterial({ color: '#68513b', roughness: 1 }));
  block(door + 1.8, floor + 0.035, -0.9, 4.5, 0.05, 3, new MeshStandardMaterial({ color: '#8b6260', roughness: 1 }));
  block((door + to) / 2, floor + 1.2, -8.1, to - door + 1, 2.4, 0.3);
  for (const y of [floor + 1, floor + 8.4]) block(door + 23, y, -5.9, 43, 0.36, 4.2);

  const jarGeometry = new CylinderGeometry(1.8, 1.95, 5.2, 18, 1, true);
  const glass = new MeshStandardMaterial({ color: '#f4f4e5', roughness: 0.18, transparent: true, opacity: 0.17, depthWrite: false, side: DoubleSide });
  const jars = new InstancedMesh(jarGeometry, glass, 10);
  const lids = new InstancedMesh(new CylinderGeometry(1.98, 1.98, 0.28, 18), brass, 10);
  const perJar = 54;
  const sweets = new InstancedMesh(new SphereGeometry(0.32, 7, 5), new MeshStandardMaterial({ roughness: 0.45 }), 10 * perJar);
  const place = new Object3D();
  const next = sequence(708);
  const tones = ['#de5161', '#e6b940', '#81a269', '#ecb3c2', '#a397cb', '#d98748'].map((c) => new Color(c));
  for (let i = 0; i < 10; i++) {
    const x = door + 7 + (i % 5) * 8;
    const shelf = floor + (i < 5 ? 1.18 : 8.58);
    place.position.set(x, shelf + 2.6, -5.9); place.updateMatrix(); jars.setMatrixAt(i, place.matrix);
    place.position.y = shelf + 5.35; place.updateMatrix(); lids.setMatrixAt(i, place.matrix);
    for (let j = 0; j < perJar; j++) {
      // A loose pile from the bottom up, not sweets floating throughout an empty jar.
      place.position.set(x + ((j % 3) - 1) * 0.73 + (next() - 0.5) * 0.12,
        shelf + 0.35 + Math.floor(j / 9) * 0.56,
        -5.9 + ((Math.floor(j / 3) % 3) - 1) * 0.73 + (next() - 0.5) * 0.12);
      place.rotation.set(next(), next(), next()); place.scale.set(1.1, 0.95, 0.9); place.updateMatrix();
      sweets.setMatrixAt(i * perJar + j, place.matrix); sweets.setColorAt(i * perJar + j, tones[i % tones.length]!);
    }
    place.rotation.set(0, 0, 0); place.scale.setScalar(1);
  }
  for (const mesh of [jars, lids, sweets]) mesh.computeBoundingSphere();
  group.add(sweets, lids, jars);
  // A plain paper bag, open at its top, beside the final candy. No sign, price or brand.
  const paper = new MeshStandardMaterial({ color: '#d5b57e', roughness: 1 });
  const dark = new MeshBasicMaterial({ color: '#6a5035' });
  const bagX = chapter.goalX + 1.9;
  block(bagX, floor + 1.7, -2.7, 3.2, 3.4, 0.16, paper);
  block(bagX - 1.52, floor + 1.7, -3.45, 0.16, 3.4, 1.5, paper);
  block(bagX + 1.52, floor + 1.7, -3.45, 0.16, 3.4, 1.5, paper);
  const opening = new Mesh(new PlaneGeometry(2.9, 1.3), dark);
  opening.rotation.x = -Math.PI / 2; opening.position.set(bagX, floor + 0.05, -3.45); group.add(opening);
  return group;
}

/**
 * Anonymous street life, well behind Elof: shoes passing on the pavement and a slow, unmarked car.
 * These are only scenery: their shadows and steady motion announce them, and they have no collision,
 * timer or damage rule. Everything is allocated at startup and the view's paused clock freezes them.
 */
export function villageLife(chapter: ChapterData): { group: Group; update(clock: number): void } {
  const group = new Group();
  group.name = 'village-life';
  const shoes = new Group();
  const car = new Group();
  shoes.name = 'passing-shoes'; car.name = 'passing-car';
  const cloth = new MeshStandardMaterial({ color: '#687989', roughness: 1 });
  const leather = new MeshStandardMaterial({ color: '#705142', roughness: 0.85 });
  const rubber = new MeshStandardMaterial({ color: '#343535', roughness: 1 });
  const shape = (parent: Group, material: MeshStandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const legs = [-0.6, 0.6].map((z) => {
    const leg = new Group(); leg.position.z = z;
    shape(leg, rubber, 0.5, 0.18, 0, 3.3, 0.36, 1.3);
    shape(leg, leather, 0.3, 0.7, 0, 2.8, 1, 1.25);
    shape(leg, cloth, -0.55, 10, 0, 1.3, 18, 1.2);
    shoes.add(leg); return leg;
  });
  const paint = new MeshStandardMaterial({ color: '#be7564', roughness: 0.65 });
  const window = new MeshStandardMaterial({ color: '#809ba6', roughness: 0.5 });
  shape(car, paint, 0, 3.3, 0, 18, 3.3, 4);
  shape(car, paint, -0.8, 6, 0, 9.5, 3.1, 3.6);
  shape(car, window, -0.8, 6.1, 1.82, 8.4, 2.2, 0.06);
  const wheel = new InstancedMesh(new TorusGeometry(1.8, 0.42, 8, 24), rubber, 4);
  const hubs = new InstancedMesh(new CircleGeometry(1.2, 16), new MeshBasicMaterial({ color: '#c4c2b9', side: DoubleSide }), 4);
  const place = new Object3D();
  for (let i = 0; i < 4; i++) {
    place.position.set(i % 2 === 0 ? -6 : 6, 1.9, i < 2 ? 2.1 : -2.1); place.updateMatrix(); wheel.setMatrixAt(i, place.matrix);
    place.position.z += i < 2 ? 0.1 : -0.1; place.updateMatrix(); hubs.setMatrixAt(i, place.matrix);
  }
  wheel.computeBoundingSphere(); hubs.computeBoundingSphere(); car.add(wheel, hubs);
  // A pale lamp on each end, with no flashing or sudden movement.
  shape(car, new MeshStandardMaterial({ color: '#f6dda1', emissive: '#77603a', emissiveIntensity: 0.3 }), 8.85, 3.3, 1.6, 0.25, 0.8, 0.5);
  shape(car, new MeshStandardMaterial({ color: '#ad5347' }), -8.85, 3.3, 1.6, 0.25, 0.6, 0.5);
  const shadowMaterial = new MeshBasicMaterial({ color: '#242b31', transparent: true, opacity: 0.18, depthWrite: false });
  const shade = (parent: Group, width: number, depth: number) => {
    const mesh = new Mesh(new CircleGeometry(1, 24), shadowMaterial);
    mesh.rotation.x = -Math.PI / 2; mesh.scale.set(width, depth, 1); mesh.position.y = 0.025; parent.add(mesh);
  };
  shade(car, 10, 2.8); shade(shoes, 3.5, 1.6);
  group.add(car, shoes);
  const lo = chapter.ground[0]!.x - 36;
  const hi = (chapter.shop?.to ?? chapter.goalX) + 40;
  const span = hi - lo;
  return {
    group,
    update(clock) {
      // The loop resets beyond the playable view. Inside the shop its wall hides both lanes.
      car.position.set(lo + ((clock * 4 + 104) % span), 0.12, -11.2);
      shoes.position.set(lo + ((clock * 2.8 + 45) % span), 2, -10.6);
      for (const [i, leg] of legs.entries()) {
        const stride = clock * 3.2 + i * Math.PI;
        leg.position.x = Math.sin(stride) * 1.15;
        leg.position.y = Math.max(0, Math.cos(stride)) * 0.75;
        leg.rotation.z = -Math.sin(stride) * 0.08;
      }
    },
  };
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
    if ((chapter.shop && x >= chapter.shop.door) || y < -2 || Math.abs(heightAt(chapter, x + 0.4) - y) > 0.2 || Math.abs(heightAt(chapter, x - 0.4) - y) > 0.2) continue;
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
    if (y > -2 && (!chapter.shop || x < chapter.shop.door)) {
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
