-- A pre-season is not a season, so records should not come out of one.
--
-- The MCBA has three of them - X, XII and XIII - and they sit in the archive
-- alongside the real thing. They are a handful of warm-up games, which is the
-- same objection as the playoffs: too short to set a counting record, long
-- enough to put a hot fortnight at the top of a rate board and call it the
-- best season anybody ever had.
--
-- A flag rather than reading the name at the point of use, because that is
-- how `is_playoffs` already works here: `/api/seasons` derives it from the
-- name once when the season is made, an admin can say otherwise, and
-- everything downstream asks the column. A page that matched on "Pre-season"
-- itself would be a second opinion that could disagree with this one.
--
-- Re-running this errors on the ALTER with "duplicate column name", which is
-- safe: it means the column is already there and nothing else has run. The
-- backfill underneath sets a value rather than changing one, so it is free to
-- repeat on its own.
ALTER TABLE historical_seasons ADD COLUMN is_preseason INTEGER NOT NULL DEFAULT 0;

-- Set from the names the import gave them, which is the only record of which
-- ones they are. Written as an exact list rather than a LIKE, so it cannot
-- quietly catch a future season whose name happens to contain the word.
UPDATE historical_seasons
SET is_preseason = 1
WHERE name IN (
  'MCBA Season X Pre-season',
  'MCBA Season XII Pre-season',
  'MCBA Season XIII Pre-season'
);
