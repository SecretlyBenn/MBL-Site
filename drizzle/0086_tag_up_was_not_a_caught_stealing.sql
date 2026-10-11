-- World Series Game 4: a runner thrown out at the plate, filed as a steal.
--
-- Bottom of the fifth, two away. KexKK flew out to centre, Girty tagged up
-- from third and went for home, and the throw beat him - pogJ took it and made
-- the tag. Two outs on the one batted ball, which is how the play is on the
-- card (plate appearance 48, FO to CF, outs_recorded 2).
--
-- There was no way to say that. Dragging a runner to a base he did not reach
-- offers exactly one way of being retired - "Caught stealing - he never got
-- there" - so that is what it went in as, and a caught stealing is a real
-- stat. Girty's playoff line showed CS 1 for a ball he never stole on.
--
-- A tag-up is not a steal: the runner is entitled to go once the ball is
-- caught and nobody is credited with holding him. It is a tagged out, which
-- this card already has a kind for, and the putout convention for one is the
-- fielder who applied the tag rather than the catcher by rule. Those happen to
-- be the same man here - pogJ was catching and took the throw, which is also
-- what 0073 credits - so putout_player_id is already right and is left alone.
--
-- The one number that was wrong is the caught stealing, and it is wrong in
-- three places: on the live card it was derived from, in the published box
-- score, and in the season totals the publish rebuilt from it. All three are
-- corrected together so none of them disagrees with the others.

-- The live card. derive-box-score reads the caught stealing straight off this
-- kind, so changing it is what stops the number coming back if this game is
-- ever published again.
UPDATE runner_outs
SET kind = 'TAGGED'
WHERE id = 18 AND scorecard_id = 10 AND kind = 'CAUGHT_STEALING';

-- The published box score for game 4841.
UPDATE historical_game_stats
SET caught_stealing = 0
WHERE id = 52815 AND game_id = 4841 AND player_name = 'Girty' AND caught_stealing = 1;

-- And the season line, which is the sum of those box scores - so it comes down
-- by the same one rather than being rebuilt. A recompute would do it too, but
-- it would also rewrite every other row in the season to do one subtraction.
UPDATE historical_player_stats
SET caught_stealing = 0
WHERE id = 64103 AND season_id = 16 AND player_name = 'Girty' AND caught_stealing = 1;
