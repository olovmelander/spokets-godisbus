import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * Firewood seen close (Olov: as beautiful as Unravel). Billsta's stack and the winter's wood in the woodshed come
 * from Blender round and split (art/blender/kit-tools.py, `firewood`), and every corner of a piece says where on its
 * log it is (`_LOG`: which face, the log's radius, and where it is from the pith, in that radius, across and up).
 * From that this draws, on Mid and High (`CLOSE_DETAIL`), fading what would be finer than a pixel or two:
 * - a sawn end: the growth rings, closer together towards the bark, a darker heart, the pith a little off the
 *   middle, drying cracks from the bark in, the saw's sweep, and the bark round its edge, here and there gone;
 * - bark: birch white with dark lenticels across the stem, rough black patches and a peeled pink; spruce in small
 *   scales;
 * - a split face: its fibres along the log, and the rings as lines along it.
 * The pieces lie along the picture's depth, so along a log is the world's z.
 */
const FIREWOOD = /* glsl */ `
  float fwHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fwNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fwHash(i), fwHash(i + vec2(1.0, 0.0)), u.x), mix(fwHash(i + vec2(0.0, 1.0)), fwHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // How many years a log has, and where in them a point is: the rings follow the bark at the edge, and the pith is
  // a little off the middle, as a stem grows more on its sunny side.
  float fwRings(vec2 p, float seed, float birch) {
    vec2 off = (vec2(fwHash(vec2(seed, 1.0)), fwHash(vec2(seed, 2.0))) - 0.5) * 0.36;
    vec2 q = p - off * (1.0 - min(dot(p, p), 1.0));
    float a = atan(q.y, q.x);
    float wobble = (fwNoise(vec2(a * 1.6 + seed * 40.0, seed * 9.0)) - 0.5) * 0.07 + (fwNoise(vec2(a * 6.0 + seed * 3.0, length(q) * 4.0)) - 0.5) * 0.025;
    float years = mix(7.0, 15.0, fwHash(vec2(seed, 3.0))) * (1.0 + 0.25 * birch);
    return years * pow(max(length(q) + wobble, 0.0), 0.82);
  }
  // Earlywood pale, latewood a dark band at the end of each year; the mean where the rings are finer than a pixel.
  float fwLate(float ring) {
    float t = fract(ring);
    float late = smoothstep(0.55, 0.86, t) * (1.0 - smoothstep(0.92, 1.0, t));
    return mix(0.3, late, 1.0 - smoothstep(0.25, 0.7, fwidth(ring)));
  }
  vec3 firewoodEnd(vec3 base, vec2 p, float big, float seed, float birch) {
    float r = length(p);
    float a = atan(p.y, p.x);
    float ring = fwRings(p, seed, birch);
    vec3 wood = base * (1.0 - (birch > 0.5 ? 0.12 : 0.3) * fwLate(ring));
    // A darker heart: spruce a little, a birch now and then its brown false heart, its edge ragged.
    float heartAt = mix(0.32, 0.62, fwHash(vec2(seed, 4.0))) + 0.08 * (fwNoise(vec2(a * 2.4 + seed * 13.0, 1.0)) - 0.5);
    float heart = (1.0 - smoothstep(heartAt - 0.07, heartAt + 0.02, r)) * (birch > 0.5 ? step(0.55, fwHash(vec2(seed, 5.0))) : 0.7);
    wood *= mix(vec3(1.0), vec3(0.8, 0.66, 0.5), heart);
    // The sapwood paler towards the bark, the pith a dark point, and blue stain in a spruce's sapwood now and then.
    wood *= 1.0 + 0.1 * smoothstep(0.62, 0.88, r);
    wood *= 1.0 - 0.5 * (1.0 - smoothstep(0.012, 0.04, length(p - (vec2(fwHash(vec2(seed, 1.0)), fwHash(vec2(seed, 2.0))) - 0.5) * 0.36)));
    float stain = (1.0 - birch) * step(0.7, fwHash(vec2(seed, 14.0))) * smoothstep(0.55, 0.7, fwNoise(vec2(a * 3.0 + seed * 7.0, r * 2.0))) * smoothstep(0.55, 0.8, r);
    wood = mix(wood, wood * vec3(0.62, 0.66, 0.7), 0.6 * stain);
    // The saw's sweep: faint arcs across the cut, and where the cut broke off at its end, torn fibres.
    float sweep = fwHash(vec2(seed, 15.0)) * 6.2832;
    vec2 dir = vec2(cos(sweep), sin(sweep));
    float across = dot(p, dir) * big;
    float along = dot(p, vec2(-dir.y, dir.x)) * big;
    float marks = (across + 0.6 * along * along) * 14.0 + 0.6 * fwNoise(vec2(along * 6.0, seed * 3.0));
    wood *= 1.0 + 0.04 * (fwNoise(vec2(marks, along * 2.0)) - 0.5) * (1.0 - smoothstep(0.08, 0.22, fwidth(marks)));
    float tornAt = dot(p, dir);
    float torn = smoothstep(0.75, 0.95, tornAt + 0.08 * (fwNoise(p * 4.0 + seed * 5.0) - 0.5));
    wood *= 1.0 + 0.12 * torn * (0.6 + 0.4 * fwNoise(vec2(dot(p, vec2(-dir.y, dir.x)) * 10.0, tornAt * 3.0)));
    // Drying cracks from the bark in: one to four, widest at the bark, wandering a little.
    float cracks = 0.0;
    float many = 1.0 + floor(3.99 * fwHash(vec2(seed, 8.0)));
    for (int i = 0; i < 4; i++) {
      float k = float(i);
      if (k >= many) break;
      float angle = fwHash(vec2(seed * 7.0 + k, 6.0)) * 6.2832;
      float depth = mix(0.22, 0.85, fwHash(vec2(seed + k, 9.0))) * (k < 0.5 ? 1.0 : 0.7);
      float from = 1.0 - depth;
      float inner = clamp((r - from) / depth, 0.0, 1.0);
      float wander = 0.08 * (fwNoise(vec2(r * 7.0, k * 3.1 + seed * 5.0)) - 0.5);
      float off = abs(mod(a - angle + wander + 3.1416, 6.2832) - 3.1416) * r;
      float wide = (0.006 + 0.03 * inner * inner) * step(from, r);
      float pixel = max(fwidth(off), 1e-4);
      cracks = max(cracks, (1.0 - smoothstep(wide, wide + pixel, off)) * min(1.0, (wide + 0.3 * pixel) / pixel) * step(from, r));
    }
    wood *= 1.0 - 0.85 * cracks;
    // The bark round the edge, uneven, gone here and there; inside it a thin dark line of the cambium.
    float barkWide = mix(0.05, 0.1, fwHash(vec2(seed, 10.0))) * (0.7 + 0.6 * fwNoise(vec2(a * 3.0 + seed * 21.0, 2.0)));
    float edgePixel = fwidth(r);
    float rim = smoothstep(1.0 - barkWide - edgePixel, 1.0 - barkWide + edgePixel, r);
    rim *= smoothstep(0.16, 0.3, fwNoise(vec2(a * 2.2 + seed * 31.0, 4.0)));
    float cambium = smoothstep(1.0 - barkWide - 0.035, 1.0 - barkWide - 0.012, r) * (1.0 - rim);
    wood *= 1.0 - 0.3 * cambium;
    // The end's own shade (its age, and the shade baked on its corners) carried over to the bark.
    float shade = dot(base, vec3(0.3, 0.59, 0.11)) / (birch > 0.5 ? 0.63 : 0.51);
    vec3 bark = birch > 0.5
      ? mix(vec3(0.07, 0.04, 0.025), vec3(0.74, 0.71, 0.64), smoothstep(1.0 - barkWide * 0.5, 1.0 - barkWide * 0.3, r))
      : vec3(0.1, 0.064, 0.042) * (0.8 + 0.4 * fwNoise(vec2(a * 20.0, seed)));
    return mix(wood, bark * shade, rim);
  }
  vec3 firewoodBark(vec3 base, vec2 p, float big, float seed, float birch, float along) {
    vec2 at = vec2(atan(p.y, p.x) * big, along);
    float pixel = max(length(fwidth(at)), 1e-4);
    float near = 1.0 - smoothstep(0.012, 0.04, pixel);
    vec3 bark = base;
    if (birch > 0.5) {
      // Lenticels: thin dark dashes across the stem, each its own length.
      vec2 cell = at / vec2(0.24, 0.075);
      vec2 c = floor(cell);
      vec2 f = fract(cell) - vec2(0.25 + 0.5 * fwHash(c + seed + 3.1), 0.3 + 0.4 * fwHash(c + 7.7));
      vec2 size = vec2(mix(0.12, 0.42, fwHash(c + 1.9)), mix(0.07, 0.16, fwHash(c + 5.3)));
      float dash = step(0.3, fwHash(c + seed)) * (1.0 - smoothstep(0.7, 1.0, length(f / size)));
      bark = mix(bark, base * vec3(0.16, 0.13, 0.12), dash * (1.0 - smoothstep(0.004, 0.012, pixel)));
      // Rough black patches, where the stem was old; and a pinkish orange where the white has peeled.
      float rough = smoothstep(0.6, 0.7, fwNoise(at * vec2(1.6, 3.0) + seed * 9.0)) * step(0.35, fwHash(vec2(seed, 12.0)));
      bark = mix(bark, base * vec3(0.3, 0.28, 0.27) * (0.7 + 0.6 * fwNoise(at * vec2(14.0, 40.0))), rough);
      float peel = smoothstep(0.72, 0.8, fwNoise(at * vec2(4.0, 8.0) + seed * 3.0));
      bark = mix(bark, base * vec3(0.92, 0.66, 0.5), 0.55 * peel);
      bark *= 1.0 + 0.08 * (fwNoise(vec2(at.x * 3.0, at.y * 80.0)) - 0.5) * near;
    } else {
      // Spruce: small plates of uneven size, each its own tone, with dark edges between them.
      vec2 s = vec2(at.x * 8.0 + 0.4 * fwNoise(at * vec2(3.0, 1.2)), at.y * 4.5);
      s.x += fwHash(vec2(floor(s.y), seed)) * 7.0;
      vec2 inside = fract(s) - 0.5;
      float edge = smoothstep(0.3, 0.5, length(inside * vec2(1.0, 0.8)));
      bark *= (0.82 + 0.34 * fwHash(floor(s) + seed)) * (1.0 - 0.38 * edge * near);
      float lichen = smoothstep(0.74, 0.8, fwNoise(at * 6.0 + seed * 17.0)) * near;
      bark = mix(bark, vec3(0.3, 0.34, 0.24) * dot(base, vec3(0.6)), 0.5 * lichen);
    }
    return bark;
  }
  vec3 firewoodSplit(vec3 base, vec2 p, float big, float seed, float birch, float along) {
    float r = length(p);
    float pixel = max(fwidth(r * big), 1e-4);
    float near = 1.0 - smoothstep(0.004, 0.015, pixel);
    // The fibres, long along the log, and the rings as lines along it.
    vec3 wood = base * (0.9 + 0.16 * fwNoise(vec2(r * big * 80.0, along * 1.2 + seed * 11.0)));
    wood *= 1.0 + 0.12 * (fwNoise(vec2(r * big * 240.0, along * 3.0)) - 0.5) * near;
    wood *= 1.0 - (birch > 0.5 ? 0.08 : 0.2) * fwLate(fwRings(p, seed, birch));
    // Splinters torn up by the axe: pale ridges with a shadow under them.
    float splinter = fwNoise(vec2(r * big * 30.0, along * 0.5 + seed * 3.0));
    wood *= 1.0 + 0.14 * smoothstep(0.7, 0.85, splinter) - 0.18 * smoothstep(0.62, 0.7, splinter) * (1.0 - smoothstep(0.7, 0.78, splinter));
    return wood;
  }
`;

const patched = new WeakSet<MeshStandardMaterial>();

/**
 * Gives a kit's firewood material (`kit-wood`) its rings, cracks and bark. `wet`: out in the rain (Billsta's stack),
 * the bark is darker and has a sheen, and the ends darken; under the woodshed's roof, none.
 */
export function firewood(material: MeshStandardMaterial, wet: number): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:firewood-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    // Its own name for the tier's switch: the weather (./weathered.ts) on the same material declares closeDetail.
    shader.uniforms.firewoodDetail = CLOSE_DETAIL;
    shader.uniforms.firewoodWet = { value: wet };
    shader.vertexShader = 'attribute vec3 _log;\nvarying vec3 vLog;\nvarying vec2 vLogAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vLog = _log;
      vLogAt = (modelMatrix * vec4(transformed, 1.0)).zy;
      #include <project_vertex>`);
    shader.fragmentShader = `varying vec3 vLog;\nvarying vec2 vLogAt;\nuniform float firewoodDetail;\nuniform float firewoodWet;\n${FIREWOOD}\n` + shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
      // Which face of which piece: 1 and 2 a sawn end, 3 and 4 bark, 5 and 6 a split face, spruce then birch.
      float logKind = floor(vLog.x + 0.001);
      float logBirch = mod(logKind + 1.0, 2.0);
      float logBig = 2.0 * fract(vLog.x + 0.001);
      float logSeed = fract(logBig * 37.13);
      if (firewoodDetail > 0.5 && logKind > 0.5) {
        if (logKind < 2.5) diffuseColor.rgb = firewoodEnd(diffuseColor.rgb, vLog.yz, logBig, logSeed, logBirch);
        else if (logKind < 4.5) diffuseColor.rgb = firewoodBark(diffuseColor.rgb, vLog.yz, logBig, logSeed, logBirch, vLogAt.x);
        else diffuseColor.rgb = firewoodSplit(diffuseColor.rgb, vLog.yz, logBig, logSeed, logBirch, vLogAt.x);
      }
      // Darker low down, where soil splashes up (in the place of ./weathered.ts, which is left off it).
      diffuseColor.rgb *= 1.0 - 0.16 * (1.0 - smoothstep(0.1, 1.3, vLogAt.y - floor(vLogAt.y / 400.0) * 400.0));
      // Rain darkens what it wets, the ends most, which drink it; wet bark has a sheen, and end grain stays dull.
      diffuseColor.rgb *= 1.0 - firewoodWet * (logKind < 2.5 ? 0.22 : 0.14);
      roughnessFactor = mix(roughnessFactor, logKind > 2.5 && logKind < 4.5 ? 0.42 : 0.7, firewoodWet);`);
  };
  material.needsUpdate = true;
}
