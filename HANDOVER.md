# Handover

## State (3 October 2026)

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
  - **Not yet:** Auto's two-second measurement, High's bloom and depth blur, Low's grade inside the materials,
    the LUT per place, `docs/art-bible.md`, and the two golden frames. They are the rest of Stage 0b.
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
      the album as credits, and *Utforska vidare*.
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
    - **Not yet:** the album's photos (game renders kept on the device, plan §6.9) and the album as the
      credits in the epilogue; the golden geléhallon as its last piece.
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
    - **Not yet:** Elof's gasp and giggle, and his two-note call.
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

1. **The Blender tools work** in a session on Olov's computer (since the second restart on 3 October).
   - In the add-on's panel, keep only *Poly Haven* ticked. Never tick *Hunyuan*.
   - **Update the add-on when convenient:** run `uvx mcp-for-blender install-addon`, then restart Blender (or switch
     the add-on off and on in Preferences) and press *Start MCP Server*. Then ask the session for the add-on's
     status: `telemetry_consent` must be false (see "Notes for sessions that drive Blender").
2. **Olov's checkpoint for Stage 0a** (plan §7.3): once `stage-0a-assets` is merged and deployed, open
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
   - what the tiers still lack (see "State"), and `?bench` on the golden frames;
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
| Planning | 1 | 3 | — / 2 | Plan versions 1–4; `main` and the placeholder page; the reference pictures gathered |
| 0a Foundation | 1–2 | 1 | 1 / 0 so far | In the same session as plan version 4. Part 1: the scaffold, the simulation, the input port, the test course, the tests and both workflows. Part 2: the asset chain from Blender, `?bench` and `dev/menus.html`. Olov's device check is left. |
| 0b Look-dev | 2–3 | begun | 2 / 0 so far | In the same session: the tiers and the grading pass; then the look of a place, both golden frames, every chapter dressed as its place, and the art bible's §2. Blender plates and scanned materials, and H1a are left. |
| 1 Feel | 2–3 | begun | 2 / 0 so far | In the same session: part 1, the candy trail and the bag; part 2, the glitter bubble; part 3, kerbs, slopes, ledges and hoses; part 4, the lace and the swing; part 5, the play styles, the pause panel, saving and the big candies; part 6, a puzzle with things on rails; part 7, an exciting sequence and the camera's zones. All of Stage 1's list is built; H2 is left. Started before 0b and 0c are finished, on Olov's word. |
| 2 Utgåva 1 | 7–10, plus 1 | begun | 4–6 / 0 so far | In the same session: sound effects; the ghost that keeps its distance; Kapitel 1 in greybox, playable with `?dev`; the title and the first start; Kapitel 2, 3 and 4, the final, the prologue and the epilogue in greybox rules; stand-ins for the things and the animals; the helper, the album's stickers, Moas karta, the opening scene with the blink, the four memories as picture cards, and the music with each place's air. Only what needs no art, until the look and the characters are decided. |
| 0c Characters | 2–4 | begun | 3 / 0 so far | In the same session: first models of the ghost and of Elof, each in two rounds against its pictures, and both in the game from a private pack. H1b, the textures, the library's skeleton and clips are left. |

## Known bugs

- None known in the game.
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
- So a script can't read another file: send its text. `scripts/bake/export.py` is written for that, with `OUT`
  set in a first line.
- A `.blend` stores the full path it was saved to, which includes the Windows user name. `big-candy.blend` is
  therefore not committed; it is rebuilt from `art/blender/big-candy.py`. Decide how to handle this before the
  first hand-modelled public `.blend` is committed.
- A long script is easier to keep in a file than to pass through the tool. The session of 3 October ran its
  generator files through a small MCP client in its scratchpad, started exactly as `.mcp.json` declares the
  server, and used the tools directly for short scripts, the status and screenshots.
- Reference pictures go into the scene as image empties, in a collection that is hidden from renders.

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
   - Until then the third, sculpted Elof stays in the game, and the ghost is redone as stylized carved wood.
5. **Are the ghost and Elof right?** Olov called them "the good looking Elof and ghost" on 3 October and asked
   for them on the site, which the session reads as: good enough to show. It is not H1b: the plan's yes, or up
   to three corrections each, is still his to give. Open `art/private/ghost/ghost.blend` and
   `art/private/elof/elof.blend` in Blender, where each stands between its pictures.
6. **Where should the ghost's files live?** Answered by what Olov asked for on 3 October: in the private
   repository with Elof's, and shown on the public site through the deploy. It can always be taken down.

Two choices the session made, for Olov to overrule if he wants:
- the name *Klonk* (two others that were considered: Kvist and Flisa);
- the plain disc instead of the star on the ghost's shoes, because the star on a red canvas shoe reads as a brand.
