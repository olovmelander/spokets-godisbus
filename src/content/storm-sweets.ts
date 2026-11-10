/** Original sweet silhouettes, shared by the sugar models and their album stickers. */
export interface StormSweet {
  chapter: string; colour: string; mark: string;
  outline: readonly (readonly [number, number])[];
  detail: 'ribs' | 'dots' | 'swirl' | 'segments';
}
const round = (n: number, radius = 1): [number, number][] => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * radius, Math.sin(i / n * Math.PI * 2) * radius]);
const star = Array.from({ length: 10 }, (_, i) => [Math.cos(i * Math.PI / 5 + Math.PI / 2) * (i % 2 ? .46 : 1), Math.sin(i * Math.PI / 5 + Math.PI / 2) * (i % 2 ? .46 : 1)] as const);
export const STORM_SWEETS: Record<string, StormSweet> = {
  lingonhjarta: { chapter: 'stormgard', colour: '#d64664', mark: '#ffa6b2', outline: [[0,-.9],[-.82,.03],[-.94,.48],[-.68,.86],[-.28,.9],[0,.56],[.28,.9],[.68,.86],[.94,.48],[.82,.03]], detail: 'ribs' },
  blabarspastill: { chapter: 'stormskog', colour: '#6563bb', mark: '#bcb5ee', outline: round(24), detail: 'dots' },
  citronstjarna: { chapter: 'stormbyn', colour: '#f0cf45', mark: '#fff4af', outline: star, detail: 'ribs' },
  fotbollspralin: { chapter: 'olympia', colour: '#f6ead8', mark: '#7c4a32', outline: round(20), detail: 'segments' },
  apelsinklyfta: { chapter: 'flarken', colour: '#ed973d', mark: '#ffe0a1', outline: [[-1,.42], ...Array.from({ length: 17 }, (_, i) => [Math.cos(Math.PI + i * Math.PI / 16), Math.sin(Math.PI + i * Math.PI / 16) + .42] as const)], detail: 'segments' },
  mintfisk: { chapter: 'alven', colour: '#65bfa8', mark: '#d0fff0', outline: [[-1,-.65],[-.57,-.28],[-.26,-.63],[.35,-.59],[.87,-.25],[1,0],[.87,.25],[.35,.59],[-.26,.63],[-.57,.28],[-1,.65],[-.88,0]], detail: 'ribs' },
  kolaknapp: { chapter: 'billsta', colour: '#b97a4c', mark: '#f3d5a4', outline: round(24), detail: 'dots' },
  norrskensruta: { chapter: 'stormoga', colour: '#64a5b9', mark: '#d5efba', outline: [[0,-1],[-.9,0],[0,1],[.9,0]], detail: 'swirl' },
};

export function stormSticker(kind: string): string | null {
  const sweet = STORM_SWEETS[kind];
  if (!sweet) return null;
  const points = sweet.outline.map(([x, y]) => `${22 + x * 17},${22 - y * 17}`).join(' ');
  const marks = kind === 'apelsinklyfta'
    ? '<path d="M22 15 9 19M22 15 14 28M22 15v17M22 15 30 28M22 15 35 19" fill="none" stroke-width="2"/>'
    : sweet.detail === 'dots'
    ? '<circle cx="17" cy="17" r="2.2"/><circle cx="27" cy="17" r="2.2"/><circle cx="17" cy="27" r="2.2"/><circle cx="27" cy="27" r="2.2"/>'
    : sweet.detail === 'segments'
      ? '<path d="M22 22 13 9M22 22 32 10M22 22 37 26M22 22 22 36M22 22 7 26" fill="none" stroke-width="2.2"/><path d="m22 15 7 5-3 8h-8l-3-8z" stroke-width="1"/>'
      : sweet.detail === 'swirl'
        ? '<path d="M12 25q8-15 17-6t-12 9q-3-5 5-5" fill="none" stroke-width="3"/>'
        : '<path d="M13 18q9-6 17 0M15 25q8-4 15 0" fill="none" stroke-width="2.8"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><defs><clipPath id="cut-${kind}"><polygon points="${points}"/></clipPath></defs><polygon points="${points}" fill="${sweet.colour}" stroke="#704e3c" stroke-width="1.3" stroke-linejoin="round"/><g clip-path="url(#cut-${kind})" fill="${sweet.mark}" stroke="${sweet.mark}" stroke-linecap="round">${marks}</g><path clip-path="url(#cut-${kind})" d="M12 15q4-5 9-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".65"/></svg>`;
}
