# Elof och det stora godisäventyret – rules for working sessions

The game is designed in `docs/game-plan.md` (the plan). `HANDOVER.md` says what is done, what is next and what
Olov still has to answer. Read both before anything else.

## Start of a session

1. Read `HANDOVER.md`.
2. Once code exists: run `npm ci && npm test`, which includes the robot playthrough. If it fails, fix that first.
3. Run `npm run dev`, open the game with `?debug`, and check that it still starts and plays.
4. Know which kind of session this is (plan §6.14). On Olov's computer, Blender and the asset sites are reachable.
   In a cloud session they are not, so leave Blender work for Olov's computer and say so in `HANDOVER.md`.
   - The Blender tools exist only when `uv` is installed, Blender is open with its add-on connected, and Olov has
     approved the `blender` server from `.mcp.json`. If they are missing on his computer, say so before anything
     else.

## One PR, one visible outcome

- Never start the next chapter's content in the same PR.
- Keep `RELEASED_CHAPTER` (`src/content/world.ts`) at the last released chapter. Raising it *is* the release.
- Work on a branch and merge to `main` through a pull request. `main` deploys to GitHub Pages.
- Olov merges. If he agrees, a session may merge its own green PR when it doesn't touch `RELEASED_CHAPTER`,
  likeness assets or these rules.
- After Utgåva 1's checkpoint H3, new wishes go to the "Senare" list in `HANDOVER.md`.

## End of a session

- `npm run typecheck`, `npm test`, `npm run build` (size gates) and `npm run privacy-check` pass.
- `HANDOVER.md` is updated: done, next, decisions, known bugs, the planned-against-actual row, the "Senare" list,
  "Frågor till Olov", and whether the next step needs Olov's computer.
- Contact sheets come only on checkpoint PRs, committed by the session: WebP at 390×844, 844×390, 780×360,
  1180×820 and 1440×900, under `docs/shots/<chapter>/`, showing a stand-in figure for the family.
- Use Playwright 1.56.1, the version whose browser is preinstalled in cloud sessions.

## Rules that protect the family (plan §2.6)

Both parents have said yes to everything in the plan's consent list, and every name may be used (3 October
2026). Everything in this repository and on the site is still public, and git history is permanent.

- **Names.** The children are Elof, Moa and Bertil; the parents are Mamma Sofie and Pappa Emil. In the game Elof
  calls them Mamma and Pappa. Never a surname.
- **Places.** Bredbyn, Näsbacken and the real places nearby may be named. Never a house number, a street
  address, the house's coordinates, the school or anyone's account names.
- **Pictures.**
  - Never commit reference photos, the AI character sheets or likeness renders. They are in the `photos/` folder
    on Olov's computer, which git ignores, or come as attachments; working copies stay in the session scratchpad.
  - **Every picture in the root of `photos/` is used.** The table in plan §2 says what each one decides. Before
    building a character, the ghost or the house, open all of its pictures as reference images in Blender, and
    show Olov the model beside them.
  - One house photo shows the house number, and the phone screenshots show account names. Never model, draw or
    write down either.
  - The pictures in `photos/landscape/` are other people's, mostly under CC BY-SA (`SOURCES.md` there lists each
    one). They are references for the surroundings: look at them, and never use them as plates or textures.
  - The family's game models, textures and `.blend` files live in the private repository
    `spokets-godisbus-familj` (plan §6.11), so they can always be taken down.
- **Voices.** The game has none: nothing is read aloud and nothing is recorded (plan §0 Q9). Characters make
  short wordless sounds.
- **Consent.** Anything comes out again if a parent asks. Anything personal not on the consent list is asked
  about first (plan §2.6).

## Olov's standing decisions (plan §0)

- **No logotypes or brand marks** on any model, texture or screen: plain shapes instead.
- **One tester, no dates.** Only Olov tests before Elof plays, and a stage is done when its checkpoint passes.
- **Elof and the family are generated from Olov's sheets by image-to-3D and finished in Blender** (his decision,
  3 October 2026). Nothing is uploaded until he has chosen the service and it passes the checks in
  `docs/art-bible.md` §1.6; never a free tier. The ghost and everything else are designed in Blender. No other
  paid AI tool without asking Olov first.
- **The ghost is "spöket"** in the game's text until Elof names it *Klonk* in the epilogue.

## Blender (plan §5.6, §6.14)

- *MCP for Blender* runs with `DISABLE_TELEMETRY=true` and `BLENDER_MCP_SAFE_MODE=1`. Both are set in `.mcp.json`;
  don't register the server any other way. Never tick its telemetry consent box or accept its opt-in prompt:
  opting in uploads screenshots and scene data, which would include the family's models.
- In the add-on's panel only *Poly Haven* is ticked. *Hyper3D Rodin* and *Sketchfab* stay off unless a task needs
  one and follows the rules below.
- Blender 4.5 LTS, matching `bpy` 4.5.14 in cloud sessions.
- Save and commit before large operations. Exports go through `scripts/bake/export.py`.
- Every asset fetched or generated through it gets a `LICENSES.md` entry. Sketchfab and Poly Pizza: CC0 or CC BY
  only. Never Hunyuan3D.

## Licences

Every third-party or generated file is listed in `LICENSES.md` under one of three categories (plan §5.6):
- **open:** CC0, CC-BY (credited), OFL, MIT, BSD, Apache-2.0;
- **owned by Olov:** paid-tool output and AI-painted plates;
- **made by the family, with consent.**

Never Mixamo, ActorCore, Megascans/Fab, Textures.com or free-tier AI output. No CDNs, analytics or third-party
requests on the site.

## Releases

- Merge at least 15 minutes before Elof plays: GitHub Pages caches `index.html` for 10 minutes.
- Then open the game once on each device Elof plays on, so the service-worker update is in place.

## Where things live (plan §6.3)

| What | Where |
| --- | --- |
| All player-facing Swedish text | `src/content/sv.ts` |
| Chapters: terrain, props, candy, hooks, triggers, camera zones, light | `src/content/chapters/*.ts` (units: EL, one Elof length) |
| Pure simulation (no three, no DOM) | `src/sim/` |
| Rendering (`WebGLRenderer` on WebGL 2, r186, HDR output with `setEffects`) | `src/render/` |
| DOM menus, HUD, bubbles | `src/ui/` |
| Input (ported from Sköldhästen) | `src/input/` |
| Audio | `src/audio/` |
| Saving | `src/save/` |
| Art sources and generators | `art/` (`.blend` sources in `art/blender/`); exports in `scripts/bake/`, packs by `scripts/build-assets.mjs` |
| The game without a screen: simulation, loop, press queue | `src/app/game.ts` |
| Tests: Vitest; the robot; the browser smoke test | `tests/unit/`, `tests/sim/`; `tests/robot/`; `tests/browser/smoke.mjs` (`npm run test:browser`, after a build) |
| The size gate and the privacy check | `scripts/size-gate.mjs` (part of `npm run build`); `scripts/privacy-check.mjs` |
| Reference pictures, never committed | `photos/` (ignored by git; Olov's computer only) |
