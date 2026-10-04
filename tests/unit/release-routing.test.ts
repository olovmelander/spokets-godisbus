import { describe, expect, it } from 'vitest';
import { COURSES, courseAvailable, courseFor, courseQuery, nextAvailable } from '../../src/content/chapters';
import { type ChapterId } from '../../src/content/world';
import { chapterFor, codeFor } from '../../src/save/codes';
import { mapState, mapSvg } from '../../src/ui/map';
import { sv } from '../../src/content/sv';

const publicPage = new URLSearchParams();
const dev = new URLSearchParams('dev');
const canEnter = (release: ChapterId | null) => (id: string) => courseAvailable(publicPage, id, release);

describe('the public release boundary', () => {
  it('with no release, a URL, debug flag, save or chapter code cannot open story work', () => {
    for (const id of Object.keys(COURSES).filter((id) => id !== 'testbana')) {
      expect(courseFor(new URLSearchParams(`debug&course=${id}`), null, null).id, id).toBe('testbana');
      expect(courseFor(publicPage, id, null).id, id).toBe('testbana');
      const code = codeFor(id);
      if (code) expect(courseAvailable(publicPage, chapterFor(code)!, null)).toBe(false);
    }
  });

  it('opens only the released prefix and resumes a released save', () => {
    for (const [release, allowed] of [
      ['prolog', ['prolog']],
      ['granskog', ['prolog', 'garden', 'granskog']],
      ['forsen', ['prolog', 'garden', 'granskog']],
      ['myr', ['prolog', 'garden', 'granskog', 'myren']],
      ['berg', ['prolog', 'garden', 'granskog', 'myren', 'berget']],
      ['final', ['prolog', 'garden', 'granskog', 'myren', 'berget', 'norrsken']],
      ['epilog', ['prolog', 'garden', 'granskog', 'myren', 'berget', 'norrsken', 'epilog']],
    ] as const) {
      expect(Object.keys(COURSES).filter((id) => id !== 'testbana' && courseAvailable(publicPage, id, release)), release).toEqual(allowed);
      expect(courseFor(publicPage, allowed.at(-1)!, release).id).toBe(allowed.at(-1));
      expect(courseFor(new URLSearchParams('course=byn'), null, release).id).toBe('prolog');
    }
    expect(courseFor(publicPage, 'epilog', 'garden').id).toBe('prolog');
    expect(courseFor(new URLSearchParams('course=epilog'), 'garden', 'garden').id).toBe('garden');
  });

  it('maps the plan IDs onto existing course names without changing existing saved IDs', () => {
    for (const [stable, existing] of [['myr', 'myren'], ['berg', 'berget'], ['final', 'norrsken']]) {
      expect(courseFor(new URLSearchParams(`course=${stable}`), null, 'epilog').id).toBe(existing);
      expect(courseFor(dev, stable).id).toBe(existing);
    }
    for (const id of ['__proto__', 'toString', 'constructor', 'unknown']) {
      expect(courseAvailable(dev, id), id).toBe(false);
      expect(courseFor(new URLSearchParams(`dev&course=${id}`)).id, id).toBe('prolog');
    }
  });

  it('ends a partial release at its last built chapter; development can continue through the bonus', () => {
    expect(nextAvailable('garden', publicPage, 'garden')).toBeNull();
    expect(nextAvailable('prolog', publicPage, 'garden')?.id).toBe('garden');
    expect(nextAvailable('granskog', publicPage, 'forsen')).toBeNull();
    expect(nextAvailable('granskog', publicPage, 'myr')?.id).toBe('myren');
    expect(nextAvailable('norrsken', publicPage, 'epilog')?.id).toBe('epilog');
    expect(nextAvailable('epilog', publicPage, 'epilog')).toBeNull();
    expect(nextAvailable('epilog', dev)?.id).toBe('byn');
    expect(nextAvailable('byn', dev)).toBeNull();
    for (const id of Object.keys(COURSES)) expect(courseFor(new URLSearchParams(`dev&course=${id}`)).id).toBe(id);
  });

  it('replaces the explicit course and drops old start positions and seeded flags for both navigation paths', () => {
    const from = new URLSearchParams('dev&debug&course=garden&at=208,0&flags=goal&tier=low');
    const moved = new URLSearchParams(courseQuery(from, 'granskog'));
    expect(moved.get('course')).toBe('granskog');
    expect(moved.has('at')).toBe(false);
    expect(moved.has('flags')).toBe(false);
    expect(moved.has('dev')).toBe(true);
    expect(moved.has('debug')).toBe(true);
    expect(moved.get('tier')).toBe('low');
    expect(courseFor(moved, 'garden').id).toBe('granskog');
    expect(from.get('course')).toBe('garden');
  });

  it('keeps unreleased places blank with Moa’s note and no ghost pointing into them', () => {
    const garden = mapState('garden', canEnter('garden'))!;
    expect(garden).toMatchObject({ drawn: ['home'], ghost: null, unfinished: true });
    const svg = mapSvg(garden);
    expect(svg).toContain(sv.map.unfinished);
    expect(svg).not.toContain(`>${sv.map.forest}<`);
    expect(mapState('myren', canEnter('garden'))).toBeNull();
    expect(mapState('granskog', canEnter('granskog'))).toMatchObject({ drawn: ['home', 'forest', 'brook'], ghost: null });
    expect(mapState('myren', canEnter('myr'))).toMatchObject({ drawn: ['home', 'forest', 'brook', 'bog'], ghost: null });
    expect(mapSvg(mapState('epilog', canEnter('epilog')))).not.toContain(sv.map.unfinished);
    expect(mapState('garden', (id) => courseAvailable(dev, id))!.ghost).toBe('forest');
  });
});
