-- A player can leave a game without anyone replacing them. Until now the only
-- ways out of a lineup were a substitution, which needs somebody coming in,
-- and a position change, which leaves them on the field - so a player who had
-- gone home was still standing on first base as far as the card knew.
ALTER TABLE scorecard_lineups ADD COLUMN left_at_sequence INTEGER;
