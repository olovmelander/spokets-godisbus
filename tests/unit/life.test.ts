import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { LIFE, WALK, type Ink } from '../../src/content/life';
import { personFor } from '../../src/content/people';
import { farLayers } from '../../src/render/backdrop';
import { FIRST, GAP, QUADS, STRIDE, lifePlan, type LifePlan, type Watch } from '../../src/render/life-plan';
import type { ChapterData, LifeStage, PlaceId } from '../../src/sim/types';

/** The view's own lens (render/view.ts): 30 degrees, Elof a fifth of the picture's height within limits. */
function lens(width: number, height: number, zoom = 1) {
  const half = Math.tan((30 * Math.PI) / 360);
  const elof = Math.min(140, Math.max(75, height * 0.2));
  const tall = Math.max(height / elof, 6 / (width / height));
  const eye = (tall / 2 / half) * zoom;
  return { eye, slope: (half * width) / height, px: (z: number) => height / 2 / (half * (eye - z)) };
}
const PHONE = lens(844, 390);
const TABLET = lens(1180, 820);

const watch = (over: Partial<Watch> = {}): Watch => ({ x: 0, clock: 0, eye: TABLET.eye, slope: TABLET.slope, busy: false, calm: false, night: 0, ...over });
const places = Object.keys(LIFE) as PlaceId[];
const roles = places.flatMap((place) => Object.entries(LIFE[place]!.roles).map(([kind, role]) => ({ place, kind, role })));

/** Lets time pass in a plan, a sixtieth of a second at a time unless told otherwise, and says what each frame held. */
function run(plan: LifePlan, seconds: number, at: (clock: number) => Partial<Watch>, each: (frame: { clock: number; count: number; on: string | null; watch: Watch }) => void, rate = 60): void {
  for (let frame = 0; frame <= seconds * rate; frame++) {
    const clock = frame / rate;
    const now = watch({ clock, ...at(clock) });
    each({ clock, count: plan.step(now), on: plan.on, watch: now });
  }
}

describe('where the life hangs', () => {
  it('has a slot between two far pictures, passing as they do', () => {
    for (const place of places) {
      const far = farLayers(place);
      for (const slot of LIFE[place]!.slots) {
        const behind = far.filter((layer) => layer.z < slot.z).at(-1);
        const front = far.find((layer) => layer.z > slot.z);
        // Something far is always behind it, and nothing far hangs nearer than 30 EL.
        expect(behind, `${place} ${slot.z}`).toBeDefined();
        expect(slot.z).toBeLessThanOrEqual(-30);
        const holds = [behind!.hold, front?.hold ?? 1];
        expect(slot.hold, `${place} ${slot.z} holds`).toBeGreaterThanOrEqual(Math.min(...holds));
        expect(slot.hold).toBeLessThanOrEqual(Math.max(...holds));
        // It sinks with his climb as the picture behind it or the one in front does, or stays on the eye line.
        expect(slot.sink).toBeLessThanOrEqual(Math.max(behind!.sink, front?.sink ?? 0) + 1e-9);
      }
    }
  });

  it('stands on the picture it belongs to where it has chimneys', () => {
    // The garden's smoke rises from the houses painted at z -62: it must pass exactly as they do.
    const houses = farLayers('garden').find((layer) => layer.z === -62)!;
    const slot = LIFE.garden!.slots[0]!;
    expect([slot.hold, slot.sink]).toEqual([houses.hold, houses.sink]);
    expect(slot.z).toBeGreaterThan(houses.z);
  });
});

describe('what it is made of', () => {
  /** Red, pink and gold are the candy's and the hook's. A tint is pale or dark, and never of those hues. */
  function candyColoured([r, g, b]: Ink): boolean {
    const most = Math.max(r, g, b);
    const chroma = most - Math.min(r, g, b);
    if (chroma <= 40) return false;
    if (chroma > 120) return true;
    const hue = (60 * (most === r ? ((g - b) / chroma + 6) % 6 : most === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4));
    return hue < 30 || hue > 270;
  }

  it('knows the candy by its colours', () => {
    for (const candy of [[232, 72, 63], [239, 127, 176], [246, 196, 69], [240, 138, 60]] as Ink[]) expect(candyColoured(candy)).toBe(true);
  });

  it('has no tint that is red, pink or gold', () => {
    for (const place of places) {
      const cast = LIFE[place]!;
      const inks = [...Object.values(cast.roles).map((role) => role.ink), ...(cast.smoke ? [cast.smoke.ink] : []),
        ...(cast.lights ? [cast.lights.ink, cast.lights.road.ink, cast.lights.star.ink] : [])];
      for (const ink of inks) expect(candyColoured(ink), `${place} ${ink.join(',')}`).toBe(false);
    }
  });

  it('is never quite solid: a far thing has the air in it', () => {
    for (const { role, kind } of roles) expect(role.alpha, kind).toBeLessThanOrEqual(0.9);
  });

  it('is big enough on a phone to be known, where it is meant to be', () => {
    const known = roles.filter(({ role }) => role.known);
    expect(known.length).toBeGreaterThan(0);
    for (const { place, kind, role } of known) {
      const tall = WALK.tall * role.size * PHONE.px(LIFE[place]!.slots[role.slot]!.z);
      expect(tall, `${place} ${kind}`).toBeGreaterThanOrEqual(12);
    }
  });

  it('shows the bog its moose as the audit measured it: about 34 px tall on a phone and 69 on a tablet', () => {
    const z = LIFE.bog!.slots[0]!.z;
    const tall = WALK.tall * LIFE.bog!.roles.moose!.size;
    expect(tall * PHONE.px(z)).toBeGreaterThan(32);
    expect(tall * PHONE.px(z)).toBeLessThan(38);
    expect(tall * TABLET.px(z)).toBeGreaterThan(64);
    expect(tall * TABLET.px(z)).toBeLessThan(74);
  });
});

describe('the plan', () => {
  const STAGES: Record<string, LifeStage[]> = {
    bog: [{ kind: 'cranes', from: 30, to: 40 }, { kind: 'moose', from: 60, to: 70 }, { kind: 'cranes', from: 100, to: 400 }],
    forest: [{ kind: 'moose', from: 20, to: 400 }],
    garden: [{ kind: 'geese', from: 20, to: 60 }, { kind: 'geese', from: 100, to: 400 }],
    village: [{ kind: 'geese', from: 20, to: 400 }],
    dusk: [],
  };

  it('has nothing for a place without life', () => {
    expect(lifePlan('home')).toBeNull();
  });

  it('draws nothing while the stage is empty, where nothing is always there', () => {
    const plan = lifePlan('bog', STAGES.bog)!;
    let drawn = 0;
    run(plan, 20, () => ({ x: 5 }), ({ count, on }) => {
      if (on || count) drawn++;
    });
    expect(drawn).toBe(0);
  });

  for (const speed of [0.4, 1.3, 3.5]) {
    it(`keeps its rules for ten minutes at ${speed} EL a second`, () => {
      for (const place of places) {
        for (const lensed of [PHONE, TABLET]) {
          const plan = lifePlan(place, STAGES[place], 3)!;
          const broken: string[] = [];
          let was: string | null = null;
          let left = -Infinity;
          let shows = 0;
          // He goes on and comes back, and is busy for three seconds in every eleven.
          const at = (clock: number): Partial<Watch> => ({
            x: 200 - Math.abs(200 - ((clock * speed) % 400)), busy: clock % 11 < 3, night: place === 'dusk' ? Math.min(1, clock / 30) : 0,
            eye: lensed.eye, slope: lensed.slope,
          });
          run(plan, 600, at, ({ clock, count, on, watch: now }) => {
            if (count > QUADS) broken.push(`${count} quads at ${clock}`);
            if (on === was) return;
            if (on === null) left = clock;
            else {
              // One thing at a time: the stage is empty between two.
              if (was !== null) broken.push(`${on} came while ${was} was on stage`);
              if (now.busy) broken.push(`${on} began while he was busy`);
              if (clock < FIRST) broken.push(`${on} began at ${clock}`);
              if (clock - left < GAP) broken.push(`${on} came ${clock - left} s after the last`);
              shows++;
            }
            was = on;
          }, 20);
          expect(broken, place).toEqual([]);
          // Each stage is played once a visit at most.
          expect(shows).toBeLessThanOrEqual(STAGES[place]!.length);
          if (place === 'bog' && speed < 3) expect(shows).toBeGreaterThanOrEqual(2);
        }
      }
    });
  }

  /** Whether the thing comes in the visit this seed stands for: some come in one visit of three. */
  function comes(place: PlaceId, kind: string, seed: number): boolean {
    const plan = lifePlan(place, [{ kind, from: 0, to: 10 }], seed)!;
    plan.step(watch({ x: 5, clock: FIRST }));
    return plan.on === kind;
  }

  it('lets the forest have its moose in one visit of three, and the bog in every one', () => {
    const visits = Array.from({ length: 600 }, (_, seed) => seed * 0.731);
    expect(visits.filter((seed) => comes('bog', 'moose', seed)).length).toBe(600);
    const forest = visits.filter((seed) => comes('forest', 'moose', seed)).length;
    expect(forest).toBeGreaterThan(160);
    expect(forest).toBeLessThan(240);
  });

  it('keeps each thing on stage for a while, and not for long', () => {
    for (const lensed of [PHONE, TABLET]) {
      for (const { place, kind } of roles) {
        const seed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((visit) => comes(place, kind, visit))!;
        const plan = lifePlan(place, [{ kind, from: 0, to: 10 }], seed)!;
        let began = NaN;
        let ended = NaN;
        run(plan, 120, () => ({ x: 5, eye: lensed.eye, slope: lensed.slope }), ({ clock, on }) => {
          if (on && Number.isNaN(began)) began = clock;
          if (!on && !Number.isNaN(began) && Number.isNaN(ended)) ended = clock;
        });
        expect(began, `${place} ${kind}`).toBeCloseTo(FIRST, 1);
        expect(ended - began, `${place} ${kind}`).toBeGreaterThanOrEqual(8);
        expect(ended - began, `${place} ${kind}`).toBeLessThanOrEqual(45);
      }
    }
  });

  it('walks at its stride over its cycle, so that no hoof slides', () => {
    for (const { place, kind, role } of roles.filter(({ role }) => role.act === 'walk')) {
      const plan = lifePlan(place, [], 0, kind)!;
      const xs: number[] = [];
      // It is on stage at once, and walks for some seconds before it stops.
      run(plan, 6, () => ({ x: 0 }), ({ clock, count }) => {
        if (clock > 2.5 && clock < 5 && count > 0) xs.push(plan.quads[0]!);
      });
      const cycle = 12 / WALK.fps;
      const frames = Math.round(cycle * 60);
      const went = xs[0]! - xs[frames]!;
      expect(went, `${place} ${kind} goes left`).toBeGreaterThan(0);
      expect(Math.abs(went - WALK.stride * role.size) / (WALK.stride * role.size), `${place} ${kind}`).toBeLessThan(0.01);
    }
  });

  it('lets the bog\'s moose stop, look up and walk on', () => {
    const plan = lifePlan('bog', [], 0, 'moose')!;
    const cells: number[] = [];
    let stood = 0;
    let wrong = 0;
    let last = NaN;
    // One crossing: with a kind named it would come again two seconds after it has left.
    run(plan, 22, () => ({ x: 0 }), ({ count }) => {
      if (count === 0) return;
      // Its two quads show one cell: the legs fade to the hooves, the body is whole.
      const [x, , , , u] = plan.quads;
      if (count !== 2 || plan.quads[STRIDE] !== x || plan.quads[12]! > plan.quads[11]! * 0.5) wrong++;
      if (x === last) stood++;
      last = x!;
      cells.push(u!);
    });
    expect(wrong).toBe(0);
    expect(stood / 60).toBeGreaterThan(3);
    expect(stood / 60).toBeLessThan(5);
    // Twelve walking cells and four standing ones.
    expect(new Set(cells.map((u) => Math.round(u * 1024))).size).toBeGreaterThanOrEqual(6);
  });

  it('puts a named kind on stage at once, for pictures', () => {
    for (const { place, kind } of roles) {
      const plan = lifePlan(place, [], 0, kind)!;
      plan.step(watch({ clock: 0, busy: true }));
      plan.step(watch({ clock: 1, busy: true }));
      expect(plan.on, `${place} ${kind}`).toBe(kind);
    }
  });

  it('begins nothing before its pictures have come, and says what is always there all the same', () => {
    // Half a minute on the stage with no pictures: nothing is on it, and nothing is drawn.
    const bog = lifePlan('bog', [{ kind: 'moose', from: 0, to: 10 }], 0)!;
    let drawn = 0;
    run(bog, 30, () => ({ x: 5, wait: true }), ({ count, on }) => {
      if (on || count) drawn++;
    });
    expect(drawn).toBe(0);
    // The stage was not used up unseen: it is played as soon as they are there.
    bog.step(watch({ x: 5, clock: 30.1 }));
    expect(bog.on).toBe('moose');
    // Not even a kind that is asked for by name begins.
    const named = lifePlan('bog', [], 0, 'cranes')!;
    for (const clock of [0, 3, 6]) named.step(watch({ clock, wait: true }));
    expect(named.on).toBeNull();
    named.step(watch({ clock: 6.1 }));
    expect(named.on).toBe('cranes');
    // Smoke and far windows are said from the first frame, to be drawn unseen with a clear picture: so the
    // place has as many draw calls before its pictures come as after.
    for (const [place, x] of [['dusk', 18], ['garden', 73]] as const) {
      const before = lifePlan(place, [], 0)!.step(watch({ x, clock: 2, wait: true }));
      expect(before, place).toBeGreaterThan(0);
      expect(before, place).toBe(lifePlan(place, [], 0)!.step(watch({ x, clock: 2 })));
    }
  });

  it('with reduced motion shows only what is always there, and the slow walkers', () => {
    for (const place of places) {
      const plan = lifePlan(place, STAGES[place], 3)!;
      const seen = new Set<string>();
      let most = 0;
      run(plan, 300, (clock) => ({ x: (clock * 1.3) % 400, calm: true, night: place === 'dusk' ? 1 : 0 }), ({ on, count }) => {
        if (on) seen.add(on);
        most = Math.max(most, count);
      });
      // Nothing flies, and no star falls: what is left is two quads of a walker, and the still members.
      if (place === 'bog') expect(most).toBe(2);
      if (place === 'dusk') expect(most).toBe(LIFE.dusk!.lights!.at.length + 2);
      for (const kind of seen) expect(LIFE[place]!.roles[kind]!.calm, `${place} ${kind}`).toBe(true);
    }
  });

  it('lights the valley one window at a time, and lets one star fall', () => {
    const cast = LIFE.dusk!.lights!;
    const plan = lifePlan('dusk', [], 5)!;
    const dots = (count: number) => Array.from({ length: count }, (_, i) => plan.quads[i * STRIDE + 11]!).filter((alpha) => alpha > 0.5).length;
    // The blue hour: the first few shine, and nothing else.
    const dusk = plan.step(watch({ x: 18, clock: 0 }));
    expect(dots(dusk)).toBeGreaterThanOrEqual(cast.lit);
    expect(dusk).toBeLessThanOrEqual(cast.lit + 2);
    // Night falls in three seconds; the windows take longer, and never two in the same quarter of a second.
    let before = dusk;
    let lastNew = -1;
    let stars = 0;
    let starAt = NaN;
    let falling = false;
    const soon: number[] = [];
    run(plan, 80, (clock) => ({ x: 18, night: Math.min(1, clock / 3) }), ({ clock, count }) => {
      const wide = Array.from({ length: count }, (_, i) => plan.quads[i * STRIDE + 2]!);
      const star = wide.some((w) => w > 2);
      if (star && !falling) { starAt = clock; stars++; }
      falling = star;
      const lit = wide.filter((w) => Math.abs(w - cast.size) < 1e-6).length;
      if (lit > before) {
        if (clock - lastNew <= 0.25 || lit > before + 1) soon.push(clock);
        lastNew = clock;
        before = lit;
      }
    });
    expect(soon).toEqual([]);
    expect(before).toBe(cast.at.length);
    expect(stars).toBe(1);
    expect(starAt - 3).toBeGreaterThanOrEqual(20);
    expect(starAt - 3).toBeLessThanOrEqual(41);
  });

  it('gives a chimney six puffs that rise and thin out', () => {
    const plan = lifePlan('garden', [], 0)!;
    const count = plan.step(watch({ x: 73, clock: 12 }));
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(12);
    for (let i = 0; i < count; i++) {
      const [, y, w, , , , , , , , , alpha] = plan.quads.subarray(i * STRIDE);
      expect(alpha).toBeLessThanOrEqual(LIFE.garden!.smoke!.alpha);
      // A puff is 0.8 EL where it leaves the chimney and 2.5 where it is gone.
      expect(w).toBeGreaterThanOrEqual(0.8);
      expect(w).toBeLessThanOrEqual(2.5);
      expect(y! + w! / 2).toBeGreaterThan(6);
    }
  });
});

describe('the stages in the chapters', () => {
  const staged = Object.values(COURSES).filter((chapter) => chapter.life?.length);

  /**
   * Calm ground (the audit's rule): no hook, ledge, hidden candy, soft tussock or family member within 8 EL
   * of the stretch, and no ride, hose or gust over it. And where an animal walks on the far ground, nothing
   * to use within 8 EL either: it must never stand behind a thing that has the game's diamond over it.
   */
  function trouble(chapter: ChapterData, stage: LifeStage): string[] {
    const near = (x: number, half = 0) => x + half > stage.from - 8 && x - half < stage.to + 8;
    const over = (from: number, to: number) => to > stage.from && from < stage.to;
    const walks = LIFE[chapter.place!]?.roles[stage.kind]?.act === 'walk';
    return [
      ...(chapter.spots ?? []).filter((spot) => walks && spot.look !== undefined && near(spot.at.x)).map((spot) => `${spot.id} to use at ${spot.at.x}`),
      ...(chapter.hooks ?? []).filter((hook) => near(hook.x)).map((hook) => `hook at ${hook.x}`),
      ...(chapter.ledges ?? []).filter((ledge) => near(ledge.x, ledge.width / 2)).map((ledge) => `ledge at ${ledge.x}`),
      ...(chapter.hidden ?? []).filter((candy) => near(candy.x)).map((candy) => `hidden candy at ${candy.x}`),
      ...(chapter.tussocks ?? []).filter((tussock) => near(tussock.x, tussock.width / 2)).map((tussock) => `soft tussock at ${tussock.x}`),
      ...[...(chapter.spots ?? []).map((spot) => ({ look: spot.look, word: spot.word, x: spot.at.x })), ...(chapter.decor ?? []).map((decor) => ({ look: decor.look, word: decor.word, x: decor.at.x }))]
        .filter((sign) => sign.look === 'sign' && personFor(sign.word) !== null && near(sign.x)).map((sign) => `${personFor(sign.word)} at ${sign.x}`),
      ...(chapter.rides ?? []).filter((ride) => over(Math.min(ride.from.x, ride.to.x), Math.max(ride.from.x, ride.to.x))).map((ride) => `the ride ${ride.id}`),
      ...(chapter.climbs ?? []).filter((climb) => over(climb.x - 1, climb.x + 1)).map((climb) => `a hose at ${climb.x}`),
      ...(chapter.gusts ?? []).filter((gust) => over(gust.from, gust.to)).map((gust) => `a gust from ${gust.from}`),
    ];
  }

  it('are there, in the places that have life', () => {
    expect(staged.map((chapter) => chapter.id).sort()).toEqual(['garden', 'granskog', 'myren']);
  });

  it('name kinds their place has, on stretches of the chapter', () => {
    for (const chapter of staged) {
      const cast = LIFE[chapter.place!];
      expect(cast, chapter.id).toBeDefined();
      for (const stage of chapter.life!) {
        expect(cast!.roles[stage.kind], `${chapter.id} ${stage.kind}`).toBeDefined();
        expect(stage.to).toBeGreaterThan(stage.from);
        expect(stage.from).toBeGreaterThanOrEqual(chapter.ground[0]!.x);
        expect(stage.to).toBeLessThanOrEqual(chapter.goalX);
      }
    }
  });

  it('lie on calm ground', () => {
    for (const chapter of staged) for (const stage of chapter.life!) expect(trouble(chapter, stage), `${chapter.id} ${stage.kind} at ${stage.from}`).toEqual([]);
  });

  it('begin at a big candy or just after one, where he stops anyway', () => {
    for (const chapter of staged) {
      for (const stage of chapter.life!) {
        const candies = (chapter.checkpoints ?? []).map((candy) => candy.x);
        expect(candies.some((x) => x >= stage.from - 10 && x <= stage.to), `${chapter.id} ${stage.kind} at ${stage.from}`).toBe(true);
      }
    }
  });

  it('are data for the picture: no simulation code reads them', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((file) => (file.isDirectory() ? files(join(dir, file.name)) : [join(dir, file.name)]));
    for (const file of [...files('src/sim'), 'src/app/game.ts']) {
      const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(/\.life\b|content\/life|life-plan/.test(source), file).toBe(false);
    }
  });

  it('would not pass on ground that is not calm', () => {
    const myren = COURSES.myren!;
    // Under the rings between the dead pines, beside Mamma, on the soft tussocks, and by the ghost's lollipop.
    for (const from of [112, 96.5, 60, 138]) expect(trouble(myren, { kind: 'moose', from, to: from + 3 }).length, `${from}`).toBeGreaterThan(0);
  });
});
