# Berget (Kapitel 4): narrative and gameplay audit

5 October 2026. Chapter id `berget`, `src/content/chapters/berget.ts`. Measured with the robot timeline harness
(60 Hz, `?dev` data) and eight pictures of the running game at 844×390, Low, stand-ins. Times in "robot s" are
game seconds from the timeline; "child" is an estimate for Elof at the plan's pace (Berget and the final together
15–20 min, plan §4.9), not a measurement. "Shot N" is `N-*.png` in the session scratchpad's `audit-berget/` folder
(not committed): 1 flight, 2 cliff with the thought, 3 just after *Lyft*, 4 the memory open, 5–6 after the memory,
7 at x 156, 8 the card.

**Verdict.** A seven-year-old flies fourteen seconds on a grey crane over a pretty, anonymous valley, climbs
granite, rings five singing stones, hides from gusts behind boulders while the ghost hops ahead, presses *Lyft*
once at a cliff, climbs a lace and touches a glowing shaving that plays memory 4 in silence; about three seconds
after the memory, the card. He understands the facts: his first trägubbe was lost in a crack on this mountain when
he was small, and "Spöket vill hämta hem min trägubbe!" (a bug even prints that line over the memory before its
pictures have told it). He does not get the feeling. The flight does not look back over his journey (no forest,
brook, bog, bells, house or family below). The cliff offers one button, and the HUD has already given the answer.
The ghost never visibly struggles, is never lifted and never lowers anything. The family is absent from the whole
chapter. The crack beside the pine, which the memory is about, does not exist in the chapter. And the saddest
picture in the game is followed by a bright major-key jingle, a ghost that shrinks to nothing and a silent card.
Most missing: **the crack with a comforting coda at it**, and **a cliff where helping is felt in the hands**.

## 2. As it plays now

| Robot s | Child (est.) | Place (x) | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0.0–14.0 | 0:00–0:14 | flight 1→72 | The chapter opens already riding: the ride is a touch spot at the spawn (`berget.ts:185`), 14 s (`:33`). Elof stands on a grey stand-in crane; 17 candies on the arc; a valley with a lake, a mire, a river and clear-cuts below (`backdrop.ts:880–928`); album photo "På tranans rygg" at 2 s (`photos.ts:13`). The HUD says "Följ spöket uppför berget." with no ghost in sight. (Shot 1.) | "I fly on the crane to a mountain." Not where he came from, that it is evening, or that his family follows. |
| 14.0–14.3 | 0:14 | landing 72 | The crane shrinks to nothing in its last 0.7 s (`view.ts:753`). The ghost on the shoulder (perch 0, default 4 EL, `constants.ts:105`) hops off the moment he lands. | The ghost is ahead again. |
| 14.5–21.8 | 0:15–1:30 | shoulder, slabs 72–94 | Big candy 0; two slabs; the optional rock shelves; the ghost hops 87 → 93 → 109.6. | Climbing. No story. |
| 22.6–24.9 | 1:30–2:30 | cobbles 97–106 | Five cobbles ring G A B D E as he walks (`berget.ts:187`); an optional ring swings over them. | A toy that sings. Its meaning comes only at the party (`ends.ts:181,195–197`). |
| 25.1–43.7 | 2:30–6:30 | open granite 108–138 | Gusts every 4 s with streaks 1 s ahead (`berget.ts:193`); the ghost waits boulder to boulder (perches 109.6, 120.4, 130.8, 140); big candies 2 and 3. | Hide behind stones; the ghost shows where. |
| 43.7–45.6 | 6:30–7:00 | cliff 139–145 | At x 139 the HUD turns to "Hjälp spöket uppför klippan." (`story-context.ts:91`, `sv.ts:158`). The ghost stands, sways and taps a foot, as at every perch (`view.ts:944–949`). Its thought card (the lonely figure) shows once it has settled within 5.5 EL (`ghost-thought.ts:15`): about 1 s for the robot, 1–3 s for a running child. *Lyft* is offered at x 142.6. (Shot 2.) | "The ghost wants up. I press Lyft." The heavy bag, the struggle and any choice: not seen. |
| 45.6 | 7:00 | cliff | *Lyft*: Elof does not move; the ghost hops 5 EL up in 1.3 s (`sim.ts:676`), through the rock face (shot 3); its thought vanishes (`until: 'lift'`); the lace appears at 145.7 while the ghost lands at 151 (`berget.ts:166,206`). | "It got up by itself, and a rope came." Who lowered it: not seen. |
| 45.6–52.6 | 7:00–7:30 | lace, top 145.7–151.8 | A 5-EL climb; big candy 4; the ghost hops to 159 under the pine at 51.9 s. The cairn (C4) is above, optional. | — |
| 52.6 (+10 s paused) | 7:30–7:40 | 151.8 | The shaving (`:190`, x 153) is touched 1.2 EL early. Memory 4: four sepia cut-outs, 2.4 s each (`memory.ts:73–78,107`), in silence (`main.ts:764,818`), growing from a ghost in mid-hop. Elof's line is already shown over the memory's title (`hud.ts:141`, `main.ts:885–886`; shot 4). | The photo, the gust, the crack, Pappa reaching, the last jelly, the figure alone. Mostly understood, without sound. |
| 52.6–54.1 | 7:40–7:43 | 151.8→157 | The bubble runs on; at the goal a bright C-major arpeggio (`audio.ts:295–297`, `cues.ts:162`). | "We will fetch it." |
| 54.1–55.5 | 7:43–7:45 | 157→159 | With the stick held, Elof walks on; at 157.4 the ghost, out of perches, is "gone" and shrinks away (`sim.ts:670–672`, `view.ts:939`). Card 1.4 s after the goal, music stopped (`main.ts:889–892`; shot 8). | The ghost has gone. The card. |

- **Longest stretch without story:** from the landing (14.3 s) to the cliff (43.7 s), 29 robot seconds and about six
  child minutes, broken only by the cobbles' notes: no bubble, thought, family or ghost act. The gust field alone is
  18.6 robot seconds (about 4 minutes).
- **How it ends:** the last picture before the memory is Elof on flat rock by the cairn with the ghost 7 EL away
  under the pine (shots 5 and 6); after it, about 2.9 s of walking (5.2 EL), a cheerful jingle, the ghost shrinking
  away if he keeps walking, a flat pink end wall at x 164 (shot 7), then the card in silence (shot 8: "Min trägubbe
  väntar"). The handoff text is right; nothing on screen is.
- The header comment `berget.ts:22–23` still lists memory 4 as unbuilt; it is built.

## 3. What is good, and stays

- **The order of the beats is right:** a big ride, a climb, an exciting sequence, the ghost stuck, the partner
  puzzle, the memory at the summit. Every proposal below keeps it.
- **The reveal is guarded properly:** the line comes only after the memory (`berget.ts:211`); "Hämta hem min första
  trägubbe." and the handoff "Min trägubbe väntar" depend on the memory flag (`story-context.ts:20,89,119`), with
  "Vid den gamla tallen" as a fallback. The line itself (35 characters) is clear and stays.
- **Memory 4's storyboard is right** (`memory.ts:73–78`): the photo by the rock, the gust and the crack with Pappa
  reaching, the last raspberry jelly and the wave, the figure smiling alone in the dark. It shows Pappa trying
  rather than blame, as `docs/research/narrative-craft.md` (l. 359–362) asks.
- **The ghost's thoughts escalate on schedule** (`ghost-thought.ts:46–69`): a mountain (Granskogen), the pine and a
  grey thing in a crack (Myren), the lonely figure with a pointed cap and a crooked smile and no eyes (Berget).
- **The gusts are fair and readable:** announced a second ahead, a push back to the last boulder, nothing falls, and
  on *Lugnt* only a slowing (`berget.ts:193`). The ghost waiting at the boulders is an invisible tutorial.
- **The cobbles pay off at the party:** Pappa's three lines are gated on having heard them (`ends.ts:181`).
- **The old pine and the cairn exist as models** (shots 5–7), and the hour moves towards rose along the chapter
  (`backdrop.ts:1069–1076`).
- **C4 is a good optional loop:** five shelves, a prize and a reusable return lace that never catches the main path.

## 4. Findings

| # | Where | What is wrong | The fix, concretely | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `hud.ts:128–149`, `main.ts:885–886`; the `fetch` beat | **Words, the reveal.** The comment says a line waits while a memory plays, but `tick(0)` still takes the next line off the queue: "Spöket vill hämta hem min trägubbe!" appears as the memory opens and sits over its title for ten seconds (shot 4). The conclusion is printed before the pictures tell it. | Never start a new bubble while `dt` is 0 or a memory is open. When the memory has shrunk back into the ghost's bubble, 1.5 s of quiet (plan §5.8: "a reveal gets 1–2 s of silence, then the motif"), then the line. | `hud.ts` (one guard), `main.ts` | S | 3 |
| 2 | `main.ts:764,818` (every memory; this one is the peak) | **Emotion.** The audio context is suspended while any panel is open, so memory 4 plays in total silence. Plan §5.8: "a memory gets a solo fiddle". | Keep audio awake for memories. A `memory` arrangement: the polska's first four bars, solo pluck, tempo 60, transposed −5, no bass. Picture 2 adds the existing gust whoosh, picture 3 a soft wooden tock as the jelly is set down, and picture 4 one low D with the wind under it, fading with the return. | `music.ts` arrangement, an exception to `audio.sleep` in `main.ts` | M | 3 |
| 3 | `berget.ts:130,136,151–155,190,207`; `norrsken.ts:47–60` | **Lore, clarity.** The memory is about a crack beside the pine, but Berget's ground is flat from 146 to 164 (the crack exists only in the final), and the shaving lies 7 EL short of the trunk. It is touched while the ghost is in mid-hop to 159, so the memory grows from a ghost in the air with no bubble (rule 1, plan §2.4). | Put the crack where the final has it. The final sees the pine "from its other side" with the crack under its crown, so in Berget it lies on the cairn side of the trunk: about x 155.3, 0.36 EL wide and 3 deep, as at `norrsken.ts:57–60`. Move the shaving to its near lip (x 154.6). The ghost's last perch goes on the far lip (x 156.2, `until: 'coda'`, `thought: { picture: 'lonely-figure', after: 'lift', until: 'memory' }`), so the memory opens from its bubble, at the place it shows. | Chapter data (ground, spot, perch); a chipped-lip prop in `props.ts` | S–M | 3 |
| 4 | `memory.ts:73–78,107` | **Emotion, story-driven animation.** Four static cut-outs, 2.4 s each, with only a 320-ms fade. At the moment of loss nothing moves: the figure is drawn already tipped (picture 2), and the light fading and the family walking down are only implied (picture 4). | Animate inside the existing SVGs with WAAPI; no new art, no likeness. 1: the sun sinks 8 px. 2: three pale streaks sweep across, then the figure tips 0→38° and slides 30 px into the crack (0.8 s), and Pappa's arm reaches twice. 3: the jelly drops onto the lip; little Elof's arm waves three times. 4: the top band darkens from `#8a6a44` to `#4a3a50`, the two figures walk 20 px off to the right, and in the last 0.6 s one small star fades in over the crack (the first hint of comfort). Still 4 × 2.4 s; *Mindre rörelse* shows the end states. | `memory.ts` | M | 3 |
| 5 | `memory.ts:47,75–77`; `berget.ts:129` | **Clarity.** The memory is drawn from the final's side (pine left, crack right), while in Berget the crack, once built, is on the cairn side of the trunk. The jelly lies on the crack's right lip in picture 3 (x 186) and on its left in picture 4 (x 108). | Mirror memory 4 (`scale(-1 1)`) so the pine stands right of the crack, as Elof sees it. Keep the jelly on the same lip in both pictures and the sun on the chapter's sunset side. When the memory returns, the present shows the same pine, crack and light: the place is the story's map (Edith Finch). | `memory.ts` | S | 2 |
| 6 | `berget.ts:136,207`; `sim.ts:670–672`; `view.ts:939`; `audio.ts:295`; `main.ts:889–892` | **The ending.** The card comes about 2.9 s after the memory. A bright C-major arpeggio plays 1.5 s after "alone in the dark". With the stick held, the ghost runs out of perches and shrinks to nothing at x 157.4. The card is silent. | Before the coda exists, as a quick fix: the last perch gets `until: 'coda'`, so the ghost never vanishes here, and `goalNeeds` waits for the coda's last flag. In Berget the goal jingle is replaced by the polska's last bar (E4 → D4) on a slow pluck, which rings 2 s into the card before the audio sleeps. | Chapter data; a per-chapter goal cue; `main.ts` | S | 3 |
| 7 | `story-context.ts:91`; `sv.ts:158` | **The choice, words.** From x 139 the HUD says "Hjälp spöket uppför klippan.", before the ghost has shown any need. The answer is given before the question. | Keep "Följ spöket uppför berget." until the stuck beat has been seen (`stuck:seen`, row 10), then show the help purpose. | `story-context.ts` | S | 2 |
| 8 | `berget.ts:166,188`; plan §3.4 P15 | **Brothers' lens.** "Två är starkare än en" is a single press, and "Elof could take the bag now" is never true: he never sees or holds the bag. | **The bag in his hands** (section 6, play 1). After the first lift, the bag drags the ghost back down, and it holds the bag out to him: *Håll påsen*. Carrying it, Elof walks at half speed and cannot jump, so the weight is felt in the hands. He sets it down to boost again (*Lyft*); the ghost climbs and lowers the lace. At the lace, *Knyt fast påsen*: the ghost hauls the bag up hand over hand, then lowers the lace again. Walking away with the bag is allowed; the ghost watches from the top, its bubble showing the lonely figure, and the lace waits. | Chapter data (spots with `needs`, `later` holds ≤ 3 s, flags), a carry state in the sim, view poses, `sv.ts` verbs. **Needs Olov's yes (Q2).** | L | 3 |
| 9 | `view.ts:944–949`; `sim.ts:676`; shots 2–3 | **Story-driven animation, cause and effect.** At the cliff the ghost idles as it does everywhere. On *Lyft*, Elof stands still and the ghost flies 5 EL up the wall in 1.3 s, through the rock. It plainly did not need help. | Staged poses. As Elof approaches, the ghost tries twice: it jumps, gets a fist on the rock, the bag pulls it down, it lands on its seat, slow creak (§2.2). On *Lyft*, Elof squats with cupped hands, the ghost steps in, Elof straightens (0.8 s), the ghost hooks the edge, kicks its red shoes and rolls over the top (1.2 s), then peeks down and double-knocks. A 2.5-s `later` hold covers it. | View code (a staged pose, as `prologuePose`); chapter data | M | 3 |
| 10 | `ghost-thought.ts:9,15,61–68`; `berget.ts:204` | **The ghost's mystery.** The lonely-figure card is 1.9 EL wide, and the figure in it is about 15 px at 844×390 (shot 2). A running child sees it for 1–3 s before *Lyft* appears, and the press clears it. | Make seeing it the gate. When Elof first comes within 3 EL, a 2.5-s `later` hold (`stuck:seen`); camera zone 140–146 at zoom 1.05, lift 1.2; the card at 1.6× size, showing two pictures in turn, 1.2 s each: the lonely figure in the crack, then Pappa's shelf with the empty first place from the prologue. "Hem" then means that place. *Lyft* gets `needs: 'stuck:seen'`. | Chapter data (`later`, camera, `needs`); `ghost-thought.ts` (scale, a `shelf-gap` picture) | S–M | 3 |
| 11 | `berget.ts:166,206`; shot 3 | **Cause and effect.** The lace appears at 145.7 while the ghost stands at 151: "it lowers the lace to him" is not shown. | A perch at the lace top (146.3, 31.4, `near: 1.0`). The ghost kneels there with the lace's end in both fists while it unrolls down the wall; when he tops out, it lets go and steps back. | Chapter data; view pose | S | 2 |
| 12 | `berget.ts:195–202`; `constants.ts:105`; timeline 14.3 s | **The bond with the ghost regresses.** After the eddy rescue and Myren's close waiting, the ghost keeps the default 4 EL here: it hops away the moment he lands, and leaves each lee as he arrives. The wind is followed, not shared. | On landing it waits and greets him with a double knock (perch 0 `near: 1.4`). At the boulders it waits in the same lee (`near: 1.6`), hugs its bag while a gust blows, and dashes on only right after a gust ends, so the two cross the wind together and the ghost shows the beat. | Chapter data; a gust check in `haunt()` | S–M | 2 |
| 13 | Whole chapter; `sv.ts:190`; `life.ts:141` (no mountain entry) | **The family bond.** From the flight to the card, the family exists only in the pause recap ("Familjen följer stigen upp …"). The plan has four headlamps under the flight and Mamma leading them up in the final. | The four headlamps as far life: crossing the bog under the flight, with the jay as one bird ahead; four warm dots on the forest path at the mountain's foot, seen from the shoulder (x 74–90); halfway up the slope at the coda. Each lamp lights with its owner's three notes (`cues.ts:21–25`: Mamma rising, Pappa falling, Moa leaping, Bertil repeating). When Elof waves (the existing tap-wave), one lamp blinks twice. | `life.ts` (a mountain place, a four-dot `road`), `life-plan.ts`, audio motifs | M | 3 |
| 14 | `berget.ts:22–23,33`; `backdrop.ts:880–928`; shot 1 | **The set piece.** The flight shows none of the journey's places, the 18:00 bells, the family or the jay. It is a ride, not Nils Holgersson's look back. | A journey plate on the far layer, behind (left) to ahead (right): a small red house with a glint on the glazed veranda (not at its true position), the bell tower, the spruce forest, the brook's glitter, the bog with its boardwalk and the four lamps, then the mountain with the old pine catching the sun. Camera zone −3–30 at lead −4, zoom 2.2, so the first half looks back; Elof turns his head back for 2 s. At 6 s six bell strokes (the existing `bell` cue), with soft rings rising from the tower (the crane calls' rings, `view.ts:1461–1466`), so it works without sound. Line, optional: Elof "Klockorna! Nu är det lördagskväll." (34), the evening when the sweets may be eaten (Mamma's "ikväll"; the golden candy). Flight 14 → 18 s. | Canvas first pass in `backdrop.ts` (cloud); Blender plates on Olov's computer (plan §5.6); camera data; audio. **Q1 for the house and tower.** | L | 3 |
| 15 | `view.ts:753`; `berget.ts:185` | **Story-driven animation.** The ride starts the instant the chapter loads, and the crane shrinks to nothing as it lands. The crane family's thanks for the chick has no farewell. | A 1-s `later`: the crane stands, Elof on its back, then it runs three steps and lifts off. The two parent cranes fly alongside for 4 s and peel back towards the bog (the existing crane strip). At landing the crane dips its neck, Elof waves, and it flies off to the left with a call. | View code (departure arc), chapter data, a life role | M | 2 |
| 16 | `berget.ts:187`; `garden.ts:202`; `music.ts:28–37` | **The toy has no partner or link.** The notes are G A B D E, not the game's theme; the ghost is away (perches 93 → 109.6); the party later explains something the child never wondered about. | Tune the five to the polska's opening (D4 F4 A4 D5 C5) and give them a `song`, like the dew bells. The ghost waits on the fifth cobble and knocks each note back after him: the first time the two play together. Walking over them plays them in order; when all five have rung, a pale shimmer of the old shore washes once over the granite (2 s, a gull-like whistle), and the music takes up the theme. | Chapter data, a song flag, a view shimmer, audio | M | 2 |
| 17 | `berget.ts:212,216`; `sv.ts:261` | **Words, a set piece.** The cairn's prize spends a caption on route information ("Snöret runt röset. En väg ner!"). The "best view in the game" (plan §3.4) is framed at zoom 1.6, little wider than the path. | Drop `mountainLoop`: the lace explains itself. On the chokladpralin, a 2.5-s look-out: zoom 2.4, lift 3, the whole valley with the journey plate and the four lamps. If Q1 is yes, Elof: "Där borta är vårt hus!" (22). | Chapter data (`later`, camera); `sv.ts` | S | 2 |
| 18 | `story-context.ts:92`; `sv.ts:154,157` | **Words.** During the flight the HUD says "Följ spöket uppför berget." with no ghost in sight. | While riding in Berget, use the existing `crane` purpose ("Flyg med tranan till berget."); from the landing, the mountain one. | `story-context.ts` | S | 1 |
| 19 | After the memory; `sv.ts:260`; `berget.ts:211` | **Emotion.** Nobody answers the reveal. Elof's line is the only reaction, and the ghost stands 7 EL away under the pine (shot 6). | After the 1.5-s quiet (row 1), Elof turns to the ghost and the line shows. The ghost answers with its happy double knock and a nod (§2.2), then looks down into the crack. The line stays as it is. | View (turn, knock); a `later` hold after `memory` | S | 2 |
| 20 | End of chapter; plan §3.4 "The old pine at sunset" | **The ending.** No comfort after the saddest picture of the game. The plan's sunset at the pine is not staged. `narrative-craft.md` l. 358: "keep the figure alone in the crack brief, and resolve it within minutes". | The coda, section 5: a glint from the bottom of the crack; the ghost's jelly on the lip; *Vinka*; *Sätt dig*; the sunset; the lamps; the first star; the ghost's next bubble. About 25 s, with two actions, skippable after the first time. | A new timed scene, or a chain of `later` holds ≤ 3 s ended by `goalNeeds`; view staging; `sv.ts` verbs "Vinka", "Sätt dig" | L | 3 |
| 21 | `photos.ts:8–16` | **Lore, the ending.** The album, which becomes the credits, has the flight but nothing from the summit. | A moment `pine`, "Vid den gamla tallen", 1.5 s after Elof sits at the crack, so the credits show the two of them at the lip at sunset. | `photos.ts`, `sv.ts` | S | 2 |
| 22 | `view.ts` gusts; `memory.ts:75` | **Lore.** The wind that took the figure (picture 2) and the wind of E4 are not tied together. | During a gust the ghost crouches in the lee, hugs its bag and peeks out: it knows this wind. In picture 2, draw the gust as the same three pale streaks the game shows before a gust. | View (pose while a gust blows); `memory.ts` | S | 2 |

## 5. The narrative thread for Berget

| Strand | Proposal |
| --- | --- |
| **Emotional question** | It starts as "Varför väntar spöket på mig – och vad visar det?" At the cliff it becomes "Hjälper jag den som tog min påse?", and at the crack it is answered: it was my trägubbe, and we will fetch it home together. Tone: grand (the flight, the view, the sunset) and tender (trust, the memory, the wave). |
| **The ghost** (escalating from Myren, where it let him come close and thought of a pine and a crack) | It greets him on landing instead of fleeing (row 12). It shares the lee in the gusts and hugs its bag in the wind (rows 12, 22). It answers his stones (row 16). It cannot climb; it shows the lonely figure, then the empty place on the shelf (rows 9, 10). It trusts him with the bag (row 8). It lowers the lace and holds it (row 11), then walks beside him (section 6, play 4). The memory grows from its bubble at the crack (row 3). It confirms the reveal with a knock (row 19), lays a raspberry jelly on the lip (the party motive in a picture, before the final's explicit line), and shows the next plan: the lace going down into the crack. |
| **The family** | Four headlamps cross the bog under the flight, the jay ahead (row 14). From the shoulder, four lamps at the mountain's foot, each with its motif (row 13). In the memory, Pappa reaching as far as he can, and little Elof's last jelly. In the coda, the lamps halfway up and one blinking back at Elof's wave. Their worry is never a search party; their presence says "Vi är nära dig hela tiden" without a word. |
| **The lore** | The first trägubbe was lost here: photographed on the rock by the pine, tipped into the crack by a gust, too deep for Pappa's arm, left with little Elof's last raspberry jelly and a wave. Its place is the empty first place on Pappa's shelf in the prologue, which the ghost looked at before it took the bag. The stones remember a sea (row 16): this mountain keeps things a long time, and the figure has waited more than half of Elof's life. |
| **The set piece** | The flight: the journey below in one look back, the bells ringing in the Saturday evening, the family's lamps on the bog, the pine ahead in the last sun (rows 14, 15). |

**The ending, the last thirty seconds before the card** (from the memory's return; times in seconds):

| t | Image | Who moves | Music, sound | Line |
| --- | --- | --- | --- | --- |
| 0 | The memory's last card (the figure alone in the dark, a star fading in) shrinks into the ghost's bubble on the far lip. The present is the same pine and crack between its roots, with the sun's rim on the far ridge. | — | The memory's low D, wind | — |
| 1.5 | Elof turns to the ghost. | Elof | The motif's first bar, a single pluck | Elof: "Spöket vill hämta hem min trägubbe!" |
| 4.5 | The ghost nods, double-knocks, and looks down; the camera pushes in on the slit (zoom 1.0). | Ghost | *klonk-klonk* | — |
| 6 | Deep in the crack a pale point glints once: the tip of the pointed cap in the last ray. | — | A soft high pling | — |
| 7.5 | The ghost takes a raspberry jelly from the stolen bag and sets it on the lip where little Elof's lay, then steps back. | Ghost | A small wooden tock | — |
| 9 | Använd shows *Vinka*. Elof waves down into the crack, as little Elof did; the glint answers twice. | Elof (player) | His two-note call; two plings | — |
| 12 | Använd shows *Sätt dig*. Elof sits on the lip beside the ghost, feet over the edge; its striped socks swing. The camera pulls back and up over 8 s (zoom 1.4 → 2.3, lift +2.5). Album photo. | Both | The polska's last four bars, slow, with the bass | — |
| 15 | The sun slips under the far ridge. Warm light leaves the granite from left to right; only the pine's crown keeps an orange rim. | Light | — | — |
| 19 | Far below, four headlamps light one by one on the path up, each with its owner's three notes; a dark speck (the jay) flits ahead. Elof waves; one lamp blinks twice. | Family (far), Elof | Four motifs, his call | — |
| 24 | Above the pine the first star lights. The ghost's bubble shows the lace going down into the crack and the little figure coming up: the plan for the final. | Ghost (bubble) | The tune settles on D | — |
| 27 | Hold: two small figures on the lip, the pine, the star, four lamps. | — | The D rings 2 s into the card | — |
| 30 | The card: *Kapitel 4 klart!*, Moa's map with the summit drawn in, "Min trägubbe väntar". | — | — | — |

The final then opens on the same place seen from the other side, in blue hour: the star brighter, the lamps
higher, the ghost already holding the lace at the lip, *Sänk snöret* (`norrsken.ts:74`). After the first time, any
button during the sit goes to the card; the photo is kept either way.

## 6. Gameplay that tells the story

1. **The bag in his hands (the cliff, P15; row 8).** The ghost cannot climb with the bag and gives it to Elof. He
   walks slowly with it and cannot jump: he feels why the ghost needed help. He must set it down to boost, and at the
   lace he ties it on for the ghost to haul up. He could walk away with it; nothing stops him, the ghost only looks
   down with the lonely figure in its bubble. Wanting the bag back is the whole game's want, so handing it over is
   the choice, made with his own hands (Brothers). The final's *Ta påsen* then returns what he trusted it with.
2. **Two in one lee (E4; row 12).** The ghost waits behind the same boulder, both crouch while the streaks pass, and
   it dashes first the moment a gust ends. The rhythm is taught and the partnership is felt in the same act. On
   *Lugnt* it walks beside him.
3. **The stones answer (O8; row 16).** He rings a cobble and the ghost knocks the next; together they play the
   opening of "Spökets polska", and the old sea shimmers for two seconds. It is the first time they play
   together, just before they first work together.
4. **Walking beside (lace top to crack).** After the lift the ghost no longer keeps its distance: it walks at his
   side at his pace and stops when he stops (a follower, like the crane chick's, `types.ts:560`). After a whole game
   of chasing, the change is felt in the controls, not told (Oxenfree's walk-and-talk, Journey's companion).
5. ***Vinka* at the crack (the coda; row 20).** The same gesture little Elof made at the same crack years ago, made
   by the player, and answered by a glint from below. One button carries the memory into the present (Edith Finch).

## 7. The five to do first

1. **Let the reveal land** (rows 1, 2, 6, 19). Fix the line printed over the memory, give the memory its music,
   and add 1.5 s of quiet, the line and the ghost's answering knock. Replace the jingle with a cadence and stop
   the ghost vanishing. S–M, one PR.
2. **The crack and its coda** (rows 3, 5, 20, 21). The crack in Berget, the memory at its lip out of the ghost's
   bubble, mirrored pictures, and the thirty-second ending with *Vinka*, *Sätt dig*, sunset, lamps and the first
   star. L.
3. **A cliff where help is felt** (rows 7, 9, 10, 11). The ghost's failed tries, the thought as the gate, the
   boost and the lace held by the ghost. M. The bag hand-over (row 8) follows once Olov says yes.
4. **Memory 4 that moves** (rows 4, 22). The tip, the reach, the jelly, the wave, the dusk and the star, inside
   the existing cards, with gust streaks that match the game's. M.
5. **The family's four lamps and the evening bells** (row 13, and from row 14 the lamps on the bog and the bells
   as sound and rings). In the flight, from the shoulder and at the coda. M. The full journey plate waits for
   Blender and Q1.

## 8. Questions for Olov

1. **The red house and the bell tower in the flight** (HANDOVER question 8). Plan §3.4 has both; the art bible
   keeps red for the candy, and the current default is "no red, no tower". May the flight show a small red house
   (not at its true position, no likeness) and the tower's silhouette, and may the cairn's look-out say "Där borta
   är vårt hus!"? Without a yes: the bells as sound and rings rising from behind a ridge, and no house.
2. **The bag in Elof's hands at the cliff** (row 8, section 6 play 1). It changes the plan's P15 from "Elof boosts
   the ghost, and it lowers the lace" to a hand-over: the ghost gives Elof the bag to climb, and Elof ties it to the
   lace for the ghost. Elof holds his own bag once before the final returns it. Without a yes: the staged boost and
   lace only (rows 9–11).
3. **Memory 4 is the plan's invention about Pappa's first figure** (the photo, the gust, the crack, the last
   jelly). HANDOVER question 1 still stands: should Pappa read the memory storyboard before the memories are
   animated (row 4), and does his real first trägubbe still exist, so that the game's figure can be modelled on it
   (on Olov's computer)?
