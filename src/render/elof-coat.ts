import type { SceneFrame } from '../sim/scene';
import type { ChapterData } from '../sim/types';
import type { RainGear } from './rain-gear';
import type { Pose } from './rig';

/**
 * Elof's raincoat through Stormnatten (Olov, 9 November 2026: "Yes, a doll's coat"). The star has made him small before
 * the family get ready, so none of their coats fits him; right after they have put theirs on in Stormkvällen he finds a
 * doll at the foot of the toy shelf in a small yellow raincoat that fits him, and takes it (the spot `coat:take`). He
 * puts it on in the scene `regnrock`, and wears it, the hood down, through every chapter of the storm, until the storm's
 * eye in Stormens öga, where the rain stops: there he takes it off in the scene `rockav`, and lays it down on the stone,
 * before he tastes the golden sweet and grows. It never grows with him. On Sunday morning it hangs to dry with the
 * family's (../content/aventyr2/render.ts, `aftermath`).
 *
 * What it is on him is ./rain-gear.ts's, as the family's coats are: shells of his own body, or the coat made for his
 * model in Blender once the private pack has `elof-wardrobe.glb`; and it goes on as theirs does, in the coat's order
 * (`COAT_ORDER`): his left arm into its sleeve from the cuff up, the coat round his back, his right arm, and the zip.
 * This file has what is his alone: how far it is on at each moment he puts it on or takes it off, how his arms go with
 * it, and the coat in his hands between the doll and his back (./elof-coat-mesh.ts, with what is drawn). Nothing here
 * draws: the chapters read its names.
 */
export const ELOF_COAT = '#f2d43c';
/** The spot where he takes it from the doll, and the doll's distance behind the line he walks. */
export const TAKE = 'coat:take';
export const DOLL_Z = -1;
/** He puts his left arm into its sleeve first (./rain-gear.ts `FIRST_SLEEVE`). */
export const ELOF_FIRST: 0 | 1 = 0;
/** How big the doll is drawn: a little taller than he is when he is small. Its coat is that big off him. */
export const DOLL_SIZE = 1.12;

/**
 * Putting it on, in the seconds of Stormkvällen's scene: the coat comes off the doll into his hands (`hands`), and from
 * `on` it goes onto him as `ON_SHARE` keys it: the left sleeve and its side, round the back, the right sleeve and its
 * side, a shrug, and the zip from the hem up.
 */
export const PUT_ON = { scene: 'regnrock', hands: 0.45, on: 1.0 } as const;
/**
 * Taking it off, in the seconds of Stormens öga's scene, the other way round (`OFF_SHARE`): open, the right arm out, off
 * his back, the left arm out; at `off` it is in his hands, and at `laid` he lays it down.
 */
export const TAKE_OFF = { scene: 'rockav', off: 2.1, laid: 2.85 } as const;

/** How far the coat is on (./rain-gear.ts `COAT_ORDER`'s shares) at each moment of putting it on: [seconds, share]. */
const ON_SHARE: readonly (readonly [number, number])[] = [
  [PUT_ON.on, 0], [1.45, 0.22], [1.6, 0.32], [2.15, 0.52], [2.6, 0.74], [2.75, 0.84], [2.95, 0.88], [3.5, 1],
];
/** And taking it off. */
const OFF_SHARE: readonly (readonly [number, number])[] = [
  [0.25, 1], [0.65, 0.88], [0.8, 0.84], [1.2, 0.52], [1.6, 0.32], [1.7, 0.22], [TAKE_OFF.off, 0],
];
const share = (keys: readonly (readonly [number, number])[], t: number) => {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [b, v] = keys[i]!, [a, u] = keys[i - 1]!;
    if (t <= b) return u + (v - u) * (t - a) / (b - a);
  }
  return keys[keys.length - 1]![1];
};

/**
 * How far the coat is on him now, 0 to 1 (`COAT_ORDER`'s share); null, it is not his to wear here. In reduced motion it
 * goes on, and comes off, at once.
 */
export function coatOnAt(chapter: string, flags: ReadonlySet<string>, scene?: SceneFrame | null, calm = false): number | null {
  if (scene?.id === PUT_ON.scene) return calm ? 1 : share(ON_SHARE, scene.seconds);
  if (scene?.id === TAKE_OFF.scene) return calm ? 0 : share(OFF_SHARE, scene.seconds);
  if (chapter === 'stormkvall') return flags.has(`scene:${PUT_ON.scene}`) ? 1 : null;
  // In the storm's eye it comes off; a game taken up later in the eye finds it off.
  if (chapter === 'stormoga') return flags.has(`scene:${TAKE_OFF.scene}`) || flags.has('scene:motet') || flags.has('taste') ? null : 1;
  return 1;
}

/**
 * Elof's rain gear (./rain-gear.ts `rainGearFor`): the doll's coat and his own shoes, out in the storm's rain while he is
 * small. Never when he is big (`tall`, his size): it is a doll's coat. While he puts it on or takes it off, `on` says how
 * far it is on, in the family's order; it is given from the moment the scene begins, so that the coat is ready before it
 * shows. He has no boots: `boots` is null.
 */
export function elofRainGear(chapter: Pick<ChapterData, 'id' | 'storm'>, flags: ReadonlySet<string>, scene?: SceneFrame | null, calm = false, tall = 1): RainGear | null {
  if (!chapter.storm || (chapter.storm.rain ?? 0) <= 0 || tall > 1.5) return null;
  const coat = coatOnAt(chapter.id, flags, scene, calm);
  if (coat === null) return null;
  return { coat: ELOF_COAT, boots: null, bootOff: null, first: ELOF_FIRST, ...(coat < 1 ? { on: { coat, boots: [0, 0] as const } } : {}) };
}

export const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
type Key = readonly [at: number, arms: readonly [number, number], elbows: readonly [number, number], lean: number, nod: number, spread: number, twist: number, out?: readonly [number, number]];

/**
 * How his arms go, key by key: [seconds, arms (left, right: forward and up from hanging), elbows, lean, nod, spread, twist,
 * and each arm out to its own side]. Putting it on, in step with `ON_SHARE`: he reaches for it at the doll and holds it up;
 * his right hand holds it by the collar at his left shoulder as his left arm goes out and pushes down through its sleeve; he
 * reaches back and out with his right hand and swings it round behind him, and his right arm goes into its sleeve; a
 * shrug, and both hands pull the zip from the hem up to the collar; then he holds his arms out a little: it fits. An arm
 * going into a sleeve goes out to the side as well as back, so that it reads from in front, at his size.
 */
const ON: readonly Key[] = [
  [0, [0.1, 0.1], [0.2, 0.2], 0, 0, 0, 0],
  [0.4, [0.95, 0.95], [0.3, 0.3], 0.25, 0.35, 0, 0],
  [0.9, [1.25, 1.25], [0.95, 0.95], 0.02, 0.12, 0, 0],
  [1.05, [0.75, 1.1], [0.3, 1.4], 0.04, 0.2, 0, 0.15, [0.4, 0]],
  [1.45, [0.45, 1.0], [0.15, 1.6], 0.04, 0.15, 0.05, 0.2, [0.15, 0]],
  [1.6, [0.3, 0.9], [0.3, 1.6], 0.02, 0.1, 0.05, 0.1, [0.05, 0]],
  [2.15, [0.3, -0.5], [0.35, 0.6], 0.02, 0.1, 0.1, -0.25, [0.05, 0.7]],
  [2.6, [0.3, 0.35], [0.4, 0.5], 0.02, 0.12, 0.05, 0, [0.05, 0.12]],
  [2.75, [0.3, 0.3], [0.4, 0.4], 0, 0.1, 0.05, 0],
  [2.95, [0.15, 0.15], [0.3, 0.3], -0.02, 0, 0.12, 0],
  [3.1, [0.5, 0.5], [1.0, 1.0], 0.08, 0.42, 0, 0],
  [3.5, [0.55, 0.55], [2.0, 2.0], 0.04, 0.35, 0, 0],
  [3.85, [0.5, 0.5], [0.25, 0.25], -0.04, -0.05, 0.35, 0],
  [4.5, [0.5, 0.5], [0.25, 0.25], -0.04, -0.05, 0.35, 0],
  [4.9, [0.05, 0.05], [0.15, 0.15], 0, 0, 0, 0],
];
/**
 * Taking it off, in step with `OFF_SHARE`: the zip down from the collar, his right arm back out of its sleeve, his right
 * hand round in front to pull it off his back, and his left arm straight out of its sleeve; he holds it, and bends down to
 * lay it on the stone.
 */
const OFF: readonly Key[] = [
  [0, [0.1, 0.1], [0.2, 0.2], 0, 0, 0, 0],
  [0.25, [0.55, 0.55], [2.0, 2.0], 0.04, 0.35, 0, 0],
  [0.65, [0.5, 0.5], [1.0, 1.0], 0.08, 0.42, 0, 0],
  [0.8, [0.3, 0.2], [0.4, 0.3], 0.02, 0.12, 0.05, 0],
  [1.2, [0.35, -0.6], [0.5, 0.15], 0.04, 0.1, 0.05, -0.3, [0.05, 0.75]],
  [1.6, [0.4, 0.9], [0.4, 1.4], 0.02, 0.12, 0.05, 0.1, [0.05, 0.1]],
  [2.1, [0.5, 1.0], [0.15, 1.6], 0.04, 0.15, 0.05, 0.2, [0.4, 0]],
  [2.3, [1.2, 1.2], [0.85, 0.85], 0.02, 0.15, 0, 0],
  [2.85, [0.95, 0.95], [0.25, 0.25], 0.42, 0.45, 0, 0],
  [3.4, [0.1, 0.1], [0.2, 0.2], 0, 0, 0, 0],
];

/**
 * His arms and trunk while he puts the coat on or takes it off, over the scene's act (`out`, as ./acting.ts left it);
 * other scenes are left as they are. Bent over the stone as he lays it down, his knees give.
 */
export function coatPose(scene: string, seconds: number, out: Pose): Pose {
  const keys = scene === PUT_ON.scene ? ON : scene === TAKE_OFF.scene ? OFF : null;
  if (!keys) return out;
  let i = 0;
  while (i < keys.length - 2 && seconds >= keys[i + 1]![0]) i++;
  const a = keys[i]!, b = keys[i + 1]!;
  const k = smooth((seconds - a[0]) / (b[0] - a[0]));
  const mix = (p: number, q: number) => p + (q - p) * k;
  out.armL = mix(a[1][0], b[1][0]); out.armR = mix(a[1][1], b[1][1]);
  out.elbowL = mix(a[2][0], b[2][0]); out.elbowR = mix(a[2][1], b[2][1]);
  out.lean = mix(a[3], b[3]); out.nod = mix(a[4], b[4]);
  out.spread = mix(a[5], b[5]); out.twist = mix(a[6], b[6]);
  out.outL = mix(a[7]?.[0] ?? 0, b[7]?.[0] ?? 0); out.outR = mix(a[7]?.[1] ?? 0, b[7]?.[1] ?? 0);
  const bend = Math.max(0, out.lean - 0.2) / 0.22;
  if (bend > 0) { out.legL = out.legR = 0.55 * bend; out.kneeL = out.kneeR = 1.0 * bend; }
  return out;
}
