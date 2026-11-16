import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createKartInput, kartPad, ramp, type KartControl, type KartInputEnv } from '../../src/kart/input';

class Button extends EventTarget {
  dataset: { kartControl?: KartControl } = {};
  held = false;
  captured = new Set<number>();
  released: number[] = [];
  classList = { toggle: (_name: string, yes: boolean) => { this.held = yes; } };
  constructor(control?: KartControl) { super(); this.dataset.kartControl = control; }
  closest() { return this; }
  setPointerCapture(id: number) { this.captured.add(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); this.released.push(id); }
}
function fire(target: EventTarget, type: string, props: Record<string, unknown> = {}) {
  const event = new Event(type, { cancelable: true }); Object.assign(event, props); target.dispatchEvent(event); return event;
}
function gamepad(): Gamepad {
  return { connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false, touched: false })) } as unknown as Gamepad;
}

describe('Godisracet controller ownership', () => {
  let win: EventTarget, root: HTMLElement, doc: KartInputEnv['doc'], pad: Gamepad, buttons: Record<KartControl, Button>;
  let input: ReturnType<typeof createKartInput>, pause: () => void;
  beforeEach(() => {
    win = new EventTarget(); doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null }); pad = gamepad();
    buttons = Object.fromEntries(['left', 'right', 'gas', 'brake', 'drift', 'item'].map(c => [c, new Button(c as KartControl)])) as Record<KartControl, Button>;
    root = Object.assign(new EventTarget(), { querySelectorAll: () => Object.values(buttons) }) as unknown as HTMLElement;
    pause = vi.fn();
    input = createKartInput(root, { pause }, { win, doc, gamepads: () => [pad] });
    input.setEnabled(true); input.read(0);
  });
  const key = (win: EventTarget, code: string, extra = {}) => fire(win, 'keydown', { code, ...extra });

  it('uses left-positive steering, smooth reversals and a distinct drift button', () => {
    key(win, 'ArrowLeft'); key(win, 'Space');
    const left = input.read(.05); expect(left.steer).toBeCloseTo(1 / 3); expect(left.drift).toBe(true);
    input.read(.05); input.read(.05);
    fire(win, 'keyup', { code: 'ArrowLeft' }); key(win, 'ArrowRight');
    expect(input.read(.05).steer).toBeGreaterThanOrEqual(0);
    expect(input.read(.05).steer).toBe(0);
    expect(input.read(.05).steer).toBeLessThan(0);
  });
  it('lifts autogas while braking and returns completely neutral when disabled', () => {
    expect(input.read(.05).throttle).toBeGreaterThan(0);
    key(win, 'ArrowDown'); expect(input.read(.05)).toMatchObject({ throttle: 0 });
    input.setEnabled(false);
    expect(input.read(.05)).toEqual({ steer: 0, throttle: 0, brake: 0, drift: false, item: false });
    input.setEnabled(true); input.setAutoGas(false);
    expect(input.read(.05).brake).toBe(0);
  });
  it('consumes each item key once, with no repeat or pause leakage', () => {
    key(win, 'KeyE'); expect(input.read(.02).item).toBe(true); expect(input.read(.02).item).toBe(false);
    key(win, 'KeyE', { repeat: true }); expect(input.read(.02).item).toBe(false);
    fire(win, 'keyup', { code: 'KeyE' }); key(win, 'KeyE');
    input.setEnabled(false); input.setEnabled(true); expect(input.read(.02).item).toBe(false);
  });
  it('keeps independent touch owners and releases cancellation/capture loss correctly', () => {
    fire(buttons.left, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    fire(buttons.drift, 'pointerdown', { pointerId: 2, pointerType: 'touch' });
    fire(buttons.left, 'pointerdown', { pointerId: 3, pointerType: 'touch' });
    fire(buttons.left, 'pointercancel', { pointerId: 1 });
    expect(input.read(.05)).toMatchObject({ drift: true }); expect(buttons.left.held).toBe(true);
    fire(buttons.left, 'lostpointercapture', { pointerId: 3 });
    expect(buttons.left.held).toBe(false); expect(buttons.drift.held).toBe(true);
    input.clear(); expect(buttons.drift.captured.size).toBe(0); expect(buttons.drift.held).toBe(false);
    expect(input.device).toBe('touch');
  });
  it('ignores secondary mouse presses and modifier/browser shortcuts', () => {
    fire(buttons.left, 'pointerdown', { pointerId: 1, pointerType: 'mouse', button: 2 });
    expect(key(win, 'KeyA', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(key(win, 'KeyD', { metaKey: true }).defaultPrevented).toBe(false);
    expect(input.read(.05).steer).toBe(0);
  });
  it('leaves normal menu buttons native while Space/Enter activate focused driving buttons', () => {
    doc.activeElement = new Button() as unknown as Element;
    expect(key(win, 'Enter').defaultPrevented).toBe(false); expect(input.read(.02).item).toBe(false);
    doc.activeElement = buttons.left as unknown as Element;
    expect(key(win, 'Space').defaultPrevented).toBe(true);
    const left = input.read(.05); expect(left.steer).toBeCloseTo(1 / 3); expect(left.drift).toBe(false);
  });
  it('clears keys, pointers and item edges on blur and hidden page', () => {
    key(win, 'KeyA'); key(win, 'KeyE'); fire(win, 'blur');
    expect(input.read(.05)).toMatchObject({ steer: 0, throttle: 0, item: false });
    fire(win, 'focus');
    fire(buttons.drift, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    doc.hidden = true; fire(doc, 'visibilitychange');
    expect(input.read(.05)).toEqual({ steer: 0, throttle: 0, brake: 0, drift: false, item: false });
    doc.hidden = false; expect(input.read(.05).drift).toBe(false);
  });
  it('requires released gamepad controls after pause, and consumes item edges only once', () => {
    (pad.buttons[3] as { value: number }).value = 1;
    expect(input.read(.02).item).toBe(true); expect(input.read(.02).item).toBe(false);
    input.setEnabled(false); input.setEnabled(true);
    expect(input.read(.02).item).toBe(false);
    (pad.buttons[3] as { value: number }).value = 0; input.read(.02);
    (pad.buttons[3] as { value: number }).value = 1; expect(input.read(.02).item).toBe(true);
  });
  it('polls fresh Start edges while paused without repeating from a held Start', () => {
    input.setEnabled(false);
    (pad.buttons[9] as { value: number }).value = 1;
    input.pollMenu(); input.pollMenu(); expect(pause).toHaveBeenCalledTimes(1);
    (pad.buttons[9] as { value: number }).value = 0; input.pollMenu();
    (pad.buttons[9] as { value: number }).value = 1; input.pollMenu(); expect(pause).toHaveBeenCalledTimes(2);
  });
  it('removes every listener and pointer capture on disposal', () => {
    fire(buttons.left, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    input.dispose(); input.dispose(); key(win, 'Escape'); key(win, 'ArrowLeft');
    expect(pause).not.toHaveBeenCalled(); expect(buttons.left.captured.size).toBe(0);
    expect(input.read(.05).steer).toBe(0);
  });
  it('reports the first real keyboard action even when the host initially showed touch hints', () => {
    input.dispose(); const changed = vi.fn();
    input = createKartInput(root,
      { pause, device: changed }, { win, doc, gamepads: () => [] });
    input.setEnabled(true); key(win, 'ArrowLeft'); key(win, 'Space');
    expect(changed).toHaveBeenCalledExactlyOnceWith('keys');
  });
  it('restores touch controls from the canvas or a menu without issuing a driving action', () => {
    input.setAutoGas(false);
    key(win, 'ArrowLeft'); fire(win, 'keyup', { code: 'ArrowLeft' });
    fire(root, 'pointerdown', { pointerType: 'touch' });
    expect(input.device).toBe('touch');
    expect(input.read(.02)).toEqual({ steer: 0, throttle: 0, brake: 0, drift: false, item: false });
    key(win, 'ArrowLeft'); fire(win, 'keyup', { code: 'ArrowLeft' }); input.setEnabled(false);
    fire(root, 'pointerdown', { pointerType: 'pen' });
    expect(input.device).toBe('touch'); expect(pause).not.toHaveBeenCalled();
  });
  it('ignores touch device changes while hidden, unfocused or disposed', () => {
    key(win, 'ArrowLeft'); fire(win, 'blur'); fire(root, 'pointerdown', { pointerType: 'touch' });
    expect(input.device).toBe('keys');
    fire(win, 'focus'); doc.hidden = true; fire(root, 'pointerdown', { pointerType: 'touch' });
    expect(input.device).toBe('keys');
    doc.hidden = false; input.dispose(); fire(root, 'pointerdown', { pointerType: 'touch' });
    expect(input.device).toBe('keys');
  });
});

describe('source steering feel', () => {
  it('guards frame spikes and invalid controller values', () => {
    expect(ramp(0, 1, 10, .15, .07)).toBeCloseTo(1 / 3);
    expect(ramp(NaN, 1, NaN, .15, .07)).toBe(0);
    const pad = gamepad(); (pad.axes as number[])[0] = -.58;
    expect(kartPad(pad).steer).toBeCloseTo(.5);
    (pad.axes as number[])[0] = .1; expect(kartPad(pad).steer).toBe(0);
    Object.assign(pad.buttons[7]!, { value: .6, pressed: true }); expect(kartPad(pad).throttle).toBe(.6);
  });
});
