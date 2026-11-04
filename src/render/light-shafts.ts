import {
  BufferGeometry, Color, Float32BufferAttribute, Mesh, OrthographicCamera, RedFormat, ShaderMaterial, UnsignedByteType,
  Vector2, Vector3, Vector4, WebGLRenderTarget, type Camera, type PerspectiveCamera, type Scene, type WebGLRenderer,
} from 'three';
import type { GradePass } from './grade';

/**
 * The light shafts of Mid and High (docs/visual-upgrade.md, an exception Olov made to plan §5.3): no ray marching,
 * only a radial blur on the screen. At a quarter of the picture's width and height, one pass marks where the sky
 * and the far light are (nothing nearer wrote its depth there, and it is bright), and two passes smear that mark
 * towards the sun, the second sixteen times as long as the first. Where trunks and crowns stand in the way the
 * light is cut into shafts. The grade adds them to the picture, before its colour grade, in the place's light.
 *
 * What a chapter asks of the air each frame (how strong, what colour, where the light is, and the haze) is written
 * by its atmosphere (./lift/atmosphere.ts) on the scene, so that the view only draws: `AIR_KEY` on `scene.userData`.
 */
export interface AirAsk {
  /** How strong the shafts are now: 0 draws none. */
  strength: number;
  /** Their colour in linear light, before the strength. Pale and warm: never red, pink or gold. */
  colour: Color;
  /** Where the light comes from: the sun's direction, as `sun.position` has it. */
  from: Vector3;
  /** A light that stands in the picture (the moon in the storm's eye), in place of `from`; null for none. */
  at: Vector3 | null;
  /** Where a sun painted in the sky stands in the picture (0 to 1 across and up), in place of both; null for none. */
  screen: Vector2 | null;
  /** How bright the far light must be to count, in linear light: from nothing at x to all at y. */
  cut: Vector2;
  /** The haze that takes what is far (linear, live), and how: start and end (EL behind the play plane), on what stands, on the far layers. */
  haze: Color;
  hazeShape: Vector4;
  /** Where the ground is under him, and over how many EL the haze thins upwards. */
  ground: number;
  thins: number;
}
export const AIR_KEY = 'air';

/** A quarter of the picture's width and height: a sixteenth of its pixels, one byte each. */
export const SHAFT_SCALE = 4;
/** Taps a blur pass: two passes give 16 × 16 steps along a ray. */
const TAPS = 16;
/** How far a ray reaches, as a share of the picture's height. */
const REACH = 0.62;
/** How much the last pass deepens the dark between the shafts. */
const CURVE = 1.6;
/** The shafts fall down, slanting no more than this from the upright (the cards' slant, ./dressing/effects.ts). */
const SLANT = 0.56;

const VERTEX = /* glsl */ `varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Where the far light is: nothing near wrote depth there (or it is very far), and it is bright. */
const MASK = /* glsl */ `
  uniform sampler2D tDiffuse, tDepth;
  uniform vec2 texel, cut;
  uniform vec3 depthCamera;
  varying vec2 vUv;
  float light(vec2 uv) {
    float d = texture2D(tDepth, uv).r;
    float far = depthCamera.x * depthCamera.y / (depthCamera.y - (depthCamera.y - depthCamera.x) * min(d, 0.99999));
    float open = max(step(0.99999, d), smoothstep(45.0, 90.0, far));
    return open * smoothstep(cut.x, cut.y, dot(texture2D(tDiffuse, uv).rgb, vec3(0.2126, 0.7152, 0.0722)));
  }
  void main() {
    vec2 o = texel * 1.5;
    float m = light(vUv + vec2(-o.x, -o.y)) + light(vUv + vec2(o.x, -o.y)) + light(vUv + vec2(-o.x, o.y)) + light(vUv + o);
    gl_FragColor = vec4(m * 0.25, 0.0, 0.0, 1.0);
  }`;

/** The light smeared towards the sun: nearer taps weigh more, so a shaft is brightest just under its gap. */
const RAYS = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 sun;
  uniform float aspect, reach, decay, curve;
  varying vec2 vUv;
  void main() {
    vec2 toward = sun - vUv;
    float far = length(toward * vec2(aspect, 1.0));
    vec2 step = toward / max(far, 1e-4) * min(far, reach) / ${TAPS.toFixed(1)};
    vec2 uv = vUv;
    float sum = 0.0, weight = 1.0, total = 0.0;
    for (int i = 0; i < ${TAPS}; i++) {
      sum += texture2D(tDiffuse, uv).r * weight;
      total += weight;
      weight *= decay;
      uv += step;
    }
    // The last pass deepens the gaps between the shafts, so that they are beams and not a glow.
    gl_FragColor = vec4(pow(sum / total, curve), 0.0, 0.0, 1.0);
  }`;

function screenPass(material: ShaderMaterial) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(geometry, material);
  triangle.frustumCulled = false;
  return triangle;
}

/**
 * Where the light stands on the screen, in the picture's own coordinates (0 to 1 across and up). The sun stands
 * behind the scene, high to one side and mostly out of the picture: it is put at least a picture's height above its
 * middle, and turned so that the shafts slant no more than SLANT from the upright.
 */
export function sunOnScreen(camera: PerspectiveCamera, from: Vector3, at: Vector3 | null, out: Vector2, screen: Vector2 | null = null): Vector2 {
  if (screen) return out.copy(screen);
  const tan = Math.tan((camera.fov * Math.PI) / 360);
  const v = at ? out3.copy(at).applyMatrix4(camera.matrixWorldInverse) : out3.copy(from).transformDirection(camera.matrixWorldInverse);
  // Across and up from the middle, in picture heights.
  let x: number, y: number;
  if (v.z < -0.05) {
    x = v.x / -v.z / tan / 2;
    y = v.y / -v.z / tan / 2;
  } else {
    const k = 8 / Math.max(1e-4, Math.hypot(v.x, v.y));
    x = v.x * k;
    y = v.y * k;
  }
  if (!at) {
    const far = Math.min(3, Math.max(1, Math.hypot(x, y)));
    const turn = Math.max(-SLANT, Math.min(SLANT, Math.atan2(x, Math.max(1e-3, y))));
    x = Math.sin(turn) * far;
    y = Math.cos(turn) * far;
  }
  return out.set(0.5 + x / camera.aspect, 0.5 + y);
}
const out3 = new Vector3();

export function createLightShafts() {
  let mask: WebGLRenderTarget | null = null;
  let rays: WebGLRenderTarget | null = null;
  const marking = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null }, tDepth: { value: null }, texel: { value: new Vector2(1, 1) },
      cut: { value: new Vector2(0.3, 1) }, depthCamera: { value: new Vector3(0.1, 140, 10) },
    },
    vertexShader: VERTEX, fragmentShader: MASK, depthTest: false, depthWrite: false,
  });
  // Both blur passes are one program, with their own reach and decay.
  const smearing = new ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, sun: { value: new Vector2(0, 2) }, aspect: { value: 1 }, reach: { value: REACH }, decay: { value: 0.97 }, curve: { value: 1 } },
    vertexShader: VERTEX, fragmentShader: RAYS, depthTest: false, depthWrite: false,
  });
  const marks = screenPass(marking);
  const smears = screenPass(smearing);
  const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const sun = new Vector2();
  const light = new Color();
  const shape = new Vector4();
  const eye = new Vector4();
  const target = () => new WebGLRenderTarget(1, 1, { format: RedFormat, type: UnsignedByteType, depthBuffer: false, stencilBuffer: false });

  return {
    get texture() { return rays?.texture ?? null; },
    /** Mid and High only: Low has no HDR picture to read. */
    setSize(width: number, height: number, enabled: boolean) {
      if (!enabled) {
        mask?.dispose();
        rays?.dispose();
        mask = rays = null;
        return;
      }
      const w = Math.max(1, Math.ceil(width / SHAFT_SCALE)), h = Math.max(1, Math.ceil(height / SHAFT_SCALE));
      mask ??= target();
      rays ??= target();
      mask.texture.name = 'light-shaft-mask';
      rays.texture.name = 'light-shafts';
      mask.setSize(w, h);
      rays.setSize(w, h);
      (marking.uniforms.texel!.value as Vector2).set(1 / width, 1 / height);
    },
    /**
     * Draws this frame's shafts from the HDR scene and hands them, with the haze, to the grade. Three small draws,
     * none where the air asks for no shafts; `warm` draws them all the same, so that their shaders are made then.
     */
    render(renderer: WebGLRenderer, read: WebGLRenderTarget, camera: Camera, scene: Scene, grade: GradePass, warm = false) {
      const ask = scene.userData[AIR_KEY] as AirAsk | undefined;
      const lens = camera as PerspectiveCamera;
      if (!ask || !read.depthTexture || !lens.isPerspectiveCamera) { grade.setAir(null); return; }
      const near = lens.near, far = lens.far;
      shape.set(lens.position.z + ask.hazeShape.x, lens.position.z + ask.hazeShape.y, ask.hazeShape.z, ask.hazeShape.w);
      eye.set(lens.position.y, Math.tan((lens.fov * Math.PI) / 360), ask.ground, ask.thins);
      const drawn = !!(mask && rays) && (ask.strength > 0.002 || warm);
      light.copy(ask.colour).multiplyScalar(drawn ? ask.strength : 0);
      grade.setAir({ shafts: drawn ? rays!.texture : null, light, haze: ask.haze, shape, eye });
      if (!drawn) return;
      marking.uniforms.tDiffuse!.value = read.texture;
      marking.uniforms.tDepth!.value = read.depthTexture;
      (marking.uniforms.cut!.value as Vector2).copy(ask.cut);
      (marking.uniforms.depthCamera!.value as Vector3).set(near, far, lens.position.z);
      renderer.setRenderTarget(mask);
      renderer.render(marks, screen);
      sunOnScreen(lens, ask.from, ask.at, sun, ask.screen);
      (smearing.uniforms.sun!.value as Vector2).copy(sun);
      smearing.uniforms.aspect!.value = lens.aspect;
      // First short steps, then long ones: together 256 even taps along each ray.
      smearing.uniforms.tDiffuse!.value = mask!.texture;
      smearing.uniforms.reach!.value = REACH / TAPS;
      smearing.uniforms.decay!.value = 0.985;
      smearing.uniforms.curve!.value = 1;
      renderer.setRenderTarget(rays);
      renderer.render(smears, screen);
      // The second pass reads the first and writes over the mask, which is not needed any more.
      smearing.uniforms.tDiffuse!.value = rays!.texture;
      smearing.uniforms.reach!.value = REACH;
      smearing.uniforms.decay!.value = 0.93;
      smearing.uniforms.curve!.value = CURVE;
      renderer.setRenderTarget(mask);
      renderer.render(smears, screen);
      [mask, rays] = [rays, mask];
      grade.setAir({ shafts: rays!.texture, light, haze: ask.haze, shape, eye });
    },
  };
}
export type LightShafts = ReturnType<typeof createLightShafts>;
