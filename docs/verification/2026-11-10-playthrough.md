# The 10 November playthrough: both adventures

This ledger follows the [62 numbered requests and general collection requests](2026-11-10-playthrough-request.md),
made after PR #252. The numbers below belong to that new list, not the earlier 32-item list in
[the previous verification record](2026-11-10-adventure2.md).

This records the implementation and completed local checks. A source change or passing geometry test does not by
itself establish its final appearance; the rows identify actual views separately. The final section records
automated results and the full CI merge gate.

## What the checks establish

- **P** means an inspected frame or sequence in the built game at **390×844**; **L** means **844×390**.
  Unless explicitly marked stand-in, those game checks waited for the actual private family models to install.
  The private exports remained linked through `art/private`; no private model or likeness screenshot is part of
  this public record.
- **Built checkpoints** use the production app, real input and dialogue, with development spawn coordinates and
  prior story flags to reach the relevant action. They are not complete uninterrupted playthroughs.
- Early, Talk and Finale’s later storm review sampled the actual app's simulation, input, HUD and render transforms at **20 Hz**, drew
  every sixth intermediate WebGL frame, and fully drew each captured frame. River, Water and Finale’s home/bathroom review used 20 Hz with every
  tick rendered, except River's final car pair, which used every sixth intermediate draw. Their still-image presentation pumps advance zero simulation time. These checks establish
  staging, dialogue, contacts and layout at the sampled points; they do **not** measure native frame rate,
  continuous animation smoothness or physical-phone performance.
- The illustration/rain private checkpoint review used native RAF. The separate illustration browser checks
  import the drawing code into a 2D sheet: they establish artwork quality and SVG/Canvas parity, not world-camera
  visibility. Unit, robot, private-bone contact and renderer-matrix checks are identified separately.
- A viewport label applies only to the stated evidence, not automatically to every frame of the chapter.
  All numbered local visual reviews are complete; unsampled orientations and sound-audition limits remain explicit.

## General requests

| Request | Implemented behavior | Evidence and limits |
| --- | --- | --- |
| More special sweets in Äventyr 2, visible in the bag | Eight new original sweet types join the existing sixteen. Each storm chapter from Stormgården through Stormens öga has a stable pickup; the bag shows 24 types across both adventures. | Collection simulation tests check all eight new placements and stable ground/support. Built bag UI in P and L shows the combined count. The browser directly decoded the new lingonhjärta SVG; it did not individually decode all eight. Shape/bounds tests cover the eight drawings. |
| Found objects and small memories throughout both adventures | Twelve additional found-object locations and twelve earned keepsake cards record actual encounters and actions. Existing found objects remain available. | Simulation pickup, saved receipts, migration and replay tests. Built bag fixture contains objects and keepsakes from both adventures. This is not a claim that the browser collected every object through a full playthrough. |
| Photos and an Äventyr 2 counterpart to Pappa's memories | Ten storm photo moments and eight replayable **Stormens spår** stories accompany the existing photos and Pappa's memories. Story pictures follow witnessed events; they explain the two carvings' journey without replacing Pappa's memories. | Photo-storage browser: 37 checks passed, including delayed reset/capture races. Built bag opens a two-page storm story, changes page, restores focus and keeps simulation paused. Shared picture keys were audited against the lines and reveal order. |
| Everything collected remains visible in either adventure | One bag reads the combined saved collection; replay receipts preserve witnessed stories and keepsakes when chapter scene flags reset. | Built `collection-bag` passed in P and L with a **seeded save and stand-in**, across storm and first-adventure chapters, with no horizontal overflow. Save/replay/migration tests cover persistence, including the existing sixteen-kind golden reward. |
| Shared UI in phone views | In short landscape views the full goal and story reminder occupy the space between the upper buttons, instead of covering the family after their reunion. The label shares the goal row; the story reminder stays visible below it. | Actual private views at 844×390, 780×360 and 390×844, with normal and larger text: all family heads/hat clear, full text/icons retained, no overflow or button overlap. The portrait layout is unchanged. |
| Improve the other pictures too | Fifteen shared original scene illustrations, all thirteen Pappa memory pages, Moa's explanation and the carving panel use coherent silhouettes, foreground/background depth and the correct carving identities. The lantern-search page depicts the family beside the water; breakfast is a separate image. | All fifteen scene keys passed SVG/Canvas pixel-parity checks; desktop and phone-width sheets, all memory pages and the interactive panel were inspected. Actual world-picture evidence is listed in rows 5, 30, 36, 44, 46 and 49. The new private world-picture review is P only; L world positioning is not implied by the standalone sheet. |

The built collection browser uses normal browser scheduling, but its saved collection is a fixture. It proves bag
presentation and persistence behavior, not private-family staging or an uninterrupted collection playthrough.

## Äventyr 1

| # | Requested behavior and implementation | Evidence / remaining check |
| --- | --- | --- |
| 1 | Moa's explanatory sheet faces Elof and the viewer with a separate blank back; the star leads to small Elof and the gold sweet to large Elof. | **P:** final integrated private frame at `handen` 3.15 s shows the new star/gold illustration facing the audience and Elof, with unmirrored arrows and its separate blank back. The artwork also passes 2D illustration checks. |
| 2 | Pappa holds tiny Elof on an open supporting palm, with the other hand helping, instead of leaving him floating beside it. | **P:** private palm/sole contact inspected, including the final integrated drawing scene; private rig contact checks. L private view was not newly sampled. |
| 3 | Pappa visibly reaches to catch the escaping ghost. His line is now “Jag fångar honom. Stanna där!” | **P:** catch at 1.3 s and 2.9 s, plus the rail scene, inspected. Scene/dialogue tests cover the new line and order. L private view was not newly sampled. |
| 4 | After the paper flight, Moa asks “Gick det bra, lillebror?” and Elof answers “Ja! Jag landade mjukt! Tack, Moa!” | **P:** actual landed, grounded free state and the two separate reading bubbles inspected. Dialogue/scene tests pass. L private view was not newly sampled. |
| 5 | The vittror clue is a finished woodland illustration with a doorway and the old friend's picture. | **P, native RAF:** actual “En liten bild från vittrorna.” stop and complete picture inspected. 2D desktop/phone art and SVG/Canvas parity pass; private L world view not newly inspected. |
| 6 | The cone visibly weights a branch/platform that is already part of the tree, making the cause and movement understandable. | **P + L:** actual before, moving and raised branch frames inspected. Focused puzzle/scene tests pass. |
| 7 | Bertil's hands meet the cap brim while he speaks, then both hands lower it into the water. | **P + L:** held brim, lowering and ready-to-board frames inspected with the private rig. Contact/staging tests pass. |
| 8 | Mamma visibly places the log, follows Elof over it and reaches the braid-help position; the climb braid joins her hair. | **P + L:** corrected deep kneel puts both palms at the trunk end; the same Mamma then walks across its middle and reaches her connected braid. Private grasp/socket measurements pass; final placement, walking and single woven attachment frames inspected. |
| 9 | Mamma is absent from the crane-family light rescue instead of appearing twice on the bog. | **P + L:** corrected unobstructed crane/light frames show no Mamma. The earlier screenshot covered by a memory card is excluded. |
| 10 | Elof thanks the ghost after reaching the top: “Tack för hjälpen! Nu är jag uppe.” | **P + L:** actual Berget thanks inspected; dialogue/robot checks. |
| 11 | Elof says he will help, lowers a visible rope into the crack, raises the heavy first carving, and drags it with a taut rope in either travel direction. | **P + L:** final lowering frames show the whole first carving and continuous rope; heavy lift and both drag directions inspected. The dedicated rescue is the sole rope/hand owner after the integrated overlap fix. Focused integrated Norrsken/carrying checks pass. |
| 12 | The family runs in from the right and asks how Elof is before Pappa recognizes his first carving. Elof explains the ghost's help, the crack and the carving's loneliness; both friends can come home. | **P + L:** Mamma's facing and first wellbeing exchange inspected. Run-in, recognition and explanation were checked in earlier private checkpoints with unchanged staging apart from that facing correction. Scene/dialogue tests verify the expanded order. Final settled-family views also pass with the landscape guidance bar clear of their heads. |
| 13 | Elof sits facing travel on Pappa's shoulders, knees bent, while Pappa supports his boots; Elof holds both carvings below his face. | **P + L:** stationary and home-trail frames inspected, with whole bodies in frame and supported boots/carvings. Separate private-bone contact probe passes 180 walking poses. |
| 14 | Every candy recipient thanks Elof; the ghost answers “Klonk, klonk!” | **P:** all five recipient-specific acknowledgements appeared as held lines through the real candy-selection UI; all gift frames inspected. Party/dialogue robot checks pass. |
| 15 | Pappa thanks Elof for finding his coin. Elof asks why the mountain stones were round; Pappa explains the old beach, and Elof responds. The unsupported offer to keep the coin is removed. | **P:** actual returned-coin reply and all three stone-history reading stops displayed and inspected. Exact speakers verified: `cobbles1`/`cobbles3` Elof, `cobbles2` Pappa. Party/dialogue and future voice-catalog checks pass. |
| 16 | Bertil recognizes and thanks Elof for the returned marble: “Du hittade min glaskula också! Tack!” | **P:** actual returned-marble reading stop displayed and inspected. Exact source/dialogue and future voice-catalog checks pass. |
| 17 | The carving panel depicts the same bare, pale Lillgubben as Äventyr 2. Finishing it immediately reveals the real completed figure in Elof's flat palm, followed by Pappa's response. | Improved panel inspected separately; interaction centres preserved by tests. **P + L:** actual immediate completed-carving/palm scene inspected with the canonical private model and one Pappa. |
| 18 | Elof walks through a bathroom door, brushes with his hand and brush at his mouth, and reaches the ending only after bedtime. The same door is used throughout the home chapters; an original animated children's programme plays on the TV. | **P + L:** actual walk/brush flow inspected; feet grounded, unused arm relaxed, brush at lips. Runtime public room geometry and private family models installed. Shared door coordinates, contact and end-gating tests pass. TV visible in both first-carving views; no licensed programme or brand artwork used. |
| 19 | The final blinking figure uses the same canonical Lillgubben model/helper as Äventyr 2; its private blink affects the eyes. | **P:** actual credits-to-ending flow captured the canonical private Lillgubben with eyes closed and open. The ending held simulation. Integrated `shared-home` also verified both real exported eyes close and the face geometry restores exactly; `epilogue` passed both sizes. |
| 20 | Byn's passing giant legs use the improved modeled stride and grounded feet. | **P + L:** actual street/leaf-riding views inspected, including the modeled boot meeting the far pavement; geometry/contact tests. |
| 21 | Byn's improved modeled car has tyres that rotate with road distance. | **P + L:** final actual passing-car frames show the modeled body and wheels on the road. Installed-GLB road-distance tests verify physical tyre rotation. The final car capture samples 20 Hz with every sixth intermediate draw; its still is fully drawn. |
| 22 | Byn's street lamps meet the ground. | **P + L:** actual street/leaf-riding views inspected, including the lamp base meeting the far pavement. |
| 23 | The leaf is already visible when Elof says “En sjö! Mitt på gatan.” and remains readable while ridden. | **P + L:** lake reading stop and leaf ride inspected. |

## Äventyr 2

| # | Requested behavior and implementation | Evidence / remaining check |
| --- | --- | --- |
| 24 | Bertil's initial window pose has a natural arm position. | **P + L:** actual private opening-line views show relaxed arms by the window. Scene/robot checks pass. |
| 25 | Opening the window produces visible wind entering the room and a wind sound. | **P + L:** open casements and inward/downward wind streaks inspected. Filtered-noise wind cues and audio lifecycle tests pass; live sound was not auditioned in muted Chromium. |
| 26 | Moa turns toward tiny Elof after the family discovers him. | **P + L:** discovery and raincoat frames inspected; Moa faces the discovered tiny Elof. Scene/robot checks pass. |
| 27 | The family misses the bite/shrink, then Moa asks where Elof went, Bertil finds him tiny, and Elof answers before the raincoat instruction. | **P + L:** family attention, unwitnessed shrinking, Moa/Bertil discovery and the reading stops before raincoats inspected. Scene/dialogue checks verify order. |
| 28 | Rain impacts remain at their birth positions as Elof/camera moves; the world rain field and streak direction agree throughout the nine storm chapters. | Eleven production-renderer matrix/lifetime tests cover all nine chapters and all 36 active rings, including same-clock camera movement and down/right velocity/tail alignment. **P, native RAF, Mid:** actual walk x12→14.056 on the pavement and rain appearance inspected. The exact fixed-impact claim comes from matrix tests, not the two stills. |
| 29 | The bridge pumpkin is solid rather than a walk-through decoration. | **P + L:** actual private collision checkpoint inspected; collision tests. |
| 30 | The playhouse clue shows the lonely old carving by a rainy window in the improved art style. | **P, native RAF:** full-opacity card at “En bild av gamla trägubben. Helt ensam.” inspected. The review found/fixed a fade that stopped halfway during reading. General picture coverage is above. |
| 31 | The family's fjällkåta appears after the playhouse, with space to pass. | **P + L:** actual private yard views inspected after the corridor placement correction. |
| 32 | A falling cone triggers varied short reactions, including “Aj!”, without pausing play. | **P + L:** two different reactions and advancing simulation inspected in the actual storm-forest flow. Reaction/continuation tests. |
| 33 | Elof can walk along the whole fallen log and see the sweets instead of dropping behind the model. | **P + L:** actual full-log traversal/view inspected; support/route tests. |
| 34 | The owl is visibly trapped by a branch across its hollow rather than apparently standing above an unrelated stick. | **P + L:** final owl sits inside the fitted hollow with the crossbar across its opening. The final expanded landscape camera includes the whole owl above Elof; all corrected frames inspected. |
| 35 | Elof visibly casts a rope and pulls the obstructing branch away to free the owl. | **P + L:** final rope leaves Elof's raised arm, then connects hand to ring as the bar moves down; the owl is freed. Cast, pull and removed-branch frames inspected with the final camera. |
| 36 | The years-alone clue depicts the old carving deep in a rock crack, without prematurely restoring its eyes. | **P, native RAF:** complete `lonely-hollow` image inspected at the witnessed clue. The screenshot catches the preceding “Klonk …”; the same image persists through the following years-alone line. It is not a screenshot of that exact later bubble. 2D art/parity tests pass. |
| 37 | The lingon line accompanies giving berries to the jay: “Ett lingon åt dig. Visa vägen, kompis!” | **P + L:** actual give/line timing inspected; dialogue trigger tests. |
| 38 | The old carving is visible when Elof points out its descent. | **P + L:** the final foreground gap makes the old carving clearly visible near the centre of the downhill shot during the exact held line “Där vandrar gamla trägubben ner!”. |
| 39 | The Stormbyn leaf has a clear cupped shape and readable framing. | **P + L:** final `fb43871` camera views inspected with the entire leaf above the controls; they replace the earlier obstructed L frame. |
| 40 | Stormbyn contains the church and its neighboring belfry in a suitable village view. | **P + L:** both buildings visible in actual private chapter views. |
| 41 | The route text directs Elof uphill toward Olympia. | Exact text plus **P + L** actual route/stair checks. |
| 42 | The stair geometry and traversal climb toward Olympia. | **P + L:** actual upward movement inspected, with corresponding support/route tests. |
| 43 | Bertil's ball enters the goal and comes to rest on the turf inside the net. | **P + L:** final `feb918b` views show the ball on grass inside the net, clear of the controls, with “Mål! Rakt in i nätet!” visible. Trajectory/resting-ball and route tests pass. |
| 44 | Olympia's ghost picture shows Lillgubben flying north above the hall and trees. | **P, native RAF:** complete card with “Lillgubben! Där flyger han!” inspected. Separate 2D desktop/phone art and parity checks pass. |
| 45 | Flärken uses the improved modeled silver hatchback. | **P + L:** complete actual car view inspected. |
| 46 | The wind-post clue clearly depicts Lillgubben above posts and the moonlit lake. | **P, native RAF:** actual complete picture beside the posts inspected, without scenery masking. Separate 2D desktop/phone checks pass. |
| 47 | The camera gives time to see Lillgubben at the river's beginning while the line is read. | **P + L:** actual held lookout view inspected; figure stays readable during the three-second scene/reading stop. |
| 48 | The outlet ending visibly holds on the carving, carries it downstream and then shows its departure. | **P + L:** held, moving and gone frames inspected; downstream state asserted. These are sampled stages, not a native-rate cinematic review. |
| 49 | The raft picture shows the little carving afloat ahead of Elof's raft, matching the clue; it remains at the safe gravel stop after Klonk hops onward. | **P, native RAF:** actual picture inspected. Text/image audit caught and removed an earlier wrong-carving/raft relationship. Independent clue persistence and 2D art tests pass. |
| 50 | Lillgubben is actually in the frame when Elof calls “Lillgubben! Långt fram på ån!” | **P + L:** private `al:little` reading stop at 0.817 s inspected; exact bubble and model installation logged. |
| 51 | Morfar visibly guides the ladder from his hands down across the ditch. | **P + L:** actual hands, lowering and settled-ladder frames inspected, with contact/staging tests. |
| 52 | Elof says exactly “Tack, morfar!” after the ladder help. | **P + L:** actual reading bubble after crossing inspected; sequence/dialogue tests. |
| 53 | The barn has a framed, fitted door that visibly opens as a door. | **P + L:** actual closed, opening and fully open views inspected; opening/arrival state tested. |
| 54 | The jetty extends inward beneath Mormor and Morfar so both stand on a surface. | **P + L:** actual jetty/grandparent view inspected, with support geometry checks. |
| 55 | Bertil says “Det var Elof som tände lamporna.” before “Vi lyser åt dig!” | **P + L:** both real reading stops inspected at 0.542 s and 2.742 s; exact order tested. |
| 56 | Elof says “Tack, ugglan!” during the flight over water. | **P + L:** final replacement frames show the exact bubble in ride mode at x36.964/y3.121 over water. These supersede earlier timing captures. |
| 57 | The church is removed from Stormens öga's background. | **P + L:** actual chapter views inspected; chapter scenery check. This does not remove the church requested in Stormbyn. |
| 58 | Elof walks up to Lillgubben and physically returns the cap while saying “Här är din mössa, Lillgubben.” | **P + L:** actual walk, handover and returned-cap stages inspected; contact/sequence checks. |
| 59 | Grown Elof holds both wooden figures with supported, natural hand positions. | **P + L:** actual grown-grip views inspected; private contact/staging tests. |
| 60 | Mormor waits on the shore at the end instead of standing in the water. | **P + L:** actual home/wading frames inspected, with shore-position checks. |
| 61 | Elof walks down the rock and through the shallows on the home route, rather than flying. | **P + L:** actual HOME action sampled at wading and shore stages; grounded route/robot checks. |
| 62 | Moa says “Tack för att du tände min lampa.” | **P + L:** actual reading stops show Moa facing Elof and the exact thanks line. Source/scene/robot checks pass. |

## Evidence locations and provenance

These are local review records, not public screenshots or assets. The short names in each directory identify the
stages described above. Earlier failed or superseded images are not counted as final acceptance.

| Reviewer / scope | Local evidence | Build and review notes |
| --- | --- | --- |
| Early: 1–4, 11–13 | `/workspace/nov10-early/scratch/private-review/`, `private-review-final/`, `private-norrsken/`, `private-norrsken-final/` | Prologue/catch and Gården corrections, then Norrsken build 4 including `ef236b2`. Sampled 20 Hz / draw-every-six. Final integrated paper image: `private-final-integrated-paper/prolog-paper-palm-390x844.png`, root build `94adde8`. Final rope/landscape shoulders: `private-norrsken-final-framing/`. |
| River: 6–7, 20–23, 39–43, 45, 47–48 | `/workspace/scratch/nov10-river-built/`; `/workspace/nov10-{byn-review,a2-review,granskog-built,landscape-final}.log` | Final leaf/goal camera views use `fb43871`/`feb918b`; `/workspace/nov10-camera-final-built.log` records the successful recheck. 20 Hz, every tick drawn. Use `granskog-bough-*`, `granskog-cap-*`, `byn-*`, `stormbyn-*`, `flarken-*` frames as named above. |
| Water: 8–10, 29, 31–35, 37–38 | `/workspace/scratch/nov10-water-review/` | Initial built review at `651cbe8`; final Myren/owl/foreground frames are in `/workspace/scratch/nov10-water-final-review/`, with the final owl camera at `84959a0`. These replace failed initial frames. 20 Hz, every tick drawn. |
| Finale: 14–19, 24–27, 62 | `/workspace/scratch/nov10-home-private-fixed/`, `/workspace/scratch/nov10-bathroom-visible/` | Home source `8fc05a7`, final brush correction `ae9df63`. Home/bathroom used 20 Hz with every tick drawn. Later storm checks use draw-every-six and live in `/workspace/scratch/nov10-storm-home/`; the initial successful Moa-thanks P frame predates that draw suppression. All sixteen storm/morning frames passed in both sizes; `nov10-storm-home/results.json` retains the states. Final party/blink frames and states are in `/workspace/scratch/nov10-home-party-final/`; all ten party views and both eye states passed. |
| Talk: 50–61 | `/workspace/nov10-talk/scratch/nov10-last-chapters/alven-results.json`, `nov10-final-chapters/results.json`, `nov10-owl-thanks/results.json` | Respectively 2, 34 and 2 inspected records. Final owl thanks bundle SHA-256 `4a0816071488339723cd3e5bb4e0c5d041f5ec3b27c0e409fa732f1afa772a84`; private pack manifest `3e70b1489cc0cc60b7ec0e27811b3afd75d105b4e52914c94c9b872560b4182d`. Each JSON retains its own bundle hash. Sampled 20 Hz / draw-every-six. |
| Illustration/rain: 5, 17 art, 28, 30, 36, 44, 46, 49 | `/workspace/nov10-qa/scratch/owned-evidence.md`, `actual-pictures/`, `story-illustrations/` | Final art refinements `22a2db6`. Native-RAF private world review is P only. `actual-pictures.log`, `actual-pictures-fix.log` and `actual-rain.log` distinguish final successful frames from invalid early rain spawns/short walks. |
| Final landscape guidance | `/workspace/scratch/nov10-purpose-ui-final/`, `/workspace/nov10-purpose-ui-review-final.log` | CSS `958adb0`, actual private normal/large-text views in three viewport sizes. Smallest clearance is the 780×360 large-text case: card bottom 79.59 px, Pappa's hat starts about 83 px; button gaps and complete text checked. |
| General collections | `/workspace/scratch/nov10-collection-bag-browser.log`, `/workspace/scratch/nov10-photo-storage.log` | Built seeded-save/stand-in UI checks in P/L and 37 photo-storage browser checks. The standalone sweet sheet predates final clipping adjustments and is not final evidence for every sticker. |

## Automated checks and final integration

Reported focused checks are evidence for their own changes, not additive test totals: several suites overlap.

- Illustration/rain: 36 tests in five files passed; fifteen SVG/Canvas scene comparisons passed with zero interior
  raster differences. Isolated typecheck, build and privacy check passed. The updated full `ghost-thoughts`
  browser suite is assigned to the integrated run/CI; it is not recorded here as already run.
- Early: 77 focused tests, 43 scene/dialogue tests and 27 updated-fixture checks passed; the separate private
  walking contact probe passed 180 poses. Final rope-camera and landscape shoulder views passed; the integrated single-rope guard passed typecheck and thirteen focused tests.
- River: 75 focused tests passed; final leaf and goal-camera P/L recaptures passed after the corrections. The
  actual passing-car pair also passed, using the sampling method recorded in row 21.
- Finale: home unit/contact and party/home/context/dialogue robot checks passed; integrated `shared-home` (54) and `epilogue` (20) browser checks also passed. These counts overlap, so no
  combined total is claimed. Isolated typecheck, build and privacy check passed.
- Talk: 115 targeted tests, typecheck, build/size and privacy checks passed; final sampled private views for
  50–61 passed in both sizes.
- Future A1 voice metadata now has 123 current story lines: 21 additions, seven rewritten text/speaker rows,
  and 95 unchanged rows' tags/situations preserved. The source-only consistency test and typecheck passed.
  The generator was neither imported nor executed; no external voice API was called and `public/audio/` is
  unchanged. Runtime stale-recording protection and the A2 metadata catalog are checked in the integrated run.
- Root reported integrated typecheck and built-in privacy checks passing. Its privacy environment had neither
  the configured secret denylist nor exiftool; CI must run its configured checks. The integrated full tests and production build have now passed as recorded below.

The first CI run found a real public stand-in contact defect: its mouth anchor sat above the drawn lips, so
carvings reached too high. The anchor now follows the actual transformed mouth mesh; the original carrying bounds
remain. The new regression and all 2,403 tests pass. `nightfall` now follows the actual family run-in instead of
expecting instant appearance; its 64 checks and `finale-stage`'s 99 checks pass. The intermittent Follow finger
fixture now targets 80 px instead of 115 px from Elof, safely inside the 120 px run threshold as the camera turns;
all 66 settings checks pass with the original direction/speed requirements.

The fuller reunion also keeps the established save contract: stable `first1`–`first4` IDs retain older reading
receipts; new introductory lines still play; interrupted reading resumes at the last acknowledged tableau and
then the first unread line. Only this scene opts in. Its safe 26.6 summit mark prevents a saved checkpoint before
the encounter from stranding the conversation. Already-rescued legacy saves suppress the rescue introduction.
Regression checks cover cues on either side of a line, legacy receipts, two reloads, checkpoint restart, explicit
scene opening and the final tail. The actual focused save/reload browser passed five checks.

Other first-run CI failures were stale fixtures: Myren now has one Mamma (22 model-installation checks passed),
the vittror picture uses the authored 512×384 atlas (52 forest-puzzle checks passed), and the mountain helper must
wait for queued dialogue to release controls (14 focused prize checks passed in both orientations). The painting
interaction retains its assertions and uses a bounded scene-progress/inactivity wait for the 18-second awakening
(eight focused checks passed), instead of assuming 90 seconds of software-rendering wall time is sufficient.

The final family-help assertion run passed all 55 checks after centring the settled family; optional iteration
screenshots were omitted in that local run, while the committed suite still takes them. Separate actual private
views then exposed the objective-card overlap, fixed and reviewed as described above. Story interaction coverage
passed all 39 unique checks across its sharing, painting, carving/bathroom and party runs. Story-context covered
its first 73 checks plus the remaining 18 in a focused tail run after a transient five-second rendering stall;
the final guard allows 20 seconds without progress, with the existing 120-second total ceiling and strict
28.135-second simulation budget intact. These segmented local results do not claim a single uninterrupted green
run; the complete registered suites run again in CI on the final PR head.

The final objective-layout check requires actual rectangle separation from the bag, pause and helper controls
in either orientation, while retaining viewport fit, readable larger text, polite untimed content and dialogue
hiding. Its twenty checks passed at all four original viewport sizes. The complete final `story-context` run
then passed all 90 checks without page errors, including saved reading, the reunion, the bounded route and final
handoff. This uninterrupted run supersedes its earlier segmented local evidence.

| Final integrated gate | Result |
| --- | --- |
| Final source revision and private-pack revision | Implementation and validation history `2b4345f`, including the integrated single-rope guard and final owl camera; private pack unchanged `fd8c283`. |
| `npm run typecheck` | Passed on integrated source, including the final single-rope guard. |
| `npm test` | 2,403 tests in 248 files passed after the corrected lip anchor and interrupted-reunion save compatibility. Subsequent browser-fixture changes do not alter production code. CI repeats the complete suite on the PR head. |
| `npm run build` and size gates | Full `npm run build` passed with private assets; final source/CSS rebundles and size gates also passed. JS 637.2 KB / 1,000; boot 5,701.4 KB / 10,240; A2 chunk 88.5 KB / 160. |
| `npm run privacy-check` | Passed: 995 tracked files, 187 built files, 439 media files. Built-in scan; no local secret denylist or exiftool. CI supplies its configured privacy checks. |
| Registered browser suites for touched chapters and shared UI | Full suite is the merge gate in twelve CI jobs. Local `collection-bag`, `photo-storage` (37 checks), `story-illustrations` (15 comparisons), `shared-home` (54 checks including private eyes) and `epilogue` (20 checks) passed. |
| Numbered visual checks | Complete as itemized above; viewport and capture-method limits retained. |
| PR and full CI | [PR #253](https://github.com/olovmelander/spokets-godisbus/pull/253); all fourteen required checks must be green on the exact merge head. |

No physical-device or native-performance claim is made by this ledger. Private likeness images remain in ignored
scratch directories; only implementation, public original artwork and text evidence are committed.
