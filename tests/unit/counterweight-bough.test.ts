import { expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { buildLedges } from '../../src/render/ledges';

it('raises an existing branch continuously with the cone, without growing a new tree', () => {
  const ledge = granskog.ledges!.find(ledge => ledge.counterweight)!;
  const cone = granskog.movers!.find(mover => mover.id === ledge.counterweight!.mover)!;
  const home = cone.stops[0]!, tip = cone.stops.at(-1)!;
  const made = buildLedges([ledge], [], 'forest', [cone]);
  const lever = made.group.getObjectByName('weighted-bough')!;
  const twig = made.group.getObjectByName('weighted-step')!;
  expect(lever).toBeDefined();
  expect(twig).toBeDefined();
  expect(made.group.children).toHaveLength(1);
  const flags = new Set<string>();
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    made.update(flags, 0, [{ x: home.x + (tip.x - home.x) * k, y: home.y }]);
    expect(twig.position.y).toBeCloseTo(ledge.counterweight!.fromY + (ledge.y - ledge.counterweight!.fromY) * k);
    expect(twig.scale.toArray()).toEqual([1, 1, 1]);
    expect(twig.visible && lever.visible).toBe(true);
    expect(lever.scale.y).toBeGreaterThan(3);
  }
  // Flag changes cannot jump the picture ahead of the actual rolling cone.
  flags.add(ledge.needs!);
  made.update(flags, 1, [home]);
  expect(twig.position.y).toBe(ledge.counterweight!.fromY);
});
