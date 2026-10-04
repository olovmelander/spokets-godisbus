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
| **Ledge** | `ledges: { x, y, width, look, needs? }` | A thin floor he jumps up through and stands on, and walks in front of when it is above his feet. It is how a second level lies over the same stretch: the ground is one line, and a ledge is ground only from above. He leaves it by walking off its end. `needs` makes it appear when a flag is set. Nothing floats: a `leaf` is drawn on its stalk, a `branch` and a plate of `bark` on a young stem, a `stone` shelf on its pillar, a `plank` on the batten that holds it to a wall. |
| **Side candy** | `side: Candy[]` | Candy off the trail, drawn as **hearts and lollipops**. The trail is sweets in wrappers and says "this is the way"; a heart says "this is extra". A heart in sight is the tell of every side way. Never needed, none of the trail's rules apply, saved by its place in the list (add at the end). |
| **A sweet with a way** | `hidden[].way` | A hidden sweet that is not reached by a held jump from the ground under it says how: "up the window sills", "at the end of the clothes line". `tests/sim/secrets-<chapter>.test.ts` has to play it. |
| **Ring** | `hooks[]` with `extra: true` | A ring off the main way. Rings in a row at equal spacing give the swing a rhythm. |
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
- **Budgets:** all ledges of one look are one draw call; every ring, climb and thing on a rail is one of its
  own. A picture stays within 120.

## 3. The chapters

"Layers" is the first pass: side ways, rings and re-homed sweets laid over the chapters as they stand, with
their main trails and saved games untouched. "Arcs" is the second pass, on the main trail itself.

| Chapter | The rule of the place | Layers (first pass) | Arcs (second pass) |
| --- | --- | --- | --- |
| **Gården** | The lace | Window sills along the house wall over the deck; leaves and a clothes line of three rings over the dew rain; a sweet at the end of the line and one in a pocket | The swing's twist and its show of mastery on the main trail after the gully; the dew rain as a choice of going under or over |
| **Granskogen** | Cones that roll and weigh | Boughs and bark over the long flat stretches, with a ring between trunks; a nest high in a trunk; a way from the hilltop back down to the ant road | A ring that a cone's weight pulls into reach; the avalanche as a chase after the ghost's cone |
| **Myren** | Firm and soft ground, a carried light | Dead pines over the boardwalk with rings in a row; leaves over the first tussocks | A ring over a soft tussock, so that swinging is the way not to stand on it; the sinking run rebuilt as a rhythm |
| **Berget** | Gusts that come in beats | Rock shelves up the slabs; shelves in the lee above the boulders with a ring between them, swung between gusts | A climb that needs Hoppa; a three-step puzzle with the ghost at the cliff |
| **Byn** | (a medley) | Its return loop and its sweets are still unbuilt | |

The measurements behind this (4 October 2026, before the first pass): 91 to 95 per cent of each numbered chapter
was a single corridor; nine of sixteen hidden sweets hung 1.9 EL above a spot the trail crosses; no swing ring
hung outside Gården and Byn; the robot finished Berget without pressing Hoppa.

## 4. Checks

- `tests/sim/ledges.test.ts`: what a ledge is, side candy, and the ride that begins again.
- `tests/unit/ledge-looks.test.ts`: how ledges are drawn, and three rules every chapter's ledges keep.
- `tests/unit/kinds.test.ts`: a sweet with a `way` needs its chapter's secrets test.
- `tests/unit/candy.test.ts`: the two voices, and that no side candy lies on the trail.
- Each chapter's side ways are played by a test of their own, which also holds that they let out forward.
