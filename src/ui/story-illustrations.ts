/** Original paper-cut story art. One small vector scene paints both the collected pages and the world cards;
 * there is no image request, private likeness, font, or asynchronous texture upload. Coordinates are 320×200. */
export type StoryIllustrationKey = 'mountain' | 'pine-crack' | 'vittror' | 'small-figure' | 'old-window'
  | 'lonely-hollow' | 'northbound' | 'wind-posts' | 'raft' | 'outlet-pair' | 'old-stone' | 'safe-harbour' | 'family-lamps' | 'family-breakfast' | 'moa-drawing';
type Wash = { top: string; bottom: string; y1: number; y2: number };
type Ink = string | Wash;
type Mark = { d: string; fill: Ink; stroke?: string; width?: number; opacity?: number; tag?: string };
type Layer = { children: Art[]; x?: number; y?: number; scale?: number; rotate?: number; opacity?: number; tag?: string };
type Art = Mark | Layer;
const I = '#463f43', GOLD = '#edc789', PAPER = '#fff3d4';
const path = (d: string, fill: Ink = 'none', stroke?: string, width = 1.5, opacity?: number): Mark => ({ d, fill, stroke, width, opacity });
const line = (d: string, stroke = I, width = 1.5, opacity?: number) => path(d, 'none', stroke, width, opacity);
const ellipse = (x: number, y: number, rx: number, ry: number, fill: Ink, stroke?: string, width = 1.5) => path(`M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`, fill, stroke, width);
const rect = (x: number, y: number, w: number, h: number, fill: Ink) => path(`M${x} ${y}h${w}v${h}h${-w}Z`, fill);
const group = (children: Art[], x = 0, y = 0, scale = 1, rotate = 0, tag?: string): Layer => ({ children, x, y, scale, rotate, tag });
const wash = (top: string, bottom: string, y1 = 0, y2 = 200): Wash => ({ top, bottom, y1, y2 });
const shadow = (x: number, y: number, r: number) => ({ ...ellipse(x, y, r, r * .14, '#273e47'), opacity: .2 });

/** Their deliberately different silhouettes: the old one's bent cap/beard/coat; Elof's short, bare linden block. */
function woodenFigure(kind: 'old' | 'little', eyes = true): Art {
  if (kind === 'little') return group([
    shadow(0, 1, 37),
    path('M-27-56-34-24-31-5-19 0 24-1 32-8 29-28 21-55Z', wash('#f6e3b9', '#c29c68', -64, 0), '#8c7154', 1.7),
    path('M-27-45-36-42-39-31-33-23-27-28M27-45 36-41 39-31 33-24 28-28', '#e8d2a8', '#967b57', 1.3),
    path('M-19-57-29-70-28-88-17-101 2-105 21-98 29-83 26-65 14-56Z', wash('#fff0cf', '#d5b987', -105, -56), '#967b57', 1.6),
    path('M-29-80-19-94 2-101 21-94 28-83 18-87-2-91-20-82Z', '#fff1d2'),
    path('M-28-72-18-62 15-59 25-67 13-57-19-57Z', '#c8a677'),
    path('M-26-53-18-34-20-4-31-6-34-24Z', '#d0ad7c'),
    path('M20-53 12-27 16-4 29-8 28-26Z', '#f4dfb3'),
    line('M-11-51-8-33-10-14M1-46 4-24 1-4M-24-80-21-70M17-81 19-73', '#b99463', 1, .55),
    ...(eyes ? [ellipse(-11, -83, 4.2, 4.6, '#302a29'), ellipse(11, -85, 4.1, 4.6, '#302a29'), line('M-8-69Q0-62 8-70', '#40342b', 2.3)] : []),
  ], 0, 0, 1, 0, 'little-carving');
  return group([
    shadow(0, 1, 37),
    path('M-24-23-27-5-14 0-4-4-6-23M8-23 6-6 17 0 31-3 26-23', '#73675b', '#4e514b', 1.5),
    path('M-25-63-32-23-18-16 1-21 21-16 30-24 21-64Z', wash('#a2a48a', '#737e70', -68, -20), '#59665c', 1.7),
    path('M-25-60-36-43-35-29-25-32-18-50M22-60 34-44 33-31 24-30 17-50', '#838e79', '#59665c', 1.5),
    ellipse(-29, -31, 5, 6, '#c4ad87'), ellipse(28, -31, 5, 6, '#c4ad87'),
    path('M-22-87-25-72-19-61 0-53 20-61 25-76 16-91Z', '#d7c8a5', '#8d826d', 1.5),
    path('M-22-70-22-51-14-40-6-44 0-33 11-42 22-62 20-72 10-68 0-64-11-67Z', '#d5d0b8', '#8f917e', 1),
    line('M-16-63-12-49M-6-62-1-44M6-61 6-45M15-65 14-51', '#a5a592', 1.2),
    path('M-27-82-22-99-5-126 12-137 21-129 10-121 12-112 25-83 13-79-2-83-16-79Z', wash('#ae8b76', '#80685f', -137, -79), '#6b615b', 1.6),
    path('M-19-91-6-114 10-130 13-127 3-114 7-100-3-86Z', '#c2a18a', undefined, 0, .7),
    line('M-20-83Q-6-88 4-83T23-84M-17-28-15-45M17-26 14-40', '#d0c5a5', 1.2),
    ellipse(0, -70, 5.5, 4.5, '#dbc3a0', '#a18e74', 1),
    ...(eyes ? [ellipse(-10, -76, 3.6, 3.4, '#353545'), ellipse(10, -77, 3.5, 3.4, '#353545'), ellipse(-11, -77, 1, 1, '#eee6cd'), ellipse(9, -78, 1, 1, '#eee6cd')] : []),
    line('M-7-61Q0-55 9-64', '#5d5a53', 1.8),
    path('M-27-25q8-8 11-2l-4 6ZM17-19q-2-10 5-8l5 7Z', '#879462'),
  ], 0, 0, 1, 0, 'old-carving');
}

function spruce(x: number, y: number, h: number, far = false): Art {
  const dark = far ? '#657f85' : '#315e61', light = far ? '#819b98' : '#729578';
  return group([
    path('M-3 0-1-82 3-82 5 0Z', '#817258'),
    path('M0-110 12-82 7-84 22-62 12-65 31-38 20-42 40-13 25-17 33-3 7-9-2-4-15-10-35-3-27-16-39-13-22-37-31-34-14-63-23-58-7-86-13-81Z', dark),
    path('M0-106 7-84 1-86 10-66 2-69 12-42 2-45 17-16 1-23-14-14-3-38-14-34-2-63-10-59Z', light, undefined, 0, .7),
    line('M-18-22-5-30M9-37 23-26M-13-58-3-64M2-76 9-68', '#adc0a1', 1.3, .5),
  ], x, y, h / 110);
}
function pine(x: number, y: number, scale = 1): Art {
  return group([
    path('M-7 0-8-26 1-65-5-95 3-99 12-66 4-30 8 0Z', '#8b7258', '#605a4c', 1.5),
    line('M4-47-23-71M8-65 30-86M2-80-16-95', '#8b7258', 5),
    ...[[-29, -77, 27], [28, -91, 33], [-8, -103, 29]].flatMap(([cx, cy, r]) => [
      path(`M${cx-r} ${cy}q-6-12 12-15q2-12 20-7q17-9 22 3q17-3 20 9q-5 16-25 12q-28 10-49-2Z`, '#5f6d57'),
      line(`M${cx-r+8} ${cy-4}q12-8 25-4m6-5 14 2`, '#a5b386', 2),
    ]),
    line('M-2-20 3-38M2-58 5-68M-2-87 0-93', '#c6ab7d', 2),
  ], x, y, scale);
}
function hills(night = false): Art[] {
  return [
    path('M0 105Q36 74 68 92L131 43 166 77 194 59 257 109 286 82 320 104V200H0Z', night ? '#4b6079' : '#94b2b2'),
    path('M40 136 128 48 146 70 176 102 194 64 273 128 320 125V200H0Z', night ? '#647486' : '#708e94'),
    path('M128 48 146 70 176 102 152 89 136 97 139 78 117 87 102 85Z', night ? '#8c94a1' : '#dbdcd1'),
    path('M194 64 215 84 204 83 193 92 185 86 177 91Z', '#c0ceca'),
    path('M0 145Q53 104 104 132T220 131T320 143V200H0Z', night ? '#2f4e5d' : '#648b81'),
  ];
}
const stars = () => group(Array.from({ length: 13 }, (_, i) => ellipse(22 + (i * 53) % 279, 13 + (i * 29) % 76, i % 3 ? .8 : 1.5, i % 3 ? .8 : 1.5, '#e3e2be')), 0, 0, 1, 0, 'light');
function wind(y = 68): Art { return group([line(`M-12 ${y}Q63 ${y-28} 130 ${y-2}T274 ${y-4}T338 ${y-26}`, '#d7e8df', 2.2, .75), line(`M-10 ${y+22}Q80 ${y-7} 135 ${y+20}T264 ${y+18}`, '#d7e8df', 1, .55)], 0, 0, 1, 0, 'breeze'); }
const meadow = (y = 158) => group([
  path(`M0 ${y}Q68 ${y-18} 154 ${y+1}T320 ${y-5}V200H0Z`, '#4e7266'),
  path(`M0 ${y+15}Q95 ${y-3} 168 ${y+19}T320 ${y+10}V200H0Z`, '#2f5858'),
  ...Array.from({ length: 13 }, (_, i) => line(`M${13+i*25} ${y+22+(i%3)*6}l-3-9m3 9 6-6`, '#9bac77', 1.2)),
]);
const water = (y = 127) => group([
  rect(0, y, 320, 200-y, wash('#547c91', '#253f5c', y, 200)),
  ...Array.from({ length: 12 }, (_, i) => line(`M${(i*67)%305-15} ${y+7+i*5}q18-4 36 0t28-1`, i%3 ? '#96b7bb' : '#eed09c', i%4 ? 1 : 2, .5)),
]);
function room(night = true): Art[] {
  return [
    rect(0, 0, 320, 200, wash('#7b6670', '#c89772')),
    ...[28, 64, 101, 137].map(y => line(`M0 ${y}h320`, '#725766', 1, .38)),
    path('M29 21H132V126H29Z', '#e5b985', '#544b55', 3),
    rect(36, 28, 89, 89, wash(night ? '#243a57' : '#8eb1b6', '#577881', 28, 117)),
    ...(night ? [ellipse(104, 45, 10, 10, '#fff2bc'), line('M43 44 48 39M63 70 68 65M93 87 98 82', '#cadcd1', 1)] : []),
    path('M77 25H84V122H77ZM32 69H129V76H32Z', '#eacb9b'),
    path('M23 119H139V127H23Z', '#f3d7ab', '#9b795d', 1.5),
    path('M17 18Q28 66 13 115L32 117Q43 70 33 18ZM131 18Q121 57 138 115L155 111Q136 60 148 18Z', '#b0b6a1'),
    line('M23 26Q35 73 22 105M142 29Q131 66 144 104', '#e7d7b5', 2),
    path('M0 159H320V200H0Z', '#99745e'),
    line('M0 176H320M79 160 47 200M182 160 187 200M276 160 311 200', '#775c54', 1),
  ];
}

/** Public, expressive story characters. Their clothes and age tell the story; these are not family likenesses. */
function person(adult = false, cap = false, arm: 'up' | 'out' | 'none' = 'none', braid = false): Art {
  return group([
    shadow(0, 1, 27),
    path('M-17-30-19-7-10-2-3-5 0-25 5-25 8-4 18-2 22-7 17-32Z', adult ? '#4e5c5b' : '#486783', I, 1.5),
    path('M-20-8-26-2-26 2-7 2-3-4M8-5 7 2 29 2 27-3 20-7', '#554e4d', I, 1.5),
    path('M-18-69-25-51-25-33-17-32-14-52 16-52 17-31 25-33 24-51 17-69Z', adult ? (braid ? '#b98679' : '#6e8876') : '#9cc4e4', I, 1.5),
    path('M-17-66Q0-73 17-66L19-28Q0-22-19-28Z', adult ? (braid ? '#b98679' : '#7f9980') : '#9cc4e4', I, 1.5),
    path('M-14-64-11-30-18-29-18-59Z', adult ? '#56766a' : '#78a7d3'),
    ...(adult ? [line('M0-65V-29', '#c8c0a1', 1), ellipse(4, -48, 1, 1, '#e1d6ad')] : [line('M-16-44H17M-16-35H18', '#e5e5cc', 3)]),
    ...(arm === 'none' ? [ellipse(-21, -28, 4, 5, '#e6ba91'), ellipse(21, -28, 4, 5, '#e6ba91')] : [
      path(arm === 'up' ? 'M17-65 27-76 30-95 37-94 35-72 23-56Z' : 'M16-63 29-49 45-56 49-49 29-39 17-51Z', adult ? '#7f9980' : '#9cc4e4', I, 1.5),
      ellipse(arm === 'up' ? 34 : 48, arm === 'up' ? -97 : -53, 4, 5, '#eac39b', I, 1),
    ]),
    path('M-5-70V-62Q0-58 6-63V-71Z', '#d9aa85'),
    path(adult ? 'M-17-96Q-20-110-8-115Q10-123 20-106L20-87 13-73 1-68-13-75-20-87Z' : 'M-23-93Q-24-116-5-121Q17-123 25-105L25-86 16-72-2-69-20-79Z', wash('#f5d6af', '#dfac88', -120, -70), I, 1.5),
    ellipse(adult ? -18 : -23, -89, 4, 6, '#ecc29a'), ellipse(adult ? 20 : 24, -89, 4, 6, '#ecc29a'),
    path(adult ? 'M-18-96-20-111-11-119 7-121 19-114 22-101 14-108 7-106-2-113-13-105Z' : 'M-24-99-21-116-9-123 7-124 21-116 27-101 19-104 14-113 7-105 1-115-7-106-12-114-17-102Z', adult ? '#65564b' : '#ddb452', I, 1.2),
    ...(braid ? [path('M-17-104Q-30-85-19-66L-24-59-15-57-11-65Q-25-80-14-97Z', '#65564b', I, 1)] : []),
    ...(cap ? [path('M-24-111Q-12-135 12-124L23-111 37-106 34-102 4-105-23-104Z', '#716356', I, 1.5), line('M-6-124-3-110', '#c3b195', 1)] : []),
    ellipse(-8, -91, 2.1, 2.8, I), ellipse(10, -92, 2.1, 2.8, I),
    line('M0-89-2-84 2-83', '#bf906f', 1.1),
    ellipse(-14, -82, 5, 2.6, '#e4a18c'), line('M-5-78Q2-73 9-80', I, 1.5),
  ]);
}

function scene(key: StoryIllustrationKey): Art[] {
  const sky = [rect(0, 0, 320, 200, wash('#24445f', '#91a4a3')), stars()];
  if (key === 'moa-drawing') return [
    rect(0, 0, 320, 200, PAPER), line('M18 98Q160 90 300 98', '#cbbca2', 1.4),
    group([path('M0-34 8-12 32-11 13 4 20 28 0 14-22 28-15 4-34-11-10-12Z', '#edc664', '#a17743', 2), ellipse(-7, -10, 3, 3, '#fff3be')], 62, 49),
    group([person(false, false, 'out')], 249, 78, .3),
    group([person(false, false, 'out')], 250, 193, .71),
    path('M119 46Q150 37 180 50m-14-12 15 12-18 7M119 147Q153 137 184 150m-14-12 15 12-18 7', 'none', '#9b795b', 3),
    path('M27 138 12 126 15 149 12 168 30 157M91 138 108 128 103 148 108 167 91 157', '#d7a94e', '#a87b3f', 2),
    ...[[-16, -9], [0, -15], [16, -9], [-19, 7], [0, 7], [19, 7], [-12, 20], [10, 20]].map(([x,y]) => ellipse(60+x, 145+y, 11, 10, wash('#ffe494', '#d39536', 124, 174), '#b88639', 1)),
    line('M24 107 18 98M92 107 101 100M17 120 8 116M102 119 112 113', '#caa148', 2),
  ];
  if (key === 'old-window' || key === 'family-breakfast') return [
    ...room(),
    ...(key === 'old-window' ? [
      path('M169 115H288V126H169ZM180 125H187V148H180ZM270 125H277V148H270Z', '#7c6153', '#513f3d', 1.5),
      ellipse(224, 118, 45, 8, '#efbe75'),
      group([woodenFigure('old')], 227, 112, .65),
      line('M36 45 45 33M46 68 55 56M101 97 110 85M96 54 105 42', '#c9ded9', 1.3),
    ] : [
      rect(27, 50, 100, 7, '#765546'), group([woodenFigure('old')], 57, 49, .25), group([woodenFigure('little')], 94, 49, .28),
      group([person(true)], 178, 175, .84), group([person(false, false, 'out')], 133, 179, .58), group([person(true, false, 'none', true)], 250, 178, .83),
      path('M90 145H292V155H90ZM105 155H112V194H105ZM277 155H284V194H277Z', '#7c5b4c', '#584940', 1.5),
      ellipse(181, 147, 78, 8, '#d6ba8a'),
      ...[137, 177, 219, 257].map(x => group([path('M-7 0H7V9Q0 13-7 9Z', '#f6d8ac', '#745d4d', 1), line('M7 2Q16-1 13 7L7 8', '#d9b98d', 2), line('M-3-4Q-7-9-2-14', '#fff0d0', 1.4, .6)], x, 140)),
      group([path('M-7-34Q0-40 7-34V0H-7Z', '#6c9784', '#416557', 1.5), rect(-7, -37, 14, 6, '#c2c4a6')], 199, 140),
    ]),
    group([ellipse(238, 31, 34, 27, '#e9bc75'), path('M226 40 207 145H279L250 40Z', '#f4cc7e', undefined, 0, .12), line('M238 0V19', '#504952', 2), path('M220 39 228 19H249L258 39Z', '#7f8c78', '#4c5e59', 1.5)], 0, 0, 1, 0, 'light'),
  ];
  if (key === 'family-lamps') return [
    ...sky, ...hills(true), water(115),
    path('M0 154Q51 137 86 139L118 121 208 129 320 113V158Q237 167 155 155T0 177Z', '#49665f'),
    path('M0 166Q68 148 129 151T320 148L320 166Q242 183 154 168T0 184Z', '#728c75'),
    ...[[91,139], [167,134], [247,134]].map(([x,y]) => group([
      { ...ellipse(x, y+8, 31, 32, '#edca84'), opacity: .13 },
      { ...ellipse(x, y+8, 18, 20, '#f9daa0'), opacity: .18 },
      path(`M${x-8} ${y+9} ${x-51} 198H${x+47}L${x+8} ${y+9}Z`, '#e7ca84', undefined, 0, .13),
    ], 0, 0, 1, 0, 'light')),
    group([person(true)], 105, 151, .68),
    group([person(false, false, 'out')], 145, 152, .46),
    group([person(true, false, 'none', true)], 194, 146, .68),
    group([person(false, true)], 236, 147, .5),
    group([person(false)], 278, 145, .48),
    ...[[91,139], [167,134], [247,134]].map(([x,y]) => group([
      path(`M${x-5} ${y}q0-9 5-9q5 0 5 9`, 'none', '#443e45', 2),
      path(`M${x-7} ${y}h14l2 18h-18Z`, '#ecc884', '#5c534c', 2),
      ellipse(x, y+9, 3, 6, '#fff4bc'), line(`M${x-6} ${y+17}h12`, '#60574b', 2),
    ])),
    ...[78, 149, 229].map(x => line(`M${x} 177q14-4 28 0m-23 7h17m-13 6h10`, '#efd59c', 2, .7)),
    spruce(22, 163, 145), spruce(348, 162, 155),
  ];
  if (key === 'small-figure') return [
    ...room(), ellipse(174, 174, 90, 10, '#6a5550'),
    group([woodenFigure('little')], 141, 169, 1.05),
    group([
      path('M-27 10 2-38 18-11 30 14Z', '#bc5c54', '#7e4948', 1.7),
      path('M-27 10Q0 5 30 14L30 21Q0 12-28 17Z', '#e8ddc1', '#af9c82', 1),
      ellipse(2, -39, 7, 7, '#f4efdf'), line('M-14 3 1-23M-2 5 5-13M11 9 10-6', '#e7a080', 1),
    ], 232, 154, .85, 25),
  ];
  if (key === 'vittror') return [
    rect(0, 0, 320, 200, wash('#b4c2a2', '#f6ddb0')),
    spruce(23, 177, 184), spruce(303, 180, 198), spruce(270, 137, 111, true),
    meadow(158),
    path('M42 174Q61 133 72 54L108 23 144 28 158 79Q175 132 211 168L176 180 137 159 107 170 71 187Z', wash('#ac8e63', '#655e48', 30, 180), '#5e5a47', 2),
    line('M105 32 95 83 90 108M128 39 139 93 154 127M76 159 95 141', '#d2b17b', 3, .8),
    path('M96 162V124Q119 85 144 123V164Z', '#263f3e', '#d6bd82', 4),
    path('M103 160V128Q119 104 138 127V160Z', '#725c47', '#413f38', 1.5),
    line('M112 122V159M122 117V159M131 123V159', '#9d845c', 1), ellipse(132, 142, 2, 2, '#e9c88a'),
    path('M175 50 278 63 260 166 160 153Z', '#f6e7c3', '#bda37a', 2),
    group([woodenFigure('old')], 217, 145, .57, 7),
    line('M185 63 259 72M177 142 181 145M248 153 253 154', '#cbb48a', 1),
    ...[[-6, 0], [4, -3], [10, 4]].map(([x,y]) => ellipse(81+x, 170+y, 6, 6, '#c76565', '#823f46', 1)),
    path('M75 164q-12-15-19-8q4 12 19 8M82 163q3-16 13-13q0 12-13 13', '#8ea875'),
    line('M190 20q8 8 14 0m-10 9q10 8 18-1', '#f3eacb', 1.3),
  ];
  if (key === 'lonely-hollow') return [
    ...sky, ...hills(true),
    path('M0 70 60 48 126 84 118 140 132 200H0ZM197 80 251 59 320 84V200H187L202 133Z', wash('#9b9e8d', '#526967', 50, 200), '#4a5c5e', 2),
    path('M126 84 150 102 174 88 197 80 202 133 187 200H132L118 140Z', '#243f46'),
    path('M130 84 152 188 177 188 194 81Z', '#e9c78a', undefined, 0, .11),
    group([woodenFigure('old', false)], 159, 185, .73),
    pine(256, 117, .74),
    line('M22 94 71 108 112 96M28 116 96 133M214 120 272 105M220 156 292 139', '#b7b69a', 1.5, .7),
    path('M85 195q12-23 24-9l7 14H71M206 200q5-22 17-17l12 17', '#8f9f75'),
    path('M66 102q11-9 17 3q-11 10-17-3M235 140q8-9 15-2q-4 12-15 2', '#d6ac71'),
  ];
  if (key === 'mountain' || key === 'pine-crack') return [
    rect(0, 0, 320, 200, wash('#a8c2ca', '#f2e1b5')), ellipse(246, 44, 21, 21, '#fff1c4'),
    ...hills(),
    ...(key === 'pine-crack' ? [pine(238, 139, .9), path('M123 157 151 137 179 155 172 194H120Z', '#4a5351'), ellipse(149, 173, 9, 12, '#aaa99f')] : []),
    meadow(177),
    path('M20 200Q105 150 149 132', 'none', '#d5c79b', 12),
    ...(key === 'mountain' ? [] : [path('M125 185 128 167 149 151 168 163 169 185Z', '#4a5351'), ellipse(149, 173, 9, 12, '#aaa99f')]),
  ];
  if (key === 'northbound' || key === 'wind-posts') return [
    ...sky, ...hills(true),
    ellipse(242, 41, 25, 25, '#d9ddbc'),
    ...(key === 'northbound' ? [
      path('M0 155 44 135H121V190H0Z', '#8d5960'), path('M-7 136 43 108 133 133 121 143 43 120 0 145Z', '#475d65'),
      line('M15 151H111M15 165H111M28 142V183M57 142V183M87 142V183', '#ae7d76', 1.5),
      spruce(295, 196, 128),
    ] : [
      water(133), path('M0 181 320 151V178L0 200Z', '#ad936c', '#675f58', 2),
      ...[36, 104, 172].flatMap((x,i) => [path(`M${x} 196l${-5+i*2}-102 10-2 7 102Z`, '#d9bd86', '#675f58', 2), line(`M${x+4} 103l2 75`, '#f0d7a2', 1.2)]),
      line('M40 105Q99 123 110 102Q162 122 179 99', '#a8bab2', 2),
    ]),
    wind(70), wind(104),
    group([ellipse(0, -44, 39, 51, '#fff4c5'), woodenFigure('little')], 220, 134, .64, -28),
    line('M148 72 163 63M152 91 168 84M235 40 244 31', '#f9e9b8', 2),
  ];
  if (key === 'raft' || key === 'outlet-pair' || key === 'old-stone' || key === 'safe-harbour') return [
    ...sky, ...hills(true), spruce(25, 143, 129), spruce(296, 145, 137), water(129),
    ...(key === 'raft' ? [
      path('M51 158 127 140 246 162 167 188Z', '#9e825f', '#594f49', 2),
      ...[0, 1, 2, 3, 4].map(i => path(`M${56+i*21} ${158+i*5}l75-18 18 3-76 19Z`, i%2 ? '#c3a577' : '#b49669', '#6c5c4d', 1)),
      line('M87 153 193 175M107 148 215 170', '#e4ce98', 2),
      // The raft is Elof's way across; Klonk's clue is the little carving bobbing ahead in the current.
      group([woodenFigure('little')], 245, 136, .62, 9),
      line('M215 142q28 10 59-1M225 150q19 5 40 0', '#d8d4b1', 1.5),
      path('M238 156q25-10 38-3q-13 7-38 3M51 181q-31 6-39-1', 'none', '#d8d4b1', 1.5),
    ] : key === 'outlet-pair' ? [
      path('M32 167Q61 144 116 157L136 174Q86 192 34 180Z', '#896f53', '#544d48', 2),
      line('M44 172Q79 160 119 173M55 178Q82 169 111 177', '#bd9f6f', 2),
      group([woodenFigure('old')], 87, 167, .53, -8), group([woodenFigure('little')], 220, 157, .56, 12),
      ...[61, 174, 221].map(x => line(`M${x} 177q20 8 43 0`, '#dce7cf', 1.5)),
    ] : [
      path('M70 200 86 160 130 136 198 133 239 158 252 200Z', '#929f96', '#5a706e', 2),
      path('M86 160 132 141 197 140 232 160 183 173 122 169Z', '#c2cab5'),
      group([woodenFigure('old')], 143, 162, .55),
      ...(key === 'safe-harbour' ? [group([woodenFigure('little')], 191, 165, .54)] : []),
      ellipse(175, 175, 7, 3, GOLD),
      line('M15 190q18-6 40 0M263 181q21-5 43 0', '#d9dabc', 2),
    ]),
    group([line('M8 199 14 157M18 200 26 168M303 199 299 160', '#a7b58c', 2), path('M11 173q-13-8-9-13q10 2 9 13M302 178q15-12 16-6q-7 10-16 6', '#9bac7c')], 0, 0, 1, 0, 'breeze'),
  ];
  return [];
}

let serial = 0;
function svgArt(art: Art, prefix: string, defs: string[]): string {
  const opacity = art.opacity === undefined ? '' : ` opacity="${art.opacity}"`;
  const tag = art.tag ? ` data-illustration-part="${art.tag}"` : '';
  if ('children' in art) return `<g transform="translate(${art.x ?? 0} ${art.y ?? 0}) scale(${art.scale ?? 1}) rotate(${art.rotate ?? 0})"${opacity}${tag}>${art.children.map(a => svgArt(a, prefix, defs)).join('')}</g>`;
  let fill: string;
  if (typeof art.fill === 'string') fill = art.fill;
  else {
    const id = `${prefix}-${defs.length}`;
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${art.fill.y1}" x2="0" y2="${art.fill.y2}"><stop stop-color="${art.fill.top}"/><stop offset="1" stop-color="${art.fill.bottom}"/></linearGradient>`);
    fill = `url(#${id})`;
  }
  return `<path d="${art.d}" fill="${fill}"${art.stroke ? ` stroke="${art.stroke}" stroke-width="${art.width}" stroke-linecap="round" stroke-linejoin="round"` : ''}${opacity}${tag}/>`;
}
function fragment(art: Art): string {
  const defs: string[] = [], body = svgArt(art, `story-art-${serial++}`, defs);
  return `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}`;
}
function paint(c: CanvasRenderingContext2D, art: Art): void {
  c.save();
  if (art.opacity !== undefined) c.globalAlpha *= art.opacity;
  if ('children' in art) {
    c.translate(art.x ?? 0, art.y ?? 0); c.scale(art.scale ?? 1, art.scale ?? 1); c.rotate((art.rotate ?? 0) * Math.PI / 180);
    for (const child of art.children) paint(c, child);
  } else {
    const d = new Path2D(art.d);
    if (typeof art.fill === 'string') c.fillStyle = art.fill;
    else { const g = c.createLinearGradient(0, art.fill.y1, 0, art.fill.y2); g.addColorStop(0, art.fill.top); g.addColorStop(1, art.fill.bottom); c.fillStyle = g; }
    if (art.fill !== 'none') c.fill(d);
    if (art.stroke) { c.strokeStyle = art.stroke; c.lineWidth = art.width ?? 1.5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(d); }
  }
  c.restore();
}

/** Complete, self-contained SVG. Stable artwork IDs allow a memory page to be replayed without redrawing it. */
export function storyIllustration(key: StoryIllustrationKey): string {
  return `<svg viewBox="0 0 320 200" class="memory-illustration story-illustration" data-illustration="${key}" aria-hidden="true">${fragment(group(scene(key)))}<path d="M5 5H315V195H5Z" fill="none" stroke="${PAPER}" stroke-width="2" opacity=".45"/></svg>`;
}
/** Caller controls its destination transform and clip. Drawing is synchronous, including all gradients. */
export function paintStoryIllustration(c: CanvasRenderingContext2D, key: StoryIllustrationKey): void { for (const art of scene(key)) paint(c, art); }
export function carvingArt(kind: 'old' | 'little', x: number, y: number, height: number, eyes = true): string {
  return `<g class="${kind === 'old' ? 'tragubbe' : 'lillgubbe'}">${fragment(group([woodenFigure(kind, eyes)], x, y, height / (kind === 'old' ? 138 : 106)))}</g>`;
}
export function storyPerson(x: number, y: number, height: number, adult = false, cap = false, arm: 'up' | 'out' | 'none' = 'none', braid = false, lean = 0): string {
  return fragment(group([person(adult, cap, arm, braid)], x, y, height / 125, lean));
}
export function storySpruce(x: number, y: number, height: number, far = false): string { return fragment(spruce(x, y, height, far)); }
export function storyPine(x: number, y: number, scale = 1): string { return fragment(pine(x, y, scale)); }

/** Seated behind Pappa's head, with legs around his neck and his hands supporting the boots. */
export function storyShoulderCarry(x: number, y: number, height: number, childHeight: number): string {
  return fragment(group([
    group([person(false, true, 'up')], 0, -83, childHeight / height),
    path('M-12-101Q-28-101-36-85L-39-65-28-62-22-81-4-90 4-90 22-81 28-62 39-65 36-85Q28-101 12-101Z', '#486783', I, 1.5),
    path('M-39-67-45-63-45-59-25-59-26-65M26-65 25-59H45V-63L39-67', '#554e4d', I, 1.5),
    person(true, true),
    path('M-18-64-28-54-37-61-40-57-29-45-20-49M18-64 28-54 37-61 40-57 29-45 20-49', '#7f9980', I, 1.5),
    ellipse(-38, -62, 4, 4, '#e6ba91', I, 1), ellipse(38, -62, 4, 4, '#e6ba91', I, 1),
  ], x, y, height / 125));
}
