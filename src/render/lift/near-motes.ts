import {
  AdditiveBlending, Color, DataTexture, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, LinearFilter, MeshBasicMaterial, Object3D,
  PlaneGeometry, type PerspectiveCamera,
} from 'three';
import { sequence } from '../dressing/kit';
import { drawnWhile } from '../idle';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';

/**
 * Pollen and dust drifting close in front of the lens (the graphics pass of 6 November 2026; Olov: "mer likt ...
 * Unravel"). In Unravel's pictures a few specks float between the camera and the play, so near and so out of focus
 * that each is a soft, round disc of light. They float here a few EL in front of the path, at their own pace, turn
 * slowly in the air, and catch the day's light; by night and in the storm there are none.
 *
 * Mid and High only (../rich.ts): one draw, a dozen soft discs that add light, nothing that writes depth.
 * With less motion asked for, they hang still.
 */
export function installNearMotes(): void {
  PACK.lifts.push(createNearMotes);
}

/** Where the specks float: the places with sun and air. Not the village street, where they read as dust on the lens. */
const PLACES = new Set(['forest', 'garden', 'bog', 'mountain', 'home']);
const COUNT = 12;
/** How far in front of the path they float, in EL: between the lens and the play. */
const NEAR = [3.2, 6.2] as const;

/** A lens's out-of-focus disc: even across, a little brighter at its rim, with a soft edge. */
function bokehDisc(size = 64): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
    const edge = Math.min(1, Math.max(0, (1 - r) / 0.12));
    const rim = 0.75 + 0.25 * Math.min(1, Math.max(0, (r - 0.55) / 0.35));
    data.set([255, 255, 255, Math.round(255 * edge * edge * (3 - 2 * edge) * rim)], (y * size + x) * 4);
  }
  const texture = new DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createNearMotes({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (!chapter.place || !PLACES.has(chapter.place) || chapter.storm) return null;
  const group = new Group();
  group.name = 'near-motes';
  group.userData.rich = true;
  const material = new MeshBasicMaterial({
    map: bokehDisc(), color: new Color('#fff0cc'), transparent: true, opacity: 1, depthWrite: false,
    blending: AdditiveBlending, fog: false,
  });
  const discs = new InstancedMesh(new PlaneGeometry(1, 1), material, COUNT);
  discs.instanceMatrix.setUsage(DynamicDrawUsage);
  discs.frustumCulled = false;
  // Each its own brightness: a few catch the light more.
  const shade = new Float32Array(COUNT * 3);
  // Made with the mesh, so that its program is the same from the first frame on.
  discs.instanceColor = new InstancedBufferAttribute(shade, 3);
  discs.instanceColor.setUsage(DynamicDrawUsage);
  group.add(discs);
  scene.add(group);
  const next = sequence(97);
  const specks = Array.from({ length: COUNT }, () => ({
    across: next(), up: next(), z: NEAR[0] + (NEAR[1] - NEAR[0]) * next(), size: 0.07 + 0.12 * next(),
    drift: 0.05 + 0.1 * next(), seed: next() * 50, light: 0.16 + 0.28 * next(),
  }));
  const at = new Object3D();
  let time = 0;
  return {
    update(frame: ExtraFrame) {
      const camera = frame.camera as PerspectiveCamera;
      if (!frame.still) time += frame.dt;
      // Only by day: in the dark there is no light for them to catch.
      const day = 1 - Math.min(1, Math.max(0, ((frame.darkness ?? 0) - 0.2) / 0.4));
      if (day <= 0.01) { drawnWhile(group, false); return; }
      const tall = Math.tan(((camera.fov ?? 30) * Math.PI) / 360);
      for (const [i, s] of specks.entries()) {
        const away = camera.position.z - s.z;
        const halfHigh = tall * away;
        const halfWide = halfHigh * (camera.aspect ?? 1.6);
        // Fixed in the air, so that they slide past as he moves: wrapped round the picture's width.
        const span = halfWide * 2.4;
        const wx = s.across * span + Math.sin(time * s.drift + s.seed) * 0.4 + time * s.drift * 0.6;
        const left = camera.position.x - span / 2;
        const x = left + ((((wx - left) % span) + span) % span);
        const y = camera.position.y + (s.up * 2 - 1) * halfHigh * 0.95 + Math.sin(time * s.drift * 1.3 + s.seed * 2) * 0.3;
        at.position.set(x, y, s.z);
        at.rotation.set(0, 0, 0);
        at.scale.setScalar(s.size * (1 + 0.08 * Math.sin(time * 0.7 + s.seed)));
        at.updateMatrix();
        discs.setMatrixAt(i, at.matrix);
        // A speck catches the light as it turns.
        const glint = s.light * day * (0.6 + 0.4 * Math.sin(time * 0.9 + s.seed * 3));
        shade.set([glint, glint * 0.95, glint * 0.8], i * 3);
      }
      discs.instanceColor!.needsUpdate = true;
      discs.instanceMatrix.needsUpdate = true;
      drawnWhile(group, true);
    },
  };
}
