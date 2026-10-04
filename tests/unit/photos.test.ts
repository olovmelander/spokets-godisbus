import { describe, expect, it, vi } from 'vitest';
import { createPhotoMoments, PHOTO_MOMENTS } from '../../src/content/photos';
import { captureFrame } from '../../src/render/capture';
import { createPhotoStore, PHOTO_MAX_BYTES } from '../../src/save/photos';

describe('authored photo moments', () => {
  it('captures exactly the seven planned story moments, after they settle', () => {
    const examples = [
      ['prolog', 'star', 'ride', 'shrinking', 0.55], ['garden', '', 'swing', 'swing', 0.25],
      ['garden', 'moa', 'ride', 'plane', 1.5], ['granskog', 'cap', 'ride', 'cap', 1.5],
      ['berget', 'flight', 'ride', 'crane', 2], ['norrsken', 'taste', 'free', 'aurora', 2.8],
      ['epilog', 'dots', 'free', 'carving', 0.3],
    ] as const;
    expect(PHOTO_MOMENTS.length).toBeLessThanOrEqual(10);
    for (const [chapter, flag, mode, expected, delay] of examples) {
      const tick = createPhotoMoments(chapter, new Set());
      expect(tick({ mode }, new Set(flag ? [flag] : []), delay - 0.01)).toBeNull();
      expect(tick({ mode }, new Set(flag ? [flag] : []), 0.02)).toBe(expected);
      expect(tick({ mode }, new Set(flag ? [flag] : []), 10)).toBeNull();
    }
  });

  it('does not photograph old saved flags or unrelated rides', () => {
    expect(createPhotoMoments('epilog', new Set(['dots']))({ mode: 'free' }, new Set(['dots']), 1)).toBeNull();
    const garden = createPhotoMoments('garden', new Set());
    expect(garden({ mode: 'ride' }, new Set(), 5)).toBeNull();
    expect(garden({ mode: 'free' }, new Set(['moa']), 5)).toBeNull();
    expect(createPhotoMoments('testbana', new Set())({ mode: 'swing' }, new Set(), 5)).toBeNull();
  });

  it('freezes the delay on pause and waits for a continuous swing', () => {
    const tick = createPhotoMoments('garden', new Set());
    expect(tick({ mode: 'swing' }, new Set(), 0.2)).toBeNull();
    expect(tick({ mode: 'swing' }, new Set(), 0)).toBeNull();
    expect(tick({ mode: 'free' }, new Set(), 0.1)).toBeNull();
    expect(tick({ mode: 'swing' }, new Set(), 0.1)).toBeNull();
    expect(tick({ mode: 'swing' }, new Set(), 0.2)).toBe('swing');
  });
});

describe('photo storage failures', () => {
  const frame = { player: 'elof', moment: 'crane' as const, blob: new Blob(['frame'], { type: 'image/webp' }) };
  it('quietly falls back without IndexedDB, or when access is denied', async () => {
    for (const factory of [null, { open: () => { throw new DOMException('Denied', 'SecurityError'); } } as unknown as IDBFactory]) {
      const store = createPhotoStore(factory);
      expect(await store.list('elof')).toEqual([]);
      expect(await store.put(frame)).toBe(false);
      expect(await store.clear('elof')).toBe(false);
    }
  });
  it('rejects unbounded and non-WebP blobs before opening storage', async () => {
    const open = vi.fn();
    const store = createPhotoStore({ open } as unknown as IDBFactory);
    expect(await store.put({ ...frame, blob: new Blob(['photo'], { type: 'image/png' }) })).toBe(false);
    expect(await store.put({ ...frame, blob: new Blob([new Uint8Array(PHOTO_MAX_BYTES + 1)], { type: 'image/webp' }) })).toBe(false);
    expect(await store.put({ ...frame, moment: 'unknown' as typeof frame.moment })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
  it('records a durable per-player deletion marker when IndexedDB is unavailable', async () => {
    const values = new Map<string, string>();
    const resets = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const store = createPhotoStore(null, resets);
    expect(await store.clear('elof')).toBe(true);
    const first = JSON.parse(values.get('godisbus.v1.photos.reset.elof')!);
    expect(first.pending).toBe(true);
    expect(typeof first.generation).toBe('string');
    expect(values.has('godisbus.v1.photos.reset.other')).toBe(false);
    expect(await store.clear('elof')).toBe(true);
    expect(JSON.parse(values.get('godisbus.v1.photos.reset.elof')!).generation).not.toBe(first.generation);
  });
  it('reports failure only when neither durable marking nor physical deletion succeeds', async () => {
    const resets = { getItem: () => null, setItem: () => { throw new DOMException('Denied', 'SecurityError'); } };
    expect(await createPhotoStore(null, resets).clear('elof')).toBe(false);
  });
});

describe('small WebGL frame copy', () => {
  it('copies before the asynchronous encoder and preserves aspect ratio', async () => {
    const drawImage = vi.fn();
    let encode: BlobCallback | undefined;
    const copy = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (callback: BlobCallback) => { encode = callback; } };
    const canvas = { width: 1440, height: 900, ownerDocument: { createElement: () => copy } } as unknown as HTMLCanvasElement;
    const result = captureFrame(canvas);
    expect(drawImage).toHaveBeenCalledWith(canvas, 0, 0, 576, 360);
    const blob = new Blob(['game'], { type: 'image/webp' });
    encode!(blob);
    expect(await result).toBe(blob);
  });
  it('tolerates denied capture and unsupported WebP', async () => {
    const copy = { getContext: () => ({ drawImage: () => {} }), toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })) };
    const canvas = { width: 10, height: 10, ownerDocument: { createElement: () => copy } } as unknown as HTMLCanvasElement;
    expect(await captureFrame(canvas)).toBeNull();
    copy.getContext = () => { throw new DOMException('Denied', 'SecurityError'); };
    expect(await captureFrame(canvas)).toBeNull();
  });
});
