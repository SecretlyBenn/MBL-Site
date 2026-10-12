-- sgtbluee is BlueOnion_, named by the league's owner.
--
-- Mojang has nothing under `sgtbluee` because he renamed, and the name-history
-- API that would have found it backwards has been gone since 2022. He played
-- for the Philadelphia Panthers in MBL Season XI.

UPDATE historical_player_stats SET player_name = 'BlueOnion_' WHERE player_name = 'sgtbluee';
UPDATE historical_game_stats SET player_name = 'BlueOnion_' WHERE player_name = 'sgtbluee';
UPDATE historical_roster_entries SET player_name = 'BlueOnion_' WHERE player_name = 'sgtbluee';
UPDATE players SET display_name = 'BlueOnion_', minecraft_username = 'BlueOnion_' WHERE display_name = 'sgtbluee';

INSERT INTO minecraft_profiles (player_name, uuid, current_name, source)
SELECT 'BlueOnion_', 'b059dbae6e634eaaa95961cae9aec27b', 'BlueOnion_', 'mojang'
WHERE NOT EXISTS (SELECT 1 FROM minecraft_profiles WHERE player_name = 'BlueOnion_');
