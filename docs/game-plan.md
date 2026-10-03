# Elof och det stora godisäventyret

Game plan, version 1 — 3 October 2026. Repository `olovmelander/spokets-godisbus`, site
`https://olovmelander.github.io/spokets-godisbus/` (once the first deploy has run).

This is a design and implementation proposal. Nothing is built yet, and nothing has been measured on the
family's devices. Numbers are starting values to tune. Everything that was checked while planning is listed in
Appendix A, with how it was checked; everything else is marked as an estimate or as unverified.

**Who reads this:**
- **Olov**, who commissions the game: the decisions in §0 and the checkpoints in §7.
- **Emil and Sofie**, for the questions marked 👪 (names, likeness, the real carving, the story about Emil).
- **Claude Code sessions**, for everything else. §1–§5 describe the game; §6–§7 describe how it gets built.

**What it builds on.** The UX of *Sköldhästen* (`olovmelander/alva-10-birthday`, folder `skoldhast/`) is
reused on purpose: its controls, menus, kindness rules, help ladder, saving, tests and session handover.
Appendix C lists exactly what carries over. What is new here:
- a 3D renderer (Three.js r186);
- an art direction after *Unravel*: photoreal nature, seen from very close;
- a player of about six;
- a standalone repository, built and deployed by GitHub Actions.

### Kort sammanfattning (på svenska)

- **Spelet.** Ett äventyr i sidovy, byggt i 3D, om Elof. Det tar 60–75 minuter och har en prolog, fem kapitel
  (Gården, Granskogen, Skogsbäcken, Myren, Berget), en final och en epilog. Det släpps kapitel för kapitel.
- **Idén.**
  - Elof krymper till spökets storlek, ungefär 15 cm. Då blir Bredbyns natur jättestor och vacker, som i Unravel.
  - Godisspåret visar vägen.
  - Familjen hjälper som snälla jättar: Moas pappersflygplan, Pappas vippa, Bertils kepsbåt och Mammas fläta.
- **Hemligheten.** Spöket har ingen mun och kan inte be om hjälp. Det vill hämta hem Pappas allra första tälja,
  som han tappade på berget när han var liten. Till slut förstår Elof – och väljer själv att dela med sig av
  godiset.
- **För en sexåring:**
  - spelet går att spela utan att läsa;
  - det finns inga liv och inget att misslyckas med;
  - knapparna är stora;
  - lavskrikan visar vägen när man fastnar.
- **Tekniken.**
  - Three.js r186 med `WebGLRenderer`. Den var snabbare och stabilare än WebGPU-renderaren i mina mätningar, och
    WebGPU-renderaren kallas själv fortfarande experimentell.
  - Vite 8, TypeScript, planck.js för fysiken.
  - GitHub Actions bygger och publicerar på GitHub Pages.
  - Byggt för mobil först, med kvalitetsnivåer.
- **Grafiken.**
  - Elof och familjen görs i 3D från dina karaktärsblad: AI-verktyg som gör 3D av bilder, plus färdiga
    animationer.
  - Spöket blir helst en 3D-skanning av Emils riktiga tälja.
  - Naturen byggs i kod med fria fotoskannade material.
- **Nästa steg.** Svara på frågorna i §0. Sedan Steg 0:
  - grundbygget, live på Pages;
  - en första provbild av gården som testas på Elofs egen enhet;
  - en första Elof i 3D.

---

## 0. Frågor till Olov (och till Emil och Sofie där det står 👪)

Frågorna med ★ påverkar vad som byggs först. Alla frågor har ett förval, så arbetet kan börja innan alla svar
har kommit.

1. ★ **Elof som spelare.** Hur gammal är Elof, och läser han korta ord själv? Vilken enhet spelar han på
   (modell, iOS- eller Android-version, webbläsare)? Håller han den liggande eller stående? Spelar han med ljud?
   - *Förval:* 6–7 år; läser inte säkert än; en surfplatta i liggande läge. Spelet ska gå att spela helt utan
     att läsa.
2. ★ **Elof blir liten (rekommenderas).** Efter prologen smakar Elof på en glittrig godisbit som spöket tappat,
   och krymper till spökets storlek, ungefär 15 cm.
   - Det ger tre saker:
     - Bredbyns natur blir jättestor och vacker, precis som i Unravel.
     - Elof och spöket syns lika stora på skärmen.
     - Familjen blir hjälpsamma jättar.
   - Alternativet: Elof är lika stor som vanligt, och spöket växer till barnstorlek när det vaknar (som på
     affischen "Spökets Godisbus").
   - *Förval:* krympningen. Valet ändrar mest kameran och miljöernas skala. Kontroller, menyer och teknik är
     desamma.
3. ★ 👪 **Spökets hemlighet.**
   - Förslaget:
     - Spöket bär på ett minne av Pappa: när Emil var lika liten som Elof tappade han sin allra första tälja,
       en liten trägubbe, uppe på berget.
     - Spöket har ingen mun och kan inte be om hjälp. Därför "lånar" det godispåsen – man bjuder ju på godis när
       någon kommer hem.
     - Det låter godiset trilla ur påsen så att Elof följer efter.
     - Uppe på berget hittar de trägubben tillsammans, och Elof väljer själv att dela med sig av godiset.
   - Är det okej att hitta på det här om Emil? Finns det en riktig berättelse om hans första tälja som vi kan
     använda i stället (vad var det, och var tappades den)?
   - *Alternativ:* (b) spöket vill ge godis till en ensam gammal trägubbe som ingen saknar; (c) din egen idé.
   - *Förval:* förslaget, med en påhittad första tälja.
4. ★ 👪 **Integritet.** Allt i repot och på sajten är publikt.
   - Får förnamnen Elof, Moa, Bertil, Sofie och Emil stå med? Får orten Bredbyn stå med? Får barnens utseende
     användas som spelgrafik?
   - Får namnet på området där huset står (det står i beställningen) stå med?
     - Ett gatunamn i en liten ort kan, tillsammans med förnamnen och huset, leda en främling ända fram till
       dörren.
     - Därför används det inte i repot förrän Emil och Sofie har sagt ja. Det är lätt att lägga till senare.
       Det som en gång är publicerat går däremot inte att ta bort ur git-historiken.
   - Ska huset i spelet vara en exakt kopia, eller tydligt likt men utan de allra mest unika detaljerna?
     - Elof känner igen rött hus, vita knutar, glasveranda, altan och björk.
     - En främling ska inte kunna känna igen huset från gatan.
   - *Förval:*
     - ja till förnamnen och Bredbyn, eftersom de står i beställningen;
     - områdets namn först efter ja;
     - huset "tydligt likt".
   - *Aldrig:*
     - efternamn, husnummer, skola eller koordinater;
     - riktiga foton av familjen i repot;
     - referensbladen med barnens porträtt. De laddas upp i varje konstsession i stället, och bara den färdiga
       spelgrafiken checkas in.
5. ★ **Överraskning och datum.** Är spelet en överraskning, och i så fall för vem (Elof, hela familjen)? När
   ska Prolog och Kapitel 1 vara klara (födelsedag, jul)?
   - *Förval:*
     - en överraskning för Elof;
     - ofärdiga kapitel syns bara med `?dev` (§7.2);
     - Prolog och Kapitel 1 klara till första advent (29 november 2026), resten under vintern.
6. 👪 **Det riktiga spöket.**
   - Kan någon fotografera träspöket runt om, 40–80 bilder (§5.6)? Då blir spelets spöke en 3D-skanning av
     Emils riktiga tälja.
   - Vilket trä är det (lind?), och hur högt är det?
   - *Förval:* skanning med en mobilapp. Fungerar inte det, byggs spöket från de tre fotona.
7. **Riktiga platser.**
   - Berget i spelet föreslås bli **Storklocken**, tre kilometer söder om Bredbyn. Där går högsta kustlinjen,
     och där står Prästbordstallen, som är omkring 400 år gammal (Appendix B). Är det familjens berg, eller ett
     annat?
   - Kan någon ta foton eller panoramabilder och spela in ljud vid platserna (bäcken, vinden i granarna)?
   - *Förval:*
     - Storklocken;
     - bakgrunder som byggs i koden eller målas med AI;
     - ljud som syntetiseras eller är CC0.
8. **Röster.** Ska replikerna läsas upp?
   - (a) Ingen röst, bara bilder och korta texter.
   - (b) Talsyntes, som en inställning ("Läs upp").
   - (c) Familjen läser in sina egna repliker. Inspelningarna blir då publika.
   - *Förval:* (a), med (b) som inställning.
9. **Godis.** Vilka godisar tycker Elof, Moa och Bertil bäst om? Elofs favorit blir den gyllene sista
   godisbiten, och de andras används på godiskalaset.
10. **Namn.** Ska Elof själv få döpa spöket (och lavskrikan) i slutet?
    - *Förval:* ja. Han väljer bland fyra bildförslag, och en vuxen kan skriva ett eget namn.
11. **Märken.** Bertils keps har ett klubbmärke, och skorna har logotyper.
    - *Förval:* enkla allmänna former utan riktiga logotyper.
12. **Artikeln om Emils trätäljning** kom inte med i meddelandet. Skicka gärna länk eller text. Den används
    bara för hantverksdetaljer.
13. **Fler spelare.** Ska Moa och Bertil ha egna sparplatser?
    - *Förval:* "Ny spelare" finns alltid.
14. **Ett betalt 3D-verktyg för karaktärerna.** Är det okej att köpa en månad av ett AI-verktyg som gör 3D av
    bilder, i första hand Meshy Pro (cirka 20 US-dollar)?
    - Bara med en betald plan äger man det som skapas.
    - Gratisnivåerna ger modeller under CC BY som verktyget äger, och kan visa dem publikt. Barnens porträtt får
      aldrig gå genom en gratisnivå.
    - Verktyget testas först med en påhittad figur (§5.6).
    - *Förval:* ja. Annars byggs karaktärerna i kod (Route B).

---

## 1. The game on one page

**Pitch (as Elof would hear it).** *En lördagsmorgon hemma i Bredbyn målar Elof ögonen på Pappas nya träspöke –
och spöket blinkar! Det rycker åt sig Elofs jättestora lördagsgodispåse och springer ut genom verandadörren.
Godis trillar ur påsen. Elof smakar på en glittrig godisbit … POFF! Nu är han lika liten som spöket, och jakten
börjar: genom gräsdjungeln på gården, den djupa granskogen, den glittrande skogsbäcken och den dimmiga myren,
ända upp på berget. Men varför tog spöket godiset? Och varför väntar det hela tiden på honom?*

### Why it can be awesome, not just nice

1. **It is Elof's own world, seen from 15 cm.**
   - The deck steps become cliffs, and Pappa's wood shavings become a mountain.
   - Bertil's cap becomes a boat, and Moa's paper plane becomes an aircraft.
   - Unravel's co-founder put it this way: "When you get down on your knees and look at the world from another
     perspective, magic happens." The shrink makes that literal (§5.1).
2. **A chase with a mystery.** The ghost is always just ahead. It peeks, waits, drops candy and even helps. A
   six-year-old will notice "den väntar på mig!" long before any text says so.
3. **Candy everywhere.**
   - The trail of candy is the way forward, and the bag visibly fills up.
   - Hidden candies fill a sticker album.
   - Three glittering magic candies each do something new.
4. **Big moments:**
   - painting the ghost's eyes, and shrinking;
   - the paper-plane flight and the cap-boat rapids;
   - guiding a lost crane chick through the mist with a glowing lollipop;
   - flying with the cranes over Bredbyn while the church bells ring in the Saturday evening;
   - the northern lights on the summit.
5. **The family helps like giants.** Each chapter gives one helper moment to Moa, Pappa, Bertil or Mamma. Each
   moment is built from that person's traits as written on Olov's character sheets.
6. **An ending that turns the chase around.**
   - The thief turns out to be a messenger without a mouth.
   - Pappa gets back something he lost as a boy.
   - Elof gets his candy back, and then decides himself to share it.

### Design pillars

1. **Elofs egen värld.** His house, his family and Bredbyn's real nature come first. A recognisable detail beats
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
| **Klättra** | Stick ↑ ↓ against climbable things | Bark, roots, moss walls, the candy lace, Mamma's braid. |
| **Kasta snöret** | Använd button near a red ring | The red candy lace (*godissnöret*, from Kapitel 1) hooks on. Elof can then swing, climb, pull or cross. It is Unravel's yarn, made of candy and simplified for small hands. |
| **Knuffa / Dra / Vänd / Ge** | Använd button | The button always shows the specific verb with an icon, never a generic "Gör". |
| **Smaka** | Använd button at a glittering candy | A magic candy from the ghost: shrink (prologue), float in a bubble (Kapitel 2), a light in the mist (Kapitel 4). |
| **Ropa på …** | Använd button at a helper spot | Calls Moa, Pappa, Bertil or Mamma for their helper moment. |
| **Plocka godis** | Just touch it | The candy hops into the bag. |
| **Vinka** | Tap Elof | He waves and shouts "Hallå!" in a tiny voice. Animals look up. Never needed (the cousin of Sköldhästen's Gnägg). |

### Scope of version 1

About 60–75 minutes: a prologue, five chapters, the final and an epilogue. Chapters are released one at a time,
and the Prologue plus Kapitel 1 must already be a complete, lovable game (§7).

Not included: combat or enemies, lives, timers you can lose to, precision platforming, anything that requires
reading, online features, accounts, ads, purchases, analytics or tracking, or live AI.

### The first ten minutes, as Elof should experience them

| Time | Experience | What it proves |
| --- | --- | --- |
| 0:00–1:30 | Pappa's carving corner on a Saturday morning. Elof paints the ghost's two eyes, and it blinks. It grabs the giant candy bag and wobbles out of the veranda door; Elof runs after it across the deck. He tastes a glittering candy: POFF. Title. | The hook, the likeness, the magic. Works without reading or sound. |
| 1:30–3:00 | Tiny Elof on the deck. The steps are cliffs, and where Pappa has lifted a board for repair, a chasm opens; an arc of candy shows each jump. He flips over a ladybird that lies on its back. | Game feel, the wonder of scale, kindness |
| 3:00–5:00 | Under the deck: stripes of sunlight through the planks, Bertil's lost marble, and the red candy lace hanging from a nail. The first swing. | Beauty and the core tool |
| 5:00–7:30 | The lawn jungle: dew drops that ring like bells, the birch roots, and Pappa's mountain of wood shavings. The first memory. | Exploration, toys, the seed of the mystery |
| 7:30–10:00 | Moa's huge face appears over the grass: "Elof?! Du är ju pytteliten!" She folds a paper plane and launches him to the forest edge. The ghost disappears in among the spruces. | A family role, a spectacle, and the hook into Kapitel 2 |

---

## 2. Characters and places: fidelity contract

**Sources:**
- Olov's character sheets: Moa, Bertil and Lillebror; the family sheet; the player sheet.
- The ghost render, and three photos of the real carved ghost.
- Photos of the house in summer, at the deck, and in the first snow.
- Family photos.

**None of these images are committed** (§2.6). Sessions that need them ask Olov to attach them.

The sheets are AI renders and disagree with each other in small ways. Where they disagree, the order of
authority is:
1. the photos;
2. the per-character sheet;
3. the family sheet.

Brand logos are never reproduced.

### 2.1 Elof (the player)

| Feature | Requirement |
| --- | --- |
| Age and build | A six-to-seven-year-old with a child's proportions: big head, short legs. Never a mini-adult. |
| Hair | Short, tousled, golden blond, with a spiky fringe pointing up and forward. |
| Face | Blue eyes, rosy cheeks, a few freckles, a curious closed-mouth smile at rest. |
| Shirt | Light-blue pin-striped shirt with a band collar, a few buttons and two chest pockets. Sleeves rolled to the elbows. |
| Trousers and shoes | Dark-blue jeans, rolled at the ankle. Brown leather boots with laces. |
| Backpack | A small olive-brown canvas backpack, from the player sheet. The candy he collects "goes into it". |
| Traits (from his sheet) | Nyfiken, Upptäckarglad, Smart, Snäll, Snabb |

- **Expressions:** neutral, happy, excited and curious are on his sheet. The game adds determined (the angry
  stomp in Kapitel 1), surprised, sour (after tasting a lingonberry), sad and sleepy.
- **Animations:** idle (looks around), walk, run, jump, fall, soft landing, ledge clamber, climb, push, pull,
  swing, throw the lace, crouch-peek, taste, wave, celebrate, stomp, sit and think, shrink and grow.

### 2.2 The ghost (canon: the real carving; the render is secondary)

| Feature | Requirement |
| --- | --- |
| Size | About 15 cm (to confirm, §0 Q6). Exactly Elof's height once he has shrunk. |
| Material | Pale, unpainted wood, probably lime (lind). Carved in broad flat knife facets (flat-plane carving), never smooth, never white plastic. |
| Shape | A sheet with a hood: a rounded, slightly pointed top, a long body and a folded hem with a split at the back. Seen from the side it is deep and leans slightly forward. |
| Eyes | Two round, glossy black painted eyes, each with one white highlight dot. **No mouth, ever.** It is the theme (§3.6). |
| Hands and bag | Two little carved hands hold a carved paper bag with a folded top. The bag is wood-coloured with painted dots in red, green and orange. **The carved bag is part of the ghost and is always empty.** |
| Socks and shoes | Rainbow-striped socks (blue, green, yellow, red, orange). Red high-top canvas sneakers with white toe caps, soles and laces, and a small dark-blue star on the ankle disc (generic, not a brand). |
| How it moves | Like a wooden toy come alive: rigid body, waddle, little hops, tilts. Tiny feet step quickly. It never bends or squashes like cloth. |
| Sound | Wooden knocks and creaks. Footsteps go *klonk-klonk*. A quick double knock means happy; a slow creak means sad. |

- **How it shows feelings without a mouth:** the tilt of its body, how fast it hops, and picture bubbles (a
  heart, a question mark, a small drawing of what it thinks of).
- **The stolen bag:** Elof's real lördagsgodis bag is about twice the ghost's height. The ghost drags it or
  carries it on its back, and candy trickles out of a small tear.

### 2.3 The family

As giants in the macro chapters, they are mostly seen in close-up parts: a hand, a face over the grass, boots,
a braid. They are seen whole at normal scale in the prologue, the final and the epilogue.

| Who | Look (from the sheets and photos) | Traits on the sheet | Their moment |
| --- | --- | --- | --- |
| **Mamma Sofie** | Long brown braid over the shoulder. Black tank top, olive cargo trousers, brown hiking boots, a small backpack. Often holds a white mug with a red heart. | Varm, Snäll, Stark, Kreativ, Äventyrlig, Bästa mamma | Kapitel 4: her braid is a climbing rope up onto the bog boardwalk, and her mug gives warm cocoa in the misty dusk. |
| **Pappa Emil** | Black cap, rectangular glasses, short stubble. Black T-shirt, light denim shorts, hiking boots, an olive backpack. A carving knife and a piece of wood. | Trygg, Snäll, Äventyrlig, Fixar allt, Bästa pappa | The prologue (he carves the ghost), Kapitel 2 (he carves a seesaw launcher) and the final (he recognises his first carving). |
| **Moa** (big sister) | Long wavy blond hair. Light denim jacket, pale-yellow tiered dress with eyelet lace, white sneakers, a dark-red backpack. | Snäll, Modig, Äventyrlig, Kreativ, Storasyster | Kapitel 1: she finds tiny Elof and launches him on a paper plane. Her crayon drawing style is the game's map. |
| **Bertil** (big brother) | Red-and-white trucker cap with a plain badge instead of the club crest. White short-sleeved shirt, charcoal jeans, white sneakers with red details, freckles. | Kreativ, Sportig, Busig, Snäll, Storebror | Kapitel 3: his cap becomes a boat on the brook. He runs along the bank cheering. |

### 2.4 Young Emil (memories only)

Young Emil appears only in the five memories (§3.3). He is about Elof's age. He reuses Elof's model with
different hair and 1990s clothes (§0 Q3). He is always shown through the memories' warm, sepia, film-grain
look, which keeps him clearly separate from present-day Elof.

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

- **Names:** first names only (§0 Q4). Never surnames, the house number, the school, coordinates, or the names of
  people's online accounts.
- **Photos:** real photos of the family, and the AI sheets (which are portrait likenesses of the children), stay
  out of the repository. Sessions get them as attachments. Their working copies live only in the session
  scratchpad.
- **What may be committed:** game models and textures derived from the sheets, once Olov has approved their
  likeness (H1, §7.3). The ghost scan may be committed once Emil agrees (§0 Q6).
- **Voices:** any recording of a family member becomes public on release. Record only with that person's (or
  their parents') specific OK.
- **Credits** (the wording is Olov's to change): "Spöket är täljt av Emil. Spelet är gjort till Elof av Olov –
  med hjälp av Claude."
- **The site** carries no analytics, cookies or third-party requests. Fonts and libraries are self-hosted.

---

## 3. Story

### 3.1 Premise, in words a six-year-old can repeat

At the start: "Spöket tog mitt godis! Jag följer godisspåret och tar tillbaka det."

From Kapitel 3 on, the question becomes: "Varför tog spöket mitt godis – och varför väntar det på mig?"

### 3.2 Cast

- **Elof**, the player.
  - Arc: he starts out cross ("Ge tillbaka mitt godis!"), becomes curious, then begins to understand. In the end
    he gives his candy away freely.
  - His want is small and concrete: his bag of Saturday sweets.
- **Spöket**, Pappa's newest carving, which comes alive when Elof paints its eyes. It is kind and shy, and
  brave when it has to be. It cannot speak; it shows. Elof names it at the end (§0 Q10).
- **Pappa Emil, Mamma Sofie, Moa and Bertil.** They are worried but warm. Once Moa has found tiny Elof they
  follow the trail too, as giants who stay close. They cannot follow where the ghost goes, but they help where
  they can. Pappa says it in one line: "Följ godisspåret, Elof. Vi går bredvid."
- **Lavskrikan**, a Siberian jay: grey-brown with a rusty tail.
  - Lavskrikor are famous in Norrland for being curious and following walkers for food (Appendix B; the
    sources mark this as general knowledge).
  - It steals one candy, gets another one freely, and becomes the hint companion from Kapitel 2 (§4.6).
  - Its running gag is trying to pinch candy.
- **Animal friends** (§4.4): a ladybird, ants, a beaver, an otter (cameo), a dipper, and a crane family.
- **Den första trägubben**, young Emil's first carving.
  - A small, crude figure: a round head, a pointed cap and a carved smile. It has been grey and mossy for
    thirty years in a crack beside the old pine on the summit.
  - It *has* a mouth, which is the visual opposite of the ghost.

### 3.3 World rules (set up early so the ending is fair)

1. **Pappa carves with so much care that this ghost came alive.** Nobody explains why, and it never happens to
   anything else.
2. **Candy the ghost has touched glitters, and glittering candy is magic.** The ghost always gives it on purpose,
   which is a clue in hindsight: it has been helping Elof all along.
   - The magic candies:
     - *Krympgodiset*, a glittering star (prologue);
     - *Bubbelgodiset*, a glittering gum ball (Kapitel 2);
     - *Lysgodiset*, a glittering lollipop (Kapitel 4).
   - Ordinary candy, fallen through the tear in the bag, never glitters.
3. **Stora godisbitar are safe spots.** A big candy on the path is a checkpoint: the game saves, and a little
   sparkle says so. This is Unravel's yarn spools, in candy.
4. **The ghost's memories glow in wood.** Where the ghost has stopped, a glowing curl of wood shaving
   (*minnesspån*) lies on the path.
   - Touching it plays one short, wordless memory: warm, sepia, 6–10 seconds, of young Emil and his first
     carving.
   - Five memories, one per chapter, tell the secret in pictures before anyone says it.
   - This is Unravel's photo-album memories, made of Pappa's wood shavings.
5. **The candy trail is never lost.** From each candy on the path the next one is visible. Gaps that need a jump
   are shown by an arc of candy (§4.3).
6. **Giants can't go where the ghost goes:** under roots, through thickets, across soft bog, up cracks. Small
   Elof can.

### 3.4 Beat outline

The time of day runs from morning to night through one Saturday in late September (*brittsommar*). In Bredbyn
on 26 September 2026 the sun rises at 06:38 and sets at 18:38, and at noon it stands only about 26° high, so
the light is low and long all day (Appendix A).

**Prolog: Lördagsmorgon (normal scale, about 2 min)**
1. **The kitchen table, 09:00.** The oak table, the white chairs and the morning sun. Pappa blows the last wood
   shavings off his new ghost. Elof's giant Saturday-sweets bag stands beside it. "Den får du öppna ikväll," a
   caption says, if text is on. Bertil reaches for the bag; Elof pulls it back (sibling comedy, no words needed).
2. **"Måla ögonen!"** (P0). Pappa hands Elof the brush. Elof taps or traces two eye spots, and the ghost gets
   its eyes. A stroke that is too short is finished for him; there is no wrong way. Pappa goes to answer
   Mamma's call.
3. **The blink.** The second eye is painted, and the ghost blinks. It looks at Elof. It looks at the candy bag.
   It grabs the bag, which is twice its own size, wobbles, and hops off the table. Out through the open veranda
   door it goes.
4. **The chase** (the movement tutorial, normal scale). Through the glazed veranda and out onto the deck. The
   ghost slips between the railings; a candy falls out of the tear, then another.
5. **Smaka.** At the top of the steps lies a glittering star candy. The Använd button says *Smaka*.
   *POFF* — Elof shrinks. The camera drops with him to the planks. The ghost peeks back from the deck's edge,
   waits one beat, and hops down. Title card: **Elof och det stora godisäventyret**.

**Kapitel 1: Gården (10:00, dew and sun; about 10–12 min)**
- **The deck.** The steps are cliffs, and a board Pappa has lifted for repair leaves a chasm (P1).
  - A ladybird lies on its back. Elof flips it with a grass stem (P2).
  - It flies down to show the way: a garden hose hanging over the edge to climb down.
- **Under the deck.** Stripes of sunlight fall through the planks, and lost treasures lie about: Bertil's
  marble, Moa's hair clip and a toy brick (O2). The red candy lace hangs from a nail. The first swing crosses
  the drain gully (P3).
- **The lawn jungle.** Tall grass, dew drops that ring when bumped (O1), dandelion clocks, the birch's roots
  like a mountain range, and a big boulder.
- **Pappa's shavings mountain** by the chopping block. The shaving curls are ramps and tunnels (P4). At the top
  lies the first glowing *minnesspån*. **Memory 1:** young Emil carves his first little trägubbe and holds it
  up, proud.
- **The angry stomp.** The ghost waits on a birch root and drops a candy. Elof stomps: "Ge tillbaka mitt godis!"
  The ghost hops away.
- **Moa.** Her huge face rises over the grass, and her hair falls like curtains. "Elof?! Du är ju pytteliten!"
  (S1, §4.7)
  - "Ropa på Moa": she folds a paper plane from her drawing, and Elof climbs aboard.
  - The flight goes from the deck railing over the lawn to the forest edge. Elof steers up and down through
    arcs of candy.
- **End.** Elof lands in the moss at the forest edge. The ghost slips in under the spruces. End card:
  **Kapitel 1 klart!** Moa's map gets its first drawn part, and Memory 1 goes into the album.

**Kapitel 2: Granskogen (11:30, cathedral light; about 10–12 min)**
- **The forest.** Spruce trunks like pillars, shafts of light, moss carpets, lingonberries (taste one: sour face,
  O10), cones as big as cars, and beard lichen hanging like curtains.
- **The ant road** (P5). A fallen twig blocks the ants' road. Elof pulls it away with the lace, and the ants
  give him a ride up their anthill on a "myrhiss" (ant lift).
- **Lavskrikan** (P6). A jay swoops in and pinches a candy. Elof gives it another one ("Ge"), and it becomes his
  friend and hint companion.
- **The ghost shares Elof's candy.** From a distance, Elof sees the ghost give a candy to a hungry young squirrel.
  Elof: "Den delar ut *mitt* godis?" Puzzlement, not anger.
- **Bubbelgodiset** (P7). A glittering gum ball waits at the foot of a hollow spruce stump: the ghost left it.
  Elof floats up inside the hollow trunk in a bubble, steering around splinters, to a high root shelf.
- **Pappas vippa** (P8). A ravine between two roots is too wide to cross.
  - "Ropa på Pappa": he kneels, carves a little seesaw from a dry stick in a few seconds, and sets it on a stone.
  - Elof stands on one end, and Pappa drops a cone on the other. Elof is launched across.
- **The bark sled** (S2, SHOULD). A ride down a needle slope on a piece of pine bark.
- **Memory 2:** young Emil hikes in the forest with the trägubbe in his pocket, and shows it to a jay.
- **End.** The ghost reaches the brook, steps onto a leaf and drifts away.

**Kapitel 3: Skogsbäcken (13:30, glittering; about 10–12 min)**
- **The brook.** Sparkling water, rounded stones, water striders that Elof can jump on (O6), ferns, yellow
  birch leaves drifting by, and a dipper bobbing on a stone.
- **Kepsbåten** (S3). "Ropa på Bertil": he sets his cap upside down on the water.
  - Elof rides it down the rapids, steering left and right and collecting floating candy.
  - Small waterfalls spin the cap. Bertil runs along the bank cheering "Kör, Elof!"
  - It never fails: bumping a stone only spins the cap.
- **The beaver dam** (P9). The cap stops at the dam, where a beaver can't reach the stick it needs. Elof pulls the
  stick within reach with the lace. The beaver finishes its repair, then lifts the cap over the dam.
- **The ghost in the eddy** (P10). Below a little fall, the ghost spins helplessly in an eddy. Wood floats, but
  it is frightened.
  - Elof throws the lace from a stone and pulls it ashore.
  - It stares at him, hugs the bag, and runs off.
  - But on the stone it leaves one candy, carefully placed: a thank-you. Elof: "Den tackade mig!"
- **Memory 3:** young Emil sails a bark boat with the trägubbe aboard.
- **Näckens fiol** (O5, SHOULD). By the waterfall, somebody unseen is playing the game's theme on a fiddle.
- **End.** The brook spreads out into a wide, misty bog as the light turns gold.

**Kapitel 4: Myren (17:00 into dusk, mist; about 10–12 min)**
- **The bog.**
  - Tussocks (*tuvor*) as stepping stones; some sink slowly, harmlessly (P11).
  - Red and green sphagnum, dwarf birch in autumn red, orange cloudberry leaves, and cranberries that bounce
    (O7). Cotton-grass has finished fruiting by late September, so it is left out.
  - Dark pools that mirror the sky, and grey dead pines (*torrakor*).
  - The ridges and pools of a string bog.
- **Mammas fläta** (P12). A wooden boardwalk crosses the bog high above the sphagnum. "Ropa på Mamma":
  - She lies down on the planks and lets her braid down, and Elof climbs it.
  - At the top she warms his hands at her heart mug. The music turns warm, and the game saves.
- **The mist thickens**, and the candy trail fades into it.
- **Lysgodiset** (P13). A glittering lollipop: the ghost has stuck it upright in the moss for him. It glows like
  a lantern. In its light the candy trail shows, and the *lyktgubbar* turn out to be shy lights that play
  hide-and-seek, never trick him.
- **Tranungen** (P14). A crane chick has lost its family in the mist and peeps. Elof leads it with the light,
  following the parents' answering calls, until they find each other. (Empathy, mirrored: someone small is
  lost, and is brought home.)
- **The ghost waits** on a tussock. For the first time it lets Elof come close. Its picture bubble shows a
  mountain with an old pine. Then it hops away again, but slowly.
- **Memory 4:** young Emil and his family walk a bog boardwalk at dusk, towards a mountain.
- **Tranornas dans** (S4). The crane family dances in the mist, then kneels to let Elof climb onto a back.
  End of chapter.

**Kapitel 5: Berget (18:00 to sunset; about 10 min)**
- **Tranflygningen** (S5): Nils Holgersson's ride, for Elof. Elof steers up and down through candy arcs, never
  failing. Below them pass:
  - the bog, the forest and the glittering brook;
  - where the two Anundsjö rivers meet, and lake Anundsjön;
  - the church and its 1759 bell tower, ringing the Saturday evening in at 18:00 (*helgsmålsringning*);
  - the red house, with five tiny headlamps already walking towards the mountain.
- **Landing on the mountain's shoulder** in golden hour. Granite slabs, reindeer lichen like snow-white shrubs,
  crowberry, crooked pines and an erratic boulder.
- **Strandstenarna** (O8). Round beach cobbles lie high on the mountain, because the sea once reached this high
  (Storklocken's highest shoreline, about 270 m). Each cobble rings a note.
- **The ghost is stuck** below the last cliff, with the bag too heavy to lift. Elof can reach the bag now.
  - The ghost does not run. It points up.
  - Its picture bubble shows the old pine at the top, and something small and grey beside it.
  - Elof chooses to help.
- **Två är starkare än en** (P15). Three duo puzzles in the spirit of Unravel Two, with the ghost as an AI
  partner:
  - boost each other up a ledge;
  - one holds the lace while the other climbs;
  - push a heavy cone together.
  - The partner always does its part; there is no timing.
- **The old pine** at sunset. **Memory 5:** the trägubbe slips out of young Emil's hand into a crack. He
  searches and cries, his father comforts him, and they go home without it. Elof understands: "Spöket vill
  hämta hem Pappas tälja!"

**Final: Norrsken (blue hour into night; about 5 min)**
1. **The crack** (P16). Elof lowers the lace, and the ghost climbs down and ties it round the trägubbe. They pull
   together. Out it comes: grey, mossy and smiling.
2. **The ghost gives Elof the bag back.** It was only borrowed.
3. **Dela godiset** (P17). Elof holds his candy at last. He looks at the lonely old carving and at the ghost.
   - The button says *Dela*. Elof pours the candy out in a ring for a summit party.
   - Lavskrikan arrives, and the cranes land nearby.
   - (Pressing nothing for a while makes Elof hug the bag, then look at his friends; the button pulses. There is
     no "keep it" ending.)
4. **The northern lights flare.** The ghost touches Elof's hand. *POFF* — he is big again, with both carvings at
   his feet. In this light the old trägubbe blinks, once.
5. **Headlamps.** The family comes up the path. Pappa sees what Elof is holding, and goes quiet: "Min allra
   första tälja … Den tappade jag här uppe när jag var lika liten som du."
   - They hug under the northern lights.
   - They walk home with Elof on Pappa's shoulders, holding both carvings.

**Epilog: Godiskalaset (21:00, the glazed veranda)**
- Candles and the candy bowl: it holds what Elof collected, so his play shows. The two carvings stand side by side
  on the windowsill.
- **Elof hands out candy** (P18). Tap each family member to give their favourite (§0 Q9), and give one each to
  the ghost and the trägubbe.
- **The naming.** Elof names the ghost (§0 Q10).
- **The album as credits.** Photos taken automatically at the day's big moments (§6.10), then Pappa's five
  memories.
- **Last card:** "Spöket kunde inte säga det med ord. Men Elof förstod." Then **Utforska vidare**, which opens
  every chapter for free play, to find the remaining candy.

### 3.5 Why the ghost did it (told only in pictures until the summit)

The ghost carries Pappa's memory of losing his first carving. It wants to bring it home, but it cannot ask
anyone, because it has no mouth.
- It takes the bag because you bring candy when someone comes home.
- It notices the tear in the bag and the trail behind it, and it leaves the tear as it is, because it hopes Elof
  will follow.
- It gives him the magic candies, because a small friend can go where it goes.
- At the end it gives the bag back.

Every one of these facts is visible in play before the summit. The playtest checklist (§7.3) asks a fresh
player to retell the story afterwards, to check that the pictures carry it.

If Olov chooses alternative (b) or (c) in §0 Q3, only memories 1–5, the summit
reveal and Pappa's line change.

### 3.6 The theme, in one image

**The ghost has no mouth.** Elof learns to understand someone who cannot say it in words: a ladybird on its
back, ants with a blocked road, a lost crane chick, a frightened ghost in an eddy, and finally his own father as
a little boy. The game itself is wordless for the same reason.

The candy trail is the ghost's way of saying "följ med".

The ending's line, which the player has already understood: "Spöket kunde inte säga det med ord. Men Elof
förstod."

### 3.7 Tone and words

- **Tone map:**
  - Gården: playful and comic.
  - Granskogen: wonder, a little mysterious, always safe.
  - Skogsbäcken: sparkling and exciting.
  - Myren: mysterious, then cosy with Mamma.
  - Berget: grand and tender.
  - Final: moving and magical.
- **Wordless first.** Every beat works with text and sound off, through:
  - poses and faces;
  - picture bubbles;
  - the memories;
  - icons on buttons;
  - the candy trail.
- **Text budget:** at most about 60 short captions in the whole game, each at most about 40 characters, and
  never required. Each one can also be read aloud (§0 Q8).
- **Never scary:** no villains, nothing that chases Elof, no deep darkness without a warm light nearby, and no
  spiders or wasps as threats. The ghost never laughs at him.
- **Swedish style**, as in Sköldhästen:
  - address the player as *du*;
  - Swedish quotation marks (” ”) and dashes (–);
  - plain child words;
  - every string lives in `src/content/sv.ts`.
- Olov reads every line aloud once before each chapter release.

---

## 4. Play

### 4.1 Controls

| Action | Touch (phone, tablet) | Keyboard | Gamepad (standard mapping) |
| --- | --- | --- | --- |
| Move | Floating stick: it appears where the left thumb lands. Horizontal on the ground; vertical too while climbing or swinging. | ← → / A D (Shift walks). ↑ ↓ / W S climb. | Left stick or D-pad |
| Hoppa | Large round button, lower right, 88 CSS px | Space, or ↑ / W when not on something climbable | A |
| Använd (shows the specific verb and its icon) | Round button above Hoppa, 72 px. Dimmed when nothing is near. | E or Enter | X |
| Ropa på hjälparen (§4.6) | The companion's portrait, top right (in Kapitel 1 the ladybird, then Moa; from Kapitel 2 the jay), or tap the companion | H | Y |
| Godispåsen and paus | Top corners, 64 px | G for Godispåsen; Esc or P to pause | View / Start |
| Vinka | Tap Elof | V | LB / RB |

- **Reused from Sköldhästen** (`skoldhast/src/input.mjs`, ported to TypeScript):
  - pointer capture per touch;
  - every held input released on cancel, blur or pause;
  - a press queue, so no press is lost at any frame rate;
  - movement keys by position (`KeyW`), the newest of two opposite directions wins;
  - the on-screen controls follow the device in use, not the kind of computer;
  - gamepad focus navigation in menus.
- **Never needed:** a double tap, timing, mashing, holding, or two inputs at once.
- **Sizes.** Children's fingers are less precise. Every touch target is at least 64 CSS px, with at least 12 px
  between targets. Both action buttons sit inside the bottom-right safe area.
- **Orientation.**
  - Landscape is the main layout: the side view needs width.
  - Portrait stays fully playable. The world view uses the top ~65%, the controls sit in a band below, and the
    camera zooms out.
  - The title shows Sköldhästen's hint in portrait: "Rotera telefonen för bästa upplevelse".
- **Settings** (most from Sköldhästen):
  - *Lätta hopp* (on by default): running towards a marked jump edge jumps automatically, and the jump is steered
    towards its landing.
  - *Följ fingret*: Elof walks towards a held finger.
  - *Vänsterhänt*: the controls swap sides.
  - *Lugnare tempo*: the whole game runs at 80%. This is Unravel Two's speed assist.
  - *Större text*, *Mindre rörelse* and *Läs upp* (§6.8).
  - Volume for *Musik*, *Ljud* and *Röster*.
  - Help level (§4.6) and graphics level (*Auto / Låg / Mellan / Hög*, §6.5).
  - *Tangenter och handkontroll*, the key reference.

### 4.2 Movement rules (starting values; EL = one Elof length, his current height)

The simulation always measures in EL, at both scales, so the same numbers work in the prologue and in the
macro world.

- **Run.** Walk at 1.2 EL/s; run at 3.5 EL/s after 0.3 s of full stick. Stops within 0.15 s: snappy, because
  children notice slow controls immediately.
- **Hoppa.**
  - A fixed-height jump: the apex is 1.1 EL, and a running jump reaches 2.2 EL. Holding the button changes
    nothing.
  - Coyote time 0.12 s and a jump buffer of 0.15 s.
  - Ledges whose top is within 1.4 EL are grabbed and climbed automatically (0.4 s).
- **Terrain.** Steps up to 0.3 EL are walked over; slopes up to 45° are walkable. Steeper ground slides him down
  gently. There are no damaging falls: from higher than 2.5 EL, a soft landing (a puff of moss and a roll).
- **Climbing.** 1 EL/s on surfaces tagged climbable, attaching automatically when he walks into them. Hoppa jumps
  off.
- **Godissnöret.**
  - A red ring marks every hook. Within 4 EL, the Använd button reads *Kasta snöret*, and the lace flies and
    hooks on by itself: no aiming.
  - The rope length is set at attachment (1.5–4 EL). The stick pumps the swing. Hoppa lets go with a boost at
    the forward swing, and the flight is nudged towards the authored landing. ↑ ↓ climb the lace.
  - At a pull ring (*Dra*), the lace pulls an object along its rail.
  - At a pair of rings, it ties a bridge, which is also a trampoline (Unravel's trick).
- **Objects move on rails, not as free rigid bodies.**
  - Cones, chips, berries and sticks move along short authored paths with springy, juicy motion. They can never
    end up somewhere unsolvable. This is Sköldhästen's "one notch along a short rail".
  - Free physics is cosmetic only: wobble, bounce, rope sag.
- **Bubbelgodiset.** The bubble rises at 1 EL/s and steers sideways at 1 EL/s. Bumping a twig bounces it. Hoppa,
  or arriving at the target height, pops it into a soft fall.
- **Water.** Tiny Elof doesn't swim. Falling into the brook bobs him straight to the nearest bank with a splash
  and a shake. Water is crossed on stones, leaves and the cap.
- **Riding** (the paper plane, the cap, the crane): the stick steers within an authored corridor, and nothing in
  the corridor can stop the ride.

### 4.3 Candy

- **Trail candy.**
  - On the main path there is a candy every 1.5–3 EL, and each next candy is visible from the one before.
  - A jump is announced by an arc of candy over the gap; a climb, by candy up the wall.
  - About 60–80 per chapter. Touching one collects it, and a magnet radius of 0.6 EL forgives near misses.
- **Big candy** is a checkpoint (§3.3, rule 3). There is at least one every 90 seconds of play.
- **Hidden candy for the album.** Four per chapter, each a new kind, placed off the path: behind leaves, under
  roots, at the end of an optional swing. Twenty kinds in all, plus Elof's favourite as the golden final piece
  (§0 Q9).
- **Magic candy** (glittering): three, story-placed (§3.3, rule 2).
- **HUD.** A small paper candy bag, top left, that visibly fills. A number appears only on the chapter card, for
  parents. Unravel's lesson: progress lives in the world, not in counters.
- **Never lost.** No candy is ever taken away, and the party table in the epilogue shows what Elof collected.
- **Kinds, with generic names only** (Appendix B lists the brands to avoid):

  | Chapter | Kinds |
  | --- | --- |
  | Gården | geléhallon, gummibjörn, skumbanan, sockerbit |
  | Granskogen | skumsvamp, gummiorm, chokladkola, colaflaska |
  | Skogsbäcken | lakritsfisk, regnbågsrem, hallonbåt, geléhjärta |
  | Myren | chokladpeng, stekt ägg, sur napp, lakritskonfekt |
  | Berget | polkagris, gräddkola, salmiakruta, chokladpralin |

  - Every kind is a small 3D model built in code, with one of three sugar materials: glossy jelly, matte foam,
    or sugar-coated with sparkle (§5.6).
  - The Swedish review (§7.3) checks each name for brands.

### 4.4 Helpers: the family and the animals

Helper moments are always started by the player ("Ropa på …" at a spot marked with that person's portrait).
The help is big and spectacular, but Elof still does the part that matters.

| Chapter | Family member | Moment | Animal friend: Elof helps → it helps back |
| --- | --- | --- | --- |
| 1 Gården | Moa | The paper plane (S1) | Ladybird: flipped over → shows the way down |
| 2 Granskogen | Pappa | The seesaw launcher (P8) | Ants: road cleared → ant lift. Jay: given a candy → companion. |
| 3 Skogsbäcken | Bertil | The cap boat (S3) | Beaver: stick fetched → lifts the cap over the dam |
| 4 Myren | Mamma | The braid and the cocoa (P12) | Crane chick: led home → the cranes fly Elof to the mountain |
| 5 Berget | — | The ghost as partner (P15) | — |
| Final | Everyone | Headlamps, recognition, the walk home | Jay and cranes come to the party |

Between their moments, the family are seen far away in the soft background: silhouettes calling "Elof!" and
walking alongside. A child should feel watched over, never lost.

### 4.5 Kindness rules (Sköldhästen §4.3, adapted)

- There are no lives, damage, timers you can lose to, pits, drowning or lost progress.
- **The chase can't be lost.** The ghost keeps its distance at Elof's pace and waits when he dawdles or
  explores.
- **Refuse instead of fail.** Too far to jump: Elof stops at the edge and looks across, and the candy arc shows
  where he needs to stand. A refusal always shows *why*, through a pose or a glance.
- **Every puzzle is a small state machine** with:
  - a commit point, after which it never resets;
  - a local reset, so an unfinished object returns home when Elof leaves or uses "Jag har fastnat";
  - a save rule, so on load uncommitted objects return home;
  - a return route;
  - three hints;
  - framing notes for portrait and landscape.
  Each entry gets these before its build session.
- **"Jag har fastnat"** (pause menu): "Vill du gå tillbaka till en trygg plats?" with **[Ja]** and
  **[Nej, jag fortsätter]**. Going back never undoes anything learned or found.
- The ending never depends on hidden candy, optional delights or settings.

### 4.6 Hints

- **Level 0: the world itself is readable.**
  - the candy trail and the candy arcs;
  - red rings on hooks;
  - a soft glint on anything the Använd button can act on;
  - helper spots marked with a family portrait.
- **The companion.** In Kapitel 1 it is first the ladybird Elof helped (P2), which flies ahead and glows, and then
  Moa, whose giant finger points. From Kapitel 2 it is Lavskrikan. Before P2 nothing needs a hint: the candy arcs
  over the first jumps are enough. Called with the bird button, it offers, wordlessly:
  1. **En liten ledtråd**: it flies to the right area and looks at it.
  2. **Lite tydligare**: it lands on the object or hook and pecks it, and the right icon pulses on the Använd
     button.
  3. **Visa mig**: a short replay plays a dotted silhouette of Elof doing the action. This is the "super guide"
     idea, for a player who can't read.
- **Help levels per player,** as in Sköldhästen:
  - *Bara när jag frågar* (default for older players);
  - *Påminn mig* (default for Elof): one quiet call from the bird after 40 s without progress;
  - *Guida mig*: level 2 comes by itself after 30 s.
- The goal is always shown in pictures: in the pause menu, a small drawing of the ghost and the next place on Moa's
  map. It never says how.

### 4.7 Puzzles and set pieces

- **Teaching:** every verb is taught on its own before it is combined. No puzzle needs more than two steps in a
  row. **S** is a set piece: a ride or a show that cannot be failed.
- **Before its build session,** each puzzle gets its commit point, local reset, save rule, three hints, return
  route and framing notes for both orientations.

| # | Name | Where | Verbs | The aha | Tier |
| --- | --- | --- | --- | --- | --- |
| P0 | Måla ögonen | Prolog | tap or trace | "Jag gav spöket ögon!" | MUST |
| P1 | Trappsteg och glapp | Gården, deck | Hoppa, ledge climb | Candy arcs show the jumps | MUST |
| P2 | Nyckelpigan | Gården, deck edge | Knuffa (a grass-stem lever) | Helping someone shows you the way | MUST |
| P3 | Första svingen | Gården, under the deck | Kasta snöret, swing | The red ring means a hook | MUST |
| P4 | Spånberget | Gården, chopping block | Dra a shaving curl into a ramp, climb | The world can be moved | MUST |
| S1 | Moas pappersflygplan | Gården to the forest edge | steer | — | MUST |
| P5 | Myrvägen | Granskogen | Dra (lace), Ge | Clear the road, and the ants carry you | MUST |
| P6 | Lavskrikan | Granskogen | Ge | Sharing makes a friend | MUST |
| P7 | Bubbelgodiset | Granskogen, hollow stump | Smaka, steer the bubble | Up through the inside of a tree | MUST |
| P8 | Pappas vippa | Granskogen, ravine | Ropa på Pappa, stand still | One cone on the other end launches you | MUST |
| S2 | Barkpulkan | Granskogen, needle slope | steer | — | SHOULD |
| S3 | Kepsbåten | Skogsbäcken | Ropa på Bertil, steer | — | MUST |
| P9 | Bäverdammen | Skogsbäcken | Dra (lace) | Help the builder, and it lifts you over | MUST |
| P10 | Spöket i virveln | Skogsbäcken | Kasta snöret, Dra | You rescue the thief, and it thanks you | MUST |
| P11 | Tuvorna | Myren | Hoppa | Sinking tussocks are slow and safe; candy marks the firm ones | MUST |
| P12 | Mammas fläta | Myren, boardwalk | Ropa på Mamma, climb | — | MUST |
| P13 | Lysgodiset | Myren, in the mist | Smaka, walk with the light | The light shows the trail and calms the lyktgubbar | MUST |
| P14 | Tranungen | Myren | lead with the light, listen | Bring the lost one home | MUST |
| S4 | Tranornas dans | Myren | — | — | MUST |
| S5 | Tranflygningen | Over Bredbyn | steer | — | MUST |
| P15 | Två är starkare än en | Berget | duo: boost, hold, push | Together instead of against | MUST (2 of 3), SHOULD (the third) |
| P16 | Den första trägubben | Final, the crack | Kasta snöret, Dra, duo | — | MUST |
| P17 | Dela godiset | Final | Dela | — | MUST |
| P18 | Godiskalaset | Epilog | Ge (tap each person) | — | MUST |

### 4.8 Optional delights (never required)

| # | Name | What it is | Tier |
| --- | --- | --- | --- |
| O1 | Daggklockspelet | Dew drops on grass blades ring notes when bumped, and playing the theme in order makes the lawn sparkle | SHOULD (K1) |
| O2 | Hittegods | Bertil's marble, Moa's hair clip, a toy brick and a coin under the deck. Found things are returned at the party, with a giant's reaction. | SHOULD (K1) |
| O3 | Vittrornas dörr | A tiny door under a spruce root. Leave a candy, and a rare candy appears next time you pass. Vittra are Norrland's polite underground neighbours (Appendix B). | SHOULD (K2) |
| O4 | Kottkägla | Roll a cone into a ring of toadstools | STRETCH |
| O5 | Näckens fiol | A hidden fiddle tune by the waterfall. Hop the stones in order to play along. | SHOULD (K3) |
| O6 | Skräddarna | Water striders as moving stepping stones | SHOULD (K3) |
| O7 | Tranbärsstuds | Cranberries bounce like trampolines | MUST (cheap, K4) |
| O8 | Strandstenarna | Beach cobbles on the summit play notes; Pappa explains them in the epilogue | SHOULD (K5) |
| O9 | Fotoläge | Freeze, frame and save a photo to the album | STRETCH |
| O10 | Smaka lingon | A sour face, every time | MUST (cheap) |
| O11 | Kurragömma | After the ending, the ghost hides in each chapter | STRETCH |

### 4.9 Map, chapters and release boundaries

- **Moas karta** (pause menu, and the chapter cards) is a crayon drawing of the route: Gården → Granskogen →
  Skogsbäcken → Myren → Berget. Places get drawn in as Elof reaches them, a little Elof marks "Här är du", and the
  ghost is drawn where it was last seen.
- **Releases.** `RELEASED_CHAPTER` in `src/content/world.ts` is the last released chapter. Raising it *is* the
  release (Sköldhästen's rule).
  - Unreleased chapters are blank paper on the map with Moa's note "Här ritar Moa fortfarande …", and nothing
    leads into them.
  - The end card of the last released chapter says: "Fortsättning följer!"
  - `?dev` shows unreleased work.
- **After the ending,** Moa's map is chapter select, with each chapter's candy and album count.

| Chapter | Required | Ends on | Estimate |
| --- | --- | --- | --- |
| Prolog | P0 and the chase | POFF, the title | 2 min |
| Kapitel 1 Gården | P1–P4, S1 | The ghost vanishing into the spruces | 10–12 min |
| Kapitel 2 Granskogen | P5–P8 | The ghost drifting away on a leaf | 10–12 min |
| Kapitel 3 Skogsbäcken | S3, P9, P10 | The mist over the bog | 10–12 min |
| Kapitel 4 Myren | P11–P14, S4 | Climbing onto the crane | 10–12 min |
| Kapitel 5 Berget + Final | S5, P15–P17 | The walk home under the northern lights | 15 min |
| Epilog | P18 | The album and the last card | 3 min |

Re-estimate these from timed greybox play in Stages 1–2.

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
| Post | Tone mapping, colour grade (LUT), vignette, half-resolution bloom on sparkles | One merged pass (pmndrs `postprocessing`) on Mid and High; on Low, the grade is done in the materials |

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
| Granskogen | 11:30 | Deep green and mossy gold, shafts of light, cool blue shade. Red lingonberries and one red fly agaric as accents. |
| Skogsbäcken | 13:30 | Glitter: blue-green water, white foam and sparkles, yellow birch leaves floating, amber stones |
| Myren | 17:00 → 18:30 | Low gold sun, then dusk. Rust-red sphagnum, orange cloudberry leaves, red dwarf birch, silver mist. Mamma's warm light. |
| Berget | 18:00 → 18:40 | Golden hour into sunset: pink-orange sky, grey granite, white reindeer lichen, haze in the valley |
| Final | 19:30 → | Blue hour into night: stars, green and violet northern lights, warm headlamps |
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

Every source and licence goes into `LICENSES.md` (§7.5).

**What cloud sessions can't reach.** Cloud sessions reach npm and GitHub, but the research sessions found most
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
   - two "golden frames": the deck edge and the moss under the spruces. They are rendered in-engine and are the
     look every later scene is compared with.
2. **Elof and the family.**
   - *Route A (recommended):* image-to-3D from Olov's turnaround sheets, using **one month of Meshy Pro**
     (§0 Q14; the tools and licences are in Appendix B.4).
     1. **Test first.** Try the tool on a made-up character, never the children's sheets on a free tier.
     2. **Prepare the sheets.** A session crops each sheet into separate square front, side and back images, at
        least 1024 px, on a plain background. The tool takes 1–4 separate views, never a collage.
     3. **Generate the model (Olov).** Smart topology at ≤ 15k triangles in A-pose, with a 2k texture.
     4. **Rig it (Olov).** The tool's automatic humanoid rig, with the height set per person.
     5. **Animate it.** Clips from **Quaternius' Universal Animation Library** (CC0, 86 clips) are retargeted
        onto the rig *at build time* with per-bone rest-pose offsets; without the offsets limbs come out 73–180°
        wrong. A few extra clips can be generated on the paid plan.
        - Mixamo and ActorCore files never go in the public repository: their terms forbid redistributing them.
     6. **Optimise it (a Claude session).** Elof keeps a 2048² texture; the family gets 1024². Then meshopt and
        KTX2.
     - **Faces get thin "sticker" meshes for eyes, brows and mouth,** weighted to the head bone and textured from
       an expression atlas (§2.1's nine expressions, plus blink frames).
       - They replace the generated face, which is the weakest part of AI models.
       - `DecalGeometry` is not used here, because it doesn't follow a skinned mesh.
     - **Tripo** is the fallback: native four-view input and a Mixamo-named rig, but few animation presets.
     - **Hunyuan3D is excluded,** because its licence does not apply in the EU.
   - *Route B (fallback, entirely in code):* stylised toy-like figures built from shaped primitives, with faces
     drawn on canvas textures and procedural animation. They are less like the sheets, but always consistent and
     quick to change.
   - **The pivot rule:** if Route A fails H1b twice (§7.3), switch to Route B before any chapter art.
   - **Family members** are mostly needed as giants in close-up, plus a few normal-scale poses, so they need
     only about six clips each.
3. **The ghost.**
   - *Route A:* photogrammetry of the real carving (Emil's OK first: §0 Q6).
     - **Shooting:**
       - 60–80 photos in three rings of about 24 at roughly 15°, 35° and 60°, plus a few from above;
       - diffuse light and no flash;
       - focus, exposure and white balance locked, and the phone's automatic macro switch off;
       - the figure fills 60–70% of the frame, on a patterned base, with a scale reference beside it.
     - **Reconstruction:** a phone app (Scaniverse or KIRI Engine), or a cloud session on CPU with COLMAP 4.2.1,
       whose sparse step was tested here.
     - **Clean-up** in headless Blender: a planar decimate at about 5° keeps the knife facets crisp; about 8k
       triangles; a 2k colour texture baked from the full scan.
     - **Split** it into rigid parts: the body with hands and bag, the left foot, the right foot.
   - *Route B:* image-to-3D from the three photos.
   - *Route C:* a faceted mesh built in code, with a procedural lime-wood material.
   - In every route it is animated in code as a rigid wooden toy. There is no skinning, because carved wood
     doesn't bend.
4. **Young Emil** is Elof's rig with other hair and clothes, seen through the memory look (§5.4).
5. **Animals.** Simple stylised-real models from CC0 sources or image-to-3D, animated procedurally where
   possible: wing flaps, ant legs, a bobbing dipper.
6. **The nature kit**, mostly code:
   - seeded generators for moss mounds, tussocks, cones, needles, berries, grass and fern cards, mushrooms,
     rocks, roots and bark;
   - textured with CC0 photo-scanned materials (Poly Haven, ambientCG) converted to KTX2;
   - ambient occlusion baked by the asset build.
   - **Phone scans of real local things.** A fist-sized granite stone with lichen, cones, lingonberry sprigs,
     moss clumps and a mushroom (Olov, §0 Q7). At macro scale a small stone *is* a boulder, so this is the
     closest thing to Unravel's photographed nature. Strip location data before committing; re-encoding with
     `sharp` does it.
   - **Never** Megascans/Fab or Textures.com files: their licences forbid a public repository, and on GitHub
     Pages the repository *is* the deployment.
   - **Trees** come from `@dgreenheck/ez-tree` 1.1.0 (MIT; pine presets, generated levels of detail) and are
     baked to GLB, plus impostor cards for the mid-ground.
   - **Moss:** shell texturing only on near-camera patches, scanned clumps elsewhere.
7. **Backdrop plates.**
   - Painted with an AI image tool from the prompts in the art bible (Olov), **or** photographed at the real
     places (§0 Q7).
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
9. **Candy,** in code: about 20 kinds from simple shapes, with three sugar materials (§4.3).
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
  - Granskogen: low drones and a hesitant fiddle.
  - Skogsbäcken: a fast polska with glittering plucks.
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
  - Elof's tiny "Hallå!", gasps and giggles.
  - UI and pickup sounds are synthesised, so they cost no download.
- **Ambience:** recorded loops per place (CC0, or Olov's own recordings: §0 Q7) — wind in spruces, the brook,
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
| Post-processing | `postprocessing` (pmndrs) | 6.39.5 | Merges effects into one pass; supports three ≥ 0.168 and < 0.187 |
| Physics | `planck` (a Box2D port, MIT) | 1.5.0 | 46 KB gzipped, pure JS, so it runs in Node tests. Joints for rails, seesaws and ropes (§6.4). |
| Build | Vite | 8.3.2 | Rolldown. `base: '/spokets-godisbus/'`, hashed file names, and r186's Basis transcoder emitted with no setup |
| Language | TypeScript | 7.0.2 | `tsc --noEmit` in CI (Vite only strips types). Avoid typescript-eslint, which does not accept TypeScript 7 yet. |
| Unit and simulation tests | Vitest | 5.0.3 | Node ≥ 22.12 |
| Browser tests | `@playwright/test` | 1.63.0 in CI | In cloud sessions, use the preinstalled Playwright 1.56.1 with Chromium 141 (`/opt/pw-browsers`) |
| Model and texture pipeline | `@gltf-transform/cli` + KTX-Software (`ktx` ≥ 4.4) | 4.5.1 | Meshopt plus KTX2 (ETC1S for colour, UASTC for normals) |
| Offline and Home Screen | `vite-plugin-pwa` (Workbox 7.4.1) | 1.3.0 | Supports Vite 8 |
| Font | Andika (`@fontsource/andika`, OFL-1.1) | 5.3.0 | Self-hosted subset |
| Node | 24 in CI (26 becomes LTS on 28 Oct 2026) | — | — |

**Not used:**
- **Asset files whose licences forbid a public repository:** Mixamo, ActorCore, Megascans/Fab, Textures.com,
  free-tier AI outputs (Appendix B.4).
- **Git LFS,** which GitHub Pages can't serve.
- **WebGPU and TSL,** for now (§6.2).
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
- **Post-processing** uses pmndrs `postprocessing`.
- **Containment.** All rendering lives behind a small interface in `src/render/`, so a later move to
  `WebGPURenderer`/TSL is a contained project.
- **When to revisit:** when the manual stops calling WebGPU experimental and #30560 and #33821 are closed.
- **Stage 0b** still measures both renderers on Elof's actual device with the golden frame, so the decision
  rests on his hardware (§7.3).

**r186 details to respect:**
- `Timer` with `timer.connect(document)` replaces the deprecated `Clock`.
- `PCFSoftShadowMap` is gone; use `PCFShadowMap`, which is soft since r182.
- Never use `renderAsync`.
- Call `renderer.compileAsync(scene, camera)` and `renderer.initTexture()` on the loading card, so shaders
  compile before play.
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
art/                           sources only: generators, prompts, parameter files. Raw scans live outside git (§2.6).
scripts/                       build-assets.mjs (glTF, KTX2, plates, LUTs, manifest, budgets),
                               shots.mjs (contact sheets), audio-check.mjs (offline render QA)
tests/                         unit/ and sim/ (Vitest), robot/ (whole-game playthrough), browser/ (Playwright)
dev/                           menus.html (every menu without WebGL), look.html (golden frames), hero.html (animations)
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
  - **Ground:** planck `ChainShape` strips, which avoid snagging on seams. One-way platforms use the pre-solve
    hook.
  - **Elof:** a fixed-rotation dynamic body with frictionless sides and a foot sensor. Each step sets its
    velocity from the controller, which handles coyote time, the jump buffer, ledge rays and climb mode.
    - Because he is a real body, his weight tips seesaws and dips floating things with no extra code.
  - **The lace:** a `RopeJoint`/`DistanceJoint` pendulum for play. It is drawn separately as a smooth curve with
    a little verlet sag.
  - **Rails:** puzzle objects slide on `PrismaticJoint`s with limits and a spring, which gives a physical feel
    but never an unsolvable state (§4.2). The seesaw uses a `RevoluteJoint` with limits.
  - **Free bodies** are toys only (berries, cranberries, pebbles). They respawn and never gate progress.
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
  - the same per-step input gives the same state at any frame rate (tested, §6.13);
  - the simulation never reads the clock.
- **Camera intent:** the simulation outputs a desired framing (zones, look-ahead, vista pulls). The renderer only
  smooths it, so camera framing is testable too.

### 6.5 Rendering pipeline and quality tiers

- **Renderer.**
  - `new WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false })`, with sRGB
    output.
  - Tone mapping in the post pass on Mid and High, and in the materials on Low.
  - The renderer is wrapped in try/catch. If WebGL2 is missing: "Den här webbläsaren kan tyvärr inte visa
    spelet." with **[Försök igen]** (Sköldhästen's wording).
- **Pixel budget:** `pr = min(devicePixelRatio, 2, sqrt(cap / (cssW × cssH)))`, where the cap depends on the
  tier.
  - Dynamic resolution moves `pr` in 0.1 steps from the average frame time, with a delay before reversing.
    `setPixelRatio` reallocates the canvas, so it never changes every frame.
- **Quality tiers.** *Auto* measures the title scene for two seconds at Mid and picks a tier. Settings can
  override it.

  | | Low | Mid | High |
  | --- | --- | --- | --- |
  | Pixel cap | 1.0 Mpx | 1.6 Mpx | 2.2 Mpx |
  | Post | none; grading in the materials | one merged pass: tone map, LUT, vignette | the same, plus half-resolution bloom, mid-ground depth blur and SMAA |
  | Foliage density | 40% | 70% | 100% |
  | Shadows | a blob under each character | blob plus contact darkening | plus one 1024² shadow map for characters only |
  | Particles | 30% | 60% | 100% |
  | Water | a flat flowing shader | plus flow, glints and caustics | plus low-resolution refraction |

- **Materials.**
  - `MeshStandardMaterial` for characters and play-plane props, with baked ambient occlusion and light maps.
    `MeshLambertMaterial`/`MeshBasicMaterial` for far layers.
  - Materials are shared, and wind sway is one shared vertex chunk.
  - Foliage cards are cut tightly, and use alpha test (with `alphaToCoverage` on High) rather than blending.
    Blending is kept for a few mist and light layers with `depthWrite: false`.
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
- **Loading a chapter:** `compileAsync` and `initTexture` for everything, then one warm-up frame of the post
  chain, all behind the loading card.
- **Memory:**
  - at most about 150 MB of GPU memory per chapter (250 MB on large tablets), as estimated by the asset build;
  - 1024² textures by default, 2048² only for plates and atlases, never larger;
  - everything from the previous chapter is disposed on a switch (`Object3D.dispose()` from r186), and
    `renderer.info.memory` is checked.
- **Context loss.** Pause on `webglcontextlost`. On restore, rebuild GPU resources from the cached assets.
  Nothing that matters lives only on the GPU: candy taken, puzzle states and drawings are simulation data.

### 6.6 Assets, loading and offline

- **Packs:**
  - `boot`: engine, UI, font, the title scene and the whole prologue. At most **3 MB**.
  - `k1` … `k5`: one per chapter, at most **8 MB** each. `k5` includes the final, and the epilogue is small.
- **The asset build** (`scripts/build-assets.mjs`):
  - runs the generators;
  - converts models with gltf-transform (meshopt; KTX2 ETC1S for colour, UASTC + zstd for normal and AO maps);
  - pre-blurs and splits the plates, and bakes the LUTs;
  - writes `manifest.json` (files and bytes per pack, plus estimated GPU MB);
  - **fails** when a budget in §6.12 is broken.
- **Loading:**
  - Show the title as soon as `boot` is in.
  - Prefetch the next pack in the background, from the start of the prologue for `k1` and halfway through each
    chapter for the next.
  - If Elof outruns the prefetch, a loading card shows Moa drawing the next part of the map, with progress by
    bytes.
  - Failed fetches retry three times per file. After that: "Något gick fel när spelet laddades." with
    **[Försök igen]**.
- **Offline (SHOULD).** `vite-plugin-pwa` precaches the app shell and `boot`, and caches each chapter pack the
  first time it is loaded.
  - Workbox's defaults precache only `js, wasm, css, html` up to 2 MiB per file. Add `glb, ktx2, m4a, webp,
    woff2` and raise `maximumFileSizeToCacheInBytes`.
  - A new version activates at the next launch, never in the middle of a chapter.
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
- **Wake Lock** while playing: iOS 16.4+ and Android. **Page Visibility:** pause the loop, suspend audio, save.
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
  - long beds stream through `<audio>` and `MediaElementAudioSourceNode`.
- **Format:** AAC in `.m4a` only: music at 96–128 kbps, ambience and effects at 48–64 kbps mono. Loops use
  `loopStart` and `loopEnd` to skip the encoder's lead-in.
- **The iOS silent switch is respected,** as in Sköldhästen, so the game works silently. A parent setting,
  *Ljud även i tyst läge*, sets `navigator.audioSession.type = 'playback'` (Safari 16.4+).
- **Läs upp:** the Web Speech API with a Swedish voice when the device has one. The setting is hidden when it
  doesn't.

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
- **Album photos** go in IndexedDB: about 10 small WebP frames per playthrough. If that fails, the album simply
  has no photos.
- **Backups.** `navigator.storage.persist()` is a bonus, not a safeguard. On iOS the real protection is the
  Home Screen install. (SHOULD) Each chapter card also shows a three-word code, e.g. "GRAN KOTTE MOSSA", that
  restores that chapter's start on any device, as Sköldhästen's word codes do.
- **Messages** (reused): "Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå." and
  "Det sparade spelet gick inte att läsa." with **[Börja om från början]**.

### 6.10 Menus and screens (DOM over the canvas)

- **Screens:**
  - the loading card;
  - the title: **Börja**/**Fortsätt**, *Byt spelare*, *Inställningar*, and the rotate hint in portrait;
  - pause: **Spela vidare**, *Godispåsen*, *Moas karta*, *Jag har fastnat*, *Inställningar*, *Till början*;
  - settings (§4.1);
  - Godispåsen: candy stickers by chapter, *Pappas minnen*, *Hittegods* and *Foton*;
  - Moas karta and the chapter cards;
  - picture and speech bubbles, the helper prompt, and the HUD.
- **Panels:**
  - every panel has a ✕;
  - tapping the backdrop closes it;
  - Esc closes it, and gamepad B goes back.
  - Settings opened from pause keep the game paused.
- **`dev/menus.html`** shows every menu without WebGL, with query options, as in Sköldhästen. It is the base of
  the menu screenshot tests.
- **Album photos** are captured at authored moments (shrinking, the first swing, the plane, the cap, the crane,
  the aurora). The renderer saves a small frame to IndexedDB, and the credits show them.
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
      steps:
        - uses: actions/checkout@v7
        - uses: actions/setup-node@v7
          with: { node-version: 24, cache: npm }
        - run: npm ci && npm run typecheck && npm test && npm run build   # build includes the size gate
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

- **Olov's one-time step:** *Settings → Pages → Build and deployment → Source: GitHub Actions*.
  `configure-pages` can't switch this with the default token.
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
- **Pull requests** run the same checks without deploying, plus the Playwright smoke test. The contact sheets
  are committed on the branch and linked in the PR body.

### 6.12 Gates

1. **No third-party requests,** ever, and no analytics. A browser test checks this.
2. **First playable:** the title plus the prologue in at most 3 MB transferred, interactive within 5 s on a
   throttled 10 Mbps / 100 ms profile, with at most 350 KB of gzipped JS.
3. **Chapters:** each pack at most 8 MB; the whole game at most 45 MB.
4. **Memory:** an estimated ≤ 150 MB of GPU memory per chapter, and no texture larger than 2048². Both are
   checked by the build and by one measured session on Elof's device.
5. **Frame rate:**
   - on Elof's device at *Auto*, p95 frame time ≤ 20 ms over a 10-minute route;
   - on the oldest supported device (iOS 16.4 / Android 10) at *Low*, p95 ≤ 33 ms.
   - Read from the `?debug` overlay.
6. **Lifecycle:** five chapter switches and ten pause/resume cycles with no growth in geometries or textures,
   no sound after pause, and recovery from a lost WebGL context.
7. **Determinism:** the robot finishes every released chapter at 30, 60, 120 and 144 Hz frame schedules with
   identical end states.

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
- **The robot playthrough.** Scripted per-step inputs drive the simulation from a fresh save through every
  released chapter. It asserts that:
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
  - a throttled first-playable measurement;
  - menu snapshots from `dev/menus.html`.
  - Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`, as `skoldhast-shot.mjs` does.
- **By hand**, from a written checklist, on iPad, iPhone and an Android device:
  - audio unlock and the silent switch;
  - the Home Screen install;
  - rotation;
  - resuming after a call;
  - a long play session for heat.

---

## 7. Delivery plan

### 7.1 Roles

- **Olov:**
  - answers §0, and approves likeness (H1b);
  - runs the AI tools for Route A characters, if chosen (one month of Meshy Pro, §0 Q14);
  - organises the photos: the ghost scan, and optionally local stones, cones and moss, plus plates of the real
    places (§0 Q6–Q7);
  - does the device tests (H1a, H2, H3) and reads the Swedish aloud;
  - merges and runs the reveal.
  - Realistic time: about 15–25 hours over three to four months, more if he generates the character models.
- **Emil and Sofie** (👪): consent (§0 Q4), the ghost's photos or a loan of it (§0 Q6), and the real story of the
  first carving if there is one (§0 Q3).
- **Claude Code sessions:**
  - all code, code-built art, the asset pipeline, synthesised audio and tests;
  - `HANDOVER.md` and the "Frågor till Olov" list.
  - Each session ends with `main` still playable.
- **Elof** is the player. His first play of Kapitel 1 is the only real playtest (H4).
- **Moa and Bertil** are testers, if it isn't a surprise for them.

### 7.2 Surprise and release

- **The site is public from the first deploy.** Its address is unlisted, but public.
  - `RELEASED_CHAPTER` decides what can be played.
  - `?dev` shows unfinished work.
  - Unreleased chapters are blank paper on Moa's map (§4.9).
- **H4, the reveal,** is Elof's first play of the Prologue and Kapitel 1:
  - nobody helps for the first 10 minutes;
  - note where he hesitates, laughs or asks.
- **Afterwards, ask him three things:**
  1. What should the ghost be called?
  2. Which candy is the best?
  3. Why does he think the ghost took the bag?

  The first two can become canon in small text patches. The third is just for fun: the story is designed, and
  nothing is promised.

### 7.3 Stages and checkpoints (sizes in agent sessions)

| Stage | Sessions | Deliverable | Olov's checkpoint |
| --- | --- | --- | --- |
| 0a Foundation | 1–2 | Vite + TS + three scaffold, both workflows, a test scene live on Pages, the input port with a greybox Elof, the `?debug` overlay, `dev/menus.html` | Opens the address on Elof's device: it runs |
| 0b Look-dev | 2–3 | The two golden frames (§5.6) built with the layer recipe; quality tiers; both renderers measured on the device | **H1a** (15 min on the device): "Is this the Unravel feeling, and is it smooth?" |
| 0c Characters | 2–3, plus Olov's tool time | Elof by Route A (or B) walking in the greybox; the ghost by scan or model; likeness sheets | **H1b:** likeness yes or no, with at most three corrections |
| 1 Feel | 2–3 | Controller (run, jump, ledge, climb), candy trail and pickup, the lace, the camera, one greybox puzzle, the robot | **H2** (20-min sofa test): are running, jumping and swinging fun for two minutes with no goal? |
| 2 Prolog + Kapitel 1 | 5–7, plus 1 buffer | Everything in §3.4 up to the forest edge. Menus, save, audio v1, hints, album basics. | **H3** (the whole chapter on the device), then **H4** (the reveal) |
| 3 Kapitel 2 | 4–5, plus 1 | The forest kit, ants, the jay, the bubble, Pappa's seesaw | Sofa test, then release |
| 4 Kapitel 3 | 4–6, plus 1 | Water, the cap boat, the beaver, the eddy rescue | Sofa test, then release |
| 5 Kapitel 4 | 4–5, plus 1 | The bog kit, mist, the lollipop light, the crane chick, Mamma's braid | Sofa test, then release |
| 6 Kapitel 5 + Final + Epilog | 6–8, plus 1 | The crane flight over a landscape, the summit, duo puzzles, the aurora, the family, the party, the album credits | A fresh-save playthrough, then release |
| 7 Polish | 2–3 | A Swedish copy-edit, performance on every device, the audio mix, an accessibility pass | — |

- **Total:** about 35–50 sessions. These are guesses until Stage 0 shows what 3D art at this quality costs. 3D
  iterates more slowly than Sköldhästen's code-drawn 2D.
- **The playtest checklist** (H2–H4 and every release): a fresh player retells the story from what they saw.
  Every required puzzle is solved without the third hint, and every chapter is timed.
- **Pivot rules:**
  - A "no" at H1a, H1b or H2 gets one correction session.
  - A second "no" means:
    - at H1a: simplify the look (more painted plates, fewer 3D layers);
    - at H1b: switch to Route B characters;
    - at H2: simplify the controls (*Följ fingret* by default).
  - If by the end of Stage 2 a chapter costs more than about 8 sessions, merge Skogsbäcken into Granskogen
    rather than lower the quality.
- **Dates** (§0 Q5): Stage 0 in October; Stage 1 in early November. Prolog + Kapitel 1 by the first of Advent is
  ambitious; Lucia or Christmas Eve is realistic. The full game in spring 2027.

### 7.4 Tiers and cut order

- **MUST** (never cut):
  - the likeness of Elof and the ghost;
  - the prologue: painting the eyes, the blink, POFF;
  - the candy trail and the bag; the lace;
  - one family helper per chapter;
  - every required puzzle in §4.7;
  - the five memories (still pictures are acceptable);
  - the summit reveal, the sharing and the walk home;
  - Swedish, saving, touch controls, the kindness rules;
  - Low-tier performance.
- **SHOULD:**
  - the album with 20 candy kinds, and the bark sled;
  - Näckens fiol, the lost things, the vittra door, the beach cobbles;
  - album photos as credits;
  - gamepad support, offline play, *Läs upp*, chapter codes.
- **STRETCH:**
  - recorded voices, photo mode, hide-and-seek;
  - a winter epilogue: the giant snowball from the family's photo;
  - playing as Moa or Bertil.
- **Cut order if late:**
  1. hide-and-seek
  2. photo mode
  3. the beach cobbles
  4. the vittra door
  5. the bark sled
  6. Näckens fiol
  7. the lost things
  8. album photos (use stills)
  9. reduce the album to 10 candy kinds
  10. shorten, but keep, the crane flight

  Never cut a MUST; move the date instead.

### 7.5 Session rules (copied into `CLAUDE.md`)

1. **Start:**
   - read `HANDOVER.md`;
   - `npm ci && npm test` (including the robot), and fix a failure first;
   - `npm run dev` and open `?debug` to check that the game starts and plays.
2. **One PR, one visible outcome.** Never start the next chapter's content in the same PR. Change
   `RELEASED_CHAPTER` only to release.
3. **End:**
   - typecheck, tests and the build's size gate pass;
   - `HANDOVER.md` is updated: done, next, decisions, known bugs, and "Frågor till Olov";
   - contact sheets (WebP at 390×844, 844×390, 1180×820 and 1440×900) are under `docs/shots/<chapter>/` and in
     the PR body.
4. **Privacy (§2.6):** never commit the reference photos or sheets, a surname, a house number, or a location
   finer than "Bredbyn". The area name from the brief needs Emil's and Sofie's yes first (§0 Q4).
5. **Licences:** every third-party file is listed in `LICENSES.md` with its source and licence. Allowed: CC0,
   CC-BY (credited), OFL, MIT, BSD and Apache-2.0.
6. **Release timing:** merge at least 15 minutes before Elof plays.

### 7.6 Asset inventory (first estimate)

- **Characters:**
  - Elof: a rig, about 22 clips and 9 expressions;
  - the ghost: 3–4 rigid parts;
  - Pappa, Mamma, Moa and Bertil: close-up giant poses and normal-scale poses, about 6 clips each;
  - young Emil: an Elof variant;
  - the trägubbe: static, plus one blink.
- **Animals:**
  - a ladybird, ants (instanced), the jay, a squirrel cameo;
  - the beaver, an otter cameo, a dipper, water striders;
  - the crane family of three;
  - small fish and insects as life.
- **Nature:** 25–40 kit props per place, 6–10 tiling materials, about 10 backdrop plates, about 6 LUTs.
- **Built things:** the kitchen set, the house and deck, the chopping block and shavings, the paper plane, the
  cap, the boardwalk, the seesaw, the bark sled.
- **Candy:** about 20 kinds, plus trail variants and the 3 magic candies.
- **UI:** the title lettering, about 30 icons, panels, the pieces of Moa's map, album frames.
- **Audio:** the theme in about 8 arrangements with stems, about 10 ambiences, about 80 effects.

### 7.7 Risks

| Risk | What could happen | Mitigation |
| --- | --- | --- |
| AI character models fall short of the sheets | Elof doesn't recognise himself | H1b in Stage 0, before any chapter art; Route B; one correction, then pivot |
| Phone performance | stutter, heat, crashes | `WebGLRenderer`, tiers, budgets, the device bake-off, gates 4–5 |
| Mixed art sources (code, scans, AI) | it looks like a collage | the art bible, golden frames, one grading system, contact-sheet reviews |
| Scope: 3D is slow | late chapters | chapter releases, the cut order, pivot rules, slice-first stages |
| Privacy | personal details public forever | §2.6 and the session rules; references stay out of git |
| iOS quirks | a silent game, lost saves, no fullscreen | the audio rules, the Home Screen install, chapter codes |
| Licences | assets that may not be redistributed | CC0 first; `LICENSES.md` checked in review |
| §0 Q2 answered "normal size" | rework of scale and camera | decide before Stage 0b; menus, controls and tech don't change |

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
| The deploy workflow's action versions (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5) | A research session checked them against the actions' repositories (`git ls-remote`). Re-check when the workflow is written. |

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
    years old with a girth over 3 m. **Proposed as "Berget"** (§0 Q7).
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
