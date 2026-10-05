# Narrative audit: the prologue (Lördagsmorgon)

Area: chapter `prolog` (`src/content/chapters/ends.ts`), `src/sim/prologue.ts`, `src/render/prologue-stage.ts`,
`src/render/family-rehearsal.ts`, `src/render/saturday-bag.ts`, the paint panel (`src/ui/story-stroke.ts`), the
title and first start (`src/ui/title.ts`), and the first seconds of Gården. Audit of 5 October 2026.

## 1. Verdict

A seven-year-old today meets two menus (the title, then "Hur vill du spela?"), then four motionless box people
beside him, a knee-high wooden figure standing on the kitchen floor, and two speech bubbles to read before anything
moves. Painting the eyes happens on a flat drawing in a panel that hides the world, twice. After that he does
follow the main chain, and much of it is good: the figure looks up at an empty place on the shelf and then at the
bag, takes the bag, freezes when Mamma passes, drops a trail of candy, and on the deck a star from the bag makes him
small in front of his family, who say they will help. What he does not get is the intro Olov describes. Nobody
crafts anything (Pappa only says "Jag har täljt ett spöke"); there is no cosy moment (nobody does anything, and the
first words are an instruction); the ghost's coming alive has no blink, sound or close-up; the theft happens in
full view of the whole family, who then vanish and reappear on the deck; the shrink is a deliberate "Ta" at a
standstill, explained by Pappa's bubble before it is seen; the family's worry is Pappa's box squashed to 74 % of its
height; and 1.4 s after the goal the peak is replaced by a candy tally, after which Gården repeats Pappa's last two
lines from a Pappa who is not there. **Most missing: the making and the reaction** — Pappa's hands carving and Elof's
own hand painting, both in the world and close up, and a family that kneels, holds out a palm and seals a promise
with him, with the title card at the end of that instead of a level card.

## 2. As it plays now

Robot seconds are from the timeline harness (game seconds since the first step). Elof's minutes are estimates from
the plan's design minutes (§1), the bubble times (2.2 s + 0.055 s per letter, `hud.ts:40-41`) and the fixed holds;
in the prologue the robot is only about 6× faster, because the holds are fixed. Pictures P1–P8 are this audit's
captures at 844×390 with touch controls (session scratchpad `audit-prologue/`, not committed); "run 013" etc. are
the earlier 1180×820 run in `scratchpad/prologue/`.

| Robot s | Elof | Where | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| – | 0:00–0:30 | Title | A menu over the blurred kitchen: the game's name, "Måla Pappas nya träspöke.", Börja; then "Hur vill du spela?" (P1; `main.ts:566`, `title.ts:113-117`) | Menus |
| 0.0 | 0:30 | Kitchen floor, x 1 | Four box figures and Elof in a row; a 1-EL ghost with no eyes on the floor by shavings and a striped bag; the shelf, its empty first place under the bubble. Pappa "Jag har täljt ett spöke. Måla ögonen!", then Mamma "Ditt lördagsgodis får du öppna ikväll." both fire on the first step (`ends.ts:94-95`, spawn x 1): 8.5 s of reading, Pappa's bubble over his head (P2) | A family, a wooden figure, a bag. That Pappa made it and whose bag it is: only in words |
| 0.9 | 0:35–1:15 | x 3.6 | Two modal paint panels, one per eye (`sim/story-stroke.ts:4-6`), notice "Ett öga till liv!" between (P3, `main.ts:182`) | "I paint eyes on a picture of a ghost"; the result on the carving is a dot of a few pixels (P4) |
| 0.9–3.5 | 1:15 | x 3.8 | Held 2.6 s: a dotted look from the ghost to the empty place, then to the bag (`ends.ts:44-45`; P4) | It wants something up there, and the bag |
| 3.5 | 1:18 | x 3.8 | The floor bag shrinks away and one appears on the ghost (`props.ts:455-459`, `view.ts:968`); Pappa, Moa and Bertil vanish (`prologue-stage.ts:58-62`); Elof "Pappa! Spöket tog min godispåse!" | It took my bag. Where did everyone go? |
| 3.7–6.3 | 1:20 | x 4.2 | Held 2.6 s: Mamma crosses the doorway, the ghost topples flat, then runs (`sim/prologue.ts:18-20, 51-53`; run 013) | The freeze joke |
| 6.5 | 1:25 | ghost at x 8.4 | `bag:torn`: candy pops out behind the running ghost; HUD "Följ godisspåret till stjärnan." (`sv.ts:122`) | Candy falls out behind it. The tear itself is not seen |
| 6.5–16.3 | 1:25–2:00 | x 4 → 38 | Chase: 17 candies, the door sill hop at x 29.8, the veranda, the step down at x 38. Elof alone | Play; the ghost ahead |
| 16.3 | 2:00 | x 38.6 | The family stands on the deck; Moa "En stjärna föll ur påsen!"; the star drops by the ghost (run 030; P5 at phone size) | A star, from the bag |
| 16.8 | 2:05 | x 41 | "Ta" → a 2-s arc up a 3.2-EL step while he shrinks in glitter (`ends.ts:74, 77`); Pappa "Stjärnan gör dig liten. Vi hjälper dig!" on the touch, cutting Moa's line when he is quick (run 033) | He touched the star and got smaller |
| 18.8–21.8 | 2:10 | x 45 | Held 3 s: Pappa's box arm lifts the ghost onto the railing; it sneaks off and shrinks away; Pappa "Jag ser dig. Vi håller ihop." (P6) | Grown-ups can't catch it |
| 21.8 | 2:13 | x 45 | Pappa "Vi följer stigen och hjälper dig." queued; about 0.1 s on screen in the robot's run before the card | – |
| 23.6 | 2:15 | x 50.6 | Goal beside the deck's back wall (ground to y 10 at x 52, `ends.ts:64-65`; run 042); the card 1.4 s later (`main.ts:888-889`) | – |
| 25.0 | 2:17–2:35 | Card | "Lördagsmorgon", 17 candies in rows of ten, a near-blank map, "Ut på gården …", Nästa kapitel, a code, Spela igen; at 844×390 it opens scrolled to its buttons (P7, run 043) | A level is over |
| Gården 0–0.8 | 2:40 | Gården x 1–3.2 | Pappa's two last lines again (`garden.ts:371-372`), and no Pappa in the picture (P8) | – |

- **Without the player's hands:** 5.4 s after the second eye (timeline 0.9 → 6.3) and 5 s at the shrink (16.8 →
  21.8). Both are inside the 8–10 s rule; the paint panels stop play on top of that.
- **Longest stretch where nothing tells the story:** the chase from 6.5 to 16.3 robot seconds, about 35 s for Elof.
  The trail and the ghost carry it as play; what is missing is any answer to Elof's shout: the family is gone.
- **How it ends:** the last image is tiny Elof walking past Pappa's legs towards a plank wall, in a room drawn as the
  kitchen's interior (`place: 'home'`, run 042, P6); the garden is never seen. The card covers it 1.4 s after the
  goal, and Pappa's second line has usually not been read.

## 3. What is good, and stays

- **The causal chain exists, in order, on saved flags:** paint → blink → look → theft → Mamma's freeze → tear at the
  doorway → trail → star from the bag → shrink beside the family → Pappa's railing joke → reassurance
  (`ends.ts:93-101`, `sim/prologue.ts:15-37`). The new intro re-stages it; it does not replace it.
- **The look line** (`view.ts:1590-1630`, `ends.ts:45`): dots from the ghost's eyes to a pulsing ring at the empty
  place, then the bag. Wordless and readable at phone size (P4). Keep it, inside a close-up.
- **The trail pops out behind the running ghost** (`candy.ts:308-309`, `droppedThrough` = the ghost's x): the trail
  is visibly caused by the theft.
- **Mamma's freeze-topple** (`sim/prologue.ts:51-53`, run 013): the clearest comic beat in the prologue.
- **A deterministic prologue clock**: poses are read from the simulation's frame seconds (`sim/prologue.ts:48-62`,
  `prologue-stage.ts:56-103`), so pause and WebGL recovery freeze every actor. It is the right base for every new
  shot below.
- **Short holds and an invisible tutorial**: holds ≤ 3 s (`tests/robot/ends.test.ts:126-127`), and the hand shows a
  control only when he is idle (`app/tutorial.ts:21-29`).
- **Forgiving painting**: any stroke of 3 px finishes an eye (`sim/story-stroke.ts:28-32`). Keep the rule in the
  in-world version.
- **The striped Saturday bag** stays distinct from the carved pocket in every chapter (`saturday-bag.ts`,
  `view.ts:967-973`).
- **No long walk between the shrink and the family's acknowledgement** (`view.ts:858-865`), as the overhaul asks.
- **The music**: the prologue's solo pluck with a knife stroke every second bar (`audio/music.ts:65-66, 140`). Tie
  it to Pappa's hands on screen.
- **Candy rules hold**: nothing is eaten; Mamma's "ikväll" sets the Saturday-evening rule; the album's first photo,
  "Liten som en godis" (`photos.ts:9`), marks the shrink.

## 4. Findings

**The three judgements asked for.**
- **The title card is in the wrong place.** The game's name is a menu heading before anything happens (P1), and the
  prologue ends on a level card. The plan puts the title after the shrink and Pappa's promise (§1 "The first
  minutes", §3.4 beat 6), which is where Ori holds its title: once the player cares. Move it (shot 18 below).
- **The "Lördagsmorgon" card hurts the landing.** It arrives 1.4 s after the goal, cuts Pappa's last line and turns
  the peak into a tally of the candy from a bag that was just stolen, plus a code and "Spela igen"; at 844×390 it
  opens scrolled to its buttons, so even its title is not seen (P7). The prologue should run in one breath into
  Gården with the title card as its only boundary.
- **The paint panel takes him out of the moment.** The world disappears behind a modal sheet with a generic ghost
  drawing (no fists, bag or shoes), a sentence, a ✕ and a 28-px ring, twice (P3). Rule 1's act happens on a
  picture, not on Pappa's carving, and its result on the carving is a dot of a few pixels on a phone (P4).

| # | Where | What is wrong | The fix | Built as | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First start: `main.ts:566`, `title.ts:113-117`, `shell.ts:158-175`; P1 | The first two screens are menus: a title panel with the name and a quest line ("Måla Pappas nya träspöke."), then the play-style choice. | Fresh profile: a quiet first screen (Börja over the dim kitchen; no name, no story block). The style choice moves to just after the title card (question 1). Resume keeps today's title. | ui (`title.ts`, `shell.ts`), `main.ts` | S | 2 |
| 2 | Opening: `ends.ts:37-41, 83, 94-95`; P2 | Pappa only says he carved it: no table (the ghost stands on the floor), no knife, no hands; shavings lie on the floor. Both bubbles fire on the first step, and his hides his head. Olov's first wish is missing. | Shots 1–4: the shelf pan to the empty place; Pappa carving at a stand-in oak table in morning sun (strokes away from his body, a curl on each knife beat of the music); the last facet; the brush held out. No opening bubble from Pappa. | New timed scene (frames in `sim/prologue.ts`, poses in `prologue-stage.ts`), a table ledge and props in `ends.ts`; final hands: Blender on Olov's computer | L | 3 |
| 3 | Kitchen: `prologue-stage.ts:56-71`, `ends.ts:28` | No cosy moment: the family stands in a row; Bertil's hand at the bag (plan §3.4 beat 1) is not built, so whose bag it is is only said. | Shot 3: each has wordless business (Mamma's coffee, back turned; Moa's crayons; Bertil leaning in). Bertil's hand creeps to the bag; Använd "Dra" pulls it back and Elof hugs it; Mamma's existing line is triggered by that, not by the spawn. | `ends.ts` spot, `prologue-stage.ts` loops, beat `on:` the new flag | M | 3 |
| 4 | Paint panel: `ui/story-stroke.ts:5-28`, `ui/story.ts:95-102`; P3, P4 | See the judgement above. The cause "Elof's eyes woke it" is not seen in the world. | Shot 5: a camera zone frames the carving's face at ≥ 40 % of the screen between Pappa's thumbs; two dotted rings glow on it; one finger stroke per eye on the canvas (any stroke finishes) or Använd once per eye; glossy eyes appear on the model. The panel stays only as the accessible fallback. | View code (rings projected with `worldScreen`, canvas pointer input), camera zone, the model's eye nodes (`eyeNodes`) | L | 3 |
| 5 | Awakening: `ends.ts:44`, `view.ts:945-947`, `audio/cues.ts:164-215` | Nothing magic happens at the second eye: no blink, no "Pling" (no such cue), no head turn, no close-up; the stand-in starts to sway. | Shot 7: 1 s of silence, Pling, the eyes blink (eye nodes squash and open), a shiver and a puff of sawdust, a head tilt at Elof, then the existing look line. | View code, an audio cue | S | 3 |
| 6 | Theft in full view: `prologue-stage.ts:58-62`, `view.ts:834-838` | The ghost wakes and takes the bag with all four family members in the shot, against rule 2; at `blink` Pappa, Moa and Bertil vanish, and Elof shouts "Pappa!" at the place Pappa just stood. | Shot 6: after the second eye Mamma waves from the hall; Pappa ruffles Elof's hair and goes out with Moa and Bertil. Elof is alone with the ghost: the waking is his secret, and his shout is what brings them out later (row 10). | `prologue-stage.ts` walk-out on a new frame | M | 3 |
| 7 | Magic candy: `saturday-bag.ts`, `view.ts:967-973`, `props.ts:455-459` | Rule 3's set-up is missing: the floor bag shrinks away and a twin appears on the ghost; no candy starts to glitter, and the golden geléhallon that "glints there all game" is never seen. The star's power has no cause in the picture; the finale's golden candy has no set-up. | Shot 8: the ghost grips the bag, a spark jumps from its fists into it, a gold star and a gold-wrapped geléhallon light up inside and twinkle through the paper. The geléhallon's glint stays on the stolen bag in every chapter. The ghost carries the same bag (no swap). | View code (a glow part in `saturday-bag.ts`), candy kit | S | 3 |
| 8 | Tear: `saturday-bag.ts:35`, `prologue-stage.ts:32`, `sim/prologue.ts:36` | The trail's cause is a 0.11-EL tear and a 0.3-EL scrap on the hinge, with no sound or camera beat: a few pixels at 844×390. | Shot 10: the bag snags on the hinge, two tugs, rrrip, a paper strip flaps on the hinge, a jagged 0.25-EL tear; the camera keeps the door in frame for 1 s. | View, audio cue | S | 2 |
| 9 | Purpose line: `sv.ts:122`, `story-context.ts:36`; P5 | From `bag:torn` the HUD says "Följ godisspåret till stjärnan." before any star exists: a spoiler that turns the accident into a goal, against the overhaul ("the accidental magic is not recast as an instruction"). | `starTrail`: "Följ godisspåret efter spöket." Recap: "Påsen gick sönder. Godiset visar vägen." | `sv.ts` | S | 2 |
| 10 | Family arrival: `prologue-stage.ts:59-69` | When Elof passes x 36 the family is standing on the deck; nothing brought them. | Shot 11: the veranda door bangs open behind him and the family comes out to his shout; the grown-ups' look freezes the ghost on the top step (the second freeze). | `prologue-stage.ts` entrance keyed to the ghost reaching the steps | M | 2 |
| 11 | Star: `ends.ts:61-63, 74`, `app/tutorial.ts:23` | The shrink is a pick-up at a standstill ("Ta" at x 41; the Använd hand after 3 s still), gated by a step only the star's ride crosses. Olov: "as Elof chases after it, he suddenly shrinks". | Shots 11–12: the star tumbles out of the toppled bag, bounces towards him and hovers at his hand height; Använd shows the near-catch verb "Ta!" and pulses; a lunge catches it in the air; untouched for 3 s, it drifts into his hands. Never from the ground. | `ends.ts` + sim (a hovering catch spot with an auto-catch timer) + view | M | 3 |
| 12 | POFF: `ends.ts:77, 98`, `view.ts:807-815, 858-865`, `hud.ts:123-127`, `photos.ts:9` | The explanation comes in words, before the effect, in the present tense ("Stjärnan gör dig liten …" on the touch) and, when he is quick, cuts Moa's line short. The shrink is a 2-s arc in a fixed medium shot with no sound; the camera does not drop with him. The album photo is taken 0.55 s after the touch, mid-air. | Shot 13: close on his hands; glitter runs up his arms; he looks at them; POFF; a 1-s crane down to the planks while the boots rise round him. After it: Pappa "Stjärnan var visst trollgodis!" (shot 15). The album photo at the low shot among the boots. | New timed scene, camera rail, audio cue, `sv.ts`, `photos.ts` | M | 3 |
| 13 | Scale: `ends.ts:34, 62-63`, `family-rehearsal.ts:9-20`; P2, P5 | The shrink is 3× in the picture (the simulation is always 1 EL): before it the ghost is a third of Elof's height (a 40-cm carving), after it Pappa is only about 5× Elof, and the step he lands on was already as tall as big Elof. The Saturday bag is 0.63 EL (`saturday-bag.ts:27-30`), shorter than the ghost. Canon: the ghost is ~15 cm and exactly tiny Elof's height, about an eighth of Elof, and the bag about twice the ghost's height (§2.2, §5.2). | Before the POFF draw the ghost at 0.4× on the table, with the bag twice its height; the crane hides the ghost's return to 1×; the bag stays twice the ghost's height in every chapter (cross-area); after the POFF draw the family at 2.5× (adults ~13 EL, faces leaning in at ≤ 40 % of the screen, §2.3). Land him on a plank at the deck's edge, not on a 3.2-EL step. | View (per-phase scale of ghost and family), `ends.ts` | M | 2 |
| 14 | Worry: `prologue-stage.ts:73`; P6, run 036 | The reaction is Pappa's box squashed to 74 % height (it reads as Pappa shrinking too); Mamma, Moa and Bertil stand still and leave the frame when Pappa's frame starts. Nobody gasps, kneels or comes close. | Shot 14: boots step close slowly; faces lean down one by one, each with its three-note motif (`MOTIFS`, `cues.ts`); Pappa last, his palm flat on the planks. Moa: "Lillebror?! Du är ju pytteliten!" | `prologue-stage.ts` kneel and lean poses (rehearsal), camera; final acting in Blender on Olov's computer | M | 3 |
| 15 | Support: `ends.ts:99-100`, `sv.ts:228, 242` | Support is two sentences; nothing is done together. | Shots 15–17: onto Pappa's palm and up to his face; then set down at the deck's edge; Pappa's finger traces the big path and the small trail ("Följ godisspåret. Vi är nära dig."); each picks up the thing they will help with (Moa's drawing, Bertil's cap, Mamma's headlamp, Pappa's knife, after `docs/research/narrative-craft.md`); Moa draws the map's first corner; a high-five on Pappa's fingertip. | `ends.ts` (palm ledge, spots), new frames, `sv.ts`, `ui/map.ts` | L | 3 |
| 16 | Railing joke: `view.ts:858`, `prologue-stage.ts:30-31, 48-55, 86-94`; P6 | The fixed shot lets go as Pappa starts, so the camera moves during the joke and drops the family; his reach is a box stick, and with the private Pappa model on the site the box hand and arm still show (`replace()` swaps only the body). | Shot 16, from Pappa's palm: the ghost tiptoes off behind his back; Elof points (Använd "Peka") and everyone turns to an empty railing. Hide the box arm whenever a model is installed. | View camera, `prologue-stage.ts` | S | 2 |
| 17 | End card: `main.ts:888-905`, `hud.ts:150-183`; P7 | See the judgement above. | No card after the prologue: the title card (shot 18) is the boundary and the save. Chapters change by a page load (`main.ts:623-631`), so the title must also be what the loading card shows for that load (`index.html` `#loading`), or the hand-off flashes the loading ghost. The Gården code moves to the pause panel. | `main.ts` (a "title instead of card" chapter option), `index.html`, ui | M | 3 |
| 18 | Gården's first seconds: `garden.ts:371-372`; P8 | Pappa's two last lines are said again at x 1.0 and 3.2 by a Pappa who is not in the picture. | Delete the two Gården beats; show the family's boots on the deck for Gården's first 4 s, walking off along the house wall, Moa's hand waving last (shot 19). | `garden.ts`, view (a leaving stand) | S | 2 |
| 19 | Moa in Gården: `garden.ts:374`, `sv.ts:244` (cross-area) | "Lillebror?! Du är ju pytteliten!" is a discovery line, but Moa watched him shrink. | Move it to the POFF (row 14); in Gården: "Där är du ju, lillebror!" | `sv.ts`, `garden.ts` | S | 2 |
| 20 | Outdoors: `ends.ts:32, 67`; P5, P6, P8 | The deck where he shrinks is drawn as the kitchen's interior (pale panelled wall and window), while Gården starts on the same deck outside the red house (P8). | From the deck on (x ≥ 38) draw the outside: daylight, the red wall, the garden beyond, as at Gården's start. | View (a place look per stretch) | M | 2 |
| 21 | Sound: `audio/cues.ts:164-215` | No cue for the blink, the tear, the star's spill, the catch, the POFF or the lift: the shrink is silent. | Synthesised cues: Pling (glass), rip (0.25-s noise), a rising ting per star bounce, POFF (soft puff and a falling glissando), a creak for the sneak. | `cues.ts`, `audio.ts` | S | 2 |
| 22 | Bubbles over faces: `hud.ts`, `ui.css:810`; P2, P5, P6 | At 844×390 the two-line bubble at the top centre covers or crowds the heads of Pappa and Mamma in every family shot. | Frame authored shots with faces below the bubble band (camera lift), or give the bubble a tail beside the speaker in authored shots. | Camera data, `hud.ts`, CSS | M | 2 |
| 23 | Shelf: `ends.ts:36`; P2, P4 | The empty place is a pale rectangle at the frame's top, under the bubble until the look. | Shot 1 ends on it: a clean ring in the dust where a round base stood, out of the bubble band. | View (shelf prop), camera | S | 2 |
| 24 | Before painting: `view.ts:945`, `prologue-stage.ts:59`, `tests/robot/ends.test.ts:62` | He can walk out to the deck before painting; the family then jumps to the deck, and the lifeless carving turns to face him. | Keep the hall door shut until the ghost butts it open in the theft; freeze the carving's turn until `blink`. | `ends.ts`, view | S | 1 |
| 25 | Helper button: `shell.ts:54-55` | The prologue shows the jay's help button, a bird Elof meets only in Kapitel 2 (§3.2, §4.6). | Hide the helper in the prologue; the tutorial hand does that job. | Chapter data, `shell.ts` | S | 1 |

## 5. The intro as a shot list

- **The emotional question:** what if the thing you love is taken and you are suddenly tiny? The answer at the
  title: you are small, but not alone, and only you can follow where the ghost goes.
- **The ghost:** wakes under Elof's brush, curious; its first look is at the empty place (the mystery's seed); it
  steals busily, not meanly, with one glance back; two freeze jokes teach rule 2. No picture bubble yet: the smudge
  begins in Gården.
- **The family:** cosy business; they leave him alone with the carving; they come at his shout; worry, a palm, a
  promise, and each picks up the thing they will help with.
- **The lore:** Pappa's hands carve and Elof's eyes wake (rule 1); the empty first place; two glittering candies in
  the bag (rule 3), the golden one set up for the finale; Moa's map begins here.
- **The set piece:** the catch and the POFF, with the camera dropping among the boots.
- **The ending:** shots 16–19 are the last thirty seconds, from the railing joke to the hand-off.

| # | Camera | Who and what (wordless) | Player's hands | Bubble | Sound and music | Length |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Close, level with the shelf; slow pan right to left | Morning sun on Pappa's figures (stand-in tomtar, a man with a broom, a woman in a headscarf, two athletes); the pan ends on the first place in the row: empty, a pale ring in the dust | None (a tap skips on replays) | – | A kitchen clock, birds outside; a knife scraping off-screen on the pluck's second beat | 5 s |
| 2 | Tilt down to the kitchen; medium-wide at big Elof's eye height | Stand-in oak table and white chairs. Pappa sits carving the ghost, every stroke away from his body, a curl falling on each knife beat. Mamma pours coffee into her heart mug at the stove, back turned; Moa colours at the table's end; Bertil leans on a chair. Big Elof comes in from the hall. For the curious: a child's drawing on the fridge of a boy holding a figure with a pointed cap | Walk to the table (the stick hand after 4 s still) | – | Knife strokes as the beat; coffee pouring | 5–15 s play |
| 3 | Same, closer on the table | The striped bag, twice the carving's height, stands beside it. Bertil's hand creeps towards it, with a sly look | Använd "Dra": Elof pulls the bag to his side and hugs it; Bertil grins. (Nothing for 4 s: Bertil pats it and lets go) | Mamma, not turning round: "Ditt lördagsgodis får du öppna ikväll." with a picture card of a moon over the bag | Paper crinkle; Mamma's babble; Bertil's giggle | 5–8 s play |
| 4 | Close: Pappa's hands and the carving fill the lower half | The last facet; Pappa blows the shavings off, turns the carving to face Elof (a blank face), dips a fine brush in black paint and holds it out, handle first | None; then Använd shows "Måla ögonen!" | – | The last knife stroke on a downbeat; the music holds | 4 s |
| 5 | Closer: the carving's face at ≥ 40 % of the screen, Pappa's thumbs steadying it | Two dotted rings glow on the face; Elof's brush hand at the frame's edge | Trace each ring on the screen (any stroke finishes), or Använd once per eye; each eye appears glossy black with a white dot | – | A brush swish; a rising pluck per eye | 5–20 s play |
| 6 | Medium at the table | Mamma waves from the hall; Pappa sets the carving down facing Elof, ruffles his hair and goes out with Moa and Bertil; Moa waves back once. Elof stays | None | – | Footsteps fade; the music thins to one held note | 3 s |
| 7 | Low over the tabletop at Elof's eye height, his shoulder in the foreground | Pling: the eyes blink. A shiver runs through the wood, sawdust puffs from the hood, the head tilts at Elof. It looks up at the empty place (dotted look line and ring), then at the bag at Elof's elbow | None (Elof steps back, surprised) | – | 1 s of silence, Pling (glass), two wooden creaks | 4 s |
| 8 | Same, a little wider | It darts across the table and grips the bag; a spark jumps from its fists into the bag, and a gold star and a gold-wrapped geléhallon light up inside, twinkling through the paper. It wobbles, hops off the table (klonk), glances back once, drags the bag to the hall door | Control returns as it lands | Elof: "Pappa! Spöket tog min godispåse!" | Grab knocks; a shimmer as the candies light; the chase layer's wood knocks start on the next bar | 3 s |
| 9 | Follow camera, wide (big Elof a third of the frame) | It butts the door open. Mamma passes in the hall with her mug and glances in: it freezes mid-hop and topples flat. She frowns at the "toy", steps over it, walks on; it scrambles up and runs | Held, as now | – | Klonk; Mamma's puzzled babble | 2.6 s |
| 10 | The door frame kept in view for 1 s, then the follow camera | The bag snags on the hinge, two tugs, rrrip; a paper strip flaps on the hinge; candy pours from the tear behind the ghost through the glazed veranda; the two glints stay inside | Chase; candy goes into his backpack; hop the veranda door sill (the Hoppa hand after 3 s at it) | – | Rip; pickups climbing the scale; the chase layer | 20–40 s play |
| 11 | Wide on the deck outside: big Elof at left, the steps and the garden at right, the red house wall behind | The veranda door bangs open behind him: Pappa, Mamma, Moa and Bertil come out to his shout. The grown-ups' look freezes the ghost on the top step; it topples, the bag tips, the star tumbles out of the tear and bounces towards Elof, glittering, to hover at his hand height | Running; control continues | – | Door, footsteps, klonk; a rising ting on each bounce | 3 s in play |
| 12 | Medium on Elof and the star; the family's legs behind | The star bobs in front of him | Använd "Ta!" pulses: a lunge catches it in both hands. Untouched for 3 s, it drifts into his hands | – | A bright sparkle on the catch | 1–3 s play |
| 13 | Close on his hands and face, then a 1-s crane down from his eye height to the planks | Gold glitter runs from the star up his arms; he looks at his hands, eyes wide; POFF: a puff of gold, and he stands tiny, the carving's size, a few sparkles left on his shoulders. The family's boots stand round him like trunks | None | – | The music stops; a rising shimmer; POFF (soft pop, falling glissando); 1 s of quiet | 3 s |
| 14 | Low at tiny Elof's height, up between the boots; the giants soft | Pappa, puzzled, picks the toppled "toy" and the bag off the step and sets them on the railing. Then the faces lean down one by one, none over 40 % of the screen: Moa on her knees, hands on cheeks; Bertil, cap pushed back; Mamma kneeling, hand on heart; Pappa last, his open palm flat on the planks in front of Elof | Walk onto the palm (Använd "Kliv upp" if he stops at its edge) | Moa: "Lillebror?! Du är ju pytteliten!" | Gasps ("oj" in babble); each face's three-note motif as it appears | 5 s, then play |
| 15 | Rises with the palm to Pappa's face (soft, ≤ 40 % of the screen), the others at the edges | Pappa looks closely, worried, then smiles; Mamma's fingertip smooths Elof's hair; Bertil's thumbs-up | Tap Elof to wave, and they all wave back; the stick turns him | Pappa: "Stjärnan var visst trollgodis!" | A warm pad; Pappa's motif | 4–8 s |
| 16 | Low over the palm, the railing behind Pappa's shoulder | While everyone looks at Elof, the ghost peeks, takes the bag and tiptoes off behind Pappa's back | Använd "Peka": Elof points, everyone turns to an empty railing; Bertil laughs, Pappa scratches his cap | – | Tiptoe knocks; a cheeky double knock off-screen; laughter babble | 4 s + press |
| 17 | Medium-low at the deck's edge: the garden below like a country, the first trail candy on the step down | Pappa sets Elof down; his finger traces the big path round the house, then the small trail into the grass. Moa draws a red house, "Hemma" and a little Elof and holds it up (it becomes the map); Bertil tugs his cap, Mamma packs her headlamp, Pappa pockets his knife. Pappa holds out a fingertip | Använd "Klappa Pappas hand": a two-handed high-five on the fingertip | Pappa: "Följ godisspåret. Vi är nära dig." Bertil: "Heja lillebror!" | Crayon scribble; the clap; the theme gathers | 5 s + press |
| 18 | Rises and pulls back over the deck's edge: tiny Elof in front, the family behind (legs, waving hands), the garden below, the mountain and its old pine on the horizon | The ghost's red shoes and the twinkling bag vanish into the grass. The title "Elof och det stora godisäventyret" appears as if carved into a plank, letter by letter, curls falling | None (a tap goes on once it has settled) | – | The whole theme for the first time: pluck and string pad | 5 s |
| 19 | Gården's opening framing, low at his height on the deck | The family's boots walk off along the house wall (the big path), Moa's hand waving last; the ghost peeks from the first step and runs | Full control; purpose line "Följ godisspåret ut på gården."; saved here; no card | – (no repeated lines) | Gården's arrangement starts on the next bar | play |

About 2:30–3:00 for Elof, as the plan's 2–3 minutes. The longest run without his hands is shots 6–8 (10 s);
everything else is 8 s or less. Six bubbles instead of seven, none repeated in Gården; four are existing strings.
In `sv.lines` five strings go (`newGhost`, `fallenStar`, `tinyElof`, `follow1`, `follow2`) and three come:
`Stjärnan var visst trollgodis!` (30 characters), `Följ godisspåret. Vi är nära dig.` (33) and Gården's
`Där är du ju, lillebror!` (24).

**The cause of shrinking without reading:** shot 8 (magic from the ghost lights two candies), 10 (they glow
through the tear), 11 (the star is the only glittering candy, and it falls out), 12 (he catches it), 13 (the
glitter climbs his arms, POFF, the camera drops), 14 (the family's shock confirms it). Canon kept: his painted
eyes wake the ghost (5–7); the trail candy goes into his backpack and the star is caught in the air: nothing from
the ground is eaten, and Mamma's line keeps the bag shut until evening; the knife cuts away from the body (2).

**Building the shots.** There is no cutscene system; extend `PrologueSequence` (`sim/prologue.ts`) from two
frames to a list of authored frames (id, after which flag, seconds, input none or free or one press), each with a
pose function in `prologue-stage.ts` and a camera in `view.ts`, all on the simulation's clock so pause and
recovery stay safe. Replace the test that a hold is ≤ 3 s (`tests/robot/ends.test.ts:127`) with: an authored frame
≤ 5 s, and never more than 10 s between two moments that read input. The prologue's robot and browser checks
(`tests/robot/ends.test.ts`, `tests/browser/prologue.mjs`, `opening-story.mjs`) change with it.
**Stand-ins:** the kitchen (table, chairs, stove, hall door), the glazed veranda, the deck and the shelf's figures
are plain stand-in shapes here. The real kitchen, veranda and house (§2.5) and Pappa's own figures
(`some-trägubbar.png`) are likenesses built in Blender on Olov's computer, and so is the family's final acting
(carving hands, kneeling, the palm lift, the crayon drawing); box rehearsals stand in until then.

## 6. Gameplay that tells the story

1. **Painting on the carving.** Tracing the eye with his own finger on Pappa's carving, held in Pappa's thumbs, is
   rule 1 in one picture: Pappa's hands and Elof's eyes. Use the same gesture for the crowberry eyes on the summit
   and his own figure in the epilogue, so the three paintings rhyme.
2. **Pulling the bag back from Bertil.** The want of the whole game in one tug: it is *his* bag. The same "Dra"
   later pulls the ghost out of the eddy, and the bag he guarded is the bag he shares on the summit.
3. **The catch.** His own reflex makes him small: complicit, never guilty, because it was a falling star. "Ta!"
   comes back as the near-catch verb in Gården: the button that shrank him almost catches the thief.
4. **Stepping onto Pappa's palm.** The first thing tiny Elof does is trust. The hand that carved the ghost (shot 2)
   holds him (shot 15), and carries him home on its shoulders in the finale; the fingertip high-five can return
   there as a full-size one.
5. **Pointing at the empty railing.** Only Elof sees what the grown-ups cannot. The press explains, by playing it,
   why he must follow alone (rules 2 and 8) and why the family's help is to stay near on the big path.

## 7. The five to do first

Each is one pull request with one visible outcome.

1. **The title card instead of the end card** (rows 17, 18, 19, 1): the carved title over the garden after the
   promise, no "Lördagsmorgon" card, Gården without the repeated lines. M; the landing improves at once.
2. **The cause of shrinking** (rows 7, 8, 9, 11, 12, 21): two glittering candies at the grab, a visible tear, the
   star caught in the chase, the close POFF with the camera crane and its sound, Pappa's past-tense line, the
   purpose line fixed. M.
3. **The family's worry and promise** (rows 10, 14, 15, 16, 20): leaning faces and motifs, the palm, the
   railing joke from the palm, the plan, Moa's map, the high-five, on the outdoor deck. L in rehearsal; final acting
   on Olov's computer.
4. **Paint the eyes in the world, and wake the ghost** (rows 4, 5, 13's ghost scale): the close-up, rings on the
   carving, Pling, blink, shiver, the look. L.
5. **The opening at the table** (rows 2, 3, 6, 23): the shelf pan, Pappa carving, the cosy business with Bertil's
   hand and Mamma's line, the family called away before the blink. L; final hands and kitchen on Olov's computer.

## 8. Questions for Olov

1. **The play-style choice** is on the first screen by your decision (§4.1). May it move to just after the
   prologue's title card, so that Elof's first touch lands in the kitchen? The prologue needs no hard jumps, and
   Lugnt only matters from Gården. Default if unanswered: it stays first, and only the story text leaves the first
   title.
2. **A real family gesture.** Is there one Elof would recognise (a special high-five, a wave, Mamma's heart sign)
   for the promise on the deck? It is personal, so it is asked first; otherwise a plain high-five on Pappa's
   fingertip.
3. **The empty place** (already open in §0, "Kvar att svara på" 1): if Pappa's real first figure still exists, the
   ring in the dust on the shelf should match its base.
