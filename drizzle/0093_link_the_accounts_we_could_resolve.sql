-- Accounts for 71 names the archive had never linked.
--
-- A name with no row in minecraft_profiles gets the neutral grey block
-- instead of a head, which is correct - a stranger's face is worse than no
-- face - but it had been left standing for 145 names, including men who
-- played this season. Every one of these was resolved from Mojang on a
-- developer's machine, as CLAUDE.md prescribes: the Worker itself is refused
-- by Mojang and falls back to a relay, and a lookup of this many names is far
-- cheaper run from outside.
--
-- Mojang returns a name's canonical spelling, so 18 of them also move: the
-- archive had the right letters in the wrong case, which is its own kind of
-- split record now that a player is shown under the name they go by.
--
-- Five of the 67 turned out to belong to accounts already on file under
-- that canonical spelling, so they take the rename and need no new row; the
-- inserts below are guarded so they add nothing twice.
--
-- 36 names are still unlinked after this. Those are the untraceable ones:
-- Discord nicknames from before the league required them to match in-game
-- names, names with a space or a dot in them, and accounts that have since
-- been renamed, which Mojang cannot resolve backwards since it dropped the
-- name-history API in 2022.

-- First, eight names that 0091 had already retired and 0092 brought back.
--
-- 0091 moved every player onto the name their account carries now. 0092 then
-- stripped the jersey numbers off box score lines - and `AbusiveStepdad66 #3`
-- is not a string 0091 had ever seen, so taking the number off recreated a
-- name that had been renamed hours earlier. It should have put the stripped
-- name through 0091's map; it did not.
--
-- This is also why five of them came back unresolved from Mojang: the account
-- was renamed, so the old name answers to nobody. The site already knew the
-- new one.

CREATE TABLE regressed (old TEXT PRIMARY KEY, new TEXT NOT NULL);

INSERT INTO regressed (old, new) VALUES
  ('AbusiveStepdad66', 'LostAzy'),
  ('Centex64', 'Centex_'),
  ('IcedNerd', 'IcedBurg'),
  ('Perno_', 'camperno'),
  ('Petro131', 'TickleTips10'),
  ('Timbr_', 'timbr_'),
  ('jawaq', 'Jawaq'),
  ('theunabomber', 'TheUnabomber');

UPDATE historical_game_stats
SET player_name = (SELECT new FROM regressed WHERE old = historical_game_stats.player_name)
WHERE player_name IN (SELECT old FROM regressed);

UPDATE historical_player_stats
SET player_name = (SELECT new FROM regressed WHERE old = historical_player_stats.player_name)
WHERE player_name IN (SELECT old FROM regressed);

UPDATE historical_roster_entries
SET player_name = (SELECT new FROM regressed WHERE old = historical_roster_entries.player_name)
WHERE player_name IN (SELECT old FROM regressed);

DROP TABLE regressed;

CREATE TABLE account_fix (asked TEXT PRIMARY KEY, canonical TEXT NOT NULL, uuid TEXT NOT NULL);

INSERT INTO account_fix (asked, canonical, uuid) VALUES
  ('1000678446690865', '1000678446690865', '30c05e4e77af4fcfa953fbe9f6ba2f5b'),
  ('54mins', '54mins', '5df155b806054642959e087c7d558598'),
  ('9HE', '9HE', '653a2a20c896491890f17282673f52a9'),
  ('AstrO0o00O', 'AstrO0o00O', '3fd947f1984b43b0804a87aebf6be925'),
  ('B1itz123', 'B1itz123', 'f41538974c0d4843aecc841a75a2b28b'),
  ('BeastMode15', 'BeastMode15', '62c809ea7ada4c3e8e70341191de5d4b'),
  ('Chinabushes', 'Chinabushes', '164d5a33dbbd4abaae6d4b7ccb01914e'),
  ('CranktheFrank44', 'CranktheFrank44', 'dfaf14bc41fa45ea9a6742994d00f20b'),
  ('DR_K_O', 'DR_K_O', '2466d8b84dd740b0bfed2b4769ed012f'),
  ('Darthside_', 'Darthside_', 'c9755ed7c58140cd995c76f72a440bb1'),
  ('DredgenA', 'DredgenA', '625089a6b79741a595bcc880a9cef70d'),
  ('DuckMan778', 'DuckMan778', 'd38fcacf1e874986be491b298437f33d'),
  ('EclipsedNight', 'EclipsedNight', 'bc87b3bf102f4a71a86bfd65f30da0d7'),
  ('FayeTheNerd', 'FayeTheNerd', '58342127157d4088828ea696570803d8'),
  ('FilthyFew4', 'FilthyFew4', '21e774735ed74c7fad92b17263e8d8cc'),
  ('Fr1z3y', 'Fr1z3y', '400de87482574739ba2277680e1c34ee'),
  ('Gambi71', 'Gambi71', 'b79b9258bdd74897bca44207487271e7'),
  ('GuardianRageGod', 'GuardianRageGod', 'b6b040ea0b4a481c891c15b234918059'),
  ('Gwaffy', 'Gwaffy', 'ff695a100d4b45e98ee73c1b9b2fa0a6'),
  ('KANKANLOVER', 'KANKANLOVER', '0496a8ec421349e1b8bc4bd286344cef'),
  ('Kairo104', 'kairo104', '5c48351039fe4c4b817905b5743cd0c4'),
  ('MrBlondguy', 'MrBlondGuy', '9e675c019673439294f64c70e8acfbb4'),
  ('TheWhopper', 'TheWhopper', '3ee6b025629042dab21aa2a10ad1b2ec'),
  ('Timbr_', 'timbr_', '817c19a853b445c0bf3022f0e1298c40'),
  ('Yorch', 'Yorch', 'cfd2c07416714bedb43a651a19c0074e'),
  ('burnoutsbythebay', 'BurnoutsByTheBay', '72d497c5c2c1466baa025be6cd6391c5'),
  ('djpug502', 'djpug502', '1ad544ee262d43289c11044e53cc36a0'),
  ('narvixa', 'Narvixa', 'e5fd0c9f0af04a91bf2db542055c4960'),
  ('pokup', 'Pokup', '4ee7da044e154a2a99013f533176327a'),
  ('qhox', 'qhox', 'a27f1e7e4f234af587614f07b5bb76b6'),
  ('silvernolife', 'SilverNoLife', 'c60daeed129246169bc6eb9a1647c842'),
  ('tcpdark_knight', 'tcpdark_knight', '81223a4f81844977a68c9a9f277e6ba4'),
  ('thatweirdfriend1', 'thatweirdfriend1', '87e0b12861b3491b80baea49732a66f1'),
  ('theunabomber', 'TheUnabomber', '650152eeb2a2454aaeea0af0673eda21'),
  ('vxstly', 'vxstly', '6c0f8124231e45caa2efadfcf0514bf0'),
  ('wurbi', 'wurbi', 'ab7047523dc54cd68edc3002569ec5e9'),
  ('xtreemes', 'xtreemes', '30414937a43242a8a349887f0075fe33'),
  ('yanbanane', 'yanbanane', '9ced04927e5a4ff8b9314ddbce9e6739'),
  ('Ilovepuh', 'ilovepuh', '14b9dd3ad353462fa7c7acb15ee354b5'),
  ('Jayden2132', 'Jayden2132', '58d38aa1005141c99d52c36c513211b8'),
  ('Kcroyals', 'Kcroyals', 'dd887eb7801945ecb2f271f7c35ec714'),
  ('Konelu', 'Konelu', '43e2bbbf0b4c474b93c5ee0ea503091a'),
  ('LavaLando09', 'LavaLando09', 'd6b878b1c097459b8447c4b250dadab2'),
  ('Notcolorzz', 'NotColorzz', '53b394ded2f5403db721be9764a55215'),
  ('RandomThingys', 'RandomThingys', '430888c8ba584d5fa9ca061dd3464384'),
  ('Rey1021', 'Rey1021', '460cd02330994276a198d17d2004a8fa'),
  ('Sulfir', 'Sulfir', '0776893c6b8c4c2d96e5a21a62e62b72'),
  ('TheeGuy101', 'theeguy101', '81e10433459d4b28bb7c79e51a7c29ad'),
  ('TitoThePuggo', 'TitoThePuggo', 'b85c900728c84d8dad7232ad0343e583'),
  ('Vx3sty', 'Vx3sty', '6b47f2371a384e4a83cd6826edd49c0e');

INSERT INTO account_fix (asked, canonical, uuid) VALUES
  ('Z3_yn', 'Z3_yn', '61e7afc1aafd4924af396a824845c6ac'),
  ('azw8', 'azw8', '1eaef5cd0dc14634a9123b1c3cdf158e'),
  ('balay_', 'balay_', '0cc1d614f6d54041b9a7c9ff6b1310df'),
  ('chardavius', 'Chardavius', '6796339ee2654f3598f81fd77273326b'),
  ('clashmyhouse', 'clashmyhouse', 'b6678ac912504ed7ac09b0c37c831744'),
  ('coolturt', 'CoolTurt', '4c953510e0664c6196656593ef78337e'),
  ('dogjoe', 'dogjoe', 'a89307347e574adf88b0880df2612765'),
  ('fnto', 'fnto', '671d26fcf2854fa0a74ce742627eba1e'),
  ('gavir8', 'gavir8', '3163ed4394a043219173693c202a534b'),
  ('gmzm', 'GMZM', '14975758a04545dfae348e501b62f7bf'),
  ('goonermench', 'Goonermench', '6f3021788ded4219abbc6693e1ee9a67'),
  ('heartwarrior64', 'Heartwarrior64', '2c91e7d59ae34d4598b0ec612a08a546'),
  ('jawaq', 'Jawaq', '86e5827df9f64f009defff7f90ce6b4f'),
  ('jrk42600', 'jrk42600', '7a25682b35dc4512825671740d445cfb'),
  ('justAMarshmellow', 'JustAMarshmellow', '7c09f9e197dd43c4a2759cbeaec3c8b9'),
  ('lVvYaelvVl', 'lVvYaelvVl', '76f525b2b18c476faddf17a0c61868bf'),
  ('meek0o', 'meek0o', '08851d7d31bc4425b5730f9ed8bbff6d');

-- Four more named by the league's owner. Mojang has no account under the old
-- name because each of these men renamed; the owner knows them by sight, and
-- the new names resolve.
INSERT INTO account_fix (asked, canonical, uuid) VALUES
  ('21Korean', '21asteriix', 'fe81992a64c341118c47984bb2a8a932'),
  ('Bestinyourmomass', 'charlielikesboys', '91c33cdece04476a823ffb6b03853f6f'),
  ('BITEKI_2', 'Juan_f_ing_soto', 'cb8a80c0957e445fbaf4f768728984d7'),
  ('bK2Tuff', 'th3realbk', '7373e7703dad4aa9b95388faae215a90');

-- The archive first, onto Mojang's own spelling.
UPDATE historical_player_stats
SET player_name = (SELECT canonical FROM account_fix WHERE asked = historical_player_stats.player_name)
WHERE player_name IN (SELECT asked FROM account_fix WHERE asked <> canonical);

UPDATE historical_game_stats
SET player_name = (SELECT canonical FROM account_fix WHERE asked = historical_game_stats.player_name)
WHERE player_name IN (SELECT asked FROM account_fix WHERE asked <> canonical);

UPDATE historical_roster_entries
SET player_name = (SELECT canonical FROM account_fix WHERE asked = historical_roster_entries.player_name)
WHERE player_name IN (SELECT asked FROM account_fix WHERE asked <> canonical);

UPDATE players
SET display_name = (SELECT canonical FROM account_fix WHERE asked = players.display_name),
    minecraft_username = (SELECT canonical FROM account_fix WHERE asked = players.display_name)
WHERE display_name IN (SELECT asked FROM account_fix WHERE asked <> canonical);

-- Then the accounts themselves. Guarded on the uuid as well as the name: an
-- account already on file under this spelling needs nothing, and a second row
-- for one account is what the rename path refuses for everybody else.
INSERT INTO minecraft_profiles (player_name, uuid, current_name, source)
SELECT f.canonical, f.uuid, f.canonical, 'mojang'
FROM account_fix f
WHERE NOT EXISTS (SELECT 1 FROM minecraft_profiles m WHERE m.player_name = f.canonical)
  AND NOT EXISTS (SELECT 1 FROM minecraft_profiles m WHERE m.uuid = f.uuid);

DROP TABLE account_fix;
