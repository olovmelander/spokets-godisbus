/** How long a press is held to confirm what cannot be undone (docs/ux-audit/first-minutes.md rows 7 and 14). */
export const HOLD_MS = 1500;

/**
 * Makes a button confirm only when it is held: by a finger, the mouse, or Enter or Space, while a ring fills round its
 * picture (ui.css, `.holding`). Let go early and nothing happens. A press that cannot be held, a gamepad's A or a
 * switch's, confirms at once: it comes as a click of its own.
 */
export function holdToConfirm(button: HTMLButtonElement, confirm: () => void): void {
  const win = button.ownerDocument.defaultView!;
  let timer = 0;
  let held = false;
  const start = () => {
    if (button.disabled || timer) return;
    held = false;
    button.classList.add('holding');
    timer = win.setTimeout(() => {
      timer = 0;
      held = true;
      button.classList.remove('holding');
      confirm();
    }, HOLD_MS);
  };
  const stop = () => {
    if (timer) win.clearTimeout(timer);
    timer = 0;
    button.classList.remove('holding');
  };
  button.addEventListener('pointerdown', (event) => { if (event.button === 0) start(); });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) button.addEventListener(type, stop);
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) start();
  });
  button.addEventListener('keyup', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    stop();
  });
  button.addEventListener('click', (event) => {
    if (held) { held = false; return; }
    if (event.detail === 0 && !timer) confirm();
  });
}
