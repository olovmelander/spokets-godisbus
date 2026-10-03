/**
 * The family, as the game knows them (plan §2.3): four people besides Elof, each with a model of their own
 * once the private pack has one. A sign stands for a person wherever one can be called or given something;
 * the word on the button says who.
 */
export const PEOPLE = ['mamma', 'pappa', 'moa', 'bertil'] as const;
export type Person = (typeof PEOPLE)[number];

const WORDS: Record<string, Person> = {
  callMamma: 'mamma', giveMamma: 'mamma',
  callPappa: 'pappa', givePappa: 'pappa',
  callMoa: 'moa', giveMoa: 'moa',
  callBertil: 'bertil', giveBertil: 'bertil',
};

/** Who a sign with this word stands for, or null when it stands for a thing: the knife, the way home. */
export const personFor = (word: string | undefined): Person | null => (word === undefined ? null : (WORDS[word] ?? null));
