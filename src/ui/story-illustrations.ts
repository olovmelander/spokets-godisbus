/** Original paper-cut story art. One small vector scene paints both the collected pages and the world cards;
 * the drawn cast follows the game’s clothes and silhouettes, without embedding a model, photo or texture. Coordinates are 320×200. */
export type StoryIllustrationKey = 'mountain' | 'pine-crack' | 'vittror' | 'small-figure' | 'old-window' | 'window-escape' | 'cap-return'
  | 'lonely-hollow' | 'northbound' | 'forest-trail' | 'wind-posts' | 'raft' | 'outlet-pair' | 'old-stone' | 'safe-harbour' | 'family-lamps' | 'family-breakfast' | 'moa-drawing';
type Wash = { top: string; bottom: string; y1: number; y2: number };
type Ink = string | Wash;
type Mark = { d: string; fill: Ink; stroke?: string; width?: number; opacity?: number; tag?: string };
type Layer = { children: Art[]; x?: number; y?: number; scale?: number; rotate?: number; opacity?: number; tag?: string; flip?: boolean };
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
function woodenFigure(kind: 'old' | 'little', eyes = true, fresh = false, restingArms = true): Art {
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
    path('M-25-63-32-23-18-16 1-21 21-16 30-24 21-64Z', wash(fresh ? '#c8b28a' : '#a2a48a', fresh ? '#a08c6f' : '#737e70', -68, -20), '#59665c', 1.7),
    ...(restingArms ? [path('M-25-60-36-43-35-29-25-32-18-50M22-60 34-44 33-31 24-30 17-50', fresh ? '#baa47f' : '#838e79', '#59665c', 1.5),
    ellipse(-29, -31, 5, 6, '#c4ad87'), ellipse(28, -31, 5, 6, '#c4ad87')] : []),
    path('M-22-87-25-72-19-61 0-53 20-61 25-76 16-91Z', '#d7c8a5', '#8d826d', 1.5),
    path('M-22-70-22-51-14-40-6-44 0-33 11-42 22-62 20-72 10-68 0-64-11-67Z', '#d5d0b8', '#8f917e', 1),
    line('M-16-63-12-49M-6-62-1-44M6-61 6-45M15-65 14-51', '#a5a592', 1.2),
    path('M-27-82-22-99-5-126 12-137 21-129 10-121 12-112 25-83 13-79-2-83-16-79Z', wash('#ae8b76', '#80685f', -137, -79), '#6b615b', 1.6),
    path('M-19-91-6-114 10-130 13-127 3-114 7-100-3-86Z', '#c2a18a', undefined, 0, .7),
    line('M-20-83Q-6-88 4-83T23-84M-17-28-15-45M17-26 14-40', '#d0c5a5', 1.2),
    ellipse(0, -70, 5.5, 4.5, '#dbc3a0', '#a18e74', 1),
    ...(eyes ? [ellipse(-10, -76, 3.6, 3.4, '#353545'), ellipse(10, -77, 3.5, 3.4, '#353545'), ellipse(-11, -77, 1, 1, '#eee6cd'), ellipse(9, -78, 1, 1, '#eee6cd')] : []),
    line('M-7-61Q0-55 9-64', '#5d5a53', 1.8),
    ...(fresh ? [] : [group([path('M-27-25q8-8 11-2l-4 6ZM17-19q-2-10 5-8l5 7Z', '#879462')], 0, 0, 1, 0, 'weathering')]),
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

/** The same named cast as the game, drawn with ink and coloured paper. Clothes follow the scene. */
export type IllustrationPerson = 'elof' | 'moa' | 'bertil' | 'mamma' | 'pappa' | 'mormor' | 'morfar';
export interface PersonOptions {
  arm?: 'up' | 'out' | 'none';
  left?: boolean;
  rain?: boolean;
  bootOff?: boolean;
  pack?: boolean;
  memory?: 'indoors' | 'outdoors';
  seated?: boolean;
  pose?: 'camera' | 'carve' | 'support' | 'offer';
  crown?: boolean;
}
const FAMILY = {
  elof: { hair: '#e2c07a', shade: '#b48f4e', light: '#f6e2a8', skin: '#f8d2b6', eyes: '#5b96d2', top: '#a6bfe6', legs: '#34548e', shoe: '#8d5e36', pack: '#7b7142', coat: '#f2d43c', boot: '#8d5e36' },
  moa: { hair: '#e6c066', shade: '#c79a48', light: '#f4dc92', skin: '#f6ceb2', eyes: '#9a7c44', top: '#7f9cc0', legs: '#f4e7a8', shoe: '#f6f2ee', pack: '#8f3c38', coat: '#e2b23a', boot: '#c8423a' },
  bertil: { hair: '#7a5434', shade: '#5a3c24', light: '#96704a', skin: '#f4caac', eyes: '#8a5e34', top: '#e9e8e4', legs: '#3c3e44', shoe: '#ecebe6', pack: '#71684a', coat: '#e0782e', boot: '#2f6b3a' },
  mamma: { hair: '#d8b070', shade: '#b08a4e', light: '#efd59a', skin: '#f0c2a0', eyes: '#7aa884', top: '#242429', legs: '#5c5f38', shoe: '#7d5a3c', pack: '#8a4a3a', coat: '#b8423a', boot: '#2c3a2c' },
  pappa: { hair: '#6b5a48', shade: '#4d4034', light: '#8a7864', skin: '#efc4a4', eyes: '#8a6238', top: '#222226', legs: '#8ea9c6', shoe: '#6f5a44', pack: '#5f6238', coat: '#2e4a66', boot: '#1f2124' },
  mormor: { hair: '#e4e1d8', shade: '#aaa99f', light: '#fff9e8', skin: '#edc5a5', eyes: '#738483', top: '#a7c2d3', legs: '#344a64', shoe: '#595451', pack: '#8a4a3a', coat: '#a7c2d3', boot: '#595451' },
  morfar: { hair: '#deddd6', shade: '#a3a69f', light: '#fff9e8', skin: '#e8bea0', eyes: '#7d8d91', top: '#283d56', legs: '#85878a', shoe: '#54504c', pack: '#5f6238', coat: '#283d56', boot: '#54504c' },
} as const;
function person(who: IllustrationPerson, options: PersonOptions = {}): Art {
  const p = FAMILY[who], adult = ['pappa','mamma','mormor','morfar'].includes(who), rain = options.rain === true;
  const toddler = who === 'elof' && options.memory !== undefined, pyjamas = toddler && options.memory === 'indoors', jacket = toddler && !pyjamas;
  const shirt = rain ? p.coat : jacket ? '#87b4d4' : p.top, arm = options.arm ?? 'none';
  const carriesPack = options.pack && ['elof','moa','mamma','pappa'].includes(who);
  const bare = !rain && who === 'mamma', short = !rain && (who === 'pappa' || who === 'bertil' || who === 'mormor' || who === 'elof' && !toddler);
  const sleeve = bare ? p.skin : shirt, boots = rain && who !== 'elof', shoes = pyjamas ? '#e7dcc9' : boots ? p.boot : p.shoe;
  const head: Art[] = [
    path('M-22-99Q-24-117-6-122Q14-126 24-106L24-86 17-73 2-68-15-74-23-86Z', wash('#f9d9b8', p.skin, -123, -69), I, 1.3),
    ellipse(-23, -89, 4, 6, p.skin), ellipse(24, -89, 4, 6, p.skin),
    ...(who === 'moa' || who === 'mamma' ? [
      path('M-24-98Q-29-121-8-125Q18-131 27-106L22-92Q16-105 3-115Q-12-104-22-91Z', p.hair, p.shade, 1.4),
      line('M2-121Q-14-115-20-101M5-121Q18-116 23-103', p.light, 2),
    ] : who === 'mormor' ? [path('M-25-94Q-31-108-22-119Q-14-128-3-124Q9-132 20-121Q31-116 25-95L19-94Q15-105 5-109Q-4-98-16-101L-20-92Z',p.hair,p.shade,1.3),line('M-21-111Q-14-119-4-116M2-121Q16-120 21-109M-12-109Q-3-108 1-114',p.light,2)] : [path(who === 'elof' ? 'M-24-99Q-28-109-17-117Q-19-126-7-122Q-1-133 7-122Q19-128 19-115Q28-111 26-99L17-104 12-112Q7-105 3-109L-1-115-8-106-14-112-18-102Z' : 'M-24-99-23-115-10-124 10-124 23-113 26-99 16-103 10-112 1-106-8-113-18-103Z', p.hair, p.shade, 1.2),
      ...(who === 'elof' ? [line('M-16-115-9-118M1-121 6-114M15-116 18-109', p.light, 2)] : [])]),
    ...[-9, 10].flatMap(x => [ellipse(x, -91, 3.4, 4.1, '#fff9e9'), ellipse(x+.4, -91, 2.1, 3, p.eyes), ellipse(x+.6, -91, 1, 2, '#332d2c'), ellipse(x, -92.3, .65, .85, '#fffdf1')]),
    line('M-14-99-6-101M6-101 14-100', p.shade, who === 'pappa' ? 2.4 : 1.4),
    line('M0-90-2-84 3-83', '#bc896b', 1.1),
    ellipse(-15, -81, 4.5, 2.3, '#e7aa95'), ellipse(16, -81, 4.5, 2.3, '#e7aa95'),
    ...(who === 'bertil' || who === 'moa' ? [-17,-13,-9,10,14,18].map((x,i) => ellipse(x,-84+i%2*2,.75,.8,'#a9794d')) : []),
    ...(who === 'pappa' ? [
      path('M-18-82Q-14-72 1-69Q17-72 21-83L17-76 10-72-10-74Z', p.shade, undefined, 0, .48),
      line('M-18-96h15v11h-15zM5-96h15v11H5zM-3-92H5M-23-94-18-93M20-93 24-95', '#26262b', 2),
    ] : []),
    ...(who === 'mormor' ? [line('M-19-96q7-3 15 0v10q-8 4-15 0zM5-96q7-3 15 0v10q-8 4-15 0zM-4-92H5', '#34373b', 2)] : []),
    ...(who === 'morfar' ? [line('M-18-116h14v8h-14zM5-116h14v8H5zM-4-112H5', '#4d5258', 1.6), path('M-21-114Q-25-124-14-120Q-15-132-3-125Q5-136 8-124Q20-131 21-117Z', p.hair, p.shade, 1)] : []),
    line('M-6-77Q2-71 10-79', I, 1.5),
    ...(who === 'bertil' ? [path('M-7-78Q2-74 11-79L8-74-1-73Z', '#fff5e6', I, .8)] : []),
    ...(who === 'pappa' ? [path('M-26-111Q-20-130 2-128Q21-128 25-112L40-107 37-102 9-106-25-105Z', '#2a2c32', '#1d1f24', 1.5), line('M-2-125 1-112M-22-109 18-108', '#64626a', 1)] : []),
    ...(who === 'bertil' ? [path('M-26-111Q-20-131 2-129Q23-127 27-112L39-106 36-101 8-105-25-105Z', '#c8242c', '#7f302f', 1.4), path('M-22-111-20-122Q0-133 20-122L23-109Z', '#f4f2ee', '#bfaaa0', .8),
      // The approved cap's gold wings, tilted blue shield and white diagonal band stay legible at story size.
      path('M-5-122Q-4-114 2-111Q8-114 9-122L7-121Q6-116 2-114Q-2-117-3-121Z', '#d8a823'),
      path('M-1-122 6-124 8-119 4-114 0-117Z', '#28297a', '#d8a823', .85), path('M0-120 7-122 7-120 1-118Z', '#f3f1e8') ] : []),
    ...(jacket ? [path('M-27-110Q-16-128 7-124L26-113 34-108 31-104 3-107-26-105Z', '#8c978b', '#57665f', 1.3), line('M3-122 7-110M-19-109 20-108', '#c3cbba', 1)] : []),
    ...(options.crown ? [path('M-27-110-28-128-16-119-9-135 2-121 13-135 21-118 29-128 26-109Z', '#ebc25d', '#9b783f', 1.5)] : []),
  ];
  const raised = group([
    path(arm === 'up' ? 'M18-67 29-78 31-99 38-98 37-74 24-57Z' : 'M18-65 30-53 45-59 50-52 29-42 18-51Z', sleeve, I, 1.4),
    ...(short ? [path(arm === 'up' ? 'M28-79 31-99 38-98 36-76Z' : 'M29-53 45-59 50-52 30-43Z', p.skin, I, 1)] : []),
    ellipse(arm === 'up' ? 35 : 49, arm === 'up' ? -102 : -56, 4.4, 5, p.skin, I, 1),
  ]); raised.flip = options.left;
  const resting = (flip = false): Layer => ({ ...group([path('M-18-69-25-52-25-37-18-36-14-55Z', sleeve, I, 1.4), ...(short ? [path('M-25-52-25-37-18-36-16-51Z', p.skin, I, 1)] : []), ellipse(-21,-34,4.4,5,p.skin,I,1)]), flip });
  return group([
    ...(options.seated ? [] : [shadow(0, 1, 28)]),
    ...(carriesPack ? [path('M-19-69Q-37-74-34-43L-27-35-15-37Z', p.pack, I, 1.3), path('M-31-67-18-65-16-52-32-54Z', p.pack, '#c4ad79', 1)] : []),
    ...(who === 'moa' ? [path('M-22-101Q-33-93-28-81Q-35-72-26-64Q-31-55-19-53L-14-72 15-72 20-53Q33-55 28-66Q37-76 28-83Q34-96 23-104Z', p.hair, p.shade, 1.4)] : []),
    ...(options.seated ? [] : [path('M-16-40-18-9-10-3-3-5 0-31 5-31 8-5 17-3 22-8 17-41Z', who === 'moa' || who === 'pappa' && !rain ? p.skin : pyjamas ? '#a6bfe6' : p.legs, I, 1.5),
    ...(who === 'pappa' && !rain ? [path('M-20-44H20L21-23H4L0-31-4-23H-21Z', p.legs, I, 1.4), line('M-19-25H-5M5-25H19M0-42V-31', '#bfd1df', 2)] : []),
    ...(boots ? [path('M-18-25H-4L-5-4H-20ZM7-25H21L22-4H8Z', shoes, I, 1)] : []),
    path('M-19-9-27-3-26 2-6 2-3-5M8-5 7 2H29L27-4 19-9Z', shoes, I, 1.4),
    line('M-24 0H-7M10 0H27', '#453e39', 1),
    ...(!boots && (who === 'elof' || who === 'mamma') ? [line('M-17-12-5-11M8-11 19-12', who === 'elof' ? '#6488bc' : '#85855a', 3), line('M-18-5-11-4M13-4 21-5', '#d8bd8c', 1)] : []),
    ...(!rain && who === 'bertil' ? [line('M-24-2-9-2M11-2H26', '#c8242c', 2)] : []),
    ...(boots && options.bootOff ? [path('M7-25H21L22-4H8Z','#d9d2c2',I,1),path('M8-5 7 2H29L27-4 19-9Z','#d9d2c2',I,1.4),line('M9-22H20','#b4ad9d',2)] : []),
    ...(pyjamas ? [-13,-8,11,16].map(x => line(`M${x}-31V-12`, '#dbe6f2', 1.7)) : []),
    ]),
    ...(options.pose ? [] : arm === 'none' ? [resting(),resting(true)] : [resting(options.left === true), raised]),
    path(rain ? 'M-17-68Q0-75 17-68L22-24Q0-17-22-24Z' : 'M-17-67Q0-74 17-67L19-38Q0-32-19-38Z', shirt, I, 1.5),
    ...(rain ? [path('M-18-65Q-31-79-12-80H13Q30-79 19-65L11-69-11-69Z', p.coat, I, 1), line('M0-68V-24M-15-37-7-35M8-35 16-37', '#e6d8af', 1.2)] : jacket ? [path('M-13-68-6-71 0-64 7-71 14-68 8-59 0-64-7-59Z', '#accddd', '#5f859e', 1), line('M0-62V-37M-15-46H-6M7-46H16', '#e1dfc3', 1.5)] : who === 'elof' ? [
      ...[-12,-6,1,8,14].map(x => line(`M${x}-66V-39`, '#dbe6f2', 1.6)),
      path('M-14-67-7-70 0-63 8-70 15-67 8-59 0-63-7-59Z', '#c8d8f2', '#6d86ae', .8), line('M0-61V-38', '#768daa', 1),
      path('M-14-57H-4V-49H-14ZM5-57H15V-49H5Z', '#aec4e2', '#6d86ae', .8),
      ...[-58,-49,-41].map(y => ellipse(1,y,1,1,'#8a6a46')),
    ] : who === 'moa' ? [
      path('M-11-68H11L23-24Q12-19 0-22Q-12-19-23-24Z', '#f4e7a8', '#b8a672', 1),
      line('M-17-37Q0-32 17-37M-21-27Q0-22 21-27', '#e0cf8a', 2),
      path('M-17-68-7-70-9-45-20-43ZM8-70 17-68 21-43 10-45Z', '#7f9cc0', '#516c91', 1.2),
      line('M-13-59-11-50M13-59 14-50', '#b2cadf', 1),
    ] : who === 'bertil' ? [path('M-14-67-7-70 0-63 8-70 15-67 8-59 0-63-7-59Z', '#fff8e9', '#bcbab4', .8), line('M0-61V-39M6-57H15V-50H6Z', '#bcbab4', 1), ...[-57,-49,-41].map(y => ellipse(1,y,.8,.8,'#8e8b85'))] : who === 'mormor' ? [ ...[-55,-44].flatMap(y => [-11,0,11].map(x => path(`M${x} ${y-3}l3 3-3 3-3-3Z`, '#496b89'))), line('M-10-69Q0-61 10-69', '#e7e0d1', 1.5)] : who === 'morfar' ? [path('M-18-58H18V-47H-18Z', '#9fbfce'), ...[-12,0,12].map(x => path(`M${x} -58l6 5-6 6-6-6Z`, '#d1e0e4', '#688da5', .7))] : who === 'mamma' ? [path('M-13-70Q0-56 13-70L11-74Q0-64-11-74Z', p.skin), line('M-16-58-15-43M16-58 16-43', '#5c5656', 1)] : [line('M-11-69Q0-62 11-69', '#65616a', 1.5)]),
    ...(options.pose ? [
      path(options.pose === 'offer' ? 'M-18-65-37-39-55-37-56-30-33-31-12-57M18-65 25-50 25-36 18-35 14-53' : options.pose === 'camera' ? 'M-18-65-29-72-22-91-15-89-19-74-12-66M18-65 26-73 20-90 13-88 17-73 12-66' : options.pose === 'carve' ? 'M-18-66-31-51-52-54-53-47-28-43-12-58M18-65 9-48-27-51-28-44 13-40 25-61' : 'M-18-65-31-54-35-72-42-70-38-44-28-43-12-59M18-65 31-54 35-72 42-70 38-44 28-43 12-59', p.skin, I, 1.4),
      path('M-17-69-24-58-13-53-8-66M16-69 25-61 15-54 8-66', shirt, I, 1.2),
      ...(options.pose === 'camera' ? [ellipse(-18,-91,4,4,p.skin,I,1),ellipse(16,-90,4,4,p.skin,I,1)] : []),
    ] : []),
    ...(carriesPack ? [line('M-16-68-12-42M16-68 14-44', '#68543b', 3)] : []),
    path('M-5-76V-67Q0-62 6-67V-77Z', p.skin),
    group(head, 0, adult ? -8 : toddler ? 3 : 0, adult ? .87 : toddler ? 1.04 : 1),
    ...(who === 'mamma' ? [
      path('M-17-95Q-27-79-19-69L-14-48', 'none', p.shade, 8),
      ...Array.from({ length: 7 },(_,i)=>ellipse(-19+(i%2?2:-1),-76+i*4.4,4.1,3.2,i%2?p.hair:p.light,p.shade,.8)),
      path('M-17-48-21-40-12-41-13-48Z', p.hair, p.shade, 1), line('M-19-48H-12', '#9e4d3c', 2),
    ] : []),
  ], 0, 0, 1, 0, `person-${who}${rain ? '-rain' : toddler ? '-toddler-' + options.memory : ''}`);
}

/** Klonk is a little pale carved ghost with two separate wooden shoes. */
function klonk(): Art { return group([
  shadow(0,1,22), path('M-18-9-22 0H-4L-3-10M5-10 6 0H25L20-10', '#8b7053', I, 1.3),
  path('M-23-14-20-52Q-18-76 0-77Q22-76 23-52L27-14 14-8 2-13-10-8Z', wash('#fff0cc','#d4bf94',-78,-8), '#8c7d64',1.5),
  line('M-13-64-16-22M15-56 18-24', '#c9b386',1), ellipse(-8,-51,3.8,5,'#34313c'),ellipse(9,-52,3.8,5,'#34313c'),
],0,0,1,0,'klonk'); }
function littleCap(): Art { return group([
  path('M-27 10 2-38 18-11 30 14Z','#bc5c54','#7e4948',1.7),
  path('M-27 10Q0 5 30 14L30 21Q0 12-28 17Z','#e8ddc1','#af9c82',1),
  ellipse(2,-39,7,7,'#f4efdf'),line('M-14 3 1-23M-2 5 5-13M11 9 10-6','#e7a080',1),
],0,0,1,0,'little-red-cap'); }
function torch(x:number,y:number): Art { return group([
  path('M-7-3-89 27-75 57-7 3Z','#fff1b1',undefined,0,.16),
  path('M-8-4H8V4H-8Z','#424956',I,1),path('M-11-5H-6V5H-11Z','#d9c39a',I,1),line('M-10-3V3','#fff6c1',2),
],x,y,1,0,'flashlight'); }
function heldPair(cap = false): Art { return group([
  woodenFigure('old', true, false, false),
  // Little lies across the old one's chest; the old hands are painted over its body.
  group([woodenFigure('little')],15,-24,.47,-25),
  path('M-25-58-28-41-4-28 3-33-19-47-18-57M22-58 27-44 26-26 18-26 17-43 15-53', '#838e79','#59665c',1.5),
  ellipse(-1,-30,5.5,4.5,'#c4ad87','#8c7154',1),ellipse(22,-26,5.5,4.5,'#c4ad87','#8c7154',1),
  ...(cap ? [group([littleCap()],-4,-74,.48,-25)] : []),
],0,0,1,0,cap?'held-pair-cap-returned':'held-pair'); }

function scene(key: StoryIllustrationKey): Art[] {
  const sky = [rect(0, 0, 320, 200, wash('#24445f', '#91a4a3')), stars()];
  if (key === 'moa-drawing') return [
    rect(0, 0, 320, 200, PAPER), line('M18 98Q160 90 300 98', '#cbbca2', 1.4),
    group([path('M0-34 8-12 32-11 13 4 20 28 0 14-22 28-15 4-34-11-10-12Z', '#edc664', '#a17743', 2), ellipse(-7, -10, 3, 3, '#fff3be')], 62, 49),
    group([person('elof', { arm: 'out' })], 249, 78, .3),
    group([person('elof', { arm: 'out' })], 250, 193, .71),
    path('M119 46Q150 37 180 50m-14-12 15 12-18 7M119 147Q153 137 184 150m-14-12 15 12-18 7', 'none', '#9b795b', 3),
    path('M27 138 12 126 15 149 12 168 30 157M91 138 108 128 103 148 108 167 91 157', '#d7a94e', '#a87b3f', 2),
    ...[[-16, -9], [0, -15], [16, -9], [-19, 7], [0, 7], [19, 7], [-12, 20], [10, 20]].map(([x,y]) => ellipse(60+x, 145+y, 11, 10, wash('#ffe494', '#d39536', 124, 174), '#b88639', 1)),
    line('M24 107 18 98M92 107 101 100M17 120 8 116M102 119 112 113', '#caa148', 2),
  ];
  if (key === 'window-escape') return [
    ...room(), rect(36,28,89,89,wash('#243a57','#577881',28,117)),
    path('M35 27 3 12V110L35 118ZM126 27 166 13V107L126 118Z','#d1c49d','#544b55',2),
    path('M32 34 9 23V103L32 110ZM130 34 159 25V101L130 110Z','#486477','#d7c59d',2),
    line('M20 27V106M133 69 159 63M9 65 32 72','#d7c59d',2),
    path('M145 18Q171 53 191 59L169 75Q149 53 131 20Z','#b0b6a1','#7b8c80',1.2),
    wind(49), wind(84),
    group([woodenFigure('little')],81,94,.4,-34),
    group([woodenFigure('old')],139,132,.43,-15),
    line('M218 140Q168 151 147 139M162 126 147 139 163 141','#eedcae',2),
    path('M181 154H298V164H181ZM193 164V190M285 164V190','#81614f','#58483e',3),
  ];
  if (key === 'old-window') return [
    ...room(),
    path('M169 115H288V126H169ZM180 125H187V148H180ZM270 125H277V148H270Z','#7c6153','#513f3d',1.5),
    ellipse(224,118,45,8,'#efbe75'),group([woodenFigure('old')],227,112,.65),
    line('M36 45 45 33M46 68 55 56M101 97 110 85M96 54 105 42','#c9ded9',1.3),
    group([ellipse(238,31,34,27,'#e9bc75'),path('M226 40 207 145H279L250 40Z','#f4cc7e',undefined,0,.12),line('M238 0V19','#504952',2),path('M220 39 228 19H249L258 39Z','#7f8c78','#4c5e59',1.5)],-66,0,1,0,'light'),
  ];
  if (key === 'family-breakfast') return [
    ...room(false),ellipse(104,45,12,12,'#fff1bd'),
    rect(185,55,106,7,'#765546'),group([woodenFigure('old')],211,54,.28),group([woodenFigure('little')],263,54,.31),
    group([person('mamma')],33,181,.75),group([person('pappa')],77,181,.78),
    group([person('moa')],118,172,.59),group([person('elof')],155,166,.49),group([person('bertil')],191,173,.6),
    group([person('mormor')],234,181,.7),group([person('morfar')],280,181,.75),
    path('M8 146H313V158H8ZM23 158V195M297 158V195','#7c5b4c','#584940',3),
    ellipse(159,147,145,8,'#d6ba8a'),
    ...[33,76,118,155,191,234,279].map(x=>group([path('M-6 0H6V8Q0 11-6 8Z','#f6d8ac','#745d4d',1),line('M6 2Q14-1 11 6L6 7','#d9b98d',2),line('M-2-4Q-6-9-2-13','#fff0d0',1.2,.6)],x,140)),
    group([path('M-6-29Q0-35 6-29V0H-6Z','#6c9784','#416557',1.5),rect(-6,-33,12,5,'#c2c4a6')],212,142),
  ];
  if (key === 'family-lamps') return [
    ...sky,...hills(true),water(115),
    path('M0 154Q51 137 86 139L118 121 208 129 320 113V158Q237 167 155 155T0 177Z','#49665f'),
    path('M0 166Q68 148 129 151T320 148L320 166Q242 183 154 168T0 184Z','#728c75'),
    group([person('pappa',{rain:true})],119,151,.76), group([person('mamma',{rain:true})],179,148,.73),
    group([person('bertil',{rain:true,bootOff:true})],230,150,.59),group([person('moa',{rain:true})],275,148,.58),
    torch(103,125),torch(164,123),torch(218,130),torch(263,129),
    group([person('elof',{rain:true,arm:'up'})],59,179,.17),group([klonk()],79,179,.2),
    line('M43 183q14-4 28 0m-23 7h17','#efd59c',2,.7),spruce(12,163,134),spruce(344,162,145),
  ];
  if (key === 'small-figure') return [
    ...room(), ellipse(174, 174, 90, 10, '#6a5550'),
    group([woodenFigure('little')], 141, 169, 1.05),
    group([littleCap()],232,154,.85,25),
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
  if (key === 'northbound' || key === 'forest-trail' || key === 'wind-posts') return [
    ...sky, ...hills(true),
    ellipse(242, 41, 25, 25, '#d9ddbc'),
    ...(key === 'northbound' || key === 'forest-trail' ? [
      ...(key === 'northbound' ? [
      path('M0 155 44 135H121V190H0Z', '#8d5960'), path('M-7 136 43 108 133 133 121 143 43 120 0 145Z', '#475d65'),
      line('M15 151H111M15 165H111M28 142V183M57 142V183M87 142V183', '#ae7d76', 1.5),
      path('M151 190V151H205V187M151 151 164 143H218V178L205 187M164 143V181M151 160H205M151 170H205M163 151V189M177 151V189M191 151V188', 'none', '#e4e0ca', 2),
      line('M5 193Q85 172 145 193M218 194H310','#cad2ba',1.5),
      ] : [spruce(46,190,181),spruce(100,174,155,true),spruce(294,190,179),meadow(164)]),
      group([woodenFigure('old')],129,181,.33,-8),
      spruce(310,196,111),
    ] : [
      water(133), path('M0 181 320 151V178L0 200Z', '#ad936c', '#675f58', 2),
      ...[36, 104, 172].flatMap((x,i) => [path(`M${x} 196l${-5+i*2}-102 10-2 7 102Z`, '#d9bd86', '#675f58', 2), line(`M${x+4} 103l2 75`, '#f0d7a2', 1.2)]),
      line('M40 105Q99 123 110 102Q162 122 179 99', '#a8bab2', 2),
      group([person('elof',{rain:true})],77,184,.37,-9),group([klonk()],133,181,.48,-8),
    ]),
    wind(70), wind(104),
    group([ellipse(0, -44, 39, 51, '#fff4c5'), woodenFigure('little')], 220, 134, .64, -28),
    line('M148 72 163 63M152 91 168 84M235 40 244 31', '#f9e9b8', 2),
  ];
  if (key === 'raft' || key === 'outlet-pair' || key === 'old-stone' || key === 'safe-harbour' || key === 'cap-return') return [
    ...sky, ...hills(true), spruce(25, 143, 129), spruce(296, 145, 137), water(129),
    ...(key === 'raft' ? [
      path('M51 158 127 140 246 162 167 188Z', '#9e825f', '#594f49', 2),
      ...[0, 1, 2, 3, 4].map(i => path(`M${56+i*21} ${158+i*5}l75-18 18 3-76 19Z`, i%2 ? '#c3a577' : '#b49669', '#6c5c4d', 1)),
      line('M87 153 193 175M107 148 215 170', '#e4ce98', 2),
      group([person('elof',{rain:true})],127,161,.43),group([klonk()],177,168,.53),
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
      group([key === 'old-stone' ? woodenFigure('old') : heldPair(key === 'cap-return')],158,163,key === 'old-stone' ? .55 : .77),
      ...(key === 'cap-return' ? [group([person('elof',{rain:true,arm:'out',left:true})],222,164,.43)] : []),
      ellipse(175, 175, 7, 3, GOLD),
      line('M15 190q18-6 40 0M263 181q21-5 43 0', '#d9dabc', 2),
    ]),
    group([line('M8 199 14 157M18 200 26 168M303 199 299 160', '#a7b58c', 2), path('M11 173q-13-8-9-13q10 2 9 13M302 178q15-12 16-6q-7 10-16 6', '#9bac7c')], 0, 0, 1, 0, 'breeze'),
  ];
  return [];
}

// The build embeds some drawings in HTML templates; the browser later evaluates this module again.
// Their call orders differ, so a fresh numeric counter alone can accidentally reuse a portrait's gradient
// for an album scene. Keep those two document-wide ID namespaces separate.
const paintScope = typeof document === 'undefined' ? 'printed' : 'live';
let serial = 0;
function svgArt(art: Art, prefix: string, defs: string[]): string {
  const opacity = art.opacity === undefined ? '' : ` opacity="${art.opacity}"`;
  const tag = art.tag ? ` data-illustration-part="${art.tag}"` : '';
  if ('children' in art) return `<g transform="translate(${art.x ?? 0} ${art.y ?? 0}) scale(${(art.scale ?? 1) * (art.flip ? -1 : 1)} ${art.scale ?? 1}) rotate(${art.rotate ?? 0})"${opacity}${tag}>${art.children.map(a => svgArt(a, prefix, defs)).join('')}</g>`;
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
  const defs: string[] = [], body = svgArt(art, `story-art-${paintScope}-${serial++}`, defs);
  return `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}`;
}
function paint(c: CanvasRenderingContext2D, art: Art): void {
  c.save();
  if (art.opacity !== undefined) c.globalAlpha *= art.opacity;
  if ('children' in art) {
    c.translate(art.x ?? 0, art.y ?? 0); c.scale((art.scale ?? 1) * (art.flip ? -1 : 1), art.scale ?? 1); c.rotate((art.rotate ?? 0) * Math.PI / 180);
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
export function carvingArt(kind: 'old' | 'little', x: number, y: number, height: number, eyes = true, fresh = false): string {
  return `<g class="${kind === 'old' ? 'tragubbe' : 'lillgubbe'}">${fragment(group([woodenFigure(kind, eyes, fresh)], x, y, height / (kind === 'old' ? 138 : 106)))}</g>`;
}
export function storyPerson(who: IllustrationPerson, x: number, y: number, height: number, options: PersonOptions = {}, lean = 0): string {
  return fragment(group([person(who, options)], x, y, height / 131, lean));
}
/** Shared HUD and choice portraits crop the same head, hair and clothes as the larger drawings. */
export function storyPortrait(who: IllustrationPerson): string {
  return fragment(group([person(who)], 34, 110, .82));
}
export function storySpruce(x: number, y: number, height: number, far = false): string { return fragment(spruce(x, y, height, far)); }
export function storyPine(x: number, y: number, scale = 1): string { return fragment(pine(x, y, scale)); }

/** Three-year-old Elof sits around Pappa's neck; both boots are supported and the toy stays in his hand. */
export function storyShoulderCarry(x: number, y: number, height: number, childHeight: number): string {
  const child = childHeight / height, handX = 35 * child, handY = -94 - 102 * child;
  return fragment(group([
    group([person('elof', { memory: 'outdoors', arm: 'up', seated: true })], 0, -94, child),
    person('pappa', { pack: true, pose: 'support' }),
    path('M-4-113-22-101-28-74-36-76-30-104-13-118ZM4-113 22-101 28-74 36-76 30-104 13-118Z', '#34548e', I, 1.4),
    path('M-36-78-42-73-42-68-26-68-26-75M26-75 26-68H42V-73L36-78', '#8d5e36', I, 1.3),
    ellipse(-35, -71, 4, 4, '#efc4a4', I, 1), ellipse(35, -71, 4, 4, '#efc4a4', I, 1),
    group([woodenFigure('old', true, true)], handX+2, handY+8, child*.42, -7, 'held-carving'),
    ellipse(handX, handY, child*4.4, child*5, '#f8d2b6', I, .8),
  ], x, y, height / 131, 0, 'shoulder-carry'));
}
