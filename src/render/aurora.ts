import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, Vector3, type PerspectiveCamera } from 'three';
import { drawnWhile } from './idle';

/**
 * The northern lights (plan §3.4, the final; visual audit, berget-and-norrsken rows 5 and 21): two curtains in
 * the upper sky. Each hangs from a sharp lower border that snakes slowly, with upright rays drifting along it,
 * brighter seams where it folds, pale green at the border, green through the middle and violet at the top.
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
        // The lower border swings slowly, and dips where the ribbon folds towards us: there its light bunches
        // into a bright seam. The rays drift along it.
        float turn = sin(x * 6.5 + seed * 2.0 + time * 0.035);
        float folds = exp(-turn * turn * 14.0);
        float border = base + 0.028 * sin(x * 3.7 + seed + time * 0.05) + 0.01 * sin(x * 11.0 - seed - time * 0.09) - 0.018 * exp(-turn * turn * 40.0);
        float h = sky.y - border;
        float rays = 0.25 + 0.75 * noise(x * 70.0 + seed * 9.0 - time * 0.5) * (0.4 + 0.6 * noise(x * 190.0 + seed - time * 0.9));
        float along = smoothstep(from, from + 0.12, x) * (1.0 - smoothstep(to - 0.2, to, x));
        float lit = smoothstep(-0.003, 0.004, h) * along * (0.75 + 1.1 * folds);
        float reach = tall * (0.5 + 0.9 * rays + 0.8 * folds);
        float green = rays * exp(-max(h, 0.0) / reach);
        float edge = exp(-max(h, 0.0) / 0.01);
        float violet = smoothstep(1.0, 2.2, h / tall) * exp(-max(h, 0.0) / (tall * 3.0)) * (0.4 + 0.6 * rays);
        return lit * (green * vec3(0.074, 1.0, 0.33) + edge * rays * vec3(0.5, 0.9, 0.55) + violet * vec3(0.42, 0.06, 1.0) * 0.4);
      }
      void main() {
        vec3 light = curtain(sky.x, 0.115, 0.075, 1.0, -0.16, 0.95) + 0.6 * curtain(sky.x * 0.9 + 0.3, 0.175, 0.06, 4.0, 0.12, 1.4);
        gl_FragColor = vec4(light * strength, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
  });
  material.customProgramCacheKey = () => 'aurora-v1';
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
      uniforms.strength.value = k * most * (0.88 + 0.12 * Math.sin(clock * 0.9));
      drawnWhile(mesh, k > 0);
    },
  };
}
