# UX audit: the UI's style and sound

> One of six audits of 5 October 2026. The auditor read the brief, the inventory, the research note (§1, §5, §8),
> the art bible, plan §5.7, §5.8, §6.8 and §6.10, then all of `src/ui/ui.css`, `index.html`, every file in
> `src/ui/` and `src/audio/`, and the audio wiring in `src/main.ts`, at 0295eec. Pictures: the shared set at
> 844×390, 390×844, 1180×820 and 1440×900 (stand-ins, High), and six of the auditor's own in
> `ux-shots/style-and-sound/`: `big-text-pause.png` (the game at 844×390 with *Större text* on), and five sketches
> of the proposal (`mock-title`, `mock-play`, `mock-panel`, `type-specimen`, `icons`), rendered from scratch HTML
> over one clean frame of the running garden (`ux-style/clean-garden-844.png`). The sketches are not the game's
> code, and a few of their icons (*Gården*, *Myren*) need a second drawing at 24 px. Measured: computed styles in
> Playwright 1.56.1's Chromium; contrast by the WCAG formula; fonts with fonttools 4.66 on the `@fontsource` 5.3.0
> packages; the size gate on the `dist/` the pictures came from. Each row says how it was verified. Rows found
> elsewhere too are marked with the other audit's row; this audit gives the system behind them.

## What a stranger notices in the first ten seconds

- **Good.** The loading card's ghost is a real drawing of the carving holding its bag. The paper bag in the corner
  fills with red as candy comes in, and the stickers are pictures of the game's own 3D sweets: the one place where
  the UI and the world share a material. The creams sit well on the wooden deck.
- **Bad.** The voice is a web app's. The device's system font in bold, cream rounded boxes and pills, browser
  checkboxes, the browser's own focus ring, and a title that is a heading in a dialog. In play, a red and a green
  circle carry 13 px Arial words. Icons are half drawn SVG and half typed symbols from fallback fonts. Every tap in
  a menu is silent, and the title has no sound at all.

## What already works and stays

- The loading card: an inline drawing of the carving, no request, its bob stopped under reduced motion.
- The bag that fills (`clip-path` and `scaleY`) and bumps to 1.18 for each candy, with tabular figures on its count.
- The stickers rendered in Blender from the candy models (`kinds.webp`, 24 KB), each with a pale edge.
- The chapter's page: the snapshot glued at −1.4°, and Moa's red crayon drawing the way on in 1.8 s, shown whole
  under reduced motion.
- The memories: sepia cut-outs in an oval that grow from their source in 360 ms and only fade under reduced
  motion. That is the pattern the rest of the UI should follow.
- The sound engine: one context, three buses and a compressor, Karplus–Strong plucks, wood knocks, an air for
  each place, a wordless babble for each speaker, and the iPhone's silent switch respected
  (`audioSession.type = 'ambient'`). The UI sounds below are built from it.
- All text is DOM text, nothing is fetched from anyone else, and the service worker already precaches `*.woff2`.

## The findings

| # | Where (file:line or surface) | What is wrong, as the player meets it | The fix, concrete (sizes, colours, words, behaviour) | Files | Cost S/M/L | Value 1-3 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ui.css:103` (`.btn`), `:1108` (`.code-form input`), `:1224` (`.message button`); `#endingContinue` (`ending.ts:7`, no font rule). Measured: computed style | *Hoppa*, *Använd* and its words (*Kliv upp*, *Ropa på Moa*), the code and name fields, *Försök igen* and the ending's *Spela vidare* are set in 13.33 px regular Arial, the browser's control font. `font: 600 13px/1 inherit` is invalid (`inherit` cannot stand inside a shorthand), so the whole declaration is dropped. *Större text* lifts the two HUD labels to 16 px and leaves the other four at 13.33. The instances are in-play row 4, first-minutes row 15, menus row 19 and story-presentation row 16; this is their cause | First rule in ui.css: `button, input, select { font: inherit; color: inherit; }`. Then `.btn { font-weight: 700; font-size: var(--t-hud); line-height: 1.1 }`, `.code-form input { font-weight: 700; font-size: var(--t-code); line-height: 1.2 }` and `.message button { font-weight: 700; font-size: var(--t-button-main) }`. A unit test reads ui.css and fails on any `font:` shorthand that contains `inherit` | `src/ui/ui.css`, `tests/unit/` | S | 3 |
| 2 | `ui.css:16`; plan §5.7. Code, pictures | The UI has no typeface of its own. `system-ui` is SF Pro on the iPad and iPhone, Roboto on the Android phone and DejaVu Sans in these pictures, so the game's voice changes with the device. None of them has the single-storey a and g a first-year reader learns. The plan chose Andika (§5.7), and it was never added | Andika 400 and 700 (SIL, OFL 1.1, no Reserved Font Name), subset to Latin-1: 16,744 and 16,872 bytes as WOFF2 (measured). Preloaded in index.html, `font-display: swap`, with a fallback that has Andika's measures so the title does not jump when the font arrives (see Type). `vite.config.ts:38` already precaches `**/*.woff2`. An entry in LICENSES.md under open | `index.html`, `public/fonts/`, `src/ui/ui.css`, `LICENSES.md` | S | 3 |
| 3 | Time card `ui.css:1425-1441`; the map's names `map.ts:94, 99`, `ui.css:709-718`; headings `ui.css:383-393`. Pictures `phone/card-garden.png`, `phone/pause-map.png` | Moa's hand is the game's motif, yet it is only ever drawn, never written. The time card (*Gården · klockan tio*) is bold system sans with 0.06 em of tracking on a cream box with 6 px corners. The map's names (*Hemma*, *Här är du*, *Spöket*) are bold system sans inside her crayon drawing (story-presentation row 4 has the card's place in the scene) | Playpen Sans 700 (TypeTogether, OFL 1.1), subset to the Swedish set: 12,252 bytes without its contextual alternates and 65,536 with them (measured; at 24 px the difference is hard to see, picture `type-specimen.png`). It writes Moa's words only: time cards, the map's names, panel titles, section headings and storybook titles. The crayon's wax comes from `background-clip: text` over a 64² speck texture drawn at boot (sketches `mock-title.png`, `mock-play.png`) | `src/ui/ui.css`, `map.ts`, `scene.ts`, `public/fonts/` | S/M | 3 |
| 4 | Title `shell.ts:161`, `ui.css:1050-1054`; the prologue's title card `ui.css:1443-1456`. Pictures `phone/title-first.png`, `desktop/title-first.png`; measured 34 px and 54 px | The game's name is a web heading: 34 px bold system sans in a cream box on the title, and 54 px white system sans with a dark glow on the prologue's title card. Plan §5.7 asks for headings "carved in wood, like the signpost on Olov's poster". Where the name stands is first-minutes row 5 and story-presentation row 3 | Pappa's carved sign: a linden plank hung on two strings. *Elof och det stora* is cut in and painted blue (`#2b5888`). *godisäventyret* is cut larger and painted letter by letter in the six candy colours. Each cut is darker on its upper edge and lighter on its lower lip, as the art bible draws the ghost's cuts (§1.5), and every letter has a 2 px cut edge in `--wood-dark` (6.72:1 on linden), because candy paint alone is weak on linden: yellow 1.07:1, red 2.55:1. First as live text in Andika 700 on the CSS plank (sketch `mock-title.png`, about 2 KB). Later, if wanted, rendered in Blender on Olov's computer, as `candy-stickers.py` renders the sticker sheet. The words stay in the `h1` as text | `shell.ts`, `scene.ts`, `ui.css`; later `art/blender/title-sign.py` | M | 3 |
| 5 | `ui.css:383-393` (`.panel h2`, `h3`), `:161-181` (*Större text*). Measured; picture `big-text-pause.png` | The hierarchy is upside down. Section headings (*Spelsätt*, *Grafik*, *Hjälp*) are 16 px at 75% opacity under 18 px body text. With *Större text* the body grows to 22 px and the headings stay at 16. *Större text* reaches 6 of about 25 text roles. These stay as they are: headings, the hint line (15 px), *Just nu* (10), the style cards' lines (13), the time card (21), *Börja* (21), the fields and the code | The scale in Type, applied through tokens. *Större text* becomes one multiplier: `--text-scale: 1.25` on `body.big-text`, and every size token is `calc(N * var(--text-scale))`. Headings are set apart by Moa's hand, size and colour, never by opacity | `src/ui/ui.css` | M | 3 |
| 6 | `ui.css:1254` (*Just nu* 10 px), `:1249` (purpose 13), `:476` (card lines 13), `:636` (album names 12), `:565` (photo names 13.6), `:591` (sharing 11.7), `:709-718` (map, 11 and 9.5 units). Picture `phone/end-page.png` | Text is under 14 px in twelve places, counting row 1's four and the bubble's 13 px name. The smallest is the map on the chapter's page. Its 380-unit drawing is shown about 180 px wide, so *Hemma* and *Här är du* are about 5 px tall and cannot be read | A floor of 16 px for all text, and 14 px for the map's names at their drawn size. Where the map is drawn under 300 px wide, its names go in HTML over the drawing, or the SVG's font size becomes 14 × 380 / drawn width | `src/ui/ui.css`, `map.ts` | S | 2 |
| 7 | `ui.css` (53 hex and 27 `rgb()` values); the drawings in `src/ui/*.ts` (85 hex). Code | There are no colour tokens: the only custom properties are `--k`, `--fill`, `--colour`, `--mark`, `--sx` and `--sy`. About twenty creams (`#fffaf0`, `#fff6e4`, `#f8edd6`, `#fff6e2`, `#f4ead4`, `#ecdfc6`, `#e6d6b4`, `#eee0c1` …) and three disabled opacities (0.35, 0.4, 0.45) mean that neighbouring surfaces never quite match. No part of the look can be changed in one place | The token block in Colour, on `:root`. Every rule reads tokens. The drawings use `currentColor`, or a class or a `style` with `var()` in place of a `fill` attribute. A unit test fails on any hex value in ui.css outside `:root` | `src/ui/ui.css`, `src/ui/*.ts` | M | 2 |
| 8 | `ui.css:130, 138, 432-436, 832-837, 677-683, 120-122`. Contrast computed | Four text pairs are under 4.5:1 at sizes that need it. White on *Börja* and *Hoppa*'s red `#dd4b39` is 4.09:1. White on *Använd*'s green `#3f9a5a` is 3.51:1 behind a 13.33 px word. The speaker's name at 60% opacity is 3.79:1 at 13 px. *Hittegods* at 60% is 3.62:1 at 14 px. A dimmed *Använd* (0.35 over the picture) is about 1.9:1 | Paint red `#9b3325` under `#fff8ec`: 6.87:1. Paint green `#2c6a45`: 6.11:1. Secondary text in `--ink-soft` `#5f4733` (7.87:1 on paper), never by opacity. A disabled button is bare linden with `#8a7258` words (3.0:1). It is opaque, so the place never shows through it | `src/ui/ui.css` | S | 3 |
| 9 | `ui.css:130, 433, 462, 506, 733, 1327`; art bible §2.2. Picture `phone/play-garden.png` | In the world, "Red is the candy's, the hook's and the lingonberries'". The UI's loudest red is a button: *Hoppa* is a 96 px disc in `#dd4b39`, beside karameller in `#e8483f`. The same red marks chosen cards, chosen levels, the current player and the switches' ticks | Three reds, three jobs. Pappa's rödfärg `#9b3325`, a shade from the house's `#8f2d22`, for the main press. Moa's crayon red `#c4352b` for her loop round a choice, her ticks and the way on. The candy colours only on rewards: the bag's fill, stickers, the rows of sweets and the golden reward | `src/ui/ui.css` | S | 2 |
| 10 | `ui.css:368-381, 419-441, 720-728, 810-826, 1150-1186, 1234-1267`. Pictures `phone/pause-top.png`, `phone/title-first.png` | One material for everything. The panel (`#f4ead4`, radius 22), its buttons (`#e6d6b4` pills), switch rows (`#ecdfc6`, 16), the bubble (`#fffaf0`, 22), the notice, the hint and *Just nu* are all flat cream rounded rectangles, with 11 different corner radii and 19 unrelated shadows. Nothing is paper, wood or candy, as plan §5.7 and research §1 both ask (instances: menus row 5, story-presentation row 10) | The three materials in Materials. Paper is for what is read, painted wood for what is pressed and candy for rewards. All are CSS over three textures drawn in canvases at boot (sketches `mock-play.png`, `mock-panel.png`) | `src/ui/ui.css`, a new `src/ui/textures.ts` | M/L | 3 |
| 11 | `ui.css`: no `:active`, `:focus-visible` or `:hover` anywhere, only `.btn.down` (`:115-118`). Pictures `phone/title-first.png` (ring `#e59700`, sampled), `desktop/title-first.png` (ring `#101010`) | The states are not designed. A panel button does not move when pressed (menus row 21). Focus is the browser's own ring: orange `#e59700` in the touch pictures (1.7:1 against *Börja*'s red), near-black on the computer and blue on an iPad | The states as tokens. Pressed: the plank sinks 3 px onto a 1 px edge in 80 ms. Focus: `outline: 3px solid var(--focus)` (`#1d4f91`) 4 px outside a 2 px paper halo. That is 7.43:1 on paper, and 4.49:1 for the halo over a mid-green place. Disabled: bare linden (row 8). Chosen: Moa's crayon loop, drawn in 220 ms. The helper's knock: a 4 px `#f6c445` ring (3.96:1 on paint green) | `src/ui/ui.css` | S | 3 |
| 12 | `shell.ts:92-117`, `ui.css:730-734`. Picture `phone/pause-graphics.png` | The switches are 30 px browser checkboxes: white squares with a red tick in Chromium, and iOS's own control on the iPad. They are the one thing in the panel that belongs to the browser (menus row 5 adds pictures and groups) | `appearance: none` on the input, which stays a checkbox for assistive technology. It is drawn as Moa's 34 px hand-drawn box in ink, with her red crayon tick when on (drawn in 160 ms, with a paper tap). The whole 64 px row is the target (sketch `mock-panel.png`) | `src/ui/ui.css`, `shell.ts` | S | 2 |
| 13 | 27 characters: `sv.ts:45, 50-51, 355, 494-497`; `story-context.ts:23-110`; `shell.ts:101, 109, 138, 171, 209, 226, 228`; `photos.ts:10, 13, 15-16, 46`; `memory.ts:85, 282`; `explore.ts:23-24, 33`; `title.ts:74, 83`; `story.ts:27, 62`; `story-stroke.ts:27, 128`. Code; picture `icons.png` | ← ↑ → ↓ ↩ − ≈ ⌂ ␣ ▧ △ ▶ ○ ● ☀ ★ ☆ ♡ ♧ ✎ ✓ ✕ ✚ ✦ ✧ ❀ × come from whatever symbol font the device has, at that font's weight and on its baseline. Three fonts here give three different sets. ▶, ☀ and ↩ are emoji characters and can come out as colour emoji. ♧, a playing-card club, means both *Granskogen* and *Utforska vidare*, and ⌂ means both *Godiskalaset* and *Byn*. A drawn ✕ closes one panel and a typed ✕ the next | One drawn set, as an SVG sprite inlined in index.html: 43 symbols in the sketch, 15.6 KB raw and 2.5 KB gzipped. Each is used as `<svg class="i"><use href="#i-close"/></svg>`. `sv.ts` keeps words only, and `storyContext()` returns an icon id. The drawings now in `shell.ts` (1.4 KB gzipped) move into the sprite. The list is in Icons | `index.html`, `shell.ts`, `sv.ts`, `story-context.ts`, `explore.ts`, `photos.ts`, `memory.ts`, `title.ts`, `story.ts`, `story-stroke.ts`, `tutorial.ts` | M | 3 |
| 14 | `ui.css:192-210, 299-327`. Picture `phone/play-garden.png` | The corners are see-through cream pills (`rgb(236 223 198 / .9)`). The bag, pause and the helper read as a web page's controls laid over the garden. Their sizes are in-play row 3 | Pause and the helper become linden discs: `#e6cfa4` with grain, a worn rim of `#e7cb98`, a 3 px thickness under them and the icon cut in. The bag is the paper-bag drawing itself, with its count on a small paper tag in Andika 700 at 28 px with tabular figures (sketch `mock-play.png`) | `src/ui/ui.css`, `shell.ts` | S | 2 |
| 15 | `ui.css:360, 1010`. Pictures `phone/pause-top.png`, `phone/title-first.png` | Every panel dims the place to one brown (`rgb(40 28 18)` at 0.45, and 0.6 on the title), so the garden's greens and the forest's blues go muddy round the paper (the title's case is first-minutes row 4) | Use a lighter dim, at 0.3, in the place's own shade colour: the visual audit's split-tone shadows (pipeline row 8). Those are garden `#24404a`, forest `#16323a`, bog `#3a3340`, mountain `#3a3460`, dusk `#0c1430`, village `#2a3444` and home `#40342c`, set by main.ts as `--place-shade`. Add a radial vignette to 0.5 at the corners. No `backdrop-filter`: blurring the WebGL canvas every frame costs a phone too much | `src/ui/ui.css`, `main.ts` | S | 2 |
| 16 | Panels shown through `hidden` (`pause.ts:161`, `title.ts:162` and others); `ui.css:893-899`; `memory.ts:173-183`. Code | Motion has no rules. Panels, bubbles and notices appear and vanish in one frame (menus row 20). The chapter's page slides 14 px in 0.6 s with a 0.6° turn, and a memory grows from its source in 360 ms. Every easing is a plain `ease` | The tokens in Motion. A sheet lands in 240 ms (12 px, −1.2° to −0.4°, `cubic-bezier(.3,1.25,.5,1)`) and lifts in 160 ms. Bubbles and notices take 160 ms. Wood goes down in 80 ms and up in 140 ms. Crayon draws in 220 ms, and the page turns in 600 ms | `src/ui/ui.css`, `hud.ts`, `pause.ts`, `title.ts` | S/M | 2 |
| 17 | `ui.css:184-189, 344-349, 949-961, 1358-1359`; `index.html:25`; `hud.ts:64-65`, `memory.ts:253-254`, `story-stroke.ts:53`. Code | Reduced motion is two systems that disagree. *Mindre rörelse* removes every animation and transition, fades included: the scene bars and the HUD's 0.6 s fade snap, and the helper's pulse vanishes (D6). The device's setting keeps the fades and gets a static outline instead. The loading ghost stops only for the device's setting | One attribute, `<html data-motion="reduce">`, set from either source by main.ts. An inline script in index.html sets it from the save before the first paint. Under it every movement becomes a 160 ms fade, loops stop, and the helper's knock is the same static ring for both. The mapping is in Motion | `src/ui/ui.css`, `main.ts`, `index.html` | S | 2 |
| 18 | `shell.ts:11-46`, `story.ts:5-23`, `map.ts:71-82`, `memory.ts:12-50`. Pictures `phone/painting.png`, `phone/pause-map.png`, `phone/memory.png` | The drawings speak four ways. There are thin line icons (shell.ts), flat portraits with no outline (the sharing panel: one face for all four, story-presentation row 19), outlined crayon pictures (the map) and sepia cut-outs (the memories) | Three registers, each with its material. Moa's crayon: the map, icons on paper, and the family's portraits redrawn as she would draw them. Pappa's knife: icons on wood, and the title. The sepia cut-outs stay for the memories, which belong to the past | `story.ts`, the sprite | M | 1 |
| 19 | `ui.css:239-240` (stickers), `:863-876` (rows of sweets). Code; picture `phone/end-page.png` | Candy, the reward material, is half there. Each sticker's pale edge is five stacked `drop-shadow` filters: 80 filter passes for the album's 16. The page's rows of sweets are flat shapes in three of the six candy colours, with no shine | Bake the 1 px pale edge and its shadow into `kinds.webp` when `candy-stickers.py` renders it, and drop the filters. The rows take all six candy colours from the tokens and a gloss: one white ellipse at 55% in each wrapper's upper left. Candy is the only glossy thing in the UI, as in the world (art bible §2.9) | `src/ui/ui.css`, `art/blender/candy-stickers.py` | S | 1 |
| 20 | `main.ts:340, 783`; `audio.ts:444-448, 496-514`. Code | The UI makes no sound. Audio sleeps under every menu except the chapter's last page, and `play()` returns while it sleeps. So *Börja*, *Spela vidare*, a switch, an album page and a volume step are silent, and a child can't hear the volume he sets (menus row 8). Nothing sounds until play begins | UI sounds from the existing synth, on a fourth bus that stays awake in menus: wood taps, paper and crayon, and plucks. They are in the chapter's key, 8 to 12 dB under the candy (see UI sound). After each *Ljudvolym* step the tap plays at the new level; after each *Musikvolym* step, one plucked D plays at the new music level | `src/audio/audio.ts`, `main.ts` | M | 3 |
| 21 | `main.ts:783`; the title. Code | Menus cut the place to silence: the air and the tune stop the moment a panel opens. The title, shown over the morning, has neither | Menus duck instead of sleeping. The world's effects stop, and the air drops 6 dB. The tune goes on 9 dB down, through a low-pass that closes to 1.1 kHz in 200 ms, as if heard through the paper. The title plays the place's air and tune, ducked, from the first tap. A hidden page, a lost context and the recovery message still sleep as now | `src/audio/audio.ts`, `main.ts` | S/M | 2 |

## The proposed system

The research note's rule (§1) is the spine: **one material per job.** Moa's paper and crayon carry information.
Pappa's painted wood is what you press. Candy is the reward. Each material is one that already lives in the world.
The wood is the ghost's lime wood and Pappa's shavings, and the paint is a shade from the house. The crayon is the
map's, and the candy is the 3D kit's six colours. So the UI belongs to the same Saturday as the picture.

### Type

**Two faces.** Both are OFL 1.1 and self-hosted. Neither licence, as `@fontsource` 5.3.0 ships it, names a
Reserved Font Name, so a subset may keep its name.

- **Andika (SIL), for everything that is read:** bubbles, buttons, panels, settings, notices and the code.
  - Weights 400 and 700.
  - Subset to U+0020–007E, U+00A0–00FF, U+2013–2014, U+2018–201D and U+2026. Latin-1 covers å ä ö é ü and nearly
    any name a player types. A letter outside it falls back to the system font for that letter alone.
  - 16,744 and 16,872 bytes as WOFF2. A Swedish-only subset is 11.4 KB a weight. The extra 5 KB a weight buys
    names.
  - Its a and g are single-storey. Its x-height is 0.498 em, against DejaVu Sans' 0.547 and Arial's 0.528, and its
    lowercase is narrower: 0.519 em a letter against DejaVu's 0.568. So Andika at 20 px looks the size of today's
    18 px, and a line of Andika at 22 px is as long as the same line in today's font at 20.
- **Playpen Sans (TypeTogether), for Moa's words only:** time cards, the map's names, panel titles, section
  headings and storybook titles.
  - Weight 700.
  - Subset to the Swedish set: printable ASCII, Å Ä Ö å ä ö É é Ü ü, ·, – —, ’ “ ” and ….
  - 12,252 bytes without `calt`. Its shuffled letter variants cost 65,536, and at 24 px they are hard to see
    (`type-specimen.png`).
  - Its Å reaches 1.08 em, so any box that clips needs a line height of at least 1.15.
- **Looked at and left out:**
  - Atkinson Hyperlegible Next (12 KB a weight, double-storey a and g): Andika already is the easy-reading face.
  - Shantell Sans (31.8 KB for 700 in the same set): a marker hand, heavier and more grown-up than a big sister's
    careful print.

**Loading.**
- `@font-face` with `font-display: swap` and the `unicode-range` above.
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for all three files in index.html, so they arrive
  with the 413 KB script.
- A local fallback with Andika's measures, so nothing jumps when the font arrives: `@font-face { font-family:
  'Andika fallback'; src: local('Arial'); size-adjust: 105%; ascent-override: 117%; descent-override: 37%;
  line-gap-override: 0% }`. These come from Andika's ascent of 1.221 em, its descent of 0.391 em, and the width
  ratio above.
- Then `--font-read: 'Andika', 'Andika fallback', system-ui, sans-serif` and `--font-hand: 'Playpen Sans',
  var(--font-read)`.

**The scale, in CSS px.** Tablet and computer sizes start at `(min-width: 768px) and (min-height: 600px)`, which an
iPad meets held either way. Today's `--k` rule starts at 900 px and misses an iPad held upright.

| Role | Face | Phone | Tablet, computer | Line height |
| --- | --- | --- | --- | --- |
| Bubble | Andika 400 | 22 | 24 | 1.25 |
| Notice | Andika 700 | 20 | 22 | 1.25 |
| Body, settings rows | Andika 400 | 22 | 22 | 1.35 |
| Small lines: card captions, hints, album names | Andika 400 | 16 | 17 | 1.3 |
| Button | Andika 700 | 22 | 22 | 1.2 |
| Main button (*Börja*, *Spela vidare*, *Nästa kapitel*) | Andika 700 | 24 | 26 | 1.2 |
| HUD word (*Hoppa*, *Använd*'s verb) | Andika 700 | 16 | 18 | 1.1 |
| Bag count | Andika 700, tabular figures | 28 | 32 | 1 |
| Chapter code | Andika 700, capitals, 0.08 em tracking | 20 | 22 | 1.2 |
| Purpose line, and its *Just nu* | Andika 400, Moa | 18, 15 | 20, 16 | 1.3 |
| Panel title (*Paus*, *Godisalbumet*) | Moa | 30 | 34 | 1.15 |
| Section heading (*Spelsätt*, *Grafik*, *Hjälp*) | Moa, crayon blue | 24 | 26 | 1.15 |
| Time card | Moa | 24 | 28 | 1.15 |
| Storybook page title | Moa | 30 | 36 | 1.15 |
| The map's names, as drawn | Moa | at least 14 | at least 16 | — |
| The game's name | the carved sign | 540 px wide | 720 px wide | — |

- *Större text* multiplies every row by 1.25 except the count and the sign: a bubble becomes 27.5 px on a phone.
- Nothing is under 16 px except the map's names.
- The plan's 22 px for body text (§5.7) holds everywhere.

**Hand-lettering, where and how.**
- **Pappa's hand: the game's name only.** It is on the title and on the prologue's title card. The first version is
  live text in Andika 700 on the CSS plank, at 34 and 58 px. Two text shadows make the cut: `0 -1.5px 0 rgb(60 34
  12 / .6)` above and `0 1.5px 0 rgb(255 246 222 / .9)` below. Each letter is painted from the candy tokens inside a
  2 px cut edge in `--wood-dark` (`-webkit-text-stroke` or a third shadow), which the letters need: candy paint alone
  is 1.07:1 (yellow) to 2.55:1 (red) on linden, the edge 6.72:1. If Olov wants real
  depth later, it is rendered in Blender on his computer:
  - the letters as curves from Andika Bold, cut 0.6 mm into a linden plank with a chamfer;
  - painted, and lit as the ghost is;
  - exported as WebP at 1080×300 and 2160×600 (an estimated 40–70 KB for the larger).
- **Moa's hand: her words** (row 3), typeset in Playpen Sans with wax. If her parents say yes, the time cards and
  the map's names, about 35 words, can be her own crayon lettering instead:
  - scanned on Olov's computer and traced to SVG paths (potrace, or Inkscape's Trace Bitmap);
  - about 1 KB gzipped a string;
  - the words kept as text for screen readers.

### Colour

```css
:root {
  /* Paper: Moa's drawing paper, for what is read */
  --paper: #fbf4e4; --paper-2: #f2e5c8; --paper-edge: #d6bf95; --kraft: #c9a272; --tape: rgb(239 224 176 / .82);
  /* Ink */
  --ink: #33241a; --ink-soft: #5f4733; --ink-on-paint: #fff8ec;
  /* Moa's crayons */
  --crayon-red: #c4352b; --crayon-blue: #2e5c99; --crayon-green: #3d7a3c; --crayon-brown: #6b4a2c;
  /* Pappa's wood and paint, for what is pressed */
  --linden: #e6cfa4; --linden-rim: #e7cb98; --linden-edge: #a17443; --wood-dark: #5a3a1e;
  --paint-red: #9b3325; --paint-red-dark: #4e1710; --paint-green: #2c6a45; --paint-green-dark: #163a24;
  --paint-blue: #2b5888; --paint-ochre: #c58d28;
  /* Candy, for rewards only: the 3D kit's colours (src/render/candy.ts:196) and gold */
  --candy-red: #e8483f; --candy-yellow: #f6c445; --candy-green: #58b368; --candy-blue: #4a90d9;
  --candy-pink: #ef7fb0; --candy-orange: #f08a3c; --gold: #e8b636; --gold-deep: #7d5414;
  /* Who speaks: the colours of their signs in the world (src/render/props.ts SIGNS) */
  --who-mamma: #f1ece2; --who-pappa: #5a7d4a; --who-moa: #5b7fb5; --who-bertil: #d98a2c;
  --who-elof: #e8b93a; --who-spoket: #e9d3a8;
  /* States */
  --focus: #1d4f91; --knock: #f6c445; --disabled-ink: #8a7258;
  /* Backdrops: --place-shade is set per place by main.ts (row 15) */
  --place-shade: #24404a; --dim-alpha: .3; --bars: #120d09; --fade: #0b0806; --night-ink: #fff6df;
}
```

The pairs that are actually used, measured:

| Pair | Ratio | Where |
| --- | --- | --- |
| `--ink` on `--paper` | 13.61:1 | all reading |
| `--ink` on `--paper-2` | 11.94:1 | boxes inside a panel |
| `--ink-soft` on `--paper`; on `--paper-2` | 7.87:1; 6.90:1 | secondary lines |
| `--ink` on `--kraft` | 6.32:1 | the album (ink only: `--ink-soft` on kraft is 3.65:1) |
| `--ink` on `--linden` | 9.82:1 | wooden buttons |
| `--ink-on-paint` on `--paint-red` | 6.87:1 | *Börja*, *Spela vidare*, *Hoppa* |
| `--ink-on-paint` on `--paint-green` | 6.11:1 | *Använd*, *Ja* |
| `--paint-blue` on `--linden` | 4.84:1 | the sign's first line |
| `--wood-dark` on `--linden` | 6.72:1 | the cut edge round the sign's candy-painted letters (candy paint alone: 1.07 to 2.55:1) |
| `--crayon-blue` on `--paper` | 6.17:1 | Moa's headings |
| `--crayon-brown` on `--paper` | 7.26:1 | the map's names |
| `--crayon-red` on `--paper` | 4.92:1 | her loop, ticks, the way on (needs 3:1) |
| `--gold-deep` on `--paper` | 6.08:1 | gold words (*Ett geléhallon i guld*) |
| `--focus` on `--paper` | 7.43:1 | focus ring |
| `--paper` halo on `--paint-red`; on a mid-green place (`#6a7a4a`) | 6.62:1; 4.49:1 | the ring's inner halo |
| `--wood-dark` against `--paper` | 9.31:1 | a plank's edge (linden meets paper at only 1.39:1) |
| `--knock` on `--paint-green` | 3.96:1 | the helper's ring |
| `--disabled-ink` on `--linden` | 2.99:1 | disabled (exempt, still legible) |
| `--ink` on `--paper` at 92% over black, white, the lawn, the house wall | 11.36–13.71:1 | bubbles and notices over any place |

### Materials

**Paper, for what is read:** panels, bubbles, notices, *Just nu*, time cards, the map and the chapter's page.
- **Stock.** `--paper` is the sheet, and `--paper-2` is a second sheet inside a panel. `--kraft` is only for
  *Godispåsen*, because the album is the bag.
- **Tooth.** A 128×128 canvas of warm noise (values 236–255) is drawn once at boot and set as `--grain`. Every paper
  multiplies it under its colour (`background-blend-mode: multiply`), darkening by at most 7%.
- **Edges.**
  - A page is cut straight, with uneven corners (5, 8, 6 and 7 px) and a 1 px `--paper-edge` line under it.
  - A scrap (time card, *Just nu*, a notice, the title's note) is torn: a `clip-path: polygon()` built from the
    element's own size when it is shown, with a tooth every 5 to 11 px, 0 to 3 px deep.
  - A torn scrap takes its shadow as `filter: drop-shadow(0 3px 5px rgb(20 12 6 / .35))` on a wrapper, because
    `clip-path` cuts off a `box-shadow`.
- **Tape.** `::before` and `::after`, 78×24 px, in `--tape`, ends zig-zagged by a `clip-path`, turned −5° and 4°,
  11 px over the top edge.
- **Crayon.**
  - Moa's words take wax: `background: var(--wax), linear-gradient(var(--c), var(--c)); background-clip: text;
    -webkit-text-fill-color: transparent`, with the `-webkit-` prefix for Safari. `--wax` is a 64² canvas of
    paper-coloured specks.
  - Her lines (rules, loops, ticks, the map) are SVG strokes 3 to 4 px wide with round ends, a little uneven.
- **Lying on the scene.** A sheet lies at −0.4° with `0 12px 26px rgb(30 20 10 / .34)`.

**Painted wood, for what is pressed:** every button, the HUD's discs and the title's sign.
- **Wood.** `--linden` is the ghost's lime wood and Pappa's shavings (`#ead2a6` on the loading card, `#e3cb9b` in art
  bible §2.3). Grain comes from a 256×96 canvas of 46 wavering fibres in `rgba(90, 58, 30, .05–.18)`, drawn once
  at boot as `--woodgrain`. It is multiplied over the paint, so the grain shows through.
- **Shape.**
  - Planks are 64 px tall (70 for the main press), with corners of 13 to 16 px, not quite equal.
  - Discs are round, with a 3 px `--linden-rim` where the paint has worn off the edge.
- **Bevel and thickness.**
  - `inset 0 2px 0 rgb(255 247 228 / .6)` gives the top's light, and `inset 0 -2px 0 rgb(90 58 30 / .22)` the
    shade below.
  - `0 4px 0 var(--wood-dark)` is the plank's thickness: on paint, `--paint-red-dark` or `--paint-green-dark`. It
    gives every button an edge of more than 3:1 against the paper, where linden alone has 1.39:1.
  - `0 7px 12px rgb(30 18 8 / .26)` is its shadow.
- **Paint.** Rödfärg for the main press; green for *Använd* and *Ja*; bare linden for the rest.
  - The icon is cut in. On linden it has a 1 px light lip below it; on paint, a 1 px dark lip above.
- **Press.** Down 3 px, the thickness from 4 to 1 px in 80 ms, and a wood tap; up again in 140 ms.

**Candy, for rewards:** the bag's fill, stickers, the rows of sweets, the golden reward and a new kind's notice.
- **Colours.** The six candy colours and gold, nowhere else.
- **Gloss.** The only shine in the UI: one white ellipse at 55% in the upper left (34% by 22%, turned −18°), with
  `inset 0 -3px 6px rgb(0 0 0 / .2)` below. The art bible's sweets give off their own colour (§2.9); the UI's catch
  the light.
- **Motion.** Candy moves when it arrives: the bag's bump and the sticker's slap, as now.

**Four sketches in words.**

- **The title** (`mock-title.png`). A plank of pale linden hangs on two strings from the top edge, 540 px wide on a
  phone held sideways, tilted −1°.
  - *Elof och det stora* is cut into it in 34 px letters painted blue. Below it, *godisäventyret* is in 58 px, each
    letter painted one of the six candy colours inside a dark cut edge, darker in the cut's upper edge and lighter on
    its lip.
  - Moa has taped a torn scrap under it: *Måla Pappas nya träspöke.* in her blue crayon.
  - *Börja* is the one painted plank, rödfärg, 300 by 70 px, with a cut play triangle.
  - Under it lie three bare linden planks, each with its icon: *Ny spelare*, *Inställningar* and *Jag har en kod*.
- **A button.** A plank of linden 64 px tall, its corners cut 13 to 16 px, the grain running along it.
  - The main press is painted rödfärg, thin enough for the grain to show, with a cream label in Andika 700 at 24 px
    and a cut icon.
  - Its 4 px thickness shows underneath as a darker edge.
  - Pressed, it sinks 3 px onto that edge in 80 ms and a wood tap sounds. It rises again in 140 ms.
  - Focused, a 3 px blue ring stands 4 px outside a paper halo.
  - Disabled, it is bare linden with faded words and no thickness: it lies flat.
- **A bubble** (`mock-play.png`). A scrap of Moa's paper with uneven corners of 18 to 24 px, a soft shadow and a
  short tail toward the speaker's side.
  - At its left is a 40 px round tab in the speaker's colour from the world's signs: Mamma's white with a red heart,
    Pappa's green, Moa's denim, Bertil's orange, Elof's gold, and the ghost's linden with two dots.
  - The line is Andika at 22 px in ink, at 13.6:1.
  - It lands in 160 ms, 8 px from above. Under reduced motion it fades. (Placement, timing and the name are in-play
    rows 14–17.)
- **A panel** (`mock-panel.png`). A sheet of drawing paper is laid on the scene at −0.4°, held by two strips of
  masking tape at its top corners. The place stays visible round it under a light dim and a vignette.
  - *Paus* is in Moa's blue crayon at the top left. The ✕ is a small linden disc at the top right.
  - Sections are headed in her hand and parted by a dashed crayon line. Reading text is Andika at 22 px.
  - Choices are cards of the second paper, and the chosen one has her red crayon loop drawn round it. Settings rows
    are her hand-drawn box with a red tick, and the setting's icon.
  - What you press is wood: *Spela vidare* in rödfärg, and *Till startsidan* in linden.

### Icons

The icons are on a 24-unit grid with one stroke of 2.2 units, round ends, and a little unevenness by hand. They use
`currentColor`, so an icon takes the ink of what it sits on. That is ink on paper, cut into linden, or cream on
paint (`icons.png` shows each in all three). The sprite is inlined in index.html. Every typed symbol goes, and every
button gets a picture (plan §6.10).

| Icon | Meaning | Replaces, or is added to |
| --- | --- | --- |
| play | go on | *Börja*, *Fortsätt*, *Spela vidare*, *Nästa kapitel*, *Öppna*; the memories' ▶ |
| pause | pause | the corner |
| close | close a panel; *Nej* | ✕ (explore, photos, story), × (remove a player) |
| back | *Tillbaka* | ↩; the title's and the reference's *Tillbaka* links |
| previous, next | the pictures, back and on | ←, → (photos, memories) |
| yes | *Ja*, *Klart*, *Gett* | ✓ |
| home | *Till startsidan* | (redrawn) |
| settings, a wooden cog | *Inställningar* | added |
| code, a card with three words | *Jag har en kod* | added |
| restart | *Börja om från början* | added |
| fullscreen | *Helskärm* | added |
| players; a player and a plus | *Byt spelare*; *Ny spelare* | redrawn; added |
| the chosen player | Moa's loop round the name | ● and ○ |
| keys; pad (plain, no brand) | *Tangenter och handkontroll* | added |
| keycaps: arrows in a key, a wide space key, E, Shift; a cross pad; A and X in round buttons | the hint line, the controls reference, the tutorial's key | ← → ↑ ↓ ␣ ✚ in `sv.ts:45, 50-51, 494-497` |
| a phone with a plus | *Lägg till på hemskärmen* | added |
| a hand on the hook ring | *Hjälp med svingen* | added |
| a jump landing on a cushion | *Lätta hopp* | added |
| a finger with a dotted path | *Följ fingret* | added |
| a phone with buzz marks | *Vibration vid landning* | added |
| a snail | *Lugnare tempo* | added |
| a loudspeaker; a note | *Ljud*; *Musik* | added |
| minus, plus | quieter, louder | − and + |
| a phone with a bell | *Ljud även i tyst läge* | added |
| the hand, mirrored | *Vänsterhänt* | added |
| Aa | *Större text* | added |
| waves lying down | *Mindre rörelse* | added |
| a spruce with a spark; one, two, three spruces | *Auto*, *Låg*, *Mellan*, *Hög* | added |
| a raised hand; two knock marks; the helper over a dotted path | *Bara när jag frågar*, *Påminn mig*, *Guida mig* | added |
| the big candy | *Jag har fastnat* | (redrawn) |
| a folded map with a red line | *Utforska vidare*, *Moas karta* | ♧ |
| a camera | *Foton*, *Se äventyret igen* | ▧ |
| an open star; a gold star (the star candy) | a challenge route waiting; found | ☆, ★ |
| a heart | help someone (the purpose line) | ♡ |
| a sparkle | magic, the star, the glitter, the credits | ✦, ✧ |
| a dotted trail and an arrow | follow the trail (the purpose line) | → |
| a brush | paint: *Måla ögonen*, *Måla med hjälp* | ✎ |
| Pappa's knife | carve: *Tälj med Pappa* | ✎ in the carving purposes |
| the house with a small sun | *Prologen* | ☀ |
| a flower in the lawn | *Gården* | ❀ |
| spruces | *Granskogen* | ♧ |
| tussocks and mist | *Myren* | ≈ |
| the mountain and its old pine | *Berget* | △ |
| the mountain under the lights | *Norrskenet* | ✧ |
| the house with a lit window | *Godiskalaset* | ⌂ |
| three house fronts | *Byn* | the second ⌂ |
| the ghost, the jay | the helper | (redrawn from `GHOST`, `BIRD`) |
| the hop arrow, the hand | *Hoppa*, *Använd* | (kept; an icon for each verb is in-play row 6) |
| the bag | the candy bag | (kept: it is a drawing, not an icon) |

### Motion

| Token | Value | What it moves |
| --- | --- | --- |
| `--dur-press` | 80 ms | wood going down |
| `--dur-release` | 140 ms, `--ease-out` | wood coming up |
| `--dur-quick` | 160 ms | bubbles, notices and scraps arriving; every fade under reduced motion |
| `--dur-panel` | 240 ms, `--ease-paper` | a sheet landing: 12 px up, −1.2° to −0.4°, opacity 0 to 1 |
| `--dur-panel-out` | 160 ms, `--ease-in` | a sheet lifting: opacity to 0, 6 px down |
| `--dur-crayon` | 220 ms | Moa's loop round a choice, a tick |
| `--dur-page` | 600 ms | the storybook page |
| `--ease-out` | `cubic-bezier(.2, .8, .2, 1)` | settling |
| `--ease-paper` | `cubic-bezier(.3, 1.25, .5, 1)` | a landing that overshoots about 3% |
| `--ease-in` | `cubic-bezier(.4, 0, 1, 1)` | leaving |

What moves:
- paper lands and lifts;
- wood presses;
- candy pops: the bag's 200 ms bump and the sticker's 450 ms slap, as now;
- crayon draws.

Nothing in a menu idles, pulses or slides in parallax.

Reduced motion is one switch. It is either source (`prefers-reduced-motion` or *Mindre rörelse*), set as
`<html data-motion="reduce">`. Apple's guidance is to turn movement into fades, not into nothing (research §4):

| What moves | Normally | With reduced motion |
| --- | --- | --- |
| A sheet (panel, page) | lands in 240 ms with 12 px and 0.8° | fades in 160 ms |
| A bubble, notice or scrap | 160 ms with 8 px | fades in 160 ms |
| A wooden press | sinks 3 px in 80 ms | sinks 3 px at once, with no transition |
| Moa's loop and tick | drawn in 220 ms | fade in over 120 ms |
| The map's way on | drawn in 1.8 s after 0.7 s | shown whole (as now) |
| The candy bump, the sticker slap | scale | a 200 ms brightness lift, no scale |
| The helper's knock | a pulsing ring | a static 4 px `--knock` ring, for both sources |
| The loading ghost, the tutorial's hand | loops | still |
| The scene bars | slide in 0.6 s | fade in 0.6 s |
| The time card, the title card | fade in 0.6 s | the same: a fade is allowed |

### UI sound

**The sounds.** Each is made from functions `audio.ts` already has: `knock()`, `puff()`, `tone()`, and the
Karplus–Strong `string()`. The notes are given in the garden's key. The pitch follows the place's `transpose`,
folded into an octave: `((t % 12) + 12) % 12`, minus 12 above 7. With today's arrangements every place is in D
except *Myren*, which is in A. The peaks are 0.05 to 0.08 against the candy's 0.2, so 8 to 12 dB under it. That is
arithmetic on the gains; it has not been measured.

| Sound | When | Built from | Notes (garden, D dorian) | Peak |
| --- | --- | --- | --- | --- |
| press | any wooden button in a panel | `knock()` | A4, 440 Hz falling to 317 | 0.07 |
| go | *Börja*, *Fortsätt*, *Spela vidare*, *Nästa kapitel*, *Öppna* | two knocks | A4, then D5 (587 Hz) 70 ms later | 0.08 |
| back | ✕, *Tillbaka*, a tap on the backdrop | two knocks and paper | D5 then A4, 60 ms apart; paper falling, bandpass 3.4 to 1.4 kHz over 120 ms | 0.06 |
| open | a sheet lands | `puff()` | bandpass rising 1.4 to 3.4 kHz, Q 1.2, 160 ms | 0.05 |
| toggle on, off | a switch | two plucks | F4 then A4, or A4 then F4, 60 ms apart | 0.07 |
| choose | a card or a level chosen, as Moa's loop is drawn | `puff()` and a pluck | a 220 ms scribble (bandpass 2.6 kHz, Q 2, three swells), then D5 | 0.05 |
| page | the storybook page turns | two puffs and a low pluck | a 180 ms swish, a second 90 ms later, D3 at 200 ms | 0.06 |
| yes | ✓, the right code | three plucks | D4, F4, A4, 80 ms apart | 0.08 |
| wrong | a code not found | two soft knocks | A4 then F4, 90 ms apart; never a buzz | 0.05 |
| the helper's disc | asking for help | the helper's own voice | one knock at 300 Hz for the ghost; a chirp from the garden's air for the jay | 0.06 |
| a volume step | *Ljudvolym* −/+ | press | at the new effects level | — |
| a music step | *Musikvolym* −/+ | one pluck on the music bus | D4 at the new music level | — |

*Hoppa*, *Använd* and the stick never play UI sounds: their sounds are the game's own.

**When a menu pauses the game.** Today `sleep(true)` silences the master and suspends the context. Then `unlock()`
and `play()` do nothing. `sleep` becomes three modes:
- **`play`**: as now.
- **`menu`**: pause, the title once unlocked, the album, photos, *Utforska vidare*, the story panels and a memory.
  - The world's effects stop, and their scheduled sources are cancelled as now.
  - The air ramps down 6 dB in 150 ms.
  - The music bus passes through a `BiquadFilter` low-pass that closes from 20 kHz to 1.1 kHz in 200 ms, 9 dB down.
    `tick()` keeps scheduling bars, so the tune goes on, muffled.
  - A fourth bus, `ui`, connected to the master and set to the effects volume, is live, and `unlock()` works.
  - After 30 s in a menu with no tap, everything ramps to silence and the context suspends. The next tap resumes it
    inside its click handler, and its sound plays once `resume()` has resolved.
- **The chapter's page** keeps today's rule: the air and the tune's closing notes go on, unmuffled, and the `ui`
  bus is live as well.
- **`off`**: a hidden page, a lost context, the recovery message, and before boot. This is today's `sleep(true)`.

**What still applies.**
- With *Ljud* off or at 0%, there are no UI sounds. With *Musik* off, there is no tune under menus.
- The iPhone's silent switch silences all of it, unless *Ljud även i tyst läge* is on.

**Wiring.**
- One capturing `click` listener on `document`. It maps a button to its sound by class: `.go` to go,
  `.panel-close` and the back buttons to back, any other button in a `.panel` to press.
- One `change` listener for the switches.
- open and page are played by the functions that show panels and the chapter's page.

About 80 lines in all.

### What it weighs

Measured now: 437.9 KB of the 450 KB JS gate (12.1 KB left), and a boot of 1,360.9 KB of 3,072.

| Item | Counts in | Bytes |
| --- | --- | --- |
| Andika 400 and 700, Latin-1 | boot (WOFF2 is counted at full size) | 33,616 (measured) |
| Playpen Sans 700, Swedish set, no `calt` | boot | 12,252 (measured) |
| The icon sprite, 43 symbols, inline in index.html | boot, gzipped | 2.5 KB (15.6 KB raw; measured on the sketch's set) |
| `shell.ts`'s drawings moved into the sprite | JS | about −1.4 KB (measured on the source) |
| UI sound and the three modes | JS | about +1.3 KB (estimate) |
| Tokens and materials | CSS, gzipped | about +2 to 3 KB on today's 6.2 KB (estimate) |
| Paper, wax and wood textures | nothing: drawn in canvases at boot | 0 bytes; a few milliseconds on a phone (estimate) |
| The carved sign | live text now; a WebP later | about 2 KB; later 40–70 KB (estimate) |
| **Total** | | boot about +52 KB now (+120 KB with the rendered sign) of 1,711 KB left; JS about −0.1 KB |

Everything is DOM and CSS, so no draw call is added.

### Against the research note

- **§1, one material per job:** taken as it stands, with each material drawn from something already in the world.
- **§5, sound.**
  - Menu taps are soft wood and paper sounds in the chapter's key, built from the existing knock, puff and pluck.
  - One wordless phrase per bubble is already there: the babble.
  - The tune ducks rather than stops, so a menu stays in the place.
- **§8, type.**
  - Bubbles are 22 to 24 px (the note: 20 to 24 on a phone, never under 17).
  - There is a larger-text setting, now as one multiplier.
  - Handwriting is kept to short words, and the reading face is built for literacy.
  - "ÅÄÖ åäö" is set in the specimen at 30 px with a line height of 1.1, and the sketches set å, ä and ö from 15 to
    58 px, with nothing clipped. Andika's Å reaches 0.99 to 1.01 em and Playpen's 1.08 em, hence line heights of at
    least 1.15 where a box clips.
  - The fonts are self-hosted subset WOFF2, so the site still makes no third-party request.

## The five to do first

1. Fix the invalid font shorthands with one reset, `button, input, select { font: inherit; color: inherit }`, and a
   test that keeps them out (row 1; S).
2. Self-host Andika and Playpen Sans (45 KB), and put every size on the token scale with one *Större text*
   multiplier and a 16 px floor (rows 2, 3, 5 and 6; S/M).
3. Put the palette on tokens and design the states: rödfärg and paint green under the labels, `--ink-soft` in place
   of opacity, a focus ring and a pressed plank (rows 7, 8, 9 and 11; S/M).
4. Give the menus sound: a live `ui` bus with wood, paper and crayon taps in the chapter's key, the tune muffled
   instead of stopped, and the volume preview (rows 20 and 21; M).
5. Lay the three materials and the carved sign over the panels and the HUD, starting in `dev/menus.html`, then
   replace the 27 symbols with the drawn sprite (rows 4, 10, 12, 13, 14 and 15; M/L).

## Questions for Olov

1. **Moa's hand.** Should her words (the time cards and the map's names, about 35 words, and perhaps the chapter
   titles) be a typeface, Playpen Sans in crayon, or her own crayon lettering, scanned on your computer? Playpen Sans is the
   default. Her handwriting is not on the consent list (plan §2.6), so her parents would be asked first.
   Story-presentation asks the same question. The game's name stays Pappa's carving either way (plan §5.7).
2. **Paper or kraft.** Plan §5.7 has panels in brown kraft like a candy bag. This proposal uses Moa's white
   drawing paper for what is read: ink on it is 13.6:1, against 6.3:1 on kraft, and it stays light over the dark
   forest. It keeps kraft for *Godispåsen*, the album, which is the bag. Is that change to the plan right?
3. **Sound under a menu.** Should the tune go on, quiet and muffled, while a panel is open (proposed)? Or should the
   game stay silent there, as now, with only the taps?
