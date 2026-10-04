import {
  BufferGeometry, Data3DTexture, DataUtils, Float32BufferAttribute, HalfFloatType, LinearFilter, Mesh, OrthographicCamera, RGBAFormat, ShaderMaterial, Vector2, Vector3,
  type Material, type Object3D, type Texture,
  type WebGLRenderTarget, type WebGLRenderer,
} from 'three';

/**
 * A place's colour grade (plan §5.4). The numbers act on linear light, before tone mapping.
 * They are baked into a small linear-light 3D LUT at chapter creation, so review can tune each place.
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

/** A half-float 32³ lookup: 256 KiB, generated locally and never downloaded. */
export const LUT_SIZE = 32;
export const LUT_RANGE = 16;

/** Unclipped linear result: preserving negative corners makes interpolation exact for this affine grade. */
export function gradeColour(rgb: readonly number[], grade: Grade): [number, number, number] {
  const colour = rgb.map((v, i) => v * grade.exposure * grade.tint[i]!);
  const light = colour[0]! * 0.2126 + colour[1]! * 0.7152 + colour[2]! * 0.0722;
  return colour.map((v) => ((light + (v - light) * grade.saturation) - 0.18) * grade.contrast + 0.18) as [number, number, number];
}

export function createGradeLut(grade: Grade): Data3DTexture {
  const data = new Uint16Array(LUT_SIZE ** 3 * 4);
  let i = 0;
  for (let b = 0; b < LUT_SIZE; b++) for (let g = 0; g < LUT_SIZE; g++) for (let r = 0; r < LUT_SIZE; r++) {
    const colour = gradeColour([r, g, b].map((v) => v * LUT_RANGE / (LUT_SIZE - 1)), grade);
    for (const value of colour) data[i++] = DataUtils.toHalfFloat(value);
    data[i++] = DataUtils.toHalfFloat(1);
  }
  const texture = new Data3DTexture(data, LUT_SIZE, LUT_SIZE, LUT_SIZE);
  texture.name = 'place-grade-lut';
  texture.format = RGBAFormat;
  texture.type = HalfFloatType;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Low has no framebuffer pass: apply the same place transform before the material's Neutral/sRGB output. */
export function createMaterialGrade(grade: Grade) {
  const enabled = { value: 0 };
  const patched = new WeakSet<Material>();
  const uniforms = {
    placeGradeEnabled: enabled, placeTint: { value: new Vector3(...grade.tint) },
    placeExposure: { value: grade.exposure }, placeContrast: { value: grade.contrast },
    placeSaturation: { value: grade.saturation },
  };
  return {
    setEnabled(on: boolean) { enabled.value = on ? 1 : 0; },
    apply(root: Object3D) {
      root.traverse((object) => {
        const material = (object as Mesh).material;
        for (const one of material ? (Array.isArray(material) ? material : [material]) : []) {
          if (patched.has(one)) continue;
          patched.add(one);
          const before = one.onBeforeCompile;
          const key = one.customProgramCacheKey.bind(one);
          one.customProgramCacheKey = () => `${key()}:place-grade-v1`;
          one.onBeforeCompile = (shader, renderer) => {
            before.call(one, shader, renderer);
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = `uniform float placeGradeEnabled;
              uniform vec3 placeTint;
              uniform float placeExposure, placeContrast, placeSaturation;
              ` + shader.fragmentShader;
            const point = shader.fragmentShader.includes('#include <tonemapping_fragment>')
              ? '#include <tonemapping_fragment>' : '#include <colorspace_fragment>';
            shader.fragmentShader = shader.fragmentShader.replace(point, `
              if (placeGradeEnabled > 0.5) {
                vec3 graded = gl_FragColor.rgb * placeExposure * placeTint;
                float light = dot(graded, vec3(0.2126, 0.7152, 0.0722));
                graded = mix(vec3(light), graded, placeSaturation);
                gl_FragColor.rgb = max((graded - 0.18) * placeContrast + 0.18, 0.0);
              }
              ` + point);
          };
          one.needsUpdate = true;
        }
      });
    },
  };
}

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
  uniform sampler3D tLut;
  uniform float lutOffset;
  uniform sampler2D tBlur;
  uniform sampler2D tDepth;
  uniform float blurEnabled;
  uniform vec3 depthCamera;
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
    if (blurEnabled > 0.5) {
      float d = texture2D(tDepth, vUv).r;
      float z = depthCamera.z + depthCamera.x * depthCamera.y / ((depthCamera.y - depthCamera.x) * d - depthCamera.y);
      float mask = smoothstep(1.8, 4.5, -z) * (1.0 - smoothstep(16.0, 24.0, -z));
      vec4 soft = texture2D(tBlur, vUv);
      scene = mix(scene, soft.rgb, mask * soft.a);
    }
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
    float light = dot(scene * exposure * tint, vec3(0.2126, 0.7152, 0.0722));
    // Scale exceptionally bright HDR values into the LUT, then extrapolate the affine grade about its
    // black offset. Highlights remain HDR until OutputPass applies Neutral and sRGB exactly once.
    float scale = max(1.0, max(scene.r, max(scene.g, scene.b)) / LUT_RANGE);
    vec3 uvw = vec3(0.5 / LUT_SIZE) + max(scene, 0.0) / (scale * LUT_RANGE) * (1.0 - 1.0 / LUT_SIZE);
    vec3 colour = (texture(tLut, uvw).rgb - lutOffset) * scale + lutOffset;
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
  setDepthBlur(texture: Texture | null, depth: Texture | null, near: number, far: number, cameraZ: number): void;
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
    defines: { GLOW_FROM: GLOW_FROM.toFixed(3), LUT_SIZE: LUT_SIZE.toFixed(1), LUT_RANGE: LUT_RANGE.toFixed(1) },
    uniforms: {
      glow: { value: 0 },
      texel: { value: new Vector2(1 / 1280, 1 / 720) },
      tDiffuse: { value: null },
      tint: { value: new Vector3(...grade.tint) },
      exposure: { value: grade.exposure },
      tLut: { value: createGradeLut(grade) },
      lutOffset: { value: 0.18 * (1 - grade.contrast) },
      tBlur: { value: null }, tDepth: { value: null }, blurEnabled: { value: 0 },
      depthCamera: { value: new Vector3(0.1, 140, 10) },
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
    setDepthBlur(texture, depth, near, far, cameraZ) {
      material.uniforms.tBlur!.value = texture;
      material.uniforms.tDepth!.value = depth;
      material.uniforms.blurEnabled!.value = texture ? 1 : 0;
      (material.uniforms.depthCamera!.value as Vector3).set(near, far, cameraZ);
    },
    setGlow(strength) {
      material.uniforms.glow!.value = Math.max(0, strength);
    },
  };
}
