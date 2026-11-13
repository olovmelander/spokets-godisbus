import { DoubleSide, MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * The old pine's bark and needles, drawn on its shapes from the kit (art/blender/mountain-kit.py; Olov, 13 November
 * 2026: "Kan vi göra tallen i slutet snyggare med bättre texturer!", and the same at the northern lights).
 *
 * Its wood says on its corners where on it they are and what bark is there (`barkAt`: round the limb from its
 * front and along it, in lengths; `barkKind`: how thick and old the bark is, and whether it is bare wood). From
 * that this draws, with the light falling into its relief:
 * - at the foot, an old Scots pine's thick grey-brown plates, long up the stem, with deep dark furrows between them
 *   that show the red-brown under the plates, and crust lichen here and there;
 * - higher up and on the limbs, its thin orange bark in small papery flakes, each its own shade, foxy red where one
 *   has just come off, with a pale curled edge;
 * - the bare wood of the dead limb and the stubs: silver, with its grain and long dry cracks.
 * What would be finer than a pixel or two fades out, and on Low the corners' colours are all there is.
 *
 * A needle card (`needleAt`: across it from 0 to 1, along its shoot from 0 to 1) is drawn as the needles of a pine
 * shoot: in pairs out of its twig, leaning forward, longest in its middle and a brush at its tip, each a little
 * lighter or bluer than the next and lighter at its end. Seen from far off, where the needles would be finer than
 * the pixels, the shoot is its outline. The cards are lit as the tuft they make, not as flat cards.
 */

/** Half a needle card's width, and where along its shoot it begins and ends, in the shoot's lengths (`CARD` in the kit). */
export const NEEDLE_CARD = { half: 0.42, from: -0.03, to: 1.38 } as const;

const BARK = /* glsl */ `
  float pineHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pineNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pineHash(i), pineHash(i + vec2(1.0, 0.0)), u.x), mix(pineHash(i + vec2(0.0, 1.0)), pineHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // Plates along the wood: ridges that wander, part and meet as they run up it, each broken across into plates of
  // its own lengths. x is how far from the ridge's side (0 in a furrow, 0.5 on its middle), y how far from a
  // break across it (in its plates' lengths), z which plate.
  vec3 pinePlates(vec2 at, vec2 size, float wander) {
    vec2 q = at / size;
    float across = q.x + wander * (pineNoise(vec2(q.y * 0.55, q.x * 0.35) + 4.0) - 0.5) * 2.0 + 0.3 * (pineNoise(q * vec2(1.3, 2.6)) - 0.5);
    float column = floor(across);
    float up = q.y / (0.6 + 0.9 * pineHash(vec2(column, 7.0))) + 9.0 * pineHash(vec2(column, 1.0)) + 0.35 * (pineNoise(vec2(across * 3.0, q.y)) - 0.5);
    float row = floor(up);
    return vec3(0.5 - abs(fract(across) - 0.5), 0.5 - abs(fract(up) - 0.5), pineHash(vec2(column, row)));
  }
`;

/** Gives the old pine's wood material its bark. */
export function pineBark(material: MeshStandardMaterial): MeshStandardMaterial {
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:old-pine-bark-v1`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.vertexShader = 'attribute vec2 barkAt;\nattribute vec2 barkKind;\nvarying vec2 vBarkAt;\nvarying vec2 vBarkKind;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      vBarkAt = barkAt;
      vBarkKind = barkKind;`);
    shader.fragmentShader = `uniform float closeDetail;\nvarying vec2 vBarkAt;\nvarying vec2 vBarkKind;\n${BARK}\n` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      if (closeDetail > 0.5) {
        vec2 at = vBarkAt;
        float barkPixel = length(fwidth(at));
        // How fine a thing still shows: a furrow a few pixels wide, a flake's edge, a crack in the grain.
        float coarse = 1.0 - smoothstep(0.03, 0.09, barkPixel);
        float fine = 1.0 - smoothstep(0.01, 0.035, barkPixel);
        float old = smoothstep(0.15, 0.85, vBarkKind.x);
        float bare = smoothstep(0.3, 0.7, vBarkKind.y);
        vec3 base = diffuseColor.rgb;

        // The old plates: broad and long up the stem, on ridges that wander, part and meet, with deep furrows
        // between them and here and there a break across.
        vec3 plate = pinePlates(at, vec2(0.22, 0.42), 0.6);
        float rim = plate.x + 0.06 * (pineNoise(at * vec2(18.0, 6.0)) - 0.5);
        float furrow = smoothstep(0.02 + 0.05 * plate.z, 0.24 + 0.06 * plate.z, rim);
        float breakAcross = mix(1.0, smoothstep(0.0, 0.07, plate.y), step(0.2, pineHash(vec2(plate.z, 3.0))));
        // Its face rounds over into the furrow, and is rough with thin layers and flakes coming off.
        float layers = pineNoise(vec2(at.x * 16.0, at.y * 46.0));
        float plateHigh = furrow * mix(0.55, 1.0, breakAcross);
        vec3 plates = base * (0.84 + 0.3 * plate.z) * (0.86 + 0.24 * layers);
        // Weathered grey on the faces of some plates.
        plates = mix(plates, vec3(dot(plates, vec3(0.33, 0.38, 0.29))) * 1.1, 0.45 * smoothstep(0.5, 0.8, pineNoise(at * vec2(3.5, 1.2) + 8.0)));
        // The furrow's walls are the red-brown of the bark under the plates, its floor dark.
        vec3 furrowColour = mix(base * vec3(0.5, 0.36, 0.28), base * 0.22, 1.0 - smoothstep(0.0, 0.05, rim));
        plates = mix(furrowColour, plates, plateHigh);
        // Crust lichen in grey-green patches on the plates.
        float lichen = smoothstep(0.7, 0.82, pineNoise(at * vec2(3.0, 1.6) + 31.0) * 0.75 + pineNoise(at * 26.0) * 0.25) * plateHigh;
        plates = mix(plates, vec3(0.42, 0.46, 0.36) * (0.8 + 0.4 * pineNoise(at * 70.0)), 0.5 * lichen * fine);
        float plateRelief = 0.034 * plateHigh + 0.006 * layers * furrow;

        // The thin bark: small papery flakes, each its own shade, some fresh and red, with pale curled edges.
        vec3 flake = pinePlates(at + vec2(0.0, 0.31), vec2(0.09, 0.07), 0.5);
        float flakeSide = min(flake.x, flake.y * 0.8) + 0.03 * (pineNoise(at * 90.0) - 0.5);
        float flakeEdge = smoothstep(0.0, 0.08, flakeSide);
        vec3 flakes = base * (0.84 + 0.32 * flake.z);
        flakes = mix(flakes, flakes * vec3(1.15, 0.88, 0.76), step(0.75, flake.z) * 0.55);
        flakes *= 0.92 + 0.1 * pineNoise(at * vec2(70.0, 24.0));
        flakes = mix(flakes * 0.7, flakes, flakeEdge);
        flakes = mix(flakes, flakes * 1.2 + 0.02, (1.0 - smoothstep(0.08, 0.16, flakeSide)) * flakeEdge * 0.4);
        float flakeRelief = 0.007 * flakeEdge + 0.003 * flake.z;

        // The bare wood: silver along its grain, with long dry cracks.
        float grain = pineNoise(vec2(at.x * 46.0, at.y * 2.2));
        float check = 1.0 - smoothstep(0.0, 0.035, abs(pineNoise(vec2(at.x * 7.0, at.y * 0.55) + 5.0) - 0.5));
        vec3 wood = base * (0.86 + 0.26 * grain) * (1.0 - 0.6 * check * fine);
        float woodRelief = 0.006 * grain - 0.02 * check;

        vec3 barkColour = mix(flakes, plates, old);
        float relief = mix(flakeRelief, plateRelief, old);
        barkColour = mix(barkColour, wood, bare);
        relief = mix(relief, woodRelief, bare);
        diffuseColor.rgb = mix(base, barkColour, mix(fine, coarse, old * (1.0 - bare)));

        // The light falls into the relief: the slope of the bark, from how it changes from pixel to pixel.
        float height = relief * mix(fine, coarse, old * (1.0 - bare));
        vec3 barkPosition = -vViewPosition;
        vec3 sx = dFdx(barkPosition), sy = dFdy(barkPosition);
        vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
        float det = dot(sx, r1);
        vec3 slope = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
        normal = normalize(abs(det) * normal - slope);
      }`);
  };
  material.needsUpdate = true;
  return material;
}

/** The old pine's needles: cards that draw their needles, and are lit as the round tuft they make. */
export function pineNeedles(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: DoubleSide, alphaTest: 0.5 });
  material.customProgramCacheKey = () => 'old-pine-needles-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'attribute vec2 needleAt;\nvarying vec2 vNeedleAt;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      vNeedleAt = needleAt;`);
    shader.fragmentShader = `varying vec2 vNeedleAt;\n${BARK}\n` + shader.fragmentShader
      .replace('#include <alphatest_fragment>', /* glsl */ `
      {
        // Where on the shoot, in its lengths: along it from its foot, and out from its twig on one side.
        float s = mix(${NEEDLE_CARD.from.toFixed(3)}, ${NEEDLE_CARD.to.toFixed(3)}, vNeedleAt.y);
        float offTwig = (vNeedleAt.x - 0.5) * ${(2 * NEEDLE_CARD.half).toFixed(3)};
        float side = offTwig < 0.0 ? -1.0 : 1.0;
        float y = abs(offTwig);
        float pixel = length(fwidth(vec2(s, offTwig)));
        // The needles leave the twig every SPACING, at their angle, and reach their length: nearly as long all along
        // the shoot, and leaning further forward towards its tip, where they close into a brush.
        const float SPACING = 0.085;
        float lean = mix(1.0, 0.45, clamp(s, 0.0, 1.0));
        float guess = (s - y / tan(lean)) / SPACING;
        float cover = 0.0;
        float tone = 0.5;
        float tip = 0.0;
        for (int i = -1; i <= 1; i++) {
          float k = floor(guess) + float(i);
          float own = pineHash(vec2(k, side * 3.7));
          float from = (k + 0.35 * (own - 0.5)) * SPACING;
          if (from < 0.03 || from > 1.0) continue;
          // Each needle points its own way round the shoot as well, and is seen shorter as it turns towards him.
          float angle = mix(1.0, 0.45, from) + 0.45 * (pineHash(vec2(k, side + 11.0)) - 0.5);
          float reach = (0.33 + 0.07 * sin(3.14159 * min(1.0, from * 1.1))) * mix(0.5, 1.0, pineHash(vec2(k, side + 23.0)));
          vec2 way = vec2(cos(angle), sin(angle));
          vec2 there = vec2(s - from, y);
          float t = clamp(dot(there, way), 0.0, reach);
          float far = length(there - way * t);
          float wide = max(mix(0.013, 0.004, t / reach), pixel * 0.55);
          float c = 1.0 - smoothstep(wide - pixel * 0.5, wide + pixel * 0.5, far);
          if (c > cover) { cover = c; tone = own; tip = t / reach; }
        }
        // The twig in the middle.
        float twig = (1.0 - smoothstep(0.012, 0.012 + pixel, y)) * step(0.0, s) * step(s, 1.0);
        // From far off, the shoot's outline: a brush, rounded at its tip.
        float outline = (0.33 + 0.07 * sin(3.14159 * clamp(s * 1.1, 0.0, 1.0))) * sin(lean) * 0.75;
        float shape = (1.0 - smoothstep(outline - pixel, outline + pixel, y)) * step(0.02, s) * (1.0 - smoothstep(1.08, 1.16, s));
        float distant = smoothstep(0.35, 0.9, pixel / SPACING);
        cover = mix(cover, shape, distant);
        tone = mix(tone, 0.5, distant);
        // Each needle a little lighter or bluer than the next, and lighter towards its end.
        vec3 needle = diffuseColor.rgb * (0.78 + 0.42 * tone) * mix(0.82, 1.18, tip);
        needle = mix(needle, needle * vec3(0.92, 1.0, 1.08) + 0.012, step(0.7, tone) * 0.7);
        vec3 brown = vec3(0.16, 0.1, 0.06);
        float wood = twig * (1.0 - cover);
        diffuseColor.rgb = mix(needle, brown, wood);
        diffuseColor.a = max(cover, twig);
      }
      #include <alphatest_fragment>`)
      // The cards are lit as the tuft is, from either side.
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n      normal = normalize(vNormal);');
  };
  return material;
}
