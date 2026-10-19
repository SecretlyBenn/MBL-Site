-- Iko is whitewonders_, Tino is Romans_8_14, and Elite080812 is Elite082012.
--
-- The three names the umpires' cards left on no roster. The league has said
-- who they are, which is the only thing that could: none of them is a rename
-- anybody could have looked up, and the one that resolves on Mojang on its own
-- is the one that proves why guessing is wrong - there is an account called
-- Tino, 7a5dff69f37b438081120942b0145d1a, and it is a stranger's. Romans_8_14
-- is e56ac38e932443c289cdb5d80a9b0ccc.
--
-- Checked before merging, as 0053 taught. No pair appears in the same game:
-- Iko played CR3 and CR5 while whitewonders_ played WC1 and CR1; Tino played
-- only CR6, which Romans_8_14 did not. So none of them is two people.
--
-- Iko and whitewonders_ share a club-season - both Batsmen in season 46 - so
-- that one is a merge and the two lines are added together. The figures below
-- are the sum of his four box scores, which is what recomputeSeason builds
-- from them, so a later recompute writes the same numbers again:
--
--   4 G, 11 AB, 1 R, 3 H, 1 2B, 1 BB, 7 K, 2 LOB
--   2 singles, 4 total bases, 12 plate appearances
--
-- The other two are plain renames. Romans_8_14 has six season lines but none
-- in season 46, and Elite082012 had no rows at all, so neither needs adding
-- up. All three names exist nowhere in the archive outside season 46, which
-- is why the box-score renames need no season scoping.
--
-- Elite082012's account is not linked here. It resolves on Mojang as
-- 64cb9b39204e487a973860769edcd70e, but a name resolving is not proof of
-- whose account it is, and nobody has confirmed that one.

UPDATE historical_game_stats SET player_name = 'whitewonders_' WHERE player_name = 'Iko';
UPDATE historical_game_stats SET player_name = 'Romans_8_14' WHERE player_name = 'Tino';
UPDATE historical_game_stats SET player_name = 'Elite082012' WHERE player_name = 'Elite080812';

UPDATE historical_player_stats
SET games = 4,
    at_bats = 11,
    runs = 1,
    hits = 3,
    doubles = 1,
    triples = 0,
    home_runs = 0,
    rbis = 0,
    walks = 1,
    strikeouts = 7,
    stolen_bases = 0,
    caught_stealing = 0,
    sac_flies = 0,
    left_on_base = 2,
    errors = 0,
    singles = 2,
    total_bases = 4,
    plate_appearances = 12,
    batting_average = 0.2727272727272727,
    on_base_pct = 0.3333333333333333,
    slugging_pct = 0.36363636363636365,
    ops = 0.696969696969697
WHERE season_id = 46 AND historical_team_id = 413 AND player_name = 'whitewonders_';

DELETE FROM historical_player_stats WHERE season_id = 46 AND player_name = 'Iko';

UPDATE historical_player_stats SET player_name = 'Romans_8_14' WHERE season_id = 46 AND player_name = 'Tino';
UPDATE historical_player_stats SET player_name = 'Elite082012' WHERE season_id = 46 AND player_name = 'Elite080812';
