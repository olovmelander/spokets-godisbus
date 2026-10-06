import { describe, expect, it } from 'vitest';
import { candyRows } from '../../src/ui/rolls';

// The candy in tens, each ten a roll (docs/ux-audit/story-presentation.md row 12): never a box that scrolls.
describe('the candy, counted in rolls', () => {
  it('wraps each ten in a roll and shows the rest one by one', () => {
    const rows = candyRows(143);
    expect(rows.match(/class="roll"/g)).toHaveLength(14);
    expect(rows.match(/<i><\/i>/g)).toHaveLength(3);
    expect(candyRows(0)).toBe('');
    expect(candyRows(7).match(/<i><\/i>/g)).toHaveLength(7);
  });
});
