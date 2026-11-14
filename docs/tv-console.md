# Godisracet – Varggropen

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
driving that is fun to throw around. The game was rebuilt for that. It is a kart racer of that genre with its own
course, racers, items and music; nothing in it is taken from another game.

- **Eight karts, three laps.** Elof's crown kart against seven wooden animals: Räven, Haren, Ugglan, Ekorren,
  Igelkotten, Älgen and Björnen. The player starts last in **Äventyr** and in the middle of the field in **Lugnt**.
- **Handling** (`src/kart/sim/kart.ts`). The drift button hops. Held through a bend it locks a drift to that side;
  steering in tightens it and steering out widens it. The drift charges blue, then gold, then pink sparks, and
  letting go spends them as a turbo of that size. The wheel alone turns a wide arc at full speed, so the hairpins
  ask for a drift or a lift. Grass, snow, mud and water slow the kart; a boost carries it over them. Barriers cost
  little on a graze and a lot square on.
- **More ways to go faster.** Boost strips on the road, a trick (the drift button on a ramp) that lands with a boost,
  a rocket start (the drift button pressed inside the last second of the countdown and held), and the pull of the
  air behind another kart. Sweets on the road count to ten; each adds a little top speed, and a hit drops three.
- **Item bags** (`src/kart/sim/race.ts`). Six rows of striped bags a lap; a roulette picks one of eight items, and the
  item button uses it (a press during the roulette stops it early):

  | Item | What it does |
  | --- | --- |
  | Guldgodis, Tre guldgodis | A boost; three of them |
  | Kotte | Thrown straight ahead; bounces off the barriers; tumbles the kart it reaches |
  | Humla | Follows the road to the kart ahead and tumbles it |
  | Tuggummi | Laid behind the kart; whoever drives over it spins. A jumping kart passes over |
  | Sockervadd | Takes the next hit |
  | Regnbågsklubba | Seven seconds untouchable and quick; karts it bumps tumble |
  | Regnmoln | Rain over every kart ahead: they slow for three seconds |

  The leader mostly gets things to defend with, the last kart things to catch up with. In Lugnt the rivals are
  given fewer of the three attacking items.
- **The rivals** (`src/kart/sim/ai.ts`) drive the player's own kart model through the same controls: a racing line,
  real drifts for real turbos, tricks, bags and items. A small elastic keeps the field together; in Lugnt rivals
  ahead wait more and nobody behind is hurried on.
- **The course** (`src/kart/sim/track.ts`). Varggropen's outline as one 960 m lap through five places from Elof's
  adventure, each with its own road, light and sound: home (a village, noon), Granskogen (an earth road, golden
  afternoon, a jump), Myren (a boardwalk over water with mud puddles, dusk and lanterns), Berget (flagstones, a climb,
  night with northern lights, a crystal cave round the second hairpin, a jump off the mountain) and Godisängen
  (pink fondant, lollipops, a rainbow, dawn). The road rises and falls about ten metres over the lap.
- **Lugnt** also steers the kart away from an edge it is heading for and gives it a tighter wheel.
- Automatic gas is on at first; manual gas is a tick box. Keyboard, multitouch and a standard gamepad all drive.
- Optional best race and lap times are local to the current player and driving mode (`godisbus.kart.v2.*`; times
  from the first course are not carried over). They never modify the adventure save. Race sweets and the adventure's
  candy are separate things.

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
- **Changed:** the trace keeps its proportions but is 960 m round instead of the circuit's documented 665 m, so that
  eight karts and their items fit through the hairpins. The road's width, its hills, the two ramps and everything
  beside the road are made up for the game; none of it is a survey of the real circuit.

## Interruption and access

Pause freezes the countdown, lap clock, all karts and effects. Page hiding, window blur and host recovery
also stop driving; resuming takes a deliberate action. Restart and return to the house are always available.
Held gamepad controls must be released before driving resumes. Reduced motion removes the camera's shake, roll and
widening, the speed lines, the particles and the blinking after a hit. Audio follows the player's existing
effects/music settings; the music and every effect are synthesised in the page (`src/kart/audio.ts`).

The menu, HUD and controls are composed for both portrait and landscape phones. On the Low tier there are no cast
shadows and well under half of the geometry. Browser viewport review establishes appearance and interaction
at those dimensions; physical-device performance is a separate check.

## Working on it

`npm run dev`, then `/spokets-godisbus/dev/kart.html` is the game on its own, without the house: `?start` skips
the title, `?easy` is Lugnt, `?tier=low|mid`, `?calm`, `?mute`, and `?auto` drives with the real keys so that
whole laps can be watched. `window.__kart.debug()` reports the race, and `window.__kart.poke({ distance: 600 })`
or `poke({ item: 'bee' })` sets the player up for a picture.

Tests: `tests/unit/kart-race.test.ts` (course, handling, items, race rules, whole races in both modes),
`kart-audio.test.ts`, `kart-controls.test.ts`, `kart-records.test.ts`, and `tests/browser/home-console.mjs` for
entering from the house and returning to it.
