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
  - **Stage 0a, part 1: the foundation runs** (3 October, branch `stage-0a-foundation`).
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
    - `.github/workflows/deploy.yml` now builds and publishes `dist/`, and `ci.yml` checks pull requests. **Neither
      has run on GitHub yet:** the first run is this branch's pull request.
    - The placeholder page in `site/` is gone: merging this branch puts the test course on Pages, with `noindex`.
- **Not built yet in Stage 0a:** `?bench`, `dev/menus.html`, the asset chain (Blender → glTF → KTX2 → Pages), and
  the note on what Pages compresses. See "Next".
- **Olov's computer** (checked 3 October): Windows 11, an RTX 3070, Node 24.14, git, and Blender 4.5.9 LTS with
  the *MCP for Blender* add-on running on port 9876, with only Poly Haven ticked, `uv` 0.12, and Playwright
  1.56.1's Chromium. Not installed: `gh`, `exiftool`, `ktx`.

## Next

1. **Olov gives the next session its Blender tools** (plan §5.6, §6.14):
   1. restart VS Code, so that Claude Code finds `uvx`;
   2. keep Blender open with the add-on connected, and approve the `blender` server when Claude Code asks;
   3. ask the session what the Blender scene holds. It should list the cube, the camera and the light.
   - In the add-on's panel, keep only *Poly Haven* ticked. Never tick *Hunyuan*.
   - **Update the add-on when convenient:** run `uvx mcp-for-blender install-addon`, then restart Blender (or switch
     the add-on off and on in Preferences) and press *Start MCP Server*. If the new panel shows a telemetry consent
     box, leave it unticked (`CLAUDE.md`).
2. **Olov merges the two pull requests,** the plan first (`plan-v4-answers`), then the foundation
   (`stage-0a-foundation`). The second one's checks are the first run of both workflows, so look at them.
   - Then open `https://olovmelander.github.io/spokets-godisbus/?debug` on the devices you have, play the course
     to the big candy, and tell the next session what the top two lines of the overlay say on each device.
   - On the computer: `npm run dev`, then `http://localhost:5173/spokets-godisbus/?debug`. For a phone on the same
     Wi-Fi: `npm run dev:lan`.
3. **Stage 0a, part 2** (plan §7.3), on Olov's computer, because it needs Blender:
   - `?bench`: the 30-second measurement that prints text to paste into a session (plan §6.10);
   - `dev/menus.html`, with the first menu in it;
   - the asset chain proven end to end: `scripts/bake/export.py` in Blender → glTF → `scripts/build-assets.mjs`
     with gltf-transform and KTX2 → a model on the page;
   - record whether Pages compresses `.wasm`, `.glb` and `.ktx2` (it needs the deployed site);
   - note how to install `ktx` and `exiftool` on Windows.
4. **Stage 0b** (look-dev) and **Stage 0c** (characters) need Olov's computer and step 1: the golden frames, then
   Elof and the ghost in Blender (plan §5.6).
5. **Before Stage 0c:** the private repository `spokets-godisbus-familj`, a read-only token, and the secrets
   `FAMILY_ASSETS_TOKEN` and `PRIVACY_DENYLIST` (plan §6.11).
6. **Whenever Olov can:** his own photos of Storklocken's top, the rapids in the village and Näsbacken. No openly
   licensed photo of them was found, so until then those places are built from descriptions (plan §0 Q8).

## Decisions in effect

| Question | Decision | Source |
| --- | --- | --- |
| Elof as a player | 7 years, plays games for 11+. Play style *Äventyr* by default (variable jump, a swing he pumps, the glitter bubble, exciting sequences, challenge routes); *Lugnt* for anyone who wants it. Help only when asked. | Olov, 3 Oct |
| Devices | A new iPad, an iPhone, or an Android phone in the Samsung S23 class; tuned for the High tier. Elof uses all three, so none comes first. | Olov, 3 Oct |
| Consent | Both parents say yes to everything, and every name may be used. Still never surnames, house number or address, coordinates, the school or account names (plan §2.6). | Olov, 3 Oct |
| Renderer | Three.js r186 `WebGLRenderer` on WebGL 2 | Olov, 3 Oct |
| Where work happens | Mostly on Olov's computer (Windows, RTX 3070), with Blender through *MCP for Blender*; cloud sessions for code | Olov, 3 Oct |
| Scale | (a): Elof shrinks to the ghost's size at the end of the prologue | Olov, 3 Oct |
| The secret | Pappa's first trägubbe, carved for Elof when he was about three and lost on the mountain. Little Elof shared his Saturday sweets with it, which is why the ghost takes the bag. The game names no year. | Olov, 3 Oct; the retelling in plan §2.4 and §3.4 is the session's |
| The ghost's name | *Klonk*, after its footsteps. Elof names it in the epilogue; until then it is "spöket". | Olov asked for a name, 3 Oct; the name is the session's proposal |
| Dates | None. Stages in order; a release goes out when its checkpoint has passed. | Olov, 3 Oct |
| Testing | Only Olov tests before Elof plays. H2 and H3 are his own tests. | Olov, 3 Oct |
| Voices | None: no read-aloud, no recordings. Characters make wordless sounds. | Olov, 3 Oct |
| Logotypes | None anywhere. The star on the real ghost's shoes becomes a plain disc. | Olov, 3 Oct |
| Characters | Every character is designed in Blender, with no paid AI tool: Elof and the ghost first, then the family, little Elof, the trägubbar and the animals (plan §5.6) | Olov, 3 Oct |
| The ghost model | After the two photos of the carving, with the render and the poster for what they don't show. It has hands, as on the poster and the render. No scan. | Olov, 3 Oct |
| The places | Storklocken as the model for the mountain. Plates rendered in Blender after the landscape references; ambience CC0 or synthesised. The jay and the church bells at 18:00 stay. | Olov, 3 Oct ("what is recommended") |
| Candy | The family likes every kind. The golden candy is a geléhallon in gold paper; at the party Elof chooses who gets what. | Olov, 3 Oct; the geléhallon is the session's choice |
| More players | "Ny spelare" always exists; each player picks *Äventyr* or *Lugnt* | Olov, 3 Oct |
| Jump physics | Gravity follows from the plan's numbers: a held jump tops out at 1.1 EL and carries 2.2 EL at a run, so gravity is 22.3 EL/s². Letting go of Hoppa on the way up makes Elof 1.8 times heavier, which makes a tap top out at 0.6 EL. | Session, 3 Oct (`src/sim/constants.ts`) |
| Hoppa's release | Not queued. Hoppa's held state is read once per frame, and that is enough for a tap inside one frame to be a hop (`src/app/game.ts`). The plan's §4.1 expected releases in the queue. | Session, 3 Oct |
| planck's scale | `lengthUnitsPerMeter` is 0.2, as the plan says. planck doesn't scale its polygon skin with it, so a body rests 0.019 EL above the ground; the simulation takes that off Elof's reported height. | Session, 3 Oct (`src/sim/sim.ts`) |
| Reference pictures | In `photos/`, ignored by git. **Every picture in its root is used** for the characters, the ghost and the house: the table in plan §2 says what each one decides. `photos/landscape/` is for the surroundings. | Olov, 3 Oct |

## Planned against actual

| Stage | Planned sessions | Actual | Olov's rounds (planned / actual) | Notes |
| --- | --- | --- | --- | --- |
| Planning | 1 | 3 | — / 2 | Plan versions 1–4; `main` and the placeholder page; the reference pictures gathered |
| 0a Foundation | 1–2 | 1 so far | 1 / 0 so far | Part 1 in the same session as plan version 4: the scaffold, the simulation, the input port, the test course, the tests and both workflows. Part 2 is left. |

## Known bugs

- None known.
- Not checked yet: the two workflows on GitHub, and the game on a real phone or tablet. The browser test ran in
  headless Chromium with software rendering, so its frame times say nothing about a device.
- The stand-in Elof slides a little at the edge of a block before he drops: his body is a box. Stage 1's
  controller (ledges, slopes, steps of 0.3 EL) replaces it.

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

Two choices the session made, for Olov to overrule if he wants:
- the name *Klonk* (two others that were considered: Kvist and Flisa);
- the plain disc instead of the star on the ghost's shoes, because the star on a red canvas shoe reads as a brand.
