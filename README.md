# Elof och det stora godisäventyret

A 2.5D adventure for a seven-year-old, in the forests and bogs of Ångermanland. Pappa's carved wooden ghost comes
alive, steals Elof's giant bag of Saturday sweets and drops a trail of candy behind it. Elof follows it,
through the yard, the spruce forest, past the brook and over the misty bog, up the mountain, to find out *why*.

- **Status:** the prologue, four chapters, final and epilogue are playable with
  [`?dev`](https://olovmelander.github.io/spokets-godisbus/?dev), followed by the bonus chapter
  [Byn](https://olovmelander.github.io/spokets-godisbus/?dev&course=byn). The plain address keeps the grey
  test course until Olov releases a chapter. `HANDOVER.md` records the remaining art and device checkpoints.
- **Run it:** `npm ci`, then `npm run dev` and open `http://localhost:5173/spokets-godisbus/?debug`.
  - It needs the KTX-Software `ktx` tool for the asset build; `HANDOVER.md` says how to install it.
  - `npm test` runs the simulation tests and the robot; `npm run build && npm run test:browser` plays it in a
    browser.
  - `?bench` measures for half a minute; `dev/menus.html` shows the controls and messages without the game.
  - Paus includes *Följ fingret*, saved *Auto / Låg / Mellan / Hög* graphics, and the keyboard/controller
    reference. The bag, G or gamepad View opens the album.
  - `?tier=low`, `mid` or `high` temporarily overrides saved graphics for inspection.
- **The plan:** [`docs/game-plan.md`](docs/game-plan.md), covering:
  - the design, and the art direction after *Unravel*;
  - the technology: Three.js r186 (`WebGLRenderer`), Vite, Blender and GitHub Pages;
  - the delivery stages.

  Its §0 holds Olov's answers, and the two questions that are still open.

Working on the game in a Claude Code session? Read [`CLAUDE.md`](CLAUDE.md) and [`HANDOVER.md`](HANDOVER.md)
first.
