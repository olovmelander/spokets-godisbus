import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * Cast concrete seen close (Olov: Unravel's places; the road bridge at Älven was flat grey boxes). The bridge comes
 * from Blender with its concrete in a material of its own (`kit-concrete`, art/blender/a2-built.py), and every corner
 * says how open it is to the rain, how far along its face it is, and how far below the face's top (`_CON`). From that
 * and where it is, this draws on Mid and High (`CLOSE_DETAIL`), fading what would be finer than a pixel or two:
 * - on the sides: the boards it was cast against, each its own tone with the grain pressed into it and a thin ridge
 *   at each joint, the tie holes in rows, small air holes and the grit;
 * - dark runs from the top down where the rain goes, rust here and there, and white lime leached from the joints;
 * - underneath, out of the rain: paler and dry, with white lime along its cracks;
 * - on top: grime and a little moss; and where the corners are green (algae and moss by the water), that stays.
 * Out in the rain (`concreteWet`) it is darker and has a sheen, the runs most; what is sheltered stays dry.
 */
const CONCRETE = /* glsl */ `
  float conHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float conNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(conHash(i), conHash(i + vec2(1.0, 0.0)), u.x), mix(conHash(i + vec2(0.0, 1.0)), conHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // Small round holes in cells of their own: air bubbles left in the face, and the tie holes.
  float conPores(vec2 p, float cell, float share, float pixel) {
    vec2 c = floor(p / cell);
    vec2 centre = (c + 0.2 + 0.6 * vec2(conHash(c + 1.3), conHash(c + 2.9))) * cell;
    float r = cell * mix(0.05, 0.13, conHash(c + 4.7)) * mix(0.6, 1.0, conHash(c + 8.3));
    float d = length(p - centre);
    return step(1.0 - share, conHash(c)) * (1.0 - smoothstep(r, r + pixel, d)) * min(1.0, r / pixel);
  }
  // A side of it: u along the face, h up, d below its top edge. Gives the colour, and how wet the runs are.
  vec3 concreteSide(vec3 base, float u, float h, float d, out float runs) {
    vec2 at = vec2(u, h);
    float pixel = max(length(fwidth(at)), 1e-4);
    float near = 1.0 - smoothstep(0.012, 0.05, pixel);
    vec3 c = base;
    // The boards: 0.9 high, each length its own tone, the grain of the wood pressed in, a ridge at each joint.
    float row = h / 0.9 + 0.37;
    float board = floor(row);
    float length_ = 7.0 + 4.0 * conHash(vec2(board, 3.0));
    float piece = floor(u / length_ + conHash(vec2(board, 5.0)));
    c *= 0.93 + 0.14 * conHash(vec2(board, piece));
    c *= 1.0 + 0.07 * (conNoise(vec2(u * 1.4 + board * 7.0, h * 24.0)) - 0.5) * near;
    float joint = min(fract(row), 1.0 - fract(row)) * 0.9;
    float seam = 1.0 - smoothstep(0.008, 0.008 + pixel, joint);
    c *= 1.0 - 0.22 * seam + 0.07 * (1.0 - smoothstep(0.01, 0.03 + pixel, abs(joint - 0.025))) * step(0.5, fract(row));
    float butt = min(fract(u / length_ + conHash(vec2(board, 5.0))), 1.0 - fract(u / length_ + conHash(vec2(board, 5.0)))) * length_;
    c *= 1.0 - 0.15 * (1.0 - smoothstep(0.006, 0.006 + pixel, butt));
    // The tie holes, in rows, each with its plug of paler mortar; the air holes and the grit.
    vec2 tie = vec2(u / 4.2, (h - 0.45) / 2.7);
    vec2 tieAt = (tie - floor(tie) - 0.5) * vec2(4.2, 2.7);
    float tieR = length(tieAt);
    c *= mix(1.0, 1.1, (1.0 - smoothstep(0.08, 0.1 + pixel, tieR)) * smoothstep(0.05, 0.06, tieR));
    c *= 1.0 - 0.6 * (1.0 - smoothstep(0.05, 0.05 + pixel, tieR));
    c *= 1.0 - 0.4 * conPores(at, 0.11, 0.16, pixel) * near;
    c *= 1.0 + 0.1 * (conNoise(at * 46.0) - 0.5) * near;
    // Dark runs from the top, broad and thin, fading as they go down; green in the broad ones, rust now and then.
    float broad = smoothstep(0.45, 0.78, conNoise(vec2(u * 1.7, d * 0.1 + 2.0)));
    float thin = smoothstep(0.56, 0.74, conNoise(vec2(u * 7.0, d * 0.22 + 5.0)));
    float fade = 0.55 + 0.45 * exp(-d * 0.35);
    runs = clamp((broad * 0.7 + thin * 0.6) * fade, 0.0, 1.0);
    c = mix(c, c * vec3(0.42, 0.46, 0.4), runs * 0.8);
    float rusty = step(0.86, conHash(vec2(floor(u * 1.3), 9.0))) * thin * exp(-d * 0.35);
    c = mix(c, c * vec3(1.15, 0.78, 0.5), rusty);
    // White lime leached out of the joints, in short streaks down from them.
    float lime = smoothstep(0.7, 0.85, conNoise(vec2(u * 3.0, board * 1.7))) * exp(-fract(row) * 3.5) * (1.0 - seam);
    c = mix(c, vec3(dot(c, vec3(0.33))) * 1.55 + 0.04, 0.45 * lime);
    return c;
  }
  // Underneath, out of the rain: big shuttering panels, and white lime along the cracks.
  vec3 concreteUnder(vec3 base, vec2 p) {
    float pixel = max(length(fwidth(p)), 1e-4);
    float near = 1.0 - smoothstep(0.012, 0.05, pixel);
    vec3 c = base * 1.06;
    vec2 panel = p / vec2(8.0, 4.0);
    c *= 0.95 + 0.1 * conHash(floor(panel));
    vec2 edge = min(fract(panel), 1.0 - fract(panel)) * vec2(8.0, 4.0);
    c *= 1.0 - 0.14 * (1.0 - smoothstep(0.01, 0.01 + pixel, min(edge.x, edge.y)));
    c *= 1.0 - 0.35 * conPores(p, 0.12, 0.14, pixel) * near;
    c *= 1.0 + 0.08 * (conNoise(p * 40.0) - 0.5) * near;
    float crack = abs(conNoise(vec2(p.x * 0.35, p.y * 0.9)) - 0.5);
    float line = 1.0 - smoothstep(0.004, 0.02, crack);
    c = mix(c, vec3(dot(c, vec3(0.33))) * 1.6 + 0.05, 0.6 * line * smoothstep(0.4, 0.6, conNoise(p * 0.5 + 7.0)));
    return c;
  }
  // On top: grime in the low places and a little moss.
  vec3 concreteTop(vec3 base, vec2 p) {
    float pixel = max(length(fwidth(p)), 1e-4);
    float near = 1.0 - smoothstep(0.012, 0.05, pixel);
    vec3 c = base * (0.88 + 0.2 * conNoise(p * 1.3));
    c *= 1.0 + 0.1 * (conNoise(p * 40.0) - 0.5) * near;
    float moss = smoothstep(0.66, 0.76, conNoise(p * 2.2 + 3.0));
    return mix(c, vec3(0.1, 0.14, 0.05) * (0.7 + 0.6 * conNoise(p * 30.0)), 0.7 * moss);
  }
`;

const patched = new WeakSet<MeshStandardMaterial>();

/** Gives a kit's concrete material (`kit-concrete`) its boards, holes, runs and wet. `wet`: how much it rains on it. */
export function concrete(material: MeshStandardMaterial, wet = 1): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:concrete-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    // Its own name for the tier's switch: the weather (./weathered.ts) on the same material declares closeDetail.
    shader.uniforms.concreteDetail = CLOSE_DETAIL;
    shader.uniforms.concreteWet = { value: wet };
    shader.vertexShader = 'attribute vec3 _con;\nvarying vec3 vCon;\nvarying vec3 vConAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vCon = _con;
      vConAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = `varying vec3 vCon;\nvarying vec3 vConAt;\nuniform float concreteDetail;\nuniform float concreteWet;\n${CONCRETE}\n` + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
      {
        vec3 conUp = normalize(normal * mat3(viewMatrix));
        // Where it is green (algae and moss by the water, painted on its corners), that is what it is.
        float bare = 1.0 - smoothstep(0.004, 0.03, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        float runs = 0.0;
        if (concreteDetail > 0.5) {
          vec3 c = diffuseColor.rgb;
          if (abs(conUp.y) < 0.7) c = concreteSide(c, vCon.y, vConAt.y, vCon.z, runs);
          else if (conUp.y < 0.0) c = concreteUnder(c, vConAt.xz);
          else c = concreteTop(c, vConAt.xz);
          diffuseColor.rgb = mix(diffuseColor.rgb, c, bare);
        }
        // Rain wets what is open to it, the runs most and the tops; what is under the deck stays dry.
        float wetted = concreteWet * clamp(vCon.x * (0.65 + 0.35 * runs) + 0.4 * runs * vCon.x, 0.0, 1.0);
        diffuseColor.rgb *= 1.0 - 0.32 * wetted;
        roughnessFactor = mix(roughnessFactor, 0.32, 0.85 * wetted);
      }`);
  };
  material.needsUpdate = true;
}
