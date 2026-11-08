import type { PlaceId } from '../sim/types';

/**
 * The life in the far scenery: a moose in the mist across the bog, a cow and her calf, a roe deer and a bear in the
 * forest, a deer on the neighbours' meadow, cranes in a V, smoke from a far chimney,
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
export const ATLAS = [1024, 1024] as const;

/** A strip of cells in the atlas: its left and top, one cell's width and height, how many cells, how many in a row. */
export type Strip = readonly [x: number, y: number, wide: number, tall: number, cells: number, row: number];

export const STRIPS = {
  /** The moose's walk: twelve cells, a whole cycle. It faces right. */
  walk: [0, 0, 160, 128, 12, 6],
  /** The moose standing: as it stopped, its head coming up and turning this way in three steps, looking, and with an ear flicked. */
  stand: [0, 384, 160, 128, 6, 6],
  /** A crane's wingbeat: up, level, down, level. Neck out, legs trailing. It faces right. */
  crane: [640, 256, 96, 48, 4, 4],
  /** A goose's: a shorter neck, no legs to see. */
  goose: [640, 304, 96, 48, 4, 4],
  /** A soft puff of smoke. */
  puff: [960, 0, 64, 64, 1, 1],
  /** A soft dot: a far window, a car's light. */
  dot: [960, 64, 32, 32, 1, 1],
  /** A shooting star, falling to the left: bright at its head, nothing at its tail. */
  streak: [0, 256, 128, 64, 1, 1],
  /** A moose cow walking, her calf at her heels taking two steps to her one: twelve cells, a whole cycle. */
  pair: [0, 512, 204, 96, 12, 5],
  /** A brown bear's walk, rolling, its head swinging. */
  bear: [408, 704, 96, 64, 12, 6],
  /** A roe deer's walk, and her standing: as she stopped, her head coming up and turning this way, an ear flicked. */
  deer: [0, 832, 96, 72, 12, 10],
  deerStand: [192, 904, 96, 72, 6, 6],
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

/** How the moose walks, whatever its size: the cell's numbers, as art/blender/life.py builds it (2 EL at the hump). */
export const WALK = {
  /** Cells a second: twelve make a cycle of 1.2 s. */
  fps: 10,
  /** How far it goes in one cycle, in EL, where a cell is `cell` EL wide. Its speed is this over the cycle. */
  stride: 1.35,
  /** How wide a cell is, in EL. */
  cell: 4,
  /** How far over the cell's bottom edge the hooves stand, and how tall the animal is with its antlers. */
  foot: 0.25,
  tall: 2.6,
  /** How light its cells are on the whole, as light: its ink is divided by this, so that the ink is its colour. */
  shade: 0.135,
  /** The share of its height that goes into the mist, and how much of a hoof is left: the legs fade towards the hooves. */
  mist: 0.35,
  hoof: 0.35,
  /** The cell it stops after: every hoof is on or near the ground there. */
  halt: 5,
  /** How long it stands: its head comes up, turns this way, an ear flicks, and it goes down again. */
  stand: 4.4,
} as const;

/** How a walker walks, as `WALK` says the moose does, with its own cells: its walk, and its standing if it stops. */
export interface Walker extends Omit<typeof WALK, 'fps' | 'stride' | 'cell' | 'foot' | 'tall' | 'shade' | 'mist' | 'hoof' | 'halt' | 'stand'> {
  fps: number; stride: number; cell: number; foot: number; tall: number; shade: number; mist: number; hoof: number; halt: number;
  /** How long it stands, when it stops. */
  stand: number;
  walk: Strip;
  looks?: Strip;
}

/**
 * The walkers, as art/blender/life.py builds them (life.json has their numbers): the bull moose; a moose cow with her
 * calf; a roe deer, who stops and looks up as the moose does; and a brown bear. Each cycle is twelve cells.
 */
export type WalkerName = 'moose' | 'pair' | 'deer' | 'bear';
export const WALKERS: Record<WalkerName, Walker> = {
  moose: { ...WALK, walk: STRIPS.walk, looks: STRIPS.stand },
  pair: { fps: 10, stride: 1.269, cell: 5.6, foot: 0.22, tall: 2.05, shade: 0.1283, mist: 0.35, hoof: 0.35, halt: 5, stand: 0, walk: STRIPS.pair },
  deer: { fps: 12, stride: 0.62, cell: 2, foot: 0.12, tall: 1.14, shade: 0.1302, mist: 0.3, hoof: 0.4, halt: 5, stand: 3.6, walk: STRIPS.deer, looks: STRIPS.deerStand },
  bear: { fps: 9, stride: 0.78, cell: 2.7, foot: 0.16, tall: 1.24, shade: 0.137, mist: 0.3, hoof: 0.4, halt: 5, stand: 0, walk: STRIPS.bear },
};

/** Something that happens on a stage a chapter names: an animal that walks across, a flock that flies over. */
export interface Role {
  /** A walker: which animal it is. Left out: the bull moose. */
  walker?: WalkerName;
  act: 'walk' | 'flock';
  slot: number;
  /** One colour, before the place's haze is mixed in, and how solid it is. */
  ink: Ink;
  alpha: number;
  /** A walker: how many times the cell's own measure. A flock: one bird's cell width in EL. */
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
  /** Repeating painted scenery's period; zero for individually authored world chimneys. */
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
  /** The shooting star: how far over the eye line it begins, how far it falls, how wide its streak is, how long it takes. */
  star: { y: number; long: number; wide: number; seconds: number; ink: Ink };
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

const GEESE: Role = { act: 'flock', slot: 0, ink: [86, 92, 104], alpha: 0.8, size: 1.1, speed: 2.6, y: 12.5, strip: STRIPS.goose, birds: 9 };
/** Wood smoke in cool air: paler than a far forest, darker than a bright sky. */
const SMOKE_INK: Ink = [222, 224, 228];

export const LIFE: Partial<Record<PlaceId, PlaceLife>> = {
  bog: {
    haze: BOG_MIST,
    // Behind the nearest spruces, in front of the forest's edge.
    slots: [{ z: -42, hold: 0.8, sink: 0.1, haze: 0.12 }],
    roles: {
      // A bull, 1.9 EL at the shoulder. Its hooves are a little under the eye line, in the nearest picture's mist.
      moose: { act: 'walk', slot: 0, ink: [50, 45, 40], alpha: 0.9, size: 0.95, stops: true, y: -0.2, calm: true, known: true },
      cranes: { act: 'flock', slot: 0, ink: [104, 108, 116], alpha: 0.85, size: 1.2, speed: 2.2, y: 9.5, strip: STRIPS.crane, birds: 9 },
    },
  },
  forest: {
    haze: FOREST_MIST,
    // Behind the nearest picture's trunks and its mist, in front of the rest: so a shape that crosses a gap between
    // the trunks reads as a beast's, darker than the haze it walks through, as the bog's bull is against its mist.
    slots: [{ z: -40, hold: 0.83, sink: 0.25, haze: 0.04 }],
    roles: {
      // A shape in the forest's own green-grey, dark against the light between the trunks.
      moose: { act: 'walk', slot: 0, ink: [14, 20, 19], alpha: 0.9, size: 2.2, y: -0.6, odds: 1 / 3, calm: true, known: true },
      // A moose cow with her calf at her heels, in one visit of two; a roe deer, who stops and looks this way; and, in
      // one visit of three, a bear rolling along in the dark between the trunks. Each as big as the bull is, to scale.
      // The forest's camera is close and its far floor is seen between near trunks: at the bog's size they were a few
      // pixels there (8 November 2026), so all four are drawn about twice as big, and darker: as big as they can be and still take eight
      // seconds to cross a tablet's picture, for bigger is quicker across.
      pair: { act: 'walk', walker: 'pair', slot: 0, ink: [14, 20, 19], alpha: 0.9, size: 2.1, y: -0.6, odds: 1 / 2, calm: true, known: true },
      deer: { act: 'walk', walker: 'deer', slot: 0, ink: [30, 28, 22], alpha: 0.9, size: 2.3, stops: true, y: -0.55, calm: true, known: true },
      bear: { act: 'walk', walker: 'bear', slot: 0, ink: [12, 14, 14], alpha: 0.9, size: 2.2, y: -0.6, odds: 1 / 3, calm: true, known: true },
    },
  },
  garden: {
    haze: GARDEN_HAZE,
    // On the picture with the neighbours' houses, behind the birches and the hedge: as good as at its depth, so
    // that the smoke stays over its roof out to the picture's edges.
    slots: [{ z: -61.9, hold: 0.44, sink: 0.04, haze: 0.3 }],
    // A roe deer comes out on the neighbours' meadow in the morning, stops, looks this way and walks on.
    roles: {
      geese: GEESE,
      deer: { act: 'walk', walker: 'deer', slot: 0, ink: [96, 104, 98], alpha: 0.75, size: 1.3, stops: true, y: -0.45, calm: true, known: true },
    },
    // The two bigger houses of the picture at z -62 (backdrop.ts, GARDEN): 96 and 318 of its 512 across 140 EL.
    smoke: { at: [[27.8, 8.2], [88.1, 6.6]], every: 140, puffs: 6, ink: SMOKE_INK, alpha: 0.6 },
  },
  village: {
    haze: [216, 221, 230],
    // At the authored street's chimneys, which stand in the world (village.ts).
    slots: [{ z: -51.9, hold: 1, sink: 0, haze: 0.3 }],
    // Between the houses of the street there is too little sky for a flock.
    roles: {},
    // The world anchor supplies the baked building's actual chimney tops. They never repeat.
    smoke: { at: [], every: 0, puffs: 6, ink: SMOKE_INK, alpha: 0.65 },
  },
  dusk: {
    haze: [62, 74, 122],
    // On the face of the far hillside. The lights stay on the eye line while that hillside's picture sinks
    // with the summit's height over the land (`outlook`, and the picture's `sink` in backdrop.ts): their heights
    // below were set by eye against the picture as it then stands. Change either, and look at them again.
    slots: [{ z: -63, hold: 0.38, sink: 0, haze: 0 }],
    roles: {},
    lights: {
      at: [
        [9.6, 1.7], [12.9, 2.1], [7.2, 1.3], [11.2, 2.8], [14.8, 1.5], [5.4, 2.3], [10.3, 1.0], [16.9, 2.5], [8.4, 3.1],
        [13.9, 0.9], [3.1, 1.6], [19.6, 1.9],
      ],
      lit: 5,
      size: 0.5,
      ink: [255, 214, 140],
      road: { from: [21, 1.1], to: [2, 1.9], speed: 0.35, every: 64, gone: [[6.2, 7.8], [12.2, 13.4], [17, 18.6]], ink: [255, 240, 200] },
      star: { y: 15, long: 7, wide: 6, seconds: 0.7, ink: [236, 244, 255] },
    },
  },
};
