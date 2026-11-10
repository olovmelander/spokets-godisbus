import { BoxGeometry, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../sim/types';
import type { SceneFrame } from '../sim/scene';
import type { Rig } from './rig';

/** The same doorway in the hall, behind the walking path, in every home chapter. */
export const BATHROOM = { x: 35.5, doorZ: -3.8, sinkZ: -7.3, feetZ: -6.1, seconds: 11.6 } as const;
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
  // A proper panelled door and frame; a tiled recess, mirror, basin and towel make the room beyond legible.
  for (const side of [-1, 1]) walls.push(box(.18, 6.2, .32, x + side * 1.9, 3.1, z, '#ede7d8'));
  walls.push(box(4, .22, .34, x, 6.15, z, '#ede7d8'), box(4, .07, .55, x, .02, z, '#b6a28b'));
  walls.push(box(4.2, 6.2, .12, x, 3.1, -8.6, '#bdd6d3'), box(4.2, .035, 4.9, x, .01, -6.2, '#a4bdbb'));
  for (let y = .7; y < 6; y += .7) walls.push(box(4.2, .022, .02, x, y, -8.52, '#eef0df'));
  for (let dx = -1.8; dx < 2; dx += .7) walls.push(box(.022, 6.1, .02, x + dx, 3.05, -8.52, '#eef0df'));
  walls.push(box(1.9, 2.2, .12, x, 4, -8.4, '#e9e5d7'), box(1.62, 1.92, .03, x, 4, -8.31, '#8eabb8'));
  walls.push(box(2.2, .18, 1.1, x, 1.65, BATHROOM.sinkZ, '#f4f0e3'), box(.28, 1.6, .3, x, .8, BATHROOM.sinkZ, '#dddcd2'));
  walls.push(colour(new SphereGeometry(.67, 12, 8).scale(1.3, .35, .65).translate(x, 1.65, BATHROOM.sinkZ), '#c8dfdf'));
  walls.push(box(.1, .5, .1, x, 1.98, -7.65, '#909da3'), box(.1, .1, .35, x, 2.18, -7.51, '#a5afb1'));
  walls.push(box(.65, 1.2, .05, x - 1.45, 2.4, -8.33, '#3e8ca5'));
  // The TV and its low stand live beside the sofa, clear of the doorway.
  walls.push(box(4.1, .2, 1.2, 30.8, 1.42, -5.9, '#83634b'), box(.17, 1.4, .6, 29.1, .7, -5.9, '#73533b'), box(.17, 1.4, .6, 32.5, .7, -5.9, '#73533b'));
  walls.push(box(3.9, 2.3, .24, 30.8, 2.76, -5.9, '#29363b'), box(.25, .4, .5, 30.8, 1.6, -5.9, '#29363b'));
  const doorway = new Group(); doorway.name = 'bathroom-door';
  doorway.userData.model = 'home-routine-door'; doorway.userData.disposeFallback = true;
  const door = joined([box(3.6, 5.9, .14, 1.8, 2.95, 0, '#e5ddcb'),
    box(2.9, 2.15, .06, 1.8, 4.15, .1, '#f2ebdc'), box(2.9, 2.15, .06, 1.8, 1.65, .1, '#f2ebdc'),
    box(.45, .09, .12, 3.15, 2.6, .19, '#9a9b91')]);
  doorway.add(door); doorway.position.set(x - 1.8, 0, z + .04);
  const surround = new Group(); surround.name = 'home-routine-room';
  surround.userData.model = 'home-routine-room'; surround.userData.disposeFallback = true;
  surround.add(joined(walls)); group.add(surround, doorway);
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = 320; canvas.height = 180; programme(canvas, 0, true); }
  const screenMap = canvas ? new CanvasTexture(canvas) : null;
  if (screenMap) screenMap.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new BoxGeometry(3.5, 1.97, .025), new MeshBasicMaterial({ map: screenMap, color: screenMap ? '#ffffff' : '#8fc6d2', fog: false }));
  screen.name = 'home-tv-programme'; screen.position.set(30.8, 2.76, -5.75); group.add(screen);
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
      doorway.rotation.y = -1.38 * smooth(phase / .65);
      brush.visible = active && phase >= 3.1 && phase < 9.2;
      const now = Math.floor(seconds * 8);
      if (canvas && screenMap && now !== televisionFrame) {
        televisionFrame = now; programme(canvas, seconds, chapter.id !== 'stormkvall' || !flags.has('candles')); screenMap.needsUpdate = true;
      }
    },
    body(from: { x: number; y: number }) {
      if (!active) return null;
      const k = smooth((phase - .7) / 2.3);
      return { position: new Vector3(from.x + (x - from.x) * k, from.y, BATHROOM.feetZ * k),
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
