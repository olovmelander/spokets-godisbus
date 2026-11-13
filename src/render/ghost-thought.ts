import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { GhostState } from '../sim/sim';
import type { ChapterData, GhostPerch, Vec } from '../sim/types';
import { drawnWhile } from './idle';
import { paintStoryIllustration, type StoryIllustrationKey } from '../ui/story-illustrations';

type Picture = NonNullable<GhostPerch['thought']>['picture'];
const WIDTH = 512, HEIGHT = 384;
const CARD_WIDTH = 3.15, CARD_HEIGHT = CARD_WIDTH * HEIGHT / WIDTH;

/** Thoughts belong to a settled, nearby story stop, never a later chapter or a travelling ghost. */
export function thoughtAt(chapter: ChapterData, ghost: GhostState | null, flags: ReadonlySet<string>, player: Vec): Picture | null {
  const clue = chapter.thoughtClues?.find((clue) => flags.has(clue.after) && Math.hypot(clue.at.x - player.x, clue.at.y - player.y) <= 3);
  if (clue) return clue.picture;
  if (!ghost || ghost.gone || ghost.t < 1 || Math.hypot(ghost.x - player.x, ghost.y - player.y) > 5.5) return null;
  const thought = chapter.ghost?.[ghost.perch]?.thought;
  if (!thought || (thought.after !== undefined && !flags.has(thought.after)) || (thought.until !== undefined && flags.has(thought.until))) return null;
  return thought.picture;
}

/** Each remembered place has its own composition. A1's distant mountain still conceals the lost friend. */
export function thoughtIllustrationKey(chapter: string, picture: Picture, flags: ReadonlySet<string> = new Set()): StoryIllustrationKey {
  const chapterArt: Record<string, StoryIllustrationKey> = {
    stormgard: 'old-window', stormskog: 'lonely-hollow', stormbyn: 'small-figure',
    olympia: 'northbound', flarken: 'wind-posts', alven: 'raft', billsta: flags.has('bi:landed') ? 'safe-harbour' : 'old-stone',
  };
  return chapterArt[chapter] ?? ({ mountain: 'mountain', 'pine-crack': 'pine-crack',
    'lonely-figure': 'lonely-hollow', 'small-figure': 'vittror' } satisfies Record<Picture, StoryIllustrationKey>)[picture];
}
function drawPicture(c: CanvasRenderingContext2D, key: StoryIllustrationKey): void {
  c.save(); c.scale(1.6, 1.6);
  // A larger painted page, with a quiet paper edge, keeps the face and the landscape readable on a phone.
  c.fillStyle = '#fff3d4'; c.strokeStyle = '#8d7965'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(8, 5, 304, 207, 16); c.fill(); c.stroke();
  c.save(); c.beginPath(); c.roundRect(15, 12, 290, 193, 10); c.clip();
  c.translate(15, 12); c.scale(290 / 320, 193 / 200); paintStoryIllustration(c, key); c.restore();
  c.fillStyle = '#fff3d4';
  c.beginPath(); c.ellipse(149, 223, 9, 6, -.35, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(159, 236, 4, 3, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** One static canvas atlas and one card per chapter. Updates only transform, UV offset and opacity. */
export function createGhostThought(chapter: ChapterData) {
  const pictures = [...new Set([
    ...(chapter.ghost ?? []).flatMap((perch) => perch.thought ? [perch.thought.picture] : []),
    ...(chapter.thoughtClues ?? []).map((clue) => clue.picture),
  ])];
  if (!pictures.length) return null;
  const artworks = [...new Set(pictures.map(picture => thoughtIllustrationKey(chapter.id, picture)))];
  if (chapter.id === 'billsta') artworks.push('safe-harbour');
  const canvas = document.createElement('canvas'); canvas.width = WIDTH * artworks.length; canvas.height = HEIGHT;
  const c = canvas.getContext('2d')!;
  artworks.forEach((key, i) => { c.save(); c.translate(i * WIDTH, 0); drawPicture(c, key); c.restore(); });
  const texture = new CanvasTexture(canvas);
  texture.name = 'ghost-thought-pictures'; texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false; texture.minFilter = LinearFilter; texture.magFilter = LinearFilter;
  texture.repeat.x = 1 / artworks.length;
  // A thought is a readable overlay anchored above its story source; a roof or foreground reed must not mask it.
  // Drawn over the finished frame (./over-frame.ts) in the picture's own sRGB colours, as the memories show them.
  const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), material);
  mesh.name = 'ghost-thought'; mesh.renderOrder = 20;
  mesh.userData.illustrations = artworks;
  // Keep its shader in the chapter's initial warmup, including when progress has not unlocked it. Until it is
  // thought it is out of the picture (./idle.ts), and drawn by the warm-up alone.
  mesh.scale.setScalar(0);
  drawnWhile(mesh, false);
  const point = new Vector3();
  let shown = 0, current: StoryIllustrationKey | null = null;
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
      if (picture !== null) current = thoughtIllustrationKey(chapter.id, picture, flags);
      if (current) texture.offset.x = artworks.indexOf(current) / artworks.length;
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
