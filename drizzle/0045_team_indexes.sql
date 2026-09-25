-- 0025 indexed the archive by season, by game and by player, but not by club,
-- and every roster page asks for one club: `where historical_team_id = ?`.
-- With nothing to look it up by, D1 scanned both tables end to end - 1,986 rows
-- read to list a roster of twenty, 2,132 to find eleven stat lines. Measured
-- over a week those two queries were 59% of every row the site read, against a
-- free-tier allowance of 5 million a day that an unindexed import has exhausted
-- before now.

-- A season's roster page reads the entries for one club.
CREATE INDEX IF NOT EXISTS historical_roster_entries_team_idx
  ON historical_roster_entries (historical_team_id);

-- And that club's season lines, which the same page shows beside them.
CREATE INDEX IF NOT EXISTS historical_player_stats_team_idx
  ON historical_player_stats (historical_team_id);
