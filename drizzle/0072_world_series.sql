-- The Season XII World Series: Otters against Panthers, and Game 1.
--
-- This is the next round of season 16, not a season of its own - the playoffs
-- are one season here and the semifinals end at sort_order 21, so the series
-- carries on from 22. Otters have the first two and the last two at home,
-- Panthers the middle three.
--
-- Games 2 to 7 go in with no score and no date. That is how the archive says
-- "still to come": a row with no score reads as upcoming unless its status is
-- NOT_NEEDED, which is what the ones this series never reaches should be set
-- to when it ends - see 0069. The league gave a start date and a deadline and
-- no dates in between, so there are none here; the schedule says "Date
-- unknown" rather than a day nobody named.
--
-- Game 1 is read off the league's statsheet, which is scored plate by plate.
-- Two things in it are not taken at face value, both following the note in
-- 0071 that the pitching block "is written out by hand after the game and the
-- league says it is not reliable" while the at-bat cells are the record:
--
--   * The block gives IcedFlame 0 walks, but Little walked in the 1st and
--     IcedFlame pitched all six innings, so there is no other arm it could
--     belong to. Written as 1.
--   * Peej's 3rd-inning home run carries no RBI. A solo home run is one, and
--     without it the Panthers' RBI come to 3 against 4 runs. Written as 1.
--
-- Everything else reconciles both ways: 4 Panthers hits against IcedFlame's
-- H 4, 6 Otters hits against the Panthers staff's H 6, 9 strikeouts each way,
-- and the home runs allowed match in both directions.
--
-- Fielding is not here. Putouts and errors are counted off the other side's
-- at-bats, and the Panthers changed three positions in the 6th, so who was
-- standing where needs working through properly - it follows in its own
-- migration the way 0071 did for the semifinals.

INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order) VALUES
  ('WS-G1', 16, 'Wednesday September 30, 2026', 105, 110, 4, 3, 22),
  ('WS-G2', 16, NULL, 105, 110, NULL, NULL, 23),
  ('WS-G3', 16, NULL, 110, 105, NULL, NULL, 24),
  ('WS-G4', 16, NULL, 110, 105, NULL, NULL, 25),
  ('WS-G5', 16, NULL, 110, 105, NULL, NULL, 26),
  ('WS-G6', 16, NULL, 105, 110, NULL, NULL, 27),
  ('WS-G7', 16, NULL, 105, 110, NULL, NULL, 28);

INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 0, 'Panthers', '0,3,1,0,0,0', 4, 4, 1 FROM historical_games WHERE source_game_id = 'WS-G1';
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 1, 'Otters', '0,1,0,2,0,0', 3, 6, 1 FROM historical_games WHERE source_game_id = 'WS-G1';

-- Panthers, batting in order. Exho on the sheet is Rebtsuna.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb
FROM historical_games, (
  SELECT 'Joshygg' AS name, 3 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb
  UNION ALL SELECT 'Girty',         3, 0, 0, 0, 0, 0, 0, 0, 0, 0
  UNION ALL SELECT '_littL_',       2, 0, 0, 0, 0, 0, 0, 1, 2, 0
  UNION ALL SELECT 'peejamillion',  3, 1, 1, 0, 0, 1, 1, 0, 0, 0
) v WHERE source_game_id = 'WS-G1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb
FROM historical_games, (
  SELECT 'dcjenk22' AS name, 3 AS ab, 1 AS r, 1 AS h, 1 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 1 AS sb
  UNION ALL SELECT 'Rebtsuna',      3, 0, 0, 0, 0, 0, 0, 0, 2, 0
  UNION ALL SELECT 'EthanS22',      2, 1, 1, 1, 0, 0, 1, 0, 1, 0
  UNION ALL SELECT 'NoScopeMason1', 2, 0, 0, 0, 0, 0, 0, 0, 1, 0
  UNION ALL SELECT 'KexKK',         2, 1, 1, 0, 0, 1, 2, 0, 0, 0
) v WHERE source_game_id = 'WS-G1';

-- Otters, batting in order. Daniel on the sheet is Uchime; Aarbear came off
-- the bench in the 6th.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb
FROM historical_games, (
  SELECT 'Weers' AS name, 3 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 3 AS k, 0 AS sb
  UNION ALL SELECT 'Uchime',          3, 0, 0, 0, 0, 0, 0, 0, 1, 0
  UNION ALL SELECT 'bmodep6',         3, 0, 0, 0, 0, 0, 0, 0, 1, 0
  UNION ALL SELECT 'xx6tttsahur7xx',  3, 1, 0, 0, 0, 0, 0, 0, 1, 0
  UNION ALL SELECT 'omgitsgabee',     2, 1, 2, 0, 0, 0, 0, 0, 0, 0
) v WHERE source_game_id = 'WS-G1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb
FROM historical_games, (
  SELECT 'Donkeymario65' AS name, 3 AS ab, 1 AS r, 2 AS h, 0 AS d, 0 AS t, 1 AS hr, 2 AS rbi, 0 AS bb, 0 AS k, 0 AS sb
  UNION ALL SELECT 'SonicBoss101',    2, 0, 0, 0, 0, 0, 0, 1, 1, 0
  UNION ALL SELECT 'IcedFlxme',       3, 0, 1, 0, 0, 0, 1, 0, 1, 0
  UNION ALL SELECT 'pogJ',            2, 0, 1, 0, 0, 0, 0, 0, 0, 0
  UNION ALL SELECT 'AarBear426',      1, 0, 0, 0, 0, 0, 0, 0, 1, 0
) v WHERE source_game_id = 'WS-G1';

-- Pitching. Wins and losses are left out, as they are for the semifinals.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 0, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb
FROM historical_games, (
  SELECT 'EthanS22' AS name, 3.1 AS ip, 3 AS h, 3 AS r, 2 AS er, 1 AS hr, 5 AS k, 1 AS bb
  UNION ALL SELECT '_littL_', 1.2, 2, 0, 0, 0, 2, 0
  UNION ALL SELECT 'Joshygg', 1.0, 1, 0, 0, 0, 2, 0
) v WHERE source_game_id = 'WS-G1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 1, 'PITCHING', 'IcedFlxme', 6.0, 4, 4, 4, 2, 6, 1
FROM historical_games WHERE source_game_id = 'WS-G1';
