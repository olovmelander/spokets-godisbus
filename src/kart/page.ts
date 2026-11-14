/** godisracet.html: Godisracet on a page of its own, for playing it straight away without walking to the
 * television. It is the same game, with the current player's sound and motion settings and race records.
 * "Tillbaka till huset" goes to the adventure. ?tier=low|mid|high chooses the graphics for one visit.
 */
import { sv } from '../content/sv';
import { tierFromQuery, type Tier } from '../render/quality';
import { readSettings } from '../save/settings';
import type { KartSession } from './types';
import '../ui/ui.css';

const host = document.getElementById('godisracet')!;
const params = new URLSearchParams(location.search);
document.title = sv.kart.title;

/** The player whose settings and records apply: the one chosen in the adventure on this device, if any. */
function player(): { id: string; storage: Storage | null; settings: ReturnType<typeof readSettings> | null } {
  try {
    const index: unknown = JSON.parse(localStorage.getItem('godisbus.v1.index') ?? 'null');
    const id = index && typeof index === 'object' && 'current' in index && typeof index.current === 'string' ? index.current : 'elof';
    const save: unknown = JSON.parse(localStorage.getItem(`godisbus.v1.player.${id}`) ?? 'null');
    const settings = save && typeof save === 'object' && 'settings' in save ? readSettings(save.settings) : null;
    return { id, storage: localStorage, settings };
  } catch { return { id: 'elof', storage: null, settings: null }; }
}
/** Without a choice of the player's own, a phone or tablet starts light and a computer starts with everything on. */
function tier(saved: Tier | 'auto' | undefined): Tier {
  const asked = tierFromQuery(params.get('tier'));
  if (asked) return asked;
  if (saved && saved !== 'auto') return saved;
  if (!matchMedia('(pointer: coarse)').matches) return 'high';
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return (navigator.hardwareConcurrency ?? 4) >= 8 && memory >= 6 ? 'mid' : 'low';
}

async function open(): Promise<void> {
  const { id, storage, settings } = player();
  const calm = document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches || !!settings?.calm;
  try {
    const { openKart } = await import('./game');
    const session: KartSession = await openKart({
      host, onClose: () => { location.assign(import.meta.env.BASE_URL); },
      effects: settings ? (settings.sound ? settings.effectsVolume : 0) : .8, music: settings ? (settings.music ? settings.musicVolume : 0) : .6,
      calm, tier: tier(settings?.graphics), storage, playerId: id, debug: params.has('debug'),
    });
    if (params.has('debug')) (window as unknown as { __kart: KartSession }).__kart = session;
  } catch {
    // Words for when the game cannot start, and a way to the adventure.
    const note = document.createElement('p'), back = document.createElement('a');
    back.href = import.meta.env.BASE_URL; back.textContent = sv.kart.back;
    note.append(sv.kart.pageFailed, ' ', back); host.replaceChildren(note);
  }
}
void open();
