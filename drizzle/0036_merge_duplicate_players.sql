-- Two players were on the site under two names each. The league confirmed
-- DarkDrippzy77 and Jpearjr7 are the real names:
--
--   DarkDrippzy -> DarkDrippzy77
--   Jpear17     -> Jpearjr7
--
-- A plain rename would double-count Season XII. Both names hold a Season XII
-- line for the Arizona Thunderbirds, but they are not two halves of a season:
--
--   * Jpear17's line was rebuilt from the season's box scores, which are all
--     filed under Jpear17 - every game of Season XII.
--   * Jpearjr7's line has no box scores behind it. It is the season total as it
--     stood at the all-star break: 12 G, 32 AB, 29.1 IP, which is exactly the
--     sum of Jpear17's pre-break box scores.
--
-- DarkDrippzy / DarkDrippzy77 is the same shape: DarkDrippzy77's 1 G, 2 AB is
-- exactly DarkDrippzy's single pre-break game.
--
-- So the stale pre-break lines are dropped, and the complete lines take the
-- real name. Every other season is held under one name only.

DELETE FROM historical_player_stats
WHERE season_id = (SELECT id FROM historical_seasons WHERE name = 'MBL Season XII')
  AND player_name IN ('Jpearjr7', 'DarkDrippzy77');

UPDATE historical_player_stats SET player_name = 'Jpearjr7' WHERE player_name = 'Jpear17';
UPDATE historical_game_stats SET player_name = 'Jpearjr7' WHERE player_name = 'Jpear17';
UPDATE historical_roster_entries SET player_name = 'Jpearjr7' WHERE player_name = 'Jpear17';

UPDATE historical_player_stats SET player_name = 'DarkDrippzy77' WHERE player_name = 'DarkDrippzy';
UPDATE historical_game_stats SET player_name = 'DarkDrippzy77' WHERE player_name = 'DarkDrippzy';
UPDATE historical_roster_entries SET player_name = 'DarkDrippzy77' WHERE player_name = 'DarkDrippzy';

-- The live pool held both names too. The duplicates were added by 0029 and
-- have never appeared in a lineup, at-bat, fielding change or roster move, so
-- they are removed and the real players (Jpearjr7, DarkDrippzy77) stay as they
-- are. The guard keeps this a no-op if either has since been used.
DELETE FROM players
WHERE minecraft_username IN ('Jpear17', 'DarkDrippzy')
  AND id NOT IN (SELECT player_id FROM scorecard_lineups)
  AND id NOT IN (SELECT batter_player_id FROM plate_appearances)
  AND id NOT IN (SELECT pitcher_player_id FROM plate_appearances)
  AND id NOT IN (SELECT player_id FROM roster_moves);

-- Neither duplicate name had a Minecraft account linked; the real names do.
DELETE FROM minecraft_profiles WHERE player_name IN ('Jpear17', 'DarkDrippzy');
