# The visual audit (5 October 2026)

Olov asked for an audit of everything in the game that can be improved visually, "from assets to background,
models, color grading, ground material ... to water, to stones, to grass, to mud, to birds ... the buildings,
the Bredbyn köpmangatan, the forest, the trees, the mountains ... to animations", and for "things happening in
the background, like a moose walking in the distant". This is that audit, and the order the work is done in.

Seven auditors each took one area. Each read the art bible and the code that draws its area, took 20 to 30
pictures of the running game at 1180×820 (a tablet) and 844×390 (a phone held sideways), on High and on Low,
and wrote down what a stranger sees in the first second, 21 to 25 findings with the fix for each, and the five
to do first. Together: 167 findings.

| Area | Findings | The audit |
| --- | --- | --- |
| Home and Gården (prolog, garden, epilog) | 25 | [garden-and-home.md](visual-audit/garden-and-home.md) |
| Granskogen | 25 | [granskogen.md](visual-audit/granskogen.md) |
| Myren | 22 | [myren.md](visual-audit/myren.md) |
| Berget and Norrsken | 25 | [berget-and-norrsken.md](visual-audit/berget-and-norrsken.md) |
| Byn: the street and the sweet shop | 24 | [byn.md](visual-audit/byn.md) |
| The pipeline, the light and the atmosphere | 25 | [pipeline.md](visual-audit/pipeline.md) |
| The far scenery, and the life in it | 21 | [far-scenery-and-life.md](visual-audit/far-scenery-and-life.md) |

Each audit's table gives, for every finding: where it is, what is wrong, the fix in sizes and colours, how it
is built, the files, the cost, what it does to the draw calls, and how much it gives.

## What is already good, and stays

- **The far layers:** soft, in each place's own palette, passing at their own speeds. The forest's four depths
  of columns and round spots of light are the best far scenery in the game.
- **The candy:** it reads at once against every place, on every tier.
- **The lawn:** backlit grass, dew that twinkles, sharp on the path and soft behind it. And under the deck:
  the joists and the stripes of sun.
- **The bog's light:** a gold afternoon, straw sedge against cream mist.
- **The mountain's two skies:** peach into blue-violet, and the navy dusk with its afterglow and stars.
- **The village's warm shop windows against a cool sky,** the wares drawn as pictures, the jars of sweets.
- **The pipeline's rules:** Neutral tone mapping, one grading pass switched by uniforms, nothing compiled
  during play, nothing blown out.

## What lets it down most

The auditors worked apart and agree on these.

1. **The bottom third of every picture.** It is the front of the ground, and it looked like fur: the ground's
   picture was laid out by depth alone, so on the rounded front it was pulled three to five times long. Six
   of the seven found it. Under the fault, the front is the same bare slab in every place: no forest floor,
   no peat and waterline, no rock ledge, no kerb.
2. **Nothing is a thing.** What a chapter names (the cone "as big as a car", the fallen log, the anthill, the
   garden's boulder and roots, Pappa's shavings, the hedge) is the ground's outline raised into a block, and
   what stands on it is a box, a ball or a cylinder. "Den gamla tallen", which the whole story walks to, is
   not there at all.
3. **Nothing in the world casts a shadow,** so a low sun from behind reads as flat light and things stand on
   the ground like stickers. Nothing has a rim of light, and what is in shade goes black or olive where the
   art bible asks for cool.
4. **Nothing that grows moves, and nobody lives far off.** No wind in grass or sedge, no falling leaf, no
   insect; behind the path only clouds move, at 2 to 7 pixels a second.
5. **The water.** On High the bog's dark peat water is a pale grey sheet that mirrors nothing, with a mustard
   cut face; on Low, where the effects are off, it is dark and better. Pools are boxes with straight far
   edges.
6. **The three tiers are three pictures.** Haze is mixed in a different space on each, so Low is the punchy
   one and Mid and High are milky. Anything tuned on one is wrong on the others.
7. **Byn's houses** are 160×128 canvases enlarged ten times on unlit planes 13 lengths behind him, with more
   than half of each above the picture. It is the weakest place.
8. **Home** is a flat unlit wall whose windows hang out of the picture, over a plank fence a third of the
   picture tall.
9. **The summit looks up at mountains, not out over them,** and the northern lights at the climax are a flat
   green wash without rays.
10. **Draw calls spent on nothing:** 12 to 36 in every picture go to things at scale or opacity 0, to cards
    that could be one mesh, and to ground far out of sight. Winning them back pays for everything else.

## The order of the work

One pull request for each visible outcome, each judged on before and after pictures on a tablet, a phone and
Low. What is done and what is next is kept in `HANDOVER.md`, not here.

| Step | What the player sees | From |
| --- | --- | --- |
| 0 | Nothing: `dressing.ts` becomes a module for each place, so that the places can be worked on at once | all |
| 1 | The ground's front without the fur; boards sharp to the far edge; cool shade; ground out of sight not drawn | every audit's first row |
| 2 | Nothing: things at scale or opacity 0 are not drawn (8 to 23 draw calls a picture) | myren 6, granskog 5 to 7, garden 11 |
| 3 | Water that is dark, mirrors its place and has no straight edge, the same on every tier | myren 1, 2, 10, 11; pipeline 7; far 8, 13; byn 8 |
| 4 | The far scenery repainted: a summit that looks out, Norrland's trees, an open mire, a valley under the flight | far 3, 6, 7, 10, 12, 15, 17, 18, 20 |
| 5 | Life far off: a moose in the bog and the forest, cranes, smoke, the valley's lights, a shooting star | far 1, 5 and its last section |
| 6 | The village's houses as real parts in a low sun, at two depths | byn 1, 2, 5, 6, 11, 22, 23; far 4 |
| 7 | One haze for all three tiers; then shadows from the world, a rim of light, wind, the grade | pipeline 2 to 5, 8, 10 to 13, 15, 16, 20 |
| 8 | Each place's own ground: the forest's floor, the bog's hummocks, rock, the street's section, the decks' rim | granskog 1, 2, 10; myren 3, 4, 7; berget 1 to 3; byn 3, 4; garden 1, 2 |
| 9 | Things that are things, made in Blender: a kit for the forest, the stones, the bog (with its snags and the crane), the garden; the old pine | granskog 3, 8, 9; berget 4, 6, 9 to 12; myren 8, 9, 15; garden 4, 6 to 8 |
| 10 | The soft cards as batches; ledges that belong to their place; wind, falling leaves, insects | far 2; granskog 4, 11 to 13; berget 8 |
| 11 | Home's rooms; the shop's inside; the drain, the puddle and the awning; the mist and the lantern; the northern lights | garden 9 to 11; byn 7 to 9, 17 to 20; myren 5; berget 5 |

Steps 3 to 6 touch different files and are built side by side. Step 7's haze comes before any tuning of
looks, since everything tuned after it is tuned once.

## The budgets every step lives inside

- **Draw calls a picture: 120 on Low, 160 on Mid, 200 on High.** It was 120 on every tier when the audit was
  made; Olov raised it the same day to make room for better graphics, and things at no size or opacity are
  no longer drawn (8 to 22 fewer in every picture). The heavy places stood at 100 to 117 with stand-in
  figures, and the family's models add 11 to 19 on the site. What is added for High stays out of Low's
  picture where it would not fit.
- **No shader compiled during play.** Anything new is in the scene from the first frame.
- **Three tiers,** and a phone held sideways as much as a tablet.
- **Size:** the script 450 KB gzipped (391 used on 5 October), the boot pack 3,072 KB (828 used).
- **The rules of the art bible:** the play plane is sharp and level; red, pink and gold are the candy's and
  the hook's; no letter, numeral or mark anywhere; reduced motion stills what moves by itself.

## For Olov to decide

None of these blocks the work: each has a default.

1. **A moose at its true size among the forest's trunks?** The forest's far layers are near, so a moose
   passing there would be 14 times his height: four legs like moving trunks, pale in the mist. It could be
   the game's most remembered picture, and it could frighten. The default: only the small, far moose.
2. **Red farms and Anundsjö's bell tower far off behind the garden?** The art bible says the far houses are
   "not red", so that red stays the candy's. The auditor asks for Falu red mixed half with the haze, and the
   tower as a small dark shape once a picture. The default: fields and a pale river, no red, no tower.
3. **Reindeer on the mountain's ridge?** A lovely file against the sky, and a winter sight here, not a
   September one. The default: no reindeer; ravens instead.
