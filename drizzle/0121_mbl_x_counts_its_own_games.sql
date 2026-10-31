-- MBL Season X's standings disagreed with its own schedule, and the schedule
-- was right.
--
-- The original import scraped the games from MyStatsOnline and the standings
-- from MyStatsOnline's standings page, which is two records of the same
-- season. Then it appended one game by hand - seed-historical.sql line 1827,
-- California Grizzlies 1 Pittsburgh Pistons 0 on Sunday 14 July 2024, the only
-- game in the season with no source_game_id. It reached the schedule and never
-- reached the table, so the Grizzlies were a win short and the Pistons a loss
-- short. A second forfeit, Hershey Otters 0 California Grizzlies 1 on 24 June,
-- was in both clubs' win-loss but its run had not reached either run column.
--
-- Five of the season's eight clubs already matched their own games to the run,
-- which is what makes the other three a gap in the import rather than a
-- difference of opinion. The league's owner confirmed the 14 July game was
-- played. So every club in the season is set from its own games: a no-op for
-- the five, and the correction for the Grizzlies (9-7, 33 scored -> 10-7, 35),
-- the Pistons (8-8, 34 allowed -> 8-9, 35) and the Otters (44 allowed -> 45).
--
-- Forfeits are counted, because that is what every other MBL season does: the
-- token 1-0 is in the run totals of all 26 forfeits in Seasons VI to XII,
-- club for club. Season X was the only season out of step.
--
-- Written to be set rather than added to, so running it twice is the same as
-- running it once. It touches only the archive, so the old account's copy
-- takes it as-is.

UPDATE historical_teams
SET
  wins = (
    SELECT COUNT(*) FROM historical_games g
    WHERE g.season_id = historical_teams.season_id
      AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL
      AND ((g.home_team_id = historical_teams.id AND g.home_score > g.away_score)
        OR (g.away_team_id = historical_teams.id AND g.away_score > g.home_score))
  ),
  losses = (
    SELECT COUNT(*) FROM historical_games g
    WHERE g.season_id = historical_teams.season_id
      AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL
      AND ((g.home_team_id = historical_teams.id AND g.home_score < g.away_score)
        OR (g.away_team_id = historical_teams.id AND g.away_score < g.home_score))
  ),
  runs_scored = (
    SELECT COALESCE(SUM(CASE WHEN g.home_team_id = historical_teams.id THEN g.home_score ELSE g.away_score END), 0)
    FROM historical_games g
    WHERE g.season_id = historical_teams.season_id
      AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL
      AND (g.home_team_id = historical_teams.id OR g.away_team_id = historical_teams.id)
  ),
  runs_allowed = (
    SELECT COALESCE(SUM(CASE WHEN g.home_team_id = historical_teams.id THEN g.away_score ELSE g.home_score END), 0)
    FROM historical_games g
    WHERE g.season_id = historical_teams.season_id
      AND g.home_score IS NOT NULL AND g.away_score IS NOT NULL
      AND (g.home_team_id = historical_teams.id OR g.away_team_id = historical_teams.id)
  )
WHERE season_id = 5;
