import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createKartInput, kartPad, ramp, type KartControl, type KartInputEnv } from '../../src/kart/input';
import { createKartAudio, kartRpm, type KartAudioEnv } from '../../src/kart/audio';

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
  let win: EventTarget, doc: KartInputEnv['doc'], pad: Gamepad, buttons: Record<KartControl, Button>;
  let input: ReturnType<typeof createKartInput>, pause: () => void;
  beforeEach(() => {
    win = new EventTarget(); doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null }); pad = gamepad();
    buttons = Object.fromEntries(['left', 'right', 'gas', 'brake', 'drift', 'item'].map(c => [c, new Button(c as KartControl)])) as Record<KartControl, Button>;
    const root = { querySelectorAll: () => Object.values(buttons) } as unknown as HTMLElement;
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
});

describe('source steering and audio feel', () => {
  it('guards frame spikes and invalid controller values', () => {
    expect(ramp(0, 1, 10, .15, .07)).toBeCloseTo(1 / 3);
    expect(ramp(NaN, 1, NaN, .15, .07)).toBe(0);
    const pad = gamepad(); (pad.axes as number[])[0] = -.58;
    expect(kartPad(pad).steer).toBeCloseTo(.5);
    (pad.axes as number[])[0] = .1; expect(kartPad(pad).steer).toBe(0);
    Object.assign(pad.buttons[7]!, { value: .6, pressed: true }); expect(kartPad(pad).throttle).toBe(.6);
  });
  it('uses clutch load at a standstill, rises with speed and decays smoothly', () => {
    const idle = kartRpm(1450, 0, 0, .1), gas = kartRpm(1450, 0, 1, .1);
    expect(idle).toBe(1450); expect(gas).toBeGreaterThan(idle); expect(gas).toBeLessThan(2350);
    expect(kartRpm(gas, 18, 1, .1)).toBeGreaterThan(gas);
    expect(kartRpm(3900, 0, 0, .1)).toBeLessThan(3900);
    expect(Number.isFinite(kartRpm(NaN, NaN, 0, NaN))).toBe(true);
  });
});

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  cancelScheduledValues() {}
}
class AudioNodeFake {
  gain = new Param(); frequency = new Param(); Q = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  starts = 0; stops = 0; disconnected = false; onended: (() => void) | null = null;
  connect(node: AudioNodeFake) { return node; }
  disconnect() { this.disconnected = true; }
  start() { this.starts++; }
  stop() { this.stops++; }
}
function soundEnv() {
  const nodes: AudioNodeFake[] = [];
  const make = () => { const n = new AudioNodeFake(); nodes.push(n); return n; };
  const context = {
    state: 'suspended', currentTime: 0, sampleRate: 100, destination: make(),
    createGain: make, createOscillator: make, createBiquadFilter: make, createDynamicsCompressor: make, createBufferSource: make,
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { env: { createContext: factory } satisfies KartAudioEnv, nodes, factory, context };
}

describe('Godisracet audio lifecycle', () => {
  it('does not create a context until a gesture, and creates none when both buses are muted', () => {
    const f = soundEnv(), sound = createKartAudio({ effects: 0, music: 0, calm: false }, f.env);
    sound.unlock(); sound.event('go'); sound.dispose(); expect(f.factory).not.toHaveBeenCalled();
    const audible = createKartAudio({ effects: 1, music: 0, calm: false }, f.env);
    audible.event('boost'); expect(f.factory).not.toHaveBeenCalled(); audible.unlock(); audible.unlock();
    expect(f.factory).toHaveBeenCalledTimes(1); audible.dispose();
  });
  it('cancels unfinished chimes at pause and releases its graph/context exactly once', () => {
    const f = soundEnv(), sound = createKartAudio({ effects: 1, music: 1, calm: false }, f.env);
    sound.unlock(); sound.event('boost');
    const notes = f.nodes.filter(n => n.starts > 0).slice(3); expect(notes.length).toBe(4);
    sound.suspend(true); expect(notes.every(n => n.stops > 0 && n.disconnected)).toBe(true);
    const count = f.nodes.length; sound.event('go'); expect(f.nodes).toHaveLength(count);
    sound.suspend(false); expect(f.context.resume).toHaveBeenCalled();
    sound.dispose(); sound.dispose(); expect(f.context.close).toHaveBeenCalledTimes(1);
    expect(f.nodes.slice(1).every(n => n.disconnected)).toBe(true);
  });
  it('leaves effects silent with music-only settings and has no notes while suspended', () => {
    const f = soundEnv(), sound = createKartAudio({ effects: 0, music: 1, calm: true }, f.env);
    sound.unlock(); const before = f.nodes.length; sound.event('go'); expect(f.nodes).toHaveLength(before);
    const state = { speed: 10, throttle: 1, drifting: true, boost: false, phase: 'racing' as const };
    for (let i = 0; i < 4; i++) sound.tick(state, .1);
    expect(f.nodes.length).toBeGreaterThan(before);
    sound.suspend(true); const paused = f.nodes.length;
    for (let i = 0; i < 8; i++) sound.tick(state, .1);
    expect(f.nodes).toHaveLength(paused); sound.dispose();
  });
});
