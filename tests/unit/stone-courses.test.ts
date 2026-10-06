import { DirectionalLight, Fog, Mesh, MeshStandardMaterial, ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { createMaterialGrade, GARDEN_MORNING } from '../../src/render/grade';
import { createRimLight } from '../../src/render/rim-light';
import { stoneCourses } from '../../src/render/stone-courses';

function compile(material: MeshStandardMaterial) {
  const shader = { ...ShaderLib.standard, uniforms: {} } as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, null as unknown as WebGLRenderer);
  return shader;
}

describe('granite courses on the actual bank', () => {
  it('is idempotent and preserves an earlier material hook and cache identity', () => {
    const material = new MeshStandardMaterial();
    const ordinary = new MeshStandardMaterial();
    let calls = 0;
    material.customProgramCacheKey = () => 'earlier-stone';
    material.onBeforeCompile = (shader) => { calls++; shader.uniforms.earlier = { value: 7 }; };
    stoneCourses(material);
    const version = material.version;
    stoneCourses(material);
    expect(material.version).toBe(version);
    expect(material.customProgramCacheKey()).toBe('earlier-stone:stone-courses-v1');
    expect(compile(material).uniforms.earlier!.value).toBe(7);
    expect(calls).toBe(1);
    expect(compile(ordinary).vertexShader).toBe(ShaderLib.standard.vertexShader);
    expect(compile(ordinary).fragmentShader).toBe(ShaderLib.standard.fragmentShader);
  });

  it('composes before or after the rim and linear haze/grade hooks, without another texture read', () => {
    for (const first of [true, false]) {
      const material = new MeshStandardMaterial();
      const mesh = new Mesh(undefined, material);
      if (first) stoneCourses(material);
      const sun = new DirectionalLight('#ffcc88', 3.6);
      sun.position.set(-7, 5, -4);
      createRimLight(sun).apply(mesh);
      createMaterialGrade(GARDEN_MORNING, new Fog('#aabbcc', 10, 30)).apply(mesh);
      if (!first) stoneCourses(material);
      const shader = compile(material);
      const key = material.customProgramCacheKey();
      for (const feature of ['stone-courses-v1', 'place-rim-v1', 'place-grade-v2:haze']) expect(key).toContain(feature);
      const paint = shader.fragmentShader.indexOf('diffuseColor.rgb = mix');
      expect(paint).toBeGreaterThan(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'));
      expect(paint).toBeLessThan(shader.fragmentShader.indexOf('#include <lights_physical_fragment>'));
      expect(shader.fragmentShader).toContain('placeHazeLinear');
      expect(shader.fragmentShader).toContain('placeRimEdge');
      expect(shader.fragmentShader).toContain('sampledDiffuseColor.rgb');
      expect(shader.fragmentShader.match(/texture2D\(/g)).toEqual(ShaderLib.standard.fragmentShader.match(/texture2D\(/g));
      expect(shader.fragmentShader.match(/vec3 stoneNormal =/g)).toHaveLength(1);
      expect(shader.vertexShader).toContain('#include <project_vertex>');
      expect(shader.vertexShader).toContain('#include <skinning_vertex>');
      expect(shader.vertexShader).toContain('modelMatrix * vec4(transformed, 1.0)');
    }
  });
});
