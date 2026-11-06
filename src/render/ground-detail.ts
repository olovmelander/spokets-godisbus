import type { MeshStandardMaterial } from 'three';

/** What the ground is, for the detail it is given: moss and soil, rock, or a road. Boards have their own picture. */
export type GroundDetail = 'soft' | 'rock' | 'road';

const patched = new WeakSet<MeshStandardMaterial>();

/**
 * The ground seen close (the graphics pass of 6 November 2026). Its picture is a fine grain that tiles, and its
 * colours are set at the corners of a coarse mesh, so the ground in front of the camera, which fills the lower
 * third of every picture, was one smooth smear: "it looks stretched". Unravel's ground near the camera is full of
 * things a hand's breadth across. This adds them in the shader, from where on the ground a point is, at three
 * sizes, so that nothing repeats and nothing is stretched:
 * - moss and soil: darker damp hollows, sunlit tufts, and needles and bits of leaf lying about;
 * - rock: crust lichen in pale rings, darker weathered patches and hairline cracks;
 * - a road: the stones in the asphalt, tar patches and worn lighter tracks.
 * Far off it fades, so that nothing shimmers; on a steep face it fades too, for the faces have their own joints.
 */
export function groundDetail(material: MeshStandardMaterial, kind: GroundDetail): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:ground-detail-v1-${kind}`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 groundDetailAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      groundDetailAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = /* glsl */ `varying vec3 groundDetailAt;
      float groundHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float groundNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(groundHash(i), groundHash(i + vec2(1.0, 0.0)), u.x), mix(groundHash(i + vec2(0.0, 1.0)), groundHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      {
        vec3 groundUp = normalize(normal * mat3(viewMatrix));
        // On what lies more or less level, or slopes towards the camera; not on the steep faces.
        float groundFlat = smoothstep(0.25, 0.6, groundUp.y + 0.35 * max(groundUp.z, 0.0));
        vec2 at = groundDetailAt.xz;
        // How big a length is on screen here: the detail fades where it would be finer than a few pixels.
        float groundPixel = length(fwidth(at));
        float groundNear = 1.0 - smoothstep(0.05, 0.16, groundPixel);
        float groundMid = 1.0 - smoothstep(0.12, 0.45, groundPixel);
        float big = groundNoise(at * 0.55 + 3.1);
        float mid = groundNoise(at * 2.2 + vec2(7.3, 1.9));
        float fine = groundNoise(mat2(0.8, -0.6, 0.6, 0.8) * at * 7.5);
        vec3 groundColour = diffuseColor.rgb;
        ${kind === 'soft' ? /* glsl */ `
        // Damp hollows and sunlit tufts.
        float tuft = smoothstep(0.55, 0.85, mid) * groundMid;
        float hollow = smoothstep(0.6, 0.2, mid) * groundMid;
        groundColour *= 1.0 + (big - 0.5) * 0.34;
        groundColour = mix(groundColour, groundColour * vec3(1.22, 1.2, 0.8), 0.7 * tuft);
        groundColour *= 1.0 - 0.3 * hollow;
        // Needles and bits of leaf: short dark strokes lying every way.
        vec2 needleAt = mat2(0.6, 0.8, -0.8, 0.6) * at * vec2(14.0, 3.2);
        float needle = smoothstep(0.82, 0.93, groundNoise(needleAt)) * groundNear;
        groundColour = mix(groundColour, groundColour * vec3(0.55, 0.42, 0.3), 0.55 * needle);
        float speck = smoothstep(0.8, 0.92, fine) * groundNear;
        groundColour = mix(groundColour, groundColour * 1.25 + vec3(0.02, 0.02, 0.0), 0.5 * speck);
        ` : kind === 'rock' ? /* glsl */ `
        // Weathered patches, crust lichen in pale rings, and hairline cracks.
        groundColour *= 1.0 + (big - 0.5) * 0.24 + (mid - 0.5) * 0.14 * groundMid;
        float lichenAt = groundNoise(at * 3.4 + 11.0);
        float lichen = smoothstep(0.66, 0.74, lichenAt) * (1.0 - smoothstep(0.78, 0.86, lichenAt)) * groundMid;
        float lichenFill = smoothstep(0.72, 0.82, lichenAt) * groundMid;
        groundColour = mix(groundColour, vec3(0.62, 0.66, 0.52) * dot(groundColour, vec3(0.33)) * 2.2, 0.35 * lichenFill + 0.5 * lichen);
        float crack = 1.0 - smoothstep(0.0, 0.035, abs(groundNoise(at * vec2(1.6, 4.2) + 5.0) - 0.5));
        groundColour *= 1.0 - 0.45 * crack * groundNear;
        groundColour *= 1.0 + (fine - 0.5) * 0.22 * groundNear;
        ` : /* glsl */ `
        // The stones in the asphalt, tar patches and the lighter tracks worn into it.
        groundColour *= 1.0 + (big - 0.5) * 0.18;
        float tar = smoothstep(0.62, 0.7, groundNoise(at * vec2(0.9, 2.6) + 2.0)) * groundMid;
        groundColour *= 1.0 - 0.3 * tar;
        float stone = smoothstep(0.7, 0.86, fine) * groundNear;
        groundColour = mix(groundColour, groundColour * 1.6 + vec3(0.015), 0.45 * stone);
        groundColour *= 1.0 - 0.18 * smoothstep(0.75, 0.9, groundNoise(mat2(0.8, -0.6, 0.6, 0.8) * at * 11.0)) * groundNear;
        `}
        diffuseColor.rgb = mix(diffuseColor.rgb, groundColour, groundFlat);
      }`);
  };
  material.needsUpdate = true;
}
