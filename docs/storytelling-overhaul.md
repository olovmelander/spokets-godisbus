# Storytelling and level overhaul

Design addendum to `game-plan.md`, version 5 — 4 October 2026.

Olov's new direction is to make the adventure easier to understand and more satisfying to play: improve
the opening and story, explain the family's involvement and the candy theft, and connect the levels'
puzzles through purposeful actions and revisited places. This document turns that direction and the web
research into a concrete design. The development implementation now includes the opening, durable
context, family rehearsals, finale staging and local loops in the garden, forest, bog and mountain.
The scope table below distinguishes those changes from remaining work; this is not a completed-art
claim or a release approval. `RELEASED_CHAPTER` remains `null`.

The existing canon remains: Pappa carves the ghost; Elof gives it life by painting its eyes; it freezes
when a grown-up looks; the torn bag and shrinking star are accidents; the first carving belonged to
three-year-old Elof; the ghost wants to bring it home and share Saturday sweets with it. The ghost is
called *spöket* until Elof names it Klonk in the epilogue. There is no spoken dialogue or recording.
The existing family consent, asset rules and release checkpoint still apply.

## Reading and chase direction — 10 October 2026

Olov asks for a story that is easier to follow, with time to understand the painted memory pictures.
Important dialogue and memories now wait for the player's deliberate next action. This supersedes
the earlier six-to-ten-second limit for the complete memory: a short animation can finish while its
picture and caption remain. Previous/next controls let the player revisit the cause before the result;
reduced motion preserves the same story and controls without continuous scene movement.

The chase keeps the ghost out of reach. Close meetings belong to the opening and ending, as Olov
explicitly clarified. A waiting ghost still leads from a distance; helping it in the middle chapters
does not enable a catch. Hint visits must respect the same separation as the main ghost. Existing
story flags, chapter rewards and puzzle completion retain their saved meanings.

## Research and our design inference

The sources below are developer writing, official developer/publisher pages or their published game
descriptions. The source column paraphrases what they actually describe. The application column is
**our design inference**, not a claim that these developers designed Elof's game or endorsed this plan.
We adapt design principles; their plots, characters and art are not templates to copy.

| Game and primary source | What the source describes | Our proposed application |
| --- | --- | --- |
| [A Short Hike — Adam Robinson-Yu](https://adamgryu.itch.io/a-short-hike) | A clear mountain destination, marked trails or exploration away from them, optional activities and hikers who can help each other. The player chooses a pace. | Give the candy trail a legible main route. Add compact side loops that return to recognizable landmarks. A detour earns a useful shortcut, a character moment or a clue; finishing every detour is not required. |
| [Lil Gator Game — MegaWobble](https://megawobble.games/games/) and [official published description](https://store.steampowered.com/app/1586800/Lil_Gator_Game/) | A sibling motivates the adventure. Helping friends and gathering craft materials brings a shared playground to life. Movement and play have no health-bar pressure. | Make the family practical partners. Their help visibly changes the route: Moa's plane, Bertil's cap, Pappa's lever and Mamma's crossing. Show a shared activity and delighted response, rather than treating a name on a sign as the whole relationship. |
| [Planet of Lana II — designers Dan Faxe and Christian Enfors](https://news.xbox.com/en-us/2026/03/03/planet-of-lana-ii-puzzle-design/) | The designers build environmental puzzles around different characters' abilities. They check goal clarity, failure feedback and introduction order, test puzzles in context, adjust geometry and then finish the visual detail. | Start each puzzle with a visible need and destination. Demonstrate a verb safely before combining it with another. Elof and the ghost contribute different actions. Test understanding and movement before spending time on final props or acting. |
| [Yoku's Island Express — Villa Gorilla/Team17 published description](https://store.steampowered.com/app/334940/Yokus_Island_Express/) | Multiple nonlinear questlines cross an explorable island. Helping its residents earns new abilities and uncovers its mysteries. | Use small webs of local routes. A helped friend opens a previously seen path, and a familiar tool gains another use. Keep the main story readable without requiring a sprawling global quest system. |
| [Unravel — Coldwood creative director Martin Sahlin](https://www.ea.com/en-gb/games/unravel/news/welcome-to-unravel) | Yarn is both a physical puzzle material and an expression of human bonds. Northern Swedish locations, their histories and the team's family experiences inform the adventure. | Make wood, shavings, the shoelace and remembered places part of the mechanics and meaning. A memory of a landmark should change how the player understands that same landmark in the present. |
| [Lost in Play — Happy Juice](https://www.happyjuice.games/) and [official published description](https://store.steampowered.com/app/1328840/Lost_in_Play/) | Siblings cooperate through a curious, imaginative adventure. The official description identifies family play and visual communication without dialogue as design choices. | Stage requests as small scenes: a character notices a problem, attempts something, looks to Elof, then responds to his experiment. Support necessary Swedish text with pictures and reactions. Each solution earns a small comic or emotional payoff. |

Our central inference is that more interactions alone will not produce a clearer adventure. The opening
must explain its causes; each chapter must connect an immediate goal to the changing relationship; and
puzzles must let the player understand, experiment and see a consequence.

## Opening cause and effect

The player should be able to follow the opening in the world without having to read a plot summary.
Pace it through readable actions and short pauses, rather than several unrelated pop-up explanations.

On 10 October Olov asked for a larger emotional transformation, explicitly including Elof eating the star,
and clearer family help throughout the adventure. This supersedes the earlier touch-only star direction.
The bird now lands before Mamma names it; waking, the shared look, and taking the bag each have room to read.
The player first discovers the star, then deliberately chooses **Smaka på stjärnan**. A visible bite precedes
the gradual change of scale; the music softens, Elof calls for Mamma, and reassurance comes before the plan.
Essential lines and the family's promises wait for **Fortsätt**. The title stays over the settled garden view.

At helper encounters, greeting poses and named portraits identify the available family member. Short held
preparation moments show what they do; their explanation waits for the player. Moa's plane and Bertil's
cap are prepared before a separate boarding action. Pappa explains the cone and seesaw, while Mamma's bridge
and braid each explain the route they open. Ready messages follow the actual preparation or placed bridge.

| Beat | Visible evidence | What the player should understand |
| --- | --- | --- |
| 1. A Saturday morning together | Full-sized Elof, the unfinished wooden ghost, Pappa's work and Elof's distinct Saturday-sweets bag share the table/deck setting. The first empty shelf place is a background question. | This is Elof's home and family; the bag belongs to him. |
| 2. Elof paints the eyes | The first painted eye appears, then the second. The ghost's first blink and motion follow the finished eyes. | Elof's action woke Pappa's carving. |
| 3. The ghost takes the bag | The large striped Saturday bag visibly moves from the table into the ghost's possession. Its own small carved pocket remains a separate part of it. It looks to the empty place before taking the sweets. | The ghost took this particular bag. Its purpose is still a mystery. |
| 4. A freeze joke | A nearby grown-up turns towards it, it becomes an ordinary still carving, and it moves again when the gaze passes. | The grown-ups cannot catch it simply by watching. |
| 5. The bag tears | The hinge catches the bag. The tear and the first falling sweets occur at the same place; the trail continues from there. | The scattered candy is the accident that gives Elof a route to follow. |
| 6. A star falls from the bag | The magic star is absent before the theft. It spills after the tear near Elof and the family. Its discovery waits for reading; Elof deliberately tastes the star from his own bag, raising it to his mouth before the magic begins. | This particular sweet causes the magic. Walking through it does not consume it. |
| 7. The family witnesses shrinking | Keep full-sized Elof and the nearby family in a shared readable composition as the change happens. The camera drops with him while the same planks, legs and railing establish the new scale. | Elof became small here, in front of his family. They know what happened. |
| 8. Reassurance and a practical plan | The family bends towards him. Mamma answers his call and reassures him; Pappa offers his hand. Their larger path is visible or explained with a simple picture/gesture; they can help at crossings, while Elof can enter roots and small passages. | He has support. Following the candy is his immediate action, and being small gives him a role adults cannot fill. |

No long walk should separate shrinking from the family's first acknowledgement. Family support continues
through visible places and actions in subsequent chapters; they do not need to duplicate Elof's exact
small route. The accidental magic is not recast as a parental instruction to consume unknown sweets.

The opening now rehearses the painted eyes, bag transfer, tear, spilled star and shrinking beside the
same nearby family. Public rehearsal bodies also replace isolated family signs at practical help points
throughout the chapters, so the larger-route explanation has visible people to refer to. They remain
compatible with replacement by the existing private family models. Final likeness, eye contact, hands,
weight and nuanced acting remain an art task; the rehearsal bodies do not establish final performances.

## Purpose and recap

The purpose changes because Elof learns something or helps someone. It must not use the eventual truth
as an early quest instruction. A pause or saved return should recover the latest established context.

Use one compact current-purpose cue, a fuller accessible pause recap and a chapter-end handoff. Derive
them from the chapter, the player's position and already committed story flags or discovered memories.
Do not use an independent mutable quest counter that can disagree with the save. A discovered chapter
memory can be revisited in the album, but an undiscovered memory must not appear in a recap.

| Phase | What Elof knows and wants | Family role and world evidence |
| --- | --- | --- |
| Prologue | His eyes woke the ghost; it took his bag; eating its spilled star made him small. Find the candy trail. | The family witnesses it, reassures him and stays reachable on the larger route. |
| Garden | Recover his sweets and follow the ghost into the forest. A memory connects a little Elof to Pappa's first carving without explaining the theft yet. | Helping the ladybird and arranging the shavings opens routes. Calling Moa prepares the plane; boarding is a separate deliberate action. Her optional paper pocket reconnects to the completed bridge. |
| Forest, before rescue | Follow the scattered sweets, gain the jay's help and cross the roots and water. The ghost giving something away makes its behaviour puzzling. | Elof makes a useful friendship; Pappa and Bertil help him perform crossings he cannot do alone. |
| Forest, after rescue | He has rescued the ghost, which now waits instead of only fleeing. Find out where it is leading him. | The waiting ghost, a gift and a clearer destination picture make the relationship change observable. |
| Bog | Guide the lost crane chick to its family while following the ghost's increasingly clear mountain clue. | Reuniting a small family leads to the crane flight and unlocks an optional Mamma call. Her persistent boardwalk returns to the lantern clearing and can be used both ways. The lantern itself is carried. |
| Mountain | Help the ghost reach the old pine. A discovered mountain memory identifies the lost figure and its connection to little Elof. | Elof and the ghost contribute to the main climb. The optional summit prize opens a reusable return lace; it is not required for the rescue. |
| Finale | Recover the carving, restore its eyes, recover the bag and decide to share. Understand why the ghost wanted the sweets, even if the mountain memory was missed. | Painted eyes and chosen sweets are visible with their recipients. The family meets the grown Elof, and the homeward ride visibly carries him on Pappa's shoulders with the carvings. Personal identity wording in the purpose and recap uses discovered memory context. |
| Epilogue | Bring the carvings home, share the Saturday sweets and make Elof's own first figure with Pappa. | The empty shelf place is filled; making, naming and sharing connect the opening to the ending. |
| Village after the ending | An optional new outing with its own local purpose. | It must not carry an essential explanation missing from the original ending. |

The candy HUD describes recovered sweets, not completion of the ghost's hidden party plan. Short Swedish
purpose text is support for the world cues, not a replacement for them. All actual player-facing copy
lives in `src/content/sv.ts`; this document specifies the meaning it must carry.

### The candy motive at the reveal

Every completed finale must connect the rescued carving, the stolen bag and a welcome-home party.
A claim that the ghost only wanted to rescue the figure leaves the theft unexplained. When the mountain
memory was discovered, the explanation also connects that party to little Elof's earlier sharing and
the years his first carving spent alone.

Show the returned figure, the same kind of sweet and a giving gesture together. Then a short explanation
states the connection clearly in normal play as well as the recap. The gate is the actual finale
sequence: the carving has been pulled up (`placed:tragubbe`), its eyes painted (`eyes`) and the bag
recovered (`bag`). A generic chapter preview, position alone or prematurely opened menu cannot reveal it.

The mountain memory enriches the explanation; it must not be necessary to explain the original theft.
After those three completed actions, a player who missed that memory still learns that the ghost took
the sweets for a welcome-home party for the rescued carving: "Spöket tog godiset för att välkomna
trägubben hem!" In the current-purpose cue and recap, wording that identifies it as **"min gamla
trägubbe"**, Elof's old/first figure or a childhood companion remains guarded by discovery of the
mountain memory. Before the finale gate, both paths retain only their established immediate purpose.
Afterward, pause, homeward travel and home recaps retain the appropriate explanation without inventing
a memory discovery.

Pappa's required reunion story has a separate source. After the actual rescue, eye painting, bag return
and tasting the golden sweet, the untimed finale handoff preserves what he tells Elof: Pappa carved the
figure for him when he was little, and they lost it on the mountain. It also repeats the welcome-home
candy motive. Fast homeward play can reach the chapter card before every timed speech bubble finishes;
the essential origin must remain readable there. This handoff does not grant an optional memory or
loosen the purpose/recap identity guard. An incomplete preview cannot claim Pappa told that story.

Recovering and sharing the bag does not excuse the theft through exposition alone: it closes the
relationship arc through an action the player performs. Elof still chooses what to give and to whom.

## Reusable puzzles and local route loops

Each substantial puzzle has five parts: a visible need, a safe way to test the relevant action, a
readable consequence, a useful solution and a return route or changed place. Three or four related
steps can be satisfying; a sequence of four unrelated use buttons is not the same design.

Reuse a small family of verbs: move an object, use a lever or weight, hook the lace, carry/guide, light
and share. Change their material, geometry and partner instead of introducing a new control at every
gate. Make interdependence visible: the ants carry Elof because he clears their road; a rescued friend
waits and helps because of what happened, rather than because an invisible flag silently changed.

Main-route solutions remain accessible and forgiving. Hard timing belongs to the existing optional
challenge routes. An optional interaction may enrich the mystery, but it must not hold the only clue
needed to understand the finale or make the main route dependent on an album reward.

| Place | Concrete connected design | Return or reuse | Scope |
| --- | --- | --- | --- |
| Garden | The ladybird's rescue points to a useful hose. Moving curls teaches arranging a ramp and bridge. With the bridge complete and Moa called, she opens a hose into a dry paper pocket. Calling her prepares the plane; it does not start an involuntary flight. | Slide into the pocket, find the paper, climb the same hose back and optionally share the drawing with Moa. Her response remains visible. Explicit plane boarding leaves the main onward route independent of this detour. | Implemented development loop and boarding interaction. Existing toys and challenge remain; nuanced acting and wider spatial redesign remain open. |
| Forest: weight puzzle | A nearby small cone produces a safe low bounce; the heavier cone farther back supplies the weight for the proper seesaw crossing. The player may test the small cone first or reason out the heavy one immediately. | Looking back up the nearby slope and retrieving the heavy cone makes an intentional local return. The lace/mover interactions remain familiar. | Implemented development puzzle with stage-specific help. Existing cone, launch and placed flags and save indices remain. |
| Forest: neighbour return | The ghost's gift at the small root door motivates a voluntary return and a gift of Elof's own. A persisted keepsake then shows a small-figure picture at the actual returned-to doorway. | Returning to the anthill/root doorway changes a place the player recognizes. The clue remains available after the visit. | Implemented optional return loop and persistent picture. It does not block the story route. |
| Bog | The carried lantern guides the chick home. Reunion unlocks an optional call to Mamma at the crane clearing; she raises a firm boardwalk across the mist. | Return to the recognizable lantern clearing, then use the changed path back to the cranes or for another optional light-route attempt. The raised top clears old assisted-jump markers, allowing stops and reversals. Its flags restore the route from existing firm checkpoints. | Implemented persistent, reusable cooperation loop. No new required challenge or album reward. Wider landscape detail and final performances remain open. |
| Mountain | The main ghost lift and lowered lace remain. Completing the optional Toppröset ascent and finding its existing prize unlocks another familiar lace around the cairn. | Descend that lace or the original shelves; it is reusable for another optional visit. It ends above the ordinary path so main-route walkers do not catch it accidentally. | Implemented optional prize-gated return route. Main cliff, flight and collectible/checkpoint identities remain; broader mountain composition and polished cooperation acting remain open. |
| Finale and home | Retrieving the figure, painting visible replacement eyes and choosing visible sweets completes the established actions. The family returns into the picture, and the homeward ride stages Pappa carrying Elof on his shoulders. At home, Pappa and Elof make together. | The carving and ghost accompany the shoulder ride; sharing completes the welcome-home purpose. The player's new carving repeats the eye-painting rule. Full shelf/prop continuity is still an art-review target. | Implemented rehearsal staging and explicit motive, including the no-mountain-memory fallback. Final likeness, acting and material continuity remain. |
| Village | Its existing shopping route can gain a short connected return through recognizable street/shop places. | Reuse familiar movement and object handling; an optional outing closes its own loop. | Follow-up, separate from the original story's explanation. |

These are local authored loops, not a new global nonlinear quest engine. Existing chapter boundaries,
main collectible identities, checkpoint indices and primary puzzle flags retain their meaning. New
optional flags are additive; old saves can continue the main route without having completed the new
detours. Any future change to an existing saved identity requires a reviewed migration.

## Implementation order

The 4 October development implementation includes the following chapter outcomes. `HANDOVER.md`
records the integrated commits, checks and remaining issues; this document does not substitute for that
evidence.
An implemented rehearsal is not final likeness, acting, landscape completion or physical-device approval.

| Milestone | Implemented development scope | Still outside that scope |
| --- | --- | --- |
| Opening | Paint-linked visible eyes; recognizable Saturday-bag transfer and hinge tear; star spilled after theft; shared family/shrinking framing; immediate reassurance and larger-route explanation. Existing flags and checkpoints retained. | Final family likeness, close hands/faces and polished acting. |
| Story context | A pure current-purpose resolver using chapter/flag/position context; untimed purpose HUD, accessible pause recap, title resume and chapter-end handoff. It tracks optional loops without making them the main job. Recovered-sweets wording and a durable explicit welcome-home motive after rescue/eyes/bag, with memory-guarded personal identity. | Olov's comprehension judgement and richer visual storytelling at every remembered location. |
| Family rehearsals | Visible public rehearsal bodies across all chapters, including practical help points and the final family reunion, compatible with existing private-model loading. | Approved likeness, close hands/faces, nuanced reactions and convincing performance. |
| Garden | Moa's optional paper-pocket/bridge return and a visible shared-paper response; explicit deliberate plane boarding. Old saves that called Moa can still board. | Broader garden routes, deeper object reuse and finished Moa performances. |
| Forest | Small-versus-heavy cone experiment and local return with puzzle-specific help; optional neighbour gift/return loop with a persistent doorway picture. | Broader forest composition, final assets and richer cooperative acting. |
| Bog | Chick reunion unlocks Mamma's optional persistent boardwalk back to the lantern clearing. Repeated crossings, stops, reversals and restored saves remain usable; the crane flight stays independent. | Broader light/guide puzzle variations, landscape detail and final crane/family acting. |
| Mountain | Existing optional cairn prize opens a reusable return lace, with both the original descent and main cooperative cliff retained. | Wider mountain route composition and final lift/lace acting. |
| Finale and home | Visible painted eyes on the rescued first carving, chosen shared sweets and family reunion; Elof visibly returns on Pappa's shoulders with the carvings. Explicit candy motive survives a missed mountain memory. After the required reunion/taste stage, the untimed ending handoff also preserves Pappa's origin and lost-on-mountain story. Purpose/recap identity stays memory-guarded. | Final likeness, hand contact, carrying/painting/sharing performance and full shelf/material continuity. |
| Review | Targeted story-state, simulation, save and browser checks of these outcomes. | Final Blender work, listening review and physical iPad/iPhone/Android judgement. |

Continue one visible chapter outcome at a time:

1. Review the implemented scope for story understanding and actual puzzle play; correct confusing framing or
   feedback before expanding it.
2. Broaden spatial storytelling and connected routes where play reveals a need. The new local loops do
   not amount to a complete world or chapter-layout redesign.
3. Design Byn's own optional return loop as a separate later outcome; its current outing remains playable.
4. Finish family performances, memories and material/prop continuity in Blender on Olov's computer.
5. Run the full adventure, listening review and real-device checkpoints, then treat release as its
   existing separate decision. `RELEASED_CHAPTER` stays `null` until that decision is made.

No new child testers are introduced: Olov remains the reviewer before Elof's first play. The new design
does not change `RELEASED_CHAPTER`, the family/private asset rules or who approves the release.

## Acceptance criteria

Automated tests establish state and interaction correctness. Olov's deliberate play and visual review
establish whether the intended communication is convincing. A checked flag alone does not prove that
a player understood the picture, and software-rendered browser results are not physical-device FPS.

| Area | A pass means | Evidence |
| --- | --- | --- |
| Opening comprehension | With the plot summary closed, the sequence visibly establishes whose bag it is, which action wakes the ghost, where the tear and star come from, why Elof changes size and that the family sees it nearby. | Browser checks of stage visibility/timing plus sequential stand-in captures; Olov retells those causes without using an external synopsis. |
| Family logic | Reassurance happens at shrinking, and later family appearances consistently support the larger-route plan. The relevant helped crossing has an understandable contribution from Elof and the family member. | Trigger/framing checks and Olov's chapter play. Final private-model acting gets its own review. |
| Durable purpose | Fresh play, return from pause, resumed saves and chapter changes show the current established purpose. Neither position nor replay of a UI panel fabricates discoveries. | Resolver tests for legitimate flag/position combinations and browser pause/resume/reload/handoff checks. |
| Reveal | The welcome-home candy motive appears after actual figure rescue, painted eyes and bag recovery, including when the mountain memory was missed. Only a discovered mountain memory licenses "min gamla" and childhood-identity wording in purpose/recap cues. The motive is absent before that gate and remains available during sharing, homeward travel and home. | Positive and negative resolver/browser cases with and without the mountain memory; Olov can explain why it took sweets rather than another object. |
| Required origin | After the actual rescue/eyes/bag/taste sequence, the untimed chapter handoff keeps Pappa's made-for-little-Elof and lost-on-mountain explanation available even when fast travel overtakes his timed bubbles. The copy cannot appear from position, a preview or incomplete receipts. | Guard and restored-save cases; actual immediate tasting, homeward travel and end-card checks without the mountain memory; readable layout and onward focus at all five sizes. |
| Weight puzzle | Small-first and heavy-first approaches both remain possible. The small cone gives an understandable safe result. Fetching and placing the heavy cone enables the real crossing, and helper advice follows the unsolved stage. | Real simulation playthroughs of both orders, controller/touch interaction checks and visual feedback review. |
| Return clue | The root-door clue requires the authored return/gift sequence, appears at the actual doorway, persists for revisits and does not require teleporting or drawing a second ghost. Ordinary forward play still reaches the next chapter. | Flag gating and reload checks, both route orders, captures showing its source and a main-route robot pass. |
| Local route loops | Garden's paper detour returns through the same hose/bridge and never boards the plane automatically. Bog's boardwalk requires reunion and a real Mamma call, then supports repeated stops/reversals without old assisted hops. Mountain's return lace requires the optional prize and remains reusable without catching ordinary walkers. Each main route still works when its detour is omitted. | Real interaction and simulation checks of unlock order, repeated use, misses, pause and old-save restoration; browser views show the route's endpoints and response. |
| Finale picture | Painted first-carving eyes, recipients' chosen sweets, nearby family and the shoulder ride communicate their actions in the ordinary scene. Public rehearsal bodies can be replaced by private models without duplicating actors. | Actual paint/share/ride interaction captures and staged actor/placement checks; Olov separately judges final contact, likeness and acting. |
| Retry | A missed jump or unsuccessful experiment quickly returns the player to usable ground without losing candy, placing a required object out of reach or making a solved mechanism unsolved. Repeated attempts remain playable. | Robot/simulation misses and repeated attempts, plus browser save/reload checks where mechanism state matters. |
| Optionality | Challenge candy, neighbours' gifts and exploratory loops enrich play; omitting them cannot prevent understanding or completion of the main adventure. | A minimal main-route playthrough and an exploratory playthrough, with separate discovery-state assertions. |
| Accessible play | Goals have concise Swedish support and accessible menu semantics. Plot and puzzle cues remain visible without sound or reading. Reduced motion preserves the information, and Lugnt/swing assist retain complete solve routes. | Keyboard/controller/touch checks, screen-reader text inspection, both reduced-motion settings and Lugnt play; Olov reviews visual-only comprehension. |
| Lifecycle | Pause, album replay, hidden pages and WebGL recovery neither advance a staged sequence behind a panel nor lose the current context, held-input release or return focus. | Existing lifecycle gate and targeted interrupted opening/puzzle/recap cases. |
| Device picture | The critical actor, source and consequence fit together at 390×844, 844×390, 780×360, 1180×820 and 1440×900. Low and High communicate the same facts without control overlap. | Browser captures/checks at all five sizes using stand-ins; Olov's physical iPad/iPhone/Android review remains required. |
| Technical continuity | Current unit/robot/browser gates, typecheck, build/size and privacy checks pass. Existing progress resumes with unchanged collectible/checkpoint meaning. | Integrated repository checks and old-save cases. Record measured values and limitations in `HANDOVER.md`. |

Where an implemented rehearsal cannot yet satisfy a wider art or route criterion, leave that criterion
open and name the next chapter/art task. Do not hide unfinished performances behind a blanket claim
that the story or all levels are now complete.
