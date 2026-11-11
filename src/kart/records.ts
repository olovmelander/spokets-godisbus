/** Optional local race times. Never writes an adventure save or changes a collection. */
export interface KartRecord { race: number; lap: number }
type Store = Pick<Storage, 'getItem' | 'setItem'>;
interface Records { v: 1; generation: string; normal?: KartRecord; easy?: KartRecord }
const keyFor = (id: string) => `godisbus.kart.v1.${id}`;
function generation(storage: Store | null, id: string): string | null {
  try {
    const index: unknown = JSON.parse(storage?.getItem('godisbus.v1.index') ?? 'null');
    if (!index || typeof index !== 'object' || !('players' in index) || !Array.isArray(index.players)) return null;
    const profile: unknown = index.players.find((p: unknown) => p && typeof p === 'object' && 'id' in p && p.id === id);
    if (!profile || typeof profile !== 'object') return null;
    return 'generation' in profile && typeof profile.generation === 'string' ? profile.generation : '';
  } catch { return null; }
}
const validTime = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 86400;
function record(value: unknown): KartRecord | undefined {
  if (!value || typeof value !== 'object' || !('race' in value) || !('lap' in value)) return;
  return validTime(value.race) && validTime(value.lap) && value.lap <= value.race ? { race: value.race, lap: value.lap } : undefined;
}

export function createKartRecords(storage: Store | null, id: string) {
  const epoch = generation(storage, id);
  function read(): Records {
    const empty: Records = { v: 1, generation: epoch ?? '' };
    if (epoch === null || generation(storage, id) !== epoch) return empty;
    try {
      const value: unknown = JSON.parse(storage?.getItem(keyFor(id)) ?? 'null');
      if (!value || typeof value !== 'object' || !('v' in value) || value.v !== 1 || !('generation' in value) || value.generation !== epoch) return empty;
      return { ...empty, normal: record('normal' in value ? value.normal : undefined), easy: record('easy' in value ? value.easy : undefined) };
    } catch { return empty; }
  }
  return {
    best(easy: boolean): KartRecord | undefined { return read()[easy ? 'easy' : 'normal']; },
    finish(easy: boolean, result: KartRecord): { saved: boolean; improved: boolean } {
      if (!record(result)) return { saved: false, improved: false };
      const all = read(), mode = easy ? 'easy' : 'normal', previous = all[mode];
      const improved = !previous || result.race < previous.race;
      all[mode] = { race: Math.min(result.race, previous?.race ?? Infinity), lap: Math.min(result.lap, previous?.lap ?? Infinity) };
      if (!storage || epoch === null || generation(storage, id) !== epoch) return { saved: false, improved };
      try { storage.setItem(keyFor(id), JSON.stringify(all)); return { saved: true, improved }; }
      catch { return { saved: false, improved }; }
    },
  };
}

export function kartTime(seconds: number): string {
  const tenths = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')},${tenths % 10}`;
}
