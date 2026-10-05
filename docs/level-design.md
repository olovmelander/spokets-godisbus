# Level design

How the chapters are made into places instead of corridors. It follows from the research Olov asked for on
4 October 2026 ("the game feels very linear right now ... take the best things from the best platformers"),
which is in `docs/research/platformer-level-design.md` with its sources. The plan (`docs/game-plan.md`) still
decides the story, the verbs and the kindness rules; this document decides how a chapter is laid out.

## 1. What the research says, in ten lines

The admired platformers are guided lines: their makers say so of Ori, 3D Mario and Astro Bot. A corridor is a
line with nothing smaller than the chapter inside it, nothing to come back to, nothing that can be declined and
only one tempo. So the left-to-right candy trail stays, and what hangs on it changes.

1. **One toy per arc, in four steps:** seen, tried where a miss costs nothing, gated, twisted by combining it
   with something known, then shown off. Three arcs of four to five minutes in a chapter.
2. **Few verbs, the lace in every chapter, one rule of the place.** The swing is the game's best verb and was
   used in 14 EL of Gården only.
3. **Coil the line.** A second level over the path, a dip under it, a way back to a landmark. Every side way
   lets out forward. One fork at a time, with an unmistakable thing at it.
4. **Show it before it can be reached, and change the place once** in a chapter, by something he sees done.
5. **Density and contrast:** something to notice every half minute, no plain running for more than about five
   seconds, a rest after each arc, one loud moment that follows the ghost instead of fleeing a hazard.
6. **Easy to finish; sweets for the brave and for the curious.** Two of a chapter's four sweets in plain sight
   above a hard move, two behind a tell.
7. **Candy in two voices that never lies.**
8. **Three pieces to a puzzle, its prize in sight, every wrong try answered.**
9. **Replace what death supplied:** things to do well. The risk for a child who plays games for older children
   is a game that is easy, pretty and dull after two chapters.
10. **Fail softly, forgive the hands, help only when called.** The plan already does this.

Evidence on seven-year-olds is thin: every number below is a starting value until Elof has played.

## 2. The grammar

These are the pieces a chapter is laid out with. The first four are in the format since 4 October 2026.

| Piece | In the chapter file | What it is for |
| --- | --- | --- |
| **Ledge** | `ledges: { x, y, width, look, needs? }` | A thin floor he jumps up through and stands on, and walks in front of when it is above his feet. It is how a second level lies over the same stretch: the ground is one line, and a ledge is ground only from above. He leaves it by walking off its end. `needs` makes it appear when a flag is set. Nothing floats: a `leaf` is drawn on its stalk, a `branch` and a plate of `bark` on a young stem, a `stone` shelf on its pillar, a `plank` on the batten that holds it to a wall, and a `trestle` on its legs where there is a floor and no wall. |
| **Side candy** | `side: Candy[]` | Candy off the trail, drawn as **hearts and lollipops**. The trail is sweets in wrappers and says "this is the way"; a heart says "this is extra". A heart in sight is the tell of every side way. Never needed, none of the trail's rules apply, saved by its place in the list (add at the end). |
| **A sweet with a way** | `hidden[].way` | A hidden sweet that is not reached by a held jump from the ground under it says how: "up the window sills", "at the end of the clothes line". `tests/sim/secrets-<chapter>.test.ts` has to play it. |
| **Ring** | `hooks[]` with `extra: true` | A ring off the main way. Rings in a row at equal spacing give the swing a rhythm. |
| **What holds a ring** | `hooks[].hangs`, `lines: { from, to, sag?, posts? }` | For the picture only. A ring in the open air hangs on a cord `hangs` long from something above it, or from a line strung over it: a clothes line, a rope between two dead pines, with a pole under each end. A ring under a line needs nothing more said. |
| **Pocket** | ledges, a climb, a pit | A small place above or below the path with something in it. It lets out forward. |
| **Fixed or moving thing** | `movers[]` with one stop, or `cycle` | A solid floating floor, a lift, a ferry. Solid from below too: use a ledge where he should be able to jump up through. |

**Rules for laying them out**

- **Steps he can make:** a held jump rises 1.1 EL and carries 2.2 EL at a run, so a ledge is at most 0.9 above
  the last and at most 1.6 beyond its edge. A ring is thrown to from within 4 EL and at least 0.4 above his
  middle.
- **A side way starts where the trail passes,** with its first ledge and a heart in sight from the trail, and
  ends by walking or dropping forward onto the trail, at most 4 EL down. Never a dead end, never a fork inside
  a fork.
- **Up is the richer, harder way,** every time. A fall from it lands on the trail below.
- **Sweets:** two brave (in sight, above a hard move or on the challenge route), two curious (behind a tell,
  low or to the side or back the way he came).
- **Nothing the story needs is on a side way.** The helper never points there. *Lugnt* needs nothing there.
- **Saved games:** trail candy and big candies are kept by their place in their lists. Add, never insert or
  move. Side candy has its own list for that reason.
- **Budgets:** a picture stays within its tier's draw calls: 120 on Low, 160 on Mid, 200 on High. A side way in sight costs four: its ledges of every
  look, with what holds them and with its cords, lines and poles, are one mesh; its rings are one; its side
  candy two. Out of sight it costs none. A ledge that waits for a flag is one more for its look; every climb
  and thing on a rail is one of its own. Granskogen is the heavy chapter: its far bough is at 117 on a phone
  held sideways.

## 3. The chapters

"Layers" is the first pass: side ways, rings and re-homed sweets laid over the chapters as they stand, with
their main trails and saved games untouched. It is built (5 October 2026), and so is one optional puzzle in
each of three chapters (the table after this one). "Arcs" is the second pass, on the main trail itself, and
is not begun.

| Chapter | The rule of the place | Layers, as built (first pass) | Arcs (second pass) |
| --- | --- | --- | --- |
| **Gården** | The lace | **The window sills:** five boards along the house wall over the deck. **The clothes line:** leaves up from the boulder, three rings on a line over the dew rain, the skumbanan on the leaf at its end. **The planks by the hose,** there once the ladybird has brought the hose down, for whoever climbs back up it: the skumsvamp | The swing's twist and its show of mastery on the main trail after the gully; the dew rain as a choice of going under or over |
| **Granskogen** | Cones that roll and weigh | **The boughs:** bark and a bough up from the big cone, the forest's first ring between two trunks, the gummiorm at the far bough's end. **The nest:** bark up a trunk after the log, the colaflaska in the nest, two rings in a row to a bough before the pool. **The root** from the hilltop back down to the ant road, once the ants have carried him up | A ring that a cone's weight pulls into reach; the avalanche as a chase after the ghost's cone |
| **Myren** | Firm and soft ground, a carried light | **The cranberry's leaf:** jumping for a heart he lands on the first cranberry, which puts him on a leaf with the stekt ägg. **The leaves** over the firm tussocks, two of them over open water. **The dead pines** over the boardwalk: two branches up, three rings on a rope, the sur napp where they end | A ring over a soft tussock, so that swinging is the way not to stand on it; the sinking run rebuilt as a rhythm; the boardwalk under the pines is still 9.7 seconds of plain running |
| **Berget** | Gusts that come in beats | **The rock shelves** up from the first slab, and the mountain's first ring over the cobbles to a far shelf with the gräddkola. **From lee to lee:** a low and a high shelf on every boulder and a ring between every two, on a guide rope: on the lace no gust has hold of him. The salmiakruta is on the last boulder | A climb that needs Hoppa; a three-step puzzle with the ghost at the cliff |
| **Byn** | (a medley) | **The sweet shop's shelves:** three steps up, two rings on their flex over the floor, a long shelf and a step down | Its return loop and its sweets are still unbuilt |

**The puzzles** (5 October 2026). Each is optional, with its prize in sight first, and its insight is the
chapter's own rule used the other way round. `tests/sim/puzzle-<chapter>.test.ts` plays each, with its
likeliest wrong tries.

| Chapter | He sees | The catch | The insight | Built from |
| --- | --- | --- | --- | --- |
| **Gården:** the curl on the ring | Five sweets on a bough beyond the birch's first root, and a red ring on a string between him and them | A curl of shaving hangs round the ring: the lace has nothing to catch | The lace pulls as well as swings. *Dra* slides the curl off along the string; then the same button throws the lace | A thing on a rail whose solid box stands round a ring; the lace needs a clear line |
| **Granskogen:** the cone on the bough | Hearts on a bough high over the needle slope | Two steps up from a long bough, with no step between | A cone lies on the long bough. Pushed to its tip, its weight brings the missing step. What bowled him over is his tool | A thing on a rail, and a ledge that waits for `placed:` |
| **Myren:** the toss | An arch of hearts over the soft tussocks, and a glint in the moss under its foot | The arch is higher than a jump, and the tussock under it sinks | Stay. Standing still over the glint he sinks towards it, and the tussock throws him along the arch | A `touch` spot too deep to reach except by sinking, which begins a ride |
| **Berget:** none yet | | | A gust is only a push to the left: it lifts nothing, a thing on a rail makes no lee, and on *Lugnt* it does not blow at all | What was tried, a leaf that rises with each gust, was one piece, hung in the air and was not built |

**Measured, before and after.** "One corridor" is the share of a chapter's length, from its start to its
goal, with no second way beside it; `tests/unit/layers.test.ts` counts what was added, the puzzles' ledges
among it.

| Chapter | One corridor, before | after | Side ways laid | over (EL) | Rings | Side candy | Sweets with a way |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gården | 95 % | 74 % | 4 | 42.7 of 209 | 8, were 4 | 26 | 2 of 4 |
| Granskogen | 92 % | 76 % | 3, and the root | 32.6 of 203 | 3, were 0 | 29 | 2 of 4 |
| Myren | 91 % | 76 % | 4 | 30.4 of 196 | 3, were 0 | 23 | 2 of 4 |
| Berget | 94 % | 64 % | 2 | 47.9 of 156 | 6, were 0 | 24 | 2 of 4 |
| Byn | 100 % | 88 % | 1 | 19.5 of 157 | 3, was 1 | 11 | none hidden yet |

Before the first pass, nine of the sixteen hidden sweets hung 1.9 EL above a spot the trail crosses, no swing
ring hung outside Gården and Byn, and the robot finished Berget without pressing Hoppa. The last is still so:
the main trails are as they were, and `tests/robot/pace.test.ts` holds how long each asks for nothing but
running (Gården 4.7 s, Granskogen 4.7 s, Myren 9.7 s, Berget 3.8 s, Byn 6.3 s) so that the second pass can
only lower it.

**What laying them taught**, for whoever lays the next:

- **The kindest step up is a held jump straight up through the ledge above,** where the two overlap; the next
  kindest a standing jump with the stick held, 0.9 up and beside. A running jump over a gap is the hard one.
- **A ring is reached from the ground by a jump with a throw at its top,** unless it hangs more than the
  lace's reach above the top of a jump. Gården's, Myren's and Berget's rings can be joined that way;
  Granskogen's cannot. Either is fine, as long as the sweet at the end still takes the swings.
- **The picture follows the ground under him,** so it dips when he jumps between ledges over ground and
  between rings. Gaps over water do not dip. A camera zone with `above` frames a way without touching the
  trail's picture under it.
- **On a phone held sideways the rings are often above the picture from the trail.** The tell is the heart
  over the first ledge and the candy along the swings, which are in it.
- **A way that passes over a big candy or a memory lets a child who stays up skip it.** It is there on the
  way back or the next time; do not lay a way over something the story needs.
- **Something laid beside a drop is a way down too.** Gården's planks by the hose were first reachable by
  running off the deck's edge; they now wait for the hose and begin beyond that fall.
- **A wide ledge has a wide stem,** because a ledge and what holds it are one shape scaled to its width.

**What the puzzles taught:**

- **The format can hide, wait and carry; it cannot tilt, lift or shelter.** A solid thing can stand in the
  lace's way; a ledge, a climb or a candy can wait for a flag; a ride can carry him. But nothing tilts under
  a weight, so Granskogen's lever is told by a twig that grows out, and not shown. And a gust cannot lift,
  be sheltered from by a thing he moves, or wait for a flag, so Berget has no puzzle. The pieces to add are a
  ledge that tilts, shelters that follow things on rails, and a ring that waits for a flag.
- **"Stay" is an action.** Myren's puzzle asks for no button: a thing too deep to touch except by sinking.
  It can also solve itself for a child who lingers, which is kinder than what stood there before.
- **A puzzle beside a drop needs its far end thought of.** Holding the stick on after the push walks him
  over Granskogen's cone and off the bough's tip.
- **A chapter's tests box the next thing in.** Several count every ledge, ring or candy beyond some x as
  belonging to one side way, so a new piece fits only where they do not look. Find pieces by what they are.

## 4. Checks

- `tests/sim/ledges.test.ts`: what a ledge is, side candy, and the ride that begins again.
- `tests/unit/ledge-looks.test.ts`: how a place's ledges are drawn, and three rules every chapter's ledges keep.
- `tests/unit/lines.test.ts`, `tests/unit/rings.test.ts`: what holds a ring, and how rings are drawn.
- `tests/unit/kinds.test.ts`: a sweet with a `way` needs its chapter's secrets test.
- `tests/unit/candy.test.ts`: the two voices, that no side candy lies on the trail, and that side candy is
  drawn place by place.
- `tests/sim/layers-<chapter>.test.ts`: each chapter's side ways are played from the trail back to the trail,
  at several moments of letting go, and every miss is told. `tests/sim/secrets-<chapter>.test.ts` plays the
  way to each sweet that has one.
- `tests/unit/layers.test.ts`: a floor under each chapter's side ways, rings and sweets with a way, so that a
  change can add one and never quietly lose one; and that every ring off the main way hangs from something.
- `tests/robot/pace.test.ts`: a ceiling over how long each main trail asks for nothing but running.
- `tests/sim/puzzle-<chapter>.test.ts`: each puzzle's solution from the trail back to the trail, its likeliest
  wrong tries, a game taken up again, and that the helper and the robot never go there.
- Not yet: no browser suite plays a side way or a puzzle. Each was played once with the keyboard in the
  running game, at 1180×820 and 844×390, by a script that is not in the repository.
