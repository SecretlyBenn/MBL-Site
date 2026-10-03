-- Season XII Playoffs: the two semifinals, from the league's own scorecards.
--
-- The fixtures were already published with no scores. This fills in the eight
-- that were played and leaves the two the Panthers' sweep never reached blank,
-- which is how Season XI's unplayed game 3 is recorded.
--
-- Every figure comes from the at-bat notation. The pitching blocks on the
-- cards are written out by hand afterwards and the league says they are not
-- reliable, so no pitching line is imported - a missing line is better than a
-- wrong one, and the batting is the record either way.
--
-- Names are the ones the archive is keyed by, not the nicknames the cards use:
-- "TTT" is xx6tttsahur7xx and "Paps" is TeamminNoodle. Writing the nickname
-- would create a second player holding half of someone's record.


-- Grizzlies 2 at Panthers 8, Saturday September 19, 2026
UPDATE historical_games SET away_score = 2, home_score = 8, played_on = 'Saturday September 19, 2026' WHERE id = 4027;
DELETE FROM historical_line_scores WHERE game_id = 4027;
DELETE FROM historical_game_stats WHERE game_id = 4027;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4027, 0, 'Grizzlies', '2,0,0,0,0,0', 2, 5, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'Hibitt', 3, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'TeamminNoodle', 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'Casfection', 2, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'luxor1967', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'Adurice', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'kwot', 2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'Pureleqf', 3, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'forte47252', 3, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'LBBroadway', 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 0, 'BATTING', 'ysba', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4027, 1, 'Panthers', '3,5,0,0,0', 8, 11, 3);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'Joshygg', 4, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'Girty', 4, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', '_littL_', 2, 2, 2, 1, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'peejamillion', 3, 2, 2, 0, 0, 1, 3, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'dcjenk22', 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'Rebtsuna', 3, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'NoScopeMason1', 2, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', 'EthanS22', 3, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4027, 1, 'BATTING', '_TheNoah_', 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);

-- Panthers 9 at Grizzlies 8, Sunday September 20, 2026
UPDATE historical_games SET away_score = 9, home_score = 8, played_on = 'Sunday September 20, 2026' WHERE id = 4028;
DELETE FROM historical_line_scores WHERE game_id = 4028;
DELETE FROM historical_game_stats WHERE game_id = 4028;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4028, 0, 'Panthers', '3,0,1,0,2,3', 9, 8, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'Joshygg', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', '_littL_', 2, 2, 0, 0, 0, 0, 0, 2, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'Girty', 4, 4, 4, 1, 0, 1, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'peejamillion', 3, 1, 1, 1, 0, 0, 2, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'dcjenk22', 4, 1, 1, 0, 0, 1, 3, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'Rebtsuna', 3, 1, 2, 0, 0, 1, 3, 1, 1, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'NoScopeMason1', 4, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'EthanS22', 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 0, 'BATTING', 'KexKK', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4028, 1, 'Grizzlies', '0,0,5,2,1,0', 8, 10, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'Hibitt', 3, 2, 2, 2, 0, 0, 0, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'luxor1967', 4, 2, 3, 1, 0, 1, 3, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'Casfection', 2, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'Vision', 4, 1, 2, 0, 0, 1, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'kwot', 3, 1, 0, 0, 0, 0, 0, 1, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'TeamminNoodle', 4, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'BANKKID', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'Pureleqf', 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'LBBroadway', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4028, 1, 'BATTING', 'forte47252', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- Grizzlies 2 at Panthers 5, Saturday September 26, 2026
UPDATE historical_games SET away_score = 2, home_score = 5, played_on = 'Saturday September 26, 2026' WHERE id = 4029;
DELETE FROM historical_line_scores WHERE game_id = 4029;
DELETE FROM historical_game_stats WHERE game_id = 4029;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4029, 0, 'Grizzlies', '0,0,2,0,0,0', 2, 6, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'Hibitt', 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'luxor1967', 3, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'Casfection', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'Vision', 3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'Adurice', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'TeamminNoodle', 3, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'BANKKID', 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'Pureleqf', 2, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 0, 'BATTING', 'HyperB_', 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4029, 1, 'Panthers', '1,0,0,4,0', 5, 6, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'Girty', 2, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', '_littL_', 3, 1, 1, 0, 0, 1, 3, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'peejamillion', 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'dcjenk22', 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'Rebtsuna', 3, 0, 2, 0, 0, 0, 1, 0, 1, 1, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'KexKK', 3, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'EthanS22', 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4029, 1, 'BATTING', 'DaMineyCraftKen', 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);

-- Otters 0 at Expos 2, Tuesday September 15, 2026
UPDATE historical_games SET away_score = 0, home_score = 2, played_on = 'Tuesday September 15, 2026' WHERE id = 4032;
DELETE FROM historical_line_scores WHERE game_id = 4032;
DELETE FROM historical_game_stats WHERE game_id = 4032;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4032, 0, 'Otters', '0,0,0,0,0,0,0', 0, 5, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'omgitsgabee', 3, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'pumkinnzzz', 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'Weers', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'bmodep6', 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'xx6tttsahur7xx', 3, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'AarBear426', 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'pogJ', 2, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'dr1pkid', 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'IcedFlxme', 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 0, 'BATTING', 'LargeMines267', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4032, 1, 'Expos', '0,0,0,0,0,0,2', 2, 8, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'Drypho', 4, 1, 2, 0, 0, 1, 2, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'Titansstorm1', 3, 0, 2, 2, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'NuttyMcNutt', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'WiiillG', 3, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'Sec6et', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'IcedNerd', 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'Lachy_Balboa', 4, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'ratedjr', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4032, 1, 'BATTING', 'TheSeethanMan69', 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);

-- Expos 0 at Otters 3, Thursday September 17, 2026
UPDATE historical_games SET away_score = 0, home_score = 3, played_on = 'Thursday September 17, 2026' WHERE id = 4033;
DELETE FROM historical_line_scores WHERE game_id = 4033;
DELETE FROM historical_game_stats WHERE game_id = 4033;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4033, 0, 'Expos', '0,0,0,0,0,0,0,0,0,0,0,0,0', 0, 3, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'Drypho', 5, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'Titansstorm1', 5, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'NuttyMcNutt', 5, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'WiiillG', 4, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'TheSeethanMan69', 5, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'ratedjr', 5, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'IcedNerd', 5, 0, 1, 0, 0, 0, 0, 0, 4, 2, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'CarrotGodJeff', 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 0, 'BATTING', 'Binbit', 4, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4033, 1, 'Otters', '0,0,0,0,0,0,0,0,0,0,0,0,3', 3, 7, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'omgitsgabee', 6, 0, 1, 0, 0, 0, 0, 0, 4, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'SonicBoss101', 4, 1, 0, 0, 0, 0, 0, 2, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'bmodep6', 6, 1, 2, 0, 0, 1, 2, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'xx6tttsahur7xx', 5, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'TropicaljjXx', 5, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'dr1pkid', 4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'IcedFlxme', 5, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'Pro_Gamer4957', 5, 1, 1, 1, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4033, 1, 'BATTING', 'pogJ', 5, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);

-- Otters 2 at Expos 0, Monday September 21, 2026
UPDATE historical_games SET away_score = 2, home_score = 0, played_on = 'Monday September 21, 2026' WHERE id = 4034;
DELETE FROM historical_line_scores WHERE game_id = 4034;
DELETE FROM historical_game_stats WHERE game_id = 4034;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4034, 0, 'Otters', '0,0,0,0,0,0,0,2', 2, 4, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'omgitsgabee', 4, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'pumkinnzzz', 4, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'xx6tttsahur7xx', 3, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'bmodep6', 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'pogJ', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'SonicBoss101', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'AarBear426', 3, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'TropicaljjXx', 3, 0, 1, 1, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 0, 'BATTING', 'IcedFlxme', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4034, 1, 'Expos', '0,0,0,0,0,0,0,0', 0, 6, 2);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'Drypho', 4, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'Titansstorm1', 4, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'Lachy_Balboa', 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'WiiillG', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'NuttyMcNutt', 3, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'TheSeethanMan69', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'ratedjr', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'IcedNerd', 4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4034, 1, 'BATTING', 'Binbit', 2, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0);

-- Expos 3 at Otters 0, Sunday September 27, 2026
UPDATE historical_games SET away_score = 3, home_score = 0, played_on = 'Sunday September 27, 2026' WHERE id = 4035;
DELETE FROM historical_line_scores WHERE game_id = 4035;
DELETE FROM historical_game_stats WHERE game_id = 4035;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4035, 0, 'Expos', '0,0,1,0,0,2', 3, 3, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'Drypho', 3, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'Titansstorm1', 3, 1, 1, 0, 0, 1, 2, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'NuttyMcNutt', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'WiiillG', 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'Lachy_Balboa', 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'ratedjr', 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'Pichipah', 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'Binbit', 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 0, 'BATTING', 'CarrotGodJeff', 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4035, 1, 'Otters', '0,0,0,0,0,0', 0, 5, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'Weers', 2, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'omgitsgabee', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'xx6tttsahur7xx', 3, 0, 2, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'TropicaljjXx', 2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'Donkeymario65', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'SonicBoss101', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'AarBear426', 2, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'IcedFlxme', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'pogJ', 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4035, 1, 'BATTING', 'dr1pkid', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- Otters 3 at Expos 2, Monday September 28, 2026
UPDATE historical_games SET away_score = 3, home_score = 2, played_on = 'Monday September 28, 2026' WHERE id = 4036;
DELETE FROM historical_line_scores WHERE game_id = 4036;
DELETE FROM historical_game_stats WHERE game_id = 4036;
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4036, 0, 'Otters', '0,0,0,0,0,3', 3, 5, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'Weers', 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'pumkinnzzz', 3, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'bmodep6', 4, 1, 2, 1, 0, 0, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'xx6tttsahur7xx', 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'AarBear426', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'omgitsgabee', 3, 0, 2, 1, 0, 0, 1, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'SonicBoss101', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'Donkeymario65', 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 0, 'BATTING', 'pogJ', 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0);
INSERT INTO historical_line_scores (game_id, is_home, team_label, innings, runs, hits, errors) VALUES (4036, 1, 'Expos', '2,0,0,0,0,0', 2, 4, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'Drypho', 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'Titansstorm1', 2, 1, 0, 0, 0, 0, 0, 1, 2, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'NuttyMcNutt', 3, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'WiiillG', 3, 1, 1, 0, 0, 1, 2, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'Binbit', 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'IcedNerd', 2, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'Lachy_Balboa', 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'TheSeethanMan69', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing) VALUES (4036, 1, 'BATTING', 'ratedjr', 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0);
