/** Two real chimney caps in art/procedural/bredbyn-street.ts; local to the baked street.
 * Both share a depth so the existing one-mesh smoke batch stays attached as the camera travels. */
export const BRED_BYN_CHIMNEYS = [[6.2, 14.79], [68, 15.29]] as const;
export const BRED_BYN_SMOKE_Z = -52.19;

/**
 * Where Anundsjö's church stands far behind the street in each chapter that has it, in EL: the middle of the nave's foot
 * (its belfry stands beside it, to the right), and how big it is beside the model (art/procedural/bredbyn-landmarks.ts).
 * src/render/view.ts puts it there.
 *
 * In Byn i stormen it stands over the flooded crossing, to the right of the wall Moa waits on, and a little higher than
 * in Byn (Olov, 14 November 2026: "Kan vi göra kyrkan mer synlig i bakgrunden när Moa ger Elof sitt paraply? Nu syns
 * bara halva kyrkan."). It stood behind the wall, behind Moa and her umbrella, and behind two birches of the yard, with
 * the lamp post before its belfry. Now nothing stands before it from the wall: its nave is clear of her umbrella where
 * she holds it out to him, its belfry of the shoemaker's gable, and its windows of the yard's hedge.
 */
export const BREDBYN_CHURCH = {
  scale: 0.53, z: -29,
  at: { byn: { x: 46, y: 2.3 }, 'look-street': { x: 13, y: 2.3 }, stormbyn: { x: 107.2, y: 3 } } as Record<string, { x: number; y: number }>,
} as const;

/** The church's place in a chapter; Byn's, where the chapter has none of its own. */
export const churchAt = (chapter: string): { x: number; y: number } => BREDBYN_CHURCH.at[chapter] ?? BREDBYN_CHURCH.at.byn!;
