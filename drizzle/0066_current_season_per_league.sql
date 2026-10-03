-- The season being played is recorded per competition, not once for the site.
--
-- `current_season` was a single row from when the site held only the MBL. The
-- MCBA was imported afterwards and the two run at the same time, so one value
-- could not describe both: an MCBA game published while this said "MBL Season
-- XII Playoffs" would have had its stats filed into an MBL season, which is the
-- one thing historical_seasons.league_id exists to keep apart.
--
-- league_settings is a key/value table and its key is the primary key, so the
-- competition goes in the key rather than a column. A (key, league_id) pair
-- would have been the usual shape, but SQLite counts NULLs as distinct in a
-- unique index, which would let two rows of the same global setting exist.
--
-- The existing row is the MBL's. The MCBA has none until an admin sets one,
-- and nothing guesses on its behalf - publishing into the wrong competition is
-- what this is here to stop.
UPDATE league_settings
SET key = 'current_season:mbl'
WHERE key = 'current_season'
  AND NOT EXISTS (SELECT 1 FROM league_settings WHERE key = 'current_season:mbl');
