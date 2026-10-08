-- MCBA Season XIV Playoffs, and the two wild card games.
--
-- The season is built here rather than on the site because the one started
-- there was filed under the MBL and given the MBL's clubs; 0080 removed it.
-- This one is the MCBA's, and its nine clubs are copied from Season XIV's own
-- team list so the names, abbreviations and source ids carry over rather than
-- being typed again.
--
-- MyStatsOnline has no playoffs season for the MCBA's fourteenth, so unlike
-- 0077 and 0078 there is no second source to check these against. Both games
-- come from the league's statsheets, which are scored plate by plate, and both
-- were read the same way: the plate appearances are walked through in batting
-- order, inning by inning, and the reconstruction is only accepted when its
-- outs match what the other side's pitchers were credited with.
--
-- They do, exactly:
--
--   * Cacti at Batsmen: the Cacti's nine innings come to 27 outs against the
--     Batsmen staff's 27, and the Cacti's hits, walks and strikeouts come to
--     3, 1 and 15 against a block reading 3, 1 and 15.
--   * Bandits at Beavers: the Beavers' 15 outs match the Bandits staff's 15,
--     and their 5 hits, 2 walks and 10 strikeouts match that block too. The
--     check that settles the order is DezJoe, whose four left on base fall out
--     as two in the first and two in the fifth once the innings are walked.
--
-- Both games ended on the home side's last turn, so neither home line score
-- runs the full distance: the Batsmen won 1-0 on gunnar's single in the ninth,
-- and the Beavers 2-1 in the sixth, which is why the away team has an inning
-- the home team does not.
--
-- Four things disagree with the hand-written blocks, and the at-bat cells are
-- taken as the record in each, which is what 0071 established:
--
--   * The Batsmen drew 5 walks in the cells against a block reading 4.
--   * DyN0Btw_'s second-inning cell reads "1B+SB+SB" and the sheet notes "2
--     STOLEN BASES" beside him, so the Batsmen stole 3 where the tally says 2.
--   * The Bandits took 5 hits and 10 strikeouts in the cells against a Beavers
--     block reading 4 and 9.
--   * Three Bandits have an error against their name where the team tally
--     reads 2. The players' own cells are used.
--
-- Pikachichi's first at-bat is "AO late lineup", an out awarded against him
-- before a pitch rather than one the Cacti earned, which is why the Batsmen
-- made 26 outs while the Cacti staff were credited with 25. The block is right
-- and so is the reconstruction; they are counting different things.
--
-- Putouts are not here. These sheets do not tally them and working them off
-- the other side's at-bats is the job 0073 did for a single game; it can
-- follow. Wins and losses are only recorded for the second game, where the
-- sheet names them.

INSERT INTO historical_seasons (name, league_id, source_season_id, is_playoffs, sort_order)
VALUES ('MCBA Season XIV Playoffs', 2, 'site-mcba14po', 1, 14);

INSERT INTO historical_teams (season_id, name, abbreviation, source_name, source_team_id, league)
SELECT (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs'),
       name, abbreviation, source_name, source_team_id, league
FROM historical_teams WHERE season_id = 44;

INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order)
SELECT 'MCBA14-WC1',
       (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs'),
       'Tuesday October 6, 2026',
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = 'Cacti'),
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = 'Batsmen'),
       0, 1, 0;

INSERT INTO historical_games (source_game_id, season_id, played_on, away_team_id, home_team_id, away_score, home_score, sort_order)
SELECT 'MCBA14-WC2',
       (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs'),
       'Wednesday October 7, 2026',
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = 'Bandits'),
       (SELECT id FROM historical_teams WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MCBA Season XIV Playoffs') AND name = 'Beavers'),
       1, 2, 1;

INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 0, 'Cacti', '0,0,0,0,0,0,0,0,0', 0, 3, 2 FROM historical_games WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 1, 'Batsmen', '0,0,0,0,0,0,0,0,1', 1, 7, 1 FROM historical_games WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 0, 'Bandits', '0,0,1,0,0,0', 1, 5, 3 FROM historical_games WHERE source_game_id = 'MCBA14-WC2';
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors)
SELECT id, 1, 'Beavers', '1,0,0,0,0,1', 2, 5, 1 FROM historical_games WHERE source_game_id = 'MCBA14-WC2';

-- Cacti, in batting order. Kman was ejected in the second and Dragonball took
-- his place in the order; TintedHeaveSPTFY was substituted for Phosphane in
-- the same half, and CJ came in for GWLYT in the eighth.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'Kman' AS name, 1 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Dragonball',       2, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0
  UNION ALL SELECT 'Kykybubba',        4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0
  UNION ALL SELECT 'TintedHeaveSPTFY', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0
  UNION ALL SELECT 'Phosphane',        3, 0, 1, 1, 0, 0, 0, 0, 2, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'MrCaptainofS' AS name, 4 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 2 AS k, 0 AS sb, 1 AS lob, 0 AS e
  UNION ALL SELECT 'Breadstick', 4, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 1
  UNION ALL SELECT 'Zeke',       3, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0
  UNION ALL SELECT 'Glacciers',  3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1
  UNION ALL SELECT 'GWLYT',      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'CJ' AS name, 1 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Ayvvri', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0
) v WHERE source_game_id = 'MCBA14-WC1';

-- Batsmen. M1dN1qht was substituted for gunnar before his first turn, so he
-- has a line with nothing on it rather than no line at all - he was in the
-- order. Cosmiclol left in the eighth before his turn came round again.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'Pikachichi' AS name, 3 AS ab, 0 AS r, 1 AS h, 1 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 1 AS bb, 0 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Bigboyyahu',   4, 0, 1, 0, 0, 0, 0, 0, 2, 0, 1, 0
  UNION ALL SELECT 'Cosmiclol',    3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1
  UNION ALL SELECT 'Blazingrhino', 3, 0, 0, 0, 0, 0, 0, 1, 3, 0, 1, 0
  UNION ALL SELECT 'DyN0Btw_',     4, 1, 2, 1, 0, 0, 0, 0, 0, 2, 2, 0
) v WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'DeadRr' AS name, 4 AS ab, 0 AS r, 1 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 2 AS k, 1 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Iko',      3, 0, 0, 0, 0, 0, 0, 1, 3, 0, 1, 0
  UNION ALL SELECT 'ASAP',     3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0
  UNION ALL SELECT 'M1dN1qht', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  UNION ALL SELECT 'gunnar',   3, 0, 2, 0, 0, 0, 1, 1, 0, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC1';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 0, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb
FROM historical_games, (
  SELECT 'Zeke' AS name, 14 / 3.0 AS ip, 2 AS h, 0 AS r, 0 AS er, 0 AS hr, 8 AS k, 3 AS bb
  UNION ALL SELECT 'Glacciers', 9 / 3.0, 2, 0, 0, 0, 3, 0
  UNION ALL SELECT 'CJ',        2 / 3.0, 3, 1, 1, 0, 0, 1
) v WHERE source_game_id = 'MCBA14-WC1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed)
SELECT id, 1, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb
FROM historical_games, (
  SELECT 'Pikachichi' AS name, 13 / 3.0 AS ip, 2 AS h, 0 AS r, 0 AS er, 0 AS hr, 7 AS k, 0 AS bb
  UNION ALL SELECT 'Cosmiclol',  8 / 3.0, 1, 0, 0, 0, 5, 0
  UNION ALL SELECT 'gunnar',     5 / 3.0, 0, 0, 0, 0, 3, 1
  UNION ALL SELECT 'Bigboyyahu', 1 / 3.0, 0, 0, 0, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC1';

-- Bandits. Underseer came off the bench into centre in the first and took a
-- place in the order; six men started.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'portaltohead' AS name, 3 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 1 AS bb, 2 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'femmy',       4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1
  UNION ALL SELECT 'cravingbird', 3, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0
  UNION ALL SELECT 'splotchy',    4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1
  UNION ALL SELECT 'pablo',       4, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0
) v WHERE source_game_id = 'MCBA14-WC2';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 0, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'nova' AS name, 2 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 2 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Underseer', 3, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1
) v WHERE source_game_id = 'MCBA14-WC2';

-- Beavers. Seven men, nobody off the bench.
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'Fallman10' AS name, 4 AS ab, 0 AS r, 1 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 3 AS k, 0 AS sb, 0 AS lob, 0 AS e
  UNION ALL SELECT 'Lastnarwhal', 3, 1, 2, 1, 0, 0, 1, 1, 0, 0, 0, 1
  UNION ALL SELECT 'Pufferfish',  2, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0
  UNION ALL SELECT 'BluuMC',      3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0
  UNION ALL SELECT 'Dream',       3, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC2';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, left_on_base, errors)
SELECT id, 1, 'BATTING', v.name, v.ab, v.r, v.h, v.d, v.t, v.hr, v.rbi, v.bb, v.k, v.sb, v.lob, v.e
FROM historical_games, (
  SELECT 'DezJoe' AS name, 3 AS ab, 0 AS r, 0 AS h, 0 AS d, 0 AS t, 0 AS hr, 0 AS rbi, 0 AS bb, 1 AS k, 0 AS sb, 4 AS lob, 0 AS e
  UNION ALL SELECT 'Devin_god1994', 3, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0
) v WHERE source_game_id = 'MCBA14-WC2';

INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses)
SELECT id, 0, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb, v.w, v.l
FROM historical_games, (
  SELECT 'cravingbird' AS name, 15 / 3.0 AS ip, 4 AS h, 2 AS r, 2 AS er, 0 AS hr, 10 AS k, 2 AS bb, 0 AS w, 0 AS l
  UNION ALL SELECT 'nova', 0 / 3.0, 1, 0, 0, 0, 0, 0, 0, 1
) v WHERE source_game_id = 'MCBA14-WC2';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses)
SELECT id, 1, 'PITCHING', v.name, v.ip, v.h, v.r, v.er, v.hr, v.k, v.bb, v.w, v.l
FROM historical_games, (
  SELECT 'Devin_god1994' AS name, 9 / 3.0 AS ip, 1 AS h, 1 AS r, 1 AS er, 1 AS hr, 4 AS k, 1 AS bb, 0 AS w, 0 AS l
  UNION ALL SELECT 'Lastnarwhal', 9 / 3.0, 3, 0, 0, 0, 5, 0, 1, 0
) v WHERE source_game_id = 'MCBA14-WC2';
