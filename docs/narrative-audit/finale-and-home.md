# The finale, the epilogue and Byn: narrative audit

Audit of 5 October 2026 for the chapters `norrsken` (`src/content/chapters/norrsken.ts`), `epilog`
(`src/content/chapters/ends.ts`) and `byn` (`src/content/chapters/byn.ts`), with `src/render/epilogue-stage.ts`,
`src/render/shared-sweets.ts`, the story panel (`src/ui/story.ts`, `src/ui/story-stroke.ts`), the album credits
(`src/ui/photos.ts`) and the last card (`src/ui/ending.ts`).

**Verdict.** A seven-year-old who plays the finale today does every step of the ending himself: he lowers the lace,
pulls a figure out of the crack, picks a crowberry, gives it eyes, takes his bag back, shares, tastes the golden
sweet and rides home on Pappa's shoulders. Nothing is a cutscene, and that is the area's strength. What he
understands without reading is much less: a grey figure came out of a hole and got two dots, and when he grew big
his family was suddenly there. Why the ghost took his candy is a line of HUD text that appears when the bag comes
back; the ghost itself never does anything that shows it. The moment he tastes the golden sweet, eight things start
in the same second, so none of them lands. The family has no approach, no sign of a day's worry and no relief.
Pappa's recognition is four bubbles above a box figure six lengths away whose head is out of the picture at
844×390, and the figure he recognises stands at the cliff edge, not in Elof's hands. The plan's blink of the old
trägubbe, the headlamps, Moa's jacket, Bertil's cap and the hugs are not built (`norrsken.ts:15-17`). The epilogue
closes the circle in data but not in play: the empty place on the shelf is already filled when it begins, Pappa is
not beside him when he carves, the name *Klonk* arrives as a speech bubble from the mouthless ghost, and the final
image, under a line about Klonk, does not contain Klonk. Byn is a pleasant walk with no story reason: an
unexplained second star, a friend who never interacts and still carries the stolen torn bag, and a closing card
that says the sweets were bought when nothing was. What is missing most: the ghost's own welcome-home gesture (the
reveal shown, not told), a reunion that Elof performs (call, hug, show Pappa), and a last image that holds the three
carvings together.

## 2. As it plays now

Measured with the robot (`AUDIT_CHAPTER=<id>`, timeline harness, game seconds) and in the running dev server at
844×390 on Low with stand-ins (eight pictures, kept in the session scratchpad, not committed). Child minutes are
estimates: walking, reading a verb and answering each panel at a seven-year-old's pace.

**Norrsken** (robot 21.9 s; a child about 3 min; the plan asks for "about 6 min", §3.4 Final).

| Robot s | Child | x | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0.0 | 0:00 | 1 | Blue hour at the old pine; the ghost waits at x 9.2 (`norrsken.ts:103`); a row of trail candy on the rock | We are on top; the ghost waits |
| 2.8 | 0:15 | 10.9 | *Sänk snöret*. Nothing is seen going down; deep in the 0.36-EL crack only the figure's red pull ring shows | Little |
| 4.6 | 0:30 | 10.9 | Two *Dra*: a grey figure rises to the rock in two steps. The same moment the ghost hops 7 EL right, to x 19.4 (`norrsken.ts:104`) | Something came up. The ghost walks away from it |
| 6.4-6.6 | 1:00 | 15.6 → 13.4 | *Plocka* a crowberry; *Måla ögon* is one press (no trace); two dots appear (`view.ts:714-717`) | It has eyes now |
| 7.7 | 1:10 | 18.8 | *Ta påsen*: the bag vanishes; the HUD adds "Spöket tog godiset för att välkomna trägubben hem!" (`story-context.ts:28-29`) | The bag is back. The why: only by reading |
| 8.0-9.3 | 1:15-2:15 | 13.4, 18.8, 23 | Three full-screen sharing panels, one per gift (`story.ts:72`); a sweet then sits beside each | I chose something. Nobody reacts |
| 10.4 | 2:30 | 26.6 | *Smaka* a golden sweet floating over the rock. Within one second: POFF, night (3 s), aurora, four family figures appear and jump for joy, Pappa's first of four bubbles (about 14 s together, `hud.ts:40-41`), the camera cuts to a fixed shot (`view.ts:848-852`), the ghost and the figure jump to the cliff edge at x 34.1-34.6 (`norrsken.ts:105-106`, `view.ts:1004`), the purpose changes | I am big; my family is here. Who they are to the figure: only by reading |
| 12.4 | 2:55 | 33 | *Gå hem* at a green sign: Pappa carries him; Mamma, Moa and Bertil stay standing; the two carvings float at his shoulders (`view.ts:1013-1015`); the stick steers for eight candies | Pappa carries me home |
| 21.9 | 3:10 | 72 | Goal on the dark slope; 1.4 s later the card: "Finalen klar!", candy rows, then "Hem till godiskalaset" with Pappa's origin (`sv.ts:211`) | (the card) |

Longest stretch with no story: the ride, 9.5 robot s (11 s by design, `norrsken.ts:27`), with candy to steer for; for
a child, the three sharing panels (about a minute of forms). If he presses *Gå hem* at once, Pappa's bubbles run
during the ride and the fourth can be cut by the card (robot: taste at 10.4 s, card at 23.3 s, bubbles need about
14 s). **Last image:** Elof on Pappa's shoulders on a dark slope, mid-ride; the card 1.4 s after x 72.

**Epilog** (robot 15.6 s; a child about 3-4 min; plan 4-5 min).

| Robot s | Child | x | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0.0 | 0:00 | 1 | The veranda at 21:00, the aurora in the windows; four box figures in a row (x 7-19); a trail of candy on the floor (`ends.ts:207`); the shelf at x 34 already holds the old figure (`ends.ts:142`) | Home, evening, everyone here |
| 1.6-6.2 | 0:10-1:30 | 6-22 | Five modal party panels; each gift: arms up and a notice; Hittegods lines if found (`ends.ts:178-200`) | I give everyone candy; they are glad |
| 6.2 | 1:35 | 21.3 | Bubble "Klonk: Klonk, klonk!" (already labelled Klonk), then Elof "Du ska heta Klonk!" | Only by reading |
| 8.1 | 1:50 | 29 | *Ta kniven* at a green sign; Pappa, at x 11 and out of the picture, says "Alltid bort från kroppen." | Not who teaches him |
| 8.9-9.0 | 2:00-2:45 | 32 | Carving panel: three strokes away from the body, two hands drawn; "Jag kan tälja!"; paint panel: two eyes | I carved, and I gave it eyes |
| 9.4-12.4 | 2:50-3:00 | 32-44 | The ghost appears on the shelf; the new figure on the windowsill; *Borsta tänderna*: nothing shown, a 4-s float up the stairs | Bedtime |
| 15.6 | 3:10 | 53 | Goal; 1.4 s; card "Slut" with the credits album opened on top; after *Klart*, the windowsill shot with the last line; the figure blinks 0.32 s at 1.2 s; *Spela vidare*; the same card again, the same line, candy rows | The blink is easy to miss while reading |

Longest stretch with no story: the five party panels (about 1:20 for a child), each the same form. **Last image
before the card:** Elof floating up the stairs (the `bed` ride, `ends.ts:187`), no bed and no goodnight; the card
1.4 s after x 53 (`main.ts:889`), the windowsill only after the credits.

**Byn** (robot 51.9 s; a child about 7-10 min). Beats: "En stjärna till. Nu handlar vi!" (0.3 s, x 1.4), "En
sjö! Mitt på gatan." (10.6 s, x 37.5), the leaf ride (11.2-19.2 s), "Framme! Det luktar godis." (39.3 s, x 114),
"Godiset är större än jag!" (42.1 s, x 124), "En påse att dela på!" (50.7 s, x 154), goal (51.9 s, x 158). Longest
stretch with no story: 10.6 to 39.3 robot s (x 37.5 to 114: the bicycle swing, the drips, the matchbox), about
4-5 minutes for a child with only the friend's hops. **Last image:** Elof walks up to a plain paper bag on the shop
floor (`village.ts:683-691`); card "Byn klar!" with "Lördagsgodiset är köpt. Nu går vi hem." (`sv.ts:340`).

## 3. What is good, and stays

- **Every step of the ending is played** (`norrsken.ts:7-13`): lower, pull, pick, paint, take, share, taste, go
  home. There is no cutscene: every beat is something he does. Keep the chain; restage it.
- **The reveal is guarded honestly** (`story-context.ts:20-31, 115-124`): the motive needs the actual rescue, eyes
  and bag; "min gamla" needs memory 4; the card keeps Pappa's origin when fast play overtakes his bubbles.
- **Health rules hold in sharing:** the jay can only get a lingonberry, nobody loses a sweet (`sim/story.ts:16-21`);
  the chosen sweets stay visible beside their friends (`shared-sweets.ts:53-76`).
- **Night falls on the turn** (`view.ts:1253-1292`): the sky darkens and the aurora rises over 3 s after *Smaka*.
- **The POFF mirrors the prologue** (`norrsken.ts:50`), and **the ride home is on Pappa's shoulders**
  (`view.ts:720-726`), the pose of memories 3 and 4 (`memory.ts:68-77`).
- **The carving stroke is the rule:** only a stroke away from the body cuts (`sim/story-stroke.ts:41-60`); the
  control carries the meaning, as in *Brothers*. Its eyes use the prologue's own trace (`eyeCentres('dots')`).
- **Hittegods comes home** with lines in each owner's voice; Pappa's "En krona! Den får du behålla." is a gift.
- **The shelf ends filled, with Klonk beside the first figure** (`built.ts:52-85`, `view.ts:975-981`); the menus
  and the map say Klonk after the naming (`hud.ts:69, 144`; `map.ts:101`).
- **The last line is in the game** (`sv.ts:339`), the windowsill blinks with a bell (`epilogue-stage.ts:37-46`,
  `main.ts:778`), and the album doubles as credits (`photos.ts`).
- **Byn** is a fresh medley of the verbs at a new scale with nothing real named (`byn.ts:3-20`); the friend goes
  ahead instead of fleeing. Its puzzles stay.

## 4. Findings

| # | Where | What is wrong | The fix, concretely | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `norrsken.ts:74, 97, 103-104`; nothing in `view.ts` stages `lower` | **Clarity, the ghost.** The finale never shows what is in the crack (a red ring in a dark slot); the lace is not seen going down; the ghost stands at x 9.2 throughout, so "they pull together" (§3.4 Final 1) is not seen; and the moment the figure is up the ghost hops 7 EL away (robot 4.6 s), as if it did not care | Open on the composition the Berget audit's coda ends on (ghost holding the lace at the lip, lamps far below). On arrival a 2-s close shot down into the crack: the figure wedged in the dark, smiling, as memory 4's last picture (`memory.ts:77`). *Sänk snöret*: the red lace unrolls into the slit and the ghost climbs down it (2 s, wood knocks). Each *Dra* lifts the ghost hugging the figure. At the top it sets the figure on its feet, steps back, looks from it to Elof, double-knocks. It stays with the figure from then on, until it gives back the bag (row 2) | Chapter data (perches, camera zone); a new timed scene built like `src/sim/prologue.ts` (frame clock plus pose); view code (ghost riding `mover:tragubbe`) | M | 3 |
| 2 | `norrsken.ts:15`; `story-context.ts:28-29`; overhaul "The candy motive at the reveal" | **The reveal is told, not shown.** The ghost's welcome-home party (§3.4 Final 3) is not built. The motive appears only as HUD text at the moment the bag is taken; the "returned figure, the same kind of sweet and a giving gesture together" that the overhaul asks for first never happens | After `eyes`: the ghost walks the figure to the pine (x 8.4) and sets it facing the view; takes one raspberry jelly from the striped bag and puts it in the figure's lap; steps back, tilts its head, double-knocks. Its thought card shows its plan: Pappa's shelf, the first place filled by the grey figure, a jelly in front of it (no little Elof, so no memory is spoiled). Then it turns and holds out the bag. Elof: "Spöket ville ha kalas för trägubben!" (36 characters; with memory 4 found: "Kalas för min gamla trägubbe!", 29). The HUD motive then follows at `bag`, as now. Sound: the polska's first bar on a lone pluck. Camera: a fixed three-shot of pine, figure and ghost | New timed scene (two `later` holds of 2.5 s and 3 s); a `welcome-home` picture in `ghost-thought.ts`; a decor jelly with `after`; `sv.ts` | M | 3 |
| 3 | `norrsken.ts:76` (no `story`); `sim/story-stroke.ts:4-6` (`eyeCentres('eyes')` is empty) | **The theme's mechanic skips its middle use.** The prologue and the epilogue trace each eye; on the summit *Måla ögon* is one press. Rule 1 (eyes wake Pappa's carvings) is the reason the figure can blink | `story: 'paint'` on the spot; `eyeCentres('eyes')` gives [116, 204]; the panel shows the old figure (grey, moss on one shoulder, pointed cap, crooked smile, as `props.ts:158-171`) and the stroke is crowberry purple (`#4a2340`). The trace is the same circle as at breakfast. No line | Chapter data, `sim/story-stroke.ts`, `ui/story-stroke.ts` (a third shape) | S | 3 |
| 4 | `norrsken.ts:83`; `props.ts:571-580`; `props.ts:455-459` | **Gameplay against the story.** The golden geléhallon floats over the rock and Elof eats it: "no candy found on the ground is eaten" (§3.7), and rule 3 says it was in the bag all day. The returned bag also vanishes when taken, so the game's main symbol does not come home in his hand | From `bag`, Elof carries the striped bag (with its tear) at his side. With the prologue audit's glint (its row 7), the golden one twinkles in it. After `shared`, *Smaka* is offered at the view (x 24.5, no `gold` look): the golden one rises out of the bag into his hand, glints, he eats it. The bag stays with him through the reunion, the ride and the party | Chapter data; view code (bag on Elof; the sweet rising) | S | 2 |
| 5 | `norrsken.ts:88-113`; `view.ts:848-852, 1004`; `music.ts:79`; `cues.ts` (no cue for POFF, eyes, gifts) | **Pacing, the ending.** At *Smaka* eight things start in one second (see the timeline); the old figure's blink (rule 1, §3.4 Final 6) is not built; the music, one arrangement for the whole chapter, marks none of it | Three beats. (a) 0-2 s: POFF with a sound (the prologue's, pitched upward); the camera pulls back as he grows; the carvings stay at his feet. (b) 2-4 s: the aurora flares (ribbon opacity to 1 for a second); silence but the wind. (c) 4-6.5 s: a close shot of the old figure; it blinks once, *pling*, a glint (reuse `epilogue-stage.ts:40-45`); Elof kneels. No family yet, no bubble | `later` holds (each ≤ 3 s); view code (flare, blink on `first-carving-eyes`, POFF cue) | M | 3 |
| 6 | `norrsken.ts:88-93` (`after: 'taste'`), `16` | **The family bond.** The family pops into place, jumping for joy. No headlamps, no search, nothing of a day's worry, no relief, and no cause: the plan's "the jay found them" is not shown | After the blink: *Ropa på familjen*. Elof's wordless call; far down the path, the four lamps the Berget audit set up stop, turn up the slope and blink twice; the jay, which flew off down the path after its lingonberry, flits ahead of them. Over about 6 s they climb into the picture, Mamma first, beams sweeping; the last 3 EL Mamma runs. Each lamp's owner sounds their motif (`cues.ts:21-26`). The family figures walk in from x 45 instead of appearing | Chapter data (spot `callFamily`, the jay's exit); new timed scene (family walk); view code (four lamp quads and beams); `sv.ts` verb "Ropa på familjen" | L | 3 |
| 7 | `norrsken.ts:108-113`; `view.ts:848-852, 1004`; picture at 844×390 | **Emotion, clarity.** Pappa's recognition plays as four bubbles from a box figure 6 EL away whose head is above the frame and under his own bubble; Elof holds nothing; the figure stands at the cliff edge; *Gå hem* is offered at once, so the words run on the ride | Make it Elof's act. Elof holds the old figure from the POFF on. When Pappa arrives he stops short, his lamp on the figure. *Visa Pappa*: Pappa kneels (the box lowers 40 %), takes it, turns it; the music drops to one held D; memory 1's second picture (Pappa handing the new figure to little Elof, `memory.ts:57`) grows out of Pappa, not the ghost, for 3 s: his own memory. Then two bubbles: "Min allra första trägubbe …" and "Den täljde jag till dig, Elof." (30). He gives it back and puts his hand on Elof's head. Two-shot centred between them, framing both heads in every orientation. *Gå hem* waits for this | Chapter data (spot `showPappa`, `needs`); view (kneel, the figure in Elof's hand); `ui/memory.ts` (play one picture from another chapter, with an origin); `sv.ts`; final hands: Blender on Olov's computer | M | 3 |
| 8 | `norrsken.ts:16`; plan §3.4 Final 7 | **The family bond.** Moa's jacket, Bertil's cap and the hugs are missing, so the family's care is never felt | Order: relief, care, then Pappa (row 7). Mamma kneels with open arms; *Krama*, held: the four close round him while he holds (up to 2 s), the camera pushes in, the polska swells. After night falls Elof shivers (a 0.4-s tremble every 3 s); Moa lays her denim jacket over his shoulders and the shiver stops (cause and effect, no words). Bertil puts his red-and-white cap on Elof's head, the boat from Kapitel 2. No bubbles | Chapter data (spot `hug`); view (rehearsal lean, costume boxes on the stand-in); Blender on Olov's computer (jacket and cap on Elof's model) | M | 3 |
| 9 | `norrsken.ts:105-106`; `ends.ts:188-193`; rule 2 (§3.3) | **The ghost's mystery.** The freeze rule is dropped exactly when it can land its last time: the ghost hops about in front of Mamma and Pappa on the summit and at the party | Summit: as the first lamp beam reaches the ghost it freezes mid-step and topples flat (the prologue's pose, `sim/prologue.ts:51-54`); Pappa picks it up, puzzled (his morning's carving, up here?), and puts it in Elof's free hand; while Pappa turns to Mamma, it winks at Elof (one eye scales shut). Party: row 16 | View code (reuse the freeze pose); chapter data | M | 2 |
| 10 | `story.ts:25-36, 72`; picture of the panel; `cues.ts` | **The panel breaks the moment.** The sharing form covers the whole summit, hides the three friends, opens three times, and nobody reacts or makes a sound. The ghost's carved bag, "which has always been empty" (§2.2), gets its first sweet behind the panel | Give in the world. Elof holds the bag open; a strip of three sweets (geléhallon first) sits along the bottom, at most a quarter of the height, no dimming; *Ge* at a friend gives the chosen one, a geléhallon if none is chosen. The ghost looks down into its bag, hops, double-knocks; the jay takes the berry, flies a loop and away down the path (row 6); the figure's sweet sits in its lap (row 2). The HUD count does not drop: sharing is not losing | `ui/story.ts` (a non-modal strip; party reuses it); view code (reactions); a `gift` cue | M | 3 |
| 11 | `view.ts:1695-1700`; `norrsken.ts:71, 119` | **The picture.** The first trägubbe keeps its red pull ring (the "lace goes here" sign) through the reunion and the ride; the checkpoint lollipop at x 30.4 stands between Moa and Mamma; trail candy lies at their feet | Hide a pull mover's ring at its last stop. At the POFF the trail sweets within 4 EL hop into the bag in the glitter; the big candy's picture shrinks away after `taste` (its checkpoint stays) | View code; sim (collect in range at `taste`) | S | 2 |
| 12 | `norrsken.ts:27, 99, 120-127`; `view.ts:1006-1016` | **The ending's walk.** Only Pappa leaves: the others stay standing on the summit while "Följ familjen hem." shows; the carvings float in the air; the stick steers for candy | The family walks with them: Mamma ahead with her beam on the path, Moa and Bertil beside, at fixed offsets from the ride. The ghost sits on Pappa's cap; Elof holds the old figure. The ride's `corridor` becomes 0, as the shrink ride (`ends.ts:77`), so its candy is collected on the line; the stick's *up* lifts the figure above his head instead, "so it can see the way" (memory 3) | View code; chapter data | M | 3 |
| 13 | `norrsken.ts:52`; `main.ts:888-889`; `hud.ts:150-183` | **The ending, the card.** The ride ends mid-slope in the dark (goal x 72 before the ride's end at 74), and the card leads with "Finalen klar!" and the tally; Pappa's origin comes below it | End at a viewpoint: far below, the lit windows of the red house (a light on the far layer, not its true place); the tune resolves on D; 3 s with input live while the camera rises to the aurora (section 5's ending). The card is titled "Norrskenet", shows the handoff first and the count after it, small | Chapter data (goal, camera zone); view (a lit window); `hud.end` option; `sv.ts` | M | 2 |
| 14 | `ends.ts:142` (`filled: true`); `built.ts:61-70`; `ends.ts:44-45` | **The circle is not closed by an act.** The intro's first question, the empty first place the ghost looked at, is answered by set dressing: the figure is on the shelf when the epilogue begins, and nobody puts it there | During the party the old figure sits on the table as the guest of honour, a geléhallon in front of it: the ghost's party, now at home with everyone. Before bed, *Ställ den på hyllan*: Pappa lifts Elof (the shoulders again) and Elof puts it in the first place, with a wooden tock. The prologue's dotted look line (`ends.ts:45`) runs from Klonk to the filled place, and Klonk hops up beside it | Chapter data (shelf `filled` by flag, spot, `glance`); `built.ts` (figure by flag); view | M | 3 |
| 15 | `ends.ts:160-161, 207`; picture of the party | **Gameplay against the story.** No table, candles or bowls (§3.4 Epilog); candy lies in a row on the veranda floor and is picked up by walking during his own party; five modal panels in a row; nobody he helped on the way is there | A table along the veranda with five bowls and candles; the floor trail's sweets lie in the bowls (same list order, new coordinates); giving puts the sweet in that person's bowl through row 10's strip. The striped bag stands on the table, its tear mended with tape (Pappa: "Fixar allt"). What changed is in the windows (Oxenfree): the jay on the railing, a ladybird on the glass, three cranes across the moon | Chapter data; a table prop; view (the gifts); window props | M | 2 |
| 16 | `ends.ts:201`; `sv.ts:273`; `main.ts:174`; `journey.ts:10-12` | **Words, the ghost's mystery.** "Klonk, klonk!" is a speech bubble from the ghost, the only one it has in the game, though it has no mouth; and because `beat:named` is set in the same step, its label already reads "Klonk" before Elof gives the name | Words in the world: Mamma and Pappa turn to the aurora in the windows; the ghost hops the length of the table, and each footfall puts the carved word *klonk* in the air over it (wood-coloured, rising and fading) with its knock. Moa and Bertil giggle. Elof: "Du ska heta Klonk!"; it double-knocks yes. When Pappa turns back it freezes mid-hop (row 9). The label changes after Elof's line | Chapter data (drop the ghost's beat; a `later` hold); view (two word sprites); `hud.ts` | M | 3 |
| 17 | `ends.ts:163`; `people.ts:16`; `ui/story-stroke.ts:14-24`; `sv.ts:172` | **The family bond.** The lesson is given by a green sign: Pappa stays at his party place 18 EL away, his "Alltid bort från kroppen." comes from off screen, and "Pappa's hand over his" exists only in the panel's drawing. The purpose even says "Hitta Pappa" | After `partied` Pappa walks from x 11 to x 30.5 and kneels; the spot is Pappa (*Tälj med Pappa*). The panel opens over the lower half only, so the two stay in view; each stroke drops a shaving curl in the world. After the third stroke, Pappa's hand on Elof's head, no line | Chapter data; view (Pappa's stand moves); `ui/story.ts` layout; hands: Blender on Olov's computer | M | 3 |
| 18 | `ends.ts:169, 187` | **Lore, warmth.** Teeth are a button and bed a 4-s float up the stairs: the plan's joke that "everyone brushes except the ghost, which has no mouth" (the theme itself) is not there, and nobody says goodnight | At the sink, the family in a row with brushes; Klonk at the end holds one, looks at it, tilts its head: no mouth. Moa laughs. In bed, Mamma tucks the blanket, Pappa switches the lamp off (a click); Mamma: "God natt, Elof." (15) | `later` hold; view staging; `sv.ts` | M | 2 |
| 19 | `epilogue-stage.ts:37-46`; `ending.ts:4-8`; `main.ts:888-910`; `ui.css:1151, 1256` | **The ending.** The last line is about Klonk, but Klonk is not in the last image. The 0.32-s blink at 1.2 s comes while the line is already being read. The button says *Spela vidare*. A bubble still up is not hidden. Then the card repeats the line and ends on candy rows | The shot (section 5): Klonk beside the small figure; 2.5 s of moonlight; the blink with its *pling*; Klonk answers with a soft double knock; then the words fade in; after 4 s a *Godnatt* button. Hide `#bubble` and `#notice` in `.ending-view`. The card after it has no repeated line and no rows; *Utforska vidare* and *Ett kapitel till* first | `epilogue-stage.ts` (a staged Klonk), `ending.ts` timing, `sv.ts`, `ui.css`, `main.ts` | S-M | 3 |
| 20 | `photos.ts:4, 14-15`; `sv.ts:317` | **The credits.** The aurora photo is taken 2.8 s after *Smaka*, during the pop-in; the walk home on Pappa's shoulders, the image that rhymes with memory 3, has no photo; the credits never set now beside then | Move `aurora` to the shoulder ride (`flag: 'home'`, `mode: 'ride'`, 3 s), captioned "På Pappas axlar". In credits mode, show a discovered memory's picture beside its photo where they rhyme: memory 1 beside "Min första trägubbe", memory 3 beside "På Pappas axlar" | `content/photos.ts`, `ui/photos.ts`, `sv.ts` | M | 2 |
| 21 | `sv.ts:237`; `byn.ts:3-6, 113` | **Byn: no reason.** "En stjärna till. Nu handlar vi!" names a star nobody sees, from nowhere (rule 3: glittering candy is an accident or the ghost's gift), and a shopping trip with no one to shop for | Start big on the pavement (`size: { scale: 3, until: 'star' }`, as the prologue does), with Mamma going into the yarn shop. Klonk climbs out of Elof's chest pocket onto the window sill and holds up a glittering star, its gift on purpose; its thought card shows the sweet shop's window and one geléhallon in its own carved bag. *Ta*: POFF. Elof: "En stjärna från Klonk!" (22) | Chapter data (size, star spot, ride); a `shop` picture in `ghost-thought.ts`; `sv.ts` | M | 3 |
| 22 | `view.ts:968-969` | **Byn: continuity.** The friend carries Elof's striped Saturday bag, tear and all, a week after it was given back on the summit | Hide `stolenBag` in Byn as it is already hidden in the epilogue (`chapter.id !== 'epilog' && chapter.id !== 'byn'`); the chase chapters keep it | View code | S | 3 |
| 23 | `byn.ts:214-230`; `sv.ts:193` | **Byn: no arc.** The friend only hops ahead and never interacts; "Vi hjälper varandra längs gatan." is not true in play | One duo move at the shop's step: Elof boosts Klonk up (*Lyft*) and it lowers the lace (the Berget move, as friends now); the matchbox stays as the other way. Small ghost moments: on the leaf it stands at the bow; under the awning it holds a birch leaf over his head | Chapter data (spot, perch `until`, a climb with `needs`); view poses | M | 2 |
| 24 | `byn.ts:114, 229, 236`; `village.ts:683-691`; `sv.ts:340` | **Byn: the ending.** He walks up to a paper bag and the card says "Lördagsgodiset är köpt. Nu går vi hem.", though nothing was bought and nobody goes home | The ending in section 5: Klonk's first own sweet, given by Elof; Mamma's hand; the view back from her pocket; the closing line then true | Chapter data; new timed scene; view (a giant hand); `sv.ts`; the hand's model: Blender on Olov's computer | L | 2 |

## 5. The narrative thread for this area

| | Finale (Norrsken) | Epilogue (Godiskalaset) | Byn |
| --- | --- | --- | --- |
| **Emotional question** | Why did it take my candy, and will the lost one come home? And after a day apart: are we together again? | Is everything home, and can I make what Pappa makes? | What do friends do the next Saturday? |
| **The ghost** | Berget: it was stuck and let him help. Here it leads: it goes down into the dark, holds its party (the answer), gives the bag back, gets its first sweet ever, freezes for the grown-ups and winks at Elof | Named by its sound; the freeze one last time at the table; the teeth gag; at night it answers a blink it did not cause: it cannot say it, but it answers | It gives on purpose now (the star) and walks beside him; one duo move; its first own sweet, chosen by Elof |
| **The family** | Worry seen as lamps on the mountain (from Berget); his call answered; Mamma's run and the hug; the jacket when he shivers; the cap; Pappa stops at the figure; the shoulders | The party where he gives; Hittegods; Pappa's lesson, his hand on Elof's head; goodnight | Mamma in the village; her palm at the end |
| **Lore** | The first trägubbe: Pappa's first figure, made for Elof, lost here; its blink pays off rule 1 | Three carvings together: Pappa's first (for Elof), Pappa's newest (woken by Elof), Elof's first (made with Pappa) | The carved bag that "has always been empty" (§2.2) gets something given, not taken |
| **Set piece** | The aurora flares, the old figure blinks, and four headlamps come up the mountain to his call | Carving with Pappa's hand over his | The whole street seen from Mamma's pocket |

**The finale's last thirty seconds** (after Pappa gives the figure back):
1. 0-4 s. Pappa crouches with his back to Elof; *Kliv upp*: he climbs onto his shoulders. The ghost sits on Pappa's
   cap; Elof holds the old figure in both hands. The polska starts from its first bar, full, at a walk.
2. 4-12 s. The walk down: Mamma ahead, her beam on the path; Moa and Bertil beside; four lamps bobbing. The stick's
   *up* lifts the figure over his head. No candy to steer for.
3. 12-15 s. The first time he lifts it, memory 3's second picture (`memory.ts:69`) crossfades in sepia over the same
   pose for 1.5 s, and back to colour: then and now. No caption.
4. 15-22 s. The path turns; below the spruces, a few lit windows of the red house; the jay flies ahead to them.
5. 22-27 s. They stop on a slab. Pappa points down. Elof's happy call; the ghost double-knocks on the cap. The tune
   lands on its last bar, on D.
6. 27-30 s. Hold on five silhouettes, four lamps and the aurora. The card: "Norrskenet", then "Hem till
   godiskalaset" and Pappa's origin, the count last.

**The epilogue's last thirty seconds** (from the bedroom; the credits album still opens before the window, as the
plan has it):
1. 0-5 s. Mamma tucks the blanket; Pappa switches the lamp off (a click). Mamma: "God natt, Elof."
2. 5-9 s. Dark. The camera drifts from the bed to the window: moonlight, a faint aurora. The slow waltz
   (`music.ts:67`) thins to one string.
3. (The album: photos beside their memories, "Tack för äventyret!", the credits.)
4. 9-12 s. The windowsill: Elof's crooked figure with its two dots, and Klonk beside it, come over from the shelf.
   Nothing moves.
5. 12-14 s. The small figure blinks. *Pling*, a glint.
6. 14-17 s. Klonk turns to it, tilts its head, and knocks twice, softly: klonk-klonk.
7. 17-30 s. The words fade in: "Klonk kunde inte säga det med ord. Men Elof förstod." After 4 s, *Godnatt*; then
   the card with *Utforska vidare* and *Ett kapitel till*.

**Byn's last thirty seconds** (inside the shop):
1. 0-5 s. By the lowest jar, Klonk's thought card shows one geléhallon in its carved bag. Elof climbs onto the jar's
   lid; *Ta*: one geléhallon.
2. 5-9 s. *Ge Klonk*: he drops it into the carved bag. Klonk looks down into it for a long moment, hops,
   double-knocks. The polska's first phrase on a pluck.
3. 9-14 s. A giant hand comes down slowly, palm up (Mamma's: the hand first, §2.3). Klonk freezes mid-hop and topples
   flat; Elof laughs, climbs into the palm and pulls Klonk in after him.
4. 14-20 s. The hand rises past the jars; her other hand holds a striped paper bag; the door; the shop's bell.
5. 20-27 s. From her coat pocket the camera looks back over the whole street at a giant's height: the kerb, the
   drain, the puddle with its leaf, the bicycle, the awning. Klonk unfreezes and peeks out beside Elof.
6. 27-30 s. Elof: "Klonk fick sitt första lördagsgodis!" (36). The card: "Byn klar!", "Lördagsgodiset är köpt.
   Nu går vi hem."

Net captions: the finale +1 (Elof's realisation) and −2 (Pappa's four bubbles become two); the epilogue −1 (the
ghost's bubble) and +1 (goodnight); Byn unchanged in number.

## 6. Gameplay that tells the story

1. **The crowberry trace** (row 3). The circle that woke the thief at breakfast now wakes the lost one, in crowberry
   purple, under his own finger. Nothing happens at once; under the aurora the figure blinks (row 5). Cause and
   effect, separated by the sharing, is rule 1 learned in play.
2. **Giving with his hands** (rows 10, 15). He holds the bag open and puts each sweet where it goes: the figure's
   lap, the ghost's empty carved bag, a bowl at home. The bag still bulges and the count does not drop.
3. **One call for everyone** (row 6). *Ropa på …* called one giant at a time all game; *Ropa på familjen* calls them
   all, and four lamps blink back (Journey's chirp: the call is the help).
4. **The hug and the shoulders** (rows 8, 12). *Krama* is held: the family closes in while he holds. *Kliv upp*,
   then the stick lifts the figure "so it can see the way", the pose of memory 3. Brothers' lesson: the hands carry
   the climax.
5. **The carving** (row 17). Keep the stroke that only cuts away from the body; put Pappa beside him in the world,
   a curl falling with each stroke; then the third *Måla* of the game, on his own figure.

## 7. The five to do first

1. **The ghost's welcome-home party before it gives back the bag** (rows 1-2): the reveal as an image the ghost
   performs, with its thought card and one bubble. M.
2. **The blink, then the call** (rows 5-6): POFF, the aurora's flare and the old figure's blink in their own beats;
   then *Ropa på familjen* and the lamps climbing into the picture, the jay ahead. M, then L.
3. **The reunion as Elof's acts** (rows 7-8): *Krama*, the jacket when he shivers, the cap, *Visa Pappa* with
   Pappa's own memory and two bubbles; *Gå hem* only after. Rehearsal bodies now; hands and costumes on Olov's
   computer. M.
4. **The small fixes in one pull request** (rows 3, 4, 11, 22): the crowberry trace, the golden sweet from the
   carried bag, no red ring on the figure, no stolen bag in Byn. S.
5. **Close the circle at home** (rows 14, 19): Elof puts the old figure in the empty place before bed; the last
   image holds Klonk beside his figure, the blink before the words, *Godnatt*, no repeated line or tally. M.

## 8. Questions for Olov

1. **The freeze rule at the end** (rows 9 and 16, plan §3.3 rule 2): the plan's epilogue has the ghost hop across the
   party table. Proposed: grown-ups never see it move, so it hops while Mamma and Pappa look at the aurora, freezes
   under the headlamps on the summit, and Pappa carries it home without knowing. Agreed?
2. **The reunion's order** (rows 7-8): the plan has Pappa's recognition first, then jacket, cap and hugs. Proposed:
   the hug and the care first, Pappa's quiet recognition last, just before the shoulders. Agreed?
3. **Byn's story** (rows 21-24): Klonk gives the second star on purpose; Mamma is in the village and her hand ends the
   chapter; Elof stays small until the evening, because the golden sweet may only be eaten on Saturday evening
   (§3.7). Is that the outing you want, and may Mamma's hand appear there?
4. **Pappa's own words** (plan §2.3): his dream is to teach carving one day. The epilogue's lesson fulfils it. May
   the game hint at that (a wordless beat, or a credit line naming his carving, as §2.6 offers)? It is personal and
   not on the consent list, so it is asked first.
5. **The credits' wording:** the game says "med hjälp av Claude och Codex" (`sv.ts:317`); the plan says "med hjälp
   av Claude" (§2.6). Which?
6. **Pappa's real first trägubbe** (HANDOVER question 1): if it exists, the summit's figure, the shelf and the
   party's guest of honour are modelled on it, and the epilogue's shelf beat becomes "so it came home".
