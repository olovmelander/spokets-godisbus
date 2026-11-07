import {
  Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh,
  MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawnWhile } from './idle';

/**
 * The small lives of the story, as they move (the graphics pass of 6 November 2026; Olov: "skalbaggar, nyckelpiga
 * kan få bättre animationer"). Each is a few draw calls: what is rigid is merged with its colours in it, and the
 * legs are one instanced rod.
 */

const NONE = new Matrix4().makeScale(0, 0, 0);
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A geometry in one colour, to merge with others into one mesh. */
function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const shape = geometry.index ? geometry.toNonIndexed() : geometry;
  const colour = new Color(hex);
  const colours = new Float32Array(shape.getAttribute('position').count * 3);
  for (let i = 0; i < colours.length; i += 3) colours.set([colour.r, colour.g, colour.b], i);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  if (shape !== geometry) geometry.dispose();
  return shape;
}

function merged(parts: BufferGeometry[], roughness = 0.4): Mesh {
  const mesh = new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness }));
  parts.forEach((part) => part.dispose());
  return mesh;
}

export interface Critter {
  group: Group;
  update(used: boolean, clock: number, dt: number): void;
}

/**
 * The ladybird on its back by the deck's edge (garden, P2). Lying there, it pedals its legs in a wave and rocks,
 * trying to turn over. Turned over by him it lands with a little bounce, takes a few steps, lifts its red wing cases,
 * and its thin wings beat as it goes up and away to the hose, in a wavering curve.
 */
export function ladybird(): Critter {
  const group = new Group();
  const body = new Group();
  body.position.y = 0.36;
  group.add(body);
  const R = 0.36;
  // The black underside, the shield behind the head with its two white patches, and the head with its feelers.
  const black = '#16130f';
  const fixed: BufferGeometry[] = [
    painted(new SphereGeometry(R * 0.98, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.02, 0.35, 0.96), black),
    painted(new SphereGeometry(0.2, 14, 8).scale(0.75, 0.62, 1.15).translate(0.27, 0.06, 0), black),
    painted(new SphereGeometry(0.05, 8, 6).scale(1, 0.8, 1.2).translate(0.3, 0.1, 0.15), '#f3efe4'),
    painted(new SphereGeometry(0.05, 8, 6).scale(1, 0.8, 1.2).translate(0.3, 0.1, -0.15), '#f3efe4'),
    painted(new SphereGeometry(0.12, 12, 8).scale(1, 0.85, 1).translate(0.4, 0.02, 0), black),
  ];
  for (const side of [-1, 1]) {
    fixed.push(painted(new CylinderGeometry(0.012, 0.008, 0.2, 5).rotateZ(-0.9).rotateX(side * 0.5).translate(0.52, 0.1, side * 0.07), black));
    fixed.push(painted(new SphereGeometry(0.022, 6, 4).translate(0.6, 0.16, side * 0.13), black));
  }
  body.add(merged(fixed, 0.35));
  // The two wing cases, red with black spots, each hinged at its front by the middle line.
  const halves = [1, -1].map((side) => {
    const hinge = new Group();
    hinge.position.set(0.16, 0.0, 0);
    const parts: BufferGeometry[] = [
      painted(new SphereGeometry(R, 20, 10, side > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2).translate(-0.16, 0, 0), '#cf2419'),
    ];
    // Three and a half spots each: one half shares the middle spot.
    for (const [x, z, r] of [[-0.06, 0.16, 0.06], [-0.2, 0.12, 0.055], [0.06, 0.2, 0.05], [0.1, 0.02, 0.045]] as const) {
      const y = Math.sqrt(Math.max(0, R * R - x * x - z * z));
      parts.push(painted(new SphereGeometry(r, 10, 6).scale(1, 0.25, 1).translate(x - 0.16, y - 0.004, side * z), black));
    }
    hinge.add(merged(parts, 0.22));
    body.add(hinge);
    return { hinge, side };
  });
  // The thin wings, folded under the cases until it flies.
  const membrane = new MeshStandardMaterial({ color: '#d9d2c2', transparent: true, opacity: 0.55, roughness: 0.3, side: DoubleSide, depthWrite: false });
  const wings = [1, -1].map((side) => {
    const wing = new Mesh(new PlaneGeometry(0.62, 0.24).translate(-0.31, 0, 0).rotateX(-Math.PI / 2), membrane);
    wing.position.set(0.12, 0.16, side * 0.04);
    drawnWhile(wing, false);
    body.add(wing);
    return { wing, side };
  });
  // Six legs, each a thigh and a shin, as twelve instances of one rod.
  const legs = new InstancedMesh(new CylinderGeometry(0.024, 0.016, 1, 6).translate(0, -0.5, 0), new MeshStandardMaterial({ color: black, roughness: 0.5 }), 12);
  legs.instanceMatrix.setUsage(DynamicDrawUsage);
  body.add(legs);
  const at = new Object3D();
  const hips = [0.18, 0.02, -0.14];
  /** Lays a leg: `swing` forward or back, `lift` off the ground, its knee bent by `bend`. */
  const leg = (i: number, side: number, swing: number, lift: number, bend: number) => {
    const x = hips[i]!;
    at.position.set(x, -0.04, side * 0.17);
    at.rotation.set(side * (1.0 - lift), swing, 0, 'YXZ');
    at.scale.set(1, 0.18, 1);
    at.updateMatrix();
    legs.setMatrixAt((i * 2 + (side > 0 ? 0 : 1)) * 2, at.matrix);
    // The shin hangs from the knee.
    at.translateY(-0.18);
    at.rotation.set(side * (0.15 - lift * 0.4 + bend), swing * 0.6, 0, 'YXZ');
    at.scale.set(1, 0.19, 1);
    at.updateMatrix();
    legs.setMatrixAt((i * 2 + (side > 0 ? 0 : 1)) * 2 + 1, at.matrix);
  };
  let since = 0;
  let wasUsed = false;
  return {
    group,
    update(used, clock, dt) {
      if (used && !wasUsed) since = 0;
      wasUsed = used;
      since = used ? since + dt : 0;
      if (!used) {
        // On its back, tipped a little towards the lens so its underside and legs read. The legs pedal in a wave from
        // front to back, fast and uneven with short pauses, and about every four seconds it heaves itself almost
        // over to one side, and falls back with a wobble.
        const cycle = clock % 4.2, way = Math.floor(clock / 4.2) % 2 ? 1 : -1;
        const heave = cycle < 3 ? Math.sin(clock * 1.7) * 0.06
          : cycle < 3.55 ? smooth((cycle - 3) / 0.55) * 0.75 + Math.sin(clock * 1.7) * 0.06 * (1 - smooth((cycle - 3) / 0.55))
            : 0.75 * Math.exp(-(cycle - 3.55) * 5) * Math.cos((cycle - 3.55) * 13);
        body.rotation.set(Math.PI + 0.5 + heave * way + Math.sin(clock * 6) * 0.03, 0, 0);
        body.position.set(0, 0.36, 0);
        const pedal = clock * 19 + Math.sin(clock * 1.3) * 4 + Math.sin(clock * 2.9) * 2;
        const pause = 0.35 + 0.65 * smooth((Math.sin(clock * 0.9) + Math.sin(clock * 2.3) * 0.5 + 0.6) / 0.8);
        const strain = cycle > 3 && cycle < 3.7 ? 1.4 : 1;
        for (let i = 0; i < 3; i++) for (const side of [1, -1]) {
          const phase = pedal - i * 0.9 + (side > 0 ? 0 : Math.PI);
          leg(i, side, Math.sin(phase) * 0.5 * pause * strain, 0.55 + 0.3 * Math.cos(phase) * pause, 1.05);
        }
        for (const { hinge } of halves) hinge.rotation.set(0, 0, 0);
        for (const { wing } of wings) drawnWhile(wing, false);
        group.scale.setScalar(1);
        drawnWhile(group, true);
        legs.instanceMatrix.needsUpdate = true;
        return;
      }
      // Turned over: up a little, round, and down with a small bounce.
      const flip = smooth(since / 0.45);
      const bounce = since > 0.45 && since < 0.7 ? Math.sin(((since - 0.45) / 0.25) * Math.PI) * 0.05 : 0;
      body.rotation.set(Math.PI * (1 - flip), 0, 0);
      let x = 0, y = 0.36 + Math.sin(flip * Math.PI) * 0.18 + bounce, pitch = 0;
      // A few steps towards the hose.
      const walking = Math.min(1, Math.max(0, (since - 0.7) / 0.7));
      x += walking * 0.32;
      // The wing cases lift and part; the thin wings unfold and beat.
      const open = smooth((since - 1.35) / 0.3);
      for (const { hinge, side } of halves) hinge.rotation.set(side * 0.95 * open, 0, 0.55 * open);
      const flown = Math.max(0, since - 1.7);
      for (const { wing, side } of wings) {
        wing.scale.setScalar(Math.max(open, 0.001));
        drawnWhile(wing, open > 0.001);
        wing.rotation.set(side * (0.35 + (flown > 0 || open > 0.9 ? Math.sin(clock * 55) * 0.6 : 0)), side * 0.5, 0.25);
      }
      if (flown > 0) {
        // Up and away to the right, where the hose hangs, wavering as a ladybird does.
        x += flown * 3.2;
        y += flown * flown * 2.2 + Math.sin(flown * 9) * 0.08;
        pitch = 0.35 + Math.sin(flown * 7) * 0.1;
      }
      body.position.set(x, y, Math.sin(flown * 5) * 0.12);
      body.rotation.z = pitch;
      for (let i = 0; i < 3; i++) for (const side of [1, -1]) {
        // A tripod walk while it walks, folded up while it turns and flies.
        const phase = since * 14 + i * Math.PI * 0.66 + (side > 0 ? 0 : Math.PI);
        const step = walking > 0 && walking < 1 ? Math.sin(phase) : 0;
        const tuck = flown > 0 || since < 0.45 ? 0.55 : 0;
        leg(i, side, step * 0.35, tuck + Math.max(0, Math.cos(phase)) * 0.25 * (step !== 0 ? 1 : 0), 0.4);
      }
      legs.instanceMatrix.needsUpdate = true;
      const gone = flown > 1.6;
      group.scale.setScalar(gone ? 0 : 1);
      drawnWhile(group, !gone);
    },
  };
}

/**
 * A line of ants on their path: each runs along a loop on the ground on six legs in a tripod, its feelers working,
 * some carrying a needle; when they are no longer wanted they hurry away.
 */
export function antTrail(count = 7): Critter {
  const group = new Group();
  const dark = '#2a1a12';
  const bodyShape = mergeGeometries([
    painted(new SphereGeometry(0.075, 10, 6).scale(1.35, 0.85, 0.9).translate(-0.12, 0.09, 0), dark),
    painted(new SphereGeometry(0.04, 8, 5).scale(1.4, 0.8, 0.8).translate(0, 0.1, 0), dark),
    painted(new SphereGeometry(0.05, 8, 6).translate(0.09, 0.11, 0), dark),
    painted(new CylinderGeometry(0.006, 0.006, 0.12, 4).rotateZ(-1.0).rotateX(0.5).translate(0.15, 0.15, 0.03), dark),
    painted(new CylinderGeometry(0.006, 0.006, 0.12, 4).rotateZ(-1.0).rotateX(-0.5).translate(0.15, 0.15, -0.03), dark),
  ]);
  const bodies = new InstancedMesh(bodyShape, new MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), count);
  const legs = new InstancedMesh(new CylinderGeometry(0.008, 0.006, 1, 4).translate(0, -0.5, 0), new MeshStandardMaterial({ color: dark, roughness: 0.6 }), count * 6);
  const needles = new InstancedMesh(new CylinderGeometry(0.01, 0.01, 0.34, 4).rotateZ(Math.PI / 2 - 0.15), new MeshStandardMaterial({ color: '#8d6b3c', roughness: 0.9 }), count);
  for (const mesh of [bodies, legs, needles]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  const at = new Object3D();
  const leg = new Object3D();
  let since = 0;
  return {
    group,
    update(used, clock, dt) {
      since = used ? since + dt : 0;
      const away = Math.min(1, since / 0.8);
      for (let i = 0; i < count; i++) {
        // Round a long loop, each its own way along it, at its own pace.
        const s = clock * (0.35 + (i % 3) * 0.05) + i * (Math.PI * 2 / count);
        const dir = i % 2 ? 1 : -1;
        const a = s * dir;
        let x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.16;
        // Hurrying off, out of the picture's way.
        x += away * away * 2.4 * Math.sign(x || 1);
        const heading = Math.atan2(Math.cos(a) * 0.16 * dir, -Math.sin(a) * 0.9 * dir);
        at.position.set(x, Math.abs(Math.sin(clock * 22 + i)) * 0.006, z);
        at.rotation.set(0, -heading, 0);
        at.scale.setScalar(1 - away);
        at.updateMatrix();
        bodies.setMatrixAt(i, at.matrix);
        // Every third carries a needle over its back.
        if (i % 3 === 0) {
          leg.position.set(0, 0.17, 0);
          leg.rotation.set(0, 0, 0);
          leg.scale.setScalar(1);
          leg.updateMatrix();
          needles.setMatrixAt(i, at.matrix.clone().multiply(leg.matrix));
        } else {
          needles.setMatrixAt(i, NONE);
        }
        for (let k = 0; k < 6; k++) {
          const side = k % 2 ? 1 : -1;
          const pair = Math.floor(k / 2);
          // A tripod: front and back of one side with the middle of the other.
          const phase = clock * 24 + (((pair + (side > 0 ? 0 : 1)) % 2) ? Math.PI : 0) + i;
          leg.position.set(0.02 - pair * 0.03, 0.1, side * 0.02);
          leg.rotation.set(side * (1.1 + Math.max(0, Math.sin(phase)) * 0.25), (pair - 1) * 0.6 + Math.cos(phase) * 0.35, 0, 'YXZ');
          leg.scale.set(1, 0.13, 1);
          leg.updateMatrix();
          legs.setMatrixAt(i * 6 + k, at.matrix.clone().multiply(leg.matrix));
        }
      }
      bodies.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = needles.instanceMatrix.needsUpdate = true;
      drawnWhile(group, away < 1);
    },
  };
}

/**
 * The living column under a needle mat in Granskogen (plan §4.3, C2): ants holding on to each other, heads up, three
 * abreast, each with its six legs splayed to grip the ones beside it. They never sit still: each shifts its grip,
 * works its feelers, and the column gives a little under the mat as it rises and falls. One instanced mesh.
 */
export function antColumn(width: number, rows = 10): { group: Group; tick: (clock: number) => void } {
  const group = new Group();
  const dark = '#2e1d14';
  // Few corners each: thirty of them stand in every column, and six columns in the picture at once.
  const parts = [
    painted(new SphereGeometry(0.075, 7, 4).scale(1.35, 0.85, 0.9).translate(-0.12, 0, 0), dark),
    painted(new SphereGeometry(0.04, 6, 3).scale(1.4, 0.8, 0.8).translate(0, 0.005, 0), dark),
    painted(new SphereGeometry(0.05, 6, 4).translate(0.09, 0.015, 0), '#3a2519'),
    painted(new CylinderGeometry(0.006, 0.006, 0.12, 3, 1, true).rotateZ(-1.0).rotateX(0.5).translate(0.15, 0.06, 0.03), dark),
    painted(new CylinderGeometry(0.006, 0.006, 0.12, 3, 1, true).rotateZ(-1.0).rotateX(-0.5).translate(0.15, 0.06, -0.03), dark),
  ];
  // Legs splayed out to both sides, bent at the knee, gripping.
  for (const side of [-1, 1]) for (const [x, turn] of [[0.03, 0.6], [0, 0], [-0.03, -0.6]] as const) {
    const thigh = new CylinderGeometry(0.009, 0.007, 0.1, 3, 1, true).translate(0, 0.05, 0).rotateX(side * 1.2).rotateY(turn).translate(x, 0, side * 0.02);
    const knee = new Vector3(0, 0.1, 0).applyAxisAngle(new Vector3(1, 0, 0), side * 1.2).applyAxisAngle(new Vector3(0, 1, 0), turn);
    const shin = new CylinderGeometry(0.007, 0.005, 0.1, 3, 1, true).translate(0, 0.05, 0).rotateX(side * 2.3).rotateY(turn).translate(x + knee.x, knee.y, side * 0.02 + knee.z);
    parts.push(painted(thigh, dark), painted(shin, dark));
  }
  const count = rows * 3;
  const ants = new InstancedMesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), count);
  ants.instanceMatrix.setUsage(DynamicDrawUsage);
  parts.forEach((part) => part.dispose());
  group.add(ants);
  const at = new Object3D();
  const seat = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    return {
      x: Math.sin(row * 1.6) * 0.12 + (col - 1) * width * 0.09 + Math.sin(i * 7.3) * 0.03,
      y: -0.06 - row * 0.2 + Math.sin(i * 3.1) * 0.03,
      z: 0.12 + (col === 1 ? 0.05 : -0.02) + Math.sin(i * 5.7) * 0.03,
      lean: Math.sin(i * 2.9) * 0.35,
      seed: i * 1.37,
    };
  });
  return {
    group,
    tick(clock) {
      for (const [i, s] of seat.entries()) {
        // Every so often one shifts its grip: a small quick twist, held, then back.
        const shift = Math.max(0, Math.sin(clock * 0.9 + s.seed * 3)) ** 12;
        at.position.set(s.x + Math.sin(clock * 3.1 + s.seed) * 0.008, s.y + Math.sin(clock * 2.2 + s.seed) * 0.006, s.z);
        // Turned on its long axis so its legs reach out across the picture, to the ants beside it.
        at.rotation.set(Math.PI / 2 + Math.sin(clock * 4.3 + s.seed) * 0.08 + shift * 0.4, 0, Math.PI / 2 + s.lean + Math.sin(clock * 1.7 + s.seed) * 0.06, 'ZYX');
        at.updateMatrix();
        ants.setMatrixAt(i, at.matrix);
      }
      ants.instanceMatrix.needsUpdate = true;
    },
  };
}
