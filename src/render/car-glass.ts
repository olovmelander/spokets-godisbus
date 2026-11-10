import { Float32BufferAttribute, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';

/** The cars are closed, opaque shells. Give their actual glass a shaded cabin and a soft sky reflection,
 * rather than using transmission through the silver body behind it. The baked blue glass is the mask;
 * paint, rubber, chrome and lamps retain their original materials and colours. One existing draw per body.
 */
export function carGlass(root: Object3D, wet: boolean, metres = 1): void {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), matrix = new Matrix4(), point = new Vector3();
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || !(mesh.material as MeshStandardMaterial).isMeshStandardMaterial) return;
    const source = mesh.material as MeshStandardMaterial;
    if (source.userData.carGlass) return;
    const position = mesh.geometry.getAttribute('position'), colours = mesh.geometry.getAttribute('color');
    const explicit = source.name === 'car-window';
    if (!explicit && !colours) return;
    matrix.multiplyMatrices(inverse, mesh.matrixWorld);
    const at = new Float32Array(position.count * 3), mask = new Float32Array(position.count);
    let windows = 0;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(matrix).multiplyScalar(metres);
      point.toArray(at, i * 3);
      // AO darkens the exported vertex colours without changing their blue hue. The height excludes tyres;
      // silver paint, black seals and white/red lamps are outside this deliberately narrow colour range.
      const glass = explicit || point.y > .9 && colours && colours.getZ(i) > colours.getX(i) * 1.7
        && colours.getZ(i) > colours.getY(i) * 1.25;
      if (glass) { mask[i] = 1; windows++; }
    }
    if (!windows) return;
    mesh.geometry = mesh.geometry.clone();
    if (!explicit) {
      // The export's curved black surrounds and glass use different triangle grids. At the beltline the coarser
      // surround can cross the glass between its vertices. Separate only the glass by six millimetres in car space;
      // this is smaller than its inset from the frame and preserves the silhouette, pillars and painted body.
      const normals = mesh.geometry.getAttribute('normal'), normal = new Vector3();
      const normalMatrix = new Matrix3().getNormalMatrix(matrix), back = matrix.clone().invert();
      const separated = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        if (mask[i]) {
          normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
          point.applyMatrix4(matrix).addScaledVector(normal, .006 / metres).applyMatrix4(back);
        }
        point.toArray(separated, i * 3);
      }
      // Decoded GLBs can have normalised integer positions; preserve their decoded coordinates in the new buffer.
      mesh.geometry.setAttribute('position', new Float32BufferAttribute(separated, 3));
      mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    }
    mesh.geometry.setAttribute('carPoint', new Float32BufferAttribute(at, 3));
    mesh.geometry.setAttribute('carPane', new Float32BufferAttribute(mask, 1));
    const material = source.clone();
    material.name = `${source.name || 'car'}-glazing`;
    material.userData.carGlass = true;
    material.userData.carWet = wet;
    const before = source.onBeforeCompile, key = source.customProgramCacheKey();
    material.customProgramCacheKey = () => `${key}:car-glass-v1`;
    material.onBeforeCompile = (shader, renderer) => {
      before.call(material, shader, renderer);
      shader.uniforms.carWet = { value: wet ? 1 : 0 };
      shader.vertexShader = /* glsl */ `attribute vec3 carPoint;
        attribute float carPane;
        varying vec3 carAt;
        varying float carWindow;
        ` + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
          #include <begin_vertex>
          carAt = carPoint;
          carWindow = carPane;`);
      shader.fragmentShader = /* glsl */ `uniform float carWet;
        varying vec3 carAt;
        varying float carWindow;
        float carSeat(vec2 p, vec2 centre) {
          vec2 d = (p - centre) / vec2(.17, .12);
          return 1.0 - smoothstep(.7, 1.1, length(d));
        }
        ` + shader.fragmentShader
        .replace('#include <color_fragment>', /* glsl */ `
          #include <color_fragment>
          if (carWindow > .5) {
            // Dark seats sit behind the glass; the slight view offset separates their depth from its reflection.
            vec3 eye = normalize(vViewPosition);
            vec2 cabin = carAt.xy + vec2(eye.x * .09, -eye.y * .04);
            float seats = max(carSeat(cabin, vec2(.12, 1.16)), carSeat(cabin, vec2(-1.04, 1.14)));
            float dash = 1.0 - smoothstep(.97, 1.06, cabin.y);
            vec3 inside = mix(vec3(.014, .023, .029), vec3(.003, .006, .009), max(seats * .85, dash * .6));
            diffuseColor.rgb = inside;
          }`)
        .replace('#include <roughnessmap_fragment>', /* glsl */ `
          #include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, mix(.23, .16, carWet), step(.5, carWindow));`)
        .replace('#include <opaque_fragment>', /* glsl */ `
          if (carWindow > .5) {
            vec3 eye = normalize(vViewPosition);
            float grazing = pow(1.0 - abs(dot(normal, eye)), 3.0);
            float sky = smoothstep(.93, 1.58, carAt.y);
            vec3 lowerSky = mix(vec3(.018, .032, .044), vec3(.006, .014, .023), carWet);
            vec3 upperSky = mix(vec3(.15, .22, .27), vec3(.055, .095, .135), carWet);
            // Broad cloud shapes continue across neighbouring panes, with a view-dependent soft highlight.
            float cloudLine = carAt.y - (1.23 + carAt.x * .09 + eye.x * .13);
            float cloud = 1.0 - smoothstep(.025, .12, abs(cloudLine));
            vec3 reflected = mix(lowerSky, upperSky, sky) + vec3(.065, .085, .10) * cloud;
            outgoingLight = outgoingLight * .65 + reflected * (.38 + .5 * grazing);
          }
          #include <opaque_fragment>`);
    };
    mesh.material = material;
  });
}
