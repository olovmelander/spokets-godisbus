# The narrative audit (5 October 2026)

Olov asked for storytelling to be the heart of the game, after *What Remains of Edith Finch*, *Firewatch* and
*Oxenfree*: an atmospheric intro in which Pappa's new ghost comes alive, Elof shrinks for a reason he can see and
his frightened family stands by him; a memorable moment in every chapter; more of the ghost's mystery, the
trägubbar's lore and the giant family's help; endings with weight instead of sudden, flat ones; story-driven
animation; and an audit of narrative and gameplay. This overview says what works, what lets the story down most,
what this pull request does, and the order of the rest.

The seven audits (166 findings) measured the game before this pull request (robot timelines, pictures at 844×390,
stand-in figures), so `prologue.md` describes the old prologue. They are
[prologue.md](narrative-audit/prologue.md), [garden.md](narrative-audit/garden.md),
[granskogen.md](narrative-audit/granskogen.md), [myren.md](narrative-audit/myren.md),
[berget.md](narrative-audit/berget.md), [finale-and-home.md](narrative-audit/finale-and-home.md) (the finale, the
epilogue and Byn) and [threads.md](narrative-audit/threads.md) (what runs through the whole game). The research
note [narrative-craft.md](research/narrative-craft.md) says how those games and others (*Journey*, *Brothers*)
put story into play. Its sources were read only through a search tool's excerpts, never opened, so its quotations
need checking before reuse.

## The story in one page

One Saturday, Elof paints the eyes of the ghost Pappa has just carved; it wakes and takes his Saturday bag, and a
star from the bag makes him as small as the ghost. He follows it through the garden, the forest and the bog to the
old pine on the mountain, where a gust once took the first trägubbe Pappa carved for him: the ghost wanted the bag
for that figure's welcome-home party. On the summit he eats the gold sweet, grows, and rides home on Pappa's
shoulders to carve his own first figure.

| Chapter | Elof (`threads.md` §5.5) | The one moment to remember (the audit's proposal) |
| --- | --- | --- |
| Prologue | cosy, then alarmed | The shrink with a cause he saw, and the family kneeling round him (built in this pull request) |
| Gården | cross, then curious | Moa's paper plane, thrown from her hand, beating the ghost to the forest (`garden.md`, its set piece) |
| Granskogen | puzzled, then warm | Hauling the frightened ghost from the eddy; its thanks by hand; "Varför väntar spöket på mig?" (`granskogen.md` §5) |
| Myren | the guide | The chick home with its parents, the ghost alone between them and the mountain; the take-off at 18:00 (`myren.md` §5) |
| Berget | understanding | Memory 4 from the ghost's bubble at the crack; Elof waves down into it, as little Elof did (`berget.md` §5) |
| Norrskenet | generous | The ghost's welcome-home party for the old trägubbe; the lights flare and the figure blinks (`finale-and-home.md` §5) |
| Home | proud | Elof puts the old figure in the empty place, carves with Pappa, and Klonk sits by his figure (`finale-and-home.md` §5) |

**The ghost's mystery** is one device that sharpens (plan §3.3 rule 6): its thought card goes from a smudge of a
pointed-cap figure to its shape, the pine and the crack, and the lonely figure, and the finale's answer is
something the ghost does. Its behaviour turns with it: it flees, waits, walks beside him and leads
(`threads.md` §5.1).

**The lore of the trägubbar:** Pappa's hands carve and Elof's eyes wake (rule 1). It runs from the empty first
place on the shelf through four memories (carve, share, carry, lose) to the old figure blinking and the place
filled by Elof, with *Måla* three times (`threads.md` §5.2, §6).

**The giant family** helps where giants can (rule 8), stays near where he can see and call them, is frightened at
the shrink and proud on the way, and the reunion is his to do: call, hug, show Pappa (`threads.md` §5.3).

## What already works, and stays

- The opening's chain of causes on saved flags; the trail that pops out behind the running ghost (`prologue.md` §3).
- The four memories in the same cut-paper figures, replayable in the album (`threads.md` §3).
- The midpoint turn, where Elof rescues the thief and it then waits; kindness that opens the way; Myren's light
  as the key to the mist (`granskogen.md` §3, `myren.md` §3).
- The gated reveal, whose motive cannot be missed, and an ending where every step is played (`berget.md` §3,
  `finale-and-home.md` §3).
- The family's three-note motifs and Elof's call, the seed of a "radio"; Pappa carrying him home (`threads.md` §3).

## What lets the story down most

Ranked; each is found in several audits.

1. **Every ending cuts to a tally.** The card comes 1.4 s after an invisible goal line, in silence, over cut or
   queued lines in 6 of 8 chapters; the last images are walk-offs, end walls and Myren's crane ride cut short
   (Berget then takes off again), and the next chapter opens cold (`threads.md` §5.4, rows 17–19; `garden.md`
   21–24; `granskogen.md` 18; `myren.md` 7; `berget.md` 6, 20). Fix: one pattern, the storybook page: the last
   beat played, a coda with live input and a cadence, a page with Moa's map drawing the way on, the tally last.
2. **The ghost's mystery is not felt as steps.** Its card shows 0 s in the prologue and Gården and 0.9 to 2.2
   robot seconds later on, always in a chapter's last tenth; it still flees after the rescue, though Myren's
   recap says it does not, and "why does it wait for me?" is never asked (`threads.md` §5.1, rows 4–6;
   `myren.md` 15). Fix: a card in every chapter, a tap to show it, closer waiting, Elof's question, a motif.
3. **The family is away for long stretches and never acts what it feels.** About 14 minutes twice with no sign
   of them, lines from off screen, figures that can only turn and hop (`threads.md` §2, rows 13–16). Fix: the
   family "on the radio": his call answered with a motif, waving back, far sightings, lamps.
4. **Gifts, thanks and need are said, not shown.** "Spöket ger bort mitt godis!?" follows a gift nobody saw, the
   thanks is a plain sweet appearing, the lollipop stands there from the start, and the ghost hops through the
   cliff (`granskogen.md` 1, 16; `myren.md` 9; `berget.md` 9, 11). Fix: one gift act with the pose of Elof's
   *Ge* (`threads.md` row 7).
5. **The climax crowds itself, and the lore pays off off screen.** At *Smaka* eight things start in one second,
   the motive is HUD text, the old figure's blink is not built, and at home the shelf is already filled
   (`finale-and-home.md` 2, 5, 14; `threads.md` rows 8–11). Fix: the ghost's party by the pine, then the POFF,
   the flare and the blink in beats of their own; Elof fills the place.
6. **Memories and reveals are silent.** The sound sleeps whenever a panel is open; Berget's saddest picture is
   followed by a bright jingle, and Elof's conclusion is printed over memory 4 (`threads.md` row 20; `berget.md`
   1, 2, 6). Fix: duck the music, the tune under memories, quiet before a reveal.
7. **The peaks are buttons.** The cliff is one press with the answer in the HUD, the rescued leaf rises by itself,
   sharing is three full-screen forms, the reunion is watched (`berget.md` 7–9; `granskogen.md` 16;
   `finale-and-home.md` 6–8, 10). Fix: the feeling in the verb, as in *Brothers*: a haul, a boost, a held hug.
8. **Words carry too much, and some contradict the pictures.** The always-on purpose line repeats the buttons;
   Elof is silent at the climax; Moa is surprised in Gården to find him small, though she saw him shrink
   (`threads.md` §5.5, rows 23, 25; `garden.md` 14). Fix: the purpose line on change and on demand, six new lines.

## Done in this pull request

**A story scene system** (`src/sim/scene.ts`): a chapter's scenes as data. A scene begins on a flag (`on`), at a
place (`at`) or as soon as it may, can wait for a flag (`needs`) and for Elof's place (`from`), and is passed over
once its `until` flag is set. In a held scene (`hold`) he watches, his input held. `cues` set flags at their
moments, `lines` are bubbles at theirs, and `stage`, for the picture only, holds camera shots, actor keys, Elof
keys, effects, words and fades. It runs on the simulation's 1/120 s step, so it plays the same everywhere and a
pause holds everyone. Only a finished scene is saved, as `scene:<id>`; an interrupted one replays. `by: { done }`
stages a sequence the simulation plays itself, as the two freeze jokes are.

**The picture side.** `src/render/rig.ts`: a posable rehearsal figure in one draw call, and a rig that poses the
private family models by their bones. `src/render/acting.ts`: about 25 acts, from carving to kneeling and hugging,
with two-bone reaching. `src/render/stage.ts`: the ghost's own acts, the props (knife, brush, mug, crayon, Moa's
drawing) and the effects (shavings, sparkle, the magic stream, glow, POFF, the jay at the window).
`src/ui/scene.ts`: letterbox bars, a fade, a time-of-day caption and the title card.

**The prologue, rebuilt on it** (`prolog-scenes.ts`, `ends.ts`). "Lördagsmorgon": Pappa carves the ghost at the
kitchen table, Moa draws, Bertil's hand creeps towards the Saturday bag and Mamma's look stops it. Elof paints the
two eyes. While the grown-ups look at a jay at the window, so no grown-up sees it move, the ghost wakes and looks
at Elof, at the empty first place on Pappa's shelf, where the first trägubbe belongs, and at the bag; its magic
streams in and two sweets glitter. The theft, Mamma's freeze joke, the chase with the family following, the bag
torn on the doorway's hinge. On the deck he runs into the glittering star from the bag and, POFF, is the ghost's
size. The family kneels round him, frightened, and he chooses to step onto Pappa's open hand (*Kliv upp*). Moa's
drawing shows that the star made him small and the gold sweet glitters too; Pappa reads it as hope, that the gold
one can make him big again. Pappa's freeze joke at the railing, a promise from each, and the ghost hops down into
the garden under the title.

**The deck is out of doors.** Past the veranda the garden's sky and far scenery stand behind a railing along the
deck's far side, the house ends in a white corner board, and the lawn lies far below the deck's edge, where the
ghost hops down under the title. Pappa carries the frozen ghost to that railing. Elof rides Pappa's palm wherever
the run left him (a scene can put him on a hand), and an actor reaching for something turns to it. Before the title
he stops at the edge and listens until the family's four promises have been said (a scene can wait for quiet).
Only Moa glances back from the jay as the magic runs into the bag, so her "Jag såg det!" on the deck is true.

**Smaller.** The end card waits for the last line, at most 7 s; lines waiting when a held scene begins are
dropped; the tutorial teaches *Använd* at the brush and at Pappa's hand, and nothing during held scenes. The
rehearsal figures leaned and nodded the wrong way (a forward lean tipped them backwards); they lean forward now,
and a test holds that a reaching hand comes where it is aimed. The big candies keep their meaning in older saves
(the first is in the kitchen again), and a game taken up past the kitchen never replays the morning. In Gården,
Moa no longer says "pytteliten" a second time: at the root she says "Där kröp spöket in. Jag får inte plats!"

**Still open:** the family are stand-ins in a cloud session (the private Blender models replace them on Olov's
computer); the eyes are painted in the modal panel (`prologue.md` 4); a tally card still follows the title
(`prologue.md` 17); Gården still opens with Pappa's old lines from off screen (`garden.md` 1). A chapter played
again keeps its story's flags, so its scenes do not play twice and need no skip. Held stretches are at most about
10.6 s (the morning 10.5 s, the POFF with the kneeling
family 10.6 s, the lift 10.2 s; Pappa's joke now begins only when Elof sets off towards the ghost). Other help
points keep the box figures.

## The order of the work

One pull request per visible outcome. None raises `RELEASED_CHAPTER` or starts the next chapter's content. The
shared systems come first, as every chapter's moment stands on them; then the chapters in story order. Each
audit's "five to do first" lists its chapter's further steps.

1. **Gården picks up where the prologue ends:** no off-screen Pappa at its start, and a boarding line that clears
   stale bubbles (`garden.md` 1, 18; Moa's repeated "pytteliten", `garden.md` 14, is mended in this pull request).
   `garden.ts`, `sv.ts`. Cloud.
2. **Every chapter ends on a storybook page** and opens on a time card; the prologue hands to Gården under its
   title alone (`threads.md` rows 2, 17–19; `prologue.md` 17). `main.ts`,
   `hud.ts`, `map.ts`, a coda per chapter. Cloud.
3. **Sound that carries the story:** music ducked under panels, the tune under memories, POFF and pling, quiet
   before a reveal (`threads.md` row 20; `berget.md` 1–2). `src/audio/`, `main.ts`. Cloud; Olov listens.
4. **The ghost's thought sharpens, and it waits** (`threads.md` rows 4–6, 21). `ghost-thought.ts`, perches. Cloud.
5. **The family is with him while he plays:** posable figures at every help point, his call answered, waving
   back, far sightings and lamps (`threads.md` rows 3, 13–16). `view.ts`, `stage.ts`, `life.ts`. Cloud; the far
   silhouettes and the private models' acting on Olov's computer.
6. **Gården: Moa's plane beats the ghost to the forest** (`garden.md` 16–17, 20–23). `garden.ts`, `view.ts`.
   Cloud with stand-ins; the root arch and the plane are Blender models (Olov's computer).
7. **Granskogen: the rescue in his hands,** then the walk to the view of the mountain (`granskogen.md` 14–19).
   `granskog.ts`, scenes. Cloud.
8. **Myren: someone small comes home,** memory 3 at an old spång, the dance, the take-off with the ghost aboard
   (`myren.md` 1–8). `myren.ts`, `memory.ts`. Cloud; the crane's poses on its model, on Olov's computer.
9. **Berget: the crack at sunset** (`berget.md` 3–5, 19–21). `berget.ts`, `memory.ts`. Cloud.
10. **Berget: a cliff where help is felt** (`berget.md` 7–11). `berget.ts`, `ghost-thought.ts`. Cloud; the bag
    hand-over only after Olov's yes.
11. **Norrskenet: the reveal shown,** then POFF, flare and blink in turn (`finale-and-home.md` 1–5).
    `norrsken.ts`, `story-stroke.ts`. Cloud.
12. **Norrskenet: the reunion is his** (`finale-and-home.md` 6–8, 12–13). `norrsken.ts`, `stage.ts`. Cloud, in
    rehearsal; the hands, Moa's jacket and Bertil's cap on the private models (Olov's computer).
13. **Home: the circle closed** (`finale-and-home.md` 14–19). `ends.ts`, `epilogue-stage.ts`. Cloud; Pappa's hands
    on Olov's computer.
14. **The prologue's eyes painted on the carving itself,** close up (`prologue.md` 4). `story-stroke.ts`,
    `view.ts`. Cloud. The real kitchen, veranda and shelf figures wait for Olov's computer (HANDOVER question 11).

Byn's story (`finale-and-home.md` 21–24) and the flight's look back (`berget.md` 14) wait for Olov's answers.

## Constraints every step keeps

- **No voices:** nothing read aloud or recorded; short wordless sounds; bubbles of at most about 40 characters,
  about 60 in all, and every beat works without them (plan §3.7).
- **Names and places:** never a surname, the house number, a street address, coordinates, the school or account
  names.
- **The ghost is "spöket"** in the game's text until Elof names it Klonk in the epilogue.
- **No logotypes or brand marks.**
- **Licences:** every new file in `LICENSES.md`; no licensed music; no CDNs, analytics or third-party requests.
- **Budgets:** draw calls 120 Low, 160 Mid, 200 High; no shader compiled during play; the size gates (450 KB of
  gzipped script, a 3 MB boot pack).
- **Determinism and saves:** scenes run on the simulation's step; only finished ones are saved; existing flags,
  checkpoints and candy keep their meaning.
- **Pictures:** stand-ins in cloud sessions and contact sheets; no reference photos, sheets or likeness renders
  committed; the family's models and the house are built on Olov's computer and kept in the private repository.
- **Exciting, never scary,** and nobody to blame (`narrative-craft.md`).

## Frågor till Olov

None blocks the work; each has a default or a proposal.

1. **The two glittering sweets:** the star makes Elof small and the gold sweet can make him big again, and the
   prologue now says so through Moa's drawing and Pappa. Is that the lore you want, told this early? Default: yes.
2. **Music under the story:** may the game's own tune underline scenes, memories and endings? Default: yes.
3. **The family mid-chapter:** two far sightings per chapter and an answer to every call, or only help points?
   Default: the former.
4. **Do grown-ups ever see the ghost move?** Default: never, at the party too (`threads.md` Q1).
5. **The purpose line:** always on, or on change and on demand? Default: on change (`threads.md` Q2).
6. **The ghost as companion:** may it walk beside Elof after the rescue, and ride the crane behind him? The
   audits propose yes (`granskogen.md` Q2, `myren.md` Q1).
7. **The bag in Elof's hands at the cliff?** Default: no; the boost and the lace only (`berget.md` Q2).
8. **The giants at help points:** true-scale hands and boots, or whole figures? The audit proposes hands
   (`granskogen.md` Q1).
9. **The reunion:** the hug first, Pappa's recognition last? Proposed: yes (`finale-and-home.md` Q2).
10. **The red house and the bell tower in the flight?** Default: bells as sound, no house (`berget.md` Q1).
11. **Elof's first figure:** the windowsill, or beside Pappa's first on the shelf? Default: the windowsill
    (`threads.md` Q3).
12. **Byn:** Klonk gives the second star, and Mamma's hand ends the outing? (`finale-and-home.md` Q3)
13. **Personal, asked first:** a real family gesture for the promise, and a hint at Pappa's wish to teach carving?
    Default: a plain high-five, no hint (`prologue.md` Q2, `finale-and-home.md` Q4).
14. **The memories:** may Pappa read their storyboard first, does his real first trägubbe still exist, and were
    the walks real? Default: he reads it; the walks stay invented (HANDOVER question 1, `myren.md` Q2).
15. **The play-style choice:** after the prologue's title instead of first? Default: first (`prologue.md` Q1).
