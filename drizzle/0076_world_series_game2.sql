-- World Series Game 2: Hershey Otters 7, Philadelphia Panthers 1.
--
-- The row for this game went in with 0072 carrying no score and no date, so
-- this fills it in rather than inserting it. The statsheet is a copy of Game
-- 1's and still has that game's title and date in its header; the league says
-- to ignore both. It was played on the 5th of October.
--
-- Six innings, and the Otters never batted in the last of them - they were
-- ahead 7-1, so their line score is five innings long against the Panthers'
-- six. That is how the archive already writes a home side that did not need
-- its final turn: the list is short rather than padded.
--
-- The names on the sheet are the league's shorthand and have to be mapped, or
-- the archive, which is keyed by name, gains players who do not exist. Joshy,
-- Peej, Exho, DCJenk, Mason, Little and Ken are Joshygg, peejamillion,
-- Rebtsuna, dcjenk22, NoScopeMason1, _littL_ and DaMineyCraftKen. pumkinnzz is
-- pumkinnzzz, with the third z the roster spells it with.
--
-- Both sides used a designated hitter, which Game 1 did not. Ken and
-- SonicBoss101 fielded without batting, and Kex and omgitsgabee batted without
-- fielding, so each of the four has a line with one half empty. The noughts in
-- Ken's and SonicBoss101's batting columns are not men who failed; they are
-- men who were never sent up.
--
-- Two things are not taken at face value, both following 0071 and 0072 in
-- treating the at-bat cells as the record where the hand-written blocks
-- disagree with them:
--
--   * The Otters' pitching block credits xx6tttsahur7xx with 5 hits allowed.
--     The at-bat cells hold 4, and they cannot be made to hold a fifth: 23
--     Panthers plate appearances against 18 outs leaves exactly six men who
--     reached, and all six are on the sheet - four singles, one fielder's
--     choice and one reached on an error. Written as 4.
--   * The Otters' error column reads 0 while Joshy's third-inning cell reads
--     "FC+E4". That column is a sum over the players' own error cells and
--     nobody filled theirs in, so the 0 is an empty column rather than a
--     claim - the Panthers' 1 is Girty's E9 arriving the same way. Uchime is
--     charged with the error, and the Otters' line score shows it.
--
-- Everything else reconciles in both directions: 7 Otters hits against the
-- Panthers staff's 7, four strikeouts one way and three the other, no walks
-- either side, four home runs allowed against four hit, and each pitcher's
-- outs - eleven and four, and eighteen - matching the innings he is credited
-- with.
--
-- Innings pitched are stored as outs over three, never as baseball notation.
-- Writing 3.2 for eleven outs is the mistake 0074 and 0075 had to go back and
-- undo, so the arithmetic is left in the statement where it can be read.

UPDATE historical_games
SET played_on = 'Monday October 5, 2026', away_score = 1, home_score = 7
WHERE source_game_id = 'WS-G2';

INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 0, 'Panthers', '0,0,1,0,0,0', 1, 4, 1 FROM historical_games WHERE source_game_id = 'WS-G2';
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 1, 'Otters', '3,0,0,1,3', 7, 7, 1 FROM historical_games WHERE source_game_id = 'WS-G2';

-- Fielding goes in alongside the batting rather than in a migration of its own
-- the way 0073 needed, because none of this has been applied yet.
--
-- Putouts are counted off the other side's at-bats on 0073's rule: the putout
-- belongs to whoever took the last throw, so "G6-3" is the first baseman and
-- "G3" the first baseman unassisted, a fly or a liner belongs to the position
-- in the number, and a strikeout is the catcher's. IcedFlxme's auto out in the
-- second - he had switched hands in the middle of the at-bat - goes to the
-- catcher, which is where the scoring rules put an out no fielder made.
--
-- The Panthers changed three positions at once with two out in the fourth:
-- DCJenk off the mound to right, Girty right to catcher, Peej catcher to the
-- mound. Eleven outs stood at that point, which is exactly DCJenk's eleven,
-- and Aarbear's next at-bat is marked as facing RP1, so the switch is pinned
-- to the out and not merely to the inning. The Otters never changed. Position
-- outs come to 135 for the Panthers, nine men through fifteen outs, and 162
-- for the Otters, nine through eighteen; putouts come to 15 and 18, one per
-- out, which is the check that none has gone to the wrong man.

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, putouts, errors, position_outs)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.po, v.e, v.pos
FROM historical_games, (
  SELECT 'Joshygg' AS name, 3 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 3 AS po, 0 AS e, '{"CF":15}' AS pos
  UNION ALL SELECT 'Girty',        3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, '{"RF":11,"C":4}'
  UNION ALL SELECT 'peejamillion', 3, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 7, 0, '{"C":11,"P":4}'
  UNION ALL SELECT 'Rebtsuna',     3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 0, '{"3B":15}'
  UNION ALL SELECT 'dcjenk22',     3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, '{"P":11,"RF":4}'
) v WHERE source_game_id = 'WS-G2';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, putouts, errors, position_outs)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.po, v.e, v.pos
FROM historical_games, (
  SELECT 'KexKK' AS name, 2 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 0 AS po, 0 AS e, NULL AS pos
  UNION ALL SELECT 'EthanS22',        2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, '{"SS":15}'
  UNION ALL SELECT 'NoScopeMason1',   2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '{"2B":15}'
  UNION ALL SELECT '_littL_',         2, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 0, '{"LF":15}'
  UNION ALL SELECT 'DaMineyCraftKen', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, '{"1B":15}'
) v WHERE source_game_id = 'WS-G2';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, putouts, errors, position_outs)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.po, v.e, v.pos
FROM historical_games, (
  SELECT 'pumkinnzzz' AS name, 3 AS ab, 2 AS r, 2 AS h, 1 AS d, 0 AS t, 1 AS hr, 2 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 1 AS po, 0 AS e, '{"SS":18}' AS pos
  UNION ALL SELECT 'xx6tttsahur7xx', 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, '{"P":18}'
  UNION ALL SELECT 'Donkeymario65',  3, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 4, 0, '{"C":18}'
  UNION ALL SELECT 'bmodep6',        3, 2, 2, 0, 0, 2, 4, 0, 1, 0, 0, 4, 0, '{"1B":18}'
  UNION ALL SELECT 'omgitsgabee',    3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, NULL
) v WHERE source_game_id = 'WS-G2';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, putouts, errors, position_outs)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.po, v.e, v.pos
FROM historical_games, (
  SELECT 'pogJ' AS name, 2 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 0 AS po, 0 AS e, '{"LF":18}' AS pos
  UNION ALL SELECT 'AarBear426',   2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, '{"CF":18}'
  UNION ALL SELECT 'Uchime',       2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, '{"2B":18}'
  UNION ALL SELECT 'IcedFlxme',    2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '{"3B":18}'
  UNION ALL SELECT 'SonicBoss101', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, '{"RF":18}'
) v WHERE source_game_id = 'WS-G2';

-- Wins and losses are left out, as they are for the semifinals and Game 1.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 0, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb
FROM historical_games, (
  SELECT 'dcjenk22' AS name, 11.0 / 3.0 AS ip, 3 AS h, 4 AS r, 3 AS er, 2 AS hr, 3 AS k, 0 AS bb
  UNION ALL SELECT 'peejamillion', 4.0 / 3.0, 4, 3, 3, 2, 1, 0
) v WHERE source_game_id = 'WS-G2';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 1, 'PITCHING', 'xx6tttsahur7xx', 18.0 / 3.0, 4, 1, 1, 0, 3, 0
FROM historical_games WHERE source_game_id = 'WS-G2';
