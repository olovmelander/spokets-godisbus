import {
  AdditiveBlending, CircleGeometry, Color, DynamicDrawUsage, Group, InstancedMesh, LatheGeometry, MeshBasicMaterial,
  MeshStandardMaterial, Object3D, RingGeometry, SphereGeometry, Vector2,
} from 'three';
import { DROP_FALL, DROP_FROM, DROP_WARNING } from '../sim/constants';
import type { ChapterData } from '../sim/types';
import { drawnWhile } from './idle';
import { awningTips } from './village';

/** How far a drop reaches over its middle, to its point, and under it, to its round foot. */
export const DROP = { top: 0.34, foot: 0.2 };

/** A drop's splash: how long it lasts, how wide its ring grows, and how many beads it throws up. */
export const SPLASH = { time: 0.5, ring: 0.75, beads: 5 };

/** What a splash's ring adds to the ground at first: a pale glint of the sky. */
const GLINT = new Color('#7fa3bf');

/** A drop as a drop is drawn: round below, and drawn up to a point. Its middle is at 0. */
export function dropShape(): LatheGeometry {
  const round = DROP.foot;
  const points: Vector2[] = [];
  // Round from its foot to a little over its middle...
  const leave = Math.PI / 6;
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * (Math.PI / 2 + leave);
    points.push(new Vector2(k === 0 ? 0 : round * Math.cos(a), round * Math.sin(a)));
  }
  // ...and on from there the way the round was going, bending in to its point.
  const from = points[points.length - 1]!;
  const towards = new Vector2(-Math.sin(leave), Math.cos(leave)).multiplyScalar(0.14).add(from);
  const point = new Vector2(0, DROP.top);
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    points.push(new Vector2(
      k === 6 ? 0 : (1 - t) ** 2 * from.x + 2 * (1 - t) * t * towards.x + t * t * point.x,
      (1 - t) ** 2 * from.y + 2 * (1 - t) * t * towards.y + t * t * point.y,
    ));
  }
  return new LatheGeometry(points, 14);
}

/**
 * For each of a chapter's drips, how high the tip of the awning's scallop it drips from is (village.ts), or
 * null. A drop under an awning is seen hanging from that tip by its point, swelling, and it falls from there.
 * Elsewhere (the dew from the birch) a drop is only seen as it falls, from the simulation's height.
 */
export function hanging(chapter: ChapterData): (number | null)[] {
  const tips = awningTips(chapter);
  return (chapter.drips ?? []).map((drip) => tips.find((tip) => Math.abs(tip.x - drip.at.x) < 0.3)?.y ?? null);
}

const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/**
 * The drops of a chapter's drips (plan §4.7, E1). Before a drop lands its shadow grows on the ground: that is
 * how the way through is read. Under an awning the drop hangs at its scallop's tip and swells meanwhile, then
 * falls. Where it lands, a ring of water widens and fades, and a few beads jump up out of it. Each part is one
 * draw, drawn only while one of its own is to be seen.
 */
export function createRain(chapter: ChapterData) {
  const count = chapter.drips?.length ?? 0;
  const size = Math.max(1, count);
  const group = new Group();
  const water = new MeshStandardMaterial({ color: '#a9d8f5', roughness: 0.08, transparent: true, opacity: 0.85 });
  const drops = new InstancedMesh(dropShape(), water, size);
  const shadows = new InstancedMesh(
    new CircleGeometry(0.5, 20),
    new MeshBasicMaterial({ color: '#10202c', transparent: true, opacity: 0.4, depthWrite: false }),
    size,
  );
  const rings = new InstancedMesh(
    new RingGeometry(0.8, 1, 28),
    new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending }),
    size,
  );
  const beads = new InstancedMesh(new SphereGeometry(0.05, 6, 4), water, size * SPLASH.beads);
  drops.name = 'rain-drops';
  shadows.name = 'rain-shadows';
  rings.name = 'rain-rings';
  beads.name = 'rain-beads';
  for (const mesh of [drops, shadows, rings, beads]) {
    mesh.count = mesh === beads ? count * SPLASH.beads : count;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  const tint = new Color(0, 0, 0);
  for (let i = 0; i < size; i++) rings.setColorAt(i, tint);
  rings.instanceColor!.setUsage(DynamicDrawUsage);
  shadows.renderOrder = 1;
  rings.renderOrder = 1;
  group.add(shadows, rings, drops, beads);

  const tips = hanging(chapter);
  // How high each drop's foot is as it begins to fall: under a tip it hangs from it by its point. The
  // simulation keeps the time, and the drop is drawn falling from there.
  const fall = (chapter.drips ?? []).map((drip, i) => {
    const tip = tips[i] ?? null;
    return tip === null ? DROP_FROM : tip - DROP.top - DROP.foot - drip.at.y;
  });
  // The shadow's growth when the drop lets go of its tip: from then on it falls.
  const letGo = 1 - DROP_FALL / DROP_WARNING;
  // Each drip's height in the last frame, and how long ago its last drop landed.
  const last = new Float32Array(size).fill(-1);
  const since = new Float32Array(size).fill(SPLASH.time);
  const place = new Object3D();

  function update(drips: readonly { x: number; y: number; shadow: number; height: number }[], dt: number): void {
    let seen = false;
    let splashing = false;
    for (const [i, drip] of drips.entries()) {
      // A drop that was in the air and is not any more has landed: its splash begins.
      since[i] = last[i]! >= 0 && drip.height < 0 ? 0 : Math.min(SPLASH.time, since[i]! + dt);
      last[i] = drip.height;

      // The shadow lies on the ground.
      place.position.set(drip.x, drip.y + 0.015, 0);
      place.rotation.set(-Math.PI / 2, 0, 0);
      place.scale.setScalar(drip.shadow);
      place.updateMatrix();
      shadows.setMatrixAt(i, place.matrix);

      // The drop: falling, a little drawn out, or hanging from its tip by its point while it swells.
      const from = fall[i] ?? DROP_FROM;
      const hangs = (tips[i] ?? null) !== null;
      const swell = hangs && drip.height < 0 && drip.shadow > 0 ? 0.25 + 0.75 * smooth(drip.shadow / letGo) : 0;
      place.rotation.set(0, 0, 0);
      if (drip.height >= 0) {
        place.position.set(drip.x, drip.y + (drip.height * from) / DROP_FROM + DROP.foot, 0);
        place.scale.set(1, 1.12, 1);
      } else {
        place.position.set(drip.x, drip.y + from + DROP.foot + DROP.top * (1 - swell), 0);
        place.scale.setScalar(swell);
      }
      seen ||= drip.height >= 0 || swell > 0;
      place.updateMatrix();
      drops.setMatrixAt(i, place.matrix);

      // The splash: a ring that widens and fades, and beads thrown up and out that fall back.
      const t = since[i]!;
      const on = t < SPLASH.time;
      const k = t / SPLASH.time;
      splashing ||= on;
      place.position.set(drip.x, drip.y + 0.02, 0);
      place.rotation.set(-Math.PI / 2, 0, 0);
      place.scale.setScalar(on ? 0.12 + (SPLASH.ring - 0.12) * (1 - (1 - k) ** 2) : 0);
      place.updateMatrix();
      rings.setMatrixAt(i, place.matrix);
      rings.setColorAt(i, tint.copy(GLINT).multiplyScalar(on ? (1 - k) ** 2 : 0));
      place.rotation.set(0, 0, 0);
      for (let b = 0; b < SPLASH.beads; b++) {
        const out = b / (SPLASH.beads - 1) - 0.5;
        const up = (2.3 - Math.abs(out) * 1.2) * t - 7 * t * t;
        place.position.set(drip.x + out * 2.4 * t, drip.y + 0.04 + up, (b % 2 === 0 ? -0.4 : 0.4) * t);
        place.scale.setScalar(on && up > -0.02 ? 1 - 0.5 * k : 0);
        place.updateMatrix();
        beads.setMatrixAt(i * SPLASH.beads + b, place.matrix);
      }
    }
    drawnWhile(drops, seen);
    drawnWhile(shadows, drips.some((drip) => drip.shadow > 0));
    drawnWhile(rings, splashing);
    drawnWhile(beads, splashing);
    for (const mesh of [drops, shadows, rings, beads]) mesh.instanceMatrix.needsUpdate = true;
    rings.instanceColor!.needsUpdate = true;
  }
  return { group, drops, shadows, rings, beads, update };
}
