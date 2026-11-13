import { Group, Matrix4, Quaternion, Euler, Vector3 } from 'three';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';
import { standing } from '../dressing/foreground';
import { KIT, sequence } from '../dressing/kit';
import { drawnWhile } from '../idle';
import { windAt } from '../wind';
import { smallMaterial, swarm } from './fauna/small-kit';

/**
 * The garden's bumblebee (the creature overhaul, 13 November 2026; it was a flat card in ../dressing/effects.ts): a
 * fuzzy striped bumblebee, modelled in Blender (art/blender/small-life.py), that bumbles from one dandelion to the next
 * nearest him, wobbling as it goes, hovers over a head a moment, lands, folds its wings back over itself, turns about
 * on the flower a little, and is off again. In the storm it is away.
 *
 * One mesh and one draw call, on every tier, as the card was, and only while it is in the picture. With less motion
 * asked for, it sits where it is.
 */
export function installBumblebee(): void {
  PACK.lifts.push(createBumblebee);
}

/** The head of a dandelion is 0.13 over its middle (../dressing/lawn.ts): its feet stand there. */
const ON_HEAD = 0.12;
const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
const P = new Vector3();
const S = new Vector3(1, 1, 1);
const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

/** Where the bee is and what it does: `flown` goes 0 to 1 on its way, `sat` 0 to 1 as it settles. */
export interface Bee {
  on: number;
  at: Vector3;
  from: Vector3;
  flown: number;
  far: number;
  stay: number;
  sat: number;
  yaw: number;
}

export function createBumblebee({ chapter, scene, dressing }: ExtraContext): ViewExtra | null {
  if (chapter.place !== 'garden' || chapter.storm || !dressing || !KIT) return null;
  // The dandelions near the path, as the card's were.
  const heads = standing(dressing, KIT.petal).map((head) => head.at).filter((head) => head.z > -3.6);
  if (heads.length < 2) return null;
  const group = new Group();
  group.name = 'bumblebee';
  const mesh = swarm('bee', 1, smallMaterial(true));
  mesh.name = 'bumblebee';
  group.add(mesh);
  drawnWhile(group, false);
  scene.add(group);
  const act = mesh.geometry.getAttribute('act');
  const order = sequence(83);
  const bee: Bee = { on: -1, at: new Vector3(), from: new Vector3(), flown: 1, far: 1, stay: 0, sat: 1, yaw: 0 };
  let clock = 0;
  return {
    update(frame: ExtraFrame) {
      const still = frame.still;
      const dt = still ? 0 : Math.min(0.1, frame.dt);
      clock += dt;
      const cx = frame.camera.position.x;
      // It works the dandelions nearest him: a while on each, then on to another.
      const near = heads.filter((head) => Math.abs(head.x - cx) < 7);
      if (bee.on < 0 || (!still && bee.flown >= 1 && Math.abs(heads[bee.on]!.x - cx) > 9)) {
        // Come into the picture with him, or left behind: it starts on the nearest one, as the card did.
        if (!near.length) { drawnWhile(group, false); bee.on = -1; return; }
        bee.on = heads.indexOf(near[0]!);
        bee.at.copy(near[0]!).setY(near[0]!.y + ON_HEAD);
        bee.flown = 1;
        bee.sat = 1;
        bee.stay = 1 + order() * 2;
      }
      const others = near.filter((head) => head !== heads[bee.on]);
      // It is off when its time is up, or when he comes right up to it.
      const crowded = Math.abs(frame.x - bee.at.x) < 0.7 && Math.abs(frame.y - bee.at.y) < 1.6;
      if (!still && bee.flown >= 1 && (bee.stay -= dt) < 0 || (!still && bee.flown >= 1 && crowded && bee.sat > 0.5)) {
        if (others.length) {
          bee.from.copy(bee.at);
          bee.on = heads.indexOf(others[Math.floor(order() * others.length)]!);
          bee.far = Math.max(0.6, bee.at.distanceTo(heads[bee.on]!));
          bee.flown = 0;
        } else bee.stay = 1;
      }
      const to = heads[bee.on]!;
      // The head it sits on nods in the wind, and the bee with it.
      const goal = P.set(to.x + windAt(to.x) * 0.045, to.y + ON_HEAD, to.z);
      let x = goal.x, y = goal.y, z = goal.z, pitch = 0, roll = 0;
      if (bee.flown < 1) {
        // A little over an EL a second, slower near the end, where it hovers over the head before it comes down.
        bee.flown = Math.min(1, bee.flown + dt * (1.1 / bee.far + 0.2));
        const k = smooth(bee.flown / 0.85);
        const down = smooth((bee.flown - 0.85) / 0.15);
        const lift = 0.3 + Math.min(0.5, bee.far * 0.12);
        // It bumbles: its way wobbles in every direction, and its body rolls and pitches with it.
        const wobble = 1 - down;
        x = bee.from.x + (goal.x - bee.from.x) * k + wobble * 0.05 * Math.sin(clock * 7.3);
        const hover = 0.09 * smooth((bee.flown - 0.6) / 0.25) * (1 - down);
        y = bee.from.y + (goal.y - bee.from.y) * k + Math.sin(k * Math.PI) * lift + hover + wobble * 0.035 * Math.sin(clock * 11.1);
        z = bee.from.z + (goal.z - bee.from.z) * k + wobble * 0.04 * Math.sin(clock * 5.7 + 1);
        roll = wobble * 0.25 * Math.sin(clock * 9.2);
        pitch = wobble * (0.15 + 0.12 * Math.sin(clock * 6.1));
        const way = Math.atan2(-(goal.z - bee.from.z), goal.x - bee.from.x);
        bee.yaw += Math.atan2(Math.sin(way - bee.yaw), Math.cos(way - bee.yaw)) * Math.min(1, dt * 6);
        bee.sat = Math.max(0, bee.sat - dt / 0.12);
        if (bee.flown >= 1) bee.stay = 1.6 + order() * 1.8;
      } else {
        bee.sat = Math.min(1, bee.sat + dt / 0.35);
        // On the flower it turns about a little as it works it.
        bee.yaw += Math.sin(clock * 0.9 + bee.on) * 0.6 * dt;
      }
      bee.at.set(x, y, z);
      E.set(roll, bee.yaw, pitch, 'YZX');
      mesh.setMatrixAt(0, M.compose(bee.at, Q.setFromEuler(E), S));
      mesh.instanceMatrix.needsUpdate = true;
      // Flying, its wings whir up and out, a blur; sitting, they lie folded back over its body.
      const whir = still ? 0 : 0.55 + 0.45 * Math.sin(clock * 170);
      const sat = smooth(bee.sat);
      act.setXYZW(0, whir * (1 - sat) + 0.06 * sat, whir * (1 - sat) + 0.06 * sat, 1.25 * sat, 0);
      act.needsUpdate = true;
      drawnWhile(group, true);
      // For a session's close pictures: where the bee is, and the lens. Not in a build.
      if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __bee: bee, __lens: frame.camera });
    },
  };
}
