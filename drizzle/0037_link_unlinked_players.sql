-- Links every name on the site that had no Minecraft account to the account
-- using that name today, so their heads show.
--
-- Looked up against Mojang on 2026-09-14. 71 of the 120 unlinked names belong
-- to an account right now. The other 39 are not used by anyone, and
-- 10 (such as "carlos correa") can't be Minecraft names at all; those stay
-- blank until an admin links them under Admin -> Players -> Link account.
--
-- A name only identifies whoever holds it today, so a player who renamed and
-- gave up an old name could show a stranger's head. Every name that last
-- played before Season XI came back unused, which suggests few if any of these
-- are strangers, but the same form fixes any that are.
--
-- ON CONFLICT leaves alone any name an admin linked while this was prepared.

INSERT INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('Aerovik', '1705b6378e0b48438b0ad591ca41fd11', 'Aerovik', 'mojang'),
  ('B0TZ_', 'cde84237fb0b4225a27b2c0e3c3f7915', 'B0TZ_', 'mojang'),
  ('BagelEaterXD', '42cb087332754ead8a798b954f0d4461', 'BagelEaterXD', 'mojang'),
  ('bayblade11', 'cb7b549e2af9499e839033b0cbfb3093', 'bayblade11', 'mojang'),
  ('Bertosis', '8449fcb839914c84802e563c3d494ac2', 'Bertosis', 'mojang'),
  ('BlazingBeez', '1bd86950c7af48e7a2ec96ce9b82bf58', 'BlazingBeez', 'mojang'),
  ('CarrotGodJeff', '199b712a07f8411293f2e440c0777fd3', 'CarrotGodJeff', 'mojang'),
  ('Chxxtah', '05084b47af014e8099726caa9a6635b2', 'Chxxtah', 'mojang'),
  ('Coolantgames', '0dcfed05a9434e3d9d3d00903e3f3b66', 'Coolantgames', 'mojang'),
  ('CoolBlastr', 'f3399416bf1a4f87a248adad33aa466f', 'CoolBlastr', 'mojang'),
  ('CovetingBat2', 'b471767f2f4541d48a70811eedbfe715', 'CovetingBat2', 'mojang'),
  ('Cxzlin', '0ad44a5dd1174ce1931bfc2fe8c99200', 'Cxzlin', 'mojang'),
  ('DaMineyCraftKen', '97c981802faa466ba332b05f6250de28', 'DaMineyCraftKen', 'mojang'),
  ('DevontaSmith', '63fd04ddc17a4ac1a4e102bb3fd798ec', 'DevontaSmith', 'mojang'),
  ('DevvyVR', '022db8affe3948e5bb3fff27eaf04d95', 'DevvyVR', 'mojang'),
  ('Dmoneyyy_', 'b624f0a7acb94372a4e51d8238d404de', 'Dmoneyyy_', 'mojang'),
  ('DMSAgent', '2c87b588f0da49208a0e19448dea2876', 'DMSAgent', 'mojang'),
  ('dr1pkid', '7b5f2cbe90fb4a5d9250cfe9575f8d0d', 'dr1pkid', 'mojang'),
  ('Drxpski', 'e33836bf720449509af636834993b173', 'Drxpski', 'mojang'),
  ('Elle224', '71a2fb568abd48e989b1d1b3d26008b6', 'Elle224', 'mojang'),
  ('flaganoid', 'c0983be308dd445ba3ea91852dbcc9f1', 'flaganoid', 'mojang'),
  ('Frame_76', 'c05d25153e3147b0bcd96d134b9aa875', 'Frame_76', 'mojang'),
  ('Freezy310', '48d2819d8fab4694bcf1fa80b1e292ca', 'Freezy310', 'mojang'),
  ('frown67', '41b95de16eb044af88428dc7524bd9ad', 'frown67', 'mojang'),
  ('gabrielh0319', '469d16d70e4b48c78768d26281f051a1', 'gabrielh0319', 'mojang'),
  ('Grimace245', 'a9c138d5904a4ab1bb3d01026eb7eca7', 'Grimace245', 'mojang'),
  ('Gunnarsser', '68150815348e4414893f275f87ae21fa', 'Gunnarsser', 'mojang'),
  ('happyzombie245', '7fefd5c74efc4b81b9375b016cac54ca', 'happyzombie245', 'mojang'),
  ('Hioplo', 'd4143cdb0c1a44bf84b0f8a71e655480', 'Hioplo', 'mojang'),
  ('Icespillermc', 'a224cd107cf64795a9330018d7f4032a', 'Icespillermc', 'mojang'),
  ('ilyizo', '03023bc1c26c4eea949ff0bfdd45fbe2', 'ilyizo', 'mojang'),
  ('Innerca1', '4c827ed51278472e88f04bfcfa059012', 'Innerca1', 'mojang'),
  ('its_Kly', 'a8155e4730dd4b4ab81445105f7513b8', 'its_Kly', 'mojang'),
  ('JacksterMaster', 'b90910478a7e4759bd22872da209f6a7', 'JacksterMaster', 'mojang'),
  ('JoDogg', 'f5ee5033e9304555be9f2496e097e24f', 'JoDogg', 'mojang'),
  ('jupiteronacid', 'd09550c2eda646e38baaac472c59a59d', 'jupiteronacid', 'mojang'),
  ('KexKK', '6564f02763ed4497bf8e77c63557396a', 'KexKK', 'mojang'),
  ('KingdraKing', '38d67ece49334ffd9453ef2bb9ed89ed', 'KingdraKing', 'mojang'),
  ('Kofeyy', 'f28895eefce345c09500f90affeb6fda', 'Kofeyy', 'mojang'),
  ('LakotaEagle1', '6e382d4717cd4d04a69338c5454055ff', 'LakotaEagle1', 'mojang'),
  ('LightSkin_Cutie', '9a94c681b0474ff0b76c2604ae6fb15e', 'LightSkin_Cutie', 'mojang'),
  ('Lord_Mangos', '065abc5488474914b4bfb4f4191eefb9', 'Lord_Mangos', 'mojang'),
  ('LostPhire', 'a6e1b99f50834f47b239c44020c68d9e', 'LostPhire', 'mojang'),
  ('luxor1967', '5a513be069474650831e57aa02441433', 'luxor1967', 'mojang'),
  ('Mayonnaise', 'd8e1bf843ca046ec9f9819a96439d04a', 'Mayonnaise', 'mojang'),
  ('Negy123', '5b882346ab0c421284be59d3e83d1884', 'Negy123', 'mojang'),
  ('NeoRebels', '1cd032b3b07545e68c2d4c78eed11516', 'NeoRebels', 'mojang'),
  ('Not_MagicMichael', '1efbd3a9dc6444cc93e8ce4f7e9a25e2', 'Not_MagicMichael', 'mojang'),
  ('Ohword28', '8db6baa2b6c34ff0ba7a115ceb79e1dd', 'Ohword28', 'mojang'),
  ('ozz2', '9a547f83467549ddb0fa0d453f60918b', 'Ozz2', 'mojang'),
  ('pastydrake', '651d8db59ca348a98eb9e502d654e849', 'pastydrake', 'mojang'),
  ('pogJ', '93c836038b71427188178ffdc30f7dab', 'pogJ', 'mojang'),
  ('Postulates', '09eeb7d160b24b04831b3480f4b153de', 'Postulates', 'mojang'),
  ('PoxyHemorrhoid', 'ea89d0e4b4a0400cb5e63b5f95667f5c', 'PoxyHemorrhoid', 'mojang'),
  ('Raid007', 'c6aa96f721bd41f9afb32f673dee8249', 'Raid007', 'mojang'),
  ('raxxy', '1dfbc94df3474e3eb45ebf81fe641ae3', 'Raxxy', 'mojang'),
  ('S_lacked', '32a05922378a49c2bdfc5d2e61d1d32c', 'S_lacked', 'mojang'),
  ('Scp999v2', '911a856ba2dd43d5bc703d7b192453a6', 'Scp999v2', 'mojang'),
  ('Sky', '4f9a9d04f640423e80d187a40305a313', 'Sky', 'mojang'),
  ('Supernerdness', 'ca5fe7b8c0404fe1af432b548bd3f145', 'Supernerdness', 'mojang'),
  ('TeenNinja6', '5c34814f84f14214b3b520a25aacce15', 'TeenNinja6', 'mojang'),
  ('Temptazer', '2d41288fc93c4702a0c054105e8a847f', 'Temptazer', 'mojang'),
  ('TheLou2', 'b7959db49769413fa619d8fbe12c7738', 'TheLou2', 'mojang'),
  ('They_call_me_Em', 'a150682bbd5a40f19fb9e8387775f926', 'They_call_me_Em', 'mojang'),
  ('TomWilson__', '5226f7057a3a465fb18dbb0707e55ab3', 'TomWilson__', 'mojang'),
  ('Udafighter', 'af3a5e44ea1849f7b7e1727e4018299f', 'Udafighter', 'mojang'),
  ('WiiillG', 'd7ca03bdd4614fd5911e5548ff1a909b', 'WiiillG', 'mojang'),
  ('wopperwopper', '9d873adea3434d7591fbf6975781491b', 'wopperwopper', 'mojang'),
  ('xx6tttsahur7xx', '28761930366945e492c4218678ae61c3', 'xx6tttsahur7xx', 'mojang'),
  ('Z3roo', 'a2590c65abb941498c85afec37dd7001', 'Z3roo', 'mojang'),
  ('Zapain', '644ca2baa9634ea7bc54d5c71745d1d5', 'Zapain', 'mojang')
ON CONFLICT (player_name) DO NOTHING;
