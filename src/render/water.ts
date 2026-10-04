import {
  BoxGeometry, BufferGeometry, Color, DataTexture, Float32BufferAttribute, Group, HalfFloatType, LinearFilter,
  Mesh, MeshBasicMaterial, OrthographicCamera, RepeatWrapping, ShaderMaterial, Vector2, Vector3, Vector4,
  WebGLRenderTarget, type Material, type Object3D, type PerspectiveCamera, type WebGLRenderer,
} from 'three';
import type { ChapterData } from '../sim/types';
import type { Tier } from './quality';

/** A tiny generated flow field: mostly downstream, with gentle eddies. No downloaded texture. */
function flowField() {
  const data = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const angle = Math.sin(x * Math.PI / 8) * Math.cos(y * Math.PI / 8) * 0.7;
    data.set([Math.round(128 + Math.cos(angle) * 100), Math.round(128 + Math.sin(angle) * 100), 128, 255], (y * 32 + x) * 4);
  }
  const texture = new DataTexture(data, 32, 32);
  texture.name = 'water-flow';
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const CAUSTIC = `
  float causticPattern(vec2 p, float time) {
    vec2 q = p * 6.0 + vec2(time * 0.43, time * -0.3);
    float a = sin(q.x + sin(q.y * 0.73 + time * 0.2));
    float b = sin(q.y + sin(q.x * 0.82 - time * 0.3));
    return pow(max(0.0, 1.0 - abs(a + b) * 1.6), 4.0);
  }
`;

/** Flow on Low, reflected glints and world-projected caustics on Mid, a half-res scene sample on High. */
export function createWater(chapter: ChapterData, look: { colour: string; opacity: number } | null, sun: readonly [number, number, number] = [-7, 5, -4]) {
  const group = new Group();
  const pools = chapter.water ?? [];
  const details = { value: 0 }, time = { value: 0 };
  const uniforms = {
    flowMap: { value: flowField() }, time, details,
    sunDirection: { value: new Vector3(...sun).normalize() },
    waterColour: { value: new Color(look?.colour ?? '#4f9fc4') }, opacity: { value: look?.opacity ?? 0.78 },
    refraction: { value: null as WebGLRenderTarget['texture'] | null }, refractOn: { value: 0 },
    resolution: { value: new Vector2(1, 1) }, cameraFar: { value: 140 },
    fogColor: { value: new Color() }, fogNear: { value: 1 }, fogFar: { value: 100 },
    wake: { value: new Vector4(0, 0, 0, 0) },
    poolBounds: { value: new Vector2(0, 1) },
    reflectionColour: { value: new Color(chapter.place === 'bog' ? '#c8bb94' : '#a5c6d3') },
  };
  const material = new ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, fog: true,
    vertexShader: `
      varying vec3 waterWorld, waterNormal; varying float waterDepth;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        waterWorld = world.xyz;
        waterNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * world;
        waterDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D flowMap, refraction;
      uniform vec3 waterColour, sunDirection, reflectionColour;
      uniform vec4 wake;
      uniform vec2 poolBounds;
      uniform float time, details, opacity, refractOn, cameraFar;
      uniform vec2 resolution;
      varying vec3 waterWorld, waterNormal; varying float waterDepth;
      #include <fog_pars_fragment>
      ${CAUSTIC}
      void main() {
        vec2 flow = texture2D(flowMap, waterWorld.xz * 0.045).rg * 2.0 - 1.0;
        vec2 uv = waterWorld.xz * 1.6 - flow * time * 0.28;
        vec2 waves = vec2(sin(uv.x + sin(uv.y * 1.3)), cos(uv.y * 1.2 + sin(uv.x * 0.8)));
        waves += vec2(sin(uv.x * 3.7 + uv.y * 1.8), cos(uv.y * 3.2 - uv.x * 1.6)) * .22;
        vec3 normal = normalize(waterNormal + vec3(waves.x, 0.0, waves.y) * 0.105);
        vec3 colour = waterColour * (0.88 + sin(uv.x * 1.4 + uv.y) * 0.05);
        float top = max(waterNormal.y, 0.0);
        vec3 view = normalize(cameraPosition - waterWorld);
        float fresnel = pow(1.0 - max(dot(view, normal), 0.0), 3.0);
        // Broad sky bands read as water on every tier; the fine glints remain tiered.
        float reflection = .17 + .055 * sin(waterWorld.z * .7 + waves.x * .5);
        colour = mix(colour, reflectionColour, fresnel * reflection * top);
        float shore = min(waterWorld.x - poolBounds.x, poolBounds.y - waterWorld.x);
        float fringe = (1.0 - smoothstep(.03, .38, shore)) * (.5 + .5 * sin(uv.y * 3.0 + time));
        colour += reflectionColour * fringe * top * .15;
        // A wake follows only the active water craft, clipped by the pool geometry itself.
        vec2 behindBoat = waterWorld.xz - wake.xy;
        float wakeDistance = length(behindBoat * vec2(.7, 1.4));
        float rings = pow(max(0.0, sin(wakeDistance * 16.0 - time * 4.0)), 7.0);
        float stern = exp(-abs(abs(behindBoat.y) + behindBoat.x * .3) * 8.0)
          * smoothstep(0.0, .4, -behindBoat.x);
        float wakeLight = (rings * .35 + stern * .55) * exp(-wakeDistance * .8)
          * smoothstep(.35, .7, wakeDistance) * wake.z * top;
        colour += reflectionColour * wakeLight;
        if (details > 0.5) {
          colour = mix(colour, reflectionColour, fresnel * 0.18);
          vec3 halfVector = normalize(view + sunDirection);
          float glint = pow(max(dot(normal, halfVector), 0.0), 64.0)
            + pow(max(0.0, waves.x * waves.y), 18.0) * 0.12;
          float grain = fract(sin(dot(floor(waterWorld.xz * 28.0), vec2(12.9898, 78.233))) * 43758.5453);
          colour += vec3(1.0, 0.94, 0.72) * glint * smoothstep(0.35, 0.95, grain) * top * 1.4;
          colour += causticPattern(waterWorld.xz + waterWorld.y * 0.16, time) * vec3(0.035, 0.065, 0.07) * (1.0 - top);
          if (refractOn > 0.5) {
            vec2 screen = gl_FragCoord.xy / resolution;
            vec2 bend = waves * 0.004 * (0.35 + top);
            vec4 behind = texture2D(refraction, clamp(screen + bend, 0.0, 1.0));
            // Do not bend a nearer character into the water from outside its silhouette.
            if (behind.a * cameraFar < waterDepth - 0.03) behind = texture2D(refraction, screen);
            colour = mix(behind.rgb, colour, 0.55 + fresnel * 0.3);
          }
        }
        gl_FragColor = vec4(colour, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const depth = 6, back = look ? 46 : 4.6;
  const bodies = pools.map((w) => {
    const body = new Mesh(new BoxGeometry(w.to - w.from, depth, back), material);
    body.onBeforeRender = () => { uniforms.poolBounds.value.set(w.from, w.to); material.uniformsNeedUpdate = true; };
    body.position.set((w.from + w.to) / 2, w.y - depth / 2, 0.65 - back / 2);
    group.add(body);
    return { body, y: w.y - depth / 2 };
  });
  let target: WebGLRenderTarget | null = null;
  const copyMaterial = new ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, nearFar: { value: new Vector2(0.1, 140) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform vec2 nearFar; varying vec2 vUv;
      void main() {
        float d = texture2D(tDepth, vUv).r;
        float linearDepth = nearFar.x / (nearFar.y - (nearFar.y - nearFar.x) * d);
        gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, linearDepth);
      }`,
    depthTest: false, depthWrite: false,
  });
  const triangleGeometry = new BufferGeometry();
  triangleGeometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  triangleGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(triangleGeometry, copyMaterial); triangle.frustumCulled = false;
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const patched = new WeakSet<Material>();
  const causticPools = pools.slice(0, 8).map((w) => new Vector4(w.from, w.to, w.y, 0));
  while (causticPools.length < 8) causticPools.push(new Vector4(0, 0, -1e6, 0));
  return {
    group,
    get refracting() { return target !== null; },
    setWake(x: number, active: boolean) { uniforms.wake.value.set(x, 0, active ? 1 : 0, 0); },
    update(clock: number) {
      time.value = clock;
      for (const [i, w] of bodies.entries()) w.body.position.y = w.y + Math.sin(clock * 1.3 + i) * 0.03;
    },
    setSize(width: number, height: number, tier: Tier) {
      details.value = tier === 'low' ? 0 : 1;
      uniforms.resolution.value.set(width, height);
      if (tier !== 'high' || !pools.length) { target?.dispose(); target = null; uniforms.refractOn.value = 0; uniforms.refraction.value = null; return; }
      const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
      target ??= new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
      target.texture.name = 'water-refraction';
      target.setSize(w, h);
      uniforms.refraction.value = target.texture;
      uniforms.refractOn.value = 1;
    },
    capture(renderer: WebGLRenderer, source: WebGLRenderTarget, camera: PerspectiveCamera) {
      if (!target) return;
      uniforms.cameraFar.value = camera.far;
      (copyMaterial.uniforms.nearFar!.value as Vector2).set(camera.near, camera.far);
      copyMaterial.uniforms.tDiffuse!.value = source.texture;
      copyMaterial.uniforms.tDepth!.value = source.depthTexture;
      renderer.setRenderTarget(target);
      renderer.render(triangle, screenCamera);
    },
    /** Project a moving light pattern onto submerged terrain/props, with no extra geometry or draw. */
    applyCaustics(root: Object3D) {
      if (!pools.length) return;
      root.traverse((object) => {
        const material = (object as Mesh).material;
        for (const one of material ? (Array.isArray(material) ? material : [material]) : []) {
          if (patched.has(one) || one instanceof ShaderMaterial || one instanceof MeshBasicMaterial) continue;
          patched.add(one);
          const before = one.onBeforeCompile, key = one.customProgramCacheKey.bind(one);
          one.customProgramCacheKey = () => `${key()}:water-caustics-v1`;
          one.onBeforeCompile = (shader, renderer) => {
            before.call(one, shader, renderer);
            shader.uniforms.waterTime = time; shader.uniforms.waterDetails = details;
            shader.uniforms.waterPools = { value: causticPools };
            shader.vertexShader = 'varying vec3 causticWorld;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
              vec4 causticPosition = vec4(transformed, 1.0);
              #ifdef USE_INSTANCING
                causticPosition = instanceMatrix * causticPosition;
              #endif
              causticWorld = (modelMatrix * causticPosition).xyz;
              #include <project_vertex>`);
            shader.fragmentShader = `varying vec3 causticWorld; uniform float waterTime, waterDetails;
              uniform vec4 waterPools[8]; ${CAUSTIC}\n` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', `
              if (waterDetails > 0.5) {
                for (int i = 0; i < 8; i++) {
                  vec4 pool = waterPools[i];
                  float depth = pool.z - causticWorld.y;
                  if (causticWorld.x > pool.x && causticWorld.x < pool.y && causticWorld.z < 0.7 && causticWorld.z > -46.0 && depth > 0.05 && depth < 6.0) {
                    gl_FragColor.rgb += causticPattern(causticWorld.xz + depth * 0.16, waterTime) * vec3(0.06, 0.11, 0.10) * (1.0 - depth / 6.0);
                  }
                }
              }
              #include <tonemapping_fragment>`);
          };
          one.needsUpdate = true;
        }
      });
    },
  };
}
