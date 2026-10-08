-- The MCBA Season XIV championship round: two series, three game days.
--
-- Batsmen against Hitmen and Beavers against Spiders, as the league posted
-- them. The home sides swap on the second day and swap back on the third, so
-- each series is the higher seed at home, away, and home again.
--
-- The third day is "if needed". It goes in as an ordinary fixture with no
-- score, which is how the archive says "still to come"; if a series ends 2-0
-- its third game wants status NOT_NEEDED afterwards, the way 0069 did it, so
-- it reads as a game nobody had to play rather than one still awaiting a
-- result. Nothing here guesses at that in advance.
--
-- Scores and dates are the league's own. The clubs are found through this
-- season's team list rather than by id, because the season and its clubs were
-- created in 0082 and their ids are whatever the database handed out.

INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order)
SELECT v.src,
       (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs'),
       v.day,
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = v.away),
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = v.home),
       NULL, NULL, v.ord
FROM (
  SELECT 'MCBA14-CR1' AS src, 'Friday October 9, 2026' AS day, 'Batsmen' AS away, 'Hitmen' AS home, 2 AS ord
  UNION ALL SELECT 'MCBA14-CR2', 'Friday October 9, 2026',   'Beavers', 'Spiders', 3
  UNION ALL SELECT 'MCBA14-CR3', 'Saturday October 10, 2026', 'Hitmen',  'Batsmen', 4
  UNION ALL SELECT 'MCBA14-CR4', 'Saturday October 10, 2026', 'Spiders', 'Beavers', 5
) v;

INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order)
SELECT v.src,
       (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs'),
       v.day,
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = v.away),
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = v.home),
       NULL, NULL, v.ord
FROM (
  SELECT 'MCBA14-CR5' AS src, 'Sunday October 11, 2026' AS day, 'Batsmen' AS away, 'Hitmen' AS home, 6 AS ord
  UNION ALL SELECT 'MCBA14-CR6', 'Sunday October 11, 2026', 'Beavers', 'Spiders', 7
) v;
