// dev/menus.html: every piece of DOM that lies over the game, shown without WebGL (plan §6.10).
// Choose what to show with ?show=touch, keys, pad, goal, pause, stuck, album, settings, message or debug; several
// can be joined with commas. Pause opens on its first page, or on the candy bag's or the settings' page.
// It uses the same shell and the same style sheet as the game, so it shows what the game shows.
import { KINDS } from '../src/content/kinds';
import { sv } from '../src/content/sv';
import { albumHtml } from '../src/ui/album';
import { settingsFor } from '../src/save/settings';
import { createPause } from '../src/ui/pause';
import { createHud } from '../src/ui/hud';
import { createTitle } from '../src/ui/title';
import { mountShell } from '../src/ui/shell';
import { createPhotoStore } from '../src/save/photos';
import { createPhotoAlbum } from '../src/ui/photos';
import { createStoryPanel } from '../src/ui/story';
import { createMemory } from '../src/ui/memory';
import { storyContext, storyHandoff } from '../src/content/story-context';
import { createStoryContext } from '../src/ui/story-context';
import '../src/ui/ui.css';

const VIEWS = ['touch', 'keys', 'pad', 'purpose', 'goal', 'title', 'saved', 'styles', 'pause', 'stuck', 'album', 'settings', 'end', 'photos', 'memory', 'sharing', 'painting', 'carving', 'party', 'bubble', 'message', 'debug'] as const;
const params = new URLSearchParams(location.search);
const shown = new Set((params.get('show') ?? 'touch').split(','));
const byId = (id: string) => document.getElementById(id)!;

mountShell(document.body, shown.has('memory') ? 'ghost' : 'jay');
const reminders = createStoryContext(document);
const chapter = params.get('chapter') ?? 'garden';
const flags = new Set((params.get('flags') ?? '').split(',').filter(Boolean));
reminders.show(storyContext(chapter, flags, { x: Number(params.get('x') ?? '0'), y: Number(params.get('y') ?? '0') }), shown.has('purpose'));
if (shown.has('end')) reminders.handoff(storyHandoff(chapter, flags));
if (shown.has('memory')) {
  const rect = byId('helpBtn').getBoundingClientRect();
  createMemory(document).play('garden', () => {}, { origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } });
}
const photos = createPhotoAlbum(document, createPhotoStore(null), 'preview');
void photos.refresh();
if (shown.has('photos')) photos.credits();
const story = createStoryPanel(document, { answer: () => true, cancel: () => {} });
if (shown.has('sharing')) story.show({ kind: 'share', spot: 'preview' }, new Set(['bag']));
if (shown.has('painting')) story.show({ kind: 'paint', spot: 'eye' }, new Set());
if (shown.has('carving')) story.show({ kind: 'carve', spot: 'cut2' }, new Set(['knife', 'cut1']));
if (shown.has('party')) story.show({ kind: 'party', spot: 'party:mamma' }, new Set());
byId('controls').hidden = !shown.has('touch');

const hint = shown.has('goal') ? sv.goal : shown.has('pad') ? sv.padHint : shown.has('keys') ? sv.keysHint : '';
if (hint) {
  byId('hint').hidden = false;
  byId('hint').textContent = hint;
}
// Three of every four kinds found: the stickers on the bag and in the album, and the empty rings between them.
const someKinds = Object.keys(KINDS).filter((_, i) => i % 4 !== 3);
if (shown.has('pause') || shown.has('stuck') || shown.has('album') || shown.has('settings')) {
  const pause = createPause(document, { onResume: () => pause.hide(), onSettings: () => {}, onStuck: () => pause.hide() });
  pause.show(settingsFor('aventyr'), false, shown.has('album') ? 'bag' : shown.has('settings') ? 'settings' : 'home');
  if (shown.has('stuck')) byId('stuckBtn').click();
  if (shown.has('album')) {
    byId('pauseAlbum').innerHTML = albumHtml(shown.has('all') ? Object.keys(KINDS) : someKinds);
    createHud(document, 116).stickers(someKinds);
  }
}
if (shown.has('title') || shown.has('saved') || shown.has('styles')) {
  const title = createTitle(document, { onStart: () => title.hide(), onStartOver: () => {}, onCode: () => title.hide() });
  title.show(shown.has('saved'));
  if (shown.has('styles')) title.showStyles();
}
if (shown.has('end') || shown.has('bubble')) {
  const hud = createHud(document, 116);
  if (shown.has('bubble')) {
    hud.say('moa', 'tiny');
    hud.tick(0.1);
  }
  if (shown.has('end')) hud.end(sv.end.chapter, 87, () => {}, undefined, undefined, Object.keys(KINDS).slice(0, 4).map((kind, i) => ({ kind, found: i !== 2 })));
}
if (shown.has('message')) {
  byId('messageText').textContent = sv.noWebGL;
  byId('messageButton').textContent = sv.retry;
  byId('message').hidden = false;
}
if (shown.has('debug')) {
  byId('debug').hidden = false;
  byId('debug').textContent = [
    '60 fps · frame p50 16.7 p95 17.1 ms',
    'busy p50 2.1 p95 3.4 ms',
    'steps/frame 2 · device touch',
    'draw calls 24 · triangles 2468 · programs 4',
  ].join('\n');
}

const nav = byId('devNav');
for (const view of VIEWS) {
  const link = document.createElement('a');
  link.href = `?show=${view}`;
  link.textContent = view;
  link.classList.toggle('on', shown.has(view));
  nav.append(link);
}
