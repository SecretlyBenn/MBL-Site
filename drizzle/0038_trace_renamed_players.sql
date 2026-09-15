-- Links players whose site name is an old Minecraft name, found through the
-- name history crafty.gg keeps (Mojang stopped publishing name history in
-- 2022). Each account below held the name during the seasons the player
-- played under it; Mojang confirmed every UUID and current name on 2026-09-14.

-- The league confirmed these two, whose site names were never Minecraft names.
-- The site now shows their Minecraft names.
UPDATE historical_player_stats SET player_name = 'FartFreak47' WHERE player_name = 'AMC Designs';
UPDATE historical_game_stats SET player_name = 'FartFreak47' WHERE player_name = 'AMC Designs';
UPDATE historical_roster_entries SET player_name = 'FartFreak47' WHERE player_name = 'AMC Designs';
UPDATE players SET display_name = 'FartFreak47', minecraft_username = 'FartFreak47' WHERE display_name = 'AMC Designs';

UPDATE historical_player_stats SET player_name = 'Tatis_Jr23' WHERE player_name = 'Fernando Tatis Jr';
UPDATE historical_game_stats SET player_name = 'Tatis_Jr23' WHERE player_name = 'Fernando Tatis Jr';
UPDATE historical_roster_entries SET player_name = 'Tatis_Jr23' WHERE player_name = 'Fernando Tatis Jr';
UPDATE players SET display_name = 'Tatis_Jr23', minecraft_username = 'Tatis_Jr23' WHERE display_name = 'Fernando Tatis Jr';

INSERT INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('FartFreak47', 'c1f3e6e3daeb4c069b48f4846837289c', 'FartFreak47', 'user'),
  ('Tatis_Jr23', '8e506062b75845ec9048238c0c0e0418', 'Tatis_Jr23', 'user'),

  -- Names nobody uses any more, traced to the account that used them.
  ('andretheoddeer', '91388c156d9f407bb7fc1dcf90805fcf', 'ozzyoddeer', 'history'),   -- its first name, kept to Dec 2024
  ('ConanGrayLvr', 'dadfd382d0ab4f2b94689e1fa6cbc80d', 'Magz10', 'history'),         -- Feb-Aug 2026, Season XII
  ('jujudigga', 'eeafd671615741a3b789a59efc60e3d8', 'JujuOwO', 'history'),           -- its first name, kept to May 2025
  ('KuraYami_Shy', 'd31a8cb7c25d4a60a9cdb7b6b04f3419', 'lilbabygirl20', 'history'),  -- Sep-Nov 2023, into Season IX
  ('Z1_juju', 'd31a8cb7c25d4a60a9cdb7b6b04f3419', 'lilbabygirl20', 'history'),       -- Jun 2024-Jan 2026, Season X
  ('lilscotty213', 'a5301db5bafd48b0b587dbe8ed463477', 'lilscotty_', 'history'),     -- its first name; the only account ever to use it
  ('LilTopRages', 'cde84237fb0b4225a27b2c0e3c3f7915', 'B0TZ_', 'history'),           -- Mar-Apr 2025, Season XI
  ('Luh_Toasted', 'c8dd7aeb68ce498fa720e71a847fbf49', 'ToastedXD', 'history'),       -- Apr-Jun 2024, just before Season X
  ('TheDimeBoss', '1d209192a00e47f192cd2ac83300e76b', 'alxsndro', 'history'),        -- Jul-Aug 2022, Season VI
  ('WaleTheSage', '19dc6b6ecb584f75a4418eee3c93d056', 'fxwx', 'history')             -- Oct 2023-Feb 2024, Season IX
ON CONFLICT (player_name) DO NOTHING;

-- These names were linked by 0037 to whoever holds them today, but a stranger
-- took each one after the player moved on. They now follow the player.
UPDATE minecraft_profiles SET uuid = '895e7bbc53cd46589d36880aa7f12396', current_name = 'Ozzxd', source = 'history'
  WHERE player_name = 'ozz2';     -- Ozz2 through Season IX; today's Ozz2 is a new account
UPDATE minecraft_profiles SET uuid = 'b01214839d264913949f03943b6357d6', current_name = 'OrnooTT_', source = 'history'
  WHERE player_name = 'Raid007';  -- Raid007 until May 2024; taken by someone else in 2025
UPDATE minecraft_profiles SET uuid = '351007325d0245adb917257950d63fc0', current_name = 'nycmanny', source = 'history'
  WHERE player_name = 'Z3roo';    -- Z3roo until Feb 2024; taken by someone else a month later
