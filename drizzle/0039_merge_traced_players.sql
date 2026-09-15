-- Four players were on the site under two names each. Name history (see 0038)
-- showed each pair is one Minecraft account, and the league confirmed the
-- merges. The earlier name joins the later one:
--
--   LilTopRages  -> B0TZ_      (account B0TZ_)
--   Luh_Toasted  -> ToastedXD  (account ToastedXD)
--   Z3roo        -> nycmanny   (account nycmanny)
--   KuraYami_Shy -> Z1_juju    (account lilbabygirl20; Z1_juju is the later league name)
--
-- Unlike DarkDrippzy and Jpear17 (0036), no pair shares a season or a game, so
-- nothing is double-counted and every row simply takes the kept name. Only
-- nycmanny is in the live player pool, and the merged-away names are not.

UPDATE historical_player_stats SET player_name = 'B0TZ_' WHERE player_name = 'LilTopRages';
UPDATE historical_game_stats SET player_name = 'B0TZ_' WHERE player_name = 'LilTopRages';
UPDATE historical_roster_entries SET player_name = 'B0TZ_' WHERE player_name = 'LilTopRages';

UPDATE historical_player_stats SET player_name = 'ToastedXD' WHERE player_name = 'Luh_Toasted';
UPDATE historical_game_stats SET player_name = 'ToastedXD' WHERE player_name = 'Luh_Toasted';
UPDATE historical_roster_entries SET player_name = 'ToastedXD' WHERE player_name = 'Luh_Toasted';

UPDATE historical_player_stats SET player_name = 'nycmanny' WHERE player_name = 'Z3roo';
UPDATE historical_game_stats SET player_name = 'nycmanny' WHERE player_name = 'Z3roo';
UPDATE historical_roster_entries SET player_name = 'nycmanny' WHERE player_name = 'Z3roo';

UPDATE historical_player_stats SET player_name = 'Z1_juju' WHERE player_name = 'KuraYami_Shy';
UPDATE historical_game_stats SET player_name = 'Z1_juju' WHERE player_name = 'KuraYami_Shy';
UPDATE historical_roster_entries SET player_name = 'Z1_juju' WHERE player_name = 'KuraYami_Shy';

-- The kept names already link to the same accounts.
DELETE FROM minecraft_profiles WHERE player_name IN ('LilTopRages', 'Luh_Toasted', 'Z3roo', 'KuraYami_Shy');
