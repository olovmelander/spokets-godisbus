import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL, GROUND_WET } from './ground-detail';

/**
 * Old wood seen close (Olov, 14 November 2026: "förbättra även designen och texturen på stubben", "det liggande trädet",
 * "rotvältan ... snyggare design och texturer"). Elof is 15 cm tall, so a stump, a windfall and a root plate stand in
 * the picture like buildings. Their forms come from Blender (art/blender/a2-nature.py), and every corner of them says
 * what its face is and where on its tree it is (`_BARK`: the kind, and two numbers the kind reads, all written from
 * 0 to 1 so that the pack stores them small). From that this draws, on Mid and High (`CLOSE_DETAIL`), fading whatever
 * would be finer than about three pixels, so that nothing shimmers:
 * - 1, an old spruce's bark: thin scales the size of his hand, each nearly its neighbour's tone, dark where they meet,
 *   one in ten flaked off to the red-brown under it; long cracks that wander with the wood; the broad light and dark
 *   of the stem; grey-green crust lichen; and where its corners are green, moss, its edge ragged;
 * - 2, birch bark: white, with dark lenses across the stem, black and fissured where its corners are dark;
 * - 3, a sawn end: the year rings round a pith a little off the middle, drying cracks, the saw's marks, and a
 *   little green where rain has stood;
 * - 4, bare wood, torn or long dead: its fibres along it, and the cracks of its drying;
 * - 9, wood a beaver has cut: smooth and pale, with the fine grooves of its teeth, bite beside bite;
 * - 7, a root's thin bark, in rings round it; 5, earth: clods, grit, pebbles and pale root threads; 6, moss: a carpet
 *   of shoot tips; 8, granite's grain; 10, resin, which shines.
 * The scales, the cracks, the clods and the pebbles also turn the light (a height, from which the normal is bent), so
 * that a lamp or a flash of lightning catches their edges in the dark. In the rain (`GROUND_WET`) all of it is darker
 * and has a sheen, the earth least. On Low the models' own painted corners and baked shade are what is seen.
 */
const OLD_WOOD = /* glsl */ `
  float owHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 owHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
  float owNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(owHash(i), owHash(i + vec2(1.0, 0.0)), u.x), mix(owHash(i + vec2(0.0, 1.0)), owHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float owHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float owNoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(owHash3(i), owHash3(i + vec3(1, 0, 0)), u.x), mix(owHash3(i + vec3(0, 1, 0)), owHash3(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(owHash3(i + vec3(0, 0, 1)), owHash3(i + vec3(1, 0, 1)), u.x), mix(owHash3(i + vec3(0, 1, 1)), owHash3(i + vec3(1, 1, 1)), u.x), u.y), u.z);
  }
  // Scales that fit each other: how far a point is from its scale's edge, and two numbers of the scale's own.
  vec3 owPlates(vec2 at) {
    vec2 cell = floor(at), inCell = fract(at);
    float first = 8.0, second = 8.0;
    vec2 mine = cell;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + 0.12 + 0.76 * owHash2(cell + g) - inCell;
      float d = dot(r, r);
      if (d < first) { second = first; first = d; mine = cell + g; } else if (d < second) second = d;
    }
    return vec3(sqrt(second) - sqrt(first), owHash2(mine + 3.7));
  }
  // A carpet of moss: a shoot tip in each little cell, the dark between them.
  vec3 owMoss(vec3 base, vec3 q, float pixel) {
    vec3 m = q * 30.0, c = floor(m);
    vec3 off = vec3(owHash3(c), owHash3(c + 3.1), owHash3(c + 5.7)) - 0.5;
    float tip = 1.0 - smoothstep(0.1, 0.42, length(fract(m) - 0.5 - off * 0.3));
    float near = 1.0 - smoothstep(0.012, 0.04, pixel);
    return base * (0.8 + 0.3 * owNoise3(q * 5.0)) * mix(0.88, 0.7 + 0.5 * tip, near);
  }
  // The year rings of a sawn end, its cracks and the saw's marks. p: from the pith, in the stump's radius.
  vec3 owEnd(vec3 base, vec2 p) {
    float r = length(p);
    vec2 q = p - vec2(0.1, -0.07) * (1.0 - min(r * r, 1.0));
    float rq = length(q), aq = atan(q.y, q.x);
    float wobble = (owNoise(vec2(aq * 1.6 + 3.0, 2.0)) - 0.5) * 0.08 + (owNoise(vec2(aq * 6.0, rq * 4.0)) - 0.5) * 0.03;
    float ring = 23.0 * pow(max(rq + wobble, 0.0), 0.86);
    float t = fract(ring);
    float late = smoothstep(0.45, 0.85, t) * (1.0 - smoothstep(0.9, 1.0, t));
    late = mix(0.3, late, 1.0 - smoothstep(0.3, 0.8, fwidth(ring)));
    vec3 wood = base * (1.04 - 0.4 * late);
    // Drying cracks: two from the pith out, three from the bark in, each wandering a little.
    float cracks = 0.0;
    for (int i = 0; i < 5; i++) {
      float k = float(i);
      float angle = owHash(vec2(k, 6.0)) * 6.2832;
      float from = i < 2 ? 0.0 : 0.4 + 0.35 * owHash(vec2(k, 9.0));
      float to = i < 2 ? 0.45 + 0.35 * owHash(vec2(k, 4.0)) : 1.0;
      float along = clamp((rq - from) / (to - from), 0.0, 1.0);
      float wander = 0.14 * (owNoise(vec2(rq * 6.0, k * 3.1)) - 0.5);
      float off = abs(mod(aq - angle + wander + 3.1416, 6.2832) - 3.1416) * rq;
      float wide = 0.004 + 0.022 * (i < 2 ? 1.0 - along : along);
      float px = max(fwidth(off), 1e-4);
      cracks = max(cracks, (1.0 - smoothstep(wide, wide + px, off)) * step(from, rq) * step(rq, to) * min(1.0, (wide + 0.3 * px) / px));
    }
    wood *= 1.0 - 0.82 * cracks;
    // The saw's teeth left faint arcs across the cut.
    float marks = (p.x * 0.8 + p.y * 0.6 + 0.3 * p.y * p.y) * 46.0;
    wood *= 1.0 + 0.1 * (owNoise(vec2(marks, 1.0)) - 0.5) * (1.0 - smoothstep(0.2, 0.6, fwidth(marks)));
    // Where rain has stood, a little green.
    wood = mix(wood, wood * vec3(0.74, 0.92, 0.66), 0.55 * smoothstep(0.56, 0.8, owNoise(p * 2.3 + 5.0)));
    return wood;
  }
`;

const patched = new WeakSet<MeshStandardMaterial>();

/** Gives a kit's old wood (the material `kit-bark`) its bark, rings, earth and moss. */
export function oldWood(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:old-wood-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.oldWoodDetail = CLOSE_DETAIL;
    shader.uniforms.oldWoodWet = GROUND_WET;
    shader.vertexShader = 'attribute vec3 _bark;\nvarying vec3 vOld;\nvarying vec3 vOldAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      // Written from 0 to 1 (art/blender/a2-nature.py): the kind in sixteenths, the two numbers from -8 to 32.
      vOld = vec3(_bark.x * 16.0, _bark.yz * 40.0 - 8.0);
      vOldAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = `varying vec3 vOld;\nvarying vec3 vOldAt;\nuniform float oldWoodDetail;\nuniform float oldWoodWet;\n${OLD_WOOD}\n` + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
      float owKind = floor(vOld.x + 0.5);
      // How shiny each kind is when the rain has wet it, and how much darker.
      float owSheen = 0.62, owDark = 0.1;
      if (oldWoodDetail > 0.5) {
        vec3 owBase = diffuseColor.rgb;
        vec2 owP = vOld.yz;
        vec3 owQ = vOldAt;
        // How big a pixel is here, in EL: what is finer than about three of them is left out, so nothing shimmers.
        float owPixel = max(length(fwidth(owQ)), 1e-4);
        #define OW_SEEN(size) (1.0 - smoothstep(0.3 * (size), 0.85 * (size), owPixel))
        float owHeight = 0.0;
        // Where its corners are green it is moss, whatever is under it; its edge is ragged, as moss creeps.
        float owGreen = owBase.g - max(owBase.r, owBase.b) + (owNoise3(owQ * 6.0) - 0.5) * 0.024 * OW_SEEN(0.1);
        float owMossy = owKind > 5.5 && owKind < 6.5 ? 1.0 : smoothstep(0.004, 0.022, owGreen);
        vec3 owColour = owBase;
        if (owKind > 0.5 && owKind < 1.5) {
          // An old spruce: small thin scales the size of his hand, each nearly its neighbour's tone, dark where
          // they meet; long cracks that wander with the wood; and the broad light and dark of the stem.
          vec2 ragged = owP + 0.02 * vec2(owNoise(owP * 13.0), owNoise(owP * 13.0 + 5.2));
          vec2 grid = vec2(10.5, 14.0);
          vec2 at = ragged * grid + vec2(0.9 * owNoise(owP * vec2(1.3, 2.0)), 0.7 * owNoise(owP * vec2(2.2, 1.1) + 9.0));
          vec3 plate = owPlates(at);
          // How many scales a pixel covers: their own tones show while each is a few pixels and their edges while
          // an edge is as wide as a pixel; beyond that only the cracks and the broad tones are left.
          float span = length(fwidth(owP * grid));
          float own = 1.0 - smoothstep(0.12, 0.4, span);
          float line = max(0.1, 1.2 * span);
          // Not every scale has let go of its neighbour: here and there two are still one.
          float parted = smoothstep(0.12, 0.3, owNoise(owP * vec2(6.0, 9.0) + 7.0));
          float onPlate = mix(1.0, smoothstep(0.0, line, plate.x), parted * own);
          owColour = owBase * mix(1.0, 0.88 + 0.26 * plate.y, own) * mix(vec3(1.0), mix(vec3(0.95, 0.98, 1.04), vec3(1.08, 1.0, 0.9), plate.z), own);
          // One in ten has flaked off: the red-brown bark under it.
          owColour = mix(owColour, owBase * vec3(1.3, 0.86, 0.64), step(0.9, plate.z) * 0.7 * own);
          owColour *= 1.0 - 0.42 * (1.0 - onPlate) * min(1.0, 0.1 / line);
          float fine = owNoise(owP * vec2(30.0, 44.0));
          owColour *= 1.0 + (fine - 0.5) * 0.24 * OW_SEEN(0.03);
          // The long cracks, deepest where the stem is oldest, and the broad light and dark of the bark.
          float wander = owNoise(vec2(owP.x * 0.8, owP.y * 6.5 + 1.6 * owNoise(owP * vec2(0.7, 1.4))));
          float crack = 1.0 - smoothstep(0.0, 0.07, abs(wander - 0.5));
          owColour *= 1.0 - 0.5 * crack * OW_SEEN(0.07);
          owColour *= 0.84 + 0.32 * owNoise(owP * vec2(0.8, 2.6) + 4.0);
          float lichen = smoothstep(0.66, 0.76, owNoise(owP * vec2(1.3, 2.1) + 21.0) * 0.72 + 0.28 * owNoise(owP * 8.0 + 3.0));
          float shade = clamp(dot(owBase, vec3(4.0)), 0.25, 1.0);
          owColour = mix(owColour, vec3(0.3, 0.35, 0.27) * shade * (0.85 + 0.3 * fine), 0.5 * lichen * OW_SEEN(0.3));
          owHeight = 0.018 * onPlate * own - 0.05 * crack * OW_SEEN(0.07) + 0.012 * wander * OW_SEEN(0.2);
          owSheen = 0.5;
        } else if (owKind > 1.5 && owKind < 2.5) {
          // Birch: white where its corners are pale, with dark lenses across the stem and thin curls of peeling
          // bark; black and deeply fissured where they are dark, at its foot.
          float pale = smoothstep(0.1, 0.3, dot(owBase, vec3(0.333)));
          vec2 cell = owP / vec2(0.085, 0.3);
          vec2 c = floor(cell);
          vec2 f = fract(cell) - vec2(0.3 + 0.4 * owHash(c + 7.7), 0.25 + 0.5 * owHash(c + 3.1));
          vec2 size = vec2(mix(0.1, 0.2, owHash(c + 5.3)), mix(0.14, 0.44, owHash(c + 1.9)));
          float lens = step(0.38, owHash(c)) * (1.0 - smoothstep(0.7, 1.0, length(f / size)));
          vec3 white = owBase * (0.9 + 0.2 * owNoise(owP * vec2(2.0, 5.0)));
          white = mix(white, owBase * vec3(0.92, 0.68, 0.52), 0.5 * smoothstep(0.7, 0.8, owNoise(owP * vec2(5.0, 9.0) + 3.0)));
          white = mix(white, owBase * vec3(0.14, 0.12, 0.11), lens * OW_SEEN(0.035));
          white *= 1.0 - 0.22 * smoothstep(0.86, 0.95, owNoise(vec2(owP.x * 34.0, owP.y * 2.4))) * OW_SEEN(0.03);
          float fissure = owNoise(vec2(owP.x * 2.6, owP.y * 15.0 + 2.0 * owNoise(owP * 2.0)));
          float ridge = smoothstep(0.3, 0.62, fissure);
          vec3 black = owBase * mix(1.0, 0.5 + 1.0 * ridge, OW_SEEN(0.07)) * (1.0 + (owNoise(owP * 30.0) - 0.5) * 0.3 * OW_SEEN(0.035));
          owColour = mix(black, white, pale);
          owHeight = mix(0.06 * ridge * OW_SEEN(0.07), -0.012 * lens * OW_SEEN(0.035), pale);
          owSheen = 0.45;
        } else if (owKind > 2.5 && owKind < 3.5) {
          owColour = owEnd(owBase, owP);
          owSheen = 0.74;
          owDark = 0.24;
        } else if (owKind > 3.5 && owKind < 4.5) {
          // Bare wood: its fibres along it, finer ones in them, and the dark checks of its drying.
          float fibre = owNoise(vec2(owP.x * 1.6, owP.y * 26.0));
          float fine = owNoise(vec2(owP.x * 5.0 + 3.0, owP.y * 70.0));
          owColour = owBase * (1.0 + (fibre - 0.5) * 0.34 * OW_SEEN(0.04)) * (1.0 + (fine - 0.5) * 0.2 * OW_SEEN(0.015));
          float check = smoothstep(0.8, 0.86, owNoise(vec2(owP.x * 0.9 + 7.0, owP.y * 13.0)));
          owColour *= 1.0 - 0.5 * check * OW_SEEN(0.03);
          owHeight = 0.012 * fibre * OW_SEEN(0.04) - 0.02 * check * OW_SEEN(0.03);
          owSheen = 0.66;
          owDark = 0.2;
        } else if (owKind > 8.5 && owKind < 9.5) {
          // A beaver's cut: smooth pale wood, and across it the fine grooves of its teeth, bite beside bite, a
          // little aslant and never quite in line.
          float bite = floor(owP.y * 2.2 + 0.4 * owNoise(owP * vec2(2.0, 0.7)));
          float teeth = abs(fract(owP.x * 13.0 + 0.2 * owP.y + 3.7 * owHash(vec2(bite, 2.0))) - 0.5) * 2.0;
          owColour = owBase * (0.95 + 0.1 * owHash(vec2(bite, floor(owP.x * 3.0))));
          owColour *= 1.0 - 0.1 * smoothstep(0.62, 0.95, teeth) * OW_SEEN(0.075);
          owHeight = -0.004 * teeth * OW_SEEN(0.075);
          owSheen = 0.7;
          owDark = 0.2;
        } else if (owKind > 6.5 && owKind < 7.5) {
          // A root's thin bark: rings round it, flaking, with earth in its creases.
          float crease = owNoise(vec2(owP.x * 15.0, owP.y * 2.6));
          owColour = owBase * (0.86 + 0.3 * owNoise(owP * vec2(5.0, 9.0)));
          owColour *= 1.0 - 0.24 * smoothstep(0.62, 0.82, crease) * OW_SEEN(0.06);
          owHeight = 0.012 * crease * OW_SEEN(0.045);
          owSheen = 0.56;
        } else if (owKind > 4.5 && owKind < 5.5) {
          // Earth: clods, grit, pebbles held in it, and the pale threads of fine roots.
          float clod = owNoise3(owQ * 3.3) * 0.65 + owNoise3(owQ * 8.0) * 0.35;
          float grit = owNoise3(owQ * 26.0);
          owColour = owBase * (0.78 + 0.5 * clod) * (1.0 + (grit - 0.5) * 0.4 * OW_SEEN(0.038));
          vec3 cell = floor(owQ * 6.0);
          vec3 inCell = fract(owQ * 6.0) - 0.5 - (vec3(owHash3(cell + 1.7), owHash3(cell + 4.3), owHash3(cell + 8.1)) - 0.5) * 0.5;
          float pebble = step(0.74, owHash3(cell)) * (1.0 - smoothstep(0.12, 0.24, length(inCell))) * OW_SEEN(0.07);
          float shade = clamp(dot(owBase, vec3(5.0)), 0.3, 1.2);
          owColour = mix(owColour, vec3(0.2, 0.2, 0.19) * (0.6 + 0.9 * owHash3(cell + 2.0)) * shade, pebble);
          float thread = 1.0 - smoothstep(0.0, 0.035, abs(owNoise3(owQ * vec3(4.0, 2.0, 4.0) + 11.0) - 0.5));
          owColour = mix(owColour, owBase * vec3(1.9, 1.6, 1.25), 0.24 * thread * OW_SEEN(0.03) * (1.0 - pebble));
          owHeight = 0.03 * clod * OW_SEEN(0.12) + 0.025 * pebble;
          owSheen = 0.82;
          owDark = 0.14;
        } else if (owKind > 7.5 && owKind < 8.5) {
          // Granite: mottled, with its dark and pale crystals.
          float grain = owNoise3(owQ * 34.0);
          owColour = owBase * (0.84 + 0.32 * owNoise3(owQ * 2.2));
          owColour *= 1.0 + (smoothstep(0.62, 0.8, grain) * 0.3 - (1.0 - smoothstep(0.2, 0.36, grain)) * 0.36) * OW_SEEN(0.03);
          owSheen = 0.4;
          owDark = 0.2;
        } else if (owKind > 9.5) {
          owSheen = 0.22;
          owDark = 0.0;
        }
        if (owMossy > 0.0) {
          owColour = mix(owColour, owMoss(owBase, owQ, owPixel), owMossy);
          owHeight *= 1.0 - owMossy;
          owSheen = mix(owSheen, 0.9, owMossy);
        }
        diffuseColor.rgb = owColour;
        // The scales, clods and pebbles turn the light: the normal bent by the height's slope.
        vec3 owSx = dFdx(-vViewPosition), owSy = dFdy(-vViewPosition);
        vec3 owR1 = cross(owSy, normal), owR2 = cross(normal, owSx);
        float owDet = dot(owSx, owR1);
        normal = normalize(abs(owDet) * normal - sign(owDet) * (dFdx(owHeight) * owR1 + dFdy(owHeight) * owR2));
      }
      // Rain darkens what it wets and gives it a sheen; resin shines whatever the weather.
      diffuseColor.rgb *= 1.0 - owDark * oldWoodWet;
      roughnessFactor = owKind > 9.5 ? 0.22 : mix(roughnessFactor, owSheen, oldWoodWet);`);
  };
  material.needsUpdate = true;
}
