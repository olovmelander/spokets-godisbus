import { beforeEach, describe, expect, it } from 'vitest';
import { PAD, STICK_RADIUS, WALK_KEYS, createInput, type Device, type Input, type InputEnv, type InputUi } from '../../src/input/input';

/** Just enough of an element for the input: events, a class list, a style and pointer capture. */
class FakeElement extends EventTarget {
  classes = new Set<string>();
  style: Record<string, string> = {};
  disabled = false;
  captured: number[] = [];
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
  releasePointerCapture() {}
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
  const env: InputEnv = { win, doc, gamepads: () => pads, now: () => (clock += 16) };
  input = createInput(ui as unknown as InputUi, {
    onDevice: (d) => devices.push(d),
    onTap: (x, y) => taps.push([x, y]),
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
