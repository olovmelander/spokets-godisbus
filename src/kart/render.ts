import * as THREE from 'three';
import type { KartEvent, KartRace } from './sim/race';
import type { Track } from './sim/track';
import { createWorld } from './visual/world';
import { createAtmosphere } from './visual/sky';
import { createScenery } from './visual/scenery';
import { createEffects } from './visual/effects';
import { createChaseCamera, type CameraMode } from './visual/camera';
import { toyKart, toyMaterial, wheelGeometry, WHEELS } from './visual/toys';

export interface KartViewOptions { calm: boolean; tier: 'low' | 'mid' | 'high' }
export type KartViewMode = CameraMode;
const HOP_TIME = .24;

/** Frees everything drawn under an object: its geometries, materials and their textures. */
function release(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry || !mesh.material) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      const uniforms = (material as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const uniform of Object.values(uniforms)) if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose());
}

/** A self-contained view for the toy console. The host owns input, clock and RAF; closing releases this context.
 * The karts stay for the whole visit; the course they stand on is built when a race on a new course is first drawn. */
export function createKartView(canvas: HTMLCanvasElement, { calm, tier }: KartViewOptions) {
  const low = tier === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : tier === 'mid' ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = !low;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(62, 1, .15, 1400);
  const anisotropy = Math.min(low ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
  function build(track: Track) {
    const group = new THREE.Group(); group.name = `course:${track.id}`; scene.add(group);
    const world = createWorld(track, { low, anisotropy }); group.add(world.group);
    const air = createAtmosphere(scene, group, track, { calm, shadows: low ? 0 : tier === 'mid' ? 1024 : 2048 });
    const scenery = createScenery(track, world, { low, calm }); group.add(scenery.group);
    return { track, group, world, air, scenery, effects: createEffects(track, group, { low, calm }), chase: createChaseCamera(camera, track, { calm }), point: track.point(0) };
  }
  let stage: ReturnType<typeof build> | null = null;
  function unload(): void {
    if (!stage) return;
    stage.air.dispose(); stage.world.dispose(); release(stage.group); scene.remove(stage.group); stage = null;
    renderer.renderLists.dispose();
  }

  const wood = toyMaterial(), toys: ReturnType<typeof toyKart>[] = [], rolling: number[] = [];
  const wheels = new THREE.InstancedMesh(wheelGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .08 }), 32);
  wheels.name = 'toy-wheels'; wheels.frustumCulled = false; wheels.castShadow = !low; wheels.count = 0; scene.add(wheels);
  // Without a shadow map each kart still sits on a soft dark patch.
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 3.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d')!, fade = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
      fade.addColorStop(0, 'rgba(15,22,30,.5)'); fade.addColorStop(.55, 'rgba(15,22,30,.28)'); fade.addColorStop(1, 'rgba(15,22,30,0)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
    })(),
  }), 8);
  blobs.name = 'contact-shadows'; blobs.frustumCulled = false; blobs.visible = low; blobs.count = 0; scene.add(blobs);

  const dummy = new THREE.Object3D(), local = new THREE.Matrix4(), matrix = new THREE.Matrix4(), tint = new THREE.Color(), focus = new THREE.Vector3();
  const NONE: readonly KartEvent[] = [];
  let time = 0, previousElapsed = 0, previousRace: KartRace | null = null, disposed = false;
  function resize(width = canvas.clientWidth, height = canvas.clientHeight) {
    if (disposed) return;
    const w = Math.max(1, width), h = Math.max(1, height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  return {
    resize,
    render(race: KartRace, dt: number, mode: KartViewMode = 'race', events: readonly KartEvent[] = NONE) {
      if (disposed) return;
      if (stage?.track !== race.track) { unload(); stage = build(race.track); }
      const { track, world, air, scenery, effects, chase, point } = stage;
      const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .1) : 0, state = race.state;
      if (previousRace !== race || state.elapsed < previousElapsed) { chase.reset(); effects.reset(); }
      previousRace = race; previousElapsed = state.elapsed; time += step;
      state.karts.forEach((kart, i) => {
        let toy = toys[i];
        if (!toy) {
          toy = toys[i] = toyKart(kart.id, kart.color, wood); scene.add(toy.root); rolling[i] = 0;
          for (let w = 0; w < 4; w++) wheels.setColorAt(i * 4 + w, tint.set(kart.color));
          if (wheels.instanceColor) wheels.instanceColor.needsUpdate = true;
        }
        track.point(kart.distance, kart.lane, point);
        // A hop, a tumble's little bounce, and wheels in the water when the kart has left the boardwalk.
        const turned = kart.spin > 0 ? 1 - kart.spin / kart.spinTotal : 0;
        const hop = kart.hop > 0 ? Math.sin(Math.PI * (1 - kart.hop / HOP_TIME)) * .3 : 0;
        const bounce = kart.spin > 0 && kart.spinKind !== 'gum' ? Math.sin(Math.PI * Math.min(1, turned * 1.6)) * .9 : 0;
        const sink = kart.surface === 'water' && !kart.airborne ? -.32 : 0;
        const whirl = kart.spin > 0 ? (kart.spinKind === 'gum' ? 2 : 4) * Math.PI * (1 - (1 - turned) ** 2) : 0;
        const flip = kart.trick && kart.airborne ? Math.min(1, kart.airTime / .55) * Math.PI * 2 : 0;
        const nose = kart.airborne ? THREE.MathUtils.clamp(-kart.vy * .025, -.32, .3) : kart.y > .05 ? -.2 : 0;
        toy.root.position.set(point.x, point.y + kart.y + hop + bounce + sink + .02, point.z);
        toy.root.rotation.set(point.pitch + nose, point.angle + kart.heading + kart.slip + whirl, flip, 'YXZ');
        toy.root.visible = calm || kart.guard <= 0 || Math.sin(time * 42) < .35;
        // A rival that comes between the camera and the player thins out instead of filling the picture.
        const near = i === 0 || mode !== 'race' ? 1 : THREE.MathUtils.smoothstep(camera.position.distanceTo(toy.root.position), 3, 5.6);
        toy.material.transparent = near < 1; toy.material.opacity = near;
        if (near < .25) toy.root.visible = false;
        toy.update(kart, step, time, calm);
        toy.root.updateMatrix();
        rolling[i] = rolling[i]! + kart.speed * step / .34;
        WHEELS.forEach(([x, y, z, size, steers], w) => {
          dummy.position.set(x, y, z); dummy.rotation.set(rolling[i]!, steers ? kart.steer * .42 : 0, 0, 'YXZ'); dummy.scale.setScalar(size); dummy.updateMatrix();
          wheels.setMatrixAt(i * 4 + w, matrix.multiplyMatrices(toy!.root.matrix, local.copy(dummy.matrix)));
          if (!toy!.root.visible) wheels.setMatrixAt(i * 4 + w, matrix.makeScale(0, 0, 0));
        });
        if (low) {
          dummy.position.set(point.x, point.y + .09, point.z); dummy.rotation.set(point.pitch, point.angle + kart.heading + kart.slip, 0, 'YXZ');
          dummy.scale.setScalar(Math.max(.35, 1 - kart.y * .22)); dummy.updateMatrix(); blobs.setMatrixAt(i, dummy.matrix);
        }
      });
      wheels.count = state.karts.length * 4; wheels.instanceMatrix.needsUpdate = true;
      blobs.count = low ? state.karts.length : 0; blobs.instanceMatrix.needsUpdate = true;
      if (mode === 'race') for (const event of events) {
        if (!('kart' in event) || event.kart !== 0) continue;
        if (event.type === 'wall') chase.shake(.25 + event.force * .5);
        else if (event.type === 'hit') chase.shake(.8);
        else if (event.type === 'land') chase.shake(Math.min(.5, event.air * .5));
        else if (event.type === 'bump') chase.shake(.25);
      }
      chase.update(state.player, mode, step, time);
      track.point(chase.focus, 0, point); focus.set(point.x, point.y, point.z);
      air.update(chase.focus, focus, camera, step, time);
      world.update(calm ? 0 : time, air.horizonColor); scenery.update(time, air.dusk);
      effects.update(state, events, step, time, camera, mode);
      renderer.toneMappingExposure = air.exposure;
      renderer.render(scene, camera);
    },
    /** Small read-only counters for mobile validation, without retaining a second renderer or RAF. */
    stats() { return { course: stage?.track.id, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }; },
    dispose() {
      if (disposed) return; disposed = true;
      unload();
      toys.forEach(toy => toy.dispose());
      release(scene);
      wood.map?.dispose(); wood.dispose();
      scene.clear(); toys.length = 0; renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
