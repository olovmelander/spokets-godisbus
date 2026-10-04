import { beforeEach, describe, expect, it } from 'vitest';
import { PAD, STICK_RADIUS, TAP_MS, WALK_KEYS, createInput, type Device, type Input, type InputEnv, type InputUi, type MenuKey } from '../../src/input/input';

/** Just enough of an element for the input: events, a class list, a style and pointer capture. */
class FakeElement extends EventTarget {
  classes = new Set<string>();
  style: Record<string, string> = {};
  disabled = false;
  hidden = false;
  inControls = false;
  tagName = 'BUTTON';
  children: FakeElement[] = [];
  captured: number[] = [];
  released: number[] = [];
  classList = {
    add: (...names: string[]) => names.forEach((n) => this.classes.add(n)),
    remove: (...names: string[]) => names.forEach((n) => this.classes.delete(n)),
    toggle: (name: string, on?: boolean) => ((on ?? !this.classes.has(name)) ? this.classes.add(name) : this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name),
  };
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 400, height: 400 };
  }
  setPointerCapture(id: number) {
    this.captured.push(id);
  }
  releasePointerCapture(id: number) { this.released.push(id); }
  getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
  querySelectorAll() { return this.children; }
  closest() { return this.hidden || this.inControls ? this : null; }
  focus() { doc.activeElement = this as unknown as Element; }
}

function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}): Event {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, props);
  target.dispatchEvent(event);
  return event;
}

let win: EventTarget;
let doc: EventTarget & { hidden: boolean; activeElement: Element | null };
let ui: Record<keyof InputUi, FakeElement>;
let pads: (Gamepad | null)[];
let clock: number;
let devices: Device[];
let taps: [number, number][];
let input: Input;
let followFinger: boolean;
let playerScreen: { x: number; y: number } | null;
let panelOpen: boolean;
let menuKeys: MenuKey[];
let focusScope: FakeElement | null;

beforeEach(() => {
  win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  ui = {
    stickZone: new FakeElement(), stickBase: new FakeElement(), stickKnob: new FakeElement(),
    hopBtn: new FakeElement(), actBtn: new FakeElement(), world: new FakeElement(),
  };
  pads = [];
  clock = 0;
  devices = [];
  taps = [];
  followFinger = false;
  playerScreen = { x: 200, y: 200 };
  panelOpen = false;
  menuKeys = [];
  focusScope = null;
  const env: InputEnv = { win, doc, gamepads: () => pads, now: () => (clock += 16) };
  input = createInput(ui as unknown as InputUi, {
    onDevice: (d) => devices.push(d),
    onTap: (x, y) => taps.push([x, y]),
    followFinger: () => followFinger,
    playerScreen: () => playerScreen,
    panelOpen: () => panelOpen,
    onKey: (value) => menuKeys.push(value),
    focusScope: () => focusScope as unknown as HTMLElement | null,
  }, env);
});

const key = (type: 'keydown' | 'keyup', code: string, k: string, extra = {}) => fire(win, type, { code, key: k, ...extra });

describe('the keyboard', () => {
  it('follows the newest of two opposite directions', () => {
    key('keydown', 'KeyD', 'd');
    expect(input.state().x).toBe(1);
    key('keydown', 'KeyA', 'a');
    expect(input.state().x).toBe(-1);
    key('keyup', 'KeyA', 'a');
    expect(input.state().x).toBe(1);
    key('keyup', 'KeyD', 'd');
    expect(input.state().x).toBe(0);
  });

  it('moves by the place of the key, whatever letter the layout puts there', () => {
    key('keydown', 'KeyA', 'q'); // AZERTY
    expect(input.state().x).toBe(-1);
  });

  it('walks while Shift is held', () => {
    key('keydown', 'ShiftLeft', 'Shift');
    key('keydown', 'ArrowRight', 'ArrowRight');
    expect(input.state().x).toBe(WALK_KEYS);
  });

  it('gives one Hoppa press for Space, and holds it until the key comes up', () => {
    const event = key('keydown', 'Space', ' ');
    expect(event.defaultPrevented).toBe(true);
    key('keydown', 'Space', ' ', { repeat: true });
    expect(input.consume().hop).toBe(true);
    expect(input.consume().hop).toBe(false);
    expect(input.state().hopHeld).toBe(true);
    key('keyup', 'Space', ' ');
    expect(input.state().hopHeld).toBe(false);
  });

  it('treats ↑ and W as Hoppa', () => {
    key('keydown', 'KeyW', 'w');
    expect(input.consume().hop).toBe(true);
    expect(input.state().hopHeld).toBe(true);
  });

  it('gives Använd for E and the helper for H', () => {
    key('keydown', 'KeyE', 'e');
    key('keydown', 'KeyH', 'h');
    expect(input.consume()).toEqual({ hop: false, act: true, helper: true });
  });

  it('leaves browser shortcuts alone', () => {
    const event = key('keydown', 'KeyD', 'd', { ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(input.state().x).toBe(0);
  });

  it('lets go of everything when the window loses focus', () => {
    key('keydown', 'KeyD', 'd');
    key('keydown', 'Space', ' ');
    fire(win, 'blur');
    expect(input.state()).toEqual({ x: 0, y: 0, hopHeld: false });
    expect(input.consume().hop).toBe(false);
  });

  it('reports the keyboard as the device in use', () => {
    key('keydown', 'KeyD', 'd');
    expect(devices).toEqual(['keys']);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('lets Escape close a menu with a focused %s', (tagName) => {
    panelOpen = true;
    doc.activeElement = { tagName } as Element;
    const event = key('keydown', 'Escape', 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(menuKeys).toEqual(['pause']);
    expect(key('keydown', 'KeyP', 'p').defaultPrevented).toBe(false);
    expect(key('keydown', 'KeyG', 'g').defaultPrevented).toBe(false);
    expect(menuKeys).toEqual(['pause']);
  });
});

describe('keyboard focus in menus', () => {
  it('cycles Tab through the visible enabled controls and wraps in both directions', () => {
    focusScope = new FakeElement();
    const first = new FakeElement();
    const hidden = new FakeElement();
    hidden.hidden = true;
    const disabled = new FakeElement();
    disabled.disabled = true;
    const controls = new FakeElement();
    controls.inControls = true;
    const last = new FakeElement();
    focusScope.children = [first, hidden, disabled, controls, last];
    first.focus();
    expect(key('keydown', 'Tab', 'Tab').defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(last);
    key('keydown', 'Tab', 'Tab');
    expect(doc.activeElement).toBe(first);
    key('keydown', 'Tab', 'Tab', { shiftKey: true });
    expect(doc.activeElement).toBe(last);
  });

  it('brings focus inside the open menu when it was outside it', () => {
    focusScope = new FakeElement();
    const first = new FakeElement();
    const last = new FakeElement();
    focusScope.children = [first, last];
    ui.hopBtn.focus();
    key('keydown', 'Tab', 'Tab');
    expect(doc.activeElement).toBe(first);
    ui.hopBtn.focus();
    key('keydown', 'Tab', 'Tab', { shiftKey: true });
    expect(doc.activeElement).toBe(last);
  });

  it('lets form fields use Tab while leaving typing and Enter to the form', () => {
    panelOpen = true;
    focusScope = new FakeElement();
    const field = new FakeElement();
    field.tagName = 'INPUT';
    const submit = new FakeElement();
    focusScope.children = [field, submit];
    field.focus();
    expect(key('keydown', 'KeyG', 'g').defaultPrevented).toBe(false);
    expect(key('keydown', 'Enter', 'Enter').defaultPrevented).toBe(false);
    expect(menuKeys).toEqual([]);
    key('keydown', 'Tab', 'Tab');
    expect(doc.activeElement).toBe(submit);
    key('keydown', 'Tab', 'Tab', { shiftKey: true });
    expect(doc.activeElement).toBe(field);
  });

  it('respects an already handled Tab and leaves normal play untrapped', () => {
    expect(key('keydown', 'Tab', 'Tab').defaultPrevented).toBe(false);
    focusScope = new FakeElement();
    focusScope.children = [new FakeElement()];
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key: 'Tab', code: 'Tab' });
    event.preventDefault();
    win.dispatchEvent(event);
    expect(doc.activeElement).toBeNull();
  });

  it('does not tab into the background of a modal without focusable controls', () => {
    focusScope = new FakeElement();
    expect(key('keydown', 'Tab', 'Tab').defaultPrevented).toBe(true);
    expect(input.consume()).toEqual({ hop: false, act: false, helper: false });
  });
});

describe('the stick', () => {
  const down = (x: number, y: number) => fire(ui.stickZone, 'pointerdown', { pointerId: 1, clientX: x, clientY: y });
  const move = (x: number, y: number) => fire(ui.stickZone, 'pointermove', { pointerId: 1, clientX: x, clientY: y });

  it('appears where the thumb lands and captures that touch', () => {
    down(120, 300);
    expect(ui.stickBase.style.left).toBe('120px');
    expect(ui.stickBase.style.top).toBe('300px');
    expect(ui.stickBase.classes.has('on')).toBe(true);
    expect(ui.stickZone.captured).toEqual([1]);
  });

  it('reads a full push, and nothing inside the dead zone', () => {
    down(100, 300);
    move(100 + STICK_RADIUS * 2, 300);
    expect(input.state().x).toBe(1);
    expect(ui.stickBase.classes.has('run')).toBe(true);
    move(105, 300);
    expect(input.state().x).toBe(0);
  });

  it('points up when the thumb moves up the screen', () => {
    down(100, 300);
    move(100, 300 - STICK_RADIUS);
    expect(input.state().y).toBe(1);
  });

  it('lets go when the touch ends or is cancelled', () => {
    down(100, 300);
    move(160, 300);
    fire(ui.stickZone, 'pointercancel', { pointerId: 1 });
    expect(input.state().x).toBe(0);
    expect(ui.stickBase.classes.has('on')).toBe(false);
  });

  it('ignores a second finger', () => {
    down(100, 300);
    fire(ui.stickZone, 'pointermove', { pointerId: 2, clientX: 300, clientY: 300 });
    expect(input.state().x).toBe(0);
  });

  it('treats a quick touch that did not move as a tap on the world', () => {
    down(100, 300);
    fire(ui.stickZone, 'pointerup', { pointerId: 1, clientX: 100, clientY: 300 });
    expect(taps).toEqual([[100, 300]]);
  });
});

describe('the buttons', () => {
  it('gives one Hoppa press, held until the finger lifts', () => {
    fire(ui.hopBtn, 'pointerdown', { pointerId: 5 });
    expect(input.consume().hop).toBe(true);
    expect(input.state().hopHeld).toBe(true);
    fire(ui.hopBtn, 'pointerup', { pointerId: 5 });
    expect(input.state().hopHeld).toBe(false);
  });

  it('ignores Använd while it is dimmed', () => {
    ui.actBtn.disabled = true;
    fire(ui.actBtn, 'pointerdown', { pointerId: 6 });
    expect(input.consume().act).toBe(false);
  });

  it('reports touch as the device in use', () => {
    fire(win, 'pointerdown', { pointerType: 'touch' });
    expect(devices).toEqual(['touch']);
  });
});

describe('taps on the world', () => {
  it('reports a quick tap, and not a drag', () => {
    fire(ui.world, 'pointerdown', { pointerId: 3, clientX: 500, clientY: 200 });
    fire(ui.world, 'pointerup', { pointerId: 3, clientX: 503, clientY: 201 });
    fire(ui.world, 'pointerdown', { pointerId: 4, clientX: 500, clientY: 200 });
    fire(ui.world, 'pointerup', { pointerId: 4, clientX: 560, clientY: 200 });
    expect(taps).toEqual([[503, 201]]);
  });
});

describe('Följ fingret', () => {
  const down = (target = ui.world, id = 3, x = 400, y = 200) =>
    fire(target, 'pointerdown', { pointerId: id, clientX: x, clientY: y, button: 0 });
  const move = (x: number, y: number, target = ui.world, id = 3) =>
    fire(target, 'pointermove', { pointerId: id, clientX: x, clientY: y });
  const hold = () => { clock += TAP_MS; };

  beforeEach(() => { followFinger = true; });

  it.each(['world', 'stickZone'] as const)('keeps a quick %s tap as Peka, without first moving Elof', (target) => {
    down(ui[target]);
    expect(input.state()).toEqual({ x: 0, y: 0, hopHeld: false });
    expect(ui[target].captured).toEqual([3]);
    expect(ui.stickBase.classes.has('on')).toBe(false);
    fire(ui[target], 'pointerup', { pointerId: 3, clientX: 403, clientY: 201 });
    expect(taps).toEqual([[403, 201]]);
    expect(input.state().x).toBe(0);
  });

  it('walks towards a held finger, then stops or turns as Elof and the camera move', () => {
    down();
    hold();
    expect(input.state()).toEqual({ x: WALK_KEYS, y: 0, hopHeld: false });
    playerScreen = { x: 400, y: 200 };
    expect(input.state().x).toBe(0);
    playerScreen = { x: 407, y: 200 }; // no jitter beside the target
    expect(input.state().x).toBe(0);
    playerScreen = { x: 600, y: 200 };
    expect(input.state().x).toBe(-WALK_KEYS);
    expect(input.consume()).toEqual({ hop: false, act: false, helper: false });
  });

  it('keeps vertical movement for climbing and changing the swing length, without jumping', () => {
    down(ui.stickZone, 3, 200, 100);
    hold();
    expect(input.state()).toEqual({ x: 0, y: 1, hopHeld: false });
    move(200, 300, ui.stickZone);
    expect(input.state()).toEqual({ x: 0, y: -1, hopHeld: false });
    expect(input.consume().hop).toBe(false);
  });

  it('starts a deliberate drag immediately and never also taps when it returns to its start', () => {
    down();
    move(430, 200);
    expect(input.state().x).toBe(WALK_KEYS);
    move(400, 200);
    fire(ui.world, 'pointerup', { pointerId: 3, clientX: 400, clientY: 200 });
    expect(taps).toEqual([]);
  });

  it('does not interpret an unpolled long hold as a tap', () => {
    down();
    hold();
    fire(ui.world, 'pointerup', { pointerId: 3, clientX: 400, clientY: 200 });
    expect(taps).toEqual([]);
  });

  it('leaves a second finger free for Hoppa and Använd without replacing or releasing movement', () => {
    down();
    hold();
    fire(ui.hopBtn, 'pointerdown', { pointerId: 5 });
    fire(ui.actBtn, 'pointerdown', { pointerId: 6 });
    expect(input.consume()).toEqual({ hop: true, act: true, helper: false });
    down(ui.stickZone, 8, 0, 200);
    move(0, 200, ui.world, 9);
    fire(ui.world, 'pointercancel', { pointerId: 9 });
    expect(input.state()).toEqual({ x: WALK_KEYS, y: 0, hopHeld: true });
    fire(ui.hopBtn, 'pointerup', { pointerId: 5 });
    expect(input.state()).toEqual({ x: WALK_KEYS, y: 0, hopHeld: false });
    expect(ui.stickZone.captured).toEqual([]);
    expect(taps).toEqual([]);
  });

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])('stops on %s without triggering Peka', (type) => {
    down();
    hold();
    expect(input.state().x).toBe(WALK_KEYS);
    fire(ui.world, type, { pointerId: 3, clientX: 400, clientY: 200 });
    expect(input.state()).toEqual({ x: 0, y: 0, hopHeld: false });
    expect(ui.world.released).toEqual([3]);
    expect(taps).toEqual([]);
  });

  it.each(['blur', 'hidden', 'pause', 'disabled', 'panel'] as const)('releases the held finger on %s', (reason) => {
    down();
    hold();
    expect(input.state().x).toBe(WALK_KEYS);
    if (reason === 'blur') fire(win, 'blur');
    if (reason === 'hidden') { doc.hidden = true; fire(doc, 'visibilitychange'); }
    if (reason === 'pause') input.release();
    if (reason === 'disabled') input.setEnabled(false);
    if (reason === 'panel') panelOpen = true;
    expect(input.state()).toEqual({ x: 0, y: 0, hopHeld: false });
    expect(ui.world.released).toEqual([3]);
    move(500, 200);
    fire(ui.world, 'pointerup', { pointerId: 3, clientX: 500, clientY: 200 });
    expect(taps).toEqual([]);
  });

  it('cannot start a movement gesture while a menu is open', () => {
    panelOpen = true;
    down();
    hold();
    panelOpen = false;
    expect(input.state().x).toBe(0);
    expect(ui.world.captured).toEqual([]);
  });

  it('drops the old gesture when the setting is turned off', () => {
    down();
    hold();
    expect(input.state().x).toBe(WALK_KEYS);
    followFinger = false;
    expect(input.state().x).toBe(0);
    followFinger = true;
    expect(input.state().x).toBe(0);
  });

  it('waits safely when Elof has no screen projection yet', () => {
    playerScreen = null;
    down();
    hold();
    expect(input.state()).toEqual({ x: 0, y: 0, hopHeld: false });
    playerScreen = { x: 200, y: 200 };
    expect(input.state().x).toBe(WALK_KEYS);
  });

  it('ignores the secondary mouse button', () => {
    fire(ui.world, 'pointerdown', { pointerId: 3, clientX: 400, clientY: 200, button: 2 });
    hold();
    expect(input.state().x).toBe(0);
    expect(ui.world.captured).toEqual([]);
  });

  it('leaves keyboard controls unchanged when there is no held finger', () => {
    key('keydown', 'KeyD', 'd');
    key('keydown', 'Space', ' ');
    expect(input.state()).toEqual({ x: 1, y: 0, hopHeld: true });
    expect(input.consume().hop).toBe(true);
  });
});

describe('the gamepad', () => {
  const gamepad = (axes: number[], pressed: number[]): Gamepad =>
    ({
      connected: true,
      axes,
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
    }) as unknown as Gamepad;

  it('moves with the stick and jumps with A', () => {
    pads = [gamepad([1, 0], [PAD.a])];
    expect(input.state()).toEqual({ x: 1, y: 0, hopHeld: true });
    expect(input.consume().hop).toBe(true);
    expect(devices).toEqual(['pad']);
    // Still held on the next frame: no second press.
    expect(input.consume().hop).toBe(false);
  });

  it('moves with the D-pad, and stops when the gamepad goes away', () => {
    pads = [gamepad([0, 0], [PAD.left])];
    expect(input.state().x).toBe(-1);
    pads = [];
    expect(input.state().x).toBe(0);
  });
});
