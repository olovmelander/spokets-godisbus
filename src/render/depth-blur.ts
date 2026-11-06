import {
  BufferGeometry, Float32BufferAttribute, HalfFloatType, Mesh, NearestFilter, OrthographicCamera, ShaderMaterial,
  Vector2, Vector3, WebGLRenderTarget, type PerspectiveCamera, type Texture, type WebGLRenderer,
} from 'three';

/**
 * The depth of field of Mid and High: the picture as a macro lens takes it (plan §5.2; Olov, 6 November 2026: "ännu mer likt
 * ... Unravel"). The play plane, where he is, stays sharp. Behind it the world softens more the further it is, up
 * to a wide blur for what is far, and what stands between him and the camera, the near ground and the leaves
 * in front, is blurred most of all and spills soft over what is behind it. Bright points in the blur open into
 * round discs of light.
 *
 * Two draws at half resolution: one gathers each pixel's colour and how wide its blur is (signed: in front of
 * the play plane is negative); one gathers the blur from a disc of those. The grade then mixes it in, judging
 * at full resolution where the picture is sharp, so his outline and the candy never soften. Mid gathers from
 * half as many points as High: a little grainier in the widest blur, at half the cost.
 */

/** The most pixels each of the lens's two targets has. */
const MOST_PIXELS = 0.36e6;

/** How deep behind the play plane stays sharp in play, in EL, and how much deeper during a scene's shot. */
export const DOF_DEEP = 1.4;
export const DOF_DEEPER = 3.8;

/** How wide the blur is at most, as a share of the picture's height: for what is far, and for what is near. */
export const DOF_FAR = 0.016;
export const DOF_NEAR = 0.026;

/**
 * The size of the blur, as a share of the picture's height, for something at `distance` from the camera, which
 * is focused `focus` away, on the play plane. A band about it stays sharp: `deep` EL behind (1.4 in play, more
 * while a scene's shot is on the family, who stand further back), 0.8 EL in front. Shared by the gathering here
 * and the mix in the grade (./grade.ts).
 */
export const DOF_SIZE = /* glsl */ `
  float dofDistance(float d, vec3 depthCamera) {
    return depthCamera.x * depthCamera.y / (depthCamera.y - (depthCamera.y - depthCamera.x) * d);
  }
  float dofSize(float away, float focus, float deep) {
    float behind = 1.0 - focus / max(away - deep, 1e-3);
    float before = focus / (away + 0.8) - 1.0;
    return behind > 0.0 ? ${DOF_FAR.toFixed(4)} * smoothstep(0.0, 0.65, behind) : -${DOF_NEAR.toFixed(4)} * smoothstep(0.0, 0.5, before);
  }
`;

const VERTEX = /* glsl */ `varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Half resolution: the colour, and in alpha the blur's signed size in half-resolution pixels. */
const PREPARE = /* glsl */ `
  uniform sampler2D tDiffuse, tDepth;
  uniform vec2 texel;
  uniform vec3 depthCamera;
  uniform float height, deep;
  uniform sampler2D tShade;
  uniform float shade;
  varying vec2 vUv;
  ${DOF_SIZE}
  void main() {
    vec3 colour = texture2D(tDiffuse, vUv).rgb;
    // The shade where things meet (./contact-shade.ts), so that what is blurred has it too.
    if (shade > 0.0) colour *= 1.0 - shade * (1.0 - texture2D(tShade, vUv).r);
    // The nearest of the four it covers, so that a near edge is never taken for what is behind it.
    float d = min(min(texture2D(tDepth, vUv + texel * vec2(-0.5, -0.5)).r, texture2D(tDepth, vUv + texel * vec2(0.5, -0.5)).r),
      min(texture2D(tDepth, vUv + texel * vec2(-0.5, 0.5)).r, texture2D(tDepth, vUv + texel * vec2(0.5, 0.5)).r));
    gl_FragColor = vec4(colour, dofSize(dofDistance(d, depthCamera), depthCamera.z, deep) * height);
  }
`;

/**
 * The gather. Its own blur: what lies within its circle and reaches it, never the sharp things in front of it.
 * Then what is near and blurred spills over it from as far as the widest near blur reaches.
 */
const GATHER = /* glsl */ `
  uniform sampler2D tCoc;
  uniform vec2 texel;
  uniform float nearMost;
  /** How many points it gathers from: for its own blur, and for the near blur. */
  uniform vec2 taps;
  varying vec2 vUv;
  const float GOLDEN = 2.39996323;
  // A bright point counts for more: in the blur it opens into a disc of light.
  float bright(vec3 c) { return 1.0 + min(5.0 * max(dot(c, vec3(0.2126, 0.7152, 0.0722)) - 0.8, 0.0), 16.0); }
  void main() {
    vec4 centre = texture2D(tCoc, vUv);
    float size = abs(centre.a);
    vec3 sum = centre.rgb * bright(centre.rgb);
    float total = bright(centre.rgb);
    if (size > 0.5) {
      for (int i = 0; i < 24; i++) {
        if (float(i) >= taps.x) break;
        float r = size * sqrt((float(i) + 0.5) / taps.x);
        float a = float(i) * GOLDEN;
        vec4 s = texture2D(tCoc, vUv + vec2(cos(a), sin(a)) * r * texel);
        float reach = abs(s.a);
        // What is behind reaches over it no further than its own blur would.
        if (s.a > centre.a) reach = min(reach, size * 2.0);
        float w = smoothstep(r - 0.5, r + 0.5, reach) * bright(s.rgb);
        sum += s.rgb * w;
        total += w;
      }
    }
    vec3 own = sum / total;
    vec3 near = vec3(0.0);
    float nearTotal = 0.0, widest = 0.0;
    for (int i = 0; i < 16; i++) {
      if (float(i) >= taps.y) break;
      float r = nearMost * sqrt((float(i) + 0.5) / taps.y);
      float a = float(i) * GOLDEN + 0.6;
      vec4 s = texture2D(tCoc, vUv + vec2(cos(a), sin(a)) * r * texel);
      if (s.a < -0.5 && s.a < centre.a - 0.5) {
        float m = smoothstep(r - 1.0, r + 1.0, -s.a);
        near += s.rgb * m;
        nearTotal += m;
        widest = max(widest, -s.a * m);
      }
    }
    // How much of it the near blur covers: the share of the taps that could reach that do.
    float cover = nearTotal > 0.0 ? clamp(nearTotal / max(1.0, taps.y * pow(widest / nearMost, 2.0)) * 1.2, 0.0, 1.0) : 0.0;
    gl_FragColor = vec4(mix(own, near / max(nearTotal, 1e-4), cover), cover);
  }
`;

function screenPass(fragmentShader: string, uniforms: Record<string, { value: unknown }>) {
  const material = new ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader, depthTest: false, depthWrite: false });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(geometry, material);
  triangle.frustumCulled = false;
  return { material, triangle };
}

export function createDepthBlur() {
  let coc: WebGLRenderTarget | null = null;
  let target: WebGLRenderTarget | null = null;
  const prepare = screenPass(PREPARE, {
    tDiffuse: { value: null }, tDepth: { value: null }, texel: { value: new Vector2(1, 1) },
    depthCamera: { value: new Vector3(0.1, 140, 10) }, height: { value: 1 }, deep: { value: DOF_DEEP },
    tShade: { value: null }, shade: { value: 0 },
  });
  const gather = screenPass(GATHER, { tCoc: { value: null }, texel: { value: new Vector2(1, 1) }, nearMost: { value: 1 }, taps: { value: new Vector2(24, 16) } });
  const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const half = () => new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
  return {
    get texture() { return target?.texture ?? null; },
    /** `full`: High's count of points to gather from; Mid's is half. */
    setSize(width: number, height: number, enabled: boolean, full = true) {
      if (!enabled) {
        target?.dispose(); coc?.dispose();
        target = null; coc = null;
        return;
      }
      // Half resolution, and on a big screen a little less: the blur is soft anyway, where it is sharp is judged at
      // full resolution, and the High tier's targets must stay within 80 MB (src/render/gpu-memory.ts).
      const share = Math.min(0.5, Math.sqrt(MOST_PIXELS / Math.max(1, width * height)));
      const w = Math.max(1, Math.ceil(width * share));
      const h = Math.max(1, Math.ceil(height * share));
      target ??= half();
      coc ??= half();
      target.texture.name = 'depth-of-field';
      coc.texture.name = 'depth-of-field-size';
      // Each tap reads one pixel's own size: never a size between something near and something far.
      coc.texture.minFilter = coc.texture.magFilter = NearestFilter;
      target.setSize(w, h);
      coc.setSize(w, h);
      (prepare.material.uniforms.texel!.value as Vector2).set(1 / width, 1 / height);
      prepare.material.uniforms.height!.value = h;
      (gather.material.uniforms.texel!.value as Vector2).set(1 / w, 1 / h);
      gather.material.uniforms.nearMost!.value = Math.max(1, DOF_NEAR * h);
      (gather.material.uniforms.taps!.value as Vector2).set(full ? 24 : 12, full ? 16 : 8);
    },
    /** `deep`: how far behind the play plane is sharp, in EL (DOF_DEEP in play). */
    /** `shade`: the shade where things meet and how strong it is (./contact-shade.ts), if there is one. */
    render(renderer: WebGLRenderer, read: WebGLRenderTarget, camera: PerspectiveCamera, deep = DOF_DEEP, shade: { texture: Texture | null; strength: number } | null = null) {
      if (!target || !coc || !read.depthTexture) return;
      prepare.material.uniforms.tDiffuse!.value = read.texture;
      prepare.material.uniforms.tDepth!.value = read.depthTexture;
      (prepare.material.uniforms.depthCamera!.value as Vector3).set(camera.near, camera.far, camera.position.z);
      prepare.material.uniforms.deep!.value = deep;
      prepare.material.uniforms.tShade!.value = shade?.texture ?? null;
      prepare.material.uniforms.shade!.value = shade?.texture ? shade.strength : 0;
      renderer.setRenderTarget(coc);
      renderer.render(prepare.triangle, screen);
      gather.material.uniforms.tCoc!.value = coc.texture;
      renderer.setRenderTarget(target);
      renderer.render(gather.triangle, screen);
    },
  };
}
