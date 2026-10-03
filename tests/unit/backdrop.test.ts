import { describe, expect, it } from 'vitest';
import { farLayers } from '../../src/render/backdrop';
import { PLACES } from '../../src/render/dressing';
import type { PlaceId } from '../../src/sim/types';

const places = Object.keys(PLACES) as PlaceId[];
const outdoors = places.filter((place) => place !== 'home');

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

  it('sinks the nearer layers more than the farther ones when he climbs, and only a little', () => {
    for (const place of outdoors) {
      const layers = farLayers(place);
      for (const [i, layer] of layers.entries()) {
        expect(layer.sink, place).toBeGreaterThanOrEqual(0);
        expect(layer.sink, place).toBeLessThanOrEqual(0.5);
        if (i > 0) expect(layer.sink, place).toBeGreaterThanOrEqual(layers[i - 1]!.sink);
      }
    }
  });

  it('lets only the sky drift, and slowly', () => {
    for (const place of outdoors) {
      for (const [i, layer] of farLayers(place).entries()) {
        if (i > 0) expect(layer.drift, place).toBe(0);
        expect(layer.drift, place).toBeLessThanOrEqual(0.5);
      }
    }
  });
});
