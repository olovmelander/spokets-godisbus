import type { ChapterData } from '../sim/types';

/**
 * Stable IDs: adding a find never renumbers the ordinary or side candy in an existing save. Äventyr 2's each have a place
 * of their own at a side way's end (Olov, 12 November 2026: "placerade fint och strukturerat och inte för plottrigt"),
 * with no heart, trail sweet or big candy crowding them: they lay among the side ways' hearts, on the trail at a big
 * candy, or on a sweet of it. A find is kept by its flag, so moving one changes no save.
 */
export const COLLECTION_PLACES: Record<string, { kind?: string; find: string; x: number; y: number; after?: string }> = {
  granskog: { find:'redbutton', x:150.4, y:-5.6 },
  myren: { find:'ribbon', x:123.1, y:6.2 },
  berget: { find:'bell', x:104, y:28.4 },
  byn: { find:'pencil', x:135, y:5.8 },
  // On the top leaf by the playhouse, where the trampoline's way ends.
  stormgard: { kind:'lingonhjarta', find:'paperboat', x:142.3, y:5.9 },
  // On the branch over the leaning spruce.
  stormskog: { kind:'blabarspastill', find:'spool', x:100.85, y:2.9 },
  // On the last of the yarn shop's stands, where the awning flap's way ends.
  stormbyn: { kind:'citronstjarna', find:'reflector', x:27.6, y:4.7 },
  // At the end of the crossbar, over the goal's mouth.
  olympia: { kind:'fotbollspralin', find:'whistle', x:80.4, y:6 },
  // On the second changing room's roof, past the net's bounce.
  flarken: { kind:'apelsinklyfta', find:'shell', x:56.9, y:2.9 },
  // On the otter's stone, out past the rolling logs.
  alven: { kind:'mintfisk', find:'float', x:147.3, y:0.5, after:'al:lift' },
  // On the loft's high beam, over the hatch.
  billsta: { kind:'kolaknapp', find:'peg', x:64.25, y:7.4, after:'bi:door' },
  // At the back of the stone, behind where the owl sets him down.
  stormoga: { kind:'norrskensruta', find:'lanternstar', x:38.9, y:.6, after:'scene:motet' },
};

/** Applied when either adventure's chapter pack loads; safe to call twice. */
export function addCollections(chapter: ChapterData): void {
  const place = COLLECTION_PLACES[chapter.id];
  if(!place) return;
  if(place.kind && !chapter.hidden?.some(sweet=>sweet.kind===place.kind)) {
    chapter.hidden = [...chapter.hidden ?? [], {kind:place.kind,x:place.x,y:place.y+.55,after:place.after,way:'På en sidoväg, ovanför en stadig avsats.'}];
  }
  const id=`lost:${place.find}`;
  if(!chapter.spots?.some(spot=>spot.id===id)) chapter.spots = [...chapter.spots ?? [], {
    id,look:'souvenir',at:{x:place.x+(place.kind?.length ? .65 : 0),y:place.y},
    verb:'take',touch:true,extra:true,needs:place.after,after:place.after,
  }];
}

/** The little keepsake cards commemorate something Elof actually did, rather than inventing a possession. */
export const KEEPSAKES = {
  vittra: {chapter:'granskog',flag:'keepsake:vittra',picture:'paperboat'},
  paperwing: {chapter:'garden',flag:'plane:board',picture:'paperboat'},
  capboat: {chapter:'granskog',flag:'cap',picture:'float'},
  cranefriend: {chapter:'myren',flag:'home',picture:'bell'},
  highflight: {chapter:'berget',flag:'flight',picture:'ribbon'},
  together: {chapter:'norrsken',flag:'shared',picture:'redbutton'},
  firstcarving: {chapter:'epilog',flag:'dots',picture:'peg'},
  leafboat: {chapter:'byn',flag:'leaf',picture:'shell'},
  owlhelp: {chapter:'stormskog',flag:'placed:owl-twig',picture:'ribbon'},
  capfound: {chapter:'stormbyn',flag:'cap',picture:'reflector'},
  lampfriends: {chapter:'stormoga',flag:'scene:lampa:bertil',picture:'lanternstar'},
  homeagain: {chapter:'morgonen',flag:'cocoa',picture:'redbutton'},
} as const;
export type KeepsakeId = keyof typeof KEEPSAKES;
export function keepsakesFound(flags: Record<string, readonly string[]>): KeepsakeId[] {
  return (Object.keys(KEEPSAKES) as KeepsakeId[]).filter(id=>flags[KEEPSAKES[id].chapter]?.some(flag=>flag===KEEPSAKES[id].flag || flag===`keepsake:${id}`));
}

export const STORM_MEMORIES = {
  'storm:window': {chapter:'stormkvall',flag:'scene:fonstret',pictures:['window-escape']},
  'storm:yard': {chapter:'stormgard',flag:'beat:sg:lonely',pictures:['lonely-hollow','old-window']},
  'storm:forest': {chapter:'stormskog',flag:'beat:ss:alone',pictures:['lonely-hollow','forest-trail']},
  'storm:north': {chapter:'olympia',flag:'scene:norrut',pictures:['northbound','wind-posts']},
  'storm:water': {chapter:'flarken',flag:'beat:sjon:floated',pictures:['wind-posts','outlet-pair']},
  'storm:raft': {chapter:'alven',flag:'beat:al:old-one',pictures:['raft','outlet-pair']},
  'storm:harbour': {chapter:'billsta',flag:'beat:bi:not-alone',pictures:['outlet-pair','safe-harbour']},
  'storm:lights': {chapter:'stormoga',flag:'scene:motet',pictures:['family-lamps','cap-return']},
} as const;
export type StormMemoryId = keyof typeof STORM_MEMORIES;
export const isStormMemory = (id:string): id is StormMemoryId => Object.hasOwn(STORM_MEMORIES,id);
export function memoryFound(id: string, flags: Record<string, readonly string[]>): boolean {
  if(isStormMemory(id)) { const memory=STORM_MEMORIES[id]; return flags[memory.chapter]?.some(flag=>flag===memory.flag || flag===`memory:${id}`) ?? false; }
  return flags[id]?.includes('memory') ?? false;
}

/** A replay clears scene/line flags. Collection receipts outlive that reset, including saves made before this feature. */
export function collectionReceipts(chapter: string, flags: readonly string[]): string[] {
  const known=new Set(flags);
  return [
    ...Object.entries(KEEPSAKES).filter(([,item])=>item.chapter===chapter && known.has(item.flag)).map(([id])=>`keepsake:${id}`),
    ...Object.entries(STORM_MEMORIES).filter(([,item])=>item.chapter===chapter && known.has(item.flag)).map(([id])=>`memory:${id}`),
    ...flags.filter(flag=>flag.startsWith('keepsake:') || flag.startsWith('memory:storm:')),
  ];
}
