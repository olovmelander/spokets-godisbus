import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Original street geometry studied from the public Köpmangatan photographs in
 * docs/bredbyn-reference-study.md. These are architectural cues, not a map or copies of real shops.
 * Two clusters frame the separate church; each is one opaque, lit draw call. */
export function bredbynStreet(): Group {
  const street = new Group();
  street.name = 'bredbyn-street';
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.93 });
  const trim = '#e1e0d1', glass = '#536672', stone = '#8d908b';
  let parts: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, colour: string) => {
    const rgb = new Color(colour), values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) values.set([rgb.r, rgb.g, rgb.b], i);
    geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
    geometry.deleteAttribute('uv');
    parts.push(geometry.index ? geometry.toNonIndexed() : geometry);
    if (geometry.index) geometry.dispose();
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string, angle = 0) =>
    add(new BoxGeometry(w, h, d).rotateZ(angle).translate(x, y, z), colour);
  const beam = (x: number, y: number, toX: number, toY: number, z: number, thick: number, depth: number, colour: string) =>
    box((x + toX) / 2, (y + toY) / 2, z, Math.hypot(toX - x, toY - y), thick, depth, colour, Math.atan2(toY - y, toX - x));
  const window = (x: number, y: number, z: number, wide = 1.25, tall = 1.8) => {
    box(x, y, z, wide + 0.32, tall + 0.34, 0.15, trim);
    box(x, y, z + 0.09, wide, tall, 0.08, glass);
    box(x, y, z + 0.15, 0.08, tall, 0.06, trim);
    box(x, y + tall * 0.13, z + 0.15, wide, 0.08, 0.06, trim);
    box(x, y - tall / 2 - 0.18, z + 0.08, wide + 0.5, 0.12, 0.3, trim);
  };
  /** End-facing gable or mansard: the roof's broken silhouette is real depth, not a repeated card. */
  const house = (x: number, z: number, w: number, h: number, d: number, rise: number,
    wall: string, roof: string, style: 'horizontal' | 'sage' | 'plaster' | 'mansard') => {
    const front = z + d / 2;
    box(x, 0.22, z, w + 0.25, 0.44, d + 0.25, stone);
    box(x, h / 2 + 0.22, z, w, h, d, wall);
    const eaves = h + 0.22;
    const profile = style === 'mansard'
      ? [[-w / 2, eaves], [-w * 0.3, eaves + rise * 0.72], [0, eaves + rise], [w * 0.3, eaves + rise * 0.72], [w / 2, eaves]]
      : [[-w / 2, eaves], [0, eaves + rise], [w / 2, eaves]];
    const points: number[] = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i], b = profile[i + 1];
      // Triangular fans close each end; the roof panels close the long faces.
      points.push(x, eaves, front, x + b[0], b[1], front, x + a[0], a[1], front);
      points.push(x, eaves, z - d / 2, x + a[0], a[1], z - d / 2, x + b[0], b[1], z - d / 2);
      beam(x + a[0], a[1], x + b[0], b[1], z, 0.2, d + 0.75, roof);
      beam(x + a[0], a[1] - 0.11, x + b[0], b[1] - 0.11, front + 0.42, 0.18, 0.15, trim);
      // Standing seams on metal roofs; tile roofs remain quiet at this distance.
      if (roof === '#596363') for (let at = z - d / 2; at <= front; at += 1.35)
        beam(x + a[0], a[1] + 0.13, x + b[0], b[1] + 0.13, at, 0.05, 0.055, '#76807e');
    }
    const gable = new BufferGeometry();
    gable.setAttribute('position', new Float32BufferAttribute(points, 3));
    gable.computeVertexNormals();
    add(gable, wall);
    for (const side of [-1, 1]) box(x + side * (w / 2 - 0.12), eaves / 2, front + 0.07, 0.25, eaves, 0.19, trim);
    box(x, eaves - 0.18, front + 0.07, w, 0.23, 0.19, trim);
    if (style === 'horizontal') {
      for (let y = 0.8; y < eaves; y += 0.45) box(x, y, front + 0.03, w - 0.3, 0.045, 0.04, '#b9a770');
      box(x, h / 2, front + 0.1, w, 0.19, 0.2, trim);
    }
    if (style === 'sage') {
      for (let at = -w / 2 + 0.5; at < w / 2; at += 0.6) box(x + at, eaves / 2, front + 0.04, 0.05, eaves, 0.06, '#89947e');
      // The light triangular bracing, kept in the upper gable, is a recognisable Köpmangatan cue.
      const y = eaves + rise * 0.6, top = eaves + rise - 0.3;
      beam(x - w * 0.16, y, x + w * 0.16, y, front + 0.13, 0.12, 0.15, '#c6cbb7');
      for (const dx of [-w * 0.16, 0, w * 0.16]) beam(x + dx, y, x, top, front + 0.13, 0.12, 0.15, '#c6cbb7');
    }
    for (const dx of [-w * 0.3, 0, w * 0.3]) {
      window(x + dx, 2.2, front + 0.15);
      window(x + dx, h - 2, front + 0.15);
    }
    window(x, eaves + rise * 0.36, front + 0.15, 1.05, 1.4);
    box(x + w * 0.2, eaves + rise - 0.05, z - d * 0.17, 0.75, 2, 0.75, '#777471');
    box(x + w * 0.2, eaves + rise + 1, z - d * 0.17, 0.92, 0.14, 0.9, '#62666a');
  };
  const finish = (name: string) => {
    const geometry = mergeGeometries(parts, false)!;
    for (const part of parts) part.dispose();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    street.add(mesh);
    parts = [];
  };
  house(4, -51, 11, 9.2, 7, 4.3, '#cbb679', '#596363', 'horizontal');
  house(21, -54, 10, 8.4, 8, 3.4, '#d4d4c7', '#596363', 'plaster');
  // The green braced gable belongs to the west bank behind the nearer church.
  house(37, -49, 12, 7.4, 7, 5.5, '#a6ad94', '#a1816c', 'sage');
  finish('street-west');
  house(66, -51, 10, 9.5, 7, 4.5, '#9fb5bb', '#596363', 'mansard');
  house(82, -47, 13, 8.2, 7, 3.5, '#d0cfbc', '#8a7968', 'plaster');
  // Muted, distant wood colour: the path's candy keeps the bright red accents.
  house(98, -54, 9, 7.3, 6, 4, '#967975', '#62676a', 'mansard');
  finish('street-east');
  return street;
}
