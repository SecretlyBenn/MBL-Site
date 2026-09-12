-- The first playoff game was published before publishScorecard learned to take
-- its season from the fixture, so it resolved both clubs against the regular
-- season: the game sits in the playoffs (season 16) while its away_team_id and
-- home_team_id point at Season XII's team rows.
--
-- recomputeSeason walks a season's own teams and matches games to them by id,
-- so nothing matched - the playoff clubs stayed 0-0 and no player line was
-- built, which is why the playoffs read as having no statistics at all.
--
-- Repoints any season-16 game at the season-16 row for the same club. Games
-- already pointing at the right rows are left alone, so this is safe to re-run.
UPDATE historical_games
SET away_team_id = (
  SELECT t.id FROM historical_teams t
  WHERE t.season_id = 16
    AND t.name = (SELECT name FROM historical_teams WHERE id = historical_games.away_team_id)
)
WHERE season_id = 16
  AND away_team_id IS NOT NULL
  AND away_team_id NOT IN (SELECT id FROM historical_teams WHERE season_id = 16);

UPDATE historical_games
SET home_team_id = (
  SELECT t.id FROM historical_teams t
  WHERE t.season_id = 16
    AND t.name = (SELECT name FROM historical_teams WHERE id = historical_games.home_team_id)
)
WHERE season_id = 16
  AND home_team_id IS NOT NULL
  AND home_team_id NOT IN (SELECT id FROM historical_teams WHERE season_id = 16);
