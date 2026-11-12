# Dialogue: whose turn it is

How the game decides what is said next, and how to place a line so that it is said at its moment. The rules are in
`src/sim/sim.ts` (`tell`) and `src/sim/scene.ts`; the lines are in the chapters' `beats` and `scenes`.

## Why

Three things Olov has asked for, in order:

- 9 November 2026: "när någon säger något kan bli avbrutet, så då måste det den säger få talas klart innan nästa
  event spelas upp eller pratas upp". **Nothing said is ever cut.**
- 10 November 2026: ordinary speech must not stop him. **He walks, jumps and collects while a bubble is up.**
- 12 November 2026: "Ibland upplever jag nu att vissa kommentarer kan komma lite sent nu när vi alltid ger plats för
  en kommentar så den inte avbryts." **And nothing is said late.**

The three pull against each other. A line takes `2.5 + 0.09 × letters` seconds to read: five to six seconds for most.
He runs 3.5 EL a second, so a line is nineteen EL of running. The chapters of Äventyr 2 were written with a line every
three to five EL, when each essential line still stopped him. Once he could run on, the lines queued: at a run through
Älven the remark about the lake was said sixty-five EL after it, he stood twenty-five seconds at Pappa's bridge while
five old lines were read, and the chapter's last conversation was cut by its end card.

So the lines are not all equal any more. Some are the story's, and are always said. The rest are **passing remarks**,
said at their moment or not at all.

## The rules

1. **Nothing is cut.** A line that is up stays for its reading time and its recording (`src/ui/hud.ts`).
2. **An answer follows what it answers.** A line with `on: 'beat:<id>'` goes on from that line: it is said next,
   before anything that has waited longer. Klonk's *klonk* comes after what Elof said to him, not three lines later.
3. **The story's lines come before remarks**, the one that has waited longest first.
4. **A passing remark** (`aside: true` on the beat) is let go, unsaid:
   - once he is `ASIDE_REACH` (6 EL, or the number given as `aside`) from where its moment came: what it was about
     has left the picture;
   - when a staged moment has the floor, or waits for it: he stands and watches, and nothing is remarked in passing;
   - when it answers a line and cannot come straight after it (`REPLY_PATIENCE`).
5. **A remark is not begun just before one of the story's lines.** If a story line said at a place lies within
   `ASIDE_ROOM` (3 s) ahead at the speed he goes, on foot or carried, the remark waits, and is let go if its own
   moment passes. Standing still, the margin is `ASIDE_NEAR` (1.5 EL).
6. **A remark never holds anything up.** A held scene waits for the story's lines only, and so does the last page.
7. **A remark belongs to its moment.** A game taken up at a big candy does not say a remark whose flag was already
   set, nor Klonk's answer to a line said before.
8. **A staged moment is played where he began it.** Scenes play one at a time. When he does the thing that starts a
   held scene while a scene he is free in still plays (the latch hooked while Pappa is on his way to the window), he
   stands there until it begins.
9. **The last page waits for a moment's quiet** (`END_QUIET` in `src/main.ts`): a line that goes on from the one
   just read is said a step later, and the page must not turn between them.
10. **A scene's own words belong to it while it plays.** Once it is over, one still unsaid (in a game saved before
   the words were the scene's) is said freely, so that nothing waiting for it is stranded.

Nobody listening (the robot, and tests with no page) hears every line the moment it is due, remarks too.

## Placing a line

- **Is it the story's?** A sight of the two figures, the question and its answer, what a helper does and says, a
  hint for what he has to do next, a thanks. Then leave `aside` off, and give it room.
- **Or a remark?** What he notices in passing, a joke, Klonk's *klonk*. Mark it `aside: true`. It will be heard by a
  child who looks about, and skipped by one who runs: that is what makes it never late.
- **Room.** At a run there is room for one line in nineteen EL. Between two story lines a remark is only said where
  they are more than about twenty-four EL apart. Put a remark where the thing it is about comes into the picture,
  and not in the ten EL before a story line.
- **A hint is let go when it is done.** Give it `until:` the flag of the thing it asks for. Give what a helper says
  while doing something `until:` the flag that it is done, so that the next words come in its place ("Vänta, jag
  lägger stegen över diket." until the ladder lies there).
- **A conversation is a chain.** Each line `on: 'beat:<the one before>'`. Two people answering each other should
  never be two places two EL apart.
- **What he says on a ride** is said there or not at all: `aside` with `within:` the ride's stretch.
- **The heart of a chapter is told standing.** Where the story turns (the old one's memory in Stormskogen, the trail's
  end in Älven, the gift in Stormens öga, the name in Morgonen) the lines belong to a held scene: `hold: true` with
  `dialogue: [...]`. The scene's clock waits for them, so its `seconds` are only the time round the words. Give it a
  cue for when its picture has arrived, and let the first line `needs:` that flag: a line due at the scene's first
  step is said before the camera has moved.
- **Do not chain a free line onto a scene's last line.** It becomes due in the scene's last half second and is held
  with it. Say it at a place he walks to (`at:`), or on a `later` flag a moment after.
- **A line said to someone where they stand is said while he stands there.** What he says as he puts each figure
  back on the shelf, and each one's thanks at the party, are short held moments (`hylla:*`, `tack:*`): handed out
  at a run, they came one after another long after the thing they were about.
- **Where Elof sees the old one and calls out, he stops and sees him** (Olov, 12 November 2026: "Han ska synas
  tydligt överallt"). `sighting` in `src/content/aventyr2/kit.ts` makes the moment: the picture takes in the old
  one, with Elof too on a phone held sideways; he stands lit (`word: 'lit'` on his decor) while the line is read,
  and then leaps or floats away, lit, with the picture going a little way with him.
- **A flash has to be in the picture.** On a phone held sideways the picture is about six EL high and the bubble
  covers its top: a figure blown past is seen between one and a half and two and a half EL over his feet, and a
  little higher where a camera zone widens the picture (three EL at Olympia's fence). A line that points at the
  figure gets a flight that is `lit`, comes from behind him and goes on ahead. A figure on the water has to be
  on water that is seen: behind the path the banks, boulders and fallen trees hide it (`z` above 0 puts it on the
  near water, as on Älven).

## Checking

- `tests/sim/asides.test.ts` and `tests/sim/staged.test.ts`: the rules.
- `tests/unit/flash-in-picture.test.ts`: the three flashes a line points at fly low, lit, past where it is said;
  Älven's two figures float on the near water by the line's place; and the old one's four sightings are moments he
  stands for, the old one lit in their picture.
  The pictures themselves are looked at with `tests/browser/review/dialogue-moments.mjs`.
- `tests/robot/dialogue.test.ts`: every chapter, played by the robot with the game's own bubbles listening. The robot
  runs flat out and presses every button the moment it is offered, which is the hardest case. It fails when a remark
  is said out of reach, an answer does not follow its line, a story line said at a place comes more than three
  seconds late, a story line is lost, or he stands waiting for words for more than seven seconds. The three
  exceptions (the family's promises along the deck in the two evenings at home, and the party's thanks) are named
  there.
- To read a chapter as it is heard, line by line against what he does:

  ```
  $env:DIALOGUE_TIMELINE = "<a folder outside the repository>"
  npx vitest run tests/robot/dialogue-timeline.test.ts
  ```

  It writes one text file a chapter: each line with when it was said, where he was, and how late; the remarks let go;
  each scene, flag and big candy; and where he stood and waited. `$env:DIALOGUE_PAUSE = "4"` makes the robot rest
  four seconds at each big candy, as a child who looks about.

## What the review of 12 November 2026 changed

`docs/dialogue-audit.md` lists the lines that were rewritten, merged or removed, in Swedish. In short:

| Chapter | Change |
| --- | --- |
| All of Äventyr 2 | Scenery lines, jokes and Klonk's *klonk* are passing remarks. Klonk's answers follow the line they answer. The old one is seen, lit, where Elof calls out to him (`sighting`, four places). |
| Stormgården | Moa's first line carries the drops' hint (her lamp throws their shadows). The trail line is said from the top of the steps. The old one stands lit on the playhouse roof while Elof calls out (`sg:lekstugan`). The question follows the picture's words directly. |
| Stormskogen | The cones' hint comes before the first cone; the flash moved past the cone rain and into the picture. The old one's memory is told at the hollow, standing (`ss:minnet`). |
| Byn i stormen | Klonk answers the cap between Elof's two lines. |
| Olympia | One line for the flash from the fence, with the little one flying past at the height of the fence's top and not far overhead; one line for the balls. The old one sails over the flooded circle in the picture (`ol:gamla`). Bertil's cheer and Elof's thanks in the net. |
| Flärken | One line for the waves, at the first post. The flash on the firm stone in the gungfly, in the picture. Elof calls to the old one from a post's lee (`sjon:gamla`). Mamma answers "Bryggan är trasig!". |
| Älven | The flash on the raft, with the little one bobbing on the near water just ahead of it; the old one on his log, seen from the bank (`al:gamla`); at Moälven the old one floats past in front of the bank (both were hidden behind the banks before). Pappa answers the rapids; his scarf's line comes after the picture of it. The trail's end is told standing with Moa and Bertil (`al:slut`); before, its end card could cut it. |
| Billsta | Moa's two lines are the arrival, said by the car (`card`, held). Morfar greets him, and Elof answers with the ditch. The seesaw's lines are let go once their step is done. |
| Stormens öga | The gift's four lines are told standing by the two of them (`gavan`). |
| Morgonen efter | What he says to each figure is said at the shelf (`hylla:*`). The name is given there (`fjun`), and the others answer it while he stands under the shelf (`namnet`), Klonk last. The cocoa's words at the table (`kakao`), then his thanks to each of them, told standing there (`tack`, 12 November 2026); the last scene waits for him at the door, now in the hall past the TV. |
| Godiskalaset | Each one he gives a sweet to thanks him while he stands there, with what he found of theirs and Pappa's stones (`tack:*`). The ghost's hop over the table comes after, and its two lines at its two moments. |
| Byn | "Godiset är större än jag!" is said among the jars, once "Framme!" has been read. |
| Myren | Two of Mamma's lines are remarks. Granskogen and Myren's helpers are mended on the branch `aventyr1-genomspelning`, with Olov's own list for them. |
