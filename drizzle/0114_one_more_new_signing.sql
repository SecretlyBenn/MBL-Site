-- One more of the same as 0113.
--
-- `Ni_ck` was signed to the Spiders while 0113 was being written, so he
-- arrived through the old path and has no account on file either. He is in a
-- file of his own rather than added to 0113, because that one has already been
-- applied and a migration that has run is the record of what was run.
--
-- Nobody after him needs this. The bot route now files the account at the same
-- time it creates the player, so a signing from here on arrives with its head.
--
-- Checked the same way: `52bc8c7e...` belongs to no other name on this site.
INSERT OR IGNORE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('Ni_ck', '52bc8c7e05db497abfa13ea09787f3e0', 'Ni_ck', 'mojang');
