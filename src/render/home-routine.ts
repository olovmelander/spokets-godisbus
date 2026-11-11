import { BoxGeometry, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../sim/types';
import type { SceneFrame } from '../sim/scene';
import type { Rig } from './rig';
import { HOME_BATHROOM, HOME_LAYOUT } from '../content/home-layout';

/** The same doorway in the hall, behind the walking path, in every home chapter. */
export const BATHROOM = HOME_BATHROOM;
const BRUSH_SCALE = 1.6;
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };

function colour(geometry: BufferGeometry, hex: string): BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry, c = new Color(hex);
  const rgb = new Float32Array(g.getAttribute('position').count * 3);
  for (let i = 0; i < rgb.length; i += 3) rgb.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new Float32BufferAttribute(rgb, 3)); g.deleteAttribute('uv'); return g;
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string) =>
  colour(new BoxGeometry(w, h, d).translate(x, y, z), hex);
const joined = (parts: BufferGeometry[]) => new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: .72 }));

/** An original paper-cut programme: a rabbit and a little bird make a cloud float across their meadow. */
function programme(canvas: HTMLCanvasElement, seconds: number, on: boolean): void {
  const c = canvas.getContext('2d'); if (!c) return;
  c.fillStyle = on ? '#8fc6d2' : '#18232b'; c.fillRect(0, 0, 320, 180);
  if (!on) return;
  c.fillStyle = '#79a761'; c.beginPath(); c.ellipse(160, 180, 205, 73, 0, 0, Math.PI * 2); c.fill();
  const cloud = 20 + (seconds * 9) % 280;
  c.fillStyle = '#fff4d5';
  for (const [dx, dy, r] of [[0, 0, 17], [20, -8, 23], [41, 0, 18]] as const) {
    c.beginPath(); c.arc(cloud + dx, 43 + dy, r, 0, Math.PI * 2); c.fill();
  }
  const hop = Math.max(0, Math.sin(seconds * 2.2)) * 12;
  c.fillStyle = '#f4d6ac';
  c.beginPath(); c.ellipse(107, 132 - hop, 25, 30, -.08, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(111, 97 - hop, 22, 19, 0, 0, Math.PI * 2); c.fill();
  for (const x of [102, 119]) { c.beginPath(); c.ellipse(x, 71 - hop, 7, 23, (x - 110) * .02, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#423a35'; c.beginPath(); c.arc(117, 94 - hop, 3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#423a35'; c.lineWidth = 2; c.beginPath(); c.arc(119, 99 - hop, 6, 0, Math.PI * .7); c.stroke();
  const wing = Math.sin(seconds * 5) * 8, bird = 208 + Math.sin(seconds * .8) * 22;
  c.fillStyle = '#e9b84f'; c.beginPath(); c.ellipse(bird, 108, 19, 14, -.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c77543'; c.beginPath(); c.moveTo(bird - 3, 107); c.lineTo(bird - 28, 96 + wing); c.lineTo(bird - 13, 118); c.closePath(); c.fill();
  c.fillStyle = '#423a35'; c.beginPath(); c.arc(bird + 9, 104, 2.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d56a43'; c.beginPath(); c.moveTo(bird + 16, 109); c.lineTo(bird + 29, 112); c.lineTo(bird + 15, 116); c.closePath(); c.fill();
}

export function createHomeRoutine(chapter: ChapterData) {
  const group = new Group(); group.name = 'home-bathroom-and-tv';
  const room = chapter.place === 'home';
  const walls: BufferGeometry[] = [];
  const x = BATHROOM.x, z = BATHROOM.doorZ;
  // The loaded fixture and its fallback occupy the same real room behind the house wall.
  const b = BATHROOM;
  // Structural walls end behind the rear wall; only the door trim projects into the living room.
  const front = HOME_LAYOUT.wall.z - .01, depth = front - b.backZ, middle = (front + b.backZ) / 2;
  const floorFront = z - .18, floorDepth = floorFront - b.backZ;
  walls.push(box(b.width + b.wallThickness, b.height, b.wallThickness, x, b.height / 2, b.backZ, '#e6e0d3'),
    box(b.width + b.wallThickness, b.wallThickness, depth + b.wallThickness / 2, x, b.height - b.wallThickness / 2, middle - b.wallThickness / 4, '#f1ebdf'),
    box(b.width - b.wallThickness, .04, floorDepth, x, b.floorY - .02, (floorFront + b.backZ) / 2, '#aebbb3'));
  for (const side of [-1, 1]) {
    const sx = x + side * b.width / 2;
    walls.push(box(b.wallThickness, b.height, depth, sx, b.height / 2, middle, '#e6e0d3'),
      box(.028, 3.05, depth - .1, sx - side * (b.wallThickness / 2 + .014), 1.525, middle, '#c9d9d1'),
      box(.17, b.openingHeight, .30, x + side * (b.openingWidth / 2 + .085), b.openingHeight / 2, z, '#eee6d6'));
  }
  walls.push(box(b.openingWidth + .34, .19, .30, x, b.openingHeight + .095, z, '#eee6d6'),
    box(b.width - b.wallThickness, 3.05, .028, x, 1.525, b.backZ + .104, '#c9d9d1'));
  const threshold = new BoxGeometry(b.openingWidth, .04, .36).translate(x, .005, z);
  const vertices = threshold.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const ramp = (z + .18 - vertices.getZ(i)) / .36;
    vertices.setY(i, vertices.getY(i) > 0 ? b.floorY * ramp : -.015);
  }
  threshold.computeVertexNormals(); walls.push(colour(threshold, '#c8c3b4'));
  const backFace = b.backZ + b.wallThickness / 2;
  for (let y = .6; y < 3; y += .6) walls.push(box(b.width - b.wallThickness, .018, .006, x, y, backFace + .031, '#e6ece2'));
  walls.push(box(2.08, 2.46, .13, x, 3.82, backFace + .105, '#b79c74'),
    box(1.88, 2.26, .025, x, 3.82, backFace + .184, '#91adb1'),
    box(2.18, 1.05, .94, x, .925, b.sinkZ, '#a9815e'),
    box(2.28, .12, 1.05, x, 1.46, b.sinkZ, '#d4bea0'));
  walls.push(colour(new SphereGeometry(.67, 16, 8).scale(1.4, .25, .72).translate(x, 1.65, b.sinkZ), '#edf1e8'));
  walls.push(box(.1, .67, .1, x, 1.855, b.sinkZ - .4, '#909da3'),
    box(.1, .1, .32, x, 2.19, b.sinkZ - .25, '#a5afb1'),
    box(.57, 1.12, .05, x - 1.42, 2.10, backFace + .26, '#6da4a5'));
  // A separate local-origin cabinet leaves air between the screen and the sofa.
  const tv = HOME_LAYOUT.television;
  const television = new Group(); television.name = 'home-tv-console';
  television.position.set(tv.x, 0, tv.z); television.rotation.y = tv.yaw;
  television.userData.model = 'home-tv'; television.userData.disposeFallback = true;
  television.add(joined([
    box(tv.consoleWidth, 1.15, tv.consoleDepth - .06, 0, tv.consoleTop - .695, -.03, '#886348'),
    box(tv.consoleWidth, .12, tv.consoleDepth, 0, tv.consoleTop - .06, 0, '#b28b62'),
    ...[-1, 1].flatMap(side => [-1, 1].map(end => box(.16, .3, .16, side * 1.75, .15, end * .53, '#6f513c'))),
    box(tv.screenWidth + .4, tv.screenHeight + .33, .24, 0, tv.screenY, 0, '#29363b'),
    box(.25, .4, .5, 0, tv.consoleTop + .1, 0, '#29363b'),
  ]));
  group.add(television);
  const doorway = new Group(); doorway.name = 'bathroom-door';
  doorway.userData.model = 'home-routine-door'; doorway.userData.disposeFallback = true;
  const door = joined([box(b.doorWidth, b.doorHeight, .14, b.doorWidth / 2, b.doorHeight / 2, 0, '#e5ddcb'),
    box(2.9, 2.15, .06, 1.8, 4.15, .1, '#f2ebdc'), box(2.9, 2.15, .06, 1.8, 1.65, .1, '#f2ebdc'),
    box(.45, .09, .12, 3.15, 2.6, .19, '#9a9b91')]);
  doorway.add(door); doorway.position.set(x - b.doorWidth / 2, 0, z + .04);
  const surround = new Group(); surround.name = 'home-routine-room';
  surround.userData.model = 'home-routine-room'; surround.userData.disposeFallback = true;
  surround.add(joined(walls)); group.add(surround, doorway);
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = 320; canvas.height = 180; programme(canvas, 0, true); }
  const screenMap = canvas ? new CanvasTexture(canvas) : null;
  if (screenMap) screenMap.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new BoxGeometry(tv.screenWidth, tv.screenHeight, .025), new MeshBasicMaterial({ map: screenMap, color: screenMap ? '#ffffff' : '#8fc6d2', fog: false }));
  screen.name = 'home-tv-programme'; screen.userData.keep = 0;
  screen.position.set(0, tv.screenY, tv.screenZ); television.add(screen);
  const brush = new Group();
  brush.userData.model = 'home-toothbrush'; brush.userData.disposeFallback = true;
  brush.add(joined([box(.035, .26, .04, 0, 0, 0, '#409bbc'), box(.075, .095, .065, 0, .17, 0, '#eeeade')]));
  brush.name = 'elof-toothbrush'; brush.scale.setScalar(BRUSH_SCALE); brush.visible = false; group.add(brush);
  group.visible = room;
  const mouth = new Vector3(), hand = new Vector3(), held = new Vector3(), along = new Vector3(-1, 0, 0), heldAxis = new Vector3(), up = new Vector3(0, 1, 0);
  let phase = 0, clock = 0, televisionFrame = -1, active = false;
  return {
    group,
    update(flags: ReadonlySet<string>, frame: SceneFrame | null | undefined, seconds: number) {
      if (!room) return;
      clock = seconds;
      active = chapter.id === 'epilog' && (frame?.id === 'bathroom' || flags.has('bedtime'));
      phase = frame?.id === 'bathroom' ? frame.seconds : flags.has('bedtime') ? BATHROOM.seconds : 0;
      doorway.rotation.y = -1.38 * smooth(phase / b.doorOpen);
      brush.visible = active && phase >= b.brushStart && phase < b.brushEnd;
      const now = Math.floor(seconds * 8);
      if (canvas && screenMap && now !== televisionFrame) {
        televisionFrame = now; programme(canvas, seconds, chapter.id !== 'stormkvall' || !flags.has('candles')); screenMap.needsUpdate = true;
      }
    },
    body(from: { x: number; y: number }) {
      if (!active) return null;
      const k = smooth((phase - b.walkStart) / (b.walkEnd - b.walkStart));
      const depth = b.feetZ * k;
      const floor = b.floorY * Math.max(0, Math.min(1, (b.doorZ + .18 - depth) / .36));
      return { position: new Vector3(from.x + (x - from.x) * k, from.y + floor, depth),
        travel: -BATHROOM.feetZ * k, walking: k > 0 && k < 1, brushing: brush.visible, face: k < 1 ? .75 : .42 };
    },
    updateElof(rig: Pick<Rig, 'mouth' | 'hand' | 'reach' | 'hold' | 'grasp' | 'socket'>) {
      if (!brush.visible) return;
      rig.mouth(mouth);
      const stroke = Math.sin(clock * 18) * .035;
      hand.copy(mouth).add(new Vector3(.17 * BRUSH_SCALE + stroke, -.015, .035));
      const grip = { kind: 'power' as const, size: .025 * BRUSH_SCALE };
      heldAxis.copy(along);
      if (rig.grasp) rig.grasp(1, grip, hand, along, held, 1, heldAxis);
      else {
        rig.hold?.(1, grip); rig.reach(1, hand);
        if (rig.socket) rig.socket(1, grip, held); else rig.hand(1, held);
      }
      // Keep the handle in the actual grip, including the private fingers beyond the wrist.
      brush.position.copy(held);
      brush.quaternion.setFromUnitVectors(up, heldAxis.normalize());
    },
  };
}
