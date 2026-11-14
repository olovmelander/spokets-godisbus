import {
  AdditiveBlending, BufferAttribute, BoxGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The family's flashlights (Olov, 14 November 2026: how they are held, "genom hela spelet"; the lamp itself is to look like
 * a flashlight at the size it is seen). One shape wherever one is drawn: lying on the table in Stormkvällen, in Elof's
 * hand and then Pappa's, in each of the family's hands out in the storm, and put out on the jetty in Stormens öga. A
 * coloured barrel with a dark ribbed grip and tail, a dark flared head with a pale rim, the glass in it, and a switch on
 * top where the thumb lies. Lit, its glass is bright (brighter than anything it lights, so that it reads as a lamp that
 * is on at any size and on Low, where the beam is left out), and the beam leaves the glass as wide as the glass is.
 *
 * Each has their own, told apart by its barrel against their raincoat: Pappa's is the red one from the table, which Elof
 * gave him. Plain colours; no mark or lettering on any of them.
 *
 * It points along its own +z, its switch up (+y). Three draws lit (the body, the glass, the beam), two unlit.
 */

/** The barrel's radius: what the hand closes round (./lamp-hold.ts, ./fingers.ts `torch`). */
export const LAMP_BARREL = 0.075;
/** Where along it the hand's middle is, from its own middle (towards the lens is +): the fist round the grip, the head out in front of it. */
export const LAMP_HELD = -0.06;
/** Where the glass is, along it: the beam starts here. And where its tail ends. */
export const LAMP_GLASS = 0.415, LAMP_TAIL = -0.37;
/** The glass's radius. */
const GLASS = 0.112;

/** Whose flashlight: its barrel's colour. */
export const LAMP_COLOURS = { pappa: '#c8372a', mamma: '#e9b93a', moa: '#3f86c4', bertil: '#4aa35a' } as const;
export type LampOwner = keyof typeof LAMP_COLOURS;
export const lampColour = (who: string | null | undefined): string => LAMP_COLOURS[who as LampOwner] ?? LAMP_COLOURS.pappa;

const DARK = '#23262b', RIM = '#aeb6bd', SWITCH = '#f0ead8';

/** A part along +z, painted one colour. */
function painted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new Color(colour), count = flat.getAttribute('position').count, paint = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) paint.set([c.r, c.g, c.b], i * 3);
  flat.setAttribute('color', new BufferAttribute(paint, 3));
  flat.deleteAttribute('uv');
  return flat;
}
/** A round part along +z from `from` to `to`, `back` wide at its back end and `front` at its front. */
const round = (back: number, front: number, from: number, to: number, colour: string, sides = 14) =>
  painted(new CylinderGeometry(front, back, to - from, sides, 1, false).rotateX(Math.PI / 2).translate(0, 0, (from + to) / 2), colour);

function bodyGeometry(colour: string): BufferGeometry {
  const parts = [
    // The tail cap, the barrel with its dark grip where the hand goes, the collar, the flared head and its pale rim.
    round(0.07, 0.082, LAMP_TAIL, -0.33, DARK),
    round(0.082, 0.082, -0.33, -0.27, DARK),
    round(LAMP_BARREL, LAMP_BARREL, -0.27, 0.19, colour),
    round(0.084, 0.084, 0.19, 0.23, DARK),
    round(0.084, 0.135, 0.23, 0.37, DARK),
    round(0.14, 0.14, 0.37, 0.41, RIM),
    // The switch, on top: a pale slider in a dark seat.
    painted(new BoxGeometry(0.05, 0.022, 0.13).translate(0, LAMP_BARREL + 0.006, 0.07), DARK),
    painted(new BoxGeometry(0.034, 0.024, 0.05).translate(0, LAMP_BARREL + 0.018, 0.09), SWITCH),
  ];
  // Three dark rings round the grip, under the fingers.
  for (const z of [-0.2, -0.12, -0.04]) parts.push(round(LAMP_BARREL + 0.006, LAMP_BARREL + 0.006, z - 0.012, z + 0.012, DARK));
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return merged;
}

/**
 * A flashlight, pointing along its +z: `colour` its barrel's (`lampColour`), `lit` whether its glass shines. Its glass is
 * the child named `lamp-glass`.
 */
export function flashlight(colour: string = LAMP_COLOURS.pappa, lit = false): Mesh {
  const body = new Mesh(bodyGeometry(colour), new MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  const glass = new Mesh(new CircleGeometry(GLASS, 16).translate(0, 0, LAMP_GLASS),
    lit ? new MeshBasicMaterial({ color: new Color('#fff4cf').multiplyScalar(2.4), fog: false })
      : new MeshStandardMaterial({ color: '#9aa6b2', roughness: 0.2, metalness: 0.3 }));
  glass.name = 'lamp-glass';
  body.add(glass);
  return body;
}

/**
 * A lit flashlight, pointing the way its holder holds it (its +z), and its beam out into the dark (the child named
 * `lamp-beam`). The beam is added to the night, so what is black in it is nothing: it leaves the glass as wide as the glass,
 * fades away from the lamp and has no end to see.
 */
export function litLamp(colour: string = LAMP_COLOURS.pappa): Mesh {
  const body = flashlight(colour, true);
  const LONG = 16;
  const cone = new CylinderGeometry(1.7, GLASS * 0.9, LONG, 18, 5, true).rotateX(Math.PI / 2).translate(0, 0, LONG / 2 + LAMP_GLASS);
  const at = cone.getAttribute('position');
  const fade = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) fade.fill(Math.max(0, 1 - (at.getZ(i) - LAMP_GLASS) / LONG) ** 1.6, i * 3, i * 3 + 3);
  cone.setAttribute('color', new BufferAttribute(fade, 3));
  const beam = new Mesh(cone, new MeshBasicMaterial({ color: '#fff2c8', vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false }));
  beam.name = 'lamp-beam';
  body.add(beam);
  return body;
}
