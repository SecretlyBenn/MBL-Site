-- Heads for names whose account has since been renamed.
--
-- Mojang dropped the name-history API in 2022, so for each of these the site
-- name was looked up on NameMC, which records who held a name before it was
-- given up, and the account it named was then resolved back through Mojang.
-- The id is what the head is drawn from, so a later rename follows on its own.
--
-- Three accounts answer to two league names each - the same player under an
-- old and a new name. Both names are pointed at the one account here; whether
-- their records should also be merged is a question for the league:
--
--   Fluff_Official   porotalz, fluff3885
--   spyda4           sppydaa, Pillowdrip
--   pichipoh         Nxck111, sleepytemple

INSERT OR REPLACE INTO minecraft_profiles (player_name, uuid, current_name, source) VALUES
  ('johnnytheching', '7904a13c322348fd9bf956214041bc27', 'empluzedflamingo', 'namemc'),
  ('jollybrained', '3f4f38373cc041c69ac808e9b6e465b1', 'rabbitbrained', 'namemc'),
  ('V0iderz', '3bae4b57cca5443089e311c2200da4b8', 'femmyxyro', 'namemc'),
  ('pyvvon', 'f3dcfdad0d98415fbfb1b58a63cbf69a', 'vyvyn_', 'namemc'),
  ('porotalz', '48f38279eac34cdbbe5c617614859d25', 'Fluff_Official', 'namemc'),
  ('EnTse0629', '791507086e0347c9a578e2f6be933d7d', 'EnZO_629', 'namemc'),
  ('pugglesthefirst', '0255f3eef7f64bdf955c15796e6b81ad', 'SenpaiPug', 'namemc'),
  ('DeionBranch', '2b36817cea94483488a2db4bc08b25ce', 'Eclipae', 'namemc'),
  ('rageboyle', 'c7eb5ac457d845b8948382bf577e1401', '44RageNaoto', 'namemc'),
  ('MonkeyMan9813', '561401ad882b4dcbb4d646f0141715e8', 'MonkeyMan3423', 'namemc'),
  ('Tilqz', 'c8eec6cb0fba435fbb1e569f77896438', 'Abracitos69', 'namemc'),
  ('fluff3885', '48f38279eac34cdbbe5c617614859d25', 'Fluff_Official', 'namemc'),
  ('TheLqnd', '4d426f2a46564cc99fe5da33e61bc347', 'Lpnd', 'namemc'),
  ('SUPERS0NIC38', 'd91f438aa09c42659ca5fa5443b0a2bd', 'Valroll', 'namemc'),
  ('Nxck111', '77b29bb0c95945419cf669ccbe9b3dfd', 'pichipoh', 'namemc'),
  ('Codekid24', '7056ac59e4694aee969f2a120b3797ab', 'Colioco', 'namemc'),
  ('STYX_CF', '0164b4e4f8204affb3f88287e442da63', 'StyxFPS', 'namemc'),
  ('corchgartbricked', '441f9831f5d84ec6933e7bfbd83fac0b', 'BaltimoreBrownie', 'namemc'),
  ('RED_AidenK', '3d43255aa0504cf29d3656ed2f779920', 'DrJuco', 'namemc'),
  ('YankeWitBrim', '58117ce29cc8423cb3a9fde21512aeea', 'Vizamu', 'namemc'),
  ('ItzGrey1299', '724e633f0b3943e6a868a03a6fc2f0f1', 'greydid', 'namemc'),
  ('cranxplays', '2e62326c3a4a4b9cb2dda59108db7fe1', 'KingCrype', 'namemc'),
  ('barack_obomba20', 'a0055b2448fd475f948672ac125b59f6', 'zoomies100', 'namemc'),
  ('DarkLynx17', '694706f4d31c46999ae956432779e59f', 'OogwayJr1', 'namemc'),
  ('Dr_panda88', '270f579720ae44b19b309db883eef7f7', 'CortexSwiftnbm', 'namemc'),
  ('MattanB', '6615b81cf82541c29eabe00da2f356dc', 'DeanKreamer', 'namemc'),
  ('Bubbagushroom', 'f5d0355ebf4e47d3b98514a8e7d390cb', 'Bubbatronnnn', 'namemc'),
  ('eexabytee', 'e528a04147854be2b119decea74ab350', 'ayyexabyte', 'namemc'),
  ('TheBreezeMan69', '80a1d816289f499098d1bde410862df2', 'TheLarpMan69', 'namemc'),
  ('itwascuban', '581fadb5fe974032b951622dc8200752', 'mishkafart', 'namemc'),
  ('REALAWESOMEDUD66', 'c72771895731464a9103a9bb1df1833c', 'Awesomedude66', 'namemc'),
  ('D3V11N', 'f6f99919fa374cd7b392cef856cba93d', 'MINK3Y', 'namemc'),
  ('Avrixityyy', '2cd2e2e61fa84a3e8b5fce4d5ba47f2f', 'AWPennheimer', 'namemc'),
  ('NotKelps', '4fef2ee356c144528016131bd69ce7d7', 'MajesticLeek', 'namemc'),
  ('CTRL_Bizz', '4fd7ae36a5dd417b82136888d4e55728', 'ImYourBizz', 'namemc'),
  ('Monkeees', '69ed0e9f956d41ad83a62a5cf8e5dbb3', 'toumeiB', 'namemc'),
  ('WCSC_', '745015bcbd16468faa1528f6560e861c', 'JustABlindGamer', 'namemc'),
  ('_Kriptiv_', 'de21e67798e347579f3825c3a13d9317', 'ELberak', 'namemc'),
  ('sppydaa', '407a9c3e6f1c4356a139797e73d70b18', 'spyda4', 'namemc'),
  ('LittleTuna05', '7373e7703dad4aa9b95388faae215a90', 'th3realbk', 'namemc'),
  ('Bigchungus_5780', '3e7c5a1f940240c3834ff237969ef59c', 'George_Fent69', 'namemc'),
  ('ChickenGodPlays', '8041a9b4d063488f8080844010a33cc3', 'JahremScahrem', 'namemc'),
  ('mourningstvr', '418c4f8037cf4e349595f011b6f6c550', 'amourningstar', 'namemc'),
  ('t7lrrx', '2fb567f0246a4cefbf6da3f685edc333', 'Its_Sleepixz', 'namemc'),
  ('Andbee2', '66d6be85ca9b410aa98200188142be83', 'andbeee', 'namemc'),
  ('Boo_ka', '68abe17294ee45f88ca592285010954a', 'JesusVlx', 'namemc'),
  ('Jesusma14', '7a0b6cba820e45c3a542d7c0e9d0af61', 'Jesusma10s07', 'namemc'),
  ('Colyndumbguy', '53aae4a2b6c24fc88d6b6af5babbe59e', 'CDG18', 'namemc'),
  ('Judjy', 'e5ab5050da644e4f90fa69981b49fe1a', 'YkLight', 'namemc'),
  ('DavurdLK_F', '465ba301f04f443ba052c11a28a8924f', 'Davurd', 'namemc'),
  ('Landihlicious', '45cf409362d54f0995af6b33069f16aa', 'Landon_Senpai', 'namemc'),
  ('SeniorSanches', '4a8f76049dc54023b12e90c3d273dcdd', 'CapituTheCreator', 'namemc'),
  ('Pancake_Dough14', '5f538e6020684c17b86b46583a541894', 'PancakeDough', 'namemc'),
  ('Pillowdrip', '407a9c3e6f1c4356a139797e73d70b18', 'spyda4', 'namemc'),
  ('Kiddo6589', 'bca8d5cc076a4a7ea38fec4e4e1f6597', 'Brick_09', 'namemc'),
  ('jake2317', '2e40aea6b3cd45baa0c7537e5ddd83f0', 'Titansstorm1', 'namemc'),
  ('Skerpen', 'a22723d9b35541478a79ccad640708aa', 'WakingTheFallenn', 'namemc'),
  ('TPl0t', 'c0e2e51a23c647c4b1d404ac7575e10d', 'TPlot22', 'namemc'),
  ('TheBestSpino', '2f0748da128248b885edc6dcab8a7be2', '_R3DAK', 'namemc'),
  ('Yaboi43', '68735dee5b534879aa537ec3455c779a', 'CHICKENDUDE435', 'namemc'),
  ('pre_TT', '6745c00858dd4b6f8a7574fa2ee9d61a', '67_1', 'namemc'),
  ('thegamezer3442', 'c05d25153e3147b0bcd96d134b9aa875', 'Frame_76', 'namemc'),
  ('szixy', '3a5d13740cae415293106d0d09a07b0f', 'Dirtcrack', 'namemc'),
  ('sleepytemple', '77b29bb0c95945419cf669ccbe9b3dfd', 'pichipoh', 'namemc');
