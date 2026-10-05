# Narrative audit: the threads across the whole game

Area: what runs through every chapter (ghost, lore, family, endings, words, animation, music), 5 October 2026. The
six other audits take one chapter each; rows that overlap one (notably `prologue.md`) say so.

## 1. Verdict

Played end to end (about 75 minutes at Elof's pace by the plan's design minutes, 6 minutes for the robot), the game
tells its story well in four places: the prologue's theft and shrink, the four sepia memories, the rescue of the
ghost from the eddy, and Pappa's words on the summit. Between them a child mostly chases a ghost that behaves the
same from the deck to the mountain. He will understand that the ghost took his bag, that a star made him small,
that his family helps at crossings, that a little figure from long ago was lost on a mountain, and that it comes
home. He is unlikely to *feel* the three threads Olov asked for while he plays. The ghost's mystery is told in
three thought cards, on screen 0.9 to 2.2 robot seconds each and all in a chapter's last tenth, and "why does it
wait for me?" is never asked. The family is absent for about 14 minutes twice, speaks in a caption from off
screen, and never acts its worry, pride or reunion (box figures that turn and hop). The lore's payoffs happen off
screen: the shelf is already filled when the epilogue begins, and the old trägubbe never blinks. The endings are
the weakest joint: every chapter cuts to a card 1.4 s after an invisible line, in silence, with lines still queued
and, on a phone held sideways, the card's title and map scrolled out of view; the next chapter opens cold. What is
missing most is not content but a shared grammar: one escalating ghost device, a family "radio" that answers while
he plays, and one ending pattern with music.

## 2. As it plays now: the whole Saturday, measured

**How measured.** The timeline harness per chapter, extended in my (deleted) copy to log per frame at 844×390 the
camera's width (5 EL × zone zoom × 2.16, centred as `cameraIntent` and the view's shots place it), the ghost and
the family figures (found as `view.ts:501-504` finds them) in the picture, the thought card (`thoughtAt`), and the
bubble queue as `hud.ts:123-149` runs it. Output: `audit-threads/m-<chapter>.txt` in the scratchpad. Clock = child
minutes from the prologue's start: the robot's fraction of a chapter × the plan's design minutes (§4.9: 2.5, 20,
17.5, 13.5, 11.5, 6, 4.5). Pictures (stand-ins, Low): `audit-threads/<n>-*.png`, cited as P1–P8 (no P5); the
first final picture was overwritten, and its HUD text is in `shots-log-1791220701451.json`.

| Chapter (robot s) | Clock | Ghost beats | Family beats | Lore beats | Last image → card |
| --- | --- | --- | --- | --- | --- |
| Prolog (23.6) | 0–2.5 | blink, dotted glance to the empty shelf place then the bag (2.6 s hold); Mamma freeze; railing sneak | all four in the kitchen and on the deck; Pappa ×4 lines, Mamma's line dropped and Moa's shown 0.5 s (robot) | shelf with the empty first place; "Jag har täljt ett spöke" | Elof walks off the step; card 3.2 s after the railing gag |
| Gården (65.5) | 2.5–22.5 | gully helper visit 8.5; dandelion near-catch 10.2; stomp 19.1; gone into the root hole 19.6 | Pappa's two prologue lines again, no Pappa (P2); then nothing until Moa's legs at 19.4 (P8) | memory 1 on the shavings 18.1 | landing at the hedge; card 9.6 s after boarding |
| Granskogen (76.2) | 22.5–40 | vittra gift (Elof's line only) 28.3; log near-catch 34.8; rescue 38.6; mountain card 39.2–40 (P4) | Pappa's figure from 31.2; Bertil 35.6, "Heja lillebror!" | memory 2 35.5 | ghost waiting with the mountain card; card 7.4 s after the rescue |
| Myren (64.6) | 40–53.5 | chase as before; lollipop stands there 49.5; pine-crack card 1.2 s while boarding 52.7 | three Mamma figures 45–47.5; optional spång 51.5–53 | memory 3 51.2 | crane take-off cut mid-air at x 197; card 5.2 s after boarding |
| Berget (54.1) | 53.5–65 | first seen 55.9 (flight has none); stuck, lonely-figure card 63.0 (P6); Lyft 63.2 | none | memory 4 64.7; "Spöket vill hämta hem min trägubbe!" | card 2.9 s after the memory; the line cut at 2.9 of 4.1 s |
| Final (21.9) | 65–71 | partner at the crack, eyes, bag back, sharing 66–67.5; motive as HUD text (shot log) | four figures pop in at the taste 67.8 with a joy hop (P7); Pappa ×4; shoulder ride | first trägubbe out, new eyes; no blink | walk home on Pappa's shoulders; card 12.9 s after the taste, line 4 cut |
| Epilog (15.6) | 71–75.5 | naming as a ghost bubble 72.8 | party with all four 71.5–72.8; Pappa's rule; Pappa absent at the carving | shelf filled from the start; own figure 73.6 | bed ride; card "Slut", album, windowsill blink |
| Byn (51.9, extra) | after | the friend leads, unnamed in bubbles (`sv.ts:177,193`) | none; Elof talks to himself (5 lines) | — | "En påse att dela på!" cut by the card after 2.6 of 3.3 s |

- **The ghost is never absent long; its meaning is.** It is in the picture 77 % of Gården, 75 % of Granskogen, 68 %
  of Myren and 66 % of Berget (longest gap: the crane flight, about 2.4 min). Thought cards are on screen 0 s in
  the prologue and Gården, 2.2 s in Granskogen, 1.2 s in Myren, 0.9 s in Berget (robot), always in the last tenth.
- **Longest stretches where nothing tells the story:** Gården x 76–145 (dandelion to memory 1), about 8 min;
  Berget from the landing to the cliff, about 6.5 min; Myren's first 5 min (x 1–83).
- **Longest without any sign of the family** (no figure in the picture, no family bubble): Gården x 27–157, 46.9
  robot s ≈ **14 min**; the crane take-off to the reunion (all of Berget plus the final's first 2.8 min) ≈ **14.5
  min**; Moa's plane to Pappa's seesaw ≈ 10 min.
- **Words and endings:** about 26 main-path bubbles in 75 minutes, half the plan's budget (§3.7); in 6 of 8 chapters
  a line is cut or still queued when the card comes, and the audio is put to sleep at the card (`main.ts:892`).

## 5. The seven threads (in place of the brief's single thread)

### 5.1 The ghost's mystery

| Chapter | What happens in this thread | What is understood without reading | Gap |
| --- | --- | --- | --- |
| Prolog | Eyes painted → 2.6 s hold, dotted glance at the empty shelf place, then the bag (`ends.ts:44-45`, `view.ts:1594-1633`); theft; Mamma freeze (topple, `prologue.ts:51-54`); Pappa lifts it to the railing, it sneaks off (`prologue.ts:55-61`) | It woke, took my bag, froze when grown-ups looked | No sound at the blink (no cue exists); the glance can read as "looking around" |
| Gården | 24 perches of chase (`garden.ts:338-367`); a helper visit at the gully looks at the hook and knocks (`garden.ts:71`); dandelion near-catch (`:353`); "juggling a candy" perch has no juggling; vanishes at the root hole | It teases and runs; once it helped (if noticed) | No thought card at all (rule 6's smudge); Moa's grab and the forest-edge exit not built (`garden.ts:47`) |
| Granskogen | Gift at the vittra door told only by "Spöket ger bort mitt godis!?" (`granskog.ts:337`; the door shows no ghost candy, `props.ts:281-292`); log near-catch; eddy rescue; thank-you candy appears as trail candy (`:424`); waits (near 1.6) with the mountain card (`:333-334`); the small-figure card only on an optional return (`:70`) | I saved it; it waits and thinks of a mountain | The best step (rescue → waiting) fills only the last 20 EL; gift and thanks are not acted; the question is not asked |
| Myren | Perches 1–15 at the chase's 4 EL (`myren.ts:416-433`) though the recap says "Spöket flyr inte som förut" (`sv.ts:147`); lollipop stands there; pine-crack card after `home` (`:435-436`): perch 172.5 is left at 53.9 s, `home` comes at 55.0 s | It gave me a light (if read as a gift) | The "clear picture" step is nearly unseen; no change in behaviour |
| Berget | No ghost on the flight; stuck below the cliff with the lonely-figure card until Lyft (`berget.ts:204`); memory 4; Elof's line | It needs help; it wants the figure | The card's figure is about 15 px tall (P6); no pointing up or holding out the bag (`berget.ts:22-23`) |
| Final | Partner at each step (`norrsken.ts:101-107`); gives the bag back; the motive as a HUD "reveal" line (`story-context.ts:28-29`; shot log) | It took the candy for a party (if read) | The party image (figure by the pine, a jelly in its lap) is not built (`norrsken.ts:15-16`) |
| Epilog | "Klonk, klonk!" as a bubble with the label SPÖKET (`ends.ts:201`); named | It gets a name | The mouthless ghost "speaks" in a text bubble |

The steps exist in the data (glitch → helper → gift → rescue → waiting → asking → answer), but they are not felt as
steps: the device (the card) is absent for the first 39 minutes, the behaviour never changes on screen, and the
question that should carry the middle (§3.1) is never posed. Proposed escalation, one beat per chapter arc, each
with the ghost motif (row 21): **prolog** glitch (blink, glance, first motif); **Gården** smudges at the gully and
the birch root, and it helps; **Granskogen** a shape (the pointed-cap figure) when it gives the candy, then after
the rescue it answers his call and waits, and Elof asks "Varför väntar spöket på mig?"; **Myren** a clear picture
at its gift of light, and it knocks first; **Berget** the figure, large, while it points up and holds the bag out;
**final** the answer as a picture (memory 2's sharing drawing in its card), then the trägubbe blinks.

### 5.2 The lore: Pappa the carver, the shelf, the memories, the first trägubbe, Elof's first figure

| Chapter | What happens | What is understood | Gap |
| --- | --- | --- | --- |
| Prolog | Pappa's line "Jag har täljt ett spöke. Måla ögonen!"; shavings by the table (`ends.ts:40`); shelf with the empty first place (`:36`); the glance | Pappa made the ghost; my eyes woke it | Pappa never carves on screen; nothing says the place is waiting for someone |
| Gården | Memory 1 on top of Pappa's shavings (`garden.ts:192`): carving at night, the gift, little Elof's face beside the figure (`memory.ts:55-59`) | "Det där är ju jag!" | The video-clip detail (plan §3.4) is not drawn; fine |
| Granskogen | Memory 2: walk, the figure on a stump, two jellies, Pappa's camera (`memory.ts:61-65`) | Little me shared sweets with it | Nothing ties it to the vittra gift the ghost made minutes earlier |
| Myren | Memory 3: the family on a boardwalk, the figure held up toward a mountain (`memory.ts:67-71`) | We walked toward the mountain | — |
| Berget | Memory 4: pine, gust, crack, Pappa reaching, the last jelly, the figure alone (`memory.ts:73-78`) | It was lost there | 2.9 s of play after it before the card |
| Final | Pulled out, crowberry eyes, sharing, Pappa's four lines, origin handoff (`story-context.ts:124`) | It was mine; Pappa carved it for me | Rule 1's proof (the blink) is missing (`norrsken.ts:15`) |
| Epilog | Shelf already filled (`ends.ts:142`); three strokes and two dots; the figure on the sill blinks after the credits (`epilogue-stage.ts:37-46`) | I can carve | Nobody fills the place; Pappa's figure stays at the party seat 18 EL away while Elof carves (`ends.ts:117,163`) |

**The chain at a child's pace.** Memory 1 at 18.1 min, memory 2 at 35.5 (+17.4), memory 3 at 51.2 (+15.7), memory
4 at 64.7 (+13.5), Pappa's words at 67.8 (+3.1); each lasts 7.2 s (the fourth 9.6 s, `memory.ts:107`). The drawings
are a clear chain (the same pointed-cap figure, little Elof in light blue; carve → share → carry → lose), but they
sit at 74–97 % of their chapters and nothing between them shows the figure until Berget's card, so a child must
hold it in mind for about 45 minutes. Keep them where they are; make the figure recur in the ghost's cards (row 4)
and give each memory an ease-out (row 22).

### 5.3 The family bond

| Chapter | Appearances and lines | Help and calls | Worry, pride, reunion | Gap |
| --- | --- | --- | --- | --- |
| Prolog | Four box figures at the table and on the deck (`prologue-stage.ts:66-71`); Mamma walks past the door; Pappa ×4 lines | — | Pappa squashes to 0.74 tall and reaches (`:73`, `:86-102`); the others stand still, half out of frame (P1) | Worry not acted |
| Gården | Pappa's two lines with nobody in the picture (P2); Moa's legs and "Lillebror?! Du är ju pytteliten!" (P8) though she saw the shrink | Ropa på Moa (motif), Kliv på | Joy hop when called | 14 min without them; Moa's surprise contradicts the prologue |
| Granskogen | Pappa at the seesaw, Bertil at the pool | Two calls, two motifs | "Heja lillebror!" during the ride | Pappa silent; both left standing behind |
| Myren | Three Mamma figures at once (84.8, 102.2, 169.2) | Two calls (+1 optional) | "På myren går vi på spången."; "Ungen är hemma. Vill du ha en spång?" | No cocoa, no lamp behind him (`myren.ts:35-36`) |
| Berget | None (only the pause text "Familjen följer stigen upp", `sv.ts:190`) | — | — | 11.5 min absent |
| Final | Four figures pop in at the taste in a row (`norrsken.ts:88-93`) with a joy hop (`view.ts:987-1000`) while Pappa begins "Min allra första trägubbe …" (P7) | "Gå hem": on Pappa's shoulders (`view.ts:1005-1016`) | No headlamps, jacket, cap or hug | The hop clashes with the wistful line |
| Epilog | Four at the table; lost things returned if found | Ge ×4 | Joy hop per candy | Pappa not beside him at the carving |

Calls are the only family sound outside bubbles: Elof's two notes, then the person's three-note motif (`cues.ts:21-26`,
`audio.ts:255-268`), five times on the main path. Tapping Elof makes him wave (`view.ts:902-904`); nobody waves back,
though the plan says they do (`game-plan.md:403`). **Proposal, the family on the radio:** (1) a tap on Elof is a
call, answered by the nearest member's motif and a portrait chip at the screen edge on their side (at most once per
15 s; in Berget the first answer is all four motifs from far below); (2) a figure in the picture waves back; (3) a
wordless "Heja" (motif and chip) when an exciting sequence is done; (4) two far appearances per chapter (row 15);
(5) the freeze gag whenever a giant is near the ghost (row 3), which ties the family to the mystery.

### 5.4 Endings and transitions

| Chapter | Last story beat → card | Last image | The card (`hud.ts:150-183`, `story-context.ts:115-127`) | Next chapter's first seconds |
| --- | --- | --- | --- | --- |
| Prolog | railing empty → 3.2 s | Elof walking right on the step | "Lördagsmorgon"; map: Hemma; "Ut på gården – Spöket har min påse…"; DAGG SNÖRE BRÄDA | Deck at x 1; Pappa's two lines again |
| Gården | boarding → 9.6 s (7 s flight) | stepping off the plane at the hedge; no ghost, no forest edge | "Kapitel 1 klart!"; map still only Hemma; "Vidare till granskogen…"; GRAN KOTTE MOSSA (P3) | Forest floor, no bubble, no plane |
| Granskogen | rescue → 7.4 s (a child lingers 15–60 s) | the ghost waiting with its mountain card; a moose in one visit of three | "Spöket väntar på mig – Jag hjälpte det ur vattnet…" | Bog edge; the ghost runs as in Gården |
| Myren | boarding the crane → 5.2 s | the take-off, cut mid-air at x 197 | "Upp mot berget – Tranungen är hemma…" | The same flight continues: the one seamless join |
| Berget | memory 4 (≈10 s) → 2.9 s | Elof by the pine, the ghost at 159 | "Min trägubbe väntar…" or, without the memory, "Vid den gamla tallen…" | Summit at dusk, "Sänk snöret" |
| Final | taste → 12.9 s (11 s ride) | on Pappa's shoulders under the lights | "Finalen klar!"; origin text (123 characters) | Veranda at 21:00, shelf already filled |
| Epilog | teeth → 4.6 s | riding up to bed | "Slut" + the closing line, the album as credits, the windowsill blink | Byn, or Utforska vidare |

The card is a tally at the emotional peak: candy rows, stickers, a static map (`map.ts:25-46`), the handoff, a code
and buttons, in silence. At 844×390 its title, candy and map are scrolled out of view (P3).

**One pattern for every ending: the storybook page** (20–30 s, any input skips after the first time; compare the
six-beat close in `docs/research/narrative-craft.md:320-333`):
1. *The last beat is played* (0–3 s): Elof walks out of it himself; bubbles finish (row 2).
2. *Coda* (4–8 s, input live, nothing to collect): the camera eases back to show the place; the ghost, ahead,
   looks back and shows its next card; one family sign; the arrangement plays its last two bars (POLSKA bars 7–8)
   as a cadence and holds a soft D.
3. *The page*: the coda's last frame (captured as the album already captures, `view.capture`) slides in as a
   storybook page: the picture, the chapter's name as the page title, the handoff as its caption, Moa's crayon
   drawing the way on to the next place (row 18). Candy, stickers and the code below it, smaller.
4. *The next chapter opens* with a 2.5 s card on Moa's paper: a crayon clock and the sun's place, the place name in
   her hand; the tune's first bar; the ghost in the first frame, looking back (row 19).

| Chapter | Coda (what moves) | Ghost | Family sign | Next opening card |
| --- | --- | --- | --- | --- |
| Prolog | Pappa kneels at the railing; Elof looks out over the huge lawn; the game's title over the garden (as `prologue.md` proposes) | a smudge card from the step below | Pappa's hand flat on the deck by Elof | 10:00, sun low in the east |
| Gården | the plane glides into the moss at the forest edge; Elof rolls out | peeks from under a spruce, smudge card, slips in | Moa waves from the far deck railing, her motif | 11:30, Granskogen |
| Granskogen | the brook glitters; the camera rises over the trees | on a stone, looks back, mountain card, hops off slowly | Bertil, capless, waves from the bank | 16:30, Myren (a time skip) |
| Myren | the crane lifts, the chick's family flies alongside | rides ahead on a second crane, pine card | Mamma's lamp below, swinging | 18:00, Berget, with the church bells (plan S5) |
| Berget | sunset touches the ridge; Elof and the ghost at the crack's edge | lays a hand on the crack, looks at Elof | far below, four headlamps start up | Kväll: first star, Norrsken |
| Final | the walk home ends as the lit veranda comes into view | asleep on Elof's shoulder, as a carving | the four motifs as one chord | 21:00, Godiskalaset |
| Epilog | (exists) the album, then the windowsill blink | in the row on the shelf | — | — |

### 5.5 Words

`sv.lines` has 45 bubble lines (5 in Byn), all within 40 characters; about 26 are seen on the main path. Uses by
speaker: Elof 19, Pappa 15 (two lines used twice), Moa 6, Mamma 4, Bertil 2, the ghost 1. `sv.storyContext` adds 62
purpose lines shown during play (max 37 characters), 62 pause recaps (59 over 40), 12 family lines and 15 handoffs
(51–123 characters): with the always-on purpose line, over 100 distinct lines appear in play, more than the plan's
"about 60 captions", many of them instructions ("Ropa på Moa vid roten." above a button saying "Ropa på Moa").
**Tone** is right (plain child words, du, no villains); two lines explain rather than feel: "Stjärnan gör dig liten.
Vi hjälper dig!" (see `prologue.md`) and the rule "På myren går vi på spången." **Elof's arc** is in his lines:
alarm ("Pappa! Spöket tog min godispåse!"), cross ("Ge tillbaka mitt godis!"), puzzled ("Spöket ger bort mitt
godis!?"), warm ("Spöket tackade mig!"), caring ("Följ mitt ljus hem till din familj."), understanding ("Spöket vill
hämta hem min trägubbe!"), generous ("Du ska heta Klonk!"), proud ("Jag kan tälja!"). But he is silent at the
climax, from the cliff to the epilogue, and his generosity on the summit is a menu; Bertil has one main-path line.
Add six (row 25): "Varför väntar spöket på mig?" (28), "Välkommen hem, lilla trägubbe." (30), "Den var min hela
tiden!" (23), Mamma "Där är du ju!" (13), Moa "Här, så du inte fryser." (23), Bertil "Kepsen är din i kväll." (22).
Remove the repeated Pappa lines in Gården and the "Klonk, klonk!" bubble (letters at the feet instead).

### 5.6 Story animation inventory

**Now:** a rehearsal figure is one `InstancedMesh` with its arms baked in (`family-rehearsal.ts:23-63`); it turns
towards Elof (±0.75 rad) and hops for 1.8 s when its flag is set (`view.ts:987-1000`); the private models (15 bones,
`art-bible.md:61`) also raise and sway their arms. The prologue stage adds Mamma's walk past the door, Pappa's
approach, a crouch by squashing his height, and a box arm that lifts the ghost (`prologue-stage.ts:56-103`); Pappa
carries Elof home rigidly (`view.ts:1005-1016`). The ghost hops, tilts, sways, taps a foot, faces Elof, topples in
the freeze and shrinks away (`view.ts:936-963`, `prologue.ts:49-61`). Elof waves, lies down when knocked over,
squashes and scales for the POFF; his private model walks, runs and jumps (`view.ts:1181-1218`). The chick follows
with its family's rings (`view.ts:1437-1487`); the windowsill figure blinks.

| Needed animation | Where | Code on rehearsal figures | Code on the private 15-bone models | Blender on Olov's computer |
| --- | --- | --- | --- | --- |
| Kneel / crouch | Pappa at the shrink and the carving, Moa meeting him, Mamma at the braid, the reunion | lower 1.2 EL + lean 0.25 rad (S) | thigh/calf bend, root lowered (M, rough) | final kneel with weight |
| Reach, lift, grab | Pappa lifts the ghost (exists), Moa's grab, Mamma lifts the pine | arm instances posed toward a target (row 13) | upper/lower arm toward a target; `bendJoint` needs any axis, not only x (M) | hands and fingers |
| Wave, wave back, cheer | everyone; Elof's tap | arm instances (S); cheer exists | exists for cheer; wave = lower arm swing (S) | — |
| Point | Elof at the empty railing; the ghost up the cliff | — | Elof: upper arm forward (S); ghost: only if its arms are separate nodes | split the ghost's arms if not |
| Gasp, worry | the family at the shrink | arms up to the head, step back (S) | upper arm up, lower arm bent (S) | faces |
| Hug | the reunion; Elof and the trägubbe | lean in and overlap (S, reads at a distance) | arms close round Elof (M) | contact and faces |
| Walk along the big path | headlamps, Pappa to the bench, the family moving on | slide + 2 Hz bob (S) | — | CC0 walk clip retargeted (plan §5.6) |
| Carve, hand over hand | epilogue | Pappa kneels, arm over Elof's hands (S) | arm targets (M) | hands with knife |
| Throw | Moa's plane | arm swing (S) | upper arm swing (S) | — |
| Ghost: freeze, look back, beckon, set down a gift, juggle, trip, point | every chapter | — | rigid-body poses in code (S each): freeze exists | arm parts if the model lacks them |
| Elof: stomp, hold up the lollipop, sit on shoulders, sour face | Gården, Myren, final | stomp as a squash pulse (S) | spine/thigh/arm poses (S) | faces (stickers) |
| Blink | ghost (prologue), trägubbe (final), Elof's figure | eye scale like `epilogue-stage.ts:40-41` (S) | — | eyelids on the private ghost |
| Shrink and grow | prologue, final | exists; add squash-stretch (S) | — | — |
| Crane kneels and dances | Myren (S4) | — | — | the crane's rig and dance |

### 5.7 Music and sound in the story

| Chapter | Arrangement (`music.ts:64-80`) | Story sounds now | Gap |
| --- | --- | --- | --- |
| Prolog | home: 96 bpm, solo pluck, knife scrapes | babble per bubble; hop knocks | no "pling" at the blink, no sound at the theft or the POFF |
| Gården | garden: 116 bpm, full, bass | chase knocks while the ghost is within 9 EL; Moa's motif | knocks on 77 % of the time, so they mark nothing |
| Granskogen | forest: 84 bpm, sparse, an octave down | Pappa's, Bertil's motifs | no change at the rescue; the brook's "glittering plucks" (plan §5.8) absent |
| Myren | bog: 76 bpm, sparse | Mamma's motif ×2; crane calls in the air | no jaw harp; no change when the chick is home |
| Berget | mountain: 104 bpm, full | gust whoosh; cobble bells | no horn; no church bells under the flight |
| Final | dusk: 88 bpm, full, wood knocks all through | Pappa's babble ×4 | knocks and the full tune through the reveal; no silence; no sound for the grow-back or the lights |
| Epilog | 72 bpm with bass | babble; the ending shot's single bell | no motif at the naming or the shelf |

**Silence before a reveal:** none; instead the audio sleeps whenever a panel is open (`main.ts:764`), so painting,
sharing, carving, every memory and every card are silent, while the reveal has the full tune. **A ghost motif:**
none; its wood voice is used once. **A stinger for the shrink:** none (no cue for `star` or `taste`,
`cues.ts:150-218`). **A swell at endings:** a five-note arpeggio at the goal, then silence. Proposed: rows 20–21,
1.5 s of silence after the taste, and a cadence into every page.

## 3. What is good, and stays

- **The memories as a chain** (`memory.ts:53-79`): consistent cut-paper figures, grown from the ghost
  (`main.ts:813-817`), replayable in the album (`memory.ts:82-88`). The right device; it needs company, not change.
- **The midpoint turn** in Granskogen: rescuing the thief, which then waits (`granskog.ts:331-334`).
- **The gated reveal** with a fallback when memory 4 is missed (`story-context.ts:20-29`) and the origin kept in
  the final's handoff (`story-context.ts:124`): the motive can never be lost.
- **Visible causes in the opening** (bag, tear, star) and the shared shot at the shrink (`view.ts:858-864`).
- **The family's motifs and Elof's call** (`cues.ts:21-26`, `audio.ts:255-268`): the seed of the radio.
- **Three uses of Måla** (ghost, trägubbe, own figure): the controls already carry the arc.
- **Pappa carrying Elof home with both carvings** (`view.ts:1005-1016`) and the windowsill blink: a warm last image.
- **Elof's line arc** from cross to proud, with an unspent bubble budget (about 26 of about 60); the album as
  credits (`content/photos.ts`); the lost things returned at the party (`ends.ts:171-185`).

## 4. Findings

| # | Where | What is wrong | The fix, concretely | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `garden.ts:369-374`, `ends.ts:99-100`, `sv.ts:244` | Gården contradicts the new prologue: it opens with Pappa's two prologue lines again, with nobody in the picture (P2), and Moa, who watched the shrink on the deck (`prologue-stage.ts:68`), greets him with "Lillebror?! Du är ju pytteliten!" | Delete Gården's `follow1`/`follow2` beats. Moa kneels, hands on knees, and says "Där är du ju, lillebror!" (23). (Also in `prologue.md`.) | chapter data, `sv.ts` | S | 3 |
| 2 | `hud.ts:123-127`, `main.ts:887-905` | The bubble queue loses lines: priority beats clear it, so Mamma's "Ditt lördagsgodis får du öppna ikväll." shows at most 2.6 s and Moa's "En stjärna föll ur påsen!" about 0.5 s (timeline 16.3→16.8); the card comes 1.4 s after `goal` whatever is said: cut or queued lines in 6 of 8 chapters, including Moa's "Min lövteckning föll under spånbron!" while he flies away | A priority line waits until the current one has shown 1.5 s. The card waits until the queue is empty and the coda (row 17) is done. Beats get an `unless` flag (`garden:pocket` unless `plane:board`). | `hud.ts`, `main.ts`, chapter data | S | 3 |
| 3 | `prologue.ts:11-40`; `garden.ts:365-366`; help points | The freeze rule is shown twice in the first two minutes and never again; Moa's grab is not staged; the ghost hops freely at the party in front of everyone | A running gag: when a family figure is within 6 EL of the ghost and turns to it, the ghost snaps into the prologue's stiff pose (no sway, foot still) until the figure turns back to Elof, then scrambles on with a knock. At the root hole Moa's arm swoops and the ghost darts in. Wordless; the ghost motif plays. | view code (reuse `prologuePose` and the stage arm) | M | 3 |
| 4 | `garden.ts:338-367`; `granskog.ts:70,333-334`; `myren.ts:435-436`; `berget.ts:204`; `ghost-thought.ts:8-9` | Rule 6 is mostly unseen: no smudge in Gården; the first card after K2's rescue; K3's first card skipped (perch left before `home`), the second 1.2 s while boarding; K4's figure about 15 px (P6) | One card per chapter arc: a new `smudge` picture (the lonely-figure drawing under a 9 px canvas blur) at the gully visit and the birch root (158.4); `small-figure` at the vittra perch (64) from the `vittra` beat; `pine-crack` at the lollipop perch (146.5, after `light`) and at 186.5; `lonely-figure` at 1.7× card size. A tap on a waiting ghost shows its card for 3 s. | chapter data, view code | S–M | 3 |
| 5 | `sv.ts:135,147,204` | The premise question (§3.1) is never asked; only pause recaps ask anything | Elof at Granskogen x 195 after `placed:rescue`: "Varför väntar spöket på mig?" (28). The Granskogen page title: "Varför väntar spöket?" Myren's first purpose: "Följ spöket – vart vill det?" (27). | `sv.ts`, chapter data | S | 3 |
| 6 | `myren.ts:416-433`, `berget.ts:194-202`, `main.ts:777` | After the rescue the ghost still hops on at 4 EL, and the chase knocks still play; "it waits for me" exists only in the recap | From the rescue on, every perch `near: 2`. At 3–6 EL the ghost turns back, double-knocks and makes a short beckoning hop towards the next place. The chase layer ends at the rescue. | chapter data, view code, `main.ts` | S–M | 3 |
| 7 | `granskog.ts:337,424`; `props.ts:281-292`; `myren.ts:369` | The ghost's gifts are never seen being given: the vittra candy, the thank-you candy, the lollipop just appear or stand there | One gift act, reused: the ghost stops, crouches, sets the thing down, steps back, double-knocks, looks at Elof, hops on; the gift glints until taken; a candy stays visible at the vittra door. The same pose as Elof's *Ge* (6.5). | view code, chapter data | M | 2 |
| 8 | `norrsken.ts:15-16,88-93,108-113`; `story-context.ts:28-29`; `view.ts:987-1000` | The motive is a HUD text line (shot log); at the taste, Pappa's four lines, the POFF and the family's pop-in with a joy hop all start in the same frame (P7) | After `bag`, the ghost sets the trägubbe by the pine with a geléhallon in its lap and shows a card with memory 2's sharing picture (`MEMORIES.granskog[1]`): the motive, wordless. At the taste: POFF sound, 1.5 s with the music out, the lights flare, the blink (row 9), then four headlamps walk up from the right over 3 s (no hop) and Pappa's lines begin when he kneels by Elof. (With the finale audit.) | a new timed scene (`later` beats `flare`, `arrive`), view code, audio | M | 3 |
| 9 | `norrsken.ts:15`; `view.ts:714-717`; `epilogue-stage.ts:37-46` | Rule 1's proof, the old trägubbe's single blink under the lights, is not built; the ghost's blink in the prologue is silent, and only the windowsill blink rings (a bell, `main.ts:778`) | At `taste` + 1.5 s the first carving's eyes close and open (0.32 s, as the windowsill figure's) with a glint and the windowsill's bell as the "pling"; the same bell at the ghost's blink, so all three wakings sound alike. | view code, audio | S | 3 |
| 10 | `ends.ts:36,45,142`; `view.ts:976-982` | The empty first place is set up and then already filled when the epilogue starts; the payoff happens off screen | The epilogue starts with the place empty. First action: *Ställ på hyllan* (Elof carries the trägubbe there); the prologue's dotted glance runs from the ghost to the place and closes in a ring; Pappa's motif; then the party. | chapter data (shelf filled `after`), view code, `sv.ts` | S–M | 3 |
| 11 | `ends.ts:117,163`; `people.ts:9-14` | "Pappa teaches him to carve" happens with Pappa at the party seat 18 EL away; the knife is a green sign | After `beat:named`, Pappa walks (3 s) from his seat (x 11) to the carving place (x 32) and kneels beside Elof; his arm (row 13) rests over Elof's hands for `cut1`–`dots`; he stands when the figure goes to the sill. | view code | S–M | 2 |
| 12 | `prologue-stage.ts:56-103`; P1 | At the shrink only Pappa reacts; Mamma, Moa and Bertil stand still and half out of frame | At `star` all four lean in and step 0.8 EL towards him over 0.6 s, Moa's arms go up, Mamma kneels; hold the shared shot until `pappa:noticed`; their motifs sound softly in turn. (Detailed in `prologue.md`.) | view code, audio | S | 3 |
| 13 | `family-rehearsal.ts:34-37`; `view.ts:508` | The rehearsal figures' arms are baked into one mesh, so in cloud sessions the family can only turn and hop; every gesture in 5.6 needs the private models | Keep one `InstancedMesh` and one draw call; give the figure `pose({ left, right, kneel, lean })` that rewrites the arm instances' matrices about the shoulder; the prologue's separate box arm becomes this. | view code | S | 3 |
| 14 | measured gaps (section 2); `cues.ts:21-26`; `view.ts:902-904`; `game-plan.md:403` | About 14 minutes twice with no sign of the family; their motifs sound only at calls; nobody waves back | The radio (5.3): a tap on Elof is a call answered by the nearest member's motif and a portrait chip on their side (once per 15 s); in Berget the first answer is all four motifs from far below; a figure in view waves back; a wordless "Heja" (motif and chip) when E1–E4 are done. | `main.ts`, audio, DOM chip, chapter data (`family` ranges), view code | M | 3 |
| 15 | `content/life.ts`; `berget.ts:22-23`; `myren.ts:35-36` | "Familjen följer den stora stigen" (`sv.ts:183`) is never seen; the plan's headlamps under the flight and Mamma's lamp are not built | Two far appearances per chapter: Moa and Bertil crossing the lawn (Gården x 100–120); Pappa's cap and Bertil on a forest road (Granskogen x 30–60); Mamma's headlamp on the far boardwalk in the mist (Myren x 145–165); four headlamps under the flight and far below the open granite (Berget). | view code (lamps); Blender on Olov's computer (silhouette cells in the life atlas) | M | 2 |
| 16 | `myren.ts:366-367,380`; `granskog.ts:237,242`; `view.ts:501-509` | Each help point is its own figure for the whole chapter: three Mammas stand in Myren at once; Pappa and Bertil stay where Elof left them | One actor per person per chapter: it waits at its next help point and afterwards walks on along the back (z −1.5) to the next or out of the picture; Mamma's lamp stays above and behind him (plan §3.4). | view code, chapter data | M | 2 |
| 17 | `main.ts:887-911`; P3 | Every chapter cuts to the card 1.4 s after an invisible line, in silence; last images are walk-offs or a mid-air cut (Myren); at 844×390 the card's title and map are scrolled away | The storybook ending (5.4): played beat, coda with live input and a cadence, the page with the coda's frame, the map drawing and the tally last; in landscape the page is two columns (picture and map left, text and buttons right). | a new timed scene (coda), `main.ts`, `hud.ts`, `ui.css` | M–L | 3 |
| 18 | `map.ts:25-46,85-105` | Moa's map on the card is the chapter's static state (Gården: Hemma only, the ghost on blank paper); nothing is drawn as he arrives (§4.9) | On the page the crayon route grows to the next place over 1.5 s (stroke-dashoffset), its picture draws in, Elof's mark moves, the ghost's mark hops ahead with its card's picture. | `map.ts`, `ui.css`, `hud.ts` | S | 2 |
| 19 | chapter spawns; plan §3.4 times | Chapters open cold at x 1 (Granskogen and Myren with nothing; Gården with the repeated lines); the Saturday's clock never shows | A 2.5 s opening card on Moa's paper: crayon clock, sun or moon, the place in her hand; the tune's first bar; the ghost looking back in the first frame. At 18:00 the church bells ring (existing `bell` cue). | DOM overlay, `sv.ts`, audio | S–M | 2 |
| 20 | `main.ts:764,804,818,892`; `cues.ts:150-218` | The audio sleeps whenever a panel is open: memories, painting, sharing, carving and every card are silent (plan §5.8: a memory gets a solo fiddle); the POFF, the grow-back and the lights have no sound | Duck the music to 40 % under panels instead of sleeping; memories play the tune alone (melody, tempo 72, bright 0.35) from bar 1; new cues `poff` (a rising glitter run over a soft low thump; reversed for growing), `pling` (the windowsill's bell, row 9) and `flare` (a soft high chord as the lights flare). | audio code, `main.ts` | M | 3 |
| 21 | `main.ts:777`; `music.ts:110-143` | The chase knocks play whenever the ghost is within 9 EL (66–77 % of play), so they mark nothing; the ghost has no motif | The ghost's motif is POLSKA bar 1 (D–F–A–D) on wood, at each mystery beat: glance, gully visit, vittra gift, thanks, each new card, the cliff, the reveal, the naming (there with the full tune). Chase knocks only while it flees, before the rescue. | audio code, `main.ts` | S | 2 |
| 22 | `memory.ts:53-79,107`; `main.ts:806-819` | Memories come 17, 16 and 14 minutes apart, late in their chapters, and end straight back into play (Berget's 2.9 s before the card) | Ease in and out (`narrative-craft.md:292`): before, the music thins and the shaving glows 1 s; after, 4 s of free play while the camera holds on the memory's place now (shavings, stump, boardwalk, pine). The figure recurs in the cards (row 4). | `main.ts`, view code, audio | S–M | 2 |
| 23 | `ui/story-context.ts:12-29`; `ui.css:1117-1143` | A quest line is on screen nearly all the time (hidden only under a bubble), doubles the button word and states the reveal as text | Show it for 6 s when it changes, after 10 s standing still, or on a tap; always in the pause recap; never during rides, memories, the coda or the page. (Question 2.) | UI code, `main.ts` | S | 2 |
| 24 | `hud.ts:141-148`; `ui.css:810-837` | A bubble is a caption at the top centre with the speaker's name in small capitals; off-screen speakers (Pappa in Gården, Bertil on the cap ride) are just a word | A portrait (`ui/story.ts:11-18`) at the bubble's left, and a tail towards the speaker when in the picture, or an arrow to the edge on their side when not. | `hud.ts`, view code | S–M | 2 |
| 25 | `sv.ts:227-277`; `ends.ts:201`; `norrsken.ts:108-113` | Elof is silent at the climax; Bertil has one main-path line; the mouthless ghost speaks "Klonk, klonk!" in a labelled bubble | Add the six lines in 5.5 (Elof on `eyes` and after Pappa's last line; Mamma, Moa with her jacket, Bertil with his cap at the reunion; Elof's question). Draw "klonk" as sound letters popping at the ghost's feet on each hop. | `sv.ts`, chapter data, view code | S–M | 2 |

## 6. Gameplay that tells the story

1. **The call is the radio** (Firewatch's walkie-talkie, Journey's chirp). One input, a tap on Elof, that the
   family always answers from where they are (row 14). Its answers carry the arc: from afar in Gården; Pappa from
   the ravine's rim; in Berget, after a long silence, all four from far below; at the summit the headlamps arrive
   in answer. The ghost ignores it in Gården, knocks back after the eddy, and knocks first on the mountain.
2. **Måla three times** (Brothers). The same trace panel wakes the ghost, restores the trägubbe and finishes his
   own figure; each is followed by the same "pling" and a blink (row 9). The second needs the crowberry he picked
   himself, so the gesture that caused the chase is the one that ends it.
3. **Lift for someone smaller.** The giants lift him all game (the pine, the seesaw, the cap, the shoulders); the
   ghost needs *Lyft* at the cliff. Once he is big on the summit, his last act before *Gå hem* is *Lyft* on the two
   carvings (a `carry` spot; the view already places them with him, `view.ts:1013-1015`): he becomes the giant.
4. **Hold to hug** (Spiritfarer). At the reunion, holding Använd beside each family member for a second makes them
   kneel and close their arms (row 13), with their motif; Moa's jacket and Bertil's cap appear on Elof after
   theirs; when all four are hugged, *Gå hem* appears.
5. **The same *Ge* for both.** Elof's give (jay, vittra door, sharing, party) and the ghost's gift (row 7) use one
   pose and one double knock, so a child sees the ghost doing what he does before anyone explains why.

## 7. The five to do first

1. **Endings as storybook pages** (rows 17, 2, 18, 1): bubbles finish, a coda with a cadence, the page with the
   map drawing; Gården without the repeated lines. One visible outcome in every chapter. M–L.
2. **The ghost's escalating device** (rows 4, 5, 6, 21): a card in every chapter, the question asked, the waiting
   seen, the ghost's motif. S–M.
3. **The family on the radio** (rows 13, 14, 12): posable rehearsal arms, the answered call, waving back, the
   worried family at the shrink. M.
4. **The lore paid off on screen** (rows 8, 9, 10, 11): the party by the pine and the reveal's pause, the blink,
   the shelf filled by Elof, Pappa beside him at the carving. M.
5. **Sound for the story** (row 20): music ducked instead of slept, memories with the tune, POFF, pling, flare. M.

## 8. Questions for Olov

1. **Do the grown-ups ever see the ghost move?** Rule 2 says they only see a carving, but at the party it hops in
   front of everyone. (a) Never: at home it freezes whenever a grown-up looks, and the very last gag is Pappa
   turning round to an empty place while the ghost winks at the player; (b) the family sees it walk at the
   reunion. Default: (a).
2. **The purpose line** added on 4 October: keep it always on screen, or show it on change, when Elof stands still
   and in the pause recap (row 23)? Default: on change and on demand.
3. **Elof's first figure:** keep it on the windowsill (the plan), or let him set it on Pappa's shelf beside Pappa's
   first, two first figures side by side, with the blink there? Default: the windowsill.
