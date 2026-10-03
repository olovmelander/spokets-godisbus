# Handover

## State (3 October 2026)

- **Done:**
  - The plan, `docs/game-plan.md` version 3: research, design, art direction, technology and delivery. Version 3
    takes in Olov's answers of 3 October (plan §8).
  - `main` created from the planning branch, with a placeholder page in `site/` and a minimal Pages workflow,
    `.github/workflows/deploy.yml`. Its first run deployed successfully (run 37121042291).
- **Not built:** any game code. The repository holds documents, the placeholder page and its workflow.

## Next

1. **Olov: three clicks in GitHub** (this session's GitHub access can't change settings or start workflows):
   1. *Settings → General → Default branch*: switch to `main`.
   2. *Settings → Pages → Build and deployment → Source*: *GitHub Actions*. Pages is still set to *Deploy from a
      branch*: when `main` was created on 3 October, GitHub's own branch build ran next to our workflow, finished
      last, and most likely published the README (built with Jekyll, without `noindex`) instead of the placeholder.
      Every push to `main` repeats that race until the source is switched.
   3. *Actions → Deploy to GitHub Pages → Run workflow*, on `main`, so the placeholder is what's published.
   - If that run says `main` is not allowed to deploy to `github-pages`: *Settings → Environments → github-pages →
     Deployment branches*, add `main`, and run it again. (The first run deployed from `main` without trouble.)
   - Then the placeholder is at `https://olovmelander.github.io/spokets-godisbus/`: `noindex`, and linked from
     nowhere.
2. **Olov answers the rest of plan §0.** The ★ questions come first: the scale (Q2), the new secret, which Pappa
   reads (Q3), and the surprise and dates (Q5). Q16 asks about Olov's computer.
3. **Stage 0a** (plan §7.3), in a cloud session or on Olov's computer:
   - the Vite + TypeScript + three scaffold, both real workflows (replacing the placeholder), and the privacy gate;
   - a test scene live on Pages with `noindex`;
   - the input port with a greybox Elof;
   - `?debug`, `?bench`, `dev/menus.html` and `npm run dev:lan`;
   - the asset chain proven end to end (Blender → glTF → KTX2 → Pages);
   - record whether Pages compresses `.wasm`, `.glb` and `.ktx2`.
4. **Before Stage 0b,** on Olov's computer (plan §6.14): Blender 4.5 LTS, *MCP for Blender* registered with
   `DISABLE_TELEMETRY=true` and safe mode on, `uv`, Node 24, and the reference pictures in `references/`.
5. **Before Stage 0c:** the private repository `spokets-godisbus-familj`, a read-only token, and the secrets
   `FAMILY_ASSETS_TOKEN` and `PRIVACY_DENYLIST` (plan §6.11).

## Decisions in effect

| Question | Decision | Source |
| --- | --- | --- |
| Elof as a player | 7 years, plays games for 11+. Play style *Äventyr* by default (variable jump, a swing he pumps, the glitter bubble, exciting sequences, challenge routes); *Lugnt* for anyone who wants it. Help only when asked; *Läs upp* off. | Olov, 3 Oct |
| Devices | A new iPad, an iPhone, or an Android phone in the Samsung S23 class; tuned for the High tier | Olov, 3 Oct |
| Consent | Both parents say yes to everything, and every name may be used. Still never surnames, house number or address, coordinates, the school or account names (plan §2.6). | Olov, 3 Oct |
| Renderer | Three.js r186 `WebGLRenderer` on WebGL 2 | Olov, 3 Oct |
| Where work happens | Mostly on Olov's computer, with Blender through *MCP for Blender*; cloud sessions for code | Olov, 3 Oct |
| Scale | (a): Elof shrinks to the ghost's size at the end of the prologue | Default, plan §0 Q2 |
| The secret | Pappa's first trägubbe, carved for baby Elof and lost on the mountain; Pappa reads the storyboard first | Default, plan §0 Q3 |
| Dates | Utgåva 1 by Christmas 2026; Version 1.0 in spring 2027 | Default, plan §0 Q5 |
| Characters | Elof by Route A (Meshy Pro, finished in Blender) and Route B (built in Blender) in parallel; the ghost modelled in Blender | Default, plan §5.6 |
| The mountain | Storklocken as the model | Default, plan §0 Q8 |
| Voices | *Läs upp* available but off for Elof; family recordings offered, kept on Elof's device | Default, plan §0 Q9 |

## Planned against actual

| Stage | Planned sessions | Actual | Olov's rounds (planned / actual) | Notes |
| --- | --- | --- | --- | --- |
| Planning | 1 | 1 | — | Plan versions 1–3; `main` and the placeholder page |

## Known bugs

- None: there is no game code yet.

## Senare (wishes for a later release)

- (empty)

## Frågor till Olov

See plan §0, "Kvar att svara på": Q2, Q3, Q5 (★), then Q7–Q16.
