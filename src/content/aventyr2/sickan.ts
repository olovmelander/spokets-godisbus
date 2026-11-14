import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Quaternion,
  SphereGeometry, TorusGeometry, Vector3, type Camera, type Object3D, type SkinnedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Assets } from '../../render/assets';
import { creatureClips, type CreatureClips } from '../../render/creature-clips';
import { heightAt, landscape } from '../../render/dressing/kit';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../render/extensions';
import type { ChapterData } from '../../sim/types';
import { SICKAN } from './chapters/stormgard';
import { createSickan, LID_OPEN, LOOK_RANGE, SICKAN_SIZE, stepSickan, type SickanPlace, type SickanState } from './sickan-life';

/**
 * Sickan, the family's black cat, out in the storm in Stormgården (Olov, 14 November 2026: "Kan vi modellera och lägga
 * till en svart katt i naturlig storlek som heter Sickan? Det är familjens katt, och den ska gå runt på passande
 * ställen på stormgården."). To an Elof of fifteen centimetres she is as big as a horse: 1.7 EL at the withers.
 *
 * She is modelled, rigged and animated in Blender (art/blender/sickan.py, aventyr2/sickan.glb): one skinned draw. Her
 * life (./sickan-life.ts) says where she is and which clip she shows; here she is put in the picture, and given what
 * is hers whatever she is doing: her head and ears turn to him when he is near, she blinks, her ears go flat at a
 * flash of lightning and in a gust, and her eyes give the lightning back.
 *
 * A black cat on a storm night is read from her outline: her fur has a sheen along its edges, as wet fur has against a
 * sky (it brightens with each flash), and her eyes are lit a little from within. She is in the picture on every
 * quality tier: she is one of the family. Until her file has come, and in a build without it, a plain black cat built
 * here sits and stands in her places.
 *
 * Picture only: the simulation knows nothing of her. She keeps behind the path, never on it or in front of it.
 */

const CLIPS = ['walk', 'trot', 'stand', 'sit', 'greet', 'wash', 'crouch', 'stretch', 'shake', 'jump'] as const;

/** The edge of her fur against the night's sky, and her eyes' own light: how strong at rest, and at a flash's height. */
const SHEEN = { colour: new Color('#a4acbc'), rest: 0.34, flash: 1.3 };
const EYES = { rest: 0.9, flash: 3.2 };

/** How far her head and her neck turn to him, to each side, and how fast. */
const LOOK = { yaw: 1.5, up: 0.85, down: 0.5, ease: 6 };

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/** What the picture of her has, for a session and the tests to look at (`sickanNow`). */
export interface SickanNow extends SickanState { rigged: boolean; fright: number; look: number }
let live: (() => SickanNow) | null = null;
/** Where she is and what she is doing in the chapter being played, or null where she is not. */
export const sickanNow = (): SickanNow | null => live?.() ?? null;

/** The rig in its holder, once her file has come, and how its fur is made (kept beside the scene: three copies userData as JSON). */
const RIGS = new WeakMap<Object3D, CreatureClips>();
const FURS = new WeakMap<Object3D, (material: MeshStandardMaterial) => MeshStandardMaterial>();

const spin = new Quaternion();
const parentTurn = new Quaternion();
const axis = new Vector3();

/**
 * Turns a bone about an axis of her own space (x ahead, y up, z to her right) by `angle`, on top of the pose her clip
 * gave it this frame. Her own space, not the world's: so it holds whichever way she faces, and shown in a mirror.
 */
function turnInRig(root: Object3D, bone: Object3D | undefined, about: Vector3, angle: number): void {
  if (!bone?.parent || angle === 0) return;
  parentTurn.identity();
  for (let node: Object3D | null = bone.parent; node && node !== root; node = node.parent) parentTurn.premultiply(node.quaternion);
  spin.setFromAxisAngle(about, angle);
  spin.premultiply(parentTurn.clone().invert()).multiply(parentTurn);
  bone.quaternion.premultiply(spin);
}

/** Turns a bone about one of its own axes: an ear laid back, a lid lowered. */
function turnOwn(bone: Object3D | undefined, x: number, z = 0): void {
  if (!bone) return;
  if (x !== 0) bone.quaternion.multiply(spin.setFromAxisAngle(axis.set(1, 0, 0), x));
  if (z !== 0) bone.quaternion.multiply(spin.setFromAxisAngle(axis.set(0, 0, 1), z));
}

/**
 * Her fur's sheen and her eyes' light, in her own material: the edge of her against the sky, strongest where her fur
 * faces up, and what is yellow-green in her (her irises, by their colour: nothing else of her is) lit from within.
 */
function furMaterial(material: MeshStandardMaterial, uniforms: { sickanSheen: { value: number }; sickanEyes: { value: number }; sickanSky: { value: Color } }): MeshStandardMaterial {
  const fur = material.clone();
  fur.roughness = 0.62;
  fur.metalness = 0;
  const before = fur.onBeforeCompile;
  const key = fur.customProgramCacheKey.bind(fur);
  fur.customProgramCacheKey = () => `${key()}:sickan-fur-v1`;
  fur.onBeforeCompile = (shader, renderer) => {
    before.call(fur, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = /* glsl */ `uniform float sickanSheen, sickanEyes;
      uniform vec3 sickanSky;
      ` + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
      float sickanEdge = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
      float sickanUp = 0.35 + 0.65 * smoothstep(-0.5, 0.7, dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));
      float sickanIris = smoothstep(0.05, 0.16, diffuseColor.g - diffuseColor.b);
      outgoingLight += sickanSky * sickanSheen * sickanUp * sickanEdge * sickanEdge * sickanEdge * sickanEdge * (1.0 - sickanIris);
      outgoingLight += diffuseColor.rgb * sickanIris * sickanEyes;
      #include <opaque_fragment>`);
  };
  fur.needsUpdate = true;
  return fur;
}

/** A point of the stand-in: a ball, pulled into shape, in one colour. */
function ball(radius: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, colour: Color): BufferGeometry {
  const shape = new SphereGeometry(radius, 12, 9).scale(sx, sy, sz).translate(x, y, z).toNonIndexed();
  return tinted(shape, colour);
}

function tinted(shape: BufferGeometry, colour: Color): BufferGeometry {
  shape.deleteAttribute('uv');
  const count = shape.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colours.set([colour.r, colour.g, colour.b], i * 3);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return shape;
}

/**
 * The stand-in, built here: a plain black cat in her own measure (1 at the withers, facing +x), sitting or standing.
 * One draw; it holds still.
 */
export function standInCat(sitting: boolean): BufferGeometry {
  const black = new Color('#1b1a20'), iris = new Color('#c2d83a'), inner = new Color('#3a2b2f');
  const parts: BufferGeometry[] = [];
  const leg = (x: number, z: number, top: number) => tinted(new CylinderGeometry(0.06, 0.05, top, 8).translate(x, top / 2, z).toNonIndexed(), black);
  const head = sitting ? new Vector3(0.52, 1.17, 0) : new Vector3(0.86, 1.14, 0);
  if (sitting) {
    parts.push(ball(0.3, 1, 1.25, 0.8, -0.1, 0.42, 0, black), ball(0.22, 1, 1.5, 0.85, 0.18, 0.68, 0, black));
    parts.push(leg(0.34, 0.07, 0.6), leg(0.34, -0.07, 0.6));
    parts.push(tinted(new TorusGeometry(0.34, 0.045, 6, 14, Math.PI * 1.1).rotateX(Math.PI / 2).rotateY(-0.5).translate(0.05, 0.05, 0.12).toNonIndexed(), black));
  } else {
    parts.push(ball(0.2, 3.1, 1.15, 0.85, -0.02, 0.78, 0, black), ball(0.14, 1.5, 1.2, 0.9, 0.62, 0.98, 0, black));
    for (const [x, z] of [[0.42, 0.08], [0.42, -0.08], [-0.46, 0.085], [-0.46, -0.085]] as const) parts.push(leg(x, z, 0.62));
    parts.push(tinted(new CylinderGeometry(0.035, 0.05, 1.1, 7).rotateZ(-0.45).translate(-0.86, 1.3, 0).toNonIndexed(), black));
  }
  parts.push(ball(0.2, 1, 0.9, 1, head.x, head.y, head.z, black), ball(0.08, 1, 0.8, 1, head.x + 0.17, head.y - 0.05, 0, black));
  for (const side of [1, -1]) {
    parts.push(tinted(new ConeGeometry(0.085, 0.22, 4).translate(head.x - 0.05, head.y + 0.24, side * 0.12).toNonIndexed(), side > 0 ? black : inner));
    parts.push(ball(0.045, 0.5, 1, 1, head.x + 0.165, head.y + 0.03, side * 0.085, iris));
  }
  const merged = mergeGeometries(parts.map((part) => { part.deleteAttribute('uv'); return part; }));
  parts.forEach((part) => part.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** Whether a point is in the picture, or within her own length of its edges (she is four EL from nose to tail). */
const corner = new Vector3();
function inPicture(camera: Camera, x: number, y: number, z: number, margin = 0.4): boolean {
  corner.set(x, y, z).project(camera);
  return Math.abs(corner.x) < 1 + margin && Math.abs(corner.y) < 1 + margin * 2 && corner.z > -1 && corner.z < 1;
}

/** Stormgården's cat (registered by ./render.ts). Other chapters get nothing. */
export function sickanExtra({ chapter, scene, hemisphere }: ExtraContext): ViewExtra | null {
  live = null;
  if (chapter.id !== 'stormgard') return null;
  return sickan(chapter, SICKAN, scene, () => hemisphere.intensity);
}

/** Her picture and her life, for the places given. `skyLight` is the sky's light now: a flash raises it. */
export function sickan(chapter: ChapterData, places: readonly SickanPlace[], scene: Object3D, skyLight: () => number): ViewExtra {
  const land = landscape(chapter);
  const ground = (x: number) => heightAt(land, x);
  const state = createSickan(places);
  // Where she is; which way she faces; how her nose tips; her size, and her mirror.
  const holder = new Group();
  holder.name = 'sickan';
  const tilt = new Group();
  const fit = new Group();
  fit.name = 'sickan-fit';
  fit.userData.sickan = 'waiting';
  holder.add(tilt);
  tilt.add(fit);
  scene.add(holder);
  const uniforms = { sickanSheen: { value: SHEEN.rest }, sickanEyes: { value: EYES.rest }, sickanSky: { value: SHEEN.colour } };
  FURS.set(fit, (material) => furMaterial(material, uniforms));
  const sitting = standInCat(true), standing = standInCat(false);
  let standIn: Mesh | null = new Mesh(sitting, furMaterial(new MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), uniforms));
  standIn.name = 'sickan-stand-in';
  fit.add(standIn);

  const calm = skyLight();
  let flashWas = 0;
  let fright = 0;
  let look = 0, yaw = 0, pitch = 0;
  let blink = 2, lids = 0;
  let shown: string | null = null;
  // The bones turned here on top of her clips, and the pose her clip last gave each: the mixer writes a bone only when
  // its clip's value changes, so what is added here is taken off again before the next frame's pose.
  const OWN = ['neck', 'head', 'ear.L', 'ear.R', 'lid.L', 'lid.R'] as const;
  let own: { bone: Object3D; pose: Quaternion }[] | null = null;
  const gustStretch = chapter.gusts?.[0];
  const right = new Vector3(), up = new Vector3(0, 1, 0), eyes = new Vector3();

  live = () => ({ ...state, show: { ...state.show }, from: { ...state.from }, rigged: !!RIGS.get(fit), fright, look });

  return {
    update({ dt, x, y, flags, camera, still, gusts }: ExtraFrame) {
      stepSickan(state, places, { dt, elof: { x, y }, still, flags, ground, seen: (px, py, pz) => inPicture(camera, px, py, pz) });
      holder.position.set(state.x, state.y, state.z);
      holder.rotation.y = state.heading;
      tilt.rotation.z = state.pitch;
      fit.scale.set(SICKAN_SIZE, SICKAN_SIZE, state.mirror ? -SICKAN_SIZE : SICKAN_SIZE);

      // The storm: a flash of lightning, and a gust where she is out on the lawn with him.
      const flash = still || calm <= 0 ? 0 : Math.min(1.2, Math.max(0, (skyLight() / calm - 1) / 1.1));
      const gust = gustStretch && state.x > gustStretch.from - 2 && state.x < gustStretch.to + 2 ? gusts?.[0] : undefined;
      const blown = still ? 0 : gust ? Math.max(gust.blow > 0 ? 1 : 0, gust.warn > 0 ? 0.55 : 0) : 0;
      if (flash > 0.3 && flashWas <= 0.3) fright = 1;
      flashWas = flash;
      fright = Math.max(blown, fright - dt / 1.3);
      uniforms.sickanSheen.value = SHEEN.rest + (SHEEN.flash - SHEEN.rest) * Math.min(1, flash);
      uniforms.sickanEyes.value = EYES.rest + (EYES.flash - EYES.rest) * Math.min(1, flash);

      const rig = RIGS.get(fit);
      if (!rig) {
        if (standIn) standIn.geometry = state.mode === 'rest' && state.show.clip !== 'stand' ? sitting : standing;
        return;
      }
      if (standIn) {
        // Her own model has come: the stand-in has done its part.
        standIn.removeFromParent();
        (standIn.material as MeshStandardMaterial).dispose();
        sitting.dispose();
        standing.dispose();
        standIn = null;
      }
      const { clip, phase, once, fade } = state.show;
      if (phase !== undefined) rig.scrub(clip, phase);
      else rig.play(clip, { ...(fade !== undefined ? { fade } : {}), once: once ?? false, restart: clip !== shown && !!once });
      shown = phase === undefined ? clip : null;
      own ??= OWN.flatMap((name) => { const bone = rig.bone(name); return bone ? [{ bone, pose: bone.quaternion.clone() }] : []; });
      for (const { bone, pose } of own) bone.quaternion.copy(pose);
      rig.update(dt);
      for (const { bone, pose } of own) pose.copy(bone.quaternion);
      if (still) return;

      // Her head and her neck turn to him while she rests and he is near (or to what she watches there).
      const place = places[state.place]!;
      const watching = place.watch && flags.has(place.watch.on) && !flags.has(place.watch.until) ? place.watch : null;
      const attentive = (state.mode === 'rest' && (state.doing === 'idle' || state.doing === 'greet')) || state.mode === 'settle';
      const to = watching ?? { x, y: y + 0.55, z: 0 };
      const near = attentive && (watching !== null || Math.abs(x - state.x) < LOOK_RANGE);
      look += ((near ? 1 : 0) - look) * Math.min(1, dt * 4);
      const neck = rig.bone('neck'), head = rig.bone('head');
      if (near && head) {
        // Where he is from her head, in her own space: ahead, up, and to her right (the camera's side, facing +x).
        holder.updateWorldMatrix(true, true);
        head.getWorldPosition(eyes);
        const dx = to.x - eyes.x, dy = to.y - eyes.y, dz = to.z - eyes.z;
        const ahead = dx * Math.cos(state.heading) - dz * Math.sin(state.heading);
        const aside = (dx * Math.sin(state.heading) + dz * Math.cos(state.heading)) * (state.mirror ? -1 : 1);
        const wantYaw = Math.max(-LOOK.yaw, Math.min(LOOK.yaw, Math.atan2(aside, ahead)));
        const wantPitch = Math.max(-LOOK.down, Math.min(LOOK.up, Math.atan2(dy, Math.hypot(ahead, aside))));
        yaw += (wantYaw - yaw) * Math.min(1, dt * LOOK.ease);
        pitch += (wantPitch - pitch) * Math.min(1, dt * LOOK.ease);
      }
      const turn = yaw * look, nod = (pitch * look) - 0.3 * fright;
      // A turn to her right is a turn about her up the other way; her nose lifts about the line across her, turned with it.
      turnInRig(rig.root, neck, up, -turn * 0.42);
      turnInRig(rig.root, head, up, -turn * 0.58);
      right.set(-Math.sin(turn), 0, Math.cos(turn));
      turnInRig(rig.root, neck, right, nod * 0.4);
      turnInRig(rig.root, head, right, nod * 0.6);

      // Her ears: pricked towards him as she looks; laid back and out at a flash and in a gust.
      const back = 0.75 * fright - 0.14 * look * (1 - fright), out = 0.5 * fright;
      turnOwn(rig.bone('ear.L'), back, out);
      turnOwn(rig.bone('ear.R'), back, -out);

      // Her lids: a blink now and then, and half shut against the wind. At a flash her eyes stay wide, and shine.
      blink -= dt;
      if (blink < -0.2) blink = 2.4 + 4 * ((Math.sin(state.x * 12.9898 + state.time * 78.233) * 43758.5453) % 1 + 1) / 2;
      const blinking = blink < 0 && clip !== 'greet' && clip !== 'wash' ? Math.sin((Math.PI * -blink) / 0.2) : 0;
      lids += (Math.max(blinking, 0.4 * blown) - lids) * Math.min(1, dt * 30);
      const shut = -(LID_OPEN * Math.PI / 180) * smooth(lids);
      turnOwn(rig.bone('lid.L'), shut);
      turnOwn(rig.bone('lid.R'), shut);
    },
  };
}

/** One of the pack's model loaders (../../render/extensions.ts `models`): her rig, into the holder that waits for it. */
export async function installSickan(assets: Assets, scene: Object3D): Promise<boolean> {
  const fit = scene.getObjectByName('sickan-fit');
  if (!fit || fit.userData.sickan !== 'waiting') return false;
  const manifest = await assets.manifest();
  if (!manifest.packs.aventyr2?.files['sickan.glb']) return false;
  const model = await assets.model('aventyr2', 'sickan').catch((error) => {
    console.warn('Sickan could not be loaded; the plain cat stays.', error);
    return null;
  });
  if (!model) return false;
  return attachSickan(fit, model);
}

/** Puts a copy of her from `model` into her holder. False if the model has not all her clips. */
export function attachSickan(fit: Object3D, model: Object3D): boolean {
  const clips = creatureClips(model, 'sickan', { fade: 0.3 });
  if (!clips || CLIPS.some((name) => !clips.has(name))) {
    clips?.dispose();
    return false;
  }
  const fur = FURS.get(fit);
  clips.root.traverse((node) => {
    const mesh = node as SkinnedMesh;
    const material = mesh.material as MeshStandardMaterial | undefined;
    if (!mesh.isMesh || !material?.isMeshStandardMaterial) return;
    if (fur) mesh.material = fur(material);
  });
  fit.add(clips.root);
  fit.userData.sickan = 'here';
  RIGS.set(fit, clips);
  return true;
}
