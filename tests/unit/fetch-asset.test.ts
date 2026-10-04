import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAsset } from '../../src/render/fetch-asset';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('required asset requests', () => {
  it('retries transient failures without changing the offline build version URL', async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValue(new Response('ready'));
    vi.stubGlobal('fetch', request);
    const result = fetchAsset('/packs/boot/big-candy.glb?v=unchanged', (r) => r.text());
    await vi.runAllTimersAsync();
    expect(await result).toBe('ready');
    expect(request).toHaveBeenCalledTimes(3);
    for (const [url] of request.mock.calls) expect(url).toBe('/packs/boot/big-candy.glb?v=unchanged');
  });

  it('stops after the initial request and three retries, including interrupted response bodies', async () => {
    vi.useFakeTimers();
    const request = vi.fn(async () => ({ ok: true, text: async () => { throw new TypeError('body interrupted'); } }));
    vi.stubGlobal('fetch', request);
    const result = fetchAsset('/asset?v=1', (r) => r.text()).catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(TypeError);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('aborts stalled requests and exhausts a bounded retry budget', async () => {
    vi.useFakeTimers();
    const request = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    vi.stubGlobal('fetch', request);
    const result = fetchAsset('/asset?v=1', (r) => r.text()).catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(new Error('aborted'));
    expect(request).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});
