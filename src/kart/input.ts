/** Godisracet controls, adapted from pekkas-pokal's kart/input.js at 7762360.
 * The original digital ramp and pointer ownership are retained. The host owns
 * the clock, focus scope and pause lifecycle; this controller never starts RAF.
 */
export interface KartInput {
  /** Positive is left, matching Varggropen's positive track lane. */
  steer: number;
  throttle: number;
  brake: number;
  drift: boolean;
  /** One press, consumed by read(). */
  item: boolean;
}
export type KartDevice = 'keys' | 'touch' | 'pad';
export type KartControl = 'left' | 'right' | 'gas' | 'brake' | 'drift' | 'item';
export interface KartInputEnv {
  win: EventTarget;
  doc: EventTarget & { hidden: boolean; activeElement: Element | null };
  gamepads(): readonly (Gamepad | null)[];
}
export interface KartInputCallbacks {
  pause(): void;
  /** A trusted gesture: the host can unlock its sound here. */
  action?(): void;
  device?(device: KartDevice): void;
}

const CONTROLS = new Set<KartControl>(['left', 'right', 'gas', 'brake', 'drift', 'item']);
const KEY: Readonly<Record<string, KartControl>> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake',
  Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift', KeyE: 'item', Enter: 'item',
};
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const neutral = (): KartInput => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false });

/** Source steering ramp: direction reversals first pass through neutral. */
export function ramp(current: number, target: number, dt: number, rise: number, fall: number): number {
  const now = Number.isFinite(current) ? current : 0;
  const step = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
  if (now !== 0 && (Math.sign(target) !== Math.sign(now) || Math.abs(target) < Math.abs(now))) {
    const next = now - Math.sign(now) * step / fall;
    if (Math.sign(target) !== Math.sign(now)) return Math.sign(next) === Math.sign(now) ? next : 0;
    return Math.abs(next) < Math.abs(target) ? target : next;
  }
  const next = now + Math.sign(target - now) * step / rise;
  return Math.abs(next - now) >= Math.abs(target - now) ? target : next;
}

/** Standard mapping, with an analogue dead zone and pedal values preserved. */
export function kartPad(pad: Gamepad | null | undefined): KartInput & { pause: boolean } {
  const button = (index: number) => {
    const b = pad?.buttons[index];
    return b ? clamp(Number.isFinite(b.value) && b.value > 0 ? b.value : Number(b.pressed), 0, 1) : 0;
  };
  const axis = pad?.axes[0] ?? 0;
  const stick = Number.isFinite(axis) ? -Math.sign(axis) * Math.max(0, Math.abs(axis) - .16) / .84 : 0;
  const dpad = Number(button(14) > .5) - Number(button(15) > .5);
  return {
    steer: clamp(dpad || stick || 0, -1, 1), throttle: Math.max(button(0), button(7)),
    brake: Math.max(button(1), button(6)), drift: button(2) > .5,
    item: button(3) > .5, pause: button(9) > .5,
  };
}

function controlOf(element: Element | null): KartControl | null {
  const value = (element as HTMLElement | null)?.dataset?.kartControl as KartControl | undefined;
  return value && CONTROLS.has(value) ? value : null;
}
function nativeUi(element: Element | null): boolean {
  return !!element?.closest?.('input,textarea,select,[contenteditable="true"],button,a,[role="button"]');
}

export function createKartInput(root: HTMLElement, callbacks: KartInputCallbacks, env: KartInputEnv = {
  win: window, doc: document, gamepads: () => navigator.getGamepads?.() ?? [],
}) {
  const remove: (() => void)[] = [];
  const listen = (target: EventTarget, name: string, fn: (event: Event) => void, capture = false) => {
    target.addEventListener(name, fn, capture);
    remove.push(() => target.removeEventListener(name, fn, capture));
  };
  const keys = new Map<string, KartControl>();
  const fingers = new Map<number, { control: KartControl; element: HTMLElement }>();
  const buttons = [...root.querySelectorAll<HTMLElement>('[data-kart-control]')];
  let enabled = false, disposed = false, autoGas = true, windowActive = true, device: KartDevice = 'keys';
  let item = false, padItem = false, padPause = false, padReady = false;
  let smooth = neutral();
  const switchDevice = (next: KartDevice) => {
    if (device === next) return;
    device = next; callbacks.device?.(next);
  };
  const down = (control: KartControl) => [...keys.values()].includes(control) || [...fingers.values()].some(finger => finger.control === control);
  const refresh = () => buttons.forEach(button => button.classList.toggle('is-held', down(controlOf(button)!)));
  const getPad = () => {
    try { return kartPad(env.gamepads().find(pad => pad?.connected && (!pad.mapping || pad.mapping === 'standard'))); }
    catch { return kartPad(null); }
  };
  function clear(): void {
    keys.clear(); item = false; smooth = neutral(); padReady = false;
    const captures = [...fingers.entries()]; fingers.clear();
    for (const [id, finger] of captures) {
      try { finger.element.releasePointerCapture?.(id); } catch { /* The browser already released this pointer. */ }
    }
    refresh();
    const current = getPad(); padItem = current.item; padPause = current.pause;
  }
  function padControls(): ReturnType<typeof kartPad> {
    const state = getPad();
    const pauseEdge = state.pause && !padPause;
    padPause = state.pause;
    const active = Math.abs(state.steer) > .01 || state.throttle > .01 || state.brake > .01 || state.drift || state.item;
    if (!active) padReady = true;
    if (pauseEdge && windowActive && !env.doc.hidden) { switchDevice('pad'); callbacks.action?.(); callbacks.pause(); }
    if (enabled && padReady && windowActive && !env.doc.hidden) {
      if (active) switchDevice('pad');
      if (state.item && !padItem) item = true;
    }
    padItem = state.item;
    return padReady ? state : { ...neutral(), pause: state.pause };
  }
  const releasePointer = (event: Event) => {
    const id = (event as PointerEvent).pointerId, finger = fingers.get(id);
    if (!finger) return;
    fingers.delete(id);
    try { finger.element.releasePointerCapture?.(id); } catch { /* Already released. */ }
    refresh();
  };
  for (const button of buttons) {
    const control = controlOf(button);
    if (!control) continue;
    listen(button, 'pointerdown', event => {
      const e = event as PointerEvent;
      if (!enabled || env.doc.hidden || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      fingers.set(e.pointerId, { control, element: button });
      try { button.setPointerCapture?.(e.pointerId); } catch { /* A cancelled pointer cannot be captured. */ }
      if (control === 'item') item = true;
      switchDevice(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'keys');
      callbacks.action?.(); refresh();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, name, releasePointer);
    listen(button, 'blur', () => {
      for (const [key, value] of keys) if (value === control) keys.delete(key);
      refresh();
    });
  }
  listen(env.win, 'keydown', event => {
    const e = event as KeyboardEvent;
    if (disposed || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || env.doc.hidden) return;
    const focused = env.doc.activeElement;
    const owned = controlOf(focused);
    const ui = nativeUi(focused);
    if (e.code === 'Escape' || (e.code === 'KeyP' && !ui)) {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) { callbacks.action?.(); callbacks.pause(); }
      return;
    }
    if (!enabled || (ui && !owned)) return;
    const control = owned && (e.code === 'Space' || e.code === 'Enter') ? owned : KEY[e.code];
    if (!control) return;
    e.preventDefault(); e.stopPropagation();
    if (e.repeat) return;
    if (control === 'item' && !keys.has(e.code)) item = true;
    keys.set(e.code, control);
    switchDevice('keys'); callbacks.action?.(); refresh();
  }, true);
  listen(env.win, 'keyup', event => {
    const e = event as KeyboardEvent;
    if (!keys.has(e.code)) return;
    keys.delete(e.code); e.preventDefault(); e.stopPropagation(); refresh();
  }, true);
  listen(env.win, 'blur', () => { windowActive = false; clear(); });
  listen(env.win, 'focus', () => { windowActive = true; clear(); });
  listen(env.doc, 'visibilitychange', () => { if (env.doc.hidden) clear(); });

  return {
    read(dt: number): KartInput {
      if (disposed) return neutral();
      const pad = padControls();
      if (!enabled || !windowActive || env.doc.hidden) { smooth = neutral(); item = false; return neutral(); }
      const brake = Math.max(Number(down('brake')), pad.brake);
      const gas = Math.max(Number(down('gas')), pad.throttle, Number(autoGas && brake === 0));
      const steer = clamp(Number(down('left')) - Number(down('right')) + pad.steer, -1, 1);
      smooth.steer = ramp(smooth.steer, steer, dt, .15, .07);
      // Braking always lifts the throttle, including autogas and a held gas key.
      smooth.throttle = ramp(smooth.throttle, brake > 0 ? 0 : gas, dt, .06, .04);
      smooth.brake = ramp(smooth.brake, brake, dt, .06, .04);
      const result = { ...smooth, drift: down('drift') || pad.drift, item };
      item = false;
      return result;
    },
    /** Call while a menu is visible, so a fresh Start press can resume it. */
    pollMenu() { if (!disposed) padControls(); },
    clear,
    setAutoGas(next: boolean) { autoGas = next; smooth.throttle = 0; },
    setEnabled(next: boolean) { if (enabled === next) return; enabled = next; clear(); },
    dispose() { if (disposed) return; disposed = true; enabled = false; clear(); remove.forEach(off => off()); },
    get device() { return device; },
    get autoGas() { return autoGas; },
    get enabled() { return enabled; },
  };
}
