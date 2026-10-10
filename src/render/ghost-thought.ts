import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { GhostState } from '../sim/sim';
import type { ChapterData, GhostPerch, Vec } from '../sim/types';
import { drawnWhile } from './idle';

type Picture = NonNullable<GhostPerch['thought']>['picture'];
const WIDTH = 256, HEIGHT = 192;
const CARD_WIDTH = 2.6, CARD_HEIGHT = CARD_WIDTH * HEIGHT / WIDTH;

/** Thoughts belong to a settled, nearby story stop, never a later chapter or a travelling ghost. */
export function thoughtAt(chapter: ChapterData, ghost: GhostState | null, flags: ReadonlySet<string>, player: Vec): Picture | null {
  const clue = chapter.thoughtClues?.find((clue) => flags.has(clue.after) && Math.hypot(clue.at.x - player.x, clue.at.y - player.y) <= 3);
  if (clue) return clue.picture;
  if (!ghost || ghost.gone || ghost.t < 1 || Math.hypot(ghost.x - player.x, ghost.y - player.y) > 5.5) return null;
  const thought = chapter.ghost?.[ghost.perch]?.thought;
  if (!thought || (thought.after !== undefined && !flags.has(thought.after)) || (thought.until !== undefined && flags.has(thought.until))) return null;
  return thought.picture;
}

/** Symbolic drawings, like the garden's smudge: no likeness, text, model or downloaded image. */
function drawPicture(c: CanvasRenderingContext2D, picture: Picture): void {
  if (picture === 'small-figure') {
    // A little paper picture left with the vittror's thank-you, rather than a thought from an absent ghost.
    c.fillStyle = '#fff6e2'; c.strokeStyle = '#92734f'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(35, 10, 186, 146, 13); c.fill(); c.stroke();
    c.fillStyle = '#decfb3'; c.beginPath(); c.moveTo(190, 10); c.lineTo(221, 40); c.lineTo(190, 40); c.closePath(); c.fill();
    c.save(); c.fillStyle = '#75634f';
    c.beginPath(); c.moveTo(99, 105); c.lineTo(151, 105); c.lineTo(161, 141); c.lineTo(91, 141); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(127, 89, 21, 23, -0.12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(103, 75); c.lineTo(132, 32); c.lineTo(147, 79); c.closePath(); c.fill();
    c.restore();
    // The trail of pale paper leads visibly down to the keepsake at the doorway, not to the chase ghost.
    c.fillStyle = '#fff6e2'; c.beginPath(); c.ellipse(128, 174, 7, 5, 0, 0, Math.PI * 2); c.fill();
    return;
  }
  c.fillStyle = '#fff6e2';
  c.strokeStyle = '#92734f'; c.lineWidth = 3;
  c.beginPath(); c.ellipse(128, 77, 117, 70, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(111, 161, 10, 7, -0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(126, 181, 5, 4, 0, 0, Math.PI * 2); c.fill();
  c.save();
  c.beginPath(); c.ellipse(128, 77, 105, 59, 0, 0, Math.PI * 2); c.clip();
  // A warm paper rim and cool sky separate the destination from the scenery behind the bubble.
  const sky = c.createLinearGradient(0, 18, 0, 136);
  sky.addColorStop(0, '#a7c6d7'); sky.addColorStop(1, '#f4e2b7');
  c.fillStyle = sky; c.fillRect(20, 15, 216, 124);
  c.fillStyle = '#fff4ca'; c.beginPath(); c.arc(192, 42, 15, 0, Math.PI * 2); c.fill();
  // Kapitel 2 can point the way, but cannot reveal what is lost there yet.
  c.fillStyle = '#8b8172';
  c.beginPath(); c.moveTo(23, 126); c.lineTo(90, 31); c.lineTo(125, 70);
  c.lineTo(149, 48); c.lineTo(235, 126); c.closePath(); c.fill();
  c.fillStyle = '#f7f0df';
  c.beginPath(); c.moveTo(72, 57); c.lineTo(90, 31); c.lineTo(112, 56); c.lineTo(94, 49); c.lineTo(87, 55); c.closePath(); c.fill();
  c.fillStyle = '#bca486';
  c.beginPath(); c.moveTo(90, 31); c.lineTo(125, 70); c.lineTo(162, 126); c.lineTo(107, 103); c.closePath(); c.fill();
  if (picture !== 'mountain') {
    // From Kapitel 3 the old pine and the crack are unmistakable, the thing inside is still grey.
    c.strokeStyle = '#5f6d57'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(160, 99); c.lineTo(157, 72); c.lineTo(165, 47); c.lineTo(159, 32); c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(159, 71); c.lineTo(143, 57); c.moveTo(162, 56); c.lineTo(182, 45); c.moveTo(162, 45); c.lineTo(148, 38); c.stroke();
    for (const [x, y, rx] of [[145, 52, 15], [179, 41, 17], [151, 33, 13]] as const) {
      c.beginPath(); c.ellipse(x, y, rx, 5, -0.15, 0, Math.PI * 2); c.fillStyle = '#5f6d57'; c.fill();
    }
    c.fillStyle = '#4f4a47';
    c.beginPath(); c.moveTo(61, 116); c.lineTo(99, 92); c.lineTo(128, 120); c.lineTo(122, 144); c.lineTo(69, 147); c.closePath(); c.fill();
    if (picture === 'pine-crack') {
      c.fillStyle = '#aaa99f';
      c.beginPath(); c.ellipse(101, 117, 8, 11, -0.1, 0, Math.PI * 2); c.fill();
    } else {
      // A pointed cap, a round head and a crooked smile: the first figure, alone, without restored eyes.
      c.fillStyle = '#b4b1a4';
      c.beginPath(); c.moveTo(83, 112); c.lineTo(116, 112); c.lineTo(120, 136); c.lineTo(79, 136); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(101, 101, 13, 13, -0.13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#aaa796';
      c.beginPath(); c.moveTo(85, 94); c.lineTo(103, 65); c.lineTo(112, 95); c.closePath(); c.fill();
      c.strokeStyle = '#5d5a53'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(95, 106); c.quadraticCurveTo(102, 112, 107, 104); c.stroke();
    }
  }
  c.restore();
}

/** One static canvas atlas and one card per chapter. Updates only transform, UV offset and opacity. */
export function createGhostThought(chapter: ChapterData) {
  const pictures = [...new Set([
    ...(chapter.ghost ?? []).flatMap((perch) => perch.thought ? [perch.thought.picture] : []),
    ...(chapter.thoughtClues ?? []).map((clue) => clue.picture),
  ])];
  if (!pictures.length) return null;
  const canvas = document.createElement('canvas'); canvas.width = WIDTH * pictures.length; canvas.height = HEIGHT;
  const c = canvas.getContext('2d')!;
  pictures.forEach((picture, i) => { c.save(); c.translate(i * WIDTH, 0); drawPicture(c, picture); c.restore(); });
  const texture = new CanvasTexture(canvas);
  texture.name = 'ghost-thought-pictures'; texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false; texture.minFilter = LinearFilter; texture.magFilter = LinearFilter;
  texture.repeat.x = 1 / pictures.length;
  const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const mesh = new Mesh(new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), material);
  mesh.name = 'ghost-thought'; mesh.renderOrder = 20;
  // Keep its shader in the chapter's initial warmup, including when progress has not unlocked it. Until it is
  // thought it is out of the picture (./idle.ts), and drawn by the warm-up alone.
  mesh.scale.setScalar(0);
  drawnWhile(mesh, false);
  const point = new Vector3();
  let shown = 0, current: Picture | null = null;
  return {
    mesh,
    update(ghost: GhostState | null, flags: ReadonlySet<string>, player: Vec, camera: PerspectiveCamera, clock: number, dt: number, calm: boolean, visible: boolean) {
      const clue = chapter.thoughtClues?.find((clue) => flags.has(clue.after) && Math.hypot(clue.at.x - player.x, clue.at.y - player.y) <= 3);
      const picture = clue?.picture ?? (visible ? thoughtAt(chapter, ghost, flags, player) : null);
      const source = clue?.at ?? ghost;
      if (source) point.set(source.x, source.y + 0.5, 0).project(camera);
      const inView = source !== null && source !== undefined && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1;
      const wanted = picture !== null && inView;
      // Paused frames may be redrawn after resizing or changing settings, but the entrance stays frozen.
      if (dt > 0) shown = calm ? (wanted ? 1 : 0) : shown + ((wanted ? 1 : 0) - shown) * (1 - Math.exp(-7 * dt));
      if (picture !== null) current = picture;
      if (current) texture.offset.x = pictures.indexOf(current) / pictures.length;
      // Gate immediately when a story flag clears the picture or the ghost leaves: no lingering spoiler.
      material.opacity = wanted ? shown * 0.96 : 0;
      mesh.scale.setScalar(wanted ? 1 : 0);
      drawnWhile(mesh, material.opacity > 0);
      if (!source) return;
      const halfHeight = (camera.position.z - 0.65) * Math.tan(camera.fov * Math.PI / 360);
      const halfWidth = halfHeight * camera.aspect;
      const clamp = (v: number, centre: number, half: number, size: number) => Math.min(centre + half - size / 2 - 0.1, Math.max(centre - half + size / 2 + 0.1, v));
      mesh.position.set(
        clamp(source.x, camera.position.x, halfWidth, CARD_WIDTH),
        clamp(source.y + 1.95 + (calm ? 0 : Math.sin(clock * 1.3) * 0.035), camera.position.y, halfHeight, CARD_HEIGHT),
        0.65,
      );
    },
    /** The owning chapter holds the card until navigation unloads its scene; tests can release it early. */
    dispose() { mesh.geometry.dispose(); material.dispose(); texture.dispose(); mesh.removeFromParent(); },
  };
}
