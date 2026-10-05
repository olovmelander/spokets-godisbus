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
- **Budgets:** a picture stays within 120 draw calls. A side way in sight costs four: its ledges of every
  look, with what holds them and with its cords, lines and poles, are one mesh; its rings are one; its side
  candy two. Out of sight it costs none. A ledge that waits for a flag is one more for its look; every climb
  and thing on a rail is one of its own. Granskogen is the heavy chapter: its far bough is at 117 on a phone
  held sideways.

## 3. The chapters

"Layers" is the first pass: side ways, rings and re-homed sweets laid over the chapters as they stand, with
their main trails and saved games untouched. It is built (5 October 2026). "Arcs" is the second pass, on the
main trail itself, and is not begun.

| Chapter | The rule of the place | Layers, as built (first pass) | Arcs (second pass) |
| --- | --- | --- | --- |
| **Gården** | The lace | **The window sills:** five boards along the house wall over the deck. **The clothes line:** leaves up from the boulder, three rings on a line over the dew rain, the skumbanan on the leaf at its end. **The planks by the hose,** there once the ladybird has brought the hose down, for whoever climbs back up it: the skumsvamp | The swing's twist and its show of mastery on the main trail after the gully; the dew rain as a choice of going under or over |
| **Granskogen** | Cones that roll and weigh | **The boughs:** bark and a bough up from the big cone, the forest's first ring between two trunks, the gummiorm at the far bough's end. **The nest:** bark up a trunk after the log, the colaflaska in the nest, two rings in a row to a bough before the pool. **The root** from the hilltop back down to the ant road, once the ants have carried him up | A ring that a cone's weight pulls into reach; the avalanche as a chase after the ghost's cone |
| **Myren** | Firm and soft ground, a carried light | **The cranberry's leaf:** jumping for a heart he lands on the first cranberry, which puts him on a leaf with the stekt ägg. **The leaves** over the firm tussocks, two of them over open water. **The dead pines** over the boardwalk: two branches up, three rings on a rope, the sur napp where they end | A ring over a soft tussock, so that swinging is the way not to stand on it; the sinking run rebuilt as a rhythm; the boardwalk under the pines is still 9.7 seconds of plain running |
| **Berget** | Gusts that come in beats | **The rock shelves** up from the first slab, and the mountain's first ring over the cobbles to a far shelf with the gräddkola. **From lee to lee:** a low and a high shelf on every boulder and a ring between every two, on a guide rope: on the lace no gust has hold of him. The salmiakruta is on the last boulder | A climb that needs Hoppa; a three-step puzzle with the ghost at the cliff |
| **Byn** | (a medley) | **The sweet shop's shelves:** three steps up, two rings on their flex over the floor, a long shelf and a step down | Its return loop and its sweets are still unbuilt |

**Measured, before and after the first pass.** "One corridor" is the share of a chapter's length, from its
start to its goal, with no second way beside it; the first pass added what `tests/unit/layers.test.ts` counts.

| Chapter | One corridor, before | after | Side ways laid | over (EL) | Rings | Side candy | Sweets with a way |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gården | 95 % | 77 % | 3 | 37.0 of 209 | 7, were 4 | 21 | 2 of 4 |
| Granskogen | 92 % | 78 % | 2, and the root | 26.8 of 203 | 3, were 0 | 22 | 2 of 4 |
| Myren | 91 % | 77 % | 3 | 28.6 of 196 | 3, were 0 | 17 | 2 of 4 |
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
- Not yet: no browser suite plays a side way. Each was played once with the keyboard in the running game, at
  1180×820 and 844×390, by a script that is not in the repository.
