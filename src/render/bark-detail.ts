import { Float32BufferAttribute, type BufferGeometry, type MeshStandardMaterial } from 'three';

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
  material.customProgramCacheKey = () => `${key()}:bark-detail-v2`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = 'attribute float barky;\nvarying float vBarky;\nvarying vec3 vBarkAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vBarky = barky;
      vec4 barkWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        barkWorld = instanceMatrix * barkWorld;
      #endif
      vBarkAt = (modelMatrix * barkWorld).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = /* glsl */ `varying float vBarky;
      varying vec3 vBarkAt;
      float barkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float barkNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(barkHash(i), barkHash(i + vec2(1.0, 0.0)), u.x), mix(barkHash(i + vec2(0.0, 1.0)), barkHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ` + shader.fragmentShader.replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      if (vBarky > 0.5) {
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
