-- `Virments` renamed his account to `jacobthe3rdjr`.
--
-- He is the last of the signings 0113 could not finish. The name he was signed
-- under does not exist on Mojang, which looked like a typo and was really a
-- rename that had already happened before anybody asked: `484e5588...` holds
-- `jacobthe3rdjr` today and is the same account throughout.
--
-- The site follows a rename on its own - `/api/head/[uuid]` notices it within
-- six hours and `adoptCurrentName` moves the player onto the new name - but
-- only for a player whose account is on file. His never was, so there was no
-- uuid to ask about and nothing to follow, which is the whole reason he got
-- stuck under a dead name. Filing the account is what stops this recurring:
-- the next time he renames, nobody has to do anything.
--
-- He has no archive yet, so the three archive statements match nothing today.
-- They are here because a game published between writing this and running it
-- would file him under the old name, and then the rename would be half done
-- with nothing saying so.
UPDATE players SET display_name = 'jacobthe3rdjr', minecraft_username = 'jacobthe3rdjr'
WHERE display_name = 'Virments';
UPDATE historical_player_stats   SET player_name = 'jacobthe3rdjr' WHERE player_name = 'Virments';
UPDATE historical_game_stats     SET player_name = 'jacobthe3rdjr' WHERE player_name = 'Virments';
UPDATE historical_roster_entries SET player_name = 'jacobthe3rdjr' WHERE player_name = 'Virments';

-- Checked first: this uuid belongs to no other name on this site, so filing it
-- is not a merge in disguise.
INSERT OR IGNORE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('jacobthe3rdjr', '484e5588071a4c11aa2f6693a93ba02b', 'jacobthe3rdjr', 'mojang');
