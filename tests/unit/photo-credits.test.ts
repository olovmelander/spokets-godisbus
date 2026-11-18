import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPhotoAlbum } from '../../src/ui/photos';
import type { PhotoStore } from '../../src/save/photos';

/**
 * The credits' pages turn by themselves every 4 s (src/ui/photos.ts). A page he turns to by hand gets its full 4 s,
 * whichever way he turned, and nothing turns while the page cannot be seen (HANDOVER, autonomous QA of 16 November).
 */
class Node extends EventTarget {
  hidden = false;
  disabled = false;
  textContent = '';
  innerHTML = '';
  scrollTop = 0;
  offsetWidth = 1;
  isConnected = true;
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  constructor(readonly id = '') { super(); }
  setAttribute() {}
  removeAttribute() {}
  hasAttribute() { return false; }
  focus() {}
  getClientRects() { return [{}]; }
  closest() { return null; }
  querySelector() { return new Node(); }
  querySelectorAll() { return []; }
  replaceChildren() {}
  append() {}
}

function page() {
  const nodes = new Map<string, Node>();
  const win = { setInterval, clearInterval };
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    defaultView: win,
    getElementById: (id: string) => { if (!nodes.has(id)) nodes.set(id, new Node(id)); return nodes.get(id)!; },
    createElement: () => new Node(),
  });
  return { doc, byId: doc.getElementById };
}

const store = (n: number): PhotoStore => ({
  list: async () => Array.from({ length: n }, (_, i) => ({ player: 'elof', moment: (['shrinking', 'swing', 'plane', 'cap', 'crane', 'aurora'] as const)[i]!, blob: new Blob() })),
  put: async () => false,
  clear: async () => true,
} as unknown as PhotoStore);

describe('the credits turning by themselves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL() {} });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  async function open() {
    const { doc, byId } = page();
    const album = createPhotoAlbum(doc as unknown as Document, store(6), 'elof');
    await album.refresh();
    album.credits();
    // Six photos, two to a spread, and the thanks: four pages.
    const at = () => byId('photoCount').textContent.replace(' av ', ' / ');
    const click = (id: string) => byId(id).dispatchEvent(new Event('click'));
    const key = (key: string) => byId('photoAlbum').dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key }));
    return { doc, at, click, key };
  }

  it('turns every 4 s and stops on the thanks', async () => {
    const { at } = await open();
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(4000);
    expect(at()).toBe('2 / 4');
    vi.advanceTimersByTime(8000);
    expect(at()).toBe('4 / 4');
    vi.advanceTimersByTime(20000);
    expect(at()).toBe('4 / 4');
  });

  it('gives the page turned back to its full 4 s', async () => {
    const { at, click } = await open();
    vi.advanceTimersByTime(4000);
    vi.advanceTimersByTime(3000);
    click('photoPrevious');
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(3500);
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(500);
    expect(at()).toBe('2 / 4');
  });

  it('restarts the wait after the arrow keys, either way', async () => {
    const { at, key } = await open();
    vi.advanceTimersByTime(3000);
    key('ArrowRight');
    expect(at()).toBe('2 / 4');
    vi.advanceTimersByTime(3500);
    expect(at()).toBe('2 / 4');
    key('ArrowLeft');
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(3500);
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(500);
    expect(at()).toBe('2 / 4');
  });

  it('waits while the page is hidden, and gives the page its full 4 s when it is seen again', async () => {
    const { doc, at } = await open();
    vi.advanceTimersByTime(3000);
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60000);
    expect(at()).toBe('1 / 4');
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3500);
    expect(at()).toBe('1 / 4');
    vi.advanceTimersByTime(500);
    expect(at()).toBe('2 / 4');
  });

  it('does not start turning again after the book is closed', async () => {
    const { doc, at, click } = await open();
    click('photoClose');
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20000);
    expect(at()).toBe('1 / 4');
  });
});
