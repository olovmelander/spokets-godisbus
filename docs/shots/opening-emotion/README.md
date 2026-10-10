# Opening emotion and family help

Review captures use the public stand-in figures. They show runtime staging and UI, not private character
likeness approval. The shrinking star, bird movement and effects are procedural; no reference photos are
included.

The five viewport captures show the same player-paced reassurance after Elof becomes small. They come
from the actual game, with its speech bubble and **Fortsätt** control, held during rotation:

- [390 × 844](390x844.webp)
- [844 × 390](844x390.webp)
- [780 × 360](780x360.webp)
- [1180 × 820](1180x820.webp)
- [1440 × 900](1440x900.webp)

Additional details:

- [The bird, clear of the family on the window sill](bird-844x390.webp)
- [The star reaches Elof's mouth before the magic begins](star-bite-844x390.webp)
- [Tiny Elof beside Pappa, with the same boards establishing scale](tiny-elof-390x844.webp)
- [Moa shows why the golden candy matters](moas-drawing-844x390.webp)
- [Bertil's prepared cap and explicit boarding reminder](bertil-844x390.webp)
- [Mamma's completed bridge and named next action](mamma-390x844.webp)

The four animation details use the actual renderer at authored scene times; the family-help captures use
normal input and game UI. Physical-device and private-model review remain.

Reproduce the game/UI checks after `npm run build`:

```sh
PROLOGUE_SCENE=shrinking node tests/browser/prologue.mjs
PROLOGUE_SCENE=restore node tests/browser/prologue.mjs
PROLOGUE_SCENE=family-shot node tests/browser/prologue.mjs
node tests/browser/family-story.mjs
```

`PROLOGUE_SCENE=full` additionally walks from the morning through the hall to the star and the chapter's
ending in one visit. Work captures stay under the ignored `docs/shots/_work/` directory; the WebP files here
are the selected review checkpoint.
