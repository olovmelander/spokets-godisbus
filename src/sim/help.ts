import type { Sim } from './sim';
import type { ChapterData, Vec, Verb } from './types';
import { ELOF_HALF_WIDTH } from './constants';

/**
 * What the helper would show now (plan §4.6): the next thing along the way that the story needs him to do,
 * and the word Använd would say there. Where nothing of that kind is near, it is the next candy of the
 * trail: the trail is the way.
 *
 * It never says how. It is worked out from the game as it stands, so it can't point at something that is
 * already done, or that can't be done yet.
 */
export interface Hint {
  at: Vec;
  /** What Använd does there, or null where the way is simply on along the trail. */
  verb: Verb | null;
  word: string | null;
}

/** Something to do further off than this is not the next thing: the trail leads there. */
export const HINT_REACH = 12;

/** A push begins from its correct side. The weight puzzle deliberately revisits a passed landmark. */
export function counterweightTarget(sim: Sim, chapter: ChapterData): Hint | null {
  const puzzle = chapter.counterweight, p = sim.curr;
  if (!puzzle || p.x < puzzle.from || p.x > puzzle.to || sim.flags.has(puzzle.launch)) return null;
  const spot = (id: string) => chapter.spots?.find((s) => s.id === id);
  if (!sim.flags.has(puzzle.call)) {
    const call = spot(puzzle.call);
    return call ? { at: call.at, verb: call.verb, word: call.word ?? null } : null;
  }
  const heavy = sim.movers.find((m) => m.def.id === puzzle.heavy);
  if (!heavy) return null;
  if (sim.flags.has(`placed:${puzzle.heavy}`)) {
    const launch = spot(puzzle.launch);
    return launch ? { at: launch.at, verb: launch.verb, word: launch.word ?? null } : null;
  }
  const trial = spot(puzzle.trial);
  if (trial && !sim.flags.has(trial.id) && trial.needs !== undefined && sim.flags.has(trial.needs)) {
    return { at: trial.at, verb: trial.verb, word: trial.word ?? null };
  }
  const stance = heavy.x - heavy.def.width / 2 - ELOF_HALF_WIDTH - 0.12;
  if (p.x > stance + 0.05 || Math.abs(p.y - heavy.y) > 0.3) return { at: { x: stance, y: heavy.y }, verb: null, word: null };
  return { at: { x: heavy.x, y: heavy.y + heavy.def.height }, verb: heavy.def.verb, word: null };
}

export function hintFor(sim: Sim, chapter: ChapterData): Hint | null {
  const p = sim.curr;
  if (sim.prologue?.frame) return null;
  if (chapter.prologue && sim.flags.has('pappa:done') && !sim.flags.has('goal')) {
    return { at: { x: chapter.goalX, y: chapter.prologue.railing.y - 2.2 }, verb: null, word: null };
  }
  const has = (flag?: string) => flag === undefined || sim.flags.has(flag);
  // A raised route can overlap ordinary ground in x (the anthill's other side). Its landing heights,
  // not the airborne feet, distinguish a deliberate climb from an ordinary jump or the ant ride.
  const route = chapter.challenges?.find((r) => p.x >= r.from && p.x <= r.to && p.y >= r.above &&
    r.steps.some((at) => Math.hypot(at.x - p.x, at.y - p.standY) <= 2.5));
  if (route && !has(route.needs)) {
    const missing = chapter.spots?.find((spot) => spot.id === route.needs);
    if (missing) return { at: missing.at, verb: missing.verb, word: missing.word ?? null };
  }
  if (route && has(route.needs)) {
    const found = sim.flags.has(`found:${route.reward}`);
    if (found && !route.backtrack) return { at: route.return, verb: null, word: null };
    // Find the nearest landing, then show the next. Never use the live position of a moving platform:
    // repeated taps must progress from looking, to pointing, to the demonstration at the same place.
    let nearest = 0;
    let distance = Infinity;
    for (const [i, at] of route.steps.entries()) {
      const d = Math.hypot(at.x - p.x, at.y - p.standY);
      if (d < distance) { distance = d; nearest = i; }
    }
    // A missed jump may reset a light sequence while the bubble returns onto an upper ledge.
    // Guide back to the first unfinished light instead of pointing at its still-hidden successor.
    if (found && nearest === 0) return { at: route.return, verb: null, word: null };
    const pending = route.pending?.find((id) => !sim.flags.has(id));
    const light = pending ? chapter.spots?.find((spot) => spot.id === pending) : undefined;
    let target = found ? 0 : route.steps.length - 1;
    if (light) {
      let nearestLight = Infinity;
      for (const [i, at] of route.steps.entries()) {
        const d = Math.hypot(at.x - light.at.x, at.y - light.at.y);
        if (d < nearestLight) { nearestLight = d; target = i; }
      }
    }
    const at = route.steps[nearest + Math.sign(target - nearest)]!;
    return { at, verb: null, word: null };
  }
  // In the authored hub, a chosen local action is valid too (small cone, trial or berry gift).
  // Beyond its reach, guide the required weight/return route instead of whichever unfinished x is lowest.
  const weight = counterweightTarget(sim, chapter);
  const revisit = chapter.returnClue;
  const returning = revisit && has(revisit.gift) && !has(revisit.clue) && p.x >= revisit.from && p.x <= revisit.to;
  if (weight || returning || (revisit && p.x >= revisit.from && p.x <= revisit.to && p.y >= revisit.root.top - 1)) {
    const action = sim.actionAt;
    if (action && p.verb !== null && p.verb !== 'grab') return { at: action, verb: p.verb, word: p.word };
    if (weight) return weight;
    if (returning) {
      if (!has(revisit.away)) return { at: { x: revisit.root.x, y: revisit.root.top }, verb: 'slide', word: null };
      if (p.y < revisit.root.top - 1) return { at: { x: revisit.root.x, y: revisit.root.top }, verb: null, word: null };
      return { at: revisit.door, verb: null, word: null };
    }
  }
  const things: Hint[] = [];
  // Things to use, once what they wait for has happened. One he only has to touch is on the trail anyway.
  for (const spot of chapter.spots ?? []) {
    if (spot.extra || spot.touch || sim.flags.has(spot.id) || !has(spot.needs)) continue;
    things.push({ at: spot.at, verb: spot.verb, word: spot.word ?? null });
  }
  // Things on rails that are not yet where they belong, and that he moves himself.
  for (const mover of sim.movers) {
    const def = mover.def;
    if (def.extra || def.optional || def.cycle || def.on !== undefined || mover.stop >= def.stops.length - 1 || !has(def.needs)) continue;
    const ring = def.verb === 'pull' ? (def.ring ?? { x: 0, y: def.height }) : { x: 0, y: def.height };
    things.push({ at: { x: mover.x + ring.x, y: mover.y + ring.y }, verb: def.verb, word: null });
  }
  // Hooks he has not swung past.
  for (const hook of chapter.hooks ?? []) {
    if (hook.extra || (hook.land?.x ?? hook.x + hook.length) <= p.x + 0.5) continue;
    things.push({ at: { x: hook.x, y: hook.y }, verb: 'lace', word: null });
  }
  // What he stands at comes first: where several things may be done in any order, it is the one in reach.
  const beside = things.filter((thing) => Math.abs(thing.at.x - p.x) <= 1.3).sort((a, b) => Math.abs(a.at.x - p.x) - Math.abs(b.at.x - p.x))[0];
  if (beside) return beside;
  // Otherwise the first along the way. One he walked past is still the next thing.
  things.sort((a, b) => a.at.x - b.at.x);
  const next = things[0] ?? null;
  if (next && next.at.x - p.x < HINT_REACH) return next;
  const candy = chapter.candy.find((c, i) => !sim.collected[i] && c.x > p.x + 0.5 && has(c.after));
  return candy ? { at: { x: candy.x, y: candy.y }, verb: null, word: null } : next;
}
