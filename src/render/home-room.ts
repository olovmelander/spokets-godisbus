import {
  BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, Color, ConeGeometry, CylinderGeometry,
  Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sequence } from './dressing/kit';

// Shared by both adventures. The room models can load without importing the second adventure's story pack.
const paint = (geometry: BufferGeometry, colour: string): BufferGeometry => {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  const tint = new Color(colour);
  const count = part.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colours.set([tint.r, tint.g, tint.b], i * 3);
  part.setAttribute('color', new Float32BufferAttribute(colours, 3));
  part.deleteAttribute('uv');
  return part;
};
const box = (w: number, h: number, d: number, x: number, y: number, z: number, colour: string) =>
  paint(new BoxGeometry(w, h, d).translate(x, y, z), colour);

/** A little picture drawn in code, where there is anything to draw with. */
function drawnPicture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  if (c) draw(c);
  return new CanvasTexture(canvas);
}

/** A rag rug's stripes, seen from above: the same every time. */
function ragRug(): CanvasTexture | null {
  const random = sequence(23);
  const STRIPES = ['#a8483a', '#e4d8bc', '#3f6a8a', '#d0a43a', '#62784e', '#e4d8bc'];
  const texture = drawnPicture(256, 64, (c) => {
    for (let x = 0; x < 256;) {
      const wide = 5 + random() * 15;
      c.fillStyle = STRIPES[Math.floor(random() * STRIPES.length)]!;
      c.fillRect(x, 0, wide + 1, 64);
      x += wide;
    }
  });
  if (texture) texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * The family's room, which the evening of the storm and Sunday morning share: a rag rug, a sofa, a floor lamp, a plant and
 * Moa's drawings taped to the wall, each in its own place in that chapter's stretch of it.
 */
export function roomThings(at: { sofa: number; lamp: number; plant: number; drawings: number; rug: number; blanket: boolean }): Group {
  const group = new Group();
  group.name = 'family-room';
  const WALL = -8.5;
  const home: BufferGeometry[] = [];
  /** A piece of the room as plain shapes, until its model has come (art/blender/a2-room.py). */
  const piece = (name: string, parts: BufferGeometry[], x: number, z: number) => {
    const held = new Group();
    held.add(new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
    held.name = `room:${name}`;
    held.userData.model = name;
    held.userData.disposeFallback = true;
    held.userData.shift = x;
    held.userData.back = z;
    group.add(held);
  };
  const SOFA = { x: at.sofa, z: -6.6 };
  const couch = [box(11, 1.5, 3.6, SOFA.x, 1.15, SOFA.z, '#5c6c4c'), box(11, 3.4, 1, SOFA.x, 2.5, SOFA.z - 1.6, '#566644')];
  for (const side of [-5.6, 5.6]) couch.push(box(1, 2.5, 3.8, SOFA.x + side, 1.55, SOFA.z, '#4e5c3e'));
  for (const side of [-1, 1]) couch.push(box(0.3, 0.45, 3.2, SOFA.x + side * 4.8, 0.22, SOFA.z, '#3a2c20'));
  // Bertil's blanket, pulled half off it the morning after, and a cushion.
  if (at.blanket) couch.push(box(3.4, 0.28, 3.9, SOFA.x - 2.2, 2.02, SOFA.z + 0.1, '#b89a4a'), box(3.4, 1.6, 0.26, SOFA.x - 2.2, 1.2, SOFA.z + 2, '#b89a4a'));
  couch.push(paint(new SphereGeometry(0.9, 10, 8).scale(1, 0.85, 0.4).rotateZ(0.3).translate(SOFA.x + 3.6, 2.7, SOFA.z - 0.8), '#a8604a'));
  piece(at.blanket ? 'soffa-filt' : 'soffa', couch, SOFA.x, SOFA.z);
  // The floor lamp, and the plant.
  const lamp: BufferGeometry[] = [];
  const plant: BufferGeometry[] = [];
  lamp.push(paint(new CylinderGeometry(0.7, 0.8, 0.14, 12).translate(at.lamp, 0.07, -7.4), '#3a3e44'), paint(new CylinderGeometry(0.07, 0.07, 6, 8).translate(at.lamp, 3, -7.4), '#3a3e44'));
  lamp.push(paint(new CylinderGeometry(0.75, 1.15, 1.2, 14, 1, true).translate(at.lamp, 6.4, -7.4), '#e4d8bc'));
  piece('golvlampa', lamp, at.lamp, -7.4);
  plant.push(paint(new CylinderGeometry(0.72, 0.56, 1.1, 12).translate(at.plant, 0.55, -7.8), '#a8704a'));
  for (let i = 0; i < 9; i++) {
    const turn = (i / 9) * Math.PI * 2;
    const lean = 0.35 + (i % 3) * 0.22;
    plant.push(paint(new ConeGeometry(0.28, 2.8, 5).scale(1, 1, 0.3).rotateZ(lean).rotateY(turn).translate(at.plant - Math.cos(turn) * lean * 1.2, 2.3, -7.8 + Math.sin(turn) * lean * 1.2), i % 2 ? '#4a7238' : '#3a5e30'));
  }
  piece('krukvaxt', plant, at.plant, -7.8);
  // Moa's drawings: paper on the wall, each with a sun, a house or two figures in crayon, and no words.
  const d = at.drawings;
  for (const [x, y, wide] of [[33.6, 3.2, 1.9], [35.8, 3.5, 1.6], [37.6, 3, 1.5]] as const) {
    home.push(box(wide, wide * 1.3, 0.04, x + d, y, WALL - 0.34, '#f4f0e4'), box(0.14, 0.14, 0.05, x + d, y + wide * 0.62, WALL - 0.31, '#d8c078'));
  }
  home.push(paint(new CircleGeometry(0.34, 12).translate(33.3 + d, 3.8, WALL - 0.3), '#d8a838'));
  home.push(box(0.9, 0.7, 0.02, 33.8 + d, 2.6, WALL - 0.31, '#a84a3a'), paint(new ConeGeometry(0.72, 0.5, 4).rotateY(Math.PI / 4).scale(1, 1, 0.02).translate(33.8 + d, 3.2, WALL - 0.31), '#3f5a7a'));
  home.push(box(0.3, 0.9, 0.02, 35.5 + d, 3.4, WALL - 0.31, '#3f6a8a'), box(0.24, 0.66, 0.02, 36.1 + d, 3.28, WALL - 0.31, '#b89a30'));
  home.push(box(1.1, 0.5, 0.02, 37.6 + d, 2.6, WALL - 0.31, '#5c7a48'), paint(new CircleGeometry(0.3, 10).translate(37.5 + d, 3.3, WALL - 0.31), '#4a6a9a'));
  group.add(new Mesh(mergeGeometries(home), new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
  // The rug under the table, running out under his feet.
  group.add(new Mesh(new PlaneGeometry(13, 9).rotateX(-Math.PI / 2).translate(at.rug, 0.01, -0.8), new MeshStandardMaterial({ map: ragRug(), roughness: 0.95 })));
  return group;
}

