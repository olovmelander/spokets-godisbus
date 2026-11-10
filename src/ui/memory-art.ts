import { carvingArt, storyPerson, storySpruce, storyPine, storyShoulderCarry } from './story-illustrations';
/** The memories are little illustrated theatres: warm paper, a blue shirt and one clear action per page.
 * They remain illustrations rather than likeness assets. The wooden friend never moves by itself. */
const INK = '#543c35';
const stroke = `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
const motion = (kind: string, inside: string) => `<g data-memory-motion="${kind}">${inside}</g>`;
const shadow = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .17}" fill="${INK}" opacity=".15"/>`;

function grownUp(x: number, y: number, h: number, mark: 'cap' | 'braid' = 'cap', lean = 0): string {
  return storyPerson(x, y, h, true, mark === 'cap', 'none', mark === 'braid', lean);
}
function littleElof(x: number, y: number, h: number, cap = false, arm: 'up' | 'out' | 'none' = 'none'): string {
  return storyPerson(x, y, h, false, cap, arm);
}
function figure(x: number, y: number, h: number): string { return carvingArt('old', x, y, h); }
const jelly = (x: number, y: number, r = 5) => `<path d="M${x - r} ${y}q0 ${-r * 1.8} ${r} ${-r}q${r} ${-r * .8} ${r} ${r}q${-r} ${r * 1.6} ${-r * 2} 0z" fill="#d94e62" stroke="#9e3948" stroke-width="1"/><path d="M${x - r * .45} ${y - r * .4}l${r * .35} ${-r * .2}" stroke="#ffcfb2" stroke-width="1.5" stroke-linecap="round"/>`;
const ground = (y: number, color = '#c9ad7b') => `<path d="M0 ${y}q82 -10 160 0t160 0v${200 - y}H0z" fill="${color}"/><path d="M0 ${y + 14}q110 -8 206 3t114 -2M25 189q70 -5 112 0" stroke="#f3ddb1" stroke-width="2" opacity=".45" fill="none"/>`;
const spruce = (x: number, y: number, h: number, color = '#687c67') => motion('breeze', storySpruce(x, y, h, color !== '#687c67'));
const pine = (x: number, y: number) => motion('breeze', storyPine(x, y));
const mountain = (x: number, y: number, w: number, h: number) => `<path d="M${x - w / 2} ${y}l${w * .34} ${-h}l${w * .14} ${h * .3}l${w * .1} ${-h * .16}l${w * .42} ${h * .86}z" fill="#7d8f89"/><path d="M${x - w * .16} ${y - h}l${w * .14} ${h * .3}l${w * .1} ${-h * .16}l${w * .12} ${h * .25}l${-w * .19} ${-h * .04}l${-w * .04} ${h * .18}z" fill="#d2cbae"/>`;
const camera = (x: number, y: number) => `<rect x="${x - 9}" y="${y - 7}" width="18" height="13" rx="3" fill="${INK}"/><circle cx="${x}" cy="${y}" r="4" fill="#dacbb0"/><circle cx="${x}" cy="${y}" r="2" fill="#657c82"/>`;
const stump = (x: number, y: number) => `<path d="M${x - 20} ${y}l3 -31h34l3 31z" fill="#98704f"/><ellipse cx="${x}" cy="${y - 31}" rx="20" ry="5" fill="#efd0a1" stroke="#866445" stroke-width="1.5"/><ellipse cx="${x}" cy="${y - 31}" rx="10" ry="2.5" fill="none" stroke="#b79365"/><path d="M${x - 10} ${y - 25}l-2 20m20 -22 2 24" stroke="#caa06c" stroke-width="2"/>`;
const leaves = () => motion('leaves', '<path d="M48 72q14 -9 15 1q-7 8 -15 -1M255 113q12 -12 16 -3q-4 10 -16 3M110 37q9 -7 11 1q-6 6 -11 -1" fill="#d39a50" opacity=".8"/>');
const room = () => `<rect width="320" height="150" fill="#c5a67e"/><path d="M0 45h320M0 91h320" stroke="#ae8e68" opacity=".45"/><rect x="26" y="25" width="65" height="66" rx="4" fill="#ebcf96"/><rect x="31" y="30" width="55" height="55" rx="2" fill="#53656b"/><circle cx="68" cy="46" r="9" fill="#f9deb0"/><path d="M59 30v55M31 59h55" stroke="#d7b883" stroke-width="3"/><path d="M140 0v27" stroke="#77614b" stroke-width="2"/><path d="M125 38l8 -14h15l9 14z" fill="#7f8a74"/>${motion('light', '<path d="M128 39 81 151h122L153 39z" fill="#ffe7a4" opacity=".32"/>')}${ground(151, '#ac855d')}`;
let sceneId = 0;
function frame(inside: string, mood: 'room' | 'forest' | 'marsh' | 'sunset' | 'crack' = 'forest'): string {
  const id = `memory-paint-${sceneId++}`;
  const skies = { room: ['#e1bd87', '#f6dbac'], forest: ['#b5c3af', '#efd9a7'], marsh: ['#b6cece', '#e9d8ad'], sunset: ['#bd8e89', '#f3c68c'], crack: ['#66594f', '#ac8865'] };
  const [top, bottom] = skies[mood];
  return `<svg viewBox="0 0 320 200" aria-hidden="true" class="memory-illustration"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><filter id="${id}-grain"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="320" height="200" fill="url(#${id})"/>${motion('light', '<circle cx="238" cy="58" r="57" fill="#fff0c0" opacity=".14"/><circle cx="238" cy="58" r="39" fill="#fff2ca" opacity=".16"/>')}${inside}${motion('motes', '<g fill="#fff2c9" opacity=".65"><circle cx="40" cy="114" r="1.5"/><circle cx="127" cy="51" r="1"/><circle cx="273" cy="139" r="1.4"/><circle cx="203" cy="35" r="1.2"/><circle cx="73" cy="151" r="1"/></g>')}<rect width="320" height="200" filter="url(#${id}-grain)" opacity=".09" style="mix-blend-mode:multiply"/><path d="M6 20Q5 6 23 6h274q17 0 17 15v159q0 14 -18 14H24q-18 0 -18 -16z" fill="none" stroke="#fff0c9" stroke-width="1.5" opacity=".38"/></svg>`;
}

/** Each page has one large focal action. Captions live in sv.ts and never reveal a later memory. */
export const MEMORIES: Record<string, string[]> = {
  garden: [
    frame(`${room()}${grownUp(209, 161, 111)}${littleElof(94, 163, 70)}<path d="M67 129h186v10H67zm13 10v37m158 -37v37" fill="#9c6948" stroke="${INK}" stroke-width="3"/>${figure(157, 128, 36)}${motion('carve', `<path d="M193 97l-21 11-14 -3" ${stroke} stroke-width="5"/><path d="M166 108l-14 -8" stroke="#d5dce1" stroke-width="3"/>`)}<path d="M135 125q-8 -5 -8 1t-8 0m56 0q8 -6 12 0" ${stroke} stroke="#eac796" stroke-width="2"/>`, 'room'),
    frame(`${room()}${grownUp(214, 165, 120, 'cap', -4)}${littleElof(101, 165, 82, false, 'out')}${motion('offer', `<path d="M191 100l-32 20-18 -2" ${stroke} stroke-width="6"/>${figure(144, 122, 39)}`)}`, 'room'),
    frame(`${room()}<ellipse cx="158" cy="142" rx="106" ry="76" fill="#efcd8e" opacity=".55"/>${littleElof(120, 194, 163, false, 'out')}${figure(225, 174, 102)}<path d="M185 76q8 -10 15 -3q7 -7 11 1q1 9 -12 16q-13 -6 -14 -14z" fill="#c97564" opacity=".8"/>`, 'room'),
  ],
  granskog: [
    frame(`${spruce(22, 160, 151, '#84927a')}${spruce(283, 160, 167)}${spruce(77, 147, 109, '#9ca487')}${ground(156)}<path d="M30 200q98 -30 188 -39" fill="none" stroke="#e2cba0" stroke-width="25"/>${motion('walk', `${grownUp(224, 158, 108)}${littleElof(135, 168, 73, true, 'out')}${figure(167, 137, 26)}`)}${leaves()}`),
    frame(`${spruce(30, 165, 143)}${spruce(281, 163, 157)}${ground(158)}${stump(204, 165)}${figure(204, 128, 61)}${littleElof(106, 165, 92, true, 'out')}${motion('offer', jelly(153, 117, 7))}${jelly(221, 128, 6)}${leaves()}`),
    frame(`${spruce(19, 169, 161)}${spruce(296, 160, 132, '#899579')}${ground(157)}${stump(175, 162)}${figure(174, 127, 54)}${jelly(193, 126, 6)}${littleElof(104, 168, 91, true, 'up')}${jelly(133, 105, 6)}${grownUp(254, 163, 118, 'cap', -4)}<path d="M237 95l-14 -6" ${stroke} stroke-width="5"/>${camera(219, 88)}${motion('glint', '<path d="M203 82l-8 -5m6 13 -11 1m16 -17 -2 -8" stroke="#fff2c9" stroke-width="2"/>')}`),
  ],
  myren: [
    frame(`${mountain(242, 116, 190, 75)}${ground(139, '#a8ad7e')}<path d="M0 147q68 -25 136 5t184 -8v22H0z" fill="#9bbabc"/><path d="M-5 176 323 151" stroke="#796d55" stroke-width="12"/><path d="M-5 172 323 147" stroke="#dcc49a" stroke-width="6"/>${motion('walk', `${littleElof(53, 165, 45, true)}${grownUp(104, 159, 79, 'braid')}${littleElof(139, 158, 54, true)}${storyShoulderCarry(211, 153, 90, 49)}${figure(231, 55, 23)}`)}<path d="M21 197v-19m3 14 7 -9m251 5v-20m4 17 6 -8" ${stroke} stroke="#748563"/>`, 'marsh'),
    frame(`${mountain(247, 139, 176, 88)}${ground(170, '#a8ad7e')}${storyShoulderCarry(129, 217, 146, 72)}${motion('offer', figure(158, 66, 40))}<path d="M184 57q22 -8 37 -3" ${stroke} stroke="#f8edc5" stroke-width="2"/>`, 'marsh'),
    frame(`${mountain(222, 160, 246, 121)}<g transform="translate(184 40) scale(.16)">${pine(0, 0)}</g>${ground(168, '#a8ad7e')}<path d="M99 192q64 -10 108 -43" fill="none" stroke="#e5cf9c" stroke-width="12"/>${figure(73, 164, 99)}${motion('breeze', '<path d="M140 77q15 -7 29 -2m-20 12q16 -5 29 -1" stroke="#fbefd0" stroke-width="2" fill="none"/>')}`, 'marsh'),
  ],
  berget: [
    frame(`<circle cx="249" cy="67" r="26" fill="#fbe2a6"/>${ground(155, '#b49b7b')}${pine(64, 150)}<path d="M111 157l9 -31h36l12 31z" fill="#8c8a78"/><path d="M122 127h31l8 10-43 2z" fill="#bbb09a"/>${figure(138, 126, 39)}${littleElof(187, 161, 72, true)}${grownUp(255, 156, 112)}${camera(229, 90)}`, 'sunset'),
    frame(`${ground(155, '#b49b7b')}${pine(53, 151)}<path d="M144 157l7 43h33l-5 -46-16 -14z" fill="#51423b"/><path d="M145 158l-16 6m50 -10 20 -6" ${stroke}/>${motion('fall', `<g transform="rotate(30 162 146)">${figure(162, 149, 39)}</g>`)}${littleElof(226, 160, 77, true, 'out')}${motion('wind', '<path d="M65 67q51 -17 95 2m-106 13q54 -7 103 12m-61 9q36 -2 65 12" stroke="#f5dfb8" stroke-width="3" fill="none" stroke-linecap="round"/>')}${leaves()}`, 'sunset'),
    frame(`${ground(155, '#b49b7b')}${pine(50, 151)}<path d="M141 155l10 45h29l-5 -43-16 -13z" fill="#51423b"/>${jelly(189, 153, 9)}${littleElof(229, 166, 93, true, 'out')}<path d="M192 141l-4 -7m13 9 6 -5" stroke="#f9e3ae" stroke-width="2" stroke-linecap="round"/>`, 'sunset'),
    frame(`<path d="M0 77q58 -16 125 0l-17 123H0zm193 -1q73 -12 127 2v122H214z" fill="#9b8065"/><path d="M125 77q11 60 -17 123h106q-28 -76 -21 -124z" fill="#433d36"/><path d="M121 83l-7 26m85 -10 6 33m-13 6 10 38" stroke="#c1a783" stroke-width="2" opacity=".7"/>${jelly(112, 72, 7)}${motion('walk', `<g opacity=".76">${grownUp(259, 74, 45)}${littleElof(238, 75, 29, true)}</g>`)}<path d="M128 78 151 176h44L190 79z" fill="#e9ce90" opacity=".09"/>${figure(163, 184, 67)}${shadow(165, 188, 24)}`, 'crack'),
  ],
};
