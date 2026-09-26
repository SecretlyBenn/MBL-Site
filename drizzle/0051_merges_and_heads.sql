-- Three merges the league confirmed, and the last of the heads it could name.
--
-- ---------------------------------------------------------------- 1. porotalz
--
-- porotalz and fluff3885 are one player: NameMC has both names on the account
-- that answers to Fluff_Official today. They share no season, so as in 0039
-- every row simply takes the kept name:
--
--   porotalz   MCBA XI                            Oranges
--   fluff3885  MCBA XII pre-season, MCBA XIII     Spiders, Beavers
--
-- fluff3885 is kept because it is the later name.

UPDATE historical_player_stats SET player_name = 'fluff3885' WHERE player_name = 'porotalz';
UPDATE historical_game_stats SET player_name = 'fluff3885' WHERE player_name = 'porotalz';
UPDATE historical_roster_entries SET player_name = 'fluff3885' WHERE player_name = 'porotalz';

-- ------------------------------------------------------------ 2. sleepytemple
--
-- sleepytemple and Nxck111 are one player, on the account now called pichipoh.
-- Both played MCBA X, but for different clubs - sleepytemple for the Raiders
-- and Nxck111 for the Vipers - so the merge leaves one player with two clubs
-- in that season, which 214 players in the archive already have. Nxck111 is
-- kept: it is the name that carries on into MCBA XII.

UPDATE historical_player_stats SET player_name = 'Nxck111' WHERE player_name = 'sleepytemple';
UPDATE historical_game_stats SET player_name = 'Nxck111' WHERE player_name = 'sleepytemple';
UPDATE historical_roster_entries SET player_name = 'Nxck111' WHERE player_name = 'sleepytemple';

-- --------------------------------------------------------------- 3. Pillowdrip
--
-- Pillowdrip and sppydaa are one player, on the account now called spyda4.
-- This pair is not like the other two: both names hold a line for the *same*
-- club-season - the Trojans in MCBA X pre-season, historical_team_id 280 - so
-- renaming alone would leave two lines for one player and one club, which no
-- player in the archive has. They are two stints of one season rather than a
-- stale duplicate (unlike 0036), and they share no game, so the lines are
-- added together instead of one being dropped:
--
--   sppydaa     2 G, 4 AB, 1 BB, 4 K, 5 PA, 1 E
--   Pillowdrip  1 G, 2 AB,       2 K, 2 PA, 3 LOB
--   together    3 G, 6 AB, 1 BB, 6 K, 7 PA, 1 E, 3 LOB
--
-- Neither had a hit, so the rates follow the archive's own convention -
-- (H + BB) / PA, rounded to three places: OBP 1/7 = .143, SLG .000, OPS .143.

UPDATE historical_player_stats SET
  games = 3,
  at_bats = 6,
  strikeouts = 6,
  plate_appearances = 7,
  left_on_base = 3,
  on_base_pct = 0.143,
  ops = 0.143
WHERE player_name = 'sppydaa' AND historical_team_id = 280;

DELETE FROM historical_player_stats WHERE player_name = 'Pillowdrip';

UPDATE historical_game_stats SET player_name = 'sppydaa' WHERE player_name = 'Pillowdrip';
UPDATE historical_roster_entries SET player_name = 'sppydaa' WHERE player_name = 'Pillowdrip';

-- Both names were on the Trojans' roster, so the rename leaves the same player
-- listed twice. The earlier row stays.
DELETE FROM historical_roster_entries
WHERE player_name = 'sppydaa'
  AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'sppydaa' GROUP BY historical_team_id);

-- ------------------------------------------------------------------- 4. Heads
--
-- The seven names NameMC could not decide between - it listed several accounts
-- for each - settled by the league, and botuah, whose account id the league
-- gave directly. Each was confirmed against Mojang before being written here;
-- botuah's id does answer to akvmi, the name the league said they moved to.
--
-- The Collegiate Association's DarkDrippzy takes the same account as the MBL's
-- DarkDrippzy77 (0036) without the two names being merged, because the league
-- keeps its MCBA and MBL records apart.

INSERT OR REPLACE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('botuah', 'b6f970053b634ba4972ef6f1adccd0d1', 'akvmi', 'user'),
  ('iLonni', 'f049bc289ecd43af9161217245fc49b9', 'Cuddl_', 'user'),
  ('ParisMortonMusic', '16ac22436c6440bc92b7709cf8b7b7cd', 'ParisMortonMusic', 'user'),
  ('OptionalLabor', 'fe607319aa974856ba515b0b97455fe7', 'OptionalLabour', 'user'),
  ('heatedbeast135', 'c23284fa7eb049a4bac41c1bf2d2e551', 'bigmac1936', 'user'),
  ('Its_Iron', '0091d85599014e8b9ac9ef87340bd8cf', 'irxnn', 'user'),
  ('gLoOmGaMes', '265a928d2f15463cb00dc6f875a96da7', 'gLo0mGaMeS', 'user'),
  ('epicmegablade8', '77dd7a6a4b044851b87c7a97490f7cd0', 'biscuitok', 'user'),
  ('DarkDrippzy', '1ad75e5c70e6464ab71901b79ea61054', 'DarkDrippzy77', 'user');

-- The merged-away names never had an account linked; the kept names do.
DELETE FROM minecraft_profiles WHERE player_name IN ('porotalz', 'sleepytemple', 'Pillowdrip');
