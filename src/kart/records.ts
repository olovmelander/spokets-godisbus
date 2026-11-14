/** Optional local race times and cup places. Never writes an adventure save or changes a collection. */
export interface KartRecord { race: number; lap: number }
type Store = Pick<Storage, 'getItem' | 'setItem'>;
// v3: four courses, three speed classes and three difficulties each keep their own best; earlier times were
// driven on other rules and are not carried over.
interface Records { v: 3; generation: string; times: Record<string, KartRecord>; cups: Record<string, number> }
const keyFor = (id: string) => `godisbus.kart.v3.${id}`;
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
const validPlace = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 8;

export function createKartRecords(storage: Store | null, id: string) {
  const epoch = generation(storage, id);
  function read(): Records {
    const empty: Records = { v: 3, generation: epoch ?? '', times: {}, cups: {} };
    if (epoch === null || generation(storage, id) !== epoch) return empty;
    try {
      const value: unknown = JSON.parse(storage?.getItem(keyFor(id)) ?? 'null');
      if (!value || typeof value !== 'object' || !('v' in value) || value.v !== 3 || !('generation' in value) || value.generation !== epoch) return empty;
      if ('times' in value && value.times && typeof value.times === 'object') for (const [key, entry] of Object.entries(value.times)) { const time = record(entry); if (time) empty.times[key] = time; }
      if ('cups' in value && value.cups && typeof value.cups === 'object') for (const [key, place] of Object.entries(value.cups)) if (validPlace(place)) empty.cups[key] = place;
      return empty;
    } catch { return empty; }
  }
  function write(all: Records): boolean {
    if (!storage || epoch === null || generation(storage, id) !== epoch) return false;
    try { storage.setItem(keyFor(id), JSON.stringify(all)); return true; } catch { return false; }
  }
  return {
    /** The best race and lap on one course at one speed class and difficulty. */
    best(course: string, cc: number, level: string): KartRecord | undefined { return read().times[`${course}.${cc}.${level}`]; },
    finish(course: string, cc: number, level: string, result: KartRecord): { saved: boolean; improved: boolean } {
      if (!record(result)) return { saved: false, improved: false };
      const all = read(), key = `${course}.${cc}.${level}`, previous = all.times[key];
      const improved = !previous || result.race < previous.race;
      all.times[key] = { race: Math.min(result.race, previous?.race ?? Infinity), lap: Math.min(result.lap, previous?.lap ?? Infinity) };
      return { saved: write(all), improved };
    },
    /** The best place in the cup at one speed class and difficulty. */
    bestCup(cc: number, level: string): number | undefined { return read().cups[`${cc}.${level}`]; },
    finishCup(cc: number, level: string, place: number): { saved: boolean; improved: boolean } {
      if (!validPlace(place)) return { saved: false, improved: false };
      const all = read(), key = `${cc}.${level}`, previous = all.cups[key];
      const improved = !previous || place < previous;
      all.cups[key] = Math.min(place, previous ?? 8);
      return { saved: write(all), improved };
    },
  };
}

export function kartTime(seconds: number): string {
  const tenths = Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')},${tenths % 10}`;
}
