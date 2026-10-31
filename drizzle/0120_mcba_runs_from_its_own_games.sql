-- The MCBA's standings showed a dash for runs scored, runs allowed and run
-- differential in eight of its seasons - X, XI and XII and five playoff
-- rounds. Nothing was wrong with the pages: `historical_teams.runs_scored`
-- and `runs_allowed` were simply never filled for 85 of the competition's 151
-- clubs, because those seasons came out of MyStatsOnline without the figures
-- and the standings table reads the columns rather than working them out.
--
-- They are not guessed here. Every one of those seasons has its games on the
-- site with both scores, so each club's runs are the sum of its own games,
-- which is how the live standings count them too. The method was checked
-- against the 159 clubs that do have the figures stored: it reproduces 158 of
-- the 159 runs scored and 157 of the runs allowed exactly. The handful that
-- disagree are all in MBL Season X and are out by one or two runs, so there
-- is a question about one game of that season's record - and nothing here
-- touches a club that already has a figure, so that question is left exactly
-- as it was for somebody to answer.
--
-- A game with no score recorded is not counted: seven of MCBA Season XI's
-- fixtures have none, and a missing score is not a nil. Neither is a fixture
-- a series never reached. A club that played nothing gets nought rather than
-- a dash, which is what the seasons that were imported with figures did with
-- their own empty clubs.
--
-- Running this twice is the same as running it once: it only fills a column
-- that is still empty, and it sets a value rather than adding to one.

UPDATE historical_teams
SET runs_scored = COALESCE((
  SELECT SUM(CASE WHEN g.home_team_id = historical_teams.id THEN g.home_score ELSE g.away_score END)
  FROM historical_games g
  WHERE (g.home_team_id = historical_teams.id OR g.away_team_id = historical_teams.id)
    AND g.home_score IS NOT NULL
    AND g.away_score IS NOT NULL
    AND (g.status IS NULL OR g.status <> 'NOT_NEEDED')
), 0)
WHERE runs_scored IS NULL;

UPDATE historical_teams
SET runs_allowed = COALESCE((
  SELECT SUM(CASE WHEN g.home_team_id = historical_teams.id THEN g.away_score ELSE g.home_score END)
  FROM historical_games g
  WHERE (g.home_team_id = historical_teams.id OR g.away_team_id = historical_teams.id)
    AND g.home_score IS NOT NULL
    AND g.away_score IS NOT NULL
    AND (g.status IS NULL OR g.status <> 'NOT_NEEDED')
), 0)
WHERE runs_allowed IS NULL;
