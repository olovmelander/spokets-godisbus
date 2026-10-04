import { readFileSync } from 'node:fs';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { KINDS } from '../../src/content/kinds';
import { installSweets, type CandyKit, type SweetSocket } from '../../src/render/candy';
import { saturdayBag } from '../../src/render/saturday-bag';
import { albumHtml } from '../../src/ui/album';
import { STICKER_SHEET, stickerStyle } from '../../src/ui/sticker';

const generator = readFileSync(new URL('../../art/blender/candy-stickers.py', import.meta.url), 'utf8');

describe('the stickers of the hidden candy', () => {
  it('are rendered in the order the game looks them up in', () => {
    const order = [...generator.match(/ORDER = \[([^\]]+)\]/)![1]!.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(order).toEqual(Object.keys(KINDS));
    expect(Number(generator.match(/^ACROSS = (\d+)/m)![1])).toBe(STICKER_SHEET.across);
    expect(Number(generator.match(/^DOWN = (\d+)/m)![1])).toBe(STICKER_SHEET.down);
    expect(STICKER_SHEET.across * STICKER_SHEET.down).toBeGreaterThanOrEqual(order.length);
  });

  it('each has a place of its own in the sheet, and keeps its kind\'s colours', () => {
    const places = Object.keys(KINDS).map((kind) => stickerStyle(kind).match(/--sx:(\d+);--sy:(\d+)/)!.slice(1).join(','));
    expect(new Set(places).size).toBe(16);
    expect(stickerStyle('gelehallon')).toContain('--sx:0;--sy:0');
    expect(stickerStyle('chokladkola')).toContain('--sx:0;--sy:1');
    expect(stickerStyle('chokladpralin')).toContain('--sx:3;--sy:2');
    expect(stickerStyle('polkagris')).toContain(`--colour:${KINDS.polkagris!.colour}`);
    expect(stickerStyle('something else')).toBe('');
  });

  it('in the album a found kind is a picture, and the keepsake keeps its round mark', () => {
    const album = albumHtml(['gummiorm'], [], ['vittra']);
    expect(album).toContain(`<i class="kind" style="${stickerStyle('gummiorm')}"></i>`);
    expect(album.match(/class="kind"/g)).toHaveLength(1);
    expect(album).toContain('data-keepsake="vittra"><i style="--colour:#f2df9a');
  });
});

describe('Elof\'s Saturday bag', () => {
  const kit = (...names: string[]): CandyKit => {
    const shapes = new Map(names.map((name) => [name, new BoxGeometry(1, 1, 1)]));
    return { shape: (name) => shapes.get(name), material: new MeshStandardMaterial(), paper: new MeshStandardMaterial() };
  };
  const tear = (bag: Group) => bag.getObjectByName('saturday-bag-tear')!;

  it('is built from boxes until the kit has come, with its tear hidden', () => {
    const bag = saturdayBag();
    expect(bag.name).toBe('saturday-bag');
    expect(tear(bag).visible).toBe(false);
    const asked = bag.children.map((child) => (child.userData.sweet as SweetSocket).shape);
    expect(asked).toEqual(['lordagspase', 'reva']);
    expect((bag.children[0]!.children[0] as InstancedMesh).isInstancedMesh).toBe(true);
  });

  it('becomes the bag from Blender, in paper, and its tear is still the story\'s to show', () => {
    const bag = saturdayBag();
    const has = kit('lordagspase', 'reva');
    tear(bag).visible = true;
    expect(installSweets(bag, has)).toBe(2);
    const body = bag.children[0]!.children[0] as Mesh;
    expect(body.geometry).toBe(has.shape('lordagspase'));
    expect(body.material).toBe(has.paper);
    expect(tear(bag).visible).toBe(true);
    expect((tear(bag).children[0] as Mesh).geometry).toBe(has.shape('reva'));
    expect(tear(bag).position.z).toBeGreaterThan(0.15);
  });

  it('two bags never share a stand-in, so replacing one leaves the other whole', () => {
    const one = saturdayBag(), other = saturdayBag();
    const mesh = (bag: Group) => bag.children[0]!.children[0] as InstancedMesh;
    expect(mesh(one).geometry).not.toBe(mesh(other).geometry);
    expect(mesh(one).material).not.toBe(mesh(other).material);
    expect(mesh(one).material).not.toBe((tear(one).children[0] as InstancedMesh).material);
  });
});
