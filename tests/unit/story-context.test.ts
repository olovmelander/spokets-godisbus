import { describe, expect, it } from 'vitest';
import { storyContext, storyHandoff } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { prolog, epilog } from '../../src/content/chapters/ends';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { myren } from '../../src/content/chapters/myren';
import { berget } from '../../src/content/chapters/berget';
import { norrsken } from '../../src/content/chapters/norrsken';
import { byn } from '../../src/content/chapters/byn';
import type { ChapterData, Vec } from '../../src/sim/types';

const position = { x: 0, y: 0 };
const context = (chapter: string, flags: string[] = [], player: Vec = position,
  history: Readonly<Record<string, readonly string[]>> = {}) =>
  storyContext(chapter, new Set(flags), player, history)!;
const checkpoint = (chapter: ChapterData, x: number) => {
  const at = chapter.checkpoints?.find((point) => point.x === x);
  if (!at) throw new Error(`Missing authored checkpoint at ${chapter.id}:${x}`);
  return at;
};
const publicText = (value: ReturnType<typeof storyContext>) =>
  value ? `${value.purpose} ${value.recap} ${value.family} ${value.reveal ?? ''}` : '';
const motive = /välkommen.?hem.kalas|tog godiset för att|välkomna min gamla trägubbe/i;
const lostFirstFigure = /min första trägubbe|min gamla trägubbe.*spricka|hämtar.*hem den/i;
const firstFigureIdentity = /min (?:gamla|första) trägubbe/i;
const genericWelcome = 'Spöket tog godiset för att välkomna trägubben hem!';

describe('the current purpose follows Elof’s actual story progress', () => {
  it('connects painting, the theft, shrinking and the family handoff in order', () => {
    const stages = [
      { flags: [], id: 'paint' },
      { flags: ['eye'], id: 'paintSecond' },
      { flags: ['eye', 'paint', 'blink'], id: 'chase' },
      { flags: ['eye', 'paint', 'blink', 'bag:torn'], id: 'starTrail' },
      { flags: ['eye', 'paint', 'blink', 'bag:torn', 'scene:stjarnan'], id: 'starTaste' },
      { flags: ['eye', 'paint', 'blink', 'bag:torn', 'star'], id: 'starWonder' },
      { flags: ['eye', 'paint', 'blink', 'bag:torn', 'star', 'scene:poff'], id: 'tiny' },
      { flags: ['eye', 'paint', 'blink', 'bag:torn', 'star', 'pappa:noticed', 'pappa:done'], id: 'handoff' },
    ];
    for (const stage of stages) {
      expect(context('prolog', stage.flags).id, stage.flags.join(',')).toBe(stage.id);
    }
  });

  it('turns the garden chase into a practical way to reach the forest', () => {
    expect(context('garden').id).toBe('garden');
    const remembered = context('garden', ['memory'], { x: 148, y: 3.3 });
    expect(remembered.id).toBe('gardenMemory');
    expect(publicText(remembered)).not.toMatch(lostFirstFigure);
    expect(context('garden', ['memory'], checkpoint(garden, 160)).id).toBe('moa');
    expect(context('garden', ['memory', 'moa'], checkpoint(garden, 160)).id).toBe('planeBoard');
    expect(context('garden', ['memory', 'moa', 'plane:board'], { x: 180, y: 8 }).id).toBe('plane');
  });

  it('makes rescuing the ghost replace the chase with following a friend', () => {
    const waiting = context('granskog', ['cap:ready'], checkpoint(granskog, 150));
    expect(waiting.id).toBe('capBoard');
    expect(waiting.guide).toBe('bertil');
    expect(context('granskog', ['cap'], checkpoint(granskog, 150)).id).toBe('capRide');
    expect(context('granskog', ['cap'], checkpoint(granskog, 179)).id).toBe('eddy');
    const saved = context('granskog', ['cap', 'placed:rescue'], checkpoint(granskog, 194.6));
    expect(saved.id).toBe('waiting');
    expect(saved.purpose).toMatch(/väntar/);
    // A dialog receipt or the mover's name alone is not proof that the rescue happened.
    for (const flags of [['beat:thanked'], ['rescue']]) {
      expect(context('granskog', flags, checkpoint(granskog, 179)).id).toBe('eddy');
    }
  });

  it('keeps Mamma’s actual crossing available after her call, until Elof finishes it', () => {
    const bridge = context('myren', ['mamma', 'placed:pine'], { x: 90, y: 0 });
    expect(bridge.id).toBe('bridgeCross'); expect(bridge.guide).toBe('mamma');
    const braid = context('myren', ['mamma', 'braid'], { x: 103.7, y: 2 });
    expect(braid.id).toBe('braidClimb'); expect(braid.guide).toBe('mamma');
    expect(context('myren', ['mamma', 'braid'], { x: 108, y: 4.5 }).id).toBe('bog');
    expect(context('garden', ['moa'], { x: 165, y: 0 }).guide).toBe('moa');
    expect(context('granskog', ['seesaw'], { x: 109, y: -8 }).guide).toBe('pappa');
  });

  it('explains the small-cone attempt and the heavier retry before the real launch', () => {
    const at = checkpoint(granskog, 106.5);
    const stages = [
      { flags: ['seesaw'], id: 'cone' },
      { flags: ['seesaw', 'placed:cone-small'], id: 'coneTrial' },
      { flags: ['seesaw', 'placed:cone-small', 'seesaw:trial'], id: 'coneRetry' },
      { flags: ['seesaw', 'placed:cone-small', 'seesaw:trial', 'placed:cone'], id: 'launch' },
    ];
    for (const stage of stages) {
      expect(context('granskog', stage.flags, at).id, stage.flags.join(',')).toBe(stage.id);
    }
    // Picking up or touching a cone does not count as placing it on the seesaw.
    expect(context('granskog', ['seesaw', 'cone-small', 'cone'], at).id).toBe('cone');
    // The completed ride must not send a resumed player back to an earlier attempt.
    const completed = context('granskog', [...stages[3]!.flags, 'launch'], checkpoint(granskog, 129.6));
    expect(['cone', 'coneTrial', 'coneRetry', 'launch']).not.toContain(completed.id);
  });

  it('treats the forest neighbours as a clue without explaining the main mystery', () => {
    const at = checkpoint(granskog, 63);
    expect(context('granskog', ['jay', 'beat:vittra'], at).id).toBe('forestDoor');
    const returned = context('granskog', ['jay', 'beat:vittra', 'keepsake:vittra'], at);
    expect(returned.id).toBe('vittraClue');
    expect(publicText(returned)).not.toMatch(lostFirstFigure);
    expect(publicText(returned)).not.toMatch(motive);
  });

  it('keeps optional neighbour discoveries behind the current crossing or rescue', () => {
    const remembered = ['jay', 'beat:vittra', 'keepsake:vittra'];
    expect(context('granskog', remembered, checkpoint(granskog, 106.5)).id).toBe('seesaw');
    expect(context('granskog', [...remembered, 'seesaw', 'placed:cone-small', 'seesaw:trial', 'placed:cone'], checkpoint(granskog, 106.5)).id).toBe('launch');
    expect(context('granskog', [...remembered, 'launch', 'cap'], checkpoint(granskog, 150)).id).toBe('capRide');
    expect(context('granskog', [...remembered, 'launch', 'cap'], checkpoint(granskog, 179)).id).toBe('eddy');
    expect(context('granskog', [...remembered, 'launch', 'cap', 'placed:rescue'], checkpoint(granskog, 194.6)).id).toBe('waiting');
  });

  it('keeps the bog destination unexplained until the chick actually reaches home', () => {
    const stages = [
      { flags: ['mamma', 'braid', 'light'], id: 'mist' },
      { flags: ['mamma', 'braid', 'light', 'chick'], id: 'chick' },
      { flags: ['mamma', 'braid', 'light', 'chick', 'home'], id: 'pine' },
      { flags: ['mamma', 'braid', 'light', 'chick', 'home', 'crane'], id: 'crane' },
    ];
    for (const stage of stages) {
      expect(context('myren', stage.flags, checkpoint(myren, 180)).id).toBe(stage.id);
    }
    expect(context('myren', ['light', 'chick', 'beat:spangen'], checkpoint(myren, 180)).id).toBe('chick');
  });

  it('learns whose figure is lost from the mountain memory, after helping the ghost up', () => {
    const at = checkpoint(berget, 149);
    expect(context('berget', [], at).id).toBe('lift');
    expect(context('berget', ['lift'], at).id).toBe('tall');
    expect(context('berget', ['lift', 'memory'], at).id).toBe('figure');
    expect(context('berget', ['lift'], at, { garden: ['memory'], granskog: ['memory'], myren: ['memory'] }).id).toBe('tall');
  });

  it('returns the bag only after the figure is rescued and given eyes', () => {
    const history = { berget: ['lift', 'memory'] };
    const at = checkpoint(norrsken, 17.8);
    expect(context('norrsken', ['lower'], at, history).id).toBe('pull');
    expect(context('norrsken', ['lower', 'placed:tragubbe'], at, history).id).toBe('eyes');
    expect(context('norrsken', ['lower', 'placed:tragubbe', 'crowberry', 'eyes'], at, history).id).toBe('bag');
    expect(context('norrsken', ['lower', 'placed:tragubbe', 'crowberry', 'eyes', 'bag'], at, history).id).toBe('welcome');
    expect(context('norrsken', ['placed:tragubbe', 'eyes', 'bag', 'shared'], at, history).id).toBe('gold');
    expect(context('norrsken', ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste'], checkpoint(norrsken, 30.4), history).id).toBe('reunion');
    expect(context('norrsken', ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste', 'home'], checkpoint(norrsken, 30.4), history).id).toBe('home');
  });

  it('moves from the party to a new carving and bedtime without replaying completed tasks', () => {
    expect(context('epilog', [], checkpoint(epilog, 2.6)).id).toBe('party');
    expect(context('epilog', ['partied'], checkpoint(epilog, 25)).id).toBe('carveStart');
    expect(context('epilog', ['partied', 'knife'], { x: 32, y: 0 }).id).toBe('carve');
    expect(context('epilog', ['partied', 'knife', 'cut1', 'cut2', 'cut3'], { x: 32, y: 0 }).id).toBe('paintOwn');
    expect(context('epilog', ['partied', 'knife', 'cut3', 'dots'], checkpoint(epilog, 38)).id).toBe('teeth');
    expect(context('epilog', ['partied', 'knife', 'cut3', 'dots', 'teeth'], { x: 54, y: 3 }).id).toBe('bed');
  });

  it('gives the village outing its own purpose instead of restarting the theft', () => {
    expect(context('byn', [], checkpoint(byn, 8)).id).toBe('village');
    expect(context('byn', ['box'], checkpoint(byn, 115)).id).toBe('shop');
    expect(context('byn', ['box'], checkpoint(byn, 128)).id).toBe('shopDone');
    expect(publicText(context('byn'))).not.toMatch(/tog min|hitta min påse/);
  });
});

describe('reminders survive checkpoints without inventing knowledge', () => {
  it('keeps the theft explanation visible from the actual returned bag through going home', () => {
    const history = { berget: ['memory'] };
    const needed = ['placed:tragubbe', 'eyes', 'bag'];
    for (const later of [[], ['shared'], ['shared', 'taste'], ['shared', 'taste', 'home']]) {
      expect(context('norrsken', [...needed, ...later], position, history).reveal)
        .toBe(sv.storyContext.purposes.welcome.recap);
      const withoutMemory = context('norrsken', [...needed, ...later], position);
      expect(withoutMemory.reveal).toBe(genericWelcome);
      expect(publicText(withoutMemory)).not.toMatch(firstFigureIdentity);
      for (const missing of needed) {
        expect(context('norrsken', [...needed.filter((flag) => flag !== missing), ...later], position, history).reveal).toBeNull();
        expect(context('norrsken', [...needed.filter((flag) => flag !== missing), ...later], position).reveal).toBeNull();
      }
    }
    expect(context('prolog', [], position, { ...history, norrsken: needed }).reveal).toBeNull();
  });

  it.each([
    { chapter: prolog, x: 45.5, flags: ['eye', 'paint', 'blink', 'bag:torn', 'star', 'scene:poff'], id: 'tiny' },
    { chapter: garden, x: 118.2, flags: ['ladybird', 'dandelion'], id: 'garden' },
    { chapter: granskog, x: 106.5, flags: ['jay', 'placed:twig', 'antlift'], id: 'seesaw' },
    { chapter: granskog, x: 179, flags: ['launch', 'cap'], id: 'eddy' },
    { chapter: myren, x: 139, flags: ['mamma', 'placed:pine', 'braid'], id: 'light' },
    { chapter: myren, x: 169.5, flags: ['mamma', 'braid', 'light', 'chick'], id: 'chick' },
    { chapter: berget, x: 138.4, flags: ['flight'], id: 'mountain' },
    { chapter: norrsken, x: 17.8, flags: ['lower', 'placed:tragubbe'], id: 'eyes' },
    { chapter: epilog, x: 38, flags: ['partied', 'knife', 'cut3', 'dots'], id: 'teeth' },
  ])('$chapter.id checkpoint $x gives a useful next task', ({ chapter, x, flags, id }) => {
    const reminder = context(chapter.id, [...flags, 'beat:already-said'], checkpoint(chapter, x));
    expect(reminder.id).toBe(id);
    expect(reminder.purpose.trim()).not.toBe('');
    expect(reminder.recap.trim()).not.toBe('');
    expect(reminder.family.trim()).not.toBe('');
  });

  it('keeps the lost first figure and the candy motive hidden through earlier memories', () => {
    const earlierHistory = { garden: ['memory'], granskog: ['memory'], myren: ['memory'] };
    const visits = [
      context('prolog', ['star', 'pappa:done']),
      context('garden', ['memory'], { x: 148, y: 3.3 }),
      context('granskog', ['memory', 'placed:rescue'], checkpoint(granskog, 194.6)),
      context('myren', ['memory', 'light', 'chick', 'home'], checkpoint(myren, 180)),
      context('berget', ['lift'], checkpoint(berget, 149), earlierHistory),
      context('norrsken', [], checkpoint(norrsken, 2.4), earlierHistory),
    ];
    for (const visit of visits) {
      expect(publicText(visit), visit.id).not.toMatch(lostFirstFigure);
      expect(publicText(visit), visit.id).not.toMatch(motive);
    }
  });

  it('requires the actual rescue, new eyes and returned bag, while the optional memory supplies identity', () => {
    const rescued = ['placed:tragubbe', 'eyes', 'bag'];
    const remembered = { berget: ['memory'] };
    expect(publicText(context('norrsken', rescued, position, remembered))).toMatch(motive);
    expect(publicText(context('norrsken', rescued, position, remembered))).toMatch(firstFigureIdentity);
    for (const missing of rescued) {
      expect(publicText(context('norrsken', rescued.filter((flag) => flag !== missing), position, remembered)), missing)
        .not.toMatch(motive);
      expect(publicText(context('norrsken', rescued.filter((flag) => flag !== missing))), `without memory, missing ${missing}`)
        .not.toMatch(motive);
    }
    const unrelatedHistories: Readonly<Record<string, readonly string[]>>[] = [
      {}, { garden: ['memory'] }, { berget: ['beat:fetch'] },
    ];
    for (const history of unrelatedHistories) {
      const fallback = context('norrsken', rescued, position, history);
      expect(fallback.id).toBe('share');
      expect(fallback.reveal).toBe(genericWelcome);
      expect(fallback.recap).toContain(genericWelcome);
      expect(publicText(fallback)).not.toMatch(firstFigureIdentity);
    }
    // A same-named local receipt does not stand in for the previous chapter's memory.
    const localMemory = context('norrsken', [...rescued, 'memory']);
    expect(localMemory.id).toBe('share');
    expect(localMemory.reveal).toBe(genericWelcome);
    expect(publicText(localMemory)).not.toMatch(firstFigureIdentity);
    for (const flags of [
      ['tragubbe', 'eyes', 'bag'],
      ['placed:tragubbe', 'beat:painted', 'bag'],
      ['placed:tragubbe', 'eyes', 'beat:bag'],
      ['memory', 'goal', 'beat:fetch', 'beat:welcome'],
    ]) {
      const incomplete = context('norrsken', flags, position, remembered);
      expect(incomplete.reveal, flags.join(',')).toBeNull();
      expect(publicText(incomplete), flags.join(',')).not.toMatch(motive);
    }
  });

  it('retains the understood motive through the final sharing, reunion and walk home', () => {
    const prerequisites = ['placed:tragubbe', 'eyes', 'bag'];
    const stages = [
      { flags: ['shared'], id: 'gold' },
      { flags: ['shared', 'taste'], id: 'reunion' },
      { flags: ['shared', 'taste', 'home'], id: 'home' },
    ];
    for (const stage of stages) {
      const understood = context('norrsken', [...prerequisites, ...stage.flags], checkpoint(norrsken, 30.4), { berget: ['memory'] });
      expect(understood.id).toBe(stage.id);
      expect(understood.recap, stage.id).toMatch(motive);
      const withoutMemory = context('norrsken', [...prerequisites, ...stage.flags], position);
      expect(withoutMemory.id).toBe(stage.id);
      expect(withoutMemory.recap, stage.id).toContain(genericWelcome);
      expect(withoutMemory.reveal, stage.id).toBe(genericWelcome);
      expect(publicText(withoutMemory), stage.id).not.toMatch(firstFigureIdentity);
      for (const missing of prerequisites) {
        const incomplete = context('norrsken', [...prerequisites.filter((flag) => flag !== missing), ...stage.flags], position, { berget: ['memory'] });
        expect(publicText(incomplete), `${stage.id}, missing ${missing}`).not.toMatch(motive);
      }
    }
  });

  it('carries the understood motive home from saved summit progress, not epilogue lookalike flags', () => {
    const rescued = ['placed:tragubbe', 'eyes', 'bag'];
    const history = { berget: ['memory'], norrsken: rescued };
    for (const flags of [[], ['partied', 'knife', 'cut3'], ['dots', 'teeth']]) {
      expect(context('epilog', flags, checkpoint(epilog, 38), history).recap).toMatch(motive);
      const withoutMemory = context('epilog', flags, checkpoint(epilog, 38), { norrsken: rescued });
      expect(withoutMemory.recap).toContain(genericWelcome);
      expect(publicText(withoutMemory)).not.toMatch(firstFigureIdentity);
    }
    for (const missing of rescued) {
      const incompleteHistory = { berget: ['memory'], norrsken: rescued.filter((flag) => flag !== missing) };
      expect(publicText(context('epilog', rescued, position, incompleteHistory)), missing).not.toMatch(motive);
      expect(publicText(context('epilog', rescued, position, { norrsken: rescued.filter((flag) => flag !== missing) })), missing).not.toMatch(motive);
    }
    expect(publicText(context('epilog', rescued, position))).not.toMatch(motive);
    expect(publicText(context('epilog', rescued, position, { berget: ['memory'] }))).not.toMatch(motive);
    // A fresh summit replay uses this visit's interaction state, not a previous completed visit.
    expect(publicText(context('norrsken', [], position, history))).not.toMatch(motive);
    expect(publicText(context('prolog', [], position, history))).not.toMatch(motive);
  });

  it('keeps a completed later save from revealing the motive on an earlier chapter or a fresh summit replay', () => {
    const completedHistory = { berget: ['memory'], norrsken: ['placed:tragubbe', 'eyes', 'bag', 'shared', 'taste', 'home'] };
    const visits = [
      context('prolog', ['star', 'pappa:done'], position, completedHistory),
      context('garden', ['memory'], { x: 148, y: 3.3 }, completedHistory),
      context('granskog', ['placed:rescue'], checkpoint(granskog, 194.6), completedHistory),
      context('myren', ['light', 'chick', 'home'], checkpoint(myren, 180), completedHistory),
      context('berget', ['lift'], checkpoint(berget, 149), completedHistory),
      context('norrsken', ['placed:tragubbe', 'eyes'], position, completedHistory),
    ];
    for (const visit of visits) {
      expect(publicText(visit), visit.id).not.toMatch(motive);
      expect(visit.reveal, visit.id).toBeNull();
    }
  });

  it('only reads saved progress, even when consulted repeatedly on resume and pause', () => {
    const flags = new Set(['lower', 'placed:tragubbe', 'eyes', 'bag']);
    const before = [...flags];
    const history = Object.freeze({
      garden: Object.freeze(['memory', 'moa']),
      berget: Object.freeze(['lift', 'memory']),
    });
    const originalHistory = JSON.stringify(history);
    const player = Object.freeze({ x: 17.8, y: 0 });
    for (let i = 0; i < 3; i++) {
      expect(storyContext('norrsken', flags, player, history)?.id).toBe('welcome');
      storyHandoff('norrsken', flags);
    }
    expect([...flags]).toEqual(before);
    expect(JSON.stringify(history)).toBe(originalHistory);
    expect(player).toEqual({ x: 17.8, y: 0 });
  });

  it.each(['testbana', 'look', 'unknown', '__proto__', 'constructor'])('returns no story reminder or handoff for %s', (chapter) => {
    expect(storyContext(chapter, new Set(['memory', 'home', 'goal']), position)).toBeNull();
    expect(storyHandoff(chapter, new Set(['memory', 'home', 'goal']))).toBeNull();
  });
});

describe('chapter handoffs state what really happened', () => {
  it('credits Moa’s flight only when the plane was boarded', () => {
    expect(storyHandoff('garden', new Set(['moa', 'plane:board']))).toEqual(sv.storyContext.handoffs.garden);
    expect(storyHandoff('garden', new Set(['moa']))).toEqual(sv.storyContext.handoffs.gardenClue);
    expect(storyHandoff('garden', new Set(['goal', 'memory']))).toEqual(sv.storyContext.handoffs.gardenClue);
  });

  it('recalls sharing at home only after the party actually happened', () => {
    expect(storyHandoff('epilog', new Set(['partied']))).toEqual(sv.storyContext.handoffs.epilog);
    expect(storyHandoff('epilog', new Set(['goal', 'knife']))).toEqual(sv.storyContext.handoffs.epilogClue);
  });

  it('calls the forest ghost rescued only when the rescue mover was placed', () => {
    const completed = sv.storyContext.handoffs.granskog;
    expect(storyHandoff('granskog', new Set(['placed:rescue']))).toEqual(completed);
    for (const flags of [[], ['goal'], ['beat:thanked'], ['rescue']]) {
      const fallback = storyHandoff('granskog', new Set(flags));
      expect(fallback).not.toBeNull();
      expect(fallback).not.toEqual(completed);
      expect(fallback!.text).not.toMatch(/hjälpte.*ur vattnet|räddade/);
    }
  });

  it('claims the chick reached home only after its actual home receipt', () => {
    const completed = sv.storyContext.handoffs.myren;
    expect(storyHandoff('myren', new Set(['light', 'chick', 'home', 'crane']))).toEqual(completed);
    for (const flags of [[], ['chick'], ['goal', 'memory']]) {
      const fallback = storyHandoff('myren', new Set(flags));
      expect(fallback).not.toBeNull();
      expect(fallback).not.toEqual(completed);
      expect(fallback!.text).not.toMatch(/tranungen är hemma|hjälpte.*hem/i);
    }
  });

  it('uses the mountain memory to name the figure and keeps a clue otherwise', () => {
    expect(storyHandoff('berget', new Set(['lift', 'memory']))).toEqual(sv.storyContext.handoffs.berget);
    for (const flags of [[], ['lift', 'goal'], ['beat:fetch']]) {
      const fallback = storyHandoff('berget', new Set(flags));
      expect(fallback).toEqual(sv.storyContext.handoffs.bergetClue);
      expect(`${fallback!.title} ${fallback!.text}`).not.toMatch(lostFirstFigure);
    }
  });

  it('never claims a rescued carving or a returned bag from an unrelated goal receipt', () => {
    const completed = sv.storyContext.handoffs.norrsken;
    expect(storyHandoff('norrsken', new Set(['placed:tragubbe', 'eyes', 'bag', 'home']))).toEqual(completed);
    for (const flags of [[], ['goal'], ['tragubbe', 'eyes', 'bag'], ['placed:tragubbe', 'eyes']]) {
      const fallback = storyHandoff('norrsken', new Set(flags));
      expect(fallback).not.toBeNull();
      expect(fallback).not.toEqual(completed);
      expect(fallback!.text).not.toMatch(/trägubben är räddad och påsen är tillbaka/i);
    }
  });

  it('keeps Pappa’s required origin explanation in the completed finale handoff without an optional memory', () => {
    const actual = ['placed:tragubbe', 'eyes', 'bag', 'taste'];
    const handoff = storyHandoff('norrsken', new Set(actual));
    expect(handoff).toEqual(sv.storyContext.handoffs.norrskenOrigin);
    expect(handoff!.text).toMatch(/Pappa täljde trägubben åt mig när jag var liten/);
    expect(handoff!.text).toMatch(/tappade den här på berget/);
    expect(handoff!.text).toMatch(/Spöket tog godiset för att välkomna den hem/);
    // That required-stage explanation does not manufacture a discovered mountain memory.
    const current = context('norrsken', actual, checkpoint(norrsken, 30.4));
    expect(current.id).toBe('reunion');
    expect(current.reveal).toBe(genericWelcome);
    expect(publicText(current)).not.toMatch(firstFigureIdentity);
  });

  it('requires each actual finale receipt before crediting Pappa’s origin explanation', () => {
    const required = ['placed:tragubbe', 'eyes', 'bag', 'taste'];
    const dialogOnly = ['goal', 'home', 'memory', 'beat:first1', 'beat:first2', 'beat:first3', 'beat:first4'];
    for (const missing of required) {
      const flags = [...required.filter((flag) => flag !== missing), ...dialogOnly];
      const handoff = storyHandoff('norrsken', new Set(flags));
      expect(handoff, missing).toEqual(missing === 'taste'
        ? sv.storyContext.handoffs.norrsken : sv.storyContext.handoffs.norrskenClue);
      expect(handoff!.text, missing).not.toMatch(/täljde.*åt mig|när jag var liten|tappade.*här.*berget/i);
    }
    expect(storyHandoff('norrsken', new Set(['tragubbe', 'eyes', 'bag', 'taste', ...dialogOnly])))
      .toEqual(sv.storyContext.handoffs.norrskenClue);
  });

  it('does not borrow a completed saved finale to fill a fresh visit’s missing handoff receipts', () => {
    const completed = ['placed:tragubbe', 'eyes', 'bag', 'taste'];
    const history = Object.freeze({ norrsken: Object.freeze([...completed]) });
    for (const actual of [[], ['placed:tragubbe', 'eyes'], ['placed:tragubbe', 'eyes', 'bag']]) {
      const flags = new Set(actual);
      const before = [...flags];
      storyContext('norrsken', flags, position, history);
      expect(storyHandoff('norrsken', flags)).toEqual(actual.includes('bag')
        ? sv.storyContext.handoffs.norrsken : sv.storyContext.handoffs.norrskenClue);
      expect([...flags]).toEqual(before);
    }
    expect(history.norrsken).toEqual(completed);
  });
});
