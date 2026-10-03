import {
  BufferGeometry, Float32BufferAttribute, Mesh, OrthographicCamera, ShaderMaterial, Vector3,
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
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 colour = texture2D(tDiffuse, vUv).rgb * exposure * tint;
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

/**
 * The one grading pass of Mid and High (plan §6.5): grade, vignette and grain in a single full-screen draw.
 * Tone mapping and the sRGB conversion are applied by the renderer after it.
 */
export function createGradePass(grade: Grade): Effect {
  const material = new ShaderMaterial({
    uniforms: {
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
      // The grain moves a little each frame, like film. It is far too faint to flicker.
      material.uniforms.seed!.value = (material.uniforms.seed!.value + 0.371) % 97;
      renderer.setRenderTarget(writeBuffer);
      renderer.render(triangle, camera);
    },
    // The pass has no buffers of its own, so there is nothing to resize.
    setSize() {},
  };
}
