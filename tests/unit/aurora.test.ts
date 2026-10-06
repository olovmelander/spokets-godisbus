import { AdditiveBlending, PerspectiveCamera, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createAurora } from '../../src/render/aurora';

describe('the northern lights', () => {
  it('wait unseen but warmed until night falls, then flare as one capped additive draw', () => {
    const aurora = createAurora();
    const material = aurora.mesh.material as ShaderMaterial;
    // Warmed with the rest at the start, so no shader is compiled when they flare.
    expect(aurora.mesh.visible).toBe(false);
    expect(aurora.mesh.userData.idle).toBe(true);
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.depthWrite).toBe(false);
    // At the far plane, as the stars are: the ridges and everything nearer stand in front of them.
    expect(material.vertexShader).toContain('gl_Position = vec4(position.xy, 1.0, 1.0)');
    // They never hang lower than a little under the picture's middle line.
    const heights = Array.from(aurora.mesh.geometry.getAttribute('position').array).filter((_, i) => i % 3 === 1);
    expect(Math.min(...heights)).toBeCloseTo(-0.25, 6);
    for (const clock of [0, 1.3, 7, 40]) {
      aurora.update(1, clock, 0.85);
      expect(aurora.mesh.visible).toBe(true);
      expect(material.uniforms.strength!.value).toBeLessThanOrEqual(0.85);
      expect(material.uniforms.strength!.value).toBeGreaterThan(0.85 * 0.75);
    }
    aurora.update(0.5, 3, 0.5);
    expect(material.uniforms.strength!.value).toBeLessThanOrEqual(0.25);
    aurora.update(0, 3, 0.85);
    expect(aurora.mesh.visible).toBe(false);
  });

  it('take the lens and its tilt from the camera that draws them', () => {
    const aurora = createAurora();
    const view = (aurora.mesh.material as ShaderMaterial).uniforms.view!.value;
    const camera = new PerspectiveCamera(30, 2, 0.1, 100);
    camera.lookAt(0, 0, -1);
    camera.updateMatrixWorld();
    aurora.mesh.onBeforeRender(null as never, null as never, camera, null as never, null as never, null as never);
    const slope = Math.tan(Math.PI / 12);
    expect(view.x).toBeCloseTo(slope * 2, 6);
    expect(view.y).toBeCloseTo(slope, 6);
    expect(view.z).toBeCloseTo(0, 6);
    // A camera that looks down a little lifts the lights in the picture.
    camera.lookAt(0, -0.1, -1);
    camera.updateMatrixWorld();
    aurora.mesh.onBeforeRender(null as never, null as never, camera, null as never, null as never, null as never);
    expect(view.z).toBeCloseTo(-0.1, 2);
  });
});
