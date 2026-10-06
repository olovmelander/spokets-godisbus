import type { MeshStandardMaterial } from 'three';

const patched = new WeakSet<MeshStandardMaterial>();

/** Laid granite on a bank's steep front, following its actual surface without covering its playable top. */
export function stoneCourses(material: MeshStandardMaterial): void {
  if (patched.has(material)) return;
  patched.add(material);
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:stone-courses-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = 'varying vec3 stoneCoursePosition;\n' + shader.vertexShader.replace('#include <project_vertex>', `
      stoneCoursePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #include <project_vertex>`);
    shader.fragmentShader = 'varying vec3 stoneCoursePosition;\n' + shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      {
        vec3 stoneNormal = normalize(normal * mat3(viewMatrix));
        float stoneSide = (1.0 - smoothstep(0.35, 0.7, abs(stoneNormal.y)))
          * smoothstep(0.45, 0.6, stoneCoursePosition.z);
        float stoneRow = floor(stoneCoursePosition.y / 1.65);
        vec2 stoneCell = vec2(stoneCoursePosition.x / 3.3 + 0.5 * mod(stoneRow, 2.0), stoneCoursePosition.y / 1.65);
        vec2 stoneWithin = fract(stoneCell);
        vec2 stoneEdge = min(stoneWithin, 1.0 - stoneWithin) * vec2(3.3, 1.65);
        float stoneDistance = min(stoneEdge.x, stoneEdge.y);
        float stoneAA = max(fwidth(stoneDistance), 0.001);
        float stoneJoint = 1.0 - smoothstep(0.025 - stoneAA, 0.045 + stoneAA, stoneDistance);
        float stoneBevel = smoothstep(0.035 - stoneAA, 0.065 + stoneAA, stoneDistance)
          * (1.0 - smoothstep(0.065 - stoneAA, 0.11 + stoneAA, stoneDistance));
        float stoneTone = 0.94 + 0.12 * fract(floor(stoneCell.x) * 0.618 + stoneRow * 0.381);
        vec3 stoneColour = mix(vec3(0.32, 0.35, 0.35) * (stoneTone + stoneBevel * 0.05), vec3(0.075, 0.095, 0.105), stoneJoint);
        stoneColour *= 0.72 + 0.28 * smoothstep(-4.0, 0.0, stoneCoursePosition.y);
        #ifdef USE_MAP
          stoneColour *= sampledDiffuseColor.rgb;
        #endif
        diffuseColor.rgb = mix(diffuseColor.rgb, stoneColour, stoneSide);
      }`);
  };
  material.needsUpdate = true;
}
