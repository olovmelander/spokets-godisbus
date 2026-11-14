/**
 * The picture beside one of the family (./view.ts, the near shot): he and whoever he has come up to in it together,
 * its middle between them and a little over their feet, never lower than both of them are tall.
 *
 * Where what lies beyond them belongs in it too, the spot says so (`Spot.vista`): on the wall in Byn i stormen, Moa
 * holds her umbrella out at the edge, and beyond her are the flooded crossing he is to float over and Anundsjö's
 * church behind it (Olov, 14 November 2026: "Kan vi göra kyrkan mer synlig i bakgrunden när Moa ger Elof sitt
 * paraply?"). There the picture looks further along the more he has come up to where he calls her, so that the two
 * of them stand in its near third with the crossing and the whole church beside them; and it is never narrower than
 * the vista needs, so a phone held upright shows more height instead.
 */
export interface Vista {
  /** How far on along the course the picture's middle is, once he has come up to them. */
  lead: number;
  /** The least the picture shows across, in EL at the play plane. */
  width: number;
}

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/** How far short of where he calls them he is when the picture begins to look on. */
const VISTA_FROM = 3;

/**
 * The near shot: its middle, and how tall it is. `tall` is how tall the play picture is there (the view's height
 * times the zone's zoom), `aspect` the screen's width over its height. `called` is where he stands to call them (the
 * spot): the vista opens as he comes up to it, and stays open when they walk on to where they help from.
 */
export function familyShot(elof: { x: number; y: number }, family: { x: number; y: number }, tall: number, aspect: number, vista?: Vista, called = family.x): { x: number; y: number; height: number } {
  const x = (family.x + elof.x) / 2 + (vista ? vista.lead * smooth((elof.x - called + VISTA_FROM) / VISTA_FROM) : 0);
  const height = Math.max(tall, 7.8 + Math.abs(family.y - elof.y), 8.8 / aspect, vista ? vista.width / aspect : 0);
  return { x, y: (family.y + elof.y) / 2 + 2.2, height };
}
