import { Timer } from 'three';
import { Pointing } from './app/pointing';
import { Tutorial } from './app/tutorial';
import { createTutorial } from './ui/tutorial';
import { Game } from './app/game';
import { createAudio } from './audio/audio';
import { arrangementFor } from './audio/music';
import { cuesFor, footingAt, newCueMemory, type Heard } from './audio/cues';
import { BONUS, STORY, bonusAfter, chapterNumber, courseAvailable, courseFor, courseId, courseQuery, nextAvailable } from './content/chapters';
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
import { changeStyle, settingsFor, simOptions, tempoOf, type PlayStyle, type Settings } from './save/settings';
import { codeFor } from './save/codes';
import { createStore, newSave, type PlayerSave } from './save/store';
import { createPhotoStore } from './save/photos';
import { ghostNamed, rememberFlags, storyFinished, visitChapter } from './save/journey';
import { markOnward, takeOnward } from './save/onward';
import type { SimStart, Vec } from './sim/types';
import { createBench } from './ui/bench';
import { createDebug, type Debug } from './ui/debug';
import { createHud } from './ui/hud';
import { createPause, type PausePage } from './ui/pause';
import { mountShell } from './ui/shell';
import { applyMaterials, applyPlace } from './ui/materials';
import { createTitle } from './ui/title';
import { createPhotoAlbum } from './ui/photos';
import { createOffline } from './platform/offline';
import { createStoryPanel } from './ui/story';
import { createSceneUi } from './ui/scene';
import { endsInScene, sceneBeats, sceneWaits } from './sim/scene';
import { createDevicePlay, createHighLanding, isAndroid, isApple } from './platform/device';
import './ui/ui.css';

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

function start(): void {
  const at = debugStart();
  // The saved game (plan §6.9). ?bench plays without one, and a debug start position never writes one.
  const store = createStore(benchOn ? null : storage());
  const loaded = store.load();
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // A URL tier is a temporary inspection override. A deliberate menu choice replaces it.
  let requestedGraphics = tierFromQuery(params.get('tier')) ?? settings.graphics;
  mountShell(document.body, chapter.helper?.kind);
  // Moa's paper and Pappa's linden, drawn once; and the place's own shade under every panel (style-and-sound.md rows 10, 15).
  applyMaterials(document);
  applyPlace(document, chapter.place);
  // The recovery screen shows the loading card's ghost: the screen still belongs to the game.
  const loadingGhost = document.querySelector('#loading svg');
  if (loadingGhost) byId('messageGhost').append(loadingGhost.cloneNode(true));
  const storyReminder = createStoryContext(document);
  const canvas = byId<HTMLCanvasElement>('game');
  canvas.tabIndex = -1;
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
  const from: SimStart =
    at
      ? (carried.length > 0 ? { flags: carried } : {})
      : {
          checkpoint: courseId(save.chapter) === chapter.id ? save.checkpoint : (save.checkpoints?.[chapter.id] ?? -1), collected: save.candy[chapter.id] ?? [], side: save.side?.[chapter.id] ?? [], placed: save.placed[chapter.id] ?? [],
          // Reaching the end is not kept: a game taken up again can reach it again.
          flags: [...(save.flags[chapter.id] ?? []).filter((flag) => flag !== 'goal'), ...carried],
        };

  const game = new Game(chapter, simOptions(settings), from);
  const photoMoment = createPhotoMoments(chapter.id, game.sim.flags);
  game.tempo = tempoOf(settings);
  const pointing = new Pointing(game.sim);
  const tutorial = new Tutorial(chapter.id);
  const tutorialView = createTutorial(document);
  const isKlonk = () => ghostNamed(save.flags) || (chapter.id === 'epilog' && game.sim.flags.has('beat:named'));
  // The bag counts all the candy there is: the trail's, and the side candy off it.
  const hud = createHud(document, chapter.candy.length + (chapter.side?.length ?? 0), isKlonk,
    () => (settings.slower ? 1.25 : 1) * (settings.bigText ? 1.2 : 1));
  const story = createStoryPanel(document, {
    named: isKlonk,
    answer(answer) {
      if (platformBlocked()) return false;
      if (!game.sim.finishStory(answer)) return false;
      if (answer.kind === 'paint') hud.notice(sv.painting.painted);
      else if (answer.kind === 'carve') hud.notice(sv.carving.carved);
      else hud.notice((answer.kind === 'party' ? sv.party.thanks : sv.sharing.thanks)
        .replace('{friend}', answer.friend === 'spoket' && isKlonk() ? sv.ghostName : answer.kind === 'party' ? sv.party.friends[answer.friend] : sv.sharing.friends[answer.friend])
        .replace('{sweet}', sv.sharing.sweets[answer.sweet].toLocaleLowerCase('sv')));
      writeSave();
      input.release();
      game.resume();
      canvas.focus();
      return true;
    },
    cancel() { game.sim.cancelStory(); input.release(); game.resume(); canvas.focus(); },
  });
  // What is said along the way, and in the chapter's scenes (src/sim/scene.ts).
  const beats = new Map([...(chapter.beats ?? []), ...sceneBeats(chapter.scenes)].map((beat) => [beat.id, beat]));
  const sceneUi = createSceneUi(document);
  // What was said before this game was taken up again is not said again.
  let told = game.sim.said.length;
  let sceneHeard: string | null = null;
  const controls = byId('controls');
  const hint = byId('hint');

  // Sound starts with the first tap, click or key: browsers allow it no earlier (plan §6.8).
  const audio = createAudio();
  audio.sleep(true);
  /** What the settings change outside the simulation: the sound, and the page's looks. */
  const apply = () => {
    audio.setEffects(settings.sound ? settings.effectsVolume : 0);
    audio.setMusic(settings.music ? settings.musicVolume : 0);
    audio.setLoud(settings.loud);
    document.body.classList.toggle('lefty', settings.lefty);
    document.body.classList.toggle('big-text', settings.bigText);
    document.body.classList.toggle('calm', settings.calm);
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
      said: game.sim.said.flatMap((id) => beats.get(id)?.who ?? []),
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
      flags: { ...save.flags, [chapter.id]: rememberFlags(save.flags[chapter.id] ?? [], game.sim.flags) },
      playMs: save.playMs + (now - playedFrom),
    };
    playedFrom = now;
    if (!at && !again && loaded.kind !== 'unreadable') store.write(save);
  }
  if (!store.available && !benchOn) {
    const notice = byId('notice');
    notice.textContent = sv.saveOff;
    notice.hidden = false;
    setTimeout(() => (notice.hidden = true), 7000);
  }

  // The on-screen controls follow the device in use, not the kind of computer (plan §4.1).
  let device: Device = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
  const showDevice = (d: Device) => {
    device = d;
    // The key reference, once a key or a pad has been used (menus.md row 10).
    if (d !== 'touch') byId('controlsReferenceBtn').hidden = false;
    controls.hidden = d !== 'touch';
    hint.hidden = d === 'touch';
    hint.textContent = d === 'pad' ? sv.padHint : sv.keysHint;
    // Which hand is in use, for what shows only to keys and pads: the prompt with what E (or X) will do.
    document.body.dataset.device = d;
    byId('keyPromptKey').textContent = d === 'pad' ? 'X' : 'E';
  };
  showDevice(device);

  // Pause: the game stands still, and the panel has the play style and "Jag har fastnat" (plan §6.10).
  let paused = false;
  let ended = false;
  const ending = createEnding(document, () => {
    input.release();
    audio.sleep(true);
    audio.setPlace(arrangementFor(chapter.id, chapter.place));
  });
  const explore = createExplore(document, (id) => {
    if (!platformBlocked() && offline.canStart()) goOn(id);
  }, canEnter);
  function openExplore(): void {
    if (platformBlocked() || !offline.canStart() || ending.open || story.open || photoAlbum.open || memories.open || !canEnter('epilog') || !storyFinished(save.flags)) return;
    input.release();
    if (!title.open) writeSave();
    explore.show(save);
  }
  for (const id of ['titleExplore', 'pauseExplore', 'endExplore']) {
    byId(id).hidden = !canEnter('epilog') || !storyFinished(save.flags);
    byId(id).addEventListener('click', openExplore);
  }
  let auto = !benchOn && requestedGraphics === 'auto' && view.info().tier === 'mid' ? createAutoTier() : null;
  let resolution = !benchOn && requestedGraphics === 'auto' ? createDynamicResolution() : null;
  let busyMs = 0;
  function platformBlocked(): boolean {
    return !bootReady || contextLost || !byId('message').hidden || document.hidden;
  }
  function menuOpen(): boolean {
    return paused || ended || title.open || memories.open || photoAlbum.open || story.open || explore.open || ending.open;
  }
  function focusScope(): HTMLElement | null {
    if (!byId('message').hidden) return byId('message');
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
    audio.sleep(true);
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
      game.sim.toCheckpoint();
      resume();
    },
  });
  const hdrAvailable = view.info().hdrAvailable;
  const photoAlbum = createPhotoAlbum(document, photoStore, photoPlayer, () => {
    if (chapter.epilogue && ended && !title.open && !profileMutationPending && !story.open && !memories.open && !explore.open && !platformBlocked() && ending.start()) {
      input.release(); pointing.cancel(); askedForUse = askedForHelp = false;
      audio.setPlace(null);
      audio.sleep(false);
      audio.unlock();
    }
  });
  void photoAlbum.refresh();
  // The candy bag's page (the album and the photos) belongs to the story's chapters, Byn too, not to the test and
  // look courses; Moa's map to the places she has drawn (docs/ux-audit/menus.md row 14).
  const storyCourse = [...STORY, ...BONUS].some((c) => c.id === chapter.id);
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
    audio.sleep(true);
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
    const text = [...STORY, ...BONUS].find((c) => c.id === id)?.scenes?.find((scene) => scene.id === 'card')?.stage?.words?.find((word) => word.kind === 'caption')?.text;
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
    onCode(id) {
      if (!offline.canStart() || !canEnter(id)) return false;
      // The chapter's start, with whatever this device has kept of the others. The code holds no candy.
      const others = <T>(all: Record<string, T>) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id)) as Record<string, T>;
      keepSavedPosition = false;
      save = { ...save, updated: Date.now(), settings, chapter: id, checkpoint: -1, checkpoints: others(save.checkpoints ?? {}), candy: others(save.candy), placed: others(save.placed), flags: others(save.flags) };
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
    setUpdateLock: (locked) => { byId('title').inert = locked; },
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
        if (platformBlocked() || menuOpen()) return;
        const what = pointing.tap({ x, y }, { world: (at) => view.worldScreen(at), player: () => view.playerScreen(), helper: () => view.helperScreen() });
        if (!what) return;
        if (what.kind === 'use') askedForUse = true;
        else if (what.kind === 'helper') askedForHelp = true;
        // Until it wakes, the carving is only wood: a dry tock, and no turn that would give its waking away
        // (docs/ux-audit/first-minutes.md row 21).
        else if (what.kind === 'ghost' && chapter.id === 'prolog' && !game.sim.flags.has('blink')) audio.play({ kind: 'tock' });
        else {
          view.react(what, settings.calm || reducedMotion.matches);
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
    if (!turned || menuOpen() || game.sim.scene?.holding || performance.now() - startedAt < 3000) return;
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
    audio.sleep(platformBlocked() || menuOpen());
    devicePlay.setPlaying(!platformBlocked() && !menuOpen());
    memories.suspend(platformBlocked());
    if (document.hidden) { input.release(); pointing.cancel(); askedForUse = askedForHelp = false; story.interrupt(); writeSave(); }
    else { game.resume(); devicePlay.visible(); }
  });
  window.addEventListener('pagehide', () => { devicePlay.setPlaying(false); writeSave(); });

  const debug: Debug | null = debugOn ? createDebug(byId('debug')) : null;
  if (debugOn) {
    window.__godis = {
      state: () => ({
        ...game.sim.curr, steps: game.sim.steps, flags: [...game.sim.flags], candy: game.sim.candyCount,
        bubbles: game.sim.bubbles, knocks: game.sim.knocks, bowled: game.sim.bowled, sinks: game.sim.sinks, blown: game.sim.blown, help: { ...game.sim.help }, checkpoint: game.sim.checkpoint, style: settings.style, paused, device,
        pointing: { last: pointing.last, walking: pointing.walking }, tutorial: tutorial.shown, playerId: store.currentId, playerName: store.players().find(p => p.id === store.currentId)?.name ?? save.name, course: chapter.id, said: [...game.sim.said], title: title.open, settings: { ...settings }, playerScreen: view.playerScreen(), noteHits: game.sim.noteHits, bootReady, contextLost, ending: { open: ending.open, seconds: ending.seconds }, prologue: game.sim.prologue?.frame ?? null,
        scene: game.sim.sceneFrame, held: game.sim.held,
      }),
      screen: (at) => view.worldScreen(at),
      info: () => ({ ...view.info(), busyMs, autoSettled: auto?.settled ?? true,
        sound: audio.running, soundsPlayed: audio.played, musicBars: audio.bars, soundPreviews: audio.previews }),
    };
  }

  // ?bench plays the course by itself for 30 seconds and then shows numbers to paste into a session.
  const bench = benchOn ? createBench(30, chapter) : null;

  /** "Nästa kapitel": the saved game moves on to the next chapter's start, and the page loads it. */
  function goOn(id: string): void {
    if (!canEnter(id)) return;
    writeSave();
    keepSavedPosition = false;
    save = visitChapter(save, id);
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
      audio.sleep(platformBlocked() || menuOpen());
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
    if (!recovering) {
      pausedBeforeLoss = paused;
      focusBeforeLoss = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    contextLost = true;
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
  // This one-button recovery dialog also works before the input controller has any game to control.
  byId('message').addEventListener('keydown', (event) => {
    if (event.key === 'Tab') { event.preventDefault(); byId('messageButton').focus(); }
  });
  byId('pauseAlbum').addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-memory]') : null;
    const id = button?.dataset.memory;
    const found = id && (id === chapter.id ? game.sim.flags.has('memory') : save.flags[id]?.includes('memory'));
    if (!button || platformBlocked() || !id || !found || !pause.open || memories.open || photoAlbum.open || story.open || explore.open) return;
    input.release();
    const rect = button.getBoundingClientRect();
    memories.play(id, () => { input.release(); game.resume(); }, {
      origin: rect.width > 0 && rect.height > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null,
      calm: settings.calm || reducedMotion.matches,
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
  let shown = false;
  let lastTime = 0;
  let savedAt = game.sim.checkpoint;
  function frame(time: number): void {
    requestAnimationFrame(frame);
    const began = performance.now();
    timer.update(time);
    devicePlay.setPlaying(!platformBlocked() && !menuOpen());
    if (document.hidden) { lastTime = time; return; }
    const dt = Math.min(timer.getDelta(), 0.25);
    const blocked = platformBlocked();
    memories.suspend(blocked);
    storyReminder.show(storyContext(chapter.id, game.sim.flags, game.sim.curr, save.flags), !blocked && !menuOpen());
    // On a chapter's last page the place's air goes on, and the tune's last note rings out.
    audio.sleep(blocked || (menuOpen() && !ending.open && !(ended && coda)));
    if (blocked) {
      pointing.cancel();
      askedForUse = askedForHelp = false;
      tutorialView.show(null, device, settings.followFinger, null);
      auto?.suspend();
      resolution?.suspend();
      input.poll();
      lastTime = time;
      return;
    }
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
      held = pointing.steer(held, edges);
      game.frame(dt, { x: held.x, y: held.y, hopHeld: held.hopHeld, talking: hud.speaking() }, edges);
      tutorial.update(dt, game.sim.curr, game.sim.flags, held, edges, game.sim.held);
      askedForUse = askedForHelp = false;
      if (highLanding(game.sim.curr)) devicePlay.landing(settings.vibration);
      playTime += dt * game.tempo;
      const now = hear();
      for (const cue of cuesFor(heard, now, memory)) audio.play(cue);
      heard = now;
    }
    if (game.sim.story && !story.open) {
      pointing.cancel();
      askedForUse = askedForHelp = false;
      input.release();
      story.show(game.sim.story, game.sim.flags);
      audio.sleep(true);
    }
    if (!remembered && game.sim.flags.has('memory')) {
      remembered = true;
      pointing.cancel();
      askedForUse = askedForHelp = false;
      input.release();
      writeSave();
      const shaving = chapter.spots?.find((spot) => spot.id === 'memory')?.at ?? game.sim.curr;
      memories.play(chapter.id, () => { input.release(); game.resume(); canvas.focus(); }, {
        // If the ghost is waiting beyond the camera, grow from the glowing shaving Elof just touched.
        origin: view.ghostScreen() ?? view.worldScreen({ x: shaving.x, y: shaving.y + 0.6 }),
        calm: settings.calm || reducedMotion.matches,
      });
      audio.sleep(true);
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
    view.render({
      // Under the title the place lives on (first-minutes.md row 4); under any other menu it stands still.
      prev: game.sim.prev, curr: game.sim.curr, alpha: game.alpha, dt: menuOpen() && !title.open ? 0 : dt, atGoal,
      collected: game.sim.collected, side: game.sim.collectedSide, checkpoint: game.sim.checkpoint, movers: game.sim.movers, drips: game.sim.drips,
      prologue: game.sim.prologue?.frame, scene: tableau ? { id: 'title', seconds: tableauSeconds } : game.sim.sceneFrame, ending: ending.seconds,
      flags: game.sim.flags, ghost: game.sim.ghost, rollers: game.sim.rollers, tussocks: game.sim.tussocks, gusts: game.sim.gusts, help: game.sim.help,
      berries: game.sim.berries,
      noteHits: game.sim.noteHits,
    });
    // Copy this exact rendered frame now, before WebGL's drawing buffer is discarded. Encoding and
    // IndexedDB run afterwards; the ordinary render loop never keeps its drawing buffer alive.
    const moment = !photosStopped && !benchOn && !at
      ? photoMoment(game.sim.curr, game.sim.flags, menuOpen() ? 0 : dt * game.tempo) : null;
    if (moment) void view.capture().then(async (blob) => {
      if (blob && !photosStopped && await photoStore.put({ player: photoPlayer, moment, blob })) await photoAlbum.refresh();
    });
    tutorialView.show(menuOpen() || platformBlocked() ? null : tutorial.shown, device, settings.followFinger, view.playerScreen());
    sceneUi.show(chapter.scenes, game.sim.sceneFrame, menuOpen() && !paused);
    hud.candy(game.sim.candyCount);
    // In the prologue the keycaps teach, so the line of keys waits unless he has stood 10 s without a key
    // (first-minutes.md row 22).
    document.body.classList.toggle('keys-later', chapter.id === 'prolog' && performance.now() - inputAt < 10000);
    // The prologue brings its controls in as they are needed (first-minutes.md rows 8 and 18).
    document.body.classList.toggle('before-chase', chapter.id === 'prolog' && !game.sim.flags.has('bag:torn'));
    document.body.classList.toggle('no-candy', chapter.id === 'prolog' && game.sim.candyCount === 0);
    storyReminder.show(storyContext(chapter.id, game.sim.flags, game.sim.curr, save.flags), !menuOpen());
    hud.verb(game.sim.curr.verb, game.sim.curr.word);
    hud.knock(game.sim.help.step >= 2 ? game.sim.help : null);
    // The album: what earlier chapters hold in the save, and what this one holds now.
    if (game.sim.flags.size !== flagsSeen) {
      flagsSeen = game.sim.flags.size;
      const all = { ...save.flags, [chapter.id]: rememberFlags(save.flags[chapter.id] ?? [], game.sim.flags) };
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
        if (fresh) hud.notice(sv.lostFound.replace('{name}', sv.lost[fresh] ?? fresh));
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
      const keepsakes = Object.values(all).some((flags) => flags.includes('keepsake:vittra')) ? ['vittra'] : [];
      byId('pauseAlbum').innerHTML = storyCourse ? albumHtml(found, lost, keepsakes) + memoryAlbumHtml(all) : '';
      const kinds = Object.keys(KINDS).length;
      byId('pauseBagCount').textContent = sv.album.count.replace('{found}', String(found.length)).replace('{total}', String(kinds));
      byId('pauseBagBtn').style.setProperty('--fill', String(kinds > 0 ? found.length / kinds : 0));
    }
    // A held scene takes the floor as it begins: what was said before it is not read over it.
    const scene = game.sim.sceneFrame;
    if (scene && scene.id !== sceneHeard) {
      if (chapter.scenes?.find((def) => def.id === scene.id)?.hold) hud.hush();
    }
    sceneHeard = scene?.id ?? null;
    for (; told < game.sim.said.length; told++) {
      const beat = beats.get(game.sim.said[told]!);
      // In a held scene a line is said when it is acted: it takes the floor instead of waiting for the last one.
      if (beat) hud.say(beat.who, beat.line, beat.priority || game.sim.held);
    }
    // What is said waits while a memory plays: its line comes after it.
    hud.tick(menuOpen() ? 0 : dt);
    // The end: a moment to arrive, then the card with the candy in rows of ten. The last words are let finish
    // first, for a few seconds at most: a chapter must not end over what someone is saying.
    if (atGoal) endFor += menuOpen() ? 0 : dt;
    if (atGoal && coda && !closing) {
      closing = true;
      audio.cadence();
      // The coda is the picture alone: the play's corners and words step aside while the tune closes.
      document.body.classList.add('coda');
    }
    // Only in the story: the test course has no family to answer.
    if (coda && !answered && endFor > CODA_ANSWER && Object.hasOwn(CODA_FAMILY, chapter.id)) {
      answered = true;
      audio.play({ kind: 'motif', who: CODA_FAMILY[chapter.id]! });
    }
    const wait = coda ? CODA : 1.4;
    if (endFor > wait && (!hud.speaking() || endFor > wait + 5.6) && !benchOn && !ended) {
      ended = true;
      paused = true;
      if (!coda) audio.sleep(true);
      // The coda's last picture, for the page: copied now, right after it was drawn.
      const picture = view.snapshot();
      byId('endPicture').replaceChildren(...(picture ? [picture] : []));
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
      const title = sv.end.named[chapter.id] ?? (number > 0 ? sv.end.chapter.replace('{n}', String(number)) : sv.end.course);
      const hidden = (chapter.hidden ?? []).map((h) => ({ kind: h.kind, found: game.sim.flags.has(foundFlag(h.kind)) }));
      storyReminder.handoff(storyHandoff(chapter.id, game.sim.flags));
      hud.end(title, game.sim.candyCount, playAgain, next ? () => goOn(next.id) : undefined, sv.end.closing[chapter.id], hidden, next ? codeFor(next.id) : null, bonus ? sv.end.bonus : undefined);
      byId(canExplore ? 'endExplore' : next ? 'endOnward' : 'endAgain').focus();
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

start();
