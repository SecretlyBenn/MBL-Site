-- Live games 3 and 53 duplicate games the archive already holds from
-- MyStatsOnline, so scoring them again would publish a second copy of a result
-- that is already on the site:
--
--   game 3  -> archive 3458, Thunderbirds 2-0 Voodoo,  21 stat lines
--   game 53 -> archive 3459, Blizzards 2-3 Otters,     23 stat lines
--
-- Neither scorecard is APPROVED (one IN_PROGRESS, one RETURNED), so nothing
-- they hold has reached the archive and there is nothing to unwind.
--
-- Children are removed before their parents: runner_outs points at
-- plate_appearances, which points at the scorecard, which points at the game.
-- Game 2 is left alone - its scorecard is APPROVED and already published.

DELETE FROM runner_outs
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM plate_appearances
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM fielding_changes
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM scorecard_actions
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM scorecard_lines
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM scorecard_lineups
WHERE scorecard_id IN (SELECT id FROM scorecards WHERE game_id IN (3, 53));

DELETE FROM scorecards WHERE game_id IN (3, 53);

DELETE FROM games WHERE id IN (3, 53);
