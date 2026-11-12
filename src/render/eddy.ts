import {
  BoxGeometry, CanvasTexture, CircleGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, SRGBColorSpace,
} from 'three';
import type { ChapterData } from '../sim/types';

/**
 * Granskogen's eddy, the virvel the ghost is pulled out of (Olov, 12 November 2026: "När man ska dra upp spöket ur
 * virveln ser lite konstigt ut. Dels ser det ut som att man kan gå om man hoppar ner"). The brook's dark tea-coloured
 * water alone read as a dry pit. Here the water turns: pale foam in a spiral that wheels round, a few spruce needles
 * going round with it, and the leaf boat with the ghost on it floats in its surface and turns slowly in the current.
 * The simulation is untouched: this is the picture of a stretch of `water` marked `eddy`.
 */

/** How high the leaf boat rides in the surface, over where the simulation has its top, while it turns in the eddy. */
const FLOAT = 0.07;
/** Turns a second: the foam, and the needles at the rim (those nearer the middle go faster, as water does). */
const SPIN = 0.75;
const NEEDLES = 7;

function foam(): CanvasTexture {
  const size = 256, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const mid = size / 2;
  g.translate(mid, mid);
  // A faint lighter body of turning water under the foam, darker at the very middle where it goes down.
  const body = g.createRadialGradient(0, 0, 0, 0, 0, mid);
  body.addColorStop(0, 'rgba(20,14,8,0.55)');
  body.addColorStop(0.18, 'rgba(120,96,56,0.22)');
  body.addColorStop(0.75, 'rgba(150,124,78,0.16)');
  body.addColorStop(1, 'rgba(150,124,78,0)');
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, mid, 0, Math.PI * 2);
  g.fill();
  // Four arms of foam, each a spiral drawn in from the rim, thick and pale outside and thin towards the middle.
  g.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    const start = (arm / 4) * Math.PI * 2;
    for (let i = 0; i < 60; i++) {
      const k0 = i / 60, k1 = (i + 1) / 60;
      const at = (k: number) => {
        const r = mid * (0.94 - 0.8 * k);
        const a = start + k * Math.PI * 1.9;
        return [Math.cos(a) * r, Math.sin(a) * r] as const;
      };
      const [x0, y0] = at(k0), [x1, y1] = at(k1);
      g.strokeStyle = `rgba(238,228,204,${(0.75 * (1 - k0) * Math.min(1, k0 * 6 + 0.25)).toFixed(3)})`;
      g.lineWidth = 2 + 9 * (1 - k0);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
  }
  // Flecks of foam between the arms.
  let seed = 7;
  const next = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const r = mid * (0.25 + 0.7 * next()), a = next() * Math.PI * 2;
    g.fillStyle = `rgba(240,232,210,${(0.25 + 0.35 * next()).toFixed(3)})`;
    g.beginPath();
    g.ellipse(Math.cos(a) * r, Math.sin(a) * r, 1.5 + 2.5 * next(), 1 + next(), a + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
  }
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  return map;
}

export interface Eddy {
  readonly group: Group;
  /**
   * Turns the foam and floats the leaf the ghost sits on, while it rests in the eddy. Returns how much higher the leaf
   * is drawn than the simulation has it, for the ghost standing on it.
   */
  update(movers: readonly { x: number; y: number; stop?: number; t?: number }[], meshes: readonly Object3D[], clock: number, still: boolean): number;
}

export function createEddy(chapter: ChapterData): Eddy | null {
  const pools = (chapter.water ?? []).filter((pool) => pool.eddy);
  if (!pools.length) return null;
  const group = new Group();
  group.name = 'eddy';
  const map = foam();
  const material = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: DoubleSide, color: '#f2e8d2' });
  const needleShape = new BoxGeometry(0.2, 0.012, 0.028);
  const needleMaterial = new MeshStandardMaterial({ color: '#6b4a28', roughness: 0.9 });
  const discs: { mesh: Mesh; needles: InstancedMesh; x: number; y: number; z: number; rx: number; rz: number; from: number; to: number }[] = [];
  for (const pool of pools) {
    // Deeper than wide, back into the brook: the foam shows behind the leaf boat lying across it, too.
    const rx = (pool.to - pool.from) / 2 - 0.05, rz = 1.7;
    const x = (pool.from + pool.to) / 2, z = -0.75, y = pool.y + 0.012;
    const mesh = new Mesh(new CircleGeometry(1, 48), material);
    mesh.name = 'eddy-foam';
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(rx, rz, 1);
    mesh.position.set(x, y, z);
    // After the water, which is drawn in the scene's own order: the foam lies on its surface.
    mesh.renderOrder = 5;
    const needles = new InstancedMesh(needleShape, needleMaterial, NEEDLES);
    needles.name = 'eddy-needles';
    needles.frustumCulled = false;
    group.add(mesh, needles);
    discs.push({ mesh, needles, x, y, z, rx, rz, from: pool.from, to: pool.to });
  }
  const place = new Object3D();
  const seats = new Set((chapter.ghost ?? []).flatMap((perch) => perch.on ? [perch.on] : []));
  const seatIndex = (chapter.movers ?? []).map((mover) => seats.has(mover.id));

  return {
    group,
    update(movers, meshes, clock, still) {
      const t = still ? 0 : clock;
      for (const disc of discs) {
        disc.mesh.rotation.z = -t * SPIN;
        for (let i = 0; i < NEEDLES; i++) {
          const r = 0.45 + 0.75 * ((i * 0.618) % 1);
          // Nearer the middle, faster round.
          const a = i * 2.4 - t * SPIN * (1.3 / r);
          place.position.set(disc.x + Math.cos(a) * r * disc.rx / 1.3, disc.y + 0.006, disc.z + Math.sin(a) * r * disc.rz / 1.3);
          place.rotation.set(0, -a, 0);
          place.updateMatrix();
          disc.needles.setMatrixAt(i, place.matrix);
        }
        disc.needles.instanceMatrix.needsUpdate = true;
      }
      let lift = 0;
      for (const [i, mover] of movers.entries()) {
        const mesh = meshes[i];
        if (!seatIndex[i] || !mesh) continue;
        const disc = discs.find((one) => mover.x > one.from && mover.x < one.to);
        // Resting down in the eddy: afloat, turning a little to and fro in the current, and bobbing.
        const down = disc && mover.stop === 0 && (mover.t ?? 1) >= 1;
        // Pulled out, it comes straight again as it rises.
        if (!down) { mesh.rotation.y *= 0.85; continue; }
        lift = FLOAT + Math.sin(t * 1.7) * 0.015;
        mesh.position.y += lift;
        mesh.rotation.y = Math.sin(t * 0.6) * 0.22;
      }
      return lift;
    },
  };
}
