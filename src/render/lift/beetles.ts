import {
  Color, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshStandardMaterial,
  Object3D, SphereGeometry, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { heightAt, sequence } from '../dressing/kit';
import { drawnWhile } from '../idle';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';

/**
 * Beetles on the forest floor (the graphics pass of 6 November 2026; Olov: "skalbaggar ... kan få bättre
 * animationer"). Dor beetles, blue-black with a sheen, walk about just behind the path where he plays: each about
 * its own patch of ground, on six legs in a tripod, feelers twitching. Now and then one stops and stands; when he
 * comes close, it hurries off out of his way, and comes back when he has gone.
 *
 * In the places where the ground is moss or grass: the forest, the garden, the bog, and never in the storm. Mid and High only (../rich.ts),
 * three draws, and only while one is in the picture. With less motion asked for, they stand still.
 */
export function installBeetles(): void {
  PACK.lifts.push(createBeetles);
}

const PLACES = new Set(['forest', 'garden', 'bog']);
/** One beetle about every this many EL of path, where the ground is level and dry. */
const EVERY = 16;
/** How far from its home it walks, in EL. */
const ROAM = 1.6;
const NONE = new Matrix4().makeScale(0, 0, 0);
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const shape = geometry.index ? geometry.toNonIndexed() : geometry;
  const colour = new Color(hex);
  const colours = new Float32Array(shape.getAttribute('position').count * 3);
  for (let i = 0; i < colours.length; i += 3) colours.set([colour.r, colour.g, colour.b], i);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  if (shape !== geometry) geometry.dispose();
  return shape;
}

/**
 * A dor beetle, 0.3 EL long along +x, standing on the origin: wing cases with their grooves and the violet sheen at
 * their rims, the shield behind its head, its head with two eyes and its jaws. Olov found it an unfinished blob as it
 * was (12 November 2026): it had no eyes, and its legs and feelers were too thin to be seen.
 */
function beetleShape(): BufferGeometry {
  const grooves = [-0.05, -0.025, 0.025, 0.05].map((z) =>
    painted(new CylinderGeometry(0.0035, 0.0035, 0.2, 4).rotateZ(Math.PI / 2).translate(-0.05, 0.158 - Math.abs(z) * 0.55, z), '#3b4590'));
  return mergeGeometries([
    painted(new SphereGeometry(1, 16, 10).scale(0.16, 0.08, 0.105).translate(-0.045, 0.085, 0), '#1c2142'),
    // The rim of the wing cases, catching a violet sheen, as a dor beetle's does.
    painted(new SphereGeometry(1, 16, 6).scale(0.165, 0.035, 0.11).translate(-0.045, 0.06, 0), '#3e2f6e'),
    // The seam between the wing cases, and the grooves along them.
    painted(new CylinderGeometry(0.005, 0.005, 0.2, 4).rotateZ(Math.PI / 2).translate(-0.045, 0.16, 0), '#090a16'),
    ...grooves,
    painted(new SphereGeometry(1, 12, 8).scale(0.06, 0.06, 0.092).translate(0.115, 0.08, 0), '#252b56'),
    painted(new SphereGeometry(1, 10, 6).scale(0.04, 0.034, 0.052).translate(0.18, 0.066, 0), '#13162c'),
    // Its eyes, glossy at the sides of its head, and its two jaws.
    ...[-1, 1].map((side) => painted(new SphereGeometry(1, 8, 6).scale(0.014, 0.014, 0.014).translate(0.198, 0.074, side * 0.04), '#5a5f8c')),
    ...[-1, 1].map((side) => painted(new CylinderGeometry(0.004, 0.009, 0.035, 4).rotateZ(-Math.PI / 2).rotateY(side * 0.35).translate(0.222, 0.056, side * 0.016), '#090a16')),
  ]);
}

interface Beetle {
  home: number;
  z: number;
  x: number;
  heading: number;
  /** How fast it goes now: it speeds up and slows down, never at once. */
  speed: number;
  stride: number;
  seed: number;
}

/** Where beetles live: on level, dry ground every so often along the path. */
function homes(chapter: ChapterData): Beetle[] {
  const line = chapter.ground;
  const from = line[0]!.x + 4;
  const to = line[line.length - 1]!.x - 4;
  const next = sequence(71);
  const out: Beetle[] = [];
  for (let x = from + EVERY / 2; x < to; x += EVERY * (0.7 + 0.6 * next())) {
    const level = Math.abs(heightAt(chapter, x - ROAM) - heightAt(chapter, x)) < 0.05 && Math.abs(heightAt(chapter, x + ROAM) - heightAt(chapter, x)) < 0.05;
    const wet = (chapter.water ?? []).some((w) => x > w.from - 3 && x < w.to + 3);
    if (!level || wet) continue;
    out.push({ home: x, z: -0.45 - 0.35 * next(), x, heading: next() < 0.5 ? 0 : Math.PI, speed: 0, stride: 0, seed: next() * 100 });
  }
  return out;
}

export function createBeetles({ chapter, scene }: ExtraContext): ViewExtra | null {
  // In the storm they are hidden away under the moss and the bark with the rest of the near life (./fauna/plan.ts),
  // and none walk out into the rain (the creature overhaul, 13 November 2026).
  if (!chapter.place || !PLACES.has(chapter.place) || chapter.storm?.rain) return null;
  const beetles = homes(chapter);
  if (beetles.length === 0) return null;
  const group = new Group();
  group.name = 'beetles';
  group.userData.rich = true;
  const count = beetles.length;
  // A sheen on the wing cases: smooth, a little metal.
  const bodies = new InstancedMesh(beetleShape(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.25 }), count);
  // Legs and feelers thick enough to be seen on a phone: before, they vanished, and it read as a blob.
  const legs = new InstancedMesh(new CylinderGeometry(0.024, 0.012, 1, 5).translate(0, -0.5, 0), new MeshStandardMaterial({ color: '#141729', roughness: 0.45 }), count * 6);
  const feelers = new InstancedMesh(new CylinderGeometry(0.008, 0.011, 1, 4).translate(0, 0.5, 0), new MeshStandardMaterial({ color: '#141729', roughness: 0.45 }), count * 2);
  for (const mesh of [bodies, legs, feelers]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  scene.add(group);
  const at = new Object3D();
  const part = new Object3D();
  const placed = new Matrix4();
  return {
    update(frame: ExtraFrame) {
      const { clock, still } = frame;
      const dt = still ? 0 : Math.min(frame.dt, 1 / 20);
      const cx = frame.camera.position.x;
      let shown = false;
      for (const [i, b] of beetles.entries()) {
        if (Math.abs(b.x - cx) > 14) {
          bodies.setMatrixAt(i, NONE);
          for (let k = 0; k < 6; k++) legs.setMatrixAt(i * 6 + k, NONE);
          for (let k = 0; k < 2; k++) feelers.setMatrixAt(i * 2 + k, NONE);
          continue;
        }
        shown = true;
        // It walks most of the time, and now and then stands a while.
        const walking = smooth((Math.sin(clock * 0.31 + b.seed) + Math.sin(clock * 0.53 + b.seed * 1.7)) * 1.2 + 0.6);
        // He is close: it hurries off from him along the ground.
        const near = Math.abs(frame.x - b.x) < 1.8 && Math.abs(frame.y - heightAt(chapter, b.x)) < 1.2;
        let speed = 0.32 * walking;
        let want = b.heading + Math.sin(clock * 0.7 + b.seed) * 0.9 * dt;
        if (near) {
          want = frame.x > b.x ? Math.PI : 0;
          speed = 0.9;
        } else if (Math.abs(b.x - b.home) > ROAM) {
          // Too far from home: it turns back.
          want = b.x > b.home ? Math.PI : 0;
        }
        // It turns towards where it wants to go, a little at a time.
        let turn = Math.atan2(Math.sin(want - b.heading), Math.cos(want - b.heading));
        turn = Math.max(-3 * dt, Math.min(3 * dt, turn));
        b.heading += turn;
        // It gets going in a few strides, and slows to a stop.
        b.speed += (speed - b.speed) * Math.min(1, dt * (speed > b.speed ? 7 : 4));
        const along = Math.cos(b.heading) * b.speed * dt;
        b.x += along;
        b.z = Math.max(-1.1, Math.min(-0.35, b.z + Math.sin(b.heading) * b.speed * dt * 0.3));
        b.stride += (b.speed + Math.abs(turn) * 0.3) * dt * 34;
        // It stands on its legs, a little up off the ground, and bobs with its steps.
        at.position.set(b.x, heightAt(chapter, b.x) + 0.035 + 0.004 * Math.abs(Math.sin(b.stride)), b.z);
        at.rotation.set(0, -b.heading, Math.sin(b.stride * 0.5) * 0.02);
        at.updateMatrix();
        bodies.setMatrixAt(i, at.matrix);
        for (let k = 0; k < 6; k++) {
          const side = k % 2 ? 1 : -1;
          const pair = Math.floor(k / 2);
          // A tripod: the front and back legs of one side step with the middle one of the other.
          const phase = b.stride + ((pair + (side > 0 ? 0 : 1)) % 2 ? Math.PI : 0);
          // Splayed forward, out and back, so that each is seen from the side; lifted as it swings forward.
          part.position.set(0.07 - pair * 0.06, 0.07, side * 0.05);
          part.rotation.set(side * (0.75 + Math.max(0, Math.sin(phase)) * 0.25), (1 - pair) * 0.9 * side + Math.cos(phase) * 0.35 * Math.min(1, b.speed / 0.05), 0, 'YXZ');
          part.scale.set(1, 0.17, 1);
          part.updateMatrix();
          legs.setMatrixAt(i * 6 + k, placed.multiplyMatrices(at.matrix, part.matrix));
        }
        for (let k = 0; k < 2; k++) {
          const side = k ? 1 : -1;
          part.position.set(0.21, 0.075, side * 0.025);
          part.rotation.set(side * 0.5 + Math.sin(clock * 7 + b.seed + k) * 0.12, 0, -1.1 + Math.sin(clock * 5.3 + b.seed * 2 + k) * 0.15, 'XYZ');
          part.scale.set(1, 0.13, 1);
          part.updateMatrix();
          feelers.setMatrixAt(i * 2 + k, placed.multiplyMatrices(at.matrix, part.matrix));
        }
      }
      bodies.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = feelers.instanceMatrix.needsUpdate = true;
      drawnWhile(group, shown);
    },
  };
}
