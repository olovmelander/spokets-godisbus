import { sv } from '../content/sv';
import type { StoryAction, StoryAnswer } from '../sim/story';
import { eyeCentres, finishEyeStroke, guidedEye, type StrokePoint } from '../sim/story-stroke';

export const strokeHtml = `<div id="strokeBody" hidden>
  <svg id="strokePicture" viewBox="0 0 320 220" role="img" aria-label="${sv.painting.picture}">
    <path d="M62 196V75Q62 15 160 15T258 75v121l-24-16-24 16-24-16-26 16-26-16-24 16-24-16z" fill="#d8b276" stroke="#906a40" stroke-width="4"/>
    <circle id="paintEye0" cx="116" cy="86" r="21" fill="#373031" opacity=".15"/>
    <circle id="paintEye1" cx="204" cy="86" r="21" fill="#373031" opacity=".15"/>
    <circle id="strokeGuide" cx="116" cy="86" r="22" fill="none" stroke="#fff8dc" stroke-width="5" stroke-dasharray="5 5"/>
    <circle id="strokeStart" cx="116" cy="64" r="9" fill="#f5ce52" stroke="#563f28" stroke-width="2"/>
    <path id="strokeLine" fill="none" stroke="#373031" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <button type="button" class="wide" id="strokeAssist">✎ ${sv.painting.assist}</button>
</div>`;

export function createStrokeUI(doc: Document, done: (answer: StoryAnswer) => boolean) {
  const svg = doc.getElementById('strokePicture') as unknown as SVGSVGElement;
  const line = doc.getElementById('strokeLine')!;
  const assist = doc.getElementById('strokeAssist') as HTMLButtonElement;
  const status = doc.getElementById('storyStatus')!;
  let action: StoryAction | null = null, pointer: number | null = null;
  let points: StrokePoint[] = [], traces: StrokePoint[][] = [];
  let generation = 0, busy = false;
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
    const calm = doc.body.classList.contains('calm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm) line.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 350 });
    window.setTimeout(() => {
      if (ticket !== generation || !action) return;
      busy = false;
      assist.disabled = false;
      traces.push(path);
      if (traces.length === eyeCentres(action.spot).length) {
        if (!done({ kind: 'paint', traces })) { traces = []; showEye(); }
      }
      else showEye();
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
    draw(points);
  });
  svg.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer || busy) return;
    if (points.length < 511) points.push(location(event));
    draw(points);
  });
  function release(event: PointerEvent): void {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (event.type === 'pointerup') {
      points.push(location(event));
      const finished = finishEyeStroke(points, centre());
      if (finished) complete(finished);
      else { status.textContent = sv.painting.tryAgain; draw([]); }
    } else draw([]);
    points = [];
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(name, release as EventListener);
  assist.addEventListener('click', () => complete(guidedEye(centre())));
  function cancel(): void {
    generation++; action = null; busy = false; points = [];
    const captured = pointer;
    pointer = null;
    if (captured !== null && svg.hasPointerCapture(captured)) svg.releasePointerCapture(captured);
    assist.disabled = false;
  }
  return {
    show(next: StoryAction) { cancel(); action = next; traces = []; showEye(); assist.focus(); },
    /** Discard only the unfinished gesture when the page or GL context is interrupted. */
    interrupt() {
      const pending = action;
      cancel();
      action = pending;
      traces = [];
      if (action) showEye();
    },
    cancel,
  };
}
