# Elof och det stora godisäventyret – rules for working sessions

The game is designed in `docs/game-plan.md` (the plan). `HANDOVER.md` says what is done, what is next and what
Olov still has to answer. Read both before anything else.

## Start of a session

1. Read `HANDOVER.md`.
2. Once code exists: run `npm ci && npm test`, which includes the robot playthrough. If it fails, fix that first.
3. Run `npm run dev`, open the game with `?debug`, and check that it still starts and plays.

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
  and "Frågor till Olov".
- Contact sheets come only on checkpoint PRs, committed by the session: WebP at 390×844, 844×390, 1180×820 and
  1440×900, under `docs/shots/<chapter>/`, showing a stand-in figure for the family.
- Use Playwright 1.56.1, the version whose browser is preinstalled in cloud sessions.

## Rules that protect the family (plan §2.6)

- Everything in this repository, and everything on the site, is public, and git history is permanent.
- **Names.** The children are Elof, Moa and Bertil. The parents are only **Mamma** and **Pappa**: never their
  first names, never a surname.
- **Places.** "Bredbyn" is the finest location allowed in the repository. In the game itself the village,
  church and rivers are not named. Never a house number, an address, a school, coordinates or anyone's account
  names.
- **The house** is described only in general terms (plan §2.5).
- **Pictures.**
  - Never commit reference photos, the AI character sheets or likeness renders.
  - Ask Olov to attach them with names and numbers cropped off, and keep working copies in the session
    scratchpad.
  - The family's game models and textures live in the private repository `spokets-godisbus-familj` (plan §6.11).
- **Voices.** No recording of a real family voice is published. Family recordings stay on the tablet.
- **Consent.** Nothing new and personal is added until both parents have said yes (plan §0 Q4).

## Licences

Every third-party or generated file is listed in `LICENSES.md` under one of three categories (plan §5.6):
- **open:** CC0, CC-BY (credited), OFL, MIT, BSD, Apache-2.0;
- **owned by Olov:** paid-tool output and AI-painted plates;
- **made by the family, with consent.**

Never Mixamo, ActorCore, Megascans/Fab, Textures.com or free-tier AI output. No CDNs, analytics or third-party
requests on the site.

## Releases

- Merge at least 15 minutes before Elof plays: GitHub Pages caches `index.html` for 10 minutes.
- Then open the game once on Elof's device, so the service-worker update is in place.

## Where things will live (plan §6.3)

| What | Where |
| --- | --- |
| All player-facing Swedish text | `src/content/sv.ts` |
| Chapters: terrain, props, candy, hooks, triggers, camera zones, light | `src/content/chapters/*.ts` (units: EL, one Elof length) |
| Pure simulation (no three, no DOM) | `src/sim/` |
| Rendering (`WebGLRenderer`, r186, HDR output with `setEffects`) | `src/render/` |
| DOM menus, HUD, bubbles | `src/ui/` |
| Input (ported from Sköldhästen) | `src/input/` |
| Audio | `src/audio/` |
| Saving | `src/save/` |
| Art sources and generators | `art/`; session bake in `scripts/bake/`, packs by `scripts/build-assets.mjs` |
