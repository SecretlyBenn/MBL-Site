-- The live side now has to tell the two competitions apart as well.
--
-- The archive manages with one column on `historical_seasons`, because every
-- archived row hangs off a season. Nothing on the live side does: a club is
-- just a club, and players, fixtures and roles all point at one. So the league
-- goes on `teams`, and everything else reaches it through the club it belongs
-- to.
--
-- Added nullable because SQLite cannot add a NOT NULL column to a table that
-- already has rows; the backfill below fills every one. Every club on the live
-- side today is the MBL's - the MCBA has never been scored here.

ALTER TABLE teams ADD COLUMN league_id integer REFERENCES leagues (id);
UPDATE teams
  SET league_id = (SELECT id FROM leagues WHERE slug = 'mbl')
  WHERE league_id IS NULL;

-- Club lists are always for one league, alphabetically.
CREATE INDEX IF NOT EXISTS teams_league_idx ON teams (league_id, name);

-- The Florida Riptide were rebranded as the Cincinnati Knights, and the
-- rebrand was done by adding the Knights rather than renaming the Riptide, so
-- the MBL has shown eleven live clubs where it has ten. The Knights carry the
-- squad (21 players) and the fixture; the Riptide row carries nothing at all -
-- no players, no roster moves, no fixtures, no manager and no crest - so it is
-- the empty duplicate and it goes.
--
-- This is the live pool only. The Riptide's eight seasons live in
-- `historical_teams`, which is keyed per season and untouched here, so their
-- record stays exactly where it is.
DELETE FROM teams
  WHERE name = 'Florida Riptide'
    AND id NOT IN (SELECT team_id FROM players WHERE team_id IS NOT NULL)
    AND id NOT IN (SELECT team_id FROM roster_moves WHERE team_id IS NOT NULL)
    AND id NOT IN (SELECT team_id FROM users WHERE team_id IS NOT NULL)
    AND id NOT IN (SELECT away_team_id FROM games)
    AND id NOT IN (SELECT home_team_id FROM games);
