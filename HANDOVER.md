# Handover

## State (5 October 2026)

- **Level design, version 6: the first pass, the "layers", is laid over five chapters** (4 October, late
  evening, and 5 October, on Olov's computer; `docs/level-design.md`; pull requests #113 to #125, merged).
  Olov: "the game feels very linear right now. I want it to feel more like an
  exceptional indie platformer ... research on the web for good game that we can get inspired of ... Take the
  best things from the best platformers into my game. Like Super Mario, Rayman, Braid, Unravel, little
  Nightmares, inside, ori and the blind forest ... really improve the level design, puzzles and the chapters".
  - **The research is done:** seven threads (Nintendo's course design, Rayman and Celeste, Inside and Little
    Nightmares, Braid and puzzle craft, Unravel, Ori, and non-linearity for young players), written up with its
    sources in `docs/research/platformer-level-design.md`. Its raw notes, and a measured brief of the chapters
    as they were, are on Olov's computer in `references/level-design-research/` (git ignores that folder).
  - **What it found about the game as built:** 91 to 95 per cent of each numbered chapter was one corridor; no
    swing ring hung outside Gården and Byn, so the game's best verb was dropped after 14 EL; nine of the
    sixteen hidden sweets used one recipe (1.9 EL straight above the trail); most puzzles are one or two
    presses; the robot finishes Berget without pressing Hoppa and the whole story in 5 min 22 s. And the
    lesson from Kirby's Epic Yarn: the risk for Elof is a game that is easy, pretty and dull, not a hard one.
  - **What follows from it** is in `docs/level-design.md`, and the plan is version 6: the trail stays a line,
    and a chapter gets ledges that make a second level over the path, side candy in a voice of its own, the lace
    in every chapter, pockets, and sweets for the brave and for the curious. First the "layers" over the
    chapters as they stand, then the "arcs" on the main trail.
  - **Built first, the format:**
    - **A ledge** (`ledges` in a chapter): a thin floor he jumps up through and stands on, and walks in front of
      when it is above his feet. Until now every second level was a solid box, a ceiling from below.
    - **Side candy** (`side`): candy off the trail, drawn as hearts and lollipops, where the trail is now only
      sweets in wrappers. It has its own list, so a chapter's trail and its saved games are untouched; a save
      keeps it under `side`, and an older save reads back exactly as before.
    - **A hidden sweet can say how it is reached** (`way`), and then its chapter's secrets test must play it:
      that lifts the rule that every sweet hangs one held jump above the ground.
    - **What holds a ring** (`hangs` on a hook, `lines` in a chapter): a ring off the main way hangs on a
      cord from something above it, or from a line strung between two poles. For the picture only.
    - **A sixth ledge look, the trestle:** a board on legs, for a floor with no wall behind it.
    - **A defect repaired:** *Jag har fastnat* right after a ride (the cap, the launch, the ant lift, the plane)
      left him on the ride's near side with the ride used up, until the page was loaded again. The ride now
      begins again.
    - **A defect in the format itself, repaired:** a ledge held his body up on its very corner, but he
      counted as standing only with his feet over it, and his feet are narrower than his body. On those three
      hundredths of an EL he rested without standing, and Hoppa did nothing until the stick moved. Every
      chapter's tests ran into it. He now stands wherever a ledge carries him.
  - **The layers, chapter by chapter** (side by side in `docs/level-design.md` §3). Each starts where the
    trail passes, with a heart in sight, and lets out forward onto it. Up is the richer, harder way, and a
    miss lands on the trail below, unhurt. Nothing the story needs is on one; the helper and the robot never
    go there. The trail's candy, the big candies, the ground and everything that was there are untouched, so
    saved games are too.
    - **Gården** (#116). *The window sills:* five boards along the house wall over the deck, up and down
      again before the ladybird. *The clothes line:* three leaves up from the boulder, three rings on a line
      between two poles over the dew rain, and the skumbanan on the leaf at its end. *The planks by the
      hose,* there once the ladybird has brought the hose down, for whoever climbs back up it: the skumsvamp.
    - **Granskogen** (#119). *The boughs:* a plate of bark and a bough up from the big cone, the forest's
      first ring between two trunks, and the gummiorm at the end of the far bough. *The nest:* bark up a
      trunk after the log, the colaflaska in the nest, and two rings in a row to a bough before the pool.
      *The root* down the hilltop's near side, there once the ants have carried him up: a way back to the
      ant road and up again.
    - **Myren** (#117). *The cranberry's leaf:* jumping for a heart over the first cranberry, he comes down
      on the berry and it puts him on a leaf with the stekt ägg. *The leaves* over the firm tussocks, two of
      them reached over open water. *The dead pines* over the boardwalk: two branches up, three rings on a
      rope between the pines, and the sur napp on the branch where they end.
    - **Berget** (#115). *The rock shelves* up from the first slab, and the mountain's first ring over the
      cobbles to a far shelf with the gräddkola. *From lee to lee:* a low and a high shelf on every boulder
      and a ring between every two, on a guide rope. On the lace no gust has hold of him, so the gusts can be
      crossed overhead; the salmiakruta is on the last boulder's top.
    - **Byn** (#114). *The sweet shop's shelves:* three steps up on legs, two rings on their flex over the
      floor, a long shelf and a step down before the bag.
  - **The first three puzzles** (#122 to #124; the table in `docs/level-design.md` §3). Each is optional,
    has its prize in sight first, and takes the chapter's own rule the other way round.
    - **Gården, the curl on the ring.** Five sweets on a bough beyond the birch root, and a ring on a string
      that a curl of shaving hangs round, so the lace cannot catch it. *Dra* slides the curl off along the
      string, and then the same button throws the lace. The lace pulls as well as swings.
    - **Granskogen, the cone on the bough.** Hearts two steps over a long bough, with no step between. A cone
      lies on the bough: pushed out to its tip, its weight brings the missing step.
    - **Myren, the toss.** An arch of hearts over the soft tussocks and a glint in the moss under it.
      Standing still on the tussock that sinks, the one thing the bog has taught him not to do, he sinks
      towards the glint and is thrown along the arch onto a dead pine's bough.
    - **Berget has none.** What came back was a leaf that hangs in the air and rises with each gust, with a
      garland over it: one piece, floating, and its prize out of the trail's picture. It was not merged; the
      branch `puzzle-berget` is on Olov's computer only. A gust is only a push to the left: it lifts
      nothing, a thing he moves makes no lee, and on *Lugnt* it does not blow.
  - **In numbers.** The share of a chapter that is one corridor went from 95 to 74 per cent in Gården, from
    92 to 76 in Granskogen, from 91 to 76 in Myren, from 94 to 64 on Berget and from 100 to 88 in Byn. There
    are 60 ledges, 18 new rings, 113 side candies, and eight of the sixteen hidden sweets now lie at the end
    of a way of their own. The lace, which was used in 14 EL of Gården only, is in every chapter he walks
    through.
  - **Inside the draw budget** (#118). With Granskogen's layers two of its pictures came to 119 and 122 draw
    calls. A side way's ledges, with what holds them and its cords, lines and poles, are now one mesh, its
    rings one and its side candy two, and each is drawn only while it is in sight: four draw calls at a side
    way, where it was up to six, and none away from it. The heaviest picture measured in Granskogen is now
    117; the chapters merged before it got one to six cheaper.
  - **What this is not.** The main trails are exactly as they were: the trail's own puzzles are the same
    ones, of one or two presses; Myren's boardwalk is still 9.7 seconds of plain running under the new rings;
    the robot still finishes Berget without Hoppa. Everything laid so far is beside the trail and can be
    walked past. Each chapter's arcs on its main trail are the second pass, which is not begun. And the three
    puzzles are greybox: Granskogen's lever is told by a twig that grows out, not shown, because nothing in
    the format can tilt.
  - **The checks take 13 minutes, where they took 44 to 75** (#121). All but 74 seconds of a run was the 39
    browser suites, one after another on a machine that draws the game in software. They are shared out
    over six jobs that run side by side (`tests/browser/suites.mjs`); `npm run test:browser` still runs
    them in a row. A unit test holds that a new suite cannot be left out of the list.
  - **Validation:** typecheck; 1,046 unit, simulation and robot tests, about 250 of them new. Each chapter has
    `tests/sim/layers-<chapter>.test.ts`, which plays every side way from the trail back to the trail at
    several moments of letting go and tells every miss, and `tests/sim/secrets-<chapter>.test.ts`, which
    plays the way to each moved sweet. Each puzzle has `tests/sim/puzzle-<chapter>.test.ts`: its solution
    from the trail back to the trail, its likeliest wrong tries, a game taken up again, and that the helper
    and the robot never go there. `tests/unit/layers.test.ts` is a floor under each chapter's side ways,
    rings and sweets, and `tests/robot/pace.test.ts` a ceiling over each main trail's plain running.
    The build and its size gate (391 KB of script, 828 KB at boot); the privacy check.
    - **In a browser:** every pull request's run on GitHub was green, all 39 suites, before it was merged.
      On Olov's computer each side way with rings, Gården's sills, Myren's leaves and each of the three
      puzzles was played with the keyboard in the running game at 1180×820 and 844×390 by a script that is
      not in the repository, and its pictures were looked at. The live site was looked at in every chapter
      after the deploys. No browser suite in the repository plays a side way or a puzzle yet.
    - **Built by five sessions at once:** the format and Byn by the main session, and Gården, Granskogen,
      Myren and Berget each by a helper session in a worktree of its own, from one brief, and the puzzles
      the same way from a second brief. The main session read every change, played every way and every
      puzzle in the running game, hung the rings, and turned Berget's puzzle down. The chapters did not get
      in each other's way, because a chapter is one file.

- **The candy is modelled in Blender** (4 October, on Olov's computer; pull requests #110 and #111, merged, and
  on the site; art bible §2.9).
  Olov: "We need to improve the design of all candies and similar assets in the game use the blender mcp".
  - **What you see:**
    - *The trail* is the poster's candy: glossy karameller in pleated, twisted wrappers, striped ones whose
      stripes wind as they roll, swirls in wrappers, and now and then a pink heart or a small swirl lollipop.
      They sway with their side to him instead of turning right round, so each always has a sweet's outline.
    - *The big candy* at every checkpoint is a thick round swirl lollipop with a yellow bow. Its swirl turns
      like a pinwheel, and fast once he has reached it.
    - *The sixteen hidden kinds* are each shaped as what they are (a gummy bear, a fried egg, a cola bottle, a
      polkagris ...), in the colours their stickers have, where every one was a ball with a band.
    - *The magic candy:* the golden geléhallon is a raspberry of beads, the lysklubba a golden swirl that glows
      (also as the lantern he carries through the mist), the shrinking star a plump five-pointed star.
    - *On the summit* the sweet he gives away lies beside its friend as itself: a geléhallon, a karamell or a
      skumbanan. *In Byn's shop* the jars hold wrapped sweets.
    - *Everywhere* a sweet gives off a little of its own colour and has a glossy rim, so it keeps its colours in
      the forest's shade, against the bog's sun and at night. Before, the big candy went olive in the bog.
    - *The stickers* in the album, on the bag in the corner, on the end card and on Moa's map are pictures of
      the sweets themselves, rendered from the same models, where each was a disc in two colours. The end
      card's rows of ten are small wrapped sweets.
    - *The Saturday bag* that the ghost takes is striped paper, pinked at its top, with sweets looking out,
      where it was a box with three stripes. Its tear is a jagged rip.
  - **How:** `art/blender/candy.py` builds 25 sweets into `art/baked/boot/candy.glb` (no texture; colours on
    the corners, their own shade baked in), and `art/blender/big-candy.py` the checkpoint.
    `src/render/candy.ts` reads the kit, draws the trail and puts the sweets where the scene asks for them.
    Every place keeps a stand-in built in code until the kit has arrived, and where a build has no kit.
  - **It costs** about 100 KB more as served (the kit, and 24 KB for the stickers' sheet) and 2 KB of script.
    The trail is at most five draw calls where it was one; a hidden sweet is two where it was three.
  - `dev/menus.html?show=album` shows the stickers without WebGL (`album,all` shows every one).
  - **Validation:** typecheck; 790 unit and robot tests, 16 of them new (`tests/unit/candy.test.ts` holds the
    generator to the game's kinds and colours, and checks the trail, the places for sweets and the summit's
    gifts); the build and its size gate; the privacy check. In a browser on Olov's computer: the smoke suite,
    with a new check that the kit is loaded, the opening story, whose candy check now reads the trail's
    several meshes, and for the stickers the album and Moa's map.
    - **Merged on Olov's word, before GitHub had finished.** He wrote "Merge this to main!" while both pull
      requests' runs were still playing the browser suites; typecheck, the tests, the build and the privacy
      check had passed there. Both were merged then. The deploy succeeded, the live pack has `candy.glb`, and
      the live game was looked at in the garden, the bog, the summit and the shop, with no error in the console.
      Both runs then finished green on GitHub, all 39 browser suites (58.5 and 44.1 minutes), and so did the run
      of the fixes that followed (#112). Pictures from the game at nine places
    and the kit as a sheet are in `docs/shots/_work/candy/` on his computer (git ignores them).
    - With another session's browser drawing the game on the same computer, seven robot tests ran out of
      vitest's five seconds, and passed with a longer limit and on GitHub. **Fixed:** a test now has thirty
      seconds (`testTimeout` in `vite.config.ts`), so `npm test` passes on a busy computer too.
  - **Not done:** the bag in the corner is the drawn outline it was, and the golden geléhallon's reward in the
    album is its drawn picture. The stand-in big candy (seen for a moment before the pack arrives) is still
    the old striped ball. The ghost's own carved pocket, on its private model, is untouched. **Not judged by Olov yet,** and not seen on a phone.
  - **Three choices the session made,** for Olov to overrule: the bow on the big candy; that it turns as a
    pinwheel instead of round its stick; and how much a sweet shines by itself (`CANDY_LIFT` in
    `src/render/candy.ts`: 0 is only the place's light).

- **Current Git state:** PR #12 and the aggregate PR #106 are merged. `main` is
  `0a94b20e13b504d5a4c157ee0f8a2c579fb626ab`, including the earlier code milestones, memories and ghost
  thought pictures. The aggregate's exact `fff4bd` CI tree passed 677 unit/robot tests, all 30 browser
  suites, typecheck, build/size and privacy checks before merging. All 44 superseded older PRs are now
  closed after checking their heads against the merged result: 25 are ancestors and 19 are
  patch-equivalent. Main deployment `37204352024` succeeded for exactly `0a94b20`; the live
  `index-BziDHGfm.js` matches its deployment log and contains the memory/thought features. Fresh-browser
  checks of the plain address and `?debug&course=prolog` still open the test course. A new overhaul is on
  `codex/storytelling-gameplay-overhaul`, with the published source snapshot at `a6038a1`; that newer source
  is separate from the verified deployed baseline.
  `RELEASED_CHAPTER` remains `null`.

- **The family's models are on the site** (4 October, in the evening). Olov: "I want to implement the all
  family characters now in the main branch." Pappa, Mamma, Moa and Bertil's first models were committed to
  the private repository (`379a9ec` there) and *Deploy to GitHub Pages* was run by hand on `main` (`368a074`).
  Nothing in this repository changed for it: the code already replaced each rehearsal figure with that
  person's model wherever the private pack has one, in the opening, at every help point, on the summit and
  at the party.
  - **They are in the private repository, never in this one.** That is how "in the main branch" was done:
    the rules keep the family's models out of the public history, so that they can be taken down.
  - **Three-year-old Elof (`lill-elof`) was held back.** No part of the game uses him yet, so publishing
    him would only put a file of a three-year-old on the site. He is still on Olov's computer, untracked.
    He goes up with the first memory that shows him, or sooner if Olov says so.
  - **These are the first round,** built in Blender by script on 4 October, not the image-to-3D models
    that CLAUDE.md names as the way the family is to be made. They stand in the game until those exist.
    What each needs next is listed under "The family, first models".
  - **To take them down:** delete their files from `baked/private/` in the private repository (or the
    secret `FAMILY_ASSETS_KEY`) and run the deploy again. The rehearsal figures come back.
  - **On a device that has played before,** the service worker may show the older pack once: open the game
    and reload, as before any release.

- **Integrated overhaul verification:** published source snapshot `a6038a1` (source-identical to tested
  local `e754c06`, with the handover updated afterward) passes 774 unit/robot tests in 76 files,
  typecheck, the KTX asset build/size gate and privacy checks (383.6 KB gzip JavaScript; 712.5 KB public
  boot). Focused browser checks passed for the opening (50), finale (57), family (52) and repeated model
  installation (30), alongside the chapter agents' actual loop playthroughs. The final warmup fix also
  passes nightfall (44), colour pipeline (14) and prologue (25) checks, including a hidden private-model
  substitute whose distinct physical material reveals without compiling during play.
  All 39 browser suite commands passed across the integration runs: the first 22 on `872bf24`, then
  the remaining 17 on `6f7b494` after the hidden-material warmup repair. The warmup-sensitive
  colour pipeline, prologue and opening checks were also rerun against that repair. The original
  nightfall assertion was retained and now passes. The subsequent required-origin handoff fix passes
  the full context browser suite (85), including actual saved-game fast tasting/homeward completion,
  all five layouts and larger phone text. This is a split local gate with a targeted follow-up;
  exact-head GitHub CI runs all 39 suites on the published PR and remains pending at this handover.

- **Story and connected gameplay overhaul implemented** (4 October; plan version 5 and
  `docs/storytelling-overhaul.md`).
  - The opening shows the painted eyes waking the ghost, the striped Saturday bag moving from the table
    to the ghost and tearing at the hinge, and the shrinking star spilling afterward. The ghost's own
    carved pocket stays distinct. The family stands beside full-sized Elof, witnesses his shrinking in
    the same picture, reacts and reassures him, and explains that they follow the larger path to help
    with crossings. Existing painting, star and checkpoint progress retains its meaning.
  - An untimed current-purpose HUD, accessible pause recap, title resume cue and chapter-end handoff
    keep the established goal and family role available throughout the adventure. The candy counter
    describes recovered sweets. Optional local loops get their own context without replacing the main
    onward purpose; main-route progress stays independent of optional challenge prizes and album rewards.
  - After the actual summit rescue (`placed:tragubbe`), painted eyes (`eyes`) and recovered bag (`bag`),
    normal play and later recaps explicitly explain the welcome-home candy motive. Missing the optional
    mountain memory still gives "Spöket tog godiset för att välkomna trägubben hem!" The discovered
    mountain memory separately permits "min gamla" and childhood-identity wording in purpose/recap
    cues. The summit uses this visit's local flags; home/epilogue recaps use saved summit receipts, so
    past completion does not spoil a fresh summit replay. Position, a chapter preview or opening a menu
    cannot invent either discovery.
  - The required reunion gives Pappa's origin story its own source. After actual rescue, painted eyes,
    bag return and tasting, the untimed finale handoff explains that he carved the figure for Elof
    when he was little and that they lost it on the mountain, alongside the candy motive. Fast
    homeward travel can overtake the timed
    bubbles, so this essential explanation remains readable on the existing end card. It does not
    grant an optional memory or change the purpose/recap memory guard, input timing or saved flags.
  - Public rehearsal family bodies appear across all chapters and their practical help points. The
    finale shows painted eyes on the rescued carving, the chosen sweets at their recipients and a
    nearby family reunion; Elof then travels home visibly on Pappa's shoulders with both carvings.
    Existing private models can replace the rehearsals. These bodies establish staging, not final
    likeness, hand contact or polished acting; private family assets and their approval rules are intact.
  - **Gården:** Moa opens an optional dry paper pocket once the bridge is ready. Elof can return through
    the same hose/bridge and share the paper, leaving a visible response. Calling Moa prepares her plane;
    a separate deliberate boarding action starts the flight. Old saves that called her can still board.
  - **Granskogen:** a nearby small cone gives a safe low seesaw bounce, while the heavier cone farther
    back supplies the weight for the crossing. Both solve orders work with stage-specific help. The
    neighbour's optional gift/return loop now leaves a persistent small-figure picture at the actual
    root-door keepsake after the real return visit, without moving or duplicating the chase ghost.
  - **Myren:** guiding the chick home unlocks an optional call to Mamma. She raises a persistent firm
    boardwalk back to the recognizable lantern clearing. It supports repeated crossings, stops and
    reversals, restores from old firm checkpoints and avoids the old assisted-hop markers. The crane
    flight remains independent of this return loop.
  - **Berget:** the existing optional Toppröset prize opens a reusable return lace. Players can take it
    down or use the original shelves, then deliberately catch it for another visit. Its raised lower
    end keeps ordinary main-route walkers from catching it; the cooperative cliff and flight remain.
  - Main collectible/checkpoint identities and primary puzzle flags remain compatible with old saves.
    The new optional progress is additive. These are local authored loops, not a full nonlinear world
    or complete chapter-layout redesign; Byn's connected return loop remains open.

- **Renderer continuity repaired in the same source tree:** family rehearsal materials belong to each
  actor/view, so separate chapter grades do not patch a shared material twice. Every installed model
  warms its new materials and shadow receivers, even when another help point already uses the same
  private asset name or it arrives while paused. The homeward ride anchors Pappa's and the carried
  ghost's shadows to the terrain beneath the ride rather than their elevated shoulder positions.
  Initial warmup compiles hidden chapter materials against the actual Low/HDR target without drawing
  the hidden actors. This fixes the family-reveal shader hitch while keeping the story cue intact.
  The repeated-installation checks use delayed substitute models; final private-model appearance still
  needs Olov's review.

- **Public visual checkpoint:** `docs/shots/storytelling/` contains WebP captures of the shared family
  shrinking composition and the shoulder ride at 390×844, 844×390, 780×360, 1180×820 and 1440×900.
  They use public rehearsal figures with the real renderer/simulation, covering Low/High and selected
  reduced-motion cases. The isolated frames omit the HUD for actor inspection. They do not establish
  final likeness, acting or physical-device performance; see that directory's README for the fixtures.

- **Earlier 4 October milestone records:** the entries below preserve their original measurements and
  personal/asset notes. The current combined state and remaining work are the entries above and the
  Next list. Do not interpret an older test count or next-step note as the integrated branch's result.

- **Memories grow from their source and return to it** (`codex/memory-bubble-presentation`; plan §2.4).
  - First discoveries grow from the visible ghost, or from the touched glowing shaving when the ghost
    is beyond the camera. Album replays grow from their thumbnail. The existing sepia oval stays still
    between pictures and shrinks back after the last picture. Escape, controller Back, the close button
    and the backdrop still cancel immediately, restoring focus and releasing held input.
  - Opening, drawing fades, picture timing and return suspend together while hidden or during WebGL
    recovery. Canceled animations cannot finish or reappear in a newer replay. Rotating an interrupted
    opening/return replaces stale movement with a centred fade, keeping the picture and remaining time.
    Saved *Mindre rörelse* and the OS preference use fades without travel/scale. Total automatic playback
    stays within the planned six to ten seconds. `dev/menus.html?show=memory` previews the same component.
  - Validation: 30 new real-browser presentation checks cover interruptions in all phases, immediate
    cancellation, reopening, natural completion, rotation, both reduced-motion settings and layout at
    all five planned sizes. Typecheck and the 665 existing unit/robot tests pass. The drawing cards remain
    the current public cutouts: animated family memory scenes and their final acting still need Blender
    on Olov's computer. No private asset, character model, release or later-release wish changed.

- **Read this first: where it stands.**
  - The whole story is playable from start to end with `?dev`: the prologue, four chapters, the final and
    the epilogue, and after them an extra chapter, Byn. The foundation and the older code stack are merged
    on `main`; the new overhaul is on the development branch named above. The development entry point is
    `https://olovmelander.github.io/spokets-godisbus/?dev`; verify the deployed revision before treating
    it as the overhaul. The plain address retains the test course while `RELEASED_CHAPTER` is `null`:
    releasing is Olov's.
  - **Added in the night of 3 to 4 October** (pull requests #38 to #59; each has its own entry further
    down): music and each place's air; footsteps for every surface; the sticker album; four more switches;
    wordless sounds for the characters and for Elof; the size gate as served; chapter codes; C1, the swing
    chain; the bouncing cranberries; a graphics level that finds its own place, and High's glow; Hittegods,
    found and given back; Byn; far scenery in layers with parallax for every place; the family's first
    models, and the code that shows them at home and on the summit, turning towards him and glad; the jay
    modelled in Blender; his call, and each one's answer; the dew bells.
  - **What Olov asked for on 4 October, and how far it got:**
    - *"Improving and creating all character models in blender":* Pappa, Mamma, Moa, Bertil and
      three-year-old Elof have first models. The four were published that evening on his word;
      three-year-old Elof waits for a memory that uses him. The jay has a first model too, and is on the
      site. Elof and the ghost were not
      reworked. The other animals are still built in code.
    - *"Better graphics in the background and parallax effect background":* done for every place.
    - *"Improve all assets and graphics on all levels":* the far scenery and High's glow reach every
      level. The things, the animals and the ground are as they were.
    - *The village's shopping street as a chapter:* built, as Byn. Its own name waits for question 5.
  - **Waiting for Olov:** questions 5 and 6 under "Frågor till Olov"; the checkpoints H1a, H1b and H2;
    and his ears, because the listening review remains outstanding. PR #12 is now merged.

- **The ghost's thoughts grow clearer** (4 October, cloud session, `codex/story-thought-pictures`; plan §§3.3–3.4).
  - After Elof pulls it out of the forest eddy, its final waiting stops show a mountain silhouette.
    After the crane chick reaches its family in Myren, the waiting ghost shows the mountain, old pine
    and a small grey thing in a crack. Below Berget's final cliff it shows the lonely first trägubbe,
    before *Lyft*. Helping it at the cliff clears that picture. The garden's first smudge is unchanged.
  - Each chapter has one static 256×192 canvas picture and one card beside the actual chase ghost.
    These are symbolic cutouts in the existing memory-card style, with no text or downloaded art;
    the little cap-and-smile icon is a story symbol, not a new character model or final likeness asset.
    No eyes are added to the lost figure. Blender character work and private packs are unchanged.
  - Pictures wait for their authored story flags and settled ghost perch, and clear while it hops or
    leaves. The card stays inside portrait/landscape framing. Pause freezes its entrance and gentle
    drift; *Mindre rörelse* and OS reduced motion keep it still. Its texture is never redrawn during play and
    its shader joins the chapter's initial warmup. Resources belong to the chapter's existing scene
    lifetime, which ends on page navigation; the card also has an explicit resource-release method.
  - Validation: the combined tree passes typecheck, all 671 unit/robot tests, 54 real-browser thought
    checks, all 30 memory-presentation checks and the existing album flow. Clean build/size and the
    built-in privacy scan pass (373.2 KB gzip JavaScript; 701.8 KB public boot). Browser thought cases
    cover all three stops in Low landscape and High
    portrait, using 59–88 draw calls; checks include icon contents, framing, pause, both reduced-motion
    settings, shader/draw/texture bounds and resource release. Iteration
    screenshots use stand-ins under ignored `docs/shots/_work/ghost-thoughts/`.
  - Cloud session: no new question, later-release wish or known defect. `RELEASED_CHAPTER` stays null.
    The small-figure picture at the vittra door is now implemented in the overhaul's persistent keepsake
    after the actual return visit. Final art/device review remains; these code pictures require no
    connection to Olov's computer.

- **Controls and graphics settings completed** (4 October, cloud session, `codex/controls-and-graphics-settings`).
  - **What you see:** Paus now has *Följ fingret*, *Grafik* (Auto / Låg / Mellan / Hög), and
    *Tangenter och handkontroll*. Hold a finger in the world to walk towards it; let go to stop. A second
    finger can still jump or use something. The setting is off by default. Both choices are saved and
    survive changing between Äventyr and Lugnt; old saves get false / Auto.
  - The picture changes while the game stays paused, without a reload or losing the current position,
    candy, flags or checkpoint. A temporary `?tier=` override stays temporary until a graphics button is
    deliberately chosen. Unsupported HDR devices stay on Low, with an explanation in the panel.
  - **Renderer detail:** r186 fixes `outputBufferType` at construction. The view now owns the two HDR
    targets and uses the existing grade followed by Three's OutputPass. Low releases the targets and
    renders directly. The deterministic Low, Mid and High comparison frames match the previous renderer
    pixel for pixel. Crossing Low warms the shaders while paused; Mid/High remain uniform/pixel changes.
  - **Menus:** the bag opens the album, as do G and gamepad View. Controller focus navigation/A/B is now
    connected to the title, pause and chapter-end card. Escape works even from a checkbox or code field;
    the controls reference returns to the paused settings. The end card freezes play and saves once,
    instead of continuing simulation and writing storage every frame.
  - **Validation:** 461 unit/robot tests, the existing browser smoke suite, 32 new browser integration
    checks, typecheck, build/size gates and the built-in privacy scan pass. JavaScript is 323 KB gzipped
    of 450 KB; public boot assets total 605 KB as served of 3 MB. Renderer comparisons used Chromium
    software rendering and stand-ins. Device performance and the sound still need Olov's own checks.
  - **Cloud scope:** no Blender connection or local family models here; no likeness assets changed.
    `RELEASED_CHAPTER` is still null. The next model round still needs Olov's computer and his remarks.

- **Separate player adventures completed** (4 October, cloud session, `codex/player-profiles`).
  - The title always offers *Ny spelare*, and *Byt spelare* once a player exists. A local name and play style
    create a separate adventure; everyone still plays as Elof. Progress, candy, story flags, checkpoint
    and settings belong to the selected player. Names stay on this device and are displayed as plain text.
  - Pause has *Till startsidan*. Settings can also be opened from the title, and closing them returns
    to the title without starting play. Reset and removal each ask Yes/No, with No focused first.
  - Existing Elof saves migrate without losing data. Damaged/newer saves remain untouched until an
    explicit reset/removal; a damaged index is never guessed or replaced. Failed writes keep the player
    on the current screen. An outgoing tab cannot save into a newly selected or deleted profile.
  - Validation: 481 unit/robot tests, 15 new real-browser profile checks, typecheck, build/size gate and
    privacy scan pass. The browser checks cover creation, switching, settings isolation, safe names,
    confirmation, reset/removal isolation, unreadable saves and refused writes. JS is 325 KB gzipped;
    public boot is 608 KB as served. Album photo isolation is a separate follow-up.

- **Album photos and credits** (4 October, cloud session, `codex/album-photos`; plan §§6.9–6.10).
  - Seven story moments now keep a small WebP game frame: shrinking, the first swing, Moa's plane,
    Bertil's cap, the crane flight, the aurora and the finished carving. Foton in the paused album opens
    thumbnails and a keyboard/controller/touch carousel. Finishing the epilogue opens that album as
    credits, then returns to the existing end-card choices; it can be opened again there.
  - IndexedDB stores the first frame of each authored moment under the stable player ID, at most seven
    frames of at most 100 KB each. Reset/deletion must clear that ID's frames before reloading. Denied,
    unsupported or full storage quietly leaves the ordinary album without photos. Only the rendered
    game canvas is copied: no camera, file import, upload or third-party request.
  - Reset/deletion first records a per-player generation in localStorage. If IndexedDB refuses deletion,
    older frames stay hidden and physical cleanup retries on the next read. New adventures can capture
    the same moments again; older tabs cannot relabel pending captures into the new generation. If the
    durable marker itself cannot be saved, reset returns false and leaves the album intact.
  - Capture copies synchronously just after rendering and then encodes asynchronously, without enabling
    `preserveDrawingBuffer`, retaining a full-size render target or rendering the scene twice. Frames
    fit inside 640×360. Pausing also pauses capture delays; saved flags do not produce unrelated frames.
  - Tests cover authored timing, denied storage, size/type guards, copying before encoding, real WebGL
    pixels, IndexedDB persistence and first-frame retention, reset isolation, denied/full fallback,
    pause/back/focus and epilogue credits. `dev/menus.html?show=photos` previews the credits without WebGL.
  - Cloud session: no family reference pictures or likeness renders touched. `RELEASED_CHAPTER` remains
    null; final visual and device review remains Olov's. These tasks did not need his computer.

- **Offline play and Home Screen install** (4 October, cloud session, `codex/offline-play`; plan §6.6).
  - The app shell, decoder, manifest and boot models are saved on the first online visit. Loaded chapter
    assets are cached for offline play too, including assets that arrived before the first worker took
    control. Settings explain *Lägg till på hemskärmen*. The manifest and Apple/Android icons use the
    existing loading-card ghost drawn in code; no new likeness or reference picture is included.
  - `vite-plugin-pwa` 1.3.0 and Workbox 7.4.1 build the worker. They are pinned, and the plugin's declared
    peers include Vite 8. The page checks for updates on the title and when it becomes visible. Every
    open game tab must be at its title before an update activates; an active chapter vetoes it. Title
    controls briefly lock during the vote. The first install does not reload the page.
    A delayed title response gets at most two short retries, each with a fresh all-tab vote. An active
    chapter's explicit veto never retries. Requests arriving during a vote are retained for the next one.
  - Pack and manifest URLs have SHA-256 content versions. Runtime responses are checked against them,
    so an old page cannot silently use a newly deployed asset with the same filename. Shell and runtime
    caches are separated by build. Chapter caches expire after 30 days, with at most 96 files per build;
    obsolete generations are removed once no live page needs them. A waiting worker's shell is retained.
  - Audio is synthesized/decoded, without `<audio>` streaming, so no range-request plugin is needed.
    Browser storage remains best effort: a device can evict it. No save or album data is placed in these
    caches, and clearing a player does not remove downloaded game files.
  - **Validation:** 461 unit/robot tests, typecheck, build/size gates, the built-in privacy check and 21
    browser offline/update checks, including a deliberately delayed vote. The browser suite shuts its
    server off for a real offline reload,
    checks compressed models and play, then simulates a second deployment with two tabs and same-name
    asset changes. Real iPhone/iPad Home Screen lifecycle and device storage pressure still need Olov.
  - **Next:** continue the remaining code tasks below. H1/H2, sound review and family model feedback still
    need Olov; this change requires no Blender or private assets. No new question or later-release wish.

- **Finale nightfall repaired** (4 October, cloud session, `codex/finale-nightfall`).
  - The blue-hour sky, all five distant scenery layers and their haze now darken together over the
    existing three-second transition after *Smaka*. The stars have their own single point layer and stay
    round in portrait and landscape. The existing northern lights, story and simulation are unchanged.
  - No textures are redrawn and no shaders compile during the transition. The added star layer costs
    one draw call. Seeded finale checks at 844×390 and 390×844 on Low and High stay within 120 calls
    (93/95 in landscape, 66/68 in portrait after the family signs appear). Pausing holds the fade; reversing
    it restores the original colours without drift. Morning prologue captures remain pixel-identical.
  - Validation: 461 unit/robot tests, 36 targeted browser checks (`node tests/browser/nightfall.mjs`),
    typecheck, build/size gate and the built-in privacy scan. Iteration captures use stand-ins and stay
    in ignored `docs/shots/_work/nightfall/`. Physical device performance and H1a still need Olov.
  - This repair needs no Blender work. The remaining art/model work still needs Olov's computer;
    no family assets, release setting, "Senare" scope or questions to Olov changed.

- **Byn has street life and a shop interior** (4 October, cloud session, `codex/byn-street-and-shop`).
  - Giant shoes pass and an unmarked car rolls slowly along a separate lane behind Elof. They never collide
    with him. These are anonymous plain stand-ins, with no faces, shop names, numbers or brands.
  - The existing leaf, bicycle and matchbox puzzles still lead to the same door. Now he walks through it,
    onto wooden boards past giant jars of sweets, to a paper bag to share. Two new checkpoints and a candy
    trail lead through the room. The first 62 candy entries and eight checkpoints retain their exact old
    indices; a saved game at the old final checkpoint continues into the shop.
  - Validation: 463 unit/robot tests, typecheck, build/size and privacy pass. The focused browser checks
    cover shoes, car, door, shelves and bag in portrait/landscape on Low/High, including the real simulation
    walking from the door to the new ending. Motion pauses, no shaders compile during the walk, and the
    picture stays below 120 draw calls. JavaScript is 325 KB gzipped and boot assets 607 KB as served.
    Iteration captures use stand-ins in ignored `docs/shots/_work/village/`.
  - Next here: Olov's device/art review; a return route and hidden candy remain unbuilt. Detailed people
    and vehicle models still need Blender on his computer. No release, family assets, questions or later
    scope changed.

- **C2, Myrstacken** (4 October, cloud session, first commit on `codex/chapter-challenges`).
  - **What you see:** six moving ant columns climb the steep outside of the forest anthill. Jump onto
    the first needle mat deliberately; the ordinary ant road and ride remain open below. A firm ledge
    halfway up gives misses a nearby bubble return. The top holds the existing chokladkola and a root
    slides back to the usual hilltop. Collecting it earns the album's challenge star.
  - The three helper levels work inside the raised route; outside they still show the story path.
    Raised camera zones frame the climb in portrait and landscape. Columns carry standing feet both
    upwards and downwards, let jumps leave freely, and never become unsafe bubble return positions.
  - **Save/commit rule:** only finding the candy commits the challenge. Moving phases restart locally;
    no extra checkpoint or placed flag changes the chapter save. Reset/reload keeps the prize. The root
    opens only after finding it, so a normal walk cannot accidentally climb the challenge backwards.
  - **Validation:** 466 tests, typecheck, build/size gate and privacy scan pass. Browser checks cover
    portrait/landscape, Low/High, all three hints, standing/jumping on a column and the root return;
    draw calls remain within 120 and no shader compiles during play. Full climbs pass four cycle phases.
  - **Limits/next:** animal shapes are code stand-ins; Blender work and real-device difficulty judgement
    still need Olov's computer. No new question or later-release wish; `RELEASED_CHAPTER` remains null.
    C3 and C4 are the next separate chapter changes.

- **Historical milestones:** the older entries below record their state at that time, including their
  then-current test counts and remaining work. The State entries above and Next list below describe
  the current combined code; do not restart work marked complete there.

- **Done:**
  - The plan, `docs/game-plan.md` version 4: research, design, art direction, technology and delivery. Version 4
    takes in Olov's second round of answers of 3 October, which settle every question version 3 left open (plan
    §0, §8).
  - `main` created from the planning branch, with a placeholder page in `site/` and a minimal Pages workflow,
    `.github/workflows/deploy.yml`. Its first run deployed successfully (run 37121042291).
  - Olov set the default branch to `main` and the Pages source to GitHub Actions (3 October).
  - Reference pictures gathered on Olov's computer, in `photos/` (3 October). None of it is committed, and
    `.gitignore` now excludes the folder.
    - `photos/`: the character sheets, the poster, the ghost render and photos, a picture of four of Pappa's
      figures, the family photos and the house photos, renamed to say what they show.
    - `photos/landscape/`: 84 photos of Bredbyn, Anundsjö and the country around them, with photographer, licence
      and source for each in `photos/landscape/SOURCES.md`. Most are CC BY-SA: for looking at, not for the game.
    - `photos/house-summer-scaffolding.jpg` shows the house number on the wall, and the phone screenshots show
      account names. Neither detail may ever be modelled, drawn, written down or committed (plan §2.6).
  - **Blender is connected** (3 October). `.mcp.json` declares the MCP server with telemetry off and safe mode on,
    and `uv` is installed. Started exactly as declared, the server connected to Olov's Blender, listed its 36 tools
    and returned the scene.
    - Claude Code loads `.mcp.json` when a session starts, so the session that tested this had no Blender tools of
      its own. The next session has them, once Olov has restarted VS Code and approved the `blender` server.
    - The add-on inside Blender is older than the server. The server says so and falls back, so it works, but
      see "Next".
  - **Stage 0a, part 1: the foundation runs** (3 October, merged as pull request #2; the plan was #1).
    - What you see: a greybox test course with a stand-in Elof in his colours. He walks, runs and jumps, with the
      keyboard, a gamepad, or the on-screen stick and buttons. `?debug` shows the numbers.
    - The stack of plan §6.1: Vite 8, TypeScript 7, three r186 (`WebGLRenderer`), planck. `npm run dev`,
      `dev:lan`, `build`, `typecheck`, `test`, `test:browser` and `privacy-check` all work.
    - `src/sim/`: the pure simulation. Walk, run, a jump whose height follows how long Hoppa is held, coyote time
      and the jump buffer, all at the plan's starting values (§4.2).
    - `src/input/`: Sköldhästen's input, ported to TypeScript with this game's verbs, and the press queue.
    - `src/core/loop.ts` and `src/app/game.ts`: the fixed 1/120 s step with interpolation.
    - `src/render/view.ts`: the side camera with its long lens, the pixel budget, and the greybox scene.
    - 50 Vitest tests, among them the robot, which plays the course through the real loop at 30, 60, 120 and
      144 Hz. The browser smoke test plays with the keyboard at 1440×900 and with touch at 844×390.
    - The build's size gate: 188 KB of gzipped JS, of the 450 KB allowed.
    - `.github/workflows/deploy.yml` builds and publishes `dist/`, and `ci.yml` checks pull requests. Both have
      run green on GitHub: `ci.yml` on pull request #2 in about a minute, and `deploy.yml` after the merge.
    - **The test course is live** at `https://olovmelander.github.io/spokets-godisbus/`, with `noindex`. The
      placeholder page is gone.
  - **Stage 0a, part 2: a model goes from Blender to the page** (3 October, branch `stage-0a-assets`).
    - The big candy at the end of the course is now modelled in Blender, through the MCP server, by
      `art/blender/big-candy.py`. `scripts/bake/export.py` exported it to `art/baked/boot/big-candy.glb`.
    - `scripts/build-assets.mjs` packs it: the texture becomes KTX2 (ETC1S) with the `ktx` tool, the meshes are
      compressed with meshopt, and `public/packs/manifest.json` lists the bytes. 33 KB became 19 KB.
    - The game loads it with three's glTF, KTX2 and meshopt loaders (`src/render/assets.ts`). The custom
      property set in Blender arrives as `userData`. The browser test checks all of it.
    - `?bench` plays the course by itself for 30 seconds and then shows text to copy into a session.
    - `dev/menus.html` shows everything that lies over the game view, without WebGL. The game and that page build
      the same shell (`src/ui/shell.ts`).
    - The size gate now reads 256 KB of gzipped JS (of 450), and 791 KB for the boot pack (of 3 MB), of which
      the KTX2 transcoder is 515 KB.
- **Stage 0a is built.** What is left of it is Olov's checkpoint: the game on his devices. See "Next".
- **Stage 0b has begun** (3 October, branch `stage-0b-tiers`, stacked on `stage-0a-assets`): quality tiers and the
  graded picture.
  - `src/render/quality.ts`: Low, Mid and High with the plan's pixel caps (§6.5). `?tier=low`, `mid` or `high`
    chooses one; without it the game starts in Mid, and a device that can't render to float buffers gets Low.
  - `src/render/grade.ts`: on Mid and High the scene goes to r186's HDR buffer, and one pass applies the place's
    grade, a vignette and film grain. The renderer tone-maps after it. Low draws straight to the canvas.
  - The browser test covers all three tiers, and checks that no shader is compiled during play (gate 6).
  - **Not yet:** High's bloom and depth blur, Low's grade inside the materials, and the LUT per place.
  - **Auto finds its own level** (4 October, branch `stage-0b-auto-tier`; plan §6.5). What you see: on a
    device that keeps up, the picture gets sharper about five seconds into play, and stays so. High draws
    more pixels than Mid and nothing else, so the game can change between them while it runs.
    - It starts at Mid, measures four seconds of play, tries High for four, and keeps it if at most a
      tenth of the frames were late. Otherwise it goes back to Mid. One try a session: it never goes back
      and forth. A device already under 45 frames a second at Mid is never tried. `?tier=` and `?bench`
      switch it off. The logic is `createAutoTier` in `src/render/quality.ts`, with no rendering in it.
    - Tests: `tests/unit/auto-tier.test.ts` (7). Checked on Olov's computer with its own graphics card (the
      integrated Radeon, through headless Chromium): at 1440×900 the canvas went from 1600×1000 to
      2039×1274 after five seconds, and no shader was compiled. The browser test runs on software
      rendering, which is too slow at Mid to be tried, so it does not see the change.
    - **Not measured:** an iPad or a phone. Auto never goes *down* to Low: a device too slow for Mid needs
      `?tier=low` until that is built.
  - **High glows** (4 October, branch `stage-0b-glow`; plan §6.5). What you see, on High only: light spills
    a little round what is brightest: a lit shop window, the sun on something pale, the shafts in the
    forest. It is part of the one grading pass (sixteen more samples of the same picture, no buffer of its
    own), switched by a number, so Auto going from Mid to High compiles nothing. Two numbers in
    `src/render/grade.ts` set it: `GLOW_FROM` and `GLOW_ON_HIGH`. Kept gentle on purpose; a test holds it
    there. **Not yet:** the depth blur, and a wider glow from smaller copies of the picture.
  - **The look of a place, and the first golden frame** (3 October, branch `stage-0b-look`; art bible §2).
    Olov asked twice when the graphics come, so the look-dev was taken up as soon as the story played through
    in greybox.
    - **What you see:** `?course=look-forest&debug&tier=high` is the golden frame *the moss under the spruces*:
      a moss bank with cushions, grass lit from behind, lingonberry sprigs, cones and needles; spruce trunks
      with bark and roots; trunks far out of focus with spots of light; shafts of light and dust; soft dark
      grass in the foreground. **All of Kapitel 2 is dressed the same way:** `?dev&course=granskog`.
    - **How:** a chapter names its place (`place: 'forest'`), and `src/render/dressing.ts` builds the layers
      of plan §5.3 around the chapter's ground. The rules of the chapter are untouched, and a chapter without
      a place is greybox as before. Everything is made in code: no download, no third-party file.
    - It costs about 50 to 75 draw calls and 110,000 to 150,000 triangles in the picture. The scatter is
      built in stretches of 18 EL that are drawn only while they are in view. **Not measured on a device.**
    - Tests: the browser test runs through the golden frame on Low and High (drawn, within 120 draw calls,
      no shader compiled on the way); `tests/unit/places.test.ts`.
    - **The garden's look, and the second golden frame** (branch `stage-0b-garden`). `?course=look-deck&debug`
      is *the deck edge*: deck boards with dark gaps, the house's red wall with a white-framed window behind
      it, the drop to the lawn, the earth under the lower deck where the sun falls through between the boards,
      and the lawn as a jungle: grass taller than Elof, dew, dandelions, clover and the birch's first yellow
      leaves. **All of Kapitel 1 is dressed the same way:** `?dev`.
      - A chapter can now mark what a stretch of ground is made of (`surfaces`: wood, earth, stone, shavings,
        hedge), where a deck lies overhead (`roofs`) and where the house stands (`house`). All three are the
        picture's business only.
      - Contact sheets of both golden frames, with the stand-in figure: `docs/shots/look-forest/` and
        `docs/shots/look-deck/`.
    - **The bog, the mountain and the summit at dusk** (branch `stage-0b-places`). Kapitel 3, Kapitel 4 and
      the final are dressed too, so **no chapter of the story is greybox any more:** `?dev` and play on, or
      `?dev&course=myren`, `berget`, `norrsken`.
      - Myren: islands of rust-red and green moss in dark water that lies to the horizon, sedge, dwarf birch,
        cloudberry leaves, sheets of mist, and the forest and the mountain in mist far away. The soft
        tussocks are mounds of paler moss. The boardwalk is planks.
      - Berget: granite, white lichen and boulders under a pink-orange sky, with ridges and a hazy valley.
      - The final: the same summit in blue with the first stars; night and the northern lights come as before.
    - **Stand-ins for things and animals** (branch `stage-2-props`; art bible §2.7). The boxes and bare glints
      are gone from the story's chapters: a chapter says what a thing is (`look`), and `src/render/props.ts`
      builds it in code. The shavings curl, the cone is a cone, the ladybird lies kicking on its back and flies
      off when turned, the jay hops for its berry, the crane kneels and then flies with beating wings,
      Bertil's cap is a boat. Where someone can be called there is a sign on a stick in that person's colour;
      nobody is drawn.
    - **The far scenery in layers, with parallax** (4 October, branch `stage-0b-backdrops`; art bible §2.2).
      Olov: "I want better graphics in the background and parallax effect background".
      - **What you see:** behind every place outdoors there are four or five soft layers where there were
        two, and they pass at different speeds when he runs: the nearest as the world does, the farthest
        hardly at all. The clouds drift.
        - Granskogen: four depths of trunks, thinner and paler the further in, with young spruces at their
          feet, boughs that hang in from above and spots of light.
        - Gården: white clouds, blue hills, the forest's edge with the neighbours' roofs as pale shapes,
          birches over a hedge, and the garden's own leaves.
        - Myren: clouds, the mountain in mist, low hills of forest, the forest's edge, and the nearest
          spruces and bog pines dark against the mist. The old spruces were hard-edged triangles.
        - Berget and the final: clouds and four lines of ridges with haze between them, the nearest with
          spruces; at dusk they are dark blue, with a few lit windows in the valley.
        - At home the morning windows show the garden's far scenery instead of a grey-blue pane.
      - **How:** `src/render/backdrop.ts`. A layer is a picture drawn in code on a 512×256 canvas, blurred
        by halving and doubling it, on one card that goes with the camera. Its picture slides across the
        card by its own part of the camera's way (`hold`: 1 stands in the world, 0.08 is the sky), and it
        sinks a little under the layers behind it when he climbs (`sink`). Sliding a picture changes no
        shader. `dressing.ts` lost its two far plates and its horizon; `dress()` calls `scenery()`.
      - It costs two or three draw calls more in a place: the golden frames went from 58 to 60 (the
        forest) and from 38 to 41 (the deck), of 120. Each layer is blended over the picture from its top
        down. **Not measured on a device.**
      - Tests: `tests/unit/backdrop.test.ts` (5): every place outdoors has four to six layers, one behind
        the other and inside what the camera sees, each with its own speed. The browser test still finds
        no shader compiled during play.
      - **Not done:** the windows' picture does not move; nothing is rendered in Blender yet. A new place needs
        its layers in `LAYERS` in `backdrop.ts`: the type checker says so.
    - **Not yet:** plates rendered in Blender and scanned materials (what is there is drawn in code and reads
      as stylized); bloom and depth blur on High; pines with crowns; the animals and the family's hands as
      designed in Blender. **H1a is Olov's:** art bible §2.5 says what to look at.
- **Stage 0c has begun** (3 October, branch `stage-0c-ghost`, stacked on `stage-0b-tiers`): the ghost's first
  model, before Stage 0b is finished, because Olov wanted the characters started.
  - It is built in Olov's Blender through the MCP server by `art/private/ghost/ghost.py`. Its four pictures
    stand beside it in the scene as reference images: the two photos of the carving, the render and the poster.
  - Five rigid parts, each with its origin where it pivots: the body with the bag and the two eyes, two arms and
    two feet. The fists grip the bag's upper corners, as on the poster and the render. The ankle disc is plain.
  - Its colours are flat for now: 14 materials, which cost 26 draw calls. The baked 1024² wood texture of plan
    §5.6 replaces them, and brings the ghost down to one draw call per part.
  - **None of the ghost is committed.** The generator, the `.blend` and the export are in `art/private/`, and four
    renders (front, side, back, three-quarter) are in `docs/shots/_work/ghost/`. Git ignores both folders.
  - The game shows the ghost on the test course where its pack exists. `scripts/build-assets.mjs` also packs
    `art/private/baked/`, and the view asks the manifest before it loads `private/ghost`. In CI and on the public
    site the course has no ghost. The ghost turns towards Elof, sways and taps a foot.
  - **Not yet for the ghost:** Olov's verdict on the likeness, the wood texture, the split in the hem at the back,
    the two knife cuts above the bag, and the rest of its moves (waddle, hop, dance, point, grab).
  - **Elof's first model** (branch `stage-0c-elof`, stacked on `stage-0c-ghost`) is built the same way, by
    `art/private/elof/elof.py`, with his five pictures beside him in Blender: the player sheet, the siblings
    sheet, the poster and the two photos of his real clothes.
    - He is a doll of 19 rigid parts, each with its origin at a joint, and the parts are named after the joints of
      the animation library (`pelvis`, `spine_01`, `head`, `upperarm_l`, `thigh_l`, `calf_l`, `foot_l` ...), so its
      clips can drive him once they are retargeted. He is not skinned yet.
    - From his pictures: the spiky golden fringe swept up and forward, blue eyes, rosy cheeks and freckles; the
      light-blue pin-striped shirt with its band collar, placket, buttons and two chest pockets, sleeves rolled to
      the elbows; dark jeans rolled at the ankle; brown laced boots; the olive backpack with its leather patch.
    - His face is made of sticker meshes, as plan §5.6 says. Only the resting face exists.
    - In the game he takes the stand-in's place where the private pack has him. A walk, a run and a jump are
      posed in code (`poseDoll` in `src/render/view.ts`) until the library's clips arrive.
    - None of him is committed. His renders are in `docs/shots/_work/elof/`.
  - **The style is decided** (Olov, 3 October; `docs/art-bible.md` §1): Elof and the family are stylized cartoon
    characters, like his sheets and poster, "a Pixar, Unravel or Disney character". The ghost stays a carved
    wooden ghost. The first models were not good enough.
    - **Elof's third model** (`art/private/elof/elof.py`; the earlier two are kept beside it as
      `elof-v1-doll.py` and `elof-v2-toy.py`). Olov on the second: "the current version is too bad", he wants a
      "visually stunning design and style". The third is sculpted by script: forms fused with a voxel remesh,
      cut, smoothed and thinned out. He has eye sockets with lids, large blue eyes, a button nose, lips, ears,
      fingers, hair in swept tufts and a soft backpack. He is skinned on 15 bones named after the animation
      library's joints, painted on the vertices with shadow baked into the creases, 15,400 triangles, three
      materials. He is in the game on Olov's computer, and `src/render/view.ts` poses his bones. He reads as a
      stylized cartoon boy now. He is still short of the sheets: Olov has not judged him yet.
    - **What was researched:** how stylized characters are made (the art bible lists the principles and the
      sources), and two free CC0 bases. Quaternius' *Universal Base Characters* and *Universal Animation
      Library* are downloaded to `art/vendor/quaternius/` (ignored by git until a file from them is used). The
      free base pack holds only two muscular adult bodies, so it can't be Elof; its *Teen* and *Regular* bodies
      are in the paid version. The animation library's 65-joint skeleton and clips are there and unused so far.
    - **The ghost has not been redone yet.** Art bible §1.5 says how: the fuller sheet, sleeves and fists of
      the render and the poster, in bolder knife facets, with a painted wood texture.
  - **Elof costs 3 draw calls now** (he cost about 27). The ghost still costs 26, because every colour is its
    own material; its baked wood texture comes with its redesign.
  - **Not yet for Elof:** Olov's verdict, the library's skeleton and clips (the library has to be downloaded to
    `art/vendor/` first), the other nine expressions, and a skinned body if the joints show too much up close.
- **Stage 1 has begun** (3 October, branch `stage-1-candy`, stacked on `image-to-3d-decision`). Olov: "We need
  to continue working with the implementation of the games, we can improve the character design later". So the
  game itself is built in greybox while Stage 0b's look-dev and Stage 0c's characters wait.
  - **Part 1: the candy trail.** What you see: wrapped sweets float along the test course, in a low arc over
    the step, a high arc onto the block and a long arc across the ditch. Elof collects the ones he comes near,
    each flies into him, and the paper bag in the top left corner counts them and fills.
  - `ChapterData.candy` holds the trail (`src/content/chapters/testbana.ts` has 20). The simulation puts a
    candy in the bag when it is within 0.6 EL of Elof's middle (`CANDY_MAGNET`, plan §4.3), and nothing ever
    leaves the bag.
  - The whole trail is one instanced mesh, so it costs one draw call (`buildTrail` in `src/render/view.ts`).
    The bag is DOM: `src/ui/hud.ts`, with its markup in `src/ui/shell.ts`.
  - Tests: pickup, near misses and a candy that takes a jump (`tests/sim/candy.test.ts`); the trail's own
    rules (never more than 3 EL to the next candy, every candy within a jump of the ground); the robot
    collects all 20 at 30, 60, 120 and 144 Hz; the browser test reads the bag's number.
  - The robot now runs off a step down instead of jumping from it, as the trail shows. A player who jumps
    there flies over the candy just beyond; that is the player's choice, not a bug.
  - **Part 2: the glitter bubble.** What you see: the course has a chasm before the big candy. Miss the jump
    and a golden swarm of sparks gathers round Elof in the air, floats him back to solid ground in a second,
    and lets him try again. Nothing is lost.
    - A fall of more than 4 EL starts it (`FALL_LIMIT`), in the air, before he lands. While it carries him the
      stick and the buttons do nothing.
    - **Where it puts him** (`chooseSafe` in `src/sim/sim.ts`): where he stood half a second of ground time
      ago, which gives a runner about 1.75 EL for a new run-up. The plan says "the last spot where he stood
      for 0.5 s"; played in the browser, that sent a child who hops along far back, because he is hardly
      ever on the ground. So when that spot is more than 2.5 EL from where he last stood, or at another
      height, he is put where he last stood instead. Only ground under both his sides counts, so a corner
      he clipped on the way down is never chosen.
    - **Walking, he stops at the edge of a long drop** (`atEdge`); at a run he goes over, so a running jump
      needs no care. This is the session's reading of plan §4.2 ("walking, Elof never goes over an edge
      higher than 4 EL"); *Lugnt* will stop him at a run too. His looking down is not drawn yet.
    - The camera keeps looking at the ground he jumped from while he is over a long drop.
    - Tests: `tests/sim/bubble.test.ts` (the catch, the way back, a hopping child, a clipped corner, the
      edge, the camera); the robot crosses the chasm without a bubble; a player who never jumps it is carried
      back every time and loses nothing.
  - **Part 3: kerbs, slopes, ledges and hoses.** What you see: the course goes on past the chasm. Elof walks
    over a kerb and up a ramp, pulls himself up a wall, climbs a hose with his back to you, and at the cliff
    beyond it the Använd button says *Åk ner*: he slides down the other hose in a second.
    - **Steps** up to 0.3 EL are walked over (a small lift), **slopes** up to 45° are walked and stood on,
      and steeper ground slides him down. **A ledge** whose top is within 1.4 EL of his feet is grabbed and
      climbed in 0.4 s, from the ground or from a jump.
    - **A hose** (`ChapterData.climbs`) is taken hold of when he walks into it. Any push except down climbs
      up at 1 EL/s; down climbs down; Hoppa jumps off; at the top he steps onto the ledge.
    - **Använd** now has a word: the simulation says what it would do (`PlayerState.verb`), and the button
      shows the word from `sv.verbs` and is dimmed when there is nothing to use. *Åk ner* is the first.
    - Elof is in one of five states (`mode`): on his own feet, or carried by the bubble, up a ledge, on a
      hose, down a hose. Carried, the physics leaves him alone.
    - The camera stays on him on a hose. The ground is drawn thinner towards the camera, so a wall doesn't
      hide what stands beside it.
    - With `?debug`, `&at=x,y` starts Elof at that place: `?debug&at=34.5,1.51` is just before the wall.
    - Tests: `tests/sim/moves.test.ts` (22). The robot now plays as a player would: it runs up slopes and
      over kerbs, jumps only at walls and gaps, and presses Använd at a hose that leads on. It finishes the
      course with all 39 candies and no bubble at 30, 60, 120 and 144 Hz.
  - **Part 4: the lace and the swing.** What you see: after the hose, a gully too wide to jump, with a red
    ring over it. Near the ring the Använd button says *Kasta snöret*. The lace hooks on, Elof hangs from it
    and swings; pushing the way he swings takes him higher; Hoppa lets go, and he flies to the far side.
    - **The swing is a pendulum** under the hook (`swing` in `src/sim/sim.ts`), worked out in the simulation
      itself, not by the physics library: it is exact, the same on every device, and can be steered.
    - **On *Äventyr* he pumps.** From the ledge the swing starts at about 30° and reaches full height (65°)
      in about three swings. Letting go on the way up at full height lands; the window is about 0.3 s either
      side (a test measures it). Letting go at the bottom drops him in the gully, and the bubble brings him
      back.
    - **With *Hjälp med svingen*** (`SimOptions.swingHelp`) the swing pumps itself to full height in about
      two seconds, Hoppa is held until the next forward top, and the flight is steered to the hook's landing.
      It lands whenever Hoppa is pressed. The setting has no switch on the page yet: that comes with the play
      styles.
    - Up and down climb the lace. The lace can be thrown in the air too, which the swing chain (C1) needs.
    - After a swing he keeps its speed in the air unless he pushes against it.
    - The camera rests on the hook while he swings.
    - Tests: `tests/sim/lace.test.ts` (17). The robot pumps and lets go at full height and finishes the course
      with all 46 candies at 30, 60, 120 and 144 Hz; with help, a robot that only presses Hoppa lands too.
    - **Not yet for the lace:** the pull ring (*Dra*) and the pair of rings that ties a bridge; the lace's sag
      and its flight to the hook; the candy arc shown only while he swings.
  - **Part 5: the two play styles, the pause panel, saving, and big candy as checkpoints.** What you see: a
    pause button top right (Esc or P on a keyboard, Start on a gamepad). The panel has *Spela vidare*, the two
    styles as pictures, three switches and *Jag har fastnat*. Four big candies stand along the course; each
    gives a little jump and spins when Elof reaches it. Close the page and open it again: he is back at the
    last big candy with his candy and his style.
    - ***Äventyr*** is as before. ***Lugnt*** switches on *Hjälp med svingen* and *Lätta hopp*, and stops
      him at every long drop even at a run. Each switch can be changed on its own, and *Lugnare tempo* runs
      the game at 80% (`src/save/settings.ts`).
    - ***Lätta hopp*:** the chapter marks its jumps (`ChapterData.jumps`); running to a marked edge jumps by
      itself, and a jump he makes himself a little early is steered to the same landing.
    - **Big candy** (`ChapterData.checkpoints`): reaching one makes it the place he comes back to, and the
      game saves. *Jag har fastnat* asks with a ✓ and a ✕, and the glitter carries him to the last one.
    - **Saving** (`src/save/store.ts`, plan §6.9): `localStorage`, one index key and one key per player,
      written at every big candy, on pause and when the page is hidden. Loading drops what it doesn't know;
      a save it can't read is never written over, and the player is asked before starting over. So far it
      holds the settings, the chapter, the big candy and the trail candy collected.
    - On a keyboard ↑ and W no longer jump while he is on a hose or on the lace: they climb.
    - `dev/menus.html?show=pause` and `?show=stuck` show the panel without WebGL.
    - Tests: `tests/unit/save.test.ts` (10), `tests/sim/styles.test.ts` (11); a robot on *Lugnt* reaches the
      end by running, pressing Använd, and pressing Hoppa once on the lace; the browser test opens the panel,
      chooses *Lugnt*, loads the page again and finds the style and the candy saved.
    - **Not yet:** *Följ fingret*, the graphics level and more than one player. The title, the help
      level, music and the other switches came in Stage 2: see below.
  - **Part 6: a puzzle, with things on rails.** What you see: after the swing, a pit with a plank lying
    beyond it. The plank has a red ring: Använd says *Dra*, and the lace pulls it across the pit as a bridge.
    Then a block, too high to walk onto, in front of a wall that is too high to climb: Använd says
    *Knuffa*, two pushes take the block to the wall, and from its top he gets up.
    - **Things on rails** (`ChapterData.movers`, plan §4.2): each has its stops, and moves one stop for
      each Dra or Knuffa, with a little spring. The game moves them, never the physics, so nothing can end
      up somewhere unsolvable.
    - **The puzzle rules of plan §4.5:** at its last stop a thing stays for good (the commit point); before
      that it goes home when Elof is 10 EL away (the local reset); the save keeps only what is in place
      (the save rule).
    - *Lätta hopp* can mark a jump that needs a thing in place (`Jump.needs`): on *Lugnt* he gets onto the
      block and the wall by running, once the block stands there.
    - Tests: `tests/sim/movers.test.ts` (13). The robot pulls, pushes and climbs, and finishes the course
      with all 54 candies; on *Lugnt* it still presses Hoppa only on the lace.
    - **Not yet for puzzles:** the three hints and the helper (plan §4.6), a thing he rides or that tips
      (the seesaw), and the lace tied between two rings as a bridge.
  - **Part 7: an exciting sequence, and the camera's zones.** What you see: the course ends with a stretch
    where drops fall in six places, each to its own time. A shadow grows on the ground for a second before a
    drop lands. A drop that lands on Elof knocks him on his back for about a second; then he is up, with
    everything he had. A big candy stands before the stretch and one in the middle of it. The picture is
    wider here, at the climb and at the swing.
    - **Drops** (`ChapterData.drips`, plan §4.7 E1) keep time by the simulation's steps, so the rhythm is the
      same on every device. On *Lugnt* a drop misses him while he moves (`SimOptions.gentle`).
    - **Camera zones** (`ChapterData.cameras`): a stretch can widen the picture, lift it, or change how far
      ahead it looks. `cameraIntent` now also says how wide the picture should be.
    - Tests: `tests/sim/drops.test.ts` (10). The robot reads the shadows, waits where a drop would land on it
      and runs through when the way is clear: no drop lands on it at 30, 60, 120 or 144 Hz. A player who runs
      straight through is knocked over now and then and still arrives with every candy.
    - **Not yet:** the splash. (The bubble that goes back to the last big candy came with the cones of
      Kapitel 2.)
  - **Stage 1's list is built** (plan §7.3): the controller, the glitter bubble, the lace and the swing in
    both modes, the candy trail, the camera, one puzzle, one exciting sequence, both play styles and the
    robot. **What is left of Stage 1 is H2:** Olov's own twenty minutes on touch, in greybox. See "Next".
  - **Not drawn yet:** Elof's poses for climbing, hauling, pushing and looking down; the lace's sag. The
    numbers in `src/sim/constants.ts` are starting values, to be tuned from H2.
- **Stage 2 has begun** with what needs no art (Olov, 3 October: "I want the full game plan implemented").
  - **Sound effects** (branch `stage-2-sound`; plan §5.8, §6.8). What you hear: steps, a jump and a landing,
    candy that steps up a scale when collected in a row, a chime at a big candy, the glitter bubble, the
    lace, letting go, hauling up a ledge, the slide, a drop's splash and the knock when it lands on him,
    wood knocks when a thing moves on its rail, and a little fanfare at the end. The pause panel has a
    *Ljud* switch.
    - Every effect is made in code (`src/audio/audio.ts`), so sound costs no download. There are no voices
      and no recordings.
    - Which sound a moment asks for is worked out from two looks at the game a frame apart
      (`src/audio/cues.ts`), with no audio in it, so it is tested without ears (`tests/unit/cues.test.ts`).
    - Sound starts with the first tap, click or key, and an iPhone's silent switch silences it.
    - **No one has listened to it.** The session can't hear. The levels and the tunes are a first guess for
      Olov's ears; say what is too loud, too shrill or missing.
    - Music, ambience, footsteps per surface, the characters' wordless sounds and *Ljud även i tyst läge*
      came later: see "Music and the air of each place" below, and the entries after it.
  - **The ghost keeps its distance** (branch `stage-2-ghost`; plan §4.2, §4.5). What you see: the ghost is
    on the course from the start, always a little ahead. It stands and taps its foot until Elof comes
    within 4 EL, then hops on to its next place in an arc. After the swing it lets him come close: Använd
    says *Ta!*, it gets away, and five candies it drops pop out. At the end it is gone.
    - The chapter lists the ghost's places (`ChapterData.ghost`). It hops faster than Elof runs, so the
      chase can't be won early, and it only ever waits, so the chase can't be lost.
    - **A stand-in ghost** built in code (pale wood, two eyes, the bag, red shoes) plays its part on the
      public site. The carved one from the private pack takes its place where that pack exists.
    - **Flags** say what has happened in a chapter, and are saved. A candy can wait for a flag
      (`Candy.after`), and so can the ghost (`GhostPerch.until`).
    - **Things to use** (`ChapterData.spots`): a place where Använd does one thing once and sets a flag:
      *Vänd*, *Ta* or *Ropa*. No chapter has one yet; the ladybird's lever, the star and "Ropa på Moa" will.
    - Tests: `tests/sim/ghost.test.ts` (13).
    - **Not yet:** the ghost's bubbles and its dance, the ghost as helper, and its story beats.
  - **Kapitel 1, Gården, in greybox** (branch `stage-2-garden`; plan §3.4). **Open it with `?dev`:**
    `https://olovmelander.github.io/spokets-godisbus/?dev`. Without `?dev` the page still shows the test
    course, because no chapter is released (`RELEASED_CHAPTER` is still `null`).
    - What you play, from the left: the deck with its steps and the lifted board; the ladybird, whose lever
      Använd turns (*Vänd*), and the hose it then shows, down which he slides; under the deck, the lace on a
      nail, one swing over flat ground and one over the drain gully; the dandelion where the ghost can
      nearly be caught; the birch's roots and a boulder; the dew rain; Pappa's shavings, one curl pulled
      down as a step and one pushed across the gap at the top; the ghost on the birch root; Moa, and
      *Ropa på Moa*: her paper plane carries him over the hedge to the forest's edge, where up and down
      steer towards the candy. Then the card: *Kapitel 1 klart!* with the candy in rows of ten.
    - It is 210 EL long, with 116 candies and eleven big candies. **It is ground, candy and rules only:** it
      looks like the test course. What it looks like comes with the look-dev and the characters.
    - **New for it:** bubbles for what is said (`ChapterData.beats`, shown by `src/ui/hud.ts`; the game has
      no voices), rides that can't fail (`ChapterData.rides`), a hose that waits for a flag
      (`Climb.needs`), a glint over each thing Använd can act on, the end card with *Spela igen*, and the
      list of courses (`src/content/chapters/index.ts`: `?course=testbana` or `garden`, and `?dev`).
    - Four lines are said: Pappa's two at the start, Elof's at the birch root and Moa's. They are in
      `src/content/sv.ts` for Olov to read aloud before a release.
    - Tests: `tests/robot/garden.test.ts` (10). The robot plays the chapter from the deck to the forest's
      edge at 30, 60 and 144 Hz with no bubble and no knock, and leaves at most six candies; on *Lugnt* it
      is played by running and Använd, with Hoppa only on the lace. The robot is now shared between the
      courses (`tests/robot/robot.ts`).
    - **The title and the first start** (branch `stage-2-title`; plan §6.10). A chapter now starts behind
      the title: the game's name and **Börja**, or **Fortsätt** and *Börja om från början* when there is a
      saved game. Börja asks *Hur vill du spela?* with the two styles as pictures, and choosing one starts
      the game. On a phone held upright, a picture of a phone turning says *Vänd skärmen på bredden!* The
      test course and a `?debug` session start at once, as before. `dev/menus.html?show=title`, `saved`,
      `styles`, `end` and `bubble` show the new screens without WebGL.
    - **Not built yet in Kapitel 1:** the prologue before it; the swing chain (C1); the lost things under
      the deck; the dew bells; memory 1 at the shavings; the ghost as helper at the gully and its bubbles;
      the family as giants (Moa's hand, Pappa's); the ghost at the forest's edge; stickers and Moa's map on
      the end card. The lengths and the timings are a first guess: the chapter takes the robot about two
      minutes, and the plan asks for 18 to 22 for Elof.
  - **Kapitel 2, Granskogen, in greybox** (branch `stage-2-granskog`; plan §3.4). **Open it with
    `?dev&course=granskog`**, or play Kapitel 1 with `?dev` to its end: its card now has *Nästa kapitel*.
    - What you play, from the left: the forest floor with a root and a big cone; a lingonberry to pick
      (*Plocka*) and the jay to give it to (*Ge*), which shows the beard lichen up the high root; the twig
      across the ants' road, pulled away with the lace, and the ants' lift up their hill (*Åk med myrorna*);
      the vittra door, where Elof says "Spöket ger bort mitt godis!?"; the root down; **the cone avalanche**;
      *Ropa på Pappa*, the big cone pushed to the seesaw, *Ställ dig här*, and the flight across the ravine;
      the fallen log where the ghost can nearly be caught; *Ropa på Bertil* and his cap across the pool, with
      "Heja lillebror!"; and the ghost in the eddy, pulled up with the lace. It leaves one candy on the
      stone, Elof says "Spöket tackade mig!", and from then on it waits for him close by.
    - It is 204 EL long, with 103 candies and twelve big candies. Ground, candy and rules only, like
      Kapitel 1.
    - **The cone avalanche** (`ChapterData.rollers`, plan §4.7 E2): touching the loose cone at the top of the
      slope sets it off. That cone rolls away ahead, and from then on one comes from behind every 1.8 s. A
      jump lets it pass under. One that reaches his legs bowls him into the glitter bubble, which takes him
      to the last big candy; two big candies split the slope, and it has one gap to jump. On *Lugnt* a cone
      misses him as long as he runs.
    - **New for it:** a thing on a rail can wait for a flag (`Mover.needs`) and sets `placed:<id>` when it is
      in place, so a chapter can build on it; a thing that is used by coming close (`Spot.touch`); *Ge*; a
      ride with a narrow corridor (`Ride.corridor`); a thing that only rises can be pulled from either side;
      water that is drawn only (`ChapterData.water`: to the simulation a pool is a pit); the chapters in
      their order (`STORY` in `src/content/chapters/index.ts`), and a saved game that remembers its chapter.
    - **Two faults in the picture were found and mended:** the ground's outline crossed itself where a pit
      went deeper than 12 EL below zero, and the background trunks floated where the ground was low.
    - Tests: `tests/robot/granskog.test.ts` (7) and `tests/sim/rollers.test.ts` (10). The robot plays the
      chapter at 30, 60 and 144 Hz with no bubble and no cone reaching it, and leaves one candy; on *Lugnt*
      it never presses Hoppa. The robot now jumps a cone that comes from behind, and where a running jump
      would land in the gap it stands and jumps on the spot.
    - **Not built yet in Kapitel 2:** the anthill's outside (C2); memory 2; tasting a lingonberry; the jay
      as a companion; the small cone that launches him too low; the current in the pool; the ghost's
      picture bubbles (the small figure, the mountain); Pappa's and Bertil's hands. The cap is drawn as
      Kapitel 1's paper plane, and the seesaw is not drawn at all. The robot needs 68 seconds; the plan asks
      for 15 to 20 minutes for Elof.
  - **Kapitel 3, Myren, in greybox** (branch `stage-2-myren`; plan §3.4). **Open it with
    `?dev&course=myren`**, or play on from Kapitel 2's end card with `?dev`.
    - What you play, from the left: the bog's edge and **the tussocks**, with open water between them;
      further out **the pale tussocks that sink** while he stands on them, in two runs with a firm island
      and a big candy between; *Ropa på Mamma* at the wide pool, and the dead pine rises across it as a
      bridge; *Ropa på Mamma* at the boardwalk, and he climbs her braid; on top she says "På myren går vi på
      spången."; the ramp down to **the lollipop** (*Ta lysklubban*): the mist rolls in, he holds the light
      up, and the trail shows again; a **crane chick** on a tussock, which follows his light to where rings
      rise from its family; the ghost, which lets him come close; and the crane (*Kliv upp*), which carries
      him up onto the hill.
    - It is 197 EL long, with 97 candies and ten big candies. Ground, candy and rules only.
    - **Water** (`ChapterData.water`) is now known to the simulation: the glitter bubble catches him just
      above the surface, so he never touches it. Walking, he stops at its edge.
    - **Soft tussocks** (`ChapterData.tussocks`, plan §4.7 E3): one sinks 0.45 EL in 1.8 s while he stands
      on it and rises again in 0.8 s when he has left. Sunk, the bubble takes him to the last firm ground:
      a soft tussock is never where he is put back. A runner hardly sinks one. On *Lugnt* they sink only
      while he stands still.
    - **New for it:** a thing a helper's hands move (`Mover.on`: it goes to its place when its flag is set,
      and Använd never moves it); the mist and the light he carries (`ChapterData.mist`); someone small
      who follows him (`ChapterData.follower`, the picture only: the flags come from things he touches).
    - **Gate 6 was not holding in a long chapter, and now does:** a shader was compiled the first time the
      camera reached a material it had not shown yet (the water, 150 EL in). The first frames now draw the
      whole chapter, in view or not, and again when a model arrives (`render` in `src/render/view.ts`).
    - Tests: `tests/sim/bog.test.ts` (11) and `tests/robot/myren.test.ts` (13). The robot plays the chapter
      at 30, 60 and 144 Hz with no bubble and no tussock sinking under it, and takes every candy; on *Lugnt*
      it never presses Hoppa; a player who stops on every soft tussock is carried back seven times and still
      arrives with the candy.
    - **Not built yet in Kapitel 3:** the tussocks' dip under his feet (P11's feel); cranberries; Mamma's
      mug and her lamp behind him; the lyktgubbar and their game (C3); the rings as something to follow
      (the chick's way home is straight ahead here); memory 3; the ghost's picture bubble; the cranes'
      dance; the jay. The lollipop is drawn only once he holds it, and the crane as Kapitel 1's paper
      plane. The robot needs a minute; the plan asks for 12 to 15 for Elof.
  - **Kapitel 4, Berget, in greybox** (branch `stage-2-berget`; plan §3.4). **Open it with
    `?dev&course=berget`**, or play on from Kapitel 3's end card with `?dev`.
    - What you play: the chapter begins on the crane's back. It carries him over the valley and up to the
      mountain's shoulder in fourteen seconds; up and down steer through the candy, and with no hand on the
      stick it still lands. Then two granite slabs to pull himself up; five round cobbles that each ring a
      note; **the gusts** across the open granite; the ghost stuck below the last cliff, where Använd says
      *Lyft* and the lace then comes down for him to climb; and the old pine, where Elof says "Spöket vill
      hämta hem min trägubbe!"
    - It is 157 EL long, with 60 candies and five big candies. Ground, candy and rules only.
    - **Gusts** (`ChapterData.gusts`, plan §4.7 E4): one blows for 1.4 s every 4 s, and pale streaks show
      for a second before it. In a boulder's lee it passes him by. In the open it takes him back to the
      last boulder at 5 EL/s, whatever the stick says. Nothing falls. On *Lugnt* it only slows him to half
      his speed.
    - **New for it:** a ride that begins by itself (a `Spot` with `touch` and a `ride`); a ride he had not
      finished when the game was saved begins again (before this, a game saved in the middle of Moa's plane
      or Bertil's cap came back with the ride used up and no way across); a hose that waits for a flag is
      now let down in the picture only when the flag is set (the lichen, the braid, the lace); two new
      sounds, a stone's note and a gust.
    - Tests: `tests/sim/gusts.test.ts` (11) and `tests/robot/berget.test.ts` (12). The robot plays the chapter
      at 30, 60 and 144 Hz with no bubble, waits in each boulder's lee so that no gust catches it, and takes
      every candy; on *Lugnt* it never presses Hoppa; a player who never waits is taken back by the gusts
      and still arrives with everything.
    - **Not built yet in Kapitel 4:** what lies below the flight (the forest, the brook, the bog, the bell
      tower at 18:00, the red house, the four headlamps and the jay); the summit cairn (C4); memory 4; the
      ghost's picture bubble of the lonely trägubbe; the ghost shown being boosted up. The crane is drawn as
      Kapitel 1's paper plane. The robot needs under a minute.
  - **The final, Norrsken, in greybox** (branch `stage-2-final`; plan §3.4). **Open it with
    `?dev&course=norrsken`**, or play on from Kapitel 4's end card with `?dev`.
    - What you play, on the summit by the old pine, every step with Använd: *Sänk snöret* at the crack,
      then *Dra* twice, and the first trägubbe stands on the rock; *Plocka* a crowberry, and *Måla ögon* on
      the figure; *Ta påsen* from the ghost; then **Dela godiset**: *Ge trägubben*, *Ge spöket* and *Ge
      lavskrikan*, in the order he likes; *Smaka* the golden candy: night falls, the northern lights flare,
      and Pappa says his line in four bubbles; and *Gå hem*, the walk down that can't fail. The card says
      *Finalen klar!*
    - It can't be walked past: the summit ends in the mountainside. Walking, he stops at the edge; a runner
      is brought back by the glitter bubble. The crack is too narrow to fall into.
    - **New for it:** a flag that is set once several others are (`ChapterData.sets`: he has shared with
      everyone); night and the northern lights (`ChapterData.night`); a part of the story with a name
      instead of a number (`sv.end.named`).
    - **A fault mended:** on the last chapter built, the end card showed *Nästa kapitel* although there was
      none, and the button did nothing.
    - Tests: `tests/robot/norrsken.test.ts` (11). The robot plays it at 30, 60 and 144 Hz: it now taps
      Använd as a player does, walks back to a thing it can use behind it, and walks over a narrow crack.
    - **Not built yet in the final:** which candy each friend gets (he chooses only whom, and in which
      order: the plan's "tap a candy, then a friend" needs its own screen, shared with the epilogue's party);
      Elof growing back; the trägubbe's blink; the ghost setting the figure by the pine; the headlamps, the
      family, Moa's jacket and Bertil's cap; the two carvings in his hands on the way home. The way home is
      drawn as Kapitel 1's paper plane.
  - **The prologue and the epilogue, in greybox rules and a first room** (branch `stage-2-ends`; plan §3.4).
    **The whole story now plays from its first scene to its last:** `?dev` starts at the prologue, and each
    card leads on. Or `?dev&course=prolog`, `?dev&course=epilog`.
    - **Prolog, Lördagsmorgon:** Mamma says "Den får du öppna ikväll."; *Måla ögonen!* on the new ghost; it
      takes the bag and runs, and only then is there a candy trail; over the door sill to the veranda; the
      star, *Ta*, which carries him over the step that has become a cliff. The card says *Lördagsmorgon*.
    - **Epilog, Godiskalaset:** *Ge Mamma*, *Ge Pappa*, *Ge Moa*, *Ge Bertil* and *Ge spöket*, in the order
      he likes; the ghost hops ("Klonk, klonk!") and Elof says "Du ska heta Klonk!"; *Ta kniven*, three
      strokes with *Tälj*, *Måla ögon*, with Pappa's "Alltid bort från kroppen." and Elof's "Jag kan tälja!";
      *Borsta tänderna*, and up to bed. The card says *Slut*, with the plan's last words: "Klonk kunde inte
      säga det med ord. Men Elof förstod."
    - Neither can be walked past: a step or the stairs is a wall that only the last thing done carries him
      over.
    - **The ghost is "spöket" everywhere until that bubble:** a test reads every line and every word on the
      button for the name.
    - A new place, *home* (`place: 'home'`): floor boards, a pale panelled wall and windows; in the evening
      dim and warm, with the northern lights in the windows.
    - Tests: `tests/robot/ends.test.ts` (16).
    - **Not built yet:** everything that makes these two scenes what the plan describes. In the plan Elof
      is at his normal size in both, and he shrinks with a POFF at the star: here he is the size he always is.
      Also: Pappa's hands and the shelf with its empty place, the brush and the knife traced by hand, the
      blink, the bag tearing, Pappa on the deck, which candy each one gets, the figure on the windowsill,
      and *Utforska vidare*. The album credits were added on 4 October (see State above).
  - **The helper and its three hints** (branch `stage-2-helper`; plan §4.6). What you see: a small button
    with a bird, under the pause button (H on a keyboard, Y on a gamepad). Press it and a bird flies to the
    next thing to do and looks at it. Press again: it knocks on it, and Använd shows that thing's word and
    pulses, in reach or not. A third time: a pale figure stands where Elof should stand. It leaves when he
    has done it, or after twelve seconds. It has no words.
    - **What it shows** (`src/sim/help.ts`) is worked out from the game as it stands: the thing in reach;
      else the first thing along the way that can be done now (a thing to use whose turn has come, a thing
      on a rail not yet in place, a hook not yet swung past); else, where nothing of that kind is within
      12 EL, the next candy of the trail. It can't point at something done, or not yet possible.
    - **Help levels:** *Bara när jag frågar* (Äventyr), *Påminn mig* (Lugnt: it comes once, to look, after 40 s
      with nothing happening), *Guida mig* (it comes after 30 s and knocks). The level is saved with the
      player, and the pause panel has its three choices (they came with Moa's map).
    - Tests: `tests/sim/help.test.ts` (15). All through the story, wherever Använd offers something, the
      helper shows that same thing and word; and it always has something to show until a chapter ends.
    - **Not yet:** in Kapitel 1 the helper should be the ghost itself, with its one visit at the gully (it is
      the bird everywhere now); the third step as a replay of Elof doing the thing; the helper's portrait as
      the button; the goal as a picture in the pause panel.
  - **Hidden candy and its stickers** (branch `stage-2-stickers`; plan §4.3). What you see: in each of
    Kapitel 1 to 4, four bigger sweets hang off the trail, each inside a turning golden ring: behind Elof at
    the start, or high over a boulder, a cone, a slab. Jump to one and its sticker slaps onto the bag, its
    name is said at the top ("Ny sort: Skumbanan!"), and a little run of notes plays. A chapter's card shows
    its four: a sticker for each one found, an empty ring for each still out there.
    - Sixteen kinds with plain names of sorts (`sv.kinds`, `src/content/kinds.ts`). A found one is the flag
      `found:<kind>` in its chapter, so the save already keeps it, and the album is read from the flags of
      every chapter.
    - Tests: `tests/unit/kinds.test.ts` (7): four per chapter and each in its own; each can be reached by a
      jump where it hangs, and is not found by walking under it; none lies on the trail.
    - **Not yet:** real hiding places (behind leaves, under roots: they come with the art, and one of the
      four belongs at the end of each challenge route); each kind as its own small model; the album as a
      page of its own; the golden geléhallon as the last piece.
  - **Moas karta, and the help level's switch** (branch `stage-2-map`; plan §4.9, §4.6). What you see: in
    the pause panel and on every card of the story, a crayon map of the route: Hemma, Granskogen, Bäcken,
    Myren, Berget. A place is drawn in when Elof reaches it; a little Elof stands at "Här är du"; the ghost is
    drawn on the blank paper where it is heading. That is the goal as a picture, which never says how.
    - It is drawn in code (`src/ui/map.ts`), from the part of the story being played. Nothing in it is taken
      from a real map.
    - The pause panel now has the help level: *Bara när jag frågar*, *Påminn mig*, *Guida mig*.
    - Tests: `tests/unit/map.test.ts` (5).
    - **Not yet:** a star for each challenge route; blank paper with "Här ritar Moa fortfarande …" for
      unreleased places (with `?dev` every place is reachable); the map as chapter select after the ending.
  - **The opening scene tells the story now** (branch `stage-2-prolog`; Olov asked: "are we going to improve
    the starting scene that explains the story and everything?"). `?dev` starts there.
    - **Elof is a boy at home:** he is drawn three times his usual size beside the small new ghost. On the
      wall is **Pappa's shelf: six figures in a row, and a pale empty place first in the row.** Shavings lie
      about, and the Saturday bag stands beside the ghost until the ghost takes it. Mamma's sign is in the
      doorway.
    - **The POFF:** at the star he shrinks in a swarm of glitter while it carries him over the step, and the
      picture closes in at the same time, so the world grows around him. In the final he grows back at the
      golden candy; in the epilogue he is a boy all through, and the first trägubbe is back on the shelf.
    - Three new things a chapter can say for the picture: `size`, `shelf` and `decor`. The simulation knows
      nothing of them: there he is always one Elof length.
    - **The blink** (branch `stage-2-blink`): the eyes take two presses, one for each. Then Elof stands and
      watches for 2.6 seconds while **the ghost looks at the empty place on the shelf, and then at the bag**:
      a dotted line goes from its eyes to a ring that pulses there. Then it takes the bag and runs, and the
      trail begins. A chapter can now have a beat that takes time (`later`, with `hold` while he watches)
      and a look (`glance`). No beat that holds him may be longer than three seconds: a test says so.
    - **Not yet, and what the scene still needs most:** people. Pappa's hands blowing the shavings off,
      Mamma in the doorway and Bertil's hand at the bag are signs or nothing; the eyes are pressed, not
      traced; the ghost doesn't turn its head. The table is the floor.
  - **The four memories** (branch `stage-2-memories`; plan §2.4, §3.3 rule 5). What you see: in each of
    Kapitel 1 to 4 a glowing curl of shaving lies on the path. Touch it and the game waits while three or
    four sepia pictures play in an oval, like paper cut-outs, with no words. A tap goes on to the next.
    - **Memory 1** (on Pappa's shavings): Pappa carves a small figure at the table while little Elof watches;
      he gives it to him; little Elof's face beside the smiling figure. **Memory 2** (after the log): the
      autumn walk; the figure on a stump with a raspberry jelly in its lap, and one for himself. **Memory 3**
      (where the ghost waits in the bog): the family on the boardwalk towards the mountain, little Elof on
      Pappa's shoulders holding the figure up to see. **Memory 4** (at the old pine): the figure on the rock;
      the gust and the crack, with Pappa reaching; little Elof's last jelly at the edge; the figure alone in
      the dark, smiling. Elof's line "Spöket vill hämta hem min trägubbe!" now comes after this one.
    - **They are stand-ins.** The plan's memories are animated scenes with the family's models, growing out
      of the ghost's picture bubble. These are pictures drawn in code (`src/ui/memory.ts`): a big figure with
      a flat cap is Pappa, a small one in light blue with a spiky fringe is little Elof, one with a braid is
      Mamma. Nobody is drawn as themselves.
    - Tests: `tests/unit/memory.test.ts` (6): one in each numbered chapter, on the path; the robot touches
      each; six to ten seconds; no words; the little figure in every one.
    - **For Olov:** the plan has Pappa read the storyboard of the memories before the first one is built
      (question 1 below). These cards are that storyboard, playable. Show them to him.
  - **Music and the air of each place** (branch `stage-2-music`; plan §5.8, §6.8). What you hear: a tune
    on a plucked string from the first tap on, and behind it the place's own air. The pause panel has a
    *Musik* switch beside *Ljud*.
    - **The tune** is "Spökets polska" (the plan's working title): eight bars in 3/4 in D dorian, written
      for the game as notes in `src/audio/music.ts`. Nothing is recorded, licensed or downloaded: the string
      is made in the browser by Karplus–Strong (the plan's Route A).
    - **Each part of the story plays it in its own way** (`ARRANGEMENTS`): the prologue as a solo pluck with
      a knife's stroke in every second bar; Gården quick, with bass; Granskogen only the tune's bones, an
      octave down; Myren fewer notes still and long rests; Berget the whole theme; the final all of it with
      knocks of wood; the epilogue as a slow waltz. The tune rests one to four bars before it comes again.
    - **The chase layer:** while the ghost is within nine Elof lengths, wood knocks on the first and third
      beat, starting and stopping on a bar line.
    - **The air** (`AIRS`): a clock in the kitchen; small birds in the garden; wind in the spruces and one
      far bird; a crane and a small bird over the bog; wind on the mountain; an owl at dusk. All synthesised,
      all quiet. *Ljud* switches it off with the effects.
    - Three buses now: music, effects and ambience, then the master and the compressor. Sound sleeps while
      the page is hidden.
    - Tests without ears (`tests/unit/music.test.ts`, 15): the string is in tune within 0.4 % at every
      pitch used and at both sample rates, rings and dies away, and is the same every time; every bar is
      three beats; every note is in the scale; every part of the story has an arrangement and the test
      course none; a whole round mixed at the game's level never clips. The browser test hears two bars
      scheduled in the prologue.
    - **No one has listened to it.** The session can't hear, so the tune was written by rule: small steps,
      its weight on the first and third beat, home on D. Whether it is a good tune, and whether the levels
      are right, only Olov's ears can say. If it is wrong, the notes are one table (`POLSKA`) and the
      level one number (`MUSIC_LEVEL`).
    - **Not yet:** the fiddle lead, the pad, the jaw harp and the horn; a three-note motif for each family
      member; the solo line over a memory; silence before a reveal; separate volume sliders (the switches
      are on or off); recorded ambience.
  - **Footsteps for every surface** (branch `stage-2-steps`; plan §5.8). What you hear: his steps and his
    landings sound of what he walks on. A hollow knock on the deck and the boardwalk, almost nothing on
    moss, a swish in grass, a wet squelch in the bog, a click on stone, grit on the dry earth under the
    deck, and a rustle in Pappa's shavings.
    - What the ground is comes from the chapter: its place's own ground, and the stretches it marks out
      for the picture (`surfaces`), so the sound and the picture can't disagree (`footingAt` in
      `src/audio/cues.ts`). The test course has no place and keeps its plain step.
    - Tested without ears (`tests/unit/cues.test.ts`). **No one has listened to it.**
  - **The sticker album** (branch `stage-2-album`; plan §4.3). What you see: the pause panel has a page,
    *Godisalbumet*, under Moas karta: sixteen places in four rows, one row for each chapter. A kind he has
    found is a sticker in its colours with its name; one still out there is an empty ring with a question
    mark, so the names stay a surprise. Above them: "3 av 16 sorter".
    - It is read from the save, like the stickers on the bag (`album` in `src/content/kinds.ts`), and drawn
      by `src/ui/album.ts`. A course outside the story has no album. Tests: `tests/unit/album.test.ts` (3).
    - The photos and album credits were added on 4 October (see State above). **Not yet:** the golden
      geléhallon as its last piece.
  - **Four more switches** (branch `stage-2-settings`; plan §4.1, §6.8). What you see, in the pause panel:
    - *Vänsterhänt*: Hoppa and Använd move to the left side, and the stick to the right.
    - *Större text*: what is said, the words on the buttons and the panels, about a quarter bigger.
    - *Mindre rörelse*: the bag doesn't bounce, a sticker doesn't slap on, Använd doesn't pulse, and a
      memory's pictures don't grow in. A device that asks for less motion gets the same. **It calms the
      menus and the HUD only:** the camera and the world move as before.
    - *Ljud även i tyst läge*: an iPhone's silent switch no longer silences the game. *Lugnt* starts
      with it on, because its sounds carry what a younger player can't read; *Äventyr* respects the switch.
    - Choosing a style keeps the player's own switches (tempo, sound, music, left-handed, text, motion) and
      sets the style's (`OWN_SWITCHES` in `src/save/settings.ts`). All of them are saved with the player.
    - Tests: `tests/unit/save.test.ts`, and the browser test switches on *Vänsterhänt* and finds it saved.
    - **Not yet:** *Följ fingret*, volume sliders, the graphics level, the key reference, and more than
      one player. *Ljud även i tyst läge* has not been tried on an iPhone.
  - **Wordless sounds** (branch `stage-2-babble`; plan §5.8, §0 Q9). What you hear: when someone's line
    comes up in a bubble, a few syllables in their own voice, never a word: Pappa low and slow, Mamma
    gentle, Elof bright, Moa quick, Bertil two small notes. The ghost has no voice: it knocks, wood on
    wood, when it "speaks" and each time it hops on to its next place, louder the nearer it is. The
    helper knocks twice when it shows him something.
    - The voices are a table of pitches (`VOICES` in `src/audio/cues.ts`), played as plain tones. Nothing
      is recorded and nothing is speech, real or synthetic: the rule in plan §0 Q9 stands.
    - Tested without ears (`tests/unit/cues.test.ts`). **No one has listened to it.**
    - **Elof's own sounds** came after (branch `stage-2-elof-sounds`): a gasp as the glitter bubble takes
      him, and a giggle at a big candy and at the first bounce on a cranberry. In his voice from the table
      above, without a word.
    - **His call, and the answer** (branch `stage-2-call`): when he calls someone at their sign, he calls in
      two notes, and that one answers in three notes of their own: Mamma's rise, Pappa's fall, Moa's leap
      and come back, Bertil's say one note twice and jump (`MOTIFS` in `src/audio/cues.ts`; plan §5.8).
  - **Chapter codes** (branch `stage-2-codes`; plan §6.9, and a MUST in §7.4). What you see: the card at a
    chapter's end shows three words under *Nästa kapitel*, "Kod till nästa kapitel: GRAN KOTTE MOSSA". On
    the title, *Jag har en kod* opens a field; the right three words open that chapter's start, on any
    device. So a game begun on the tablet can go on on the phone, and a save a browser has lost is not the
    end of the story.
    - Six codes, one for each part after the prologue; the words are in `sv.codes`. Small letters, commas,
      another order and a keyboard without å, ä and ö are all right. A wrong code says "Den koden finns
      inte. Titta på kortet en gång till!"
    - A code holds the chapter only: no candy, no stickers. On a device that has a save, what it holds of
      the other chapters is kept.
    - Tests: `tests/unit/codes.test.ts` (5), and the browser test types a wrong code and a right one, and
      reads the code off Kapitel 1's card.
    - **When a chapter is released** (`RELEASED_CHAPTER`): a code must not open a chapter that is not
      released. Today the story is only played with `?dev`, where every part is open, so there is no such
      check yet. Add it in the PR that makes the plain address play the story.
  - **C1, the swing chain** (branch `stage-2-c1`; plan §4.7). What you see: under the deck in Kapitel 1,
    two more red rings hang high under the joists, out of reach from the ground. From the first swing he
    can let go on the way up and press Använd again in the air: the lace takes the next ring, and then the
    next. At the top of the third swing hangs a hidden candy, the gummibjörn. From there the crossing's
    own ring is in reach and takes him over the gully. It is the first of the plan's four challenge routes.
    - **A rule changed for it:** in the air, the hook he just let go of is not offered again until he has
      landed. Before, Använd in the air took the same hook straight back, so a chain could not be played.
      Every earlier test still passes.
    - **Missing costs nothing:** he lands on the ground under the chain, or the glitter bubble carries him
      back from the gully, and a candy he has found he keeps.
    - The chain is not on the way on: the helper never points at it (`extra` on a hook), and the robot
      plays Kapitel 1 without it. It is for *Äventyr*: with *Hjälp med svingen* the first swing is steered
      to its landing, so the chain can't be entered from it.
    - The deck overhead was raised from 5.4 to 5.95 EL, level with the deck he came from, so that the
      chain's rings sit at the joists.
    - Tests: `tests/sim/chain.test.ts` (7): three swings find the candy when he lets go anywhere between
      0.7 and 0.9 radians; a fourth, on the crossing's ring, lands him past the gully; the ordinary way and
      a jump from the ground don't find it; a fall after the candy keeps it.
    - **For H2:** whether a seven-year-old finds the timing fun or fiddly is for Olov to feel and for Elof
      to show. The numbers are two hooks and one candy in `src/content/chapters/garden.ts`.
    - **Not yet:** C2 (the anthill), C3 (the shy lights) and C4.
  - **O7, the bouncing cranberries** (branch `stage-2-berries`; plan §4.8). What you see: two shiny red
    cranberries lie at the edge of the bog, where Kapitel 3 begins. Coming down on one sends him up twice
    as high as he jumps, with a boing, and the berry goes flat and springs back. At a run, a bounce on the
    first carries him onto the second. Walking into one does nothing: it is a toy, and nothing needs it.
    - A chapter can now have `bouncers`. The bounce is the same whatever Hoppa does, and from its top he
      falls less than the glitter bubble's limit. They lie on level firm ground, with nothing to bounce up
      onto: a test says so. Tests: `tests/sim/berries.test.ts` (7).
    - **Not yet:** the other optional delights of plan §4.8: the vittra door (O3), and tasting a
      lingonberry (O10).
  - **O1, Daggklockspelet** (4 October, branch `stage-2-dew`; plan §4.8). What you see: on the lawn in
    Kapitel 1, between the birch's roots, four drops of dew hang at the tips of bent blades of grass, each
    as big as his head. A hop up to one rings it, each a step higher than the last, and it shines from then
    on. When the fourth has rung, the top of the screen says "Hela gräsmattan glittrar!" with the find's
    chime. Walking under them leaves them silent.
    - They ring through the same rule as the beach cobbles on the mountain (`note:` flags). Tests:
      `tests/sim/dew.test.ts` (3).
    - **Not yet:** the plan's whole toy: the drops ring once each, in any order, and the lawn's glitter is
      a line and a chime, not a picture.
  - **O2, Hittegods** (branch `stage-2-lost`; plan §4.8). What you see: under the deck in Kapitel 1, four
    foundation stones each hold a small thing that has fallen between the boards: Bertil's marble, Moa's
    hair clip, a toy brick and a coin. A jump takes one, and the top of the screen says "Du hittade något:
    Moas hårspänne!" Walking past leaves it. The pause panel lists them under the album, *Hittegods*, with
    a question mark for each one still lost.
    - They are saved with the chapter, like the hidden candy (`src/content/lost.ts`). The toy brick is
      plain, with no mark on it. Tests: `tests/unit/lost.test.ts` (6).
    - **Stand-ins:** the stones are grey blocks and the things are built in code.
    - **Given back at the party** (branch `stage-2-polish`): in the epilogue each found thing lies on the
      table by its owner, and when Elof gives that one candy they see it: Moa "Mitt hårspänne! Tack,
      lillebror!", Bertil "Kula! Min kula!", Pappa "En krona! Den får du behålla." The found things come
      with him from Kapitel 1's saved flags. The same branch gives the ghost a shadow where it stands.
    - **Not yet:** the giant's delight as a picture: the owners are still signs or stand-ins.
  - **The family, first models** (4 October; Olov: "improving and creating all character models in
    blender"). What exists, on Olov's computer only: `art/private/pappa/`, `mamma/`, `moa/`, `bertil/` and
    `lill-elof/`, each with its generator script and `.blend`, and the exported `art/private/baked/private/
    <name>.glb` (about 120 KB each as packed). They were built by a parallel session driving Blender, from
    Elof's generator, against the family's pictures and sheets.
    - **How they are made:** each is derived from Elof's generator: the same 15 bone names, two
      vertex-painted materials, no textures, about 14,000 to 16,000 triangles. They share Elof's head forms,
      so the likeness sits in hair, headgear, glasses, build and clothes, not in the face.
    - **Heights, with Elof as 1:** Pappa 1.50, Mamma 1.40, Moa 1.26, Bertil 1.24 (1.27 with his cap),
      three-year-old Elof 0.78. Moa's and Bertil's are read from the picture of the three together; the
      parents' and little Elof's are guesses from ordinary proportions. **Olov should say if they are right.**
    - **What the next round should correct**, as the session that built them saw it:
      - all five: plain collars, no real folds in cloth, soft edges between painted colours, and cloth
        layers that cut through each other in a strong pose;
      - Pappa: the cap follows the sheet (a baseball cap), not the flat cap of the photo; the glasses have
        no lenses; the stubble is paint; no knife and no piece of wood;
      - Mamma: a square neckline where the pictures show a round one; no loose wisps of hair; no mug;
      - Moa: no lace on the dress, a jacket with only a collar and two pocket flaps, coarse hair waves;
      - Bertil: the same closed smile as the others, where his sheet shows a grin;
      - three-year-old Elof: only the outdoor clothes; no pyjamas and no trägubbe in his hand; his flat cap
        is light grey as in the photo, though the plan says "like Pappa's";
      - the children's heads are a little small beside the sheets (about 4.3 heads tall).
    - **In the game** (branch `stage-0c-family-figures`): where Elof is a boy among people, each sign that
      stands for one of the family is replaced by that person's model when the private pack has it: Mamma
      in the doorway in the prologue, the four at the party in the epilogue, and **the family on the
      summit** in the final. There they appear when he has tasted the golden geléhallon and is big again:
      Bertil, Moa, Mamma, and Pappa where the way home begins, under the northern lights (the plan's MUST
      "the family on the summit", standing only). In the macro world the signs stay: there a person is a
      pair of hands from far above. Who a sign stands for is
      `personFor` in `src/content/people.ts`. Where the pack has no model, as in CI and on the site today,
      the sign stays.
    - **A little life** (branch `stage-0c-family-life`): each of them turns a little towards Elof as he
      walks past, sways as someone standing does, and throws their arms up with a small hop when he has
      given them candy at the party, or when they come into the picture on the summit. It is done in code
      on the bones they share with Elof (`jointOf` and `bendJoint` in `src/render/view.ts`). Crude: the
      arms go straight up, and nothing else moves.
    - **For looking at a late moment alone:** in a debug session `?flags=a,b` starts a chapter with those
      flags set. The summit with the family:
      `?dev&debug&course=norrsken&at=26,0.01&flags=placed:tragubbe,crowberry,eyes,bag,share:tragubbe,share:spoket,share:jay,shared,taste`.
    - **Blender, for the next session:** the scratchpad's small client hung for seven minutes on a script
      with a section sign in it; keep scripts sent to Blender in plain ASCII. Safe mode also rejects calling
      a function passed as a parameter. The add-on still reports itself outdated; telemetry consent is false.
    - **Published on 4 October, in the evening,** on Olov's word: Pappa, Mamma, Moa and Bertil are
      committed in the private repository and deployed. Three-year-old Elof is still an untracked file
      on Olov's computer (see the top of "State").
    - **Pictures for Olov:** each model beside its reference pictures, and the family in a row, are in
      `photos/renders/2026-10-04-family/` on his computer (git ignores `photos/`).
    - **Not yet:** poses (they stand still, arms down), hands doing things, sitting at the table, any
      animation, and Olov's own judgement of each likeness (H1b). Three-year-old Elof is built but not
      used: the memories are still the drawn cards.
  - **The jay, modelled in Blender** (4 October, branch `stage-0c-jay`). What you see: lavskrikan, the
    helper from Kapitel 2 on and the friend he shares a lingonberry with, is no longer the bird built in
    code. It is a small round model made in Blender by `art/blender/jay.py`: grey-brown, with a dark cap,
    a rust-red tail, rump and wing patch, a beak, bead eyes and thin legs. It is the first character on
    the site that is neither a stand-in nor from the private pack.
    - It has no likeness in it, so it is public: `art/baked/boot/jay.glb` (128 KB from Blender, 26 KB as served), in
      `LICENSES.md`. Its wings are parts of their own with the stand-in's names, so the helper's wings
      beat as before. Where the model is missing, the bird built in code stays.
    - No `.blend` is committed, for the same reason as the big candy: a `.blend` stores the path it was
      saved to. The script rebuilds it.
    - **Not yet:** the other animals (the ladybird, the ants, the cranes and the chick), and the ghost as
      helper in Kapitel 1. The jay has no texture and no feathers: it is a first model.
  - **Byn, an extra chapter** (4 October, branch `stage-2-byn`). Olov asked for the village's shopping
    street as a chapter. What you see: after the epilogue's card, *Ett kapitel till* leads to **Byn**. Elof
    has one more star and is small again, and follows his friend along the pavement to the candy shop:
    1. the pavement, and the kerb down into the gutter;
    2. the drain's grate: four bars to hop across, and the dark between them;
    3. the puddle, a lake to him: "Kliv på", and a birch leaf sails him over;
    4. the bicycle: the lace takes hold of its pedal, for one swing over a cellar window's well;
    5. under the awning, where last night's rain still drips;
    6. the shop's stone step: a matchbox with a red ring is pulled down as the way up, and at the top the
       door stands ajar. "Framme! Det luktar godis."
    - **It is outside the story:** not in `STORY`, no chapter number, not on Moas karta, no hidden candy.
      `BONUS` in `src/content/chapters/index.ts` lists it; the story's last card keeps its last words and
      gets the extra button. Its code is GATA LÖV CYKEL. Directly: `?dev&course=byn`.
    - **Its look** is a new place, `village` (`src/render/village.ts`, art bible §2.3): dark asphalt and
      pale slabs, house fronts with shop windows, awnings and doors, a lamp post, a bicycle wheel as tall
      as the picture, birch leaves. No shop is a real one: each sign is a picture, with no letters and no
      number. The tune is played at a walk with the wood knocking.
    - **Built from what the robot already knows:** each stretch has the measures of one in an earlier
      chapter (the bog's firm tussocks, the forest pool's boat, the garden's gully, dew rain and wall), so
      it was playable at once. Tests: `tests/robot/byn.test.ts` (13); the browser test runs through it.
    - **Its name:** the game says *Byn*. The street's own name is not written anywhere in this
      repository: see question 5 under "Frågor till Olov".
    - **The village behind the street** (branch `stage-2-byn-skyline`): the houses now have the colours
      of the village's own wooden houses (ochre yellow, white, Falu red, pale plaster, with white trim).
      After every second house there is a yard with a red picket fence and a hedge, and over it the far
      village shows: houses with red tin roofs, birches in October yellow, spruces, and the low blue
      hills of the valley. It is one long soft picture far behind the fronts, so it slides past more
      slowly than the houses do. The colours and shapes were taken by eye from the openly licensed photos
      of the street in `photos/landscape/`; nothing of a photo is used, and no sign, name or number of a
      real house is drawn.
    - **Now extended:** anonymous passing shoes, a car and a playable shop interior are described above.
      **Not yet:** a way back and hidden candy of its own. The fronts are one drawn picture each.
- **How GitHub Pages serves the site** (read from the live site on 3 October): everything is gzipped, not
  Brotli, and cached for 10 minutes (`max-age=600`). That includes `.wasm` and `.glb`: the transcoder is
  served as 245 KB of its 527 KB, and the big candy as 9.6 KB of its 18.7 KB. The size gate counts both
  gzipped since `size-gate-as-served`: the boot pack is about 0.7 MB of its 3 MB as served.
- **Olov's computer** (checked 3 October): Windows 11, an RTX 3070, Node 24.14, git, and Blender 4.5.9 LTS with
  the *MCP for Blender* add-on running on port 9876, with only Poly Haven ticked, `uv` 0.12, Playwright
  1.56.1's Chromium, and the `ktx` tool 4.4.2 in `%LOCALAPPDATA%\Programs\KTX-Software\bin` (the asset build
  finds it there). Not installed: `gh`, `exiftool`.
  - To install `ktx` on another Windows computer: download `KTX-Software-4.4.2-Windows-x64.exe` from the
    KhronosGroup/KTX-Software releases and run it with `/S /D=%LOCALAPPDATA%\Programs\KTX-Software`.

## Next

**For the next session, in this order:**

- **Olov plays the layers and the puzzles,** on a phone and on the computer: `?dev&course=garden` (the window
  sills at once, the clothes line after the boulder), `?dev&course=granskog`, `?dev&course=myren`,
  `?dev&course=berget` and `?dev&course=byn`; and the puzzles at `?dev&course=garden&at=79,0.01`,
  `?dev&course=granskog&at=80.6,-2.48` and `?dev&course=myren&at=65,0.01`. What his eyes are needed for:
  whether the side ways are found without being told, whether a heart reads as "extra" and a wrapped sweet
  as "this way", whether three rings in a row are fun or too hard for Elof's hands, whether each puzzle's
  idea comes to him or has to be told, and which chapter's layers are the weakest.
- **The second pass: the arcs on the main trails, and the puzzles** (`docs/level-design.md` §1 and §3). This
  is where the game stops being a corridor with detours. One toy to a chapter, in four steps: seen, tried
  where a miss costs nothing, gated, twisted. In order of how much each would change:
  - *Myren:* the boardwalk and its ramp are the longest plain run in the story (9.7 s). A ring over a soft
    tussock, so that swinging is the way not to stand on it, and the sinking run rebuilt as a rhythm.
  - *Granskogen:* a ring that a cone's weight pulls into reach, and the avalanche as a chase after the
    ghost's cone. The first needs a ring that waits for a flag or rides on a thing on a rail: hooks have no
    `needs` yet.
  - *Berget:* a climb that needs Hoppa, and a puzzle of three pieces with the ghost at the cliff. Its
    optional puzzle is unbuilt: it needs a gust to be a tool, which takes one of three engine pieces (a gust
    that lifts what he stands on, shelters that follow things on rails, or a gust that waits for a flag), and
    an answer for *Lugnt*, where gusts do not blow.
  - *The engine pieces the puzzles asked for:* a ledge that tilts under a weight (Granskogen's lever, shown
    and not told), and a ring that waits for a flag (one ring that is first pulled and then swung from).
  - *Gården:* the swing's twist and its show of mastery after the gully; the dew rain as a choice.
  - *Byn:* its return loop and its sweets.
  - **Rules that bind it:** trail candy and big candies are saved by their place in their lists, so add and
    never insert or move; Granskogen and Berget have tests that hold their lists' fingerprints;
    `tests/robot/pace.test.ts` may only be lowered. Code only: a cloud session can do it.
- **A browser suite that plays one side way** in the built game, so that the ledges, the rings and the side
  candy are held in the real renderer and not only in the simulation. Slow frames on GitHub make a swing's
  timing loose: hold a ledge and a walk off it rather than three rings.
- **The candy** (art bible §2.9): Olov's eyes on it, on a phone: `?dev` for the trail and the big candy,
  `?dev&course=myren` for the lysklubba, the album's kinds one by one as he finds them. What he says tunes
  `art/blender/candy.py` and `CANDY_LIFT`; the stickers follow from the same models
  (`art/blender/candy-stickers.py`). Changing a model needs Blender, so Olov's computer.
- Use the validation record in State for the exact integrated source tree before further integration.
  Keep the merged baseline separate from `codex/storytelling-gameplay-overhaul` until its reviewed
  integration is recorded. The earlier PR stack is already merged; superseded older heads were audited
  as ancestors or patch-equivalents, not missing work.
- Olov's answers to questions 5 and 6, and what he says about the pictures in
  `photos/renders/2026-10-04-family/`. Then a second round on each family model from his remarks and from
  the list under "The family, first models".
- Review comprehension and play in the implemented causal opening, ongoing purpose cues, finale and
  four chapter loops before enlarging them. Olov should be able to explain the theft, shrinking, family
  help and welcome-home purpose from normal play; automation checks state, not that understanding.
- Finish final likeness, close contact and acting in Blender: family table/doorway/knife poses,
  practical help at the crossings, eye painting, giving sweets and convincing shoulder carrying.
  The public rehearsal bodies and visible shoulder ride are implemented; the next work refines them.
  Animated 3D memory scenes and full shelf/material continuity also remain.
- Broader spatial storytelling and deeper connected puzzle reuse remain chapter work. The garden's
  paper pocket/boarding, forest's weight/doorway loops, bog's reusable Mamma boardwalk and mountain's
  return lace are implemented; do not restart them. Byn still needs its own optional connected return
  loop. Review its passing shoes, car and playable shop interior on Olov's devices; detailed models need Blender.
- Completed code: C1–C4, separate players, album photos/replay, offline updates, replayable dew bells
  and cobbles, the vittra gift, party/summit choices, painting/carving gestures, exploration, and the
  moonlit ending are in the merged baseline. See `docs/implementation-progress.md` for their historical
  PR milestones and `docs/storytelling-overhaul.md` for the new integrated development scope.
- The ghost's forest, bog and cliff thought pictures, the persistent root-door small-figure clue and
  the growing/returning memory presentation are implemented. Final memory art still needs Blender on
  Olov's computer.
- Look-dev code now includes place LUTs, Low material grading, High background blur and half-size bloom,
  flowing water/refraction, tiered character shadows and measured GPU allocation/texture recovery gates;
  the overhaul also fixes per-view grading ownership, repeated model installation, hidden-material
  warmup and carried shadows.
  Review the combined result with private models and `?bench` on Olov's devices; cloud stand-ins are not
  the H1a/H1b/H2 checks or listening approval.
- Look-dev: review the repaired finale nightfall and round stars on Olov's devices at H1a.
- Physical iPad/iPhone/Android play, installed Safari/Home Screen behavior, performance and sound review
  remain outstanding. Finish those checkpoints before a separate release decision; keep
  `RELEASED_CHAPTER` at `null` meanwhile.

The older list, still true where it is not struck:

1. **The Blender tools work** in a session on Olov's computer (since the second restart on 3 October).
   - In the add-on's panel, keep only *Poly Haven* ticked. Never tick *Hunyuan*.
   - **Update the add-on when convenient:** run `uvx mcp-for-blender install-addon`, then restart Blender (or switch
     the add-on off and on in Preferences) and press *Start MCP Server*. Then ask the session for the add-on's
     status: `telemetry_consent` must be false (see "Notes for sessions that drive Blender").
2. **Olov's checkpoint for Stage 0a** (plan §7.3): the foundation is merged; after confirming the deployed
   revision, open
   `https://olovmelander.github.io/spokets-godisbus/?bench` on each device you have. It plays by itself for half a
   minute and then shows text. Copy that text into the next session.
   - On the computer: `npm run dev`, then `http://localhost:5173/spokets-godisbus/?debug`. For a phone on the same
     Wi-Fi: `npm run dev:lan`.
3. *(Done: the size gate counts `.wasm` and `.glb` as Pages serves them, gzipped.)*
4. **H2, Olov's checkpoint for Stage 1** (plan §7.3): play the test course for twenty minutes on a phone or a
   tablet, once as yourself and once badly on purpose (one thumb, late jumps, everything in the wrong order).
   The questions: is moving, jumping and swinging fun for two minutes with no goal? Is *Äventyr*'s swing
   timing right? Is *Lugnt* gentle enough? What you say tunes `src/sim/constants.ts`.
   - On the site: `https://olovmelander.github.io/spokets-godisbus/`. The pause button, top right, has the
     two styles.
5. **The rest of Stage 0b** (look-dev), on Olov's computer, with him watching the picture:
   - `docs/art-bible.md`: the scale chart, a palette and a grade per place, the layer recipe, the H1a board with
     its five criteria, and the fallback look (plan §5.6, point 1);
   - the two golden frames, in `dev/look.html`: the deck edge and the moss under the spruces, each with the
     stand-in Elof, a red hook ring and candy, built in layers (plan §5.3) with CC0 materials from Poly Haven;
   - the completed renderer effects and tier/GPU budgets, with `?bench` on the golden frames;
   - then **H1a**, Olov's checkpoint.
6. **Stage 0c** (characters): image-to-3D for Elof and the family on the computer with the RTX 5080 (art bible
   §1.6, and question 4 below), and the ghost redone in Blender as stylized carved wood (art bible §1.5).
7. **The family's models are on the site** (3 October). Olov asked for it: "We need to have the good looking
   Elof and ghost in the github pages aswell."
   - **Done by the session, with his stored GitHub credential:** the private repository
     `olovmelander/spokets-godisbus-familj` exists and holds `baked/private/elof.glb` and `ghost.glb` with the
     scripts and `.blend` files that build them. No picture is in it: it ignores the views cut from the sheets.
     On Olov's computer it is checked out as `art/private/`.
   - **How the deploy reaches it:** a read-only deploy key on the private repository, whose private half is the
     Actions secret `FAMILY_ASSETS_KEY` of this repository. The key file was deleted from the computer after
     the secret was set. The plan (§6.11) says a fine-grained token, `FAMILY_ASSETS_TOKEN`; a deploy key does
     the same with less: it can only read that one repository, and a session can make one, which it can't with
     a token.
   - **The merge that published them** was pull request #31, which changes `.github/workflows/deploy.yml` to
     fetch the models. It was left to Olov, as CLAUDE.md says; he answered "Do this final click for me", and
     the session merged it. The public site was checked afterwards: it loads `private/elof` and
     `private/ghost`. That word covered that pull request: a later one that touches likeness assets is his.
   - **To take them down again:** delete the secret `FAMILY_ASSETS_KEY` (*Settings → Secrets and variables →
     Actions*), or the files in the private repository, and run *Deploy to GitHub Pages* again.
   - **Still to do:** the secret `PRIVACY_DENYLIST`, the words the privacy check looks for (plan §6.11). Only
     Olov knows them, and they must never be written in this repository.
8. **Whenever Olov can:** his own photos of Storklocken's top, the rapids in the village and Näsbacken. No openly
   licensed photo of them was found, so until then those places are built from descriptions (plan §0 Q8).

## Decisions in effect

| Question | Decision | Source |
| --- | --- | --- |
| Elof as a player | 7 years, plays games for 11+. Play style *Äventyr* by default (variable jump, a swing he pumps, the glitter bubble, exciting sequences, challenge routes); *Lugnt* for anyone who wants it. Help only when asked. | Olov, 3 Oct |
| Devices | A new iPad, an iPhone, or an Android phone in the Samsung S23 class; tuned for the High tier. Elof uses all three, so none comes first. | Olov, 3 Oct |
| Consent | Both parents say yes to everything, and every name may be used. Still never surnames, house number or address, coordinates, the school or account names (plan §2.6). | Olov, 3 Oct |
| Renderer | Three.js r186 `WebGLRenderer` on WebGL 2 | Olov, 3 Oct |
| Where work happens | Mostly on Olov's laptop (Windows, RTX 3070, 8 GB), with Blender through *MCP for Blender*; image-to-3D on his other computer (RTX 5080, 16 GB); cloud sessions for code | Olov, 3 Oct |
| Scale | (a): Elof shrinks to the ghost's size at the end of the prologue | Olov, 3 Oct |
| The secret | Pappa's first trägubbe, carved for Elof when he was about three and lost on the mountain. Little Elof shared his Saturday sweets with it, which is why the ghost takes the bag. The game names no year. | Olov, 3 Oct; the retelling in plan §2.4 and §3.4 is the session's |
| The ghost's name | *Klonk*, after its footsteps. Elof names it in the epilogue; until then it is "spöket". | Olov asked for a name, 3 Oct; the name is the session's proposal |
| Dates | None. Stages in order; a release goes out when its checkpoint has passed. | Olov, 3 Oct |
| Going on without asking | Sessions work through the plan stage after stage, take the choice they would recommend, and write it here. A session merges its own green PR, except one that touches `RELEASED_CHAPTER`, likeness assets or `CLAUDE.md`. | Olov, 3 Oct: "Do not stop, just continue implement all phases in one shot. Do not wait for greenlight from me. Always do what you recommend doing." and "I want the full game plan implemented". That this covers merging is the session's reading. |
| Order of work | Stage 1, the game itself in greybox, goes on while the look-dev of Stage 0b and the characters of Stage 0c wait | Olov, 3 Oct: "continue working with the implementation of the games, we can improve the character design later" |
| Story and level direction | Plan version 5 improves visible opening causes, durable purpose, family cooperation and connected, reusable local puzzles. The implemented opening/context/family/finale and four chapter loops are development milestones; broader layouts, Byn's return loop and final art remain. | Olov's 4 Oct direction; `docs/storytelling-overhaul.md` records research and our design inference |
| Finale explanation | Actual summit rescue, painted eyes and bag recovery reveal the welcome-home candy motive even if the optional mountain memory was missed. The memory separately guards old/childhood identity wording in purpose and recap cues. | 4 Oct overhaul implementation; existing story canon in plan §§2.4, 3.4 |
| Progress continuity | Main collectible/checkpoint identities and primary puzzle flags retain their meaning. New local loops are optional and additive; an old save need not complete them to continue the story. Public rehearsal family bodies can be replaced by approved private models. | 4 Oct overhaul implementation; existing save and family-asset rules |
| Testing | Only Olov tests before Elof plays. H2 and H3 are his own tests. | Olov, 3 Oct |
| Voices | None: no read-aloud, no recordings. Characters make wordless sounds. | Olov, 3 Oct |
| Logotypes | None anywhere. The star on the real ghost's shoes becomes a plain disc. | Olov, 3 Oct |
| Characters | Elof and the family are generated from Olov's sheets by image-to-3D and finished in Blender; the service is not chosen yet (art bible §1.6). The ghost, the trägubbar and the animals are designed in Blender. | Olov, 3 Oct: "We need to go image to 3d way!" |
| The ghost model | After the two photos of the carving, with the render and the poster for what they don't show. It has hands, as on the poster and the render. No scan. | Olov, 3 Oct |
| The places | Storklocken as the model for the mountain. Plates rendered in Blender after the landscape references; ambience CC0 or synthesised. The jay and the church bells at 18:00 stay. | Olov, 3 Oct ("what is recommended") |
| Candy | The family likes every kind. The golden candy is a geléhallon in gold paper; at the party Elof chooses who gets what. | Olov, 3 Oct; the geléhallon is the session's choice |
| More players | "Ny spelare" always exists; each player picks *Äventyr* or *Lugnt* | Olov, 3 Oct |
| Jump physics | Gravity follows from the plan's numbers: a held jump tops out at 1.1 EL and carries 2.2 EL at a run, so gravity is 22.3 EL/s². Letting go of Hoppa on the way up makes Elof 1.8 times heavier, which makes a tap top out at 0.6 EL. | Session, 3 Oct (`src/sim/constants.ts`) |
| Hoppa's release | Not queued. Hoppa's held state is read once per frame, and that is enough for a tap inside one frame to be a hop (`src/app/game.ts`). The plan's §4.1 expected releases in the queue. | Session, 3 Oct |
| planck's scale | `lengthUnitsPerMeter` is 0.2, as the plan says. planck doesn't scale its polygon skin with it, so a body rests 0.019 EL above the ground; the simulation takes that off Elof's reported height. | Session, 3 Oct (`src/sim/sim.ts`) |
| Tone mapping | Neutral, not AgX. The plan allows either (§6.5). With AgX the sky and every flat colour turned grey once the picture went through the HDR buffer; Neutral keeps a colour as it was set. Olov judges the look at H1a. | Session, 3 Oct (`src/render/view.ts`) |
| Reference pictures | In `photos/`, ignored by git. **Every picture in its root is used** for the characters, the ghost and the house: the table in plan §2 says what each one decides. `photos/landscape/` is for the surroundings. | Olov, 3 Oct |

## Planned against actual

| Stage | Planned sessions | Actual | Olov's rounds (planned / actual) | Notes |
| --- | --- | --- | --- | --- |
| Planning | 1 | 3 recorded | — / 2 | Original plan versions 1–4; `main` and the placeholder page; the reference pictures gathered. Version 5 on 4 October adds the researched story/level overhaul and its acceptance criteria; no new session or review count is inferred. |
| 0a Foundation | 1–2 | 1 | 1 / 0 so far | In the same session as plan version 4. Part 1: the scaffold, the simulation, the input port, the test course, the tests and both workflows. Part 2: the asset chain from Blender, `?bench` and `dev/menus.html`. Olov's device check is left. |
| 0b Look-dev | 2–3 | begun | 2 / 0 so far | In the same session: the tiers and the grading pass; then the look of a place, both golden frames, every chapter dressed as its place, and the art bible's §2. Blender plates and scanned materials, and H1a are left. On 4 October: Auto goes up to High by itself, High glows, and every place has far scenery in layers with parallax. Cloud follow-up: the finale's sky, scenery and haze darken together; stars remain round at every aspect ratio. The overhaul fixes family material/grader ownership, repeated private-model warmup and carried terrain shadows; public five-size WebP rehearsal captures are recorded. On 4 October, on Olov's computer: the candy modelled in Blender (a kit of 25 sweets and a new big candy), in every chapter. Final visual and physical-device review remains. |
| 1 Feel | 2–3 | begun | 2 / 0 so far | In the same session: part 1, the candy trail and the bag; part 2, the glitter bubble; part 3, kerbs, slopes, ledges and hoses; part 4, the lace and the swing; part 5, the play styles, the pause panel, saving and the big candies; part 6, a puzzle with things on rails; part 7, an exciting sequence and the camera's zones. All of Stage 1's list is built; H2 is left. Started before 0b and 0c are finished, on Olov's word. |
| 2 Utgåva 1 | 7–10, plus 1 | begun | 4–6 / 0 so far | The whole development story and Byn are playable. The merged baseline includes C1–C4, controls/settings, separate players, album photos/replay, offline updates, replayable toys, choices/gestures, exploration, golden album reward, moonlit ending, memory presentation and ghost thought pictures. The new overhaul branch adds the causal opening/shared family shrinking, durable story context, all-chapter family rehearsals, staged finale/shared sweets/shoulder ride, and connected optional loops in Gården, Granskogen, Myren and Berget. The candy motive survives a missed mountain memory; purpose/recap identity stays memory-guarded. Main save identities remain intact. On 4 and 5 October: level design version 6; its first pass, the layers, over Gården, Granskogen, Myren, Berget and Byn; and one optional puzzle each in Gården, Granskogen and Myren. The second pass, on the main trails and their own puzzles, remains, and so does a puzzle for Berget. Broader spatial work, Byn's return loop, final likeness/contact/acting/memory art, listening and device checkpoints remain; no release is declared. |
| 0c Characters | 2–4 | begun | 3 / 0 so far | In the same session: first models of the ghost and of Elof, each in two rounds against its pictures, and both in the game from a private pack. H1b, the textures, the library's skeleton and clips are left. On 4 October: first models of Pappa, Mamma, Moa, Bertil and three-year-old Elof, on Olov's computer only, and shown at home and on the summit where the pack has them. The overhaul adds replaceable public rehearsal bodies at every chapter's family help points, shared shrinking and shoulder carrying; that staging does not finish likeness or acting and does not approve publishing new private assets. |

## Known bugs

- Offline play is checked in Chromium with a real worker and the test server disconnected. Installed
  Safari/Home Screen updates and storage eviction have not been checked on the family's devices yet.

- **With the family's models the live game draws more than the checks measure, and is over the budget in
  one place.** The checks run with stand-in figures. On the site the family's models cost 11 to 19 draw calls
  more in a picture: Granskogen's hilltop after the ant lift is 127 against the budget of 120 (116 with
  stand-ins), and Gården's clothes line on a phone held sideways is 105 (86). It was so before the layers,
  which left the hilltop one or two cheaper. Each family model is several meshes; joining a model's meshes
  where they share a material is where the draw calls are.
- **A jump that comes down exactly on the far corner of a tussock or a block leaves him resting there
  without standing:** Hoppa does nothing until the stick moves him. It is what was repaired for ledges on
  5 October, in the ground's own footing, and was there before: 14 of 5,055 swept jumps on Myren's trail.
- **The side ways are in greybox, like the chapters.** A ledge and what holds it are one shape scaled to its
  width, so a wide bough has a wide stem. There is no look for a nest: Granskogen's is a bough. The dew rain's
  drops are drawn falling through Gården's leaves and past its rings; they do nothing to him up there. The
  stand-in ghost waits in front of three of Berget's low shelves.
- **From the trail, on a phone held sideways, some rings are above the top of the picture:** Gården's
  clothes line from the lawn, Berget's rings between the boulders from the granite, and in Granskogen the
  gummiorm is at the picture's top edge. The hearts over the first ledges and the candy along the swings are
  in it, and they are the tell.
- **The picture follows the ground under him, so it dips a little between rings** and on a jump between two
  ledges over ground. Myren's leaves have their gaps over water, where it does not.
- **A jump under a ring with a throw at its top catches it** in Gården, in Myren and on Berget, as under the
  swing chain's first nail: a row of rings can be joined in its middle. The sweet at the end still takes a
  swing. In Granskogen the rings hang too high for that.
- **Run the browser suites one at a time, and leave the working tree alone under them.** Some of them start
  Vite on the source instead of serving `dist/`: a branch changed in that worktree reloads their pages and
  fails them (`myren-loop` and `ghost-thoughts` did, on 4 October), and two chains at once made
  `mountain-loop` miss a jump that it makes alone.


- **A slow picture no longer fails a browser suite.** On GitHub the game is drawn in software, and a
  screenshot there can take longer than Playwright's thirty seconds: on 4 October that failed the run of a
  pull request that changed only this file (`myren-loop.mjs`, at 1180×820 on High). Every screenshot in the
  suites was an iteration picture and never a check, so all 54 now go through `tests/browser/picture.mjs`,
  which waits two minutes and then goes on without the picture. A run on GitHub took 43 minutes or more
  until the suites were shared out over six jobs on 5 October; it now takes about 13.
- **Two sessions in one checkout get in each other's way.** On 4 October a second session started in the main
  checkout while the first had a dev server running there. Its `npm ci` could not delete rolldown's native file,
  which the server held open, and stopped with `EPERM` after removing most of `node_modules`; and each
  changed the branch under the other. `npm install` put `node_modules` back without touching the held
  file. **A session that finds another at work takes a worktree of its own:**
  `git worktree add .claude/worktrees/<name> <branch>`, and `npm ci` there. The family's models and the
  reference pictures stay in the main checkout, so such a worktree shows the stand-ins, as CI does.
- With three sessions working on the computer at once, two long tests timed out and the browser test once
  measured a warm-up frame. Both are fixed (a minute for the tests; the measure waits for the frame to
  settle). On a quiet computer and in CI neither happened.
- **On Windows, start the tests from a path spelled with a capital `C:`.** From `c:\Users\...` every test file
  fails with "Cannot read properties of undefined (reading 'config')": vitest gets loaded twice under two
  spellings. `cd "C:/Users/..."` first.
- Not checked yet: the game on a real phone or tablet. The browser test runs in headless Chromium with software
  rendering, so its frame times say nothing about a device.
- A viewport screenshot taken through the Blender server came back black once, right after the viewport was
  switched to material preview. The export itself was right. Check again before relying on screenshots.
- The stand-in Elof slides a little at the edge of a block before he drops: his body is a box. Stage 1's
  controller (ledges, slopes, steps of 0.3 EL) replaces it.

## Notes for sessions that drive Blender

- **Telemetry.** The add-on that was installed in Olov's Blender had its own consent setting switched on, as its
  default. On 3 October a session switched it off (`telemetry_consent = False` in the add-on's preferences) and
  saved Blender's preferences. Nothing was uploaded by these sessions in any case: with `DISABLE_TELEMETRY=true`
  the server's code returns before every upload. But a server started without that variable, from another
  program, would have uploaded prompts, code, screenshots and scene data while the setting was on. After any
  update of the add-on, read `telemetry_consent` in its status again, and it must be false.
- The server's safe mode lets a script use `bpy`, `bmesh`, `mathutils` and pure-Python standard modules. It
  rejects `globals()`, `open`, `exec`, `getattr` with a computed name, and `os`, `sys` and anything that reaches
  files, the network or other programs. Saving, rendering, import and export through Blender's own operators are allowed.
- Since the server was updated the safe mode is stricter, and says what it rejects before anything runs: no
  `class`, no calling a function that was passed as a value (so no callbacks, and no lambdas that are called),
  and no name that the script does not bind itself. A generator therefore gives its shapes as tables and plain
  `def`s (`art/blender/candy.py`), and a value from the caller is always set in a first line.
- So a script can't read another file: send its text. `scripts/bake/export.py` is written for that, with `OUT`
  set in a first line.
- A `.blend` stores the full path it was saved to, which includes the Windows user name. `big-candy.blend` is
  therefore not committed; it is rebuilt from `art/blender/big-candy.py`. Decide how to handle this before the
  first hand-modelled public `.blend` is committed.
- A long script is easier to keep in a file than to pass through the tool. `scripts/bake/send-to-blender.mjs`
  sends a file to the open Blender through the server, started exactly as `.mcp.json` declares it; arguments
  after the file become its first lines (`"OUT = r'...'"`). Use the session's own tools for short scripts,
  the status and screenshots. A render written to a file and read back shows more than a viewport screenshot.
- Reference pictures go into the scene as image empties, in a collection that is hidden from renders.
- Shade can be baked into a model's colours: Cycles bakes ambient occlusion to a colour attribute on the points
  (`bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')`), in well under a second for a small model.
- The exporter writes a colour attribute as `COLOR_0` only when the material's base colour reads it, and without
  its alpha unless the alpha is linked too, which marks the material as see-through. A second number for each
  corner travels better in a UV map (`art/blender/candy.py` keeps how much tint a corner takes there).

## Senare (wishes for a later release)

- (empty)

## Frågor till Olov

The first two are in plan §0, "Kvar att svara på". None of them blocks the work.

1. **Do Elof's parents know about the game, or is it a surprise for them too?** The default: Olov judges the
   likeness himself, and Pappa reads the storyboard of the memories before the first one is built, late in
   Stage 2. Also: does Pappa's real first trägubbe still exist at home?
2. **Which devices does Olov have for testing?** The default: he tests on what he has and in Chrome on the
   computer, and a device class he lacks is first measured when Elof plays.

3. **Is the small boy on Pappa's lap in `family-pappa-viewpoint.jpg` Elof?** Little Elof in the memories is
   modelled on him, flat cap and all (plan §2.4). The default: yes.
4. **Which image-to-3D service?** You chose image-to-3D for Elof and the family on 3 October. Nothing has been
   uploaded, because Meshy Pro, the service the plan examined, fails the plan's own check: its terms let it
   train on what paying users upload, with no way to switch that off below its Enterprise plan (art bible
   §1.6 has the wording). The parents' yes was to a paid Meshy plan, so anything else is asked of them first.
   - **(a) Tripo's paid plan,** if its terms say what its help pages are reported to say: no training on paid
     users' uploads, private models, you own them. Read that on the site before uploading; the session could
     not open the pages.
   - **(b) Meshy Pro all the same,** if you and the parents accept the training clause.
   - **(c) An open model on your own computer: this is the plan.** You asked for an open, local alternative,
     and your other computer has an RTX 5080 with 16 GB. The order to try: TRELLIS.2 through ComfyUI, then
     the first TRELLIS. Both are Microsoft's, MIT, free, and nothing is uploaded. Neither is tried yet, and
     whether TRELLIS.2 fits in 16 GB is not known. **Pixal3D may be better, and its licence allows it:** MIT
     since 20 May 2026, code and weights; the EU limit belonged to the terms it had for its first eight days
     (art bible §1.6). Say if you want it tried first.
     - **What a session on that computer needs:** this repository cloned; Elof's three views from
       `art/private/elof/image-to-3d/` (or the whole `photos/` folder), carried over on a USB stick or the
       home network, never through git; and about 30 GB of free disk.
     - **What it does:** installs ComfyUI, runs Elof's views through the models in that order, and saves the
       best GLB to `art/private/elof/image-to-3d/`. Blender work can then happen on either computer.
     - The laptop with the RTX 3070 has 11 GB free on C: and cannot hold the install as it is.
   - Whichever you choose, better pictures give a better model: each view of Elof alone, full height, 1024 by
     1536, plain background, arms a little out. The views cut from the sheet are small and soft; they are in
     `art/private/elof/image-to-3d/` and will do for a first try.
6. *(Answered on 4 October: yes. Pappa, Mamma, Moa and Bertil are on the site.)* **Still open:** should
   three-year-old Elof go up too, before any memory uses him? The default is no. And what is wrong with
   each likeness: the pictures are in `photos/renders/2026-10-04-family/`, and the list of what the
   session itself would correct is under "The family, first models".
5. **May the village street be called by its own name?** You asked for it as a chapter by name. The game
   calls it *Byn*, as a child would, and the street's name is not written in this repository. The reason:
   CLAUDE.md says never a street address, and a street's name beside the children's first names is most of
   one if anyone in the family lives or goes to school there. This repository is public and its history is
   permanent. If the street is only where the shops are, say so, and the name can go on the chapter's card.
   - Until then the third, sculpted Elof stays in the game, and the ghost is redone as stylized carved wood.
5. **Are the ghost and Elof right?** Olov called them "the good looking Elof and ghost" on 3 October and asked
   for them on the site, which the session reads as: good enough to show. It is not H1b: the plan's yes, or up
   to three corrections each, is still his to give. Open `art/private/ghost/ghost.blend` and
   `art/private/elof/elof.blend` in Blender, where each stands between its pictures.
6. **Where should the ghost's files live?** Answered by what Olov asked for on 3 October: in the private
   repository with Elof's, and shown on the public site through the deploy. It can always be taken down.

Choices the session made, for Olov to overrule if he wants:
- the bow on the big candy, its pinwheel turn, and how much a sweet shines by itself (see "The candy is
  modelled in Blender" under "State");
- the name *Klonk* (two others that were considered: Kvist and Flisa);
- the plain disc instead of the star on the ghost's shoes, because the star on a red canvas shoe reads as a brand.
