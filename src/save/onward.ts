/**
 * A chapter reached from the page before it ("Nästa kapitel", "Spela igen", a chapter's code) opens on its own
 * time card, not on the title (docs/ux-audit.md). The page that leaves marks the chapter in this tab's session; the
 * page that loads takes the mark, once. A reload by hand or a new tab shows the title as before, and so does a
 * browser that keeps no session storage.
 */
const KEY = 'godisbus.v1.onward';
/**
 * The time card the next page opens on ("Gården · klockan tio"): index.html shows it on the loading card, black, so
 * the chapter fades up from its own card (docs/ux-audit/first-minutes.md row 2).
 */
export const CARD_KEY = 'godisbus.v1.onward-card';

type Session = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function session(): Session | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Marks the chapter the next page load is going on to, and the words of the card it opens on. */
export function markOnward(id: string, storage: Session | null = session(), card?: string): void {
  try {
    storage?.setItem(KEY, id);
    if (card) storage?.setItem(CARD_KEY, card);
    else storage?.removeItem(CARD_KEY);
  } catch {
    // Without session storage the title shows, as it always did.
  }
}

/** Whether this load goes on from the page before into this chapter. The mark is used up either way. */
export function takeOnward(id: string, storage: Session | null = session()): boolean {
  try {
    const marked = storage?.getItem(KEY) ?? null;
    storage?.removeItem(KEY);
    storage?.removeItem(CARD_KEY);
    return marked === id;
  } catch {
    return false;
  }
}
