# Narrative audit: Myren (Kapitel 3)

Area: chapter `myren` (`src/content/chapters/myren.ts`), its lines in `src/content/sv.ts`, its case in
`src/content/story-context.ts` (l. 69–86), the mist, chick and family code in `src/render/view.ts`, memory 3 in
`src/ui/memory.ts`, the thought picture in `src/render/ghost-thought.ts`. Audit of 5 October 2026.

How it was measured: the robot's playthrough as a timeline (the brief's harness, 60 Hz), and eight pictures of the
running game at 844×390 on Low with stand-in figures (listed at the end of §2; not kept). The family are box
figures here, so staging, timing and what is understood were judged, never likeness. "Elof ≈" scales the robot's
walking time by 12.5, which turns its 61 s to the crane into the plan's 12–15 minutes (plan §4.9); fixed-length
moments (the memory's 7.2 s, the ride, the card's delay) are added as they are. Line numbers are of 5 October.

## 1. Verdict

A seven-year-old crossing Myren now follows a ghost that hops away from him exactly as it did in Kapitel 1, sees a
giant Mamma hop for joy while a log rises out of a pool by itself, climbs her braid, finds a lollipop standing next
to a bigger lollipop, walks into mist holding a light, and leads a chick that slides after him to an empty patch of
moss. On the way a memory stops him with three identical little boys, a boy on a man's shoulders whose raised
hand and figure are cut off by the frame, and a figure before a mountain; then a grey bird lifts him up a brown
wall and the card comes five seconds after he climbed on, in sudden silence. He understands the jobs (follow, call
Mamma, take the light, bring the chick) and almost none of the feelings: he cannot see that the ghost gave him the light, that the chick has a
family, that a small grey thing alone on the mountain is the reverse of that reunion, or that his raised light is
his three-year-old self raising the first trägubbe on the same walk. What is missing most is the chapter's heart:
a reunion with a family on screen, the cranes' dance, and a take-off at 18:00 as the ending, with Mamma's lamp below
and the ghost beside him. Most of the parts exist (the chick, the rings, the thought picture, memory 3, the crane
ride); they need a family to come home to, the plan's order, and an ending in the air instead of on a wall.

## 2. As it plays now

| Robot s | Elof ≈ | x | What happens | Understood without reading |
| --- | --- | --- | --- | --- |
| 0–0.8 | 0:00 | 1–3 | The bog's edge. The ghost (x 6) hops on as soon as he moves; big candy 0; two cranberries bounce | Follow the ghost and the candy |
| 0.5–14.0 | 0:00–2:55 | 3–50 | Firm tussocks over water; the ghost hops seven times, always when he is 4 EL away; side leaves; a moose may cross far off (`myren.ts:412`) | Hop tussock to tussock; the ghost runs from me |
| 14.0–23.4 | 2:55–4:52 | 50–83 | Two runs of soft tussocks (E3) round the island's big candy 3; the toss puzzle off the trail | Pale tussocks sink: don't stop |
| 23.8–24.4 | 4:58–5:05 | 84.8 | *Ropa på Mamma* (`mamma`, `placed:pine`): a giant figure hops; a log rises from the pool 5 EL away by itself (picture 1) | Calling Mamma makes a bridge appear |
| 29.6–34.4 | 6:10–7:10 | 102–104 | *Ropa på Mamma* (`braid`): her braid comes down; he climbs it | Mamma lends her braid |
| 34.8 | 7:15 | 105.4 | Mamma: "På myren går vi på spången." while he runs; she is cut off at the picture's lower left (picture 2) | Only if read |
| 34.8–44.5 | 7:15–9:16 | 105–138 | The boardwalk and its ramp; optional rings between the dead pines; cranes may cross the sky (`myren.ts:413`) | Nothing new |
| 45.3 | 9:26 | 141 | *Ta lysklubban* (`light`), beside the big candy's own swirl lollipop (picture 3); the mist rolls in over 3 s; the trail shows in the light | The light shows the way; not that it is a gift |
| 45.8–49.9 | 9:36–10:24 | 142–157 | Tussocks in the mist; the ghost waits at 160.7, then 172.5 | — |
| 51.8 | 10:48 | 163.7 | `chick`: the chick follows; Elof: "Följ mitt ljus hem till din familj."; rings rise from empty moss at x 177.4 | The chick follows my light |
| 53.2 | 11:05 | 168.6 | Big candy 8; the camera cuts to a two-shot with a giant Mamma who has stood here since the chapter began (picture 4) | Mamma is here, for no reason |
| 53.5 | 11:09 | 169.5 | `memory`: memory 3, 7.2 s, silent (picture 8); as he walks on the ghost hops to x 186.5, beyond the crane | A family walk; who is who is unclear |
| 55.0 | 11:35 | 174.9 | `home`: the chick stops at empty moss; Mamma: "Ungen är hemma. Vill du ha en spång?" | The chick stopped |
| 56.8–57.4 | optional | 170.1 | *Ropa på Mamma* (`bog:return-bridge`): a plank rises over the mist; "Över dimman, och tillbaka igen." | A way back |
| 60.1–60.8 | 12:38–12:47 | 180–182 | Big candy 9; at x 186.5 the ghost's card shows a pine, a crack and a small grey thing while *Kliv upp* waits (picture 5) | Something in a crack, if he waits |
| 60.8–64.6 | 12:47–12:51 | 182–197 | `crane`: the kneeling crane shrinks away and a flying one appears under him; a 4.5-s arc onto the top of an 8-EL wall (picture 6) | A bird lifts me up a wall |
| 64.6–66.0 | 12:51–12:52 | 197–198 | `goal`; the bird shrinks away; 1.4 s; the card (picture 7); all sound stops | The chapter is over |

**The longest stretches with no story.** (1) The first five minutes (robot 0–23.8 s, x 0–84): tussocks, soft
tussocks and nine ghost hops, each at 4 EL; no family, no line, no ghost moment (the moose is chance). (2) 7:15 to
9:26 (34.8–45.3 s, x 105–141): the boardwalk's 9.7 s of plain running (`tests/robot/pace.test.ts`) and the ramp.
(3) The reunion (55.0–60.8 s): nothing happens when the chick arrives (picture 5).

**How it ends.** The last image is Elof on a grey ellipsoid crane rising over an 8-EL brown wall onto a grass top
(`myren.ts:301–304`, picture 6). The bird shrinks to nothing as the ride ends (`view.ts:753`), he stands about
0.7 s, and the card comes 1.4 s after the goal (`main.ts:888–889`): 5.2 s from *Kliv upp* to the card, with every
sound cut at once (`main.ts:892`, `audio.ts:465–476`). The ghost stays behind at x 186.5, below the wall
(`myren.ts:436`; `sim.ts:670–674` lets it leave only when he is within 1.6 EL). At 844×390 the card opens scrolled
to *Nästa kapitel*, so its title, candy rows and the map's bog are out of sight (picture 7). Kapitel 4 then begins
with a second take-off from the ground (`berget.ts:33`, `:185`).

**The pictures** (all `?dev&debug&standin&course=myren&tier=low&…` at 844×390): 1 `at=84,0&flags=mamma`;
2 `at=105.5,4.5&flags=mamma,braid`; 3 `at=139.5,0&flags=mamma,braid`; 4 `at=167.8,0&flags=mamma,braid,light,chick`;
5 `at=181.5,0&flags=mamma,braid,light,chick,memory,home`; 6 the same after *Kliv upp*, at x 188; 7 the same, the end
card; 8 the three SVGs of `MEMORIES.myren` (`memory.ts:67–71`) drawn as they are.

## 3. What is good, and stays

- **The light is the key to the second half.** The trail ends at the lollipop and the rest shows only in its light
  (`myren.ts:481–486`, held by `tests/robot/myren.test.ts:94`); the mist comes only once he holds it (`:406`). Cause
  and effect without words, and the tone rule (no darkness without a warm light near) in one stroke.
- **Elof's own caring line,** "Följ mitt ljus hem till din familj." (`sv.ts:256`): the first time he is the helper,
  and he says it himself.
- **The rings that rise while the chick follows** (`view.ts:1476–1483`): the family's calls as a picture, so it
  works with sound off. They only need a source (finding 1).
- **The ghost's thought picture:** a pine, a crack and a small grey thing (`ghost-thought.ts:46–60`), the right step
  between Kapitel 2's mountain and Kapitel 4's lonely figure.
- **Mamma's crossings use her sheet's traits** (strong: the log; creative: the braid), and Elof still walks and
  climbs them himself.
- **Memory 3's last picture,** the figure facing the mountain with its pine (`memory.ts:70`): the right last image;
  keep the idea, fix the drawing (finding 4).
- **Foreshadowing in the far scenery:** cranes cross the sky just before the lollipop (`myren.ts:413`), what will
  carry him later; a moose on the far shore (`:412`).
- **Soft failure and a turned rule:** the soft tussocks put him back gently, the toss turns "don't stop" into "stay"
  (`docs/level-design.md` §3), and the shy lights are shy, never tricks (C3).
- **Short, honest purpose lines** ("Led tranungen till sin familj.", `sv.ts:152`), and the hand-off that waits for
  `home` (`story-context.ts:121`).

## 4. Findings

| # | Where | What is wrong | The fix, concretely | How it is built | Cost | Value |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | x 176–182, `home`; `myren.ts:377`, `:415`; `view.ts:1437–1483`; picture 5 | **Emotion, cause and effect.** The chick's family does not exist. At `home` the chick walks to empty moss at x 177.4 and stops; the rings stop. The only adult crane is the kneeling ride 4.6 EL further on, there and silent since the chapter began (`props.ts:396–409`). "Someone small and lost is brought home" (plan §3.4) has no home | Two adult cranes stand at x 177.2 and 178.6, heads up, and the chick's home is between them (x 177.9). While the chick follows, each ring rises from a parent's beak with the bog's crane call (`music.ts:241–245`) sounded on it, louder as he comes nearer, and the chick turns its head to each ring (plan §3.4). At `home` the chick overtakes him, peeping; the parents lower their necks round it (1.5 s); all three call together and three rings rise at once. The camera eases out to zoom 1.6 to hold him, his light and the family in one frame. Elof's giggle (existing cue). No bubble | Chapter data (two `decor` of a standing-crane look; the follower's `home` beside them); view code (ring origins, head turns, the necks' bow); an audio cue per ring. The crane model: visual audit row 9 (Blender) | M | 3 |
| 2 | The ghost's thought: `myren.ts:435–436`; `ghost-thought.ts:12–19`; picture 5; timeline 53.9 s | **The ghost's mystery.** The clear picture shows only at x 186.5, beyond the crane, while *Kliv upp* is offered. The one on perch 15 can never show: the ghost leaves x 172.5 when he reaches x 170.9, and `home` is at x 176. Nothing sets the family made whole beside the small thing alone | Perch 15 moves to (181.4, 0) with `until: 'memory'`, 2.8 EL from the nearer parent. At `home` the ghost, standing apart from the cranes, looks at them (a dotted `glance` line, 1.5 s), then at the mountain (to the far layer's knob, 1.5 s), with a slow creak (plan §2.2: sad), and its card opens: pine, crack, small grey thing. Elof tilts his head, the ghost's own tilt. The camera holds three parts: the family left, the ghost in the middle, the mountain right | Chapter data (`glance` from `home` until `memory`, two targets; the perch); audio (creak on the glance); view code (Elof's tilt). Perch 16 goes (finding 8) | S | 3 |
| 3 | Memory 3's place: `myren.ts:384` (x 170.6); timeline 53.5 s (`memory`) before 55.0 s (`home`) | **Order, place.** It is touched while the chick follows, before the reunion and before the clear picture, against plan §3.4's order (reunion, the ghost's clear bubble, memory 3, the dance). It cannot answer a reunion that has not happened, and it plays in the two-shot with Mamma (finding 11). It lies on moss, not on a boardwalk, 65 EL and three scenes after "På myren går vi på spången", so nothing connects the memory's walk to her line | The shaving lies at (180.8, 0) with `needs: 'home'`, at the ghost's feet, so the memory grows out of its card and shrinks back into it (plan §2.4 rule 1). It lies where an old grey spång begins: 9 EL of weathered planks, half sunk at the far end, from the clearing towards the mountain (x 181–190, level with the moss, `surfaces` wood, drawn as planks). After the memory he has 3 to 5 s of free play on the spång as it is now, while the mist thins along it (finding 14): the research's "ease out" (`docs/research/narrative-craft.md`) | Chapter data (spot, ground, surface); the tests that place memories and thoughts (`tests/unit/memory.test.ts`, `tests/browser/ghost-thoughts.mjs` at x 183) | S | 3 |
| 4 | Memory 3's pictures: `memory.ts:68–70`; picture 8 | **Clarity, lore.** (a) Moa and Bertil are drawn with `littleElof()` (x 58, x 142): three identical small boys in light blue with golden fringes. (b) Picture 2 crops its point: little Elof's head is at y ≈ 2 and the figure's head at y ≈ −3 of a 200-high frame (`littleElof(150, 58, 70…)`, `figure(172, 14, 30…)`), so the figure held up "to see the way" is outside it. (c) The boardwalk is one thin dark line over flat ground: its `stroke-width="7" stroke=…` come after `${stroke}`'s own, and `innerHTML` (`:280`) keeps the first of a repeated attribute, so it is drawn 3 px in ink (ten places in the file repeat the pattern). No planks, tussocks or water, and none in pictures 2–3. (d) Picture 3's pine is a bent stroke, unlike the ghost's pine (`ghost-thought.ts:48–54`) | Picture 1: a spång of three planks with gaps on cross logs over tussocks and a dark pool; the family walking right, towards the mountain: Bertil, small, in a peaked cap, running ahead; Mamma with her braid holding a small Moa (long hair, a dress, no blue) by the hand; Pappa with little Elof on his shoulders. Picture 2: framed lower, so the raised hand and the figure sit 30–40 % from the top, the figure facing the mountain. Picture 3: as now, with the pine drawn as in the ghost's card. Under it the polska's opening on a slow solo pluck (plan §5.8: "a memory gets a solo fiddle"), not silence (`main.ts:818` puts all sound to sleep) | `src/ui/memory.ts` (two new cut-outs, a spång); audio (a memory arrangement instead of `audio.sleep`). The animated memory with the family's models: Blender on Olov's computer | S (pictures), M (sound) | 3 |
| 5 | After memory 3; the lantern: `view.ts:1414–1430` | **Lore.** Little Elof holds the figure up on Pappa's shoulders "so that it can see the way"; Elof has held his light up for the chick all through the mist. Nothing shows that the two gestures are the same, or that he is walking the way his figure went (memory 4 is that day's sunset, plan §3.4). The lantern's size follows the mist (`glow.scale.setScalar(k)`), so it would go out if the mist lifted | As the memory shrinks back into the ghost, Elof stands 1.5 s at the spång's foot with the lollipop raised at full arm, facing the mountain: little Elof's pose, now. The lantern follows the `light` flag, not the mist, and stays lit through the take-off | Chapter data (`later` 1.5 s with `hold` after `memory`); view code (a raised-arm pose; the lantern's scale by flag) | S | 3 |
| 6 | The cranes' dance (S4): spot `crane` (`myren.ts:385`); `props.ts:396–409`; `myren.ts:35–37` ("Not built yet: … the cranes' dance") | **The set piece is missing.** The crane kneels at x 182 from the start; *Kliv upp* shrinks it away (`props.ts:203–209`) and a second crane appears under him (`view.ts:753`). The chapter's planned peak is a button | After memory 3 the parents dance on the moss beside the spång, the chick hopping between them: bows, leaps with half-open wings, a tuft of moss tossed. They dance for as long as he watches; each Hoppa within 4 EL is answered by a leap (§6, item 3). After his third hop, or 6 s, the nearer parent walks onto the spång at x 184 and kneels with a wing lowered as a ramp: *Kliv upp*. He climbs the wing (0.6 s) and the same bird lifts him | View code (dance loop, kneel, answers to his jumps, one bird for the spot and the ride); chapter data (a `later` flag `bog:kneel`; the spot `needs` it). The poses on the Blender crane (visual audit row 9) | M | 3 |
| 7 | The end: `myren.ts:187`, `:275`, `:301–304`; `main.ts:888–892`; pictures 6, 7; timeline 60.8–66.0 s | **The ending.** A 4.5-s hop onto a brown wall, the bird gone, under a second of standing, the card at 1.4 s with every sound cut. Then Kapitel 4 takes off again from the ground (`berget.ts:33`, `:185`): two take-offs, no flight. It is what the research warns against: "never cut from a landing to a card" | End on the take-off (§5): no wall. The crane runs along the old spång, lifts and climbs out of the chapter to the right: `CRANE` from (184, 0) to (214, 18), rise 2, time 10, its candies moved to before x 200; `goalX` 200, crossed about 5.2 s into the ride. The card waits 3.5 s after the goal, so it comes over the held, wide frame of the crane still in the air, before the ride ends (nothing lands in this chapter); sound fades over 1.5 s under the card instead of stopping. Kapitel 4 opens in the air (Berget's audit) | Chapter data (ride, goal, ground, a camera zone from 182 to 214 easing to zoom 2.4, lift 3); `main.ts` (a chapter's `endHold`, default 1.4; a fade before `audio.sleep`); `types.ts` | M | 3 |
| 8 | The ghost at the end: `myren.ts:436`; `sim.ts:670–674`; `berget.ts:195` | **The ghost's thread, logic.** After a chapter of "it waits for me" they part: he flies, it stays below the wall, and on the mountain it is already waiting 4.5 EL from where the crane lands | The ghost walks to the kneeling crane behind him and scrambles up with the bag on its back; it sits stiff, a wooden toy, and at the lift holds on to his backpack with one hand. Their first journey together. In Kapitel 4 it hops off at the landing to its first perch (Question 1) | Chapter data (its last perch beside the crane, `until: 'crane'`); view code (drawn on the carrier, as the finale draws the carvings on Pappa's shoulders, `view.ts:1005–1010`) | S | 3 |
| 9 | The gift: spot `light` (`myren.ts:369`), perch 13 (`:432`), big candy 7 at x 139 (`:357`); picture 3; timeline 39.7 s | **The ghost's mystery, cause and effect.** The lollipop stands in the moss from the chapter's start; the ghost hops past it while he is 20 EL back on the boardwalk and waits 4.5 EL beyond it. Only the purpose line says whose it is ("Ta spökets lysklubba.", `sv.ts:150`). Three EL before it the big candy is also a red-and-white swirl lollipop, so the gift reads as a smaller checkpoint | The prologue's look, turned round: there it looked at the bag and took it; here it looks at a lollipop and leaves it. Perch 13 at (143.4, 0), `near: 2.5`. A beat at x 133, on the ramp with the spot in sight, sets `beat:gift`: the ghost draws a lollipop from the stolen bag, shakes it once so it glitters like the star, sticks it upright in the moss, steps back and looks at it (`glance`, 2.4 s), turns to him, knocks twice and hops into the mist. Until then nothing stands there. The lysklubba glows gold and throws the star's sparks; nothing about it is red and white | Chapter data (beat, perch, `glance`); view code (the lollipop hidden until `beat:gift`, a planting pose, sparks); audio (the double knock on `beat:gift`) | M | 3 |
| 10 | Mamma's lamp, x 136–190 with `light`; `myren.ts:35–36`; plan §3.4, §3.7; visual audit row 21 | **The family bond.** The plan's "Her lamp stays visible behind him for the rest of the chapter" is not built: in the mist nobody of the family is near. Visual row 21's glow fixed at x 127 leaves the picture within a few steps: at 844×390 the picture shows less than 5 EL behind him (measured with `__godis.screen`: from x 95, x 90 is out of it) | Mamma follows on the big path with her headlamp. From `light` on, a warm halo (2.5 EL, core 0.4, `#ffc878`, `fog: false`) at depth z −3, about two thirds up the picture and 10 % in from its left edge, trails the camera with a 1-s lag: it falls back a little when he runs and catches up when he stops. When the glitter bubble catches him the beam turns to him, and it steadies when he stands. When he waves (a tap on Elof, `view.ts:902`) it blinks twice back. At `home` it arrives with her (finding 11); at the take-off it blinks three times | View code (`buildMist`: one quad, no new shader) | S | 3 |
| 11 | Mamma at the clearing: sign `bog:return-bridge` (`myren.ts:380`); `view.ts:500–508`, `:839–846`, `:1579`; `sv.ts:257`; picture 4 | **Staging, words.** Every sign with a family word becomes her figure (`view.ts:500–508`); this one `needs: 'home'`, but only its glint waits (`:1579`). So a giant Mamma stands at the cranes' clearing all chapter, and during the escort the camera cuts to a two-shot with her (picture 4) while the chick's goal is off screen. At `home` she says "Ungen är hemma. Vill du ha en spång?": an offer of a ferry, not a feeling | Her figure at this sign is drawn, and can take the camera, only from `home`: she comes into the picture from the left, carrying the lamp (she followed his light). Her line: "Du lyste vägen hem åt den!" (26 characters), with her joy hop. The plank is offered by the sign's glint and *Ropa på Mamma* alone | View code (a per-spot flag for when its figure appears; the epilogue's knife sign and the final's *Gå hem* sign, which also have `needs`, keep their own staging); `sv.ts` (`bogFamilyHome`) | S | 3 |
| 12 | The top of the braid: `beat:spangen` at x 105.4 (`myren.ts:439`), big candy 6 at x 106.2; picture 2; timeline 34.4–34.8 s | **The family bond.** Plan §3.4: "At the top she warms his hands at her heart mug … The music turns warm, and the game saves." Built: the line comes while he runs, from a figure cut off at the picture's lower left; no mug, no pause; the bog has one arrangement (`music.ts:73`) | At the top he stands 2.5 s (a `later` with `hold`): Mamma's hand sets her white mug with the red heart on the boards beside him, steam curling; he holds his hands to it and gives a contented sigh (a new wordless sound in his voice); "På myren går vi på spången." comes during the hold. A camera zone over x 103.5–107 frames him, the mug and her braid over her shoulder, her face out of frame or soft (plan §2.3). From here to the lollipop the bog's arrangement gains its bass and a brighter pluck | Chapter data (`later`, camera zone, the beat's `on`); view code (mug, steam, his hands); audio (arrangement by flag). Her hands with the mug on the private model: Olov's computer | M | 3 |
| 13 | The pool: mover `pine` (`myren.ts:392`); `view.ts:985–999`; picture 1; timeline 23.8–24.4 s | **Cause and effect.** Plan: "Her hands lift a fallen dead pine across the pool." Built: she hops for joy and the log rises from the water 5 EL away by itself. Magic, not Mamma's strength. And the ghost has already hopped over the pool before he calls (perch 8 at x 82.4 to perch 9 at x 98, timeline 22.3 s), so the pool stops only Elof | She kneels (0.4 s) and reaches into the pool; the log comes up with her hands under it (1 s) and is laid on the far bank (0.4 s) with a splash and a deep wooden knock; then she stands and hops for joy. The ghost waits on the near bank (perch 8, x 82.4, `until: 'placed:pine'`): it freezes stiff as she bends (rule 2, the prologue's joke) and topples flat; when she straightens it scrambles up and is first across her bridge. A laugh in the mysterious chapter, and the pool stops the ghost too | View code (a reach pose; the mover timed to it; the prologue's frozen pose reused); audio (`splash`, `wood` exist). The private model's reach: Olov's computer | M | 2 |
| 14 | The mist and the hour: `myren.ts:406`; `view.ts:1414–1430`; `view.ts:884` (`evening()` is the mountain's only) | **The ending's image.** The mist, once in, stays full, and the light never moves, though the chapter runs from 16:30 to 18:00 (plan §3.4). The mountain is hidden at the moment the ghost thinks of it | At `home` the mist thins to 40 % over 4 s, from the right, and the far layer's mountain (the long back with its knob) shows, gold, with the pine on the knob where the ghost's look ends (finding 2). Across the chapter the bog's sun lowers and warms with `evening(x)`, most from x 160 | View code (the mist with an `until` and a floor; `evening` for the bog) | S | 2 |
| 15 | Perches 0–14 (`myren.ts:417–433`, no `near`, so 4 EL: `constants.ts:105`, `sim.ts:668`); `sv.ts:147`; timeline 0.5–45.8 s | **Gameplay contradicts the story.** The recap says "Spöket flyr inte som förut.", but for the first 160 of the chapter's 197 EL the ghost keeps Kapitel 1's 4-EL distance | `near: 2.2` on perches 0–14. When he has stood still 4 s it knocks twice ("come"). On the island (perch 7, x 66), after the glitter bubble has carried him back, it tilts its head, as at his first bubble in Kapitel 1, and waits at the island's near edge | Chapter data; view code (knocks on idle, tilt after a bubble); existing knock cue | S | 2 |
| 16 | The first five minutes, x 0–84 (robot 0–23.8 s) | **Pacing, the family bond.** The longest stretch with no story, and no opening: the ghost hops at 0.5 s. The first family presence is the sign at x 84.8, about five minutes in | An opening, held 2.5 s: the bog's edge in afternoon light; the ghost on the first tussock looks back at him and knocks twice before it hops (it waits now). Far behind on the bog's edge (z −12) Mamma's figure comes out of the forest with her mug and walks along as he goes, stopping when he stops, until she comes forward to the sign at the pool. At the island's big candy (x 65) she raises the mug. The recap "Mamma … följer spången ovanför mig" (`sv.ts:188`) becomes something seen | Chapter data (`later` with `hold` at the start); view code (a far figure walking with his x; the stand-in here, the private model's walk on Olov's computer) | M | 2 |
| 17 | The chick following, x 150–177: `view.ts:1467–1474` | **Gameplay.** It slides 1.2 EL behind him whatever he does, over open water when he jumps (its y eases to his `standY`), never waits and never turns to its family. Guiding asks nothing of him | It hops tussock to tussock behind him, one hop after he lands; it stays inside his light (more than 4 EL behind, it stops at the light's edge, peeps and sits until he waits or comes back); it turns its head at each ring. On *Lugnt* it keeps up whatever he does (§6, item 1) | View code (the follower; the flags still come from touches) | M | 2 |
| 18 | The sound of the end: `main.ts:892`; `music.ts:241–245`; plan §3.4 Kapitel 4 (bells at 18:00), §5.8 (a birch-bark horn for the cranes) | **The ending.** The last sound is cut off by the card; neither the 18:00 bells nor the cranes' horn is in the game; the bog's crane call is random, every 11–24 s | At the lift, a far church bell: the stones' `bell` cue (`audio.ts:235`) pitched low (MIDI 45 and 52, 4-s decay, a stroke every 2.2 s); with it the polska's first phrase on a horn voice (*näverlur*). The bell rings on under the card and fades; Kapitel 4 opens inside the peal. It means Saturday evening: tonight the sweets may be opened (`sv.ts:269`) | Audio (a church-bell cue on a flag, a horn voice); chapter data (`later` flag 2 s after `crane`); `main.ts` (fade) | M | 2 |
| 19 | The jay at the end; plan §3.4 S4 and the final's step 7 | **Lore, set-up.** "The jay flies off towards the boardwalk" is not built, so the final's "the jay found them" has no seed | At the take-off the jay leaves his side, flies down-left to Mamma's lamp, circles it once and lands on her shoulder; the lamp blinks. In Kapitel 4's flight the four headlamps cross the bog with the jay ahead (Berget's audit) | View code (a scripted flight of the helper bird on `crane`) | S | 2 |
| 20 | The album: `photos.ts:8–16`; `sv.ts:318–321` | **The family bond.** Myren has no photo moment, and Mamma has none of her own, where Moa (the plane), Bertil (the cap) and Pappa (the carving) do | A photo "Mammas fläta": flag `braid`, mode `climb`, 1.5 s in, him halfway up her braid | `photos.ts`, `sv.ts`, the album test | S | 2 |
| 21 | The card: `sv.ts:206`; `hud.ts:150–183`; picture 7 | **Words, the ending.** "Tranungen är hemma. Tranan ger mig skjuts, och familjen följer stigen." reports the plot and drops the question the chapter leaves. At 844×390 the card opens scrolled to *Nästa kapitel*: the title, the candy and the map are out of sight | Title "Mot berget"; text "Tranungen hittade hem. Spöket tänker på något litet i en spricka vid en tall." (what the card showed, nothing more). The card opens at its top on a landscape phone (shared with every chapter: the lead's) | `sv.ts`; the card's layout (`hud.ts`, `ui.css`) | S | 2 |
| 22 | The optional loop's lines: `sv.ts:258–259`; beats `myren.ts:442–443` | **Words.** Two of the game's 60 or so captions (plan §3.7) go to an optional plank with no story in it | Cut both beats. The plank stays, wordless: it is "På myren går vi på spången" laid by her hands for him. When it is down she pats it once with a flat hand, and the lamp (finding 10) lights it while he walks it either way | Chapter data; `sv.ts`; view code (the pat); `tests/robot/myren-loop.test.ts` | S | 1 |

## 5. The narrative thread for Myren

| Part | Proposal |
| --- | --- |
| **The emotional question** | *Kan någon liten hitta hem i dimman?* Can someone small and lost find the way home? Yes, when someone holds up a light: the ghost lights his way, he lights the chick's, Mamma's lamp lights his. And the ghost shows him that someone small is still not home. |
| **The ghost** | Kapitel 2 ended with it waiting and a mountain in its bubble. Here it escalates in six steps: it waits closer and calls him on (15); its first gift, the light, given in view, the prologue's theft turned round (9); in the mist it waits at the edge of his light, a guide; after the reunion it looks from the cranes to the mountain and shows the pine, the crack and a small grey thing (2); memory 3 grows out of that card (3); it flies with him (8). The question carried to Kapitel 4: what is the small grey thing it wants? |
| **The family** | Present while he plays: Mamma's far figure before the mist and her lamp in it (16, 10). Worry: the lamp turns to him when the bubble catches him. Help: the log (strong), the braid (creative), the mug (warm) (13, 12). Pride: "Du lyste vägen hem åt den!" (11). Farewell: three blinks of the lamp as he lifts, and the jay flies to her (19). |
| **The lore** | Memory 3 is the walk to the mountain on the day the first trägubbe was lost (memory 4 is that day's sunset): the same bog, a spång, the same mountain. Little Elof holds his figure up so that it can see the way, and Elof now holds his light up the same way (5): he is walking the way his figure went, and Mamma's "På myren går vi på spången" is that walk's saying. The shoulder ride sets up the finale's (Elof on Pappa's shoulders with both carvings). |
| **The set piece** | The reunion, the cranes' dance and the take-off at 18:00. |

**The ending, shot by shot** (t = 0 when the chick reaches its parents; about 35 s with the memory, which a tap
moves on).

| t (s) | The image and the camera | Who moves | Sound | Words |
| --- | --- | --- | --- | --- |
| 0–3 | Wide, easing out to zoom 1.6: Elof with his light, the chick, two parents at the foot of the old spång | The chick overtakes him; the parents bend their necks round it; three rings rise together | The three call in unison; his giggle | — |
| 3–5 | The same frame; her lamp reaches the left edge and Mamma comes in behind him | Mamma hops for joy | Her babble | Mamma: "Du lyste vägen hem åt den!" |
| 5–8 | Three parts: the family left, the ghost alone in the middle, the mist thinning right onto the gold mountain and its pine | The ghost looks at the family, then at the mountain; its card opens; Elof tilts his head | A slow creak | — |
| 8–16 | Memory 3 grows out of the card and shrinks back into it | — | A solo pluck: the polska's opening | — |
| 16–18 | Elof at the spång's foot, the light raised at full arm towards the mountain | He holds little Elof's pose 1.5 s; the ghost looks up at him | The pluck's last note rings | — |
| 18–24 | Free play: the dance | The parents bow and leap, the chick hops; his hops are answered; one parent kneels on the spång | A crane call on each leap | — |
| 24–26 | Close: *Kliv upp* | He climbs the wing; the ghost scrambles up behind him with the bag | The ghost's wooden knocks | — |
| 26–30 | The camera pulls back and up (zoom 1.5 to 2.4, lift +3) | The crane runs four steps along the spång and lifts; the other parent and the chick lift beside it; below, Mamma's lamp blinks three times; the jay flies down to her | Wingbeats (stick up beats harder); the first stroke of the 18:00 bell | — |
| 30–33 | The last image: out of the mist into the gold; three cranes in a short line; Elof holds his light towards the mountain, the ghost holds on behind; the mountain and its pine ahead | Held | The bell, and the polska's first phrase on the horn | — |
| 33–36 | The card fades in over the held frame | — | The bell fading under the card | "Mot berget" / "Tranungen hittade hem. Spöket tänker på något litet i en spricka vid en tall." |

**The judgement on the ending:** the ride starts as this chapter's end and goes on as the next chapter's start.
Myren owns the dance, the kneel and the lift, which are its peak; Kapitel 4 owns the flight over the valley and the
full peal (plan §4.9: Myren "ends on climbing onto the crane"; §3.4 puts the bells in Kapitel 4's flight). The first
bell stroke at the lift is the stitch between them, and nothing lands in Myren.

## 6. Gameplay that tells the story

1. **Waiting for someone small (the chick).** The ghost has waited for him since Kapitel 2; here he learns its
   patience. The chick follows only inside his light and hops a tussock after he lands, so he stops on each firm
   tussock and looks back. If he runs ahead it sits at the light's edge and peeps; when he comes back it hops to him.
   Nothing fails, and on *Lugnt* it keeps up anyway (finding 17).
2. **Raising the light** (the research's signature beat for Myren, "the lollipop held up for the chick"). With the
   lollipop in hand and nothing else to use, holding Använd raises it at full arm: the light grows from 9 to 12 EL,
   the chick lifts its head and walks faster, the next ring shows further off, and a shy light (C3) peeks out.
   Letting go lowers it. It is little Elof's gesture in memory 3, and after the memory the game holds him in it once
   (finding 5).
3. **Dancing with the cranes.** In the clearing his hops are answered: one hop, one leap; on the third, all three
   leap and a parent kneels. A child who only watches gets the kneel after 6 s. The controls carry the joy, as in
   *Brothers* (finding 6).
4. **Lifting off.** On the take-off, stick up makes the wings beat harder and the climb out of the mist steeper inside
   the ride's corridor. Nothing can fail, but he lifts himself into the evening light (finding 7).

## 7. The five to do first

1. **Give the chick a family, and stage the ghost between them and the mountain** (findings 1, 2, 14; M). The
   chapter's meaning, someone small brought home and someone small still alone, becomes a picture.
2. **Move memory 3 after the reunion, to the ghost's feet at an old spång, and redraw it** (3, 4, 5; S). It removes
   three identical Elofs and a cropped figure, and makes the gesture rhyme that carries the lore.
3. **End on the take-off:** the dance and the kneel, the ghost aboard, the lamp's blinks, the first bell, and the card
   held over the crane in the air (6, 7, 8, 18; M to L). The chapter's peak, and a hand-off with no second take-off.
4. **Let the ghost give the lollipop in view** (9; M). Its first gift, and the prologue's theft turned round.
5. **Mamma's lamp with him through the mist, no Mamma before her moment, and her pride at the reunion** (10, 11; S).
   The family felt while he plays, not only at signs.

## 8. Questions for Olov

1. **May the ghost fly to the mountain on the crane, behind Elof with the bag?** It would be their first journey
   together, and it explains why the ghost waits where the crane lands in Kapitel 4 (`berget.ts:195`). It changes
   the first seconds of Kapitel 4. The default: yes.
2. **Is memory 3's walk invented, or did the family walk somewhere like it?** The plan has a bog spång towards the
   mountain, little Elof on Pappa's shoulders holding his first figure (plan §3.4). If there was a real walk, and a
   photo of it, the memory can be drawn from it on your computer, never committed and never named by place unless
   you say so. The default: the plan's invented walk, with no real place.
