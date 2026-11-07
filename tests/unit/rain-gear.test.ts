import { describe, expect, it } from 'vitest';
import { rainGearFor } from '../../src/render/rain-gear';

/** Rain gear in Stormnatten, as the story has them put it on (src/render/rain-gear.ts, 6 November 2026). */
const storm = { rain: 0.8 } as never;
const chapter = (id: string, rain = true) => ({ id, storm: rain ? storm : undefined });

describe('the rain gear', () => {
  it('is not worn out of the storm, nor by anyone but the family', () => {
    expect(rainGearFor(chapter('granskog', false), 'mamma', new Set())).toBeNull();
    expect(rainGearFor(chapter('stormgard'), 'mormor', new Set())).toBeNull();
  });

  it('is put on in Stormkvällen when they get ready to go out together, and worn from then on', () => {
    expect(rainGearFor(chapter('stormkvall'), 'pappa', new Set())).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'pappa', new Set(['scene:tillsammans']))).not.toBeNull();
    for (const id of ['stormgard', 'stormskog', 'stormbyn', 'flarken', 'alven', 'stormoga']) {
      for (const who of ['mamma', 'pappa', 'moa', 'bertil']) expect(rainGearFor(chapter(id), who, new Set())).not.toBeNull();
    }
  });

  it('each has a coat of their own colour', () => {
    const coats = ['mamma', 'pappa', 'moa', 'bertil'].map((who) => rainGearFor(chapter('stormskog'), who, new Set())!.coat);
    expect(new Set(coats).size).toBe(4);
  });

  it('Bertil takes off his right boot for Elof in Stormgården once he has been called, and only there', () => {
    expect(rainGearFor(chapter('stormgard'), 'bertil', new Set())!.bootOff).toBeNull();
    expect(rainGearFor(chapter('stormgard'), 'bertil', new Set(['sg:bertil']))!.bootOff).toBe(1);
    expect(rainGearFor(chapter('stormgard'), 'moa', new Set(['sg:bertil']))!.bootOff).toBeNull();
    expect(rainGearFor(chapter('stormskog'), 'bertil', new Set(['sg:bertil']))!.bootOff).toBeNull();
  });
});

describe('getting ready in Stormkvällen', () => {
  it('each puts their gear on as the scene comes to them', () => {
    const at = (seconds: number) => ({ id: 'tillsammans', seconds });
    expect(rainGearFor(chapter('stormkvall'), 'mamma', new Set(), at(0.5))).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'mamma', new Set(), at(1.2))).not.toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'moa', new Set(), at(5))).toBeNull();
    expect(rainGearFor(chapter('stormkvall'), 'moa', new Set(), at(7.5))).not.toBeNull();
  });
});
