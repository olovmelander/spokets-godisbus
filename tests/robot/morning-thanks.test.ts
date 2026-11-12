import { describe, expect, it } from 'vitest';
import '../../src/content/aventyr2/aventyr2';
import { morgonen, WINK } from '../../src/content/aventyr2/chapters/morgonen';
import { words } from '../../src/content/aventyr2/lines/morgonen';
import { homeConsoleAvailable } from '../../src/app/home-console';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { listenThrough } from './listener';
import { playThrough } from './robot';

const scene = (id: string) => morgonen.scenes!.find((one) => one.id === id)!;

/** Morgonen efter, the end of Äventyr 2, as Olov asked for it after playing it through (12 November 2026). */
describe('Äventyr 2: Morgonen efter, its thanks and its end', () => {
  it('has Elof thank each of them, standing by the table with his cup, for what they did in the night', () => {
    const tack = scene('tack');
    expect(tack.on).toBe('beat:moAnswer');
    expect(tack.hold).toBe(true);
    const lines = tack.lines!;
    const text = (one: (typeof lines)[number]) => words.lines[one.line]!;
    // Each line short enough to read, and Elof's own but for Klonk's answer, last.
    for (const one of lines) expect(text(one).length, one.line).toBeLessThanOrEqual(40);
    expect(lines.slice(0, -1).every((one) => one.who === 'elof')).toBe(true);
    expect(lines.at(-1)!.who).toBe('spoket');
    const said = lines.map(text).join(' ');
    for (const name of ['allihop', 'Bertil', 'Pappa', 'Moa', 'Mamma', 'mormor', 'morfar', 'Klonk']) expect(said).toContain(name);
    // Each one named answers with a nod, a wave or a cheer as it is said: the clock waits at the line, the body does not.
    for (const [who, line] of [['bertil', 'moThanksBertil'], ['pappa', 'moThanksPappa'], ['moa', 'moThanksMoa'], ['mamma', 'moThanksMamma']] as const) {
      const at = lines.find((one) => one.line === line)!.at;
      const answer = tack.stage!.actors![who]!.find((key) => key.act === 'nod' || key.act === 'wave' || key.act === 'cheer')!;
      expect(answer.at, who).toBeLessThanOrEqual(at);
      expect(at - answer.at, who).toBeLessThan(0.5);
    }
  });

  it('is said in order through a whole playthrough, after the cocoa and before the door', () => {
    const result = playThrough(60, morgonen, {}, 400);
    expect(result.goal).toBe(true);
    const ids = scene('tack').lines!.map((_, i) => `tack:${i}`);
    const order = ['moAnswer', ...ids, 'moAll'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
  });

  it('lets him walk past the TV, and play, before the story ends at the door', () => {
    // Olov: "Under frukosten så ska man kunna gå förbi TV:n och spela innan äventyr två tar slut."
    const tv = HOME_LAYOUT.television.x, reach = 2.8;
    const door = scene('slut').at!;
    expect(tv + reach).toBeLessThan(morgonen.goalX);
    expect(tv + reach).toBeLessThan(door - 1);
    // His last line on the way is said past the TV, so that it is not being read as he comes by it.
    expect(morgonen.beats!.find((beat) => beat.id === 'moAll')!.at!).toBeGreaterThan(tv + reach);
    const told = new Set(['scene:frukost', 'shelf:old', 'shelf:small', 'latch', 'beat:moName', 'cocoa', 'beat:moAnswer', 'scene:tack']);
    for (const x of [tv - 2.5, tv, tv + 2.5]) {
      expect(homeConsoleAvailable(morgonen, { x, y: 0, grounded: true, mode: 'free' }, false, told), `at ${x}`).toBe(true);
    }
    // A trail of sweets leads on down the room to the door.
    expect(Math.max(...morgonen.candy.map((candy) => candy.x))).toBeGreaterThan(tv + reach);
    // Read by a page, the robot stands at the door for the end.
    const result = listenThrough(morgonen, {}, 60, 900);
    expect(result.goal).toBe(true);
    const at = Object.fromEntries(result.scenes.map((one) => [one.id, one.x]));
    expect(Math.abs(at.slut! - door)).toBeLessThan(1);
  });

  it('has the little one wink while the picture is close on the shelf, as at the end of the first adventure', () => {
    const slut = scene('slut');
    expect(WINK.scene).toBe('slut');
    const shots = slut.stage!.shots!;
    const close = shots.find((shot) => shot.width! <= 2.5)!;
    const after = shots.find((shot) => shot.at > close.at)!;
    // The picture has come close (its move done) when it shuts its eye, and is still there when it opens it.
    expect(WINK.at).toBeGreaterThanOrEqual(close.at + (close.move ?? 0) - 0.6);
    expect(WINK.at + WINK.seconds).toBeLessThan(after.at);
    // The little one stands on the shelf then, glad to be home.
    expect(morgonen.decor).toContainEqual(expect.objectContaining({ look: 'lillgubbe', word: 'home' }));
  });
});
