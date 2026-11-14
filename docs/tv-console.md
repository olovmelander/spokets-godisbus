# Godisracet

An optional game at the television in Prolog, Godiskalaset, Stormkvällen and Morgonen. Walk near the TV and
choose **Spela på TV:n**. Not in Stormkvällen once the power has gone (Olov, 12 November 2026): the screen is dark
and the game is not offered (`src/content/home-power.ts`). In Morgonen the TV stands on the way to the door where the
story ends, so it can be played before the end. An existing story interaction keeps priority on the ordinary action button;
the TV has its own visible choice where the two overlap. Held story scenes finish before the console opens.

The console preserves the live adventure rather than loading another chapter. The house's simulation,
camera, speech, input, automatic photos and collection/save receipts wait while the console owns the screen.
Leaving returns to the same place, with no race input carried into Elof's controls. The game is a lazy local
bundle with its own disposable renderer, input listeners and sound graph. No network service is involved.

## What it is now (14 November 2026)

Olov asked for the feel of an arcade kart racer: a varied track, things to pick up for boosting and attacking, and
driving that is fun to throw around; and then for four courses with different themes, a cup over all four, and a
choice of speed class and difficulty. The game was rebuilt for that. It is a kart racer of that genre with its own
courses, racers, items and music; nothing in it is taken from another game.

### Four courses and a cup

Every lap is 960 m, and a race is three laps (`src/kart/sim/courses.ts` holds each course as numbers;
`src/kart/sim/track.ts` builds it).

| Course | What it is |
| --- | --- |
| **Gårdsvarvet** | A wide, flowing lap round the village and through the edge of Granskogen: no hairpin, two jumps. The gentle one |
| **Myrspången** | A narrow boardwalk winding over Myren at dusk: three hairpins, mud puddles, water on both sides, lanterns |
| **Kristallberget** | Up the mountain at night by a switchback, through the crystal cave along the top, and down again in a long jump. The one lap that turns left |
| **Varggropen** | The long one on Varggropen's outline, through every place of the adventure: home, Granskogen, Myren, Berget with its cave, and out over Godisängen |

- **Godiscupen** (`src/kart/sim/cup.ts`) is the four courses in that order. Each race gives 10, 8, 6, 5, 4, 3, 2
  and 1 points; the most points after the fourth race wins, and level on points the better place in the last race
  is ahead. From Pause a cup race can be driven again; its points are counted only when it is finished.
- **Speed class:** 50, 100 or 150 cc, which is 78 %, 90 % or all of full speed (108 km/h, about 147 with the strongest boost)
  for every kart in the race. At 50 cc the wheel alone takes most bends; at 150 cc the hairpins ask for a drift.
- **Difficulty:** *Lugnt* (slower rivals that wait and are given fewer things to throw, a start in the middle of the
  field, a tighter wheel and a nudge away from the edge), *Äventyr* (rivals a little slower than the player, a start
  at the back) and *Mästare* (rivals as fast as the player, who chase harder).
- The title page chooses the cup or one course, the class and the difficulty, and its camera flies round the course
  that is chosen. The first time it opens: the cup, 100 cc, Äventyr.

### Driving

- **Eight karts.** Elof's crown kart against seven wooden animals: Räven, Haren, Ugglan, Ekorren, Igelkotten,
  Älgen and Björnen.
- **Handling** (`src/kart/sim/kart.ts`). The drift button hops. Held through a bend it locks a drift to that side;
  steering in tightens it and steering out widens it. The drift charges blue, then gold, then pink sparks, and
  letting go spends them as a turbo of that size. The wheel alone turns a wide arc at full speed, so the hairpins
  ask for a drift or a lift. Grass, snow, mud and water slow the kart; a boost carries it over them. Barriers cost
  little on a graze and a lot square on.
- **More ways to go faster.** Boost strips on the road, a trick (the drift button on a ramp) that lands with a boost,
  a rocket start (the drift button pressed inside the last second of the countdown and held), and the pull of the
  air behind another kart. Sweets on the road count to ten; each adds a little top speed, and a hit drops three.
- **Item bags** (`src/kart/sim/race.ts`). Six rows of striped bags a lap; a roulette picks one of fourteen items, and
  the item button uses it (a press during the roulette stops it early):

  | Item | What it does |
  | --- | --- |
  | Guldgodis, Tre guldgodis | A boost; three of them |
  | Kotte, Tre kottar | Thrown straight ahead; bounces off the barriers; tumbles the kart it reaches. Three of them |
  | Humla | Follows the road to the kart ahead and tumbles it |
  | Tuggummi | Laid behind the kart; whoever drives over it spins. A jumping kart passes over |
  | Smällkaramell | Lobbed in a high arc over the karts in its way; goes off where it comes down, and everyone within about five metres tumbles, its thrower too |
  | Näverlur | A blast of sound: everyone within eight metres tumbles, and whatever has been thrown near the kart is blown away |
  | Sockervadd | Takes the next hit |
  | Studssvamp | A high bounce over whatever lies on the road, landing with a trick's boost |
  | Godismagnet | Eight seconds of pulling in every sweet near the kart, on the road or in the air, and item bags from further to the side |
  | Regnbågsklubba | Seven seconds untouchable and quick; karts it bumps tumble |
  | Brusraket | About three seconds of a rocket that drives the kart by itself along the racing line, faster than any boost; it cannot be stopped and knocks over what it meets |
  | Regnmoln | Rain over every kart ahead: they slow for three seconds |

  The leader mostly gets things to defend with (gum, candy floss, the horn, the mushroom, the magnet), the last
  kart things to catch up with (three sweets, the rainbow lollipop, the rocket, the rain cloud).
- **The rivals** (`src/kart/sim/ai.ts`) drive the player's own kart model through the same controls: a racing line,
  real drifts for real turbos, tricks, bags and items. A small elastic keeps the field together.
- **Places.** A course passes through one or more of five kinds of place from Elof's adventure, each with its own
  road, light, scenery and music: home (a village, noon), Granskogen (an earth road, golden afternoon), Myren (a
  boardwalk over water, dusk and lanterns), Berget (flagstones, snow, night with northern lights, crystal caves)
  and Godisängen (pink fondant, lollipops, a rainbow, dawn). The light changes as the kart drives from one to the next.
- Automatic gas is on at first; manual gas is a tick box. Keyboard, multitouch and a standard gamepad all drive.
- Optional records are local to the current player: the best race and lap for each course, class and difficulty,
  and the best place in the cup for each class and difficulty (`godisbus.kart.v3.*`; times from the earlier
  versions are not carried over). They never modify the adventure save. Race sweets and the adventure's candy are
  separate things.

## What came from Pekkas Pokal, and what did not stay

Source: `olovmelander/pekkas-pokal`, commit `776236004403fb18423cc078ba4a82a6324bde14`, `src/games/kart/`.

- **Kept:** the 77-point Varggropen trace (`src/kart/sim/trace.ts`, unchanged and checked by digest in the tests),
  the racing line's optimiser (`buildRacingLine` in `sim/ai.ts`), the geometry batching helper (`visual/kit.ts`),
  the digital steering ramp and pointer ownership in `input.ts`, and the engine's clutch in `audio.ts` (`kartRpm`). See
  [the source research](https://github.com/olovmelander/pekkas-pokal/blob/776236004403fb18423cc078ba4a82a6324bde14/src/games/kart/research.md)
  for the trace's provenance.
- **Replaced on 14 November 2026:** the rental-kart tyre and yaw model, its contact solver, its rival driving, its
  surfaces and its camera (the files that were `src/kart/ported/`). They modelled a real kart well, and that is not
  the feel that was asked for. They are in the git history before this change.
- **Changed:** Varggropen's trace keeps its proportions but is 960 m round instead of the circuit's documented
  665 m, so that eight karts and their items fit through the hairpins. Its width, its hills, its ramps and
  everything beside the road are made up for the game; none of it is a survey of the real circuit.
- **New:** the outlines of Gårdsvarvet, Myrspången and Kristallberget are drawn for this game.

## Interruption and access

Pause freezes the countdown, lap clock, all karts and effects. Page hiding, window blur and host recovery
also stop driving; resuming takes a deliberate action. Restart and return to the house are always available;
leaving in the middle of a cup ends the cup. Held gamepad controls must be released before driving resumes.
Reduced motion removes the camera's shake, roll and widening, the speed lines, the particles and the blinking after
a hit. Audio follows the player's existing effects/music settings; the music and every effect are synthesised in
the page (`src/kart/audio.ts`).

The menu, HUD and controls are composed for both portrait and landscape phones. On the Low tier there are no cast
shadows and well under half of the geometry. A course's world is built when its race is first drawn, and the one
before it is released. Browser viewport review establishes appearance and interaction at those dimensions;
physical-device performance is a separate check.

## Working on it

`npm run dev`, then `/spokets-godisbus/dev/kart.html` is the game on its own, without the house:
`?track=cup|garden|bog|mountain|varggropen`, `?cc=50|100|150`, `?level=easy|normal|hard`, `?start` (skips the
title), `?tier=low|mid`, `?calm`, `?mute`, and `?auto`, which drives with the real keys so that whole laps and
whole cups can be watched. `window.__kart.debug()` reports the race, and `window.__kart.poke({ distance: 600 })`
or `poke({ item: 'bee' })` sets the player up for a picture.

Tests: `tests/unit/kart-race.test.ts` (every course, handling, items, race rules, the cup, whole races),
`kart-audio.test.ts`, `kart-controls.test.ts`, `kart-records.test.ts`, and `tests/browser/home-console.mjs` for
entering from the house and returning to it.
