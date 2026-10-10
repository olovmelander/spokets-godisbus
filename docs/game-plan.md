# Elof och det stora godisäventyret

Game plan, version 6 — 4 October 2026. Repository `olovmelander/spokets-godisbus`.

Version 6 records Olov's direction that the game "feels very linear" and should take "the best things from the
best platformers" (Super Mario, Rayman, Braid, Unravel, Little Nightmares, Inside, Ori). The research and its
sources are in [the research report](research/platformer-level-design.md), and what follows from it for the
chapters is in [the level design document](level-design.md): ledges that make a second level over the path,
side candy in a voice of its own, the lace in every chapter, sweets for the brave and for the curious. The
story, the verbs and the kindness rules below are unchanged. Where §4.3 and §4.7 describe the candy and the
optional routes, the level design document is the newer word.

Version 5 records Olov's direction to improve the story, its opening, the family's role and the levels'
connected puzzles, informed by research into indie adventures and platformers. The concrete design,
primary sources, implemented development scope and acceptance criteria are in
[the storytelling and level overhaul addendum](storytelling-overhaul.md). The 3 October decisions below
remain the canon; this addendum clarifies how the player sees and understands them.

Version 4 takes in Olov's second round of answers of 3 October. They settle every question that version 3 left
open (§0):
- Elof shrinks to the ghost's size, as proposed;
- the secret is redone: Elof was about three, not a baby, when Pappa carved his first trägubbe for him;
- there are no dates, no voices and no logotypes, and Olov is the only tester before Elof plays;
- the ghost gets a name, *Klonk*, after the sound of its wooden feet;
- no paid AI tool: every character is designed in Blender, which Claude drives through MCP on Olov's computer
  (Windows, with an RTX 3070), with Poly Haven for materials, nature models and skies;
- the reference pictures are in `photos/` on Olov's computer. Two photos, a render and a poster are all there is
  of the ghost, and 84 openly licensed pictures show the landscape around Bredbyn.

§8 lists what changed in each version. Version 3 took in Olov's first answers; version 2 was version 1 revised
after a five-angle review.

**Current status.** The original 3 October proposal was written before implementation. Its statement
"Nothing is built yet" is historical: the whole story now has a playable development implementation,
with the causal opening, durable context, family rehearsal bodies, finale staging and local loops in
Gården, Granskogen, Myren and Berget developed in a separate PR stack. `HANDOVER.md` records the current
code, verification and deployment state. Main collectible/checkpoint identities and old-save progression
remain intact; Olov requested the full story on the normal page on 10 October, so the release boundary
is now `epilog` and Byn opens as its unnumbered bonus. Final art, acting, broader spatial world work, a Byn
return loop, listening and family-device checkpoints remain open. The durations,
budgets and hardware assumptions in the original proposal are starting values, not new measurements.
Appendix A records the original planning checks.

**Who reads this:**
- **Olov**, Elof's morbror, who commissions the game and builds it with Claude: the decisions in §0 and the
  checkpoints in §7.
- **Elof's parents, Mamma Sofie and Pappa Emil,** for what is marked 👪: the story about Pappa's first
  trägubbe (§0 Q3). In the game Elof calls them Mamma and Pappa, and so does this plan.
- **Claude Code sessions**, for everything else. §1–§5 describe the game; §6–§7 describe how it gets built.

**What it builds on.** The UX of *Sköldhästen* (`olovmelander/alva-10-birthday`, folder `skoldhast/`) is
reused on purpose: its controls, menus, kindness rules, help ladder, saving, tests and session handover.
Appendix C lists exactly what carries over. What is new here:
- a 3D renderer: Three.js r186 with `WebGLRenderer`;
- an art direction after *Unravel*: photoreal nature, seen from very close;
- art made in Blender, which Claude drives through MCP on Olov's computer;
- a skilled seven-year-old player: real challenge, but nothing to lose;
- a standalone repository, built and deployed by GitHub Actions.

### Kort sammanfattning (på svenska)

- **Spelet.** Ett äventyr i sidovy, byggt i 3D, om Elof.
  - **Utgåva 1:** prologen och Kapitel 1, cirka 20–25 minuter för Elof.
  - **Version 1.0:** hela berättelsen på 65–85 minuter, plus fyra valfria utmaningar, med fyra kapitel (Gården,
    Granskogen med bäcken, Myren, Berget), en final och en epilog.
  - **Version 1.1:** lägger till bland annat en forsfärd.
- **Idén.**
  - Ett busigt träspöke stjäl Elofs lördagsgodis. Elof krymper till spökets storlek, ungefär 15 cm, och då blir
    naturen hemma jättestor och vacker, som i Unravel.
  - Godisspåret visar vägen.
  - När en vuxen tittar stelnar spöket till en vanlig träfigur.
  - Familjen hjälper som snälla jättar: Moas pappersflygplan, Pappas gungbräda, Bertils kepsbåt, och Mammas
    stockbro och fläta.
- **Hemligheten** (omgjord: Pappa började tälja som vuxen, när Elof var ungefär tre år):
  - Pappa hittade täljningen genom ett videoklipp. Sin allra första trägubbe täljde han till Elof, som bar den
    med sig överallt och delade sitt lördagsgodis med den.
  - På en höstpromenad till berget gled den ner i en djup spricka vid den gamla tallen. Där har den väntat i
    flera år, mer än halva Elofs liv, medan Pappa har täljt över 250 andra. Först i raden på hans hylla står en
    plats tom.
  - Spöket bär på Pappas minne. Det tar godiset för att ha ett välkommen-hem-kalas för den ensamma trägubben, men
    det kan inte be om hjälp, för det har ingen mun.
  - Uppe på berget drar Elof och spöket upp trägubben tillsammans. Elof målar nya ögon på den med ett kråkbär, och
    bestämmer själv vem som ska få hans godis.
  - Hemma lär Pappa honom att tälja, och spöket får sitt namn: **Klonk**, efter ljudet av dess träfötter.
- **För Elof, som är sju och spelar spel för 11+:**
  - hopp som blir högre om man håller in knappen, en gunga som man själv tar fart på, pussel i ett till fyra
    steg, och en spännande sekvens och en valfri utmaning i varje kapitel;
  - inga liv och inget att förlora: missar han ett hopp fångar *glitterbubblan* honom och för honom tillbaka på
    en sekund;
  - spelsättet *Lugnt* gör allt lättare för den som vill, till exempel en kusin;
  - spelet går att spela utan att läsa, och hjälp kommer bara när han ber om den;
  - inga röster: allt berättas med bilder, ljud och korta texter.
- **Enheterna:** en ny iPad, en iPhone eller en Android i klass med Samsung S23. Elof spelar på alla tre, så ingen
  går före. Alla klarar den högsta kvalitetsnivån.
- **Tekniken.**
  - Three.js r186 med `WebGLRenderer` (WebGL 2): ditt val, och det som mätningarna också pekade på.
  - Vite 8, TypeScript, planck.js för fysiken.
  - GitHub Actions bygger och publicerar på GitHub Pages. Hela berättelsen har ett spelbart utvecklingsbygge;
    `HANDOVER.md` skiljer det som är publicerat från senare ändringar i PR-stacken.
- **Grafiken.**
  - Du utvecklar på din dator (Windows, RTX 3070), där Claude styr Blender genom MCP. Modeller, riggar,
    animationer, bakning och bakgrunder görs där, och du kan rätta allt direkt i Blender.
  - Alla figurer formges i Blender, i tur och ordning: först Elof och spöket, sedan familjen, lilla Elof,
    trägubbarna och djuren. Var och en görs så långt som dess tid på skärmen kräver (§5.6). Inget betalt
    AI-verktyg används.
  - Spöket modelleras med platta täljytor efter de två fotona, med renderingen och affischen som stöd. Inga
    logotyper finns någonstans i spelet.
  - Naturen byggs i kod och i Blender, med fria fotoskannade material och modeller från Poly Haven.
    Landskapsfotona i `photos/landscape/` är förlagor.
  - Familjens modeller ligger i ett privat repo, så att de alltid går att ta bort.
- **Test och datum.** Bara du testar innan Elof spelar. Inga datum är satta: varje steg är klart när dess
  kontrollpunkt är godkänd.
- **Nästa steg.**
  1. Bedöm den byggda början och det löpande målet: familjen ser krympningen, hjälper vid korsningarna och
     möter Elof i finalen. Provfigurerna och återfärden på Pappas axlar är inte färdigt skådespel.
  2. Spela de byggda slingorna: Moas pappersficka och medveten ombordstigning, Granskogens viktpussel och
     återbesök, Mammas spång efter tranungens hemkomst och Bergets återväg runt röset.
  3. Kontrollera att godismotivet framgår efter räddningen, ögonmålningen och den återtagna påsen även om
     bergsminnet missades. I målet och återblicken förutsätter "min gamla trägubbe" att minnet har upptäckts.
  4. Fördjupa världen och planera Byns återvändarslinga; granska ljud och bild på de riktiga enheterna.
     Färdig familjekonst och skådespel kräver Olovs dator. Se
     [tilläggets genomförandeordning](storytelling-overhaul.md#implementation-order).

---

## 0. Frågor till Olov (och till Elofs föräldrar där det står 👪)

### Besvarat den 3 oktober

**Första omgången.**

| Fråga | Svaret | Vad det ändrar |
| --- | --- | --- |
| 1a. Elof som spelare | Sju år; spelar spel som är gjorda för 11+ | Spelet får riktiga utmaningar men inget att förlora (§4): hopp som styrs av hur länge knappen hålls in, en gunga man själv tar fart på, en spännande sekvens i varje kapitel och en valfri utmaningsväg. *Äventyr* är förvalt spelsätt, och *Lugnt* finns för den som vill. Hjälp kommer bara när han ber om den. |
| 1b. Enheter | En ny iPad, en iPhone eller en Android i klass med Samsung S23 | Alla tre klarar kvalitetsnivån *Hög* (§6.5) och testas vid varje kontrollpunkt. Kontaktbladen får också S23:ans format, 780×360. |
| 4. 👪 Samtycke | Båda föräldrarna säger ja till allt, och alla namn får användas | Mamma Sofie och Pappa Emil får heta så. Näsbacken, de riktiga platserna och ett exakt hus är tillåtna, liksom skanningen av spöket, berättelsen och röster som spelas in på Elofs enhet. Några skydd som inte kostar spelet något finns kvar (§2.6). |
| 6. Nätverk | Du utvecklar på din dator, med Blender MCP | Att molnsessionerna inte når materialsajterna spelar ingen roll längre: nedladdningar och allt arbete i Blender sker på din dator (§5.6, §6.14). |
| Renderaren | Three.js `WebGLRenderer` (WebGL 2) är bäst | Beslutat. Jämförelsen med WebGPU-renderaren i Steg 0b stryks (§6.2). |
| Artikeln om Pappa | Den gick inte att få tag på, men webbutikens repo har hans egna ord | Pappas riktiga historia är grunden för den nya hemligheten (§3.5, Appendix B.3). |

**Andra omgången, samma dag.** Numren är desamma som i version 2 och 3.

| Fråga | Svaret | Vad det ändrar |
| --- | --- | --- |
| 2. Hur stor är Elof? | (a): Elof blir liten. I övrigt det som rekommenderas. | Beslutat. I slutet av prologen krymper Elof till spökets storlek, ungefär 15 cm (§5.2), och familjen blir hjälpsamma jättar (§2.3). |
| 3. Hemligheten | Den görs om. Pappa började tälja som vuxen, och Elof var då kanske tre år. Det är okej att den första trägubben täljdes till Elof och tappades. Figurerna står på en hylla. | Minnena visar en treårig Elof i stället för en bebis (§2.4, §3.4). Lilla Elof bär själv sin trägubbe och delar sitt lördagsgodis med den, och därför är det godispåsen som spöket tar (§3.5). Spelet nämner inget årtal. |
| 5. Överraskning och datum | Inga bestämda datum | Stegen görs i ordning, och varje utgåva släpps när dess kontrollpunkt är godkänd (§7.3). Förvalet står kvar: spelet är en överraskning för Elof, och ofärdiga delar syns bara med `?dev`. |
| 7. Det riktiga spöket | De enda fotona är de två i `photos/`. Där finns också renderingen och affischen. | Spöket modelleras i Blender efter fotona. Renderingen och affischen visar det som fotona saknar: baksidan och formerna snett framifrån (§5.6). Skanningen stryks, för den kräver 60–80 foton. Höjden antas vara cirka 15 cm. Spöket får händer som på affischen och renderingen, fast den riktiga figuren saknar dem: det bestämde du den 3 oktober (§2.2). |
| 8. Riktiga platser | Du kan inte fotografera eller spela in nu, men det finns referensfoton i `photos/landscape/` | Förvalen gäller: Storklocken är förebild för berget, bakgrunderna renderas i Blender, och ljuden syntetiseras eller är CC0. Landskapsfotona är förlagor, inte bilder i spelet: nästan alla har licensen CC BY-SA, som spelet inte får använda (§5.6). Bilder från Storklockens topp, forsen i byn och Näsbacken saknas, så de platserna byggs efter beskrivningar tills du kan ta egna foton. Lavskrikan och kyrkklockorna kl. 18 är kvar. |
| 9. Röster | Inga röster | *Läs upp* och inspelningssidan stryks (§3.7, §6.8). Figurerna låter, men utan ord. |
| 10. Testbarn | Bara du testar | H2 och H3 blir dina egna tester. Elofs första spelning (H4) är första gången ett barn spelar (§7.3, §7.7). |
| 11. Godis | De gillar alla sorters godis | Det gyllene godiset blir ett geléhallon i guldpapper, samma sort som lilla Elof delade med sin trägubbe (§3.4). På godiskalaset väljer Elof själv vad var och en får. |
| 12. Namn | Hitta på ett bra namn | Spöket heter **Klonk**, efter ljudet av dess träfötter. Elof ger det namnet i epilogen, och fram till dess är det ”spöket” (§2.2, §3.4). |
| 13. Märken | Allt görs utan logotyper | Inga märken någonstans. Stjärnan på det riktiga spökets skor blir en slät rund lapp (§2.2). |
| 14. Fler spelare | Det som rekommenderas | ”Ny spelare” finns alltid, och varje spelare väljer *Äventyr* eller *Lugnt* själv (§6.9). |
| 15. Betalt 3D-verktyg | Du har Blender MCP med Poly Haven. Ska alla figurer formges? | Inget verktyg köps. Ja, alla figurer formges i Blender, men i tur och ordning och olika mycket (§5.6): först Elof och spöket, sedan familjen, lilla Elof, trägubbarna och djuren. Poly Haven ger material, naturmodeller och himlar, men inga figurer. |
| 16. Din dator | Windows med ett RTX 3070 | Blender renderar och bakar på grafikkortet. Utan Mac felsöks iPad och iPhone med `?debug` och `?bench` på skärmen (§6.14). |
| 17. Vilken enhet | Det är blandat | Ingen enhet går före. De tre klasserna väger lika, och kapitelkoderna som flyttar framsteg mellan enheterna blir viktigare (§6.9). |

### Ny inriktning den 4 oktober

Olov vill förbättra berättelsen och hur spelaren förstår den, undersöka bra indiespel på webben och göra
banornas pussel mer sammanhängande. Krympningen ska ske synligt nära familjen, deras hjälp ska ha en tydlig
orsak, och finalen ska förklara varför spöket tog just godiset. Det är en utveckling av den godkända
berättelsen, inte en ny hemlighet. [Tillägget](storytelling-overhaul.md) beskriver den byggda utvecklingsomgången:
gemensam krympningsscen, löpande sammanhang, familjens provfigurer, finalens målade ögon och delade
godis samt lokala slingor i Gården, Granskogen, Myren och Berget. Större ombyggnad av världen, Byns slinga,
färdig konst och skådespel samt lyssnings- och enhetsbedömning återstår. Gamla framsteg behåller sin
betydelse, och releasegränsen är fortfarande `null`.

### Kvar att svara på

Två små saker. Ingen av dem hindrar arbetet, och båda har ett förval.

1. 👪 **Vet Elofs föräldrar om spelet, eller är det en överraskning även för dem?**
   - Planen har räknat med två steg där de är med: Emil läser bildmanuset till minnena innan de byggs, och
     föräldrarna får se Elof-modellen vid H1b.
   - Finns Pappas riktiga första trägubbe kvar hemma, så att Elof känner igen den? Då görs spelets trägubbe
     efter den, och berättelsen blir ”så kom den hem”.
   - *Förval:* du avgör likheten själv, och Emil läser bildmanuset innan det första minnet byggs, sent i Steg 2.
2. **Vilka enheter har du själv att testa på?** Du är den enda som testar, och Elof spelar på både iPad, iPhone
   och Android.
   - *Förval:* du testar på de enheter du har, och i Chrome på datorn. En enhetsklass du saknar mäts första
     gången Elof spelar.

---

## 1. The game on one page

**Pitch (as Elof would hear it).** *En lördagsmorgon målar Elof ögonen på Pappas nya träspöke – och spöket
blinkar! Busigt rycker det åt sig Elofs jättestora lördagsgodispåse och springer ut genom verandadörren. Påsen går
sönder i farten, och godis trillar ut utan att spöket märker det. Elof fångar en glittrig stjärna … POFF! Nu är
han lika liten som spöket, och jakten börjar: genom gräsdjungeln på gården och den djupa granskogen, förbi den
glittrande bäcken och över den dimmiga myren, ända upp på berget. Men varför tog spöket godiset? Och varför
börjar det vänta på honom?*

### Why it can be awesome, not just nice

1. **It is Elof's own world, seen from 15 cm.**
   - The deck steps become cliffs, and the shavings outside Pappa's workshop a mountain.
   - Bertil's cap becomes a boat, and Moa's paper plane an aircraft.
   - Unravel's co-founder put it this way: "When you get down on your knees and look at the world from another
     perspective, magic happens." The shrink makes that literal (§5.1).
2. **A mischievous thief who becomes a friend.**
   - At first the ghost flees and teases. Whenever a grown-up looks, it freezes into an ordinary wooden figure,
     a gag every child gets.
   - After Elof saves it from an eddy, it starts to wait for him and leave him gifts. "Varför väntar spöket på
     mig?" becomes the question that pulls him on.
3. **Real challenge, nothing to lose.**
   - Jumps that go higher the longer Hoppa is held, a swing he pumps himself, and puzzles that grow from one
     step to four.
   - One exciting sequence per chapter: dodging falling dew drops, outrunning a cone avalanche, hopping across
     sinking tussocks, dashing between gusts on the summit.
   - One optional challenge route per chapter, for the best hidden candy.
   - A miss costs about a second, or at most about 15 s inside an exciting sequence: the glitter bubble catches
     him and floats him back (§4.2).
4. **Candy everywhere.**
   - The trail is the way forward, and the bag visibly fills up.
   - Hidden candies become stickers.
   - Glittering magic candy makes him small, lights the mist, and at last makes him big again.
5. **Big moments:**
   - painting the ghost's eyes, and shrinking;
   - the paper-plane flight;
   - guiding a lost crane chick through the mist with a glowing lollipop;
   - flying with the cranes while the church bells ring in the Saturday evening;
   - the northern lights on the summit;
   - carving his own first figure, with Pappa's hand over his.
6. **The family helps like giants:**
   - Moa throws the paper plane;
   - Pappa carves a seesaw;
   - Bertil's cap carries Elof across the water;
   - Mamma lifts a fallen tree into a bridge, lets down her braid and leads the headlamps up the mountain.
   - Every moment is built from that person's traits on Olov's character sheets.
7. **An ending that turns the chase around** (§0 Q3).
   - When Elof was about three, Pappa carved his very first trägubbe, for Elof. Little Elof carried it everywhere
     and shared his Saturday sweets with it, until it was lost on the mountain.
   - The ghost carries that memory. It borrowed the bag to give the lonely trägubbe a welcome-home party.
   - On the summit Elof understands that the trägubbe was his all along. He paints it new eyes with a crowberry
     and shares his candy: one goes into the ghost's carved bag, which has always been empty. Then he eats his own
     golden geléhallon, and grows back.
   - At home, Pappa teaches him to carve, and the ghost gets its name: *Klonk*.

### Design pillars

1. **Elofs egen värld.** His house, his family and his home nature come first. A recognisable detail beats
   generic fantasy.
2. **Liten men modig.** A small hero in a huge, beautiful, touchable nature, as in Unravel. Courage and kindness
   are what the player *does*.
3. **Förstå utan ord.** The ghost has no mouth. Every story beat must work without reading and without sound.
4. **Svårt ibland, aldrig elakt.** Real jumps, timing and puzzles, but no lives, no game over and no lost
   progress. A miss costs about a second (at most about 15 s inside an exciting sequence), and nothing scary
   chases you.

### What the player does (details in §4)

| Verb | Input | What it does |
| --- | --- | --- |
| **Springa** | Stick ← → | Walk, and run when the stick is pushed far ("Snabb" on his sheet). |
| **Hoppa** | Hoppa button | A tap is a hop; holding it jumps higher. Ledges within reach are grabbed and climbed automatically. |
| **Klättra** | Stick against climbable things | Bark, roots, a hose, the candy lace, Mamma's braid. Any push except down climbs up. From above, a hose or lace slides him down. |
| **Kasta snöret** | Använd button near a red ring | The red candy lace (*godissnöret*, which fell out of the torn bag) hooks on by itself. Elof pumps the swing with the stick and lets go with Hoppa; *Hjälp med svingen* pumps for him and times his let-go (§4.2). |
| **Knuffa, Dra, Vänd, Ge, Lyft** | Använd button | The button always shows the specific verb with an icon, and the icon also floats over the target. |
| **Ta!** | Använd button close to the ghost | A near-catch, once or twice per chapter. Elof lunges, the ghost squeaks free and drops a handful of candy. |
| **Ropa på …** | Använd button at a helper spot | Calls Moa, Pappa, Bertil or Mamma for their helper moment. |
| **Måla** | Trace with a finger, or the Använd button | Two eyes: on the ghost (the prologue), on the old trägubbe with a crowberry (the summit), and on his own first figure (the epilogue). |
| **Smaka** | Använd button | Only a lingonberry (sour face!), and on the summit Elof's own golden candy. |
| **Plocka godis** | Just touch it | The candy hops into the bag. |
| **Peka** | Tap anything | A candy jiggles, and Elof walks to it if it is near. The ghost peeks, animals look up. Tapping Elof makes him wave and give a tiny wordless call. Never needed. |

**Magic candy, and how it reaches Elof:**
- The *krympstjärna* (prologue) falls out by accident. Elof only catches it; no candy found on the ground is ever
  eaten. Some of its glitter stays on him, and that is the glitter bubble (§4.2).
- The *lysklubba* (Kapitel 3) is a gift from the ghost. He holds it up as a lantern.
- The golden candy (the final) is a geléhallon in gold paper from his own bag, the kind little Elof shared with
  his trägubbe. He eats it on Saturday evening, when Saturday sweets are allowed.
- Version 1.1 adds a *bubbelgodis*, also a gift.

### Scope

| Version | Content | Length for Elof |
| --- | --- | --- |
| **Utgåva 1** | Prologue and Kapitel 1 (Gården) | 20–25 min, plus its challenge route |
| **Version 1.0** | Prologue; Gården; Granskogen, including the brook's calm edge; Myren; Berget; the final; the epilogue. The whole story. | 65–85 min, plus four challenge routes (12–24 min) |
| **Version 1.1** | *Forsen*, a cap-boat rapids chapter with the beaver, between Granskogen and Myren; the bubble candy; the bark sled; a full 3D crane flight; more duo puzzles and candy kinds | +15–20 min |

Each release must be a complete, lovable game on its own (§7).

Not included: combat or enemies, lives or game over, punishing precision, anything that requires reading,
online features, accounts, ads, purchases, analytics or tracking, or live AI.

### The first minutes, as Elof should experience them

The original times below are rough route estimates. The 10 October revision lets essential dialogue wait
for the player, separates the bird, awakening and theft, and changes the star from a touch trigger to a
deliberate taste followed by a gradual transformation and family reassurance (§3.4).

| Time | Experience | What it proves |
| --- | --- | --- |
| 0:00–2:00 | The kitchen table on a Saturday morning, close up. Pappa's figures stand on their shelf behind, with one empty place first in the row. Pappa's hands give Elof the brush; he paints the ghost's two eyes. *Pling* — it blinks, glances at the empty place, grabs the giant candy bag and wobbles off. Elof chases it across the veranda (an animated hand shows the stick only if he hasn't moved within a few seconds); the bag tears, candy trickles out. He catches a glittering star: POFF. Pappa sees tiny Elof, picks up the frozen ghost and puts it on the railing, and it sneaks off behind his back. "Följ godisspåret, Elof. Vi är nära dig hela tiden." Title. | The hook, the likeness, the magic, the Toy Story gag, the seed of the secret. Works without reading or sound. |
| 2:00–4:30 | Tiny Elof on the deck. The steps are cliffs, and a lifted board leaves a chasm; arcs of candy show each jump, and the high ones need a held jump. The ghost does a teasing little dance on the far side. He flips over a ladybird lying on its back, and it shows him the hose down. | Game feel, the wonder of scale, kindness |
| 4:30–7:30 | Under the deck: stripes of sunlight, Bertil's lost marble, the red candy lace on a nail. He pumps his first swing over flat ground, then flies across the drain. Off to the side, a chain of three swings leads to a hidden candy, for those who dare. The ghost trips on a dandelion: *Ta!* — it squeaks free and drops five candies. | Beauty, the core tool, the first challenge route, a near-catch |
| 7:30–11:00 | The lawn jungle: dew drops that ring like bells, then a breeze shakes the birch and big drops rain down, to dodge by their shadows. The birch roots, the mountain of shavings outside Pappa's workshop, and the first memory. | Exploration, the first exciting sequence, the seed of the mystery |
| 11:00–14:00 | Moa's dress and fingers, then her face: "Lillebror?! Du är ju pytteliten!" Her hand swoops at the ghost, which darts into a root hole her fingers can't enter. She climbs onto the railing and throws a paper plane; Elof flies to the forest edge. | A family role, a laugh that teaches a rule, a spectacle |

These are design minutes. Kapitel 1's beats end near 14:00 on the fastest path; with exploring and C1, Elof needs
18–22 minutes (§4.9). Re-time from Olov's own play at H2 and H3, and from Elof's first play at H4 (§7.3).

---

## 2. Characters and places: fidelity contract

**Sources.** The pictures are in `photos/` on Olov's computer. Pappa's own words about his carving are in the
repository of his webshop (Appendix B.3).

**Every picture in the root of `photos/` is used** (Olov, 3 October). They are what the characters, the ghost and
the house are built from:

| Picture | What it decides | Used for |
| --- | --- | --- |
| `sheet-player.png` | Elof from the front, the side and behind; his backpack; four expressions; three poses in motion | Elof's model, his sticker faces and his key poses (§2.1) |
| `sheet-player-phone-screenshot.jpg` | The same sheet, as a phone screenshot | A spare copy. The PNG is the one to use. |
| `sheet-siblings.png` | Moa, Elof and Bertil, each from the front, the side and behind, with their traits | Moa's and Bertil's models; Elof without his backpack (§2.3) |
| `sheet-family.png` | All five together: Mamma and Pappa from the front, the side and behind, everyone's traits, and their sizes beside each other | Mamma's and Pappa's models; the family's relative heights (§2.3) |
| `family-elof-with-siblings.jpg` | The real clothes, close up: Elof's shirt with its band collar, pin stripes, two buttoned chest pockets and sleeve tabs; Moa's denim jacket and eyelet dress; Bertil's white shirt | Cloth, colours and details for the three siblings |
| `family-emil-with-siblings-2.jpg` | The three siblings in full figure: how tall they are beside each other, and Bertil's cap | The three siblings' proportions and heights; the cap |
| `family-mamma-at-table.jpg` | Mamma's braid and black top; the inside of the glazed veranda | Mamma's model; the epilogue's veranda |
| `family-pappa-viewpoint.jpg` | Pappa on a granite slab with a view: cap, glasses, stubble, black T-shirt, denim shorts. A small boy in a flat cap sits on his lap. | Pappa's model; little Elof in the memories (§2.4); the summit's granite, pines and view |
| `ghost-carving-front.jpg`, `ghost-carving-side.jpg` | The real carving: its proportions, knife facets, wood, eyes, bag, socks and shoes | The ghost's model. These two are canon (§2.2). |
| `ghost-render.png` | The ghost in three-quarter view, with its hands and sleeves | The ghost's hands; its forms between front and side; the colour of its wood |
| `poster.png` | Elof and the ghost running; the ghost from the front and from behind; the candy; the signpost | The ghost's back, its hands and its run; Elof's run; the trail candy (§4.3); the carved lettering of the menus (§5.7) |
| `some-trägubbar.png` | Four of Pappa's figures: tomtar with tall pointed caps, big ears and carved beards, a pumpkin-headed man with a broom, and an old woman in a headscarf. His knives stand in a rack behind them. | The first trägubbe and the shelf of figures; the workshop |
| `house-deck.jpg` | The garden side: the deck with its cross-braced railings and wide steps, and the glazed veranda | The deck in Kapitel 1; the veranda in the prologue (§2.5) |
| `house-first-snow.jpg` | The yard: the big birch, the boulder in the lawn, and the veranda seen from the yard; the children's giant snowball | The lawn in Kapitel 1; the winter epilogue (STRETCH, §7.4) |
| `house-summer-scaffolding.jpg` | The front gable: its ornaments, window surrounds, door and roof | The house's model (§2.5). It also shows the house number, which is never modelled. |

- **How they are used.** A session that builds a character opens every picture listed for it as a reference
  image in Blender's viewport. The likeness sheet that Olov judges shows the model beside those pictures (§5.6).
  A model that hasn't been compared with all of its pictures isn't ready for H1b.
- **The pictures in `photos/landscape/`** (84 of them) are references for the surroundings: the environment, the
  atmosphere and the light. They show Anundsjö church and its bell tower, Bredbyn, the rivers and their rapids,
  the lakes, farms and log barns, old spruce forest, and Storklocken from two sides. They were gathered from
  Wikimedia Commons and Riksantikvarieämbetet, and `SOURCES.md` in that folder gives the photographer, licence
  and source of each. Sessions look at them when a place is built. They need not all be used.

**None of these images are committed** (§2.6): git ignores `photos/`. Nothing is traced or copied from them. The
family's pictures become models and drawn faces. Nearly all of the landscape pictures are CC BY-SA, which is not
on this project's licence list (§5.6), so none of them becomes a plate or a texture. The family photos are
screenshots that also show account names, and those are never written down anywhere.

**When sources disagree:** the sheets decide the *style* (Elof's spiky fringe, Pappa's cap on the family
sheet), and the photos decide the *facts* (the real ghost, clothes and colours). For the ghost, the two photos
outrank the render and the poster, except for its hands (§2.2). No logotype or brand mark appears anywhere in
the game (§0 Q13).

### 2.1 Elof (the player)

| Feature | Requirement |
| --- | --- |
| Age and build | Seven, with a child's proportions: big head, short legs. Never a mini-adult. |
| Hair | Short, tousled, golden blond, with a spiky fringe pointing up and forward |
| Face | Blue eyes, rosy cheeks, a few freckles, a curious closed-mouth smile at rest |
| Shirt | Light-blue pin-striped shirt with a band collar, a few buttons and two chest pockets. Sleeves rolled to the elbows. |
| Trousers and shoes | Dark-blue jeans, rolled at the ankle. Brown leather boots with laces. |
| Backpack | A small olive-brown canvas backpack, from the player sheet. The candy he collects "goes into it". |
| Traits (from his sheet) | Nyfiken, Upptäckarglad, Smart, Snäll, Snabb. His siblings call him *lillebror*, as his sheet does. |

- **Expressions:** neutral, happy, excited and curious are on his sheet. The game adds determined (the angry
  stomp), surprised, sour (a lingonberry), sad, proud and sleepy.
- **Animations:** idle (looks around), walk, run, hop, full jump, fall, soft landing, tumble (a miss), ledge
  clamber, climb, slide down, push, pull, pump and swing, throw the lace, lunge (*Ta!*), crouch-peek, brace
  (a gust), taste, give, wave, celebrate, stomp, sit and think, paint, carve, hold a lantern, ride (plane, cap,
  crane), and shrink and grow.
  - The CC0 animation library covers about half of these (§5.6). The rest are keyed in Blender or made by
    procedural layers on top. They are priced in §7.6.

### 2.2 The ghost (canon: the real carving; its hands are the poster's and the render's)

| Feature | Requirement |
| --- | --- |
| Name | *Klonk*, after the sound of its wooden feet. Elof gives it the name in the epilogue (§3.4). Until then everyone says "spöket", and so does this plan. |
| Size | About 15 cm (assumed; it has not been measured). Exactly Elof's height once he has shrunk. |
| Material | Pale, unpainted wood, probably lime (lind), the wood Pappa carves in. Carved in broad flat knife facets (flat-plane carving), never smooth, never white plastic. |
| Shape | A sheet with a hood: a rounded, slightly pointed top, a long body and a folded hem with a split at the back. Seen from the side it is deep and leans slightly forward. |
| Eyes | Two round, glossy black painted eyes, each with one white highlight dot. **No mouth, ever.** It is the theme (§3.6). |
| The carved bag | A paper bag with a folded top, wood-coloured, with painted dots in red, green and orange. It juts out in front of the body, held in the ghost's two hands. **It is part of the ghost, and it has always been empty.** |
| Hands | Two small carved fists, as on the poster and the render (Olov, 3 October). They come out of sleeve-like folds of the sheet and grip the bag. The real carving has none: there the bag is held through the sheet. Each arm is its own wooden part, so the ghost can let go with one hand to point, wave, grab, juggle or set a candy down. |
| Socks and shoes | Rainbow-striped socks (blue, green, yellow, red, orange). Red high-top canvas sneakers with white toe caps, soles and laces, and a plain white disc on the ankle. The real carving and the render have a small star on that disc; the game leaves it out, because nothing in the game carries a logotype (§0 Q13). |
| How it moves | Like a wooden toy come alive: rigid body, waddle, little hops, tilts. Tiny feet step quickly. It never bends or squashes like cloth. |
| Mischief | In the prologue and Kapitel 1 it flees and teases: a little dance, a peek, a foot that taps while it waits, candy juggled on its head. It is *busigt*, as the brief says. |
| The freeze | Whenever a grown-up looks, it freezes into an ordinary wooden figure (§3.3, rule 2). |
| Sound | Wooden knocks and creaks. Footsteps go *klonk-klonk*. A quick double knock means happy or "look here"; a slow creak means sad. |

- **How it shows feelings without a mouth:** the tilt of its body, how fast it hops, and picture bubbles.
  - The bubbles start as smudges, and get clearer each time Elof helps someone (§3.3, rule 6).
- **The stolen bag:** Elof's real Saturday-sweets bag is about twice the ghost's height. The ghost drags it or
  carries it on its back. It tears on the veranda door, and candy trickles out without the ghost noticing.

### 2.3 The family

**How the family appears** (priced in §7.6):
- **In the macro chapters:** hands, props, boots and distant silhouettes, with faces mainly in 2D portrait
  bubbles drawn from their models.
- **A giant face**, when one is needed, takes at most 40% of the screen height and stays softly out of focus. It
  rises over at least 1.5 s, after the person's clothes and fingers have been seen.
- **Whole figures** appear in the prologue, the memories, on the summit and in the epilogue: mostly held poses
  with small movements, plus the few walks the story needs (Mamma past the door, the memories, the headlamps
  arriving, the walk home).
- **Their calls** are "Heja Elof!" and "Heja lillebror!", and they wave back when he waves. They never sound
  like a search party.

| Who | Look (from the sheets and photos) | Traits on the sheet | Their moments |
| --- | --- | --- | --- |
| **Mamma** (Sofie) | Long brown braid over the shoulder. Black tank top, olive cargo trousers, brown hiking boots, a small backpack. Often holds a white mug with a red heart. | Varm, Snäll, Stark, Kreativ, Äventyrlig, Bästa mamma | **Kapitel 3 (Myren):** lifts a fallen dead pine over a pool as a bridge (Stark), lets her braid down to the boardwalk (Kreativ), warm cocoa (Varm). **The final:** leads the four headlamps up the mountain (Äventyrlig). |
| **Pappa** (Emil) | Black cap, rectangular glasses, short stubble. Black T-shirt, light denim shorts, hiking boots, an olive backpack. A red-handled carving knife and a piece of wood. | Trygg, Snäll, Äventyrlig, Fixar allt, Bästa pappa | **Prologue:** carves the ghost, and sees Elof shrink: "Följ godisspåret, Elof. Vi är nära dig hela tiden." **Kapitel 1:** his workshop in the yard, and its shavings. **Kapitel 2:** carves a seesaw (*gungbräda*). **The final:** recognises his first trägubbe. **The epilogue:** teaches Elof to carve. |
| **Moa** (big sister) | Long wavy blond hair. Light denim jacket, pale-yellow tiered dress with eyelet lace, white sneakers, a dark-red backpack. | Snäll, Modig, Äventyrlig, Kreativ, Storasyster | **Kapitel 1:** finds tiny Elof, climbs onto the railing and throws her paper plane. **The summit:** wraps her denim jacket around him. Her crayon drawing style is the game's map. |
| **Bertil** (big brother) | Red-and-white trucker cap with a plain badge instead of the club crest. White short-sleeved shirt with no chest emblem, charcoal jeans, white sneakers with a plain red stripe, freckles. | Kreativ, Sportig, Busig, Snäll, Storebror | **Kapitel 2:** his cap carries Elof across the forest pool while he cheers from the bank. Version 1.1 adds the rapids. **The summit:** puts the cap on Elof's head. |

**Pappa the carver, in his own words** (Appendix B.3). Just before the pandemic he was looking for something to
do, and found carving by chance through a video clip. Since then he has carved over 250 figures at home in
Bredbyn: in his workroom, with a workshop in the yard. He carves in linden, and a figure can take up to ten hours
from sawing and carving to painting. His inspiration comes from walks, his work and things he has seen, and his
figures range from athletes to traditional tomtar. His passion has rubbed off on his children, and his dream is
to teach carving one day.

Olov adds (3 October): Elof was about three when Pappa began, and the figures stand on a shelf at home. "Just
before the pandemic" and "about three" don't point to the same year, so the game shows no year, and Pappa says
"när du var liten".

The game uses all of it: the workshop and its shavings in Kapitel 1; a shelf of figures in his style, athletes
and tomtar, in the prologue; his first figure as the secret; and in the epilogue he teaches Elof to carve.

### 2.4 The memories: when Elof was three

The four memories (§3.3, rule 5) show the family some years ago, when Pappa had just begun to carve and Elof was
about three (§0 Q3). Four rules keep them clear for a seven-year-old:
1. Every memory grows out of the ghost's picture bubble, and shrinks back into it.
2. Each is shown in a warm sepia look with film grain (§5.4), so it never reads as "now".
3. Little Elof has the same spiky golden fringe as today, and always wears light blue, the colour of Elof's
   shirt: striped pyjamas indoors and a jacket outdoors. Outdoors he also wears a small flat cap like Pappa's,
   with his fringe sticking out under it, as the small boy on Pappa's lap does in the viewpoint photo (§2). His
   trägubbe is with him in every memory. Memory 1 ends on his face beside the little figure: "Det där är ju jag!"
   is the reaction we want.
4. Pappa looks as he does today, so he is recognised at once.

Elof was too small to remember any of this, which is why the ghost has to show him.

**Models:**
- Pappa and Mamma reuse their game models.
- Moa and Bertil appear smaller, seen from behind or far away.
- Little Elof is Elof's own model with a three-year-old's proportions (a bigger head, shorter legs), in two
  outfits. He walks, sits on Pappa's shoulders and holds his figure.
- The first trägubbe is a small figure that never moves, except for one blink at the end (§3.3, rule 1).

### 2.5 The red house on Näsbacken (from Olov's photos)

Both parents allow an exact house (§0 Q4).

- **What the photos show:** a falu-red, two-storey wooden house with white trim, a glazed veranda, a dark metal
  roof with two chimneys, a wooden deck with cross-braced railings and wide steps, a big birch and a granite
  boulder in the yard, and spruce forest behind. Pappa's workshop stands in the yard.
- **The exact details** (ornaments, door, roof, the workshop, the outbuildings) come from Olov's photos in the
  session that builds the house in Blender (§5.6). The photos are references; nothing is traced from them.
- **Never** a house number, a street sign or the view from the road. The game doesn't need them, and they are the
  details a stranger would use. In the crane flight the house is not at its true position.
- **Inside,** the prologue's set: the kitchen table the ghost was photographed on (a strongly grained oak top and
  white chairs), and Pappa's figures on a shelf, with one empty place first in the row. They do stand on a shelf
  at home (§0 Q3).

### 2.6 Consent, credit and privacy

**Consent.** On 3 October 2026 Olov reported that both parents say yes to everything listed in version 2's
§0 Q4, and that every name may be used. That covers:
- the first names of all five: Elof, Moa, Bertil, Mamma Sofie and Pappa Emil;
- Bredbyn, Näsbacken and the real places nearby;
- game models that look like the family, and an exact house;
- the story about Pappa's first trägubbe. On 3 October Olov confirmed that it may be carved for Elof and lost on
  the mountain; §0 still asks whether Pappa reads the storyboard;
- a scan of the real ghost (allowed, but not made: §0 Q7);
- family voices recorded on Elof's device (allowed, but the game has no voices: §0 Q9);
- sending the character sheets and photos to Claude, and to a paid Meshy plan (allowed, but no such plan is
  used: §0 Q15).

Anything comes out of the game, the site and the current files if a parent asks, but what has been pushed stays
in the public git history; v2's §0 Q4 said so when consent was asked. Anything personal that is *not* on the list
is asked about first.
Place names are allowed, but the game uses them the way a child does: Moa's map says "Hemma" (§4.9).

**What stays out anyway.** None of this limits the game; it only keeps a stranger from finding the children:
- surnames, the house number or street address, the house's coordinates, the school, and the family's own
  account names;
- real photos of the family and the character sheets, which stay out of the repository and off the site.

**Pictures and models:**
- Sessions read photos and sheets from the `photos/` folder on Olov's computer, which git ignores, or get them
  as attachments. Working copies stay in the session scratchpad.
- One house photo shows the house number, and the phone screenshots show account names. Both stay in
  `photos/`, and neither detail is ever modelled, drawn or written down.
- **The family's game models, textures, `.blend` files and likeness renders live in a separate private
  repository**, which the deploy workflow fetches with a secret (§6.11). Anyone who plays the game can still see
  the models; the private repository only means that taking them down later is one redeploy, while the public
  git history is permanent.
- Contact sheets in pull requests use a stand-in figure for the family. Likeness renders reach Olov through the
  session, never through git.
- Faces are sticker meshes drawn as game art (§5.6), never textures taken from a photo.

**Voices** (§0 Q9): the game has none. Nothing is read aloud and nothing is recorded, so no real person's voice
and no synthetic speech is ever part of the game or the site. Characters make short wordless sounds (§5.8).

**The site:**
- `noindex, nofollow, noimageindex` on every page, no social-preview tags, and no link to the site from the
  README.
- No analytics, cookies or third-party requests; fonts and libraries are self-hosted.
- The album's pictures are game renders stored on the device only. There is no camera and no upload, and the
  album is cleared with the player profile.

**Other people's services:**
- No image-to-3D service is used (§0 Q15). If one ever is, check its training, gallery and deletion terms
  before any sheet goes to it, and note them in `LICENSES.md`.
- *MCP for Blender* runs with its telemetry switched off, because opting in would upload viewport screenshots
  and scene data, which would include the family's models (§5.6).

**Enforced in CI** (§6.12): a metadata check on every image and model, and a denylist check (surname, house
number, school, account names) whose list is stored as a secret.

**Credits** (the wording is Olov's to change): "Spöket är täljt av Pappa Emil. Spelet är gjort till Elof av morbror
Olov – med hjälp av Claude." If Pappa wants, the credits can also name his carving.

---

## 3. Story

### 3.1 Premise, in words a seven-year-old can repeat

At the start: "Spöket tog mitt godis! Jag följer godisspåret och tar tillbaka det."

From the end of Kapitel 2 on: "Varför tog spöket godiset – och varför väntar det på mig?"

### 3.2 Cast

- **Elof**, the player.
  - Arc: he starts out cross ("Ge tillbaka mitt godis!"), becomes curious, then begins to understand. In the end
    he decides himself who gets his candy.
  - His want is small and concrete: his bag of Saturday sweets.
- **Spöket**, Pappa's newest carving, which comes alive when Elof paints its eyes.
  - At first mischievous and a little scared. Kind underneath.
  - It cannot speak; it shows.
  - Elof names it *Klonk* at the end (§0 Q12).
- **Pappa, Mamma, Moa and Bertil**, giants who stay close (§2.3). Pappa sees Elof shrink and trusts him to
  follow the trail; the others hear about it and come along.
- **Lavskrikan**, a Siberian jay: grey-brown with a rusty tail.
  - Lavskrikor are famous in Norrland for being curious and following walkers for food (Appendix B, marked
    general knowledge).
  - It tries to pinch Elof's candy. He gives it a lingonberry instead (no candy for wild animals), and it becomes
    his hint companion from Kapitel 2 (§4.6).
- **Animal friends** (§4.4): a ladybird, ants and a crane family. A dipper and a beaver in Version 1.1.
- **Den första trägubben**, the very first figure Pappa ever carved, when Elof was about three (§0 Q3).
  - Small and a little clumsy, as a first try is: a round head, a pointed cap and a crooked carved smile. Its
    painted eyes have weathered away.
  - It was little Elof's own: he carried it everywhere, and shared his Saturday sweets with it.
  - It has lain grey and mossy in a crack beside the old pine on the summit for years: more than half of
    Elof's life.
  - It *has* a mouth: the visual opposite of the ghost.

### 3.3 World rules (set up early so the ending is fair)

1. **Spöket fick liv av Pappas händer och Elofs ögon.** Pappa carved it, and Elof painted its eyes. Pappa's
   carvings wake only when Elof gives them eyes. This is why the ghost carries Pappa's memories and why it turns to
   Elof. It is also why the old trägubbe, after years in the dark, has just enough life for one blink once
   Elof has painted it new eyes, which comes when the northern lights flare, and why the figure Elof carves with
   Pappa's hand over his blinks at the very end.
2. **När en vuxen tittar stelnar spöket** into an ordinary wooden figure: the Toy Story rule.
   - Children see it move too, but only tiny Elof is small enough to follow it where it goes (rule 8).
   - Grown-ups can't catch what they only ever see as a carving.
   - The rule is taught as a joke twice in the prologue: Mamma at the door, and Pappa at the railing. Moa's grab in
     Kapitel 1 shows rule 8.
3. **Glittrande godis är trollgodis.**
   - When the ghost grabbed the bag, two candies started to glitter. A star fell out on the steps: eating it
     makes you small (Olov's revised direction, 10 October 2026). Discovering it and choosing **Smaka på stjärnan**
     are separate moments; walking through it never consumes it. A geléhallon in gold paper stayed in the bag, and it glints there all game: eating it makes
     you big again.
   - Some of the star's glitter stays on Elof. When he falls too far, misses a jump over water or wet moss, or is
     bowled over by a cone, it catches him in a bubble and floats him back: the glitter bubble (§4.2). The first
     time it happens, under the deck in Kapitel 1, the ghost watches with its head tilted.
   - Later the ghost makes candy glitter on purpose, as gifts: the lollipop lantern (and the 1.1 bubble candy).
   - Ordinary trail candy never glitters, and is only collected.
4. **Stora godisbitar är trygga platser.** A big candy on the path is a checkpoint: the game saves, and a little
   sparkle says so. This is Unravel's yarn spools, in candy.
5. **The ghost's memories glow in wood.**
   - Where the ghost has stopped, a glowing curl of wood shaving (*minnesspån*) lies on the path.
   - Touching it plays one short, wordless memory: 6–10 seconds, growing out of the ghost's bubble.
   - Four memories, one per chapter, tell the secret in pictures before anyone says it. This is Unravel's
     photo-album memories, made of Pappa's shavings.
6. **The bubbles get clearer.** The ghost's picture bubbles are smudges in Kapitel 1, shapes in Kapitel 2, and
   clear pictures from Kapitel 3, getting sharper each time Elof helps someone. Understanding grows, and you can
   see it.
7. **The candy trail is never lost.** From each candy on the path the next one is visible. Gaps that need a jump
   are shown by an arc of candy (§4.3).
8. **Giants can't go where the ghost goes:** under roots, through thickets, across soft bog, up cracks. Small
   Elof can.

### 3.4 Beat outline (Version 1.0)

Version 5's [opening and chapter design](storytelling-overhaul.md#opening-cause-and-effect) clarifies this
outline: the theft, torn bag and star are visible causes, shrinking is witnessed beside the family, and
the current purpose evolves across chapters. The development scope also includes local return routes,
family rehearsal bodies and the finale's visible painting, sharing and shoulder carry. The original beats
and character history below remain the story's basis; rehearsed scenes are not evidence of final art.

The day runs from morning to night through one Saturday in late September (*brittsommar*). In Bredbyn on 26
September 2026 the sun rises at 06:42 and sets at 18:35, and at noon it stands only about 25° high, so the light
is low and long all day (Appendix A). Version 1.1 additions are marked **[1.1]**. Exciting sequences are **E1–E4**
and challenge routes **C1–C4** (§4.7).

**Prolog: Lördagsmorgon (normal scale, table-top; about 2–3 min)**
1. **The kitchen table, 09:00,** close up.
   - The oak table in the morning sun. Pappa's hands blow the last shavings off his new ghost. Behind it, his
     figures stand on their shelf, athletes and tomtar, with one empty place first in the row. Elof's giant
     Saturday-sweets bag stands beside the ghost.
   - Mamma, in a bubble from the doorway: "Den får du öppna ikväll."
   - Bertil's hand sneaks towards the bag; Elof pulls it back.
2. **"Måla ögonen!"** (P0). Pappa's hand gives Elof the brush, and Elof traces two eye spots. A stroke that is too
   short is finished for him; there is no wrong way. Pappa goes to answer Mamma's call.
3. **The blink.** *Pling* — the ghost blinks and tilts its head, a comic beat rather than a stare. It looks at the
   empty place on the shelf, then at the bag. It grabs the bag, busily, wobbles under its weight, and hops off
   the table.
   - When Mamma passes the door, it freezes mid-hop and topples over flat. Once she has gone, it scrambles up and
     runs (the first freeze joke).
4. **The chase** at normal scale. An animated hand shows a control only if Elof hasn't found it within a few
   seconds (§4.1): the stick, then Hoppa at the veranda door sill.
   - The bag tears on the door hinge, and candy trickles out behind the ghost without it noticing.
5. **The star.** A glittering star rolls out onto the deck steps. Its discovery waits for reading, then Använd
   says **Smaka på stjärnan**. Elof raises it to his mouth, takes a bite and swallows before the magic begins.
   *POFF* — Elof gradually shrinks, and the camera descends with him to the planks. A few sparkles stay on him
   (rule 3). There is room for a quiet breath and his call for Mamma before the family reassures him.
6. **Pappa** steps out in time to see tiny Elof on the step. The ghost freezes as he looks.
   - He picks it up, puzzled, and puts it on the railing. While he turns to Elof, it sneaks off behind his back.
   - Elof points; Pappa sees an empty railing.
   - Pappa, kneeling: "Följ godisspåret, Elof. Vi är nära dig hela tiden."
   - Title card: **Elof och det stora godisäventyret**.

**Kapitel 1: Gården (10:00, dew and sun)**
- **The deck.** The steps are cliffs, and a board Pappa has lifted for repair leaves a chasm (P1). The highest
  step needs a held jump. On the far side the ghost does a teasing little dance, then runs.
- **The ladybird** (P2). A ladybird lies on its back. Elof flips it with a grass-stem lever, and it flies to a
  garden hose hanging over the edge. Grabbing the hose from above slides him down.
- **Under the deck.** Stripes of sunlight fall through the planks. Lost things lie about: Bertil's marble, Moa's
  hair clip, a toy brick (O2).
- **The candy lace** (P3). The red candy lace, which fell from the torn bag, hangs from a nail. Elof pumps the
  first swing over flat ground, where a miss costs nothing; the second crosses the drain gully, with a ramp of
  candy leading out. If he misses, he tumbles into sparkles: the first glitter bubble, which the ghost watches
  with its head tilted.
- **C1 Svingkedjan** (optional). Off to the side, three swings in a row over the gully lead to a hidden candy.
- **The ghost as helper.** At the gully, the ghost hops back into view once, stares at the hook and double-knocks
  (§4.6). Its first bubble is only a smudge. Why does it help?
- **Near-catch.** The ghost trips on a dandelion. *Ta!* Elof lunges into the grass; it squeaks free and drops five
  candies.
- **The lawn jungle.** Tall grass, dew drops that ring when bumped (O1), the birch's roots like a mountain
  range, and a big boulder.
- **E1 Daggregnet.** A breeze shakes the birch, and big dew drops rain down. Each drop's shadow grows on the
  ground before it lands. Elof runs through, dodging; a drop that hits him knocks him over with a splash, and he
  sputters for a moment. Nothing is lost.
- **Pappa's shavings mountain** (P4), outside his workshop in the yard. Shaving curls are ramps and tunnels; Elof
  pulls one curl into a ramp and pushes a second to bridge the gap at the top. There lies the first glowing
  *minnesspån*.
  - **Memory 1:** night, at the same kitchen table, years ago. A phone propped against a jar plays a carving
    video. Pappa's hands, still unsure, carve a small figure with a pointed cap, with a plaster on one thumb.
    Little Elof, three years old, has crept out of bed in light-blue pyjamas and watches with his chin on the
    table edge. Pappa carves a smile, and puts the little figure in his hands. Little Elof hugs it.
- **The angry stomp.** The ghost waits on a birch root and juggles a candy. Elof stomps: "Ge tillbaka mitt
  godis!" It hops away.
- **Moa** (S1).
  - Her dress and fingers appear first, then her face, softly out of focus: "Lillebror?! Du är ju pytteliten!"
  - Her hand swoops at the ghost, which darts into a root hole her fingers can't enter. A laugh, and the rule.
  - "Ropa på Moa": she folds a paper plane from her drawing, climbs onto the deck railing (Modig) and throws it
    as far as she can. Elof flies to the forest edge, steering up and down through arcs of candy.
- **End.** Elof lands in the moss at the forest edge, and the ghost slips in under the spruces.
  - End card: **Kapitel 1 klart!**, with the candy shown in rows of ten and new stickers.
  - Moa's map gets its first drawn part.

**Kapitel 2: Granskogen (11:30 to 14:00, cathedral light and the brook)**
- **The forest.** Spruce trunks like pillars, shafts of light, moss carpets, lingonberries (taste one: sour
  face, O10), cones as big as cars, and beard lichen hanging like curtains.
- **Lavskrikan** (P6). A jay swoops in to pinch a candy. Elof gives it a lingonberry instead (*Ge*), and it
  becomes his friend and companion.
- **The ant road** (P5). A fallen twig blocks the ants' road. Elof pulls it away with the lace, and the ants
  carry him up their anthill on a *myrhiss* (ant lift).
- **C2 Myrstacken** (optional). The anthill's steep outside, climbed on moving ant columns, leads to a hidden
  candy at the top.
- **The vittra door** (O3, in V1.0 as a story beat). From a distance, Elof sees the ghost put one of his candies
  by a tiny door under a spruce root, for the polite underground neighbours of Norrland folk belief. "Spöket ger
  bort mitt godis!?" The ghost's bubble shows a shape now: a small figure.
- **E2 Kottlavinen.** On a needle slope, Elof nudges a loose cone, and it sets off a rolling avalanche of cones.
  He races downhill, jumping bouncing cones and a gap, while the ghost squeals ahead. A cone that catches him
  bowls him over into the glitter bubble, which sets him back at the last big candy; two of them split the run.
- **Pappas gungbräda** (P8). A ravine between two roots is too wide to cross.
  - "Ropa på Pappa": his hands carve a little seesaw from a dry stick in a few seconds and set it on a stone.
  - Elof pushes a cone along its rail to Pappa's hand and stands on the low end. Pappa drops the cone on the high
    end, and Elof is launched. The small cone nearby launches him too low; the big one, further up the slope,
    carries him across.
- **Near-catch** on a fallen log: *Ta!*
- **Memory 2:** an autumn walk in the forest, years ago. Little Elof, in his light-blue jacket and flat cap, carries the
  little figure in his mitten. He sets it on a stump and takes two raspberry jellies out of his own small Saturday bag:
  one for the figure's lap, one for himself. Pappa photographs them, and they both laugh.
- **The brook's calm edge.** A forest pool glittering in the midday sun. The ghost floats across on a leaf.
- **Kepsbåten** (S3).
  - "Ropa på Bertil": his hand sets his cap upside down on the water.
  - Elof paddles across, steering with the stick; it can't fail. A small stretch of current is the only rush.
  - Bertil's bubble: "Heja lillebror!"
- **Spöket i virveln** (P10). Below a tiny fall, the ghost spins helplessly in an eddy: wood floats, but it is
  frightened.
  - Elof throws the lace from a stone and pulls it ashore.
  - It stares at him, hugs the bag, and runs, but on the stone it leaves one candy, carefully placed. "Spöket
    tackade mig!"
  - From now on it waits for him.
- **End.** Its bubble shows a mountain. It hops off towards the bog, slowly, looking back.
- **[1.1]:**
  - *Bubbelgodiset* (P7): a glittering gum ball, a gift, at the foot of a hollow stump. Elof floats up inside it.
  - *Barkpulkan* (S2): a ride down a needle slope on a piece of bark.
  - The chapter *Forsen* (S3b, P9) follows Granskogen.

**[1.1] Forsen (14:00, glittering).** Bertil's cap carries Elof down the rapids, steering left and right. The
cap stops at a beaver dam, where a beaver can't reach the stick it needs. Elof pulls the stick within reach with
the lace, and the beaver lifts the cap over the dam. Also here: a dipper, water striders to hop on (O6), and
Näckens fiol (O5).

**Kapitel 3: Myren (16:30 to 18:00, mist)**
- **The bog.**
  - Tussocks (*tuvor*) are the path. They dip to his ankles and bounce back (P11).
  - Open wet moss and pools: Elof never steps onto them. He stops at the edge and points to the next tussock. On
    a missed hop, the glitter bubble catches him in the air, before he touches them.
  - Red and green sphagnum, dwarf birch in autumn red, orange cloudberry leaves, and cranberries that bounce
    (O7). Cotton-grass has finished by late September, so it is left out.
  - Dark pools mirror the sky; grey dead pines (*torrakor*) stand about. The ridges and pools of a string bog.
- **E3 Sjunkande tuvor.** Further out, some tussocks sink slowly once he lands, so he has to keep hopping. As a
  tussock sinks under him, the glitter bubble lifts him off before the water reaches his boots, and floats him back
  to the last firm one.
- **Mamma** (P12).
  - At a wide pool: "Ropa på Mamma". Her hands lift a fallen dead pine across the pool as a bridge.
  - At the boardwalk she lies down on the planks and lets her braid down, and Elof climbs it.
  - At the top she warms his hands at her heart mug: "På myren går vi på spången." The music turns warm, and the
    game saves.
  - Her lamp stays visible behind him for the rest of the chapter.
- **Lysklubban** (P13). The trail ends at a glittering lollipop that the ghost has stuck upright in the moss for
  him. He holds it up like a lantern.
  - Only now does the mist roll in.
  - In the lollipop's light the trail shows. The *lyktgubbar* turn out to be shy lights that play hide-and-seek,
    never tricks.
- **C3 Lyktgubbarnas lek** (optional). Find the shy lights in the mist, each one hiding further out on the
  tussocks; the last one leaves the chapter's hidden challenge candy.
- **Tranungen** (P14). A young crane has lost its family in the mist.
  - Its family's calls show as soft rings rising out of the mist, and the chick turns towards them, so it works
    without sound.
  - Elof leads it with his light until they find each other. Someone small and lost is brought home.
- **The ghost waits** on a tussock and lets Elof come close. Its bubble is clear now: a mountain with an old pine,
  and something small and grey in a crack beside it.
- **Memory 3:** late afternoon on a bog boardwalk, years ago. The family walks towards a mountain: Mamma with a
  smaller Moa by the hand, a small Bertil running ahead, and little Elof on Pappa's shoulders, holding his figure
  up so that it can see the way.
- **Tranornas dans** (S4). The cranes dance in the mist, and one kneels. Elof climbs on, and the jay flies off
  towards the boardwalk.

**Kapitel 4: Berget (18:00 to sunset at 18:35)**
- **Tranflygningen** (S5): Nils Holgersson's ride, for Elof.
  - In V1.0 it is built from layered plates rendered in Blender (§5.6). [1.1]: a full 3D landscape.
  - Below them: the forest, the brook glittering, the bog, a river and a lake. A church bell tower rings in the
    Saturday evening at 18:00 (*helgsmålsringning*).
  - A red house shows below, though not at its true position. Four tiny headlamps cross the bog, the jay flying
    ahead of them.
  - Elof steers up and down through arcs of candy; nothing can end the ride.
- **Landing on the mountain's shoulder** in golden hour. Granite slabs, reindeer lichen like snow-white shrubs,
  crowberry, crooked pines and an erratic boulder.
- **Strandstenarna** (O8). Round beach cobbles lie high on the mountain, because the sea once reached up here.
  Each cobble rings a note.
- **E4 Vindbyarna.** On the open granite below the summit, gusts sweep across. Bending lichen and a whoosh line
  show each one coming. Elof dashes from boulder to boulder between gusts; a gust that catches him in the open
  pushes him back to the last boulder. Nothing falls.
- **The ghost is stuck** below the last cliff, with the bag too heavy to lift.
  - Elof could take the bag now. The ghost doesn't run; it points up. Its bubble shows the lonely trägubbe.
  - The Använd button shows *Lyft*. Elof chooses to help.
- **Två är starkare än en** (P15). In V1.0, one duo puzzle in the spirit of Unravel Two: Elof boosts the ghost
  up a ledge, and it lowers the lace back to him. The partner always does its part, with no timing. [1.1]: two
  more.
- **C4 Toppröset** (optional). A hard climb past the pine to the summit cairn: the best view in the game, and a
  hidden candy.
- **The old pine** at sunset.
  - **Memory 4:** the same pine, years ago, at sunset. Pappa sets the little figure on the rock beside the pine, to
    photograph it against the view with little Elof next to it. A gust comes; the figure tips and slides into a
    deep crack. Pappa reaches in, then lies flat and reaches further; it is too deep. Little Elof lays his last
    raspberry jelly at the edge of the crack, for the figure, and waves. Pappa lifts him onto his shoulders, the
    light fades, and the family walks down. In the dark crack the little figure smiles, alone.
  - Elof: "Spöket vill hämta hem min trägubbe!"

**Final: Norrsken (blue hour into night; about 6 min, with a tap at least every 30 s)**
1. **The crack** (P16). Elof lowers the lace; the ghost climbs down and takes the trägubbe in its
   arms. They pull together, and out it comes: grey, mossy and smiling, with no eyes left.
2. **New eyes.** Elof picks a crowberry from the heather and dots two eyes on the old figure, as he did on the
   ghost that morning.
3. **The party it wanted.** The ghost sets the trägubbe by the pine, facing the view, and puts a
   raspberry jelly in its lap, as little Elof used to: its welcome-home party.
4. **The bag comes back.** The ghost gives Elof the bag: it was only borrowed.
5. **Dela godiset** (P17), a real choice. Elof taps a candy, then a friend, and decides himself who gets what:
   - the trägubbe;
   - the ghost: the candy goes into its carved bag, which has always been empty;
   - the jay gets a lingonberry from his pocket.
   - The bag still bulges afterwards; sharing is not losing.
6. **The golden geléhallon** glints. It is Saturday evening, when Saturday sweets are allowed.
   - *Smaka* → *POFF* — Elof grows back, mirroring the prologue, with both carvings at his feet.
   - The northern lights flare. In their light the old trägubbe blinks, once (rule 1).
7. **Headlamps.** Mamma leads the family up the path; the jay found them.
   - Pappa sees what Elof holds, and goes quiet: "Min allra första trägubbe … Den täljde jag till dig när du var
     liten, Elof. Vi tappade den här uppe."
   - Moa wraps her denim jacket around Elof, and Bertil puts his cap on Elof's head.
   - Hugs under the northern lights.
8. **Home.** A short, calm walk down through the night forest with Elof on Pappa's shoulders, holding both
   carvings. It is playable and can't fail.

**Epilog: Godiskalaset (21:00, the glazed veranda; about 4–5 min)**
- Candles, and a normal Saturday portion in each bowl. The first trägubbe gets its place, first in the row on
  Pappa's shelf, with the ghost beside it.
- **Elof hands out candy** (P18). Tap a candy, then a person. They like every kind (§0 Q11), so whatever he
  picks is met with delight. One more goes into the ghost's bag.
- **The naming** (§0 Q12). The ghost hops across the table, and the sound of its feet pops up as letters:
  *klonk, klonk*. Elof laughs: "Du ska heta Klonk!" The ghost double-knocks: yes. From here on, the menus and
  the map say Klonk.
- **Elofs första trägubbe** (P19). Pappa gives Elof a small piece of linden and a knife, and kneels beside him:
  "Alltid bort från kroppen." With Pappa's hand over his, Elof makes three strokes, each traced away from his
  body; a stroke towards himself simply doesn't start. Out comes a tiny, crooked figure. Elof dots two eyes on it
  with Pappa's brush and sets it on the windowsill.
- **Teeth.** Everyone brushes their teeth – except the ghost, which has no mouth.
- **The album as credits,** which Elof can tap through (§6.10).
- **Last card:** "Klonk kunde inte säga det med ord. Men Elof förstod." Then **Utforska vidare** opens every
  chapter for free play, to find the remaining candy, stickers and challenge routes.
- **After the credits:** night, the windowsill, moonlight. Elof's tiny figure has two dots of paint for eyes.
  *Pling.* It blinks.

### 3.5 Why the ghost did it (told only in pictures until the summit)

**Version 5 comprehension requirement.** At the summit, the pictures and a short explicit explanation
connect the lost first carving to the Saturday sweets: the ghost took the bag for a welcome-home party,
the way little Elof used to share with it. Revealing that it wants to recover the figure alone does not
explain the candy theft. The explicit motive is gated by actual carving rescue, painted eyes and bag
recovery; it must still appear if the optional mountain memory was missed. Personal purpose/recap wording such as
"min gamla trägubbe" remains guarded by that memory's discovery. Before the finale gate, goals and recaps
show only what Elof has already learned; later recaps retain the appropriate motive without inventing a
memory discovery.
See [the purpose progression and reveal](storytelling-overhaul.md#purpose-and-recap).

The ghost came alive through Pappa's hands and Elof's eyes, so it carries a little of both, including Pappa's
memory of his very first trägubbe: carved for three-year-old Elof, who shared his Saturday sweets with it, and
lost on the mountain that autumn (§0 Q3).
- **The theft.** The ghost saw the empty place on the shelf and the biggest bag of sweets in the house. It meant
  to fetch the lonely trägubbe home and give it a welcome-home party with Saturday sweets, the way little Elof
  always did. So it grabbed the bag, mischievous and clumsy.
- **The accidents.** The tear in the bag, the trail and the star that shrank Elof were all accidents.
- **The turn.** When it saw Elof following, and above all after he saved it from the eddy, it understood that he
  could help. It began to wait and leave him gifts.
- **Why it couldn't ask.** It has no mouth, and at first even its picture bubbles were only smudges.
- **What Elof didn't know.** The trägubbe was his. The ghost wasn't stealing his Saturday; it was bringing home a
  present his father made him when he was too small to remember, and finishing the party that little Elof began
  at the crack.

Every one of these facts is visible in play before Pappa says it on the summit:
- the empty place on the shelf, and the ghost's look at it (the prologue);
- Pappa carving the little figure and giving it to little Elof (memory 1); little Elof sharing his candy with it
  (memory 2), and leaving it one at the crack (memory 4);
- the ghost giving candy away (the vittra door);
- the tear on the door (the prologue);
- the waiting after the rescue;
- the bubbles growing clearer.

After his first play, Elof is asked to retell the story (§7.2), to check that the pictures carry it.

Olov approved the core of this on 3 October: the first trägubbe was carved for Elof, and lost. The details of
the memories are this plan's, and his to change. The memories are still built last in each chapter, so a change
from him or from Pappa (§0) would cost little: only the memories, the summit reveal and Pappa's line would
change. If Pappa's real first figure still exists, the game's trägubbe is modelled on it, and the story becomes
how it came home.

### 3.6 The theme, in one image

**The ghost has no mouth.** Elof learns to understand someone who cannot say it in words:
- a ladybird on its back;
- ants with a blocked road;
- a lost crane chick;
- a frightened ghost in an eddy;
- and in the end his own father, through memories from when Elof was too small to remember.

The ghost's bubbles sharpen as he learns. The game itself is wordless for the same reason. The candy trail began
as an accident and became the ghost's way of saying "följ med". The two carvings Elof brings home are opposites:
one has no mouth, and the other has a crooked carved smile.

The ending's line, which the player has already understood: "Klonk kunde inte säga det med ord. Men Elof
förstod."

### 3.7 Tone and words

- **Tone map:**
  - Prolog and Gården: playful and comic, with the freeze jokes and the near-catches.
  - Granskogen: wonder, a little mysterious, always safe; the cone avalanche is slapstick.
  - The brook: sparkling.
  - Myren: mysterious, made safe by Mamma's lamp and the lollipop.
  - Berget: grand and tender.
  - The final: moving and magical.
  - The epilogue: warm and proud.
- **Wordless first.** Every beat works with text and sound off, through:
  - poses and faces;
  - picture bubbles and the memories;
  - icons on buttons;
  - the candy trail.
- **Words for those who want them:**
  - at most about 60 short captions in the whole game, each bubble at most about 40 characters (longer lines,
    like Pappa's on the summit, run over two or three bubbles), never required;
  - nothing is read aloud, and nothing is recorded: the game has no voices (§0 Q9). A line that someone "says"
    is a bubble.
- **Exciting, never scary:**
  - no villains, and nothing that chases Elof; the cone avalanche is a comic accident he set off himself;
  - a miss looks like a tumble into sparkles, never like getting hurt;
  - no darkness without a warm light nearby;
  - no spiders or wasps as threats;
  - giants appear gently (§2.3);
  - the ghost teases, but never laughs *at* him.
- **Healthy, without preaching:**
  - candy is collected, not eaten, until Saturday evening;
  - animals get lingonberries, not candy;
  - no candy found on the ground is eaten; the only wild thing Elof tastes is a lingonberry, picked from its plant,
    and the crowberry is paint;
  - candy is never placed next to mushrooms;
  - on the bog we walk on tussocks and boardwalks;
  - Elof never walks into water;
  - the carving knife always cuts away from the body, with Pappa beside him;
  - teeth get brushed.
- **Swedish style,** as in Sköldhästen:
  - address the player as *du*;
  - Swedish quotation marks (” ”) and dashes (–) in game text;
  - plain child words;
  - every string lives in `src/content/sv.ts`.
  - **Two traps already found:** *tälja* is a verb, so the noun is *trägubbe*, *figur* or *träspöke*; and
    *spöket* is neuter, so write "det" or "spöket", never "den".
- Olov reads every line aloud once before each release.

---

## 4. Play

Elof is seven and plays games made for eleven-year-olds (§0). So the game asks for real skill: jumps whose
height he controls, a swing he pumps and times himself, puzzles of up to four steps, and an exciting sequence in
every chapter. What Sköldhästen's kindness rules protect is kept: nothing can be lost, and a miss costs about a
second. A second play style, *Lugnt*, brings back version 2's gentler game for anyone who wants it.

### 4.1 Controls

| Action | Touch (phone, tablet) | Keyboard | Gamepad (standard mapping) |
| --- | --- | --- | --- |
| Move | Floating stick: appears where the left thumb lands. Horizontal on the ground; vertical while climbing or swinging. | ← → / A D (Shift walks). ↑ ↓ / W S climb. | Left stick or D-pad |
| Hoppa (a tap hops, holding jumps higher) | Large round button, lower right, **96 CSS px** | Space, or ↑ / W when not on something climbable | A |
| Använd (shows the specific verb and its icon; the icon also floats over the target) | Round button above Hoppa, **84 px**. Dimmed when nothing is near. | E or Enter | X |
| Ropa på hjälparen (§4.6) | The helper's portrait, top right: the ghost in Kapitel 1, the jay from Kapitel 2. A tap on the helper works too. | H | Y |
| Godispåsen and paus | Top corners, 64 px | G for Godispåsen; Esc or P to pause | View / Start |
| Peka | Tap anything in the world (§1) | — | — |

All touch sizes are ×1.15 on tablets.

- **Reused from Sköldhästen** (`skoldhast/src/input.mjs`, ported to TypeScript):
  - pointer capture per touch;
  - every held input released on cancel, blur or pause;
  - a press queue, so no press is lost at any frame rate; releases are queued too, because a held jump needs
    them;
  - movement keys by position (`KeyW`), the newest of two opposite directions wins;
  - the on-screen controls follow the device in use, not the kind of computer;
  - gamepad focus navigation in menus;
  - its quick-tap test (under 350 ms and 14 px), extended from the hero to everything in the world.
- **A wordless tutorial, only when needed.** In the prologue chase an animated hand shows one control at a time,
  and only if Elof hasn't found it by himself:
  1. the resting stick at 40% opacity, after 4 s without moving;
  2. Hoppa at the first door sill, after 3 s at the sill;
  3. Använd at the star, after 3 s beside it.
- **Never needed:** a double tap, mashing, or two buttons at once; the stick plus one button is the most any move
  asks for. Holding Hoppa only makes a jump higher. Timing
  matters in the swing and in the exciting sequences on *Äventyr*; *Lugnt* takes it away.
- **Every touch target** is at least 64 CSS px, with at least 12 px between targets. Both action buttons sit
  inside the bottom-right safe area.
- **Orientation.**
  - Landscape is the main layout: the side view needs width.
  - Portrait stays fully playable. The world view uses the top ~65%, the controls sit in a band below, and the
    camera zooms out.
  - The title shows a picture of the device turning, and "Vänd skärmen på bredden!"
- **Two play styles,** chosen on the first screen from two pictures (Elof mid-leap, and Elof strolling with the
  jay) and changeable at any time in settings:
  - ***Äventyr*** (Elof's default): Elof pumps and times the swing; falls and missed jumps end in the glitter
    bubble; the exciting sequences run at full speed; help comes only when asked.
  - ***Lugnt***: version 2's game for younger players. *Lätta hopp*, *Hjälp med svingen* and *Ljud även i tyst
    läge* are on; jumps are steered to their landings, and Elof stops at every edge higher than 4 EL instead of
    falling. In the exciting sequences, drops and cones miss a moving Elof, gusts only slow him, and tussocks sink
    only when he stands still, so nothing needs timing. Help is set to *Påminn mig*.
  - Every setting can also be changed on its own.
- **Settings** (most from Sköldhästen):
  - *Spelsätt*: *Äventyr* or *Lugnt* (above).
  - *Hjälp med svingen*: the swing pumps itself and always lands on the ledge (§4.2).
  - *Lätta hopp*: running towards a marked jump edge jumps automatically, and the jump is steered towards its
    landing.
  - *Följ fingret*: Elof walks towards a held finger.
  - *Vänsterhänt*: the controls swap sides.
  - *Lugnare tempo*: the whole game runs at 80%. This is Unravel Two's speed assist.
  - *Större text*, *Mindre rörelse* and *Ljud även i tyst läge* (§6.8).
  - Volume for *Musik* and *Ljud*.
  - Help level (§4.6) and graphics level (*Auto / Låg / Mellan / Hög*, §6.5; *Auto* picks *Hög* on the family's
    devices).
  - *Tangenter och handkontroll*, the key reference.

### 4.2 Movement rules (starting values; EL = one Elof length, his current height)

The simulation always measures in EL, at both scales, so the same numbers work in the prologue and in the
macro world.

- **Run.** Walk at 1.2 EL/s; run at 3.5 EL/s after 0.3 s of full stick. Stops within 0.15 s: snappy, because
  children notice slow controls immediately.
- **Hoppa.**
  - **A variable jump.** A tap gives a hop with its apex at 0.6 EL. Holding the button reaches the full 1.1 EL;
    letting go early cuts the rise. A running jump reaches 2.2 EL.
  - **Coyote time 0.15 s and a jump buffer of 0.2 s**: generous enough for small hands, tight enough to feel
    precise.
  - Ledges whose top is within 1.4 EL are grabbed and climbed automatically (0.4 s).
- **Terrain.**
  - Steps up to 0.3 EL are walked over; slopes up to 45° are walkable. Steeper ground slides him down gently.
  - Drops of up to 4 EL end in a soft landing: a puff of moss and a roll.
  - **Higher drops.** Walking, Elof never goes over an edge higher than 4 EL: he stops and looks down, which is
    why the hose and the lace matter. Jumping from one, or missing a jump above one, is a fall, and a fall of
    more than 4 EL ends in the glitter bubble.
- **The glitter bubble (*glitterbubblan*).** Some of the shrinking star's glitter stays on Elof (§3.3, rule 3).
  - When he falls more than 4 EL, would land in water or open wet moss, or is bowled over in the cone avalanche
    (E2), the glitter gathers into a bubble around him and floats him back to the last safe ground in about a
    second. Over water and wet moss it catches him in the air, before he touches them: the game never shows Elof
    in water.
  - It is a golden sparkle shell, never a round gum bubble like the 1.1 bubble candy.
  - Nothing is lost: candy stays collected, and puzzles keep their state. This is how most failing works; in E1 a
    drop only knocks him over, and in E4 a gust only pushes him back.
  - Safe ground is the last spot where he stood for 0.5 s on a surface tagged safe. Authored checkpoints inside
    puzzles and exciting sequences override it, so he never lands somewhere that fails again at once.
- **Climbing.** 1 EL/s on surfaces tagged climbable, attaching automatically when he walks into them.
  - While he is attached, any push except down climbs up, because children hold "forward".
  - Grabbing a hose or the lace from above slides him down in 1 s.
  - Hoppa jumps off.
- **Godissnöret.**
  - A red ring marks every hook. Within 4 EL the Använd button reads *Kasta snöret*, and the lace flies and hooks
    on by itself: no aiming.
  - **On *Äventyr*, Elof pumps the swing.** Pushing the stick the way he is swinging adds energy, as on a
    playground swing, and full height takes about three swings. Hoppa lets go, and he flies on along the arc.
    - The candy arc shows the flight that lands. Released within about 0.3 s of the right moment at full height,
      he reaches the ledge; the automatic ledge grab (above) forgives a little more.
    - A miss drops him below, where a way back up is always near, or into the glitter bubble.
  - **With *Hjälp med svingen*** (on in *Lugnt*), the swing pumps itself to full height in about 2 s, and Hoppa
    at any moment is held until the next forward apex (at most one full swing), so the release always lands on
    the authored ledge.
  - ↑ ↓ climb the lace.
  - At a pull ring (*Dra*), the lace pulls an object along its rail.
  - At a pair of rings, it ties a bridge, which is also a trampoline (Unravel's trick).
- **Objects move on rails, not as free rigid bodies.**
  - Cones, chips, berries and sticks move along short authored paths with springy, juicy motion. They can never
    end up somewhere unsolvable. This is Sköldhästen's "one notch along a short rail", built in §6.4.
  - Free physics is cosmetic only: wobble, bounce, rope sag.
- **Water and bog.** Tiny Elof doesn't swim, and never walks into water or onto open wet moss. He stops at the
  edge and looks for another way: a stone, a tussock, a leaf, the cap. That is what children should do by real
  water. On a missed jump over either, the glitter bubble catches him in the air, before he touches it.
- **Riding** (the paper plane, the cap, the crane): the stick steers within an authored corridor. Branches and
  stones in the corridor bump the ride and cost the candy arc he was aiming for, but nothing can end it.
- **Exciting sequences** (E1–E4, §4.7) are short, fast stretches with a clear threat to dodge: falling drops,
  rolling cones, sinking tussocks, gusts. Big candies split each one, so a miss replays at most about 15 s.
- **The ghost's distance.**
  - In the prologue and Kapitel 1 it keeps 4–8 EL ahead, and waits, comically, when Elof explores.
  - Once or twice per chapter it comes within 1.5 EL, and the Använd button offers *Ta!*.
  - After the eddy rescue it waits openly.

### 4.3 Candy

- **Trail candy.**
  - On the main path there is a candy every 1.5–3 EL, and each next candy is visible from the one before.
  - A jump is announced by an arc of candy over the gap; a climb, by candy up the wall. A high arc means a held
    jump.
  - About 60–80 per chapter. Touching one collects it, and a magnet radius of 0.6 EL forgives near misses.
  - It is collected into the bag, never eaten.
  - It looks like the candy on Olov's poster: bright karameller in twisted wrappers. The poster's striped
    lollipop and pink heart are the **side candy** (version 6, `docs/level-design.md`): candy off the trail, on
    an upper way or in a pocket, in a shape of its own so that the way and the extra can be told apart.
- **Big candy** is a checkpoint (§3.3, rule 4). There is at least one every 90 seconds of play, and one every
  10–15 s inside exciting sequences.
- **Hidden candy for the album.**
  - Four per chapter, each a new kind, placed off the path: behind leaves, under roots, at the end of an
    optional swing, and one at the end of the chapter's challenge route (§4.7).
  - When one is found, its sticker slaps onto the bag in the corner straight away.
  - Sixteen kinds in Version 1.0 and twenty once Forsen arrives in 1.1, plus the golden geléhallon as the
    final piece (§0 Q11).
- **Magic candy:** three in Version 1.0 (§1). They glitter, and they never lie in nature waiting to be eaten.
- **HUD.** A small paper candy bag, top left, that visibly fills. Chapter cards show the candy in rows of ten,
  with the number beside them.
- **Never lost.** No candy is ever taken away, and the glitter bubble never costs any. The party in the epilogue
  serves a normal Saturday portion; the collection lives on as stickers and rows.
- **Placement rules:**
  - never next to mushrooms or anything poisonous;
  - never in water;
  - never fed to animals.
- **Kinds, with generic names only** (Appendix B lists the brands to avoid; each chapter's read-through checks
  them):

  | Chapter | Kinds |
  | --- | --- |
  | Gården | geléhallon, gummibjörn, skumbanan, skumsvamp |
  | Granskogen | sockerbit, gummiorm, chokladkola, colaflaska |
  | Myren | chokladpeng, stekt ägg, sur napp, lakritskonfekt |
  | Berget | polkagris, gräddkola, salmiakruta, chokladpralin |
  | [1.1] Forsen | lakritsfisk, regnbågsrem, hallonbåt, geléhjärta |

  Every kind is a small 3D model built in code, with one of three sugar materials: glossy jelly, matte foam, or
  sugar-coated with sparkle (§5.6).

### 4.4 Helpers: the family and the animals

Helper moments are always started by the player ("Ropa på …" at a spot marked with that person's portrait). The
help is big and spectacular, but Elof still does the part that matters. How the family appears is set in §2.3.

| Chapter | Family member | Moment | Animal friend: Elof helps → it helps back |
| --- | --- | --- | --- |
| Prolog | Pappa | Sees the shrink, trusts Elof with the trail | — |
| 1 Gården | Moa | The paper plane (S1) | Ladybird: flipped over → shows the hose down |
| 2 Granskogen | Pappa, Bertil | The seesaw (P8); the cap across the pool (S3) | Ants: road cleared → ant lift. Jay: given a lingonberry → companion. |
| 3 Myren | Mamma | The log bridge, the braid, the cocoa (P12) | Crane chick: led home → the cranes fly Elof to the mountain |
| 4 Berget | — | The ghost as partner (P15) | — |
| Final | Everyone | Mamma leads the headlamps; Pappa recognises the trägubbe; Moa's jacket, Bertil's cap | The jay fetches the family, and watches the party from the veranda railing |
| Epilog | Pappa | Teaches Elof to carve (P19) | — |
| [1.1] Forsen | Bertil | The rapids | Beaver: stick fetched → lifts the cap over the dam |

### 4.5 Kindness rules (Sköldhästen §4.3, adapted for a player who wants a challenge)

- There are no lives, damage, game over or lost progress. A miss costs about a second (the glitter bubble,
  §4.2), or at most about 15 s inside an exciting sequence.
- **The chase can't be lost.** The ghost keeps its distance at Elof's pace and waits, comically, when he dawdles
  or explores (§4.2).
- **Exciting sequences restart close by.** Big candies split them, so a miss replays at most about 15 s.
- **Refuse instead of fall, when walking.** Too high to drop, too wet to step on: walking, Elof stops and looks,
  and a pose shows *why*. Only jumps and the exciting sequences can fail, and they fail softly.
- **Fair challenge.** Every timing window and every exciting sequence is tested by the robot at the edges of its
  window (§6.13), and nothing hits Elof from off screen.
- **Every puzzle is a small state machine** with:
  - a commit point, after which it never resets;
  - a local reset, so an unfinished object returns home when Elof leaves or uses "Jag har fastnat";
  - a save rule, so on load uncommitted objects return home;
  - a return route;
  - three hints;
  - framing notes for portrait and landscape.
  Each entry gets these before its build session.
- **"Jag har fastnat"** (pause menu) asks in pictures: a ✓ button with a big candy (back to the last safe spot),
  and a ✕ button with a play arrow (keep playing). Going back never undoes anything learned or found.
- The ending never depends on challenge routes, hidden candy, optional delights or settings.

### 4.6 Hints

- **Level 0: the world itself is readable.**
  - the candy trail and the candy arcs;
  - red rings on hooks;
  - a soft glint on anything the Använd button can act on, with the verb's icon floating over it;
  - helper spots marked with a family portrait.
- **The helper** has no dialogue and no words.
  - In Kapitel 1 the helper is the ghost itself: a clue to its secret. It visits once by itself, at the gully
    (§3.4), as a story beat on every help level: it looks at the hook but doesn't pulse the button. Otherwise it
    comes only when called. From Kapitel 2 it is the jay.
  - Each tap on the helper's portrait, or on the helper, goes one step further:
    1. it flies or hops to the right area and looks at it;
    2. it pecks or double-knocks the object, and the right icon pulses on the Använd button;
    3. a short replay shows a dotted silhouette of Elof doing the action. This is the "super guide" idea.
- **Help levels per player,** as in Sköldhästen:
  - *Bara när jag frågar* (Elof's default, and *Äventyr*'s);
  - *Påminn mig* (*Lugnt*'s default): one quiet visit from the helper after 40 s without progress;
  - *Guida mig*: step 2 comes by itself after 30 s.
- **The goal is always shown as a picture:** in the pause menu, a small drawing of the ghost and the next place
  on Moa's map. It never says how.

### 4.7 Puzzles, exciting sequences and challenge routes

- **Teaching:** every verb is taught on its own before it is combined. Puzzles grow from one or two steps in
  Gården to three or four by Berget, and the exciting sequences grow the same way.
- **The kinds:** **P** is a puzzle; **S** is a set piece, a ride or a show that can't be failed; **E** is an
  exciting sequence, where a miss replays at most about 15 s; **C** is a challenge route, optional and harder,
  ending at a hidden candy.
- **Before its build session,** each puzzle and sequence gets its commit point, local reset, save rule, three
  hints, return route and framing notes for both orientations.
- **The version column:** U1 = Utgåva 1; 1.0 and 1.1 are the versions in §1.

| # | Name | Where | Verbs | The aha | Version |
| --- | --- | --- | --- | --- | --- |
| P0 | Måla ögonen | Prolog | trace | "Jag gav spöket ögon!" | U1 |
| P1 | Trappsteg och glapp | Gården, deck | Hoppa (hop and held jump), ledge climb | Candy arcs show the jumps, and a high arc needs a held jump | U1 |
| P2 | Nyckelpigan | Gården, deck edge | Vänd (a grass-stem lever), slide down the hose | Helping someone shows you the way | U1 |
| P3 | Första svingen | Gården, under the deck | Kasta snöret, pump, let go: first over flat ground, then the gully | The red ring means a hook | U1 |
| C1 | Svingkedjan | Gården, under the deck | three swings in a row | — | U1 |
| E1 | Daggregnet | Gården, under the birch | run, dodge by the drops' shadows | Watch the ground, not the sky | U1 |
| P4 | Spånberget | Gården, outside the workshop | Dra a shaving curl into a ramp, Knuffa a second into a bridge, climb | The world can be moved | U1 |
| S1 | Moas pappersflygplan | Gården to the forest edge | steer | — | U1 |
| P5 | Myrvägen | Granskogen | Dra (lace), then ride the ant lift | Clear the road, and the ants carry you | 1.0 |
| C2 | Myrstacken | Granskogen, the anthill | climb on moving ant columns, jump between them | — | 1.0 |
| P6 | Lavskrikan | Granskogen | Ge (a lingonberry) | Sharing makes a friend | 1.0 |
| E2 | Kottlavinen | Granskogen, the needle slope | run, jump rolling cones and a gap | — | 1.0 |
| P8 | Pappas gungbräda | Granskogen, ravine | Ropa på Pappa, Knuffa the right cone to his hand, stand on the end | The heavier the cone, the higher you fly | 1.0 |
| S3 | Kepsbåten (calm) | Granskogen, the forest pool | Ropa på Bertil, steer | — | 1.0 |
| P10 | Spöket i virveln | Granskogen, below the little fall | Kasta snöret, Dra | You rescue the thief, and it thanks you | 1.0 |
| P11 | Tuvorna | Myren | Hoppa | Tussocks carry you; open wet moss doesn't | 1.0 |
| E3 | Sjunkande tuvor | Myren, further out | keep hopping | Don't stop on a soft one | 1.0 |
| P12 | Mammas fläta | Myren, pool and boardwalk | Ropa på Mamma, climb | — | 1.0 |
| P13 | Lysklubban | Myren, in the mist | walk with the light | The light shows the trail and calms the lyktgubbar | 1.0 |
| C3 | Lyktgubbarnas lek | Myren, in the mist | find and follow the shy lights | — | 1.0 |
| P14 | Tranungen | Myren | lead with the light, follow the rings | Bring the lost one home | 1.0 |
| S4 | Tranornas dans | Myren | — | — | 1.0 |
| S5 | Tranflygningen | Over the forests | steer | — | 1.0 (plates); 1.1 (3D) |
| E4 | Vindbyarna | Berget, the open granite | run between boulders between gusts | Read the lichen | 1.0 |
| P15 | Två är starkare än en | Berget | duo: boost; then hold and push | Together instead of against | 1.0 (one); 1.1 (two more) |
| C4 | Toppröset | Berget, above the pine | a hard climb | — | 1.0 |
| P16 | Den första trägubben | Final, the crack | Kasta snöret, Dra, duo; then Måla with a crowberry | — | 1.0 |
| P17 | Dela godiset | Final | Ge: choose who gets what | Sharing is a choice, not a loss | 1.0 |
| P18 | Godiskalaset | Epilog | Ge (tap each person) | — | 1.0 |
| P19 | Elofs första trägubbe | Epilog | trace three strokes away from the body; Måla | "Jag kan tälja!" | 1.0 |
| P7 | Bubbelgodiset | Granskogen, hollow stump | steer the bubble | Up through the inside of a tree | 1.1 |
| S2 | Barkpulkan | Granskogen, needle slope | steer | — | 1.1 |
| S3b | Forsen | Forsen | steer the cap | — | 1.1 |
| P9 | Bäverdammen | Forsen | Dra (lace) | Help the builder, and it lifts you over | 1.1 |

### 4.8 Optional delights (never required to play)

The tier says what must be *built*; none of these is ever needed to finish.

| # | Name | What it is | Build tier |
| --- | --- | --- | --- |
| O1 | Daggklockspelet | Dew drops on grass blades ring notes when bumped; playing the theme in order makes the lawn sparkle | SHOULD (K1) |
| O2 | Hittegods | Bertil's marble, Moa's hair clip, a toy brick and a coin under the deck. Found things are returned at the party, with a giant's delight. | SHOULD (K1) |
| O3 | Vittrornas dörr | The tiny door under a spruce root. In V1.0 the ghost leaves a candy there (a story beat). Later, Elof can leave a lingonberry, and a sticker appears the next time he passes. | MUST as a beat; SHOULD as a toy |
| O4 | Kottkägla | Roll a cone into a ring of toadstools | STRETCH |
| O5 | Näckens fiol | A hidden fiddle tune by a waterfall. Hop the stones in order to play along. | 1.1 |
| O6 | Skräddarna | Water striders as moving stepping stones | 1.1 |
| O7 | Tranbärsstuds | Cranberries bounce like trampolines | SHOULD (cheap, K3) |
| O8 | Strandstenarna | Beach cobbles on the summit play notes; Pappa explains them in the epilogue | SHOULD (K4) |
| O9 | Fotoläge | Freeze, frame and save a picture to the album | STRETCH |
| O10 | Smaka lingon | A sour face, every time | SHOULD (cheap) |
| O11 | Kurragömma | After the ending, the ghost hides in each chapter | STRETCH |
| O12 | Spökjakt på tid | After the ending, race the ghost through a chapter against its best time, with a ghost trail of his own last run | STRETCH |

### 4.9 Map, chapters and release boundaries

- **Moas karta** (pause menu, and the chapter cards) is a crayon drawing of the route.
  - Places get drawn in as Elof reaches them, with a child's names for them: Hemma, Granskogen, Bäcken, Myren,
    Berget.
  - A little Elof marks "Här är du", the ghost is drawn where it was last seen, and a small star marks each
    challenge route.
- **Releases.** `RELEASED_CHAPTER` in `src/content/world.ts` is the last released chapter. Raising it *is* the
  release (Sköldhästen's rule).
  - Unreleased places are blank paper on the map with Moa's note "Här ritar Moa fortfarande …", and nothing
    leads into them.
  - The last released chapter's end card says: "Fortsättning följer!"
  - `?dev` shows unreleased work.
- **Stable IDs.** Chapters have stable string IDs: `prolog`, `garden`, `granskog`, `forsen`, `myr`, `berg`,
  `final`, `epilog`.
  - "Kapitel N" is computed from the released order, so inserting Forsen in 1.1 renumbers the labels but never
    breaks a save.
- **After the ending,** Moa's map is chapter select, with each chapter's candy rows, stickers and challenge
  route.

| Chapter | Required | Ends on | Estimate for Elof (main path) |
| --- | --- | --- | --- |
| Prolog | P0, the chase, the star | POFF, Pappa's line, the title | 2–3 min |
| Kapitel 1 Gården | P1–P4, E1, S1 (C1 optional) | The ghost vanishing into the spruces | 18–22 min |
| Kapitel 2 Granskogen | P5, P6, E2, P8, S3, P10 (C2 optional) | The ghost hopping off towards the bog, waiting now | 15–20 min |
| Kapitel 3 Myren | P11, E3, P12–P14, S4 (C3 optional) | Climbing onto the crane | 12–15 min |
| Kapitel 4 Berget + Final | S5, E4, P15, P16, P17 (C4 optional) | The walk home under the northern lights | 15–20 min |
| Epilog | P18, P19 | The album, the last card and the blink | 4–5 min |

Each challenge route adds 3–6 minutes. Re-time everything from Olov's own play at H2 and H3, and at H4 with Elof
(§7.3).

---

## 5. Look and sound

### 5.1 What we take from Unravel, and what we leave

Unravel's makers (Coldwood, Umeå) built every location on northern Swedish places, and called the idea
"highlighting the beauty in the ordinary". The chapters of the first game run garden → sea → *Berry Mire* →
*Mountain Trek* → forest and railway → winter, and end back in the garden (Appendix B). This game's route —
gården, granskogen, skogsbäcken, myren, berget, and home — follows the same instinct on purpose.

**We take:**
1. **Ordinary local nature seen from very close.** Moss, lingonberries, spruce cones, bark, granite with lichen,
   sphagnum. Its wonder comes from scale and light, not from fantasy shapes.
2. **The play plane is sharp, the rest is soft.** The foreground and background are out of focus, as in macro
   photography. This is the single biggest part of the look (§5.3).
3. **Low, warm, directional light.** Backlit leaves, haze and light shafts, with restrained saturation and a
   film-like grade per place. Late September helps: the sun never climbs above about 25° (§3.4).
4. **Dark out-of-focus shapes framing the shot,** and a side camera that pulls back for at least one vista per
   chapter.
5. **No HUD to speak of.** Progress shows in the world: Yarny got thinner as he ran out of yarn; Elof's bag
   gets fuller.
6. **A wordless story in glowing memories** placed in the world (§3.3, rule 5).
7. **The core verbs stay the same all game.** Yarny never learned new moves. Elof's three magic candies and the
   rides are one-chapter tools on the same stick and buttons, not new controls.
8. **An acoustic folk score that grows with play,** field-recorded ambience, and a footstep sound for every
   surface (§5.8).

**We leave** what reviewers criticised and what doesn't suit a seven-year-old:
- deaths that replay long stretches (a miss here costs about a second), and hazards that come from off screen;
- physics that can glitch;
- difficulty spikes, and long stretches between checkpoints;
- a resource that runs out (the swing asks for timing, but with a wide window and an assist);
- text hints;
- grief and pollution themes.

Unravel's director, asked what he learned for the sequel, said "Test more". Here that means the robot test and
Olov's own tests at every stage (§6.13, §7.3).

### 5.2 Scale and camera

- **One unit is one Elof length (EL).** In the macro chapters, 1 EL is about 15 cm of the real world; at normal
  size (the prologue until the POFF, the final from the golden candy, and the epilogue), about 1.2 m. Props are
  modelled at real size divided by Elof's real height:
  - a lingonberry is about 0.05 EL and a spruce cone about 0.5 EL;
  - a fly agaric is 1–1.3 EL, and a blade of grass 1.5–2.5 EL;
  - a spruce trunk is about 2.7 EL across, and a deck step 1.2 EL high.

  Keeping real proportions is what makes the macro look believable. Exaggerate only where play needs it, and
  note it in the art bible.
- **Lens.** A perspective camera with a narrow vertical field of view (28–35°) from the side. The long lens
  flattens depth the way a macro lens does and keeps verticals straight. The play plane is z = 0.
- **Framing.**
  - **Landscape on a phone (844×390 on an iPhone, 780×360 on the S23):** Elof is drawn about 75–90 CSS px tall at
    rest and about 65 px at a run,
    when the camera eases out. The view leads 2–3 EL ahead of him. The ground sits about 35% up from the bottom,
    so thumbs never cover Elof.
  - **Portrait:** the view is at least 6 EL wide.
  - **Puzzles:** the camera frames the problem and its solution object together, via authored camera zones.
- **Vistas and rides.** Authored camera zones pull back for vistas, and set pieces run on authored camera rails.
  The focus always stays on the play plane; only cutscenes pull focus.

### 5.3 How a frame is built

| Layer | What is in it | How (cheap on phones) |
| --- | --- | --- |
| L0 Sky | Gradient, sun and clouds; at night stars and the aurora | One sky shader on a dome or background quad; layered cloud cards |
| L1 Far plates | Distant hills, the forest wall, the valley | 2–3 painted or photographic plates per place, **pre-blurred**, with the haze painted in. They parallax slowly. |
| L2 Mid-ground | Trunks, bushes and rocks behind the path | Instanced low-poly meshes and impostor cards with slightly pre-blurred textures, faded by fog |
| L3 Play plane | The ground ribbon, props, characters, candy | Full detail. Baked ambient occlusion and light, plus one sun and a hemisphere light. A blob or contact shadow under each character. Always sharp. |
| L4 Foreground | Huge out-of-focus grass, leaves and moss at the frame edges | Pre-blurred cut-out cards that move faster than the camera |
| Effects | Light shafts, dust and pollen, sparkles, mist sheets, water glints | Additive cards, instanced particles and scrolling noise; few full-screen layers |
| Post | Tone mapping, colour grade (LUT), vignette, grain; half-resolution bloom on sparkles (High) | r186's HDR output with one custom grading pass on Mid and High (§6.5); on Low, the grade is done in the materials |

- **Depth of field comes mostly from the art.** Layer textures are blurred in advance by the asset build, at a
  strength that matches each layer's distance.
- **On High only,** a half-resolution blur by depth softens the mid-ground in motion.
- No full-screen bokeh pass, no ray-marched god rays, no volumetric fog. The research found all three are
  desktop-class (Appendix B).

### 5.4 Colour script: one Saturday, 26 September

Sunrise 06:42, sunset 18:35, and at noon the sun is only 25° high, so shadows are long all day.

| Place | Time | Light and palette |
| --- | --- | --- |
| Prolog: the kitchen | 09:00 | Low morning sun across the oak table. Pale wood shavings glow; cosy and warm. |
| Gården | 10:00 | Dew sparkle; bright greens with the first yellow birch leaves; long shadows. The red house is a huge warm wall, and sun stripes fall under the deck. |
| Granskogen | 11:30 → 14:00 | Deep green and mossy gold, shafts of light, cool blue shade. Red lingonberries and one red fly agaric as accents (never near candy). At the brook's edge: glitter on blue-green water, yellow birch leaves floating, amber stones. |
| [1.1] Forsen | 14:00 | White water and sparkle, wet dark stones, spray in the sun |
| Myren | 16:30 → 18:00 | Low gold sun, with mist rising late. Rust-red sphagnum, orange cloudberry leaves, red dwarf birch, silver mist. Mamma's warm lamp. |
| Berget | 18:00 → 18:35 | Golden hour into sunset: pink-orange sky, grey granite, white reindeer lichen, haze in the valley |
| Final | 18:40 → night | Blue hour into night: stars, green and violet northern lights, warm headlamps |
| Epilog | 21:00 | Candle-lit glazed veranda, candy colours, the aurora in the windows |

Memories use their own look: sepia, film grain and soft vignetting, so they never read as "now".

### 5.5 Beauty budget (where effort shows most)

| Share | Where |
| --- | --- |
| 20% | Elof: likeness, a readable silhouette at 75 px, lively animation and faces |
| 12% | The ghost: a faithful model, the wood material, toy-like motion |
| 15% | Light and atmosphere: sun, haze, pre-blurred layers, a grade per place |
| 15% | The nature kit: moss, grass, lingon, cones, needles, spruce bark, granite and lichen, sphagnum |
| 10% | Water: the brook's sparkle, flow, foam and splashes |
| 10% | The first macro moment: the shrink, and the first look across the deck |
| 13% | Set pieces: the paper plane, the cap boat, the crane flight, the northern lights |
| 5% | Menus and the album |

Do **not** spend on:
- real-time global illumination, screen-space reflections, or many dynamic lights;
- high-resolution shadows, cloth or hair simulation;
- full-screen bokeh;
- facial rigs with many blend shapes. Expression textures do the job (§5.6).

### 5.6 Art pipeline

The project has no 3D artist, animator or composer. What it has is better than version 2 assumed: Olov builds the
game on his own computer, where Claude Code drives **Blender through MCP** (*MCP for Blender*, below). Claude can
create and edit models, materials, rigs and animation, bake and render; Olov watches and corrects in Blender's
viewport. Cloud sessions keep doing code, and can run Blender headless (`bpy`) for automated steps.

The pipeline uses, in order of preference:
1. code, for everything procedural: the terrain ribbons, scatter, candy, water, sky and effects;
2. Blender, driven by Claude and checked by Olov: the characters, the ghost, built things, hero props, rigs,
   animation, bakes and rendered plates;
3. free photo-scanned materials, models and skies (CC0), above all from Poly Haven, which the add-on in Olov's
   Blender fetches directly;
4. no paid AI tool, for now (§0 Q15). If one is ever used, it is on a paid plan only.

Every source and licence goes into `LICENSES.md` (§7.5). Three categories are allowed:
- **Open:** CC0, CC-BY (credited), OFL, MIT, BSD, Apache-2.0.
- **Owned by Olov:** paid-tool output and AI-painted plates, recorded with the tool, plan, date and a link to its
  terms.
- **Made by the family, with consent:** scans and photos.

**Blender, through MCP.**
- **The tool.** *MCP for Blender* (PyPI `mcp-for-blender` 2.1.3, formerly `blender-mcp`; MIT; source
  `ahujasid/blender-mcp`) has two parts: an add-on inside Blender, and an MCP server that Claude Code starts with
  `uvx`. Its tools read the scene and objects, run Python inside Blender, take viewport screenshots, and fetch or
  generate assets.
- **Setup on Olov's computer** (§6.14). The server is declared in the repository's `.mcp.json`, so every session
  starts it the same way:

  ```json
  {
    "mcpServers": {
      "blender": {
        "command": "uvx",
        "args": ["mcp-for-blender"],
        "env": { "DISABLE_TELEMETRY": "true", "BLENDER_MCP_SAFE_MODE": "1" }
      }
    }
  }
  ```

  - **What it needs:** `uv` on the computer, for `uvx`; Blender open with the add-on connected, so that its panel
    says "Running on port 9876"; and Olov's approval of the server the first time Claude Code asks. A cloud
    session has no Blender to talk to, and leaves the server unapproved.
  - **The add-on's panel:** only *Use assets from Poly Haven* is ticked. *Tencent Hunyuan* is never ticked.
    *Hyper3D Rodin* and *Sketchfab* stay unticked until a session needs one and follows the rules below.
  - **Telemetry off, completely.** Content collection is opt-in, but opting in uploads prompts, code, viewport
    screenshots, scene data and step-by-step session records, which "may be used … to train AI models" (its
    README). Our scenes hold the family's models, so never tick the add-on's consent box, and decline the one-time
    opt-in prompt some clients show. `DISABLE_TELEMETRY=true` also stops the minimal anonymous usage record.
  - **Safe mode on.** It checks every script before it runs and blocks direct file, network and process access,
    while modelling, materials, rendering, saving and import and export still work. It guards against prompt
    injection in third-party asset descriptions. A session that truly needs more turns it off for that task only.
  - **Version.** Blender 4.5 LTS (4.5.9 on Olov's computer), so files open in the cloud sessions' headless `bpy`
    4.5.14 too. `bpy` 5.1 and later need Python 3.13, which the cloud containers don't have. Move both together,
    deliberately, if ever.
- **Asset integrations get the same licence check as anything else:**
  - Poly Haven: CC0; use freely.
  - Sketchfab: only models marked CC0 or CC BY (credited in `LICENSES.md`); never NC, ND, or the store's
    standard and editorial licences.
  - Poly Pizza: check each model; CC0 or CC BY only.
  - Hyper3D Rodin and Tripo (generation): not used (§0 Q15). If ever: only on a paid plan whose terms give Olov
    ownership, and never with the family's pictures until its training and privacy terms have been checked.
  - Hunyuan3D (generation): **never**. Its licence excludes the EU.
- **Files.**
  - `.blend` sources for public assets live in `art/blender/`, saved compressed, each under about 10 MB. Larger
    ones are split.
  - The family's `.blend` files and textures live only in the private repository (§2.6).
  - Exports run from one script, `scripts/bake/export.py`, inside Olov's Blender or headless, so the outputs are
    the same wherever they are made.
  - Custom properties on Blender objects export as glTF `extras`, which arrive in three as `userData`.
- **Care.** Blender runs whatever Python it is given. Save before large operations, commit `.blend` files at
  each step that works, and let a session check its own result with a viewport screenshot before Olov looks.

**Where assets are built.**
- **The art bake** (Blender exports, the depth model, scans, plate splitting) runs in sessions, mostly on Olov's
  computer. Its outputs are committed under `art/baked/`, only at checkpoints, to keep the repository far below
  GitHub's 1 GB.
- **The pack step** runs in CI: gltf-transform, KTX2 encoding with the `ktx` tool (installed from its release),
  the manifest and the budget checks.
- **The family's models and textures** come from the private repository (§2.6).
- **Downloads.** Cloud sessions can't reach most asset sites (Poly Haven, ambientCG, Hugging Face), but
  Olov's computer can. So downloads and generations happen there, and CC0 sources are committed under
  `art/vendor/`.

1. **Reference and art bible** (Stage 0b), in `docs/art-bible.md`:
   - the scale chart (§5.2);
   - one palette per place;
   - the layer recipe (§5.3);
   - two **golden frames**: the deck edge and the moss under the spruces. Each holds Elof (greybox until H1b),
     a red hook ring and candy. They are rendered in-engine and are the look every later scene is compared with.
   - **The H1a reference board,** with named criteria:
     1. the macro scale reads;
     2. layered focus: a sharp play plane, soft fore- and background;
     3. warm, low light;
     4. Elof and the candy readable at 75 px in greyscale;
     5. p95 frame time ≤ 18 ms on each device Olov tests on (§6.12, §7.1).
   - **The fallback look, written down now** in case H1a fails twice: more painted 2D plates and fewer 3D
     layers, flatter lighting, and the same characters.
2. **The characters. Every one is designed in Blender** (§0 Q15), by Claude through MCP while Olov watches the
   viewport. No image-to-3D tool is used. They are built in this order, each only as far as its time on screen
   needs:

   | Who | What is built | When |
   | --- | --- | --- |
   | **Elof** | The whole figure, rigged, with a sticker face of ten expressions: the most finished character in the game | Stage 0c |
   | **The ghost** | Five rigid wooden parts, after the photos, the render and the poster (point 4) | Stage 0c |
   | **Pappa and Moa** | Whole figures on Elof's skeleton, mostly in held poses; hands for the close-ups; portrait bubbles rendered from the models | Stage 2, after the slice |
   | **Mamma and Bertil** | The same. Utgåva 1 shows only Mamma passing the door and Bertil's hand. | Those two glimpses in Stage 2; the whole figures in Stages 3 and 4 |
   | **Little Elof** | Elof's own model with a three-year-old's proportions, in two outfits (§2.4) | With memory 1, late in Stage 2 |
   | **The first trägubbe** | One small rigid figure in Pappa's style, in two states: newly carved, and grey and mossy | With memory 1 |
   | **Pappa's shelf of figures** | Six to eight small rigid figures in his style, athletes and tomtar, seen only in the background | Stage 2, with the kitchen |
   | **Animals** | Ladybird, ants, jay and cranes: simple models with procedural motion (point 6) | With their chapters |

   - **One skeleton for every person:** the rig of Quaternius' **Universal Animation Library** (CC0, 43 + 43
     clips; Appendix B.4), shaped to each character's proportions. Its clips then play on every character. Only
     bone lengths differ, which a build-time retarget with per-bone rest-pose offsets handles; without the
     offsets limbs come out 73–180° wrong.
   - **How Elof is built:**
     1. Start from the library's CC0 base mannequin, and reshape it to Elof's proportions with his pictures from §2 as
        viewport references: the player sheet's front, side and back first, then the siblings sheet, the poster and
        the two photos of his real clothes.
     2. Model the hair, shirt, jeans, boots and backpack as simple shells over it.
     3. Give him a sticker face (below), the library's clips and his own clips (point 3).
     4. Optimise: 1024² colour textures, with **no normal maps on characters**, which cost download and are
        invisible at play size; then meshopt and KTX2. The files go to the private repository.
     - The result is a stylised doll in a photoreal world, as Unravel's own hero is. It is consistent, quick to
       change, and fully under control.
     - Mixamo and ActorCore files never go in the public repository: their terms forbid redistributing them.
   - **At play size Elof's face is about 12 px tall.** His silhouette, hair and clothes carry the likeness, so
     H1b judges at 75 px first and in close-up second. The check includes the swing, the climb, the ledge
     clamber and the taste face.
   - **Faces are thin "sticker" meshes for eyes, brows and mouth,** weighted to the head bone and textured from
     an expression atlas (§2.1's expressions, plus blink frames). `DecalGeometry` is not used here, because it
     doesn't follow a skinned mesh.
   - **Family members,** as set in §2.3:
     - each is Elof's base reshaped and dressed after every picture listed for that person in §2, so a new person
       costs far less than Elof did;
     - hands, props, boots and silhouettes in the macro chapters, with 2D portrait bubbles rendered in Blender
       from their models;
     - whole figures in the prologue, the memories, on the summit and in the epilogue: mostly held poses, plus a
       few walks (§2.3).
     - That needs few clips, but each hand and prop moment is a small authored animation, priced in §7.6.
   - **If the likeness falls short** at H1b after one correction: a simpler, more doll-like Elof, or one month
     of a paid image-to-3D tool (Meshy Pro; Appendix B.4), which Olov would have to approve first. Version 3 of
     this plan, in the git history, describes that route step by step.
3. **Animation.**
   - **From the library,** about 12 clips per character: idle, walk, run, the parts of a jump, push, climb,
     interact, pick up, crouch, sit.
   - **Keyed in Blender,** about 15 for Elof (§7.6). Claude keys each one through MCP from a written pose list
     (contact, passing, apex, landing …); Olov reviews it in the viewport and nudges what looks wrong; it exports
     as a glTF animation.
   - **Layered in code:** look-at, the lantern arm, riding crouches, breathing, and the hold-to-jump stretch.
   - The walk and run playback rate follows the measured speed, so feet don't slide (§6.5).
4. **The ghost.**
   - **Modelled in Blender,** with its four references in the viewport (§2):
     - the two photos decide the facts: its proportions, the knife facets, the wood, the eyes, the bag and its
       dots;
     - the render and the poster decide the hands and the sleeve folds they come out of; the render also shows
       the forms between front and side, and the poster the back and a running pose.
   - It is a faceted mesh with flat knife facets (flat-shaded planes, no smoothing) and a lime-wood material
     baked from procedural nodes: about 8k triangles, and a 1024² colour texture.
   - Its eyes are separate meshes, because the prologue needs it eyeless until Elof paints them.
   - It is split into five rigid parts: the body with the bag, the two arms with their fists, and the two feet.
     At rest both fists grip the bag, as in the render.
   - **No scan.** Photogrammetry needs 60–80 photos of the carving, and there are two (§0 Q7). If they are ever
     taken, version 3 of this plan, in the git history, describes how to shoot and clean up a scan.
   - It is animated in code as a rigid wooden toy. There is no skinning, because carved wood doesn't bend.
5. **The memories' cast** (§2.4): little Elof, the smaller Moa and Bertil, and the first trägubbe, modelled in
   Blender. The memories play in-engine with the sepia look; stills rendered in Blender are the acceptable
   simplification (§7.4).
6. **Animals.** Simple stylised-real models, from CC0 sources or modelled in Blender, animated procedurally where
   possible: wing flaps, ant legs, a bobbing dipper.
7. **The nature kit,** in code and Blender:
   - seeded generators for moss mounds, tussocks, cones, needles, berries, grass and fern cards, mushrooms,
     rocks, roots and bark;
   - hero props modelled and baked in Blender: a mossy stump, a fallen log, the old pine, the summit slab with
     its crack;
   - textured with CC0 photo-scanned materials (Poly Haven, ambientCG) converted to KTX2;
   - ambient occlusion baked in Blender.
   - **Scanned real things, from Poly Haven.** Its photo-scanned rocks, stumps, logs and plants are fetched through
     the add-on. At macro scale a small scanned stone *is* a boulder, so this is the closest thing to Unravel's
     photographed nature. Olov can't scan local stones and cones now (§0 Q8). If he does later, they join the
     kit, with their location data stripped first; re-encoding with `sharp` does it.
   - **Never** Megascans/Fab or Textures.com files: their licences forbid a public repository, and on GitHub
     Pages the repository *is* the deployment.
   - **Trees** come from `@dgreenheck/ez-tree` 1.1.0 (MIT; pine presets, generated levels of detail) and are
     baked to GLB, plus impostor cards for the mid-ground.
   - **Moss:** shell texturing only on near-camera patches, scanned clumps elsewhere.
8. **Backdrop plates.**
   - **Rendered in Blender** from 3D landscapes built with the nature kit and lit by a Poly Haven sky: the crane
     flight's layers, the far hills, the valley at sunset. Olov's graphics card renders them in Cycles.
   - **The pictures in `photos/landscape/` are the references** for their shapes: Storklocken's profile, the bell
     tower, the rivers' rapids, the red farms and log barns in the valley. Nothing is copied from them (§2).
   - The asset build then pre-blurs each plate and splits it into 3–5 depth layers, with exact depth and masks
     from Blender.
   - **Not for now:** plates painted with an AI image tool, and plates photographed at the real places (§0 Q8).
     If Olov's own photos are ever used:
     - depth comes from **Depth Anything V2 Small** (Apache-2.0; the larger models are non-commercial), with
       masks feathered, colour bled into transparent pixels, and hidden parts inpainted;
     - far hills can be a panorama, but for mid-ground strips he walks sideways, because rotating in place gives
       the wrong parallax;
     - people and houses are removed with IOPaint (Apache-2.0), GPS data is stripped, and no photo shows people,
       house numbers or vehicles.
   - **Gaussian splats** (Spark 2.3.1 works with `WebGLRenderer`) are a STRETCH for one summit vista at most.
     Layered plates are the default.
9. **Built things,** in Blender: the kitchen with its shelf of figures, the house and deck, Pappa's workshop and
   its shavings, the paper plane, the cap, the boardwalk, the seesaw. Olov's photos are references in the
   viewport; nothing is traced from them.
10. **Candy,** in code: 16–20 kinds from simple shapes, with three sugar materials (§4.3).
11. **The look.** Colour grades are generated in code as 3D LUTs from parameter sets per place, so they can be
    tuned in review.
12. **Headless Blender in cloud sessions.** `bpy` 4.5.14 runs on the container's Python 3.11 (about 1.1 GB
    installed). It is used for:
    - re-running `scripts/bake/export.py`;
    - decimation and LODs;
    - baking ambient occlusion, normal and colour maps;
    - splitting parts;
    - collision proxies.

    Cycles renders on the CPU there; EEVEE needs a GPU, so it runs only on Olov's computer. Blender is GPL, but
    that covers the tool, not the assets it outputs.
13. **Review loop** (Sköldhästen §5.4, step 6):
    - Playwright contact sheets at 390×844, 844×390, 780×360 (the S23 in landscape), 1180×820 (iPad landscape)
      and 1440×900;
    - a greyscale check that Elof and the candy stand out;
    - a 25% thumbnail check that the path reads.
    - Likeness sheets for Olov: front, side and back, at 75 px and 150 px.
    - Iteration renders stay in a gitignored folder; only approved sheets are committed.

### 5.7 Menus and HUD look

- **Panels** are brown kraft paper like a candy bag, with tape. Headings look carved in wood, like the signpost
  on Olov's "Spökets Godisbus" poster ("JAGA · HITTA · SAMLA"). Moa's map is crayon on paper.
- **Buttons** are round and candy-coloured, each with an icon. Every verb has an icon, so nothing depends on
  reading.
- **Font: Andika** (SIL, OFL 1.1), a typeface designed for beginning readers, with clear å, ä and ö.
  - Self-hosted as a latin WOFF2 subset; `@fontsource/andika` 5.3.0 is on npm under OFL-1.1.
  - Body text at least 22 px; *Större text* adds 25%.
- **The first screen** offers the two play styles as two pictures, *Äventyr* and *Lugnt* (§4.1).
- **HUD:** the candy bag (top left), pause (top left), the companion (top right), the stick and two buttons
  (bottom). Nothing else stays on screen during play.

### 5.8 Sound and music

- **The theme, "Spökets polska" (working title).**
  - A polska in 3/4, written for the game: Unravel's score arranged traditional Swedish polskas, and a
    child can dance to a polska.
  - **Instruments:**
    - a fiddle-like lead;
    - a plucked string pre-rendered with Karplus–Strong, as in Sköldhästen;
    - a soft string pad;
    - **wooden percussion made from carving sounds** (knife strokes, wood knocks: the ghost's own rhythm);
    - a jaw harp (*mungiga*) in the bog;
    - a birch-bark horn (*näverlur*) for the cranes and the summit.
- **Arrangements:**
  - Prolog: solo pluck with knife scrapes.
  - Gården: pizzicato and playful.
  - Granskogen: low drones and a hesitant fiddle, turning to glittering plucks at the brook.
  - [1.1] Forsen: a fast polska.
  - Myren: jaw harp, pad and crane calls.
  - Berget: the horn and the full theme.
  - Final: everything.
  - Epilog: a slow waltz version.
- **Adaptive layers:**
  - *explore* is the base layer;
  - *chase* adds percussion and fiddle while the ghost is on screen, switching on bar lines;
  - each family member has a three-note motif that plays at their helper moment;
  - a memory gets a solo fiddle;
  - a reveal gets 1–2 s of silence, then the motif.
- **Effects:**
  - footsteps per surface: plank, moss, needles, stone, sphagnum squelch, gravel;
  - candy pickups that step up a scale when collected in a row;
  - the ghost's knocks and creaks;
  - Elof's gasps, giggles and a tiny two-note call. Characters "speak" in short synthesised babble without
    words. The game has no voices (§0 Q9): no speech, real or synthetic, and words only as captions.
  - UI and pickup sounds are synthesised, so they cost no download.
- **Ambience:** loops per place, from CC0 recordings or synthesised, because Olov can't record at the places now
  (§0 Q8): wind in spruces, the brook, bog birds and cranes, an evening hush. Macro scale is sold by close,
  detailed small sounds: dew drips, grass creaks, a beetle's wings.
- **Music production:**
  - **Route A:** synthesised and sequenced in code, as in Sköldhästen. Its audio module can be ported.
  - **Route B:** a small sampled fiddle and cello from a CC0 sample library (Appendix B.4), played by the same
    sequencer.
  - Either way, there is no licensed music.
- **QA without ears** (as in Sköldhästen):
  - an offline render of every cue, checked for level, clipping, loop seams and pitch;
  - a listening page for Olov, kept off `main`.

---

## 6. Technical design (for agent sessions)

### 6.1 Stack

All versions were checked on npm on 3 October 2026 (Appendix A).

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Rendering | `three`, **`WebGLRenderer`** (WebGL 2) | 0.186.1 | Decided (§6.2) |
| Types | `@types/three` | 0.186.0 | Matches r186 |
| Post-processing | r186's own HDR output: `outputBufferType: HalfFloatType` with `renderer.setEffects([...])` | (in three) | Tone mapping and sRGB are applied automatically. One custom grading pass plus an optional bloom (§6.5). Saves the 81 KB gzipped of pmndrs `postprocessing`, whose 6.39.5 also caps three below 0.187. |
| Physics | `planck` (a Box2D port, MIT) | 1.5.0 | 46 KB gzipped, pure JS, so it runs in Node tests. Joints for rails, seesaws and ropes (§6.4). |
| Build | Vite | 8.3.2 | Rolldown. `base: '/spokets-godisbus/'`, hashed file names, and r186's Basis transcoder emitted with no setup |
| Language | TypeScript | 7.0.2 | `tsc --noEmit` in CI (Vite only strips types). Avoid typescript-eslint, which does not accept TypeScript 7 yet. |
| Unit and simulation tests | Vitest | 5.0.3 | Node ≥ 22.12 |
| Browser tests | `playwright` | **1.56.1**, pinned | Matches the browser preinstalled in cloud sessions (Chromium 141 in `/opt/pw-browsers`), which can't download another. CI uses the same version. |
| Model and texture pipeline | `@gltf-transform/cli` + KTX-Software (`ktx` ≥ 4.4) | 4.5.1 | Meshopt plus KTX2: ETC1S for colour and for the few normal maps; UASTC only for a hero asset that needs it (§6.6) |
| Offline and Home Screen | `vite-plugin-pwa` (Workbox 7.4.1) | 1.3.0 | Supports Vite 8 |
| Font | Andika (`@fontsource/andika`, OFL-1.1) | 5.3.0 | Self-hosted subset |
| Local HTTPS for device tests | `@vitejs/plugin-basic-ssl` (dev only) | 2.3.0 | Supports Vite 8; `npm run dev:lan` (§6.14) |
| Node | 24 in CI and on Olov's computer (26 becomes LTS on 28 Oct 2026) | — | — |
| Art tools (Olov's computer) | Blender 4.5 LTS with *MCP for Blender* | 2.1.3 | §5.6, §6.14 |

**Not used:**
- **Asset files whose licences forbid a public repository:** Mixamo, ActorCore, Megascans/Fab, Textures.com,
  free-tier AI outputs (Appendix B.4).
- **Git LFS,** which GitHub Pages can't serve.
- **`WebGPURenderer` and TSL** (§6.2).
- **pmndrs `postprocessing`:** r186's built-in HDR output does the job for less (above).
- **Rapier.** Its 2D compat build is 1.29 MB gzipped, against planck's 46 KB.
- **Howler,** which has had no release since 2023; plain Web Audio is enough.
- **`DRACOLoader`.** Importing it makes Vite emit about 1.3 MB of decoder files; meshopt is used instead.
- **Any CDN, analytics or third-party request.**

### 6.2 Renderer: `WebGLRenderer` on WebGL 2, decided

The brief names "Three.js r186.1": the npm release is `three@0.186.1`, which is the current latest. r186 has two
renderers, and the choice is made: **`WebGLRenderer`, which in r186 runs on WebGL 2 only** (WebGL 1 support was
removed in r163, and r186 throws if WebGL 2 is missing). Olov chose it on 3 October, and the evidence agrees:

1. **The official manual** (dev branch, 2 October 2026) calls `WebGPURenderer` "still in an experimental state",
   and calls `WebGLRenderer` "the recommended choice for pure WebGL 2 applications".
2. **Open performance issues.**
   - #30560: with 20,000 separate meshes on an M1 Pro, about 60 fps with `WebGLRenderer` against about 15 fps
     with `WebGPURenderer`.
   - #33821: material setup 16–36× slower with `WebGPURenderer`.
3. **Measured in this session.** In headless Chromium 141 with software rendering, `WebGPURenderer`'s WebGL2
   fallback spent 2.6–17× more CPU per frame than `WebGLRenderer` on the same 50–1,200-mesh scenes, and twice
   as long on the first frame. This is indicative only, because it is software rendering.
4. **Size.** In a Vite 8.3.2 production build with the same loaders and a bloom pass, the JS is 191 KB gzipped
   with `WebGLRenderer` and 295 KB with `WebGPURenderer`.
5. **Robustness.** With WebGPU forced on in Chromium 141, r186's WebGPU backend threw a TypeError on a
   texture-view `swizzle` field.
6. **The family's devices.** All three support WebGL 2 well. They also support WebGPU (Safari 26 on iOS and iPadOS
   26, Chrome 121+ on Android; Appendix A), so WebGPU would not have fallen back to WebGL 2 there. That doesn't
   change the decision: points 1, 2 and 4 still hold, and nothing in this game needs compute shaders.

**Consequences:**
- **Shaders.** Custom shaders are GLSL, through `onBeforeCompile` chunks and a few `ShaderMaterial`s, not TSL.
- **Post-processing** uses r186's own HDR output and `setEffects` (§6.5).
- **No renderer bake-off.** Stage 0b measures `WebGLRenderer` on the three devices with the golden frames (§7.3),
  and spends the time saved on the look.
- **Containment.** All rendering still lives behind a small interface in `src/render/`. It costs nothing, and
  keeps a change of renderer a contained project if a measured problem on the devices ever demands one.

**r186 details to respect:**
- `Timer` with `timer.connect(document)` replaces the deprecated `Clock`.
- `PCFSoftShadowMap` is gone; use `PCFShadowMap`, which is soft since r182.
- Never use `renderAsync`.
- **Warm up shaders behind the loading card,** with the same render target bound as in play.
  - A shader program's key includes the output colour space only when no render target is bound. A
    `compileAsync` with nothing bound therefore compiles the wrong variants when post-processing is on. The
    review measured three recompiles on the first real frame; binding the target first brought that to zero.
  - So bind the play target (or render one hidden warm-up frame through `setEffects`), call
    `renderer.compileAsync(scene, camera)` and `renderer.initTexture()`, and repeat after any tier change.
  - A test checks that `renderer.info.programs.length` stays stable after the first visible frame.
- Don't toggle fog, lights or shadow flags during play, because every change compiles a new shader variant.
  Create lights once and animate their intensity instead.

### 6.3 Repository layout

```text
.github/workflows/deploy.yml   push to main: typecheck, tests, build and size gate, privacy check, deploy to Pages
.github/workflows/ci.yml       pull requests: the same checks, plus a Playwright smoke test (contact sheets come
                               from sessions, §7.5)
CLAUDE.md  HANDOVER.md  README.md  LICENSES.md
index.html                     the shell: inline loading card and its CSS, no framework
public/                        icons, the web app manifest's images, fonts (Andika woff2 + OFL.txt)
src/
  main.ts                      boot: feature checks, quality tier, loader, title
  app/                         lifecycle, chapter manager (load, unload, prefetch), service-worker registration
  core/                        loop (fixed step + interpolation), events, seeded RNG, math
  input/                       stick, buttons, keyboard, gamepad, press queue (ported from Sköldhästen)
  sim/                         PURE: no three, no DOM.
                                 world.ts     planck world from chapter data
                                 player.ts    controller, rope, climb, ride, bubble
                                 candy.ts  triggers.ts  puzzles/*.ts  story.ts  camera-intent.ts
  content/                     sv.ts (every Swedish string), world.ts (RELEASED_CHAPTER),
                               chapters/<id>.ts (terrain, props, candy paths, hooks, triggers, camera zones, light)
  render/                      renderer, quality tiers, camera rig, layers, sky and aurora, fog and mist, water,
                               foliage scatter, post, materials/, characters/ (Elof, ghost, family, animals)
  audio/                       context and buses, music sequencer, synth, effects, ambience
  ui/                          DOM: title, pause, settings, Godispåsen, Moas karta, bubbles, HUD, loading card
  save/                        profiles, schema, migration, album photos (IndexedDB)
art/                           sources: generators, prompts, parameter files; blender/ (.blend sources for public
                               assets); baked/ (session-baked outputs, committed at checkpoints); vendor/ (CC0
                               downloads). Raw scans, photos and the family's files stay outside git (§2.6).
photos/                        ignored by git: reference photos and sheets on Olov's computer (§6.14)
.mcp.json                      the Blender MCP server, with telemetry off and safe mode on (§5.6)
site/                          the placeholder page, deployed until Stage 0a replaces it with the build
scripts/                       bake/ (export.py for Blender, depth, scans), build-assets.mjs (packs, manifest,
                               budgets), install-ktx.sh, privacy-check.mjs (gate 8), shots.mjs (contact sheets),
                               audio-check.mjs (offline render QA)
tests/                         unit/ and sim/ (Vitest), robot/ (whole-game playthrough), browser/ (Playwright)
dev/                           menus.html (every menu without WebGL), look.html (golden frames), hero.html (animations);
                               ?debug and ?bench work on the game page itself
docs/                          game-plan.md (this plan), art-bible.md, shots/<chapter>/
```

### 6.4 Loop and simulation

- **One loop:** `requestAnimationFrame` drives everything.
  - A fixed simulation step of 1/120 s, at most 8 steps per frame. The accumulator resets on resume and on
    visibility changes.
  - Elof, the ghost, the camera and moving props are **interpolated** between steps, so motion is smooth on
    60–144 Hz screens.
  - Input goes through Sköldhästen's press queue, so no press is lost when a frame runs zero or several steps.
- **The simulation is pure TypeScript,** with no three and no DOM. Its world is built from chapter data:
  - **Scale:** set `Settings.lengthUnitsPerMeter` to about 0.2. That makes 1 EL the simulation's length unit,
    and scales Box2D's tolerances to suit a 1 EL hero. Tiny things (berries, at 0.05 EL) are below its working
    size, so they are decoration, not bodies.
  - **Ground:** planck `ChainShape` strips, with ghost vertices set where strips meet so nothing snags on seams.
    One-way platforms use the pre-solve hook. A step-up rule lets Elof walk over 0.3 EL steps.
  - **Elof:** a fixed-rotation dynamic body with frictionless sides and a foot sensor. Each step sets its
    velocity from the controller, which handles coyote time, the jump buffer, ledge rays and climb mode.
    - Because he is a real body, his weight tips seesaws and dips floating things with no extra code.
  - **The lace:** a `RopeJoint`/`DistanceJoint` pendulum for play. It is drawn separately as a smooth curve with
    a little verlet sag.
  - **Rails:** puzzle objects slide on `PrismaticJoint`s with limits. That gives a physical feel but never an
    unsolvable state (§4.2).
    - planck's prismatic joint has a motor but no spring, so springiness is a force applied each step
      (−k·x − c·v).
    - The seesaw uses a `RevoluteJoint` with limits.
  - **Bounces are scripted.** Box2D treats contacts slower than its velocity threshold as inelastic, so the
    bubble bouncing off a twig and a cranberry trampoline are authored impulses, not restitution.
  - **Free bodies** are toys only (cones, pebbles). They respawn and never gate progress.
  - **Buoyancy** (the cap, leaves, the ghost in the eddy) is a force from the submerged area, plus drag.
  - **Rides** (plane, cap, crane, bubble) move a kinematic carrier along an authored corridor. The stick only
    offsets it inside the corridor.
  - **Sensors:** candy, hooks, helper spots, memories, checkpoints and camera zones.
- **Puzzles are small pure state machines** (`sim/puzzles/`). Each has a commit point, a local reset, a save
  rule and hint steps (§4.5).
- **Story state** is a set of flags plus the chapter and checkpoint. Story beats are data in
  `content/chapters/*`.
- **Determinism:**
  - a seeded RNG, and no `Math.random` in the simulation;
  - the simulation never reads the clock;
  - tested through the real loop and input queue with a fake clock at several frame rates (§6.13).
  - V8 and JavaScriptCore may differ in the last bits of `Math.sin` and `Math.cos`, so nothing shipped depends on
    replaying inputs across browsers. *Visa mig* (§4.6) replays a recorded *trajectory*, not inputs.
- **Camera intent:** the simulation outputs a desired framing (zones, look-ahead, vista pulls). The renderer only
  smooths it, so camera framing is testable too.

### 6.5 Rendering pipeline and quality tiers

- **Renderer.**
  - `new WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false })`, with sRGB
    output.
  - **Low** renders straight to the canvas, with tone mapping in the materials (no post).
  - **Mid and High** use r186's HDR output: `outputBufferType: HalfFloatType`, and `renderer.setEffects([...])`
    with:
    - **one custom grading pass** that does the 3D LUT, vignette and grain in a single full-screen draw;
    - on High only, a half-resolution bloom.
    - Tone mapping (AgX or Neutral) and sRGB are applied automatically after the effects. HDR buffers matter,
      because threshold bloom and tone mapping clip in 8-bit buffers.
  - If float colour buffers aren't renderable on a device, it gets the Low path.
  - The renderer is wrapped in try/catch. If WebGL2 is missing: "Den här webbläsaren kan tyvärr inte visa
    spelet." with **[Försök igen]** (Sköldhästen's wording).
- **Pixel budget:** `pr = min(devicePixelRatio, 2, sqrt(cap / (cssW × cssH)))`, where the cap depends on the
  tier.
  - **Dynamic resolution** moves `pr` in steps of 0.1, with 3 s of hysteresis before reversing.
    - It is driven by **CPU busy time per frame**, not the frame interval. iOS caps `requestAnimationFrame` at
      30 fps in Low Power Mode and when the device is warm, and at about 60 Hz on ProMotion screens. Phones
      have no GPU timers.
    - A 33.3 ms frame with idle time left is "capped", not "slow".
    - Every step reallocates the render targets (at High the review measured 29 allocations, about 140 MB of
      churn), so steps are rare.
- **Quality tiers.** *Auto* measures the title scene for two seconds at Mid (by CPU busy time, as above) and
  picks a tier. Settings can override it. On the family's iPad, iPhone and S23-class phone it is expected to
  pick High, which is the tier the game is tuned for; Low and Mid keep it playable on other devices.

  | | Low | Mid | High |
  | --- | --- | --- | --- |
  | Pixel cap | 1.0 Mpx | 1.6 Mpx | 2.6 Mpx |
  | Draw calls a picture | 120 | 160 | 200 |
  | Post | none; grading in the materials | HDR output with the one grading pass | the same, plus half-resolution bloom and one half-resolution depth blur on the mid-ground. No SMAA and no full depth-of-field pass on phones. |
  | Foliage density | 40% | 70% | 100% |
  | Shadows | a blob under each character | blob plus contact darkening | plus one 1024² shadow map for characters only |
  | Particles | 30% | 60% | 100% |
  | Water | a flat flowing shader | plus flow, glints and caustics | plus low-resolution refraction |

- **Materials.**
  - `MeshStandardMaterial` for characters and play-plane props, with baked ambient occlusion and light maps.
    `MeshLambertMaterial`/`MeshBasicMaterial` for far layers.
  - Materials are shared, and wind sway is one shared vertex chunk.
  - **Sharp foliage cards** on the play plane are cut tightly, and use alpha test with coverage-preserving alpha
    mipmaps. `alphaToCoverage` is not used: it does nothing without MSAA, and there is none here.
  - **Pre-blurred cards** (the foreground and mid-ground layers, mist, light shafts) are alpha-blended with
    `depthWrite: false` and a fixed `renderOrder`. Alpha test would harden their soft edges. Each place gets an
    overdraw budget for them, checked in the golden frames.
- **Instancing.** One `InstancedMesh` per plant type, **split into screen-width chunks**, because culling works
  on a whole `InstancedMesh`. `BatchedMesh` for varied props that share a material.
- **Special shaders** (GLSL):
  - **water:** flow map, scrolling normals, fresnel, hashed glints, projected caustics;
  - **mist sheets:** layered noise;
  - **sky and aurora:** noise curtains, slow and soft, with no flashing (photosensitivity);
  - **the shrink and grow effect:** a sparkle burst plus a radial blur on the shrinking element only;
  - **the memory look:** sepia, grain and vignette, as a post variant.
- **Characters.** `SkinnedMesh` with an `AnimationMixer` and a small state machine fed by the simulation's
  state. The walk and run playback rate follows the measured speed, so feet don't slide. The ghost's rigid
  parts are animated by code (waddle, hop, tilt).
- **Loading a chapter:** shader warm-up with the play target bound (§6.2) and `initTexture` for everything,
  all behind the loading card.
- **Memory** counts assets *and* render targets.
  - **Budget per tier,** at the largest tablet resolution:
    - Low ≤ 100 MB;
    - Mid ≤ 150 MB;
    - High ≤ 220 MB, of which render targets ≤ 80 MB (its pixel cap was raised for the family's devices; Stage 0b
      re-measures both).
    - For comparison, the review measured 144 MB of render targets for a full pmndrs chain with depth of field and
      SMAA at 1180×820 CSS px, plus a 17 MB canvas. That is why High is trimmed.
  - Textures are 1024² by default, 2048² only for plates and atlases, never larger.
  - **CPU copies of textures** are released after upload (`texture.onUpdate`), because iOS otherwise holds every
    texture twice. The pack is re-fetched from the HTTP cache after a lost context.
  - `?debug` shows GL bytes, tracked at allocation, because `renderer.info.memory` only counts objects.
- **Unloading a chapter.** r186's `Object3D.dispose()` only fires an event; it frees nothing. A `disposeTree()`
  helper frees:
  - every unique geometry, material and texture, including textures in custom uniforms;
  - skeletons (`skeleton.dispose()`), and `InstancedMesh` and `BatchedMesh` (`.dispose()`);
  - animation mixers (`stopAllAction()` and `uncacheRoot()`).

  The lifecycle test checks that the counts return to their baseline (§6.12).
- **Context loss.** Pause on `webglcontextlost`. On restore, rebuild GPU resources from the cached assets.
  Nothing that matters lives only on the GPU: candy taken, puzzle states and drawings are simulation data.

### 6.6 Assets, loading and offline

- **Packs** (named by the stable chapter IDs, §4.9):
  - `boot`: engine, UI, font, the title scene and the table-top opening of the prologue (Elof, the ghost, the
    bag, the table, Pappa's hands). At most **3 MB**.
  - `prolog`: the veranda and the deck chase, prefetched behind the title.
  - `garden`, `granskog`, `myr`, `berg` (with the final and the small epilogue), and in 1.1 `forsen`: at most
    **8 MB** each.
  - Characters carry no normal maps, and real sizes are measured at H1b (§5.6).
- **The asset build** (`scripts/build-assets.mjs`):
  - runs the generators;
  - converts models with gltf-transform: meshopt, and KTX2 with ETC1S for colour.
    - Normal maps are rare: none on characters or small kit props; ETC1S at 512² on the few large surfaces that
      need one.
    - UASTC (8 bits per pixel: about 1.4 MB for a 1024² map with mips, before zstd) only for a hero asset that
      truly needs it.
    - Ambient occlusion is baked into colour or vertex colours, not shipped as its own map;
  - pre-blurs and splits the plates, and bakes the LUTs;
  - writes `manifest.json` (files and bytes per pack, plus estimated GPU MB including render targets per tier);
  - counts bytes **as served**. GitHub Pages gzips `.wasm` and `.glb` in transit as well as text (read from the
    live site's `content-encoding` on 3 October 2026: the transcoder comes as 245 KB of its 527 KB), so the gate
    counts them gzipped. A `.ktx2` on its own has not been measured and is counted at full size;
  - **fails** when a budget in §6.12 is broken.
- **Loading:**
  - Show the title as soon as `boot` is in.
  - Prefetch the next pack in the background: `prolog` behind the title, `garden` from the start of the
    prologue, and each later pack halfway through the chapter before.
  - If Elof outruns the prefetch, a loading card shows Moa drawing the next part of the map, with progress by
    bytes.
  - Failed fetches retry three times per file. After that: "Något gick fel när spelet laddades." with
    **[Försök igen]**.
- **Offline (SHOULD).** `vite-plugin-pwa` precaches the app shell and `boot`, and caches each chapter pack the
  first time it is loaded.
  - Workbox's defaults precache only `js, wasm, css, html` up to 2 MiB per file. Add `glb, ktx2, m4a, webp,
    woff2` and raise `maximumFileSizeToCacheInBytes`.
  - **Updates.** vite-plugin-pwa's default waits until every tab has closed, and iOS Home Screen apps resume
    rather than relaunch. So on the title screen, and whenever the game becomes visible again, it calls
    `registration.update()`. If a new worker is waiting, it activates it and reloads, but only on the title
    screen, never in the middle of a chapter.
  - Runtime-cached packs expire with Workbox's `ExpirationPlugin`. `RangeRequestsPlugin` is added if any audio
    streams through `<audio>` (§6.8).
  - **The release rule:** after a merge, open the game once on each device Elof plays on, so the update is in
    place before he plays.
- **Web app manifest:**
  - name *Elof och det stora godisäventyret*, short name *Elofs äventyr*;
  - `display: standalone` (Android also gets `fullscreen` through `display_override`), landscape on Android;
  - icons and an `apple-touch-icon` showing the ghost.
  - Settings explain *Lägg till på hemskärmen*. On iPhone that is the only way to a full-screen game, and on iOS
    it also protects saves from Safari's seven-day storage eviction (Sköldhästen §0 Q2).

### 6.7 Input and platform

- **Input:** port `skoldhast/src/input.mjs` and its tests to TypeScript (§4.1, Appendix C), including the
  device-in-use switching and gamepad menu focus.
- **CSS:**
  - `html, body { position: fixed; inset: 0; overflow: hidden }` and `overscroll-behavior: none`;
  - `touch-action: none` on the game;
  - `-webkit-user-select: none`, `-webkit-touch-callout: none`, and a transparent tap highlight;
  - `preventDefault` on `gesturestart`, `dblclick` and `contextmenu`;
  - text fields (a player's name) get `user-select: text` back.
- **Layout:** `viewport-fit=cover`, safe-area insets, `dvh` units.
- **Rotation and resizing** pause safely and relayout, without rebuilding the world.
- **Fullscreen:**
  - a button on Android, through the Fullscreen API;
  - hidden on iPhone, which can't do element fullscreen;
  - hidden on iPad too, where it shows an overlay control that the browser compat data calls unsuitable for
    games.
- **Wake Lock** while playing: Android, iOS Safari 16.4+, and iOS Home Screen apps only from 18.4. It is
  requested again on every `visibilitychange` back to visible.
- **Page Visibility:** pause the loop, suspend audio, save.
- **Vibration:** Android only, a tiny bump on landing from height. It is a setting, and iOS doesn't support it.

### 6.8 Audio

- **Unlocking.** One `AudioContext`, resumed on the **pointerup, touchend or click** of *Börja*/*Fortsätt*.
  Browsers do not allow audio to start from a touch's pointerdown. It is resumed again on any later tap while
  its state isn't `running`; iOS leaves it `interrupted` after a call or Siri.
- **Buses:** music, effects and ambience, then master, then a compressor. Each has a volume setting.
- **Music:**
  - short stems started together at `currentTime + 0.1`, with layers faded on bar lines;
  - decoded audio is uncompressed (about 23 MB per stereo minute at 48 kHz), so stems are mono where possible
    and short;
  - long beds are avoided. If one must stream through `<audio>`, note that an audible media element switches iOS
    to media playback, which ignores the silent switch, and that the service worker then needs
    `RangeRequestsPlugin`. Decoded `AudioBuffer`s are preferred.
- **Format:** AAC in `.m4a` only: music at 96–128 kbps, ambience and effects at 48–64 kbps mono. Loops use
  `loopStart` and `loopEnd` to skip the encoder's lead-in.
- **The iOS silent switch.** At boot the game sets `navigator.audioSession.type = 'ambient'` (Safari 16.4+), so
  the switch silences it, as in Sköldhästen.
  - The setting *Ljud även i tyst läge* sets `'playback'` instead.
  - *Lugnt* (§4.1) starts with it on, because the sounds carry information a younger player can't get from
    captions. Elof's *Äventyr* profile respects the switch.
- **No voices** (§0 Q9). There is no read-aloud and no recording: no Web Speech, no `MediaRecorder`, and no
  microphone permission.
- **Characters make short synthesised sounds,** timed to the caption. They are never words.

### 6.9 Save

- **Storage:** `localStorage`, with an index key plus one key per player: `godisbus.v1.index` and
  `godisbus.v1.player.<id>`.
  - With no save on the device, **Börja** creates the "Elof" player and goes straight to the prologue.
  - *Byt spelare* and *Ny spelare* appear on the title once a save exists.
- **Contents:** `{ v, contentVersion, name, updated, settings, chapter, checkpoint, flags[], candy{},
  album[], memories[], found[], puzzles{}, helpLevel, playMs, ended }`. Stable authored IDs only. The play
  style (*Äventyr* or *Lugnt*) is part of `settings`.
- **When to write:** at every big candy (checkpoint), at chapter ends, on pause, on `visibilitychange` → hidden,
  and on `pagehide`.
- **Tolerant loading:**
  - unknown IDs are dropped;
  - an unknown checkpoint maps to its chapter start;
  - a newer or corrupt format is never silently overwritten.
- **IndexedDB, per player:** the album photos, about 10 small WebP game renders per playthrough. They are cleared
  together with the player profile. If IndexedDB fails, the album simply has no photos.
- **Backups.** `navigator.storage.persist()` is a bonus, not a safeguard. On iOS the real protection is the
  Home Screen install. (SHOULD) Each chapter card also shows a three-word code, e.g. "GRAN KOTTE MOSSA", that
  restores that chapter's start on any device, as Sköldhästen's word codes do.
- **Messages** (reused): "Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå." and
  "Det sparade spelet gick inte att läsa." with **[Börja om från början]**.

### 6.10 Menus and screens (DOM over the canvas)

- **Screens:**
  - the loading card;
  - the first start: the two play-style pictures, *Äventyr* and *Lugnt* (§4.1);
  - the title: **Börja**/**Fortsätt**, *Byt spelare*, *Inställningar*, and the rotate picture in portrait;
  - pause: **Spela vidare**, *Godispåsen*, *Moas karta*, *Jag har fastnat*, *Inställningar*, *Till startsidan*;
  - settings (§4.1);
  - Godispåsen: candy stickers by chapter, *Pappas minnen*, *Hittegods* and *Foton*;
  - Moas karta and the chapter cards;
  - picture and speech bubbles, the helper prompt, and the HUD.
- **Panels:**
  - every panel has a ✕;
  - tapping the backdrop closes it;
  - Esc closes it, and gamepad B goes back.
  - Settings opened from pause keep the game paused.
- **Every menu works for a child who can't read:**
  - each button has an icon as well as its word;
  - yes and no are ✓ and ✕ with pictures (§4.5).
- **`dev/menus.html`** shows every menu without WebGL, with query options, as in Sköldhästen. It is the base of
  the menu screenshot tests.
- **`?bench`** renders the golden frames for 30 s and prints the result as plain text Olov can copy into a
  message:
  - the device and browser;
  - Low Power Mode, when it can be detected;
  - the p50 and p95 frame time;
  - CPU busy time;
  - draw calls, triangles and GL bytes.
- **Album photos** are captured at authored moments (shrinking, the first swing, the plane, the cap, the crane,
  the aurora, the carving lesson). The renderer saves a small frame to IndexedDB, and the credits show them.
  Elof can tap through the credits.
- **Accessibility:**
  - all text is DOM text and can be resized;
  - every button has an accessible label;
  - focus order works for keyboard and gamepad;
  - *Mindre rörelse* turns camera shake, fast pans and big particle bursts into fades.

### 6.11 Build and deploy (GitHub Actions → GitHub Pages)

- **Vite:** `base: '/spokets-godisbus/'`. Runtime URLs use `import.meta.env.BASE_URL`.
- **The deploy workflow.** Action versions were checked by the research session against the actions'
  repositories; these are the versions Vite's own docs pin.

  ```yaml
  name: Deploy to GitHub Pages
  on: { push: { branches: [main] }, workflow_dispatch: {} }
  permissions: { contents: read, pages: write, id-token: write }
  concurrency: { group: pages, cancel-in-progress: false }
  jobs:
    build:
      runs-on: ubuntu-latest
      env:
        FAMILY_TOKEN: ${{ secrets.FAMILY_ASSETS_TOKEN }}       # secrets can't be read in `if:`, env can
        PRIVACY_DENYLIST: ${{ secrets.PRIVACY_DENYLIST }}
      steps:
        - uses: actions/checkout@v7
        - uses: actions/checkout@v7                             # the family's private packs (§2.6)
          if: env.FAMILY_TOKEN != ''
          with: { repository: olovmelander/spokets-godisbus-familj, token: '${{ env.FAMILY_TOKEN }}', path: family }
        - uses: actions/setup-node@v7
          with: { node-version: 24, cache: npm }
        - run: ./scripts/install-ktx.sh                         # a pinned KTX-Software release, written in Stage 0a
        - run: npm ci && npm run typecheck && npm test && npm run build && npm run privacy-check
        - uses: actions/configure-pages@v6
        - uses: actions/upload-pages-artifact@v5
          with: { path: ./dist }
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
      steps:
        - id: deployment
          uses: actions/deploy-pages@v5
  ```

- **Where it stands (3 October 2026).** The repository was empty when planning began, so the first pushed
  branch, the planning branch, became the default. `main` has now been created from it, with a placeholder page
  in `site/` and a minimal workflow (`deploy.yml`) that publishes that folder. Stage 0a replaces the workflow
  with the one above. From now on, work goes through pull requests into `main`.
- **Olov's one-time steps** (a session can't change repository settings). Steps 1–3 were done on 3 October:
  1. *Settings → General → Default branch*: switch to `main`.
  2. *Settings → Pages → Build and deployment → Source: GitHub Actions*. `configure-pages` can't switch this
     with the default token.
  3. Run the workflow again: *Actions → Deploy to GitHub Pages → Run workflow*. If it says `main` is not allowed
     to deploy to `github-pages`, add `main` under *Settings → Environments → github-pages → Deployment
     branches*, and run it once more.
  - Before step 2, every push to `main` also started GitHub's own branch build, which published the repository
    root through Jekyll (the README as the front page, without `noindex`), racing the workflow.
  4. Before the family's models exist (Stage 0c): create the private repository `spokets-godisbus-familj`, and a
     fine-grained token that can only read it.
  5. Add two Actions secrets: `FAMILY_ASSETS_TOKEN` (that token) and `PRIVACY_DENYLIST` (the words in gate 8).
  - Without them the site builds with stand-in figures, and the privacy check uses its built-in rules only.
- **Caching.** GitHub Pages serves files with a 10-minute cache (`max-age=600`; widely reported, not
  re-measured here).
  - Vite's hashed file names make code and assets safe.
  - `index.html`, the service worker and the manifest can be up to 10 minutes stale, so Sköldhästen's rule
    stays: merge at least 15 minutes before Elof plays.
- **Pull requests** run the same checks without deploying, plus the Playwright smoke test. Contact sheets come
  from sessions, on checkpoint PRs only (§7.5), and show a stand-in figure for the family.
- **The family's private assets** (§2.6) live in a private repository, for example `spokets-godisbus-familj`.
  - The deploy job checks it out with a fine-grained, read-only token stored as an Actions secret, and copies the
    packs into `dist/` before upload.
  - Pull requests from forks never get the secret, and the public repository's history never contains the files.
  - Without the secret (a fork, or a local build), stand-in figures are used.
- **Tools in CI:** the pack step needs the `ktx` tool from KTX-Software's GitHub release. The heavier art bake
  (Blender, the depth model) runs only in sessions (§5.6).
- **No indexing:** `index.html` carries `<meta name="robots" content="noindex, nofollow, noimageindex">` and no
  social-preview tags (§2.6).

### 6.12 Gates

1. **No third-party requests,** ever, and no analytics. A browser test checks this, and every page carries
   `noindex`.
2. **First playable:** the `boot` pack (the title and the table-top opening) in at most 3 MB *as served*, with at
   most 450 KB of gzipped JS.
   - The libraries alone are about 240 KB gzipped (three about 192 KB, planck about 45 KB), so game code gets about
     200 KB. Chapter code loads with its pack.
   - CI gates the bytes. The 5-second time on a throttled 10 Mbps / 100 ms profile is measured on the family's
     devices, because software rendering in CI can't time it meaningfully.
3. **Chapters:** each pack at most 8 MB as served; the whole of Version 1.0 at most 45 MB.
4. **Memory:** GPU memory per tier, counting assets *and* render targets (§6.5): Low ≤ 100 MB, Mid ≤ 150 MB,
   High ≤ 220 MB. No texture larger than 2048². Checked by the build's estimate and by `?bench` on the family's
   devices.
5. **Frame rate,** read from `?bench` and `?debug`:
   - on a device of each of the three classes at *Auto* (expected High; §7.1 says which devices Olov tests on): p95 CPU busy time ≤ 10 ms and p95 frame time
     ≤ 18 ms, a steady 60 fps, over a 10-minute route that includes an exciting sequence;
   - on an older device (iOS 16.4 / Android 10) at *Low*, p95 frame time ≤ 33 ms, as a best effort;
   - Low Power Mode is logged with every measurement, because it caps iOS at 30 fps.
6. **Lifecycle:** five chapter switches and ten pause/resume cycles with:
   - no growth in geometries, textures or GL bytes;
   - `renderer.info.programs.length` stable after the first frame of each chapter;
   - no sound after pause;
   - recovery from a lost WebGL context.
7. **Determinism:** driving the real loop and input queue with a fake clock at 30, 60, 120 and 144 Hz, the robot
   reaches identical end states in every released chapter.
8. **Privacy:** before every merge and deploy, CI fails on either of two checks:
   - location, GPS or owner fields in any committed or built image, model or audio file (`exiftool`);
   - any word from the denylist (surnames, house number, street address, school, account names) in the diff, in
     `dist/`, or in glTF `extras`. The list is stored as an Actions secret, so it never enters the repository.
9. **Draw-call budgets:** in CI, each golden frame and chapter tour view stays within its budget of draw calls
   and triangles from `renderer.info`. The draw calls are by tier (§6.5; `tests/browser/budget.mjs`): 120 on
   Low, 160 on Mid, 200 on High. They were 120 on every tier until Olov raised them on 5 October 2026 to make
   room for better graphics; Low keeps the old number, and what is added for High stays out of Low's picture
   where it would not fit. Gate 5, measured on the devices, says whether the numbers are right. The counts don't depend on GPU speed, so software rendering measures them
   exactly.

### 6.13 Tests

- **Vitest (Node):**
  - the controller: hop and held-jump arcs, coyote time, ledges, slopes, climbing, the lace in both modes, and
    the glitter bubble's return points;
  - **fair timing:** for every swing release and exciting sequence, the robot succeeds at both edges of its
    window on *Äventyr* and fails just outside it, and succeeds with no timing at all on *Lugnt*;
  - rails and seesaws;
  - every puzzle state machine under repeated actions, reloads and every help level: no softlock, no duplicate
    reward;
  - **the candy rule:** for every chapter, each trail candy can be seen from the previous one, and every jump
    arc can be reached by a jump. This is a geometric test over the chapter data.
  - checkpoint spacing: at most 90 s of route between big candies, and at most 15 s inside exciting sequences;
  - save validation and migration;
  - the input adapter's press queue;
  - story flags.
- **The robot playthrough.** Scripted inputs drive the real loop and input queue under a fake clock, from a
  fresh save through every released chapter, at several frame rates (gate 7) and in both play styles. It asserts
  that:
  - every required puzzle is solved;
  - every checkpoint is reached;
  - the trail candy is collectable;
  - the chapter's end flag is set.
- **Playwright (browser):**
  - boot, then title → prologue → Kapitel 1, with touch and with keyboard;
  - save and continue;
  - a chapter tour with contact sheets at five viewports (§5.6);
  - context loss and restore;
  - lifecycle;
  - no third-party requests;
  - the byte gates, as served by a local server that compresses as GitHub Pages does;
  - draw-call budgets (gate 9);
  - the privacy gate (gate 8);
  - menu snapshots from `dev/menus.html`.
  - Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`, as `skoldhast-shot.mjs` does.
- **By hand**, from a written checklist, on the devices Olov tests on (§7.1):
  - audio unlock and the silent switch;
  - the Home Screen install, and an update arriving at the title;
  - rotation;
  - resuming after a call;
  - a long play session for heat, and Low Power Mode;
  - the first-playable time;
  - the swing's timing and the exciting sequences on touch.
- **With Elof** (§7.2): H4, his first play of each release. No other child plays before him (§0 Q10).
- **Housekeeping:** commit `package-lock.json` from Stage 0a, so CI's `npm ci` and its npm cache work.

### 6.14 Working on Olov's computer

From Stage 0b, most sessions run in Claude Code on Olov's computer: Windows 11, with an RTX 3070 (§0 Q16).
Cloud sessions stay useful for code-only work and reviews, and both follow the same `CLAUDE.md`.

- **Already there** (checked on 3 October, Appendix A):
  - Node 24 and git;
  - Claude Code, in VS Code;
  - Blender 4.5.9 LTS with the *MCP for Blender* add-on running, and Poly Haven ticked in its panel;
  - the reference pictures, in `photos/`.
- **Still to install:**
  - `uv`, for `uvx`, which starts the MCP server declared in `.mcp.json` (§5.6). Until then a session has no
    Blender tools, even while the add-on is running.
  - Playwright 1.56.1's Chromium, with `npx playwright install chromium` (Stage 0a);
  - the KTX-Software `ktx` tool. `scripts/install-ktx.sh` is written for CI's Linux, so Stage 0a also notes how
    to install it on Windows;
  - `exiftool`, when the privacy check (gate 8) is run locally.
- **The graphics card.** Cycles renders and bakes on it, and EEVEE runs. It has 8 GB of memory, so bakes stay at
  4k or less, and big landscapes are rendered in layers.
- **Reference pictures** live in `photos/` inside the working copy, which `.gitignore` excludes. The family's
  private repository is cloned next to the working copy, never inside it.
- **Testing on the devices during development.** `npm run dev:lan` starts Vite with `--host` and
  `@vitejs/plugin-basic-ssl` 2.3.0 (it supports Vite 8), so a phone or tablet opens
  `https://<the computer's address>:5173/spokets-godisbus/` on the same Wi-Fi.
  - HTTPS matters: Wake Lock, the service worker and persistent storage need a secure context, and a plain LAN
    address isn't one.
  - The certificate is self-signed, so each device shows a warning once. Service workers refuse self-signed
    certificates, so offline play is tested on the deployed site, or with `mkcert` and its root certificate
    installed on the device.
- **Debugging on the devices.**
  - iPad and iPhone: Safari's Web Inspector needs a Mac, and Olov's computer isn't one. `?debug` shows the
    numbers on screen, and `?bench` prints text to paste into the session.
  - Android: Chrome's remote debugging (`chrome://inspect`) works from Windows.
- **What stays in the cloud:** pull-request checks and deploys (GitHub Actions), and any session Olov starts
  from his phone. Those sessions can't reach Blender or the asset sites, so a session's handover note says which
  kind of session the next step needs.

---

## 7. Delivery plan

### 7.1 Roles and realistic time

- **Olov:**
  - has answered §0;
  - runs most sessions on his own computer, with Blender (§6.14), and reviews models and animation in its
    viewport;
  - approves the likeness (H1b);
  - **is the only tester before Elof plays** (§0 Q10): H2 and H3 are his own tests, on touch;
  - tests on the devices he has (§0 asks which). Elof plays on an iPad, an iPhone and an Android phone with no
    favourite (§0 Q17), so a class Olov can't test is first measured at the reveal, from its `?bench` text;
  - reads the Swedish aloud;
  - merges and releases.
- **Realistic time for Olov: 60–90 hours.** There are no dates (§0 Q5), so this is effort, not a calendar.
  - Sköldhästen took about twice its plan: around 40 rounds of work by 1 October, about 25 of them started by
    Pappa's feedback.
  - This game is 3D and has more puzzles, so expect 80–110 rounds in all.
  - Running sessions on his own computer adds his time at the keyboard, above all in Blender, where he is the
    eyes on every model and animation. It also removes waiting for downloads and attachments.
  - Feedback is gathered and given once a week, so sessions can work through it in batches.
- **Elof's parents** (👪):
  - consent: given on 3 October (§2.6);
  - nothing else is asked of them. §0 asks Olov whether Pappa reads the storyboard of the memories and the
    reveal before they are built.
- **Claude Code sessions:**
  - all code, the models, rigs and animation in Blender, the art bake, synthesised audio and tests;
  - `HANDOVER.md` with a planned-against-actual table and the "Frågor till Olov" list, and a note on whether the
    next step needs Olov's computer.
  - Each session ends with `main` still playable.
- **Elof** plays each release. His first play of each one is the real test (H4), and the first time any child
  plays it.
- **Nobody else tests** before a release: no borrowed child, and not Moa or Bertil.

### 7.2 Surprise, privacy and release

- **The site is public from the first deploy.** Every page carries `noindex`, and the README doesn't link to it
  (§2.6).
  - `RELEASED_CHAPTER` decides what can be played.
  - `?dev` shows unfinished work.
  - Unreleased places are blank paper on Moa's map (§4.9).
  - Until Stage 0a, the site is a one-page placeholder with the title and a ghost.
- **H4, the reveal,** is Elof's first play of a release:
  - nobody helps for the first 10 minutes;
  - note every pause longer than 10 s, every laugh, every question, and every miss that annoyed him.
  - If the surprise allows, he can play the vertical slice early as "Kapitel 1, del 1", so his play shapes the rest
    of the chapter.
- **After Utgåva 1, ask him four things:**
  1. Vad var roligast?
  2. Vilket godis är bäst?
  3. Var det för lätt, lagom eller för svårt?
  4. Varför tror du att spöket tog påsen?

  The first two shape what the later chapters get more of. The third tunes *Äventyr* for the rest of the game:
  with no child testing before him (§0 Q10), it is the first real measure of the difficulty. The fourth is the
  retelling check (§3.5): the story is designed, and nothing is promised.

### 7.3 Stages and checkpoints

| Stage | Sessions | Olov (rounds / hours) | Deliverable | Checkpoint |
| --- | --- | --- | --- | --- |
| 0a Foundation | 1–2 | 1 / 1–2 h | `main` with a placeholder page on Pages (done 3 October). The Vite + TS + three scaffold; both workflows; the privacy gate; the input port with a greybox Elof; `?debug`, `?bench` and `dev/menus.html`; `npm run dev:lan`. The asset chain proven end to end: Blender → glTF → KTX2 → Pages. | Opens the address on the devices he tests on and pastes back the `?bench` text |
| 0b Look-dev | 2–3 | 2 / 3–4 h | On Olov's computer: Blender and MCP set up (§6.14); the two golden frames with a greybox Elof, a hook and candy; quality tiers; `WebGLRenderer` measured on the three devices | **H1a**: the five criteria in §5.6 |
| 0c Characters | 2–4 | 3 / 5–8 h of reviews in Blender | Elof built in Blender on the library's skeleton, with his sticker face; the ghost modelled in Blender after the photos, the render and the poster; likeness sheets shown to Olov through the session, never through git | **H1b**: likeness yes or no, with at most three corrections. Olov judges; the parents see it if he wants (§0). |
| 1 Feel | 2–3 | 2 / 2 h | Controller (run, variable jump, ledge, climb), the glitter bubble, the swing in both modes, candy trail and pickup, the camera, one greybox puzzle and one greybox exciting sequence, both play styles, the robot | **H2** (Olov's own 20-minute test on touch, greybox): is moving, jumping and swinging fun for two minutes with no goal? Is *Äventyr*'s swing timing right, and is *Lugnt* gentle enough? |
| 1b Vertical slice | 2–3 | 2 / 2 h | From the deck edge to the first swing (P1–P3, about 3 min) at **final quality** on the three devices: Elof, the ghost, light, candy, audio | **H2b**: cost logged and extrapolated to the whole of Version 1.0. If it's over budget, cut the scope (§7.4) before Stage 2. |
| 2 Utgåva 1 | 7–10, plus 1 buffer | 4–6 / 7–11 h | The prologue and Kapitel 1, with E1 and C1; menus, save, audio, hints, stickers; Pappa and Moa; memory 1 with little Elof | **H3** (Olov plays the whole chapter on the devices), then **H4** (the reveal: the first time a child plays) |
| 3 Granskogen | 7–9, plus 1 | 3–4 / 5–7 h | The forest kit, the jay, the ants, the cone avalanche, the seesaw, the brook's edge, the cap, the eddy rescue, C2 | Olov's test, then release |
| 4 Myren | 6–8, plus 1 | 3 / 5 h | The bog kit, sinking tussocks, the mist, the lollipop light, the crane chick, Mamma, C3 | Olov's test, then release |
| 5 Berget, final, epilogue | 8–10, plus 1 | 4 / 7 h | The plate flight, the gusts, the summit, the duo puzzle, C4, the crowberry eyes, the aurora, the family in held poses, the party, the carving lesson, the album | A fresh-save playthrough, then release **Version 1.0** |
| 6 Polish | 2–3 | 2 / 3 h | A Swedish copy-edit, performance on every device, the audio mix, an accessibility pass, *Äventyr* tuned from Elof's answers | — |
| Between checkpoints, all stages | — | about 55–80 / 20–35 h | Weekly feedback in batches; Olov's reviews of models and animation in Blender | — |
| Version 1.1 | later | — | Forsen, the bubble candy, the bark sled, the 3D flight, two more duo puzzles | — |

- **Total for Version 1.0:** about 40–55 sessions, plus four buffer sessions; about 80–110 rounds counting
  feedback; Olov 60–90 hours.
  - `HANDOVER.md` keeps a planned-against-actual row per stage, and every checkpoint re-forecasts the rest.
- **The playtest checklist.** At H2 and H3 Olov is the player, so he plays once as himself and once badly on
  purpose: one thumb, late jumps, everything in the wrong order. At H4 someone watches Elof, and stays quiet.
  - log every pause longer than 10 s, and every miss that was repeated more than three times;
  - at H4, anything an adult had to say is a bug, and Elof retells the story from what he saw;
  - every required puzzle is solved without the third hint;
  - every chapter is timed, and the challenge routes separately.
- **Pivot rules.** A "no" at any checkpoint gets one correction session. A second "no" means:
  - at H1a: the fallback look (§5.6);
  - at H1b: a simpler, more doll-like Elof, or one month of a paid image-to-3D tool if Olov agrees (§5.6);
  - at H2: simpler controls: *Hjälp med svingen* on in *Äventyr* too, or *Följ fingret* as the default.
  - If H2b's forecast is over budget, cut the scope (§7.4) before Stage 2, not after.
- **Dates** (§0 Q5): none. The stages run in this order, and each release goes out when its checkpoint has
  passed. H2b's forecast is in sessions and hours, not in weeks.

### 7.4 Releases, tiers and cut order

- **Releases:** Utgåva 1 → Version 1.0 → Version 1.1, as in §1. Each is complete and lovable on its own.
- **MUST for Version 1.0.** A MUST may be *simplified* when the forecast outgrows the budget (H2b); it is never
  dropped.
  - the likeness of Elof and the ghost;
  - the prologue: painting the eyes, the blink, the star, Pappa;
  - the candy trail and the bag; the lace in both modes;
  - the glitter bubble, and the two play styles;
  - one family helper moment in each of Kapitel 1–3, and the family on the summit;
  - one exciting sequence per chapter (E1–E4), which may be simplified;
  - every required puzzle in §4.7;
  - four memories (still pictures are an acceptable simplification);
  - the summit: the reveal, the crowberry eyes, the sharing choice, the golden candy, the walk home;
  - the carving lesson in the epilogue;
  - Swedish text, saving, chapter codes (progress moves between devices with them), touch controls and the
    kindness rules;
  - performance at *Hög* on the three devices;
  - the privacy rules.
- **SHOULD:**
  - the four challenge routes (C1–C4);
  - the sticker album, with 16–20 candy kinds;
  - the lost things, the vittra door as a toy, the beach cobbles;
  - album photos as credits;
  - gamepad support, offline play.
- **STRETCH:**
  - photo mode, hide-and-seek, the ghost race (O12);
  - a winter epilogue: the giant snowball from the family's photo;
  - playing as Moa or Bertil;
  - a splat vista.
- **Version 1.1:** Forsen with the rapids and the beaver, the bubble candy, the bark sled, the full 3D crane
  flight, two more duo puzzles, Näckens fiol, the water striders.
- **Cut order, the most expensive first:**
  1. family acting beyond hands, props, bubbles and the few walks the story needs;
  2. the 3D crane landscape (keep the plates);
  3. duo puzzles beyond the first;
  4. animals down to four: ladybird, ants, jay, cranes;
  5. exciting sequences simplified to one threat each;
  6. challenge routes down to two (keep C1 and C4);
  7. candy kinds from 16 to 10;
  8. music arrangements from 8 to 3;
  9. then the extras: hide-and-seek, photo mode, the cobbles, the vittra toy, the lost things, album photos (use
     stills).
- **Change control.** After H3, new wishes go to a "Senare" list in `HANDOVER.md`, decided at the next release.
  Sköldhästen grew into three adventures in the middle of polishing.

### 7.5 Session rules (summarised; `CLAUDE.md` is the working copy)

1. **Start:**
   - read `HANDOVER.md`;
   - `npm ci && npm test` (including the robot), and fix a failure first;
   - `npm run dev` and open `?debug` to check that the game starts and plays.
2. **One PR, one visible outcome.** Never start the next chapter's content in the same PR. Change
   `RELEASED_CHAPTER` only to release.
3. **End:**
   - typecheck, tests, the privacy gate and the build's size gate pass;
   - `HANDOVER.md` is updated: done, next, decisions, known bugs, the planned-against-actual row, the "Senare"
     list, "Frågor till Olov", and whether the next step needs Olov's computer.
4. **Privacy (§2.6):**
   - consent covers the first names Elof, Moa, Bertil, Mamma Sofie and Pappa Emil, and the real places;
   - never surnames, the house number or address, the house's coordinates, the school, or account names;
   - never commit the reference photos (`photos/`), the character sheets or likeness renders;
   - family models, textures and `.blend` files live in the private repository;
   - contact sheets in pull requests use a stand-in figure;
   - no voices, and no logotypes (§0 Q9, Q13).
5. **Licences:** every third-party or generated file is listed in `LICENSES.md` under one of the three
   categories in §5.6, including everything fetched through Blender's MCP add-on.
6. **Blender:** *MCP for Blender* runs with `DISABLE_TELEMETRY=true` and safe mode on; never opt in to its
   telemetry; save and commit before large operations; never Hunyuan3D.
7. **Release timing:** merge at least 15 minutes before Elof plays.
8. **Merging:** Olov merges. If Olov agrees, a session may merge its own green PR when it doesn't touch
   `RELEASED_CHAPTER`, likeness assets or the privacy rules.
9. **Contact sheets** are committed by sessions (not CI), only on checkpoint PRs: WebP at 390×844, 844×390,
   780×360, 1180×820 and 1440×900, under `docs/shots/<chapter>/`.
10. **Playwright** is pinned to 1.56.1 everywhere, matching the browser preinstalled in cloud sessions, which
    can't download another.

### 7.6 Asset inventory, priced (first estimate)

| Item | Count | How | Sessions |
| --- | --- | --- | --- |
| Elof's clips from the CC0 library | about 12: idle, walk, run, three jump parts, push, climb, interact, pick up, crouch, sit | the library's skeleton, shared by both routes (§5.6) | 1 |
| Elof's own clips | about 15: hop, tumble, brace, slide down, pump and swing, throw the lace, lunge, taste, give, paint, carve, hold a lantern, ride (plane, cap, crane), stomp, wave, shrink and grow | keyed in Blender through MCP, plus procedural layers | 2–3 |
| Elof's faces | 10 expressions plus blink, as a sticker atlas | drawn in code | 0.5 |
| The ghost | 5 rigid parts, about 12 code-driven moves (waddle, hop, tilt, freeze, dance, juggle, knock, point, grab, wave, carry, fall flat) | modelled in Blender; moved in code | 2 |
| Family hands | about 9 moments: Pappa's brush, knife, seesaw and carving lesson; Moa's plane; Bertil's cap; Mamma's log, braid and mug | hand models with a few poses, in Blender | 2 |
| Family portrait bubbles | 4 people × 4 expressions | rendered in Blender from their models | 0.5 |
| The family's figures | Pappa, Mamma, Moa and Bertil | built in Blender on Elof's skeleton, after the sheets (§5.6) | 3–4 |
| Family held poses | the prologue, the summit, the epilogue | posed models | 1 |
| Family walks and memory actions | about 6: Mamma past the door, the memories' walks and reaching, the headlamps arriving, the walk home | library clips plus poses keyed in Blender | 1–2 |
| The memories' cast | little Elof (Elof's model at three, in two outfits); a smaller Moa and Bertil; the first trägubbe, new and weathered, with one blink | modelled in Blender; sepia in-engine | 1 |
| Animals | ladybird, ants (instanced), jay, crane family (3); in 1.1 a dipper and a beaver | CC0 or Blender, procedural motion | 2–3 |
| Nature kits | 25–40 props per place, 6–10 tiling materials | generators, Blender hero props, CC0 materials and scanned models from Poly Haven | 1–2 per place |
| Backdrop plates | about 8 | rendered in Blender after the landscape references; split and pre-blurred | 1–2 |
| Built things | the kitchen and its shelf of figures, the house and deck, Pappa's workshop and shavings, plane, cap, boardwalk, seesaw | Blender | 2 |
| Exciting sequences | 4: falling drops, the cone avalanche, sinking tussocks, gusts | code and the chapter kits | 2 |
| Challenge routes | 4, one per chapter | level design from the chapter kits | 2 |
| Candy | 16 kinds (20 in 1.1), trail variants, 3 magic candies | code | 1 |
| UI | title lettering, about 30 icons, panels, Moa's map pieces, the play-style pictures, album | code | 1.5 |
| Audio | the theme in up to 8 arrangements with stems; about 10 ambiences; about 90 effects | synthesised; CC0 recordings | 2–3 |

### 7.7 Risks

| Risk | What could happen | Mitigation |
| --- | --- | --- |
| Consent is withdrawn later | a family member wants out | models and textures come out with one redeploy, because they never enter the public repository; names, places and the story come out of the site and the current files, but not out of git history |
| The secret doesn't match reality | Elof knows Pappa's first figure is at home | Olov approved the story, and §0 still asks about the real figure. If it exists, the game's trägubbe is modelled on it and the story becomes how it came home. The memories are built last, so the change is small. |
| Characters built in Blender fall short of the sheets | Elof doesn't recognise himself | hair, clothes and silhouette carry the likeness at 75 px; sticker faces; H1b at 75 px and close-up; one correction, then the pivot in §7.3 |
| Too easy, or too hard, for Elof | boredom, or frustration | *Äventyr* as default with a robot-tested window per timing; *Lugnt* one tap away; Elof's "lätt, lagom eller svårt?" after Utgåva 1, and a tuning patch after it |
| Phone performance | stutter, heat, crashes | `WebGLRenderer`, tiers, budgets, `?bench` on all three devices, gates 4–5 |
| Mixed art sources (code, Blender, scanned assets) | it looks like a collage | the art bible, golden frames, one grading system, the vertical slice before Stage 2 |
| Olov's time | slow feedback stalls sessions, and Blender sessions need him at the computer | weekly batches, planned-against-actual forecasts, code-only sessions in the cloud, optional self-merge for safe PRs |
| Scope: 3D is slow | late releases | releases with cut points, the cut order (most expensive first), the H2b forecast |
| No child tests before the reveal (Olov's choice, §0 Q10) | the reveal finds the problems | Olov plays badly on purpose at H2 and H3; the robot tests every timing window at its edges; *Lugnt* and the swing assist are one tap away; H4 is watched and logged, and a tuning patch follows it; the slice can be shown to Elof early if the surprise allows |
| Blender MCP | uploads of private scenes; a harmful script; an asset with the wrong licence | telemetry disabled and never opted in; safe mode; commits before big steps; the licence check in `LICENSES.md`; never Hunyuan3D |
| Privacy | details that lead a stranger to the children | §2.6, the private repository, `noindex`, the CI privacy gate |
| iOS quirks | a silent game, lost saves, no fullscreen | the audio rules, the Home Screen install, chapter codes |
| Licences | files that may not be published | three allowed categories, checked in review |

---

## 8. What changed between versions

### Version 5: story comprehension and connected puzzles (4 October 2026)

1. The original "nothing is built" state is identified as historical. `HANDOVER.md` is authoritative for
   code, checks, releases and deployment; this plan still describes work beyond the current stand-ins.
2. [The overhaul addendum](storytelling-overhaul.md) records six primary game/developer sources and
   distinguishes their descriptions from our proposed application.
3. The opening establishes painting → waking → theft → torn bag → spilled star → witnessed shrinking.
   The family sees and reassures Elof nearby, and its later practical help follows from that encounter.
4. Durable current-purpose, pause/title recap and chapter handoff reconnect the player to the story. The
   summit motive requires actual rescue/eyes/bag but survives a missed mountain memory; "min gamla" and
   childhood identity in those cues still require that discovered memory.
5. Implemented local loops cover Moa's optional paper pocket and explicit boarding, the forest weight
   experiment and returned-to doorway picture, Mamma's persistent bog boardwalk after chick reunion, and
   the optional mountain prize's reusable return lace. Main collectible/checkpoint meaning and old saves
   are preserved; these loops are not a new global quest engine or a complete spatial-world redesign.
6. Public family rehearsal bodies now stage practical roles across all chapters. The finale shows painted
   first-carving eyes, chosen shared sweets and Elof carried home on Pappa's shoulders, with private-model
   compatibility. Final likeness, contact and nuanced acting remain open.
7. Acceptance includes comprehension, legitimate solve orders, failure feedback, retry, optional-route
   independence, interrupted sessions, accessibility and all five device layouts. Passing browser checks
   does not substitute for Olov's judgement of final art, sound and family-device play.
8. Broader spatial work and Byn's return loop remain later outcomes. `RELEASED_CHAPTER` remains `null`;
   neither these development changes nor this document approve publishing or release.

### Version 4: Olov's second round of answers (3 October 2026)

1. **Every open question is answered** (§0). Two small ones are left there, both with defaults.
2. **The secret is redone** (§2.4, §3): Elof was about three, not a baby, when Pappa began to carve.
   - The memories show little Elof with his own trägubbe: he gets it from Pappa, shares his Saturday sweets with
     it, and leaves it one last candy at the crack.
   - That is now why the ghost takes the bag: it finishes the party little Elof began.
   - The golden candy is a geléhallon, the kind he shared. The game names no year.
3. **The ghost is named *Klonk*** (§2.2, §3.4), after its footsteps. Elof gives it the name in the epilogue, with
   no naming screen, and the last card uses the name.
4. **No voices** (§3.7, §6.8): *Läs upp*, the parents' recording page, the voice bus and the *Röster* volume are
   gone. Characters make wordless sounds.
5. **No logotypes** (§2.2): the star on the real ghost's shoes becomes a plain disc.
6. **One tester** (§7.1, §7.3): Olov. The borrowed child is gone, H2 and H3 are Olov's own tests, and Elof's first
   play is the first time a child plays. §7.7 says how the plan lives with that.
7. **No dates** (§7.3): the stages run in order, and a release goes out when its checkpoint has passed.
8. **Every character is designed in Blender** (§5.6): no Meshy, and no parallel routes. The order is Elof and the
   ghost, then the family, little Elof, the trägubbar and the animals. What this saves, together with the voice
   page and the naming screen, pays for building the family's figures (§7.6), so the total stays at about 40–55
   sessions.
9. **The ghost** (§2.2, §5.6) is modelled after two photos, with the render and the poster for what they don't
   show. There is no scan. It has hands, as on the poster and the render, which the real carving doesn't.
10. **The places** (§5.6, §5.8): no photos or recordings from the real places for now. Plates are rendered in
    Blender after the 84 reference pictures in `photos/landscape/`, which are openly licensed but mostly CC BY-SA,
    so they are for looking at only. Scanned rocks, stumps and plants come from Poly Haven, and ambience is CC0 or
    synthesised.
11. **Olov's computer** (§6.14): Windows 11 with an RTX 3070, Blender 4.5.9 and Node 24. The Blender MCP server is
    declared in `.mcp.json`, and still needs `uv` to start.
12. **References** (§2, §2.6) are in `photos/`, which git ignores, instead of `references/`.
13. **The candy** (§3.4, §4.3): the family likes every kind, so Elof chooses what each of them gets at the party,
    and the trail candy looks like the candy on Olov's poster.
14. **Every picture in the root of `photos/` has a job** (§2): a table says what each one decides and which model
    it is used for, and a model isn't ready for H1b until it has been compared with all of its pictures. The
    landscape folder is for the surroundings. Little Elof's cap in the memories comes from the viewpoint photo.

### Version 3: Olov's first answers (3 October 2026)

1. **Consent** (§0, §2.6). Both parents said yes to everything, and every name may be used:
   - Mamma Sofie and Pappa Emil are named; Näsbacken and an exact house are allowed;
   - the "Mamma and Pappa only" rule, the gated memories and the encrypted *familjepaket* are gone;
   - surnames, the house number, the house's coordinates, the school and account names still stay out, at no
     cost to the game;
   - the family's models stay in the private repository, so they can always be taken down.
2. **The secret** (§3). Pappa found carving as an adult, just before the pandemic (his webshop's own words), so
   "Pappa as a boy" is gone:
   - his very first trägubbe was carved for baby Elof and lost on the mountain;
   - the memories show the family the year Elof was born, with baby Elof in a light-blue hat;
   - Elof paints the old figure new eyes with a crowberry; Pappa's line names Elof; the epilogue has a carving
     lesson and a last blink;
   - the questions for Emil are in §0 Q3.
3. **A seven-year-old who plays games for 11+** (§4):
   - two play styles: *Äventyr* (default) and *Lugnt*, which keeps version 2's gentle game;
   - a variable jump, a swing he pumps and times himself, and the glitter bubble as a one-second retry;
   - four exciting sequences (E1–E4) and four challenge routes (C1–C4);
   - puzzles of up to four steps;
   - help only when asked, *Läs upp* off, and a borrowed test child of 7–10 who plays a lot.
4. **The devices** (§5.6, §6): a new iPad, an iPhone and an S23-class Android phone. *Hög* is the target tier,
   performance gates are set on all three, and contact sheets add 780×360.
5. **The renderer** (§6.2): `WebGLRenderer` on WebGL 2 is decided. The WebGPU bake-off is dropped.
6. **Blender through MCP** (§5.6, §6.14, §7):
   - Olov builds on his own computer, so the network question is solved;
   - Blender is the main tool for characters, the ghost, built things, animation, bakes and plates;
   - both character routes end on the CC0 animation library's skeleton;
   - *MCP for Blender* runs with telemetry disabled and safe mode on, and its asset sources get licence checks.
7. **Delivery** (§7): about 40–55 sessions, and 60–90 hours for Olov, because Blender sessions need him at the
   computer.
8. **The repository:** `main` now exists, with a placeholder page and a minimal Pages workflow (§6.11).

### Version 2: the review of version 1

Five reviewers read version 1 in full. They checked it against the Sköldhästen code and history, the reference
images, and the three r186 and planck sources, with builds and Chromium runs.

| Angle | Score | Main finding |
| --- | --- | --- |
| Fun and usability for a six-year-old | 6 | Kapitel 1 had no hint helper before Moa. The first swing needed timing. The payoff was text that a non-reader can't read. The controls weren't taught without words. No child of the right age played before the reveal. |
| Story, the brief and Swedish | 6 | Three things overrode the brief: the ghost was too kind and dropped candy on purpose, where the brief has it *busigt* and dropping it by accident. Nothing showed why the ghost wanted candy. The giants' logic had a hole. *Tälja* was used as a noun. |
| Technical accuracy | 6.5 | Render targets were missing from the GPU budget. The libraries alone filled the JS gate. UASTC maps broke the byte budgets. Shader warm-up compiled the wrong variant. `Object3D.dispose()` was assumed to free memory. Dynamic resolution would misread iOS frame caps. |
| Scope and production | 5 | The estimates ignored Sköldhästen's real cost, about twice its plan. There was no vertical slice. The family's acting wasn't priced. The cut order couldn't save the schedule. The riskiest character route was the default. |
| Privacy and child safety | 6 | Consent was assumed. The parents' first names plus the village identify the family through public records. The children's models would sit in permanent public history. Magic candy found on the ground was eaten. Falling into water was harmless. |

**What changed:**
1. **The story** (§3):
   - The ghost is *busigt* and flees at first. The tear in the bag and the star are accidents.
   - It waits for Elof only after he rescues it from the eddy.
   - The Toy Story rule (the ghost freezes when a grown-up looks) closes the giants' logic.
   - *Why the candy* is now shown: Pappa as a boy gave his trägubbe one candy every Saturday.
   - The golden candy makes Elof big again, and the ghost's empty carved bag finally gets a candy.
   - The bubbles sharpen as Elof helps others.
   - "Pappas händer och Elofs ögon" is the rule that gave the ghost life.
2. **For a six-year-old** (§4):
   - the ghost is the helper in Kapitel 1;
   - the swing pumps itself, and letting go needs no timing;
   - the buttons are 96 and 84 px;
   - a wordless tutorial with an animated hand;
   - taps on the world do something;
   - near-catches with *Ta!*;
   - generous coyote time and jump buffer; drops over 4 EL are refused;
   - Elof's profile starts with *Läs upp* and sound on;
   - confirmations in pictures;
   - a borrowed child tests at H2 and H3.
3. **Safety in the fiction:**
   - nothing found on the ground is eaten;
   - animals get lingonberries;
   - candy is never placed next to mushrooms;
   - Elof refuses open water and wet moss;
   - Pappa sees him go and stays close;
   - the party serves a normal portion, and teeth get brushed.
4. **Privacy** (§0 Q4, §2.6):
   - written consent from both parents first;
   - the parents are only Mamma and Pappa;
   - the village, church and rivers go unnamed in the game;
   - the family's models live in a private repository;
   - no real voices are published; family recordings stay on the tablet;
   - `noindex` on every page;
   - a CI privacy gate.
5. **Scope** (§1, §7.4):
   - Utgåva 1 is the prologue and Gården.
   - Version 1.0 has four chapters, with the brook's calm edge folded into Granskogen.
   - Forsen, the bubble candy and the 3D flight move to 1.1.
   - The cut order now starts with the most expensive items, and a MUST may be simplified before a date moves.
6. **Production** (§5.6, §7):
   - Elof is built by Route A and Route B in parallel, and the ghost in code first.
   - The family appears as hands, props and bubbles.
   - A vertical slice (H2b) comes before Stage 2.
   - Olov's time is now 40–60 hours, with a planned-against-actual table and weekly feedback.
   - Network access (§0 Q6) is a prerequisite.
   - The art bake runs in sessions and the pack step in CI.
7. **Technology** (§6):
   - r186's own HDR output and `setEffects` replace pmndrs `postprocessing`;
   - GPU budgets count render targets;
   - no SMAA or full depth of field on phones;
   - shaders are warmed with the play target bound;
   - a real `disposeTree()`;
   - dynamic resolution driven by CPU busy time;
   - `audioSession` set to `ambient` or `playback`;
   - service-worker updates happen at the title;
   - planck's scale and springs handled;
   - Playwright pinned to 1.56.1;
   - byte gates counted as served;
   - draw-call budgets in CI;
   - determinism tested through the real loop.
8. **Swedish:**
   - *trägubbe* replaces *tälja* as a noun, and *spöket* takes "det";
   - "ett av Pappas minnen";
   - "Vi är nära dig hela tiden";
   - "Pappas gungbräda";
   - "Vänd skärmen på bredden!";
   - "Till startsidan".

---

## Appendix A: facts checked while planning (3 October 2026)

| Claim | How it was checked |
| --- | --- |
| `three` 0.186.1 is npm `latest`, published 24 September 2026; 0.186.0 was published 8 September | `npm view three time` |
| Current versions: Vite 8.3.2, Vitest 5.0.3, `@playwright/test` 1.63.0, TypeScript 7.0.2, `@gltf-transform/cli` 4.5.1, planck 1.5.0, `postprocessing` 6.39.5 (peer: three ≥ 0.168 < 0.187), `vite-plugin-pwa` 1.3.0, `@fontsource/andika` 5.3.0 (OFL-1.1) | `npm view` |
| JS bundle with the same loaders (glTF, KTX2, meshopt) and a bloom pass: 191 KB gzipped with `WebGLRenderer` + `EffectComposer`, 295 KB with `WebGPURenderer` + `RenderPipeline` + TSL bloom. The Basis transcoder adds 260 KB (wasm + js), emitted by Vite with no setup. | Vite 8.3.2 production builds in the session scratchpad |
| r186's `WebGPURenderer` falls back to its WebGL2 backend in headless Chromium 141 | Playwright 1.56.1 run |
| That fallback used 2.6–17× more CPU per frame than `WebGLRenderer` (50, 400 and 1,200 meshes) and about 2× the first-frame time | The same run, software rendering (SwiftShader). Indicative only; Stage 0b re-measures on the device. |
| With `--enable-unsafe-webgpu` in Chromium 141, r186's WebGPU backend throws "The provided value is not of type 'GPUTextureComponentSwizzle'". three always passes `swizzle: 'rgba'` in texture-view descriptors. | Playwright run, plus reading `three.webgpu.js` |
| In r186, `renderAsync()` is deprecated (use `render()` after `await renderer.init()`); `PostProcessing` is now `RenderPipeline`; the TSL effects include `FSR1Node`, `TAAUNode`, `GodraysNode`, `DepthOfFieldNode` and `Lut3DNode` | Console warning and the package source |
| Headless Chromium here renders WebGL2 through SwiftShader with ASTC, ETC and S3TC available, and a maximum texture size of 8192 | Playwright run |
| Bredbyn, Saturday 26 September 2026: sunrise 06:42, sunset 18:35, the noon sun 25.2° high (3 October: 07:01, 18:11). Version 2 had given 25 September's values. | NOAA solar formulas at 63.45° N, 18.10° E, CEST; recomputed for version 3 |
| `olovmelander/spokets-godisbus` was public and empty when planning began, with the Pages flag already set | GitHub API, and `git ls-remote` (no refs) |
| Sköldhästen's controls, menus, help ladder, save and process (Appendix C) | Read from `olovmelander/alva-10-birthday` at `5438e23` (1 October 2026) |
| The deploy workflow's action versions (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5) | Research and review sessions checked them against the actions' repositories (`git ls-remote`); `actionlint` 1.7.12 passed the v1 workflow |
| r186's `WebGLRenderer` takes `outputBufferType: HalfFloatType`, and `setEffects([...])` applies tone mapping and sRGB after the effects (and warns that an `OutputPass` isn't needed) | Read in `three/src/renderers/WebGLRenderer.js` and `webgl/WebGLOutput.js` (0.186.1) |
| Gzipped library sizes: three (renderer, loaders, materials) about 192 KB, pmndrs `postprocessing` 81 KB, planck 45 KB | Vite 8.3.2 builds by the review session |
| A full pmndrs chain (bloom, depth of field, SMAA, grade) in HalfFloat at 1180×820 CSS px allocates 143.8 MB of render targets, plus a 16.8 MB canvas; bloom and grade only, 53.6 MB | GL allocation counting in Chromium 141 by the review session |
| `compileAsync` with no render target bound compiles the wrong output-colour-space variants for post-processing (3 recompiles on the first frame; 0 with the target bound) | The review session's Chromium run, plus `WebGLPrograms.js` |
| planck at 1/120 s costs about 0.03 ms per step for a chapter-sized world (600 chain vertices, 150 sensors, 34 bodies) | The review session, Node on a 2.1 GHz Xeon |
| `PrismaticJoint` has limits and a motor but no spring; `Object3D.dispose()` frees nothing by itself; `alphaToCoverage` needs MSAA | Read in planck's type definitions and three's source by the review session |
| Quaternius' Universal Animation Library 1 + 2 is CC0, with 43 + 43 clips; retargeting onto another rig needs per-bone rest-pose offsets (about 1° error with them, 73–180° without) | The asset research session, by reading the licence and testing `SkeletonUtils.retargetClip` in Node |
| `bpy` 4.5.14 runs headless on the container's Python 3.11: decimation, a Cycles CPU AO bake, and a glTF export whose custom properties arrive as `extras` | The asset research session |
| r186's `WebGLRenderer` needs WebGL 2 ("WebGL 1 is not supported since r163") | Read in `three/src/renderers/WebGLRenderer.js` (0.186.1) |
| WebGPU ships in Safari 26 on iOS and iPadOS (released 15 September 2025), Chrome 121 on Android and Samsung Internet 25 | `@mdn/browser-compat-data` 8.1.4 |
| Pappa's own account of his carving (Appendix B.3) | Read in Pappa's private webshop repository at `ad48a38`: the About text in its seed data and admin store |
| *MCP for Blender* is PyPI `mcp-for-blender` 2.1.3 (MIT), formerly `blender-mcp`. Its tools read the scene, run Python in Blender, take viewport screenshots, and fetch from Poly Haven, Sketchfab and Poly Pizza or generate with Hyper3D Rodin, Hunyuan3D and Tripo. Content telemetry is opt-in, and opting in uploads prompts, code, screenshots, scene data and session steps that "may be used … to train AI models"; a minimal usage record is sent by default; `DISABLE_TELEMETRY=true` stops both; `BLENDER_MCP_SAFE_MODE=1` validates scripts before they run. | Read in the 2.1.3 wheel: its code and README |
| `bpy` 4.5.14 (the 4.5 LTS line, updated 15 September 2026) and 5.0.1 run on Python 3.11; 5.1 and later (newest 5.2.2) need Python 3.13 | `pip index versions bpy`, and PyPI's JSON |
| `@vitejs/plugin-basic-ssl` 2.3.0 accepts Vite 6, 7 and 8 | `npm view` |
| The action majors in §6.11 (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5) are the newest tags | `git ls-remote --tags`, re-checked for version 3 |
| Olov's computer: Windows 11, an RTX 3070, Node 24.14.0, git and Blender 4.5; `uv`, `gh`, `exiftool` and `ktx` are not installed | Checked on the computer by the session that wrote version 4. Blender's exact version (4.5.9 LTS) and the add-on's panel (port 9876, only Poly Haven ticked) are from Olov's screenshot. |
| That session had no Blender tools, although the add-on was running | No MCP server was registered with Claude Code, and `uvx` wasn't installed |
| `mcp-for-blender` 2.1.3 is still the newest release (MIT); `blender-mcp` 2.0.0 only points to it | PyPI's JSON, re-checked for version 4 |
| The real ghost, in its two photos: a star on the ankle disc of the shoe, the bag held out in front through the sheet, no carved hands, and a split in the hem. The render and the poster add hands and a fuller sheet. | Looked at in `photos/` |
| The 84 pictures in `photos/landscape/`: 82 are CC BY-SA, one is CC BY 4.0 and one is public domain | Counted in `photos/landscape/SOURCES.md`, which the session that gathered them wrote on 3 October |
| What each of the 16 pictures in the root of `photos/` shows (§2) | Every one was looked at by the session that wrote version 4 |

## Appendix B: research notes

Research sessions could open only GitHub directly; other sites were read through search-engine excerpts.
Check a quote at its source before reusing it publicly.

### B.1 Unravel

- **Makers.** Coldwood Interactive, about 14 people in Umeå. Martin Sahlin made the first Yarny from wire and yarn
  on a family camping trip in northern Sweden.
  - Sahlin: "Every location in Unravel is based on Northern Sweden."
    ([EA](https://www.ea.com/games/unravel/news/unravel-game-environments))
  - Sahlin, on the idea: "highlighting the beauty in the ordinary… everything is really lovely if you just get to
    look at it closely enough."
  - Co-founder and 3D artist Dick Adolfsson: "When you get down on your knees and look at the world from another
    perspective, magic happens." ([PlayStation Blog](https://blog.playstation.com/?p=203012))
  - GDC 2017 talk: "Using empathy as a game mechanic in Unravel"
    ([Game Developer](https://gamedeveloper.com/design/video-using-empathy-as-a-game-mechanic-in-i-unravel-i-)).
- **Chapters of Unravel (2016):**
  1. Thistle and Weeds (the garden)
  2. The Sea
  3. Berry Mire (a bog)
  4. Mountain Trek
  5. Off the Rails (forest and railway)
  6. Down in a Hole
  7. How Much Is Enough
  8. The Letter
  9. Winter Sun
  10. Rust
  11. Last Leaf
  12. Renewed (back in the garden)

  The hub is Grandma's house, where each level is entered through a photograph and memories fill the album.
- **Unravel Two (2018)** added two Yarnys tied to each other, a three-step hint system and a speed assist.
- **Mechanics:**
  - a lasso to anchors; swinging and rappelling;
  - pulling and dragging;
  - tying bridges that double as trampolines;
  - limited yarn, refilled at spools that are also checkpoints.
  - Yarny never learns new moves; variety comes from the places.
  - Reviewers criticised trial-and-error deaths, off-screen hazards, physics glitches and difficulty spikes.
- **Music:** Frida Johansson (folk violinist, Umeå) and Henrik Oja.
  - A small acoustic ensemble: violin, guitar, harp, cello, melodica, percussion.
  - The score arranges traditional polskas, e.g. "Klockarpolskan efter Elsa Siljebo".
  - Sound design used field recordings and a separate footstep sound for each surface.
- **Getting the look on phones:** bake the photographic look into the art.
  - pre-blurred layers instead of a bokeh pass;
  - lightmaps or vertex colour instead of real-time shadows;
  - light cards instead of ray-marched god rays;
  - one LUT grade per place;
  - instanced or impostor forests;
  - KTX2 textures.

  The Codrops "fake 3D image" technique (a depth map plus parallax) suits photo plates.
- **Games worth a look:**
  - Unravel Two;
  - *Planet of Lana* (Swedish, 2.5D, a child and a companion);
  - *Snufkin: Melody of Moominvalley* (Nordic nature and folk music);
  - *Röki*;
  - *Alba* (a child hero, a wildlife journal);
  - *A Short Hike* (gentle, nothing to fail);
  - *Gris* (no words, colour returns as you play);
  - Ori (escape sequences driven by music: a model for the chases);
  - Limbo and Inside (side-on camera, no HUD).

### B.2 Bredbyn and its nature

- **Bredbyn** (63°27′N 18°06′E): the church village of Anundsjö parish, about 35 km north-west of Örnsköldsvik,
  with about 1,200–1,350 inhabitants.
  - Norra and Södra Anundsjöån meet in the village, just above the lake Anundsjön. The northern river falls
    steeply to the confluence, so there are rapids by the village. The water continues into Moälven.
  - Anundsjö kyrka is a stone church traditionally dated 1437. Its bell tower (1759, 20 m) is called one of
    Norrland's most beautiful.
  - Peter Artedi (1705–1735), the father of ichthyology and a friend of Linnaeus, grew up at Näs, about 2 km from
    the church.
  - Bredbyn has no railway; Mellansel (about 11 km east) does.
  - Solbergsbacken is the ski slope in Solberg, about 50 km north, not in Bredbyn.
- **Game-worthy places nearby:**
  - **Storklocken naturreservat**, about 3 km south. The highest coastline, about 270 m, crosses it: forest
    above, sea-scrubbed bare rock below. It has fire-scarred old pines, and Prästbordstallen, a pine about 400
    years old with a girth over 3 m. **The model for "Berget"**, unnamed in the game (§0 Q8).
  - Norra Anundsjöån at Kubbe, with freshwater pearl mussels (protected: shown, never collected), otters, trout
    and grayling.
  - String bogs such as Pengsjökomplexet (Natura 2000) and Mossaträsk-Stormyran (Ramsar; boardwalks and a bird
    tower).
  - Gammtratten (old-growth spruce on three peaks).
  - Skuleberget (295 m, the 286 m highest coastline, the robbers' cave) and Skuleskogen, about 40 km south.
- **Life by habitat:**
  - **Bog:** cranes, golden plover, black grouse, whooper swan; sphagnum in red and green, cranberries, dwarf
    birch, sundew, marsh tea. Cloudberries ripen in late July, so in September only their leaves remain,
    turning orange.
  - **Spruce forest:** capercaillie, hazel grouse, black woodpecker, three-toed woodpecker, Siberian jay
    (*lavskrika*, general knowledge; kept as the companion), red squirrel, moose; beard
    lichen, lingonberries, twinflower; fly agaric (poisonous, never "tasted" in the game).
  - **Brook:** dipper, beaver, otter, trout.
  - **Hilltops:** heather, crowberry, reindeer lichen, crooked pines, and beach cobbles high above today's sea.
- **Seasons:**
  - autumn colours (*ruska*) in mid to late September;
  - lingonberries in August–September;
  - first snow in October;
  - northern lights from September to March.
- **Folklore, child-friendly:**
  - *vittra*, polite underground neighbours with hidden roads (Ella Odstedt, born in Arnäs by Örnsköldsvik,
    collected Ångermanland folk belief);
  - *lyktgubbar* (will-o'-the-wisps) over bogs;
  - *näcken* playing the fiddle in rapids;
  - giants who threw boulders at church bells, which explained erratic boulders and giants' kettles.
  - No local ghost story was found, which leaves the stage free for ours.
- **The church bells on Saturday evening** (*helgsmålsringning*, traditionally at 18:00) are general knowledge.
  Anundsjö's own time hasn't been confirmed, and the game keeps 18:00 (§0 Q8).

### B.3 Lördagsgodis, carving, and Pappa's own story

- **Saturday sweets.** The once-a-week advice followed the Vipeholm experiments (1945–1955), which are now
  considered unethical. They are background only, never game material.
- **Candy names.** Use generic Swedish names and shapes. Avoid brand names, including:
  - Ahlgrens bilar, Dumle, Polly, Kexchoklad, Plopp, Center, Daim, Marabou;
  - Geisha, Marianne, Djungelvrål, Gott & Blandat, Tutti Frutti, Bubs, Haribo;
  - Läkerol, Juleskum, Turkisk peppar;
  - "Sura skallar" as a product name;
  - the makers' names.
- **Flat-plane carving** (the ghost's style): figures cut with a knife in broad flat facets, left unsanded and
  lightly painted. The Swedish master is Axel Petersson "Döderhultarn".
  - It is not *karvsnitt*, which is chip carving.
  - Lime (*lind*) is the classic wood for figures.
  - The tools are a sloyd knife (e.g. a Mora knife) and a hook knife.
  - Children learn it with the same rule Pappa says in the epilogue: always cut away from the body.
- **Pappa's own story,** from the About text of his webshop's repository (private; Olov pointed the planning
  session to it):
  - "Strax före pandemin letade jag efter något att göra och hittade täljningen av en slump via ett videoklipp."
  - "Sedan dess har jag skapat över 250 unika trägubbar här från mitt hem i Bredbyn, Anundsjö. I mitt arbetsrum,
    med en verkstad på gården, förvandlar jag träbitar till livfulla karaktärer."
  - "Jag täljer varje gubbe för hand ur lind, och hela processen från sågning och täljning till målning kan ta upp
    till tio timmar." His figures range "från idrottare till traditionella tomtar".
  - "Det är fantastiskt att se hur min passion har smittat av sig på mina barn, och min framtidsdröm är att en dag
    få lära ut konsten att tälja till andra."
  - The shop's welcome text: "Varje figur täljs för hand här i Anundsjö – med tålamod, känsla och en stor dos
    hjärta. Ingen är den andra lik – varje figur bär på sin egen berättelse."
  - The game uses these facts. It doesn't use the shop's pictures, and it doesn't link to the shop.

### B.4 Tools for characters, the ghost scan and assets

Checked through the tools' GitHub repositories, PyPI, npm and tests in the container. Prices and some licence
terms marked "unverified" came from second-hand sources.

| Tool | What it does | Licence of what you make | Verdict |
| --- | --- | --- | --- |
| **Meshy** (Meshy-7; `meshy-cli` 0.4.0) | Image or 1–4 separate views to 3D. Smart topology at 100–15,000 triangles, A- or T-pose, 2k–8k PBR textures, GLB/FBX. Automatic humanoid rig, and a library of 678 clips. | **Paid plan: you own it.** Free plan: CC BY 4.0, owned by Meshy. | **Not used** (§0 Q15). The fallback if H1b fails twice: one month of Pro, about US$20 (unverified) for 1,000 credits. |
| **Tripo** (SDK 0.4.2) | Image, or four views (front, left, back, right) to 3D. Face limits, quads, a Mixamo-named rig, about 11 humanoid presets. | Free tier CC BY (unverified); paid plans private (unverified) | Not used |
| Rodin Gen-2.5 | Up to 5 images, T/A pose, quad options. No rigging. Also reachable through MCP for Blender. | Unverified | Not for the family's likeness unless its terms check out like Meshy's |
| Hunyuan3D 2.x (open weights) | Multi-view to 3D | **Licence excludes the EU, UK and South Korea** | **Not usable from Sweden** |
| TRELLIS.2 (Microsoft) | Single image to 3D; needs a 24 GB NVIDIA GPU | MIT | Not usable on Olov's RTX 3070, which has 8 GB; not a turnaround tool |
| SF3D / SPAR3D (Stability) | Single image to 3D; runs on CPU (slowly) | Community licence; you own outputs | A rough fallback |
| **Quaternius Universal Animation Library 1 + 2** | 43 + 43 clips on a 65-joint UE5-mannequin rig: idle, walk, jog, sprint, the parts of a jump, push, climb, interact, pick up, crouch, sit, carry. In-place and root-motion versions. | **CC0** | **Recommended animation source** |
| Mixamo, ActorCore | Large animation libraries | Their terms forbid redistributing raw files | **Never in this public repository** |
| SMPL-based assets | Body models | Non-commercial research only | Avoid |
| Scaniverse, KIRI Engine, Polycam | Phone photogrammetry | Free tiers and export limits unverified | Not used: there are only two photos of the ghost (§0 Q7) |
| COLMAP 4.2.1 (`pycolmap`) + OpenMVS 2.4.0 | Photogrammetry on CPU | BSD / AGPL (tools only) | The sparse step tested OK here; OpenMVS needs a build |
| **Poly Haven, ambientCG** | Photo-scanned textures, models and HDRIs | **CC0** (Poly Haven: "no attribution requirement whatsoever") | **Use.** Poly Haven is ticked in Olov's Blender add-on. |
| Kenney, Quaternius models | Stylised models | CC0 | Use where the style fits |
| Megascans/Fab, Textures.com | Photo-scanned assets | Not allowed in a public repository | **Never** |
| `bpy` 4.5.14 (Blender as a Python module) | Headless decimation, baking and glTF export with `extras` | GPL-3.0 (the tool, not its outputs) | Use in sessions |
| **MCP for Blender** (`mcp-for-blender` 2.1.3) | Claude drives a running Blender: scene info, Python inside Blender, viewport screenshots; downloads from Poly Haven, Sketchfab and Poly Pizza; generation with Hyper3D Rodin, Hunyuan3D and Tripo | MIT (the tool); every asset keeps its own licence | **Use on Olov's computer**, with telemetry disabled and safe mode on (§5.6) |
| Sketchfab, Poly Pizza (through MCP for Blender) | Downloadable models under many licences | Per model | Only CC0 or CC BY, recorded in `LICENSES.md` |
| Depth Anything V2 **Small** | Depth maps to split photo plates | Apache-2.0 (Base, Large and Giant are non-commercial) | Use only *Small* |
| IOPaint (LaMa) | Removing people and houses from photos | Apache-2.0 | Use |
| `@dgreenheck/ez-tree` 1.1.0 | Procedural trees with LODs | MIT | Use |
| `@sparkjsdev/spark` 2.3.1 | Gaussian splats in `WebGLRenderer` | MIT | STRETCH only |

**Retargeting notes** (tested in Node against three r186's `SkeletonUtils.retargetClip`):
- Pass per-bone rest-pose offsets (`localOffsets`), computed from both rigs in the same T-pose. Without them,
  limbs are 73–180° off; with them, about 1°.
- Root the `AnimationMixer` at the `SkinnedMesh`, not at `gltf.scene`.
- GLTFLoader strips characters such as `:` and `.` from bone names.
- Bake the clips at build time, then resample them with gltf-transform.

**GitHub limits:**
- the repository should stay under about 1 GB, and so must the published site;
- about 100 GB of bandwidth per month;
- Git LFS cannot be used with GitHub Pages.

## Appendix C: what is reused from Sköldhästen

All of this is from `olovmelander/alva-10-birthday` at `5438e23`. Port the ideas, and the code where it fits; the
renderer, art and ticket-page integration are not reused.

| Area | What carries over | Where it is in Sköldhästen |
| --- | --- | --- |
| Touch input | The floating stick (58 px radius, dead zones 0.12/0.18) and separate action buttons; pointer capture per touch; all held input released on cancel, lost capture, blur, pause and close; *Följ fingret* | `skoldhast/src/input.mjs`; `tests/skoldhast-controls.test.mjs`; `tests/browser/skoldhast-touch.mjs` |
| Keyboard and gamepad | Movement by key position (`KeyW`), the newest opposite direction wins, verbs by letter. Standard-mapping gamepad with D-pad focus in menus, A to press, B to go back, and Start pausing even in menus. The on-screen controls follow the device in use. A note shows the key while an action is possible. | the same, plus `tests/browser/skoldhast-gamepad.mjs`, `skoldhast-controls.mjs` |
| The loop | A fixed 1/120 s step with bounded catch-up, an accumulator reset on resume, interpolation, the press queue | `skoldhast/src/main.mjs` (around lines 610–655); Sköldhästen plan §8.2 |
| Kindness | No lives or fail states; refusing instead of failing; puzzles as state machines with a commit point, local reset, save rule and return route; "Jag har fastnat" to the nearest safe spot | Sköldhästen plan §4.3; `skoldhast/src/game.mjs` (`safeSpot`) |
| Help | A callable companion; a three-level ladder (*En liten ledtråd*, *Lite tydligare*, *Visa mig var*); help levels per player (*Bara när jag frågar*, *Påminn mig*, *Guida mig*); a goal note that says why, never how | Sköldhästen plan §4.4; `skoldhast/src/guide.mjs`, `guidance-state.mjs`, `klo-help.mjs` |
| Menus | A title with Börja/Fortsätt, change player, and settings; pause; settings that keep the game paused; every panel has ✕, and a tap on the backdrop or Esc closes it; a key reference under settings; the rotate hint; a preview page for every menu without WebGL | `skoldhast/src/ui.mjs`, `skoldhast.css`, `skoldhast/dev/menus.html` |
| Swedish | All strings in one content module; *du*; Swedish quotation marks and dashes; plain child words; Olov reads every line aloud before a release; "för bästa upplevelse" | `skoldhast/src/content/sv.mjs`; Sköldhästen plan §3.6 and Appendix C |
| Save | Player profiles under versioned keys; stable authored IDs; tolerant loading; writes at checkpoints, close, `visibilitychange` and `pagehide`; word codes as a backup; the two failure messages | `skoldhast/src/save.mjs`; Sköldhästen plan §8.6 |
| Releases | `RELEASED_CHAPTER`, where raising it *is* the release; blank pages for unreleased chapters; a dev flag to see unfinished work; merge at least 15 minutes before play | `skoldhast/src/content/world.mjs`; `skoldhast/CLAUDE.md` |
| Audio | Resume on Börja and on later input while not `running`; suspend when hidden; respect the iOS silent switch; Karplus–Strong plucks rendered to buffers (never a feedback `DelayNode`); offline render QA | Sköldhästen plan §5.5 and §8.5; `scripts/skoldhast-audio-check.mjs` |
| Tests | The robot playthrough through the pure simulation; replay identical at several frame rates; a headless screenshot tool with SwiftShader; contact sheets at fixed viewports; budgets enforced by the asset build | `tests/skoldhast-playthrough.test.mjs`; `scripts/skoldhast-shot.mjs`; `scripts/build-skoldhast-assets.mjs` |
| Process | `CLAUDE.md` plus `HANDOVER.md`; one PR, one visible outcome; "Frågor till …"; the H1–H4 checkpoints; MUST/SHOULD/STRETCH with a cut order; pivot rules | `skoldhast/CLAUDE.md`, `skoldhast/HANDOVER.md`; Sköldhästen plan §7 |

**Not reused:**
- PixiJS and the coloured-pencil art pipeline;
- the ticket-page loader and host glue (this game is its own site);
- the adventure-series catalogue: one game for now, though the save format leaves room for more.
