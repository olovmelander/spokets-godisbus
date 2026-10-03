import type { SimOptions } from '../sim/types';

/** The two play styles of plan §4.1. *Äventyr* is Elof's; *Lugnt* is the gentler game for anyone who wants it. */
export type PlayStyle = 'aventyr' | 'lugnt';

/** What a player has chosen. It is saved with the player (plan §6.9). */
export interface Settings {
  style: PlayStyle;
  /** *Hjälp med svingen*: the swing pumps itself and always lands. */
  swingHelp: boolean;
  /** *Lätta hopp*: running to a marked edge jumps by itself, and the jump is steered to its landing. */
  easyJumps: boolean;
  /** *Lugnare tempo*: the whole game runs at 80%. */
  slower: boolean;
}

/** The switches each style starts with. Every one of them can then be changed on its own. */
const SWITCHES: Record<PlayStyle, Omit<Settings, 'style'>> = {
  aventyr: { swingHelp: false, easyJumps: false, slower: false },
  lugnt: { swingHelp: true, easyJumps: true, slower: false },
};

export const SLOWER_TEMPO = 0.8;

export function settingsFor(style: PlayStyle): Settings {
  return { style, ...SWITCHES[style] };
}

/**
 * What the simulation needs to know. In *Lugnt* Elof also stops at every long drop instead of falling, and
 * the exciting sequences need no timing.
 */
export function simOptions(settings: Settings): SimOptions {
  const lugnt = settings.style === 'lugnt';
  return { swingHelp: settings.swingHelp, easyJumps: settings.easyJumps, stopAtEdges: lugnt, gentle: lugnt };
}

export function tempoOf(settings: Settings): number {
  return settings.slower ? SLOWER_TEMPO : 1;
}

/** Reads settings from a save, whatever is in it: anything missing or wrong becomes the style's own value. */
export function readSettings(value: unknown): Settings {
  const from = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const style: PlayStyle = from.style === 'lugnt' ? 'lugnt' : 'aventyr';
  const base = settingsFor(style);
  const flag = (key: keyof Omit<Settings, 'style'>) => (typeof from[key] === 'boolean' ? (from[key] as boolean) : base[key]);
  return { style, swingHelp: flag('swingHelp'), easyJumps: flag('easyJumps'), slower: flag('slower') };
}
