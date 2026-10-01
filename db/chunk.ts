/**
 * D1 caps the bound parameters in a single statement, and a multi-row insert
 * spends one per column per row - past the cap the query fails outright rather
 * than degrading, so the caller sees a bare 500 with nothing to go on.
 *
 * The arithmetic is easy to be caught out by. A lineup row has eleven columns,
 * so nine of them is ninety-nine parameters and fits, and the tenth takes it to
 * a hundred and ten and does not. That is exactly one designated hitter: every
 * ordinary nine-man order saved, and any side using a DH - which adds a tenth
 * row for the pitcher who does not bat - failed every time with "Could not save
 * the lineup".
 *
 * Anything inserting a variable number of rows should go through here.
 */
const MAX_BOUND_PARAMETERS = 90;

export async function insertInChunks<Row extends Record<string, unknown>>(
  insert: (rows: Row[]) => Promise<unknown>,
  rows: Row[],
) {
  if (rows.length === 0) return;
  const columns = Math.max(1, Object.keys(rows[0]).length);
  const perChunk = Math.max(1, Math.floor(MAX_BOUND_PARAMETERS / columns));
  for (let index = 0; index < rows.length; index += perChunk) {
    await insert(rows.slice(index, index + perChunk));
  }
}
