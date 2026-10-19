-- Miniboi is CardsFan1982.
--
-- "Miniboi" is what the umpire wrote on the card for MCBA14-CR4; CardsFan1982
-- is the name he has played four seasons under, and his account
-- a1092e2a9ee044aabec816c419233e89 is still called CardsFan1982 on Mojang, so
-- it is the card that is the nickname. There is a real Minecraft account named
-- Miniboi, 3ed58de3a116490cbd1706fcd1c7d325, and it belongs to somebody else -
-- the same trap as `vyv` - which is why nothing here links it to anyone.
--
-- Checked before merging, as 0053 taught: the two names are in different games
-- (4836 and 4838), never the same one, so they cannot be two people. Miniboi
-- has no roster entry, no live player row and no profile; the only rows he has
-- are one box score and the season line recomputed from it.
--
-- They do share a club-season, so this is a merge and not a rename: the two
-- Spiders lines in season 46 have to be added together, not moved. The totals
-- below are what `recomputeSeason` builds from the merged box scores -
-- 1 game 1-for-1 with a walk, plus 1 game 0-for-2 - so running a recompute
-- afterwards produces exactly these numbers again.

UPDATE historical_game_stats SET player_name = 'CardsFan1982' WHERE player_name = 'Miniboi';

UPDATE historical_player_stats
SET games = 2,
    at_bats = 3,
    hits = 1,
    walks = 1,
    singles = 1,
    total_bases = 1,
    plate_appearances = 4,
    batting_average = 0.3333333333333333,
    on_base_pct = 0.5,
    slugging_pct = 0.3333333333333333,
    ops = 0.8333333333333333
WHERE season_id = 46 AND historical_team_id = 407 AND player_name = 'CardsFan1982';

DELETE FROM historical_player_stats
WHERE season_id = 46 AND historical_team_id = 407 AND player_name = 'Miniboi';
