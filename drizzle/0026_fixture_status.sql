-- A best-of-three series ends as soon as one club wins two, so the third
-- fixture is published but often never played. That is not the same as a game
-- still to come, and it is not the same as a game that was played: it counts
-- for nothing and should not sit in the schedule as upcoming forever.
--
-- Null means an ordinary fixture - scheduled if it has no score, played if it
-- has one. "NOT_NEEDED" means the series was already decided.
ALTER TABLE historical_games ADD COLUMN status text;
