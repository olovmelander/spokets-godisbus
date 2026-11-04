import type { Camera, Color, DirectionalLight, Group, HemisphereLight, Object3D, Scene } from 'three';
import type { ChapterData, Mode, Mover, RideLook, Spot } from '../sim/types';
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
  /** The place's light and haze as this chapter has them (Äventyr 2's own where it has one), or null for none. */
  place?: PlaceLook | null;
  /** What the dressing built for the place: grass, trunks, stones, cards. Null where nothing is dressed. */
  dressing?: Group | null;
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
  /** He is on a ride now. */
  riding: boolean;
  /** How he moves: his speed along and up, which way he faces, whether he stands, and his mode. */
  vx?: number;
  vy?: number;
  facing?: 1 | -1;
  grounded?: boolean;
  mode?: Mode;
  /** How dark the place is now, 0 by day to 1 at its darkest (the night falling in Norrsken, the dusk). */
  darkness?: number;
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
  /**
   * The visual upgrade's systems (src/render/lift/, docs/visual-upgrade.md): life, light, air, flora and materials
   * that every chapter of both adventures gets. Like `extras`, but updated after the dressing, so that the wind
   * they read (./wind.ts) is this frame's.
   */
  lifts: [] as ((context: ExtraContext) => ViewExtra | null)[],
};
