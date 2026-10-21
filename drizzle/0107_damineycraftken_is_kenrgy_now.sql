-- `DaMineyCraftKen` renamed his account to `Kenrgy`.
--
-- The only one of the six that Mojang could settle by itself, and it did:
-- the old name is free - nobody holds it any more - and the account this
-- site has on file for him, `97c98180...`, is the one Mojang now calls
-- `Kenrgy`. Same UUID, so this is a rename and not a judgement call.
--
-- This site would have got there on its own eventually. `adoptCurrentName`
-- moves a player onto his account's current name whenever `/api/head`
-- refreshes a skin, and that is exactly what it is for. It is done here
-- because the roster bot is about to push `Kenrgy` to the Panthers, and a
-- push that arrives first would create a second row for a man with six
-- seasons, which `adoptCurrentName` would then refuse to merge.
--
-- Nothing on this site is called `Kenrgy` yet, so there is nothing to merge.
-- Running this twice is the same as running it once.
UPDATE historical_player_stats   SET player_name = 'Kenrgy' WHERE player_name = 'DaMineyCraftKen';
UPDATE historical_game_stats     SET player_name = 'Kenrgy' WHERE player_name = 'DaMineyCraftKen';
UPDATE historical_roster_entries SET player_name = 'Kenrgy' WHERE player_name = 'DaMineyCraftKen';
UPDATE players SET display_name = 'Kenrgy', minecraft_username = 'Kenrgy' WHERE minecraft_username = 'DaMineyCraftKen';
UPDATE minecraft_profiles SET player_name = 'Kenrgy', current_name = 'Kenrgy' WHERE player_name = 'DaMineyCraftKen';
