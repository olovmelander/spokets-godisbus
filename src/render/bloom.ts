import {
  BufferGeometry, Float32BufferAttribute, HalfFloatType, Mesh, OrthographicCamera, ShaderMaterial,
  Vector2, WebGLRenderTarget, type WebGLRenderer,
} from 'three';
import { GLOW_FROM } from './grade';

/** High's small HDR glow buffer: one half-resolution pass, then a sample in the shared grade. */
export function createBloom() {
  let target: WebGLRenderTarget | null = null;
  const material = new ShaderMaterial({
    defines: { GLOW_FROM: GLOW_FROM.toFixed(3) },
    uniforms: { tDiffuse: { value: null }, texel: { value: new Vector2(1, 1) } },
    vertexShader: /* glsl */ `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 texel;
      varying vec2 vUv;
      vec3 bright(vec2 uv) { return max(texture2D(tDiffuse, uv).rgb - GLOW_FROM, 0.0); }
      void main() {
        vec3 spill = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7853982;
          spill += bright(vUv + vec2(cos(a), sin(a)) * texel * 5.0) * 0.075;
          spill += bright(vUv + vec2(cos(a + 0.3926991), sin(a + 0.3926991)) * texel * 13.0) * 0.05;
        }
        gl_FragColor = vec4(spill, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(geometry, material);
  triangle.frustumCulled = false;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    get texture() { return target?.texture ?? null; },
    setSize(width: number, height: number, enabled: boolean) {
      if (!enabled) { target?.dispose(); target = null; return; }
      const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
      target ??= new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
      target.texture.name = 'sparkle-bloom';
      target.setSize(w, h);
      (material.uniforms.texel!.value as Vector2).set(1 / width, 1 / height);
    },
    render(renderer: WebGLRenderer, read: WebGLRenderTarget) {
      if (!target) return;
      material.uniforms.tDiffuse!.value = read.texture;
      renderer.setRenderTarget(target);
      renderer.render(triangle, camera);
    },
  };
}
