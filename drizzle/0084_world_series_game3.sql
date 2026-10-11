-- World Series Game 3: Philadelphia Panthers 1, Hershey Otters 0.
--
-- The fixture went in with 0072 carrying no score and no date, so this fills
-- it in rather than inserting it. Played on the 6th of October; the Otters are
-- the away side here, which is how 0072 already had it.
--
-- A complete-game shutout by Girty, and the only run of the game was his own
-- home run in the fourth. Six innings, and the Panthers never batted in the
-- last of them - they were ahead, so their line score is five innings long
-- against the Otters' six. That is how the archive writes a home side that did
-- not need its final turn: the list is short rather than padded with a nought.
--
-- Every number here is taken from the at-bat cells and then checked against
-- the two pitching blocks, which were written independently of them. All four
-- checks agree, which is why none of this needed a judgement call the way
-- Game 2 did:
--
--   * Girty is credited with 18 outs and the Otters' cells hold 18 outs over
--     six innings. pogJ is credited with 15 and the Panthers' cells hold 15
--     over five.
--   * Girty's block claims 1 hit and 6 strikeouts; the Otters' cells hold one
--     single by Donkeymario65 and six strikeouts. pogJ's claims 2 hits, 9
--     strikeouts, 1 earned run and 1 home run; the Panthers' cells hold
--     Girty's home run, peejamillion's single, nine strikeouts and no other
--     way home.
--   * 19 Otters plate appearances against 18 outs leaves exactly one man who
--     reached, and 17 Panthers appearances against 15 outs leaves two.
--   * Neither side has a walk, a hit batsman or an error anywhere on the
--     sheet, and both pitching blocks agree: BB 0, and the line score carries
--     no errors.
--
-- The names on the sheet are the league's shorthand and have to be mapped, or
-- the archive, which is keyed by name, gains players who do not exist. They
-- are mapped the same way 0076 mapped them, with two the sheet had not used
-- before: Weers is Weers, and velly is Vellyii.
--
-- Both sides carried a man who fielded without batting, so each has a line
-- with one half empty. omgitsgabee was the Otters' designated hitter and pogJ
-- therefore never came up; DaMineyCraftKen started at first for the Panthers
-- and was taken out in the bottom of the third before the order reached him.
-- The noughts in pogJ's and DaMineyCraftKen's batting columns are not men who
-- failed, they are men who were never sent up.
--
-- The Panthers moved people around twice and it matters for who is credited
-- with an out. peejamillion went to catcher for the top of the second, with
-- NoScopeMason1 to third; then in the bottom of the third, two out,
-- DaMineyCraftKen came out for _littL_ in right, Rebtsuna moved to third and
-- NoScopeMason1 to first. So the catcher for five of the six innings is
-- peejamillion, not NoScopeMason1, and eight putouts follow him rather than
-- staying with the man who started there. The Otters changed once -
-- IcedFlxme out at third for Vellyii, bottom of the third with two away - and
-- no ball was hit there all afternoon, so it moves no putouts.
--
-- Putouts follow 0073: the out belongs to whoever took the last throw, so a
-- strikeout is the catcher's, "GO 4-3" is the first baseman's and a fly is the
-- fielder who caught it. The two sides come to 15 and 18, which is exactly the
-- number of outs each defence recorded.
--
-- innings_pitched is outs over three, never baseball notation, so the division
-- is left visible the way 0076 left it.

UPDATE historical_games
SET played_on = 'Tuesday October 6, 2026', away_score = 0, home_score = 1
WHERE source_game_id = 'WS-G3';

DELETE FROM historical_line_scores WHERE game_id = 4808;
DELETE FROM historical_game_stats WHERE game_id = 4808;

INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES
  (4808, 0, 'Otters',   '0,0,0,0,0,0', 0, 1, 0),
  (4808, 1, 'Panthers', '0,0,0,1,0',   1, 2, 0);

-- The Otters, batting. at_bats, hits and strikeouts are counted off the cells;
-- putouts and position_outs are the fielding half. position_outs is in outs,
-- so 15 is the whole game for a side that took the field five times.
INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, hit_by_pitch, stolen_bases, caught_stealing, sac_flies, sac_bunts, left_on_base, putouts, errors, position_outs)
VALUES
  (4808, 0, 'BATTING', 'Weers',           3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, '{"LF":15}'),
  (4808, 0, 'BATTING', 'pumkinnzzz',      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, '{"2B":15}'),
  (4808, 0, 'BATTING', 'bmodep6',         2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, '{"1B":15}'),
  (4808, 0, 'BATTING', 'Donkeymario65',   2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, '{"C":15}'),
  (4808, 0, 'BATTING', 'xx6tttsahur7xx',  2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, '{"SS":15}');

INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, hit_by_pitch, stolen_bases, caught_stealing, sac_flies, sac_bunts, left_on_base, putouts, errors, position_outs)
VALUES
  -- The designated hitter, so no position_outs at all rather than a nought.
  (4808, 0, 'BATTING', 'omgitsgabee',     2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, NULL),
  -- Eight outs at third before he came out, and the seven that were left.
  (4808, 0, 'BATTING', 'IcedFlxme',       1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '{"3B":8}'),
  (4808, 0, 'BATTING', 'Vellyii',         1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, '{"3B":7}'),
  (4808, 0, 'BATTING', 'AarBear426',      2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, '{"CF":15}'),
  (4808, 0, 'BATTING', 'SonicBoss101',    2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, '{"RF":15}');

-- pogJ pitched and, with a designated hitter in the lineup, never batted.
INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, hit_by_pitch, stolen_bases, caught_stealing, sac_flies, sac_bunts, left_on_base, putouts, errors, position_outs)
VALUES
  (4808, 0, 'BATTING', 'pogJ',            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '{"P":15}');

-- The Panthers, batting.
INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, hit_by_pitch, stolen_bases, caught_stealing, sac_flies, sac_bunts, left_on_base, putouts, errors, position_outs)
VALUES
  -- Right field for three innings, then third base for the last three.
  (4808, 1, 'BATTING', 'Rebtsuna',        2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, '{"RF":9,"3B":9}'),
  (4808, 1, 'BATTING', 'Girty',           2, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, '{"P":18}'),
  -- Third base for the first inning, catcher for the other five, which is
  -- where eight of these putouts come from.
  (4808, 1, 'BATTING', 'peejamillion',    2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 8, 0, '{"3B":3,"C":15}'),
  (4808, 1, 'BATTING', 'dcjenk22',        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, '{"LF":18}'),
  (4808, 1, 'BATTING', 'KexKK',           2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, '{"SS":18}');

INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, hit_by_pitch, stolen_bases, caught_stealing, sac_flies, sac_bunts, left_on_base, putouts, errors, position_outs)
VALUES
  (4808, 1, 'BATTING', 'Joshygg',         2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 0, '{"CF":18}'),
  -- Caught the first inning, third for two, first for the last three.
  (4808, 1, 'BATTING', 'NoScopeMason1',   2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, '{"C":3,"3B":6,"1B":9}'),
  (4808, 1, 'BATTING', 'EthanS22',        2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, '{"2B":18}'),
  -- Came in for DaMineyCraftKen with two out in the third and took his place
  -- in the order, striking out in that same at-bat.
  (4808, 1, 'BATTING', '_littL_',         1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, '{"RF":9}'),
  -- Started at first and came out before the order reached him.
  (4808, 1, 'BATTING', 'DaMineyCraftKen', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, '{"1B":9}');

-- Pitching. 15 outs and 18 outs, written as the division so nothing here
-- repeats the baseball-notation mistake 0074 and 0075 had to undo. Girty went
-- the whole way and gave up nothing, so the complete game is also a shutout.
INSERT INTO historical_game_stats
  (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, games_started, complete_games, shutouts)
VALUES
  (4808, 0, 'PITCHING', 'pogJ',  15 / 3.0, 2, 1, 1, 1, 9, 0, 0, 1, 1, 1, 0),
  (4808, 1, 'PITCHING', 'Girty', 18 / 3.0, 1, 0, 0, 0, 6, 0, 1, 0, 1, 1, 1);
