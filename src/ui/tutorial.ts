import { sv } from '../content/sv';
import type { Lesson } from '../app/tutorial';
import type { Device } from '../input/input';
import type { Vec } from '../sim/types';

/** One hand and one control. Non-interactive, inside the safe area, with key/pad equivalents. */
export function createTutorial(doc: Document) {
  const panel = doc.getElementById('tutorial')!;
  const caption = doc.getElementById('tutorialKey')!;
  let previous = '';
  return {
    show(lesson: Lesson | null, device: Device, follow: boolean, player: Vec | null): void {
      panel.hidden = lesson === null;
      if (!lesson) return;
      // Använd's lesson names what the button says now.
      const word = lesson === 'act' ? doc.getElementById('actBtn')?.getAttribute('aria-label') ?? sv.act : '';
      const key = `${lesson}:${device}:${follow}:${word}`;
      if (key !== previous) {
        previous = key;
        panel.dataset.lesson = lesson;
        panel.dataset.device = device;
        panel.dataset.follow = String(follow);
        caption.textContent = device === 'keys' ? sv.tutorial.keys[lesson] : device === 'pad' ? sv.tutorial.pad[lesson] : '';
        // With a key after it, the word loses its own "!": "Tryck på Måla ögonen med E."
        const said = device === 'touch' ? word : word.replace(/[!.?]+$/u, '');
        panel.setAttribute('aria-label', sv.tutorial[device === 'keys' ? 'keyboard' : device === 'pad' ? 'gamepad' : 'touch'][lesson].replace('{word}', said));
      }
      if (device === 'touch') {
        const id = lesson === 'move' ? 'stickBase' : lesson === 'hop' ? 'hopBtn' : 'actBtn';
        const target = doc.getElementById(id)!.getBoundingClientRect();
        // The chase always goes right. Mirroring the buttons must not reverse this movement lesson.
        const x = lesson === 'move' && follow && player ? player.x + 84 : target.left + target.width / 2;
        const y = lesson === 'move' && follow && player ? player.y : target.top + target.height / 2;
        panel.style.left = `${Math.min(innerWidth - 48, Math.max(48, x))}px`;
        panel.style.top = `${Math.min(innerHeight - 62, Math.max(56, y))}px`;
      } else {
        panel.style.left = '50%';
        panel.style.top = 'calc(100% - env(safe-area-inset-bottom) - 110px)';
      }
    },
  };
}
