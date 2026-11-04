import {
  Color, MeshStandardMaterial, NormalBlending, Vector3, Vector4, type Material, type Mesh, type Object3D,
} from 'three';
import type { ChapterData, PlaceId } from '../../../sim/types';
import type { ExtraContext, ExtraFrame } from '../../extensions';
import { KIT } from '../../dressing/kit';
import { waterKind } from '../../water';

/**
 * Matte carved wood against wet, glossy moss (docs/visual-upgrade.md, "Ljus och luft"), and surfaces that are wet
 * where water is: near a pool or a brook, in the bog, the village street after rain, and everything out of doors
 * in Äventyr 2's storm.
 *
 * It is one patch on the scene's own materials, laid at warm-up as the rim light and the caustics are: no draw, no
 * texture, and one program key (`lift-surface-v1`) for every material it touches, so that materials which shared
 * a program still do. What a material is (carved wood, planed wood, moss, ground, street) is a uniform of its own,
 * and where the wet is, is the place's (`liftWet`) and its pools' (`liftPools`).
 */

/** What a surface is: wood (0, 0.5 planed, 1 carved), moss (0, 0.5 by its colour, 1 all), whether it gets wet, and whether it is a street. */
export type SurfaceClass = readonly [wood: number, moss: number, wet: number, street: number];

export const CARVED: SurfaceClass = [1, 0, 0, 0];
const PLANED_DRY: SurfaceClass = [0.5, 0, 0, 0];
const MOSS: SurfaceClass = [0, 1, 1, 0];
const MOSSY: SurfaceClass = [0, 0.5, 1, 0];

/** A carved figure or the ghost, by a name on it or above it: Elof's own figure is not one. */
const CARVING = /trägubbe|tragubbe|carving|ghost|stage-block|figure|carved/i;
/** People, animals and what they hold keep their own materials. */
const ACTOR = /^(player|stage-|helper|bird$|owl|jay|elof|ghost-thought|fauna)/i;
/** What stands about in a place and gets wet with it, where it is not in the dressing. */
const PROP = /^(spot:|mover:|ledges:|landmark:|storm$|furniture:|decor)/;

/** Bare wood's colours: warm, not grey, not bright, not painted. */
export function woodColoured(colour: Color): boolean {
  const c = colour.clone().convertLinearToSRGB();
  const { r, g, b } = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const hsl = { h: 0, s: 0, l: 0 };
  const hue = c.getHSL(hsl).h * 360;
  return max > 0.2 && max < 0.93 && (max - min) / max > 0.07 && hue >= 14 && hue <= 62 && r >= b;
}

/** The colour a shape is painted in on its corners, on the whole: what a material with vertex colours shows. */
function paintOf(mesh: Mesh, tint: Color): Color {
  const colour = mesh.geometry.getAttribute('color');
  const sum = new Color(0, 0, 0);
  if (!colour) return tint;
  const step = Math.max(1, Math.floor(colour.count / 64));
  let n = 0;
  for (let i = 0; i < colour.count; i += step, n++) sum.r += colour.getX(i), sum.g += colour.getY(i), sum.b += colour.getZ(i);
  return n ? sum.multiplyScalar(1 / n).multiply(tint) : tint;
}

/** What a place's wet is: in its moss's hollows, on its street, and how much of all out of doors in a storm, from where. */
export function wetOf(chapter: ChapterData, place: PlaceId | undefined): Vector4 {
  const moss: Partial<Record<PlaceId, number>> = { forest: 0.9, bog: 0.95, garden: 0.5 };
  const storm = (chapter.storm?.rain ?? 0) > 0 ? 0.8 : 0;
  // The village street after the night's rain: damp all over, and wet round the puddle.
  const street = place === 'village' ? (storm ? 1 : 0.6) : 0;
  // At home only what is out of doors gets wet: from the chapter's door on.
  const from = place === 'home' ? chapter.outdoors ?? 1e9 : -1e9;
  return new Vector4(storm, from, Math.max(moss[place!] ?? 0, storm ? 0.8 : 0), street);
}

/** Whether a place has dew in its moss and grass: the mornings out of doors, not the storm. */
export const dewy = (chapter: ChapterData) => !chapter.storm && chapter.night === undefined
  && (chapter.place === 'garden' || chapter.place === 'forest' || (chapter.place === 'home' && chapter.outdoors !== undefined));

/** What a material on a mesh is, read from the scene: null for what keeps its own look. */
export function classify(mesh: Mesh, material: MeshStandardMaterial, dressing: Object3D | null, chapter: ChapterData): SurfaceClass | null {
  if (material.userData.candy || material.transparent || material.opacity < 1 || !material.colorWrite
    || material.blending !== NormalBlending || mesh.name === 'lake') return null;
  // What gives off light of its own keeps it: a lamp's shade, a window.
  if (material.emissiveIntensity * Math.max(material.emissive.r, material.emissive.g, material.emissive.b) > 0.4) return null;
  // Of the ground, only its boards: the banks of moss, lawn, peat and street are most of the picture, and the patch
  // over them halved the frame in software rendering. The contrast shows where it is seen: figures, boards, moss.
  const ground = material.userData.ground as string | undefined;
  if (ground) return null;
  let carved = false, actor = false, scenery = false, furniture = false, player = false;
  const ghostHelps = chapter.helper?.kind === 'ghost';
  for (let o: Object3D | null = mesh; o; o = o.parent) {
    const name = o.name;
    if (o === dressing) scenery = true;
    if (/player|bag/i.test(name)) player = true;
    else if (o.userData.carved || CARVING.test(name) || (ghostHelps && name === 'helper-actor')) carved = true;
    else if (ACTOR.test(name)) actor = true;
    if (/^furniture:/.test(name)) furniture = true;
    if (PROP.test(name)) scenery = true;
  }
  if (player) return null;
  const wood = woodColoured(material.vertexColors ? paintOf(mesh, material.color) : material.color);
  // A carving's parts that are not its body keep theirs: its eyes, its moss, and the knife's marks on it.
  if (carved) return wood && mesh.geometry.type !== 'BoxGeometry' ? CARVED : null;
  if (actor) return null;
  if (furniture) return wood ? PLANED_DRY : null;
  if (!scenery) return null;
  // The dressing's kit exists only once a place has been dressed (the title alone has none).
  if (KIT && material === KIT.moss) return MOSS;
  // Moss and its damp only where moss is: the kit's stones and bark. Grass, leaves and buildings, which are vertex
  // coloured too, keep their own light: patched, they ran the wet and the noise over most of the picture.
  if (KIT && (material === KIT.stone || material === KIT.bark)) return MOSSY;
  // At home the figures on Pappa's shelf are carved; the shelf, the furniture, the boards and the planks keep their
  // own light (large planed areas: a deck, a floor, the bog's walk).
  if (chapter.place === 'home' && wood) return mesh.geometry.type === 'BoxGeometry' ? null : CARVED;
  return null;
}

/** Value noise, for both stages. */
const NOISE_CORE = /* glsl */ `
float liftHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float liftNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(liftHash(i), liftHash(i + vec3(1, 0, 0)), f.x), mix(liftHash(i + vec3(0, 1, 0)), liftHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(liftHash(i + vec3(0, 0, 1)), liftHash(i + vec3(1, 0, 1)), f.x), mix(liftHash(i + vec3(0, 1, 1)), liftHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

/** The glints, for the fragments only (fwidth). */
const NOISE = NOISE_CORE + /* glsl */ `
// A few bright points on a surface, each in a cell of its own, that twinkle slowly: never faster than once in
// four seconds, and not at all while the clock stands. Below a pixel they fade instead of flickering.
float liftGlints(vec3 p, float cell, float share) {
  float pixel = length(fwidth(p));
  vec3 q = p / cell, c = floor(q);
  float h = liftHash(c + 7.13);
  vec3 centre = vec3(liftHash(c + 1.3), liftHash(c + 2.7), liftHash(c + 4.1)) * 0.6 + 0.2;
  float d = length(fract(q) - centre) * cell;
  float r = max(cell * 0.16, pixel * 0.9);
  float twinkle = 0.5 + 0.5 * sin(liftTime * (0.35 + 0.9 * h / share) + h * 61.0);
  return step(h, share) * (1.0 - smoothstep(0.0, r, d)) * min(1.0, cell * cell * 0.0256 / (r * r)) * twinkle * twinkle * twinkle;
}
`;

/** The value noise for the vertex stage (the glints use fwidth, which only fragments have). */
const NOISE_VERTEX = NOISE_CORE;

const DECLARE = /* glsl */ `
uniform vec4 liftSurface, liftWet, liftPools[8], liftPlace;
uniform vec3 liftSunDir, liftSun, liftSky, liftGrain;
uniform float liftTime;
varying vec3 liftWorld, liftLocal, liftPoolV;
`;

/** In the vertex stage, after the wind has moved it: where the corner is in the world, and in its own shape at the world's size. */
const VERTEX = /* glsl */ `
{
  mat4 liftM = modelMatrix;
  #ifdef USE_INSTANCING
    liftM = liftM * instanceMatrix;
  #endif
  liftWorld = (liftM * vec4(transformed, 1.0)).xyz;
  liftLocal = transformed * vec3(length(liftM[0].xyz), length(liftM[1].xyz), length(liftM[2].xyz));
  // On High, what changes slowly over a surface, per corner: the pools' wet, the shore's dark band, the noise.
  liftPoolV = vec3(0.0, 0.0, 0.5);
  if (liftPlace.x > 1.5 && liftSurface.z > 0.5) {
    for (int i = 0; i < 8; i++) {
      vec4 pool = liftPools[i];
      if (pool.z < -1e5) break;
      float side = max(max(pool.x - liftWorld.x, liftWorld.x - pool.y), 0.0);
      float up = liftWorld.y - pool.z;
      float inside = step(liftWorld.z, pool.w) * step(-3.0, up);
      liftPoolV.x = max(liftPoolV.x, inside * (1.0 - smoothstep(0.4, 1.9, side)) * (1.0 - smoothstep(0.05, 0.85, up)));
      liftPoolV.y = max(liftPoolV.y, inside * (1.0 - smoothstep(0.25, 0.9, side)) * (1.0 - smoothstep(0.03, 0.2, abs(up - 0.05))));
    }
    liftPoolV.z = liftNoise(liftWorld * 1.3) * 0.65 + liftNoise(liftWorld * 4.3) * 0.35;
  }
}
#include <project_vertex>`;

/**
 * Before the light is summed: the wet darkens and smooths what it lies on, moss is damp in its hollows, and wood
 * is matt, its grain in its colour and its knife's facets in its normal. `liftPlace`: the tier (0 Low, 1 Mid, 2
 * High), daylight, and whether the place has dew.
 */
const SURFACE = /* glsl */ `
float liftWetness = 0.0, liftBand = 0.0, liftMossy = 0.0, liftNoiseA = 0.5, liftFilm = 0.0;
vec3 liftN = normal;
// All of it on High only: Low and Mid keep the place's own materials, and skip it in one branch on a uniform (the
// patch cost about a third of a frame there in software rendering, and a phone's GPU is short of fragment time).
if (liftPlace.x > 1.5) {
  liftN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  vec3 c = diffuseColor.rgb;
  float top = max(c.r, max(c.g, c.b));
  float byColour = smoothstep(0.25, 0.45, (top - min(c.r, min(c.g, c.b))) / max(top, 1e-4))
    * smoothstep(0.85, 1.05, c.g / max(c.r, 1e-4)) * smoothstep(1.4, 2.2, c.g / max(c.b, 1e-4));
  liftMossy = liftSurface.y > 0.75 ? 1.0 : liftSurface.y * 2.0 * byColour;
  if (liftSurface.z > 0.5) {
    // The pools' wet and the shore's band, and the noise, come from the corners (VERTEX): they change slowly over
    // the ground, and a loop and two octaves of noise in every fragment cost half a frame in software rendering.
    float wet = max(liftWet.x * step(liftWet.y, liftWorld.x), liftPoolV.x);
    liftBand = liftPoolV.y;
    if (liftPlace.x > 1.5 && (wet > 0.0 || liftMossy * liftWet.z > 0.0 || liftSurface.w * liftWet.w > 0.0)) {
      liftNoiseA = liftPoolV.z;
      // Damp moss: in its hollows, broken by the noise, more on its sides than on its tops.
      float hollow = smoothstep(0.5, 0.68, liftNoiseA + 0.15 * (1.0 - liftN.y));
      wet = max(wet, liftWet.z * liftMossy * hollow);
      wet = max(wet, liftWet.w * liftSurface.w * smoothstep(0.3, 0.6, liftNoiseA + 0.15));
      wet *= 0.7 + 0.3 * smoothstep(0.25, 0.6, liftNoiseA);
      // On a street the wet lies in broad flat patches, a film of water that gives back the sky as a puddle does.
      if (liftSurface.w > 0.5) liftFilm = smoothstep(0.2, 0.6, wet) * smoothstep(0.56, 0.74, liftNoise(liftWorld * vec3(0.42, 0.42, 0.8) + 9.0)) * step(0.7, liftN.y);
    } else wet = max(wet, max(liftWet.z * liftMossy * 0.5, liftWet.w * liftSurface.w));
    liftWetness = clamp(max(wet, liftBand), 0.0, 1.0);
    float porous = mix(0.68, 0.55, max(liftMossy, liftSurface.w));
    float l = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1));
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(l), diffuseColor.rgb, 1.2) * porous, liftWetness);
    diffuseColor.rgb *= 1.0 - 0.3 * liftBand;
    float slick = mix(mix(0.3, 0.38, liftMossy), 0.14, max(max(liftBand, liftFilm), liftSurface.w * liftWetness * liftWetness));
    roughnessFactor = mix(roughnessFactor, slick * (0.8 + 0.4 * liftNoiseA), liftWetness);
    diffuseColor.rgb *= 1.0 - 0.4 * liftFilm;
  }
  if (liftSurface.x > 0.25) {
    // Wood: matt where it is dry, with its grain along it and, carved, the knife's facets.
    roughnessFactor = max(roughnessFactor, mix(0.9, 0.5, liftWetness));
    // The grain and the knife's facets on High: on Mid the wood is matt and plain.
    if (liftPlace.x > 1.5) {
      vec3 g = normalize(liftGrain);
      float along = dot(liftLocal, g);
      vec3 across = liftLocal - g * along;
      float grain = liftNoise(across * 34.0 + g * along * 2.2) * 0.6 + 0.4 * sin(length(across) * 70.0 + liftNoise(liftLocal * 6.0) * 5.0);
      diffuseColor.rgb *= 0.9 + 0.13 * grain;
      if (liftSurface.x > 0.75) {
        // The knife's facets: a lattice turned off the shape's own axes, its cells bent a little, each a cut at
        // a tilt of its own; and the shape's own flat faces, as a carving's are.
        vec3 p = mat3(0.8, -0.36, 0.48, 0.48, 0.8, -0.36, -0.36, 0.48, 0.8) * liftLocal * 5.0 + liftNoise(liftLocal * 3.0) * 0.6;
        vec3 cell = floor(p);
        vec3 tilt = mat3(viewMatrix) * (vec3(liftHash(cell), liftHash(cell + 3.1), liftHash(cell + 5.7)) - 0.5);
        normal = normalize(normal + 0.55 * (tilt - normal * dot(normal, tilt)));
        normal = normalize(mix(normal, normalize(cross(dFdx(-vViewPosition), dFdy(-vViewPosition))), 0.4));
      }
    }
  }
}
#include <emissivemap_fragment>`;

/**
 * After the light is summed: the wet gives back the sky where it is looked along and catches the low sun in a few
 * points; dew catches it in the moss of a morning; carved wood has a little warm light at its edge.
 */
/** The warm light at a carving's edge: pale, never gold (docs/visual-upgrade.md). */
export const RIM = [1, 0.87, 0.7] as const;
const LIGHT = /* glsl */ `
if (liftPlace.x > 1.5) {
  vec3 view = normalize(vViewPosition);
  float facing = saturate(dot(normal, view));
  if (liftWetness > 0.0) {
    float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
    outgoingLight += liftSky * (liftWetness * fresnel * mix(0.4, 0.3, liftMossy) * (0.75 + 0.5 * liftNoiseA) + liftFilm * (0.06 + 0.22 * fresnel));
  }
  // The sun's sheen and glints on High; the carving's warm edge on Mid too.
  if (liftPlace.x > 1.5) {
    float sunny = saturate(dot(liftN, normalize(liftSunDir))) * liftPlace.y;
    // Damp moss catches the low sun in a soft sheen, wider than the light's own highlight.
    if (liftMossy * liftWetness > 0.0) {
      vec3 toSun = normalize(view + normalize((viewMatrix * vec4(liftSunDir, 0.0)).xyz));
      outgoingLight += liftSun * liftMossy * liftWetness * pow(saturate(dot(normal, toSun)), 10.0) * 0.1 * liftPlace.y;
    }
    float glints = liftWetness > 0.02 ? liftWetness * liftGlints(liftWorld, 0.07, 0.22) : 0.0;
    if (liftPlace.z * liftMossy > 0.0) glints += liftPlace.z * liftMossy * liftGlints(liftWorld + 3.1, 0.05, 0.08);
    outgoingLight += liftSun * glints * sunny * 0.9;
  }
  if (liftPlace.x > 0.5 && liftSurface.x > 0.75) outgoingLight += diffuseColor.rgb * vec3(${RIM.map((c) => c.toFixed(2)).join(', ')}) * pow(1.0 - facing, 3.0) * 0.22 * (0.4 + 0.6 * liftPlace.y);
}
#include <opaque_fragment>`;

const PALE = new Vector3(1, 1, 1);
/** How far the sun's colour is paled towards white where it shines in a drop or a wet point. */
export const PALED = 0.8;

/** The surfaces of a chapter: `apply` patches what is in the scene, `update` sets this frame's light and wet. */
export function createSurfaces(context: ExtraContext) {
  const { chapter, sun, sky } = context;
  const pools = chapter.water ?? [];
  const kind = waterKind(chapter.place);
  // Peat water lies behind the whole bog: its shore runs along every island's back, at the pools' height.
  const behind = kind.behind !== null && pools.length ? [{ from: -1e5, to: 1e5, y: pools[0]!.y, z: kind.behind + 0.5 }] : [];
  // Each pool, as far towards the camera as its water comes.
  const all = [...pools.map((w) => ({ ...w, z: kind.front })), ...behind];
  const shared = {
    liftWet: { value: wetOf(chapter, chapter.place) },
    liftPools: { value: Array.from({ length: 8 }, () => new Vector4(0, 0, -1e6, -1e6)) },
    liftPlace: { value: new Vector4(2, 1, dewy(chapter) ? 1 : 0, 0) },
    liftSunDir: { value: sun.position.clone().sub(sun.target.position).normalize() },
    liftSun: { value: new Vector3() },
    liftSky: { value: sky },
    liftTime: { value: 0 },
  };
  const patched = new WeakSet<Material>();
  const near = all.map((pool) => ({ pool, d: 0 }));
  let time = 0;
  /**
   * The tier of the picture's first frame, kept: only a picture that starts on High is patched, and a change of
   * tier in play never lays or lifts it (gate 6). The menu's warm-up runs before any frame has told this the new
   * tier, so following the tier laid the patch on the way back to Low and compiled it there. In software rendering a
   * patched material pays its whole cost even where a branch skips it, and Low and Mid are for phones whose GPUs are
   * short of fragment time (docs/visual-upgrade.md, "As built"). Unknown until the first frame (as in the unit
   * tests): patched.
   */
  let startedOn: ExtraFrame['tier'] | null = null;
  return {
    /** Patches the moss and the carved wood in `root`. Again at each warm-up: only new ones are touched. */
    apply(root: Object3D) {
      if (startedOn !== null && startedOn !== 'high') return;
      root.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (!(material instanceof MeshStandardMaterial) || patched.has(material)) continue;
          const kind = classify(mesh, material, context.dressing ?? null, chapter);
          if (kind) patch(material, kind);
        }
      });
    },
    update(frame: ExtraFrame) {
      startedOn ??= frame.tier;
      if (!frame.still) time += frame.dt;
      shared.liftTime.value = time;
      // The sun in a wet point is its own light, paled: never gold.
      shared.liftSun.value.set(sun.color.r, sun.color.g, sun.color.b).lerp(PALE, PALED).multiplyScalar(sun.intensity);
      shared.liftPlace.value.set(frame.tier === 'low' ? 0 : frame.tier === 'mid' ? 1 : 2, 1 - (frame.darkness ?? 0), shared.liftPlace.value.z, 0);
      // The eight pools nearest him, when a chapter has more.
      for (const one of near) one.d = Math.max(one.pool.from - frame.x, frame.x - one.pool.to, 0);
      if (near.length > 8) near.sort((a, b) => a.d - b.d);
      for (let i = 0; i < 8; i++) {
        const pool = near[i]?.pool;
        shared.liftPools.value[i]!.set(pool?.from ?? 0, pool?.to ?? 0, pool?.y ?? -1e6, pool?.z ?? -1e6);
      }
    },
  };

  function patch(material: MeshStandardMaterial, kind: SurfaceClass) {
    patched.add(material);
    const own = {
      liftSurface: { value: new Vector4(...kind) },
      // The grain runs up a figure, along a plank, and into the picture on a floor's boards.
      liftGrain: { value: kind[0] > 0.75 ? new Vector3(0, 1, 0) : material.userData.ground ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0) },
    };
    material.userData.liftSurface = own.liftSurface.value;
    const before = material.onBeforeCompile;
    const key = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${key()}:lift-surface-v1`;
    material.onBeforeCompile = (shader, renderer) => {
      before.call(material, shader, renderer);
      Object.assign(shader.uniforms, shared, own);
      shader.vertexShader = 'uniform vec4 liftSurface, liftPools[8], liftPlace;\nvarying vec3 liftWorld, liftLocal, liftPoolV;\n' + NOISE_VERTEX
        + shader.vertexShader.replace('#include <project_vertex>', VERTEX);
      shader.fragmentShader = DECLARE + NOISE + shader.fragmentShader
        .replace('#include <emissivemap_fragment>', SURFACE)
        .replace('#include <opaque_fragment>', LIGHT);
    };
    material.needsUpdate = true;
  }
}
