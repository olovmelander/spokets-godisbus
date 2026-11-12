import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from '../../render/ground-detail';

/**
 * Straw seen close: Billsta's bales and the hay in its loft (./barn-loft.ts). Without it the bales were flat tan boxes
 * that read as cardboard cartons. The stalks run along each face (across the front and the ends, back over the top),
 * each a little lighter or darker than the straw round it and a little askew, with dark gaps between them. Drawn on
 * Mid and High only (`CLOSE_DETAIL`), and faded out where a stalk would be finer than a pixel.
 */
export const STRAW = /* glsl */ `
  float strawHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float strawNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(strawHash(i), strawHash(i + vec2(1.0, 0.0)), u.x), mix(strawHash(i + vec2(0.0, 1.0)), strawHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  vec3 strawy(vec3 colour, vec3 at, vec3 up) {
    // Along the face: across the front and the ends, and back over the top.
    vec3 n = abs(up);
    vec2 p = n.y > 0.6 ? vec2(at.z, at.x) : n.x > 0.6 ? vec2(at.z, at.y) : vec2(at.x, at.y);
    float near = 1.0 - smoothstep(0.015, 0.05, length(fwidth(p)));
    // A little wavy, as pressed straw lies: the stalks bend across one another.
    vec2 q = vec2(p.x, p.y + 0.06 * (strawNoise(vec2(p.x * 1.3, p.y * 2.2)) - 0.5));
    float light = smoothstep(0.55, 0.85, strawNoise(vec2(q.x * 1.8, q.y * 22.0)));
    float fine = smoothstep(0.6, 0.9, strawNoise(vec2(q.x * 4.0 + 5.0, q.y * 38.0)));
    float gap = smoothstep(0.3, 0.06, strawNoise(vec2(q.x * 2.4 + 9.0, q.y * 18.0)));
    vec3 c = colour * (0.9 + 0.2 * strawNoise(p * 2.2 + 4.0));
    c = mix(c, c * 1.35 + 0.04, (0.65 * light + 0.35 * fine) * near);
    c = mix(c, c * 0.5, 0.7 * gap * near);
    return c;
  }
`;

const patched = new WeakSet<MeshStandardMaterial>();

/** Gives a material of straw its stalks (./barn-loft.ts). */
export function strawy(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:straw-v2`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.vertexShader = 'varying vec3 strawAt;\nvarying vec3 strawUp;\n' + shader.vertexShader.replace('#include <project_vertex>',
      'strawAt = (modelMatrix * vec4(transformed, 1.0)).xyz;\nstrawUp = normalize(mat3(modelMatrix) * objectNormal);\n#include <project_vertex>');
    shader.fragmentShader = `varying vec3 strawAt;\nvarying vec3 strawUp;\nuniform float closeDetail;\n${STRAW}\n` + shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\n  if (closeDetail > 0.5) diffuseColor.rgb = strawy(diffuseColor.rgb, strawAt, strawUp);');
  };
  material.needsUpdate = true;
}
