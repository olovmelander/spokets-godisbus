import { sv } from '../content/sv';

/**
 * The four memories (plan §2.4, §3.3 rule 5): short, wordless pictures of the family some years ago, which
 * tell the secret before anyone says it. Each plays when Elof touches a glowing curl of shaving.
 *
 * They are drawn here as paper cut-outs in sepia, so that they never read as "now" (plan §5.4). Nobody is
 * drawn as themselves: a big figure with a flat cap is Pappa, a small one in light blue with a spiky fringe
 * is little Elof, and the small figure with the pointed cap is his first trägubbe, which is in every one.
 * The plan's memories are animated scenes with the family's models; these cards stand in for them.
 */
const INK = '#5a3d24';
const MID = '#a37a4c';
const LIGHT = '#dcc091';
const BLUE = '#9cc4e4';
const JELLY = '#d8345a';
const stroke = `fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;

/** A grown-up, as a cut-out: `h` tall, standing on y. A flat cap is Pappa's; a braid is Mamma's. */
function grownUp(x: number, y: number, h: number, mark: 'cap' | 'braid' | 'none' = 'cap', lean = 0): string {
  const r = h * 0.11;
  const head = y - h + r;
  const cap = mark === 'cap' ? `<path d="M${x - r * 1.15} ${head - r * 0.35}a${r * 1.15} ${r * 0.9} 0 0 1 ${r * 2.3} 0l${r * 0.9} ${r * 0.25}h${-r * 3.2}z" fill="${INK}"/>` : '';
  const braid = mark === 'braid' ? `<path d="M${x - r * 0.7} ${head}q${-r * 1.6} ${r * 2} ${-r * 0.6} ${h * 0.42}" ${stroke} stroke-width="5"/>` : '';
  return `<g transform="rotate(${lean} ${x} ${y})"><path d="M${x - h * 0.16} ${y}l${h * 0.04} ${-h * 0.72}q${h * 0.12} ${-h * 0.08} ${h * 0.24} 0l${h * 0.04} ${h * 0.72}z" fill="${MID}"/><circle cx="${x}" cy="${head}" r="${r}" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>${cap}${braid}</g>`;
}

/** Little Elof: small, in light blue, with his spiky fringe. Outdoors he wears a small flat cap as well. */
function littleElof(x: number, y: number, h: number, cap = false, arm: 'up' | 'out' | 'none' = 'none'): string {
  const r = h * 0.2;
  const head = y - h + r;
  const fringe = `<path d="M${x - r} ${head - r * 0.2}l${r * 0.35} ${-r * 0.85}l${r * 0.3} ${r * 0.5}l${r * 0.35} ${-r * 0.75}l${r * 0.3} ${r * 0.55}l${r * 0.4} ${-r * 0.6}l${r * 0.25} ${r * 0.9}z" fill="#e8b93a" stroke="${INK}" stroke-width="1.5"/>`;
  const hat = cap ? `<path d="M${x - r * 1.05} ${head - r * 0.5}a${r * 1.05} ${r * 0.75} 0 0 1 ${r * 2.1} 0l${r * 0.8} ${r * 0.2}h${-r * 2.9}z" fill="${INK}"/>` : '';
  const limb = arm === 'up' ? `<path d="M${x + h * 0.1} ${y - h * 0.5}l${h * 0.16} ${-h * 0.34}" ${stroke}/>` : arm === 'out' ? `<path d="M${x + h * 0.1} ${y - h * 0.48}l${h * 0.3} ${-h * 0.02}" ${stroke}/>` : '';
  return `<path d="M${x - h * 0.2} ${y}l${h * 0.05} ${-h * 0.56}q${h * 0.15} ${-h * 0.08} ${h * 0.3} 0l${h * 0.05} ${h * 0.56}z" fill="${BLUE}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${head}" r="${r}" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>${cap ? hat : ''}${fringe}${limb}`;
}

/** The first trägubbe: a small figure with a pointed cap, and a smile when it is seen close. */
function figure(x: number, y: number, h: number, smile = false): string {
  const face = smile ? `<path d="M${x - h * 0.09} ${y - h * 0.5}q${h * 0.09} ${h * 0.1} ${h * 0.18} 0" ${stroke} stroke-width="2"/><circle cx="${x - h * 0.08}" cy="${y - h * 0.62}" r="${h * 0.025}" fill="${INK}"/><circle cx="${x + h * 0.08}" cy="${y - h * 0.62}" r="${h * 0.025}" fill="${INK}"/>` : '';
  return `<g class="tragubbe"><path d="M${x - h * 0.2} ${y}l${h * 0.04} ${-h * 0.42}h${h * 0.32}l${h * 0.04} ${h * 0.42}z" fill="#c9a877" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y - h * 0.56}" r="${h * 0.19}" fill="#e2c898" stroke="${INK}" stroke-width="2"/><path d="M${x - h * 0.19} ${y - h * 0.66}l${h * 0.19} ${-h * 0.36}l${h * 0.19} ${h * 0.36}z" fill="${MID}" stroke="${INK}" stroke-width="2"/>${face}</g>`;
}

const jelly = (x: number, y: number, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${JELLY}" stroke="${INK}" stroke-width="1.5"/>`;
const ground = (y: number) => `<path d="M0 ${y}h320v${200 - y}h-320z" fill="${LIGHT}"/><path d="M0 ${y}h320" ${stroke}/>`;
const spruce = (x: number, y: number, h: number) => `<path d="M${x - h * 0.28} ${y}l${h * 0.28} ${-h}l${h * 0.28} ${h}z" fill="${MID}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
const pine = (x: number, y: number) => `<path d="M${x} ${y}q-6 -40 4 -78" ${stroke} stroke-width="6"/><path d="M${x - 34} ${y - 76}q36 -30 76 -4q-30 8 -40 10q-20 4 -36 -6z" fill="${MID}" stroke="${INK}" stroke-width="2"/>`;
const mountain = (x: number, y: number, w: number, h: number) => `<path d="M${x - w / 2} ${y}l${w * 0.34} ${-h}l${w * 0.14} ${h * 0.3}l${w * 0.1} ${-h * 0.16}l${w * 0.42} ${h * 0.86}z" fill="${MID}" opacity="0.55"/>`;
const camera = (x: number, y: number) => `<rect x="${x - 9}" y="${y - 7}" width="18" height="13" rx="2" fill="${INK}"/><circle cx="${x}" cy="${y}" r="3.5" fill="${LIGHT}"/>`;
const frame = (inside: string) => `<svg viewBox="0 0 320 200" aria-hidden="true">${inside}</svg>`;

/** The pictures of each memory, by the chapter it lies in. */
export const MEMORIES: Record<string, string[]> = {
  // Memory 1: night at the kitchen table. Pappa carves his first figure, and gives it to little Elof.
  garden: [
    frame(`${ground(150)}<rect x="60" y="118" width="200" height="12" rx="3" fill="${MID}" stroke="${INK}" stroke-width="2"/>${grownUp(214, 150, 118)}<path d="M186 104l-26 8" ${stroke}/><path d="M158 110l-12 -8" ${stroke} stroke-width="2"/>${figure(150, 118, 30)}<path d="M132 100l-8 -6m4 14l-10 0m18 -24l-4 -9" ${stroke} stroke-width="2"/>${littleElof(96, 152, 62)}`),
    frame(`${ground(150)}${grownUp(206, 150, 118, 'cap', -6)}<path d="M180 98l-34 14" ${stroke}/>${figure(138, 124, 30, true)}${littleElof(100, 150, 70, false, 'out')}`),
    frame(`<circle cx="118" cy="104" r="64" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><path d="M56 92l22 -54l18 30l22 -46l18 34l26 -40l16 58z" fill="#e8b93a" stroke="${INK}" stroke-width="2.5"/><circle cx="98" cy="108" r="5" fill="${INK}"/><circle cx="140" cy="108" r="5" fill="${INK}"/><path d="M100 132q20 16 40 0" ${stroke}/><path d="M60 170q58 -22 116 0v30h-116z" fill="${BLUE}" stroke="${INK}" stroke-width="2.5"/>${figure(232, 182, 96, true)}`),
  ],
  // Memory 2: an autumn walk. He sets the figure on a stump, and shares his Saturday sweets with it.
  granskog: [
    frame(`${ground(156)}${spruce(40, 156, 120)}${spruce(92, 156, 90)}${spruce(272, 156, 130)}${grownUp(222, 156, 104)}${littleElof(150, 156, 60, true, 'out')}${figure(176, 126, 20)}`),
    frame(`${ground(156)}${spruce(286, 156, 120)}<path d="M176 156v-30h44v30" fill="${MID}" stroke="${INK}" stroke-width="2.5"/><path d="M172 126h52" ${stroke} stroke-width="5"/>${figure(198, 122, 44, true)}${jelly(198, 114, 6)}${littleElof(112, 156, 78, true, 'out')}${jelly(142, 116, 6)}`),
    frame(`${ground(156)}${spruce(26, 156, 130)}<path d="M150 156v-30h44v30" fill="${MID}" stroke="${INK}" stroke-width="2.5"/><path d="M146 126h52" ${stroke} stroke-width="5"/>${figure(172, 122, 44, true)}${jelly(172, 114, 6)}${littleElof(98, 156, 78, true, 'up')}${jelly(124, 96, 6)}${grownUp(256, 156, 110, 'cap', 4)}${camera(228, 92)}`),
  ],
  // Memory 3: the boardwalk over the bog. He rides on Pappa's shoulders, and holds the figure up to see.
  myren: [
    frame(`${mountain(236, 132, 150, 84)}${ground(150)}<path d="M0 140h320" ${stroke} stroke-width="7" stroke="${MID}"/>${littleElof(58, 140, 40, true)}${grownUp(118, 140, 84, 'braid')}${littleElof(142, 140, 50, true)}<path d="M126 104l10 6" ${stroke} stroke-width="2"/>${grownUp(216, 140, 90)}${littleElof(216, 60, 40, true, 'up')}${figure(228, 28, 14)}`),
    frame(`${mountain(250, 150, 170, 96)}${ground(170)}${grownUp(150, 196, 150)}${littleElof(150, 58, 70, true, 'up')}${figure(172, 14, 30, true)}`),
    frame(`${mountain(200, 168, 260, 130)}<path d="M150 62q-4 -18 2 -32m-12 30q18 -12 28 -2" ${stroke} stroke-width="3"/>${ground(168)}${figure(86, 150, 84, true)}`),
  ],
  // Memory 4: the old pine at sunset. A gust, the crack, and the last raspberry jelly at its edge.
  berget: [
    frame(`<circle cx="268" cy="118" r="30" fill="#e8b93a" opacity="0.7"/>${ground(150)}${pine(70, 150)}<path d="M112 150l8 -22h34l8 22z" fill="${MID}" stroke="${INK}" stroke-width="2.5"/>${figure(137, 128, 34, true)}${littleElof(186, 150, 60, true)}${grownUp(250, 150, 106)}${camera(224, 88)}`),
    frame(`${ground(150)}${pine(60, 150)}<path d="M150 150v50h26v-50" fill="#3a2718"/><path d="M90 60h46m-58 16h36m-24 16h52" ${stroke} stroke-width="2.5"/><g transform="rotate(38 162 150)">${figure(162, 150, 32)}</g>${grownUp(232, 150, 106, 'cap', -64)}<path d="M186 142l-14 14" ${stroke}/>`),
    frame(`${ground(150)}${pine(54, 150)}<path d="M150 150v50h26v-50" fill="#3a2718"/>${jelly(186, 144, 7)}${littleElof(228, 150, 70, true, 'up')}<path d="M252 92l8 -8m-2 14l10 -4" ${stroke} stroke-width="2"/>`),
    frame(`<path d="M0 0h320v200h-320z" fill="#4a3320"/><path d="M0 0h320v64h-320z" fill="#8a6a44"/><path d="M118 64q8 70 -6 136h96q-16 -66 -6 -136z" fill="#2a1a10"/><path d="M0 64h118m90 0h112" ${stroke} stroke="${LIGHT}"/>${jelly(108, 57, 6)}<g opacity="0.8">${grownUp(236, 64, 36)}${littleElof(236, 30, 17, true)}</g>${figure(160, 180, 60, true)}`),
  ],
};

export interface Memory {
  readonly open: boolean;
  /** Plays a chapter's memory, picture after picture, and calls `done` when it is over. A tap goes on at once. */
  play(chapter: string, done: () => void): void;
}

/** How long each picture stays, in milliseconds. A memory is six to ten seconds (plan §3.3). */
export const PICTURE_TIME = 2400;

export function createMemory(doc: Document): Memory {
  const back = doc.getElementById('memory') as HTMLElement;
  const card = doc.getElementById('memoryCard') as HTMLElement;
  let open = false;
  let timer = 0;
  return {
    get open() {
      return open;
    },
    play(chapter, done) {
      const pictures = MEMORIES[chapter];
      if (!pictures || open) {
        done();
        return;
      }
      open = true;
      back.hidden = false;
      back.setAttribute('aria-label', sv.memory);
      let at = -1;
      const next = () => {
        window.clearTimeout(timer);
        at++;
        if (at >= pictures.length) {
          open = false;
          back.hidden = true;
          back.onclick = null;
          done();
          return;
        }
        card.innerHTML = pictures[at]!;
        // Each picture fades in anew.
        card.classList.remove('in');
        void card.offsetWidth;
        card.classList.add('in');
        timer = window.setTimeout(next, PICTURE_TIME);
      };
      back.onclick = next;
      next();
    },
  };
}
