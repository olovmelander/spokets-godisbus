# Elof och det stora godisäventyret

Game plan, version 2 — 3 October 2026. Repository `olovmelander/spokets-godisbus`.

Version 2 replaces version 1 of the same day. Version 1 was reviewed from five angles: fun for a six-year-old;
story and Swedish; technical accuracy; scope and production; privacy and child safety. Each finding was checked,
and §8 lists what changed and why.

This is a design and implementation proposal. Nothing is built yet, and nothing has been measured on the
family's devices. Numbers are starting values to tune. Everything that was checked while planning is listed in
Appendix A, with how it was checked; everything else is marked as an estimate or as unverified.

**Who reads this:**
- **Olov**, who commissions the game: the decisions in §0 and the checkpoints in §7.
- **Elof's parents (Mamma and Pappa)**, for the questions marked 👪: names, likeness, the real carving, and the
  story about Pappa. The plan calls them Mamma and Pappa throughout, as Elof does; see §0 Q4 for why.
- **Claude Code sessions**, for everything else. §1–§5 describe the game; §6–§7 describe how it gets built.

**What it builds on.** The UX of *Sköldhästen* (`olovmelander/alva-10-birthday`, folder `skoldhast/`) is
reused on purpose: its controls, menus, kindness rules, help ladder, saving, tests and session handover.
Appendix C lists exactly what carries over. What is new here:
- a 3D renderer (Three.js r186);
- an art direction after *Unravel*: photoreal nature, seen from very close;
- a player of about six;
- a standalone repository, built and deployed by GitHub Actions.

### Kort sammanfattning (på svenska)

- **Spelet.** Ett äventyr i sidovy, byggt i 3D, om Elof.
  - **Utgåva 1:** prologen och Kapitel 1, cirka 15–20 minuter för en sexåring.
  - **Version 1.0:** hela berättelsen på 55–65 minuter, med fyra kapitel (Gården, Granskogen med bäcken, Myren,
    Berget), en final och en epilog.
  - **Version 1.1:** lägger till bland annat en forsfärd.
- **Idén.**
  - Ett busigt träspöke stjäl Elofs lördagsgodis. Elof krymper till spökets storlek, ungefär 15 cm, och då blir
    naturen hemma jättestor och vacker, som i Unravel.
  - Godisspåret visar vägen.
  - När en vuxen tittar stelnar spöket till en vanlig träfigur.
  - Familjen hjälper som snälla jättar: Moas pappersflygplan, Pappas gungbräda, Bertils kepsbåt, och Mammas
    stockbro och fläta.
- **Hemligheten.**
  - När Pappa var liten gav han sin första trägubbe en godisbit varje lördag – tills han tappade den på berget.
  - Spöket bär på det minnet och vill ha kalas för den ensamma trägubben, men det kan inte be om hjälp, för det
    har ingen mun.
  - Till slut förstår Elof, och bestämmer själv vem som ska få hans godis.
- **För en sexåring:**
  - spelet går att spela utan att läsa, och uppläsning är påslagen;
  - det finns inga liv och inget att misslyckas med;
  - knapparna är stora, och gungningen sköter sig själv;
  - spöket och sedan lavskrikan visar vägen när man fastnar.
- **Tekniken.**
  - Three.js r186 med `WebGLRenderer`. Den var snabbare och stabilare än WebGPU-renderaren i mina mätningar, och
    WebGPU-renderaren kallas fortfarande experimentell i three.js dokumentation.
  - Vite 8, TypeScript, planck.js för fysiken.
  - GitHub Actions bygger och publicerar på GitHub Pages.
  - Byggt för mobil först, med kvalitetsnivåer.
- **Grafiken.**
  - Elof görs på två sätt parallellt, och det som blir mest likt vinner: (A) 3D från dina karaktärsblad med ett
    betalt AI-verktyg; (B) helt i kod.
  - Spöket byggs i kod med platta täljytor.
  - Naturen byggs i kod med fria fotoskannade material.
  - Familjens modeller ligger i ett privat repo.
- **Nästa steg.**
  1. Svara på frågorna i §0, framför allt samtycket från Elofs föräldrar.
  2. Steg 0: grundbygget live på Pages, en provbild av gården testad på Elofs egen enhet, och en första Elof i 3D.
  3. Sedan en kort ”vertikal skiva” i färdig kvalitet, innan hela kapitel byggs.

---

## 0. Frågor till Olov (och till Elofs föräldrar där det står 👪)

Frågorna med ★ behöver svar innan Steg 0b (§7.3). Alla frågor har ett förval, så arbetet kan börja innan alla
svar har kommit.

1. ★ **Elof som spelare.** Hur gammal är Elof, och läser han korta ord själv? Vilken enhet spelar han på
   (modell, iOS- eller Android-version, webbläsare)? Håller han den liggande eller stående? Spelar han med ljud?
   - *Förval:*
     - 6–7 år; läser inte säkert än;
     - en surfplatta i liggande läge;
     - spelet ska gå att spela helt utan att läsa, och Elofs profil startar med uppläsning och ljud påslagna
       (§4.1).
2. ★ **Hur stor är Elof? Tre sätt:**
   - **(a) Elof blir liten (rekommenderas).** I slutet av prologen fångar Elof en glittrig stjärna som trillat ur
     påsen och krymper till spökets storlek, ungefär 15 cm.
     - *Fördelar:*
       - naturen blir jättestor och vacker, precis som i Unravel;
       - Elof och spöket syns lika stora på skärmen;
       - familjen blir hjälpsamma jättar.
     - *Kostnad:*
       - familjen syns mest som händer, rekvisita och bubblor;
       - den vidsträckta naturen syns i utsikter och i tranflygningen, inte hela tiden.
   - **(b) Precis som i beskrivningen:** Elof i vanlig storlek och ett litet spöke på 15 cm.
     - *Fördel:* familjen kan gå bredvid i full storlek.
     - *Kostnad:* på en telefon blir spöket bara cirka 10 pixlar högt. Det syns knappt, och känslan från Unravel
       försvinner.
   - **(c) Som på affischen:** spöket växer till barnstorlek när det får liv.
     - *Kostnad:* det är inte längre ”litet”, och naturen blir vanlig storlek.
   - *Förval:* (a). Valet ändrar mest kameran och miljöernas skala. Kontroller, menyer och teknik är desamma.
3. ★ 👪 **Spökets hemlighet.**
   - Förslaget:
     - Spöket fick liv av Pappas händer och Elofs ögon, och bär därför på ett av Pappas minnen. När Pappa var lika
       liten som Elof gav han sin allra första trägubbe en godisbit varje lördag – tills han tappade den uppe på
       berget.
     - Spöket vill ha kalas för trägubben, som har varit ensam i trettio år. Därför tar det busigt Elofs
       lördagsgodis.
     - Påsen går sönder i farten, och godiset trillar ut utan att spöket märker det.
     - När Elof räddar spöket ur virveln förstår det att han kan hjälpa. Men det kan inte be om hjälp, för det
       har ingen mun.
     - Uppe på berget hittar de trägubben tillsammans, och Elof bestämmer själv vem som ska få hans godis.
   - Är det okej att hitta på det här om Pappa? Finns det en riktig berättelse om hans första trägubbe som vi kan
     använda i stället (vad var det, och var tappades den)?
   - Växte Pappa upp nära Bredbyn? Täljde han redan som liten? Får hans pappa synas i ett minne? Får vi visa
     honom ledsen som barn?
   - Pappa ser bildmanuset till minnena och avslöjandet innan de byggs, och säger ja.
   - Elof kommer att tro på ”Pappas minnen”. Bestäm tillsammans vad Pappa svarar när Elof frågar.
   - Pappas egen pappa syns i det sista minnet bara om Pappa vill. Annars blir han en siluett.
   - Tills Pappa har sagt ja visar minnena bara händer och trägubben, aldrig ett ansikte.
   - En idé, som är Pappas val: han täljer en riktig ”första trägubbe”. Den står i fönstret när Elof har spelat
     klart.
   - *Alternativ:* (b) spöket vill ge godis till en ensam gammal trägubbe som ingen saknar; (c) din egen idé.
   - *Förval:* förslaget, med en påhittad första trägubbe. Minnena byggs sist i varje kapitel, så ett nej kostar
     lite.
4. ★ 👪 **Samtycke och integritet.** Allt i repot och på sajten är synligt för alla, och det som en gång är
   publicerat går inte att ta bort ur git-historiken.
   - **Varför det behövs.** Att lägga ut något på öppna webben räknas inte som privat bruk enligt
     dataskyddsreglerna (EU-domstolens svenska Lindqvist-mål från 2003). Därför behöver **båda föräldrarna**
     säga ja. Ett sms räcker.
   - **De ska säga ja till:**
     - barnens förnamn;
     - Bredbyn som miljö;
     - spelmodeller som liknar barnen;
     - huset, exakt eller bara ”tydligt likt”;
     - berättelsen om Pappas första trägubbe;
     - skanningen av spöket;
     - röster;
     - vilka tjänster som får se bilderna (Claude, och Meshy om det används).
   - **Det de får:** ett löfte om att allt tas bort om de ber om det.
   - **Fråga också syskonen:** ”Vill du vara med i Elofs spel?”
   - **Föräldrarnas förnamn behövs inte.** I spelet heter de Mamma och Pappa, precis som Elof säger.
     Förnamn tillsammans med en liten ort kan leda en främling till familjen via upplysningssajter som Ratsit,
     Merinfo och Hitta. Därför publiceras föräldrarnas namn inte alls.
   - **Namnet på området** där huset står (det står i beställningen) används först efter ja.
   - **Huset:** en exakt kopia, eller tydligt likt men utan de mest unika detaljerna? Elof känner igen rött hus,
     vita knutar, glasveranda, altan och björk, men en främling ska inte kunna känna igen huset från vägen.
   - **Förval tills båda har svarat:**
     - barnens förnamn och Bredbyn som spelets miljö, eftersom de står i beställningen;
     - ortnamnet syns inte i själva spelet;
     - huset ”tydligt likt”;
     - inget nytt personligt material checkas in: inga spelmodeller av barnen, ingen skanning, inga röster.
   - **Aldrig:**
     - efternamn, husnummer, skola eller koordinater;
     - riktiga foton av familjen;
     - referensbladen med barnens porträtt;
     - adresser eller kontonamn.
   - **Om någon säger nej:** repot innehåller än så länge bara planeringsdokument och kan göras om från
     början. Säg till.
5. ★ **Överraskning och datum.** Är spelet en överraskning, och i så fall för vem (Elof, hela familjen)? Vilka
   datum gäller?
   - *Förval:*
     - en överraskning för Elof;
     - ofärdiga delar syns bara med `?dev` (§7.2);
     - **Utgåva 1** (prologen och kärnan i Kapitel 1) till jul 2026;
     - **version 1.0** (hela berättelsen, §7.4) under våren 2027.
     - Första advent går bara om Steg 0–1 går snabbt.
6. ★ **Nätverk för molnsessionerna.**
   - Sessionerna når npm, PyPI och GitHub. Sidorna med fria material och verktyg är däremot blockerade av
     miljöns nätverksinställning: Poly Haven, ambientCG, Quaternius, Hugging Face och Meshy.
   - Ska du öppna dem (§5.6 visar hur), eller laddar du ner det som behövs och lägger det i `art/vendor/`?
   - *Förval:* du öppnar polyhaven.com, dl.polyhaven.org, ambientcg.com, quaternius.com och huggingface.co innan
     Steg 0b.
7. 👪 **Det riktiga spöket.**
   - Spöket byggs först i kod, med platta täljytor (§5.6).
   - Kan någon senare fotografera det riktiga spöket runt om, 60–80 bilder? Då kan det bytas mot en 3D-skanning
     av Pappas träspöke, om skanningen blir finare.
   - Vilket trä är det (lind?), och hur högt är det? Har det täljda händer, eller sitter påsen direkt mot
     kroppen? På fotona syns inga händer.
   - *Förval:* kod först; en skanning bara med Pappas ja.
8. **Riktiga platser.**
   - Berget i spelet har **Storklocken** söder om Bredbyn som förebild: högsta kustlinjen och en tall som är
     omkring 400 år gammal (Appendix B). I spelet får platserna inga namn.
   - Är det familjens berg, eller ett annat? Ett av fotona visar en granithäll med utsikt nära Bredbyn. Är det
     den platsen?
   - Har familjen sett lavskrikor i skogen? Om inte, blir följeslagaren en ekorre.
   - Kan någon ta foton och spela in ljud vid platserna (bäcken, vinden i granarna)? Det ska vara utan
     människor och hus, och platsuppgifterna tas bort ur filerna (§5.6).
   - *Förval:*
     - Storklocken som förebild;
     - bakgrunder som byggs i koden eller målas med AI;
     - ljud som syntetiseras eller är CC0.
9. **Röster.** Ska replikerna läsas upp?
   - (a) Ingen röst, bara bilder och korta texter.
   - (b) Talsyntes (”Läs upp”), bara med rösterna som finns i själva enheten.
   - (c) Familjen spelar in sina egna repliker på Elofs platta, under en föräldrasida. Inspelningarna sparas
     bara där och laddas aldrig upp. Pappas replik på toppen blir extra fin så.
   - *Förval:* (b) på i Elofs profil; (c) som erbjudande.
10. **Testbarn.** Kan ett annat barn på 5–7 år prova spelet tio minuter vid två tillfällen (H2 och H3, §7.3)?
    Det får gärna vara någon som inte avslöjar något för Elof.
    - *Förval:* ja, om det finns någon.
11. **Godis.** Vilket godis tycker Elof, Moa, Bertil, Mamma och Pappa bäst om? Elofs favorit blir den gyllene
    godisbiten som gör honom stor igen, och de andras delas ut på godiskalaset.
12. **Namn.** Har spöket redan ett namn hemma? Annars: ska Elof själv få döpa spöket (och lavskrikan) i slutet?
    - *Förval:* ja. Han väljer bland fyra bildförslag, och en vuxen kan skriva ett eget namn.
13. **Märken.** Bertils keps har ett klubbmärke, och skorna har logotyper.
    - *Förval:* enkla allmänna former utan riktiga logotyper.
14. **Fler spelare.** Ska Moa och Bertil ha egna sparplatser?
    - *Förval:* ”Ny spelare” finns alltid.
15. 👪 **Ett betalt 3D-verktyg för karaktärerna.** Är det okej att köpa en månad av ett AI-verktyg som gör 3D av
    bilder, i första hand Meshy Pro (cirka 20 US-dollar)?
    - Bara med en betald plan äger man det som skapas.
    - Gratisnivåerna ger modeller under CC BY som verktyget äger, och kan visa dem publikt. Barnens porträtt får
      aldrig gå genom en gratisnivå.
    - Innan bladen laddas upp, kontrollera tre saker:
      - att tjänsten inte tränar på uppladdningar (eller att det går att stänga av);
      - att inget hamnar i ett publikt galleri;
      - att allt raderas när modellerna är nerladdade.
    - Verktyget testas först med en påhittad figur (§5.6).
    - *Förval:* ja. Elof byggs dessutom parallellt i kod (Route B), och det bästa vinner.

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
   - The deck steps become cliffs, and Pappa's wood shavings a mountain.
   - Bertil's cap becomes a boat, and Moa's paper plane an aircraft.
   - Unravel's co-founder put it this way: "When you get down on your knees and look at the world from another
     perspective, magic happens." The shrink makes that literal (§5.1).
2. **A mischievous thief who becomes a friend.**
   - At first the ghost flees and teases. Whenever a grown-up looks, it freezes into an ordinary wooden figure,
     a gag every child gets.
   - After Elof saves it from an eddy, it starts to wait for him and leave him gifts. "Varför väntar spöket på
     mig?" becomes the question that pulls him on.
3. **Candy everywhere.**
   - The trail is the way forward, and the bag visibly fills up.
   - Hidden candies become stickers.
   - Glittering magic candy makes him small, lights the mist, and at last makes him big again.
4. **Big moments:**
   - painting the ghost's eyes, and shrinking;
   - the paper-plane flight;
   - guiding a lost crane chick through the mist with a glowing lollipop;
   - flying with the cranes while the church bells ring in the Saturday evening;
   - the northern lights on the summit.
5. **The family helps like giants:**
   - Moa throws the paper plane;
   - Pappa carves a seesaw;
   - Bertil's cap carries Elof across the water;
   - Mamma lifts a fallen tree into a bridge, lets down her braid and leads the headlamps up the mountain.
   - Every moment is built from that person's traits on Olov's character sheets.
6. **An ending that turns the chase around.**
   - As a boy, Pappa gave his first carved trägubbe one candy every Saturday, until he lost it on the mountain.
   - The ghost carries that memory, and borrowed the bag to give the lonely trägubbe the party it has missed
     for thirty years.
   - Elof shares his candy. He puts one into the ghost's carved bag, which has always been empty. Then he eats his
     own golden favourite, and grows back.

### Design pillars

1. **Elofs egen värld.** His house, his family and his home nature come first. A recognisable detail beats
   generic fantasy.
2. **Liten men modig.** A small hero in a huge, beautiful, touchable nature, as in Unravel. Courage and kindness
   are what the player *does*.
3. **Förstå utan ord.** The ghost has no mouth. Every story beat must work without reading and without sound.
4. **Ingen kan misslyckas.** No lives, no fail states, no lost progress, nothing scary that chases you.

### What the player does (details in §4)

| Verb | Input | What it does |
| --- | --- | --- |
| **Springa** | Stick ← → | Walk, and run when the stick is pushed far ("Snabb" on his sheet). |
| **Hoppa** | Hoppa button | Jump. Ledges within reach are grabbed and climbed automatically. |
| **Klättra** | Stick against climbable things | Bark, roots, a hose, the candy lace, Mamma's braid. Any push except down climbs up. From above, a hose or lace slides him down. |
| **Kasta snöret** | Använd button near a red ring | The red candy lace (*godissnöret*, which fell out of the torn bag) hooks on by itself. The swing pumps itself, and letting go always lands where it should (§4.2). |
| **Knuffa, Dra, Vänd, Ge, Lyft** | Använd button | The button always shows the specific verb with an icon, and the icon also floats over the target. |
| **Ta!** | Använd button close to the ghost | A near-catch, once or twice per chapter. Elof lunges, the ghost squeaks free and drops a handful of candy. |
| **Ropa på …** | Använd button at a helper spot | Calls Moa, Pappa, Bertil or Mamma for their helper moment. |
| **Smaka** | Använd button | Only a lingonberry (sour face!), and on the summit Elof's own golden candy. |
| **Plocka godis** | Just touch it | The candy hops into the bag. |
| **Peka** | Tap anything | A candy jiggles, and Elof walks to it if it is near. The ghost peeks, animals look up. Tapping Elof makes him wave and shout a tiny "Hallå!". Never needed. |

**Magic candy, and how it reaches Elof:**
- The *krympstjärna* (prologue) falls out by accident. Elof only catches it; nothing found on the ground is ever
  eaten.
- The *lysklubba* (Kapitel 3) is a gift from the ghost. He holds it up as a lantern.
- The golden candy (the final) is Elof's own favourite from his own bag, eaten on Saturday evening, when
  Saturday sweets are allowed.
- Version 1.1 adds a *bubbelgodis*, also a gift.

### Scope

| Version | Content | Length for a six-year-old |
| --- | --- | --- |
| **Utgåva 1** | Prologue and Kapitel 1 (Gården) | 15–20 min |
| **Version 1.0** | Prologue; Gården; Granskogen, including the brook's calm edge; Myren; Berget; the final; the epilogue. The whole story. | 55–65 min |
| **Version 1.1** | *Forsen*, a cap-boat rapids chapter with the beaver, between Granskogen and Myren; the bubble candy; the bark sled; a full 3D crane flight; more duo puzzles and candy kinds | +15 min |

Each release must be a complete, lovable game on its own (§7).

Not included: combat or enemies, lives, timers you can lose to, precision platforming, anything that requires
reading, online features, accounts, ads, purchases, analytics or tracking, or live AI.

### The first minutes, as Elof should experience them

| Time | Experience | What it proves |
| --- | --- | --- |
| 0:00–2:30 | The kitchen table on a Saturday morning, close up. Pappa's hands give Elof the brush; he paints the ghost's two eyes. *Pling* — it blinks, tilts its head, grabs the giant candy bag and wobbles off. An animated hand shows the stick. Elof chases it across the veranda; the bag tears, candy trickles out. He catches a glittering star: POFF. Pappa sees tiny Elof, picks up the frozen ghost and puts it on the railing, and it sneaks off behind his back. "Följ godisspåret, Elof. Vi är nära dig hela tiden." Title. | The hook, the likeness, the magic, the Toy Story gag. Works without reading or sound. |
| 2:30–5:00 | Tiny Elof on the deck. The steps are cliffs, and a lifted board leaves a chasm; arcs of candy show each jump. The ghost does a teasing little dance on the far side. He flips over a ladybird lying on its back, and it shows him the hose down. | Game feel, the wonder of scale, kindness |
| 5:00–8:00 | Under the deck: stripes of sunlight, Bertil's lost marble, the red candy lace on a nail. The first swing goes over flat ground, the second over the drain. The ghost trips on a dandelion: *Ta!* — it squeaks free and drops five candies. | Beauty, the core tool, a near-catch |
| 8:00–12:00 | The lawn jungle: dew drops that ring like bells, the birch roots, Pappa's mountain of shavings, and the first memory. | Exploration, toys, the seed of the mystery |
| 12:00–15:00 | Moa's dress and fingers, then her face: "Lillebror?! Du är ju pytteliten!" Her hand swoops at the ghost, which darts into a root hole her fingers can't enter. She climbs onto the railing and throws a paper plane; Elof flies to the forest edge. | A family role, a laugh that teaches a rule, a spectacle |

A six-year-old will take longer than the design minutes. Expect the Prologue and Kapitel 1 to take him 15–20
minutes, and re-time it with a real child (§7.3).

---

## 2. Characters and places: fidelity contract

**Sources:**
- Olov's character sheets: Moa, Bertil and Lillebror; the family sheet; the player sheet; the poster.
- The ghost render, and two photos of the real carved ghost (front and side).
- Photos of the house in summer, at the deck, and in the first snow.
- Family photos.

**None of these images are committed** (§2.6). Sessions that need them ask Olov to attach them, with account
names, surnames and house numbers cropped off first.

**When sources disagree:** the sheets decide the *style* (Elof's spiky fringe, Pappa's cap on the family
sheet), and the photos decide the *facts* (the real ghost, clothes and colours). Brand logos are never
reproduced.

### 2.1 Elof (the player)

| Feature | Requirement |
| --- | --- |
| Age and build | A six-to-seven-year-old with a child's proportions: big head, short legs. Never a mini-adult. |
| Hair | Short, tousled, golden blond, with a spiky fringe pointing up and forward |
| Face | Blue eyes, rosy cheeks, a few freckles, a curious closed-mouth smile at rest |
| Shirt | Light-blue pin-striped shirt with a band collar, a few buttons and two chest pockets. Sleeves rolled to the elbows. |
| Trousers and shoes | Dark-blue jeans, rolled at the ankle. Brown leather boots with laces. |
| Backpack | A small olive-brown canvas backpack, from the player sheet. The candy he collects "goes into it". |
| Traits (from his sheet) | Nyfiken, Upptäckarglad, Smart, Snäll, Snabb. His siblings call him *lillebror*, as his sheet does. |

- **Expressions:** neutral, happy, excited and curious are on his sheet. The game adds determined (the angry
  stomp), surprised, sour (a lingonberry), sad and sleepy.
- **Animations:** idle (looks around), walk, run, jump, fall, soft landing, ledge clamber, climb, slide down,
  push, pull, swing, throw the lace, lunge (*Ta!*), crouch-peek, taste, give, wave, celebrate, stomp, sit and
  think, paint, hold a lantern, ride (plane, cap, crane), and shrink and grow.
  - The CC0 animation library covers about half of these (§5.6). The rest are made by procedural layers on top
    (arms raised for the lantern, a crouch for riding) or as short clips. They are priced in §7.6.

### 2.2 The ghost (canon: the real carving; the render is secondary)

| Feature | Requirement |
| --- | --- |
| Size | About 15 cm (to confirm, §0 Q7). Exactly Elof's height once he has shrunk. |
| Material | Pale, unpainted wood, probably lime (lind). Carved in broad flat knife facets (flat-plane carving), never smooth, never white plastic. |
| Shape | A sheet with a hood: a rounded, slightly pointed top, a long body and a folded hem with a split at the back. Seen from the side it is deep and leans slightly forward. |
| Eyes | Two round, glossy black painted eyes, each with one white highlight dot. **No mouth, ever.** It is the theme (§3.6). |
| The carved bag | A paper bag with a folded top, wood-coloured, with painted dots in red, green and orange. It sits against the body. **It is part of the ghost, and it has always been empty.** |
| Hands | The photos show no separate carved hands; those appear only in the AI render. Confirm with Pappa (§0 Q7). Until then the ghost uses the folds of its sheet as arms, and hooks things with the bag's folded top. |
| Socks and shoes | Rainbow-striped socks (blue, green, yellow, red, orange). Red high-top canvas sneakers with white toe caps, soles and laces, and a small dark-blue star on the ankle disc (generic, not a brand). |
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
- **Whole figures** appear only in the prologue, on the summit and in the epilogue, in held poses with small
  movements.
- **Their calls** are "Heja Elof!" and "Heja lillebror!", and they wave back when he waves. They never sound
  like a search party.

| Who | Look (from the sheets and photos) | Traits on the sheet | Their moments |
| --- | --- | --- | --- |
| **Mamma** | Long brown braid over the shoulder. Black tank top, olive cargo trousers, brown hiking boots, a small backpack. Often holds a white mug with a red heart. | Varm, Snäll, Stark, Kreativ, Äventyrlig, Bästa mamma | **Kapitel 3 (Myren):** lifts a fallen dead pine over a pool as a bridge (Stark), lets her braid down to the boardwalk (Kreativ), warm cocoa (Varm). **The final:** leads the four headlamps up the mountain (Äventyrlig). |
| **Pappa** | Black cap, rectangular glasses, short stubble. Black T-shirt, light denim shorts, hiking boots, an olive backpack. A red-handled carving knife and a piece of wood. | Trygg, Snäll, Äventyrlig, Fixar allt, Bästa pappa | **Prologue:** carves the ghost, and sees Elof shrink: "Följ godisspåret, Elof. Vi är nära dig hela tiden." **Kapitel 2:** carves a seesaw (*gungbräda*). **The final:** recognises his first trägubbe. |
| **Moa** (big sister) | Long wavy blond hair. Light denim jacket, pale-yellow tiered dress with eyelet lace, white sneakers, a dark-red backpack. | Snäll, Modig, Äventyrlig, Kreativ, Storasyster | **Kapitel 1:** finds tiny Elof, climbs onto the railing and throws her paper plane. **The summit:** wraps her denim jacket around him. Her crayon drawing style is the game's map. |
| **Bertil** (big brother) | Red-and-white trucker cap with a plain badge instead of the club crest. White short-sleeved shirt, charcoal jeans, white sneakers with red details, freckles. | Kreativ, Sportig, Busig, Snäll, Storebror | **Kapitel 2:** his cap carries Elof across the forest pool while he cheers from the bank. Version 1.1 adds the rapids. **The summit:** puts the cap on Elof's head. |

### 2.4 Pappa as a boy (memories only)

Pappa as a boy appears only in the memories (§3.3, rule 5). A six-year-old easily mistakes a flashback boy for
himself, so four rules make it clear who he is:
1. Every memory grows out of the ghost's picture bubble, and shrinks back into it.
2. Memory 1 opens on today's Pappa's hands carving, then dissolves to a boy's hands on the same red-handled knife.
3. The boy always wears a small black cap like Pappa's.
4. Each memory is shown in a warm sepia look with film grain (§5.4), so it never reads as "now".

He reuses Elof's rig with other hair, clothes and the cap. Until Pappa has said yes (§0 Q3), memories show only
his hands and the carving, never a face.

### 2.5 The red house (from Olov's photos)

The house is described here only at the level a stranger could not use to find it (§0 Q4).

- **The public description:** a falu-red, two-storey wooden house with white trim, a glazed veranda, a
  wooden deck with railings and steps, a big birch in the yard, and spruce forest behind.
- **The exact details** (ornaments, door, roof, outbuildings) come from Olov's photos in the session that builds
  the house, and are matched to the answer to §0 Q4: an exact copy, or clearly alike without the most unique
  features.
- **Never** a house number, a street sign or the view from the road. The house is built in code (§5.6), so
  nothing is traced from the photos.
- **The prologue's set** is the kitchen table the ghost was photographed on: a strongly grained oak top and
  white chairs.

### 2.6 Credit and privacy

**Names and places:**
- The children by first name; the parents only as Mamma and Pappa (§0 Q4).
- Never surnames, the house number, the school, coordinates, or account names.
- In the game, the village, the church and the rivers are not named, and in the crane flight the red house is
  not at its true position.

**Pictures and models:**
- Real photos and the AI sheets never enter the repository. Sessions get them as attachments, and working copies
  live only in the session scratchpad.
- **The family's game models, textures and likeness renders live in a separate private repository**, which the
  deploy workflow fetches with a secret (§6.11). Withdrawing them then takes one redeploy, and they never enter
  the public history.
- Contact sheets in pull requests use a stand-in figure for the family. Likeness renders reach Olov through the
  session, never through git.
- Faces are sticker meshes drawn as game art (§5.6), never textures taken from a photo.

**Voices** (§0 Q9):
- No recording of a real family voice is ever published.
- Family members may record lines on Elof's own tablet, on a parents' page. They are stored there and never
  uploaded.
- *Läs upp* uses only voices that run on the device (`localService`).

**The site:**
- `noindex, nofollow, noimageindex` on every page, no social-preview tags, and no link to the site from the
  README.
- No analytics, cookies or third-party requests; fonts and libraries are self-hosted.
- The album's pictures are game renders stored on the device only. There is no camera and no upload, and the
  album is cleared with the player profile.

**Other people's services:** before the sheets go to an image-to-3D service, check its training, gallery and
deletion terms (§0 Q15) and note them in `LICENSES.md`.

**An option for later** (STRETCH): the most personal content (the area name, an exact house, recorded voices
shipped with the game) can be built into an encrypted *familjepaket*. The key lives in an Actions secret, and
a parent unlocks it once on the tablet with a family word.

**Enforced in CI** (§6.12): a metadata check on every image and model, and a denylist check whose list is
stored as a secret.

**Credits** (the wording is Olov's to change): "Spöket är täljt av Pappa. Spelet är gjort till Elof av Olov – med
hjälp av Claude."

---

## 3. Story

### 3.1 Premise, in words a six-year-old can repeat

At the start: "Spöket tog mitt godis! Jag följer godisspåret och tar tillbaka det."

From Kapitel 2 on: "Varför tog spöket godiset – och varför väntar det på mig?"

### 3.2 Cast

- **Elof**, the player.
  - Arc: he starts out cross ("Ge tillbaka mitt godis!"), becomes curious, then begins to understand. In the end
    he decides himself who gets his candy.
  - His want is small and concrete: his bag of Saturday sweets.
- **Spöket**, Pappa's newest carving, which comes alive when Elof paints its eyes.
  - At first mischievous and a little scared. Kind underneath.
  - It cannot speak; it shows.
  - Elof names it at the end (§0 Q12).
- **Pappa, Mamma, Moa and Bertil**, giants who stay close (§2.3). Pappa sees Elof shrink and trusts him to
  follow the trail; the others hear about it and come along.
- **Lavskrikan**, a Siberian jay: grey-brown with a rusty tail.
  - Lavskrikor are famous in Norrland for being curious and following walkers for food (Appendix B, marked
    general knowledge; §0 Q8 asks whether the family has seen them).
  - It tries to pinch Elof's candy. He gives it a lingonberry instead (no candy for wild animals), and it becomes
    his hint companion from Kapitel 2 (§4.6).
- **Animal friends** (§4.4): a ladybird, ants, a dipper, a crane family. A beaver in Version 1.1.
- **Den första trägubben**, the first figure Pappa carved as a boy.
  - A small, crude figure: a round head, a pointed cap and a carved smile. It has sat grey and mossy for thirty
    years in a crack beside the old pine on the summit.
  - It *has* a mouth: the visual opposite of the ghost.

### 3.3 World rules (set up early so the ending is fair)

1. **Spöket fick liv av Pappas händer och Elofs ögon.** Pappa carved it, and Elof painted its eyes. Only
   something carved by Pappa and seen by Elof can come alive. This is why the ghost carries Pappa's memories,
   why it turns to Elof, and why the old trägubbe blinks once at the end.
2. **När en vuxen tittar stelnar spöket** into an ordinary wooden figure: the Toy Story rule.
   - Only tiny Elof sees it move, so only he can follow it.
   - Giants can't catch what they only ever see as a carving.
   - The rule is taught as a joke twice: in the prologue (Pappa) and in Kapitel 1 (Moa's grab).
3. **Glittrande godis är trollgodis.**
   - When the ghost grabbed the bag, two candies started to glitter. A star fell out on the steps: touching it
     makes you small. Elof's golden favourite stayed in the bag, and it glints there all game: eating it makes
     you big again.
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

The day runs from morning to night through one Saturday in late September (*brittsommar*). In Bredbyn on 26
September 2026 the sun rises at 06:38 and sets at 18:38, and at noon it stands only about 26° high, so the light
is low and long all day (Appendix A). Version 1.1 additions are marked **[1.1]**.

**Prolog: Lördagsmorgon (normal scale, table-top; about 2–3 min)**
1. **The kitchen table, 09:00,** close up.
   - The oak table in the morning sun. Pappa's hands blow the last shavings off his new ghost. Elof's giant
     Saturday-sweets bag stands beside it.
   - Mamma's voice: "Den får du öppna ikväll."
   - Bertil's hand sneaks towards the bag; Elof pulls it back.
2. **"Måla ögonen!"** (P0). Pappa's hand gives Elof the brush, and Elof taps or traces two eye spots. A stroke
   that is too short is finished for him; there is no wrong way. Pappa goes to answer Mamma's call.
3. **The blink.** *Pling* — the ghost blinks and tilts its head, a comic beat rather than a stare. It looks at
   the bag. It grabs it, busily, wobbles under its weight, and hops off the table.
   - When Mamma passes the door, it freezes mid-hop and topples over flat. Once she has gone, it scrambles up and
     runs (the first freeze joke).
4. **The chase** at normal scale, as a wordless tutorial:
   - an animated hand shows the resting stick (40% opacity, bottom left) until Elof has moved 3 EL;
   - then a hand on Hoppa at the veranda door sill.
   - The bag tears on the door hinge, and candy trickles out behind the ghost without it noticing.
5. **The star.** A glittering star rolls out onto the deck steps. The Använd button shows a hand: *Ta*.
   *POFF* — Elof shrinks, and the camera drops with him to the planks.
6. **Pappa** steps out in time to see tiny Elof on the step. The ghost freezes as he looks.
   - He picks it up, puzzled, and puts it on the railing. While he turns to Elof, it sneaks off behind his back.
   - Elof points; Pappa sees an empty railing.
   - Pappa, kneeling: "Följ godisspåret, Elof. Vi är nära dig hela tiden."
   - Title card: **Elof och det stora godisäventyret**.

**Kapitel 1: Gården (10:00, dew and sun)**
- **The deck.** The steps are cliffs, and a board Pappa has lifted for repair leaves a chasm (P1). On the far
  side the ghost does a teasing little dance, then runs.
- **The ladybird** (P2). A ladybird lies on its back. Elof flips it with a grass-stem lever, and it flies to a
  garden hose hanging over the edge. Grabbing the hose from above slides him down.
- **Under the deck.** Stripes of sunlight fall through the planks. Lost things lie about: Bertil's marble, Moa's
  hair clip, a toy brick (O2).
- **The candy lace** (P3). The red candy lace, which fell from the torn bag, hangs from a nail. The first swing
  goes over flat ground, where nothing can go wrong; the second crosses the drain gully, with a ramp of candy
  leading out.
- **The ghost as helper.** When Elof is stuck for 40 s, the ghost hops back into view, stares at the answer and
  double-knocks (§4.6). Its first bubble is only a smudge. Why does it help?
- **Near-catch.** The ghost trips on a dandelion. *Ta!* Elof lunges into the grass; it squeaks free and drops five
  candies.
- **The lawn jungle.** Tall grass, dew drops that ring when bumped (O1), the birch's roots like a mountain
  range, and a big boulder.
- **Pappa's shavings mountain** (P4), by the chopping block. Shaving curls are ramps and tunnels; Elof pulls a
  curl into a ramp. At the top lies the first glowing *minnesspån*.
  - **Memory 1:** today's Pappa's hands carving dissolve to a boy's hands on the same red-handled knife, carving a
    little trägubbe. On a Saturday the boy puts one candy in its lap.
- **The angry stomp.** The ghost waits on a birch root and juggles a candy. Elof stomps: "Ge tillbaka mitt
  godis!" It hops away.
- **Moa** (S1).
  - Her dress and fingers appear first, then her face, softly out of focus: "Lillebror?! Du är ju pytteliten!"
  - Her hand swoops at the ghost, which darts into a root hole her fingers can't enter. A laugh, and the rule.
  - "Ropa på Moa": she folds a paper plane from her drawing, climbs onto the deck railing (Modig) and throws it
    as far as she can. Elof flies to the forest edge, steering up and down through arcs of candy.
- **End.** Elof lands in the moss at the forest edge, and the ghost slips in under the spruces.
  - End card: **Kapitel 1 klart!**, with the candy shown in rows of ten he can count, and new stickers.
  - Moa's map gets its first drawn part.

**Kapitel 2: Granskogen (11:30 to 14:00, cathedral light and the brook)**
- **The forest.** Spruce trunks like pillars, shafts of light, moss carpets, lingonberries (taste one: sour
  face, O10), cones as big as cars, and beard lichen hanging like curtains.
- **Lavskrikan** (P6). A jay swoops in to pinch a candy. Elof gives it a lingonberry instead (*Ge*), and it
  becomes his friend and companion.
- **The ant road** (P5). A fallen twig blocks the ants' road. Elof pulls it away with the lace, and the ants
  carry him up their anthill on a *myrhiss* (ant lift).
- **The vittra door** (O3, in V1.0 as a story beat). From a distance, Elof sees the ghost put one of his candies
  by a tiny door under a spruce root, for the polite underground neighbours of Norrland folk belief. "Spöket ger
  bort mitt godis!?" The ghost's bubble shows a shape now: a small figure.
- **Pappas gungbräda** (P8). A ravine between two roots is too wide to cross.
  - "Ropa på Pappa": his hands carve a little seesaw from a dry stick in a few seconds and set it on a stone.
  - Elof stands on one end; Pappa's hand drops a cone on the other, and Elof is launched across.
- **Near-catch** on a fallen log: *Ta!*
- **Memory 2:** the boy, in his small cap, walks in the forest with the trägubbe in his pocket, and sets it on a
  stump with a Saturday candy.
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

**[1.1] Forsen (13:30, glittering).** Bertil's cap carries Elof down the rapids, steering left and right. The
cap stops at a beaver dam, where a beaver can't reach the stick it needs. Elof pulls the stick within reach with
the lace, and the beaver lifts the cap over the dam. Also here: a dipper, water striders to hop on (O6), and
Näckens fiol (O5).

**Kapitel 3: Myren (16:30 to 18:00, mist)**
- **The bog.**
  - Tussocks (*tuvor*) are the path. They dip to his ankles and bounce back (P11).
  - Open wet moss and pools are refused: Elof stops at the edge and points to the next tussock.
  - Red and green sphagnum, dwarf birch in autumn red, orange cloudberry leaves, and cranberries that bounce
    (O7). Cotton-grass has finished by late September, so it is left out.
  - Dark pools mirror the sky; grey dead pines (*torrakor*) stand about. The ridges and pools of a string bog.
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
- **Tranungen** (P14). A young crane has lost its family in the mist.
  - Its family's calls show as soft rings rising out of the mist, and the chick turns towards them, so it works
    without sound.
  - Elof leads it with his light until they find each other. Someone small and lost is brought home.
- **The ghost waits** on a tussock and lets Elof come close. Its bubble is clear now: a mountain with an old pine,
  and something small and grey beside it.
- **Memory 3:** the boy and his family walk a bog boardwalk at dusk, towards a mountain.
- **Tranornas dans** (S4). The cranes dance in the mist, and one kneels. Elof climbs on, and the jay flies off
  towards the boardwalk.

**Kapitel 4: Berget (18:00 to sunset at 18:38)**
- **Tranflygningen** (S5): Nils Holgersson's ride, for Elof.
  - In V1.0 it is built from layered parallax plates (§5.6). [1.1]: a full 3D landscape.
  - Below them: the forest, the brook glittering, the bog, a river and a lake. A church bell tower rings in the
    Saturday evening at 18:00 (*helgsmålsringning*, unnamed).
  - A red house shows below, though not at its true position. Four tiny headlamps cross the bog, the jay flying
    ahead of them.
  - Elof steers up and down through arcs of candy; nothing can fail.
- **Landing on the mountain's shoulder** in golden hour. Granite slabs, reindeer lichen like snow-white shrubs,
  crowberry, crooked pines and an erratic boulder.
- **Strandstenarna** (O8). Round beach cobbles lie high on the mountain, because the sea once reached up here.
  Each cobble rings a note.
- **The ghost is stuck** below the last cliff, with the bag too heavy to lift.
  - Elof could take the bag now. The ghost doesn't run; it points up. Its bubble shows the lonely trägubbe.
  - The Använd button shows *Lyft*. Elof chooses to help.
- **Två är starkare än en** (P15). In V1.0, one duo puzzle in the spirit of Unravel Two: Elof boosts the ghost
  up a ledge, and it lowers the lace back to him. The partner always does its part, with no timing. [1.1]: two
  more.
- **The old pine** at sunset.
  - **Memory 4:** the trägubbe slips from the boy's hand into a crack. He searches, sad, and his father comforts
    him (a silhouette unless Pappa says otherwise, §0 Q3).
  - Elof: "Spöket vill hämta hem Pappas trägubbe!"

**Final: Norrsken (blue hour into night; about 6 min, with a tap at least every 30 s)**
1. **The crack** (P16). Elof lowers the lace; the ghost climbs down and hooks the trägubbe with its bag's folded
   top. They pull together, and out it comes: grey, mossy and smiling.
2. **The party it wanted.** The ghost sets the trägubbe by the pine, facing the view, and puts a candy in its
   lap: the Saturday candy it has missed for thirty years.
3. **The bag comes back.** The ghost gives Elof the bag: it was only borrowed.
4. **Dela godiset** (P17), a real choice. Elof taps a candy, then a friend, and decides himself who gets what:
   - the trägubbe;
   - the ghost: the candy goes into its carved bag, which has always been empty;
   - the jay gets a lingonberry from his pocket.
   - The bag still bulges afterwards; sharing is not losing.
5. **The golden candy** glints. It is Saturday evening, when Saturday sweets are allowed.
   - *Smaka* → *POFF* — Elof grows back, mirroring the prologue, with both carvings at his feet.
   - The northern lights flare. In their light the old trägubbe blinks, once (rule 1).
6. **Headlamps.** Mamma leads the family up the path; the jay found them.
   - Pappa sees what Elof holds, and goes quiet: "Min allra första trägubbe … Den tappade jag här uppe när jag
     var lika liten som du." This is the line Pappa may record himself (§0 Q9).
   - Moa wraps her denim jacket around Elof, and Bertil puts his cap on Elof's head.
   - Hugs under the northern lights.
7. **Home.** A short, calm walk down through the night forest with Elof on Pappa's shoulders, holding both
   carvings. It is playable and can't fail.

**Epilog: Godiskalaset (21:00, the glazed veranda; about 3 min)**
- Candles, and a normal Saturday portion in each bowl. The two carvings stand side by side on the windowsill.
- **Elof hands out candy** (P18). Tap each person to give their favourite (§0 Q11), and put one more in the
  ghost's bag.
- **The naming** (§0 Q12).
- **Teeth.** Everyone brushes their teeth – except the ghost, which has no mouth.
- **The album as credits,** which Elof can tap through (§6.10).
- **Last card:** "Spöket kunde inte säga det med ord. Men Elof förstod." Then **Utforska vidare** opens every
  chapter for free play, to find the remaining candy and stickers.

### 3.5 Why the ghost did it (told only in pictures until the summit)

The ghost came alive through Pappa's hands and Elof's eyes, so it carries a little of both, including Pappa's
memory of his first trägubbe. As a boy, Pappa gave that trägubbe one candy every Saturday, until he lost it on
the mountain.
- **The theft.** When the new ghost saw Elof's Saturday bag, it grabbed it, mischievous and clumsy, meaning to
  give the lonely trägubbe the party it had missed for thirty years.
- **The accidents.** The tear in the bag, the trail and the star that shrank Elof were all accidents.
- **The turn.** When it saw Elof following, and above all after he saved it from the eddy, it understood that he
  could help. It began to wait and leave him gifts.
- **Why it couldn't ask.** It has no mouth, and at first even its picture bubbles were only smudges.

Every one of these facts is visible in play before the summit:
- the boy's Saturday candy for the trägubbe (memories 1–2);
- the ghost giving candy away (the vittra door);
- the tear on the door (the prologue);
- the waiting after the rescue;
- the bubbles growing clearer.

The playtest checklist (§7.3) asks a fresh player to retell the story afterwards, to check that the pictures
carry it.

If §0 Q3 ends in (b) or (c), only the memories, the summit reveal and Pappa's line change. The memories are built
last in each chapter, so a late answer costs little.

### 3.6 The theme, in one image

**The ghost has no mouth.** Elof learns to understand someone who cannot say it in words:
- a ladybird on its back;
- ants with a blocked road;
- a lost crane chick;
- a frightened ghost in an eddy;
- and in the end his own father as a little boy.

The ghost's bubbles sharpen as he learns. The game itself is wordless for the same reason. The candy trail began
as an accident and became the ghost's way of saying "följ med".

The ending's line, which the player has already understood: "Spöket kunde inte säga det med ord. Men Elof
förstod."

### 3.7 Tone and words

- **Tone map:**
  - Prolog and Gården: playful and comic, with the freeze jokes and the near-catches.
  - Granskogen: wonder, a little mysterious, always safe.
  - The brook: sparkling.
  - Myren: mysterious, made safe by Mamma's lamp and the lollipop.
  - Berget: grand and tender.
  - The final: moving and magical.
- **Wordless first.** Every beat works with text and sound off, through:
  - poses and faces;
  - picture bubbles and the memories;
  - icons on buttons;
  - the candy trail.
- **Words for those who want them:**
  - at most about 60 short captions in the whole game, each at most about 40 characters, never required;
  - every caption can be read aloud (*Läs upp*), and Elof's profile starts with that on (§4.1);
  - key lines can be recorded by the family on the tablet (§0 Q9).
- **Never scary:**
  - no villains, and nothing that chases Elof;
  - no darkness without a warm light nearby;
  - no spiders or wasps as threats;
  - giants appear gently (§2.3);
  - the ghost teases, but never laughs *at* him.
- **Healthy, without preaching:**
  - candy is collected, not eaten, until Saturday evening;
  - animals get lingonberries, not candy;
  - nothing found on the ground is eaten;
  - candy is never placed next to mushrooms;
  - on the bog we walk on tussocks and boardwalks;
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

### 4.1 Controls

| Action | Touch (phone, tablet) | Keyboard | Gamepad (standard mapping) |
| --- | --- | --- | --- |
| Move | Floating stick: appears where the left thumb lands. Horizontal on the ground; vertical while climbing or swinging. | ← → / A D (Shift walks). ↑ ↓ / W S climb. | Left stick or D-pad |
| Hoppa | Large round button, lower right, **96 CSS px** | Space, or ↑ / W when not on something climbable | A |
| Använd (shows the specific verb and its icon; the icon also floats over the target) | Round button above Hoppa, **84 px**. Dimmed when nothing is near. | E or Enter | X |
| Ropa på hjälparen (§4.6) | The helper's portrait, top right: the ghost in Kapitel 1, the jay from Kapitel 2. A tap on the helper works too. | H | Y |
| Godispåsen and paus | Top corners, 64 px | G for Godispåsen; Esc or P to pause | View / Start |
| Peka | Tap anything in the world (§1) | — | — |

All touch sizes are ×1.15 on tablets.

- **Reused from Sköldhästen** (`skoldhast/src/input.mjs`, ported to TypeScript):
  - pointer capture per touch;
  - every held input released on cancel, blur or pause;
  - a press queue, so no press is lost at any frame rate;
  - movement keys by position (`KeyW`), the newest of two opposite directions wins;
  - the on-screen controls follow the device in use, not the kind of computer;
  - gamepad focus navigation in menus;
  - its quick-tap test (under 350 ms and 14 px), extended from the hero to everything in the world.
- **A wordless tutorial,** one prompt at a time, in the prologue chase. An animated hand shows:
  1. the resting stick at 40% opacity until Elof has moved 3 EL;
  2. then Hoppa at the first door sill;
  3. then Använd at the star.
- **Never needed:** a double tap, timing, mashing, holding, or two inputs at once.
- **Every touch target** is at least 64 CSS px, with at least 12 px between targets. Both action buttons sit
  inside the bottom-right safe area.
- **Orientation.**
  - Landscape is the main layout: the side view needs width.
  - Portrait stays fully playable. The world view uses the top ~65%, the controls sit in a band below, and the
    camera zooms out.
  - The title shows a picture of the device turning, and "Vänd skärmen på bredden!"
- **A profile that doesn't read yet** (Elof's default) starts with:
  - *Läs upp* on;
  - *Ljud även i tyst läge* on (iOS);
  - *Lätta hopp* on;
  - help set to *Påminn mig*.
  Parents can change all of it.
- **Settings** (most from Sköldhästen):
  - *Lätta hopp*: running towards a marked jump edge jumps automatically, and the jump is steered towards its
    landing.
  - *Följ fingret*: Elof walks towards a held finger.
  - *Vänsterhänt*: the controls swap sides.
  - *Lugnare tempo*: the whole game runs at 80%. This is Unravel Two's speed assist.
  - *Större text*, *Mindre rörelse* and *Läs upp* (§6.8).
  - Volume for *Musik*, *Ljud* and *Röster*.
  - Help level (§4.6) and graphics level (*Auto / Låg / Mellan / Hög*, §6.5).
  - *Tangenter och handkontroll*, the key reference.
  - *Föräldrar*: the voice recordings (§0 Q9), behind a simple grown-up check.

### 4.2 Movement rules (starting values; EL = one Elof length, his current height)

The simulation always measures in EL, at both scales, so the same numbers work in the prologue and in the
macro world.

- **Run.** Walk at 1.2 EL/s; run at 3.5 EL/s after 0.3 s of full stick. Stops within 0.15 s: snappy, because
  children notice slow controls immediately.
- **Hoppa.**
  - A fixed-height jump: the apex is 1.1 EL, and a running jump reaches 2.2 EL. Holding the button changes
    nothing.
  - **Coyote time 0.2 s and a jump buffer of 0.3 s**, generous for small hands.
  - Ledges whose top is within 1.4 EL are grabbed and climbed automatically (0.4 s).
- **Terrain.**
  - Steps up to 0.3 EL are walked over; slopes up to 45° are walkable. Steeper ground slides him down gently.
  - Drops of up to 4 EL end in a soft landing: a puff of moss and a roll.
  - **Higher drops are refused:** Elof stops at the edge and looks down. That is why the hose and the lace matter.
- **Climbing.** 1 EL/s on surfaces tagged climbable, attaching automatically when he walks into them.
  - While he is attached, any push except down climbs up, because children hold "forward".
  - Grabbing a hose or the lace from above slides him down in 1 s.
  - Hoppa jumps off.
- **Godissnöret.**
  - A red ring marks every hook. Within 4 EL the Använd button reads *Kasta snöret*, and the lace flies and hooks
    on by itself: no aiming.
  - **The swing pumps itself** to full height in about 2 s.
  - Hoppa at any moment is held, for up to 1 s, until the next forward apex. The release always lands on the
    authored ledge, so there is no timing.
  - ↑ ↓ climb the lace.
  - At a pull ring (*Dra*), the lace pulls an object along its rail.
  - At a pair of rings, it ties a bridge, which is also a trampoline (Unravel's trick).
- **Objects move on rails, not as free rigid bodies.**
  - Cones, chips, berries and sticks move along short authored paths with springy, juicy motion. They can never
    end up somewhere unsolvable. This is Sköldhästen's "one notch along a short rail", built in §6.4.
  - Free physics is cosmetic only: wobble, bounce, rope sag.
- **Water and bog.**
  - Tiny Elof doesn't swim. At a water's edge, or at open wet moss, he stops and looks for another way: a stone, a
    tussock, a leaf, the cap. This is the plan's "refuse instead of fail", and it matches what children should do
    by real water.
  - If a ride ever tips him in, a big hand (Bertil's at the brook) lifts him straight out.
- **Riding** (the paper plane, the cap, the crane): the stick steers within an authored corridor, and nothing in
  the corridor can stop the ride.
- **The ghost's distance.**
  - In the prologue and Kapitel 1 it keeps 4–8 EL ahead, and waits, comically, when Elof explores.
  - Once or twice per chapter it comes within 1.5 EL, and the Använd button offers *Ta!*.
  - After the eddy rescue it waits openly.

### 4.3 Candy

- **Trail candy.**
  - On the main path there is a candy every 1.5–3 EL, and each next candy is visible from the one before.
  - A jump is announced by an arc of candy over the gap; a climb, by candy up the wall.
  - About 60–80 per chapter. Touching one collects it, and a magnet radius of 0.6 EL forgives near misses.
  - It is collected into the bag, never eaten.
- **Big candy** is a checkpoint (§3.3, rule 4). There is at least one every 90 seconds of play.
- **Hidden candy for the album.**
  - Four per chapter, each a new kind, placed off the path: behind leaves, under roots, at the end of an
    optional swing.
  - When one is found, its sticker slaps onto the bag in the corner straight away.
  - Sixteen kinds in Version 1.0 and twenty once Forsen arrives in 1.1, plus Elof's favourite as the golden
    final piece (§0 Q11).
- **Magic candy:** three in Version 1.0 (§1). They glitter, and they never lie in nature waiting to be eaten.
- **HUD.** A small paper candy bag, top left, that visibly fills. Chapter cards show the candy in rows of ten that
  a six-year-old can count, so a number is never needed.
- **Never lost.** No candy is ever taken away. The party in the epilogue serves a normal Saturday portion; the
  collection lives on as stickers and rows.
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
| Final | Everyone | Mamma leads the headlamps; Pappa recognises the trägubbe; Moa's jacket, Bertil's cap | The jay fetches the family; it and the cranes come to the party |
| [1.1] Forsen | Bertil | The rapids | Beaver: stick fetched → lifts the cap over the dam |

### 4.5 Kindness rules (Sköldhästen §4.3, adapted)

- There are no lives, damage, timers you can lose to, pits, drowning or lost progress.
- **The chase can't be lost.** The ghost keeps its distance at Elof's pace and waits, comically, when he dawdles
  or explores (§4.2).
- **Refuse instead of fail.** Too far to jump, too high to drop, too wet to step on: Elof stops and looks, and
  the candy or a glance shows the way. A refusal always shows *why*, through a pose.
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
- The ending never depends on hidden candy, optional delights or settings.

### 4.6 Hints

- **Level 0: the world itself is readable.**
  - the candy trail and the candy arcs;
  - red rings on hooks;
  - a soft glint on anything the Använd button can act on, with the verb's icon floating over it;
  - helper spots marked with a family portrait.
- **The helper** has no dialogue and no words.
  - In Kapitel 1 the helper is the ghost itself: a clue to its secret. From Kapitel 2 it is the jay.
  - Each tap on the helper's portrait, or on the helper, goes one step further:
    1. it flies or hops to the right area and looks at it;
    2. it pecks or double-knocks the object, and the right icon pulses on the Använd button;
    3. a short replay shows a dotted silhouette of Elof doing the action. This is the "super guide" idea, for a
       player who can't read.
- **Help levels per player,** as in Sköldhästen:
  - *Bara när jag frågar*, for older players;
  - *Påminn mig* (Elof's default): one quiet visit from the helper after 40 s without progress;
  - *Guida mig*: step 2 comes by itself after 30 s.
- **The goal is always shown as a picture:** in the pause menu, a small drawing of the ghost and the next place
  on Moa's map. It never says how.

### 4.7 Puzzles and set pieces

- **Teaching:** every verb is taught on its own before it is combined, and no puzzle needs more than two steps
  in a row. **S** is a set piece: a ride or a show that cannot be failed.
- **Before its build session,** each puzzle gets its commit point, local reset, save rule, three hints, return
  route and framing notes for both orientations.
- **The version column:** U1 = Utgåva 1; 1.0 and 1.1 are the versions in §1.

| # | Name | Where | Verbs | The aha | Version |
| --- | --- | --- | --- | --- | --- |
| P0 | Måla ögonen | Prolog | tap or trace | "Jag gav spöket ögon!" | U1 |
| P1 | Trappsteg och glapp | Gården, deck | Hoppa, ledge climb | Candy arcs show the jumps | U1 |
| P2 | Nyckelpigan | Gården, deck edge | Vänd (a grass-stem lever), slide down the hose | Helping someone shows you the way | U1 |
| P3 | Första svingen | Gården, under the deck | Kasta snöret: first over flat ground, then the gully | The red ring means a hook | U1 |
| P4 | Spånberget | Gården, chopping block | Dra a shaving curl into a ramp, climb | The world can be moved | U1 |
| S1 | Moas pappersflygplan | Gården to the forest edge | steer | — | U1 |
| P5 | Myrvägen | Granskogen | Dra (lace) | Clear the road, and the ants carry you | 1.0 |
| P6 | Lavskrikan | Granskogen | Ge (a lingonberry) | Sharing makes a friend | 1.0 |
| P8 | Pappas gungbräda | Granskogen, ravine | Ropa på Pappa, stand still | One cone on the other end launches you | 1.0 |
| S3 | Kepsbåten (calm) | Granskogen, the forest pool | Ropa på Bertil, steer | — | 1.0 |
| P10 | Spöket i virveln | Granskogen, below the little fall | Kasta snöret, Dra | You rescue the thief, and it thanks you | 1.0 |
| P11 | Tuvorna | Myren | Hoppa | Tussocks carry you; open wet moss doesn't | 1.0 |
| P12 | Mammas fläta | Myren, pool and boardwalk | Ropa på Mamma, climb | — | 1.0 |
| P13 | Lysklubban | Myren, in the mist | walk with the light | The light shows the trail and calms the lyktgubbar | 1.0 |
| P14 | Tranungen | Myren | lead with the light, follow the rings | Bring the lost one home | 1.0 |
| S4 | Tranornas dans | Myren | — | — | 1.0 |
| S5 | Tranflygningen | Over the forests | steer | — | 1.0 (plates); 1.1 (3D) |
| P15 | Två är starkare än en | Berget | duo: boost; then hold and push | Together instead of against | 1.0 (one); 1.1 (two more) |
| P16 | Den första trägubben | Final, the crack | Kasta snöret, Dra, duo | — | 1.0 |
| P17 | Dela godiset | Final | Ge: choose who gets what | Sharing is a choice, not a loss | 1.0 |
| P18 | Godiskalaset | Epilog | Ge (tap each person) | — | 1.0 |
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

### 4.9 Map, chapters and release boundaries

- **Moas karta** (pause menu, and the chapter cards) is a crayon drawing of the route.
  - Places get drawn in as Elof reaches them.
  - A little Elof marks "Här är du", and the ghost is drawn where it was last seen.
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
- **After the ending,** Moa's map is chapter select, with each chapter's candy rows and stickers.

| Chapter | Required | Ends on | Six-year-old estimate |
| --- | --- | --- | --- |
| Prolog | P0, the chase, the star | POFF, Pappa's line, the title | 2–3 min |
| Kapitel 1 Gården | P1–P4, S1 | The ghost vanishing into the spruces | 13–17 min |
| Kapitel 2 Granskogen | P5, P6, P8, S3, P10 | The ghost hopping off towards the bog, waiting now | 12–15 min |
| Kapitel 3 Myren | P11–P14, S4 | Climbing onto the crane | 10–12 min |
| Kapitel 4 Berget + Final | S5, P15, P16, P17 | The walk home under the northern lights | 12–15 min |
| Epilog | P18 | The album and the last card | 3 min |

Re-time everything with a real child at H2, H2b and H3 (§7.3).

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
   film-like grade per place. Late September helps: the sun never climbs above about 26° (§3.4).
4. **Dark out-of-focus shapes framing the shot,** and a side camera that pulls back for at least one vista per
   chapter.
5. **No HUD to speak of.** Progress shows in the world: Yarny got thinner as he ran out of yarn; Elof's bag
   gets fuller.
6. **A wordless story in glowing memories** placed in the world (§3.3, rule 4).
7. **The core verbs stay the same all game.** Yarny never learned new moves. Elof's three magic candies and the
   rides are one-chapter tools on the same stick and buttons, not new controls.
8. **An acoustic folk score that grows with play,** field-recorded ambience, and a footstep sound for every
   surface (§5.8).

**We leave** what reviewers criticised and what doesn't suit a six-year-old:
- deaths by trial and error, and hazards that come from off screen;
- physics that can glitch;
- difficulty spikes, and long stretches between checkpoints;
- precise rope control, and a resource that runs out;
- text hints;
- grief and pollution themes.

Unravel's director, asked what he learned for the sequel, said "Test more". Here that means the robot test and
sofa tests at every stage (§6.13, §7.3).

### 5.2 Scale and camera

- **One unit is one Elof length (EL).** In the macro chapters, 1 EL is about 15 cm of the real world; in the
  prologue, final and epilogue, about 1.2 m. Props are modelled at real size divided by Elof's real height:
  - a lingonberry is about 0.05 EL and a spruce cone about 0.5 EL;
  - a fly agaric is 1–1.3 EL, and a blade of grass 1.5–2.5 EL;
  - a spruce trunk is about 2.7 EL across, and a deck step 1.2 EL high.

  Keeping real proportions is what makes the macro look believable. Exaggerate only where play needs it, and
  note it in the art bible.
- **Lens.** A perspective camera with a narrow vertical field of view (28–35°) from the side. The long lens
  flattens depth the way a macro lens does and keeps verticals straight. The play plane is z = 0.
- **Framing.**
  - **Landscape on a phone (844×390):** Elof is drawn about 75–90 CSS px tall at rest and about 65 px at a run,
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

Sunrise 06:38, sunset 18:38, and at noon the sun is only 26° high, so shadows are long all day.

| Place | Time | Light and palette |
| --- | --- | --- |
| Prolog: the kitchen | 09:00 | Low morning sun across the oak table. Pale wood shavings glow; cosy and warm. |
| Gården | 10:00 | Dew sparkle; bright greens with the first yellow birch leaves; long shadows. The red house is a huge warm wall, and sun stripes fall under the deck. |
| Granskogen | 11:30 → 14:00 | Deep green and mossy gold, shafts of light, cool blue shade. Red lingonberries and one red fly agaric as accents (never near candy). At the brook's edge: glitter on blue-green water, yellow birch leaves floating, amber stones. |
| [1.1] Forsen | 14:00 | White water and sparkle, wet dark stones, spray in the sun |
| Myren | 16:30 → 18:00 | Low gold sun, with mist rising late. Rust-red sphagnum, orange cloudberry leaves, red dwarf birch, silver mist. Mamma's warm lamp. |
| Berget | 18:00 → 18:38 | Golden hour into sunset: pink-orange sky, grey granite, white reindeer lichen, haze in the valley |
| Final | 18:40 → night | Blue hour into night: stars, green and violet northern lights, warm headlamps |
| Epilog | 21:00 | Candle-lit glazed veranda, candy colours, the aurora in the windows |

Memories use their own look: sepia, film grain and soft vignetting, so they never read as "now".

### 5.5 Beauty budget (where effort shows most)

| Share | Where |
| --- | --- |
| 20% | Elof: likeness, a readable silhouette at 75 px, lively animation and faces |
| 12% | The ghost: a faithful model or scan, the wood material, toy-like motion |
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

The project has no 3D artist, animator or composer. Claude Code sessions write code; Olov can run AI image and
3D tools in a browser; the real ghost exists and can be photographed.

The pipeline therefore uses, in order of preference:
1. code;
2. free photo-scanned materials (CC0);
3. AI tools run by Olov.

Every source and licence goes into `LICENSES.md` (§7.5). Three categories are allowed:
- **Open:** CC0, CC-BY (credited), OFL, MIT, BSD, Apache-2.0.
- **Owned by Olov:** paid-tool output and AI-painted plates, recorded with the tool, plan, date and a link to its
  terms.
- **Made by the family, with consent:** scans and photos.

**Where assets are built.**
- **The art bake** runs in sessions, because it needs headless Blender, the depth model and scans: about a
  gigabyte of tools that CI shouldn't install on every push. Its outputs are committed under `art/baked/`, only
  at checkpoints, to keep the repository far below GitHub's 1 GB.
- **The pack step** runs in CI: gltf-transform, KTX2 encoding with the `ktx` tool (installed from its release),
  the manifest and the budget checks.
- **The family's models and textures** come from the private repository (§2.6).

**What cloud sessions can't reach** (§0 Q6). Cloud sessions reach npm and GitHub, but the research sessions found most
asset sites blocked by the environment's network policy: Meshy, Tripo, Poly Haven, ambientCG, Hugging Face.
Either Olov does those downloads and generations himself and attaches or commits the results, or he widens the
environment's network access:
- open the cloud environment's settings (the environment menu in the session's title bar, then *Edit*);
- choose a broader level, or *Custom* with those hosts added and the default package-manager list kept.

The steps are at https://code.claude.com/docs/en/cloud-environments#network-access.

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
     5. p95 frame time ≤ 20 ms on Elof's device (§6.12).
   - **The fallback look, written down now** in case H1a fails twice: more painted 2D plates and fewer 3D
     layers, flatter lighting, and the same characters.
2. **Elof and the family.**
   - **Elof is built both ways in parallel in Stage 0c, and the better likeness wins at H1b.** The rest of the
     family is generated only after the vertical slice (H2b, §7.3).
   - **At play size Elof's face is about 12 px tall.** His silhouette, hair and clothes carry the likeness, so
     H1b judges at 75 px first and in close-up second. The check includes the swing, the climb, the ledge
     clamber and the taste face.
   - *Route A:* image-to-3D from Olov's turnaround sheets, using **one month of Meshy Pro** (§0 Q15; the tools
     and licences are in Appendix B.4).
     1. **Test first.** Try the tool on a made-up character, never the children's sheets on a free tier.
     2. **Prepare the sheets.** A session crops each sheet into separate square front, side and back images, at
        least 1024 px, on a plain background. The tool takes 1–4 separate views, never a collage.
     3. **Generate the model (Olov).** Smart topology at ≤ 15k triangles in A-pose, with a 2k texture.
     4. **Rig it (Olov).** The tool's automatic humanoid rig, with the height set per person.
     5. **Animate it.** Clips from **Quaternius' Universal Animation Library** (CC0, 86 clips) are retargeted
        onto the rig *at build time* with per-bone rest-pose offsets; without the offsets limbs come out 73–180°
        wrong. A few extra clips can be generated on the paid plan.
        - Mixamo and ActorCore files never go in the public repository: their terms forbid redistributing them.
     6. **Optimise it (a Claude session).**
        - 1024² colour textures, with **no normal maps on characters**: they cost download and are invisible at
          play size.
        - Then meshopt and KTX2.
        - The files go to the private repository.
     - **Faces get thin "sticker" meshes for eyes, brows and mouth,** weighted to the head bone and textured from
       an expression atlas (§2.1's nine expressions, plus blink frames).
       - They replace the generated face, which is the weakest part of AI models.
       - `DecalGeometry` is not used here, because it doesn't follow a skinned mesh.
     - **Tripo** is the fallback: native four-view input and a Mixamo-named rig, but few animation presets.
     - **Hunyuan3D is excluded,** because its licence does not apply in the EU.
   - *Route B (entirely in code):* stylised figures built from shaped primitives, with sticker faces and
     procedural animation on the same CC0 clips.
     - Less like the sheets, but consistent and quick to change.
     - Unravel's own hero is a stylised doll in a photoreal world, so this is a respectable result, not a
       failure.
   - **Family members,** as set in §2.3:
     - hands, props, boots and silhouettes in the macro chapters, with 2D portrait bubbles rendered from their
       models;
     - whole figures only in held poses in the prologue, on the summit and in the epilogue.
     - That needs few clips, but each hand and prop moment is a small authored animation, priced in §7.6.
3. **The ghost.**
   - **Built first as Route C:** a faceted mesh in code, with a procedural lime-wood material. Flat-plane carving
     suits code well.
     - Its eyes are separate meshes, because the prologue needs it eyeless until Elof paints them.
   - *Route A, an optional upgrade:* photogrammetry of the real carving, with Pappa's OK (§0 Q7). It replaces
     Route C only if it looks better side by side. Its painted eyes must then be removed from the texture.
     - **Shooting:**
       - 60–80 photos in three rings of about 24 at roughly 15°, 35° and 60°, plus a few from above;
       - diffuse light and no flash;
       - focus, exposure and white balance locked, and the phone's automatic macro switch off;
       - the figure fills 60–70% of the frame, on a patterned base, with a scale reference beside it.
     - **Reconstruction:** a phone app (Scaniverse or KIRI Engine), or a cloud session on CPU with COLMAP 4.2.1,
       whose sparse step was tested here.
     - **Clean-up** in headless Blender: a planar decimate at about 5° keeps the knife facets crisp; about 8k
       triangles; a 2k colour texture baked from the full scan.
     - **Split** it into rigid parts: the body with the bag, the left foot, the right foot.
   - *Route B:* image-to-3D from the two photos, if neither of the others works.
   - In every route it is animated in code as a rigid wooden toy. There is no skinning, because carved wood
     doesn't bend.
4. **Pappa as a boy** is Elof's rig with other hair and clothes, seen through the memory look (§5.4).
5. **Animals.** Simple stylised-real models from CC0 sources or image-to-3D, animated procedurally where
   possible: wing flaps, ant legs, a bobbing dipper.
6. **The nature kit**, mostly code:
   - seeded generators for moss mounds, tussocks, cones, needles, berries, grass and fern cards, mushrooms,
     rocks, roots and bark;
   - textured with CC0 photo-scanned materials (Poly Haven, ambientCG) converted to KTX2;
   - ambient occlusion baked by the asset build.
   - **Phone scans of real local things.** A fist-sized granite stone with lichen, cones, lingonberry sprigs,
     moss clumps and a mushroom (Olov, §0 Q8). At macro scale a small stone *is* a boulder, so this is the
     closest thing to Unravel's photographed nature. Strip location data before committing; re-encoding with
     `sharp` does it.
   - **Never** Megascans/Fab or Textures.com files: their licences forbid a public repository, and on GitHub
     Pages the repository *is* the deployment.
   - **Trees** come from `@dgreenheck/ez-tree` 1.1.0 (MIT; pine presets, generated levels of detail) and are
     baked to GLB, plus impostor cards for the mid-ground.
   - **Moss:** shell texturing only on near-camera patches, scanned clumps elsewhere.
7. **Backdrop plates.**
   - Painted with an AI image tool from the prompts in the art bible (Olov), **or** photographed at the real
     places (§0 Q8).
   - Then pre-blurred and split into 3–5 depth layers by the asset build:
     - depth from **Depth Anything V2 Small** (Apache-2.0; the larger models are non-commercial);
     - masks feathered, colour bled into transparent pixels, and hidden parts inpainted.
   - **Photos:**
     - Far hills can be a panorama. For mid-ground strips, walk sideways, because rotating in place gives the
       wrong parallax.
     - Remove people and houses with IOPaint (Apache-2.0), and strip GPS data.
     - No people, houses, house numbers or vehicles in any photo.
   - **Gaussian splats** (Spark 2.3.1 works with `WebGLRenderer`) are a STRETCH for one summit vista at most.
     Layered plates are the default.
8. **Built things,** all in code: the kitchen set, the house and deck, the chopping block and shavings, the
   paper plane, the cap, the boardwalk, the seesaw. Code means exact control of every detail, and nothing
   traced from the family's photos.
9. **Candy,** in code: 16–20 kinds from simple shapes, with three sugar materials (§4.3).
10. **The look.** Colour grades are generated in code as 3D LUTs from parameter sets per place, so they can be
    tuned in review.
11. **Headless Blender for agents.** `bpy` 4.5.14 runs on the container's Python 3.11 (about 1.1 GB installed).
    It is used for:
    - decimation and LODs;
    - baking ambient occlusion, normal and colour maps;
    - splitting parts;
    - collision proxies.

    Objects' custom properties export as glTF `extras`, which arrive in three as `userData`. That also allows
    level layout as Blender empties, if Olov ever wants to place things by hand.
    - Cycles renders on the CPU; EEVEE needs a GPU and isn't used.
    - Blender is GPL, but that covers the tool, not the assets it outputs.
12. **Review loop** (Sköldhästen §5.4, step 6):
    - Playwright contact sheets at 390×844, 844×390, 1180×820 (iPad landscape) and 1440×900;
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
- **HUD:** the candy bag (top left), pause (top left), the companion (top right), the stick and two buttons
  (bottom). Nothing else stays on screen during play.

### 5.8 Sound and music

- **The theme, "Spökets polska" (working title).**
  - A polska in 3/4, written for the game: Unravel's score arranged traditional Swedish polskas, and a
    six-year-old can dance to a polska.
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
  - Elof's tiny "Hallå!", gasps and giggles. Characters "speak" in short synthesised babble, never in a
    recording of a real child (§2.6). Words come from captions and *Läs upp*.
  - UI and pickup sounds are synthesised, so they cost no download.
- **Ambience:** recorded loops per place (CC0, or Olov's own recordings: §0 Q8) — wind in spruces, the brook,
  bog birds and cranes, an evening hush. Macro scale is sold by close, detailed small sounds: dew drips, grass
  creaks, a beetle's wings.
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
| Rendering | `three`, **`WebGLRenderer`** | 0.186.1 | §6.2 |
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
| Node | 24 in CI (26 becomes LTS on 28 Oct 2026) | — | — |

**Not used:**
- **Asset files whose licences forbid a public repository:** Mixamo, ActorCore, Megascans/Fab, Textures.com,
  free-tier AI outputs (Appendix B.4).
- **Git LFS,** which GitHub Pages can't serve.
- **WebGPU and TSL,** for now (§6.2).
- **pmndrs `postprocessing`:** r186's built-in HDR output does the job for less (above).
- **Rapier.** Its 2D compat build is 1.29 MB gzipped, against planck's 46 KB.
- **Howler,** which has had no release since 2023; plain Web Audio is enough.
- **`DRACOLoader`.** Importing it makes Vite emit about 1.3 MB of decoder files; meshopt is used instead.
- **Any CDN, analytics or third-party request.**

### 6.2 Renderer: `WebGLRenderer` first, decided on measurements

The brief names "Three.js r186.1": the npm release is `three@0.186.1`, which is the current latest. The open
question was which of r186's two renderers to use.

1. **The official manual** (dev branch, 2 October 2026) calls `WebGPURenderer` "still in an experimental state",
   and calls `WebGLRenderer` "the recommended choice for pure WebGL 2 applications".
2. **Open performance issues.**
   - #30560: with 20,000 separate meshes on an M1 Pro, about 60 fps with `WebGLRenderer` against about 15 fps
     with `WebGPURenderer`.
   - #33821: material setup 16–36× slower with `WebGPURenderer`.
3. **Measured in this session.** In headless Chromium 141 with software rendering, `WebGPURenderer`'s WebGL2
   fallback spent 2.6–17× more CPU per frame than `WebGLRenderer` on the same 50–1,200-mesh scenes, and twice
   as long on the first frame.
   - This is indicative only, because it is software rendering. But many children's devices will be older
     phones that use exactly that fallback.
4. **Size.** In a Vite 8.3.2 production build with the same loaders and a bloom pass, the JS is 191 KB gzipped
   with `WebGLRenderer` and 295 KB with `WebGPURenderer`.
5. **Robustness.** With WebGPU forced on in Chromium 141, r186's WebGPU backend threw a TypeError on a
   texture-view `swizzle` field. That is one browser-version edge case we don't need.

**Consequences:**
- **Shaders.** Custom shaders are GLSL, through `onBeforeCompile` chunks and a few `ShaderMaterial`s, not TSL.
- **Post-processing** uses r186's own HDR output and `setEffects` (§6.5).
- **Containment.** All rendering lives behind a small interface in `src/render/`, so a later move to
  `WebGPURenderer`/TSL is a contained project.
- **When to revisit:** when the manual stops calling WebGPU experimental and #30560 and #33821 are closed.
- **Stage 0b** still measures both renderers on Elof's actual device with the golden frame, so the decision
  rests on his hardware (§7.3).

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
.github/workflows/deploy.yml   push to main: typecheck, tests, build, size gate, deploy to Pages
.github/workflows/ci.yml       pull requests: the same checks, plus a Playwright smoke test and contact sheets
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
art/                           sources: generators, prompts, parameter files; baked/ (session-baked outputs,
                               committed at checkpoints); vendor/ (CC0 downloads). Raw scans and photos stay
                               outside git (§2.6).
scripts/                       bake/ (session-only: Blender, depth, scans), build-assets.mjs (packs, manifest,
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
  picks a tier. Settings can override it.

  | | Low | Mid | High |
  | --- | --- | --- | --- |
  | Pixel cap | 1.0 Mpx | 1.6 Mpx | 2.2 Mpx |
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
    - High ≤ 200 MB, of which render targets ≤ 70 MB.
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
  - counts bytes **as served**. Stage 0a records whether GitHub Pages compresses `.wasm`, `.glb` and `.ktx2` in
    transit (`content-encoding`), because meshopt and the 260 KB gzipped transcoder figure (527 KB raw) depend
    on it;
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
  - **The release rule:** after a merge, open the game once on Elof's device, so the update is in place before he
    plays.
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
- **Buses:** music, effects, ambience and voice, then master, then a compressor. Each has a volume setting.
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
  - A profile that doesn't read yet (Elof's default, §4.1) starts with it on, because the sounds carry
    information he can't get from captions.
- **Läs upp:** the Web Speech API with a Swedish voice, using **only voices with `localService: true`**, so no
  caption ever goes to a speech vendor's servers. The setting is hidden when no such voice exists.
- **Family voices** (§0 Q9) are recorded on the parents' page with `MediaRecorder`, stored in IndexedDB on that
  device, and never uploaded. A recorded line replaces *Läs upp* for that caption.
- **Characters "speak"** in short synthesised babble, timed to the caption.

### 6.9 Save

- **Storage:** `localStorage`, with an index key plus one key per player: `godisbus.v1.index` and
  `godisbus.v1.player.<id>`.
  - With no save on the device, **Börja** creates the "Elof" player and goes straight to the prologue.
  - *Byt spelare* and *Ny spelare* appear on the title once a save exists.
- **Contents:** `{ v, contentVersion, name, updated, settings, chapter, checkpoint, flags[], candy{},
  album[], memories[], found[], puzzles{}, helpLevel, playMs, ended }`. Stable authored IDs only.
- **When to write:** at every big candy (checkpoint), at chapter ends, on pause, on `visibilitychange` → hidden,
  and on `pagehide`.
- **Tolerant loading:**
  - unknown IDs are dropped;
  - an unknown checkpoint maps to its chapter start;
  - a newer or corrupt format is never silently overwritten.
- **IndexedDB, per player:**
  - album photos: about 10 small WebP game renders per playthrough;
  - family voice recordings.

  Both are cleared together with the player profile. If IndexedDB fails, the album simply has no photos and the
  captions use *Läs upp*.
- **Backups.** `navigator.storage.persist()` is a bonus, not a safeguard. On iOS the real protection is the
  Home Screen install. (SHOULD) Each chapter card also shows a three-word code, e.g. "GRAN KOTTE MOSSA", that
  restores that chapter's start on any device, as Sköldhästen's word codes do.
- **Messages** (reused): "Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå." and
  "Det sparade spelet gick inte att läsa." with **[Börja om från början]**.

### 6.10 Menus and screens (DOM over the canvas)

- **Screens:**
  - the loading card;
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
  - yes and no are ✓ and ✕ with pictures (§4.5);
  - the words are read aloud when *Läs upp* is on.
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
  the aurora). The renderer saves a small frame to IndexedDB, and the credits show them. Elof can tap through the
  credits.
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

- **Olov's one-time steps:**
  1. *Settings → Pages → Build and deployment → Source: GitHub Actions*. `configure-pages` can't switch this
     with the default token.
  2. Create the private repository `spokets-godisbus-familj`, and a fine-grained token that can only read it.
  3. Add two Actions secrets: `FAMILY_ASSETS_TOKEN` (that token) and `PRIVACY_DENYLIST` (the words in gate 8).
  - Without them the site builds with stand-in figures, and the privacy check uses its built-in rules only.
- **The repository was empty when this plan was written.** The first push therefore creates the first branch,
  which GitHub makes the default. Before the first deploy:
  1. create `main` from it;
  2. make `main` the default branch;
  3. work through pull requests into `main` from then on.
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
   - CI gates the bytes. The 5-second time on a throttled 10 Mbps / 100 ms profile is measured on Elof's device,
     because software rendering in CI can't time it meaningfully.
3. **Chapters:** each pack at most 8 MB as served; the whole of Version 1.0 at most 45 MB.
4. **Memory:** GPU memory per tier, counting assets *and* render targets (§6.5): Low ≤ 100 MB, Mid ≤ 150 MB,
   High ≤ 200 MB. No texture larger than 2048². Checked by the build's estimate and by `?bench` on Elof's device.
5. **Frame rate,** read from `?bench` and `?debug`:
   - on Elof's device at *Auto*, p95 CPU busy time ≤ 12 ms and p95 frame time ≤ 20 ms over a 10-minute route;
   - on the oldest supported device (iOS 16.4 / Android 10) at *Low*, p95 frame time ≤ 33 ms;
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
   - any word from the denylist (surname, area name, house number, school) in the diff, in `dist/`, or in glTF
     `extras`. The list is stored as an Actions secret, so it never enters the repository.
9. **Draw-call budgets:** in CI, each golden frame and chapter tour view stays within its budget of draw calls
   and triangles from `renderer.info`. The counts don't depend on GPU speed, so software rendering measures them
   exactly.

### 6.13 Tests

- **Vitest (Node):**
  - the controller: jump arcs, coyote time, ledges, slopes, climbing, the lace;
  - rails and seesaws;
  - every puzzle state machine under repeated actions, reloads and every help level: no softlock, no duplicate
    reward;
  - **the candy rule:** for every chapter, each trail candy can be seen from the previous one, and every jump
    arc can be reached by a jump. This is a geometric test over the chapter data.
  - checkpoint spacing: at most 90 s of route between big candies;
  - save validation and migration;
  - the input adapter's press queue;
  - story flags.
- **The robot playthrough.** Scripted inputs drive the real loop and input queue under a fake clock, from a
  fresh save through every released chapter, at several frame rates (gate 7). It asserts that:
  - every required puzzle is solved;
  - every checkpoint is reached;
  - the trail candy is collectable;
  - the chapter's end flag is set.
- **Playwright (browser):**
  - boot, then title → prologue → Kapitel 1, with touch and with keyboard;
  - save and continue;
  - a chapter tour with contact sheets at four viewports;
  - context loss and restore;
  - lifecycle;
  - no third-party requests;
  - the byte gates, as served by a local server that compresses as GitHub Pages does;
  - draw-call budgets (gate 9);
  - the privacy gate (gate 8);
  - menu snapshots from `dev/menus.html`.
  - Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`, as `skoldhast-shot.mjs` does.
- **By hand**, from a written checklist, on iPad, iPhone and an Android device:
  - audio unlock and the silent switch;
  - the Home Screen install, and an update arriving at the title;
  - rotation;
  - resuming after a call;
  - a long play session for heat, and Low Power Mode;
  - the first-playable time.
- **With a child** (§7.3): the playtest checklist at H2, H2b and H3.
- **Housekeeping:** commit `package-lock.json` from Stage 0a, so CI's `npm ci` and its npm cache work.

---

## 7. Delivery plan

### 7.1 Roles and realistic time

- **Olov:**
  - answers §0, and collects both parents' consent (§0 Q4);
  - approves likeness (H1b), together with both parents;
  - runs the AI tools for Route A (§0 Q15);
  - organises the photos and scans (§0 Q7–Q8);
  - does the device tests and reads the Swedish aloud;
  - merges and releases.
- **Realistic time for Olov: 40–60 hours over four to six months.**
  - Sköldhästen took about twice its plan: around 40 rounds of work by 1 October, about 25 of them started by
    Pappa's feedback.
  - This game is 3D and has more puzzles, so expect 70–100 rounds in all.
  - Feedback is gathered and given once a week, so sessions can work through it in batches.
- **Elof's parents** (👪):
  - consent;
  - Pappa's yes on the memories, and the true story if there is one (§0 Q3);
  - the ghost's photos (§0 Q7);
  - optional voice recordings on the tablet (§0 Q9).
- **Claude Code sessions:**
  - all code, code-built art, the art bake, synthesised audio and tests;
  - `HANDOVER.md` with a planned-against-actual table and the "Frågor till Olov" list.
  - Each session ends with `main` still playable.
- **Elof** plays each release. His first play of each one is the real test (H4).
- **A borrowed five-to-seven-year-old** tests at H2 and H3 (§0 Q10), so Elof's first play isn't the first
  child's.
- **Moa and Bertil** are testers, if it isn't a surprise for them.

### 7.2 Surprise, privacy and release

- **The site is public from the first deploy.** Every page carries `noindex`, and the README doesn't link to it
  (§2.6).
  - `RELEASED_CHAPTER` decides what can be played.
  - `?dev` shows unfinished work.
  - Unreleased places are blank paper on Moa's map (§4.9).
- **H4, the reveal,** is Elof's first play of a release:
  - nobody helps for the first 10 minutes;
  - note every pause longer than 10 s, every laugh and every question.
  - If the surprise allows, he can play the vertical slice early as "Kapitel 1, del 1", so his play shapes the rest
    of the chapter.
- **After Utgåva 1, ask him three things:**
  1. Vad ska spöket heta?
  2. Vilket godis är bäst?
  3. Varför tror du att spöket tog påsen?

  The first two can become canon in small text patches. The third is just for fun: the story is designed, and
  nothing is promised.

### 7.3 Stages and checkpoints

| Stage | Sessions | Olov (rounds / hours) | Deliverable | Checkpoint |
| --- | --- | --- | --- | --- |
| 0a Foundation | 1–2 | 1 / 1 h | Vite + TS + three scaffold; both workflows; a test scene live on Pages with `noindex`; the privacy gate; the input port with a greybox Elof; `?debug`, `?bench` and `dev/menus.html`. The asset chain is proven end to end: headless Blender → glTF → KTX2 → Pages. | Opens the address on Elof's device and pastes back the `?bench` text |
| 0b Look-dev | 2–3 | 2 / 2–3 h | The two golden frames with a greybox Elof, a hook and candy; quality tiers; both renderers measured on the device | **H1a**: the five criteria in §5.6 |
| 0c Characters | 2–4 | 3 / 4–8 h, including the AI tool | Elof by Route A and Route B in parallel; the ghost by Route C; likeness sheets shown to Olov through the session, never through git | **H1b**: likeness yes or no, with at most three corrections. Both parents co-sign. |
| 1 Feel | 2–3 | 2 / 2 h | Controller (run, jump, ledge, climb), candy trail and pickup, the self-pumping lace, the camera, one greybox puzzle, the robot | **H2** (20-min sofa test with the borrowed child, greybox): is moving, jumping and swinging fun for two minutes with no goal? The stick against *Följ fingret*. |
| 1b Vertical slice | 2–3 | 2 / 2 h | From the deck edge to the first swing (about 90 s, P1 and P3) at **final quality** on Elof's device: Elof, the ghost, light, candy, audio | **H2b**: cost logged and extrapolated to the whole of Version 1.0. If it's over budget, cut the scope (§7.4) before Stage 2. |
| 2 Utgåva 1 | 5–8, plus 1 buffer | 4–6 / 6–10 h | The prologue and Kapitel 1; menus, save, audio, hints, stickers; the voice-recording page | **H3** (the whole chapter on the device, with the borrowed child), then **H4** (the reveal) |
| 3 Granskogen | 5–7, plus 1 | 3–4 / 4–6 h | The forest kit, the jay, the ants, the seesaw, the brook's edge, the cap, the eddy rescue | Sofa test, then release |
| 4 Myren | 4–6, plus 1 | 3 / 4 h | The bog kit, the mist, the lollipop light, the crane chick, Mamma | Sofa test, then release |
| 5 Berget, final, epilogue | 6–8, plus 1 | 4 / 6 h | The plate flight, the summit, the duo puzzle, the aurora, the family in held poses, the party, the album | A fresh-save playthrough, then release **Version 1.0** |
| 6 Polish | 2–3 | 2 / 3 h | A Swedish copy-edit, performance on every device, the audio mix, an accessibility pass | — |
| Version 1.1 | later | — | Forsen, the bubble candy, the bark sled, the 3D flight, two more duo puzzles | — |

- **Total for Version 1.0:** about 35–50 sessions; about 70–100 rounds counting feedback; Olov 40–60 hours.
  - `HANDOVER.md` keeps a planned-against-actual row per stage, and every checkpoint re-forecasts the rest.
- **The playtest checklist** (H2, H2b, H3, every release):
  - log every pause longer than 10 s;
  - anything an adult had to say is a bug;
  - a fresh player retells the story from what they saw;
  - every required puzzle is solved without the third hint;
  - every chapter is timed.
- **Pivot rules.** A "no" at any checkpoint gets one correction session. A second "no" means:
  - at H1a: the fallback look (§5.6);
  - at H1b: Route B for the characters;
  - at H2: simpler controls, with *Följ fingret* as the default.
  - If H2b's forecast is over budget, cut the scope (§7.4) before Stage 2, not after.
- **Dates** (§0 Q5): Stage 0 in October; Stage 1 and the slice in November; Utgåva 1 by Christmas; Version 1.0 in
  spring 2027.

### 7.4 Releases, tiers and cut order

- **Releases:** Utgåva 1 → Version 1.0 → Version 1.1, as in §1. Each is complete and lovable on its own.
- **MUST for Version 1.0.** A MUST may be *simplified* before a date moves; it is never dropped.
  - the likeness of Elof and the ghost;
  - the prologue: painting the eyes, the blink, the star, Pappa;
  - the candy trail and the bag; the lace;
  - one family helper moment per chapter;
  - every required puzzle in §4.7;
  - four memories (still pictures are an acceptable simplification);
  - the summit: the reveal, the sharing choice, the golden candy, the walk home;
  - Swedish text, saving, touch controls and the kindness rules;
  - Low-tier performance;
  - the privacy rules.
- **SHOULD:**
  - the sticker album, with 16–20 candy kinds;
  - the lost things, the vittra door as a toy, the beach cobbles;
  - album photos as credits;
  - gamepad support, offline play, chapter codes;
  - *Läs upp* and the voice-recording page.
- **STRETCH:**
  - photo mode, hide-and-seek;
  - a winter epilogue: the giant snowball from the family's photo;
  - playing as Moa or Bertil;
  - a splat vista, and the encrypted *familjepaket*.
- **Version 1.1:** Forsen with the rapids and the beaver, the bubble candy, the bark sled, the full 3D crane
  flight, two more duo puzzles, Näckens fiol, the water striders.
- **Cut order, the most expensive first:**
  1. family acting beyond hands, props and bubbles;
  2. the 3D crane landscape (keep the plates);
  3. duo puzzles beyond the first;
  4. animals down to four: ladybird, ants, jay, cranes;
  5. candy kinds from 16 to 10;
  6. music arrangements from 8 to 3;
  7. then the extras: hide-and-seek, photo mode, the cobbles, the vittra toy, the lost things, album photos (use
     stills).
- **Change control.** After H3, new wishes go to a "Senare" list in `HANDOVER.md`, decided at the next release.
  Sköldhästen grew into three adventures in the middle of polishing.

### 7.5 Session rules (copied into `CLAUDE.md`)

1. **Start:**
   - read `HANDOVER.md`;
   - `npm ci && npm test` (including the robot), and fix a failure first;
   - `npm run dev` and open `?debug` to check that the game starts and plays.
2. **One PR, one visible outcome.** Never start the next chapter's content in the same PR. Change
   `RELEASED_CHAPTER` only to release.
3. **End:**
   - typecheck, tests, the privacy gate and the build's size gate pass;
   - `HANDOVER.md` is updated: done, next, decisions, known bugs, the planned-against-actual row, the "Senare"
     list, and "Frågor till Olov".
4. **Privacy (§2.6):**
   - never commit the reference photos, the character sheets or likeness renders;
   - no surnames, house number, address, account names, or a place finer than "Bredbyn";
   - the parents are Mamma and Pappa;
   - family models live in the private repository;
   - contact sheets in pull requests use a stand-in figure;
   - screenshots attached to a session are cropped first.
5. **Licences:** every third-party or generated file is listed in `LICENSES.md` under one of the three
   categories in §5.6.
6. **Release timing:** merge at least 15 minutes before Elof plays.
7. **Merging:** Olov merges. If Olov agrees, a session may merge its own green PR when it doesn't touch
   `RELEASED_CHAPTER`, likeness assets or the privacy rules.
8. **Contact sheets** are committed by sessions (not CI), only on checkpoint PRs: WebP at 390×844, 844×390,
   1180×820 and 1440×900, under `docs/shots/<chapter>/`.
9. **Playwright** is pinned to 1.56.1 everywhere, matching the browser preinstalled in cloud sessions, which
   can't download another.

### 7.6 Asset inventory, priced (first estimate)

| Item | Count | How | Sessions |
| --- | --- | --- | --- |
| Elof's clips from the CC0 library | about 12: idle, walk, run, three jump parts, push, climb, interact, pick up, crouch, sit | retargeted at build time (§5.6) | 1 |
| Elof's own clips | about 12: slide down, swing, throw the lace, lunge, taste, give, paint, hold a lantern, ride (plane, cap, crane), stomp, wave, shrink and grow | procedural layers over library clips, or short authored clips | 2 |
| Elof's faces | 9 expressions plus blink, as a sticker atlas | drawn in code | 0.5 |
| The ghost | 3 rigid parts, about 10 code-driven moves (waddle, hop, tilt, freeze, dance, juggle, knock, point, hook, fall flat) | Route C in code | 1.5 |
| Family hands | about 8 moments: Pappa's brush, knife and cone; Moa's plane; Bertil's cap; Mamma's log, braid and mug | separate hand models with a few poses | 2 |
| Family portrait bubbles | 4 people × 4 expressions | rendered from their models to 2D | 0.5 |
| Family held poses | the prologue, the summit, the epilogue | posed models | 1 |
| Pappa as a boy and the trägubbe | an Elof variant with a cap; one static figure with one blink | variant textures; code | 0.5 |
| Animals | ladybird, ants (instanced), jay, a squirrel cameo, crane family (3), a dipper | CC0 or code, procedural motion | 2–3 |
| Nature kits | 25–40 props per place, 6–10 tiling materials | generators, CC0 materials, scans | 1–2 per place |
| Backdrop plates | about 8 | AI-painted or photographed, split and pre-blurred | 1 |
| Built things | the kitchen, house, deck, chopping block, shavings, plane, cap, boardwalk, seesaw | code | 2 |
| Candy | 16 kinds (20 in 1.1), trail variants, 3 magic candies | code | 1 |
| UI | title lettering, about 30 icons, panels, Moa's map pieces, album | code | 1.5 |
| Audio | the theme in up to 8 arrangements with stems; about 10 ambiences; about 80 effects | synthesised; CC0 or own recordings | 2–3 |

### 7.7 Risks

| Risk | What could happen | Mitigation |
| --- | --- | --- |
| Consent is incomplete | personal details published without both parents' yes | §0 Q4 first; no new personal material before the yes; the repository can be recreated while it holds only plans |
| AI character models fall short of the sheets | Elof doesn't recognise himself | Route A and B in parallel; H1b at 75 px and close-up; one correction, then pivot |
| Phone performance | stutter, heat, crashes | `WebGLRenderer`, tiers, budgets, `?bench`, the device bake-off, gates 4–5 |
| Mixed art sources (code, scans, AI) | it looks like a collage | the art bible, golden frames, one grading system, the vertical slice before Stage 2 |
| Olov's time | slow feedback stalls sessions | weekly batches, planned-against-actual forecasts, optional self-merge for safe PRs |
| Scope: 3D is slow | late releases | releases with cut points, the cut order (most expensive first), the H2b forecast |
| No child tests before the reveal | the reveal finds the problems | a borrowed child at H2 and H3; the slice shown early if the surprise allows |
| Blocked asset sites | Stages 0b–0c stall | §0 Q6 before Stage 0b, or `art/vendor/` drops |
| Privacy | personal details public for ever | §2.6, the private repository, `noindex`, the CI privacy gate |
| iOS quirks | a silent game, lost saves, no fullscreen | the audio rules, the Home Screen install, chapter codes |
| Licences | files that may not be published | three allowed categories, checked in review |
| §0 Q2 answered (b) or (c) | rework of scale and camera | decide before Stage 0b; menus, controls and tech don't change |

---

## 8. Review of version 1: what changed and why

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
| Bredbyn, 26 September 2026: sunrise 06:38, sunset 18:38, the noon sun 25.6° high (3 October: 06:58, 18:14) | NOAA solar formulas at 63.45° N, 18.10° E, CEST |
| `olovmelander/spokets-godisbus` is public and empty, with the Pages flag already set | GitHub API, and `git ls-remote` (no refs) |
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
    years old with a girth over 3 m. **Proposed as the model for "Berget"**, unnamed in the game (§0 Q8).
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
    (*lavskrika*, general knowledge: ask Olov whether the family has seen them), red squirrel, moose; beard
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
  Ask Olov to confirm Anundsjö's time.

### B.3 Lördagsgodis and carving

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

### B.4 Tools for characters, the ghost scan and assets

Checked through the tools' GitHub repositories, PyPI, npm and tests in the container. Prices and some licence
terms marked "unverified" came from second-hand sources.

| Tool | What it does | Licence of what you make | Verdict |
| --- | --- | --- | --- |
| **Meshy** (Meshy-7; `meshy-cli` 0.4.0) | Image or 1–4 separate views to 3D. Smart topology at 100–15,000 triangles, A- or T-pose, 2k–8k PBR textures, GLB/FBX. Automatic humanoid rig, and a library of 678 clips. | **Paid plan: you own it.** Free plan: CC BY 4.0, owned by Meshy. | **Recommended:** one month of Pro, about US$20 (unverified) for 1,000 credits. About 50–55 credits per rigged character with five clips. |
| **Tripo** (SDK 0.4.2) | Image, or four views (front, left, back, right) to 3D. Face limits, quads, a Mixamo-named rig, about 11 humanoid presets. | Free tier CC BY (unverified); paid plans private (unverified) | Fallback |
| Rodin Gen-2.5 | Up to 5 images, T/A pose, quad options. No rigging. | Unverified | Not evaluated further |
| Hunyuan3D 2.x (open weights) | Multi-view to 3D | **Licence excludes the EU, UK and South Korea** | **Not usable from Sweden** |
| TRELLIS.2 (Microsoft) | Single image to 3D; needs a 24 GB NVIDIA GPU | MIT | Possible via a hosted demo; not a turnaround tool |
| SF3D / SPAR3D (Stability) | Single image to 3D; runs on CPU (slowly) | Community licence; you own outputs | A rough fallback |
| **Quaternius Universal Animation Library 1 + 2** | 43 + 43 clips on a 65-joint UE5-mannequin rig: idle, walk, jog, sprint, the parts of a jump, push, climb, interact, pick up, crouch, sit, carry. In-place and root-motion versions. | **CC0** | **Recommended animation source** |
| Mixamo, ActorCore | Large animation libraries | Their terms forbid redistributing raw files | **Never in this public repository** |
| SMPL-based assets | Body models | Non-commercial research only | Avoid |
| Scaniverse, KIRI Engine, Polycam | Phone photogrammetry | Free tiers and export limits unverified | Try Scaniverse or KIRI for the ghost |
| COLMAP 4.2.1 (`pycolmap`) + OpenMVS 2.4.0 | Photogrammetry on CPU | BSD / AGPL (tools only) | The sparse step tested OK here; OpenMVS needs a build |
| **Poly Haven, ambientCG** | Photo-scanned textures, models and HDRIs | **CC0** (Poly Haven: "no attribution requirement whatsoever") | **Use** |
| Kenney, Quaternius models | Stylised models | CC0 | Use where the style fits |
| Megascans/Fab, Textures.com | Photo-scanned assets | Not allowed in a public repository | **Never** |
| `bpy` 4.5.14 (Blender as a Python module) | Headless decimation, baking and glTF export with `extras` | GPL-3.0 (the tool, not its outputs) | Use in sessions |
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
