export interface KartOptions {
  host: HTMLElement;
  onClose(): void;
  effects: number;
  music: number;
  calm: boolean;
  tier: 'low' | 'mid' | 'high';
  storage: Storage | null;
  playerId: string;
  debug: boolean;
}

/** The house owns this session; closing never replaces its simulation or saved chapter. */
export interface KartSession {
  element: HTMLElement;
  suspend(blocked: boolean): void;
  dispose(): void;
  debug(): Record<string, unknown>;
  /** Only with `debug`: sets values on the player's kart (a place on the lap, an item). */
  poke?: (values: Record<string, unknown>) => void;
}
