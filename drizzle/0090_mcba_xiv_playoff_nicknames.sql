-- MCBA Season XIV's playoffs were entered under nicknames, not usernames.
--
-- Twenty-seven of the thirty-six players in that season have a playoff line
-- filed under something nobody else in the archive calls them: `Zeke` for
-- `Z3K3__`, `CJ` for `cj0s`, `GWLYT` for `GWLYT994`, and seven more that
-- differ only by a capital letter. The archive is keyed by name, so each of
-- those lines was detached from the man's own career - his playoffs missing
-- from his player page, his head a blank grey block on the statistics table,
-- and twenty-seven people in the archive who do not exist.
--
-- Nobody renamed an account. Lineups in the old MyStatsOnline site were typed
-- by hand, and whoever typed these put in what people are called rather than
-- what they are called in game. Every other season in both competitions is
-- between none and three unmatched names; this one is twenty-seven.
--
-- Each pair below was confirmed by the league's owner, and each passes the
-- test in CLAUDE.md for a name change rather than a merge: the two names never
-- appear in the same game, which is what would have proved them two people,
-- and never in the same club-season, so no club-season ends up with two lines
-- for one man and nothing has to be added together.
--
-- Scoped to season 46 on purpose. Several of these nicknames are short enough
-- to belong to somebody real elsewhere - `Dream`, `nova`, `CJ` - and the
-- sloppy entry is confined to this one postseason.

CREATE TABLE name_fix (wrong TEXT PRIMARY KEY, correct TEXT NOT NULL);

-- Capitalisation only: the same name with a capital on the front.
INSERT INTO name_fix (wrong, correct) VALUES
  ('Ayvvri', 'ayvvri'),
  ('Bigboyyahu', 'bigboyyahu'),
  ('Devin_god1994', 'devin_god1994'),
  ('DyN0Btw_', 'dyn0btw_'),
  ('Kykybubba', 'kykybubba'),
  ('MrCaptainofS', 'MrcaptainofS'),
  ('TintedHeaveSPTFY', 'Tintedheavesptfy');

-- A short name for a longer username.
INSERT INTO name_fix (wrong, correct) VALUES
  ('ASAP', 'ASAPMoney7'),
  ('Blazingrhino', 'Blazingrhino85'),
  ('CJ', 'cj0s'),
  ('Cosmiclol', 'Cosmiclolll'),
  ('Dragonball', 'dragonballz'),
  ('Dream', 'Dreamslayer3485'),
  ('GWLYT', 'GWLYT994'),
  ('Iko', 'iko_032'),
  ('Kman', 'k_man15'),
  ('portaltohead', 'PortaltatoHead'),
  ('splotchy', 'SplotchyPizza99'),
  ('Underseer', 'UnderseerZero'),
  ('Zeke', 'Z3K3__');

-- Named by the league's owner, who knows these men by sight. `nova` is the
-- one with a club change behind it: he was released by the Sentinels and
-- played the postseason for the Bandits, which is why his playoff line sits
-- under a club his regular season does not.
INSERT INTO name_fix (wrong, correct) VALUES
  ('Breadstick', 'TheGuyBreadstick'),
  ('femmy', 'V0iderz'),
  ('gunnar', 'EPGunner'),
  ('nova', 'TerminalTurbo'),
  ('pablo', 'St_Pablo_'),
  ('Pikachichi', 'pikachachi'),
  ('Pufferfish', 'Pufferf1sh222');

UPDATE historical_player_stats
SET player_name = (SELECT correct FROM name_fix WHERE wrong = historical_player_stats.player_name)
WHERE season_id = 46
  AND player_name IN (SELECT wrong FROM name_fix);

UPDATE historical_game_stats
SET player_name = (SELECT correct FROM name_fix WHERE wrong = historical_game_stats.player_name)
WHERE game_id IN (SELECT id FROM historical_games WHERE season_id = 46)
  AND player_name IN (SELECT wrong FROM name_fix);

DROP TABLE name_fix;

-- One of the nicknames had been given its own profile by hand, pointing at the
-- same account as the proper name. Renaming onto the proper name would collide
-- with that row's primary key, and two rows for one account is what the
-- rename route refuses for everybody else, so the duplicate goes.
DELETE FROM minecraft_profiles
WHERE player_name = 'TintedHeaveSPTFY'
  AND uuid = '8dc0b915ed9f4887883332b12fb52081'
  AND EXISTS (
    SELECT 1 FROM minecraft_profiles m
    WHERE m.player_name = 'Tintedheavesptfy' AND m.uuid = '8dc0b915ed9f4887883332b12fb52081'
  );

-- St_Pablo_ had no account linked at all, which is why he stayed a blank block
-- after the rename while the other twenty-six got their heads back. Resolved
-- from Mojang on a developer's machine, as CLAUDE.md prescribes - the Worker
-- itself is refused by Mojang and has to fall back to playerdb.
INSERT INTO minecraft_profiles (player_name, uuid, current_name, source)
SELECT 'St_Pablo_', 'adaedb5c809843edbe284213878e15f4', 'St_Pablo_', 'mojang'
WHERE NOT EXISTS (SELECT 1 FROM minecraft_profiles WHERE player_name = 'St_Pablo_');
