import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial,
  Object3D, PlaneGeometry, SphereGeometry, Vector2, Vector3, CatmullRomCurve3, TubeGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The common crane of Myren and Berget, and the crane chick that follows Elof (plan §3.4), built in code: a long
 * body with the grey of its back, an S-shaped neck that is black in front with a white stripe from behind the eye
 * down its side, a red crown, the drooping bustle of dark feathers over its tail and, in flight, black
 * "fingers" at its wing tips. Each faces +x, and the parts that move are named. These stand in until the crane
 * modelled in Blender (art/blender/crane.py, boot/crane.glb) has come: it has the same parts by the same names.
 */

const GREY = '#9aa1a8';
const BLACK = '#24262a';
const WHITE = '#eceae4';
const RED = '#c0352a';

const paint = (color: string, roughness = 0.85, more: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, roughness, ...more });
const painted = (roughness = 0.85, more: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness, ...more });

function colourBy(geometry: BufferGeometry, pick: (p: Vector3, i: number) => Color): BufferGeometry {
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const c = pick(p.fromBufferAttribute(position, i), i);
    colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}

const mix = (a: string, b: string, k: number) => new Color(a).lerp(new Color(b), Math.min(1, Math.max(0, k)));
const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/**
 * Merges every mesh under `root` into one, its colours on its corners, in `root`'s own space, except what lies under
 * a part that moves of its own (`keep`): one draw call for each part that moves. Built as parts first, for clarity.
 */
function consolidate(root: Object3D, keep: Object3D[] = [], more: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}): Mesh {
  root.updateMatrixWorld(true);
  const into = new Matrix4().copy(root.matrixWorld).invert();
  const parts: BufferGeometry[] = [];
  const merged: Mesh[] = [];
  const visit = (node: Object3D) => {
    if (node !== root && keep.includes(node)) return;
    const mesh = node as Mesh;
    if (mesh.isMesh) {
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
      g.applyMatrix4(new Matrix4().multiplyMatrices(into, mesh.matrixWorld));
      if (!g.getAttribute('color')) {
        const c = (mesh.material as MeshStandardMaterial).color;
        const n = g.getAttribute('position').count;
        g.setAttribute('color', new Float32BufferAttribute(Array.from({ length: n * 3 }, (_, k) => [c.r, c.g, c.b][k % 3]!), 3));
      }
      parts.push(g);
      merged.push(mesh);
    }
    for (const child of [...node.children]) visit(child);
  };
  visit(root);
  for (const mesh of merged) { mesh.removeFromParent(); mesh.geometry.dispose(); }
  // Groups that held only meshes are left empty; they cost nothing.
  const one = new Mesh(mergeGeometries(parts), painted(0.8, more));
  parts.forEach((part) => part.dispose());
  root.add(one);
  return one;
}

/** A body of revolution along +x, from `profile` as [x, radius] from the tail to the chest. */
function body(profile: [number, number][], depth: number): BufferGeometry {
  const g = new LatheGeometry(profile.map(([x, r]) => new Vector2(r, x)), 24);
  g.rotateZ(-Math.PI / 2);
  g.scale(1, 1, depth);
  return g;
}

/** A neck along `points` that tapers from `r0` to `r1`: grey low down, then black in front and white behind. */
function neck(points: Vector3[], r0: number, r1: number, front: Vector3, greyUntil: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points);
  const rings = 28, around = 12;
  const g = new TubeGeometry(curve, rings, 1, around, false);
  const position = g.getAttribute('position');
  const centre = new Vector3(), p = new Vector3(), off = new Vector3();
  const along: number[] = [];
  for (let i = 0; i <= rings; i++) {
    curve.getPointAt(i / rings, centre);
    const r = r0 + (r1 - r0) * smooth(i / rings);
    for (let j = 0; j <= around; j++) {
      const k = i * (around + 1) + j;
      p.fromBufferAttribute(position, k);
      off.subVectors(p, centre).multiplyScalar(r);
      position.setXYZ(k, centre.x + off.x, centre.y + off.y, centre.z + off.z);
      along[k] = i / rings;
    }
  }
  g.computeVertexNormals();
  return colourBy(g, (q, k) => {
    const t = along[k]!;
    const at = curve.getPointAt(t);
    off.subVectors(q, at).normalize();
    const facing = off.dot(front);
    // In front, the throat is black; behind and on the sides, a white stripe runs down from the head.
    const black = smooth((facing + 0.55) / 0.25);
    const upper = mix(WHITE, BLACK, black);
    return new Color(GREY).lerp(upper, smooth((t - greyUntil) / 0.12));
  });
}

/** The head: black, a white patch behind the eye that runs into the neck's stripe, and the red crown on top. */
function head(radius: number): Group {
  const group = new Group();
  group.name = 'crane-head';
  const g = new SphereGeometry(radius, 18, 12);
  g.scale(1.3, 0.92, 0.86);
  colourBy(g, (p) => {
    const x = p.x / radius, y = p.y / radius, z = Math.abs(p.z) / radius;
    if (y > 0.55 && x > -0.55 && x < 0.75) return new Color(RED);
    if (x < 0.1 && z > 0.35 && y < 0.45 && y > -0.75) return new Color(WHITE);
    return new Color(BLACK);
  });
  group.add(new Mesh(g, painted(0.7)));
  const beak = new Mesh(new ConeGeometry(radius * 0.32, radius * 2.6, 10), paint('#8b8a6a', 0.55));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(radius * 2.35, -radius * 0.12, 0);
  group.add(beak);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(radius * 0.17, 10, 8), paint('#8a2a14', 0.25));
    eye.position.set(radius * 0.48, radius * 0.18, side * radius * 0.74);
    group.add(eye);
  }
  return group;
}

/** The bustle: long, drooping, dark feathers over the tail, the crane's own outline. */
function bustle(at: Vector3, length: number, droop: number): Group {
  const group = new Group();
  group.position.copy(at);
  const feather = new SphereGeometry(1, 10, 6);
  const materials = [paint('#5d636a', 0.95), paint('#474b51', 0.95), paint('#6b7178', 0.95), paint('#3a3d42', 0.95)];
  // Each feather hangs from the back, its root under the folded wing, curving down over the tail.
  for (let i = 0; i < 16; i++) {
    const k = i / 15;
    const long = length * (0.42 + 0.14 * Math.sin(i * 2.3) ** 2);
    const angle = droop + 0.45 * Math.sin(i * 1.7) ** 2;
    const mesh = new Mesh(feather, materials[i % 4]!);
    mesh.scale.set(long, length * 0.07, length * 0.13);
    mesh.position.set(-Math.cos(angle) * long * 0.8, -Math.sin(angle) * long * 0.8 + length * 0.04 * Math.sin(i * 3.1), (k - 0.5) * length * 0.46);
    mesh.rotation.set((k - 0.5) * 0.6, 0, angle);
    group.add(mesh);
  }
  return group;
}

/** A leg from `from` to `to`, a thin black rod, with three toes at `to`. */
function leg(from: Vector3, to: Vector3, radius: number, toes = 0.18, colour = '#2b2c2e'): Group {
  const group = new Group();
  const material = paint(colour, 0.7);
  const shin = new Mesh(new CylinderGeometry(radius, radius * 0.9, 1, 7).translate(0, 0.5, 0), material);
  const dir = new Vector3().subVectors(to, from);
  shin.scale.y = dir.length();
  shin.position.copy(from);
  shin.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
  group.add(shin);
  if (toes > 0) for (const turn of [-0.45, 0, 0.45]) {
    const toe = new Mesh(new CylinderGeometry(radius * 0.7, radius * 0.5, toes, 6).translate(0, toes / 2, 0), material);
    toe.position.copy(to);
    toe.rotation.set(turn, 0, -Math.PI / 2 + 0.05);
    group.add(toe);
  }
  return group;
}

/** The crane kneeling on Myren for Elof to climb on, about 1.9 EL long, its back at about 1 EL. */
export function craneKneeling(): Group {
  const group = new Group();
  group.name = 'crane';
  const torso = new Group();
  torso.name = 'crane-torso';
  torso.position.set(0, 0.55, 0);
  torso.rotation.z = 0.1;
  const trunk = new Mesh(body([[-0.95, 0.03], [-0.86, 0.13], [-0.64, 0.24], [-0.32, 0.33], [0, 0.37], [0.34, 0.37], [0.62, 0.32], [0.82, 0.23], [0.93, 0.12], [0.96, 0.01]], 1.05), paint(GREY));
  // The folded wings lie over the back, barely a shade darker, and end in the bustle.
  const wings = new Mesh(new SphereGeometry(1, 20, 12), paint('#949ba2', 0.85));
  wings.scale.set(0.74, 0.22, 0.4);
  wings.position.set(-0.16, 0.13, 0);
  wings.rotation.z = -0.1;
  torso.add(trunk, wings, bustle(new Vector3(-0.6, 0.2, 0), 1.0, 0.5));
  consolidate(torso);
  group.add(torso);
  // The neck rises from the chest in an S, and the head turns to look about.
  const neckGroup = new Group();
  neckGroup.name = 'crane-neck';
  neckGroup.position.set(0.78, 0.82, 0);
  const points = [new Vector3(0, 0, 0), new Vector3(0.12, 0.22, 0), new Vector3(0.08, 0.5, 0), new Vector3(0.1, 0.72, 0), new Vector3(0.2, 0.84, 0)];
  neckGroup.add(new Mesh(neck(points, 0.11, 0.055, new Vector3(1, 0, 0), 0.42), painted()));
  const h = head(0.1);
  h.position.set(0.24, 0.88, 0);
  h.rotation.z = -0.12;
  neckGroup.add(h);
  consolidate(h);
  consolidate(neckGroup, [h]);
  group.add(neckGroup);
  // Kneeling, it rests on its shins: they lie forward along the ground under it.
  const legs = new Group();
  for (const side of [-1, 1]) legs.add(leg(new Vector3(-0.2, 0.1, side * 0.17), new Vector3(0.62, 0.05, side * 0.19), 0.032, 0.14));
  consolidate(legs);
  group.add(legs);
  group.position.z = -0.8;
  return group;
}

/** One wing, out along +z: the grey coverts, the black secondaries along its back edge, and a tip that bends. */
function wing(side: 1 | -1): Group {
  const inner = new Group();
  inner.name = side > 0 ? 'wingNear' : 'wingFar';
  const surface = (span: number, lead: (b: number) => number, trail: (b: number) => number, black: (a: number, b: number) => number) => {
    const g = new PlaneGeometry(1, 1, 8, 6);
    const position = g.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const a = position.getX(i) + 0.5, b = position.getY(i) + 0.5;
      const x = lead(b) + (trail(b) - lead(b)) * a;
      position.setXYZ(i, x, 0.05 * Math.sin(Math.PI * a) * (1 - 0.5 * b), b * span);
    }
    g.computeVertexNormals();
    return colourBy(g, (_, i) => {
      const a = position.getX(i), b = position.getZ(i) / span;
      const k = (a - lead(b)) / (trail(b) - lead(b));
      return mix('#b0b7be', '#2e3135', black(k, b));
    });
  };
  // Lit a little from within, so its underside reads grey, as the sky's light under a real wing does.
  const material = painted(0.85, { side: DoubleSide, emissive: '#25282c' });
  inner.add(new Mesh(surface(1.0, (b) => 0.28 + 0.06 * Math.sin(Math.PI * b), (b) => -0.58 + 0.1 * b - 0.06 * Math.sin(Math.PI * b), (a) => smooth((a - 0.74) / 0.08)), material));
  // The leading edge is round and thick, where the bones and the small feathers are.
  const edge = (from: Vector3, to: Vector3, r0: number, r1: number) => {
    const rod = new Mesh(new CylinderGeometry(r1, r0, 1, 10, 1).translate(0, 0.5, 0), paint(GREY, 0.85));
    const dir = new Vector3().subVectors(to, from);
    rod.scale.y = dir.length();
    rod.position.copy(from);
    rod.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    rod.scale.x = 1.6;
    return rod;
  };
  inner.add(edge(new Vector3(0.22, 0.02, 0), new Vector3(0.24, 0.02, 1.0), 0.07, 0.05));
  const tip = new Group();
  tip.name = side > 0 ? 'wingTipNear' : 'wingTipFar';
  tip.position.set(0, 0, 0.98);
  tip.add(new Mesh(surface(0.7, (b) => 0.32 - 0.1 * b, (b) => -0.5 + 0.38 * b, (a, b) => Math.max(smooth((a - 0.68) / 0.1), smooth((b - 0.7) / 0.15))), material));
  tip.add(edge(new Vector3(0.26, 0.02, 0), new Vector3(0.2, 0.02, 0.7), 0.05, 0.025));
  // The long black primaries spread like fingers at the end.
  const finger = new SphereGeometry(1, 8, 5);
  const fingers = paint('#2e3135', 0.8);
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    const f = new Mesh(finger, fingers);
    f.scale.set(0.05, 0.012, 0.27 - 0.08 * Math.abs(k - 0.35));
    f.position.set(0.18 - 0.36 * k, 0, 0.7 + 0.24);
    f.rotation.y = 0.55 - 1.0 * k;
    f.position.x += Math.sin(f.rotation.y) * 0.24;
    tip.add(f);
  }
  inner.add(tip);
  consolidate(tip, [], { side: DoubleSide, emissive: '#25282c' });
  consolidate(inner, [tip], { side: DoubleSide, emissive: '#25282c' });
  inner.scale.z = side;
  return inner;
}

/** The crane flying with Elof on its back: its body about 2 EL long, its neck straight out and its legs trailing. */
export function craneFlying(): Group {
  const group = new Group();
  group.name = 'crane-flying';
  const trunk = new Mesh(body([[-1, 0.03], [-0.9, 0.14], [-0.6, 0.26], [-0.25, 0.34], [0.1, 0.37], [0.45, 0.34], [0.75, 0.25], [0.95, 0.12], [1.02, 0.01]], 1.05), paint(GREY));
  trunk.position.set(0, -0.35, 0);
  group.add(trunk);
  const tail = new Mesh(new SphereGeometry(1, 12, 8), paint('#3a3e44', 0.9));
  tail.scale.set(0.34, 0.05, 0.22);
  tail.position.set(-1.08, -0.33, 0);
  group.add(tail);
  const straight = [new Vector3(0, 0, 0), new Vector3(0.3, 0.06, 0), new Vector3(0.6, 0.1, 0), new Vector3(0.82, 0.1, 0)];
  const neckGroup = new Group();
  neckGroup.name = 'crane-neck';
  neckGroup.position.set(0.92, -0.25, 0);
  neckGroup.add(new Mesh(neck(straight, 0.1, 0.05, new Vector3(0, -1, 0), 0.3), painted()));
  const h = head(0.09);
  h.position.set(0.9, 0.1, 0);
  neckGroup.add(h);
  group.add(neckGroup);
  for (const side of [-1, 1]) group.add(leg(new Vector3(-0.7, -0.52, side * 0.07), new Vector3(-2.05, -0.5, side * 0.09), 0.024, 0.1));
  // Body, tail, neck, head and legs move together in flight: one draw; each wing and its tip, one each.
  const wings: Group[] = [];
  for (const side of [-1, 1] as const) {
    const w = wing(side);
    w.position.set(0.22, -0.2, side * 0.28);
    group.add(w);
    wings.push(w);
  }
  consolidate(group, wings);
  return group;
}

/** The crane chick: rusty down, a paler breast, long grey legs that walk, and dark eyes. */
export interface Chick { group: Group; turn: Group; torso: Group; neck: Group; legs: [Group, Group] }

export function craneChick(): Chick {
  const group = new Group();
  const turn = new Group();
  group.add(turn);
  const torso = new Group();
  torso.position.y = 0.42;
  const down = paint('#b9804c', 1);
  const g = new SphereGeometry(0.22, 18, 12);
  g.scale(1.22, 1, 0.92);
  colourBy(g, (p) => mix('#b5793f', '#dcc09a', smooth((-p.y / 0.22 + 0.1) / 0.6) * smooth((p.x / 0.27 + 0.3) / 0.6)));
  const fluff = new Mesh(g, painted(1));
  const tuft = new Mesh(new SphereGeometry(0.07, 10, 8), down);
  tuft.position.set(-0.27, 0.06, 0);
  tuft.scale.set(1.2, 0.8, 1);
  torso.add(fluff, tuft);
  for (const side of [-1, 1]) {
    const stub = new Mesh(new SphereGeometry(0.08, 10, 8), paint('#a86f3c', 1));
    stub.scale.set(1.3, 0.55, 0.4);
    stub.position.set(-0.04, 0.02, side * 0.18);
    stub.rotation.z = -0.3;
    torso.add(stub);
  }
  turn.add(torso);
  const neck = new Group();
  neck.position.set(0.18, 0.55, 0);
  const n = new Mesh(new CylinderGeometry(0.048, 0.062, 0.3, 10).translate(0, 0.15, 0), down);
  n.rotation.z = -0.15;
  const head = new Mesh(new SphereGeometry(0.1, 14, 10), paint('#bf8650', 1));
  head.scale.set(1.1, 1, 0.95);
  head.position.set(0.05, 0.33, 0);
  const beak = new Mesh(new ConeGeometry(0.03, 0.16, 8), paint('#4c3e30', 0.6));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.19, 0.31, 0);
  neck.add(n, head, beak);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.019, 10, 8), paint('#141210', 0.2));
    eye.position.set(0.1, 0.355, side * 0.075);
    neck.add(eye);
  }
  turn.add(neck);
  const legs = [-1, 1].map((side) => {
    const hip = new Group();
    hip.position.set(0, 0.34, side * 0.075);
    hip.add(leg(new Vector3(0, 0, 0), new Vector3(0.02, -0.33, 0), 0.016, 0.08, '#857766'));
    turn.add(hip);
    return hip;
  }) as [Group, Group];
  consolidate(torso);
  consolidate(neck);
  for (const hip of legs) consolidate(hip);
  return { group, turn, torso, neck, legs };
}

/** How the chick walks: a stride by the way it has come, a bob twice a stride, the head held, then thrust on. */
export interface Gait { phase: number; speed: number; facing: number }

export function stepChick(chick: Chick, gait: Gait, moved: number, dt: number, clock: number): void {
  const STEP = 0.24;
  gait.phase += Math.abs(moved) / STEP * Math.PI;
  const speed = dt > 0 ? Math.abs(moved) / dt : 0;
  gait.speed += (Math.min(1, speed / 1.2) - gait.speed) * (1 - Math.exp(-10 * dt));
  const w = gait.speed;
  if (Math.abs(moved) > 0.002) gait.facing = moved > 0 ? 0 : -Math.PI;
  chick.turn.rotation.y += (gait.facing - chick.turn.rotation.y) * (1 - Math.exp(-12 * dt));
  const swing = Math.sin(gait.phase) * 0.5 * w;
  chick.legs[0].rotation.z = swing;
  chick.legs[1].rotation.z = -swing;
  chick.torso.position.y = 0.42 + Math.abs(Math.sin(gait.phase)) * 0.035 * w - 0.01 * w;
  chick.torso.rotation.z = -0.06 * w;
  // Its head stays put while its body walks under it, then thrusts forward: twice a stride.
  const f = (gait.phase / Math.PI) % 1;
  const thrust = f < 0.7 ? 0.035 - 0.07 * (f / 0.7) : -0.035 + 0.07 * smooth((f - 0.7) / 0.3);
  const idle = (1 - w) * Math.max(0, Math.sin(clock * 0.7)) ** 8;
  chick.neck.position.x = 0.18 + thrust * w;
  chick.neck.rotation.z = -0.5 * idle + 0.04 * Math.sin(clock * 1.9) * (1 - w);
}
