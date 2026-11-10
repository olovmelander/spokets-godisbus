import {
  CatmullRomCurve3, Color, ConeGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, TorusGeometry,
  TubeGeometry, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Mamma's braid on Myren, which he climbs (the graphics pass of 6 November 2026; Olov: "I äventyr ett så klättrar
 * Elof på mammas hår, det kan vi göra snyggare"). It was a brown rod. Now it is a braid: three blonde strands
 * plaited over and under each other, thinning towards its end, a red hair tie and a soft tuft below it. It
 * continues the model's own short plait, over the edge, and hangs straight
 * down the line he climbs. Let down, it unrolls, eases to its length and swings out the last of its fall; then it
 * stirs a little, as hair does.
 */
const BLONDE = ['#d2ad70', '#b98f52', '#e2c287'];
/** How long one round of the plait is, along the braid, and how wide the strands swing out of its middle. */
const ROUND = 0.42;
const WIDE = 0.055;

function coloured(geometry: BufferGeometry, hex: string, vary = 0): BufferGeometry {
  const shape = geometry.index ? geometry.toNonIndexed() : geometry;
  const base = new Color(hex);
  const count = shape.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // A little light and dark along the strands, as hair has.
    const k = 1 + vary * Math.sin(i * 0.37) * Math.sin(i * 0.051);
    colours.set([base.r * k, base.g * k, base.b * k], i * 3);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  if (shape !== geometry) geometry.dispose();
  return shape;
}

/** Three strands round a straight middle from 0 down to -length: each a tube that weaves over and under the others. */
function plait(length: number): BufferGeometry {
  const strands: BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const phase = (k * Math.PI * 2) / 3;
    const points: Vector3[] = [];
    const steps = Math.max(12, Math.round((length / ROUND) * 10));
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const a = (s * length * Math.PI * 2) / ROUND + phase;
      const taper = 1 - 0.45 * s;
      points.push(new Vector3(Math.sin(a) * WIDE * taper, -s * length, Math.sin(2 * a) * WIDE * 0.55 * taper));
    }
    const tube = new TubeGeometry(new CatmullRomCurve3(points), steps * 2, 0.052, 7, false);
    // Thinner towards the end: scale each ring by how far down it is.
    const position = tube.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const s = Math.min(1, Math.max(0, -y / length));
      const centre = points[Math.round(s * steps)]!;
      const taper = 1 - 0.4 * s;
      position.setX(i, centre.x + (position.getX(i) - centre.x) * taper);
      position.setZ(i, centre.z + (position.getZ(i) - centre.z) * taper);
    }
    strands.push(coloured(tube, BLONDE[k]!, 0.12));
  }
  return mergeGeometries(strands);
}

/** The section over the edge has the same woven strands as the hanging section. */
function overPlait(curve: CatmullRomCurve3): BufferGeometry {
  const length = curve.getLength(), parts: BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const points: Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32, at = curve.getPoint(t), tangent = curve.getTangent(t);
      const normal = new Vector3(0, 0, 1).cross(tangent).normalize();
      const binormal = tangent.clone().cross(normal).normalize();
      const phase = t * length * Math.PI * 2 / ROUND + k * Math.PI * 2 / 3;
      at.addScaledVector(normal, Math.sin(phase) * WIDE).addScaledVector(binormal, Math.sin(2 * phase) * WIDE * .55);
      points.push(at);
    }
    parts.push(coloured(new TubeGeometry(new CatmullRomCurve3(points), 64, .047, 7, false), BLONDE[k]!, .12));
  }
  const merged = mergeGeometries(parts); for (const part of parts) part.dispose(); return merged;
}

export interface Braid {
  group: Group;
  /** `down` is how far it is let down, 0 to 1. */
  update(down: number, clock: number, dt: number, still: boolean): void;
  /** Continues the short plait on her own head; the point follows the same bone as its tip. */
  attach(tip: Vector3): void;
}

export function buildBraid(x: number, bottom: number, top: number): Braid {
  const group = new Group();
  group.name = `climb:braid:${x}`;
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  // From her raised hand, up and to the left of the edge, over to the line he climbs.
  const hand = new Vector3(x - 0.85, top + 0.65, -0.55);
  const edge = new Vector3(x, top - 0.15, -0.16);
  const over = new CatmullRomCurve3([hand, new Vector3(x - 0.45, top + 0.75, -0.4), new Vector3(x - 0.08, top + 0.35, -0.22), edge]);
  const overTube = coloured(new TubeGeometry(over, 16, 0.085, 8, false), BLONDE[1]!, 0.15);
  const head = new Mesh(overTube, material);
  group.add(head);
  // What hangs: pivots at the edge, so it swings from there and unrolls downwards.
  const hanging = new Group();
  hanging.position.copy(edge);
  const length = top - 0.15 - bottom - 0.05;
  const tie = coloured(new TorusGeometry(0.065, 0.022, 6, 14).rotateX(Math.PI / 2).translate(0, -length + 0.42, 0), '#c23a2c');
  const tuft = coloured(new ConeGeometry(0.075, 0.38, 9, 1, true).rotateX(Math.PI).translate(0, -length + 0.15, 0), BLONDE[2]!, 0.2);
  hanging.add(new Mesh(mergeGeometries([plait(length - 0.36), tie, tuft]), material));
  group.add(hanging);
  let swing = 0, swingVelocity = 0, was = 0;
  const attached = new Vector3(Infinity, Infinity, Infinity);
  return {
    group,
    attach(tip) {
      if (tip.distanceToSquared(attached) < .000025) return;
      attached.copy(tip);
      const bend = tip.clone().lerp(edge, .45); bend.y -= .12;
      const curve = new CatmullRomCurve3([tip, bend, edge]);
      head.geometry.dispose();
      head.geometry = overPlait(curve);
    },
    update(down, clock, dt, still) {
      // It unrolls with its weight: quickly, slowing to its length.
      const eased = 1 - (1 - down) ** 3;
      hanging.scale.set(1, Math.max(0.001, eased), 1);
      head.visible = down > 0.001;
      hanging.visible = down > 0.001;
      // Reaching its length, it swings out the rest of its fall, and settles.
      if (down >= 1 && was < 1 && !still) swingVelocity = 0.9;
      was = down;
      const step = Math.min(dt, 1 / 30);
      swingVelocity += (-swing * 26 - swingVelocity * 3.2) * step;
      swing += swingVelocity * step;
      const stir = still ? 0 : Math.sin(clock * 1.3) * 0.012 + Math.sin(clock * 2.9 + 1) * 0.006;
      hanging.rotation.z = still ? 0 : (swing + stir) * eased;
    },
  };
}
