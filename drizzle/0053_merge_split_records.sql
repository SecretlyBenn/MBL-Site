-- Nineteen players whose record was split across two names on the site.
--
-- Each pair is one Minecraft account: the head work linked both names to the
-- same id, which is how the split showed up at all. Within a league the two
-- names are one career, so they are joined under the name the player carried
-- last. Names that appear in both competitions are left apart, as before.
--
-- Every pair here was checked two ways before being merged: the two names
-- never hold a line for the same club-season, and they never appear in the
-- same game. Four pairs that do share a club-season are merged separately in
-- 0054, where their lines have to be added rather than renamed.

-- [mbl] BoBichettesChild -> FartFreak47
UPDATE historical_player_stats SET player_name = 'FartFreak47' WHERE player_name = 'BoBichettesChild';
UPDATE historical_game_stats SET player_name = 'FartFreak47' WHERE player_name = 'BoBichettesChild';
UPDATE historical_roster_entries SET player_name = 'FartFreak47' WHERE player_name = 'BoBichettesChild';

-- [mbl] SinKiraa_ -> goat1ye
UPDATE historical_player_stats SET player_name = 'goat1ye' WHERE player_name = 'SinKiraa_';
UPDATE historical_game_stats SET player_name = 'goat1ye' WHERE player_name = 'SinKiraa_';
UPDATE historical_roster_entries SET player_name = 'goat1ye' WHERE player_name = 'SinKiraa_';

-- [mbl] Wafazafa -> IHateKillza
UPDATE historical_player_stats SET player_name = 'IHateKillza' WHERE player_name = 'Wafazafa';
UPDATE historical_game_stats SET player_name = 'IHateKillza' WHERE player_name = 'Wafazafa';
UPDATE historical_roster_entries SET player_name = 'IHateKillza' WHERE player_name = 'Wafazafa';

-- [mbl] Sitonmenow -> iloveman
UPDATE historical_player_stats SET player_name = 'iloveman' WHERE player_name = 'Sitonmenow';
UPDATE historical_game_stats SET player_name = 'iloveman' WHERE player_name = 'Sitonmenow';
UPDATE historical_roster_entries SET player_name = 'iloveman' WHERE player_name = 'Sitonmenow';

-- [mbl] ItsJanutary -> jerryandjerry
UPDATE historical_player_stats SET player_name = 'jerryandjerry' WHERE player_name = 'ItsJanutary';
UPDATE historical_game_stats SET player_name = 'jerryandjerry' WHERE player_name = 'ItsJanutary';
UPDATE historical_roster_entries SET player_name = 'jerryandjerry' WHERE player_name = 'ItsJanutary';

-- [mbl] TickleTips10, WxvyMc -> Petro131
UPDATE historical_player_stats SET player_name = 'Petro131' WHERE player_name = 'TickleTips10';
UPDATE historical_game_stats SET player_name = 'Petro131' WHERE player_name = 'TickleTips10';
UPDATE historical_roster_entries SET player_name = 'Petro131' WHERE player_name = 'TickleTips10';
UPDATE historical_player_stats SET player_name = 'Petro131' WHERE player_name = 'WxvyMc';
UPDATE historical_game_stats SET player_name = 'Petro131' WHERE player_name = 'WxvyMc';
UPDATE historical_roster_entries SET player_name = 'Petro131' WHERE player_name = 'WxvyMc';

-- [mbl] Vibepug -> Pug63
UPDATE historical_player_stats SET player_name = 'Pug63' WHERE player_name = 'Vibepug';
UPDATE historical_game_stats SET player_name = 'Pug63' WHERE player_name = 'Vibepug';
UPDATE historical_roster_entries SET player_name = 'Pug63' WHERE player_name = 'Vibepug';

-- [mbl] TTV_ValorTGM -> TheCracka1
UPDATE historical_player_stats SET player_name = 'TheCracka1' WHERE player_name = 'TTV_ValorTGM';
UPDATE historical_game_stats SET player_name = 'TheCracka1' WHERE player_name = 'TTV_ValorTGM';
UPDATE historical_roster_entries SET player_name = 'TheCracka1' WHERE player_name = 'TTV_ValorTGM';

-- [mbl] FrecklinFreckles -> uwoy
UPDATE historical_player_stats SET player_name = 'uwoy' WHERE player_name = 'FrecklinFreckles';
UPDATE historical_game_stats SET player_name = 'uwoy' WHERE player_name = 'FrecklinFreckles';
UPDATE historical_roster_entries SET player_name = 'uwoy' WHERE player_name = 'FrecklinFreckles';

-- [mcba] heatedbeast135 -> bigmac1936
UPDATE historical_player_stats SET player_name = 'bigmac1936' WHERE player_name = 'heatedbeast135';
UPDATE historical_game_stats SET player_name = 'bigmac1936' WHERE player_name = 'heatedbeast135';
UPDATE historical_roster_entries SET player_name = 'bigmac1936' WHERE player_name = 'heatedbeast135';

-- [mcba] thegamezer3442 -> Frame_76
UPDATE historical_player_stats SET player_name = 'Frame_76' WHERE player_name = 'thegamezer3442';
UPDATE historical_game_stats SET player_name = 'Frame_76' WHERE player_name = 'thegamezer3442';
UPDATE historical_roster_entries SET player_name = 'Frame_76' WHERE player_name = 'thegamezer3442';

-- [mcba] IBigBuffMan -> IBigBuffMan678
UPDATE historical_player_stats SET player_name = 'IBigBuffMan678' WHERE player_name = 'IBigBuffMan';
UPDATE historical_game_stats SET player_name = 'IBigBuffMan678' WHERE player_name = 'IBigBuffMan';
UPDATE historical_roster_entries SET player_name = 'IBigBuffMan678' WHERE player_name = 'IBigBuffMan';

-- [mcba] CTRL_Bizz -> ImYourBizz
UPDATE historical_player_stats SET player_name = 'ImYourBizz' WHERE player_name = 'CTRL_Bizz';
UPDATE historical_game_stats SET player_name = 'ImYourBizz' WHERE player_name = 'CTRL_Bizz';
UPDATE historical_roster_entries SET player_name = 'ImYourBizz' WHERE player_name = 'CTRL_Bizz';

-- [mcba] Jesusma14 -> Jesusma10s07
UPDATE historical_player_stats SET player_name = 'Jesusma10s07' WHERE player_name = 'Jesusma14';
UPDATE historical_game_stats SET player_name = 'Jesusma10s07' WHERE player_name = 'Jesusma14';
UPDATE historical_roster_entries SET player_name = 'Jesusma10s07' WHERE player_name = 'Jesusma14';

-- [mcba] KillerMaxZombie -> Lucien_veil
UPDATE historical_player_stats SET player_name = 'Lucien_veil' WHERE player_name = 'KillerMaxZombie';
UPDATE historical_game_stats SET player_name = 'Lucien_veil' WHERE player_name = 'KillerMaxZombie';
UPDATE historical_roster_entries SET player_name = 'Lucien_veil' WHERE player_name = 'KillerMaxZombie';

-- [mcba] Dresuss -> mrravenman
UPDATE historical_player_stats SET player_name = 'mrravenman' WHERE player_name = 'Dresuss';
UPDATE historical_game_stats SET player_name = 'mrravenman' WHERE player_name = 'Dresuss';
UPDATE historical_roster_entries SET player_name = 'mrravenman' WHERE player_name = 'Dresuss';

-- [mcba] TheePrinceBot -> OutOfLoveSolo
UPDATE historical_player_stats SET player_name = 'OutOfLoveSolo' WHERE player_name = 'TheePrinceBot';
UPDATE historical_game_stats SET player_name = 'OutOfLoveSolo' WHERE player_name = 'TheePrinceBot';
UPDATE historical_roster_entries SET player_name = 'OutOfLoveSolo' WHERE player_name = 'TheePrinceBot';

-- [mcba] jake2317 -> Titansstorm1
UPDATE historical_player_stats SET player_name = 'Titansstorm1' WHERE player_name = 'jake2317';
UPDATE historical_game_stats SET player_name = 'Titansstorm1' WHERE player_name = 'jake2317';
UPDATE historical_roster_entries SET player_name = 'Titansstorm1' WHERE player_name = 'jake2317';

-- [mcba] pyvvon -> vyvyn_
UPDATE historical_player_stats SET player_name = 'vyvyn_' WHERE player_name = 'pyvvon';
UPDATE historical_game_stats SET player_name = 'vyvyn_' WHERE player_name = 'pyvvon';
UPDATE historical_roster_entries SET player_name = 'vyvyn_' WHERE player_name = 'pyvvon';

-- A rename can leave one player listed twice on a roster where both names were
-- carried. Only the earliest row for each club survives. This is a no-op for
-- the names that had no such duplicate.
DELETE FROM historical_roster_entries WHERE player_name = 'FartFreak47' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'FartFreak47' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'goat1ye' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'goat1ye' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'IHateKillza' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'IHateKillza' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'iloveman' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'iloveman' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'jerryandjerry' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'jerryandjerry' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Petro131' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Petro131' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Pug63' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Pug63' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'TheCracka1' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'TheCracka1' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'uwoy' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'uwoy' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'bigmac1936' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'bigmac1936' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Frame_76' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Frame_76' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'IBigBuffMan678' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'IBigBuffMan678' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'ImYourBizz' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'ImYourBizz' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Jesusma10s07' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Jesusma10s07' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Lucien_veil' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Lucien_veil' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'mrravenman' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'mrravenman' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'OutOfLoveSolo' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'OutOfLoveSolo' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'Titansstorm1' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'Titansstorm1' GROUP BY historical_team_id);
DELETE FROM historical_roster_entries WHERE player_name = 'vyvyn_' AND id NOT IN (SELECT MIN(id) FROM historical_roster_entries WHERE player_name = 'vyvyn_' GROUP BY historical_team_id);

-- The merged-away names keep no profile of their own; the kept name already
-- points at the account.
DELETE FROM minecraft_profiles WHERE player_name IN ('BoBichettesChild', 'SinKiraa_', 'Wafazafa', 'Sitonmenow', 'ItsJanutary', 'TickleTips10', 'WxvyMc', 'Vibepug', 'TTV_ValorTGM', 'FrecklinFreckles', 'heatedbeast135', 'thegamezer3442', 'IBigBuffMan', 'CTRL_Bizz', 'Jesusma14', 'KillerMaxZombie', 'Dresuss', 'TheePrinceBot', 'jake2317', 'pyvvon');

-- Two links that were wrong, found by the same check.
--
-- YeezysBack and deanog_ batted on opposite sides of game 3971 (Miami Boom at
-- St. Augustine Embers, Season VI), and Baseballboy1344 and Cardsfan1982 hold
-- two separate batting lines for the Spiders in game 4752. One player cannot
-- do either, so these are four people, not two. The account that answers to
-- deanog_ today did once hold the name YeezysBack, but not the YeezysBack the
-- MBL knows - a name freed up is a name a stranger can take, which is exactly
-- why a head is drawn from an account id and never from a name.
--
-- The wrong links are removed rather than repointed. Both names go back to
-- having no head, which is the honest state until the league names the right
-- account: a blank head is better than somebody else's face.
DELETE FROM minecraft_profiles WHERE player_name IN ('YeezysBack', 'Baseballboy1344');
