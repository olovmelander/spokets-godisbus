# UX audit: what is on screen while he plays

> One of six audits of the UI, the UX and the presentation, made on 5 October 2026 at `0295eec`. Area: the HUD (the
> candy bag, pause, the helper's button), the touch controls (the stick, *Hoppa*, *Använd* and its verb words,
> *Vänsterhänt*, *Följ fingret*), the keyboard and gamepad hint line, speech bubbles, notices, the "Just nu" card,
> help when asked, the overlaps between them, and how much of the picture they cover. Line numbers are of that day.

I read `src/ui/hud.ts`, `shell.ts`, `story-context.ts`, `tutorial.ts`, `scene.ts` and `ui.css`; `src/input/input.ts`;
`src/main.ts`; the helper in `src/sim/sim.ts`, `src/sim/help.ts` and `src/render/props.ts`; `src/content/sv.ts`,
`story-context.ts` and the chapters' spots, beats and scenes. I measured them against plan §4.1, §4.6 and §5.7 and
the research note's §2, §5 and §6. I looked at the shared pictures `phone/` and `portrait/` `play-garden`,
`card-garden`, `prolog-morning` and `prolog-bubble`, `phone/act-word`, `phone/memory` and `ipad/play-garden`. I also
took eight pictures of my own at tier Low with stand-ins, under `ux-shots/in-play/`:
- `phone-hud-full`: 844×390, late in Gården, with a bag of 37, fifteen stickers and Moa's longest line, after a stick drag;
- `portrait-notice`: a find at 390×844, after a stick drag;
- `portrait-bigtext-bubble`: the same line at 390×844 with *Större text*;
- `phone-help-step2`, `phone-help-step3` and `phone-help-step2-calm`: the jay's help at 844×390, the last with *Mindre rörelse*;
- `desktop-help-step2-keys`: the jay's help at 1440×900 on the keyboard;
- `portrait-card-fade`: Gården's time card coming up from black.

Crops are in `in-play/crops/`. The same Playwright 1.56.1 run measured boxes, computed fonts and button states
(`in-play/measurements.json`). It also measured each of the 41 verb words line by line on the real *Använd* button
(`in-play/verb-lines.json`). Touch drags were real touch events sent through the DevTools protocol. Contrast ratios
are computed from the CSS colours with the WCAG formula. The bubble queue was modelled from the chapter data
(`inplay-tools/scenes.ts`).

**The inventory's defects, checked:**
- **D1, verified.** The computed label on *Hoppa* is Arial 13.33 px, weight 400 (crops `phone-act-word-buttons`, `ipad-buttons`).
- **D5, verified.** At help step 2 on the keyboard nothing shows the verb or a pulse (`desktop-help-step2-keys`).
- **D6, verified.** With *Mindre rörelse*, step 2 looks the same as without it: measured `animation: none`, `outline: none` (`phone-help-step2-calm`).
- **D7, verified.** The stick ring is left over Elof's legs (`phone-hud-full`) and in the middle of the deck (`portrait-notice`).
- **D8, verified.** All its parts:
  - the time card lies on *Hoppa* and the stick (`portrait/card-garden`, `portrait/prolog-morning`);
  - the bag covers the notice (`portrait-notice`) and the bubble (`portrait/prolog-bubble`, `portrait-bigtext-bubble`);
  - the bag, the corners and "Just nu" stay bright over the fade from black (`portrait-card-fade`); the hint line,
    shown only for keys and pad, does too by the code (it comes after the fade in the page).
- **D10, verified.** Mamma (`phone/prolog-bubble`) and Moa (`in-play/phone-hud-full`) get the same bubble.

**New defects, not in the inventory:**
- bubbles and notices can never be wider than half the screen (row 14);
- the helper's pulse makes an out-of-reach *Använd* look ready while it does nothing (row 8);
- the helper's three steps start again from step 1 after 12 s (row 20);
- *Lugnare tempo* doesn't lengthen bubbles (row 17);
- at the jay the helper is a second, identical jay (row 21).

## What a stranger notices in the first ten seconds

**What is good.** The frame is calm:
- cream discs sit in the corners;
- *Hoppa* is a big red disc with an arrow;
- the stick is a faint ring;
- the chapter opens on a scrap of paper, "Gården · klockan tio";
- the paper bag that fills with red is the one piece of HUD that belongs to the world.

**What is bad.** A game meant to work without words greets him with words. Before anyone speaks, three labels are
on screen:
- "Just nu" and "Följ spöket. Hitta min påse.", at 10 and 13 px;
- "Använd", on a dimmed disc;
- "Hoppa".

The last two are in the browser's own 13 px Arial, not the game's font. When someone speaks, a cream pill appears
at the top centre with a small grey name. Mamma and Moa look the same. On a phone Moa's line breaks with "plats!"
alone on its second line, because the box can only use half the screen. Late in the story the bag has become a
228 px strip of tiny stickers that covers the start of the bubble. In portrait with *Större text* it hides the
speaker's name. As a chapter comes up from black, the bag, pause, help and "Just nu" float bright over the dark
picture, and in portrait the time card lies on *Hoppa*.

## What already works and stays

- **The scheme** (research §6):
  - a floating stick on the left half;
  - one large jump button, with the contextual action above it;
  - no move needs two buttons;
  - safe-area insets throughout, and the buttons, bag and corner discs ×1.15 on tablets;
  - *Vänsterhänt* mirrors the sides;
  - *Följ fingret* is there for a child who struggles with the stick.
- **Hoppa's red disc with its up arrow.** The knob turns yellow at a run: a quiet cue that needs no word.
- **The bag is a meter on an object** (research §1, Unravel). Its red rises, it bumps to 1.18 on each candy, and a
  tap opens the album.
- **Pause** is one 64 px disc at the top right, its icon at 10.2:1.
- **Bubbles:**
  - every line is within 40 characters;
  - each plays one wordless phrase in the speaker's timbre (research §5);
  - a bubble never stops play;
  - a held scene clears lines that would arrive stale;
  - "Just nu" steps aside for bubbles, notices and scenes.
- **The letterbox bars** fade the controls, corners and bag to 28% in a held scene: hands rest, without a word.
- **Help** comes in three steps through a character and ends in a demonstration (the "super guide"), with a help
  level per player.

## The findings

| # | Where (file:line or surface) | What is wrong, as the player meets it | The fix, concrete (sizes, colours, words, behaviour) | Files | Cost S/M/L | Value 1-3 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The bag's sticker strip, `hud.ts:101-116`, `ui.css:212-246` | Each kind found adds a 17 px sticker to the bag pill. With fifteen kinds, late in the story, the pill is 228×65 px: 27% of the width at 844×390 and 58% at 390×844. It holds three rows of stickers too small to tell apart, and it runs under the bubble (row 15). Verified: measured; `in-play/phone-hud-full`, `portrait-bigtext-bubble`. | No sticker row in play. A new find shows its sticker at 40 px beside the bag for 3 s with the find tag (row 18), then it drops into the bag (0.4 s; a fade under *Mindre rörelse*). The pill stays at most 110 px wide. The stickers live in the album (44 px) and on the chapter page (30 px). | `hud.ts`, `ui.css` | S | 2 |
| 2 | The bag's number, `#bag`; plan §5.7 l. 1624; research §2 | The bag and its count are on screen all the time: 92×64 px at 0 candy. The plan keeps them. The research says a counter appears when it changes, then leaves. The number is the only HUD text that changes in play. Verified: measured; `phone/play-garden`. | Keep the bag as a 64 px disc: it is the meter and the album button. Show the number for 3 s after each candy, with today's 1.18 bump, and while paused, then fade it out over 0.4 s. The top-left corner then mirrors the pause disc. This is Olov's choice (question 1). | `hud.ts`, `ui.css` | S | 1 |
| 3 | The helper's button, `ui.css:321-327`; `audio/cues.ts:212` | It is 52 px, 10 px under pause (pause 10–74, help 84–136): under the plan's 64 px and 12 px (§4.1, l. 972). A press shows nothing on the button: `ui.css` has no `:active` or pressed style at all. Step 1 makes no sound; only step 2 knocks. Nothing tells him that pressing again gives more. Verified: measured; code. | Make it 64 px with a 36 px portrait and a 14 px gap. On press, scale to .92 for 120 ms, with a soft chirp for the jay or a wood tick for the ghost. Put three 8 px pips under the portrait, filled to the helper's step and emptied when it leaves. | `ui.css`, `shell.ts`, `main.ts`, `audio/cues.ts` | S | 2 |
| 4 | The labels on *Hoppa* and *Använd* (D1), `ui.css:103` | `font: 600 13px/1 inherit` is not a valid shorthand, so it is dropped. The label is the browser's button font: computed Arial 13.33 px, weight 400, unlike every other text in the game. White on #dd4b39 is 4.1:1 and on #3f9a5a 3.5:1; WCAG AA asks 4.5:1 at this size. Verified: computed style; crops `phone-act-word-buttons`, `ipad-buttons`. | `font-family: inherit; font-weight: 700; font-size: calc(15px * var(--k)); line-height: 1.05`; 18 px with *Större text*. Fills #cf4434 for *Hoppa* (4.6:1) and #2f7d47 for *Använd* (5.1:1), with the white rim kept. Make the same correction in `.code-form input` (`ui.css:1108`) and `.message button` (`:1224`). | `ui.css` | S | 3 |
| 5 | *Använd*'s word, `hud.ts:93-100`, `ui.css:124-139`; `granskog.ts:233` | The word must fit in an 84 px disc under a 34 px hand. On the real button, 13 of the 41 words break onto two lines (17 with *Större text*). In 14 words a line runs past the disc's inner edge, in 8 of them past the 3 px rim onto the picture, by up to 7 px. With *Större text* it is 21 and 13 words, by up to 13 px: "Visa Moa / teckningen", "Ta / lysklubban", "Ge / lavskrikan", "Kasta snöret". At Granskogen's jay the spot has no word, so the button says only "Ge"; `sv.verbs.giveJay` exists but is unused there. "Ta!" and "Måla ögonen!" carry an exclamation mark that no other verb has. Verified: measured line by line (`verb-lines.json`); code. | The disc keeps only the verb's icon (40 px, row 6). The word goes on a paper tag left of the disc, centred on it: #fff6e2, radius 6, 16 px bold #3d2b1f, padding 6×10, at most two lines and 150 px wide, 10 px from the disc. It shows only while a verb is offered, and mirrors with *Vänsterhänt*. Give the jay spot `word: 'giveJay'`, and drop the "!" from "Ta!" and "Måla ögonen!". | `shell.ts`, `hud.ts`, `ui.css`, `granskog.ts`, `sv.ts` | S–M | 3 |
| 6 | *Använd*'s picture, `shell.ts:11`, `hud.ts:98`; the glints, `view.ts:1695-1717`; plan l. 948, 1151, 1617 | Every verb shows the same open hand, so the button says nothing to a child who doesn't read the word. In the world, a usable thing is marked by a gold diamond, not by the verb's icon. The plan asks for an icon for every verb, on the button and floating over the target. Verified: code; pictures. | Draw about ten icons in `shell.ts`'s style (24-unit box, 1.8 stroke): a closing hand (take, pick), a hand with a sweet (give), two cupped hands with three arcs (call), a hand with an arrow (push, pull, turn), a boot on a step (climb on, board, ride), a slide, a brush, a knife held away (carve), a sweet (taste), a house (home, bed), a toothbrush, and a ring on a string (lace, lower). `hud.verb()` swaps the svg. The glint becomes a 0.5 EL sprite of the same icon on a cream disc. | `shell.ts`, `hud.ts`, `view.ts` | M | 3 |
| 7 | When something comes in reach, `hud.ts:93-100`, `ui.css:120-122`; research §2, §5 | The button just stops being dim. Nothing moves and nothing sounds, so a running child's eye isn't caught. The resting button carries the word "Använd", which is abstract and is one more word on screen. Verified: code. | At rest: the hand only, with no word, at opacity .3. When a verb appears: a 160 ms pop (scale .86, then 1.06, then 1), the verb's icon and tag (rows 5–6), and one soft wood tick in the chapter's key (research §5). Under *Mindre rörelse* there is no pop, and the tick stays. | `hud.ts`, `ui.css`, `audio/cues.ts` | S | 2 |
| 8 | The helper's pulse (D6), `ui.css:329-349`, `hud.ts:117-125`, `props.ts:687` | Step 2's cue is a shadow that grows from 0 px at 90% to 14 px at 0%. At its strongest it is a 7 px halo at 45%, and #ffd76a is 1.4:1 to the white rim and 1.3:1 to a pale grass green such as #b9c98a. In the step-2 picture it can't be seen: measured 3.2 px at 69% at that moment. Under *Mindre rörelse* the animation is removed and nothing replaces it, and the helper's knock isn't drawn either (`knock = !still && …`), so the cue is sound only (research §9). Out of reach, the pulse sets opacity 1 on a disabled button: it looks ready, and pressing it does nothing (measured: disabled, opacity 1). Verified: `phone-help-step2`, `phone-help-step2-calm`, `phone-help-step3`; computed style. | Show a static 4 px #ffd76a ring and a 24 px helper badge (the jay or the ghost) at the disc's top left, in every motion setting. Where motion is allowed, add a slow breath (scale 1 to 1.06 every 1.4 s) instead of the halo. Out of reach: opacity .6, the word on its tag, and a small arrow on the ring toward the target's side. Under *Mindre rörelse* the helper shows a still knock mark (two small arcs) over the target instead of the bounce. | `ui.css`, `hud.ts`, `props.ts` | S | 3 |
| 9 | The stick left behind (D7), `input.ts:170-220` | `endStick` takes away the "on" and "run" classes but keeps the ring's place. After the first touch, the 120 px ring stays wherever the thumb last landed, at 40%: over Elof's legs in landscape, mid-deck in portrait. At rest it is 1.05–1.7:1 to the scene, so it vanishes on pale ground and reads as a smudge over Elof. Verified: `phone-hud-full`, `portrait-notice`; computed contrast. | On release, ease the ring back to its rest place in 180 ms. After the prologue's move lesson, hide it at rest (opacity 0) and show it under the thumb at .7, like GRIS's subdued floating stick (research §6). | `input.ts`, `ui.css` | S | 2 |
| 10 | The button size and press state, `ui.css:115-139`; research §6, §9 | *Hoppa* is 96 px, about 1.6 cm on the family's phones (an iPhone shows 153 CSS px to the inch). The research gives about 2 cm for children and a button-size setting; there is none. The press state (scale .93, brightness 1.15) happens under the thumb, so it isn't seen; Apple asks for one visible "even when their finger is covering the control". Verified: CSS; arithmetic. | Add a *Stora knappar* switch in Pause: *Hoppa* 120 px, *Använd* 104 px, with a 16 px gap (the stack then fills 260 of 390 px in landscape). While a button is held, add a 6 px ring outside the disc: `box-shadow: 0 0 0 6px rgb(255 255 255 / .6)`. | `ui.css`, `settings.ts`, `pause.ts`, `shell.ts`, `sv.ts` | S | 2 |
| 11 | *Följ fingret*, `input.ts:124-163, 468`, `ui.css:1271-1273` | The stick is hidden, and nothing marks the held finger or where Elof is going until he moves, 350 ms later. A held finger only walks him (deflection × 0.6, never a run), in chases too. Verified: code. | Put a 56 px ring (3 px, white at 70%) round the finger, so its edge shows round the fingertip, and a small crayon arrow over Elof's head toward it. Beyond 120 px from Elof the deflection reaches 1, a run. Test the cone slope in Granskogen on *Äventyr* with it. | `input.ts`, `ui.css`, `main.ts` | S | 1 |
| 12 | Keyboard and gamepad (D5), `main.ts:287-292` | For keys and pad, all of `#controls` is hidden, so *Använd*'s word and the helper's pulse never show. At step 2 the desktop picture has only the knock and the hint's general "E använd". Verified: `desktop-help-step2-keys`. | For keys and pad, show the *Använd* disc in its touch place at 72 px. It is clickable and appears only while a verb is offered or the helper knocks. It has the verb's icon, a keycap "E" in its corner (on a pad, the position glyph from row 13), the word on its tag, and row 8's ring and badge. | `main.ts`, `hud.ts`, `ui.css`, `shell.ts` | S–M | 3 |
| 13 | The hint line, `ui.css:1169-1186`, `sv.ts:45-46` | An 88-character line of text stays at the bottom all the time: 684×36 px at 844×390 and at 1440×900. Plan §5.7 and research §2 both say nothing else stays. It leaves out H (help), G (album) and Esc. The pad line names Xbox letters, "A hoppa" and "X använd"; on a PlayStation pad the same positions are ✕ and □. Verified: measured; `desktop-help-step2-keys`. | Three 36 px keycaps instead of the sentence: [← →], [␣] and [E], each with one 13 px word under it. Show them for the first 30 s, or until each has been used once, then never again; the full list stays in Pause under *Tangenter och handkontroll*. On a pad, show position glyphs (a diamond of four dots with the pressed one filled), or ✕ and □ when `gamepad.id` names Sony's vendor 054c. | `main.ts`, `ui.css`, `sv.ts`, `shell.ts` | S | 2 |
| 14 | The bubble's and notice's width, `ui.css:810-826`, `1150-1162` | Both are placed with `left: 50%` and `translateX(-50%)`, so the box can never be wider than half the screen, and `max-width: min(64%, 560px)` never applies. Measured: 422 px at 844 px wide. There Moa's 39-letter "Där kröp spöket in. Jag får inte plats!" leaves "plats!" alone on its second line. At 390 px the box is 195 px: "Bertil! Godiset öppnar vi ikväll." takes three lines, and Moa's line four with *Större text*. The notice uses the same CSS. Verified: measured; `in-play/phone-hud-full`, `portrait/prolog-bubble`, `portrait-bigtext-bubble`. | `left: 0; right: 0; margin-inline: auto; width: max-content; transform: none`. Keep `max-width: min(64%, 560px)` in landscape, where every 40-letter line fits on one line at 21 px, and use `calc(100% - 24px)` in portrait. Add `text-wrap: balance` for the lines that still wrap. | `ui.css` | S | 3 |
| 15 | Bubbles and notices under the corners, `.bag` and `.corner` at z 2, `.bubble` and `.notice` at z auto | The bag and the corner discs are drawn over bubbles and notices. In portrait with *Större text*, the bag (12–240 px) covers "MOA" and half of "Där kröp" in a bubble at 98–293 px. In landscape it covers the bubble's left end, and in portrait the notice's (D8). Row 14 widens the box, so the overlap grows unless the box keeps clear of the corners. Verified: `portrait-bigtext-bubble`, `in-play/phone-hud-full`, `portrait-notice`; measured. | Give bubble and notice `z-index: 3`. In landscape, hold the bubble between the corner groups: `max-width: min(64%, 560px, 100% - 256px)`, with the bag at most 110 px wide (row 1). In portrait (`orientation: portrait`), put both under the corner row at `top: calc(env(safe-area-inset-top) + 160px)`, below a 64 px help disc. | `ui.css` | S | 3 |
| 16 | Who speaks (D10), `hud.ts:167` (sets `data-who`, which no CSS reads), `ui.css:832-837` | Mamma, Pappa, Moa, Bertil, Elof and the ghost all get the same cream pill. Only the name differs: 13 px grey capitals at 60% ink, 3.8:1, and it is the first thing hidden in a collision (row 15). A child who doesn't read the name cannot tell who speaks. The speaker isn't shown where they stand either (`docs/narrative-audit/threads.md` row 24). Verified: `phone/prolog-bubble` (Mamma), `in-play/phone-hud-full` (Moa); code. | For each speaker, add a 6 px band on the left in the person's sign colour (`props.ts:189-193`: Moa #5b7fb5, Pappa #5a7d4a, Bertil #d98a2c, Mamma's white with a red heart). Elof (#2f5f9e) and the ghost (wood #8a5a32) are proposed here. Set the name at 15 px bold in a darker tone, each at 4.9:1 or more on #fff6e2: Moa #41659b, Pappa #4b6b3d, Bertil #9c5a17, Mamma #bf3d36, Elof #2f5f9e, the ghost #8a5a32. Add a 32 px portrait disc at the left from `story.ts:11-15`, recoloured to the sign colours; today they disagree (Pappa green on the sign, brown in the portrait; Bertil orange and olive). Use Moa's paper as on the time card (#fff6e2, radius 6, ±1° tilt by speaker), with a tail on the speaker's side. | `ui.css`, `hud.ts`, `story.ts`, `people.ts` (shared colours), `props.ts` | S–M | 3 |
| 17 | How long a bubble stays, `hud.ts:47-48, 149-170`, `main.ts:913` | 2.2 s plus 0.055 s a letter is about 18 letters a second after the first 2.2 s: "Gör det ont?" stays 2.9 s, and a 40-letter line 4.4 s. The clock is real time, not game time, so *Lugnare tempo* (80%) doesn't lengthen it, and neither does *Större text*. A notice hides a bubble in mid-line and brings it back 3.5 s later (`hud.ts:155`). Verified: code; queue model. | 2.5 s plus 0.09 s a letter: 12 letters 3.6 s, 40 letters 6.1 s. Divide by the tempo (×1.25 on *Lugnare tempo*) and add ×1.2 with *Större text*. In a held scene a new line replaces the one showing instead of queueing. With the longer time and today's queue, 3 of the prologue's 9 scene lines would start late, by up to 2.1 s (today 2, by up to 0.7 s). With row 18, a find no longer hides a bubble. | `hud.ts`, `main.ts` | S | 2 |
| 18 | Notices, `hud.ts:101-116, 126-131`, `ui.css:1150-1166`, `main.ts:279-283` | "Ny sort: Geléhallon!" is 15 px text at the top centre, against the plan's 22 px body minimum, with no picture of the sweet; the 17 px sticker appears on the bag separately. A notice takes the bubble's place and hides it. The save-off notice skips the HUD with a 7 s `setTimeout` and can lie over a bubble. Verified: `portrait-notice`; code. | Make a find tag that hangs from the bag: the 40 px sticker and the name at 19 px bold, on Moa's paper, for 3 s, after which the sticker drops into the bag (row 1). Other notices, such as the thanks and "Hela gräsmattan glittrar!", use the same tag with the panel's icon. Send `saveOff` through `hud.notice` with 7 s. | `hud.ts`, `ui.css`, `main.ts` | S–M | 2 |
| 19 | "Just nu", `ui/story-context.ts:12-29`, `ui.css:1233-1261`, `content/story-context.ts` | A text box stays at the top left through all play, hidden only under bubbles, notices and scene bars. It measures 198–233 × 45–49 px. Its text is 13 px with a 10 px "Just nu", under iOS's 11 pt minimum and the plan's 22 px. Its sign is a Unicode character (→ ♡ ✦ ✎ △ ≈ ⌂) that draws differently on iOS and on Android. Plan §5.7: "Nothing else stays on screen during play." Whether it shows always or on change is Olov's open question (`threads.md` row 23; `HANDOVER.md` question 15). Verified: measured; `phone/play-garden`, `phone-help-step2`. | Whichever he chooses: 17 px text with a 13 px label, and a drawn icon in Moa's crayon (the ghost with an arrow for following, a heart for helping, a brush, a house). Show it for 6 s when it changes and after 8 s standing still, fading in over 0.3 s; never during rides, memories or the coda; always in the pause recap. | `ui/story-context.ts`, `content/story-context.ts`, `ui.css`, `main.ts` | S | 2 |
| 20 | Help that starts over, `sim.ts:550-553, 572-575`, `constants.ts:147` | A press goes "one step further" only within 12 s of the last one (`HELP_TIME`), and only while he has not picked up a candy or set a flag on the way (either makes the helper leave). After that the next press is step 1 again. A child who watches the jay, tries, and asks again 20 s later never gets the knock or the demonstration. The plan says each tap goes one step further (§4.6). Verified: code. | Keep the last step for the same `help.at` for 60 s after the helper leaves, and carry on from it; start again when the target changes. Show the step on the button's pips (row 3). | `sim.ts`, `sim/types.ts`, `tests/sim` | S | 2 |
| 21 | Step 3 and the two jays, `props.ts:628, 688` | The demonstration is about fifty white dots, each 0.026 EL (about 4 px at 844×390), at 65% among grass blades: in the picture they read as specks, half behind a jay. At Granskogen's jay the helper, also a jay, lands 0.45 EL from its target, so two identical birds stand side by side. Verified: `phone-help-step3`, crop `help-step3-zoom`; code. | Make the dots 0.05 EL, each over a dark dot at 30% so they hold on pale ground, and draw the figure 0.3 EL nearer the camera than any prop. A bird helper perches 1.6 EL above its target (on a twig or the stone's top), never beside an animal target. | `props.ts`, `helper-demo.ts` | S | 2 |
| 22 | The time card in portrait (D8), `ui.css:1425-1441` | `bottom: max(9vh, 66px)` puts the paper card at 723–772 px, on *Hoppa* (728–824) and on the resting stick (682–802). Verified: measured; `portrait/card-garden`, `portrait/prolog-morning`. | In portrait, lift the card above the controls: `bottom: calc(env(safe-area-inset-bottom) + 250px)`. In landscape it stays where it is. | `ui.css` | S | 2 |
| 23 | The HUD over the fade from black (D8), `.scene-fade` (z auto) under `.bag` and `.corner` (z 2) and the later `#storyPurpose` | As a chapter comes up from black, the bag, pause, help and "Just nu" stay at full brightness over the dark picture, while the stick and the buttons are under it. Verified: `portrait-card-fade` (fade 0.37 at the time of measuring). | `.scene-ui` makes no stacking context, so give `.scene-fade` `z-index: 4` and `.scene-caption` and `.scene-title` `z-index: 5`. The fade then covers the whole HUD, the bars stay below the corners as now, and the words stay on top. | `ui.css` | S | 2 |
| 24 | The tutorial's hand on *Använd*, `ui.css:1345-1350` | The animated hand sits at top 30, left 34 inside a 96 px box centred on the button: over the lower right of the disc, where the word is. "Kliv upp" is half covered the first time Elof meets a verb word. The tutorial itself is the first-minutes audit's area. Verified: `phone/act-word`, crop `phone-act-word-buttons`. | The hand presses from the disc's left edge (top 40 px, left −20 px, turned 20°), so the lower half stays clear. | `ui.css` | S | 1 |
| 25 | How much the HUD covers at 844×390, all of the above | On touch, the permanent HUD covers 13.6% of the picture at a chapter's start: 44,643 of 329,160 px². That is the bag 5,894, pause 3,217, help 2,124, "Just nu" 9,318, the resting stick 11,310 at 40%, *Använd* 5,542 at 35% and *Hoppa* 7,238. Late in the story it is 16.1% (the sticker bag), and 25.3% while a bubble shows. The research keeps only a small pause icon (§2); the plan keeps the bag, pause, companion, stick and buttons (§5.7). The keyboard layout at 1440×900 covers 3.5%. Verified: measured (`measurements.json`). | Rows 1, 9 and 19 remove the strip, the resting stick and the card. With the bag as a disc (row 2) and help at 64 px (row 3), the permanent HUD is about 6.8%: pause, bag disc, help, *Använd* at rest and *Hoppa*. With row 14, a 40-letter bubble is one line, 64 px shorter than today's two. | as rows 1, 2, 3, 9, 19 | S | 2 |

## The five to do first

1. Rows 14 and 15: give the bubble and notice box its intended width, put it above the corners and keep it clear
   of them, under the corner row in portrait (S).
2. Rows 4 and 5: give *Hoppa* and *Använd* real labels (15 px bold at 4.5:1), and move the verb word onto a tag
   beside the disc, so that no word leaves it (S–M).
3. Rows 16 and 17: give each speaker a colour, a 15 px name and a portrait, and keep bubbles up long enough for a
   first-year reader (S–M).
4. Rows 8 and 12: make the helper's step 2 visible in every motion setting and on keys and pad (D5, D6), and stop
   it from lighting up a button that cannot be pressed (S–M).
5. Row 6: give every verb its icon, on the button and over the thing in the world (M). Next after these: the HUD
   diet of rows 1, 9, 19 and 23 (S).

## Questions for Olov

1. **The candy number.** Should it stay on screen all the time, as the plan has it now, or show for 3 s after each
   candy and in the pause panel, with the bag itself always there? The default: the latter.
2. **Elof's reading.** Does he read the bubbles himself, and does anyone read them with him? The answer sets how
   long they stay: now 4.4 s for 40 letters, proposed 6.1 s. The default: the longer time.
3. **Where bubbles go.** Should they sit at the speaker, comic-style with a tail (docked at the screen's edge when
   the speaker is out of the picture), or stay a line at the top with the speaker's portrait and colour? The
   default: the portrait line at the top now (row 16), and bubbles at the speaker later (`threads.md` row 24).
