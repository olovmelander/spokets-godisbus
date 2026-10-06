import { sv } from '../content/sv';
import { use } from './icons';
import type { IconId } from './sprite';

// Keys as keycaps (docs/ux-audit/style-and-sound.md, "Icons"): an arrow key, the space bar and the pad's cross are
// drawn, not typed, and a screen reader hears each one's name.

const DRAWN: Record<string, IconId> = { '←': 'key-left', '→': 'key-right', '↑': 'key-up', '↓': 'key-down', Mellanslag: 'key-space', styrkorset: 'cross-pad' };
const NAMES: Record<string, string> = { ...sv.arrowKeys, Mellanslag: 'Mellanslag', styrkorset: 'styrkorset' };

/** One key: its drawing (with its name for a screen reader), or its letters as printed on it. */
export const keyFace = (key: string) => DRAWN[key] ? `${use(DRAWN[key]!)}<span class="sr-only">${NAMES[key]}</span>` : key;

/** One key or keys side by side ("← →"), each in its own cap; the space bar's cap is wide. */
export const keycapsOf = (keys: string) => keys.split(' ').map((key) => `<kbd${key === 'Mellanslag' ? ' class="key-wide"' : ''}>${keyFace(key)}</kbd>`).join('');

/** The hint line for keys or a pad: each key, and what it does. */
export const hintHtml = (pairs: readonly (readonly [string, string])[]) =>
  pairs.map(([keys, does]) => `<span class="hint-pair">${keycapsOf(keys)} ${does}</span>`).join('<span class="hint-dot" aria-hidden="true"> · </span>');
