/** Godisracet's four courses, as numbers: an outline, the places a lap passes through, its hills and widths,
 * and what lies on the road. track.ts turns each into something to drive on. Distances are metres along a
 * 960 m lap; lanes are metres from the middle of the road, positive to the driver's left.
 * The fourth course is Varggropen's outline (trace.ts); the first three are drawn for this game.
 */
import { PLAN_CENTRE, TRACK_PLAN } from './trace';

export type TrackId = 'garden' | 'bog' | 'mountain' | 'varggropen';
/** The cup's order: the gentle lap first, the long one through every place last. */
export const TRACK_IDS: readonly TrackId[] = ['garden', 'bog', 'mountain', 'varggropen'];

export interface Pad { from: number; to: number; lane: number; half: number }
export interface Ramp { from: number; to: number; lane: number; half: number; height: number }
export interface Mud { at: number; lane: number; long: number; wide: number }
export interface Cave { from: number; to: number }
/** Something built beside the road at one spot: `side` +1 is the driver's left, `out` metres past the barrier. */
export interface Landmark { kind: 'cottage' | 'windmill' | 'stand' | 'logGate' | 'rainbow'; at: number; side?: number; out?: number; wide?: number; color?: number }
export interface CourseDef {
  id: TrackId;
  plan: readonly (readonly [number, number])[];
  centre: readonly [number, number];
  /** Each place the lap enters: its kind (0 home, 1 Granskogen, 2 Myren, 3 Berget, 4 Godisängen) and where. */
  zones: readonly (readonly [kind: number, from: number])[];
  caves: readonly Cave[];
  /** Road height along the lap. Artistic, not surveyed. */
  heights: readonly (readonly [number, number])[];
  /** Half-width of the road, and the rough ground between each road edge and its barrier (left, right). */
  widths: readonly (readonly [number, number, number, number])[];
  pads: readonly Pad[];
  ramps: readonly Ramp[];
  mud: readonly Mud[];
  boxRows: readonly number[];
  /** Trails of sweets: from, to, pieces, lane at each end, and how high the middle of the trail hangs. */
  candies: readonly (readonly [from: number, to: number, pieces: number, laneFrom: number, laneTo?: number, lift?: number])[];
  landmarks: readonly Landmark[];
}

const RED = 0xc0463c, YELLOW = 0xe0b24a, CREAM = 0xf2ead8;
const pad = (from: number, lane: number, half = 1.5): Pad => ({ from, to: from + 6, lane, half });
const mud = (at: number, lane: number): Mud => ({ at, lane, long: 4.4, wide: 1.5 });

export const COURSES: Readonly<Record<TrackId, CourseDef>> = {
  // Gårdsvarvet: a wide, flowing lap round the village and through the edge of Granskogen. The gentle one.
  garden: {
    id: 'garden', centre: [0, 0],
    plan: [[-90, -66], [-20, -62], [50, -66], [110, -58], [150, -36], [162, 0], [148, 34], [110, 52], [60, 44], [20, 56], [-20, 76], [-64, 72], [-100, 50], [-136, 56], [-168, 36], [-178, 0], [-172, -34], [-150, -60]],
    zones: [[0, 640], [1, 250]], caves: [],
    heights: [[0, 0], [130, 1.4], [250, 3.4], [330, 5], [420, 3], [500, 4.4], [600, 1.6], [700, 3], [800, .6], [900, 0]],
    widths: [[0, 6.6, 2.6, 2.6], [240, 6.4, 2.4, 2.4], [300, 6, 2.2, 2.2], [600, 6, 2.2, 2.2], [700, 6.2, 2.4, 2.4], [900, 6.6, 2.6, 2.6]],
    pads: [pad(60, 3), pad(214, -2.8), pad(500, 0), pad(800, 2.2), pad(926, -2.4)],
    ramps: [{ from: 150, to: 157, lane: 0, half: 3.6, height: 1.4 }, { from: 602, to: 609, lane: 0, half: 3.4, height: 1.3 }],
    mud: [], boxRows: [38, 192, 362, 522, 704, 852],
    candies: [[14, 30, 4, -3], [88, 112, 5, 2.4, -2], [160, 180, 5, 0, 0, 2.4], [280, 340, 9, -4, -4.2], [350, 386, 6, -4, -3.6], [424, 436, 3, -3.4], [470, 486, 4, 3.6], [540, 560, 4, -2, 2],
      [612, 632, 5, 0, 0, 2.2], [668, 692, 5, 3.8], [716, 780, 9, -4, -4.2], [820, 832, 3, 2.6, 0], [866, 900, 6, -4.2]],
    landmarks: [{ kind: 'stand', at: -22, side: 1 }, { kind: 'windmill', at: 44, side: -1, out: 30 }, { kind: 'windmill', at: 730, side: -1, out: 34 },
      { kind: 'cottage', at: 902, side: 1, out: 16, wide: 7.5, color: RED }, { kind: 'cottage', at: 934, side: 1, out: 26, wide: 6.5, color: YELLOW }, { kind: 'cottage', at: 20, side: 1, out: 18, wide: 8, color: RED },
      { kind: 'cottage', at: 72, side: 1, out: 15, wide: 6, color: RED }, { kind: 'cottage', at: 118, side: -1, out: 14, wide: 5.5, color: CREAM }, { kind: 'cottage', at: 170, side: 1, out: 20, wide: 7, color: RED },
      { kind: 'cottage', at: 660, side: 1, out: 16, wide: 6.5, color: YELLOW }, { kind: 'cottage', at: 800, side: 1, out: 15, wide: 6, color: RED }, { kind: 'cottage', at: 846, side: -1, out: 18, wide: 7, color: CREAM },
      { kind: 'logGate', at: 300 }, { kind: 'logGate', at: 560 }],
  },
  // Myrspången: a boardwalk winding over Myren at dusk, three hairpins and puddles, out of the forest and back.
  bog: {
    id: 'bog', centre: [0, 0],
    plan: [[-60, -56], [0, -54], [40, -44], [62, -22], [50, 6], [10, 10], [-40, 2], [-74, 8], [-92, 30], [-76, 52], [-30, 50], [20, 44], [70, 50], [110, 40], [136, 56], [128, 84], [90, 96], [30, 90], [-30, 96], [-90, 92], [-136, 80], [-160, 46], [-162, 0], [-150, -36], [-110, -54]],
    zones: [[1, 756], [2, 916]], caves: [],
    heights: [[0, 1], [56, .2], [120, -1.2], [300, -1.6], [500, -1.2], [600, -1.6], [740, -.9], [800, .6], [880, 1.8], [940, 1.3]],
    widths: [[0, 5.6, 2, 2], [50, 5.2, 2, 2], [80, 4.6, 2.6, 2.6], [170, 4.4, 3.2, 3.2], [560, 4.4, 3.2, 3.2], [600, 4.8, 3.4, 3.4], [740, 4.8, 3, 3], [790, 5.4, 2, 2], [900, 5.6, 2, 2]],
    pads: [pad(26, -2.4), pad(352, 1.8, 1.3), pad(606, 2, 1.4), pad(700, -2, 1.4), pad(828, 0)],
    ramps: [{ from: 644, to: 651, lane: 0, half: 3.2, height: 1.5 }],
    mud: [mud(196, -1.5), mud(214, 1.4), mud(340, 1.5), mud(374, -1.4), mud(590, -1.6), mud(684, 1.5), mud(722, -1.2)],
    boxRows: [48, 205, 366, 562, 734, 906],
    candies: [[8, 22, 4, 2.4], [84, 150, 9, -3, -3.2], [176, 190, 3, 1.6], [226, 236, 3, -1.4, .4], [246, 314, 9, 3, 3.2], [330, 336, 2, -1.6], [384, 396, 3, 1.4, -1], [430, 446, 4, 2.8],
      [468, 540, 10, -3, -3.2], [576, 584, 3, 1.6], [654, 674, 5, 0, 0, 2.6], [690, 696, 2, 1.8], [752, 812, 8, -3.2, -3.6], [860, 894, 6, -3.6]],
    landmarks: [{ kind: 'stand', at: -22, side: 1 }, { kind: 'cottage', at: 930, side: 1, out: 14, wide: 6.5, color: RED }, { kind: 'cottage', at: 30, side: 1, out: 16, wide: 6, color: RED }, { kind: 'logGate', at: 880 }],
  },
  // Kristallberget: up the mountain by a switchback, through the crystal cave along the top, and down again in the air.
  mountain: {
    id: 'mountain', centre: [0, 0],
    plan: [[-70, 70], [0, 74], [60, 68], [104, 50], [118, 16], [100, -12], [60, -18], [24, -8], [2, -26], [14, -52], [50, -62], [90, -56], [124, -70], [128, -100], [104, -122], [50, -126], [-10, -118], [-70, -124], [-120, -112], [-152, -84], [-158, -40], [-146, 0], [-150, 36], [-124, 62]],
    zones: [[1, 756], [3, 916]], caves: [{ from: 548, to: 636 }],
    heights: [[0, 0], [128, .5], [200, 4], [270, 7], [330, 9], [400, 12], [470, 15], [540, 17], [620, 17.5], [700, 16], [760, 12], [830, 7], [884, 3], [930, .5]],
    widths: [[0, 6, 2.4, 2.4], [120, 5.6, 2, 2], [160, 5, 1.8, 1.8], [530, 5, 1.8, 1.8], [550, 4.8, 1.4, 1.4], [636, 4.8, 1.4, 1.4], [660, 5.2, 2, 2], [880, 5.4, 2, 2], [930, 6, 2.4, 2.4]],
    pads: [pad(28, 2.8), pad(108, -2.4), pad(534, 0), pad(652, 2), pad(934, -2)],
    ramps: [{ from: 70, to: 77, lane: 0, half: 3.4, height: 1.4 }, { from: 692, to: 700, lane: 0, half: 3.6, height: 2 }],
    mud: [], boxRows: [44, 216, 396, 584, 734, 904],
    candies: [[10, 24, 4, -2.6], [80, 98, 5, 0, 0, 2.4], [150, 240, 12, 3.2, 3.4], [258, 276, 4, 3], [292, 368, 10, -3.2, -3.4], [404, 412, 3, 2, 3], [420, 526, 13, 3.2, 3.4],
      [560, 620, 8, -2.6, 2.6], [704, 728, 5, 0, 0, 3.6], [742, 780, 6, 3.2], [806, 816, 3, 2.6], [836, 850, 4, -3], [868, 920, 8, 3.2, 3.4]],
    landmarks: [{ kind: 'stand', at: -22, side: -1 }, { kind: 'cottage', at: 944, side: -1, out: 16, wide: 7, color: RED }, { kind: 'cottage', at: 26, side: -1, out: 20, wide: 6, color: CREAM }, { kind: 'logGate', at: 780 }],
  },
  // Varggropen: the long one, through every place of the adventure and out over Godisängen.
  varggropen: {
    id: 'varggropen', centre: PLAN_CENTRE, plan: TRACK_PLAN,
    zones: [[0, 890], [1, 70], [2, 290], [3, 468], [4, 665]], caves: [{ from: 566, to: 640 }],
    heights: [[0, 0], [70, .5], [118, 3], [150, 4.2], [205, 2.8], [262, 1.4], [292, -.6], [322, -1.6], [400, -1.5], [452, -.9],
      [482, .8], [508, 4.4], [540, 7.2], [575, 8.6], [606, 8.6], [640, 6.6], [690, 2.6], [742, 1.2], [800, 1.6], [850, 2.6], [905, .6], [935, 0]],
    widths: [[0, 6, 2.4, 2.4], [55, 6, 2.4, 2.4], [85, 5.2, 2, 2], [163, 5, 1.8, 1.8], [200, 5.2, 2, 2], [280, 5, 1.6, 1.6],
      [340, 4.6, 1.2, 2], [356, 4.2, 3.4, 2.4], [440, 4.2, 3.4, 3.4], [462, 4.8, 1.8, 1.8], [540, 4.8, 1.8, 1.8],
      [566, 4.6, 1.4, 1.4], [640, 4.6, 1.4, 1.4], [668, 5.4, 2.6, 2.6], [800, 5.6, 3, 3], [880, 5.8, 2.6, 2.6], [930, 6, 2.4, 2.4]],
    pads: [pad(34, 2.8), pad(172, -1.6), pad(430, 1.9, 1.3), pad(544, 0), pad(742, -2.8), pad(768, 2.8), pad(884, 0, 1.6)],
    ramps: [{ from: 226, to: 233, lane: 0, half: 3.4, height: 1.5 }, { from: 654, to: 662, lane: 0, half: 3.6, height: 1.9 }],
    mud: [mud(366, -1.5), mud(391, 1.6), { at: 415, lane: -.7, long: 4, wide: 1.4 }],
    boxRows: [58, 196, 350, 556, 706, 866],
    candies: [[14, 30, 4, -2.6], [84, 108, 5, 2, -1], [126, 154, 6, -3, -3.2], [184, 192, 3, 2.2, 0], [236, 256, 5, 0, 0, 2.6], [296, 326, 6, -3.2, -3.4], [372, 384, 3, 1.4, -1.2],
      [398, 408, 3, -1.6, .8], [486, 526, 7, 3, 3.2], [590, 624, 6, -3, -3.2], [667, 690, 5, 0, 0, 3.4], [716, 736, 4, 2.6, -2.2], [752, 764, 3, -2.4, 2.4], [806, 868, 9, -3.4, -3.6]],
    landmarks: [{ kind: 'stand', at: -22, side: 1 }, { kind: 'windmill', at: 34, side: 1, out: 26 },
      { kind: 'cottage', at: 905, side: 1, out: 16, wide: 7.5, color: RED }, { kind: 'cottage', at: 938, side: 1, out: 24, wide: 6.5, color: YELLOW }, { kind: 'cottage', at: 16, side: 1, out: 19, wide: 8, color: RED },
      { kind: 'cottage', at: 48, side: 1, out: 14, wide: 6, color: RED }, { kind: 'cottage', at: 925, side: -1, out: 9, wide: 5, color: CREAM }, { kind: 'logGate', at: 166 }, { kind: 'rainbow', at: 728 }],
  },
};
