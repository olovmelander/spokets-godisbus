import { Float32BufferAttribute, type BufferGeometry, type MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * Bark seen close (the graphics pass of 6 November 2026; Olov: "träd ... kan vi göra snyggare", and Unravel's trees
 * as the measure). The stems by the ledges, which he climbs past at arm's length, were strips of flat colour. A
 * shape's corners say whether they are bark, and which way it runs (`BARK_UP` on a stem, `BARK_ALONG` on a bough
 * lying along the path); this draws on them, from where on the tree a point is:
 * - a spruce's thin scaly bark: small plates with darker edges between them;
 * - longer darker cracks running with the wood;
 * - here and there grey-green crust lichen.
 * It fades where it would be finer than a few pixels, so that nothing shimmers.
 */
export const BARK_UP = 1;
export const BARK_ALONG = 2;
/**
 * Not bark but the mountain's granite (Olov: "stenar ... kan vi göra snyggare"): its grain of dark and pale
 * crystals, darker streaks where rain runs down its sides, and yellow-green map lichen and pale crust lichen in
 * rings on it, laid on from all three sides so that no face is stretched.
 */
export const STONE = 3;
/**
 * A sawn board that moves (the planks he pushes and pulls): its grain is laid on from its own shape, not from
 * where it is, so that it goes with it. Fine lines along it, the arcs of the growth rings, now and then a knot.
 */
export const PLANK = 4;

/** Marks a shape's corners as bark that runs one way: up a stem or along a bough. */
export function barky(shape: BufferGeometry, run: number): BufferGeometry {
  shape.setAttribute('barky', new Float32BufferAttribute(new Float32Array(shape.getAttribute('position').count).fill(run), 1));
  return shape;
}

/** What is not bark: every shape merged with bark must say so, for merged shapes must have the same attributes. */
export function notBark(shape: BufferGeometry): BufferGeometry {
  return shape.hasAttribute('barky') ? shape : barky(shape, 0);
}

const patched = new WeakSet<MeshStandardMaterial>();

export function barkDetail(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:bark-detail-v6`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    // Drawn on Mid and High only, as the ground's detail is (./ground-detail.ts).
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.vertexShader = 'attribute float barky;\nvarying float vBarky;\nvarying vec3 vBarkAt;\nvarying vec3 vBarkOwn;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vBarky = barky;
      vBarkOwn = transformed;
      vec4 barkWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        barkWorld = instanceMatrix * barkWorld;
      #endif
      vBarkAt = (modelMatrix * barkWorld).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = /* glsl */ `uniform float closeDetail;
      varying float vBarky;
      varying vec3 vBarkAt;
      varying vec3 vBarkOwn;
      float barkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float barkNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(barkHash(i), barkHash(i + vec2(1.0, 0.0)), u.x), mix(barkHash(i + vec2(0.0, 1.0)), barkHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      if (closeDetail < 0.5) {
      } else if (vBarky > 3.5) {
        // Along the board, and across it on whichever face is seen.
        vec2 grainAt = vec2(vBarkOwn.x, vBarkOwn.y + vBarkOwn.z);
        float grainPixel = length(fwidth(grainAt));
        float grainNear = 1.0 - smoothstep(0.006, 0.025, grainPixel);
        float grainMid = 1.0 - smoothstep(0.02, 0.08, grainPixel);
        vec3 board = diffuseColor.rgb;
        float lines = barkNoise(vec2(grainAt.x * 0.9, grainAt.y * 46.0));
        board *= 1.0 + (lines - 0.5) * 0.3 * grainNear;
        float rings = sin((grainAt.y + 0.18 * barkNoise(vec2(grainAt.x * 0.6, 3.0))) * 70.0);
        board *= 1.0 - 0.1 * smoothstep(0.6, 1.0, rings) * grainMid;
        board *= 0.92 + 0.16 * barkNoise(grainAt * vec2(0.5, 3.0) + 8.0);
        vec2 knotCell = vec2(floor(grainAt.x / 2.2), 0.0);
        vec2 knot = (grainAt - vec2((knotCell.x + 0.3 + 0.4 * barkHash(knotCell)) * 2.2, 0.35 * (barkHash(knotCell + 3.0) - 0.5))) * vec2(0.6, 1.0);
        float knotted = step(0.45, barkHash(knotCell + 7.0)) * (1.0 - smoothstep(0.03, 0.06, length(knot))) * grainMid;
        board *= 1.0 - 0.5 * knotted;
        diffuseColor.rgb = board;
      } else if (vBarky > 2.5) {
        vec3 stoneUp = normalize(normal * mat3(viewMatrix));
        vec3 side = pow(abs(stoneUp), vec3(4.0));
        side /= side.x + side.y + side.z;
        vec3 p = vBarkAt;
        float stonePixel = length(fwidth(p));
        float stoneNear = 1.0 - smoothstep(0.015, 0.05, stonePixel);
        float stoneMid = 1.0 - smoothstep(0.05, 0.16, stonePixel);
        #define STONE_TRI(f, k) (barkNoise(p.yz * (k) + f) * side.x + barkNoise(p.xz * (k) + f) * side.y + barkNoise(p.xy * (k) + f) * side.z)
        vec3 stone = diffuseColor.rgb;
        // Where moss grows on it (its corners are green), the moss stays moss.
        float stoneBare = 1.0 - smoothstep(0.004, 0.03, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
        // Mottled at a hand's breadth, and the grain of the granite: dark and pale crystals.
        stone *= 0.86 + 0.28 * STONE_TRI(2.0, 1.6);
        float grain = STONE_TRI(9.0, 38.0);
        stone *= 1.0 + (smoothstep(0.62, 0.8, grain) * 0.3 - (1.0 - smoothstep(0.2, 0.36, grain)) * 0.35) * stoneNear;
        // Where rain runs down the sides: darker streaks, long and narrow.
        float streak = barkNoise(vec2((p.x + p.z) * 7.0, p.y * 0.7)) * (1.0 - side.y);
        stone *= 1.0 - 0.22 * smoothstep(0.55, 0.85, streak) * stoneMid;
        // Lichen: map lichen in yellow-green islands, crust lichen in pale rings, more on the tops.
        float map = smoothstep(0.7, 0.78, STONE_TRI(31.0, 2.6)) * stoneMid * (0.5 + 0.5 * side.y);
        stone = mix(stone, vec3(0.5, 0.55, 0.16) * (0.8 + 0.4 * STONE_TRI(5.0, 24.0)), 0.6 * map);
        float crust = STONE_TRI(47.0, 5.5) * 0.75 + STONE_TRI(13.0, 21.0) * 0.25;
        float ring = smoothstep(0.66, 0.7, crust) * (1.0 - smoothstep(0.72, 0.76, crust)) * stoneNear;
        stone = mix(stone, vec3(0.72, 0.73, 0.68) * dot(stone, vec3(0.33)) * 2.4, 0.22 * ring + 0.18 * smoothstep(0.7, 0.8, crust) * stoneMid);
        diffuseColor.rgb = mix(diffuseColor.rgb, stone, stoneBare);
      } else if (vBarky > 0.5) {
        // Round the tree and along it: up a stem, or along a bough that lies along the path.
        vec2 bark = vBarky < 1.5 ? vec2(vBarkAt.x + vBarkAt.z, vBarkAt.y) : vec2(vBarkAt.y + vBarkAt.z, vBarkAt.x);
        float barkPixel = length(fwidth(bark));
        float barkNear = 1.0 - smoothstep(0.012, 0.04, barkPixel);
        float barkMid = 1.0 - smoothstep(0.03, 0.1, barkPixel);
        // The scales: small plates of uneven size, each its own tone, with dark edges between them. Each row
        // is shifted by its own amount and the plates lean with the wood's wander, so no grid shows.
        vec2 scaleAt = vec2(bark.x * 15.0 + 0.35 * barkNoise(bark * vec2(4.0, 1.5)), bark.y * 6.5);
        scaleAt.x += barkHash(vec2(floor(scaleAt.y), 3.7)) * 7.0;
        vec2 inScale = fract(scaleAt) - 0.5;
        float scaleTone = barkHash(floor(scaleAt));
        float scaleSize = 0.36 + 0.12 * barkHash(floor(scaleAt) + 5.3);
        float scaleEdge = smoothstep(scaleSize, 0.5, length(inScale * vec2(1.0, 0.8)));
        vec3 barkColour = diffuseColor.rgb * (0.86 + 0.28 * scaleTone);
        barkColour *= 1.0 - 0.26 * scaleEdge * barkNear;
        // Long cracks with the wood, and the light and dark of the bark at a larger size.
        float crack = 1.0 - smoothstep(0.0, 0.05, abs(barkNoise(vec2(bark.x * 9.0, bark.y * 0.8)) - 0.5));
        barkColour *= 1.0 - 0.4 * crack * barkMid;
        barkColour *= 0.88 + 0.24 * barkNoise(bark * vec2(3.0, 0.9) + 4.0);
        // Crust lichen, grey-green, in small speckled patches.
        float lichenAt = barkNoise(bark * vec2(9.0, 5.0) + 17.0) * 0.7 + barkNoise(bark * 31.0) * 0.3;
        float lichen = smoothstep(0.7, 0.8, lichenAt) * barkNear;
        barkColour = mix(barkColour, vec3(0.36, 0.42, 0.28) * (0.75 + 0.5 * barkNoise(bark * 60.0)), 0.4 * lichen);
        diffuseColor.rgb = barkColour;
      }`);
  };
  material.needsUpdate = true;
}
