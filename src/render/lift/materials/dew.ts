import {
  Color, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, SphereGeometry, Vector3, type Material,
} from 'three';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../extensions';
import { KIT, heightAt, sequence } from '../../dressing/kit';
import { sway } from '../../wind';
import { PALED, dewy } from './surface';

/**
 * Dew (docs/visual-upgrade.md): tiny bright beads on the tips of the grass and on the leaves of a morning out of
 * doors, and drops on the windows of the morning after the storm. Each catches the low sun now and then, slowly:
 * a bead brightens and dims over five to ten seconds, never in a flash, and stands still with reduced motion.
 *
 * One instanced mesh for the whole chapter, on the rich layer (Low draws none), counted down to 60 % on Mid. A
 * bead on a blade sways with it: the wind's own chunk moves it, by as much as the blade's tip moves (`dewBend`).
 * The lawn's own dew (KIT.dew) twinkles the same way, with no new draw.
 */

/** How many of a chapter's beads each tier shows. */
const SHARE = { low: 0, mid: 0.6, high: 1 } as const;
/** How far a blade's tip moves with the wind, as a share of its height (KIT.grass and KIT.lawn sway by 0.07). */
const BLADE = 0.07;
const MAX = 2400;
/** The colour of a drop, and what the sun's light in it is paled towards: never gold (docs/visual-upgrade.md). */
export const DEW = '#e8f4ff';
const WHITE = new Color(1, 1, 1);

const TWINKLE = /* glsl */ `
  vec3 dewAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float dewPhase = fract(sin(dot(dewAt, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float dewWave = 0.5 + 0.5 * sin(dewTime * (0.6 + 0.6 * dewPhase) + dewPhase * 40.0);
  dewGlow = dewWave * dewWave * dewWave * dewWave;
`;

/** The beads' own shading: a drop darker at its rim than at its middle, and the sun's point in it on the side it comes from. */
function beadMaterial(time: { value: number }, sun: { value: Color }): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: DEW });
  // The whole bead moves as a blade's tip does, by `dewBend` of the wind's push.
  sway(material, 0, 0, 1, 1);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:lift-dew-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, { dewTime: time, dewSun: sun });
    shader.vertexShader = `attribute float dewBend; uniform float dewTime; varying float dewGlow; varying vec3 dewNormal;\n` + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 dewRest = transformed;')
      .replace('#include <morphtarget_vertex>', `transformed = dewRest + (transformed - dewRest) * dewBend;\n${TWINKLE}
        dewNormal = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * position);
        #include <morphtarget_vertex>`);
    shader.fragmentShader = `uniform vec3 dewSun; varying float dewGlow; varying vec3 dewNormal;\n` + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
      vec3 dewN = normalize(dewNormal);
      float dewPoint = pow(max(dot(dewN, normalize(vec3(-0.45, 0.55, 0.7))), 0.0), 14.0);
      outgoingLight = outgoingLight * (0.32 + 0.4 * dewN.z) + dewSun * (0.25 + 0.75 * dewGlow) * (0.2 + 1.6 * dewPoint);
      #include <opaque_fragment>`);
  };
  return material;
}

/** The lawn's dew (KIT.dew), which lies on the ground and hangs in the grass: it twinkles as the beads do. */
function twinkle(material: Material, time: { value: number }, sun: { value: Color }): void {
  if (material.userData.liftDew) return;
  material.userData.liftDew = true;
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:lift-dew-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, { dewTime: time, dewSun: sun });
    shader.vertexShader = 'uniform float dewTime; varying float dewGlow;\n' + shader.vertexShader
      .replace('#include <project_vertex>', `#ifdef USE_INSTANCING\n${TWINKLE}\n#else\ndewGlow = 0.0;\n#endif\n#include <project_vertex>`);
    shader.fragmentShader = 'uniform vec3 dewSun; varying float dewGlow;\n' + shader.fragmentShader
      .replace('#include <opaque_fragment>', 'outgoingLight += dewSun * dewGlow * 0.5;\n#include <opaque_fragment>');
  };
  material.needsUpdate = true;
}

/** Where the beads go: on the tips of the taller blades behind the path, on some leaves, and on the panes of a morning window. */
export function dewPlaces(context: ExtraContext): { at: Vector3; size: number; bend: number; flat: boolean }[] {
  const { chapter, dressing } = context;
  const places: { at: Vector3; size: number; bend: number; flat: boolean }[] = [];
  const next = sequence(chapter.id.length * 131 + 7);
  const m = new Matrix4();
  const tip = new Vector3();
  if (dressing && dewy(chapter)) {
    dressing.updateMatrixWorld(true);
    dressing.traverse((object) => {
      const mesh = object as InstancedMesh;
      if (!mesh.isInstancedMesh) return;
      const blades = mesh.material === KIT.grass || mesh.material === KIT.lawn;
      const leaves = mesh.material === KIT.leaf || mesh.material === KIT.clover;
      if (!blades && !leaves) return;
      for (let i = 0; i < mesh.count; i++) {
        if (next() > (blades ? 0.1 : 0.18)) continue;
        mesh.getMatrixAt(i, m);
        m.premultiply(mesh.matrixWorld);
        tip.set(0, blades ? 0.97 : 1.1, blades ? 0.27 : 0).applyMatrix4(m);
        // Only behind the path, where nothing new stands in his way.
        if (tip.z > -0.8) continue;
        const tall = new Vector3().setFromMatrixColumn(m, 1).length();
        places.push({ at: tip.clone(), size: 0.016 + next() * 0.014, bend: blades ? BLADE * tall : 0, flat: false });
      }
    });
  }
  // The morning after the storm: the rain's last drops on the windows, in the sun.
  if (chapter.id === 'morgonen' && chapter.house && chapter.place === 'home') {
    for (const x of chapter.house.windows) {
      const y = heightAt(chapter, x) + 6;
      for (let k = 0; k < 46; k++) {
        const dx = (next() - 0.5) * 4.8, dy = (next() - 0.5) * 4.9;
        // Not on the frame's cross.
        if (Math.abs(dx) < 0.2 || Math.abs(dy) < 0.2) continue;
        places.push({ at: new Vector3(x + dx, y + dy - next() * next() * 0.6, -8.86), size: 0.035 + next() * next() * 0.07, bend: 0, flat: true });
      }
    }
  }
  // Shuffled, so that the first share of them is spread over the chapter as all of them are.
  for (let i = places.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [places[i], places[j]] = [places[j]!, places[i]!];
  }
  return places.slice(0, MAX);
}

export function createDew(context: ExtraContext): ViewExtra | null {
  const time = { value: 0 };
  const sun = { value: new Color() };
  if (KIT?.dew && context.dressing && dewy(context.chapter)) twinkle(KIT.dew, time, sun);
  const places = dewPlaces(context);
  if (!places.length) return null;
  const geometry = new SphereGeometry(1, 6, 4);
  const bend = new Float32Array(places.length);
  const mesh = new InstancedMesh(geometry, beadMaterial(time, sun), places.length);
  const place = new Object3D();
  for (const [i, dew] of places.entries()) {
    place.position.copy(dew.at);
    place.scale.set(dew.size, dew.flat ? dew.size * 1.25 : dew.size, dew.flat ? dew.size * 0.4 : dew.size);
    place.updateMatrix();
    mesh.setMatrixAt(i, place.matrix);
    bend[i] = dew.bend;
  }
  geometry.setAttribute('dewBend', new InstancedBufferAttribute(bend, 1));
  mesh.computeBoundingSphere();
  mesh.name = 'lift-dew';
  mesh.userData.rich = true;
  context.scene.add(mesh);
  let clock = 0;
  return {
    update(frame: ExtraFrame) {
      if (!frame.still) clock += frame.dt;
      time.value = clock;
      mesh.count = Math.round(places.length * SHARE[frame.tier]);
      const s = context.sun;
      // The sun's light in the drop: its colour, paled, as bright as it is now, and nothing at night.
      sun.value.copy(s.color).lerp(WHITE, PALED).multiplyScalar(Math.min(1.6, s.intensity * 0.45) * (1 - (frame.darkness ?? 0)));
    },
  };
}
