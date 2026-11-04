import { Color, DynamicDrawUsage, InstancedMesh, Object3D, type BufferGeometry, type Material } from 'three';
import type { ChapterData } from '../../../sim/types';
import type { ExtraFrame } from '../../extensions';
import { drawnWhile } from '../../idle';
import { sequence } from '../../dressing/kit';

/** How many leaves can be in the air at once, on High; Mid has 60 % of them, and Low none. */
export const WHIRL = 36;

/** What lies on each place's ground to be kicked up: birch leaves, needles, straw, lichen crumbs. Never gold. */
const LITTER: Record<string, string[]> = {
  forest: ['#a39a4e', '#8a7046', '#7f6a48', '#9aa04c'],
  garden: ['#b4ac4c', '#9aa64a', '#a8a45a'],
  village: ['#b4ac4c', '#a89a58', '#9a8e5a'],
  bog: ['#b8a46a', '#9a9a5a', '#a28e62'],
  mountain: ['#c9c4b0', '#a8a07a', '#8f8a70'],
  dusk: ['#8a8aa0', '#7a7a90'],
};

/**
 * Leaves kicked up from the ground when he runs, lands or turns: a few at a time, from one batch of instances,
 * that tumble and settle where he kicked them up, and fade there. None with reduced motion, none indoors, and
 * none on Low (what draws them is rich).
 */
export function whirl(chapter: ChapterData, geometry: BufferGeometry, material: Material) {
  const inks = chapter.place ? LITTER[chapter.place] : undefined;
  if (!inks) return null;
  const mesh = new InstancedMesh(geometry, material, WHIRL);
  mesh.name = 'flora-whirl';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.userData.rich = true;
  const next = sequence(17);
  const tint = new Color();
  for (let i = 0; i < WHIRL; i++) mesh.setColorAt(i, tint.set(inks[i % inks.length]!).multiplyScalar(0.85 + next() * 0.3));
  // Each leaf: where it is, how it moves, how it is turned and spins, its age and its life, and the floor it settles on.
  const leaves = Array.from({ length: WHIRL }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, a: 0, b: 0, spin: 0, age: 0, life: 0, floor: 0, size: 0 }));
  let alive = 0;
  let owed = 0;
  let was = { grounded: true, vy: 0, facing: 1 as number };
  const one = new Object3D();
  drawnWhile(mesh, false);

  function kick(frame: ExtraFrame, count: number, up: number, back: number): void {
    const room = frame.tier === 'high' ? WHIRL : Math.round(WHIRL * 0.6);
    for (let k = 0; k < count && alive < room; k++) {
      const leaf = leaves[alive++]!;
      const away = (next() - 0.5) * 2;
      Object.assign(leaf, {
        x: frame.x + away * 0.3, y: frame.y + 0.03, z: -0.1 - next() * 0.5,
        vx: -Math.sign(frame.vx ?? 0) * back * (0.4 + next()) + away * 0.8, vy: up * (0.6 + next() * 0.7), vz: (next() - 0.5) * 1.4,
        a: next() * 6.28, b: next() * 6.28, spin: (next() - 0.5) * 9, age: 0, life: 1.6 + next() * 1.2, floor: frame.y + 0.02, size: 0.09 + next() * 0.07,
      });
    }
  }

  return {
    mesh,
    update(frame: ExtraFrame): void {
      const grounded = frame.grounded ?? true;
      const off = frame.still || frame.tier === 'low' || frame.riding || (chapter.surfaces ?? []).some((s) => s.kind === 'wood' && frame.x >= s.from && frame.x <= s.to);
      if (off) {
        if (alive > 0 || mesh.visible) drawnWhile(mesh, false);
        alive = mesh.count = 0;
        owed = 0;
      } else if ((frame.mode ?? 'free') === 'free') {
        const speed = Math.abs(frame.vx ?? 0);
        if (grounded && speed > 2.6) {
          owed += frame.dt * 6 * Math.min(1, (speed - 2.4) / 1.1);
          if (owed >= 1) kick(frame, Math.floor(owed), 1.6, 1.2);
          owed %= 1;
        }
        if (grounded && !was.grounded && was.vy < -4) kick(frame, 6, 2.2, 0.3);
        if (grounded && (frame.facing ?? 1) !== was.facing && speed > 0.6) kick(frame, 4, 1.4, -0.8);
      }
      was = { grounded, vy: frame.vy ?? 0, facing: frame.facing ?? 1 };
      if (off) return;
      const dt = Math.min(frame.dt, 0.05);
      for (let i = 0; i < alive; i++) {
        const leaf = leaves[i]!;
        leaf.age += dt;
        if (leaf.age > leaf.life) {
          // Its place goes to the last that is still alive.
          leaves[i] = leaves[--alive]!;
          leaves[alive] = leaf;
          i--;
          continue;
        }
        if (leaf.y > leaf.floor) {
          const drag = Math.exp(-2.2 * dt);
          leaf.vx = leaf.vx * drag + Math.sin(leaf.age * 5 + i) * 1.2 * dt;
          leaf.vz *= drag;
          leaf.vy = leaf.vy * drag - 4.5 * dt;
          leaf.x += leaf.vx * dt;
          leaf.y = Math.max(leaf.floor, leaf.y + leaf.vy * dt);
          // Never out in front of the path: they stay about his feet and behind them.
          leaf.z = Math.min(0.1, leaf.z + leaf.vz * dt);
          leaf.a += leaf.spin * dt;
          leaf.b += leaf.spin * 0.7 * dt;
        } else leaf.b = Math.PI / 2;
        // It lies down flat when it has settled, and fades (shrinks) in its last half second.
        const fade = Math.min(1, (leaf.life - leaf.age) / 0.5, leaf.age / 0.08);
        one.position.set(leaf.x, leaf.y, leaf.z);
        one.rotation.set(leaf.b, leaf.a, 0);
        one.scale.setScalar(leaf.size * fade);
        one.updateMatrix();
        mesh.setMatrixAt(i, one.matrix);
      }
      mesh.count = alive;
      if (alive > 0) mesh.instanceMatrix.needsUpdate = true;
      if (mesh.visible !== alive > 0) drawnWhile(mesh, alive > 0);
    },
  };
}
