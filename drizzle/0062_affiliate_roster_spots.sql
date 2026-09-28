-- A second club a player is available for.
--
-- `players.team_id` is the one club a player belongs to, and that is right for
-- almost everybody. The MiBL breaks it: the Coyotes' roster is MBL players who
-- were sent down, and the league's position is that they stay available to
-- both clubs, because the site has no way of knowing on any given day whether
-- someone is down or has been recalled.
--
-- Rather than move them - which would take them off the MBL roster they are
-- actually on - a player can hold extra spots here. `players.team_id` stays
-- the club they belong to; a row here is a club they can also be picked for.
--
-- Seeded with the fourteen MBL players on the Coyotes' MCBA XIV roster. The
-- other sixteen are on the Coyotes properly, through players.team_id, because
-- they are not in the MBL pool at all.

CREATE TABLE IF NOT EXISTS roster_spots (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  player_id integer NOT NULL REFERENCES players (id),
  team_id integer NOT NULL REFERENCES teams (id),
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  -- One spot per player per club; a second is the same fact twice.
  UNIQUE (player_id, team_id)
);

CREATE INDEX IF NOT EXISTS roster_spots_team_idx ON roster_spots (team_id);

INSERT OR IGNORE INTO roster_spots (player_id, team_id)
SELECT DISTINCT p.id, live.id
FROM historical_roster_entries r
JOIN historical_teams t ON t.id = r.historical_team_id
JOIN historical_seasons s ON s.id = t.season_id
JOIN players p ON p.minecraft_username = r.player_name
JOIN teams live
  ON live.name = t.name
 AND live.league_id = (SELECT id FROM leagues WHERE slug = 'mcba')
WHERE s.name = 'MCBA XIV'
  AND t.league = 'MIBL'
  -- Only those whose own club is somewhere else; the sixteen already on the
  -- Coyotes need no second spot.
  AND (p.team_id IS NULL OR p.team_id <> live.id);
