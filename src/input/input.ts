/*
 * Input: a floating stick or Följ fingret, two action buttons, the keyboard and a gamepad.
 * Ported from Sköldhästen (skoldhast/src/input.mjs at 5438e23) with this game's verbs (plan §4.1):
 *  - pointer capture per touch, and every held input released on cancel, lost capture, blur and pause;
 *  - movement keys by their place on the keyboard, and the newest of two opposite directions wins;
 *  - the device in use is reported, so the on-screen controls can follow it;
 *  - a quick tap (under 350 ms and 14 px) is a tap on the world, not a stick gesture;
 *  - in menus, the gamepad moves the focus.
 * No move needs two buttons at once. Presses are handed out once by consume(); held state by state().
 */
import type { Edges } from './press-queue';

export type Device = 'touch' | 'keys' | 'pad';
export type MenuKey = 'pause' | 'bag';
type Dir = 'left' | 'right' | 'up' | 'down';

export interface InputUi {
  stickZone: HTMLElement;
  stickBase: HTMLElement;
  stickKnob: HTMLElement;
  hopBtn: HTMLElement;
  actBtn: HTMLElement;
  /** The game view: a quick tap on it is a tap on the world. */
  world: HTMLElement;
}

export interface InputOptions {
  onDevice?(device: Device): void;
  onKey?(key: MenuKey): void;
  /** True while ↑ and W should climb and not be Hoppa: on a hose or on the lace. */
  upClimbs?(): boolean;
  /** Use a held finger on the world or stick zone instead of the floating stick. */
  followFinger?(): boolean;
  /** Elof's current centre in viewport CSS pixels, matching pointer clientX/clientY. */
  playerScreen?(): { x: number; y: number } | null;
  onBack?(): void;
  onTap?(x: number, y: number): void;
  /** The open menu, if any. Tab and the gamepad keep focus inside it. */
  focusScope?(): HTMLElement | null;
  panelOpen?(): boolean;
}

/** What the page gives the input. Tests pass their own. */
export interface InputEnv {
  win: EventTarget;
  doc: EventTarget & { readonly hidden: boolean; readonly activeElement: Element | null };
  gamepads(): readonly (Gamepad | null)[];
  now(): number;
}

export interface HeldInput {
  /** -1 (left) to 1 (right). */
  x: number;
  /** -1 (down) to 1 (up). */
  y: number;
  hopHeld: boolean;
}

/** Stick radius in CSS px, and its dead zones (Sköldhästen's values). */
export const STICK_RADIUS = 58;
export const DEAD_X = 0.12;
export const DEAD_Y = 0.18;
export const TAP_MS = 350;
export const TAP_PX = 14;
/** Holding Shift walks: this is the stick deflection the keyboard then reports. */
export const WALK_KEYS = 0.6;
/** Stick deflection at which the knob shows that Elof will run. */
export const RUN_SHOWN_AT = 0.72;
/** Standard-mapping gamepad buttons. */
export const PAD = { a: 0, b: 1, x: 2, y: 3, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;

const MOVE_CODES: Record<string, Dir> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
};
const MOVE_KEYS: Record<string, Dir> = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
};
const VERB_KEYS = [' ', 'e', 'Enter', 'h', 'g', 'Escape', 'p', 'Shift'];

function browserEnv(): InputEnv {
  return {
    win: window,
    doc: document,
    gamepads: () => navigator.getGamepads?.() ?? [],
    now: () => performance.now(),
  };
}

export function createInput(ui: InputUi, opts: InputOptions = {}, env: InputEnv = browserEnv()) {
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const moves = new Map<string, Dir>(); // held direction keys, oldest first
  const verbs = new Set<string>(); // held verb keys
  const edges: Edges = { hop: false, act: false, helper: false };
  const stick = { id: null as number | null, ox: 0, oy: 0, x: 0, y: 0 };
  const captures = new Map<number, HTMLElement>();
  let device: Device | null = null;
  let pointerHopHeld = false;
  let enabled = true;
  let stickTap: { x: number; y: number; t: number; moved: boolean } | null = null;
  let worldTap: { x: number; y: number; t: number; id: number; moved: boolean } | null = null;
  let follow: {
    id: number; target: HTMLElement; x: number; y: number; ox: number; oy: number; t: number; active: boolean;
  } | null = null;

  const setDevice = (d: Device) => {
    if (d !== device) {
      device = d;
      opts.onDevice?.(d);
    }
  };
  const capture = (target: HTMLElement, id: number) => {
    try {
      target.setPointerCapture?.(id);
      captures.set(id, target);
    } catch {
      /* a cancelled synthetic pointer */
    }
  };
  const on = (target: EventTarget, type: string, fn: (e: Event) => void, extra: AddEventListenerOptions = {}) =>
    target.addEventListener(type, fn, { ...sig, ...extra });

  // --- Följ fingret ------------------------------------------------------------------------------
  // A quick Peka never takes a step. Holding for TAP_MS or dragging commits this pointer to movement;
  // once committed, it cannot also activate whatever happens to be under the finger when it lifts.
  const beginFollow = (e: PointerEvent, target: HTMLElement): boolean => {
    if (!opts.followFinger?.()) return false;
    if (!enabled || opts.panelOpen?.() || follow || (e.button !== undefined && e.button !== 0)) return true;
    follow = { id: e.pointerId, target, x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY,
      t: env.now(), active: false };
    capture(target, e.pointerId);
    e.preventDefault();
    return true;
  };
  const moveFollow = (e: PointerEvent): boolean => {
    if (!follow || e.pointerId !== follow.id) return false;
    follow.x = e.clientX;
    follow.y = e.clientY;
    if (Math.hypot(follow.x - follow.ox, follow.y - follow.oy) >= TAP_PX) follow.active = true;
    return true;
  };
  const releaseFollow = () => {
    const held = follow;
    follow = null;
    if (!held) return;
    captures.delete(held.id);
    try {
      held.target.releasePointerCapture?.(held.id);
    } catch {
      /* already lost */
    }
  };
  const endFollow = (e: PointerEvent): boolean => {
    if (!follow || e.pointerId !== follow.id) return false;
    const quick = e.type === 'pointerup' && !follow.active && env.now() - follow.t < TAP_MS
      && Math.hypot(e.clientX - follow.ox, e.clientY - follow.oy) < TAP_PX;
    releaseFollow();
    if (quick && enabled && !opts.panelOpen?.()) opts.onTap?.(e.clientX, e.clientY);
    return true;
  };
  const followAxis = (delta: number) => Math.abs(delta) <= TAP_PX ? 0
    : Math.sign(delta) * Math.min(1, (Math.abs(delta) - TAP_PX) / (STICK_RADIUS - TAP_PX));

  // --- the stick ---------------------------------------------------------------------------------
  const zone = ui.stickZone;
  const moveKnob = () => {
    ui.stickKnob.style.transform = `translate(${stick.x * STICK_RADIUS * 0.7}px, ${-stick.y * STICK_RADIUS * 0.7}px)`;
  };
  on(zone, 'pointerdown', (ev) => {
    const e = ev as PointerEvent;
    if (beginFollow(e, zone)) return;
    if (!enabled || opts.panelOpen?.() || stick.id !== null || (e.button !== undefined && e.button !== 0)) return;
    stick.id = e.pointerId;
    stickTap = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
    const r = zone.getBoundingClientRect();
    stick.ox = e.clientX - r.left;
    stick.oy = e.clientY - r.top;
    stick.x = stick.y = 0;
    ui.stickBase.style.left = `${stick.ox}px`;
    ui.stickBase.style.top = `${stick.oy}px`;
    ui.stickBase.classList.add('on');
    capture(zone, e.pointerId);
    moveKnob();
    e.preventDefault();
  });
  on(zone, 'pointermove', (ev) => {
    const e = ev as PointerEvent;
    if (moveFollow(e)) return;
    if (e.pointerId !== stick.id) return;
    if (stickTap && Math.hypot(e.clientX - stickTap.x, e.clientY - stickTap.y) >= TAP_PX) stickTap.moved = true;
    const r = zone.getBoundingClientRect();
    let dx = (e.clientX - r.left - stick.ox) / STICK_RADIUS;
    let dy = (e.clientY - r.top - stick.oy) / STICK_RADIUS;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    stick.x = Math.abs(dx) < DEAD_X ? 0 : dx;
    stick.y = Math.abs(dy) < DEAD_Y ? 0 : -dy; // the screen's y points down, the world's up
    ui.stickBase.classList.toggle('run', Math.abs(stick.x) >= RUN_SHOWN_AT);
    moveKnob();
  });
  const endStick = (ev?: Event) => {
    const e = ev as PointerEvent | undefined;
    if (e && endFollow(e)) return;
    if (e) captures.delete(e.pointerId);
    if (e && e.pointerId !== stick.id) return;
    // Elof often stands inside the stick's half of the screen: a quick tap there is still a tap on the world.
    if (enabled && !opts.panelOpen?.() && e?.type === 'pointerup' && stickTap && !stickTap.moved && e.timeStamp - stickTap.t < TAP_MS
      && Math.hypot(e.clientX - stickTap.x, e.clientY - stickTap.y) < TAP_PX) {
      opts.onTap?.(e.clientX, e.clientY);
    }
    stickTap = null;
    stick.id = null;
    stick.x = stick.y = 0;
    ui.stickBase.classList.remove('on', 'run');
    // Back to its rest place: a ring left where the thumb last lay reads as a smudge over Elof.
    ui.stickBase.style.left = '';
    ui.stickBase.style.top = '';
    moveKnob();
  };
  on(zone, 'pointerup', endStick);
  on(zone, 'pointercancel', endStick);
  on(zone, 'lostpointercapture', endStick);

  // --- taps on the world -------------------------------------------------------------------------
  on(ui.world, 'pointerdown', (ev) => {
    const e = ev as PointerEvent;
    if (beginFollow(e, ui.world)) return;
    if (!enabled || opts.panelOpen?.() || worldTap || (e.button !== undefined && e.button !== 0)) return;
    worldTap = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, moved: false };
  });
  const endWorldTap = (ev: Event) => {
    const e = ev as PointerEvent;
    if (endFollow(e)) return;
    if (!worldTap || e.pointerId !== worldTap.id) return;
    const quick = enabled && !opts.panelOpen?.() && !worldTap.moved && e.type === 'pointerup' && e.timeStamp - worldTap.t < TAP_MS
      && Math.hypot(e.clientX - worldTap.x, e.clientY - worldTap.y) < TAP_PX;
    worldTap = null;
    if (quick) opts.onTap?.(e.clientX, e.clientY);
  };
  on(ui.world, 'pointermove', (ev) => {
    const e = ev as PointerEvent;
    if (moveFollow(e)) return;
    if (worldTap?.id === e.pointerId && Math.hypot(e.clientX - worldTap.x, e.clientY - worldTap.y) >= TAP_PX) worldTap.moved = true;
  });
  on(ui.world, 'pointerup', endWorldTap);
  on(ui.world, 'pointercancel', endWorldTap);
  on(ui.world, 'lostpointercapture', endWorldTap);

  // --- the buttons -------------------------------------------------------------------------------
  const press = (btn: HTMLElement, down: () => void, up?: () => void) => {
    const disabled = () => (btn as HTMLButtonElement).disabled === true;
    on(btn, 'pointerdown', (ev) => {
      const e = ev as PointerEvent;
      if (!enabled || disabled()) return;
      e.preventDefault();
      btn.classList.add('down');
      capture(btn, e.pointerId);
      down();
    });
    const release = (ev?: Event) => {
      if (ev) captures.delete((ev as PointerEvent).pointerId);
      if (!btn.classList.contains('down')) return;
      btn.classList.remove('down');
      up?.();
    };
    on(btn, 'pointerup', release);
    on(btn, 'pointercancel', release);
    on(btn, 'lostpointercapture', release);
    // A focused button pressed from the keyboard or by assistive technology arrives as a click.
    on(btn, 'click', (ev) => {
      if ((ev as MouseEvent).detail === 0 && enabled && !disabled()) {
        down();
        up?.();
      }
    });
  };
  press(ui.hopBtn, () => { edges.hop = true; pointerHopHeld = true; }, () => { pointerHopHeld = false; });
  press(ui.actBtn, () => { edges.act = true; });

  // A touch anywhere brings the on-screen controls; the keyboard or a gamepad puts them away again.
  on(env.win, 'pointerdown', (ev) => {
    const type = (ev as PointerEvent).pointerType;
    if (type === 'touch' || type === 'pen') setDevice('touch');
  }, { capture: true });

  // --- the keyboard ------------------------------------------------------------------------------
  const keyName = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
  // By place: KeyW is W on QWERTY and Z on AZERTY. An event without a code falls back to its letter.
  const moveOf = (e: KeyboardEvent): Dir | null =>
    MOVE_CODES[e.code] ?? (!e.code || !/^(Key|Arrow)/.test(e.code) ? MOVE_KEYS[keyName(e)] ?? null : null);
  /** The newest held key among these directions. */
  const latest = (dirs: Dir[]): Dir | null => {
    let last: Dir | null = null;
    for (const dir of moves.values()) if (dirs.includes(dir)) last = dir;
    return last;
  };
  on(env.win, 'keydown', (ev) => {
    const e = ev as KeyboardEvent;
    if (!enabled || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const active = env.doc.activeElement as HTMLElement | null;
    const key = keyName(e);
    const dir = moveOf(e);
    if (key === 'Tab') {
      const scope = opts.focusScope?.();
      if (scope) {
        e.preventDefault();
        setDevice('keys');
        moveFocus(scope, e.shiftKey ? -1 : 1);
      }
      return;
    }
    // Escape closes a menu even while a checkbox or chapter-code field has focus. Text stays text.
    if (key !== 'Escape' && active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable)) return;
    const menuKey = key === 'Escape' || key === 'p' || key === 'g';
    if (opts.panelOpen?.() && !menuKey) return;
    if (key === 'Enter' && active?.tagName === 'BUTTON') return; // Enter presses the focused button
    if (!dir && !VERB_KEYS.includes(key)) return;
    e.preventDefault();
    if (e.repeat) return;
    if (key !== 'Shift') setDevice('keys');
    if (dir) {
      const id = e.code || key;
      if (moves.has(id)) return;
      moves.set(id, dir);
      // ↑ and W are Hoppa, except on something climbable, where they climb (plan §4.1).
      if (dir === 'up' && !opts.upClimbs?.()) edges.hop = true;
      return;
    }
    if (verbs.has(key)) return;
    verbs.add(key);
    if (key === ' ') edges.hop = true;
    else if (key === 'e' || key === 'Enter') edges.act = true;
    else if (key === 'h') edges.helper = true;
    else if (key === 'g') opts.onKey?.('bag');
    else if (key === 'Escape' || key === 'p') opts.onKey?.('pause');
  });
  on(env.win, 'keyup', (ev) => {
    const e = ev as KeyboardEvent;
    const key = keyName(e);
    moves.delete(e.code && moves.has(e.code) ? e.code : key);
    verbs.delete(key);
  });

  // --- the gamepad (standard mapping) ------------------------------------------------------------
  // Play: the left stick or the D-pad moves, A is Hoppa, X is Använd, Y calls the helper, Start pauses.
  // Menus: the D-pad or the stick moves the focus, A presses, B goes back. In a choice of several or on a
  // sound's pips, left and right move the choice or the level, and up and down leave it (menus.md row 22).
  const pad = { x: 0, y: 0, prev: [] as boolean[], hopHeld: false, active: false, navAt: 0, navDir: 0, polledAt: -1 };
  const deadzone = (v: number) => (Math.abs(v) < 0.22 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.22) / 0.72));
  const focusables = (scope: HTMLElement) =>
    [...scope.querySelectorAll<HTMLElement>('button, input, select, summary, [tabindex]:not([tabindex="-1"])')]
      // A choice's buttons other than the chosen one are left out (tabIndex -1): the arrows move inside it.
      .filter((n) => !(n as HTMLButtonElement).disabled && !(n.tabIndex < 0) && n.getClientRects().length > 0 && !n.closest('[hidden], .controls'));
  /** A choice or a level that takes left and right itself: a radio button, or a slider. */
  const sideways = (n: HTMLElement | null) => ['radio', 'slider'].includes(n?.getAttribute?.('role') ?? '');
  const moveFocus = (scope: HTMLElement, step: number) => {
    const list = focusables(scope);
    if (!list.length) return;
    const at = list.indexOf(env.doc.activeElement as HTMLElement);
    const next = list[at < 0 ? (step > 0 ? 0 : list.length - 1) : (at + step + list.length) % list.length];
    next?.focus();
  };
  function pollPad(now = env.now()): void {
    if (now - pad.polledAt < 4) return;
    pad.polledAt = now;
    const gp = [...env.gamepads()].find((g) => g && g.connected && g.buttons?.length);
    if (!gp) {
      if (pad.active) {
        pad.active = false;
        pad.x = pad.y = 0;
        pad.hopHeld = false;
        pad.prev = [];
      }
      return;
    }
    const down = (i: number) => !!gp.buttons[i]?.pressed || (gp.buttons[i]?.value ?? 0) > 0.5;
    const pressed = (i: number) => down(i) && !pad.prev[i];
    let x = deadzone(gp.axes?.[0] ?? 0);
    let y = deadzone(-(gp.axes?.[1] ?? 0)); // the stick's y points down, the world's up
    if (down(PAD.left)) x = -1;
    if (down(PAD.right)) x = 1;
    if (down(PAD.up)) y = 1;
    if (down(PAD.down)) y = -1;
    if (gp.buttons.some((_, i) => pressed(i)) || Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
      setDevice('pad');
      pad.active = true;
    }
    const scope = enabled ? opts.focusScope?.() ?? null : null;
    if (scope) {
      pad.x = pad.y = 0;
      pad.hopHeld = false;
      const focused = env.doc.activeElement as HTMLElement | null;
      const across = Math.abs(x) > 0.5 && Math.abs(x) >= Math.abs(y) && sideways(focused) && scope.contains(focused);
      // The direction: ±1 for the focus, ±2 for a choice's left and right, so that a change starts afresh.
      const dir = across ? 2 * Math.sign(x) : y > 0.5 || x < -0.5 ? -1 : y < -0.5 || x > 0.5 ? 1 : 0;
      if (!dir) pad.navDir = 0;
      else if (dir !== pad.navDir || now >= pad.navAt) {
        // The same arrow a keyboard would give it: the choice or the level handles it as it handles a key.
        if (across) focused!.dispatchEvent(Object.assign(new Event('keydown', { bubbles: true, cancelable: true }), { key: x < 0 ? 'ArrowLeft' : 'ArrowRight' }));
        else moveFocus(scope, dir);
        pad.navAt = now + (dir === pad.navDir ? 140 : 380);
        pad.navDir = dir;
      }
      if (pressed(PAD.a)) {
        if (focused && scope.contains(focused)) focused.click();
        else moveFocus(scope, 1);
      }
      if (pressed(PAD.b)) opts.onBack?.();
      if (pressed(PAD.start)) opts.onKey?.('pause');
    } else if (enabled) {
      pad.x = x;
      pad.y = y;
      pad.hopHeld = down(PAD.a);
      if (pressed(PAD.a)) edges.hop = true;
      if (pressed(PAD.x)) edges.act = true;
      if (pressed(PAD.y)) edges.helper = true;
      if (pressed(PAD.start)) opts.onKey?.('pause');
      if (pressed(PAD.back)) opts.onKey?.('bag');
    }
    pad.prev = gp.buttons.map((_, i) => down(i));
  }

  // --- letting go of everything ------------------------------------------------------------------
  const releaseAll = () => {
    moves.clear();
    verbs.clear();
    pointerHopHeld = false;
    stick.id = null;
    stick.x = stick.y = 0;
    pad.x = pad.y = 0;
    pad.hopHeld = false;
    stickTap = worldTap = null;
    releaseFollow();
    edges.hop = edges.act = edges.helper = false;
    ui.stickBase.classList.remove('on', 'run');
    moveKnob();
    for (const btn of [ui.hopBtn, ui.actBtn]) btn.classList.remove('down');
    const held = [...captures];
    captures.clear();
    for (const [id, target] of held) {
      try {
        target.releasePointerCapture?.(id);
      } catch {
        /* already lost */
      }
    }
  };
  on(env.win, 'blur', releaseAll);
  on(env.doc, 'visibilitychange', () => {
    if (env.doc.hidden) releaseAll();
  });

  return {
    /** Held input right now. */
    state(): HeldInput {
      pollPad();
      const h = latest(['left', 'right']);
      const v = latest(['up', 'down']);
      let x = h === 'left' ? -1 : h === 'right' ? 1 : 0;
      let y = v === 'up' ? 1 : v === 'down' ? -1 : 0;
      if (verbs.has('Shift')) x *= WALK_KEYS;
      if (pad.x || pad.y) {
        x = pad.x;
        y = pad.y;
      }
      if (stick.id !== null) {
        x = stick.x;
        y = stick.y;
      }
      if (follow && (!opts.followFinger?.() || opts.panelOpen?.())) releaseFollow();
      if (follow) {
        if (env.now() - follow.t >= TAP_MS) follow.active = true;
        const player = follow.active ? opts.playerScreen?.() : null;
        // Evaluate against the current projection, even when the finger stays still and the camera moves.
        x = player ? followAxis(follow.x - player.x) * WALK_KEYS : 0;
        y = player ? followAxis(player.y - follow.y) : 0;
      }
      return { x, y, hopHeld: pointerHopHeld || verbs.has(' ') || (v === 'up' && !opts.upClimbs?.()) || pad.hopHeld };
    },
    /** The presses since the last call. Each is handed out once. */
    consume(): Edges {
      pollPad();
      const out = { ...edges };
      edges.hop = edges.act = edges.helper = false;
      return out;
    },
    /** Reads the gamepad now: menus keep working while the game is paused. */
    poll: () => pollPad(),
    release: releaseAll,
    get device() {
      return device;
    },
    setEnabled(isOn: boolean) {
      enabled = isOn;
      if (!isOn) releaseAll();
    },
    destroy() {
      ac.abort();
      releaseAll();
    },
  };
}

export type Input = ReturnType<typeof createInput>;
