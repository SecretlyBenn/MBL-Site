-- Everyone who has played a game is in a pool.
--
-- The live `players` table only ever held the people somebody entered: the
-- current rosters, plus a handful released since. So the MBL's free agent
-- list had seven names in it and the MCBA's had none, while 584 men have
-- played in the MBL and 843 in the MCBA. Anyone who stopped playing simply
-- left the site - they stayed in the archive, which is keyed by name, and had
-- no row here at all. A GM looking for someone who sat out a season could not
-- find him, and the off-season tournament needs the whole pool to pick from.
--
-- The rule the league set: anyone who has played a game in the MBL is an MBL
-- free agent unless they are on a roster, and anyone who has played in the
-- MCBA and never in the MBL is an MCBA free agent. The MBL insert runs first,
-- so a man who played in both is filed under the MBL and the second statement
-- passes over him - that is the "and never in the MBL" half, and it is why
-- the order of these two matters.
--
-- Only names with a game to their name. 266 MBL season lines record a player
-- who was on a roster and never got in, and being on a roster once is not
-- having played here.
--
-- Adds the missing names only, so running it twice changes nothing the second
-- time. Matched case-insensitively against both columns: `minecraft_username`
-- is unique and case-sensitive, so a `zeke` here and a `Zeke` in the archive
-- would otherwise become two people rather than failing loudly.
--
-- What this cannot fix: the archive files one man under whatever name each
-- competition used for him, so somebody who played the MBL as `Purpeyy` and
-- the MCBA as `_purp__` gets a free agent row in each. The account behind
-- them is what ties them together and nothing here reads it. Merging those is
-- the same hand-written job it has always been.

INSERT INTO players (minecraft_username, display_name, league_id, status)
SELECT DISTINCT hp.player_name, hp.player_name, 1, 'FREE_AGENT'
FROM historical_player_stats hp
JOIN historical_seasons s ON s.id = hp.season_id
WHERE s.league_id = 1
  AND COALESCE(hp.games, 0) > 0
  AND LOWER(hp.player_name) NOT IN (SELECT LOWER(minecraft_username) FROM players)
  AND LOWER(hp.player_name) NOT IN (SELECT LOWER(display_name) FROM players);

INSERT INTO players (minecraft_username, display_name, league_id, status)
SELECT DISTINCT hp.player_name, hp.player_name, 2, 'FREE_AGENT'
FROM historical_player_stats hp
JOIN historical_seasons s ON s.id = hp.season_id
WHERE s.league_id = 2
  AND COALESCE(hp.games, 0) > 0
  AND LOWER(hp.player_name) NOT IN (SELECT LOWER(minecraft_username) FROM players)
  AND LOWER(hp.player_name) NOT IN (SELECT LOWER(display_name) FROM players);
