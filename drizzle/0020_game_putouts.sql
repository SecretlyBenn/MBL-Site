-- Putouts per game, so a scored game can carry them into the season totals.
-- Without this the box score knows who made each out and the season line does
-- not, because season stats are rebuilt from these rows.
ALTER TABLE historical_game_stats ADD COLUMN putouts integer;
