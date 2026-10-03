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
  - `.mcp.json` declares the Blender MCP server with telemetry off and safe mode on. **It has not run yet,**
    because `uv` is not installed on Olov's computer.
- **Not built:** any game code. The repository holds documents, the placeholder page and its workflow.
- **Olov's computer** (checked 3 October): Windows 11, an RTX 3070, Node 24.14, git, and Blender 4.5.9 LTS with
  the *MCP for Blender* add-on running on port 9876, with only Poly Haven ticked. Not installed: `uv`, `gh`,
  `exiftool`, `ktx`.

## Next

1. **Olov connects Blender to Claude Code** (about five minutes; plan §5.6, §6.14):
   1. install `uv`: `winget install --id=astral-sh.uv -e` in PowerShell;
   2. restart VS Code, so that Claude Code finds `uvx`;
   3. keep Blender open with the add-on connected, and approve the `blender` server when Claude Code asks;
   4. ask the session what the Blender scene holds. It should list the cube, the camera and the light.
   - In the add-on's panel, keep only *Poly Haven* ticked. Never tick *Hunyuan*.
2. **Stage 0a** (plan §7.3), in a cloud session or on Olov's computer:
   - the Vite + TypeScript + three scaffold, both real workflows (replacing the placeholder), and the privacy gate;
   - a test scene live on Pages with `noindex`;
   - the input port with a greybox Elof;
   - `?debug`, `?bench`, `dev/menus.html` and `npm run dev:lan`;
   - the asset chain proven end to end (Blender → glTF → KTX2 → Pages). In a cloud session this uses headless
     `bpy`; on Olov's computer, Blender itself;
   - record whether Pages compresses `.wasm`, `.glb` and `.ktx2`;
   - note how to install `ktx` and `exiftool` on Windows.
3. **Stage 0b** (look-dev) and **Stage 0c** (characters) need Olov's computer and step 1: the golden frames, then
   Elof and the ghost in Blender (plan §5.6).
4. **Before Stage 0c:** the private repository `spokets-godisbus-familj`, a read-only token, and the secrets
   `FAMILY_ASSETS_TOKEN` and `PRIVACY_DENYLIST` (plan §6.11).
5. **Whenever Olov can:** his own photos of Storklocken's top, the rapids in the village and Näsbacken. No openly
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
| The ghost model | After the two photos of the carving, with the render and the poster for what they don't show. No scan. No hands, as on the carving. | Olov, 3 Oct; "no hands" is the session's reading |
| The places | Storklocken as the model for the mountain. Plates rendered in Blender after the landscape references; ambience CC0 or synthesised. The jay and the church bells at 18:00 stay. | Olov, 3 Oct ("what is recommended") |
| Candy | The family likes every kind. The golden candy is a geléhallon in gold paper; at the party Elof chooses who gets what. | Olov, 3 Oct; the geléhallon is the session's choice |
| More players | "Ny spelare" always exists; each player picks *Äventyr* or *Lugnt* | Olov, 3 Oct |
| Reference pictures | In `photos/`, ignored by git | Olov, 3 Oct |

## Planned against actual

| Stage | Planned sessions | Actual | Olov's rounds (planned / actual) | Notes |
| --- | --- | --- | --- | --- |
| Planning | 1 | 3 | — / 2 | Plan versions 1–4; `main` and the placeholder page; the reference pictures gathered |

## Known bugs

- None: there is no game code yet.

## Senare (wishes for a later release)

- (empty)

## Frågor till Olov

Both are in plan §0, "Kvar att svara på". Neither blocks the work.

1. **Do Elof's parents know about the game, or is it a surprise for them too?** The default: Olov judges the
   likeness himself, and Pappa reads the storyboard of the memories before the first one is built, late in
   Stage 2. Also: does Pappa's real first trägubbe still exist at home?
2. **Which devices does Olov have for testing?** The default: he tests on what he has and in Chrome on the
   computer, and a device class he lacks is first measured when Elof plays.

Three choices the session made, for Olov to overrule if he wants:
- the name *Klonk* (two others that were considered: Kvist and Flisa);
- no hands on the ghost, as on the real carving, although the render and the poster show hands;
- the plain disc instead of the star on the ghost's shoes, because the star on a red canvas shoe reads as a brand.
