import { sv } from '../content/sv';
import { createStrokeUI, strokeHtml } from './story-stroke';
import { FRIENDS, PARTY_GUESTS, SWEETS, partyReward, sharingReward, type Friend, type PartyGuest, type StoryAction, type StoryAnswer, type Sweet } from '../sim/story';

const pictures: Record<Sweet, string> = {
  gelehallon: '<path d="M16 50q-2-32 18-35q20 3 18 35z" fill="#d84967"/><path d="M24 27v17m10-24v26m10-19v17" stroke="#fca2a1" stroke-width="3"/>',
  karamell: '<path d="M19 24L5 16v32l14-8m30-16 14-8v32l-14-8" fill="#efb756"/><rect x="18" y="20" width="32" height="26" rx="10" fill="#559999"/><path d="M27 21v23m13-23v23" stroke="#cce3cb" stroke-width="4"/>',
  skumbanan: '<path d="M12 20q6 42 43 19q-10 29-38 10Q2 38 12 20z" fill="#e6be42" stroke="#fff0a4" stroke-width="2"/>',
  lingon: '<circle cx="34" cy="38" r="16" fill="#b33748"/><path d="M34 23q-2-17 12-16q-1 12-12 16" fill="#789451"/><circle cx="29" cy="33" r="3" fill="#e99994"/>',
};
const familyPortrait = (shirt: string, hair: string) => `<path d="M13 62V42q20-15 42 0v20" fill="${shirt}"/><circle cx="34" cy="24" r="18" fill="#dfb586"/><path d="M16 23Q12 2 34 2t18 23L42 13l-13 4-9-2z" fill="${hair}"/><path d="M27 29q7 8 14 0" fill="none" stroke="#765039" stroke-width="2"/>`;
const portraits = {
  mamma: familyPortrait('#829887', '#7a5739'), pappa: familyPortrait('#a88359', '#544137'),
  moa: familyPortrait('#758dab', '#b79668'), bertil: familyPortrait('#baa061', '#976e46'),
  tragubbe: '<path d="M18 58V31h30v27" fill="#bf8c58"/><circle cx="33" cy="27" r="13" fill="#dfbc84"/><path d="M16 21L33 2l18 19z" fill="#9c6a49"/>',
  spoket: '<path d="M14 55V26q0-23 20-23t20 23v29l-8-5-8 5-8-5-8 5z" fill="#e7d4a6"/><circle cx="27" cy="23" r="3"/><circle cx="40" cy="23" r="3"/><path d="M37 38h19v20H37z" fill="#a37243"/>',
  jay: '<path d="M14 39q3-27 25-21q19 5 11 26L29 54z" fill="#979ca0"/><path d="M15 36l18-8-4 19z" fill="#b08057"/><path d="M47 23l17 5-15 5z" fill="#555454"/><circle cx="44" cy="24" r="3"/>',
};
const ALL_FRIENDS = [...new Set<Friend | PartyGuest>([...FRIENDS, ...PARTY_GUESTS])];
const names = { ...sv.sharing.friends, ...sv.party.friends };
const isFriend = (friend: Friend | PartyGuest): friend is Friend => (FRIENDS as readonly string[]).includes(friend);
const isGuest = (friend: Friend | PartyGuest): friend is PartyGuest => (PARTY_GUESTS as readonly string[]).includes(friend);
const svg = (inside: string) => `<svg viewBox="0 0 68 64" aria-hidden="true">${inside}</svg>`;

export const storyPanelHtml = `<div class="panel-back" id="storyPanel" hidden>
  <section class="panel story-panel" role="dialog" aria-modal="true" aria-labelledby="storyTitle" aria-describedby="storyHint">
    <button class="panel-close" id="storyClose" aria-label="${sv.sharing.back}" type="button">✕</button>
    <h2 id="storyTitle">${sv.sharing.title}</h2>
    <p id="storyHint">${sv.sharing.choose}</p>
    <div id="sharingBody"><div id="shareSweets" class="share-sweets" role="group" aria-label="${sv.sharing.choose}">${SWEETS.map((sweet) => `<button type="button" class="share-choice" data-sweet="${sweet}" aria-pressed="false">${svg(pictures[sweet])}<span>${sv.sharing.sweets[sweet]}</span></button>`).join('')}</div>
    <p class="share-bird-rule">${sv.sharing.bird}</p>
    <div id="shareFriends" class="share-friends" role="group" aria-label="${sv.sharing.friend}">${ALL_FRIENDS.map((friend) => `<button type="button" class="share-choice" data-friend="${friend}" disabled>${svg(portraits[friend])}<span>${names[friend]}</span><small></small></button>`).join('')}</div>
    </div>${strokeHtml}
    <p id="storyStatus" role="status" aria-live="polite"></p>
  </section>
</div>`;

export function createStoryPanel(doc: Document, handlers: { named?(): boolean; answer(answer: StoryAnswer): boolean; cancel(): void }) {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const element = byId('storyPanel');
  const stroke = createStrokeUI(doc, (answer) => {
    if (!handlers.answer(answer)) return false;
    element.hidden = true;
    stroke.cancel();
    return true;
  });
  let flags: ReadonlySet<string> = new Set();
  let chosen: Sweet | null = null;
  let kind: 'share' | 'party' = 'share';
  function draw(): void {
    for (const sweet of SWEETS) {
      const button = element.querySelector<HTMLButtonElement>(`[data-sweet="${sweet}"]`)!;
      button.hidden = kind === 'party' && sweet === 'lingon';
      button.setAttribute('aria-pressed', String(chosen === sweet));
    }
    for (const friend of ALL_FRIENDS) {
      const button = element.querySelector<HTMLButtonElement>(`[data-friend="${friend}"]`)!;
      const given = flags.has(`${kind === 'party' ? 'party' : 'share'}:${friend}`);
      button.hidden = kind === 'party' ? !isGuest(friend) : !isFriend(friend);
      button.querySelector('span')!.textContent = friend === 'spoket' && handlers.named?.() ? sv.ghostName : names[friend];
      button.disabled = !chosen || !(kind === 'party' ? isGuest(friend) && partyReward(flags, friend, chosen) : isFriend(friend) && sharingReward(flags, friend, chosen));
      button.querySelector('small')!.textContent = given ? `✓ ${sv.sharing.given}` : '';
    }
    byId('storyStatus').textContent = chosen ? sv.sharing.nowFriend.replace('{sweet}', sv.sharing.sweets[chosen]) : '';
  }
  for (const sweet of SWEETS) element.querySelector(`[data-sweet="${sweet}"]`)!.addEventListener('click', () => { chosen = sweet; draw(); });
  for (const friend of ALL_FRIENDS) element.querySelector(`[data-friend="${friend}"]`)!.addEventListener('click', () => {
    if (!chosen) return;
    const answer: StoryAnswer | null = kind === 'party'
      ? isGuest(friend) && chosen !== 'lingon' ? { kind, sweet: chosen, friend } : null
      : isFriend(friend) ? { kind, sweet: chosen, friend } : null;
    if (answer && handlers.answer(answer)) element.hidden = true;
  });
  function back(): void {
    if (element.hidden) return;
    element.hidden = true;
    stroke.cancel();
    handlers.cancel();
  }
  byId('storyClose').addEventListener('click', back);
  element.addEventListener('click', (event) => { if (event.target === element) back(); });
  return {
    element,
    get open() { return !element.hidden; },
    interrupt: () => stroke.interrupt(),
    show(action: StoryAction, current: ReadonlySet<string>) {
      flags = current;
      chosen = null;
      const sharing = action.kind === 'share' || action.kind === 'party';
      kind = action.kind === 'party' ? 'party' : 'share';
      byId('sharingBody').hidden = !sharing;
      byId('sharingBody').classList.toggle('party', kind === 'party');
      element.querySelector<HTMLElement>('.share-bird-rule')!.hidden = kind === 'party';
      byId('strokeBody').hidden = sharing;
      byId('storyTitle').textContent = sharing ? kind === 'party' ? sv.party.title : sv.sharing.title : action.kind === 'carve' ? sv.carving.title : sv.painting.title;
      byId('storyHint').textContent = sharing ? sv.sharing.choose : action.kind === 'carve' ? sv.carving.hint : sv.painting.hint;
      byId('storyStatus').textContent = '';
      element.hidden = false;
      if (sharing) {
        draw();
        element.querySelector<HTMLButtonElement>('[data-sweet]')!.focus();
      } else stroke.show(action);
    },
    back,
  };
}
