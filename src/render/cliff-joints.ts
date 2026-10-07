import type { MeshStandardMaterial } from 'three';

const patched = new WeakSet<MeshStandardMaterial>();

/**
 * Granite's cliffs, broken as granite breaks. On a steep face that runs back from the path (a wall in the
 * outline, seen from its side), courses of uneven height lie between wavy sheeting joints, and each course
 * is cut across by joints of its own spacing. Each block has a tone of its own, an upper edge that catches
 * the light and a lower edge in its own shade. The tops he walks on and the faces towards the camera keep
 * their picture, which is cut by the ground's own blocks.
 */
export function cliffJoints(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:cliff-joints-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 cliffPosition;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
      cliffPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = 'varying vec3 cliffPosition;\n' + shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */ `
      #include <normal_fragment_maps>
      {
        vec3 cliffNormal = normalize(normal * mat3(viewMatrix));
        float cliffSide = (1.0 - smoothstep(0.35, 0.6, abs(cliffNormal.y))) * smoothstep(0.5, 0.8, abs(cliffNormal.x));
        // Along the face, and up it: courses about 1.5 high, some higher and some lower, between gently curving
        // joints. The height is warped evenly enough that the courses never cross.
        vec2 cliffAt = vec2(cliffPosition.z, cliffPosition.y + 0.45 * sin(cliffPosition.y * 0.63 + 1.3));
        float cliffWave = 0.14 * sin(cliffAt.x * 0.45 + floor(cliffAt.y / 1.5) * 2.1);
        float cliffRise = (cliffAt.y + cliffWave) / 1.5;
        float cliffRow = floor(cliffRise);
        float cliffUp = fract(cliffRise);
        // Across each course, joints of its own spacing, each leaning a little its own way.
        float cliffWide = 1.4 + 1.6 * fract(sin(cliffRow * 12.9898) * 43758.5453);
        float cliffLean = (fract(sin(cliffRow * 39.346) * 11.135) - 0.5) * 0.5;
        float cliffAcross = (cliffAt.x + cliffLean * cliffUp * 1.5) / cliffWide + fract(sin(cliffRow * 78.233) * 12345.678);
        float cliffBlock = floor(cliffAcross);
        float cliffIn = fract(cliffAcross);
        float cliffEdge = min(min(cliffIn, 1.0 - cliffIn) * cliffWide, min(cliffUp, 1.0 - cliffUp) * 1.5);
        float cliffAA = max(fwidth(cliffEdge), 0.002);
        float cliffJoint = 1.0 - smoothstep(0.012 - cliffAA, 0.03 + cliffAA, cliffEdge);
        // A block's upper edge catches the light; under its lower edge it is in its own shade.
        float cliffLit = 1.0 - smoothstep(0.03, 0.18, (1.0 - cliffUp) * 1.5);
        float cliffUnder = 1.0 - smoothstep(0.03, 0.45, cliffUp * 1.5);
        float cliffTone = 0.84 + 0.26 * fract(sin(cliffBlock * 31.7 + cliffRow * 17.3) * 9631.5);
        vec3 cliffColour = diffuseColor.rgb * cliffTone * (1.0 + 0.12 * cliffLit) * (1.0 - 0.28 * cliffUnder);
        // A joint is dark, and cool, as shade is.
        cliffColour = mix(cliffColour, vec3(0.05, 0.05, 0.08), 0.75 * cliffJoint);
        diffuseColor.rgb = mix(diffuseColor.rgb, cliffColour, cliffSide);
      }`);
  };
  material.needsUpdate = true;
}
