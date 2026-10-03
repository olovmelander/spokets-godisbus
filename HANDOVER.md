# Handover

## State (3 October 2026)

- **Done:** the plan, `docs/game-plan.md` version 2: research, design, art direction, technology and delivery,
  revised after a five-angle review (plan §8).
- **Not built:** any code. The repository holds only documents.

## Next

1. **Consent.** Olov gets a written yes from both of Elof's parents for the items in plan §0 Q4. Until then
   nothing new and personal is committed. If they say no to anything already here, the repository can still be
   recreated from scratch: it holds only planning documents.
2. **Olov answers the rest of plan §0.** The ★ questions come first: Elof and his device, the scale, the secret,
   the dates, network access.
3. **Before the first deploy** (plan §6.11):
   - create `main` from the planning branch and make it the default branch;
   - set *Settings → Pages → Source* to *GitHub Actions*;
   - create the private repository `spokets-godisbus-familj`, a read-only token, and the secrets
     `FAMILY_ASSETS_TOKEN` and `PRIVACY_DENYLIST`;
   - open the environment's network access for the asset hosts (plan §0 Q6), or put downloads in `art/vendor/`.
4. **Stage 0a** (plan §7.3):
   - the Vite + TypeScript + three scaffold, both workflows, and the privacy gate;
   - a test scene live on Pages with `noindex`;
   - the input port with a greybox Elof;
   - `?debug`, `?bench` and `dev/menus.html`;
   - the asset chain proven end to end;
   - record whether Pages compresses `.wasm`, `.glb` and `.ktx2`.

## Decisions in effect until Olov answers (plan §0 defaults)

| Question | Default |
| --- | --- |
| Elof and his device | 6–7 years, not a fluent reader, a tablet held in landscape; *Läs upp* and sound on in his profile |
| Scale | (a): Elof shrinks to the ghost's size at the end of the prologue |
| The secret | The ghost carries Pappa's memory of his first trägubbe; memories show only hands until Pappa says yes |
| Consent and privacy | The children's first names and Bredbyn as the setting; parents only as Mamma and Pappa; the house "clearly alike"; no new personal material before both parents say yes |
| Dates | Utgåva 1 by Christmas 2026; Version 1.0 in spring 2027 |
| Characters | Elof by Route A (a paid image-to-3D month) and Route B (code) in parallel; the ghost in code first |
| The mountain | Storklocken as the model, unnamed in the game |
| Voices | *Läs upp* with on-device voices; family recordings offered, kept on the tablet |

## Planned against actual

| Stage | Planned sessions | Actual | Olov's rounds (planned / actual) | Notes |
| --- | --- | --- | --- | --- |
| Planning | 1 | 1 | — | Plan version 2 |

## Senare (wishes for a later release)

- (empty)

## Frågor till Olov

See plan §0.
