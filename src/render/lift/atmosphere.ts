import { Color, Vector2, Vector3, Vector4, type Fog, type Mesh, type Object3D } from 'three';
import type { PlaceId } from '../../sim/types';
import type { AirMood } from '../dressing/effects';
import { heightAt } from '../dressing/kit';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../extensions';
import { AIR_KEY, type AirAsk } from '../light-shafts';

/**
 * The visual upgrade's air (docs/visual-upgrade.md): light shafts and god rays, the dust in them, leaves falling,
 * mist on the ground, and a soft haze that lets the far layers sink into the place's own colour.
 *
 * - **On Mid and High** the god rays and the haze are drawn by the light-shaft pass (../light-shafts.ts) and added in
 *   the grade. This system tells that pass, each frame, how strong they are here and now.
 * - **On every tier** the cards are the dressing's (../dressing/effects.ts): shafts through the crowns, the birches
 *   and the windows, motes, leaves and mist. This system tells them the tier, the night and the storm.
 *
 * In Äventyr 2's storm there is no sunlight; in its eye the moon's, cool, and on the washed morning a cool light.
 */
export interface PlaceAir {
  /** How strong the god rays are by day. */
  shafts: number;
  /** Their colour: pale, and warm by day. */
  colour: string;
  /** How bright the far light must be to count (linear light). */
  cut: readonly [number, number];
  /** The haze: where it begins and is full (EL behind the play plane), and how much on what stands and on the far layers. */
  haze: readonly [number, number, number, number];
  /** Over how many EL the haze thins upwards from the ground. */
  thins: number;
}

/** Strong in the forest, medium through the garden's birches, soft over the bog and in the village, low in the evening. */
export const AIR: Record<PlaceId, PlaceAir> = {
  forest: { shafts: 2.4, colour: '#fff0c4', cut: [0.3, 0.85], haze: [6, 70, 0.14, 0.07], thins: 5 },
  garden: { shafts: 1.3, colour: '#fff6dc', cut: [0.45, 1.05], haze: [8, 90, 0.1, 0.05], thins: 6 },
  bog: { shafts: 0.9, colour: '#fff2dc', cut: [0.55, 1.15], haze: [5, 70, 0.16, 0.08], thins: 3 },
  mountain: { shafts: 0.7, colour: '#fdecda', cut: [0.6, 1.15], haze: [9, 95, 0.14, 0.06], thins: 9 },
  dusk: { shafts: 0.55, colour: '#e6e0f4', cut: [0.2, 0.7], haze: [8, 85, 0.1, 0.05], thins: 8 },
  village: { shafts: 0.8, colour: '#fff4dc', cut: [0.45, 1.1], haze: [8, 95, 0.08, 0.05], thins: 8 },
  home: { shafts: 0, colour: '#fff1d2', cut: [0.5, 1.2], haze: [10, 90, 0, 0], thins: 8 },
};
/**
 * Where the sky's own picture paints the sun (dressing/sky.ts, SUNS): over the bog and from the mountain it is in
 * the picture, low to the left, and the rays fan out from it. From the left and the top, as the sky gives them.
 */
export const PAINTED_SUN: Partial<Record<PlaceId, readonly [number, number]>> = { bog: [0.33, 0.325], mountain: [0.31, 0.37] };
/** The moon in the storm's eye: cool rays from where it stands in the sky. */
export const MOON = { shafts: 1.6, colour: '#d6e0ff', cut: [0.2, 0.6] as const };
/** Low, Mid and High draw this share of every count (plan §6.5). */
export const SHARE = { low: 0.3, mid: 0.6, high: 1 } as const;
/** On Mid and High the cards stand under the god rays, and show less of their own. */
const UNDER_RAYS = 0.72;

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** The air of one chapter: what it asks of the pass and of the cards, made once, and changed each frame by uniforms. */
export function makeAir({ chapter, scene, sun, place, dressing }: ExtraContext): ViewExtra | null {
  if (!chapter.place || !place) return null;
  const own = AIR[chapter.place];
  const storm = chapter.storm;
  const fog = scene.fog as Fog | null;
  const ask: AirAsk = {
    strength: 0, colour: new Color(own.colour), from: sun.position, at: null, cut: new Vector2(...own.cut),
    screen: PAINTED_SUN[chapter.place] && !storm ? new Vector2(PAINTED_SUN[chapter.place]![0], 1 - PAINTED_SUN[chapter.place]![1]) : null,
    haze: fog?.color ?? new Color(place.haze.colour), hazeShape: new Vector4(...own.haze), ground: heightAt(chapter, chapter.spawn.x), thins: own.thins,
  };
  scene.userData[AIR_KEY] = ask;
  (globalThis as { __air?: unknown }).__air = { ask, moon: () => !!moon }; // TEMP-AIR
  const mood = (dressing?.getObjectByName('air')?.userData.mood ?? null) as AirMood | null;
  // The moon of the storm's eye (aventyr2/render.ts): the storm's group holds it, as a ball and its glow.
  const moon = storm?.calm ? scene.getObjectByName('storm')?.children.find((o) => (o.children[0] as Mesh | undefined)?.geometry?.type === 'SphereGeometry') ?? null : null;
  const moonAt = new Vector3();
  const day = new Color(own.colour);
  const night = new Color(MOON.colour);
  let calm = 0;
  let ground = ask.ground;
  return {
    update(frame: ExtraFrame) {
      const { dt, flags, still, tier, camera } = frame;
      const open = !!storm?.calm && flags.has(storm.calm);
      calm = still ? (open ? 1 : 0) : Math.min(1, Math.max(0, calm + (open ? dt : -dt) / 3));
      const raging = storm ? 1 - calm : 0;
      const dark = Math.min(1, Math.max(0, frame.darkness ?? 0));
      // At home the room has no sky to cut into shafts: only out of doors, past the house's corner.
      const outdoors = chapter.place !== 'home' ? 1 : chapter.outdoors === undefined ? 0 : Math.min(1, Math.max(0, (camera.position.x - chapter.outdoors + 2) / 8));
      const sunlight = (1 - dark) * (1 - raging) * (storm ? 0 : 1);
      const garden = AIR.garden;
      ask.strength = (chapter.place === 'home' ? garden.shafts * outdoors : own.shafts) * sunlight + MOON.shafts * calm;
      ask.colour.copy(day).lerp(night, storm ? 1 : 0);
      ask.cut.set(...(storm ? MOON.cut : own.cut));
      ask.at = moon && calm > 0 ? moon.getWorldPosition(moonAt) : null;
      const shape = chapter.place === 'home' ? garden.haze.map((v, i) => i < 2 ? v : v * outdoors) : own.haze;
      // In the storm the haze is the night's, and lighter.
      ask.hazeShape.set(shape[0]!, shape[1]!, shape[2]! * (storm ? 0.6 : 1), shape[3]! * (storm ? 0.6 : 1));
      ground += (heightAt(chapter, camera.position.x) - ground) * (still ? 1 : ease(1.5, dt));
      ask.ground = ground;
      if (mood) {
        mood.share = SHARE[tier];
        mood.storm = raging;
        mood.calm = calm;
        mood.day = storm ? calm : 1 - dark;
        mood.light = mood.day * (tier === 'low' ? 1 : UNDER_RAYS);
      }
    },
  };
}

export function installAtmosphere(): void {
  PACK.lifts.push(makeAir);
}

/** For the tests: what the air asks of the pass in a scene. */
export const airOf = (scene: Object3D) => scene.userData[AIR_KEY] as AirAsk | undefined;
