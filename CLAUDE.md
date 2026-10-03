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

## End of a session

- `npm run typecheck`, `npm test` and `npm run build` pass. The build fails if a size budget in plan §6.12 is
  broken.
- `HANDOVER.md` is updated: done, next, decisions, known bugs, and "Frågor till Olov".
- Contact sheets go under `docs/shots/<chapter>/`, as WebP at 390×844, 844×390, 1180×820 and 1440×900. Take
  them with `scripts/shots.mjs` once it exists.

## Rules that protect the family (plan §2.6)

- Everything in this repository, and everything on the site, is public.
- First names only: Elof, Moa, Bertil, Sofie (Mamma) and Emil (Pappa). Never a surname, a house number, a
  school, coordinates, or the names of anyone's online accounts.
- "Bredbyn" is the finest location allowed. The area name in Olov's brief may be added only after Emil and Sofie
  have said yes (plan §0 Q4). Git history is permanent.
- Describe the family's house in the repository only in general terms (plan §2.5).
- Never commit the reference photos or the AI character sheets. Ask Olov to attach them, and keep working
  copies in the session scratchpad. Only game models and textures derived from them go in, once Olov has
  approved the likeness.
- Recordings of family voices need that person's (or their parents') specific OK.

## Licences

Every third-party file is listed in `LICENSES.md` with its source and licence. Allowed: CC0, CC-BY (credited),
OFL, MIT, BSD and Apache-2.0. No CDNs, analytics or third-party requests on the site.

## Releases

Merge at least 15 minutes before Elof plays. GitHub Pages caches `index.html` for 10 minutes.

## Where things will live (plan §6.3)

| What | Where |
| --- | --- |
| All player-facing Swedish text | `src/content/sv.ts` |
| Chapters: terrain, props, candy, hooks, triggers, camera zones, light | `src/content/chapters/*.ts` (units: EL, one Elof length) |
| Pure simulation (no three, no DOM) | `src/sim/` |
| Rendering (`WebGLRenderer`, r186) | `src/render/` |
| DOM menus, HUD, bubbles | `src/ui/` |
| Input (ported from Sköldhästen) | `src/input/` |
| Audio | `src/audio/` |
| Saving | `src/save/` |
| Art sources and generators | `art/`, built by `scripts/build-assets.mjs` |
