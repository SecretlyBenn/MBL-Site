-- The two games the Panthers' sweep never reached.
--
-- Leaving them blank is not enough: build-bracket counts an unplayed fixture
-- as still to come, so the ALCS read "Panthers lead 3-0" with no way ever to
-- resolve. NOT_NEEDED is what the bracket looks for, and it is why the column
-- exists - see the comment on historical_games.status.
UPDATE historical_games
SET status = 'NOT_NEEDED'
WHERE season_id = 16 AND sort_order IN (15, 16) AND home_score IS NULL;
