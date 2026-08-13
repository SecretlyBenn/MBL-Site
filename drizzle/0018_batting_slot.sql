-- The order slot a plate appearance belongs to, fixed at the moment it is
-- recorded.
--
-- It used to be looked up from the lineup by the batter's id, which only holds
-- while the lineup never changes. Substituting a player would take the slot
-- with them and every at-bat the player they replaced had already taken would
-- fall out of the scorecard. Storing it with the play keeps the history where
-- it happened.
ALTER TABLE plate_appearances ADD COLUMN batting_slot integer;

-- Existing plays predate substitutions, so the lineup still describes them.
UPDATE plate_appearances
SET batting_slot = (
  SELECT l.batting_order
  FROM scorecard_lineups l
  WHERE l.scorecard_id = plate_appearances.scorecard_id
    AND l.player_id = plate_appearances.batter_player_id
)
WHERE batting_slot IS NULL;
