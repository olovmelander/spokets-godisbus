import * as THREE from 'three';
import { createRoute } from './ported/route.js';
import { createKartCamera } from './ported/camera.js';
import type { KartRace, RacerId } from './race';
import { forest, sky } from './visual/forest';
import { roadSurface } from './visual/road';
import { toyKart, toyMaterial } from './visual/toys';
import { festival, raceMagic } from './visual/festival';

export interface KartViewOptions { calm: boolean; tier: 'low' | 'mid' | 'high' }
export type KartViewMode = 'menu' | 'race' | 'result';

/** A self-contained view for the toy console. The host owns input, clock and RAF; closing releases this context. */
export function createKartView(canvas: HTMLCanvasElement, {calm, tier}: KartViewOptions) {
  const low = tier === 'low';
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !low, alpha: false, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : tier === 'mid' ? 1.35 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.13;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbec9b1); scene.fog = new THREE.FogExp2(0xbec9b1, .0062);
  const root = new THREE.Group(); root.name = 'godisracet-varggropen'; scene.add(root);
  const camera = new THREE.PerspectiveCamera(58, 1, .08, 600);
  const track = createRoute(), anisotropy = Math.min(low ? 2 : 4, renderer.capabilities.getMaxAnisotropy());
  roadSurface(track, root, anisotropy); const woods = forest(track, root, low, anisotropy);
  const heavens = sky(root, calm); festival(track, root);
  scene.add(new THREE.HemisphereLight(0xc6e6e4, 0x8b7754, 2.0));
  const sun = new THREE.DirectionalLight(0xffdc9f, 2.3); sun.position.set(-60, 75, -45); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xa8c6df, .55); fill.position.set(45, 22, 60); scene.add(fill);
  const mat = toyMaterial(), karts = new Map<RacerId, ReturnType<typeof toyKart>>();
  const magic = raceMagic(track, root, low);
  const chase = createKartCamera(camera, track, {reducedMotion: calm});
  const shadowMap = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d')!; const fade = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
    fade.addColorStop(0, 'rgba(21,31,24,.42)'); fade.addColorStop(.55, 'rgba(21,31,24,.26)'); fade.addColorStop(1, 'rgba(21,31,24,0)');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 64, 64); return c;
  })());
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.5, 3.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: shadowMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3}), 4);
  shadows.name = 'toy-contact-shadows'; root.add(shadows);
  const dummy = new THREE.Object3D();
  let time = 0, previousElapsed = 0, previousRace: KartRace | null = null, disposed = false;
  function resize(width = canvas.clientWidth, height = canvas.clientHeight) {
    if (disposed) return;
    const w = Math.max(1, width), h = Math.max(1, height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  return {
    resize,
    render(race: KartRace, dt: number, mode: KartViewMode = 'race') {
      if (disposed) return;
      const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .1) : 0;
      if (previousRace !== race || race.state.elapsed < previousElapsed) {time = 0; chase.reset(); magic.reset();}
      previousRace = race; previousElapsed = race.state.elapsed; time += step;
      race.state.drivers.forEach((driver, i) => {
        let kart = karts.get(driver.id);
        if (!kart) {kart = toyKart(driver.id, driver.color, mat); karts.set(driver.id, kart); root.add(kart.root);}
        const sample = race.track.sample(driver.distance, driver.lane);
        kart.root.position.copy(sample.position); kart.root.position.y += .045;
        kart.root.rotation.set(sample.pitch, sample.angle + driver.heading, sample.roll, 'YXZ');
        kart.update(driver, step, time, calm);
        dummy.position.copy(sample.position); dummy.position.y += .057;
        dummy.rotation.set(sample.pitch, sample.angle + driver.heading, sample.roll, 'YXZ'); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); shadows.setMatrixAt(i, dummy.matrix);
      });
      shadows.count = race.state.drivers.length; shadows.instanceMatrix.needsUpdate = true; shadows.computeBoundingSphere();
      heavens.update(time); magic.update(race.state, step, time, calm);
      chase.update(race.state.player, mode === 'race' ? 'racing' : mode, step, time);
      renderer.render(scene, camera);
    },
    /** Small read-only counters for mobile validation, without retaining a second renderer or RAF. */
    stats() { return {calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, trees: woods.treeCount}; },
    dispose() {
      if (disposed) return; disposed = true;
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        geometries.add(mesh.geometry);
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        }
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      // The toy material may exist before the first render installs its kart; it still owns a texture.
      materials.add(mat); if (mat.map) textures.add(mat.map);
      textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose());
      scene.clear(); karts.clear(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
