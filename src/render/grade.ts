import {
  BufferGeometry, Float32BufferAttribute, Mesh, OrthographicCamera, ShaderMaterial, Vector2, Vector3,
  type WebGLRenderTarget, type WebGLRenderer,
} from 'three';

/**
 * A place's colour grade (plan §5.4). The numbers act on linear light, before tone mapping.
 * They are parameters, so a grade can be tuned in review; Stage 0b bakes them into a LUT per place.
 */
export interface Grade {
  /** Multiplies red, green and blue: above 1 in red and below 1 in blue warms the picture. */
  tint: readonly [number, number, number];
  exposure: number;
  /** 1 leaves the contrast alone. It pivots on middle grey. */
  contrast: number;
  /** 1 leaves the colours alone; 0 is grey. */
  saturation: number;
  /** How much darker the corners are, 0 to 1. */
  vignette: number;
  /** Film grain, as a fraction of the brightness. */
  grain: number;
}

/** Gården at ten in the morning: low warm sun, bright greens, a soft vignette. */
export const GARDEN_MORNING: Grade = {
  tint: [1.03, 1.0, 0.96],
  exposure: 1.04,
  contrast: 1.06,
  saturation: 1.04,
  vignette: 0.3,
  grain: 0.025,
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 tint;
  uniform float exposure;
  uniform float contrast;
  uniform float saturation;
  uniform float vignette;
  uniform float grain;
  uniform float seed;
  uniform float glow;
  uniform vec2 texel;
  varying vec2 vUv;

  // What is brighter than white in the picture before it is graded: the candy's glitter, a glint, the sun
  // on something pale, the northern lights.
  vec3 bright(vec2 uv) {
    return max(texture2D(tDiffuse, uv).rgb - GLOW_FROM, 0.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 scene = texture2D(tDiffuse, vUv).rgb;
    // The glow of High (plan §6.5): light spills a little round what is brightest. Two rings of eight
    // samples, the outer one turned half a step, read from the same picture: no buffer of its own.
    if (glow > 0.0) {
      vec3 spill = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853982;
        spill += bright(vUv + vec2(cos(a), sin(a)) * texel * 5.0) * 0.075;
        spill += bright(vUv + vec2(cos(a + 0.3926991), sin(a + 0.3926991)) * texel * 13.0) * 0.05;
      }
      scene += spill * glow;
    }
    vec3 colour = scene * exposure * tint;
    float light = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    colour = mix(vec3(light), colour, saturation);
    colour = (colour - 0.18) * contrast + 0.18;
    colour *= 1.0 - vignette * smoothstep(0.3, 0.95, length(vUv - 0.5) * 1.35);
    colour += (hash(vUv * 937.0 + seed) - 0.5) * grain * (0.2 + light);
    gl_FragColor = vec4(max(colour, 0.0), 1.0);
  }
`;

/** What WebGLRenderer.setEffects() takes in r186: it reads one buffer and draws into the other. */
export interface Effect {
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void;
  setSize(width: number, height: number): void;
}

/** The grading pass, which can also glow. */
export interface GradePass extends Effect {
  /** How strongly light spills round what is brightest: 0 is off, as on Mid. */
  setGlow(strength: number): void;
}

/** In linear light, 1 is white. What glows is what is nearly that bright and brighter: the sun on something pale, a lit window, a glint. */
export const GLOW_FROM = 0.72;
/** High's glow. Gentle: it must never read as a haze over the picture. */
export const GLOW_ON_HIGH = 0.6;

/**
 * The one grading pass of Mid and High (plan §6.5): grade, vignette and grain in a single full-screen draw,
 * and on High a glow round what is brightest. Tone mapping and the sRGB conversion are applied by the
 * renderer after it. The glow is switched by a number, so going between Mid and High compiles nothing.
 */
export function createGradePass(grade: Grade): GradePass {
  const material = new ShaderMaterial({
    defines: { GLOW_FROM: GLOW_FROM.toFixed(3) },
    uniforms: {
      glow: { value: 0 },
      texel: { value: new Vector2(1 / 1280, 1 / 720) },
      tDiffuse: { value: null },
      tint: { value: new Vector3(...grade.tint) },
      exposure: { value: grade.exposure },
      contrast: { value: grade.contrast },
      saturation: { value: grade.saturation },
      vignette: { value: grade.vignette },
      grain: { value: grade.grain },
      seed: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  // One triangle that covers the screen: cheaper than a quad, and it has no seam.
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(geometry, material);
  triangle.frustumCulled = false;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    render(renderer, writeBuffer, readBuffer) {
      material.uniforms.tDiffuse!.value = readBuffer.texture;
      (material.uniforms.texel!.value as Vector2).set(1 / Math.max(1, readBuffer.width), 1 / Math.max(1, readBuffer.height));
      // The grain moves a little each frame, like film. It is far too faint to flicker.
      material.uniforms.seed!.value = (material.uniforms.seed!.value + 0.371) % 97;
      renderer.setRenderTarget(writeBuffer);
      renderer.render(triangle, camera);
    },
    // The pass has no buffers of its own. The glow's reach is counted in pixels of the picture it reads.
    setSize(width, height) {
      (material.uniforms.texel!.value as Vector2).set(1 / Math.max(1, width), 1 / Math.max(1, height));
    },
    setGlow(strength) {
      material.uniforms.glow!.value = Math.max(0, strength);
    },
  };
}
