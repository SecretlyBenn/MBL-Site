-- The roster bot has the right names. This site had five wrong ones.
--
-- The two systems are joined on the IGN and nothing else, so a man this site
-- spells its own way is a man the bot can never reach: every push about him
-- lands as a stranger. Five were wrong and all five were wrong the same way.
-- Somebody typed what a player is called into a lineup or a roster sheet and
-- this site took it for a username - `Rjs` for `rjs1730`, `Vision` for
-- `_Vision05`, `Thicceth26` for `Thicceth266`, `DistortedMatrix` for
-- `DistortedMatrx` - or the two competitions filed one man under two
-- spellings, which is how the MBL came to have `aMemory` and the MCBA
-- `AMemoray`.
--
-- Checking them against Mojang proved nothing, and that is the part worth
-- recording. All five of the wrong names came back as real accounts, because
-- a name its owner stops using is free for a stranger to take, which is the
-- reason heads are drawn from the UUID here and never from the name. The
-- archive is what settled it: `aMemory` played MBL seasons 1, 3 and 5 and
-- `AMemoray` MCBA 31 and 32, and the two never appear in a game together.
-- Set against that, `Drypho` and `Dwypho` share twenty-eight games, so they
-- are two people however alike the names look, and they are left alone.
--
-- Running this twice is the same as running it once.

-- Three plain renames. The bot's spelling appears nowhere on this site - not
-- in `players`, not in any of the three archive tables - so there is nothing
-- to merge and the career simply moves across.
UPDATE historical_player_stats   SET player_name = '_Vision05' WHERE player_name = 'Vision';
UPDATE historical_game_stats     SET player_name = '_Vision05' WHERE player_name = 'Vision';
UPDATE historical_roster_entries SET player_name = '_Vision05' WHERE player_name = 'Vision';
UPDATE players SET display_name = '_Vision05', minecraft_username = '_Vision05' WHERE minecraft_username = 'Vision';

UPDATE historical_player_stats   SET player_name = 'DistortedMatrx' WHERE player_name = 'DistortedMatrix';
UPDATE historical_game_stats     SET player_name = 'DistortedMatrx' WHERE player_name = 'DistortedMatrix';
UPDATE historical_roster_entries SET player_name = 'DistortedMatrx' WHERE player_name = 'DistortedMatrix';
UPDATE players SET display_name = 'DistortedMatrx', minecraft_username = 'DistortedMatrx' WHERE minecraft_username = 'DistortedMatrix';

UPDATE historical_player_stats   SET player_name = 'Thicceth266' WHERE player_name = 'Thicceth26';
UPDATE historical_game_stats     SET player_name = 'Thicceth266' WHERE player_name = 'Thicceth26';
UPDATE historical_roster_entries SET player_name = 'Thicceth266' WHERE player_name = 'Thicceth26';
UPDATE players SET display_name = 'Thicceth266', minecraft_username = 'Thicceth266' WHERE minecraft_username = 'Thicceth26';

-- Two merges. Each man has two rows in `players`: one the MBL made and one
-- `0099` built from the MCBA archive. The MBL row is the one that has been
-- used - both are on the Jazz today - so it survives and takes the bot's
-- spelling, and the free-agent row the import left behind goes. Those two
-- are referenced by nothing: no roster spot, no move, no lineup, no bench,
-- no plate appearance, no fielding change. They are deleted by id because a
-- name predicate could match the surviving row on a later run, once he is a
-- free agent again. `minecraft_username` is unique, so the delete comes
-- before the rename or the rename has nowhere to land.
UPDATE historical_player_stats   SET player_name = 'AMemoray' WHERE player_name = 'aMemory';
UPDATE historical_game_stats     SET player_name = 'AMemoray' WHERE player_name = 'aMemory';
UPDATE historical_roster_entries SET player_name = 'AMemoray' WHERE player_name = 'aMemory';
DELETE FROM players WHERE id = 694;  -- the MCBA import's spare `AMemoray`
UPDATE players SET display_name = 'AMemoray', minecraft_username = 'AMemoray' WHERE minecraft_username = 'aMemory';

UPDATE historical_player_stats   SET player_name = 'rjs1730' WHERE player_name = 'Rjs';
UPDATE historical_game_stats     SET player_name = 'rjs1730' WHERE player_name = 'Rjs';
UPDATE historical_roster_entries SET player_name = 'rjs1730' WHERE player_name = 'Rjs';
DELETE FROM players WHERE id = 724;  -- the MCBA import's spare `rjs1730`
UPDATE players SET display_name = 'rjs1730', minecraft_username = 'rjs1730' WHERE minecraft_username = 'Rjs';

-- The accounts. The five rows being replaced point at whoever holds those
-- names now, which is why four of these five men have been showing a
-- stranger's face. Deleted rather than renamed, so a second run rebuilds
-- them instead of colliding.
DELETE FROM minecraft_profiles WHERE player_name IN ('Vision', 'DistortedMatrix', 'Thicceth26', 'aMemory', 'Rjs');
DELETE FROM minecraft_profiles WHERE player_name IN ('_Vision05', 'DistortedMatrx', 'Thicceth266', 'AMemoray', 'rjs1730');
INSERT INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('_Vision05',      'b3d45c2679b54ca6bf66ad837606ebea', '_Vision05',      'user'),
  ('DistortedMatrx', 'd97d1baa55694400974c24df6731a3b3', 'DistortedMatrx', 'user'),
  ('Thicceth266',    '9b2f7afe047a4a699e025f53c0d9066b', 'Thicceth266',    'user'),
  ('AMemoray',       '378a9b36ac1041db82c0844b65eb9572', 'AMemoray',       'user'),
  ('rjs1730',        '5784461d7f944592ad101d087b86e7e5', 'rjs1730',        'user');
