import { MeshLambertMaterial, MeshStandardMaterial, NormalBlending, type DirectionalLight, type Material, type Mesh, type Object3D } from 'three';

/**
 * The low sun catches the edge of a figure, a stone or a blade of grass. Use three's final view-space
 * normal and position: they already include instancing, skinning, wind and the actual story camera.
 * This adds only reflected pigment, never a white outline on black eyes or a light through water.
 */
export function createRimLight(sun: DirectionalLight) {
  const strength = 0.32 * Math.min(1, Math.max(0, sun.intensity) / 2.4);
  const uniforms = {
    placeRimStrength: { value: strength },
    // Capture the authored direction before the shadow camera starts following Elof.
    placeRimSun: { value: sun.position.clone().sub(sun.target.position).normalize() },
    placeRimColour: { value: sun.color },
  };
  const patched = new WeakSet<Material>();
  return {
    /** Daylight fades with the mountain's evening and reaches zero during the finale's nightfall. */
    setStrength(daylight: number) {
      uniforms.placeRimStrength.value = strength * Math.min(1, Math.max(0, daylight));
    },
    apply(root: Object3D) {
      root.traverse((object) => {
        const material = (object as Mesh).material;
        for (const one of material ? (Array.isArray(material) ? material : [material]) : []) {
          if (patched.has(one) || !(one instanceof MeshStandardMaterial || one instanceof MeshLambertMaterial)
            || one.transparent || one.opacity < 1 || !one.colorWrite || one.blending !== NormalBlending
            || ('transmission' in one && Number(one.transmission) > 0)) continue;
          patched.add(one);
          const before = one.onBeforeCompile;
          const key = one.customProgramCacheKey.bind(one);
          one.customProgramCacheKey = () => `${key()}:place-rim-v1`;
          one.onBeforeCompile = (shader, renderer) => {
            before.call(one, shader, renderer);
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = /* glsl */ `uniform float placeRimStrength;
              uniform vec3 placeRimSun, placeRimColour;
              ` + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
              float placeRimEdge = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
              vec3 placeRimDirection = normalize((viewMatrix * vec4(placeRimSun, 0.0)).xyz);
              float placeRimFacing = smoothstep(-0.15, 0.6, dot(normal, placeRimDirection));
              outgoingLight += clamp(diffuseColor.rgb, 0.0, 1.0) * placeRimColour * placeRimStrength
                * placeRimEdge * placeRimEdge * placeRimEdge * placeRimFacing;
              #include <opaque_fragment>`);
          };
          one.needsUpdate = true;
        }
      });
    },
  };
}
