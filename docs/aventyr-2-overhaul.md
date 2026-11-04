# Äventyr 2: the overhaul

Olov, 4 November 2026: every world unique and real, the red thread clear, every puzzle clever and fun, everyone well
designed and well animated, "designade av en art designer och game developer som gjort ett AAA spel". This is the audit
behind that work, what the real places look like, and the order of the work. `HANDOVER.md` records what is built.

**About the pictures.** The research opened real photographs for the first time. They are other people's, mostly of
unknown licence, and are references to look at. They are never committed, and never used as textures or plates. On
Olov's computer they are in `photos/landscape/aventyr2/`, which git ignores.
Sources are listed at the end. The house in Billsta is drawn from Olov's picture alone. Nobody searches for it, and its
address and number are never written, drawn or modelled.

## The audit

**Story and puzzles: B-.** Warm and well wired, with superb set-pieces, but almost no real puzzles.
- One generic robot plays all ten chapters: run right, jump, press what is offered, wait out drips and gusts. No puzzle
  needs a choice, an order or a return trip, and Elof plays games for 11+. Äventyr 1's seesaw did (`counterweight`).
- 17 crossings are one button; 11 of them are rides. Boot, leaf, raft, leaf are one water ride four times.
- Drips and gusts are the same timing in four chapters each, so the storm never gets harder to play.
- The ball at Olympia and the bark at Flärken solve themselves: they block the path, with the verb on the button.
- Best: Stormskogen (tiptoeing over frozen Klonk), Olympia (riding the free kick), Morgonen efter (naming Fjun).
- Weakest: Älven (42 % on rails), Flärken (long, and no moment of its own), Byn (stations without an idea).
- Players are told too much: "Just nu" gives the answer before the problem, and Elof captions the screen about 170 times.

**Characters and animals.**
- Calling mormor or morfar made them vanish. **Mended.**
- Äventyr 2 has almost no animals: rain empties the cast, and `home` chapters have none. The otter Elof announces does
  not exist. The story owl is spheres that pop in and out.
- Motion to mend: the squirrel has no legs and glides; the fox's feet skate; small birds flap at a flat 7 Hz, snap their
  heading and vanish mid-air.
- Old trägubbe and lillgubbe are primitives. Their final model needs Pappa's picture (art bible §1.3), which is on
  Olov's old computer.

**The worlds.** Olympia and Billsta are the garden again, Älven the forest again, with near-identical light. All come from
one call, `scenery(look.id)`.

| Chapter | Identity | What is wrong |
| --- | --- | --- |
| Stormkvällen | C+ | The prologue's room; the deck shows a pale daytime garden beside a black window |
| Stormgården | B | Gården, rightly |
| Stormskogen | A- | Granskogen, rightly |
| Byn i stormen | B+ | Pale walls |
| Olympia | D+ | No pitch: no lines, dandelions on the turf; a yellow house instead of the hall; the garden's backdrop |
| Flärken | C+ | The bog's backdrop and peat; a wooden tower on legs |
| Älven | C | Stormskogen's light and backdrop; stumps and lodge are deck boards |
| Billsta | C- | The garden's backdrop; Billaberget is lawn with dandelions |
| Stormens öga | B- | Two moons; the bog's backdrop; family lamps floating in the air |
| Morgonen efter | C+ | The prologue's room |

## What the real places look like

Labels: **seen** in a photograph, **reported** in text, **inferred**.

### Olympia, Bredbyn

Anundsjö IF's ground, on a hill just outside the centre (reported). It feels like a clearing cut out of a forested hill,
not a stadium (inferred).

- **The hall, which is what "the red building" is (seen):** wine-red vertical boards under one wide, low **barrel-arched
  roof**, with a broad white fascia following the curve. A ribbon of paired white windows sits high under the arch. A
  grey flashing runs across at wing height, over a dark recessed porch with a white post, a timber ramp with a tube
  rail, and a low concrete plinth on a gravel yard. Low wings at the sides, asymmetric. Frontage about 3.4 × height; the
  arch rises about 1:5.5 of its span and covers about 70 % of the frontage (inferred from the old photograph).
- **Its name** stands over the windows in white letters in the game's own hand, as Olov asked. Plain walls stand in for
  the two crests and the sponsor boards.
- **The stand (seen):** seven or eight long tiers of warm tan timber on a low bank, under a thin dark roof on slender
  columns, with a curved beam at its end, three stairs and a ramp with white tube rails. It seats about 300, on the
  south long side (reported).
- **Around it (seen):** a near-black wall of spruce and birch right behind the stand; a bare earth bank with long pale
  boards; blue bins; chain-link; a small goal beside the stand; a slim pole with one lamp head. Red store building with
  broad white trim and a red-and-white striped awning. A big pale gravel yard between hall and pitch.
- **Floodlights:** Olov confirms the ground has them, so the masts stay, though no photograph shows them.
- **The pitch** is 110 × 65 m (reported), so saturated flat turf with white lines. Mown stripes and worn goalmouths sell it.

### Flärkenbadet

A sheltered bay on a forested lake (seen). Volunteer-run (reported).

- **The tower stands on a raft (seen):** a dark steel lattice with a ladder and stepped platforms, moored out in the bay.
- **An L-shaped pontoon jetty (seen),** low on the water, with a life ring on a post and reeds beside it.
- **A rust-red steel water slide** standing in the shallows, and a small toy slide (seen).
- **A broad tan sand beach,** backed by grass and tall white birches (seen).
- **A honey-brown log hut** with deep eaves and a pale grey-blue metal roof; a small dark tarred hut with white trim; a
  flagpole; picnic tables; a white-and-salmon rowing boat; giant chess on gravel; a swing beam between two birches; a
  hand-painted board with a smiling wooden sun, which stands in here without lettering (seen).
- **Across the water:** a dark forested ridge, a meadow strip at its foot, a treed point, red farms (seen).
- **The raft stays in the game (Olov's decision),** though it has probably come ashore by October in reality. A raft that
  rocks and drags at its moorings in the storm suits the chapter better than a fixed tower.

### Älven

The river changes character twice, and that is the chapter's structure (inferred).

1. **A dark forest torrent (seen):** near-black pools, tea-brown where it breaks, cream foam and flecks drifting on the
   black, rounded boulders, a birch fallen across a rapid, rowan berries.
2. **A mirror through hay meadows at Bredbyn (seen):** flat water between level meadows, willows and lone birches, wooden
   power poles reflecting in the wet grass, a low concrete road bridge with a steel rail, a grey log barn at the bank, and
   a white column painted with a red folk-art plant.
3. **A broad lake (seen):** Anundsjösjön, wide and grey, with long wooded ridges. Then Moälven, rust and gold birch on
   dark water, pale rock bands on the hills.

### Billsta and Själevad

- **The road (seen):** flat patched asphalt, no kerb, grassy ditches, wooden poles with lamp arms and wires across the
  sky, big lawns, spruces, sheds.
- **Mormor and morfar's house (Olov's picture):** a big two-storey house of pale grey vertical boards on a low grey stone
  base, under a dark metal roof with sharp eaves and a black chimney on the ridge. Three gables face the road; two of them
  meet in a valley over a downpipe. White two-part windows in grey casings, in two straight rows. A ladder fixed to the
  wall. Bushes at the corner, a gravel drive curving across a large lawn, and a ditch of wild flowers by the road. An
  old dark-red barn with a rusty corrugated roof beside it, and a great birch behind.
- **Billaberget (seen):** a dome with one steep end, grey rock bands through thin pine. A small falu-red log barn in a field.
- **Själevad church (seen):** white, with a portico of four fat columns, round-headed windows, a lantern storey and a
  spire with a gold cross, on a wooded height over a stone wall, and a slim concrete arch bridge beyond.

### Bredbyn's centre

A wide, curving street of two-storey timber houses, each its own colour: butter yellow, sage, falu red, pale blue, cream
(seen). Red-orange or black roofs, striped awnings, fretwork in a gable, and a stone column topped by steel rings on a
small green. A forest hill closes the street. Anundsjö church: whitewashed, a huge steep wood-shingle roof, and a
separate dark tarred bell tower (seen).

### The region, and the storm

Long falu-red barns with grey metal roofs, white silage bales, gold birch against near-black spruce, orange pine trunks,
lichen-grey boulders (seen). No picture shows a storm at night. At night, keep near-black spruce and tea-black water, and
let the lightning pick out white walls, birch trunks and Olympia's arch (inferred).

## The order of the work

One pull request for each visible outcome.

1. ~~Mormor and morfar.~~ Done.
2. ~~The trail runs out: the night's low point.~~ Done.
3. **Olympia:** the hall, the stand, the pitch, its name and the forest behind it are built. Left: its own light, the
   store with the striped awning, the gravel yard, the bank, and a truly dark forest wall (see `HANDOVER.md`).
4. **Billsta:** the house and barn are built, in the private repository (see `HANDOVER.md`), with morfar's and mormor's
   yard, spruces with hanging boughs and round logs. Left: the road with its poles and ditch, a forest floor and dome
   for Billaberget.
5. **Flärken:** the raft tower, the sand, the rust-red slide, the log huts, giant chess and the painted sun are built. Left:
   a raft that rocks, the jetty's L, the tarred hut, and its own far shore.
6. **Älven:** its own far picture (ridges, hay meadows, poles, the log barn, the white column), black water and cream foam
   are built. Left: the forest torrent's first stretch, tea-brown rapids, and the otter.
7. **Own light and far picture for every chapter,** so that no two look alike; two moons mended.
8. **Real puzzles:** "Vad flyter?" at Flärken is built (the stone sinks, then the bark). Left: a real seesaw at Billsta,
   Olympia's answer given later, a storm that gets harder, a river he plays.
9. **The finale:** a family relay at the jetty, a real meeting, the old one moves, the cap goes back on.
10. **Animals:** the fixes above, one owl, birds and life back in the calm and the morning.
11. **Words:** the Swedish pass, fewer captions, the owl hint.

## Sources

Olympia: anundsjoif.se ("Om Olympia idrottsplats", "Uthyrning Olympia"), de.wikipedia.org "Olympia (Fußballplatz)",
openstreetmap.org. Flärken: svenskalag.se/knifbad and its picture galleries. Älven, Billsta, Själevad, Bredbyn and the
region: Wikimedia Commons (for example "Moälven 37", "Norra Anundsjöån 3", "Billaberget 1", "Själevads kyrka 2024",
"Köpmangatan, Bredbyn 2012"). The earlier text study is [`aventyr-2-reference-study.md`](aventyr-2-reference-study.md).
