import {
  AdditiveBlending, DirectionalLight, Fog, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, ShaderLib, ShaderMaterial, Vector3,
  type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer,
} from 'three';
import { describe, expect, it } from 'vitest';
import { candyMaterial } from '../../src/render/candy';
import { createMaterialGrade, GARDEN_MORNING } from '../../src/render/grade';
import { createRimLight } from '../../src/render/rim-light';
import { sway } from '../../src/render/wind';

function compile(material: Material, kind: 'standard' | 'lambert' = 'standard') {
  const shader = { ...ShaderLib[kind], uniforms: {} } as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, null as unknown as WebGLRenderer);
  return shader;
}

function light() {
  const sun = new DirectionalLight('#ffcc88', 3.6);
  sun.position.set(-7, 5, -4);
  return sun;
}

describe('the sun on a grazing edge', () => {
  it('patches opaque lit pigments, leaving transparent effects, water and invisible shadow proxies alone', () => {
    const lit = [new MeshStandardMaterial(), new MeshLambertMaterial(), new MeshStandardMaterial({ alphaTest: 0.4 })];
    const unlit = [
      new MeshBasicMaterial(), new ShaderMaterial(), new MeshStandardMaterial({ transparent: true }),
      new MeshStandardMaterial({ opacity: 0.6 }), new MeshStandardMaterial({ colorWrite: false }),
      new MeshStandardMaterial({ blending: AdditiveBlending }), new MeshPhysicalMaterial({ transmission: 0.7 }),
    ];
    const group = new Group();
    group.add(new Mesh(undefined, [...lit, ...unlit]));
    const rim = createRimLight(light());
    rim.apply(group);
    for (const material of lit) expect(material.customProgramCacheKey()).toContain('place-rim-v1');
    for (const material of unlit) expect(material.customProgramCacheKey()).not.toContain('place-rim-v1');
    const versions = lit.map((material) => material.version);
    const keys = lit.map((material) => material.customProgramCacheKey());
    rim.apply(group);
    expect(lit.map((material) => material.version)).toEqual(versions);
    expect(lit.map((material) => material.customProgramCacheKey())).toEqual(keys);
  });

  it('shares reversible daylight with late models, preserves the authored sun direction and isolates views', () => {
    const sun = light();
    const direction = sun.position.clone().normalize();
    const rim = createRimLight(sun);
    const first = new MeshStandardMaterial();
    rim.apply(new Mesh(undefined, first));
    const a = compile(first);
    const bright = a.uniforms.placeRimStrength!.value as number;
    // The shadow rig follows Elof. Its translation must not turn the rim round the figures.
    sun.position.set(81, 37, 10);
    sun.target.position.set(100, 20, 0);
    expect((a.uniforms.placeRimSun!.value as Vector3).distanceTo(direction)).toBeLessThan(1e-12);
    expect(a.uniforms.placeRimColour!.value).toBe(sun.color);
    rim.setStrength(0.4);
    const late = new MeshLambertMaterial();
    rim.apply(new Mesh(undefined, late));
    const b = compile(late, 'lambert');
    expect(a.uniforms.placeRimStrength).toBe(b.uniforms.placeRimStrength);
    expect(b.uniforms.placeRimStrength!.value).toBeCloseTo(bright * 0.4);
    rim.setStrength(-1);
    expect(a.uniforms.placeRimStrength!.value).toBe(0);
    rim.setStrength(2);
    expect(b.uniforms.placeRimStrength!.value).toBe(bright);
    const other = createRimLight(light());
    const separate = new MeshStandardMaterial();
    other.apply(new Mesh(undefined, separate));
    other.setStrength(0);
    expect(compile(separate).uniforms.placeRimStrength!.value).toBe(0);
    expect(a.uniforms.placeRimStrength!.value).toBe(bright);
  });

  it('uses both native lit shaders without changing their skinning, instancing or projection stages', () => {
    for (const [material, kind] of [[new MeshStandardMaterial(), 'standard'], [new MeshLambertMaterial(), 'lambert']] as const) {
      createRimLight(light()).apply(new Mesh(undefined, material));
      const shader = compile(material, kind);
      expect(shader.vertexShader).toBe(ShaderLib[kind].vertexShader);
      // The renderer supplies the current camera's viewMatrix, including tilted story shots.
      expect(shader.fragmentShader).toContain('viewMatrix * vec4(placeRimSun, 0.0)');
      expect(shader.fragmentShader.indexOf('placeRimEdge =')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'));
      expect(shader.fragmentShader.indexOf('placeRimEdge =')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'));
    }
  });

  it('composes with candy, wind and the haze/grade pipeline without replacing any earlier hook', () => {
    const material = candyMaterial();
    sway(material, 0.07);
    const mesh = new Mesh(undefined, material);
    createRimLight(light()).apply(mesh);
    createMaterialGrade(GARDEN_MORNING, new Fog('#aabbcc', 10, 30)).apply(mesh);
    const shader = compile(material);
    const key = material.customProgramCacheKey();
    for (const feature of ['candy-v1', 'wind-v1', 'place-rim-v1', 'place-grade-v2:haze']) expect(key).toContain(feature);
    expect(shader.vertexShader).toContain('windBend');
    expect(shader.fragmentShader).toContain('candySheen');
    expect(shader.fragmentShader).toContain('placeHazeLinear');
    expect(shader.fragmentShader).toContain('placeGradeEnabled');
    expect(shader.fragmentShader.match(/float placeRimEdge =/g)).toHaveLength(1);
    expect(shader.fragmentShader.indexOf('placeRimEdge =')).toBeLessThan(shader.fragmentShader.indexOf('if (placeGradeEnabled'));
  });
});
