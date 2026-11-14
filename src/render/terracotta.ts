import type { MeshStandardMaterial } from 'three';
import { CLOSE_DETAIL, GROUND_SKY, GROUND_WET } from './ground-detail';
import { BREATH, WIND } from './wind';

/**
 * Terracotta seen close (Olov, 14 November 2026: "Krukorna som syns när stormbyarna kommer behöver modelleras bättre och
 * få bättre texturer"). The flower pots come from Blender in a material of their own (`kit-clay`, art/blender/a2-props.py),
 * their broad colours painted on their corners: clay, white where lime has bloomed out of it, green where moss grows.
 * Each corner of the clay also says where on its own pot it is (`_CLAY`, in the pot's own space). A pot is as tall as he
 * is, so its corners are far apart on the screen: this draws what lies between them, on Mid and High (`CLOSE_DETAIL`),
 * fading what would be finer than a pixel or two:
 * - the clay: uneven a hand's breadth across, the faint rings the potter's hands left round it and a deeper one here and
 *   there, its grit, small pits and pale grains, with a little relief for the light to rake;
 * - the lime as a broken, powdery bloom, and the moss in tufts, where the corners' colours say
 *   they are (lime is pale and grey beside the clay, moss is green: the kit's colours and this file go together);
 * - dark runs where the rain goes down it.
 * In the rain (`GROUND_WET`) the clay is darker and has a sheen, most where it faces the sky and the wind and in the
 * runs, and gives back a little of the sky where it is looked along. Dry (Gården's and Byn's lawns by day), it is not.
 *
 * What is not clay (`_CLAY.z` below zero: the soil, what grows in it, the water in a saucer) keeps its painted colours
 * and says instead how much it sways and how wet it is: what grows sways with the place's wind (./wind.ts), the more the
 * higher up it is, and is laid over in a gust; water lies smooth and gives back the sky.
 */
const TERRACOTTA = /* glsl */ `
  float clayHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float clayNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(clayHash(i), clayHash(i + vec3(1, 0, 0)), u.x), mix(clayHash(i + vec3(0, 1, 0)), clayHash(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(clayHash(i + vec3(0, 0, 1)), clayHash(i + vec3(1, 0, 1)), u.x), mix(clayHash(i + vec3(0, 1, 1)), clayHash(i + vec3(1, 1, 1)), u.x), u.y), u.z);
  }
`;

/** What a corner says of where on its pot it is, is in this many EL (the kit's CLAY_SPAN), so that it packs small. */
const CLAY_SPAN = 2.5;

const patched = new WeakSet<MeshStandardMaterial>();

/** Gives a kit's clay material (`kit-clay`) its grain, its bloom, its moss and its wet, and its plants their sway. */
export function terracotta(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:terracotta-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.clayDetail = CLOSE_DETAIL;
    shader.uniforms.clayRain = GROUND_WET;
    shader.uniforms.claySky = GROUND_SKY;
    shader.uniforms.windTime = WIND.windTime;
    shader.uniforms.windAir = WIND.windAir;
    shader.uniforms.windGust = WIND.windGust;
    shader.vertexShader = /* glsl */ `attribute vec3 _clay;
      varying vec3 vClay;
      varying vec3 vClayAt;
      uniform float windTime;
      uniform vec2 windAir;
      uniform vec3 windGust;
      ` + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      vClay = _clay;
      vClayAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>
      // What grows in the pot goes with the wind (as ./wind.ts moves the grass): it sways where it stands, leans as a
      // breath passes and is laid over to the left in a gust, and its tips flutter.
      if (_clay.z < -0.5 && _clay.x > 0.0) {
        float along = vClayAt.x;
        float pass = fract((windTime - along / ${BREATH.speed.toFixed(1)}) / ${BREATH.every.toFixed(1)});
        float lean = windAir.y * smoothstep(0.0, 0.12, pass) * (1.0 - smoothstep(0.12, 0.5, pass))
          + windGust.z * smoothstep(windGust.x - 3.0, windGust.x, along) * (1.0 - smoothstep(windGust.y, windGust.y + 3.0, along));
        float push = windAir.x * ((0.6 * sin(windTime * 1.7 + along * 0.9 + vClayAt.z * 2.0) + 0.4 * sin(windTime * 0.63 + along * 0.21)) * (1.0 + 0.8 * abs(lean)) + 2.5 * lean);
        float flutter = windAir.x * sin(windTime * 11.0 + vClayAt.x * 5.0 + vClayAt.y * 4.0) * (0.25 + 0.5 * abs(lean));
        vec3 moved = vec3(push * 0.075 + flutter * 0.02, -abs(push) * 0.022, flutter * 0.012) * _clay.x;
        mvPosition.xyz += (viewMatrix * vec4(moved, 0.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }`);
    shader.fragmentShader = /* glsl */ `varying vec3 vClay;
      varying vec3 vClayAt;
      uniform float clayDetail, clayRain;
      uniform vec3 claySky;
      ${TERRACOTTA}
      ` + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
      {
        vec3 c = diffuseColor.rgb;
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        if (vClay.z > -0.5) {
          vec3 p = vClay * ${CLAY_SPAN.toFixed(1)};
          vec3 clayUp = normalize(normal * mat3(viewMatrix));
          // What its corners' colours say: lime is pale and grey beside the clay, moss is green.
          float red = max(c.r, 1e-4);
          float limed = clamp((c.b / red - 0.14) / 0.2, 0.0, 1.0);
          float mossy = clamp(((c.g - c.b) / red - 0.22) / 0.15, 0.0, 1.0);
          // The rain wets what faces the sky and the wind most.
          float wet = clamp(0.3 + 0.4 * max(clayUp.y, 0.0) + 0.3 * max(clayUp.x, 0.0), 0.0, 1.0);
          if (clayDetail > 0.5) {
            float pixel = max(length(fwidth(p)), 1e-4);
            float near = 1.0 - smoothstep(0.012, 0.05, pixel);
            float mid = 1.0 - smoothstep(0.04, 0.16, pixel);
            // The clay itself, uneven a hand's breadth across; the faint rings the potter's hands left round it, and
            // a deeper one here and there.
            float mottle = clayNoise(p * 3.2 + 9.0) * 0.6 + clayNoise(p * 8.0) * 0.4;
            float ring = sin(p.z * 150.0 + 3.0 * clayNoise(p * 2.6));
            float groove = smoothstep(0.9, 1.0, sin(p.z * 7.3 + 5.0 * clayNoise(p * 0.9 + 4.0)));
            c *= (0.87 + 0.26 * mottle) * (1.0 + 0.011 * ring * near - 0.06 * groove * mid);
            // Its grit, small pits, and pale grains of sand fired into it.
            float grit = clayNoise(p * 41.0);
            float pits = smoothstep(0.82, 0.9, clayNoise(p * 19.0 + 7.0));
            float grain = smoothstep(0.86, 0.93, clayNoise(p * 29.0 + 19.0));
            c *= 1.0 + 0.14 * (grit - 0.5) * near - 0.22 * pits * near;
            c = mix(c, c * 1.35 + 0.02, 0.45 * grain * near);
            // Lime: white and powdery, broken into clouds, the clay showing through it.
            float cloud = clayNoise(p * 4.5 + 3.0) * 0.5 + clayNoise(p * 11.0 + 1.0) * 0.3 + clayNoise(p * 27.0) * 0.2;
            float bloom = limed * (0.14 + 0.46 * smoothstep(0.38, 0.62, cloud)) * (0.75 + 0.5 * clayNoise(p * 33.0 + 2.0)) * mid;
            c = mix(c, vec3(0.8, 0.77, 0.7) * (0.8 + 0.25 * clayNoise(p * 33.0)), bloom * (1.0 - 0.3 * clayRain));
            // Moss in small tufts, darker in its hollows.
            float tuft = clayNoise(p * 9.0 + 11.0) * 0.55 + clayNoise(p * 23.0 + 5.0) * 0.45;
            float green = smoothstep(0.54, 0.68, mossy * 0.75 + tuft * 0.5) * mid;
            c = mix(c, vec3(0.1, 0.17, 0.045) * (0.55 + 1.1 * clayNoise(p * 37.0)), 0.85 * green);
            // The rain runs down it in dark streaks, wherever it lies.
            float run = smoothstep(0.52, 0.72, clayNoise(vec3(vClayAt.x * 5.5, vClayAt.y * 0.45, vClayAt.z * 5.5) + 3.0)) * (1.0 - green) * mid;
            wet = clamp(wet + 0.45 * run - 0.4 * bloom + 0.2 * green, 0.0, 1.0);
            // A little relief for the light to rake: the grit, the pits and the grooves. Not where it is looked along.
            float relief = (0.0003 * ring + 0.005 * grit - 0.01 * pits - 0.008 * groove + 0.006 * green) * near;
            vec3 clayX = dFdx(-vViewPosition), clayY = dFdy(-vViewPosition);
            vec3 clayR1 = cross(clayY, normal), clayR2 = cross(normal, clayX);
            float clayDet = dot(clayX, clayR1);
            vec3 raked = abs(clayDet) * normal - sign(clayDet) * (dFdx(relief) * clayR1 + dFdy(relief) * clayR2);
            if (dot(raked, raked) > 1e-20) normal = normalize(mix(normal, normalize(raked), smoothstep(0.15, 0.45, facing)));
          }
          // Wet clay is darker and has a sheen, and gives back a little of the sky where it is looked along.
          c *= 1.0 - 0.3 * wet * clayRain;
          roughnessFactor = mix(roughnessFactor, 0.34, 0.9 * wet * clayRain);
          totalEmissiveRadiance += claySky * clayRain * wet * pow(1.0 - facing, 5.0) * 0.08;
        } else {
          // Soil and leaves are wet in the rain; water (wet all through) lies smooth and gives back the sky.
          float wet = vClay.y;
          float pool = smoothstep(0.9, 1.0, wet);
          roughnessFactor = mix(roughnessFactor, mix(0.5, 0.06, pool), wet * mix(clayRain, 1.0, pool));
          totalEmissiveRadiance += claySky * (0.05 * wet * clayRain + 0.5 * pool) * (0.25 + 0.75 * pow(1.0 - facing, 5.0));
        }
        diffuseColor.rgb = c;
      }`);
  };
  material.needsUpdate = true;
}
