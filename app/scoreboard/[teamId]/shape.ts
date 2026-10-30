/**
 * Which shape of screen a stadium board is being shown on.
 *
 * A screen in Minecraft is whatever somebody built, and the two shapes grounds
 * actually get built in are nothing like the sixteen-by-nine the board was
 * drawn for. A board above the batter's eye is close to square, like
 * Kauffman's; a ribbon along a deck is enormously wide and a few blocks tall,
 * like Es Con Field's. The same panels at the same proportions cannot serve all
 * three, so the shape decides which of them are on the screen at all rather
 * than squeezing every one onto it. `Jumbotron.tsx` does the deciding.
 *
 * This sits in its own file because the page reads the shape out of the address
 * on the server and the board uses it in the browser. Exporting the function
 * from the board itself made it a client reference, and calling one of those on
 * the server fails the render outright - a blank screen in a ballpark.
 */
export type BoardShape = "wide" | "tall" | null;

/**
 * The shape named in the address, or null for the board as it has always been.
 *
 * Anything unrecognised is null rather than an error. A shape is typed into a
 * plugin's configuration by hand, and the cost of a typo is a wall-sized screen
 * in the middle of a ballpark, so a misspelling has to render the board
 * everybody already knows instead of nothing at all. An address with no shape
 * on it is every screen in use today, and all of them are the original board.
 */
export function boardShape(value: string | undefined): BoardShape {
  return value === "wide" || value === "tall" ? value : null;
}

/**
 * The shape a screen of these proportions should be drawn in.
 *
 * The board measures itself rather than being told. Whoever builds a screen in
 * a ballpark knows how many blocks wide it is and should not then have to write
 * that down somewhere a second time: a fact kept in two places is a fact that
 * can disagree with itself, which is how a ground ends up with a config saying
 * one thing and a wall saying another.
 *
 * The thresholds are wide because the layouts either side of them are quite
 * different, and a screen sitting near a boundary should not flip between them
 * as somebody resizes a window. The ordinary sixteen-by-nine board is 1.78 and
 * holds from 1.5 to 4, which is everything from a little narrower than that to
 * four times as wide as it is tall.
 *
 * The upper threshold was 2.8 and that was too eager: a board built three times
 * as wide as it is tall lost both batting orders, which is the half of the
 * screen people actually read, for no reason. Nothing about the ordinary board
 * breaks on a wide screen - above about 1.72 its unit is pinned to the height
 * rather than the width, so every row is the same size and in the same place on
 * a 2:1 screen as on a 4:1 one, and the extra width only spreads the three
 * columns further apart. What forces a ribbon is not the width but the height:
 * a screen built a few blocks tall draws its type at about two and a half
 * hundredths of that, which nobody in the stands can read, and a high ratio is
 * the only evidence of shortness the board gets. The page is drawn into a
 * buffer whose long side is always 1920 pixels, so the proportions are all
 * there is to go on - a forty-eight-by-six ribbon and a four-by-half-a-block
 * one arrive identical.
 *
 * Four is where the two kinds of build separate. Grounds put up either a
 * scoreboard, which comes out between about 1.7 and 3.5 whatever its size, or a
 * ribbon along a deck, which is five times as wide and up, and almost nothing
 * is built in between. A thirty-two-by-eight screen lands exactly on the
 * boundary and is treated as a ribbon, which is right: eight blocks tall is too
 * short for nine names down each side.
 *
 * Past 4 there is room for one row and no more. Below 1.5 the width runs out
 * before the height does: the ordinary board's unit is capped on the width once
 * the ratio drops under about 2.2, so from there down the type shrinks with
 * every block of width lost while the height sits unused. Dropping the two
 * batting orders gives the middle column the whole width and roughly triples
 * the unit, which is why a four-by-three screen is better off as a tall board
 * than as a squeezed ordinary one, even though all three rows would technically
 * still fit on it.
 */
export function shapeFor(width: number, height: number): BoardShape {
  // A height of zero is a screen that has not been laid out yet, and dividing
  // by it gives Infinity - which would read as the widest possible ribbon and
  // draw the wrong board for a frame.
  if (!(height > 0) || !(width > 0)) return null;
  const ratio = width / height;
  if (ratio >= 4) return "wide";
  if (ratio <= 1.5) return "tall";
  return null;
}
