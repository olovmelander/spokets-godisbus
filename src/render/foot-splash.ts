import { DynamicDrawUsage, InstancedMesh, Matrix4, MeshStandardMaterial, SphereGeometry } from 'three';

/**
 * Splashes at Elof's feet on wet ground (the graphics pass of 7 November 2026): in the rain, each step he runs throws
 * up a few drops, and a landing throws up more. One instanced mesh of beads that fly, fall back and are gone in half
 * a second. With less motion there are none.
 */
const BEADS = 40;
const LIFE = 0.45;
const GRAVITY = 14;
/** How far he goes between two splashing steps, at size 1, in EL. */
const STEP = 0.42;

export function createFootSplash() {
  const mesh = new InstancedMesh(
    new SphereGeometry(0.03, 6, 4),
    new MeshStandardMaterial({ color: '#d4e4f0', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.75, depthWrite: false }),
    BEADS,
  );
  mesh.name = 'foot-splash';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  const none = new Matrix4().makeScale(0, 0, 0), at = new Matrix4();
  for (let i = 0; i < BEADS; i++) mesh.setMatrixAt(i, none);
  const beads = Array.from({ length: BEADS }, () => ({ age: LIFE, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, floor: 0, size: 1 }));
  let next = 0, travelled = 0, lastX: number | null = null, wasGrounded = true, falling = 0, seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /** `count` drops from where his foot is, thrown up at about `speed`, a little back from the way he goes. */
  function burst(x: number, y: number, count: number, speed: number, back: number, size: number): void {
    for (let k = 0; k < count; k++) {
      const b = beads[next++ % BEADS]!;
      b.age = 0;
      b.x = x + (random() - 0.5) * 0.18 * size;
      b.y = y + 0.02;
      b.z = 0.1 + (random() - 0.5) * 0.3 * size;
      b.vx = ((random() - 0.5) * 1.3 - back * 0.7) * size;
      b.vy = speed * (0.55 + random() * 0.6) * Math.sqrt(size);
      b.vz = (random() - 0.5) * 1.1 * size;
      b.floor = y;
      b.size = size * (0.7 + random() * 0.6);
    }
  }

  return {
    mesh,
    /**
     * `wet` is whether the ground is wet where he is; `x`, `y` where he stands; `walking` whether he is on his feet and
     * going; `vy` his speed up; `facing` the way he goes; `tall` his size.
     */
    update(wet: boolean, x: number, y: number, grounded: boolean, walking: boolean, vy: number, facing: number, tall: number, dt: number, calm: boolean): void {
      const moved = lastX === null ? 0 : Math.abs(x - lastX);
      lastX = x;
      if (wet && !calm && dt > 0) {
        if (walking && moved < 1) {
          travelled += moved;
          if (travelled > STEP * tall) { travelled = 0; burst(x, y, 3, 1.6, facing, tall); }
        }
        if (grounded && !wasGrounded && falling > 2) burst(x, y, Math.min(9, 4 + Math.round(falling / 3)), 1.4 + falling * 0.12, 0, tall);
      }
      falling = grounded ? 0 : Math.max(falling, -vy);
      wasGrounded = grounded;
      let any = false;
      for (const [i, b] of beads.entries()) {
        if (b.age >= LIFE) { mesh.setMatrixAt(i, none); continue; }
        any = true;
        b.age += dt;
        b.vy -= GRAVITY * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        // Back on the ground it is gone.
        if (b.y < b.floor) b.age = LIFE;
        const s = b.age >= LIFE ? 0 : b.size * (1 - 0.5 * (b.age / LIFE));
        at.makeScale(s, s * (1 + Math.min(1.5, Math.abs(b.vy) * 0.12)), s).setPosition(b.x, b.y, b.z);
        mesh.setMatrixAt(i, at);
      }
      mesh.visible = any;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
