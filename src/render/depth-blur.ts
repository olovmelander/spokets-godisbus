import {
  BufferGeometry, Float32BufferAttribute, HalfFloatType, Mesh, OrthographicCamera, ShaderMaterial,
  Vector2, Vector3, WebGLRenderTarget, type PerspectiveCamera, type WebGLRenderer,
} from 'three';

/** High's one half-resolution blur. Only opaque depth behind the sharp play plane is eligible.
 * Far plates/transparent cards keep their authored softness; this is not a full-screen depth of field.
 * Bilateral taps reject near silhouettes, so Elof/candy never spill into the softened mid-ground.
 */
export function createDepthBlur() {
  let target: WebGLRenderTarget | null = null;
  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null }, tDepth: { value: null },
      texel: { value: new Vector2(1, 1) }, depthCamera: { value: new Vector3(0.1, 140, 10) },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse, tDepth;
      uniform vec2 texel;
      uniform vec3 depthCamera;
      varying vec2 vUv;
      float worldZ(vec2 uv) {
        float d = texture2D(tDepth, uv).r;
        return depthCamera.z + depthCamera.x * depthCamera.y / ((depthCamera.y - depthCamera.x) * d - depthCamera.y);
      }
      float mask(float z) {
        return smoothstep(1.8, 4.5, -z) * (1.0 - smoothstep(16.0, 24.0, -z));
      }
      void main() {
        float z = worldZ(vUv);
        float amount = mask(z);
        vec3 colour = texture2D(tDiffuse, vUv).rgb;
        float weight = 1.0;
        if (amount > 0.0) {
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            if (x == 0 && y == 0) continue;
            vec2 uv = vUv + vec2(float(x), float(y)) * texel * 3.0;
            float sampleZ = worldZ(uv);
            float w = mask(sampleZ) * (1.0 - smoothstep(0.4, 3.0, abs(sampleZ - z)));
            colour += texture2D(tDiffuse, uv).rgb * w;
            weight += w;
          }
        }
        gl_FragColor = vec4(colour / weight, amount);
      }`,
    depthTest: false, depthWrite: false,
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(geometry, material);
  triangle.frustumCulled = false;
  const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    get texture() { return target?.texture ?? null; },
    setSize(width: number, height: number, enabled: boolean) {
      if (!enabled) { target?.dispose(); target = null; return; }
      const w = Math.max(1, Math.ceil(width / 2));
      const h = Math.max(1, Math.ceil(height / 2));
      target ??= new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
      target.texture.name = 'midground-depth-blur';
      target.setSize(w, h);
      (material.uniforms.texel!.value as Vector2).set(1 / width, 1 / height);
    },
    render(renderer: WebGLRenderer, read: WebGLRenderTarget, camera: PerspectiveCamera) {
      if (!target || !read.depthTexture) return;
      material.uniforms.tDiffuse!.value = read.texture;
      material.uniforms.tDepth!.value = read.depthTexture;
      (material.uniforms.depthCamera!.value as Vector3).set(camera.near, camera.far, camera.position.z);
      renderer.setRenderTarget(target);
      renderer.render(triangle, screen);
    },
  };
}
