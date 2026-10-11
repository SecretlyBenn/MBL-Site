-- World Series Game 4: two "position changes" that were really a lineup fix.
--
-- The Otters' card (scorecard 10, game 71) went in with Weers at P and nobody
-- at first base, because the lineup editor asks for the starting pitcher
-- separately from the position dropdowns and never checked that two players
-- had not been given the same place. Uchime was named the starter and Weers
-- was left standing on the mound as well.
--
-- The umpire noticed before the first pitch, but by then both lineups were
-- saved and the lineup editors were gone - the scoring page showed them only
-- until each side had a lineup at all. The only way to move anybody was the
-- defence panel, so the correction was recorded as two position changes in the
-- first inning: Weers to 2B and Donkeymario65 to 1B.
--
-- Nothing was ever played with the old alignment. Both changes carry
-- applied_at_sequence 0 and the first play of the game is sequence 1, so the
-- box score already credits Weers' whole game to second base and
-- Donkeymario65's to first - a move takes effect from the play after the one it
-- is recorded against, and there was no play before it. This migration is not
-- fixing a wrong box score. It is making the record say what happened: the
-- starting alignment was 2B and 1B, and the game had no position changes.
--
-- Done in this order on purpose. Correcting starting_position first means the
-- right alignment is in force from the moment it lands - with the moves still
-- present they simply agree - and deleting the moves afterwards leaves it
-- standing. The reverse order would leave an instant with two pitchers and
-- nobody at first, and this game is being scored as this runs.

-- Where they actually started. `position` already says 2B and 1B; it is
-- starting_position, which is written once and never changed, that still held
-- the card as first saved.
UPDATE scorecard_lineups
SET starting_position = '2B'
WHERE scorecard_id = 10 AND player_id = 92 AND starting_position = 'P';

UPDATE scorecard_lineups
SET starting_position = '1B'
WHERE scorecard_id = 10 AND player_id = 80 AND starting_position = '2B';

-- The two moves themselves. Scoped by sequence as well as by id, so a real
-- rearrangement later in this game could never be caught by it.
DELETE FROM fielding_changes
WHERE scorecard_id = 10 AND applied_at_sequence = 0 AND id IN (28, 29);

-- The undo entry that created them. Undo walks backwards one action at a time
-- and this one is still live underneath seven at-bats; left alone, an umpire
-- undoing far enough would restore the card as it was first saved and quietly
-- put Weers back on the mound. Marking it undone keeps the trail and takes it
-- out of reach, which is what the column is for.
UPDATE scorecard_actions
SET undone_at = CURRENT_TIMESTAMP
WHERE id = 103 AND scorecard_id = 10 AND kind = 'POSITION_CHANGE' AND undone_at IS NULL;
