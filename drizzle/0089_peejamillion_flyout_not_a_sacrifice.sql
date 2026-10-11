-- ALDS game 3: peejamillion's sacrifice fly was an ordinary fly to centre.
--
-- Game XIIPO-2, archive game 4015, Knights 0 at Panthers 3 on the 12th of
-- September. His line there reads 2 at-bats with a sacrifice fly, and a
-- sacrifice does not count as an at-bat - which is the at-bat he is missing.
--
-- It cannot have been a sacrifice fly, and the card already said so without
-- anybody noticing: a sacrifice fly is a caught fly on which a runner scores,
-- and this one carried no run batted in. The Panthers' nine runs batted in
-- come to three, the line score says three runs, and all three are accounted
-- for by other players. So nobody scored on it, and it was simply a fly out.
--
-- That is why this correction is as small as it is. The run accounting, the
-- line score, the outs and the pitcher's line are all untouched - a caught
-- fly is one out either way, and the centre fielder is credited with the
-- catch either way. Only the batter's own at-bat count and his sacrifice
-- change hands.

-- The box score.
UPDATE historical_game_stats
SET at_bats = 3, sac_flies = 0
WHERE id = 37303
  AND game_id = 4015
  AND player_name = 'peejamillion'
  AND at_bats = 2
  AND sac_flies = 1
  AND rbis = 0;

-- And the season line, which is the sum of those box scores, so it moves by
-- the same one rather than being rebuilt. A recompute would reach the same
-- numbers but would rewrite all 107 of this season's batters to do it.
UPDATE historical_player_stats
SET at_bats = at_bats + 1, sac_flies = sac_flies - 1
WHERE id = 64105
  AND season_id = 16
  AND player_name = 'peejamillion'
  AND at_bats = 26
  AND sac_flies = 2;

-- The rates that hang off at-bats, written as db/publish.ts writes them so a
-- later recompute agrees with this to the last decimal rather than quietly
-- disagreeing in the third.
--
-- On-base percentage does not move, and that is not an oversight: a sacrifice
-- fly already sits in its denominator alongside at-bats, so 26 + 2 and 27 + 1
-- are the same thirty. plate_appearances is that same total and stays put too.
-- Only the average, the slugging and the OPS change, and only because the
-- at-bats under them did.
UPDATE historical_player_stats
SET batting_average = CAST(hits AS REAL) / at_bats,
    on_base_pct = CAST(hits + walks + hit_by_pitch AS REAL)
                  / (at_bats + walks + hit_by_pitch + sac_flies),
    slugging_pct = CAST(total_bases AS REAL) / at_bats,
    ops = CAST(hits + walks + hit_by_pitch AS REAL)
            / max(1, at_bats + walks + hit_by_pitch + sac_flies)
          + CAST(total_bases AS REAL) / at_bats
WHERE id = 64105 AND at_bats = 27 AND sac_flies = 1;
