/**
 * The hidden candy for the album (plan §4.3): four kinds in each chapter, sixteen in Version 1.0. Their
 * names are in `sv.kinds`: plain names of sorts of candy, never a brand (plan §0).
 * Here is what each looks like on the bag and in the world: its colour, and a second colour for its mark.
 */
export interface Kind {
  /** The chapter it is hidden in, by its stable id. */
  chapter: string;
  colour: string;
  mark: string;
}

export const KINDS: Record<string, Kind> = {
  gelehallon: { chapter: 'garden', colour: '#d8345a', mark: '#ff8fa8' },
  gummibjorn: { chapter: 'garden', colour: '#4caf50', mark: '#b6e86a' },
  skumbanan: { chapter: 'garden', colour: '#f2d24a', mark: '#fff3a8' },
  skumsvamp: { chapter: 'garden', colour: '#f4a6b8', mark: '#ffffff' },
  sockerbit: { chapter: 'granskog', colour: '#f7d6de', mark: '#ff9fb6' },
  gummiorm: { chapter: 'granskog', colour: '#f08a2c', mark: '#ffe066' },
  chokladkola: { chapter: 'granskog', colour: '#7a4a2a', mark: '#c99562' },
  colaflaska: { chapter: 'granskog', colour: '#5a2d1a', mark: '#e8c690' },
  chokladpeng: { chapter: 'myren', colour: '#d9a93a', mark: '#fff0a8' },
  stektagg: { chapter: 'myren', colour: '#fff7e0', mark: '#f6c445' },
  surnapp: { chapter: 'myren', colour: '#4aa3d8', mark: '#d6f0ff' },
  lakritskonfekt: { chapter: 'myren', colour: '#3a2a3a', mark: '#f08ab0' },
  polkagris: { chapter: 'berget', colour: '#f4efe6', mark: '#e8483f' },
  graddkola: { chapter: 'berget', colour: '#d9b382', mark: '#fff0d0' },
  salmiakruta: { chapter: 'berget', colour: '#2a2a2e', mark: '#d8d8e0' },
  chokladpralin: { chapter: 'berget', colour: '#5a3620', mark: '#d9a93a' },
};

/** The flag a found candy sets in its chapter: what the save keeps, and what the album is read from. */
export const foundFlag = (kind: string) => `found:${kind}`;

/** The final album piece belongs to all sixteen discoveries; duplicate or unknown flags never count. */
export function albumComplete(found: readonly string[]): boolean {
  const known = new Set(found);
  return Object.keys(KINDS).every((kind) => known.has(kind));
}

/** The kinds found so far, read from a save's flags for every chapter. */
export function album(flags: Record<string, string[]>): string[] {
  const found = new Set(Object.values(flags).flat().filter((flag) => flag.startsWith('found:')).map((flag) => flag.slice('found:'.length)));
  return Object.keys(KINDS).filter((kind) => found.has(kind));
}
