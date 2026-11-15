import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { round, row } from '../kit';
import { DOLL_Z, TAKE } from '../../../render/elof-coat';
import { HOME_LAYOUT } from '../../home-layout';
import { CANDLES_LIT, POWER_FLICKER, POWER_GOES, POWER_OUT } from '../../home-power';
import { BOWL, BOWL_LEAP, GRAB, GRABS, LEAP_OVER } from '../bowl';

/**
 * Äventyr 2, Prolog: Stormkvällen (docs/aventyr-2.md). Units: EL. A Saturday evening at the end of October, at
 * home, while the autumn storm comes in over the village. Elof begins as a boy among small things.
 *
 * 1. **Kvällen** (a held scene): rain on the windows, the lights go out, Mamma lights candles, Bertil thinks the
 *    house creaks like a ship, and Pappa can't find the flashlight in the dark.
 * 2. **Ficklampan:** Elof takes it from the table and gives it to Pappa: *Ta ficklampan*, *Ge Pappa*.
 * 3. **Godnatt:** at Pappa's shelf Elof says goodnight to his own little trägubbe and to the old one, the
 *    first, home again on the shelf. *Säg godnatt.*
 * 4. **Fönstret** (a held scene): the window by the shelf has rattled all evening. A gust bursts it open: its
 *    halves fly outward and bang in the wind (`house.opens`, the `casement` look), the little one is swept out into
 *    the dark, and the old one leaps after him, by way of the bowl of Saturday sweets on the table: down into it, up
 *    with his arms full, and out through the window (../bowl.ts). This is the fistful his trail is made of. Pappa sees
 *    only two empty places on the shelf.
 * 5. **Klonks stjärna** (a held scene): Pappa shuts the window and Mamma looks out after them, so no grown-up sees
 *    the shelf. Klonk wakes, hops down to Elof's feet and opens its carved bag: one star left, and it rises out of
 *    the bag. It is nowhere to be seen before (`Spot.after`). *Smaka på stjärnan*: POFF.
 * 6. **Vi letar tillsammans:** Moa misses Elof; Bertil finds him tiny on the floor. Once they have
 *    reacted and promised to help, the family pull on raincoats and take their lamps. A candy lies on the floor, then
 *    another: the old trägubbe's trail, found with Moa and Bertil beside him (`spar`). Tiny, he crosses the giant room
 *    and the veranda. The trail is laid only now, its big candies too (`Checkpoint.after`): nothing lies on the floor
 *    before the gust.
 *    None of their raincoats fits him now; at the foot of the toy shelf a doll sits in a small yellow one. *Ta
 *    regnrocken*: he puts it on, one arm and the other, and it fits (Olov, 9 November 2026; ../../../render/elof-coat.ts).
 *    He wears it through the storm. It is not needed to go on: walked past, he goes out onto the deck in his own clothes.
 * 7. **Ut på altanen** (a held scene): he steps out into the rain, and all four come out through the door after him,
 *    Pappa first with his lamp, and kneel and crouch along the deck.
 * 8. **Stormnatten:** at the deck's edge each of them says what they have for him, Moa and Bertil too; he calls out to
 *    the little one, the stormy garden opens below him, and the adventure's title.
 *
 * The family are the same rehearsal figures as the first adventure's prologue (src/render/stage.ts).
 */

/** Pappa's shelf on the wall, and where the two figures stand on it until the gust. */
const SHELF = HOME_LAYOUT.shelf;
const OLD = { x: SHELF.x - 3.6, y: SHELF.y + 0.08, z: -8.5 };
const LITTLE = { x: SHELF.x - 2.9, y: SHELF.y + 0.08, z: -8.3 };
/** The window by the shelf that the storm bursts open. */
const WINDOW = { x: 9.4, y: 6, z: -8.9 };
/**
 * Out in the dark beyond that window, where Pappa's lamp shines looking for the figures: far enough out, and a little
 * up, that the beam leaves his hand at a gentle slant and goes out through the glass, not straight up the wall.
 */
const OUTSIDE = { x: WINDOW.x + 0.8, y: 9, z: -22 };
/** Klonk on the shelf beside them, still wood while the grown-ups look. */
const KLONK_SHELF = { x: SHELF.x - 2.1, y: SHELF.y + 0.08, z: -8.4 };
/** The bowl of Saturday sweets on the table, at the top of its heap: what Moa sees him take from, and points back at. */
const BOWL_TOP = { x: BOWL.x, y: BOWL.y + 0.55, z: BOWL.z };
/** When the old one leaps for it, in the scene of the window: once the little one is gone and Elof has cried out. */
const LEAP = 6.0;
/**
 * Where Pappa and Mamma hurry to as the window bursts open: to it, a place each side of where the old one leaves by
 * it, clear of Bertil, of the bowl and of both the old one's leaps. He goes out between them, over their shoulders.
 */
const AT_WINDOW = { pappa: { x: 9.9, z: -6.0 }, mamma: { x: 12.5, z: -6.3 } };
/** Bertil starts back a step from the window as it bursts, out of Pappa's way to it. */
const BERTIL_BACK = 7.5;
/** Where he says goodnight, under the shelf. */
const GOODNIGHT = 4.2;
/** Where he tastes the star, a step on from the shelf: it floats between him and Klonk, at Klonk's bag. */
const STAR = 6.4;
const STAR_Y = 0.35;
/** Where Klonk lands from the shelf and stands with its bag, facing him. */
const KLONK = { x: STAR + 0.9, y: 0, z: 0 };
/**
 * Where each of the family kneels or crouches round him once they have found him small (`upptackt`), facing him, and gets
 * ready to go out (`tillsammans`). Their ways there from the window and the table do not cross.
 */
const AROUND = {
  pappa: { x: STAR - 1.8, z: -1.6, face: 0.116 },
  mamma: { x: STAR + 0.2, z: -3.2, face: 0.26 },
  moa: { x: STAR + 2.0, z: -1.0, face: 0.426 },
  bertil: { x: STAR + 3.4, z: -2.8, face: 0.39 },
};
/** What the trail's big candies wait for: the old trägubbe lays it, and it is found once he is small. */
const TRAIL = 'scene:tillsammans';
/**
 * The whole family out on the deck as he passes, as in the first adventure's prologue: Mamma, Moa, Bertil and Pappa
 * along it, kneeling and crouching where he goes by, a place each, and all four in the picture as the promises are said
 * at its edge (Olov, 12 November 2026: "Moa och Bertil får gärna hänga med på altanen"). Each kneels well back from the
 * lane the others come out along (`LANE`); Moa and Bertil crouch between Mamma and Pappa, clear of each other, of
 * their knees and of the line he walks. The deck's big candy stands before Mamma, not among them.
 */
const DECK = {
  mamma: { x: 52.8, z: -3.3, face: 0.3 },
  moa: { x: 55, z: -2.8, face: 0.28 },
  bertil: { x: 56.8, z: -2.3, face: 0.3 },
  pappa: { x: 59.4, z: -3.0, face: 0.34 },
};
/**
 * Where he is when Moa and Bertil go on ahead of him to the door (`verandan`): in the hall, past the white bathroom door,
 * before the veranda's. Everything by the door and out of it stands ten further along than it did before the hall was
 * put between the bathroom's door and the veranda's (Olov, 15 November 2026: "Jag vill ha den vita och den gröna dörren
 * överallt", and "Jag vill ha verandadörren så som den funkar idag men även ha de två dörrarna").
 */
const LEAVE = 39.6;
/**
 * Where he is when the four of them come out after him (`lofte`): out on the deck, in the rain, far enough from the
 * door that the house's front has closed over its inside in the picture.
 */
const STEPS_OUT = 49.4;
/**
 * Moa and Bertil go with him. Once the trail is found they walk after him across the room, this far behind him (as the
 * family follow him in the first adventure's prologue) and far enough apart not to swing into each other, in front of
 * the table, the doll, the toy shelf and the big candies (`z`), so that they go by none of them (`foljer`). As he comes
 * onto the veranda (`verandan`) they step in behind the line he walks, to where they walk after him then (or, left
 * behind as he ran, past the toy shelf), into a lane of their own (`lane`), go on in it past him and the veranda's
 * big candy to the door, and step back out of it there to wait for Mamma and Pappa (`waits`, from where each leaves
 * the lane, `turns`): Bertil by the door, Moa a step behind him, both turned to him as he goes out. Where each turns
 * out of the lane and into it again, arms swinging, is clear of the big candy and of the wall the door is in.
 */
const KIDS = {
  // Moa strides past him on the veranda a little further from the line he walks than she goes out of the door (`inside`).
  moa: { behind: 5.6, z: 1.25, lane: -0.97, inside: -1.2, turns: 44.5, waits: { x: 44.2, z: -4.2 } },
  bertil: { behind: 2.6, z: 0.95, lane: -1.0, inside: -1.0, turns: 46.8, waits: { x: 46.6, z: -3.5 } },
};
/**
 * All four walk out through the door onto the deck together (Olov, 14 November 2026: "Mamma och pappa måste promenera ut
 * på trallen tillsammans med Moa och Bertil. Nu dyker de bara upp utomhus"). One lane goes through the door, behind the
 * line he walks: between its posts, and past the open door's leaf, the ghost and the deck's big candy. In it they go one
 * after another, the one who is to kneel furthest along the deck first, so that nobody passes anybody: Pappa with his
 * lamp, Bertil, Moa, and Mamma last. Mamma and Pappa were last seen by the shelf. From out on the deck the house's
 * front hides its inside (../../../render/dressing/house-door.ts), so they come from just inside the door
 * (`FROM_HOUSE`): Pappa beside where Moa waits, Mamma further in, as the scene begins (`COME_OUT`), and are first
 * seen as they step out past the door's post. A grown-up striding is two lengths wide with his arms: their lane is
 * the doorway's own middle, as near the line he walks as the ghost and he, who has stepped aside, let it be.
 */
const LANE = -0.8;
const FROM_HOUSE = { pappa: 44.9, mamma: 41.6 };
const COME_OUT = 0.1;
/** Where Pappa's lamp shines as he walks out along the deck: on its boards a few steps ahead of him, towards its edge. */
const AHEAD = { x: 64, y: -0.8, z: 0.4 };
/** Where he is drawn while they come out: a step aside from the line he walks, towards us (`lofte`). */
const ASIDE = { x: 0.3, y: 0, z: 0.7 };
/** His face as he stands out on the deck and they come: what Moa and Bertil look at while they wait. */
const OUT_ON_DECK = { x: STEPS_OUT + 0.4, y: 0, z: 0.4 };
/** Him at the deck's edge, for the family to look at as they speak; and out in the storm, where the little one went. */
const AT_EDGE = { x: 61.4, y: 0.4, z: 0 };
const INTO_STORM = { x: 70, y: -5, z: -3 };
/** Where the big candies on the veranda and the deck stand (`Checkpoint.z`): behind the lanes the family walk in, not in them. */
const CANDY_BEHIND_LANE = -2.6;
/** The trail's first big candy, where the old one landed under the window. */
const TRAIL_FOUND = 10.6;
/**
 * Where he stops to find it (`spar`): a step past the big candy, so that its lollipop does not stand in front of him in
 * the picture; and his face there, small on the floor, for the family to look at.
 */
const SPAR = TRAIL_FOUND + 0.8;
const AT_TRAIL = { x: SPAR + 0.2, y: 0.6, z: 0 };
/**
 * The toy shelf in front of the sofa, and the doll sitting at its foot in its small yellow raincoat: on his way across
 * the room, after the table, where nobody stands in any scene. Its back leans on the shelf's front.
 */
const TOY_SHELF = { x: HOME_LAYOUT.toyShelf.x, z: DOLL_Z - 0.8 };
const DOLL = { x: 20.45 };

// Where each of the family is as the evening opens, clear of each other, the table and its chairs. The table is 5 long
// and 2.2 deep (x 11.5 to 16.5, z -2.6 to -0.4), with a chair behind it and one at its right end (`furniture`).
/**
 * Mamma behind the table, and the candle she lights, near its back edge where she reaches it. A step along from Pappa: at
 * 12.4 she stood half behind him in the opening picture as she lit it and said so.
 */
const MAMMA = { x: 12.9, z: -3.4 };
const CANDLE = { x: 13, y: 1.65, z: -2.1 };
/** When the candle catches in the dark, a moment after the lamps went out: her hand is at its wick. */
const CANDLE_CATCHES = 4.2;
/** The lamp over the table, which goes out with the power (../../../render/power-cut.ts draws it): its shade, looked up at. */
export const PENDANT = { x: HOME_LAYOUT.dining.x, y: 6.3, z: HOME_LAYOUT.dining.z };
/** Pappa left of the table, feeling about in the dark: Elof gives him the flashlight here. */
const PAPPA = { x: 10.6, z: -1.6 };
/** Moa on the chair at the table's end, drawing, as she does in the first adventure's prologue. */
const MOA = { x: HOME_LAYOUT.dining.chairs.end.x - 0.395, z: HOME_LAYOUT.dining.chairs.end.z };
/** Bertil by the wall between the shelf and the window he watches. */
const BERTIL = { x: 8.4, z: -4.4 };

const SCENES: SceneDef[] = [
  {
    // 1. The storm evening, from black: rain on the panes, the room lit by its lamp over the table. The storm takes the
    // power: the lamps flicker and go out (../../home-power.ts), they all look up, and in the dark Mamma reaches to the
    // candle on the table, unlit until now, and it catches as she says so (Olov, 12 November 2026: "hur får vi det att
    // se ut som att strömmen faktiskt går i början och att mamma sen tänder det ljus som i början inte är tänt?").
    id: 'kvall',
    at: 2.2,
    until: 'goodnight',
    seconds: 12,
    hold: true,
    cues: [{ at: POWER_GOES, flag: POWER_OUT }, { at: CANDLE_CATCHES, flag: CANDLES_LIT }],
    // A gust in the dark outside as the lamps flicker: what took the power.
    sounds: [{ at: POWER_FLICKER - 0.1, sound: 'wind' }],
    lines: [
      { at: CANDLE_CATCHES, who: 'mamma', line: 'skPower' },
      { at: 6.2, who: 'pappa', line: 'skLamp' },
      { at: 8.2, who: 'bertil', line: 'skShip' },
      { at: 10.2, who: 'elof', line: 'skWind' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.6 }],
      words: [{ at: 0.4, seconds: 3.2, kind: 'caption', text: 'stormkvall' }],
      // Wide enough for Pappa, Mamma and her candle as each of them speaks, and the lamp over the table.
      shots: [{ at: 0, x: 8.4, y: 3.8, height: 7.8, width: 14, move: 0.01 }],
      actors: {
        // As the lamps go out she looks up at the one over the table; then she lights the candle, her hand at its wick
        // as it catches, and lets her arm down again.
        mamma: [
          { at: 0, ...MAMMA, y: 0, face: 0.25, move: 0.01, act: 'stand' },
          { at: POWER_GOES - 0.3, act: 'look', aim: PENDANT },
          { at: POWER_GOES + 0.1, act: 'lift', aim: { x: CANDLE.x, y: CANDLE.y + 0.35, z: CANDLE.z } },
          { at: 5.8, act: 'stand' },
        ],
        pappa: [
          { at: 0, ...PAPPA, y: 0, face: 0.3, move: 0.01, act: 'look', aim: WINDOW },
          { at: POWER_GOES - 0.2, aim: PENDANT },
          { at: 6.0, act: 'shrug' },
        ],
        // He looks at the creaking window with relaxed arms, up at the lamp as it goes, then turns back as Elof answers.
        bertil: [
          { at: 0, ...BERTIL, y: 0, face: 0.7, move: 0.01, act: 'stand', aim: WINDOW },
          { at: POWER_GOES - 0.1, act: 'look', aim: PENDANT },
          { at: 8.0, act: 'look', aim: WINDOW },
          { at: 10.0, face: 0.4, act: 'look', aim: { x: 2.6, y: 2.6, z: 0 } },
        ],
        // Moa looks up from her drawing as the lamp goes out, and draws on by candlelight.
        moa: [
          { at: 0, ...MOA, y: 0, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' },
          { at: POWER_GOES, act: 'look', aim: PENDANT },
          { at: 5.4, act: 'draw' },
        ],
        ghost: [{ at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'freeze' }],
      },
      elof: [
        { at: 0, act: 'watch', aim: WINDOW },
        { at: POWER_GOES - 0.2, aim: PENDANT },
        { at: CANDLE_CATCHES, aim: { x: CANDLE.x, y: CANDLE.y + 0.4, z: CANDLE.z } },
        { at: 10.0, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.6, z: OLD.z } },
      ],
    },
  },
  {
    // 3. The window bursts open: its two halves fly out and bang in the wind (the `casement` look, at 'gust'), and a
    // stream of wind takes the little one from the shelf out into the dark. Pappa and Mamma hurry to the window. The
    // old one turns to it on the shelf, and when Elof has cried out he leaps after him (`BOWL_LEAP`, ../bowl.ts): down
    // through the room into the bowl of Saturday sweets on the table, where he digs in and comes up with his arms
    // full, and on out through the window between the two of them, sweets flying after him and four spilt on the table
    // (Olov, 14 November 2026: "Det ska tydligt synas när han tar godiset ur skålen"). The picture goes with him: the
    // room for his leap down, close on the bowl while he is in it, and out to the window with him. Nothing is said
    // while he does it (a cue is a reading stop, so the leap waits for Elof's words). Moa sees it, and says so when the
    // trail is found (`spar`).
    id: 'fonstret',
    on: 'goodnight',
    until: 'star',
    seconds: 15.2,
    hold: true,
    cues: [{ at: 1.4, flag: 'gust' }, { at: LEAP, flag: BOWL_LEAP }],
    // The wind; and wood on glass as he lands in the bowl, and the sweets' papers as he digs.
    sounds: [{ at: 1.4, sound: 'wind' }, { at: LEAP + GRAB.lands, sound: 'clatter' }, { at: LEAP + GRAB.lands + 0.3, sound: 'paper' }, { at: 8.6, sound: 'wind' }, { at: 12.0, sound: 'wind' }],
    lines: [
      { at: 0.3, who: 'elof', line: 'skGoodnightLine' },
      { at: 2.6, who: 'moa', line: 'skWindow' },
      { at: 4.4, who: 'elof', line: 'skTaken' },
      { at: LEAP + GRAB.out + 0.25, who: 'elof', line: 'skLeapt' },
      { at: 11.2, who: 'pappa', line: 'skEmpty' },
      { at: 13.2, who: 'mamma', line: 'skSearch' },
    ],
    stage: {
      shots: [
        // The shelf and the two on it, and him under it as he says goodnight: his head and shoulders, not his crown.
        { at: 0, x: 6.4, y: 4.1, height: 6.2, width: 8.4, move: 0.6 },
        { at: 1.4, x: 8.0, y: 5.6, height: 4.4, width: 7, move: 0.4 },
        { at: 4.2, x: 7.2, y: 3.6, height: 7, width: 11, move: 1.2 },
        // The old one on the shelf and the bowl on the table, for his leap down into it; close on the bowl as he
        // lands, digs and comes up; out to the window with him as he leaves; and the room again for what is said of it.
        { at: LEAP - 0.75, x: 8.0, y: 3.9, height: 7.2, width: 12.6, move: 0.7 },
        { at: LEAP + 0.45, x: BOWL.x - 0.2, y: 2.75, height: 3.6, width: 5.2, move: 0.6 },
        { at: LEAP + GRAB.leaps - 0.12, x: 11.0, y: 4.3, height: 6.2, width: 8.2, move: 0.55 },
        { at: LEAP + GRAB.out + 0.15, x: 7.6, y: 3.6, height: 7, width: 11.4, move: 1.0 },
      ],
      fx: [
        { at: 1.4, kind: 'wind', from: WINDOW, to: { x: 3.6, y: 2.0, z: -0.8 }, seconds: 13.7 },
        { at: 1.3, kind: 'stream', from: { x: LITTLE.x, y: LITTLE.y + 0.3, z: LITTLE.z }, to: { x: WINDOW.x + 2, y: WINDOW.y + 1.4, z: WINDOW.z }, seconds: 1.8 },
        { at: 1.4, kind: 'sparkle', from: { x: WINDOW.x, y: WINDOW.y, z: WINDOW.z + 0.3 }, seconds: 1.4 },
        // A glitter over the bowl as he lands in it.
        { at: LEAP + GRAB.lands, kind: 'sparkle', from: BOWL_TOP, seconds: 0.9 },
      ],
      actors: {
        // She points at the window; and sees the old one in the bowl, and looks after him as he goes.
        moa: [{ at: 2.4, act: 'point', aim: WINDOW }, { at: LEAP + 0.6, act: 'look', aim: BOWL_TOP }, { at: LEAP + GRAB.leaps + 0.2, aim: WINDOW }],
        bertil: [{ at: 1.6, act: 'startle' }, { at: 1.9, x: BERTIL_BACK, move: 0.7 }, { at: 3.0, act: 'look', aim: WINDOW }],
        // To the window, round the table's end, her back to the bowl; she turns to them all again for her own words.
        mamma: [
          { at: 1.6, act: 'gasp' },
          { at: 2.5, ...AT_WINDOW.mamma, y: 0, face: 0.75, move: 1.3, act: 'look', aim: WINDOW },
          { at: 12.8, face: 0.36, act: 'nod' },
        ],
        // To the window at once, his lamp out into the dark; and there he looks along the wall at the shelf.
        pappa: [
          { at: 1.6, act: 'startle' },
          { at: 2.3, ...AT_WINDOW.pappa, y: 0, face: 0.75, move: 1.1, act: 'look', aim: WINDOW },
          { at: 10.7, face: 0.6, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.4, z: OLD.z } },
        ],
        // Klonk stays wood on the shelf while Pappa looks; it peeks at Elof the moment he turns away. A scene's
        // ghost starts from nowhere in particular, so its first key says where it is.
        ghost: [{ at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'freeze' }, { at: 4.2, act: 'peek' }, { at: 10.5, act: 'freeze' }, { at: 13.9, act: 'tilt' }],
      },
      elof: [
        { at: 1.4, act: 'startle' }, { at: 4.2, act: 'point', aim: WINDOW },
        { at: LEAP + 0.4, act: 'watch', aim: BOWL_TOP }, { at: LEAP + GRAB.leaps + 0.2, aim: WINDOW },
        { at: LEAP + GRAB.out + 0.1, act: 'point', aim: WINDOW }, { at: 10.9, act: 'watch', aim: WINDOW },
      ],
    },
  },
  {
    // The grown-ups go to the burst window, their backs to the room: Pappa shuts it, Mamma looks out after the
    // figures. Nobody grown-up sees the shelf, so Klonk wakes, hops down to Elof's feet and opens its carved bag:
    // one star left, saved for a night like this. The star rises out of the bag ('star:out'); it was not there.
    id: 'klonkstar',
    on: 'scene:fonstret',
    until: 'star',
    seconds: 10.6,
    hold: true,
    // Pappa pulls the banging window to as he reaches it ('window:shut'), while the picture is still wide.
    cues: [{ at: 2.0, flag: 'window:shut' }, { at: 4.6, flag: 'star:out' }],
    sounds: [{ at: 1.2, sound: 'blink' }, { at: 4.5, sound: 'blink' }],
    lines: [
      { at: 5.4, who: 'spoket', line: 'skKlonk' },
      { at: 7.2, who: 'elof', line: 'skOneStar' },
      { at: 9.2, who: 'elof', line: 'skStarPlan' },
    ],
    stage: {
      shots: [
        // The shelf, Elof under it and the window with the grown-ups' backs; then down to the floor with Klonk.
        { at: 0, x: 6.4, y: 3.8, height: 7.6, width: 11, move: 0.8 },
        { at: 3.0, x: STAR + 0.4, y: 1.5, height: 4.6, width: 6.6, move: 1.4 },
      ],
      fx: [
        { at: 0, kind: 'wind', from: WINDOW, to: { x: 3.6, y: 2.0, z: -0.8 }, seconds: 2.0 },
        { at: 4.4, kind: 'sparkle', from: { x: KLONK.x - 0.3, y: 0.6, z: 0.2 }, seconds: 1.6 },
        { at: 4.6, kind: 'glow', from: { x: STAR, y: STAR_Y + 0.55, z: 0.1 }, seconds: 3.8 },
      ],
      actors: {
        // He pulls the window to with his free hand, his lamp shining out through it into the dark after the figures
        // (Olov, 12 November 2026: "pappa ska lysa ut genom fönstret för att titta efter trägubbarna"), and looks out.
        pappa: [
          { at: 0.2, x: WINDOW.x, y: 0, z: -7.4, face: 0.75, move: 1.2, act: 'reach', aim: WINDOW, beam: OUTSIDE },
          { at: 2.4, act: 'look', aim: OUTSIDE },
        ],
        mamma: [{ at: 0.5, x: WINDOW.x + 1.8, y: 0, z: -6.8, face: 0.75, move: 1.3, act: 'look', aim: { x: WINDOW.x + 0.6, y: WINDOW.y - 0.4, z: WINDOW.z - 1 } }],
        bertil: [{ at: 0.6, face: 0.75, act: 'look', aim: WINDOW }],
        moa: [{ at: 0.8, face: 0.75, act: 'look', aim: WINDOW }],
        ghost: [
          { at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'peek' },
          // A look at Elof: the grown-ups have turned away.
          { at: 1.2, act: 'tilt' },
          { at: 1.8, ...KLONK, face: 0.5, move: 1.2, act: 'hop' },
          { at: 3.0, act: 'stand' },
          { at: 3.8, act: 'tilt' },
        ],
      },
      // He came to the shelf from the right, so he faces the shelf first, then turns as Klonk lands.
      elof: [
        { at: 0, face: 0.75, act: 'watch', aim: { x: KLONK_SHELF.x, y: KLONK_SHELF.y + 0.6, z: KLONK_SHELF.z } },
        { at: 2.2, face: 0.06, act: 'watch', aim: { x: KLONK.x, y: 0.6, z: KLONK.z } },
        { at: 4.6, act: 'watch', aim: { x: STAR, y: STAR_Y + 0.6, z: 0 } },
      ],
    },
  },
  {
    // 4. A taste, a held breath, POFF: the same magic as the first time, by his own choice now.
    id: 'krymper',
    resumeAt: { x: STAR, y: 0 },
    on: 'star',
    seconds: 7.8,
    hold: true,
    soundQuiet: [1.6, 7],
    sounds: [{ at: 2.4, sound: 'taste' }, { at: 3.3, sound: 'swell' }, { at: 3.7, sound: 'poff' }, { at: 6.2, sound: 'breath' }],
    lines: [
      { at: 6.8, who: 'elof', line: 'skSmall' },
    ],
    stage: {
      // The star he took from Klonk is in his hand, and at his lips, as in the first adventure's POFF.
      star: true,
      shots: [
        { at: 0, x: STAR, y: 1.4, height: 4.6, width: 5.2, move: 0.8 },
        { at: 3.4, x: STAR, y: 0.2, height: 3.2, width: 4.2, eye: -0.1, move: 2.6 },
      ],
      actors: {
        // Everyone is still looking at the window. They discover the result afterwards; none sees the star or the POFF.
        mamma: [{ at: 0, face: 0.75, act: 'look', aim: WINDOW }],
        pappa: [{ at: 0, face: 0.75, act: 'look', aim: OUTSIDE }],
        moa: [{ at: 0, face: 0.75, act: 'look', aim: WINDOW }],
        bertil: [{ at: 0, face: 0.75, act: 'stand', aim: WINDOW }],
        // One glad hop while nobody looks, then still wood.
        ghost: [{ at: 0, ...KLONK, face: 0.5, move: 0.01, act: 'stand' }, { at: 3.75, act: 'hop' }, { at: 4.27, act: 'freeze' }],
      },
      elof: [
        { at: 0, act: 'show', size: 3 },
        { at: 1.8, act: 'eat' },
        { at: 3.6, act: 'startle', size: 1, move: 2.4 },
        { at: 6.2, act: 'hands' },
      ],
      fx: [
        { at: 0, kind: 'glow', from: { x: STAR + 0.3, y: 1.7, z: 0.3 }, seconds: 3.4 },
        { at: 3.2, kind: 'sparkle', from: { x: STAR, y: 1.3, z: 0.1 }, seconds: 3.0 },
        { at: 3.6, kind: 'poff', from: { x: STAR, y: 0.2, z: 0.2 }, seconds: 2.5 },
      ],
    },
  },
  {
    id: 'upptackt', on: 'scene:krymper', until: 'scene:tillsammans', resumeAt: { x: STAR, y: 0 }, seconds: 9.4, hold: true,
    lines: [
      { at: 0.8, who: 'moa', line: 'skWhereElof' },
      { at: 2.8, who: 'bertil', line: 'skBertilFound' },
      { at: 5.0, who: 'elof', line: 'skTinyAnswer' },
      { at: 7.2, who: 'pappa', line: 'skTinyTogether' },
    ],
    stage: {
      shots: [
        { at: 0, x: 10.4, y: 2.3, height: 7.2, width: 15.2, move: 0.6 },
        { at: 1.1, x: STAR + 1.2, y: 1.8, height: 6.8, width: 10, eye: -1.1, move: 1.5 },
      ],
      actors: {
        // Each comes to him from where they were, on a way of their own, and none crosses another's: Moa from the
        // table to his right, Mamma from the window to behind him, Pappa from the window round to his left, Bertil first.
        moa: [
          { at: 0, x: MOA.x - 0.5, y: 0, z: 0.3, face: 0.4, move: 0.6, act: 'stand' },
          { at: 3.0, x: 11, y: 0, z: 0.3, move: 0.9, act: 'walk' },
          { at: 3.9, ...AROUND.moa, y: 0, face: AROUND.moa.face, move: 0.9 },
          { at: 4.8, face: AROUND.moa.face, act: 'crouch', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        bertil: [
          { at: 1.0, ...AROUND.bertil, y: 0, face: AROUND.bertil.face, move: 1.2, act: 'walk' },
          { at: 2.2, act: 'crouch', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        mamma: [
          { at: 3.1, ...AROUND.mamma, y: 0, face: AROUND.mamma.face, move: 1.6, act: 'walk' },
          { at: 4.7, act: 'kneel', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        pappa: [
          { at: 3.1, ...AROUND.pappa, y: 0, face: AROUND.pappa.face, move: 1.6, act: 'walk', aim: { x: STAR, y: 0.6, z: 0 } },
          { at: 4.7, act: 'kneel', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: AROUND.bertil.x, y: 1.8, z: AROUND.bertil.z } },
        { at: 4.7, act: 'wave' }, { at: 6.5, act: 'watch', aim: { x: AROUND.pappa.x, y: 2.4, z: AROUND.pappa.z } }],
    },
  },
  {
    // 5. The giants get ready around him: up off their knees, each pulls on a raincoat and rubber boots in their own way
    // and rhythm (the act `dress`: src/render/rain-gear.ts, art/blender/motion.py), the coat and the boots going on with
    // the hands and feet that put them on. Mamma first, as she says it; Pappa shows the flashlight, and dresses with it
    // in his hand; Bertil his biggest boots first, stamped down; Moa last.
    id: 'tillsammans',
    resumeAt: { x: STAR, y: 0 },
    on: 'scene:upptackt',
    seconds: 11.6,
    hold: true,
    lines: [
      { at: 1.0, who: 'mamma', line: 'skTogether' },
      { at: 3.0, who: 'pappa', line: 'skPappaLamp' },
      { at: 5.0, who: 'bertil', line: 'skBoots' },
      { at: 7.0, who: 'moa', line: 'skUmbrella' },
    ],
    stage: {
      shots: [{ at: 0, x: STAR + 1.2, y: 1.8, height: 6.8, width: 10, eye: -1.4, move: 0.9 }],
      actors: {
        mamma: [{ at: 0, face: 0.27, act: 'stand' }, { at: 1.0, act: 'dress' }],
        pappa: [{ at: 1.4, face: 0.18, act: 'stand' }, { at: 2.4, act: 'show' }, { at: 3.6, act: 'dress' }],
        bertil: [{ at: 4.2, face: 0.3, act: 'stand' }, { at: 4.6, act: 'dress' }],
        moa: [{ at: 6.4, face: 0.34, act: 'stand' }, { at: 6.8, act: 'dress' }],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: AROUND.mamma.x, y: 2.2, z: AROUND.mamma.z } },
        { at: 2.4, aim: { x: AROUND.pappa.x, y: 2.4, z: AROUND.pappa.z } },
        { at: 4.6, aim: { x: AROUND.bertil.x, y: 1.4, z: AROUND.bertil.z } },
        { at: 6.8, aim: { x: AROUND.moa.x, y: 2.0, z: AROUND.moa.z } },
        { at: 11.0, act: 'nod' },
      ],
    },
  },
  {
    // The trail's first candy, where the old one landed under the window: he finds it there, with Moa and Bertil
    // dressed beside him, and they say what it is, told standing. Said in passing, their answers were still being read
    // when he reached the doll, so its line about the raincoat was said 14 s late (or, if he ran past it, out on the
    // deck), and the coat's little scene stood still for ten seconds while they talked of candy out of the picture.
    // The three lines keep the receipts they had as beats.
    id: 'spar',
    at: SPAR,
    before: SPAR + 3,
    needs: TRAIL,
    until: 'beat:skEnough',
    seconds: 3.6,
    hold: true,
    // The first words once the picture has come (the clock, and the camera with it, wait at each line).
    lines: [
      { at: 0.9, who: 'elof', line: 'skTrail', id: 'skTrail' },
      { at: 1.8, who: 'moa', line: 'skHandful', id: 'skHandful' },
      { at: 2.7, who: 'bertil', line: 'skEnough', id: 'skEnough' },
    ],
    stage: {
      // Him at the candy, the trail on the floor ahead, and Moa and Bertil behind him where they put on their coats, tall
      // enough for their faces as they speak.
      shots: [{ at: 0, x: TRAIL_FOUND - 1, y: 2.2, height: 7.2, width: 10, eye: -1.4, move: 0.8 }],
      actors: {
        // Moa steps back a little and points back at the bowl on the table, half empty now, where she saw him take
        // them; Bertil looks along the trail, and wonders. Pappa lights the trail ahead of him: his beam goes in front of
        // Moa, not through her.
        moa: [{ at: 0, x: AROUND.moa.x - 0.2, y: 0, z: -1.9, face: 0.3, move: 0.6, act: 'look', aim: AT_TRAIL }, { at: 1.6, act: 'point', aim: BOWL_TOP }, { at: 2.4, act: 'look', aim: AT_TRAIL }],
        bertil: [{ at: 0.2, act: 'look', aim: AT_TRAIL }, { at: 2.5, act: 'shrug' }, { at: 3.3, act: 'look', aim: { x: SPAR + 6, y: 0.4, z: 0 } }],
        mamma: [{ at: 0.4, act: 'look', aim: AT_TRAIL }],
        pappa: [{ at: 0.5, act: 'look', aim: AT_TRAIL, beam: { x: SPAR + 2.4, y: 0, z: 0.5 } }],
      },
      elof: [
        { at: 0, face: 0.1, act: 'point', aim: { x: SPAR + 2.6, y: 0.3, z: 0 } },
        { at: 1.5, face: 0.45, act: 'watch', aim: { x: AROUND.moa.x, y: 3, z: AROUND.moa.z } },
        { at: 2.4, aim: { x: AROUND.bertil.x, y: 2.6, z: AROUND.bertil.z } },
        { at: 3.2, face: 0.1, act: 'look', aim: { x: SPAR + 6, y: 0.3, z: 0 } },
      ],
    },
  },
  {
    // Moa and Bertil go with him (`KIDS`): from where they stood as the trail was found, a step out in front of the
    // table, and then after him across the room. Not held, and short: he goes on at once. Listed before the coat's
    // scene, so that they are followers while it plays (the stage rests each actor on the scenes listed before the one
    // playing), and stop and watch from where they are.
    id: 'foljer',
    on: 'scene:spar',
    until: 'scene:verandan',
    seconds: 1.6,
    stage: {
      actors: {
        moa: [
          { at: 0, x: SPAR - KIDS.moa.behind, y: 0, z: KIDS.moa.z, move: 1.3, act: 'walk' },
          { at: 1.4, face: 0.05, act: 'stand', follow: KIDS.moa.behind },
        ],
        bertil: [
          { at: 0.1, x: SPAR - KIDS.bertil.behind, y: 0, z: KIDS.bertil.z, move: 1.1, act: 'walk' },
          { at: 1.3, face: 0.05, act: 'stand', follow: KIDS.bertil.behind },
        ],
      },
    },
  },
  {
    // 6. A raincoat that fits him: the doll's. He takes it off the doll, swings it up onto his back and puts his arms into
    // its sleeves, the left and then the right, pulls its front together, and holds out his arms: it fits (the coat and his
    // arms as it goes on, ../../../render/elof-coat.ts). He turns from the doll to us as it goes on.
    id: 'regnrock',
    on: TAKE,
    resumeAt: { x: DOLL.x - 0.6, y: 0 },
    seconds: 5,
    hold: true,
    lines: [{ at: 3.75, who: 'elof', line: 'skCoatFits' }],
    stage: {
      shots: [{ at: 0, x: DOLL.x - 0.3, y: 0.85, height: 3, width: 5, move: 0.8 }],
      elof: [
        { at: 0, face: 0.68, act: 'watch', aim: { x: DOLL.x, y: 0.35, z: DOLL_Z } },
        { at: 1.15, face: 0.22, act: 'watch', aim: { x: DOLL.x - 1, y: 1.2, z: 3 } },
      ],
    },
  },
  {
    // Moa and Bertil, who have walked after him across the room, go on ahead of him over the veranda: they step in behind
    // the line he walks wherever they are (the room's furniture is behind them by then), go by him in their lane, and
    // step back out of it by the door, to wait there for Mamma and Pappa and let him go out first. Not held: he goes on.
    // A game taken up at the veranda's big candy has them waiting there (`before`: a scene staged where he starts beyond
    // has been seen; `from`, not `at`, since a scene with `on` is due as soon as its flag is set).
    id: 'verandan',
    on: TRAIL,
    from: LEAVE,
    before: 41.3,
    seconds: 3.9,
    stage: {
      actors: {
        // Into the lane, behind him; along it; and back out of it to where each waits. Moa a little after Bertil, so
        // that they keep apart in the lane.
        moa: [
          // (She turns into the lane a step past the toy shelf's end.)
          { at: 0, x: LEAVE - KIDS.moa.behind + 1, y: 0, z: KIDS.moa.inside, move: 1.35, act: 'walk', follow: null },
          { at: 1.35, x: KIDS.moa.turns, z: KIDS.moa.inside, move: 1.85 },
          { at: 3.2, ...KIDS.moa.waits, face: 0.1, move: 0.65, act: 'look', aim: OUT_ON_DECK },
        ],
        bertil: [
          { at: 0, x: LEAVE - KIDS.bertil.behind, y: 0, z: KIDS.bertil.inside, move: 0.9, act: 'walk', follow: null },
          { at: 0.9, x: KIDS.bertil.turns, z: KIDS.bertil.inside, move: 1.8 },
          { at: 2.7, ...KIDS.bertil.waits, face: 0.1, move: 0.5, act: 'look', aim: OUT_ON_DECK },
        ],
      },
    },
  },
  {
    // Out onto the deck, all of them together (`LANE`). He has stepped out into the rain; he stands aside and turns,
    // and the picture goes out to the deck, the house's front and its door: Pappa strides out through the door with his
    // lamp, Bertil steps into the lane after him and Moa after Bertil, and Mamma comes last. Each walks to a place of
    // their own along the deck, and kneels or crouches there, as the family does in the first adventure's prologue
    // (`DECK`). He stands for it, however fast he came: a child who runs sees them come out too. Nothing is said while
    // they come (a line read would stop them where they are); their promises are said at the deck's edge
    // (`stormtitel`). It begins wherever along the deck his feet first come down past the door: a child who leaps
    // out is not let past it (`before` is only the deck's edge, where the last scene needs them in their places).
    id: 'lofte',
    on: TRAIL,
    from: STEPS_OUT,
    before: 60,
    seconds: 5.85,
    hold: true,
    stage: {
      // The door at the house's corner and the deck as far as Pappa's place, tall enough for all of them: far enough
      // out that the house's front is whole.
      shots: [{ at: 0, x: 53.4, y: 2.3, height: 8.1, width: 14.4, move: 0.6 }],
      // One after another, each into the lane once the one before is well ahead, and each at an even stride through
      // the door: a body setting off or turning is wider than one walking.
      actors: {
        pappa: [
          // A tenth nearer the camera than the others' lane: the hand that carries his lamp out in front of him
          // (render/lamp-hold.ts) passes the door's back post with room to spare.
          { at: COME_OUT, x: FROM_HOUSE.pappa, y: 0, z: LANE + 0.1, face: 0, move: 0.01, act: 'walk' },
          // His lamp lights the deck ahead of him as he comes: out towards the garden, not back at the door.
          { at: COME_OUT + 0.05, x: DECK.pappa.x - 0.5, y: -0.8, z: LANE + 0.1, move: 2.85, beam: AHEAD },
          { at: 3.0, x: DECK.pappa.x, y: -0.8, z: DECK.pappa.z, face: DECK.pappa.face, move: 0.6 },
          { at: 3.6, act: 'kneel', aim: { x: DECK.pappa.x, y: -0.3, z: 0 } },
        ],
        bertil: [
          { at: 1.35, x: KIDS.bertil.turns, z: KIDS.bertil.lane, move: 0.5, act: 'walk' },
          { at: 1.85, x: DECK.bertil.x - 0.5, y: -0.8, z: KIDS.bertil.lane, move: 1.75 },
          { at: 3.6, x: DECK.bertil.x, y: -0.8, z: DECK.bertil.z, face: DECK.bertil.face, move: 0.55 },
          { at: 4.15, act: 'crouch', aim: { x: DECK.bertil.x, y: -0.3, z: 0 } },
        ],
        moa: [
          { at: 1.55, x: KIDS.moa.turns, z: KIDS.moa.lane, move: 0.65, act: 'walk' },
          { at: 2.2, x: DECK.moa.x - 0.5, y: -0.8, z: KIDS.moa.lane, move: 1.95 },
          { at: 4.15, x: DECK.moa.x, y: -0.8, z: DECK.moa.z, face: DECK.moa.face, move: 0.55 },
          { at: 4.7, act: 'crouch', aim: { x: DECK.moa.x, y: -0.3, z: 0 } },
        ],
        mamma: [
          { at: COME_OUT, x: FROM_HOUSE.mamma, y: 0, z: LANE, face: 0, move: 0.01, act: 'walk' },
          // Along the lane to her place, and straight back out of it, clear of Moa crouching at her side.
          { at: 2.3, x: DECK.mamma.x, y: -0.8, z: LANE, move: 2.6 },
          { at: 4.9, x: DECK.mamma.x, y: -0.8, z: DECK.mamma.z, face: DECK.mamma.face, move: 0.65 },
          { at: 5.55, act: 'kneel', aim: { x: DECK.mamma.x, y: -0.3, z: 0 } },
        ],
      },
      // A step aside, towards us, out of their way; he turns to the door, and his eyes go with them along the deck.
      elof: [
        { at: 0, lift: ASIDE, move: 0.5, act: 'walk', face: 0.25 },
        { at: 0.5, face: 0.5, act: 'watch', aim: { x: 48.4, y: 3.6, z: LANE } },
        { at: 1.8, face: 0.3, aim: { x: 53, y: 3.4, z: LANE } },
        { at: 3.0, face: 0.1, aim: { x: DECK.pappa.x, y: 3.0, z: DECK.pappa.z } },
        { at: 4.0, face: 0.3, aim: { x: DECK.mamma.x, y: 3.2, z: LANE } },
        { at: 5.3, lift: { x: 0, y: 0, z: 0 }, move: 0.5, act: 'walk', face: 0 },
      ],
    },
  },
  {
    // 7. At the deck's edge the storm-dark garden opens below. He turns to his family along the deck, and each says
    // what they have for him, one after another, as in the first adventure's prologue: Mamma's and Pappa's promises, and
    // between them Moa's and Bertil's own words (Olov, 14 November 2026: "Kan Moa och Bertil också säga något i slutet av
    // kapitlet? Nu är det bara mamma och pappa som säger något."). He waves to them, turns to the garden and calls out
    // to the little one, as Bertil asked him to; and the adventure's name stands over it.
    id: 'stormtitel',
    at: 61.4,
    needs: 'scene:tillsammans',
    seconds: 15.6,
    hold: true,
    quiet: true,
    cues: [{ at: 15.4, flag: 'a2titel' }],
    // The promises keep the ids they had as lines said along the deck, and his own the one it had as the scene's only
    // line, so a saved game's receipts still fit.
    lines: [
      { at: 3.0, who: 'mamma', line: 'nearYou', id: 'skNear' },
      { at: 3.8, who: 'moa', line: 'skMoaSmall', id: 'skMoaSmall' },
      { at: 4.6, who: 'bertil', line: 'skBertilGreet', id: 'skBertilGreet' },
      { at: 5.4, who: 'pappa', line: 'followTrail', id: 'skFollow' },
      { at: 7.4, who: 'elof', line: 'skOut', id: 'stormtitel:0' },
    ],
    stage: {
      words: [{ at: 11.0, seconds: 4.4, kind: 'title', text: 'a2title' }],
      shots: [
        { at: 0, x: 62.2, y: 0.1, height: 3.2, width: 5.6, eye: -0.05, move: 0.8 },
        // As he turns to them, the whole family along the deck with him (`DECK`), for what each says.
        { at: 1.6, x: 57.6, y: 1.4, height: 6.6, width: 14.2, move: 1.2 },
        { at: 8.8, x: 67, y: 0.6, height: 15, width: 28, move: 2.6 },
      ],
      // Each makes their promise with a gesture, a moment before the words, so that it shows while they are read: Mamma
      // nods to him, Moa cheers him on, Bertil points out into the storm where the little one went, and Pappa points
      // along the trail with his lamp. Mamma waves him off (on her left there is room for her arm; between the others
      // there is not), and they look after him as he calls out.
      actors: {
        mamma: [{ at: 1.8, act: 'look', aim: AT_EDGE }, { at: 2.7, act: 'nod', aim: AT_EDGE }, { at: 6.2, act: 'wave', aim: AT_EDGE }],
        moa: [{ at: 1.9, act: 'look', aim: AT_EDGE }, { at: 3.5, act: 'cheer' }, { at: 4.4, act: 'look', aim: AT_EDGE }],
        bertil: [{ at: 2.0, act: 'look', aim: AT_EDGE }, { at: 4.3, act: 'point', aim: INTO_STORM }, { at: 5.6, act: 'look', aim: AT_EDGE }],
        pappa: [{ at: 2.1, act: 'look', aim: AT_EDGE }, { at: 5.1, act: 'point', aim: INTO_STORM }, { at: 6.4, act: 'nod', aim: AT_EDGE }],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: 68, y: -6, z: 0 }, face: 0 },
        { at: 1.6, face: 0.44, act: 'watch', aim: { x: DECK.mamma.x, y: 2.4, z: DECK.mamma.z } },
        { at: 3.5, aim: { x: DECK.moa.x, y: 1.9, z: DECK.moa.z } },
        { at: 4.3, aim: { x: DECK.bertil.x, y: 1.7, z: DECK.bertil.z } },
        { at: 5.1, aim: { x: DECK.pappa.x, y: 2.5, z: DECK.pappa.z } },
        { at: 6.0, act: 'wave', aim: { x: 56, y: 2, z: -2 } },
        { at: 7.1, face: 0, act: 'watch', aim: { x: 80, y: 0, z: -10 } },
      ],
    },
  },
];

export const stormkvall: ChapterData = {
  id: 'stormkvall',
  ghostMeet: true,
  place: 'home',
  // A boy among small things, until his own choice of Klonk's star makes him small.
  size: { scale: 3, until: 'scene:krymper' },
  // The shelf's first place is the old trägubbe's: drawn by the pack's figure, so the gust can take it.
  shelf: { x: SHELF.x, y: SHELF.y },
  // The evening: the lights low, and the storm-dark sky in the windows (the pack paints the panes).
  night: { after: null },
  storm: {
    rain: 0.6,
    lightning: 7,
    // Candles on the table and the windowsill once Mamma has lit them.
    glows: [
      { at: { x: CANDLE.x, y: CANDLE.y + 0.4 }, z: CANDLE.z, size: 0.9, after: CANDLES_LIT },
      { at: { x: 21, y: 3.3 }, z: -8.6, size: 0.8, after: CANDLES_LIT },
    ],
  },
  decor: [
    // The family's room, which Sunday morning has too, and its hall past the white bathroom door to the green front door
    // and the veranda's: their raincoats and boots are not on the rail and the floor there, for they wear them tonight
    // (../../../render/home-hall.ts).
    { look: 'homeEvening', at: { x: 0, y: 0 } },
    { look: 'hallWorn', at: { x: 0, y: 0 } },
    // The window by the shelf: rattling, burst open by the gust, banging, and pulled to by Pappa.
    { look: 'casement', at: { x: WINDOW.x, y: WINDOW.y }, until: 'window:shut' },
    // The two figures on the shelf: the little one until the gust, the old one until he leaps after him (../bowl.ts).
    { look: 'tragubbe', word: GRABS, at: { x: OLD.x, y: OLD.y }, z: OLD.z, until: BOWL_LEAP },
    { look: 'lillgubbe', at: { x: LITTLE.x, y: LITTLE.y }, z: LITTLE.z, until: 'gust' },
    // The candle Mamma lights when the power goes ("Strömmen gick! Jag tänder ljusen."): on the table from the start,
    // unlit until it catches (`CANDLES_LIT`, ../render.ts).
    { look: 'candle', at: { x: CANDLE.x, y: CANDLE.y }, z: CANDLE.z },
    // The flashlight on the table, until Elof has taken it to Pappa.
    { look: 'flashlight', at: { x: 15, y: 1.65 }, z: -1.3, until: 'lamp:take' },
    // The toy shelf, with the doll at its foot (the spot `coat:take`).
    { look: 'toyShelf', at: { x: TOY_SHELF.x, y: 0 }, z: TOY_SHELF.z },
    // The bowl of Saturday sweets on the table, heaped until the old one leaps by way of it; half empty after, with
    // three spilt beside it (../bowl.ts, ../candy-bowl.ts). The morning after it stands there still.
    { look: 'candyBowl', at: { x: BOWL.x, y: BOWL.y }, z: BOWL.z, until: BOWL_LEAP },
  ],
  furniture: [
    { look: 'table', at: { x: HOME_LAYOUT.dining.x, y: 0 }, z: HOME_LAYOUT.dining.z },
    ...Object.values(HOME_LAYOUT.dining.chairs).map(chair => ({ look: 'chair' as const, at: { x: chair.x, y: 0 }, z: chair.z, face: chair.face })),
  ],
  scenes: SCENES,
  // A game saved past the window before the bowl was there: the old one has leapt, and the bowl is as he left it.
  sets: [{ flag: BOWL_LEAP, when: [LEAP_OVER] }],
  spawn: { x: 2.6, y: 0.01 },
  goalX: 61,
  goalNeeds: 'a2titel',
  coda: 'all',
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // the living room and the hall, one level floor as in every chapter at home (Olov, 15 November 2026: a door sill to
    // the veranda stood up from it in front of the TV), and through the veranda's door past the hall the step down to
    // the deck, out of doors in the rain
    { x: HOME_LAYOUT.veranda, y: 0 },
    { x: HOME_LAYOUT.veranda, y: -0.8 },
    // the deck, and its edge: the stormy garden lies far below it
    { x: 64, y: -0.8 },
    { x: 64, y: -7 },
    { x: 106, y: -7 },
    { x: 106, y: 10 },
  ],
  surfaces: [{ from: -19, to: 64, kind: 'wood' }],
  // The window by the shelf is the one the storm blows open: the wall has a real opening there.
  house: { from: -40, to: HOME_LAYOUT.veranda, windows: HOME_LAYOUT.windows, opens: WINDOW.x },
  outdoors: HOME_LAYOUT.veranda,
  // The trail's big candies: the first where the old trägubbe landed, under the window. Each of the others stands in
  // the gap between two of the trail's sweets, not with one at its foot. The second stands at the table's end, a gap
  // before the doll: by the doll (18.55) its lollipop stood in the picture of the raincoat going on, in front of him.
  // The hall's and the deck's stand further back than a big candy's usual 0.7, behind the lane the family go out in
  // (`KIDS`, `LANE`). The hall's stands at its beginning, past the bathroom's door and well before where Moa and Bertil
  // wait by the veranda's (at 35.4 it stood where they turn out of the lane); the deck's out of the door, before Mamma
  // and clear of her arm as she waves: at 45 it stood where Moa crouches by her (`DECK`).
  checkpoints: [
    { x: TRAIL_FOUND, y: 0, after: TRAIL }, { x: 16.65, y: 0, after: TRAIL },
    { x: 41.5, y: 0, z: CANDY_BEHIND_LANE, after: TRAIL }, { x: 50.6, y: -0.8, z: CANDY_BEHIND_LANE, after: TRAIL },
  ],
  spots: [
    // Pappa feels for the flashlight in the dark: Elof takes it from the table and gives it to him.
    { id: 'lamp:take', at: { x: 15, y: 0 }, verb: 'take', word: 'skTakeLamp', needs: 'scene:kvall' },
    { id: 'lamp:give', at: { x: PAPPA.x + 1, y: 0 }, verb: 'give', word: 'givePappa', needs: 'lamp:take' },
    { id: 'goodnight', at: { x: GOODNIGHT, y: 0 }, verb: 'give', word: 'skGoodnight', needs: 'beat:skLampThanks' },
    // Klonk's last star: out of its bag in the scene, held up between them, and not there before.
    { id: 'star', look: 'star', at: { x: STAR, y: STAR_Y }, verb: 'take', word: 'tasteStar', needs: 'scene:klonkstar', after: 'star:out' },
    // The doll's raincoat, once the family have put on theirs and he is small.
    { id: TAKE, look: 'doll', at: { x: DOLL.x, y: 0 }, verb: 'take', word: 'skTakeCoat', needs: 'scene:tillsammans' },
  ],
  ghost: [
    // On the shelf beside the figures, still wood while the grown-ups look.
    { at: { x: KLONK_SHELF.x, y: KLONK_SHELF.y }, z: KLONK_SHELF.z, until: 'scene:fonstret', near: 99 },
    // Down on the floor with its star, where the scene lands it.
    { at: { x: KLONK.x, y: KLONK.y }, until: 'scene:tillsammans', near: 99 },
    // Then ahead of him: across the room and the veranda, out onto the deck and down into the garden.
    { at: { x: 16, y: 0 } },
    { at: { x: 23, y: 0 } },
    { at: { x: 28.6, y: 0 } },
    // By the bathroom's door, in the hall and on the deck a step towards us, clear of the lanes the family walk and turn
    // in (`KIDS`, `LANE`).
    { at: { x: 34.4, y: 0 }, z: 0.65 },
    { at: { x: 44.4, y: 0 }, z: 0.65 },
    { at: { x: 51.6, y: -0.8 }, z: 0.65 },
    { at: { x: 57.4, y: -0.8 }, z: 0.65 },
    { at: { x: 62.6, y: -0.8 }, until: 'beat:stormtitel:0', near: 99 },
    { at: { x: 67.5, y: -7 }, near: 0 },
  ],
  beats: [
    { id: 'skLampThanks', on: 'lamp:give', who: 'pappa', line: 'skLampThanks', read: true },
    { id: 'skShelf', on: 'beat:skLampThanks', until: 'goodnight', who: 'pappa', line: 'skShelf', read: true },
    { id: 'skMyCarving', on: 'beat:skShelf', until: 'goodnight', who: 'elof', line: 'skMyCarving', read: true },
    // The first candy on the floor, where the old one leapt, and what Moa and Bertil say of it, are the scene `spar`.
    // (A handful is not for ever: this is what runs out at the end of Älven.)
    // The doll at the toy shelf, as he comes to it: its raincoat might fit him.
    { id: 'skDoll', at: DOLL.x - 2.2, needs: 'scene:tillsammans', until: TAKE, who: 'elof', line: 'skDollCoat', read: true },
    // Passing remarks (docs/dialogue.md): the one about the rain as he goes on along the deck, once the family have come
    // out after him (`lofte`). Their promises are said at the deck's edge, and are that scene's own (`stormtitel`).
    { id: 'skSill', at: 27.6, needs: 'scene:tillsammans', who: 'spoket', line: 'skKlonkHop', aside: true },
    { id: 'skRain', at: 50.7, needs: 'scene:lofte', who: 'elof', line: 'skRainLine', aside: true },
  ],
  // Indoors the picture is wide while he is big; tiny, it comes down to him.
  cameras: [{ from: -3, to: 10, zoom: 1.5, lift: 0.3 }, { from: 10, to: 48, zoom: 1.2, lift: 0.4 }, { from: 48, to: 70, zoom: 1.5, lift: 1.2 }],
  candy: [
    // The old trägubbe's trail: a sweet where it landed, then one at a time towards the veranda door.
    ...row(10, 29, 0, 1.9, TRAIL),
    { x: 30.6, y: 0.45, after: TRAIL },
    // On past the bathroom's door and through the hall to the veranda's: the three that lay before the bathroom's door,
    // further apart, the last as near the veranda's door as it lay to it before, so that a saved game's candy keeps its
    // places and its order.
    ...row(35, 46.4, 0, 5.7, TRAIL),
    { x: 48.6, y: -0.2, after: TRAIL },
    ...row(50, 60, -0.8, 2, TRAIL),
  ].map((c) => ({ ...c, x: round(c.x, 1) })),
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('scene:tillsammans')) return ['skFollowTrail', 'skFamilyLamps', 'trail'];
  if (has('star')) return ['skShrinking', 'skFamilyHome', 'sparkle'];
  if (has('star:out')) return ['skStar', 'skFamilyHome', 'sparkle'];
  if (has('gust')) return ['skWindow', 'skFamilyHome', 'sparkle'];
  if (has('lamp:give')) return ['skGoodnightPurpose', 'skFamilyHome', 'heart'];
  if (has('lamp:take')) return ['skGiveLamp', 'skFamilyHome', 'heart', 'pappa'];
  if (has('scene:kvall')) return ['skFetchLamp', 'skFamilyHome', 'house', 'pappa'];
  return ['skEvening', 'skFamilyHome', 'house'];
};
