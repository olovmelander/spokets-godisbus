import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePage } from '../robot/listener';
import { createHud } from '../../src/ui/hud';

const voice = vi.hoisted(() => ({ key: null as string | null }));
vi.mock('../../src/audio/voice-player', () => ({
  playingVoice: () => voice.key,
  playVoice: (key: string) => { voice.key = key; },
  stopVoice: () => { voice.key = null; },
}));

beforeEach(() => { voice.key = null; });

describe('the bubble and the recording finish together', () => {
  it('keeps a long recording visible and postpones the queued line beyond its reading estimate', () => {
    const shown: string[] = [];
    const hud = createHud(fakePage({ show: (line) => shown.push(line), hide: () => shown.push('hidden') }), 0);
    hud.say('elof', 'tiny'); hud.tick(0);
    hud.say('pappa', 'first1');
    hud.tick(30); hud.tick(30);
    expect(shown).toHaveLength(1);
    expect(voice.key).toBe('tiny');
    expect(hud.speaking()).toBe(true);
    voice.key = null;
    hud.tick(0);
    expect(voice.key).toBe('first1');
    expect(shown.at(-1)).toBe('Min allra första trägubbe …');
  });

  it('does not let Fortsätt cut an audible story line', () => {
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0);
    hud.say('pappa', 'first1', true); hud.tick(0); hud.tick(30);
    expect(hud.advance()).toBe(false);
    expect(hud.reading()).toBe(true);
    expect(voice.key).toBe('first1');
    voice.key = null;
    expect(hud.advance()).toBe(true);
    expect(hud.reading()).toBe(false);
  });
});
