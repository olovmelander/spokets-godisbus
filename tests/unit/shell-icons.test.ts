import { describe, expect, it } from 'vitest';
import { shellHtml } from '../../src/ui/shell-html';

/**
 * Every menu works for a child who can't read: each button a child presses has a picture as well as its word (plan
 * §6.10). The pause tiles, the end page's ways on and the title's buttons are read here from the page's own markup.
 */
const html = shellHtml();
const button = (id: string) => {
  const found = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>([\\s\\S]*?)</button>`));
  if (!found) throw Error(`no button #${id}`);
  return found[1]!;
};

describe('buttons a child presses carry a picture', () => {
  it.each([
    'resumeBtn', 'pauseBagBtn', 'stuckBtn', 'pauseSettingsBtn', 'titleBtn', 'stuckYes', 'stuckNo',
    'endPhotos', 'endOnward', 'endExplore', 'endHome', 'endAgain',
    'startBtn', 'titleStartOverBtn', 'startOverBtn', 'playersBtn', 'titleSettingsBtn', 'codeBtn', 'newPlayerBtn',
  ])('#%s', (id) => {
    expect(button(id)).toMatch(/<svg/);
  });
});
