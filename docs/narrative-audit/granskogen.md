# Granskogen (Kapitel 2): narrative and gameplay audit

5 October 2026. Chapter id `granskog`, `src/content/chapters/granskog.ts`. Measured with the robot timeline harness
(60 Hz, `?dev` data; the robot reaches the goal in 76.2 game seconds), plus a second run of the same harness that
logged the ghost's thought card (`thoughtAt`, `src/render/ghost-thought.ts:12`) and the ghost's position every quarter
second near the end; both test copies were deleted. Eight pictures of the running game at 844×390, Low, stand-ins
(scratchpad `audit-granskogen/`, numbered 1 to 7 below). "Robot s" are game seconds; "Elof (est.)" is an estimate
at the plan's pace (Granskogen 15–20 min on the main path, plan §4.9), with rides, runs and the memory at their real
length. It is not a measurement.

**Verdict.** A seven-year-old walks into a lovely cathedral of spruces and plays a good obstacle course: he picks a
lingonberry for a bird, pulls a twig off an ant road and rides the ants up their hill, runs from rolling cones, calls
Pappa and is fired across a ravine by a seesaw and a heavy cone, nearly catches the ghost on a log, watches a
seven-second sepia memory of little Elof sharing raspberry jellies with a small figure on a stump, sails Bertil's cap
across a pool and pulls the ghost out of an eddy. What he understands of the story he mostly reads. The ghost "gives
his candy away", but nobody sees it do so. It "thanked him", but a plain sweet appears while the ghost leaps away. It
"waits" now, yet it still hops off as he comes and has vanished when he reaches the goal. The jay is a flag, not a
friend. Pappa's hands never carve. Bertil cheers from outside the picture. The eddy is calm water with the ghost
swaying in it as it sways everywhere. The emotional hinge of the whole game, from the rescue to the card, lasts about
seven seconds and ends in front of an empty end wall. What is missing most: **a rescue the child performs with his
hands and sees answered** (the ghost's fear, a haul, a thank-you given by hand) and **a coda in which the two walk
together for the first time and look out at the mountain**. Next comes **the vittra door showing the giving that
Elof's line describes**.

## 2. As it plays now

| Robot s | Elof (est.) | x | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0.0 | 0:00 | 1 | Starts on the forest floor; the ghost waits at x 6 (`granskog.ts:305`). No image of how he got here (Moa's plane), no title or hour. | "The chase goes on." |
| 0.5–8.4 | 0:00–2:00 | 2–27 | Candy over a root and the giant cone; the ghost hops ahead (perches 1–5); optional boughs and the forest's first ring. | Chase; wonder at the scale. |
| 10.0–11.6 | 2:00–3:00 | 32–37 | *Plocka* a lingonberry (x 33), *Ge* it to the jay sitting at x 38 (`:229–230`); it hops for 1.4 s and stays put (`props.ts:304–334`). The ghost watches from the high root (x 45.6). | "I gave the bird a berry." It never tried to pinch a sweet, so there is no "instead". |
| 13.5–17.7 | 3:00–3:45 | 43.5–46 | The beard lichen unrolls by itself at x 43.7, 5.7 EL from the jay (`:171`, `view.ts:1766`); he climbs it. | The lichen appeared; the jay showed nothing. |
| 18.2–25.1 | 3:45–5:20 | 48–61.6 | The ghost hops to the vittra door (64, 10). *Dra* the twig off the ants' road; *Åk med myrorna*, a 3 s lift (`:60`, `:231`). | The ants carry him; they never looked blocked. |
| 24.3–25.3 | 5:20 | 61.1–61.8 | As he rides up, the ghost leaves the door (`near: 3`, `:314`) and hops down; a second later "Spöket ger bort mitt godis!?" (`:337`). A trail sweet floats at the door (`:384`). Pictures 1–2. | Nothing given is seen. The line states what the picture lacks. |
| 25.3–27.4 | 5:20–6:30 | 61.9–66.3 | Optional: pick a berry and leave it at the door, "Ett lingon till er också." (the robot does it). | His own gift: clear. |
| 28.4–39.6 | 6:30–9:00 | 69–103 | E2: passing x 70.4 starts the cones (`:236`, `touch`, no visible cone); the ghost hops ahead with its ordinary knock (`cues.ts:209`). | Exciting. No story. |
| 40.9–50.2 | 9:00–12:00 | 106–113 | *Ropa på Pappa*: his 5 EL box figure at x 108.2 hops with raised arms (`view.ts:985–1001`). The seesaw has stood there since the start (`props.ts:377–383`; picture 3). Push the big cone onto the plank (the optional small-cone trial ends on "Oj! Nästan. Den större väger mer."), *Ställ dig här*, a 15 EL flight. | Pappa is there and glad. That his hands made the seesaw is not shown. |
| 53.6 | 12:30 | 133 | Near-catch on the log: *Ta!*, and four sweets drop (`:325`, `:405–408`). | Comic. |
| 56.5 | 13:00 (+7 s) | 143 | Memory 2 grows from the ghost waiting at x 147.6 (`main.ts:815`): three sepia cut-outs, 7.2 s (`memory.ts:60–65`, `:107`). The place itself is open forest floor (picture 4). | "Little me shared sweets with that figure." No stump here. |
| 58.5 | 13:30 | 150 | The ghost crosses the pool in one 27.5 EL hop of 1.4 s (`:328–330`, `sim.ts:676`). | It can leap anything. |
| 59.6–67.6 | 13:45–14:00 | 154.6–177.4 | *Ropa på Bertil*; an 8 s cap ride (`:63`); "Heja lillebror!" at x 166 (`:339`), while Bertil stands 11 EL behind, outside a picture that spans about x 162–176 (`camera-intent.ts:28`, zoom 1.3). | Bertil's cap is a boat. Who cheered is off screen. |
| 66.7–67.8 | 14:00 | 176.5 | As the cap lands, the ghost hops from the bank into the eddy in an ordinary arc (measured: from (180.5, −8) up to −7.3, down to (186.8, −9)). | It jumped in. |
| 67.8–70.2 | 14:00–15:00 | 178–183.6 | Purpose: "Dra upp spöket ur virveln!" The ghost stands upright on a leaf in calm water, swaying and tapping a foot as at every perch (`view.ts:932–950`; picture 5). *Dra* from the stone. | Only the words say it is stuck or afraid. |
| 70.2–71.8 | 15:00 (+2 s) | 183.6 | The leaf rises 1.5 EL alone in 0.6 s while the ghost waits at y −9 (`sim.ts:664`, `:781`; `constants.ts:88`); then it leaps from the water to x 197. "Spöket tackade mig!" in the same frame (`:340`). A plain trail sweet appears 0.6 EL in front of him (`:424`). | Thanks in words only. |
| 72.6–76.2 | 15:00 (+2 to +6 s) | 191.5–204 | The mountain thought for 1.1 s at x 197 and 1.0 s at x 205.5: 2.2 s in all (picture 6). He reaches goalX 204; the ghost, perched beyond the goal, shrinks away at once. | "A mountain", glimpsed. |
| 77.6 | 15:07 | 207.8 | The card (picture 7). Under it, the last image: the end wall at x 208 and no ghost (picture 7a). | "Kapitel 2 klart!" |

- **Longest stretches with no story.** From the start to the vittra line: 25 robot s, about 5.5 min for Elof; the
  story is the chase and an unstaged jay. From the vittra door to the log: 25.8–53.6 robot s, about 7 min
  (E2 and the seesaw). The ghost only flees, and Pappa's call is the one family moment, without a word.
- **The family.** No figure is in the picture from the start until Pappa (stand at x 108.2) comes into view near
  x 100 (the slope's camera zone shows about 15.7 EL at 844×390, `granskog.ts:356`; the robot passes there at about
  38 s, Elof at about 8.5 min), and none from the cap's landing to the end. The chapter's one family bubble, "Heja
  lillebror!", is spoken off screen.
- **The ghost's thoughts.** There is one picture on the main route, 2.2 s in the whole chapter, and only after the
  rescue. The small figure (plan §3.4, "the ghost's bubble shows a shape now") exists only as an optional keepsake
  from the vittror (`granskog.ts:70`).
- **How it ends.** Rescue at 70.2 s, goal at 76.2 s, card at 77.6 s. Running from the stone to goalX covers 20.4 EL
  at 3.5 EL/s (`constants.ts:9`), so a running child gets the same 6 s, and a walking one about 17 s. The last
  image is Elof under a big candy before the end wall (`granskog.ts:141–143`). The ghost's last perch (x 205.5,
  `:334`) lies past goalX (`:90`), so it is `gone` and shrinks to nothing the moment he arrives (`sim.ts:668–672`,
  `view.ts:939`). At 844×390 the card opens scrolled to *Nästa kapitel*. It shows Moa's map; "Spöket väntar på mig /
  Jag hjälpte det ur vattnet. Nu visar det vägen mot myren." (`sv.ts:204`); the code TUVA SPÅNG TRANA; *Spela
  igen*. The title and the candy rows are above the fold.

## 3. What is good, and stays

- **The beats come in the plan's order** (§3.4): P6, P5, the vittra door, E2, P8, the near-catch, memory 2, S3,
  P10 (`granskog.ts:3–20`; timeline).
- **Kindness opens the way, three times.**
  - The berry brings the lichen (`:171`).
  - The cleared twig brings the ant lift (`:231`).
  - The rescued ghost's leaf becomes Elof's bridge over the eddy (`:266–267`). Keep this one: it is the chapter's
    best cause and effect.
- **The weight puzzle.** He may try the small cone or the heavy one first, and he deduces the rule himself: "Oj!
  Nästan. Den större väger mer." (`sv.ts:252`; `granskog.ts:68`, `:269`).
- **The optional vittra return.** His own gift at the door, and a keepsake on a real return visit, never required
  (`:233–234`, `:69–70`; `tests/sim/vittra.test.ts`).
- **The purpose line is gated by what he has done** and never claims a discovery he has not made
  (`story-context.ts:57–68`, `sv.ts:134–146`). Where its words promise more than the picture shows (rows 1, 4 and
  12), the picture should catch up, not the words.
- **Memory 2's three cut-outs are clear** and plant the finale's party: the figure on a stump with a raspberry jelly
  in its lap, little Elof with his own, and Pappa photographing (`memory.ts:60–65`).
- **The mountain thought** is a clean silhouette, gated after the rescue and shown only at settled stops
  (`ghost-thought.ts:12–19`, `:42–45`).
- **The log near-catch** is a good comic beat with a reward.
- **Smaller things that work:** the cap's album photo (`photos.ts:12`); the call and answer at help points (Elof's
  two notes, then that person's three: `cues.ts:87–88`, `:211`); and the moose crossing far off near the end, one
  visit in three (`granskog.ts:93`).

## 4. Findings

| # | Where | What is wrong | The fix, concretely | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Vittra door, x 64; perch `granskog.ts:314`, beat `:337`, door `props.ts:281–292` | **Cause and effect, mystery.** The giving that Elof's line names is never shown. The ghost stands by the door, places nothing (the red ball on the step appears only for Elof's optional berry, flag `vittra:gift`) and hops away as he tops the lift: it leaves at 24.3 s, the line comes at 25.3 s. At phone size the door reads as a green arch of roots (pictures 1–2). | During the 3 s ant lift he sees it from below: the ghost kneels at the door, takes a red raspberry jelly out of the striped bag, sets it on the step with both hands, pats it and stands back looking at the door. It waits until he is on the hilltop (`near: 1.5`), then hops down. The bubble is set off by the placing (`on: 'vittra:placed'`), not by x 61.8. Elof stops, arms out and palms up (a "huh?" pose). The jelly stays drawn on the step all chapter: not collectible, and clear of the kit's mushrooms (plan §3.7). Two soft knocks of wood on the door; a warm light in its window makes it read as a door. | Chapter data (perch, beat, decor jelly with `after`); view code (placing gesture, door light, Elof's pose on the stand-in); the kit's existing geléhallon (`art/blender/candy.py:406`). | M | 3 |
| 2 | `granskog.ts:384` (trail sweets at x 62.6 and 64.6, y 10.45; door at 64.4) | **Gameplay contradicts the story.** Right after "Spöket ger bort mitt godis!?", Elof collects a sweet floating on the doorstep, which reads as taking the neighbours' gift back. | Move the sweet at 64.6 to x 63.0 (keep its index), so the step holds only the ghost's jelly; update the Granskogen list fingerprint deliberately (level-design §2: "add, never insert or move" concerns the order). | Chapter data; tests. | S | 2 |
| 3 | `granskog.ts:70`, `:304–335`; `ghost-thought.ts:23–35` | **The ghost's mystery does not escalate on the main route.** Rule 6 (shapes in Kapitel 2) and §3.4 ("the ghost's bubble shows a shape now: a small figure") are met only by an optional keepsake, drawn as the vittror's paper after a return visit. The first thought most players see is the mountain, after the rescue. | Give the door perch a thought: the same blurred cap-and-head shape, drawn as a thought cloud instead of paper. It shows while the ghost places the jelly and while Elof is within 5.5 EL. Keep the vittror's keepsake as the clearer bonus picture. | Chapter data; `ghost-thought.ts` (a cloud variant); change `tests/unit/ghost-thought.test.ts` ("never at the earlier perches") on purpose. | S | 3 |
| 4 | Jay, x 33–44; `granskog.ts:229–230`, `:171`; `props.ts:304–334` | **The friendship is a flag.** The jay sits at x 38 from the first frame and never tries to pinch a sweet (plan §3.4 P6). Given the berry, it hops for 1.4 s and stays at x 38 for good, and the lichen unrolls on its own. The recap "Lavskrikan vill följa med" (`sv.ts:137`) never happens. | As he reaches x 30 the jay swoops off a branch, lands on the trail sweet at x 34 and tugs at its wrapper. *Plocka* a lingonberry, *Ge*: the jay drops the sweet (still his), gulps the berry and fluffs up. It flies to the high root's top and tugs, and the lichen unrolls with its pull. From then on it follows: a perch 3–5 EL ahead at each big candy, hops beside him when he stands still, flies ahead when he runs (the follower behaviour, `types.ts:560`, generalised). At the eddy it lands on the stone and rasps at the ghost. A synthesised jay's rasp. | Chapter data (a companion); view code; jay poses in code first, Blender polish later. | M | 3 |
| 5 | `main.ts:115`, `shell.ts:54–55`, `sv.ts:41`; `props.ts:682` | **Gameplay contradicts the story.** The bird is the helper portrait from the chapter's first frame, so the jay helps before it is befriended. A call brings a new bird flying out of Elof's own position, not the friend he made. | Keep the ghost's portrait (as in Gården) until `jay`. When `jay` is set, the portrait flips to the bird with a small pop and its rasp, and a tap then brings the companion jay from where it perches. | Chapter data (`helper` with an `after`, a small format addition); UI and view code. | S | 2 |
| 6 | E2, x 70–103; `granskog.ts:236`, `:284–287`, `:316–320` | **E2 tells nothing.** The loose cone is not drawn (a glint only); passing x 70.4 sets it off; the ghost hops ahead with its ordinary knock. Nothing shows that the two of them share the trouble. | Draw a cone teetering on the slope's lip. As he brushes it, it tips (his existing gasp, `cues.ts:166`) and rolls past the ghost at x 76, which jumps with a squeak (a fast double creak) and runs, clutching the bag. When a cone bowls Elof into the glitter bubble, the ghost stops, turns and tilts its head (Kapitel 1's look, plan §3.3 rule 3) until he is up again: the first sign that it cares. At the slope's foot it sits on the bag for one breath, then hops on. | Chapter data (look); view code; one sound. | S–M | 2 |
| 7 | Ant road, x 52–61; `props.ts:336–350`, `granskog.ts:231`, `:263` | **The need is not shown.** Six ants bob in place whether or not the twig blocks their road, so "clear the road, and the ants carry you" (plan §4.7 P5; §3.6 "ants with a blocked road") becomes a free lift. | A column of ants runs along the road, piles up at the twig and turns back, antennae waving. After *Dra* it streams through; three ants peel off to Elof and the *Åk med myrorna* glint appears over them. At the top the column waves its antennae as he steps off. | View code (instanced ants on a path, driven by flags). | M | 2 |
| 8 | Seesaw, x 106–117; `granskog.ts:237`, `:239`; `props.ts:377–383` | **Family and lore.** The seesaw stands there before he calls; calling Pappa only makes his figure hop. The one place where Pappa's craft helps Elof (plan §3.4 P8, "his hands carve a little seesaw") is not shown, so his carving and the lore of his figures never meet in this chapter. | Before the call there is only a stone and a dry stick. On *Ropa på Pappa* his answer sounds and his boots and knee come into the picture. His hand with the red-handled knife takes the stick and makes three strokes, each away from his body (plan §3.7); pale curls of shaving fall around Elof, who can walk among them (input stays live, 4–5 s). The hand lays the plank across the stone and gives a thumbs-up. Bubble (Pappa): "En gungbräda? Det fixar jag!" (*Fixar allt* is on his sheet, plan §2.3). The camera is the existing family framing (`view.ts:839–847`), raised to include the hand. | Chapter data (plank gated on `seesaw`; beat); view code (a stand-in hand and knife); `sv.ts`. Pappa's final hand: Blender on Olov's computer (private pack). | M | 3 |
| 9 | Launch; `granskog.ts:61`, `:239`, `:265`; `props.ts:379–381` | **Cause and effect; family.** The heavy cone's last stop (x 114.6) is the plank's pivot (centre 114.5), and stepping onto the low end launches him. Nothing visible causes the flight, and Pappa takes no part in the moment that is his. | The cone's last stop is at Pappa's hand at the plank's foot (plan: "to Pappa's hand"). *Ställ dig här* on the low end. Pappa's hand lifts the cone over the high end and the button reads "Nu, Pappa!". Elof presses it, the hand lets go, BOING, and he flies. Pappa's open palm follows the arc under him (worry shown as care) and gives a thumbs-up when he lands. The small cone does the same with a short hop. | Chapter data (a mover lifted by a helper's hands, `on`, `types.ts:91`; stops); view code; `sv.ts` (verb). | M | 2 |
| 10 | Ghost at x 107 and 116.6 (`granskog.ts:321–322`); `view.ts:932–950` | **World rule 2 is broken, and the lore moment is missed.** The ghost stands 8 EL from Pappa, swaying and tapping its foot in full view of a grown-up (plan §3.3 rule 2, taught twice in the prologue). The chapter also misses its one chance for the ghost to meet Pappa's hands. | While Pappa faces the ravine, the ghost stands stiff and tipped like a carving (the prologue's freeze). When he bends to carve, it unfreezes, tiptoes two steps closer and watches the knife; its thought cloud shows the small figure, a little clearer than at the door (rule 6: sharper after each help). When his head comes up it snaps stiff again (a laugh). When Elof flies, Pappa watches Elof and the ghost hops across. | View code (a freeze keyed to a family stand's gaze); chapter data (perch thought `after: 'seesaw'`). | M | 3 |
| 11 | Whole chapter; `view.ts:498–509` (family only at sign spots); `sv.ts:185` | **The family bond is felt only at two help points.** No figure, hand or bubble appears for x 1 to about 99 or after the cap; the recap says they are on their way, but nothing shows it. Plan §2.3 "they wave back when he waves" is not built: the family loop answers only its glad flag (`view.ts:987–1001`). | Twice (x about 25 and about 75), far back between the trunks, two soft giant silhouettes, Pappa and Bertil, walk the big path the same way. Tapping Elof (his wave and two-note call) is answered: a family member in the picture waves back with their three notes; one off the picture answers with the notes and a small portrait at the screen edge on their side. | View code (far silhouettes, wave-back); audio exists; HUD. Rehearsal bodies now; private models later (Olov's computer). | M | 2 |
| 12 | Cap ride; `granskog.ts:242`, `:339`; `sv.ts:144` | **Bertil cheers from outside the picture,** and the recap's "går längs stranden" is false: he stays at x 154.6. | On the call his hand sets the cap on the water (0.8 s). During the 8 s ride he walks the far bank, 2 EL behind Elof, sneakers and legs in the picture. At mid-pool he stops with both arms up: "Heja lillebror!". At the landing his hand lifts the cap, shakes off a drop and puts it back on his head: the cap goes on Elof's head on the summit (plan §3.4 Final 7). | View code (the stand follows the ride); chapter data (beat). | M | 2 |
| 13 | Memory 2, x 144; `granskog.ts:241`, `:147–152`; `main.ts:812–816` | **The place does not echo the memory, and the memory does not touch the ghost.** The memory is an autumn walk with a stump at its centre, but it lies on open forest floor: no stump among the landmarks, nor anywhere in `src/` or `art/`. The ghost waits 3.6 EL further on, and after 7.2 s of sepia the place is unchanged. | A low cut spruce stump (about 0.9 EL) at x 144 with the glowing shaving on its top. The ghost waits sitting on the stump with the bag in its lap, as the figure sits with its jelly in picture 2, and its thought cloud shows the small figure; the memory grows from it. When the memory shrinks back, 3 s of free play: the ghost pats the empty half of the stump twice (double knock), looks at it and hops on. | Chapter data (decor stump; a perch at x 144.6, y −7.1); view code; the stump in the public forest kit: Blender. | M | 3 |
| 14 | Pool, x 150–181; `granskog.ts:328–331`; `sim.ts:676` | **The eddy is not an accident, and the helplessness is not believable.** The ghost clears the 20 EL pool in one 1.4 s hop, so it can plainly leap anything, and then hops into the eddy on purpose. | When Bertil sets the cap down, the ghost jumps onto a floating leaf and paddles with one hand: two small boats cross side by side for 8 s, and Bertil cheers for both. Past the landing the current takes the leaf over the tiny fall with a splash, and it begins to turn in the eddy. | Chapter data (travel time and look per perch); sim (hop time per perch); view code (the leaf under it). | M | 3 |
| 15 | Eddy, x 185–188; `granskog.ts:290`, `:331`; `view.ts:932–950` | **The fear does not read.** The eddy is calm water with no fall or swirl (no eddy is drawn anywhere in `src/render`), and the ghost stands upright with its everyday sway and foot tap (picture 5). Plan §3.4 P10's "it is frightened" is carried by the purpose text alone. | Draw the tiny fall (a short white sheet beside the stone) and foam circling round; the leaf turns slowly. The ghost clutches the bag to its body, leans back, trembles (fast, small) and turns its eyes to Elof each time it comes round. A dotted look line from its eyes to him says "help" (`view.ts:1594`, extended to a moving target). Quick wood chatter on the fall, then slow creaks. Once he stands on the stone, the trembling calms to hopeful watching, so a slow child never watches long fear (exciting, never scary). | View code; chapter data (glance from `cap` until `placed:rescue`); audio. | M | 3 |
| 16 | Rescue; `granskog.ts:267`, `:340`, `:424`; `sim.ts:664`, `:781` | **The rescue and the thanks are told, not shown.** On *Dra* the leaf rises alone while the ghost waits at y −9, then the ghost leaps from the water to x 197. "Spöket tackade mig!" fires in that frame. The thanks is a plain wrapped sweet that appears 0.6 EL from him and is collected without notice. | The chapter's set piece. *Dra* becomes a haul of three pulls (stops at −9.3, −8.8, −8.3, −7.8), and the ghost rides the leaf up. After the first pull it grabs the lace with one hand, letting go of the bag with that hand for the first time. Docked, it steps onto the stone, drips, and looks at Elof (a 1 s hold; the music drops out). It hugs the bag, takes out one red raspberry jelly, sets it at his feet with both hands, steps back and double-knocks; then the bubble. *Ta*: the jelly goes into the bag with a warm two-note chime. The ghost turns and walks, not hops. | A new timed scene (holds of 1 s and 2 s, under the 3 s limit); chapter data (stops; a geléhallon look on the `:424` sweet; a perch that rides a mover); view code; audio. | L | 3 |
| 17 | Waiting ghost; `granskog.ts:333–334`; `ghost-thought.ts:15` | **"It waits" is two perches.** With `near: 1.6` it still hops away as he comes. The mountain is on screen for 2.2 s at the robot's pace, and not much longer for a running child, since the stretch is short. The change in the relationship cannot be felt. | From the stone to the end the ghost walks with him: 1.5 EL ahead at his pace, stopping and looking back when he stops, waiting rather than fleeing if he turns back. When he stands still for 2 s it shows its mountain thought; tapping it shows the thought for 3 s. | Sim and view (a companion stretch after `placed:rescue`); chapter data. | M | 3 |
| 18 | Ending; `granskog.ts:90`, `:141–143`, `:334`; `view.ts:939`; `main.ts:889` | **The ending.** The ghost vanishes as he reaches the goal, the last image is an empty end wall (picture 7a), and the tally card follows 1.4 s later. The game's turning point ends on nothing. | The coda (section 5): a knoll at the forest's edge; side by side for the first time; the look out over the bog to the mountain; "Varför väntar spöket på mig?"; walking down together; then Moa's map, then the card. Add an album photo moment `together` (`photos.ts`). | Chapter data (knoll at about x 199–206, camera zone, goal moved past it, beat); a timed hold; view code; `sv.ts`; `photos.ts`. Keep `tests/robot/pace.test.ts`'s 4.7 s ceiling: candy and the jay along the walk. | L | 3 |
| 19 | Far scenery, x 190 to the end; `ghost-thought.ts:42–45` | **No vista.** The forest's far layers are trunks to the very end, so the coda has nothing to look at, and the thought's mountain has no place in the world. | Thin the trunks over the last 15 EL. Behind them, a far card of the open bog (mist pockets, dead pines), with the mountain and the old pine at its top on the horizon in the thought's own silhouette, under a low 14:00 sun. | Dressing code now (reuse Myren's far cards); final plate in Blender on Olov's computer (plan §5.6). | M | 2 |
| 20 | Music, whole chapter; plan §5.8 | **No musical turn.** One arrangement plays throughout. The plan's "turning to glittering plucks at the brook" and "a reveal gets 1–2 s of silence, then the motif" are unused at the eddy. | When the ghost goes over the fall, the music thins to the drone; under the haul, a low pulse; at the dock, 1.5 s of silence; the motif on the plucked string as it sets the jelly down. In the coda, the theme's first phrase on the fiddle, and the chase knocks become footsteps in time with his. | Audio code. | S–M | 2 |
| 21 | Opening, x 0–6; `granskog.ts:89`, `:305` | **No arrival.** Gården ends with Moa's plane landing at the forest's edge; Granskogen begins with no plane, no new place and no hour. | Moa's paper plane lies nose-down in the moss at x 0 and Elof climbs out of it. The ghost peeks round the giant cone and runs. A short card, "Granskogen · 11:30", drawn on Moa's map (shared with the other chapters' openings). | Chapter data (decor plane); UI (shared). | S | 1 |
| 22 | Scale of the giants; `family-rehearsal.ts:20`; picture 3 | **Pappa reads as a big man, not a giant.** In the forest 1 EL is about 15 cm (plan §5.2), so Pappa would be about 12 EL tall; the rehearsal figure stands 5.2 EL, whole, beside the path. Plan §2.3 asks for hands, boots and a soft face at most 40% of the screen. | At the seesaw and the cap, show true-scale boots, a knee and a hand (a hand about 1.3 EL long), not a whole figure; for a face, a soft one rising at the top of the picture. The question is Olov's (section 8). | View code with stand-in shapes; final models in Blender on Olov's computer. | M | 2 |
| 23 | Myren's opening, outside this area; `myren.ts:417–425`; `sv.ts:147` | **Continuity.** After Granskogen's "from now on it waits", Myren's first perches use the default `near` of 4 (`constants.ts:105`), so the ghost flees as it did before, while Myren's recap says "Spöket flyr inte som förut". | In Myren, `near: 1.6` (or the companion stretch) for every perch, and the ghost looks back when it hops. | Chapter data (Myren). | S | 2 |

## 5. The narrative thread for Granskogen

| Thread | Proposal |
| --- | --- |
| **The emotional question** | Is the ghost mean, or does it need help? The chapter answers by play, not words: he pulls it out of the water with his own lace, and it thanks him with his own sweet. Elof's three lines climb the plan's arc (§3.2): "Spöket ger bort mitt godis!?" (cross, puzzled), then "Spöket tackade mig!" (surprised, warm), then "Varför väntar spöket på mig?" (curious). The last is the plan's own question for the rest of the game (§1 point 2). |
| **The chapter's object** | The red raspberry jelly, the sweet that is shared. The ghost leaves one at the vittra door; memory 2 shows little Elof putting one in the figure's lap; the ghost gives one to Elof after the rescue; in the finale one goes in the trägubbe's lap (§3.4 Final 3), and the golden one makes him big. A child who sees the same red jelly four times connects them without being told. |
| **The ghost** | Kapitel 1: it teases, flees and helps once, and its thought is a smudge. Kapitel 2 escalates in five steps. (1) At the door it gives a jelly away while thinking of a small figure, a shape: it gives. (2) On the slope it runs from the same cones and looks back when he tumbles: it cares. (3) At the ravine it freezes for Pappa, then watches his hands carve, the figure a little clearer: it remembers those hands. (4) At the stump it sits where the figure sat and pats the empty place: it misses someone. (5) On the leaf it goes over the fall and is frightened; rescued, it thanks him by hand, walks beside him, shows the mountain and points at the real one: it trusts him, and shows where. *Who* in the first half, *where* at the end; Kapitel 3 adds the pine and the crack (`ghost-thought.ts:46–56`). |
| **The family** | Help and pride at the two help points, worry and closeness between them. Far silhouettes of Pappa and Bertil walk the big path twice before the ravine, and tapping Elof is answered by their notes. Pappa's hands carve the seesaw, drop the cone when Elof says "Nu, Pappa!", follow his flight with an open palm, and give a thumbs-up when he lands. Bertil sets his cap on the water, walks the bank beside him, cheers "Heja lillebror!" in the picture, and puts the cap back on: it will be Elof's on the summit. In the coda, both walk far behind on the path towards the bog. |
| **The lore piece** | Little Elof's Saturday-sweets custom with Pappa's first figure (memory 2, now on a real stump in this forest), which is the root of the ghost's welcome-home party. And Pappa's hands, which carved that figure and the ghost, now carve help for Elof, while the ghost watches and remembers them. |
| **The set piece** | The eddy. Two small boats cross the pool; the ghost's leaf goes over the tiny fall; Elof hauls it out with three pulls of his lace; it thanks him with his own raspberry jelly. |

**The ending: the last thirty seconds before the card.**
1. **0:00** – Wide on the stone and the eddy (camera zone x 180–193). The leaf docks after the third pull. The ghost
   steps onto the stone, wobbles, and two drops fall from its hem. The music stops for 1.5 s; only the water.
2. **0:02** – Closer on the two of them. The ghost looks at Elof (a 1 s hold). It hugs the striped bag, takes out one
   red raspberry jelly with both hands, sets it at his feet, steps back and double-knocks. The motif plays on the
   plucked string. Bubble (Elof): "Spöket tackade mig!"
3. **0:06** – Input returns. *Ta*: the jelly hops into his bag with a warm two-note chime, not the trail's tick. The
   ghost turns and walks up the bank, not hopping, and looks back after three steps.
4. **0:08–0:16** – They walk together; he steers, and the ghost keeps 1.5 EL ahead and stops when he stops. The trunks
   thin and the light widens. The jay overtakes them and lands ahead. Far behind between the trunks, Pappa's and
   Bertil's silhouettes walk the big path the same way. The chase knocks become footsteps in time with his.
5. **0:16** – The knoll at the forest's edge. The ghost climbs it, turns and waits. Elof walks up beside it, and it
   stays. For the first time they stand side by side, the same size (flag `together`).
6. **0:17–0:19.5** – A 2.5 s hold. The camera rises and widens (zoom about 1.8; a cut, not a move, under *Mindre
   rörelse*). Below them the bog opens in the afternoon sun: pools, mist pockets, dead pines. Far away stands the
   mountain with the old pine at its top. The ghost's thought shows the mountain, then fades as it lifts its free
   hand and points at the real one: the picture and the horizon are the same shape. The theme's first phrase plays
   on the fiddle.
7. **0:20** – Bubble (Elof): "Varför väntar spöket på mig?" The album's `together` photo is taken here.
8. **0:22–0:26** – Input returns. He walks down the far side with the ghost beside him, and the jay flies out over the
   bog ahead of them. At the foot, the new goal, the picture holds for 1.4 s on two small figures walking into the
   open.
9. **0:27–0:30** – The card opens on Moa's map. Her crayon draws the path past Bäcken to the edge of Myren, with the
   ghost beside little Elof instead of ahead of him. Then the handoff "Spöket väntar på mig", and the counts below.

## 6. Gameplay that tells the story

1. **The haul (*Dra*, three pulls).** The rescue is the chapter's verb. Each press pulls the leaf one stop closer
   against the eddy's turn, and after the first the ghost lets go of the bag with one hand to hold his lace. A miss
   is impossible: the effort and the care are in his thumb (Brothers: the controls carry the feeling).
2. **Walking together.** The stick that chased the ghost now leads it. After the rescue it keeps pace, stops when he
   stops and waits when he turns back. He discovers the change by playing ("it doesn't run away any more"). In
   Myren it goes ahead to wait again, so Kapitel 4's partnership is still a step up.
3. **"Nu, Pappa!"** He fetches the weight, stands on the plank and chooses the moment, and the giant hand does what
   he says: trust between a small son and a big father as one button press with a big answer. Elof still does the
   part that matters (plan §4.4).
4. **Running from the cones together.** The chase becomes a danger they share. The ghost flees the cones too, and
   when he tumbles it stops and looks back: the first sign that it cares comes from his own play.
5. **Giving instead of taking.** A berry for the jay instead of the sweet it was pinching; a berry for the vittror
   beside the ghost's jelly. By the time the ghost gives him a sweet, the child has given twice and knows the
   gesture.

## 7. The five to do first

1. **The eddy set piece** (rows 14–16): the leaf crossing, the fall, the fear, the three-pull haul and the thanks
   given by hand. L, value 3.
2. **The coda** (rows 17–19): walking together to the forest's edge, the look at the mountain, "Varför väntar
   spöket på mig?", then the map and the card. The ghost never vanishes at the goal. L, value 3.
3. **The vittra door shows the giving** (rows 1–3): the jelly placed on the step while he rides up, the small-figure
   thought, the line after the act, and no trail sweet on the step. M, value 3.
4. **Pappa's hands at the ravine** (rows 8–10): carving on the call, "Nu, Pappa!" at the launch, and the ghost frozen
   in his sight, then watching his hands. M, value 3; the final hand needs Olov's computer.
5. **The jay as a friend who follows** (rows 4–5): the pinch, the berry, the lichen pulled down, the following, and
   the helper portrait changing only then. M, value 3.

## 8. Questions for Olov

1. **How big are the giants at help points?** In the forest, 1 EL is about 15 cm (plan §5.2), which makes Pappa
   about 12 EL tall. Plan §2.3 shows hands, boots and a soft face at most 40% of the screen. The rehearsal figures
   are whole bodies about 5 EL tall, so Pappa reads as a big man beside Elof (picture 3). Do you want true-scale
   hands and boots in the forest (my proposal for the seesaw and the cap), or whole figures as now?
2. **May the ghost walk beside Elof at the end of Kapitel 2?** The plan says "from now on it waits for him". The
   coda goes one step further for half a minute: they walk together, and in Myren it goes ahead to wait again. Is
   that the relationship you want at this point, or should it only wait?
3. **Memory 2's stump.** Is there a real place on the family's autumn walks that the stump and the walk may echo (a
   name at most, never an address or coordinates), or should both stay invented? The memory's details are the
   plan's (§3.5), and yours to change.
