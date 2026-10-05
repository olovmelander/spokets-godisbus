import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { norrsken } from '../../src/content/chapters/norrsken';
import { BOG_NEAR, back, evening, farLayers, sunk } from '../../src/render/backdrop';
import { PLACES } from '../../src/render/dressing';
import type { PlaceId } from '../../src/sim/types';

const places = Object.keys(PLACES) as PlaceId[];
const outdoors = places.filter((place) => place !== 'home');
/** How high Berget ends over where it begins: the old pine stands on the last ground before the end wall. */
const SUMMIT = berget.ground[berget.ground.length - 2]!.y - berget.ground[1]!.y;

describe('the far scenery', () => {
  it('gives every place outdoors a handful of layers, and none indoors', () => {
    for (const place of outdoors) {
      // The village's nearer layers are the far village behind its houses, drawn with them: here it has its sky and hills.
      expect(farLayers(place).length, place).toBeGreaterThanOrEqual(place === 'village' ? 2 : 4);
      // Each layer is a draw call that fills the picture: a place has few.
      expect(farLayers(place).length, place).toBeLessThanOrEqual(6);
    }
    expect(farLayers('home')).toEqual([]);
  });

  it('hangs the layers one behind the other, behind the mid-ground and inside what the camera sees', () => {
    for (const place of outdoors) {
      const depths = farLayers(place).map((layer) => layer.z);
      for (const [i, z] of depths.entries()) {
        // The mid-ground's trunks stand as far back as 22 EL. The camera sees 140 EL, and pulls back to
        // about 40 EL in front of the play plane in an upright picture.
        expect(z, place).toBeLessThan(-22);
        expect(z, place).toBeGreaterThanOrEqual(-95);
        if (i > 0) expect(z, place).toBeGreaterThan(depths[i - 1]!);
      }
    }
  });

  it('lets each layer pass at its own speed: the nearest stands in the world, the farthest goes nearly with the camera', () => {
    for (const place of outdoors) {
      const layers = farLayers(place);
      for (const [i, layer] of layers.entries()) {
        expect(layer.hold, place).toBeGreaterThan(0);
        expect(layer.hold, place).toBeLessThanOrEqual(1);
        // Clearly its own speed: at least a fifth more than the layer behind it.
        if (i > 0) expect(layer.hold, place).toBeGreaterThanOrEqual(layers[i - 1]!.hold * 1.2);
      }
      // The village's nearest far layer is the far village itself, which stands in the world behind its houses.
      if (place !== 'village') expect(layers[layers.length - 1]!.hold, place).toBe(1);
      expect(layers[0]!.hold, place).toBeLessThanOrEqual(0.3);
    }
  });

  it('keeps where the layers hang and how they pass: what lives among them is placed by these', () => {
    // The far scenery's life (the moose behind the bog's nearest spruces, the lights on the dusk's far hillside)
    // stands between two layers and passes at a speed between theirs. Change one here only together with it.
    const hung = (place: PlaceId) => farLayers(place).map((layer) => [layer.z, layer.hold]);
    expect(hung('bog')).toEqual([[-90, 0.08], [-78, 0.2], [-64, 0.38], [-50, 0.62], [-34, 1]]);
    expect(hung('mountain')).toEqual([[-90, 0.08], [-78, 0.2], [-64, 0.38], [-50, 0.62], [-36, 1]]);
    expect(hung('dusk')).toEqual(hung('mountain'));
    expect(hung('garden')).toEqual([[-90, 0.08], [-76, 0.24], [-62, 0.44], [-46, 0.7], [-32, 1]]);
    expect(hung('forest')).toEqual([[-78, 0.26], [-62, 0.46], [-46, 0.7], [-32, 1]]);
  });

  it('sinks the nearer layers more than the farther ones when he climbs, and none as fast as he climbs', () => {
    for (const place of outdoors) {
      const layers = farLayers(place);
      for (const [i, layer] of layers.entries()) {
        expect(layer.sink, place).toBeGreaterThanOrEqual(0);
        // Under a half: a layer that sank as fast as he climbed would be the ground, not the distance.
        expect(layer.sink, place).toBeLessThan(0.5);
        if (i > 0) expect(layer.sink, place).toBeGreaterThanOrEqual(layers[i - 1]!.sink);
      }
    }
  });

  it('lays the land under a summit: the nearest slope goes down 9 EL and stays, the far ridges hardly move', () => {
    const fell = farLayers('mountain');
    const nearest = fell[fell.length - 1]!;
    const farthest = fell[1]!;
    const summit = SUMMIT;
    expect(summit).toBeCloseTo(31.4, 6);
    expect(sunk(nearest.sink, summit)).toBe(9);
    expect(sunk(nearest.sink, 200)).toBe(9);
    expect(sunk(farthest.sink, summit)).toBeLessThan(2);
    // On the way up each ridge goes down clearly more than the one behind it: that is what opens the sky.
    for (let i = 2; i < fell.length; i++) expect(sunk(fell[i]!.sink, 20)).toBeGreaterThan(sunk(fell[i - 1]!.sink, 20) * 1.4);
    // Below where he began the layers rise, and by 5 EL at most.
    expect(sunk(nearest.sink, -4)).toBeCloseTo(-1.28, 6);
    expect(sunk(nearest.sink, -80)).toBe(-5);
    // The sky does not sink at all.
    expect(sunk(fell[0]!.sink, summit)).toBe(0);
  });

  it('shows the finale the horizon that Berget ends on', () => {
    // The finale is played on Berget's summit, but begins at height 0: its `outlook` says how high it stands.
    const summit = SUMMIT;
    expect(norrsken.place).toBe('dusk');
    expect(berget.place).toBe('mountain');
    expect(berget.outlook).toBeUndefined();
    const high = norrsken.outlook ?? 0;
    const dusk = farLayers('dusk');
    const mountain = farLayers('mountain');
    for (const [i, layer] of dusk.entries()) {
      // Each ridge lies within half an EL of where it lies behind the old pine.
      expect(Math.abs(sunk(layer.sink, high) - sunk(mountain[i]!.sink, summit)), String(layer.z)).toBeLessThan(0.5);
    }
  });

  it('moves the hour on the mountain after the flight, from the golden hour towards sunset and no further', () => {
    const from = berget.ground[0]!.x;
    const to = berget.ground[berget.ground.length - 1]!.x;
    // The flight lands at 64 to 72: until there the light stands still.
    expect(evening(from, from, to)).toEqual({ tint: [1, 1, 1], sky: 1 });
    expect(evening(60, from, to).sky).toBe(1);
    let before = 1;
    for (let x = 64; x <= to; x += 10) {
      const now = evening(x, from, to);
      expect(now.sky).toBeLessThanOrEqual(before);
      // Rose, not dark: red stays, green goes most, and the sky keeps most of its light.
      expect(now.tint[0]).toBe(1);
      expect(now.tint[1]).toBeLessThanOrEqual(now.tint[2]);
      expect(now.sky).toBeGreaterThanOrEqual(0.85);
      before = now.sky;
    }
    const last = evening(to, from, to);
    expect(last.sky).toBeCloseTo(0.85, 6);
    expect(last.tint[1]).toBeCloseTo(0.86, 6);
    expect(last.tint[2]).toBeCloseTo(0.92, 6);
    // A place whose ends are not given has no hour.
    expect(evening(50, 0, 0).sky).toBe(1);
  });

  it('lets only the sky drift, and slowly', () => {
    for (const place of outdoors) {
      for (const [i, layer] of farLayers(place).entries()) {
        if (i > 0) expect(layer.drift, place).toBe(0);
        expect(layer.drift, place).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('keeps the middle of the bog\'s nearest card open: a mire, with one group of spruces at its side', () => {
    const [from, to] = BOG_NEAR.open;
    // Two fifths of the picture, in its middle: the far shore and the mountain are seen through there, and
    // what lives on the bog walks there behind the card.
    expect(to - from).toBeGreaterThan(0.399);
    expect((from + to) / 2).toBeCloseTo(0.5, 6);
    for (const tree of BOG_NEAR.trees) {
      expect(tree.at, tree.kind).toBeGreaterThanOrEqual(0);
      expect(tree.at, tree.kind).toBeLessThan(1);
      // How far to a side each kind is drawn, as a part of its height (a spruce's boughs, a pine's widest
      // limb, a dead pine's longest), on a picture 84 EL wide: none reaches into the open part.
      const half = (tree.tall * { spruce: 0.2, pine: 0.5, snag: 0.36 }[tree.kind]) / 84;
      expect(tree.at + half <= from || tree.at - half >= to, `${tree.kind} at ${tree.at}`).toBe(true);
    }
    const kind = (name: string) => BOG_NEAR.trees.filter((tree) => tree.kind === name);
    const spruces = kind('spruce');
    expect(spruces.length).toBe(3);
    // One group: they stand within 8 EL of each other, and beside the open part, so that what walks out
    // into it comes from behind a spruce.
    const spots = spruces.map((tree) => tree.at);
    expect((Math.max(...spots) - Math.min(...spots)) * 84).toBeLessThan(8);
    expect(from - Math.max(...spots)).toBeLessThan(0.06);
    // The tallest keeps the bog's dark against the mist.
    expect(Math.max(...spruces.map((tree) => tree.tall))).toBeGreaterThanOrEqual(12);
    expect(kind('pine').length).toBe(6);
    for (const pine of kind('pine')) {
      expect(pine.tall).toBeGreaterThanOrEqual(2);
      expect(pine.tall).toBeLessThanOrEqual(5);
    }
    expect(kind('snag').length).toBe(3);
  });

  it('draws a hill\'s back through its points, and joins it where the picture repeats', () => {
    const wide = 512;
    const hill = back([[0.1, 0.2], [0.3, 1], [0.45, 0.6], [0.8, 0.1]], wide);
    for (const [along, high] of [[0.1, 0.2], [0.3, 1], [0.45, 0.6], [0.8, 0.1]] as const) expect(hill(along * wide)).toBeCloseTo(high, 6);
    for (const x of [-200, -1, 0, 37.5, 300, 511]) expect(hill(x + wide)).toBeCloseTo(hill(x), 9);
    // No step anywhere, the join included: a texel on, it has moved by a little.
    for (let x = -8; x < wide + 8; x++) expect(Math.abs(hill(x + 1) - hill(x)), String(x)).toBeLessThan(0.03);
  });
});
