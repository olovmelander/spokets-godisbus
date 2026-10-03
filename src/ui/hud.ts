/**
 * The candy bag in the corner (plan §4.3): its number, and how full it looks.
 * `total` is the trail candy in the chapter being played.
 */
export interface Hud {
  /** Shows the number of candies in the bag. The bag bumps when the number has grown. */
  candy(count: number): void;
}

export function createHud(bag: HTMLElement, number: HTMLElement, total: number): Hud {
  let shown = -1;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    candy(count) {
      if (count === shown) return;
      const grew = shown >= 0 && count > shown;
      shown = count;
      number.textContent = String(count);
      bag.style.setProperty('--fill', String(total > 0 ? Math.min(1, count / total) : 0));
      if (grew && !still.matches) {
        bag.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
      }
    },
  };
}
