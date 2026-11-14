/** What stands beside the road in each kind of place a course passes through: a village and its windmill at
 * home, spruces and toadstools in Granskogen, reeds and lanterns over Myren, rock, snow and crystal caves on
 * Berget, and lollipops, candy canes and a rainbow over Godisängen. Original toy shapes, with no lettering or
 * marks. Everything is merged into a few meshes per patch of ground, so what is out of view costs nothing.
 */
import * as THREE from 'three';
import { LAP, type Track } from '../sim/track';
import { createBatch, randomFrom } from './kit';
import type { World } from './world';

const PASTEL = [0xff8fb8, 0x8fd8ff, 0xffd166, 0xa0e77d, 0xc9a7ff, 0xff9f7a] as const;
const RAINBOW = [0xff5d6c, 0xff9f43, 0xffd23f, 0x4fd1a1, 0x5aa9ff, 0xb78bff] as const;

export function createScenery(track: Track, world: World, { low, calm }: { low: boolean; calm: boolean }) {
  const group = new THREE.Group(); group.name = 'scenery';
  const random = randomFrom(31415), pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78 });
  const facet = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true });
  const shine = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .05 });
  const lit = new THREE.MeshBasicMaterial({ vertexColors: true });
  const rock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true, side: THREE.DoubleSide });
  const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(.5, .5, 1, 10), taper = new THREE.CylinderGeometry(.32, .5, 1, 8);
  const cone = new THREE.ConeGeometry(.5, 1, 9), ball = new THREE.SphereGeometry(.5, 12, 8), bead = new THREE.SphereGeometry(.5, 7, 5), blob = new THREE.IcosahedronGeometry(.5, 1), dome = new THREE.SphereGeometry(.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const gem = new THREE.OctahedronGeometry(.5), disc = new THREE.CylinderGeometry(.5, .5, 1, 20), roof = new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2).rotateZ(Math.PI / 2);
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, 0, -1, 0], 3)); flag.setIndex([0, 1, 2, 2, 1, 0]); flag.computeVertexNormals();
  const batch = createBatch(), point = track.point(0), weights = [0, 0, 0, 0, 0];
  const lamps: number[] = [], lampColors: number[] = [], tint = new THREE.Color();
  const lamp = (x: number, y: number, z: number, color: number) => { lamps.push(x, y, z); tint.set(color); lampColors.push(tint.r, tint.g, tint.b); };
  const chunk = (x: number, z: number) => `${Math.floor(x / 64)}:${Math.floor(z / 64)}`;
  /** A spot beside the road at a lane past the barrier, or null where another part of the course is in the way. */
  const beside = (distance: number, side: number, out: number, clear = 9.5) => {
    const wall = side > 0 ? track.wallLeft(distance) : track.wallRight(distance);
    track.point(distance, side * (wall + out), point);
    if (world.roadDistance(point.x, point.z) < Math.min(clear, wall + out - .6)) return null;
    // Only on ground that is this place's own: no lollipops on the mountain, no spruces in the candy.
    if (out > 3 && world.zonesAt(point.x, point.z, weights)[track.zone(distance)]! < .55) return null;
    return { x: point.x, y: world.groundAt(point.x, point.z), z: point.z, angle: point.angle, key: chunk(point.x, point.z) };
  };
  type Spot = NonNullable<ReturnType<typeof beside>>;
  type Base = { x: number; y: number; z: number; key: string };
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, s: Base, at: number[], size: number[] | number, color: number, rotation: number[] = [0, 0, 0], yaw = 0) => {
    const c = Math.cos(yaw), n = Math.sin(yaw);
    batch.add(geometry, material, [s.x + at[0]! * c + at[2]! * n, s.y + at[1]!, s.z - at[0]! * n + at[2]! * c], [rotation[0]!, rotation[1]! + yaw, rotation[2]!], size, color, null, s.key);
  };
  /** Walks every stretch of the lap that is one kind of place, a step at a time. */
  const along = (kind: number, step: number, visit: (distance: number, into: number, left: number) => void) => {
    for (const span of track.zones) {
      if (span.kind !== kind) continue;
      const length = ((span.to - span.from) % LAP + LAP) % LAP || LAP;
      for (let d = 0; d < length; d += step) visit(span.from + d, d, length - d);
    }
  };
  const onRoad = (distance: number, lane = 0, lift = 0): Base => { track.point(distance, lane, point); return { x: point.x, y: point.y + lift, z: point.z, key: chunk(point.x, point.z) }; };

  /* ---------------------------------------------------------------- trees and stones */
  const spruce = (s: Spot, h: number, snow = false) => {
    part(taper, solid, s, [0, h * .12, 0], [h * .09, h * .26, h * .09], 0x7a5236);
    for (let i = 0; i < 4; i++) {
      const y = h * (.24 + i * .2), r = h * (.36 - i * .075);
      part(cone, facet, s, [0, y + h * .13, 0], [r * 2, h * .34, r * 2], [0x2f7244, 0x286a3f, 0x35804c, 0x2a6e42][i]!, [0, i * 1.3, 0]);
      if (snow) part(cone, facet, s, [0, y + h * .2, 0], [r * 1.45, h * .2, r * 1.45], 0xf4f8ff, [0, i * 1.3, 0]);
    }
  };
  const leafy = (s: Spot, h: number, greens: readonly number[], trunk = 0x8a5f3c, fruit = 0) => {
    part(taper, solid, s, [0, h * .25, 0], [h * .1, h * .5, h * .1], trunk);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + random(), r = i === 3 ? 0 : h * .2;
      part(blob, facet, s, [Math.sin(a) * r, h * (.62 + (i === 3 ? .2 : random() * .12)), Math.cos(a) * r], h * (.42 + random() * .1), pick(greens), [random(), random() * 6, random()]);
    }
    for (let i = 0; i < fruit; i++) { const a = random() * 6.28, r = h * (.26 + random() * .1); part(bead, shine, s, [Math.sin(a) * r, h * (.52 + random() * .34), Math.cos(a) * r], h * .07, 0xe5383b); }
  };
  const stone = (s: Base, size: number, color: number, cap = 0) => {
    part(blob, facet, s, [0, size * .3, 0], [size, size * (.6 + random() * .5), size * (.75 + random() * .4)], color, [random(), random() * 6, random()]);
    if (cap) part(blob, facet, s, [0, size * .52, 0], [size * .8, size * .34, size * .7], cap, [0, random() * 6, 0]);
  };
  const toadstool = (s: Spot, h: number) => {
    part(taper, solid, s, [0, h * .3, 0], [h * .3, h * .6, h * .3], 0xfff3dc);
    part(dome, shine, s, [0, h * .55, 0], [h * 1.1, h * .8, h * 1.1], 0xe5383b);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + random(), r = h * (.18 + (i % 2) * .2); part(bead, solid, s, [Math.sin(a) * r, h * (.9 - (i % 2) * .14), Math.cos(a) * r], h * .14, 0xfffaf0); }
  };

  /* ---------------------------------------------------------------- home: orchards and hay */
  along(0, low ? 6 : 4, d => {
    for (const side of [-1, 1]) {
      const s = beside(d + random() * 3, side, 3 + random() * 14, 10);
      if (!s) continue;
      if (random() < .7) leafy(s, 4.2 + random() * 2.4, [0x6fc04a, 0x86d05a, 0x5bb04a], 0x8a5f3c, random() < .6 ? 7 : 0);
      else { part(cyl, solid, s, [0, .55, 0], [1.3, 1.1, 1.3], 0xf0cf6a, [Math.PI / 2, random() * 3, 0]); part(cyl, solid, s, [0, .55, 0], [1.34, .3, 1.34], 0xd9b24f, [Math.PI / 2, 0, 0]); }
    }
  });

  /* ---------------------------------------------------------------- Granskogen */
  along(1, low ? 7.5 : 4.4, d => {
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
      const s = beside(d + random() * 4, side, 3 + row * 8 + random() * 7, 10.5);
      if (!s) continue;
      if (random() < .82) spruce(s, 8 + random() * 7 + row * 1.5); else leafy(s, 6 + random() * 3, [0xa8cf5a, 0xc9d65a, 0x8fc24f], 0xf0ead8);
    }
  });
  along(1, 6.6, d => {
    for (const side of [-1, 1]) {
      const s = beside(d + random() * 5, side, 1.6 + random() * 4.5, 8.5);
      if (!s) continue;
      const kind = random();
      if (kind < .45) toadstool(s, .7 + random() * 1.3);
      else if (kind < .8) stone(s, 1 + random() * 1.6, 0x8d968a, 0x6f9a4a);
      else part(cyl, solid, s, [0, .45, 0], [.9, 4 + random() * 2, .9], 0x8a5f3c, [Math.PI / 2, random() * 3, 0]);
    }
  });

  /* ---------------------------------------------------------------- Myren */
  along(2, low ? 4.8 : 2.8, d => {
    for (const side of [-1, 1]) {
      const s = beside(d + random() * 3, side, .8 + random() * 9, 7);
      if (!s) continue;
      const wet = { ...s, y: Math.max(s.y, -2.6) }, kind = random();
      if (kind < .5) for (let i = 0; i < 5; i++) {       // reeds, with their brown heads
        const x = (random() - .5) * 1.2, z = (random() - .5) * 1.2, h = 1.5 + random() * 1.4;
        part(cyl, solid, wet, [x, h / 2, z], [.06, h, .06], 0x7f9a4e, [(random() - .5) * .2, 0, (random() - .5) * .2]); part(cyl, solid, wet, [x, h, z], [.14, .42, .14], 0x6b4a2e);
      } else if (kind < .72) for (let i = 0; i < 4; i++) { // cotton grass
        const x = (random() - .5), z = (random() - .5), h = .7 + random() * .5;
        part(cyl, solid, wet, [x, h / 2, z], [.03, h, .03], 0x8fa85c); part(bead, solid, wet, [x, h, z], .2, 0xfdfdf6);
      } else if (kind < .86) part(disc, solid, { ...s, y: -1.93 }, [0, 0, 0], [1.2 + random(), .03, 1.2 + random()], 0x5f9e4f, [0, random() * 6, 0]);
      else stone(wet, .8 + random() * 1.2, 0x7b8478, 0x5f8a4a);
    }
  });
  along(2, 8, d => {
    for (const side of [-1, 1]) {
      const s = beside(d + random() * 6, side, 7 + random() * 16, 9);
      if (!s) continue;
      const base = { ...s, y: Math.max(s.y, -2.4) }, h = 4 + random() * 4;   // bare, crooked pines
      part(taper, solid, base, [0, h / 2, 0], [.36, h, .36], 0x5a4a3c, [(random() - .5) * .3, 0, (random() - .5) * .3]);
      for (let i = 0; i < 3; i++) { const a = random() * 6.28; part(cyl, solid, base, [Math.sin(a) * .7, h * (.55 + i * .15), Math.cos(a) * .7], [.12, 1.7, .12], 0x5a4a3c, [1 + random() * .4, a, 0]); }
      if (random() < .5) part(blob, facet, base, [0, h + .4, 0], [2.4, 1.3, 2.4], 0x45684f);
    }
  });
  // Lanterns on the boardwalk's posts light the way through the dusk.
  along(2, 12, (d, into, left) => {
    if (into < 24 || left < 6) return;
    for (const side of [-1, 1]) {
      const wall = side > 0 ? track.wallLeft(d) : track.wallRight(d), s = onRoad(d, side * (wall + .22), -.3);
      part(cyl, solid, s, [0, 1.3, 0], [.12, 2.6, .12], 0x7a5a3a); part(box, solid, s, [0, 2.75, 0], [.5, .12, .5], 0x4a3a2c);
      part(box, lit, s, [0, 2.45, 0], [.36, .46, .36], 0xffe09a); lamp(s.x, s.y + 2.45, s.z, 0xffc56b);
    }
  });

  /* ---------------------------------------------------------------- Berget and its caves */
  along(3, low ? 7 : 4.2, d => {
    for (const side of [-1, 1]) {
      const inCave = track.inCave(d, 4), s = beside(d + random() * 3, side, (inCave ? 5 : 1.8) + random() * 9, inCave ? 11 : 8);
      if (!s) continue;
      if (random() < .55) stone(s, 1.6 + random() * 3.2, pick([0x8b91a3, 0x767c90, 0x9aa1b3]), random() < .6 ? 0xf4f8ff : 0);
      else spruce(s, 6 + random() * 6, true);
    }
  });
  // Far peaks stand over the mountain wherever there is room for them.
  const peaks: { x: number; z: number }[] = [];
  if (track.zones.some(span => span.kind === 3)) for (let attempt = 0; attempt < 500 && peaks.length < 4; attempt++) {
    const x = track.bounds.minX - 30 + random() * (track.bounds.maxX - track.bounds.minX + 60), z = track.bounds.minZ - 30 + random() * (track.bounds.maxZ - track.bounds.minZ + 60);
    if (world.zonesAt(x, z, weights)[3]! < .6 || world.roadDistance(x, z) < 30 || peaks.some(p => Math.hypot(p.x - x, p.z - z) < 44)) continue;
    peaks.push({ x, z });
    const s = { x, y: world.groundAt(x, z) - 4, z, key: 'peaks' }, r = 20 + random() * 10, h = 44 + random() * 22;
    part(cone, rock, s, [0, h / 2, 0], [r * 2, h, r * 2], 0x7c8296, [0, random() * 6, 0]); part(cone, rock, s, [0, h * .78, 0], [r * .9, h * .46, r * .9], 0xf6f9ff, [0, random() * 6, 0]);
  }
  // Each cave: a vault of rock over the road, a snowy shell over that, and crystals that light it.
  const snowy = new THREE.Color(0xf6f9ff);
  const crystal = (s: Base, size: number, hue: number) => {
    for (let i = 0; i < 3; i++) part(gem, lit, s, [(i - 1) * size * .45, size * (.5 + (i === 1 ? .35 : 0)), (random() - .5) * size * .4], [size * .5, size * (1.2 + (i === 1 ? .7 : 0)), size * .5], i === 1 ? hue : tint.set(hue).multiplyScalar(.75).getHex(), [(random() - .5) * .5, random() * 3, (i - 1) * .35]);
    lamp(s.x, s.y + size, s.z, hue);
  };
  for (const cave of track.caves) {
    const vault = (inner: boolean) => {
      const positions: number[] = [], colors: number[] = [], indices: number[] = [], arc = 12, rows = Math.round((cave.to - cave.from) / 2);
      for (let i = 0; i <= rows; i++) for (let j = 0; j <= arc; j++) {
        const d = cave.from + i * 2, a = j / arc * Math.PI, wide = (Math.cos(a) > 0 ? track.wallLeft(d) : track.wallRight(d)) + (inner ? .9 : 3.6);
        const jag = (inner ? .55 : 1.2) * (random() - .5) * (j === 0 || j === arc ? 0 : 1);
        track.point(d, Math.cos(a) * (wide + jag), point);
        const up = Math.sin(a) * ((inner ? 6.6 : 10) + jag * 1.4) - (j === 0 || j === arc ? 1.4 : 0);
        positions.push(point.x, point.y + up, point.z);
        tint.set(inner ? 0x3d3760 : 0x80879a).multiplyScalar(.82 + random() * .3);
        if (!inner && Math.sin(a) > .62) tint.lerp(snowy, .9);
        colors.push(tint.r, tint.g, tint.b);
        if (i < rows && j < arc) { const n = i * (arc + 1) + j, m = n + arc + 1; indices.push(n, m, n + 1, n + 1, m, m + 1); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, rock); mesh.name = inner ? 'cave-vault' : 'cave-shell'; mesh.castShadow = !inner; mesh.receiveShadow = true; group.add(mesh);
      return positions;
    };
    const inner = vault(true), outer = vault(false);
    // A face of rock closes the gap between vault and shell at each mouth.
    for (const end of [0, 1]) {
      const arc = 13, start = end ? inner.length / 3 - arc : 0, positions: number[] = [], indices: number[] = [];
      for (let j = 0; j < arc; j++) for (const source of [inner, outer]) positions.push(source[(start + j) * 3]!, source[(start + j) * 3 + 1]!, source[(start + j) * 3 + 2]!);
      for (let j = 0; j < arc - 1; j++) indices.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 2, j * 2 + 1, j * 2 + 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(positions.map(() => .45), 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const mouth = new THREE.Mesh(geometry, rock); mouth.name = 'cave-mouth'; group.add(mouth);
    }
    for (let d = cave.from - 14; d < cave.to + 10; d += 4.5) for (const side of [-1, 1]) {
      if (random() < .25) continue;
      const wall = side > 0 ? track.wallLeft(d) : track.wallRight(d), inside = d > cave.from && d < cave.to;
      const s = onRoad(d, side * (wall + (inside ? .1 : 1.2)));
      crystal({ ...s, key: `cave${cave.from}:${Math.floor(d / 40)}` }, .9 + random() * 1.3, pick([0x5ff0ff, 0xd58bff, 0xff7fd0, 0x7fa6ff]));
    }
    for (let d = cave.from + 6; d < cave.to - 4; d += 9) {       // and a few hanging from the roof
      const s = { ...onRoad(d, (random() - .5) * 5, 6.1), key: `cave${cave.from}:${Math.floor(d / 40)}` }, hue = pick([0x5ff0ff, 0xd58bff, 0xff7fd0]);
      part(gem, lit, s, [0, -.6, 0], [.7, 2, .7], hue); lamp(s.x, s.y - .8, s.z, hue);
    }
  }

  /* ---------------------------------------------------------------- Godisängen */
  const lollipop = (s: Spot, h: number, yaw: number) => {
    part(cyl, solid, s, [0, h * .4, 0], [h * .045, h * .8, h * .045], 0xfff6e6);
    const hue = pick(RAINBOW), second = pick(PASTEL);
    for (let i = 0; i < 4; i++) part(disc, shine, s, [0, h * .86, i * .02], [h * (.5 - i * .115), h * (.07 + i * .012), h * (.5 - i * .115)], i % 2 ? 0xfffaf0 : i ? second : hue, [Math.PI / 2, 0, 0], yaw);
  };
  const cane = (s: Spot, h: number, yaw: number) => {
    const pieces = 14;
    for (let i = 0; i < pieces; i++) {
      const t = i / (pieces - 1), bend = Math.max(0, t - .62) / .38 * Math.PI, r = h * .16;
      const x = bend ? r - Math.cos(bend) * r : 0, y = bend ? h * .62 + Math.sin(bend) * r : t * h, lean = bend ? -bend : 0;
      part(cyl, shine, s, [x, y, 0], [h * .075, h * .095, h * .075], i % 2 ? 0xfffaf0 : 0xe5383b, [0, 0, lean], yaw);
    }
  };
  const iceCream = (s: Spot, h: number) => {
    part(cone, solid, s, [0, h * .3, 0], [h * .42, h * .6, h * .42], 0xe0b06a, [Math.PI, 0, 0]);
    for (let i = 0; i < 3; i++) part(ball, shine, s, [(i - 1) * h * .06, h * (.62 + i * .17), 0], h * (.44 - i * .07), [0xff9ec4, 0xfff1c9, 0x9be3c9][i]!);
    part(bead, shine, s, [0, h * 1.14, 0], h * .1, 0xe5383b);
  };
  along(4, low ? 6.8 : 4, d => {
    for (const side of [-1, 1]) {
      const s = beside(d + random() * 4, side, 2.4 + random() * 22, 9.5);
      if (!s) continue;
      const kind = random(), yaw = s.angle + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (random() - .5);
      if (kind < .3) lollipop(s, 4.5 + random() * 5, yaw);
      else if (kind < .5) cane(s, 3.5 + random() * 3.5, random() * 6.28);
      else if (kind < .75) part(dome, shine, s, [0, 0, 0], [1.6 + random() * 2.6, 1.3 + random() * 1.8, 1.6 + random() * 2.6], pick(PASTEL));
      else if (kind < .9) leafy(s, 5 + random() * 3, [0xffa9cf, 0xffc4dd, 0xa9dcff, 0xc9b3ff], 0xfffaf0);
      else iceCream(s, 5 + random() * 4);
    }
  });

  /* ---------------------------------------------------------------- what each course has of its own */
  const cottage = (s: Spot, yaw: number, wide: number, color: number) => {
    const deep = wide * .72, tall = wide * .5;
    part(box, solid, s, [0, tall / 2, 0], [wide, tall, deep], color, [0, 0, 0], yaw);
    part(roof, solid, s, [0, tall + wide * .16, 0], [wide * 1.08, wide * .32, deep * .66], 0x4a4f5c, [0, 0, 0], yaw);
    for (const x of [-1, 1]) for (const z of [-1, 1]) part(box, solid, s, [x * wide * .5, tall / 2, z * deep * .5], [.16, tall, .16], 0xfff6e6, [0, 0, 0], yaw);
    part(box, solid, s, [0, tall * .36, deep * .5 + .02], [wide * .16, tall * .72, .06], 0xfff6e6, [0, 0, 0], yaw);
    for (const x of [-1, 1]) { part(box, solid, s, [x * wide * .3, tall * .56, deep * .5 + .02], [wide * .17, tall * .3, .06], 0xfff6e6, [0, 0, 0], yaw); part(box, lit, s, [x * wide * .3, tall * .56, deep * .5 + .04], [wide * .12, tall * .22, .04], 0xffe9a0, [0, 0, 0], yaw); }
    part(box, solid, s, [wide * .28, tall + wide * .3, 0], [wide * .1, wide * .26, wide * .1], 0xb5533c, [0, 0, 0], yaw);
  };
  const mills: THREE.Group[] = [];
  for (const mark of track.landmarks) {
    const side = mark.side ?? 1;
    if (mark.kind === 'cottage') {
      const s = beside(mark.at, side, mark.out ?? 16, 11);
      if (s) cottage(s, s.angle + (side > 0 ? Math.PI : 0) + (random() - .5) * .5, mark.wide ?? 7, mark.color ?? 0xc0463c);
    } else if (mark.kind === 'windmill') {
      // The windmill: its sails are the one part that turns.
      const mill = beside(mark.at, side, mark.out ?? 26, 12) ?? beside(mark.at, side, (mark.out ?? 26) * .7, 10);
      if (!mill) continue;
      part(taper, solid, mill, [0, 5, 0], [5, 10, 5], 0xfff6e6); part(cone, solid, mill, [0, 11, 0], [4.2, 2.4, 4.2], 0xc0463c);
      const yaw = mill.angle + side * Math.PI / 2, sails = new THREE.Group(), sailBatch = createBatch();
      for (let i = 0; i < 4; i++) { sailBatch.add(box, solid, [Math.sin(i * Math.PI / 2) * 3.4, Math.cos(i * Math.PI / 2) * 3.4, 0], [0, 0, -i * Math.PI / 2], [1.5, 6, .12], 0xfff6e6); sailBatch.add(box, solid, [Math.sin(i * Math.PI / 2) * 3.2, Math.cos(i * Math.PI / 2) * 3.2, -.1], [0, 0, -i * Math.PI / 2], [.22, 6.6, .2], 0x8a5f3c); }
      sailBatch.build(sails, { name: 'sails' });
      sails.position.set(mill.x - Math.sin(yaw) * 2.3, mill.y + 9.3, mill.z - Math.cos(yaw) * 2.3); sails.rotation.y = yaw + Math.PI; group.add(sails); mills.push(sails);
    } else if (mark.kind === 'stand') {
      // The stand and its crowd of little turned figures.
      for (let row = 0; row < 3; row++) {
        const s = beside(mark.at, side, 4 + row * 2.2, 8);
        if (!s) continue;
        part(box, solid, s, [0, .5 + row * .6, 0], [2.2, 1 + row * 1.2, 26], row % 2 ? 0xb5895c : 0xc79b68, [0, 0, 0], s.angle);
        for (let i = 0; i < 12; i++) {
          const z = -12 + i * 2.2 + random() * .6, top = 1 + row * 1.2, hue = pick(RAINBOW);
          part(taper, solid, s, [0, top + .45, z], [.7, .9, .7], hue, [0, 0, 0], s.angle); part(bead, solid, s, [0, top + 1.2, z], .62, pick([0xf2c9a0, 0xe6b98c, 0xfbe3c4]), [0, 0, 0], s.angle);
        }
      }
    } else if (mark.kind === 'logGate') {
      // A gate of two old trunks and a fallen log over the road.
      for (const flank of [-1, 1]) { const s = beside(mark.at, flank, .9, 0); if (s) { part(taper, solid, s, [0, 3.6, 0], [1.5, 7.2, 1.5], 0x7a5236); part(blob, facet, s, [0, 7.6, 0], [3.4, 2.2, 3.4], 0x35804c); } }
      const s = onRoad(mark.at);
      part(cyl, solid, s, [0, 7, 0], [1.1, track.wallLeft(mark.at) + track.wallRight(mark.at) + 3.6, 1.1], 0x8a5f3c, [0, 0, Math.PI / 2], point.angle);
    } else {
      // A rainbow stands over the road, with a cloud at each foot.
      const arch = { ...onRoad(mark.at, 0, -1.5), key: 'rainbow' }, yaw = point.angle, reach = Math.max(track.wallLeft(mark.at), track.wallRight(mark.at)) + 2.5;
      RAINBOW.forEach((hue, i) => {
        const geometry = new THREE.TorusGeometry(reach + 5.4 - i * .9, .46, 6, 36, Math.PI);
        part(geometry, lit, arch, [0, 0, 0], 1, hue, [0, 0, 0], yaw); geometry.dispose();
      });
      for (const flank of [-1, 1]) for (let i = 0; i < 4; i++) part(blob, facet, arch, [flank * (reach + 3) + (i - 1.5) * 1.6, 1.6 + (i % 2) * .9, (i % 2) * 1.2 - .6], 3.2 + (i % 2), 0xffffff, [0, i, 0], yaw);
    }
  }
  // Every course starts under the same gate: striped posts, chequers, bunting and balloons.
  const gate = { ...onRoad(0), key: 'gate' }, span = Math.max(track.wallLeft(0), track.wallRight(0)) + .6, gateYaw = point.angle;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) part(cyl, solid, gate, [side * span, .4 + i * .8, 0], [.62, .8, .62], i % 2 ? 0xfff6e6 : 0xe5484d, [0, 0, 0], gateYaw);
    part(ball, shine, gate, [side * span, 7.7, 0], 1.1, 0xffd23f, [0, 0, 0], gateYaw);
    for (let i = 0; i < 3; i++) { part(ball, shine, gate, [side * (span + .9 + i * .5), 8.8 + i * .9, .3 * i], 1.15, RAINBOW[(i * 2 + (side > 0 ? 0 : 3)) % 6]!, [0, 0, 0], gateYaw); part(cyl, solid, gate, [side * (span + .5 + i * .3), 7.6 + i * .5, .15 * i], [.03, 1.8 + i, .03], 0xfff6e6, [0, 0, side * -.4], gateYaw); }
  }
  part(box, solid, gate, [0, 6.9, 0], [span * 2 + .6, .7, .5], 0xfff6e6, [0, 0, 0], gateYaw);
  for (let i = 0; i < 14; i++) part(box, solid, gate, [-span + (i + .5) * span / 7, 6.9, .27], [span / 7, .7, .04], i % 2 ? 0x22252b : 0xfdf7e6, [0, 0, 0], gateYaw);
  for (let i = 0; i < 17; i++) part(flag, solid, gate, [-span + (i + .5) * span * 2 / 17, 6.5 - Math.sin(i / 16 * Math.PI) * .7, .1], [.8, 1, 1], PASTEL[i % 6]!, [0, 0, 0], gateYaw);
  // Arrows on the outside of every sharp bend.
  for (let d = 0; d < LAP; d += 9) {
    const k = track.curvature(d + 9);
    if (Math.abs(k) < .055 || track.inCave(d + 9, 6)) continue;
    const side = -Math.sign(k), wall = side > 0 ? track.wallLeft(d + 9) : track.wallRight(d + 9), s = onRoad(d + 9, side * (wall + .9)), yaw = point.angle + Math.PI + side * .5;
    part(cyl, solid, s, [0, .9, 0], [.14, 1.8, .14], 0xfff6e6); part(box, solid, s, [0, 1.9, 0], [1.6, .9, .12], 0xffd23f, [0, 0, 0], yaw);
    for (const up of [-1, 1]) part(box, solid, s, [side * -.06, 1.9 + up * .16, .08], [.76, .17, .06], 0xe5383b, [0, 0, up * side * -.72], yaw);
  }

  batch.build(group, { name: 'scenery' });
  for (const geometry of [box, cyl, taper, cone, ball, bead, blob, dome, gem, disc, roof, flag]) geometry.dispose();
  // Lamps and crystals shine as soft points; they grow as the light goes.
  const lampGeometry = new THREE.BufferGeometry();
  lampGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3)); lampGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lampColors, 3));
  const halo = new THREE.PointsMaterial({ size: 7, vertexColors: true, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d')!, fade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      fade.addColorStop(0, 'rgba(255,255,255,1)'); fade.addColorStop(.25, 'rgba(255,255,255,.55)'); fade.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
    })() });
  const glow = new THREE.Points(lampGeometry, halo); glow.name = 'lamps'; glow.renderOrder = 4; glow.visible = lamps.length > 0; group.add(glow);
  return {
    group,
    update(time: number, dusk: number) {
      if (!calm) for (const sails of mills) sails.rotation.z = time * .7;
      halo.opacity = .22 + .55 * dusk; halo.size = 5 + 5 * dusk;
    },
  };
}
