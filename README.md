# Elof och det stora godisäventyret

A 2.5D adventure for a seven-year-old, in the forests and bogs of Ångermanland. Pappa's carved wooden ghost comes
alive, steals Elof's giant bag of Saturday sweets and drops a trail of candy behind it. Elof follows it,
through the yard, the spruce forest, past the brook and over the misty bog, up the mountain, to find out *why*.

- **Status:** Stage 0a, the foundation. The site shows a greybox test course: a stand-in Elof who walks, runs
  and jumps. Nothing of the story is built yet.
- **Run it:** `npm ci`, then `npm run dev` and open `http://localhost:5173/spokets-godisbus/?debug`.
  `npm test` runs the simulation tests and the robot; `npm run build && npm run test:browser` plays it in a browser.
- **The plan:** [`docs/game-plan.md`](docs/game-plan.md), covering:
  - the design, and the art direction after *Unravel*;
  - the technology: Three.js r186 (`WebGLRenderer`), Vite, Blender and GitHub Pages;
  - the delivery stages.

  Its §0 holds Olov's answers, and the two questions that are still open.

Working on the game in a Claude Code session? Read [`CLAUDE.md`](CLAUDE.md) and [`HANDOVER.md`](HANDOVER.md)
first.
