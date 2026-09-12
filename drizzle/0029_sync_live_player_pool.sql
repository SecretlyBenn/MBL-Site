-- The all-star-break draft added players to the league, and the season archive
-- picked them up from MyStatsOnline - but the live `players` pool did not. That
-- pool is what the umpire's lineup page offers, so 44 players with Season XII
-- stats could not be put in a lineup: the Panthers' KexKK and DaMineyCraftKen
-- among them, and every other club affected too.
--
-- Adds the missing players only. Anyone already in the pool is left exactly as
-- they are, so re-running this changes nothing.
--
-- A player who appeared for two clubs has a stat line per club, so the club
-- picked here is the one they played the most games for - ties broken by team
-- id to keep the result the same on every run.
INSERT INTO players (minecraft_username, display_name, team_id, status)
SELECT name, name, team_id, 'ACTIVE'
FROM (
  SELECT
    hp.player_name AS name,
    t.id AS team_id,
    ROW_NUMBER() OVER (
      PARTITION BY hp.player_name
      ORDER BY hp.games DESC, t.id ASC
    ) AS pick
  FROM historical_player_stats hp
  JOIN historical_teams ht ON ht.id = hp.historical_team_id
  JOIN teams t ON t.name = ht.name
  WHERE hp.season_id = 1
    AND NOT EXISTS (
      SELECT 1 FROM players p WHERE p.display_name = hp.player_name
    )
)
WHERE pick = 1;
