// Voice generator using ElevenLabs API (v4 model) for "Elof och det stora godisäventyret".
// Reads ELEVENLABS_API_KEY from .env and generates Swedish voice lines with situational audio tags.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ENV_PATH = join(ROOT, '.env');
const OUT_DIR = join(ROOT, 'public', 'audio', 'voices');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const CONFIG_PATH = join(ROOT, 'scripts', 'voices-config.json');

// ElevenLabs v4 model as requested by user
const DEFAULT_MODEL = 'eleven_v4';

/** Load .env without extra dependencies. */
function loadEnv() {
  if (!existsSync(ENV_PATH)) return {};
  const content = readFileSync(ENV_PATH, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const API_KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY || env['serenity-blocks-elevenlabs'];

/** Fetch helper for ElevenLabs API. */
async function elevenFetch(endpoint, options = {}) {
  if (!API_KEY) {
    throw new Error('Missing ElevenLabs API key. Please set ELEVENLABS_API_KEY=sk_... in .env');
  }
  const url = `https://api.elevenlabs.io/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'xi-api-key': API_KEY,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    let parsed;
    try { parsed = JSON.parse(errText); } catch { parsed = errText; }
    throw new Error(`ElevenLabs API error (${res.status}): ${JSON.stringify(parsed, null, 2)}`);
  }
  return res;
}

/** List all available voices in the user's ElevenLabs account. */
async function listVoices() {
  const res = await elevenFetch('/voices');
  const data = await res.json();
  return data.voices || [];
}

/**
 * All dialogue and narration lines in Swedish with situation-specific ElevenLabs v4 tags.
 */
export const VOICE_LINES = [
  // ==========================================
  // ELOF (6-7 year old boy, young child protagonist)
  // ==========================================
  { key: 'again', speaker: 'elof', situation: 'Finishing a challenge', tag: '[cute 6-year-old boy, excited and happy]', text: 'En stjärna till. Nu handlar vi!' },
  { key: 'lake', speaker: 'elof', situation: 'Seeing a puddle while tiny', tag: '[cute little boy in wonder, excited]', text: 'En sjö! Mitt på gatan.' },
  { key: 'shop', speaker: 'elof', situation: 'Arriving at the candy store', tag: '[joyful little boy, sniffing sweet candy]', text: 'Framme! Det luktar godis.' },
  { key: 'shopInside', speaker: 'elof', situation: 'Looking at giant sweets', tag: '[amazed little boy, looking up in awe]', text: 'Godiset är större än jag!' },
  { key: 'shopBag', speaker: 'elof', situation: 'Holding a candy bag to share', tag: '[happy little boy, proud child]', text: 'En påse att dela på!' },
  { key: 'stomp', speaker: 'elof', situation: 'Demanding candy back from ghost', tag: '[stomping small feet, determined child shout]', text: 'Ge tillbaka mitt godis!' },
  { key: 'gardenHome', speaker: 'elof', situation: 'Recognizing home while small', tag: '[relieved little boy, recognizing home]', text: 'Lekstugan! Jag är fortfarande hemma.' },
  { key: 'gardenKota', speaker: 'elof', situation: 'Looking at familiar surroundings', tag: '[gentle little boy, observational]', text: 'Och fjällkåtan står vid björkarna.' },
  { key: 'gardenFound', speaker: 'elof', situation: 'Finding sister\'s leaf drawing', tag: '[happy little boy, discovering]', text: 'En lövteckning! Den är Moas.' },
  { key: 'givesAway', speaker: 'elof', situation: 'Shocked ghost gives away candy', tag: '[puzzled little boy, surprised whisper]', text: 'Spöket ger bort mitt godis!?' },
  { key: 'vittraBerry', speaker: 'elof', situation: 'Offering a lingonberry to little creatures', tag: '[gentle, friendly small boy whisper]', text: 'Ett lingon till er också.' },
  { key: 'forestVittraClue', speaker: 'elof', situation: 'Receiving clue from vittror', tag: '[curious, thoughtful little boy]', text: 'En liten bild från vittrorna.' },
  { key: 'forestTrial', speaker: 'elof', situation: 'Pinecone seesaw trial', tag: '[thinking little boy, working it out]', text: 'Oj! Nästan. Den större väger mer.' },
  { key: 'thanked', speaker: 'elof', situation: 'Ghost thanks him', tag: '[warmly surprised little boy, gentle smile]', text: 'Spöket tackade mig!' },
  { key: 'bogChickLight', speaker: 'elof', situation: 'Guiding lost baby crane in mist', tag: '[soft, comforting little boy whisper]', text: 'Följ mitt ljus hem till din familj.' },
  { key: 'bogLightReturn', speaker: 'elof', situation: 'Discovering open path', tag: '[cheerful discovery, happy little boy]', text: 'Nu går spången åt båda hållen!' },
  { key: 'fetch', speaker: 'elof', situation: 'Understanding ghost\'s mission', tag: '[sudden realization, thoughtful little boy]', text: 'Spöket vill hämta hem min trägubbe!' },
  { key: 'mountainLoop', speaker: 'elof', situation: 'Securing the rope route down', tag: '[satisfied little boy, problem solved]', text: 'Snöret runt röset. En väg ner!' },
  { key: 'eyesAlive', speaker: 'elof', situation: 'Wooden ghost blinks its eyes', tag: '[whispering in awe, breathless little boy]', text: 'Du blinkade! Kan du se mig?' },
  { key: 'starWonder', speaker: 'elof', situation: 'Magic star candy glows', tag: '[in wonder, gentle gasp from a small boy]', text: 'En godisstjärna … den lyser!' },
  { key: 'tinyCall', speaker: 'elof', situation: 'Shrunk small, looking for mom', tag: '[anxious, small 6-year-old boy voice, calling out]', text: 'Mamma? Var är du?' },
  { key: 'notHurt', speaker: 'elof', situation: 'Reassuring mom after shrinking', tag: '[reassuring, slightly overwhelmed small boy]', text: 'Nej. Men allting är jättestort.' },
  { key: 'sameSize', speaker: 'elof', situation: 'Looking at small ghost', tag: '[amazed small boy, slightly nervous laugh]', text: 'Jag är lika liten som spöket!' },
  { key: 'goldInBag', speaker: 'elof', situation: 'Remembering golden sweet', tag: '[hopeful little boy, pointing]', text: 'Det ligger kvar i spökets påse!' },
  { key: 'findBag', speaker: 'elof', situation: 'Ready for the adventure', tag: '[determined, brave 6-year-old child voice]', text: 'Jag följer godiset och hittar påsen!' },
  { key: 'snuck', speaker: 'elof', situation: 'Ghost runs away with candy', tag: '[alert little boy, shouting to family]', text: 'Det smiter!' },
  { key: 'stolenBag', speaker: 'elof', situation: 'Calling for dad\'s help', tag: '[calling out loudly, urgent little boy]', text: 'Pappa! Spöket tog min godispåse!' },
  { key: 'named', speaker: 'elof', situation: 'Naming ghost at the end', tag: '[joyful, affectionate declaration from a little boy]', text: 'Du ska heta Klonk!' },
  { key: 'carved', speaker: 'elof', situation: 'Finishing his first carving', tag: '[proud little boy, beaming with joy]', text: 'Jag kan tälja!' },

  // ==========================================
  // MOA (Big sister, girl)
  // ==========================================
  { key: 'clipBack', speaker: 'moa', situation: 'Getting lost hair clip back', tag: '[delighted, hugging brother]', text: 'Mitt hårspänne! Tack, lillebror!' },
  { key: 'tiny', speaker: 'moa', situation: 'Sees brother shrank', tag: '[startled, gasping in shock]', text: 'Lillebror?! Du är ju pytteliten!' },
  { key: 'rootFingers', speaker: 'moa', situation: 'Ghost goes under tree root', tag: '[worried, trying to reach]', text: 'Där kröp spöket in. Jag får inte plats!' },
  { key: 'gardenReady', speaker: 'moa', situation: 'Paper airplane is folded and ready', tag: '[encouraging, gentle]', text: 'Planet väntar. Vi lyfter när du vill.' },
  { key: 'familyMoa', speaker: 'moa', situation: 'Supporting Elof', tag: '[warm, caring big sister]', text: 'Jag hjälper dig vidare, lillebror.' },
  { key: 'familyMoaPlan', speaker: 'moa', situation: 'Explaining flight path', tag: '[confident, enthusiastic]', text: 'Mitt pappersplan når skogskanten.' },
  { key: 'gardenPocket', speaker: 'moa', situation: 'Dropped drawing under bridge', tag: '[sad, worried sigh]', text: 'Min lövteckning föll under spånbron!' },
  { key: 'gardenThanks', speaker: 'moa', situation: 'Elof rescued her drawing', tag: '[relieved, loving and proud]', text: 'Du hittade den! Vi hjälps åt, lillebror.' },
  { key: 'bagGlitters', speaker: 'moa', situation: 'Noticing glowing magic', tag: '[whispering in awe]', text: 'Två godisar lyser i påsen!' },
  { key: 'sawGlitter', speaker: 'moa', situation: 'Explaining the magic transfer', tag: '[explaining, gentle wonder]', text: 'Spökets magi hamnade i godispåsen.' },
  { key: 'starMagic', speaker: 'moa', situation: 'Explaining why he shrunk', tag: '[gentle explanation, understanding]', text: 'Du smakade på stjärnan. Då blev du liten.' },
  { key: 'mapForYou', speaker: 'moa', situation: 'Drawing a map for brother', tag: '[enthusiastic, creative]', text: 'Jag ritar en karta åt dig!' },
  { key: 'fallenStar', speaker: 'moa', situation: 'Star drops on the deck', tag: '[calling out, pointing excitedly]', text: 'Där! Stjärnan trillade ur spökets påse.' },

  // ==========================================
  // BERTIL (Older brother, boy)
  // ==========================================
  { key: 'marbleBack', speaker: 'bertil', situation: 'Getting his lost marble back', tag: '[excited older brother, shouting happily]', text: 'Kula! Min kula!' },
  { key: 'familyBertil', speaker: 'bertil', situation: 'Offering cap as boat', tag: '[proud, cheerful older brother]', text: 'Min keps blir din båt, lillebror.' },
  { key: 'familyCapReady', speaker: 'bertil', situation: 'Cap floating in stream', tag: '[encouraging, supportive older brother]', text: 'Kliv i när du vill. Jag hejar på dig.' },
  { key: 'heja', speaker: 'bertil', situation: 'Cheering for brother from shore', tag: '[loud cheering, enthusiastic older brother]', text: 'Heja lillebror!' },

  // ==========================================
  // MAMMA SOFIE (Mom, warm woman)
  // ==========================================
  { key: 'familyMamma', speaker: 'mamma', situation: 'Building log bridge over puddle', tag: '[warm, maternal, calm]', text: 'Jag lägger en stock över vattnet.' },
  { key: 'familyBridgeReady', speaker: 'mamma', situation: 'Bridge ready', tag: '[encouraging, reassuring mother]', text: 'Så! Följ stocken över. Jag är nära.' },
  { key: 'familyBraid', speaker: 'mamma', situation: 'Offering hair braid to climb', tag: '[warm, playful and gentle]', text: 'Min fläta blir en stege upp till mig.' },
  { key: 'familyBraidReady', speaker: 'mamma', situation: 'Holding braid steady', tag: '[supportive, encouraging]', text: 'Ta tag i flätan och klättra upp.' },
  { key: 'spangen', speaker: 'mamma', situation: 'Reminder about boardwalk on bog', tag: '[gentle motherly reminder]', text: 'På myren går vi på spången.' },
  { key: 'bogFamilyHome', speaker: 'mamma', situation: 'Crane chick united, offers help', tag: '[pleased, kind]', text: 'Ungen är hemma. Vill du ha en spång?' },
  { key: 'bogBridgeReady', speaker: 'mamma', situation: 'Spång finished over mist', tag: '[warm, satisfied]', text: 'Över dimman, och tillbaka igen.' },
  { key: 'notYet', speaker: 'mamma', situation: 'Catching Bertil sneaking candy', tag: '[loving reprimand, gentle smile]', text: 'Bertil! Godiset öppnar vi ikväll.' },
  { key: 'jayWindow', speaker: 'mamma', situation: 'Bird lands on window sill', tag: '[delighted whisper, looking out]', text: 'Titta! En lavskrika!' },
  { key: 'safeHere', speaker: 'mamma', situation: 'Kneeling by tiny Elof', tag: '[soothing, protective mother]', text: 'Jag är här. Du är inte ensam.' },
  { key: 'dropped', speaker: 'mamma', situation: 'Carving dropped', tag: '[gentle, playful]', text: 'Hoppsan! Vem tappade spöket?' },
  { key: 'hurt', speaker: 'mamma', situation: 'Checking if tiny son is hurt', tag: '[caring, concerned mother]', text: 'Gör det ont?' },
  { key: 'nearYou', speaker: 'mamma', situation: 'Promising to stay close', tag: '[warm promise, soothing]', text: 'Vi är nära dig hela tiden.' },

  // ==========================================
  // PAPPA EMIL (Dad, craftsman, warm man)
  // ==========================================
  { key: 'coinBack', speaker: 'pappa', situation: 'Coin found under deck', tag: '[warm chuckle, generous dad]', text: 'En krona! Den får du behålla.' },
  { key: 'cobbles1', speaker: 'pappa', situation: 'Explaining beach stones on mountain', tag: '[storytelling, gentle dad voice]', text: 'Stenarna på berget var en strand.' },
  { key: 'cobbles2', speaker: 'pappa', situation: 'Explaining ancient ocean', tag: '[calm, educational, gentle]', text: 'Havet nådde ända dit en gång.' },
  { key: 'cobbles3', speaker: 'pappa', situation: 'Explaining round stones', tag: '[gentle, educational]', text: 'Vågorna gjorde dem runda.' },
  { key: 'familyPappa', speaker: 'pappa', situation: 'Ravine too wide to jump', tag: '[calm, caring father]', text: 'Här är för långt att hoppa, Elof.' },
  { key: 'familySeesaw', speaker: 'pappa', situation: 'Building seesaw bridge', tag: '[steady, guiding craftsman]', text: 'Jag håller brädan. Rulla hit en kotte.' },
  { key: 'familySeesawReady', speaker: 'pappa', situation: 'Seesaw ready to launch', tag: '[encouraging, cheerful]', text: 'Bra! Ställ dig på den låga änden.' },
  { key: 'first1', speaker: 'pappa', situation: 'Summit confession about lost carving', tag: '[nostalgic, emotional, soft]', text: 'Min allra första trägubbe …' },
  { key: 'first2', speaker: 'pappa', situation: 'Remembering carving it for Elof', tag: '[deeply loving, tender]', text: 'Den täljde jag till dig' },
  { key: 'first3', speaker: 'pappa', situation: 'When Elof was little', tag: '[tender fatherly memory]', text: 'när du var liten, Elof.' },
  { key: 'first4', speaker: 'pappa', situation: 'Where it got lost years ago', tag: '[gentle sadness, lingering regret]', text: 'Vi tappade den här uppe.' },
  { key: 'newGhost', speaker: 'pappa', situation: 'Offering freshly carved ghost for eyes', tag: '[proud craftsman, warm invitation]', text: 'Jag har täljt ett spöke. Måla ögonen!' },
  { key: 'goldHope', speaker: 'pappa', situation: 'Offering hope to get big again', tag: '[reassuring, gentle confidence]', text: 'Guldgodiset kan göra dig stor igen.' },
  { key: 'onlyWood', speaker: 'pappa', situation: 'Examining ghost before it wakes', tag: '[matter of fact, calm]', text: 'Det är ju bara trä.' },
  { key: 'followTrail', speaker: 'pappa', situation: 'Guiding Elof along candy trail', tag: '[encouraging guidance, warm]', text: 'Följ godisspåret, Elof.' },
  { key: 'away', speaker: 'pappa', situation: 'Teaching woodcarving safety', tag: '[kind teacher, careful instruction]', text: 'Alltid bort från kroppen.' },

  // ==========================================
  // SPÖKET KLONK (Ghost)
  // ==========================================
  { key: 'klonk', speaker: 'spoket', situation: 'Ghost says its name happily', tag: '[playful wooden voice, cheerful]', text: 'Klonk, klonk!' },

  // ==========================================
  // BERÄTTAREN / STORYTELLER (Warm Swedish fairytale narrator)
  // ==========================================
  // Scene cards / Time cards
  { key: 'scene_title', speaker: 'storyteller', situation: 'Game title', tag: '[warm storyteller, inviting, slow pace]', text: 'Elof och det stora godisäventyret.' },
  { key: 'scene_morning', speaker: 'storyteller', situation: 'Prologue opens', tag: '[cozy morning storytelling, soft]', text: 'Lördagsmorgon.' },
  { key: 'scene_garden', speaker: 'storyteller', situation: 'Chapter 1 opens', tag: '[fairytale narrator, peaceful]', text: 'Gården. Klockan tio.' },
  { key: 'scene_granskog', speaker: 'storyteller', situation: 'Chapter 2 opens', tag: '[fairytale narrator, atmospheric]', text: 'Granskogen. Halv tolv.' },
  { key: 'scene_myren', speaker: 'storyteller', situation: 'Chapter 3 opens', tag: '[mysterious, gentle mist narrator]', text: 'Myren. Halv fem.' },
  { key: 'scene_berget', speaker: 'storyteller', situation: 'Chapter 4 opens', tag: '[grand, quiet mountain narrator]', text: 'Berget. Klockan sex.' },
  { key: 'scene_norrsken', speaker: 'storyteller', situation: 'Finale opens', tag: '[magical, awe-inspiring narrator]', text: 'Norrskenet. I skymningen.' },
  { key: 'scene_epilog', speaker: 'storyteller', situation: 'Epilogue opens', tag: '[warm, cozy home narrator]', text: 'Godiskalaset. Klockan nio.' },
  { key: 'scene_byn', speaker: 'storyteller', situation: 'Bonus chapter opens', tag: '[cheerful village stroll narrator]', text: 'Byn. En vecka senare.' },

  // Pappas minnen (Memories captions)
  { key: 'memory_garden_1', speaker: 'storyteller', situation: 'Memory 1, slide 1', tag: '[warm nostalgia, gentle pace]', text: 'Pappa täljer en liten trägubbe. Elof tittar på.' },
  { key: 'memory_garden_2', speaker: 'storyteller', situation: 'Memory 1, slide 2', tag: '[warm nostalgia, gentle pace]', text: 'Pappa ger trägubben till Elof. Den är gjord bara för honom.' },
  { key: 'memory_garden_3', speaker: 'storyteller', situation: 'Memory 1, slide 3', tag: '[warm nostalgia, smiling]', text: 'Det är Elof som liten! Trägubben blir hans vän.' },

  { key: 'memory_granskog_1', speaker: 'storyteller', situation: 'Memory 2, slide 1', tag: '[warm nostalgia, storytelling]', text: 'Elof tar med trägubben på familjens skogspromenad.' },
  { key: 'memory_granskog_2', speaker: 'storyteller', situation: 'Memory 2, slide 2', tag: '[warm nostalgia, cozy]', text: 'Elof sätter sin vän på en stubbe. De delar på lördagsgodiset.' },
  { key: 'memory_granskog_3', speaker: 'storyteller', situation: 'Memory 2, slide 3', tag: '[warm nostalgia, tender]', text: 'En godis till dig, en till mig. Pappa tar ett foto.' },

  { key: 'memory_myren_1', speaker: 'storyteller', situation: 'Memory 3, slide 1', tag: '[warm nostalgia, storytelling]', text: 'Familjen går över myren. Elof åker på Pappas axlar.' },
  { key: 'memory_myren_2', speaker: 'storyteller', situation: 'Memory 3, slide 2', tag: '[warm nostalgia, tender]', text: 'Elof lyfter trägubben så att den också får se.' },
  { key: 'memory_myren_3', speaker: 'storyteller', situation: 'Memory 3, slide 3', tag: '[warm nostalgia, looking into distance]', text: 'Långt borta syns berget med den gamla tallen. Dit är de på väg.' },

  { key: 'memory_berget_1', speaker: 'storyteller', situation: 'Memory 4, slide 1', tag: '[gentle storytelling, quiet tone]', text: 'Vid den gamla tallen ställer Elof trägubben på en sten.' },
  { key: 'memory_berget_2', speaker: 'storyteller', situation: 'Memory 4, slide 2', tag: '[soft, slight suspense, dramatic]', text: 'En vindpust! Trägubben faller ner i en djup spricka.' },
  { key: 'memory_berget_3', speaker: 'storyteller', situation: 'Memory 4, slide 3', tag: '[tender sadness, quiet child kindness]', text: 'Elof lämnar sin sista godis vid sprickan, till sin vän.' },
  { key: 'memory_berget_4', speaker: 'storyteller', situation: 'Memory 4, slide 4', tag: '[poignant, gentle and wistful]', text: 'Familjen måste gå hem. Trägubben blir ensam kvar på berget.' },

  // Story endings
  { key: 'end_epilog', speaker: 'storyteller', situation: 'Story closing card', tag: '[tender, emotionally resonant fairytale conclusion]', text: 'Klonk kunde inte säga det med ord. Men Elof förstod.' },
  { key: 'end_window', speaker: 'storyteller', situation: 'Final moonlight card', tag: '[gentle, magical bedtime ending]', text: 'Elofs lilla trägubbe står i månljuset. Dess målade ögon blinkar.' },
  { key: 'end_byn', speaker: 'storyteller', situation: 'Bonus chapter closing', tag: '[cheerful, contented stroll home]', text: 'Lördagsgodiset är köpt. Nu går vi hem.' },
];

/** Load voice configuration (voice ID per character). */
function loadVoiceConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      // ignore
    }
  }
  return {
    model_id: DEFAULT_MODEL,
    voices: {
      elof: '',        // Voice ID for Elof (boy, child)
      moa: '',         // Voice ID for Moa (girl, older sister)
      bertil: '',      // Voice ID for Bertil (boy, older brother)
      mamma: '',       // Voice ID for Mamma Sofie (warm woman)
      pappa: '',       // Voice ID for Pappa Emil (craftsman man)
      storyteller: '', // Voice ID for Berättaren (warm Swedish storyteller)
      spoket: '',      // Voice ID for Spöket (optional, playful)
    },
  };
}

/** Synthesize a line using ElevenLabs TTS with directional tags. */
async function synthesizeLine(voiceId, textWithTag, modelId = DEFAULT_MODEL) {
  const endpoint = `/text-to-speech/${voiceId}`;
  const res = await elevenFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: textWithTag,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

// CLI actions
const args = process.argv.slice(2);
const command = args[0] || '--dry-run';

async function main() {
  console.log('======================================================');
  console.log(' Elof och det stora godisäventyret – Voice Generator');
  console.log(' ElevenLabs model: ' + DEFAULT_MODEL);
  console.log('======================================================\n');

  if (command === '--list-voices') {
    console.log('Ansluter till ElevenLabs för att hämta tillgängliga röster...\n');
    try {
      const voices = await listVoices();
      console.log(`Hittade ${voices.length} röster i ditt konto:\n`);
      for (const v of voices) {
        const labels = Object.entries(v.labels || {}).map(([k, val]) => `${k}:${val}`).join(', ');
        console.log(`• ID: "${v.voice_id}"  -->  Namn: ${v.name} (${v.category || 'allmän'})${labels ? ' [' + labels + ']' : ''}`);
      }
      console.log(`\nUppdatera filen "scripts/voices-config.json" med önskade röst-ID:n för varje karaktär.`);
    } catch (err) {
      console.error('Fel vid hämtning av röster:', err.message);
    }
    return;
  }

  if (command === '--dry-run') {
    const config = loadVoiceConfig();
    console.log(`Totalt antal repliker och berättarrader: ${VOICE_LINES.length}`);
    const bySpeaker = {};
    for (const line of VOICE_LINES) {
      bySpeaker[line.speaker] = (bySpeaker[line.speaker] || 0) + 1;
    }
    console.log('\nFördelning per karaktär:');
    for (const [speaker, count] of Object.entries(bySpeaker)) {
      const assigned = config.voices[speaker] ? `(Röst-ID: ${config.voices[speaker]})` : '(Inget röst-ID valt än)';
      console.log(`  • ${speaker.padEnd(12)}: ${count} rader  ${assigned}`);
    }
    console.log('\nExempel på repliker med ElevenLabs v4 situationstaggar:');
    for (const line of VOICE_LINES.slice(0, 8)) {
      console.log(`  [${line.speaker.padEnd(11)}] ${line.tag} "${line.text}"`);
    }
    console.log(`  ... och ${VOICE_LINES.length - 8} fler rader.\n`);
    console.log('Kommandon:');
    console.log('  node scripts/generate-voices.mjs --list-voices  (Lista rösterna i ditt ElevenLabs-konto)');
    console.log('  node scripts/generate-voices.mjs --generate     (Generera ljudfiler med ElevenLabs v4)');
    return;
  }

  if (command === '--generate') {
    const config = loadVoiceConfig();
    mkdirSync(OUT_DIR, { recursive: true });

    let manifest = {};
    if (existsSync(MANIFEST_PATH)) {
      try { manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
    }

    const limitArg = args.indexOf('--limit');
    const maxItems = limitArg !== -1 && args[limitArg + 1] ? parseInt(args[limitArg + 1], 10) : Infinity;

    console.log(`Startar röstgenerering med modell "${config.model_id || DEFAULT_MODEL}" (max: ${maxItems === Infinity ? 'alla' : maxItems})...`);
    let generated = 0;
    let skipped = 0;

    for (const item of VOICE_LINES) {
      if (generated >= maxItems) break;

      const voiceId = config.voices[item.speaker];
      if (!voiceId) {
        console.warn(`[Hoppar över] Inget röst-ID inställt för "${item.speaker}" (replik: ${item.key})`);
        skipped++;
        continue;
      }

      const outPath = join(OUT_DIR, `${item.key}.mp3`);
      const fullPrompt = `${item.tag} ${item.text}`;

      if (
        existsSync(outPath) &&
        manifest[item.key]?.text === item.text &&
        manifest[item.key]?.voiceId === voiceId &&
        manifest[item.key]?.tag === item.tag
      ) {
        console.log(`[Cache] Redan genererad: ${item.key}`);
        continue;
      }

      console.log(`[Genererar] ${item.speaker} (${item.key}): ${fullPrompt}`);
      try {
        const audioData = await synthesizeLine(voiceId, fullPrompt, config.model_id || DEFAULT_MODEL);
        writeFileSync(outPath, audioData);
        manifest[item.key] = {
          speaker: item.speaker,
          text: item.text,
          tag: item.tag,
          voiceId,
          generatedAt: new Date().toISOString(),
        };
        writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
        generated++;
        // Polite delay between API calls
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Fel vid generering av ${item.key}:`, err.message);
      }
    }

    console.log(`\nKlar! Genererade: ${generated}, Hoppade över: ${skipped}`);
  }
}

main().catch(console.error);
