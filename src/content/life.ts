import type { PlaceId } from '../sim/types';

/**
 * The life in the far scenery: a moose in the mist across the bog, cranes in a V, smoke from a far chimney,
 * the valley's windows lighting one by one at dusk. It is scenery and nothing else: it answers no button, it
 * is made of the far pictures' own pale stuff, and something always passes in front of it.
 *
 * This file says who there is in each place and how each looks and moves. The plan (render/life-plan.ts)
 * turns it into quads, and the batch (render/life.ts) draws them. Nothing here is read by the simulation.
 *
 * Its pictures are cells of one atlas, `art/baked/boot/life.glb`, made by `art/blender/life.py`. That script
 * writes `art/baked/boot/life.json` beside it, and a test holds this file to it.
 */

export type Ink = readonly [number, number, number];

/** The atlas's size in pixels. */
export const ATLAS = [1024, 512] as const;

/** A strip of cells in the atlas: its left and top, one cell's width and height, how many cells, how many in a row. */
export type Strip = readonly [x: number, y: number, wide: number, tall: number, cells: number, row: number];

export const STRIPS = {
  /** The moose's walk: twelve cells, a whole cycle. It faces right. */
  walk: [0, 0, 160, 128, 12, 6],
  /** The moose standing: as it stopped, its head half lifted, lifted and turned this way, and with an ear flicked. */
  stand: [0, 256, 160, 128, 4, 4],
  /** A crane's wingbeat: up, level, down, level. Neck out, legs trailing. It faces right. */
  crane: [640, 256, 96, 48, 4, 4],
  /** A goose's: a shorter neck, no legs to see. */
  goose: [640, 304, 96, 48, 4, 4],
  /** A soft puff of smoke. */
  puff: [960, 0, 64, 64, 1, 1],
  /** A soft dot: a far window, a car's light. */
  dot: [960, 64, 32, 32, 1, 1],
  /** A shooting star, falling to the left: bright at its head, nothing at its tail. */
  streak: [640, 352, 128, 64, 1, 1],
} satisfies Record<string, Strip>;

/**
 * Where the life hangs among a place's far pictures (render/backdrop.ts): between two of them in depth, and
 * holding as much of his way as they do, so that it passes at the right speed.
 */
export interface Slot {
  z: number;
  hold: number;
  /** How much of his climb it sinks by: the same as the picture it stands on, or the one in front of it. */
  sink: number;
  /** How much of the place's haze is mixed into every tint here. */
  haze: number;
}

/** How the moose walks, whatever its size: the cell's numbers, measured in the bog's moose. */
export const WALK = {
  /** Cells a second: twelve make a cycle of 1.2 s. */
  fps: 10,
  /** How far it goes in one cycle, in EL, where a cell is `cell` EL wide. Its speed is this over the cycle. */
  stride: 1.35,
  /** How wide a cell is, in EL. */
  cell: 4,
  /** How far over the cell's bottom edge the hooves stand, and how tall the animal is with its antlers. */
  foot: 0.25,
  tall: 2.4,
  /** The share of its height that goes into the mist: the legs fade towards the hooves. */
  mist: 0.35,
  /** The cell it stops after: every hoof is on or near the ground there. */
  halt: 5,
  /** How long it stands: its head comes up, turns this way, an ear flicks, and it goes down again. */
  stand: 4.4,
} as const;

/** Something that happens on a stage a chapter names: an animal that walks across, a flock that flies over. */
export interface Role {
  act: 'walk' | 'flock';
  slot: number;
  /** One colour, before the place's haze is mixed in, and how solid it is. */
  ink: Ink;
  alpha: number;
  /** A walker: how many times the bog's moose. A flock: one bird's cell width in EL. */
  size: number;
  /** EL a second. A walker's is its stride over its cycle, and is not given here. */
  speed?: number;
  /** A walker stops halfway and looks up. */
  stops?: boolean;
  /** Where the hooves are, or where the leading bird flies, over the eye line, in EL. */
  y: number;
  /** A flock: its cells, and how many birds. */
  strip?: Strip;
  birds?: number;
  /** In how many visits it comes: left out, in every one. */
  odds?: number;
  /** It also comes with reduced motion: only the slow ones. */
  calm?: boolean;
  /** It is meant to be known for what it is, so it must be big enough on a phone. */
  known?: boolean;
}

/** A place's chimneys: where each stands in the slot's own measure, and how far over the eye line its top is. */
export interface Smoke {
  at: readonly (readonly [number, number])[];
  /** The picture the chimneys are painted on repeats this far on. */
  every: number;
  puffs: number;
  ink: Ink;
  alpha: number;
}

/** The valley's windows, and the road between them. */
export interface Lights {
  /** Each window: along, and over the eye line. The first `lit` shine in the blue hour, the rest come with the night. */
  at: readonly (readonly [number, number])[];
  lit: number;
  size: number;
  ink: Ink;
  /** A car's lights creep from the first place to the second, hidden by the forest where `gone` says. */
  road: { from: readonly [number, number]; to: readonly [number, number]; speed: number; every: number; gone: readonly (readonly [number, number])[]; ink: Ink };
  /** The shooting star: how far over the eye line it begins, how far it falls, how long it takes. */
  star: { y: number; long: number; seconds: number; ink: Ink };
}

export interface PlaceLife {
  /** The place's haze, as its far pictures paint it. */
  haze: Ink;
  slots: readonly Slot[];
  roles: Readonly<Record<string, Role>>;
  smoke?: Smoke;
  lights?: Lights;
}

const BOG_MIST: Ink = [246, 236, 212];
const FOREST_MIST: Ink = [196, 212, 160];
const GARDEN_HAZE: Ink = [214, 232, 236];

const GEESE: Role = { act: 'flock', slot: 0, ink: [86, 92, 104], alpha: 0.8, size: 0.8, speed: 2.6, y: 13, strip: STRIPS.goose, birds: 9 };
const SMOKE_INK: Ink = [242, 240, 234];

export const LIFE: Partial<Record<PlaceId, PlaceLife>> = {
  bog: {
    haze: BOG_MIST,
    // Behind the nearest spruces, in front of the forest's edge.
    slots: [{ z: -42, hold: 0.8, sink: 0.1, haze: 0.25 }],
    roles: {
      // A bull, 1.9 EL at the shoulder. Its hooves are a little under the eye line, in the nearest picture's mist.
      moose: { act: 'walk', slot: 0, ink: [58, 52, 46], alpha: 0.9, size: 1, stops: true, y: -0.2, calm: true, known: true },
      cranes: { act: 'flock', slot: 0, ink: [92, 96, 104], alpha: 0.85, size: 1.2, speed: 2.2, y: 9.5, strip: STRIPS.crane, birds: 9 },
    },
  },
  forest: {
    haze: FOREST_MIST,
    // Two depths of trunks pass in front of it.
    slots: [{ z: -54, hold: 0.58, sink: 0.17, haze: 0.5 }],
    roles: {
      moose: { act: 'walk', slot: 0, ink: [90, 125, 119], alpha: 0.6, size: 1.37, y: -0.6, odds: 1 / 3, calm: true, known: true },
    },
  },
  garden: {
    haze: GARDEN_HAZE,
    // With the neighbours' houses: behind the birches and the hedge.
    slots: [{ z: -61, hold: 0.44, sink: 0.04, haze: 0.3 }],
    roles: { geese: GEESE },
    // The two bigger houses of the picture at z -62 (backdrop.ts, GARDEN): 96 and 318 of its 512 across 140 EL.
    smoke: { at: [[27.8, 8.2], [88.1, 6.6]], every: 140, puffs: 6, ink: SMOKE_INK, alpha: 0.4 },
  },
  village: {
    haze: [216, 221, 230],
    // Just in front of the far village's picture, which stands in the world (village.ts).
    slots: [{ z: -51, hold: 1, sink: 0, haze: 0.3 }],
    roles: { geese: { ...GEESE, y: 9 } },
    // The batch finds the chimneys on the far village's picture.
    smoke: { at: [], every: 96, puffs: 6, ink: SMOKE_INK, alpha: 0.45 },
  },
  dusk: {
    haze: [62, 74, 122],
    // On the face of the far hillside.
    slots: [{ z: -63, hold: 0.38, sink: 0, haze: 0 }],
    roles: {},
    lights: {
      at: [
        [9.6, 1.5], [12.9, 1.9], [7.2, 1.1], [11.2, 2.5], [14.8, 1.3], [5.4, 2.0], [10.3, 0.8], [16.9, 2.2], [8.4, 2.8],
        [13.9, 0.7], [3.1, 1.4], [19.6, 1.7],
      ],
      lit: 4,
      size: 0.34,
      ink: [255, 214, 140],
      road: { from: [21, 0.9], to: [2, 1.6], speed: 0.35, every: 64, gone: [[6.2, 7.8], [12.2, 13.4], [17, 18.6]], ink: [255, 240, 200] },
      star: { y: 15, long: 7, seconds: 0.7, ink: [236, 244, 255] },
    },
  },
};
