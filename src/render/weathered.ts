import type { Material, MeshStandardMaterial, Object3D } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * The Blender kit's outdoor things seen close (the graphics pass of 6 November 2026; Olov: "mycket mycket snyggare
 * överallt"): the bridge, the stairs, the fence, the slide, the rowboat, the stones and stumps. Their colours are
 * painted on corners far apart, so close to the lens they read as smooth plastic. This lays a little weather on
 * them from where they stand, from all three sides so that nothing is stretched: mottling a hand's breadth across,
 * a fine grain, and their lower parts a little darker, where rain and soil reach. Mid and High (`CLOSE_DETAIL`).
 */
const patched = new WeakSet<Material>();

export function weathered(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as { isMesh?: boolean; material?: Material | Material[] };
    if (!mesh.isMesh || !mesh.material) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const standard = material as MeshStandardMaterial;
      if (!standard.isMeshStandardMaterial || patched.has(standard) || standard.transparent) continue;
      patched.add(standard);
      const before = standard.onBeforeCompile;
      const key = standard.customProgramCacheKey.bind(standard);
      standard.customProgramCacheKey = () => `${key()}:weathered-v1`;
      standard.onBeforeCompile = (shader, renderer) => {
        before.call(standard, shader, renderer);
        shader.uniforms.closeDetail = CLOSE_DETAIL;
        shader.vertexShader = 'varying vec3 weatherAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
          vec4 weatherWorld = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            weatherWorld = instanceMatrix * weatherWorld;
          #endif
          weatherAt = (modelMatrix * weatherWorld).xyz;
          #include <project_vertex>`);
        shader.fragmentShader = /* glsl */ `varying vec3 weatherAt;
          uniform float closeDetail;
          float weatherHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          float weatherNoise(vec3 p) {
            vec3 i = floor(p), f = fract(p);
            vec3 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(weatherHash(i), weatherHash(i + vec3(1, 0, 0)), u.x), mix(weatherHash(i + vec3(0, 1, 0)), weatherHash(i + vec3(1, 1, 0)), u.x), u.y),
              mix(mix(weatherHash(i + vec3(0, 0, 1)), weatherHash(i + vec3(1, 0, 1)), u.x), mix(weatherHash(i + vec3(0, 1, 1)), weatherHash(i + vec3(1, 1, 1)), u.x), u.y), u.z);
          }
          ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
          #include <normal_fragment_maps>
          if (closeDetail > 0.5) {
            float weatherPixel = length(fwidth(weatherAt));
            float weatherNear = 1.0 - smoothstep(0.02, 0.08, weatherPixel);
            float mottle = weatherNoise(weatherAt * 1.7) * 0.6 + weatherNoise(weatherAt * 4.3 + 7.0) * 0.4;
            diffuseColor.rgb *= 0.9 + 0.2 * mottle;
            diffuseColor.rgb *= 1.0 + (weatherNoise(weatherAt * 23.0) - 0.5) * 0.16 * weatherNear;
            // Darker low down, where rain splashes and soil reaches, within an EL of the ground's usual height.
            float low = 1.0 - smoothstep(-0.5, 1.2, weatherAt.y - floor(weatherAt.y / 400.0) * 400.0 + weatherNoise(weatherAt * 0.8) * 0.6);
            diffuseColor.rgb *= 1.0 - 0.12 * low;
          }`);
      };
      standard.needsUpdate = true;
    }
  });
}
