-- Two names the league asked to remove rather than chase an account for.
--
--   HZDripy        MBL Season V, Tijuana Piranhas. No games, no at-bats, no
--                  anything - the line is empty but for the flag saying which
--                  club he ended the season with. Also carried on the Embers'
--                  Season VI roster without a line at all.
--   RatInYourHome  MBL Season IV, Houston Hurricanes. One at-bat, one plate
--                  appearance, nothing else.
--
-- Neither has a single row in historical_game_stats, so no box score loses a
-- batter and no game stops adding up to its own result - which is the only
-- reason removing them is safe. RatInYourHome's at-bat is a real record being
-- dropped, small as it is; HZDripy never played at all.

DELETE FROM historical_player_stats WHERE player_name IN ('HZDripy', 'RatInYourHome');
DELETE FROM historical_roster_entries WHERE player_name IN ('HZDripy', 'RatInYourHome');

-- Neither had an account linked, so there is no profile to clear.
