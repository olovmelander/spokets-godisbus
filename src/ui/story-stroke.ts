import { lessMotion } from '../platform/motion';
import { sv } from '../content/sv';
import type { StoryAction, StoryAnswer } from '../sim/story';
import { use } from './icons';
import { carveStrokeProgress, eyeCentres, finishEyeStroke, guidedCarve, guidedEye, validCarveStroke, type StrokePoint } from '../sim/story-stroke';

/** Moa's brush for the painting, Pappa's knife for the carving. */
const BRUSH = use('brush');
const KNIFE = use('knife');

export const strokeHtml = `<div id="strokeBody" hidden>
  <svg id="strokePicture" viewBox="0 0 320 220" role="img" aria-label="${sv.painting.picture}">
    <g id="paintingPicture">
    <use id="paintGhost" href="#i-paint-ghost" x="0" y="-70" width="320" height="290"/>
    <path id="paintShape" d="M101 136Q75 116 79 76Q86 17 165 17Q244 22 245 78Q245 119 220 136L239 190l-45 8-31-32-31 36-40-14z" fill="#d8b276" stroke="#906a40" stroke-width="4"/>
    <circle id="paintEye0" cx="116" cy="86" r="21" fill="#373031" opacity=".15"/>
    <circle id="paintEye1" cx="204" cy="86" r="21" fill="#373031" opacity=".15"/>
    <circle id="strokeGuide" cx="116" cy="86" r="22" fill="none" stroke="#fff8dc" stroke-width="5" stroke-dasharray="5 5"/>
    <circle id="strokeStart" cx="116" cy="64" r="9" fill="#f5ce52" stroke="#563f28" stroke-width="2"/>
    </g>
    <g id="carvingPicture" visibility="hidden">
      <path d="M83 180L112 81l101-47 69 42-22 104z" fill="#d8b276" stroke="#906a40" stroke-width="3"/>
      <path id="carveFacet1" d="M83 180l48-69-19-30z" fill="#f0ce95"/>
      <path id="carveFacet2" d="M213 34l-24 54 71 92 22-104z" fill="#bd915c"/>
      <path id="carveFacet3" d="M131 111l58-23 37 75-30 17-42-4z" fill="#efcb8d"/>
      <path id="carveNotch1" class="notch" d="M136.9 69.4 147.7 64.4 146.5 76Z"/>
      <path id="carveNotch2" class="notch" d="M162.1 57.7 173 52.6 171.8 64.2Z"/>
      <path id="carveNotch3" class="notch" d="M187.4 45.9 198.2 40.9 197 52.5Z"/>
      <use href="#i-carving-hands" width="320" height="220"/>
      <path d="M106 148L244 70m-30 1 30-1-15 27" fill="none" stroke="#fff9dc" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="100" cy="150" r="11" fill="#f5ce52" stroke="#563f28" stroke-width="2"/>
    </g>
    <path id="strokeLine" fill="none" stroke="#373031" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <button type="button" class="wide" id="strokeAssist">${BRUSH}<span>${sv.painting.assist}</span></button>
</div>`;

export function createStrokeUI(doc: Document, done: (answer: StoryAnswer) => boolean) {
  const svg = doc.getElementById('strokePicture') as unknown as SVGSVGElement;
  const line = doc.getElementById('strokeLine')!;
  const assist = doc.getElementById('strokeAssist') as HTMLButtonElement;
  const status = doc.getElementById('storyStatus')!;
  let action: StoryAction | null = null, pointer: number | null = null;
  let points: StrokePoint[] = [], traces: StrokePoint[][] = [];
  let generation = 0, busy = false, rejected = false;
  const centre = () => eyeCentres(action?.spot ?? '')[traces.length] ?? 116;
  const draw = (path: readonly StrokePoint[]) => line.setAttribute('d', path.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
  function showEye(): void {
    doc.getElementById('strokeGuide')!.setAttribute('cx', String(centre()));
    doc.getElementById('strokeStart')!.setAttribute('cx', String(centre()));
    doc.getElementById('paintEye0')!.setAttribute('opacity', centre() === 204 ? '1' : '.15');
    doc.getElementById('paintEye1')!.setAttribute('opacity', '.15');
    draw([]);
  }
  function complete(path: StrokePoint[]): void {
    if (!action || busy) return;
    const ticket = generation;
    busy = true;
    assist.disabled = true;
    draw(path);
    // A fade, so it stays with less motion too; there the lesson goes on at once.
    const calm = lessMotion(doc);
    line.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 350 });
    window.setTimeout(() => {
      if (ticket !== generation || !action) return;
      busy = false;
      assist.disabled = false;
      if (action.kind === 'carve') {
        if (!done({ kind: 'carve', stroke: path })) draw([]);
      }
      else {
        traces.push(path);
        if (traces.length === eyeCentres(action.spot).length) {
          if (!done({ kind: 'paint', traces })) { traces = []; showEye(); }
        }
        else { showEye(); assist.focus(); }
      }
    }, calm ? 0 : 350);
  }
  function location(event: PointerEvent): StrokePoint {
    const p = svg.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  }
  svg.addEventListener('pointerdown', (event) => {
    if (!action || busy || pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    svg.setPointerCapture(pointer);
    points = [location(event)];
    rejected = false;
    draw(action.kind === 'carve' ? [] : points);
  });
  svg.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer || busy) return;
    if (points.length < 511) points.push(location(event));
    if (action?.kind === 'carve') {
      const progress = carveStrokeProgress(points);
      if (progress === null) rejected = true;
      if (rejected) { status.textContent = sv.carving.tryAgain; draw([]); return; }
      if ((progress ?? 0) < .03) return;
    }
    draw(points);
  });
  function release(event: PointerEvent): void {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (event.type === 'pointerup') {
      points.push(location(event));
      const carving = action?.kind === 'carve';
      const finished = carving ? !rejected && validCarveStroke(points) ? points : null : finishEyeStroke(points, centre());
      if (finished) complete(finished);
      else { status.textContent = carving ? sv.carving.tryAgain : sv.painting.tryAgain; draw([]); }
    } else draw([]);
    points = [];
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(name, release as EventListener);
  assist.addEventListener('click', () => complete(action?.kind === 'carve' ? guidedCarve() : guidedEye(centre())));
  function cancel(): void {
    generation++; action = null; busy = false; points = [];
    const captured = pointer;
    pointer = null;
    if (captured !== null && svg.hasPointerCapture(captured)) svg.releasePointerCapture(captured);
    assist.disabled = false;
  }
  return {
    show(next: StoryAction) {
      cancel(); action = next; traces = [];
      const carving = next.kind === 'carve';
      // Pappa's ghost is drawn whole, its head above the rings; Elof's own figure and the carving fit the box as it is.
      const ghost = !carving && next.spot !== 'dots';
      svg.setAttribute('viewBox', ghost ? '0 -70 320 290' : '0 0 320 220');
      svg.classList.toggle('carving', carving);
      doc.getElementById('paintingPicture')!.setAttribute('visibility', carving ? 'hidden' : 'visible');
      doc.getElementById('carvingPicture')!.setAttribute('visibility', carving ? 'visible' : 'hidden');
      // A child's own visibility would show through its hidden group: each says so for itself.
      doc.getElementById('paintGhost')!.setAttribute('visibility', ghost ? 'visible' : 'hidden');
      doc.getElementById('paintShape')!.setAttribute('visibility', !carving && !ghost ? 'visible' : 'hidden');
      svg.setAttribute('aria-label', carving ? sv.carving.picture : next.spot === 'dots' ? sv.painting.figurePicture : sv.painting.picture);
      assist.innerHTML = carving ? `${KNIFE}<span>${sv.carving.assist}</span>` : `${BRUSH}<span>${sv.painting.assist}</span>`;
      if (carving) {
        // How far the carving has come is cut into the block: a notch for each stroke (story-presentation.md row 18).
        // The words are for a screen reader.
        const step = Number(next.spot.slice(-1));
        for (let n = 1; n <= 3; n++) {
          doc.getElementById(`carveFacet${n}`)!.setAttribute('opacity', n < step ? '1' : '.2');
          doc.getElementById(`carveNotch${n}`)!.classList.toggle('done', n < step);
        }
        svg.setAttribute('aria-label', `${sv.carving.picture} ${sv.carving.step.replace('{step}', String(step))}`);
        status.textContent = '';
        draw([]);
      } else showEye();
      assist.focus();
    },
    /** Discard the unfinished gesture when the page or GL context is interrupted. */
    interrupt() {
      const pending = action;
      cancel();
      action = pending;
      traces = [];
      if (action?.kind === 'carve') draw([]);
      else if (action) showEye();
    },
    cancel,
  };
}
