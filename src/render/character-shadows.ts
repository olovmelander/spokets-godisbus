import {
  CapsuleGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial,
  Object3D, PCFShadowMap, PlaneGeometry, ShaderMaterial, Vector3,
  type DirectionalLight, type Scene, type WebGLRenderer,
} from 'three';
import type { Tier } from './quality';
import { setBakedShade } from './forest-shadows';

export const CHARACTER_SHADOW_SIZE = 1024;
const CAPACITY = 64;
export interface ShadowCharacter {
  object: Object3D;
  /** Dimensions before the object's world scale; feet are at its origin. */
  height: number;
  radius: number;
  /** A jumping/flying character's support surface, when different from its feet. */
  groundY?(): number;
  /** Staged figures on hands or shelves have no shadow on the play plane. */
  active?(): boolean;
}

/** Bounded character shadows, with explicitly marked world casters sharing High's existing map. */
export function createCharacterShadows(renderer: WebGLRenderer, scene: Scene, sun: DirectionalLight) {
  const characters: ShadowCharacter[] = [];
  const place = new Object3D();
  const at = new Vector3(), scale = new Vector3();
  let worldCasters = false;
  scene.traverse((object) => { if (object instanceof Mesh && object.userData.casts === true) worldCasters = true; });
  // The backmost spruces cast across the path from over 50 EL towards the sun. Move the light back,
  // not its map bounds: otherwise the near plane clips the trees whose shade reaches the foreground.
  const direction = sun.position.clone().sub(sun.target.position).normalize().multiplyScalar(worldCasters ? 80 : 50);
  let tier: Tier = 'low';
  const fade = new InstancedBufferAttribute(new Float32Array(CAPACITY * 2), 2).setUsage(DynamicDrawUsage);
  const ground = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  ground.setAttribute('shadowFade', fade);
  const material = new ShaderMaterial({
    uniforms: { contact: { value: 0 } },
    vertexShader: `attribute vec2 shadowFade;
      varying vec2 vUv; varying vec2 vFade;
      void main(){vUv=uv;vFade=shadowFade;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float contact;varying vec2 vUv;varying vec2 vFade;
      void main(){float r=length(vUv*2.0-1.0);if(r>=1.0)discard;
        float blob=.25*pow(1.0-r,1.6)*vFade.x;
        float core=contact*.28*exp(-22.0*r*r)*vFade.y;
        gl_FragColor=vec4(vec3(.018),blob+core);}`,
    transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const blobs = new InstancedMesh(ground, material, CAPACITY);
  blobs.name = 'character-blobs';
  blobs.instanceMatrix.setUsage(DynamicDrawUsage);
  blobs.frustumCulled = false;
  blobs.renderOrder = 1;
  blobs.count = 0;
  // One conservative silhouette per visible character, instanced in one draw. It never changes the
  // figure's own materials, rig or private model, and writes no pixels/depth in the normal scene pass.
  const casters = new InstancedMesh(new CapsuleGeometry(.5, 1, 3, 6), new MeshBasicMaterial({ colorWrite: false, depthWrite: false }), CAPACITY);
  casters.name = 'character-shadow-casters';
  casters.instanceMatrix.setUsage(DynamicDrawUsage);
  casters.frustumCulled = false;
  casters.castShadow = true;
  casters.count = 0;
  casters.visible = false;
  scene.add(blobs, casters, sun.target);
  renderer.shadowMap.type = PCFShadowMap;
  sun.shadow.mapSize.set(CHARACTER_SHADOW_SIZE, CHARACTER_SHADOW_SIZE);
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .035;
  sun.shadow.radius = 2;
  sun.shadow.intensity = .55;
  sun.shadow.camera.near = .1;
  sun.shadow.camera.far = worldCasters ? 150 : 110;

  function releaseMap(): void {
    sun.shadow.map?.depthTexture?.dispose();
    sun.shadow.map?.dispose();
    sun.shadow.mapPass?.dispose();
    sun.shadow.map = null;
    sun.shadow.mapPass = null;
  }
  function setTier(next: Tier): void {
    tier = next;
    material.uniforms.contact!.value = tier === 'low' ? 0 : 1;
    renderer.shadowMap.enabled = sun.castShadow = casters.visible = tier === 'high';
    scene.traverse((object) => setBakedShade(object, tier !== 'high'));
    if (tier !== 'high') releaseMap();
    else sun.shadow.needsUpdate = true;
  }
  const visible = (object: Object3D) => {
    for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
    return true;
  };
  return {
    add(character: ShadowCharacter): void {
      if (characters.some((one) => one.object === character.object)) return;
      if (characters.length >= CAPACITY) throw new Error('Character shadow capacity exceeded');
      characters.push(character);
    },
    setTier,
    /** Called only during the existing loading/menu warmup, including after private models arrive. */
    prepareReceivers(): void {
      scene.traverse((object) => {
        // A ground mesh installed after the last tier change must take the current tier's shade too.
        setBakedShade(object, tier !== 'high');
        if (!(object instanceof Mesh) || object === casters || object === blobs) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (materials.some((m) => 'isMeshStandardMaterial' in m || 'isMeshLambertMaterial' in m)) object.receiveShadow = true;
        object.castShadow = object.userData.casts === true;
      });
    },
    update(focusX: number, focusY: number, span: number): void {
      // Move source and target together: the place's sun direction never changes as the camera follows.
      // Texel-sized steps prevent a stationary character's shadow crawling as the camera eases.
      const extent = Math.max(10, Math.min(40, span));
      const texel = extent * 2 / CHARACTER_SHADOW_SIZE;
      const centreX = Math.round(focusX / texel) * texel;
      const centreY = Math.round(focusY / texel) * texel;
      sun.target.position.set(centreX, centreY, 0);
      sun.position.copy(sun.target.position).add(direction);
      sun.target.updateMatrixWorld();
      const shadowCamera = sun.shadow.camera;
      if (shadowCamera.right !== extent) {
        shadowCamera.left = shadowCamera.bottom = -extent;
        shadowCamera.right = shadowCamera.top = extent;
        shadowCamera.updateProjectionMatrix();
      }
      let count = 0;
      for (const one of characters) {
        if (!visible(one.object) || one.active?.() === false) continue;
        one.object.updateWorldMatrix(true, false);
        at.setFromMatrixPosition(one.object.matrixWorld);
        // Matrix4.decompose substitutes unit scale for a singular zero-scale matrix in r186.
        // Reading column lengths directly keeps hidden helpers/rides from leaving stray shadows.
        scale.setFromMatrixScale(one.object.matrixWorld);
        if (Math.min(scale.x, scale.y, scale.z) < .01 || Math.abs(at.x - focusX) > extent + 3 || Math.abs(at.y - focusY) > extent + 6) continue;
        const groundY = one.groundY?.() ?? at.y;
        const height = Math.max(0, at.y - groundY);
        const radius = one.radius * Math.max(scale.x, scale.z);
        const bodyHeight = one.height * scale.y;
        // The blob broadens and fades with height; its tight contact core vanishes just off the ground.
        place.position.set(at.x, groundY + .018, at.z);
        place.scale.set(radius * (2 + Math.min(height, 3) * .15), 1, radius * 1.65);
        place.updateMatrix();
        blobs.setMatrixAt(count, place.matrix);
        fade.setXY(count, Math.max(.08, 1 / (1 + height * .7)), Math.max(0, 1 - height / Math.max(.1, bodyHeight * .3)));
        place.position.set(at.x, at.y + bodyHeight * .5, at.z);
        place.scale.set(radius * 1.5, bodyHeight * .5, radius * 1.3);
        place.updateMatrix();
        casters.setMatrixAt(count, place.matrix);
        count++;
      }
      blobs.count = casters.count = count;
      blobs.instanceMatrix.needsUpdate = casters.instanceMatrix.needsUpdate = true;
      fade.needsUpdate = true;
    },
    info: () => ({ characters: blobs.count, contact: tier !== 'low', mapSize: sun.shadow.map ? sun.shadow.map.width : 0, casters: tier === 'high' ? casters.count : 0 }),
    dispose(): void {
      setTier('low');
      blobs.geometry.dispose(); material.dispose(); casters.geometry.dispose(); casters.material.dispose();
      scene.remove(blobs, casters);
    },
  };
}
