# The UX, UI and presentation audit (5 October 2026)

Olov asked for the storytelling, the story and the game to be "perfect and best in class", and named the work:
"improve the artwork, storytelling and presentation, ux and ui. I want best in class ux and ui and game to really
get an atmosphere and style that suits this game!" He also set the yardstick: "It is a game for a 11+ year old."
Elof is 7 and plays games for 11+, so the measure is the best adventure games for that age, not apps for small
children.

Six auditors each took one area. Each read the code that builds it, looked at pictures of the running game and
measured the built game in a browser: boxes, gaps, fonts, contrast, timings and scroll heights. The sizes were
844×390 (a phone held sideways), 390×844 (held upright), 780×360 (the S23 held sideways), 1180×820 (the iPad) and
1440×900 (a computer), with stand-ins for the family. Each auditor then wrote down:

- what a stranger notices in the first ten seconds;
- 21 to 25 findings with the fix for each;
- the five to do first;
- questions for Olov.

Together they made 137 findings. A research note on how the best games of this kind make their UI part of their
world came first ([research/ux-craft.md](research/ux-craft.md)). Most of its sites could only be read through
search excerpts, and it marks those. The pictures and measuring scripts were working files in the session and are
not in the repository: contact sheets come only on checkpoint pull requests.

| Area | Findings | The audit |
| --- | --- | --- |
| The first minutes, from the tap to play | 23 | [first-minutes.md](ux-audit/first-minutes.md) |
| What is on screen while he plays | 25 | [in-play.md](ux-audit/in-play.md) |
| The menus and collections between play | 24 | [menus.md](ux-audit/menus.md) |
| How the story is presented | 22 | [story-presentation.md](ux-audit/story-presentation.md) |
| The UI's style and sound: its design language | 21 | [style-and-sound.md](ux-audit/style-and-sound.md) |
| Access and devices: every hand, eye and device | 22 | [access-and-devices.md](ux-audit/access-and-devices.md) |

## What already works, and stays

- **The pictures that tell the premise without words.**
  - The loading card's carved ghost clutches the candy bag.
  - The opening fades up on Pappa's hands carving, with "Lördagsmorgon" on a scrap of paper.
  - The time cards are scraps of Moa's paper.
- **The bag as a meter on an object.** It fills with red and bumps on each candy. The stickers are pictures of the
  game's own 3D sweets: the one place where the UI and the world already share a material.
- **The touch scheme.**
  - A floating stick on the left half, one big jump button, and a contextual action above it.
  - No move needs two buttons.
  - *Vänsterhänt* mirrors the controls, and every control is clear of the notch.
  - The controls follow the hand in use: a touch shows them, a key or a pad hides them.
- **The story's grammar.**
  - Warm black bars only while he is held, and a fade from black.
  - The storybook page in the right order: the photo glued in from the coda's own frame, the name, the caption, and
    Moa's crayon drawing the way on, with the tally last.
  - The memories in sepia cut paper, growing from where they were touched.
- **Calm, true words.** "Spelet är pausat och det du har gjort är sparat." Codes forgive any order and any case.
  Destructive questions focus "Nej" first.
- **Sound and access that already work.**
  - The sound engine: an air for each place, wood knocks, a wordless phrase in each speaker's timbre, and the
    iPhone's silent switch respected.
  - Offline play works.
  - Nothing flashes.
  - Focus stays inside every panel.
  - Plain play costs the page 0.24 ms of styling and no layout per frame.

## What lets it down most

1. **It speaks like a web app.** The device's system font, cream rounded boxes and browser checkboxes. Symbols are
   typed characters that look different on iOS and Android, and every tap in a menu is silent. The world is paper,
   wood and candy; the UI is not yet (style-and-sound rows 1–21).
2. **The title menu comes between chapters, and Back goes a chapter back.**
   - In the public game "Nästa kapitel", "Spela igen" and a right code went page, loading card, title ("Fortsätt",
     "Börja om från början"), and only then the next chapter's card.
   - On the Android phone the Back gesture reopened the chapter left behind and moved the save back to it.
   - No browser suite saw either, because every suite adds `debug` (first-minutes 3, story-presentation 13,
     access 20). **This pull request mends both.**
3. **The story is shown with the HUD left on.**
   - Six controls stay at 28 % over every held scene.
   - The bag, the corners and "Just nu" float bright over the fade from black.
   - The game's title is at full strength for 1.8 s, while the camera still moves, across the family's heads
     (story-presentation 1–5).
4. **The main buttons fail their words.**
   - Three CSS rules are invalid (`font: 600 13px/1 inherit`), so browsers drop them. *Hoppa*, *Använd*, the name
     and code fields and two buttons are set in the browser's 13.3 px Arial.
   - The words are white on red at 4.1:1 and on green at 3.5:1.
   - *Hoppa* is 96 px, about 16 mm on the iPhone.
   - 13 of the 41 verb words wrap, and 8 run past the button's rim.
   - Keyboard and gamepad players never see the verb or the helper's knock. *Mindre rörelse* hides the knock from
     everyone (in-play 4–8, 12; access 1, 2, 11, 15, 16).
5. **Every speaker looks the same, at half the width.**
   - A bubble can never be wider than half the screen, so Moa's "plats!" ends up alone on a second line.
   - Mamma's and Moa's bubbles are identical, and the name is grey at 3.8:1.
   - Late in the story the sticker strip on the bag covers the bubble's start (in-play 14–17).
6. **Pause is a long web form.**
   - At 844×390 it is 3,083 px in a 366 px panel: 8.4 panel heights and 27 focus stops.
   - The ✕ scrolls away.
   - Moa's map is 5.4 heights down with no title, and "Jag har fastnat" is the last thing in the panel
     (menus 1–6).
7. **The first minute asks a lot.**
   - On a phone held sideways, two menus and 354 characters come before the first input.
   - A tap made while loading is dropped.
   - "Äventyr" cuts to black with the HUD floating on it.
   - The best parts (the paper, the hands, the tune) come last (first-minutes 1, 6–8, 12, 16).
8. **The page is still a dialog.**
   - Its heading is "Kapitel 1 klart!", not the chapter's name.
   - The story caption is 15 px, smaller than the candy count.
   - Moa's map shrinks to 300×142 px, with labels 5 to 9 px tall.
   - On the iPad and a computer the page is a 460 px column that scrolls (story-presentation 6–9).

## The design language

From the style-and-sound audit, with one material for each job (research §1):

- **Moa's paper and crayon carry what is read:** bubbles, cards, captions, the map, the page.
- **Pappa's painted wood is what you press:** planks with a painted face that sink when pressed, in rödfärg red and
  paint green, and the carved title sign.
- **Candy is the reward:** the bag, the stickers, the candy-painted letters of the game's name.

It is concrete enough to build:

- **Type.** Andika 400 and 700 for reading, the face plan §5.7 chose and never added: 33.6 KB as Latin-1 WOFF2.
  Playpen Sans 700 for Moa's hand: 12.3 KB. Both are self-hosted and OFL. One size scale with a 16 px floor, and
  *Större text* as a single ×1.25.
- **Colour.** Tokens in place of 53 hex and 27 `rgb()` values and about 20 different creams.
  - Rödfärg `#9b3325` under white is 6.87:1, and paint green `#2c6a45` is 6.11:1.
  - Soft ink replaces opacity.
  - The focus ring is 3 px `#1d4f91` outside a paper halo.
- **Icons.** One drawn sprite of 43 symbols, 2.5 KB gzipped, in place of the 27 typed characters.
- **Motion.** *Mindre rörelse* and the device's own setting turn the same moves into fades, and neither hides a cue.
- **Sound.** Wood, paper and crayon taps in the chapter's key, on a fourth bus that stays live in menus. The tune
  goes on muffled under a panel instead of stopping.

The cost against the gates: about −0.1 KB of JavaScript, about +52 KB of boot (of 3,072), and no draw calls.

## The order of the work

One pull request per visible outcome, each in a cloud session. None raises `RELEASED_CHAPTER`. The UI's sound
(step 8) joins the narrative audit's step 3, "sound that carries the story", as one pull request.

0. **This pull request.** The audit; chapters that open on their card, not the title; Back that no longer goes a
   chapter back.
1. **Every word in its own type.** The font reset and a test against `inherit` in a `font:` shorthand. The two
   fonts, self-hosted; the size scale and one *Större text*. The colour tokens, the button states and the focus
   ring (style 1–3, 5–9, 11; access 9, 10, 12).
2. **The controls a thumb can trust.**
   - *Hoppa* is 116 px and *Använd* 100 px on an arc, with real labels; the verb goes on a tag beside the disc.
   - The helper's button sits beside Pause.
   - The knock shows under every motion setting, and keys and pad get a prompt with the verb.
   - The stick hides at rest, and the key line shows only when needed (in-play 4–9, 12, 19; access 1, 2, 11, 15,
     16).
3. **Every speaker their own.** Bubbles at their full width and clear of the corners. A colour, a name and a
   portrait for each speaker. Long enough on screen, and longer with *Lugnare tempo* (in-play 14–17).
4. **A clear screen for the story.** No HUD in held scenes, on time cards or in the coda, and the fade over
   everything. The game's title held 3.6 s once the camera has settled, in the sky, never over the family
   (story-presentation 1–5).
5. **A pause that is short.**
   - A sticky header with a drawn ✕.
   - A top level that opens on Moa's map, with "Jag har fastnat" near the top.
   - *Godispåsen* and *Inställningar* as pages of their own, and settings with pictures, drawn switches and
     groups.
   - The small defects (menus 1–6, 9, 11, 14, 19, 21).
6. **One movement from the tap to the story.**
   - Presses made while loading are kept and shown.
   - The title fades into the morning, with the HUD hidden until play.
   - One tap to play on a phone held sideways, with the two style pictures as the start buttons
     (first-minutes 1, 4–8, 12, 16).
7. **The materials.** Paper, painted wood and candy over the panels and the HUD, the carved title sign, and the
   drawn icons (style 4, 10, 12–15).
8. **The UI's sound,** with the narrative audit's step 3 (style 20, 21).
9. **The page as a page.** The chapter's name; the story as the photo's caption at 19 px; a 3:2 photo framed on
   Elof; the spread on every landscape screen; the map at a size to read (story-presentation 6–9).
10. **The collections.** The album laid out by chapter, *Hittegods* in pictures, and memories without interface:
    three times the size and a dissolve (menus 12, 13; story-presentation 20).
11. **A picture for every verb,** on the button and over the thing in the world (in-play 6).

The narrative audit's later steps continue around these: the ghost's sharpening thought, the family between help
points, and each chapter's own moment. The visual audit's remaining steps wait for Olov's computer where they need
Blender.

## The budgets every step lives inside

- JavaScript at most 450 KB gzipped (437.9 now); the boot at most 3,072 KB as served (1,360.9 now).
- Draw calls 120, 160 and 200 on Low, Mid and High; the UI adds none.
- No third-party request: fonts are self-hosted and listed in `LICENSES.md` as open (OFL).
- No logotypes or brand marks.
- No voices: characters keep their short wordless phrases.
- All Swedish in `src/content/sv.ts`, and bubbles at most about 40 characters.
- Everything that moves has a still form under *Mindre rörelse* and the device's reduced-motion setting.

## For Olov to decide

Each has a default, so the work goes on until he says otherwise.

1. **Moa's hand.** Should her words (the time cards, the map's names and perhaps the chapter titles) be Playpen Sans
   in crayon, or her own crayon lettering scanned on Olov's computer? Her handwriting is not on the consent list,
   so her parents would be asked first. Default: Playpen Sans.
2. **Paper or kraft.** Plan §5.7 has the panels in brown kraft. The audit proposes Moa's white drawing paper for what
   is read (ink on it is 13.6:1, on kraft 6.3:1) and kraft only for *Godispåsen*, the album. Default: white paper,
   kraft for the album.
3. **Sound under a menu.** The tune muffled and quiet while a panel is open, or silence as now, with only the taps?
   Default: muffled.
4. **The candy number.** Always on screen, or for 3 s after each candy and in Pause, with the bag always there?
   Default: the latter.
5. **Reading.** Does Elof read the bubbles himself? The answer sets how long they stay. Default: about 6 s for 40
   letters, up from 4.4 s.
6. **The first start.** One screen with the two play-style pictures over the living morning, or straight into the
   morning with the choice after the prologue's title? Default: the one screen.
7. **Phones held upright.** Does Elof ever play that way? Default: no; a card asks him to turn the phone, and the
   upright layout is mended only where it breaks.
8. **A gamepad.** Is there one in the house, and which kind? Default: none; the letters stay.
9. **The grown-ups' settings.** Should *Grafik*, the key reference, the home-screen help and the chapter code sit
   behind a two-second press? Default: an open group named *För vuxna* at the end of *Inställningar*.
