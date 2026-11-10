import { describe, expect, it } from 'vitest';
import { carvingArt, storyIllustration, type StoryIllustrationKey } from '../../src/ui/story-illustrations';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { thoughtAt, thoughtIllustrationKey } from '../../src/render/ghost-thought';
import { MEMORIES } from '../../src/ui/memory-art';
import { strokeHtml } from '../../src/ui/story-stroke';

describe('illustrated memories keep their story and their wooden friends', () => {
  it('does not reveal the old figure in the distant mountain or the unidentified crack clue', () => {
    for (const key of ['mountain', 'pine-crack'] as const) expect(storyIllustration(key)).not.toContain('old-carving');
    expect(storyIllustration('lonely-hollow')).toContain('old-carving');
  });
  it('gives the named second-adventure moments different, reusable compositions', () => {
    const pairs = [['stormgard','lonely-figure','old-window'], ['stormskog','pine-crack','lonely-hollow'], ['olympia','small-figure','northbound'], ['flarken','small-figure','wind-posts'], ['alven','small-figure','raft']] as const;
    const pictures = pairs.map(([chapter, hint, key]) => { expect(thoughtIllustrationKey(chapter, hint)).toBe(key); return storyIllustration(key); });
    expect(new Set(pictures).size).toBe(5);
    for (const key of ['old-window', 'lonely-hollow', 'northbound', 'wind-posts', 'raft', 'outlet-pair', 'safe-harbour', 'family-lamps'] satisfies StoryIllustrationKey[]) {
      const svg = storyIllustration(key); expect(svg).toContain('viewBox="0 0 320 200"'); expect(svg).not.toMatch(/<image|<text|https?:|data:image|private\//);
    }
    expect(storyIllustration('raft')).toContain('little-carving');
    expect(storyIllustration('raft')).not.toContain('old-carving');
    for (const key of ['outlet-pair', 'safe-harbour', 'family-breakfast'] as const) { expect(storyIllustration(key)).toContain('old-carving'); expect(storyIllustration(key)).toContain('little-carving'); }
  });
  it('does not reveal the destination or reunion ahead of its dialogue', () => {
    expect(thoughtIllustrationKey('stormbyn', 'small-figure')).toBe('small-figure');
    expect(storyIllustration('small-figure')).toContain('little-carving');
    expect(thoughtIllustrationKey('billsta', 'small-figure')).toBe('old-stone');
    expect(storyIllustration('old-stone')).not.toContain('little-carving');
    expect(thoughtIllustrationKey('billsta', 'small-figure', new Set(['bi:landed']))).toBe('safe-harbour');
  });
  it('leaves witnessed river/lookout pictures at safe reading places after Klonk hops onward', () => {
    for (const chapter of [alven, billsta]) {
      const clue = chapter.thoughtClues![0];
      const player = { x: clue.at.x, y: clue.at.y - .5 };
      expect(thoughtAt(chapter, null, new Set(), player)).toBeNull();
      expect(thoughtAt(chapter, null, new Set([clue.after]), player)).toBe('small-figure');
      expect(thoughtAt(chapter, null, new Set([clue.after]), { ...player, x: player.x+5 })).toBeNull();
    }
  });
  it('uses the same old cap/beard silhouette in every childhood memory, and the distinct bare linden figure when carving', () => {
    for (const pages of Object.values(MEMORIES)) expect(pages.at(-1)).toContain('old-carving');
    expect(carvingArt('little', 160, 180, 100)).toContain('little-carving');
    expect(carvingArt('little', 160, 180, 100)).not.toContain('old-carving');
    expect(strokeHtml).toContain('little-carving');
    expect(strokeHtml).toContain('id="paintEye0" cx="116" cy="86"'); expect(strokeHtml).toContain('id="paintEye1" cx="204" cy="86"');
  });
});
