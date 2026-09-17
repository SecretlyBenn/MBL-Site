-- Where each lineup row started, kept apart from where it ended up.
--
-- A position change and a substitution both overwrite the lineup row, and the
-- box score read that row as the starting alignment. So the Knights' pitcher
-- and catcher, who swapped for the last two outs of Panthers @ Knights on
-- September 11, were each credited with the other's position for the whole
-- game, and La_Danse_Macabre was given all eighteen outs at first base while
-- wobbertooth, whom he replaced in the fifth, was given none.

ALTER TABLE scorecard_lineups ADD COLUMN starting_player_id INTEGER REFERENCES players(id);
ALTER TABLE scorecard_lineups ADD COLUMN starting_position TEXT;

-- For every card scored so far, the best record of the start is the row as it
-- stands. That is right wherever nothing moved.
UPDATE scorecard_lineups
SET starting_player_id = player_id, starting_position = position
WHERE starting_position IS NULL;

-- Scorecard 6, Panthers @ Knights (XIIPO-1). alexc18 started on the mound and
-- DaGoooKing behind the plate; they swapped after play 51, which the card
-- already records as a move.
UPDATE scorecard_lineups SET starting_position = 'P' WHERE scorecard_id = 6 AND id = 126 AND player_id = 44;
UPDATE scorecard_lineups SET starting_position = 'C' WHERE scorecard_id = 6 AND id = 125 AND player_id = 34;

-- wobbertooth started at first and batted first; La_Danse_Macabre took his
-- place after play 45 and homered on play 46. The substitution left no move
-- behind, so it is written in here.
UPDATE scorecard_lineups SET starting_player_id = 49 WHERE scorecard_id = 6 AND id = 119 AND player_id = 38;
INSERT INTO fielding_changes (scorecard_id, is_home, inning, applied_at_sequence, player_id, position)
SELECT 6, 1, 5, 45, 49, 'BENCH'
WHERE NOT EXISTS (SELECT 1 FROM fielding_changes WHERE scorecard_id = 6 AND player_id = 49);
INSERT INTO fielding_changes (scorecard_id, is_home, inning, applied_at_sequence, player_id, position)
SELECT 6, 1, 5, 45, 38, '1B'
WHERE NOT EXISTS (SELECT 1 FROM fielding_changes WHERE scorecard_id = 6 AND player_id = 38);
