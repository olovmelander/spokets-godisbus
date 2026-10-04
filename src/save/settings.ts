import type { HelpLevel, SimOptions } from '../sim/types';
import { tierFromQuery, type Tier } from '../render/quality';

export type Graphics = 'auto' | Tier;

/** The two play styles of plan §4.1. *Äventyr* is Elof's; *Lugnt* is the gentler game for anyone who wants it. */
export type PlayStyle = 'aventyr' | 'lugnt';

/** What a player has chosen. It is saved with the player (plan §6.9). */
export interface Settings {
  style: PlayStyle;
  /** Walk towards a held finger instead of using the floating stick. */
  followFinger: boolean;
  /** The player's picture preference. Auto measures once per choice/session. */
  graphics: Graphics;
  /** *Hjälp med svingen*: the swing pumps itself and always lands. */
  swingHelp: boolean;
  /** *Lätta hopp*: running to a marked edge jumps by itself, and the jump is steered to its landing. */
  easyJumps: boolean;
  /** *Lugnare tempo*: the whole game runs at 80%. */
  slower: boolean;
  /** *Ljud*: the effects and the place's air. Off is silent. */
  sound: boolean;
  /** *Musik*: the tune. */
  music: boolean;
  /** *Vänsterhänt*: the stick and the buttons swap sides. */
  lefty: boolean;
  /** *Större text*: what is said, and the words on the buttons, a quarter bigger. */
  bigText: boolean;
  /** *Mindre rörelse*: nothing on the screen bounces, pulses or slaps on. */
  calm: boolean;
  /** *Ljud även i tyst läge*: an iPhone's silent switch no longer silences the game (plan §6.8). */
  loud: boolean;
  /** How much the helper does by itself: *Bara när jag frågar*, *Påminn mig* or *Guida mig* (plan §4.6). */
  help: HelpLevel;
}

/** The switches each style starts with. Every one of them can then be changed on its own. */
const SWITCHES: Record<PlayStyle, Omit<Settings, 'style'>> = {
  aventyr: { followFinger: false, graphics: 'auto', swingHelp: false, easyJumps: false, slower: false, sound: true, music: true, lefty: false, bigText: false, calm: false, loud: false, help: 'ask' },
  // On Lugnt the sounds carry what a younger player can't read, so the silent switch doesn't take them.
  lugnt: { followFinger: false, graphics: 'auto', swingHelp: true, easyJumps: true, slower: false, sound: true, music: true, lefty: false, bigText: false, calm: false, loud: true, help: 'remind' },
};

/** The settings that are a switch: on or off. */
export type Switch = 'followFinger' | 'swingHelp' | 'easyJumps' | 'slower' | 'sound' | 'music' | 'lefty' | 'bigText' | 'calm' | 'loud';
export const SWITCH_NAMES: Switch[] = ['followFinger', 'swingHelp', 'easyJumps', 'slower', 'sound', 'music', 'lefty', 'bigText', 'calm', 'loud'];
/** The ones that are the player's own, whatever the style: choosing a style leaves them as they are. */
export const OWN_SWITCHES: Switch[] = ['followFinger', 'slower', 'sound', 'music', 'lefty', 'bigText', 'calm'];

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
  return { swingHelp: settings.swingHelp, easyJumps: settings.easyJumps, stopAtEdges: lugnt, gentle: lugnt, help: settings.help };
}

export function tempoOf(settings: Settings): number {
  return settings.slower ? SLOWER_TEMPO : 1;
}

/** Reads settings from a save, whatever is in it: anything missing or wrong becomes the style's own value. */
export function readSettings(value: unknown): Settings {
  const from = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const style: PlayStyle = from.style === 'lugnt' ? 'lugnt' : 'aventyr';
  const base = settingsFor(style);
  const flag = (key: Switch) => (typeof from[key] === 'boolean' ? (from[key] as boolean) : base[key]);
  const help: HelpLevel = from.help === 'ask' || from.help === 'remind' || from.help === 'guide' ? from.help : base.help;
  const graphics: Graphics = tierFromQuery(typeof from.graphics === 'string' ? from.graphics : null) ?? 'auto';
  return { style, followFinger: flag('followFinger'), graphics, swingHelp: flag('swingHelp'), easyJumps: flag('easyJumps'), slower: flag('slower'), sound: flag('sound'), music: flag('music'), lefty: flag('lefty'), bigText: flag('bigText'), calm: flag('calm'), loud: flag('loud'), help };
}
