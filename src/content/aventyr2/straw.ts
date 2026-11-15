import { Color, DoubleSide, MeshStandardMaterial, Vector4 } from 'three';
import { CLOSE_DETAIL } from '../../render/ground-detail';

/**
 * Hay seen close: the material of the bales and the loose hay in Billsta's loft (./barn-hay.ts, ./barn-loft.ts).
 *
 * Its pressed mass (`fibre` 1 on a corner) has its stalks drawn: three lays of them across one another, each stalk a
 * little lighter or darker than the hay round it and a little wavy, with the dark between them where no stalk lies
 * (Olov, 14 November 2026: "Kan vi göra höet inne i ladan snyggare?": as stripes all one way it read as combed straw,
 * or cardboard). The single stalks that lie on it and stick out of it (`fibre` 0) keep their own colours. Drawn on Mid
 * and High only (`CLOSE_DETAIL`), and faded out where a stalk would be finer than a pixel.
 *
 * And it is warm in the lantern's light: mormor stands at the door with her lantern, and the hay nearest it glows,
 * falling off into the loft's dark (`lamps`: where the light is and how far it reaches; `lit`: how much of it there
 * is now, 0 to 1).
 */
export const HAY = /* glsl */ `
  float hayHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hayNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hayHash(i), hayHash(i + vec2(1.0, 0.0)), u.x), mix(hayHash(i + vec2(0.0, 1.0)), hayHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // One lay of stalks, along p.x: long streaks, wavering a little.
  float hayLay(vec2 p, float along, float across) {
    return hayNoise(vec2(p.x * along, (p.y + 0.07 * (hayNoise(p * 1.6) - 0.5)) * across));
  }
  vec3 hayFibres(vec3 colour, vec3 at, vec3 up) {
    vec3 n = abs(up);
    vec2 p = n.y > n.x && n.y > n.z ? at.xz : n.x > n.z ? at.zy : at.xy;
    float near = 1.0 - smoothstep(0.012, 0.045, length(fwidth(p)));
    float a = hayLay(mat2(0.82, 0.57, -0.57, 0.82) * p, 1.5, 27.0);
    float b = hayLay(mat2(0.64, -0.77, 0.77, 0.64) * p + 7.3, 1.8, 31.0);
    float c = hayLay(p.yx + 3.1, 1.3, 23.0);
    float light = max(smoothstep(0.58, 0.84, a), max(smoothstep(0.6, 0.86, b), 0.8 * smoothstep(0.62, 0.88, c)));
    float dark = (1.0 - smoothstep(0.22, 0.46, a)) * (1.0 - smoothstep(0.22, 0.5, b));
    vec3 hay = colour * (0.84 + 0.3 * hayNoise(p * 1.9 + 4.0));
    hay = mix(hay, hay * 1.36 + 0.03, 0.8 * light * near);
    hay = mix(hay, hay * 0.46, 0.85 * dark * near);
    return hay;
  }
`;

/** The lantern's light on the hay: at most two lamps, each where it is (xyz) and how far it reaches (w). */
export interface HayLight {
  lamps: { value: Vector4[] };
  colour: { value: Color };
  lit: { value: number };
}

/** The hay's material, and its lantern light for whoever knows when the lantern is there. */
export function hayMaterial(lamps: readonly { x: number; y: number; z: number; reach: number }[]): { material: MeshStandardMaterial; light: HayLight } {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1, side: DoubleSide });
  const light: HayLight = {
    lamps: { value: [0, 1].map((i) => { const l = lamps[i]; return l ? new Vector4(l.x, l.y, l.z, l.reach) : new Vector4(0, -999, 0, 1); }) },
    colour: { value: new Color(0.92, 0.54, 0.23) },
    lit: { value: 1 },
  };
  material.customProgramCacheKey = () => 'hay-v3';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.uniforms.hayLamps = light.lamps;
    shader.uniforms.hayLampColour = light.colour;
    shader.uniforms.hayLit = light.lit;
    shader.vertexShader = 'attribute float fibre;\nvarying vec3 hayAt;\nvarying vec3 hayUp;\nvarying float hayFibre;\n' + shader.vertexShader.replace('#include <project_vertex>',
      'hayAt = (modelMatrix * vec4(transformed, 1.0)).xyz;\nhayUp = normalize(mat3(modelMatrix) * objectNormal);\nhayFibre = fibre;\n#include <project_vertex>');
    shader.fragmentShader = `varying vec3 hayAt;\nvarying vec3 hayUp;\nvarying float hayFibre;\nuniform float closeDetail;\nuniform vec4 hayLamps[2];\nuniform vec3 hayLampColour;\nuniform float hayLit;\n${HAY}\n` + shader.fragmentShader
      .replace('#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\n  if (closeDetail > 0.5 && hayFibre > 0.5) diffuseColor.rgb = hayFibres(diffuseColor.rgb, hayAt, hayUp);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    // The lantern: warm, falling off with the distance, on what is turned towards it and a little on what is not.
    vec3 seen = normalize(hayUp) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 lamp = vec3(0.0);
    for (int i = 0; i < 2; i++) {
      vec3 to = hayLamps[i].xyz - hayAt;
      float far = length(to) / hayLamps[i].w;
      float fall = 1.0 / (1.0 + 5.0 * far * far) * (1.0 - smoothstep(0.7, 1.25, far));
      lamp += hayLampColour * fall * (0.35 + 0.65 * clamp(dot(to / max(length(to), 1e-3), seen), 0.0, 1.0));
    }
    totalEmissiveRadiance += diffuseColor.rgb * lamp * hayLit;
  }`);
  };
  return { material, light };
}
