-- Fielding and pitching for the Season XII semifinals.
--
-- All of it counted off the other side's at-bats, which is the record the
-- league keeps. A putout goes to whoever took the last throw - "G6-3" is the
-- first baseman - and an error to the position named in "E5".
--
-- The pitching block on each card is used only for who pitched and in what
-- order; its figures are written out by hand after the game and the league
-- says they are not reliable. The innings a change happened in come from the
-- position notes and from at-bats marked against a reliever, so a pitcher's
-- line is right to the inning but not within one.


-- sheet6
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Hibitt';
UPDATE historical_game_stats SET putouts = 6 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'TeamminNoodle';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'luxor1967';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'kwot';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'ysba';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Casfection';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'forte47252';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 0, 'PITCHING', 'ysba', 1.2, 8, 8, 8, 1, 1, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 0, 'PITCHING', 'Casfection', 1.0, 0, 0, 0, 0, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 0, 'PITCHING', 'Hibitt', 2.0, 3, 0, 0, 0, 3, 0);
UPDATE historical_game_stats SET putouts = 5 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'dcjenk22';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Joshygg';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = '_littL_';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = '_TheNoah_';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'peejamillion';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'EthanS22';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Girty';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Rebtsuna';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Rebtsuna';
UPDATE historical_game_stats SET errors = 2 WHERE game_id = 4027 AND kind = 'BATTING' AND player_name = 'Girty';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 1, 'PITCHING', 'EthanS22', 2.2, 2, 3, 3, 1, 4, 2);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 1, 'PITCHING', 'Girty', 2.0, 2, 0, 0, 0, 2, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4027, 1, 'PITCHING', 'Joshygg', 1.0, 0, 0, 0, 0, 0, 0);

-- sheet5
UPDATE historical_game_stats SET putouts = 9 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'peejamillion';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'NoScopeMason1';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'Girty';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'dcjenk22';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'Rebtsuna';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = '_littL_';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'NoScopeMason1';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 0, 'PITCHING', 'dcjenk22', 2.0, 1, 0, 0, 0, 5, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 0, 'PITCHING', 'Girty', 1.0, 4, 5, 5, 0, 2, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 0, 'PITCHING', 'peejamillion', 1.1, 3, 5, 5, 2, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 0, 'PITCHING', '_littL_', 0.2, 2, 0, 0, 0, 1, 1);
UPDATE historical_game_stats SET putouts = 8 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'TeamminNoodle';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'Vision';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'kwot';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'BANKKID';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4028 AND kind = 'BATTING' AND player_name = 'Pureleqf';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 1, 'PITCHING', 'forte47252', 3.2, 3, 6, 6, 2, 5, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 1, 'PITCHING', 'Vision', 0.1, 3, 2, 2, 0, 1, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4028, 1, 'PITCHING', 'Casfection', 1.0, 2, 4, 4, 1, 1, 1);

-- sheet3
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'Hibitt';
UPDATE historical_game_stats SET putouts = 10 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'TeamminNoodle';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'HyperB_';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'Pureleqf';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4029, 0, 'PITCHING', 'Adurice', 2.0, 1, 1, 1, 0, 2, 2);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4029, 0, 'PITCHING', 'luxor1967', 1.2, 4, 5, 5, 1, 3, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4029, 0, 'PITCHING', 'Hibitt', 0.2, 0, 0, 0, 0, 1, 1);
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'Rebtsuna';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = '_littL_';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'dcjenk22';
UPDATE historical_game_stats SET putouts = 7 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'peejamillion';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'KexKK';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4029 AND kind = 'BATTING' AND player_name = 'Girty';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4029, 1, 'PITCHING', 'EthanS22', 3.1, 5, 2, 2, 0, 1, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4029, 1, 'PITCHING', '_littL_', 2.1, 1, 0, 0, 0, 1, 0);

-- sheet7
UPDATE historical_game_stats SET putouts = 4 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'AarBear426';
UPDATE historical_game_stats SET putouts = 9 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'pogJ';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'bmodep6';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'xx6tttsahur7xx';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'dr1pkid';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'omgitsgabee';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'LargeMines267';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4032, 0, 'PITCHING', 'IcedFlxme', 6.1, 8, 1, 1, 1, 7, 0);
UPDATE historical_game_stats SET putouts = 13 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'Drypho';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'IcedNerd';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'Sec6et';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'Titansstorm1';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'Lachy_Balboa';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'ratedjr';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4032 AND kind = 'BATTING' AND player_name = 'WiiillG';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4032, 1, 'PITCHING', 'Drypho', 6.2, 5, 0, 0, 0, 10, 1);

-- sheet8
UPDATE historical_game_stats SET putouts = 20 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'WiiillG';
UPDATE historical_game_stats SET putouts = 5 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'Drypho';
UPDATE historical_game_stats SET putouts = 4 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'ratedjr';
UPDATE historical_game_stats SET putouts = 4 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'TheSeethanMan69';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'CarrotGodJeff';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4033, 0, 'PITCHING', 'Herwes', 10.0, 4, 0, 0, 0, 12, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4033, 0, 'PITCHING', 'Lachy_Balboa', 2.2, 3, 3, 3, 1, 4, 1);
UPDATE historical_game_stats SET putouts = 22 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'xx6tttsahur7xx';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'dr1pkid';
UPDATE historical_game_stats SET putouts = 7 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'SonicBoss101';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'Pro_Gamer4957';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'TropicaljjXx';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'omgitsgabee';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'IcedFlxme';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'bmodep6';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'pogJ';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4033 AND kind = 'BATTING' AND player_name = 'IcedFlxme';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4033, 1, 'PITCHING', 'Pro_Gamer4957', 5.0, 1, 0, 0, 0, 8, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4033, 1, 'PITCHING', 'pogJ', 7.0, 2, 0, 0, 0, 8, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4033, 1, 'PITCHING', 'xx6tttsahur7xx', 1.0, 0, 0, 0, 0, 2, 0);

-- sheet4
UPDATE historical_game_stats SET putouts = 10 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'TropicaljjXx';
UPDATE historical_game_stats SET putouts = 4 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'AarBear426';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'omgitsgabee';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'IcedFlxme';
UPDATE historical_game_stats SET putouts = 4 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'bmodep6';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'pogJ';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'pumkinnzzz';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4034, 0, 'PITCHING', 'xx6tttsahur7xx', 8.0, 6, 0, 0, 0, 7, 1);
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'Drypho';
UPDATE historical_game_stats SET putouts = 12 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
UPDATE historical_game_stats SET putouts = 7 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'Binbit';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'Lachy_Balboa';
UPDATE historical_game_stats SET errors = 2 WHERE game_id = 4034 AND kind = 'BATTING' AND player_name = 'Lachy_Balboa';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4034, 1, 'PITCHING', 'Lachy_Balboa', 6.0, 1, 0, 0, 0, 7, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4034, 1, 'PITCHING', 'CarrotGodJeff', 1.0, 3, 1, 1, 0, 2, 0);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4034, 1, 'PITCHING', 'NuttyMcNutt', 1.0, 0, 0, 0, 0, 2, 0);

-- sheet2
UPDATE historical_game_stats SET putouts = 13 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'ratedjr';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'CarrotGodJeff';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'WiiillG';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'Binbit';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4035, 0, 'PITCHING', 'Drypho', 5.0, 4, 0, 0, 0, 9, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4035, 0, 'PITCHING', 'ratedjr', 1.0, 1, 0, 0, 0, 1, 2);
UPDATE historical_game_stats SET putouts = 10 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'pogJ';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'Donkeymario65';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'omgitsgabee';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'AarBear426';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'SonicBoss101';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4035 AND kind = 'BATTING' AND player_name = 'dr1pkid';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4035, 1, 'PITCHING', 'IcedFlxme', 6.0, 3, 4, 4, 1, 7, 1);

-- sheet1
UPDATE historical_game_stats SET putouts = 8 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'Donkeymario65';
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'SonicBoss101';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'AarBear426';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'omgitsgabee';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'pogJ';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'xx6tttsahur7xx';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4036, 0, 'PITCHING', 'Pro_Gamer4957', 4.2, 3, 1, 1, 1, 6, 1);
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4036, 0, 'PITCHING', 'pumkinnzzz', 0.2, 0, 0, 0, 0, 1, 0);
UPDATE historical_game_stats SET putouts = 2 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'ratedjr';
UPDATE historical_game_stats SET putouts = 9 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
UPDATE historical_game_stats SET putouts = 3 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'Lachy_Balboa';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'IcedNerd';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'Drypho';
UPDATE historical_game_stats SET putouts = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'Binbit';
UPDATE historical_game_stats SET errors = 1 WHERE game_id = 4036 AND kind = 'BATTING' AND player_name = 'NuttyMcNutt';
INSERT INTO historical_game_stats (game_id, is_home, kind, player_name, innings_pitched, hits_allowed, runs_allowed, earned_runs, home_runs_allowed, strikeouts_pitched, walks_allowed) VALUES (4036, 1, 'PITCHING', 'Herwes', 5.2, 5, 3, 3, 0, 6, 2);
