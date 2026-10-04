import { describe, expect, it, vi } from 'vitest';
import { CompressedTexture, DataTexture, RGBA_S3TC_DXT1_Format, type Texture, type WebGLRenderer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createTextureOwnership } from '../../src/render/texture-ownership';

const texture = (value = 7) => new CompressedTexture([
  { data: new Uint8Array(8).fill(value), width: 4, height: 4 },
  { data: new Uint8Array(8).fill(value), width: 2, height: 2 },
], 4, 4, RGBA_S3TC_DXT1_Format);
function model(...textures: [Texture, number | undefined][]): Pick<GLTF, 'parser'> {
  return { parser: { associations: new Map(textures.map(([t, index]) => [t, { textures: index }])) } as GLTF['parser'] };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(reload = vi.fn(async (_url: string) => model([texture(), 0]))) {
  let lost = false;
  const uploaded: { object: Texture; data: number[] }[] = [];
  const renderer = {
    getContext: () => ({ isContextLost: () => lost }),
    initTexture: (t: CompressedTexture) => {
      expect(t.mipmaps.length).toBeGreaterThan(0);
      uploaded.push({ object: t, data: [...t.mipmaps[0]!.data] });
      t.onUpdate?.(t);
    },
  } as unknown as Pick<WebGLRenderer, 'getContext' | 'initTexture'>;
  const owner = createTextureOwnership(renderer, reload);
  return { owner, uploaded, reload, setLost: (value: boolean) => { lost = value; } };
}

describe('immutable pack texture ownership', () => {
  it('releases mip arrays only after actual upload and preserves dimensions, callbacks and texture identity', () => {
    const { owner, uploaded } = fixture();
    const one = texture();
    const callback = vi.fn();
    one.onUpdate = callback;
    owner.track('/model.glb?v=one', model([one, 0]));
    expect(uploaded[0]).toEqual({ object: one, data: Array(8).fill(7) });
    expect(callback).toHaveBeenCalledWith(one);
    expect(one.image).toEqual({ width: 4, height: 4 });
    expect(one.mipmaps).toEqual([]);
    expect(owner.info()).toEqual({ managed: 1, released: 1, cpuBytes: 0, restores: 0 });
  });
  it('uploads all shared aliases before releasing any CPU payload', () => {
    const { owner, uploaded } = fixture();
    const one = texture();
    const other = one.clone();
    const before = other.onUpdate;
    other.onUpdate = (t) => { expect(one.mipmaps[0]!.data.byteLength).toBe(8); before?.(t); };
    owner.track('/model.glb?v=one', model([one, 0], [other, 0]));
    expect(uploaded).toHaveLength(2);
    expect(one.mipmaps).toEqual([]);
    expect(other.mipmaps).toEqual([]);
  });
  it('retains unsupported or unmapped data instead of risking a blank texture', () => {
    const { owner, uploaded } = fixture();
    const unmapped = texture();
    const procedural = new DataTexture(new Uint8Array(16), 2, 2);
    owner.track('/model.glb?v=one', model([unmapped, undefined], [procedural, 0]));
    expect(uploaded).toEqual([]);
    expect(unmapped.mipmaps[0]!.data.byteLength).toBe(8);
    expect(procedural.image.data!.byteLength).toBe(16);
  });
  it('refetches the same version and transplants fresh pixels into the original texture object', async () => {
    const reload = vi.fn(async (_url: string) => model([texture(9), 0]));
    const { owner, uploaded } = fixture(reload);
    const one = texture();
    one.offset.set(0.2, 0.4);
    owner.track('/model.glb?v=unchanged', model([one, 0]));
    owner.suspend();
    await owner.restore();
    expect(reload).toHaveBeenCalledWith('/model.glb?v=unchanged');
    expect(uploaded.at(-1)).toEqual({ object: one, data: Array(8).fill(9) });
    expect(one.offset.toArray()).toEqual([0.2, 0.4]);
    expect(owner.info()).toEqual({ managed: 1, released: 1, cpuBytes: 0, restores: 1 });
  });
  it('can recover before initial upload without refetching retained pixels', async () => {
    const { owner, uploaded, reload, setLost } = fixture();
    setLost(true);
    owner.suspend();
    owner.track('/model.glb?v=one', model([texture(), 0]));
    expect(uploaded).toEqual([]);
    expect(owner.info().cpuBytes).toBe(16);
    setLost(false);
    await owner.restore();
    expect(reload).not.toHaveBeenCalled();
    expect(uploaded).toHaveLength(1);
    expect(owner.info().cpuBytes).toBe(0);
  });
  it('stages all packs before mutation, rejects a missing mapping, and retries safely', async () => {
    let broken = true;
    const reload = vi.fn(async (url: string) => model([texture(9), broken && url.includes('two') ? 1 : 0]));
    const { owner, uploaded } = fixture(reload);
    owner.track('/one.glb?v=1', model([texture(), 0]));
    owner.track('/two.glb?v=2', model([texture(), 0]));
    owner.suspend();
    await expect(owner.restore()).rejects.toThrow('does not match');
    expect(uploaded).toHaveLength(2);
    expect(owner.info().restores).toBe(0);
    broken = false;
    await owner.restore();
    expect(uploaded).toHaveLength(4);
    expect(owner.info().cpuBytes).toBe(0);
  });
  it('a later loss invalidates a pending restoration without replacing newer pixels', async () => {
    const first = deferred<Pick<GLTF, 'parser'>>();
    const reload = vi.fn(async (_url: string) => model([texture(9), 0]));
    reload.mockReturnValueOnce(first.promise);
    const { owner, uploaded } = fixture(reload);
    owner.track('/model.glb?v=one', model([texture(), 0]));
    owner.suspend();
    const stale = owner.restore();
    owner.suspend();
    await owner.restore();
    first.resolve(model([texture(1), 0]));
    await expect(stale).rejects.toThrow('interrupted');
    expect(uploaded).toHaveLength(2);
    expect(uploaded.at(-1)!.data).toEqual(Array(8).fill(9));
  });
  it('includes assets that arrive while a restore request is pending', async () => {
    const pending = deferred<Pick<GLTF, 'parser'>>();
    const { owner, uploaded } = fixture(vi.fn(() => pending.promise));
    owner.track('/one.glb?v=1', model([texture(), 0]));
    owner.suspend();
    const ready = owner.restore();
    owner.track('/two.glb?v=2', model([texture(5), 0]));
    expect(uploaded).toHaveLength(1);
    pending.resolve(model([texture(9), 0]));
    await ready;
    expect(uploaded.map((u) => u.data[0])).toEqual([7, 9, 5]);
    expect(owner.info()).toMatchObject({ managed: 2, released: 2, cpuBytes: 0 });
  });
});
