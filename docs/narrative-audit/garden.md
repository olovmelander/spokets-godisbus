# Gården, Kapitel 1: narrative and gameplay audit

5 October 2026. Chapter id `garden`, `src/content/chapters/garden.ts`. I measured the robot's playthrough with the
timeline harness (65.5 s to the goal) and took eight pictures of the running game at 844×390 on Low, with stand-in
figures. I drew memory 1's three pictures from `src/ui/memory.ts` outside the game.

**Verdict.** In Gården a seven-year-old gets a good chase. The ghost hops ahead with his striped bag, the candy shows
every jump, he turns a ladybird over, swings on the lace, finds a short sepia picture of a man and a small boy, and
flies on Moa's plane. He understands "follow the ghost and take back my sweets". He does not get most of what the
chapter is for:
- **The family.** The chapter opens with Pappa's two bubbles. They repeat, word for word, the last two the child
  read in the prologue about a minute earlier, and no Pappa is on screen. After them nobody in the family is seen
  or heard for about nine and a half minutes, until Moa.
- **The ghost.** It shows no character on screen. It never freezes, teases, trips, juggles or hides: it stands, hops,
  and at Moa's root it shrinks to nothing on flat grass. Its one mystery seed, a smudge in a thought bubble, shows
  once, for five seconds, with no sound.
- **Memory 1** is in a good place, but it plays in silence, the ghost is 11 EL away, and nothing reacts to it.
- **Moa** sounds surprised to find him small, although she saw him shrink. She says the plane is waiting when no
  plane is in sight, and if he boards at once her queued lines play during the flight.
- **The ending.** The card comes about 2.6 robot seconds after the landing. The last picture is grass in front of a
  flat brown wall, and the ghost has been gone since x 161.

What is missing most is an ending with the ghost and the family in it, and the family between the deck and Moa.

## As it plays now

The child's minutes come from the plan. It puts Kapitel 1's beats at 12 minutes on the fastest path (plan §1, "The
first minutes", 2:00–14:00) and at 18–22 minutes with exploring and C1 (§4.9). I spread the robot's 65.5 s over those
12 minutes one stretch at a time: the deck 0:00–2:30, under the deck 2:30–5:30, the lawn to the memory 5:30–9:00, and
Moa to the goal 9:00–12:00. "Shot" means one of the eight pictures. They are in the session's scratch space and are
not committed. Each can be taken again with the address under the table.

| Robot s | Child | x | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0.0 | 0:00 | 1 | Bubble, Pappa: "Jag ser dig. Vi håller ihop." No Pappa in the picture. The ghost with the bag stands 4.6 EL ahead (shot 00) | The ghost has my bag: chase it |
| 0.8 | 0:08 | 3.2 | Bubble, Pappa: "Vi följer stigen och hjälper dig." Both lines are the prologue's last two (`ends.ts:99–100`) | Nothing: text only |
| 0.3–12.2 | 0:03–2:08 | 2–44 | The ghost hops over the deck's steps and the lifted board, eight perches. At each one it stands, sways and taps a foot | It keeps ahead of me |
| 11.6–14.3 | 2:02–2:30 | 40–46 | He turns the ladybird over (Vänd); it flies to the hose, and he slides down | Helping someone opens the way |
| 15.0–19.2 | 2:43–4:01 | 48–57 | Under the deck: a big candy, the lost things on their stones (`lost:brick`), the first swing over flat ground | The lace swings; a miss costs nothing |
| 19.8 | 4:12 | 59 | `visit:gully`: the ghost appears in the air beside him, looks at the hook over the gully, and knocks without sound. A smudge in a thought bubble shows for at most 5 s (shot 01) | If noticed: the thief points at the hook |
| 20.9–23.9 | 4:33–5:30 | 62–68 | The swing over the drain gully. A miss is the glitter bubble, and the ghost does not react | Daring, and safe |
| 25.2 | 5:39 | 72.6 | `dandelion`: the ghost stands still at x 74 for no visible reason. Använd says "Ta!", five sweets pop out, and it hops on | I nearly got it |
| 26.0–43.3 | 5:45–8:00 | 75–129 | The lawn: two roots, the boulder, the dew bells, the clothes line, the dew rain. The ghost hops through seven perches | No story event for 19.5 robot s |
| 44.7–48.6 | 8:10–8:41 | 132–138 | Pappa's shavings: one curl pulled down as a step, a second pushed across as a bridge | The world can be moved |
| 49.8 | 8:51 | 141 | The ghost leaves the shavings for the birch before he reaches the memory | — |
| 51.1 | 9:00 | 146 | Memory 1: three sepia cut-outs, 7.2 s, silent, growing from the shaving. Nothing reacts afterwards (shot 02 is the moment after; the three pictures are drawn from the source) | A man in a cap carves a small figure for a small boy |
| 54.3 | 9:40 | 155.6 | Bubble, Elof: "Ge tillbaka mitt godis!" Triggered by position alone; the ghost stands in the grass ahead (shot 03) | Elof is cross: text only |
| 54.5 | 9:42 | 156.3 | The ghost hops to the "root hole" at x 163.4, which is flat grass | — |
| ~55.9–56.0 | 10:01 | 161.2–161.6 | The ghost shrinks to nothing (worked out from `near: 2.2`). Bubble, Moa: "Lillebror?! Du är ju pytteliten!" Moa is a 4 EL box figure that was already standing there (shot 04) | Moa is here; the ghost vanished |
| 56.9 | 10:12 | 164.9 | Ropa på Moa: two Moa bubbles queue at once, "Planet väntar. Vi lyfter när du vill." and "Min lövteckning föll under spånbron!" There is no plane, only a sign with a plane on it (shot 05) | A plane is promised; none is seen |
| 57.3–64.3 | 10:17–11:45 | 166–206 | Kliv på planet: the plane appears under him and flies 7 s over the hedge through arcs of candy. The robot boards 0.4 s after calling, so Moa's queued lines play during the flight and at the landing | Flying |
| 64.3 | 11:45 | 206 | Landing in grass in front of a flat brown wall 12 EL high. No ghost, no spruce; a Moa bubble still showing (shot 06) | — |
| 65.5 | 12:00 | 210 | The goal. The card comes 1.4 s later. On a phone held sideways it opens scrolled to its buttons, with its title out of view (shot 07) | "Nästa kapitel" |

Each address starts with `?dev&debug&standin&course=garden&tier=low` on the dev server, and adds:

| Shot | Added to the address |
| --- | --- |
| 00 | nothing |
| 01 | `&at=59.3,0.01` |
| 02 | `&at=145.6,3.31` |
| 03 | `&at=155.7,0.01` |
| 04 | `&at=160.6,0.01`, then walk right |
| 05 | `&at=166,0.01&flags=moa,garden:pocket-open` |
| 06–07 | `&at=205.5,0.01&flags=moa,plane:board`, then walk right |

- **The longest stretches where nothing tells the story:**
  - No words from 0.8 s to 54.3 s (0:08 to 9:40).
  - No family from 0.8 s to 56.0 s (0:08 to 10:01). Yet the prologue's card promised "med familjen nära"
    (`sv.ts:201`), and the pause recap says "Familjen följer den stora stigen" (`sv.ts:183`).
  - No story event of any kind from 25.2 s to 44.7 s: the lawn, about 2.5 of the child's minutes.
- **How it ends:**
  - The last picture is Elof in tall grass in front of the ground's closing wall at x 214 (`garden.ts:157–158`).
    The ghost has been gone since x 161.2, 45 EL earlier, and Moa was left behind out of sight.
  - From the landing it is 1.2 s to the goal and 1.4 s more to the card (`main.ts:889`): about 2.6 robot seconds,
    3–5 for a child.
  - The card's handoff says "Moas plan tar mig till skogen. De stora följer stigen runt." (`sv.ts:202`). Neither is
    shown.

## What is good, and stays

- **The plan's order of beats.** Deck, ladybird, under the deck, the lace, the gully, the dandelion, the lawn, the dew
  rain, the shavings, the memory, the stomp, Moa, the plane. The chase can't be lost, and the trail always shows the
  way (perches at `garden.ts:338–368`, the candy arcs).
- **The ladybird** (`garden.ts:175, 181`). It is the theme's first "someone who can't say it in words", and the
  kindness opens the way down.
- **The ghost's one visit as helper**, at the gully, on every help setting and never pulsing Använd
  (`garden.ts:71`, `sim.ts:530–541`). The seed is right, and so is its place, just before the daring swing.
- **The lost things under the deck** (`garden.ts:184–187`). They carry the family as objects and pay off at the party
  (`sv.ts:231–233`).
- **Memory 1 at the top of Pappa's shavings.** It is the reward of the chapter's puzzle (P4), and its cut-outs read
  at a glance: carving, giving, two smiles (`memory.ts:55–58`).
- **Moa's moment:**
  - the shared shot that frames her with tiny Elof (`view.ts:838–847`, shot 05);
  - her hop of joy when called (`view.ts:985–997`);
  - her three-note motif (`cues.ts:21–26`).
- **Boarding is a choice** ("Kliv på planet", `garden.ts:198`), and the optional paper pocket lets the help go both
  ways ("Vi hjälps åt, lillebror.").
- **The trail rises into the air past Moa** (`garden.ts:488–501`), so it says "you will fly" before anyone does.
- **The purpose line and the pause recap** are short, honest and rarely ahead of the story (findings 12 and 25 are the
  exceptions).
- **The album photo** "Moas flygplan" is taken in flight (`photos.ts:11`).

## Findings

"Visual audit row N" means row N of `docs/visual-audit/garden-and-home.md`, which already specifies the objects some
of these fixes stand on: the root arch, the spruce at the chapter's end, the plane and the shavings.

| # | Where | What is wrong | The fix | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Opening, x 0.9 and 3.2 (`garden.ts:371–372`; `sv.ts:228, 242`) | Family. Pappa's two bubbles repeat word for word the prologue's last two (`ends.ts:99–100`), seen about a minute earlier. He is not in the picture, so they come from nobody, and the chapter has no title or opening picture | Drop both beats from the garden; they stay in the prologue. Open on a played family beat, with no hold. Pappa's hand (the prologue's hand box, `prologue-stage.ts`) lowers beside Elof at x 2.5, taps the boards twice and gives a thumbs-up, then lifts away; Pappa's motif plays. The lower bodies of all four walk off right along the house at z −6 (the big path, row 2). "Kapitel 1 · Gården" shows for 2.5 s and fades on the first input. Berget's outline stands on the horizon | Chapter data (beats, a sighting); view code; `sv.ts` (title). Update `tests/robot/garden.test.ts:21`, which lists the bubbles in order | M | 3 |
| 2 | x 3–159; `sv.ts:183` | Family. Nobody from the family is seen for about 9.5 of the child's minutes. "Familjen följer den stora stigen" is told in the pause panel but never shown, and the garden has no big path | A pale gravel path at z −7 to −9 from the deck stairs (x 44) across the lawn to a gate in the hedge (x 176). Family "sightings" happen on it: a list in the chapter, `family: [{ who, from, to, act }]`. Each shows a figure cut by the top of the picture, as a giant, for 3–5 s. A sighting never stops Elof, and each answers his wave (gameplay 1) | Dressing (the path); `types.ts`; view code | M | 3 |
| 3 | Under the deck, x 46–50 (`garden.ts:184`) | Family. Bertil's marble lies there, but Bertil never appears in the chapter | Bertil's fingertip pokes down twice through the gap between two deck boards over the marble (x 48.4), too short to reach it: rule 8 without words. His cap's shadow crosses the stripes of sun. When `lost:marble` is set, the finger gives a thumbs-up and withdraws, with Bertil's motif. No bubble | View code (a finger of two boxes under the `roofs` boards); chapter data (a sighting that lasts until `lost:marble`) | S | 2 |
| 4 | Deck, perch at x 20.8 (`garden.ts:343`) | Ghost. The plan's "teasing little dance" on the far side of the lifted board is not there. The ghost stands, sways and taps a foot (`view.ts:933–947`) | Give the perch `act: 'tease'`. While Elof is on the near side (x 12–17), the ghost hops twice in place, spins once, lifts the striped bag over its head and wiggles it, then double-knocks. It repeats every 4 s until he crosses | `types.ts` (`act` on a perch); view code (a cycle of poses); audio (knocks) | S | 2 |
| 5 | The gully visit (`garden.ts:71`; `props.ts:683`; `cues.ts:210`) | Ghost, cause and effect. The helper ghost appears in the air above Elof's head and glides in like the jay. The chase ghost blinks out meanwhile (`view.ts:818`). The double knock makes no sound: the `knocks` cue needs help step 2, and a visit is step 1 | The helper enters from the chase ghost's perch (x 68.6): two wooden hops back to the gully's far edge (x 66.4). It faces the hook at (63.5, 3.3), looks up, double-knocks with sound, turns to Elof and shows the smudge (row 6). After 4 s it hops back to its perch | `props.ts` (the ghost's way in); `cues.ts` (knocks when a visit begins) | S | 3 |
| 6 | The smudge (`props.ts:640–650`; `types.ts:251`) | Mystery. The smudge is a blurred oval with no shape. It is shown once, for at most 5 s. No perch in the garden has a `thought`, and there is no smudge for the chase ghost | Add a picture `smudge` to `ghost-thought.ts`: the first trägubbe's outline (a round head and a pointed cap), grey, blurred 6 px, on the cream bubble. It is the same outline that Kapitel 2's `small-figure` shows sharp, so rule 6 can be seen. A soft "plopp" plays as it opens. Show it at the gully, beside the memory shaving (row 10) and at the forest's edge (row 21). Tapping the ghost (`pointing.ts:43`) also shows its bubble for 2 s | `ghost-thought.ts`; `props.ts`; perches in `garden.ts`; audio | S | 3 |
| 7 | The first glitter bubble, under the deck | Ghost. Plan §3.3 rule 3, "the ghost watches with its head tilted", is not built: the ghost does not react to `mode === 'bubble'` (`view.ts:936–958`) | The first time he is in the bubble in Gården with the ghost standing within 9 EL, it turns to face him and tilts its whole body 20°, as a wooden toy tilts its head. A slow creak plays (sadness, plan §2.2). It holds until he stands, then knocks twice quickly and hops on. Set `garden:watched` so this happens once | View code; audio | S | 2 |
| 8 | The dandelion, perch at x 74 (`garden.ts:353`; `sim.ts:666–669`) | Cause and effect. There is no dandelion, no trip, no lunge and no squeak: the ghost waits for no visible reason, and on Ta! five sweets simply pop in (`candy.ts:308`) | Place a dandelion 2.5 EL tall at x 74.6. The ghost hops in, catches its shoe on the stalk and topples flat (the prologue's topple), legs kicking. On Ta!, Elof dives: a 0.45 s belly-flop, arms forward, a puff of grass and a "hupp". The ghost squeaks (a high creak), scrambles up, spills the five sweets out of the bag in an arc, and hops on. Elof sits up with a dandelion clock on his head that puffs its seeds. Without Ta! it gets up by itself, as now | View code (poses); props (the dandelion); audio (squeak) | M | 3 |
| 9 | The lawn, x 77–129 (robot 25.2 to 44.7 s) | Ghost and family. Nothing happens in the story here. Kapitel 1 has no freeze joke at all, although the tone map wants "the freeze jokes" in the prologue and Gården (§3.7) and rule 2 is taught only in the prologue | Mamma's sighting at the clothes line, x 106–112. Her boots and her white mug with the red heart come along the big path, and she stops and looks down at the lawn. The ghost, mid-hop to the perch at x 108.6, freezes and topples flat, as in the prologue, and lies still while she looks (3 s). She crouches, sees Elof and says "Heja Elof!" (10), takes a sip and walks on. The ghost scrambles up and hops on. Elof keeps control throughout | Chapter data (a sighting; `freeze` on the perch); view code (reuses the topple); `sv.ts` (`hejaElof`) | M | 3 |
| 10 | Memory, perches 21–22 (`garden.ts:363–365`; `main.ts:813–816`) | Mystery, lore. The ghost hops away when Elof reaches x 141 (timeline 49.8 s). So the memory grows from the shaving, not from the ghost's bubble (plan §2.4 rule 1), and the ghost is 11 EL away while it plays | Move perch 21 to (146.2, 3.3), with `until: 'memory'` and `thought: { picture: 'smudge' }`. The ghost stands beside the glowing curl and looks down at it while Elof solves the curls. The memory grows from its bubble; afterwards it looks at him for 1 s and hops to the birch. Perches are not saved (`sim.ts:340–344` starts at the first one ahead), so this is safe | Chapter data | S | 3 |
| 11 | Memory 1's pictures (`memory.ts:55–58`) | Lore, emotion. The plan's memory is set at night; this one is not. Nothing says "the first one", and it does not echo the prologue's carving. In the third picture the fringe reads as a gold crown. Little Elof never hugs the figure. It plays in silence: `main.ts:818` sends the sound to sleep, but plan §5.8 says "a memory gets a solo fiddle" | Four pictures of 2.4 s (9.6 s in all):<br>(a) A night kitchen: a dark window with a moon, a lamp's pool of light on the table, and Pappa's shelf on the wall, empty.<br>(b) Pappa at the table with the red-handled knife and a plaster on his thumb, a phone propped against a jar, and little Elof in striped light-blue pyjamas with his chin on the table's edge.<br>(c) Pappa blows the last shavings off the little figure, the gesture that opens the prologue, and holds it out.<br>(d) Little Elof hugs it, eyes closed, his fringe falling over his forehead.<br>Add a `memory` sound cue: the polska's first phrase on a slow solo pluck. It turns the game's music down instead of stopping it | `memory.ts` (cut-outs, which a cloud session can draw); audio; `main.ts`. Animated final art needs Olov's computer, and Pappa reads it first (question 1) | M | 3 |
| 12 | After the memory (`story-context.ts:53`; `sv.ts:126`) | Emotion, words. Nothing reacts to the memory, and the purpose line becomes "Följ spöket mot Moa." before Moa has been seen | When the memory has gone back into its bubble, tiny Elof turns and looks back at the house (a 1.2 s pose, no hold). Bubble, Elof: "Det där var ju jag … och Pappa!" (31). The ghost, now beside him (row 10), knocks once slowly and hops off. Change `gardenMemory` to "Följ spöket över gräsmattan." | A beat `on: 'memory'` (bubbles already wait for a memory, `main.ts:885`); `sv.ts` | S | 3 |
| 13 | The stomp, x 155.6 (`garden.ts:365, 373`) | Cause and effect. The line is triggered by position alone. The ghost does not juggle a candy (§3.4), there is no root (flat lawn; visual audit garden row 13), and Elof does not stomp (shot 03) | Give perch 22 `act: 'juggle'`. On a root hump (visual audit row 13), the ghost tosses one of the trail's sweets over its head and catches it, faster as he comes near. At x 155.6 Elof stamps with the existing line: fists down, one foot up and down, a thud and a puff of grass (0.5 s). The ghost starts (a 0.3 hop), tucks the sweet into the bag and hops to the root hole | `types.ts` and view code (`act`); audio (thud); the root needs Blender | M | 2 |
| 14 | Moa's first line (`sv.ts:244`; `garden.ts:374`) | Words, logic. She sounds surprised, but in the prologue she stands in the shot where he shrinks (`prologue-stage.ts:62–68`) and calls "En stjärna föll ur påsen!" (`ends.ts:97`) | "Där är du ju, lillebror!" (24): relief and joy, never a search party (§2.3) | `sv.ts` | S | 3 |
| 15 | Moa's entrance (`view.ts:500–508`; `family-rehearsal.ts:21`) | Family, staging. A 4 EL box figure stands at x 166 from the start, sharp and whole, before she speaks (shots 04–05). Plan §2.3 asks for her dress and fingers first, then her face, softly out of focus, rising over at least 1.5 s | Keep Moa out of the picture until Elof passes x 158. Then her sneakers and dress hem step in at the top right (z −2), and she kneels over 1.5 s: her fingertips on the grass first, then her face lowering into the top 40% of the picture, out of focus (depth blur on High, a pre-blurred card on Low). After that, the shared shot as now | View code (a staged kneel for the stand-in; the private model on the site); a camera zone from 156 to 166 with a lift. Final acting needs Olov's computer | M | 3 |
| 16 | The root hole, x 161.2–163.4 (`garden.ts:366–367`; `view.ts:935–941`) | Rule 8. The ghost shrinks to nothing on flat grass at the moment Moa speaks. There is no hand, no hole and no laugh: the rule is told only in the pause recap (`sv.ts:127`) | Build the root arch with its 0.9 EL hole at x 163.4 (visual audit row 13). From x 161.2:<br>0–0.6 s: Moa's hand swoops down at the ghost, gently, as if catching a butterfly.<br>0.6–1.0 s: the ghost darts into the hole with the bag.<br>1.0–1.8 s: her fingertips bump the arch, wiggle and can't get in; a muffled double knock sounds from inside.<br>1.8–2.5 s: Moa laughs (her babble, rising) and sits back. Bubble, Moa: "Det smet in under roten!" (24).<br>A `later` hold of 2.5 s keeps Elof watching | Chapter data (`later`, a beat); view code (the swoop; the ghost goes into the hole instead of shrinking); the arch needs Blender | M | 3 |
| 17 | "Planet väntar" with no plane (`sv.ts:245`; `view.ts:749–760, 1671–1680`; `props.ts:352–375`) | Words, staging. The plane has no size until he rides it; the only sign of it is a picture on a sign (shot 05). In the plan, Moa folds it from her drawing and throws it | When `moa` is set, Moa's hands fold a sheet in three steps (2 s, paper sounds) and set the plane on the grass at (168, 0.3), nose up 15° (visual audit row 18). "Kliv på planet" is offered at the plane itself, not at a sign. On boarding, her hand lifts the plane with him and throws it (the ending, steps 1–2). Change her line to "Kliv på när du vill!" (20) | View code (the plane shown from `moa`, the throw); chapter data (the boarding spot at x 168, the ride starting at her hand's height); `sv.ts`; the plane needs Blender | M | 3 |
| 18 | Moa's bubbles in flight (timeline 56.0–57.3 s; `hud.ts:40–41, 123–149`; shot 06) | Pacing, words. Three Moa lines queue within 0.9 s, and they last 4.0, 4.2 and 4.1 s. A child who boards within about 8 s of calling her sees "Planet väntar…" in flight and "Min lövteckning föll under spånbron!" at the landing: an errand he can no longer run | (a) Add a boarding beat, `{ on: 'plane:board', who: 'moa', line: 'gardenOff', priority: true }`: "Flyg, lillebror! Vi ses snart!" (30). Being a priority beat, it clears the stale lines.<br>(b) Ask for the drawing only if he lingers: `later: [{ flag: 'garden:ask', after: 'moa', seconds: 5 }]`, with the `garden:pocket` beat on `garden:ask`.<br>(c) Add a Beat field `until`: a beat is not told once that flag is set (`sim.ts:619–628`); use it with `plane:board` | Chapter data; `types.ts`; `sim.ts`; `sv.ts`; the order in `tests/robot/garden.test.ts:21` | S | 3 |
| 19 | The pocket loop's words and reward (`sv.ts:246`; `garden.ts:201`) | Words, family. "Spånbron" is the player's name for the curl he pushed; a giant would not call it that. And the returned drawing changes nothing except a keepsake hanging at the height of a sign (167.2, 1.7) | Change the line to "Min lövteckning blåste in under spånen!" (39). When the drawing comes back, Moa folds the plane from it (plan §3.4: "folds a paper plane from her drawing"), so the crayon leaf flies on its wing. Without the detour she folds a blank page | `sv.ts`; view code (the plane's picture chosen by the flag); a canvas drawing | S | 2 |
| 20 | The flight (`garden.ts:58, 328, 392`; 166 to 206, 7 s) | Family, emotion. There is no throw and no look back, and Moa is not seen again | At the top of the arc (t 0.45–0.6), the camera eases out to zoom 2.6 and leans back to the left. The house, the deck, the birch and the shavings fill one picture, with Moa small on the lawn, waving both arms. Geese (`life: geese`) cross beside the plane, and Moa's motif plays. A tap makes Elof wave and Moa hop | `types.ts` (a camera zone keyed to a ride's progress); view code; the chapter's `life` | M | 3 |
| 21 | The ghost after the root hole (`garden.ts:47, 367`) | Ghost, the ending. The last perch is the root hole, so the last 45 EL have no ghost. The plan's "the ghost slips in under the spruces" is not built | Add a perch at the first spruce (x 209.5) with `after: 'plane:board'`. 0.5 s after the landing, a mound by the spruce roots bulges and the ghost pops out with the bag: the root hole was a tunnel under the hedge. It sees Elof already there, because Moa's plane was faster, freezes and does a double-take: two quick turns and a high creak. It hops back two steps, drops one sweet at the edge of the shade, looks back once with the smudge (1 s), and slips in under the spruces. A `later` hold of at most 2 s covers its pop-up | Chapter data; view code (popping out); the root with its hole needs Blender (visual audit row 16) | M | 3 |
| 22 | The end (`garden.ts:94, 157–158`; `main.ts:889`; timeline 64.3–65.5 s) | Ending, pacing. The card comes about 2.6 s after the landing, and the last picture is grass in front of a 12 EL brown wall (shot 06; visual audit row 16) | Extend the ground to x 228 and move `goalX` to 220, appending candy only. The ending plays while he walks (next section): the ghost's exit (row 21), the look back at the family (row 23), the forest's music under the garden's last phrase, then his step into the shade. With the hold at the ghost's pop-up, plain running stays under the pace test's 5 s (`pace.test.ts:22`) | Chapter data; music | M | 3 |
| 23 | The family at the end (`sv.ts:202`, which only tells it on the card) | Family, the ending. "De stora följer stigen runt" is never shown | In a camera zone from x 212 to 216 (`lead: -6, zoom: 2`), the camera looks back over the hedge. The gate opens and the family comes along the big path: Pappa's cap first, Mamma's mug, Bertil running ahead, Moa with her drawing. They stop and wave, and their four motifs sound together as one chord. Elof's arm goes up as he enters the zone, and again on a tap | Chapter data (a sighting, a camera zone); view code; audio | M | 3 |
| 24 | The card on a phone held sideways (`hud.ts:182`; shot 07) | The ending. Putting focus on "Nästa kapitel" scrolls the panel, so at 844×390 the title, the candy rows and the top of the map are out of view | Set `scrollTop = 0` and use `focus({ preventScroll: true })`. In landscape, use two columns: the title, rows and map on the left, the handoff and buttons on the right. Moa's crayon draws the line from the garden to the forest on the map as the card opens (`narrative-craft.md`, "A chapter close in six beats") | `hud.ts`; `ui.css`; `map.ts` | S | 2 |
| 25 | The purpose line after the landing (`story-context.ts:41`; shot 06) | Words. At the forest's edge it still says "Flyg med Moas pappersplan." | Once `plane:board` is set and x is at least 206, show the purpose "Följ spöket in i skogen.", with the recap "Moas plan var snabbare än spöket. Det smet in i skogen." | `story-context.ts`; `sv.ts` | S | 1 |

**Captions.** The game has 45 lines now (`sv.lines`). This proposal adds four (`hejaElof`, Elof's line after the
memory, `gardenRoot`, `gardenOff`) and rewrites three (`tiny`, `gardenReady`, `gardenPocket`). That makes 49 of about
60. On the main path the garden shows seven bubbles instead of six, two of which are repeats now, and three optional
ones in the pocket loop.

## The narrative thread for Gården

| Part | Proposal |
| --- | --- |
| The emotional question | "Jag är pytteliten. Klarar jag det här, och är jag ensam?" At the forest's edge the answer is: he is small and brave, the family was near all along, and Moa's help got him there before the ghost. |
| Elof's arc | Cross at the start and at the stomp ("Ge tillbaka mitt godis!"). A first flicker of curiosity after memory 1 ("Det där var ju jag … och Pappa!"). Proud, and a little cheeky, at the end, when the ghost finds him already waiting. |
| The ghost's moments | **From the prologue:** it showed the cause (it woke, looked at the empty place on the shelf, took the bag) and the freeze rule.<br>**In Gården it shows character and one oddity**, in order: it teases on the deck (row 4); it comes back to show him the hook, smudge 1 (rows 5–6); it tilts at his first glitter bubble (row 7); it trips at the dandelion (row 8); it freezes when Mamma looks (row 9); it waits by the glowing shaving, and memory 1 grows from its bubble, smudge 2 (row 10); it juggles his sweet and runs from the stomp (row 13); it hides from Moa's hand (row 16); it is beaten to the forest, looks back, smudge 3 (row 21).<br>**What the mystery adds here is one thing only:** "it thinks about something, and it showed me a hook". Kapitel 2 turns the same outline into a sharp shape at the vittra door. |
| The family's moments | **Worry:** Pappa's hand at the start (row 1).<br>**Help from a distance:** Bertil's finger at the marble (row 3); Mamma's "Heja Elof!", and her look, which freezes the ghost (row 9).<br>**Help in person:** Moa finds him, laughs at the root, folds and throws the plane (rows 14–17).<br>**Pride:** Moa waving from the lawn under the flight, and all four at the gate at the end (rows 20, 23).<br>**While playing:** every sighting answers his wave (gameplay 1). |
| The lore piece | Memory 1 is the first figure ever made: night, an empty shelf, a beginner's plaster, the same table and the same gesture as the prologue's first picture (row 11). It plants the empty first place on the shelf without explaining it. As an option, Pappa's chopping block with the red-handled knife stands beside the shavings (visual audit garden row 15), and is seen again in the epilogue. |
| The set piece | Moa's plane: folded in front of him (from her drawing, if he brought it back), thrown from her hand, then a look back over the whole garden at the top of the arc with Moa waving, and a landing that beats the ghost to the forest (rows 17, 19, 20, 21). |
| The question carried on | The ghost's last look back, with its smudge: "Vad tänker spöket på?" No words are needed; Kapitel 2's first clear shape answers it a little. |

**The ending, shot by shot.** About 30 s. T is the moment he presses "Kliv på planet". The player keeps control
throughout, except for the 2 s hold when the ghost pops up.

1. **T+0–2 s.** Moa's hands and knees fill the top of the picture, with Elof on the plane in her palm. Her hand rises
   with him to her shoulder, and the camera tilts up with it. Her motif (0, 7, 5) plays. Bubble, with priority, which
   clears any stale lines: "Flyg, lillebror! Vi ses snart!"
2. **T+2–3 s.** The throw. Her arm sweeps forward with a paper whoosh, and the plane leaves her fingertips. The ride
   starts at her hand's height.
3. **T+3–6.5 s.** The climb over the lawn through the arcs of candy, with the garden's tune at full pizzicato.
4. **T+6.5–8.5 s.** The top of the arc. The camera eases out to zoom 2.6 and leans back to the left: the red house, the
   deck, the birch, the shavings, and Moa small on the lawn, waving both arms. Geese cross in a V beside the plane. A
   tap makes Elof wave back and Moa hop.
5. **T+8.5–10 s.** Down over the hedge, the camera back on him at zoom 1.5, the spruces' shade ahead. Faint on the
   horizon beyond their tops stands the mountain with the old pine.
6. **T+10–11 s.** Landing in the moss at x 206 in a puff of needles. The plane slides and stops nose-down, and stays
   there.
7. **T+11–13 s** (held, 2 s). A mound at the first spruce's roots bulges, and the ghost pops out of the root tunnel
   with the bag. It sees him, freezes, does a double-take (two quick turns, a high creak) and hops back two steps.
8. **T+13–16 s.** Play goes on. The ghost scampers to the roots and drops one sweet at the edge of the shade: the trail
   goes on. There it stops and looks back at him; its smudge shows for a second with a soft "plopp", and it slips in
   under the spruces. The garden's tune plays its last phrase.
9. **T+16–21 s.** As he walks on (x 212–216), the camera leans back to the left. Beyond the hedge the gate opens, and
   the family comes along the big path: Pappa's cap first, Mamma's mug, Bertil running ahead, Moa with her drawing.
   They stop and wave, and their four motifs sound together as one chord. Elof's arm goes up as he enters the zone.
10. **T+21–27 s.** The camera turns forward: dark trunks, and one warm shaft of light on the dropped sweet. The forest's
    low drone comes in under the garden's last pluck.
11. **T+27–29 s.** He steps into the shade at x 220, the new goal. The picture holds 1.5 s on the forest's edge, with
    the sweet glinting, and fades.
12. **T+29–30 s.** The card opens at its top. Moa's crayon draws the dotted line from Hemma into the forest on her map;
    then come "Kapitel 1 klart!", the candy rows and the handoff.

## Gameplay that tells the story

1. **The wave that is answered** (Firewatch's radio as a gesture; `narrative-craft.md`, "Put the small talk in the
   player's hands"). Tapping Elof already makes him wave. In Gården, each sighting answers within 0.4 s:
   - at the start, Pappa's hand gives a thumbs-up;
   - under the deck, Bertil's fingertip wiggles;
   - at the clothes line, Mamma lifts her mug;
   - under the flight, Moa waves both arms;
   - at the gate, all four wave.

   The ghost ignores the wave in Gården; it will knock back after the eddy in Kapitel 2. This is how the family stays
   with him while he plays, without stopping him. To build it, the pointing code passes a wave counter to the view,
   and the nearest sighting within 12 EL answers.
2. **The freeze, played** (row 9). While Mamma looks, the ghost lies toppled on the lawn, and Elof can walk right up
   to it. Ta! is not offered, because it is only a carving now. When she turns away, it scrambles up, bumps into him,
   squeaks and hops on. The child learns rule 2 by trying it, rather than by watching it twice in the prologue.
3. **The daring swing, watched** (rows 5 and 7). Over the drain gully the ghost waits at the far edge, under the hook
   it showed him, so the swing is a leap towards the thief. If he misses, the glitter bubble catches him and the ghost
   tilts: the first sign that it cares. The verb (letting go over a gap) is the feeling (daring), the signature beat
   that `narrative-craft.md` proposes for Gården.
4. **Ta! as a dive** (row 8). The button does what the boy feels, "grab it!": a belly-flop that misses. The miss is
   funny, and the spilled sweets are the reward for trying.
5. **The drawing becomes the plane** (row 19). If he brings back Moa's drawing, she folds the plane from it, and the
   crayon leaf flies with him. The optional kindness changes the set piece, and the help goes both ways.

## The five to do first

1. **Moa's scene in the right words and order** (rows 14 and 18, and the new line in row 17): "Där är du ju,
   lillebror!", a boarding line with priority that clears stale bubbles, and the drawing asked for only if he lingers.
   S. It mends a contradiction and a bubble that shows in the wrong place.
2. **The root hole and a plane he can see** (rows 16 and 17): Moa's hand, the ghost darting into the root, her laugh,
   and the plane folded and thrown from her hand. M, plus the root and the plane in Blender (visual audit rows 13
   and 18).
3. **An ending at the forest's edge** (rows 21, 22 and 23): the ghost pops up, does its double-take and slips under the
   spruces; the family waves at the gate; then the step into the shade. M to L. It answers Olov's "endings too sudden
   and flat" for this chapter.
4. **The ghost at the memory, the smudge as the first figure, and Elof's reaction** (rows 6, 10 and 12). S, all chapter
   data, a canvas drawing and one line.
5. **No repeated lines at the start, and the big path with Mamma's freeze joke** (rows 1, 2 and 9). M. It keeps the
   family present between the deck and Moa, and teaches rule 2 again in play.

## Questions for Olov

1. **Memory 1's details are personal, and they are the plan's invention** (plan §3.5): Pappa learning from a video at
   night, a plaster on his thumb, little Elof in striped pyjamas, the shelf still empty. May Pappa read this
   storyboard before it is drawn (the default in HANDOVER's question 1)? And does his real first trägubbe still exist?
2. **Pappa's workshop.** Should the garden show the family's real workshop, which is a likeness and so needs the photos
   and Olov's computer, or a plain shed with a chopping block, which a cloud session can build? The default is the
   plain shed.
3. **One new piece of staging, inside the canon.** The root hole is a tunnel under the hedge, and Moa's plane beats the
   ghost to the forest. It gives the plane a reason (speed) and the chapter a comic last beat with the ghost. Plan
   §3.4's "darts into a root hole" and "slips in under the spruces" both stay. The default is yes.
