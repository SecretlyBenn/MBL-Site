-- Which club each of these men actually finished the season with.
--
-- A player traded in June has a line for each club, and `is_season_end_team`
-- marks the one the season's tables should name him under - his club when it
-- ended. Of the 237 player-seasons with more than one line, 193 mark exactly
-- one club and are right. Forty mark every club he played for, and four mark
-- none, and in both of those the code takes whichever row the database hands
-- back first - so Thicceth266 finished MBL Season XII with the Voodoo and the
-- site called him a Panther, on his own page and on every table that names a
-- club.
--
-- The box scores settle it. Each of these men's last game of the season was
-- played by one of his clubs, and that is the club he ended it with. A game
-- between two of his own clubs cannot say which side he was on, so it is
-- skipped and the latest game that can is used instead; every one of the 44
-- had such a game, so nothing here is a guess.
--
-- Each statement sets the flag on every one of that man's lines in that
-- season - one to 1 and the rest to 0 - rather than only raising the right
-- one, so running it twice is the same as running it once and a line wrongly
-- raised is lowered rather than left.
-- AustinMat235611, season 44: last played for the Spiders on Tuesday September 15, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Spiders') THEN 1 ELSE 0 END
WHERE player_name = 'AustinMat235611' AND season_id = 44;

-- Basebros, season 44: last played for the Beavers on Tuesday September 29, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Beavers') THEN 1 ELSE 0 END
WHERE player_name = 'Basebros' AND season_id = 44;

-- DezJoe, season 44: last played for the Beavers on Friday October 2, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Beavers') THEN 1 ELSE 0 END
WHERE player_name = 'DezJoe' AND season_id = 44;

-- Diorr_Paris, season 1: last played for the Harlem Jazz on Friday July 31, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Harlem Jazz') THEN 1 ELSE 0 END
WHERE player_name = 'Diorr_Paris' AND season_id = 1;

-- DistortedMatrx, season 1: last played for the Hershey Otters on Thursday July 16, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Hershey Otters') THEN 1 ELSE 0 END
WHERE player_name = 'DistortedMatrx' AND season_id = 1;

-- FemBoy_T, season 44: last played for the Beavers on Friday October 2, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Beavers') THEN 1 ELSE 0 END
WHERE player_name = 'FemBoy_T' AND season_id = 44;

-- GWLYT994, season 44: last played for the Cacti on Saturday September 12, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'GWLYT994' AND season_id = 44;

-- Grand_Master_BOB, season 1: last played for the Harlem Jazz on Wednesday September 2, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Harlem Jazz') THEN 1 ELSE 0 END
WHERE player_name = 'Grand_Master_BOB' AND season_id = 1;

-- ItislaTacoMan, season 1: last played for the Toronto Expos on Wednesday September 9, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Toronto Expos') THEN 1 ELSE 0 END
WHERE player_name = 'ItislaTacoMan' AND season_id = 1;

-- ItszNova, season 44: last played for the Bandits on Monday October 5, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Bandits') THEN 1 ELSE 0 END
WHERE player_name = 'ItszNova' AND season_id = 44;

-- JackSkenes, season 1: last played for the Colorado Blizzards on Sunday July 19, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Colorado Blizzards') THEN 1 ELSE 0 END
WHERE player_name = 'JackSkenes' AND season_id = 1;

-- KingPixel24, season 44: last played for the Bandits on Thursday August 27, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Bandits') THEN 1 ELSE 0 END
WHERE player_name = 'KingPixel24' AND season_id = 44;

-- Kykybubba4, season 44: last played for the Cacti on Saturday October 3, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'Kykybubba4' AND season_id = 44;

-- LargeMines267, season 1: last played for the Hershey Otters on Wednesday September 9, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Hershey Otters') THEN 1 ELSE 0 END
WHERE player_name = 'LargeMines267' AND season_id = 1;

-- Lierrey, season 44: last played for the Cacti on Friday September 25, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'Lierrey' AND season_id = 44;

-- Myles_Games, season 44: last played for the Sentinels on Sunday September 27, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Sentinels') THEN 1 ELSE 0 END
WHERE player_name = 'Myles_Games' AND season_id = 44;

-- Ninjagooj, season 11: last played for the Atlantic City Surf on Tuesday December 6, 2022.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 11 AND name = 'Atlantic City Surf') THEN 1 ELSE 0 END
WHERE player_name = 'Ninjagooj' AND season_id = 11;

-- Nvoda, season 1: last played for the Miami Sunset on Friday July 17, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Miami Sunset') THEN 1 ELSE 0 END
WHERE player_name = 'Nvoda' AND season_id = 1;

-- P3ngwh1msy, season 1: last played for the Philadelphia Panthers on Friday July 31, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Philadelphia Panthers') THEN 1 ELSE 0 END
WHERE player_name = 'P3ngwh1msy' AND season_id = 1;

-- RazorBlade379, season 9: last played for the Desert Valley Villagers on Tuesday June 13, 2023.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 9 AND name = 'Desert Valley Villagers') THEN 1 ELSE 0 END
WHERE player_name = 'RazorBlade379' AND season_id = 9;

-- Rebtsuna, season 1: last played for the Philadelphia Panthers on Friday September 11, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Philadelphia Panthers') THEN 1 ELSE 0 END
WHERE player_name = 'Rebtsuna' AND season_id = 1;

-- Rtyr, season 9: last played for the San Antonio Aces on Friday June 23, 2023.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 9 AND name = 'San Antonio Aces') THEN 1 ELSE 0 END
WHERE player_name = 'Rtyr' AND season_id = 9;

-- ShadowHYT, season 44: last played for the Hitmen on Thursday September 10, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Hitmen') THEN 1 ELSE 0 END
WHERE player_name = 'ShadowHYT' AND season_id = 44;

-- SleepyHallow2nd, season 44: last played for the Spiders on Wednesday September 30, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Spiders') THEN 1 ELSE 0 END
WHERE player_name = 'SleepyHallow2nd' AND season_id = 44;

-- SplotchyPizza99, season 44: last played for the Bandits on Thursday October 1, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Bandits') THEN 1 ELSE 0 END
WHERE player_name = 'SplotchyPizza99' AND season_id = 44;

-- TSlinky7, season 44: last played for the Spiders on Wednesday September 30, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Spiders') THEN 1 ELSE 0 END
WHERE player_name = 'TSlinky7' AND season_id = 44;

-- TheJayNY, season 44: last played for the Samurai on Friday September 4, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Samurai') THEN 1 ELSE 0 END
WHERE player_name = 'TheJayNY' AND season_id = 44;

-- Thicceth266, season 1: last played for the Louisiana Voodoo on Saturday August 29, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Louisiana Voodoo') THEN 1 ELSE 0 END
WHERE player_name = 'Thicceth266' AND season_id = 1;

-- Titansstorm1, season 33: last played for the Oranges on Monday March 24, 2025.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 33 AND name = 'Oranges') THEN 1 ELSE 0 END
WHERE player_name = 'Titansstorm1' AND season_id = 33;

-- Vellyii, season 1: last played for the Hershey Otters on Saturday September 5, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Hershey Otters') THEN 1 ELSE 0 END
WHERE player_name = 'Vellyii' AND season_id = 1;

-- Wonderkachow420, season 11: last played for the Portland Penguins on Wednesday November 23, 2022.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 11 AND name = 'Portland Penguins') THEN 1 ELSE 0 END
WHERE player_name = 'Wonderkachow420' AND season_id = 11;

-- Xrexes32, season 44: last played for the Cacti on Monday September 28, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'Xrexes32' AND season_id = 44;

-- _Purp__, season 1: last played for the Louisiana Voodoo on Saturday August 29, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Louisiana Voodoo') THEN 1 ELSE 0 END
WHERE player_name = '_Purp__' AND season_id = 1;

-- bigmac1936, season 1: last played for the Louisiana Voodoo on Friday July 17, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Louisiana Voodoo') THEN 1 ELSE 0 END
WHERE player_name = 'bigmac1936' AND season_id = 1;

-- dawgs522, season 1: last played for the Colorado Blizzards on Saturday July 11, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Colorado Blizzards') THEN 1 ELSE 0 END
WHERE player_name = 'dawgs522' AND season_id = 1;

-- deanog_, season 12: last played for the Miami Boom on Saturday August 13, 2022.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 12 AND name = 'Miami Boom') THEN 1 ELSE 0 END
WHERE player_name = 'deanog_' AND season_id = 12;

-- flextilldeath_, season 1: last played for the Miami Sunset on Thursday September 10, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Miami Sunset') THEN 1 ELSE 0 END
WHERE player_name = 'flextilldeath_' AND season_id = 1;

-- jakedabear17, season 44: last played for the Samurai on Tuesday September 29, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Samurai') THEN 1 ELSE 0 END
WHERE player_name = 'jakedabear17' AND season_id = 44;

-- k_man15, season 44: last played for the Cacti on Wednesday September 30, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'k_man15' AND season_id = 44;

-- peejamillion, season 1: last played for the Philadelphia Panthers on Friday September 11, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Philadelphia Panthers') THEN 1 ELSE 0 END
WHERE player_name = 'peejamillion' AND season_id = 1;

-- pichipoh, season 34: last played for the Raiders on Thursday May 8, 2025.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 34 AND name = 'Raiders') THEN 1 ELSE 0 END
WHERE player_name = 'pichipoh' AND season_id = 34;

-- shoulderxd, season 44: last played for the Cacti on Saturday August 15, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Cacti') THEN 1 ELSE 0 END
WHERE player_name = 'shoulderxd' AND season_id = 44;

-- skelton106, season 44: last played for the Bandits on Monday September 28, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 44 AND name = 'Bandits') THEN 1 ELSE 0 END
WHERE player_name = 'skelton106' AND season_id = 44;

-- untilfrance, season 1: last played for the Colorado Blizzards on Tuesday September 8, 2026.
UPDATE historical_player_stats SET is_season_end_team = CASE WHEN historical_team_id = (SELECT id FROM historical_teams WHERE season_id = 1 AND name = 'Colorado Blizzards') THEN 1 ELSE 0 END
WHERE player_name = 'untilfrance' AND season_id = 1;
