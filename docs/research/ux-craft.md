# UX, UI and atmosphere: research for *Elof och det stora godisäventyret*

*Web research, 5 October 2026. The bar is an acclaimed indie adventure for players 11 and up: Elof is 7 but plays games rated 11+. Constraints: iPad and phones in the browser; Swedish with å, ä and ö; bubbles of about 40 characters at most; no voices, only short wordless sounds; no logos. The games named are references for patterns, never for art, fonts or marks.*

**Sources.** Most sites were blocked from this session. **†** marks a source read only through search-result excerpts. Unmarked links were read in full: Apple's guidelines and "Behind the Design" articles, Android's accessibility page, WCAG and MDN (through their GitHub sources), Google Fonts' metadata on GitHub, and one camera exercise on GitHub.

## In short

- **Materials.** Paper carries information, from Moa. Painted wood is for what you press, from Pappa. Candy is the reward.
- **HUD.** Nothing stays on screen. Counters appear when they change, then leave.
- **Chapters.** Each opens on a time-of-day paper scrap and closes on a storybook page. Loading happens behind both.
- **Touch.** A floating stick, one jump button and one contextual action. The sides can be swapped and the buttons resized.
- **Sound and type.** Sounds are in the chapter's key, with one wordless phrase per bubble. Text uses one legible OFL typeface plus hand-lettered titles.

## 1. UI that carries the world

The usual vocabulary comes from Fagerholt and Lorentzon ([Beyond the HUD](https://odr.chalmers.se/items/d5fe6889-4cc6-49c2-ba56-0d759e2f37eb)†):

- **Diegetic** UI is in the world.
- **Non-diegetic** UI is on the screen.
- **Spatial** UI is in 3D space but hidden from the characters.
- **Meta** UI shows state through effects.

The crafted games below each pick one material and build their UI from it.

| Game | Why its UI belongs to its world | What to borrow |
| --- | --- | --- |
| Unravel | Yarny unravels as he uses thread, so the hero himself is the meter. Levels are entered through framed photos, and each finished level adds a photo to an album ([Wikipedia](https://en.wikipedia.org/wiki/Unravel_%28video_game%29)†) | Elof's candy pouch fills visibly. Each chapter adds a page to the family storybook |
| Journey | No HUD. Glyphs on the scarf show flight charge, and the scarf grows ([UI review](https://robinkoman.com/ui-review-journey/)†) | Put meters on bodies and objects, not in bars |
| Firewatch, Hollow Knight | In Firewatch, Henry holds a paper map and compass ([Game Developer](https://www.gamedeveloper.com/design/how-firewatch-s-ui-enhances-player-immersion)†). In Hollow Knight, the map is bought and then filled in with a quill ([wiki](https://hollowknight.fandom.com/wiki/Map_and_Quill)†) | Elof holds Moa's red crayon map, which shows only what she has drawn |
| Tunic | The manual is found page by page. Its pages were printed, folded, torn and stained for real, then scanned ([Niche Gamer](https://nichegamer.com/tunic-manual-printed-irl/)†) | Scan real paper and crayon for cards, bubbles and storybook pages |
| Tearaway | The team chose "the bold colors of construction paper", removing "all other texture" ([PlayStation Blog](https://blog.playstation.com/2017/03/31/tearaway-eight-unseen-concepts-for-media-molecules-papercraft-adventure/)†) | Flat paper colours with one grain. They read well on a phone and are cheap to render |
| Yoshi's Crafted World | The "flip side" shows the back of the cardboard set ([Super Mario Wiki](https://www.mariowiki.com/Yoshi%27s_Crafted_World)†) | Menus on the back of Moa's drawings, with pencil notes and tape |
| Kirby's Epic Yarn | Kirby can't die. A hit spills beads instead ([Wikipedia](https://en.wikipedia.org/wiki/Kirby%27s_Epic_Yarn)†) | A stumble spills candy to gather again. There is no game-over screen |
| Lil Gator Game | The inventory and quests look sketched in crayon and pencil. The enemies are cardboard with crayon faces ([Michigan Daily](https://www.michigandaily.com/arts/digital-culture/lil-gator-game-celebrates-creativity-through-cardboard/)†) | The nearest precedent for a child's crayon UI over a 3D world |
| Where Cards Fall | "A successful art style is simultaneously beautiful and functional": grass shows the grid, and bricks show heights ([Apple](https://developer.apple.com/news/?id=fy6rx06s)) | Climbable edges wear Pappa's paint. The rest is bare wood |
| Oxenfree | Choice bubbles float over Alex's head while she walks ([Wikipedia](https://en.wikipedia.org/wiki/Oxenfree)†) | Bubbles hang off the speaker and never stop the chase |
| What Remains of Edith Finch | Narration is handwritten text on walls and objects ([EGM](https://egmnow.com/what-remains-of-edith-finch-review/)†) | Moa's crayon arrows are drawn on fences, stones and the bog |
| Kind Words, Season | Collected stickers become objects in your room. Season's journal gathers photos, recordings and found things ([Wikipedia](https://en.wikipedia.org/wiki/Kind_Words_%28video_game%29)†, [NPR](https://www.npr.org/2023/01/27/1150927868/season-a-letter-to-the-future-review)†) | The collection is a shelf of Pappa's carved figures. The storybook page shows what the chapter gave |

**For this game:** one material per job, and never a plain grey system panel.

## 2. A minimal, contextual HUD

- **Counters appear only when they change.**
  - Super Mario 64 shows its power meter only after damage ([wiki](https://mario.fandom.com/wiki/Power_Meter)†).
  - Celeste adds each strawberry to a top-left total as it is collected ([TheGamer](https://www.thegamer.com/celeste-all-strawberries-guide/)†).
  - Gris has no HUD and almost no text. A button prompt appears only when a new ability arrives ([Engadget](https://www.engadget.com/2018-08-09-gris-game-nomada-studio-conrad-roset.html)†).

  **For this game:** the candy count slides in on a pickup and leaves after about two seconds. A small pause icon is the only permanent element.
- **The world guides, not markers.** A Short Hike leads players up its mountain with sightlines, signposts, characters' chatter and changing trail colours, not dense UI ([list](https://fictionhorizon.com/25-games-with-minimal-ui-that-still-guide-you/)†). **For this game:** the ghost's trail of wood shavings and Moa's crayon arrows replace objective markers.
- **Controls follow the context.** Apple: "Show and hide virtual controls to reflect gameplay", and put menus at the top ([HIG: Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)). **For this game:** the action button appears only when Elof can grab, give or greet something, and its picture says which.

## 3. Title screen, chapter cards and transitions

- **Title screen.** Inside starts with "no explanation, tutorial or cut scene with filmic dialogue" ([The Xbox Hub](https://www.thexboxhub.com/inside-review/)†). **For this game:** the garden at dusk, with the ghost peeking out. A tap anywhere plays.
- **Chapter cards.**
  - Monument Valley opens each chapter on a numbered card, such as "Chapter III: Hidden Temple" ([wiki](https://monument-valley.fandom.com/wiki/Chapters)†).
  - Firewatch opens each day on a title card ([wiki](https://firewatch-archive.fandom.com/wiki/Day_One)†).
  - Celeste shows a postcard with one climbing tip as a chapter starts ([Celeste Wiki](https://celeste.ink/wiki/Postcards)†).

  **For this game:** a torn scrap shows the time of day and Moa's drawing for 2–3 seconds; a tap skips it. The storybook page closes the chapter.
- **Loading as part of the story.**
  - Yoshi's Story turns a pop-up book's page for each world ([Super Mario Wiki](https://www.mariowiki.com/Yoshi%27s_Story)†).
  - Paper Mario: The Thousand-Year Door uses theatre curtains ([Super Mario Wiki](https://www.mariowiki.com/Paper_Mario:_The_Thousand-Year_Door_%28Nintendo_Switch%29)†).
  - Human: Fall Flat drops the hero "through the clouds into the next level", which hides the load ([KeenGamer](https://keengamer.com/article/14019_human-fall-flat-review)†).
  - Journey on iOS speeds up its intro screens while you hold a finger down ([Journey Wiki](https://journey.fandom.com/wiki/IOS_Version_FAQ)†).

  **For this game:** a page-turn wipe, with the next chapter loading behind the storybook page. Holding a finger down hurries it.

## 4. Camera and game feel

- **Camera.**
  - Itay Keren's "Scroll Back" is the standard reference for side-scroller cameras ([Game Developer](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers)†). It covers position lock, lerp smoothing, leading in the direction of input, and push zones ([exercise built on it](https://github.com/dr-jam/CameraControlExercise)).
  - Little Nightmares chose a "dollhouse" view ([Game Developer](https://www.gamedeveloper.com/design/crafting-the-bizarre-off-kilter-gameworld-of-i-little-nightmares-i-)†).
  - It Takes Two puts doll-sized heroes in a huge house ([ArtStation](https://magazine.artstation.com/2021/04/hazelight-studios-it-takes-two-art-blast/)†).

  **For this game:** a smooth follow that leads toward the ghost. The camera moves vertically only when Elof lands, and the frame crops the giants so Elof reads as tiny.
- **Juice on collecting.** "Juice it or lose it" made a dull game lively by adding squash, particles, trails and sound ([summary](https://roblog.co.uk/2024/03/juicy-games/)†). Super Mario 64 pitches its red-coin jingle higher with each coin ([Supper Mario Broth](https://www.suppermariobroth.com/post/713161345997160448/in-super-mario-64-the-red-coin-collection-sound)†). **For this game:** a candy pops and arcs into the pouch, one note higher per candy in a streak. The screen shakes only at story moments.
- **Reduced motion.** When Reduce Motion is on, Apple asks games to reduce "automatic and repetitive animations, including zooming, scaling, and peripheral motion", and to use fades instead ([HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). On the web this is `prefers-reduced-motion` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)). **For this game:** with it on, fades replace page turns, nothing shakes and the aurora slows.

## 5. UI sound and wordless voices

- Monument Valley's moves play notes of a chord, and its movement "ping" is tuned to each level ([MCV/DEVELOP](https://mcvuk.com/development-news/heard-about-the-sounds-of-monument-valley/)†, [A Sound Effect](https://www.asoundeffect.com/video-the-sound-of-monument-valley-explored-with-sound-designer-stafford-bawler/)†).
- Journey's wordless chirp "stays in tune with the background music" ([Wikipedia](https://en.wikipedia.org/wiki/Journey_%282012_video_game%29)†).
- Celeste built its babble from synthesizer sounds shaped like vowels, with emotion carried by pitch ([TheGamer](https://www.thegamer.com/celeste-sound-designer-reveals-how-the-games-dialogue-audio-was-created/)†).
- In Lost in Play, characters "speak in a silly gibberish" ([Apple](https://developer.apple.com/news/?id=n4w6zydm)).
- Animal Crossing's "Animalese" voices the text letter by letter ([Nookipedia](https://nookipedia.com/wiki/Animalese)†).

**For this game:** one short synthesized phrase per bubble, with a timbre for each character, such as a wooden knock for Pappa and a papery whistle for Moa. A sound per letter would read the text aloud, so avoid it. Menu taps are soft wood and paper sounds in the chapter's key.

## 6. Touch controls from good mobile ports

- **Apple's HIG:**
  - Show the stick "wherever the player lands their thumb", with movement on the left.
  - Make frequent controls at least 44 pt.
  - Give buttons a press state visible "even when their finger is covering the control".

  ([HIG: Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls))
- **GRIS and Inside on iOS.** In GRIS, a touch anywhere on the left brings up "a subdued floating joystick that doesn't hide any of the action". The review's verdict: "an absolutely perfect port" ([AppUnwrapper](https://www.appunwrapper.com/2019/08/26/gris-ios-review/)†). Inside needs one finger anywhere: drag to move, swipe up to jump ([TouchArcade](https://toucharcade.com/2017/12/14/inside-review/)†).
- **Custom layouts.** Little Nightmares offers a floating or fixed pad and a custom layout ([Playdigious](https://playdigious.helpshift.com/hc/en/14-little-nightmares/faq/169-is-it-possible-to-customize-touch-controls/)†). Dead Cells lets players move and resize every button ([Game Developer](https://www.gamedeveloper.com/design/porting-i-dead-cells-i-to-mobile-an-in-depth-breakdown)†).
- **Hands.**
  - Players new to controllers "would never put two hands on the screen at the same time", so Sky made one hand the default ([Apple](https://developer.apple.com/news/?id=zm47it7t)).
  - Journey on iOS puts movement on either side ([Journey Wiki](https://journey.fandom.com/wiki/IOS_Version_FAQ)†).
  - stitch. has a left-handed mode ([Apple](https://developer.apple.com/news/?id=mc4d1ufa)).
- **Cautions.** Alba allows touch play only in portrait, and App Store reviewers called its controls "needlessly gimmicky" ([App Store](https://apps.apple.com/us/app/alba-a-wildlife-adventure/id1528014682)†). In a study of 24 children aged 6–14, a virtual joystick suited inexperienced players better than buttons, a wheel or tilt ([ResearchGate](https://www.researchgate.net/publication/336736035_Mapping_Controls_on_a_2D_User_Drawn_Racetracks_Driving_Game_-_An_Usability_Assessment)†).

**For this game:**

- A floating stick on the left half, a large jump button on the right, and the contextual action above it.
- A swap-sides switch and a button-size slider. No tilt.
- Possibly an optional auto-run in chases, as in Super Mario Run ([Vice](https://www.vice.com/en/article/shigeru-miyamoto-on-designing-mario-for-mobile-in-super-mario-run/)†).

## 7. Menus, onboarding, help and options

- **One tap to play, and pictures, not words.**
  - Apple asks for "great default settings", and says to teach "through play", with any written tutorial as a reference rather than "a prerequisite" ([HIG: Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games)).
  - Avoid "controller-based naming like A, X, or R1" on buttons ([HIG: Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)).

  **For this game:** a painted wooden play token, with settings behind a small corner icon. Icons are drawn or carved objects, labelled with one Swedish word only when they would be ambiguous. The garden teaches one verb per obstacle.
- **Help when asked for, or after repeated failure.**
  - Lost in Play's hints "often present challenges in themselves" ([Apple](https://developer.apple.com/news/?id=n4w6zydm)).
  - New Super Mario Bros. Wii offers a Super Guide after eight failures, and the player can take over at any time ([Super Mario Wiki](https://www.mariowiki.com/Super_Guide)†).

  **For this game:** tapping Moa's map draws a crayon arrow toward the ghost. After several falls at one jump, a giant's hand quietly becomes a step.
- **Safe navigation.** XAG 112 covers *UI navigation* and 115 covers *destructive actions* ([XAG](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines)†). **For this game:** Back always sits in the same place. "Erase save" needs a press-and-hold, in a grown-ups' corner.
- **Options done well.**
  - Celeste's Assist Mode offers game speed down to 50%, infinite stamina and invincibility ([Celeste Wiki](https://celeste.ink/wiki/Assist_Mode)†). Its wording was changed after disabled players said it felt othering ([Vice](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility/)†).
  - The Last of Us Part II has more than 60 settings and presets for vision, hearing and motor needs ([Naughty Dog](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed)†).
  - Hades' God Mode adds 2% damage resistance per death, up to 80% ([Inverse](https://www.inverse.com/gaming/hades-god-mode-interview)†).
  - Sea of Stars put its assists into found items called relics, then added presets for new games ([wiki](https://seaofstars.fandom.com/wiki/Difficulty_Presets)†). An assist should never have to be found first.

  **For this game:** one settings page of icons covering:

  - text size and game speed;
  - a "can't fall" assist and auto-run;
  - reduced motion;
  - swapped sides and button size;
  - sound.

  The assists may look like Pappa's carved helpers, but they are always listed plainly too.

## 8. Typography

- **Size and line length.** iOS text defaults to 17 pt, with an 11 pt minimum and 4.5:1 contrast ([HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). For subtitles, Ian Hamilton cites 37–40 characters per line and two lines at most, over an outline or a semi-opaque box ([Ian Hamilton](https://ian-hamilton.com/how-to-do-subtitles-well-basics-and-good-practices/)†). **For this game:** bubbles at 20–24 CSS px on phones, never under 17. Use two lines at most, one sentence per bubble, and line breaks between phrases. Offer a larger-text setting.
- **Handwriting, carefully.** Irregular letters and tiny diacritics are the legibility risks. Keep pure handwriting for short titles, or use a handwriting typeface built for reading. All four below are OFL with Latin, checked in the Google Fonts repository:
  - **Atkinson Hyperlegible Next**, made "to increase legibility for readers with low vision". Its designers include the Swedish foundry Letters From Sweden ([repo](https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext)).
  - **Andika**, "designed especially for literacy use". Its a and g are single-storey; `ss01` gives double-storey forms ([repo](https://github.com/google/fonts/tree/main/ofl/andika), [SIL](https://software.sil.org/andika/features/)†).
  - **Playpen Sans**, handwriting "friendly to both little readers and adults", with seven shuffled variants per letter ([repo](https://github.com/google/fonts/tree/main/ofl/playpensans)).
  - **Shantell Sans**, marker handwriting by Shantell Martin and Arrow Type, with variable *Informal* and *Bounce* axes ([repo](https://github.com/google/fonts/tree/main/ofl/shantellsans)).

  "Dyslexia fonts" don't help children read. Where they seemed to, extra letter spacing did the work ([Kuster et al. 2018](https://link.springer.com/article/10.1007/s11881-017-0154-6)†). **For this game:** Shantell Sans or Playpen Sans as Moa's hand in bubbles and on cards. Atkinson Hyperlegible Next for settings and as an easy-reading option. Chapter titles are hand-lettered images, with the same words in the page's text.
- **Swedish letters.** Tight line heights and careless font metrics clip tall marks on capitals ([Glyphs](https://glyphsapp.com/learn/vertical-metrics)†). **For this game:** test "ÅÄÖ åäö" at every size and in every bubble shape. Self-host subset WOFF2 files, because the site may not call a font CDN.

## 9. Accessibility norms that matter here

- **Targets.**
  - Apple: 44×44 pt (minimum 28), with about 12–24 pt of padding ([HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
  - Android: 48×48 dp ([Android](https://developer.android.com/guide/topics/ui/accessibility/apps)).
  - WCAG: 44×44 CSS px at level AAA ([2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)) and 24×24 at level AA ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
  - Nielsen Norman Group suggests about 2 cm for children, against 1 cm for adults ([NN/g](https://www.nngroup.com/articles/children-ux-physical-development/)†).

  **For this game:** jump and action buttons about 2 cm across (roughly 100 CSS px on a phone). Menu icons are at least 64 px, with 16–24 px gaps.
- **Never by sound or colour alone** ([HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility); [GAG](https://gameaccessibilityguidelines.com/basic/)†). **For this game:** the ghost's knock also shows a visible mark.
- **Flashes and time limits.** Nothing may flash more than three times a second above the thresholds, and saturated red has a stricter test ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)). The Xbox guidelines cover time limits (XAG 116) and photosensitivity (XAG 118) ([XAG](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines)†). **For this game:** the aurora stays under the thresholds, and a chase never fails on a timer.
