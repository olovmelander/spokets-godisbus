import { describe, expect, it, vi } from 'vitest';
import { Box3, Vector3 } from 'three';
import { createHomeConsole, homeConsoleAvailable, type HomeConsoleSession } from '../../src/app/home-console';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { prolog, epilog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { createHomeRoutine } from '../../src/render/home-routine';
import { createHomeConsoleModel } from '../../src/render/home-console-model';

const free = { x: HOME_LAYOUT.television.x, y: 0, grounded: true, mode: 'free' as const };
const deferred = <T>() => {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

function setup() {
  const loading = deferred<HomeConsoleSession>();
  const remove = vi.fn(), host = { remove } as unknown as HTMLElement;
  const session: HomeConsoleSession = { element: host, suspend: vi.fn(), dispose: vi.fn(), debug: () => ({ race: 'ready' }) };
  const enter = vi.fn(), leave = vi.fn(), failed = vi.fn();
  const load = vi.fn(() => loading.promise);
  const console = createHomeConsole({ mount: () => host, load, enter, leave, failed });
  return { console, loading, session, load, enter, leave, failed, remove };
}

describe('the optional shared-home TV activity', () => {
  it('can be replayed at the same TV in each home, with no progress requirement or chapter flag', () => {
    for (const chapter of [prolog, epilog, stormkvall, morgonen]) {
      expect(homeConsoleAvailable(chapter, free, false), chapter.id).toBe(true);
      expect(homeConsoleAvailable(chapter, { ...free, x: free.x - 2.7, y: .5 }, false)).toBe(true);
      expect(homeConsoleAvailable(chapter, { ...free, x: free.x - 2.9 }, false)).toBe(false);
      expect(homeConsoleAvailable(chapter, free, true)).toBe(false);
    }
  });

  it('never offers a console while airborne, on a ride, outside or above the cabinet', () => {
    expect(homeConsoleAvailable(prolog, { ...free, grounded: false }, false)).toBe(false);
    expect(homeConsoleAvailable(prolog, { ...free, mode: 'ride' }, false)).toBe(false);
    expect(homeConsoleAvailable(prolog, { ...free, y: 2.5 }, false)).toBe(false);
    expect(homeConsoleAvailable({ ...prolog, outdoors: 30 }, free, false)).toBe(false);
    expect(homeConsoleAvailable({ ...prolog, id: 'garden', place: 'garden' }, free, false)).toBe(false);
  });

  it('owns loading immediately and opens only one race for repeated use presses', async () => {
    const s = setup(), opened = s.console.show();
    expect(s.console.open).toBe(true); expect(s.console.loading).toBe(true);
    await s.console.show(); expect(s.load).toHaveBeenCalledTimes(1); expect(s.enter).toHaveBeenCalledTimes(1);
    s.loading.resolve(s.session); await opened;
    expect(s.console.loading).toBe(false); expect(s.console.debug()).toMatchObject({ open: true, race: 'ready' });
    s.console.close(); s.console.close();
    expect(s.session.dispose).toHaveBeenCalledTimes(1); expect(s.leave).toHaveBeenCalledTimes(1);
    expect(s.console.open).toBe(false); expect(s.remove).toHaveBeenCalledTimes(1);
  });

  it('returns immediately when loading is cancelled and disposes a late success without reopening', async () => {
    const s = setup(), opened = s.console.show();
    s.console.close(); expect(s.leave).toHaveBeenCalledTimes(1);
    s.loading.resolve(s.session); await opened;
    expect(s.session.dispose).toHaveBeenCalledTimes(1); expect(s.console.open).toBe(false);
    expect(s.session.suspend).not.toHaveBeenCalled(); expect(s.failed).not.toHaveBeenCalled();
  });

  it('restores the host after a load failure and permits a deliberate retry', async () => {
    const s = setup(), opened = s.console.show();
    s.loading.reject(new Error('offline chunk')); await opened;
    expect(s.console.open).toBe(false); expect(s.leave).toHaveBeenCalledTimes(1); expect(s.failed).toHaveBeenCalledTimes(1);
    s.load.mockResolvedValueOnce(s.session); await s.console.show();
    expect(s.console.open).toBe(true); expect(s.enter).toHaveBeenCalledTimes(2);
    s.console.close(); expect(s.session.dispose).toHaveBeenCalledTimes(1);
  });

  it('passes visibility/context suspension through even if the race loads under recovery', async () => {
    const s = setup(), opened = s.console.show();
    s.console.suspend(true); expect(s.console.element?.inert).toBe(true);
    s.loading.resolve(s.session); await opened;
    expect(s.session.suspend).toHaveBeenLastCalledWith(true);
    s.console.suspend(false); expect(s.session.suspend).toHaveBeenLastCalledWith(false);
    expect(s.console.element?.inert).toBe(false);
    expect(s.leave).not.toHaveBeenCalled(); expect(s.console.open).toBe(true);
  });

  it('ignores a failed cancelled load without showing a stale error over the story', async () => {
    const s = setup(), opened = s.console.show(); s.console.close();
    s.loading.reject(new Error('cancelled late failure')); await opened;
    expect(s.failed).not.toHaveBeenCalled(); expect(s.leave).toHaveBeenCalledTimes(1);
  });

  it('keeps the original console, controller and cables with the TV when its fallback model is replaced', () => {
    for (const chapter of [prolog, epilog, stormkvall, morgonen]) {
      const room = createHomeRoutine(chapter);
      const console = room.group.getObjectByName('home-game-console')!;
      expect(console.userData.keep).toBe(0);
      expect(console.parent?.name).toBe('home-tv-console');
      expect(console.parent?.getObjectByName('home-tv-programme')).toBeDefined();
      expect(console.getWorldPosition(new Vector3()).x).toBeCloseTo(HOME_LAYOUT.television.x);
    }
    const bounds = new Box3().setFromObject(createHomeConsoleModel());
    expect(bounds.min.x).toBeGreaterThan(-HOME_LAYOUT.television.consoleWidth / 2);
    expect(bounds.max.x).toBeLessThan(HOME_LAYOUT.television.consoleWidth / 2);
    expect(bounds.max.y).toBeLessThan(HOME_LAYOUT.television.screenY - HOME_LAYOUT.television.screenHeight / 2 + .22);
    // The controller cable visibly drapes over the front, staying well above the floor.
    expect(bounds.max.z).toBeGreaterThan(HOME_LAYOUT.television.consoleDepth / 2);
    expect(bounds.min.y).toBeGreaterThan(1.2);
  });
});
