import type { StoryContext } from '../content/story-context';

/** Untimed story reminders. No animation, input handler, focus change or progress of their own. */
export function createStoryContext(doc: Document) {
  const byId = (id: string) => doc.getElementById(id)!;
  const purpose = byId('storyPurpose');
  const recap = byId('pauseStory');
  const title = byId('titleStory');
  const handoff = byId('endStory');
  let shown: string | null = null;
  return {
    show(context: StoryContext | null, playing: boolean) {
      purpose.hidden = !context || !playing;
      recap.hidden = title.hidden = context === null;
      const key = context ? `${context.id}:${context.reveal}:${context.recap}:${context.family}` : null;
      if (key === shown) return;
      shown = key;
      if (!context) return;
      purpose.dataset.purpose = context.id;
      byId('storyPurposeIcon').textContent = context.icon;
      byId('storyPurposeText').textContent = context.purpose;
      byId('storyPurposeReveal').hidden = context.reveal === null;
      byId('storyPurposeReveal').textContent = context.reveal;
      byId('pauseStoryPurpose').textContent = context.purpose;
      byId('pauseStoryRecap').textContent = context.recap;
      byId('pauseStoryFamily').textContent = context.family;
      byId('titleStoryPurpose').textContent = context.purpose;
      byId('titleStoryRecap').textContent = context.recap;
    },
    handoff(context: { title: string; text: string } | null) {
      handoff.hidden = context === null;
      if (!context) return;
      byId('endStoryTitle').textContent = context.title;
      byId('endStoryText').textContent = context.text;
    },
  };
}
