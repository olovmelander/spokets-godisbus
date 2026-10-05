import { Group, type Texture } from 'three';
import type { ChapterData, PlaceId } from '../../sim/types';
import { scenery } from '../backdrop';
import { fronts, street, villageLife } from '../village';
import { bog } from './bog';
import { built } from './built';
import { effects } from './effects';
import { fell } from './fell';
import { foreground, type Growth } from './foreground';
import { stretch } from './forest';
import { bank, type Ground } from './ground';
import { heightAt, makeKit, type PlaceLook } from './kit';
import { lawn } from './lawn';
import { backdrop, stars } from './sky';

/**
 * How a place looks (plan §5.3, §5.4): its light, its haze, its grade, and the layers that are built around
 * the play plane. A chapter names its place, and the view dresses the chapter's ground in it.
 *
 * Everything here is made in code, so it costs no download: the far plates and the foreground are drawn on
 * small canvases, which makes them soft the way an out-of-focus layer is. Plates rendered in Blender and
 * scanned materials replace the drawn ones place by place (plan §5.6).
 */
export type { PlaceLook };

/** Granskogen at noon: deep green and mossy gold, shafts of light, cool shade. */
const FOREST: PlaceLook = {
  id: 'forest',
  grade: { tint: [1.04, 1.01, 0.94], exposure: 1.08, contrast: 1.08, saturation: 1.12, vignette: 0.32, grain: 0.03 },
  haze: { colour: '#b4c79a', near: 4, far: 62 },
  sky: { top: '#2c4a44', middle: '#e6ebb0', bottom: '#587246', glow: '#fff8d2' },
  hemisphere: { sky: '#cfe4ea', ground: '#5b6a34', intensity: 1.35 },
  sun: { colour: '#ffd9a0', intensity: 3.6, from: [-7, 5, -4] },
  fill: { colour: '#d6e6ff', intensity: 0.75 },
  water: { colour: '#3f8f9c', opacity: 0.8 },
  tussock: '#9aa246',
};

/** Gården at ten in the morning: dew, bright greens, the first yellow leaves, and the red house in the sun. */
const GARDEN: PlaceLook = {
  id: 'garden',
  grade: { tint: [1.04, 1.01, 0.95], exposure: 1.05, contrast: 1.07, saturation: 1.1, vignette: 0.28, grain: 0.025 },
  haze: { colour: '#cfe2ea', near: 6, far: 80 },
  sky: { top: '#6fa9d8', middle: '#d9ecf4', bottom: '#b4d28e', glow: '#fff4c8' },
  hemisphere: { sky: '#dcecff', ground: '#7d8f48', intensity: 1.35 },
  sun: { colour: '#ffe2ae', intensity: 3.6, from: [-7, 4.5, -3.5] },
  fill: { colour: '#e8f0ff', intensity: 0.8 },
  water: { colour: '#4f9fc4', opacity: 0.78 },
  tussock: '#a9c05a',
};

/** Myren in the late afternoon: a low gold sun over rust-red moss, dark pools, and silver mist. */
const BOG: PlaceLook = {
  id: 'bog',
  grade: { tint: [1.05, 1.0, 0.92], exposure: 1.05, contrast: 1.06, saturation: 1.06, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#dccfb4', near: 5, far: 70 },
  sky: { top: '#93a9be', middle: '#f1dfb6', bottom: '#bfa878', glow: '#fff1c4' },
  hemisphere: { sky: '#e8e2d2', ground: '#7d6a3c', intensity: 1.3 },
  sun: { colour: '#ffcf88', intensity: 3.5, from: [-8, 3.2, -4] },
  fill: { colour: '#e6e6f4', intensity: 0.75 },
  water: { colour: '#34423f', opacity: 0.9 },
  tussock: '#a3ae8c',
};

/** Berget in the golden hour: grey granite and white lichen under a pink-orange sky, haze in the valley. */
const MOUNTAIN: PlaceLook = {
  id: 'mountain',
  grade: { tint: [1.06, 0.99, 0.95], exposure: 1.04, contrast: 1.07, saturation: 1.08, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#e9b9a0', near: 6, far: 95 },
  sky: { top: '#6a78ae', middle: '#f7b78c', bottom: '#c98c74', glow: '#ffe2b4' },
  hemisphere: { sky: '#f0d4dc', ground: '#84705e', intensity: 1.25 },
  sun: { colour: '#ffae6c', intensity: 3.7, from: [-8, 2.6, -3] },
  fill: { colour: '#e8dcf0', intensity: 0.75 },
  water: { colour: '#4f7f9c', opacity: 0.8 },
  tussock: '#b9b08a',
};

/** The final, at the blue hour: the same summit, in blue, with the first stars. Night falls on it later. */
const DUSK: PlaceLook = {
  id: 'dusk',
  grade: { tint: [0.95, 0.99, 1.08], exposure: 1.02, contrast: 1.06, saturation: 1.0, vignette: 0.34, grain: 0.035 },
  haze: { colour: '#38446e', near: 6, far: 85 },
  sky: { top: '#16224c', middle: '#3c4c80', bottom: '#5c5a84', glow: '#9a86a8' },
  hemisphere: { sky: '#93a6e0', ground: '#3c3c54', intensity: 1.1 },
  sun: { colour: '#b8c0ff', intensity: 1.5, from: [-7, 5, -4] },
  fill: { colour: '#b0bcff', intensity: 0.65 },
  water: { colour: '#2c3c64', opacity: 0.85 },
  tussock: '#6a6f80',
};

/** At home: the kitchen on a Saturday morning, and the veranda in the evening. Warm, and built of boards. */
const HOME: PlaceLook = {
  id: 'home',
  grade: { tint: [1.05, 1.0, 0.93], exposure: 1.04, contrast: 1.05, saturation: 1.05, vignette: 0.3, grain: 0.025 },
  haze: { colour: '#e8d8b8', near: 8, far: 90 },
  sky: { top: '#d9c8a6', middle: '#f0e2c4', bottom: '#b79f78', glow: '#fff4d2' },
  hemisphere: { sky: '#fff0d8', ground: '#8a7250', intensity: 1.3 },
  sun: { colour: '#ffe0aa', intensity: 3.0, from: [-7, 5, -3] },
  fill: { colour: '#fff0e0', intensity: 0.8 },
  water: { colour: '#4f9fc4', opacity: 0.78 },
  tussock: '#b9a07e',
};

/** Byn on a Saturday morning in October: a clear cool sky, a low sun along the street, warm shop windows. */
const VILLAGE: PlaceLook = {
  id: 'village',
  grade: { tint: [1.03, 1.0, 0.97], exposure: 1.04, contrast: 1.06, saturation: 1.06, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#d8dde6', near: 8, far: 95 },
  sky: { top: '#7fa6d6', middle: '#dfe8f2', bottom: '#b8b4ac', glow: '#fff0cc' },
  hemisphere: { sky: '#e6eefc', ground: '#6e6a66', intensity: 1.25 },
  sun: { colour: '#ffe2b0', intensity: 3.4, from: [-8, 3.4, -4] },
  fill: { colour: '#e4ecff', intensity: 0.75 },
  water: { colour: '#4a5a6a', opacity: 0.85 },
  tussock: '#9a9a96',
};

export const PLACES: Record<PlaceId, PlaceLook> = { forest: FOREST, garden: GARDEN, bog: BOG, mountain: MOUNTAIN, dusk: DUSK, home: HOME, village: VILLAGE };

/** What the view adds to its scene for a place, and moves each frame. */
export interface Dressing {
  group: Group;
  background: Texture;
  update(cameraX: number, groundY: number, clock: number, night?: number): void;
}

/** How long a stretch of scatter is: each is drawn only while it is in the picture. */
const STRETCH = 18;

/** Everything that stands and lies on the moss, in stretches along the chapter. */
function scatter(chapter: ChapterData, from: number, to: number, place: PlaceId): Group {
  const group = new Group();
  // Indoors nothing grows.
  if (place === 'home') return group;
  const build = { forest: stretch, garden: lawn, bog, mountain: fell, dusk: fell, village: street }[place];
  for (let a = from - 12; a < to + 12; a += STRETCH) group.add(build(chapter, a, a + STRETCH, Math.round(a * 7 + 97)));
  return group;
}

// --- the whole dressing --------------------------------------------------------------------------------------

/** What each place's own ground is, and what grows out of focus in front of it. */
const OWN: Record<PlaceId, { ground: Ground; growth: Growth | null }> = {
  forest: { ground: 'moss', growth: 'dark' },
  garden: { ground: 'lawn', growth: 'bright' },
  bog: { ground: 'sphagnum', growth: 'straw' },
  mountain: { ground: 'granite', growth: null },
  dusk: { ground: 'granite', growth: null },
  home: { ground: 'wood', growth: null },
  village: { ground: 'asphalt', growth: null },
};
export const groundOf = (place: PlaceId): Ground => OWN[place].ground;

/** Builds a place's layers around a chapter's ground. */
export function dress(chapter: ChapterData, look: PlaceLook): Dressing {
  const group = new Group();
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  makeKit();
  const air = effects(chapter, from, to, look.id);
  // The far scenery hangs in layers that pass at their own speeds, and stays at the height of his eyes
  // however high he climbs: backdrop.ts.
  const far = scenery(look.id, heightAt(chapter, from) - (chapter.outlook ?? 0), from, to);
  const life = look.id === 'village' ? villageLife(chapter) : null;
  if (life) group.add(life.group);
  if (look.id === 'dusk') group.add(stars());
  group.add(
    far.group,
    bank(chapter, OWN[look.id].ground),
    scatter(chapter, from, to, look.id),
    built(chapter, look.id === 'home'),
    // The village has the fronts of its houses behind the pavement.
    look.id === 'village' ? fronts(chapter, from, to) : new Group(),
    air.group,
    foreground(chapter, from, to, OWN[look.id].growth),
  );
  return {
    group,
    background: backdrop(look),
    update(cameraX, groundY, clock, night = 0) {
      air.update(cameraX, groundY, clock);
      far.update(cameraX, groundY, clock, night);
      life?.update(clock);
    },
  };
}
