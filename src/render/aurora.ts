import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, Vector3, type PerspectiveCamera } from 'three';
import { drawnWhile } from './idle';

/**
 * The northern lights (plan §3.4, the final; visual audit, berget-and-norrsken rows 5 and 21): two curtains in
 * the upper sky. Broad folds travel through a soft lower hem, with finer rays streaming up the fabric.
 * Patches of light move through the folds: pale green at the hem, turquoise within and violet at the tips.
 * The left third of the sky is left to the afterglow and the stars.
 *
 * It is drawn as the stars are, at the far plane in the picture's own space, so that the ridges and everything
 * else stand in front of it. It is as far away as the sky: the camera's travel does not move it, only its tilt.
 * One draw, additive, built at the start and unseen until night falls, so no shader is compiled when it flares.
 */
export function createAurora() {
  const geometry = new BufferGeometry();
  // The picture from a little below its middle line up: the lights never hang lower than the far ridges.
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -0.25, 0, 1, -0.25, 0, 1, 1, 0, -1, -0.25, 0, 1, 1, 0, -1, 1, 0], 3));
  const uniforms = { time: { value: 0 }, strength: { value: 0 }, view: { value: new Vector3(1, 0.27, 0) } };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform vec3 view;
      varying vec2 sky;
      void main() {
        gl_Position = vec4(position.xy, 1.0, 1.0);
        // Where the pixel looks, as a slope: along the horizon, and up from it.
        sky = vec2(position.x * view.x, position.y * view.y + view.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time, strength;
      varying vec2 sky;
      float hash(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
      float noise(float x) { float i = floor(x), f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
      vec3 curtain(float x, float base, float tall, float seed, float from, float to) {
        // One coherent ribbon, folded at different scales. Its shape visibly travels over a few seconds;
        // the fine strands follow those folds instead of boiling as unrelated noise at each pixel.
        float flow = x + 0.035 * sin(x * 4.0 + seed - time * 0.19);
        float turn = sin(flow * 8.0 + seed * 2.0 - time * 0.24);
        float folds = exp(-turn * turn * 9.0);
        float border = base + 0.034 * sin(flow * 4.3 + seed + time * 0.21)
          + 0.012 * sin(flow * 12.0 - seed - time * 0.34) - 0.018 * folds;
        float h = sky.y - border;
        float up = max(h, 0.0);
        float strand = flow + up * (0.12 * sin(flow * 6.0 + seed - time * 0.16));
        float rays = 0.22 + 0.78 * noise(strand * 76.0 + seed * 9.0 - time * 0.7)
          * (0.45 + 0.55 * noise(strand * 185.0 + seed - time * 1.1));
        float travelling = 0.64 + 0.36 * noise(flow * 7.0 - time * 0.18 + seed * 3.0);
        float along = smoothstep(from, from + 0.12, x) * (1.0 - smoothstep(to - 0.2, to, x));
        float lit = smoothstep(-0.006, 0.006, h) * along * travelling * (0.65 + 0.75 * folds);
        float reach = tall * (0.75 + 0.65 * rays + 0.65 * folds);
        float body = rays * exp(-up / reach);
        float edge = exp(-up / 0.012);
        float violet = smoothstep(0.75, 1.9, h / tall) * exp(-up / (tall * 2.6)) * (0.35 + 0.65 * rays);
        vec3 green = mix(vec3(0.065, 0.9, 0.29), vec3(0.07, 0.72, 0.66), smoothstep(0.25, 1.5, h / tall));
        return lit * (body * green + edge * rays * vec3(0.36, 0.63, 0.43)
          + violet * vec3(0.4, 0.085, 0.82) * 0.55);
      }
      void main() {
        vec3 light = curtain(sky.x, 0.115, 0.075, 1.0, -0.16, 0.95) + 0.6 * curtain(sky.x * 0.9 + 0.3, 0.175, 0.06, 4.0, 0.12, 1.4);
        gl_FragColor = vec4(light * strength, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
  });
  material.customProgramCacheKey = () => 'aurora-v2';
  const mesh = new Mesh(geometry, material);
  mesh.name = 'aurora';
  mesh.frustumCulled = false;
  mesh.renderOrder = -3;
  // The picture's own slopes: how wide and tall a view the lens takes in, and how far it looks up or down.
  const forward = new Vector3();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    const lens = camera as PerspectiveCamera;
    const slope = Math.tan((lens.fov * Math.PI) / 360);
    lens.getWorldDirection(forward);
    uniforms.view.value.set(slope * lens.aspect, slope, forward.y / Math.max(0.2, Math.hypot(forward.x, forward.z)));
  };
  drawnWhile(mesh, false);
  return {
    mesh,
    /** `k` is how far night has fallen; `most` caps the light, lower where the picture is drawn without HDR. */
    update(k: number, clock: number, most: number) {
      uniforms.time.value = clock;
      // Movement lives within the curtains; the whole sky never flashes brighter and darker in unison.
      uniforms.strength.value = k * most;
      drawnWhile(mesh, k > 0);
    },
  };
}
