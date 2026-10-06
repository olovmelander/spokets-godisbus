/**
 * The edges of a bubble said in a tone (src/content/tones.ts): a burst for a shout, a wavering line for a worry and a
 * cloud for a thought, each drawn round the bubble's paper in the speaker's colour; a thought trails three small
 * rings down towards Elof. One set in every bubble, the right one shown by its `data-tone` (ui.css).
 */
const BURST = 'M8 7 16 1 24 7 32 1 40 7 48 1 56 7 64 1 72 7 80 1 88 7 96 1 104 7 112 1 120 7 128 1 136 7 144 1 152 7 160 1 168 7 176 1 184 7 192 1 199 13.5 193 20 199 26.5 193 33 199 39.5 193 46 199 52.5 184 59 176 53 168 59 160 53 152 59 144 53 136 59 128 53 120 59 112 53 104 59 96 53 88 59 80 53 72 59 64 53 56 59 48 53 40 59 32 53 24 59 16 53 8 59 1 46.5 7 40 1 33.5 7 27 1 20.5 7 14 1 7.5Z';
const WAVER = 'M6 5Q13.83 7.6 21.67 5Q29.5 2.4 37.33 5Q45.17 7.6 53 5Q60.83 2.4 68.67 5Q76.5 7.6 84.33 5Q92.17 2.4 100 5Q107.83 7.6 115.67 5Q123.5 2.4 131.33 5Q139.17 7.6 147 5Q154.83 2.4 162.67 5Q170.5 7.6 178.33 5Q186.17 2.4 194 5Q191.8 11.25 194 17.5Q196.2 23.75 194 30Q191.8 36.25 194 42.5Q196.2 48.75 194 55Q186.17 52.4 178.33 55Q170.5 57.6 162.67 55Q154.83 52.4 147 55Q139.17 57.6 131.33 55Q123.5 52.4 115.67 55Q107.83 57.6 100 55Q92.17 52.4 84.33 55Q76.5 57.6 68.67 55Q60.83 52.4 53 55Q45.17 57.6 37.33 55Q29.5 52.4 21.67 55Q13.83 57.6 6 55Q8.2 48.75 6 42.5Q3.8 36.25 6 30Q8.2 23.75 6 17.5Q3.8 11.25 6 5Z';
const CLOUD = `M10 9${'a9 7 0 0 1 18 0'.repeat(10)}${'a7 7 0 0 1 0 14'.repeat(3)}${'a9 7 0 0 1 -18 0'.repeat(10)}${'a7 7 0 0 1 0 -14'.repeat(3)}Z`;

export const toneEdgesHtml = `<svg class="tone-edge" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path class="edge-call" d="${BURST}"/><path class="edge-worry" d="${WAVER}"/><path class="edge-think" d="${CLOUD}"/></svg><svg class="think-rings" viewBox="0 0 34 30" aria-hidden="true"><circle cx="24" cy="6" r="5"/><circle cx="15" cy="16" r="3.6"/><circle cx="8" cy="24.5" r="2.4"/></svg>`;
