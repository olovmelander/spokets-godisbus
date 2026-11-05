# Äventyr 2: story- och dialogaudit

## Ny genomgång, 5 november 2026

Hela Stormnatten har lästs som en berättelse: samtliga tio kapitels repliker, talare, scener, handlingsknappar,
”Just nu”, återblickar och övergångar. Texten har också jämförts med vad spelaren faktiskt måste göra, kan hoppa
över och ser i bilden. Den tidigare granskningen nedan är historik; denna omgång granskar den senare implementationen.

### Bedömning

Äventyrets starka kärna är att hjälpen går åt båda hållen. Elof räddar ugglan, som sedan bär honom. Familjen
lyser åt Elof, och i finalen tänder han deras lampor. Gamla trägubben minns ensamheten och skyndar efter någon
annan; godiset Elof en gång delade kommer tillbaka som en gåva. Den kärnan behålls och görs tydligare.

Problemen låg framför allt i sambanden mellan repliker och spelhändelser: ledtrådar kunde missas, personer
visste saker innan de hade sett dem, färdvägar saknade förklaring och flera repliker beskrev handlingen utan
att svara på varandra. Förbättringarna finns i spelets innehåll och logik, inte bara i detta dokument.

| Del | Fynd och genomförd förbättring |
| --- | --- |
| Stormkvällen | Elof pratade om godnatt före det obligatoriska ficklampsärendet. Nu bygger skeppsskämtet upp rätt uppgift. Pappa och Elof identifierar den egentäljda och den allra första trägubben. Elof förklarar sitt beslut att bli liten före smakningen. Repliker om den jättestora världen väntar tills krympningen är klar. |
| Stormgården | Bilden av gamla trägubbens ensamhet kunde uppfattas som hans tillstånd just nu. Den beskrivs som en tankebild. Stövelbåten och Klonks kruka får korta skämt som kommer ur det spelaren ser. |
| Stormskogen | Ficklampan lät som det som förstenade Klonk. Nu är orsaken tydligt Pappas blick. Berättelsens förklaring till gamla trägubbens brådska når även ett sparat spel som passerat hålan utan minneskvittot. Ugglan blir en vän Elof talar till. |
| Byn i stormen | Mössan kunde lämnas kvar trots att den återlämnas i finalen. Elof tar den nu uttryckligen med sig, och kapitlet väntar tills den är hämtad. Den som redan passerat får en påminnelse om var den ligger och kan gå tillbaka. Spåret mot Olympia bygger på godiset, inte en osedd vindriktning. Fönsterrepliker fungerar i valfri ordning. |
| Olympia | En replik påstod att ingen boll träffat spelaren, även efter ett missat hopp. Den fungerar nu oavsett hur försöket gick. Bertils frispark blir ett gemensamt litet triumfögonblick; han hjälper också till att identifiera vägen till Flärken. |
| Flärken | Mammas löfte att ro bredvid ”hela vägen” stämde inte med hennes fortsatta bilfärd. Hon väntar vid bryggan och förklarar sedan familjens väg längs ån; Elof svarar med sin egen plan. Utsikten från tornet får ett tydligt syfte. Stenen som sjunker får en varm, kort misslyckandereplik. |
| Älven | ”Sista godiset” kunde motsäga den sparade guldbiten. Elof beskriver nu att det synliga spåret tar slut. Moa möter hans oro med närvaro, och syskonens nya spår ger hoppet en konkret form. Bilresans viktiga repliker väntar på läsaren. |
| Billsta | Vägen genom ladan och upp på berget saknade skäl. Mormor föreslår utsikten över sundet, Elof svarar och ”Just nu” håller fast vid målet. Syskonens godisspår skiljs från gamla trägubbens. Gungbrädans replik beskriver stenen som flyttats. Påminnelsen bekräftar fyndet först när lillgubben landat. |
| Stormens öga | Lamporna har vält och slocknat; familjen ropar ut över vattnet och hör inte Elof vid fötterna. Mormor hjälper honom hitta lamporna. Guldgodiset syns först efter mötet, och Elof känner igen dess magi före smakningen. Båda trägubbarna, inklusive den återlämnade mössan, följer med i hans händer när han växer igen. Morfar säger uttryckligen att de följer med hem till frukost. |
| Morgonen efter | Frukosten återknyter till stövelbåten, morfars ”så liten” och lamporna. Moa frågar om sin lampa, och Elof svarar: ”Du lyste för mig. Jag lyste för dig.” Den lagade haken gäller det aktuella fönstret. Namnet Fjun och avslutningen får ligga kvar som berättelsens landning. |

### Dialogens form

- Elof är nyfiken, uppfinningsrik och ibland orolig; hans slutsatser utgår från vad han sett.
- Moa svarar som en varm storasyster. Bertil är lekfull och lite stolt utan att göra räddningen oviktig.
- De vuxna ger konkret hjälp och trygghet. Klonk behåller sina ordlösa klonk och tankebilder.
- Replikerna hålls inom spelets gräns på 42 tecken. Humor läggs i handlingen: en självkörande stövel,
  en halsdukshiss och en bra sten som är en dålig båt. Rädsla och återförening får också vara stilla.
- Viktiga samtal kontrolleras i den riktiga läskön. Mössfyndet, tackrepliken vid ladan och chokladen måste
  vara läsrepliker; annars kan nästa viktiga replik rensa bort dem innan de visas.

### Kontroll och avgränsning

Regressioner täcker den tidiga promenaden före krympningen, ett saknat minneskvitto i skogen, återvändandet för
mössan från sista sparpunkten, Billstas för tidiga fyndbekräftelse, guldgodisets avslöjande och ordningen fram
till smakningen. Renderkontroller följer de räddade figurerna genom tillväxt, vändning, gång och återupptaget
spel. Webbläsarens riktiga dialogkö kontrollerar fem centrala replikväxlingar, utöver läsknappar och fem skärmstorlekar.
Äldre sparningar kontrolleras också: nya instruktioner om godnatt, ladan och guldgodiset ska inte spelas upp
om spelaren redan har passerat den delen av berättelsen.
Exakta slutresultat för tester, bygge och webbläsarkontroller finns överst i `HANDOVER.md`.

Röstmanuset `scripts/voices-aventyr2.json` följer de nya replikerna och talarna. Inga ljudinspelningar har
genererats. En slutlig bedömning av känsla, lästempo och de privata familjemodellerna på familjens enheter
behöver fortfarande göras av Olov. Automatisk spelning kan visa att händelserna hänger ihop tekniskt, men
kan inte avgöra hur roligt äventyret känns för Elof.

## Tidigare audit, 4 november 2026

Olov asked for an audit of the story, the narrative, all the conversations and all the gameplay, so that the
adventure "verkligen håller och känns som en helhet", is epic, has a red thread, and is fun and kind. This is what
the audit read, what it found and what it changed.

**Method.** The robot played every chapter from Äventyr 1's epilogue to Morgonen efter and wrote down everything
said, in the order a child meets it:
- the lines and who says them;
- the held scenes;
- each change of "Just nu" (its purpose and recap);
- the button words;
- the end cards.

The audit read that script as one story, and then each chapter's puzzles side by side.

## Sammanfattning (på svenska)

**Det som redan bar:**
- tråden från Äventyr 1: Elofs egen trägubbe, Klonk och lavskrikan;
- stormen som blir värre fram till stormens öga;
- blixtarna som visar lillgubben längre och längre bort;
- familjen som letar med lampor, och var och en som hjälper till på sitt sätt;
- ugglan som Elof räddar och som sedan hjälper honom två gånger;
- temat *ingen ska behöva vara ensam i mörkret*.

**Det som glappade, och är rättat:**
1. **Hur Elof tar sig långt.** Flärken ligger sex kilometer norr om Bredbyn, och Billsta tre mil bort. Familjen
   tar nu bilen dit båda gångerna, och det sägs i spelet: "Hoppa in i bilen! Vi åker till Flärken." och "Hoppa
   in, Elof! Vi kör dit med bilen."
2. **Varför gamla trägubben aldrig väntar.**
   - Frågan ställs i Stormgården, och svaret kommer i Stormskogen. Nu säger svaret tydligt vem det gäller och
     varför han skyndar: "Gamla trägubben låg ensam i flera år." och "Därför skyndar han. Lillgubben är ensam!"
   - Efter det ropar Elof inte längre "Vänta på oss!". I Flärken hejar han i stället: "Spring, gamla trägubben!
     Vi kommer!"
   - I Billsta, när de syns på stenen, knyts tråden ihop: "Nu är lillgubben inte ensam längre."
3. **Slutet hänger ihop med morgonen.** I finalen sade morfar att det finns choklad hemma hos dem, och sedan
   vaknade alla hemma hos Elof. Nu följer mormor och morfar med hem: "Vi följer med hem och äter frukost!" Då
   stämmer det med Morgonen efter och med slutkortet.
4. **Samma pussel tre gånger.** "Knuffa något som flyter ut i vattnet som bro" fanns på Olympia (bollen), i
   Flärken (barken) och i Billsta (stocken).
   - Billstas pussel är nu en gungbräda där **Klonk** hoppar på andra änden och kastar Elof över bäcken. Spöket
     som en gång tog godiset hjälper sin vän strax före finalen.
   - Olympias boll sägs inte längre flyta "precis som Klonk". Det motivet hör till barken i Flärken, där trä som
     flyter är hela poängen.
5. **Småsaker:**
   - Mamma "hittade en roddbåt" i Flärken, så det framgår varifrån båten kommer.
   - Elof säger inte "tre mil" två gånger i rad.
   - Mormor välkomnar alla med "Vilken natt! Ni är så modiga, allihop."

## The threads, chapter by chapter (after the audit)

| Thread | Stormkvällen | Stormgården | Stormskogen | Byn | Olympia | Flärken | Älven | Billsta | Stormens öga | Morgonen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The little one | blown out of the window | over the hedge | blown past | his cap in the gutter | across the pitch, north | out over the lake, into the outlet | bobbing far ahead | on a stone in the narrow | found | named Fjun |
| The old one | leaps after him | candy trail; "Varför väntar han aldrig?" | the hollow: he was alone for years, so he hurries | down the hill | sails over the water | "Spring, gamla trägubben!" | on a log ahead | holds the little one: "inte ensam längre" | held him all night; the golden sweet | first on the shelf |
| The family | all go out with lamps | Bertil's boot | Pappa's beam | Moa's umbrella | Bertil's free kick; the car to Flärken | Mamma's boat | Pappa's scarf; the car to Billsta | mormor and morfar | everyone on the shore | breakfast with all |
| Klonk | the last star | blown into a pot | frozen plank; the memory | hops ahead | floats | wood floats | floats beside him | **the seesaw** | at the meeting | "klonk, klonk" |
| Kindness returned | – | – | frees the owl; feeds the jay | – | – | – | the owl carries him | the owl is heard | the owl comes back | – |

The storm rises from the evening to the strongest gust at Olympia and the wildest water at Flärken and Älven, and
falls silent at midnight in the storm's eye. The morning is still and sunny.

## Gameplay, side by side

Every chapter has two to four puzzles of its own and one family help. The robot reaches every goal at 30, 60 and
144 Hz and on Lugnt.

| Chapter | Puzzles | Family help | Ride |
| --- | --- | --- | --- |
| Stormkvällen | the flashlight errand, goodnight | – | – |
| Stormgården | drips by their shadows, gusts behind pots, the tap floats the lid | Bertil's boot boat | boot |
| Stormskogen | falling cones, swaying boughs, the owl's twig | Pappa freezes Klonk into a plank | owl |
| Byn i stormen | the awning bounce, the gutter's leaf, the grate | Moa's umbrella | leaf, umbrella |
| Olympia | the fence, rolling balls, *Sparka* the ball into the goalmouth, the crossbar (side), the targets (optional) | Bertil's free kick | football |
| Flärken | swings, slide, net bounce, sinking reed mats, waves at the posts, the bark | Mamma's boat | – |
| Älven | raft and leaf, bobbing logs, the beaver's stick | Pappa's scarf | raft, leaf, scarf, owl |
| Billsta | the ditch, the barn's loft and roof in the gusts, the brook's stones, **Klonk's seesaw**, Billaberget in the gusts | Morfar's ladder, mormor's lantern | seesaw launch |
| Stormens öga | call the owl, the meeting, the golden sweet | everyone | owl |
| Morgonen efter | the shelf, the latch, the naming | Pappa | – |

**Still repeated, on purpose:**
- The owl carries Elof three times: over the windthrow, over the lake, and out to the stone. The third is the
  climax, and the owl's return is the kindness thread.
- "Look at the shadows" drips come in three places: the garden's gutter, Olympia's benches and Byn's drops. They
  are short and read at once.

## What was not changed

- **Äventyr 1's lines**, because their ElevenLabs voices would no longer match.
- **The chapter order and the release boundary.**
