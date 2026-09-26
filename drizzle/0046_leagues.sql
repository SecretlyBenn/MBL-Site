-- The site was built for one league and is about to hold two: the MBL and the
-- Minecraft Collegiate Baseball Association, whose fourteen seasons are still
-- on MyStatsOnline. The MiBL's clubs come in under the MCBA, which is where
-- their games already are.
--
-- Everything in the archive hangs off a season - teams, games, stat lines and
-- rosters all reference one - so naming the league on `historical_seasons` is
-- enough to tell the whole archive apart. Every season that exists today is
-- the MBL's.

CREATE TABLE IF NOT EXISTS leagues (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  -- What the league is called in an address: /mbl/standings.
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  abbreviation text NOT NULL UNIQUE,
  -- Which one the site opens on, lowest first.
  sort_order integer NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO leagues (slug, name, abbreviation, sort_order) VALUES
  ('mbl', 'Minecraft Baseball League', 'MBL', 0),
  ('mcba', 'Minecraft Collegiate Baseball Association', 'MCBA', 1);

-- Added nullable because SQLite cannot add a NOT NULL column to a table with
-- rows in it; the backfill below fills every one.
ALTER TABLE historical_seasons ADD COLUMN league_id integer REFERENCES leagues (id);
UPDATE historical_seasons
  SET league_id = (SELECT id FROM leagues WHERE slug = 'mbl')
  WHERE league_id IS NULL;

-- A season list is always for one league, in season order.
CREATE INDEX IF NOT EXISTS historical_seasons_league_idx
  ON historical_seasons (league_id, sort_order);
