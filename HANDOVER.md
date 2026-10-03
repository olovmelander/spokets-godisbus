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
  - **Not yet, the rest of Stage 1** (plan §7.3): ledges and climbing; the lace and the swing in both modes;
    the big candy as a checkpoint; the camera's zones; one greybox puzzle and one exciting sequence; the two
    play styles; then H2.
- **How GitHub Pages serves the site** (read from the live site on 3 October): everything is gzipped, not
  Brotli, and cached for 10 minutes (`max-age=600`). That includes `.wasm` and `.glb`: the transcoder is
  served as 245 KB of its 527 KB, and the big candy as 9.6 KB of its 18.7 KB. The size gate still counts
  both at full size, which is on the safe side; see "Next".
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
3. **Correct the size gate:** Pages gzips `.wasm` and `.glb` too (see "State"), so `scripts/size-gate.mjs` and
   the plan's §6.6 should count them as served. A small PR of its own.
4. **The rest of Stage 1** (plan §7.3), one visible outcome per PR, in this order: ledges and climbing; the lace and the swing; the big candy as a checkpoint; the camera's zones; a
   greybox puzzle; a greybox exciting sequence; the two play styles. Then **H2**, Olov's own test on touch.
5. **The rest of Stage 0b** (look-dev), on Olov's computer, with him watching the picture:
   - `docs/art-bible.md`: the scale chart, a palette and a grade per place, the layer recipe, the H1a board with
     its five criteria, and the fallback look (plan §5.6, point 1);
   - the two golden frames, in `dev/look.html`: the deck edge and the moss under the spruces, each with the
     stand-in Elof, a red hook ring and candy, built in layers (plan §5.3) with CC0 materials from Poly Haven;
   - what the tiers still lack (see "State"), and `?bench` on the golden frames;
   - then **H1a**, Olov's checkpoint.
6. **Stage 0c** (characters): image-to-3D for Elof and the family on the computer with the RTX 5080 (art bible
   §1.6, and question 4 below), and the ghost redone in Blender as stylized carved wood (art bible §1.5).
7. **For the family's files:** the private repository `spokets-godisbus-familj`, a read-only token, and the secrets
   `FAMILY_ASSETS_TOKEN` and `PRIVACY_DENYLIST` (plan §6.11).
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
| 0b Look-dev | 2–3 | begun | 2 / 0 so far | In the same session: the tiers and the grading pass. The art bible, the golden frames and H1a are left. |
| 1 Feel | 2–3 | begun | 2 / 0 so far | In the same session: part 1, the candy trail and the bag; part 2, the glitter bubble. Started before 0b and 0c are finished, on Olov's word. |
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
5. **Are the ghost and Elof right?** Open `art/private/ghost/ghost.blend` and `art/private/elof/elof.blend` in
   Blender, where each stands between its pictures, or look at the renders in `docs/shots/_work/ghost/` and
   `docs/shots/_work/elof/`. For each: say yes, or give up to three corrections (plan §7.3, H1b).
6. **Where should the ghost's files live?** It is Pappa's carving, not a person, and a drawing of it is already
   on the public loading card. In the public repository it is simplest, but git history is permanent. In the
   private repository it can always be taken down, like the family's models. The default until you answer:
   private, and so not on the public site.

Two choices the session made, for Olov to overrule if he wants:
- the name *Klonk* (two others that were considered: Kvist and Flisa);
- the plain disc instead of the star on the ghost's shoes, because the star on a red canvas shoe reads as a brand.
