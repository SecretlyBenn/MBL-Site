-- Which competition a player belongs to, and which competitions have a minor
-- league at all.
--
-- Until now a player's league came only from their club, which breaks the
-- moment they are released: team_id goes null and they belong to no
-- competition. That is why an MCBA club could see the MBL's free agents -
-- there was nothing on a free agent saying whose free agent they were.
--
-- Backfilled from the club they are on. The six existing free agents are the
-- MBL's: they were released before the MCBA was on the site at all.

ALTER TABLE players ADD COLUMN league_id integer REFERENCES leagues (id);

UPDATE players
SET league_id = (SELECT t.league_id FROM teams t WHERE t.id = players.team_id)
WHERE team_id IS NOT NULL AND league_id IS NULL;

UPDATE players
SET league_id = (SELECT id FROM leagues WHERE slug = 'mbl')
WHERE league_id IS NULL;

CREATE INDEX IF NOT EXISTS players_league_idx ON players (league_id, status);

-- Triple-A is the MBL's. The MiBL is its minor league - the Coyotes' roster is
-- MBL players sent down - and the college clubs have nothing beneath them, so
-- "Send to AAA" has no meaning there. Recorded on the league rather than
-- checked against a slug in code, so a third competition can say for itself.
ALTER TABLE leagues ADD COLUMN has_minor_league integer DEFAULT 0 NOT NULL;

UPDATE leagues SET has_minor_league = 1 WHERE slug = 'mbl';
