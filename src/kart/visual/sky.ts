/** The air of each place on the lap: a clear noon at home, a golden afternoon in Granskogen, dusk over Myren,
 * night with northern lights on Berget, and a pastel dawn over the candy meadow. The sky, the fog and the two
 * lights ease from one to the next as the player drives through; the cave has its own crystal dark.
 */
import * as THREE from 'three';
import type { Track } from '../sim/track';

interface Air { top: number; horizon: number; fog: number; density: number; sun: number; power: number; sky: number; ground: number; hemi: number; stars: number; aurora: number; cloud: number; exposure: number }
const AIR: readonly Air[] = [
  { top: 0x2b7bdc, horizon: 0xc6eaff, fog: 0xbfe3fb, density: .0026, sun: 0xfff2d2, power: 2.6, sky: 0xd6ecff, ground: 0x8fb56a, hemi: 1.15, stars: 0, aurora: 0, cloud: .9, exposure: 1.02 },
  { top: 0x3b82c6, horizon: 0xffe2a6, fog: 0xecd9a2, density: .0040, sun: 0xffcf85, power: 2.6, sky: 0xe6ecc8, ground: 0x6f7b44, hemi: 1, stars: 0, aurora: 0, cloud: .7, exposure: 1.04 },
  { top: 0x2a3a72, horizon: 0xf5a37a, fog: 0x8da9a6, density: .0085, sun: 0xff9a66, power: 1.6, sky: 0x9fbccb, ground: 0x45625b, hemi: 1, stars: .3, aurora: .25, cloud: .5, exposure: 1.06 },
  { top: 0x091233, horizon: 0x385296, fog: 0x24346a, density: .0054, sun: 0xc2d4ff, power: 1.65, sky: 0x9ab3f2, ground: 0x454e7a, hemi: 1.35, stars: 1, aurora: 1, cloud: .15, exposure: 1.2 },
  { top: 0x82b6ff, horizon: 0xffd0e6, fog: 0xffdbeb, density: .0030, sun: 0xfff1e2, power: 2.4, sky: 0xffe8f4, ground: 0xf3b9d1, hemi: 1.15, stars: 0, aurora: 0, cloud: 1, exposure: 1 },
];
const CAVE_AIR: Air = { top: 0x0a0822, horizon: 0x1c1446, fog: 0x160f38, density: .017, sun: 0x8f7bff, power: .12, sky: 0x9b84ff, ground: 0x35d2de, hemi: 1.5, stars: 0, aurora: 0, cloud: 0, exposure: 1.2 };
const COLOURS = ['top', 'horizon', 'fog', 'sun', 'sky', 'ground'] as const;
const NUMBERS = ['density', 'power', 'hemi', 'stars', 'aurora', 'cloud', 'exposure'] as const;
const palette = (air: Air) => Object.fromEntries(COLOURS.map(key => [key, new THREE.Color(air[key])])) as Record<typeof COLOURS[number], THREE.Color>;
const PALETTES = AIR.map(palette), CAVE_PALETTE = palette(CAVE_AIR);
export const SUN_DIRECTION = new THREE.Vector3(-.5, .74, -.46).normalize();

export function createAtmosphere(scene: THREE.Scene, parent: THREE.Object3D, track: Track, { calm, shadows }: { calm: boolean; shadows: 0 | 1024 | 2048 }) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunColor: { value: new THREE.Color() }, sun: { value: SUN_DIRECTION },
      stars: { value: 0 }, aurora: { value: 0 }, cloud: { value: 1 }, clock: { value: 0 } },
    vertexShader: 'varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 direction; uniform vec3 top, horizon, sunColor, sun; uniform float stars, aurora, cloud, clock;
      float hash(vec2 p) { p = fract(p * vec2(.1031, .103)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y); }
      void main() {
        vec3 d = normalize(direction);
        vec3 color = mix(horizon, top, pow(smoothstep(-.03, .72, d.y), .62));
        float glow = max(dot(d, sun), 0.);
        color += sunColor * (pow(glow, 18.) * .28 + pow(glow, 700.) * 2.2);
        // Soft heaped clouds that drift; their undersides take the horizon's colour.
        vec2 p = d.xz / (max(d.y, 0.) + .24) * 2.1 + vec2(clock * .006, 0.);
        float heap = noise(p) * .6 + noise(p * 2.3 + 11.) * .28 + noise(p * 5.1 - 7.) * .12;
        float cover = smoothstep(.56, .78, heap) * smoothstep(.01, .16, d.y) * cloud;
        color = mix(color, mix(horizon, vec3(1.), .55 + .45 * smoothstep(.6, .9, heap)), cover * .9);
        // Stars that twinkle, and curtains of northern light.
        vec2 cell = d.xz / (abs(d.y) + .35) * 46.; float star = hash(floor(cell));
        float spark = step(.988, star) * smoothstep(.45, .1, length(fract(cell) - .5)) * smoothstep(.06, .3, d.y);
        color += spark * stars * (.55 + .45 * sin(clock * 2.6 + star * 90.)) * (1. - cover);
        float fold = sin(d.x * 5. + sin(d.z * 3.6 + clock * .13) * 1.7 + clock * .07);
        float curtain = smoothstep(.15, 1., fold) * smoothstep(.1, .32, d.y) * smoothstep(.9, .42, d.y);
        float rays = .62 + .38 * sin(d.x * 64. + d.z * 23. + clock * .45);
        color += mix(vec3(.18, 1., .58), vec3(.62, .38, 1.), smoothstep(.22, .72, d.y)) * curtain * rays * aurora * .75;
        gl_FragColor = vec4(color, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
  dome.name = 'sky'; dome.renderOrder = -10; dome.frustumCulled = false; parent.add(dome);
  const fog = new THREE.FogExp2(0xffffff, .005); scene.fog = fog;
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.4); parent.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffffff, 3); parent.add(sun, sun.target);
  if (shadows) {
    const reach = shadows === 2048 ? 46 : 32;
    sun.castShadow = true; sun.shadow.mapSize.set(shadows, shadows);
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 20, far: 260 });
    sun.shadow.bias = -.0006; sun.shadow.normalBias = .05;
  }
  // Layered far hills close the world; the fog paints them in each place's own colour.
  const hills = new THREE.Group(); hills.name = 'far-hills'; parent.add(hills);
  const { minX, maxX, minZ, maxZ } = track.bounds, rim = Math.hypot(Math.max(-minX, maxX), Math.max(-minZ, maxZ)) + 150;
  const hillMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (let layer = 0; layer < 3; layer++) {
    const vertices: number[] = [], colors: number[] = [], indices: number[] = [], radius = rim + layer * 46, shade = new THREE.Color([0x5f8a6a, 0x6f93a0, 0x8aa6c0][layer]!);
    for (let i = 0; i <= 120; i++) {
      const angle = i / 120 * Math.PI * 2, high = 26 + layer * 16 + Math.sin(angle * 3 + layer * 1.7) * 11 + Math.sin(angle * 7 - layer) * 6 + Math.sin(angle * 13 + layer * 3) * 3;
      vertices.push(Math.sin(angle) * radius, -12, Math.cos(angle) * radius, Math.sin(angle) * radius, high, Math.cos(angle) * radius);
      colors.push(shade.r * .8, shade.g * .8, shade.b * .8, shade.r, shade.g, shade.b);
      if (i < 120) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices);
    hills.add(new THREE.Mesh(geometry, hillMaterial));
  }
  const now: Record<string, number | THREE.Color> = {}, target = new THREE.Color(), weights = [0, 0, 0, 0, 0];
  for (const key of COLOURS) now[key] = new THREE.Color(AIR[0]![key]);
  for (const key of NUMBERS) now[key] = AIR[0]![key];
  let cave = 0, first = true;
  return {
    sun,
    /** A measure of how dark it is around the player (0 day, 1 night or cave): lamps and sparks shine more. */
    get dusk() { return Math.min(1, (now.stars as number) + cave); },
    get exposure() { return now.exposure as number; },
    get horizonColor() { return now.horizon as THREE.Color; },
    update(distance: number, focus: THREE.Vector3, camera: THREE.Camera, dt: number, time: number) {
      track.mix(distance, weights);
      const inside = track.inCave(distance, -3) ? 1 : 0;
      cave = first ? inside : cave + (inside - cave) * (1 - Math.exp(-3.2 * dt));
      const rate = first ? 1 : 1 - Math.exp(-1.7 * dt); first = false;
      for (const key of COLOURS) {
        target.setRGB(0, 0, 0);
        for (let k = 0; k < 5; k++) { const c = PALETTES[k]![key]; target.r += c.r * weights[k]!; target.g += c.g * weights[k]!; target.b += c.b * weights[k]!; }
        target.lerp(CAVE_PALETTE[key], cave);
        (now[key] as THREE.Color).lerp(target, rate);
      }
      for (const key of NUMBERS) {
        let value = 0;
        for (let k = 0; k < 5; k++) value += AIR[k]![key] * weights[k]!;
        value += (CAVE_AIR[key] - value) * cave;
        now[key] = (now[key] as number) + (value - (now[key] as number)) * rate;
      }
      const u = material.uniforms;
      (u.top!.value as THREE.Color).copy(now.top as THREE.Color); (u.horizon!.value as THREE.Color).copy(now.horizon as THREE.Color);
      (u.sunColor!.value as THREE.Color).copy(now.sun as THREE.Color).multiplyScalar(1 - cave);
      u.stars!.value = now.stars; u.aurora!.value = now.aurora; u.cloud!.value = now.cloud; u.clock!.value = calm ? 0 : time;
      fog.color.copy(now.fog as THREE.Color); fog.density = now.density as number;
      hemisphere.color.copy(now.sky as THREE.Color); hemisphere.groundColor.copy(now.ground as THREE.Color); hemisphere.intensity = now.hemi as number;
      sun.color.copy(now.sun as THREE.Color); sun.intensity = now.power as number;
      // The shadow box follows the player in whole metres, so shadow edges do not crawl.
      sun.target.position.set(Math.round(focus.x), Math.round(focus.y), Math.round(focus.z));
      sun.position.copy(sun.target.position).addScaledVector(SUN_DIRECTION, 130);
      dome.position.copy(camera.position);
    },
    dispose() { sun.shadow.map?.dispose(); if (scene.fog === fog) scene.fog = null; },
  };
}
