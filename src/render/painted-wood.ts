import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * Painted wood seen close (the graphics pass of 6 November 2026; Olov: "husen ... mycket snyggare"): on what faces
 * the street, upright boards' grain under the paint, the paint a little uneven and worn paler on the edges of the
 * grain, and the foot of the wall darker where the rain splashes up. Mid and High only (`CLOSE_DETAIL`).
 */
export const PAINTED_WOOD = /* glsl */ `
  float woodHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float woodNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(woodHash(i), woodHash(i + vec2(1.0, 0.0)), u.x), mix(woodHash(i + vec2(0.0, 1.0)), woodHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  vec3 paintedWood(vec3 colour, vec3 at, vec3 up) {
    float facing = smoothstep(0.6, 0.9, abs(up.z));
    if (facing <= 0.0) return colour;
    float pixel = length(fwidth(at.xy));
    float near = 1.0 - smoothstep(0.02, 0.08, pixel);
    vec3 painted = colour;
    // The grain under the paint, running up the boards, and the paint's own unevenness.
    float grain = woodNoise(vec2(at.x * 38.0, at.y * 1.4));
    painted *= 1.0 + (grain - 0.5) * 0.14 * near;
    painted *= 0.94 + 0.12 * woodNoise(at.xy * vec2(1.3, 0.6) + 3.0);
    // Worn paler where the grain stands up, here and there.
    float worn = smoothstep(0.72, 0.9, grain) * smoothstep(0.55, 0.8, woodNoise(at.xy * 0.8 + 9.0)) * near;
    painted = mix(painted, painted * 1.18 + 0.02, 0.5 * worn);
    // The foot of the wall darker, where rain splashes up.
    painted *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 1.6, at.y - floor(at.y / 200.0) * 200.0)) * (0.7 + 0.3 * woodNoise(at.xz * 3.0));
    return mix(colour, painted, facing);
  }
`;


const patched = new WeakSet<MeshStandardMaterial>();

/** Gives a building's material painted wood on what faces the street (Äventyr 2's houses, barn and halls). */
export function paintedWood(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:painted-wood-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.vertexShader = 'varying vec3 paintedAt;\n' + shader.vertexShader.replace('#include <project_vertex>',
      'paintedAt = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
    shader.fragmentShader = `varying vec3 paintedAt;\nuniform float closeDetail;\n${PAINTED_WOOD}\n` + shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\n  if (closeDetail > 0.5) diffuseColor.rgb = paintedWood(diffuseColor.rgb, paintedAt, normalize(normal * mat3(viewMatrix)));');
  };
  material.needsUpdate = true;
}
