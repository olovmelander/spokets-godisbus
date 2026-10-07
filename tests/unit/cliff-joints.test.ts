import { DirectionalLight, Fog, Mesh, MeshStandardMaterial, ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { cliffJoints } from '../../src/render/cliff-joints';
import { bankShapes, groundMaterial } from '../../src/render/dressing/ground';
import { createMaterialGrade, GARDEN_MORNING } from '../../src/render/grade';
import { createRimLight } from '../../src/render/rim-light';

function compile(material: MeshStandardMaterial) {
  const shader = { ...ShaderLib.standard, uniforms: {} } as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, null as unknown as WebGLRenderer);
  return shader;
}

describe("granite's cliffs, broken along their joints", () => {
  it('is idempotent and keeps an earlier hook and its own place in the cache', () => {
    const material = new MeshStandardMaterial();
    const ordinary = new MeshStandardMaterial();
    let calls = 0;
    material.customProgramCacheKey = () => 'earlier-rock';
    material.onBeforeCompile = (shader) => { calls++; shader.uniforms.earlier = { value: 7 }; };
    cliffJoints(material);
    const version = material.version;
    cliffJoints(material);
    expect(material.version).toBe(version);
    expect(material.customProgramCacheKey()).toBe('earlier-rock:cliff-joints-v1');
    expect(compile(material).uniforms.earlier!.value).toBe(7);
    expect(calls).toBe(1);
    expect(compile(ordinary).fragmentShader).toBe(ShaderLib.standard.fragmentShader);
  });

  it('paints only the faces that run back from the path, before the light, with no more texture reads', () => {
    for (const first of [true, false]) {
      const material = new MeshStandardMaterial();
      const mesh = new Mesh(undefined, material);
      if (first) cliffJoints(material);
      const sun = new DirectionalLight('#ffcc88', 3.6);
      sun.position.set(-7, 5, -4);
      createRimLight(sun).apply(mesh);
      createMaterialGrade(GARDEN_MORNING, new Fog('#aabbcc', 10, 30)).apply(mesh);
      if (!first) cliffJoints(material);
      const shader = compile(material);
      for (const feature of ['cliff-joints-v1', 'place-rim-v1', 'place-grade-v2:haze']) expect(material.customProgramCacheKey()).toContain(feature);
      const paint = shader.fragmentShader.indexOf('diffuseColor.rgb = mix(diffuseColor.rgb, cliffColour, cliffSide)');
      expect(paint).toBeGreaterThan(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'));
      expect(paint).toBeLessThan(shader.fragmentShader.indexOf('#include <lights_physical_fragment>'));
      // A face that runs back from the path faces along it: its normal is across the picture, not up.
      expect(shader.fragmentShader).toContain('smoothstep(0.35, 0.6, abs(cliffNormal.y))');
      expect(shader.fragmentShader).toContain('smoothstep(0.5, 0.8, abs(cliffNormal.x))');
      expect(shader.fragmentShader.match(/texture2D\(/g)).toEqual(ShaderLib.standard.fragmentShader.match(/texture2D\(/g));
      expect(shader.vertexShader).toContain('modelMatrix * vec4(transformed, 1.0)');
    }
  });

  it("is on the mountain's granite and the night summit's, and on nothing else", () => {
    const keys = (course: string, own: Parameters<typeof bankShapes>[1]) =>
      bankShapes(COURSES[course]!, own).map(({ kind }) => groundMaterial(COURSES[course]!, kind, null).customProgramCacheKey());
    expect(keys('berget', 'granite').some((key) => key.includes('cliff-joints'))).toBe(true);
    expect(keys('norrsken', 'granite').some((key) => key.includes('cliff-joints'))).toBe(true);
    for (const [course, own] of [['granskog', 'moss'], ['byn', 'asphalt'], ['myren', 'sphagnum']] as const) {
      expect(keys(course, own).some((key) => key.includes('cliff-joints')), course).toBe(false);
    }
  });
});
