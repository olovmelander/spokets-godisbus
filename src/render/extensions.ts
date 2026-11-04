import type { Camera, Color, DirectionalLight, Group, HemisphereLight, Object3D, Scene } from 'three';
import type { ChapterData, Mover, RideLook, Spot } from '../sim/types';
import type { PlaceLook } from './dressing/kit';
import type { SpotProp } from './props';

/**
 * Where a chapter pack adds to the picture (docs/aventyr-2.md). Äventyr 2 is a pack of its own, loaded only when
 * it is played: what it draws is registered here when it loads, and the boot code only asks. In Äventyr 1 every
 * one of these is empty, and nothing changes.
 */

/** What a pack's addition to the picture is given once, as the view is built. */
export interface ExtraContext {
  chapter: ChapterData;
  scene: Scene;
  /** The haze's colour, the background's, which a flash of lightning may brighten. */
  sky: Color;
  hemisphere: HemisphereLight;
  sun: DirectionalLight;
}

/** What it is given each frame. */
export interface ExtraFrame {
  dt: number;
  clock: number;
  flags: ReadonlySet<string>;
  /** Where Elof is drawn. */
  x: number;
  y: number;
  camera: Camera;
  /** Less motion: rain and flashes hold still. */
  still: boolean;
  /** The quality tier: Low gets less. */
  tier: 'low' | 'mid' | 'high';
}

export interface ViewExtra {
  update(frame: ExtraFrame): void;
}

export const PACK = {
  /** A chapter's own light, by chapter id, in place of its place's. Its `id` stays the place's, for the kits. */
  looks: new Map<string, PlaceLook>(),
  /** Things to use and things that stand about, by look. */
  spots: new Map<string, (spot: Spot) => SpotProp | null>(),
  /** What he rides on, by look, pointing along +x with its origin under his feet. */
  rides: new Map<string, (look: RideLook) => Object3D | null>(),
  /** Things on rails, by look, with the origin at the middle of the bottom. */
  movers: new Map<string, (mover: Mover) => Group | null>(),
  /** Additions to the whole picture: weather, flashes, figures far off. Each says itself whether it applies. */
  extras: [] as ((context: ExtraContext) => ViewExtra | null)[],
};
