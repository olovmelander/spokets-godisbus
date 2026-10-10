import { describe, expect, it } from 'vitest';
import { COURSES, STORY } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';
import { GLOW_FROM, GLOW_ON_HIGH } from '../../src/render/grade';

describe('the places', () => {
  it('every chapter that names a place names one that has a look', () => {
    for (const chapter of Object.values(COURSES)) {
      if (chapter.place !== undefined) expect(PLACES[chapter.place], `${chapter.id}: ${chapter.place}`).toBeDefined();
    }
  });

  it('every chapter of the story is dressed, each as its own place; the test course stays greybox', () => {
    expect(STORY.map((chapter) => chapter.place)).toEqual(['home', 'garden', 'forest', 'bog', 'mountain', 'dusk', 'home']);
    expect(COURSES['garden']!.place).toBe('garden');
    expect(COURSES['look-deck']!.place).toBe('garden');
    expect(COURSES['granskog']!.place).toBe('forest');
    expect(COURSES['look-forest']!.place).toBe('forest');
    expect(COURSES['testbana']!.place).toBeUndefined();
  });

  it('what a chapter marks for the picture lies along its own ground', () => {
    for (const chapter of Object.values(COURSES)) {
      const from = chapter.ground[0]!.x - 16;
      const to = chapter.ground[chapter.ground.length - 1]!.x + 16;
      const marked = chapter.surfaces ?? [];
      for (const [i, s] of marked.entries()) {
        expect(s.to, `${chapter.id}: a stretch of ${s.kind}`).toBeGreaterThan(s.from);
        expect(s.from).toBeGreaterThanOrEqual(from);
        expect(s.to).toBeLessThanOrEqual(to);
        // In order, and never one over another.
        if (i > 0) expect(s.from).toBeGreaterThanOrEqual(marked[i - 1]!.to);
      }
      for (const roof of chapter.roofs ?? []) {
        expect(roof.to).toBeGreaterThan(roof.from);
        // Overhead: above every hook and above him wherever he stands under it.
        for (const hook of chapter.hooks ?? []) if (hook.x > roof.from && hook.x < roof.to) expect(roof.y, `${chapter.id}: the hook at ${hook.x}`).toBeGreaterThan(hook.y + 1);
      }
      if (chapter.house) for (const x of chapter.house.windows) expect(x > chapter.house.from && x < chapter.house.to, `${chapter.id}: the window at ${x}`).toBe(true);
    }
  });

  it('keeps the glow of High gentle: only what is nearly white spills, and never as much as it shines', () => {
    expect(GLOW_FROM).toBeGreaterThanOrEqual(0.6);
    expect(GLOW_ON_HIGH).toBeGreaterThan(0);
    // Sixteen samples at 0.075 and 0.05 add up to one: at full strength the spill would equal the light itself.
    expect(GLOW_ON_HIGH).toBeLessThanOrEqual(0.75);
  });

  it('each look keeps its grade gentle: nothing a child would read as a filter', () => {
    for (const [id, look] of Object.entries(PLACES)) {
      expect(look.grade.vignette, id).toBeLessThanOrEqual(0.4);
      expect(look.grade.grain, id).toBeLessThanOrEqual(0.04);
      expect(look.grade.contrast, id).toBeLessThanOrEqual(1.15);
      // The haze begins behind the play plane: he and what is near him stay clear.
      expect(look.haze.near, id).toBeGreaterThan(0);
    }
  });

  it('draws him as a boy among small things at home, and as small as the ghost in between', () => {
    const sized = Object.fromEntries(STORY.map((part) => [part.id, part.size]));
    // The prologue's scene animates the change before small becomes permanent. The finale restores his size.
    expect(sized['prolog']).toEqual({ scale: 3, until: 'scene:poff' });
    expect(sized['norrsken']).toEqual({ scale: 3, after: 'taste' });
    expect(sized['epilog']).toEqual({ scale: 3 });
    for (const id of ['garden', 'granskog', 'myren', 'berget']) expect(sized[id], id).toBeUndefined();
    // The flags he changes size on are ones the chapter can set.
    for (const part of STORY) {
      for (const flag of [part.size?.after, part.size?.until]) {
        if (flag !== undefined) expect((part.spots ?? []).some((s) => s.id === flag)
          || (part.scenes ?? []).some((scene) => `scene:${scene.id}` === flag), `${part.id}: ${flag}`).toBe(true);
      }
    }
  });

  it("shows the empty place on Pappa's shelf in the prologue, and the first trägubbe back on it in the epilogue", () => {
    expect(COURSES['prolog']!.shelf).toBeDefined();
    expect(COURSES['prolog']!.shelf!.filled).toBeUndefined();
    expect(COURSES['epilog']!.shelf!.filled).toBe(true);
    // The Saturday bag stands on the table beside the ghost until the ghost takes it.
    expect(COURSES['prolog']!.decor).toContainEqual({ look: 'bag', at: { x: 7.1, y: 1.65 }, until: 'grab', z: -1.25 });
  });

  it('keeps the picture wide while he is big', () => {
    for (const id of ['prolog', 'epilog']) {
      const part = COURSES[id]!;
      const zone = part.cameras!.find((z) => part.spawn.x >= z.from && part.spawn.x < z.to);
      expect(zone?.zoom, id).toBeGreaterThanOrEqual(1.4);
    }
  });
});
