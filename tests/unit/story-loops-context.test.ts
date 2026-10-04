import { describe, expect, it } from 'vitest';
import { storyContext, storyHandoff } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import type { Vec } from '../../src/sim/types';

const gardenOpened = ['placed:bridge', 'moa', 'garden:pocket-open'];
const chickHome = ['light', 'chick', 'home'];
const bogBridge = [...chickHome, 'bog:return-bridge', 'placed:bog-boardwalk'];
const mountainPrize = ['lift', 'found:chokladpralin'];
const atPocket = { x: 141.1, y: -2 };
const atSurface = { x: 141.8, y: 3.3 };
const atMoa = { x: 166, y: 0 };
const reminder = (chapter: string, flags: readonly string[], player: Vec,
  history: Readonly<Record<string, readonly string[]>> = {}) => {
  const value = storyContext(chapter, new Set(flags), player, history);
  if (!value) throw new Error(`Expected a story reminder in ${chapter}`);
  return value;
};
const text = (value: ReturnType<typeof reminder>) =>
  `${value.purpose} ${value.recap} ${value.family} ${value.reveal ?? ''}`;
const earlyMystery = /min första trägubbe|min gamla trägubbe.*spricka|välkommen.?hem.kalas|tog godiset för att|välkomna min gamla trägubbe/i;

describe('the garden drawing is a local, optional round trip', () => {
  it('distinguishes calling Moa from actually boarding, without requiring the drawing', () => {
    expect(reminder('garden', ['moa'], atMoa).id).toBe('planeBoard');
    expect(reminder('garden', gardenOpened, atMoa).id).toBe('planeBoard');
    expect(reminder('garden', ['moa', 'plane:board'], { x: 172, y: 4 }).id).toBe('plane');
    expect(reminder('garden', [...gardenOpened, 'plane:board'], atMoa).id).toBe('plane');
  });

  it('offers the opened pocket from the surface, then explains how to find the drawing and climb out', () => {
    const invitation = reminder('garden', gardenOpened, atSurface);
    expect(invitation.id).toBe('gardenPocket');
    expect(invitation.purpose).toMatch(/om jag vill|jag kan|om du vill|vill jag/i);
    expect(reminder('garden', gardenOpened, atPocket).id).toBe('gardenDrawing');
    expect(reminder('garden', [...gardenOpened, 'garden:paper'], atPocket).id).toBe('gardenClimb');
    expect(reminder('garden', [...gardenOpened, 'garden:paper'], { x: 141.8, y: 2.5 }).id).toBe('gardenClimb');
    expect(reminder('garden', [...gardenOpened, 'garden:paper'], atSurface).id).toBe('gardenReturnDrawing');
  });

  it('does not advertise the pocket before it opens or far from the optional route', () => {
    expect(reminder('garden', ['placed:bridge', 'moa'], atPocket).id).toBe('garden');
    for (const player of [{ x: 4.5, y: 6 }, { x: 118.2, y: 0 }]) {
      expect(reminder('garden', gardenOpened, player).id).toBe('garden');
      expect(reminder('garden', [...gardenOpened, 'garden:paper'], player).id).toBe('garden');
    }
  });

  it('remembers the found drawing on return and retires that task after it is shown', () => {
    const found = [...gardenOpened, 'garden:paper'];
    expect(reminder('garden', found, { x: 150, y: 0 }).id).toBe('gardenReturnDrawing');
    expect(reminder('garden', found, { x: 164.1, y: 0 }).id).toBe('gardenReturnDrawing');
    expect(reminder('garden', [...found, 'garden:shared-paper'], atMoa).id).toBe('planeBoard');
    expect(reminder('garden', [...found, 'garden:shared-paper', 'plane:board'], { x: 170, y: 3 }).id).toBe('plane');
  });

  it('lets boarding override unfinished optional errands and only then claims the flight in the handoff', () => {
    expect(reminder('garden', [...gardenOpened, 'garden:paper', 'plane:board'], atPocket).id).toBe('plane');
    const called = storyHandoff('garden', new Set(gardenOpened));
    expect(called).not.toBeNull();
    expect(called).not.toEqual(sv.storyContext.handoffs.garden);
    expect(called!.text).not.toMatch(/plan tar mig till skogen|flyger|flyg/);
    expect(storyHandoff('garden', new Set(['moa', 'plane:board']))).toEqual(sv.storyContext.handoffs.garden);
  });

});

describe('the optional bog return to the clearing requires a bridge that is actually ready', () => {
  it('does not confuse calling for the return bridge with the plank reaching its final stop', () => {
    const onReturn = { x: 151, y: 0.3 };
    expect(reminder('myren', [...chickHome, 'bog:return-bridge'], onReturn).id).toBe('pine');
    expect(reminder('myren', [...chickHome, 'bog:return-bridge', 'bog-boardwalk'], onReturn).id).toBe('pine');
    expect(reminder('myren', bogBridge, onReturn).id).toBe('bogLantern');
    expect(reminder('myren', ['light', 'chick', 'placed:bog-boardwalk'], onReturn).id).toBe('chick');
  });

  it('points to the original clearing, then sends Elof back along the same path without a second lollipop', () => {
    const returning = reminder('myren', bogBridge, { x: 142, y: 0 });
    expect(returning.id).toBe('bogLantern');
    expect(returning.purpose).toMatch(/gläntan/);
    expect(returning.recap).toMatch(/platsen.*hittade.*lysklubban/i);
    const returned = [...bogBridge, 'bog:lantern-return'];
    const atClearing = reminder('myren', returned, { x: 142, y: 0 });
    expect(atClearing.id).toBe('bogReturn');
    expect(atClearing.recap).toMatch(/gläntan/);
    for (const visit of [returning, atClearing]) {
      expect(text(visit)).not.toMatch(/\b(?:hämta|ta)\b[^.!?]*lysklubb/i);
    }
    expect(reminder('myren', returned, { x: 159, y: 0.3 }).id).toBe('bogReturn');
    expect(reminder('myren', returned, { x: 169.2, y: 0 }).id).toBe('pine');
  });

  it('keeps the return hint on the plank and its jumps, away from the higher bonus ledges', () => {
    expect(reminder('myren', bogBridge, { x: 151, y: 0.3 }).id).toBe('bogLantern');
    expect(reminder('myren', bogBridge, { x: 151, y: 1.4 }).id).toBe('bogLantern');
    expect(reminder('myren', bogBridge, { x: 151, y: 1.9 }).id).toBe('pine');
    expect(reminder('myren', bogBridge, { x: 151, y: -2 }).id).toBe('pine');
  });

  it('mentions the optional bridge in its clearing but keeps distant main-route recaps unchanged', () => {
    const ready = reminder('myren', bogBridge, { x: 169.2, y: 0 });
    expect(ready.id).toBe('pine');
    expect(ready.recap).toMatch(/spång|bro|planka/i);
    const returned = reminder('myren', [...bogBridge, 'bog:lantern-return'], { x: 169.2, y: 0 });
    expect(returned.id).toBe('pine');
    expect(returned.recap).toMatch(/tillbaka.*gläntan/i);
    for (const player of [{ x: 83.4, y: 0 }, { x: 190, y: 0 }]) {
      expect(reminder('myren', bogBridge, player).recap).toBe(sv.storyContext.purposes.pine.recap);
      expect(reminder('myren', [...bogBridge, 'bog:lantern-return'], player).recap).toBe(sv.storyContext.purposes.pine.recap);
    }
  });

  it('never makes the optional errand a requirement for the crane flight', () => {
    for (const flags of [[...chickHome, 'crane'], [...bogBridge, 'crane'], [...bogBridge, 'bog:lantern-return', 'crane']]) {
      expect(reminder('myren', flags, { x: 151, y: 0.3 }).id).toBe('crane');
    }
    expect(reminder('myren', chickHome, { x: 180, y: 0 }).id).toBe('pine');
  });
});

describe('the mountain candy has a local way back to the ordinary path', () => {
  it('offers the return only after the existing prize is collected in the high shelves', () => {
    const high = { x: 149, y: 40.9 };
    expect(reminder('berget', ['lift'], high).id).toBe('tall');
    const returnRoute = reminder('berget', mountainPrize, high);
    expect(returnRoute.id).toBe('mountainReturn');
    expect(returnRoute.purpose).toMatch(/snöre|hyll/i);
    // The old discovery receipt is enough; no newly introduced completion flag is needed.
    expect(reminder('berget', ['found:chokladpralin'], high).id).toBe('mountainReturn');
  });

  it('releases the return reminder on descending and outside the shelves', () => {
    expect(reminder('berget', mountainPrize, { x: 149, y: 32.4 }).id).toBe('tall');
    expect(reminder('berget', mountainPrize, { x: 149, y: 31.4 }).id).toBe('tall');
    expect(reminder('berget', mountainPrize, { x: 155, y: 40.9 }).id).toBe('tall');
    expect(reminder('berget', mountainPrize, { x: 138.4, y: 26.4 }).id).toBe('tall');
  });

  it('prioritizes the current descent, then restores the mission learned from the mountain memory', () => {
    const remembered = [...mountainPrize, 'memory'];
    expect(reminder('berget', remembered, { x: 149, y: 40.9 }).id).toBe('mountainReturn');
    expect(reminder('berget', remembered, { x: 149, y: 31.4 }).id).toBe('figure');
    expect(reminder('berget', ['lift', 'memory'], { x: 153, y: 31.4 }).id).toBe('figure');
  });
});

describe('optional-route reminders only inspect progress', () => {
  it('keeps optional clues mysterious even if later chapters have saved memories', () => {
    const history = { berget: ['memory'], norrsken: ['placed:tragubbe', 'eyes', 'bag'] };
    const visits = [
      reminder('garden', gardenOpened, atSurface, history),
      reminder('garden', gardenOpened, atPocket, history),
      reminder('garden', [...gardenOpened, 'garden:paper'], atPocket, history),
      reminder('garden', [...gardenOpened, 'garden:paper'], atMoa, history),
      reminder('myren', bogBridge, { x: 151, y: 0.3 }, history),
      reminder('myren', [...bogBridge, 'bog:lantern-return'], { x: 151, y: 0.3 }, history),
      reminder('berget', mountainPrize, { x: 149, y: 40.9 }, history),
    ];
    for (const visit of visits) {
      expect(text(visit), visit.id).not.toMatch(earlyMystery);
      expect(visit.reveal).toBeNull();
    }
  });

  it('does not change collected flags, historical visits or the player position', () => {
    const history = Object.freeze({ garden: Object.freeze([...gardenOpened]) });
    const visits = [
      { chapter: 'garden', flags: [...gardenOpened, 'garden:paper'], player: atPocket, id: 'gardenClimb' },
      { chapter: 'myren', flags: [...bogBridge, 'bog:lantern-return'], player: { x: 151, y: 0.3 }, id: 'bogReturn' },
      { chapter: 'berget', flags: mountainPrize, player: { x: 149, y: 40.9 }, id: 'mountainReturn' },
    ];
    for (const visit of visits) {
      const flags = new Set(visit.flags);
      const previous = [...flags];
      const player = Object.freeze({ ...visit.player });
      for (let i = 0; i < 3; i++) {
        expect(storyContext(visit.chapter, flags, player, history)?.id).toBe(visit.id);
        storyHandoff(visit.chapter, flags);
      }
      expect([...flags], visit.chapter).toEqual(previous);
      expect(player, visit.chapter).toEqual(visit.player);
    }
    expect(history.garden).toEqual(gardenOpened);
  });
});
