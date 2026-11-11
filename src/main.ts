import { keepsakesFound, memoryFound, STORM_MEMORIES } from './content/collections';
import { CONE_REACTIONS } from './content/aventyr2/lines/stormskog';
import { Timer } from 'three';
import { Pointing } from './app/pointing';
import { Tutorial } from './app/tutorial';
import { createTutorial } from './ui/tutorial';
import { createFingerMarks } from './ui/finger';
import { MOTION_QUERY, applyMotion, lessMotion } from './platform/motion';
import { Game } from './app/game';
import { createHomeConsole, homeConsoleAvailable } from './app/home-console';
import { STEP } from './sim/constants';
import { createAudio } from './audio/audio';
import { arrangementFor } from './audio/music';
import { cuesFor, footingAt, newCueMemory, type Heard } from './audio/cues';
import { pauseVoice, resumeVoice, setVoiceSettings, voicePosition } from './audio/voice-player';
import { ADVENTURE2, BONUS, STORY, bonusAfter, chapterNumber, courseAvailable, courseFor, courseId, courseQuery, isAdventure2, loadAdventure2, loadLookCourses, LOOK_IDS, nextAvailable } from './content/chapters';
import { album, albumComplete, foundFlag, KINDS } from './content/kinds';
import { lostFlag, lostFound } from './content/lost';
import { cobbleMemory } from './content/cobbles';
import { createPhotoMoments } from './content/photos';
import { albumHtml } from './ui/album';
import { mapSvg, mapState } from './ui/map';
import { createMemory, memoryAlbumHtml } from './ui/memory';
import { createEnding } from './ui/ending';
import { createExplore } from './ui/explore';
import { sv } from './content/sv';
import { storyContext, storyHandoff } from './content/story-context';
import type { Person } from './content/people';
import { createStoryContext } from './ui/story-context';
import { createInput, type Device } from './input/input';
import { createAutoTier, createDynamicResolution, tierFromQuery } from './render/quality';
import { createView, type View } from './render/view';
import type { TalkFrame } from './render/talk';
import { changeStyle, settingsFor, simOptions, tempoOf, type PlayStyle, type Settings } from './save/settings';
import { codeFor } from './save/codes';
import { createStore, newSave, type PlayerSave } from './save/store';
import { createPhotoStore } from './save/photos';
import { exploreChapter, ghostNamed, rememberFlags, storyFinished, visitChapter } from './save/journey';
import { markOnward, takeOnward } from './save/onward';
import { keysLearned, learnKeys } from './save/keys';
import type { SimStart, Speaker, Vec } from './sim/types';
import type { Debug } from './ui/debug';
import { createHud } from './ui/hud';
import { createPause, type PausePage } from './ui/pause';
import { mountShell } from './ui/shell';
import { wireUiSound } from './ui/ui-sound';
import { hintHtml } from './ui/keys';
import { applyMaterials, applyPlace } from './ui/materials';
import { createTitle } from './ui/title';
import { createPhotoAlbum } from './ui/photos';
import { createOffline } from './platform/offline';
import { createStoryPanel } from './ui/story';
import { createSceneUi } from './ui/scene';
import { openingCues, openingQuiet } from './audio/opening';
import { endsInScene, sceneBeats, sceneWaits } from './sim/scene';
import { createDevicePlay, createHighLanding, isAndroid, isApple } from './platform/device';
import './ui/ui.css';
import './ui/home-console.css';

declare global {
  interface Window {
    /** Only with ?debug: what the browser tests and a session read. */
    __godis?: {
      state(): Record<string, unknown>;
      info(): Record<string, unknown>;
      screen(at: Vec): Vec | null;
    };
  }
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
/** How long the coda plays before the last page, and when one of the family answers in it, in seconds. */
const CODA = 4.6;
const CODA_ANSWER = 1.6;
/** Who answers from afar as each chapter ends; null is all four together. */
const CODA_FAMILY: Record<string, Person | null> = { garden: 'moa', granskog: 'bertil', myren: 'mamma', berget: 'pappa', norrsken: null, byn: 'mamma' };
/** Every chapter of the story, the extra one and Äventyr 2's, once its pack is in. */
const storyChapters = () => [...STORY, ...BONUS, ...ADVENTURE2];
const benchOn = params.has('bench');
const debugOn = params.has('debug') || benchOn;

/**
 * The one screen a family sees when something breaks (docs/ux-audit/menus.md row 19): the loading card's ghost,
 * what happened, a line for the grown-up when there is one, and a button that does what it says. With no button
 * (null), nothing a press could mend; `waiting`, the picture is on its way back and the ghost bobs meanwhile.
 */
function showMessage(text: string, button: string | null = sv.retry, action: () => void = () => location.reload(), more?: string, waiting = false): void {
  byId('messageText').textContent = text;
  byId('messageMore').textContent = more ?? '';
  byId('messageMore').hidden = !more;
  const element = byId<HTMLButtonElement>('messageButton');
  element.textContent = button ?? '';
  element.hidden = button === null;
  element.disabled = button === null;
  element.onclick = action;
  const message = byId('message');
  const ghost = byId('messageGhost');
  if (!ghost.hasChildNodes()) {
    const loadingGhost = document.querySelector('#loading svg');
    if (loadingGhost) ghost.append(loadingGhost.cloneNode(true));
  }
  // This also works for pack failures before the input controller is created.
  message.onkeydown = (event) => {
    if (event.key === 'Tab') { event.preventDefault(); (button === null ? message : element).focus(); }
  };
  message.classList.toggle('waiting', waiting);
  message.hidden = false;
  byId('loading').classList.add('done');
  (button === null ? message : element).focus();
}

/** With ?debug, ?at=x,y starts Elof there instead of at the chapter's start: for looking at one place. */
function debugStart(): Vec | null {
  const [x, y] = debugOn ? (params.get('at') ?? '').split(',').map(Number) : [];
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/** `localStorage`, or null where the browser refuses it: private windows, blocked storage. */
function storage(): Storage | null {
  try {
    const found = window.localStorage;
    found.getItem('godisbus.v1.index');
    return found;
  } catch {
    return null;
  }
}

async function start(): Promise<void> {
  const at = debugStart();
  // The saved game (plan §6.9). ?bench plays without one, and a debug start position never writes one.
  const store = createStore(benchOn ? null : storage());
  const loaded = store.load();
  // The debug panel and the bench come in their own small chunk, for a session that asks for them.
  const devtools = debugOn ? await import('./ui/devtools') : null;
  // Äventyr 2 is a pack of its own (docs/aventyr-2.md): fetched when this page plays it, leads on to it, or the
  // first adventure is done, so that its chapters are there to choose. Without it the first adventure plays on.
  const asked = params.get('course');
  // Invalid links follow the saved chapter, just as courseFor does after the pack has loaded.
  const wanted = courseId(asked && courseAvailable(params, asked) ? asked : (loaded.kind === 'save' ? loaded.save.chapter : ''));
  if (isAdventure2(wanted) || wanted === 'byn' || (loaded.kind === 'save' && storyFinished(loaded.save.flags))) {
    try { await loadAdventure2(); }
    catch {
      // An optional next adventure may wait, but a requested one must never be replaced by the prologue.
      // No simulation or autosave is installed until its chapter data is available.
      if (isAdventure2(wanted) && courseAvailable(params, wanted)) {
        mountShell(document.body);
        showMessage(sv.loadFailed);
        return;
      }
    }
  }
  if (LOOK_IDS.includes(wanted)) await loadLookCourses().catch(() => undefined);
  // The profile store supplies its stable ID; older single-player saves use the original Elof ID.
  const photoPlayer = store.currentId;
  let database: IDBFactory | null = null;
  try { database = !benchOn && !at ? window.indexedDB : null; } catch { /* An album without photos. */ }
  const photoStore = createPhotoStore(database, storage());
  let photosStopped = false;
  async function clearSavedPhotos(): Promise<boolean> {
    // Cancel any encoder still finishing a frame before the profile is reset.
    photosStopped = true;
    const cleared = await photoStore.clear(photoPlayer);
    if (!cleared) photosStopped = false;
    return cleared;
  }
  const course = courseFor(params, loaded.kind === 'save' ? loaded.save.chapter : null);
  const canEnter = (id: string) => courseAvailable(params, id);
  // Merely opening the public fallback must not move a development save backwards.
  let keepSavedPosition = loaded.kind === 'save' && !canEnter(loaded.save.chapter);
  const chapter = at ? { ...course, spawn: at } : course;
  let save: PlayerSave = loaded.kind === 'save' ? loaded.save : newSave(Date.now(), chapter.id);
  let settings: Settings = debugOn && params.get('style') === 'lugnt' ? settingsFor('lugnt') : save.settings;
  // Less motion is one switch, from Mindre rörelse or the device (src/platform/motion.ts).
  window.matchMedia(MOTION_QUERY).addEventListener('change', () => applyMotion(document, settings.calm));
  // A URL tier is a temporary inspection override. A deliberate menu choice replaces it.
  let requestedGraphics = tierFromQuery(params.get('tier')) ?? settings.graphics;
  mountShell(document.body, chapter.helper?.kind);
  // Moa's paper and Pappa's linden, drawn once; and the place's own shade under every panel (style-and-sound.md rows 10, 15).
  applyMaterials(document);
  applyPlace(document, chapter.place);
  // The recovery screen shows the loading card's ghost: the screen still belongs to the game.
  const loadingGhost = document.querySelector('#loading svg');
  if (loadingGhost) {
    byId('messageGhost').append(loadingGhost.cloneNode(true));
    byId('titleUpdatingGhost').append(loadingGhost.cloneNode(true));
  }
  const storyReminder = createStoryContext(document);
  const canvas = byId<HTMLCanvasElement>('game');
  canvas.tabIndex = -1;
  // The picture is named for a screen reader: the place, as its card says it, and what he is doing now
  // (docs/ux-audit/access-and-devices.md row 19). Set below whenever what he is doing changes.
  canvas.setAttribute('role', 'img');
  let pictureSaid = '';
  const devicePlay = createDevicePlay({
    userAgent: navigator.userAgent,
    requestWakeLock: navigator.wakeLock ? () => navigator.wakeLock.request('screen') : undefined,
    vibrate: typeof navigator.vibrate === 'function' ? (ms) => navigator.vibrate(ms) : undefined,
  });
  const highLanding = createHighLanding();
  byId('vibrationSetting').hidden = !isAndroid(navigator.userAgent) || typeof navigator.vibrate !== 'function';
  // Rows only where they work (docs/ux-audit/menus.md row 10): the silent switch is an iPhone's, and the
  // home-screen help is for a phone or a tablet that doesn't already run the game from its home screen.
  byId('loudSetting').hidden = !('audioSession' in navigator);
  const apple = isApple(navigator.userAgent, navigator.maxTouchPoints);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  byId('homeScreenHelp').hidden = standalone || (!apple && !isAndroid(navigator.userAgent));
  byId('homeScreenSteps').textContent = apple ? sv.homeScreen.apple : sv.homeScreen.android;
  // Where the browser offers to install the game (Android), Pause has a button for it, in place of the steps.
  type InstallOffer = Event & { prompt(): Promise<void>; userChoice: Promise<unknown> };
  let installOffer: InstallOffer | null = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installOffer = event as InstallOffer;
    byId('installBtn').hidden = false;
    byId('homeScreenHelp').hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installOffer = null;
    byId('installBtn').hidden = true;
  });
  byId('installBtn').addEventListener('click', () => {
    const offer = installOffer;
    if (!offer) return;
    installOffer = null;
    byId('installBtn').hidden = true;
    void offer.prompt().then(() => offer.userChoice).catch(() => { /* Declined, or the offer went stale. */ });
  });
  // The chapter's own code, as its card shows it, to open the place on another device (menus.md row 6).
  const ownCode = codeFor(chapter.id);
  byId('pauseCode').hidden = !ownCode;
  byId('pauseCodeWords').textContent = ownCode ?? '';
  const fullscreen = byId<HTMLButtonElement>('fullscreenBtn');
  fullscreen.hidden = !isAndroid(navigator.userAgent) || !document.fullscreenEnabled || typeof document.documentElement.requestFullscreen !== 'function';
  fullscreen.addEventListener('click', () => {
    // This is always a deliberate button gesture. No orientation lock or automatic fullscreen.
    byId('fullscreenFailed').hidden = true;
    try {
      const operation = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      void operation.catch(() => { byId('fullscreenFailed').hidden = false; });
    } catch { byId('fullscreenFailed').hidden = false; }
  });
  document.addEventListener('fullscreenchange', () => {
    byId('fullscreenWord').textContent = document.fullscreenElement ? sv.pause.exitFullscreen : sv.pause.fullscreen;
  });
  let bootReady = false;
  let contextLost = false;
  let view: View;
  try {
    // ?standin keeps the figures built in code: for pictures that go into the repository (plan §2.6).
    // With ?debug, &life=moose puts that kind of the far scenery's life on stage at once (render/life.ts).
    // Each visit has its own far life (what comes in some visits only). A debug session has the same every
    // time, or the one &seed= names, so that pictures and tests can be taken again.
    view = createView(canvas, chapter, requestedGraphics === 'auto' ? null : requestedGraphics, params.has('standin'), debugOn,
      debugOn ? { now: params.get('life'), seed: Number(params.get('seed')) || 0 } : { seed: Math.random() * 1000 });
  } catch (error) {
    console.error(error);
    showMessage(sv.noWebGL, null, undefined, sv.noWebGLMore);
    return;
  }

  // What he found under the deck comes with him to the party in the epilogue (plan §4.8, O2).
  // In a debug session, ?flags=a,b starts with those set: a moment late in a chapter can be looked at alone.
  const seeded = debugOn ? (params.get('flags') ?? '').split(',').filter((flag) => flag !== '') : [];
  const carried = [...(chapter.id === 'epilog' ? [...lostFound(save.flags).map(lostFlag), ...cobbleMemory(save.flags)] : []), ...seeded];
  const startCheckpoint = at
    ? -1
    : (courseId(save.chapter) === chapter.id ? save.checkpoint : (save.checkpoints?.[chapter.id] ?? -1));
  const chapterFlags = (save.flags[chapter.id] ?? []).filter((flag) => {
    if (flag === 'goal') return false;
    // When starting a chapter from its beginning, in-chapter spoken remarks and the scene card
    // must not be silenced by flags saved from an earlier completion.
    if (startCheckpoint < 0 && (flag.startsWith('scene:') || (flag.startsWith('beat:') && flag !== 'beat:named'))) return false;
    return true;
  });
  const from: SimStart =
    at
      ? (carried.length > 0 ? { flags: carried } : {})
      : {
          checkpoint: startCheckpoint,
          collected: save.candy[chapter.id] ?? [],
          side: save.side?.[chapter.id] ?? [],
          placed: save.placed[chapter.id] ?? [],
          flags: [...chapterFlags, ...carried],
        };

  const game = new Game(chapter, simOptions(settings), from);
  const photoMoment = createPhotoMoments(chapter.id, game.sim.flags);
  game.tempo = tempoOf(settings);
  const pointing = new Pointing(game.sim);
  const tutorial = new Tutorial(chapter.id);
  const tutorialView = createTutorial(document);
  const fingerMarks = createFingerMarks(document);
  // In Äventyr 2 he has had his name all along.
  const isKlonk = () => ghostNamed(save.flags) || !!chapter.named || (chapter.id === 'epilog' && game.sim.flags.has('beat:named'));
  // Who has said each line, as its bubble shows: their wordless sound goes with it (src/audio/cues.ts).
  const voiced: Speaker[] = [];
  // The bag counts all the candy there is: the trail's, and the side candy off it.
  const hud = createHud(document, chapter.candy.length + (chapter.side?.length ?? 0), isKlonk,
    () => (settings.slower ? 1.25 : 1) * (settings.bigText ? 1.2 : 1),
    // Something to use has come in reach: one soft knock of wood (in-play.md row 7).
    () => audio.ui('press'),
    (who) => voiced.push(who),
    // Seeing a bubble is not finishing it. The stable receipt gates story consequences and saving,
    // while ordinary walking, jumping and collecting remain independent of the conversation.
    (id) => game.sim.acknowledge(id));
  const story = createStoryPanel(document, {
    named: isKlonk,
    answer(answer) {
      if (platformBlocked()) return false;
      if (!game.sim.finishStory(answer)) return false;
      if (answer.kind === 'paint') hud.notice(sv.painting.painted);
      else if (answer.kind === 'carve') hud.notice(sv.carving.carved);
      else hud.notice((answer.kind === 'party' ? sv.party.thanks : sv.sharing.thanks)
        .replace('{friend}', answer.friend === 'spoket' && isKlonk() ? sv.ghostName : answer.kind === 'party' ? sv.party.friends[answer.friend] : sv.sharing.friends[answer.friend])
        .replace('{sweet}', sv.sharing.a[answer.sweet]));
      writeSave();
      // The next step at the same place follows in the same panel.
      if (game.sim.story) return true;
      input.release();
      game.resume();
      canvas.focus();
      return true;
    },
    next: () => game.sim.story,
    cancel() { game.sim.cancelStory(); input.release(); game.resume(); canvas.focus(); },
  });
  // What is said along the way, and in the chapter's scenes (src/sim/scene.ts).
  const beats = new Map([...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)].map((beat) => [beat.id, beat]));
  const advanceStory = () => {
    if (menuOpen() || platformBlocked() || !hud.advance()) return;
    // The press belongs to the words. It must never also jump, walk or use something in the world.
    pointing.cancel();
    askedForUse = askedForHelp = false;
    input.release();
    game.resume();
    canvas.focus();
  };
  const sceneUi = createSceneUi(document, advanceStory);
  // What was said before this game was taken up again is not said again.
  let told = game.sim.said.length;
  let reactedToCone = game.sim.knocks;
  let coneReaction = 0;
  let sceneHeard: string | null = null;
  let scoredScene = game.sim.sceneFrame;
  let bagTorn = game.sim.flags.has('bag:torn');
  const controls = byId('controls');
  const hint = byId('hint');

  // Sound starts with the first tap, click or key: browsers allow it no earlier (plan §6.8).
  const audio = createAudio();
  audio.sleep(true);
  // Every press in a menu sounds: wood, paper and crayon, in the place's key (style-and-sound.md row 20).
  wireUiSound(document, (sound) => audio.ui(sound));
  /** What the settings change outside the simulation: the sound, and the page's looks. */
  const apply = () => {
    audio.setEffects(settings.sound ? settings.effectsVolume : 0);
    audio.setMusic(settings.music ? settings.musicVolume : 0);
    audio.setLoud(settings.loud);
    setVoiceSettings(settings.sound, settings.effectsVolume);
    document.body.classList.toggle('lefty', settings.lefty);
    document.body.classList.toggle('big-text', settings.bigText);
    applyMotion(document, settings.calm);
    document.body.classList.toggle('follow-finger', settings.followFinger);
  };
  apply();
  // Each part of the story plays the tune in its own way, and has its own air (plan §5.8).
  audio.setPlace(arrangementFor(chapter.id, chapter.place));
  for (const type of ['pointerup', 'click', 'keydown', 'touchend']) window.addEventListener(type, () => audio.unlock());
  const memory = newCueMemory();
  let playTime = 0;
  const hear = (): Heard => {
    const p = game.sim.curr;
    return {
      time: playTime, mode: p.mode, grounded: p.grounded, x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      candy: game.sim.candyCount, checkpoint: game.sim.checkpoint, bubbles: game.sim.bubbles,
      atGoal: game.sim.flags.has('goal'), moving: game.sim.movers.filter((m) => m.t < 1).length,
      shadows: game.sim.drips.map((d) => d.shadow), drips: game.sim.drips,
      notes: (chapter.spots ?? []).filter((spot) => spot.id.startsWith('note:') && spot.note === undefined && game.sim.flags.has(spot.id)).length,
      noteHits: game.sim.noteHits,
      found: [...game.sim.flags].filter((flag) => flag.startsWith('found:') || flag.startsWith('lost:')).length,
      footing: footingAt(chapter, p.x),
      said: [...voiced],
      ghostPerch: game.sim.ghost?.perch ?? 0,
      ghostAway: game.sim.ghost ? Math.hypot(game.sim.ghost.x - p.x, game.sim.ghost.y - p.y) : 99,
      helpStep: game.sim.help.step,
      bounces: game.sim.bounces,
      calls: (chapter.spots ?? []).filter((spot) => spot.verb === 'call' && game.sim.flags.has(spot.id)).map((spot) => ({ id: spot.id, word: spot.word })),
      wind: game.sim.gusts.some((gust, i) => gust.blow > 0 && p.x > chapter.gusts![i]!.from - 12 && p.x < chapter.gusts![i]!.to + 12),
    };
  };
  let heard = hear();

  /** True once the saved game has been given up: nothing more is written before the page loads again. */
  let again = false;
  let begun = loaded.kind === 'save';
  let titleSettings = false;
  let profileMutationPending = false;
  let saveWarningShown = !store.available;
  let playedFrom = performance.now();
  /** Writes the game as it stands: at every big candy, on pause, and when the page is hidden. */
  function writeSave(): void {
    const now = performance.now();
    save = {
      ...save,
      updated: Date.now(),
      settings,
      chapter: keepSavedPosition ? save.chapter : chapter.id,
      checkpoint: keepSavedPosition ? save.checkpoint : game.sim.checkpoint,
      checkpoints: { ...save.checkpoints, [chapter.id]: Math.max(save.checkpoints?.[chapter.id] ?? -1, game.sim.checkpoint) },
      candy: { ...save.candy, [chapter.id]: game.sim.collected.flatMap((got, i) => (got ? [i] : [])) },
      side: { ...save.side, [chapter.id]: game.sim.collectedSide.flatMap((got, i) => (got ? [i] : [])) },
      placed: { ...save.placed, [chapter.id]: game.sim.placed },
      flags: { ...save.flags, [chapter.id]: rememberFlags(save.flags[chapter.id] ?? [], game.sim.flags, chapter.id)
        .filter((flag) => !flag.startsWith('beat:') || !game.sim.pendingDialogue.has(flag.slice(5))) },
      playMs: save.playMs + (now - playedFrom),
    };
    playedFrom = now;
    if (!at && !again && loaded.kind !== 'unreadable' && !store.write(save) && !saveWarningShown && !benchOn) {
      saveWarningShown = true;
      hud.notice(sv.saveOff, 7);
    }
  }
  // Through the HUD, like every other tag: it never lies over what is being said (in-play.md row 18).
  if (saveWarningShown && !benchOn) hud.notice(sv.saveOff, 7);

  // The on-screen controls follow the device in use, not the kind of computer (plan §4.1).
  let device: Device = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  const showDevice = (d: Device) => {
    device = d;
    // The key reference, once a key or a pad has been used (menus.md row 10).
    if (d !== 'touch') byId('controlsReferenceBtn').hidden = false;
    controls.hidden = d !== 'touch';
    hint.hidden = d === 'touch';
    hint.innerHTML = hintHtml(d === 'pad' ? sv.padHint : sv.keysHint);
    // Which hand is in use, for what shows only to keys and pads: the prompt with what E (or X) will do.
    document.body.dataset.device = d;
    byId('keyPromptKey').textContent = d === 'pad' ? 'X' : 'E';
  };
  showDevice(device);

  // Pause: the game stands still, and the panel has the play style and "Jag har fastnat" (plan §6.10).
  let paused = false;
  let ended = false;
  let homeConsole: ReturnType<typeof createHomeConsole> | null = null;
  // The story's last page glues the frame the story ends on, once the ending's shot is left (story-presentation.md row 6).
  let reglue = false;
  const ending = createEnding(document, () => {
    reglue = true;
    input.release();
    audio.menu(true);
    audio.setPlace(arrangementFor(chapter.id, chapter.place));
  });
  const explore = createExplore(document, (id) => {
    if (!platformBlocked() && offline.canStart()) goOn(id, true);
  }, canEnter);
  function openExplore(): void {
    if (platformBlocked() || !offline.canStart() || ending.open || story.open || photoAlbum.open || memories.open || !canEnter('epilog') || !storyFinished(save.flags)) return;
    input.release();
    if (!title.open) writeSave();
    explore.show(save);
    audio.ui('open');
  }
  for (const id of ['titleExplore', 'pauseExplore', 'endExplore']) {
    byId(id).hidden = !canEnter('epilog') || !storyFinished(save.flags);
    byId(id).addEventListener('click', openExplore);
  }
  // From the second adventure's last card to the start page, calmly: the title comes over the card, which is there again
  // behind it, and nothing is played again.
  byId('endHome').addEventListener('click', () => {
    if (platformBlocked() || profileMutationPending || title.open || !ended) return;
    writeSave();
    showTitle();
  });
  let auto = !benchOn && requestedGraphics === 'auto' && view.info().tier === 'mid' ? createAutoTier() : null;
  let resolution = !benchOn && requestedGraphics === 'auto' ? createDynamicResolution() : null;
  let busyMs = 0;
  function platformBlocked(): boolean {
    return !bootReady || contextLost || !byId('message').hidden || document.hidden;
  }
  function menuOpen(): boolean {
    return !!homeConsole?.open || paused || ended || title.open || memories.open || photoAlbum.open || story.open || explore.open || ending.open;
  }
  function focusScope(): HTMLElement | null {
    if (!byId('message').hidden) return byId('message');
    if (homeConsole?.open) return homeConsole.element;
    if (ending.open) return ending.element;
    if (story.open) return story.element;
    if (explore.open) return explore.element;
    if (photoAlbum.open) return byId('photoAlbum');
    if (memories.open) return byId('memory');
    if (title.open) return byId('title');
    if (pause.open) return byId('pause');
    if (ended) return byId('endCard');
    return null;
  }
  function openPause(page?: PausePage): void {
    if (menuOpen() || platformBlocked()) return;
    paused = true;
    // What is being said waits under Pause, its sound with its bubble.
    pauseVoice();
    // The world stops, and the tune goes on under the paper (docs/ux-audit/style-and-sound.md rows 20 and 21).
    audio.menu(true);
    audio.ui('open');
    pointing.cancel();
    askedForUse = askedForHelp = false;
    input.release();
    pause.show({ ...settings, graphics: requestedGraphics }, false, page);
    writeSave();
  }
  function resume(): void {
    if (!paused || platformBlocked()) return;
    if (titleSettings) {
      titleSettings = false;
      pause.hide();
      showTitle();
      // Back where the hand was: on Inställningar (docs/ux-audit/menus.md row 11).
      byId('titleSettingsBtn').focus();
      return;
    }
    paused = false;
    pause.hide();
    input.release();
    game.resume();
    resumeVoice();
    audio.menu(false);
    audio.sleep(document.hidden);
    audio.unlock();
    canvas.focus();
  }
  const pause = createPause(document, {
    onResume: resume,
    onTitle() {
      writeSave();
      pause.hide();
      showTitle();
    },
    onSettings(next, choice) {
      input.release();
      // A sound's new level is heard at once, as one short note (menus.md row 8).
      const heard = (on: boolean, level: number, was: boolean, before: number) => on && (!was || level !== before);
      if (heard(next.sound, next.effectsVolume, settings.sound, settings.effectsVolume)) audio.preview('effects', next.effectsVolume);
      if (heard(next.music, next.musicVolume, settings.music, settings.musicVolume)) audio.preview('music', next.musicVolume);
      // Merely changing sound or play style must not save a temporary ?tier inspection override.
      settings = { ...next, graphics: choice === 'graphics' ? next.graphics : settings.graphics };
      if (choice === 'graphics') {
        requestedGraphics = settings.graphics;
        // A saved explicit selection must not be overridden on the next load by an old ?tier URL.
        params.delete('tier');
        history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
        view.setTier(settings.graphics === 'auto' ? 'mid' : settings.graphics);
        view.setResolutionSteps(0);
        auto = !benchOn && settings.graphics === 'auto' && view.info().tier === 'mid' ? createAutoTier() : null;
        resolution = !benchOn && settings.graphics === 'auto' ? createDynamicResolution() : null;
      }
      game.sim.options = simOptions(settings);
      game.tempo = tempoOf(settings);
      apply();
      writeSave();
    },
    onStuck() {
      highLanding.reset();
      const rearmed = game.sim.pendingDialogue.size > 0;
      game.sim.discardDialogue();
      game.sim.toCheckpoint();
      hud.clear();
      resume();
      // Stuck on a puzzle, and not only in a corner: the helper comes along too, and looks at the next thing to do;
      // unless words are waiting to be read again, which come first.
      if (!rearmed) askedForHelp = true;
    },
  });
  const hdrAvailable = view.info().hdrAvailable;
  const photoAlbum = createPhotoAlbum(document, photoStore, photoPlayer, () => {
    if (chapter.epilogue && ended && !title.open && !profileMutationPending && !story.open && !memories.open && !explore.open && !platformBlocked() && ending.start()) {
      input.release(); pointing.cancel(); askedForUse = askedForHelp = false;
      audio.setPlace(null);
      audio.menu(false);
      audio.sleep(false);
      audio.unlock();
    }
  });
  void photoAlbum.refresh();
  // The candy bag's page (the album and the photos) belongs to the story's chapters, Byn too, not to the test and
  // look courses; Moa's map to the places she has drawn (docs/ux-audit/menus.md row 14).
  const storyCourse = storyChapters().some((c) => c.id === chapter.id);
  byId('albumPhotos').hidden = !storyCourse;
  byId('pauseBagBtn').hidden = !storyCourse;
  byId('pauseMapCard').hidden = !mapState(chapter.id, canEnter);
  byId('endPhotos').addEventListener('click', () => photoAlbum.credits());
  byId('graphicsFallback').hidden = hdrAvailable;
  byId<HTMLButtonElement>('graphicsMid').disabled = !hdrAvailable;
  byId<HTMLButtonElement>('graphicsHigh').disabled = !hdrAvailable;
  byId('pauseBtn').addEventListener('click', () => openPause());
  /** The bag, G or the pad's View: straight to the candy bag's page; back from it goes straight back to play. */
  function openBag(): void {
    if (platformBlocked() || title.open || ended || memories.open || photoAlbum.open || story.open || explore.open) return;
    const page = storyCourse ? 'bag' : 'home';
    if (!pause.open) openPause(page);
    else pause.page(page);
  }
  byId('bag').addEventListener('click', openBag);
  // Moas karta, in the pause panel and on the chapter's card: where he is, and where the ghost is heading.
  byId('pauseMap').innerHTML = mapSvg(mapState(chapter.id, canEnter), isKlonk());
  byId('endMap').innerHTML = mapSvg(mapState(chapter.id, canEnter), isKlonk(), true);
  // The helper's button: a press is passed on with the next frame's presses, like H on a keyboard.
  let askedForHelp = false;
  let askedForUse = false;
  byId('helpBtn').addEventListener('click', () => {
    if (!platformBlocked() && !menuOpen()) askedForHelp = true;
  });

  // The title over the morning's first shot, alive (docs/ux-audit/first-minutes.md row 4): while the morning is
  // still to come, the title shows its tableau, and "Börja" goes on into the morning from that same shot, past its
  // fade from black (row 16). Any other game shows its own place, alive.
  const morning = chapter.scenes?.find((scene) => scene.id === 'morgon');
  const hasTableau = chapter.scenes?.some((scene) => scene.id === 'title') ?? false;
  const handoff = Math.max(0, ...(morning?.stage?.fade ?? []).map((key) => key.at + (key.move ?? 0)));
  let tableauSeconds = 0;
  // Where a game taken up again is, as its chapter's card says it, over the title's recap (first-minutes.md row 9).
  const cardWord = chapter.scenes?.find((scene) => scene.id === 'card' || scene.id === 'morgon')?.stage?.words?.find((word) => word.kind === 'caption')?.text;
  byId('titleStoryCard').textContent = cardWord ? (sv.scene as Record<string, string>)[cardWord] ?? '' : '';
  const tableauShown = () => hasTableau && morning !== undefined && title.open && !ended && game.sim.sceneFrame === null && sceneWaits(morning, game.sim.flags);

  // The title (plan §6.10). A chapter starts behind it; the test course and a debug session start at once.
  // ?title shows it in a debug session too, for the browser test.
  function showTitle(): void {
    if (profileMutationPending) return;
    paused = true;
    // The title has the place's air and tune from the first tap, ducked under its card (style-and-sound.md row 21).
    audio.menu(true);
    input.release();
    title.show(begun, { currentId: store.currentId, players: store.players(), available: store.available, unreadable: store.load().kind === 'unreadable' });
    offline.check();
  }
  function reloadPlayer(): void {
    // The outgoing page must never autosave its simulation into the newly selected profile.
    again = true;
    for (const key of ['course', 'at', 'flags', 'style', 'bench']) params.delete(key);
    params.set('title', '');
    location.href = `${location.pathname}?${params}`;
  }
  /** The words of a chapter's time card, which the loading card shows when the page goes on to it. */
  function cardOf(id: string): string | undefined {
    const text = storyChapters().find((c) => c.id === id)?.scenes?.find((scene) => scene.id === 'card')?.stage?.words?.find((word) => word.kind === 'caption')?.text;
    return text ? (sv.scene as Record<string, string>)[text] : undefined;
  }
  /** The game begins from the title: with the style chosen there, or the saved one for Fortsätt. */
  function startPlay(style: PlayStyle | null): void {
    pendingStart = null;
    startedAt = performance.now();
    begun = true;
    if (tableauShown()) game.sim.scene?.openAt('morgon', handoff);
    if (style) {
      settings = changeStyle(settings, style);
      game.sim.options = simOptions(settings);
      game.tempo = tempoOf(settings);
      apply();
    }
    // Fortsätt: where he is, on the card's scrap for a moment (first-minutes.md row 9). The tableau needs none.
    if (!style && !tableauShown()) sceneUi.remind(byId('titleStoryCard').textContent ?? '');
    title.hide();
    paused = false;
    input.release();
    game.resume();
    audio.menu(false);
    audio.sleep(document.hidden);
    audio.unlock();
    canvas.focus();
    writeSave();
  }
  let pendingStart: { style: PlayStyle | null } | null = null;
  /** When the game began from the title: a turn of the phone just after does not open Pause. */
  let startedAt = -Infinity;
  const newPlayerChapter = courseFor(new URLSearchParams(params.has('dev') ? 'dev' : ''), null).id;
  const title = createTitle(document, {
    onFront() { offline.check(); },
    onSettings() {
      if (!offline.canStart()) return;
      titleSettings = true;
      title.hide();
      pause.show({ ...settings, graphics: requestedGraphics }, true);
    },
    onSelect(id) {
      if (!offline.canStart()) return false;
      if (begun && loaded.kind !== 'unreadable') writeSave();
      if (!store.select(id)) return false;
      reloadPlayer();
      return true;
    },
    onCreate(name, style) {
      if (!offline.canStart()) return false;
      if (begun && loaded.kind !== 'unreadable') writeSave();
      if (!store.create(name, style, newPlayerChapter, Date.now())) return false;
      reloadPlayer();
      return true;
    },
    async onDelete(id) {
      if (!offline.canStart()) return false;
      again = true;
      profileMutationPending = true;
      const cleared = id === photoPlayer ? await clearSavedPhotos() : await photoStore.clear(id);
      if (!cleared) { again = false; profileMutationPending = false; return false; }
      if (!store.remove(id)) { again = false; profileMutationPending = false; photosStopped = false; return false; }
      reloadPlayer();
      return true;
    },
    onStart(style) {
      if (!offline.canStart() || store.load().kind === 'unreadable') return;
      // A start pressed while the models still load is kept, never dropped (docs/ux-audit/first-minutes.md row 1):
      // the pressed button shows the loading ghost, and the game starts the moment the models are in.
      if (!bootReady && !contextLost && byId('message').hidden && !document.hidden) {
        pendingStart = { style };
        title.waiting(style);
        return;
      }
      if (platformBlocked()) return;
      startPlay(style);
    },
    async onStartOver() {
      if (!offline.canStart()) return false;
      again = true;
      profileMutationPending = true;
      if (!await clearSavedPhotos()) { again = false; profileMutationPending = false; return false; }
      if (!store.clear()) { again = false; profileMutationPending = false; photosStopped = false; return false; }
      reloadPlayer();
      return true;
    },
    onCodeWrong: () => audio.ui('wrong'),
    onCode(id) {
      if (!offline.canStart() || !canEnter(id)) return false;
      audio.ui('yes');
      // The chapter's start, with whatever this device has kept of the others. The code holds no candy.
      const others = <T>(all: Record<string, T>) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id)) as Record<string, T>;
      keepSavedPosition = false;
      save = { ...save, updated: Date.now(), settings, chapter: id, checkpoint: -1, checkpoints: others(save.checkpoints ?? {}),
        candy: others(save.candy), side: others(save.side ?? {}), placed: others(save.placed), flags: others(save.flags) };
      store.write(save);
      again = true;
      markOnward(id, undefined, cardOf(id));
      // Replaced, not added: Back must not reopen the chapter left behind and move the save back to it.
      location.replace(`${location.pathname}${courseQuery(params, id)}`);
      return true;
    },
  });
  const offline = createOffline({
    isTitle: () => title.open && !ending.open && !explore.open && bootReady && !contextLost && byId('message').hidden && !profileMutationPending
      && !byId('titleFront').hidden,
    // The title waits while a new version is put in place, and says so, with the loading card's ghost.
    setUpdateLock: (locked) => {
      byId('title').inert = locked;
      byId('titleUpdating').hidden = !locked;
    },
  });
  const input = createInput(
    {
      stickZone: byId('stickZone'),
      stickBase: byId('stickBase'),
      stickKnob: byId('stickKnob'),
      hopBtn: byId('hopBtn'),
      actBtn: byId('actBtn'),
      world: canvas,
    },
    {
      onDevice: showDevice,
      onTap(x, y) {
        if (platformBlocked() || menuOpen() || game.sim.held || hud.reading()) return;
        const what = pointing.tap({ x, y }, { world: (at) => view.worldScreen(at), player: () => view.playerScreen(), helper: () => view.helperScreen() });
        if (!what) return;
        if (what.kind === 'use') askedForUse = true;
        else if (what.kind === 'helper') askedForHelp = true;
        // Until it wakes, the carving is only wood: a dry tock, and no turn that would give its waking away
        // (docs/ux-audit/first-minutes.md row 21).
        else if (what.kind === 'ghost' && chapter.id === 'prolog' && !game.sim.flags.has('blink')) audio.play({ kind: 'tock' });
        else {
          view.react(what, lessMotion());
          if (what.kind === 'player') audio.play({ kind: 'say', who: 'elof' });
          else if (what.kind === 'ghost') audio.play({ kind: 'say', who: 'spoket' });
        }
      },
      onKey: (key) => {
        if (platformBlocked()) return;
        if (ending.open) ending.back();
        else if (story.open) story.back();
        else if (photoAlbum.open) photoAlbum.back();
        else if (memories.open) memories.close();
        else if (explore.open) explore.back();
        else if (key === 'bag') openBag();
        else if (title.open) title.back();
        else if (pause.open) pause.back();
        else openPause();
      },
      onBack: () => {
        if (platformBlocked()) return;
        if (ending.open) ending.back();
        else if (story.open) story.back();
        else if (photoAlbum.open) photoAlbum.back();
        else if (memories.open) memories.close();
        else if (explore.open) explore.back();
        else if (title.open) title.back();
        else if (pause.open) pause.back();
      },
      focusScope,
      panelOpen: () => menuOpen() || platformBlocked(),
      followFinger: () => settings.followFinger,
      playerScreen: () => view.playerScreen(),
      upClimbs: () => game.sim.curr.mode === 'climb' || game.sim.curr.mode === 'swing',
    },
  );

  // An optional game on the family's TV owns a modal surface, never a chapter or a save transition.
  const consolePrompt = document.createElement('button');
  consolePrompt.type = 'button'; consolePrompt.id = 'homeConsolePlay'; consolePrompt.className = 'home-console-prompt';
  consolePrompt.textContent = sv.kart.playPrompt; consolePrompt.hidden = true;
  document.body.append(consolePrompt);
  const consoleInert = new Map<HTMLElement, boolean>();
  const consoleAvailable = () => homeConsoleAvailable(chapter, game.sim.curr,
    menuOpen() || platformBlocked() || game.sim.held || !!game.sim.story || hud.reading() || game.sim.flags.has('goal'));
  const openConsole = () => { if (consoleAvailable()) void homeConsole?.show(); };
  consolePrompt.addEventListener('click', openConsole);
  homeConsole = createHomeConsole({
    mount() {
      const host = document.createElement('section'); host.id = 'homeConsole'; host.className = 'home-console-host';
      host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-label', sv.kart.playPrompt);
      const loading = document.createElement('div'); loading.className = 'home-console-loading';
      const label = document.createElement('p'); label.textContent = sv.kart.loading; label.setAttribute('role', 'status');
      const back = document.createElement('button'); back.type = 'button'; back.textContent = sv.kart.back;
      back.addEventListener('click', () => homeConsole?.close());
      loading.append(label, back); host.append(loading); document.body.append(host);
      host.addEventListener('keydown', event => {
        if (!homeConsole?.loading || platformBlocked()) return;
        if (event.key === 'Escape') { event.preventDefault(); homeConsole.close(); }
        else if (event.key === 'Tab') { event.preventDefault(); back.focus(); }
      });
      back.focus();
      return host;
    },
    async load(host, onClose) {
      const { openKart } = await import('./kart/game');
      const session = await openKart({ host, onClose, effects: settings.sound ? settings.effectsVolume : 0,
        music: settings.music ? settings.musicVolume : 0, calm: lessMotion(), tier: view.info().tier,
        storage: benchOn ? null : storage(), playerId: store.currentId, debug: debugOn });
      host.querySelector('.home-console-loading')?.remove();
      return session;
    },
    enter() {
      document.body.classList.add('home-console-open'); consolePrompt.hidden = true;
      for (const node of document.body.children) {
        if (!(node instanceof HTMLElement) || node.id === 'homeConsole' || node.id === 'message') continue;
        consoleInert.set(node, node.inert); node.inert = true;
      }
      pointing.cancel(); askedForUse = askedForHelp = false;
      input.setEnabled(false); input.release();
      hud.paused(true); pauseVoice(); audio.sleep(true);
      tutorialView.show(null, device, settings.followFinger, null); fingerMarks.show(null, null, null);
      auto?.suspend(); resolution?.suspend();
    },
    leave() {
      for (const [node, inert] of consoleInert) node.inert = inert;
      consoleInert.clear(); document.body.classList.remove('home-console-open');
      pointing.cancel(); askedForUse = askedForHelp = false;
      // Sample the pad while disabled, so a held race button cannot become a fresh world action.
      input.poll(); input.setEnabled(true); input.release(); game.resume();
      hud.paused(menuOpen()); audio.sleep(platformBlocked()); audio.menu(menuOpen());
      resumeVoice(!menuOpen() && !platformBlocked());
      if (!platformBlocked()) { audio.unlock(); canvas.focus(); }
    },
    failed() { hud.notice(sv.kart.loadFailed, 6); },
  });

  // A chapter reached from the page before it ("Nästa kapitel", "Spela igen", a code) opens on its time card: the
  // title shows when the game is opened, not between chapters (src/save/onward.ts).
  const onward = takeOnward(chapter.id);
  if (loaded.kind === 'unreadable' || (!benchOn && !at && !onward && (params.has('title') || (chapter.id !== 'testbana' && !debugOn)))) showTitle();

  // The page is a game surface: no pinch zoom, no double-tap zoom, no long-press menu (plan §6.7).
  for (const type of ['gesturestart', 'dblclick', 'contextmenu']) {
    document.addEventListener(type, (e) => e.preventDefault());
  }
  // A turn of the phone opens Pause only in free play, and only when the picture turns between landscape and
  // portrait: never over a held scene, nor in the first seconds after the title, when a child often turns the phone
  // only after tapping (docs/ux-audit/first-minutes.md row 17). Any other change of size only redraws.
  let landscape = innerWidth >= innerHeight;
  /** When a key, a tap or a pad was last used: the prologue's line of keys waits for a quiet moment. */
  let inputAt = performance.now();
  // The keys' three caps stay until each has been used once, or for half a minute of play, then never again on
  // this device (docs/ux-audit/in-play.md row 13). The whole list is in Pause.
  const taught = { move: false, hop: false, act: false };
  let keysShownFor = 0;
  let learned = keysLearned();
  document.body.classList.toggle('keys-learned', learned);
  for (const type of ['keydown', 'pointerdown']) window.addEventListener(type, () => { inputAt = performance.now(); }, { capture: true });
  const relayout = () => {
    const turned = (innerWidth >= innerHeight) !== landscape;
    landscape = innerWidth >= innerHeight;
    pointing.cancel();
    askedForUse = askedForHelp = false;
    input.release();
    view.resize();
    auto?.suspend();
    resolution?.suspend();
    if (!turned || menuOpen() || game.sim.scene?.holding || hud.reading() || performance.now() - startedAt < 3000) return;
    story.interrupt();
    openPause();
    devicePlay.setPlaying(false);
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
  window.addEventListener('blur', () => {
    story.interrupt();
    pointing.cancel();
    askedForUse = askedForHelp = false;
  });

  // r186's Timer follows the page's visibility, so a hidden tab doesn't come back with one huge frame.
  const timer = new Timer();
  timer.connect(document);
  document.addEventListener('visibilitychange', () => {
    auto?.suspend();
    resolution?.suspend();
    audio.sleep(platformBlocked() || !!homeConsole?.open);
    audio.menu(menuOpen());
    devicePlay.setPlaying(!platformBlocked() && !menuOpen());
    memories.suspend(platformBlocked());
    homeConsole?.suspend(platformBlocked());
    if (document.hidden) { input.release(); pointing.cancel(); askedForUse = askedForHelp = false; story.interrupt(); writeSave(); }
    else {
      game.resume();
      devicePlay.visible();
      // The hidden page held its recording. Continue with its bubble, unless a menu still holds the game.
      resumeVoice((memories.open || !menuOpen()) && !platformBlocked());
    }
  });
  window.addEventListener('pagehide', () => {
    devicePlay.setPlaying(false);
    homeConsole?.suspend(true);
    input.release(); pointing.cancel(); askedForUse = askedForHelp = false;
    writeSave();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    homeConsole?.suspend(platformBlocked());
    game.resume();
    input.release();
    // BFCache keeps the current bubble and its recording. A menu still owns the pause on return.
    resumeVoice((memories.open || !menuOpen()) && !platformBlocked());
  });

  const debug: Debug | null = devtools ? devtools.createDebug(byId('debug')) : null;
  if (debugOn) {
    window.__godis = {
      state: () => ({
        ...game.sim.curr, steps: game.sim.steps, flags: [...game.sim.flags], candy: game.sim.candyCount,
        bubbles: game.sim.bubbles, knocks: game.sim.knocks, bowled: game.sim.bowled, sinks: game.sim.sinks, blown: game.sim.blown, help: { ...game.sim.help }, checkpoint: game.sim.checkpoint, style: settings.style, paused, device,
        pointing: { last: pointing.last, walking: pointing.walking }, tutorial: tutorial.shown, playerId: store.currentId, playerName: store.players().find(p => p.id === store.currentId)?.name ?? save.name, course: chapter.id, said: [...game.sim.said], title: title.open, settings: { ...settings }, playerScreen: view.playerScreen(), noteHits: game.sim.noteHits, bootReady, contextLost, ending: { open: ending.open, seconds: ending.seconds }, prologue: game.sim.prologue?.frame ?? null,
        scene: game.sim.sceneFrame, held: game.sim.held, storyReading: hud.reading(), pendingDialogue: [...game.sim.pendingDialogue], ghost: game.sim.ghost ? { ...game.sim.ghost } : null,
        homeConsole: { available: consoleAvailable(), ...homeConsole?.debug() },
      }),
      screen: (at) => view.worldScreen(at),
      info: () => ({ ...view.info(), busyMs, autoSettled: auto?.settled ?? true,
        sound: audio.running, soundsPlayed: audio.played, musicBars: audio.bars, soundPreviews: audio.previews, audioMode: audio.mode, uiSounds: audio.uiPlayed }),
    };
  }

  // ?bench plays the course by itself for 30 seconds and then shows numbers to paste into a session.
  const bench = benchOn && devtools ? devtools.createBench(30, chapter) : null;

  /** Chapter navigation preserves progress; an explicit Explore choice reopens the chapter from its beginning. */
  function goOn(id: string, exploring = false): void {
    if (!canEnter(id)) return;
    writeSave();
    keepSavedPosition = false;
    save = exploring ? exploreChapter(save, id) : visitChapter(save, id);
    store.write(save);
    again = true;
    markOnward(id, undefined, cardOf(id));
    // Replaced, not added: Back must not reopen the chapter left behind and move the save back to it.
    location.replace(`${location.pathname}${courseQuery(params, id)}`);
  }

  /** "Spela igen": this course from its start; the collection and safe places remain. */
  function playAgain(): void {
    writeSave();
    if (!keepSavedPosition) save = visitChapter(save, chapter.id, true);
    store.write(save);
    again = true;
    markOnward(chapter.id, undefined, cardOf(chapter.id));
    location.replace(`${location.pathname}${courseQuery(params, chapter.id)}`);
  }
  let endFor = 0;
  /** At the end: how long since a line was last shown, and how many had been. Only a line that never ends is let go. */
  // The coda before the last page (docs/narrative-audit/threads.md §5.4): the tune closes, and one of the family
  // answers from afar. Not where a scene is the chapter's end, nor in the epilogue, which has its own.
  const coda = !endsInScene(chapter) && !chapter.epilogue;
  let closing = false;
  let answered = false;
  // A memory plays once, when he touches its shaving: not again in a game that has seen it.
  const memories = createMemory(document);
  let recovering = false;
  let restoreReady = true;
  let restoreGeneration = 0;
  let pausedBeforeLoss = false;
  let focusBeforeLoss: HTMLElement | null = null;
  function offerRecovery(): void {
    if (!recovering || contextLost || !bootReady || !restoreReady) return;
    showMessage(sv.contextRestored, sv.pause.resume, () => {
      recovering = false;
      byId('message').hidden = true;
      paused = pausedBeforeLoss;
      input.release();
      game.resume();
      const panel = focusScope();
      if (panel) {
        const target = focusBeforeLoss && panel.contains(focusBeforeLoss) ? focusBeforeLoss
          : [...panel.querySelectorAll<HTMLElement>('button,input')].find((element) => element.getClientRects().length > 0 && !element.hasAttribute('disabled'));
        target?.focus();
      } else canvas.focus();
      audio.sleep(platformBlocked() || !!homeConsole?.open);
      homeConsole?.suspend(platformBlocked());
      audio.menu(menuOpen());
      resumeVoice((memories.open || !menuOpen()) && !platformBlocked());
      if (!menuOpen()) audio.unlock();
      if (title.open) offline.check();
    });
  }
  // No simulation or audio runs before the required public models have loaded. Reload retries the same
  // versioned URLs; no save is cleared and a worker may supply them from its own matching cache.
  void view.ready.then(() => {
    bootReady = true;
    game.resume();
    input.release();
    offerRecovery();
    if (title.open) offline.check();
    // A start pressed while loading begins now, if the title still waits on its front for it.
    if (pendingStart && title.open && !byId('titleFront').hidden && !platformBlocked()) startPlay(pendingStart.style);
  }).catch(() => {
    paused = true;
    input.release();
    audio.sleep(true);
    showMessage(sv.loadFailed);
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    pauseVoice();
    if (!recovering) {
      pausedBeforeLoss = paused;
      focusBeforeLoss = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    contextLost = true;
    homeConsole?.suspend(true);
    restoreReady = false;
    restoreGeneration++;
    pointing.cancel();
    askedForUse = askedForHelp = false;
    memories.suspend(true);
    recovering = true;
    paused = true;
    input.release();
    askedForHelp = false;
    story.interrupt();
    audio.sleep(true);
    auto?.suspend();
    resolution?.suspend();
    writeSave();
    showMessage(sv.contextLost, sv.reloadGame);
  });
  async function restorePicture(): Promise<void> {
    const ticket = ++restoreGeneration;
    restoreReady = false;
    showMessage(sv.contextReloading, null, undefined, undefined, true);
    try {
      await view.restore();
      if (ticket !== restoreGeneration || contextLost || again) return;
      restoreReady = true;
      offerRecovery();
    } catch {
      if (ticket !== restoreGeneration || contextLost || again) return;
      // A rejected initial ready promise cannot be retried in place; rebuild the loader on reload.
      if (!bootReady) showMessage(sv.loadFailed);
      else showMessage(sv.loadFailed, sv.retry, () => { void restorePicture(); });
    }
  }
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    void restorePicture();
  });
  byId('pauseAlbum').addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-memory]') : null;
    const id = button?.dataset.memory;
    const found = id && memoryFound(id, { ...save.flags, [chapter.id]: rememberFlags(save.flags[chapter.id] ?? [], game.sim.flags, chapter.id) });
    if (!button || platformBlocked() || !id || !found || !pause.open || memories.open || photoAlbum.open || story.open || explore.open) return;
    input.release();
    const rect = button.getBoundingClientRect();
    memories.play(id, () => { input.release(); game.resume(); }, {
      origin: rect.width > 0 && rect.height > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null,
      calm: lessMotion(),
    });
  });
  let remembered = game.sim.flags.has('memory');
  let flagsSeen = -1;
  // Whether the dew bells had all rung when the page last looked.
  let dewRung = game.sim.flags.has('dewsong');
  let vittraThanked = game.sim.flags.has('keepsake:vittra');
  let goldenFound = albumComplete(album(save.flags));
  // How many lost things were found when the page last looked, and which: -1 before it has looked.
  let lostSeen = -1;
  let lostKnown: readonly string[] = [];
  let collectionSeen: number | null = null;
  let stormSeen = 0;
  let shown = false;
  let lastTime = 0;
  let consoleBackHeld = false;
  let savedAt = game.sim.checkpoint;
  // What is said, for the picture (src/render/talk.ts): the line in the bubble, how long it has been up, and whether the story
  // waits on it. While it waits the picture goes on living: breathing, looking at whoever speaks, a mouth that says the words.
  const talkFrame: TalkFrame = { who: null, text: '', seconds: 0, reading: false };
  let talkAt = 0;
  function frame(time: number): void {
    requestAnimationFrame(frame);
    const began = performance.now();
    timer.update(time);
    devicePlay.setPlaying(!platformBlocked() && (!menuOpen() || !!homeConsole?.open));
    homeConsole?.suspend(platformBlocked());
    if (document.hidden) { lastTime = time; return; }
    const dt = Math.min(timer.getDelta(), 0.25);
    const beforeSteps = game.sim.steps;
    const blocked = platformBlocked();
    memories.suspend(blocked);
    storyReminder.show(storyContext(chapter.id, game.sim.flags, game.sim.curr, save.flags), !blocked && !menuOpen(), isKlonk());
    // Under a menu the world is still and the tune goes on, muffled; on a chapter's last page the place's air goes on,
    // and the tune's last note rings out (docs/ux-audit/style-and-sound.md rows 20 and 21).
    audio.sleep(blocked || !!homeConsole?.open);
    audio.menu(menuOpen() && !ending.open && !(ended && coda));
    if (blocked) {
      // The recovery message can still use the ordinary menu input while the TV game is suspended.
      if (homeConsole?.open) input.setEnabled(true);
      pointing.cancel();
      askedForUse = askedForHelp = false;
      tutorialView.show(null, device, settings.followFinger, null);
      auto?.suspend();
      resolution?.suspend();
      input.poll();
      lastTime = time;
      return;
    }
    if (homeConsole?.open) {
      input.setEnabled(false);
      // The TV owns its input and render loop. No world step, dialogue receipt, photo, save or render advances.
      hud.paused(true); auto?.suspend(); resolution?.suspend();
      if (homeConsole.loading) {
        const pad = [...navigator.getGamepads?.() ?? []].find(pad => pad?.connected);
        const back = !!pad?.buttons[1]?.pressed;
        if (back && !consoleBackHeld) homeConsole.close();
        consoleBackHeld = back;
      }
      lastTime = time;
      return;
    }
    consoleBackHeld = false;
    // The wood knocks while the ghost is in the picture: the chase (plan §5.8).
    const ghost = game.sim.ghost;
    if (!ending.open) audio.tick(ghost !== null && !ghost.gone && Math.abs(ghost.x - game.sim.curr.x) < 9);
    if (ending.tick(dt)) audio.play({ kind: 'bell', midi: 86 });
    if (menuOpen()) {
      pointing.cancel();
      askedForUse = askedForHelp = false;
      // The panel's buttons still answer a gamepad. A memory plays over a game that waits.
      input.poll();
    } else {
      let held = input.state();
      let edges = input.consume();
      if (bench && !bench.done) ({ held, edges } = bench.play(game.sim.curr, time));
      edges = { ...edges, helper: edges.helper || askedForHelp, act: edges.act || askedForUse };
      if (edges.act && !game.sim.curr.verb && consoleAvailable()) {
        openConsole(); lastTime = time; return;
      }
      held = pointing.steer(held, edges);
      if (!learned && device !== 'touch') {
        if (Math.abs(held.x) > 0.3) taught.move = true;
        if (held.hopHeld) taught.hop = true;
        if (edges.act) taught.act = true;
        keysShownFor += dt;
        if ((taught.move && taught.hop && taught.act) || keysShownFor > 30) {
          learned = true;
          document.body.classList.add('keys-learned');
          learnKeys();
        }
      }
      if (hud.reading()) {
        // Only a deliberately staged line protects its tableau. Its reading/voice clock still runs below,
        // and finishes automatically; E is an optional advance, never a toll on ordinary movement.
        pointing.cancel();
        if (edges.act) advanceStory();
        game.resume();
      } else {
        game.frame(dt, { x: held.x, y: held.y, hopHeld: held.hopHeld, talking: hud.speaking() }, edges);
        tutorial.update(dt, game.sim.curr, game.sim.flags, held, edges, game.sim.held);
      }
      askedForUse = askedForHelp = false;
      if (highLanding(game.sim.curr)) devicePlay.landing(settings.vibration);
      playTime += dt * game.tempo;
      const now = hear();
      for (const cue of cuesFor(heard, now, memory)) audio.play(cue);
      heard = now;
    }
    const score = game.sim.sceneFrame;
    for (const cue of openingCues(scoredScene, score, chapter.scenes ?? [])) audio.play(cue);
    scoredScene = score;
    audio.storyQuiet(openingQuiet(score, chapter.scenes ?? []));
    if (!bagTorn && game.sim.flags.has('bag:torn')) audio.play({ kind: 'story', sound: 'paper' });
    bagTorn = game.sim.flags.has('bag:torn');
    if (game.sim.story && !story.open) {
      pointing.cancel();
      askedForUse = askedForHelp = false;
      input.release();
      story.show(game.sim.story, game.sim.flags);
      audio.menu(true);
      audio.ui('open');
    }
    if (!remembered && game.sim.flags.has('memory') && !hud.speaking()) {
      remembered = true;
      pointing.cancel();
      askedForUse = askedForHelp = false;
      input.release();
      writeSave();
      const shaving = chapter.spots?.find((spot) => spot.id === 'memory')?.at ?? game.sim.curr;
      memories.play(chapter.id, () => { input.release(); game.resume(); canvas.focus(); }, {
        // If the ghost is waiting beyond the camera, grow from the glowing shaving Elof just touched.
        origin: view.ghostScreen() ?? view.worldScreen({ x: shaving.x, y: shaving.y + 0.6 }),
        calm: lessMotion(),
      });
      audio.menu(true);
    }
    // A big candy is a safe place: the game saves there (plan §3.3, rule 4).
    if (game.sim.checkpoint !== savedAt) {
      savedAt = game.sim.checkpoint;
      writeSave();
    }
    const atGoal = game.sim.flags.has('goal');
    const tableau = tableauShown();
    if (tableau) tableauSeconds += dt;
    // The crayon line under the title, while the models come (first-minutes.md row 2).
    if (title.open) {
      const line = byId('titleLoading');
      line.style.setProperty('--loaded', String(bootReady ? 1 : view.loaded));
      line.classList.toggle('done', bootReady);
    }
    const saying = hud.saying();
    if (!saying || saying.at !== talkAt) { talkAt = saying?.at ?? 0; talkFrame.seconds = 0; } else if (!menuOpen()) talkFrame.seconds += dt;
    talkFrame.who = saying?.who ?? null;
    talkFrame.text = saying?.text ?? '';
    talkFrame.reading = hud.reading();
    const voice = voicePosition();
    talkFrame.voice = voice?.key === saying?.key ? voice : null;
    view.render({
      // Under the title the place lives on (first-minutes.md row 4); under any other menu it stands still.
      prev: game.sim.prev, curr: game.sim.curr, alpha: game.alpha, dt: menuOpen() && !title.open ? 0 : dt,
      // Visual events share the steps the story actually ran, including the catch-up cap and slower tempo.
      eventDt: title.open ? dt : (game.sim.steps - beforeSteps) * STEP, atGoal,
      collected: game.sim.collected, side: game.sim.collectedSide, checkpoint: game.sim.checkpoint, movers: game.sim.movers, drips: game.sim.drips,
      prologue: game.sim.prologue?.frame, scene: tableau ? { id: 'title', seconds: tableauSeconds } : game.sim.sceneFrame, ending: ending.seconds,
      flags: game.sim.flags, ghost: game.sim.ghost, rollers: game.sim.rollers, tussocks: game.sim.tussocks, gusts: game.sim.gusts, help: game.sim.help,
      berries: game.sim.berries,
      noteHits: game.sim.noteHits,
      talk: talkFrame,
    });
    if (reglue) {
      reglue = false;
      const frame = view.snapshot(null);
      if (frame) {
        byId('endPhoto').replaceChildren(frame);
        byId('endPicture').hidden = false;
      }
    }
    // Copy this exact rendered frame now, before WebGL's drawing buffer is discarded. Encoding and
    // IndexedDB run afterwards; the ordinary render loop never keeps its drawing buffer alive.
    const moment = !photosStopped && !benchOn && !at
      ? photoMoment(game.sim.curr, game.sim.flags, menuOpen() ? 0 : (game.sim.steps - beforeSteps) * STEP) : null;
    if (moment) void view.capture().then(async (blob) => {
      if (blob && !photosStopped && await photoStore.put({ player: photoPlayer, moment, blob })) await photoAlbum.refresh();
    });
    tutorialView.show(menuOpen() || platformBlocked() ? null : tutorial.shown, device, settings.followFinger, view.playerScreen());
    const finger = menuOpen() || platformBlocked() ? null : input.followPoint();
    fingerMarks.show(finger, finger?.steering ? view.playerScreen(1.3) : null, finger?.steering ? view.playerScreen() : null);
    sceneUi.show(chapter.scenes, game.sim.sceneFrame, menuOpen() && !paused);
    hud.candy(game.sim.candyCount);
    // In the prologue the keycaps teach, so the line of keys waits unless he has stood 10 s without a key
    // (first-minutes.md row 22).
    document.body.classList.toggle('keys-later', chapter.id === 'prolog' && performance.now() - inputAt < 10000);
    // The prologue brings its controls in as they are needed (first-minutes.md rows 8 and 18).
    document.body.classList.toggle('before-chase', chapter.id === 'prolog' && !game.sim.flags.has('bag:torn'));
    document.body.classList.toggle('no-candy', chapter.id === 'prolog' && game.sim.candyCount === 0);
    const context = storyContext(chapter.id, game.sim.flags, game.sim.curr, save.flags);
    storyReminder.show(context, !menuOpen(), isKlonk());
    // "Gården, klockan tio. Följ spöket. Hitta min påse." for a screen reader, as the picture changes.
    const said = [cardOf(chapter.id)?.replace(' · ', ', '), context?.purpose].filter(Boolean).join('. ') || sv.title;
    if (said !== pictureSaid) {
      pictureSaid = said;
      canvas.setAttribute('aria-label', said);
    }
    const tvAvailable = consoleAvailable();
    // Usually the existing Använd/E/X affordance is enough. Keep a separate explicit choice only when a
    // nearby story action owns that button, so opening the TV cannot steal the story's interaction.
    consolePrompt.hidden = !tvAvailable || !game.sim.curr.verb;
    hud.verb(game.sim.curr.verb ?? (tvAvailable ? 'turn' : null), game.sim.curr.word ?? (tvAvailable ? 'playConsole' : null));
    hud.knock(game.sim.help.step >= 2 ? game.sim.help : null);
    // A story's own visit is the helper looking by itself, not a step he asked for.
    hud.helped(game.sim.help.visit ? 0 : game.sim.help.step);
    // The album: what earlier chapters hold in the save, and what this one holds now.
    if (game.sim.flags.size !== flagsSeen) {
      flagsSeen = game.sim.flags.size;
      const all = { ...save.flags, [chapter.id]: rememberFlags(save.flags[chapter.id] ?? [], game.sim.flags, chapter.id) };
      byId('pauseMap').innerHTML = mapSvg(mapState(chapter.id, canEnter), isKlonk());
      byId('endMap').innerHTML = mapSvg(mapState(chapter.id, canEnter), isKlonk(), true);
      const found = album(all);
      hud.stickers(found);
      if (!goldenFound && albumComplete(found)) {
        goldenFound = true;
        hud.notice(sv.album.goldenFound);
        audio.play({ kind: 'found' });
      }
      // Hittegods: a thing found under the deck is said by name, once.
      const lost = lostFound(all);
      if (lostSeen >= 0 && lost.length > lostSeen) {
        const fresh = lost.find((thing) => !lostKnown.includes(thing));
        if (fresh) hud.notice(sv.lostFound.replace('{name}', sv.lost[fresh] ?? sv.lostTitle));
      }
      lostSeen = lost.length;
      lostKnown = lost;
      // Daggklockspelet: when the fourth drop has rung, the top of the screen says so, with the find's chime.
      if (!dewRung && game.sim.flags.has('dewsong')) {
        dewRung = true;
        hud.notice(sv.dewSong);
        audio.play({ kind: 'found' });
      }
      if (!vittraThanked && game.sim.flags.has('keepsake:vittra')) {
        vittraThanked = true;
        hud.notice(sv.vittraFound);
        audio.play({ kind: 'found' });
      }
      // The album's page, in the pause panel: in the story only.
      const keepsakes = keepsakesFound(all);
      const stormCount = Object.keys(STORM_MEMORIES).filter(id => memoryFound(id, all)).length;
      const collectionCount = keepsakes.length + stormCount;
      if (collectionSeen !== null && collectionCount > collectionSeen) {
        hud.notice(stormCount > stormSeen ? sv.collection.stormFound : sv.collection.keepsakeFound);
        audio.play({ kind: 'found' });
      }
      collectionSeen = collectionCount;
      stormSeen = stormCount;
      byId('pauseAlbum').innerHTML = storyCourse ? albumHtml(found, lost, keepsakes) + memoryAlbumHtml(all) : '';
      const kinds = Object.keys(KINDS).length;
      byId('pauseBagCount').textContent = sv.album.count.replace('{found}', String(found.length)).replace('{total}', String(kinds));
      byId('pauseBagBtn').style.setProperty('--fill', String(kinds > 0 ? found.length / kinds : 0));
    }
    // A held scene takes the floor as it begins: what was said before it is not read over it.
    const scene = game.sim.sceneFrame;
    if (scene && scene.id !== sceneHeard) {
      if (chapter.scenes?.find((def) => def.id === scene.id)?.hold) {
        hud.hush();
        pointing.cancel();
        askedForUse = askedForHelp = false;
        input.release();
      }
    }
    sceneHeard = scene?.id ?? null;
    for (; told < game.sim.said.length; told++) {
      const id = game.sim.said[told]!;
      const beat = beats.get(id);
      // A bubble alone never takes the controls. Only an actual physical/staged hold protects the
      // picture while its words finish; this includes authored world lines in a deliberate reveal.
      if (beat) hud.say(beat.who, beat.line, !benchOn && game.sim.held && game.sim.sceneFrame !== null, id);
      if (beat?.line === 'safeHere') audio.play({ kind: 'motif', who: 'mamma' });
    }
    // A bumped head is an incidental remark: it never waits for Fortsätt, interrupts a line, or arrives late.
    if (game.sim.knocks > reactedToCone) {
      const count = game.sim.knocks; reactedToCone = count;
      if (chapter.storm?.drips === 'cone' && !hud.speaking() && !scene && !menuOpen()) {
        hud.say('elof', CONE_REACTIONS[coneReaction++ % CONE_REACTIONS.length]!, false);
      }
    }
    // What is said waits while a memory plays: its line comes after it.
    // Establish ownership before tick: even a zero-time tick may present an idle queued line.
    // Opening Pause or a memory must not start that line's recording under the panel.
    hud.paused(menuOpen());
    hud.tick(menuOpen() ? 0 : dt);
    sceneUi.reading(hud.reading() && !menuOpen() && !platformBlocked(), device,
      sv.dialogue.moments[scene?.id ?? ''] ?? (hud.reading() ? sv.storyContext.family : ''));
    // The end: a moment to arrive, then the card with the candy in rows of ten. The last words are let finish first,
    // and the lines still waiting their turn: a chapter must not end over what someone is saying.
    if (atGoal) {
      endFor += menuOpen() ? 0 : dt;
    }
    if (atGoal && coda && !closing) {
      closing = true;
      audio.cadence();
      // The coda is the picture alone: the play's corners and words step aside while the tune closes.
      document.body.classList.add('coda');
    }
    // Only in the story: the test course has no family to answer.
    const codaWho = Object.hasOwn(CODA_FAMILY, chapter.id) ? CODA_FAMILY[chapter.id]! : chapter.coda === 'all' ? null : chapter.coda;
    if (coda && !answered && endFor > CODA_ANSWER && codaWho !== undefined) {
      answered = true;
      audio.play({ kind: 'motif', who: codaWho });
    }
    const wait = coda ? CODA : 1.4;
    if (endFor > wait && !hud.reading() && !hud.speaking() && !game.sim.unsaid && !benchOn && !ended) {
      ended = true;
      paused = true;
      if (!coda) audio.menu(true);
      // The storybook page turns in.
      audio.ui('page');
      // The coda's last picture, for the page: copied now, right after it was drawn.
      // A photo of Elof walking into the picture; the story's last page glues its own frame (row 6).
      const picture = view.snapshot(chapter.epilogue ? null : view.playerScreen());
      byId('endPhoto').replaceChildren(...(picture ? [picture] : []));
      byId('endPicture').hidden = picture === null;
      pointing.cancel();
      askedForUse = askedForHelp = false;
      input.release();
      writeSave();
      const canExplore = canEnter('epilog') && storyFinished(save.flags);
      for (const id of ['titleExplore', 'pauseExplore', 'endExplore']) byId(id).hidden = !canExplore;
      const number = chapterNumber(chapter.id);
      const next = nextAvailable(chapter.id, params);
      const bonus = next && bonusAfter(chapter.id)?.id === next.id;
      // Into the second adventure from the first: its own word on the button.
      const onward = bonus ? sv.end.bonus : next && isAdventure2(next.id) && !isAdventure2(chapter.id) ? sv.end.adventure : undefined;
      // The chapter's name, under its kicker: "Kapitel 1", "Gården" (story-presentation.md row 7).
      const title = sv.end.headings[chapter.id] ?? sv.explore.chapters[chapter.id] ?? sv.end.course;
      const kicker = sv.end.kickers[chapter.id] ?? (number > 0 ? sv.end.kicker.replace('{n}', String(number)) : '');
      const hidden = (chapter.hidden ?? []).map((h) => ({ kind: h.kind, found: game.sim.flags.has(foundFlag(h.kind)) }));
      storyReminder.handoff(storyHandoff(chapter.id, game.sim.flags));
      hud.end(title, game.sim.candyCount, playAgain, next ? () => goOn(next.id) : undefined, sv.end.closing[chapter.id], hidden, next ? codeFor(next.id) : null, onward, kicker);
      // The second adventure's last card, with nothing after it, has a calm way back to the start page as well as to the
      // map of the chapters; and never "Spela igen" under a press meant for the last words (Olov, 9 November 2026: it all
      // went black and began again).
      const last = !next && isAdventure2(chapter.id);
      byId('endHome').hidden = !last;
      byId(canExplore ? 'endExplore' : next ? 'endOnward' : last ? 'endHome' : 'endAgain').focus();
      if (chapter.id === 'epilog') {
        byId('endPhotos').hidden = false;
        photoAlbum.credits();
      }
    }

    if (!shown) {
      shown = true;
      byId('loading').classList.add('done');
    }
    // Measure only work done in this callback. RAF idle time (for example a 30 Hz power-save cap) is
    // not overload. No GPU timer is assumed; a GPU-only bottleneck can remain invisible to this measure.
    busyMs = performance.now() - began;
    const elapsed = lastTime > 0 ? (time - lastTime) / 1000 : 0;
    if (auto && !auto.settled) {
      if ((title.open || pause.open) && !photoAlbum.open && !memories.open && !story.open && !explore.open && !view.warming) {
        const next = auto.feed(elapsed, busyMs);
        if (auto.settled) {
          view.setTier(next); // Low/HDR shader variants warm here, while the game is safely paused.
          resolution?.suspend();
        }
      } else auto.suspend();
    }
    if (resolution) {
      if (!menuOpen() && !view.warming) {
        view.setResolutionSteps(resolution.feed(elapsed, busyMs, view.resolutionSteps, view.maxResolutionSteps));
      } else resolution.suspend();
    }
    if (bench && lastTime > 0) {
      bench.frame(time - lastTime, performance.now() - began);
      if (bench.done && !bench.shown) byId('debug').textContent = bench.report(view.info());
    }
    if (debug && !bench?.shown) {
      const p = game.sim.curr;
      // Two decimals, and never "-0.00".
      const n = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);
      debug.frame(time - lastTime, performance.now() - began, time, () => {
        const i = view.info();
        return [
          `steps/frame ${game.lastSteps} · device ${device}`,
          `draw calls ${i.drawCalls} · triangles ${i.triangles} · programs ${i.programs}`,
          ...(i.gpu ? [`GL ${(i.gpu.glBytes / 1e6).toFixed(1)} MB · targets ${(i.gpu.targetBytes / 1e6).toFixed(1)} · canvas estimate ${(i.gpu.canvasBytes / 1e6).toFixed(1)} · total ${(i.gpu.totalBytes / 1e6).toFixed(1)} MB`,
            `geometries ${i.geometries} · textures ${i.textures} · GL buffers ${i.gpu.buffers}${i.gpu.unknownFormats.length ? ' · UNCOUNTED FORMAT' : ''}`] : []),
          `tier ${i.tier} · canvas ${i.width}×${i.height} · pixel ratio ${i.pixelRatio.toFixed(2)} / ${i.maxPixelRatio.toFixed(2)}`,
          `models ${i.models.join(', ') || 'none yet'} · KTX2 textures ${i.compressedTextures}`,
          `pack CPU textures ${(i.assetTextures.cpuBytes / 1024).toFixed(1)} KB · released ${i.assetTextures.released}/${i.assetTextures.managed}`,
          `x ${n(p.x)} y ${n(p.y)} · vx ${n(p.vx)} vy ${n(p.vy)} · ${p.grounded ? 'on the ground' : 'in the air'}`,
          `candy ${game.sim.candyCount} of ${chapter.candy.length + (chapter.side?.length ?? 0)} · bubbles ${game.sim.bubbles} · ${p.mode}${p.verb ? ` · Använd: ${p.verb}` : ''}${p.atEdge ? ' · at an edge' : ''}`,
          `big candy ${game.sim.checkpoint + 1} of ${chapter.checkpoints?.length ?? 0} · ${settings.style}${paused ? ' · paused' : ''}`,
        ];
      });
    }
    lastTime = time;
  }
  requestAnimationFrame(frame);
}

void start();
