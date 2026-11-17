// The trailer's cut: four acts, each in the tempo of its own arrangement of the game's polska.
// t: the robot's second in the chapter where the shot begins. bars: the shot's length in bars of its act.
// zoom: [from, to] over the shot (1 = the whole frame). follow: how much the crop leans towards Elof (0..1).
// vo: [key, seconds into the shot]. card: words over the picture.

export const FPS = 30;
export const HANDLE = 0.5;

export const ACTS = [
  { id: 'A', tempo: 96, arrangement: 'home', shots: [
    { id: 'A1', chapter: 'prolog', t: 2.0, bars: 3, zoom: [1.05, 1.00], follow: 0, vo: [['scene_morning', 1.0]], fadeIn: 1.2 },
    { id: 'A2', chapter: 'prolog', t: 25.6, bars: 2, zoom: [1.16, 1.26], follow: 0.35, vo: [['eyesAlive', 1.6]] },
    { id: 'A3', chapter: 'prolog', t: 34.2, aim: 'ghost', bars: 2, zoom: [1.75, 1.95], follow: 0.9, vo: [['stolenBag', 0.9]] },
    { id: 'A4', chapter: 'prolog', t: 67.3, bars: 2, zoom: [1.07, 1.20], follow: 0.6, sfx: [['shimmer', 0.4]] },
    { id: 'A5', chapter: 'prolog', t: 74.9, bars: 2, zoom: [1.09, 1.14], follow: 0.4, vo: [['tiny', 0.5]] },
    { id: 'A6', chapter: 'prolog', t: 107.4, bars: 2, zoom: [1.14, 1.07], follow: 0.3, vo: [['followTrail', 0.4]] },
  ] },
  { id: 'B', tempo: 116, arrangement: 'garden', shots: [
    { id: 'B1', chapter: 'garden', t: 31.0, bars: 2, zoom: [1.3, 1.35], follow: 0.75, vo: [['findBag', 0.2]] },
    { id: 'B2', chapter: 'garden', t: 15.7, bars: 2, zoom: [1.11, 1.11], follow: 0.6 },
    { id: 'B3', chapter: 'granskog', t: 5.4, bars: 2, zoom: [1.07, 1.14], follow: 0.5 },
    { id: 'B4', chapter: 'garden', t: 58.5, bars: 2, zoom: [1.09, 1.09], follow: 0.5, vo: [['familyMoaPlan', 0.0]] },
    { id: 'B5', chapter: 'granskog', t: 52.3, bars: 2, zoom: [1.07, 1.07], follow: 0.5 },
    { id: 'B6', chapter: 'granskog', t: 65.8, bars: 2, zoom: [1.14, 1.18], follow: 0.6, vo: [['familyBertil', 0.1]] },
    { id: 'B7', chapter: 'myren', t: 18.4, bars: 2, zoom: [1.09, 1.14], follow: 0.5 },
    { id: 'B8', chapter: 'myren', t: 32.2, bars: 2, zoom: [1.09, 1.09], follow: 0.4, vo: [['familyBraid', 0.0]] },
    { id: 'B9', chapter: 'berget', t: 4.6, bars: 2, zoom: [1.04, 1.11], follow: 0.6, vo: [['heja', 0.15]] },
  ] },
  { id: 'C', tempo: 72, arrangement: 'epilog', shots: [
    { id: 'C0', card: 'Men varför tog spöket godiset?', bars: 1 },
    { id: 'C1', chapter: 'norrsken', t: 4.6, bars: 2, zoom: [1.16, 1.23], follow: 0.6, vo: [['nrLonely', 2.6]] },
    { id: 'C2', chapter: 'norrsken', t: 19.6, bars: 2, zoom: [1.07, 1.11], follow: 0.3, vo: [['nrTogether', 1.2]] },
    { id: 'C3', chapter: 'norrsken', t: 30.6, bars: 3, zoom: [1.04, 1.00], follow: 0.3, title: 1.6, vo: [['scene_title', 2.0]] },
  ] },
  { id: 'D', tempo: 112, arrangement: 'storm', shots: [
    { id: 'D0', chapter: 'flarken', t: 52.4, bars: 2, zoom: [1.00, 1.07], follow: 0.3, vo: [['scene_a2title', 0.7]], sfx: [['thunder', 0.0]], fromBlack: 0.35 },
    { id: 'D1', chapter: 'stormgard', t: 56.4, bars: 2, zoom: [1.14, 1.18], follow: 0.6 },
    { id: 'D2', chapter: 'stormskog', t: 36.6, bars: 2, zoom: [1.11, 1.16], follow: 0.6 },
    { id: 'D3', chapter: 'stormbyn', t: 32.6, bars: 2, zoom: [1.04, 1.09], follow: 0.4 },
    { id: 'D4', chapter: 'olympia', t: 33.4, bars: 2, zoom: [1.09, 1.14], follow: 0.5 },
    { id: 'D5', chapter: 'alven', t: 35.0, bars: 2, zoom: [1.04, 1.09], follow: 0.4, sfx: [['thunder', 1.5]] },
    { id: 'D6', chapter: 'stormoga', t: 23.4, bars: 3, zoom: [1.02, 1.09], follow: 0.2, vo: [['end_morgonen', 0.6]] },
    { id: 'D7', endCard: true, bars: 3 },
  ] },
];

/** Every shot with its place on the trailer's clock. */
export function timeline() {
  const out = [];
  let at = 0;
  for (const act of ACTS) {
    const bar = 180 / act.tempo;
    for (const shot of act.shots) {
      const seconds = shot.bars * bar;
      out.push({ ...shot, act: act.id, start: at, seconds });
      at += seconds;
    }
  }
  return { shots: out, seconds: at };
}
