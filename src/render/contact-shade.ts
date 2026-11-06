import {
  BufferGeometry, Float32BufferAttribute, LinearFilter, Mesh, NearestFilter, OrthographicCamera, RedFormat, ShaderMaterial, UnsignedByteType,
  Vector2, Vector3, WebGLRenderTarget, type PerspectiveCamera, type Texture, type WebGLRenderer,
} from 'three';

/**
 * The shade where things meet (the graphics pass of 6 November 2026; Olov: "mer likt ... Unravel"). In Unravel's
 * pictures every corner, crevice and foot is a little darker, where the light of the sky cannot reach: the moss
 * between the stones, the floor under a chair, the ground at his boots. The renderer's light reaches everywhere,
 * so things stood on the ground as if pasted on it. This finds, from the depth of the picture alone, how much of
 * the sky each point sees within a hand's breadth (ambient occlusion), and the grade darkens it by that.
 *
 * Two draws at half resolution on Mid and High: the shade from eight points round each pixel (six on Mid), turned by a pattern so that what is left is fine noise, and a blur that keeps to one surface, so that his
 * outline never gets a dark rim from what is behind him.
 */

/** How far round a point it looks, in EL: a hand's breadth for him. */
export const SHADE_REACH = 0.6;
/** How dark a point that sees no sky goes, 0 to 1. */
export const SHADE_STRENGTH = 0.7;

const VERTEX = /* glsl */ `varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Half resolution: how open each point is (1 is open sky), in one byte. */
const SHADE = /* glsl */ `
  uniform sampler2D tDepth;
  uniform vec2 texel;
  uniform vec3 depthCamera;
  uniform vec2 lens;
  uniform float reach, taps;
  varying vec2 vUv;
  float distanceAt(vec2 uv) {
    float d = texture2D(tDepth, uv).r;
    return depthCamera.x * depthCamera.y / (depthCamera.y - (depthCamera.y - depthCamera.x) * d);
  }
  vec3 pointAt(vec2 uv) {
    float z = distanceAt(uv);
    return vec3((uv * 2.0 - 1.0) * lens * z, -z);
  }
  void main() {
    float d = texture2D(tDepth, vUv).r;
    if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
    vec3 p = pointAt(vUv);
    // The surface's facing, from its neighbours: whichever side is the nearer surface on each axis.
    vec3 px = pointAt(vUv + vec2(texel.x, 0.0)) - p, nx = p - pointAt(vUv - vec2(texel.x, 0.0));
    vec3 py = pointAt(vUv + vec2(0.0, texel.y)) - p, ny = p - pointAt(vUv - vec2(0.0, texel.y));
    vec3 n = normalize(cross(abs(px.z) < abs(nx.z) ? px : nx, abs(py.z) < abs(ny.z) ? py : ny));
    if (dot(n, p) > 0.0) n = -n;
    // A turn for each pixel, so that a dozen points cover the half-sphere between them.
    float turn = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float shut = 0.0;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= taps) break;
      float k = (float(i) + 0.5) / taps;
      float a = float(i) * 2.39996323 + turn;
      float up = 1.0 - 2.0 * fract(k * 7.31 + 0.13);
      float across = sqrt(max(0.0, 1.0 - up * up));
      vec3 way = vec3(cos(a) * across, sin(a) * across, up);
      if (dot(way, n) < 0.0) way = -way;
      vec3 s = p + way * reach * mix(0.15, 1.0, k * k) + n * 0.02;
      vec2 at = (s.xy / (-s.z) / lens) * 0.5 + 0.5;
      float surface = distanceAt(at);
      float behind = -s.z - surface;
      // Shut where what is drawn there stands in front of the point, but not by far more than the reach:
      // something far in front is not what shades it.
      shut += smoothstep(0.01, 0.06, behind) * (1.0 - smoothstep(reach, reach * 2.5, behind));
    }
    gl_FragColor = vec4(vec3(1.0 - shut / taps), 1.0);
  }
`;

/**
 * A blur over a few pixels that keeps to one surface: points at another distance, read from the picture's depth,
 * are left out.
 */
const SOFTEN = /* glsl */ `
  uniform sampler2D tShade, tDepth;
  uniform vec2 texel;
  uniform vec3 depthCamera;
  varying vec2 vUv;
  float distanceAt(vec2 uv) {
    float d = texture2D(tDepth, uv).r;
    return depthCamera.x * depthCamera.y / (depthCamera.y - (depthCamera.y - depthCamera.x) * d);
  }
  void main() {
    float here = distanceAt(vUv);
    float sum = 0.0, total = 0.0;
    // Three by three, two pixels apart: the turn pattern repeats within that.
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 at = vUv + vec2(float(x), float(y)) * texel * 2.0;
      float w = 1.0 - smoothstep(0.02, 0.08, abs(distanceAt(at) - here) / here);
      sum += texture2D(tShade, at).r * w;
      total += w;
    }
    gl_FragColor = vec4(vec3(sum / max(total, 1e-4)), 1.0);
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

export function createContactShade() {
  let raw: WebGLRenderTarget | null = null;
  let soft: WebGLRenderTarget | null = null;
  const shade = screenPass(SHADE, {
    tDepth: { value: null }, texel: { value: new Vector2(1, 1) }, depthCamera: { value: new Vector3(0.1, 140, 10) },
    lens: { value: new Vector2(1, 1) }, reach: { value: SHADE_REACH }, taps: { value: 12 },
  });
  const soften = screenPass(SOFTEN, {
    tShade: { value: null }, tDepth: { value: null }, texel: { value: new Vector2(1, 1) }, depthCamera: { value: new Vector3(0.1, 140, 10) },
  });
  const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // The raw shade is read pixel by pixel; the softened one between its pixels, by the grade.
  const half = (filter: typeof NearestFilter | typeof LinearFilter) => {
    // One byte a pixel: within the High tier's 110 MB of targets (src/render/gpu-memory.ts).
    const target = new WebGLRenderTarget(1, 1, { type: UnsignedByteType, format: RedFormat, depthBuffer: false, stencilBuffer: false });
    target.texture.minFilter = target.texture.magFilter = filter;
    return target;
  };
  return {
    /** The shade, softened: in red how open each point is. Null where it is off. */
    get texture(): Texture | null { return soft?.texture ?? null; },
    /** `full`: High's eight points; Mid's six. */
    setSize(width: number, height: number, enabled: boolean, full = true) {
      if (!enabled) {
        raw?.dispose(); soft?.dispose();
        raw = null; soft = null;
        return;
      }
      const w = Math.max(1, Math.ceil(width / 2));
      const h = Math.max(1, Math.ceil(height / 2));
      raw ??= half(NearestFilter);
      soft ??= half(LinearFilter);
      raw.texture.name = 'contact-shade';
      soft.texture.name = 'contact-shade-soft';
      raw.setSize(w, h);
      soft.setSize(w, h);
      (shade.material.uniforms.texel!.value as Vector2).set(1 / width, 1 / height);
      shade.material.uniforms.taps!.value = full ? 8 : 6;
      (soften.material.uniforms.texel!.value as Vector2).set(1 / w, 1 / h);
    },
    render(renderer: WebGLRenderer, depth: Texture, camera: PerspectiveCamera) {
      if (!raw || !soft) return;
      const u = shade.material.uniforms;
      u.tDepth!.value = depth;
      (u.depthCamera!.value as Vector3).set(camera.near, camera.far, camera.position.z);
      const tall = Math.tan((camera.fov * Math.PI) / 360) / camera.zoom;
      (u.lens!.value as Vector2).set(tall * camera.aspect, tall);
      renderer.setRenderTarget(raw);
      renderer.render(shade.triangle, screen);
      soften.material.uniforms.tShade!.value = raw.texture;
      soften.material.uniforms.tDepth!.value = depth;
      (soften.material.uniforms.depthCamera!.value as Vector3).copy(u.depthCamera!.value as Vector3);
      renderer.setRenderTarget(soft);
      renderer.render(soften.triangle, screen);
    },
  };
}
