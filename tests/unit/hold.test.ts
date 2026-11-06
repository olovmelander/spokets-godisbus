import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS, holdToConfirm } from '../../src/ui/hold';

class HoldButton extends EventTarget {
  disabled = false;
  isConnected = true;
  hidden = false;
  classes = new Set<string>();
  classList = {
    add: (value: string) => this.classes.add(value),
    remove: (value: string) => this.classes.delete(value),
  };
  constructor(readonly ownerDocument: EventTarget & { hidden: boolean; defaultView: EventTarget }) { super(); }
  closest() { return this.hidden ? this : null; }
  getClientRects() { return this.hidden ? [] : [{}]; }
}

function fire(target: EventTarget, type: string, values: Record<string, unknown> = {}): void {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
}

describe('holding a destructive confirmation', () => {
  let win: EventTarget;
  let doc: EventTarget & { hidden: boolean; defaultView: EventTarget };
  let button: HoldButton;
  let confirm = vi.fn<() => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    win = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
    doc = Object.assign(new EventTarget(), { hidden: false, defaultView: win });
    button = new HoldButton(doc);
    confirm = vi.fn<() => void>();
    holdToConfirm(button as unknown as HTMLButtonElement, confirm);
  });
  afterEach(() => { vi.useRealTimers(); });

  const press = () => fire(button, 'pointerdown', { button: 0, pointerId: 1 });

  it('requires the complete hold and never repeats it on release/click', () => {
    press();
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(confirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    fire(button, 'pointerup', { pointerId: 1 });
    fire(button, 'click', { detail: 1 });
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it.each(['blur', 'visibilitychange'])('cancels the pending action when the page loses availability (%s)', (reason) => {
    press();
    vi.advanceTimersByTime(HOLD_MS / 2);
    if (reason === 'visibilitychange') { doc.hidden = true; fire(doc, reason); }
    else fire(win, reason);
    vi.advanceTimersByTime(HOLD_MS);
    expect(confirm).not.toHaveBeenCalled();
    expect(button.classes.has('holding')).toBe(false);
    doc.hidden = false;
    press();
    vi.advanceTimersByTime(HOLD_MS);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it.each(['disabled', 'hidden', 'detached'])('does not confirm after the button becomes %s during the hold', (reason) => {
    press();
    if (reason === 'disabled') button.disabled = true;
    if (reason === 'hidden') button.hidden = true;
    if (reason === 'detached') button.isConnected = false;
    vi.advanceTimersByTime(HOLD_MS);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('keeps direct assistive and gamepad activation available', () => {
    fire(button, 'click', { detail: 0 });
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
