/** Optional device APIs never prevent the adventure from playing (plan §6.7). */
export interface ScreenLock {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', callback: () => void, options: { once: boolean }): void;
}
export interface DeviceHost {
  userAgent: string;
  requestWakeLock?: () => Promise<ScreenLock>;
  vibrate?: (milliseconds: number) => boolean;
}

export const isAndroid = (userAgent: string): boolean => /Android/i.test(userAgent);

/** A request that finishes after a pause is immediately released. Refused requests retry only after
 * a new play/visibility transition, never on every animation frame. */
export function createDevicePlay(host: DeviceHost) {
  let playing = false;
  let generation = 0;
  let pending = false;
  let lock: ScreenLock | null = null;
  const release = (held: ScreenLock) => { try { void held.release().catch(() => {}); } catch { /* Optional API. */ } };
  function request(): void {
    if (!playing || pending || lock || !host.requestWakeLock) return;
    pending = true;
    const asked = generation;
    void Promise.resolve().then(() => host.requestWakeLock!()).then((held) => {
      if (!playing || asked !== generation || held.released) { release(held); return; }
      lock = held;
      held.addEventListener('release', () => { if (lock === held) lock = null; }, { once: true });
    }).catch(() => { /* Unsupported, denied and battery-saving cases are all playable. */ }).finally(() => {
      pending = false;
      if (asked !== generation) request();
    });
  }
  return {
    setPlaying(next: boolean): void {
      if (next === playing) return;
      playing = next;
      generation++;
      if (lock) { release(lock); lock = null; }
      if (playing) request();
    },
    /** Visibility can restore a lock revoked by the operating system, even if state already matches. */
    visible(): void { if (playing) request(); },
    landing(enabled: boolean): void {
      if (!playing || !enabled || !isAndroid(host.userAgent)) return;
      try { host.vibrate?.(10); } catch { /* Some embedded browsers deny vibration. */ }
    },
  };
}

/** Ordinary hops reach 1.1 EL. Only an uncarried fall of at least 1.5 EL gives the optional tiny bump. */
export function createHighLanding() {
  let peak: number | null = null;
  const sample = (state: { mode: string; grounded: boolean; y: number }): boolean => {
    if (state.mode !== 'free') { peak = null; return false; }
    if (!state.grounded) { peak = Math.max(peak ?? state.y, state.y); return false; }
    const high = peak !== null && peak - state.y >= 1.5;
    peak = null;
    return high;
  };
  sample.reset = () => { peak = null; };
  return sample;
}
