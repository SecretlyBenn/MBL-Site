-- The Season XII semifinal pitching lines, taken from MyStatsOnline.
--
-- 0071 built these by hand off the league's statsheets and said so at the top:
-- the pitching block on a statsheet "is written out by hand after the game and
-- the league says they are not reliable". It was used anyway for want of
-- anything better. The league does keep the real figures, on MyStatsOnline,
-- which is where Seasons IV to XII came from in the first place - and 33 of
-- the 35 lines disagree with it. Three pitchers are missing altogether:
-- peejamillion in 4029 and ratedjr in 4033 and 4036. So this replaces the
-- whole set rather than patching the ones that happen to be wrong.
--
-- The playoffs season was never imported - historical_seasons still records it
-- as PENDING-XII-PLAYOFFS - so the ids had to be found rather than looked up.
-- It is season 111042 there, and the eight semifinal games are 1960746 to
-- 1960748 and 1960751 to 1960755, matched to ours by clubs and final score,
-- which is unique for all eight.
--
-- Four things had to hold before any of this was written down:
--
--   * Every one of the sixteen pitching blocks adds up to its own TOTAL row,
--     innings included. That is also what proves the IP column is baseball
--     notation: 3.2, 1.1 and 1 total 6, which only works read as thirds.
--   * Every block's runs equal the other side's final score, taken from the
--     schedule page rather than from the box score, so the two pages agree.
--   * The outs tell the right story about each game's length. 4033 comes to
--     38 and 39, which is a thirteenth-inning walk-off, and 4032 to 20 and 21,
--     a walk-off in the seventh. Both carry the league's own note saying
--     exactly that.
--   * Nothing we hold is absent from the source, so replacing the set loses
--     nothing.
--
-- Innings are stored as outs over three, never as the notation, so the
-- conversion is done here and the arithmetic left where it can be read. 0075
-- was right to convert what 0071 had written - it was notation sitting in an
-- outs column - but the figures underneath were wrong, and these replace them.
--
-- Wins, losses, saves and games started come over too. Round one carries them
-- on all 33 of its rows because it was imported; the semifinals carried none,
-- being hand-entered. This closes that gap rather than opening one.
--
-- Batting is deliberately untouched. It was imported rather than hand-entered
-- and 135 of its lines already match the source exactly, but twelve do not and
-- the source holds some batters we have no row for, so it wants its own look
-- before anyone calls the season finished.

DELETE FROM historical_game_stats WHERE kind = 'PITCHING' AND game_id IN (4027,4028,4029,4032,4033,4034,4035,4036);

-- 4027: Grizzlies 2-8 Panthers  [MyStatsOnline game 1960746]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 0, 'PITCHING', 'ysba', 6 / 3.0, 8, 8, 6, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 0, 'PITCHING', 'Casfection', 4 / 3.0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 0, 'PITCHING', 'Hibitt', 5 / 3.0, 1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 1, 'PITCHING', 'EthanS22', 11 / 3.0, 3, 2, 1, 1, 5, 2, 1, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 1, 'PITCHING', 'Girty', 4 / 3.0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4027, 1, 'PITCHING', 'Joshygg', 3 / 3.0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- 4028: Panthers 9-8 Grizzlies  [MyStatsOnline game 1960747]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 0, 'PITCHING', 'dcjenk22', 8 / 3.0, 4, 4, 4, 0, 7, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 0, 'PITCHING', 'Girty', 3 / 3.0, 3, 3, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 0, 'PITCHING', 'peejamillion', 4 / 3.0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 0, 'PITCHING', '_littL_', 3 / 3.0, 2, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 1, 'PITCHING', 'forte47252', 12 / 3.0, 5, 6, 6, 2, 5, 2, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 1, 'PITCHING', 'Vision', 4 / 3.0, 2, 1, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4028, 1, 'PITCHING', 'Casfection', 2 / 3.0, 1, 2, 2, 1, 1, 2, 0, 1, 0, 0, 0, 0, 0);

-- 4029: Grizzlies 2-5 Panthers  [MyStatsOnline game 1960748]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 0, 'PITCHING', 'Adurice', 6 / 3.0, 1, 1, 1, 0, 2, 2, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 0, 'PITCHING', 'Hibitt', 4 / 3.0, 3, 3, 3, 1, 3, 1, 0, 1, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 0, 'PITCHING', 'luxor1967', 5 / 3.0, 2, 1, 2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 1, 'PITCHING', 'EthanS22', 11 / 3.0, 5, 2, 2, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 1, 'PITCHING', '_littL_', 4 / 3.0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4029, 1, 'PITCHING', 'peejamillion', 3 / 3.0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0);

-- 4032: Otters 0-2 Expos (7th)  [MyStatsOnline game 1960751]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4032, 0, 'PITCHING', 'IcedFlxme', 20 / 3.0, 8, 2, 2, 1, 7, 0, 0, 1, 0, 0, 1, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4032, 1, 'PITCHING', 'Drypho', 21 / 3.0, 5, 0, 0, 0, 11, 1, 1, 0, 0, 0, 1, 1, 1);

-- 4033: Expos 0-3 Otters (13th)  [MyStatsOnline game 1960752]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 0, 'PITCHING', 'Herwes', 25 / 3.0, 3, 0, 0, 0, 10, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 0, 'PITCHING', 'Lachy_Balboa', 5 / 3.0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 0, 'PITCHING', 'ratedjr', 8 / 3.0, 3, 3, 3, 1, 4, 1, 0, 1, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 1, 'PITCHING', 'Pro_Gamer4957', 15 / 3.0, 1, 0, 0, 0, 8, 2, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 1, 'PITCHING', 'pogJ', 23 / 3.0, 2, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4033, 1, 'PITCHING', 'xx6tttsahur7xx', 1 / 3.0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);

-- 4034: Otters 2-0 Expos (8th)  [MyStatsOnline game 1960753]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4034, 0, 'PITCHING', 'xx6tttsahur7xx', 24 / 3.0, 6, 0, 0, 0, 7, 1, 1, 0, 0, 0, 1, 1, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4034, 1, 'PITCHING', 'Lachy_Balboa', 19 / 3.0, 1, 0, 0, 0, 7, 2, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4034, 1, 'PITCHING', 'NuttyMcNutt', 4 / 3.0, 3, 2, 2, 0, 3, 0, 0, 1, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4034, 1, 'PITCHING', 'CarrotGodJeff', 1 / 3.0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);

-- 4035: Expos 3-0 Otters  [MyStatsOnline game 1960754]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4035, 0, 'PITCHING', 'Drypho', 16 / 3.0, 5, 0, 0, 0, 9, 2, 1, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4035, 0, 'PITCHING', 'ratedjr', 2 / 3.0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4035, 1, 'PITCHING', 'IcedFlxme', 18 / 3.0, 3, 3, 3, 1, 7, 1, 0, 1, 0, 0, 1, 1, 0);

-- 4036: Otters 3-2 Expos  [MyStatsOnline game 1960755]
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4036, 0, 'PITCHING', 'Pro_Gamer4957', 15 / 3.0, 3, 2, 2, 1, 7, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4036, 0, 'PITCHING', 'pumkinnzzz', 3 / 3.0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4036, 1, 'PITCHING', 'Herwes', 15 / 3.0, 3, 2, 2, 0, 6, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed, wins, losses, saves, blown_saves, games_started, complete_games, shutouts) VALUES (4036, 1, 'PITCHING', 'ratedjr', 3 / 3.0, 2, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0);

