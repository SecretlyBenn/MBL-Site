-- Every name in the archive becomes the account's current Minecraft name.
--
-- Until now the stat tables kept the name a player used at the time, on the
-- grounds that it is what the box scores and the season's own screenshots
-- say. The league's owner has reversed that: a player is to appear under the
-- name they go by today, everywhere, however long ago the season was.
--
-- The practical reason is that the old rule was not actually being kept. The
-- archive is keyed by name, so a player who renamed was already split in two -
-- his old seasons under one name, his recent games under another, neither
-- page showing the whole career, and often one of the two with no head
-- because only one name carried the account. Reading a 2024 box score under a
-- 2026 name is a smaller surprise than a career cut in half.
--
-- 349 names move here. Each target is the current_name on the player's own
-- profile row, so the account - and therefore the head - is unchanged; only
-- the string moves. Every pair is listed in full below, which is also what
-- makes this reversible: read the columns the other way round.
--
-- Four accounts are deliberately left alone, because for them this is not a
-- rename but a merge that has to add two stat lines together:
--   bengi20 + curryteehee       (MBL Season VIII, Desert Valley Villagers)
--   amarri623 + sickomode_1     (MCBA Season X, Hitmen)
--   cali_alex23 + jdmalex_21    (MCBA Season X Pre-season, Ducks)
--   Razaraces + TerminalTurbo   (MCBA Season X Pre-season, Emeralds)
-- Each of those four has both names on one club in one season, so collapsing
-- them would leave two lines for one man where the archive has never had any.
-- Adding the counting stats and recomputing the rates is a separate decision
-- and a separate migration.
--
-- The pairs are inserted fifty at a time. One statement carrying all 349
-- was rejected by D1 outright, taking the whole file down with it.
--
-- This file was applied a statement at a time rather than in one go: D1
-- answers {"D1_RESET_DO":true} and rolls the whole thing back when the
-- updates below are sent together, which is a size limit on the transaction
-- rather than anything wrong with the SQL. Each statement on its own is fine.
--
-- Four more names are held back from the live roster and the profile table,
-- though their archive rows do move. Each is a second ACTIVE players row for
-- somebody already on the site under their current name, so renaming them
-- would collide with the unique index on players.minecraft_username:
--   Dr_Lubos -> Dr_Tubby, dagoat695 -> CookieTheDavid,
--   Boss01213792 -> Boss0121, Itstacoman3068 -> ItislaTacoMan
-- Two live rows for one man is a roster question, not a spelling one, so they
-- keep their own profile row and their head until somebody decides which row
-- the club actually fields.

CREATE TABLE rename_map (old TEXT PRIMARY KEY, new TEXT NOT NULL);

INSERT INTO rename_map (old, new) VALUES
  ('.log_dawg', 'logdadawg'),
  ('1survivor', '1Survivor'),
  ('2link', '2Link'),
  ('43Clovs', '43clovs'),
  ('7Enjimin', 'oillennium'),
  ('80hds', '80HDS'),
  ('AFlyingSquirrel17', 'AFlyingSquirrel7'),
  ('AMemory', 'aMemory'),
  ('AarBear426', 'AarBear_'),
  ('Aarontheyou', 'J1yx'),
  ('Abl', 'abl'),
  ('AbusiveStepdad66', 'LostAzy'),
  ('Acecraven', 'treechopper4L'),
  ('Akua Clutch', 'AkuaCIutch'),
  ('Albusprime', 'AlbusPrime'),
  ('Andbee2', 'andbeee'),
  ('Avrixityyy', 'AWPennheimer'),
  ('Axman3473', 'quelldiver'),
  ('AxresBad', 'Aquaz_7'),
  ('B0TZ', 'B0Tz'),
  ('BCleary29', 'BraydenDaBoi'),
  ('BU5H1DO', 'BU5H1D0'),
  ('Bagel', 'bagel'),
  ('BigBoiBetter', 'BigboiBetter'),
  ('Bigchungus_5780', 'George_Fent69'),
  ('Binbit', 'binbit'),
  ('Birdy_312', 'Birdyw'),
  ('Biscuitok', 'biscuitok'),
  ('Blaze Ruth', 'BlazingBeez'),
  ('Boo_ka', 'JesusVlx'),
  ('Boss01213792', 'Boss0121'),
  ('BowloCranberies', 'Bowlocranberries'),
  ('Bubbagushroom', 'Bubbatronnnn'),
  ('Buhg', 'buhg'),
  ('Bzfire12345', 'BZfire1234'),
  ('CAVALAND', 'CAVALANDx'),
  ('CEOToasty', 'CeoToasty'),
  ('Cameron269', 'cameron269'),
  ('Cardsfan1982', 'CardsFan1982'),
  ('CatahoulaDF', 'TisCata'),
  ('CeeDeeLambs88', 'SigmaGoon_18_'),
  ('Centex64', 'Centex_'),
  ('Cetreny', 'Illimatic'),
  ('Ch4rl._.', 'Ch4rl'),
  ('Cheesepa', 'CheesePa'),
  ('Cheney', 'cheney'),
  ('ChickenGodPlays', 'JahremScahrem'),
  ('Chu89', 'Chu90'),
  ('Clouddedddd', 'Styxxr'),
  ('Clout', 'clout');

INSERT INTO rename_map (old, new) VALUES
  ('Codekid24', 'Colioco'),
  ('Colyndumbguy', 'CDG18'),
  ('ConanGrayLvr', 'Magz10'),
  ('CookieD', 'Cookied'),
  ('Cosmicbread', 'CosmicBread'),
  ('Cowboy TIm', 'Cowboy_Tim'),
  ('CreteMa07', 'CreteMA07'),
  ('Ctb_Hat', 'ctb_hat'),
  ('Cyp3x', 'Cyp3X'),
  ('D3V11N', 'MINK3Y'),
  ('DJCANDY', 'djcandy'),
  ('DKReverse', 'SkillsTaylor'),
  ('DadTouchedMe', 'Big_Rilla'),
  ('DarkDrippzy', 'DarkDrippzy77'),
  ('DarkLynx17', 'OogwayJr1'),
  ('Darkrex743661', 'jefffthememe4380'),
  ('DavurdLK_F', 'Davurd'),
  ('DeadRr', 'deadrr'),
  ('DeionBranch', 'Eclipae'),
  ('Detfoul', 'detfoul'),
  ('Disgoof', 'JrGoof'),
  ('DitoIV', 'Vanonut'),
  ('DrDoordash', 'Mon_key'),
  ('Dr_Lubos', 'Dr_Tubby'),
  ('Dr_panda88', 'CortexSwiftnbm'),
  ('Dylon_69', 'Wendys4for4Fan'),
  ('EnTse0629', 'EnZO_629'),
  ('Falconsnake', 'falconsnake'),
  ('Falgaze', 'falgaze'),
  ('FlamingoBotz', 'evilbiscuitok'),
  ('FlurryLoveTacos', 'FlurryEatsObey'),
  ('Fredrickkk', 'FredIsLurking'),
  ('Fuji_wuji__', 'Xeinym'),
  ('GALAXYGAS', 'GalaxyGas'),
  ('GATOS', 'Gatos'),
  ('Gabrielh0319', 'gabrielh0319'),
  ('GamerGeek', 'gamergeek'),
  ('Gamer_wy', 'gamerwy'),
  ('Gavino007', 'Gavo007'),
  ('Gilles', 'gilles'),
  ('Glacciers', 'glacierss'),
  ('Hat_Crab', 'Oldman_Chilly'),
  ('Hexic1199', 'Hexic'),
  ('High_Ay_Non', 'TheOnlyCoco_'),
  ('INoUhGuy', '_TheNoah_'),
  ('IcedNerd', 'IcedBurg'),
  ('Iloveuihateu._.', 'D1ngD0ng_'),
  ('ItsCrew', 'ItsCreW'),
  ('Its_Iron', 'irxnn'),
  ('Itstacoman3068', 'ItislaTacoMan');

INSERT INTO rename_map (old, new) VALUES
  ('ItzCombo', 'ITzCombo'),
  ('ItzGrey1299', 'greydid'),
  ('JRed14', 'Jred14'),
  ('JTGstitch', 'Jtgstitch'),
  ('Jack_Otaku', 'Wizard101Forums'),
  ('Jackers', 'jackers'),
  ('Jakeowskii', 'Jakeowskiii'),
  ('Joshygg', 'joshygg'),
  ('Jsleezy240', 'Jsleezey240'),
  ('Judjy', 'YkLight'),
  ('Kaos', 'KAOS'),
  ('KexKK76', 'KexKK'),
  ('Kiddo6589', 'Brick_09'),
  ('Kingtacoo', 'KingTacoo'),
  ('Kixerly', 'Kixelry'),
  ('LLilMallow', 'iAmJamison'),
  ('Labia_Mojora', 'Wolvziegg'),
  ('Lach', 'ManLover18'),
  ('Lentwanehallis', 'Lentwanehallis18'),
  ('LittleTuna05', 'th3realbk'),
  ('Llamalty', 'llamalty'),
  ('Loaf Of Bricks', 'LoafOfBricks'),
  ('Lockej', 'LockeJ'),
  ('LogicNoKnowledge', 'logicnoknowledge'),
  ('LogikzGG', 'slayraholic'),
  ('Lucien_veil', 'Lucien_Veil'),
  ('Manymans', 'manymans'),
  ('Matatouille', 'matatouille'),
  ('MattanB', 'DeanKreamer'),
  ('Mayonaise43', 'Mayonnaise43'),
  ('Mayonnaise #420', 'Mayonnaise43'),
  ('McWatch', 'MCwatch'),
  ('Meinnz', 'meinnz'),
  ('Metzaddict', 'metzaddict'),
  ('MightyQ', 'mightyQ'),
  ('Mintbot', 'mintbot'),
  ('MintedGoji', 'qhoan'),
  ('Mockarano', 'Mockar'),
  ('Monkeees', 'toumeiB'),
  ('MonkeyMan9813', 'MonkeyMan3423'),
  ('Mosh_E', 'gascan_'),
  ('Nedd', 'nedd'),
  ('Noipdomainlookup', 'noipdomainlookup'),
  ('NotKelps', 'MajesticLeek'),
  ('Not_flooper', 'Not_Flooper'),
  ('Nxck111', 'pichipoh'),
  ('OptionalLabor', 'OptionalLabour'),
  ('PaintsMc', 'Mess1Bal1z'),
  ('Pancake_Dough14', 'PancakeDough'),
  ('Peelieboi', 'peelieboii');

INSERT INTO rename_map (old, new) VALUES
  ('Perno_', 'camperno'),
  ('Petro131', 'TickleTips10'),
  ('Phosphane', 'phosphane'),
  ('Pichipah', 'pichipah'),
  ('Providedewe2606', 'sp1dr__'),
  ('PupGamin', 'PupVibin'),
  ('Pureleqf', 'Pureleqf_'),
  ('Purpeyy', '_Purp__'),
  ('Quadfecta', 'quadfecta'),
  ('R2_D2Drone', 'R2_d2__'),
  ('REALAWESOMEDUD66', 'Awesomedude66'),
  ('RED_AidenK', 'DrJuco'),
  ('RadiantPup52227', 'Runaaa46'),
  ('RageDiego', 'tmg_fehdural'),
  ('Raggyyyy', 'raggyyyy'),
  ('Raid007', 'OrnooTT_'),
  ('Raided1234', 'Ra1ded'),
  ('Rebusher', 'rebusher'),
  ('Rylee', 'rylee'),
  ('Rymy07', 'RyMy07'),
  ('SG_Skies', 'Koolaid_Jamma55'),
  ('STYX_CF', 'StyxFPS'),
  ('SUPERS0NIC38', 'Valroll'),
  ('Saintzdid', 'saintzdid'),
  ('Schwarz_Official', 'SchwarzYT'),
  ('Scruffy004', 'scruffy004'),
  ('Scy', 'scy'),
  ('SeekerHAP', 'seekerHAP'),
  ('SeniorSanches', 'CapituTheCreator'),
  ('SharkBite700', 'Sharkbite700'),
  ('ShasNuts', 'shas111'),
  ('ShoulderXD', 'shoulderxd'),
  ('Skelton106', 'skelton106'),
  ('Skerpen', 'WakingTheFallenn'),
  ('SnakeJay', 'Snakejay'),
  ('Snowing420', 'snowing420'),
  ('SoCalBombs', 'PenarButter'),
  ('Spaghet_master', 'spaghet_master'),
  ('Spector (Juju)', 'lilbabygirl20'),
  ('Spidergamer536', 'Spidergamer_536'),
  ('StimpyOwnsAll', 'victorisreal'),
  ('SulphuricPotatoe', 'CaptainPotatoe'),
  ('Supercoolbaseballplayr', 'SuperCoolBBplaya'),
  ('SwaggyBuff', 'gayln'),
  ('Sy4rgaze', 'StargazeVT'),
  ('TPl0t', 'TPlot22'),
  ('TeaZxr', 'TeazerIsHim'),
  ('TeamminNoodle', 'TeaminNoodle'),
  ('Thatoneguy21', 'ThatOneGuy21'),
  ('TheBestSpino', '_R3DAK');

INSERT INTO rename_map (old, new) VALUES
  ('TheBreezeMan69', 'TheLarpMan69'),
  ('TheDimeBoss', 'alxsndro'),
  ('TheLqnd', 'Lpnd'),
  ('ThebigGeorgistic', 'TheBigGeorgistic'),
  ('Theduck9135', 'theduck9135'),
  ('Tilqz', 'Abracitos69'),
  ('Timbr_', 'timbr_'),
  ('Tino_ur_Barber', 'Romans_8_14'),
  ('Tintedheavesptfy', 'TintedheaveSptfy'),
  ('Toastedsanwich', 'Toastedsaminch'),
  ('Tomisafrog', 'tomisafrog'),
  ('Tr3voo', 'tr3voo'),
  ('Trexey', 'TRexEY'),
  ('UncleB00BS69', 'Uncle8008s95'),
  ('V0iderz', 'femmyxyro'),
  ('VL1nck', 'Ninjagooj'),
  ('VrxMC', 'LogansMC'),
  ('WCSC_', 'JustABlindGamer'),
  ('WaleTheSage', 'fxwx'),
  ('Warrior_Monkey', 'Monjayjet'),
  ('Wild', 'wild'),
  ('Winkydinks', 'winkydinks'),
  ('Wqnw', 'wqnw'),
  ('XR1ng0X', 'xR1NG0x'),
  ('Xplosiv', 'xplosiv'),
  ('Yaboi43', 'CHICKENDUDE435'),
  ('Yamainman', 'YAMAINMAN'),
  ('YankeWitBrim', 'Vizamu'),
  ('YzGigny17', 'YzGingy'),
  ('Z1_juju', 'lilbabygirl20'),
  ('ZeqroTho', 'LargePoops'),
  ('ZombieMagikarp_1', 'ZombieMagikarp'),
  ('_125__', '_125'),
  ('_ChiZm_', 'Chizm'),
  ('_Gbot', '_GBot'),
  ('_Guff', 'Dereksmfo'),
  ('_Junex_', 'WillTheTruck'),
  ('_Kriptiv_', 'ELberak'),
  ('_Wolfs_', 'Oguri_Fat'),
  ('__R0gue__', 'R0gueMC'),
  ('_purp__', '_Purp__'),
  ('abstract', 'Abstract'),
  ('andretheoddeer', 'ozzyoddeer'),
  ('angrygingerboi', 'AngryGingerBoi'),
  ('aquamarine', 'Aquamarine'),
  ('ardenb', 'ArdenB'),
  ('axlr1', 'TheBigCheeserrr'),
  ('blacklma0', 'wapw_'),
  ('bobbybrennan', 'VTC_bobbybrennan'),
  ('botia', 'Botia');

INSERT INTO rename_map (old, new) VALUES
  ('botuah', 'akvmi'),
  ('brookszn', 'Brookzn'),
  ('bweezyz', 'breezydiddy'),
  ('c0nl', 'C0NL'),
  ('camzorddragon', 'Camzorddragon'),
  ('cookiemnstr1', 'CookieMNSTR1'),
  ('corchgartbricked', 'BaltimoreBrownie'),
  ('couldneverbelight', 'YkLight'),
  ('cranxplays', 'KingCrype'),
  ('crumb_cuptoast', 'rocket___raccoon'),
  ('dababynocapreal', 'taco_eater16'),
  ('dagoat695', 'CookieTheDavid'),
  ('dexojr', 'Dexojr'),
  ('doge871', 'Doge871'),
  ('donutslayer49', 'DonutSlayer49'),
  ('dragonballz', 'DragonBallZ'),
  ('dyn0btw_', 'DyN0Btw_'),
  ('eexabytee', 'ayyexabyte'),
  ('f_dwz', 'ffdwz'),
  ('fakeMrFlimFlam', 'FakeMrFlimFlam'),
  ('fluff3885', 'Fluff_Official'),
  ('frown67', 'chiefsosaking'),
  ('gLoOmGaMes', 'gLo0mGaMeS'),
  ('generickduck_', 'genericduck_'),
  ('goat1ye', 'goatye_'),
  ('goldenhunter86', 'frumpybear'),
  ('gszirco', 'xQualified8837'),
  ('gunnarsser', 'Gunnarsser'),
  ('iLonni', 'Cuddl_'),
  ('iko_032', 'whitewonders_'),
  ('itwascuban', 'mishkafart'),
  ('j4yd3nnnnn', 'J4yd3nn_'),
  ('jacobspeed5161', 'JacobSpeed5161'),
  ('jag5280', 'Jagg5280'),
  ('jawaq', 'Jawaq'),
  ('jerryandjerry', 'Jazztar'),
  ('johnaldooo', 'Johnaldooo'),
  ('johngray38', 'V2XOTTIC'),
  ('johnnytheching', 'empluzedflamingo'),
  ('jollybrained', 'rabbitbrained'),
  ('jorzky', 'Jorzk'),
  ('jujudigga', 'JujuOwO'),
  ('kick', 'Kick'),
  ('knon_0', 'Konny85'),
  ('kykybubba', 'KyKyBubba'),
  ('lefruitloops', 'LeFruitloops'),
  ('lilscotty213', 'lilscotty_'),
  ('lmonkel', 'lMonkel'),
  ('mistii69', 'Mistii69'),
  ('mourningstvr', 'amourningstar');

INSERT INTO rename_map (old, new) VALUES
  ('mrravenman', 'Dresuss'),
  ('ohLacina', 'LacinaMessiah'),
  ('onetflix', 'oNetflix'),
  ('ozz2', 'Ozzxd'),
  ('p5ychOfficial', 'p5ychofficial'),
  ('peng2k', 'Haimiyaholic'),
  ('peter_devil', 'Peter_Devil'),
  ('pikachachi', 'Pikachachi'),
  ('plurpld', 'PlurplDurpl'),
  ('pre_TT', '67_1'),
  ('prodigy', 'Prodigy'),
  ('pugglesthefirst', 'SenpaiPug'),
  ('rageboyle', '44RageNaoto'),
  ('ralsei_', 'Ralsei_'),
  ('raxxy', 'Raxxy'),
  ('rileyxdpc', 'kebbysauce'),
  ('rjs', 'Rjs'),
  ('rqmani', 'birdbrainaholic'),
  ('ryxzez', 'r_xxy'),
  ('s0meguynamedjoe', 'someguynamedjoe'),
  ('s_c_a_re_c_r_o_w', '_sc4recr0w_'),
  ('senturi', 'rafisgone'),
  ('skittle', 'Skittle'),
  ('smallman', 'SmallMan'),
  ('spoopsmcgee', 'SpoopsMcGee'),
  ('sppydaa', 'spyda4'),
  ('squeeeeeee', 'Squeeeeeee'),
  ('squidsseesghosts', 'SquidsSeeGhosts'),
  ('stinkyboi', 'STINKYBOI'),
  ('stixx', 'STiXX'),
  ('stratty.is.rusty', 'Stratty'),
  ('supadubs', 'SupaDubs'),
  ('syrbia', 'Syrbia'),
  ('szixy', 'Dirtcrack'),
  ('t7lrrx', 'Its_Sleepixz'),
  ('tetolover06', 'tetolover'),
  ('theunabomber', 'TheUnabomber'),
  ('tyrone_poo_bear', 'theyluvtyrone'),
  ('uhvincent69420', 'itz_vinnie'),
  ('ulvu', 'Ulvu'),
  ('uwoy', 'imacatboybtw'),
  ('vvpasty', 'pastydrake'),
  ('woodywagner', 'woodywaggnoer'),
  ('woofPotato', 'woffleFreyes'),
  ('wwets', 'WWETS'),
  ('xTyBoogieX', 'xTyBoogiex'),
  ('yeetswerret1216', 'yeetsewerret1216'),
  ('yexokk', 'Yexokk'),
  ('zaaa', 'Zaaa');

-- The three archive tables keyed by name, then the live roster. A live
-- player's Minecraft username travels with their display name: they are the
-- same string for every player here, and letting them drift apart is what a
-- rename is meant to prevent.
UPDATE historical_player_stats
SET player_name = (SELECT new FROM rename_map WHERE old = historical_player_stats.player_name)
WHERE player_name IN (SELECT old FROM rename_map);

UPDATE historical_game_stats
SET player_name = (SELECT new FROM rename_map WHERE old = historical_game_stats.player_name)
WHERE player_name IN (SELECT old FROM rename_map);

UPDATE historical_roster_entries
SET player_name = (SELECT new FROM rename_map WHERE old = historical_roster_entries.player_name)
WHERE player_name IN (SELECT old FROM rename_map);

UPDATE players
SET display_name = (SELECT new FROM rename_map WHERE old = players.display_name),
    minecraft_username = (SELECT new FROM rename_map WHERE old = players.display_name)
WHERE display_name IN (SELECT old FROM rename_map)
  AND display_name NOT IN ('Dr_Lubos', 'dagoat695', 'Boss01213792', 'Itstacoman3068');

-- One profile row per account. Where two site names pointed at one account,
-- both rows already carried the same uuid and the same current_name, so the
-- duplicate carries no information the survivor lacks.
CREATE TABLE profile_keep (keeper TEXT PRIMARY KEY);

INSERT INTO profile_keep (keeper)
SELECT MIN(p.player_name)
FROM minecraft_profiles p
JOIN rename_map r ON r.old = p.player_name
WHERE r.old NOT IN ('Dr_Lubos', 'dagoat695', 'Boss01213792', 'Itstacoman3068')
  AND NOT EXISTS (SELECT 1 FROM minecraft_profiles t WHERE t.player_name = r.new)
GROUP BY r.new;

DELETE FROM minecraft_profiles
WHERE player_name IN (SELECT old FROM rename_map WHERE old NOT IN ('Dr_Lubos', 'dagoat695', 'Boss01213792', 'Itstacoman3068'))
  AND player_name NOT IN (SELECT keeper FROM profile_keep);

UPDATE minecraft_profiles
SET player_name = (SELECT new FROM rename_map WHERE old = minecraft_profiles.player_name)
WHERE player_name IN (SELECT old FROM rename_map WHERE old NOT IN ('Dr_Lubos', 'dagoat695', 'Boss01213792', 'Itstacoman3068'));

DROP TABLE profile_keep;

-- Two names collapsing into one can leave a club's roster listing the same man
-- twice. Neither table had a single duplicate before this ran, so this removes
-- only what the collapse created.
DELETE FROM historical_roster_entries
WHERE id IN (
  SELECT e.id FROM historical_roster_entries e
  JOIN historical_roster_entries k
    ON k.season_id = e.season_id
   AND k.historical_team_id = e.historical_team_id
   AND k.player_name = e.player_name
   AND k.id < e.id
);

DROP TABLE rename_map;
